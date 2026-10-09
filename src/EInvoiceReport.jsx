import React, { useState } from "react";
import { Check, ChevronRight, Download, Eye, FileJson, FileText, Filter, HelpCircle, List, RotateCcw, Search, Settings, Upload, X } from "lucide-react";
import { API_URL } from "./api/config";
import { secureFetch } from "./SecuritySetup";
import { businessDateIST } from "./utils/businessDate";
import "./EInvoiceReport.css";

const number = (value) => Number(value || 0);
const money = (value) => Math.round((number(value) + Number.EPSILON) * 100) / 100;
const dateKey = (value) => {
  const raw = String(value || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
};
const displayDate = (value) => {
  const key = dateKey(value);
  return key ? `${key.slice(8)}/${key.slice(5, 7)}/${key.slice(0, 4)}` : "";
};
const gstin = (value) => String(value || "").trim().toUpperCase();
const pin = (value) => Number(String(value || "").trim());
const missing = (value) => !String(value ?? "").trim();

export function buildEInvoiceJson(bill, firm, party) {
  if (!firm) throw new Error("Firm master details were not found for this invoice.");
  if (!party) throw new Error(`${bill.BillSeries || ""}${bill.BillNo ?? ""}: Customer master details were not found.`);
  const sellerGstin = gstin(firm?.gstNo);
  const buyerGstin = gstin(party?.gstNo);
  const date = displayDate(bill.BillDate);
  const no = `${bill.BillSeries || ""}${bill.BillNo ?? ""}`;
  const items = Array.isArray(bill.items) ? bill.items : [];
  const required = [
    [sellerGstin, "seller GSTIN"], [firm?.firmName, "seller name"], [firm?.address1, "seller address"],
    [firm?.city, "seller city"], [firm?.pinCode, "seller PIN"],
    [buyerGstin, "buyer GSTIN"], [party?.accountName, "buyer name"], [party?.address, "buyer address"],
    [party?.town, "buyer city"], [party?.pinCode, "buyer PIN"], [date, "bill date"], [no, "bill number"],
  ];
  const absent = required.filter(([value]) => missing(value)).map(([, label]) => label);
  if (!/^\d{2}[A-Z0-9]{13}$/.test(sellerGstin)) absent.push("valid seller GSTIN");
  if (!/^\d{2}[A-Z0-9]{13}$/.test(buyerGstin)) absent.push("valid buyer GSTIN");
  if (!/^\d{6}$/.test(String(firm?.pinCode || ""))) absent.push("valid seller PIN");
  if (!/^\d{6}$/.test(String(party?.pinCode || ""))) absent.push("valid buyer PIN");
  if (!items.length) absent.push("invoice items");
  items.forEach((item, index) => {
    const product = bill.historicalSnapshot?.products?.[index];
    if (missing(item.hsn || item.HSN || bill.historicalSnapshot?.products?.[index]?.hsn)) absent.push(`item ${index + 1} HSN`);
    if (number(item.qty ?? item.quantity ?? item.Qty) <= 0) absent.push(`item ${index + 1} quantity`);
    if (item.taxable == null || (item.gst ?? item.gstPercent ?? item.GSTPercent ?? product?.gstRate) == null || item.cgst == null || item.sgst == null || item.igst == null) absent.push(`item ${index + 1} tax values`);
    if (missing(item.productName || bill.historicalSnapshot?.products?.[index]?.name || item.product)) absent.push(`item ${index + 1} description`);
  });
  if (absent.length) throw new Error(`${no}: Missing or invalid ${[...new Set(absent)].join(", ")}.`);

  const itemList = items.map((item, index) => {
    const qty = number(item.qty ?? item.quantity ?? item.Qty);
    const taxable = money(item.taxable);
    const cgst = money(item.cgst);
    const sgst = money(item.sgst);
    const igst = money(item.igst);
    const product = bill.historicalSnapshot?.products?.[index];
    const gross = money(qty * number(item.rate ?? item.salesRate ?? item.SRate));
    return {
      SlNo: String(index + 1), PrdDesc: item.productName || product?.name || item.product || "",
      IsServc: "N", HsnCd: String(item.hsn || item.HSN || product?.hsn),
      Qty: qty, Unit: String(item.unit || product?.unit || "UNT").toUpperCase(),
      UnitPrice: money(item.rate ?? item.salesRate ?? item.SRate), TotAmt: gross,
      Discount: money(Math.max(0, gross - taxable)), PreTaxVal: 0, AssAmt: taxable,
      GstRt: number(item.gst ?? item.gstPercent ?? item.GSTPercent ?? product?.gstRate), IgstAmt: igst, CgstAmt: cgst, SgstAmt: sgst,
      CesRt: 0, CesAmt: 0, CesNonAdvlAmt: 0, StateCesRt: 0, StateCesAmt: 0,
      StateCesNonAdvlAmt: 0, OthChrg: 0, TotItemVal: money(item.amount || taxable + cgst + sgst + igst),
    };
  });
  const stateCode = (value) => gstin(value).slice(0, 2);
  const sellerState = stateCode(sellerGstin);
  const buyerState = stateCode(buyerGstin);
  const discount = money(number(bill.GrossAmount) - number(bill.TaxableValue));
  const otherCharge = money(bill.AddLessAmount);
  const rounding = money(number(bill.NetAmount) - number(bill.TaxableValue) - number(bill.IGSTAmount) - number(bill.CGSTAmount) - number(bill.SGSTAmount) - otherCharge);
  return {
    Version: "1.1",
    TranDtls: { TaxSch: "GST", SupTyp: "B2B", IgstOnIntra: "N", RegRev: null, EcmGstin: null },
    DocDtls: { Typ: "INV", No: no, Dt: date },
    SellerDtls: { Gstin: sellerGstin, LglNm: firm.firmName, TrdNm: firm.firmName, Addr1: firm.address1, Addr2: firm.address2 || null, Loc: firm.city, Pin: pin(firm.pinCode), Stcd: sellerState, Ph: firm.phoneNo || firm.mobileNo || null, Em: firm.email || null },
    BuyerDtls: { Gstin: buyerGstin, LglNm: party.accountName, TrdNm: party.accountName, Pos: buyerState, Addr1: party.address, Addr2: party.add2 || null, Loc: party.town, Pin: pin(party.pinCode), Stcd: buyerState, Ph: party.phoneNo || party.mobileNo || null, Em: party.emailId || null },
    ValDtls: { AssVal: money(bill.TaxableValue), IgstVal: money(bill.IGSTAmount), CgstVal: money(bill.CGSTAmount), SgstVal: money(bill.SGSTAmount), CesVal: 0, StCesVal: 0, Discount: Math.max(0, discount), OthChrg: otherCharge, RndOffAmt: rounding, TotInvVal: money(bill.NetAmount) },
    ItemList: itemList,
  };
}

export default function EInvoiceReport({ onClose }) {
  const today = businessDateIST();
  const year = Number(today.slice(5, 7)) < 4 ? Number(today.slice(0, 4)) - 1 : Number(today.slice(0, 4));
  const [filters, setFilters] = useState({ from: `${year}-04-01`, to: today, taxType: "Only Sales", prodHsn: "Prodwise", level: "Load Wise", status: "Pending", series: "", loadNo: "0", startNo: "0", endNo: "0", amount: "0", qrPath: "" });
  const [records, setRecords] = useState([]);
  const [firm, setFirm] = useState(null);
  const [parties, setParties] = useState({});
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFile, setSavedFile] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const set = (key, value) => setFilters((previous) => ({ ...previous, [key]: value }));
  const generate = async () => {
    if (!filters.from || !filters.to || filters.from > filters.to) { setError("Select a valid From Date and To Date."); return; }
    setLoading(true); setError(""); setMessage(""); setGenerated(false); setSavedFile("");
    try {
      const params = new URLSearchParams({ distributorId: localStorage.getItem("distributorId") || "", firmId: localStorage.getItem("firmId") || "", fromDate: filters.from, toDate: filters.to, minimumAmount: filters.amount || "0", level: filters.level });
      if (filters.series) params.set("series", filters.series);
      if (filters.level === "Load Wise" && number(filters.loadNo)) params.set("loadNo", filters.loadNo);
      if (filters.level === "Bill Wise") {
        if (number(filters.startNo)) params.set("startNo", filters.startNo);
        if (number(filters.endNo)) params.set("endNo", filters.endNo);
      }
      const response = await secureFetch(`${API_URL}/sales/einvoice-candidates?${params}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not load sales bills.");
      const rows = (data.sales || []).filter((bill) => {
        const date = dateKey(bill.BillDate);
        if (date < filters.from || date > filters.to) return false;
        if (number(bill.NetAmount) < number(filters.amount)) return false;
        if (filters.level === "Load Wise" && (filters.series && bill.LoadSeries !== filters.series || number(filters.loadNo) && number(bill.LoadNo) !== number(filters.loadNo))) return false;
        if (filters.level === "Bill Wise" && (filters.series && bill.BillSeries !== filters.series || number(filters.startNo) && number(bill.BillNo) < number(filters.startNo) || number(filters.endNo) && number(bill.BillNo) > number(filters.endNo))) return false;
        return true;
      });
      setRecords(rows); setFirm(data.firm); setParties(data.parties || {}); setSelected(rows.map((bill) => bill._id)); setGenerated(true); setShowFilters(false);
      setMessage(data.firm
        ? `${rows.length} invoice${rows.length === 1 ? "" : "s"} found.`
        : `${rows.length} invoice${rows.length === 1 ? "" : "s"} found. Firm master details are required before creating JSON.`);
    } catch (cause) { setError(cause.message || "Could not generate report."); }
    finally { setLoading(false); }
  };
  const saveJson = async (payload) => {
    const response = await secureFetch(`${API_URL}/sales/einvoice-json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoices: payload }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "JSON could not be saved.");
    setSavedFile(result.fileName);
    setMessage(`JSON file generated for ${result.count} invoice${result.count === 1 ? "" : "s"}. Saved in ${result.folder}/${result.fileName}.`);
    setError("");
  };
  const createJson = async () => {
    setSaving(true);
    try {
      const chosen = records.filter((bill) => selected.includes(bill._id));
      if (!chosen.length) throw new Error("Select at least one invoice.");
      const payload = [];
      for (let offset = 0; offset < chosen.length; offset += 500) {
        const page = chosen.slice(offset, offset + 500);
        const response = await secureFetch(`${API_URL}/sales/einvoice-details`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: page.map((bill) => bill._id) }),
        });
        const details = await response.json();
        if (!response.ok || !details.success) throw new Error(details.message || "Could not load selected invoices.");
        const byId = new Map((details.sales || []).map((bill) => [String(bill._id), bill]));
        page.forEach((bill) => {
          const fullBill = byId.get(String(bill._id));
          if (!fullBill) throw new Error("A selected invoice is unavailable. Reload the list.");
          payload.push(buildEInvoiceJson(fullBill, firm, details.parties?.[fullBill.PartyCode]));
        });
      }
      await saveJson(payload);
    } catch (cause) { setError(cause.message || "JSON could not be generated."); }
    finally { setSaving(false); }
  };
  const uploadJson = async () => {
    if (!savedFile) { setError("Create JSON before uploading it to the E-Invoice portal."); return; }
    setSaving(true);
    try {
      const response = await secureFetch(`${API_URL}/sales/einvoice-upload`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: savedFile }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "E-Invoice portal upload failed.");
      setMessage(`Uploaded ${savedFile} to the E-Invoice portal.`); setError("");
    } catch (cause) { setError(cause.message || "E-Invoice portal upload failed."); }
    finally { setSaving(false); }
  };
  const reset = () => {
    setFilters({ from: `${year}-04-01`, to: today, taxType: "Only Sales", prodHsn: "Prodwise", level: "Load Wise", status: "Pending", series: "", loadNo: "0", startNo: "0", endNo: "0", amount: "0", qrPath: "" });
    setRecords([]); setSelected([]); setGenerated(false); setShowFilters(true); setSavedFile(""); setError(""); setMessage("");
  };
  return <div className="einvoice-page">
    <div className="einvoice-page-heading"><span className="einvoice-heading-icon"><FileText size={24} /></span><div className="einvoice-heading-copy"><h1>E-Invoice Management</h1><p>Generate, Upload and View E-Invoice / E-Way Bill Details</p></div><div className="einvoice-breadcrumb">Home <ChevronRight size={15} /> E-Invoice</div><span className="einvoice-help" title="E-Invoice help"><HelpCircle size={20} /></span>{onClose && <button type="button" className="einvoice-close" onClick={onClose} aria-label="Close E-Invoice Report"><X size={18} /></button>}</div>
    <div className="einvoice-workspace">
      {showFilters && <section className="einvoice-panel">
        <div className="einvoice-section-heading"><span className="einvoice-small-icon"><Filter size={21} /></span><h2>Filter Options</h2></div>
        <div className="einvoice-fields">
          <label>From Date <b>*</b><input type="date" value={filters.from} onChange={(e) => set("from", e.target.value)} /></label>
          <label>To Date <b>*</b><input type="date" value={filters.to} onChange={(e) => set("to", e.target.value)} /></label>
          <label className="einvoice-status-field">Status <b>*</b><select value={filters.status} onChange={(e) => set("status", e.target.value)}><option>Pending</option><option disabled>Generated</option></select></label>
          <label>Report Level<select value={filters.taxType} onChange={(e) => set("taxType", e.target.value)}><option>Only Sales</option><option disabled>Only Cr.Note</option><option disabled>Only Service Invoice</option><option disabled>Gstr 1 Value</option></select></label>
          <label>Document Type<select value={filters.prodHsn} onChange={(e) => set("prodHsn", e.target.value)}><option value="Prodwise">Tax Invoice</option><option value="HSN Wise" disabled>HSN Wise</option></select></label>
          <label>Report Type<select value={filters.level} onChange={(e) => set("level", e.target.value)}><option value="Load Wise">Load Wise</option><option value="Bill Wise">Bill Wise</option><option value="Date Wise">Date Wise</option></select></label>
          {filters.level === "Load Wise" && <><label>Load No.<input type="number" min="0" value={filters.loadNo} onChange={(e) => set("loadNo", e.target.value)} /></label><label>Load Series<input value={filters.series} onChange={(e) => set("series", e.target.value)} /></label></>}
          {filters.level === "Bill Wise" && <><label>Bill Series<input value={filters.series} onChange={(e) => set("series", e.target.value)} /></label><label>Bill No.<input type="number" min="0" value={filters.startNo} onChange={(e) => { setFilters((previous) => ({ ...previous, startNo: e.target.value, endNo: e.target.value })); }} /></label></>}
          <div className="einvoice-actions"><button type="button" className="einvoice-primary" onClick={generate} disabled={loading || saving}><Search size={19} />{loading ? "Loading..." : "Load Invoices"}</button><button type="button" onClick={reset} disabled={loading || saving}><RotateCcw size={18} />Reset</button></div>
        </div>
        <details className="einvoice-extra-filters"><summary>Additional filters</summary><div className="einvoice-extra-fields">
          <label>Amount Above<input type="number" min="0" value={filters.amount} onChange={(e) => set("amount", e.target.value)} /></label>
          <label>QR Path<input value={filters.qrPath} onChange={(e) => set("qrPath", e.target.value)} /></label>
        </div></details>
      </section>}
      <section className="einvoice-result">
        <div className="einvoice-result-heading"><div><span className="einvoice-small-icon"><List size={20} /></span><h2>Invoice List (Pending for E-Invoice)</h2></div><div className="einvoice-result-heading-actions"><span className="einvoice-count">{loading ? "Loading..." : `Showing ${records.length ? 1 : 0} to ${records.length} of ${records.length} invoices`}</span>{generated && !showFilters && <button type="button" onClick={() => setShowFilters(true)}>Change Filters</button>}</div></div>
        {error && <p className="einvoice-error" role="alert">{error}</p>}
        <div className="einvoice-table-wrap"><table><thead><tr><th><input type="checkbox" aria-label="Select all invoices" checked={!!records.length && selected.length === records.length} onChange={(e) => { setSelected(e.target.checked ? records.map((bill) => bill._id) : []); setSavedFile(""); }} disabled={!records.length} /></th><th>Sr.</th><th>Invoice No.</th><th>Date</th><th>Customer Name</th><th>GSTIN</th><th className="einvoice-numeric">Invoice Value (₹)</th><th>E-Invoice</th><th>E-Way Bill</th><th>IRN Number</th><th>Ack No.</th><th>Status</th><th>Action</th></tr></thead><tbody>{generated && records.map((bill, index) => <tr key={bill._id}><td><input type="checkbox" aria-label={`Select invoice ${bill.BillSeries}${bill.BillNo}`} checked={selected.includes(bill._id)} onChange={(e) => { setSelected((current) => e.target.checked ? [...current, bill._id] : current.filter((id) => id !== bill._id)); setSavedFile(""); }} /></td><td>{index + 1}</td><td>{bill.BillSeries}{bill.BillNo}</td><td>{displayDate(bill.BillDate)}</td><td>{bill.PartyName}</td><td>{parties[bill.PartyCode]?.gstNo || "-"}</td><td className="einvoice-numeric">{money(bill.NetAmount).toFixed(2)}</td><td><input type="checkbox" aria-label="E-Invoice generated" checked={Boolean(bill.IRNNo)} readOnly disabled /></td><td><input type="checkbox" aria-label="E-Way Bill generated" checked={Boolean(bill.EwayBillNo)} readOnly disabled /></td><td>{bill.IRNNo || "-"}</td><td>{bill.AckNo || "-"}</td><td><span className="einvoice-status">Pending</span></td><td><span className="einvoice-row-icon" title={`Invoice ${bill.BillSeries}${bill.BillNo}`}><Eye size={17} /></span></td></tr>)}</tbody></table>{(!generated || !records.length) && <p>{loading ? "Loading matching invoices..." : generated ? "No invoices found for these criteria." : "Load invoices to view matching invoices."}</p>}</div>
      </section>
    </div>
    <div className="einvoice-bottom-bar"><label className="einvoice-select-all"><input type="checkbox" checked={!!records.length && selected.length === records.length} onChange={(e) => { setSelected(e.target.checked ? records.map((bill) => bill._id) : []); setSavedFile(""); }} disabled={!records.length} />Select All ({records.length})</label><span className="einvoice-divider" /><button type="button" disabled title="Portal generation is unavailable"><Settings size={20} />Generate E-Invoice</button><button type="button" disabled title="E-Way Bill generation is unavailable"><FileText size={20} />Generate E-Way Bill</button><span className="einvoice-spacer" /><span className="einvoice-divider" /><button type="button" onClick={createJson} disabled={!generated || !selected.length || saving}><FileJson size={19} />{saving ? "Saving..." : "Create JSON"}</button><button type="button" onClick={uploadJson} disabled={!savedFile || saving} title={!savedFile ? "Create JSON first" : "Upload the saved JSON to the E-Invoice portal"}><Upload size={19} />Upload JSON</button><button type="button" disabled title="Download is unavailable until the portal returns a file"><Download size={19} />Download JSON</button></div>
    {message && <p className="einvoice-message" role="status"><Check size={18} /><span>{message}</span></p>}
    {savedFile && <p className="einvoice-saved-file" title={savedFile}>Saved on the server in TsEinvoiceJSon</p>}
  </div>;
}
