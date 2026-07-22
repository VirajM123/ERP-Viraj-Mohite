import React, { useState, useCallback, useEffect } from "react";
import "./Transaction.css";
import { useERP } from "./context/ERPContext";

const API_URL = "https://total-solution-backend.onrender.com/api";
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
  setTransactionFormMode
}) => {
  const erpContext = useERP();
  console.log("ERP CONTEXT =", erpContext);
  console.log("ERP STATE =", erpContext?.state);
  console.log("ERP RECEIPTS =", erpContext?.state?.receipts);


  const { state, dispatch } = useERP();

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

    setTransactionFormMode(prev => ({
      ...prev,
      [menu]: true
    }));

    if (menu === "Contra") {
      loadNextContraNo();
    }
  };






  const [billItems, setBillItems] = useState([]);

  useEffect(() => {

    loadCollectionVouchers();

  }, []);

  useEffect(() => {

    if (
      activeTransaction === "Collection Voucher" &&
      transactionFormMode?.["Collection Voucher"]
    ) {
      loadNextCollectionVoucherNo();
    }

  }, [
    activeTransaction,
    transactionFormMode
  ]);
  useEffect(() => {

    loadPDCDockets();
    loadContra();

  }, []);

  useEffect(() => {
    console.log("LOAD RECEIPTS CALLED");

    loadReceipts();

  }, [dispatch]);

  const [currentSeries, setCurrentSeries] = useState(
    localStorage.getItem("chequeBounceSeries") || ""
  );
  useEffect(() => {

    if (!currentSeries) return;

    fetch(
      `${API_URL}/transaction/cheque-bounce-next-no/${currentSeries}`
    )
      .then(res => res.json())
      .then(result => {

        if (result.success) {

          setChequeBounceFormData(prev => ({
            ...prev,
            trnSeries: currentSeries,
            trnNo: result.nextNo,
            chqBounceNo: `${currentSeries}${result.nextNo}`
          }));
        }

      });

  }, [currentSeries]);

  useEffect(() => {

    if (
      activeTransaction === "Cheque Bounce" &&
      transactionFormMode?.["Cheque Bounce"]
    ) {
      loadNextChequeBounceNo();
    }

  }, [activeTransaction]);

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
  // const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [editReceiptId, setEditReceiptId] = useState(null);
  const [partySuggestions, setPartySuggestions] = useState([]);
  const [partySearchActive, setPartySearchActive] = useState(false);
  const [partyNotFound, setPartyNotFound] = useState(false);
  const [activePartySuggestionIndex, setActivePartySuggestionIndex] =
    useState(-1);
  const [receiptFormData, setReceiptFormData] = useState({
    receiptDate: new Date().toISOString().split("T")[0],
    rno: (state.receipts || []).length + 1,
    billSeries: "",
    billNo: "",
    salesman: "",
    partyName: "",
    narration: "",
    bankCash: "",
    loadNo: "",
    receiptAmount: "",
    chequeNo: "",
    chequeDate: "",
    rloadNo: "",
    drawerBank: "",
    micr: "",
    pdcType: "LOCAL BANK"
  });
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
  const [paymentPartySuggestions, setPaymentPartySuggestions] = useState([]);
  const [paymentFormData, setPaymentFormData] = useState({
    vDate: new Date().toISOString().split("T")[0],
    vNo: state.payments?.length + 1 || 1,
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
  const [accountSuggestions, setAccountSuggestions] = useState([]);
  const [activeAccountRow, setActiveAccountRow] = useState(null);
  const [journalFormData, setJournalFormData] = useState({
    vDate: new Date().toISOString().split("T")[0],
    vNo: state.journals?.length + 1 || 1,
    narr: "",
    isGst: "N"
  });
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
  const [editChequeBounceId, setEditChequeBounceId] = useState(null);


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
  const [editPDCDocketId, setEditPDCDocketId] = useState(null);
  const [pdcDocketFormData, setPDCDocketFormData] = useState({
    depositDate: new Date().toISOString().split("T")[0],
    docSeries: "PDC",
    docVNo: (state.pdcDockets?.length || 0) + 1,
    fromDate: new Date().toISOString().split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
    houseBank: "",
    bankName: "",
    narration: "",
    clearingType: "SAME BANK",
    clearingDate: "",
    totalAmount: "0.00",
    totalCheques: "0"
  });

  // =========================
  // CONTRA STATES
  // =========================
  // const [showContraForm, setShowContraForm] = useState(false);
  const [editContraId, setEditContraId] = useState(null);
  const [contraFormData, setContraFormData] = useState({
    transactionDate: new Date().toISOString().split("T")[0],
    tranVNo: "",
    transactionType: "CASH DEPOSIT",
    amount: "",
    narration: ""
  });

  // =========================
  // COLLECTION VOUCHER STATES
  // =========================
  // const [showCollectionVoucherForm, setShowCollectionVoucherForm] = useState(false);
  const [editCollectionVoucherId, setEditCollectionVoucherId] = useState(null);
  const [collectionVoucherFormData, setCollectionVoucherFormData] = useState({
    collectionDate: new Date().toISOString().split("T")[0],
    colVNo: "",
    narration: "",
    collectionType: "Bill wise"
  });
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
    billNo,
    baseData = receiptFormData
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

    if (matchingBills.length === 0) {
      setReceiptItems([]);
      setReceiptSummary({
        totalAdjusted: 0,
        balanceAmount: 0,
        totalDiscount: 0
      });

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

    setReceiptFormData({
      ...baseData,
      billSeries: selectedBill.billSeries || "",
      billNo: selectedBill.billNo || "",
      partyName: selectedBill.party || "",
      salesman: selectedBill.salesman || "",
      receiptAmount
    });

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
  const handleReceiptInput = (e) => {
    const { name, value } = e.target;

    const updatedData = {
      ...receiptFormData,
      [name]: value
    };

    if (name === "bankCash" && value === "Cash") {
      updatedData.chequeNo = "";
      updatedData.chequeDate = "";
      updatedData.drawerBank = "";
      updatedData.micr = "";
    }

    setReceiptFormData(updatedData);

    // When both Series and Bill No are available,
    // automatically load the matching bill.
    if (
      (name === "billSeries" || name === "billNo") &&
      updatedData.billSeries.trim() &&
      updatedData.billNo.trim()
    ) {
      setTimeout(() => {
        loadReceiptBillBySeriesNo(
          updatedData.billSeries,
          updatedData.billNo,
          updatedData
        );
      }, 0);
    }
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
      enteredBillNo,
      receiptFormData
    );
  };
  const handlePartyTyping = (e) => {
    const value = e.target.value;
    const searchText = clean(value);

    setPartySearchActive(true);
    setActivePartySuggestionIndex(-1);
    setPartyNotFound(false);

    setReceiptFormData((prev) => ({
      ...prev,
      partyName: value,
      billSeries: "",
      billNo: "",
      salesman: "",
      receiptAmount: ""
    }));

    setReceiptItems([]);

    setReceiptSummary({
      totalAdjusted: 0,
      balanceAmount: 0,
      totalDiscount: 0
    });

    if (!searchText) {
      setPartySuggestions([]);
      setPartyNotFound(false);
      return;
    }

    const matchingBills = pendingBills.filter((bill) => {
      const partyName = clean(bill.party);

      return partyName.includes(searchText);
    });

    const uniqueParties = Array.from(
      new Map(
        matchingBills
          .filter((bill) => String(bill.party || "").trim())
          .map((bill) => [
            clean(bill.party),
            String(bill.party).trim()
          ])
      ).values()
    ).slice(0, 20);

    setPartySuggestions(uniqueParties);
    setPartyNotFound(uniqueParties.length === 0);
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
  const selectParty = (selectedParty) => {
    const filteredBills = pendingBills.filter(
      (bill) => clean(bill.party) === clean(selectedParty)
    );

    // Completely close suggestion and no-result messages
    setPartySuggestions([]);
    setPartyNotFound(false);
    setPartySearchActive(false);
    setActivePartySuggestionIndex(-1);

    if (filteredBills.length === 0) {
      setReceiptItems([]);

      setReceiptSummary({
        totalAdjusted: 0,
        balanceAmount: 0,
        totalDiscount: 0
      });

      setReceiptFormData((prev) => ({
        ...prev,
        partyName: selectedParty,
        billSeries: "",
        billNo: "",
        salesman: "",
        receiptAmount: ""
      }));

      return;
    }

    const billRows = filteredBills.map((bill, index) => {
      const amount = Number(bill.amount) || 0;
      const adjusted = Number(bill.adjusted) || 0;
      const originalBalance = Math.max(amount - adjusted, 0);

      return {
        id: `${bill.billSeries || "NO-SERIES"}-${bill.billNo}-${index}`,
        srNo: index + 1,
        trnSeries: bill.billSeries || "",
        trnNo: bill.billNo || "",
        trnDate: bill.trnDate || "",
        amount,
        adjustAmt: adjusted,
        balanceAmt: originalBalance,
        nowAdjust: 0,
        discount: 0,
        discAmount: 0,
        remark: ""
      };
    });

    setReceiptItems(billRows);

    setReceiptFormData((prev) => ({
      ...prev,
      partyName: selectedParty,
      billSeries: "",
      billNo: "",
      salesman: filteredBills[0]?.salesman || "",
      receiptAmount: ""
    }));

    calculateReceiptSummary(billRows);

    setTimeout(() => {
      const receiptAmountInput = document.querySelector(
        'input[name="receiptAmount"]'
      );

      if (receiptAmountInput) {
        receiptAmountInput.focus();
        receiptAmountInput.select();
      }
    }, 100);
  };

  const saveReceipt = async () => {
    try {
      /*
        Save only bills where:
        - nowAdjust is greater than zero, OR
        - discount amount is greater than zero
      */
      const adjustedReceiptBills = receiptItems
        .filter((item) => {
          const nowAdjust = Number(item.nowAdjust) || 0;

          const discountAmount =
            Number(item.discAmount) ||
            Number(item.discAmt) ||
            0;

          return nowAdjust > 0 || discountAmount > 0;
        })
        .map((item, index) => {
          const nowAdjust = Number(item.nowAdjust) || 0;

          const discountPercent =
            Number(item.discountPercent) ||
            Number(item.discount) ||
            0;

          const discAmt =
            Number(item.discAmt) ||
            Number(item.discAmount) ||
            0;

          return {
            srNo: index + 1,

            // Bill identification
            trnSeries: String(
              item.trnSeries ||
              item.billSeries ||
              ""
            ).trim(),

            trnNo: String(
              item.trnNo ||
              item.billNo ||
              ""
            ).trim(),

            trnDate: item.trnDate || item.billDate || "",

            amount: Number(item.amount) || 0,
            adjustAmt: Number(item.adjustAmt) || 0,
            balanceAmt: Number(item.balanceAmt) || 0,

            nowAdjust,

            // Names must match backend schema
            discountPercent,
            discAmt,

            remark: item.remark || ""
          };
        });

      if (adjustedReceiptBills.length === 0) {
        alert("Please adjust an amount against at least one bill.");
        return;
      }

      const receiptAmount =
        Number(receiptFormData.receiptAmount) || 0;

      if (receiptAmount <= 0) {
        alert("Please enter a valid receipt amount.");
        return;
      }

      const totalAdjusted = adjustedReceiptBills.reduce(
        (sum, item) =>
          sum +
          (Number(item.nowAdjust) || 0),
        0
      );

      const totalDiscount = adjustedReceiptBills.reduce(
        (sum, item) =>
          sum +
          (Number(item.discAmt) || 0),
        0
      );

      if (totalAdjusted > receiptAmount + 0.001) {
        alert(
          `Adjusted amount ₹${totalAdjusted.toFixed(
            2
          )} cannot exceed receipt amount ₹${receiptAmount.toFixed(2)}.`
        );
        return;
      }

      /*
        The receipt header can contain only one Bill Series/Bill No.
        Therefore, put the first adjusted bill in the header.
  
        All adjusted bills are separately saved in receiptBills.
      */
      const firstAdjustedBill = adjustedReceiptBills[0];

      const payload = {
        ...receiptFormData,

        billSeries:
          firstAdjustedBill.trnSeries || "",

        billNo:
          firstAdjustedBill.trnNo || "",

        receiptAmount,

        receiptBills: adjustedReceiptBills
      };

      console.log("RECEIPT SAVE PAYLOAD =", payload);
      console.log(
        "ADJUSTED RECEIPT BILLS =",
        adjustedReceiptBills
      );

      const response = await fetch(
        `${API_URL}/transaction/receipt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Receipt save failed."
        );
      }

      const savedReceipt = result.data;

      const newReceipt = {
        id: savedReceipt?._id || Date.now(),

        header: {
          ...receiptFormData,

          billSeries:
            savedReceipt?.billSeries ||
            firstAdjustedBill.trnSeries ||
            "",

          billNo:
            savedReceipt?.billNo ||
            firstAdjustedBill.trnNo ||
            ""
        },

        // Only adjusted bills in frontend state also
        items:
          savedReceipt?.receiptBills ||
          adjustedReceiptBills,

        receiptBills:
          savedReceipt?.receiptBills ||
          adjustedReceiptBills,

        summary: {
          totalAdjusted,
          totalDiscount,

          balanceAmount:
            receiptAmount - totalAdjusted
        }
      };

      dispatch({
        type: "ADD_RECEIPT",
        payload: newReceipt
      });

      alert("Receipt Saved Successfully");

      resetReceiptForm();

      await loadReceipts();

     // openTransactionList("Receipt");
    } catch (error) {
      console.error(
        "RECEIPT SAVE ERROR =",
        error
      );

      alert(
        error.message || "Receipt Save Failed"
      );
    }
  };
  const resetReceiptForm = () => {
    setEditReceiptId(null);

    setReceiptFormData({
      receiptDate: new Date().toISOString().split("T")[0],
      rno: (state.receipts?.length || 0) + 1,
      billSeries: "",
      billNo: "",
      salesman: "",
      partyName: "",
      narration: "",
      bankCash: "",
      loadNo: "",
      receiptAmount: "",
      chequeNo: "",
      chequeDate: "",
      rloadNo: "",
      drawerBank: "",
      micr: "",
      pdcType: "LOCAL BANK"
    });

    setReceiptItems([]);
    setPartySuggestions([]);
    setReceiptSummary({
      totalAdjusted: 0,
      balanceAmount: 0,
      totalDiscount: 0
    });
  };
  const editReceipt = (receipt) => {
    setEditReceiptId(receipt.id);

    setReceiptFormData({
      ...receipt.header
    });

    setReceiptItems((receipt.items || []).map((item, index) => ({
      ...item,
      srNo: index + 1
    })));

    setReceiptSummary({
      totalAdjusted: Number(receipt.summary?.totalAdjusted) || 0,
      balanceAmount: Number(receipt.summary?.balanceAmount) || 0,
      totalDiscount: Number(receipt.summary?.totalDiscount) || 0
    });

    setPartySuggestions([]);

    setTransactionFormMode(prev => ({
      ...prev,
      Receipt: true
    }));
  };
  const deleteReceipt = (id) => {
    if (!window.confirm("Are you sure you want to delete this receipt?")) return;

    const updatedReceipts = (state.receipts || []).filter(r => r.id !== id);

    dispatch({
      type: "SET_RECEIPTS",
      payload: updatedReceipts
    });

    if (editReceiptId === id) {
      resetReceiptForm();
    }

    alert("Receipt Deleted Successfully");
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
    const validItems = journalItems.filter(
      i => i.accountName && ((Number(i.drAmount) || 0) > 0 || (Number(i.crAmount) || 0) > 0)
    );

    if (validItems.length < 2) {
      alert("Please enter at least 2 journal rows.");
      return;
    }

    if (Number(journalSummary.totalDr) !== Number(journalSummary.totalCr)) {
      alert("Debit and Credit total must be equal.");
      return;
    }

    const resetJournalForm = () => {
      setJournalFormData({
        vDate: new Date().toISOString().split("T")[0],
        vNo: state.journals?.length + 2 || 1, narr: "", isGst: "N"
      });
      setJournalItems([{ id: Date.now(), seqNo: 1, accountCode: "", accountName: "", drAmount: 0, crAmount: 0 }]);
      setJournalSummary({
        totalDr: 0,
        totalCr: 0,
        difference: 0,
        totalEntries: 0
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
      const payload = { id: Date.now(), header: paymentFormData, items: paymentItems, summary: paymentSummary };
      dispatch({ type: "ADD_PAYMENT", payload });
      alert("Payment Saved Successfully");
      resetPaymentForm();
      openTransactionList("Payment");
    };
    const payload = {
      id: Date.now(),
      header: journalFormData,
      items: validItems,
      summary: journalSummary,
      affectsOutstanding: true
    };

    dispatch({ type: "ADD_JOURNAL", payload });

    alert("Journal Voucher Saved Successfully");
    resetJournalForm();

    openTransactionList("Journal Voucher");
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

  const handleSeriesChange = async (e) => {

    const series = e.target.value.toUpperCase();

    localStorage.setItem(
      "chequeBounceSeries",
      series
    );

    setCurrentSeries(series);

    setChequeBounceFormData(prev => ({
      ...prev,
      trnSeries: series
    }));

    const res = await fetch(
      `${API_URL}/transaction/cheque-bounce-next-no/${series}`
    );

    const result = await res.json();

    if (result.success) {

      setChequeBounceFormData(prev => ({
        ...prev,
        trnSeries: series,
        trnNo: result.nextNo,
        chqBounceNo: `${series}${result.nextNo}`
      }));

    }
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


  const saveChequeBounce = async () => {
    const payload = {
      ...chequeBounceFormData
    };


    if (!chequeBounceFormData.trnSeries?.trim()) {
      alert("Enter Transaction Series");
      return;
    }

    if (!chequeBounceFormData.trnNo) {
      alert("Enter Transaction Number");
      return;
    }

    if (!chequeBounceFormData.partyName?.trim()) {
      alert("Select Party");
      return;
    }

    if (!chequeBounceFormData.chequeNo?.trim()) {
      alert("Enter Cheque Number");
      return;
    }
    try {
      const response = await fetch(
        `${API_URL}/transaction/cheque-bounce`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const result =
        await response.json();

      if (result.success) {
        alert(
          "Cheque Bounce Saved Successfully"
        );

        loadChequeBounces();

        resetChequeBounceForm();

        openTransactionList(
          "Cheque Bounce"
        );
      }
    } catch (error) {
      console.log(error);

      alert(
        "Cheque Bounce Save Failed"
      );
    }
  };

  const loadNextChequeBounceNo = async () => {

    const res = await fetch(
      `${API_URL}/transaction/cheque-bounce-next-no/${currentSeries}`
    );

    const result = await res.json();
    if (!result.firstRecord) {

      setChequeBounceFormData(prev => ({
        ...prev,
        trnSeries: result.trnSeries,
        trnNo: result.trnNo,
        isAutoGenerated: true
      }));

    }

    if (!result.success) return;

    if (result.firstRecord) {

      setChequeBounceFormData(prev => ({
        ...prev,
        trnSeries: "",
        trnNo: ""
      }));

      return;
    }

    setChequeBounceFormData(prev => ({
      ...prev,
      trnSeries: result.trnSeries,
      trnNo: result.trnNo
    }));
  };
  const getNextChequeBounceNo = () => {
    return (state.chequeBounces?.length || 0) + 1;
  };

  const resetChequeBounceForm = async () => {

    const res = await fetch(
      `${API_URL}/transaction/cheque-bounce-next-no/${currentSeries}`
    );

    const result = await res.json();

    setChequeBounceFormData({
      chqBounceDate: new Date().toISOString().split("T")[0],

      trnSeries: currentSeries,
      trnNo: "",

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
  };
  const editChequeBounce = (chequeBounce) => {
    setEditChequeBounceId(chequeBounce.id);

    setChequeBounceFormData({
      chqBounceDate: chequeBounce.chqBounceDate || chequeBounce.trndate || new Date().toISOString().split("T")[0],
      chqBounceNo: chequeBounce.chqBounceNo || chequeBounce.trnno || "",
      narration: chequeBounce.narration || "",
      partyName: chequeBounce.partyName || chequeBounce.accountNameDr || "",
      chqBounceCharges: chequeBounce.chqBounceCharges || "0.00",
      chequeNo: chequeBounce.chequeNo || "",
      chequeDate: chequeBounce.chequeDate || "",
      chequeAmt: chequeBounce.chequeAmt || "",
      clearingDate: chequeBounce.clearingDate || "",
      receiptNo: chequeBounce.receiptNo || chequeBounce.recNo || "",
      recNo: chequeBounce.recNo || chequeBounce.receiptNo || "",
      recSeries: chequeBounce.recSeries || "REC",
      bankName: chequeBounce.bankName || chequeBounce.accountNameCr || "",
      totalAmt: chequeBounce.totalAmt || ""
    });

    openTransactionEntry("Cheque Bounce");
  };

  const deleteChequeBounce = (id) => {
    if (window.confirm("Are you sure you want to delete this Cheque Bounce record?")) {
      dispatch({ type: "DELETE_CHEQUE_BOUNCE", payload: id });
    }
  };
  // =========================
  // PDC DOCKET FUNCTIONS
  // =========================
  const handlePDCDocketInput = (e) => {
    const { name, value } = e.target;

    let updatedData = {
      ...pdcDocketFormData,
      [name]: value
    };

    if (name === "houseBank") {
      const selectedBank = bankCashAccounts.find(
        acc => normalize(getBankAccountName(acc)) === normalize(value)
      );

      updatedData.bankName = getBankAccountName(selectedBank || {});
      updatedData.houseBankAccountNo = getBankAccountNo(selectedBank || {});
      updatedData.houseBankIFSC = getBankIFSC(selectedBank || {});
      updatedData.houseBankBranch = getBankBranch(selectedBank || {});
    }

    setPDCDocketFormData(updatedData);

    if (["houseBank", "fromDate", "toDate", "clearingType", "clearingDate"].includes(name)) {
      setTimeout(() => loadPDCDocketGrid(updatedData), 0);
    }
  };

  const savePDCDocket = async () => {

    try {

      const payload = {
        ...pdcDocketFormData,
        cheques: pdcDocketItems
      };

      console.log("PDC SAVE =", payload);

      const response = await fetch(
        `${API_URL}/transaction/pdc-docket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (result.success) {

        alert("PDC Docket Saved Successfully");

        loadPDCDockets();

        resetPDCDocketForm();

        openTransactionList("PDC Docket");

      }

    } catch (err) {

      console.log(err);

      alert("Save Failed");

    }

  };

  const loadPDCDockets = async () => {

    try {

      const response = await fetch(
        `${API_URL}/transaction/pdc-docket`
      );

      const result = await response.json();

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

  const loadContra = async () => {

    try {

      const response = await fetch(
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

  const resetPDCDocketForm = () => {
    setPDCDocketFormData({
      depositDate: new Date().toISOString().split("T")[0],
      docSeries: "PDC",
      docVNo: (state.pdcDockets?.length || 0) + 1,
      fromDate: new Date().toISOString().split("T")[0],
      toDate: new Date().toISOString().split("T")[0],
      houseBank: "",
      bankName: "",
      narration: "",
      clearingType: "SAME BANK",
      clearingDate: "",
      totalAmount: "0.00",
      totalCheques: "0",
      houseBankAccountNo: "",
      houseBankIFSC: "",
      houseBankBranch: ""
    });

    setPDCDocketItems([]);
    setEditPDCDocketId(null);
  };

  const editPDCDocket = (docket) => {

    setEditPDCDocketId(docket._id);

    setPDCDocketFormData({
      ...docket
    });

    setPDCDocketItems(
      docket.cheques || []
    );

    openTransactionEntry("PDC Docket");
  };

  const deletePDCDocket = async (id) => {

    if (!window.confirm("Delete Record ?"))
      return;

    try {

      await fetch(
        `${API_URL}/transaction/pdc-docket/${id}`,
        {
          method: "DELETE"
        }
      );

      loadPDCDockets();

    } catch (err) {

      console.log(err);

    }

  };

  const loadNextContraNo = async () => {
    try {
      const response = await fetch(
        `${API_URL}/transaction/contra-next-no`
      );

      const result = await response.json();

      console.log("NEXT CONTRA =", result);

      if (result.success) {
        setContraFormData(prev => ({
          ...prev,
          tranVNo: result.nextNo
        }));
      }
    } catch (err) {
      console.log(err);
    }
  };

  // =========================
  // CONTRA FUNCTIONS
  // =========================
  const handleContraInput = (e) => {
    const { name, value } = e.target;
    setContraFormData({ ...contraFormData, [name]: value });
  };

  const saveContra = async () => {

    try {

      const response = await fetch(
        `${API_URL}/transaction/contra`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(contraFormData)
        }
      );

      const result = await response.json();

      if (result.success) {

        alert("Saved Successfully");

        loadContra();

        await loadNextContraNo();

        resetContraForm();

        openTransactionList("Contra");
      }
    } catch (err) {

      console.log(err);

      alert("Save Failed");
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
    setEditContraId(contra.id);
    setContraFormData({
      transactionDate: contra.transactionDate, tranVNo: contra.tranVNo,
      transactionType: contra.transactionType, amount: contra.amount, narration: contra.narration || ""
    });
    openTransactionEntry("Contra");
  };

  const deleteContra = async (id) => {

    if (!window.confirm("Delete Record ?"))
      return;

    try {

      await fetch(
        `${API_URL}/transaction/contra/${id}`,
        {
          method: "DELETE"
        }
      );

      loadContra();

    } catch (err) {

      console.log(err);

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

      const payload = {
        ...collectionVoucherFormData,

        totalCollectionAmount,
        totalCashCollection,
        totalChequeCollection,
        totalBills,

        bills: billItems
      };

      const response = await fetch(
        `${API_URL}/transaction/collection-voucher`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );
      const result = await response.json();

      if (result.success) {

        alert("Collection Voucher Saved");

        loadCollectionVouchers();

        openTransactionList(
          "Collection Voucher"
        );

      }

    } catch (err) {

      console.log(err);

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

      const response = await fetch(
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
  const loadCollectionVouchers = async () => {

    const response = await fetch(
      "${API_URL}/transaction/collection-voucher"
    );

    const result = await response.json();

    if (result.success) {

      dispatch({
        type: "SET_COLLECTION_VOUCHERS",
        payload: result.data
      });

    }

  };

  const loadNextCollectionVoucherNo = async () => {

    const response = await fetch(
      `${API_URL}/transaction/collection-voucher-next-no`
    );

    const result = await response.json();

    if (result.success) {

      setCollectionVoucherFormData(prev => ({
        ...prev,
        colVNo: result.nextNo
      }));

    }
  };

  const resetCollectionVoucherForm = () => {
    setCollectionVoucherFormData({
      collectionDate: new Date().toISOString().split("T")[0], colVNo: "", narration: "", collectionType: "Bill wise"
    });
    setBillItems([]);
    setTotalCollectionAmount(0);
    setTotalCashCollection(0);
    setTotalChequeCollection(0);
    setTotalBills(0);
    setEditCollectionVoucherId(null);
  };

  const editCollectionVoucher = (voucher) => {
    setEditCollectionVoucherId(voucher.id);
    setCollectionVoucherFormData({
      collectionDate: voucher.collectionDate, colVNo: voucher.colVNo,
      narration: voucher.narration || "", collectionType: voucher.collectionType
    });
    if (voucher.selectedBills) {
      setBillItems(voucher.selectedBills);
      setTotalCollectionAmount(voucher.totalCollectionAmount);
      setTotalCashCollection(voucher.totalCashCollection);
      setTotalChequeCollection(voucher.totalChequeCollection);
      setTotalBills(voucher.totalBills);
    }
    openTransactionEntry("Collection Voucher");
  };

  const deleteCollectionVoucher = (id) => {
    if (window.confirm("Are you sure you want to delete this Collection Voucher record?")) {
      dispatch({ type: "DELETE_COLLECTION_VOUCHER", payload: id });
    }
  };

  // =========================
  // RENDER FUNCTIONS
  // =========================


  const loadReceipts = async () => {
    try {
      console.log("LOAD RECEIPTS START");

      const response = await fetch(
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

  const loadChequeBounces = async () => {
    try {
      const res = await fetch(
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

  const renderReceiptList = () => (
    <div className="receipt-sales-list-section">
      <div className="receipt-sales-list-header">
        <h3>Receipt List ({state.receipts.length})</h3>

        <div className="receipt-sales-list-actions">
          <input className="receipt-sales-search" type="text" placeholder="Search..." />
          <button className="receipt-export-excel">📊 Export Excel</button>
          <button className="receipt-export-pdf">📄 Export PDF</button>
        <button
  type="button"
  className="receipt-settle-load-btn"
  onClick={() =>
    window.dispatchEvent(
      new CustomEvent("openSettleLoad")
    )
  }
>
  Settle Load
</button>

<button
  type="button"
  className="receipt-add-btn"
  onClick={() => {
    resetReceiptForm();
    openTransactionEntry("Receipt");
  }}
>
  + Add Receipt
</button>
        </div>
      </div>

      <div className="receipt-sales-table-wrap">
        <table className="receipt-sales-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Series</th>
              <th>Voucher No</th>
              <th>Credit Account<br /></th>
              <th>Amount</th>
              <th>Debit Account<br /></th>
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
              <th className="receipt-sticky-action-head">Actions</th>
            </tr>
          </thead>

          <tbody>
            {state.receipts.length === 0 ? (
              <tr>
                <td colSpan="17" className="no-data">No Receipts Added</td>
              </tr>
            ) : (
              state.receipts.map((receipt) => {
                const header = receipt.header || {};
                const summary = receipt.summary || {};

                return (
                  <tr key={receipt.id}>
                    <td>{header.receiptDate || "-"}</td>
                    <td>{header.billSeries || "-"}</td>
                    <td>{header.rno || header.billNo || "-"}</td>
                    <td>{header.partyName || "-"}</td>
                    <td className="amount-cell">
                      ₹{Number(summary.totalAdjusted || header.receiptAmount || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td>{header.bankCash || "-"}</td>
                    <td>{header.chequeNo || "-"}</td>
                    <td>{header.chequeDate || "-"}</td>
                    <td>{header.salesman || "-"}</td>
                    <td>{header.narration || "-"}</td>
                    <td>{header.bankCode || header.micr || "-"}</td>
                    <td>{header.loadNo || header.rloadNo || "-"}</td>
                    <td>{header.addUser || "Admin"}</td>
                    <td>{header.editUser || "-"}</td>
                    <td>{header.editDateTime || "-"}</td>
                    <td>{header.docketNo || "-"}</td>

                    <td className="receipt-sticky-action-cell">
                      <div className="receipt-action-buttons">
                        <button className="btn-view" onClick={() => editReceipt(receipt)}>👁️ View</button>
                        <button className="btn-edit" onClick={() => editReceipt(receipt)}>✏️ Edit</button>
                        <button className="btn-delete" onClick={() => deleteReceipt(receipt.id)}>🗑 Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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

  const getPDCDocketReceipts = (formData = pdcDocketFormData) => {
    const fromDate = getPdcDateValue(formData.fromDate);
    const toDate = getPdcDateValue(formData.toDate);
    const selectedHouseBank = clean(formData.houseBank || formData.bankName);
    const clearingType = clean(formData.clearingType).replace(/\s+/g, " ");

    if (!selectedHouseBank || !fromDate || !toDate) return [];

    return (state.receipts || [])
      .filter((receipt) => {
        const h = receipt.header || {};

        if (!h.chequeNo) return false;
        if (!h.bankCash || clean(h.bankCash) === "cash") return false;

        const chequeDate = getPdcDateValue(h.chequeDate);
        if (!chequeDate) return false;

        if (chequeDate < fromDate || chequeDate > toDate) return false;

        const distributorBank = clean(h.bankCash);
        const customerBank = clean(h.drawerBank);

        if (clearingType === "same bank") {
          return (
            distributorBank === selectedHouseBank &&
            customerBank === selectedHouseBank
          );
        }

        if (clearingType === "local bank") {
          return (
            distributorBank === selectedHouseBank &&
            customerBank !== selectedHouseBank
          );
        }

        if (clearingType === "outside bank") {
          return distributorBank !== selectedHouseBank;
        }

        return distributorBank === selectedHouseBank;
      })
      .map((receipt, index) => {
        const h = receipt.header || {};
        const amount = Number(
          receipt.summary?.totalAdjusted || h.receiptAmount || 0
        );

        return {
          id: receipt.id,
          selected: true,
          srNo: index + 1,
          chequeNo: h.chequeNo || "",
          chequeDate: h.chequeDate || "",
          amount,
          clearingDate: formData.clearingDate || h.chequeDate || "",
          recSeries: h.billSeries || "REC",
          recNo: h.rno || "",

          // CUSTOMER BANK should load here, not distributor bank
          recTrnBank: h.drawerBank || "",

          // BRANCH from Customer Bank Details
          branch: getCustomerBankBranch(h.partyName, h.drawerBank),

          partyCode: h.partyCode || "",
          partyName: h.partyName || ""
        };
      });
  };

  const loadPDCDocketGrid = (formData = pdcDocketFormData) => {
    const rows = getPDCDocketReceipts(formData);

    const totalAmount = rows.reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0
    );

    setPDCDocketItems(rows);

    setPDCDocketFormData((prev) => ({
      ...prev,
      ...formData,
      totalAmount: totalAmount.toFixed(2),
      totalCheques: rows.length
    }));
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
              name="rno"
              value={receiptFormData.rno || ""}
              onChange={handleReceiptInput}
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
              value={receiptFormData.drawerBank || ""}
              onChange={handleReceiptInput}
              disabled={receiptFormData.bankCash === "Cash"}
            >
              <option value="">Select Customer Bank</option>

              {filteredCustomerBanks.map((bank, index) => {
                const bankName = getCustomerBankName(bank);

                if (!bankName) return null;

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
              })}
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

  // Journal List
  const renderJournalList = () => (
    <div className="master-section"><div className="grid-header"><h3>Journal Voucher Management</h3><button className="btn-add-new" onClick={() => { openTransactionEntry("Journal Voucher"); if (journalItems.length === 0) addJournalRow(); }}>+ Add Journal Voucher</button></div>
      <div className="table-responsive"><table className="erp-table"><thead><tr><th>VNo</th><th>VDate</th><th>Narration</th><th>Total Dr</th><th>Total Cr</th><th>Actions</th></tr></thead>
        <tbody>{state.journals.length === 0 ? (<tr><td colSpan="5">No Journal Vouchers Added</td></tr>) : (state.journals.map((journal) => (<tr key={journal.id}><td>{journal.header.vNo}</td><td>{journal.header.vDate}</td><td>{journal.header.narr}</td><td>₹ {journal.summary.totalDr.toFixed(2)}</td><td>₹ {journal.summary.totalCr.toFixed(2)}</td>
          <td
            className="action-buttons"
            style={{
              whiteSpace: 'nowrap',
              position: 'sticky',
              right: 0,
              backgroundColor: '#ffffff',
              zIndex: 10,
              boxShadow: '-2px 0 5px -2px rgba(0,0,0,0.1)'
            }}
          >

            <button
              className="btn-view"
              onClick={() => {
                setTransactionFormMode(prev => ({
                  ...prev,
                  ["Journal Voucher"]: true
                }));

                editJournal(journal);
              }}
              title="View"
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                margin: '0 2px',
                cursor: 'pointer'
              }}
            >
              👁️ View
            </button>

            <button
              className="btn-edit"
              onClick={() => {
                setTransactionFormMode(prev => ({
                  ...prev,
                  ["Journal Voucher"]: true
                }));

                editJournal(journal);
              }}
              title="Edit"
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                margin: '0 2px',
                cursor: 'pointer'
              }}
            >
              ✏️ Edit
            </button>

            <button
              className="btn-delete"
              onClick={() => deleteJournal(journal.id)}
              title="Delete"
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                margin: '0 2px',
                cursor: 'pointer'
              }}
            >
              🗑 Delete
            </button>

          </td>
        </tr>)))}</tbody></table></div></div>
  );

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
                name="vNo"
                value={journalFormData.vNo || ""}
                onChange={handleJournalInput}
                placeholder="Enter voucher no"
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

  // Payment List
  const renderPaymentList = () => (
    <div className="master-section"><div className="grid-header"><h3>Payment Management</h3><button className="btn-add-new" onClick={() => openTransactionEntry("Payment")}>+ Add Payment</button></div>
      <div className="table-responsive"><table className="erp-table"><thead><tr><th>VNo</th><th>Date</th><th>Party</th><th>Dr Amt</th><th>Cr Amt</th><th>Actions</th></tr></thead>
        <tbody>{(state.payments || []).length === 0 ? (<tr><td colSpan="5">No Payments Added</td></tr>) : ((state.payments || []).map((payment) => (<tr key={payment.id}><td>{payment.header.vNo}</td><td>{payment.header.vDate}</td><td>{payment.header.partyName}</td><td>{payment.header.drAmt}</td><td>{payment.header.crAmt}</td>
          <td
            className="action-buttons"
            style={{
              whiteSpace: 'nowrap',
              position: 'sticky',
              right: 0,
              backgroundColor: '#ffffff',
              zIndex: 10,
              boxShadow: '-2px 0 5px -2px rgba(0,0,0,0.1)'
            }}
          >

            <button
              className="btn-view"
              onClick={() => {
                setTransactionFormMode(prev => ({
                  ...prev,
                  Payment: true
                }));

                editPayment(payment);
              }}
              title="View"
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                margin: '0 2px',
                cursor: 'pointer'
              }}
            >
              👁️ View
            </button>

            <button
              className="btn-edit"
              onClick={() => {
                setTransactionFormMode(prev => ({
                  ...prev,
                  Payment: true
                }));

                editPayment(payment);
              }}
              title="Edit"
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                margin: '0 2px',
                cursor: 'pointer'
              }}
            >
              ✏️ Edit
            </button>

            <button
              className="btn-delete"
              onClick={() => deletePayment(payment.id)}
              title="Delete"
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                margin: '0 2px',
                cursor: 'pointer'
              }}
            >
              🗑 Delete
            </button>

          </td></tr>)))}</tbody></table></div></div>
  );

  // Payment Form
  const renderPaymentForm = () => (
    <div className="payment-section"><div className="form-section"><div className="section-header">Add Payment Information</div>
      <div className="payment-header-grid"><div className="labeled-input"><label>VDate</label><input type="date" name="vDate" value={paymentFormData.vDate} onChange={handlePaymentInput} /></div>
        <div className="labeled-input"><label>VNo</label><input name="vNo" value={paymentFormData.vNo} onChange={handlePaymentInput} /></div>
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
  const renderChequeBounceList = () => (
    <div className="receipt-sales-list-section">
      <div className="receipt-sales-list-header">
        <h3>Cheque Bounce List ({state.chequeBounces?.length || 0})</h3>

        <div className="receipt-sales-list-actions">
          <input className="receipt-sales-search" type="text" placeholder="Search..." />
          <button className="receipt-export-excel">📊 Export Excel</button>
          <button className="receipt-export-pdf">📄 Export PDF</button>
          <button
            className="receipt-settle-load-btn"
            onClick={() => {
              resetChequeBounceForm();
              setTransactionFormMode(prev => ({
                ...prev,
                ["Cheque Bounce"]: true
              }));
            }}
          >
            + Add Cheque Bounce
          </button>
        </div>
      </div>

      <div className="receipt-sales-table-wrap">
        <table className="receipt-sales-table">
          <thead>
            <tr>
              <th>Trn Date</th>
              <th>Trn Series</th>
              <th>Trn No</th>
              <th>Account Name Dr</th>
              <th>Account Name Cr</th>
              <th>Cheque No</th>
              <th>Cheque Date</th>
              <th>Cheque Amount</th>
              <th>Chq Bounce Charges Amt</th>
              <th>Total Amount</th>
              <th>Rec Series</th>
              <th>Rec No</th>
              <th>Narration</th>
              <th className="receipt-sticky-action-head">Actions</th>
            </tr>
          </thead>

          <tbody>
            {(state.chequeBounces || []).length === 0 ? (
              <tr>
                <td colSpan="14" className="no-data">
                  No Cheque Bounce Records Added
                </td>
              </tr>
            ) : (
              (state.chequeBounces || []).map((chequeBounce) => (
                <tr key={chequeBounce.id}>
                  <td>{chequeBounce.chqBounceDate || "-"}</td>
                  <td>{chequeBounce.trnSeries || "CHB"}</td>
                  <td>{chequeBounce.chqBounceNo || "-"}</td>
                  <td>{chequeBounce.accountNameDr || chequeBounce.partyName || "-"}</td>
                  <td>{chequeBounce.accountNameCr || chequeBounce.bankName || "-"}</td>
                  <td>{chequeBounce.chequeNo || "-"}</td>
                  <td>{chequeBounce.chequeDate || "-"}</td>

                  <td className="amount-cell">
                    ₹{Number(chequeBounce.chequeAmt || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>

                  <td className="amount-cell">
                    ₹{Number(chequeBounce.chqBounceCharges || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>

                  <td className="amount-cell">
                    ₹{Number(
                      chequeBounce.totalAmt ||
                      ((Number(chequeBounce.chequeAmt) || 0) +
                        (Number(chequeBounce.chqBounceCharges) || 0))
                    ).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>

                  <td>{chequeBounce.recSeries || "REC"}</td>
                  <td>{chequeBounce.recNo || chequeBounce.receiptNo || "-"}</td>
                  <td>{chequeBounce.narration || "-"}</td>

                  <td className="receipt-sticky-action-cell">
                    <div className="receipt-action-buttons">

                      <button
                        className="btn-view"
                        onClick={() => editChequeBounce(chequeBounce)}
                      >
                        👁️ View
                      </button>

                      <button
                        className="btn-edit"
                        onClick={() => editChequeBounce(chequeBounce)}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        className="btn-delete"
                        onClick={() => deleteChequeBounce(chequeBounce.id)}
                      >
                        🗑 Delete
                      </button>

                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
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
                  {chequeBounceFormData.chqBounceNo || "-"}
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
                name="chqBounceNo"
                value={chequeBounceFormData.chqBounceNo || ""}
                readOnly
                className="cheque-bounce-readonly"
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

  // PDC Docket List
  const renderPDCDocketList = () => (
    <div className="receipt-sales-list-section">
      <div className="receipt-sales-list-header">
        <h3>PDC Docket List ({state.pdcDockets?.length || 0})</h3>

        <div className="receipt-sales-list-actions">
          <input className="receipt-sales-search" type="text" placeholder="Search..." />
          <button className="receipt-export-excel">📊 Export Excel</button>
          <button className="receipt-export-pdf">📄 Export PDF</button>

          <button
            className="receipt-settle-load-btn"
            onClick={() => {
              resetPDCDocketForm();
              openTransactionEntry("PDC Docket");
            }}
          >
            + Add PDC Docket
          </button>
        </div>
      </div>

      <div className="receipt-sales-table-wrap">
        <table className="receipt-sales-table">
          <thead>
            <tr>
              <th>Deposit Date</th>
              <th>PDC Series</th>
              <th>PDC No</th>
              <th>House Bank</th>
              <th>From Cheq Date</th>
              <th>To Date</th>
              <th>PDC Type</th>
              <th>Total Amount</th>
              <th>Total Cheques</th>
              <th>Clearing Date</th>
              <th>Narration</th>
              <th>Add User</th>
              <th>Add Date</th>
              <th>Edit User</th>
              <th>Edit Date</th>
              <th className="receipt-sticky-action-head">Actions</th>
            </tr>
          </thead>

          <tbody>
            {(state.pdcDockets || []).length === 0 ? (
              <tr>
                <td colSpan="16" className="no-data">
                  No PDC Dockets Added
                </td>
              </tr>
            ) : (
              (state.pdcDockets || []).map((docket) => {
                const h = docket.header || docket;

                return (
                  <tr key={docket._id}>
                    <td>{h.depositDate || "-"}</td>
                    <td>{h.docSeries || h.pdcSeries || h.series || "-"}</td>

                    <td>{h.pdcNo || h.docVNo || "-"}</td>
                    <td>
                      {h.houseBank ||
                        h.bankName ||
                        h.houseBankName ||
                        "-"}
                    </td>
                    <td>{h.fromDate || "-"}</td>
                    <td>{h.toDate || "-"}</td>
                    <td>{h.clearingType || h.pdcType || "-"}</td>

                    <td className="amount-cell">
                      ₹{Number(h.totalAmount || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>

                    <td>{h.totalCheques || "-"}</td>
                    <td>{h.clearingDate || "-"}</td>
                    <td>{h.narration || "-"}</td>
                    <td>{h.addUser || "-"}</td>
                    <td>{h.addDate || "-"}</td>
                    <td>{h.editUser || "-"}</td>
                    <td>{h.editDate || "-"}</td>

                    <td className="receipt-sticky-action-cell">
                      <div className="receipt-action-buttons">
                        <button
                          className="btn-view"
                          onClick={() => {
                            setTransactionFormMode(prev => ({
                              ...prev,
                              ["PDC Docket"]: true
                            }));
                            editPDCDocket(docket);
                          }}
                        >
                          👁️ View
                        </button>

                        <button
                          className="btn-edit"
                          onClick={() => {
                            setTransactionFormMode(prev => ({
                              ...prev,
                              ["PDC Docket"]: true
                            }));
                            editPDCDocket(docket);
                          }}
                        >
                          ✏️ Edit
                        </button>

                        <button
                          className="btn-print pdc-print-btn"
                          onClick={() => printPDCDocket(docket)}
                          title="Print"
                        >
                          <span className="pdc-print-icon">🖨️</span>
                          Print
                        </button>

                        <button
                          className="btn-delete"
                          onClick={() => deletePDCDocket(docket._id)}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
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
                name="docVNo"
                value={pdcDocketFormData.docVNo || ""}
                onChange={handlePDCDocketInput}
                placeholder="Enter docket no"
              />
            </div>

            <div className="pdc-field">
              <label>
                House Bank <span>*</span>
              </label>

              <select
                name="houseBank"
                value={pdcDocketFormData.houseBank || ""}
                onChange={handlePDCDocketInput}
              >
                <option value="">Select Bank</option>

                {bankCashAccounts.map((account, index) => {
                  const bankName = getBankAccountName(account);

                  if (!bankName) return null;

                  return (
                    <option
                      key={
                        account._id ||
                        account.id ||
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
                      colSpan="11"
                      className="pdc-empty-row"
                    >
                      Select House Bank, Clearing Type,
                      From Date and To Date to load cheques
                    </td>
                  </tr>
                ) : (
                  pdcDocketItems.map((item, index) => (
                    <tr key={item.id || item._id || index}>
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

  // Contra List
  const renderContraList = () => (
    <div className="master-section"><div className="grid-header"><h3>Bank Deposit/Withdrawal</h3><button className="btn-add-new btn-contra" onClick={() => { resetContraForm(); openTransactionEntry("Contra"); }}>+ Add Transaction</button></div>
      <div className="table-responsive"><table className="erp-table"><thead><tr><th>Tran VNo.</th><th>Date</th><th>Type</th><th>Amount</th><th>Narration</th><th>Actions</th></tr></thead>
        <tbody>{state.contra?.length === 0 ? (<tr><td colSpan="6" className="no-data">No Transactions Added</td></tr>) : (state.contra?.map((transaction) => (<tr key={transaction.id}><td>{transaction.tranVNo || '-'}</td><td>{transaction.transactionDate}</td><td>{transaction.transactionType}</td><td>₹{parseFloat(transaction.amount || 0).toFixed(2)}</td><td>{transaction.narration || '-'}</td>
          <td
            className="action-buttons"
            style={{
              whiteSpace: 'nowrap',
              position: 'sticky',
              right: 0,
              backgroundColor: '#ffffff',
              zIndex: 10,
              boxShadow: '-2px 0 5px -2px rgba(0,0,0,0.1)'
            }}
          >

            <button
              className="btn-view"
              onClick={() => {
                setTransactionFormMode(prev => ({
                  ...prev,
                  Contra: true
                }));

                editContra(transaction);
              }}
              title="View"
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                margin: '0 2px',
                cursor: 'pointer'
              }}
            >
              👁️ View
            </button>

            <button
              className="btn-edit"
              onClick={() => {
                setTransactionFormMode(prev => ({
                  ...prev,
                  Contra: true
                }));

                editContra(transaction);
              }}
              title="Edit"
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                margin: '0 2px',
                cursor: 'pointer'
              }}
            >
              ✏️ Edit
            </button>

            <button
              className="btn-delete"
              onClick={() => deleteContra(transaction.id)}
              title="Delete"
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                margin: '0 2px',
                cursor: 'pointer'
              }}
            >
              🗑 Delete
            </button>

          </td></tr>)))}</tbody></table></div></div>
  );

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
                name="tranVNo"
                value={contraFormData.tranVNo || ""}
                onChange={handleContraInput}
                placeholder="Enter voucher number"
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

  // Collection Voucher List
  const renderCollectionVoucherList = () => (
    <div className="master-section"><div className="grid-header"><h3>Collection Voucher</h3><button className="btn-add-new btn-collection-voucher" onClick={() => { resetCollectionVoucherForm(); openTransactionEntry("Collection Voucher"); }}>+ Add Collection Voucher</button></div>
      <div className="table-responsive"><table className="erp-table"><thead><tr><th>Col VNo.</th><th>Collection Date</th><th>Collection Type</th><th>Total Amount</th><th>Total Bills</th><th>Actions</th></tr></thead>
        <tbody>{state.collectionVouchers?.length === 0 ? (<tr><td colSpan="6" className="no-data">No Collection Vouchers Added</td></tr>) : (state.collectionVouchers?.map((voucher) => (<tr key={voucher.id}><td>{voucher.colVNo || '-'}</td><td>{voucher.collectionDate}</td><td>{voucher.collectionType}</td><td>₹{parseFloat(voucher.totalCollectionAmount || 0).toFixed(2)}</td><td>{voucher.totalBills || 0}</td>
          <td
            className="action-buttons"
            style={{
              whiteSpace: 'nowrap',
              position: 'sticky',
              right: 0,
              backgroundColor: '#ffffff',
              zIndex: 10,
              boxShadow: '-2px 0 5px -2px rgba(0,0,0,0.1)'
            }}
          >

            <button
              className="btn-view"
              onClick={() => {
                setTransactionFormMode(prev => ({
                  ...prev,
                  ["Collection Voucher"]: true
                }));

                editCollectionVoucher(voucher);
              }}
              title="View"
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                margin: '0 2px',
                cursor: 'pointer'
              }}
            >
              👁️ View
            </button>

            <button
              className="btn-edit"
              onClick={() => {
                setTransactionFormMode(prev => ({
                  ...prev,
                  ["Collection Voucher"]: true
                }));

                editCollectionVoucher(voucher);
              }}
              title="Edit"
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                margin: '0 2px',
                cursor: 'pointer'
              }}
            >
              ✏️ Edit
            </button>

            <button
              className="btn-delete"
              onClick={() => deleteCollectionVoucher(voucher.id)}
              title="Delete"
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                margin: '0 2px',
                cursor: 'pointer'
              }}
            >
              🗑 Delete
            </button>

          </td></tr>)))}</tbody></table></div></div>
  );
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
            name="rno"
            value={receiptFormData.rno}
            onChange={handleReceiptInput}
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
                  name="colVNo"
                  value={collectionVoucherFormData.colVNo}
                  onChange={handleCollectionVoucherInput}
                  placeholder="Col VNo"
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