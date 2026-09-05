import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Pencil, Plus, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import { API_URL } from "./api/config";
import { secureFetch } from "./SecuritySetup";
import "./StockManagement.css";

const today = () => new Date().toISOString().slice(0, 10);
const requestId = () => globalThis.crypto?.randomUUID?.() || `stock-${Date.now()}-${Math.random()}`;
const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const text = (value) => String(value ?? "").trim();
const productCode = (row) => text(row?.code || row?.productCode || row?.ProdCode);
const productName = (row) => text(row?.name || row?.productName || row?.ProdName);
const companyValues = (row) => [row?._id, row?.id, row?.code, row?.companyCode, row?.name, row?.companyName].map((value) => text(value).toLowerCase()).filter(Boolean);
const productCompanyValues = (row) => [row?.companyId, row?.companyCode, row?.CompanyCode, row?.companyName, row?.CompanyName, row?.company].map((value) => text(value).toLowerCase()).filter(Boolean);

const createForm = () => ({
  requestId: requestId(), voucherDate: today(), voucherNo: "", godownCode: "", companyCode: "", narration: "",
  productCode: "", productName: "", unit: "PCS", batch: ".", manufacturingDate: "",
  expiryDate: "", mrp: "", purchaseRate: "", salesRate: "", quantity: "", freeQuantity: "",
  boxPack: "1", inBoxPack: "1",
});

const formatDate = (value) => {
  const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : text(value) || "-";
};

export default function StockManagement({ mode, view = "list", products = [], godowns = [], companies = [], onOpenForm, onCloseForm }) {
  const isDamageStock = mode === "DAMAGE_IN" || mode === "DAMAGE_OUT";
  const isStockIn = mode === "IN" || mode === "DAMAGE_IN";
  const title = ({
    IN: "Stock In",
    OUT: "Stock Out",
    DAMAGE_IN: "Self Damage (Godown Damage)",
    DAMAGE_OUT: "Damage Stock Out",
  })[mode] || "Stock";
  const stockDescription = isDamageStock ? "damaged stock" : "saleable stock";
  const productInputRef = useRef(null);
  const internalOpenRef = useRef(false);
  const [form, setForm] = useState(createForm);
  const [searchText, setSearchText] = useState("");
  const [showProducts, setShowProducts] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [batchCache, setBatchCache] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [newBatch, setNewBatch] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchProduct, setBatchProduct] = useState(null);
  const [batchMode, setBatchMode] = useState("existing");
  const [saving, setSaving] = useState(false);
  const [adjustments, setAdjustments] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [entryMode, setEntryMode] = useState("create");
  const [editingAdjustment, setEditingAdjustment] = useState(null);
  const [deletingId, setDeletingId] = useState("");

  const selectedGodown = godowns.find((row) => text(row.code || row.godownCode) === form.godownCode);
  const selectedCompany = companies.find((row) => text(row.code || row.companyCode) === form.companyCode);
  const selectedCompanyKeys = companyValues(selectedCompany);

  const companyProducts = useMemo(() => products.filter((product) => {
    if (!form.companyCode || selectedCompanyKeys.length === 0) return true;
    return productCompanyValues(product).some((value) => selectedCompanyKeys.includes(value));
  }), [products, form.companyCode, selectedCompanyKeys.join("|")]);

  const matchedProducts = useMemo(() => {
    const query = searchText.toLowerCase().trim();
    return companyProducts.filter((product) => !query || productCode(product).toLowerCase().includes(query) || productName(product).toLowerCase().includes(query)).slice(0, 40);
  }, [companyProducts, searchText]);

  useEffect(() => {
    setForm((previous) => ({ ...createForm(), godownCode: previous.godownCode || text(godowns[0]?.code || godowns[0]?.godownCode) }));
    setSearchText("");
    setBatchCache({});
    setSelectedBatch(null);
    setNewBatch(false);
    setEntryMode("create");
    setEditingAdjustment(null);
  }, [mode]);

  useEffect(() => {
    if (view !== "form") return;
    if (internalOpenRef.current) {
      internalOpenRef.current = false;
      return;
    }

    setForm((previous) => ({ ...createForm(), godownCode: previous.godownCode, companyCode: previous.companyCode }));
    setSearchText("");
    setSelectedBatch(null);
    setNewBatch(false);
    setEntryMode("create");
    setEditingAdjustment(null);
  }, [view]);

  useEffect(() => {
    if (form.godownCode || godowns.length === 0) return;
    setForm((previous) => ({ ...previous, godownCode: text(godowns[0]?.code || godowns[0]?.godownCode) }));
  }, [godowns, form.godownCode]);

  const loadAdjustmentList = async () => {
    setListLoading(true);
    try {
      const query = new URLSearchParams({ distributorId: localStorage.getItem("distributorId") || "", firmId: localStorage.getItem("firmId") || "", adjustmentType: mode });
      const response = await secureFetch(`${API_URL}/stock/adjustments?${query}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to load stock entries.");
      setAdjustments(Array.isArray(result.adjustments) ? result.adjustments : []);
    } catch (error) {
      setAdjustments([]);
      alert(error.message);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (view === "list") loadAdjustmentList();
  }, [view, mode]);

  useEffect(() => {
    if (!showProducts) return;
    const closeDropdown = () => setShowProducts(false);
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeDropdown();
    };
    document.addEventListener("mousedown", closeDropdown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeDropdown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showProducts]);

  useEffect(() => {
    if (!showProducts || !form.godownCode || matchedProducts.length === 0) return;
    let cancelled = false;
    const missing = matchedProducts.filter((product) => !batchCache[`${form.godownCode}_${productCode(product)}`]);
    if (missing.length === 0) return;

    const load = async () => {
      setLoadingProducts(true);
      const loaded = await Promise.all(missing.map(async (product) => {
        const code = productCode(product);
        try {
          const query = new URLSearchParams({ distributorId: localStorage.getItem("distributorId") || "", firmId: localStorage.getItem("firmId") || "", gdCode: form.godownCode, prodCode: code, stockType: isDamageStock ? "DAMAGE" : "SALEABLE" });
          const response = await secureFetch(`${API_URL}/stock/batches?${query}`);
          const result = await response.json();
          return [`${form.godownCode}_${code}`, response.ok && Array.isArray(result.batches) ? result.batches : []];
        } catch {
          return [`${form.godownCode}_${code}`, []];
        }
      }));
      if (!cancelled) {
        setBatchCache((previous) => ({ ...previous, ...Object.fromEntries(loaded) }));
        setLoadingProducts(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [showProducts, form.godownCode, matchedProducts, batchCache, isDamageStock]);

  const dropdownRows = useMemo(() => matchedProducts.flatMap((product) => {
    const batches = batchCache[`${form.godownCode}_${productCode(product)}`] || [];
    const existing = batches.map((batch) => ({ product, batch, isNew: false }));
    return isStockIn ? [{ product, batch: null, isNew: true }, ...existing] : existing;
  }), [matchedProducts, batchCache, form.godownCode, isStockIn]);

  const openProductSearch = () => {
    if (!form.godownCode) {
      alert("Please select a godown first.");
      return;
    }
    const rect = productInputRef.current?.getBoundingClientRect();
    if (rect) setDropdownPosition({ top: rect.bottom + 4, left: rect.left });
    setDropdownIndex(0);
    setShowProducts(true);
  };

  const chooseProduct = (product, batch, isNew) => {
    const code = productCode(product);
    const name = productName(product);
    setSelectedBatch(batch);
    setNewBatch(isNew);
    setSearchText(code);
    setForm((previous) => ({
      ...previous, productCode: code, productName: name,
      unit: text(product.basicUnit || product.BasicUnit || "PCS"),
      batch: text(batch?.batch || batch?.batchNo) || ".",
      manufacturingDate: text(batch?.mfgDate).slice(0, 10), expiryDate: text(batch?.expDate).slice(0, 10),
      mrp: String(batch?.mrp ?? product.mrp ?? product.MRP ?? ""),
      purchaseRate: String(batch?.purchaseRate ?? product.purchaseRate ?? product.PRate ?? product.Rate_Per_Unit ?? ""),
      salesRate: String(batch?.salesRate ?? batch?.sRate ?? product.salesRate ?? product.SRate ?? product.Rate_Per_Unit ?? ""),
      boxPack: String(batch?.boxPack ?? product.boxPack ?? product.BoxPack ?? 1),
      inBoxPack: String(batch?.inboxPack ?? product.inboxPack ?? product.InBoxPack ?? 1),
    }));
    setShowProducts(false);
    setShowBatchModal(false);
    setDropdownIndex(0);
  };

  const openBatchModalForProduct = (product, requestedMode = "") => {
    const batches = batchCache[`${form.godownCode}_${productCode(product)}`] || [];
    const initialMode = requestedMode || (batches.length > 0 || !isStockIn ? "existing" : "new");
    setBatchProduct(product);
    setBatchMode(initialMode);
    chooseProduct(product, null, initialMode === "new");
    setShowBatchModal(true);
  };

  const batchModalRows = batchProduct
    ? batchCache[`${form.godownCode}_${productCode(batchProduct)}`] || []
    : [];

  const handleProductKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setShowProducts(true);
      setDropdownIndex((previous) => Math.min(previous + 1, Math.max(dropdownRows.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setDropdownIndex((previous) => Math.max(previous - 1, 0));
    } else if (event.key === "Enter" && showProducts && dropdownRows[dropdownIndex]) {
      event.preventDefault();
      const row = dropdownRows[dropdownIndex];
      openBatchModalForProduct(row.product, row.isNew && isStockIn ? "new" : "existing");
    } else if (event.key === "Escape") {
      setShowProducts(false);
    }
  };

  const update = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  const quantity = num(form.quantity);
  const freeQuantity = num(form.freeQuantity);
  const totalQuantity = quantity + freeQuantity;
  const currentStock = num(selectedBatch?.stockQty ?? selectedBatch?.qty);
  const editingSameStockKey = Boolean(
    editingAdjustment &&
    text(editingAdjustment.GDCode) === form.godownCode &&
    text(editingAdjustment.ProdCode) === form.productCode &&
    (text(editingAdjustment.Batch) || ".") === (text(form.batch) || ".") &&
    num(editingAdjustment.MRP) === num(form.mrp)
  );
  const availableStock = currentStock + (
    !isStockIn && editingSameStockKey ? num(editingAdjustment?.TotalQty) : 0
  );
  const grossAmount = quantity * num(form.purchaseRate);

  const resetForm = () => {
    setForm((previous) => ({ ...createForm(), godownCode: previous.godownCode, companyCode: previous.companyCode }));
    setSearchText("");
    setSelectedBatch(null);
    setNewBatch(false);
  };

  const openCreateForm = () => {
    resetForm();
    setEntryMode("create");
    setEditingAdjustment(null);
    internalOpenRef.current = true;
    onOpenForm?.();
  };

  const openAdjustment = (row, nextMode) => {
    setForm({
      ...createForm(),
      requestId: text(row.RequestId) || requestId(),
      voucherDate: text(row.VoucherDate).slice(0, 10) || today(),
      voucherNo: text(row.VoucherNo),
      godownCode: text(row.GDCode),
      companyCode: text(row.CompanyCode),
      narration: text(row.Narration),
      productCode: text(row.ProdCode),
      productName: text(row.ProductName),
      unit: text(row.Unit) || "PCS",
      batch: text(row.Batch) || ".",
      manufacturingDate: text(row.MfgDate),
      expiryDate: text(row.ExpiryDate),
      mrp: String(row.MRP ?? ""),
      purchaseRate: String(row.PRate ?? ""),
      salesRate: String(row.SRate ?? ""),
      quantity: String(row.Qty ?? ""),
      freeQuantity: String(row.FreeQty ?? ""),
      boxPack: String(row.BoxPack ?? 1),
      inBoxPack: String(row.InBoxPack ?? 1),
    });
    setSearchText(text(row.ProdCode));
    setSelectedBatch({
      batch: text(row.Batch) || ".",
      mrp: num(row.MRP),
      purchaseRate: num(row.PRate),
      salesRate: num(row.SRate),
      stockQty: num(row.BalanceAfter),
    });
    setNewBatch(isStockIn);
    setEditingAdjustment(row);
    setEntryMode(nextMode);
    setShowProducts(false);
    setShowBatchModal(false);
    internalOpenRef.current = true;
    onOpenForm?.();
  };

  const save = async () => {
    if (!form.godownCode || !form.productCode || totalQuantity <= 0) return alert("Select a godown and product, then enter Qty or Free Qty.");
    if (!isStockIn && !selectedBatch) return alert("Select an existing product batch for Stock Out.");
    if (!isStockIn && entryMode === "create" && totalQuantity > availableStock) return alert(`Only ${availableStock} ${isDamageStock ? "damaged" : "saleable"} units are available in the selected batch.`);

    setSaving(true);
    try {
      const payload = { ...form, adjustmentType: mode, distributorId: localStorage.getItem("distributorId") || "", firmId: localStorage.getItem("firmId") || "", firmName: localStorage.getItem("firmName") || "", gdCode: form.godownCode, prodCode: form.productCode, godownName: text(selectedGodown?.name || selectedGodown?.godownName || editingAdjustment?.GodownName), quantity, freeQuantity, mrp: num(form.mrp), purchaseRate: num(form.purchaseRate), salesRate: num(form.salesRate) };
      const isEditing = entryMode === "edit" && editingAdjustment?._id;
      const response = await secureFetch(isEditing ? `${API_URL}/stock/adjustments/${editingAdjustment._id}` : `${API_URL}/stock/adjust`, {
        method: isEditing ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Stock could not be saved.");
      alert(`${result.message} New balance: ${num(result.stock?.quantity)}.`);
      resetForm();
      setEntryMode("create");
      setEditingAdjustment(null);
      onCloseForm?.();
    } catch (error) {
      alert(error.message || "Stock could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAdjustment = async (row) => {
    const entryId = text(row?._id);
    if (!entryId || !window.confirm(`Delete ${row.VoucherNo || "this stock entry"}? The stock balance will be reversed.`)) return;

    setDeletingId(entryId);
    try {
      const response = await secureFetch(`${API_URL}/stock/adjustments/${entryId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distributorId: localStorage.getItem("distributorId") || "",
          firmId: localStorage.getItem("firmId") || "",
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Stock adjustment could not be deleted.");
      alert(result.message);
      await loadAdjustmentList();
    } catch (error) {
      alert(error.message || "Stock adjustment could not be deleted.");
    } finally {
      setDeletingId("");
    }
  };

  const filteredAdjustments = adjustments.filter((row) => {
    const query = listSearch.toLowerCase().trim();
    return !query || [row.VoucherNo, row.ProdCode, row.ProductName, row.Batch, row.GodownName, row.Narration].some((value) => text(value).toLowerCase().includes(query));
  });

  if (view === "list") {
    return (
      <div className="erp-transaction-list-page ts-sales-list-page is-sales stock-adjustment-list-page">
        <div className="ts-sales-page-header">
          <div>
            <h1>{title} List</h1>
            <p>Manage all {stockDescription} {isStockIn ? "inward" : "outward"} entries</p>
          </div>

          <div className="ts-sales-page-actions">
            <button type="button" className="ts-btn" onClick={loadAdjustmentList} disabled={listLoading}>
              <RefreshCw size={15} />
              Refresh
            </button>
            <button type="button" className="ts-btn primary" onClick={openCreateForm}>
              <Plus size={16} />
              New {title}
            </button>
          </div>
        </div>

        <div className="ts-filter-launch-row ts-reference-list-toolbar stock-list-toolbar">
          <div className="ts-reference-list-search stock-list-search">
            <Search size={15} />
            <input
              type="text"
              value={listSearch}
              onChange={(event) => setListSearch(event.target.value)}
              placeholder="Search voucher, product, batch..."
            />
          </div>
          <span className="stock-list-count">{filteredAdjustments.length} entries</span>
        </div>

        <div className="ts-grid-card">
          <div className="ts-grid-scroll">
            <table className="ts-sales-grid stock-list-table">
              <thead>
                <tr>
                  <th className="ts-sr-column">SrNo</th>
                  <th className="ts-date-column">Date</th>
                  <th>Voucher No.</th>
                  <th>Godown</th>
                  <th>Item Code</th>
                  <th className="stock-item-name-column">Item Name</th>
                  <th>Batch</th>
                  <th className="number-col">Qty</th>
                  <th className="number-col">Free</th>
                  <th className="number-col">Total</th>
                  <th className="number-col">Balance</th>
                  <th className="stock-narration-column">Narration</th>
                  <th className="actions-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr><td colSpan="13" className="ts-empty-row stock-list-empty"><RefreshCw size={24} /><strong>Loading {title} entries...</strong></td></tr>
                ) : filteredAdjustments.length === 0 ? (
                  <tr><td colSpan="13" className="ts-empty-row stock-list-empty"><strong>No {title} entries found</strong><span>Change the search or create a new record.</span></td></tr>
                ) : filteredAdjustments.map((row, index) => (
                  <tr key={row._id || row.RequestId}>
                    <td className="ts-sr-column">{index + 1}</td>
                    <td className="nowrap ts-date-column">{formatDate(row.VoucherDate)}</td>
                    <td><strong className="ts-invoice-link">{row.VoucherNo}</strong></td>
                    <td>{row.GodownName || row.GDCode}</td>
                    <td>{row.ProdCode}</td>
                    <td title={row.ProductName}>{row.ProductName}</td>
                    <td>{row.Batch || "."}</td>
                    <td className="number-col">{num(row.Qty).toFixed(2)}</td>
                    <td className="number-col">{num(row.FreeQty).toFixed(2)}</td>
                    <td className="number-col">{num(row.TotalQty).toFixed(2)}</td>
                    <td className="number-col">{num(row.BalanceAfter).toFixed(2)}</td>
                    <td title={row.Narration || "-"}>{row.Narration || "-"}</td>
                    <td className="actions-col">
                      <div className="ts-row-actions">
                        <button type="button" className="view" title={`View ${title}`} onClick={() => openAdjustment(row, "view")}><Eye size={15} /></button>
                        <button type="button" className="edit" title={`Edit ${title}`} onClick={() => openAdjustment(row, "edit")}><Pencil size={15} /></button>
                        <button type="button" className="delete" title={`Delete ${title}`} disabled={deletingId === text(row._id)} onClick={() => deleteAdjustment(row)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ts-grid-footer">
            <div>Showing <strong>{filteredAdjustments.length}</strong> of <strong>{adjustments.length}</strong> entries</div>
          </div>
        </div>
      </div>
    );
  }

  const isReadOnly = entryMode === "view";
  const entryTitle = entryMode === "view" ? `View ${title}` : entryMode === "edit" ? `Edit ${title}` : `Add ${title}`;
  const entryBadge = entryMode === "view" ? "View Only" : entryMode === "edit" ? "Edit Entry" : "New Entry";

  return (
    <div className="sales-billing-page stock-adjustment-page"><div className="sales-billing-card">
      <div className="sales-billing-page-header"><div className="sales-billing-title-wrapper"><div><h2 className="sales-billing-title">{entryTitle}</h2></div><span className="sales-billing-status-badge">{entryBadge}</span></div><div className="sales-billing-header-actions">{!isReadOnly && <button type="button" className="billing-action-button billing-save-button" onClick={save} disabled={saving}><Save size={15} />{saving ? "Saving..." : entryMode === "edit" ? "Update" : "Save"}</button>}<button type="button" className="billing-close-button" onClick={onCloseForm} aria-label="Close"><X size={18} /></button></div></div>

      <section className="billing-form-section billing-header-section"><div className="billing-section-heading"><div className="billing-section-title"><h3>Stock Header</h3></div><div className="billing-header-information"><span>Type: <strong>{title}</strong></span></div></div><div className="billing-header-fields stock-header-fields">
        <div className="billing-field"><label>Voucher Date <span>*</span></label><input className="billing-control" type="date" value={form.voucherDate} readOnly={isReadOnly} onChange={(event) => update("voucherDate", event.target.value)} /></div>
        <div className="billing-field"><label>Voucher No.</label><input className="billing-control billing-readonly-control" value={form.voucherNo || "Auto"} readOnly /></div>
        <div className="billing-field"><label>Godown <span>*</span></label><select className="billing-control" value={form.godownCode} disabled={isReadOnly} onChange={(event) => { update("godownCode", event.target.value); setBatchCache({}); setSelectedBatch(null); }}><option value="">Select</option>{godowns.map((row) => <option key={row.id || row._id || row.code} value={row.code || row.godownCode}>{row.name || row.godownName}</option>)}</select></div>
        <div className="billing-field"><label>Company</label><select className="billing-control" value={form.companyCode} disabled={isReadOnly} onChange={(event) => { update("companyCode", event.target.value); setSearchText(""); setSelectedBatch(null); }}><option value="">All Companies</option>{companies.map((row) => <option key={row.id || row._id || row.code} value={row.code || row.companyCode}>{row.name || row.companyName}</option>)}</select></div>
        <div className="billing-field stock-narration-field"><label>Narration</label><input className="billing-control" value={form.narration} readOnly={isReadOnly} onChange={(event) => update("narration", event.target.value)} placeholder="Reason for adjustment" /></div>
      </div></section>

      <section className="billing-form-section billing-product-section"><div className="billing-product-heading"><div className="billing-section-title"><span className="billing-section-number"></span><h3>Product Entry</h3></div></div><div className="billing-product-table-shell"><div className="billing-product-table-scroll stock-entry-scroll"><table className="billing-product-table stock-entry-table"><thead><tr><th>#</th><th>Product</th><th>Item Name</th><th>Units</th><th>Qty</th><th>Free</th><th>Rate</th><th>Gross Amt</th></tr></thead><tbody><tr>
        <td>1</td><td className="billing-product-search-cell"><input ref={productInputRef} className="billing-table-control billing-product-search" value={searchText} placeholder="Type code/name" readOnly={isReadOnly} onFocus={() => { if (!isReadOnly) openProductSearch(); }} onKeyDown={(event) => { if (!isReadOnly) handleProductKeyDown(event); }} onChange={(event) => { setSearchText(event.target.value); update("productCode", ""); setDropdownIndex(0); openProductSearch(); }} /></td>
        <td><input className="billing-table-control billing-calculated-control" value={form.productName} readOnly /></td><td><input className="billing-table-control billing-calculated-control" value={form.unit} readOnly /></td>
        <td><input className="billing-table-control billing-numeric-control" type="number" min="0" step="any" value={form.quantity} readOnly={isReadOnly} onChange={(event) => update("quantity", event.target.value)} /></td><td><input className="billing-table-control billing-numeric-control" type="number" min="0" step="any" value={form.freeQuantity} readOnly={isReadOnly} onChange={(event) => update("freeQuantity", event.target.value)} /></td>
        <td><input className="billing-table-control billing-numeric-control" type="number" min="0" step="any" value={form.purchaseRate} readOnly={isReadOnly || !newBatch} onChange={(event) => update("purchaseRate", event.target.value)} /></td><td><input className="billing-table-control billing-numeric-control billing-calculated-control billing-row-amount" value={grossAmount.toFixed(2)} readOnly /></td>
      </tr></tbody></table></div><div className="billing-grid-footer"><div className="stock-selected-batch"><span>Batch: <strong>{form.productCode ? form.batch || "." : "-"}</strong></span><span>MRP: <strong>{form.productCode ? num(form.mrp).toFixed(2) : "-"}</strong></span><span>Current Stock: <strong>{form.productCode ? currentStock.toFixed(2) : "-"}</strong></span></div><div className="billing-grid-totals"><span>Total Qty: <strong>{totalQuantity.toFixed(2)}</strong></span></div></div></div>
      </section>
      <section className="stock-value-footer"><div><span>Stock Value as per MRP</span><strong>{(totalQuantity * num(form.mrp)).toFixed(2)}</strong></div><div><span>Stock Value as per Purchase Rate</span><strong>{(totalQuantity * num(form.purchaseRate)).toFixed(2)}</strong></div><div><span>Stock Value as per Sales Rate</span><strong>{(totalQuantity * num(form.salesRate)).toFixed(2)}</strong></div></section>
    </div>

    {showProducts && createPortal(<div className="billing-product-dropdown stock-product-dropdown" style={{ top: dropdownPosition.top, left: dropdownPosition.left }} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}><div className="billing-product-dropdown-header"><span>Code</span><span>Product</span><span>Batch</span><span>MRP</span><span>Rate</span><span>Stock</span></div>{loadingProducts && dropdownRows.length === 0 ? <div className="stock-dropdown-empty">Loading products and batches...</div> : dropdownRows.length === 0 ? <div className="stock-dropdown-empty">No matching stock batch found.</div> : dropdownRows.map(({ product, batch, isNew }, index) => <div key={`${productCode(product)}-${batch?.batch || "new"}-${batch?.mrp || 0}-${index}`} className={`billing-product-dropdown-row ${dropdownIndex === index ? "is-active" : ""}`} onMouseEnter={() => setDropdownIndex(index)} onMouseDown={(event) => { event.preventDefault(); openBatchModalForProduct(product, isNew && isStockIn ? "new" : "existing"); }}><span className="billing-product-code">{productCode(product)}</span><span>{productName(product)}</span><span>{isNew ? "+ New Batch" : batch?.batch || batch?.batchNo || "."}</span><span>{num(batch?.mrp ?? product.mrp).toFixed(2)}</span><span>{num(batch?.purchaseRate ?? product.purchaseRate ?? product.Rate_Per_Unit).toFixed(2)}</span><span>{isNew ? "-" : num(batch?.stockQty).toFixed(2)}</span></div>)}</div>, document.body)}

    {showBatchModal && batchProduct && createPortal(
      <div className="stock-batch-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowBatchModal(false); }}>
        <div className="stock-batch-modal" role="dialog" aria-modal="true">
          <div className="stock-batch-modal-header"><div><h2>Batch Details</h2><p>{productCode(batchProduct)} - {productName(batchProduct)}</p></div><button type="button" onClick={() => setShowBatchModal(false)}><X size={18} /></button></div>
          <div className="stock-batch-tabs">
            <button type="button" className={batchMode === "existing" ? "active" : ""} onClick={() => { setBatchMode("existing"); chooseProduct(batchProduct, null, false); setShowBatchModal(true); }}>Existing Batch</button>
            {isStockIn && <button type="button" className={batchMode === "new" ? "active" : ""} onClick={() => { setBatchMode("new"); chooseProduct(batchProduct, null, true); setShowBatchModal(true); }}>New Batch</button>}
          </div>

          {batchMode === "existing" ? (
            <div className="stock-batch-table-wrap"><table className="stock-batch-table"><thead><tr><th>Batch</th><th>MRP</th><th>Expiry Date</th><th>Mfg Date</th><th>Stock</th><th>Sales Rate</th><th>Purchase Rate</th></tr></thead><tbody>
              {batchModalRows.length === 0 ? <tr><td colSpan="7" className="stock-batch-empty">No existing batch found.</td></tr> : batchModalRows.map((batch, index) => <tr key={`${batch.batch || batch.batchNo}-${batch.mrp}-${index}`} onDoubleClick={() => chooseProduct(batchProduct, batch, false)}><td><button type="button" className="stock-batch-select" onClick={() => chooseProduct(batchProduct, batch, false)}>{batch.batch || batch.batchNo || "."}</button></td><td>{num(batch.mrp).toFixed(2)}</td><td>{formatDate(batch.expDate)}</td><td>{formatDate(batch.mfgDate)}</td><td className="stock-number">{num(batch.stockQty).toFixed(2)}</td><td className="stock-number">{num(batch.salesRate ?? batch.sRate).toFixed(2)}</td><td className="stock-number">{num(batch.purchaseRate).toFixed(2)}</td></tr>)}
            </tbody></table></div>
          ) : (
            <div className="stock-modal-new-batch"><div className="billing-field"><label>Batch No. <span>*</span></label><input className="billing-control" value={form.batch} onChange={(event) => update("batch", event.target.value || ".")} /></div><div className="billing-field"><label>MRP</label><input className="billing-control" type="number" min="0" value={form.mrp} onChange={(event) => update("mrp", event.target.value)} /></div><div className="billing-field"><label>Purchase Rate</label><input className="billing-control" type="number" min="0" value={form.purchaseRate} onChange={(event) => update("purchaseRate", event.target.value)} /></div><div className="billing-field"><label>Sales Rate</label><input className="billing-control" type="number" min="0" value={form.salesRate} onChange={(event) => update("salesRate", event.target.value)} /></div><div className="billing-field"><label>Mfg. Date</label><input className="billing-control" type="date" value={form.manufacturingDate} onChange={(event) => update("manufacturingDate", event.target.value)} /></div><div className="billing-field"><label>Expiry Date</label><input className="billing-control" type="date" value={form.expiryDate} onChange={(event) => update("expiryDate", event.target.value)} /></div></div>
          )}

          <div className="stock-batch-modal-footer"><span>{batchMode === "existing" ? `${batchModalRows.length} batch(es) available` : "Enter the new batch information"}</span>{batchMode === "new" && <button type="button" className="billing-action-button billing-save-button" onClick={() => { setNewBatch(true); setSelectedBatch(null); setShowBatchModal(false); }}>OK</button>}<button type="button" className="billing-action-button billing-preview-button" onClick={() => setShowBatchModal(false)}>Cancel</button></div>
        </div>
      </div>, document.body
    )}
    </div>
  );
}
