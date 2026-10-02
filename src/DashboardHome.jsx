import React, { useEffect, useState } from "react";
import { BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, Box, ChevronRight, FileBarChart, FileText, IndianRupee, LayoutDashboard, ShoppingCart, UserRound, Users, Wallet, Zap } from "lucide-react";
import { API_URL } from "./api/config";
import { businessDateIST } from "./utils/businessDate";
import { secureFetch } from "./SecuritySetup";

const money = (value) => value == null ? "—" : `₹ ${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const integer = (value) => value == null ? "—" : Number(value).toLocaleString("en-IN");
const monthlyChange = (current, previous) => {
  if (!Number.isFinite(Number(current)) || !Number.isFinite(Number(previous)) || Number(previous) <= 0) return null;
  return ((Number(current) - Number(previous)) / Number(previous)) * 100;
};
const formatTrendAxis = (value) => {
  if (value === 0) return "0";
  if (value >= 10000000) return `${Number((value / 10000000).toFixed(1))} Cr`;
  if (value >= 100000) return `${Number((value / 100000).toFixed(1))} L`;
  if (value >= 1000) return `${Number((value / 1000).toFixed(1))} K`;
  return String(value);
};
const trendScaleSteps = [1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000, 50000000, 100000000, 200000000, 300000000];

export default function DashboardHome({ userName, accountCount, itemCount, onQuickAction }) {
  const [date, setDate] = useState(businessDateIST);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await secureFetch(`${API_URL}/p0/dashboard/summary?date=${encodeURIComponent(date)}`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Unable to load dashboard summary");
        if (!cancelled) { setSummary(result.data || null); setError(""); }
      } catch (cause) {
        if (!cancelled) { setSummary(null); setError(cause.message || "Unable to load dashboard summary"); }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [date]);

  const flash = summary?.flashCard;
  const cards = [
    { title: "Total Sales", value: money(summary?.totalSales), icon: FileText, tone: "sales", change: monthlyChange(flash?.monthlySales, flash?.previousMonthSales) },
    { title: "Total Purchase", value: money(summary?.totalPurchase), icon: ShoppingCart, tone: "purchase", change: monthlyChange(flash?.monthlyPurchase, flash?.previousMonthPurchase) },
    { title: "Total Stock Value", value: money(summary?.stockValue), icon: Box, tone: "stock" },
    { title: "Total Customers", value: integer(accountCount), icon: Users, tone: "customers" },
    { title: "Total Suppliers", value: "—", icon: UserRound, tone: "suppliers" },
    { title: "Outstanding Receivables", value: money(summary?.outstanding), icon: IndianRupee, tone: "receivables" },
    { title: "Outstanding Payables", value: "—", icon: Wallet, tone: "payables" },
    { title: "Total Items", value: integer(itemCount), icon: FileBarChart, tone: "items" },
  ];
  const sections = [
    { title: "Sales Summary", icon: FileBarChart, rows: [["Today's Sales", money(flash?.todaySales)], ["This Month Sales", money(flash?.monthlySales)], ["Sales Returns", money(flash?.monthlySalesReturns)]] },
    { title: "Purchase Summary", icon: ShoppingCart, rows: [["Today's Purchase", money(flash?.todayPurchase)], ["This Month Purchase", money(flash?.monthlyPurchase)], ["Purchase Returns", money(flash?.monthlyPurchaseReturns)]] },
    { title: "Stock Summary", icon: Box, rows: [["Total Items", integer(itemCount)], ["Low Stock Items", integer(summary?.lowStock)], ["Stock Value", money(flash?.currentStockValue)]] },
    { title: "Debtors & Creditors", icon: Users, rows: [["Total Receivables", money(flash?.partyOutstanding)], ["Total Payables", "—"]] },
  ];
  const trendDates = [...new Set([...(summary?.salesTrend || []), ...(summary?.purchaseTrend || [])].map((point) => String(point.label || "")).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort().slice(-6);
  const salesByDate = new Map((summary?.salesTrend || []).map((point) => [String(point.label), Number(point.sales) || 0]));
  const purchasesByDate = new Map((summary?.purchaseTrend || []).map((point) => [String(point.label), Number(point.purchase) || 0]));
  const trend = trendDates.map((date) => ({ label: date.slice(5), sales: salesByDate.get(date) || 0, purchase: purchasesByDate.get(date) || 0 }));
  const highestTrendValue = Math.max(0, ...trend.flatMap(({ sales, purchase }) => [sales, purchase]));
  const trendAxisMax = trendScaleSteps.find((step) => step >= highestTrendValue) || Math.ceil(highestTrendValue / 100000000) * 100000000;
  const trendTicks = Array.from({ length: 5 }, (_, index) => (trendAxisMax * index) / 4);
  const firstName = String(userName || "there").trim().split(" ")[0];

  return <main className="flash-dashboard">
    <div className="flash-dashboard-heading"><div className="flash-dashboard-heading-title"><span className="flash-dashboard-heading-icon" aria-hidden="true"><LayoutDashboard size={29} strokeWidth={2.5} /></span><div><h1>Dashboard</h1><p>Welcome back, {firstName}! Here’s what’s happening with your business today.</p></div></div>
      <label className="flash-dashboard-range"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Dashboard date" /></label>
    </div>
    <div className="flash-dashboard-main">
      <div className="flash-dashboard-metrics">{cards.map(({ title, value, icon: Icon, tone, change }) => <div className={`flash-dashboard-metric ${tone}`} key={title}>
        <span className="flash-dashboard-metric-icon"><Icon size={27} strokeWidth={2.5} /></span><span className="flash-dashboard-metric-copy"><span>{title}</span><strong>{value}</strong>{change !== null && change !== undefined && <span className={`flash-dashboard-metric-change ${change < 0 ? "negative" : "positive"}`}>{change < 0 ? <ArrowDown size={15} /> : <ArrowUp size={15} />}{Math.abs(change).toFixed(1)}%<small>this month vs last month</small></span>}</span><ChevronRight size={19} className="flash-dashboard-metric-arrow" />
      </div>)}</div>
      <section className="flash-dashboard-quick-section" aria-labelledby="flash-dashboard-quick-heading">
        <h2 id="flash-dashboard-quick-heading" className="flash-dashboard-quick-heading"><Zap size={19} fill="currentColor" aria-hidden="true" />Quick Actions</h2>
        <nav className="flash-dashboard-quick-actions" aria-label="Quick actions">
          {[
            { label: "Sales", action: "Billing", icon: FileText, tone: "sales" },
            { label: "Purchase", action: "Purchase", icon: ShoppingCart, tone: "purchase" },
            { label: "Credit Note", action: "Credit Note", icon: FileBarChart, tone: "credit" },
            { label: "Create Load", action: "Create Load", icon: Box, tone: "create-load" },
            { label: "Settle Load", action: "Settle Load", icon: Wallet, tone: "settle-load" },
            { label: "Receipts", action: "Receipt", icon: FileText, tone: "receipt" },
          ].map(({ label, action, icon: Icon, tone }) => <button className={`flash-dashboard-quick-action ${tone}`} type="button" key={action} onClick={() => onQuickAction(action)}><span className="flash-dashboard-quick-action-icon"><Icon size={18} strokeWidth={2.2} /></span><span>{label}</span></button>)}
        </nav>
      </section>
      <section className="flash-dashboard-trend"><div className="flash-dashboard-trend-heading"><h2>Sales &amp; Purchase Trend</h2><span>Recent sales &amp; purchases</span></div>
        <div className="flash-dashboard-chart">{trend.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={trend} barCategoryGap="38%" barGap={3} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}><CartesianGrid vertical={false} stroke="#d5deea" /><XAxis dataKey="label" tick={{ fill: "#334155", fontSize: 12 }} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} /><YAxis domain={[0, trendAxisMax]} ticks={trendTicks} allowDataOverflow tick={{ fill: "#334155", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={formatTrendAxis} width={72} /><Tooltip formatter={money} /><Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: 13, color: "#1e293b" }} /><Bar dataKey="sales" name="Sales" fill="#1268d3" radius={[3, 3, 0, 0]} maxBarSize={36} /><Bar dataKey="purchase" name="Purchase" fill="#e56816" radius={[3, 3, 0, 0]} maxBarSize={36} /></BarChart></ResponsiveContainer> : <p className="flash-dashboard-empty">Sales and purchase trends will appear when invoices are available.</p>}</div>
      </section>
    </div>
    <aside className="flash-dashboard-card" aria-label="Business Flash Card"><h2>Business Flash Card</h2>{error && <p className="flash-dashboard-message" role="alert">{error}</p>}
      <div className="flash-dashboard-card-scroll">{sections.map(({ title, icon: Icon, rows }) => <section className="flash-dashboard-section" key={title}><h3><Icon size={21} />{title}</h3>{rows.map(([label, value]) => <div className="flash-dashboard-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>)}</div>
    </aside>
  </main>;
}
