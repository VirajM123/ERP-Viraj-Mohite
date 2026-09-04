import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RefreshCw, Save, Upload, X } from "lucide-react";
import { API_URL } from "./api/config";
const sessionHeaders = (json = false) => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

export default function ImportData({ onClose }) {
  const [company, setCompany] = useState(""); const [godown, setGodown] = useState("");
  const [companies, setCompanies] = useState([]); const [godowns, setGodowns] = useState([]);
  const [types, setTypes] = useState([]); const [config, setConfig] = useState({}); const [entryType, setEntryType] = useState("");
  const [file, setFile] = useState(null); const [rows, setRows] = useState([]); const [headers, setHeaders] = useState([]);
  const [validation, setValidation] = useState(null); const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false); const [notice, setNotice] = useState("");
  const inputRef = useRef(null); const importIdempotencyKey = useRef(crypto.randomUUID()); const activeConfig = config[entryType];
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
      setTypes(typeData.importTypes || []); setConfig(typeData.config || {});
    } catch (error) { setNotice((previous) => previous || error.message); }
  })(); }, []);

  useEffect(() => { setGodown(""); if (!company) { setGodowns([]); return; }
    (async () => { try { const response = await fetch(`${API_URL}/godowns?${firmQuery}`, { headers: sessionHeaders() }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setGodowns(data.godowns || []); } catch (error) { setNotice(error.message); } })();
  }, [company]);

  const resetWorkbook = () => { setFile(null); setRows([]); setHeaders([]); setValidation(null); if (inputRef.current) inputRef.current.value = ""; };
  const selectType = (value) => { setEntryType(value); resetWorkbook(); setNotice(""); };
  const downloadSample = () => {
    if (!activeConfig) return setNotice("Please select an Entry Type first.");
    const columns = activeConfig.columns; const selectedCompany = companies.find((item) => item.companyCode === company);
    const example = Object.fromEntries(columns.map((column) => [column.excel, column.excel === "Distributor ID" ? localStorage.getItem("distributorId") || "DIST-1001" : column.excel === "Firm ID" ? localStorage.getItem("firmId") || "FIRM-2001" : column.excel === "Company Code" ? company || "CMP01" : column.excel === "Company Name" ? selectedCompany?.companyName || "Sample Company" : column.type === "number" ? 0 : column.excel.includes("Code") ? "EX001" : column.required ? "Example value" : ""]));
    const dataSheet = XLSX.utils.json_to_sheet([example], { header: columns.map((column) => column.excel) });
    const instructionSheet = XLSX.utils.json_to_sheet(columns.map((column) => ({ Field: column.excel, Required: column.required ? "YES" : "NO", Format: column.type === "number" ? "Number (zero or positive)" : "Text", Notes: column.excel === "GSTIN" ? "15-character GSTIN, if supplied" : "Leave optional fields blank when not applicable" })));
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, dataSheet, "Data"); XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions"); XLSX.writeFile(workbook, activeConfig.sampleFileName);
  };
  const loadExcel = async () => { if (!file || !entryType || (entryType !== "Company" && !company)) return setNotice(!entryType ? "Please select an Entry Type first." : !company && entryType !== "Company" ? "Please select a Company first." : "Please select an Excel file first."); importIdempotencyKey.current = crypto.randomUUID(); setLoading(true); setNotice("");
    try { const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const data = XLSX.utils.sheet_to_json(sheet, { defval: "" }); if (!data.length) throw new Error("No data rows were found in the first worksheet."); setRows(data); setHeaders(Object.keys(data[0])); const response = await fetch(`${API_URL}/import/validate`, { method: "POST", headers: sessionHeaders(true), body: JSON.stringify({ entryType, company, godown, data }) }); const result = await response.json(); if (!response.ok) throw new Error(result.message || "Validation failed"); setValidation(result); } catch (error) { setRows([]); setHeaders([]); setValidation(null); setNotice(error.message); } finally { setLoading(false); } };
  const save = async () => { if (!validation || validation.invalid || !validation.valid) return; setSaving(true); setNotice(""); try { const headers = sessionHeaders(true); headers["Idempotency-Key"] = importIdempotencyKey.current; const response = await fetch(`${API_URL}/import/save`, { method: "POST", headers, body: JSON.stringify({ entryType, company, godown, data: rows }) }); const result = await response.json(); if (!response.ok) { setValidation(result); throw new Error(result.message || "Import failed"); } setValidation(result); setNotice(result.message); } catch (error) { setNotice(error.message); } finally { setSaving(false); } };
  const rowState = (index) => validation?.rows?.find((item) => item.row === index + 2);

  return <div className="import-data-page">
    <div className="import-data-header"><div className="import-data-title"><div className="import-data-title-icon"><FileSpreadsheet size={24}/></div><div><h1>Import Data</h1><p>Import supported master data from Excel files</p></div></div><button className="import-data-close-btn" onClick={onClose}><X size={20}/></button></div>
    <div className="import-data-filter-section"><div className="import-data-filter-grid">
      <div className="import-data-filter-field"><label>Company {entryType !== "Company" && <span>*</span>}</label><select value={company} onChange={(e) => setCompany(e.target.value)}><option value="">Select Company</option>{companies.map((item) => <option key={item._id} value={item.companyCode}>{item.companyName}</option>)}</select></div>
      <div className="import-data-filter-field"><label>Godown</label><select value={godown} disabled={!company} onChange={(e) => setGodown(e.target.value)}><option value="">Select Godown</option>{godowns.map((item) => <option key={item._id} value={item.godownCode}>{item.godownName}</option>)}</select></div>
      <div className="import-data-filter-field"><label>Entry <span>*</span></label><select value={entryType} onChange={(e) => selectType(e.target.value)}><option value="">Select Entry Type</option>{types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
    </div></div>
    <div className="import-data-file-section"><div className="import-data-file-upload"><div className="import-data-file-input-wrapper"><input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={(e) => { setFile(e.target.files?.[0] || null); setRows([]); setValidation(null); }} style={{ display: "none" }}/><button className="import-data-browse-btn" onClick={() => inputRef.current?.click()}><Upload size={16}/>Browse</button><span className="import-data-file-name">{file?.name || "No file selected"}</span><span className="import-data-file-hint">.xlsx, .xls</span></div><div className="import-data-file-actions"><button className="import-data-load-btn" onClick={loadExcel} disabled={!file || loading}>{loading ? <><RefreshCw size={16} className="import-data-spin"/>Loading...</> : <><FileSpreadsheet size={16}/>Load Excel</>}</button><button className="import-data-export-errors-btn" onClick={downloadSample}><Download size={16}/>Download Sample Excel</button><button className="import-data-clear-btn" onClick={resetWorkbook}><X size={16}/>Clear</button></div></div></div>
    {notice && <div className="import-data-result-summary"><span>{notice}</span></div>}
    {rows.length ? <div className="import-data-grid-section"><div className="import-data-grid-toolbar"><div className="import-data-grid-info"><strong>{rows.length}</strong> rows {validation && <span> — Valid: {validation.valid || 0}, Invalid: {validation.invalid || 0}</span>}</div></div><div className="import-data-grid-container"><div className="import-data-grid-scroll"><table className="import-data-table"><thead><tr><th>#</th><th>Status</th>{headers.map((header) => <th key={header}>{header}</th>)}<th>Message</th></tr></thead><tbody>{rows.map((row, index) => { const state = rowState(index); return <tr key={index} className={state?.status === "Error" ? "import-data-has-error" : ""}><td>{index + 1}</td><td>{state?.status === "Error" ? <AlertTriangle size={14}/> : <CheckCircle2 size={14} className="import-data-valid-icon"/>}</td>{headers.map((header) => <td key={header}>{String(row[header] ?? "")}</td>)}<td>{state?.message || "-"}</td></tr>; })}</tbody></table></div></div><div className="import-data-bottom-actions"><button className="import-data-save-btn" onClick={save} disabled={saving || !validation?.valid || validation?.invalid > 0 || (entryType !== "Company" && !company)}>{saving ? <><RefreshCw size={16} className="import-data-spin"/>Saving...</> : <><Save size={16}/>Save Data</>}</button><button className="import-data-cancel-btn" onClick={onClose}><X size={16}/>Cancel</button></div></div> : <div className="import-data-empty-state"><FileSpreadsheet size={48} className="import-data-empty-icon"/><h3>No Data Loaded</h3><p>Select an Excel file and click “Load Excel” to preview data</p><p className="import-data-empty-hint">Supported formats: .xlsx, .xls</p></div>}
  </div>;
}
