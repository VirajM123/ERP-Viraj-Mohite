import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Download,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  PackageSearch,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import * as XLSX from "xlsx-js-style";
import { strToU8, zipSync } from "fflate";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./Report.css";
import { API_ROOT } from "./api/config";
import { secureFetch } from "./SecuritySetup";

const REPORT_INFORMATION = {
  "Party Wise Sales Report": {
    title: "Party Wise Sales Report",
    category: "Sales Report",
    description: "View sales transactions for a selected party.",
    icon: Users,
  },

  "All Party Wise Sales Report": {
    title: "All Party Wise Sales Report",
    category: "Sales Report",
    description: "View consolidated sales information for all parties.",
    icon: BarChart3,
  },

  "Find Cheque Details": {
    title: "Find Cheque Details",
    category: "Financial Report",
    description: "Trace a cheque through receipts, adjusted bills, bounce entries and PDC dockets.",
    icon: Search,
  },

  "Product Wise Sales Report": {
    title: "Product Wise Sales Report",
    category: "Sales Report",
    description: "View sales transactions for a selected product.",
    icon: PackageSearch,
  },

  "All Product Wise Sales Report": {
    title: "All Product Wise Sales Report",
    category: "Sales Report",
    description: "View consolidated product-wise sales information.",
    icon: FileBarChart,
  },

  "Stock And Sales Report": {
    title: "Stock And Sales Report",
    category: "Sales Report",
    description: "Compare current stock with sales for a selected date range.",
    icon: Warehouse,
  },

  "Company Wise Purchase Report": {
    title: "Company Wise Purchase Report",
    category: "Purchase Report",
    description: "View company-wise purchase details with supplier and product-wise options.",
    icon: Building2,
  },

  "Company/Bill Wise Purchase Report": {
    title: "Company/Bill Wise Purchase Report",
    category: "Purchase Report",
    description: "View voucher and bill-wise purchase line details.",
    icon: Building2,
  },

  "Product Wise Purchase Report": {
    title: "Product Wise Purchase Report",
    category: "Purchase Report",
    description: "View product-wise purchase, discount and tax details.",
    icon: PackageSearch,
  },

  "Current Stock Report": {
    title: "Current Stock Report",
    category: "Stock Report",
    description: "View the current available stock.",
    icon: Warehouse,
  },

  "As On Date Stock Report": {
    title: "As On Date Stock Report",
    category: "Stock Report",
    description: "View stock availability as on a selected date.",
    icon: CalendarDays,
  },

  "Damage Stock Report": {
    title: "Damage Stock Report",
    category: "Stock Report",
    description: "View damaged product stock.",
    icon: Warehouse,
  },

  "Product Ledger": {
    title: "Product Ledger",
    category: "Stock Report",
    description: "View complete inward and outward movement of a product.",
    icon: ShoppingCart,
  },
  "Sales GST Register": { title: "Sales GST Register", category: "GST Report", description: "Invoice-wise outward supplies with GST rate bifurcation.", icon: FileSpreadsheet },
  "Purchase GST Register": { title: "Purchase GST Register", category: "GST Report", description: "Supplier invoice-wise inward supplies with GST rate bifurcation.", icon: FileSpreadsheet },
  "CRN GST Register": { title: "CRN GST Register", category: "GST Report", description: "Credit-note returns with party and rate-wise GST values.", icon: FileText },
  "GST Summary": { title: "GST Summary", category: "GST Report", description: "Rate-wise sales, purchase and return tax summary.", icon: BarChart3 },
  "GSTR1 Report": { title: "GSTR1 Report", category: "GST Report", description: "Outward supply data ready for Excel, JSON and CSV export.", icon: FileBarChart },
  "General Ledger": { title: "General Ledger", category: "Financial Report", description: "Posted journal entries by account.", icon: BookOpen },
  "Party Ledger": { title: "Party Ledger", category: "Financial Report", description: "Customer or supplier account ledger.", icon: Users },
  "Trial Balance": { title: "Trial Balance", category: "Financial Report", description: "Debit, credit and closing balance by account.", icon: BarChart3 },
  "Cash Book": { title: "Cash Book", category: "Financial Report", description: "Posted cash account movements.", icon: FileText },
  "Bank Book": { title: "Bank Book", category: "Financial Report", description: "Posted bank account movements.", icon: Building2 },
  "Day Book": { title: "Day Book", category: "Financial Report", description: "Chronological journal activity.", icon: CalendarDays },
  "Profit & Loss": { title: "Profit & Loss", category: "Financial Report", description: "Income and expense balances.", icon: BarChart3 },
  "Balance Sheet": { title: "Balance Sheet", category: "Financial Report", description: "Balance sheet account positions.", icon: FileBarChart },
  "Stock Movement Ledger": { title: "Stock Movement Ledger", category: "Stock Report", description: "Immutable stock inward and outward entries.", icon: Warehouse },
  "Credit Control Report": { title: "Credit Control Report", category: "Control Report", description: "Customer credit exposure, limits and overdue status.", icon: Users },
  "Permission Audit Report": { title: "Permission Audit Report", category: "Control Report", description: "Effective user permissions by module and operation.", icon: Check },
  "Audit Trail Report": { title: "Audit Trail Report", category: "Control Report", description: "Create, edit, cancel, reverse and administrative audit events.", icon: FileText },
  "Dashboard Reconciliation": { title: "Dashboard Reconciliation", category: "Control Report", description: "Live source totals used by the dashboard.", icon: BarChart3 },
};

const P0_REPORT_ENDPOINTS = {
  "Current Stock Report": "/api/reports/current-stock",
  "As On Date Stock Report": "/api/reports/as-on-date-stock",
  "Damage Stock Report": "/api/reports/damage-stock",
  "Product Ledger": "/api/reports/product-ledger",
  "General Ledger": "/p0/reports/financial/general-ledger",
  "Party Ledger": "/p0/reports/financial/party-ledger",
  "Trial Balance": "/p0/reports/financial/trial-balance",
  "Cash Book": "/p0/reports/financial/cash-book",
  "Bank Book": "/p0/reports/financial/bank-book",
  "Day Book": "/p0/reports/financial/day-book",
  "Profit & Loss": "/p0/reports/financial/profit-loss",
  "Balance Sheet": "/p0/reports/financial/balance-sheet",
  "Stock Movement Ledger": "/api/p0/reports/stock-movement",
  "Credit Control Report": "/p0/reports/credit-control",
  "Permission Audit Report": "/p0/reports/permission-audit",
  "Audit Trail Report": "/p0/reports/audit-trail",
  "Dashboard Reconciliation": "/p0/dashboard/summary",
};

const GST_REPORT_ENDPOINTS = {
  "Sales GST Register": "sales-register",
  "Purchase GST Register": "purchase-register",
  "CRN GST Register": "crn-register",
  "GST Summary": "summary",
  "GSTR1 Report": "gstr1",
};

const FIXED_REPORT_COLUMNS = {
  "Current Stock Report": [
    ["SrNo", "SrNo"], ["SysProdCode", "SysProdCode"], ["HSNCode", "HSNCode"], ["ProdCode", "ProdCode"],
    ["ProdName", "ProdName"], ["LocalProduct", "Local Product"], ["ShortCode", "ShortCode"], ["Batch", "Batch"],
    ["MfgDate", "MFG. Date"], ["ExpDate", "EXP. Date"], ["BatchLock", "Batch Lock"], ["MRP", "MRP"],
    ["BoxQty", "BoxQty"], ["InBox", "InBox"], ["UnitQty", "UnitQty"], ["TotalQty", "Total Qty"],
    ["ValueRs", "Value [Rs.]"], ["ValueKg", "Value [Kg]"], ["CatName", "CatName"], ["CompName", "CompName"],
    ["VatPer", "VatPer"], ["Weight", "Weight"], ["BoxPack", "BoxPack"], ["InBoxPack", "InBoxPack"],
    ["LastPurchaseDate", "Last Purchase Date"], ["LastPurchase", "Last Purchase"], ["LastQty", "LastQty"],
  ],
  "As On Date Stock Report": [],
  "Damage Stock Report": [
    ["SrNo", "SrNo."], ["TrnDate", "TrnDate"], ["TrnSeries", "TrnSeries"], ["TrnNo", "TrnNo"],
    ["SysProdCode", "SysProdCode"], ["ProductCode", "Product Code"], ["ProductName", "Product Name"],
    ["LocalProduct", "Local Product"], ["MRP", "MRP"], ["BoxQty", "BoxQty"], ["InBoxQty", "InBoxQty"],
    ["UnitQty", "UnitQty"], ["Qty", "Qty"], ["FreeQty", "Free Qty"], ["Amount", "Amount"],
    ["Weight", "Weight"], ["VatPer", "VatPer"], ["Value", "Value"],
  ],
  "Product Ledger": [
    ["SrNo", "Sr No."], ["Date", "Date"], ["TrnSeries", "TrnSeries"], ["TrnNo", "Trn No"],
    ["InvDate", "InvDate"], ["InvNo", "InvNo"], ["Trn", "Trn"], ["PartyCode", "Party Code"],
    ["PartyName", "Party Name"], ["AddQty", "Add Qty"], ["LessQty", "Less Qty"], ["BalanceQty", "Balance Qty"],
    ["Mrp", "Mrp"], ["Batch", "Batch"], ["SRate", "SRate"], ["PRate", "PRate"], ["Qty", "Qty"],
    ["FreeQty", "Free Qty"], ["BoxPack", "BoxPack"], ["InBoxPack", "InBoxPack"], ["BoxQty", "BoxQty"],
    ["InBoxQty", "InBoxQty"], ["UnitQty", "UnitQty"],
  ],
  "Stock Movement Ledger": [
    ["SrNo", "Sr No."], ["Date", "Date"], ["TrnSeries", "Trn Series"], ["TrnNo", "Trn No"],
    ["Movement", "Movement"], ["Godown", "Godown"], ["ProductCode", "Product Code"], ["ProductName", "Product Name"],
    ["Batch", "Batch"], ["MRP", "MRP"], ["StockIn", "Stock In"], ["StockOut", "Stock Out"],
    ["BalanceQty", "Balance Qty"], ["Qty", "Qty"], ["FreeQty", "Free Qty"], ["Narration", "Narration"],
  ],
};
FIXED_REPORT_COLUMNS["As On Date Stock Report"] = FIXED_REPORT_COLUMNS["Current Stock Report"];

const COMPANY_BILL_PURCHASE_COLUMNS = [
  ["VouDate", "Vou Date"], ["VouSeries", "Vou Series"], ["VouNo", "Vou No."],
  ["ProductCode", "Product Code"], ["ProductName", "Product Name"], ["MRP", "MRP"],
  ["Batch", "Batch"], ["Unit", "Unit"], ["Qty", "Qty"], ["FreeQty", "FreeQty"],
  ["Rate", "Purchase Rate"], ["SalesRate", "Sales Rate"], ["Amount", "Amount"], ["BVDiscAmt", "BVDiscAmt"],
  ["BVAddAmt", "BVAddAmt"], ["AVDiscAmt", "AVDiscAmt"], ["AVAddAmt", "AVAddAmt"],
  ["VatPer", "VatPer"], ["VatAmt", "VatAmt"], ["CGST", "CGST"], ["SGST", "SGST"],
  ["IGST", "IGST"], ["Cess1", "Cess1"], ["Cess2", "Cess2"],
  ["BoxPack", "Boxpack"], ["INBoxPack", "INBoxpack"],
].map(([key, label]) => ({ key, label }));

const PRODUCT_PURCHASE_COLUMNS = [
  ["SrNo", "SrNo."], ["VouDate", "Vou.Date"], ["VouSeries", "Series"], ["VouNo", "Vou.No"],
  ["InvDate", "InvDate"], ["InvNo", "InvNo"], ["Company", "Company"],
  ["ProductCode", "ProdCode"], ["ProductName", "ProdName"], ["HSNCode", "HSNCode"],
  ["MRP", "MRP"], ["Qty", "Qty"], ["FreeQty", "Free Qty"], ["BoxQty", "BoxQty"],
  ["Rate", "Purchase Rate"], ["SalesRate", "Sales Rate"], ["Gross", "Gross"], ["Weight", "Weight"], ["Taxable", "Taxable"],
  ["GSTPercent", "GST%"], ["GSTAmt", "GST Amt"], ["CGST", "CGST"], ["SGST", "SGST"],
  ["IGST", "IGST"], ["Cess1", "Cess1"], ["Cess2", "Cess2"],
  ["BVDiscAmt", "BVDiscAmt"], ["BVAddAmt", "BVAddAmt"], ["AVDiscAmt", "AVDiscAmt"],
  ["AVAddAmt", "AVAddAmt"], ["NetAmt", "NetAmt"], ["BoxPack", "BoxPack"],
].map(([key, label]) => ({ key, label }));

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getFinancialYearStart = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const financialYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  return `${financialYear}-04-01`;
};

const Report = ({
  selectedReport,
  companies = [],
  accounts = [],
  products = [],
  godowns = [],
  areas = [],
  salesmen = [],
  onBack,
}) => {
  const API_BASE_URL = API_ROOT;
  const defaultP0Filters = () => ({
    companyCode: "",
    fromDate: getFinancialYearStart(),
    toDate: getTodayDate(),
    asOnDate: getTodayDate(),
    account: "",
    product: "",
    batch: "",
    godownCode: "",
    entryType: "",
    reportType: "details",
    reportLevel: "productBatch",
    reportFilter: "all",
    nearExpiry: "N",
    expiryDays: "",
    currentStock: "Y",
    includeNegative: "N",
    includeZero: "N",
    orderBy: "productName",
  });
  const [p0Filters, setP0Filters] = useState(defaultP0Filters);
  const [p0Rows, setP0Rows] = useState([]);
  const [p0Summary, setP0Summary] = useState(null);
  const [p0Loading, setP0Loading] = useState(false);
  const [p0Error, setP0Error] = useState("");
  const [p0Generated, setP0Generated] = useState(false);
  const isP0Report = Boolean(P0_REPORT_ENDPOINTS[selectedReport]);
  const isGstReport = Boolean(GST_REPORT_ENDPOINTS[selectedReport]);
  const defaultGstFilters = () => ({
    fromDate: getFinancialYearStart(), toDate: getTodayDate(), billType: "all", invoiceType: "all",
    taxOnType: "all", specificSeries: "N", series: "", outputFormat: "party", gstNo: "all",
    cessSeparate: "N", gstBifurcation: "N", companyWise: "N", withDetails: "N",
    discountBifurcation: "N", reportWith: "gst", withDamage: "Y",
  });
  const [gstFilters, setGstFilters] = useState(defaultGstFilters);
  const [gstRows, setGstRows] = useState([]);
  const [gstColumns, setGstColumns] = useState([]);
  const [gstSections, setGstSections] = useState([]);
  const [activeGstrSheet, setActiveGstrSheet] = useState("B2B");
  const [gstTotals, setGstTotals] = useState({});
  const [gstSummary, setGstSummary] = useState(null);
  const [gstLoading, setGstLoading] = useState(false);
  const [gstGenerated, setGstGenerated] = useState(false);
  const [gstError, setGstError] = useState("");
  const [gstSearch, setGstSearch] = useState("");
  const [gstZoom, setGstZoom] = useState("100");
  const activeGstrSection = useMemo(() => (
    selectedReport === "GSTR1 Report"
      ? gstSections.find((section) => section.name === activeGstrSheet) || gstSections[0] || null
      : null
  ), [selectedReport, gstSections, activeGstrSheet]);
  const visibleGstRows = activeGstrSection?.rows || gstRows;
  const visibleGstColumns = activeGstrSection?.columns || gstColumns;
  const filteredGstRows = useMemo(() => {
    const query = gstSearch.trim().toLowerCase();
    if (!query) return visibleGstRows;
    return visibleGstRows.filter((row) => Object.values(row || {}).some((value) =>
      String(value ?? "").toLowerCase().includes(query)
    ));
  }, [visibleGstRows, gstSearch]);
  const [chequeSearch, setChequeSearch] = useState("");
  const [chequeResult, setChequeResult] = useState(null);
  const [chequeLoading, setChequeLoading] = useState(false);
  const [chequeError, setChequeError] = useState("");
  const [stockSalesFilters, setStockSalesFilters] = useState({
    companyCode: "",
    reportLevel: "unit",
    godownCode: "",
    fromDate: getFinancialYearStart(),
    toDate: getTodayDate(),
    reportWith: "summary",
    filter: "all",
    orderBy: "productName",
    stockWithFreeQty: false,
  });
  const [stockSalesCriteria, setStockSalesCriteria] = useState({
    companies: [],
    godowns: [],
  });
  const [stockSalesRows, setStockSalesRows] = useState([]);
  const [stockSalesSummary, setStockSalesSummary] = useState(null);
  const [stockSalesLoading, setStockSalesLoading] = useState(false);
  const [stockSalesError, setStockSalesError] = useState("");
  const [stockSalesGenerated, setStockSalesGenerated] = useState(false);
  const [stockSalesSearch, setStockSalesSearch] = useState("");
  const [stockSalesZoom, setStockSalesZoom] = useState("100");
  const filteredStockSalesRows = useMemo(() => {
    const searchValue = stockSalesSearch.trim().toLowerCase();
    if (!searchValue) return stockSalesRows;
    return stockSalesRows.filter((row) =>
      Object.values(row || {}).some((value) =>
        String(value ?? "").toLowerCase().includes(searchValue)
      )
    );
  }, [stockSalesRows, stockSalesSearch]);
  const [purchaseAnalysisFilters, setPurchaseAnalysisFilters] = useState({
    companyCode: "",
    godownCode: "",
    fromDate: getFinancialYearStart(),
    toDate: getTodayDate(),
    actualInvoice: "no",
    discountDetails: "no",
    reportLevel: "all",
    reportWith: "category",
    orderBy: "productName",
  });
  const [purchaseAnalysisCriteria, setPurchaseAnalysisCriteria] = useState({ companies: [], godowns: [] });
  const [purchaseAnalysisRows, setPurchaseAnalysisRows] = useState([]);
  const [purchaseAnalysisLoading, setPurchaseAnalysisLoading] = useState(false);
  const [purchaseAnalysisGenerated, setPurchaseAnalysisGenerated] = useState(false);
  const [purchaseAnalysisError, setPurchaseAnalysisError] = useState("");
  const [purchaseAnalysisSearch, setPurchaseAnalysisSearch] = useState("");
  const [purchaseAnalysisZoom, setPurchaseAnalysisZoom] = useState("100");
  const filteredPurchaseAnalysisRows = useMemo(() => {
    const query = purchaseAnalysisSearch.trim().toLowerCase();
    if (!query) return purchaseAnalysisRows;
    return purchaseAnalysisRows.filter((row) => Object.values(row || {}).some((value) =>
      String(value ?? "").toLowerCase().includes(query)
    ));
  }, [purchaseAnalysisRows, purchaseAnalysisSearch]);

  const formatChequeDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString("en-IN");
  };

  const formatChequeAmount = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const findChequeDetails = async () => {
    const chequeNo = chequeSearch.trim();
    if (!chequeNo) {
      setChequeResult(null);
      setChequeError("Enter a cheque number.");
      return;
    }

    setChequeLoading(true);
    setChequeError("");
    try {
      const query = new URLSearchParams({ chequeNo });
      const response = await secureFetch(
        `${API_BASE_URL}/api/transaction/find-cheque-details?${query.toString()}`
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Cheque details could not be loaded.");
      }
      const data = result.data || {};
      const hasDetails = (data.summaries?.length || 0) +
        (data.unmatchedBounces?.length || 0) +
        (data.unmatchedDockets?.length || 0) > 0;
      setChequeResult(data);
      if (!hasDetails) setChequeError(`No information was found for cheque ${chequeNo}.`);
    } catch (error) {
      setChequeResult(null);
      setChequeError(error.message || "Cheque details could not be loaded.");
    } finally {
      setChequeLoading(false);
    }
  };

  const chequeExportRows = () => {
    const rows = [];
    (chequeResult?.summaries || []).forEach((summary) => {
      const base = {
        ChequeNo: chequeResult.chequeNo,
        Bank: summary.bankName,
        DrawerBank: summary.drawerBankName,
        Party: summary.partyName,
        ReceiptNo: summary.receiptNo,
        ReceiptDate: summary.receiptDate,
        ChequeDate: summary.chequeDate,
        ChequeAmount: summary.amount,
      };
      (summary.bills || []).forEach((bill) => rows.push({
        ...base,
        DetailType: "Adjusted Bill",
        Reference: `${bill.trnSeries || ""}-${bill.trnNo || ""}`,
        DetailDate: bill.trnDate || "",
        Amount: Number(bill.nowAdjust || 0),
        Remarks: bill.remark || "",
      }));
      (summary.bounces || []).forEach((bounce) => rows.push({
        ...base,
        DetailType: "Cheque Bounce",
        Reference: `${bounce.trnSeries || ""}-${bounce.trnNo || bounce.chqBounceNo || ""}`,
        DetailDate: bounce.chqBounceDate || "",
        Amount: Number(bounce.totalAmt || bounce.chequeAmt || 0),
        Remarks: bounce.narration || "",
      }));
      (summary.dockets || []).forEach((docket) => rows.push({
        ...base,
        DetailType: "PDC Docket",
        Reference: docket.docketNo,
        DetailDate: docket.depositDate || docket.addedAt || "",
        Amount: Number(docket.amount || 0),
        Remarks: docket.bankName || "",
      }));
      if (!(summary.bills?.length || summary.bounces?.length || summary.dockets?.length)) {
        rows.push({ ...base, DetailType: "Receipt", Reference: summary.receiptNo, Amount: summary.amount });
      }
    });
    (chequeResult?.unmatchedBounces || []).forEach((bounce) => rows.push({
      ChequeNo: chequeResult.chequeNo,
      Bank: bounce.bankName || "",
      Party: bounce.partyName || "",
      DetailType: "Cheque Bounce",
      Reference: `${bounce.trnSeries || ""}-${bounce.trnNo || bounce.chqBounceNo || ""}`,
      DetailDate: bounce.chqBounceDate || "",
      Amount: Number(bounce.totalAmt || bounce.chequeAmt || 0),
      Remarks: bounce.narration || "",
    }));
    (chequeResult?.unmatchedDockets || []).forEach((docket) => rows.push({
      ChequeNo: chequeResult.chequeNo,
      Bank: docket.bankName || "",
      Party: docket.partyName || "",
      DetailType: "PDC Docket",
      Reference: docket.docketNo,
      DetailDate: docket.depositDate || docket.addedAt || "",
      Amount: Number(docket.amount || 0),
      Remarks: docket.clearingType || "",
    }));
    return rows;
  };

  const exportChequeExcel = () => {
    const rows = chequeExportRows();
    const columns = Object.keys(rows[0] || {}).map((key) => ({ key, label: key }));
    const totalRow = { DetailType: "TOTAL", Amount: rows.reduce((total, row) => total + Number(row.Amount || 0), 0), RowType: "total" };
    const exportRows = rows.length ? [...rows, totalRow] : rows;
    const sheet = XLSX.utils.json_to_sheet(exportRows.map(({ RowType, ...row }) => row));
    applyMildTableStyle(sheet, columns, exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Cheque Details");
    XLSX.writeFile(workbook, `Cheque_${chequeResult.chequeNo}_Details.xlsx`, { cellStyles: true });
  };

  const exportChequePdf = () => {
    const rows = chequeExportRows();
    const pdf = new jsPDF({ orientation: "landscape" });
    pdf.setFontSize(15);
    pdf.text(`Cheque Details - ${chequeResult.chequeNo}`, 14, 14);
    autoTable(pdf, {
      startY: 20,
      head: [["Bank", "Party", "Receipt", "Receipt Date", "Type", "Reference", "Date", "Amount", "Remarks"]],
      body: rows.map((row) => [
        row.Bank || "-", row.Party || "-", row.ReceiptNo || "-",
        formatChequeDate(row.ReceiptDate), row.DetailType || "-", row.Reference || "-",
        formatChequeDate(row.DetailDate), formatChequeAmount(row.Amount), row.Remarks || "-",
      ]),
      styles: { fontSize: 7 },
    });
    pdf.save(`Cheque_${chequeResult.chequeNo}_Details.pdf`);
  };

  const generateP0Report = async () => {
    if (!isP0Report) return;
    setP0Loading(true); setP0Error("");
    try {
      const { distributorId, firmId } = getLoggedInContext();
      const query = new URLSearchParams();
      if (distributorId) query.set("distributorId", distributorId);
      if (firmId) query.set("firmId", firmId);
      Object.entries(p0Filters).forEach(([key, value]) => { if (String(value || "").trim()) query.set(key, value); });
      const response = await secureFetch(`${API_BASE_URL}${P0_REPORT_ENDPOINTS[selectedReport]}?${query}`);
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.message || "Report could not be generated.");
      const rows = Array.isArray(result.rows)
        ? result.rows
        : Object.entries(result.data || {}).flatMap(([key, value]) => Array.isArray(value)
          ? value.map((item) => ({ metric: key, ...(typeof item === "object" ? item : { value: item }) }))
          : [{ metric: key, value: typeof value === "object" ? JSON.stringify(value) : value }]);
      setP0Rows(rows); setP0Summary(result.summary || null);
      setP0Generated(true);
    } catch (error) { setP0Rows([]); setP0Summary(null); setP0Generated(false); setP0Error(error.message || "Report could not be generated."); }
    finally { setP0Loading(false); }
  };

  const p0ColumnDefinitions = useMemo(() => {
    const configured = FIXED_REPORT_COLUMNS[selectedReport];
    if (configured?.length) return configured.map(([key, label]) => ({ key, label }));
    const keys = [];
    p0Rows.forEach((row) => Object.keys(row || {}).forEach((key) => {
      if (!keys.includes(key) && !["_id", "__v", "before", "after", "editHistory"].includes(key)) keys.push(key);
    }));
    return keys.map((key) => ({ key, label: key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()) }));
  }, [p0Rows, selectedReport]);
  const p0Columns = p0ColumnDefinitions.map((column) => column.key);

  const exportP0Excel = () => {
    const numericKeys = p0ColumnDefinitions.filter((column) => (
      /(?:debit|credit|amount|balance|opening|closing|stockin|stockout|qty|value)/i.test(column.key)
      && p0Rows.some((row) => typeof row[column.key] === "number")
    )).map((column) => column.key);
    const totalRow = p0Rows.length ? Object.fromEntries(p0ColumnDefinitions.map((column, index) => [
      column.key,
      index === 0 ? "TOTAL" : numericKeys.includes(column.key) ? p0Rows.reduce((total, row) => total + Number(row[column.key] || 0), 0) : "",
    ])) : null;
    if (totalRow) totalRow.RowType = "total";
    const exportRows = totalRow ? [...p0Rows, totalRow] : p0Rows;
    const sheet = XLSX.utils.aoa_to_sheet([
      p0ColumnDefinitions.map((column) => column.label),
      ...exportRows.map((row) => p0ColumnDefinitions.map((column) => row[column.key] ?? "")),
    ]);
    applyMildTableStyle(sheet, p0ColumnDefinitions, exportRows);
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, "Report");
    XLSX.writeFile(workbook, `${selectedReport.replace(/[^a-z0-9]+/gi, "_")}.xlsx`, { cellStyles: true });
  };

  const exportP0Csv = () => {
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      p0ColumnDefinitions.map((column) => escapeCsv(column.label)).join(","),
      ...p0Rows.map((row) => p0Columns.map((key) => escapeCsv(row[key])).join(",")),
    ].join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedReport.replace(/[^a-z0-9]+/gi, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportP0Pdf = () => {
    const pdf = new jsPDF({ orientation: p0Columns.length > 7 ? "landscape" : "portrait" });
    pdf.text(selectedReport, 14, 14);
    autoTable(pdf, { head: [p0ColumnDefinitions.map((column) => column.label)], body: p0Rows.map((row) => p0Columns.map((key) => String(row[key] ?? ""))), startY: 20, styles: { fontSize: 7 } });
    pdf.save(`${selectedReport.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
  };
  const [reportCompanies, setReportCompanies] = useState([]);
  const [mappedParties, setMappedParties] = useState([]);
  const [mappedAreas, setMappedAreas] = useState([]);
  const [mappedSalesmen, setMappedSalesmen] = useState([]);
  const [isCriteriaLoading, setIsCriteriaLoading] = useState(false);
  const [criteriaLoadError, setCriteriaLoadError] = useState("");
  

  // =========================================================
  // PARTY WISE SALES REPORT STATE
  // =========================================================
  const [partySalesFilters, setPartySalesFilters] = useState(() => ({
    company: "",
    reportLevel: "salesSummary",
    selectedPartyCodes: [],
    selectedArea: "no",
    selectedAreaCodes: [],
    selectedSalesman: "no",
    selectedSalesmanCodes: [],
    productWise: "no",
    fromDate: getFinancialYearStart(),
    toDate: getTodayDate(),
    withCreditNote: "no",
    orderBy: "partyName",
  }));

  // =========================================================
  // COMPANY WISE PURCHASE REPORT STATE - MODERNIZED
  // =========================================================
  const [companyPurchaseFilters, setCompanyPurchaseFilters] = useState(() => ({
    company: "",
    fromDate: getFinancialYearStart(),
    toDate: getTodayDate(),
    supplier: "",
    selectedSupplierCodes: [],
    productWise: "no",
    godown: "all",
    selectedGodownCodes: [],
    withCreditNote: "no",
    orderBy: "companyName",
    reportLevel: "summary",
    includeTax: "yes",
    includeDiscount: "yes",
    actualInvoice: "no",
    discountDetails: "no",
  }));

  const [companyPurchaseRows, setCompanyPurchaseRows] = useState([]);
  const [companyPurchaseColumns, setCompanyPurchaseColumns] = useState([]);
  const [isCompanyPurchaseGenerated, setIsCompanyPurchaseGenerated] = useState(false);
  const [isCompanyPurchaseLoading, setIsCompanyPurchaseLoading] = useState(false);
  const [companyPurchaseError, setCompanyPurchaseError] = useState("");
  const [companyPurchaseSearch, setCompanyPurchaseSearch] = useState("");
  const [companyPurchaseZoom, setCompanyPurchaseZoom] = useState("100");
  const [companyPurchaseCurrentPage, setCompanyPurchaseCurrentPage] = useState(1);
  const [companyPurchaseRowsPerPage, setCompanyPurchaseRowsPerPage] = useState(10);
  const [showSupplierSelector, setShowSupplierSelector] = useState(false);
  const [showGodownSelector, setShowGodownSelector] = useState(false);
  const [supplierSelectorSearch, setSupplierSelectorSearch] = useState("");
  const [godownSelectorSearch, setGodownSelectorSearch] = useState("");
  const [purchaseProductList, setPurchaseProductList] = useState([]);
  const [isPurchaseCriteriaLoading, setIsPurchaseCriteriaLoading] = useState(false);
  const [purchaseCriteriaError, setPurchaseCriteriaError] = useState("");

  // =========================================================
  // HELPER FUNCTIONS FOR COMPANY PURCHASE REPORT
  // =========================================================
  const getSupplierCode = (supplier, index = "") =>
    String(
      supplier?.accountCode ||
        supplier?.AccountCode ||
        supplier?.code ||
        supplier?._id ||
        supplier?.id ||
        index
    );

  const getSupplierName = (supplier) =>
    String(
      supplier?.accountName ||
        supplier?.AccountName ||
        supplier?.name ||
        supplier?.partyName ||
        ""
    );

  const getGodownCode = (godown, index = "") =>
    String(
      godown?.godownCode ||
        godown?.GodownCode ||
        godown?.code ||
        godown?._id ||
        godown?.id ||
        index
    );

  const getGodownName = (godown) =>
    String(
      godown?.godownName ||
        godown?.GodownName ||
        godown?.name ||
        ""
    );

  // =========================================================
  // LOAD COMPANY PURCHASE CRITERIA
  // =========================================================
  const loadCompanyPurchaseCriteria = async (companyCode = "") => {
    try {
      setIsPurchaseCriteriaLoading(true);
      setPurchaseCriteriaError("");

      const { distributorId, firmId } = getLoggedInContext();

      if (!distributorId || !firmId) {
        throw new Error("Distributor or firm information is missing. Please login again.");
      }

      const query = new URLSearchParams({
        distributorId,
        firmId,
      });

      if (companyCode) {
        query.set("companyCode", companyCode);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/reports/company-purchase/criteria?${query.toString()}`
      );

      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : {
            success: false,
            message: await response.text(),
          };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load company purchase criteria.");
      }

      setReportCompanies(Array.isArray(result.companies) ? result.companies : []);
      setMappedParties(Array.isArray(result.suppliers) ? result.suppliers : []);
      setPurchaseProductList(Array.isArray(result.products) ? result.products : []);
      if (Array.isArray(result.godowns)) {
        setGodowns(result.godowns);
      }

      return result;
    } catch (error) {
      console.error("Company purchase criteria error:", error);
      setMappedParties([]);
      setPurchaseProductList([]);
      setPurchaseCriteriaError(error.message || "Failed to load company purchase criteria.");
      return null;
    } finally {
      setIsPurchaseCriteriaLoading(false);
    }
  };

  // =========================================================
  // LOAD COMPANY PURCHASE CRITERIA ON MOUNT
  // =========================================================
  useEffect(() => {
    if (selectedReport !== "Company Wise Purchase Report") {
      return;
    }
    loadCompanyPurchaseCriteria(companyPurchaseFilters.company);
  }, [selectedReport, companyPurchaseFilters.company]);

  // =========================================================
  // UPDATE FILTERS
  // =========================================================
  const updateCompanyPurchaseFilter = (field, value) => {
    setCompanyPurchaseFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
    setIsCompanyPurchaseGenerated(false);
    setCompanyPurchaseRows([]);
    setCompanyPurchaseError("");
    setCompanyPurchaseCurrentPage(1);
  };

  // =========================================================
  // TOGGLE HELPERS
  // =========================================================
  const toggleSupplierSelection = (supplierCode, checked) => {
    setCompanyPurchaseFilters((prev) => {
      const currentValues = prev.selectedSupplierCodes || [];
      const nextValues = checked
        ? [...new Set([...currentValues, supplierCode])]
        : currentValues.filter((code) => code !== supplierCode);
      return { ...prev, selectedSupplierCodes: nextValues };
    });
    setIsCompanyPurchaseGenerated(false);
    setCompanyPurchaseRows([]);
  };

  const toggleAllSuppliers = (checked) => {
    setCompanyPurchaseFilters((prev) => ({
      ...prev,
      selectedSupplierCodes: checked
        ? mappedParties.map((supplier, index) => getSupplierCode(supplier, index))
        : [],
    }));
    setIsCompanyPurchaseGenerated(false);
    setCompanyPurchaseRows([]);
  };

  const toggleGodownSelection = (godownCode, checked) => {
    setCompanyPurchaseFilters((prev) => {
      const currentValues = prev.selectedGodownCodes || [];
      const nextValues = checked
        ? [...new Set([...currentValues, godownCode])]
        : currentValues.filter((code) => code !== godownCode);
      return { ...prev, selectedGodownCodes: nextValues };
    });
    setIsCompanyPurchaseGenerated(false);
    setCompanyPurchaseRows([]);
  };

  const toggleAllGodowns = (checked) => {
    setCompanyPurchaseFilters((prev) => ({
      ...prev,
      selectedGodownCodes: checked
        ? godowns.map((godown, index) => getGodownCode(godown, index))
        : [],
    }));
    setIsCompanyPurchaseGenerated(false);
    setCompanyPurchaseRows([]);
  };

  // =========================================================
  // ✅ MOVED normalizeText HERE - before any useMemo hooks
  // =========================================================
  const normalizeText = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();
  // =========================================================
  // VISIBLE OPTIONS FOR SELECTORS
  // =========================================================
  const visibleSupplierOptions = useMemo(() => {
    const search = normalizeText(supplierSelectorSearch);
    return mappedParties.filter((supplier, index) => {
      if (!search) return true;
      const code = getSupplierCode(supplier, index);
      const name = getSupplierName(supplier);
      return [code, name].some((value) =>
        normalizeText(value).includes(search)
      );
    });
  }, [mappedParties, supplierSelectorSearch]);

  const visibleGodownOptions = useMemo(() => {
    const search = normalizeText(godownSelectorSearch);
    return godowns.filter((godown, index) => {
      if (!search) return true;
      const code = getGodownCode(godown, index);
      const name = getGodownName(godown);
      return [code, name].some((value) =>
        normalizeText(value).includes(search)
      );
    });
  }, [godowns, godownSelectorSearch]);

  // =========================================================
  // SELECTED SUPPLIER NAMES
  // =========================================================
  const selectedSupplierNames = useMemo(() => {
    return (companyPurchaseFilters.selectedSupplierCodes || [])
      .map((selectedCode) => {
        const supplier = mappedParties.find(
          (s, index) => getSupplierCode(s, index) === selectedCode
        );
        return supplier ? getSupplierName(supplier) : "";
      })
      .filter(Boolean);
  }, [companyPurchaseFilters.selectedSupplierCodes, mappedParties]);

  // =========================================================
  // CLEAR FILTERS
  // =========================================================
  const clearCompanyPurchaseFilters = () => {
    setCompanyPurchaseFilters({
      company: "",
      fromDate: getFinancialYearStart(),
      toDate: getTodayDate(),
      supplier: "",
      selectedSupplierCodes: [],
      productWise: "no",
      godown: "all",
      selectedGodownCodes: [],
      withCreditNote: "no",
      orderBy: "companyName",
      reportLevel: "summary",
      includeTax: "yes",
      includeDiscount: "yes",
      actualInvoice: "no",
      discountDetails: "no",
    });
    setCompanyPurchaseRows([]);
    setCompanyPurchaseColumns([]);
    setCompanyPurchaseSearch("");
    setSupplierSelectorSearch("");
    setGodownSelectorSearch("");
    setShowSupplierSelector(false);
    setShowGodownSelector(false);
    setCompanyPurchaseCurrentPage(1);
    setCompanyPurchaseError("");
    setIsCompanyPurchaseGenerated(false);
  };

  // =========================================================
  // GENERATE COMPANY WISE PURCHASE REPORT
  // =========================================================
  const generateCompanyPurchaseReport = async () => {
    try {
      setCompanyPurchaseError("");
      setCompanyPurchaseRows([]);
      setCompanyPurchaseColumns([]);

      const { distributorId, firmId } = getLoggedInContext();

      if (!distributorId || !firmId) {
        throw new Error("Distributor or firm information is missing. Please login again.");
      }

      if (!companyPurchaseFilters.fromDate || !companyPurchaseFilters.toDate) {
        throw new Error("From Date and To Date are required.");
      }

      if (companyPurchaseFilters.fromDate > companyPurchaseFilters.toDate) {
        throw new Error("From Date cannot be greater than To Date.");
      }

      setIsCompanyPurchaseLoading(true);

      const query = new URLSearchParams({
        distributorId,
        firmId,
        companyCode: companyPurchaseFilters.company || "",
        fromDate: companyPurchaseFilters.fromDate,
        toDate: companyPurchaseFilters.toDate,
        productWise: companyPurchaseFilters.productWise,
        withCreditNote: companyPurchaseFilters.withCreditNote,
        orderBy: companyPurchaseFilters.orderBy,
        reportLevel: companyPurchaseFilters.reportLevel,
        includeTax: companyPurchaseFilters.includeTax,
        includeDiscount: companyPurchaseFilters.includeDiscount,
        actualInvoice: companyPurchaseFilters.actualInvoice,
        discountDetails: companyPurchaseFilters.discountDetails,
      });

      if (companyPurchaseFilters.selectedSupplierCodes.length > 0) {
        query.set("selectedSupplierCodes", companyPurchaseFilters.selectedSupplierCodes.join(","));
      }

      if (companyPurchaseFilters.godown === "yes" && companyPurchaseFilters.selectedGodownCodes.length > 0) {
        query.set("selectedGodownCodes", companyPurchaseFilters.selectedGodownCodes.join(","));
      }

      const response = await fetch(
        `${API_BASE_URL}/api/reports/company-wise-purchase?${query.toString()}`
      );

      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : {
            success: false,
            message: await response.text(),
          };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to generate company wise purchase report.");
      }

      const data = Array.isArray(result.data) ? result.data : [];

      const rows = data.map((row, index) => ({
        rowId: row._id || `row-${index}`,
        SrNo: row.SrNo || index + 1,
        BillDate: row.BillDate || "",
        BillSeries: row.BillSeries || "",
        BillNo: row.BillNo ?? "",
        SupplierCode: row.SupplierCode || "",
        SupplierName: row.SupplierName || "",
        ProductCode: row.ProductCode || "",
        ProductName: row.ProductName || "",
        Batch: row.Batch || "",
        MRP: Number(row.MRP || 0),
        PurchaseRate: Number(row.PurchaseRate || 0),
        Qty: Number(row.Qty || 0),
        FreeQty: Number(row.FreeQty || 0),
        GrossAmount: Number(row.GrossAmount || 0),
        Discount: Number(row.Discount || 0),
        DiscountPercent: Number(row.DiscountPercent || 0),
        TaxableAmount: Number(row.TaxableAmount || 0),
        TaxAmount: Number(row.TaxAmount || 0),
        TaxPercent: Number(row.TaxPercent || 0),
        NetAmount: Number(row.NetAmount || 0),
        GodownName: row.GodownName || "",
        PurchaseOrderNo: row.PurchaseOrderNo || "",
        ChallanNo: row.ChallanNo || "",
        EwayBillNo: row.EwayBillNo || "",
        TransportMode: row.TransportMode || "",
        Remarks: row.Remarks || "",
      }));

      const columns = [
        { key: "SrNo", label: "Sr No.", type: "number" },
        { key: "BillDate", label: "Bill Date", type: "string" },
        { key: "BillSeries", label: "Series", type: "string" },
        { key: "BillNo", label: "Bill No", type: "string" },
        { key: "SupplierCode", label: "Supplier Code", type: "string" },
        { key: "SupplierName", label: "Supplier Name", type: "string" },
        { key: "ProductCode", label: "Product Code", type: "string" },
        { key: "ProductName", label: "Product Name", type: "string" },
        { key: "Batch", label: "Batch", type: "string" },
        { key: "MRP", label: "MRP", type: "number" },
        { key: "PurchaseRate", label: "Purchase Rate", type: "number" },
        { key: "Qty", label: "Qty", type: "number" },
        { key: "FreeQty", label: "Free Qty", type: "number" },
        { key: "GrossAmount", label: "Gross Amount", type: "number" },
        { key: "Discount", label: "Discount", type: "number" },
        { key: "DiscountPercent", label: "Disc %", type: "number" },
        { key: "TaxableAmount", label: "Taxable Amount", type: "number" },
        { key: "TaxAmount", label: "Tax Amount", type: "number" },
        { key: "TaxPercent", label: "Tax %", type: "number" },
        { key: "NetAmount", label: "Net Amount", type: "number" },
        { key: "GodownName", label: "Godown", type: "string" },
        { key: "PurchaseOrderNo", label: "PO No", type: "string" },
        { key: "ChallanNo", label: "Challan No", type: "string" },
        { key: "EwayBillNo", label: "E-Way Bill", type: "string" },
        { key: "TransportMode", label: "Transport", type: "string" },
        { key: "Remarks", label: "Remarks", type: "string" },
      ];

      setCompanyPurchaseRows(rows);
      setCompanyPurchaseColumns(columns);
      setCompanyPurchaseCurrentPage(1);
      setIsCompanyPurchaseGenerated(true);

      if (rows.length === 0) {
        setCompanyPurchaseError("No purchase records were found for the selected criteria.");
      }
    } catch (error) {
      console.error("Company purchase report generation error:", error);
      setCompanyPurchaseRows([]);
      setCompanyPurchaseColumns([]);
      setIsCompanyPurchaseGenerated(false);
      setCompanyPurchaseError(error.message || "Failed to generate company wise purchase report.");
    } finally {
      setIsCompanyPurchaseLoading(false);
    }
  };

  // =========================================================
  // COMPANY PURCHASE REPORT - FILTERED ROWS & TOTALS
  // =========================================================
  const filteredCompanyPurchaseRows = useMemo(() => {
    const search = normalizeText(companyPurchaseSearch);
    if (!search) return companyPurchaseRows;
    return companyPurchaseRows.filter((row) =>
      Object.values(row).some((value) =>
        normalizeText(value).includes(search)
      )
    );
  }, [companyPurchaseRows, companyPurchaseSearch]);

  const companyPurchaseTotals = useMemo(() => {
    return filteredCompanyPurchaseRows.reduce(
      (total, row) => ({
        Qty: total.Qty + Number(row.Qty || 0),
        FreeQty: total.FreeQty + Number(row.FreeQty || 0),
        GrossAmount: total.GrossAmount + Number(row.GrossAmount || 0),
        Discount: total.Discount + Number(row.Discount || 0),
        TaxableAmount: total.TaxableAmount + Number(row.TaxableAmount || 0),
        TaxAmount: total.TaxAmount + Number(row.TaxAmount || 0),
        NetAmount: total.NetAmount + Number(row.NetAmount || 0),
      }),
      {
        Qty: 0,
        FreeQty: 0,
        GrossAmount: 0,
        Discount: 0,
        TaxableAmount: 0,
        TaxAmount: 0,
        NetAmount: 0,
      }
    );
  }, [filteredCompanyPurchaseRows]);

  // =========================================================
  // COMPANY PURCHASE REPORT - PAGINATION
  // =========================================================
  const companyPurchaseTotalPages = Math.max(
    1,
    Math.ceil(filteredCompanyPurchaseRows.length / companyPurchaseRowsPerPage)
  );
  const companyPurchaseSafeCurrentPage = Math.min(companyPurchaseCurrentPage, companyPurchaseTotalPages);
  const companyPurchasePageStart = (companyPurchaseSafeCurrentPage - 1) * companyPurchaseRowsPerPage;
  const companyPurchasePageRows = filteredCompanyPurchaseRows.slice(
    companyPurchasePageStart,
    companyPurchasePageStart + companyPurchaseRowsPerPage
  );

  // =========================================================
  // COMPANY PURCHASE REPORT - EXPORT FUNCTIONS
  // =========================================================
  const formatCompanyPurchaseValue = (column, value) => {
    if (value === undefined || value === null || value === "") return "";
    if (column.type === "number") return formatReportNumber(value);
    if (column.key === "BillDate") {
      const rawDate = String(value).trim();
      if (!rawDate) return "";
      const dateOnly = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
      const parts = dateOnly.split("-");
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      return rawDate;
    }
    return String(value);
  };

  const getCompanyPurchaseTotalValue = (column, columnIndex, totals) => {
    if (columnIndex === 0) return "TOTAL";
    const totalFieldMap = {
      Qty: "Qty",
      FreeQty: "FreeQty",
      GrossAmount: "GrossAmount",
      Discount: "Discount",
      TaxableAmount: "TaxableAmount",
      TaxAmount: "TaxAmount",
      NetAmount: "NetAmount",
    };
    const totalField = totalFieldMap[column.key];
    if (!totalField) return "";
    return Number(totals[totalField] || 0);
  };

  const validateCompanyPurchaseExport = () => {
    if (!isCompanyPurchaseGenerated) {
      setCompanyPurchaseError("Please generate the report before exporting.");
      return false;
    }
    if (companyPurchaseColumns.length === 0) {
      setCompanyPurchaseError("Report columns are not available.");
      return false;
    }
    if (filteredCompanyPurchaseRows.length === 0) {
      setCompanyPurchaseError("No report records are available to export.");
      return false;
    }
    setCompanyPurchaseError("");
    return true;
  };

  const getCompanyPurchaseExportValue = (column, value) => {
    if (value === undefined || value === null) return "";
    if (column.type === "number") {
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : 0;
    }
    return String(value);
  };

  const exportCompanyPurchaseToExcel = () => {
    try {
      if (!validateCompanyPurchaseExport()) return;

      const companyName = getSelectedCompanyName();
      const firmDetails = getLoggedInFirmDetails();
      const workbook = XLSX.utils.book_new();
      const columnCount = Math.max(companyPurchaseColumns.length, 1);
      const worksheetData = [];

      worksheetData.push([firmDetails.firmName || "Firm Name"]);
      worksheetData.push(["Company Wise Purchase Report"]);
      worksheetData.push([
        "Company",
        companyName,
        "Report Level",
        companyPurchaseFilters.reportLevel === "details" ? "Details" : "Summary"
      ]);
      worksheetData.push([
        "Period",
        `${companyPurchaseFilters.fromDate} to ${companyPurchaseFilters.toDate}`,
        "Records",
        filteredCompanyPurchaseRows.length,
      ]);
      worksheetData.push([]);

      const tableHeaderRowIndex = worksheetData.length;
      worksheetData.push(companyPurchaseColumns.map((column) => column.label || column.key));

      filteredCompanyPurchaseRows.forEach((row) => {
        worksheetData.push(
          companyPurchaseColumns.map((column) =>
            getCompanyPurchaseExportValue(column, row[column.key])
          )
        );
      });

      const totalRowIndex = worksheetData.length;
      worksheetData.push(
        companyPurchaseColumns.map((column, columnIndex) =>
          getCompanyPurchaseTotalValue(column, columnIndex, companyPurchaseTotals)
        )
      );

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      const thinBorder = {
        top: { style: "thin", color: { rgb: "9FB9C8" } },
        bottom: { style: "thin", color: { rgb: "9FB9C8" } },
        left: { style: "thin", color: { rgb: "9FB9C8" } },
        right: { style: "thin", color: { rgb: "9FB9C8" } },
      };

      const firmNameStyle = {
        font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "124F78" } },
        alignment: { horizontal: "center", vertical: "center" },
      };

      const reportTitleStyle = {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "F79646" } },
        alignment: { horizontal: "center", vertical: "center" },
      };

      const informationLabelStyle = {
        font: { bold: true, color: { rgb: "163D5C" } },
        fill: { patternType: "solid", fgColor: { rgb: "D7EAF5" } },
        alignment: { vertical: "center" },
        border: thinBorder,
      };

      const informationValueStyle = {
        font: { color: { rgb: "263E50" } },
        fill: { patternType: "solid", fgColor: { rgb: "F7FBFD" } },
        alignment: { vertical: "center", wrapText: true },
        border: thinBorder,
      };

      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "267BB3" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: thinBorder,
      };

      const oddRowStyle = {
        fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
        alignment: { vertical: "center" },
        border: thinBorder,
      };

      const evenRowStyle = {
        fill: { patternType: "solid", fgColor: { rgb: "EAF5FB" } },
        alignment: { vertical: "center" },
        border: thinBorder,
      };

      const totalStyle = {
        font: { bold: true, color: { rgb: "163D5C" } },
        fill: { patternType: "solid", fgColor: { rgb: "B7D6EA" } },
        alignment: { vertical: "center" },
        border: thinBorder,
      };

      const firmNameCell = worksheet["A1"];
      if (firmNameCell) firmNameCell.s = firmNameStyle;

      const reportTitleCell = worksheet["A2"];
      if (reportTitleCell) reportTitleCell.s = reportTitleStyle;

      [2, 3].forEach((rowIndex) => {
        [0, 2].forEach((labelColumnIndex) => {
          const labelCellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: labelColumnIndex });
          if (worksheet[labelCellAddress]) {
            worksheet[labelCellAddress].s = informationLabelStyle;
          }
        });
        [1, 3].forEach((valueColumnIndex) => {
          const valueCellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: valueColumnIndex });
          if (worksheet[valueCellAddress]) {
            worksheet[valueCellAddress].s = informationValueStyle;
          }
        });
      });

      companyPurchaseColumns.forEach((_, columnIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: tableHeaderRowIndex, c: columnIndex });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = headerStyle;
        }
      });

      const dataStartRowIndex = tableHeaderRowIndex + 1;
      const dataEndRowIndex = totalRowIndex - 1;

      for (let rowIndex = dataStartRowIndex; rowIndex <= dataEndRowIndex; rowIndex += 1) {
        const isEvenRow = (rowIndex - dataStartRowIndex) % 2 === 1;
        companyPurchaseColumns.forEach((column, columnIndex) => {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
          if (!worksheet[cellAddress]) {
            worksheet[cellAddress] = { t: "s", v: "" };
          }
          worksheet[cellAddress].s = {
            ...(isEvenRow ? evenRowStyle : oddRowStyle),
            alignment: {
              horizontal: column.type === "number" ? "right" : "left",
              vertical: "center",
            },
            numFmt: column.type === "number" ? "#,##0.00" : "General",
          };
        });
      }

      companyPurchaseColumns.forEach((column, columnIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: totalRowIndex, c: columnIndex });
        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { t: "s", v: "" };
        }
        worksheet[cellAddress].s = {
          ...totalStyle,
          alignment: {
            horizontal: column.type === "number" ? "right" : "left",
            vertical: "center",
          },
          numFmt: column.type === "number" ? "#,##0.00" : "General",
        };
      });

      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: columnCount - 1 } },
      ];

      worksheet["!cols"] = companyPurchaseColumns.map((column) => {
        const labelLength = String(column.label || "").length;
        let width = column.type === "number" ? 14 : Math.max(12, Math.min(35, labelLength + 5));
        if (column.key === "SupplierName" || column.key === "ProductName") width = 28;
        if (column.key === "BillDate" || column.key === "Batch") width = 14;
        return { wch: width };
      });

      worksheet["!freeze"] = {
        xSplit: 0,
        ySplit: tableHeaderRowIndex + 1,
        topLeftCell: `A${tableHeaderRowIndex + 2}`,
        activePane: "bottomLeft",
        state: "frozen",
      };

      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: tableHeaderRowIndex, c: 0 },
          e: { r: dataEndRowIndex, c: columnCount - 1 },
        }),
      };

      XLSX.utils.book_append_sheet(workbook, worksheet, "Company Purchase");

      const fileName = sanitizeExportFileName(
        `Company_Wise_Purchase_${companyName}_${companyPurchaseFilters.fromDate}_${companyPurchaseFilters.toDate}`
      );

      XLSX.writeFile(workbook, `${fileName}.xlsx`, { cellStyles: true });
    } catch (error) {
      console.error("Excel export error:", error);
      setCompanyPurchaseError(error.message || "Failed to export Excel report.");
    }
  };

  const exportCompanyPurchaseToCsv = () => {
    try {
      if (!validateCompanyPurchaseExport()) return;

      const companyName = getSelectedCompanyName();
      const firmDetails = getLoggedInFirmDetails();
      const csvRows = [];

      csvRows.push([firmDetails.firmName || "Firm Name"]);
      csvRows.push(["Company Wise Purchase Report"]);
      csvRows.push(["Company", companyName, "Report Level", companyPurchaseFilters.reportLevel === "details" ? "Details" : "Summary"]);
      csvRows.push([
        "Period",
        `${companyPurchaseFilters.fromDate} to ${companyPurchaseFilters.toDate}`,
        "Records",
        filteredCompanyPurchaseRows.length,
      ]);
      csvRows.push([]);
      csvRows.push(companyPurchaseColumns.map((column) => column.label || column.key));

      filteredCompanyPurchaseRows.forEach((row) => {
        csvRows.push(
          companyPurchaseColumns.map((column) =>
            getCompanyPurchaseExportValue(column, row[column.key])
          )
        );
      });

      csvRows.push(
        companyPurchaseColumns.map((column, columnIndex) =>
          getCompanyPurchaseTotalValue(column, columnIndex, companyPurchaseTotals)
        )
      );

      const escapeCsvValue = (value) => {
        const text = String(value ?? "");
        return `"${text.replace(/"/g, '""')}"`;
      };

      const csvContent =
        "\uFEFF" +
        csvRows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");

      const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const csvUrl = URL.createObjectURL(csvBlob);
      const downloadLink = document.createElement("a");
      const fileName = sanitizeExportFileName(
        `Company_Wise_Purchase_${companyName}_${companyPurchaseFilters.fromDate}_${companyPurchaseFilters.toDate}`
      );

      downloadLink.href = csvUrl;
      downloadLink.download = `${fileName}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(csvUrl);
    } catch (error) {
      console.error("CSV export error:", error);
      setCompanyPurchaseError(error.message || "Failed to export CSV report.");
    }
  };

  const exportCompanyPurchaseToPdf = () => {
    try {
      if (!validateCompanyPurchaseExport()) return;

      const companyName = getSelectedCompanyName();

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: companyPurchaseColumns.length > 12 ? "a3" : "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.setFontSize(15);
      pdf.text("Company Wise Purchase Report", pageWidth / 2, 12, { align: "center" });
      pdf.setFontSize(8.5);
      pdf.text(`Company: ${companyName}`, 10, 19);
      pdf.text(`Report Level: ${companyPurchaseFilters.reportLevel === "details" ? "Details" : "Summary"}`, 10, 24);
      pdf.text(
        `Period: ${companyPurchaseFilters.fromDate} to ${companyPurchaseFilters.toDate}`,
        10,
        29
      );
      pdf.text(`Records: ${filteredCompanyPurchaseRows.length}`, pageWidth - 10, 19, {
        align: "right",
      });

      const tableHead = [companyPurchaseColumns.map((column) => column.label)];
      const tableBody = filteredCompanyPurchaseRows.map((row) =>
        companyPurchaseColumns.map((column) =>
          formatCompanyPurchaseValue(column, row[column.key])
        )
      );

      const totalsRow = companyPurchaseColumns.map((column, columnIndex) => {
        const value = getCompanyPurchaseTotalValue(column, columnIndex, companyPurchaseTotals);
        if (column.type === "number" && value !== "") return formatReportNumber(value);
        return value;
      });
      tableBody.push(totalsRow);

      const columnStyles = {};
      companyPurchaseColumns.forEach((column, index) => {
        columnStyles[index] = {
          halign: column.type === "number" ? "right" : "left",
          cellWidth: "auto",
        };
      });

      autoTable(pdf, {
        startY: 34,
        head: tableHead,
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize: companyPurchaseColumns.length > 15 ? 5 : 6.5,
          cellPadding: 1.2,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: { fontStyle: "bold", halign: "center" },
        columnStyles,
        didParseCell: (data) => {
          const isTotalRow =
            data.section === "body" && data.row.index === tableBody.length - 1;
          if (isTotalRow) {
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage: () => {
          const pageNumber = pdf.internal.getNumberOfPages();
          const pageHeight = pdf.internal.pageSize.getHeight();
          pdf.setFontSize(7);
          pdf.text(`Page ${pageNumber}`, pageWidth - 10, pageHeight - 5, {
            align: "right",
          });
        },
      });

      const fileName = sanitizeExportFileName(
        `Company_Wise_Purchase_${companyName}_${companyPurchaseFilters.fromDate}_${companyPurchaseFilters.toDate}`
      );
      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("PDF export error:", error);
      setCompanyPurchaseError(error.message || "Failed to export PDF report.");
    }
  };

  const printCompanyPurchaseReport = () => {
    try {
      if (!validateCompanyPurchaseExport()) return;

      const companyName = getSelectedCompanyName();

      const tableHeaders = companyPurchaseColumns
        .map(
          (column) => `
            <th class="${column.type === "number" ? "number-cell" : ""}">
              ${escapePrintHtml(column.label)}
            </th>
          `
        )
        .join("");

      const tableRows = filteredCompanyPurchaseRows
        .map(
          (row) => `
            <tr>
              ${companyPurchaseColumns
                .map(
                  (column) => `
                    <td class="${column.type === "number" ? "number-cell" : ""}">
                      ${escapePrintHtml(formatCompanyPurchaseValue(column, row[column.key]))}
                    </td>
                  `
                )
                .join("")}
            </tr>
          `
        )
        .join("");

      const totalsCells = companyPurchaseColumns
        .map((column, columnIndex) => {
          const value = getCompanyPurchaseTotalValue(column, columnIndex, companyPurchaseTotals);
          const displayValue =
            column.type === "number" && value !== "" ? formatReportNumber(value) : value;
          return `
            <td class="${column.type === "number" ? "number-cell" : ""}">
              ${escapePrintHtml(displayValue)}
            </td>
          `;
        })
        .join("");

      const printWindow = window.open("", "_blank", "width=1400,height=900");
      if (!printWindow) {
        throw new Error("Print window was blocked. Please allow pop-ups for this website.");
      }

      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Company Wise Purchase Report</title>
            <style>
              @page { size: landscape; margin: 8mm; }
              * { box-sizing: border-box; }
              body {
                margin: 0;
                color: #111827;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 10px;
              }
              .report-header { margin-bottom: 10px; text-align: center; }
              .report-header h1 { margin: 0 0 6px; font-size: 18px; }
              .report-information {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                gap: 5px 18px;
                border: 1px solid #9ca3af;
                padding: 6px 8px;
                text-align: left;
              }
              .report-information span { white-space: nowrap; }
              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: auto;
              }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
              tr { break-inside: avoid; page-break-inside: avoid; }
              th, td {
                border: 1px solid #6b7280;
                padding: 3px 4px;
                vertical-align: middle;
                overflow-wrap: anywhere;
              }
              th {
                background: #e5e7eb;
                font-weight: 700;
                text-align: center;
                white-space: nowrap;
              }
              tbody tr:nth-child(even) { background: #f9fafb; }
              tfoot td { background: #e5e7eb; font-weight: 700; }
              .number-cell { text-align: right; white-space: nowrap; }
              .print-footer { margin-top: 7px; text-align: right; font-size: 9px; }
              @media print {
                body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="report-header">
              <h1>Company Wise Purchase Report</h1>
              <div class="report-information">
                <span><strong>Company:</strong> ${escapePrintHtml(companyName)}</span>
                <span><strong>Level:</strong> ${escapePrintHtml(companyPurchaseFilters.reportLevel === "details" ? "Details" : "Summary")}</span>
                <span><strong>Period:</strong> ${escapePrintHtml(companyPurchaseFilters.fromDate)} to ${escapePrintHtml(companyPurchaseFilters.toDate)}</span>
                <span><strong>Records:</strong> ${filteredCompanyPurchaseRows.length}</span>
              </div>
            </div>
            <table>
              <thead><tr>${tableHeaders}</tr></thead>
              <tbody>${tableRows}</tbody>
              <tfoot><tr>${totalsCells}</tr></tfoot>
            </table>
            <div class="print-footer">
              Printed on: ${escapePrintHtml(new Date().toLocaleString("en-IN"))}
            </div>
            <script>
              window.addEventListener("load", function () {
                window.focus();
                setTimeout(function () { window.print(); }, 300);
              });
              window.addEventListener("afterprint", function () { window.close(); });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("Print report error:", error);
      setCompanyPurchaseError(error.message || "Failed to print report.");
    }
  };

  // =========================================================
  // PRODUCT SELECTOR COMPONENT
  // =========================================================
  const getProductOptionCode = (product, index = "") =>
    String(
      product?.productCode ||
        product?.ProductCode ||
        product?.code ||
        product?._id ||
        product?.id ||
        index
    );

  const getProductOptionName = (product) =>
    String(
      product?.productName ||
        product?.ProductName ||
        product?.name ||
        ""
    );

  // =========================================================
  // PRODUCT WISE SALES REPORT STATE - SIMPLIFIED
  // =========================================================
  const [productReportFilters, setProductReportFilters] = useState(() => ({
    company: "",
    selectedProductCodes: [],
    fromDate: getFinancialYearStart(),
    toDate: getTodayDate(),
    selectedArea: "no",
    selectedAreaCodes: [],
    selectedSalesman: "no",
    selectedSalesmanCodes: [],
    withCreditNote: "no",
    orderBy: "productName",
    showZeroSales: "no",
  }));

  const [showProductSelector, setShowProductSelector] = useState(false);
  const [productSelectorSearch, setProductSelectorSearch] = useState("");
  const [reportProductList, setReportProductList] = useState([]);
  const [isProductCriteriaLoading, setIsProductCriteriaLoading] = useState(false);
  const [productCriteriaError, setProductCriteriaError] = useState("");

  const [partyReportRows, setPartyReportRows] = useState([]);
  const [partyReportColumns, setPartyReportColumns] = useState([]);
  const [isPartyReportGenerated, setIsPartyReportGenerated] = useState(false);
  const [isPartyReportLoading, setIsPartyReportLoading] = useState(false);
  const [partyReportError, setPartyReportError] = useState("");
  const [partyReportSearch, setPartyReportSearch] = useState("");
  const [partyReportZoom, setPartyReportZoom] = useState("100");
  const [partyCurrentPage, setPartyCurrentPage] = useState(1);
  const [partyRowsPerPage, setPartyRowsPerPage] = useState(10);
  const [showAdvancedPartyFilters, setShowAdvancedPartyFilters] = useState(false);
  const [showPartySelector, setShowPartySelector] = useState(false);
  const [showAreaSelector, setShowAreaSelector] = useState(false);
  const [showSalesmanSelector, setShowSalesmanSelector] = useState(false);
  const [partySelectorSearch, setPartySelectorSearch] = useState("");
  const [areaSelectorSearch, setAreaSelectorSearch] = useState("");
  const [salesmanSelectorSearch, setSalesmanSelectorSearch] = useState("");

  // =========================================================
  // ALL PARTY WISE SALES REPORT STATE
  // =========================================================
  const [allPartySalesFilters, setAllPartySalesFilters] = useState(() => ({
    company: "",
    reportLevel: "salesSummary",
    selectedArea: "no",
    selectedAreaCodes: [],
    selectedSalesman: "no",
    selectedSalesmanCodes: [],
    productWise: "no",
    fromDate: getFinancialYearStart(),
    toDate: getTodayDate(),
    withCreditNote: "no",
    orderBy: "partyName",
    billWiseSalesman: "no",
    freeValueOn: "PRate",
  }));

  const [allPartyReportRows, setAllPartyReportRows] = useState([]);
  const [allPartyReportColumns, setAllPartyReportColumns] = useState([]);
  const [isAllPartyReportGenerated, setIsAllPartyReportGenerated] = useState(false);
  const [isAllPartyReportLoading, setIsAllPartyReportLoading] = useState(false);
  const [allPartyReportError, setAllPartyReportError] = useState("");
  const [allPartyReportSearch, setAllPartyReportSearch] = useState("");
  const [allPartyReportZoom, setAllPartyReportZoom] = useState("100");
  const [allPartyCurrentPage, setAllPartyCurrentPage] = useState(1);
  const [allPartyRowsPerPage, setAllPartyRowsPerPage] = useState(10);
  const [showAllAreaSelector, setShowAllAreaSelector] = useState(false);
  const [showAllSalesmanSelector, setShowAllSalesmanSelector] = useState(false);
  const [allAreaSelectorSearch, setAllAreaSelectorSearch] = useState("");
  const [allSalesmanSelectorSearch, setAllSalesmanSelectorSearch] = useState("");

  const [productReportRows, setProductReportRows] = useState([]);
  const [productReportColumns, setProductReportColumns] = useState([]);
  const [isProductReportGenerated, setIsProductReportGenerated] = useState(false);
  const [isProductReportLoading, setIsProductReportLoading] = useState(false);
  const [productReportError, setProductReportError] = useState("");
  const [productReportSearch, setProductReportSearch] = useState("");
  const [productReportZoom, setProductReportZoom] = useState("100");

  const [allProductReportFilters, setAllProductReportFilters] = useState(() => ({
    company: "",
    productGroup: "",
    category: "",
    brand: "",
    fromDate: getFinancialYearStart(),
    toDate: getTodayDate(),
    selectedArea: "no",
    selectedAreaCodes: [],
    selectedSalesman: "no",
    selectedSalesmanCodes: [],
    billWiseSalesman: "no",
    withCreditNote: "no",
    orderBy: "productName",
    showZeroSales: "no",
    reportLevel: "units",
    valuationBy: "basicRate",
    salesType: "onlySales",
    reportOn: "productName",
  }));

  const [allProductReportRows, setAllProductReportRows] = useState([]);
  const [allProductReportColumns, setAllProductReportColumns] = useState([]);
  const [isAllProductReportGenerated, setIsAllProductReportGenerated] = useState(false);
  const [isAllProductReportLoading, setIsAllProductReportLoading] = useState(false);
  const [allProductReportError, setAllProductReportError] = useState("");
  const [allProductReportSearch, setAllProductReportSearch] = useState("");
  const [allProductReportZoom, setAllProductReportZoom] = useState("100");


  // =========================================================
  // useMemo hooks that use normalizeText
  // =========================================================
  const filteredAllProductReportRows = useMemo(() => {
    const search = normalizeText(allProductReportSearch);
    if (!search) return allProductReportRows;
    return allProductReportRows.filter((row) =>
      Object.values(row).some((value) =>
        normalizeText(value).includes(search)
      )
    );
  }, [allProductReportRows, allProductReportSearch]);

  const allProductReportTotals = useMemo(() => {
    return filteredAllProductReportRows.reduce(
      (total, row) => ({
        openingStock: total.openingStock + Number(row.openingStock || 0),
        totalQty: total.totalQty + Number(row.totalQty || 0),
        freeQty: total.freeQty + Number(row.freeQty || 0),
        grossAmount: total.grossAmount + Number(row.grossAmount || 0),
        discount: total.discount + Number(row.discount || 0),
        netAmount: total.netAmount + Number(row.netAmount || 0),
        totalTax: total.totalTax + Number(row.totalTax || 0),
        netSales: total.netSales + Number(row.netSales || 0),
        crnAmount: total.crnAmount + Number(row.crnAmount || 0),
        balanceAmount: total.balanceAmount + Number(row.balanceAmount || 0),
      }),
      {
        openingStock: 0,
        totalQty: 0,
        freeQty: 0,
        grossAmount: 0,
        discount: 0,
        netAmount: 0,
        totalTax: 0,
        netSales: 0,
        crnAmount: 0,
        balanceAmount: 0,
      }
    );
  }, [filteredAllProductReportRows]);

  // =========================================================
  // Helper functions
  // =========================================================
  const getCompanyCode = (company, index = "") =>
    String(
      company?.companyCode ||
        company?.CompanyCode ||
        company?.code ||
        company?._id ||
        company?.id ||
        index
    );

  const getAccountCode = (account, index = "") =>
    String(
      account?.accountCode ||
        account?.AccountCode ||
        account?.code ||
        account?._id ||
        account?.id ||
        index
    );

  const getAreaCode = (area, index = "") =>
    String(
      area?.areaCode ||
        area?.AreaCode ||
        area?.code ||
        area?._id ||
        index
    );

  const getAreaName = (area) =>
    String(
      area?.areaName ||
        area?.AreaName ||
        area?.name ||
        ""
    );

  const getSalesmanCode = (salesman, index = "") =>
    String(
      salesman?.salesmanCode ||
        salesman?.SalesmanCode ||
        salesman?.code ||
        salesman?._id ||
        index
    );

  const getSalesmanName = (salesman) =>
    String(
      salesman?.salesmanName ||
        salesman?.SalesmanName ||
        salesman?.name ||
        ""
    );

  const getLoggedInContext = () => {
    const storageKeys = [
      "loggedInUser",
      "user",
      "currentUser",
    ];

    let loggedInUser = {};

    for (const key of storageKeys) {
      try {
        const storedValue = localStorage.getItem(key);
        if (!storedValue) continue;
        const parsed = JSON.parse(storedValue);
        if (parsed && typeof parsed === "object") {
          loggedInUser = parsed.user && typeof parsed.user === "object"
            ? parsed.user
            : parsed;
          break;
        }
      } catch {
        // Continue checking other keys.
      }
    }

    return {
      distributorId: String(
        loggedInUser.distributorId ||
          loggedInUser.DistributorId ||
          localStorage.getItem("distributorId") ||
          ""
      ).trim(),
      firmId: String(
        loggedInUser.firmId ||
          loggedInUser.FirmId ||
          localStorage.getItem("firmId") ||
          ""
      ).trim(),
    };
  };

  const updateGstFilter = (key, value) => {
    setGstFilters((current) => ({ ...current, [key]: value }));
    setGstGenerated(false);
  };

  const generateGstReport = async () => {
    const { distributorId, firmId } = getLoggedInContext();
    if (!distributorId || !firmId) {
      setGstError("Distributor or firm information is missing. Please login again.");
      return;
    }
    if (!gstFilters.fromDate || !gstFilters.toDate || gstFilters.fromDate > gstFilters.toDate) {
      setGstError("Enter a valid From Date and To Date range.");
      return;
    }
    setGstLoading(true); setGstError("");
    try {
      const query = new URLSearchParams({ distributorId, firmId });
      Object.entries(gstFilters).forEach(([key, value]) => query.set(key, String(value ?? "")));
      const response = await secureFetch(`${API_BASE_URL}/api/reports/gst/${GST_REPORT_ENDPOINTS[selectedReport]}?${query}`);
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.message || "GST report could not be generated.");
      setGstRows(Array.isArray(result.rows) ? result.rows : []);
      setGstColumns(Array.isArray(result.columns) ? result.columns : []);
      const sections = Array.isArray(result.sections) ? result.sections : [];
      setGstSections(sections);
      setActiveGstrSheet(sections[0]?.name || "B2B");
      setGstTotals(result.totals || {}); setGstSummary(result.summary || null); setGstGenerated(true);
    } catch (error) {
      setGstRows([]); setGstColumns([]); setGstSections([]); setGstTotals({}); setGstSummary(null); setGstGenerated(false);
      setGstError(error.message || "GST report could not be generated.");
    } finally { setGstLoading(false); }
  };

  const gstExportMatrix = (columns = visibleGstColumns, rows = filteredGstRows, includeFooter = true) => {
    const matrix = [
      columns.map((column) => column.label),
      ...rows.map((row) => columns.map((column) => row[column.key] ?? "")),
    ];
    if (includeFooter && selectedReport !== "GST Summary" && selectedReport !== "GSTR1 Report" && rows.length) {
      matrix.push(columns.map((column, index) => (
        index === 0 ? "TOTAL" : Object.prototype.hasOwnProperty.call(gstTotals, column.key) ? gstTotals[column.key] : ""
      )));
    }
    return matrix;
  };

  const gstFileName = () => `${selectedReport.replace(/[^a-z0-9]+/gi, "_")}_${gstFilters.fromDate}_${gstFilters.toDate}`;

  const applyMildTableStyle = (sheet, columns, rows, options = {}) => {
    const border = {
      top: { style: "thin", color: { rgb: "C7D4DF" } },
      bottom: { style: "thin", color: { rgb: "C7D4DF" } },
      left: { style: "thin", color: { rgb: "C7D4DF" } },
      right: { style: "thin", color: { rgb: "C7D4DF" } },
    };
    const headerStyle = {
      font: { bold: true, color: { rgb: "27445D" } },
      fill: { patternType: "solid", fgColor: { rgb: "DCEBF5" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border,
    };
    const totalStyle = {
      font: { bold: true, color: { rgb: "31543A" } },
      fill: { patternType: "solid", fgColor: { rgb: "E4F0E6" } },
      alignment: { vertical: "center" },
      border,
    };
    columns.forEach((_, index) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: index })];
      if (cell) cell.s = headerStyle;
    });
    const totalRows = options.totalRows || rows.reduce((indexes, row, index) => {
      if (["total", "final", "summary"].includes(String(row?.RowType || "").toLowerCase())) indexes.push(index + 1);
      return indexes;
    }, []);
    totalRows.forEach((rowIndex) => columns.forEach((column, columnIndex) => {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      if (!sheet[address]) sheet[address] = { t: "s", v: "" };
      sheet[address].s = {
        ...totalStyle,
        alignment: { horizontal: typeof rows[rowIndex - 1]?.[column.key] === "number" ? "right" : "left", vertical: "center" },
        numFmt: typeof rows[rowIndex - 1]?.[column.key] === "number" ? "#,##0.00" : "General",
      };
    }));
    sheet["!cols"] = columns.map((column) => ({ wch: Math.min(32, Math.max(11, String(column.label || column.key).length + 2)) }));
    sheet["!autofilter"] = { ref: sheet["!ref"] || "A1:A1" };
  };

  const downloadReportBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const exportGstExcel = () => {
    const workbook = XLSX.utils.book_new();
    if (selectedReport === "GSTR1 Report" && gstSections.length) {
      gstSections.forEach((section) => {
        const sheet = XLSX.utils.aoa_to_sheet(gstExportMatrix(section.columns, section.rows, false));
        applyMildTableStyle(sheet, section.columns, section.rows);
        XLSX.utils.book_append_sheet(workbook, sheet, section.name.slice(0, 31));
      });
    } else {
      const matrix = gstExportMatrix();
      const sheet = XLSX.utils.aoa_to_sheet(matrix);
      const footerRows = selectedReport !== "GST Summary" && filteredGstRows.length ? [matrix.length - 1] : undefined;
      applyMildTableStyle(sheet, visibleGstColumns, filteredGstRows, { totalRows: footerRows });
      XLSX.utils.book_append_sheet(workbook, sheet, "GST Report");
    }
    XLSX.writeFile(workbook, `${gstFileName()}.xlsx`, { cellStyles: true });
  };

  const exportGstCsv = () => {
    if (selectedReport === "GSTR1 Report" && gstSections.length) {
      const files = Object.fromEntries(gstSections.map((section) => {
        const sheet = XLSX.utils.aoa_to_sheet(gstExportMatrix(section.columns, section.rows, false));
        const csv = XLSX.utils.sheet_to_csv(sheet);
        return [`${section.name.toLowerCase()}.csv`, strToU8(`\uFEFF${csv}`)];
      }));
      const archive = zipSync(files, { level: 6 });
      downloadReportBlob(new Blob([archive], { type: "application/zip" }), `${gstFileName()}.zip`);
      return;
    }
    const sheet = XLSX.utils.aoa_to_sheet(gstExportMatrix());
    const csv = XLSX.utils.sheet_to_csv(sheet);
    downloadReportBlob(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), `${gstFileName()}.csv`);
  };

  const exportGstJson = () => {
    const payload = selectedReport === "GSTR1 Report" && gstSections.length
      ? Object.fromEntries(gstSections.map((section) => [section.name, section.rows]))
      : filteredGstRows;
    downloadReportBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `${gstFileName()}.json`);
  };

  const exportGstPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
    pdf.setFontSize(15); pdf.text(selectedReport, 28, 28);
    pdf.setFontSize(9); pdf.text(`${gstFilters.fromDate} to ${gstFilters.toDate}`, 28, 43);
    autoTable(pdf, { startY: 52, head: [visibleGstColumns.map((column) => column.label)], body: filteredGstRows.map((row) => visibleGstColumns.map((column) => row[column.key] ?? "")), styles: { fontSize: 4.5, cellPadding: 2 }, headStyles: { fillColor: [91, 132, 158] }, horizontalPageBreak: true, horizontalPageBreakRepeat: 0 });
    pdf.save(`${gstFileName()}.pdf`);
  };

  const loadStockSalesCriteria = async () => {
    setStockSalesError("");
    try {
      const { distributorId, firmId } = getLoggedInContext();
      if (!distributorId || !firmId) {
        throw new Error("Distributor or firm information is missing. Please login again.");
      }

      const query = new URLSearchParams({ distributorId, firmId });
      const response = await secureFetch(
        `${API_BASE_URL}/api/reports/stock-and-sales/criteria?${query.toString()}`
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load report criteria.");
      }

      setStockSalesCriteria({
        companies: Array.isArray(result.companies) ? result.companies : [],
        godowns: Array.isArray(result.godowns) ? result.godowns : [],
      });
    } catch (error) {
      setStockSalesCriteria({ companies: [], godowns: [] });
      setStockSalesError(error.message || "Failed to load report criteria.");
    }
  };

  useEffect(() => {
    if (selectedReport !== "Stock And Sales Report") return;
    loadStockSalesCriteria();
  }, [selectedReport]);

  const generateStockSalesReport = async () => {
    if (stockSalesFilters.fromDate > stockSalesFilters.toDate) {
      setStockSalesError("From Date cannot be greater than To Date.");
      return;
    }

    setStockSalesLoading(true);
    setStockSalesError("");
    try {
      const { distributorId, firmId } = getLoggedInContext();
      if (!distributorId || !firmId) {
        throw new Error("Distributor or firm information is missing. Please login again.");
      }

      const query = new URLSearchParams({
        distributorId,
        firmId,
        ...stockSalesFilters,
        stockWithFreeQty: stockSalesFilters.stockWithFreeQty ? "yes" : "no",
      });
      const response = await secureFetch(
        `${API_BASE_URL}/api/reports/stock-and-sales?${query.toString()}`
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to generate Stock And Sales Report.");
      }

      setStockSalesRows(Array.isArray(result.data) ? result.data : []);
      setStockSalesSummary(result.summary || null);
      setStockSalesGenerated(true);
    } catch (error) {
      setStockSalesRows([]);
      setStockSalesSummary(null);
      setStockSalesGenerated(false);
      setStockSalesError(error.message || "Failed to generate Stock And Sales Report.");
    } finally {
      setStockSalesLoading(false);
    }
  };

  const clearStockSalesReport = () => {
    setStockSalesFilters({
      companyCode: "",
      reportLevel: "unit",
      godownCode: "",
      fromDate: getFinancialYearStart(),
      toDate: getTodayDate(),
      reportWith: "summary",
      filter: "all",
      orderBy: "productName",
      stockWithFreeQty: false,
    });
    setStockSalesRows([]);
    setStockSalesSummary(null);
    setStockSalesGenerated(false);
    setStockSalesError("");
    setStockSalesSearch("");
    setStockSalesZoom("100");
  };

  const getStockSalesExportColumns = () => [
    { key: "SrNo", label: "SrNo." },
    ...(!stockSalesFilters.companyCode ? [{ key: "CompanyName", label: "Company" }] : []),
    { key: "ShortCode", label: "ShortCode" },
    { key: "ProductCode", label: "Product Code" },
    { key: "ProductName", label: "Product Name" },
    { key: "LocalProduct", label: "Local Product" },
    { key: "SysProdCode", label: "SysProdCode" },
    { key: "MRP", label: "MRP" },
    { key: "Opening", label: "Opening" },
    { key: "Purchase", label: "Purchase" },
    { key: "CreditNote", label: "Credit Note" },
    { key: "Increase", label: "Increase" },
    { key: "MFI", label: "MFI" },
    { key: "ToGDTransfer", label: "To GDTransfer" },
    { key: "Sales", label: "Sales" },
    { key: "DebitNote", label: "Debit Note" },
    { key: "Decrease", label: "Decrease" },
    { key: "Damage", label: "Damage" },
    { key: "MFO", label: "MFO" },
    { key: "FromGDTransfer", label: "From GDTransfer" },
    { key: "Closing", label: "Closing" },
    { key: "BoxPack", label: "BoxPack" },
    { key: "LastPurchaseDate", label: "Last Purchase Date" },
    { key: "LastPurchase", label: "Last Purchase" },
    { key: "LastQty", label: "Last Qty" },
    { key: "Category", label: "Category" },
    { key: "SubCategory", label: "SubCategory" },
    { key: "Group", label: "Group" },
    { key: "SubGroup", label: "SubGroup" },
    { key: "Brand", label: "Brand" },
    { key: "SubBrand", label: "SubBrand" },
    ...(stockSalesFilters.reportWith === "details" ? [{ key: "GodownName", label: "Godown" }] : []),
  ];

  const getStockSalesFileName = () =>
    `Stock_And_Sales_${stockSalesFilters.fromDate}_${stockSalesFilters.toDate}`;

  const exportStockSalesExcel = () => {
    const columns = getStockSalesExportColumns();
    const numericKeys = [
      "Opening", "Purchase", "CreditNote", "Increase", "MFI", "ToGDTransfer",
      "Sales", "DebitNote", "Decrease", "Damage", "MFO", "FromGDTransfer", "Closing", "LastQty",
    ];
    const totalRow = Object.fromEntries(columns.map((column, index) => [
      column.key,
      index === 0 ? "TOTAL" : numericKeys.includes(column.key) ? filteredStockSalesRows.reduce((total, row) => total + Number(row[column.key] || 0), 0) : "",
    ]));
    totalRow.RowType = "total";
    const exportRows = filteredStockSalesRows.length ? [...filteredStockSalesRows, totalRow] : filteredStockSalesRows;
    const worksheet = XLSX.utils.aoa_to_sheet([
      columns.map((column) => column.label),
      ...exportRows.map((row) => columns.map((column) => row[column.key] ?? "")),
    ]);
    applyMildTableStyle(worksheet, columns, exportRows);
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    worksheet["!cols"] = columns.map((column) => ({
      wch: Math.max(11, Math.min(28, column.label.length + 4)),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock And Sales");
    XLSX.writeFile(workbook, `${getStockSalesFileName()}.xlsx`, { cellStyles: true });
  };

  const exportStockSalesCsv = () => {
    const columns = getStockSalesExportColumns();
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      columns.map((column) => escapeCsv(column.label)).join(","),
      ...filteredStockSalesRows.map((row) => columns.map((column) => escapeCsv(row[column.key])).join(",")),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${getStockSalesFileName()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportStockSalesPdf = () => {
    const columns = getStockSalesExportColumns();
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
    pdf.setFontSize(13);
    pdf.text("Stock And Sales Report", 10, 10);
    pdf.setFontSize(8);
    pdf.text(`Period: ${stockSalesFilters.fromDate} to ${stockSalesFilters.toDate}`, 10, 16);
    autoTable(pdf, {
      head: [columns.map((column) => column.label)],
      body: filteredStockSalesRows.map((row) => columns.map((column) => String(row[column.key] ?? ""))),
      startY: 20,
      theme: "grid",
      styles: { fontSize: 5.5, cellPadding: 1.1, overflow: "linebreak" },
      headStyles: { fillColor: [21, 89, 214], textColor: 255 },
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: [0, 1, 2, 3],
      margin: { left: 7, right: 7 },
    });
    pdf.save(`${getStockSalesFileName()}.pdf`);
  };

  const printStockSalesReport = () => {
    const columns = getStockSalesExportColumns();
    const escapeHtml = (value) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const printWindow = window.open("", "_blank", "width=1400,height=900");
    if (!printWindow) {
      setStockSalesError("Print window was blocked. Please allow pop-ups and try again.");
      return;
    }
    const headerCells = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
    const bodyRows = filteredStockSalesRows.map((row) =>
      `<tr>${columns.map((column) => `<td>${escapeHtml(row[column.key])}</td>`).join("")}</tr>`
    ).join("");
    printWindow.document.write(`<!doctype html><html><head><title>Stock And Sales Report</title><style>
      @page { size: A3 landscape; margin: 8mm; }
      body { font-family: Arial, sans-serif; color: #17233d; }
      h1 { margin: 0 0 4px; font-size: 18px; }
      p { margin: 0 0 12px; font-size: 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 7px; }
      th, td { padding: 4px; border: 1px solid #cbd5e1; white-space: nowrap; text-align: left; }
      th { background: #0f4da8; color: white; }
    </style></head><body><h1>Stock And Sales Report</h1>
      <p>Period: ${escapeHtml(stockSalesFilters.fromDate)} to ${escapeHtml(stockSalesFilters.toDate)}</p>
      <table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  };

  const isPurchaseAnalysisReport = [
    "Company/Bill Wise Purchase Report",
    "Product Wise Purchase Report",
  ].includes(selectedReport);
  const purchaseAnalysisColumns = selectedReport === "Company/Bill Wise Purchase Report"
    ? COMPANY_BILL_PURCHASE_COLUMNS
    : PRODUCT_PURCHASE_COLUMNS;
  const purchaseNumericKeys = new Set([
    "VouNo", "MRP", "Qty", "FreeQty", "BoxQty", "Rate", "SalesRate", "Gross", "Amount", "Weight",
    "Taxable", "GSTPercent", "GSTAmt", "VatPer", "VatAmt", "CGST", "SGST", "IGST",
    "Cess1", "Cess2", "BVDiscAmt", "BVAddAmt", "AVDiscAmt", "AVAddAmt", "NetAmt",
    "BoxPack", "INBoxPack",
  ]);

  const loadPurchaseAnalysisCriteria = async () => {
    setPurchaseAnalysisError("");
    try {
      const { distributorId, firmId } = getLoggedInContext();
      const query = new URLSearchParams({ distributorId, firmId });
      const response = await secureFetch(`${API_BASE_URL}/api/reports/purchase-analysis/criteria?${query}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Failed to load purchase report criteria.");
      setPurchaseAnalysisCriteria({
        companies: Array.isArray(result.companies) ? result.companies : [],
        godowns: Array.isArray(result.godowns) ? result.godowns : [],
      });
    } catch (error) {
      setPurchaseAnalysisCriteria({ companies: [], godowns: [] });
      setPurchaseAnalysisError(error.message || "Failed to load purchase report criteria.");
    }
  };

  useEffect(() => {
    if (!isPurchaseAnalysisReport) return;
    loadPurchaseAnalysisCriteria();
  }, [selectedReport]);

  const generatePurchaseAnalysisReport = async () => {
    if (purchaseAnalysisFilters.fromDate > purchaseAnalysisFilters.toDate) {
      setPurchaseAnalysisError("From Date cannot be greater than To Date.");
      return;
    }
    setPurchaseAnalysisLoading(true);
    setPurchaseAnalysisError("");
    try {
      const { distributorId, firmId } = getLoggedInContext();
      const query = new URLSearchParams({ distributorId, firmId, ...purchaseAnalysisFilters });
      if (selectedReport === "Company/Bill Wise Purchase Report") query.set("orderBy", "voucher");
      const response = await secureFetch(`${API_BASE_URL}/api/reports/purchase-analysis?${query}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Failed to generate purchase report.");
      setPurchaseAnalysisRows(Array.isArray(result.data) ? result.data : []);
      setPurchaseAnalysisGenerated(true);
      setPurchaseAnalysisSearch("");
    } catch (error) {
      setPurchaseAnalysisRows([]);
      setPurchaseAnalysisGenerated(false);
      setPurchaseAnalysisError(error.message || "Failed to generate purchase report.");
    } finally {
      setPurchaseAnalysisLoading(false);
    }
  };

  const clearPurchaseAnalysisReport = () => {
    setPurchaseAnalysisFilters({
      companyCode: "", godownCode: "", fromDate: getFinancialYearStart(), toDate: getTodayDate(),
      actualInvoice: "no", discountDetails: "no", reportLevel: "all", reportWith: "category", orderBy: "productName",
    });
    setPurchaseAnalysisRows([]);
    setPurchaseAnalysisGenerated(false);
    setPurchaseAnalysisError("");
    setPurchaseAnalysisSearch("");
    setPurchaseAnalysisZoom("100");
  };

  const purchaseAnalysisFileName = () =>
    `${selectedReport.replace(/[^a-z0-9]+/gi, "_")}_${purchaseAnalysisFilters.fromDate}_${purchaseAnalysisFilters.toDate}`;

  const exportPurchaseAnalysisExcel = () => {
    const totalKeys = new Set([
      "Qty", "FreeQty", "BoxQty", "Gross", "Amount", "Weight", "Taxable", "GSTAmt", "VatAmt",
      "CGST", "SGST", "IGST", "Cess1", "Cess2", "BVDiscAmt", "BVAddAmt", "AVDiscAmt", "AVAddAmt", "NetAmt",
    ]);
    const totalRow = Object.fromEntries(purchaseAnalysisColumns.map((column, index) => [
      column.key,
      index === 0 ? "TOTAL" : totalKeys.has(column.key) ? filteredPurchaseAnalysisRows.reduce((total, row) => total + Number(row[column.key] || 0), 0) : "",
    ]));
    totalRow.RowType = "total";
    const exportRows = filteredPurchaseAnalysisRows.length ? [...filteredPurchaseAnalysisRows, totalRow] : filteredPurchaseAnalysisRows;
    const sheet = XLSX.utils.aoa_to_sheet([
      purchaseAnalysisColumns.map((column) => column.label),
      ...exportRows.map((row) => purchaseAnalysisColumns.map((column) => row[column.key] ?? "")),
    ]);
    applyMildTableStyle(sheet, purchaseAnalysisColumns, exportRows);
    sheet["!cols"] = purchaseAnalysisColumns.map((column) => ({ wch: Math.max(11, Math.min(28, column.label.length + 4)) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Purchase Report");
    XLSX.writeFile(workbook, `${purchaseAnalysisFileName()}.xlsx`, { cellStyles: true });
  };

  const exportPurchaseAnalysisCsv = () => {
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const content = [
      purchaseAnalysisColumns.map((column) => escapeCsv(column.label)).join(","),
      ...filteredPurchaseAnalysisRows.map((row) => purchaseAnalysisColumns.map((column) => escapeCsv(row[column.key])).join(",")),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `${purchaseAnalysisFileName()}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };

  const exportPurchaseAnalysisPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
    pdf.setFontSize(13); pdf.text(selectedReport, 8, 10);
    pdf.setFontSize(8); pdf.text(`Period: ${purchaseAnalysisFilters.fromDate} to ${purchaseAnalysisFilters.toDate}`, 8, 16);
    autoTable(pdf, {
      head: [purchaseAnalysisColumns.map((column) => column.label)],
      body: filteredPurchaseAnalysisRows.map((row) => purchaseAnalysisColumns.map((column) => String(row[column.key] ?? ""))),
      startY: 20, theme: "grid", styles: { fontSize: 5.5, cellPadding: 1.1 },
      headStyles: { fillColor: [15, 77, 168], textColor: 255 }, horizontalPageBreak: true,
      horizontalPageBreakRepeat: [0, 1, 2], margin: { left: 6, right: 6 },
    });
    pdf.save(`${purchaseAnalysisFileName()}.pdf`);
  };

  const printPurchaseAnalysisReport = () => {
    const popup = window.open("", "_blank", "width=1400,height=900");
    if (!popup) return setPurchaseAnalysisError("Print window was blocked. Please allow pop-ups and try again.");
    const safe = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    popup.document.write(`<!doctype html><html><head><title>${safe(selectedReport)}</title><style>@page{size:A3 landscape;margin:8mm}body{font-family:Arial}table{width:100%;border-collapse:collapse;font-size:7px}th,td{border:1px solid #bbb;padding:4px;white-space:nowrap}th{background:#0f4da8;color:#fff}</style></head><body><h2>${safe(selectedReport)}</h2><p>${safe(purchaseAnalysisFilters.fromDate)} to ${safe(purchaseAnalysisFilters.toDate)}</p><table><thead><tr>${purchaseAnalysisColumns.map((column) => `<th>${safe(column.label)}</th>`).join("")}</tr></thead><tbody>${filteredPurchaseAnalysisRows.map((row) => `<tr>${purchaseAnalysisColumns.map((column) => `<td>${safe(row[column.key])}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`);
    popup.document.close(); popup.focus(); window.setTimeout(() => popup.print(), 250);
  };

  const loadPartyReportCriteria = async (companyCode = "") => {
    try {
      setIsCriteriaLoading(true);
      setCriteriaLoadError("");

      const { distributorId, firmId } = getLoggedInContext();

      if (!distributorId || !firmId) {
        throw new Error("Distributor or firm information is missing. Please login again.");
      }

      const query = new URLSearchParams({
        distributorId,
        firmId,
      });

      if (companyCode) {
        query.set("companyCode", companyCode);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/reports/party-sales/criteria?${query.toString()}`
      );

      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : {
            success: false,
            message: await response.text(),
          };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load report criteria.");
      }

      setReportCompanies(Array.isArray(result.companies) ? result.companies : []);
      setMappedParties(Array.isArray(result.parties) ? result.parties : []);
      setMappedAreas(Array.isArray(result.areas) ? result.areas : []);
      setMappedSalesmen(Array.isArray(result.salesmen) ? result.salesmen : []);

      return result;
    } catch (error) {
      console.error("Party report criteria error:", error);
      setMappedParties([]);
      setMappedAreas([]);
      setMappedSalesmen([]);
      setCriteriaLoadError(error.message || "Failed to load report criteria.");
      return null;
    } finally {
      setIsCriteriaLoading(false);
    }
  };

  const loadProductReportCriteria = async (companyCode = "") => {
    try {
      setIsProductCriteriaLoading(true);
      setProductCriteriaError("");

      const { distributorId, firmId } = getLoggedInContext();

      if (!distributorId || !firmId) {
        throw new Error("Distributor or firm information is missing. Please login again.");
      }

      const query = new URLSearchParams({
        distributorId,
        firmId,
      });

      if (companyCode) {
        query.set("companyCode", companyCode);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/reports/product-sales/criteria?${query.toString()}`
      );

      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : {
            success: false,
            message: await response.text(),
          };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load product sales criteria.");
      }

      setReportCompanies(Array.isArray(result.companies) ? result.companies : []);
      setReportProductList(Array.isArray(result.products) ? result.products : []);

      const areaResponse = await fetch(
        `${API_BASE_URL}/api/reports/party-sales/criteria?${query.toString()}`
      );

      const areaContentType = areaResponse.headers.get("content-type") || "";
      const areaResult = areaContentType.includes("application/json")
        ? await areaResponse.json()
        : {
            success: false,
            message: await areaResponse.text(),
          };

      if (areaResponse.ok && areaResult.success) {
        setMappedAreas(Array.isArray(areaResult.areas) ? areaResult.areas : []);
        setMappedSalesmen(Array.isArray(areaResult.salesmen) ? areaResult.salesmen : []);
      }

      return result;
    } catch (error) {
      console.error("Product report criteria error:", error);
      setReportProductList([]);
      setProductCriteriaError(error.message || "Failed to load product sales criteria.");
      return null;
    } finally {
      setIsProductCriteriaLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReport !== "Product Wise Sales Report" && selectedReport !== "All Product Wise Sales Report") {
      return;
    }

    const companyCode = selectedReport === "Product Wise Sales Report"
      ? productReportFilters.company
      : allProductReportFilters.company;

    if (selectedReport === "Product Wise Sales Report") {
      setProductReportFilters((prev) => ({
        ...prev,
        selectedAreaCodes: [],
        selectedSalesmanCodes: [],
        selectedArea: "no",
        selectedSalesman: "no",
      }));
    }

    loadProductReportCriteria(companyCode);
  }, [selectedReport, productReportFilters.company, allProductReportFilters.company]);

  useEffect(() => {
    if (selectedReport !== "Product Wise Sales Report" && selectedReport !== "All Product Wise Sales Report") {
      return;
    }

    const companyCode = selectedReport === "Product Wise Sales Report"
      ? productReportFilters.company
      : allProductReportFilters.company;

    loadProductReportCriteria(companyCode);
  }, [selectedReport, productReportFilters.company, allProductReportFilters.company]);

  useEffect(() => {
    if (selectedReport !== "Party Wise Sales Report" && selectedReport !== "All Party Wise Sales Report") {
      return;
    }
    loadPartyReportCriteria("");
  }, [selectedReport]);

  useEffect(() => {
    if (selectedReport !== "Party Wise Sales Report" && selectedReport !== "All Party Wise Sales Report") {
      return;
    }

    const companyCode = selectedReport === "Party Wise Sales Report"
      ? partySalesFilters.company
      : allPartySalesFilters.company;

    if (selectedReport === "Party Wise Sales Report") {
      setPartySalesFilters((previous) => ({
        ...previous,
        selectedPartyCodes: [],
        selectedAreaCodes: [],
        selectedSalesmanCodes: [],
      }));
      setPartySelectorSearch("");
      setAreaSelectorSearch("");
      setSalesmanSelectorSearch("");
      setShowPartySelector(false);
      setShowAreaSelector(false);
      setShowSalesmanSelector(false);
      setPartyReportRows([]);
      setPartyReportColumns([]);
      setIsPartyReportGenerated(false);
      setPartyReportError("");
    } else {
      setAllPartySalesFilters((previous) => ({
        ...previous,
        selectedAreaCodes: [],
        selectedSalesmanCodes: [],
      }));
      setAllAreaSelectorSearch("");
      setAllSalesmanSelectorSearch("");
      setShowAllAreaSelector(false);
      setShowAllSalesmanSelector(false);
      setAllPartyReportRows([]);
      setAllPartyReportColumns([]);
      setIsAllPartyReportGenerated(false);
      setAllPartyReportError("");
    }

    loadPartyReportCriteria(companyCode);
  }, [selectedReport, partySalesFilters.company, allPartySalesFilters.company]);

  const updatePartySalesFilter = (field, value) => {
    setPartySalesFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
    setIsPartyReportGenerated(false);
    setPartyReportRows([]);
    setPartyReportError("");
    setPartyCurrentPage(1);
  };

  const updateAllPartySalesFilter = (field, value) => {
    setAllPartySalesFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
    setIsAllPartyReportGenerated(false);
    setAllPartyReportRows([]);
    setAllPartyReportError("");
    setAllPartyCurrentPage(1);
  };

  const normalizePartyValue = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();

  const getCompanyValue = (company, index = "") =>
    String(
      company?.companyCode ||
        company?.code ||
        company?.CompanyCode ||
        company?._id ||
        company?.id ||
        index
    );

  const getCompanyName = (company) =>
    String(
      company?.companyName ||
        company?.name ||
        company?.CompanyName ||
        ""
    );

  const getAccountValue = (account, index = "") =>
    String(
      account?.accountCode ||
        account?.code ||
        account?.AccountCode ||
        account?._id ||
        account?.id ||
        index
    );

  const getAccountName = (account) =>
    String(
      account?.accountName ||
        account?.name ||
        account?.AccountName ||
        account?.partyName ||
        ""
    );

  const companyFilteredAccounts = mappedParties;

  const selectedPartyNames = useMemo(() => {
    return partySalesFilters.selectedPartyCodes
      .map((selectedCode) => {
        const party = companyFilteredAccounts.find(
          (account, index) => getAccountCode(account, index) === selectedCode
        );
        return party ? getAccountName(party) : "";
      })
      .filter(Boolean);
  }, [partySalesFilters.selectedPartyCodes, companyFilteredAccounts]);

  const toggleValueInArray = (field, value, checked) => {
    setPartySalesFilters((previous) => {
      const currentValues = Array.isArray(previous[field]) ? previous[field] : [];
      const nextValues = checked
        ? [...new Set([...currentValues, value])]
        : currentValues.filter((currentValue) => currentValue !== value);
      return {
        ...previous,
        [field]: nextValues,
      };
    });
    setIsPartyReportGenerated(false);
    setPartyReportRows([]);
  };

  const toggleAllParties = (checked) => {
    setPartySalesFilters((previous) => ({
      ...previous,
      selectedPartyCodes: checked
        ? companyFilteredAccounts.map((account, index) => getAccountCode(account, index))
        : [],
    }));
  };

  const toggleAllAreas = (checked) => {
    if (selectedReport === "Party Wise Sales Report") {
      setPartySalesFilters((previous) => ({
        ...previous,
        selectedAreaCodes: checked
          ? mappedAreas.map((area, index) => getAreaCode(area, index))
          : [],
      }));
      setPartyReportRows([]);
      setIsPartyReportGenerated(false);
    } else {
      setAllPartySalesFilters((previous) => ({
        ...previous,
        selectedAreaCodes: checked
          ? mappedAreas.map((area, index) => getAreaCode(area, index))
          : [],
      }));
      setAllPartyReportRows([]);
      setIsAllPartyReportGenerated(false);
    }
  };

  const toggleAllSalesmen = (checked) => {
    if (selectedReport === "Party Wise Sales Report") {
      setPartySalesFilters((previous) => ({
        ...previous,
        selectedSalesmanCodes: checked
          ? mappedSalesmen.map((salesman, index) => getSalesmanCode(salesman, index))
          : [],
      }));
      setPartyReportRows([]);
      setIsPartyReportGenerated(false);
    } else {
      setAllPartySalesFilters((previous) => ({
        ...previous,
        selectedSalesmanCodes: checked
          ? mappedSalesmen.map((salesman, index) => getSalesmanCode(salesman, index))
          : [],
      }));
      setAllPartyReportRows([]);
      setIsAllPartyReportGenerated(false);
    }
  };

  const toggleAllPartyArea = (checked) => {
    setAllPartySalesFilters((previous) => ({
      ...previous,
      selectedAreaCodes: checked
        ? mappedAreas.map((area, index) => getAreaCode(area, index))
        : [],
    }));
    setAllPartyReportRows([]);
    setIsAllPartyReportGenerated(false);
  };

  const toggleAllPartySalesman = (checked) => {
    setAllPartySalesFilters((previous) => ({
      ...previous,
      selectedSalesmanCodes: checked
        ? mappedSalesmen.map((salesman, index) => getSalesmanCode(salesman, index))
        : [],
    }));
    setAllPartyReportRows([]);
    setIsAllPartyReportGenerated(false);
  };

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key !== "Escape") return;
      setShowPartySelector(false);
      setShowAreaSelector(false);
      setShowSalesmanSelector(false);
      setShowAllAreaSelector(false);
      setShowAllSalesmanSelector(false);
    };
    window.addEventListener("keydown", handleEscapeKey);
    return () => {
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  // =========================================================
  // GENERATE PARTY WISE SALES REPORT
  // =========================================================
  const generatePartySalesReport = async () => {
    try {
      setPartyReportError("");
      setPartyReportRows([]);
      setPartyReportColumns([]);

      const { distributorId, firmId } = getLoggedInContext();

      if (!distributorId || !firmId) {
        throw new Error("Distributor or firm information is missing. Please login again.");
      }

      if (partySalesFilters.reportLevel === "selectedParty" && !partySalesFilters.company) {
        throw new Error("Please select a company before selecting parties.");
      }

      if (partySalesFilters.reportLevel === "selectedParty" &&
        partySalesFilters.selectedPartyCodes.length === 0) {
        throw new Error("Please select at least one mapped party.");
      }

      if (partySalesFilters.selectedArea === "yes" &&
        partySalesFilters.selectedAreaCodes.length === 0) {
        throw new Error("Please select at least one area.");
      }

      if (partySalesFilters.selectedSalesman === "yes" &&
        partySalesFilters.selectedSalesmanCodes.length === 0) {
        throw new Error("Please select at least one salesman.");
      }

      if (!partySalesFilters.fromDate || !partySalesFilters.toDate) {
        throw new Error("From Date and To Date are required.");
      }

      if (partySalesFilters.fromDate > partySalesFilters.toDate) {
        throw new Error("From Date cannot be greater than To Date.");
      }

      setIsPartyReportLoading(true);
      const effectiveProductWise =
        partySalesFilters.reportLevel === "salesDetails"
          ? "yes"
          : partySalesFilters.productWise;

      const query = new URLSearchParams({
        distributorId,
        firmId,
        companyCode: partySalesFilters.company || "",
        reportLevel: partySalesFilters.reportLevel,
        selectedPartyCodes:
          partySalesFilters.reportLevel === "selectedParty"
            ? partySalesFilters.selectedPartyCodes.join(",")
            : "",
        selectedAreaCodes:
          partySalesFilters.selectedArea === "yes"
            ? partySalesFilters.selectedAreaCodes.join(",")
            : "",
        selectedSalesmanCodes:
          partySalesFilters.selectedSalesman === "yes"
            ? partySalesFilters.selectedSalesmanCodes.join(",")
            : "",
        productWise: effectiveProductWise,
        fromDate: partySalesFilters.fromDate,
        toDate: partySalesFilters.toDate,
        withCreditNote: partySalesFilters.withCreditNote,
        orderBy: partySalesFilters.orderBy,
      });

      const response = await fetch(
        `${API_BASE_URL}/api/reports/party-sales?${query.toString()}`
      );

      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : {
            success: false,
            message: await response.text(),
          };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to generate sales report.");
      }

      const rows = Array.isArray(result.rows)
        ? result.rows.map((row, index) => ({
            ...row,
            rowId:
              row.rowId ||
              [
                row.billSeries,
                row.billNo,
                row.productCode,
                row.batch,
                index,
              ]
                .filter((value) => value !== undefined && value !== null && value !== "")
                .join("-"),
            trn: row.trn || "SALES",
            billSeries: row.billSeries || "",
            billNo: row.billNo ?? "",
            productCode: row.productCode || "",
            productName: row.productName || "",
            batch: row.batch === "." ? "" : row.batch || "",
            mrp: Number(row.mrp || 0),
            qty: Number(row.qty || 0),
            salesRate: Number(row.salesRate || 0),
            purchaseRate: Number(row.purchaseRate || 0),
            grossAmount: Number(row.grossAmount || 0),
            netAmount: Number(row.netAmount || 0),
          }))
        : [];

      const columns = Array.isArray(result.columns) ? result.columns : [];

      setPartyReportRows(rows);
      setPartyReportColumns(columns);
      setPartyCurrentPage(1);
      setIsPartyReportGenerated(true);

      if (rows.length === 0) {
        setPartyReportError("No sales records were found for the selected criteria.");
      }
    } catch (error) {
      console.error("Party sales report generation error:", error);
      setPartyReportRows([]);
      setPartyReportColumns([]);
      setIsPartyReportGenerated(false);
      setPartyReportError(error.message || "Failed to generate sales report.");
    } finally {
      setIsPartyReportLoading(false);
    }
  };

  // =========================================================
  // GENERATE ALL PARTY WISE SALES REPORT
  // =========================================================
  const generateAllPartySalesReport = async () => {
    try {
      setAllPartyReportError("");
      setAllPartyReportRows([]);
      setAllPartyReportColumns([]);

      const { distributorId, firmId } = getLoggedInContext();

      if (!distributorId || !firmId) {
        throw new Error("Distributor or firm information is missing. Please login again.");
      }

      if (allPartySalesFilters.selectedArea === "yes" &&
        allPartySalesFilters.selectedAreaCodes.length === 0) {
        throw new Error("Please select at least one area.");
      }

      if (allPartySalesFilters.selectedSalesman === "yes" &&
        allPartySalesFilters.selectedSalesmanCodes.length === 0) {
        throw new Error("Please select at least one salesman.");
      }

      if (!allPartySalesFilters.fromDate || !allPartySalesFilters.toDate) {
        throw new Error("From Date and To Date are required.");
      }

      if (allPartySalesFilters.fromDate > allPartySalesFilters.toDate) {
        throw new Error("From Date cannot be greater than To Date.");
      }

      setIsAllPartyReportLoading(true);

      const query = new URLSearchParams({
        distributorId,
        firmId,
        companyCode: allPartySalesFilters.company || "",
        reportLevel: allPartySalesFilters.reportLevel,
        selectedAreaCodes:
          allPartySalesFilters.selectedArea === "yes"
            ? allPartySalesFilters.selectedAreaCodes.join(",")
            : "",
        selectedSalesmanCodes:
          allPartySalesFilters.selectedSalesman === "yes"
            ? allPartySalesFilters.selectedSalesmanCodes.join(",")
            : "",
        productWise: allPartySalesFilters.productWise,
        fromDate: allPartySalesFilters.fromDate,
        toDate: allPartySalesFilters.toDate,
        withCreditNote: allPartySalesFilters.withCreditNote,
        orderBy: allPartySalesFilters.orderBy,
        billWiseSalesman: allPartySalesFilters.billWiseSalesman,
        freeValueOn: allPartySalesFilters.freeValueOn,
      });

      const response = await fetch(
        `${API_BASE_URL}/api/reports/all-party-sales?${query.toString()}`
      );

      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : {
            success: false,
            message: await response.text(),
          };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to generate all party sales report.");
      }

      const rows = Array.isArray(result.rows)
        ? result.rows.map((row, index) => ({
            ...row,
            rowId: row.rowId || index,
            srNo: index + 1,
            trn: row.trn || "SALES",
            partyCode: row.partyCode || "",
            partyName: row.partyName || "",
            grossAmount: Number(row.grossAmount || 0),
            discountAmount: Number(row.discountAmount || 0),
            cashDiscountAmount: Number(row.cashDiscountAmount || 0),
            vatAmount: Number(row.vatAmount || 0),
            lessOther: Number(row.lessOther || 0),
            addOther: Number(row.addOther || 0),
            btmAmount: Number(row.btmAmount || 0),
            weight: Number(row.weight || 0),
            couponAmount: Number(row.couponAmount || 0),
            displayAmount: Number(row.displayAmount || 0),
            starAmount: Number(row.starAmount || 0),
            surChargeAmount: Number(row.surChargeAmount || 0),
            retAmount: Number(row.retAmount || 0),
            retVatAmount: Number(row.retVatAmount || 0),
            addLessAmount: Number(row.addLessAmount || 0),
            netAmount: Number(row.netAmount || 0),
            totalLines: Number(row.totalLines || 1),
            areaName: row.areaName || "",
            masterSalesmanName: row.masterSalesmanName || "",
            billSalesmanName: row.billSalesmanName || "",
            productCode: row.productCode || "",
            productName: row.productName || "",
            qty: Number(row.qty || 0),
            freeQty: Number(row.freeQty || 0),
            salesRate: Number(row.salesRate || 0),
            batch: row.batch || "",
          }))
        : [];

      const columns = Array.isArray(result.columns) ? result.columns : [];

      setAllPartyReportRows(rows);
      setAllPartyReportColumns(columns);
      setAllPartyCurrentPage(1);
      setIsAllPartyReportGenerated(true);

      if (rows.length === 0) {
        setAllPartyReportError("No sales records were found for the selected criteria.");
      }
    } catch (error) {
      console.error("All party sales report generation error:", error);
      setAllPartyReportRows([]);
      setAllPartyReportColumns([]);
      setIsAllPartyReportGenerated(false);
      setAllPartyReportError(error.message || "Failed to generate all party sales report.");
    } finally {
      setIsAllPartyReportLoading(false);
    }
  };

  // =========================================================
  // PARTY REPORT - FILTERED ROWS & TOTALS
  // =========================================================
  const filteredPartySalesRows = useMemo(() => {
    const search = normalizeText(partyReportSearch);
    if (!search) return partyReportRows;
    return partyReportRows.filter((row) =>
      Object.values(row).some((value) =>
        normalizeText(value).includes(search)
      )
    );
  }, [partyReportRows, partyReportSearch]);

  const partySalesTotals = useMemo(() => {
    return filteredPartySalesRows.reduce(
      (total, row) => ({
        qty: total.qty + Number(row.qty || 0),
        freeQty: total.freeQty + Number(row.freeQty || 0),
        grossAmount: total.grossAmount + Number(row.grossAmount || 0),
        tprAmount: total.tprAmount + Number(row.tprAmount || 0),
        schemeAmount: total.schemeAmount + Number(row.schemeAmount || 0),
        cashDiscountAmount: total.cashDiscountAmount + Number(row.cashDiscountAmount || 0),
        taxableAmount: total.taxableAmount + Number(row.taxableAmount || 0),
        gstAmount: total.gstAmount + Number(row.gstAmount || 0),
        creditNoteAmount: total.creditNoteAmount + Number(row.creditNoteAmount || 0),
        netAmount: total.netAmount + Number(row.netAmount || 0),
      }),
      {
        qty: 0,
        freeQty: 0,
        grossAmount: 0,
        tprAmount: 0,
        schemeAmount: 0,
        cashDiscountAmount: 0,
        taxableAmount: 0,
        gstAmount: 0,
        creditNoteAmount: 0,
        netAmount: 0,
      }
    );
  }, [filteredPartySalesRows]);

  // =========================================================
  // ALL PARTY REPORT - FILTERED ROWS & TOTALS
  // =========================================================
  const filteredAllPartySalesRows = useMemo(() => {
    const search = normalizeText(allPartyReportSearch);
    if (!search) return allPartyReportRows;
    return allPartyReportRows.filter((row) =>
      Object.values(row).some((value) =>
        normalizeText(value).includes(search)
      )
    );
  }, [allPartyReportRows, allPartyReportSearch]);

  const allPartySalesTotals = useMemo(() => {
    return filteredAllPartySalesRows.reduce(
      (total, row) => ({
        grossAmount: total.grossAmount + Number(row.grossAmount || 0),
        discountAmount: total.discountAmount + Number(row.discountAmount || 0),
        cashDiscountAmount: total.cashDiscountAmount + Number(row.cashDiscountAmount || 0),
        vatAmount: total.vatAmount + Number(row.vatAmount || 0),
        lessOther: total.lessOther + Number(row.lessOther || 0),
        addOther: total.addOther + Number(row.addOther || 0),
        btmAmount: total.btmAmount + Number(row.btmAmount || 0),
        weight: total.weight + Number(row.weight || 0),
        couponAmount: total.couponAmount + Number(row.couponAmount || 0),
        displayAmount: total.displayAmount + Number(row.displayAmount || 0),
        starAmount: total.starAmount + Number(row.starAmount || 0),
        surChargeAmount: total.surChargeAmount + Number(row.surChargeAmount || 0),
        retAmount: total.retAmount + Number(row.retAmount || 0),
        retVatAmount: total.retVatAmount + Number(row.retVatAmount || 0),
        addLessAmount: total.addLessAmount + Number(row.addLessAmount || 0),
        netAmount: total.netAmount + Number(row.netAmount || 0),
        totalLines: total.totalLines + Number(row.totalLines || 0),
        qty: total.qty + Number(row.qty || 0),
        freeQty: total.freeQty + Number(row.freeQty || 0),
      }),
      {
        grossAmount: 0,
        discountAmount: 0,
        cashDiscountAmount: 0,
        vatAmount: 0,
        lessOther: 0,
        addOther: 0,
        btmAmount: 0,
        weight: 0,
        couponAmount: 0,
        displayAmount: 0,
        starAmount: 0,
        surChargeAmount: 0,
        retAmount: 0,
        retVatAmount: 0,
        addLessAmount: 0,
        netAmount: 0,
        totalLines: 0,
        qty: 0,
        freeQty: 0,
      }
    );
  }, [filteredAllPartySalesRows]);

  // =========================================================
  // PARTY REPORT - UTILITY FUNCTIONS
  // =========================================================
  const formatReportNumber = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatPartyReportValue = (column, value) => {
    if (value === undefined || value === null || value === "") return "";
    if (column.type === "number") return formatReportNumber(value);
    if (column.key === "billDate" || column.key === "mfgDate" || column.key === "expiryDate") {
      const rawDate = String(value).trim();
      if (!rawDate) return "";
      const dateOnly = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
      const parts = dateOnly.split("-");
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      return rawDate;
    }
    return String(value);
  };

  const sanitizeExportFileName = (value) =>
    String(value || "report")
      .trim()
      .replace(/[<>:"/\\|?*]+/g, "-")
      .replace(/\s+/g, "_");

  const getSelectedCompanyName = () => {
    if (selectedReport === "Company Wise Purchase Report") {
      const selectedCompany = reportCompanies.find(
        (company, index) => getCompanyCode(company, index) === companyPurchaseFilters.company
      );
      return selectedCompany ? getCompanyName(selectedCompany) : "All Companies";
    }
    const selectedCompany = reportCompanies.find(
      (company, index) => getCompanyCode(company, index) === (selectedReport === "Party Wise Sales Report"
        ? partySalesFilters.company
        : allPartySalesFilters.company)
    );
    if (selectedReport === "All Party Wise Sales Report" && !allPartySalesFilters.company) {
      return "All Companies";
    }
    return selectedCompany ? getCompanyName(selectedCompany) : "All Companies";
  };

  const getPartyReportLevelName = () => {
    if (selectedReport === "Party Wise Sales Report") {
      if (partySalesFilters.reportLevel === "salesDetails") return "Sales Details";
      if (partySalesFilters.reportLevel === "selectedParty") return "Selected Party Wise";
      return "Sales Summary";
    } else {
      if (allPartySalesFilters.reportLevel === "salesDetails") return "Sales Details";
      return "Sales Summary";
    }
  };

  const getExportValue = (column, value) => {
    if (value === undefined || value === null) return "";
    if (column.type === "number") {
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : 0;
    }
    if (column.key === "billDate" || column.key === "mfgDate" || column.key === "expiryDate") {
      return formatPartyReportValue(column, value);
    }
    return String(value);
  };

  const getPartyReportTotalValue = (column, columnIndex, totals) => {
    if (columnIndex === 0) return "TOTAL";
    const totalFieldMap = {
      qty: "qty",
      freeQty: "freeQty",
      grossAmount: "grossAmount",
      tprAmount: "tprAmount",
      schemeAmount: "schemeAmount",
      cashDiscountAmount: "cashDiscountAmount",
      taxableAmount: "taxableAmount",
      gstAmount: "gstAmount",
      creditNoteAmount: "creditNoteAmount",
      netAmount: "netAmount",
    };
    const totalField = totalFieldMap[column.key];
    if (!totalField) return "";
    return Number(totals[totalField] || 0);
  };

  const validatePartyReportExport = (isAllParty = false) => {
    if (isAllParty) {
      if (!isAllPartyReportGenerated) {
        setAllPartyReportError("Please generate the report before exporting.");
        return false;
      }
      if (allPartyReportColumns.length === 0) {
        setAllPartyReportError("Report columns are not available.");
        return false;
      }
      if (filteredAllPartySalesRows.length === 0) {
        setAllPartyReportError("No report records are available to export.");
        return false;
      }
      setAllPartyReportError("");
      return true;
    } else {
      if (!isPartyReportGenerated) {
        setPartyReportError("Please generate the report before exporting.");
        return false;
      }
      if (partyReportColumns.length === 0) {
        setPartyReportError("Report columns are not available.");
        return false;
      }
      if (filteredPartySalesRows.length === 0) {
        setPartyReportError("No report records are available to export.");
        return false;
      }
      setPartyReportError("");
      return true;
    }
  };

  const buildPartyReportExportRows = (isAllParty = false) => {
    const rows = isAllParty ? filteredAllPartySalesRows : filteredPartySalesRows;
    const columns = isAllParty ? allPartyReportColumns : partyReportColumns;
    return rows.map((row) => {
      const exportRow = {};
      columns.forEach((column) => {
        exportRow[column.label] = getExportValue(column, row[column.key]);
      });
      return exportRow;
    });
  };

  const getLoggedInFirmDetails = () => {
    const storageKeys = ["loggedInUser", "user", "currentUser"];
    let loggedInUser = {};

    for (const key of storageKeys) {
      try {
        const storedValue = localStorage.getItem(key);
        if (!storedValue) continue;
        const parsed = JSON.parse(storedValue);
        if (parsed && typeof parsed === "object") {
          loggedInUser = parsed.user && typeof parsed.user === "object" ? parsed.user : parsed;
          break;
        }
      } catch {
        // Continue checking other keys.
      }
    }

    const firm = loggedInUser.firm && typeof loggedInUser.firm === "object"
      ? loggedInUser.firm
      : loggedInUser;

    return {
      firmName: String(
        firm.firmName ||
          firm.FirmName ||
          loggedInUser.firmName ||
          loggedInUser.FirmName ||
          localStorage.getItem("firmName") ||
          ""
      ).trim(),
      address: String(
        firm.address ||
          firm.Address ||
          firm.firmAddress ||
          firm.FirmAddress ||
          loggedInUser.address ||
          loggedInUser.Address ||
          localStorage.getItem("firmAddress") ||
          ""
      ).trim(),
      city: String(
        firm.city ||
          firm.City ||
          firm.town ||
          firm.Town ||
          loggedInUser.city ||
          loggedInUser.City ||
          ""
      ).trim(),
      phone: String(
        firm.phone ||
          firm.Phone ||
          firm.mobile ||
          firm.Mobile ||
          firm.mobileNo ||
          firm.MobileNo ||
          loggedInUser.phone ||
          loggedInUser.mobile ||
          ""
      ).trim(),
      gstNo: String(
        firm.gstNo ||
          firm.GSTNo ||
          firm.gstin ||
          firm.GSTIN ||
          firm.gstNumber ||
          loggedInUser.gstNo ||
          loggedInUser.GSTNo ||
          ""
      ).trim(),
      email: String(
        firm.email ||
          firm.Email ||
          loggedInUser.email ||
          loggedInUser.Email ||
          ""
      ).trim(),
    };
  };

  // =========================================================
  // PARTY REPORT - EXPORT FUNCTIONS
  // =========================================================
  const exportPartyReportToExcel = () => {
    try {
      if (!validatePartyReportExport(false)) return;

      const companyName = getSelectedCompanyName();
      const reportLevel = getPartyReportLevelName();
      const firmDetails = getLoggedInFirmDetails();
      const workbook = XLSX.utils.book_new();
      const columnCount = Math.max(partyReportColumns.length, 1);
      const worksheetData = [];

      worksheetData.push([firmDetails.firmName || "Firm Name"]);
      worksheetData.push(["Party Wise Sales Report"]);
      worksheetData.push(["Company", companyName, "Report Level", reportLevel]);
      worksheetData.push([
        "Period",
        `${partySalesFilters.fromDate} to ${partySalesFilters.toDate}`,
        "Records",
        filteredPartySalesRows.length,
      ]);
      worksheetData.push([]);

      const tableHeaderRowIndex = worksheetData.length;
      worksheetData.push(partyReportColumns.map((column) => column.label || column.key));

      filteredPartySalesRows.forEach((row) => {
        worksheetData.push(
          partyReportColumns.map((column) => getExportValue(column, row[column.key]))
        );
      });

      const totalRowIndex = worksheetData.length;
      worksheetData.push(
        partyReportColumns.map((column, columnIndex) =>
          getPartyReportTotalValue(column, columnIndex, partySalesTotals)
        )
      );

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      const thinBorder = {
        top: { style: "thin", color: { rgb: "9FB9C8" } },
        bottom: { style: "thin", color: { rgb: "9FB9C8" } },
        left: { style: "thin", color: { rgb: "9FB9C8" } },
        right: { style: "thin", color: { rgb: "9FB9C8" } },
      };

      const firmNameStyle = {
        font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "124F78" } },
        alignment: { horizontal: "center", vertical: "center" },
      };

      const reportTitleStyle = {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "F79646" } },
        alignment: { horizontal: "center", vertical: "center" },
      };

      const informationLabelStyle = {
        font: { bold: true, color: { rgb: "163D5C" } },
        fill: { patternType: "solid", fgColor: { rgb: "D7EAF5" } },
        alignment: { vertical: "center" },
        border: thinBorder,
      };

      const informationValueStyle = {
        font: { color: { rgb: "263E50" } },
        fill: { patternType: "solid", fgColor: { rgb: "F7FBFD" } },
        alignment: { vertical: "center", wrapText: true },
        border: thinBorder,
      };

      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "267BB3" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: thinBorder,
      };

      const oddRowStyle = {
        fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
        alignment: { vertical: "center" },
        border: thinBorder,
      };

      const evenRowStyle = {
        fill: { patternType: "solid", fgColor: { rgb: "EAF5FB" } },
        alignment: { vertical: "center" },
        border: thinBorder,
      };

      const totalStyle = {
        font: { bold: true, color: { rgb: "163D5C" } },
        fill: { patternType: "solid", fgColor: { rgb: "B7D6EA" } },
        alignment: { vertical: "center" },
        border: thinBorder,
      };

      const firmNameCell = worksheet["A1"];
      if (firmNameCell) firmNameCell.s = firmNameStyle;

      const reportTitleCell = worksheet["A2"];
      if (reportTitleCell) reportTitleCell.s = reportTitleStyle;

      [2, 3].forEach((rowIndex) => {
        [0, 2].forEach((labelColumnIndex) => {
          const labelCellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: labelColumnIndex });
          if (worksheet[labelCellAddress]) {
            worksheet[labelCellAddress].s = informationLabelStyle;
          }
        });
        [1, 3].forEach((valueColumnIndex) => {
          const valueCellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: valueColumnIndex });
          if (worksheet[valueCellAddress]) {
            worksheet[valueCellAddress].s = informationValueStyle;
          }
        });
      });

      partyReportColumns.forEach((_, columnIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: tableHeaderRowIndex, c: columnIndex });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = headerStyle;
        }
      });

      const dataStartRowIndex = tableHeaderRowIndex + 1;
      const dataEndRowIndex = totalRowIndex - 1;

      for (let rowIndex = dataStartRowIndex; rowIndex <= dataEndRowIndex; rowIndex += 1) {
        const isEvenRow = (rowIndex - dataStartRowIndex) % 2 === 1;
        partyReportColumns.forEach((column, columnIndex) => {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
          if (!worksheet[cellAddress]) {
            worksheet[cellAddress] = { t: "s", v: "" };
          }
          worksheet[cellAddress].s = {
            ...(isEvenRow ? evenRowStyle : oddRowStyle),
            alignment: {
              horizontal: column.type === "number" ? "right" : "left",
              vertical: "center",
            },
            numFmt: column.type === "number" ? "#,##0.00" : "General",
          };
        });
      }

      partyReportColumns.forEach((column, columnIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: totalRowIndex, c: columnIndex });
        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { t: "s", v: "" };
        }
        worksheet[cellAddress].s = {
          ...totalStyle,
          alignment: {
            horizontal: column.type === "number" ? "right" : "left",
            vertical: "center",
          },
          numFmt: column.type === "number" ? "#,##0.00" : "General",
        };
      });

      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: columnCount - 1 } },
      ];

      worksheet["!cols"] = partyReportColumns.map((column) => {
        const labelLength = String(column.label || "").length;
        let width = column.type === "number" ? 14 : Math.max(12, Math.min(35, labelLength + 5));
        if (column.key === "partyName" || column.key === "productName") width = 28;
        if (column.key === "billDate" || column.key === "batch") width = 14;
        return { wch: width };
      });

      worksheet["!rows"] = [];
      worksheet["!rows"][0] = { hpt: 24 };
      worksheet["!rows"][1] = { hpt: 22 };
      worksheet["!rows"][2] = { hpt: 20 };
      worksheet["!rows"][3] = { hpt: 20 };

      worksheet["!freeze"] = {
        xSplit: 0,
        ySplit: tableHeaderRowIndex + 1,
        topLeftCell: `A${tableHeaderRowIndex + 2}`,
        activePane: "bottomLeft",
        state: "frozen",
      };

      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: tableHeaderRowIndex, c: 0 },
          e: { r: dataEndRowIndex, c: columnCount - 1 },
        }),
      };

      worksheet["!pageSetup"] = {
        orientation: "landscape",
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
      };

      worksheet["!margins"] = {
        left: 0.25,
        right: 0.25,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      };

      XLSX.utils.book_append_sheet(workbook, worksheet, "Party Sales");

      const fileName = sanitizeExportFileName(
        `Party_Wise_Sales_${companyName}_${partySalesFilters.fromDate}_${partySalesFilters.toDate}`
      );

      XLSX.writeFile(workbook, `${fileName}.xlsx`, { cellStyles: true });
    } catch (error) {
      console.error("Excel export error:", error);
      setPartyReportError(error.message || "Failed to export Excel report.");
    }
  };

  const exportPartyReportToCsv = () => {
    try {
      if (!validatePartyReportExport(false)) return;

      const companyName = getSelectedCompanyName();
      const firmDetails = getLoggedInFirmDetails();
      const csvRows = [];

      csvRows.push([firmDetails.firmName || "Firm Name"]);
      csvRows.push(["Party Wise Sales Report"]);
      csvRows.push(["Company", companyName, "Report Level", getPartyReportLevelName()]);
      csvRows.push([
        "Period",
        `${partySalesFilters.fromDate} to ${partySalesFilters.toDate}`,
        "Records",
        filteredPartySalesRows.length,
      ]);
      csvRows.push([]);
      csvRows.push(partyReportColumns.map((column) => column.label || column.key));

      filteredPartySalesRows.forEach((row) => {
        csvRows.push(partyReportColumns.map((column) => getExportValue(column, row[column.key])));
      });

      csvRows.push(
        partyReportColumns.map((column, columnIndex) =>
          getPartyReportTotalValue(column, columnIndex, partySalesTotals)
        )
      );

      const escapeCsvValue = (value) => {
        const text = String(value ?? "");
        return `"${text.replace(/"/g, '""')}"`;
      };

      const csvContent =
        "\uFEFF" +
        csvRows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");

      const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const csvUrl = URL.createObjectURL(csvBlob);
      const downloadLink = document.createElement("a");
      const fileName = sanitizeExportFileName(
        `Party_Wise_Sales_${companyName}_${partySalesFilters.fromDate}_${partySalesFilters.toDate}`
      );

      downloadLink.href = csvUrl;
      downloadLink.download = `${fileName}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(csvUrl);
    } catch (error) {
      console.error("CSV export error:", error);
      setPartyReportError(error.message || "Failed to export CSV report.");
    }
  };

  const exportPartyReportToPdf = () => {
    try {
      if (!validatePartyReportExport(false)) return;

      const companyName = getSelectedCompanyName();
      const reportLevel = getPartyReportLevelName();

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: partyReportColumns.length > 12 ? "a3" : "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.setFontSize(15);
      pdf.text("Party Wise Sales Report", pageWidth / 2, 12, { align: "center" });
      pdf.setFontSize(8.5);
      pdf.text(`Company: ${companyName}`, 10, 19);
      pdf.text(`Report Level: ${reportLevel}`, 10, 24);
      pdf.text(
        `Period: ${partySalesFilters.fromDate} to ${partySalesFilters.toDate}`,
        10,
        29
      );
      pdf.text(`Records: ${filteredPartySalesRows.length}`, pageWidth - 10, 19, {
        align: "right",
      });

      const tableHead = [partyReportColumns.map((column) => column.label)];
      const tableBody = filteredPartySalesRows.map((row) =>
        partyReportColumns.map((column) => formatPartyReportValue(column, row[column.key]))
      );

      const totalsRow = partyReportColumns.map((column, columnIndex) => {
        const value = getPartyReportTotalValue(column, columnIndex, partySalesTotals);
        if (column.type === "number" && value !== "") return formatReportNumber(value);
        return value;
      });
      tableBody.push(totalsRow);

      const columnStyles = {};
      partyReportColumns.forEach((column, index) => {
        columnStyles[index] = {
          halign: column.type === "number" ? "right" : "left",
          cellWidth: "auto",
        };
      });

      autoTable(pdf, {
        startY: 34,
        head: tableHead,
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize: partyReportColumns.length > 15 ? 5 : 6.5,
          cellPadding: 1.2,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: { fontStyle: "bold", halign: "center" },
        columnStyles,
        didParseCell: (data) => {
          const isTotalRow =
            data.section === "body" && data.row.index === tableBody.length - 1;
          if (isTotalRow) {
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage: () => {
          const pageNumber = pdf.internal.getNumberOfPages();
          const pageHeight = pdf.internal.pageSize.getHeight();
          pdf.setFontSize(7);
          pdf.text(`Page ${pageNumber}`, pageWidth - 10, pageHeight - 5, {
            align: "right",
          });
        },
      });

      const fileName = sanitizeExportFileName(
        `Party_Wise_Sales_${companyName}_${partySalesFilters.fromDate}_${partySalesFilters.toDate}`
      );
      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("PDF export error:", error);
      setPartyReportError(error.message || "Failed to export PDF report.");
    }
  };

  const escapePrintHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const printPartyReport = () => {
    try {
      if (!validatePartyReportExport(false)) return;

      const companyName = getSelectedCompanyName();
      const reportLevel = getPartyReportLevelName();

      const tableHeaders = partyReportColumns
        .map(
          (column) => `
            <th class="${column.type === "number" ? "number-cell" : ""}">
              ${escapePrintHtml(column.label)}
            </th>
          `
        )
        .join("");

      const tableRows = filteredPartySalesRows
        .map(
          (row) => `
            <tr>
              ${partyReportColumns
                .map(
                  (column) => `
                    <td class="${column.type === "number" ? "number-cell" : ""}">
                      ${escapePrintHtml(formatPartyReportValue(column, row[column.key]))}
                    </td>
                  `
                )
                .join("")}
            </tr>
          `
        )
        .join("");

      const totalsCells = partyReportColumns
        .map((column, columnIndex) => {
          const value = getPartyReportTotalValue(column, columnIndex, partySalesTotals);
          const displayValue =
            column.type === "number" && value !== "" ? formatReportNumber(value) : value;
          return `
            <td class="${column.type === "number" ? "number-cell" : ""}">
              ${escapePrintHtml(displayValue)}
            </td>
          `;
        })
        .join("");

      const printWindow = window.open("", "_blank", "width=1400,height=900");
      if (!printWindow) {
        throw new Error("Print window was blocked. Please allow pop-ups for this website.");
      }

      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Party Wise Sales Report</title>
            <style>
              @page { size: landscape; margin: 8mm; }
              * { box-sizing: border-box; }
              body {
                margin: 0;
                color: #111827;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 10px;
              }
              .report-header { margin-bottom: 10px; text-align: center; }
              .report-header h1 { margin: 0 0 6px; font-size: 18px; }
              .report-information {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                gap: 5px 18px;
                border: 1px solid #9ca3af;
                padding: 6px 8px;
                text-align: left;
              }
              .report-information span { white-space: nowrap; }
              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: auto;
              }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
              tr { break-inside: avoid; page-break-inside: avoid; }
              th, td {
                border: 1px solid #6b7280;
                padding: 3px 4px;
                vertical-align: middle;
                overflow-wrap: anywhere;
              }
              th {
                background: #e5e7eb;
                font-weight: 700;
                text-align: center;
                white-space: nowrap;
              }
              tbody tr:nth-child(even) { background: #f9fafb; }
              tfoot td { background: #e5e7eb; font-weight: 700; }
              .number-cell { text-align: right; white-space: nowrap; }
              .print-footer { margin-top: 7px; text-align: right; font-size: 9px; }
              @media print {
                body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="report-header">
              <h1>Party Wise Sales Report</h1>
              <div class="report-information">
                <span><strong>Company:</strong> ${escapePrintHtml(companyName)}</span>
                <span><strong>Level:</strong> ${escapePrintHtml(reportLevel)}</span>
                <span><strong>Period:</strong> ${escapePrintHtml(partySalesFilters.fromDate)} to ${escapePrintHtml(partySalesFilters.toDate)}</span>
                <span><strong>Records:</strong> ${filteredPartySalesRows.length}</span>
              </div>
            </div>
            <table>
              <thead><tr>${tableHeaders}</tr></thead>
              <tbody>${tableRows}</tbody>
              <tfoot><tr>${totalsCells}</tr></tfoot>
            </table>
            <div class="print-footer">
              Printed on: ${escapePrintHtml(new Date().toLocaleString("en-IN"))}
            </div>
            <script>
              window.addEventListener("load", function () {
                window.focus();
                setTimeout(function () { window.print(); }, 300);
              });
              window.addEventListener("afterprint", function () { window.close(); });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("Print report error:", error);
      setPartyReportError(error.message || "Failed to print report.");
    }
  };

  // =========================================================
  // ALL PARTY REPORT - EXPORT FUNCTIONS
  // =========================================================
  const exportAllPartyReportToExcel = () => {
    try {
      if (!validatePartyReportExport(true)) return;

      const companyName = getSelectedCompanyName();
      const reportLevel = getPartyReportLevelName();
      const firmDetails = getLoggedInFirmDetails();
      const workbook = XLSX.utils.book_new();
      const columnCount = Math.max(allPartyReportColumns.length, 1);
      const worksheetData = [];

      worksheetData.push([firmDetails.firmName || "Firm Name"]);
      worksheetData.push(["All Party Wise Sales Report"]);
      worksheetData.push(["Company", companyName, "Report Level", reportLevel]);
      worksheetData.push([
        "Period",
        `${allPartySalesFilters.fromDate} to ${allPartySalesFilters.toDate}`,
        "Records",
        filteredAllPartySalesRows.length,
      ]);

      if (allPartySalesFilters.billWiseSalesman === "yes") {
        worksheetData.push(["Bill Wise Salesman", "Yes"]);
      }
      worksheetData.push(["Free Value On", allPartySalesFilters.freeValueOn]);

      worksheetData.push([]);

      const tableHeaderRowIndex = worksheetData.length;
      worksheetData.push(allPartyReportColumns.map((column) => column.label || column.key));

      filteredAllPartySalesRows.forEach((row) => {
        worksheetData.push(
          allPartyReportColumns.map((column) => getExportValue(column, row[column.key]))
        );
      });

      const totalRowIndex = worksheetData.length;
      worksheetData.push(
        allPartyReportColumns.map((column, columnIndex) =>
          getPartyReportTotalValue(column, columnIndex, allPartySalesTotals)
        )
      );

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      const thinBorder = {
        top: { style: "thin", color: { rgb: "9FB9C8" } },
        bottom: { style: "thin", color: { rgb: "9FB9C8" } },
        left: { style: "thin", color: { rgb: "9FB9C8" } },
        right: { style: "thin", color: { rgb: "9FB9C8" } },
      };

      const firmNameStyle = {
        font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "124F78" } },
        alignment: { horizontal: "center", vertical: "center" },
      };

      const reportTitleStyle = {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "F79646" } },
        alignment: { horizontal: "center", vertical: "center" },
      };

      const informationLabelStyle = {
        font: { bold: true, color: { rgb: "163D5C" } },
        fill: { patternType: "solid", fgColor: { rgb: "D7EAF5" } },
        alignment: { vertical: "center" },
        border: thinBorder,
      };

      const informationValueStyle = {
        font: { color: { rgb: "263E50" } },
        fill: { patternType: "solid", fgColor: { rgb: "F7FBFD" } },
        alignment: { vertical: "center", wrapText: true },
        border: thinBorder,
      };

      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "267BB3" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: thinBorder,
      };

      const oddRowStyle = {
        fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
        alignment: { vertical: "center" },
        border: thinBorder,
      };

      const evenRowStyle = {
        fill: { patternType: "solid", fgColor: { rgb: "EAF5FB" } },
        alignment: { vertical: "center" },
        border: thinBorder,
      };

      const totalStyle = {
        font: { bold: true, color: { rgb: "163D5C" } },
        fill: { patternType: "solid", fgColor: { rgb: "B7D6EA" } },
        alignment: { vertical: "center" },
        border: thinBorder,
      };

      const firmNameCell = worksheet["A1"];
      if (firmNameCell) firmNameCell.s = firmNameStyle;

      const reportTitleCell = worksheet["A2"];
      if (reportTitleCell) reportTitleCell.s = reportTitleStyle;

      [2, 3, 4, 5].forEach((rowIndex) => {
        if (rowIndex === 4) {
          const labelCellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
          if (worksheet[labelCellAddress]) {
            worksheet[labelCellAddress].s = informationLabelStyle;
          }
          const valueCellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: 1 });
          if (worksheet[valueCellAddress]) {
            worksheet[valueCellAddress].s = informationValueStyle;
          }
          return;
        }
        if (rowIndex === 5) {
          const labelCellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
          if (worksheet[labelCellAddress]) {
            worksheet[labelCellAddress].s = informationLabelStyle;
          }
          const valueCellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: 1 });
          if (worksheet[valueCellAddress]) {
            worksheet[valueCellAddress].s = informationValueStyle;
          }
          return;
        }
        [0, 2].forEach((labelColumnIndex) => {
          const labelCellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: labelColumnIndex });
          if (worksheet[labelCellAddress]) {
            worksheet[labelCellAddress].s = informationLabelStyle;
          }
        });
        [1, 3].forEach((valueColumnIndex) => {
          const valueCellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: valueColumnIndex });
          if (worksheet[valueCellAddress]) {
            worksheet[valueCellAddress].s = informationValueStyle;
          }
        });
      });

      allPartyReportColumns.forEach((_, columnIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: tableHeaderRowIndex, c: columnIndex });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = headerStyle;
        }
      });

      const dataStartRowIndex = tableHeaderRowIndex + 1;
      const dataEndRowIndex = totalRowIndex - 1;

      for (let rowIndex = dataStartRowIndex; rowIndex <= dataEndRowIndex; rowIndex += 1) {
        const isEvenRow = (rowIndex - dataStartRowIndex) % 2 === 1;
        allPartyReportColumns.forEach((column, columnIndex) => {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
          if (!worksheet[cellAddress]) {
            worksheet[cellAddress] = { t: "s", v: "" };
          }
          worksheet[cellAddress].s = {
            ...(isEvenRow ? evenRowStyle : oddRowStyle),
            alignment: {
              horizontal: column.type === "number" ? "right" : "left",
              vertical: "center",
            },
            numFmt: column.type === "number" ? "#,##0.00" : "General",
          };
        });
      }

      allPartyReportColumns.forEach((column, columnIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: totalRowIndex, c: columnIndex });
        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { t: "s", v: "" };
        }
        worksheet[cellAddress].s = {
          ...totalStyle,
          alignment: {
            horizontal: column.type === "number" ? "right" : "left",
            vertical: "center",
          },
          numFmt: column.type === "number" ? "#,##0.00" : "General",
        };
      });

      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: columnCount - 1 } },
      ];

      worksheet["!cols"] = allPartyReportColumns.map((column) => {
        const labelLength = String(column.label || "").length;
        let width = column.type === "number" ? 14 : Math.max(12, Math.min(35, labelLength + 5));
        if (column.key === "partyName" || column.key === "productName") width = 28;
        if (column.key === "billDate" || column.key === "batch") width = 14;
        return { wch: width };
      });

      worksheet["!rows"] = [];
      worksheet["!rows"][0] = { hpt: 24 };
      worksheet["!rows"][1] = { hpt: 22 };
      worksheet["!rows"][2] = { hpt: 20 };
      worksheet["!rows"][3] = { hpt: 20 };

      worksheet["!freeze"] = {
        xSplit: 0,
        ySplit: tableHeaderRowIndex + 1,
        topLeftCell: `A${tableHeaderRowIndex + 2}`,
        activePane: "bottomLeft",
        state: "frozen",
      };

      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: tableHeaderRowIndex, c: 0 },
          e: { r: dataEndRowIndex, c: columnCount - 1 },
        }),
      };

      worksheet["!pageSetup"] = {
        orientation: "landscape",
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
      };

      worksheet["!margins"] = {
        left: 0.25,
        right: 0.25,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      };

      XLSX.utils.book_append_sheet(workbook, worksheet, "All Party Sales");

      const fileName = sanitizeExportFileName(
        `All_Party_Wise_Sales_${companyName}_${allPartySalesFilters.fromDate}_${allPartySalesFilters.toDate}`
      );

      XLSX.writeFile(workbook, `${fileName}.xlsx`, { cellStyles: true });
    } catch (error) {
      console.error("Excel export error:", error);
      setAllPartyReportError(error.message || "Failed to export Excel report.");
    }
  };

  const exportAllPartyReportToCsv = () => {
    try {
      if (!validatePartyReportExport(true)) return;

      const companyName = getSelectedCompanyName();
      const firmDetails = getLoggedInFirmDetails();
      const csvRows = [];

      csvRows.push([firmDetails.firmName || "Firm Name"]);
      csvRows.push(["All Party Wise Sales Report"]);
      csvRows.push(["Company", companyName, "Report Level", getPartyReportLevelName()]);
      csvRows.push([
        "Period",
        `${allPartySalesFilters.fromDate} to ${allPartySalesFilters.toDate}`,
        "Records",
        filteredAllPartySalesRows.length,
      ]);
      csvRows.push(["Bill Wise Salesman", allPartySalesFilters.billWiseSalesman === "yes" ? "Yes" : "No"]);
      csvRows.push(["Free Value On", allPartySalesFilters.freeValueOn]);
      csvRows.push([]);
      csvRows.push(allPartyReportColumns.map((column) => column.label || column.key));

      filteredAllPartySalesRows.forEach((row) => {
        csvRows.push(allPartyReportColumns.map((column) => getExportValue(column, row[column.key])));
      });

      csvRows.push(
        allPartyReportColumns.map((column, columnIndex) =>
          getPartyReportTotalValue(column, columnIndex, allPartySalesTotals)
        )
      );

      const escapeCsvValue = (value) => {
        const text = String(value ?? "");
        return `"${text.replace(/"/g, '""')}"`;
      };

      const csvContent =
        "\uFEFF" +
        csvRows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");

      const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const csvUrl = URL.createObjectURL(csvBlob);
      const downloadLink = document.createElement("a");
      const fileName = sanitizeExportFileName(
        `All_Party_Wise_Sales_${companyName}_${allPartySalesFilters.fromDate}_${allPartySalesFilters.toDate}`
      );

      downloadLink.href = csvUrl;
      downloadLink.download = `${fileName}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(csvUrl);
    } catch (error) {
      console.error("CSV export error:", error);
      setAllPartyReportError(error.message || "Failed to export CSV report.");
    }
  };

  const exportAllPartyReportToPdf = () => {
    try {
      if (!validatePartyReportExport(true)) return;

      const companyName = getSelectedCompanyName();
      const reportLevel = getPartyReportLevelName();

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: allPartyReportColumns.length > 12 ? "a3" : "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.setFontSize(15);
      pdf.text("All Party Wise Sales Report", pageWidth / 2, 12, { align: "center" });
      pdf.setFontSize(8.5);
      pdf.text(`Company: ${companyName}`, 10, 19);
      pdf.text(`Report Level: ${reportLevel}`, 10, 24);
      pdf.text(
        `Period: ${allPartySalesFilters.fromDate} to ${allPartySalesFilters.toDate}`,
        10,
        29
      );
      pdf.text(`Records: ${filteredAllPartySalesRows.length}`, pageWidth - 10, 19, {
        align: "right",
      });
      pdf.text(`Bill Wise Salesman: ${allPartySalesFilters.billWiseSalesman === "yes" ? "Yes" : "No"}`, 10, 34);
      pdf.text(`Free Value On: ${allPartySalesFilters.freeValueOn}`, 10, 39);

      const tableHead = [allPartyReportColumns.map((column) => column.label)];
      const tableBody = filteredAllPartySalesRows.map((row) =>
        allPartyReportColumns.map((column) => formatPartyReportValue(column, row[column.key]))
      );

      const totalsRow = allPartyReportColumns.map((column, columnIndex) => {
        const value = getPartyReportTotalValue(column, columnIndex, allPartySalesTotals);
        if (column.type === "number" && value !== "") return formatReportNumber(value);
        return value;
      });
      tableBody.push(totalsRow);

      const columnStyles = {};
      allPartyReportColumns.forEach((column, index) => {
        columnStyles[index] = {
          halign: column.type === "number" ? "right" : "left",
          cellWidth: "auto",
        };
      });

      autoTable(pdf, {
        startY: 44,
        head: tableHead,
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize: allPartyReportColumns.length > 15 ? 5 : 6.5,
          cellPadding: 1.2,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: { fontStyle: "bold", halign: "center" },
        columnStyles,
        didParseCell: (data) => {
          const isTotalRow =
            data.section === "body" && data.row.index === tableBody.length - 1;
          if (isTotalRow) {
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage: () => {
          const pageNumber = pdf.internal.getNumberOfPages();
          const pageHeight = pdf.internal.pageSize.getHeight();
          pdf.setFontSize(7);
          pdf.text(`Page ${pageNumber}`, pageWidth - 10, pageHeight - 5, {
            align: "right",
          });
        },
      });

      const fileName = sanitizeExportFileName(
        `All_Party_Wise_Sales_${companyName}_${allPartySalesFilters.fromDate}_${allPartySalesFilters.toDate}`
      );
      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("PDF export error:", error);
      setAllPartyReportError(error.message || "Failed to export PDF report.");
    }
  };

  const printAllPartyReport = () => {
    try {
      if (!validatePartyReportExport(true)) return;

      const companyName = getSelectedCompanyName();
      const reportLevel = getPartyReportLevelName();

      const tableHeaders = allPartyReportColumns
        .map(
          (column) => `
            <th class="${column.type === "number" ? "number-cell" : ""}">
              ${escapePrintHtml(column.label)}
            </th>
          `
        )
        .join("");

      const tableRows = filteredAllPartySalesRows
        .map(
          (row) => `
            <tr>
              ${allPartyReportColumns
                .map(
                  (column) => `
                    <td class="${column.type === "number" ? "number-cell" : ""}">
                      ${escapePrintHtml(formatPartyReportValue(column, row[column.key]))}
                    </td>
                  `
                )
                .join("")}
            </tr>
          `
        )
        .join("");

      const totalsCells = allPartyReportColumns
        .map((column, columnIndex) => {
          const value = getPartyReportTotalValue(column, columnIndex, allPartySalesTotals);
          const displayValue =
            column.type === "number" && value !== "" ? formatReportNumber(value) : value;
          return `
            <td class="${column.type === "number" ? "number-cell" : ""}">
              ${escapePrintHtml(displayValue)}
            </td>
          `;
        })
        .join("");

      const printWindow = window.open("", "_blank", "width=1400,height=900");
      if (!printWindow) {
        throw new Error("Print window was blocked. Please allow pop-ups for this website.");
      }

      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>All Party Wise Sales Report</title>
            <style>
              @page { size: landscape; margin: 8mm; }
              * { box-sizing: border-box; }
              body {
                margin: 0;
                color: #111827;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 10px;
              }
              .report-header { margin-bottom: 10px; text-align: center; }
              .report-header h1 { margin: 0 0 6px; font-size: 18px; }
              .report-information {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                gap: 5px 18px;
                border: 1px solid #9ca3af;
                padding: 6px 8px;
                text-align: left;
              }
              .report-information span { white-space: nowrap; }
              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: auto;
              }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
              tr { break-inside: avoid; page-break-inside: avoid; }
              th, td {
                border: 1px solid #6b7280;
                padding: 3px 4px;
                vertical-align: middle;
                overflow-wrap: anywhere;
              }
              th {
                background: #e5e7eb;
                font-weight: 700;
                text-align: center;
                white-space: nowrap;
              }
              tbody tr:nth-child(even) { background: #f9fafb; }
              tfoot td { background: #e5e7eb; font-weight: 700; }
              .number-cell { text-align: right; white-space: nowrap; }
              .print-footer { margin-top: 7px; text-align: right; font-size: 9px; }
              @media print {
                body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="report-header">
              <h1>All Party Wise Sales Report</h1>
              <div class="report-information">
                <span><strong>Company:</strong> ${escapePrintHtml(companyName)}</span>
                <span><strong>Level:</strong> ${escapePrintHtml(reportLevel)}</span>
                <span><strong>Period:</strong> ${escapePrintHtml(allPartySalesFilters.fromDate)} to ${escapePrintHtml(allPartySalesFilters.toDate)}</span>
                <span><strong>Records:</strong> ${filteredAllPartySalesRows.length}</span>
                <span><strong>Bill Wise Salesman:</strong> ${allPartySalesFilters.billWiseSalesman === "yes" ? "Yes" : "No"}</span>
                <span><strong>Free Value On:</strong> ${escapePrintHtml(allPartySalesFilters.freeValueOn)}</span>
              </div>
            </div>
            <table>
              <thead><tr>${tableHeaders}</tr></thead>
              <tbody>${tableRows}</tbody>
              <tfoot><tr>${totalsCells}</tr></tfoot>
            </table>
            <div class="print-footer">
              Printed on: ${escapePrintHtml(new Date().toLocaleString("en-IN"))}
            </div>
            <script>
              window.addEventListener("load", function () {
                window.focus();
                setTimeout(function () { window.print(); }, 300);
              });
              window.addEventListener("afterprint", function () { window.close(); });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("Print report error:", error);
      setAllPartyReportError(error.message || "Failed to print report.");
    }
  };

  const partyTotalPages = Math.max(
    1,
    Math.ceil(filteredPartySalesRows.length / partyRowsPerPage)
  );
  const partySafeCurrentPage = Math.min(partyCurrentPage, partyTotalPages);
  const partyPageStart = (partySafeCurrentPage - 1) * partyRowsPerPage;
  const partyPageRows = filteredPartySalesRows.slice(
    partyPageStart,
    partyPageStart + partyRowsPerPage
  );
  const partyStartRecord = filteredPartySalesRows.length === 0 ? 0 : partyPageStart + 1;
  const partyEndRecord = Math.min(
    partyPageStart + partyRowsPerPage,
    filteredPartySalesRows.length
  );

  const allPartyTotalPages = Math.max(
    1,
    Math.ceil(filteredAllPartySalesRows.length / allPartyRowsPerPage)
  );
  const allPartySafeCurrentPage = Math.min(allPartyCurrentPage, allPartyTotalPages);
  const allPartyPageStart = (allPartySafeCurrentPage - 1) * allPartyRowsPerPage;
  const allPartyPageRows = filteredAllPartySalesRows.slice(
    allPartyPageStart,
    allPartyPageStart + allPartyRowsPerPage
  );

  const partyQuickSummary = useMemo(() => {
    const partyCodes = new Set();
    const invoices = new Set();
    let totalAmount = 0;
    let totalQuantity = 0;

    partyReportRows.forEach((row) => {
      const partyCode = String(
        row.partyCode || row.accountCode || row.acCode || row.partyName || ""
      ).trim();
      if (partyCode) partyCodes.add(partyCode);
      const invoiceKey = [row.billSeries, row.billNo]
        .filter((value) => value !== undefined && value !== null && value !== "")
        .join("-");
      if (invoiceKey) invoices.add(invoiceKey);
      totalAmount += Number(row.netAmount || row.billAmount || row.amount || 0);
      totalQuantity += Number(row.qty || row.quantity || row.totalQty || 0);
    });

    return {
      totalParties: partyCodes.size,
      totalInvoices: invoices.size,
      totalAmount,
      totalQuantity,
    };
  }, [partyReportRows]);

  const setPartyQuickDateRange = (rangeType) => {
    const today = new Date();
    let fromDate = new Date(today);
    let toDate = new Date(today);

    if (rangeType === "month") {
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    if (rangeType === "financialYear") {
      const startYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      fromDate = new Date(startYear, 3, 1);
    }

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    if (selectedReport === "Party Wise Sales Report") {
      setPartySalesFilters((previous) => ({
        ...previous,
        fromDate: formatDate(fromDate),
        toDate: formatDate(toDate),
      }));
      setPartyReportRows([]);
      setPartyReportColumns([]);
      setIsPartyReportGenerated(false);
      setPartyCurrentPage(1);
    } else {
      setAllPartySalesFilters((previous) => ({
        ...previous,
        fromDate: formatDate(fromDate),
        toDate: formatDate(toDate),
      }));
      setAllPartyReportRows([]);
      setAllPartyReportColumns([]);
      setIsAllPartyReportGenerated(false);
      setAllPartyCurrentPage(1);
    }
  };

  // =========================================================
  // VISIBLE OPTIONS FOR SELECTORS
  // =========================================================
  const visiblePartyOptions = useMemo(() => {
    const search = normalizeText(partySelectorSearch);
    return companyFilteredAccounts.filter((account, index) => {
      if (!search) return true;
      const code = getAccountCode(account, index);
      const name = getAccountName(account);
      return [code, name, account?.town, account?.mobileNo].some((value) =>
        normalizeText(value).includes(search)
      );
    });
  }, [companyFilteredAccounts, partySelectorSearch]);

  const visibleSalesmanOptions = useMemo(() => {
    const search = normalizeText(salesmanSelectorSearch);
    return mappedSalesmen.filter((salesman, index) => {
      if (!search) return true;
      const salesmanCode = getSalesmanCode(salesman, index);
      const salesmanName = getSalesmanName(salesman);
      return [salesmanCode, salesmanName].some((value) =>
        normalizeText(value).includes(search)
      );
    });
  }, [mappedSalesmen, salesmanSelectorSearch]);

  const visibleAreaOptions = useMemo(() => {
    const search = normalizeText(areaSelectorSearch);
    return mappedAreas.filter((area, index) => {
      if (!search) return true;
      const areaCode = getAreaCode(area, index);
      const areaName = getAreaName(area);
      return [areaCode, areaName].some((value) =>
        normalizeText(value).includes(search)
      );
    });
  }, [mappedAreas, areaSelectorSearch]);

  const visibleAllAreaOptions = useMemo(() => {
    const search = normalizeText(allAreaSelectorSearch);
    return mappedAreas.filter((area, index) => {
      if (!search) return true;
      const areaCode = getAreaCode(area, index);
      const areaName = getAreaName(area);
      return [areaCode, areaName].some((value) =>
        normalizeText(value).includes(search)
      );
    });
  }, [mappedAreas, allAreaSelectorSearch]);

  const visibleAllSalesmanOptions = useMemo(() => {
    const search = normalizeText(allSalesmanSelectorSearch);
    return mappedSalesmen.filter((salesman, index) => {
      if (!search) return true;
      const salesmanCode = getSalesmanCode(salesman, index);
      const salesmanName = getSalesmanName(salesman);
      return [salesmanCode, salesmanName].some((value) =>
        normalizeText(value).includes(search)
      );
    });
  }, [mappedSalesmen, allSalesmanSelectorSearch]);

  const clearPartySalesFilters = () => {
    setPartySalesFilters({
      company: "",
      reportLevel: "salesSummary",
      selectedPartyCodes: [],
      selectedArea: "no",
      selectedAreaCodes: [],
      selectedSalesman: "no",
      selectedSalesmanCodes: [],
      productWise: "no",
      fromDate: getFinancialYearStart(),
      toDate: getTodayDate(),
      withCreditNote: "no",
      orderBy: "partyName",
    });
    setPartyReportRows([]);
    setPartyReportColumns([]);
    setPartyReportSearch("");
    setPartySelectorSearch("");
    setAreaSelectorSearch("");
    setSalesmanSelectorSearch("");
    setShowPartySelector(false);
    setShowAreaSelector(false);
    setShowSalesmanSelector(false);
    setPartyCurrentPage(1);
    setPartyReportError("");
    setIsPartyReportGenerated(false);
  };

  const clearAllPartySalesFilters = () => {
    setAllPartySalesFilters({
      company: "",
      reportLevel: "salesSummary",
      selectedArea: "no",
      selectedAreaCodes: [],
      selectedSalesman: "no",
      selectedSalesmanCodes: [],
      productWise: "no",
      fromDate: getFinancialYearStart(),
      toDate: getTodayDate(),
      withCreditNote: "no",
      orderBy: "partyName",
      billWiseSalesman: "no",
      freeValueOn: "PRate",
    });
    setAllPartyReportRows([]);
    setAllPartyReportColumns([]);
    setAllPartyReportSearch("");
    setAllAreaSelectorSearch("");
    setAllSalesmanSelectorSearch("");
    setShowAllAreaSelector(false);
    setShowAllSalesmanSelector(false);
    setAllPartyCurrentPage(1);
    setAllPartyReportError("");
    setIsAllPartyReportGenerated(false);
  };

  // =========================================================
  // PRODUCT SALES REPORT STATE (existing)
  // =========================================================
  const [productSalesFilters, setProductSalesFilters] = useState(() => ({
    company: "",
    productCode: "",
    productGroup: "",
    category: "",
    subCategory: "",
    brand: "",
    fromDate: getFinancialYearStart(),
    toDate: getTodayDate(),
    salesman: "",
    area: "",
    party: "",
    billType: "",
    reportLevel: "summary",
    scope: "all",
    crnStatus: "all",
    orderBy: "productName",
    showZeroSales: "no",
  }));

  const [reportSearch, setReportSearch] = useState("");
  const [reportZoom, setReportZoom] = useState("100");
  const [currentPage, setCurrentPage] = useState(1);

  const reportInformation =
    REPORT_INFORMATION[selectedReport] || {
      title: selectedReport || "Reports",
      category: "Report",
      description: "Select report filters and generate the report.",
      icon: FileBarChart,
    };

  const ReportIcon = reportInformation.icon;
  const isPurchaseReport = selectedReport === "Company Wise Purchase Report";
  const isPartyReport = selectedReport === "Party Wise Sales Report";
  const isAllPartyReport = selectedReport === "All Party Wise Sales Report";
  const isProductReport =
    selectedReport === "Product Wise Sales Report" ||
    selectedReport === "Product Ledger";
  const isDateStockReport = selectedReport === "As On Date Stock Report";

  // =========================================================
  // PRODUCT SALES REPORT (existing mock data)
  // =========================================================
  const productSalesReportRows = useMemo(
    () => [
      {
        srNo: 1,
        productCode: "P001",
        productName: "Fortune Sunlite Oil 1L",
        category: "Edible Oil",
        unit: "PCS",
        openingStock: 150,
        basicQty: 250,
        altQty: 0,
        totalQty: 250,
        grossAmount: 25000,
        discount: 1000,
        netAmount: 24000,
        cgst: 1080,
        sgst: 1080,
        igst: 0,
        totalTax: 2160,
        netSales: 26160,
        crnAmount: 500,
        balanceAmount: 25660,
      },
    ],
    []
  );

  const filteredProductSalesRows = useMemo(() => {
    const searchText = reportSearch.trim().toLowerCase();
    if (!searchText) return productSalesReportRows;
    return productSalesReportRows.filter((row) =>
      [
        row.productCode,
        row.productName,
        row.category,
        row.unit,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(searchText)
      )
    );
  }, [productSalesReportRows, reportSearch]);

  const productSalesTotals = useMemo(() => {
    return filteredProductSalesRows.reduce(
      (totals, row) => ({
        openingStock: totals.openingStock + Number(row.openingStock || 0),
        basicQty: totals.basicQty + Number(row.basicQty || 0),
        altQty: totals.altQty + Number(row.altQty || 0),
        totalQty: totals.totalQty + Number(row.totalQty || 0),
        grossAmount: totals.grossAmount + Number(row.grossAmount || 0),
        discount: totals.discount + Number(row.discount || 0),
        netAmount: totals.netAmount + Number(row.netAmount || 0),
        cgst: totals.cgst + Number(row.cgst || 0),
        sgst: totals.sgst + Number(row.sgst || 0),
        igst: totals.igst + Number(row.igst || 0),
        totalTax: totals.totalTax + Number(row.totalTax || 0),
        netSales: totals.netSales + Number(row.netSales || 0),
        crnAmount: totals.crnAmount + Number(row.crnAmount || 0),
        balanceAmount: totals.balanceAmount + Number(row.balanceAmount || 0),
      }),
      {
        openingStock: 0,
        basicQty: 0,
        altQty: 0,
        totalQty: 0,
        grossAmount: 0,
        discount: 0,
        netAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
        netSales: 0,
        crnAmount: 0,
        balanceAmount: 0,
      }
    );
  }, [filteredProductSalesRows]);

  // =========================================================
  // PRODUCT SALES REPORT - MOCK DATASET
  // =========================================================
  const productSalesMockData = useMemo(
    () => [
      { productCode: "P001", productName: "Fortune Sunlite Oil 1L", group: "Edible Oil", category: "Oil", subCategory: "Cooking Oil", brand: "Fortune", unit: "PCS", openingStock: 150, basicQty: 250, altQty: 0, totalQty: 250, freeQty: 12, grossAmount: 25000, discount: 1000, netAmount: 24000, cgst: 1080, sgst: 1080, igst: 0, totalTax: 2160, netSales: 26160, crnAmount: 500, balanceAmount: 25660 },
      { productCode: "P002", productName: "Parle G Biscuit 250g", group: "Biscuits", category: "Snacks", subCategory: "Biscuit", brand: "Parle", unit: "PCS", openingStock: 500, basicQty: 800, altQty: 0, totalQty: 800, freeQty: 30, grossAmount: 16000, discount: 400, netAmount: 15600, cgst: 702, sgst: 702, igst: 0, totalTax: 1404, netSales: 17004, crnAmount: 200, balanceAmount: 16804 },
      { productCode: "P003", productName: "Lays Classic Salted 70g", group: "Snacks", category: "Snacks", subCategory: "Chips", brand: "Lays", unit: "PCS", openingStock: 400, basicQty: 600, altQty: 0, totalQty: 600, freeQty: 20, grossAmount: 12000, discount: 300, netAmount: 11700, cgst: 526.5, sgst: 526.5, igst: 0, totalTax: 1053, netSales: 12753, crnAmount: 0, balanceAmount: 12753 },
      { productCode: "P004", productName: "Coca Cola 2L", group: "Beverages", category: "Cold Drinks", subCategory: "Soft Drink", brand: "Coca Cola", unit: "LTR", openingStock: 200, basicQty: 350, altQty: 0, totalQty: 350, freeQty: 10, grossAmount: 29750, discount: 500, netAmount: 29250, cgst: 1316.25, sgst: 1316.25, igst: 0, totalTax: 2632.5, netSales: 31882.5, crnAmount: 150, balanceAmount: 31732.5 },
      { productCode: "P005", productName: "Tata Tea 1kg", group: "Beverages", category: "Tea", subCategory: "Tea Leaf", brand: "Tata", unit: "KG", openingStock: 120, basicQty: 180, altQty: 0, totalQty: 180, freeQty: 8, grossAmount: 39600, discount: 800, netAmount: 38800, cgst: 970, sgst: 970, igst: 0, totalTax: 1940, netSales: 40740, crnAmount: 300, balanceAmount: 40440 },
      { productCode: "P006", productName: "Surf Excel 2kg", group: "Detergent", category: "Household", subCategory: "Washing Powder", brand: "Surf", unit: "KG", openingStock: 180, basicQty: 260, altQty: 0, totalQty: 260, freeQty: 15, grossAmount: 117000, discount: 2000, netAmount: 115000, cgst: 10350, sgst: 10350, igst: 0, totalTax: 20700, netSales: 135700, crnAmount: 500, balanceAmount: 135200 },
      { productCode: "P007", productName: "Amul Butter 500g", group: "Dairy", category: "Dairy", subCategory: "Butter", brand: "Amul", unit: "PCS", openingStock: 90, basicQty: 140, altQty: 0, totalQty: 140, freeQty: 5, grossAmount: 35000, discount: 700, netAmount: 34300, cgst: 1543.5, sgst: 1543.5, igst: 0, totalTax: 3087, netSales: 37387, crnAmount: 100, balanceAmount: 37287 },
      { productCode: "P008", productName: "Maggi Noodles 70g", group: "Noodles", category: "Snacks", subCategory: "Instant Noodles", brand: "Maggi", unit: "PCS", openingStock: 600, basicQty: 900, altQty: 0, totalQty: 900, freeQty: 40, grossAmount: 12600, discount: 300, netAmount: 12300, cgst: 553.5, sgst: 553.5, igst: 0, totalTax: 1107, netSales: 13407, crnAmount: 0, balanceAmount: 13407 },
      { productCode: "P009", productName: "Colgate Toothpaste 150g", group: "Personal Care", category: "Oral Care", subCategory: "Toothpaste", brand: "Colgate", unit: "PCS", openingStock: 300, basicQty: 450, altQty: 0, totalQty: 450, freeQty: 18, grossAmount: 58500, discount: 1200, netAmount: 57300, cgst: 2578.5, sgst: 2578.5, igst: 0, totalTax: 5157, netSales: 62457, crnAmount: 250, balanceAmount: 62207 },
      { productCode: "P010", productName: "Dove Soap 100g", group: "Personal Care", category: "Bath", subCategory: "Soap", brand: "Dove", unit: "PCS", openingStock: 250, basicQty: 380, altQty: 0, totalQty: 380, freeQty: 16, grossAmount: 19000, discount: 400, netAmount: 18600, cgst: 837, sgst: 837, igst: 0, totalTax: 1674, netSales: 20274, crnAmount: 0, balanceAmount: 20274 },
    ],
    []
  );

  const productOptionList = useMemo(() => {
    if (Array.isArray(products) && products.length > 0) {
      return products;
    }
    return productSalesMockData;
  }, [products, productSalesMockData]);

  const updateProductReportFilter = (field, value) => {
    setProductReportFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
    setIsProductReportGenerated(false);
    setProductReportRows([]);
    setProductReportError("");
    setCurrentPage(1);
  };

  const updateAllProductReportFilter = (field, value) => {
    setAllProductReportFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
    setIsAllProductReportGenerated(false);
    setAllProductReportRows([]);
    setAllProductReportError("");
  };

  const clearProductSalesFilters = () => {
    setProductReportFilters({
      company: "",
      selectedProductCodes: [],
      fromDate: getFinancialYearStart(),
      toDate: getTodayDate(),
      selectedArea: "no",
      selectedAreaCodes: [],
      selectedSalesman: "no",
      selectedSalesmanCodes: [],
      withCreditNote: "no",
      orderBy: "productName",
      showZeroSales: "no",
    });
    setProductReportRows([]);
    setProductReportColumns([]);
    setProductReportSearch("");
    setProductSelectorSearch("");
    setShowProductSelector(false);
    setIsProductReportGenerated(false);
    setProductReportError("");
    setCurrentPage(1);
  };

  const clearAllProductSalesFilters = () => {
    setAllProductReportFilters({
      company: "",
      productCode: "",
      productGroup: "",
      category: "",
      subCategory: "",
      brand: "",
      fromDate: getFinancialYearStart(),
      toDate: getTodayDate(),
      salesman: "",
      area: "",
      party: "",
      billType: "",
      reportLevel: "summary",
      scope: "all",
      crnStatus: "all",
      orderBy: "productName",
      showZeroSales: "no",
    });
    setAllProductReportRows([]);
    setAllProductReportColumns([]);
    setAllProductReportSearch("");
    setIsAllProductReportGenerated(false);
    setAllProductReportError("");
  };

  const buildProductReportColumns = () => [
    { key: "srNo", label: "Sr No", type: "string" },
    { key: "productCode", label: "Product Code", type: "string" },
    { key: "productName", label: "Product Name", type: "string" },
    { key: "group", label: "Group", type: "string" },
    { key: "category", label: "Category", type: "string" },
    { key: "unit", label: "Unit", type: "string" },
    { key: "openingStock", label: "Opening Stock", type: "number" },
    { key: "totalQty", label: "Sold Qty", type: "number" },
    { key: "freeQty", label: "Free Qty", type: "number" },
    { key: "grossAmount", label: "Gross Amount", type: "number" },
    { key: "discount", label: "Discount", type: "number" },
    { key: "netAmount", label: "Net Amount", type: "number" },
    { key: "totalTax", label: "GST", type: "number" },
    { key: "netSales", label: "Net Sales", type: "number" },
    { key: "crnAmount", label: "CRN Amount", type: "number" },
    { key: "balanceAmount", label: "Balance", type: "number" },
  ];

  const applyProductReportFilters = (source, filters, isAll = false) => {
    let rows = source.map((row, index) => ({
      ...row,
      srNo: index + 1,
      rowId: `${row.productCode}-${index}`,
    }));

    if (!isAll && filters.productCode) {
      rows = rows.filter(
        (row) =>
          String(row.productCode) === String(filters.productCode)
      );
    }

    if (filters.productGroup) {
      rows = rows.filter(
        (row) =>
          String(row.group || "").toLowerCase() ===
          String(filters.productGroup).toLowerCase()
      );
    }

    if (filters.category) {
      rows = rows.filter(
        (row) =>
          String(row.category || "").toLowerCase() ===
          String(filters.category).toLowerCase()
      );
    }

    if (filters.brand) {
      rows = rows.filter(
        (row) =>
          String(row.brand || "").toLowerCase() ===
          String(filters.brand).toLowerCase()
      );
    }

    if (filters.showZeroSales === "no") {
      rows = rows.filter((row) => Number(row.totalQty || 0) > 0);
    }

    if (filters.orderBy === "productCode") {
      rows.sort((a, b) => String(a.productCode).localeCompare(String(b.productCode)));
    } else if (filters.orderBy === "netAmount") {
      rows.sort((a, b) => Number(b.netAmount) - Number(a.netAmount));
    } else if (filters.orderBy === "grossAmount") {
      rows.sort((a, b) => Number(b.grossAmount) - Number(a.grossAmount));
    } else {
      rows.sort((a, b) => String(a.productName).localeCompare(String(b.productName)));
    }

    return rows;
  };

  const generateProductSalesReport = async () => {
    try {
      setProductReportError("");
      setProductReportRows([]);
      setProductReportColumns([]);

      if (!productReportFilters.fromDate || !productReportFilters.toDate) {
        throw new Error("From Date and To Date are required.");
      }
      if (productReportFilters.fromDate > productReportFilters.toDate) {
        throw new Error("From Date cannot be greater than To Date.");
      }

      setIsProductReportLoading(true);

      const { distributorId, firmId } = getLoggedInContext();

      if (!distributorId || !firmId) {
        throw new Error("Distributor or firm information is missing. Please login again.");
      }

      const query = new URLSearchParams({
        distributorId,
        firmId,
        companyCode: productReportFilters.company || "",
        fromDate: productReportFilters.fromDate,
        toDate: productReportFilters.toDate,
        orderBy: productReportFilters.orderBy,
        showZeroSales: productReportFilters.showZeroSales,
        withCreditNote: productReportFilters.withCreditNote,
      });

      if (productReportFilters.selectedProductCodes?.length > 0) {
        query.set("productCodes", productReportFilters.selectedProductCodes.join(","));
      }

      if (productReportFilters.selectedArea === "yes" && productReportFilters.selectedAreaCodes.length > 0) {
        query.set("selectedAreaCodes", productReportFilters.selectedAreaCodes.join(","));
      }

      if (productReportFilters.selectedSalesman === "yes" && productReportFilters.selectedSalesmanCodes.length > 0) {
        query.set("selectedSalesmanCodes", productReportFilters.selectedSalesmanCodes.join(","));
      }

      const response = await fetch(
        `${API_BASE_URL}/api/reports/product-wise-sales?${query.toString()}`
      );

      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : {
            success: false,
            message: await response.text(),
          };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to generate product sales report.");
      }

      const data = Array.isArray(result.data) ? result.data : [];

      const rows = data.map((row, index) => ({
        rowId: row._id || `row-${index}`,
        SrNo: row.SrNo || index + 1,
        BillDate: row.BillDate || "",
        BillSeries: row.BillSeries || "",
        BillNo: row.BillNo ?? "",
        PartyCode: row.PartyCode || "",
        PartyName: row.PartyName || "",
        Rate: Number(row.Rate || 0),
        MRP: Number(row.MRP || 0),
        Qty: Number(row.Qty || 0),
        FreeQty: Number(row.FreeQty || 0),
        AMT: Number(row.AMT || 0),
        Weight: Number(row.Weight || 0),
        TPRAMT: Number(row.TPRAMT || 0),
        Disc: Number(row.Disc || 0),
        CDAMT: Number(row.CDAMT || 0),
        CDPercent: Number(row.CDPercent || 0),
        BranchName: row.BranchName || "",
        Address: row.Address || "",
        productCode: row.productCode || "",
        productName: row.productName || "",
        salesRate: row.Rate || 0,
        mrp: row.MRP || 0,
        qty: row.Qty || 0,
        freeQty: row.FreeQty || 0,
        grossAmount: row.AMT || 0,
        weight: row.Weight || 0,
        tprAmount: row.TPRAMT || 0,
        discount: row.Disc || 0,
        cashDiscountAmount: row.CDAMT || 0,
        cdPercent: row.CDPercent || 0,
        companyName: row.BranchName || "",
        address: row.Address || "",
      }));

      setProductReportRows(rows);

      const columns = [
        { key: "SrNo", label: "SrNo.", type: "number" },
        { key: "BillDate", label: "Bill Date", type: "string" },
        { key: "BillSeries", label: "Bill Series", type: "string" },
        { key: "BillNo", label: "Bill No", type: "string" },
        { key: "PartyCode", label: "Party Code", type: "string" },
        { key: "PartyName", label: "Party Name", type: "string" },
        { key: "Rate", label: "Rate", type: "number" },
        { key: "MRP", label: "MRP", type: "number" },
        { key: "Qty", label: "Qty", type: "number" },
        { key: "FreeQty", label: "Free Qty", type: "number" },
        { key: "AMT", label: "AMT", type: "number" },
        { key: "Weight", label: "Weight", type: "number" },
        { key: "TPRAMT", label: "TPR AMT", type: "number" },
        { key: "Disc", label: "Disc", type: "number" },
        { key: "CDAMT", label: "CD AMT", type: "number" },
        { key: "CDPercent", label: "CD %", type: "number" },
        { key: "BranchName", label: "Branch Name", type: "string" },
        { key: "Address", label: "Address", type: "string" },
      ];
      setProductReportColumns(columns);
      setIsProductReportGenerated(true);

      if (rows.length === 0) {
        setProductReportError("No product sales records were found for the selected criteria.");
      }
    } catch (error) {
      console.error("Product sales report generation error:", error);
      setProductReportRows([]);
      setProductReportColumns([]);
      setIsProductReportGenerated(false);
      setProductReportError(error.message || "Failed to generate product sales report.");
    } finally {
      setIsProductReportLoading(false);
    }
  };

  const generateAllProductSalesReport = () => {
    try {
      setAllProductReportError("");
      setAllProductReportRows([]);
      setAllProductReportColumns([]);

      if (!allProductReportFilters.fromDate || !allProductReportFilters.toDate) {
        throw new Error("From Date and To Date are required.");
      }
      if (allProductReportFilters.fromDate > allProductReportFilters.toDate) {
        throw new Error("From Date cannot be greater than To Date.");
      }

      setIsAllProductReportLoading(true);

      const rows = applyProductReportFilters(
        productSalesMockData,
        allProductReportFilters,
        true
      );

      const columns = buildProductReportColumns();

      setAllProductReportRows(rows);
      setAllProductReportColumns(columns);
      setIsAllProductReportGenerated(true);

      if (rows.length === 0) {
        setAllProductReportError("No product sales records were found for the selected criteria.");
      }
    } catch (error) {
      console.error("All product sales report generation error:", error);
      setAllProductReportRows([]);
      setAllProductReportColumns([]);
      setIsAllProductReportGenerated(false);
      setAllProductReportError(error.message || "Failed to generate all product sales report.");
    } finally {
      setIsAllProductReportLoading(false);
    }
  };

  // =========================================================
  // PRODUCT REPORT - FILTERED ROWS & TOTALS (UPDATED)
  // =========================================================
  const filteredProductReportRows = useMemo(() => {
    const search = normalizeText(productReportSearch);
    if (!search) return productReportRows;
    return productReportRows.filter((row) =>
      Object.values(row).some((value) =>
        normalizeText(value).includes(search)
      )
    );
  }, [productReportRows, productReportSearch]);

  const productReportTotals = useMemo(() => {
    return filteredProductReportRows.reduce(
      (total, row) => ({
        Rate: total.Rate + Number(row.Rate || 0),
        MRP: total.MRP + Number(row.MRP || 0),
        Qty: total.Qty + Number(row.Qty || 0),
        FreeQty: total.FreeQty + Number(row.FreeQty || 0),
        AMT: total.AMT + Number(row.AMT || 0),
        Weight: total.Weight + Number(row.Weight || 0),
        TPRAMT: total.TPRAMT + Number(row.TPRAMT || 0),
        Disc: total.Disc + Number(row.Disc || 0),
        CDAMT: total.CDAMT + Number(row.CDAMT || 0),
        CDPercent: total.CDPercent + Number(row.CDPercent || 0),
      }),
      {
        Rate: 0,
        MRP: 0,
        Qty: 0,
        FreeQty: 0,
        AMT: 0,
        Weight: 0,
        TPRAMT: 0,
        Disc: 0,
        CDAMT: 0,
        CDPercent: 0,
      }
    );
  }, [filteredProductReportRows]);

  // =========================================================
  // PRODUCT REPORT - EXPORT / PRINT HELPERS
  // =========================================================
  const getProductTotalValue = (column, columnIndex, totals) => {
    if (columnIndex === 0) return "TOTAL";
    const totalFieldMap = {
      openingStock: "openingStock",
      totalQty: "totalQty",
      freeQty: "freeQty",
      grossAmount: "grossAmount",
      discount: "discount",
      netAmount: "netAmount",
      totalTax: "totalTax",
      netSales: "netSales",
      crnAmount: "crnAmount",
      balanceAmount: "balanceAmount",
    };
    const totalField = totalFieldMap[column.key];
    if (!totalField) return "";
    return Number(totals[totalField] || 0);
  };

  const validateProductExport = (isAll = false) => {
    if (isAll) {
      if (!isAllProductReportGenerated) {
        setAllProductReportError("Please generate the report before exporting.");
        return false;
      }
      if (allProductReportColumns.length === 0) {
        setAllProductReportError("Report columns are not available.");
        return false;
      }
      if (filteredAllProductReportRows.length === 0) {
        setAllProductReportError("No report records are available to export.");
        return false;
      }
      setAllProductReportError("");
      return true;
    } else {
      if (!isProductReportGenerated) {
        setProductReportError("Please generate the report before exporting.");
        return false;
      }
      if (productReportColumns.length === 0) {
        setProductReportError("Report columns are not available.");
        return false;
      }
      if (filteredProductReportRows.length === 0) {
        setProductReportError("No report records are available to export.");
        return false;
      }
      setProductReportError("");
      return true;
    }
  };

  const getProductExportValue = (column, value) => {
    if (value === undefined || value === null) return "";
    if (column.type === "number") {
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : 0;
    }
    return String(value);
  };

  const exportProductReportToExcel = () => {
    try {
      if (!validateProductExport(false)) return;
      const firmDetails = getLoggedInFirmDetails();
      const workbook = XLSX.utils.book_new();
      const columnCount = Math.max(productReportColumns.length, 1);
      const worksheetData = [];

      worksheetData.push([firmDetails.firmName || "Firm Name"]);
      worksheetData.push(["Product Wise Sales Report"]);
      worksheetData.push([
        "Period",
        `${productReportFilters.fromDate} to ${productReportFilters.toDate}`,
        "Records",
        filteredProductReportRows.length,
      ]);
      worksheetData.push([]);

      const tableHeaderRowIndex = worksheetData.length;
      worksheetData.push(productReportColumns.map((column) => column.label || column.key));

      filteredProductReportRows.forEach((row) => {
        worksheetData.push(
          productReportColumns.map((column) => getProductExportValue(column, row[column.key]))
        );
      });

      const totalRowIndex = worksheetData.length;
      worksheetData.push(
        productReportColumns.map((column, columnIndex) =>
          getProductTotalValue(column, columnIndex, productReportTotals)
        )
      );

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet["!cols"] = productReportColumns.map(() => ({ wch: 16 }));
      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: columnCount - 1 } },
      ];
      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: tableHeaderRowIndex, c: 0 },
          e: { r: totalRowIndex - 1, c: columnCount - 1 },
        }),
      };

      XLSX.utils.book_append_sheet(workbook, worksheet, "Product Sales");

      const fileName = sanitizeExportFileName(
        `Product_Wise_Sales_${productReportFilters.fromDate}_${productReportFilters.toDate}`
      );
      XLSX.writeFile(workbook, `${fileName}.xlsx`, { cellStyles: true });
    } catch (error) {
      console.error("Product Excel export error:", error);
      setProductReportError(error.message || "Failed to export Excel report.");
    }
  };

  const exportProductReportToCsv = () => {
    try {
      if (!validateProductExport(false)) return;
      const csvRows = [];
      csvRows.push(["Product Wise Sales Report"]);
      csvRows.push([
        "Period",
        `${productReportFilters.fromDate} to ${productReportFilters.toDate}`,
        "Records",
        filteredProductReportRows.length,
      ]);
      csvRows.push([]);
      csvRows.push(productReportColumns.map((column) => column.label || column.key));

      filteredProductReportRows.forEach((row) => {
        csvRows.push(
          productReportColumns.map((column) => getProductExportValue(column, row[column.key]))
        );
      });

      csvRows.push(
        productReportColumns.map((column, columnIndex) =>
          getProductTotalValue(column, columnIndex, productReportTotals)
        )
      );

      const escapeCsvValue = (value) => {
        const text = String(value ?? "");
        return `"${text.replace(/"/g, '""')}"`;
      };

      const csvContent =
        "\uFEFF" +
        csvRows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");

      const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const csvUrl = URL.createObjectURL(csvBlob);
      const downloadLink = document.createElement("a");
      const fileName = sanitizeExportFileName(
        `Product_Wise_Sales_${productReportFilters.fromDate}_${productReportFilters.toDate}`
      );
      downloadLink.href = csvUrl;
      downloadLink.download = `${fileName}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(csvUrl);
    } catch (error) {
      console.error("Product CSV export error:", error);
      setProductReportError(error.message || "Failed to export CSV report.");
    }
  };

  const exportProductReportToPdf = () => {
    try {
      if (!validateProductExport(false)) return;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: productReportColumns.length > 12 ? "a3" : "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.setFontSize(15);
      pdf.text("Product Wise Sales Report", pageWidth / 2, 12, { align: "center" });
      pdf.setFontSize(8.5);
      pdf.text(
        `Period: ${productReportFilters.fromDate} to ${productReportFilters.toDate}`,
        10,
        19
      );
      pdf.text(`Records: ${filteredProductReportRows.length}`, pageWidth - 10, 19, {
        align: "right",
      });

      const tableHead = [productReportColumns.map((column) => column.label)];
      const tableBody = filteredProductReportRows.map((row) =>
        productReportColumns.map((column) =>
          column.type === "number"
            ? formatReportNumber(row[column.key])
            : String(row[column.key] ?? "")
        )
      );

      const totalsRow = productReportColumns.map((column, columnIndex) => {
        const value = getProductTotalValue(column, columnIndex, productReportTotals);
        if (column.type === "number" && value !== "") return formatReportNumber(value);
        return value;
      });
      tableBody.push(totalsRow);

      const columnStyles = {};
      productReportColumns.forEach((column, index) => {
        columnStyles[index] = {
          halign: column.type === "number" ? "right" : "left",
          cellWidth: "auto",
        };
      });

      autoTable(pdf, {
        startY: 26,
        head: tableHead,
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize: productReportColumns.length > 15 ? 5 : 6.5,
          cellPadding: 1.2,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: { fontStyle: "bold", halign: "center" },
        columnStyles,
        didParseCell: (data) => {
          const isTotalRow =
            data.section === "body" && data.row.index === tableBody.length - 1;
          if (isTotalRow) {
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage: () => {
          const pageNumber = pdf.internal.getNumberOfPages();
          const pageHeight = pdf.internal.pageSize.getHeight();
          pdf.setFontSize(7);
          pdf.text(`Page ${pageNumber}`, pageWidth - 10, pageHeight - 5, {
            align: "right",
          });
        },
      });

      const fileName = sanitizeExportFileName(
        `Product_Wise_Sales_${productReportFilters.fromDate}_${productReportFilters.toDate}`
      );
      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("Product PDF export error:", error);
      setProductReportError(error.message || "Failed to export PDF report.");
    }
  };

  const printProductReport = () => {
    try {
      if (!validateProductExport(false)) return;

      const tableHeaders = productReportColumns
        .map(
          (column) => `
            <th class="${column.type === "number" ? "number-cell" : ""}">
              ${escapePrintHtml(column.label)}
            </th>
          `
        )
        .join("");

      const tableRows = filteredProductReportRows
        .map(
          (row) => `
            <tr>
              ${productReportColumns
                .map(
                  (column) => `
                    <td class="${column.type === "number" ? "number-cell" : ""}">
                      ${escapePrintHtml(
                        column.type === "number"
                          ? formatReportNumber(row[column.key])
                          : String(row[column.key] ?? "")
                      )}
                    </td>
                  `
                )
                .join("")}
            </tr>
          `
        )
        .join("");

      const totalsCells = productReportColumns
        .map((column, columnIndex) => {
          const value = getProductTotalValue(column, columnIndex, productReportTotals);
          const displayValue =
            column.type === "number" && value !== "" ? formatReportNumber(value) : value;
          return `
            <td class="${column.type === "number" ? "number-cell" : ""}">
              ${escapePrintHtml(displayValue)}
            </td>
          `;
        })
        .join("");

      const printWindow = window.open("", "_blank", "width=1400,height=900");
      if (!printWindow) {
        throw new Error("Print window was blocked. Please allow pop-ups for this website.");
      }

      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Product Wise Sales Report</title>
            <style>
              @page { size: landscape; margin: 8mm; }
              * { box-sizing: border-box; }
              body {
                margin: 0;
                color: #111827;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 10px;
              }
              .report-header { margin-bottom: 10px; text-align: center; }
              .report-header h1 { margin: 0 0 6px; font-size: 18px; }
              .report-information {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                gap: 5px 18px;
                border: 1px solid #9ca3af;
                padding: 6px 8px;
                text-align: left;
              }
              .report-information span { white-space: nowrap; }
              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: auto;
              }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
              tr { break-inside: avoid; page-break-inside: avoid; }
              th, td {
                border: 1px solid #6b7280;
                padding: 3px 4px;
                vertical-align: middle;
                overflow-wrap: anywhere;
              }
              th {
                background: #e5e7eb;
                font-weight: 700;
                text-align: center;
                white-space: nowrap;
              }
              tbody tr:nth-child(even) { background: #f9fafb; }
              tfoot td { background: #e5e7eb; font-weight: 700; }
              .number-cell { text-align: right; white-space: nowrap; }
              .print-footer { margin-top: 7px; text-align: right; font-size: 9px; }
              @media print {
                body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="report-header">
              <h1>Product Wise Sales Report</h1>
              <div class="report-information">
                <span><strong>Period:</strong> ${escapePrintHtml(productReportFilters.fromDate)} to ${escapePrintHtml(productReportFilters.toDate)}</span>
                <span><strong>Records:</strong> ${filteredProductReportRows.length}</span>
              </div>
            </div>
            <table>
              <thead><tr>${tableHeaders}</tr></thead>
              <tbody>${tableRows}</tbody>
              <tfoot><tr>${totalsCells}</tr></tfoot>
            </table>
            <div class="print-footer">
              Printed on: ${escapePrintHtml(new Date().toLocaleString("en-IN"))}
            </div>
            <script>
              window.addEventListener("load", function () {
                window.focus();
                setTimeout(function () { window.print(); }, 300);
              });
              window.addEventListener("afterprint", function () { window.close(); });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("Product print error:", error);
      setProductReportError(error.message || "Failed to print report.");
    }
  };

  // =========================================================
  // ALL PRODUCT REPORT - EXPORT / PRINT HELPERS
  // =========================================================
  const exportAllProductReportToExcel = () => {
    try {
      if (!validateProductExport(true)) return;
      const workbook = XLSX.utils.book_new();
      const columnCount = Math.max(allProductReportColumns.length, 1);
      const worksheetData = [];

      worksheetData.push(["All Product Wise Sales Report"]);
      worksheetData.push([
        "Period",
        `${allProductReportFilters.fromDate} to ${allProductReportFilters.toDate}`,
        "Records",
        filteredAllProductReportRows.length,
      ]);
      worksheetData.push([]);

      const tableHeaderRowIndex = worksheetData.length;
      worksheetData.push(allProductReportColumns.map((column) => column.label || column.key));

      filteredAllProductReportRows.forEach((row) => {
        worksheetData.push(
          allProductReportColumns.map((column) => getProductExportValue(column, row[column.key]))
        );
      });

      const totalRowIndex = worksheetData.length;
      worksheetData.push(
        allProductReportColumns.map((column, columnIndex) =>
          getProductTotalValue(column, columnIndex, allProductReportTotals)
        )
      );

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet["!cols"] = allProductReportColumns.map(() => ({ wch: 16 }));
      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } },
      ];
      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: tableHeaderRowIndex, c: 0 },
          e: { r: totalRowIndex - 1, c: columnCount - 1 },
        }),
      };

      XLSX.utils.book_append_sheet(workbook, worksheet, "All Product Sales");

      const fileName = sanitizeExportFileName(
        `All_Product_Wise_Sales_${allProductReportFilters.fromDate}_${allProductReportFilters.toDate}`
      );
      XLSX.writeFile(workbook, `${fileName}.xlsx`, { cellStyles: true });
    } catch (error) {
      console.error("All product Excel export error:", error);
      setAllProductReportError(error.message || "Failed to export Excel report.");
    }
  };

  const exportAllProductReportToCsv = () => {
    try {
      if (!validateProductExport(true)) return;
      const csvRows = [];
      csvRows.push(["All Product Wise Sales Report"]);
      csvRows.push([
        "Period",
        `${allProductReportFilters.fromDate} to ${allProductReportFilters.toDate}`,
        "Records",
        filteredAllProductReportRows.length,
      ]);
      csvRows.push([]);
      csvRows.push(allProductReportColumns.map((column) => column.label || column.key));

      filteredAllProductReportRows.forEach((row) => {
        csvRows.push(
          allProductReportColumns.map((column) => getProductExportValue(column, row[column.key]))
        );
      });

      csvRows.push(
        allProductReportColumns.map((column, columnIndex) =>
          getProductTotalValue(column, columnIndex, allProductReportTotals)
        )
      );

      const escapeCsvValue = (value) => {
        const text = String(value ?? "");
        return `"${text.replace(/"/g, '""')}"`;
      };

      const csvContent =
        "\uFEFF" +
        csvRows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");

      const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const csvUrl = URL.createObjectURL(csvBlob);
      const downloadLink = document.createElement("a");
      const fileName = sanitizeExportFileName(
        `All_Product_Wise_Sales_${allProductReportFilters.fromDate}_${allProductReportFilters.toDate}`
      );
      downloadLink.href = csvUrl;
      downloadLink.download = `${fileName}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(csvUrl);
    } catch (error) {
      console.error("All product CSV export error:", error);
      setAllProductReportError(error.message || "Failed to export CSV report.");
    }
  };

  const exportAllProductReportToPdf = () => {
    try {
      if (!validateProductExport(true)) return;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: allProductReportColumns.length > 12 ? "a3" : "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.setFontSize(15);
      pdf.text("All Product Wise Sales Report", pageWidth / 2, 12, { align: "center" });
      pdf.setFontSize(8.5);
      pdf.text(
        `Period: ${allProductReportFilters.fromDate} to ${allProductReportFilters.toDate}`,
        10,
        19
      );
      pdf.text(`Records: ${filteredAllProductReportRows.length}`, pageWidth - 10, 19, {
        align: "right",
      });

      const tableHead = [allProductReportColumns.map((column) => column.label)];
      const tableBody = filteredAllProductReportRows.map((row) =>
        allProductReportColumns.map((column) =>
          column.type === "number"
            ? formatReportNumber(row[column.key])
            : String(row[column.key] ?? "")
        )
      );

      const totalsRow = allProductReportColumns.map((column, columnIndex) => {
        const value = getProductTotalValue(column, columnIndex, allProductReportTotals);
        if (column.type === "number" && value !== "") return formatReportNumber(value);
        return value;
      });
      tableBody.push(totalsRow);

      const columnStyles = {};
      allProductReportColumns.forEach((column, index) => {
        columnStyles[index] = {
          halign: column.type === "number" ? "right" : "left",
          cellWidth: "auto",
        };
      });

      autoTable(pdf, {
        startY: 26,
        head: tableHead,
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize: allProductReportColumns.length > 15 ? 5 : 6.5,
          cellPadding: 1.2,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: { fontStyle: "bold", halign: "center" },
        columnStyles,
        didParseCell: (data) => {
          const isTotalRow =
            data.section === "body" && data.row.index === tableBody.length - 1;
          if (isTotalRow) {
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage: () => {
          const pageNumber = pdf.internal.getNumberOfPages();
          const pageHeight = pdf.internal.pageSize.getHeight();
          pdf.setFontSize(7);
          pdf.text(`Page ${pageNumber}`, pageWidth - 10, pageHeight - 5, {
            align: "right",
          });
        },
      });

      const fileName = sanitizeExportFileName(
        `All_Product_Wise_Sales_${allProductReportFilters.fromDate}_${allProductReportFilters.toDate}`
      );
      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("All product PDF export error:", error);
      setAllProductReportError(error.message || "Failed to export PDF report.");
    }
  };

  const printAllProductReport = () => {
    try {
      if (!validateProductExport(true)) return;

      const tableHeaders = allProductReportColumns
        .map(
          (column) => `
            <th class="${column.type === "number" ? "number-cell" : ""}">
              ${escapePrintHtml(column.label)}
            </th>
          `
        )
        .join("");

      const tableRows = filteredAllProductReportRows
        .map(
          (row) => `
            <tr>
              ${allProductReportColumns
                .map(
                  (column) => `
                    <td class="${column.type === "number" ? "number-cell" : ""}">
                      ${escapePrintHtml(
                        column.type === "number"
                          ? formatReportNumber(row[column.key])
                          : String(row[column.key] ?? "")
                      )}
                    </td>
                  `
                )
                .join("")}
            </tr>
          `
        )
        .join("");

      const totalsCells = allProductReportColumns
        .map((column, columnIndex) => {
          const value = getProductTotalValue(column, columnIndex, allProductReportTotals);
          const displayValue =
            column.type === "number" && value !== "" ? formatReportNumber(value) : value;
          return `
            <td class="${column.type === "number" ? "number-cell" : ""}">
              ${escapePrintHtml(displayValue)}
            </td>
          `;
        })
        .join("");

      const printWindow = window.open("", "_blank", "width=1400,height=900");
      if (!printWindow) {
        throw new Error("Print window was blocked. Please allow pop-ups for this website.");
      }

      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>All Product Wise Sales Report</title>
            <style>
              @page { size: landscape; margin: 8mm; }
              * { box-sizing: border-box; }
              body {
                margin: 0;
                color: #111827;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 10px;
              }
              .report-header { margin-bottom: 10px; text-align: center; }
              .report-header h1 { margin: 0 0 6px; font-size: 18px; }
              .report-information {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                gap: 5px 18px;
                border: 1px solid #9ca3af;
                padding: 6px 8px;
                text-align: left;
              }
              .report-information span { white-space: nowrap; }
              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: auto;
              }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
              tr { break-inside: avoid; page-break-inside: avoid; }
              th, td {
                border: 1px solid #6b7280;
                padding: 3px 4px;
                vertical-align: middle;
                overflow-wrap: anywhere;
              }
              th {
                background: #e5e7eb;
                font-weight: 700;
                text-align: center;
                white-space: nowrap;
              }
              tbody tr:nth-child(even) { background: #f9fafb; }
              tfoot td { background: #e5e7eb; font-weight: 700; }
              .number-cell { text-align: right; white-space: nowrap; }
              .print-footer { margin-top: 7px; text-align: right; font-size: 9px; }
              @media print {
                body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="report-header">
              <h1>All Product Wise Sales Report</h1>
              <div class="report-information">
                <span><strong>Period:</strong> ${escapePrintHtml(allProductReportFilters.fromDate)} to ${escapePrintHtml(allProductReportFilters.toDate)}</span>
                <span><strong>Records:</strong> ${filteredAllProductReportRows.length}</span>
              </div>
            </div>
            <table>
              <thead><tr>${tableHeaders}</tr></thead>
              <tbody>${tableRows}</tbody>
              <tfoot><tr>${totalsCells}</tr></tfoot>
            </table>
            <div class="print-footer">
              Printed on: ${escapePrintHtml(new Date().toLocaleString("en-IN"))}
            </div>
            <script>
              window.addEventListener("load", function () {
                window.focus();
                setTimeout(function () { window.print(); }, 300);
              });
              window.addEventListener("afterprint", function () { window.close(); });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("All product print error:", error);
      setAllProductReportError(error.message || "Failed to print report.");
    }
  };

  if (isGstReport) {
    const isSales = selectedReport === "Sales GST Register";
    const isPurchase = selectedReport === "Purchase GST Register";
    const isCrn = selectedReport === "CRN GST Register";
    const isSummary = selectedReport === "GST Summary";
    const isGstr1 = selectedReport === "GSTR1 Report";
    const numericKeys = new Set(visibleGstColumns.filter((column) => filteredGstRows.some((row) => typeof row[column.key] === "number")).map((column) => column.key));
    const formatCell = (column, value) => {
      if (isSummary && (value === undefined || value === null || value === "")) return "";
      return numericKeys.has(column.key)
        ? Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: column.key === "SrNo" || column.key === "TrnNo" ? 0 : 2, maximumFractionDigits: 2 })
        : String(value ?? "") || "-";
    };
    const resetGstReport = () => {
      setGstFilters(defaultGstFilters()); setGstRows([]); setGstColumns([]); setGstSections([]); setActiveGstrSheet("B2B"); setGstTotals({}); setGstSummary(null);
      setGstSearch(""); setGstZoom("100"); setGstError(""); setGstGenerated(false);
    };

    return (
      <div className="report-page gst-report-page">
        <div className="report-page-header gst-report-header">
          <div className="report-title-section">
            <button type="button" className="report-back-button" onClick={onBack} title="Back to reports"><ArrowLeft size={18} /></button>
            <div className="report-title-icon"><ReportIcon size={22} /></div>
            <div><span className="report-category">GST Report</span><h1>{selectedReport}</h1><p>{reportInformation.description}</p></div>
          </div>
        </div>

        <div className={`report-filter-card gst-filter-card ${isGstr1 ? "gstr1-criteria-card" : ""}`}>
          {isGstr1 && <div className="gstr1-criteria-heading"><strong>GSTR1 Report Criteria</strong><span>Select the return period and whether damage transactions should be included.</span></div>}
          <div className="gst-filter-grid">
            {isSales && <>
              <div className="report-field"><label>Bill Type</label><select value={gstFilters.billType} onChange={(event) => updateGstFilter("billType", event.target.value)}><option value="all">All</option><option value="Cash">Cash</option><option value="Credit">Credit</option></select></div>
              <div className="report-field"><label>Invoice Type</label><select value={gstFilters.invoiceType} onChange={(event) => updateGstFilter("invoiceType", event.target.value)}><option value="all">All</option><option value="Registered">Registered</option><option value="Unregistered">Unregistered</option></select></div>
              <div className="report-field"><label>Tax On Type</label><select value={gstFilters.taxOnType} onChange={(event) => updateGstFilter("taxOnType", event.target.value)}><option value="all">All</option><option value="GST ON SALES PRICE">GST on Sales Price</option><option value="GST IN MRP">GST in MRP</option></select></div>
              <div className="report-field"><label>Output Format</label><select value={gstFilters.outputFormat} onChange={(event) => updateGstFilter("outputFormat", event.target.value)}><option value="party">With Party Detail</option><option value="summary">Summary</option></select></div>
            </>}

            {(isSales || isCrn) && <>
              <div className="report-field"><label>Specific Series</label><select value={gstFilters.specificSeries} onChange={(event) => updateGstFilter("specificSeries", event.target.value)}><option value="N">No</option><option value="Y">Yes</option></select></div>
              {gstFilters.specificSeries === "Y" && <div className="report-field"><label>Series</label><input value={gstFilters.series} onChange={(event) => updateGstFilter("series", event.target.value)} placeholder="Enter series" /></div>}
              <div className="report-field"><label>GST No.</label><select value={gstFilters.gstNo} onChange={(event) => updateGstFilter("gstNo", event.target.value)}><option value="all">All</option><option value="registered">Registered</option><option value="unregistered">Unregistered</option></select></div>
            </>}

            <div className="report-field"><label>From Date</label><input type="date" value={gstFilters.fromDate} onChange={(event) => updateGstFilter("fromDate", event.target.value)} /></div>
            <div className="report-field"><label>To Date</label><input type="date" value={gstFilters.toDate} onChange={(event) => updateGstFilter("toDate", event.target.value)} /></div>

            {(isSales || isPurchase) && <div className="report-field"><label>Cess Separate</label><select value={gstFilters.cessSeparate} onChange={(event) => updateGstFilter("cessSeparate", event.target.value)}><option value="N">No</option><option value="Y">Yes</option></select></div>}
            {isPurchase && <div className="report-field"><label>Report With</label><select value={gstFilters.reportWith} onChange={(event) => updateGstFilter("reportWith", event.target.value)}><option value="gst">With GST</option><option value="all">All Purchases</option></select></div>}
            {(isSales || isPurchase || isCrn) && <div className="report-field"><label>GST Bifurcation</label><select value={gstFilters.gstBifurcation} onChange={(event) => updateGstFilter("gstBifurcation", event.target.value)}><option value="N">No</option><option value="Y">Yes</option></select></div>}
            {isSummary && <>
              <div className="report-field"><label>Company Wise</label><select value={gstFilters.companyWise} onChange={(event) => updateGstFilter("companyWise", event.target.value)}><option value="N">No</option><option value="Y">Yes</option></select></div>
              <div className="report-field"><label>With Details</label><select value={gstFilters.withDetails} onChange={(event) => updateGstFilter("withDetails", event.target.value)}><option value="N">No</option><option value="Y">Yes</option></select></div>
              <div className="report-field"><label>Discount Bifurcation</label><select value={gstFilters.discountBifurcation} onChange={(event) => updateGstFilter("discountBifurcation", event.target.value)}><option value="N">No</option><option value="Y">Yes</option></select></div>
            </>}
            {isGstr1 && <div className="report-field"><label>With Damage</label><select value={gstFilters.withDamage} onChange={(event) => updateGstFilter("withDamage", event.target.value)}><option value="Y">Yes</option><option value="N">No</option></select></div>}
          </div>
          <div className="report-filter-actions gst-filter-actions">
            <button type="button" className="report-clear-button" onClick={resetGstReport}>Clear</button>
            <button type="button" className="report-generate-button" onClick={generateGstReport} disabled={gstLoading}>{gstLoading ? <RefreshCw size={14} className="party-spinning-icon" /> : <FileBarChart size={14} />}{gstLoading ? "Generating..." : "Generate Report"}</button>
          </div>
        </div>

        {gstError && <div className="party-report-error" role="alert">{gstError}</div>}

        {gstGenerated && <div className="party-report-results gst-report-results">
          <div className="party-report-toolbar">
            <div className="party-grid-heading"><div className="party-grid-heading-icon"><FileBarChart size={17} /></div><div><strong>Report Results</strong><span>{filteredGstRows.length} records found</span></div></div>
            <div className="party-grid-toolbar-actions">
              <label className="party-report-search"><Search size={14} /><input value={gstSearch} onChange={(event) => setGstSearch(event.target.value)} placeholder="Search in results..." /></label>
              <select className="party-grid-zoom-select" value={gstZoom} onChange={(event) => setGstZoom(event.target.value)} aria-label="Grid zoom"><option value="75">75%</option><option value="100">100%</option><option value="125">125%</option></select>
              <button type="button" className="party-grid-refresh-button" onClick={generateGstReport} disabled={gstLoading} title="Refresh report"><RefreshCw size={15} /></button>
              <div className="party-toolbar-export">
                <button type="button" className="party-export-excel" disabled={!gstRows.length} onClick={exportGstExcel}><FileSpreadsheet size={15} /> Excel</button>
                <button type="button" className="party-export-csv" disabled={!gstRows.length} onClick={exportGstCsv}><Download size={15} /> {isGstr1 ? "CSV ZIP" : "CSV"}</button>
                {isGstr1 && <button type="button" className="party-export-json" disabled={!gstRows.length} onClick={exportGstJson}><FileText size={15} /> JSON</button>}
                <button type="button" className="party-export-pdf" disabled={!gstRows.length} onClick={exportGstPdf}><FileText size={15} /> PDF</button>
                <button type="button" className="party-export-print" disabled={!gstRows.length} onClick={() => window.print()}><Printer size={15} /> Print</button>
              </div>
            </div>
          </div>
          {isGstr1 && <div className="gstr1-sheet-tabs" role="tablist" aria-label="GSTR1 sheets">
            {gstSections.map((section) => <button type="button" role="tab" aria-selected={activeGstrSheet === section.name} className={activeGstrSheet === section.name ? "active" : ""} key={section.name} onClick={() => { setActiveGstrSheet(section.name); setGstSearch(""); }}>{section.name}<span>{section.rows.filter((row) => row.RowType !== "total").length}</span></button>)}
          </div>}
          <div className="gst-result-table-wrap party-report-grid-container"><div className="party-report-zoom" style={{ zoom: Number(gstZoom) / 100 }}>
            <table className="party-report-table gst-result-table">
              <thead><tr>{visibleGstColumns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
              <tbody>
                {filteredGstRows.length ? filteredGstRows.map((row, rowIndex) => <tr className={(isSummary || isGstr1) && row.RowType ? `gst-summary-${row.RowType}` : ""} key={`${row.TrnSeries || row.Section || row.AccountName || activeGstrSheet || "gst"}-${row.TrnNo || row.SrNo || rowIndex}-${rowIndex}`}>{visibleGstColumns.map((column) => <td key={column.key} className={numericKeys.has(column.key) ? "party-report-number" : ""}>{formatCell(column, row[column.key])}</td>)}</tr>) : <tr><td colSpan={Math.max(visibleGstColumns.length, 1)} className="gst-empty-cell">No GST records match the selected criteria.</td></tr>}
              </tbody>
              {!isSummary && !isGstr1 && !!filteredGstRows.length && <tfoot><tr>{visibleGstColumns.map((column, index) => <td key={column.key} className={numericKeys.has(column.key) ? "party-report-number" : ""}>{index === 0 ? "TOTAL" : Object.prototype.hasOwnProperty.call(gstTotals, column.key) ? formatCell(column, gstTotals[column.key]) : ""}</td>)}</tr></tfoot>}
            </table>
          </div></div>
          <div className="party-report-statusbar"><span>Records: {gstSummary?.records || 0}</span><span>Taxable: ₹ {formatReportNumber(gstSummary?.taxable || 0)} · GST: ₹ {formatReportNumber(gstSummary?.gst || 0)} · Bill Value: ₹ {formatReportNumber(gstSummary?.billValue || 0)}</span><span>Period: {gstFilters.fromDate} to {gstFilters.toDate}</span></div>
        </div>}

        {!gstGenerated && !gstError && <div className="report-result-card"><FileBarChart size={38} /><h3>No report generated</h3><p>Select the criteria from the supplied GST report design and click Generate Report.</p></div>}
      </div>
    );
  }

  // =========================================================
  // ALL PARTY REPORT - RENDER COMPONENT
  // =========================================================
  if (selectedReport === "Find Cheque Details") {
    const summaries = chequeResult?.summaries || [];
    const unmatchedBounces = chequeResult?.unmatchedBounces || [];
    const unmatchedDockets = chequeResult?.unmatchedDockets || [];
    const hasResult = summaries.length + unmatchedBounces.length + unmatchedDockets.length > 0;

    return (
      <div className="party-classic-report-page cheque-details-report-page">
        <div className="party-classic-report-window">
          <div className="party-classic-titlebar">
            <div className="party-report-title-left">
              <button type="button" className="party-title-back" onClick={onBack} title="Back to reports" aria-label="Back to reports">
                <ArrowLeft size={18} />
              </button>
              <div className="party-title-icon"><Search size={21} /></div>
              <div className="party-title-content">
                <span>Financial Report</span>
                <h1>Find Cheque Details</h1>
                <p>Trace receipts, adjusted bills, bounce entries and PDC docket activity.</p>
              </div>
            </div>
            <div className="party-title-actions">
              <button type="button" className="party-title-secondary-button" disabled={!hasResult} onClick={exportChequeExcel}>
                <FileSpreadsheet size={15} /> Excel
              </button>
              <button type="button" className="party-title-secondary-button" disabled={!hasResult} onClick={exportChequePdf}>
                <FileText size={15} /> PDF
              </button>
              <button type="button" className="party-title-secondary-button" disabled={!hasResult} onClick={() => window.print()}>
                <Printer size={15} /> Print
              </button>
            </div>
          </div>

          <div className="party-report-content-layout cheque-report-layout">
            <main className="party-report-main-column">
              <form className="party-report-filter-panel cheque-search-panel" onSubmit={(event) => { event.preventDefault(); findChequeDetails(); }}>
                <fieldset className="party-filter-group">
                  <legend><span className="party-filter-legend-icon"><Search size={15} /></span>Cheque Search</legend>
                  <div className="cheque-search-row">
                    <div className="party-report-field">
                      <label htmlFor="find-cheque-number">Cheque No.</label>
                      <input
                        id="find-cheque-number"
                        autoFocus
                        value={chequeSearch}
                        onChange={(event) => setChequeSearch(event.target.value)}
                        placeholder="Enter exact cheque number"
                        autoComplete="off"
                      />
                    </div>
                    <button type="submit" className="party-title-generate-button" disabled={chequeLoading}>
                      {chequeLoading ? <RefreshCw size={16} className="party-spinning-icon" /> : <Search size={16} />}
                      {chequeLoading ? "Finding..." : "Find Cheque"}
                    </button>
                  </div>
                </fieldset>
              </form>

              {chequeError && <div className="party-report-error" role="alert">{chequeError}</div>}

              {!hasResult && !chequeError && (
                <div className="party-empty-report cheque-empty-report">
                  <Search size={38} />
                  <h3>Enter a cheque number</h3>
                  <p>Press Enter or click Find Cheque to load its complete transaction trail.</p>
                </div>
              )}

              {hasResult && (
                <div className="cheque-summary-grid">
                  {summaries.map((summary, summaryIndex) => (
                    <article className="cheque-summary-card" key={summary.receiptId || summaryIndex}>
                      <header className="cheque-summary-header">
                        <div>
                          <span>Receiving Bank</span>
                          <h2>{summary.bankName || "Bank not recorded"}</h2>
                        </div>
                        <div className="cheque-summary-date">
                          <span>Receipt Date</span>
                          <strong>{formatChequeDate(summary.receiptDate)}</strong>
                        </div>
                      </header>

                      <div className="cheque-key-details">
                        <div><span>Cheque No.</span><strong>{chequeResult.chequeNo}</strong></div>
                        <div><span>Party</span><strong>{summary.partyName || "-"}</strong></div>
                        <div><span>Receipt No.</span><strong>{summary.receiptNo || "-"}</strong></div>
                        <div><span>Cheque Date</span><strong>{formatChequeDate(summary.chequeDate)}</strong></div>
                        <div><span>Drawer Bank</span><strong>{summary.drawerBankName || "-"}</strong></div>
                        <div><span>Receipt Amount</span><strong>₹{formatChequeAmount(summary.amount)}</strong></div>
                      </div>

                      <section className="cheque-detail-section">
                        <h3>Bills Adjusted Against This Cheque</h3>
                        <div className="cheque-table-scroll">
                          <table className="party-report-table cheque-detail-table">
                            <thead><tr><th>Bill</th><th>Date</th><th>Bill Amt.</th><th>Adjusted</th><th>Discount</th><th>Balance</th></tr></thead>
                            <tbody>
                              {(summary.bills || []).length ? summary.bills.map((bill, index) => (
                                <tr key={`${bill.trnSeries}-${bill.trnNo}-${index}`}>
                                  <td>{bill.trnSeries || ""}-{bill.trnNo || ""}</td>
                                  <td>{formatChequeDate(bill.trnDate)}</td>
                                  <td className="party-report-number">₹{formatChequeAmount(bill.amount)}</td>
                                  <td className="party-report-number">₹{formatChequeAmount(bill.nowAdjust)}</td>
                                  <td className="party-report-number">₹{formatChequeAmount(bill.discAmt)}</td>
                                  <td className="party-report-number">₹{formatChequeAmount(bill.balanceAmt)}</td>
                                </tr>
                              )) : <tr><td colSpan="6" className="cheque-none-cell">No adjusted bills recorded.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </section>

                      <section className="cheque-detail-section">
                        <h3>Cheque Bounce Details</h3>
                        {(summary.bounces || []).length ? summary.bounces.map((bounce, index) => (
                          <div className="cheque-event-row bounce" key={bounce._id || index}>
                            <strong>{bounce.trnSeries || "CB"}-{bounce.trnNo || bounce.chqBounceNo || ""}</strong>
                            <span>Bounced: {formatChequeDate(bounce.chqBounceDate)}</span>
                            <span>Clearing: {formatChequeDate(bounce.clearingDate)}</span>
                            <span>Charges: ₹{formatChequeAmount(bounce.chqBounceCharges)}</span>
                            <span>Total: ₹{formatChequeAmount(bounce.totalAmt || bounce.chequeAmt)}</span>
                            {bounce.narration && <small>{bounce.narration}</small>}
                          </div>
                        )) : <p className="cheque-no-event">No bounce entry found.</p>}
                      </section>

                      <section className="cheque-detail-section">
                        <h3>PDC Docket Details</h3>
                        {(summary.dockets || []).length ? summary.dockets.map((docket, index) => (
                          <div className="cheque-event-row docket" key={`${docket.docketId}-${index}`}>
                            <strong>{docket.docketNo}</strong>
                            <span>Bank: {docket.bankName || "-"}</span>
                            <span>Deposit Date: {formatChequeDate(docket.depositDate)}</span>
                            <span>Added On: {formatChequeDate(docket.addedAt)}</span>
                            <span>Clearing Date: {formatChequeDate(docket.clearingDate)}</span>
                          </div>
                        )) : <p className="cheque-no-event">Not added to a PDC docket.</p>}
                      </section>
                    </article>
                  ))}

                  {(unmatchedBounces.length > 0 || unmatchedDockets.length > 0) && (
                    <article className="cheque-summary-card cheque-unmatched-card">
                      <header className="cheque-summary-header"><div><span>Additional Matches</span><h2>Unlinked cheque activity</h2></div></header>
                      {unmatchedBounces.map((bounce, index) => (
                        <section className="cheque-detail-section" key={bounce._id || `bounce-${index}`}>
                          <h3>Cheque Bounce</h3>
                          <div className="cheque-event-row bounce"><strong>{bounce.bankName || "Bank not recorded"}</strong><span>{bounce.partyName || "-"}</span><span>Bounced: {formatChequeDate(bounce.chqBounceDate)}</span><span>Total: ₹{formatChequeAmount(bounce.totalAmt || bounce.chequeAmt)}</span></div>
                        </section>
                      ))}
                      {unmatchedDockets.map((docket, index) => (
                        <section className="cheque-detail-section" key={`${docket.docketId}-${index}`}>
                          <h3>PDC Docket</h3>
                          <div className="cheque-event-row docket"><strong>{docket.docketNo}</strong><span>Bank: {docket.bankName || "-"}</span><span>Deposit Date: {formatChequeDate(docket.depositDate)}</span><span>Added On: {formatChequeDate(docket.addedAt)}</span></div>
                        </section>
                      ))}
                    </article>
                  )}
                </div>
              )}
            </main>

            <aside className="party-report-sidebar cheque-report-sidebar">
              <div className="party-sidebar-card">
                <h3>Cheque Summary</h3>
                <div className="party-sidebar-stat"><span>Cheque No.</span><strong>{chequeResult?.chequeNo || "-"}</strong></div>
                <div className="party-sidebar-stat"><span>Receipt / Bank Matches</span><strong>{summaries.length}</strong></div>
                <div className="party-sidebar-stat"><span>Adjusted Bills</span><strong>{summaries.reduce((total, item) => total + (item.bills?.length || 0), 0)}</strong></div>
                <div className="party-sidebar-stat"><span>Bounce Entries</span><strong>{summaries.reduce((total, item) => total + (item.bounces?.length || 0), unmatchedBounces.length)}</strong></div>
                <div className="party-sidebar-stat"><span>PDC Dockets</span><strong>{summaries.reduce((total, item) => total + (item.dockets?.length || 0), unmatchedDockets.length)}</strong></div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (isP0Report) {
    const showAccount = ["General Ledger", "Party Ledger"].includes(selectedReport);
    const showProduct = ["Product Ledger", "Stock Movement Ledger"].includes(selectedReport);
    const isStockDataReport = ["Current Stock Report", "As On Date Stock Report", "Damage Stock Report", "Product Ledger", "Stock Movement Ledger"].includes(selectedReport);
    const showDateRange = !["Current Stock Report", "As On Date Stock Report"].includes(selectedReport);
    const isCurrentStock = selectedReport === "Current Stock Report";
    const isAsOnDateStock = selectedReport === "As On Date Stock Report";
    const isDamageStock = selectedReport === "Damage Stock Report";
    const isProductLedger = selectedReport === "Product Ledger";
    const isStockMovement = selectedReport === "Stock Movement Ledger";
    const updateP0Filter = (field, value) => setP0Filters((old) => ({ ...old, [field]: value }));
    return (
      <div className="report-page p0-stock-report-page">
        <div className="report-page-header">
          <div className="report-title-section">
            <button type="button" className="report-back-button" onClick={onBack}><ArrowLeft size={18} /></button>
            <div className="report-title-icon"><ReportIcon size={22} /></div>
            <div><span className="report-category">{reportInformation.category}</span><h1>{reportInformation.title}</h1><p>{reportInformation.description}</p></div>
          </div>
        </div>

          <div className="report-filter-card">
          <div className="report-filter-heading"><div><h2>Report Filters</h2><p>Figures are loaded from the current firm's persistent transactions.</p></div></div>
          <div className="report-filter-grid">
            {isStockDataReport && <div className="report-field"><label>Company</label><select value={p0Filters.companyCode} onChange={(e) => updateP0Filter("companyCode", e.target.value)}><option value="">All Companies</option>{companies.map((company, index) => { const value = getCompanyCode(company, index); return <option key={company._id || value} value={value}>{getCompanyName(company) || value}</option>; })}</select></div>}
            {isCurrentStock && <div className="report-field"><label>Report Type</label><select value={p0Filters.reportType} onChange={(e) => updateP0Filter("reportType", e.target.value)}><option value="details">Details</option><option value="summary">Summary</option></select></div>}
            {(isCurrentStock || isAsOnDateStock || isDamageStock) && <div className="report-field"><label>Report Level</label><select value={p0Filters.reportLevel} onChange={(e) => updateP0Filter("reportLevel", e.target.value)}><option value="productBatch">Product / Batch</option><option value="product">Product</option><option value="company">Company</option></select></div>}
            {showDateRange && <div className="report-field"><label>From Date</label><input type="date" value={p0Filters.fromDate} onChange={(e) => updateP0Filter("fromDate", e.target.value)} /></div>}
            {showDateRange && <div className="report-field"><label>To Date</label><input type="date" value={p0Filters.toDate} onChange={(e) => updateP0Filter("toDate", e.target.value)} /></div>}
            {isAsOnDateStock && <div className="report-field"><label>As On Date</label><input type="date" value={p0Filters.asOnDate} onChange={(e) => updateP0Filter("asOnDate", e.target.value)} /></div>}
            {showAccount && <div className="report-field report-field-wide"><label>Account / Party</label><input value={p0Filters.account} placeholder="Account code or name" onChange={(e) => updateP0Filter("account", e.target.value)} /></div>}
            {showProduct && <div className="report-field report-field-wide"><label>Product</label><select value={p0Filters.product} onChange={(e) => updateP0Filter("product", e.target.value)}><option value="">All Products</option>{products.map((product, index) => { const code = product.productCode || product.code || product._id || index; const name = product.productName || product.name || code; return <option key={product._id || code} value={code}>{name}</option>; })}</select></div>}
            {isProductLedger && <div className="report-field"><label>Batch</label><input value={p0Filters.batch} placeholder="All batches" onChange={(e) => updateP0Filter("batch", e.target.value)} /></div>}
            {isStockDataReport && <div className="report-field"><label>Godown</label><select value={p0Filters.godownCode} onChange={(e) => updateP0Filter("godownCode", e.target.value)}><option value="">All Godowns</option>{godowns.map((godown, index) => { const value = godown.godownCode || godown.code || godown._id || index; return <option key={value} value={value}>{godown.godownName || godown.name || value}</option>; })}</select></div>}
            {isStockMovement && <div className="report-field"><label>Entry Type</label><select value={p0Filters.entryType} onChange={(e) => updateP0Filter("entryType", e.target.value)}><option value="">Stock In &amp; Out</option><option value="IN">Stock In</option><option value="OUT">Stock Out</option></select></div>}
            {isCurrentStock && <div className="report-field"><label>Report Filter</label><select value={p0Filters.reportFilter} onChange={(e) => updateP0Filter("reportFilter", e.target.value)}><option value="all">All Stock</option><option value="positive">Positive Stock</option><option value="negative">Negative Stock</option><option value="zero">Zero Stock</option></select></div>}
            {isCurrentStock && <div className="report-field"><label>Near Expiry</label><select value={p0Filters.nearExpiry} onChange={(e) => updateP0Filter("nearExpiry", e.target.value)}><option value="N">No</option><option value="Y">Yes</option></select></div>}
            {isCurrentStock && <div className="report-field"><label>Days</label><input type="number" min="1" disabled={p0Filters.nearExpiry !== "Y"} value={p0Filters.expiryDays} onChange={(e) => updateP0Filter("expiryDays", e.target.value)} placeholder="Expiry days" /></div>}
            {isCurrentStock && <div className="report-field"><label>Current Stock</label><select value={p0Filters.currentStock} onChange={(e) => updateP0Filter("currentStock", e.target.value)}><option value="Y">Yes</option><option value="N">No</option></select></div>}
            {isCurrentStock && <div className="report-field"><label>Negative</label><select value={p0Filters.includeNegative} onChange={(e) => updateP0Filter("includeNegative", e.target.value)}><option value="N">No</option><option value="Y">Yes</option></select></div>}
            {isCurrentStock && <div className="report-field"><label>With Zero</label><select value={p0Filters.includeZero} onChange={(e) => updateP0Filter("includeZero", e.target.value)}><option value="N">No</option><option value="Y">Yes</option></select></div>}
            {(isAsOnDateStock || isDamageStock) && <div className="report-field"><label>Order By</label><select value={p0Filters.orderBy} onChange={(e) => updateP0Filter("orderBy", e.target.value)}><option value="productName">Product Name</option><option value="productCode">Product Code</option><option value="date">Date</option></select></div>}
          </div>
          <div className="report-filter-actions">
            <button type="button" className="report-clear-button" onClick={() => { setP0Filters(defaultP0Filters()); setP0Rows([]); setP0Summary(null); setP0Generated(false); setP0Error(""); }}>Clear</button>
            <button type="button" className="report-generate-button" onClick={generateP0Report} disabled={p0Loading}>{p0Loading ? "Generating..." : "Generate Report"}</button>
          </div>
        </div>

        {p0Error && <div className="report-result-card"><X size={34} /><h3>Report could not be generated</h3><p>{p0Error}</p></div>}
        {!p0Error && p0Rows.length === 0 && <div className="report-result-card"><FileBarChart size={38} /><h3>{p0Generated ? "No records found" : "No report generated"}</h3><p>{p0Generated ? "No data matches the selected report filters." : "Select filters and click Generate Report."}</p></div>}
        {p0Rows.length > 0 && (
          <div className="party-report-results p0-report-results">
            <div className="p0-result-toolbar">
              <div className="party-grid-heading"><div className="party-grid-heading-icon"><FileBarChart size={17} /></div><div><strong>Report Results</strong><span>{p0Rows.length.toLocaleString("en-IN")} record{p0Rows.length === 1 ? "" : "s"} found</span></div></div>
              <div className="party-toolbar-export">
                <button type="button" className="party-export-excel" onClick={exportP0Excel}><FileSpreadsheet size={15} /> Excel</button>
                <button type="button" className="party-export-csv" onClick={exportP0Csv}><Download size={15} /> CSV</button>
                <button type="button" className="party-export-pdf" onClick={exportP0Pdf}><FileText size={15} /> PDF</button>
                <button type="button" className="party-export-print" onClick={() => window.print()}><Printer size={15} /> Print</button>
              </div>
            </div>
            {p0Summary && <div style={{ display: "flex", gap: 24, padding: "10px 4px" }}><strong>Total Debit: ₹{Number(p0Summary.debit || 0).toLocaleString("en-IN")}</strong><strong>Total Credit: ₹{Number(p0Summary.credit || 0).toLocaleString("en-IN")}</strong></div>}
            <div className="party-report-grid-container p0-report-table-wrap"><table className="party-report-table" style={{ width: "100%", minWidth: Math.max(900, p0Columns.length * 130) }}>
              <thead><tr>{p0ColumnDefinitions.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
              <tbody>{p0Rows.map((row, index) => <tr key={row._id || index}>{p0Columns.map((column) => <td key={column}>{typeof row[column] === "object" ? JSON.stringify(row[column]) : String(row[column] ?? "")}</td>)}</tr>)}</tbody>
            </table></div>
            <div className="party-report-statusbar"><span>Records: {p0Rows.length}</span><span>{selectedReport}</span><span>{showDateRange ? `Period: ${p0Filters.fromDate} to ${p0Filters.toDate}` : isAsOnDateStock ? `As on: ${p0Filters.asOnDate}` : "Current data"}</span></div>
          </div>
        )}
      </div>
    );
  }

  if (isPurchaseAnalysisReport) {
    const isBillWise = selectedReport === "Company/Bill Wise Purchase Report";
    const totalKeys = new Set([
      "Qty", "FreeQty", "BoxQty", "Gross", "Amount", "Weight", "Taxable", "GSTAmt", "VatAmt",
      "CGST", "SGST", "IGST", "Cess1", "Cess2", "BVDiscAmt", "BVAddAmt", "AVDiscAmt", "AVAddAmt", "NetAmt",
    ]);
    const totals = filteredPurchaseAnalysisRows.reduce((result, row) => {
      totalKeys.forEach((key) => { result[key] = (result[key] || 0) + Number(row[key] || 0); });
      return result;
    }, {});
    const formatValue = (column, value) => purchaseNumericKeys.has(column.key)
      ? Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 3 })
      : String(value ?? "") || "-";

    return (
      <div className="report-page purchase-analysis-report-page">
        <div className="report-page-header">
          <div className="report-title-section">
            <button type="button" className="report-back-button" onClick={onBack} title="Back to reports"><ArrowLeft size={18} /></button>
            <div className="report-title-icon">{isBillWise ? <Building2 size={22} /> : <PackageSearch size={22} />}</div>
            <div><span className="report-category">Purchase Report</span><h1>{selectedReport}</h1><p>{isBillWise ? "Voucher and bill-wise purchase line details." : "Product-wise purchase, tax and discount analysis."}</p></div>
          </div>
        </div>

        <div className="report-filter-card">
          <div className="report-filter-grid">
            {!isBillWise && <div className="report-field"><label>Report Type</label><select value="details" disabled><option value="details">Details</option></select></div>}
            <div className="report-field"><label>Company</label><select value={purchaseAnalysisFilters.companyCode} onChange={(event) => setPurchaseAnalysisFilters((old) => ({ ...old, companyCode: event.target.value }))}>
              <option value="">All Companies</option>{purchaseAnalysisCriteria.companies.map((company, index) => { const code = getCompanyCode(company, index); return <option key={company._id || code} value={code}>{getCompanyName(company) || code}</option>; })}
            </select></div>
            {!isBillWise && <div className="report-field"><label>Report Level</label><select value={purchaseAnalysisFilters.reportLevel} onChange={(event) => setPurchaseAnalysisFilters((old) => ({ ...old, reportLevel: event.target.value }))}><option value="all">All</option><option value="company">Company Wise</option><option value="godown">Godown Wise</option></select></div>}
            <div className="report-field"><label>Godown</label><select value={purchaseAnalysisFilters.godownCode} onChange={(event) => setPurchaseAnalysisFilters((old) => ({ ...old, godownCode: event.target.value }))}>
              <option value="">All Godowns</option>{purchaseAnalysisCriteria.godowns.map((godown, index) => { const code = String(godown.godownCode || godown.code || godown._id || index); return <option key={godown._id || code} value={code}>{godown.godownName || godown.name || code}</option>; })}
            </select></div>
            <div className="report-field"><label>From Date</label><input type="date" value={purchaseAnalysisFilters.fromDate} onChange={(event) => setPurchaseAnalysisFilters((old) => ({ ...old, fromDate: event.target.value }))} /></div>
            <div className="report-field"><label>To Date</label><input type="date" value={purchaseAnalysisFilters.toDate} onChange={(event) => setPurchaseAnalysisFilters((old) => ({ ...old, toDate: event.target.value }))} /></div>
            {isBillWise && <div className="report-field"><label>Actual Invoice</label><select value={purchaseAnalysisFilters.actualInvoice} onChange={(event) => setPurchaseAnalysisFilters((old) => ({ ...old, actualInvoice: event.target.value }))}><option value="no">No</option><option value="yes">Yes</option></select></div>}
            <div className="report-field"><label>Discount Details</label><select value={purchaseAnalysisFilters.discountDetails} onChange={(event) => setPurchaseAnalysisFilters((old) => ({ ...old, discountDetails: event.target.value }))}><option value="no">No</option><option value="yes">Yes</option></select></div>
            {!isBillWise && <><div className="report-field"><label>Report With</label><select value={purchaseAnalysisFilters.reportWith} onChange={(event) => setPurchaseAnalysisFilters((old) => ({ ...old, reportWith: event.target.value }))}><option value="category">Category</option><option value="company">Company</option><option value="godown">Godown</option></select></div><div className="report-field"><label>Order By</label><select value={purchaseAnalysisFilters.orderBy} onChange={(event) => setPurchaseAnalysisFilters((old) => ({ ...old, orderBy: event.target.value }))}><option value="productName">Product Name</option><option value="productCode">Product Code</option><option value="company">Company</option><option value="voucher">Voucher</option><option value="amount">Net Amount</option></select></div></>}
          </div>
          <div className="report-filter-actions"><button type="button" className="report-generate-button" onClick={generatePurchaseAnalysisReport} disabled={purchaseAnalysisLoading}>{purchaseAnalysisLoading ? "Generating..." : "Generate Report"}</button><button type="button" className="report-clear-button" onClick={clearPurchaseAnalysisReport}><RefreshCw size={14} /> Reset Filter</button></div>
        </div>

        {purchaseAnalysisError && <div className="party-report-error" role="alert">{purchaseAnalysisError}</div>}
        <div className="party-report-results purchase-analysis-results">
          <div className="party-report-toolbar">
            <div className="party-grid-heading"><div className="party-grid-heading-icon"><ShoppingCart size={17} /></div><div><strong>Report Results</strong><span>{purchaseAnalysisGenerated ? `${filteredPurchaseAnalysisRows.length} records found` : "Generate the report to view results"}</span></div></div>
            <div className="party-grid-toolbar-actions">
              <div className="party-report-search"><Search size={15} /><input value={purchaseAnalysisSearch} onChange={(event) => setPurchaseAnalysisSearch(event.target.value)} placeholder="Search in results..." disabled={!purchaseAnalysisGenerated} />{purchaseAnalysisSearch && <button type="button" className="party-grid-search-clear" onClick={() => setPurchaseAnalysisSearch("")}><X size={14} /></button>}</div>
              <select className="party-grid-zoom-select" value={purchaseAnalysisZoom} onChange={(event) => setPurchaseAnalysisZoom(event.target.value)}><option value="75">75%</option><option value="90">90%</option><option value="100">100%</option><option value="125">125%</option><option value="150">150%</option></select>
              <button type="button" className="party-grid-refresh-button" onClick={generatePurchaseAnalysisReport} disabled={purchaseAnalysisLoading}><RefreshCw size={15} /></button>
              <div className="party-toolbar-export"><button className="party-export-excel" onClick={exportPurchaseAnalysisExcel} disabled={!filteredPurchaseAnalysisRows.length}><FileSpreadsheet size={15} /> Excel</button><button className="party-export-csv" onClick={exportPurchaseAnalysisCsv} disabled={!filteredPurchaseAnalysisRows.length}><Download size={15} /> CSV</button><button className="party-export-pdf" onClick={exportPurchaseAnalysisPdf} disabled={!filteredPurchaseAnalysisRows.length}><FileText size={15} /> PDF</button><button className="party-export-print" onClick={printPurchaseAnalysisReport} disabled={!filteredPurchaseAnalysisRows.length}><Printer size={15} /> Print</button></div>
            </div>
          </div>
          <div className="party-report-grid-container purchase-analysis-table-wrap">
            {!purchaseAnalysisGenerated ? <div className="party-empty-report"><ShoppingCart size={40} /><strong>No report generated</strong><span>Select filters and click Generate Report.</span></div> : filteredPurchaseAnalysisRows.length === 0 ? <div className="party-empty-report"><PackageSearch size={38} /><strong>No matching purchases</strong><span>Change the search or report filters.</span></div> : <div className="party-report-zoom" style={{ zoom: Number(purchaseAnalysisZoom) / 100 }}><table className="party-report-table purchase-analysis-table"><thead><tr>{purchaseAnalysisColumns.map((column) => <th key={column.key} className={purchaseNumericKeys.has(column.key) ? "party-report-number" : ""}>{column.label}</th>)}</tr></thead><tbody>{filteredPurchaseAnalysisRows.map((row) => <tr key={`${row.VouSeries}-${row.VouNo}-${row.SrNo}`}>{purchaseAnalysisColumns.map((column) => <td key={column.key} className={purchaseNumericKeys.has(column.key) ? "party-report-number" : ""} title={String(row[column.key] ?? "")}>{formatValue(column, row[column.key])}</td>)}</tr>)}</tbody><tfoot><tr>{purchaseAnalysisColumns.map((column, index) => <td key={column.key} className={totalKeys.has(column.key) ? "party-report-number" : ""}>{index === 0 ? "TOTAL" : totalKeys.has(column.key) ? Number(totals[column.key] || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}</td>)}</tr></tfoot></table></div>}
          </div>
          <div className="party-report-statusbar"><span>Records: {purchaseAnalysisGenerated ? filteredPurchaseAnalysisRows.length : 0}</span><span>{isBillWise ? "Level: Company / Bill Wise" : "Level: Product Wise"}</span><span>Period: {purchaseAnalysisFilters.fromDate} to {purchaseAnalysisFilters.toDate}</span></div>
        </div>
      </div>
    );
  }

  if (selectedReport === "Stock And Sales Report") {
    const numberText = (value, decimals = 2) =>
      Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    const stockSalesColumns = getStockSalesExportColumns();
    const stockSalesQuantityKeys = new Set([
      "Opening", "Purchase", "CreditNote", "Increase", "MFI", "ToGDTransfer",
      "Sales", "DebitNote", "Decrease", "Damage", "MFO", "FromGDTransfer",
      "Closing", "BoxPack", "LastQty",
    ]);
    const stockSalesMoneyKeys = new Set(["MRP", "LastPurchase"]);
    const stockSalesTotalKeys = new Set([
      "Opening", "Purchase", "CreditNote", "Increase", "MFI", "ToGDTransfer",
      "Sales", "DebitNote", "Decrease", "Damage", "MFO", "FromGDTransfer",
      "Closing", "LastQty",
    ]);
    const visibleStockSalesTotals = filteredStockSalesRows.reduce((totals, row) => {
      stockSalesTotalKeys.forEach((key) => {
        totals[key] = (totals[key] || 0) + Number(row[key] || 0);
      });
      return totals;
    }, {});
    const formatStockSalesCell = (column, value) => {
      if (stockSalesMoneyKeys.has(column.key)) return numberText(value);
      if (stockSalesQuantityKeys.has(column.key)) return numberText(value, 3);
      return String(value ?? "") || "-";
    };

    return (
      <div className="report-page stock-sales-report-page">
        <div className="report-page-header">
          <div className="report-title-section">
            <button type="button" className="report-back-button" onClick={onBack} title="Back to reports">
              <ArrowLeft size={18} />
            </button>
            <div className="report-title-icon"><Warehouse size={22} /></div>
            <div>
              <span className="report-category">Sales Report</span>
              <h1>Stock And Sales Report</h1>
              <p>Compare live stock with sales posted during the selected period.</p>
            </div>
          </div>
        </div>

        <div className="report-filter-card">
          <div className="report-filter-heading">
            <div><h2>Report Filters</h2><p>Choose one company or All Companies to load actual database records.</p></div>
          </div>

          <div className="report-filter-grid">
            <div className="report-field">
              <label>Company</label>
              <select
                value={stockSalesFilters.companyCode}
                onChange={(event) => setStockSalesFilters((old) => ({ ...old, companyCode: event.target.value }))}
              >
                <option value="">All Companies</option>
                {stockSalesCriteria.companies.map((company, index) => {
                  const value = getCompanyCode(company, index);
                  return <option key={company._id || value} value={value}>{getCompanyName(company) || value}</option>;
                })}
              </select>
            </div>

            <div className="report-field">
              <label>Report Level</label>
              <select value={stockSalesFilters.reportLevel} onChange={(event) => setStockSalesFilters((old) => ({ ...old, reportLevel: event.target.value }))}>
                <option value="unit">Unit Wise</option>
                <option value="product">Product Wise</option>
                <option value="company">Company Wise</option>
              </select>
            </div>

            <div className="report-field">
              <label>Godown</label>
              <select value={stockSalesFilters.godownCode} onChange={(event) => setStockSalesFilters((old) => ({ ...old, godownCode: event.target.value }))}>
                <option value="">All Godowns</option>
                {stockSalesCriteria.godowns.map((godown, index) => {
                  const value = String(godown.godownCode || godown.code || godown._id || index);
                  const label = godown.godownName || godown.name || value;
                  return <option key={godown._id || value} value={value}>{label}</option>;
                })}
              </select>
            </div>

            <div className="report-field">
              <label>From Date</label>
              <input type="date" value={stockSalesFilters.fromDate} onChange={(event) => setStockSalesFilters((old) => ({ ...old, fromDate: event.target.value }))} />
            </div>

            <div className="report-field">
              <label>To Date</label>
              <input type="date" value={stockSalesFilters.toDate} onChange={(event) => setStockSalesFilters((old) => ({ ...old, toDate: event.target.value }))} />
            </div>

            <div className="report-field">
              <label>Report With</label>
              <select value={stockSalesFilters.reportWith} onChange={(event) => setStockSalesFilters((old) => ({ ...old, reportWith: event.target.value }))}>
                <option value="summary">Summary</option>
                <option value="details">Detailed (Godown Wise)</option>
              </select>
            </div>

            <div className="report-field">
              <label>Filter</label>
              <select value={stockSalesFilters.filter} onChange={(event) => setStockSalesFilters((old) => ({ ...old, filter: event.target.value }))}>
                <option value="all">All</option>
                <option value="stock">With Stock</option>
                <option value="sales">With Sales</option>
                <option value="zeroStock">Zero Stock</option>
                <option value="noSales">No Sales</option>
              </select>
            </div>

            <div className="report-field">
              <label>Order By</label>
              <select value={stockSalesFilters.orderBy} onChange={(event) => setStockSalesFilters((old) => ({ ...old, orderBy: event.target.value }))}>
                <option value="productName">Product Name</option>
                <option value="productCode">Product Code</option>
                <option value="companyName">Company Name</option>
                <option value="stockQty">Stock Quantity</option>
                <option value="salesQty">Sales Quantity</option>
              </select>
            </div>

            <label className="stock-sales-free-option">
              <input
                type="checkbox"
                checked={stockSalesFilters.stockWithFreeQty}
                onChange={(event) => setStockSalesFilters((old) => ({ ...old, stockWithFreeQty: event.target.checked }))}
              />
              <span>Stock With Free Qty</span>
            </label>
          </div>

          <div className="report-filter-actions">
            <button type="button" className="report-generate-button" onClick={generateStockSalesReport} disabled={stockSalesLoading}>
              {stockSalesLoading ? "Generating..." : "Generate Report"}
            </button>
            <button type="button" className="report-clear-button" onClick={clearStockSalesReport}>
              <RefreshCw size={14} /> Reset Filter
            </button>
          </div>
        </div>

        {stockSalesError && <div className="report-result-card"><X size={34} /><h3>Report could not be loaded</h3><p>{stockSalesError}</p></div>}
        {!stockSalesError && !stockSalesGenerated && <div className="report-result-card"><FileBarChart size={38} /><h3>No report generated</h3><p>Select filters and click Generate Report.</p></div>}
        {!stockSalesError && stockSalesGenerated && stockSalesRows.length === 0 && <div className="report-result-card"><PackageSearch size={38} /><h3>No matching records</h3><p>No stock or sales records match the selected filters.</p></div>}

        {stockSalesRows.length > 0 && (
          <div className="party-report-results stock-sales-results">
            <div className="party-report-toolbar">
              <div className="party-grid-heading">
                <div className="party-grid-heading-icon"><FileBarChart size={17} /></div>
                <div>
                  <strong>Report Results</strong>
                  <span>{filteredStockSalesRows.length} records found</span>
                </div>
              </div>

              <div className="party-grid-toolbar-actions">
                <div className="party-report-search">
                  <Search size={15} />
                  <input type="text" value={stockSalesSearch} onChange={(event) => setStockSalesSearch(event.target.value)} placeholder="Search in results..." />
                  {stockSalesSearch && <button type="button" className="party-grid-search-clear" onClick={() => setStockSalesSearch("")} title="Clear search" aria-label="Clear search"><X size={14} /></button>}
                </div>
                <select className="party-grid-zoom-select" value={stockSalesZoom} onChange={(event) => setStockSalesZoom(event.target.value)} title="Grid zoom">
                  <option value="75">75%</option><option value="90">90%</option><option value="100">100%</option><option value="125">125%</option><option value="150">150%</option>
                </select>
                <button type="button" className="party-grid-refresh-button" onClick={generateStockSalesReport} disabled={stockSalesLoading} title="Refresh report"><RefreshCw size={15} /></button>
                <div className="party-toolbar-export">
                  <button type="button" className="party-export-excel" onClick={exportStockSalesExcel} disabled={!filteredStockSalesRows.length}><FileSpreadsheet size={15} /> Excel</button>
                  <button type="button" className="party-export-csv" onClick={exportStockSalesCsv} disabled={!filteredStockSalesRows.length}><Download size={15} /> CSV</button>
                  <button type="button" className="party-export-pdf" onClick={exportStockSalesPdf} disabled={!filteredStockSalesRows.length}><FileText size={15} /> PDF</button>
                  <button type="button" className="party-export-print" onClick={printStockSalesReport} disabled={!filteredStockSalesRows.length}><Printer size={15} /> Print</button>
                </div>
              </div>
            </div>
            <div className="stock-sales-summary">
              <span>Records <strong>{stockSalesSummary?.records || 0}</strong></span>
              <span>Stock Qty <strong>{numberText(stockSalesSummary?.stockQty, 3)}</strong></span>
              <span>Sales Qty <strong>{numberText(stockSalesSummary?.totalSalesQty, 3)}</strong></span>
              <span>Free Qty <strong>{numberText(stockSalesSummary?.freeQty, 3)}</strong></span>
              <span>Sales Amount <strong>₹ {numberText(stockSalesSummary?.salesAmount)}</strong></span>
            </div>
            <div className="party-report-grid-container stock-sales-table-wrap">
              {filteredStockSalesRows.length === 0 ? (
                <div className="party-empty-report"><PackageSearch size={36} /><strong>No matching records</strong><span>Change the result search or report filters.</span></div>
              ) : (
              <div className="party-report-zoom" style={{ zoom: Number(stockSalesZoom) / 100 }}>
              <table className="party-report-table stock-sales-table">
                <thead><tr>
                  <th>Sr.</th>
                  {!stockSalesFilters.companyCode && <th>Company</th>}
                  <th>ShortCode</th><th>Product Code</th><th>Product Name</th><th>Local Product</th><th>SysProdCode</th>
                  <th className="party-report-number">MRP</th><th className="party-report-number">Opening</th>
                  <th className="party-report-number">Purchase</th><th className="party-report-number">Credit Note</th>
                  <th className="party-report-number">Increase</th><th className="party-report-number">MFI</th>
                  <th className="party-report-number">To GDTransfer</th><th className="party-report-number">Sales</th>
                  <th className="party-report-number">Debit Note</th><th className="party-report-number">Decrease</th>
                  <th className="party-report-number">Damage</th><th className="party-report-number">MFO</th>
                  <th className="party-report-number">From GDTransfer</th><th className="party-report-number">Closing</th>
                  <th className="party-report-number">BoxPack</th><th>Last Purchase Date</th>
                  <th className="party-report-number">Last Purchase</th><th className="party-report-number">Last Qty</th>
                  <th>Category</th><th>SubCategory</th><th>Group</th><th>SubGroup</th><th>Brand</th><th>SubBrand</th>
                  {stockSalesFilters.reportWith === "details" && <th>Godown</th>}
                </tr></thead>
                <tbody>{filteredStockSalesRows.map((row) => <tr key={`${row.CompanyCode}-${row.ProductCode}-${row.GodownCode}-${row.SrNo}`}>
                  <td>{row.SrNo}</td>
                  {!stockSalesFilters.companyCode && <td>{row.CompanyName}</td>}
                  <td>{row.ShortCode || "-"}</td><td>{row.ProductCode}</td><td>{row.ProductName}</td>
                  <td>{row.LocalProduct || "-"}</td><td>{row.SysProdCode || "-"}</td>
                  <td className="party-report-number">{numberText(row.MRP)}</td>
                  <td className="party-report-number">{numberText(row.Opening, 3)}</td>
                  <td className="party-report-number">{numberText(row.Purchase, 3)}</td>
                  <td className="party-report-number">{numberText(row.CreditNote, 3)}</td>
                  <td className="party-report-number">{numberText(row.Increase, 3)}</td>
                  <td className="party-report-number">{numberText(row.MFI, 3)}</td>
                  <td className="party-report-number">{numberText(row.ToGDTransfer, 3)}</td>
                  <td className="party-report-number">{numberText(row.Sales, 3)}</td>
                  <td className="party-report-number">{numberText(row.DebitNote, 3)}</td>
                  <td className="party-report-number">{numberText(row.Decrease, 3)}</td>
                  <td className="party-report-number">{numberText(row.Damage, 3)}</td>
                  <td className="party-report-number">{numberText(row.MFO, 3)}</td>
                  <td className="party-report-number">{numberText(row.FromGDTransfer, 3)}</td>
                  <td className="party-report-number">{numberText(row.Closing, 3)}</td>
                  <td className="party-report-number">{numberText(row.BoxPack, 3)}</td>
                  <td>{row.LastPurchaseDate || "-"}</td>
                  <td className="party-report-number">{numberText(row.LastPurchase)}</td>
                  <td className="party-report-number">{numberText(row.LastQty, 3)}</td>
                  <td>{row.Category || "-"}</td><td>{row.SubCategory || "-"}</td>
                  <td>{row.Group || "-"}</td><td>{row.SubGroup || "-"}</td>
                  <td>{row.Brand || "-"}</td><td>{row.SubBrand || "-"}</td>
                  {stockSalesFilters.reportWith === "details" && <td>{row.GodownName}</td>}
                </tr>)}</tbody>
                <tfoot><tr>{stockSalesColumns.map((column, index) => (
                  <td key={column.key} className={stockSalesTotalKeys.has(column.key) ? "party-report-number" : ""}>
                    {index === 0 ? "TOTAL" : stockSalesTotalKeys.has(column.key) ? numberText(visibleStockSalesTotals[column.key], 3) : ""}
                  </td>
                ))}</tr></tfoot>
              </table>
              </div>
              )}
            </div>
            <div className="party-report-statusbar">
              <span>Records: {filteredStockSalesRows.length}</span>
              <span>Level: {stockSalesFilters.reportLevel === "company" ? "Company Wise" : stockSalesFilters.reportLevel === "product" ? "Product Wise" : "Unit Wise"}</span>
              <span>Period: {stockSalesFilters.fromDate || "--"} to {stockSalesFilters.toDate || "--"}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (selectedReport === "All Party Wise Sales Report") {
    return (
      <div className="party-classic-report-page">
        <div className="party-classic-report-window">
          <div className="party-classic-titlebar">
            <div className="party-report-title-left">
              <button
                type="button"
                className="party-title-back"
                onClick={onBack}
                title="Back to reports"
                aria-label="Back to reports"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="party-title-icon">
                <BarChart3 size={21} />
              </div>

              <div className="party-title-content">
                <span>Sales Report</span>
                <h1>All Party Wise Sales Report</h1>
                <p>
                  View consolidated sales information for all parties with advanced filtering
                </p>
              </div>
            </div>

            <div className="party-title-actions">
              <button
                type="button"
                className="party-title-secondary-button"
                title="Clear current filters"
                onClick={clearAllPartySalesFilters}
              >
                <RefreshCw size={15} />
                Reset Filter
              </button>

              <button
                type="button"
                className="party-title-generate-button"
                onClick={generateAllPartySalesReport}
                disabled={isAllPartyReportLoading || isCriteriaLoading}
              >
                {isAllPartyReportLoading ? (
                  <RefreshCw size={16} className="party-spinning-icon" />
                ) : (
                  <BarChart3 size={16} />
                )}
                {isAllPartyReportLoading ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>

          <div className="party-report-content-layout">
            <main className="party-report-main-column">
              <div className="party-report-filter-panel">
                <fieldset className="party-filter-group">
                  <legend>
                    <span className="party-filter-legend-icon">
                      <BarChart3 size={15} />
                    </span>
                    Report Filters
                  </legend>

                  <div className="party-report-form-grid">
                    <div className="party-report-field">
                      <label>Company</label>
                      <select
                        value={allPartySalesFilters.company}
                        disabled={isCriteriaLoading}
                        onChange={(event) => {
                          updateAllPartySalesFilter("company", event.target.value);
                          setShowAllAreaSelector(false);
                          setShowAllSalesmanSelector(false);
                        }}
                      >
                        <option value="">
                          {isCriteriaLoading ? "Loading..." : "All Companies"}
                        </option>
                        {reportCompanies.map((company, index) => {
                          const companyCode = getCompanyCode(company, index);
                          const companyName = getCompanyName(company) || companyCode;
                          return (
                            <option key={company._id || companyCode} value={companyCode}>
                              {companyName}
                            </option>
                          );
                        })}
                      </select>
                      <small className="party-field-help">
                        Select "All Companies" to include all companies in the report
                      </small>
                    </div>

                    <div className="party-report-field">
                      <label>Report Level</label>
                      <select
                        value={allPartySalesFilters.reportLevel}
                        onChange={(event) => {
                          const reportLevel = event.target.value;
                          setAllPartySalesFilters((previous) => ({
                            ...previous,
                            reportLevel,
                            productWise: reportLevel === "salesDetails" ? "yes" : previous.productWise,
                          }));
                          setAllPartyReportRows([]);
                          setAllPartyReportColumns([]);
                          setAllPartyReportSearch("");
                          setAllPartyCurrentPage(1);
                          setIsAllPartyReportGenerated(false);
                          setAllPartyReportError("");
                        }}
                      >
                        <option value="salesSummary">Sales Summary</option>
                        <option value="salesDetails">Sales Details</option>
                      </select>
                    </div>

                    <div className="party-report-field">
                      <label>Selected Area</label>
                      <select
                        value={allPartySalesFilters.selectedArea}
                        disabled={!allPartySalesFilters.company && reportCompanies.length === 0}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAllPartySalesFilters((previous) => ({
                            ...previous,
                            selectedArea: value,
                            selectedAreaCodes: value === "yes" ? previous.selectedAreaCodes : [],
                          }));
                          if (value === "yes") {
                            setShowAllAreaSelector(true);
                          } else {
                            setShowAllAreaSelector(false);
                          }
                          setAllPartyReportRows([]);
                          setIsAllPartyReportGenerated(false);
                        }}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>

                    <div className="party-report-field">
                      <label>Select Salesman</label>
                      <select
                        value={allPartySalesFilters.selectedSalesman}
                        disabled={!allPartySalesFilters.company && reportCompanies.length === 0}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAllPartySalesFilters((previous) => ({
                            ...previous,
                            selectedSalesman: value,
                            selectedSalesmanCodes: value === "yes" ? previous.selectedSalesmanCodes : [],
                          }));
                          if (value === "yes") {
                            setShowAllSalesmanSelector(true);
                          } else {
                            setShowAllSalesmanSelector(false);
                          }
                          setAllPartyReportRows([]);
                          setIsAllPartyReportGenerated(false);
                        }}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>

                    <div className="party-report-field">
                      <label>Product Wise</label>
                      <select
                        value={
                          allPartySalesFilters.reportLevel === "salesDetails"
                            ? "yes"
                            : allPartySalesFilters.productWise
                        }
                        disabled={allPartySalesFilters.reportLevel === "salesDetails"}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAllPartySalesFilters((previous) => ({
                            ...previous,
                            productWise: value,
                          }));
                          setAllPartyReportRows([]);
                          setAllPartyReportColumns([]);
                          setAllPartyReportSearch("");
                          setAllPartyCurrentPage(1);
                          setIsAllPartyReportGenerated(false);
                          setAllPartyReportError("");
                        }}
                        title={
                          allPartySalesFilters.reportLevel === "salesDetails"
                            ? "Product Wise is required for Sales Details"
                            : "Select whether product details should be displayed"
                        }
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                      {allPartySalesFilters.reportLevel === "salesDetails" && (
                        <small className="party-field-help">
                          Product details are always shown in Sales Details.
                        </small>
                      )}
                    </div>

                    <div className="party-report-field">
                      <label>Bill Wise Salesman</label>
                      <select
                        value={allPartySalesFilters.billWiseSalesman}
                        onChange={(event) => {
                          updateAllPartySalesFilter("billWiseSalesman", event.target.value);
                        }}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>

                    <div className="party-report-field">
                      <label>Free Value On</label>
                      <select
                        value={allPartySalesFilters.freeValueOn}
                        onChange={(event) => {
                          updateAllPartySalesFilter("freeValueOn", event.target.value);
                        }}
                      >
                        <option value="PRate">PRate</option>
                        <option value="SRate">SRate</option>
                        <option value="MRP">MRP</option>
                      </select>
                    </div>

                    <div className="party-report-field">
                      <label>From Date</label>
                      <input
                        type="date"
                        value={allPartySalesFilters.fromDate}
                        onChange={(event) =>
                          updateAllPartySalesFilter("fromDate", event.target.value)
                        }
                      />
                    </div>

                    <div className="party-report-field">
                      <label>To Date</label>
                      <input
                        type="date"
                        value={allPartySalesFilters.toDate}
                        onChange={(event) =>
                          updateAllPartySalesFilter("toDate", event.target.value)
                        }
                      />
                    </div>

                    <div className="party-report-field">
                      <label>With Credit Note</label>
                      <select
                        value={allPartySalesFilters.withCreditNote}
                        onChange={(event) =>
                          updateAllPartySalesFilter("withCreditNote", event.target.value)
                        }
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>

                    <div className="party-report-field">
                      <label>Order By</label>
                      <select
                        value={allPartySalesFilters.orderBy}
                        onChange={(event) =>
                          updateAllPartySalesFilter("orderBy", event.target.value)
                        }
                      >
                        <option value="partyName">Party Name</option>
                        <option value="partyCode">Party Code</option>
                        <option value="billDate">Bill Date</option>
                        {(allPartySalesFilters.productWise === "yes" ||
                          allPartySalesFilters.reportLevel === "salesDetails") && (
                          <option value="productName">Product Name</option>
                        )}
                        <option value="netAmount">Net Amount</option>
                      </select>
                    </div>
                  </div>
                </fieldset>

                {showAllAreaSelector && (
                  <div
                    className="party-selection-backdrop"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        setShowAllAreaSelector(false);
                      }
                    }}
                  >
                    <div className="party-selection-modal">
                      <div className="party-selection-modal-header">
                        <div>
                          <strong>Select Area</strong>
                          <span>Only company-mapped areas</span>
                        </div>
                        <button type="button" onClick={() => setShowAllAreaSelector(false)}>
                          <X size={15} />
                        </button>
                      </div>

                      <div className="party-selector-search">
                        <Search size={13} />
                        <input
                          type="text"
                          value={allAreaSelectorSearch}
                          placeholder="Search area name..."
                          onChange={(event) => setAllAreaSelectorSearch(event.target.value)}
                        />
                      </div>

                      <label className="party-check-row party-check-all">
                        <input
                          type="checkbox"
                          checked={
                            mappedAreas.length > 0 &&
                            allPartySalesFilters.selectedAreaCodes.length === mappedAreas.length
                          }
                          onChange={(event) => toggleAllAreas(event.target.checked)}
                        />
                        <span>Select All Areas</span>
                      </label>

                      <div className="party-checkbox-list">
                        {visibleAllAreaOptions.length > 0 ? (
                          visibleAllAreaOptions.map((area, index) => {
                            const areaCode = getAreaCode(area, index);
                            const isChecked = allPartySalesFilters.selectedAreaCodes.includes(areaCode);

                            return (
                              <label key={area._id || areaCode} className="party-check-row">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(event) => {
                                    setAllPartySalesFilters((prev) => {
                                      const currentValues = prev.selectedAreaCodes || [];
                                      const nextValues = event.target.checked
                                        ? [...new Set([...currentValues, areaCode])]
                                        : currentValues.filter((code) => code !== areaCode);
                                      return { ...prev, selectedAreaCodes: nextValues };
                                    });
                                    setAllPartyReportRows([]);
                                    setIsAllPartyReportGenerated(false);
                                  }}
                                />
                                <span className="party-check-name">
                                  {getAreaName(area) || "Unnamed Area"}
                                </span>
                              </label>
                            );
                          })
                        ) : (
                          <div className="party-selector-empty">No mapped area found.</div>
                        )}
                      </div>

                      <div className="party-selection-modal-footer">
                        <span>{allPartySalesFilters.selectedAreaCodes.length} area(s) selected</span>
                        <button type="button" onClick={() => setShowAllAreaSelector(false)}>
                          <Check size={13} /> Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showAllSalesmanSelector && (
                  <div
                    className="party-selection-backdrop"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        setShowAllSalesmanSelector(false);
                      }
                    }}
                  >
                    <div className="party-selection-modal">
                      <div className="party-selection-modal-header">
                        <div>
                          <strong>Select Salesman</strong>
                          <span>Only company-mapped salesmen</span>
                        </div>
                        <button type="button" onClick={() => setShowAllSalesmanSelector(false)}>
                          <X size={15} />
                        </button>
                      </div>

                      <div className="party-selector-search">
                        <Search size={13} />
                        <input
                          type="text"
                          value={allSalesmanSelectorSearch}
                          placeholder="Search salesman name..."
                          onChange={(event) => setAllSalesmanSelectorSearch(event.target.value)}
                        />
                      </div>

                      <label className="party-check-row party-check-all">
                        <input
                          type="checkbox"
                          checked={
                            mappedSalesmen.length > 0 &&
                            allPartySalesFilters.selectedSalesmanCodes.length === mappedSalesmen.length
                          }
                          onChange={(event) => toggleAllSalesmen(event.target.checked)}
                        />
                        <span>Select All Salesmen</span>
                      </label>

                      <div className="party-checkbox-list">
                        {visibleAllSalesmanOptions.length > 0 ? (
                          visibleAllSalesmanOptions.map((salesman, index) => {
                            const salesmanCode = getSalesmanCode(salesman, index);
                            const isChecked = allPartySalesFilters.selectedSalesmanCodes.includes(salesmanCode);

                            return (
                              <label key={salesman._id || salesmanCode} className="party-check-row">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(event) => {
                                    setAllPartySalesFilters((prev) => {
                                      const currentValues = prev.selectedSalesmanCodes || [];
                                      const nextValues = event.target.checked
                                        ? [...new Set([...currentValues, salesmanCode])]
                                        : currentValues.filter((code) => code !== salesmanCode);
                                      return { ...prev, selectedSalesmanCodes: nextValues };
                                    });
                                    setAllPartyReportRows([]);
                                    setIsAllPartyReportGenerated(false);
                                  }}
                                />
                                <span className="party-check-name">
                                  {getSalesmanName(salesman) || "Unnamed Salesman"}
                                </span>
                              </label>
                            );
                          })
                        ) : (
                          <div className="party-selector-empty">No mapped salesman found.</div>
                        )}
                      </div>

                      <div className="party-selection-modal-footer">
                        <span>
                          {allPartySalesFilters.selectedSalesmanCodes.length} salesman(s) selected
                        </span>
                        <button type="button" onClick={() => setShowAllSalesmanSelector(false)}>
                          <Check size={13} /> Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {allPartyReportError && (
                <div className="party-report-error" role="alert">
                  {allPartyReportError}
                </div>
              )}

              <div className="party-report-results">
                <div className="party-result-caption">Report Results</div>

                <div className="party-report-toolbar">
                  <div className="party-grid-heading">
                    <div className="party-grid-heading-icon">
                      <BarChart3 size={17} />
                    </div>
                    <div>
                      <strong>Report Results</strong>
                      <span>
                        {isAllPartyReportGenerated
                          ? `${filteredAllPartySalesRows.length} records found`
                          : "Generate the report to view results"}
                      </span>
                    </div>
                  </div>

                  <div className="party-grid-toolbar-actions">
                    <div className="party-report-search">
                      <Search size={15} />
                      <input
                        type="text"
                        value={allPartyReportSearch}
                        onChange={(event) => {
                          setAllPartyReportSearch(event.target.value);
                          setAllPartyCurrentPage(1);
                        }}
                        placeholder="Search in results..."
                      />
                      {allPartyReportSearch.trim() !== "" && (
                        <button
                          type="button"
                          className="party-grid-search-clear"
                          onClick={() => {
                            setAllPartyReportSearch("");
                            setAllPartyCurrentPage(1);
                          }}
                          title="Clear search"
                          aria-label="Clear search"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <select
                      className="party-grid-zoom-select"
                      value={allPartyReportZoom}
                      onChange={(event) => setAllPartyReportZoom(event.target.value)}
                      title="Grid zoom"
                    >
                      <option value="75">75%</option>
                      <option value="90">90%</option>
                      <option value="100">100%</option>
                      <option value="125">125%</option>
                      <option value="150">150%</option>
                    </select>

                    <button
                      type="button"
                      className="party-grid-refresh-button"
                      onClick={generateAllPartySalesReport}
                      disabled={isAllPartyReportLoading || (allPartySalesFilters.company === "" && reportCompanies.length === 0)}
                      title="Refresh report"
                    >
                      <RefreshCw size={15} />
                    </button>

                    <div className="party-toolbar-export">
                      <button
                        type="button"
                        className="party-export-excel"
                        onClick={exportAllPartyReportToExcel}
                        disabled={!isAllPartyReportGenerated || filteredAllPartySalesRows.length === 0}
                      >
                        <FileSpreadsheet size={15} /> Excel
                      </button>

                      <button
                        type="button"
                        className="party-export-csv"
                        onClick={exportAllPartyReportToCsv}
                        disabled={!isAllPartyReportGenerated || filteredAllPartySalesRows.length === 0}
                      >
                        <Download size={15} /> CSV
                      </button>

                      <button
                        type="button"
                        className="party-export-pdf"
                        onClick={exportAllPartyReportToPdf}
                        disabled={!isAllPartyReportGenerated || filteredAllPartySalesRows.length === 0}
                      >
                        <FileText size={15} /> PDF
                      </button>

                      <button
                        type="button"
                        className="party-export-print"
                        onClick={printAllPartyReport}
                        disabled={!isAllPartyReportGenerated || filteredAllPartySalesRows.length === 0}
                      >
                        <Printer size={15} /> Print
                      </button>
                    </div>
                  </div>
                </div>

                <div className="party-report-grid-container">
                  {!isAllPartyReportGenerated ? (
                    <div className="party-empty-report">
                      <BarChart3 size={40} />
                      <strong>No report generated</strong>
                      <span>Select the required report filters and click Generate.</span>
                    </div>
                  ) : (
                    <div
                      className="party-report-zoom"
                      style={{ zoom: Number(allPartyReportZoom) / 100 }}
                    >
                      <table className="party-report-table" style={{ width: '100%', minWidth: '1200px' }}>
                        <thead>
                          <tr>
                            {allPartyReportColumns.map((column) => (
                              <th
                                key={column.key}
                                className={column.type === "number" ? "party-report-number" : ""}
                                style={{
                                  minWidth: column.key === 'partyName' || column.key === 'productName' ? '180px' :
                                    column.type === 'number' ? '90px' : '100px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {column.label}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {allPartyPageRows.map((row, rowIndex) => (
                            <tr key={row.rowId || rowIndex}>
                              {allPartyReportColumns.map((column) => (
                                <td
                                  key={`${rowIndex}-${column.key}`}
                                  className={column.type === "number" ? "party-report-number" : ""}
                                  style={{
                                    minWidth: column.key === 'partyName' || column.key === 'productName' ? '180px' :
                                      column.type === 'number' ? '90px' : '100px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                  title={String(formatPartyReportValue(column, row[column.key]))}
                                >
                                  {formatPartyReportValue(column, row[column.key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>

                        {filteredAllPartySalesRows.length > 0 && (
                          <tfoot>
                            <tr>
                              {allPartyReportColumns.map((column, index) => {
                                let value = "";
                                if (index === 0) value = "TOTAL";
                                if (column.key === "grossAmount") value = formatReportNumber(allPartySalesTotals.grossAmount);
                                if (column.key === "discountAmount") value = formatReportNumber(allPartySalesTotals.discountAmount);
                                if (column.key === "cashDiscountAmount") value = formatReportNumber(allPartySalesTotals.cashDiscountAmount);
                                if (column.key === "vatAmount") value = formatReportNumber(allPartySalesTotals.vatAmount);
                                if (column.key === "lessOther") value = formatReportNumber(allPartySalesTotals.lessOther);
                                if (column.key === "addOther") value = formatReportNumber(allPartySalesTotals.addOther);
                                if (column.key === "btmAmount") value = formatReportNumber(allPartySalesTotals.btmAmount);
                                if (column.key === "weight") value = formatReportNumber(allPartySalesTotals.weight);
                                if (column.key === "couponAmount") value = formatReportNumber(allPartySalesTotals.couponAmount);
                                if (column.key === "displayAmount") value = formatReportNumber(allPartySalesTotals.displayAmount);
                                if (column.key === "starAmount") value = formatReportNumber(allPartySalesTotals.starAmount);
                                if (column.key === "surChargeAmount") value = formatReportNumber(allPartySalesTotals.surChargeAmount);
                                if (column.key === "retAmount") value = formatReportNumber(allPartySalesTotals.retAmount);
                                if (column.key === "retVatAmount") value = formatReportNumber(allPartySalesTotals.retVatAmount);
                                if (column.key === "addLessAmount") value = formatReportNumber(allPartySalesTotals.addLessAmount);
                                if (column.key === "netAmount") value = formatReportNumber(allPartySalesTotals.netAmount);
                                if (column.key === "totalLines") value = formatReportNumber(allPartySalesTotals.totalLines);
                                if (column.key === "qty") value = formatReportNumber(allPartySalesTotals.qty);
                                if (column.key === "freeQty") value = formatReportNumber(allPartySalesTotals.freeQty);

                                return (
                                  <td
                                    key={column.key}
                                    className={column.type === "number" ? "party-report-number" : ""}
                                    style={{
                                      fontWeight: 'bold',
                                      minWidth: column.key === 'partyName' || column.key === 'productName' ? '180px' :
                                        column.type === 'number' ? '90px' : '100px'
                                    }}
                                  >
                                    {value}
                                  </td>
                                );
                              })}
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>

                <div className="party-report-statusbar">
                  <span>
                    Records: {isAllPartyReportGenerated ? filteredAllPartySalesRows.length : 0}
                  </span>
                  <span>
                    Level: {allPartySalesFilters.reportLevel === "salesSummary" ? "Sales Summary" : "Sales Details"}
                  </span>
                  <span>
                    Period: {allPartySalesFilters.fromDate || "--"} to {allPartySalesFilters.toDate || "--"}
                  </span>
                </div>
              </div>
            </main>

            <aside className="party-report-sidebar">
              <section className="party-sidebar-card">
                <div className="party-sidebar-card-title">
                  <BarChart3 size={18} />
                  <strong>Quick Summary</strong>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><Users size={17} /></span>
                  <div>
                    <small>Total Records</small>
                    <strong>{filteredAllPartySalesRows.length.toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><FileText size={17} /></span>
                  <div>
                    <small>Report Level</small>
                    <strong>{allPartySalesFilters.reportLevel === "salesSummary" ? "Sales Summary" : "Sales Details"}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><ShoppingCart size={17} /></span>
                  <div>
                    <small>Total Quantity</small>
                    <strong>{formatReportNumber(allPartySalesTotals.qty || 0)}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><BarChart3 size={17} /></span>
                  <div>
                    <small>Total Amount</small>
                    <strong>₹ {formatReportNumber(allPartySalesTotals.netAmount || 0)}</strong>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // PARTY WISE SALES REPORT - RENDER
  // =========================================================
  if (selectedReport === "Party Wise Sales Report") {
    return (
      <div className="party-classic-report-page party-wise-sales-report-page">
        <div className="party-classic-report-window">
          <div className="party-classic-titlebar">
            <div className="party-report-title-left">
              <button
                type="button"
                className="party-title-back"
                onClick={onBack}
                title="Back to reports"
                aria-label="Back to reports"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="party-title-icon">
                <Users size={21} />
              </div>

              <div className="party-title-content">
                <span>Sales Report</span>
                <h1>Party Wise Sales Report</h1>
                <p>Detailed party-wise sales analysis with advanced filtering and insights</p>
              </div>
            </div>

            <div className="party-title-actions">
              <button
                type="button"
                className="party-title-secondary-button"
                title="Clear current filters"
                onClick={clearPartySalesFilters}
              >
                <RefreshCw size={15} />
                Reset Filter
              </button>

              <button
                type="button"
                className="party-title-generate-button"
                onClick={generatePartySalesReport}
                disabled={isPartyReportLoading || isCriteriaLoading}
              >
                {isPartyReportLoading ? (
                  <RefreshCw size={16} className="party-spinning-icon" />
                ) : (
                  <FileBarChart size={16} />
                )}
                {isPartyReportLoading ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>

          <div className="party-report-content-layout">
            <main className="party-report-main-column">
              <div className="party-report-filter-panel">
                <fieldset className="party-filter-group">
                  <legend>
                    <span className="party-filter-legend-icon">
                      <FileBarChart size={15} />
                    </span>
                    Report Filters
                  </legend>

                  <div className="party-report-form-grid">
                    <div className="party-report-field">
                      <label>Company</label>
                      <select
                        value={partySalesFilters.company}
                        disabled={isCriteriaLoading}
                        onChange={(event) => {
                          updatePartySalesFilter("company", event.target.value);
                          setPartySalesFilters((previous) => ({
                            ...previous,
                            company: event.target.value,
                            selectedPartyCodes: [],
                            selectedAreaCodes: [],
                            selectedSalesmanCodes: [],
                          }));
                          setShowPartySelector(false);
                          setShowAreaSelector(false);
                          setShowSalesmanSelector(false);
                        }}
                      >
                        <option value="ALL">
                          All Companies
                        </option>
                        {reportCompanies.map((company, index) => {
                          const companyCode = getCompanyCode(company, index);
                          const companyName = getCompanyName(company) || companyCode;
                          return (
                            <option key={company._id || companyCode} value={companyCode}>
                              {companyName}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="party-report-field">
                      <label>Report Level</label>
                      <select
                        value={partySalesFilters.reportLevel}
                        onChange={(event) => {
                          const reportLevel = event.target.value;
                          setPartySalesFilters((previous) => ({
                            ...previous,
                            reportLevel,
                            productWise: reportLevel === "salesDetails" ? "yes" : previous.productWise,
                            selectedPartyCodes: reportLevel === "selectedParty" ? previous.selectedPartyCodes : [],
                          }));
                          setShowPartySelector(false);
                          setPartyReportRows([]);
                          setPartyReportColumns([]);
                          setPartyReportSearch("");
                          setPartyCurrentPage(1);
                          setIsPartyReportGenerated(false);
                          setPartyReportError("");
                        }}
                      >
                        <option value="salesSummary">Sales Summary</option>
                        <option value="salesDetails">Sales Details</option>
                        <option value="selectedParty">Selected Party Wise</option>
                      </select>
                    </div>

                    {partySalesFilters.reportLevel === "selectedParty" && (
                      <div className="party-report-field party-field-wide">
                        <label>Selected Parties</label>
                        <div className="party-multi-select">
                          <button
                            type="button"
                            className="party-multi-select-trigger"
                            disabled={!partySalesFilters.company || isCriteriaLoading}
                            onClick={() => {
                              if (!partySalesFilters.company) {
                                setPartyReportError("Please select company first.");
                                return;
                              }
                              setShowPartySelector((previous) => !previous);
                              setPartyReportError("");
                            }}
                          >
                            <span>
                              {selectedPartyNames.length > 0
                                ? selectedPartyNames.join(", ")
                                : "Select party names"}
                            </span>
                            <span>▼</span>
                          </button>

                          {showPartySelector && (
                            <div className="party-checkbox-dropdown party-checkbox-dropdown-large">
                              <div className="party-selector-header">
                                <div>
                                  <strong>Select Parties</strong>
                                  <small>{partySalesFilters.selectedPartyCodes.length} Selected</small>
                                </div>
                                <button
                                  type="button"
                                  className="party-close-btn"
                                  onClick={() => setShowPartySelector(false)}
                                >
                                  <X size={16} />
                                </button>
                              </div>

                              <div className="party-selector-search">
                                <Search size={15} />
                                <input
                                  type="text"
                                  value={partySelectorSearch}
                                  autoFocus
                                  placeholder="Search in parties..."
                                  onChange={(event) => setPartySelectorSearch(event.target.value)}
                                />
                              </div>

                              <div className="party-selector-sort-label">
                                <span>Sort by Name (A-Z)</span>
                              </div>

                              <div className="modern-party-list">
                                {visiblePartyOptions.length > 0 ? (
                                  visiblePartyOptions.map((party, index) => {
                                    const partyCode = getAccountCode(party, index);
                                    const checked = partySalesFilters.selectedPartyCodes.includes(partyCode);

                                    return (
                                      <label
                                        key={partyCode}
                                        className={`party-card ${checked ? "selected" : ""}`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(event) =>
                                            toggleValueInArray(
                                              "selectedPartyCodes",
                                              partyCode,
                                              event.target.checked
                                            )
                                          }
                                        />
                                        <div className="party-card-details">
                                          <div className="party-card-header">
                                            <span className="party-name">{getAccountName(party)}</span>
                                            <span className="party-code">{partyCode}</span>
                                          </div>
                                          <div className="party-card-footer">
                                            <span className="party-location">{party.town || party.city || ""}</span>
                                            <span className="party-phone">{party.mobileNo || party.phone || ""}</span>
                                          </div>
                                        </div>
                                      </label>
                                    );
                                  })
                                ) : (
                                  <div className="party-empty">No parties found</div>
                                )}
                              </div>

                              <div className="party-selector-footer">
                                <button
                                  type="button"
                                  className="party-cancel-btn"
                                  onClick={() => setShowPartySelector(false)}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="party-apply-btn"
                                  onClick={() => setShowPartySelector(false)}
                                >
                                  Apply Selection
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="party-report-field">
                      <label>Selected Area</label>
                      <select
                        value={partySalesFilters.selectedArea}
                        disabled={!partySalesFilters.company}
                        onChange={(event) => {
                          const value = event.target.value;
                          setPartySalesFilters((previous) => ({
                            ...previous,
                            selectedArea: value,
                            selectedAreaCodes: value === "yes" ? previous.selectedAreaCodes : [],
                          }));
                          if (value === "yes") {
                            setShowAreaSelector(true);
                          } else {
                            setShowAreaSelector(false);
                          }
                          setPartyReportRows([]);
                          setIsPartyReportGenerated(false);
                        }}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>

                    <div className="party-report-field">
                      <label>Select Salesman</label>
                      <select
                        value={partySalesFilters.selectedSalesman}
                        disabled={!partySalesFilters.company}
                        onChange={(event) => {
                          const value = event.target.value;
                          setPartySalesFilters((previous) => ({
                            ...previous,
                            selectedSalesman: value,
                            selectedSalesmanCodes: value === "yes" ? previous.selectedSalesmanCodes : [],
                          }));
                          if (value === "yes") {
                            setShowSalesmanSelector(true);
                          } else {
                            setShowSalesmanSelector(false);
                          }
                          setPartyReportRows([]);
                          setIsPartyReportGenerated(false);
                        }}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>

                    <div className="party-report-field">
                      <label>Product Wise</label>
                      <select
                        value={
                          partySalesFilters.reportLevel === "salesDetails"
                            ? "yes"
                            : partySalesFilters.productWise
                        }
                        disabled={partySalesFilters.reportLevel === "salesDetails"}
                        onChange={(event) => {
                          const value = event.target.value;
                          setPartySalesFilters((previous) => ({
                            ...previous,
                            productWise: value,
                          }));
                          setPartyReportRows([]);
                          setPartyReportColumns([]);
                          setPartyReportSearch("");
                          setPartyCurrentPage(1);
                          setIsPartyReportGenerated(false);
                          setPartyReportError("");
                        }}
                        title={
                          partySalesFilters.reportLevel === "salesDetails"
                            ? "Product Wise is required for Sales Details"
                            : "Select whether product details should be displayed"
                        }
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                      {partySalesFilters.reportLevel === "salesDetails" && (
                        <small className="party-field-help">
                          Product details are always shown in Sales Details.
                        </small>
                      )}
                    </div>

                    <div className="party-report-field">
                      <label>From Date</label>
                      <input
                        type="date"
                        value={partySalesFilters.fromDate}
                        onChange={(event) =>
                          updatePartySalesFilter("fromDate", event.target.value)
                        }
                      />
                    </div>

                    <div className="party-report-field">
                      <label>To Date</label>
                      <input
                        type="date"
                        value={partySalesFilters.toDate}
                        onChange={(event) =>
                          updatePartySalesFilter("toDate", event.target.value)
                        }
                      />
                    </div>

                    <div className="party-report-field">
                      <label>With Credit Note</label>
                      <select
                        value={partySalesFilters.withCreditNote}
                        onChange={(event) =>
                          updatePartySalesFilter("withCreditNote", event.target.value)
                        }
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>

                    <div className="party-report-field">
                      <label>Order By</label>
                      <select
                        value={partySalesFilters.orderBy}
                        onChange={(event) =>
                          updatePartySalesFilter("orderBy", event.target.value)
                        }
                      >
                        <option value="partyName">Party Name</option>
                        <option value="partyCode">Party Code</option>
                        <option value="billDate">Bill Date</option>
                        {(partySalesFilters.productWise === "yes" ||
                          partySalesFilters.reportLevel === "salesDetails") && (
                          <option value="productName">Product Name</option>
                        )}
                        <option value="netAmount">Net Amount</option>
                      </select>
                    </div>
                  </div>
                </fieldset>

                {showAreaSelector && (
                  <div
                    className="party-selection-backdrop"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        setShowAreaSelector(false);
                      }
                    }}
                  >
                    <div className="party-selection-modal">
                      <div className="party-selection-modal-header">
                        <div>
                          <strong>Select Area</strong>
                          <span>Only company-mapped areas</span>
                        </div>
                        <button type="button" onClick={() => setShowAreaSelector(false)}>
                          <X size={15} />
                        </button>
                      </div>

                      <div className="party-selector-search">
                        <Search size={13} />
                        <input
                          type="text"
                          value={areaSelectorSearch}
                          placeholder="Search area name..."
                          onChange={(event) => setAreaSelectorSearch(event.target.value)}
                        />
                      </div>

                      <label className="party-check-row party-check-all">
                        <input
                          type="checkbox"
                          checked={
                            mappedAreas.length > 0 &&
                            partySalesFilters.selectedAreaCodes.length === mappedAreas.length
                          }
                          onChange={(event) => toggleAllAreas(event.target.checked)}
                        />
                        <span>Select All Areas</span>
                      </label>

                      <div className="party-checkbox-list">
                        {visibleAreaOptions.length > 0 ? (
                          visibleAreaOptions.map((area, index) => {
                            const areaCode = getAreaCode(area, index);
                            const isChecked = partySalesFilters.selectedAreaCodes.includes(areaCode);

                            return (
                              <label key={area._id || areaCode} className="party-check-row">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(event) => {
                                    setPartySalesFilters((prev) => {
                                      const currentValues = prev.selectedAreaCodes || [];
                                      const nextValues = event.target.checked
                                        ? [...new Set([...currentValues, areaCode])]
                                        : currentValues.filter((code) => code !== areaCode);
                                      return { ...prev, selectedAreaCodes: nextValues };
                                    });
                                    setPartyReportRows([]);
                                    setIsPartyReportGenerated(false);
                                  }}
                                />
                                <span className="party-check-name">
                                  {getAreaName(area) || "Unnamed Area"}
                                </span>
                              </label>
                            );
                          })
                        ) : (
                          <div className="party-selector-empty">No mapped area found.</div>
                        )}
                      </div>

                      <div className="party-selection-modal-footer">
                        <span>{partySalesFilters.selectedAreaCodes.length} area(s) selected</span>
                        <button type="button" onClick={() => setShowAreaSelector(false)}>
                          <Check size={13} /> Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showSalesmanSelector && (
                  <div
                    className="party-selection-backdrop"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        setShowSalesmanSelector(false);
                      }
                    }}
                  >
                    <div className="party-selection-modal">
                      <div className="party-selection-modal-header">
                        <div>
                          <strong>Select Salesman</strong>
                          <span>Only company-mapped salesmen</span>
                        </div>
                        <button type="button" onClick={() => setShowSalesmanSelector(false)}>
                          <X size={15} />
                        </button>
                      </div>

                      <div className="party-selector-search">
                        <Search size={13} />
                        <input
                          type="text"
                          value={salesmanSelectorSearch}
                          placeholder="Search salesman name..."
                          onChange={(event) => setSalesmanSelectorSearch(event.target.value)}
                        />
                      </div>

                      <label className="party-check-row party-check-all">
                        <input
                          type="checkbox"
                          checked={
                            mappedSalesmen.length > 0 &&
                            partySalesFilters.selectedSalesmanCodes.length === mappedSalesmen.length
                          }
                          onChange={(event) => toggleAllSalesmen(event.target.checked)}
                        />
                        <span>Select All Salesmen</span>
                      </label>

                      <div className="party-checkbox-list">
                        {visibleSalesmanOptions.length > 0 ? (
                          visibleSalesmanOptions.map((salesman, index) => {
                            const salesmanCode = getSalesmanCode(salesman, index);
                            const isChecked = partySalesFilters.selectedSalesmanCodes.includes(salesmanCode);

                            return (
                              <label key={salesman._id || salesmanCode} className="party-check-row">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(event) => {
                                    setPartySalesFilters((prev) => {
                                      const currentValues = prev.selectedSalesmanCodes || [];
                                      const nextValues = event.target.checked
                                        ? [...new Set([...currentValues, salesmanCode])]
                                        : currentValues.filter((code) => code !== salesmanCode);
                                      return { ...prev, selectedSalesmanCodes: nextValues };
                                    });
                                    setPartyReportRows([]);
                                    setIsPartyReportGenerated(false);
                                  }}
                                />
                                <span className="party-check-name">
                                  {getSalesmanName(salesman) || "Unnamed Salesman"}
                                </span>
                              </label>
                            );
                          })
                        ) : (
                          <div className="party-selector-empty">No mapped salesman found.</div>
                        )}
                      </div>

                      <div className="party-selection-modal-footer">
                        <span>
                          {partySalesFilters.selectedSalesmanCodes.length} salesman(s) selected
                        </span>
                        <button type="button" onClick={() => setShowSalesmanSelector(false)}>
                          <Check size={13} /> Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {partyReportError && (
                <div className="party-report-error" role="alert">
                  {partyReportError}
                </div>
              )}

              <div className="party-report-results">
                <div className="party-result-caption">Report Results</div>

                <div className="party-report-toolbar">
                  <div className="party-grid-heading">
                    <div className="party-grid-heading-icon">
                      <FileBarChart size={17} />
                    </div>
                    <div>
                      <strong>Report Results</strong>
                      <span>
                        {isPartyReportGenerated
                          ? `${filteredPartySalesRows.length} records found`
                          : "Generate the report to view results"}
                      </span>
                    </div>
                  </div>

                  <div className="party-grid-toolbar-actions">
                    <div className="party-report-search">
                      <Search size={15} />
                      <input
                        type="text"
                        value={partyReportSearch}
                        onChange={(event) => {
                          setPartyReportSearch(event.target.value);
                          setPartyCurrentPage(1);
                        }}
                        placeholder="Search in results..."
                      />
                      {partyReportSearch.trim() !== "" && (
                        <button
                          type="button"
                          className="party-grid-search-clear"
                          onClick={() => {
                            setPartyReportSearch("");
                            setPartyCurrentPage(1);
                          }}
                          title="Clear search"
                          aria-label="Clear search"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <select
                      className="party-grid-zoom-select"
                      value={partyReportZoom}
                      onChange={(event) => setPartyReportZoom(event.target.value)}
                      title="Grid zoom"
                    >
                      <option value="75">75%</option>
                      <option value="90">90%</option>
                      <option value="100">100%</option>
                      <option value="125">125%</option>
                      <option value="150">150%</option>
                    </select>

                    <button
                      type="button"
                      className="party-grid-refresh-button"
                      onClick={generatePartySalesReport}
                      disabled={isPartyReportLoading || !partySalesFilters.company}
                      title="Refresh report"
                    >
                      <RefreshCw size={15} />
                    </button>

                    <div className="party-toolbar-export">
                      <button
                        type="button"
                        className="party-export-excel"
                        onClick={exportPartyReportToExcel}
                        disabled={!isPartyReportGenerated || filteredPartySalesRows.length === 0}
                      >
                        <FileSpreadsheet size={15} /> Excel
                      </button>

                      <button
                        type="button"
                        className="party-export-csv"
                        onClick={exportPartyReportToCsv}
                        disabled={!isPartyReportGenerated || filteredPartySalesRows.length === 0}
                      >
                        <Download size={15} /> CSV
                      </button>

                      <button
                        type="button"
                        className="party-export-pdf"
                        onClick={exportPartyReportToPdf}
                        disabled={!isPartyReportGenerated || filteredPartySalesRows.length === 0}
                      >
                        <FileText size={15} /> PDF
                      </button>

                      <button
                        type="button"
                        className="party-export-print"
                        onClick={printPartyReport}
                        disabled={!isPartyReportGenerated || filteredPartySalesRows.length === 0}
                      >
                        <Printer size={15} /> Print
                      </button>
                    </div>
                  </div>
                </div>

                <div className="party-report-grid-container">
                  {!isPartyReportGenerated ? (
                    <div className="party-empty-report">
                      <FileBarChart size={40} />
                      <strong>No report generated</strong>
                      <span>Select the required report filters and click Generate.</span>
                    </div>
                  ) : (
                    <div
                      className="party-report-zoom"
                      style={{ zoom: Number(partyReportZoom) / 100 }}
                    >
                      <table className="party-report-table" style={{ width: '100%', minWidth: '1200px' }}>
                        <thead>
                          <tr>
                            {partyReportColumns.map((column) => (
                              <th
                                key={column.key}
                                className={column.type === "number" ? "party-report-number" : ""}
                                style={{
                                  minWidth: column.key === 'partyName' || column.key === 'productName' ? '180px' :
                                    column.type === 'number' ? '90px' : '100px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {column.label}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {partyPageRows.map((row, rowIndex) => (
                            <tr key={row.rowId || `${row.billSeries}-${row.billNo}-${row.productCode}-${row.batch}-${rowIndex}`}>
                              {partyReportColumns.map((column) => (
                                <td
                                  key={`${rowIndex}-${column.key}`}
                                  className={column.type === "number" ? "party-report-number" : ""}
                                  style={{
                                    minWidth: column.key === 'partyName' || column.key === 'productName' ? '180px' :
                                      column.type === 'number' ? '90px' : '100px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                  title={String(formatPartyReportValue(column, row[column.key]))}
                                >
                                  {formatPartyReportValue(column, row[column.key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>

                        {filteredPartySalesRows.length > 0 && (
                          <tfoot>
                            <tr>
                              {partyReportColumns.map((column, index) => {
                                let value = "";
                                if (index === 0) value = "TOTAL";
                                if (column.key === "qty") value = formatReportNumber(partySalesTotals.qty);
                                if (column.key === "freeQty") value = formatReportNumber(partySalesTotals.freeQty);
                                if (column.key === "grossAmount") value = formatReportNumber(partySalesTotals.grossAmount);
                                if (column.key === "tprAmount") value = formatReportNumber(partySalesTotals.tprAmount);
                                if (column.key === "schemeAmount") value = formatReportNumber(partySalesTotals.schemeAmount);
                                if (column.key === "cashDiscountAmount") value = formatReportNumber(partySalesTotals.cashDiscountAmount);
                                if (column.key === "taxableAmount") value = formatReportNumber(partySalesTotals.taxableAmount);
                                if (column.key === "gstAmount") value = formatReportNumber(partySalesTotals.gstAmount);
                                if (column.key === "creditNoteAmount") value = formatReportNumber(partySalesTotals.creditNoteAmount);
                                if (column.key === "netAmount") value = formatReportNumber(partySalesTotals.netAmount);

                                return (
                                  <td
                                    key={column.key}
                                    className={column.type === "number" ? "party-report-number" : ""}
                                    style={{
                                      fontWeight: 'bold',
                                      minWidth: column.key === 'partyName' || column.key === 'productName' ? '180px' :
                                        column.type === 'number' ? '90px' : '100px'
                                    }}
                                  >
                                    {value}
                                  </td>
                                );
                              })}
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>

                <div className="party-report-statusbar">
                  <span>
                    Records: {isPartyReportGenerated ? filteredPartySalesRows.length : 0}
                  </span>
                  <span>
                    Level: {partySalesFilters.reportLevel === "salesSummary" ? "Sales Summary" : partySalesFilters.reportLevel === "salesDetails" ? "Sales Details" : "Selected Party"}
                  </span>
                  <span>
                    Period: {partySalesFilters.fromDate || "--"} to {partySalesFilters.toDate || "--"}
                  </span>
                </div>
              </div>
            </main>

            <aside className="party-report-sidebar">
              <section className="party-sidebar-card">
                <div className="party-sidebar-card-title">
                  <BarChart3 size={18} />
                  <strong>Quick Summary</strong>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><Users size={17} /></span>
                  <div>
                    <small>Total Records</small>
                    <strong>{filteredPartySalesRows.length.toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><FileText size={17} /></span>
                  <div>
                    <small>Report Level</small>
                    <strong>{partySalesFilters.reportLevel === "salesSummary" ? "Sales Summary" : partySalesFilters.reportLevel === "salesDetails" ? "Sales Details" : "Selected Party"}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><ShoppingCart size={17} /></span>
                  <div>
                    <small>Total Quantity</small>
                    <strong>{formatReportNumber(partySalesTotals.qty || 0)}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><BarChart3 size={17} /></span>
                  <div>
                    <small>Total Amount</small>
                    <strong>₹ {formatReportNumber(partySalesTotals.netAmount || 0)}</strong>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // PRODUCT WISE SALES REPORT - RENDER (SIMPLIFIED)
  // =========================================================
  if (selectedReport === "Product Wise Sales Report") {
    const productOptionSource =
      reportProductList.length > 0 ? reportProductList : productOptionList;

    const selectedProductNames = useMemo(() => {
      return (productReportFilters.selectedProductCodes || [])
        .map((selectedCode) => {
          const product = productOptionSource.find(
            (p, index) => getProductOptionCode(p, index) === selectedCode
          );
          return product ? getProductOptionName(product) : "";
        })
        .filter(Boolean);
    }, [productReportFilters.selectedProductCodes, productOptionSource]);

    return (
      <div className="party-classic-report-page">
        <div className="party-classic-report-window">
          <div className="party-classic-titlebar">
            <div className="party-report-title-left">
              <button
                type="button"
                className="party-title-back"
                onClick={onBack}
                title="Back to reports"
                aria-label="Back to reports"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="party-title-icon">
                <PackageSearch size={21} />
              </div>

              <div className="party-title-content">
                <span>Sales Report</span>
                <h1>Product Wise Sales Report</h1>
                <p>Product-wise sales quantity, value and transaction analysis</p>
              </div>
            </div>

            <div className="party-title-actions">
              <button
                type="button"
                className="party-title-secondary-button"
                title="Clear current filters"
                onClick={clearProductSalesFilters}
              >
                <RefreshCw size={15} />
                Reset Filter
              </button>

              <button
                type="button"
                className="party-title-generate-button"
                onClick={generateProductSalesReport}
                disabled={isProductReportLoading}
              >
                {isProductReportLoading ? (
                  <RefreshCw size={16} className="party-spinning-icon" />
                ) : (
                  <PackageSearch size={16} />
                )}
                {isProductReportLoading ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>

          <div className="party-report-content-layout">
            <main className="party-report-main-column">
              <div className="party-report-filter-panel">
                <fieldset className="party-filter-group">
                  <legend>
                    <span className="party-filter-legend-icon">
                      <PackageSearch size={15} />
                    </span>
                    Report Filters
                  </legend>

                  <div className="party-report-form-grid-two-rows">
                    <div className="party-report-form-row">
                      <div className="party-report-field">
                        <label>Company</label>
                        <select
                          value={productReportFilters.company}
                          onChange={(event) => {
                            updateProductReportFilter("company", event.target.value);
                            setProductReportFilters((prev) => ({
                              ...prev,
                              selectedProductCodes: [],
                            }));
                            setProductSelectorSearch("");
                            setShowProductSelector(false);
                          }}
                        >
                          <option value="">All Companies</option>
                          {reportCompanies.map((company, index) => {
                            const companyCode = getCompanyCode(company, index);
                            const companyName = getCompanyName(company) || companyCode;
                            return (
                              <option key={company._id || companyCode} value={companyCode}>
                                {companyName}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="party-report-field party-field-wide">
                        <label>Product</label>
                        <div className="party-multi-select">
                          <button
                            type="button"
                            className="party-multi-select-trigger"
                            onClick={() => {
                              setShowProductSelector((prev) => !prev);
                              setProductReportError("");
                            }}
                          >
                            <span>
                              {selectedProductNames.length > 0
                                ? selectedProductNames.join(", ")
                                : "Select products..."}
                            </span>
                            <span>▼</span>
                          </button>
                        </div>
                      </div>

                      <div className="party-report-field">
                        <label>Selected Area</label>
                        <select
                          value={productReportFilters.selectedArea}
                          onChange={(event) => {
                            const value = event.target.value;
                            setProductReportFilters((prev) => ({
                              ...prev,
                              selectedArea: value,
                              selectedAreaCodes: value === "yes" ? prev.selectedAreaCodes : [],
                            }));
                            setIsProductReportGenerated(false);
                            setProductReportRows([]);
                          }}
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>

                      <div className="party-report-field">
                        <label>Salesman</label>
                        <select
                          value={productReportFilters.selectedSalesman}
                          onChange={(event) => {
                            const value = event.target.value;
                            setProductReportFilters((prev) => ({
                              ...prev,
                              selectedSalesman: value,
                              selectedSalesmanCodes: value === "yes" ? prev.selectedSalesmanCodes : [],
                            }));
                            setIsProductReportGenerated(false);
                            setProductReportRows([]);
                          }}
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    </div>

                    <div className="party-report-form-row">
                      <div className="party-report-field">
                        <label>From Date</label>
                        <input
                          type="date"
                          value={productReportFilters.fromDate}
                          onChange={(event) =>
                            updateProductReportFilter("fromDate", event.target.value)
                          }
                        />
                      </div>

                      <div className="party-report-field">
                        <label>To Date</label>
                        <input
                          type="date"
                          value={productReportFilters.toDate}
                          onChange={(event) =>
                            updateProductReportFilter("toDate", event.target.value)
                          }
                        />
                      </div>

                      <div className="party-report-field">
                        <label>With CRN Status</label>
                        <select
                          value={productReportFilters.withCreditNote}
                          onChange={(event) =>
                            updateProductReportFilter("withCreditNote", event.target.value)
                          }
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>

                      <div className="party-report-field">
                        <label>Order By</label>
                        <select
                          value={productReportFilters.orderBy}
                          onChange={(event) =>
                            updateProductReportFilter("orderBy", event.target.value)
                          }
                        >
                          <option value="productName">Product Name</option>
                          <option value="productCode">Product Code</option>
                          <option value="grossAmount">Gross Amount</option>
                          <option value="netAmount">Net Amount</option>
                        </select>
                      </div>

                      <div className="party-report-field">
                        <label>Show Zero Sales</label>
                        <select
                          value={productReportFilters.showZeroSales}
                          onChange={(event) =>
                            updateProductReportFilter("showZeroSales", event.target.value)
                          }
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {productReportFilters.selectedArea === "yes" && (
                    <div
                      className="party-selection-backdrop"
                      onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                          setProductReportFilters((prev) => ({
                            ...prev,
                            selectedArea: "no",
                            selectedAreaCodes: [],
                          }));
                        }
                      }}
                    >
                      <div className="party-selection-modal">
                        <div className="party-selection-modal-header">
                          <div>
                            <strong>Select Area</strong>
                            <span>Select areas to filter</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setProductReportFilters((prev) => ({
                                ...prev,
                                selectedArea: "no",
                                selectedAreaCodes: [],
                              }));
                            }}
                          >
                            <X size={15} />
                          </button>
                        </div>

                        <div className="party-selector-search">
                          <Search size={13} />
                          <input
                            type="text"
                            value={areaSelectorSearch}
                            placeholder="Search area..."
                            onChange={(event) => setAreaSelectorSearch(event.target.value)}
                          />
                        </div>

                        <label className="party-check-row party-check-all">
                          <input
                            type="checkbox"
                            checked={
                              mappedAreas.length > 0 &&
                              productReportFilters.selectedAreaCodes.length === mappedAreas.length
                            }
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setProductReportFilters((prev) => ({
                                ...prev,
                                selectedAreaCodes: checked
                                  ? mappedAreas.map((area, index) => getAreaCode(area, index))
                                  : [],
                              }));
                              setIsProductReportGenerated(false);
                              setProductReportRows([]);
                            }}
                          />
                          <span>Select All Areas</span>
                        </label>

                        <div className="party-checkbox-list">
                          {mappedAreas.length > 0 ? (
                            mappedAreas.map((area, index) => {
                              const areaCode = getAreaCode(area, index);
                              const isChecked = productReportFilters.selectedAreaCodes.includes(areaCode);
                              const areaName = getAreaName(area) || areaCode;

                              return (
                                <label key={area._id || areaCode} className="party-check-row">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(event) => {
                                      setProductReportFilters((prev) => {
                                        const currentValues = prev.selectedAreaCodes || [];
                                        const nextValues = event.target.checked
                                          ? [...new Set([...currentValues, areaCode])]
                                          : currentValues.filter((code) => code !== areaCode);
                                        return { ...prev, selectedAreaCodes: nextValues };
                                      });
                                      setIsProductReportGenerated(false);
                                      setProductReportRows([]);
                                    }}
                                  />
                                  <span className="party-check-name">{areaName}</span>
                                </label>
                              );
                            })
                          ) : (
                            <div className="party-selector-empty">No areas found</div>
                          )}
                        </div>

                        <div className="party-selection-modal-footer">
                          <span>{productReportFilters.selectedAreaCodes.length} area(s) selected</span>
                          <button
                            type="button"
                            onClick={() => {
                              setProductReportFilters((prev) => ({
                                ...prev,
                                selectedArea: "no",
                                selectedAreaCodes: [],
                              }));
                            }}
                          >
                            <Check size={13} /> Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {productReportFilters.selectedSalesman === "yes" && (
                    <div
                      className="party-selection-backdrop"
                      onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                          setProductReportFilters((prev) => ({
                            ...prev,
                            selectedSalesman: "no",
                            selectedSalesmanCodes: [],
                          }));
                        }
                      }}
                    >
                      <div className="party-selection-modal">
                        <div className="party-selection-modal-header">
                          <div>
                            <strong>Select Salesman</strong>
                            <span>Select salesmen to filter</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setProductReportFilters((prev) => ({
                                ...prev,
                                selectedSalesman: "no",
                                selectedSalesmanCodes: [],
                              }));
                            }}
                          >
                            <X size={15} />
                          </button>
                        </div>

                        <div className="party-selector-search">
                          <Search size={13} />
                          <input
                            type="text"
                            value={salesmanSelectorSearch}
                            placeholder="Search salesman..."
                            onChange={(event) => setSalesmanSelectorSearch(event.target.value)}
                          />
                        </div>

                        <label className="party-check-row party-check-all">
                          <input
                            type="checkbox"
                            checked={
                              mappedSalesmen.length > 0 &&
                              productReportFilters.selectedSalesmanCodes.length === mappedSalesmen.length
                            }
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setProductReportFilters((prev) => ({
                                ...prev,
                                selectedSalesmanCodes: checked
                                  ? mappedSalesmen.map((salesman, index) => getSalesmanCode(salesman, index))
                                  : [],
                              }));
                              setIsProductReportGenerated(false);
                              setProductReportRows([]);
                            }}
                          />
                          <span>Select All Salesmen</span>
                        </label>

                        <div className="party-checkbox-list">
                          {mappedSalesmen.length > 0 ? (
                            mappedSalesmen.map((salesman, index) => {
                              const salesmanCode = getSalesmanCode(salesman, index);
                              const isChecked = productReportFilters.selectedSalesmanCodes.includes(salesmanCode);
                              const salesmanName = getSalesmanName(salesman) || salesmanCode;

                              return (
                                <label key={salesman._id || salesmanCode} className="party-check-row">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(event) => {
                                      setProductReportFilters((prev) => {
                                        const currentValues = prev.selectedSalesmanCodes || [];
                                        const nextValues = event.target.checked
                                          ? [...new Set([...currentValues, salesmanCode])]
                                          : currentValues.filter((code) => code !== salesmanCode);
                                        return { ...prev, selectedSalesmanCodes: nextValues };
                                      });
                                      setIsProductReportGenerated(false);
                                      setProductReportRows([]);
                                    }}
                                  />
                                  <span className="party-check-name">{salesmanName}</span>
                                </label>
                              );
                            })
                          ) : (
                            <div className="party-selector-empty">No salesmen found</div>
                          )}
                        </div>

                        <div className="party-selection-modal-footer">
                          <span>{productReportFilters.selectedSalesmanCodes.length} salesman(s) selected</span>
                          <button
                            type="button"
                            onClick={() => {
                              setProductReportFilters((prev) => ({
                                ...prev,
                                selectedSalesman: "no",
                                selectedSalesmanCodes: [],
                              }));
                            }}
                          >
                            <Check size={13} /> Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showProductSelector && (
                    <div
                      className="party-selection-backdrop"
                      onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                          setShowProductSelector(false);
                        }
                      }}
                    >
                      <div className="party-selection-modal party-selection-modal-large">
                        <div className="party-selection-modal-header">
                          <div>
                            <strong>Select Products</strong>
                            <span>
                              {productReportFilters.selectedProductCodes?.length || 0} Selected
                            </span>
                          </div>
                          <button type="button" onClick={() => setShowProductSelector(false)}>
                            <X size={15} />
                          </button>
                        </div>

                        <div className="party-selector-search">
                          <Search size={13} />
                          <input
                            type="text"
                            value={productSelectorSearch}
                            placeholder="Search products by code or name..."
                            onChange={(event) => setProductSelectorSearch(event.target.value)}
                            autoFocus
                          />
                        </div>

                        <div className="party-selector-sort-label">
                          <span>Sort by Name (A-Z)</span>
                        </div>

                        <label className="party-check-row party-check-all">
                          <input
                            type="checkbox"
                            checked={
                              productOptionSource.length > 0 &&
                              productReportFilters.selectedProductCodes?.length === productOptionSource.length
                            }
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setProductReportFilters((prev) => ({
                                ...prev,
                                selectedProductCodes: checked
                                  ? productOptionSource.map((p, index) => getProductOptionCode(p, index))
                                  : [],
                              }));
                              setIsProductReportGenerated(false);
                              setProductReportRows([]);
                            }}
                          />
                          <span>Select All Products</span>
                        </label>

                        <div className="party-checkbox-list modern-product-list">
                          {productOptionSource.length > 0 ? (
                            productOptionSource.map((product, index) => {
                              const productCode = getProductOptionCode(product, index);
                              const isChecked = productReportFilters.selectedProductCodes?.includes(productCode) || false;
                              const productName = getProductOptionName(product) || productCode;

                              return (
                                <label key={product._id || productCode} className={`party-card ${isChecked ? "selected" : ""}`}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(event) => {
                                      setProductReportFilters((prev) => {
                                        const currentValues = prev.selectedProductCodes || [];
                                        const nextValues = event.target.checked
                                          ? [...new Set([...currentValues, productCode])]
                                          : currentValues.filter((code) => code !== productCode);
                                        return { ...prev, selectedProductCodes: nextValues };
                                      });
                                      setIsProductReportGenerated(false);
                                      setProductReportRows([]);
                                    }}
                                  />
                                  <div className="party-card-details">
                                    <div className="party-card-header">
                                      <span className="party-name">{productName}</span>
                                      <span className="party-code">{productCode}</span>
                                    </div>
                                  </div>
                                </label>
                              );
                            })
                          ) : (
                            <div className="party-selector-empty">
                              {isProductCriteriaLoading ? "Loading products..." : "No products found"}
                            </div>
                          )}
                        </div>

                        <div className="party-selection-modal-footer">
                          <span>
                            {productReportFilters.selectedProductCodes?.length || 0} product(s) selected
                          </span>
                          <button type="button" onClick={() => setShowProductSelector(false)}>
                            <Check size={13} /> Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </fieldset>
              </div>

              {productReportError && (
                <div className="party-report-error" role="alert">
                  {productReportError}
                </div>
              )}

              <div className="party-report-results">
                <div className="party-result-caption">Report Results</div>

                <div className="party-report-toolbar">
                  <div className="party-grid-heading">
                    <div className="party-grid-heading-icon">
                      <PackageSearch size={17} />
                    </div>
                    <div>
                      <strong>Report Results</strong>
                      <span>
                        {isProductReportGenerated
                          ? `${filteredProductReportRows.length} records found`
                          : "Generate the report to view results"}
                      </span>
                    </div>
                  </div>

                  <div className="party-grid-toolbar-actions">
                    <div className="party-report-search">
                      <Search size={15} />
                      <input
                        type="text"
                        value={productReportSearch}
                        onChange={(event) => {
                          setProductReportSearch(event.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Search in results..."
                      />
                      {productReportSearch.trim() !== "" && (
                        <button
                          type="button"
                          className="party-grid-search-clear"
                          onClick={() => {
                            setProductReportSearch("");
                            setCurrentPage(1);
                          }}
                          title="Clear search"
                          aria-label="Clear search"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <select
                      className="party-grid-zoom-select"
                      value={productReportZoom}
                      onChange={(event) => setProductReportZoom(event.target.value)}
                      title="Grid zoom"
                    >
                      <option value="75">75%</option>
                      <option value="90">90%</option>
                      <option value="100">100%</option>
                      <option value="125">125%</option>
                      <option value="150">150%</option>
                    </select>

                    <button
                      type="button"
                      className="party-grid-refresh-button"
                      onClick={generateProductSalesReport}
                      disabled={isProductReportLoading}
                      title="Refresh report"
                    >
                      <RefreshCw size={15} />
                    </button>

                    <div className="party-toolbar-export">
                      <button
                        type="button"
                        className="party-export-excel"
                        onClick={exportProductReportToExcel}
                        disabled={!isProductReportGenerated || filteredProductReportRows.length === 0}
                      >
                        <FileSpreadsheet size={15} /> Excel
                      </button>

                      <button
                        type="button"
                        className="party-export-csv"
                        onClick={exportProductReportToCsv}
                        disabled={!isProductReportGenerated || filteredProductReportRows.length === 0}
                      >
                        <Download size={15} /> CSV
                      </button>

                      <button
                        type="button"
                        className="party-export-pdf"
                        onClick={exportProductReportToPdf}
                        disabled={!isProductReportGenerated || filteredProductReportRows.length === 0}
                      >
                        <FileText size={15} /> PDF
                      </button>

                      <button
                        type="button"
                        className="party-export-print"
                        onClick={printProductReport}
                        disabled={!isProductReportGenerated || filteredProductReportRows.length === 0}
                      >
                        <Printer size={15} /> Print
                      </button>
                    </div>
                  </div>
                </div>

                <div className="party-report-grid-container">
                  {!isProductReportGenerated ? (
                    <div className="party-empty-report">
                      <PackageSearch size={40} />
                      <strong>No report generated</strong>
                      <span>Select the required report filters and click Generate.</span>
                    </div>
                  ) : (
                    <div
                      className="party-report-zoom"
                      style={{ zoom: Number(productReportZoom) / 100 }}
                    >
                      <table className="party-report-table" style={{ width: '100%', minWidth: '1200px' }}>
                        <thead>
                          <tr>
                            <th style={{ minWidth: '50px' }}>SrNo.</th>
                            <th style={{ minWidth: '100px' }}>Bill Date</th>
                            <th style={{ minWidth: '80px' }}>Bill Series</th>
                            <th style={{ minWidth: '70px' }}>Bill No</th>
                            <th style={{ minWidth: '100px' }}>Party Code</th>
                            <th style={{ minWidth: '180px' }}>Party Name</th>
                            <th style={{ minWidth: '80px' }} className="party-report-number">Rate</th>
                            <th style={{ minWidth: '80px' }} className="party-report-number">MRP</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Qty</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Free Qty</th>
                            <th style={{ minWidth: '90px' }} className="party-report-number">AMT</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Weight</th>
                            <th style={{ minWidth: '80px' }} className="party-report-number">TPR AMT</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Disc</th>
                            <th style={{ minWidth: '80px' }} className="party-report-number">CD AMT</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">CD %</th>
                            <th style={{ minWidth: '130px' }}>Branch Name</th>
                            <th style={{ minWidth: '200px' }}>Address</th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredProductReportRows.map((row, rowIndex) => (
                            <tr key={row.rowId || rowIndex}>
                              <td style={{ textAlign: 'center' }}>{row.SrNo || rowIndex + 1}</td>
                              <td>{formatPartyReportValue({ key: 'BillDate' }, row.BillDate || row.billDate)}</td>
                              <td>{row.BillSeries || row.billSeries || ''}</td>
                              <td style={{ textAlign: 'center' }}>{row.BillNo ?? row.billNo ?? ''}</td>
                              <td>{row.PartyCode || row.partyCode || ''}</td>
                              <td>{row.PartyName || row.partyName || ''}</td>
                              <td className="party-report-number">{formatReportNumber(row.Rate || row.salesRate || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.MRP || row.mrp || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Qty || row.qty || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.FreeQty || row.freeQty || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.AMT || row.amount || row.grossAmount || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Weight || row.weight || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.TPRAMT || row.tprAmount || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Disc || row.discount || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.CDAMT || row.cashDiscountAmount || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.CDPercent || row.cdPercent || 0)}</td>
                              <td>{row.BranchName || row.companyName || ''}</td>
                              <td>{row.Address || ''}</td>
                            </tr>
                          ))}
                        </tbody>

                        {filteredProductReportRows.length > 0 && (
                          <tfoot>
                            <tr>
                              <td colSpan="6" style={{ fontWeight: 'bold', textAlign: 'right' }}>TOTAL</td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(productReportTotals.Rate || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(productReportTotals.MRP || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(productReportTotals.Qty || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(productReportTotals.FreeQty || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(productReportTotals.AMT || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(productReportTotals.Weight || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(productReportTotals.TPRAMT || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(productReportTotals.Disc || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(productReportTotals.CDAMT || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(productReportTotals.CDPercent || 0)}
                              </td>
                              <td colSpan="2"></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>

                <div className="party-report-statusbar">
                  <span>
                    Records: {isProductReportGenerated ? filteredProductReportRows.length : 0}
                  </span>
                  <span>
                    Period: {productReportFilters.fromDate || "--"} to {productReportFilters.toDate || "--"}
                  </span>
                </div>
              </div>
            </main>

            <aside className="party-report-sidebar">
              <section className="party-sidebar-card">
                <div className="party-sidebar-card-title">
                  <PackageSearch size={18} />
                  <strong>Quick Summary</strong>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><PackageSearch size={17} /></span>
                  <div>
                    <small>Total Records</small>
                    <strong>{filteredProductReportRows.length.toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><ShoppingCart size={17} /></span>
                  <div>
                    <small>Total Quantity</small>
                    <strong>{formatReportNumber(productReportTotals.Qty || 0)}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><BarChart3 size={17} /></span>
                  <div>
                    <small>Total Amount</small>
                    <strong>₹ {formatReportNumber(productReportTotals.AMT || 0)}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><FileText size={17} /></span>
                  <div>
                    <small>Total Products</small>
                    <strong>
                      {new Set(
                        filteredProductReportRows
                          .map((row) => row.productCode || row.ProductCode)
                          .filter(Boolean)
                      ).size}
                    </strong>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // ALL PRODUCT WISE SALES REPORT - RENDER (SIMPLIFIED)
  // =========================================================
  if (selectedReport === "All Product Wise Sales Report") {
    const productOptionSource =
      reportProductList.length > 0 ? reportProductList : productOptionList;

    const generateAllProductWiseSalesReport = async () => {
      try {
        setAllProductReportError("");
        setAllProductReportRows([]);
        setAllProductReportColumns([]);

        const { distributorId, firmId } = getLoggedInContext();

        if (!distributorId || !firmId) {
          throw new Error("Distributor or firm information is missing. Please login again.");
        }

        if (!allProductReportFilters.fromDate || !allProductReportFilters.toDate) {
          throw new Error("From Date and To Date are required.");
        }

        if (allProductReportFilters.fromDate > allProductReportFilters.toDate) {
          throw new Error("From Date cannot be greater than To Date.");
        }

        setIsAllProductReportLoading(true);

        const query = new URLSearchParams({
          distributorId,
          firmId,
          companyCode: allProductReportFilters.company || "",
          fromDate: allProductReportFilters.fromDate,
          toDate: allProductReportFilters.toDate,
          orderBy: allProductReportFilters.orderBy || "productName",
          showZeroSales: allProductReportFilters.showZeroSales || "no",
          reportLevel: allProductReportFilters.reportLevel || "units",
          valuationBy: allProductReportFilters.valuationBy || "basicRate",
          salesType: allProductReportFilters.salesType || "onlySales",
          billWiseSalesman: allProductReportFilters.billWiseSalesman || "no",
          withCreditNote: allProductReportFilters.withCreditNote || "no",
        });

        if (allProductReportFilters.selectedArea === "yes" && allProductReportFilters.selectedAreaCodes.length > 0) {
          query.set("selectedAreaCodes", allProductReportFilters.selectedAreaCodes.join(","));
        }

        if (allProductReportFilters.selectedSalesman === "yes" && allProductReportFilters.selectedSalesmanCodes.length > 0) {
          query.set("selectedSalesmanCodes", allProductReportFilters.selectedSalesmanCodes.join(","));
        }

        const response = await fetch(
          `${API_BASE_URL}/api/reports/all-product-wise-sales?${query.toString()}`
        );

        const contentType = response.headers.get("content-type") || "";
        const result = contentType.includes("application/json")
          ? await response.json()
          : {
              success: false,
              message: await response.text(),
            };

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to generate all product wise sales report.");
        }

        const data = Array.isArray(result.data) ? result.data : [];

        const rows = data.map((row, index) => ({
          rowId: row._id || `row-${index}`,
          SrNo: row.SrNo || index + 1,
          ProductName: row.ProductName || "",
          ProductCode: row.ProductCode || "",
          LocalProduct: row.LocalProduct || "",
          Batch: row.Batch || "",
          MRP: Number(row.MRP || 0),
          Rate: Number(row.Rate || 0),
          Qty: Number(row.Qty || 0),
          FreeQty: Number(row.FreeQty || 0),
          Amount: Number(row.Amount || 0),
          Disc: Number(row.Disc || 0),
          OtherDisc: Number(row.OtherDisc || 0),
          Valuation: Number(row.Valuation || 0),
          Weight: Number(row.Weight || 0),
          BillCuts: Number(row.BillCuts || 0),
          Outlets: Number(row.Outlets || 0),
          VatAmt: Number(row.VatAmt || 0),
          Cess1: Number(row.Cess1 || 0),
          Cess2: Number(row.Cess2 || 0),
          BasicRate: Number(row.BasicRate || 0),
          Difference: Number(row.Difference || 0),
          BillDate: row.BillDate || "",
          BillSeries: row.BillSeries || "",
          BillNo: row.BillNo ?? "",
          PartyCode: row.PartyCode || "",
          PartyName: row.PartyName || "",
          CompanyName: row.CompanyName || "",
          SalesmanName: row.SalesmanName || "",
          AreaName: row.AreaName || "",
          Godown: row.Godown || "",
        }));

        const columns = [
          { key: "SrNo", label: "SRNo", type: "number" },
          { key: "ProductName", label: "Product Name", type: "string" },
          { key: "LocalProduct", label: "Local Product", type: "string" },
          { key: "Batch", label: "Batch", type: "string" },
          { key: "MRP", label: "MRP", type: "number" },
          { key: "Rate", label: "Rate", type: "number" },
          { key: "Qty", label: "Qty", type: "number" },
          { key: "FreeQty", label: "Free Qty", type: "number" },
          { key: "Amount", label: "Amount", type: "number" },
          { key: "Disc", label: "Disc", type: "number" },
          { key: "OtherDisc", label: "OtherDisc", type: "number" },
          { key: "Valuation", label: "Valuation", type: "number" },
          { key: "Weight", label: "Kg", type: "number" },
          { key: "BillCuts", label: "BillCuts", type: "number" },
          { key: "Outlets", label: "Outlets", type: "number" },
          { key: "VatAmt", label: "VatAmt", type: "number" },
          { key: "Cess1", label: "Cess1", type: "number" },
          { key: "Cess2", label: "Cess2", type: "number" },
          { key: "BasicRate", label: "Basic Rate", type: "number" },
          { key: "Difference", label: "Difference", type: "number" },
        ];

        setAllProductReportRows(rows);
        setAllProductReportColumns(columns);
        setIsAllProductReportGenerated(true);

        if (rows.length === 0) {
          setAllProductReportError("No product sales records were found for the selected criteria.");
        }
      } catch (error) {
        console.error("All product wise sales report generation error:", error);
        setAllProductReportRows([]);
        setAllProductReportColumns([]);
        setIsAllProductReportGenerated(false);
        setAllProductReportError(error.message || "Failed to generate all product wise sales report.");
      } finally {
        setIsAllProductReportLoading(false);
      }
    };

    const formatAllProductReportValue = (column, value) => {
      if (value === undefined || value === null || value === "") return "";
      if (column.type === "number") {
        return formatReportNumber(value);
      }
      return String(value);
    };

    const allProductTotalPages = Math.max(
      1,
      Math.ceil(filteredAllProductReportRows.length / allPartyRowsPerPage)
    );
    const allProductSafeCurrentPage = Math.min(allPartyCurrentPage, allProductTotalPages);
    const allProductPageStart = (allProductSafeCurrentPage - 1) * allPartyRowsPerPage;
    const allProductPageRows = filteredAllProductReportRows.slice(
      allProductPageStart,
      allProductPageStart + allPartyRowsPerPage
    );

    return (
      <div className="party-classic-report-page">
        <div className="party-classic-report-window">
          <div className="party-classic-titlebar">
            <div className="party-report-title-left">
              <button
                type="button"
                className="party-title-back"
                onClick={onBack}
                title="Back to reports"
                aria-label="Back to reports"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="party-title-icon">
                <FileBarChart size={21} />
              </div>

              <div className="party-title-content">
                <span>Sales Report</span>
                <h1>All Product Wise Sales Report</h1>
                <p>Consolidated product-wise sales covering all products</p>
              </div>
            </div>

            <div className="party-title-actions">
              <button
                type="button"
                className="party-title-secondary-button"
                title="Clear current filters"
                onClick={clearAllProductSalesFilters}
              >
                <RefreshCw size={15} />
                Reset Filter
              </button>

              <button
                type="button"
                className="party-title-generate-button"
                onClick={generateAllProductWiseSalesReport}
                disabled={isAllProductReportLoading}
              >
                {isAllProductReportLoading ? (
                  <RefreshCw size={16} className="party-spinning-icon" />
                ) : (
                  <FileBarChart size={16} />
                )}
                {isAllProductReportLoading ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>

          <div className="party-report-content-layout">
            <main className="party-report-main-column">
              <div className="party-report-filter-panel">
                <fieldset className="party-filter-group">
                  <legend>
                    <span className="party-filter-legend-icon">
                      <FileBarChart size={15} />
                    </span>
                    Report Filters
                  </legend>

                  <div className="party-report-form-grid-two-rows">
                    <div className="party-report-form-row">
                      <div className="party-report-field">
                        <label>Company</label>
                        <select
                          value={allProductReportFilters.company}
                          onChange={(event) =>
                            updateAllProductReportFilter("company", event.target.value)
                          }
                        >
                          <option value="">All Companies</option>
                          {reportCompanies.map((company, index) => {
                            const companyCode = getCompanyCode(company, index);
                            const companyName = getCompanyName(company) || companyCode;
                            return (
                              <option key={company._id || companyCode} value={companyCode}>
                                {companyName}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="party-report-field">
                        <label>Selected Area</label>
                        <select
                          value={allProductReportFilters.selectedArea}
                          onChange={(event) => {
                            const value = event.target.value;
                            setAllProductReportFilters((prev) => ({
                              ...prev,
                              selectedArea: value,
                              selectedAreaCodes: value === "yes" ? prev.selectedAreaCodes : [],
                            }));
                            if (value === "yes") {
                              setShowAllAreaSelector(true);
                            } else {
                              setShowAllAreaSelector(false);
                            }
                            setAllProductReportRows([]);
                            setIsAllProductReportGenerated(false);
                          }}
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>

                      <div className="party-report-field">
                        <label>Selected Salesman</label>
                        <select
                          value={allProductReportFilters.selectedSalesman}
                          onChange={(event) => {
                            const value = event.target.value;
                            setAllProductReportFilters((prev) => ({
                              ...prev,
                              selectedSalesman: value,
                              selectedSalesmanCodes: value === "yes" ? prev.selectedSalesmanCodes : [],
                            }));
                            if (value === "yes") {
                              setShowAllSalesmanSelector(true);
                            } else {
                              setShowAllSalesmanSelector(false);
                            }
                            setAllProductReportRows([]);
                            setIsAllProductReportGenerated(false);
                          }}
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>

                      <div className="party-report-field">
                        <label>Bill Wise Salesman</label>
                        <select
                          value={allProductReportFilters.billWiseSalesman}
                          onChange={(event) =>
                            updateAllProductReportFilter("billWiseSalesman", event.target.value)
                          }
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    </div>

                    <div className="party-report-form-row">
                      <div className="party-report-field">
                        <label>From Date</label>
                        <input
                          type="date"
                          value={allProductReportFilters.fromDate}
                          onChange={(event) =>
                            updateAllProductReportFilter("fromDate", event.target.value)
                          }
                        />
                      </div>

                      <div className="party-report-field">
                        <label>To Date</label>
                        <input
                          type="date"
                          value={allProductReportFilters.toDate}
                          onChange={(event) =>
                            updateAllProductReportFilter("toDate", event.target.value)
                          }
                        />
                      </div>

                      <div className="party-report-field">
                        <label>Report Level</label>
                        <select
                          value={allProductReportFilters.reportLevel}
                          onChange={(event) =>
                            updateAllProductReportFilter("reportLevel", event.target.value)
                          }
                        >
                          <option value="units">Units</option>
                          <option value="amount">Amount</option>
                          <option value="details">Details</option>
                        </select>
                      </div>

                      <div className="party-report-field">
                        <label>Order By</label>
                        <select
                          value={allProductReportFilters.orderBy}
                          onChange={(event) =>
                            updateAllProductReportFilter("orderBy", event.target.value)
                          }
                        >
                          <option value="productName">Name Wise</option>
                          <option value="productCode">Code Wise</option>
                          <option value="amount">Amount Wise</option>
                          <option value="qty">Qty Wise</option>
                          <option value="rate">Rate Wise</option>
                        </select>
                      </div>

                      <div className="party-report-field">
                        <label>Show Zero Sales</label>
                        <select
                          value={allProductReportFilters.showZeroSales}
                          onChange={(event) =>
                            updateAllProductReportFilter("showZeroSales", event.target.value)
                          }
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {showAllAreaSelector && (
                  <div
                    className="party-selection-backdrop"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        setShowAllAreaSelector(false);
                      }
                    }}
                  >
                    <div className="party-selection-modal">
                      <div className="party-selection-modal-header">
                        <div>
                          <strong>Select Area</strong>
                          <span>Only company-mapped areas</span>
                        </div>
                        <button type="button" onClick={() => setShowAllAreaSelector(false)}>
                          <X size={15} />
                        </button>
                      </div>

                      <div className="party-selector-search">
                        <Search size={13} />
                        <input
                          type="text"
                          value={allAreaSelectorSearch}
                          placeholder="Search area name..."
                          onChange={(event) => setAllAreaSelectorSearch(event.target.value)}
                        />
                      </div>

                      <label className="party-check-row party-check-all">
                        <input
                          type="checkbox"
                          checked={
                            mappedAreas.length > 0 &&
                            allProductReportFilters.selectedAreaCodes.length === mappedAreas.length
                          }
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setAllProductReportFilters((prev) => ({
                              ...prev,
                              selectedAreaCodes: checked
                                ? mappedAreas.map((area, index) => getAreaCode(area, index))
                                : [],
                            }));
                            setAllProductReportRows([]);
                            setIsAllProductReportGenerated(false);
                          }}
                        />
                        <span>Select All Areas</span>
                      </label>

                      <div className="party-checkbox-list">
                        {mappedAreas.length > 0 ? (
                          mappedAreas.map((area, index) => {
                            const areaCode = getAreaCode(area, index);
                            const isChecked = allProductReportFilters.selectedAreaCodes.includes(areaCode);

                            return (
                              <label key={area._id || areaCode} className="party-check-row">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(event) => {
                                    setAllProductReportFilters((prev) => {
                                      const currentValues = prev.selectedAreaCodes || [];
                                      const nextValues = event.target.checked
                                        ? [...new Set([...currentValues, areaCode])]
                                        : currentValues.filter((code) => code !== areaCode);
                                      return { ...prev, selectedAreaCodes: nextValues };
                                    });
                                    setAllProductReportRows([]);
                                    setIsAllProductReportGenerated(false);
                                  }}
                                />
                                <span className="party-check-name">
                                  {getAreaName(area) || "Unnamed Area"}
                                </span>
                              </label>
                            );
                          })
                        ) : (
                          <div className="party-selector-empty">No mapped area found.</div>
                        )}
                      </div>

                      <div className="party-selection-modal-footer">
                        <span>{allProductReportFilters.selectedAreaCodes.length} area(s) selected</span>
                        <button type="button" onClick={() => setShowAllAreaSelector(false)}>
                          <Check size={13} /> Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showAllSalesmanSelector && (
                  <div
                    className="party-selection-backdrop"
                    onMouseDown={(event) => {
                      if (event.target === event.currentTarget) {
                        setShowAllSalesmanSelector(false);
                      }
                    }}
                  >
                    <div className="party-selection-modal">
                      <div className="party-selection-modal-header">
                        <div>
                          <strong>Select Salesman</strong>
                          <span>Only company-mapped salesmen</span>
                        </div>
                        <button type="button" onClick={() => setShowAllSalesmanSelector(false)}>
                          <X size={15} />
                        </button>
                      </div>

                      <div className="party-selector-search">
                        <Search size={13} />
                        <input
                          type="text"
                          value={allSalesmanSelectorSearch}
                          placeholder="Search salesman name..."
                          onChange={(event) => setAllSalesmanSelectorSearch(event.target.value)}
                        />
                      </div>

                      <label className="party-check-row party-check-all">
                        <input
                          type="checkbox"
                          checked={
                            mappedSalesmen.length > 0 &&
                            allProductReportFilters.selectedSalesmanCodes.length === mappedSalesmen.length
                          }
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setAllProductReportFilters((prev) => ({
                              ...prev,
                              selectedSalesmanCodes: checked
                                ? mappedSalesmen.map((salesman, index) => getSalesmanCode(salesman, index))
                                : [],
                            }));
                            setAllProductReportRows([]);
                            setIsAllProductReportGenerated(false);
                          }}
                        />
                        <span>Select All Salesmen</span>
                      </label>

                      <div className="party-checkbox-list">
                        {mappedSalesmen.length > 0 ? (
                          mappedSalesmen.map((salesman, index) => {
                            const salesmanCode = getSalesmanCode(salesman, index);
                            const isChecked = allProductReportFilters.selectedSalesmanCodes.includes(salesmanCode);

                            return (
                              <label key={salesman._id || salesmanCode} className="party-check-row">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(event) => {
                                    setAllProductReportFilters((prev) => {
                                      const currentValues = prev.selectedSalesmanCodes || [];
                                      const nextValues = event.target.checked
                                        ? [...new Set([...currentValues, salesmanCode])]
                                        : currentValues.filter((code) => code !== salesmanCode);
                                      return { ...prev, selectedSalesmanCodes: nextValues };
                                    });
                                    setAllProductReportRows([]);
                                    setIsAllProductReportGenerated(false);
                                  }}
                                />
                                <span className="party-check-name">
                                  {getSalesmanName(salesman) || "Unnamed Salesman"}
                                </span>
                              </label>
                            );
                          })
                        ) : (
                          <div className="party-selector-empty">No mapped salesman found.</div>
                        )}
                      </div>

                      <div className="party-selection-modal-footer">
                        <span>
                          {allProductReportFilters.selectedSalesmanCodes.length} salesman(s) selected
                        </span>
                        <button type="button" onClick={() => setShowAllSalesmanSelector(false)}>
                          <Check size={13} /> Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {allProductReportError && (
                <div className="party-report-error" role="alert">
                  {allProductReportError}
                </div>
              )}

              <div className="party-report-results">
                <div className="party-result-caption">Report Results</div>

                <div className="party-report-toolbar">
                  <div className="party-grid-heading">
                    <div className="party-grid-heading-icon">
                      <FileBarChart size={17} />
                    </div>
                    <div>
                      <strong>Report Results</strong>
                      <span>
                        {isAllProductReportGenerated
                          ? `${filteredAllProductReportRows.length} records found`
                          : "Generate the report to view results"}
                      </span>
                    </div>
                  </div>

                  <div className="party-grid-toolbar-actions">
                    <div className="party-report-search">
                      <Search size={15} />
                      <input
                        type="text"
                        value={allProductReportSearch}
                        onChange={(event) => setAllProductReportSearch(event.target.value)}
                        placeholder="Search in results..."
                      />
                      {allProductReportSearch.trim() !== "" && (
                        <button
                          type="button"
                          className="party-grid-search-clear"
                          onClick={() => setAllProductReportSearch("")}
                          title="Clear search"
                          aria-label="Clear search"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <select
                      className="party-grid-zoom-select"
                      value={allProductReportZoom}
                      onChange={(event) => setAllProductReportZoom(event.target.value)}
                      title="Grid zoom"
                    >
                      <option value="75">75%</option>
                      <option value="90">90%</option>
                      <option value="100">100%</option>
                      <option value="125">125%</option>
                      <option value="150">150%</option>
                    </select>

                    <button
                      type="button"
                      className="party-grid-refresh-button"
                      onClick={generateAllProductWiseSalesReport}
                      disabled={isAllProductReportLoading}
                      title="Refresh report"
                    >
                      <RefreshCw size={15} />
                    </button>

                    <div className="party-toolbar-export">
                      <button
                        type="button"
                        className="party-export-excel"
                        onClick={exportAllProductReportToExcel}
                        disabled={!isAllProductReportGenerated || filteredAllProductReportRows.length === 0}
                      >
                        <FileSpreadsheet size={15} /> Excel
                      </button>

                      <button
                        type="button"
                        className="party-export-csv"
                        onClick={exportAllProductReportToCsv}
                        disabled={!isAllProductReportGenerated || filteredAllProductReportRows.length === 0}
                      >
                        <Download size={15} /> CSV
                      </button>

                      <button
                        type="button"
                        className="party-export-pdf"
                        onClick={exportAllProductReportToPdf}
                        disabled={!isAllProductReportGenerated || filteredAllProductReportRows.length === 0}
                      >
                        <FileText size={15} /> PDF
                      </button>

                      <button
                        type="button"
                        className="party-export-print"
                        onClick={printAllProductReport}
                        disabled={!isAllProductReportGenerated || filteredAllProductReportRows.length === 0}
                      >
                        <Printer size={15} /> Print
                      </button>
                    </div>
                  </div>
                </div>

                <div className="party-report-grid-container">
                  {!isAllProductReportGenerated ? (
                    <div className="party-empty-report">
                      <FileBarChart size={40} />
                      <strong>No report generated</strong>
                      <span>Select the required report filters and click Generate.</span>
                    </div>
                  ) : (
                    <div
                      className="party-report-zoom"
                      style={{ zoom: Number(allProductReportZoom) / 100 }}
                    >
                      <table className="party-report-table" style={{ width: '100%', minWidth: '1800px' }}>
                        <thead>
                          <tr>
                            <th style={{ minWidth: '50px' }}>SRNo</th>
                            <th style={{ minWidth: '180px' }}>Product Name</th>
                            <th style={{ minWidth: '120px' }}>Local Product</th>
                            <th style={{ minWidth: '80px' }}>Batch</th>
                            <th style={{ minWidth: '80px' }} className="party-report-number">MRP</th>
                            <th style={{ minWidth: '80px' }} className="party-report-number">Rate</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Qty</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Free Qty</th>
                            <th style={{ minWidth: '90px' }} className="party-report-number">Amount</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Disc</th>
                            <th style={{ minWidth: '80px' }} className="party-report-number">OtherDisc</th>
                            <th style={{ minWidth: '90px' }} className="party-report-number">Valuation</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Kg</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">BillCuts</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Outlets</th>
                            <th style={{ minWidth: '80px' }} className="party-report-number">VatAmt</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Cess1</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Cess2</th>
                            <th style={{ minWidth: '80px' }} className="party-report-number">Basic Rate</th>
                            <th style={{ minWidth: '80px' }} className="party-report-number">Difference</th>
                          </tr>
                        </thead>

                        <tbody>
                          {allProductPageRows.map((row, rowIndex) => (
                            <tr key={row.rowId || rowIndex}>
                              <td style={{ textAlign: 'center' }}>{row.SrNo || rowIndex + 1}</td>
                              <td>{row.ProductName || ''}</td>
                              <td>{row.LocalProduct || ''}</td>
                              <td>{row.Batch || ''}</td>
                              <td className="party-report-number">{formatReportNumber(row.MRP || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Rate || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Qty || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.FreeQty || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Amount || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Disc || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.OtherDisc || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Valuation || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Weight || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.BillCuts || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Outlets || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.VatAmt || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Cess1 || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Cess2 || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.BasicRate || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Difference || 0)}</td>
                            </tr>
                          ))}
                        </tbody>

                        {filteredAllProductReportRows.length > 0 && (
                          <tfoot>
                            <tr>
                              <td style={{ fontWeight: 'bold', textAlign: 'center' }}>TOTAL</td>
                              <td></td>
                              <td></td>
                              <td></td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.MRP || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.Rate || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.Qty || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.FreeQty || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.Amount || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.Disc || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.OtherDisc || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.Valuation || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.Weight || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.BillCuts || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.Outlets || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.VatAmt || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.Cess1 || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.Cess2 || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.BasicRate || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(allProductReportTotals.Difference || 0)}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>

                <div className="party-report-statusbar">
                  <span>
                    Records: {isAllProductReportGenerated ? filteredAllProductReportRows.length : 0}
                  </span>
                  <span>
                    Level: {allProductReportFilters.reportLevel === "details" ? "Details" : 
                      allProductReportFilters.reportLevel === "amount" ? "Amount" : "Units"}
                  </span>
                  <span>
                    Period: {allProductReportFilters.fromDate || "--"} to {allProductReportFilters.toDate || "--"}
                  </span>
                </div>
              </div>
            </main>

            <aside className="party-report-sidebar">
              <section className="party-sidebar-card">
                <div className="party-sidebar-card-title">
                  <FileBarChart size={18} />
                  <strong>Quick Summary</strong>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><FileBarChart size={17} /></span>
                  <div>
                    <small>Total Records</small>
                    <strong>{filteredAllProductReportRows.length.toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><ShoppingCart size={17} /></span>
                  <div>
                    <small>Total Quantity</small>
                    <strong>{formatReportNumber(allProductReportTotals.Qty || 0)}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><BarChart3 size={17} /></span>
                  <div>
                    <small>Gross Amount</small>
                    <strong>₹ {formatReportNumber(allProductReportTotals.Amount || 0)}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><FileText size={17} /></span>
                  <div>
                    <small>Net Amount</small>
                    <strong>₹ {formatReportNumber(allProductReportTotals.Valuation || 0)}</strong>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // COMPANY WISE PURCHASE REPORT - MODERN RENDER
  // =========================================================
  if (selectedReport === "Company Wise Purchase Report") {
    return (
      <div className="party-classic-report-page">
        <div className="party-classic-report-window">
          <div className="party-classic-titlebar">
            <div className="party-report-title-left">
              <button
                type="button"
                className="party-title-back"
                onClick={onBack}
                title="Back to reports"
                aria-label="Back to reports"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="party-title-icon">
                <Building2 size={21} />
              </div>

              <div className="party-title-content">
                <span>Purchase Report</span>
                <h1>Company Wise Purchase Report</h1>
                <p>Detailed company-wise purchase analysis with supplier and product-wise options</p>
              </div>
            </div>

            <div className="party-title-actions">
              <button
                type="button"
                className="party-title-secondary-button"
                title="Clear current filters"
                onClick={clearCompanyPurchaseFilters}
              >
                <RefreshCw size={15} />
                Reset Filter
              </button>

              <button
                type="button"
                className="party-title-generate-button"
                onClick={generateCompanyPurchaseReport}
                disabled={isCompanyPurchaseLoading || isPurchaseCriteriaLoading}
              >
                {isCompanyPurchaseLoading ? (
                  <RefreshCw size={16} className="party-spinning-icon" />
                ) : (
                  <Building2 size={16} />
                )}
                {isCompanyPurchaseLoading ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>

          <div className="party-report-content-layout">
            <main className="party-report-main-column">
              <div className="party-report-filter-panel">
                <fieldset className="party-filter-group">
                  <legend>
                    <span className="party-filter-legend-icon">
                      <Building2 size={15} />
                    </span>
                    Report Filters
                  </legend>

                  <div className="party-report-form-grid-two-rows">
                    <div className="party-report-form-row">
                      <div className="party-report-field">
                        <label>Company</label>
                        <select
                          value={companyPurchaseFilters.company}
                          disabled={isPurchaseCriteriaLoading}
                          onChange={(event) => {
                            const value = event.target.value;
                            setCompanyPurchaseFilters((prev) => ({
                              ...prev,
                              company: value,
                              selectedSupplierCodes: [],
                              selectedGodownCodes: [],
                            }));
                            setSupplierSelectorSearch("");
                            setGodownSelectorSearch("");
                            setShowSupplierSelector(false);
                            setShowGodownSelector(false);
                            setCompanyPurchaseRows([]);
                            setIsCompanyPurchaseGenerated(false);
                            loadCompanyPurchaseCriteria(value);
                          }}
                        >
                          <option value="">All Companies</option>
                          {reportCompanies.map((company, index) => {
                            const companyCode = getCompanyCode(company, index);
                            const companyName = getCompanyName(company) || companyCode;
                            return (
                              <option key={company._id || companyCode} value={companyCode}>
                                {companyName}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="party-report-field party-field-wide">
                        <label>Supplier</label>
                        <div className="party-multi-select">
                          <button
                            type="button"
                            className="party-multi-select-trigger"
                            disabled={!companyPurchaseFilters.company && reportCompanies.length === 0}
                            onClick={() => {
                              if (!companyPurchaseFilters.company) {
                                setCompanyPurchaseError("Please select company first.");
                                return;
                              }
                              setShowSupplierSelector((prev) => !prev);
                              setCompanyPurchaseError("");
                            }}
                          >
                            <span>
                              {selectedSupplierNames.length > 0
                                ? selectedSupplierNames.join(", ")
                                : "Select suppliers..."}
                            </span>
                            <span>▼</span>
                          </button>
                        </div>
                      </div>

                      <div className="party-report-field">
                        <label>Godown</label>
                        <select
                          value={companyPurchaseFilters.godown}
                          onChange={(event) => {
                            const value = event.target.value;
                            setCompanyPurchaseFilters((prev) => ({
                              ...prev,
                              godown: value,
                              selectedGodownCodes: value === "yes" ? prev.selectedGodownCodes : [],
                            }));
                            if (value === "yes") {
                              setShowGodownSelector(true);
                            } else {
                              setShowGodownSelector(false);
                            }
                            setCompanyPurchaseRows([]);
                            setIsCompanyPurchaseGenerated(false);
                          }}
                        >
                          <option value="all">All Godowns</option>
                          <option value="yes">Select Godowns</option>
                        </select>
                      </div>

                      <div className="party-report-field">
                        <label>Report Level</label>
                        <select
                          value={companyPurchaseFilters.reportLevel}
                          onChange={(event) => {
                            const value = event.target.value;
                            setCompanyPurchaseFilters((prev) => ({
                              ...prev,
                              reportLevel: value,
                            }));
                            setCompanyPurchaseRows([]);
                            setIsCompanyPurchaseGenerated(false);
                          }}
                        >
                          <option value="summary">Summary</option>
                          <option value="details">Details</option>
                        </select>
                      </div>
                    </div>

                    <div className="party-report-form-row">
                      <div className="party-report-field">
                        <label>From Date</label>
                        <input
                          type="date"
                          value={companyPurchaseFilters.fromDate}
                          onChange={(event) =>
                            updateCompanyPurchaseFilter("fromDate", event.target.value)
                          }
                        />
                      </div>

                      <div className="party-report-field">
                        <label>To Date</label>
                        <input
                          type="date"
                          value={companyPurchaseFilters.toDate}
                          onChange={(event) =>
                            updateCompanyPurchaseFilter("toDate", event.target.value)
                          }
                        />
                      </div>

                      <div className="party-report-field">
                        <label>Product Wise</label>
                        <select
                          value={companyPurchaseFilters.productWise}
                          onChange={(event) =>
                            updateCompanyPurchaseFilter("productWise", event.target.value)
                          }
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>

                      <div className="party-report-field">
                        <label>Order By</label>
                        <select
                          value={companyPurchaseFilters.orderBy}
                          onChange={(event) =>
                            updateCompanyPurchaseFilter("orderBy", event.target.value)
                          }
                        >
                          <option value="companyName">Company Name</option>
                          <option value="supplierName">Supplier Name</option>
                          <option value="billDate">Bill Date</option>
                          <option value="productName">Product Name</option>
                          <option value="netAmount">Net Amount</option>
                        </select>
                      </div>

                      <div className="party-report-field">
                        <label>With Credit Note</label>
                        <select
                          value={companyPurchaseFilters.withCreditNote}
                          onChange={(event) =>
                            updateCompanyPurchaseFilter("withCreditNote", event.target.value)
                          }
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {showSupplierSelector && (
                    <div
                      className="party-selection-backdrop"
                      onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                          setShowSupplierSelector(false);
                        }
                      }}
                    >
                      <div className="party-selection-modal party-selection-modal-large">
                        <div className="party-selection-modal-header">
                          <div>
                            <strong>Select Suppliers</strong>
                            <span>
                              {companyPurchaseFilters.selectedSupplierCodes?.length || 0} Selected
                            </span>
                          </div>
                          <button type="button" onClick={() => setShowSupplierSelector(false)}>
                            <X size={15} />
                          </button>
                        </div>

                        <div className="party-selector-search">
                          <Search size={13} />
                          <input
                            type="text"
                            value={supplierSelectorSearch}
                            placeholder="Search suppliers by code or name..."
                            onChange={(event) => setSupplierSelectorSearch(event.target.value)}
                            autoFocus
                          />
                        </div>

                        <div className="party-selector-sort-label">
                          <span>Sort by Name (A-Z)</span>
                        </div>

                        <label className="party-check-row party-check-all">
                          <input
                            type="checkbox"
                            checked={
                              mappedParties.length > 0 &&
                              companyPurchaseFilters.selectedSupplierCodes?.length === mappedParties.length
                            }
                            onChange={(event) => toggleAllSuppliers(event.target.checked)}
                          />
                          <span>Select All Suppliers</span>
                        </label>

                        <div className="party-checkbox-list modern-product-list">
                          {visibleSupplierOptions.length > 0 ? (
                            visibleSupplierOptions.map((supplier, index) => {
                              const supplierCode = getSupplierCode(supplier, index);
                              const isChecked = companyPurchaseFilters.selectedSupplierCodes?.includes(supplierCode) || false;
                              const supplierName = getSupplierName(supplier) || supplierCode;

                              return (
                                <label key={supplier._id || supplierCode} className={`party-card ${isChecked ? "selected" : ""}`}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(event) =>
                                      toggleSupplierSelection(supplierCode, event.target.checked)
                                    }
                                  />
                                  <div className="party-card-details">
                                    <div className="party-card-header">
                                      <span className="party-name">{supplierName}</span>
                                      <span className="party-code">{supplierCode}</span>
                                    </div>
                                    <div className="party-card-footer">
                                      <span className="party-location">
                                        {supplier?.town || supplier?.city || ""}
                                      </span>
                                      <span className="party-phone">
                                        {supplier?.mobileNo || supplier?.phone || ""}
                                      </span>
                                    </div>
                                  </div>
                                </label>
                              );
                            })
                          ) : (
                            <div className="party-selector-empty">
                              {isPurchaseCriteriaLoading ? "Loading suppliers..." : "No suppliers found"}
                            </div>
                          )}
                        </div>

                        <div className="party-selection-modal-footer">
                          <span>
                            {companyPurchaseFilters.selectedSupplierCodes?.length || 0} supplier(s) selected
                          </span>
                          <button type="button" onClick={() => setShowSupplierSelector(false)}>
                            <Check size={13} /> Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showGodownSelector && (
                    <div
                      className="party-selection-backdrop"
                      onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                          setShowGodownSelector(false);
                        }
                      }}
                    >
                      <div className="party-selection-modal">
                        <div className="party-selection-modal-header">
                          <div>
                            <strong>Select Godowns</strong>
                            <span>
                              {companyPurchaseFilters.selectedGodownCodes?.length || 0} Selected
                            </span>
                          </div>
                          <button type="button" onClick={() => setShowGodownSelector(false)}>
                            <X size={15} />
                          </button>
                        </div>

                        <div className="party-selector-search">
                          <Search size={13} />
                          <input
                            type="text"
                            value={godownSelectorSearch}
                            placeholder="Search godowns..."
                            onChange={(event) => setGodownSelectorSearch(event.target.value)}
                            autoFocus
                          />
                        </div>

                        <label className="party-check-row party-check-all">
                          <input
                            type="checkbox"
                            checked={
                              godowns.length > 0 &&
                              companyPurchaseFilters.selectedGodownCodes?.length === godowns.length
                            }
                            onChange={(event) => toggleAllGodowns(event.target.checked)}
                          />
                          <span>Select All Godowns</span>
                        </label>

                        <div className="party-checkbox-list">
                          {visibleGodownOptions.length > 0 ? (
                            visibleGodownOptions.map((godown, index) => {
                              const godownCode = getGodownCode(godown, index);
                              const isChecked = companyPurchaseFilters.selectedGodownCodes?.includes(godownCode) || false;
                              const godownName = getGodownName(godown) || godownCode;

                              return (
                                <label key={godown._id || godownCode} className="party-check-row">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(event) =>
                                      toggleGodownSelection(godownCode, event.target.checked)
                                    }
                                  />
                                  <span className="party-check-name">{godownName}</span>
                                </label>
                              );
                            })
                          ) : (
                            <div className="party-selector-empty">
                              {isPurchaseCriteriaLoading ? "Loading godowns..." : "No godowns found"}
                            </div>
                          )}
                        </div>

                        <div className="party-selection-modal-footer">
                          <span>
                            {companyPurchaseFilters.selectedGodownCodes?.length || 0} godown(s) selected
                          </span>
                          <button type="button" onClick={() => setShowGodownSelector(false)}>
                            <Check size={13} /> Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </fieldset>
              </div>

              {companyPurchaseError && (
                <div className="party-report-error" role="alert">
                  {companyPurchaseError}
                </div>
              )}

              <div className="party-report-results">
                <div className="party-result-caption">Report Results</div>

                <div className="party-report-toolbar">
                  <div className="party-grid-heading">
                    <div className="party-grid-heading-icon">
                      <Building2 size={17} />
                    </div>
                    <div>
                      <strong>Report Results</strong>
                      <span>
                        {isCompanyPurchaseGenerated
                          ? `${filteredCompanyPurchaseRows.length} records found`
                          : "Generate the report to view results"}
                      </span>
                    </div>
                  </div>

                  <div className="party-grid-toolbar-actions">
                    <div className="party-report-search">
                      <Search size={15} />
                      <input
                        type="text"
                        value={companyPurchaseSearch}
                        onChange={(event) => {
                          setCompanyPurchaseSearch(event.target.value);
                          setCompanyPurchaseCurrentPage(1);
                        }}
                        placeholder="Search in results..."
                      />
                      {companyPurchaseSearch.trim() !== "" && (
                        <button
                          type="button"
                          className="party-grid-search-clear"
                          onClick={() => {
                            setCompanyPurchaseSearch("");
                            setCompanyPurchaseCurrentPage(1);
                          }}
                          title="Clear search"
                          aria-label="Clear search"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <select
                      className="party-grid-zoom-select"
                      value={companyPurchaseZoom}
                      onChange={(event) => setCompanyPurchaseZoom(event.target.value)}
                      title="Grid zoom"
                    >
                      <option value="75">75%</option>
                      <option value="90">90%</option>
                      <option value="100">100%</option>
                      <option value="125">125%</option>
                      <option value="150">150%</option>
                    </select>

                    <button
                      type="button"
                      className="party-grid-refresh-button"
                      onClick={generateCompanyPurchaseReport}
                      disabled={isCompanyPurchaseLoading || isPurchaseCriteriaLoading}
                      title="Refresh report"
                    >
                      <RefreshCw size={15} />
                    </button>

                    <div className="party-toolbar-export">
                      <button
                        type="button"
                        className="party-export-excel"
                        onClick={exportCompanyPurchaseToExcel}
                        disabled={!isCompanyPurchaseGenerated || filteredCompanyPurchaseRows.length === 0}
                      >
                        <FileSpreadsheet size={15} /> Excel
                      </button>

                      <button
                        type="button"
                        className="party-export-csv"
                        onClick={exportCompanyPurchaseToCsv}
                        disabled={!isCompanyPurchaseGenerated || filteredCompanyPurchaseRows.length === 0}
                      >
                        <Download size={15} /> CSV
                      </button>

                      <button
                        type="button"
                        className="party-export-pdf"
                        onClick={exportCompanyPurchaseToPdf}
                        disabled={!isCompanyPurchaseGenerated || filteredCompanyPurchaseRows.length === 0}
                      >
                        <FileText size={15} /> PDF
                      </button>

                      <button
                        type="button"
                        className="party-export-print"
                        onClick={printCompanyPurchaseReport}
                        disabled={!isCompanyPurchaseGenerated || filteredCompanyPurchaseRows.length === 0}
                      >
                        <Printer size={15} /> Print
                      </button>
                    </div>
                  </div>
                </div>

                <div className="party-report-grid-container">
                  {!isCompanyPurchaseGenerated ? (
                    <div className="party-empty-report">
                      <Building2 size={40} />
                      <strong>No report generated</strong>
                      <span>Select the required report filters and click Generate.</span>
                    </div>
                  ) : (
                    <div
                      className="party-report-zoom"
                      style={{ zoom: Number(companyPurchaseZoom) / 100 }}
                    >
                      <table className="party-report-table" style={{ width: '100%', minWidth: '1200px' }}>
                        <thead>
                          <tr>
                            <th style={{ minWidth: '50px' }}>Sr No.</th>
                            <th style={{ minWidth: '100px' }}>Bill Date</th>
                            <th style={{ minWidth: '80px' }}>Series</th>
                            <th style={{ minWidth: '70px' }}>Bill No</th>
                            <th style={{ minWidth: '100px' }}>Supplier Code</th>
                            <th style={{ minWidth: '180px' }}>Supplier Name</th>
                            <th style={{ minWidth: '100px' }}>Product Code</th>
                            <th style={{ minWidth: '180px' }}>Product Name</th>
                            <th style={{ minWidth: '80px' }}>Batch</th>
                            <th style={{ minWidth: '80px' }} className="party-report-number">MRP</th>
                            <th style={{ minWidth: '90px' }} className="party-report-number">Purchase Rate</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Qty</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Free Qty</th>
                            <th style={{ minWidth: '90px' }} className="party-report-number">Gross Amount</th>
                            <th style={{ minWidth: '80px' }} className="party-report-number">Discount</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Disc %</th>
                            <th style={{ minWidth: '90px' }} className="party-report-number">Taxable Amount</th>
                            <th style={{ minWidth: '80px' }} className="party-report-number">Tax Amount</th>
                            <th style={{ minWidth: '70px' }} className="party-report-number">Tax %</th>
                            <th style={{ minWidth: '90px' }} className="party-report-number">Net Amount</th>
                            <th style={{ minWidth: '120px' }}>Godown</th>
                          </tr>
                        </thead>

                        <tbody>
                          {companyPurchasePageRows.map((row, rowIndex) => (
                            <tr key={row.rowId || rowIndex}>
                              <td style={{ textAlign: 'center' }}>{row.SrNo || rowIndex + 1}</td>
                              <td>{formatCompanyPurchaseValue({ key: 'BillDate' }, row.BillDate)}</td>
                              <td>{row.BillSeries || ''}</td>
                              <td style={{ textAlign: 'center' }}>{row.BillNo ?? ''}</td>
                              <td>{row.SupplierCode || ''}</td>
                              <td>{row.SupplierName || ''}</td>
                              <td>{row.ProductCode || ''}</td>
                              <td>{row.ProductName || ''}</td>
                              <td>{row.Batch || ''}</td>
                              <td className="party-report-number">{formatReportNumber(row.MRP || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.PurchaseRate || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Qty || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.FreeQty || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.GrossAmount || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.Discount || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.DiscountPercent || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.TaxableAmount || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.TaxAmount || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.TaxPercent || 0)}</td>
                              <td className="party-report-number">{formatReportNumber(row.NetAmount || 0)}</td>
                              <td>{row.GodownName || ''}</td>
                            </tr>
                          ))}
                        </tbody>

                        {filteredCompanyPurchaseRows.length > 0 && (
                          <tfoot>
                            <tr>
                              <td colSpan="11" style={{ fontWeight: 'bold', textAlign: 'right' }}>TOTAL</td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(companyPurchaseTotals.Qty || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(companyPurchaseTotals.FreeQty || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(companyPurchaseTotals.GrossAmount || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(companyPurchaseTotals.Discount || 0)}
                              </td>
                              <td colSpan="2"></td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(companyPurchaseTotals.TaxableAmount || 0)}
                              </td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(companyPurchaseTotals.TaxAmount || 0)}
                              </td>
                              <td colSpan="2"></td>
                              <td className="party-report-number" style={{ fontWeight: 'bold' }}>
                                {formatReportNumber(companyPurchaseTotals.NetAmount || 0)}
                              </td>
                              <td colSpan="1"></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>

                <div className="party-report-statusbar">
                  <span>
                    Records: {isCompanyPurchaseGenerated ? filteredCompanyPurchaseRows.length : 0}
                  </span>
                  <span>
                    Level: {companyPurchaseFilters.reportLevel === "details" ? "Details" : "Summary"}
                  </span>
                  <span>
                    Period: {companyPurchaseFilters.fromDate || "--"} to {companyPurchaseFilters.toDate || "--"}
                  </span>
                </div>
              </div>
            </main>

            <aside className="party-report-sidebar">
              <section className="party-sidebar-card">
                <div className="party-sidebar-card-title">
                  <Building2 size={18} />
                  <strong>Quick Summary</strong>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><Building2 size={17} /></span>
                  <div>
                    <small>Total Records</small>
                    <strong>{filteredCompanyPurchaseRows.length.toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><ShoppingCart size={17} /></span>
                  <div>
                    <small>Total Quantity</small>
                    <strong>{formatReportNumber(companyPurchaseTotals.Qty || 0)}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><BarChart3 size={17} /></span>
                  <div>
                    <small>Gross Amount</small>
                    <strong>₹ {formatReportNumber(companyPurchaseTotals.GrossAmount || 0)}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><FileText size={17} /></span>
                  <div>
                    <small>Net Amount</small>
                    <strong>₹ {formatReportNumber(companyPurchaseTotals.NetAmount || 0)}</strong>
                  </div>
                </div>

                <div className="party-summary-item">
                  <span className="party-summary-icon"><FileText size={17} /></span>
                  <div>
                    <small>Tax Amount</small>
                    <strong>₹ {formatReportNumber(companyPurchaseTotals.TaxAmount || 0)}</strong>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // OTHER REPORTS (Product, Purchase, Stock, etc.)
  // =========================================================
  return (
    <div className="report-page">
      <div className="report-page-header">
        <div className="report-title-section">
          <button
            type="button"
            className="report-back-button"
            onClick={onBack}
            title="Back to reports"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="report-title-icon">
            <ReportIcon size={22} />
          </div>

          <div>
            <span className="report-category">
              {reportInformation.category}
            </span>
            <h1>{reportInformation.title}</h1>
            <p>{reportInformation.description}</p>
          </div>
        </div>
      </div>

      <div className="report-filter-card">
        <div className="report-filter-heading">
          <div>
            <h2>Report Filters</h2>
            <p>Select the required options before generating the report.</p>
          </div>
        </div>

        <div className="report-filter-grid">
          <div className="report-field">
            <label>From Date</label>
            <input type="date" />
          </div>

          <div className="report-field">
            <label>To Date</label>
            <input type="date" />
          </div>

          {isDateStockReport && (
            <div className="report-field">
              <label>As On Date</label>
              <input type="date" />
            </div>
          )}

          {isPurchaseReport && (
            <>
              <div className="report-field">
                <label>Company</label>
                <select defaultValue="">
                  <option value="">All Companies</option>
                  {companies.map((company, index) => {
                    const value = company.companyCode || company.code || company._id || index;
                    const label = company.companyName || company.name || company.CompanyName || value;
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="report-field">
                <label>Supplier</label>
                <select defaultValue="">
                  <option value="">All Suppliers</option>
                  {accounts.map((account, index) => {
                    const value = account.accountCode || account.code || account._id || index;
                    const label = account.accountName || account.name || value;
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="report-field">
                <label>Product Wise</label>
                <select defaultValue="N">
                  <option value="N">No</option>
                  <option value="Y">Yes</option>
                </select>
              </div>
            </>
          )}

          {isProductReport && (
            <div className="report-field report-field-wide">
              <label>Product</label>
              <select defaultValue="">
                <option value="">Select Product</option>
                {products.map((product, index) => {
                  const value = product.productCode || product.code || product._id || index;
                  const label = product.productName || product.name || value;
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {reportInformation.category === "Stock Report" && (
            <div className="report-field">
              <label>Godown</label>
              <select defaultValue="">
                <option value="">All Godowns</option>
                {godowns.map((godown, index) => {
                  const value = godown.godownCode || godown.code || godown._id || index;
                  const label = godown.godownName || godown.name || value;
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        <div className="report-filter-actions">
          <button type="button" className="report-clear-button">
            Clear
          </button>
          <button type="button" className="report-generate-button">
            Generate Report
          </button>
        </div>
      </div>

      <div className="report-result-card">
        <FileBarChart size={38} />
        <h3>No report generated</h3>
        <p>
          Select the report filters and click Generate Report to load the
          information.
        </p>
      </div>
    </div>
  );
};

export default Report;
