import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Eye, MoreVertical, Pencil, Plus, ReceiptText, Save, Search, Trash2, X } from "lucide-react";
import { API_URL } from "./api/config";
import { secureFetch } from "./SecuritySetup";
import { businessDateIST } from "./utils/businessDate";
import "./ServiceManagement.css";

const sessionScope = () => ({
  distributorId: localStorage.getItem("distributorId") || "",
  firmId: localStorage.getItem("firmId") || "",
  firmName: localStorage.getItem("firmName") || "",
});
const emptyService = { serviceCode: "", serviceName: "", gstId: "", hsnCode: "", description: "" };
const emptyRow = () => ({ serviceId: "", serviceCode: "", serviceName: "", serviceSearch: "", amount: "", gstPercent: 0, gstAmount: 0, igstAmount: 0, cgstAmount: 0, sgstAmount: 0, taxMode: "LOCAL" });
const emptyVoucher = () => ({ voucherDate: businessDateIST(), voucherSeries: "SS", voucherNo: "", partyId: "", narration: "", fromDate: businessDateIST(), toDate: businessDateIST(), acknowledgementNo: "", ewayBillNo: "", irnNo: "", acknowledgementDate: "", addAmount: "0.00", lessAmount: "0.00" });
const asMoney = (value) => (Number(value || 0)).toFixed(2);

function Pager({ page, pages, total, onChange }) {
  return <div className="service-pager"><span>{total} record{total === 1 ? "" : "s"}</span><div><button disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><strong>Page {page} of {pages}</strong><button disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button></div></div>;
}

export function ServiceMaster({ isFormOpen, onOpenForm, onCloseForm, onSaved }) {
  const [rows, setRows] = useState([]), [gstList, setGstList] = useState([]);
  const [form, setForm] = useState(emptyService), [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState(""), [page, setPage] = useState(1), [pages, setPages] = useState(1), [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);

  const loadRows = useCallback(async () => {
    const scope = sessionScope(); if (!scope.distributorId || !scope.firmId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...scope, page: String(page), limit: "20", search });
      const response = await secureFetch(`${API_URL}/services?${params}`), result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.message || "Failed to load services.");
      setRows(result.services || []); setPages(result.pagination?.totalPages || 1); setTotal(result.pagination?.totalRecords || 0);
    } catch (error) { alert(error.message); setRows([]); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { if (!isFormOpen) loadRows(); }, [isFormOpen, loadRows]);
  useEffect(() => {
    if (!isFormOpen) return;
    const loadGst = async () => {
      try {
        const scope = sessionScope(), params = new URLSearchParams({ distributorId: scope.distributorId, firmId: scope.firmId });
        const response = await secureFetch(`${API_URL}/gst?${params}`), result = await response.json();
        if (!response.ok) throw new Error(result.message || "Failed to load GST Master.");
        setGstList(result.gstList || []);
      } catch (error) { alert(error.message); }
    };
    loadGst();
  }, [isFormOpen]);

  const close = () => { setForm(emptyService); setEditingId(null); onCloseForm(); };
  const add = () => { setForm(emptyService); setEditingId(null); onOpenForm(); };
  const edit = (record) => { setEditingId(record._id); setForm({ serviceCode: record.serviceCode || "", serviceName: record.serviceName || "", gstId: String(record.gstId || ""), hsnCode: record.hsnCode || "", description: record.description || "" }); onOpenForm(); };
  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const scope = sessionScope(), response = await secureFetch(`${API_URL}/services${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, ...scope }),
      }), result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.message || "Service save failed.");
      await onSaved?.(result.service);
      alert(result.message); close();
    } catch (error) { alert(error.message); } finally { setSaving(false); }
  };
  const remove = async (record) => {
    if (!window.confirm(`Delete service "${record.serviceName}"?`)) return;
    try {
      const scope = sessionScope(), params = new URLSearchParams({ distributorId: scope.distributorId, firmId: scope.firmId });
      const response = await secureFetch(`${API_URL}/services/${record._id}?${params}`, { method: "DELETE" }), result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.message || "Delete failed.");
      await loadRows();
    } catch (error) { alert(error.message); }
  };

  if (isFormOpen) return <div className="compact-master-page service-master-page"><div className="compact-master-heading"><div className="compact-master-title"><div className="compact-master-title-icon"><ReceiptText size={21} /></div><div><h1>Service Master</h1><p>{editingId ? "Edit service details" : "Add a new service"}</p></div></div><div className="compact-master-actions"><button type="button" className="compact-btn compact-btn-cancel" onClick={close}><X size={15} />Cancel</button><button type="submit" form="service-master-form" disabled={saving} className="compact-btn compact-btn-primary"><Save size={15} />{saving ? "Saving..." : editingId ? "Update Service" : "Save Service"}</button></div></div>
    <form id="service-master-form" className="compact-master-form service-master-form" onSubmit={save}><div className="compact-form-grid compact-form-grid-4 service-master-grid">
      <div className="compact-field"><label>Service Code <span>*</span></label><input value={form.serviceCode} maxLength={30} readOnly={!!editingId} onChange={(e) => setForm({ ...form, serviceCode: e.target.value.toUpperCase() })} placeholder="Service Code" required /></div>
      <div className="compact-field service-name-field"><label>Service Name <span>*</span></label><input value={form.serviceName} maxLength={150} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} placeholder="Service Name" required /></div>
      <div className="compact-field service-gst-field"><label>GST <span>*</span></label><select value={form.gstId} onChange={(e) => setForm({ ...form, gstId: e.target.value })} required><option value="">Select GST from GST Master</option>{gstList.map((gst) => <option key={gst._id} value={gst._id}>{Number(gst.vatPercent || 0).toFixed(2)}% | {gst.purchaseType} | {gst.salesType}</option>)}</select></div>
      <div className="compact-field"><label>HSN / SAC Code</label><input value={form.hsnCode} maxLength={20} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} placeholder="HSN / SAC Code" /></div>
      <div className="compact-field service-description-field"><label>Description</label><textarea rows="3" value={form.description} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Service description" /></div>
    </div></form></div>;

  return <div className="firm-ui-page firm-ui-list-page erp-master-list-page service-master-list"><div className="firm-ui-page-heading firm-ui-list-heading erp-list-page-header"><div><h1>Service Master</h1><p>Maintain service accounts, GST and HSN/SAC details.</p></div><div className="firm-ui-list-toolbar erp-list-toolbar"><div className="firm-ui-search-box erp-list-search"><Search size={17} /><input placeholder="Search code, name or HSN..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div><button type="button" className="firm-ui-btn firm-ui-btn-primary" onClick={add}><Plus size={17} />Add New Service</button></div></div><div className="firm-ui-table-card erp-list-card">
    <div className="firm-ui-table-scroll erp-list-table-scroll"><table className="firm-ui-table firm-ui-table-compact erp-list-table"><thead><tr><th className="firm-ui-sno-column">S.No</th><th>Service Code</th><th>Service Name</th><th>GST %</th><th>HSN / SAC</th><th>Description</th><th className="firm-ui-action-column">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="7" className="empty">Loading service records...</td></tr> : rows.length ? rows.map((row, index) => <tr key={row._id}><td className="firm-ui-sno-column">{(page - 1) * 20 + index + 1}</td><td><strong>{row.serviceCode}</strong></td><td>{row.serviceName}</td><td><span className="firm-ui-status-badge active">{Number(row.gstPercent || 0).toFixed(2)}%</span></td><td>{row.hsnCode || "—"}</td><td>{row.description || "—"}</td><td className="firm-ui-action-column"><div className="firm-ui-row-actions"><button type="button" className="firm-ui-action-btn edit" title="Edit service" onClick={() => edit(row)}><Pencil size={15} /></button><button type="button" className="firm-ui-action-btn delete" title="Delete service" onClick={() => remove(row)}><Trash2 size={15} /></button></div></td></tr>) : <tr><td colSpan="7" className="empty">No services found. Click Add New Service to create one.</td></tr>}</tbody></table></div><Pager page={page} pages={pages} total={total} onChange={setPage} /></div></div>;
}

export function SalesService({ isFormOpen, onOpenForm, onCloseForm }) {
  const [vouchers, setVouchers] = useState([]), [services, setServices] = useState([]), [parties, setParties] = useState([]);
  const [form, setForm] = useState(emptyVoucher), [items, setItems] = useState([emptyRow()]), [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState(""), [page, setPage] = useState(1), [pages, setPages] = useState(1), [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);
  const [serviceDropdownIndex, setServiceDropdownIndex] = useState(-1);
  const [showServiceMaster, setShowServiceMaster] = useState(false);
  const totals = useMemo(() => {
    const totalAmount = items.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const gstAmount = items.reduce((sum, row) => sum + Number(row.gstAmount || 0), 0);
    const igstAmount = items.reduce((sum, row) => sum + Number(row.igstAmount || 0), 0);
    const cgstAmount = items.reduce((sum, row) => sum + Number(row.cgstAmount || 0), 0);
    const sgstAmount = items.reduce((sum, row) => sum + Number(row.sgstAmount || 0), 0);
    return { totalAmount, gstAmount, igstAmount, cgstAmount, sgstAmount, netAmount: totalAmount + gstAmount + Number(form.addAmount || 0) - Number(form.lessAmount || 0) };
  }, [items, form.addAmount, form.lessAmount]);

  const loadList = useCallback(async () => {
    const scope = sessionScope(); if (!scope.distributorId || !scope.firmId) return; setLoading(true);
    try { const params = new URLSearchParams({ ...scope, page: String(page), limit: "20", search }); const response = await secureFetch(`${API_URL}/sales-services?${params}`), result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.message || "Failed to load Sales Services.");
      setVouchers(result.vouchers || []); setPages(result.pagination?.totalPages || 1); setTotal(result.pagination?.totalRecords || 0);
    } catch (error) { alert(error.message); setVouchers([]); } finally { setLoading(false); }
  }, [page, search]);
  useEffect(() => { if (!isFormOpen) loadList(); }, [isFormOpen, loadList]);
  const loadLookups = useCallback(async () => { try { const scope = sessionScope(), query = new URLSearchParams({ distributorId: scope.distributorId, firmId: scope.firmId });
      const [serviceResponse, partyResponse] = await Promise.all([secureFetch(`${API_URL}/services?${query}&limit=100`), secureFetch(`${API_URL}/accounts?${query}`)]);
      const [serviceResult, partyResult] = await Promise.all([serviceResponse.json(), partyResponse.json()]);
      if (!serviceResponse.ok) throw new Error(serviceResult.message); if (!partyResponse.ok) throw new Error(partyResult.message);
      setServices(serviceResult.services || []); setParties(partyResult.accounts || []);
    } catch (error) { alert(error.message || "Failed to load Sales Service selections."); } }, []);
  useEffect(() => { if (isFormOpen) loadLookups(); }, [isFormOpen, loadLookups]);
  useEffect(() => {
    if (!isFormOpen || editingId || showServiceMaster) return undefined;
    const timer = window.setTimeout(async () => {
      try {
        const scope = sessionScope();
        if (!scope.distributorId || !scope.firmId) return;
        const query = new URLSearchParams({ distributorId: scope.distributorId, firmId: scope.firmId, voucherSeries: form.voucherSeries || "" });
        const response = await secureFetch(`${API_URL}/sales-services/next-voucher-no?${query}`);
        const result = await response.json();
        if (!response.ok || result.success === false) throw new Error(result.message || "Failed to load next voucher number.");
        setForm((current) => current.voucherSeries === form.voucherSeries ? { ...current, voucherNo: String(result.nextVoucherNo || 1) } : current);
      } catch (error) {
        console.error("Next Sales Service voucher number error:", error);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [form.voucherSeries, isFormOpen, editingId, showServiceMaster]);

  const close = () => { setEditingId(null); setForm(emptyVoucher()); setItems([emptyRow()]); setServiceDropdownIndex(-1); setShowServiceMaster(false); onCloseForm(); };
  const add = () => { setEditingId(null); setForm(emptyVoucher()); setItems([emptyRow()]); setServiceDropdownIndex(-1); setShowServiceMaster(false); onOpenForm(); };
  const chooseService = (index, id) => {
    const interstate = isCstParty(form.partyId);
    setItems((current) => current.map((row, rowIndex) => { if (rowIndex !== index) return row; const service = services.find((entry) => entry._id === id); if (!service) return { ...row, serviceId: "", serviceCode: "", serviceName: "", serviceSearch: "", gstPercent: 0, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 }; const amount = Number(row.amount || 0), gstAmount = amount * Number(service.gstPercent || 0) / 100; return { ...row, serviceId: id, serviceCode: service.serviceCode, serviceName: service.serviceName, serviceSearch: service.serviceName, gstPercent: service.gstPercent, taxMode: interstate ? "IGST" : "LOCAL", gstAmount, cgstAmount: interstate ? 0 : gstAmount / 2, sgstAmount: interstate ? 0 : gstAmount / 2, igstAmount: interstate ? gstAmount : 0 }; }));
    setServiceDropdownIndex(-1);
  };
  const searchService = (index, value) => setItems((current) => current.map((row, rowIndex) => {
    if (rowIndex !== index) return row;
    if (value === row.serviceName) return { ...row, serviceSearch: value };
    return { ...row, serviceSearch: value, serviceId: "", serviceCode: "", serviceName: "", gstPercent: 0, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };
  }));
  const matchingServices = (value) => {
    const term = String(value || "").trim().toLowerCase();
    return services.filter((service) => !term || String(service.serviceName || "").toLowerCase().includes(term) || String(service.serviceCode || "").toLowerCase().includes(term)).slice(0, 12);
  };
  const isCstParty = (partyId) => {
    const party = parties.find((entry) => String(entry._id) === String(partyId));
    const invType = String(party?.invType || party?.taxType || "TAXABLE").trim().toUpperCase();
    return invType === "CST" || invType === "IGST" || invType === "INTERSTATE" || invType.includes("CST") || invType.includes("IGST");
  };
  const changeParty = (partyId) => {
    const interstate = isCstParty(partyId);
    setForm((current) => ({ ...current, partyId }));
    setItems((current) => current.map((row) => {
      const gstAmount = Number(row.amount || 0) * Number(row.gstPercent || 0) / 100;
      return { ...row, taxMode: interstate ? "IGST" : "LOCAL", gstAmount, igstAmount: interstate ? gstAmount : 0, cgstAmount: interstate ? 0 : gstAmount / 2, sgstAmount: interstate ? 0 : gstAmount / 2 };
    }));
  };
  const changeAmount = (index, value) => setItems((current) => current.map((row, rowIndex) => { if (rowIndex !== index) return row; const gstAmount = Number(value || 0) * Number(row.gstPercent || 0) / 100; return { ...row, amount: value, gstAmount, cgstAmount: row.taxMode === "IGST" ? 0 : gstAmount / 2, sgstAmount: row.taxMode === "IGST" ? 0 : gstAmount / 2, igstAmount: row.taxMode === "IGST" ? gstAmount : 0 }; }));
  const edit = (voucher) => { setEditingId(voucher._id); setForm({ voucherDate: voucher.voucherDate, voucherSeries: voucher.voucherSeries, voucherNo: voucher.voucherNo, partyId: String(voucher.partyId), narration: voucher.narration || "", fromDate: voucher.fromDate || "", toDate: voucher.toDate || "", acknowledgementNo: voucher.acknowledgementNo || "", ewayBillNo: voucher.ewayBillNo || "", irnNo: voucher.irnNo || "", acknowledgementDate: voucher.acknowledgementDate || "", addAmount: voucher.addAmount, lessAmount: voucher.lessAmount }); setItems((voucher.items || []).map((row) => ({ ...row, serviceId: String(row.serviceId), serviceSearch: row.serviceName || "", taxMode: Number(row.igstAmount) > 0 ? "IGST" : "LOCAL" }))); setServiceDropdownIndex(-1); setShowServiceMaster(false); onOpenForm(); };
  const save = async (event) => { event.preventDefault(); const validItems = items.filter((row) => row.serviceId || Number(row.amount)).map(({ serviceSearch: _serviceSearch, ...row }) => row); setSaving(true);
    try { const scope = sessionScope(), response = await secureFetch(`${API_URL}/sales-services${editingId ? `/${editingId}` : ""}`, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, ...scope, items: validItems }) }), result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.message || "Sales Service save failed."); alert(`${result.message} Voucher No: ${result.voucher?.voucherSeries || "SS"}-${result.voucher?.voucherNo}`); close();
    } catch (error) { alert(error.message); } finally { setSaving(false); } };
  const remove = async (voucher) => { if (!window.confirm(`Delete Sales Service ${voucher.voucherSeries}-${voucher.voucherNo}?`)) return; try { const scope = sessionScope(), query = new URLSearchParams({ distributorId: scope.distributorId, firmId: scope.firmId }); const response = await secureFetch(`${API_URL}/sales-services/${voucher._id}?${query}`, { method: "DELETE" }), result = await response.json(); if (!response.ok) throw new Error(result.message); await loadList(); } catch (error) { alert(error.message); } };

  if (isFormOpen && showServiceMaster) return <ServiceMaster isFormOpen onOpenForm={() => setShowServiceMaster(true)} onCloseForm={() => setShowServiceMaster(false)} onSaved={loadLookups} />;

  if (!isFormOpen) return <div className="erp-transaction-list-page ts-sales-list-page sales-service-list"><div className="ts-sales-page-header"><div><h1>Sales Service List</h1><p>Review and manage customer service vouchers.</p></div><div className="ts-sales-page-actions"><button type="button" className="ts-btn primary" onClick={add}><Plus size={16} />New Sales Service</button></div></div><div className="ts-filter-launch-row ts-reference-list-toolbar"><div className="ts-reference-list-search"><Search size={15} /><input placeholder="Search voucher or party..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div></div><div className="sales-billing-table-card"><div className="sales-billing-table-scroll"><table className="sales-billing-table sales-service-list-table"><thead><tr><th className="serial-column">S.No</th><th>Voucher Date</th><th>Voucher No.</th><th>Party Code</th><th className="party-column">Party Name</th><th className="amount-column">Total</th><th className="amount-column">GST</th><th className="amount-column">Net Amount</th><th className="actions-column">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="9" className="sales-billing-empty">Loading Sales Service records...</td></tr> : vouchers.length ? vouchers.map((voucher, index) => <tr key={voucher._id}><td className="serial-column">{(page - 1) * 20 + index + 1}</td><td className="nowrap">{voucher.voucherDate}</td><td className="bill-number-cell">{voucher.voucherSeries}-{voucher.voucherNo}</td><td>{voucher.partyCode}</td><td className="party-column"><strong>{voucher.partyName}</strong></td><td className="amount-column">{asMoney(voucher.totalAmount)}</td><td className="amount-column">{asMoney(voucher.gstAmount)}</td><td className="amount-column"><strong>{asMoney(voucher.netAmount)}</strong></td><td className="actions-column"><div className="sales-billing-row-actions"><button type="button" className="edit" title="Edit Sales Service" onClick={() => edit(voucher)}><Pencil size={15} /></button><button type="button" className="delete" title="Delete Sales Service" onClick={() => remove(voucher)}><Trash2 size={15} /></button></div></td></tr>) : <tr><td colSpan="9" className="sales-billing-empty"><ClipboardList size={28} /><strong>No Sales Service vouchers found</strong><span>Create your first service voucher to get started.</span></td></tr>}</tbody></table></div><Pager page={page} pages={pages} total={total} onChange={setPage} /></div></div>;

  return <div className="sales-billing-page sales-service-form"><div className="sales-billing-card">
    <div className="sales-billing-page-header"><div className="sales-billing-title-wrapper"><h2 className="sales-billing-title">Sales Service</h2><span className="sales-billing-status-badge">{editingId ? "Editing Voucher" : "New Voucher"}</span></div><div className="sales-billing-header-actions"><button type="button" className="billing-action-button billing-preview-button"><Eye size={14} />Preview</button><button type="submit" form="sales-service-voucher-form" className="billing-action-button billing-save-button" disabled={saving}><Save size={14} />{saving ? "Saving..." : editingId ? "Update" : "Save"}</button><button type="submit" form="sales-service-voucher-form" className="billing-action-button billing-save-print-button" disabled={saving}><Save size={14} />{saving ? "Saving..." : editingId ? "Update Service" : "Save Service"}</button><button type="button" className="billing-more-button" aria-label="More actions"><MoreVertical size={17} /></button><button type="button" className="billing-close-button" onClick={close} aria-label="Close Sales Service"><X size={18} /></button></div></div>
    <form id="sales-service-voucher-form" onSubmit={save}>
    <section className="billing-form-section billing-header-section service-voucher-header-section"><div className="billing-section-heading"><div className="billing-section-title"><h3>Service Header</h3></div><div className="billing-header-information"><span>Voucher No: <strong>{form.voucherNo === "Auto" ? "Auto" : `${form.voucherSeries}-${form.voucherNo}`}</strong></span><span className="billing-info-divider" /><span>Type: <strong>Sales Service</strong></span></div></div><div className="billing-header-fields service-header-fields">
      <div className="billing-field"><label>Voucher Date <span>*</span></label><input className="billing-control" type="date" value={form.voucherDate} onChange={(e) => setForm({ ...form, voucherDate: e.target.value })} required /></div>
      <div className="billing-field"><label>From Date</label><input className="billing-control" type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} /></div>
      <div className="billing-field"><label>To Date</label><input className="billing-control" type="date" min={form.fromDate} value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></div>
      <div className="billing-field"><label>Voucher Series</label><input className="billing-control" value={form.voucherSeries} onChange={(e) => setForm({ ...form, voucherSeries: e.target.value.toUpperCase(), voucherNo: "" })} placeholder="Enter series" readOnly={!!editingId} /></div>
      <div className="billing-field"><label>Voucher No.</label><input className="billing-control billing-readonly-control" value={form.voucherNo} placeholder="Loading..." readOnly /></div>
      <div className="billing-field service-party-field"><label>Party <span>*</span></label><select className="billing-control" value={form.partyId} onChange={(e) => changeParty(e.target.value)} required><option value="">Select Party</option>{parties.map((party) => <option key={party._id} value={party._id}>{party.accountCode} - {party.accountName}</option>)}</select></div>
      <div className="billing-field service-narration-field"><label>Narration</label><input className="billing-control" value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} placeholder="Enter narration" /></div>
    </div></section>
    <section className="billing-form-section billing-product-section voucher-lines"><div className="billing-product-heading"><div className="billing-section-title"><span className="billing-section-number" /><h3>Service Entry</h3></div><div className="billing-product-toolbar"><button type="button" className="billing-toolbar-button" onClick={() => setShowServiceMaster(true)}><Plus size={14} />Add Service</button></div></div><div className="billing-product-table-shell"><div className="billing-product-table-scroll"><table className="billing-product-table service-voucher-table"><thead><tr><th className="billing-sticky-left">#</th><th>Service Code</th><th>Service Name</th><th>Amount</th><th>GST %</th><th>GST Amount</th><th>IGST</th><th>CGST</th><th>SGST</th><th className="billing-sticky-right">Action</th></tr></thead><tbody>{items.map((row, index) => <tr key={index}><td className="billing-sticky-left">{index + 1}</td><td><input className="billing-table-control service-code-control" value={row.serviceCode} placeholder="Code" readOnly /></td><td className="service-name service-search-cell"><input className="billing-table-control billing-product-search service-search-control" value={row.serviceSearch ?? row.serviceName ?? ""} placeholder="Search service" autoComplete="off" onFocus={() => setServiceDropdownIndex(index)} onBlur={() => window.setTimeout(() => setServiceDropdownIndex((current) => current === index ? -1 : current), 150)} onChange={(e) => { searchService(index, e.target.value); setServiceDropdownIndex(index); }} onKeyDown={(e) => { if (e.key === "Escape") setServiceDropdownIndex(-1); if (e.key === "Enter" && serviceDropdownIndex === index) { const match = matchingServices(row.serviceSearch ?? row.serviceName)[0]; if (match) { e.preventDefault(); chooseService(index, match._id); } } }} />{serviceDropdownIndex === index && <div className="service-selection-dropdown">{matchingServices(row.serviceSearch ?? row.serviceName).length ? matchingServices(row.serviceSearch ?? row.serviceName).map((service) => <button key={service._id} type="button" className={service._id === row.serviceId ? "is-selected" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => chooseService(index, service._id)}><span className="service-selection-code">{service.serviceCode}</span><strong>{service.serviceName}</strong><span className="service-selection-gst">GST {asMoney(service.gstPercent)}%</span></button>) : <div className="service-selection-empty">No matching services</div>}</div>}</td><td><input className="billing-table-control billing-numeric-control" type="number" min="0" step="0.01" value={row.amount} onChange={(e) => changeAmount(index, e.target.value)} /></td><td><input className="billing-table-control billing-numeric-control billing-calculated-control" value={asMoney(row.gstPercent)} readOnly /></td><td><input className="billing-table-control billing-numeric-control billing-calculated-control" value={asMoney(row.gstAmount)} readOnly /></td><td><input className="billing-table-control billing-numeric-control billing-calculated-control" value={asMoney(row.igstAmount)} readOnly /></td><td><input className="billing-table-control billing-numeric-control billing-calculated-control" value={asMoney(row.cgstAmount)} readOnly /></td><td><input className="billing-table-control billing-numeric-control billing-calculated-control" value={asMoney(row.sgstAmount)} readOnly /></td><td className="billing-sticky-right"><button type="button" className="billing-delete-row-button service-delete-row-button" title="Delete row" aria-label={`Delete service row ${index + 1}`} disabled={items.length === 1} onClick={() => { setItems(items.filter((_, rowIndex) => rowIndex !== index)); setServiceDropdownIndex(-1); }}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div><div className="billing-grid-footer"><div className="billing-grid-footer-actions"><button type="button" className="billing-grid-small-button" onClick={() => setItems([...items, emptyRow()])}><Plus size={14} /> Add Row</button><button type="button" className="billing-grid-small-button billing-clear-all-button" onClick={() => { setItems([emptyRow()]); setServiceDropdownIndex(-1); }}>Clear All</button></div><div className="service-grid-hint">Search by service name or code, then select a result</div><div className="billing-grid-totals"><span>Total Items: <strong>{items.filter((row) => row.serviceId).length}</strong></span><span>Total Amount: <strong>₹ {asMoney(totals.totalAmount)}</strong></span></div></div></div></section>
    <section className="billing-compact-summary service-compact-summary"><div className="billing-compact-summary-header"><div className="billing-section-title"><span className="billing-section-number" /><h3>Service Summary</h3></div><div className="billing-summary-words"><span>Net Payable:</span><strong>₹ {asMoney(totals.netAmount)}</strong></div></div><div className="billing-summary-values service-summary-values">
      <div className="billing-summary-item"><span>Gross</span><strong>₹{asMoney(totals.totalAmount)}</strong></div>
      <div className="billing-summary-item"><span>Taxable</span><strong>₹{asMoney(totals.totalAmount)}</strong></div>
      <div className="billing-summary-item"><span>CGST</span><strong>₹{asMoney(totals.cgstAmount)}</strong></div>
      <div className="billing-summary-item"><span>SGST</span><strong>₹{asMoney(totals.sgstAmount)}</strong></div>
      <div className="billing-summary-item"><span>IGST</span><strong>₹{asMoney(totals.igstAmount)}</strong></div>
      <div className="billing-summary-item"><span>Total GST</span><strong>₹{asMoney(totals.gstAmount)}</strong></div>
      <div className="billing-summary-item service-summary-editable"><span>Add Amount</span><div className="billing-summary-input-wrap"><span>₹</span><input type="number" min="0" step="0.01" value={form.addAmount} onChange={(e) => setForm({ ...form, addAmount: e.target.value })} /></div></div>
      <div className="billing-summary-item billing-summary-minus service-summary-editable"><span>Less Amount</span><div className="billing-summary-input-wrap"><span>₹</span><input type="number" min="0" step="0.01" value={form.lessAmount} onChange={(e) => setForm({ ...form, lessAmount: e.target.value })} /></div></div>
      <div className="billing-summary-item billing-summary-net"><span>Net Payable</span><strong>₹{asMoney(totals.netAmount)}</strong></div>
    </div></section>
    <section className="billing-compact-summary service-statutory-section"><div className="billing-compact-summary-header"><div className="billing-section-title"><span className="billing-section-number" /><h3>Statutory Details</h3></div></div><div className="service-statutory-grid">
      <div className="billing-field"><label>Ack No.</label><input className="billing-control" value={form.acknowledgementNo} onChange={(e) => setForm({ ...form, acknowledgementNo: e.target.value })} placeholder="Enter ack no." /></div>
      <div className="billing-field"><label>E-way Bill No.</label><input className="billing-control" value={form.ewayBillNo} onChange={(e) => setForm({ ...form, ewayBillNo: e.target.value })} placeholder="Enter e-way bill no." /></div>
      <div className="billing-field service-irn-field"><label>IRN No.</label><input className="billing-control" value={form.irnNo} onChange={(e) => setForm({ ...form, irnNo: e.target.value })} placeholder="Enter IRN" /></div>
      <div className="billing-field"><label>Ack Date</label><input className="billing-control" type="date" value={form.acknowledgementDate} onChange={(e) => setForm({ ...form, acknowledgementDate: e.target.value })} /></div>
    </div></section>
  </form></div></div>;
}
