import React, { useEffect, useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { API_ROOT } from "./api/config";
import { secureFetch } from "./SecuritySetup";
import { csvCell } from "../shared/spreadsheetSafety.js";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const startOfYear = () => { const now = new Date(); return `${now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear()}-04-01`; };
const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const balance = (value) => `${money(Math.abs(Number(value || 0)))} ${Number(value || 0) < 0 ? "Cr" : "Dr"}`;
const columns = [["srNo", "Sr No."], ["date", "Bill Date"], ["billType", "Bill Type"], ["billSeries", "Bill Series"], ["billNo", "Bill No"], ["particular", "Particular"], ["debit", "Debit"], ["credit", "Credit"], ["balance", "Net Balance"], ["narration", "Narration"]];
const display = (row, key) => key === "balance" ? balance(row[key]) : ["debit", "credit"].includes(key) ? money(row[key]) : key === "date" && row[key] ? row[key].split("-").reverse().join("/") : key === "billType" && row.isReversal ? `${row[key]} (reversal)` : String(row[key] ?? "");

export default function AccountLedger({ onBack }) {
  const [search, setSearch] = useState("");
  const [account, setAccount] = useState(null);
  const [options, setOptions] = useState([]);
  const [fromDate, setFromDate] = useState(startOfYear);
  const [toDate, setToDate] = useState(today);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    if (account || !search.trim()) { setOptions([]); return undefined; }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await secureFetch(`${API_ROOT}/api/p0/reports/account-ledger/accounts?${new URLSearchParams({ q: search.trim() })}`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Could not search accounts.");
        if (active) { setOptions(data.accounts || []); setError(""); }
      } catch (err) { if (active) { setOptions([]); setError(err.message || "Could not search accounts."); } }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search, account]);

  const generate = async (event) => {
    event?.preventDefault();
    if (!account) { setError("Search for and select an account."); return; }
    if (!fromDate || !toDate || fromDate > toDate) { setError("Select a valid date range."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const query = new URLSearchParams({ accountCode: account.code, fromDate, toDate });
      const res = await secureFetch(`${API_ROOT}/api/p0/reports/account-ledger?${query}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Could not generate the ledger.");
      setResult({ ...data, account, fromDate, toDate }); setPage(1);
    } catch (err) { setError(err.message || "Could not generate the ledger."); }
    finally { setLoading(false); }
  };
  const rows = result?.rows || [];
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const matrix = () => [columns.map(([, label]) => label), ...rows.map((row) => columns.map(([key]) => display(row, key))), ["", "", "", "", "", "Total", money(result.summary.debit), money(result.summary.credit), balance(result.summary.closing), ""]];
  const exportExcel = () => {
    const book = XLSX.utils.book_new();
    const data = [columns.map(([, label]) => label), ...rows.map((row) => columns.map(([key]) => ["debit", "credit"].includes(key) ? Number(row[key] || 0) : display(row, key))), ["", "", "", "", "", "Total", result.summary.debit, result.summary.credit, balance(result.summary.closing), ""]];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet["!cols"] = columns.map(([, label]) => ({ wch: label === "Particular" || label === "Narration" ? 28 : 17 }));
    XLSX.utils.book_append_sheet(book, sheet, "Account Ledger");
    XLSX.writeFile(book, "Account_Ledger.xlsx");
  };
  const exportCsv = () => { const csv = matrix().map((row) => row.map(csvCell).join(",")).join("\r\n"); const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "Account_Ledger.csv"; link.click(); URL.revokeObjectURL(url); };
  const exportPdf = () => { const pdf = new jsPDF({ orientation: "landscape" }); pdf.text(`Account Ledger: ${result.account.name} (${result.account.code})`, 14, 14); autoTable(pdf, { head: [matrix()[0]], body: matrix().slice(1), startY: 20, styles: { fontSize: 7 } }); pdf.save("Account_Ledger.pdf"); };

  return <div className="report-page p0-stock-report-page">
    <div className="report-page-header"><div className="report-title-section"><button type="button" className="report-back-button" onClick={onBack} aria-label="Back to reports"><ArrowLeft size={18} /></button><div><span className="report-category">Financial Report</span><h1>Account Ledger</h1><p>Account transactions from posted journals.</p></div></div></div>
    <form className="report-filter-card" onSubmit={generate}>
      <div className="report-filter-heading"><h2>Report Criteria</h2></div>
      <div className="report-filter-grid">
        <div className="report-field report-field-wide"><label htmlFor="ledger-account">Account / Party</label><input id="ledger-account" autoComplete="off" value={search} placeholder="Search account code or name" onChange={(e) => { setSearch(e.target.value); setAccount(null); setResult(null); }} />
          {options.length > 0 && <div role="listbox" aria-label="Matching accounts" style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #cbd5e1", background: "white", zIndex: 2 }}>{options.map((item) => <button type="button" role="option" aria-selected="false" key={item.code} onClick={() => { setAccount(item); setSearch(`${item.name} (${item.code})`); setOptions([]); setError(""); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", border: 0, background: "white", cursor: "pointer" }}>{item.name} ({item.code})</button>)}</div>}
        </div>
        <div className="report-field"><label htmlFor="ledger-from">From Date</label><input id="ledger-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
        <div className="report-field"><label htmlFor="ledger-to">To Date</label><input id="ledger-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
      </div><div className="report-filter-actions"><button className="report-generate-button" type="submit" disabled={loading}>{loading ? "Generating..." : "Generate Report"}</button></div>
    </form>
    {error && <div role="alert" className="party-report-error">{error}</div>}
    {result && <div className="party-report-results p0-report-results">
      <div className="p0-result-toolbar"><div className="party-grid-heading"><div><strong>Party Name: {result.account.name}</strong><span>Account: {result.account.code} · {result.fromDate} to {result.toDate}</span></div></div><div className="party-toolbar-export"><button className="party-export-excel" onClick={exportExcel}><FileSpreadsheet size={15} /> Excel</button><button className="party-export-csv" onClick={exportCsv}><Download size={15} /> CSV</button><button className="party-export-pdf" onClick={exportPdf}><FileText size={15} /> PDF</button><button className="party-export-print" onClick={() => window.print()}><Printer size={15} /> Print</button></div></div>
      <div style={{ display: "flex", gap: 24, padding: "10px" }}><strong>Total Debit: ₹{money(result.summary.debit)}</strong><strong>Total Credit: ₹{money(result.summary.credit)}</strong><strong>Closing: {balance(result.summary.closing)}</strong></div>
      <div className="party-report-grid-container p0-report-table-wrap"><table className="party-report-table" style={{ minWidth: 1150, width: "100%" }}><thead><tr>{columns.map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead><tbody>{visibleRows.map((row) => <tr key={row.srNo}>{columns.map(([key]) => <td key={key} className={["debit", "credit", "balance"].includes(key) ? "party-report-number" : ""}>{display(row, key)}</td>)}</tr>)}</tbody><tfoot><tr>{columns.map(([key]) => <td key={key}>{key === "particular" ? "Total" : key === "debit" ? money(result.summary.debit) : key === "credit" ? money(result.summary.credit) : key === "balance" ? balance(result.summary.closing) : ""}</td>)}</tr></tfoot></table></div>
      <div className="party-report-statusbar"><span>{rows.length} entries</span><div className="party-report-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next</button><select aria-label="Rows per page" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}</select></div></div>
    </div>}
  </div>;
}
