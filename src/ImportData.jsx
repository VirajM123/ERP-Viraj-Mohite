import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RefreshCw, Save, Upload, X } from "lucide-react";
import { API_URL } from "./api/config";
const sessionHeaders = (json = false) => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});
const desktopTransactionImports = {
  DesktopOpeningStock: { label: "Desktop Opening Stock", endpoint: "/stock/adjust", required: ["adjustmentType", "prodCode", "quantity"] },
  DesktopPurchase: { label: "Desktop Purchase", endpoint: "/purchase", nested: "items", identity: ["vouSer", "vouNo"], required: ["vouNo", "supplierCode", "items"] },
  DesktopSales: { label: "Desktop Sales", endpoint: "/sales", nested: "items", identity: ["BillSeries", "BillNo"], required: ["BillSeries", "BillNo", "PartyCode", "items"] },
  DesktopCreditNote: { label: "Desktop Credit Note", endpoint: "/credit-note", nested: "items", identity: ["CreditNoteSeries", "CreditNoteNo"], required: ["CreditNoteSeries", "CreditNoteNo", "PartyCode", "items"] },
  DesktopDebitNote: { label: "Desktop Debit Note", endpoint: "/debit-note", nested: "items", identity: ["DebitNoteSeries", "DebitNoteNo"], required: ["DebitNoteSeries", "DebitNoteNo", "SupplierCode", "items"] },
  DesktopStockIn: { label: "Desktop Stock In", endpoint: "/stock/adjust", required: ["adjustmentType", "prodCode", "quantity"] },
  DesktopStockOut: { label: "Desktop Stock Out", endpoint: "/stock/adjust", required: ["adjustmentType", "prodCode", "quantity"] },
  DesktopReceipt: { label: "Desktop Receipt", endpoint: "/transaction/receipt", nested: "receiptBills", identity: ["billSeries", "rno"], required: ["billSeries", "rno", "partyId", "receiptBills"] },
  DesktopContra: { label: "Desktop Contra", endpoint: "/transaction/contra", required: ["transactionDate", "tranVNo"] },
  DesktopPDC: { label: "Desktop PDC", endpoint: "/transaction/pdc-docket", nested: "cheques", identity: ["docSeries", "docVNo"], required: ["docSeries", "docVNo"] },
  DesktopJournalVoucher: { label: "Desktop Journal Voucher", endpoint: "/p0/journal-voucher", nested: "lines", identity: ["vDate", "vNo"], required: ["vDate", "vNo", "lines"] },
  DesktopCollectionVoucher: { label: "Desktop Collection Voucher", endpoint: "/transaction/collection-voucher", nested: "bills", identity: ["collectionDate", "colVNo"], required: ["collectionDate", "colVNo", "bills"] },
};
const transactionColumns = ["Entry Type", "Document Date", "Series", "Number", "Party", "Amount", "ERP Payload JSON", "Distributor ID", "Firm ID"];
const parseObjectCell = (value) => { if (typeof value !== "string" || !/^[{[]/.test(value.trim())) return value; try { return JSON.parse(value); } catch { return value; } };
const transactionPayload = (row) => {
  if (row.__erpTransactionPayload) return row.__erpTransactionPayload;
  return JSON.parse(Object.keys(row).filter((key) => /^ERP Payload JSON(?: \d+)?$/.test(key)).sort((left, right) => Number(left.match(/\d+$/)?.[0] || 1) - Number(right.match(/\d+$/)?.[0] || 1)).map((key) => String(row[key] || "")).join(""));
};
const hydrateTransactionRows = (workbook, rows, transactionImport) => {
  if (Object.keys(rows[0] || {}).some((key) => /^ERP Payload JSON(?: \d+)?$/.test(key))) return rows;
  const nestedSheetName = transactionImport.nested && workbook.SheetNames.find((name) => name.toLowerCase() === transactionImport.nested.toLowerCase());
  const nestedRows = nestedSheetName ? XLSX.utils.sheet_to_json(workbook.Sheets[nestedSheetName], { defval: "" }) : [];
  return rows.map((row) => {
    const payload = Object.fromEntries(Object.entries(row).map(([name, value]) => [name, parseObjectCell(value)]));
    if (transactionImport.nested) {
      payload[transactionImport.nested] = nestedRows.filter((item) => transactionImport.identity.every((field) => String(item[field] ?? "") === String(row[field] ?? ""))).map((item) => Object.fromEntries(Object.entries(item).filter(([name]) => !transactionImport.identity.includes(name)).map(([name, value]) => [name, parseObjectCell(value)])));
    }
    Object.defineProperty(row, "__erpTransactionPayload", { value: payload, enumerable: false });
    return row;
  });
};
const transactionImportKey = (entryType, payload, index) => `desktop-${entryType}-${String(payload.BillSeries || payload.vouSer || payload.CreditNoteSeries || payload.DebitNoteSeries || payload.billSeries || payload.docSeries || "no-series")}-${String(payload.BillNo || payload.vouNo || payload.CreditNoteNo || payload.DebitNoteNo || payload.rno || payload.docVNo || payload.vNo || payload.tranVNo || payload.colVNo || index + 1)}-${String(payload.BillDate || payload.invoiceDate || payload.VDate || payload.receiptDate || payload.vDate || payload.transactionDate || payload.collectionDate || "no-date")}`.replace(/[^a-zA-Z0-9_.:-]/g, "-").slice(0, 200);
const IMPORT_CONCURRENCY = 8;
const importConflictKeys = (entryType, payload = {}) => {
  const definition = desktopTransactionImports[entryType];
  const nested = definition?.nested && Array.isArray(payload[definition.nested]) ? payload[definition.nested] : [];
  const clean = (value) => String(value ?? "").trim().toLowerCase();
  const keys = new Set();
  if (["DesktopPurchase", "DesktopSales", "DesktopCreditNote", "DesktopDebitNote"].includes(entryType)) {
    const godown = clean(payload.GDCode || payload.gdCode);
    nested.forEach((item) => {
      const product = clean(item.productCode || item.prodCode || item.ProductCode || item.code || item.productId);
      if (product) keys.add(`stock|${godown}|${product}`);
    });
  }
  if (entryType === "DesktopReceipt") nested.forEach((bill) => {
    if (bill.openingTransactionId) keys.add(`opening|${clean(bill.openingTransactionId)}`);
    else keys.add(`sale|${clean(bill.trnSeries || bill.billSeries)}|${clean(bill.trnNo || bill.billNo)}`);
  });
  return keys;
};
const conflictFreeWaves = (records, entryType) => {
  const pending = [...records]; const waves = [];
  while (pending.length) {
    const used = new Set(); const wave = [];
    for (let index = 0; index < pending.length && wave.length < IMPORT_CONCURRENCY;) {
      const keys = importConflictKeys(entryType, pending[index].payload);
      if ([...keys].some((key) => used.has(key))) { index += 1; continue; }
      keys.forEach((key) => used.add(key)); wave.push(pending.splice(index, 1)[0]);
    }
    waves.push(wave.length ? wave : [pending.shift()]);
  }
  return waves;
};

export default function ImportData({ onClose }) {
  const [company, setCompany] = useState(""); const [godown, setGodown] = useState("");
  const [companies, setCompanies] = useState([]); const [godowns, setGodowns] = useState([]);
  const [types, setTypes] = useState([]); const [config, setConfig] = useState({}); const [entryType, setEntryType] = useState("");
  const [file, setFile] = useState(null); const [rows, setRows] = useState([]); const [headers, setHeaders] = useState([]);
  const [validation, setValidation] = useState(null); const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false); const [notice, setNotice] = useState("");
  const inputRef = useRef(null); const importIdempotencyKey = useRef(crypto.randomUUID()); const activeConfig = config[entryType]; const transactionImport = desktopTransactionImports[entryType];
  const firmQuery = new URLSearchParams({ distributorId: localStorage.getItem("distributorId") || "", firmId: localStorage.getItem("firmId") || "" });

  useEffect(() => { (async () => {
    try {
      const companyRes = await fetch(`${API_URL}/companies?${firmQuery}`, { headers: sessionHeaders() });
      const companyData = await companyRes.json();
      if (!companyRes.ok) throw new Error(companyData.message || "Unable to load companies");
      setCompanies(companyData.companies || []);
    } catch (error) { setNotice(error.message); }

    try {
      const typeRes = await fetch(`${API_URL}/import/types`, { headers: sessionHeaders() });
      const typeData = await typeRes.json();
      if (!typeRes.ok) throw new Error(typeData.message || "Unable to load import types");
      const transactionTypes = Object.entries(desktopTransactionImports).map(([value, item]) => ({ value, label: item.label }));
      const transactionConfig = Object.fromEntries(Object.entries(desktopTransactionImports).map(([value, item]) => [value, { ...item, transaction: true, sampleFileName: `${value}_Sample.xlsx`, columns: transactionColumns.map((excel) => ({ excel, required: true, type: excel === "Number" || excel === "Amount" ? "number" : "string" })) }]));
      setTypes([...(typeData.importTypes || []), ...transactionTypes]); setConfig({ ...(typeData.config || {}), ...transactionConfig });
    } catch (error) { setNotice((previous) => previous || error.message); }
  })(); }, []);

  useEffect(() => { setGodown(""); if (!company) { setGodowns([]); return; }
    (async () => { try { const response = await fetch(`${API_URL}/godowns?${firmQuery}`, { headers: sessionHeaders() }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setGodowns(data.godowns || []); } catch (error) { setNotice(error.message); } })();
  }, [company]);

  const resetWorkbook = () => { setFile(null); setRows([]); setHeaders([]); setValidation(null); if (inputRef.current) inputRef.current.value = ""; };
  const selectType = (value) => { setEntryType(value); resetWorkbook(); setNotice(""); };
  const downloadSample = () => {
    if (!activeConfig) return setNotice("Please select an Entry Type first.");
    if (transactionImport) return setNotice("Desktop transaction workbooks must be generated from Import Data From Desktop so they contain the mapped ERP payload.");
    const columns = activeConfig.columns; const selectedCompany = companies.find((item) => item.companyCode === company);
    const example = Object.fromEntries(columns.map((column) => [column.excel, column.excel === "Distributor ID" ? localStorage.getItem("distributorId") || "DIST-1001" : column.excel === "Firm ID" ? localStorage.getItem("firmId") || "FIRM-2001" : column.excel === "Company Code" ? company || "CMP01" : column.excel === "Company Name" ? selectedCompany?.companyName || "Sample Company" : column.type === "number" ? 0 : column.excel.includes("Code") ? "EX001" : column.required ? "Example value" : ""]));
    const dataSheet = XLSX.utils.json_to_sheet([example], { header: columns.map((column) => column.excel) });
    const instructionSheet = XLSX.utils.json_to_sheet(columns.map((column) => ({ Field: column.excel, Required: column.required ? "YES" : "NO", Format: column.type === "number" ? "Number (zero or positive)" : "Text", Notes: column.excel === "GSTIN" ? "15-character GSTIN, if supplied" : "Leave optional fields blank when not applicable" })));
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, dataSheet, "Data"); XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions"); XLSX.writeFile(workbook, activeConfig.sampleFileName);
  };
  const loadExcel = async () => {
    if (!file || !entryType || (!transactionImport && entryType !== "Company" && !company)) return setNotice(!entryType ? "Please select an Entry Type first." : !company && !transactionImport && entryType !== "Company" ? "Please select a Company first." : "Please select an Excel file first.");
    importIdempotencyKey.current = crypto.randomUUID(); setLoading(true); setNotice("");
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      let data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (!data.length) throw new Error("No data rows were found in the first worksheet.");
      if (transactionImport) data = hydrateTransactionRows(workbook, data, transactionImport);
      setRows(data); setHeaders(Object.keys(data[0]));
      if (transactionImport) {
        const distributorId = localStorage.getItem("distributorId") || ""; const firmId = localStorage.getItem("firmId") || "";
        const expectedEntryType = transactionImport.label.replace(/^Desktop\s+/i, "");
        const states = data.map((row, index) => {
          const errors = [];
          let payload;
          try { payload = transactionPayload(row); if (!payload || typeof payload !== "object") errors.push("ERP transaction data is invalid"); } catch { errors.push("ERP transaction data is invalid"); }
          if (row["Entry Type"] && String(row["Entry Type"]).trim().toLowerCase() !== expectedEntryType.toLowerCase()) errors.push(`This workbook is for ${row["Entry Type"]}, not ${expectedEntryType}`);
          if (payload) {
            const missing = transactionImport.required.filter((field) => Array.isArray(payload[field]) ? !payload[field].length : payload[field] === "" || payload[field] === null || payload[field] === undefined);
            if (missing.length) errors.push(`Missing ERP field(s): ${missing.join(", ")}`);
            if (String(payload.distributorId || row["Distributor ID"] || "") !== distributorId) errors.push("Distributor ID does not match this login");
            if (String(payload.firmId || row["Firm ID"] || "") !== firmId) errors.push("Firm ID does not match this firm");
          }
          return { row: index + 2, status: errors.length ? "Error" : "Valid", message: errors.join("; ") };
        });
        setValidation({ success: true, total: data.length, valid: states.filter((row) => row.status === "Valid").length, invalid: states.filter((row) => row.status === "Error").length, rows: states });
        setNotice("For correct stock and outstanding balances, import in this order: masters, opening stock, purchase/stock-in, sales, credit/debit notes, then receipts and other vouchers.");
        return;
      }
      const response = await fetch(`${API_URL}/import/validate`, { method: "POST", headers: sessionHeaders(true), body: JSON.stringify({ entryType, company, godown, data }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || "Validation failed"); setValidation(result);
    } catch (error) { setRows([]); setHeaders([]); setValidation(null); setNotice(error.message); } finally { setLoading(false); }
  };
  const save = async () => {
    if (!validation || validation.invalid || !validation.valid) return; setSaving(true); setNotice("");
    try {
      if (transactionImport) {
        const states = [...validation.rows]; let imported = 0;
        const prepared = rows.map((row, index) => ({ index, payload: transactionPayload(row) }));
        const waves = conflictFreeWaves(prepared, entryType);
        let firstFailure = null;
        for (const wave of waves) {
          await Promise.all(wave.map(async ({ index, payload }) => {
          payload.distributorId = localStorage.getItem("distributorId") || ""; payload.firmId = localStorage.getItem("firmId") || ""; payload.firmName = localStorage.getItem("firmName") || ""; payload._desktopImport = true;
          const headers = sessionHeaders(true); headers["Idempotency-Key"] = transactionImportKey(entryType, payload, index);
          const response = await fetch(`${API_URL}${transactionImport.endpoint}`, { method: "POST", headers, body: JSON.stringify(payload) });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) { states[index] = { row: index + 2, status: "Error", message: result.message || "Transaction import failed" }; firstFailure ||= { index, message: states[index].message }; return; }
          imported += 1; states[index] = { row: index + 2, status: "Imported", message: "Saved through existing business logic" };
          }));
          setValidation({ ...validation, valid: imported, invalid: firstFailure ? 1 : 0, rows: [...states] });
          if (firstFailure) throw new Error(`Imported ${imported} of ${rows.length}. Row ${firstFailure.index + 2} failed: ${firstFailure.message}`);
        }
        setNotice(`${imported} ${transactionImport.label} record(s) imported through the existing voucher business logic.`); return;
      }
      const headers = sessionHeaders(true); headers["Idempotency-Key"] = importIdempotencyKey.current;
      const response = await fetch(`${API_URL}/import/save`, { method: "POST", headers, body: JSON.stringify({ entryType, company, godown, data: rows }) });
      const result = await response.json(); if (!response.ok) { setValidation(result); throw new Error(result.message || "Import failed"); } setValidation(result); setNotice(result.message);
    } catch (error) { setNotice(error.message); } finally { setSaving(false); }
  };
  const rowState = (index) => validation?.rows?.find((item) => item.row === index + 2);

  return <div className="import-data-page">
    <div className="import-data-header"><div className="import-data-title"><div className="import-data-title-icon"><FileSpreadsheet size={24}/></div><div><h1>Import Data</h1><p>Import supported master and desktop transaction data from Excel files</p></div></div><button className="import-data-close-btn" onClick={onClose}><X size={20}/></button></div>
    <div className="import-data-filter-section"><div className="import-data-filter-grid">
      <div className="import-data-filter-field"><label>Company {!transactionImport && entryType !== "Company" && <span>*</span>}</label><select value={company} onChange={(e) => setCompany(e.target.value)}><option value="">Select Company</option>{companies.map((item) => <option key={item._id} value={item.companyCode}>{item.companyName}</option>)}</select></div>
      <div className="import-data-filter-field"><label>Godown</label><select value={godown} disabled={!company} onChange={(e) => setGodown(e.target.value)}><option value="">Select Godown</option>{godowns.map((item) => <option key={item._id} value={item.godownCode}>{item.godownName}</option>)}</select></div>
      <div className="import-data-filter-field"><label>Entry <span>*</span></label><select value={entryType} onChange={(e) => selectType(e.target.value)}><option value="">Select Entry Type</option>{types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
    </div></div>
    <div className="import-data-file-section"><div className="import-data-file-upload"><div className="import-data-file-input-wrapper"><input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={(e) => { setFile(e.target.files?.[0] || null); setRows([]); setValidation(null); }} style={{ display: "none" }}/><button className="import-data-browse-btn" onClick={() => inputRef.current?.click()}><Upload size={16}/>Browse</button><span className="import-data-file-name">{file?.name || "No file selected"}</span><span className="import-data-file-hint">.xlsx, .xls</span></div><div className="import-data-file-actions"><button className="import-data-load-btn" onClick={loadExcel} disabled={!file || loading}>{loading ? <><RefreshCw size={16} className="import-data-spin"/>Loading...</> : <><FileSpreadsheet size={16}/>Load Excel</>}</button><button className="import-data-export-errors-btn" onClick={downloadSample}><Download size={16}/>Download Sample Excel</button><button className="import-data-clear-btn" onClick={resetWorkbook}><X size={16}/>Clear</button></div></div></div>
    {notice && <div className="import-data-result-summary"><span>{notice}</span></div>}
    {rows.length ? <div className="import-data-grid-section"><div className="import-data-grid-toolbar"><div className="import-data-grid-info"><strong>{rows.length}</strong> rows {validation && <span> — Valid: {validation.valid || 0}, Invalid: {validation.invalid || 0}</span>}</div></div><div className="import-data-grid-container"><div className="import-data-grid-scroll"><table className="import-data-table"><thead><tr><th>#</th><th>Status</th>{headers.map((header) => <th key={header}>{header}</th>)}<th>Message</th></tr></thead><tbody>{rows.map((row, index) => { const state = rowState(index); return <tr key={index} className={state?.status === "Error" ? "import-data-has-error" : ""}><td>{index + 1}</td><td>{state?.status === "Error" ? <AlertTriangle size={14}/> : <CheckCircle2 size={14} className="import-data-valid-icon"/>}</td>{headers.map((header) => <td key={header}>{header.startsWith("ERP Payload JSON") ? "ERP transaction payload" : String(row[header] ?? "")}</td>)}<td>{state?.message || "-"}</td></tr>; })}</tbody></table></div></div><div className="import-data-bottom-actions"><button className="import-data-save-btn" onClick={save} disabled={saving || !validation?.valid || validation?.invalid > 0 || (!transactionImport && entryType !== "Company" && !company)}>{saving ? <><RefreshCw size={16} className="import-data-spin"/>Saving...</> : <><Save size={16}/>Save Data</>}</button><button className="import-data-cancel-btn" onClick={onClose}><X size={16}/>Cancel</button></div></div> : <div className="import-data-empty-state"><FileSpreadsheet size={48} className="import-data-empty-icon"/><h3>No Data Loaded</h3><p>Select an Excel file and click “Load Excel” to preview data</p><p className="import-data-empty-hint">Supported formats: .xlsx, .xls</p></div>}
  </div>;
}
