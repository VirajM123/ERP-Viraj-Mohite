import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  BarChart3,
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./Report.css";

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

  "Company Wise Purchase Report": {
    title: "Company Wise Purchase Report",
    category: "Purchase Report",
    description:
      "View company-wise purchase details with supplier and product-wise options.",
    icon: Building2,
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
};
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

  // JavaScript month 3 means April.
  const financialYear =
    currentMonth >= 3 ? currentYear : currentYear - 1;

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
  const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";
  const [reportCompanies, setReportCompanies] =
  useState([]);

const [mappedParties, setMappedParties] =
  useState([]);

const [mappedAreas, setMappedAreas] =
  useState([]);

const [mappedSalesmen, setMappedSalesmen] =
  useState([]);

const [
  isCriteriaLoading,
  setIsCriteriaLoading,
] = useState(false);

const [
  criteriaLoadError,
  setCriteriaLoadError,
] = useState("");

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

const [partyReportRows, setPartyReportRows] = useState([]);
const [partyReportColumns, setPartyReportColumns] = useState([]);

const [isPartyReportGenerated, setIsPartyReportGenerated] =
  useState(false);

const [isPartyReportLoading, setIsPartyReportLoading] =
  useState(false);

const [partyReportError, setPartyReportError] =
  useState("");

const [partyReportSearch, setPartyReportSearch] =
  useState("");

const [partyReportZoom, setPartyReportZoom] =
  useState("100");

const [partyCurrentPage, setPartyCurrentPage] =
  useState(1);
  const [partyRowsPerPage, setPartyRowsPerPage] =
  useState(10);

const [showAdvancedPartyFilters, setShowAdvancedPartyFilters] =
  useState(false);

const [showPartySelector, setShowPartySelector] =
  useState(false);

const [showAreaSelector, setShowAreaSelector] =
  useState(false);

const [showSalesmanSelector, setShowSalesmanSelector] =
  useState(false);

const [partySelectorSearch, setPartySelectorSearch] =
  useState("");

const [areaSelectorSearch, setAreaSelectorSearch] =
  useState("");

const [salesmanSelectorSearch, setSalesmanSelectorSearch] =
  useState("");

  const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

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
      const storedValue =
        localStorage.getItem(key);

      if (!storedValue) {
        continue;
      }

      const parsed =
        JSON.parse(storedValue);

      if (
        parsed &&
        typeof parsed === "object"
      ) {
        loggedInUser =
          parsed.user &&
          typeof parsed.user === "object"
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
        localStorage.getItem(
          "distributorId"
        ) ||
        ""
    ).trim(),

    firmId: String(
      loggedInUser.firmId ||
        loggedInUser.FirmId ||
        localStorage.getItem(
          "firmId"
        ) ||
        ""
    ).trim(),
  };
};

const loadPartyReportCriteria =
  async (companyCode = "") => {
    try {
      setIsCriteriaLoading(true);
      setCriteriaLoadError("");

      const {
        distributorId,
        firmId,
      } = getLoggedInContext();

      if (!distributorId || !firmId) {
        throw new Error(
          "Distributor or firm information is missing. Please login again."
        );
      }

      const query =
        new URLSearchParams({
          distributorId,
          firmId,
        });

      if (companyCode) {
        query.set(
          "companyCode",
          companyCode
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/reports/party-sales/criteria?${query.toString()}`
      );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      const result =
        contentType.includes(
          "application/json"
        )
          ? await response.json()
          : {
              success: false,
              message:
                await response.text(),
            };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to load report criteria."
        );
      }

      setReportCompanies(
        Array.isArray(result.companies)
          ? result.companies
          : []
      );

      setMappedParties(
        Array.isArray(result.parties)
          ? result.parties
          : []
      );

      setMappedAreas(
        Array.isArray(result.areas)
          ? result.areas
          : []
      );

      setMappedSalesmen(
        Array.isArray(result.salesmen)
          ? result.salesmen
          : []
      );

      return result;
    } catch (error) {
      console.error(
        "Party report criteria error:",
        error
      );

      setMappedParties([]);
      setMappedAreas([]);
      setMappedSalesmen([]);

      setCriteriaLoadError(
        error.message ||
          "Failed to load report criteria."
      );

      return null;
    } finally {
      setIsCriteriaLoading(false);
    }
  };
  /*
 * Load company list when Party Wise Sales Report opens.
 */
useEffect(() => {
  if (
    selectedReport !==
    "Party Wise Sales Report"
  ) {
    return;
  }

  loadPartyReportCriteria("");
}, [selectedReport]);

/*
 * Load only mapped parties, areas and salesmen whenever
 * company selection changes.
 */
useEffect(() => {
  if (
    selectedReport !==
    "Party Wise Sales Report"
  ) {
    return;
  }

  const companyCode =
    partySalesFilters.company;

  setPartySalesFilters(
    (previous) => ({
      ...previous,
      selectedPartyCodes: [],
      selectedAreaCodes: [],
      selectedSalesmanCodes: [],
    })
  );

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

  if (!companyCode) {
    setMappedParties([]);
    setMappedAreas([]);
    setMappedSalesmen([]);
    return;
  }

  loadPartyReportCriteria(companyCode);
}, [
  selectedReport,
  partySalesFilters.company,
]);

const updatePartySalesFilter = (field, value) => {
  setPartySalesFilters((previous) => ({
    ...previous,
    [field]: value,
  }));

  /*
   * Clear the old result whenever any criterion changes.
   * This prevents an old report from being displayed with
   * newly changed filters.
   */
  setIsPartyReportGenerated(false);
  setPartyReportRows([]);
  setPartyReportError("");
  setPartyCurrentPage(1);
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
const companyFilteredAccounts =
  mappedParties;
  const selectedPartyNames = useMemo(() => {
  return partySalesFilters.selectedPartyCodes
    .map((selectedCode) => {
      const party =
        companyFilteredAccounts.find(
          (account, index) =>
            getAccountCode(
              account,
              index
            ) === selectedCode
        );

      return party
        ? getAccountName(party)
        : "";
    })
    .filter(Boolean);
}, [
  partySalesFilters.selectedPartyCodes,
  companyFilteredAccounts,
]);
const toggleValueInArray = (
  field,
  value,
  checked
) => {
  setPartySalesFilters((previous) => {
    const currentValues = Array.isArray(previous[field])
      ? previous[field]
      : [];

    const nextValues = checked
      ? [...new Set([...currentValues, value])]
      : currentValues.filter(
          (currentValue) => currentValue !== value
        );

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
      ? companyFilteredAccounts.map((account, index) =>
          getAccountCode(account, index)
        )
      : [],
  }));
};

const toggleAllAreas = (checked) => {
  setPartySalesFilters((previous) => ({
    ...previous,

    selectedAreaCodes: checked
      ? mappedAreas.map(
          (area, index) =>
            getAreaCode(
              area,
              index
            )
        )
      : [],
  }));

  setPartyReportRows([]);
  setIsPartyReportGenerated(false);
};

const toggleAllSalesmen = (
  checked
) => {
  setPartySalesFilters((previous) => ({
    ...previous,

    selectedSalesmanCodes: checked
      ? mappedSalesmen.map(
          (salesman, index) =>
            getSalesmanCode(
              salesman,
              index
            )
        )
      : [],
  }));

  setPartyReportRows([]);
  setIsPartyReportGenerated(false);
};

useEffect(() => {
  const handleEscapeKey = (event) => {
    if (event.key !== "Escape") {
      return;
    }

    setShowPartySelector(false);
    setShowAreaSelector(false);
    setShowSalesmanSelector(false);
  };

  window.addEventListener("keydown", handleEscapeKey);

  return () => {
    window.removeEventListener(
      "keydown",
      handleEscapeKey
    );
  };
}, []);

const generatePartySalesReport =
  async () => {
    try {
      setPartyReportError("");
      setPartyReportRows([]);
      setPartyReportColumns([]);

      const {
        distributorId,
        firmId,
      } = getLoggedInContext();

      if (
        !distributorId ||
        !firmId
      ) {
        throw new Error(
          "Distributor or firm information is missing. Please login again."
        );
      }

      if (
        partySalesFilters.reportLevel ===
          "selectedParty" &&
        !partySalesFilters.company
      ) {
        throw new Error(
          "Please select a company before selecting parties."
        );
      }

      if (
        partySalesFilters.reportLevel ===
          "selectedParty" &&
        partySalesFilters
          .selectedPartyCodes.length === 0
      ) {
        throw new Error(
          "Please select at least one mapped party."
        );
      }

      if (
        partySalesFilters.selectedArea ===
          "yes" &&
        partySalesFilters
          .selectedAreaCodes.length === 0
      ) {
        throw new Error(
          "Please select at least one area."
        );
      }

      if (
        partySalesFilters
          .selectedSalesman === "yes" &&
        partySalesFilters
          .selectedSalesmanCodes.length ===
          0
      ) {
        throw new Error(
          "Please select at least one salesman."
        );
      }

      if (
        !partySalesFilters.fromDate ||
        !partySalesFilters.toDate
      ) {
        throw new Error(
          "From Date and To Date are required."
        );
      }

      if (
        partySalesFilters.fromDate >
        partySalesFilters.toDate
      ) {
        throw new Error(
          "From Date cannot be greater than To Date."
        );
      }

      setIsPartyReportLoading(true);
      const effectiveProductWise =
  partySalesFilters.reportLevel ===
  "salesDetails"
    ? "yes"
    : partySalesFilters.productWise;

const query =
  new URLSearchParams({
    distributorId,
    firmId,

    companyCode:
      partySalesFilters.company ||
      "",

    reportLevel:
      partySalesFilters.reportLevel,

    selectedPartyCodes:
      partySalesFilters
        .reportLevel ===
      "selectedParty"
        ? partySalesFilters
            .selectedPartyCodes
            .join(",")
        : "",

    selectedAreaCodes:
      partySalesFilters
        .selectedArea === "yes"
        ? partySalesFilters
            .selectedAreaCodes
            .join(",")
        : "",

    selectedSalesmanCodes:
      partySalesFilters
        .selectedSalesman ===
      "yes"
        ? partySalesFilters
            .selectedSalesmanCodes
            .join(",")
        : "",

    productWise:
      effectiveProductWise,

    fromDate:
      partySalesFilters.fromDate,

    toDate:
      partySalesFilters.toDate,

    withCreditNote:
      partySalesFilters
        .withCreditNote,

    orderBy:
      partySalesFilters.orderBy,
  });

      const response = await fetch(
        `${API_BASE_URL}/api/reports/party-sales?${query.toString()}`
      );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      const result =
        contentType.includes(
          "application/json"
        )
          ? await response.json()
          : {
              success: false,
              message:
                await response.text(),
            };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to generate sales report."
        );
      }

     const rows = Array.isArray(
  result.rows
)
  ? result.rows.map(
      (row, index) => ({
        ...row,

        /*
         * Keep every product row unique,
         * even when products belong to
         * the same bill.
         */
        rowId:
          row.rowId ||
          [
            row.billSeries,
            row.billNo,
            row.productCode,
            row.batch,
            index,
          ]
            .filter(
              (value) =>
                value !== undefined &&
                value !== null &&
                value !== ""
            )
            .join("-"),

        trn:
          row.trn ||
          "SALES",

        billSeries:
          row.billSeries ||
          "",

        billNo:
          row.billNo ?? "",

        productCode:
          row.productCode ||
          "",

        productName:
          row.productName ||
          "",

        batch:
          row.batch === "."
            ? ""
            : row.batch || "",

        mrp:
          Number(row.mrp || 0),

        qty:
          Number(row.qty || 0),

        salesRate:
          Number(
            row.salesRate || 0
          ),

        purchaseRate:
          Number(
            row.purchaseRate || 0
          ),

        grossAmount:
          Number(
            row.grossAmount || 0
          ),

        netAmount:
          Number(
            row.netAmount || 0
          ),
      })
    )
  : [];
      const columns = Array.isArray(
        result.columns
      )
        ? result.columns
        : [];

      setPartyReportRows(rows);
      setPartyReportColumns(columns);
      setPartyCurrentPage(1);
      setIsPartyReportGenerated(true);

      if (rows.length === 0) {
        setPartyReportError(
          "No sales records were found for the selected criteria."
        );
      }
    } catch (error) {
      console.error(
        "Party sales report generation error:",
        error
      );

      setPartyReportRows([]);
      setPartyReportColumns([]);
      setIsPartyReportGenerated(false);

      setPartyReportError(
        error.message ||
          "Failed to generate sales report."
      );
    } finally {
      setIsPartyReportLoading(false);
    }
  };

const visiblePartyOptions = useMemo(() => {
  const search = normalizeText(
    partySelectorSearch
  );

  return companyFilteredAccounts.filter(
    (account, index) => {
      if (!search) {
        return true;
      }

      const code = getAccountCode(
        account,
        index
      );

      const name =
        getAccountName(account);

      return [
        code,
        name,
        account?.town,
        account?.mobileNo,
      ].some((value) =>
        normalizeText(value).includes(
          search
        )
      );
    }
  );
}, [
  companyFilteredAccounts,
  partySelectorSearch,
]);

const visibleSalesmanOptions =
  useMemo(() => {
    const search = normalizeText(
      salesmanSelectorSearch
    );

    return mappedSalesmen.filter(
      (salesman, index) => {
        if (!search) {
          return true;
        }

        const salesmanCode =
          getSalesmanCode(
            salesman,
            index
          );

        const salesmanName =
          getSalesmanName(salesman);

        return [
          salesmanCode,
          salesmanName,
        ].some((value) =>
          normalizeText(value).includes(
            search
          )
        );
      }
    );
  }, [
    mappedSalesmen,
    salesmanSelectorSearch,
  ]);

  /*
 * Filter company-mapped areas using the
 * area selector search box.
 */
const visibleAreaOptions = useMemo(() => {
  const search = normalizeText(
    areaSelectorSearch
  );

  return mappedAreas.filter(
    (area, index) => {
      if (!search) {
        return true;
      }

      const areaCode = getAreaCode(
        area,
        index
      );

      const areaName =
        getAreaName(area);

      return [
        areaCode,
        areaName,
      ].some((value) =>
        normalizeText(value).includes(
          search
        )
      );
    }
  );
}, [
  mappedAreas,
  areaSelectorSearch,
]);

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

  const [isProductReportGenerated, setIsProductReportGenerated] =
    useState(false);

  const [reportSearch, setReportSearch] = useState("");
  const [reportZoom, setReportZoom] = useState("100");
  const [currentPage, setCurrentPage] = useState(1);

  const updateProductSalesFilter = (field, value) => {
    setProductSalesFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const clearProductSalesFilters = () => {
    setProductSalesFilters({
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

    setReportSearch("");
    setIsProductReportGenerated(false);
  };

  const setQuickDateRange = (rangeType) => {
    const today = new Date();
    let fromDate = new Date(today);
    let toDate = new Date(today);

    if (rangeType === "today") {
      fromDate = new Date(today);
    }

    if (rangeType === "month") {
      fromDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );
    }

    if (rangeType === "financialYear") {
      const startYear =
        today.getMonth() >= 3
          ? today.getFullYear()
          : today.getFullYear() - 1;

      fromDate = new Date(startYear, 3, 1);
    }

    if (rangeType === "lastFinancialYear") {
      const currentFinancialYear =
        today.getMonth() >= 3
          ? today.getFullYear()
          : today.getFullYear() - 1;

      fromDate = new Date(currentFinancialYear - 1, 3, 1);
      toDate = new Date(currentFinancialYear, 2, 31);
    }

    setProductSalesFilters((previous) => ({
      ...previous,
      fromDate: fromDate.toISOString().split("T")[0],
      toDate: toDate.toISOString().split("T")[0],
    }));
  };
  const reportInformation =
    REPORT_INFORMATION[selectedReport] || {
      title: selectedReport || "Reports",
      category: "Report",
      description: "Select report filters and generate the report.",
      icon: FileBarChart,
    };

  const ReportIcon = reportInformation.icon;

  const isPurchaseReport =
    selectedReport === "Company Wise Purchase Report";

  const isPartyReport =
    selectedReport === "Party Wise Sales Report";

  const isProductReport =
    selectedReport === "Product Wise Sales Report" ||
    selectedReport === "Product Ledger";

  const isDateStockReport =
    selectedReport === "As On Date Stock Report";
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
      {
        srNo: 2,
        productCode: "P002",
        productName: "Aashirvaad Atta 5kg",
        category: "Food Grains",
        unit: "BAG",
        openingStock: 80,
        basicQty: 120,
        altQty: 0,
        totalQty: 120,
        grossAmount: 19200,
        discount: 960,
        netAmount: 18240,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
        netSales: 18240,
        crnAmount: 0,
        balanceAmount: 18240,
      },
      {
        srNo: 3,
        productCode: "P003",
        productName: "Tata Salt 1kg",
        category: "Groceries",
        unit: "PCS",
        openingStock: 200,
        basicQty: 300,
        altQty: 0,
        totalQty: 300,
        grossAmount: 6000,
        discount: 240,
        netAmount: 5760,
        cgst: 259.2,
        sgst: 259.2,
        igst: 0,
        totalTax: 518.4,
        netSales: 6278.4,
        crnAmount: 120,
        balanceAmount: 6158.4,
      },
      {
        srNo: 4,
        productCode: "P004",
        productName: "Red Label Tea 250g",
        category: "Beverages",
        unit: "PCS",
        openingStock: 100,
        basicQty: 180,
        altQty: 0,
        totalQty: 180,
        grossAmount: 14400,
        discount: 720,
        netAmount: 13680,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
        netSales: 13680,
        crnAmount: 0,
        balanceAmount: 13680,
      },
      {
        srNo: 5,
        productCode: "P005",
        productName: "Surf Excel 1kg",
        category: "Detergents",
        unit: "PCS",
        openingStock: 60,
        basicQty: 90,
        altQty: 0,
        totalQty: 90,
        grossAmount: 9000,
        discount: 450,
        netAmount: 8550,
        cgst: 769.5,
        sgst: 769.5,
        igst: 0,
        totalTax: 1539,
        netSales: 10089,
        crnAmount: 0,
        balanceAmount: 10089,
      },
      {
        srNo: 6,
        productCode: "P006",
        productName: "Clinic Plus Shampoo 200ml",
        category: "Personal Care",
        unit: "PCS",
        openingStock: 120,
        basicQty: 220,
        altQty: 0,
        totalQty: 220,
        grossAmount: 13200,
        discount: 660,
        netAmount: 12540,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
        netSales: 12540,
        crnAmount: 0,
        balanceAmount: 12540,
      },
      {
        srNo: 7,
        productCode: "P007",
        productName: "Colgate Toothpaste 150g",
        category: "Personal Care",
        unit: "PCS",
        openingStock: 110,
        basicQty: 200,
        altQty: 0,
        totalQty: 200,
        grossAmount: 10000,
        discount: 500,
        netAmount: 9500,
        cgst: 855,
        sgst: 855,
        igst: 0,
        totalTax: 1710,
        netSales: 11210,
        crnAmount: 100,
        balanceAmount: 11110,
      },
      {
        srNo: 8,
        productCode: "P008",
        productName: "Parle-G Biscuit 100g",
        category: "Snacks",
        unit: "PCS",
        openingStock: 300,
        basicQty: 400,
        altQty: 0,
        totalQty: 400,
        grossAmount: 4000,
        discount: 200,
        netAmount: 3800,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
        netSales: 3800,
        crnAmount: 0,
        balanceAmount: 3800,
      },
      {
        srNo: 9,
        productCode: "P009",
        productName: "Pepsi 750ml",
        category: "Beverages",
        unit: "PCS",
        openingStock: 90,
        basicQty: 150,
        altQty: 0,
        totalQty: 150,
        grossAmount: 7500,
        discount: 375,
        netAmount: 7125,
        cgst: 641.25,
        sgst: 641.25,
        igst: 0,
        totalTax: 1282.5,
        netSales: 8407.5,
        crnAmount: 0,
        balanceAmount: 8407.5,
      },
      {
        srNo: 10,
        productCode: "P010",
        productName: "Maggi 2-Minute Noodles",
        category: "Groceries",
        unit: "PCS",
        openingStock: 250,
        basicQty: 300,
        altQty: 0,
        totalQty: 300,
        grossAmount: 6000,
        discount: 300,
        netAmount: 5700,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
        netSales: 5700,
        crnAmount: 0,
        balanceAmount: 5700,
      },
    ],
    []
  );

  const filteredProductSalesRows = useMemo(() => {
    const searchText = reportSearch.trim().toLowerCase();

    if (!searchText) {
      return productSalesReportRows;
    }

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
        openingStock:
          totals.openingStock + Number(row.openingStock || 0),
        basicQty: totals.basicQty + Number(row.basicQty || 0),
        altQty: totals.altQty + Number(row.altQty || 0),
        totalQty: totals.totalQty + Number(row.totalQty || 0),
        grossAmount:
          totals.grossAmount + Number(row.grossAmount || 0),
        discount:
          totals.discount + Number(row.discount || 0),
        netAmount:
          totals.netAmount + Number(row.netAmount || 0),
        cgst: totals.cgst + Number(row.cgst || 0),
        sgst: totals.sgst + Number(row.sgst || 0),
        igst: totals.igst + Number(row.igst || 0),
        totalTax:
          totals.totalTax + Number(row.totalTax || 0),
        netSales:
          totals.netSales + Number(row.netSales || 0),
        crnAmount:
          totals.crnAmount + Number(row.crnAmount || 0),
        balanceAmount:
          totals.balanceAmount + Number(row.balanceAmount || 0),
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

const filteredPartySalesRows = useMemo(() => {
  const search = normalizeText(partyReportSearch);

  if (!search) {
    return partyReportRows;
  }

  return partyReportRows.filter((row) =>
    Object.values(row).some((value) =>
      normalizeText(value).includes(search)
    )
  );
}, [partyReportRows, partyReportSearch]);

const partySalesTotals = useMemo(() => {
  return filteredPartySalesRows.reduce(
    (total, row) => ({
      qty:
        total.qty +
        Number(row.qty || 0),

      freeQty:
        total.freeQty +
        Number(row.freeQty || 0),

      grossAmount:
        total.grossAmount +
        Number(
          row.grossAmount || 0
        ),

      tprAmount:
        total.tprAmount +
        Number(
          row.tprAmount || 0
        ),

      schemeAmount:
        total.schemeAmount +
        Number(
          row.schemeAmount || 0
        ),

      cashDiscountAmount:
        total.cashDiscountAmount +
        Number(
          row.cashDiscountAmount ||
            0
        ),

      taxableAmount:
        total.taxableAmount +
        Number(
          row.taxableAmount || 0
        ),

      gstAmount:
        total.gstAmount +
        Number(
          row.gstAmount || 0
        ),

      creditNoteAmount:
        total.creditNoteAmount +
        Number(
          row.creditNoteAmount ||
            0
        ),

      netAmount:
        total.netAmount +
        Number(
          row.netAmount || 0
        ),
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

const formatReportNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const formatPartyReportValue = (
  column,
  value
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "";
  }

  if (column.type === "number") {
    return formatReportNumber(value);
  }

  if (
    column.key === "billDate" ||
    column.key === "mfgDate" ||
    column.key === "expiryDate"
  ) {
    const rawDate =
      String(value).trim();

    if (!rawDate) {
      return "";
    }

    const dateOnly =
      rawDate.includes("T")
        ? rawDate.split("T")[0]
        : rawDate;

    const parts =
      dateOnly.split("-");

    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

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
  const selectedCompany =
    reportCompanies.find(
      (company, index) =>
        getCompanyCode(company, index) ===
        partySalesFilters.company
    );

  return selectedCompany
    ? getCompanyName(selectedCompany)
    : "All Companies";
};

const getPartyReportLevelName = () => {
  if (
    partySalesFilters.reportLevel ===
    "salesDetails"
  ) {
    return "Sales Details";
  }

  if (
    partySalesFilters.reportLevel ===
    "selectedParty"
  ) {
    return "Selected Party Wise";
  }

  return "Sales Summary";
};

const getExportValue = (
  column,
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  if (column.type === "number") {
    const numberValue =
      Number(value);

    return Number.isFinite(numberValue)
      ? numberValue
      : 0;
  }

  if (
    column.key === "billDate" ||
    column.key === "mfgDate" ||
    column.key === "expiryDate"
  ) {
    return formatPartyReportValue(
      column,
      value
    );
  }

  return String(value);
};

const getPartyReportTotalValue = (
  column,
  columnIndex
) => {
  if (columnIndex === 0) {
    return "TOTAL";
  }

  const totalFieldMap = {
    qty: "qty",
    freeQty: "freeQty",
    grossAmount: "grossAmount",
    tprAmount: "tprAmount",
    schemeAmount: "schemeAmount",
    cashDiscountAmount:
      "cashDiscountAmount",
    taxableAmount: "taxableAmount",
    gstAmount: "gstAmount",
    creditNoteAmount:
      "creditNoteAmount",
    netAmount: "netAmount",
  };

  const totalField =
    totalFieldMap[column.key];

  if (!totalField) {
    return "";
  }

  return Number(
    partySalesTotals[totalField] || 0
  );
};

const validatePartyReportExport = () => {
  if (!isPartyReportGenerated) {
    setPartyReportError(
      "Please generate the report before exporting."
    );

    return false;
  }

  if (
    partyReportColumns.length === 0
  ) {
    setPartyReportError(
      "Report columns are not available."
    );

    return false;
  }

  if (
    filteredPartySalesRows.length === 0
  ) {
    setPartyReportError(
      "No report records are available to export."
    );

    return false;
  }

  setPartyReportError("");
  return true;
};

const buildPartyReportExportRows =
  () => {
    return filteredPartySalesRows.map(
      (row) => {
        const exportRow = {};

        partyReportColumns.forEach(
          (column) => {
            exportRow[column.label] =
              getExportValue(
                column,
                row[column.key]
              );
          }
        );

        return exportRow;
      }
    );
  };
const getLoggedInFirmDetails = () => {
  const storageKeys = [
    "loggedInUser",
    "user",
    "currentUser",
  ];

  let loggedInUser = {};

  for (const key of storageKeys) {
    try {
      const storedValue =
        localStorage.getItem(key);

      if (!storedValue) {
        continue;
      }

      const parsed =
        JSON.parse(storedValue);

      if (
        parsed &&
        typeof parsed === "object"
      ) {
        loggedInUser =
          parsed.user &&
          typeof parsed.user === "object"
            ? parsed.user
            : parsed;

        break;
      }
    } catch {
      // Continue checking other keys.
    }
  }

  const firm =
    loggedInUser.firm &&
    typeof loggedInUser.firm === "object"
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
const exportPartyReportToExcel = () => {
  try {
    if (!validatePartyReportExport()) {
      return;
    }

    const companyName =
      getSelectedCompanyName();

    const reportLevel =
      getPartyReportLevelName();

    const firmDetails =
      getLoggedInFirmDetails();

    const workbook =
      XLSX.utils.book_new();

    const columnCount =
      Math.max(
        partyReportColumns.length,
        1
      );

 const worksheetData = [];

/*
 * Row 1: Firm name only.
 */
worksheetData.push([
  firmDetails.firmName ||
    "Firm Name",
]);

/*
 * Row 2: Report title.
 */
worksheetData.push([
  "Party Wise Sales Report",
]);

/*
 * Row 3: Company and report level.
 */
worksheetData.push([
  "Company",
  companyName,
  "Report Level",
  reportLevel,
]);

/*
 * Row 4: Period and record count.
 */
worksheetData.push([
  "Period",
  `${partySalesFilters.fromDate} to ${partySalesFilters.toDate}`,
  "Records",
  filteredPartySalesRows.length,
]);

/*
 * One blank row before table.
 */
worksheetData.push([]);

    /*
     * Report title.
     */
    worksheetData.push([
      "Party Wise Sales Report",
    ]);

    worksheetData.push([
      "Company",
      companyName,
    ]);

    worksheetData.push([
      "Report Level",
      reportLevel,
    ]);

    worksheetData.push([
      "Period",
      `${partySalesFilters.fromDate} to ${partySalesFilters.toDate}`,
    ]);

    if (
      partySalesFilters.reportLevel ===
        "selectedParty" &&
      selectedPartyNames.length > 0
    ) {
      worksheetData.push([
        "Selected Parties",
        selectedPartyNames.join(", "),
      ]);
    }

    worksheetData.push([]);

    /*
     * Remember row indexes before adding
     * the table.
     */
    const tableHeaderRowIndex =
      worksheetData.length;

    /*
     * Add column headings.
     */
    worksheetData.push(
      partyReportColumns.map(
        (column) =>
          column.label || column.key
      )
    );

    /*
     * Add actual report rows.
     */
    filteredPartySalesRows.forEach(
      (row) => {
        worksheetData.push(
          partyReportColumns.map(
            (column) =>
              getExportValue(
                column,
                row[column.key]
              )
          )
        );
      }
    );

    /*
     * Add total row.
     */
    const totalRowIndex =
      worksheetData.length;

    worksheetData.push(
      partyReportColumns.map(
        (column, columnIndex) =>
          getPartyReportTotalValue(
            column,
            columnIndex
          )
      )
    );

    const worksheet =
      XLSX.utils.aoa_to_sheet(
        worksheetData
      );

    /*
     * -------------------------------------------------------
     * COMMON STYLE DEFINITIONS
     * -------------------------------------------------------
     */

    const thinBorder = {
      top: {
        style: "thin",
        color: { rgb: "9FB9C8" },
      },
      bottom: {
        style: "thin",
        color: { rgb: "9FB9C8" },
      },
      left: {
        style: "thin",
        color: { rgb: "9FB9C8" },
      },
      right: {
        style: "thin",
        color: { rgb: "9FB9C8" },
      },
    };

    const firmNameStyle = {
      font: {
        bold: true,
        sz: 16,
        color: {
          rgb: "FFFFFF",
        },
      },
      fill: {
        patternType: "solid",
        fgColor: {
          rgb: "124F78",
        },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };

    const firmInformationStyle = {
      font: {
        bold: true,
        sz: 10,
        color: {
          rgb: "24465E",
        },
      },
      fill: {
        patternType: "solid",
        fgColor: {
          rgb: "E3F1F9",
        },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
    };

    const reportTitleStyle = {
      font: {
        bold: true,
        sz: 14,
        color: {
          rgb: "FFFFFF",
        },
      },
      fill: {
        patternType: "solid",
        fgColor: {
          rgb: "F79646",
        },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };

    const informationLabelStyle = {
      font: {
        bold: true,
        color: {
          rgb: "163D5C",
        },
      },
      fill: {
        patternType: "solid",
        fgColor: {
          rgb: "D7EAF5",
        },
      },
      alignment: {
        vertical: "center",
      },
      border: thinBorder,
    };

    const informationValueStyle = {
      font: {
        color: {
          rgb: "263E50",
        },
      },
      fill: {
        patternType: "solid",
        fgColor: {
          rgb: "F7FBFD",
        },
      },
      alignment: {
        vertical: "center",
        wrapText: true,
      },
      border: thinBorder,
    };

    const headerStyle = {
      font: {
        bold: true,
        color: {
          rgb: "FFFFFF",
        },
      },
      fill: {
        patternType: "solid",
        fgColor: {
          rgb: "267BB3",
        },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
      border: thinBorder,
    };

    const oddRowStyle = {
      fill: {
        patternType: "solid",
        fgColor: {
          rgb: "FFFFFF",
        },
      },
      alignment: {
        vertical: "center",
      },
      border: thinBorder,
    };

    const evenRowStyle = {
      fill: {
        patternType: "solid",
        fgColor: {
          rgb: "EAF5FB",
        },
      },
      alignment: {
        vertical: "center",
      },
      border: thinBorder,
    };

    const totalStyle = {
      font: {
        bold: true,
        color: {
          rgb: "163D5C",
        },
      },
      fill: {
        patternType: "solid",
        fgColor: {
          rgb: "B7D6EA",
        },
      },
      alignment: {
        vertical: "center",
      },
      border: thinBorder,
    };

    /*
     * -------------------------------------------------------
     * APPLY FIRM AND REPORT HEADER STYLES
     * -------------------------------------------------------
     */

    const firmNameCell =
      worksheet["A1"];

    if (firmNameCell) {
      firmNameCell.s =
        firmNameStyle;
    }

   /*
 * Report title is now at row 2.
 */
const reportTitleCell =
  worksheet["A2"];

if (reportTitleCell) {
  reportTitleCell.s =
    reportTitleStyle;
}

    /*
     * Rows 6 onward contain report
     * criteria until the blank row.
     */
   /*
 * Style Company, Report Level,
 * Period and Records.
 */
[2, 3].forEach((rowIndex) => {
  [0, 2].forEach(
    (labelColumnIndex) => {
      const labelCellAddress =
        XLSX.utils.encode_cell({
          r: rowIndex,
          c: labelColumnIndex,
        });

      if (
        worksheet[labelCellAddress]
      ) {
        worksheet[
          labelCellAddress
        ].s =
          informationLabelStyle;
      }
    }
  );

  [1, 3].forEach(
    (valueColumnIndex) => {
      const valueCellAddress =
        XLSX.utils.encode_cell({
          r: rowIndex,
          c: valueColumnIndex,
        });

      if (
        worksheet[valueCellAddress]
      ) {
        worksheet[
          valueCellAddress
        ].s =
          informationValueStyle;
      }
    }
  );
});

    /*
     * -------------------------------------------------------
     * STYLE TABLE HEADER
     * -------------------------------------------------------
     */

    partyReportColumns.forEach(
      (_, columnIndex) => {
        const cellAddress =
          XLSX.utils.encode_cell({
            r: tableHeaderRowIndex,
            c: columnIndex,
          });

        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s =
            headerStyle;
        }
      }
    );

    /*
     * -------------------------------------------------------
     * STYLE TABLE DATA WITH ALTERNATING COLORS
     * -------------------------------------------------------
     */

    const dataStartRowIndex =
      tableHeaderRowIndex + 1;

    const dataEndRowIndex =
      totalRowIndex - 1;

    for (
      let rowIndex =
        dataStartRowIndex;
      rowIndex <= dataEndRowIndex;
      rowIndex += 1
    ) {
      const isEvenRow =
        (rowIndex -
          dataStartRowIndex) %
          2 ===
        1;

      partyReportColumns.forEach(
        (column, columnIndex) => {
          const cellAddress =
            XLSX.utils.encode_cell({
              r: rowIndex,
              c: columnIndex,
            });

          /*
           * Create empty cells so their
           * fill and border remain visible.
           */
          if (!worksheet[cellAddress]) {
            worksheet[cellAddress] = {
              t: "s",
              v: "",
            };
          }

          worksheet[cellAddress].s = {
            ...(isEvenRow
              ? evenRowStyle
              : oddRowStyle),

            alignment: {
              horizontal:
                column.type === "number"
                  ? "right"
                  : "left",
              vertical: "center",
            },

            numFmt:
              column.type === "number"
                ? "#,##0.00"
                : "General",
          };
        }
      );
    }

    /*
     * -------------------------------------------------------
     * STYLE TOTAL ROW
     * -------------------------------------------------------
     */

    partyReportColumns.forEach(
      (column, columnIndex) => {
        const cellAddress =
          XLSX.utils.encode_cell({
            r: totalRowIndex,
            c: columnIndex,
          });

        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = {
            t: "s",
            v: "",
          };
        }

        worksheet[cellAddress].s = {
          ...totalStyle,

          alignment: {
            horizontal:
              column.type === "number"
                ? "right"
                : "left",
            vertical: "center",
          },

          numFmt:
            column.type === "number"
              ? "#,##0.00"
              : "General",
        };
      }
    );

    /*
     * -------------------------------------------------------
     * MERGE FIRM AND REPORT TITLE ROWS
     * -------------------------------------------------------
     */

   worksheet["!merges"] = [
  {
    s: { r: 0, c: 0 },
    e: {
      r: 0,
      c: columnCount - 1,
    },
  },
  {
    s: { r: 1, c: 0 },
    e: {
      r: 1,
      c: columnCount - 1,
    },
  },
];
    /*
     * Column widths.
     */
    worksheet["!cols"] =
      partyReportColumns.map(
        (column) => {
          const labelLength =
            String(
              column.label || ""
            ).length;

          let width =
            column.type === "number"
              ? 14
              : Math.max(
                  12,
                  Math.min(
                    35,
                    labelLength + 5
                  )
                );

          if (
            column.key ===
              "partyName" ||
            column.key ===
              "productName"
          ) {
            width = 28;
          }

          if (
            column.key ===
              "billDate" ||
            column.key === "batch"
          ) {
            width = 14;
          }

          return {
            wch: width,
          };
        }
      );

    /*
     * Row heights.
     */
    worksheet["!rows"] = [];

   worksheet["!rows"][0] = {
  hpt: 24,
};

worksheet["!rows"][1] = {
  hpt: 22,
};

worksheet["!rows"][2] = {
  hpt: 20,
};

worksheet["!rows"][3] = {
  hpt: 20,
};
    /*
     * Freeze report headings.
     */
    worksheet["!freeze"] = {
      xSplit: 0,
      ySplit:
        tableHeaderRowIndex + 1,
      topLeftCell:
        `A${tableHeaderRowIndex + 2}`,
      activePane: "bottomLeft",
      state: "frozen",
    };

    /*
     * Add filter dropdowns to headings.
     */
    worksheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: {
          r: tableHeaderRowIndex,
          c: 0,
        },
        e: {
          r: dataEndRowIndex,
          c: columnCount - 1,
        },
      }),
    };

    /*
     * Set page layout for printing.
     */
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

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Party Sales"
    );

    const fileName =
      sanitizeExportFileName(
        `Party_Wise_Sales_${companyName}_${partySalesFilters.fromDate}_${partySalesFilters.toDate}`
      );

    XLSX.writeFile(
      workbook,
      `${fileName}.xlsx`,
      {
        cellStyles: true,
      }
    );
  } catch (error) {
    console.error(
      "Excel export error:",
      error
    );

    setPartyReportError(
      error.message ||
        "Failed to export Excel report."
    );
  }
};
const exportPartyReportToCsv = () => {
  try {
    if (!validatePartyReportExport()) {
      return;
    }

    const companyName =
      getSelectedCompanyName();

    const firmDetails =
      getLoggedInFirmDetails();

    const csvRows = [];

    /*
     * Compact CSV header.
     */
    csvRows.push([
      firmDetails.firmName ||
        "Firm Name",
    ]);

    csvRows.push([
      "Party Wise Sales Report",
    ]);

    csvRows.push([
      "Company",
      companyName,
      "Report Level",
      getPartyReportLevelName(),
    ]);

    csvRows.push([
      "Period",
      `${partySalesFilters.fromDate} to ${partySalesFilters.toDate}`,
      "Records",
      filteredPartySalesRows.length,
    ]);

    csvRows.push([]);

    /*
     * Column headings.
     */
    csvRows.push(
      partyReportColumns.map(
        (column) =>
          column.label || column.key
      )
    );

    /*
     * Report data.
     */
    filteredPartySalesRows.forEach(
      (row) => {
        csvRows.push(
          partyReportColumns.map(
            (column) =>
              getExportValue(
                column,
                row[column.key]
              )
          )
        );
      }
    );

    /*
     * Total row.
     */
    csvRows.push(
      partyReportColumns.map(
        (column, columnIndex) =>
          getPartyReportTotalValue(
            column,
            columnIndex
          )
      )
    );

    /*
     * Convert values safely for CSV.
     */
    const escapeCsvValue = (value) => {
      const text =
        String(value ?? "");

      return `"${text.replace(
        /"/g,
        '""'
      )}"`;
    };

    const csvContent =
      "\uFEFF" +
      csvRows
        .map((row) =>
          row
            .map(escapeCsvValue)
            .join(",")
        )
        .join("\r\n");

    const csvBlob = new Blob(
      [csvContent],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const csvUrl =
      URL.createObjectURL(csvBlob);

    const downloadLink =
      document.createElement("a");

    const fileName =
      sanitizeExportFileName(
        `Party_Wise_Sales_${companyName}_${partySalesFilters.fromDate}_${partySalesFilters.toDate}`
      );

    downloadLink.href = csvUrl;
    downloadLink.download =
      `${fileName}.csv`;

    document.body.appendChild(
      downloadLink
    );

    downloadLink.click();
    downloadLink.remove();

    URL.revokeObjectURL(csvUrl);
  } catch (error) {
    console.error(
      "CSV export error:",
      error
    );

    setPartyReportError(
      error.message ||
        "Failed to export CSV report."
    );
  }
};
const exportPartyReportToPdf =
  () => {
    try {
      if (
        !validatePartyReportExport()
      ) {
        return;
      }

      const companyName =
        getSelectedCompanyName();

      const reportLevel =
        getPartyReportLevelName();

      /*
       * Use landscape for wide reports.
       * A3 gives enough width for product
       * and transaction details.
       */
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format:
          partyReportColumns.length > 12
            ? "a3"
            : "a4",
      });

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      pdf.setFontSize(15);
      pdf.text(
        "Party Wise Sales Report",
        pageWidth / 2,
        12,
        {
          align: "center",
        }
      );

      pdf.setFontSize(8.5);

      pdf.text(
        `Company: ${companyName}`,
        10,
        19
      );

      pdf.text(
        `Report Level: ${reportLevel}`,
        10,
        24
      );

      pdf.text(
        `Period: ${partySalesFilters.fromDate} to ${partySalesFilters.toDate}`,
        10,
        29
      );

      pdf.text(
        `Records: ${filteredPartySalesRows.length}`,
        pageWidth - 10,
        19,
        {
          align: "right",
        }
      );

      const tableHead = [
        partyReportColumns.map(
          (column) => column.label
        ),
      ];

      const tableBody =
        filteredPartySalesRows.map(
          (row) =>
            partyReportColumns.map(
              (column) =>
                formatPartyReportValue(
                  column,
                  row[column.key]
                )
            )
        );

      const totalsRow =
        partyReportColumns.map(
          (column, columnIndex) => {
            const value =
              getPartyReportTotalValue(
                column,
                columnIndex
              );

            if (
              column.type ===
                "number" &&
              value !== ""
            ) {
              return formatReportNumber(
                value
              );
            }

            return value;
          }
        );

      tableBody.push(totalsRow);

      const columnStyles = {};

      partyReportColumns.forEach(
        (column, index) => {
          columnStyles[index] = {
            halign:
              column.type ===
              "number"
                ? "right"
                : "left",
            cellWidth: "auto",
          };
        }
      );

      autoTable(pdf, {
        startY: 34,
        head: tableHead,
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize:
            partyReportColumns.length >
            15
              ? 5
              : 6.5,
          cellPadding: 1.2,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles,
        didParseCell: (data) => {
          const isTotalRow =
            data.section === "body" &&
            data.row.index ===
              tableBody.length - 1;

          if (isTotalRow) {
            data.cell.styles.fontStyle =
              "bold";
          }
        },
        didDrawPage: () => {
          const pageNumber =
            pdf.internal.getNumberOfPages();

          const pageHeight =
            pdf.internal.pageSize.getHeight();

          pdf.setFontSize(7);

          pdf.text(
            `Page ${pageNumber}`,
            pageWidth - 10,
            pageHeight - 5,
            {
              align: "right",
            }
          );
        },
      });

      const fileName =
        sanitizeExportFileName(
          `Party_Wise_Sales_${companyName}_${partySalesFilters.fromDate}_${partySalesFilters.toDate}`
        );

      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error(
        "PDF export error:",
        error
      );

      setPartyReportError(
        error.message ||
          "Failed to export PDF report."
      );
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
    if (
      !validatePartyReportExport()
    ) {
      return;
    }

    const companyName =
      getSelectedCompanyName();

    const reportLevel =
      getPartyReportLevelName();

    const tableHeaders =
      partyReportColumns
        .map(
          (column) => `
            <th class="${
              column.type ===
              "number"
                ? "number-cell"
                : ""
            }">
              ${escapePrintHtml(
                column.label
              )}
            </th>
          `
        )
        .join("");

    const tableRows =
      filteredPartySalesRows
        .map(
          (row) => `
            <tr>
              ${partyReportColumns
                .map(
                  (column) => `
                    <td class="${
                      column.type ===
                      "number"
                        ? "number-cell"
                        : ""
                    }">
                      ${escapePrintHtml(
                        formatPartyReportValue(
                          column,
                          row[
                            column.key
                          ]
                        )
                      )}
                    </td>
                  `
                )
                .join("")}
            </tr>
          `
        )
        .join("");

    const totalsCells =
      partyReportColumns
        .map(
          (
            column,
            columnIndex
          ) => {
            const value =
              getPartyReportTotalValue(
                column,
                columnIndex
              );

            const displayValue =
              column.type ===
                "number" &&
              value !== ""
                ? formatReportNumber(
                    value
                  )
                : value;

            return `
              <td class="${
                column.type ===
                "number"
                  ? "number-cell"
                  : ""
              }">
                ${escapePrintHtml(
                  displayValue
                )}
              </td>
            `;
          }
        )
        .join("");

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1400,height=900"
      );

    if (!printWindow) {
      throw new Error(
        "Print window was blocked. Please allow pop-ups for this website."
      );
    }

    printWindow.document.open();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />

          <title>
            Party Wise Sales Report
          </title>

          <style>
            @page {
              size: landscape;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              color: #111827;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
              font-size: 10px;
            }

            .report-header {
              margin-bottom: 10px;
              text-align: center;
            }

            .report-header h1 {
              margin: 0 0 6px;
              font-size: 18px;
            }

            .report-information {
              display: flex;
              flex-wrap: wrap;
              justify-content:
                space-between;
              gap: 5px 18px;
              border: 1px solid #9ca3af;
              padding: 6px 8px;
              text-align: left;
            }

            .report-information span {
              white-space: nowrap;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: auto;
            }

            thead {
              display:
                table-header-group;
            }

            tfoot {
              display:
                table-footer-group;
            }

            tr {
              break-inside: avoid;
              page-break-inside:
                avoid;
            }

            th,
            td {
              border: 1px solid #6b7280;
              padding: 3px 4px;
              vertical-align: middle;
              overflow-wrap:
                anywhere;
            }

            th {
              background: #e5e7eb;
              font-weight: 700;
              text-align: center;
              white-space: nowrap;
            }

            tbody tr:nth-child(even) {
              background: #f9fafb;
            }

            tfoot td {
              background: #e5e7eb;
              font-weight: 700;
            }

            .number-cell {
              text-align: right;
              white-space: nowrap;
            }

            .print-footer {
              margin-top: 7px;
              text-align: right;
              font-size: 9px;
            }

            @media print {
              body {
                print-color-adjust:
                  exact;
                -webkit-print-color-adjust:
                  exact;
              }
            }
          </style>
        </head>

        <body>
          <div class="report-header">
            <h1>
              Party Wise Sales Report
            </h1>

            <div class="report-information">
              <span>
                <strong>Company:</strong>
                ${escapePrintHtml(
                  companyName
                )}
              </span>

              <span>
                <strong>Level:</strong>
                ${escapePrintHtml(
                  reportLevel
                )}
              </span>

              <span>
                <strong>Period:</strong>
                ${escapePrintHtml(
                  partySalesFilters.fromDate
                )}
                to
                ${escapePrintHtml(
                  partySalesFilters.toDate
                )}
              </span>

              <span>
                <strong>Records:</strong>
                ${
                  filteredPartySalesRows.length
                }
              </span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                ${tableHeaders}
              </tr>
            </thead>

            <tbody>
              ${tableRows}
            </tbody>

            <tfoot>
              <tr>
                ${totalsCells}
              </tr>
            </tfoot>
          </table>

          <div class="print-footer">
            Printed on:
            ${escapePrintHtml(
              new Date().toLocaleString(
                "en-IN"
              )
            )}
          </div>

          <script>
            window.addEventListener(
              "load",
              function () {
                window.focus();

                setTimeout(function () {
                  window.print();
                }, 300);
              }
            );

            window.addEventListener(
              "afterprint",
              function () {
                window.close();
              }
            );
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  } catch (error) {
    console.error(
      "Print report error:",
      error
    );

    setPartyReportError(
      error.message ||
        "Failed to print report."
    );
  }
};

const partyTotalPages = Math.max(
  1,
  Math.ceil(
    filteredPartySalesRows.length /
      partyRowsPerPage
  )
);

const partySafeCurrentPage = Math.min(
  partyCurrentPage,
  partyTotalPages
);

const partyPageStart =
  (partySafeCurrentPage - 1) *
  partyRowsPerPage;

const partyPageRows =
  filteredPartySalesRows.slice(
    partyPageStart,
    partyPageStart +
      partyRowsPerPage
  );

const partyStartRecord =
  filteredPartySalesRows.length === 0
    ? 0
    : partyPageStart + 1;

const partyEndRecord = Math.min(
  partyPageStart + partyRowsPerPage,
  filteredPartySalesRows.length
);

const partyQuickSummary = useMemo(() => {
  const partyCodes = new Set();
  const invoices = new Set();

  let totalAmount = 0;
  let totalQuantity = 0;

  partyReportRows.forEach((row) => {
    const partyCode = String(
      row.partyCode ||
        row.accountCode ||
        row.acCode ||
        row.partyName ||
        ""
    ).trim();

    if (partyCode) {
      partyCodes.add(partyCode);
    }

    const invoiceKey = [
      row.billSeries,
      row.billNo,
    ]
      .filter(
        (value) =>
          value !== undefined &&
          value !== null &&
          value !== ""
      )
      .join("-");

    if (invoiceKey) {
      invoices.add(invoiceKey);
    }

    totalAmount += Number(
      row.netAmount ||
        row.billAmount ||
        row.amount ||
        0
    );

    totalQuantity += Number(
      row.qty ||
        row.quantity ||
        row.totalQty ||
        0
    );
  });

  return {
    totalParties: partyCodes.size,
    totalInvoices: invoices.size,
    totalAmount,
    totalQuantity,
  };
}, [partyReportRows]);

const setPartyQuickDateRange = (
  rangeType
) => {
  const today = new Date();

  let fromDate = new Date(today);
  let toDate = new Date(today);

  if (rangeType === "month") {
    fromDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );
  }

  if (
    rangeType === "financialYear"
  ) {
    const startYear =
      today.getMonth() >= 3
        ? today.getFullYear()
        : today.getFullYear() - 1;

    fromDate = new Date(
      startYear,
      3,
      1
    );
  }

  const formatDate = (date) => {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  setPartySalesFilters(
    (previous) => ({
      ...previous,
      fromDate:
        formatDate(fromDate),
      toDate:
        formatDate(toDate),
    })
  );

  setPartyReportRows([]);
  setPartyReportColumns([]);
  setIsPartyReportGenerated(false);
  setPartyCurrentPage(1);
};

  if (selectedReport === "Party Wise Sales Report") {
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
      <Users size={21} />
    </div>

    <div className="party-title-content">
      <span>Sales Report</span>

      <h1>Party Wise Sales Report</h1>

      <p>
        Detailed party-wise sales analysis with advanced
        filtering and insights
      </p>
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
      disabled={
        isPartyReportLoading ||
        isCriteriaLoading
      }
    >
      {isPartyReportLoading ? (
        <RefreshCw
          size={16}
          className="party-spinning-icon"
        />
      ) : (
        <FileBarChart size={16} />
      )}

      {isPartyReportLoading
        ? "Generating..."
        : "Generate Report"}
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
  {/* 1. COMPANY */}
  <div className="party-report-field">
    <label>Company</label>

    <select
      value={partySalesFilters.company}
      disabled={isCriteriaLoading}
      onChange={(event) => {
        updatePartySalesFilter(
          "company",
          event.target.value
        );

        setPartySalesFilters(
          (previous) => ({
            ...previous,
            company:
              event.target.value,

            selectedPartyCodes: [],
            selectedAreaCodes: [],
            selectedSalesmanCodes: [],
          })
        );

        setShowPartySelector(false);
        setShowAreaSelector(false);
        setShowSalesmanSelector(false);
      }}
    >
      <option value="">
        {isCriteriaLoading
          ? "Loading companies..."
          : "Select Company"}
      </option>

      {reportCompanies.map(
        (company, index) => {
          const companyCode =
            getCompanyCode(
              company,
              index
            );

          const companyName =
            getCompanyName(company) ||
            companyCode;

          return (
            <option
              key={
                company._id ||
                companyCode
              }
              value={companyCode}
            >
              {companyName}
            </option>
          );
        }
      )}
    </select>
  </div>

  {/* 2. REPORT LEVEL */}
  <div className="party-report-field">
    <label>Report Level</label>

    <select
      value={
        partySalesFilters.reportLevel
      }
     onChange={(event) => {
  const reportLevel =
    event.target.value;

  setPartySalesFilters(
    (previous) => ({
      ...previous,

      reportLevel,

      /*
       * Sales Details must always return
       * every bill product row.
       */
      productWise:
        reportLevel ===
        "salesDetails"
          ? "yes"
          : previous.productWise,

      /*
       * Party selection is required only
       * for Selected Party Wise.
       */
      selectedPartyCodes:
        reportLevel ===
        "selectedParty"
          ? previous.selectedPartyCodes
          : [],
    })
  );

  setShowPartySelector(false);
  setPartyReportRows([]);
  setPartyReportColumns([]);
  setPartyReportSearch("");
  setPartyCurrentPage(1);
  setIsPartyReportGenerated(false);
  setPartyReportError("");
}}
    >
      <option value="salesSummary">
        Sales Summary
      </option>

      <option value="salesDetails">
        Sales Details
      </option>

      <option value="selectedParty">
        Selected Party Wise
      </option>
    </select>
  </div>

  {/* 3. PARTY SELECTION */}
  {partySalesFilters.reportLevel ===
    "selectedParty" && (
    <div className="party-report-field party-field-wide">
      <label>Selected Parties</label>

      <div className="party-multi-select">
        <button
          type="button"
          className="party-multi-select-trigger"
          disabled={
            !partySalesFilters.company ||
            isCriteriaLoading
          }
          onClick={() => {
            if (
              !partySalesFilters.company
            ) {
              setPartyReportError(
                "Please select company first."
              );
              return;
            }

            setShowPartySelector(
              (previous) => !previous
            );

            setPartyReportError("");
          }}
        >
          <span>
            {selectedPartyNames.length > 0
              ? selectedPartyNames.join(
                  ", "
                )
              : "Select party names"}
          </span>

          <span>▼</span>
        </button>

        {showPartySelector && (
          <div className="party-checkbox-dropdown party-checkbox-dropdown-large">
            <div className="party-selector-header">
              <strong>
                Select Parties
              </strong>

              <button
                type="button"
                onClick={() =>
                  setShowPartySelector(
                    false
                  )
                }
              >
                <X size={14} />
              </button>
            </div>

            <div className="party-selector-search">
              <Search size={13} />

              <input
                type="text"
                value={
                  partySelectorSearch
                }
                autoFocus
                placeholder="Search party name..."
                onChange={(event) =>
                  setPartySelectorSearch(
                    event.target.value
                  )
                }
              />
            </div>

            <label className="party-check-row party-check-all">
              <input
                type="checkbox"
                checked={
                  companyFilteredAccounts.length >
                    0 &&
                  partySalesFilters
                    .selectedPartyCodes
                    .length ===
                    companyFilteredAccounts.length
                }
                onChange={(event) =>
                  toggleAllParties(
                    event.target.checked
                  )
                }
              />

              <span>
                Select All Parties
              </span>
            </label>

            <div className="party-checkbox-list">
              {visiblePartyOptions.length >
              0 ? (
                visiblePartyOptions.map(
                  (party, index) => {
                    const partyCode =
                      getAccountCode(
                        party,
                        index
                      );

                    const partyName =
                      getAccountName(
                        party
                      );

                    return (
                      <label
                        key={
                          party._id ||
                          partyCode
                        }
                        className="party-check-row"
                      >
                        <input
                          type="checkbox"
                          checked={partySalesFilters.selectedPartyCodes.includes(
                            partyCode
                          )}
                          onChange={(
                            event
                          ) =>
                            toggleValueInArray(
                              "selectedPartyCodes",
                              partyCode,
                              event
                                .target
                                .checked
                            )
                          }
                        />

                        {/* Only party name is visible */}
                        <span className="party-check-name">
                          {partyName ||
                            "Unnamed Party"}
                        </span>
                      </label>
                    );
                  }
                )
              ) : (
                <div className="party-selector-empty">
                  No mapped party found.
                </div>
              )}
            </div>

            <div className="party-selector-footer">
              {
                partySalesFilters
                  .selectedPartyCodes
                  .length
              }{" "}
              party(s) selected
            </div>
          </div>
        )}
      </div>
    </div>
  )}

  {/* 4. AREA */}
  <div className="party-report-field">
    <label>Selected Area</label>

    <select
      value={
        partySalesFilters.selectedArea
      }
      disabled={
        !partySalesFilters.company
      }
      onChange={(event) => {
        const value =
          event.target.value;

        setPartySalesFilters(
          (previous) => ({
            ...previous,
            selectedArea: value,
            selectedAreaCodes:
              value === "yes"
                ? previous.selectedAreaCodes
                : [],
          })
        );

        if (value === "yes") {
          setShowAreaSelector(true);
        } else {
          setShowAreaSelector(false);
        }

        setPartyReportRows([]);
        setIsPartyReportGenerated(false);
      }}
    >
      <option value="no">
        No
      </option>
      <option value="yes">
        Yes
      </option>
    </select>
  </div>

  {/* 5. SALESMAN */}
  <div className="party-report-field">
    <label>Select Salesman</label>

    <select
      value={
        partySalesFilters.selectedSalesman
      }
      disabled={
        !partySalesFilters.company
      }
      onChange={(event) => {
        const value =
          event.target.value;

        setPartySalesFilters(
          (previous) => ({
            ...previous,

            selectedSalesman: value,

            selectedSalesmanCodes:
              value === "yes"
                ? previous.selectedSalesmanCodes
                : [],
          })
        );

        if (value === "yes") {
          setShowSalesmanSelector(true);
        } else {
          setShowSalesmanSelector(false);
        }

        setPartyReportRows([]);
        setIsPartyReportGenerated(false);
      }}
    >
      <option value="no">
        No
      </option>
      <option value="yes">
        Yes
      </option>
    </select>
  </div>

  {/* 6. PRODUCT WISE */}
 <div className="party-report-field">
  <label>Product Wise</label>

  <select
    value={
      partySalesFilters.reportLevel ===
      "salesDetails"
        ? "yes"
        : partySalesFilters.productWise
    }
    disabled={
      partySalesFilters.reportLevel ===
      "salesDetails"
    }
    onChange={(event) => {
      const value =
        event.target.value;

      setPartySalesFilters(
        (previous) => ({
          ...previous,
          productWise: value,
        })
      );

      setPartyReportRows([]);
      setPartyReportColumns([]);
      setPartyReportSearch("");
      setPartyCurrentPage(1);
      setIsPartyReportGenerated(false);
      setPartyReportError("");
    }}
    title={
      partySalesFilters.reportLevel ===
      "salesDetails"
        ? "Product Wise is required for Sales Details"
        : "Select whether product details should be displayed"
    }
  >
    <option value="no">
      No
    </option>

    <option value="yes">
      Yes
    </option>
  </select>

  {partySalesFilters.reportLevel ===
    "salesDetails" && (
    <small className="party-field-help">
      Product details are always shown
      in Sales Details.
    </small>
  )}
</div>

  {/* 7. FROM DATE */}
  <div className="party-report-field">
    <label>From Date</label>

    <input
      type="date"
      value={
        partySalesFilters.fromDate
      }
      onChange={(event) =>
        updatePartySalesFilter(
          "fromDate",
          event.target.value
        )
      }
    />
  </div>

  {/* 8. TO DATE */}
  <div className="party-report-field">
    <label>To Date</label>

    <input
      type="date"
      value={
        partySalesFilters.toDate
      }
      onChange={(event) =>
        updatePartySalesFilter(
          "toDate",
          event.target.value
        )
      }
    />
  </div>

  {/* 9. CREDIT NOTE */}
  <div className="party-report-field">
    <label>With Credit Note</label>

    <select
      value={
        partySalesFilters.withCreditNote
      }
      onChange={(event) =>
        updatePartySalesFilter(
          "withCreditNote",
          event.target.value
        )
      }
    >
      <option value="no">
        No
      </option>
      <option value="yes">
        Yes
      </option>
    </select>
  </div>

  {/* 10. ORDER BY */}
  <div className="party-report-field">
    <label>Order By</label>

    <select
      value={
        partySalesFilters.orderBy
      }
      onChange={(event) =>
        updatePartySalesFilter(
          "orderBy",
          event.target.value
        )
      }
    >
      <option value="partyName">
        Party Name
      </option>

      <option value="partyCode">
        Party Code
      </option>

      <option value="billDate">
        Bill Date
      </option>

      {(
  partySalesFilters.productWise ===
    "yes" ||
  partySalesFilters.reportLevel ===
    "salesDetails"
) && (
  <option value="productName">
    Product Name
  </option>
)}

      <option value="netAmount">
        Net Amount
      </option>
    </select>
  </div>
</div>
</fieldset>
{showAreaSelector && (
  <div
    className="party-selection-backdrop"
    onMouseDown={(event) => {
      if (
        event.target ===
        event.currentTarget
      ) {
        setShowAreaSelector(false);
      }
    }}
  >
    <div className="party-selection-modal">
      <div className="party-selection-modal-header">
        <div>
          <strong>Select Area</strong>
          <span>
            Only company-mapped areas
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowAreaSelector(false)
          }
        >
          <X size={15} />
        </button>
      </div>

      <div className="party-selector-search">
        <Search size={13} />

        <input
          type="text"
          value={areaSelectorSearch}
          placeholder="Search area name..."
          onChange={(event) =>
            setAreaSelectorSearch(
              event.target.value
            )
          }
        />
      </div>

      <label className="party-check-row party-check-all">
        <input
          type="checkbox"
          checked={
            mappedAreas.length > 0 &&
            partySalesFilters
              .selectedAreaCodes
              .length ===
              mappedAreas.length
          }
          onChange={(event) =>
            toggleAllAreas(
              event.target.checked
            )
          }
        />

        <span>Select All Areas</span>
      </label>

      <div className="party-checkbox-list">
        {visibleAreaOptions.length >
        0 ? (
          visibleAreaOptions.map(
            (area, index) => {
              const areaCode =
                getAreaCode(
                  area,
                  index
                );

              return (
                <label
                  key={
                    area._id ||
                    areaCode
                  }
                  className="party-check-row"
                >
                  <input
                    type="checkbox"
                    checked={partySalesFilters.selectedAreaCodes.includes(
                      areaCode
                    )}
                    onChange={(event) =>
                      toggleValueInArray(
                        "selectedAreaCodes",
                        areaCode,
                        event.target
                          .checked
                      )
                    }
                  />

                  {/* Display area name only */}
                  <span className="party-check-name">
                    {getAreaName(area) ||
                      "Unnamed Area"}
                  </span>
                </label>
              );
            }
          )
        ) : (
          <div className="party-selector-empty">
            No mapped area found.
          </div>
        )}
      </div>

      <div className="party-selection-modal-footer">
        <span>
          {
            partySalesFilters
              .selectedAreaCodes
              .length
          }{" "}
          area(s) selected
        </span>

        <button
          type="button"
          onClick={() =>
            setShowAreaSelector(false)
          }
        >
          <Check size={13} />
          Done
        </button>
      </div>
    </div>
  </div>
)}
{showSalesmanSelector && (
  <div
    className="party-selection-backdrop"
    onMouseDown={(event) => {
      if (
        event.target ===
        event.currentTarget
      ) {
        setShowSalesmanSelector(false);
      }
    }}
  >
    <div className="party-selection-modal">
      <div className="party-selection-modal-header">
        <div>
          <strong>
            Select Salesman
          </strong>

          <span>
            Only company-mapped salesmen
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowSalesmanSelector(
              false
            )
          }
        >
          <X size={15} />
        </button>
      </div>

      <div className="party-selector-search">
        <Search size={13} />

        <input
          type="text"
          value={
            salesmanSelectorSearch
          }
          placeholder="Search salesman name..."
          onChange={(event) =>
            setSalesmanSelectorSearch(
              event.target.value
            )
          }
        />
      </div>

      <label className="party-check-row party-check-all">
        <input
          type="checkbox"
          checked={
            mappedSalesmen.length > 0 &&
            partySalesFilters
              .selectedSalesmanCodes
              .length ===
              mappedSalesmen.length
          }
          onChange={(event) =>
            toggleAllSalesmen(
              event.target.checked
            )
          }
        />

        <span>
          Select All Salesmen
        </span>
      </label>

      <div className="party-checkbox-list">
        {visibleSalesmanOptions.length >
        0 ? (
          visibleSalesmanOptions.map(
            (salesman, index) => {
              const salesmanCode =
                getSalesmanCode(
                  salesman,
                  index
                );

              return (
                <label
                  key={
                    salesman._id ||
                    salesmanCode
                  }
                  className="party-check-row"
                >
                  <input
                    type="checkbox"
                    checked={partySalesFilters.selectedSalesmanCodes.includes(
                      salesmanCode
                    )}
                    onChange={(event) =>
                      toggleValueInArray(
                        "selectedSalesmanCodes",
                        salesmanCode,
                        event.target
                          .checked
                      )
                    }
                  />

                  {/* Display salesman name only */}
                  <span className="party-check-name">
                    {getSalesmanName(
                      salesman
                    ) ||
                      "Unnamed Salesman"}
                  </span>
                </label>
              );
            }
          )
        ) : (
          <div className="party-selector-empty">
            No mapped salesman found.
          </div>
        )}
      </div>

      <div className="party-selection-modal-footer">
        <span>
          {
            partySalesFilters
              .selectedSalesmanCodes
              .length
          }{" "}
          salesman(s) selected
        </span>

        <button
          type="button"
          onClick={() =>
            setShowSalesmanSelector(
              false
            )
          }
        >
          <Check size={13} />
          Done
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
          <div className="party-result-caption">
            Report Results
          </div>

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
          setPartyReportSearch(
            event.target.value
          );

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
      onChange={(event) =>
        setPartyReportZoom(
          event.target.value
        )
      }
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
      disabled={
        isPartyReportLoading ||
        !partySalesFilters.company
      }
      title="Refresh report"
    >
      <RefreshCw size={15} />
    </button>

    <div className="party-toolbar-export">
      <button
        type="button"
        className="party-export-excel"
        onClick={exportPartyReportToExcel}
        disabled={
          !isPartyReportGenerated ||
          filteredPartySalesRows.length === 0
        }
      >
        <FileSpreadsheet size={15} />
        Excel
      </button>

      <button
        type="button"
        className="party-export-csv"
        onClick={exportPartyReportToCsv}
        disabled={
          !isPartyReportGenerated ||
          filteredPartySalesRows.length === 0
        }
      >
        <Download size={15} />
        CSV
      </button>

      <button
        type="button"
        className="party-export-pdf"
        onClick={exportPartyReportToPdf}
        disabled={
          !isPartyReportGenerated ||
          filteredPartySalesRows.length === 0
        }
      >
        <FileText size={15} />
        PDF
      </button>

      <button
        type="button"
        className="party-export-print"
        onClick={printPartyReport}
        disabled={
          !isPartyReportGenerated ||
          filteredPartySalesRows.length === 0
        }
      >
        <Printer size={15} />
        Print
      </button>
    </div>
  </div>
</div>
          <div className="party-report-grid-container">
            {!isPartyReportGenerated ? (
              <div className="party-empty-report">
                <FileBarChart size={40} />

                <strong>No report generated</strong>

                <span>
                  Select the required report filters and click
                  Generate.
                </span>
              </div>
            ) : (
              <div
                className="party-report-zoom"
                style={{
                  zoom: Number(partyReportZoom) / 100,
                }}
              >
                <table className="party-report-table">
  <thead>
    <tr>
      {partyReportColumns.map((column) => (
        <th
          key={column.key}
          className={
            column.type === "number"
              ? "party-report-number"
              : ""
          }
        >
          {column.label}
        </th>
      ))}
    </tr>
  </thead>

  <tbody>
    {filteredPartySalesRows.map(
      (row, rowIndex) => (
        <tr
         key={
  row.rowId ||
  [
    row.billSeries,
    row.billNo,
    row.productCode,
    row.batch,
    rowIndex,
  ]
    .filter(
      (value) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
    .join("-")
}
        >
          {partyReportColumns.map((column) => (
            <td
              key={`${rowIndex}-${column.key}`}
              className={
                column.type === "number"
                  ? "party-report-number"
                  : ""
              }
            >
              {formatPartyReportValue(
  column,
  row[column.key]
)}
            </td>
          ))}
        </tr>
      )
    )}
  </tbody>

  {filteredPartySalesRows.length > 0 && (
    <tfoot>
      <tr>
        {partyReportColumns.map(
          (column, index) => {
            let value = "";

            if (index === 0) {
              value = "TOTAL";
            }
            if (column.key === "qty") {
  value = formatReportNumber(
    partySalesTotals.qty
  );
}

if (column.key === "freeQty") {
  value = formatReportNumber(
    partySalesTotals.freeQty
  );
}

if (
  column.key ===
  "grossAmount"
) {
  value = formatReportNumber(
    partySalesTotals
      .grossAmount
  );
}

if (
  column.key ===
  "tprAmount"
) {
  value = formatReportNumber(
    partySalesTotals.tprAmount
  );
}

if (
  column.key ===
  "schemeAmount"
) {
  value = formatReportNumber(
    partySalesTotals
      .schemeAmount
  );
}

if (
  column.key ===
  "cashDiscountAmount"
) {
  value = formatReportNumber(
    partySalesTotals
      .cashDiscountAmount
  );
}

if (
  column.key ===
  "taxableAmount"
) {
  value = formatReportNumber(
    partySalesTotals
      .taxableAmount
  );
}

if (
  column.key ===
  "gstAmount"
) {
  value = formatReportNumber(
    partySalesTotals.gstAmount
  );
}

if (
  column.key ===
  "creditNoteAmount"
) {
  value = formatReportNumber(
    partySalesTotals
      .creditNoteAmount
  );
}

if (
  column.key ===
  "netAmount"
) {
  value = formatReportNumber(
    partySalesTotals.netAmount
  );
}
            if (column.key === "grossAmount") {
              value = formatReportNumber(
                partySalesTotals.grossAmount
              );
            }

            if (
              column.key === "schemeAmount"
            ) {
              value = formatReportNumber(
                partySalesTotals.schemeAmount
              );
            }

            if (
              column.key ===
              "cashDiscountAmount"
            ) {
              value = formatReportNumber(
                partySalesTotals
                  .cashDiscountAmount
              );
            }

            if (column.key === "gstAmount") {
              value = formatReportNumber(
                partySalesTotals.gstAmount
              );
            }

            if (column.key === "netAmount") {
              value = formatReportNumber(
                partySalesTotals.netAmount
              );
            }

            return (
              <td
                key={column.key}
                className={
                  column.type === "number"
                    ? "party-report-number"
                    : ""
                }
              >
                {value}
              </td>
            );
          }
        )}
      </tr>
    </tfoot>
  )}
</table>
              </div>
            )}
          </div>

          <div className="party-report-statusbar">
            <span>
              Records:{" "}
              {isPartyReportGenerated
                ? filteredPartySalesRows.length
                : 0}
            </span>

            <span>
              Level:{" "}
              {partySalesFilters.reportLevel === "salesSummary"
                ? "Sales Summary"
                : partySalesFilters.reportLevel === "salesDetails"
                  ? "Sales Details"
                  : "Selected Party"}
            </span>

            <span>
              Period: {partySalesFilters.fromDate || "--"} to{" "}
              {partySalesFilters.toDate || "--"}
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
                <div><small>Total Records</small><strong>{filteredPartySalesRows.length.toLocaleString("en-IN")}</strong></div>
              </div>

              <div className="party-summary-item">
                <span className="party-summary-icon"><FileText size={17} /></span>
                <div><small>Report Level</small><strong>{partySalesFilters.reportLevel === "salesSummary" ? "Sales Summary" : partySalesFilters.reportLevel === "salesDetails" ? "Sales Details" : "Selected Party"}</strong></div>
              </div>

              <div className="party-summary-item">
                <span className="party-summary-icon"><ShoppingCart size={17} /></span>
                <div><small>Total Quantity</small><strong>{formatReportNumber(partySalesTotals.qty || 0)}</strong></div>
              </div>

              <div className="party-summary-item">
                <span className="party-summary-icon"><FileBarChart size={17} /></span>
                <div><small>Total Amount</small><strong>₹ {formatReportNumber(partySalesTotals.netAmount || 0)}</strong></div>
              </div>
            </section>

            
          </aside>
        </div>
      </div>
    </div>
  );
}    
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
                    const value =
                      company.companyCode ||
                      company.code ||
                      company._id ||
                      index;

                    const label =
                      company.companyName ||
                      company.name ||
                      company.CompanyName ||
                      value;

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
                    const value =
                      account.accountCode ||
                      account.code ||
                      account._id ||
                      index;

                    const label =
                      account.accountName ||
                      account.name ||
                      value;

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

          {isPartyReport && (
            <div className="report-field report-field-wide">
              <label>Party</label>

              <select defaultValue="">
                <option value="">Select Party</option>

                {accounts.map((account, index) => {
                  const value =
                    account.accountCode ||
                    account.code ||
                    account._id ||
                    index;

                  const label =
                    account.accountName ||
                    account.name ||
                    value;

                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {isProductReport && (
            <div className="report-field report-field-wide">
              <label>Product</label>

              <select defaultValue="">
                <option value="">Select Product</option>

                {products.map((product, index) => {
                  const value =
                    product.productCode ||
                    product.code ||
                    product._id ||
                    index;

                  const label =
                    product.productName ||
                    product.name ||
                    value;

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
                  const value =
                    godown.godownCode ||
                    godown.code ||
                    godown._id ||
                    index;

                  const label =
                    godown.godownName ||
                    godown.name ||
                    value;

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