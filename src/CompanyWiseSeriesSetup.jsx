import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { API_URL } from "./api/config";
import { secureFetch } from "./SecuritySetup";
import "./CompanyWiseSeriesSetup.css";

export const COMPANY_SERIES_COLUMNS = [
  { key: "sales", label: "SAL", title: "Sales" },
  { key: "purchase", label: "PUR", title: "Purchase" },
  { key: "creditNote", label: "CRN", title: "Credit Note" },
  { key: "debitNote", label: "DRN", title: "Debit Note" },
  { key: "stockIn", label: "STKIN", title: "Stock In" },
  { key: "stockOut", label: "STKOUT", title: "Stock Out" },
  { key: "materialTransfer", label: "MTPO", title: "Material Transfer" },
  { key: "selfDamage", label: "SELFD", title: "Self Damage" },
  { key: "godownTransfer", label: "GDTRF", title: "Godown Transfer" },
  { key: "manufacturing", label: "MFG", title: "Manufacturing" },
  { key: "discountJv", label: "DJV", title: "Discount JV" },
  { key: "salesService", label: "SALSVC", title: "Sales Service" },
  { key: "purchaseService", label: "PURSVC", title: "Purchase Service" },
];

const emptySeries = () => Object.fromEntries(COMPANY_SERIES_COLUMNS.map(({ key }) => [key, ""]));
const companyCodeOf = (company) => String(company?.companyCode || company?.code || company?.id || company?._id || "").trim();
const companyNameOf = (company) => String(company?.companyName || company?.name || companyCodeOf(company)).trim();

export default function CompanyWiseSeriesSetup({ companies = [], onSaved, navigationRequest = null }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ companyCode: "", companyName: "", ...emptySeries() });
  const [editingId, setEditingId] = useState("");
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const scope = useMemo(() => ({ distributorId: localStorage.getItem("distributorId") || "", firmId: localStorage.getItem("firmId") || "" }), []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await secureFetch(`${API_URL}/company-wise-series?${new URLSearchParams(scope)}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to load series setup.");
      const loaded = Array.isArray(result.rows) ? result.rows : [];
      setRows(loaded);
      onSaved?.(loaded);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }, [onSaved, scope]);

  useEffect(() => { loadRows(); }, [loadRows]);

  const companyOptions = useMemo(() => [
    { code: "ALL", name: "All Companies" },
    ...companies.map((company) => ({ code: companyCodeOf(company), name: companyNameOf(company) })).filter((company) => company.code),
  ], [companies]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => !query || String(row.companyCode).toLowerCase().includes(query) || String(row.companyName).toLowerCase().includes(query));
  }, [rows, search]);

  const openNew = useCallback(() => { setEditingId(""); setForm({ companyCode: "", companyName: "", ...emptySeries() }); setView("entry"); }, []);
  const openEdit = (row) => { setEditingId(String(row._id || "")); setForm({ ...emptySeries(), ...row }); setView("entry"); };

  useEffect(() => {
    if (!navigationRequest?.id) return;
    if (navigationRequest.mode === "entry") openNew();
    else setView("list");
  }, [navigationRequest, openNew]);
  const selectCompany = (companyCode) => {
    const selected = companyOptions.find((company) => company.code === companyCode);
    setForm((current) => ({ ...current, companyCode, companyName: selected?.name || "" }));
  };

  const save = async () => {
    if (!form.companyCode) return alert("Please select a company.");
    const duplicate = rows.find((row) => String(row.companyCode).toUpperCase() === form.companyCode.toUpperCase() && String(row._id) !== editingId);
    if (duplicate) return alert("Series setup already exists for this company. Open it from the list to edit.");
    setSaving(true);
    try {
      const response = await secureFetch(`${API_URL}/company-wise-series`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...scope, rows: [form] }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to save series setup.");
      await loadRows();
      setView("list");
    } catch (error) { alert(error.message); } finally { setSaving(false); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete series setup for ${row.companyName || row.companyCode}?`)) return;
    try {
      const response = await secureFetch(`${API_URL}/company-wise-series/${row._id}?${new URLSearchParams(scope)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to delete series setup.");
      await loadRows();
    } catch (error) { alert(error.message); }
  };

  if (view === "entry") {
    return <div className="compact-master-page company-series-entry">
      <div className="compact-master-heading">
        <div className="compact-master-title"><span className="compact-master-title-icon"><Building2 size={17} /></span><div><h1>{editingId ? "Edit" : "Add"} Company Wise Series</h1><p>Set voucher series for one company.</p></div></div>
        <div className="compact-master-actions"><button type="button" className="compact-btn compact-btn-cancel" onClick={() => setView("list")}><X size={15} /> Cancel</button><button type="button" className="compact-btn compact-btn-primary" onClick={save} disabled={saving}><Save size={15} /> {saving ? "Saving..." : "Save"}</button></div>
      </div>
      <div className="compact-master-form company-series-form">
        <div className="compact-field company-series-company-field"><label>Company <span>*</span></label><select value={form.companyCode} onChange={(event) => selectCompany(event.target.value)} disabled={Boolean(editingId)}><option value="">Select Company</option>{companyOptions.map((company) => <option key={company.code} value={company.code}>{company.name}</option>)}</select></div>
        <div className="company-series-field-grid">{COMPANY_SERIES_COLUMNS.map((column) => <div className="compact-field" key={column.key}><label>{column.title} ({column.label})</label><input value={form[column.key] || ""} maxLength={20} placeholder="Series" onChange={(event) => setForm((current) => ({ ...current, [column.key]: event.target.value.toUpperCase() }))} /></div>)}</div>
      </div>
    </div>;
  }

  return <div className="erp-transaction-list-page ts-sales-list-page company-series-list-page">
    <div className="ts-sales-page-header"><div className="tool-page-title"><span><Building2 size={18} /></span><div><h1>Company Wise Series Setup</h1><p>Review and manage company-specific voucher series.</p></div></div><div className="ts-sales-page-actions"><button type="button" className="ts-btn primary" onClick={openNew}><Plus size={15} /> New Series Setup</button></div></div>
    <div className="ts-filter-launch-row ts-reference-list-toolbar"><div className="ts-reference-list-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company..." /></div></div>
    <div className="sales-billing-table-card"><div className="sales-billing-table-scroll"><table className="sales-billing-table company-series-list-table">
      <thead><tr><th>Sr.</th><th>Company</th>{COMPANY_SERIES_COLUMNS.map((column) => <th key={column.key} title={column.title}>{column.label}</th>)}<th>Actions</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan={COMPANY_SERIES_COLUMNS.length + 3} className="sales-billing-empty">Loading series setup...</td></tr> : filteredRows.length ? filteredRows.map((row, index) => <tr key={row._id || row.companyCode}><td>{index + 1}</td><td><button type="button" className="company-series-name-link" onClick={() => openEdit(row)}>{row.companyName || row.companyCode}</button><small>{row.companyCode}</small></td>{COMPANY_SERIES_COLUMNS.map((column) => <td key={column.key}>{row[column.key] || "-"}</td>)}<td><div className="sales-billing-row-actions"><button type="button" className="edit" title="Edit" onClick={() => openEdit(row)}><Pencil size={15} /></button><button type="button" className="delete" title="Delete" onClick={() => remove(row)}><Trash2 size={15} /></button></div></td></tr>) : <tr><td colSpan={COMPANY_SERIES_COLUMNS.length + 3} className="sales-billing-empty">No company-wise series setup found. Click New Series Setup to add one.</td></tr>}</tbody>
    </table></div></div>
  </div>;
}
