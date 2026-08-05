import React, { useState, useCallback, useEffect } from "react";
import { secureFetch, usePermission } from "./SecuritySetup";
import "./Transaction.css";
import { useERP } from "./context/ERPContext";
import {
  Plus,
  FileSpreadsheet,
  FileText,
  Printer,
  SlidersHorizontal,
  Search,
  CalendarDays,
  BookOpen,
  ReceiptText,
  CircleCheck,
  ArrowUpRight,
  ArrowDownLeft,
  TriangleAlert,
  Clock3,
  CircleX,
  Wallet,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

const API_URL = "https://total-solution-backend.onrender.com/api";
// const API_URL = "http://localhost:5000/api";
const Transaction = ({
  salesInvoices = [],
  salesmen = [],
  areas = [],
  accounts = [],
  otherAccounts = [],
  customerBanks = [],
  activeTransaction,
  showReceiptForm,
  setShowReceiptForm,
  openFormFor,
  transactionFormMode,
  setActiveTransaction,
  setTransactionFormMode,
  autoVoucherNo = true,
}) => {
  const receiptPermission = usePermission("TRANSACTIONS", "RECEIPT");
  const chequeBouncePermission = usePermission("TRANSACTIONS", "CHEQUE_BOUNCE");
  const pdcDocketPermission = usePermission("TRANSACTIONS", "PDC_DOCKET");           // NEW
const contraPermission = usePermission("TRANSACTIONS", "CONTRA");                 // NEW
const collectionVoucherPermission = usePermission("TRANSACTIONS", "COLLECTION_VOUCHER"); // NEW
  const erpContext = useERP();
  console.log("ERP CONTEXT =", erpContext);
  console.log("ERP STATE =", erpContext?.state);
  console.log("ERP RECEIPTS =", erpContext?.state?.receipts);


  const { state, dispatch } = useERP();
  /* =========================================================
   AUTO VOUCHER NUMBER COMMON HELPERS
========================================================= */

  const cleanVoucherNumber = (value) =>
    String(value ?? "").replace(
      /[^0-9]/g,
      ""
    );

  const requireVoucherNumber = (
    value,
    voucherName
  ) => {
    const voucherNumber =
      cleanVoucherNumber(value);

    if (!voucherNumber) {
      alert(
        autoVoucherNo === true
          ? `${voucherName} number could not be generated.`
          : `Please enter ${voucherName} number.`
      );

      return null;
    }

    return voucherNumber;
  };

  const openTransactionList = (menu) => {
    setActiveTransaction(menu);
    setTransactionFormMode((prev) => ({
      ...(prev || {}),
      [menu]: false
    }));
  };
  const [pendingBillsApi, setPendingBillsApi] =
    useState([]);
  // const [salesmanBills, setSalesmanBills] = useState([]);
  //  const [areaBills, setAreaBills] = useState([]);
  const openTransactionEntry = (menu) => {
    setActiveTransaction(menu);

    if (menu === "Contra") {
      setEditContraId(null);

      setContraFormData({
        transactionDate:
          new Date().toISOString().split("T")[0],

        tranVNo: "",

        transactionType: "CASH DEPOSIT",

        amount: "",
        narration: ""
      });
    }

    if (menu === "Collection Voucher") {
      setEditCollectionVoucherId(null);

      setCollectionVoucherFormData({
        collectionDate:
          new Date().toISOString().split("T")[0],

        colVNo: "",

        narration: "",

        collectionType: "Bill wise"
      });

      setBillItems([]);
      setTotalCollectionAmount(0);
      setTotalCashCollection(0);
      setTotalChequeCollection(0);
      setTotalBills(0);
    }
    if (menu === "Receipt") {
  setEditReceiptId(null);

  setReceiptFormData(
    (previous) => ({
      ...previous,

      receiptDate:
        new Date()
          .toISOString()
          .split("T")[0],

      rno:
        autoVoucherNo === true
          ? String(
              (state.receipts || [])
                .length + 1
            )
          : "",
    })
  );
}

if (menu === "Payment") {
  setPaymentFormData(
    (previous) => ({
      ...previous,

      vDate:
        new Date()
          .toISOString()
          .split("T")[0],

      vNo:
        autoVoucherNo === true
          ? String(
              (state.payments?.length ||
                0) + 1
            )
          : "",
    })
  );
}

if (
  menu === "Journal Voucher" ||
  menu === "Journal"
) {
  setJournalFormData(
    (previous) => ({
      ...previous,

      vDate:
        new Date()
          .toISOString()
          .split("T")[0],

      vNo:
        autoVoucherNo === true
          ? String(
              (state.journals?.length ||
                0) + 1
            )
          : "",
    })
  );
}

if (menu === "PDC Docket") {
  setEditPDCDocketId(null);

  setPDCDocketFormData(
    (previous) => ({
      ...previous,

      depositDate:
        new Date()
          .toISOString()
          .split("T")[0],

      docVNo:
        autoVoucherNo === true
          ? String(
              (state.pdcDockets?.length ||
                0) + 1
            )
          : "",
    })
  );
}

    setTransactionFormMode((previous) => ({
      ...previous,
      [menu]: true
    }));
  };





  const [billItems, setBillItems] = useState([]);

  useEffect(() => {

    loadCollectionVouchers();

  }, []);


  useEffect(() => {

    loadPDCDockets();
    loadContra();

  }, []);

  useEffect(() => {
    console.log("LOAD RECEIPTS CALLED");

    loadReceipts();

  }, [dispatch]);





  useEffect(() => {
    loadChequeBounces();
  }, []);
  // =========================
  // MODAL STATES FOR COLLECTION VOUCHER
  // =========================
  const [showBillSelectionModal, setShowBillSelectionModal] = useState(false);
  const [showSalesmanSelectionModal, setShowSalesmanSelectionModal] = useState(false);
  const [showAreaSelectionModal, setShowAreaSelectionModal] = useState(false);
  const [currentSelectionType, setCurrentSelectionType] = useState("");
  const [pdcDocketItems, setPDCDocketItems] = useState([]);
  // =========================
  // RECEIPT STATES
  // =========================
  const [receiptFiltersVisible, setReceiptFiltersVisible] =
    useState(false);
  const createDefaultReceiptListFilters = () => ({
    fromDate: "",
    toDate: "",
    receiptType: "",
    party: "",
  });

  const [receiptDraftFilters, setReceiptDraftFilters] =
    useState(() =>
      createDefaultReceiptListFilters()
    );

  const [receiptAppliedFilters, setReceiptAppliedFilters] =
    useState(() =>
      createDefaultReceiptListFilters()
    );
  // const [showReceiptForm, setShowReceiptForm] = useState(false);
  /* =========================================================
   RECEIPT LIST SEARCH AND PAGINATION
   ========================================================= */

  const [receiptListSearch, setReceiptListSearch] =
    useState("");

  const [receiptListCurrentPage, setReceiptListCurrentPage] =
    useState(1);

  const [receiptListRowsPerPage, setReceiptListRowsPerPage] =
    useState(10);
  /* =========================================================
 RECEIPT LIST BACKEND PAGINATION STATES
 ========================================================= */

  const [
    receiptListTotalPages,
    setReceiptListTotalPages,
  ] = useState(1);

  const [
    receiptListTotalRecords,
    setReceiptListTotalRecords,
  ] = useState(0);

  const [
    receiptListStartRecord,
    setReceiptListStartRecord,
  ] = useState(0);

  const [
    receiptListEndRecord,
    setReceiptListEndRecord,
  ] = useState(0);

  const [
    receiptListLoading,
    setReceiptListLoading,
  ] = useState(false);

  /*
   * This value is sent to the backend after
   * the user stops typing.
   */
  const [
    receiptListSearchDebounced,
    setReceiptListSearchDebounced,
  ] = useState("");
  /* =========================================================
 RECEIPT LIST FILTER HANDLERS
 Keep these inside Transaction component,
 but outside every other function
 ========================================================= */

  const handleReceiptDraftFilterChange = (
    field,
    value
  ) => {
    setReceiptDraftFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const applyReceiptListFilters = () => {
    const nextFilters = {
      ...receiptDraftFilters,
    };

    setReceiptAppliedFilters(
      nextFilters
    );

    setReceiptListCurrentPage(1);
  };

  const clearReceiptListFilters = () => {
    const clearedFilters =
      createDefaultReceiptListFilters();

    setReceiptDraftFilters(
      clearedFilters
    );

    setReceiptAppliedFilters(
      clearedFilters
    );

    setReceiptListSearch("");
    setReceiptListSearchDebounced("");
    setReceiptListCurrentPage(1);
  };
  const [editReceiptId, setEditReceiptId] = useState(null);
  const [partySuggestions, setPartySuggestions] = useState([]);
  const [partySearchActive, setPartySearchActive] = useState(false);
  const [partyNotFound, setPartyNotFound] = useState(false);
  const [activePartySuggestionIndex, setActivePartySuggestionIndex] =
    useState(-1);
  const [receiptFormData, setReceiptFormData] =
    useState({
      receiptDate:
        new Date()
          .toISOString()
          .split("T")[0],

      rno:
        autoVoucherNo === true
          ? (state.receipts || []).length + 1
          : "",

      billSeries: "",
      billNo: "",

      salesman: "",
      salesmanId: "",
      salesmanName: "",

      partyId: "",
      partyName: "",

      narration: "",

      /*
       * Our Bank/Cash account
       */
      bankCash: "",

      loadNo: "",

      receiptAmount: "",

      chequeNo: "",
      chequeDate: "",

      rloadNo: "",

      /*
       * Customer cheque bank
       */
      drawerBankId: "",
      drawerBank: "",
      drawerBankName: "",

      micr: "",

      pdcType:
        "LOCAL BANK",

      companyId: "",
      firmId: "",
      distributorId: ""
    });
  useEffect(() => {
    const receiptFormIsOpen =
      activeTransaction === "Receipt" &&
      showReceiptForm === true;

    if (
      !receiptFormIsOpen ||
      editReceiptId
    ) {
      return;
    }

    setReceiptFormData(
      (previous) => ({
        ...previous,

        rno:
          autoVoucherNo === true
            ? String(
              (state.receipts || [])
                .length + 1
            )
            : "",
      })
    );
  }, [
    activeTransaction,
    showReceiptForm,
    editReceiptId,
    autoVoucherNo,
    state.receipts?.length,
  ]);
  const [receiptItems, setReceiptItems] = useState([]);
  const [receiptSummary, setReceiptSummary] = useState({
    totalAdjusted: 0,
    balanceAmount: 0,
    totalDiscount: 0
  });

  // =========================
  // PAYMENT STATES
  // =========================
  // const [showPaymentForm, setShowPaymentForm] = useState(false);
  /* =========================================================
   PAYMENT LIST STATES
   ========================================================= */

  const createDefaultPaymentListFilters = () => ({
    fromDate: "",
    toDate: "",
    party: "",
    paymentType: "",
  });

  const [paymentListSearch, setPaymentListSearch] =
    useState("");

  const [
    paymentListCurrentPage,
    setPaymentListCurrentPage,
  ] = useState(1);

  const [
    paymentListRowsPerPage,
    setPaymentListRowsPerPage,
  ] = useState(10);

  const [
    paymentFiltersVisible,
    setPaymentFiltersVisible,
  ] = useState(false);

  const [
    paymentDraftFilters,
    setPaymentDraftFilters,
  ] = useState(() =>
    createDefaultPaymentListFilters()
  );

  const [
    paymentAppliedFilters,
    setPaymentAppliedFilters,
  ] = useState(() =>
    createDefaultPaymentListFilters()
  );

  const handlePaymentDraftFilterChange = (
    field,
    value
  ) => {
    setPaymentDraftFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const applyPaymentListFilters = () => {
    setPaymentAppliedFilters({
      ...paymentDraftFilters,
    });

    setPaymentListCurrentPage(1);
  };

  const clearPaymentListFilters = () => {
    const clearedFilters =
      createDefaultPaymentListFilters();

    setPaymentDraftFilters(clearedFilters);
    setPaymentAppliedFilters(clearedFilters);
    setPaymentListSearch("");
    setPaymentListCurrentPage(1);
  };
  const [paymentPartySuggestions, setPaymentPartySuggestions] = useState([]);
  const [paymentFormData, setPaymentFormData] = useState({
    vDate: new Date().toISOString().split("T")[0],
    vNo:
      autoVoucherNo === true
        ? (state.payments?.length || 0) + 1
        : "",
    narr: "",
    partyName: "",
    drAmt: "",
    chqNo: "",
    bankCash: "",
    crAmt: "",
    chqDate: "",
    adjustedAc1: "",
    drCr1: "Dr",
    clearingDate: "",
    adjustedAc2: "",
    drCr2: "Cr",
    partyBankName: "",
    bankAccountNo: ""
  });
  useEffect(() => {
    const paymentFormIsOpen =
      activeTransaction === "Payment" &&
      transactionFormMode?.["Payment"];

    if (!paymentFormIsOpen) {
      return;
    }

    setPaymentFormData(
      (previous) => ({
        ...previous,

        vNo:
          autoVoucherNo === true
            ? String(
              (state.payments?.length || 0) +
              1
            )
            : "",
      })
    );
  }, [
    activeTransaction,
    transactionFormMode?.["Payment"],
    autoVoucherNo,
    state.payments?.length,
  ]);
  const [paymentItems, setPaymentItems] = useState([{
    id: Date.now(),
    srNo: 1,
    trn: "",
    trnSeries: "",
    voucherNo: "",
    amount: "",
    adjustedAmt: "",
    balanceAmt: "",
    newAdjusted: ""
  }]);
  const [paymentSummary, setPaymentSummary] = useState({
    adjustedAmt: 0,
    balanceAmt: 0,
    totalDrAmt: 0,
    totalCrAmt: 0
  });

  // =========================
  // JOURNAL STATES
  // =========================
  // const [showJournalForm, setShowJournalForm] = useState(false);
  /* =========================================================
   JOURNAL VOUCHER LIST STATES
   ========================================================= */

  const createDefaultJournalListFilters = () => ({
    fromDate: "",
    toDate: "",
    voucherNo: "",
    narration: "",
    balanceStatus: "",
  });

  const [
    journalListSearch,
    setJournalListSearch,
  ] = useState("");

  const [
    journalListCurrentPage,
    setJournalListCurrentPage,
  ] = useState(1);

  const [
    journalListRowsPerPage,
    setJournalListRowsPerPage,
  ] = useState(10);

  const [
    journalFiltersVisible,
    setJournalFiltersVisible,
  ] = useState(false);

  const [
    journalDraftFilters,
    setJournalDraftFilters,
  ] = useState(() =>
    createDefaultJournalListFilters()
  );

  const [
    journalAppliedFilters,
    setJournalAppliedFilters,
  ] = useState(() =>
    createDefaultJournalListFilters()
  );

  const handleJournalDraftFilterChange = (
    field,
    value
  ) => {
    setJournalDraftFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const applyJournalListFilters = () => {
    setJournalAppliedFilters({
      ...journalDraftFilters,
    });

    setJournalListCurrentPage(1);
  };

  const clearJournalListFilters = () => {
    const clearedFilters =
      createDefaultJournalListFilters();

    setJournalDraftFilters(clearedFilters);
    setJournalAppliedFilters(clearedFilters);
    setJournalListSearch("");
    setJournalListCurrentPage(1);
  };
  const [accountSuggestions, setAccountSuggestions] = useState([]);
  const [activeAccountRow, setActiveAccountRow] = useState(null);
  const [journalFormData, setJournalFormData] = useState({
    vDate: new Date().toISOString().split("T")[0],
    vNo:
      autoVoucherNo === true
        ? (state.journals?.length || 0) + 1
        : "",
    narr: "",
    isGst: "N"
  });
  useEffect(() => {
    const journalFormIsOpen =
      activeTransaction ===
      "Journal Voucher" &&
      transactionFormMode?.[
      "Journal Voucher"
      ];

    if (!journalFormIsOpen) {
      return;
    }

    setJournalFormData(
      (previous) => ({
        ...previous,

        vNo:
          autoVoucherNo === true
            ? String(
              (state.journals?.length || 0) +
              1
            )
            : "",
      })
    );
  }, [
    activeTransaction,
    transactionFormMode?.[
    "Journal Voucher"
    ],
    autoVoucherNo,
    state.journals?.length,
  ]);
  const [journalItems, setJournalItems] = useState([{
    id: Date.now(),
    seqNo: 1,
    accountCode: "",
    accountName: "",
    drAmount: 0,
    crAmount: 0
  }]);
  const [journalSummary, setJournalSummary] = useState({
    totalDr: 0,
    totalCr: 0,
    difference: 0,
    totalEntries: 0
  });

  // =========================
  // CHEQUE BOUNCE STATES
  // =========================
  // const [showChequeBounceForm, setShowChequeBounceForm] = useState(false);

  const [currentSeries, setCurrentSeries] = useState(
    localStorage.getItem("chequeBounceSeries") || ""
  );
  const [editChequeBounceId, setEditChequeBounceId] = useState(null);

 useEffect(() => {
  const chequeBounceFormIsOpen =
    activeTransaction ===
      "Cheque Bounce" &&
    transactionFormMode?.[
      "Cheque Bounce"
    ];

  if (
    !chequeBounceFormIsOpen ||
    editChequeBounceId
  ) {
    return;
  }

  const savedSeries = String(
    currentSeries ||
    localStorage.getItem(
      "chequeBounceSeries"
    ) ||
    ""
  )
    .trim()
    .toUpperCase();

  if (autoVoucherNo !== true) {
    setChequeBounceFormData(
      (previous) => ({
        ...previous,
        trnNo: "",
        chqBounceNo: "",
        isAutoGenerated: false,
      })
    );

    return;
  }

  if (!savedSeries) {
    return;
  }

  loadNextChequeBounceNo(
    savedSeries
  );
}, [
  activeTransaction,
  transactionFormMode?.[
    "Cheque Bounce"
  ],
  editChequeBounceId,
  currentSeries,
  autoVoucherNo,
]);
  /* =========================================================
   CHEQUE BOUNCE LIST STATES
   ========================================================= */

  const [chequeBounceListSearch, setChequeBounceListSearch] =
    useState("");

  const [
    chequeBounceListCurrentPage,
    setChequeBounceListCurrentPage,
  ] = useState(1);

  const [
    chequeBounceListRowsPerPage,
    setChequeBounceListRowsPerPage,
  ] = useState(10);
  /* =========================================================
   CHEQUE BOUNCE BACKEND PAGINATION STATES
   ========================================================= */

  const [
    chequeBounceListTotalPages,
    setChequeBounceListTotalPages,
  ] = useState(1);

  const [
    chequeBounceListTotalRecords,
    setChequeBounceListTotalRecords,
  ] = useState(0);

  const [
    chequeBounceListStartRecord,
    setChequeBounceListStartRecord,
  ] = useState(0);

  const [
    chequeBounceListEndRecord,
    setChequeBounceListEndRecord,
  ] = useState(0);

  const [
    chequeBounceListLoading,
    setChequeBounceListLoading,
  ] = useState(false);

  const [
    chequeBounceListSearchDebounced,
    setChequeBounceListSearchDebounced,
  ] = useState("");

  const [
    chequeBounceFiltersVisible,
    setChequeBounceFiltersVisible,
  ] = useState(false);

  const createDefaultChequeBounceFilters = () => ({
    fromDate: "",
    toDate: "",
    party: "",
    bank: "",
    chequeNo: "",
  });

  const [
    chequeBounceDraftFilters,
    setChequeBounceDraftFilters,
  ] = useState(() =>
    createDefaultChequeBounceFilters()
  );

  const [
    chequeBounceAppliedFilters,
    setChequeBounceAppliedFilters,
  ] = useState(() =>
    createDefaultChequeBounceFilters()
  );
  const handleChequeBounceDraftFilterChange = (
    field,
    value
  ) => {
    setChequeBounceDraftFilters(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  };

  const applyChequeBounceFilters = () => {
    setChequeBounceAppliedFilters({
      ...chequeBounceDraftFilters,
    });

    setChequeBounceListCurrentPage(1);
  };

  const clearChequeBounceFilters = () => {
    const clearedFilters =
      createDefaultChequeBounceFilters();

    setChequeBounceDraftFilters(
      clearedFilters
    );

    setChequeBounceAppliedFilters(
      clearedFilters
    );

    setChequeBounceListSearch("");
    setChequeBounceListSearchDebounced("");
    setChequeBounceListCurrentPage(1);
  };


  const [chequeBounceFormData, setChequeBounceFormData] = useState({
    chqBounceDate: new Date().toISOString().split("T")[0],

    trnSeries: "",
    trnNo: "",

    chqBounceNo: "",
    isAutoGenerated: false,

    narration: "",
    partyName: "",
    chqBounceCharges: "0.00",
    chequeNo: "",
    chequeDate: "",
    chequeAmt: "",
    clearingDate: "",
    receiptNo: "",
    bankName: "",
    totalAmt: ""
  });

  // =========================
  // PDC DOCKET STATES
  // =========================
  // const [showPDCDocketForm, setShowPDCDocketForm] = useState(false);
  /* =========================================================
   PDC DOCKET LIST STATES
   ========================================================= */

  const createDefaultPDCDocketListFilters = () => ({
    fromDepositDate: "",
    toDepositDate: "",
    houseBank: "",
    pdcType: "",
    docketNo: "",
  });

  const [pdcDocketListSearch, setPDCDocketListSearch] =
    useState("");

  const [
    pdcDocketListCurrentPage,
    setPDCDocketListCurrentPage,
  ] = useState(1);

  const [
    pdcDocketListRowsPerPage,
    setPDCDocketListRowsPerPage,
  ] = useState(10);
  /* =========================================================
   PDC DOCKET BACKEND PAGINATION STATES
   ========================================================= */

  const [
    pdcDocketListTotalPages,
    setPDCDocketListTotalPages,
  ] = useState(1);

  const [
    pdcDocketListTotalRecords,
    setPDCDocketListTotalRecords,
  ] = useState(0);

  const [
    pdcDocketListStartRecord,
    setPDCDocketListStartRecord,
  ] = useState(0);

  const [
    pdcDocketListEndRecord,
    setPDCDocketListEndRecord,
  ] = useState(0);

  const [
    pdcDocketListLoading,
    setPDCDocketListLoading,
  ] = useState(false);

  const [
    pdcDocketListSearchDebounced,
    setPDCDocketListSearchDebounced,
  ] = useState("");

  const [
    pdcDocketFiltersVisible,
    setPDCDocketFiltersVisible,
  ] = useState(false);

  const [
    pdcDocketDraftFilters,
    setPDCDocketDraftFilters,
  ] = useState(() =>
    createDefaultPDCDocketListFilters()
  );

  const [
    pdcDocketAppliedFilters,
    setPDCDocketAppliedFilters,
  ] = useState(() =>
    createDefaultPDCDocketListFilters()
  );

  const handlePDCDocketDraftFilterChange = (
    field,
    value
  ) => {
    setPDCDocketDraftFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const applyPDCDocketListFilters = () => {
    setPDCDocketAppliedFilters({
      ...pdcDocketDraftFilters,
    });

    setPDCDocketListCurrentPage(1);
  };

  const clearPDCDocketListFilters = () => {
    const clearedFilters =
      createDefaultPDCDocketListFilters();

    setPDCDocketDraftFilters(
      clearedFilters
    );

    setPDCDocketAppliedFilters(
      clearedFilters
    );

    setPDCDocketListSearch("");

    setPDCDocketListSearchDebounced(
      ""
    );

    setPDCDocketListCurrentPage(
      1
    );
  };
  const [editPDCDocketId, setEditPDCDocketId] = useState(null);
  const [pdcDocketFormData, setPDCDocketFormData] =
    useState({
      depositDate:
        new Date()
          .toISOString()
          .split("T")[0],

      docSeries: "PDC",

 docVNo:
  autoVoucherNo === true
    ? (state.pdcDockets?.length || 0) +
      1
    : "",

      fromDate:
        new Date()
          .toISOString()
          .split("T")[0],

      toDate:
        new Date()
          .toISOString()
          .split("T")[0],

      houseBank: "",
      bankName: "",
      houseBankId: "",
      houseBankName: "",

      narration: "",
      clearingType: "SAME BANK",
      clearingDate: "",
      totalAmount: "0.00",
      totalCheques: "0"
    });
    useEffect(() => {
  const pdcFormIsOpen =
    activeTransaction ===
      "PDC Docket" &&
    transactionFormMode?.[
      "PDC Docket"
    ];

  if (
    !pdcFormIsOpen ||
    editPDCDocketId
  ) {
    return;
  }

  setPDCDocketFormData(
    (previous) => ({
      ...previous,

      docVNo:
        autoVoucherNo === true
          ? String(
              (state.pdcDockets?.length ||
                0) + 1
            )
          : "",
    })
  );
}, [
  activeTransaction,
  transactionFormMode?.[
    "PDC Docket"
  ],
  editPDCDocketId,
  autoVoucherNo,
  state.pdcDockets?.length,
]);

  // =========================
  // CONTRA STATES
  // =========================
  // const [showContraForm, setShowContraForm] = useState(false);

  /* =========================================================
   CONTRA LIST STATES
   ========================================================= */

  const createDefaultContraListFilters = () => ({
    fromDate: "",
    toDate: "",
    transactionType: "",
    voucherNo: "",
    narration: "",
  });

  const [contraListSearch, setContraListSearch] =
    useState("");

  const [
    contraListCurrentPage,
    setContraListCurrentPage,
  ] = useState(1);

  const [
    contraListRowsPerPage,
    setContraListRowsPerPage,
  ] = useState(10);

  /* =========================
     BACKEND PAGINATION STATES
  ========================= */

  const [
    contraListTotalPages,
    setContraListTotalPages,
  ] = useState(1);

  const [
    contraListTotalRecords,
    setContraListTotalRecords,
  ] = useState(0);

  const [
    contraListStartRecord,
    setContraListStartRecord,
  ] = useState(0);

  const [
    contraListEndRecord,
    setContraListEndRecord,
  ] = useState(0);

  const [
    contraListLoading,
    setContraListLoading,
  ] = useState(false);

  const [
    contraListSearchDebounced,
    setContraListSearchDebounced,
  ] = useState("");

  const [
    contraFiltersVisible,
    setContraFiltersVisible,
  ] = useState(false);

  const [
    contraDraftFilters,
    setContraDraftFilters,
  ] = useState(() =>
    createDefaultContraListFilters()
  );

  const [
    contraAppliedFilters,
    setContraAppliedFilters,
  ] = useState(() =>
    createDefaultContraListFilters()
  );

  const handleContraDraftFilterChange = (
    field,
    value
  ) => {
    setContraDraftFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const applyContraListFilters = () => {
    setContraAppliedFilters({
      ...contraDraftFilters,
    });

    setContraListCurrentPage(1);
  };
  const clearContraListFilters = () => {
    const clearedFilters =
      createDefaultContraListFilters();

    setContraDraftFilters(
      clearedFilters
    );

    setContraAppliedFilters(
      clearedFilters
    );

    setContraListSearch("");

    setContraListSearchDebounced(
      ""
    );

    setContraListCurrentPage(
      1
    );
  };
  const [editContraId, setEditContraId] = useState(null);
  const [contraFormData, setContraFormData] = useState({
    transactionDate: new Date().toISOString().split("T")[0],
    tranVNo: "",
    transactionType: "CASH DEPOSIT",
    amount: "",
    narration: ""
  });

  useEffect(() => {
    const contraFormIsOpen =
      activeTransaction === "Contra" &&
      transactionFormMode?.["Contra"];

    if (
      !contraFormIsOpen ||
      editContraId
    ) {
      return;
    }

    if (autoVoucherNo !== true) {
      setContraFormData(
        (previous) => ({
          ...previous,
          tranVNo: "",
        })
      );

      return;
    }

    if (
      String(
        contraFormData.tranVNo || ""
      ).trim()
    ) {
      return;
    }

    loadNextContraNo();
  }, [
    activeTransaction,
    transactionFormMode?.["Contra"],
    editContraId,
    autoVoucherNo,
    contraFormData.tranVNo,
  ]);

  // =========================
  // COLLECTION VOUCHER STATES
  // =========================

  /* =========================================================
   COLLECTION VOUCHER LIST STATES
   ========================================================= */

  const createDefaultCollectionVoucherFilters = () => ({
    fromDate: "",
    toDate: "",
    collectionType: "",
    voucherNo: "",
    minimumAmount: "",
  });

  const [
    collectionVoucherSearch,
    setCollectionVoucherSearch,
  ] = useState("");

  const [
    collectionVoucherCurrentPage,
    setCollectionVoucherCurrentPage,
  ] = useState(1);

  const [
    collectionVoucherRowsPerPage,
    setCollectionVoucherRowsPerPage,
  ] = useState(10);

  /* =========================================================
   COLLECTION VOUCHER BACKEND PAGINATION STATES
   ========================================================= */

  const [
    collectionVoucherTotalPages,
    setCollectionVoucherTotalPages,
  ] = useState(1);

  const [
    collectionVoucherTotalRecords,
    setCollectionVoucherTotalRecords,
  ] = useState(0);

  const [
    collectionVoucherStartRecord,
    setCollectionVoucherStartRecord,
  ] = useState(0);

  const [
    collectionVoucherEndRecord,
    setCollectionVoucherEndRecord,
  ] = useState(0);

  const [
    collectionVoucherListLoading,
    setCollectionVoucherListLoading,
  ] = useState(false);

  const [
    collectionVoucherSearchDebounced,
    setCollectionVoucherSearchDebounced,
  ] = useState("");
  const [
    collectionVoucherFiltersVisible,
    setCollectionVoucherFiltersVisible,
  ] = useState(false);

  const [
    collectionVoucherDraftFilters,
    setCollectionVoucherDraftFilters,
  ] = useState(() =>
    createDefaultCollectionVoucherFilters()
  );

  const [
    collectionVoucherAppliedFilters,
    setCollectionVoucherAppliedFilters,
  ] = useState(() =>
    createDefaultCollectionVoucherFilters()
  );

  const handleCollectionVoucherFilterChange = (
    field,
    value
  ) => {
    setCollectionVoucherDraftFilters(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  };

  const applyCollectionVoucherFilters = () => {
    setCollectionVoucherAppliedFilters({
      ...collectionVoucherDraftFilters,
    });

    setCollectionVoucherCurrentPage(1);
  };

  const clearCollectionVoucherFilters = () => {
    const clearedFilters =
      createDefaultCollectionVoucherFilters();

    setCollectionVoucherDraftFilters(
      clearedFilters
    );

    setCollectionVoucherAppliedFilters(
      clearedFilters
    );

    setCollectionVoucherSearch("");

    setCollectionVoucherSearchDebounced(
      ""
    );

    setCollectionVoucherCurrentPage(
      1
    );
  };
  // const [showCollectionVoucherForm, setShowCollectionVoucherForm] = useState(false);
  const [editCollectionVoucherId, setEditCollectionVoucherId] = useState(null);
  const [collectionVoucherFormData, setCollectionVoucherFormData] = useState({
    collectionDate: new Date().toISOString().split("T")[0],
    colVNo: "",
    narration: "",
    collectionType: "Bill wise"
  });
  useEffect(() => {
    const collectionVoucherFormIsOpen =
      activeTransaction ===
      "Collection Voucher" &&
      transactionFormMode?.[
      "Collection Voucher"
      ];

    if (
      !collectionVoucherFormIsOpen ||
      editCollectionVoucherId
    ) {
      return;
    }

    /*
     * Auto Voucher No OFF:
     * Keep the field empty for manual input.
     */
    if (autoVoucherNo !== true) {
      setCollectionVoucherFormData(
        (previous) => ({
          ...previous,
          colVNo: "",
        })
      );

      return;
    }

    /*
     * Auto Voucher No ON:
     * Generate only when the field is empty.
     */
    if (
      String(
        collectionVoucherFormData.colVNo ||
        ""
      ).trim()
    ) {
      return;
    }

    loadNextCollectionVoucherNo();
  }, [
    activeTransaction,
    transactionFormMode?.[
    "Collection Voucher"
    ],
    editCollectionVoucherId,
    autoVoucherNo,
    collectionVoucherFormData.colVNo,
  ]);
  const [showCollectionReceiptModal, setShowCollectionReceiptModal] = useState(false);
  const [collectionReceiptBillId, setCollectionReceiptBillId] = useState(null);
  const [totalCollectionAmount, setTotalCollectionAmount] = useState(0);
  const [totalCashCollection, setTotalCashCollection] = useState(0);
  const [totalChequeCollection, setTotalChequeCollection] = useState(0);
  const [totalBills, setTotalBills] = useState(0);

  // =========================
  // DUMMY DATA FOR COLLECTION VOUCHER MODALS
  // =========================
  // Replace the entire getCollectionPendingBills function
  const getCollectionPendingBills = () => {
    if (!Array.isArray(salesInvoices) || salesInvoices.length === 0) {
      return [];
    }

    const normalizeValue = (value) =>
      String(value ?? "").trim().toLowerCase();

    const resolveSalesman = (...values) => {
      const rawValue = values.find(
        (value) =>
          value !== undefined &&
          value !== null &&
          String(value).trim() !== ""
      );

      if (!rawValue) {
        return {
          code: "",
          name: ""
        };
      }

      const normalizedRawValue = normalizeValue(rawValue);

      const matchedSalesman = (salesmen || []).find((salesman) => {
        const salesmanCode =
          salesman.salesmanCode ||
          salesman.code ||
          salesman.SalesmanCode ||
          salesman.smCode ||
          "";

        const salesmanName =
          salesman.salesmanName ||
          salesman.name ||
          salesman.SalesmanName ||
          salesman.smName ||
          "";

        return (
          normalizeValue(salesmanCode) === normalizedRawValue ||
          normalizeValue(salesmanName) === normalizedRawValue
        );
      });

      return {
        code:
          matchedSalesman?.salesmanCode ||
          matchedSalesman?.code ||
          matchedSalesman?.SalesmanCode ||
          matchedSalesman?.smCode ||
          String(rawValue).trim(),

        name:
          matchedSalesman?.salesmanName ||
          matchedSalesman?.name ||
          matchedSalesman?.SalesmanName ||
          matchedSalesman?.smName ||
          String(rawValue).trim()
      };
    };

    const resolveArea = (...values) => {
      const rawValue = values.find(
        (value) =>
          value !== undefined &&
          value !== null &&
          String(value).trim() !== ""
      );

      if (!rawValue) {
        return {
          code: "",
          name: ""
        };
      }

      const normalizedRawValue = normalizeValue(rawValue);


      const matchedArea = (areas || []).find((area) => {
        const areaCode =
          area.areaCode ||
          area.code ||
          area.AreaCode ||
          area.routeCode ||
          "";

        const areaName =
          area.areaName ||
          area.name ||
          area.AreaName ||
          area.routeName ||
          "";

        return (
          normalizeValue(areaCode) === normalizedRawValue ||
          normalizeValue(areaName) === normalizedRawValue
        );
      });

      return {
        code:
          matchedArea?.areaCode ||
          matchedArea?.code ||
          matchedArea?.AreaCode ||
          matchedArea?.routeCode ||
          String(rawValue).trim(),

        name:
          matchedArea?.areaName ||
          matchedArea?.name ||
          matchedArea?.AreaName ||
          matchedArea?.routeName ||
          String(rawValue).trim()
      };
    };

    return salesInvoices
      .map((invoice, index) => {
        const header =
          invoice.header ||
          invoice.Header ||
          {};

        const summary =
          invoice.summary ||
          invoice.Summary ||
          {};

        const salesmanDetails = resolveSalesman(
          invoice.salesmanName,
          invoice.salesManName,
          invoice.salesman,
          invoice.salesMan,
          invoice.salesmanCode,
          invoice.salesManCode,
          invoice.SalesmanName,
          invoice.SalesmanCode,

          header.salesmanName,
          header.salesManName,
          header.salesman,
          header.salesMan,
          header.salesmanCode,
          header.salesManCode,
          header.SalesmanName,
          header.SalesmanCode
        );

        const areaDetails = resolveArea(
          invoice.areaName,
          invoice.area,
          invoice.areaCode,
          invoice.routeName,
          invoice.route,
          invoice.routeCode,
          invoice.AreaName,
          invoice.AreaCode,

          header.areaName,
          header.area,
          header.areaCode,
          header.routeName,
          header.route,
          header.routeCode,
          header.AreaName,
          header.AreaCode
        );

        const billSeries = pickValue(
          invoice.billSeries,
          invoice.BillSeries,
          invoice.trnSeries,
          invoice.TrnSeries,

          header.billSeries,
          header.BillSeries,
          header.trnSeries,
          header.TrnSeries,
          header.series
        );

        const billNo = pickValue(
          invoice.billNo,
          invoice.billNumber,
          invoice.BillNo,
          invoice.trnNo,
          invoice.TrnNo,

          header.billNo,
          header.billNumber,
          header.BillNo,
          header.trnNo,
          header.TrnNo
        );

        const billAmount =
          Number(
            pickValue(
              invoice.amount,
              invoice.netAmount,
              invoice.NetAmount,
              invoice.billAmount,
              invoice.grandTotal,

              summary.net,
              summary.netAmount,
              summary.NetAmount,
              summary.grandTotal,
              summary.totalAmount
            )
          ) || 0;

        const oldCollection =
          getReceiptAdjustedAmount(
            billSeries,
            billNo
          );

        const balance = Math.max(
          billAmount - oldCollection,
          0
        );

        return {
          id:
            invoice._id ||
            invoice.id ||
            `${billSeries}-${billNo}-${index}`,

          billSeries: billSeries || "",
          billNo: billNo || "",

          billDate:
            pickValue(
              invoice.billDate,
              invoice.BillDate,
              invoice.date,
              invoice.trnDate,

              header.billDate,
              header.BillDate,
              header.date,
              header.trnDate
            ) || "",

          partyCode:
            pickValue(
              invoice.partyCode,
              invoice.PartyCode,
              invoice.accountCode,

              header.partyCode,
              header.PartyCode,
              header.accountCode
            ) || "",

          partyName:
            pickValue(
              invoice.partyName,
              invoice.PartyName,
              invoice.party,
              invoice.customerName,
              invoice.accountName,

              header.partyName,
              header.PartyName,
              header.party,
              header.customerName,
              header.accountName
            ) || "",

          billAmt: billAmount,
          oldCollection,
          balance,

          salesmanCode: salesmanDetails.code,
          salesmanName: salesmanDetails.name,

          areaCode: areaDetails.code,
          areaName: areaDetails.name,

          selected: false,
          collectionAmt: 0,
          discount: 0,
          recSeries: "",
          recVNo: ""
        };
      })
      .filter(
        (bill) =>
          String(bill.billNo || "").trim() &&
          Number(bill.balance || 0) > 0
      );
  };
  const getUniqueSalesmen = () => {
    const bills = getCollectionPendingBills();
    const salesmanMap = new Map();

    bills.forEach((bill) => {
      const salesmanCode = String(
        bill.salesmanCode || ""
      ).trim();

      const salesmanName = String(
        bill.salesmanName || ""
      ).trim();

      /*
       * Do not create an UNKNOWN salesman group.
       * Bills without a salesman will not appear in
       * Salesman-wise selection.
       */
      if (!salesmanCode && !salesmanName) {
        return;
      }

      const key = clean(
        salesmanCode || salesmanName
      );

      if (!salesmanMap.has(key)) {
        salesmanMap.set(key, {
          code: salesmanCode || salesmanName,
          name: salesmanName || salesmanCode,
          selected: false,
          bills: []
        });
      }

      salesmanMap.get(key).bills.push(bill);
    });

    return Array.from(salesmanMap.values())
      .filter(
        (salesman) =>
          salesman.name &&
          salesman.bills.length > 0
      )
      .sort((first, second) =>
        first.name.localeCompare(second.name)
      );
  };
  const getUniqueAreas = () => {
    const bills = getCollectionPendingBills();
    const areaMap = new Map();

    bills.forEach((bill) => {
      const areaCode = String(
        bill.areaCode || ""
      ).trim();

      const areaName = String(
        bill.areaName || ""
      ).trim();

      /*
       * Do not create an UNKNOWN area group.
       * Bills without an area will not appear in
       * Area-wise selection.
       */
      if (!areaCode && !areaName) {
        return;
      }

      const key = clean(
        areaCode || areaName
      );

      if (!areaMap.has(key)) {
        areaMap.set(key, {
          code: areaCode || areaName,
          name: areaName || areaCode,
          selected: false,
          bills: []
        });
      }

      areaMap.get(key).bills.push(bill);
    });

    return Array.from(areaMap.values())
      .filter(
        (area) =>
          area.name &&
          area.bills.length > 0
      )
      .sort((first, second) =>
        first.name.localeCompare(second.name)
      );
  };



  // =========================
  // MODAL COMPONENTS
  // =========================
  const BillSelectionModal = ({ isOpen, onClose, bills, onConfirm }) => {
    const [selectedBills, setSelectedBills] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    useEffect(() => {
      if (isOpen && bills) {
        const initialSelected = bills.filter(bill => bill.selected).map(bill => bill.id);
        setSelectedBills(initialSelected);
        setSelectAll(initialSelected.length === bills.length && bills.length > 0);
      }
    }, [isOpen, bills]);

    const handleSelectAll = () => {
      if (selectAll) {
        setSelectedBills([]);
        setSelectAll(false);
      } else {
        const allBillIds = bills.map(bill => bill.id);
        setSelectedBills(allBillIds);
        setSelectAll(true);
      }
    };

    const handleBillSelect = (billId) => {
      setSelectedBills(prev => {
        const newSelection = prev.includes(billId)
          ? prev.filter(id => id !== billId)
          : [...prev, billId];
        setSelectAll(newSelection.length === bills.length);
        return newSelection;
      });
    };

    const handleConfirm = () => {
      const updatedBills = bills.map(bill => ({
        ...bill,
        selected: selectedBills.includes(bill.id),
        collectionAmt: selectedBills.includes(bill.id) ? bill.balance : 0
      }));
      onConfirm(updatedBills);
      onClose();
    };

    if (!isOpen) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container bill-selection-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Select Bills ({bills.length})</h3>
            <button className="modal-close-btn" onClick={onClose}>×</button>
          </div>

          <div className="modal-body">
            <div className="modal-toolbar">
              <button className="btn-select-all-modal" onClick={handleSelectAll}>
                {selectAll ? 'Deselect All' : 'Select All'}
              </button>
              <div className="modal-stats">
                <span>Selected: {selectedBills.length} / {bills.length} bills</span>
              </div>
            </div>

            <div className="modal-table-container">
              <table className="modal-bills-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Bill Series</th>
                    <th>Bill No</th>
                    <th>Bill Date</th>
                    <th>Party Code</th>
                    <th>Party Name</th>
                    <th style={{ textAlign: 'right' }}>Bill Amt</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="no-data">No bills available</td>
                    </tr>
                  ) : (
                    bills.map((bill) => (
                      <tr key={bill.id}>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={selectedBills.includes(bill.id)}
                            onChange={() => handleBillSelect(bill.id)}
                          />
                        </td>
                        <td>{bill.billSeries || "-"}</td>
                        <td>{bill.billNo || "-"}</td>
                        <td>{bill.billDate || "-"}</td>
                        <td>{bill.partyCode || "-"}</td>
                        <td>{bill.partyName || "-"}</td>
                        <td style={{ textAlign: 'right' }}>₹{Number(bill.billAmt || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>₹{Number(bill.balance || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-modal-confirm" onClick={handleConfirm}>Confirm Selection</button>
            <button className="btn-modal-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  const SalesmanSelectionModal = ({ isOpen, onClose, salesmen, onConfirm }) => {
    const [selectedSalesmen, setSelectedSalesmen] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    useEffect(() => {
      if (isOpen && salesmen) {
        const initialSelected = salesmen.filter(s => s.selected).map(s => s.code);
        setSelectedSalesmen(initialSelected);
        setSelectAll(initialSelected.length === salesmen.length && salesmen.length > 0);
      }
    }, [isOpen, salesmen]);

    const handleSelectAll = () => {
      if (selectAll) {
        setSelectedSalesmen([]);
        setSelectAll(false);
      } else {
        const allSalesmanCodes = salesmen.map(s => s.code);
        setSelectedSalesmen(allSalesmanCodes);
        setSelectAll(true);
      }
    };

    const handleSalesmanSelect = (salesmanCode) => {
      setSelectedSalesmen(prev => {
        const newSelection = prev.includes(salesmanCode)
          ? prev.filter(code => code !== salesmanCode)
          : [...prev, salesmanCode];
        setSelectAll(newSelection.length === salesmen.length);
        return newSelection;
      });
    };

    const handleConfirm = () => {
      const updatedSalesmen = salesmen.map(salesman => ({
        ...salesman,
        selected: selectedSalesmen.includes(salesman.code)
      }));
      onConfirm(updatedSalesmen);
      onClose();
    };

    if (!isOpen) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container salesman-selection-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Select Salesmen</h3>
            <button className="modal-close-btn" onClick={onClose}>×</button>
          </div>

          <div className="modal-body">
            <div className="modal-toolbar">
              <button className="btn-select-all-modal" onClick={handleSelectAll}>
                {selectAll ? 'Deselect All' : 'Select All'}
              </button>
              <div className="modal-stats">
                <span>Selected: {selectedSalesmen.length} / {salesmen.length} salesmen</span>
              </div>
            </div>

            <div className="modal-table-container">
              <table className="modal-bills-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Salesman Name</th>
                    <th>Total Bills</th>
                    <th style={{ textAlign: 'right' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {salesmen.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="no-data">No salesmen with pending bills</td>
                    </tr>
                  ) : (
                    salesmen.map((salesman) => (
                      <tr key={salesman.code}>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={selectedSalesmen.includes(salesman.code)}
                            onChange={() => handleSalesmanSelect(salesman.code)}
                          />
                        </td>
                        <td>{salesman.name}</td>
                        <td className="text-center">{salesman.bills.length}</td>
                        <td style={{ textAlign: 'right' }}>
                          ₹{salesman.bills.reduce((sum, b) => sum + (Number(b.balance) || 0), 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-modal-confirm" onClick={handleConfirm}>Confirm Selection</button>
            <button className="btn-modal-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };
  const AreaSelectionModal = ({ isOpen, onClose, areas, onConfirm }) => {
    const [selectedAreas, setSelectedAreas] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    useEffect(() => {
      if (isOpen && areas) {
        const initialSelected = areas.filter(a => a.selected).map(a => a.code);
        setSelectedAreas(initialSelected);
        setSelectAll(initialSelected.length === areas.length && areas.length > 0);
      }
    }, [isOpen, areas]);

    const handleSelectAll = () => {
      if (selectAll) {
        setSelectedAreas([]);
        setSelectAll(false);
      } else {
        const allAreaCodes = areas.map(a => a.code);
        setSelectedAreas(allAreaCodes);
        setSelectAll(true);
      }
    };

    const handleAreaSelect = (areaCode) => {
      setSelectedAreas(prev => {
        const newSelection = prev.includes(areaCode)
          ? prev.filter(code => code !== areaCode)
          : [...prev, areaCode];
        setSelectAll(newSelection.length === areas.length);
        return newSelection;
      });
    };

    const handleConfirm = () => {
      const updatedAreas = areas.map(area => ({
        ...area,
        selected: selectedAreas.includes(area.code)
      }));
      onConfirm(updatedAreas);
      onClose();
    };

    if (!isOpen) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container area-selection-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Select Areas</h3>
            <button className="modal-close-btn" onClick={onClose}>×</button>
          </div>

          <div className="modal-body">
            <div className="modal-toolbar">
              <button className="btn-select-all-modal" onClick={handleSelectAll}>
                {selectAll ? 'Deselect All' : 'Select All'}
              </button>
              <div className="modal-stats">
                <span>Selected: {selectedAreas.length} / {areas.length} areas</span>
              </div>
            </div>

            <div className="modal-table-container">
              <table className="modal-bills-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Area Name</th>
                    <th>Total Bills</th>
                    <th style={{ textAlign: 'right' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {areas.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="no-data">No areas with pending bills</td>
                    </tr>
                  ) : (
                    areas.map((area) => (
                      <tr key={area.code}>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={selectedAreas.includes(area.code)}
                            onChange={() => handleAreaSelect(area.code)}
                          />
                        </td>
                        <td>{area.name}</td>
                        <td className="text-center">{area.bills.length}</td>
                        <td style={{ textAlign: 'right' }}>
                          ₹{area.bills.reduce((sum, b) => sum + (Number(b.balance) || 0), 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-modal-confirm" onClick={handleConfirm}>Confirm Selection</button>
            <button className="btn-modal-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };
  // =========================
  // HELPER DATA
  // =========================
  const clean = (v) => String(v ?? "").trim().toLowerCase();

  const pickValue = (...values) => {
    for (const v of values) {
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return "";
  };

  const getReceiptAdjustedAmount = (billSeries, billNo) => {
    if (!state.receipts || state.receipts.length === 0) return 0;

    return state.receipts.reduce((sum, receipt) => {
      // Get items from receipt - could be receiptBills or items
      const receiptItems = receipt.receiptBills || receipt.items || [];

      const matchedItems = receiptItems.filter(i =>
        clean(i.trnSeries) === clean(billSeries) &&
        clean(i.trnNo) === clean(billNo)
      );

      const adjustedSum = matchedItems.reduce((s, i) => {
        const nowAdjust = Number(i.nowAdjust || 0);
        const discAmount = Number(i.discAmount || 0);
        return s + nowAdjust + discAmount;
      }, 0);

      return sum + adjustedSum;
    }, 0);
  };
  console.log("salesInvoices =", salesInvoices);

  const pendingBills = (salesInvoices || [])
    .map((invoice, index) => {
      const header = invoice.header || {};
      const summary = invoice.summary || {};

      const billSeries = pickValue(
        invoice.billSeries,
        invoice.BillSeries,
        invoice.trnSeries,
        header.billSeries,
        header.BillSeries,
        header.trnSeries,
        header.series,
        "INV"
      );

      const billNo = pickValue(
        invoice.billNo,
        invoice.billNumber,
        invoice.BillNo,
        invoice.trnNo,
        header.billNo,
        header.billNumber,
        header.BillNo,
        header.trnNo
      );

      const amount =
        Number(
          pickValue(
            invoice.amount,
            invoice.netAmount,
            invoice.billAmount,
            invoice.grandTotal,
            summary.net,
            summary.netAmount,
            summary.grandTotal,
            summary.totalAmount
          )
        ) || 0;

      const adjusted = getReceiptAdjustedAmount(billSeries, billNo);
      const balance = Math.max(amount - adjusted, 0);

      return {
        id: invoice.id || index + 1,
        billSeries,
        billNo,
        trnNo: billNo,
        trnDate: pickValue(
          invoice.billDate,
          invoice.date,
          invoice.trnDate,
          header.billDate,
          header.date,
          header.trnDate
        ),
        amount,
        adjusted,
        balance,

        party: pickValue(
          invoice.partyName,
          invoice.PartyName,
          invoice.party,
          invoice.Party,
          invoice.customerName,
          invoice.CustomerName,
          invoice.accountName,
          invoice.AccountName,
          invoice.acName,
          invoice.AcName,

          header.partyName,
          header.PartyName,
          header.party,
          header.Party,
          header.customerName,
          header.CustomerName,
          header.accountName,
          header.AccountName,
          header.acName,
          header.AcName
        ),

        salesman: pickValue(
          invoice.salesman,
          invoice.salesmanName,
          invoice.salesmanCode,
          header.salesman,
          header.salesmanName,
          header.salesmanCode
        ),

        areaCode: pickValue(
          invoice.areaCode,
          invoice.area,
          invoice.areaName,
          header.areaCode,
          header.area,
          header.areaName
        ),

        areaName: pickValue(
          invoice.areaName,
          invoice.area,
          invoice.areaCode,
          header.areaName,
          header.area,
          header.areaCode
        ),

        salesmanCode: pickValue(
          invoice.salesmanCode,
          invoice.salesman,
          invoice.salesmanName,
          header.salesmanCode,
          header.salesman,
          header.salesmanName
        ),

        salesmanName: pickValue(
          invoice.salesmanName,
          invoice.salesman,
          invoice.salesmanCode,
          header.salesmanName,
          header.salesman,
          header.salesmanCode
        )
      };
    })
    .filter((bill) => bill.billNo && bill.balance > 0);

  const pendingPurchaseBills = [
    { party: "SURYAJUG CO OP BANK", billSeries: "PUR", billNo: "PUR-001", amount: 50000, adjusted: 0, balance: 50000 },
    { party: "SURYAJUG CO OP BANK", billSeries: "PUR", billNo: "PUR-002", amount: 25000, adjusted: 5000, balance: 20000 },
    { party: "ABC INDUSTRIES", billSeries: "PUR", billNo: "PUR-003", amount: 15000, adjusted: 0, balance: 15000 }
  ];

  // =========================
  // COLLECTION VOUCHER MODAL FUNCTIONS
  // =========================
  const openSelectionModal = async (type) => {
    setCurrentSelectionType(type);

    if (type === "Bill wise") {
      // Load ALL bills for Bill wise selection
      const bills = getCollectionPendingBills(); // Now returns ALL bills with balance > 0
      console.log("BILL WISE BILLS =", bills);
      setBillItems(bills);
      setShowBillSelectionModal(true);
    } else if (type === "Salesman wise") {
      const salesmenData = getUniqueSalesmen();
      console.log("SALESMEN DATA =", salesmenData);
      setShowSalesmanSelectionModal(true);
    } else if (type === "Area wise") {
      const areasData = getUniqueAreas();
      console.log("AREAS DATA =", areasData);
      setShowAreaSelectionModal(true);
    }
  };

  const closeSelectionModal = () => {
    setShowBillSelectionModal(false);
    setShowSalesmanSelectionModal(false);
    setShowAreaSelectionModal(false);
    setCurrentSelectionType("");
  };
  const allCollectionBillsSelected =
    billItems.length > 0 && billItems.every((item) => item.selected);

  const handleSelectAllCollectionBills = (checked) => {
    setBillItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: checked,
        collectionAmt: checked ? Number(item.balance) || 0 : 0
      }))
    );
  };
  const handleBillSelectionConfirm = (selectedBillsData) => {
    setBillItems(
      selectedBillsData.map((bill) => ({
        ...bill,
        collectionAmt: bill.selected ? (bill.balance || 0) : 0,
        selected: bill.selected || false
      }))
    );
  };

  const handleSalesmanSelectionConfirm = (selectedSalesmenData) => {
    let allBills = [];

    selectedSalesmenData.forEach((salesman) => {
      if (salesman.selected) {
        const bills = (salesman.bills || []).map(bill => ({
          ...bill,
          selected: true,
          collectionAmt: bill.balance || 0
        }));
        allBills = [...allBills, ...bills];
      }
    });

    // Remove duplicates based on bill id
    const uniqueBills = allBills.filter((bill, index, self) =>
      index === self.findIndex(b => b.id === bill.id)
    );

    setBillItems(uniqueBills);
  };

  const handleAreaSelectionConfirm = (selectedAreasData) => {
    let allBills = [];

    selectedAreasData.forEach((area) => {
      if (area.selected) {
        const bills = (area.bills || []).map(bill => ({
          ...bill,
          selected: true,
          collectionAmt: bill.balance || 0
        }));
        allBills = [...allBills, ...bills];
      }
    });

    // Remove duplicates based on bill id
    const uniqueBills = allBills.filter((bill, index, self) =>
      index === self.findIndex(b => b.id === bill.id)
    );

    setBillItems(uniqueBills);
  };
  // =========================
  // RECEIPT FUNCTIONS
  // =========================
  const calculateReceiptSummary = (items) => {
    let totalAdjusted = 0, totalDiscount = 0, totalBalance = 0;

    items.forEach((item) => {
      totalAdjusted += Number(item.nowAdjust) || 0;
      totalDiscount += Number(item.discAmount) || 0;
      totalBalance += Number(item.balanceAmt) || 0;
    });

    setReceiptSummary({
      totalAdjusted,
      totalDiscount,
      balanceAmount: totalBalance
    });
  };

  const addReceiptItem = () => {
    setReceiptItems([...receiptItems, {
      id: Date.now(),
      srNo: receiptItems.length + 1,
      trnSeries: "", trnNo: "", trnDate: "", amount: 0, adjustAmt: 0,
      balanceAmt: 0, nowAdjust: 0, discount: 0, discAmount: 0, remark: ""
    }]);
  };

  const updateReceiptItem = (index, field, value) => {
    const receiptLimit = Math.max(
      Number(receiptFormData.receiptAmount) || 0,
      0
    );

    const items = receiptItems.map((item) => ({ ...item }));
    const currentItem = items[index];

    if (!currentItem) return;

    if (field === "nowAdjust") {
      const enteredValue =
        value === "" ? "" : Math.max(Number(value) || 0, 0);

      /*
        IMPORTANT:
        Do not use currentItem.balanceAmt here because balanceAmt changes
        whenever the user types.
  
        Original available balance is:
        Bill Amount - Previously Adjusted Amount
      */
      const originalRowBalance = Math.max(
        (Number(currentItem.amount) || 0) -
        (Number(currentItem.adjustAmt) || 0),
        0
      );

      const otherRowsTotal = items.reduce((sum, item, itemIndex) => {
        if (itemIndex === index) return sum;

        return sum + (Number(item.nowAdjust) || 0);
      }, 0);

      const remainingReceiptAmount = Math.max(
        receiptLimit - otherRowsTotal,
        0
      );

      if (enteredValue === "") {
        currentItem.nowAdjust = "";
      } else {
        currentItem.nowAdjust = Number(
          Math.min(
            enteredValue,
            originalRowBalance,
            remainingReceiptAmount
          ).toFixed(2)
        );
      }
    } else if (field === "discount") {
      currentItem.discount =
        value === "" ? "" : Math.max(Number(value) || 0, 0);
    } else {
      currentItem[field] = value;
    }

    const amount = Number(currentItem.amount) || 0;
    const previouslyAdjusted = Number(currentItem.adjustAmt) || 0;
    const nowAdjust = Number(currentItem.nowAdjust) || 0;
    const discountPercentage = Number(currentItem.discount) || 0;

    const originalBalance = Math.max(
      amount - previouslyAdjusted,
      0
    );

    const discAmount =
      (nowAdjust * discountPercentage) / 100;

    currentItem.discAmount = Number(discAmount.toFixed(2));

    currentItem.balanceAmt = Number(
      Math.max(
        originalBalance - nowAdjust - discAmount,
        0
      ).toFixed(2)
    );

    setReceiptItems(items);
    calculateReceiptSummary(items);
  };


  const getAlreadyAdjustedAmount = (billSeries, billNo) => {
    return (state.receipts || []).reduce((sum, r) => {
      const matched = (r.items || []).filter(
        (i) =>
          clean(i.trnSeries) === clean(billSeries) &&
          clean(i.trnNo) === clean(billNo)
      );

      const adj = matched.reduce(
        (s, i) => s + (Number(i.nowAdjust) || 0) + (Number(i.discAmount) || 0),
        0
      );

      return sum + adj;
    }, 0);
  };
  const distributeReceiptAmountToBills = (bills, receiptAmount) => {
    let remainingAmount = Number(receiptAmount) || 0;

    return bills.map((bill, index) => {
      const billBalance = Number(bill.balance) || 0;
      const nowAdjust = Math.min(billBalance, remainingAmount);

      remainingAmount -= nowAdjust;

      return {
        id: Date.now() + index,
        srNo: index + 1,
        trnSeries: bill.billSeries,
        trnNo: bill.billNo,
        trnDate: bill.trnDate,
        amount: bill.amount,
        adjustAmt: bill.adjusted,
        balanceAmt: billBalance - nowAdjust,
        nowAdjust,
        discount: 0,
        discAmount: 0,
        remark: ""
      };
    });
  };
 const loadReceiptBillBySeriesNo = (
  billSeries,
  billNo
) => {
    const enteredSeries = String(billSeries || "").trim();
    const enteredBillNo = String(billNo || "").trim();

    if (!enteredBillNo) {
      return false;
    }

    let matchingBills = [];

    // When Bill Series is entered, match both Series and Bill No.
    if (enteredSeries) {
      matchingBills = pendingBills.filter(
        (bill) =>
          clean(bill.billSeries) === clean(enteredSeries) &&
          clean(bill.billNo) === clean(enteredBillNo)
      );
    } else {
      // First preference: Bill No with blank Bill Series.
      const blankSeriesBills = pendingBills.filter(
        (bill) =>
          clean(bill.billNo) === clean(enteredBillNo) &&
          !String(bill.billSeries || "").trim()
      );

      if (blankSeriesBills.length > 0) {
        matchingBills = blankSeriesBills;
      } else {
        // If no blank-series bill exists, search only by Bill No.
        matchingBills = pendingBills.filter(
          (bill) => clean(bill.billNo) === clean(enteredBillNo)
        );
      }
    }

 if (
  matchingBills.length === 0
) {
  alert(
    enteredSeries
      ? `Outstanding bill ${enteredSeries}-${enteredBillNo} was not found.`
      : `Outstanding Bill No ${enteredBillNo} was not found.`
  );

  return false;
}

    // When Bill No exists in multiple series, ask for the series.
    if (!enteredSeries && matchingBills.length > 1) {
      const uniqueSeries = [
        ...new Set(
          matchingBills.map((bill) =>
            String(bill.billSeries || "").trim() || "No Series"
          )
        )
      ];

      alert(
        `Bill No ${enteredBillNo} exists in multiple series: ${uniqueSeries.join(
          ", "
        )}. Please enter the Bill Series.`
      );

      return false;
    }

    const selectedBill = matchingBills[0];

    // Load all outstanding bills belonging to the selected bill's party.
    const partyBills = pendingBills.filter(
      (bill) => clean(bill.party) === clean(selectedBill.party)
    );

    // Keep the entered bill as the first row.
    const orderedBills = [
      selectedBill,
      ...partyBills.filter(
        (bill) =>
          !(
            clean(bill.billSeries) === clean(selectedBill.billSeries) &&
            clean(bill.billNo) === clean(selectedBill.billNo)
          )
      )
    ];

    const receiptAmount = Number(selectedBill.balance) || 0;

    const billRows = distributeReceiptAmountToBills(
      orderedBills,
      receiptAmount
    );

    setReceiptItems(billRows);

 setReceiptFormData(
  (previous) => ({
    ...previous,

    billSeries:
      selectedBill
        .billSeries ||
      "",

    billNo:
      selectedBill
        .billNo ||
      "",

    partyName:
      selectedBill
        .party ||
      "",

    salesman:
      selectedBill
        .salesman ||
      previous.salesman ||
      "",

    receiptAmount:
      receiptAmount,
  })
);

    calculateReceiptSummary(billRows);

    setPartySuggestions([]);

    setTimeout(() => {
      const firstNowAdjust = document.querySelector(
        ".receipt-entry-table tbody tr:first-child input[type='number']"
      );

      if (firstNowAdjust) {
        firstNowAdjust.focus();
        firstNowAdjust.select();
      }
    }, 100);

    return true;
  };
  const handleReceiptInput = (event) => {
    const {
      name,
      value
    } = event.target;

    setReceiptFormData((previous) => {
      const updatedData = {
        ...previous,
        [name]: value
      };

      /*
       * Keep drawerBank and drawerBankName synchronized.
       */
      if (name === "drawerBank") {
        updatedData.drawerBank =
          value;

        updatedData.drawerBankName =
          value;
      }

      /*
       * Keep Bank/Cash clean when Cash is selected.
       */
      if (
        name === "bankCash" &&
        value === "Cash"
      ) {
        updatedData.chequeNo = "";
        updatedData.chequeDate = "";
        updatedData.drawerBank = "";
        updatedData.drawerBankName = "";
        updatedData.drawerBankId = "";
        updatedData.micr = "";
      }

      return updatedData;
    });
  };
  const handleReceiptBillKeyDown = (e) => {
    if (e.key !== "Enter") {
      return;
    }

    e.preventDefault();

    const enteredBillNo = String(receiptFormData.billNo || "").trim();
    const enteredBillSeries = String(
      receiptFormData.billSeries || ""
    ).trim();

    if (!enteredBillNo) {
      alert("Please enter Bill No.");
      return;
    }

   loadReceiptBillBySeriesNo(
  enteredBillSeries,
  enteredBillNo
);
  };
const handlePartyTyping = (event) => {
  const value =
    event.target.value;

  const searchText =
    clean(value);

  setPartySearchActive(true);
  setActivePartySuggestionIndex(-1);
  setPartyNotFound(false);

  /*
   * Only update the typed party name.
   *
   * Do not clear:
   * - Bill Series
   * - Bill No
   * - Salesman
   * - Receipt Amount
   * - Existing receipt rows
   */
  setReceiptFormData(
    (previous) => ({
      ...previous,
      partyName: value,
    })
  );

  if (!searchText) {
    setPartySuggestions([]);
    setPartyNotFound(false);
    return;
  }

  const matchingBills =
    pendingBills.filter(
      (bill) =>
        clean(
          bill.party
        ).includes(
          searchText
        )
    );

  const uniqueParties =
    Array.from(
      new Map(
        matchingBills
          .filter(
            (bill) =>
              String(
                bill.party || ""
              ).trim()
          )
          .map(
            (bill) => [
              clean(
                bill.party
              ),

              String(
                bill.party
              ).trim(),
            ]
          )
      ).values()
    ).slice(0, 20);

  setPartySuggestions(
    uniqueParties
  );

  setPartyNotFound(
    uniqueParties.length === 0
  );
};
  const handlePartyKeyDown = (e) => {
    if (!partySearchActive) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();

      if (partySuggestions.length === 0) return;

      setActivePartySuggestionIndex((prev) => {
        if (prev < partySuggestions.length - 1) {
          return prev + 1;
        }

        return 0;
      });

      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();

      if (partySuggestions.length === 0) return;

      setActivePartySuggestionIndex((prev) => {
        if (prev > 0) {
          return prev - 1;
        }

        return partySuggestions.length - 1;
      });

      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();

      if (
        activePartySuggestionIndex >= 0 &&
        partySuggestions[activePartySuggestionIndex]
      ) {
        selectParty(
          partySuggestions[activePartySuggestionIndex]
        );
        return;
      }

      if (partySuggestions.length === 1) {
        selectParty(partySuggestions[0]);
        return;
      }

      const exactParty = partySuggestions.find(
        (party) =>
          clean(party) === clean(receiptFormData.partyName)
      );

      if (exactParty) {
        selectParty(exactParty);
      }

      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();

      setPartySuggestions([]);
      setPartyNotFound(false);
      setPartySearchActive(false);
      setActivePartySuggestionIndex(-1);
    }
  };
const selectParty = (
  selectedParty
) => {
  const normalizedParty =
    clean(selectedParty);

  const filteredBills =
    pendingBills.filter(
      (bill) =>
        clean(
          bill.party
        ) === normalizedParty
    );

  setPartySuggestions([]);
  setPartyNotFound(false);
  setPartySearchActive(false);
  setActivePartySuggestionIndex(-1);

  if (
    filteredBills.length === 0
  ) {
    /*
     * Preserve all existing bill and receipt data.
     * Only update the party text.
     */
    setReceiptFormData(
      (previous) => ({
        ...previous,
        partyName:
          selectedParty,
      })
    );

    return;
  }

  const currentBillSeries =
    String(
      receiptFormData
        .billSeries || ""
    ).trim();

  const currentBillNo =
    String(
      receiptFormData
        .billNo || ""
    ).trim();

  /*
   * Check whether a bill was already loaded
   * using Bill Series + Bill No.
   */
  const alreadyLoadedBill =
    filteredBills.find(
      (bill) =>
        clean(
          bill.billSeries
        ) ===
          clean(
            currentBillSeries
          ) &&
        clean(
          bill.billNo
        ) ===
          clean(
            currentBillNo
          )
    );

  /*
   * When the currently loaded bill belongs
   * to the selected party, preserve everything.
   */
  if (alreadyLoadedBill) {
    setReceiptFormData(
      (previous) => ({
        ...previous,

        partyName:
          selectedParty,

        salesman:
          previous.salesman ||
          alreadyLoadedBill
            .salesman ||
          "",
      })
    );

    return;
  }

  /*
   * Party-wise loading:
   * Load all outstanding bills for the party.
   */
  const billRows =
    filteredBills.map(
      (bill, index) => {
        const amount =
          Number(
            bill.amount
          ) || 0;

        const adjusted =
          Number(
            bill.adjusted
          ) || 0;

        const originalBalance =
          Math.max(
            amount -
              adjusted,
            0
          );

        return {
          id:
            `${
              bill.billSeries ||
              "NO-SERIES"
            }-${
              bill.billNo
            }-${index}`,

          srNo:
            index + 1,

          trnSeries:
            bill.billSeries ||
            "",

          trnNo:
            bill.billNo ||
            "",

          trnDate:
            bill.trnDate ||
            "",

          amount,
          adjustAmt:
            adjusted,

          balanceAmt:
            originalBalance,

          nowAdjust: 0,

          discount: 0,
          discAmount: 0,

          remark: "",
        };
      }
    );

  setReceiptItems(
    billRows
  );

  /*
   * Preserve unrelated form fields such as:
   * Receipt No, Receipt Date, Bank/Cash,
   * Cheque details, Narration, etc.
   */
  setReceiptFormData(
    (previous) => ({
      ...previous,

      partyName:
        selectedParty,

      /*
       * Party-wise mode does not represent one
       * specific bill, so clear only these fields.
       */
      billSeries: "",
      billNo: "",

      salesman:
        filteredBills[0]
          ?.salesman ||
        previous.salesman ||
        "",

      /*
       * Do not automatically delete a manually
       * entered receipt amount.
       */
      receiptAmount:
        previous.receiptAmount,
    })
  );

  calculateReceiptSummary(
    billRows
  );

  setTimeout(() => {
    const receiptAmountInput =
      document.querySelector(
        'input[name="receiptAmount"]'
      );

    if (
      receiptAmountInput
    ) {
      receiptAmountInput.focus();
      receiptAmountInput.select();
    }
  }, 100);
};

  const saveReceipt = async () => {
    try {
      const receiptNumber =
        requireVoucherNumber(
          receiptFormData.rno,
          "Receipt"
        );

      if (!receiptNumber) {
        return;
      }
      const adjustedReceiptBills =
        receiptItems
          .filter((item) => {
            const nowAdjust =
              Number(
                item.nowAdjust
              ) || 0;

            const discAmt =
              Number(
                item.discAmt ??
                item.discAmount
              ) || 0;

            return (
              nowAdjust > 0 ||
              discAmt > 0
            );
          })
          .map((item) => {
            return {
              trnSeries:
                String(
                  item.trnSeries ||
                  item.billSeries ||
                  ""
                ).trim(),

              trnNo:
                String(
                  item.trnNo ||
                  item.billNo ||
                  ""
                ).trim(),

              trnDate:
                item.trnDate ||
                item.billDate ||
                "",

              amount:
                Number(
                  item.amount
                ) || 0,

              adjustAmt:
                Number(
                  item.adjustAmt
                ) || 0,

              balanceAmt:
                Number(
                  item.balanceAmt
                ) || 0,

              nowAdjust:
                Number(
                  item.nowAdjust
                ) || 0,

              discountPercent:
                Number(
                  item.discountPercent ??
                  item.discount
                ) || 0,

              discAmt:
                Number(
                  item.discAmt ??
                  item.discAmount
                ) || 0,

              remark:
                String(
                  item.remark || ""
                ).trim()
            };
          });

      if (
        adjustedReceiptBills.length === 0
      ) {
        alert(
          "Please adjust an amount against at least one bill."
        );
        return;
      }

      const firstAdjustedBill =
        adjustedReceiptBills[0];

      const receiptAmount =
        Number(
          receiptFormData.receiptAmount
        ) || 0;

      if (receiptAmount <= 0) {
        alert(
          "Please enter a valid Receipt Amount."
        );
        return;
      }

      const distributorId =
        receiptFormData.distributorId ||
        localStorage.getItem(
          "distributorId"
        ) ||
        "";

      const firmId =
        receiptFormData.firmId ||
        localStorage.getItem(
          "firmId"
        ) ||
        "";

      if (
        !distributorId ||
        !firmId
      ) {
        alert(
          "Distributor ID or Firm ID is missing."
        );
        return;
      }

      const payload = {
        ...receiptFormData,

        rno: Number(receiptNumber),

        billSeries:
          firstAdjustedBill.trnSeries ||
          receiptFormData.billSeries ||
          "",

        billNo:
          firstAdjustedBill.trnNo ||
          receiptFormData.billNo ||
          "",

        salesmanName:
          receiptFormData.salesmanName ||
          receiptFormData.salesman ||
          "",

        bankCash:
          receiptFormData.bankCash ||
          "",

        drawerBankId:
          receiptFormData.drawerBankId ||
          "",

        drawerBank:
          receiptFormData.drawerBank ||
          receiptFormData.drawerBankName ||
          "",

        drawerBankName:
          receiptFormData.drawerBank ||
          receiptFormData.drawerBankName ||
          "",

        receiptAmount,

        receiptBills:
          adjustedReceiptBills,

        distributorId,
        firmId
      };

      const isEditing =
        Boolean(editReceiptId);

      const requestUrl =
        isEditing
          ? `${API_URL}/transaction/receipt/${encodeURIComponent(
            editReceiptId
          )}`
          : `${API_URL}/transaction/receipt`;

      console.log(
        "RECEIPT MODE =",
        isEditing
          ? "UPDATE"
          : "CREATE"
      );

      console.log(
        "RECEIPT ID =",
        editReceiptId
      );

      console.log(
        "RECEIPT URL =",
        requestUrl
      );

      console.log(
        "RECEIPT PAYLOAD =",
        payload
      );

      const response =
        await secureFetch(requestUrl, {
          method:
            isEditing
              ? "PUT"
              : "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(payload)
        });

      const result =
        await response.json();

      console.log(
        "RECEIPT API RESULT =",
        result
      );

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message ||
          (isEditing
            ? "Receipt update failed."
            : "Receipt save failed.")
        );
      }

      alert(
        isEditing
          ? "Receipt Updated Successfully"
          : "Receipt Saved Successfully"
      );

      /*
       * Do not dispatch ADD_RECEIPT here.
       * It causes duplicate frontend data during update.
       */

      resetReceiptForm();

      await loadReceipts();

      setReceiptListCurrentPage(1);

      await loadReceiptList({
        page: 1,

        limit:
          receiptListRowsPerPage,

        search:
          receiptListSearchDebounced,

        filters:
          receiptAppliedFilters
      });

      openTransactionList(
        "Receipt"
      );
    } catch (error) {
      console.error(
        "RECEIPT SAVE/UPDATE ERROR =",
        error
      );

      alert(
        error.message ||
        "Receipt operation failed."
      );
    }
  };
  const resetReceiptForm = () => {
  setEditReceiptId(null);

  setReceiptFormData({
    receiptDate:
      new Date()
        .toISOString()
        .split("T")[0],

    rno:
      autoVoucherNo === true
        ? String(
            (state.receipts?.length ||
              0) + 1
          )
        : "",

    billSeries: "",
    billNo: "",

    salesman: "",
    salesmanId: "",
    salesmanName: "",

    partyId: "",
    partyName: "",

    narration: "",

    bankCash: "",
    loadNo: "",

    receiptAmount: "",

    chequeNo: "",
    chequeDate: "",

    rloadNo: "",

    drawerBankId: "",
    drawerBank: "",
    drawerBankName: "",

    micr: "",

    pdcType:
      "LOCAL BANK",

    companyId: "",

    firmId:
      localStorage.getItem(
        "firmId"
      ) || "",

    distributorId:
      localStorage.getItem(
        "distributorId"
      ) || "",
  });

  setReceiptItems([]);
  setPartySuggestions([]);

  setReceiptSummary({
    totalAdjusted: 0,
    balanceAmount: 0,
    totalDiscount: 0,
  });
};
  const editReceipt = (receipt) => {
    const header =
      receipt?.header || receipt || {};

    const receiptId =
      receipt?.id ||
      receipt?._id ||
      header?._id ||
      "";

    if (!receiptId) {
      alert("Receipt ID was not found.");
      return;
    }

    console.log(
      "EDITING RECEIPT ID =",
      receiptId
    );

    console.log(
      "EDITING RECEIPT =",
      receipt
    );

    setEditReceiptId(receiptId);

    setReceiptFormData({
      receiptDate:
        header.receiptDate ||
        new Date()
          .toISOString()
          .split("T")[0],

      rno:
        header.rno || "",

      billSeries:
        header.billSeries || "",

      billNo:
        header.billNo || "",

      salesman:
        header.salesmanName ||
        header.salesman ||
        "",

      salesmanId:
        header.salesmanId || "",

      salesmanName:
        header.salesmanName ||
        header.salesman ||
        "",

      partyId:
        header.partyId || "",

      partyName:
        header.partyName || "",

      narration:
        header.narration || "",

      bankCash:
        header.bankCash || "",

      drawerBankId:
        header.drawerBankId || "",

      drawerBank:
        header.drawerBankName ||
        header.drawerBank ||
        "",

      drawerBankName:
        header.drawerBankName ||
        header.drawerBank ||
        "",

      loadNo:
        header.loadNo || "",

      receiptAmount:
        String(
          Number(
            header.receiptAmount || 0
          )
        ),

      chequeNo:
        header.chequeNo || "",

      chequeDate:
        header.chequeDate || "",

      rloadNo:
        header.rloadNo || "",

      drawerBankId:
        header.drawerBankId || "",

      drawerBank:
        header.drawerBankName ||
        header.drawerBank ||
        "",

      drawerBankName:
        header.drawerBankName ||
        header.drawerBank ||
        "",

      micr:
        header.micr || "",

      pdcType:
        header.pdcType ||
        "LOCAL BANK",

      docketNo:
        header.docketNo || "",

      addUser:
        header.addUser || "",

      editUser:
        header.editUser || "",

      companyId:
        header.companyId || "",

      firmId:
        header.firmId ||
        localStorage.getItem("firmId") ||
        "",

      distributorId:
        header.distributorId ||
        localStorage.getItem(
          "distributorId"
        ) ||
        ""
    });

    const existingItems =
      Array.isArray(
        receipt?.receiptBills
      )
        ? receipt.receiptBills
        : Array.isArray(receipt?.items)
          ? receipt.items
          : [];

    const mappedItems =
      existingItems.map(
        (item, index) => {
          const discAmt =
            Number(
              item.discAmt ??
              item.discAmount ??
              0
            );

          const discountPercent =
            Number(
              item.discountPercent ??
              item.discount ??
              0
            );

          return {
            ...item,

            id:
              item._id ||
              item.id ||
              `${receiptId}-${index}`,

            srNo:
              index + 1,

            trnSeries:
              item.trnSeries ||
              item.billSeries ||
              "",

            trnNo:
              item.trnNo ||
              item.billNo ||
              "",

            trnDate:
              item.trnDate ||
              item.billDate ||
              "",

            amount:
              Number(
                item.amount || 0
              ),

            adjustAmt:
              Number(
                item.adjustAmt || 0
              ),

            balanceAmt:
              Number(
                item.balanceAmt || 0
              ),

            nowAdjust:
              Number(
                item.nowAdjust || 0
              ),

            discount:
              discountPercent,

            discountPercent,

            discAmt,

            discAmount:
              discAmt,

            remark:
              item.remark || ""
          };
        }
      );

    setReceiptItems(mappedItems);

    const totalAdjusted =
      mappedItems.reduce(
        (sum, item) =>
          sum +
          Number(
            item.nowAdjust || 0
          ),
        0
      );

    const totalDiscount =
      mappedItems.reduce(
        (sum, item) =>
          sum +
          Number(
            item.discAmt || 0
          ),
        0
      );

    const receiptAmount =
      Number(
        header.receiptAmount || 0
      );

    setReceiptSummary({
      totalAdjusted,

      totalDiscount,

      balanceAmount:
        Math.max(
          receiptAmount -
          totalAdjusted,
          0
        )
    });

    setPartySuggestions([]);
    setPartySearchActive(false);
    setPartyNotFound(false);

    setTransactionFormMode(
      (previous) => ({
        ...(previous || {}),
        Receipt: true
      })
    );
  };
  const deleteReceipt = async (
    id
  ) => {
    if (!id) {
      alert(
        "Receipt ID was not found."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this receipt?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const response = await secureFetch(
        `${API_URL}/transaction/receipt/${encodeURIComponent(
          id
        )}`,
        {
          method: "DELETE",
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message ||
          "Receipt deletion failed."
        );
      }

      /*
       * Calculate the valid page after deletion.
       */
      const recordsAfterDelete =
        Math.max(
          receiptListTotalRecords - 1,
          0
        );

      const pagesAfterDelete =
        Math.max(
          Math.ceil(
            recordsAfterDelete /
            receiptListRowsPerPage
          ),
          1
        );

      const pageAfterDelete =
        Math.min(
          receiptListCurrentPage,
          pagesAfterDelete
        );

      setReceiptListCurrentPage(
        pageAfterDelete
      );

      /*
       * Reload the Receipt list using the new
       * paginated endpoint.
       */
      await loadReceiptList({
        page:
          pageAfterDelete,

        limit:
          receiptListRowsPerPage,

        search:
          receiptListSearchDebounced,

        filters:
          receiptAppliedFilters,
      });

      /*
       * Refresh the complete Receipt state used
       * by bill adjustment and other current flows.
       */
      await loadReceipts();

      alert(
        "Receipt deleted successfully."
      );
    } catch (error) {
      console.error(
        "Receipt delete error:",
        error
      );

      alert(
        error.message ||
        "Unable to delete Receipt."
      );
    }
  };
  // =========================
  // JOURNAL FUNCTIONS
  // =========================
  const handleJournalInput = (e) => {
    const { name, value } = e.target;
    setJournalFormData({ ...journalFormData, [name]: value });
  };

  const addJournalRow = () => {
    setJournalItems([...journalItems, {
      id: Date.now(), seqNo: journalItems.length + 1,
      accountCode: "", accountName: "", drAmount: 0, crAmount: 0
    }]);
  };

  const updateJournalItem = (index, field, value) => {
    const items = [...journalItems];

    if (field === "drAmount") {
      items[index].drAmount = value;
      if (Number(value) > 0) items[index].crAmount = 0;
    } else if (field === "crAmount") {
      items[index].crAmount = value;
      if (Number(value) > 0) items[index].drAmount = 0;
    } else {
      items[index][field] = value;
    }

    setJournalItems(items);
    calculateJournalSummary(items);
  };

  const calculateJournalSummary = (items) => {
    const totalDr = items.reduce((sum, i) => sum + (Number(i.drAmount) || 0), 0);
    const totalCr = items.reduce((sum, i) => sum + (Number(i.crAmount) || 0), 0);

    setJournalSummary({
      totalDr,
      totalCr,
      difference: totalDr - totalCr,
      totalEntries: items.filter(i => i.accountName).length
    });
  };
  const getAccountName = (acc) =>
    acc.accountName || acc.acName || acc.AcName || acc.name || acc.partyName || "";

  const getAccountCode = (acc) =>
    acc.accountCode || acc.acCode || acc.AcCode || acc.code || acc.id || "";

  const allJournalAccounts = [
    ...(accounts || []),
    ...(otherAccounts || [])
  ].filter((acc, index, self) => {
    const name = getAccountName(acc).toLowerCase().trim();
    const code = String(getAccountCode(acc)).toLowerCase().trim();

    return (
      name &&
      index === self.findIndex(
        (a) =>
          getAccountName(a).toLowerCase().trim() === name ||
          String(getAccountCode(a)).toLowerCase().trim() === code
      )
    );
  });
  const handleAccountSearch = (index, value) => {
    const typedValue = String(value || "");

    setJournalItems((previousItems) =>
      previousItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
            ...item,
            accountName: typedValue,

            /*
            * Clear the old code when the user starts
            * manually changing the selected account.
            */
            accountCode: ""
          }
          : item
      )
    );

    const searchText = typedValue
      .trim()
      .toLowerCase();

    /*
    * Do not display every account when the input
    * is blank or contains only one character.
    */
    if (searchText.length < 2) {
      setAccountSuggestions([]);
      setActiveAccountRow(null);
      return;
    }

    const filteredAccounts = allJournalAccounts
      .filter((account) => {
        const accountName = String(
          getAccountName(account) || ""
        ).toLowerCase();

        const accountCode = String(
          getAccountCode(account) || ""
        ).toLowerCase();

        return (
          accountName.includes(searchText) ||
          accountCode.includes(searchText)
        );
      })
      .slice(0, 20);

    setAccountSuggestions(filteredAccounts);

    setActiveAccountRow(
      filteredAccounts.length > 0
        ? index
        : null
    );
  };

  const selectAccount = (index, account) => {
    setJournalItems((previousItems) => {
      const updatedItems = previousItems.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
              ...item,
              accountCode:
                getAccountCode(account),
              accountName:
                getAccountName(account)
            }
            : item
      );

      calculateJournalSummary(updatedItems);

      return updatedItems;
    });

    setAccountSuggestions([]);
    setActiveAccountRow(null);
  };
  const saveJournalVoucher = () => {
  const journalNumber =
    requireVoucherNumber(
      journalFormData.vNo,
      "Journal Voucher"
    );

  if (!journalNumber) {
    return;
  }

  const validItems =
    journalItems.filter(
      (item) =>
        String(
          item.accountName || ""
        ).trim() &&
        (
          Number(item.drAmount) > 0 ||
          Number(item.crAmount) > 0
        )
    );

  if (validItems.length < 2) {
    alert(
      "Please enter at least 2 journal rows."
    );
    return;
  }

  const totalDebit =
    Number(
      journalSummary.totalDr
    ) || 0;

  const totalCredit =
    Number(
      journalSummary.totalCr
    ) || 0;

  if (
    Math.abs(
      totalDebit - totalCredit
    ) > 0.01
  ) {
    alert(
      "Debit and Credit total must be equal."
    );
    return;
  }

  const payload = {
    id: Date.now(),

    header: {
      ...journalFormData,

      /*
       * Always send the validated number.
       */
      vNo:
        Number(journalNumber),
    },

    items:
      validItems.map(
        (item, index) => ({
          ...item,
          seqNo: index + 1,

          drAmount:
            Number(
              item.drAmount
            ) || 0,

          crAmount:
            Number(
              item.crAmount
            ) || 0,
        })
      ),

    summary: {
      ...journalSummary,

      totalDr:
        totalDebit,

      totalCr:
        totalCredit,

      difference:
        Number(
          (
            totalDebit -
            totalCredit
          ).toFixed(2)
        ),
    },

    affectsOutstanding: true,
  };

  console.log(
    "JOURNAL PAYLOAD =",
    payload
  );

  dispatch({
    type: "ADD_JOURNAL",
    payload,
  });

  alert(
    "Journal Voucher Saved Successfully"
  );

  resetJournalForm();

  openTransactionList(
    "Journal Voucher"
  );
};

const resetJournalForm = () => {
  setJournalFormData({
    vDate:
      new Date()
        .toISOString()
        .split("T")[0],

    vNo:
      autoVoucherNo === true
        ? String(
            (state.journals?.length ||
              0) + 1
          )
        : "",

    narr: "",
    isGst: "N",
  });

  setJournalItems([
    {
      id: Date.now(),
      seqNo: 1,
      accountCode: "",
      accountName: "",
      drAmount: 0,
      crAmount: 0,
    },
  ]);

  setJournalSummary({
    totalDr: 0,
    totalCr: 0,
    difference: 0,
    totalEntries: 0,
  });
};
  // =========================
    // PAYMENT FUNCTIONS
    // =========================
    const handlePaymentInput = (e) => {
      const { name, value } = e.target;
      setPaymentFormData({ ...paymentFormData, [name]: value });
    };

    const updatePaymentItem = (index, field, value) => {
      const updated = [...paymentItems];
      updated[index][field] = value;
      const amount = parseFloat(updated[index].amount) || 0;
      const adjusted = parseFloat(updated[index].adjustedAmt) || 0;
      const newAdjusted = parseFloat(updated[index].newAdjusted) || 0;
      updated[index].balanceAmt = (amount - adjusted - newAdjusted).toFixed(2);
      setPaymentItems(updated);
      calculatePaymentSummary(updated);
    };

    const addPaymentRow = () => {
      setPaymentItems([...paymentItems, {
        id: Date.now(), srNo: paymentItems.length + 1,
        trn: "", trnSeries: "", voucherNo: "", amount: "", adjustedAmt: "", balanceAmt: "", newAdjusted: ""
      }]);
    };

    const calculatePaymentSummary = (items) => {
      let adjustedAmt = 0, balanceAmt = 0;
      items.forEach((item) => {
        adjustedAmt += parseFloat(item.newAdjusted) || 0;
        balanceAmt += parseFloat(item.balanceAmt) || 0;
      });
      setPaymentSummary({ adjustedAmt: adjustedAmt.toFixed(2), balanceAmt: balanceAmt.toFixed(2), totalDrAmt: adjustedAmt.toFixed(2), totalCrAmt: adjustedAmt.toFixed(2) });
    };

    const selectPaymentParty = (selectedParty) => {
      setPaymentFormData(prev => ({ ...prev, partyName: selectedParty }));
      setPaymentPartySuggestions([]);
      const filteredBills = pendingPurchaseBills.filter(bill => String(bill.party).toLowerCase() === String(selectedParty).toLowerCase());
      const billRows = filteredBills.map((bill, index) => ({
        id: Date.now() + index, srNo: index + 1, trn: "PUR", trnSeries: bill.billSeries,
        voucherNo: bill.billNo, amount: bill.amount, adjustedAmt: bill.adjusted || 0,
        balanceAmt: bill.balance, newAdjusted: bill.balance
      }));
      setPaymentItems(billRows);
      setPaymentFormData(prev => ({
        ...prev, drAmt: filteredBills.reduce((sum, bill) => sum + bill.balance, 0),
        crAmt: filteredBills.reduce((sum, bill) => sum + bill.balance, 0)
      }));
      setTimeout(() => calculatePaymentSummary(billRows), 0);
    };

    const savePayment = () => {
      const paymentNumber =
        requireVoucherNumber(
          paymentFormData.vNo,
          "Payment Voucher"
        );

      if (!paymentNumber) {
        return;
      }

      const payload = {
        id: Date.now(),

        header: {
          ...paymentFormData,
          vNo: Number(paymentNumber),
        },

        items: paymentItems,
        summary: paymentSummary,
      };
      dispatch({ type: "ADD_PAYMENT", payload });
      alert("Payment Saved Successfully");
      resetPaymentForm();
      openTransactionList("Payment");
    };
  const resetPaymentForm = () => {
    setPaymentFormData({
      vDate: new Date().toISOString().split("T")[0], vNo: state.payments.length + 2, narr: "", partyName: "",
      drAmt: "", chqNo: "", bankCash: "", crAmt: "", chqDate: "", adjustedAc1: "", drCr1: "Dr",
      clearingDate: "", adjustedAc2: "", drCr2: "Cr", partyBankName: "", bankAccountNo: ""
    });
    setPaymentItems([{ id: Date.now(), srNo: 1, trn: "", trnSeries: "", voucherNo: "", amount: "", adjustedAmt: "", balanceAmt: "", newAdjusted: "" }]);
    setPaymentSummary({ adjustedAmt: 0, balanceAmt: 0, totalDrAmt: 0, totalCrAmt: 0 });
  };

  // =========================
  // CHEQUE BOUNCE FUNCTIONS
  // =========================
  const chequeBounceParties = [
    ...new Set(
      (state.receipts || [])
        .map(r => r.header?.partyName)
        .filter(Boolean)
    )
  ];

  const findReceiptByCheque = (partyName, chequeNo) => {
    return (state.receipts || []).find(r => {
      const h = r.header || {};
      return (
        clean(h.chequeNo) === clean(chequeNo) &&
        (!partyName || clean(h.partyName) === clean(partyName))
      );
    });
  };

  const calculateChequeBounceTotal = (chequeAmt, charges) => {
    return (
      (Number(chequeAmt) || 0) +
      (Number(charges) || 0)
    ).toFixed(2);
  };
  const loadChequeBounceReceiptDetails = (partyName, chequeNo, baseData = chequeBounceFormData) => {
    if (!chequeNo) return baseData;

    const receipt = findReceiptByCheque(partyName, chequeNo);

    if (!receipt) {
      return {
        ...baseData,
        chequeNo,
        chequeDate: "",
        chequeAmt: "",
        clearingDate: "",
        receiptNo: "",
        recNo: "",
        recSeries: "",
        bankName: "",
        totalAmt: ""
      };
    }

    const h = receipt.header || {};
    const chequeAmt = Number(receipt.summary?.totalAdjusted || h.receiptAmount || 0);
    const charges = Number(baseData.chqBounceCharges || 0);

    return {
      ...baseData,
      partyName: h.partyName || partyName,
      chequeNo: h.chequeNo || chequeNo,
      chequeDate: h.chequeDate || "",
      clearingDate: h.clearingDate || h.receiptDate || "",
      chequeAmt: chequeAmt.toFixed(2),
      receiptNo: h.rno || "",
      recNo: h.rno || "",
      recSeries: h.billSeries || "REC",
      bankName: h.bankCash && h.bankCash !== "Cash"
        ? h.bankCash
        : "",
      totalAmt: calculateChequeBounceTotal(chequeAmt, charges)
    };
  };

const handleSeriesChange =
  async (event) => {
    const series = String(
      event.target.value || ""
    )
      .toUpperCase()
      .trim();

    localStorage.setItem(
      "chequeBounceSeries",
      series
    );

    setCurrentSeries(series);

    setChequeBounceFormData(
      (previous) => ({
        ...previous,

        trnSeries:
          series,

        trnNo: "",
        chqBounceNo: "",

        isAutoGenerated:
          false,
      })
    );

    if (!series) {
      return;
    }

    /*
     * Auto Voucher No OFF:
     * Do not call next-number API.
     */
    if (autoVoucherNo !== true) {
      return;
    }

    await loadNextChequeBounceNo(
      series
    );
  };

  const handleChequeBounceInput = (e) => {
    const { name, value } = e.target;

    let updatedData = {
      ...chequeBounceFormData,
      [name]: value
    };

    if (name === "partyName") {
      updatedData = loadChequeBounceReceiptDetails(value, updatedData.chequeNo, updatedData);
    }

    if (name === "chequeNo") {
      updatedData = loadChequeBounceReceiptDetails(updatedData.partyName, value, updatedData);
    }

    updatedData.totalAmt = calculateChequeBounceTotal(
      updatedData.chequeAmt,
      updatedData.chqBounceCharges
    );

    setChequeBounceFormData(updatedData);
  };

const saveChequeBounce =
  async () => {
    const chequeBounceNumber =
      requireVoucherNumber(
        chequeBounceFormData
          .chqBounceNo ||
        chequeBounceFormData.trnNo,

        "Cheque Bounce"
      );

    if (!chequeBounceNumber) {
      return;
    }

    const numericTrnNo =
      Number(
        chequeBounceNumber
      );

    const transactionSeries =
      String(
        chequeBounceFormData
          .trnSeries || ""
      )
        .trim()
        .toUpperCase();

    const distributorId =
      String(
        localStorage.getItem(
          "distributorId"
        ) || ""
      ).trim();

    const firmId =
      String(
        localStorage.getItem(
          "firmId"
        ) || ""
      ).trim();

    if (!transactionSeries) {
      alert(
        "Enter Transaction Series"
      );
      return;
    }

    if (
      !Number.isFinite(
        numericTrnNo
      ) ||
      numericTrnNo <= 0
    ) {
      alert(
        "Enter a valid Transaction Number"
      );
      return;
    }

    if (
      !String(
        chequeBounceFormData
          .partyName || ""
      ).trim()
    ) {
      alert("Select Party");
      return;
    }

    if (
      !String(
        chequeBounceFormData
          .chequeNo || ""
      ).trim()
    ) {
      alert(
        "Enter Cheque Number"
      );
      return;
    }

    if (
      !distributorId ||
      !firmId
    ) {
      alert(
        "Distributor ID or Firm ID is missing."
      );
      return;
    }

    const payload = {
      ...chequeBounceFormData,

      trnSeries:
        transactionSeries,

      trnNo:
        numericTrnNo,

      chqBounceNo:
        String(
          numericTrnNo
        ),

      isAutoGenerated:
        autoVoucherNo === true,

      chqBounceCharges:
        Number(
          chequeBounceFormData
            .chqBounceCharges
        ) || 0,

      chequeAmt:
        Number(
          chequeBounceFormData
            .chequeAmt
        ) || 0,

      totalAmt:
        Number(
          chequeBounceFormData
            .totalAmt
        ) || 0,

      distributorId,
      firmId,
    };

   // AFTER
    const isEditingChequeBounce = Boolean(editChequeBounceId);

    const requestUrl = isEditingChequeBounce
      ? `${API_URL}/transaction/cheque-bounce/${encodeURIComponent(editChequeBounceId)}`
      : `${API_URL}/transaction/cheque-bounce`;

    console.log(
      "CHEQUE BOUNCE MODE =",
      isEditingChequeBounce ? "UPDATE" : "CREATE"
    );

    console.log("CHEQUE BOUNCE PAYLOAD =", payload);

    try {
      const response =
        await secureFetch(
          requestUrl,
          {
            method: isEditingChequeBounce ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
          (isEditingChequeBounce ? "Cheque Bounce Update Failed" : "Cheque Bounce Save Failed")
        );
      }

      alert(
        isEditingChequeBounce
          ? "Cheque Bounce Updated Successfully"
          : "Cheque Bounce Saved Successfully"
      );

      await loadChequeBounces();

      await loadChequeBounceList({
        page: 1,

        limit:
          chequeBounceListRowsPerPage,

        search:
          chequeBounceListSearchDebounced,

        filters:
          chequeBounceAppliedFilters,
      });

      setChequeBounceListCurrentPage(
        1
      );

      await resetChequeBounceForm();

      openTransactionList(
        "Cheque Bounce"
      );
    } catch (error) {
      console.error(
        "Cheque Bounce save error:",
        error
      );

      alert(
        error.message ||
        "Cheque Bounce Save Failed"
      );
    }
  };

  const loadNextChequeBounceNo = async (
    requestedSeries = ""
  ) => {
    if (autoVoucherNo !== true) {
  return;
}
    const savedSeries = String(
      requestedSeries ||
      currentSeries ||
      localStorage.getItem(
        "chequeBounceSeries"
      ) ||
      ""
    )
      .toUpperCase()
      .trim();

    /*
     * First-time user has not entered any series yet.
     */
    if (!savedSeries) {
      setChequeBounceFormData((previous) => ({
        ...previous,
        trnSeries: "",
        trnNo: "",
        chqBounceNo: "",
        isAutoGenerated: false,
      }));

      return;
    }

    try {
      const distributorId =
        localStorage.getItem("distributorId") || "";

      const firmId =
        localStorage.getItem("firmId") || "";

      const params = new URLSearchParams({
        distributorId,
        firmId,
      });

      const response = await fetch(
        `${API_URL}/transaction/cheque-bounce-next-no/${encodeURIComponent(
          savedSeries
        )}?${params.toString()}`
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
          "Unable to load next Cheque Bounce number."
        );
      }

      const nextNo =
        Number(result.nextNo) || 1;

      setCurrentSeries(savedSeries);

      localStorage.setItem(
        "chequeBounceSeries",
        savedSeries
      );

      setChequeBounceFormData((previous) => ({
        ...previous,
        trnSeries: savedSeries,
        trnNo: nextNo,

        /*
         * Show number only.
         * Series is already shown in its own column.
         */
        chqBounceNo: String(nextNo),

        isAutoGenerated: true,
      }));
    } catch (error) {
      console.error(
        "Load next Cheque Bounce number error:",
        error
      );
    }
  };
  const getNextChequeBounceNo = () => {
    return (state.chequeBounces?.length || 0) + 1;
  };
  const resetChequeBounceForm = async () => {
    const savedSeries = String(
      currentSeries ||
      localStorage.getItem(
        "chequeBounceSeries"
      ) ||
      ""
    )
      .toUpperCase()
      .trim();

    setEditChequeBounceId(null);

    setChequeBounceFormData({
      chqBounceDate:
        new Date()
          .toISOString()
          .split("T")[0],

      /*
       * Preserve the last series.
       */
      trnSeries: savedSeries,

      /*
       * These will be filled by
       * loadNextChequeBounceNo().
       */
      trnNo: "",
      chqBounceNo: "",
      isAutoGenerated: false,

      narration: "",
      partyName: "",
      chqBounceCharges: "0.00",
      chequeNo: "",
      chequeDate: "",
      chequeAmt: "",
      clearingDate: "",
      receiptNo: "",
      bankName: "",
      totalAmt: "",
    });

   if (
  autoVoucherNo === true &&
  savedSeries
) {
  await loadNextChequeBounceNo(
    savedSeries
  );
}
  };
  const editChequeBounce = (chequeBounce) => {
    const series = String(
      chequeBounce.trnSeries || ""
    )
      .trim()
      .toUpperCase();

    const numberOnly =
      Number(
        chequeBounce.trnNo ||
        String(
          chequeBounce.chqBounceNo || ""
        ).replace(/\D/g, "")
      ) || "";

    setEditChequeBounceId(
      chequeBounce._id ||
      chequeBounce.id
    );

    setChequeBounceFormData({
      chqBounceDate:
        chequeBounce.chqBounceDate ||
        chequeBounce.trndate ||
        new Date().toISOString().split("T")[0],

      trnSeries: series,
      trnNo: numberOnly,
      chqBounceNo: String(numberOnly),

      isAutoGenerated: true,

      narration:
        chequeBounce.narration || "",

      partyName:
        chequeBounce.partyName ||
        chequeBounce.accountNameDr ||
        "",

      chqBounceCharges:
        chequeBounce.chqBounceCharges ||
        "0.00",

      chequeNo:
        chequeBounce.chequeNo || "",

      chequeDate:
        chequeBounce.chequeDate || "",

      chequeAmt:
        chequeBounce.chequeAmt || "",

      clearingDate:
        chequeBounce.clearingDate || "",

      receiptNo:
        chequeBounce.receiptNo ||
        chequeBounce.recNo ||
        "",

      recNo:
        chequeBounce.recNo ||
        chequeBounce.receiptNo ||
        "",

      recSeries:
        chequeBounce.recSeries ||
        "REC",

      bankName:
        chequeBounce.bankName ||
        chequeBounce.accountNameCr ||
        "",

      totalAmt:
        chequeBounce.totalAmt || "",
    });

    if (series) {
      setCurrentSeries(series);

      localStorage.setItem(
        "chequeBounceSeries",
        series
      );
    }

    openTransactionEntry(
      "Cheque Bounce"
    );
  };

  const deleteChequeBounce =
    async (id) => {
      if (!id) {
        alert(
          "Cheque Bounce ID was not found."
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to delete this Cheque Bounce record?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const response =
          await secureFetch(
            `${API_URL}/transaction/cheque-bounce/${encodeURIComponent(
              id
            )}`,
            {
              method: "DELETE",
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          result.success === false
        ) {
          throw new Error(
            result.message ||
            "Cheque Bounce deletion failed."
          );
        }

        const recordsAfterDelete =
          Math.max(
            chequeBounceListTotalRecords -
            1,
            0
          );

        const pagesAfterDelete =
          Math.max(
            Math.ceil(
              recordsAfterDelete /
              chequeBounceListRowsPerPage
            ),
            1
          );

        const pageAfterDelete =
          Math.min(
            chequeBounceListCurrentPage,
            pagesAfterDelete
          );

        setChequeBounceListCurrentPage(
          pageAfterDelete
        );

        await loadChequeBounceList({
          page:
            pageAfterDelete,

          limit:
            chequeBounceListRowsPerPage,

          search:
            chequeBounceListSearchDebounced,

          filters:
            chequeBounceAppliedFilters,
        });

        await loadChequeBounces();

        alert(
          "Cheque Bounce deleted successfully."
        );
      } catch (error) {
        console.error(
          "Cheque Bounce delete error:",
          error
        );

        alert(
          error.message ||
          "Unable to delete Cheque Bounce."
        );
      }
    };
  // =========================
  // PDC DOCKET FUNCTIONS
  // =========================
  const handlePDCDocketInput = (
    event
  ) => {
    const { name, value } =
      event.target;

    const normalizeValue = (
      input
    ) =>
      String(input ?? "")
        .trim()
        .toLowerCase();

    const updatedData = {
      ...pdcDocketFormData,
      [name]: value
    };

    if (
      name === "houseBank"
    ) {
      const selectedBank =
        (
          bankCashAccounts || []
        ).find(
          (account) =>
            normalizeValue(
              getBankAccountName(
                account
              )
            ) ===
            normalizeValue(value)
        );

      const selectedBankName =
        getBankAccountName(
          selectedBank || {}
        ) || value;

      updatedData.houseBank =
        selectedBankName;

      updatedData.bankName =
        selectedBankName;

      updatedData.houseBankName =
        selectedBankName;

      updatedData.houseBankId =
        selectedBank?._id ||
        selectedBank?.id ||
        selectedBank?.accountId ||
        selectedBank?.SysAcCode ||
        selectedBank?.sysAcCode ||
        "";
    }

    setPDCDocketFormData(
      updatedData
    );

    if (
      [
        "houseBank",
        "fromDate",
        "toDate",
        "clearingType",
        "clearingDate"
      ].includes(name)
    ) {
      loadPDCDocketGrid(
        updatedData
      );
    }
  };
  const savePDCDocket =
    async () => {
      try {
        const docketNumber =
  requireVoucherNumber(
    pdcDocketFormData.docVNo,
    "PDC Docket"
  );

if (!docketNumber) {
  return;
}
        const selectedCheques =
          pdcDocketItems.filter(
            (item) =>
              item.selected === true
          );

        if (selectedCheques.length === 0) {
          alert(
            "Please select at least one cheque for the PDC Docket."
          );

          return;
        }

        const selectedTotalAmount =
          selectedCheques.reduce(
            (total, cheque) =>
              total +
              (Number(cheque.amount) || 0),
            0
          );
       const distributorId =
  String(
    localStorage.getItem(
      "distributorId"
    ) || ""
  ).trim();

const firmId =
  String(
    localStorage.getItem(
      "firmId"
    ) || ""
  ).trim();

if (
  !distributorId ||
  !firmId
) {
  alert(
    "Distributor ID or Firm ID is missing."
  );

  return;
}

const payload = {
  ...pdcDocketFormData,

  /*
   * Always send validated voucher number.
   */
  docVNo:
    Number(docketNumber),

  docSeries:
    String(
      pdcDocketFormData.docSeries ||
      "PDC"
    )
      .trim()
      .toUpperCase(),

  distributorId,
  firmId,

  totalCheques:
    selectedCheques.length,

  totalAmount:
    Number(
      selectedTotalAmount.toFixed(2)
    ),

  cheques:
    selectedCheques.map(
      (cheque, index) => {
        const {
          selected,
          ...chequeData
        } = cheque;

        return {
          ...chequeData,

          srNo:
            index + 1,

          amount:
            Number(
              chequeData.amount
            ) || 0,
        };
      }
    ),
};

        console.log(
          "PDC SAVE =",
          payload
        );

       const url = editPDCDocketId
  ? `${API_URL}/transaction/pdc-docket/${editPDCDocketId}`
  : `${API_URL}/transaction/pdc-docket`;

const method = editPDCDocketId
  ? "PUT"
  : "POST";

const response = await secureFetch(url, {
  method,

  headers: {
    "Content-Type": "application/json",
  },

  body: JSON.stringify(payload),
});

        const result =
          await response.json();

        if (
          !response.ok ||
          result.success === false
        ) {
          throw new Error(
            result.message ||
            "PDC Docket save failed."
          );
        }

       alert(
    editPDCDocketId
        ? "PDC Docket Updated Successfully"
        : "PDC Docket Saved Successfully"
);

        await loadPDCDockets();

        setPDCDocketListCurrentPage(
          1
        );

        await loadPDCDocketList({
          page: 1,

          limit:
            pdcDocketListRowsPerPage,

          search:
            pdcDocketListSearchDebounced,

          filters:
            pdcDocketAppliedFilters,
        });
        setEditPDCDocketId(null);

        resetPDCDocketForm();

        openTransactionList(
          "PDC Docket"
        );
      } catch (error) {
        console.error(
          "PDC Docket save error:",
          error
        );

        alert(
          error.message ||
          "PDC Docket Save Failed"
        );
      }
    };
  const loadPDCDockets = async () => {

    try {

      const response = await secureFetch(
        `${API_URL}/transaction/pdc-docket`
      );

      const result = await response.json();
      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message ||
          "PDC Docket save failed."
        );
      }

      if (result.success) {

        dispatch({
          type: "SET_PDC_DOCKETS",
          payload: result.data
        });

      }

    } catch (err) {

      console.log(err);

    }

  };
  /* =========================================================
   LOAD PDC DOCKET PAGINATED LIST

   This function is separate from loadPDCDockets().
   It is used only for the PDC Docket list screen.
   ========================================================= */

  const loadPDCDocketList = useCallback(
    async ({
      page =
      pdcDocketListCurrentPage,

      limit =
      pdcDocketListRowsPerPage,

      search =
      pdcDocketListSearchDebounced,

      filters =
      pdcDocketAppliedFilters,
    } = {}) => {
      try {
        const distributorId =
          localStorage.getItem(
            "distributorId"
          );

        const firmId =
          localStorage.getItem(
            "firmId"
          );

        if (
          !distributorId ||
          !firmId
        ) {
          dispatch({
            type:
              "SET_PDC_DOCKETS",
            payload: [],
          });

          setPDCDocketListTotalRecords(
            0
          );

          setPDCDocketListTotalPages(
            1
          );

          setPDCDocketListStartRecord(
            0
          );

          setPDCDocketListEndRecord(
            0
          );

          return [];
        }

        setPDCDocketListLoading(
          true
        );

        const requestedPage =
          Number(page) > 0
            ? Number(page)
            : 1;

        const requestedLimit =
          Number(limit) > 0
            ? Number(limit)
            : 10;

        const query =
          new URLSearchParams({
            distributorId:
              String(distributorId),

            firmId:
              String(firmId),

            page:
              String(requestedPage),

            limit:
              String(requestedLimit),
          });

        const cleanSearch =
          String(
            search || ""
          ).trim();

        const appliedFilters =
          filters || {};

        const appendFilter = (
          key,
          value
        ) => {
          const cleanValue =
            String(
              value ?? ""
            ).trim();

          if (cleanValue) {
            query.set(
              key,
              cleanValue
            );
          }
        };

        appendFilter(
          "search",
          cleanSearch
        );

        appendFilter(
          "fromDepositDate",
          appliedFilters.fromDepositDate
        );

        appendFilter(
          "toDepositDate",
          appliedFilters.toDepositDate
        );

        appendFilter(
          "houseBank",
          appliedFilters.houseBank
        );

        appendFilter(
          "pdcType",
          appliedFilters.pdcType
        );

        appendFilter(
          "docketNo",
          appliedFilters.docketNo
        );

        const response =
          await secureFetch(
            `${API_URL}/transaction/pdc-docket/list?${query.toString()}`
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          result.success === false
        ) {
          throw new Error(
            result.message ||
            "Failed to load PDC Docket list."
          );
        }

        const rawRecords =
          Array.isArray(
            result.records
          )
            ? result.records
            : Array.isArray(
              result.data
            )
              ? result.data
              : [];

        /*
         * Preserve all original PDC fields.
         * Only add safe ID aliases.
         */
        const mappedRecords =
          rawRecords.map(
            (record) => ({
              ...record,

              id:
                record._id ||
                record.id,

              _id:
                record._id ||
                record.id,

              originalItem:
                record,
            })
          );

        dispatch({
          type:
            "SET_PDC_DOCKETS",
          payload:
            mappedRecords,
        });

        const pagination =
          result.pagination || {};

        const returnedPage =
          Number(
            pagination.currentPage ||
            pagination.page ||
            requestedPage
          ) || 1;

        const returnedLimit =
          Number(
            pagination.limit ||
            requestedLimit
          ) || 10;

        const returnedTotalPages =
          Math.max(
            Number(
              pagination.totalPages ||
              1
            ),
            1
          );

        setPDCDocketListCurrentPage(
          returnedPage
        );

        setPDCDocketListRowsPerPage(
          returnedLimit
        );

        setPDCDocketListTotalRecords(
          Number(
            pagination.totalRecords ||
            0
          )
        );

        setPDCDocketListTotalPages(
          returnedTotalPages
        );

        setPDCDocketListStartRecord(
          Number(
            pagination.startRecord ||
            0
          )
        );

        setPDCDocketListEndRecord(
          Number(
            pagination.endRecord ||
            0
          )
        );

        return mappedRecords;
      } catch (error) {
        console.error(
          "PDC Docket list load error:",
          error
        );

        dispatch({
          type:
            "SET_PDC_DOCKETS",
          payload: [],
        });

        setPDCDocketListTotalRecords(
          0
        );

        setPDCDocketListTotalPages(
          1
        );

        setPDCDocketListStartRecord(
          0
        );

        setPDCDocketListEndRecord(
          0
        );

        alert(
          error.message ||
          "Unable to load PDC Docket list."
        );

        return [];
      } finally {
        setPDCDocketListLoading(
          false
        );
      }
    },
    [
      dispatch,
      pdcDocketListCurrentPage,
      pdcDocketListRowsPerPage,
      pdcDocketListSearchDebounced,
      pdcDocketAppliedFilters,
    ]
  );
  /* =========================================================
     PDC DOCKET SEARCH DEBOUNCE
     ========================================================= */

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setPDCDocketListSearchDebounced(
          String(
            pdcDocketListSearch ||
            ""
          ).trim()
        );

        setPDCDocketListCurrentPage(
          1
        );
      }, 400);

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [pdcDocketListSearch]);

  /* =========================================================
     LOAD PDC DOCKET LIST WHEN PAGE, LIMIT,
     SEARCH OR APPLIED FILTERS CHANGE
     ========================================================= */

  useEffect(() => {
    const pdcDocketListIsOpen =
      activeTransaction ===
      "PDC Docket" &&
      !transactionFormMode?.[
      "PDC Docket"
      ];

    if (!pdcDocketListIsOpen) {
      return;
    }

    loadPDCDocketList({
      page:
        pdcDocketListCurrentPage,

      limit:
        pdcDocketListRowsPerPage,

      search:
        pdcDocketListSearchDebounced,

      filters:
        pdcDocketAppliedFilters,
    });
  }, [
    activeTransaction,
    transactionFormMode?.[
    "PDC Docket"
    ],
    pdcDocketListCurrentPage,
    pdcDocketListRowsPerPage,
    pdcDocketListSearchDebounced,
    pdcDocketAppliedFilters,
    loadPDCDocketList,
  ]);

  const loadContra = async () => {

    try {

      const response = await secureFetch(
        `${API_URL}/transaction/contra`,
      );

      const result = await response.json();

      if (result.success) {

        dispatch({
          type: "SET_CONTRA",
          payload: result.data
        });

      }

    } catch (err) {

      console.log(err);

    }
  };

  /* =========================================================
   LOAD CONTRA PAGINATED LIST

   Used only by the Contra list screen.
   ========================================================= */

  const loadContraList = useCallback(
    async ({
      page =
      contraListCurrentPage,

      limit =
      contraListRowsPerPage,

      search =
      contraListSearchDebounced,

      filters =
      contraAppliedFilters,
    } = {}) => {
      try {
        const distributorId =
          localStorage.getItem(
            "distributorId"
          );

        const firmId =
          localStorage.getItem(
            "firmId"
          );

        if (
          !distributorId ||
          !firmId
        ) {
          dispatch({
            type: "SET_CONTRA",
            payload: [],
          });

          setContraListTotalRecords(
            0
          );

          setContraListTotalPages(
            1
          );

          setContraListStartRecord(
            0
          );

          setContraListEndRecord(
            0
          );

          return [];
        }

        setContraListLoading(
          true
        );

        const requestedPage =
          Number(page) > 0
            ? Number(page)
            : 1;

        const requestedLimit =
          Number(limit) > 0
            ? Number(limit)
            : 10;

        const query =
          new URLSearchParams({
            distributorId:
              String(
                distributorId
              ),

            firmId:
              String(
                firmId
              ),

            page:
              String(
                requestedPage
              ),

            limit:
              String(
                requestedLimit
              ),
          });

        const appendQueryValue = (
          key,
          value
        ) => {
          const cleanValue =
            String(
              value ?? ""
            ).trim();

          if (cleanValue) {
            query.set(
              key,
              cleanValue
            );
          }
        };

        appendQueryValue(
          "search",
          search
        );

        appendQueryValue(
          "fromDate",
          filters?.fromDate
        );

        appendQueryValue(
          "toDate",
          filters?.toDate
        );

        appendQueryValue(
          "transactionType",
          filters?.transactionType
        );

        appendQueryValue(
          "voucherNo",
          filters?.voucherNo
        );

        appendQueryValue(
          "narration",
          filters?.narration
        );

        const response =
          await secureFetch(
            `${API_URL}/transaction/contra/list?${query.toString()}`
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          result.success === false
        ) {
          throw new Error(
            result.message ||
            "Failed to load Contra list."
          );
        }

        const rawRecords =
          Array.isArray(
            result.records
          )
            ? result.records
            : Array.isArray(
              result.data
            )
              ? result.data
              : [];

        const mappedRecords =
          rawRecords.map(
            (record) => ({
              ...record,

              id:
                record._id ||
                record.id,

              _id:
                record._id ||
                record.id,

              originalItem:
                record,
            })
          );

        dispatch({
          type: "SET_CONTRA",
          payload:
            mappedRecords,
        });

        const pagination =
          result.pagination || {};

        const returnedPage =
          Number(
            pagination.currentPage ||
            pagination.page ||
            requestedPage
          ) || 1;

        const returnedLimit =
          Number(
            pagination.limit ||
            requestedLimit
          ) || 10;

        const returnedTotalPages =
          Math.max(
            Number(
              pagination.totalPages ||
              1
            ),
            1
          );

        setContraListCurrentPage(
          returnedPage
        );

        setContraListRowsPerPage(
          returnedLimit
        );

        setContraListTotalRecords(
          Number(
            pagination.totalRecords ||
            0
          )
        );

        setContraListTotalPages(
          returnedTotalPages
        );

        setContraListStartRecord(
          Number(
            pagination.startRecord ||
            0
          )
        );

        setContraListEndRecord(
          Number(
            pagination.endRecord ||
            0
          )
        );

        return mappedRecords;
      } catch (error) {
        console.error(
          "Contra list load error:",
          error
        );

        dispatch({
          type: "SET_CONTRA",
          payload: [],
        });

        setContraListTotalRecords(
          0
        );

        setContraListTotalPages(
          1
        );

        setContraListStartRecord(
          0
        );

        setContraListEndRecord(
          0
        );

        alert(
          error.message ||
          "Unable to load Contra list."
        );

        return [];
      } finally {
        setContraListLoading(
          false
        );
      }
    },
    [
      dispatch,
      contraListCurrentPage,
      contraListRowsPerPage,
      contraListSearchDebounced,
      contraAppliedFilters,
    ]
  );
  /* =========================================================
     CONTRA SEARCH DEBOUNCE
     ========================================================= */

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setContraListSearchDebounced(
          String(
            contraListSearch ||
            ""
          ).trim()
        );

        setContraListCurrentPage(
          1
        );
      }, 400);

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [contraListSearch]);
  /* =========================================================
     LOAD CONTRA LIST WHEN PAGE, LIMIT,
     SEARCH OR FILTERS CHANGE
     ========================================================= */

  useEffect(() => {
    const contraListIsOpen =
      activeTransaction ===
      "Contra" &&
      !transactionFormMode?.[
      "Contra"
      ];

    if (!contraListIsOpen) {
      return;
    }

    loadContraList({
      page:
        contraListCurrentPage,

      limit:
        contraListRowsPerPage,

      search:
        contraListSearchDebounced,

      filters:
        contraAppliedFilters,
    });
  }, [
    activeTransaction,
    transactionFormMode?.[
    "Contra"
    ],
    contraListCurrentPage,
    contraListRowsPerPage,
    contraListSearchDebounced,
    contraAppliedFilters,
    loadContraList,
  ]);

  const resetPDCDocketForm = () => {
  setPDCDocketFormData({
    depositDate:
      new Date()
        .toISOString()
        .split("T")[0],

    docSeries: "PDC",

    docVNo:
      autoVoucherNo === true
        ? String(
            (state.pdcDockets?.length ||
              0) + 1
          )
        : "",

    fromDate:
      new Date()
        .toISOString()
        .split("T")[0],

    toDate:
      new Date()
        .toISOString()
        .split("T")[0],

    houseBank: "",
    bankName: "",

    houseBankId: "",
    houseBankName: "",

    narration: "",

    clearingType:
      "SAME BANK",

    clearingDate: "",

    totalAmount: "0.00",
    totalCheques: "0",
  });

  setPDCDocketItems([]);
  setEditPDCDocketId(null);

};

  const editPDCDocket = (
    docket
  ) => {
    setEditPDCDocketId(
      docket._id ||
      docket.id ||
      ""
    );

    const existingCheques =
      Array.isArray(
        docket.cheques
      )
        ? docket.cheques.map(
          (cheque, index) => ({
            ...cheque,

            srNo:
              index + 1,

            selected:
              true
          })
        )
        : [];

    const existingTotalAmount =
      existingCheques.reduce(
        (total, cheque) =>
          total +
          (
            Number(
              cheque.amount
            ) || 0
          ),
        0
      );

    setPDCDocketFormData({
      ...docket,

      totalCheques:
        String(
          existingCheques.length
        ),

      totalAmount:
        existingTotalAmount.toFixed(2)
    });

    setPDCDocketItems(
      existingCheques
    );

 setActiveTransaction("PDC Docket");

setTransactionFormMode((prev) => ({
  ...prev,
  "PDC Docket": true,
}));
  };
  const deletePDCDocket =
    async (id) => {
      if (!id) {
        alert(
          "PDC Docket ID was not found."
        );

        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to delete this PDC Docket?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const response =
          await secureFetch(
            `${API_URL}/transaction/pdc-docket/${encodeURIComponent(
              id
            )}`,
            {
              method: "DELETE",
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          result.success === false
        ) {
          throw new Error(
            result.message ||
            "PDC Docket deletion failed."
          );
        }

        /*
         * Work out the final valid page after
         * deleting this record.
         */
        const recordsAfterDelete =
          Math.max(
            pdcDocketListTotalRecords -
            1,
            0
          );

        const pagesAfterDelete =
          Math.max(
            Math.ceil(
              recordsAfterDelete /
              pdcDocketListRowsPerPage
            ),
            1
          );

        const pageAfterDelete =
          Math.min(
            pdcDocketListCurrentPage,
            pagesAfterDelete
          );

        setPDCDocketListCurrentPage(
          pageAfterDelete
        );

        /*
         * Refresh the current backend page.
         */
        await loadPDCDocketList({
          page:
            pageAfterDelete,

          limit:
            pdcDocketListRowsPerPage,

          search:
            pdcDocketListSearchDebounced,

          filters:
            pdcDocketAppliedFilters,
        });

        /*
         * Keep the existing complete PDC data
         * synchronized for other current flows.
         */
        await loadPDCDockets();

        alert(
          "PDC Docket deleted successfully."
        );
      } catch (error) {
        console.error(
          "PDC Docket delete error:",
          error
        );

        alert(
          error.message ||
          "Unable to delete PDC Docket."
        );
      }
    };

  const loadNextContraNo = async () => {
    if (autoVoucherNo !== true) {
      return;
    }

    try {
      const distributorId = String(
        localStorage.getItem(
          "distributorId"
        ) || ""
      ).trim();

      const firmId = String(
        localStorage.getItem(
          "firmId"
        ) || ""
      ).trim();

      console.log(
        "Loading Contra number:",
        {
          distributorId,
          firmId
        }
      );

      if (
        !distributorId ||
        !firmId
      ) {
        console.error(
          "Contra number not loaded because distributorId or firmId is missing."
        );

        return;
      }

      const query =
        new URLSearchParams({
          distributorId,
          firmId
        });

      const response = await fetch(
        `${API_URL}/transaction/contra-next-no?${query.toString()}`
      );

      const result =
        await response.json();

      console.log(
        "Contra next-number response:",
        result
      );

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message ||
          "Failed to load next Contra number."
        );
      }

      const nextNo =
        Number(result.nextNo) || 1;

      setContraFormData(
        (previous) => ({
          ...previous,
          tranVNo: nextNo
        })
      );
    } catch (error) {
      console.error(
        "Contra next number error:",
        error
      );

      alert(
        error.message ||
        "Unable to generate Contra number."
      );
    }
  };
  // =========================
  // CONTRA FUNCTIONS
  // =========================
  const handleContraInput = (e) => {
    const { name, value } = e.target;
    setContraFormData({ ...contraFormData, [name]: value });
  };

  const saveContra =
    async () => {
      try {
        const contraNumber =
          requireVoucherNumber(
            contraFormData.tranVNo,
            "Contra Voucher"
          );

        if (!contraNumber) {
          return;
        }
        const distributorId =
          localStorage.getItem(
            "distributorId"
          ) || "";

        const firmId =
          localStorage.getItem(
            "firmId"
          ) || "";

        if (
          !distributorId ||
          !firmId
        ) {
          alert(
            "Distributor or firm information is missing."
          );

          return;
        }

        const transactionDate =
          String(
            contraFormData.transactionDate ||
            ""
          ).trim();

   const tranVNo =
  Number(
    contraNumber
  );

        const transactionType =
          String(
            contraFormData.transactionType ||
            ""
          ).trim();

        const amount =
          Number(
            contraFormData.amount
          );

        if (!transactionDate) {
          alert(
            "Please select the transaction date."
          );

          return;
        }

        if (
          !Number.isFinite(tranVNo) ||
          tranVNo <= 0
        ) {
          alert(
            "Please enter a valid transaction voucher number."
          );

          return;
        }

        if (!transactionType) {
          alert(
            "Please select the transaction type."
          );

          return;
        }

        if (
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          alert(
            "Please enter a valid amount."
          );

          return;
        }

        const payload = {
          ...contraFormData,

          distributorId,
          firmId,

          tranVNo: Number(contraNumber),
          amount,

          transactionDate,
          transactionType,

          narration:
            String(
              contraFormData.narration ||
              ""
            ).trim(),
        };

       const url = editContraId
  ? `${API_URL}/transaction/contra/${editContraId}`
  : `${API_URL}/transaction/contra`;

const method = editContraId
  ? "PUT"
  : "POST";

const response = await secureFetch(url, {
  method,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

        const result =
          await response.json();

        if (
          !response.ok ||
          result.success === false
        ) {
          throw new Error(
            result.message ||
            "Contra save failed."
          );
        }

        alert(
  editContraId
    ? "Contra Updated Successfully"
    : "Contra Saved Successfully"
);

        /*
         * Newly saved records are normally shown
         * on the first page because backend sorting
         * is descending.
         */
        setContraListCurrentPage(
          1
        );

        setEditContraId(null);
        resetContraForm();

        openTransactionList(
          "Contra"
        );

        await loadContraList({
          page: 1,

          limit:
            contraListRowsPerPage,

          search:
            contraListSearchDebounced,

          filters:
            contraAppliedFilters,
        });
      } catch (error) {
        console.error(
          "Contra save error:",
          error
        );

        alert(
          error.message ||
          "Unable to save Contra."
        );
      }
    };


  const resetContraForm = () => {
    setContraFormData({
      transactionDate: new Date().toISOString().split("T")[0], tranVNo: "",
      transactionType: "CASH DEPOSIT", amount: "", narration: ""
    });
    setEditContraId(null);
  };

const editContra = (contra) => {
  if (!contra) {
    return;
  }

  setEditContraId(
    contra._id ||
    contra.id ||
    ""
  );

  setContraFormData({
    transactionDate:
      String(
        contra.transactionDate ||
        contra.vDate ||
        ""
      ).slice(0, 10),

    tranVNo:
      contra.tranVNo ||
      contra.vNo ||
      "",

    transactionType:
      contra.transactionType ||
      contra.type ||
      "CASH DEPOSIT",

    amount:
      contra.amount ?? "",

    narration:
      contra.narration || "",
  });

  // DON'T call openTransactionEntry()

  setActiveTransaction("Contra");

  setTransactionFormMode((prev) => ({
    ...prev,
    "Contra": true,
  }));
};

  const deleteContra =
    async (id) => {
      if (!id) {
        alert(
          "Contra record ID was not found."
        );

        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to delete this Contra transaction?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const response =
          await secureFetch(
            `${API_URL}/transaction/contra/${encodeURIComponent(
              id
            )}`,
            {
              method: "DELETE",
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          result.success === false
        ) {
          throw new Error(
            result.message ||
            "Contra deletion failed."
          );
        }

        const recordsAfterDelete =
          Math.max(
            contraListTotalRecords -
            1,
            0
          );

        const pagesAfterDelete =
          Math.max(
            Math.ceil(
              recordsAfterDelete /
              contraListRowsPerPage
            ),
            1
          );

        const pageAfterDelete =
          Math.min(
            contraListCurrentPage,
            pagesAfterDelete
          );

        setContraListCurrentPage(
          pageAfterDelete
        );

        await loadContraList({
          page:
            pageAfterDelete,

          limit:
            contraListRowsPerPage,

          search:
            contraListSearchDebounced,

          filters:
            contraAppliedFilters,
        });

        alert(
          "Contra deleted successfully."
        );
      } catch (error) {
        console.error(
          "Contra delete error:",
          error
        );

        alert(
          error.message ||
          "Unable to delete Contra."
        );
      }
    };

  // =========================
  // COLLECTION VOUCHER FUNCTIONS
  // =========================
  const handleCollectionVoucherInput = (e) => {
    const { name, value } = e.target;

    setCollectionVoucherFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (name === "collectionType") {
      setBillItems(value === "Bill wise" ? getCollectionPendingBills() : []);
    }
  };

  useEffect(() => {
    let total = 0, billCount = 0;
    if (collectionVoucherFormData.collectionType === "Bill wise") {
      billItems.forEach(item => {
        if (item.selected && item.collectionAmt) {
          total += parseFloat(item.collectionAmt) || 0;
          billCount++;
        }
      });
    } else {
      billItems.forEach(group => {
        if (group.selected) {
          total += parseFloat(group.collectionAmt) || 0;
          billCount += group.bills?.length || 0;
        }
      });
    }
    setTotalCollectionAmount(total);
    setTotalCashCollection(0);
    setTotalChequeCollection(0);
    setTotalBills(billCount);
  }, [billItems, collectionVoucherFormData.collectionType]);
  const handleBillSelect = (index, selected) => {
    const newBillItems = [...billItems];

    newBillItems[index] = {
      ...newBillItems[index],
      selected
    };

    if (selected) {
      newBillItems[index].collectionAmt =
        newBillItems[index].balance;
    } else {
      newBillItems[index].collectionAmt = 0;
    }

    setBillItems(newBillItems);
  };
  const openReceiptFromCollectionBill = (bill) => {
    if (!bill) return;

    const receiptAmt = Number(bill.balance) || 0;

    const receiptRow = {
      id: Date.now(),
      srNo: 1,
      trnSeries: bill.billSeries,
      trnNo: bill.billNo,
      trnDate: bill.billDate,
      amount: Number(bill.billAmt) || 0,
      adjustAmt: Number(bill.oldCollection) || 0,
      balanceAmt: 0,
      nowAdjust: receiptAmt,
      discount: 0,
      discAmount: 0,
      remark: ""
    };

    const nextReceiptData = {
      ...receiptFormData,
      receiptDate: collectionVoucherFormData.collectionDate || new Date().toISOString().split("T")[0],
      rno: (state.receipts?.length || 0) + 1,
      billSeries: bill.billSeries || "",
      billNo: bill.billNo || "",
      partyName: bill.partyName || "",
      partyCode: bill.partyCode || "",
      salesman: bill.salesmanName || bill.salesmanCode || "",
      receiptAmount: receiptAmt
    };

    setReceiptFormData(nextReceiptData);
    setReceiptItems([receiptRow]);
    setReceiptSummary({
      totalAdjusted: receiptAmt,
      balanceAmount: 0,
      totalDiscount: 0
    });

    setCollectionReceiptBillId(bill.id);
    setShowCollectionReceiptModal(true);
  };

  const handleCollectionAmtChange = (bill, e) => {

    e?.preventDefault();
    e?.stopPropagation();

    console.log("Clicked Bill:", bill);

    if (!bill) return;

    openReceiptFromCollectionBill(bill);
  };

  const handleDiscountChange = (index, value) => {
    const newBillItems = [...billItems];
    newBillItems[index].discount = parseFloat(value) || 0;
    setBillItems(newBillItems);
  };

  const saveCollectionVoucher = async () => {
    try {
      const distributorId =
        localStorage.getItem("distributorId") || "";

      const firmId =
        localStorage.getItem("firmId") || "";

      if (!distributorId || !firmId) {
        alert(
          "Distributor or firm information is missing."
        );
        return;
      }

      const collectionDate = String(
        collectionVoucherFormData.collectionDate || ""
      ).trim();

      const colVNo = Number(
        collectionVoucherFormData.colVNo
      );

      if (!collectionDate) {
        alert(
          "Please select Collection Date."
        );
        return;
      }

      if (
        !Number.isFinite(colVNo) ||
        colVNo <= 0
      ) {
        alert(
          "Please enter a valid Collection Voucher number."
        );
        return;
      }

      const selectedBills = Array.isArray(
        billItems
      )
        ? billItems.filter(
          (bill) =>
            bill.selected ||
            Number(
              bill.collectionAmt || 0
            ) > 0
        )
        : [];

      if (selectedBills.length === 0) {
        alert(
          "Please select at least one bill."
        );
        return;
      }
      const enteredVoucherNo = String(
        collectionVoucherFormData.colVNo ||
        ""
      ).trim();

      if (!enteredVoucherNo) {
        alert(
          autoVoucherNo === true
            ? "Voucher number could not be generated."
            : "Please enter Collection Voucher number."
        );

        return;
      }

      if (
        !/^\d+$/.test(enteredVoucherNo)
      ) {
        alert(
          "Collection Voucher number must contain numbers only."
        );

        return;
      }

      const payload = {
        ...collectionVoucherFormData,

        distributorId,
        firmId,

        collectionDate,
        colVNo,

        totalCollectionAmount:
          Number(totalCollectionAmount) || 0,

        totalCashCollection:
          Number(totalCashCollection) || 0,

        totalChequeCollection:
          Number(totalChequeCollection) || 0,

        totalBills:
          Number(totalBills) ||
          selectedBills.length,

        bills: selectedBills,
      };

     const url = editCollectionVoucherId
  ? `${API_URL}/transaction/collection-voucher/${editCollectionVoucherId}`
  : `${API_URL}/transaction/collection-voucher`;

const method =
  editCollectionVoucherId
    ? "PUT"
    : "POST";

const response = await secureFetch(
  url,
  {
    method,

    headers: {
      "Content-Type":
        "application/json",
    },

    body: JSON.stringify(payload),
  }
);

      const result =
        await response.json();

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message ||
          "Collection Voucher save failed."
        );
      }

      alert(
  editCollectionVoucherId
    ? "Collection Voucher Updated Successfully"
    : "Collection Voucher Saved Successfully"
);

      /*
       * Reset page first because newly saved
       * records appear on page 1.
       */
      setCollectionVoucherCurrentPage(
        1
      );

      /*
       * Reset the entry form.
       */
      setEditCollectionVoucherId(null);
      resetCollectionVoucherForm();

      /*
       * Open Collection Voucher list.
       */
      openTransactionList(
        "Collection Voucher"
      );

      /*
       * Reload only the first backend page.
       */
      await loadCollectionVoucherList({
        page: 1,

        limit:
          collectionVoucherRowsPerPage,

        search:
          collectionVoucherSearchDebounced,

        filters:
          collectionVoucherAppliedFilters,
      });
    } catch (error) {
      console.error(
        "Collection Voucher save error:",
        error
      );

      alert(
        error.message ||
        "Unable to save Collection Voucher."
      );
    }
  };

  const loadPendingBillsSalesman =
    async (salesmanCode) => {

      const response = await fetch(
        `${API_URL}/transaction/collection-voucher/pending-bills/salesman/${salesmanCode}`
      );

      const result =
        await response.json();

      if (result.success) {

        setBillItems(result.data);

      }

    };

  const loadPendingBillsArea =
    async (areaCode) => {

      const response = await fetch(
        `${API_URL}/transaction/collection-voucher/pending-bills/area/${areaCode}`
      );

      const result =
        await response.json();

      if (result.success) {

        setBillItems(result.data);

      }

    };


  // const loadSalesmanBills = async () => {

  //   try {

  //     const response = await fetch(
  //       "${API_URL}/transaction/collection-voucher/pending-bills"
  //     );

  //     const result = await response.json();

  //     if (result.success) {

  //       const grouped = {};

  //       result.data.forEach(bill => {

  //         const salesman =
  //           bill.SalesmanCode ||
  //           bill.salesmanCode ||
  //           "NA";

  //         if (!grouped[salesman]) {

  //           grouped[salesman] = {
  //             code: salesman,
  //             name: salesman,
  //             selected: false,
  //             bills: []
  //           };
  //         }

  //         grouped[salesman].bills.push({
  //           billSeries: bill.BillSeries,
  //           billNo: bill.BillNo,
  //           billDate: bill.BillDate,
  //           partyCode: bill.PartyCode,
  //           partyName: bill.PartyName,
  //           billAmt: Number(bill.NetAmount || 0),
  //           balance: Number(
  //             bill.BalanceAmount ||
  //             bill.NetAmount ||
  //             0
  //           )
  //         });

  //       });

  //       setSalesmanBills(
  //         Object.values(grouped)
  //       );
  //     }

  //   } catch (err) {

  //     console.log(err);

  //   }
  // };


  const loadPendingBills = async () => {
    try {

      const response = await secureFetch(
        `${API_URL}/transaction/collection-voucher`
      );

      const result = await response.json();

      // if (result.success) {
      //   setPendingBillsApi(result.data || []);
      // }

    } catch (err) {
      console.log(err);
    }
  };
  const loadCollectionVouchers =
    async () => {
      try {
        const response =
          await secureFetch(
            `${API_URL}/transaction/collection-voucher`
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          result.success === false
        ) {
          throw new Error(
            result.message ||
            "Failed to load Collection Vouchers."
          );
        }

        dispatch({
          type:
            "SET_COLLECTION_VOUCHERS",

          payload:
            Array.isArray(result.data)
              ? result.data
              : [],
        });
      } catch (error) {
        console.error(
          "Collection Voucher load error:",
          error
        );
      }
    };
  /* =========================================================
   LOAD COLLECTION VOUCHER PAGINATED LIST
   ========================================================= */

  const loadCollectionVoucherList =
    useCallback(
      async ({
        page =
        collectionVoucherCurrentPage,

        limit =
        collectionVoucherRowsPerPage,

        search =
        collectionVoucherSearchDebounced,

        filters =
        collectionVoucherAppliedFilters,
      } = {}) => {
        try {
          const distributorId =
            localStorage.getItem(
              "distributorId"
            );

          const firmId =
            localStorage.getItem(
              "firmId"
            );

          if (
            !distributorId ||
            !firmId
          ) {
            dispatch({
              type:
                "SET_COLLECTION_VOUCHERS",

              payload: [],
            });

            setCollectionVoucherTotalRecords(
              0
            );

            setCollectionVoucherTotalPages(
              1
            );

            setCollectionVoucherStartRecord(
              0
            );

            setCollectionVoucherEndRecord(
              0
            );

            return [];
          }

          setCollectionVoucherListLoading(
            true
          );

          const requestedPage =
            Number(page) > 0
              ? Number(page)
              : 1;

          const requestedLimit =
            Number(limit) > 0
              ? Number(limit)
              : 10;

          const query =
            new URLSearchParams({
              distributorId:
                String(
                  distributorId
                ),

              firmId:
                String(
                  firmId
                ),

              page:
                String(
                  requestedPage
                ),

              limit:
                String(
                  requestedLimit
                ),
            });

          const appendQueryValue = (
            key,
            value
          ) => {
            const cleanValue =
              String(
                value ?? ""
              ).trim();

            if (cleanValue) {
              query.set(
                key,
                cleanValue
              );
            }
          };

          appendQueryValue(
            "search",
            search
          );

          appendQueryValue(
            "fromDate",
            filters?.fromDate
          );

          appendQueryValue(
            "toDate",
            filters?.toDate
          );

          appendQueryValue(
            "collectionType",
            filters?.collectionType
          );

          appendQueryValue(
            "voucherNo",
            filters?.voucherNo
          );

          appendQueryValue(
            "minimumAmount",
            filters?.minimumAmount
          );

          const response =
            await secureFetch(
              `${API_URL}/transaction/collection-voucher/list?${query.toString()}`
            );

          const result =
            await response.json();

          if (
            !response.ok ||
            result.success === false
          ) {
            throw new Error(
              result.message ||
              "Failed to load Collection Voucher list."
            );
          }

          const rawRecords =
            Array.isArray(
              result.records
            )
              ? result.records
              : Array.isArray(
                result.data
              )
                ? result.data
                : [];

          const mappedRecords =
            rawRecords.map(
              (record) => ({
                ...record,

                id:
                  record._id ||
                  record.id,

                _id:
                  record._id ||
                  record.id,

                selectedBills:
                  Array.isArray(
                    record.selectedBills
                  )
                    ? record.selectedBills
                    : Array.isArray(
                      record.bills
                    )
                      ? record.bills
                      : [],

                bills:
                  Array.isArray(
                    record.bills
                  )
                    ? record.bills
                    : Array.isArray(
                      record.selectedBills
                    )
                      ? record.selectedBills
                      : [],

                originalItem:
                  record,
              })
            );

          dispatch({
            type:
              "SET_COLLECTION_VOUCHERS",

            payload:
              mappedRecords,
          });

          const pagination =
            result.pagination || {};

          const returnedPage =
            Number(
              pagination.currentPage ||
              pagination.page ||
              requestedPage
            ) || 1;

          const returnedLimit =
            Number(
              pagination.limit ||
              requestedLimit
            ) || 10;

          const returnedTotalPages =
            Math.max(
              Number(
                pagination.totalPages ||
                1
              ),
              1
            );

          setCollectionVoucherCurrentPage(
            returnedPage
          );

          setCollectionVoucherRowsPerPage(
            returnedLimit
          );

          setCollectionVoucherTotalRecords(
            Number(
              pagination.totalRecords ||
              0
            )
          );

          setCollectionVoucherTotalPages(
            returnedTotalPages
          );

          setCollectionVoucherStartRecord(
            Number(
              pagination.startRecord ||
              0
            )
          );

          setCollectionVoucherEndRecord(
            Number(
              pagination.endRecord ||
              0
            )
          );

          return mappedRecords;
        } catch (error) {
          console.error(
            "Collection Voucher list load error:",
            error
          );

          dispatch({
            type:
              "SET_COLLECTION_VOUCHERS",

            payload: [],
          });

          setCollectionVoucherTotalRecords(
            0
          );

          setCollectionVoucherTotalPages(
            1
          );

          setCollectionVoucherStartRecord(
            0
          );

          setCollectionVoucherEndRecord(
            0
          );

          alert(
            error.message ||
            "Unable to load Collection Voucher list."
          );

          return [];
        } finally {
          setCollectionVoucherListLoading(
            false
          );
        }
      },
      [
        dispatch,
        collectionVoucherCurrentPage,
        collectionVoucherRowsPerPage,
        collectionVoucherSearchDebounced,
        collectionVoucherAppliedFilters,
      ]
    );

  /* =========================================================
   COLLECTION VOUCHER SEARCH DEBOUNCE
   ========================================================= */

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setCollectionVoucherSearchDebounced(
          String(
            collectionVoucherSearch ||
            ""
          ).trim()
        );

        setCollectionVoucherCurrentPage(
          1
        );
      }, 400);

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [collectionVoucherSearch]);

  /* =========================================================
     LOAD COLLECTION VOUCHER LIST
     ========================================================= */

  useEffect(() => {
    const collectionVoucherListIsOpen =
      activeTransaction ===
      "Collection Voucher" &&
      !transactionFormMode?.[
      "Collection Voucher"
      ];

    if (
      !collectionVoucherListIsOpen
    ) {
      return;
    }

    loadCollectionVoucherList({
      page:
        collectionVoucherCurrentPage,

      limit:
        collectionVoucherRowsPerPage,

      search:
        collectionVoucherSearchDebounced,

      filters:
        collectionVoucherAppliedFilters,
    });
  }, [
    activeTransaction,
    transactionFormMode?.[
    "Collection Voucher"
    ],
    collectionVoucherCurrentPage,
    collectionVoucherRowsPerPage,
    collectionVoucherSearchDebounced,
    collectionVoucherAppliedFilters,
    loadCollectionVoucherList,
  ]);

  const loadNextCollectionVoucherNo = async () => {
    if (autoVoucherNo !== true) {
      return;
    }
    try {
      const distributorId = String(
        localStorage.getItem("distributorId") || ""
      ).trim();

      const firmId = String(
        localStorage.getItem("firmId") || ""
      ).trim();

      if (
        !distributorId ||
        !firmId
      ) {
        console.error(
          "Collection Voucher number not loaded because distributorId or firmId is missing."
        );

        return;
      }

      const query = new URLSearchParams({
        distributorId,
        firmId
      });

      const response = await fetch(
        `${API_URL}/transaction/collection-voucher-next-no?${query.toString()}`
      );

      const result = await response.json();

      console.log(
        "Collection Voucher next-number response:",
        result
      );

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message ||
          "Failed to load next Collection Voucher number."
        );
      }

      const nextNo =
        Number(result.nextNo) || 1;

      setCollectionVoucherFormData(
        (previous) => ({
          ...previous,
          colVNo: nextNo
        })
      );
    } catch (error) {
      console.error(
        "Collection Voucher next-number error:",
        error
      );

      alert(
        error.message ||
        "Unable to generate Collection Voucher number."
      );
    }
  };

  const resetCollectionVoucherForm = () => {
    setCollectionVoucherFormData({
      collectionDate:
        new Date()
          .toISOString()
          .split("T")[0],

      colVNo: "",

      narration: "",

      collectionType:
        "Bill wise",
    });

    setBillItems([]);

    setTotalCollectionAmount(0);

    setTotalCashCollection(0);

    setTotalChequeCollection(0);

    setTotalBills(0);

    setEditCollectionVoucherId(
      null
    );
  };
  const editCollectionVoucher = (
    voucher
  ) => {
    if (!voucher) {
      return;
    }

    setEditCollectionVoucherId(
      voucher._id ||
      voucher.id ||
      ""
    );

    setCollectionVoucherFormData({
      collectionDate:
        String(
          voucher.collectionDate ||
          voucher.vDate ||
          ""
        ).slice(0, 10),

      colVNo:
        voucher.colVNo ||
        voucher.collectionVNo ||
        voucher.vNo ||
        "",

      narration:
        voucher.narration ||
        "",

      collectionType:
        voucher.collectionType ||
        voucher.type ||
        "Bill wise",
    });

    const voucherBills =
      Array.isArray(voucher.bills)
        ? voucher.bills
        : Array.isArray(
          voucher.selectedBills
        )
          ? voucher.selectedBills
          : [];

    setBillItems(
      voucherBills
    );

    setTotalCollectionAmount(
      Number(
        voucher.totalCollectionAmount ||
        voucher.totalAmount ||
        0
      )
    );

    setTotalCashCollection(
      Number(
        voucher.totalCashCollection ||
        0
      )
    );

    setTotalChequeCollection(
      Number(
        voucher.totalChequeCollection ||
        0
      )
    );

    setTotalBills(
      Number(
        voucher.totalBills ||
        voucher.billCount ||
        voucherBills.length ||
        0
      )
    );

   setActiveTransaction(
  "Collection Voucher"
);

setTransactionFormMode((prev) => ({
  ...prev,
  "Collection Voucher": true,
}));
  };

  const deleteCollectionVoucher =
    async (id) => {
      if (!id) {
        alert(
          "Collection Voucher ID not found."
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to delete this Collection Voucher?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const response =
          await secureFetch(
            `${API_URL}/transaction/collection-voucher/${encodeURIComponent(
              id
            )}`,
            {
              method: "DELETE",
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          result.success === false
        ) {
          throw new Error(
            result.message ||
            "Collection Voucher deletion failed."
          );
        }

        const recordsAfterDelete =
          Math.max(
            collectionVoucherTotalRecords -
            1,
            0
          );

        const pagesAfterDelete =
          Math.max(
            Math.ceil(
              recordsAfterDelete /
              collectionVoucherRowsPerPage
            ),
            1
          );

        const pageAfterDelete =
          Math.min(
            collectionVoucherCurrentPage,
            pagesAfterDelete
          );

        setCollectionVoucherCurrentPage(
          pageAfterDelete
        );

        await loadCollectionVoucherList({
          page:
            pageAfterDelete,

          limit:
            collectionVoucherRowsPerPage,

          search:
            collectionVoucherSearchDebounced,

          filters:
            collectionVoucherAppliedFilters,
        });

        alert(
          "Collection Voucher deleted successfully."
        );
      } catch (error) {
        console.error(
          "Collection Voucher delete error:",
          error
        );

        alert(
          error.message ||
          "Unable to delete Collection Voucher."
        );
      }
    };
  // =========================
  // RENDER FUNCTIONS
  // =========================


  const loadReceipts = async () => {
    try {
      console.log("LOAD RECEIPTS START");

      const response = await secureFetch(
        `${API_URL}/transaction/receipt`
      );

      const result = await response.json();

      console.log("RECEIPT API RESULT =", result);

      if (!result.success) {
        console.log("Receipt load failed:", result.message);
        return;
      }

      const receipts = (result.data || []).map((r) => ({
        id: r._id,

        header: {
          receiptDate: r.receiptDate || "",
          rno: r.rno || "",
          billSeries: r.billSeries || "",
          billNo: r.billNo || "",
          partyName: r.partyName || "",
          salesman: r.salesmanName || r.salesman || "",
          bankCash: r.bankCash || "",
          chequeNo: r.chequeNo || "",
          chequeDate: r.chequeDate || "",
          narration: r.narration || "",
          receiptAmount: Number(r.receiptAmount || 0),
          drawerBank: r.drawerBankName || r.drawerBank || "",
          micr: r.micr || "",
          loadNo: r.loadNo || "",
        },

        items: r.receiptBills || [],

        summary: {
          totalAdjusted: Number(r.receiptAmount || 0),
          balanceAmount: 0,
          totalDiscount: (r.receiptBills || []).reduce(
            (sum, item) => sum + Number(item.discAmt || item.discAmount || 0),
            0
          ),
        },
      }));

      dispatch({
        type: "SET_RECEIPTS",
        payload: receipts,
      });

      console.log("FINAL RECEIPTS =", receipts);
    } catch (err) {
      console.log("LOAD RECEIPTS ERROR =", err);
    }
  };
  /* =========================================================
   LOAD RECEIPT LIST
   BACKEND SEARCH + FILTER + PAGINATION

   This is separate from loadReceipts().
   loadReceipts() continues supporting the existing flow.
   ========================================================= */

  const loadReceiptList = useCallback(
    async ({
      page = receiptListCurrentPage,
      limit = receiptListRowsPerPage,
      search = receiptListSearchDebounced,
      filters = receiptAppliedFilters,
    } = {}) => {
      try {
        const distributorId =
          localStorage.getItem("distributorId");

        const firmId =
          localStorage.getItem("firmId");

        if (!distributorId || !firmId) {
          dispatch({
            type: "SET_RECEIPTS",
            payload: [],
          });

          setReceiptListTotalRecords(0);
          setReceiptListTotalPages(1);
          setReceiptListStartRecord(0);
          setReceiptListEndRecord(0);

          return;
        }

        setReceiptListLoading(true);

        const query =
          new URLSearchParams({
            distributorId,
            firmId,

            page: String(page),
            limit: String(limit),
          });

        const cleanSearch = String(
          search || ""
        ).trim();

        const appliedFilters =
          filters || {};

        if (cleanSearch) {
          query.set(
            "search",
            cleanSearch
          );
        }

        if (appliedFilters.fromDate) {
          query.set(
            "fromDate",
            appliedFilters.fromDate
          );
        }

        if (appliedFilters.toDate) {
          query.set(
            "toDate",
            appliedFilters.toDate
          );
        }

        if (appliedFilters.receiptType) {
          query.set(
            "receiptType",
            appliedFilters.receiptType
          );
        }

        if (appliedFilters.party) {
          query.set(
            "party",
            appliedFilters.party
          );
        }

        const response = await secureFetch(
          `${API_URL}/transaction/receipt/list?${query.toString()}`
        );

        const result =
          await response.json();

        if (
          !response.ok ||
          result.success === false
        ) {
          throw new Error(
            result.message ||
            "Failed to load Receipt list."
          );
        }

        const pagination =
          result.pagination || {};

        const rawReceipts =
          Array.isArray(result.receipts)
            ? result.receipts
            : Array.isArray(result.data)
              ? result.data
              : [];

        /*
         * Keep exactly the same Receipt object structure
         * currently used by your table, edit and view buttons.
         */
        const mappedReceipts =
          rawReceipts.map((receipt) => ({
            id:
              receipt._id ||
              receipt.id,

            _id:
              receipt._id ||
              receipt.id,

            header: {
              receiptDate:
                receipt.receiptDate || "",

              rno:
                receipt.rno || "",

              billSeries:
                receipt.billSeries || "",

              billNo:
                receipt.billNo || "",

              partyId:
                receipt.partyId || "",

              partyName:
                receipt.partyName || "",

              salesmanId:
                receipt.salesmanId || "",

              salesman:
                receipt.salesmanName ||
                receipt.salesman ||
                "",

              salesmanName:
                receipt.salesmanName ||
                receipt.salesman ||
                "",

              bankCash:
                receipt.bankCash || "",

              receiptAmount:
                Number(
                  receipt.receiptAmount || 0
                ),

              chequeNo:
                receipt.chequeNo || "",

              chequeDate:
                receipt.chequeDate || "",

              drawerBankId:
                receipt.drawerBankId || "",

              drawerBank:
                receipt.drawerBankName ||
                receipt.drawerBank ||
                "",

              drawerBankName:
                receipt.drawerBankName ||
                receipt.drawerBank ||
                "",

              micr:
                receipt.micr || "",

              narration:
                receipt.narration || "",

              companyId:
                receipt.companyId || "",

              firmId:
                receipt.firmId || "",

              distributorId:
                receipt.distributorId || "",
            },

            items:
              Array.isArray(
                receipt.receiptBills
              )
                ? receipt.receiptBills
                : [],

            receiptBills:
              Array.isArray(
                receipt.receiptBills
              )
                ? receipt.receiptBills
                : [],

            summary: {
              totalAdjusted:
                Array.isArray(
                  receipt.receiptBills
                )
                  ? receipt.receiptBills.reduce(
                    (total, item) =>
                      total +
                      Number(
                        item.nowAdjust ||
                        0
                      ),
                    0
                  )
                  : Number(
                    receipt.receiptAmount ||
                    0
                  ),

              balanceAmount:
                Array.isArray(
                  receipt.receiptBills
                )
                  ? receipt.receiptBills.reduce(
                    (total, item) =>
                      total +
                      Number(
                        item.balanceAmt ||
                        0
                      ),
                    0
                  )
                  : 0,

              totalDiscount:
                Array.isArray(
                  receipt.receiptBills
                )
                  ? receipt.receiptBills.reduce(
                    (total, item) =>
                      total +
                      Number(
                        item.discAmt ||
                        item.discAmount ||
                        0
                      ),
                    0
                  )
                  : 0,
            },

            originalItem:
              receipt,
          }));

        dispatch({
          type: "SET_RECEIPTS",
          payload: mappedReceipts,
        });

        const returnedPage =
          Number(
            pagination.currentPage ||
            pagination.page ||
            page ||
            1
          );

        setReceiptListCurrentPage(
          returnedPage
        );

        setReceiptListRowsPerPage(
          Number(
            pagination.limit ||
            limit ||
            10
          )
        );

        setReceiptListTotalRecords(
          Number(
            pagination.totalRecords ||
            0
          )
        );

        setReceiptListTotalPages(
          Math.max(
            Number(
              pagination.totalPages ||
              1
            ),
            1
          )
        );

        setReceiptListStartRecord(
          Number(
            pagination.startRecord ||
            0
          )
        );

        setReceiptListEndRecord(
          Number(
            pagination.endRecord ||
            0
          )
        );
      } catch (error) {
        console.error(
          "Receipt list load error:",
          error
        );

        dispatch({
          type: "SET_RECEIPTS",
          payload: [],
        });

        setReceiptListTotalRecords(0);
        setReceiptListTotalPages(1);
        setReceiptListStartRecord(0);
        setReceiptListEndRecord(0);

        alert(
          error.message ||
          "Unable to load Receipt list."
        );
      } finally {
        setReceiptListLoading(false);
      }
    },
    [
      dispatch,
      receiptListCurrentPage,
      receiptListRowsPerPage,
      receiptListSearchDebounced,
      receiptAppliedFilters,
    ]
  );
  /* =========================================================
     RECEIPT LIST SEARCH DEBOUNCE
     ========================================================= */

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setReceiptListSearchDebounced(
          String(
            receiptListSearch || ""
          ).trim()
        );

        setReceiptListCurrentPage(1);
      }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [receiptListSearch]);

  /* =========================================================
     LOAD RECEIPT LIST WHEN PAGE, LIMIT,
     SEARCH OR APPLIED FILTER CHANGES
     ========================================================= */

  useEffect(() => {
    const receiptListIsOpen =
      activeTransaction === "Receipt" &&
      !transactionFormMode?.Receipt;

    if (!receiptListIsOpen) {
      return;
    }

    loadReceiptList({
      page:
        receiptListCurrentPage,

      limit:
        receiptListRowsPerPage,

      search:
        receiptListSearchDebounced,

      filters:
        receiptAppliedFilters,
    });
  }, [
    activeTransaction,
    transactionFormMode?.Receipt,
    receiptListCurrentPage,
    receiptListRowsPerPage,
    receiptListSearchDebounced,
    receiptAppliedFilters,
    loadReceiptList,
  ]);

  /* =========================================================
   RECEIPT LIST FILTER AND PAGINATION
   ========================================================= */


  /* =========================================================
     RECEIPT LIST ROWS
  
     Search, filter and pagination are now
     performed by the backend.
     ========================================================= */

  const receiptListRows =
    Array.isArray(state.receipts)
      ? state.receipts
      : [];

  const filteredReceiptList =
    receiptListRows;

  const paginatedReceiptList =
    receiptListRows;

  const receiptActiveFilterCount = [
    receiptAppliedFilters.fromDate,
    receiptAppliedFilters.toDate,
    receiptAppliedFilters.receiptType,
    receiptAppliedFilters.party,
  ].filter((value) =>
    String(value || "").trim()
  ).length;

  const receiptListSafePage =
    receiptListCurrentPage;

  const receiptListShowingFrom =
    receiptListStartRecord;

  const receiptListShowingTo =
    receiptListEndRecord;

  const getReceiptPaginationPages = () => {
    const pages = [];

    const startPage = Math.max(
      1,
      receiptListCurrentPage - 2
    );

    const endPage = Math.min(
      receiptListTotalPages,
      receiptListCurrentPage + 2
    );

    for (
      let pageNumber = startPage;
      pageNumber <= endPage;
      pageNumber += 1
    ) {
      pages.push(pageNumber);
    }

    return pages;
  };

  const loadChequeBounces = async () => {
    try {
      const res = await secureFetch(
        `${API_URL}/transaction/cheque-bounce`
      );

      const result =
        await res.json();

      if (!result.success) return;

      dispatch({
        type: "SET_CHEQUE_BOUNCES",
        payload: result.data
      });

    } catch (err) {
      console.log(err);
    }
  };
  /* =========================================================
   LOAD CHEQUE BOUNCE PAGINATED LIST
   ========================================================= */

  const loadChequeBounceList = useCallback(
    async ({
      page =
      chequeBounceListCurrentPage,

      limit =
      chequeBounceListRowsPerPage,

      search =
      chequeBounceListSearchDebounced,

      filters =
      chequeBounceAppliedFilters,
    } = {}) => {
      try {
        const distributorId =
          localStorage.getItem(
            "distributorId"
          );

        const firmId =
          localStorage.getItem(
            "firmId"
          );

        if (
          !distributorId ||
          !firmId
        ) {
          dispatch({
            type:
              "SET_CHEQUE_BOUNCES",
            payload: [],
          });

          setChequeBounceListTotalRecords(
            0
          );

          setChequeBounceListTotalPages(
            1
          );

          setChequeBounceListStartRecord(
            0
          );

          setChequeBounceListEndRecord(
            0
          );

          return;
        }

        setChequeBounceListLoading(
          true
        );

        const query =
          new URLSearchParams({
            distributorId,
            firmId,

            page:
              String(page),

            limit:
              String(limit),
          });

        const cleanSearch =
          String(
            search || ""
          ).trim();

        const appliedFilters =
          filters || {};

        if (cleanSearch) {
          query.set(
            "search",
            cleanSearch
          );
        }

        if (
          appliedFilters.fromDate
        ) {
          query.set(
            "fromDate",
            appliedFilters.fromDate
          );
        }

        if (
          appliedFilters.toDate
        ) {
          query.set(
            "toDate",
            appliedFilters.toDate
          );
        }

        if (
          appliedFilters.party
        ) {
          query.set(
            "party",
            appliedFilters.party
          );
        }

        if (
          appliedFilters.bank
        ) {
          query.set(
            "bank",
            appliedFilters.bank
          );
        }

        if (
          appliedFilters.chequeNo
        ) {
          query.set(
            "chequeNo",
            appliedFilters.chequeNo
          );
        }

        const response =
          await secureFetch(
            `${API_URL}/transaction/cheque-bounce/list?${query.toString()}`
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          result.success === false
        ) {
          throw new Error(
            result.message ||
            "Failed to load Cheque Bounce list."
          );
        }

        const pagination =
          result.pagination || {};

        const rawRecords =
          Array.isArray(
            result.records
          )
            ? result.records
            : Array.isArray(
              result.data
            )
              ? result.data
              : [];

        const mappedRecords =
          rawRecords.map(
            (record) => ({
              ...record,

              id:
                record._id ||
                record.id,

              _id:
                record._id ||
                record.id,

              accountNameDr:
                record.partyName ||
                "",

              accountNameCr:
                record.bankName ||
                "",

              trndate:
                record.chqBounceDate ||
                "",

              trnno:
                record.chqBounceNo ||
                "",

              recNo:
                record.receiptNo ||
                "",

              originalItem:
                record,
            })
          );

        dispatch({
          type:
            "SET_CHEQUE_BOUNCES",
          payload:
            mappedRecords,
        });

        setChequeBounceListCurrentPage(
          Number(
            pagination.currentPage ||
            pagination.page ||
            page ||
            1
          )
        );

        setChequeBounceListRowsPerPage(
          Number(
            pagination.limit ||
            limit ||
            10
          )
        );

        setChequeBounceListTotalRecords(
          Number(
            pagination.totalRecords ||
            0
          )
        );

        setChequeBounceListTotalPages(
          Math.max(
            Number(
              pagination.totalPages ||
              1
            ),
            1
          )
        );

        setChequeBounceListStartRecord(
          Number(
            pagination.startRecord ||
            0
          )
        );

        setChequeBounceListEndRecord(
          Number(
            pagination.endRecord ||
            0
          )
        );
      } catch (error) {
        console.error(
          "Cheque Bounce list load error:",
          error
        );

        dispatch({
          type:
            "SET_CHEQUE_BOUNCES",
          payload: [],
        });

        setChequeBounceListTotalRecords(
          0
        );

        setChequeBounceListTotalPages(
          1
        );

        setChequeBounceListStartRecord(
          0
        );

        setChequeBounceListEndRecord(
          0
        );

        alert(
          error.message ||
          "Unable to load Cheque Bounce list."
        );
      } finally {
        setChequeBounceListLoading(
          false
        );
      }
    },
    [
      dispatch,
      chequeBounceListCurrentPage,
      chequeBounceListRowsPerPage,
      chequeBounceListSearchDebounced,
      chequeBounceAppliedFilters,
    ]
  );
  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setChequeBounceListSearchDebounced(
          String(
            chequeBounceListSearch ||
            ""
          ).trim()
        );

        setChequeBounceListCurrentPage(
          1
        );
      }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [chequeBounceListSearch]);
  useEffect(() => {
    const chequeBounceListIsOpen =
      activeTransaction ===
      "Cheque Bounce" &&
      !transactionFormMode?.[
      "Cheque Bounce"
      ];

    if (!chequeBounceListIsOpen) {
      return;
    }

    loadChequeBounceList({
      page:
        chequeBounceListCurrentPage,

      limit:
        chequeBounceListRowsPerPage,

      search:
        chequeBounceListSearchDebounced,

      filters:
        chequeBounceAppliedFilters,
    });
  }, [
    activeTransaction,
    transactionFormMode?.[
    "Cheque Bounce"
    ],
    chequeBounceListCurrentPage,
    chequeBounceListRowsPerPage,
    chequeBounceListSearchDebounced,
    chequeBounceAppliedFilters,
    loadChequeBounceList,
  ]);
  const renderReceiptList = () => (
    <div className="receipt-premium-list-page">
      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="receipt-premium-heading">
        <div className="receipt-premium-title">
          <h2>Receipt List</h2>

          <p>
            Manage all customer receipt transactions
          </p>
        </div>

        <div className="receipt-premium-heading-actions">
          {receiptPermission.add && (
          <button
            type="button"
            className="receipt-premium-button receipt-premium-add-button"
            onClick={() => {
              resetReceiptForm();
              openTransactionEntry("Receipt");
            }}
          >
            <Plus size={14} />
            New Receipt
          </button>
          )}
          <button
            type="button"
            className="receipt-premium-button receipt-premium-excel-button"
          >
            <FileSpreadsheet size={14} />
            Export Excel
          </button>

          <button
            type="button"
            className="receipt-premium-button receipt-premium-pdf-button"
          >
            <FileText size={14} />
            Export PDF
          </button>

          <button
            type="button"
            className="receipt-premium-button receipt-premium-print-button"
            onClick={() => window.print()}
          >
            <Printer size={14} />
            Print List
          </button>
        </div>
      </div>

      {/* =====================================================
          SUMMARY CARDS
          ===================================================== */}

      <div className="receipt-premium-summary-grid">
        {/* TODAY'S RECEIPTS */}

        <div className="receipt-premium-summary-card">
          <div className="receipt-premium-summary-icon blue">
            <CalendarDays size={18} />
          </div>

          <div className="receipt-premium-summary-content">
            <span>Today's Receipts</span>

            <strong>
              {
                receiptListRows.filter((receipt) => {
                  const receiptDate =
                    receipt?.header?.receiptDate || "";

                  const today =
                    new Date()
                      .toISOString()
                      .split("T")[0];

                  return receiptDate === today;
                }).length
              }
            </strong>

            <small>
              {new Date().toLocaleDateString("en-GB")}
            </small>
          </div>

          <div className="receipt-card-decoration" />
        </div>

        {/* TOTAL RECEIPTS */}

        <div className="receipt-premium-summary-card">
          <div className="receipt-premium-summary-icon blue">
            <ReceiptText size={18} />
          </div>

          <div className="receipt-premium-summary-content">
            <span>Total Receipts</span>

            <strong>{receiptListRows.length}</strong>

            <small>All Time</small>
          </div>

          <div className="receipt-card-decoration" />
        </div>

        {/* CHEQUE RECEIPTS */}

        <div className="receipt-premium-summary-card">
          <div className="receipt-premium-summary-icon orange">
            <Clock3 size={18} />
          </div>

          <div className="receipt-premium-summary-content">
            <span>Cheque Receipts</span>

            <strong>
              {
                receiptListRows.filter((receipt) => {
                  const header =
                    receipt?.header || {};

                  const chequeNo = String(
                    header.chequeNo ||
                    header.chqNo ||
                    ""
                  ).trim();

                  const bankCash = String(
                    header.bankCash || ""
                  ).toLowerCase();

                  return (
                    (chequeNo &&
                      chequeNo !== "-" &&
                      chequeNo !== "0") ||
                    bankCash.includes("bank")
                  );
                }).length
              }
            </strong>

            <small>Cheque entries</small>
          </div>

          <div className="receipt-card-decoration" />
        </div>

        {/* CASH RECEIPTS */}

        <div className="receipt-premium-summary-card">
          <div className="receipt-premium-summary-icon red">
            <CircleX size={18} />
          </div>

          <div className="receipt-premium-summary-content">
            <span>Cash Receipts</span>

            <strong>
              {
                receiptListRows.filter((receipt) => {
                  const header =
                    receipt?.header || {};

                  const chequeNo = String(
                    header.chequeNo ||
                    header.chqNo ||
                    ""
                  ).trim();

                  const bankCash = String(
                    header.bankCash || ""
                  ).toLowerCase();

                  const isCheque =
                    (chequeNo &&
                      chequeNo !== "-" &&
                      chequeNo !== "0") ||
                    bankCash.includes("bank");

                  return !isCheque;
                }).length
              }
            </strong>

            <small>Cash transactions</small>
          </div>

          <div className="receipt-card-decoration" />
        </div>

        {/* RECEIPT VALUE */}

        <div className="receipt-premium-summary-card">
          <div className="receipt-premium-summary-icon violet">
            <Wallet size={18} />
          </div>

          <div className="receipt-premium-summary-content">
            <span>Receipt Value</span>

            <strong>
              ₹{" "}
              {filteredReceiptList
                .reduce((total, receipt) => {
                  const header =
                    receipt?.header || {};

                  const summary =
                    receipt?.summary || {};

                  return (
                    total +
                    Number(
                      summary.totalAdjusted ||
                      header.receiptAmount ||
                      0
                    )
                  );
                }, 0)
                .toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
            </strong>

            <small>Filtered Result</small>
          </div>

          <div className="receipt-card-decoration" />
        </div>
      </div>
      {/* =====================================================
          SEARCH TOOLBAR
          ===================================================== */}

      <div className="receipt-premium-toolbar">
        <div className="receipt-premium-search-box">
          <Search size={15} />

          <input
            type="text"
            value={receiptListSearch}
            placeholder="Search receipts, parties, cheque no..."
            onChange={(event) =>
              setReceiptListSearch(
                event.target.value
              )
            }
          />

          {receiptListSearch && (
            <button
              type="button"
              className="receipt-premium-clear-search"
              onClick={() =>
                setReceiptListSearch("")
              }
            >
              ×
            </button>
          )}
        </div>

        <button
          type="button"
          className={`receipt-premium-filter-button ${receiptActiveFilterCount > 0
            ? "has-active-filters"
            : ""
            }`}
          onClick={() =>
            setReceiptFiltersVisible(
              (previous) => !previous
            )
          }
        >
          <SlidersHorizontal size={15} />

          Apply Filter

          {receiptActiveFilterCount > 0 && (
            <span className="receipt-filter-count">
              {receiptActiveFilterCount}
            </span>
          )}

          <ChevronDown
            size={14}
            className={
              receiptFiltersVisible
                ? "receipt-filter-chevron open"
                : "receipt-filter-chevron"
            }
          />
        </button>
      </div>{receiptFiltersVisible && (
        <div className="receipt-premium-filter-panel">
          <div className="receipt-filter-field">
            <label>From Date</label>

            <input
              type="date"
              value={
                receiptDraftFilters.fromDate
              }
              onChange={(event) =>
                handleReceiptDraftFilterChange(
                  "fromDate",
                  event.target.value
                )
              }
            />
          </div>

          <div className="receipt-filter-field">
            <label>To Date</label>

            <input
              type="date"
              value={
                receiptDraftFilters.toDate
              }
              onChange={(event) =>
                handleReceiptDraftFilterChange(
                  "toDate",
                  event.target.value
                )
              }
            />
          </div>

          <div className="receipt-filter-field">
            <label>Receipt Type</label>

            <select
              value={
                receiptDraftFilters.receiptType
              }
              onChange={(event) =>
                handleReceiptDraftFilterChange(
                  "receiptType",
                  event.target.value
                )
              }
            >
              <option value="">All Types</option>
              <option value="cash">
                Cash Receipt
              </option>
              <option value="cheque">
                Bank / Cheque Receipt
              </option>
            </select>
          </div>

          <div className="receipt-filter-field">
            <label>Party Name</label>

            <input
              type="text"
              value={receiptDraftFilters.party}
              placeholder="Enter party name"
              onChange={(event) =>
                handleReceiptDraftFilterChange(
                  "party",
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyReceiptListFilters();
                }
              }}
            />
          </div>

          <div className="receipt-filter-actions">
            <button
              type="button"
              className="receipt-filter-clear-button"
              onClick={clearReceiptListFilters}
            >
              Clear
            </button>

            <button
              type="button"
              className="receipt-filter-apply-button"
              onClick={applyReceiptListFilters}
            >
              <SlidersHorizontal size={14} />
              Apply Filter
            </button>
          </div>
        </div>
      )}
      {/* =====================================================
          TABLE CARD
          ===================================================== */}

      <div className="receipt-premium-table-card">
        <div className="receipt-premium-table-scroll">
          <table className="receipt-premium-table">
            <thead>
              <tr>
                <th className="receipt-premium-sr-column">
                  SrNo
                </th>

                <th>Date</th>
                <th>Series</th>
                <th>Voucher No</th>
                <th>Credit Account</th>
                <th className="receipt-premium-amount-column">
                  Amount
                </th>
                <th>Debit Account</th>
                <th>Chq No</th>
                <th>Chq Date</th>
                <th>Salesman</th>
                <th>Narration</th>
                <th>Bank Code</th>
                <th>Load No</th>
                <th>Add User</th>
                <th>Edit User</th>
                <th>Edit Date.Time</th>
                <th>Docket No</th>

                <th className="receipt-premium-actions-column">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {receiptListLoading ? (
                <tr>
                  <td
                    colSpan={18}
                    className="receipt-premium-empty-row"
                  >
                    Loading Receipt records...
                  </td>
                </tr>
              ) : paginatedReceiptList.length === 0 ? (
                <tr>
                  <td
                    colSpan={18}
                    className="receipt-premium-empty-row"
                  >
                    No Receipt records found
                  </td>
                </tr>
              ) : (
                paginatedReceiptList.map((receipt, index) => {
                  const header = receipt?.header || {};

                  const serialNumber =
                    receiptListStartRecord > 0
                      ? receiptListStartRecord + index
                      : index + 1;

                  const receiptSeries =
                    header.billSeries || "REC";

                  const voucherNo =
                    header.rno || "-";

                  const creditAccount =
                    header.partyName || "-";

                  const debitAccount =
                    header.bankCash || "-";

                  const receiptAmount =
                    Number(header.receiptAmount || 0);

                  return (
                    <tr
                      key={
                        receipt.id ||
                        receipt._id ||
                        index
                      }
                    >
                      {/* SrNo */}
                      <td>
                        {serialNumber}
                      </td>

                      {/* Date */}
                      <td>
                        {header.receiptDate || "-"}
                      </td>

                      {/* Series */}
                      <td>
                        {receiptSeries}
                      </td>

                      {/* Voucher No */}
                      <td>
                        {voucherNo}
                      </td>

                      {/* Credit Account */}
                      <td>
                        {creditAccount}
                      </td>

                      {/* Amount */}
                      <td className="amount-cell">
                        ₹
                        {receiptAmount.toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </td>

                      {/* Debit Account */}
                      <td>
                        {debitAccount}
                      </td>

                      {/* Cheque No */}
                      <td>
                        {header.chequeNo || "-"}
                      </td>

                      {/* Cheque Date */}
                      <td>
                        {header.chequeDate || "-"}
                      </td>

                      {/* Salesman */}
                      <td>
                        {header.salesmanName ||
                          header.salesman ||
                          "-"}
                      </td>

                      {/* Narration */}
                      <td>
                        {header.narration || "-"}
                      </td>

                      {/* Bank Code / Drawer Bank */}
                      <td>
                        {header.drawerBankName ||
                          header.drawerBank ||
                          header.drawerBankId ||
                          "-"}
                      </td>

                      {/* Load No */}
                      <td>
                        {header.loadNo || "-"}
                      </td>

                      {/* Add User */}
                      <td>
                        {header.addUser || "-"}
                      </td>

                      {/* Edit User */}
                      <td>
                        {header.editUser || "-"}
                      </td>

                      {/* Edit Date.Time */}
                      <td>
                        {header.updatedAt
                          ? new Date(
                            header.updatedAt
                          ).toLocaleString("en-IN")
                          : "-"}
                      </td>

                      {/* Docket No */}
                      <td>
                        {header.docketNo ||
                          header.rloadNo ||
                          "-"}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="receipt-premium-actions">
                          <button
                            type="button"
                            className="receipt-premium-action-button view"
                            title="View Receipt"
                            onClick={() =>
                              editReceipt(receipt)
                            }
                          >
                            <Eye size={14} />
                          </button>
{receiptPermission.edit && (
                          <button
                            type="button"
                            className="receipt-premium-action-button edit"
                            title="Edit Receipt"
                            onClick={() =>
                              editReceipt(receipt)
                            }
                          >
                            <Pencil size={14} />
                          </button>
)}
{receiptPermission.delete && (
                          <button
                            type="button"
                            className="receipt-premium-action-button delete"
                            title="Delete Receipt"
                            disabled={receiptListLoading}
                            onClick={() =>
                              deleteReceipt(
                                receipt.id ||
                                receipt._id
                              )
                            }
                          >
                            <Trash2 size={14} />
                          </button>
)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ===================================================
            PAGINATION FOOTER
            =================================================== */}

        <div className="receipt-premium-pagination-footer">
          <div className="receipt-premium-pagination-info">
            Showing{" "}
            <strong>
              {receiptListStartRecord}
            </strong>{" "}
            to{" "}
            <strong>
              {receiptListEndRecord}
            </strong>{" "}
            of{" "}
            <strong>
              {receiptListTotalRecords}
            </strong>{" "}
            entries
          </div>

          <div className="receipt-premium-pagination-controls">
            <select
              value={
                receiptListRowsPerPage
              }
              disabled={
                receiptListLoading
              }
              onChange={(event) => {
                const nextLimit =
                  Number(
                    event.target.value
                  );

                setReceiptListRowsPerPage(
                  nextLimit
                );

                setReceiptListCurrentPage(
                  1
                );
              }}
            >
              <option value={10}>
                10
              </option>

              <option value={15}>
                15
              </option>

              <option value={20}>
                20
              </option>

              <option value={50}>
                50
              </option>
            </select>

            <button
              type="button"
              disabled={
                receiptListLoading ||
                receiptListCurrentPage <= 1
              }
              onClick={() =>
                setReceiptListCurrentPage(
                  (previousPage) =>
                    Math.max(
                      previousPage - 1,
                      1
                    )
                )
              }
            >
              <ChevronLeft size={15} />
            </button>

            {getReceiptPaginationPages().map(
              (pageNumber) => (
                <button
                  type="button"
                  key={pageNumber}
                  disabled={
                    receiptListLoading
                  }
                  className={
                    pageNumber ===
                      receiptListCurrentPage
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setReceiptListCurrentPage(
                      pageNumber
                    )
                  }
                >
                  {pageNumber}
                </button>
              )
            )}

            <button
              type="button"
              disabled={
                receiptListLoading ||
                receiptListCurrentPage >=
                receiptListTotalPages
              }
              onClick={() =>
                setReceiptListCurrentPage(
                  (previousPage) =>
                    Math.min(
                      previousPage + 1,
                      receiptListTotalPages
                    )
                )
              }
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const getCustomerBankName = (bank) =>
    bank.bankName || bank.BankName || bank.name || bank.accountName || "";

  const getCustomerBankParty = (bank) =>
    bank.partyName || bank.customerName || bank.accountName || bank.party || "";

  const filteredCustomerBanks = customerBanks.filter((bank) => {
    const bankParty = String(getCustomerBankParty(bank)).trim().toLowerCase();
    const selectedParty = String(receiptFormData.partyName).trim().toLowerCase();

    return !selectedParty || !bankParty || bankParty === selectedParty;
  });

  const selectedPartyName = clean(receiptFormData.partyName);

  const selectedPartyPendingBills = pendingBills.filter(
    (b) => clean(b.party) === selectedPartyName
  );

  const selectedPartyReceipts = (state.receipts || []).filter(
    (r) => clean(r.header?.partyName) === selectedPartyName
  );

  const lastSelectedPartyReceipt =
    selectedPartyReceipts[selectedPartyReceipts.length - 1];


  const lastReceipt =
    selectedPartyReceipts[
    selectedPartyReceipts.length - 1
    ];

  const receiptBottomSummary = {

    totalPendingAmount:
      selectedPartyPendingBills.reduce(
        (sum, b) =>
          sum +
          Number(
            b.balance || 0
          ),
        0
      ),

    totalCollectedAmount:
      selectedPartyReceipts.reduce(
        (sum, r) =>
          sum +
          Number(
            r.summary?.totalAdjusted ||
            0
          ),
        0
      ),

    totalPendingBills:
      selectedPartyPendingBills.length,

    lastCollectionAmount:
      Number(
        lastReceipt?.summary
          ?.totalAdjusted
        ||
        0
      ),

    lastCollectionDate:
      lastReceipt
        ?.header
        ?.receiptDate
      ||
      "-",

    lastPaymentAgainstBillNo:
      lastReceipt
        ?.items?.[0]
        ?.trnNo
      ||
      "-"
  };
  // =========================================================
  // RECEIPT BANK/CASH OPTIONS
  // ONLY ACCOUNT GROUP = BANK ACCOUNTS
  // =========================================================

  const normalizeBankValue = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const getBankAccountName = (account) =>
    account.accountName ||
    account.AccountName ||
    account.acName ||
    account.AcName ||
    account.bankName ||
    account.BankName ||
    account.name ||
    "";

  const getAccountGroupName = (account) =>
    account.accountGroup ||
    account.accountGroupName ||
    account.AccountGroup ||
    account.AccountGroupName ||
    account.groupName ||
    account.GroupName ||
    account.group ||
    account.acGroup ||
    account.AcGroup ||
    "";

  /*
   * Only records whose account group is BANK ACCOUNTS
   * will pass this filter.
   */
  const isBankAccountGroup = (account) => {
    const groupName = normalizeBankValue(
      getAccountGroupName(account)
    );

    return (
      groupName === "bank accounts" ||
      groupName === "bank account"
    );
  };

  const bankCashAccounts = [
    ...(otherAccounts || []),
    ...(accounts || [])
  ]
    .filter(isBankAccountGroup)
    .filter((account) =>
      Boolean(
        String(getBankAccountName(account)).trim()
      )
    )
    .filter((account, index, allAccounts) => {
      const currentCode = normalizeBankValue(
        account.accountCode ||
        account.AccountCode ||
        account.acCode ||
        account.AcCode ||
        ""
      );

      const currentName = normalizeBankValue(
        getBankAccountName(account)
      );

      return (
        index ===
        allAccounts.findIndex((item) => {
          const itemCode = normalizeBankValue(
            item.accountCode ||
            item.AccountCode ||
            item.acCode ||
            item.AcCode ||
            ""
          );

          const itemName = normalizeBankValue(
            getBankAccountName(item)
          );

          if (currentCode && itemCode) {
            return currentCode === itemCode;
          }

          return currentName === itemName;
        })
      );
    })
    .sort((first, second) =>
      getBankAccountName(first).localeCompare(
        getBankAccountName(second)
      )
    );

  const getPdcDateValue = (value) => {
    if (!value) {
      return "";
    }

    const rawValue =
      String(value).trim();

    if (!rawValue) {
      return "";
    }

    // Handles YYYY-MM-DD and ISO dates
    const isoMatch =
      rawValue.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    // Handles DD/MM/YYYY
    const slashMatch =
      rawValue.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
      );

    if (slashMatch) {
      const day =
        String(slashMatch[1])
          .padStart(2, "0");

      const month =
        String(slashMatch[2])
          .padStart(2, "0");

      const year =
        slashMatch[3];

      return `${year}-${month}-${day}`;
    }

    // Handles DD-MM-YYYY
    const dashMatch =
      rawValue.match(
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/
      );

    if (dashMatch) {
      const day =
        String(dashMatch[1])
          .padStart(2, "0");

      const month =
        String(dashMatch[2])
          .padStart(2, "0");

      const year =
        dashMatch[3];

      return `${year}-${month}-${day}`;
    }

    return "";
  };


  const getPDCDocketReceipts = (
    formData = pdcDocketFormData
  ) => {
    const fromDate =
      getPdcDateValue(
        formData.fromDate
      );

    const toDate =
      getPdcDateValue(
        formData.toDate
      );

    const selectedHouseBank =
      clean(
        formData.houseBank ||
        formData.houseBankName ||
        formData.bankName
      );

    const clearingType =
      clean(
        formData.clearingType
      )
        .replace(/\s+/g, " ");

    /*
     * Do not load the grid until required
     * criteria have been entered.
     */
    if (
      !selectedHouseBank ||
      !fromDate ||
      !toDate
    ) {
      return [];
    }

    const receipts =
      Array.isArray(state.receipts)
        ? state.receipts
        : [];

    return receipts
      .filter((receipt) => {
        const header =
          receipt?.header ||
          receipt ||
          {};

        const chequeNo =
          String(
            header.chequeNo || ""
          ).trim();

        if (!chequeNo) {
          return false;
        }

        const chequeDate =
          getPdcDateValue(
            header.chequeDate
          );

        if (!chequeDate) {
          return false;
        }

        if (
          chequeDate < fromDate ||
          chequeDate > toDate
        ) {
          return false;
        }

        /*
         * The Receipt Bank/Cash field is the
         * distributor's receiving bank.
         */
        const receiptBank =
          clean(
            header.bankCash ||
            ""
          );

        /*
         * Drawer Bank is the customer's cheque bank.
         */
        const drawerBank =
          clean(
            header.drawerBankName ||
            header.drawerBank ||
            ""
          );

        if (
          !receiptBank ||
          receiptBank === "cash"
        ) {
          return false;
        }

        if (
          clearingType === "same bank"
        ) {
          return (
            receiptBank ===
            selectedHouseBank &&
            drawerBank ===
            selectedHouseBank
          );
        }

        if (
          clearingType === "local bank"
        ) {
          return (
            receiptBank ===
            selectedHouseBank &&
            drawerBank !==
            selectedHouseBank
          );
        }

        if (
          clearingType ===
          "outside bank"
        ) {
          return (
            receiptBank ===
            selectedHouseBank
          );
        }

        return (
          receiptBank ===
          selectedHouseBank
        );
      })
      .map((receipt, index) => {
        const header =
          receipt?.header ||
          receipt ||
          {};

        const drawerBankName =
          header.drawerBankName ||
          header.drawerBank ||
          "";

        return {
          id:
            receipt._id ||
            receipt.id ||
            `${header.rno || "REC"}-${index}`,

          selected: true,

          srNo:
            index + 1,

          chequeNo:
            header.chequeNo || "",

          chequeDate:
            header.chequeDate || "",

          amount:
            Number(
              header.receiptAmount ||
              receipt.summary?.totalAdjusted ||
              0
            ),

          clearingDate:
            formData.clearingDate ||
            "",

          receiptSeries:
            header.billSeries ||
            "REC",

          receiptNo:
            header.rno || "",

          receiptTrnBank:
            drawerBankName,

          branch:
            header.drawerBankBranch ||
            header.branch ||
            "",

          partyCode:
            header.partyId ||
            header.partyCode ||
            "",

          partyName:
            header.partyName ||
            ""
        };
      });
  };

  const loadPDCDocketGrid = (
    formData = pdcDocketFormData
  ) => {
    try {
      const rows =
        getPDCDocketReceipts(
          formData
        );

      /*
       * Load every eligible cheque, but keep it
       * unselected until the user checks it.
       */
      const numberedRows =
        rows.map(
          (row, index) => ({
            ...row,

            srNo:
              index + 1,

            selected:
              false
          })
        );

      setPDCDocketItems(
        numberedRows
      );

      /*
       * No cheque is selected initially.
       */
      setPDCDocketFormData(
        (previous) => ({
          ...previous,
          ...formData,

          totalAmount:
            "0.00",

          totalCheques:
            "0"
        })
      );
    } catch (error) {
      console.error(
        "LOAD PDC DOCKET GRID ERROR =",
        error
      );

      setPDCDocketItems([]);

      setPDCDocketFormData(
        (previous) => ({
          ...previous,
          ...formData,

          totalAmount:
            "0.00",

          totalCheques:
            "0"
        })
      );
    }
  };
  /* =========================================================
     PDC DOCKET CHEQUE SELECTION
     ========================================================= */

  const recalculatePDCDocketSelection = (
    rows
  ) => {
    const safeRows =
      Array.isArray(rows)
        ? rows
        : [];

    const selectedRows =
      safeRows.filter(
        (row) => row.selected === true
      );

    const totalAmount =
      selectedRows.reduce(
        (total, row) =>
          total +
          (Number(row.amount) || 0),
        0
      );

    setPDCDocketFormData(
      (previous) => ({
        ...previous,

        totalCheques:
          String(selectedRows.length),

        totalAmount:
          totalAmount.toFixed(2)
      })
    );
  };

  const handlePDCDocketChequeSelect = (
    rowIndex
  ) => {
    setPDCDocketItems(
      (previousRows) => {
        const updatedRows =
          previousRows.map(
            (row, index) =>
              index === rowIndex
                ? {
                  ...row,
                  selected:
                    !row.selected
                }
                : row
          );

        recalculatePDCDocketSelection(
          updatedRows
        );

        return updatedRows;
      }
    );
  };

  const handlePDCDocketSelectAll = () => {
    setPDCDocketItems(
      (previousRows) => {
        const allCurrentlySelected =
          previousRows.length > 0 &&
          previousRows.every(
            (row) =>
              row.selected === true
          );

        const updatedRows =
          previousRows.map(
            (row) => ({
              ...row,

              selected:
                !allCurrentlySelected
            })
          );

        recalculatePDCDocketSelection(
          updatedRows
        );

        return updatedRows;
      }
    );
  };
  // Receipt Form
  // ======================================================
  // RECEIPT FORM - BILLING STYLE UI
  // ======================================================
  const renderReceiptForm = () => (
    <div className="receipt-billing-page">
      {/* ================= HEADER ================= */}
      <div className="receipt-billing-topbar">
        <div className="receipt-billing-title-wrap">
          <h2>Receipt Entry</h2>

          <span className="receipt-billing-badge">
            {editReceiptId ? "Edit Receipt" : "New Receipt"}
          </span>
        </div>

        <div className="receipt-billing-header-actions">
          <button
            type="button"
            className="receipt-preview-btn"
            onClick={() => {
              alert("Receipt preview will be added here.");
            }}
          >
            👁 Preview
          </button>

          <button
            type="button"
            className="receipt-save-draft-btn"
            onClick={saveReceipt}
          >
            💾 Save
          </button>

          <button
            type="button"
            className="receipt-save-main-btn"
            onClick={saveReceipt}
          >
            💾 {editReceiptId ? "Update Receipt" : "Save Receipt"}
          </button>

          <button
            type="button"
            className="receipt-more-btn"
            title="More options"
          >
            ⋮
          </button>

          <button
            type="button"
            className="receipt-close-btn"
            onClick={() => openTransactionList("Receipt")}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* ================= RECEIPT HEADER ================= */}
      <section className="receipt-billing-section receipt-header-section">
        <div className="receipt-section-heading">
          <span className="receipt-section-dot" />
          <h3>Receipt Information</h3>

          <div className="receipt-header-status">
            <span>
              Receipt No:
              <strong>{receiptFormData.rno || "-"}</strong>
            </span>

            <span>
              Mode:
              <strong>{receiptFormData.bankCash || "-"}</strong>
            </span>
          </div>
        </div>

        <div className="receipt-header-grid receipt-header-two-rows">
          {/* ================= FIRST ROW ================= */}

          <div className="receipt-field">
            <label>
              Receipt Date <span>*</span>
            </label>

            <input
              type="date"
              name="receiptDate"
              value={receiptFormData.receiptDate || ""}
              onChange={handleReceiptInput}
            />
          </div>

          <div className="receipt-field">
            <label>
              RNo <span>*</span>
            </label>

            <input
              type="text"
              inputMode="numeric"
              name="rno"
              value={
                receiptFormData.rno || ""
              }
              readOnly={
                autoVoucherNo === true ||
                Boolean(editReceiptId)
              }
              placeholder={
                autoVoucherNo === true
                  ? "Auto generated"
                  : "Enter receipt number"
              }
              onChange={(event) => {
                if (
                  autoVoucherNo === true ||
                  editReceiptId
                ) {
                  return;
                }

                setReceiptFormData(
                  (previous) => ({
                    ...previous,
                    rno: cleanVoucherNumber(
                      event.target.value
                    ),
                  })
                );
              }}
            />
          </div>

          <div className="receipt-field">
            <label>Bill Series</label>

            <input
              type="text"
              name="billSeries"
              value={receiptFormData.billSeries || ""}
              onChange={handleReceiptInput}
              onKeyDown={handleReceiptBillKeyDown}
              placeholder="Enter series"
            />
          </div>

          <div className="receipt-field">
            <label>Bill No</label>

            <input
              type="text"
              name="billNo"
              value={receiptFormData.billNo || ""}
              onChange={handleReceiptInput}
              onKeyDown={handleReceiptBillKeyDown}
              placeholder="Enter bill no"
            />
          </div>

          <div className="receipt-field receipt-party-field party-search-box">
            <label>
              Party Name <span>*</span>
            </label>

            <input
              type="text"
              name="partyName"
              value={receiptFormData.partyName || ""}
              onChange={handlePartyTyping}
              onKeyDown={handlePartyKeyDown}
              onFocus={(event) => {
                const value = event.target.value;

                if (String(value || "").trim()) {
                  handlePartyTyping({
                    target: {
                      name: "partyName",
                      value
                    }
                  });
                }
              }}
              onBlur={() => {
                setTimeout(() => {
                  setPartySuggestions([]);
                  setPartyNotFound(false);
                  setPartySearchActive(false);
                  setActivePartySuggestionIndex(-1);
                }, 180);
              }}
              placeholder="Search party"
              autoComplete="off"
            />

            {partySearchActive && partySuggestions.length > 0 && (
              <div className="receipt-party-dropdown">
                {partySuggestions.map((partyName, index) => (
                  <button
                    type="button"
                    key={`${partyName}-${index}`}
                    className={`receipt-party-option ${index === activePartySuggestionIndex
                      ? "active"
                      : ""
                      }`}
                    onMouseEnter={() =>
                      setActivePartySuggestionIndex(index)
                    }
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      selectParty(partyName);
                    }}
                  >
                    <strong>{partyName}</strong>

                    <span>
                      {
                        pendingBills.filter(
                          (bill) =>
                            clean(bill.party) === clean(partyName)
                        ).length
                      }{" "}
                      Pending Bill(s)
                    </span>
                  </button>
                ))}
              </div>
            )}

            {partySearchActive &&
              partyNotFound &&
              partySuggestions.length === 0 && (
                <div className="receipt-party-dropdown">
                  <div className="receipt-party-empty">
                    No party with pending bills found
                  </div>
                </div>
              )}
          </div>

          <div className="receipt-field">
            <label>Salesman</label>

            <select
              name="salesman"
              value={receiptFormData.salesman || ""}
              onChange={handleReceiptInput}
            >
              <option value="">Select Salesman</option>

              {(salesmen || []).map((salesman, index) => {
                const value =
                  salesman.salesmanName ||
                  salesman.name ||
                  salesman.salesmanCode ||
                  salesman.code ||
                  "";

                if (!value) return null;

                return (
                  <option
                    key={
                      salesman._id ||
                      salesman.id ||
                      `${value}-${index}`
                    }
                    value={value}
                  >
                    {value}
                  </option>
                );
              })}
            </select>
          </div>

          {/* ================= SECOND ROW ================= */}

          <div className="receipt-field">
            <label>
              Bank/Cash <span>*</span>
            </label>

            <select
              name="bankCash"
              value={receiptFormData.bankCash}
              onChange={handleReceiptInput}
            >
              <option value="">Select</option>
              <option value="Cash">Cash</option>

              {bankCashAccounts.map((account, index) => {
                const accountName =
                  getBankAccountName(account);

                return (
                  <option
                    key={
                      account._id ||
                      account.id ||
                      account.accountCode ||
                      index
                    }
                    value={accountName}
                  >
                    {accountName}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="receipt-field">
            <label>
              Receipt Amount <span>*</span>
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              name="receiptAmount"
              value={receiptFormData.receiptAmount || ""}
              onChange={handleReceiptInput}
              placeholder="0.00"
              className="receipt-number-input"
            />
          </div>

          <div className="receipt-field">
            <label>Cheque No</label>

            <input
              type="text"
              name="chequeNo"
              value={receiptFormData.chequeNo || ""}
              onChange={handleReceiptInput}
              disabled={receiptFormData.bankCash === "Cash"}
              placeholder=""
            />
          </div>

          <div className="receipt-field">
            <label>Cheque Date</label>

            <input
              type="date"
              name="chequeDate"
              value={receiptFormData.chequeDate || ""}
              onChange={handleReceiptInput}
              disabled={receiptFormData.bankCash === "Cash"}
            />
          </div>

          <div className="receipt-field">
            <label>Drawer Bank</label>

            <select
              name="drawerBank"
              value={
                receiptFormData.drawerBank ||
                receiptFormData.drawerBankName ||
                ""
              }
              onChange={(event) => {
                const selectedBankName =
                  event.target.value;

                const selectedBank =
                  filteredCustomerBanks.find(
                    (bank) =>
                      getCustomerBankName(bank) ===
                      selectedBankName
                  );

                setReceiptFormData(
                  (previous) => ({
                    ...previous,

                    drawerBank:
                      selectedBankName,

                    drawerBankName:
                      selectedBankName,

                    drawerBankId:
                      selectedBank?._id ||
                      selectedBank?.id ||
                      selectedBank?.bankId ||
                      ""
                  })
                );
              }}
              disabled={
                receiptFormData.bankCash ===
                "Cash"
              }
            >
              <option value="">
                Select Customer Bank
              </option>

              {filteredCustomerBanks.map(
                (bank, index) => {
                  const bankName =
                    getCustomerBankName(bank);

                  if (!bankName) {
                    return null;
                  }

                  return (
                    <option
                      key={
                        bank._id ||
                        bank.id ||
                        `${bankName}-${index}`
                      }
                      value={bankName}
                    >
                      {bankName}
                    </option>
                  );
                }
              )}
            </select>
          </div>

          <div className="receipt-field">
            <label>MICR</label>

            <input
              type="text"
              name="micr"
              value={receiptFormData.micr || ""}
              onChange={handleReceiptInput}
              disabled={receiptFormData.bankCash === "Cash"}
              placeholder=""
            />
          </div>
        </div>
      </section>

      {/* ================= BILL ADJUSTMENT GRID ================= */}
      <section className="receipt-billing-section receipt-grid-section">
        <div className="receipt-grid-toolbar">
          <div className="receipt-grid-title">
            <span className="receipt-section-dot" />
            <h3>Bill Adjustment</h3>
          </div>

          <div className="receipt-grid-toolbar-right">
            <span>
              Total Bills:
              <strong>{receiptItems.length}</strong>
            </span>

            <span>
              Receipt Amount:
              <strong>
                ₹
                {Number(
                  receiptFormData.receiptAmount || 0
                ).toFixed(2)}
              </strong>
            </span>
          </div>
        </div>

        <div className="receipt-bill-table-scroll">
          <table className="receipt-bill-table">
            <thead>
              <tr>
                <th className="receipt-col-sr">#</th>
                <th>Trn Series</th>
                <th>Trn No</th>
                <th>Trn Date</th>
                <th className="receipt-align-right">
                  Bill Amount
                </th>
                <th className="receipt-align-right">
                  Previous Adjust
                </th>
                <th className="receipt-align-right">
                  Balance Amount
                </th>
                <th>Now Adjust</th>
                <th>Discount %</th>
                <th className="receipt-align-right">
                  Discount Amount
                </th>
                <th className="receipt-col-remark">
                  Remark
                </th>
              </tr>
            </thead>

            <tbody>
              {receiptItems.length === 0 ? (
                <tr>
                  <td
                    colSpan="11"
                    className="receipt-table-empty"
                  >
                    Select a party or enter Bill Series and Bill
                    No to load pending bills.
                  </td>
                </tr>
              ) : (
                receiptItems.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="receipt-col-sr">
                      {index + 1}
                    </td>

                    <td>{item.trnSeries || "-"}</td>

                    <td>{item.trnNo || "-"}</td>

                    <td>{item.trnDate || "-"}</td>

                    <td className="receipt-align-right receipt-readonly-value">
                      ₹{Number(item.amount || 0).toFixed(2)}
                    </td>

                    <td className="receipt-align-right receipt-readonly-value">
                      ₹{Number(item.adjustAmt || 0).toFixed(2)}
                    </td>

                    <td className="receipt-align-right receipt-balance-value">
                      ₹{Number(item.balanceAmt || 0).toFixed(2)}
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="receipt-table-number-input"
                        value={item.nowAdjust ?? ""}
                        onChange={(event) =>
                          updateReceiptItem(
                            index,
                            "nowAdjust",
                            event.target.value
                          )
                        }
                        onBlur={(event) => {
                          if (event.target.value === "") {
                            updateReceiptItem(
                              index,
                              "nowAdjust",
                              0
                            );
                          }
                        }}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="receipt-table-number-input"
                        value={item.discount ?? ""}
                        onChange={(event) =>
                          updateReceiptItem(
                            index,
                            "discount",
                            event.target.value
                          )
                        }
                      />
                    </td>

                    <td className="receipt-align-right receipt-discount-value">
                      ₹
                      {Number(
                        item.discAmount ||
                        item.discAmt ||
                        0
                      ).toFixed(2)}
                    </td>

                    <td>
                      <input
                        type="text"
                        className="receipt-table-remark-input"
                        value={item.remark || ""}
                        onChange={(event) =>
                          updateReceiptItem(
                            index,
                            "remark",
                            event.target.value
                          )
                        }
                        placeholder="Remark"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="receipt-grid-footer">
          <div className="receipt-grid-footer-left">
            <span>
              Total Items:
              <strong>{receiptItems.length}</strong>
            </span>
          </div>

          <div className="receipt-grid-footer-right">
            <span>
              Adjusted:
              <strong>
                ₹
                {Number(
                  receiptSummary.totalAdjusted || 0
                ).toFixed(2)}
              </strong>
            </span>

            <span>
              Discount:
              <strong>
                ₹
                {Number(
                  receiptSummary.totalDiscount || 0
                ).toFixed(2)}
              </strong>
            </span>
          </div>
        </div>
      </section>

      {/* ================= SUMMARY ================= */}
      {/* ================= RECEIPT SUMMARY ================= */}
      <section className="receipt-invoice-summary">
        <div className="receipt-invoice-summary-header">
          <div className="receipt-invoice-summary-title">
            <span className="receipt-invoice-summary-dot" />
            <h3>Receipt Summary</h3>
          </div>

          <div className="receipt-invoice-summary-right">
            <span>
              Party:
              <strong>
                {receiptFormData.partyName || "Not selected"}
              </strong>
            </span>
          </div>
        </div>

        <div className="receipt-invoice-summary-cards">
          <div className="receipt-invoice-summary-card">
            <span>Receipt Amount</span>
            <strong>
              ₹
              {Number(
                receiptFormData.receiptAmount || 0
              ).toFixed(2)}
            </strong>
          </div>

          <div className="receipt-invoice-summary-card">
            <span>Total Adjusted</span>
            <strong>
              ₹
              {Number(
                receiptSummary.totalAdjusted || 0
              ).toFixed(2)}
            </strong>
          </div>

          <div className="receipt-invoice-summary-card receipt-invoice-summary-red">
            <span>Total Discount</span>
            <strong>
              -₹
              {Number(
                receiptSummary.totalDiscount || 0
              ).toFixed(2)}
            </strong>
          </div>

          <div className="receipt-invoice-summary-card receipt-invoice-summary-orange">
            <span>Unadjusted Balance</span>
            <strong>
              ₹
              {Number(
                receiptSummary.balanceAmount || 0
              ).toFixed(2)}
            </strong>
          </div>

          <div className="receipt-invoice-summary-card">
            <span>Pending Amount</span>
            <strong>
              ₹
              {Number(
                receiptBottomSummary.totalPendingAmount || 0
              ).toFixed(2)}
            </strong>
          </div>

          <div className="receipt-invoice-summary-card">
            <span>Collected Amount</span>
            <strong>
              ₹
              {Number(
                receiptBottomSummary.totalCollectedAmount || 0
              ).toFixed(2)}
            </strong>
          </div>

          <div className="receipt-invoice-summary-card">
            <span>Pending Bills</span>
            <strong>
              {receiptBottomSummary.totalPendingBills || 0}
            </strong>
          </div>

          <div className="receipt-invoice-summary-card">
            <span>Last Collection</span>
            <strong>
              ₹
              {Number(
                receiptBottomSummary.lastCollectionAmount || 0
              ).toFixed(2)}
            </strong>
          </div>

          <div className="receipt-invoice-summary-card">
            <span>Last Collection Date</span>
            <strong>
              {receiptBottomSummary.lastCollectionDate || "-"}
            </strong>
          </div>

          <div className="receipt-invoice-summary-card receipt-invoice-summary-blue">
            <span>Net Receipt</span>
            <strong>
              ₹
              {Number(
                receiptSummary.totalAdjusted || 0
              ).toFixed(2)}
            </strong>
          </div>
        </div>

        <div className="receipt-invoice-summary-narration-row">
          <input
            type="text"
            name="narration"
            value={receiptFormData.narration || ""}
            onChange={handleReceiptInput}
            placeholder="Enter narration"
          />

          <div className="receipt-invoice-summary-meta">
            <span>
              Last Bill:
              <strong>
                {receiptBottomSummary.lastPaymentAgainstBillNo || "-"}
              </strong>
            </span>

            <span>
              Bills:
              <strong>{receiptItems.length}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* ================= BOTTOM ACTIONS ================= */}

    </div>
  );

  /* =========================================================
   JOURNAL VOUCHER FILTERING AND PAGINATION
   ========================================================= */

  const journalListRows = Array.isArray(
    state.journals
  )
    ? state.journals
    : [];

  const normalizedJournalSearch = String(
    journalListSearch || ""
  )
    .trim()
    .toLowerCase();

  const filteredJournalList =
    journalListRows.filter((journal) => {
      const header =
        journal.header || journal || {};

      const summary =
        journal.summary || {};

      const voucherNo = String(
        header.vNo ||
        header.voucherNo ||
        ""
      )
        .trim()
        .toLowerCase();

      const voucherDate = String(
        header.vDate ||
        header.voucherDate ||
        header.date ||
        ""
      )
        .trim()
        .slice(0, 10);

      const narration = String(
        header.narr ||
        header.narration ||
        ""
      )
        .trim()
        .toLowerCase();

      const totalDr =
        Number(
          summary.totalDr ??
          header.totalDr ??
          0
        ) || 0;

      const totalCr =
        Number(
          summary.totalCr ??
          header.totalCr ??
          0
        ) || 0;

      const difference = Math.abs(
        totalDr - totalCr
      );

      const balanceStatus =
        difference < 0.01
          ? "balanced"
          : "unbalanced";

      const searchableText = [
        voucherNo,
        voucherDate,
        narration,
        totalDr,
        totalCr,
        balanceStatus,
        header.addUser,
        header.editUser,
      ]
        .map((value) =>
          String(value ?? "")
            .trim()
            .toLowerCase()
        )
        .join(" ");

      const appliedFromDate = String(
        journalAppliedFilters.fromDate || ""
      ).trim();

      const appliedToDate = String(
        journalAppliedFilters.toDate || ""
      ).trim();

      const appliedVoucherNo = String(
        journalAppliedFilters.voucherNo || ""
      )
        .trim()
        .toLowerCase();

      const appliedNarration = String(
        journalAppliedFilters.narration || ""
      )
        .trim()
        .toLowerCase();

      const appliedBalanceStatus = String(
        journalAppliedFilters.balanceStatus ||
        ""
      )
        .trim()
        .toLowerCase();

      const matchesSearch =
        !normalizedJournalSearch ||
        searchableText.includes(
          normalizedJournalSearch
        );

      const matchesFromDate =
        !appliedFromDate ||
        (voucherDate &&
          voucherDate >= appliedFromDate);

      const matchesToDate =
        !appliedToDate ||
        (voucherDate &&
          voucherDate <= appliedToDate);

      const matchesVoucherNo =
        !appliedVoucherNo ||
        voucherNo.includes(appliedVoucherNo);

      const matchesNarration =
        !appliedNarration ||
        narration.includes(appliedNarration);

      const matchesBalanceStatus =
        !appliedBalanceStatus ||
        balanceStatus ===
        appliedBalanceStatus;

      return (
        matchesSearch &&
        matchesFromDate &&
        matchesToDate &&
        matchesVoucherNo &&
        matchesNarration &&
        matchesBalanceStatus
      );
    });

  const journalActiveFilterCount = [
    journalAppliedFilters.fromDate,
    journalAppliedFilters.toDate,
    journalAppliedFilters.voucherNo,
    journalAppliedFilters.narration,
    journalAppliedFilters.balanceStatus,
  ].filter((value) =>
    String(value || "").trim()
  ).length;

  const journalTotalPages = Math.max(
    Math.ceil(
      filteredJournalList.length /
      journalListRowsPerPage
    ),
    1
  );

  const journalSafePage = Math.min(
    journalListCurrentPage,
    journalTotalPages
  );

  const journalStartIndex =
    (journalSafePage - 1) *
    journalListRowsPerPage;

  const paginatedJournalList =
    filteredJournalList.slice(
      journalStartIndex,
      journalStartIndex +
      journalListRowsPerPage
    );

  const journalShowingFrom =
    filteredJournalList.length === 0
      ? 0
      : journalStartIndex + 1;

  const journalShowingTo = Math.min(
    journalStartIndex +
    journalListRowsPerPage,
    filteredJournalList.length
  );

  const getJournalPaginationPages = () => {
    const pages = [];

    const startPage = Math.max(
      1,
      journalSafePage - 2
    );

    const endPage = Math.min(
      journalTotalPages,
      journalSafePage + 2
    );

    for (
      let pageNumber = startPage;
      pageNumber <= endPage;
      pageNumber += 1
    ) {
      pages.push(pageNumber);
    }

    return pages;
  };

  useEffect(() => {
    setJournalListCurrentPage(1);
  }, [
    journalListSearch,
    journalListRowsPerPage,
  ]);

  useEffect(() => {
    if (
      journalListCurrentPage >
      journalTotalPages
    ) {
      setJournalListCurrentPage(
        journalTotalPages
      );
    }
  }, [
    journalListCurrentPage,
    journalTotalPages,
  ]);

  // Journal List
  const renderJournalList = () => {
    const today = new Date()
      .toISOString()
      .split("T")[0];

    const todayJournalCount =
      journalListRows.filter((journal) => {
        const header =
          journal.header || journal || {};

        return (
          String(header.vDate || "")
            .slice(0, 10) === today
        );
      }).length;

    const totalDebitAmount =
      filteredJournalList.reduce(
        (total, journal) => {
          const summary =
            journal.summary || {};

          return (
            total +
            (Number(summary.totalDr) || 0)
          );
        },
        0
      );

    const totalCreditAmount =
      filteredJournalList.reduce(
        (total, journal) => {
          const summary =
            journal.summary || {};

          return (
            total +
            (Number(summary.totalCr) || 0)
          );
        },
        0
      );

    const balancedJournalCount =
      filteredJournalList.filter(
        (journal) => {
          const summary =
            journal.summary || {};

          const totalDr =
            Number(summary.totalDr) || 0;

          const totalCr =
            Number(summary.totalCr) || 0;

          return (
            Math.abs(totalDr - totalCr) <
            0.01
          );
        }
      ).length;

    const unbalancedJournalCount =
      filteredJournalList.length -
      balancedJournalCount;

    const openNewJournalVoucher = () => {
      openTransactionEntry(
        "Journal Voucher"
      );

      if (journalItems.length === 0) {
        addJournalRow();
      }
    };

    return (
      <div className="journal-premium-list-page">
        <div className="journal-premium-heading">
          <div className="journal-premium-title">
            <h2>Journal Voucher List</h2>

            <p>
              Manage debit and credit journal
              voucher entries
            </p>
          </div>

          <div className="journal-heading-actions">
            <button
              type="button"
              className="journal-main-button journal-add-button"
              onClick={openNewJournalVoucher}
            >
              <Plus size={16} />
              New Journal Voucher
            </button>

            <button
              type="button"
              className="journal-main-button journal-excel-button"
            >
              <FileSpreadsheet size={16} />
              Export Excel
            </button>

            <button
              type="button"
              className="journal-main-button journal-pdf-button"
            >
              <FileText size={16} />
              Export PDF
            </button>

            <button
              type="button"
              className="journal-main-button journal-print-button"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              Print List
            </button>
          </div>
        </div>

        <div className="journal-summary-grid">
          <div className="journal-summary-card">
            <div className="journal-summary-icon blue">
              <CalendarDays size={20} />
            </div>

            <div className="journal-summary-content">
              <span>Today's Journals</span>

              <strong>
                {todayJournalCount}
              </strong>

              <small>
                {new Date().toLocaleDateString(
                  "en-GB"
                )}
              </small>
            </div>
          </div>

          <div className="journal-summary-card">
            <div className="journal-summary-icon violet">
              <BookOpen size={20} />
            </div>

            <div className="journal-summary-content">
              <span>Total Journals</span>

              <strong>
                {journalListRows.length}
              </strong>

              <small>All records</small>
            </div>
          </div>

          <div className="journal-summary-card">
            <div className="journal-summary-icon red">
              <ArrowUpRight size={20} />
            </div>

            <div className="journal-summary-content">
              <span>Total Debit</span>

              <strong>
                ₹
                {totalDebitAmount.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>

              <small>Filtered records</small>
            </div>
          </div>

          <div className="journal-summary-card">
            <div className="journal-summary-icon green">
              <ArrowDownLeft size={20} />
            </div>

            <div className="journal-summary-content">
              <span>Total Credit</span>

              <strong>
                ₹
                {totalCreditAmount.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>

              <small>Filtered records</small>
            </div>
          </div>

          <div className="journal-summary-card">
            <div
              className={`journal-summary-icon ${unbalancedJournalCount > 0
                ? "orange"
                : "cyan"
                }`}
            >
              {unbalancedJournalCount > 0 ? (
                <TriangleAlert size={20} />
              ) : (
                <CircleCheck size={20} />
              )}
            </div>

            <div className="journal-summary-content">
              <span>
                {unbalancedJournalCount > 0
                  ? "Unbalanced"
                  : "Balanced Journals"}
              </span>

              <strong>
                {unbalancedJournalCount > 0
                  ? unbalancedJournalCount
                  : balancedJournalCount}
              </strong>

              <small>
                {unbalancedJournalCount > 0
                  ? "Needs verification"
                  : "Debit equals credit"}
              </small>
            </div>
          </div>
        </div>

        <div className="journal-list-toolbar">
          <div className="journal-search-box">
            <Search size={16} />

            <input
              type="text"
              value={journalListSearch}
              placeholder="Search voucher, date or narration..."
              onChange={(event) =>
                setJournalListSearch(
                  event.target.value
                )
              }
            />

            {journalListSearch && (
              <button
                type="button"
                className="journal-clear-search"
                onClick={() =>
                  setJournalListSearch("")
                }
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            className={`journal-filter-toggle ${journalActiveFilterCount > 0
              ? "has-active-filters"
              : ""
              }`}
            onClick={() =>
              setJournalFiltersVisible(
                (previous) => !previous
              )
            }
          >
            <SlidersHorizontal size={16} />
            Apply Filter

            {journalActiveFilterCount > 0 && (
              <span className="journal-filter-count">
                {journalActiveFilterCount}
              </span>
            )}

            <ChevronDown
              size={15}
              className={
                journalFiltersVisible
                  ? "journal-filter-chevron open"
                  : "journal-filter-chevron"
              }
            />
          </button>
        </div>

        {journalFiltersVisible && (
          <div className="journal-filter-panel">
            <div className="journal-filter-field">
              <label>From Date</label>

              <input
                type="date"
                value={
                  journalDraftFilters.fromDate
                }
                onChange={(event) =>
                  handleJournalDraftFilterChange(
                    "fromDate",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="journal-filter-field">
              <label>To Date</label>

              <input
                type="date"
                value={
                  journalDraftFilters.toDate
                }
                onChange={(event) =>
                  handleJournalDraftFilterChange(
                    "toDate",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="journal-filter-field">
              <label>Voucher No</label>

              <input
                type="text"
                value={
                  journalDraftFilters.voucherNo
                }
                placeholder="Enter voucher no"
                onChange={(event) =>
                  handleJournalDraftFilterChange(
                    "voucherNo",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="journal-filter-field">
              <label>Narration</label>

              <input
                type="text"
                value={
                  journalDraftFilters.narration
                }
                placeholder="Enter narration"
                onChange={(event) =>
                  handleJournalDraftFilterChange(
                    "narration",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="journal-filter-field">
              <label>Balance Status</label>

              <select
                value={
                  journalDraftFilters.balanceStatus
                }
                onChange={(event) =>
                  handleJournalDraftFilterChange(
                    "balanceStatus",
                    event.target.value
                  )
                }
              >
                <option value="">
                  All Journals
                </option>

                <option value="balanced">
                  Balanced
                </option>

                <option value="unbalanced">
                  Unbalanced
                </option>
              </select>
            </div>

            <div className="journal-filter-actions">
              <button
                type="button"
                className="journal-filter-clear"
                onClick={
                  clearJournalListFilters
                }
              >
                Clear
              </button>

              <button
                type="button"
                className="journal-filter-apply"
                onClick={
                  applyJournalListFilters
                }
              >
                <SlidersHorizontal size={15} />
                Apply Filter
              </button>
            </div>
          </div>
        )}

        <div className="journal-table-card">
          <div className="journal-table-scroll">
            <table className="journal-premium-table">
              <thead>
                <tr>
                  <th className="journal-sr-column">
                    SrNo
                  </th>

                  <th>Voucher No</th>
                  <th>Voucher Date</th>
                  <th>Narration</th>

                  <th className="journal-amount-column">
                    Total Debit
                  </th>

                  <th className="journal-amount-column">
                    Total Credit
                  </th>

                  <th className="journal-amount-column">
                    Difference
                  </th>

                  <th>Status</th>

                  <th className="journal-actions-column">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedJournalList.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="journal-empty-cell"
                    >
                      <strong>
                        No journal voucher records
                        found
                      </strong>

                      <span>
                        {journalListSearch ||
                          journalActiveFilterCount > 0
                          ? "Try changing or clearing the filters."
                          : "Click New Journal Voucher to create an entry."}
                      </span>
                    </td>
                  </tr>
                ) : (
                  paginatedJournalList.map(
                    (journal, index) => {
                      const header =
                        journal.header ||
                        journal ||
                        {};

                      const summary =
                        journal.summary || {};

                      const totalDr =
                        Number(
                          summary.totalDr ??
                          header.totalDr ??
                          0
                        ) || 0;

                      const totalCr =
                        Number(
                          summary.totalCr ??
                          header.totalCr ??
                          0
                        ) || 0;

                      const difference =
                        Math.abs(
                          totalDr - totalCr
                        );

                      const isBalanced =
                        difference < 0.01;

                      return (
                        <tr
                          key={
                            journal.id ||
                            journal._id ||
                            `${header.vNo}-${index}`
                          }
                        >
                          <td className="journal-sr-column">
                            {journalStartIndex +
                              index +
                              1}
                          </td>

                          <td className="journal-voucher-number">
                            {header.vNo || "-"}
                          </td>

                          <td>
                            {header.vDate || "-"}
                          </td>

                          <td className="journal-narration">
                            {header.narr ||
                              header.narration ||
                              "-"}
                          </td>

                          <td className="journal-amount-column journal-debit-amount">
                            ₹
                            {totalDr.toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td className="journal-amount-column journal-credit-amount">
                            ₹
                            {totalCr.toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td className="journal-amount-column">
                            ₹
                            {difference.toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td>
                            <span
                              className={`journal-status-badge ${isBalanced
                                ? "balanced"
                                : "unbalanced"
                                }`}
                            >
                              {isBalanced
                                ? "Balanced"
                                : "Unbalanced"}
                            </span>
                          </td>

                          <td className="journal-actions-column">
                            <div className="journal-row-actions">
                              <button
                                type="button"
                                className="journal-action-button view"
                                title="View Journal Voucher"
                                onClick={() => {
                                  setTransactionFormMode(
                                    (previous) => ({
                                      ...previous,
                                      ["Journal Voucher"]:
                                        true,
                                    })
                                  );

                                  editJournal(journal);
                                }}
                              >
                                <Eye size={16} />
                              </button>

                              <button
                                type="button"
                                className="journal-action-button edit"
                                title="Edit Journal Voucher"
                                onClick={() => {
                                  setTransactionFormMode(
                                    (previous) => ({
                                      ...previous,
                                      ["Journal Voucher"]:
                                        true,
                                    })
                                  );

                                  editJournal(journal);
                                }}
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                className="journal-action-button delete"
                                title="Delete Journal Voucher"
                                onClick={() =>
                                  deleteJournal(
                                    journal.id ||
                                    journal._id
                                  )
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="journal-pagination-footer">
            <div className="journal-pagination-info">
              Showing{" "}
              <strong>
                {journalShowingFrom}
              </strong>{" "}
              to{" "}
              <strong>
                {journalShowingTo}
              </strong>{" "}
              of{" "}
              <strong>
                {filteredJournalList.length}
              </strong>{" "}
              entries
            </div>

            <div className="journal-pagination-controls">
              <select
                value={journalListRowsPerPage}
                onChange={(event) =>
                  setJournalListRowsPerPage(
                    Number(event.target.value)
                  )
                }
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <div className="journal-page-buttons">
                <button
                  type="button"
                  disabled={journalSafePage === 1}
                  onClick={() =>
                    setJournalListCurrentPage(
                      (previous) =>
                        Math.max(
                          previous - 1,
                          1
                        )
                    )
                  }
                >
                  <ChevronLeft size={16} />
                </button>

                {getJournalPaginationPages().map(
                  (pageNumber) => (
                    <button
                      type="button"
                      key={pageNumber}
                      className={
                        pageNumber ===
                          journalSafePage
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setJournalListCurrentPage(
                          pageNumber
                        )
                      }
                    >
                      {pageNumber}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={
                    journalSafePage ===
                    journalTotalPages
                  }
                  onClick={() =>
                    setJournalListCurrentPage(
                      (previous) =>
                        Math.min(
                          previous + 1,
                          journalTotalPages
                        )
                    )
                  }
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Journal Form
  // =========================================================
  // JOURNAL VOUCHER FORM — RECEIPT STYLE UI
  // =========================================================

  const renderJournalForm = () => (
    <div className="journal-billing-page">
      <div className="journal-billing-card">

        {/* ================= TOP HEADER ================= */}

        <div className="journal-billing-topbar">
          <div className="journal-billing-title-wrap">
            <h2>Journal Voucher Entry</h2>

            <span className="journal-billing-badge">
              New Voucher
            </span>
          </div>

          <div className="journal-billing-actions">
            <button
              type="button"
              className="journal-save-header-btn"
              onClick={saveJournalVoucher}
            >
              💾 Save Journal
            </button>

            <button
              type="button"
              className="journal-more-btn"
              aria-label="More options"
            >
              ⋮
            </button>

            <button
              type="button"
              className="journal-close-header-btn"
              onClick={() =>
                openTransactionList("Journal Voucher")
              }
              aria-label="Close Journal Voucher"
            >
              ×
            </button>
          </div>
        </div>

        {/* ================= JOURNAL INFORMATION ================= */}

        <section className="journal-entry-header-section">
          <div className="journal-section-heading">
            <div className="journal-heading-left">
              <span className="journal-section-dot" />
              <h3>Journal Information</h3>
            </div>

            <div className="journal-header-meta">
              <span>
                Voucher No:
                <strong>{journalFormData.vNo || "-"}</strong>
              </span>

              <span>
                Entries:
                <strong>
                  {journalSummary.totalEntries || 0}
                </strong>
              </span>
            </div>
          </div>

          {/* COMPLETE HEADER IN ONLY TWO ROWS */}

          <div className="journal-header-two-rows">

            {/* ================= FIRST ROW ================= */}

            <div className="journal-field">
              <label>
                Voucher Date <span>*</span>
              </label>

              <input
                type="date"
                name="vDate"
                value={journalFormData.vDate || ""}
                onChange={handleJournalInput}
              />
            </div>

            <div className="journal-field">
              <label>
                Voucher No <span>*</span>
              </label>

              <input
                type="text"
                inputMode="numeric"
                name="vNo"
                value={
                  journalFormData.vNo || ""
                }
                readOnly={
                  autoVoucherNo === true
                }
                placeholder={
                  autoVoucherNo === true
                    ? "Auto generated"
                    : "Enter voucher no"
                }
                onChange={(event) => {
                  if (autoVoucherNo === true) {
                    return;
                  }

                  setJournalFormData(
                    (previous) => ({
                      ...previous,
                      vNo: cleanVoucherNumber(
                        event.target.value
                      ),
                    })
                  );
                }}
              />
            </div>

            <div className="journal-field">
              <label>Is GST</label>

              <select
                name="isGst"
                value={journalFormData.isGst || "N"}
                onChange={handleJournalInput}
              >
                <option value="N">No</option>
                <option value="Y">Yes</option>
              </select>
            </div>

            <div className="journal-field journal-narration-inline">
              <label>Narration</label>

              <input
                type="text"
                name="narr"
                value={journalFormData.narr || ""}
                onChange={handleJournalInput}
                placeholder="Enter narration"
              />
            </div>
          </div>
        </section>

        {/* ================= JOURNAL ENTRY GRID ================= */}

        <section className="journal-grid-section">
          <div className="journal-grid-heading">
            <div className="journal-heading-left">
              <span className="journal-section-dot" />
              <h3>Journal Entries</h3>
            </div>

            <button
              type="button"
              className="journal-add-row-top-btn"
              onClick={addJournalRow}
            >
              + Add Row
            </button>
          </div>

          <div className="journal-grid-scroll">
            <table className="journal-entry-grid">
              <thead>
                <tr>
                  <th>Seq No</th>
                  <th>Account Code</th>
                  <th>Account Name</th>
                  <th>Debit Amount</th>
                  <th>Credit Amount</th>
                </tr>
              </thead>

              <tbody>
                {journalItems.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="journal-seq-cell">
                      {index + 1}
                    </td>

                    <td>
                      <input
                        type="text"
                        value={item.accountCode || ""}
                        readOnly
                        className="journal-readonly-input"
                      />
                    </td>

                    <td className="journal-account-search-cell">
                      <div className="journal-account-search-wrap">
                        <input
                          type="text"
                          value={item.accountName || ""}
                          onChange={(event) =>
                            handleAccountSearch(
                              index,
                              event.target.value
                            )
                          }
                          onFocus={() => {
                            /*
                            * Do not automatically open the complete
                            * account list when the field receives focus.
                            */
                            setAccountSuggestions([]);
                            setActiveAccountRow(null);
                          }}
                          onBlur={() => {
                            /*
                            * Delay closing slightly so clicking an
                            * account option still works.
                            */
                            window.setTimeout(() => {
                              setAccountSuggestions([]);
                              setActiveAccountRow(null);
                            }, 150);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              setAccountSuggestions([]);
                              setActiveAccountRow(null);
                              event.currentTarget.blur();
                            }
                          }}
                          placeholder="Type code or account name"
                          autoComplete="off"
                        />

                        {activeAccountRow === index &&
                          accountSuggestions.length > 0 && (
                            <div className="journal-account-dropdown">
                              {accountSuggestions.map(
                                (account, accountIndex) => (
                                  <button
                                    type="button"
                                    key={
                                      account._id ||
                                      account.id ||
                                      getAccountCode(account) ||
                                      accountIndex
                                    }
                                    className="journal-account-option"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();

                                      selectAccount(
                                        index,
                                        account
                                      );
                                    }}
                                  >
                                    <span className="journal-option-code">
                                      {getAccountCode(account) || "-"}
                                    </span>

                                    <span className="journal-option-name">
                                      {getAccountName(account) || "-"}
                                    </span>
                                  </button>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.drAmount}
                        onChange={(event) =>
                          updateJournalItem(
                            index,
                            "drAmount",
                            event.target.value
                          )
                        }
                        className="journal-amount-input"
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.crAmount}
                        onChange={(event) =>
                          updateJournalItem(
                            index,
                            "crAmount",
                            event.target.value
                          )
                        }
                        className="journal-amount-input"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ================= GRID FOOTER ================= */}

          <div className="journal-grid-footer">
            <button
              type="button"
              className="journal-add-row-bottom-btn"
              onClick={addJournalRow}
            >
              + Add Row
            </button>

            <div className="journal-grid-footer-info">
              <span>
                Total Entries:
                <strong>
                  {journalSummary.totalEntries || 0}
                </strong>
              </span>
            </div>
          </div>
        </section>

        {/* ================= JOURNAL SUMMARY ================= */}

        <section className="journal-summary-section">
          <div className="journal-summary-heading">
            <div className="journal-heading-left">
              <span className="journal-section-dot" />
              <h3>Journal Summary</h3>
            </div>

            <span
              className={`journal-balance-status ${Number(journalSummary.difference || 0) === 0
                ? "balanced"
                : "unbalanced"
                }`}
            >
              {Number(journalSummary.difference || 0) === 0
                ? "Balanced"
                : "Difference Found"}
            </span>
          </div>

          <div className="journal-summary-grid">
            <div className="journal-summary-card">
              <span>Total Debit</span>

              <strong>
                ₹
                {Number(
                  journalSummary.totalDr || 0
                ).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </strong>
            </div>

            <div className="journal-summary-card">
              <span>Total Credit</span>

              <strong>
                ₹
                {Number(
                  journalSummary.totalCr || 0
                ).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </strong>
            </div>

            <div
              className={`journal-summary-card difference ${Number(journalSummary.difference || 0) === 0
                ? "balanced"
                : "unbalanced"
                }`}
            >
              <span>Difference</span>

              <strong>
                ₹
                {Number(
                  journalSummary.difference || 0
                ).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </strong>
            </div>

            <div className="journal-summary-card">
              <span>Total Entries</span>

              <strong>
                {journalSummary.totalEntries || 0}
              </strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
  /* =========================================================
   PAYMENT LIST FILTERING AND PAGINATION
   ========================================================= */

  const paymentListRows = Array.isArray(
    state.payments
  )
    ? state.payments
    : [];

  const normalizedPaymentSearch = String(
    paymentListSearch || ""
  )
    .trim()
    .toLowerCase();

  const filteredPaymentList =
    paymentListRows.filter((payment) => {
      const header = payment.header || payment || {};

      const paymentDate = String(
        header.vDate ||
        header.paymentDate ||
        header.date ||
        ""
      )
        .trim()
        .slice(0, 10);

      const partyName = String(
        header.partyName ||
        header.accountName ||
        ""
      )
        .trim()
        .toLowerCase();

      const paymentType = String(
        header.bankCash ||
        header.paymentType ||
        ""
      )
        .trim()
        .toLowerCase();

      const searchableText = [
        header.vNo,
        paymentDate,
        partyName,
        header.drAmt,
        header.crAmt,
        header.chqNo,
        header.chequeNo,
        header.bankCash,
        header.partyBankName,
        header.bankAccountNo,
        header.narr,
        header.narration,
      ]
        .map((value) =>
          String(value ?? "")
            .trim()
            .toLowerCase()
        )
        .join(" ");

      const appliedFromDate = String(
        paymentAppliedFilters.fromDate || ""
      ).trim();

      const appliedToDate = String(
        paymentAppliedFilters.toDate || ""
      ).trim();

      const appliedParty = String(
        paymentAppliedFilters.party || ""
      )
        .trim()
        .toLowerCase();

      const appliedPaymentType = String(
        paymentAppliedFilters.paymentType || ""
      )
        .trim()
        .toLowerCase();

      const matchesSearch =
        !normalizedPaymentSearch ||
        searchableText.includes(
          normalizedPaymentSearch
        );

      const matchesFromDate =
        !appliedFromDate ||
        (paymentDate &&
          paymentDate >= appliedFromDate);

      const matchesToDate =
        !appliedToDate ||
        (paymentDate &&
          paymentDate <= appliedToDate);

      const matchesParty =
        !appliedParty ||
        partyName.includes(appliedParty);

      const matchesPaymentType =
        !appliedPaymentType ||
        paymentType === appliedPaymentType;

      return (
        matchesSearch &&
        matchesFromDate &&
        matchesToDate &&
        matchesParty &&
        matchesPaymentType
      );
    });

  const paymentActiveFilterCount = [
    paymentAppliedFilters.fromDate,
    paymentAppliedFilters.toDate,
    paymentAppliedFilters.party,
    paymentAppliedFilters.paymentType,
  ].filter((value) =>
    String(value || "").trim()
  ).length;

  const paymentTotalPages = Math.max(
    Math.ceil(
      filteredPaymentList.length /
      paymentListRowsPerPage
    ),
    1
  );

  const paymentSafePage = Math.min(
    paymentListCurrentPage,
    paymentTotalPages
  );

  const paymentStartIndex =
    (paymentSafePage - 1) *
    paymentListRowsPerPage;

  const paginatedPaymentList =
    filteredPaymentList.slice(
      paymentStartIndex,
      paymentStartIndex +
      paymentListRowsPerPage
    );

  const paymentShowingFrom =
    filteredPaymentList.length === 0
      ? 0
      : paymentStartIndex + 1;

  const paymentShowingTo = Math.min(
    paymentStartIndex + paymentListRowsPerPage,
    filteredPaymentList.length
  );

  const getPaymentPaginationPages = () => {
    const pages = [];

    const startPage = Math.max(
      1,
      paymentSafePage - 2
    );

    const endPage = Math.min(
      paymentTotalPages,
      paymentSafePage + 2
    );

    for (
      let pageNumber = startPage;
      pageNumber <= endPage;
      pageNumber += 1
    ) {
      pages.push(pageNumber);
    }

    return pages;
  };

  useEffect(() => {
    setPaymentListCurrentPage(1);
  }, [
    paymentListSearch,
    paymentListRowsPerPage,
  ]);

  useEffect(() => {
    if (
      paymentListCurrentPage >
      paymentTotalPages
    ) {
      setPaymentListCurrentPage(
        paymentTotalPages
      );
    }
  }, [
    paymentListCurrentPage,
    paymentTotalPages,
  ]);

  // Payment List
  const renderPaymentList = () => {
    const today = new Date()
      .toISOString()
      .split("T")[0];

    const todayPaymentCount =
      paymentListRows.filter((payment) => {
        const header =
          payment.header || payment || {};

        return (
          String(header.vDate || "")
            .slice(0, 10) === today
        );
      }).length;

    const totalDebitAmount =
      filteredPaymentList.reduce(
        (total, payment) => {
          const header =
            payment.header || payment || {};

          return (
            total +
            (Number(header.drAmt) || 0)
          );
        },
        0
      );

    const totalCreditAmount =
      filteredPaymentList.reduce(
        (total, payment) => {
          const header =
            payment.header || payment || {};

          return (
            total +
            (Number(header.crAmt) || 0)
          );
        },
        0
      );

    const cashPaymentCount =
      filteredPaymentList.filter(
        (payment) => {
          const header =
            payment.header || payment || {};

          return (
            String(header.bankCash || "")
              .trim()
              .toLowerCase() === "cash"
          );
        }
      ).length;

    return (
      <div className="payment-premium-list-page">
        <div className="payment-premium-heading">
          <div className="payment-premium-title">
            <h2>Payment List</h2>
            <p>
              Manage supplier and account payments
            </p>
          </div>

          <div className="payment-heading-actions">
            <button
              type="button"
              className="payment-main-button payment-add-button"
              onClick={() =>
                openTransactionEntry("Payment")
              }
            >
              <Plus size={16} />
              New Payment
            </button>

            <button
              type="button"
              className="payment-main-button payment-excel-button"
            >
              <FileSpreadsheet size={16} />
              Export Excel
            </button>

            <button
              type="button"
              className="payment-main-button payment-pdf-button"
            >
              <FileText size={16} />
              Export PDF
            </button>

            <button
              type="button"
              className="payment-main-button payment-print-button"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              Print List
            </button>
          </div>
        </div>

        <div className="payment-summary-grid">
          <div className="payment-summary-card">
            <div className="payment-summary-icon blue">
              <CalendarDays size={20} />
            </div>

            <div className="payment-summary-content">
              <span>Today's Payments</span>
              <strong>{todayPaymentCount}</strong>
              <small>
                {new Date().toLocaleDateString(
                  "en-GB"
                )}
              </small>
            </div>
          </div>

          <div className="payment-summary-card">
            <div className="payment-summary-icon violet">
              <ReceiptText size={20} />
            </div>

            <div className="payment-summary-content">
              <span>Total Payments</span>
              <strong>
                {paymentListRows.length}
              </strong>
              <small>All records</small>
            </div>
          </div>

          <div className="payment-summary-card">
            <div className="payment-summary-icon red">
              <Wallet size={20} />
            </div>

            <div className="payment-summary-content">
              <span>Total Debit</span>
              <strong>
                ₹
                {totalDebitAmount.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>
              <small>Filtered records</small>
            </div>
          </div>

          <div className="payment-summary-card">
            <div className="payment-summary-icon green">
              <Wallet size={20} />
            </div>

            <div className="payment-summary-content">
              <span>Total Credit</span>
              <strong>
                ₹
                {totalCreditAmount.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>
              <small>Filtered records</small>
            </div>
          </div>

          <div className="payment-summary-card">
            <div className="payment-summary-icon orange">
              <ReceiptText size={20} />
            </div>

            <div className="payment-summary-content">
              <span>Cash Payments</span>
              <strong>{cashPaymentCount}</strong>
              <small>Filtered records</small>
            </div>
          </div>
        </div>

        <div className="payment-list-toolbar">
          <div className="payment-search-box">
            <Search size={16} />

            <input
              type="text"
              value={paymentListSearch}
              placeholder="Search voucher, party, cheque or bank..."
              onChange={(event) =>
                setPaymentListSearch(
                  event.target.value
                )
              }
            />

            {paymentListSearch && (
              <button
                type="button"
                className="payment-clear-search"
                onClick={() =>
                  setPaymentListSearch("")
                }
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            className={`payment-filter-toggle ${paymentActiveFilterCount > 0
              ? "has-active-filters"
              : ""
              }`}
            onClick={() =>
              setPaymentFiltersVisible(
                (previous) => !previous
              )
            }
          >
            <SlidersHorizontal size={16} />
            Apply Filter

            {paymentActiveFilterCount > 0 && (
              <span className="payment-filter-count">
                {paymentActiveFilterCount}
              </span>
            )}

            <ChevronDown
              size={15}
              className={
                paymentFiltersVisible
                  ? "payment-filter-chevron open"
                  : "payment-filter-chevron"
              }
            />
          </button>
        </div>

        {paymentFiltersVisible && (
          <div className="payment-filter-panel">
            <div className="payment-filter-field">
              <label>From Date</label>

              <input
                type="date"
                value={
                  paymentDraftFilters.fromDate
                }
                onChange={(event) =>
                  handlePaymentDraftFilterChange(
                    "fromDate",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="payment-filter-field">
              <label>To Date</label>

              <input
                type="date"
                value={
                  paymentDraftFilters.toDate
                }
                onChange={(event) =>
                  handlePaymentDraftFilterChange(
                    "toDate",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="payment-filter-field">
              <label>Party Name</label>

              <input
                type="text"
                value={
                  paymentDraftFilters.party
                }
                placeholder="Enter party name"
                onChange={(event) =>
                  handlePaymentDraftFilterChange(
                    "party",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="payment-filter-field">
              <label>Payment Type</label>

              <select
                value={
                  paymentDraftFilters.paymentType
                }
                onChange={(event) =>
                  handlePaymentDraftFilterChange(
                    "paymentType",
                    event.target.value
                  )
                }
              >
                <option value="">
                  All Types
                </option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
                <option value="Cheque">
                  Cheque
                </option>
              </select>
            </div>

            <div className="payment-filter-actions">
              <button
                type="button"
                className="payment-filter-clear"
                onClick={clearPaymentListFilters}
              >
                Clear
              </button>

              <button
                type="button"
                className="payment-filter-apply"
                onClick={applyPaymentListFilters}
              >
                <SlidersHorizontal size={15} />
                Apply Filter
              </button>
            </div>
          </div>
        )}

        <div className="payment-table-card">
          <div className="payment-table-scroll">
            <table className="payment-premium-table">
              <thead>
                <tr>
                  <th className="payment-sr-column">
                    SrNo
                  </th>
                  <th>Voucher No</th>
                  <th>Date</th>
                  <th>Party Name</th>
                  <th>Payment Type</th>
                  <th>Cheque No</th>
                  <th>Cheque Date</th>
                  <th className="payment-amount-column">
                    Debit Amount
                  </th>
                  <th className="payment-amount-column">
                    Credit Amount
                  </th>
                  <th>Narration</th>
                  <th className="payment-actions-column">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedPaymentList.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="11"
                      className="payment-empty-cell"
                    >
                      <strong>
                        No payment records found
                      </strong>

                      <span>
                        {paymentListSearch ||
                          paymentActiveFilterCount > 0
                          ? "Try changing or clearing the filters."
                          : "Click New Payment to create a payment."}
                      </span>
                    </td>
                  </tr>
                ) : (
                  paginatedPaymentList.map(
                    (payment, index) => {
                      const header =
                        payment.header ||
                        payment ||
                        {};

                      return (
                        <tr
                          key={
                            payment.id ||
                            header._id ||
                            `${header.vNo}-${index}`
                          }
                        >
                          <td className="payment-sr-column">
                            {paymentStartIndex +
                              index +
                              1}
                          </td>

                          <td className="payment-voucher-number">
                            {header.vNo || "-"}
                          </td>

                          <td>
                            {header.vDate || "-"}
                          </td>

                          <td className="payment-party-name">
                            {header.partyName ||
                              "-"}
                          </td>

                          <td>
                            {header.bankCash ||
                              "-"}
                          </td>

                          <td>
                            {header.chqNo ||
                              header.chequeNo ||
                              "-"}
                          </td>

                          <td>
                            {header.chqDate ||
                              header.chequeDate ||
                              "-"}
                          </td>

                          <td className="payment-amount-column">
                            ₹
                            {Number(
                              header.drAmt || 0
                            ).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td className="payment-amount-column">
                            ₹
                            {Number(
                              header.crAmt || 0
                            ).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td className="payment-narration">
                            {header.narr ||
                              header.narration ||
                              "-"}
                          </td>

                          <td className="payment-actions-column">
                            <div className="payment-row-actions">
                              <button
                                type="button"
                                className="payment-action-button view"
                                title="View Payment"
                                onClick={() => {
                                  setTransactionFormMode(
                                    (previous) => ({
                                      ...previous,
                                      Payment: true,
                                    })
                                  );

                                  editPayment(payment);
                                }}
                              >
                                <Eye size={16} />
                              </button>

                              <button
                                type="button"
                                className="payment-action-button edit"
                                title="Edit Payment"
                                onClick={() => {
                                  setTransactionFormMode(
                                    (previous) => ({
                                      ...previous,
                                      Payment: true,
                                    })
                                  );

                                  editPayment(payment);
                                }}
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                className="payment-action-button delete"
                                title="Delete Payment"
                                onClick={() =>
                                  deletePayment(
                                    payment.id
                                  )
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="payment-pagination-footer">
            <div className="payment-pagination-info">
              Showing{" "}
              <strong>
                {paymentShowingFrom}
              </strong>{" "}
              to{" "}
              <strong>
                {paymentShowingTo}
              </strong>{" "}
              of{" "}
              <strong>
                {filteredPaymentList.length}
              </strong>{" "}
              entries
            </div>

            <div className="payment-pagination-controls">
              <select
                value={paymentListRowsPerPage}
                onChange={(event) =>
                  setPaymentListRowsPerPage(
                    Number(event.target.value)
                  )
                }
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <div className="payment-page-buttons">
                <button
                  type="button"
                  disabled={paymentSafePage === 1}
                  onClick={() =>
                    setPaymentListCurrentPage(
                      (previous) =>
                        Math.max(
                          previous - 1,
                          1
                        )
                    )
                  }
                >
                  <ChevronLeft size={16} />
                </button>

                {getPaymentPaginationPages().map(
                  (pageNumber) => (
                    <button
                      type="button"
                      key={pageNumber}
                      className={
                        pageNumber ===
                          paymentSafePage
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setPaymentListCurrentPage(
                          pageNumber
                        )
                      }
                    >
                      {pageNumber}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={
                    paymentSafePage ===
                    paymentTotalPages
                  }
                  onClick={() =>
                    setPaymentListCurrentPage(
                      (previous) =>
                        Math.min(
                          previous + 1,
                          paymentTotalPages
                        )
                    )
                  }
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Payment Form
  const renderPaymentForm = () => (
    <div className="payment-section"><div className="form-section"><div className="section-header">Add Payment Information</div>
      <div className="payment-header-grid"><div className="labeled-input"><label>VDate</label><input type="date" name="vDate" value={paymentFormData.vDate} onChange={handlePaymentInput} /></div>
        <div className="labeled-input"><label>VNo</label><input
          type="text"
          inputMode="numeric"
          name="vNo"
          value={
            paymentFormData.vNo || ""
          }
          readOnly={
            autoVoucherNo === true
          }
          placeholder={
            autoVoucherNo === true
              ? "Auto generated"
              : "Enter payment number"
          }
          onChange={(event) => {
            if (autoVoucherNo === true) {
              return;
            }

            setPaymentFormData(
              (previous) => ({
                ...previous,
                vNo: cleanVoucherNumber(
                  event.target.value
                ),
              })
            );
          }}
        /></div>
        <div className="labeled-input payment-narration"><label>Narr</label><input name="narr" value={paymentFormData.narr} onChange={handlePaymentInput} /></div>
        <div className="labeled-input"><label>Party Name</label><div className="live-search-box"><input value={paymentFormData.partyName} onChange={(e) => { const value = e.target.value; setPaymentFormData(prev => ({ ...prev, partyName: value })); if (!value.trim()) { setPaymentPartySuggestions([]); return; } const matches = pendingPurchaseBills.filter((bill) => bill.party?.toLowerCase().includes(value.toLowerCase())).map((bill) => bill.party); setPaymentPartySuggestions([...new Set(matches)]); }} />
          {paymentPartySuggestions.length > 0 && (<div className="live-dropdown">{paymentPartySuggestions.map((party, idx) => (<div key={idx} className="live-item" onClick={() => selectPaymentParty(party)}>{party}</div>))}</div>)}</div></div>
        <div className="labeled-input"><label>Dr Amt</label><input name="drAmt" value={paymentFormData.drAmt} onChange={handlePaymentInput} /></div>
        <div className="labeled-input"><label>Chq No</label><input name="chqNo" value={paymentFormData.chqNo} onChange={handlePaymentInput} /></div>
        <div className="labeled-input"><label>Bank/Cash</label><select name="bankCash" value={paymentFormData.bankCash} onChange={handlePaymentInput}><option value="">Select</option><option value="Cash">Cash</option><option value="Bank">Bank</option></select></div>
        <div className="labeled-input"><label>Cr Amt</label><input name="crAmt" value={paymentFormData.crAmt} onChange={handlePaymentInput} /></div>
        <div className="labeled-input"><label>Chq Date</label><input type="date" name="chqDate" value={paymentFormData.chqDate} onChange={handlePaymentInput} /></div>
        <div className="labeled-input"><label>Adjusted Ac1</label><input name="adjustedAc1" value={paymentFormData.adjustedAc1} onChange={handlePaymentInput} /></div>
        <div className="labeled-input"><label>Dr/Cr</label><select name="drCr1" value={paymentFormData.drCr1} onChange={handlePaymentInput}><option>Dr</option><option>Cr</option></select></div>
        <div className="labeled-input"><label>Clearing Date</label><input type="date" name="clearingDate" value={paymentFormData.clearingDate} onChange={handlePaymentInput} /></div>
        <div className="labeled-input"><label>Adjusted Ac2</label><input name="adjustedAc2" value={paymentFormData.adjustedAc2} onChange={handlePaymentInput} /></div>
        <div className="labeled-input"><label>Dr/Cr</label><select name="drCr2" value={paymentFormData.drCr2} onChange={handlePaymentInput}><option>Dr</option><option>Cr</option></select></div></div></div>
      <div className="form-section"><div className="section-header">Bill Wise Adjustment</div><div className="table-responsive"><table className="erp-table payment-table"><thead><tr><th>SrNo</th><th>Trn</th><th>TRNSERIES</th><th>Voucher No</th><th>Amount</th><th>Adjusted Amt</th><th>Balance Amt</th><th>New Adjusted</th></tr></thead>
        <tbody>{paymentItems.map((item, index) => (<tr key={item.id}><td>{item.srNo}</td><td><input value={item.trn} onChange={(e) => updatePaymentItem(index, "trn", e.target.value)} /></td><td><input value={item.trnSeries} onChange={(e) => updatePaymentItem(index, "trnSeries", e.target.value)} /></td>
          <td><input value={item.voucherNo} onChange={(e) => updatePaymentItem(index, "voucherNo", e.target.value)} /></td><td><input value={item.amount} onChange={(e) => updatePaymentItem(index, "amount", e.target.value)} /></td>
          <td><input value={item.adjustedAmt} onChange={(e) => updatePaymentItem(index, "adjustedAmt", e.target.value)} /></td><td><input value={item.balanceAmt} readOnly /></td>
          <td><input value={item.newAdjusted} onChange={(e) => updatePaymentItem(index, "newAdjusted", e.target.value)} /></td></tr>))}</tbody></table></div><button className="btn-secondary" onClick={addPaymentRow} style={{ marginTop: "10px" }}>+ Add Row</button></div>
      <div className="payment-bottom-grid"><div className="payment-rtgs-card"><h4>For RTGS Only</h4><div className="payment-rtgs-grid"><div className="labeled-input"><label>Party Bank Name</label><input name="partyBankName" value={paymentFormData.partyBankName} onChange={handlePaymentInput} /></div><div className="labeled-input"><label>Bank Account No</label><input name="bankAccountNo" value={paymentFormData.bankAccountNo} onChange={handlePaymentInput} /></div></div></div>
        <div className="payment-summary-grid"><div className="summary-card"><label>Adjusted Amt</label><h3>{paymentSummary.adjustedAmt}</h3></div><div className="summary-card"><label>Balance Amt</label><h3>{paymentSummary.balanceAmt}</h3></div><div className="summary-card"><label>Total Dr Amt</label><h3>{paymentSummary.totalDrAmt}</h3></div><div className="summary-card"><label>Total Cr Amt</label><h3>{paymentSummary.totalCrAmt}</h3></div></div></div>
      <div className="form-actions"><button className="btn-primary" onClick={savePayment}>Save</button><button className="btn-secondary" onClick={() => openTransactionList("Payment")}>Cancel</button></div>
    </div>
  );

  // Cheque Bounce List
  // Cheque Bounce List
  const renderChequeBounceList = () => {
    const today = new Date()
      .toISOString()
      .split("T")[0];

    const todayChequeBounces =
      chequeBounceListRows.filter(
        (chequeBounce) =>
          String(
            chequeBounce.chqBounceDate || ""
          )
            .slice(0, 10) === today
      );

    const totalChequeAmount =
      filteredChequeBounceList.reduce(
        (total, chequeBounce) =>
          total +
          Number(
            chequeBounce.chequeAmt || 0
          ),
        0
      );

    const totalBounceCharges =
      filteredChequeBounceList.reduce(
        (total, chequeBounce) =>
          total +
          Number(
            chequeBounce.chqBounceCharges || 0
          ),
        0
      );

    const totalBounceAmount =
      filteredChequeBounceList.reduce(
        (total, chequeBounce) =>
          total +
          Number(
            chequeBounce.totalAmt ||
            (Number(
              chequeBounce.chequeAmt
            ) || 0) +
            (Number(
              chequeBounce.chqBounceCharges
            ) || 0)
          ),
        0
      );

    return (
      <div className="cheque-bounce-premium-list-page">
        {/* PAGE HEADER */}

        <div className="cheque-bounce-premium-heading">
          <div className="cheque-bounce-premium-title">
            <h2>Cheque Bounce List</h2>

            <p>
              Manage all cheque bounce transactions
            </p>
          </div>

          <div className="cheque-bounce-heading-actions">
            {chequeBouncePermission.add && (
            <button
              type="button"
              className="cheque-bounce-main-button cheque-bounce-add-button"
              onClick={() => {
                resetChequeBounceForm();

                setTransactionFormMode(
                  (previous) => ({
                    ...previous,
                    ["Cheque Bounce"]: true,
                  })
                );
              }}
            >
              <Plus size={15} />
              New Cheque Bounce
            </button>
            )}
            <button
              type="button"
              className="cheque-bounce-main-button cheque-bounce-excel-button"
            >
              <FileSpreadsheet size={15} />
              Export Excel
            </button>

            <button
              type="button"
              className="cheque-bounce-main-button cheque-bounce-pdf-button"
            >
              <FileText size={15} />
              Export PDF
            </button>

            <button
              type="button"
              className="cheque-bounce-main-button cheque-bounce-print-button"
              onClick={() => window.print()}
            >
              <Printer size={15} />
              Print List
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS */}

        <div className="cheque-bounce-summary-grid">
          <div className="cheque-bounce-summary-card">
            <div className="cheque-bounce-summary-icon blue">
              <CalendarDays size={19} />
            </div>

            <div className="cheque-bounce-summary-content">
              <span>Today's Bounces</span>
              <strong>
                {todayChequeBounces.length}
              </strong>
              <small>
                {new Date().toLocaleDateString(
                  "en-GB"
                )}
              </small>
            </div>

            <div className="cheque-bounce-card-decoration" />
          </div>

          <div className="cheque-bounce-summary-card">
            <div className="cheque-bounce-summary-icon blue">
              <ReceiptText size={19} />
            </div>

            <div className="cheque-bounce-summary-content">
              <span>Total Bounces</span>
              <strong>
                {chequeBounceListTotalRecords}
              </strong>
              <small>All Time</small>
            </div>

            <div className="cheque-bounce-card-decoration" />
          </div>

          <div className="cheque-bounce-summary-card">
            <div className="cheque-bounce-summary-icon orange">
              <Wallet size={19} />
            </div>

            <div className="cheque-bounce-summary-content">
              <span>Cheque Amount</span>
              <strong>
                ₹
                {totalChequeAmount.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>
              <small>Filtered Result</small>
            </div>

            <div className="cheque-bounce-card-decoration" />
          </div>

          <div className="cheque-bounce-summary-card">
            <div className="cheque-bounce-summary-icon red">
              <CircleX size={19} />
            </div>

            <div className="cheque-bounce-summary-content">
              <span>Bounce Charges</span>
              <strong>
                ₹
                {totalBounceCharges.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>
              <small>Filtered Result</small>
            </div>

            <div className="cheque-bounce-card-decoration" />
          </div>

          <div className="cheque-bounce-summary-card">
            <div className="cheque-bounce-summary-icon violet">
              <Wallet size={19} />
            </div>

            <div className="cheque-bounce-summary-content">
              <span>Total Bounce Value</span>
              <strong>
                ₹
                {totalBounceAmount.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>
              <small>Filtered Result</small>
            </div>

            <div className="cheque-bounce-card-decoration" />
          </div>
        </div>

        {/* SEARCH AND FILTER */}

        <div className="cheque-bounce-toolbar">
          <div className="cheque-bounce-search-box">
            <Search size={15} />

            <input
              type="text"
              value={chequeBounceListSearch}
              placeholder="Search cheque, party, bank, transaction..."
              onChange={(event) =>
                setChequeBounceListSearch(
                  event.target.value
                )
              }
            />

            {chequeBounceListSearch && (
              <button
                type="button"
                className="cheque-bounce-clear-search"
                onClick={() =>
                  setChequeBounceListSearch("")
                }
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            className={`cheque-bounce-filter-button ${chequeBounceActiveFilterCount > 0
              ? "has-active-filters"
              : ""
              }`}
            onClick={() =>
              setChequeBounceFiltersVisible(
                (previous) => !previous
              )
            }
          >
            <SlidersHorizontal size={15} />

            Apply Filter

            {chequeBounceActiveFilterCount >
              0 && (
                <span className="cheque-bounce-filter-count">
                  {chequeBounceActiveFilterCount}
                </span>
              )}

            <ChevronDown
              size={14}
              className={
                chequeBounceFiltersVisible
                  ? "cheque-bounce-filter-chevron open"
                  : "cheque-bounce-filter-chevron"
              }
            />
          </button>
        </div>

        {chequeBounceFiltersVisible && (
          <div className="cheque-bounce-filter-panel">
            <div className="cheque-bounce-filter-field">
              <label>From Date</label>

              <input
                type="date"
                value={
                  chequeBounceDraftFilters.fromDate
                }
                onChange={(event) =>
                  handleChequeBounceDraftFilterChange(
                    "fromDate",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="cheque-bounce-filter-field">
              <label>To Date</label>

              <input
                type="date"
                value={
                  chequeBounceDraftFilters.toDate
                }
                onChange={(event) =>
                  handleChequeBounceDraftFilterChange(
                    "toDate",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="cheque-bounce-filter-field">
              <label>Party Name</label>

              <input
                type="text"
                value={
                  chequeBounceDraftFilters.party
                }
                placeholder="Enter party name"
                onChange={(event) =>
                  handleChequeBounceDraftFilterChange(
                    "party",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="cheque-bounce-filter-field">
              <label>Bank Name</label>

              <input
                type="text"
                value={
                  chequeBounceDraftFilters.bank
                }
                placeholder="Enter bank name"
                onChange={(event) =>
                  handleChequeBounceDraftFilterChange(
                    "bank",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="cheque-bounce-filter-field">
              <label>Cheque No</label>

              <input
                type="text"
                value={
                  chequeBounceDraftFilters.chequeNo
                }
                placeholder="Enter cheque no"
                onChange={(event) =>
                  handleChequeBounceDraftFilterChange(
                    "chequeNo",
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyChequeBounceFilters();
                  }
                }}
              />
            </div>

            <div className="cheque-bounce-filter-actions">
              <button
                type="button"
                className="cheque-bounce-filter-clear-button"
                onClick={
                  clearChequeBounceFilters
                }
              >
                Clear
              </button>

              <button
                type="button"
                className="cheque-bounce-filter-apply-button"
                onClick={
                  applyChequeBounceFilters
                }
              >
                <SlidersHorizontal size={14} />
                Apply Filter
              </button>
            </div>
          </div>
        )}

        {/* TABLE */}

        <div className="cheque-bounce-table-card">
          <div className="cheque-bounce-table-scroll">
            <table className="cheque-bounce-table">
              <thead>
                <tr>
                  <th className="cheque-bounce-sr-column">
                    SrNo
                  </th>
                  <th>Trn Date</th>
                  <th>Trn Series</th>
                  <th>Trn No</th>
                  <th>Account Name Dr</th>
                  <th>Account Name Cr</th>
                  <th>Cheque No</th>
                  <th>Cheque Date</th>
                  <th className="cheque-bounce-amount-column">
                    Cheque Amount
                  </th>
                  <th className="cheque-bounce-amount-column">
                    Bounce Charges
                  </th>
                  <th className="cheque-bounce-amount-column">
                    Total Amount
                  </th>
                  <th>Rec Series</th>
                  <th>Rec No</th>
                  <th>Narration</th>
                  <th className="cheque-bounce-actions-column">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {chequeBounceListLoading ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="cheque-bounce-empty-row"
                    >
                      Loading Cheque Bounce records...
                    </td>
                  </tr>
                ) : paginatedChequeBounceList.length === 0 ? (
                  <tr>
                    <td
                      colSpan="15"
                      className="cheque-bounce-empty"
                    >
                      <strong>
                        No cheque bounce records found
                      </strong>

                      <span>
                        {chequeBounceListSearch ||
                          chequeBounceActiveFilterCount >
                          0
                          ? "Try changing or clearing the filters."
                          : "Click New Cheque Bounce to create a record."}
                      </span>
                    </td>
                  </tr>
                ) : (
                  paginatedChequeBounceList.map(
                    (chequeBounce, index) => {
                      const totalAmount =
                        Number(
                          chequeBounce.totalAmt ||
                          (Number(
                            chequeBounce.chequeAmt
                          ) || 0) +
                          (Number(
                            chequeBounce.chqBounceCharges
                          ) || 0)
                        );

                      return (
                        <tr
                          key={
                            chequeBounce.id ||
                            `${chequeBounce.trnSeries}-${chequeBounce.chqBounceNo}-${index}`
                          }
                        >
                          <td className="cheque-bounce-sr-column">
                            {chequeBounceListStartRecord +
                              index}
                          </td>

                          <td>
                            {chequeBounce.chqBounceDate ||
                              "-"}
                          </td>

                          <td className="cheque-bounce-series">
                            {chequeBounce.trnSeries ||
                              "CHB"}
                          </td>

                          <td className="cheque-bounce-number">
                            {chequeBounce.chqBounceNo ||
                              chequeBounce.trnNo ||
                              "-"}
                          </td>

                          <td className="cheque-bounce-party">
                            {chequeBounce.accountNameDr ||
                              chequeBounce.partyName ||
                              "-"}
                          </td>

                          <td className="cheque-bounce-bank">
                            {chequeBounce.accountNameCr ||
                              chequeBounce.bankName ||
                              "-"}
                          </td>

                          <td>
                            {chequeBounce.chequeNo ||
                              "-"}
                          </td>

                          <td>
                            {chequeBounce.chequeDate ||
                              "-"}
                          </td>

                          <td className="cheque-bounce-amount-column">
                            ₹
                            {Number(
                              chequeBounce.chequeAmt ||
                              0
                            ).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td className="cheque-bounce-amount-column">
                            ₹
                            {Number(
                              chequeBounce.chqBounceCharges ||
                              0
                            ).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td className="cheque-bounce-amount-column">
                            ₹
                            {totalAmount.toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td>
                            {chequeBounce.recSeries ||
                              "REC"}
                          </td>

                          <td>
                            {chequeBounce.recNo ||
                              chequeBounce.receiptNo ||
                              "-"}
                          </td>

                          <td className="cheque-bounce-narration">
                            {chequeBounce.narration ||
                              "-"}
                          </td>

                          <td className="cheque-bounce-actions-column">
                            <div className="cheque-bounce-row-actions">
                              <button
                                type="button"
                                className="cheque-bounce-action-button view"
                                title="View Cheque Bounce"
                                onClick={() =>
                                  editChequeBounce(
                                    chequeBounce
                                  )
                                }
                              >
                                <Eye size={16} />
                              </button>
{chequeBouncePermission.edit && (
                              <button
                                type="button"
                                className="cheque-bounce-action-button edit"
                                title="Edit Cheque Bounce"
                                onClick={() =>
                                  editChequeBounce(
                                    chequeBounce
                                  )
                                }
                              >
                                <Pencil size={16} />
                              </button>
)}
{chequeBouncePermission.delete && (
                              <button
                                type="button"
                                className="cheque-bounce-action-button delete"
                                title="Delete Cheque Bounce"
                                onClick={() =>
                                  deleteChequeBounce(
                                    chequeBounce.id
                                  )
                                }
                              >
                                <Trash2 size={16} />
                              </button>
)}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          <div className="cheque-bounce-pagination-footer">
            <div className="cheque-bounce-pagination-info">
              Showing{" "}
              <strong>
                {chequeBounceListStartRecord}
              </strong>{" "}
              to{" "}
              <strong>
                {chequeBounceListEndRecord}
              </strong>{" "}
              of{" "}
              <strong>
                {chequeBounceListTotalRecords}
              </strong>{" "}
              entries
            </div>

            <div className="cheque-bounce-pagination-controls">
              <select
                value={
                  chequeBounceListRowsPerPage
                }
                disabled={
                  chequeBounceListLoading
                }
                onChange={(event) => {
                  setChequeBounceListRowsPerPage(
                    Number(
                      event.target.value
                    )
                  );

                  setChequeBounceListCurrentPage(
                    1
                  );
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <div className="cheque-bounce-pagination">
                <button
                  type="button"
                  disabled={
                    chequeBounceListLoading ||
                    chequeBounceListCurrentPage >=
                    chequeBounceListTotalPages
                  }
                  onClick={() =>
                    setChequeBounceListCurrentPage(
                      (previous) =>
                        Math.min(
                          previous + 1,
                          chequeBounceListTotalPages
                        )
                    )
                  }
                >
                  <ChevronRight size={15} />
                </button>

                {getChequeBouncePaginationPages().map(
                  (pageNumber) => (
                    <button
                      type="button"
                      key={pageNumber}
                      disabled={
                        chequeBounceListLoading
                      }
                      className={
                        pageNumber ===
                          chequeBounceListCurrentPage
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setChequeBounceListCurrentPage(
                          pageNumber
                        )
                      }
                    >
                      {pageNumber}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={
                    chequeBounceListLoading ||
                    chequeBounceListCurrentPage <= 1
                  }
                  onClick={() =>
                    setChequeBounceListCurrentPage(
                      (previous) =>
                        Math.max(
                          previous - 1,
                          1
                        )
                    )
                  }
                >
                  <ChevronLeft size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  /* =========================================================
   CHEQUE BOUNCE LIST FILTER + PAGINATION
   ========================================================= */

  /* =========================================================
     CHEQUE BOUNCE LIST ROWS
  
     Search, filtering and pagination are now
     performed by the backend.
     ========================================================= */

  const chequeBounceListRows =
    Array.isArray(
      state.chequeBounces
    )
      ? state.chequeBounces
      : [];

  const filteredChequeBounceList =
    chequeBounceListRows;

  const paginatedChequeBounceList =
    chequeBounceListRows;

  const chequeBounceActiveFilterCount = [
    chequeBounceAppliedFilters.fromDate,
    chequeBounceAppliedFilters.toDate,
    chequeBounceAppliedFilters.party,
    chequeBounceAppliedFilters.bank,
    chequeBounceAppliedFilters.chequeNo,
  ].filter((value) =>
    String(value || "").trim()
  ).length;

  const chequeBounceTotalPages =
    chequeBounceListTotalPages;

  const chequeBounceSafePage =
    chequeBounceListCurrentPage;

  const chequeBounceShowingFrom =
    chequeBounceListStartRecord;

  const chequeBounceShowingTo =
    chequeBounceListEndRecord;

  const getChequeBouncePaginationPages =
    () => {
      const pages = [];

      const startPage =
        Math.max(
          1,
          chequeBounceListCurrentPage -
          2
        );

      const endPage =
        Math.min(
          chequeBounceListTotalPages,
          chequeBounceListCurrentPage +
          2
        );

      for (
        let pageNumber =
          startPage;

        pageNumber <=
        endPage;

        pageNumber += 1
      ) {
        pages.push(
          pageNumber
        );
      }

      return pages;
    };
  // Cheque Bounce Form
  // =========================================================
  // CHEQUE BOUNCE FORM — RECEIPT STYLE UI
  // =========================================================

  const renderChequeBounceForm = () => (
    <div className="cheque-bounce-billing-page">
      <div className="cheque-bounce-card">

        {/* ================= TOP TITLE BAR ================= */}

        <div className="cheque-bounce-topbar">
          <div className="cheque-bounce-title-area">
            <h2>
              {editChequeBounceId
                ? "Edit Cheque Bounce"
                : "Cheque Bounce Entry"}
            </h2>

            <span className="cheque-bounce-status-badge">
              {editChequeBounceId ? "Edit Entry" : "New Entry"}
            </span>
          </div>

          <div className="cheque-bounce-top-actions">
            <button
              type="button"
              className="cheque-bounce-save-btn"
              onClick={saveChequeBounce}
            >
              💾{" "}
              {editChequeBounceId
                ? "Update Cheque Bounce"
                : "Save Cheque Bounce"}
            </button>

            <button
              type="button"
              className="cheque-bounce-more-btn"
              aria-label="More options"
            >
              ⋮
            </button>

            <button
              type="button"
              className="cheque-bounce-close-btn"
              aria-label="Close cheque bounce form"
              onClick={() => {
                resetChequeBounceForm();
                openTransactionList("Cheque Bounce");
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ================= ENTRY SECTION ================= */}

        <section className="cheque-bounce-entry-section">
          <div className="cheque-bounce-section-heading">
            <span className="cheque-bounce-section-dot" />

            <h3>Cheque Bounce Details</h3>

            <div className="cheque-bounce-header-status">
              <span>
                Transaction Series:
                <strong>
                  {chequeBounceFormData.trnSeries || "-"}
                </strong>
              </span>

              <span>
                Bounce No:
                <strong>
                  {chequeBounceFormData.trnNo || "-"}
                </strong>
              </span>
            </div>
          </div>

          <div className="cheque-bounce-header-grid">

            {/* ================= FIRST ROW ================= */}

            <div className="cheque-bounce-field">
              <label>
                Chq Bounce Date <span>*</span>
              </label>

              <input
                type="date"
                name="chqBounceDate"
                value={chequeBounceFormData.chqBounceDate || ""}
                onChange={handleChequeBounceInput}
              />
            </div>

            <div className="cheque-bounce-field">
              <label>
                Trn Series <span>*</span>
              </label>

              <input
                type="text"
                name="trnSeries"
                value={chequeBounceFormData.trnSeries || ""}
                onChange={handleSeriesChange}
                placeholder="Enter series"
                autoComplete="off"
              />
            </div>

            <div className="cheque-bounce-field">
              <label>Chq Bounce No.</label>

           <input
  type="text"
  inputMode="numeric"
  name="chqBounceNo"
  value={
    chequeBounceFormData.chqBounceNo ||
    ""
  }
  readOnly={
    autoVoucherNo === true ||
    Boolean(editChequeBounceId)
  }
  placeholder={
    autoVoucherNo === true
      ? "Auto generated"
      : "Enter bounce number"
  }
  className={
    autoVoucherNo === true ||
    editChequeBounceId
      ? "cheque-bounce-readonly"
      : ""
  }
  onChange={(event) => {
    if (
      autoVoucherNo === true ||
      editChequeBounceId
    ) {
      return;
    }

    const enteredNumber =
      cleanVoucherNumber(
        event.target.value
      );

    setChequeBounceFormData(
      (previous) => ({
        ...previous,

        chqBounceNo:
          enteredNumber,

        trnNo:
          enteredNumber,

        isAutoGenerated: false,
      })
    );
  }}
/>
            </div>

            <div className="cheque-bounce-field">
              <label>
                Party Name <span>*</span>
              </label>

              <select
                name="partyName"
                value={chequeBounceFormData.partyName || ""}
                onChange={handleChequeBounceInput}
              >
                <option value="">Select Party</option>

                {chequeBounceParties.map((party, index) => (
                  <option
                    key={`${party}-${index}`}
                    value={party}
                  >
                    {party}
                  </option>
                ))}
              </select>
            </div>

            <div className="cheque-bounce-field">
              <label>
                Cheque No. <span>*</span>
              </label>

              <input
                type="text"
                name="chequeNo"
                value={chequeBounceFormData.chequeNo || ""}
                onChange={handleChequeBounceInput}
                placeholder="Enter cheque no"
                autoComplete="off"
              />
            </div>

            <div className="cheque-bounce-field">
              <label>Cheque Date</label>

              <input
                type="date"
                name="chequeDate"
                value={chequeBounceFormData.chequeDate || ""}
                readOnly
                className="cheque-bounce-readonly"
              />
            </div>

            {/* ================= SECOND ROW ================= */}

            <div className="cheque-bounce-field">
              <label>Cheque Amount</label>

              <input
                type="number"
                name="chequeAmt"
                value={chequeBounceFormData.chequeAmt || ""}
                readOnly
                step="0.01"
                className="cheque-bounce-readonly cheque-bounce-number"
              />
            </div>

            <div className="cheque-bounce-field">
              <label>
                Bounce Charges <span>*</span>
              </label>

              <input
                type="number"
                name="chqBounceCharges"
                value={
                  chequeBounceFormData.chqBounceCharges ?? "0.00"
                }
                onChange={handleChequeBounceInput}
                min="0"
                step="0.01"
                className="cheque-bounce-number"
              />
            </div>

            <div className="cheque-bounce-field">
              <label>Total Amount</label>

              <input
                type="text"
                name="totalAmt"
                value={chequeBounceFormData.totalAmt || ""}
                readOnly
                className="cheque-bounce-total-input"
              />
            </div>

            <div className="cheque-bounce-field">
              <label>Clearing Date</label>

              <input
                type="date"
                name="clearingDate"
                value={chequeBounceFormData.clearingDate || ""}
                readOnly
                className="cheque-bounce-readonly"
              />
            </div>

            <div className="cheque-bounce-field">
              <label>Receipt No.</label>

              <input
                type="text"
                name="receiptNo"
                value={chequeBounceFormData.receiptNo || ""}
                readOnly
                className="cheque-bounce-readonly"
              />
            </div>

            <div className="cheque-bounce-field">
              <label>
                Bank Name <span>*</span>
              </label>

              <select
                name="bankName"
                value={chequeBounceFormData.bankName || ""}
                onChange={handleChequeBounceInput}
              >
                <option value="">Select Bank</option>

                {bankCashAccounts.map((account, index) => {
                  const bankName =
                    getBankAccountName(account);

                  if (!bankName) return null;

                  return (
                    <option
                      key={
                        account.id ||
                        account._id ||
                        account.accountCode ||
                        `${bankName}-${index}`
                      }
                      value={bankName}
                    >
                      {bankName}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </section>

        {/* ================= SUMMARY SECTION ================= */}

        <section className="cheque-bounce-summary-section">
          <div className="cheque-bounce-summary-heading">
            <div className="cheque-bounce-summary-title">
              <span className="cheque-bounce-section-dot" />
              <h3>Cheque Bounce Summary</h3>
            </div>

            <span className="cheque-bounce-summary-party">
              Party:
              <strong>
                {chequeBounceFormData.partyName || "-"}
              </strong>
            </span>
          </div>

          <div className="cheque-bounce-summary-grid">
            <div className="cheque-bounce-summary-card">
              <span>Cheque Amount</span>

              <strong>
                ₹
                {Number(
                  chequeBounceFormData.chequeAmt || 0
                ).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </strong>
            </div>

            <div className="cheque-bounce-summary-card warning">
              <span>Bounce Charges</span>

              <strong>
                ₹
                {Number(
                  chequeBounceFormData.chqBounceCharges || 0
                ).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </strong>
            </div>

            <div className="cheque-bounce-summary-card total">
              <span>Total Amount</span>

              <strong>
                ₹
                {Number(
                  chequeBounceFormData.totalAmt || 0
                ).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </strong>
            </div>

            <div className="cheque-bounce-summary-card">
              <span>Receipt No.</span>

              <strong>
                {chequeBounceFormData.receiptNo || "-"}
              </strong>
            </div>

            <div className="cheque-bounce-summary-card">
              <span>Clearing Date</span>

              <strong>
                {chequeBounceFormData.clearingDate || "-"}
              </strong>
            </div>

            <div className="cheque-bounce-summary-card">
              <span>Bank</span>

              <strong>
                {chequeBounceFormData.bankName || "-"}
              </strong>
            </div>
          </div>

          <div className="cheque-bounce-narration-row">
            <input
              type="text"
              name="narration"
              value={chequeBounceFormData.narration || ""}
              onChange={handleChequeBounceInput}
              placeholder="Enter narration details..."
            />
          </div>
        </section>
      </div>
    </div>
  );

  // PDC Docket Print
  const printPDCDocket = (docket) => {
    const h = docket.header || docket || {};
    const rows = docket.cheques || docket.details || [];

    const houseBankName =
      h.bankName || h.houseBankName || h.houseBank || "-";

    const houseBankAccountNo =
      h.houseBankAccountNo || h.bankAccountNo || h.accountNumber || h.bankCode || "-";

    const houseBankIFSC =
      h.houseBankIFSC || h.ifscCode || h.ifsc || "-";

    const houseBankBranch =
      h.houseBankBranch || h.branchName || h.branch || "-";

    const printWindow = window.open("", "_blank", "width=900,height=650");

    printWindow.document.write(`
      <html>
        <head>
          <title>PDC Docket Print</title>
          <style>
            body {
              font-family: "Courier New", monospace;
              font-size: 13px;
              padding: 20px;
              color: #000;
            }

            .print-title {
              text-align: center;
              font-weight: bold;
              margin-bottom: 10px;
            }

            .top-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
            }

            .info-line {
              margin: 2px 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }

            th, td {
              border: 1px solid #555;
              padding: 4px 6px;
              font-size: 12px;
              text-align: left;
            }

            th {
              font-weight: bold;
            }

            .amount {
              text-align: right;
            }

            .total-row td {
              font-weight: bold;
            }

            @media print {
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-title">101 - RATNAHIRA ENTERPRISES</div>

          <div class="top-section">
            <div>
              <div class="info-line">DOCKET NO : ${h.pdcNo || h.docVNo || "-"}</div>
              <div class="info-line">TOTAL CHEQUES : ${h.totalCheques || 0}</div>
              <div class="info-line">DOCKET VALUE : ${parseFloat(h.totalAmount || 0).toFixed(2)}</div>
              <div class="info-line">BANK NAME : ${houseBankName}</div>
              <div class="info-line">BANK A/C NO : ${houseBankAccountNo}</div>
              <div class="info-line">IFSC CODE : ${houseBankIFSC}</div>
              <div class="info-line">BRANCH : ${houseBankBranch}</div>
            </div>

            <div>
              <div class="info-line">Page No. :</div>
              <div class="info-line">Date : ${h.depositDate || "-"}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Cheque No</th>
                <th>ChqDate</th>
                <th>Bank Name</th>
                <th>TotAmt</th>
                <th>Party Name</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length === 0
        ? `<tr><td colspan="5" style="text-align:center;">No Cheque Details</td></tr>`
        : rows.map(row => `
                      <tr>
                        <td>${row.chequeNo || row.chqNo || "-"}</td>
                        <td>${row.chequeDate || row.chqDate || "-"}</td>
                        <td>${row.bankName || "-"}</td>
                        <td class="amount">${parseFloat(row.amount || row.chequeAmount || 0).toFixed(2)}</td>
                        <td>${row.partyName || "-"}</td>
                      </tr>
                    `).join("")
      }

              <tr class="total-row">
                <td colspan="3" style="text-align:center;">Total</td>
                <td class="amount">${parseFloat(h.totalAmount || 0).toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <br />
          <button onclick="window.print()">Print</button>
        </body>
      </html>
    `);

    printWindow.document.close();
  };
  /* =========================================================
   PDC DOCKET FILTERING AND PAGINATION
   ========================================================= */
  /* =========================================================
     PDC DOCKET LIST ROWS
  
     Search, filters and pagination are now
     performed by the backend.
     ========================================================= */

  const pdcDocketListRows =
    Array.isArray(
      state.pdcDockets
    )
      ? state.pdcDockets
      : [];

  /*
   * The backend has already filtered the records
   * and returned only the requested page.
   */
  const filteredPDCDocketList =
    pdcDocketListRows;

  const paginatedPDCDocketList =
    pdcDocketListRows;

  const pdcDocketActiveFilterCount = [
    pdcDocketAppliedFilters.fromDepositDate,
    pdcDocketAppliedFilters.toDepositDate,
    pdcDocketAppliedFilters.houseBank,
    pdcDocketAppliedFilters.pdcType,
    pdcDocketAppliedFilters.docketNo,
  ].filter((value) =>
    String(value || "").trim()
  ).length;

  /*
   * Keep these aliases because the current JSX
   * already uses these variable names.
   */
  const pdcDocketTotalPages =
    pdcDocketListTotalPages;

  const pdcDocketSafePage =
    pdcDocketListCurrentPage;

  const pdcDocketShowingFrom =
    pdcDocketListStartRecord;

  const pdcDocketShowingTo =
    pdcDocketListEndRecord;

  const getPDCDocketPaginationPages =
    () => {
      const pages = [];

      const startPage =
        Math.max(
          1,
          pdcDocketListCurrentPage -
          2
        );

      const endPage =
        Math.min(
          pdcDocketListTotalPages,
          pdcDocketListCurrentPage +
          2
        );

      for (
        let pageNumber =
          startPage;

        pageNumber <=
        endPage;

        pageNumber += 1
      ) {
        pages.push(
          pageNumber
        );
      }

      return pages;
    };

  // PDC Docket List
  const renderPDCDocketList = () => {
    const today = new Date()
      .toISOString()
      .split("T")[0];

    const todayDocketCount =
      pdcDocketListRows.filter((docket) => {
        const header =
          docket.header || docket || {};

        return (
          String(header.depositDate || "")
            .slice(0, 10) === today
        );
      }).length;

    const totalDocketAmount =
      filteredPDCDocketList.reduce(
        (total, docket) => {
          const header =
            docket.header || docket || {};

          return (
            total +
            (Number(header.totalAmount) || 0)
          );
        },
        0
      );

    const totalChequeCount =
      filteredPDCDocketList.reduce(
        (total, docket) => {
          const header =
            docket.header || docket || {};

          return (
            total +
            (Number(header.totalCheques) || 0)
          );
        },
        0
      );

    const clearedDocketCount =
      filteredPDCDocketList.filter(
        (docket) => {
          const header =
            docket.header || docket || {};

          return Boolean(
            String(
              header.clearingDate || ""
            ).trim()
          );
        }
      ).length;

    return (
      <div className="pdc-docket-premium-list-page">
        <div className="pdc-docket-premium-heading">
          <div className="pdc-docket-premium-title">
            <h2>PDC Docket List</h2>

            <p>
              Manage post-dated cheque deposit
              dockets
            </p>
          </div>

          <div className="pdc-docket-heading-actions">
              {pdcDocketPermission.add && (
            <button
              type="button"
              className="pdc-docket-main-button pdc-docket-add-button"
              onClick={() => {
                resetPDCDocketForm();
                openTransactionEntry("PDC Docket");
              }}
            >
              <Plus size={16} />
              New PDC Docket
            </button>
              )}
            <button
              type="button"
              className="pdc-docket-main-button pdc-docket-excel-button"
            >
              <FileSpreadsheet size={16} />
              Export Excel
            </button>

            <button
              type="button"
              className="pdc-docket-main-button pdc-docket-pdf-button"
            >
              <FileText size={16} />
              Export PDF
            </button>

            <button
              type="button"
              className="pdc-docket-main-button pdc-docket-print-list-button"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              Print List
            </button>
          </div>
        </div>

        <div className="pdc-docket-summary-grid">
          <div className="pdc-docket-summary-card">
            <div className="pdc-docket-summary-icon blue">
              <CalendarDays size={20} />
            </div>

            <div className="pdc-docket-summary-content">
              <span>Today's Dockets</span>
              <strong>{todayDocketCount}</strong>
              <small>
                {new Date().toLocaleDateString(
                  "en-GB"
                )}
              </small>
            </div>
          </div>

          <div className="pdc-docket-summary-card">
            <div className="pdc-docket-summary-icon violet">
              <ReceiptText size={20} />
            </div>

            <div className="pdc-docket-summary-content">
              <span>Total Dockets</span>
              <strong>
                {pdcDocketListRows.length}
              </strong>
              <small>All records</small>
            </div>
          </div>

          <div className="pdc-docket-summary-card">
            <div className="pdc-docket-summary-icon green">
              <Wallet size={20} />
            </div>

            <div className="pdc-docket-summary-content">
              <span>Total Amount</span>
              <strong>
                ₹
                {totalDocketAmount.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>
              <small>Filtered records</small>
            </div>
          </div>

          <div className="pdc-docket-summary-card">
            <div className="pdc-docket-summary-icon orange">
              <ReceiptText size={20} />
            </div>

            <div className="pdc-docket-summary-content">
              <span>Total Cheques</span>
              <strong>{totalChequeCount}</strong>
              <small>Filtered records</small>
            </div>
          </div>

          <div className="pdc-docket-summary-card">
            <div className="pdc-docket-summary-icon cyan">
              <CircleCheck size={20} />
            </div>

            <div className="pdc-docket-summary-content">
              <span>Cleared Dockets</span>
              <strong>{clearedDocketCount}</strong>
              <small>With clearing date</small>
            </div>
          </div>
        </div>

        <div className="pdc-docket-list-toolbar">
          <div className="pdc-docket-search-box">
            <Search size={16} />

            <input
              type="text"
              value={
                pdcDocketListSearch
              }
              placeholder="Search docket, bank, series or narration."
              onChange={(event) => {
                setPDCDocketListSearch(
                  event.target.value
                );

                setPDCDocketListCurrentPage(
                  1
                );
              }}
            />

            {pdcDocketListSearch && (
              <button
                type="button"
                className="pdc-docket-clear-search"
                onClick={() =>
                  setPDCDocketListSearch("")
                }
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            className={`pdc-docket-filter-toggle ${pdcDocketActiveFilterCount > 0
              ? "has-active-filters"
              : ""
              }`}
            onClick={() =>
              setPDCDocketFiltersVisible(
                (previous) => !previous
              )
            }
          >
            <SlidersHorizontal size={16} />
            Apply Filter

            {pdcDocketActiveFilterCount > 0 && (
              <span className="pdc-docket-filter-count">
                {pdcDocketActiveFilterCount}
              </span>
            )}

            <ChevronDown
              size={15}
              className={
                pdcDocketFiltersVisible
                  ? "pdc-docket-filter-chevron open"
                  : "pdc-docket-filter-chevron"
              }
            />
          </button>
        </div>

        {pdcDocketFiltersVisible && (
          <div className="pdc-docket-filter-panel">
            <div className="pdc-docket-filter-field">
              <label>From Deposit Date</label>

              <input
                type="date"
                value={
                  pdcDocketDraftFilters.fromDepositDate
                }
                onChange={(event) =>
                  handlePDCDocketDraftFilterChange(
                    "fromDepositDate",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="pdc-docket-filter-field">
              <label>To Deposit Date</label>

              <input
                type="date"
                value={
                  pdcDocketDraftFilters.toDepositDate
                }
                onChange={(event) =>
                  handlePDCDocketDraftFilterChange(
                    "toDepositDate",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="pdc-docket-filter-field">
              <label>House Bank</label>

              <input
                type="text"
                value={
                  pdcDocketDraftFilters.houseBank
                }
                placeholder="Enter bank name"
                onChange={(event) =>
                  handlePDCDocketDraftFilterChange(
                    "houseBank",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="pdc-docket-filter-field">
              <label>PDC Type</label>

              <select
                value={
                  pdcDocketDraftFilters.pdcType
                }
                onChange={(event) =>
                  handlePDCDocketDraftFilterChange(
                    "pdcType",
                    event.target.value
                  )
                }
              >
                <option value="">All Types</option>
                <option value="Clearing">
                  Clearing
                </option>
                <option value="Collection">
                  Collection
                </option>
                <option value="Discounting">
                  Discounting
                </option>
              </select>
            </div>

            <div className="pdc-docket-filter-field">
              <label>PDC No</label>

              <input
                type="text"
                value={
                  pdcDocketDraftFilters.docketNo
                }
                placeholder="Enter PDC no"
                onChange={(event) =>
                  handlePDCDocketDraftFilterChange(
                    "docketNo",
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyPDCDocketListFilters();
                  }
                }}
              />
            </div>

            <div className="pdc-docket-filter-actions">
              <button
                type="button"
                className="pdc-docket-filter-clear"
                onClick={
                  clearPDCDocketListFilters
                }
              >
                Clear
              </button>

              <button
                type="button"
                className="pdc-docket-filter-apply"
                onClick={
                  applyPDCDocketListFilters
                }
              >
                <SlidersHorizontal size={15} />
                Apply Filter
              </button>
            </div>
          </div>
        )}

        <div className="pdc-docket-table-card">
          <div className="pdc-docket-table-scroll">
            <table className="pdc-docket-premium-table">
              <thead>
                <tr>
                  <th className="pdc-docket-sr-column">
                    SrNo
                  </th>
                  <th>Deposit Date</th>
                  <th>PDC Series</th>
                  <th>PDC No</th>
                  <th>House Bank</th>
                  <th>From Cheque Date</th>
                  <th>To Date</th>
                  <th>PDC Type</th>
                  <th className="pdc-docket-amount-column">
                    Total Amount
                  </th>
                  <th>Total Cheques</th>
                  <th>Clearing Date</th>
                  <th>Narration</th>
                  <th>Add User</th>
                  <th>Add Date</th>
                  <th>Edit User</th>
                  <th>Edit Date</th>
                  <th className="pdc-docket-actions-column">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {pdcDocketListLoading ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="pdc-docket-empty-row"
                    >
                      Loading PDC Docket records...
                    </td>
                  </tr>
                ) : paginatedPDCDocketList.length === 0 ? (
                  <tr>
                    <td
                      colSpan="17"
                      className="pdc-docket-empty-cell"
                    >
                      <strong>
                        No PDC docket records found
                      </strong>

                      <span>
                        {pdcDocketListSearch ||
                          pdcDocketActiveFilterCount > 0
                          ? "Try changing or clearing the filters."
                          : "Click New PDC Docket to create a docket."}
                      </span>
                    </td>
                  </tr>
                ) : (
                  paginatedPDCDocketList.map(
                    (docket, index) => {
                      const header =
                        docket.header ||
                        docket ||
                        {};

                      return (
                        <tr
                          key={
                            docket._id ||
                            docket.id ||
                            `${header.docSeries}-${header.pdcNo}-${index}`
                          }
                        >
                          <td className="pdc-docket-sr-column">
                            {pdcDocketListStartRecord +
                              index}
                          </td>

                          <td>
                            {header.depositDate ||
                              "-"}
                          </td>

                          <td className="pdc-docket-series">
                            {header.docSeries ||
                              header.pdcSeries ||
                              header.series ||
                              "-"}
                          </td>

                          <td className="pdc-docket-number">
                            {header.pdcNo ||
                              header.docVNo ||
                              "-"}
                          </td>

                          <td className="pdc-docket-bank">
                            {header.houseBank ||
                              header.bankName ||
                              header.houseBankName ||
                              "-"}
                          </td>

                          <td>
                            {header.fromDate || "-"}
                          </td>

                          <td>
                            {header.toDate || "-"}
                          </td>

                          <td>
                            {header.clearingType ||
                              header.pdcType ||
                              "-"}
                          </td>

                          <td className="pdc-docket-amount-column">
                            ₹
                            {Number(
                              header.totalAmount || 0
                            ).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td className="pdc-docket-cheque-count">
                            {header.totalCheques || 0}
                          </td>

                          <td>
                            {header.clearingDate ||
                              "-"}
                          </td>

                          <td className="pdc-docket-narration">
                            {header.narration || "-"}
                          </td>

                          <td>{header.addUser || "-"}</td>
                          <td>{header.addDate || "-"}</td>
                          <td>{header.editUser || "-"}</td>
                          <td>{header.editDate || "-"}</td>

                          <td className="pdc-docket-actions-column">
                            <div className="pdc-docket-row-actions">
                              <button
                                type="button"
                                className="pdc-docket-action-button view"
                                title="View PDC Docket"
                                onClick={() => {
                                  setTransactionFormMode(
                                    (previous) => ({
                                      ...previous,
                                      ["PDC Docket"]: true,
                                    })
                                  );

                                  editPDCDocket(docket);
                                }}
                              >
                                <Eye size={16} />
                              </button>
{pdcDocketPermission.edit && ( 
                              <button
                                type="button"
                                className="pdc-docket-action-button edit"
                                title="Edit PDC Docket"
                                onClick={() => {
                                  setTransactionFormMode(
                                    (previous) => ({
                                      ...previous,
                                      ["PDC Docket"]: true,
                                    })
                                  );

                                  editPDCDocket(docket);
                                }}
                              >
                                <Pencil size={16} />
                              </button>
)}

                              <button
                                type="button"
                                className="pdc-docket-action-button print"
                                title="Print PDC Docket"
                                onClick={() =>
                                  printPDCDocket(docket)
                                }
                              >
                                <Printer size={16} />
                              </button>
{pdcDocketPermission.delete && (
                              <button
                                type="button"
                                className="pdc-docket-action-button delete"
                                title="Delete PDC Docket"
                                disabled={
                                  pdcDocketListLoading
                                }
                                onClick={() =>
                                  deletePDCDocket(
                                    docket._id ||
                                    docket.id
                                  )
                                }
                              >
                                <Trash2 size={16} />
                              </button>
)}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="pdc-docket-pagination-footer">
            <div className="pdc-docket-pagination-info">
              Showing{" "}
              <strong>
                {pdcDocketListStartRecord}
              </strong>{" "}
              to{" "}
              <strong>
                {pdcDocketListEndRecord}
              </strong>{" "}
              of{" "}
              <strong>
                {pdcDocketListTotalRecords}
              </strong>{" "}
              entries
            </div>

            <div className="pdc-docket-pagination-controls">
              <select
                value={
                  pdcDocketListRowsPerPage
                }
                disabled={
                  pdcDocketListLoading
                }
                onChange={(event) => {
                  setPDCDocketListRowsPerPage(
                    Number(
                      event.target.value
                    )
                  );

                  setPDCDocketListCurrentPage(
                    1
                  );
                }}
              >
                <option value={10}>
                  10
                </option>

                <option value={20}>
                  20
                </option>

                <option value={50}>
                  50
                </option>

                <option value={100}>
                  100
                </option>
              </select>

              <div className="pdc-docket-page-buttons">
                <button
                  type="button"
                  disabled={
                    pdcDocketListLoading ||
                    pdcDocketListCurrentPage <=
                    1
                  }
                  onClick={() =>
                    setPDCDocketListCurrentPage(
                      (previousPage) =>
                        Math.max(
                          previousPage - 1,
                          1
                        )
                    )
                  }
                >
                  <ChevronLeft size={16} />
                </button>

                {getPDCDocketPaginationPages().map(
                  (pageNumber) => (
                    <button
                      type="button"
                      key={pageNumber}
                      disabled={
                        pdcDocketListLoading
                      }
                      className={
                        pageNumber ===
                          pdcDocketListCurrentPage
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setPDCDocketListCurrentPage(
                          pageNumber
                        )
                      }
                    >
                      {pageNumber}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={
                    pdcDocketListLoading ||
                    pdcDocketListCurrentPage >=
                    pdcDocketListTotalPages
                  }
                  onClick={() =>
                    setPDCDocketListCurrentPage(
                      (previousPage) =>
                        Math.min(
                          previousPage + 1,
                          pdcDocketListTotalPages
                        )
                    )
                  }
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  // =========================================================
  // PDC DOCKET FORM — RECEIPT STYLE UI
  // =========================================================

  const renderPDCDocketForm = () => (
    <div className="pdc-billing-page">
      <div className="pdc-billing-card">

        {/* ================= TOP HEADER ================= */}

        <div className="pdc-billing-topbar">
          <div className="pdc-billing-title-wrap">
            <h2>
              {editPDCDocketId
                ? "Edit PDC Docket"
                : "PDC Docket Entry"}
            </h2>

            <span className="pdc-billing-badge">
              {editPDCDocketId ? "Edit Docket" : "New Docket"}
            </span>
          </div>

          <div className="pdc-billing-header-actions">
            <button
              type="button"
              className="pdc-save-header-btn"
              onClick={savePDCDocket}
            >
              💾 {editPDCDocketId ? "Update PDC" : "Save PDC"}
            </button>

            <button
              type="button"
              className="pdc-more-btn"
              aria-label="More options"
            >
              ⋮
            </button>

            <button
              type="button"
              className="pdc-close-header-btn"
              aria-label="Close PDC Docket"
              onClick={() => {
                resetPDCDocketForm();
                openTransactionList("PDC Docket");
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ================= PDC HEADER DETAILS ================= */}

        <section className="pdc-entry-section">
          <div className="pdc-section-heading">
            <div className="pdc-heading-left">
              <span className="pdc-section-dot" />
              <h3>PDC Docket Details</h3>
            </div>

            <div className="pdc-heading-status">
              <span>
                Series:
                <strong>
                  {pdcDocketFormData.docSeries || "-"}
                </strong>
              </span>

              <span>
                Docket No:
                <strong>
                  {pdcDocketFormData.docVNo || "-"}
                </strong>
              </span>
            </div>
          </div>

          <div className="pdc-header-two-rows">

            {/* ================= FIRST ROW ================= */}

            <div className="pdc-field">
              <label>
                Deposit Date <span>*</span>
              </label>

              <input
                type="date"
                name="depositDate"
                value={pdcDocketFormData.depositDate || ""}
                onChange={handlePDCDocketInput}
              />
            </div>

            <div className="pdc-field">
              <label>
                Doc Series <span>*</span>
              </label>

              <input
                type="text"
                name="docSeries"
                value={pdcDocketFormData.docSeries || ""}
                onChange={handlePDCDocketInput}
                placeholder="Enter series"
              />
            </div>

            <div className="pdc-field">
              <label>
                Doc VNo <span>*</span>
              </label>

             <input
  type="text"
  inputMode="numeric"
  name="docVNo"
  value={
    pdcDocketFormData.docVNo || ""
  }
  readOnly={
    autoVoucherNo === true ||
    Boolean(editPDCDocketId)
  }
  placeholder={
    autoVoucherNo === true
      ? "Auto generated"
      : "Enter docket no"
  }
  onChange={(event) => {
    if (
      autoVoucherNo === true ||
      editPDCDocketId
    ) {
      return;
    }

    setPDCDocketFormData(
      (previous) => ({
        ...previous,

        docVNo:
          cleanVoucherNumber(
            event.target.value
          ),
      })
    );
  }}
/>
            </div>

            <div className="pdc-field">
              <label>
                House Bank <span>*</span>
              </label>

              <select
                name="houseBank"
                value={
                  pdcDocketFormData.houseBank ||
                  ""
                }
                onChange={
                  handlePDCDocketInput
                }
              >
                <option value="">
                  Select Bank
                </option>

                {(bankCashAccounts || []).map(
                  (account, index) => {
                    const bankName =
                      getBankAccountName(
                        account
                      );

                    if (!bankName) {
                      return null;
                    }

                    return (
                      <option
                        key={
                          account._id ||
                          account.id ||
                          `${bankName}-${index}`
                        }
                        value={bankName}
                      >
                        {bankName}
                      </option>
                    );
                  }
                )}
              </select>
            </div>

            <div className="pdc-field">
              <label>
                From Date <span>*</span>
              </label>

              <input
                type="date"
                name="fromDate"
                value={pdcDocketFormData.fromDate || ""}
                onChange={handlePDCDocketInput}
              />
            </div>

            {/* ================= SECOND ROW ================= */}

            <div className="pdc-field">
              <label>
                To Date <span>*</span>
              </label>

              <input
                type="date"
                name="toDate"
                value={pdcDocketFormData.toDate || ""}
                onChange={handlePDCDocketInput}
              />
            </div>

            <div className="pdc-field">
              <label>
                Clearing Type <span>*</span>
              </label>

              <select
                name="clearingType"
                value={pdcDocketFormData.clearingType || ""}
                onChange={handlePDCDocketInput}
              >
                <option value="SAME BANK">Same Bank</option>
                <option value="LOCAL BANK">Local Bank</option>
                <option value="OUTSIDE BANK">Outside Bank</option>
              </select>
            </div>

            <div className="pdc-field">
              <label>Clearing Date</label>

              <input
                type="date"
                name="clearingDate"
                value={pdcDocketFormData.clearingDate || ""}
                onChange={handlePDCDocketInput}
              />
            </div>

            <div className="pdc-field pdc-narration-inline">
              <label>Narration</label>

              <input
                type="text"
                name="narration"
                value={pdcDocketFormData.narration || ""}
                onChange={handlePDCDocketInput}
                placeholder="Enter narration"
              />
            </div>
          </div>
        </section>

        {/* ================= CHEQUE GRID ================= */}

        <section className="pdc-cheque-section">
          <div className="pdc-grid-heading">
            <div className="pdc-heading-left">
              <span className="pdc-section-dot" />
              <h3>PDC Cheque Details</h3>
            </div>

            <div className="pdc-grid-count">
              <span>
                Total Cheques:
                <strong>
                  {pdcDocketFormData.totalCheques || 0}
                </strong>
              </span>

              <span>
                Total Amount:
                <strong>
                  ₹
                  {Number(
                    pdcDocketFormData.totalAmount || 0
                  ).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </strong>
              </span>
            </div>
          </div>

          <div className="pdc-grid-scroll">
            <table className="pdc-entry-table">
              <thead>
                <tr>
                  <th
                    style={{
                      width: "48px",
                      textAlign: "center"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        pdcDocketItems.length > 0 &&
                        pdcDocketItems.every(
                          (item) =>
                            item.selected === true
                        )
                      }
                      onChange={
                        handlePDCDocketSelectAll
                      }
                      title="Select all cheques"
                    />
                  </th>

                  <th>Sr</th>
                  <th>Cheque No</th>
                  <th>Cheque Date</th>
                  <th>Amount</th>
                  <th>Clearing Date</th>
                  <th>Rec Series</th>
                  <th>Rec No</th>
                  <th>Rec Trn Bank</th>
                  <th>Branch</th>
                  <th>Party Code</th>
                  <th>Party Name</th>
                </tr>
              </thead>

              <tbody>
                {pdcDocketItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan="12"
                      className="pdc-empty-row"
                    >
                      Select House Bank, Clearing Type,
                      From Date and To Date to load cheques
                    </td>
                  </tr>
                ) : (
                  pdcDocketItems.map(
                    (item, index) => (
                      <tr
                        key={
                          item.id ||
                          item._id ||
                          `${item.chequeNo}-${item.receiptNo}-${index}`
                        }
                        onClick={() =>
                          handlePDCDocketChequeSelect(
                            index
                          )
                        }
                        style={{
                          cursor: "pointer",

                          background:
                            item.selected === true
                              ? "#e8f2ff"
                              : ""
                        }}
                      >
                        <td
                          style={{
                            textAlign: "center"
                          }}
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <input
                            type="checkbox"
                            checked={
                              item.selected === true
                            }
                            onChange={() =>
                              handlePDCDocketChequeSelect(
                                index
                              )
                            }
                          />
                        </td>

                        <td>{index + 1}</td>

                        <td>{item.chequeNo || "-"}</td>

                        <td>{item.chequeDate || "-"}</td>

                        <td className="pdc-amount-cell">
                          ₹
                          {Number(
                            item.amount || 0
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </td>

                        <td>{item.clearingDate || "-"}</td>

                        <td>{item.recSeries || "-"}</td>

                        <td>{item.recNo || "-"}</td>

                        <td>{item.recTrnBank || "-"}</td>

                        <td>{item.branch || "-"}</td>

                        <td>{item.partyCode || "-"}</td>

                        <td>{item.partyName || "-"}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* ================= SUMMARY ================= */}

          <div className="pdc-summary-section">
            <div className="pdc-summary-card">
              <span>Total Cheques</span>

              <strong>
                {pdcDocketFormData.totalCheques || 0}
              </strong>
            </div>

            <div className="pdc-summary-card total">
              <span>Total Amount</span>

              <strong>
                ₹
                {Number(
                  pdcDocketFormData.totalAmount || 0
                ).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </strong>
            </div>

            <div className="pdc-summary-card">
              <span>House Bank</span>

              <strong>
                {pdcDocketFormData.houseBank || "-"}
              </strong>
            </div>

            <div className="pdc-summary-card">
              <span>Clearing Type</span>

              <strong>
                {pdcDocketFormData.clearingType || "-"}
              </strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
  /* =========================================================
   CONTRA LIST FILTERING AND PAGINATION
   ========================================================= */

  /* =========================================================
     CONTRA LIST ROWS
  
     Search, filtering and pagination are now
     completed by the backend.
     ========================================================= */

  /* =========================================================
     CONTRA BACKEND LIST DATA
     ========================================================= */

  const contraListRows =
    Array.isArray(state.contra)
      ? state.contra
      : Array.isArray(state.contras)
        ? state.contras
        : [];

  const getContraType = (transaction = {}) =>
    String(
      transaction.transactionType ||
      transaction.type ||
      transaction.tranType ||
      ""
    )
      .trim()
      .toLowerCase();

  const filteredContraList =
    contraListRows;

  const paginatedContraList =
    contraListRows;

  const contraActiveFilterCount = [
    contraAppliedFilters.fromDate,
    contraAppliedFilters.toDate,
    contraAppliedFilters.transactionType,
    contraAppliedFilters.voucherNo,
    contraAppliedFilters.narration,
  ].filter((value) =>
    String(value || "").trim()
  ).length;

  /*
   * Keep these aliases because the existing
   * Contra JSX already uses these names.
   */
  const contraTotalPages =
    contraListTotalPages;

  const contraSafePage =
    contraListCurrentPage;

  const contraShowingFrom =
    contraListStartRecord;

  const contraShowingTo =
    contraListEndRecord;

  const getContraPaginationPages =
    () => {
      const pages = [];

      const startPage =
        Math.max(
          1,
          contraListCurrentPage -
          2
        );

      const endPage =
        Math.min(
          contraListTotalPages,
          contraListCurrentPage +
          2
        );

      for (
        let pageNumber =
          startPage;

        pageNumber <=
        endPage;

        pageNumber += 1
      ) {
        pages.push(
          pageNumber
        );
      }

      return pages;
    };

  // Contra List
  const renderContraList = () => {
    const today = new Date()
      .toISOString()
      .split("T")[0];

    const todayContraCount =
      contraListRows.filter(
        (transaction) =>
          String(
            transaction.transactionDate ||
            transaction.vDate ||
            ""
          ).slice(0, 10) === today
      ).length;

    const totalContraAmount =
      filteredContraList.reduce(
        (total, transaction) =>
          total +
          (Number(transaction.amount) || 0),
        0
      );

    const depositTransactions =
      filteredContraList.filter(
        (transaction) => {
          const type =
            getContraType(transaction);

          return (
            type.includes("deposit") ||
            type.includes("cash to bank") ||
            type.includes("cash deposit")
          );
        }
      );

    const withdrawalTransactions =
      filteredContraList.filter(
        (transaction) => {
          const type =
            getContraType(transaction);

          return (
            type.includes("withdraw") ||
            type.includes("bank to cash") ||
            type.includes("cash withdrawal")
          );
        }
      );

    const totalDepositAmount =
      depositTransactions.reduce(
        (total, transaction) =>
          total +
          (Number(transaction.amount) || 0),
        0
      );

    const totalWithdrawalAmount =
      withdrawalTransactions.reduce(
        (total, transaction) =>
          total +
          (Number(transaction.amount) || 0),
        0
      );

    return (
      <div className="contra-premium-list-page">
        <div className="contra-premium-heading">
          <div className="contra-premium-title">
            <h2>Bank Deposit / Withdrawal</h2>

            <p>
              Manage bank deposits, withdrawals and
              cash transfer transactions
            </p>
          </div>

          <div className="contra-heading-actions">
            {contraPermission.add && (

            <button
              type="button"
              className="contra-main-button contra-add-button"
              onClick={() => {
                resetContraForm();
                openTransactionEntry("Contra");
              }}
            >
              <Plus size={16} />
              New Transaction
            </button>
            )}
            <button
              type="button"
              className="contra-main-button contra-excel-button"
            >
              <FileSpreadsheet size={16} />
              Export Excel
            </button>

            <button
              type="button"
              className="contra-main-button contra-pdf-button"
            >
              <FileText size={16} />
              Export PDF
            </button>

            <button
              type="button"
              className="contra-main-button contra-print-button"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              Print List
            </button>
          </div>
        </div>

        <div className="contra-summary-grid">
          <div className="contra-summary-card">
            <div className="contra-summary-icon blue">
              <CalendarDays size={20} />
            </div>

            <div className="contra-summary-content">
              <span>Today's Transactions</span>
              <strong>{todayContraCount}</strong>
              <small>
                {new Date().toLocaleDateString(
                  "en-GB"
                )}
              </small>
            </div>
          </div>

          <div className="contra-summary-card">
            <div className="contra-summary-icon violet">
              <BookOpen size={20} />
            </div>

            <div className="contra-summary-content">
              <span>Total Transactions</span>
              <strong>
                {contraListTotalRecords}
              </strong>
              <small>All records</small>
            </div>
          </div>

          <div className="contra-summary-card">
            <div className="contra-summary-icon cyan">
              <Wallet size={20} />
            </div>

            <div className="contra-summary-content">
              <span>Total Amount</span>

              <strong>
                ₹
                {totalContraAmount.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>

              <small>Filtered records</small>
            </div>
          </div>

          <div className="contra-summary-card">
            <div className="contra-summary-icon green">
              <ArrowDownLeft size={20} />
            </div>

            <div className="contra-summary-content">
              <span>Bank Deposits</span>

              <strong>
                ₹
                {totalDepositAmount.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>

              <small>
                {depositTransactions.length}{" "}
                transactions
              </small>
            </div>
          </div>

          <div className="contra-summary-card">
            <div className="contra-summary-icon orange">
              <ArrowUpRight size={20} />
            </div>

            <div className="contra-summary-content">
              <span>Bank Withdrawals</span>

              <strong>
                ₹
                {totalWithdrawalAmount.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>

              <small>
                {withdrawalTransactions.length}{" "}
                transactions
              </small>
            </div>
          </div>
        </div>

        <div className="contra-list-toolbar">
          <div className="contra-search-box">
            <Search size={16} />

            <input
              type="text"
              value={
                contraListSearch
              }
              placeholder="Search voucher, type, amount or narration"
              onChange={(event) => {
                setContraListSearch(
                  event.target.value
                );

                setContraListCurrentPage(
                  1
                );
              }}
            />

            {contraListSearch && (
              <button
                type="button"
                className="contra-clear-search"
                onClick={() =>
                  setContraListSearch("")
                }
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            className={`contra-filter-toggle ${contraActiveFilterCount > 0
              ? "has-active-filters"
              : ""
              }`}
            onClick={() =>
              setContraFiltersVisible(
                (previous) => !previous
              )
            }
          >
            <SlidersHorizontal size={16} />
            Apply Filter

            {contraActiveFilterCount > 0 && (
              <span className="contra-filter-count">
                {contraActiveFilterCount}
              </span>
            )}

            <ChevronDown
              size={15}
              className={
                contraFiltersVisible
                  ? "contra-filter-chevron open"
                  : "contra-filter-chevron"
              }
            />
          </button>
        </div>

        {contraFiltersVisible && (
          <div className="contra-filter-panel">
            <div className="contra-filter-field">
              <label>From Date</label>

              <input
                type="date"
                value={
                  contraDraftFilters.fromDate
                }
                onChange={(event) =>
                  handleContraDraftFilterChange(
                    "fromDate",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="contra-filter-field">
              <label>To Date</label>

              <input
                type="date"
                value={
                  contraDraftFilters.toDate
                }
                onChange={(event) =>
                  handleContraDraftFilterChange(
                    "toDate",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="contra-filter-field">
              <label>Transaction Type</label>

              <select
                value={
                  contraDraftFilters.transactionType
                }
                onChange={(event) =>
                  handleContraDraftFilterChange(
                    "transactionType",
                    event.target.value
                  )
                }
              >
                <option value="">
                  All Types
                </option>

                <option value="deposit">
                  Deposit
                </option>

                <option value="withdrawal">
                  Withdrawal
                </option>

                <option value="cash to bank">
                  Cash to Bank
                </option>

                <option value="bank to cash">
                  Bank to Cash
                </option>
              </select>
            </div>

            <div className="contra-filter-field">
              <label>Voucher No</label>

              <input
                type="text"
                value={
                  contraDraftFilters.voucherNo
                }
                placeholder="Enter voucher no"
                onChange={(event) =>
                  handleContraDraftFilterChange(
                    "voucherNo",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="contra-filter-field">
              <label>Narration</label>

              <input
                type="text"
                value={
                  contraDraftFilters.narration
                }
                placeholder="Enter narration"
                onChange={(event) =>
                  handleContraDraftFilterChange(
                    "narration",
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyContraListFilters();
                  }
                }}
              />
            </div>

            <div className="contra-filter-actions">
              <button
                type="button"
                className="contra-filter-clear"
                onClick={
                  clearContraListFilters
                }
              >
                Clear
              </button>

              <button
                type="button"
                className="contra-filter-apply"
                onClick={
                  applyContraListFilters
                }
              >
                <SlidersHorizontal size={15} />
                Apply Filter
              </button>
            </div>
          </div>
        )}

        <div className="contra-table-card">
          <div className="contra-table-scroll">
            <table className="contra-premium-table">
              <thead>
                <tr>
                  <th className="contra-sr-column">
                    SrNo
                  </th>

                  <th>Tran VNo.</th>
                  <th>Date</th>
                  <th>Transaction Type</th>

                  <th className="contra-amount-column">
                    Amount
                  </th>

                  <th>Narration</th>
                  <th>Status</th>

                  <th className="contra-actions-column">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {contraListLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="contra-empty-cell"
                    >
                      <strong>
                        Loading Contra transactions...
                      </strong>

                      <span>
                        Please wait while the records are loaded.
                      </span>
                    </td>
                  </tr>
                ) : paginatedContraList.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="contra-empty-cell"
                    >
                      <strong>
                        No Contra transactions found
                      </strong>

                      <span>
                        {contraListSearch ||
                          contraActiveFilterCount > 0
                          ? "Try changing or clearing the filters."
                          : "Click New Transaction to add a bank deposit or withdrawal."}
                      </span>
                    </td>
                  </tr>
                ) : (
                  paginatedContraList.map(
                    (transaction, index) => {
                      const transactionType =
                        String(
                          transaction.transactionType ||
                          transaction.type ||
                          "-"
                        ).trim();

                      const normalizedType =
                        transactionType.toLowerCase();

                      const isDeposit =
                        normalizedType.includes(
                          "deposit"
                        ) ||
                        normalizedType.includes(
                          "cash to bank"
                        );

                      const isWithdrawal =
                        normalizedType.includes(
                          "withdraw"
                        ) ||
                        normalizedType.includes(
                          "bank to cash"
                        );

                      return (
                        <tr
                          key={
                            transaction.id ||
                            transaction._id ||
                            `${transaction.tranVNo}-${index}`
                          }
                        >
                          <td className="contra-sr-column">
                            {contraListStartRecord +
                              index}
                          </td>

                          <td className="contra-voucher-number">
                            {transaction.tranVNo ||
                              transaction.vNo ||
                              "-"}
                          </td>

                          <td>
                            {transaction.transactionDate ||
                              transaction.vDate ||
                              "-"}
                          </td>

                          <td>
                            <span
                              className={`contra-type-badge ${isDeposit
                                ? "deposit"
                                : isWithdrawal
                                  ? "withdrawal"
                                  : "other"
                                }`}
                            >
                              {transactionType}
                            </span>
                          </td>

                          <td className="contra-amount-column">
                            ₹
                            {Number(
                              transaction.amount || 0
                            ).toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td className="contra-narration">
                            {transaction.narration ||
                              "-"}
                          </td>

                          <td>
                            <span className="contra-status-badge">
                              <CircleCheck size={12} />
                              Posted
                            </span>
                          </td>

                          <td className="contra-actions-column">
                            <div className="contra-row-actions">
                              <button
                                type="button"
                                className="contra-action-button view"
                                title="View Transaction"
                                onClick={() => {
                                  setTransactionFormMode(
                                    (previous) => ({
                                      ...previous,
                                      Contra: true,
                                    })
                                  );

                                  editContra(
                                    transaction
                                  );
                                }}
                              >
                                <Eye size={16} />
                              </button>
{contraPermission.edit && (
                              <button
                                type="button"
                                className="contra-action-button edit"
                                title="Edit Transaction"
                                onClick={() => {
                                  setTransactionFormMode(
                                    (previous) => ({
                                      ...previous,
                                      Contra: true,
                                    })
                                  );

                                  editContra(
                                    transaction
                                  );
                                }}
                              >
                                <Pencil size={16} />
                              </button>
)}
{contraPermission.delete && (
                              <button
                                type="button"
                                className="contra-action-button delete"
                                title="Delete Transaction"
                                disabled={
                                  contraListLoading
                                }
                                onClick={() =>
                                  deleteContra(
                                    transaction._id ||
                                    transaction.id
                                  )
                                }
                              >
                                <Trash2 size={16} />
                              </button>
)}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="contra-pagination-footer">
            <div className="contra-pagination-info">
              Showing{" "}
              <strong>
                {contraListStartRecord}
              </strong>{" "}
              to{" "}
              <strong>
                {contraListEndRecord}
              </strong>{" "}
              of{" "}
              <strong>
                {contraListTotalRecords}
              </strong>{" "}
              entries
            </div>

            <div className="contra-pagination-controls">
              <select
                value={
                  contraListRowsPerPage
                }
                disabled={
                  contraListLoading
                }
                onChange={(event) => {
                  const nextLimit =
                    Number(
                      event.target.value
                    );

                  setContraListRowsPerPage(
                    nextLimit
                  );

                  setContraListCurrentPage(
                    1
                  );
                }}
              >
                <option value={10}>
                  10
                </option>

                <option value={20}>
                  20
                </option>

                <option value={50}>
                  50
                </option>

                <option value={100}>
                  100
                </option>
              </select>

              <div className="contra-page-buttons">
                <button
                  type="button"
                  disabled={
                    contraListLoading ||
                    contraListCurrentPage <=
                    1
                  }
                  onClick={() =>
                    setContraListCurrentPage(
                      (previousPage) =>
                        Math.max(
                          previousPage -
                          1,
                          1
                        )
                    )
                  }
                >
                  <ChevronLeft size={16} />
                </button>

                {getContraPaginationPages().map(
                  (pageNumber) => (
                    <button
                      type="button"
                      key={pageNumber}
                      disabled={
                        contraListLoading
                      }
                      className={
                        pageNumber ===
                          contraListCurrentPage
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setContraListCurrentPage(
                          pageNumber
                        )
                      }
                    >
                      {pageNumber}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={
                    contraListLoading ||
                    contraListCurrentPage >=
                    contraListTotalPages
                  }
                  onClick={() =>
                    setContraListCurrentPage(
                      (previousPage) =>
                        Math.min(
                          previousPage +
                          1,
                          contraListTotalPages
                        )
                    )
                  }
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Contra Form
  // const renderContraForm = () => (
  //   <div className="master-section contra-section"><div className="form-header"><h2 className="page-title-large">{editContraId ? 'Edit Bank Deposit/Withdrawal' : 'Add Bank Deposit/Withdrawal'}</h2><button className="close-form-btn" onClick={() => { resetContraForm(); openTransactionList("Contra"); }}>×</button></div>
  //     <div className="form-section"><div className="contra-form"><div className="form-row-3"><div className="form-field"><label>Transaction Date :</label><input type="date" name="transactionDate" value={contraFormData.transactionDate} onChange={handleContraInput} /></div><div className="form-field"><label>Tran VNo. :</label><input type="text" name="tranVNo" value={contraFormData.tranVNo} onChange={handleContraInput} placeholder="Enter number" /></div><div className="form-field"><label>Transaction Type :</label><select name="transactionType" value={contraFormData.transactionType} onChange={handleContraInput}><option value="CASH DEPOSIT">CASH DEPOSIT</option><option value="CASH WITHDRAWAL">CASH WITHDRAWAL</option><option value="CHEQUE DEPOSIT">CHEQUE DEPOSIT</option><option value="CHEQUE WITHDRAWAL">CHEQUE WITHDRAWAL</option><option value="TRANSFER">TRANSFER</option></select></div></div>
  //       <div className="form-row-3"><div className="form-field"><label>Amount :</label><input type="number" name="amount" value={contraFormData.amount} onChange={handleContraInput} step="0.01" placeholder="Enter amount" /></div><div className="form-field"><label>Narration :</label><input type="text" name="narration" value={contraFormData.narration} onChange={handleContraInput} placeholder="Enter narration" /></div><div className="form-field"></div></div></div></div>
  //     <div className="form-actions"><button className="btn-save" onClick={saveContra}>{editContraId ? 'Update' : 'Save'}</button><button className="btn-cancel" onClick={() => { resetContraForm(); openTransactionList("Contra"); }}>Cancel</button></div>
  //   </div>
  // );
  // =========================================================
  // CONTRA FORM — RECEIPT STYLE UI
  // =========================================================

  const renderContraForm = () => (
    <div className="contra-billing-page">
      <div className="contra-billing-card">

        {/* ================= TOP HEADER ================= */}

        <div className="contra-billing-topbar">
          <div className="contra-billing-title-wrap">
            <h2>
              {editContraId
                ? "Edit Contra Entry"
                : "Contra Entry"}
            </h2>

            <span className="contra-billing-badge">
              {editContraId ? "Edit Entry" : "New Entry"}
            </span>
          </div>

          <div className="contra-billing-actions">
            <button
              type="button"
              className="contra-save-header-btn"
              onClick={saveContra}
            >
              💾 {editContraId ? "Update Contra" : "Save Contra"}
            </button>

            <button
              type="button"
              className="contra-more-btn"
              aria-label="More options"
            >
              ⋮
            </button>

            <button
              type="button"
              className="contra-close-header-btn"
              aria-label="Close Contra form"
              onClick={() => {
                resetContraForm();
                openTransactionList("Contra");
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ================= CONTRA INFORMATION ================= */}

        <section className="contra-entry-section">
          <div className="contra-section-heading">
            <div className="contra-heading-left">
              <span className="contra-section-dot" />

              <h3>Contra Information</h3>
            </div>

            <div className="contra-header-meta">
              <span>
                Voucher No:
                <strong>
                  {contraFormData.tranVNo || "-"}
                </strong>
              </span>

              <span>
                Transaction:
                <strong>
                  {contraFormData.transactionType || "-"}
                </strong>
              </span>
            </div>
          </div>

          <div className="contra-header-grid">

            <div className="contra-field">
              <label>
                Transaction Date <span>*</span>
              </label>

              <input
                type="date"
                name="transactionDate"
                value={contraFormData.transactionDate || ""}
                onChange={handleContraInput}
              />
            </div>

            <div className="contra-field">
              <label>
                Transaction VNo <span>*</span>
              </label>

              <input
                type="text"
                inputMode="numeric"
                name="tranVNo"
                value={
                  contraFormData.tranVNo || ""
                }
                readOnly={
                  autoVoucherNo === true ||
                  Boolean(editContraId)
                }
                placeholder={
                  autoVoucherNo === true
                    ? "Auto generated"
                    : "Enter number"
                }
                onChange={(event) => {
                  if (
                    autoVoucherNo === true ||
                    editContraId
                  ) {
                    return;
                  }

                  setContraFormData(
                    (previous) => ({
                      ...previous,
                      tranVNo:
                        cleanVoucherNumber(
                          event.target.value
                        ),
                    })
                  );
                }}
              />
            </div>

            <div className="contra-field">
              <label>
                Transaction Type <span>*</span>
              </label>

              <select
                name="transactionType"
                value={contraFormData.transactionType || ""}
                onChange={handleContraInput}
              >
                <option value="CASH DEPOSIT">
                  Cash Deposit
                </option>

                <option value="CASH WITHDRAWAL">
                  Cash Withdrawal
                </option>

                <option value="BANK TRANSFER">
                  Bank Transfer
                </option>
              </select>
            </div>

            <div className="contra-field">
              <label>
                Amount <span>*</span>
              </label>

              <div className="contra-amount-wrap">
                <span>₹</span>

                <input
                  type="number"
                  name="amount"
                  value={contraFormData.amount || ""}
                  onChange={handleContraInput}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="contra-field contra-narration-field">
              <label>Narration</label>

              <input
                type="text"
                name="narration"
                value={contraFormData.narration || ""}
                onChange={handleContraInput}
                placeholder="Enter narration"
              />
            </div>
          </div>
        </section>

        {/* ================= CONTRA SUMMARY ================= */}

        <section className="contra-summary-section">
          <div className="contra-summary-heading">
            <div className="contra-heading-left">
              <span className="contra-section-dot" />

              <h3>Contra Summary</h3>
            </div>

            <span
              className={`contra-type-status ${contraFormData.transactionType ===
                "CASH WITHDRAWAL"
                ? "withdrawal"
                : "deposit"
                }`}
            >
              {contraFormData.transactionType ===
                "CASH WITHDRAWAL"
                ? "Cash Out"
                : "Cash In"}
            </span>
          </div>

          <div className="contra-summary-grid">
            <div className="contra-summary-card">
              <span>Voucher Number</span>

              <strong>
                {contraFormData.tranVNo || "-"}
              </strong>
            </div>

            <div className="contra-summary-card">
              <span>Transaction Date</span>

              <strong>
                {contraFormData.transactionDate || "-"}
              </strong>
            </div>

            <div className="contra-summary-card">
              <span>Transaction Type</span>

              <strong>
                {contraFormData.transactionType || "-"}
              </strong>
            </div>

            <div
              className={`contra-summary-card amount ${contraFormData.transactionType ===
                "CASH WITHDRAWAL"
                ? "withdrawal"
                : "deposit"
                }`}
            >
              <span>Transaction Amount</span>

              <strong>
                ₹
                {Number(
                  contraFormData.amount || 0
                ).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
  /* =========================================================
     COLLECTION VOUCHER FILTERING AND PAGINATION
     ========================================================= */
  /* =========================================================
     COLLECTION VOUCHER LIST
  
     Backend already performs:
     - search
     - filtering
     - pagination
     ========================================================= */

  const collectionVoucherRows =
    Array.isArray(
      state.collectionVouchers
    )
      ? state.collectionVouchers
      : [];

  /*
* Collection types used by the filter dropdown.
*/
  const collectionVoucherTypeOptions = [
    "Bill wise",
    "Salesman wise",
    "Area wise",
  ];

  const filteredCollectionVoucherList =
    collectionVoucherRows;

  const paginatedCollectionVoucherList =
    collectionVoucherRows;

  const collectionVoucherActiveFilterCount =
    [
      collectionVoucherAppliedFilters.fromDate,
      collectionVoucherAppliedFilters.toDate,
      collectionVoucherAppliedFilters.collectionType,
      collectionVoucherAppliedFilters.voucherNo,
      collectionVoucherAppliedFilters.minimumAmount,
    ].filter((value) =>
      String(value || "").trim()
    ).length;


  const collectionVoucherSafePage =
    collectionVoucherCurrentPage;

  const collectionVoucherShowingFrom =
    collectionVoucherStartRecord;

  const collectionVoucherShowingTo =
    collectionVoucherEndRecord;

  const getCollectionVoucherPaginationPages =
    () => {

      const pages = [];

      const startPage =
        Math.max(
          1,
          collectionVoucherCurrentPage - 2
        );

      const endPage =
        Math.min(
          collectionVoucherTotalPages,
          collectionVoucherCurrentPage + 2
        );

      for (
        let pageNumber = startPage;
        pageNumber <= endPage;
        pageNumber++
      ) {
        pages.push(pageNumber);
      }

      return pages;
    };
  // Collection Voucher List
  const renderCollectionVoucherList = () => {
    const today = new Date()
      .toISOString()
      .split("T")[0];

    const todayVoucherCount =
      collectionVoucherRows.filter(
        (voucher) =>
          String(
            voucher.collectionDate ||
            voucher.vDate ||
            ""
          ).slice(0, 10) === today
      ).length;

    const totalCollectionAmount =
      filteredCollectionVoucherList.reduce(
        (total, voucher) =>
          total +
          (Number(
            voucher.totalCollectionAmount ??
            voucher.totalAmount ??
            voucher.amount ??
            0
          ) || 0),
        0
      );

    const totalCollectedBills =
      filteredCollectionVoucherList.reduce(
        (total, voucher) =>
          total +
          (Number(
            voucher.totalBills ??
            voucher.billCount ??
            0
          ) || 0),
        0
      );

    const averageCollectionAmount =
      filteredCollectionVoucherList.length >
        0
        ? totalCollectionAmount /
        filteredCollectionVoucherList.length
        : 0;

    return (
      <div className="collection-voucher-premium-list-page">
        <div className="collection-voucher-premium-heading">
          <div className="collection-voucher-premium-title">
            <h2>Collection Voucher List</h2>

            <p>
              Manage collection vouchers, bill
              collections and received amounts
            </p>
          </div>

          <div className="collection-voucher-heading-actions">
            {collectionVoucherPermission.add && (
            <button
              type="button"
              className="collection-voucher-main-button collection-voucher-add-button"
              onClick={() => {
                resetCollectionVoucherForm();

                openTransactionEntry(
                  "Collection Voucher"
                );
              }}
            >
              <Plus size={16} />
              New Collection Voucher
            </button>
            )}
            <button
              type="button"
              className="collection-voucher-main-button collection-voucher-excel-button"
            >
              <FileSpreadsheet size={16} />
              Export Excel
            </button>

            <button
              type="button"
              className="collection-voucher-main-button collection-voucher-pdf-button"
            >
              <FileText size={16} />
              Export PDF
            </button>

            <button
              type="button"
              className="collection-voucher-main-button"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              Print List
            </button>
          </div>
        </div>

        <div className="collection-voucher-summary-grid">
          <div className="collection-voucher-summary-card">
            <div className="collection-voucher-summary-icon blue">
              <CalendarDays size={20} />
            </div>

            <div className="collection-voucher-summary-content">
              <span>Today's Collections</span>
              <strong>{todayVoucherCount}</strong>

              <small>
                {new Date().toLocaleDateString(
                  "en-GB"
                )}
              </small>
            </div>
          </div>

          <div className="collection-voucher-summary-card">
            <div className="collection-voucher-summary-icon violet">
              <ReceiptText size={20} />
            </div>

            <div className="collection-voucher-summary-content">
              <span>Total Vouchers</span>

              <strong>
                {collectionVoucherRows.length}
              </strong>

              <small>All records</small>
            </div>
          </div>

          <div className="collection-voucher-summary-card">
            <div className="collection-voucher-summary-icon green">
              <Wallet size={20} />
            </div>

            <div className="collection-voucher-summary-content">
              <span>Total Collection</span>

              <strong>
                ₹
                {totalCollectionAmount.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>

              <small>Filtered records</small>
            </div>
          </div>

          <div className="collection-voucher-summary-card">
            <div className="collection-voucher-summary-icon orange">
              <BookOpen size={20} />
            </div>

            <div className="collection-voucher-summary-content">
              <span>Total Bills</span>

              <strong>
                {totalCollectedBills}
              </strong>

              <small>Collected bills</small>
            </div>
          </div>

          <div className="collection-voucher-summary-card">
            <div className="collection-voucher-summary-icon cyan">
              <CircleCheck size={20} />
            </div>

            <div className="collection-voucher-summary-content">
              <span>Average Collection</span>

              <strong>
                ₹
                {averageCollectionAmount.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>

              <small>Per voucher</small>
            </div>
          </div>
        </div>

        <div className="collection-voucher-list-toolbar">
          <div className="collection-voucher-search-box">
            <Search size={16} />

            <input
              type="text"
              value={
                collectionVoucherSearch
              }
              placeholder="Search voucher, type, party or amount"
              onChange={(event) => {
                setCollectionVoucherSearch(
                  event.target.value
                );

                setCollectionVoucherCurrentPage(
                  1
                );
              }}
            />

            {collectionVoucherSearch && (
              <button
                type="button"
                className="collection-voucher-clear-search"
                onClick={() =>
                  setCollectionVoucherSearch("")
                }
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            className="collection-voucher-filter-toggle"
            onClick={() =>
              setCollectionVoucherFiltersVisible(
                (previous) => !previous
              )
            }
          >
            <SlidersHorizontal size={16} />
            Apply Filter

            {collectionVoucherActiveFilterCount >
              0 && (
                <span className="collection-voucher-filter-count">
                  {
                    collectionVoucherActiveFilterCount
                  }
                </span>
              )}

            <ChevronDown
              size={15}
              className={
                collectionVoucherFiltersVisible
                  ? "collection-voucher-filter-chevron open"
                  : "collection-voucher-filter-chevron"
              }
            />
          </button>
        </div>

        {collectionVoucherFiltersVisible && (
          <div className="collection-voucher-filter-panel">
            <div className="collection-voucher-filter-field">
              <label>From Date</label>

              <input
                type="date"
                value={
                  collectionVoucherDraftFilters
                    .fromDate
                }
                onChange={(event) =>
                  handleCollectionVoucherFilterChange(
                    "fromDate",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="collection-voucher-filter-field">
              <label>To Date</label>

              <input
                type="date"
                value={
                  collectionVoucherDraftFilters
                    .toDate
                }
                onChange={(event) =>
                  handleCollectionVoucherFilterChange(
                    "toDate",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="collection-voucher-filter-field">
              <label>Collection Type</label>

              <select
                value={
                  collectionVoucherDraftFilters
                    .collectionType
                }
                onChange={(event) =>
                  handleCollectionVoucherFilterChange(
                    "collectionType",
                    event.target.value
                  )
                }
              >
                <option value="">
                  All Collection Types
                </option>

                {collectionVoucherTypeOptions.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="collection-voucher-filter-field">
              <label>Voucher No</label>

              <input
                type="text"
                value={
                  collectionVoucherDraftFilters
                    .voucherNo
                }
                placeholder="Enter voucher no"
                onChange={(event) =>
                  handleCollectionVoucherFilterChange(
                    "voucherNo",
                    event.target.value
                  )
                }
              />
            </div>

            <div className="collection-voucher-filter-field">
              <label>Minimum Amount</label>

              <input
                type="number"
                min="0"
                value={
                  collectionVoucherDraftFilters
                    .minimumAmount
                }
                placeholder="Minimum amount"
                onChange={(event) =>
                  handleCollectionVoucherFilterChange(
                    "minimumAmount",
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyCollectionVoucherFilters();
                  }
                }}
              />
            </div>

            <div className="collection-voucher-filter-actions">
              <button
                type="button"
                className="collection-voucher-filter-clear"
                onClick={
                  clearCollectionVoucherFilters
                }
              >
                Clear
              </button>

              <button
                type="button"
                className="collection-voucher-filter-apply"
                onClick={
                  applyCollectionVoucherFilters
                }
              >
                <SlidersHorizontal size={15} />
                Apply Filter
              </button>
            </div>
          </div>
        )}

        <div className="collection-voucher-table-card">
          <div className="collection-voucher-table-scroll">
            <table className="collection-voucher-premium-table">
              <thead>
                <tr>
                  <th className="collection-voucher-sr-column">
                    SrNo
                  </th>

                  <th>Col VNo.</th>
                  <th>Collection Date</th>
                  <th>Collection Type</th>

                  <th className="collection-voucher-amount-column">
                    Total Amount
                  </th>

                  <th className="collection-voucher-bills-column">
                    Total Bills
                  </th>

                  <th>Status</th>

                  <th className="collection-voucher-actions-column">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>

                {collectionVoucherListLoading ? (

                  <tr>

                    <td
                      colSpan={9}
                      className="collection-voucher-empty-cell"
                    >

                      <strong>

                        Loading Collection Vouchers...

                      </strong>

                    </td>

                  </tr>

                )

                  : paginatedCollectionVoucherList.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="collection-voucher-empty-cell"
                      >
                        <strong>
                          No collection vouchers
                          found
                        </strong>

                        <span>
                          {collectionVoucherSearch ||
                            collectionVoucherActiveFilterCount >
                            0
                            ? "Try changing or clearing the filters."
                            : "Click New Collection Voucher to create an entry."}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    paginatedCollectionVoucherList.map(
                      (voucher, index) => {
                        const totalAmount =
                          Number(
                            voucher.totalCollectionAmount ??
                            voucher.totalAmount ??
                            voucher.amount ??
                            0
                          ) || 0;

                        const totalBills =
                          Number(
                            voucher.totalBills ??
                            voucher.billCount ??
                            0
                          ) || 0;

                        return (
                          <tr
                            key={
                              voucher.id ||
                              voucher._id ||
                              `${voucher.colVNo}-${index}`
                            }
                          >
                            <td className="collection-voucher-sr-column">
                              {collectionVoucherStartRecord +
                                index}
                            </td>

                            <td className="collection-voucher-number">
                              {voucher.colVNo ||
                                voucher.collectionVNo ||
                                voucher.vNo ||
                                "-"}
                            </td>

                            <td>
                              {voucher.collectionDate ||
                                voucher.vDate ||
                                "-"}
                            </td>

                            <td>
                              <span className="collection-voucher-type-badge">
                                {voucher.collectionType ||
                                  voucher.type ||
                                  "-"}
                              </span>
                            </td>

                            <td className="collection-voucher-amount-column">
                              ₹
                              {totalAmount.toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </td>

                            <td className="collection-voucher-bills-column">
                              {totalBills}
                            </td>

                            <td>
                              <span className="collection-voucher-status-badge">
                                <CircleCheck size={12} />
                                Posted
                              </span>
                            </td>

                            <td className="collection-voucher-actions-column">
                              <div className="collection-voucher-row-actions">
                                <button
                                  type="button"
                                  className="collection-voucher-action-button view"
                                  title="View Collection Voucher"
                                  onClick={() => {
                                    setTransactionFormMode(
                                      (previous) => ({
                                        ...previous,
                                        ["Collection Voucher"]:
                                          true,
                                      })
                                    );

                                    editCollectionVoucher(
                                      voucher
                                    );
                                  }}
                                >
                                  <Eye size={16} />
                                </button>
{collectionVoucherPermission.edit && (
                                <button
                                  type="button"
                                  className="collection-voucher-action-button edit"
                                  title="Edit Collection Voucher"
                                  onClick={() => {
                                    setTransactionFormMode(
                                      (previous) => ({
                                        ...previous,
                                        ["Collection Voucher"]:
                                          true,
                                      })
                                    );

                                    editCollectionVoucher(
                                      voucher
                                    );
                                  }}
                                >
                                  <Pencil size={16} />
                                </button>
)}
{collectionVoucherPermission.delete && (
                                <button
                                  type="button"
                                  className="collection-voucher-action-button delete"
                                  title="Delete Collection Voucher"
                                  onClick={() =>
                                    deleteCollectionVoucher(
                                      voucher.id ||
                                      voucher._id
                                    )
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
)}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )
                  )}
              </tbody>
            </table>
          </div>

          <div className="collection-voucher-pagination-footer">
            <div className="collection-voucher-pagination-info">
              Showing{" "}
              <strong>
                {collectionVoucherStartRecord}
              </strong>{" "}
              to{" "}
              <strong>
                {collectionVoucherEndRecord}
              </strong>{" "}
              of{" "}
              <strong>
                {collectionVoucherTotalRecords}
              </strong>{" "}
              entries
            </div>

            <div className="collection-voucher-pagination-controls">
              <select
                value={
                  collectionVoucherRowsPerPage
                }
                disabled={
                  collectionVoucherListLoading
                }
                onChange={(event) => {
                  const nextLimit =
                    Number(
                      event.target.value
                    );

                  setCollectionVoucherRowsPerPage(
                    nextLimit
                  );

                  setCollectionVoucherCurrentPage(
                    1
                  );
                }}
              >
                <option value={10}>
                  10
                </option>

                <option value={20}>
                  20
                </option>

                <option value={50}>
                  50
                </option>

                <option value={100}>
                  100
                </option>
              </select>

              <div className="collection-voucher-page-buttons">
                <button
                  type="button"
                  disabled={
                    collectionVoucherListLoading ||
                    collectionVoucherCurrentPage <=
                    1
                  }
                  onClick={() =>
                    setCollectionVoucherCurrentPage(
                      (previousPage) =>
                        Math.max(
                          previousPage -
                          1,
                          1
                        )
                    )
                  }
                >
                  <ChevronLeft size={16} />
                </button>

                {getCollectionVoucherPaginationPages().map(
                  (pageNumber) => (
                    <button
                      type="button"
                      key={pageNumber}
                      disabled={
                        collectionVoucherListLoading
                      }
                      className={
                        pageNumber ===
                          collectionVoucherCurrentPage
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setCollectionVoucherCurrentPage(
                          pageNumber
                        )
                      }
                    >
                      {pageNumber}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={
                    collectionVoucherListLoading ||
                    collectionVoucherCurrentPage >=
                    collectionVoucherTotalPages
                  }
                  onClick={() =>
                    setCollectionVoucherCurrentPage(
                      (previousPage) =>
                        Math.min(
                          previousPage +
                          1,
                          collectionVoucherTotalPages
                        )
                    )
                  }
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderCollectionReceiptModalForm = () => (
    <div className="collection-receipt-small-form">
      <h3 className="section-header">Receipt Information</h3>

      <div className="collection-receipt-grid-6">
        <div className="labeled-input">
          <label>Receipt Date</label>
          <input
            type="date"
            name="receiptDate"
            value={receiptFormData.receiptDate}
            onChange={handleReceiptInput}
          />
        </div>

        <div className="labeled-input">
          <label>RNo</label>
          <input
            type="text"
            inputMode="numeric"
            name="rno"
            value={
              receiptFormData.rno || ""
            }
            readOnly={
              autoVoucherNo === true ||
              Boolean(editReceiptId)
            }
            placeholder={
              autoVoucherNo === true
                ? "Auto generated"
                : "Enter receipt number"
            }
            onChange={(event) => {
              if (
                autoVoucherNo === true ||
                editReceiptId
              ) {
                return;
              }

              setReceiptFormData(
                (previous) => ({
                  ...previous,
                  rno: cleanVoucherNumber(
                    event.target.value
                  ),
                })
              );
            }}
          />
        </div>

        <div className="labeled-input">
          <label>Bill Series</label>
          <input
            type="text"
            name="billSeries"
            value={receiptFormData.billSeries}
            readOnly
          />
        </div>

        <div className="labeled-input">
          <label>Bill No</label>
          <input
            type="text"
            name="billNo"
            value={receiptFormData.billNo}
            onChange={handleReceiptInput}
            onKeyDown={handleReceiptBillKeyDown}
            placeholder="Enter Bill No and press Enter"
            autoComplete="off"
          />
        </div>

        <div className="labeled-input">
          <label>Party Name</label>
          <input
            type="text"
            name="partyName"
            value={receiptFormData.partyName}
            readOnly
          />
        </div>

        <div className="labeled-input">
          <label>Salesman</label>
          <select
            name="salesman"
            value={receiptFormData.salesman}
            onChange={handleReceiptInput}
          >
            <option value="">Select Salesman</option>
            {salesmen.map((s, i) => (
              <option key={i} value={s.name || s.salesmanName || s.code}>
                {s.name || s.salesmanName || s.code}
              </option>
            ))}
          </select>
        </div>

        <div className="labeled-input">
          <label>Bank/Cash</label>
          <select
            name="bankCash"
            value={receiptFormData.bankCash}
            onChange={handleReceiptInput}
          >
            <option value="">Select</option>
            <option value="Cash">Cash</option>
            {bankCashAccounts.map((acc, i) => (
              <option key={i} value={getBankAccountName(acc)}>
                {getBankAccountName(acc)}
              </option>
            ))}
          </select>
        </div>

        <div className="labeled-input">
          <label>Receipt Amount</label>
          <input
            type="number"
            name="receiptAmount"
            value={receiptFormData.receiptAmount}
            onChange={handleReceiptInput}
          />
        </div>

        <div className="labeled-input">
          <label>Cheque No</label>
          <input
            type="text"
            name="chequeNo"
            value={receiptFormData.chequeNo}
            onChange={handleReceiptInput}
            disabled={receiptFormData.bankCash === "Cash"}
          />
        </div>

        <div className="labeled-input">
          <label>Cheque Date</label>
          <input
            type="date"
            name="chequeDate"
            value={receiptFormData.chequeDate}
            onChange={handleReceiptInput}
            disabled={receiptFormData.bankCash === "Cash"}
          />
        </div>
        <div className="labeled-input">
          <label>Drawer Bank</label>
          <select
            name="drawerBank"
            value={receiptFormData.drawerBank}
            onChange={handleReceiptInput}
            disabled={receiptFormData.bankCash === "Cash"}
          >
            <option value="">Select Customer Bank</option>
            {filteredCustomerBanks.map((bank, i) => (
              <option key={i} value={getCustomerBankName(bank)}>
                {getCustomerBankName(bank)}
              </option>
            ))}
          </select>
        </div>

        <div className="labeled-input">
          <label>MICR</label>
          <input
            type="text"
            name="micr"
            value={receiptFormData.micr}
            onChange={handleReceiptInput}
          />
        </div>
      </div>

      <div className="collection-receipt-actions">
        <button className="btn-save" onClick={saveReceipt}>
          Save Receipt
        </button>

        <button
          className="btn-cancel"
          onClick={() => {
            setShowCollectionReceiptModal(false);
            setCollectionReceiptBillId(null);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
  // Collection Voucher Form
  // Collection Voucher Form
  const renderCollectionVoucherForm = () => {
    const selectedBills = billItems.filter((item) => item.selected);

    const formatAmt = (v) =>
      Number(v || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

    const allBillsSelected = billItems.length > 0 && billItems.every((item) => item.selected);

    return (
      <>
        <div className="master-section collection-voucher-section">
          <div className="collection-premium-header">

            <div className="collection-premium-title">
              <h2>
                {editCollectionVoucherId
                  ? "Edit Collection Voucher"
                  : "Collection Voucher"}
              </h2>

              <span>New Voucher</span>
            </div>

            <div className="collection-premium-actions">

              <button
                className="collection-save-btn-top"
                onClick={saveCollectionVoucher}
              >
                💾 Save Voucher
              </button>

              <button
                className="collection-more-btn"
                type="button"
              >
                ⋮
              </button>

              <button
                className="collection-close-btn"
                onClick={() => {
                  resetCollectionVoucherForm();
                  openTransactionList("Collection Voucher");
                }}
              >
                ×
              </button>

            </div>

          </div>
          <div className="collection-voucher-card">
            <div className="collection-voucher-header-grid">
              <div className="collection-field">
                <label>Collection Date :</label>
                <input
                  type="date"
                  name="collectionDate"
                  value={collectionVoucherFormData.collectionDate}
                  onChange={handleCollectionVoucherInput}
                />
              </div>

              <div className="collection-field">
                <label>Col VNo. :</label>

                <input
                  type="text"
                  inputMode="numeric"
                  name="colVNo"
                  value={
                    collectionVoucherFormData.colVNo ||
                    ""
                  }
                  readOnly={
                    autoVoucherNo === true ||
                    Boolean(editCollectionVoucherId)
                  }
                  placeholder={
                    autoVoucherNo === true
                      ? "Auto generated"
                      : "Enter voucher number"
                  }
                  onChange={(event) => {
                    if (
                      autoVoucherNo === true ||
                      editCollectionVoucherId
                    ) {
                      return;
                    }

                    const value =
                      event.target.value.replace(
                        /[^0-9]/g,
                        ""
                      );

                    setCollectionVoucherFormData(
                      (previous) => ({
                        ...previous,
                        colVNo: value,
                      })
                    );
                  }}
                />
              </div>

              <div className="collection-field">
                <label>Collection Type :</label>
                <select
                  name="collectionType"
                  value={collectionVoucherFormData.collectionType}
                  onChange={handleCollectionVoucherInput}
                >
                  <option value="Bill wise">Bill wise</option>
                  <option value="Salesman wise">Salesman wise</option>
                  <option value="Area wise">Area wise</option>
                </select>
              </div>

              <div className="collection-field collection-narr-field">
                <label>Narr :</label>
                <div className="collection-narr-row">
                  <input
                    type="text"
                    name="narration"
                    value={collectionVoucherFormData.narration}
                    onChange={handleCollectionVoucherInput}
                    placeholder="Enter narration"
                  />

                  <button
                    type="button"
                    className="collection-select-btn"
                    onClick={() =>
                      openSelectionModal(collectionVoucherFormData.collectionType)
                    }
                  >
                    Select{" "}
                    {collectionVoucherFormData.collectionType === "Bill wise"
                      ? "Bills"
                      : collectionVoucherFormData.collectionType ===
                        "Salesman wise"
                        ? "Salesmen"
                        : "Areas"}
                  </button>
                </div>
              </div>
            </div>

            <div className="receipt-grid-wrap collection-grid-wrap">
              <table className="receipt-entry-table collection-voucher-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={allBillsSelected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setBillItems(prev =>
                            prev.map(item => ({
                              ...item,
                              selected: checked,
                              collectionAmt: checked ? item.balance : 0
                            }))
                          );
                        }}
                      />
                    </th>
                    <th>Bill Series</th>
                    <th>Bill No</th>
                    <th>Bill Date</th>
                    <th>Party Code</th>
                    <th>Party Name</th>
                    <th style={{ textAlign: 'right' }}>Bill Amt</th>
                    <th style={{ textAlign: 'right' }}>Old Collection</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                    <th>Collection Amt</th>
                    <th>Discount</th>
                    <th>REC Series</th>
                    <th>REC VNo</th>
                  </tr>
                </thead>

                <tbody>
                  {billItems.length === 0 ? (
                    <tr>
                      <td colSpan="13" className="receipt-empty-row">
                        Click Select button to load collection bills
                      </td>
                    </tr>
                  ) : (
                    billItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!item.selected}
                            onChange={() => {
                              const newSelected = !item.selected;
                              setBillItems(prev =>
                                prev.map(bill =>
                                  bill.id === item.id
                                    ? { ...bill, selected: newSelected, collectionAmt: newSelected ? bill.balance : 0 }
                                    : bill
                                )
                              );
                            }}
                          />
                        </td>

                        <td>{item.billSeries || "-"}</td>
                        <td>{item.billNo || "-"}</td>
                        <td>{item.billDate || "-"}</td>
                        <td>{item.partyCode || "-"}</td>
                        <td>{item.partyName || "-"}</td>
                        <td style={{ textAlign: 'right' }}>₹{formatAmt(item.billAmt)}</td>
                        <td style={{ textAlign: 'right' }}>₹{formatAmt(item.oldCollection)}</td>
                        <td style={{ textAlign: 'right' }}>₹{formatAmt(item.balance)}</td>

                        <td>
                          <input
                            type="number"
                            value={item.collectionAmt || ""}
                            readOnly

                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => handleCollectionAmtChange(item, e)}
                            className="collection-amt-input"
                            style={{ width: '100px' }}
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            className="table-input"
                            value={item.discount ?? ""}
                            onChange={(e) =>
                              updateBillItem(
                                item.id,
                                "discount",
                                Number(e.target.value) || 0
                              )
                            }
                            step="0.01"
                            placeholder="0.00"
                            style={{ width: '80px' }}
                          />
                        </td>

                        <td>
                          <input
                            type="text"
                            className="table-input"
                            value={item.recSeries || ""}
                            onChange={(e) =>
                              updateBillItem(item.id, "recSeries", e.target.value)
                            }
                            placeholder="Series"
                            style={{ width: '80px' }}
                          />
                        </td>

                        <td>
                          <input
                            type="text"
                            className="table-input"
                            value={item.recVNo || ""}
                            onChange={(e) =>
                              updateBillItem(item.id, "recVNo", e.target.value)
                            }
                            placeholder="VNo"
                            style={{ width: '80px' }}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="collection-bottom-summary">
              <span>
                Total Collection Amount <b>₹{formatAmt(totalCollectionAmount)}</b>
              </span>
              <span>
                Total Cash Collection <b>₹{formatAmt(totalCashCollection)}</b>
              </span>
              <span>
                Total Cheque Collection <b>₹{formatAmt(totalChequeCollection)}</b>
              </span>
              <span>
                Total Bills <b>{selectedBills.length}</b>
              </span>
            </div>
          </div>


        </div>

        {collectionVoucherFormData.collectionType === "Bill wise" && (
          <BillSelectionModal
            isOpen={showBillSelectionModal}
            onClose={closeSelectionModal}
            bills={getCollectionPendingBills()}
            onConfirm={handleBillSelectionConfirm}
          />
        )}

        {collectionVoucherFormData.collectionType === "Salesman wise" && (
          <SalesmanSelectionModal
            isOpen={showSalesmanSelectionModal}
            onClose={closeSelectionModal}
            salesmen={getUniqueSalesmen()}
            onConfirm={handleSalesmanSelectionConfirm}
          />
        )}

        {collectionVoucherFormData.collectionType === "Area wise" && (
          <AreaSelectionModal
            isOpen={showAreaSelectionModal}
            onClose={closeSelectionModal}
            areas={getUniqueAreas()}
            onConfirm={handleAreaSelectionConfirm}
          />
        )}

        {showCollectionReceiptModal && (
          <div className="modal-overlay">
            <div className="collection-receipt-compact-modal">
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowCollectionReceiptModal(false);
                  setCollectionReceiptBillId(null);
                }}
              >
                ×
              </button>

              {renderCollectionReceiptModalForm()}
            </div>
          </div>
        )}
      </>
    );
  };
  console.log("State Receipts =", state.receipts);
  console.log("Length =", state.receipts?.length);
  return (
    <div className="transaction-page">
      {activeTransaction === "Receipt" &&
        (transactionFormMode?.["Receipt"] ? renderReceiptForm() : renderReceiptList())}

      {activeTransaction === "Payment" &&
        (transactionFormMode?.["Payment"] ? renderPaymentForm() : renderPaymentList())}

      {activeTransaction === "Journal Voucher" &&
        (transactionFormMode?.["Journal Voucher"] ? renderJournalForm() : renderJournalList())}

      {activeTransaction === "Cheque Bounce" &&
        (transactionFormMode?.["Cheque Bounce"] ? renderChequeBounceForm() : renderChequeBounceList())}

      {activeTransaction === "PDC Docket" &&
        (transactionFormMode?.["PDC Docket"] ? renderPDCDocketForm() : renderPDCDocketList())}

      {activeTransaction === "Contra" &&
        (transactionFormMode?.["Contra"] ? renderContraForm() : renderContraList())}

      {activeTransaction === "Collection Voucher" &&
        (transactionFormMode?.["Collection Voucher"]
          ? renderCollectionVoucherForm()
          : renderCollectionVoucherList())}
    </div>
  );
};
export default Transaction;