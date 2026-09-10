import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LockKeyhole, Pencil, Plus, Save, Search, X } from "lucide-react";
import { API_URL } from "./api/config";
import { secureFetch } from "./SecuritySetup";
import "./BatchLockSalesRate.css";

const PAGE_SIZE = 20;
const money = (value) => Number(value || 0).toFixed(2);
const dateTime = (value) => value ? new Date(value).toLocaleString("en-IN") : "-";
const companyCodeOf = (company) => String(company?.companyCode || company?.code || company?.id || company?._id || "").trim();
const companyNameOf = (company) => String(company?.companyName || company?.name || companyCodeOf(company)).trim();

export default function BatchLockSalesRate({ companies = [], onStockChanged, navigationRequest = null }) {
  const [view, setView] = useState("list");
  const [history, setHistory] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [draftRows, setDraftRows] = useState({});
  const [companyCode, setCompanyCode] = useState("ALL");
  const [withStockOnly, setWithStockOnly] = useState("Y");
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const handledNavigationId = useRef(0);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await secureFetch(`${API_URL}/batch-lock/history`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to load change history.");
      setHistory(Array.isArray(result.rows) ? result.rows : []);
    } catch (error) { alert(error.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (view === "list") loadHistory(); }, [loadHistory, view]);

  const loadStock = useCallback(async (options = {}) => {
    const selectedCompany = options.companyCode ?? companyCode;
    const selectedStockOnly = options.withStockOnly ?? withStockOnly;
    const selectedSearch = options.search ?? search;
    setLoading(true);
    try {
      const query = new URLSearchParams({ companyCode: selectedCompany, withStockOnly: selectedStockOnly, search: selectedSearch });
      const response = await secureFetch(`${API_URL}/batch-lock/stock?${query}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to load stock batches.");
      const rows = Array.isArray(result.rows) ? result.rows : [];
      setStockRows(rows);
      setDraftRows(Object.fromEntries(rows.map((row) => [row.id, { salesRate: String(row.salesRate), locked: row.locked }])));
      setPage(1);
    } catch (error) { alert(error.message); setStockRows([]); } finally { setLoading(false); }
  }, [companyCode, search, withStockOnly]);

  const openEntry = (stockSearch = "") => {
    setSearch(stockSearch);
    setReason("");
    setPage(1);
    setView("entry");
    window.setTimeout(() => loadStock({ search: stockSearch }), 0);
  };

  useEffect(() => {
    if (!navigationRequest?.id || handledNavigationId.current === navigationRequest.id) return;
    handledNavigationId.current = navigationRequest.id;
    if (navigationRequest.mode === "entry") openEntry();
    else setView("list");
  }, [navigationRequest]);

  const visibleHistory = useMemo(() => {
    const query = search.trim().toLowerCase();
    return history.filter((row) => !query || [row.productCode, row.productName, row.batch, row.editedBy, row.companyName].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [history, search]);
  const pageCount = Math.max(1, Math.ceil(stockRows.length / PAGE_SIZE));
  const pagedStockRows = useMemo(() => stockRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [page, stockRows]);

  const updateDraft = (id, field, value) => setDraftRows((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));

  const save = async () => {
    const updates = stockRows.filter((row) => {
      const draft = draftRows[row.id];
      return draft && (Number(draft.salesRate) !== Number(row.salesRate) || draft.locked !== row.locked);
    }).map((row) => ({ stockId: row.id, salesRate: draftRows[row.id].salesRate, locked: draftRows[row.id].locked }));
    if (!updates.length) return alert("No sales rate or lock changes were made.");
    if (!reason.trim()) return alert("Please enter a reason for the rate or lock change.");
    setSaving(true);
    try {
      const response = await secureFetch(`${API_URL}/batch-lock/stock`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updates, reason: reason.trim() }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to update stock batches.");
      alert(result.message);
      onStockChanged?.();
      setView("list");
    } catch (error) { alert(error.message); } finally { setSaving(false); }
  };

  if (view === "list") {
    return <div className="erp-transaction-list-page ts-sales-list-page batch-rate-list-page">
      <div className="ts-sales-page-header"><div className="tool-page-title"><span><LockKeyhole size={18} /></span><div><h1>Batch Lock and Change Sales Rate</h1><p>Audit every sales-rate and batch-lock change.</p></div></div><div className="ts-sales-page-actions"><button type="button" className="ts-btn primary" onClick={() => openEntry()}><Plus size={15} /> New Batch Change</button></div></div>
      <div className="ts-filter-launch-row ts-reference-list-toolbar"><div className="ts-reference-list-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, batch, company or user..." /></div></div>
      <div className="sales-billing-table-card"><div className="sales-billing-table-scroll"><table className="sales-billing-table batch-rate-history-table">
        <thead><tr><th>Sr.</th><th>Product</th><th>Company</th><th>Godown</th><th>Batch</th><th>MRP</th><th>Purchase Rate</th><th>Previous S.Rate</th><th>New S.Rate</th><th>Lock Change</th><th>Edited By</th><th>Edited Date</th><th>Action</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan="13" className="sales-billing-empty">Loading change history...</td></tr> : visibleHistory.length ? visibleHistory.map((row, index) => <tr key={row._id}><td>{index + 1}</td><td><button type="button" className="batch-product-link" onClick={() => openEntry(row.productCode)}>{row.productName || row.productCode}</button><small>{row.productCode}</small></td><td>{row.companyName || row.companyCode || "-"}</td><td>{row.godownCode || "-"}</td><td>{row.batch}</td><td>{money(row.mrp)}</td><td>{money(row.purchaseRate)}</td><td>{money(row.previousSalesRate)}</td><td>{money(row.newSalesRate)}</td><td>{row.previousLocked} → {row.newLocked}</td><td>{row.editedBy || "-"}</td><td>{dateTime(row.editedAt)}</td><td><div className="sales-billing-row-actions"><button type="button" className="edit" title="Open product batches" onClick={() => openEntry(row.productCode)}><Pencil size={15} /></button></div></td></tr>) : <tr><td colSpan="13" className="sales-billing-empty">No batch rate or lock changes found.</td></tr>}</tbody>
      </table></div></div>
    </div>;
  }

  return <div className="compact-master-page batch-rate-entry-page">
    <div className="compact-master-heading">
      <div className="compact-master-title"><span className="compact-master-title-icon"><LockKeyhole size={18} /></span><div><h1>Batch Lock and Change Sales Rate</h1><p>Update sales rates or locks for multiple products.</p></div></div>
      <div className="compact-master-actions"><button type="button" className="compact-btn compact-btn-cancel" onClick={() => setView("list")}><X size={15} /> Cancel</button><button type="button" className="compact-btn compact-btn-primary" onClick={save} disabled={saving || loading}><Save size={15} /> {saving ? "Saving..." : "Save"}</button></div>
    </div>
    <div className="compact-master-form batch-rate-form">
      <div className="batch-rate-filters">
        <div className="compact-field"><label>Company</label><select value={companyCode} onChange={(event) => { setCompanyCode(event.target.value); loadStock({ companyCode: event.target.value }); }}><option value="ALL">All Companies</option>{companies.map((company) => <option key={companyCodeOf(company)} value={companyCodeOf(company)}>{companyNameOf(company)}</option>)}</select></div>
        <div className="compact-field"><label>With Stock Only</label><select value={withStockOnly} onChange={(event) => { setWithStockOnly(event.target.value); loadStock({ withStockOnly: event.target.value }); }}><option value="Y">Yes</option><option value="N">No</option></select></div>
        <div className="compact-field batch-rate-search"><label>Search Product / Batch</label><div><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") loadStock(); }} placeholder="Enter Product Code / Product Name / Batch No..." /><button type="button" onClick={() => loadStock()}>Go</button></div></div>
        <div className="compact-field"><label>Change Reason *</label><input value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} placeholder="Reason for rate or lock change" /></div>
      </div>
      <div className="batch-rate-grid-card">
        <div className="batch-rate-grid-scroll"><table className="batch-rate-grid-table">
          <thead><tr><th>Product Code</th><th>Product Name</th><th>Godown</th><th>MRP</th><th>Batch</th><th>Lock</th><th>Stock</th><th>S.Rate</th><th>P.Rate</th><th>New S.Rate</th><th>Previous Rate</th><th>Edit User</th><th>Edit Date</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan="13" className="batch-rate-empty">Loading stock...</td></tr> : pagedStockRows.length ? pagedStockRows.map((row) => <tr key={row.id}>
            <td>{row.productCode}</td><td className="batch-rate-product-name" title={row.productName}>{row.productName || "-"}</td><td>{row.godownCode || "-"}</td><td>{money(row.mrp)}</td><td>{row.batch}</td>
            <td><button type="button" className={`batch-rate-lock ${draftRows[row.id]?.locked === "Y" ? "locked" : "unlocked"}`} aria-pressed={draftRows[row.id]?.locked === "Y"} onClick={() => updateDraft(row.id, "locked", draftRows[row.id]?.locked === "Y" ? "N" : "Y")}>{draftRows[row.id]?.locked === "Y" ? "Yes" : "No"}</button></td>
            <td>{row.quantity}</td><td>{money(row.salesRate)}</td><td>{money(row.purchaseRate)}</td><td><input className="batch-rate-grid-input" type="number" min="0" step="any" value={draftRows[row.id]?.salesRate || ""} onChange={(event) => updateDraft(row.id, "salesRate", event.target.value)} /></td><td>{row.previousSalesRate == null ? "-" : money(row.previousSalesRate)}</td><td>{row.editedBy || "-"}</td><td className="batch-rate-edit-date">{dateTime(row.editedAt)}</td>
          </tr>) : <tr><td colSpan="13" className="batch-rate-empty">No stock batches found.</td></tr>}</tbody>
        </table></div>
        <div className="batch-rate-grid-footer"><strong>Total Records: {stockRows.length}</strong><div className="batch-rate-pagination"><button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={16} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).filter((number) => number === 1 || number === pageCount || Math.abs(number - page) <= 1).map((number, index, numbers) => <React.Fragment key={number}>{index > 0 && number - numbers[index - 1] > 1 && <span>…</span>}<button type="button" className={page === number ? "active" : ""} onClick={() => setPage(number)}>{number}</button></React.Fragment>)}<button type="button" aria-label="Next page" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}><ChevronRight size={16} /></button></div></div>
      </div>
    </div>
  </div>;
}
