import React, { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, Banknote, BellRing, Box, CalendarDays, ChevronRight, CreditCard, FileJson, FileText, IndianRupee, Landmark, LayoutDashboard, Package, QrCode, ReceiptText, ShoppingCart, Truck, Upload, Users, Wallet } from "lucide-react";
import { API_URL } from "./api/config";
import { businessDateIST } from "./utils/businessDate";
import { secureFetch } from "./SecuritySetup";
import { buildEInvoiceJson } from "./EInvoiceReport";
import upiCollectionIcon from "../assets/img/UPI.png";
import bankCollectionIcon from "../assets/img/BANK.png";
import cashCollectionIcon from "../assets/img/CASH.png";

const money = (value) => value == null ? "—" : `₹ ${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const integer = (value) => value == null ? "—" : Number(value).toLocaleString("en-IN");
const change = (current, previous) => Number(previous) > 0 ? ((Number(current) - Number(previous)) / Number(previous)) * 100 : null;
const dateLabel = (value) => new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const firstOfMonth = (date) => `${date.slice(0, 7)}-01`;
const weekStart = (date) => {
  const day = new Date(`${date}T00:00:00`);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
};
const shiftDate = (date, days) => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};
const collectionMethod = (receipt) => {
  if (String(receipt.chequeNo || "").trim()) return "cheque";
  const source = `${receipt.bankCashGroup || ""} ${receipt.bankCashName || ""} ${receipt.bankCash || ""}`.toLowerCase();
  if (/cheque|check/.test(source)) return "cheque";
  if (/upi|bhim|phonepe|google pay|gpay|paytm/.test(source)) return "upi";
  if (/bank|neft|rtgs|imps|online|transfer|card/.test(source)) return "bank";
  return "cash";
};

export default function DashboardHome({ userName, firmName, accountCount, itemCount, onQuickAction }) {
  const [date, setDate] = useState(businessDateIST);
  const [period, setPeriod] = useState("today");
  const [fromDate, setFromDate] = useState(firstOfMonth(businessDateIST()));
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [taskTab, setTaskTab] = useState("invoices");
  const [trendDays, setTrendDays] = useState("7");
  const [collectionPeriod, setCollectionPeriod] = useState("today");
  const [collectionDetail, setCollectionDetail] = useState("");
  const [savedJson, setSavedJson] = useState({});
  const [invoiceAction, setInvoiceAction] = useState("");
  const [invoiceMessage, setInvoiceMessage] = useState("");
  const periodStart = period === "today" ? date : period === "week" ? weekStart(date) : period === "month" ? firstOfMonth(date) : fromDate;
  useEffect(() => {
    let cancelled = false;
    secureFetch(`${API_URL}/p0/dashboard/summary?date=${encodeURIComponent(date)}&fromDate=${encodeURIComponent(periodStart)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Unable to load dashboard summary");
        if (!cancelled) { setSummary(result.data || null); setError(""); }
      })
      .catch((cause) => { if (!cancelled) { setSummary(null); setError(cause.message || "Unable to load dashboard summary"); } });
    return () => { cancelled = true; };
  }, [date, periodStart]);

  const flash = summary?.flashCard;
  const salesPoints = summary?.salesTrend || [];
  const purchasePoints = summary?.purchaseTrend || [];
  const trend = useMemo(() => {
    const sales = new Map(salesPoints.map((point) => [String(point.label), Number(point.sales) || 0]));
    const purchases = new Map(purchasePoints.map((point) => [String(point.label), Number(point.purchase) || 0]));
    return [...new Set([...sales.keys(), ...purchases.keys()])].filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= date).sort().slice(-Number(trendDays)).map((day) => ({ label: dateLabel(day), Sales: sales.get(day) || 0, Purchase: purchases.get(day) || 0 }));
  }, [salesPoints, purchasePoints, date, trendDays]);
  const pendingInvoices = summary?.pendingEInvoices || [];
  const generateEInvoices = summary?.generateEInvoices || [];
  const taskInvoices = taskTab === "einvoice" ? generateEInvoices : pendingInvoices;
  const loads = summary?.loads || [];
  const pendingLoads = loads.filter((row) => !row.delivered);
  const collectionStart = collectionPeriod === "today" ? date : collectionPeriod === "week" ? shiftDate(weekStart(date), -7) : firstOfMonth(date);
  const collectionEnd = collectionPeriod === "week" ? shiftDate(weekStart(date), -1) : date;
  const collectionReceipts = (summary?.collectionRows || []).filter((row) => row.date >= collectionStart && row.date <= collectionEnd);
  const collectionAmounts = collectionReceipts.reduce((result, row) => {
    const method = collectionMethod(row);
    result[method] += Number(row.amount) || 0;
    result.total += Number(row.amount) || 0;
    return result;
  }, { upi: 0, bank: 0, cash: 0, cheque: 0, total: 0 });
  const lowStock = summary?.lowStockItems || [];
  const lowCount = Number(summary?.lowStock || 0);
  const overdue = Number(summary?.overdue || 0);
  const go = (action) => onQuickAction?.(action);
  const invoiceRequest = async (path, options) => {
    const response = await secureFetch(`${API_URL}${path}`, options);
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "E-Invoice action failed.");
    return result;
  };
  const generateInvoiceJson = async (row) => {
    setInvoiceAction(String(row._id)); setInvoiceMessage("");
    try {
      const params = new URLSearchParams({ distributorId: localStorage.getItem("distributorId") || "", firmId: localStorage.getItem("firmId") || "", fromDate: row.date, toDate: row.date, level: "Date Wise" });
      const candidates = await invoiceRequest(`/sales/einvoice-candidates?${params}`);
      if (!candidates.sales?.some((bill) => String(bill._id) === String(row._id))) throw new Error("This invoice is no longer available for E-Invoice. Refresh the dashboard.");
      const details = await invoiceRequest("/sales/einvoice-details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [row._id] }) });
      const bill = details.sales?.[0];
      const payload = buildEInvoiceJson(bill, candidates.firm, details.parties?.[bill.PartyCode]);
      const result = await invoiceRequest("/sales/einvoice-json", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoices: [payload] }) });
      setSavedJson((current) => ({ ...current, [row._id]: result.fileName }));
      setInvoiceMessage(`JSON generated for ${row.billNo}.`);
    } catch (cause) { setInvoiceMessage(cause.message || "JSON could not be generated."); }
    finally { setInvoiceAction(""); }
  };
  const uploadInvoiceJson = async (row) => {
    const fileName = savedJson[row._id];
    if (!fileName) return;
    setInvoiceAction(String(row._id)); setInvoiceMessage("");
    try {
      await invoiceRequest("/sales/einvoice-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName }) });
      setInvoiceMessage(`Uploaded ${row.billNo} to the E-Invoice portal.`);
    } catch (cause) { setInvoiceMessage(cause.message || "Upload failed."); }
    finally { setInvoiceAction(""); }
  };
  const cards = [
    { title: period === "today" ? "Today's Sales" : period === "week" ? "This Week Sales" : period === "month" ? "This Month Sales" : "Sales", value: money(flash?.periodSales ?? (period === "today" ? flash?.todaySales : period === "month" ? flash?.monthlySales : undefined)), icon: ShoppingCart, tone: "sales", delta: change(flash?.monthlySales, flash?.previousMonthSales), action: "Billing" },
    { title: period === "today" ? "Today's Purchase" : period === "week" ? "This Week Purchase" : period === "month" ? "This Month Purchase" : "Purchase", value: money(flash?.periodPurchase ?? (period === "today" ? flash?.todayPurchase : period === "month" ? flash?.monthlyPurchase : undefined)), icon: ShoppingCart, tone: "purchase", delta: change(flash?.monthlyPurchase, flash?.previousMonthPurchase), action: "Purchase" },
    { title: "Total Stock Value", value: money(summary?.stockValue), icon: Box, tone: "stock", action: "Stock In" },
    { title: "Total Customers", value: integer(summary?.accountCount ?? accountCount), icon: Users, tone: "customers", action: "Account" },
    { title: "Total Outstanding", value: money(summary?.outstanding), icon: IndianRupee, tone: "outstanding", note: overdue > 0 ? `${money(overdue)} overdue` : "No overdue balance", action: "Receipt" },
  ];
  const actions = [
    ["Sales Order", "Quotation", FileText, "blue"], ["Sales Invoice", "Billing", FileText, "blue"], ["Purchase", "Purchase", ShoppingCart, "green"],
    ["Receipt / Collection", "Receipt", Wallet, "teal"], ["Outstanding", "Receipt", CreditCard, "orange"], ["Stock View", "Stock In", Box, "purple"],
    ["PDC", "PDC Docket", FileText, "orange"], ["E-Invoice", "E-Invoice", FileText, "blue"], ["Load & Delivery", "Create Load", Truck, "teal"], ["Credit Note", "Credit Note", ReceiptText, "purple"],
  ];
  const alerts = [
    ["Customers overdue", money(overdue), overdue > 0 ? 1 : 0, IndianRupee, "red", "Receipt"],
    ["Low stock items", "Items below reorder level", lowCount, Package, "orange", "Stock In"],
    ["Invoices to review", "Open E-Invoice workspace", pendingInvoices.length, FileText, "blue", "E-Invoice"],
  ];
  return <main className="flash-dashboard">
    <header className="flash-dashboard-heading"><div className="flash-dashboard-heading-title"><span className="flash-dashboard-heading-icon"><LayoutDashboard size={27} /></span><div><h1>Dashboard</h1><p>Welcome back, {String(userName || "there").trim().split(" ")[0]}! Here's your business summary for today.</p></div></div>
      <div className="flash-dashboard-filters" aria-label="Dashboard filters"><span className="flash-dashboard-company" title={firmName || "Current company"}>{firmName || "Current company"}</span><div className="flash-dashboard-periods" role="group" aria-label="Date period">{[["today", "Today"], ["week", "This Week"], ["month", "This Month"]].map(([key, label]) => <button type="button" key={key} className={period === key ? "active" : ""} onClick={() => { setDate(businessDateIST()); setPeriod(key); }}>{label}</button>)}</div><label className="flash-dashboard-date"><span className="sr-only">Start date</span><input type="date" value={periodStart} max={date} onChange={(event) => { setFromDate(event.target.value); setPeriod("custom"); }} /></label><span>–</span><label className="flash-dashboard-date"><span className="sr-only">End date</span><input type="date" value={date} min={period === "custom" ? fromDate : undefined} onChange={(event) => { setFromDate(periodStart <= event.target.value ? periodStart : event.target.value); setDate(event.target.value); setPeriod("custom"); }} /></label><CalendarDays size={16} aria-hidden="true" /></div></header>
    {error && <p className="flash-dashboard-message" role="alert">{error}</p>}
    <section className="flash-dashboard-metrics" aria-label="Business KPIs">{cards.map(({ title, value, icon: Icon, tone, delta, note, action }) => <button type="button" className={`flash-dashboard-metric ${tone}`} key={title} onClick={() => go(action)}><span className="flash-dashboard-metric-icon"><Icon size={27} strokeWidth={2.5} /></span><span className="flash-dashboard-metric-copy"><span>{title}</span><strong>{value}</strong>{delta != null ? <span className={`flash-dashboard-metric-change ${delta < 0 ? "negative" : "positive"}`}>{delta < 0 ? <ArrowDown size={14} /> : <ArrowUp size={14} />}{Math.abs(delta).toFixed(1)}% <small>vs last month</small></span> : note && <span className="flash-dashboard-metric-note">{note}</span>}</span><ChevronRight className="flash-dashboard-metric-arrow" size={18} /></button>)}</section>
    <section className="flash-dashboard-panel flash-dashboard-quick-section" aria-labelledby="quick-heading"><h2 id="quick-heading">Quick Actions</h2><nav className="flash-dashboard-quick-actions" aria-label="Quick actions">{actions.map(([label, action, Icon, tone]) => <button type="button" className="flash-dashboard-quick-action" key={label} onClick={() => go(action)}><span className={`flash-dashboard-quick-action-icon ${tone}`}><Icon size={19} strokeWidth={2.3} /></span>{label}</button>)}</nav></section>
    <div className="flash-dashboard-middle">
      <section className="flash-dashboard-panel flash-dashboard-trend"><div className="flash-dashboard-panel-heading"><h2>Sales &amp; Purchase Trend</h2><select aria-label="Trend range" value={trendDays} onChange={(event) => setTrendDays(event.target.value)}><option value="7">Last 7 Days</option><option value="14">Last 14 Days</option><option value="30">Last 30 Days</option></select></div><div className="flash-dashboard-chart">{trend.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={trend} barCategoryGap="30%" barGap={3} margin={{ top: 10, right: 4, bottom: 0, left: 0 }}><CartesianGrid vertical={false} stroke="#e3ebf4" /><XAxis dataKey="label" tick={{ fill: "#263c5c", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#d5e0ec" }} /><YAxis tick={{ fill: "#263c5c", fontSize: 11 }} tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : v} tickLine={false} axisLine={false} width={53} /><Tooltip formatter={money} /><Legend verticalAlign="top" align="right" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="Sales" fill="#2476ef" radius={[3, 3, 0, 0]} maxBarSize={30} /><Bar dataKey="Purchase" fill="#ff722d" radius={[3, 3, 0, 0]} maxBarSize={30} /></BarChart></ResponsiveContainer> : <p className="flash-dashboard-empty">Sales and purchase trends will appear when invoices are available.</p>}</div></section>
      <section className="flash-dashboard-panel flash-dashboard-alerts"><div className="flash-dashboard-panel-heading"><h2><BellRing size={17} /> Alerts &amp; Reminders</h2><button type="button" className="flash-dashboard-link" onClick={() => go("Receipt")}>View All</button></div><div className="flash-dashboard-alert-list">{alerts.map(([label, detail, count, Icon, tone, action]) => <button type="button" className="flash-dashboard-alert" key={label} onClick={() => go(action)}><span className={`flash-dashboard-alert-icon ${tone}`}><Icon size={21} /></span><span><strong>{label} {count > 0 ? `(${count})` : ""}</strong><small>{detail}</small></span></button>)}</div></section>
    </div>
    <div className="flash-dashboard-lower">
      <section className="flash-dashboard-panel flash-dashboard-tasks">
        <div className="flash-dashboard-panel-heading"><h2>Pending Approvals / Pending Tasks</h2><button type="button" className="flash-dashboard-link" onClick={() => go(taskTab === "invoices" || taskTab === "einvoice" ? "E-Invoice" : taskTab === "delivery" ? "Create Load" : "PDC Docket")}>View All</button></div>
        <div className="flash-dashboard-tabs" role="tablist" aria-label="Pending tasks">
          <button type="button" role="tab" aria-selected={taskTab === "invoices"} className={taskTab === "invoices" ? "active" : ""} onClick={() => setTaskTab("invoices")}>Invoices ({pendingInvoices.length})</button>
          <button type="button" role="tab" aria-selected={taskTab === "delivery"} className={taskTab === "delivery" ? "active" : ""} onClick={() => setTaskTab("delivery")}>Pending Deliveries ({pendingLoads.length})</button>
          <button type="button" role="tab" aria-selected={taskTab === "pdc"} className={taskTab === "pdc" ? "active" : ""} onClick={() => setTaskTab("pdc")}>Pending PDC</button>
          <button type="button" role="tab" aria-selected={taskTab === "einvoice"} className={taskTab === "einvoice" ? "active" : ""} onClick={() => setTaskTab("einvoice")}>Generate E-Invoice ({summary?.generateEInvoiceCount || 0})</button>
        </div>
        {taskTab === "invoices" || taskTab === "einvoice" ? <div className="flash-dashboard-table-scroll"><table><thead><tr><th>Date</th><th>Invoice No</th><th>Customer</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{taskInvoices.length ? taskInvoices.slice(0, 4).map((row) => <tr key={row._id}><td>{row.date}</td><td>{row.billNo}</td><td>{row.party}</td><td>{money(row.amount)}</td><td><span className="flash-dashboard-status">{row.irnNo ? "Generated" : "Pending"}</span></td><td><div className="flash-dashboard-row-actions"><button type="button" className="flash-dashboard-action-button" disabled={!!invoiceAction} onClick={() => generateInvoiceJson(row)}><FileJson size={13} />{invoiceAction === String(row._id) ? "Working..." : "Generate JSON"}</button><button type="button" className="flash-dashboard-upload-button" disabled={!savedJson[row._id] || !!invoiceAction} onClick={() => uploadInvoiceJson(row)} title={!savedJson[row._id] ? "Generate JSON first" : "Upload saved JSON"}><Upload size={13} />Upload</button></div></td></tr>) : <tr><td colSpan="6" className="flash-dashboard-empty-row">No invoices for this period</td></tr>}</tbody></table></div> : taskTab === "delivery" ? <div className="flash-dashboard-table-scroll"><table><thead><tr><th>Date</th><th>Load No</th><th>Bills</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{pendingLoads.length ? pendingLoads.slice(0, 4).map((row) => <tr key={row.id}><td>{row.date}</td><td>{row.number}</td><td>{row.bills}</td><td>{money(row.amount)}</td><td><span className="flash-dashboard-status">Pending</span></td><td><button type="button" className="flash-dashboard-action-button" onClick={() => go("Create Load")}>View Load</button></td></tr>) : <tr><td colSpan="6" className="flash-dashboard-empty-row">No pending deliveries</td></tr>}</tbody></table></div> : <div className="flash-dashboard-task-empty"><p>Open PDC Docket to review pending cheques.</p><button type="button" className="flash-dashboard-action-button" onClick={() => go("PDC Docket")}>Open PDC Docket</button></div>}
        {invoiceMessage && <p className="flash-dashboard-inline-message" role="status">{invoiceMessage}</p>}
      </section>
      <section className="flash-dashboard-panel flash-dashboard-low-stock"><div className="flash-dashboard-panel-heading"><h2>Low Stock Items (Top 5)</h2><button type="button" className="flash-dashboard-link" onClick={() => go("Stock In")}>View All</button></div><div className="flash-dashboard-table-scroll"><table><thead><tr><th>#</th><th>Product Name</th><th>Current Stock</th><th>Reorder Level</th></tr></thead><tbody>{lowStock.length ? lowStock.slice(0, 5).map((row, index) => <tr key={`${row.product}-${index}`}><td>{index + 1}</td><td>{row.product}</td><td className="flash-dashboard-danger">{integer(row.stock)}</td><td>10</td></tr>) : <tr><td colSpan="4" className="flash-dashboard-empty-row">No low stock items</td></tr>}</tbody></table></div></section>
    </div>
    <div className="flash-dashboard-bottom">
      <section className="flash-dashboard-panel flash-dashboard-collection">
        <div className="flash-dashboard-panel-heading"><h2>Collection Summary</h2><div className="flash-dashboard-heading-actions"><select aria-label="Collection period" value={collectionPeriod} onChange={(event) => { setCollectionPeriod(event.target.value); setCollectionDetail(""); }}><option value="today">Today</option><option value="week">Last Week</option><option value="month">This Month</option></select><button type="button" className="flash-dashboard-link" onClick={() => go("Receipt")}>View All</button></div></div>
        <div className="flash-dashboard-collection-grid">{[["upi", "UPI", QrCode, upiCollectionIcon], ["bank", "Bank", Landmark, bankCollectionIcon], ["cash", "Cash", Banknote, cashCollectionIcon], ["cheque", "Cheque", CreditCard], ["total", "Total Collection", ReceiptText]].map(([key, label, Icon, iconImage]) => <button type="button" key={key} className={`flash-dashboard-collection-item ${collectionDetail === key ? "active" : ""}`} onClick={() => setCollectionDetail((current) => current === key ? "" : key)}><span className={`flash-dashboard-summary-icon ${iconImage ? "image" : "green"}`}>{iconImage ? <img src={iconImage} alt="" /> : <Icon size={18} />}</span><span><small>{label}</small><strong>{money(collectionAmounts[key])}</strong></span></button>)}</div>
        {collectionDetail && <div className="flash-dashboard-summary-detail"><strong>{collectionDetail === "total" ? "All payments" : `${collectionDetail[0].toUpperCase()}${collectionDetail.slice(1)} payments`}</strong>{collectionReceipts.filter((row) => collectionDetail === "total" || collectionMethod(row) === collectionDetail).length ? <div className="flash-dashboard-table-scroll"><table><thead><tr><th>Date</th><th>Method</th><th>Amount</th></tr></thead><tbody>{collectionReceipts.filter((row) => collectionDetail === "total" || collectionMethod(row) === collectionDetail).map((row, index) => <tr key={`${row.date}-${index}`}><td>{row.date}</td><td>{collectionMethod(row)}</td><td>{money(row.amount)}</td></tr>)}</tbody></table></div> : <p>No payments for this period.</p>}</div>}
      </section>
    </div>
  </main>;
}
