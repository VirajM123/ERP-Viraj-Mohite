import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { ArrowLeft, ArrowUpDown, Download, FileBarChart, FileSpreadsheet, Printer, RefreshCw, Search } from "lucide-react";
import { API_ROOT } from "./api/config";
import { secureFetch } from "./SecuritySetup";
import { businessDateIST } from "./utils/businessDate";
import { csvCell } from "../shared/spreadsheetSafety.js";
import ReportLoading from "./components/ReportLoading";

const today = () => businessDateIST();
const financialYearStart = () => {
  const [year, month] = businessDateIST().split("-").map(Number);
  const financialYear = month < 4 ? year - 1 : year;
  return `${financialYear}-04-01`;
};

const dateFilters = ["fromDate", "toDate"];
const CATALOG_REPORTS = [
  ["Sales Register / Invoice Register", "sales-register", "Sales", "Invoice-wise sales with saved taxable value, tax, total and status.", ["fromDate", "toDate", "companyCode", "account"]],
  ["Sales Summary Report", "sales-summary", "Sales", "Sales totals grouped by invoice date, company, series and saved bill type.", ["fromDate", "toDate", "companyCode"]],
  ["Daily Sales Report", "daily-sales", "Sales", "Sales totals grouped by invoice date.", dateFilters],
  ["Monthly Sales Comparison Report", "monthly-sales", "Sales", "Monthly sales totals grouped from invoice dates.", dateFilters],
  ["Salesman Wise Sales Report", "salesman-sales", "Sales", "Invoice totals grouped by saved salesman.", ["fromDate", "toDate", "companyCode"]],
  ["Area / Route Wise Sales Report", "area-sales", "Sales", "Invoice totals grouped by saved area.", ["fromDate", "toDate", "companyCode"]],
  ["Company Wise Sales Report", "company-sales", "Sales", "Sales totals grouped by saved company.", dateFilters],
  ["Counter Sales Summary", "counter-sales-summary", "Sales", "Counter-sale invoice totals grouped by date.", dateFilters],
  ["Sales Return / Credit Note Register", "sales-return-register", "Sales", "Saved credit-note transactions and their invoice references.", ["fromDate", "toDate", "companyCode"]],
  ["Sales Return Analysis by Product and Customer", "sales-return-analysis", "Sales", "Credit-note quantities, taxable values and tax grouped by product and customer.", ["fromDate", "toDate", "companyCode", "account", "product"]],
  ["Top Selling Products Report", "top-selling-products", "Sales", "Product quantities from saved sales invoice lines.", ["fromDate", "toDate", "companyCode", "product"]],
  ["Purchase Register / Supplier Invoice Register", "purchase-register", "Purchase", "Purchase voucher and supplier invoice totals.", ["fromDate", "toDate", "companyCode", "account"]],
  ["Purchase Summary Report", "purchase-summary", "Purchase", "Purchase totals calculated from saved purchase vouchers.", dateFilters],
  ["Supplier Wise Purchase Report", "supplier-purchase", "Purchase", "Purchase totals grouped by saved supplier.", ["fromDate", "toDate", "companyCode"]],
  ["Purchase by Company and Supplier Report", "company-supplier-purchase", "Purchase", "Purchase totals grouped by company and supplier.", dateFilters],
  ["Purchase Rate / Last Purchase Rate Report", "purchase-rate", "Purchase", "Latest saved invoice purchase rate by product and batch as of the selected date.", ["toDate", "product"]],
  ["Purchase Return / Debit Note Register", "purchase-return-register", "Purchase", "Supplier debit notes and their linked purchase bill details.", ["fromDate", "toDate", "companyCode", "account"]],
  ["Purchase Return Analysis by Product and Supplier", "purchase-return-analysis", "Purchase", "Saved debit-note quantities, taxable values and tax grouped by product and supplier.", ["fromDate", "toDate", "companyCode", "account", "product"]],
  ["Stock Valuation Report", "stock-valuation", "Stock", "Current stock valued at its recorded purchase rate.", ["godownCode", "product"]],
  ["Godown Wise Stock Report", "godown-stock", "Stock", "Current quantity and purchase-rate value grouped by godown and product.", ["godownCode", "product"]],
  ["Batch Wise Stock Report", "batch-stock", "Stock", "Current stock balances by product batch.", ["godownCode", "product"]],
  ["Near-Expiry Stock Report", "near-expiry-stock", "Stock", "Current stock expiring within the selected number of days.", ["godownCode", "product", "expiryDays"]],
  ["Expired Stock Report", "expired-stock", "Stock", "Current stock whose saved expiry date is before today.", ["godownCode", "product"]],
  ["Reorder / Minimum Stock Report", "reorder-stock", "Stock", "Current stock compared with the product reorder level.", ["godownCode", "product"]],
  ["Stock Adjustment Register", "stock-adjustments", "Stock", "Completed stock adjustments from the stock-adjustment register.", ["fromDate", "toDate", "godownCode", "product"]],
  ["Batch and Expiry Master List", "batch-expiry-list", "Stock", "Saved product batch, manufacturing and expiry details by godown.", ["search"]],
  ["Customer Ageing Report", "customer-ageing", "Customer", "Open sales invoices aged by saved due date, falling back to invoice date.", ["account"]],
  ["Bill Wise Outstanding Report", "customer-ageing", "Customer", "Open customer invoices and brought-forward bill balances.", ["account"]],
  ["Customer Statement of Account", "customer-statement", "Customer", "Customer account postings and running balance from the accounting ledger.", ["fromDate", "toDate", "account"]],
  ["Collection by Salesman Report", "collection-by-salesman", "Customer", "Receipt totals grouped by saved salesman.", dateFilters],
  ["Receipt Allocation and Unallocated Receipt Report", "receipt-allocation", "Customer", "Receipt-to-bill allocations and unallocated receipt balances.", ["fromDate", "toDate", "account"]],
  ["Supplier Outstanding Report", "supplier-outstanding", "Supplier", "Unpaid purchase bills after saved payment allocations.", ["account"]],
  ["Bill Wise Payables Report", "supplier-outstanding", "Supplier", "Unpaid supplier bills and brought-forward balances.", ["account"]],
  ["Supplier Debit Note Register", "purchase-return-register", "Supplier", "Supplier debit notes and their linked purchase bill details.", ["fromDate", "toDate", "companyCode", "account"]],
  ["Collection Register", "collection-register", "Customer", "Receipts with saved party, amount, payment mode and cheque details.", ["fromDate", "toDate", "account"]],
  ["Supplier Statement of Account", "supplier-statement", "Supplier", "Supplier account postings and running balance from the accounting ledger.", ["fromDate", "toDate", "account"]],
  ["E-Invoice Register and IRN Status", "e-invoice-register", "GST", "Sales invoices with their stored IRN and acknowledgement values.", ["fromDate", "toDate", "companyCode"]],
  ["E-Way Bill Register and Status", "eway-bill-register", "GST", "Sales invoices with their stored e-way bill number.", ["fromDate", "toDate", "companyCode"]],
  ["Journal Voucher Register", "journal-voucher-register", "Financial", "Saved journal vouchers with posted debit and credit totals.", dateFilters],
  ["Load / Dispatch Register", "load-dispatch-register", "Distribution", "Saved dispatch loads, vehicle, assigned delivery person and recorded totals.", dateFilters],
  ["Load Settlement Summary", "load-settlement-summary", "Distribution", "Saved load settlement totals and collections.", dateFilters],
  ["Load Settlement and Collection Summary", "load-settlement-summary", "Distribution", "Saved load settlement totals and collections.", dateFilters],
  ["Product / Item List", "product-list", "Master", "Product master records.", ["search", "active"]],
  ["Product Price List", "product-price-list", "Master", "Current batch prices from stock records and product master.", ["search"]],
  ["Inactive / Blocked Master Records", "inactive-masters", "Master", "Inactive or blocked product and customer master records.", ["search"]],
  ["Customer / Party List", "customer-list", "Master", "Customer account master records.", ["search", "active"]],
  ["Supplier List", "supplier-list", "Master", "Supplier account master records.", ["search", "active"]],
  ["Company List", "company-list", "Master", "Company master records.", ["search", "active"]],
  ["Area List", "area-list", "Master", "Area master records.", ["search", "active"]],
  ["Salesman List", "salesman-list", "Master", "Salesman master records.", ["search", "active"]],
  ["Godown List", "godown-list", "Master", "Godown master records.", ["search", "active"]],
].map(([title, slug, category, description, filters]) => ({ title, slug, category, description, filters }));

export { CATALOG_REPORTS };

const fieldLabel = (key) => ({
  fromDate: "From Date", toDate: "To Date", companyCode: "Company",
  account: "Customer / Supplier", product: "Product", godownCode: "Godown",
  expiryDays: "Expiry within (days)", search: "Search", active: "Record status",
}[key] || key);

const optionCode = (item) => String(item?.companyCode || item?.accountCode || item?.productCode || item?.godownCode || item?.GDCode || item?.areaCode || item?.salesmanCode || item?.code || item?._id || "");
const optionName = (item) => String(item?.companyName || item?.accountName || item?.productName || item?.godownName || item?.GodownName || item?.areaName || item?.salesmanName || item?.name || "");

const CatalogReport = ({ selectedReport, onBack, companies = [], products = [], godowns = [] }) => {
  const definition = CATALOG_REPORTS.find((item) => item.title === selectedReport);
  const [filters, setFilters] = useState({ fromDate: financialYearStart(), toDate: today(), expiryDays: "90", active: "all" });
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "", direction: 1 });
  const [pageSize, setPageSize] = useState(10);
  const shownRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query ? rows.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query))) : rows;
    if (!sort.key) return filtered;
    return [...filtered].sort((first, second) => {
      const left = first[sort.key];
      const right = second[sort.key];
      const comparison = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true, sensitivity: "base" });
      return comparison * sort.direction;
    });
  }, [rows, search, sort]);
  const pageCount = Math.max(1, Math.ceil(shownRows.length / pageSize));
  const pageRows = shownRows.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize);

  if (!definition) return null;
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const generate = async () => {
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      setError("From Date cannot be later than To Date.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      definition.filters.forEach((key) => {
        const value = filters[key];
        if (value !== undefined && String(value).trim()) query.set(key, String(value).trim());
      });
      const response = await secureFetch(`${API_ROOT}/api/p0/reports/catalog/${definition.slug}?${query}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Report could not be generated.");
      setRows(Array.isArray(result.rows) ? result.rows : []);
      setColumns(Array.isArray(result.columns) ? result.columns : []);
      setGenerated(true);
      setCriteriaOpen(false);
      setPage(1);
    } catch (requestError) {
      setCriteriaOpen(true);
      setError(requestError.message || "Report could not be generated.");
    } finally {
      setLoading(false);
    }
  };
  const exportRows = shownRows.map((row) => Object.fromEntries(columns.map((column) => [column.label, row[column.key] ?? ""])));
  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Report");
    XLSX.writeFile(workbook, `${definition.slug}.xlsx`);
  };
  const exportCsv = () => {
    const csv = [
      columns.map((column) => csvCell(column.label)).join(","),
      ...shownRows.map((row) => columns.map((column) => csvCell(row[column.key])).join(",")),
    ].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    link.download = `${definition.slug}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
  };

  const filterOptions = (key) => {
    if (key === "companyCode") return companies;
    if (key === "product") return products;
    if (key === "godownCode") return godowns;
    return [];
  };

  return (
    <div className="report-page catalog-report-page">
      <ReportLoading loading={loading} />
      <header className="report-page-header">
        <div className="report-title-section">
          <button type="button" className="report-back-button" onClick={onBack} aria-label="Back to reports"><ArrowLeft size={16} /></button>
          <span className="report-title-icon"><FileBarChart size={17} /></span>
          <div><span className="report-category">{definition.category} Report</span><h1>{definition.title}</h1><p>{definition.description}</p></div>
        </div>
      </header>
      {generated && <button type="button" className="report-filters-toggle catalog-show-filters" onClick={() => setCriteriaOpen((open) => !open)} aria-expanded={criteriaOpen}>{criteriaOpen ? "Hide Filters" : "Show Filters"}</button>}
      {criteriaOpen && <section className="report-filter-card">
        <div className="report-filter-grid catalog-report-filters">
          {definition.filters.map((key) => (
            <div className="report-field" key={key}>
              <label htmlFor={`catalog-${key}`}>{fieldLabel(key)}</label>
              {key === "fromDate" || key === "toDate" ? (
                <input id={`catalog-${key}`} type="date" value={filters[key] || ""} onChange={(event) => updateFilter(key, event.target.value)} />
              ) : key === "search" || key === "account" ? (
                <input id={`catalog-${key}`} value={filters[key] || ""} onChange={(event) => updateFilter(key, event.target.value)} placeholder="Code or name" />
              ) : key === "active" ? (
                <select id="catalog-active" value={filters.active || "all"} onChange={(event) => updateFilter(key, event.target.value)}>
                  <option value="all">All records</option><option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              ) : key === "expiryDays" ? (
                <input id="catalog-expiryDays" type="number" min="0" max="3650" value={filters.expiryDays} onChange={(event) => updateFilter(key, event.target.value)} />
              ) : (
                <select id={`catalog-${key}`} value={filters[key] || ""} onChange={(event) => updateFilter(key, event.target.value)}>
                  <option value="">All</option>
                  {filterOptions(key).map((item, index) => <option key={`${optionCode(item)}-${index}`} value={optionCode(item)}>{optionCode(item)} - {optionName(item)}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>
        <div className="report-filter-actions">
          <button type="button" className="report-generate-button" onClick={generate} disabled={loading}><FileBarChart size={15} />{loading ? "Generating..." : "Generate report"}</button>
          <button type="button" className="report-clear-button" onClick={() => { setFilters({ fromDate: financialYearStart(), toDate: today(), expiryDays: "90", active: "all" }); setGenerated(false); setRows([]); setError(""); }}>Clear</button>
        </div>
      </section>}
      {error && <div className="catalog-report-error" role="alert">{error}</div>}
      {generated && (
        <section className="party-report-results">
          <div className="party-report-toolbar">
            <div className="party-grid-heading"><span className="report-title-icon"><FileBarChart size={17} /></span><div><strong>{definition.title}</strong><span>{shownRows.length.toLocaleString("en-IN")} records found</span></div></div>
            <label className="party-report-search"><Search size={14} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search report rows" /></label>
            <div className="catalog-report-actions">
              <button type="button" onClick={generate} disabled={loading}><RefreshCw size={14} /> Refresh</button>
              <button type="button" onClick={exportExcel} disabled={!shownRows.length}><FileSpreadsheet size={14} /> Excel</button>
              <button type="button" onClick={exportCsv} disabled={!shownRows.length}><Download size={14} /> CSV</button>
              <button type="button" onClick={() => window.print()}><Printer size={14} /> Print</button>
            </div>
          </div>
            <div className="party-report-grid-container">
              <table className="party-report-table">
                <thead><tr>{columns.map((column) => <th key={column.key}>
                  <button type="button" className="catalog-report-sort" onClick={() => setSort((current) => ({
                    key: column.key, direction: current.key === column.key ? -current.direction : 1,
                  }))}>
                    {column.label}<ArrowUpDown size={12} />
                  </button>
                </th>)}</tr></thead>
                <tbody>{pageRows.map((row, index) => (
                  <tr key={`${page}-${index}`}>{columns.map((column) => {
                    const value = row[column.key];
                    return <td key={column.key} className={typeof value === "number" ? "party-report-number" : ""}>{typeof value === "number" ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : value ?? ""}</td>;
                  })}</tr>
                ))}{!pageRows.length && <tr><td colSpan={Math.max(columns.length, 1)} className="catalog-report-empty">No records match the selected filters.</td></tr>}</tbody>
              </table>
            </div>
          <footer className="party-report-statusbar"><span>Showing {shownRows.length ? (Math.min(page, pageCount) - 1) * pageSize + 1 : 0} to {Math.min(Math.min(page, pageCount) * pageSize, shownRows.length)} of {shownRows.length} entries</span><div className="party-report-pagination" aria-label="Report pagination"><button type="button" onClick={() => setPage(1)} disabled={page <= 1}>First</button><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Previous</button><span>Page {Math.min(page, pageCount)} of {pageCount}</span><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount}>Next</button><button type="button" onClick={() => setPage(pageCount)} disabled={page >= pageCount}>Last</button><label><span className="sr-only">Rows per page</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size} / page</option>)}</select></label></div></footer>
        </section>
      )}
    </div>
  );
};

export default CatalogReport;
