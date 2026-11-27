import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { ArrowLeft, BarChart3, Download, FileBarChart, FileSpreadsheet, FileText, Printer, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { API_ROOT } from "./api/config";
import { secureFetch } from "./SecuritySetup";
import { businessDateIST } from "./utils/businessDate";
import { escapeHtml } from "./utils/escapeHtml";
import CommonReportGrid from "./CommonReportGrid";
import ReportLoading from "./components/ReportLoading";
import { csvCell } from "../shared/spreadsheetSafety.js";

const definitions = {
  "Load Wise Bill Summary": { type: "summary", columns: [["sr", "SrNo."], ["loadSeries", "Load series"], ["loadNo", "Load No"], ["loadDate", "Load Date"], ["totalBill", "Total Bill"], ["totalBillAmt", "Total Bill Amt"], ["cashBill", "Cash Bill"], ["cashBillAmt", "Cash Bill Amt"], ["creditBill", "Credit Bill"], ["creditBillAmt", "Credit Bill Amt"], ["adjustBill", "Adjust Bill"], ["adjustBillAmt", "Adjust Bill Amt"], ["pendingBill", "Pending Bill"], ["pendingBillAmt", "Pending Bill Amt"], ["cancelBill", "Cancel Bill"], ["cancelBillAmt", "Cancel Bill Amt"], ["recBill", "Rec Bill"], ["recBillAmt", "Rec Bill Amt"], ["narration", "Narration"]] },
  "Loading Wise Collection": { type: "collection", columns: [["sr", "SrNo."], ["billDate", "Bill Date"], ["billSeries", "Bill Series"], ["billNo", "Bill No"], ["partyCode", "Party Code"], ["partyName", "Party Name"], ["billAmount", "Bill Amount"], ["adjustedAmount", "Adjusted Amount"], ["finalAmount", "Final Amount"], ["cash", "Cash"], ["cheque", "Cheque"], ["online", "Online"], ["receiptSeries", "Receipt Series"], ["receiptNo", "Receipt No"], ["creditAmt", "CreditAmt"], ["pendingAmount", "Pending Amount"], ["billType", "BillType"], ["cashierName", "Cashier Name"], ["currentOs", "Current O/S"], ["ledgerOs", "Ledger O/S"]] },
  "Load Wise Cancel Report": { type: "cancel", columns: [["sr", "SrNo."], ["billDate", "Bill Date"], ["billSeries", "Bill Series"], ["billNo", "Bill No"], ["productCode", "Product Code"], ["productName", "Product Name"], ["localProduct", "Local Product"], ["hsn", "HSNCode"], ["salesmanCode", "Salesman Code"], ["salesmanName", "Salesman Name"], ["loadQty", "LoadQty"], ["deliverQty", "DeliverQty"], ["cancelQty", "CancelQty"]] },
};

export const LOAD_REPORT_NAMES = Object.keys(definitions);

export default function LoadWiseReport({ selectedReport, onBack }) {
  const report = definitions[selectedReport];
  const today = businessDateIST();
  const [year, month] = today.split("-").map(Number);
  const [filters, setFilters] = useState({ fromDate: `${month < 4 ? year - 1 : year}-04-01`, toDate: today, loadSeries: "", loadNo: "", orderBy: "billNo", reportLevel: "load" });
  const [rows, setRows] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [zoom, setZoom] = useState("100");
  const [criteriaOpen, setCriteriaOpen] = useState(true);
  const [columnFilters, setColumnFilters] = useState({});
  const [controlsTarget, setControlsTarget] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const numericKeys = ["totalBill", "totalBillAmt", "cashBill", "cashBillAmt", "creditBill", "creditBillAmt", "adjustBill", "adjustBillAmt", "pendingBill", "pendingBillAmt", "cancelBill", "cancelBillAmt", "recBill", "recBillAmt", "billAmount", "adjustedAmount", "finalAmount", "cash", "cheque", "online", "creditAmt", "pendingAmount", "currentOs", "ledgerOs", "loadQty", "deliverQty", "cancelQty"];
  const columns = useMemo(() => report.columns.map(([key, label]) => ({ key, label, type: numericKeys.includes(key) ? "number" : "string" })), [report]);
  useEffect(() => { setRows([]); setGenerated(false); setError(""); setSearch(""); setPage(1); }, [selectedReport]);
  const sortRows = (items) => [...items].sort((a, b) => String(a[filters.orderBy] ?? "").localeCompare(String(b[filters.orderBy] ?? ""), undefined, { numeric: true })).map((row, index) => ({ ...row, sr: index + 1 }));
  const fetchRows = async () => {
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) throw new Error("From Date cannot be later than To Date.");
    const query = new URLSearchParams({ fromDate: filters.fromDate, toDate: filters.toDate, loadSeries: filters.loadSeries, loadNo: filters.loadNo });
    const response = await secureFetch(`${API_ROOT}/api/reports/load-wise/${report.type}?${query}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Unable to generate report.");
    return sortRows(Array.isArray(result.rows) ? result.rows : []);
  };
  const generate = async () => {
    setLoading(true); setError("");
    try { setRows(await fetchRows()); setGenerated(true); setPage(1); setCriteriaOpen(false); setGeneratedAt(new Date()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  const matchesFilters = (row) => {
    const query = search.trim().toLowerCase();
    if (query && !Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(query))) return false;
    return Object.entries(columnFilters).every(([key, filter]) => !String(filter || "").trim() || String(row[key] ?? "").toLowerCase().includes(String(filter).trim().toLowerCase()));
  };
  const shownRows = useMemo(() => rows.filter(matchesFilters), [rows, search, columnFilters]);
  const exportExcel = async () => {
    setLoading(true); setError("");
    try {
      const fresh = await fetchRows();
      setRows(fresh);
      const filtered = fresh.filter(matchesFilters);
      const sheet = XLSX.utils.aoa_to_sheet([report.columns.map(([, label]) => label), ...filtered.map((row) => report.columns.map(([key]) => row[key] ?? ""))]);
      const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, "Report"); XLSX.writeFile(workbook, `${selectedReport}.xlsx`);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  const exportCsv = async () => {
    setLoading(true); setError("");
    try {
      const fresh = await fetchRows(); setRows(fresh);
      const filtered = fresh.filter(matchesFilters);
      const csv = [report.columns.map(([, label]) => csvCell(label)).join(","), ...filtered.map((row) => report.columns.map(([key]) => csvCell(row[key])).join(","))].join("\r\n");
      const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `${selectedReport}.csv`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  const withFreshRows = async (callback) => {
    setLoading(true); setError("");
    try { const fresh = await fetchRows(); setRows(fresh); await callback(fresh.filter(matchesFilters)); return true; }
    catch (e) { setError(e.message); return false; }
    finally { setLoading(false); }
  };
  const exportPdf = () => withFreshRows((filtered) => {
    const pdf = new jsPDF({ orientation: "landscape" });
    pdf.setFontSize(14); pdf.text(selectedReport, 14, 14);
    autoTable(pdf, { startY: 20, head: [report.columns.map(([, label]) => label)], body: filtered.map((row) => report.columns.map(([key]) => row[key] ?? "")), styles: { fontSize: 6 }, headStyles: { fillColor: [42, 80, 209] } });
    pdf.save(`${selectedReport}.pdf`);
  });
  const printReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) { setError("Please allow pop-ups to print this report."); return; }
    void withFreshRows((filtered) => {
      const head = report.columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("");
      const body = filtered.map((row) => `<tr>${report.columns.map(([key]) => `<td>${escapeHtml(String(row[key] ?? ""))}</td>`).join("")}</tr>`).join("");
      printWindow.document.open();
      printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(selectedReport)}</title><style>body{font:11px Arial,sans-serif}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px;text-align:left}th{background:#e7eefb}</style></head><body><h1>${escapeHtml(selectedReport)}</h1><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`);
      printWindow.document.close(); printWindow.focus(); printWindow.print();
    }).then((printed) => { if (!printed) printWindow.close(); });
  };
  const pageCount = Math.max(1, Math.ceil(shownRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = shownRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const formatValue = (column, value) => column.type === "number" && value !== null && value !== undefined && value !== "" ? Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value ?? "";
  const update = (key) => (event) => setFilters((previous) => ({ ...previous, [key]: event.target.value }));
  return (
    <div className="party-classic-report-page party-wise-sales-report-page load-wise-report-page">
      <ReportLoading loading={loading} />
      <div className="party-classic-report-window">
        <div className="party-classic-titlebar"><div className="party-report-title-left">
          <button type="button" className="party-title-back" onClick={onBack} aria-label="Back to reports"><ArrowLeft size={18} /></button>
          <div className="party-title-icon"><BarChart3 size={21} /></div>
          <div className="party-title-content"><span>Load Report</span><h1>{selectedReport}</h1><p>Load and settlement details</p></div>
        </div></div>
        <div className="party-report-content-layout"><main className="party-report-main-column">
          <div className={`party-report-filter-panel${criteriaOpen ? "" : " party-criteria-collapsed"}`}>
            <fieldset className="party-filter-group" aria-label="Report filters">
              <div className="party-report-filter-heading">
                <div><SlidersHorizontal size={16} /><strong>Report Criteria</strong></div>
                <div className="party-criteria-heading-actions"><div ref={setControlsTarget} className="party-grid-controls-target" />
                  <button type="button" aria-expanded={criteriaOpen} onClick={() => setCriteriaOpen((open) => !open)}>{criteriaOpen ? "Collapse" : "Show Filters"}</button>
                </div>
              </div>
              {criteriaOpen && <>
                <div className="party-report-form-grid">
                  <div className="party-report-field"><label>From Load Date</label><input type="date" value={filters.fromDate} onChange={update("fromDate")} /></div>
                  <div className="party-report-field"><label>To Load Date</label><input type="date" value={filters.toDate} onChange={update("toDate")} /></div>
                  <div className="party-report-field"><label>Load Series</label><input value={filters.loadSeries} onChange={update("loadSeries")} /></div>
                  <div className="party-report-field"><label>Load No</label><input inputMode="numeric" value={filters.loadNo} onChange={update("loadNo")} /></div>
                  <div className="party-report-field"><label>Order By</label><select value={filters.orderBy} onChange={update("orderBy")}><option value="billNo">Bill No</option><option value="billDate">Bill Date</option><option value="loadNo">Load No</option>{report.type === "cancel" && <option value="salesmanName">Salesman</option>}</select></div>
                </div>
                <div className="report-filter-actions"><button type="button" className="report-generate-button party-criteria-generate" onClick={generate} disabled={loading}><FileBarChart size={15} /> {loading ? "Generating..." : "Generate Report"}</button></div>
              </>}
            </fieldset>
          </div>
          {error && <div className="party-report-error" role="alert">{error}</div>}
          <div className="party-report-results">
            <div className="party-result-caption">Report Results</div>
            <div className="party-report-toolbar">
              <div className="party-grid-heading"><div className="party-grid-heading-icon"><FileBarChart size={17} /></div><div><strong>Report Results</strong><span>{generated ? `${shownRows.length} records found` : "Generate the report to view results"}</span></div></div>
              <div className="party-grid-toolbar-actions">
                <div className="party-report-search"><Search size={15} /><input aria-label="Search report results" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search in results..." />{search && <button type="button" className="party-grid-search-clear" onClick={() => { setSearch(""); setPage(1); }} aria-label="Clear search"><X size={14} /></button>}</div>
                <select className="party-grid-zoom-select" value={zoom} onChange={(event) => setZoom(event.target.value)} title="Grid zoom">{[75, 90, 100, 125, 150].map((value) => <option key={value} value={value}>{value}%</option>)}</select>
                <button type="button" className="party-grid-refresh-button" onClick={generate} disabled={loading} title="Refresh report"><RefreshCw size={15} /></button>
                <div className="party-toolbar-export">
                  <button type="button" className="party-export-excel" onClick={exportExcel} disabled={loading || !generated || !shownRows.length}><FileSpreadsheet size={15} /> Excel</button>
                  <button type="button" className="party-export-csv" onClick={exportCsv} disabled={loading || !generated || !shownRows.length}><Download size={15} /> CSV</button>
                  <button type="button" className="party-export-pdf" onClick={exportPdf} disabled={loading || !generated || !shownRows.length}><FileText size={15} /> PDF</button>
                  <button type="button" className="party-export-print" onClick={printReport} disabled={loading || !generated || !shownRows.length}><Printer size={15} /> Print</button>
                </div>
              </div>
            </div>
            <div className="party-report-grid-container">
              {!generated ? <div className="party-report-empty-grid"><table className="party-report-table party-empty-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead></table><div className="party-empty-report"><FileBarChart size={40} /><strong>No report generated</strong><span>Please set the report criteria and click Generate Report to view results.</span></div></div> :
                <div className="party-report-zoom" style={{ zoom: Number(zoom) / 100 }}><CommonReportGrid controlsTarget={controlsTarget} columns={columns} rows={pageRows} rowKey={(row, index) => `${row.sr}-${index}`} renderValue={formatValue} getTotal={(column, index) => {
                  if (index === 0) return "TOTAL";
                  if (column.type !== "number" || ["currentOs", "ledgerOs"].includes(column.key)) return "";
                  const values = shownRows.map((row) => row[column.key]).filter((value) => value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value)));
                  return values.length && values.length === shownRows.length ? formatValue(column, values.reduce((sum, value) => sum + Number(value), 0)) : "";
                }} columnFilters={columnFilters} onColumnFilterChange={(key, value) => { setColumnFilters((previous) => ({ ...previous, [key]: value })); setPage(1); }} />{!pageRows.length && <div className="party-empty-report"><strong>No records found</strong><span>Change the report criteria or search filters.</span></div>}</div>}
            </div>
            {generated && <div className="load-report-note">Blank values indicate details not recorded for that load.</div>}
            <div className="party-report-statusbar">{!generated ? <><strong>{selectedReport}</strong><span>Total Records: 0</span></> : <>
              <span>Showing {shownRows.length ? (safePage - 1) * pageSize + 1 : 0} to {Math.min(safePage * pageSize, shownRows.length)} of {shownRows.length} entries</span><span className="party-generated-time">Generated On: {generatedAt?.toLocaleString()}</span>
              <div className="party-report-pagination" aria-label="Report pagination"><button type="button" onClick={() => setPage(1)} disabled={safePage <= 1}>First</button><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage <= 1}>Previous</button><span>Page {safePage} of {pageCount}</span><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={safePage >= pageCount}>Next</button><button type="button" onClick={() => setPage(pageCount)} disabled={safePage >= pageCount}>Last</button><label><span className="sr-only">Rows per page</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size} / page</option>)}</select></label></div>
            </>}</div>
          </div>
        </main></div>
      </div>
    </div>
  );
}
