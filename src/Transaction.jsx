  import React, { useState, useCallback, useEffect } from "react";
  import "./Transaction.css";
  import { useERP } from "./context/ERPContext";

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
    const { state, dispatch } = useERP();

    const [billItems, setBillItems] = useState([]);

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
    const [receiptFormData, setReceiptFormData] = useState({
      receiptDate: new Date().toISOString().split("T")[0],
      rno: state.receipts.length + 1,
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
      chqBounceNo: "",
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
  const getCollectionPendingBills = () => {
  return (pendingBills || []).map((bill, index) => {
    const areaValue = pickValue(
      bill.areaCode,
      bill.areaName,
      bill.area,
      bill.header?.areaCode,
      bill.header?.areaName,
      bill.header?.area
    );

    const salesmanValue = pickValue(
      bill.salesmanCode,
      bill.salesmanName,
      bill.salesman,
      bill.header?.salesmanCode,
      bill.header?.salesmanName,
      bill.header?.salesman
    );

    return {
      id: `${bill.billSeries}-${bill.billNo}-${index}`,
      billSeries: bill.billSeries || "",
      billNo: bill.billNo || "",
      billDate: bill.trnDate || bill.billDate || "",
      partyCode: bill.partyCode || "",
      partyName: bill.party || bill.partyName || "",
      billAmt: Number(bill.amount) || 0,
      oldCollection: Number(bill.adjusted) || 0,
      balance: Number(bill.balance) || 0,

      salesmanCode: salesmanValue,
      salesmanName: salesmanValue,

      areaCode: areaValue,
      areaName: areaValue,

      selected: false,
      collectionAmt: 0,
      discount: 0,
      recSeries: "",
      recVNo: ""
    };
  });
};
 const getUniqueSalesmen = () => {
  const bills = getCollectionPendingBills();
  const salesmanMap = new Map();

  (salesmen || []).forEach((s) => {
    const code = String(s.code || s.salesmanCode || s.id || "").trim();
    const name = String(s.name || s.salesmanName || s.salesman || code).trim();

    if (!code && !name) return;

    const key = clean(name || code);

    salesmanMap.set(key, {
      code: code || name,
      name: name || code,
      selected: false,
      bills: []
    });
  });

  bills.forEach((bill) => {
    const billSalesmanKey = clean(bill.salesmanName || bill.salesmanCode);

    if (salesmanMap.has(billSalesmanKey)) {
      salesmanMap.get(billSalesmanKey).bills.push(bill);
    }
  });

  return Array.from(salesmanMap.values());
};


const getUniqueAreas = () => {
  const bills = getCollectionPendingBills();
  const areaMap = new Map();

  (areas || []).forEach((a) => {
    const code = String(a.code || a.areaCode || a.id || "").trim();
    const name = String(a.name || a.areaName || a.area || code).trim();

    if (!code && !name) return;

    const key = clean(name || code);

    areaMap.set(key, {
      code: code || name,
      name: name || code,
      selected: false,
      bills: []
    });
  });

  bills.forEach((bill) => {
    const billAreaKey = clean(bill.areaName || bill.areaCode);

    if (areaMap.has(billAreaKey)) {
      areaMap.get(billAreaKey).bills.push(bill);
    } else if (bill.areaName || bill.areaCode) {
      const areaName = bill.areaName || bill.areaCode;
      areaMap.set(clean(areaName), {
        code: areaName,
        name: areaName,
        selected: false,
        bills: [bill]
      });
    }
  });

  return Array.from(areaMap.values());
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
              <h3>Select Pending Bills</h3>
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
                     <th>
  <input
    type="checkbox"
    checked={allCollectionBillsSelected}
    onChange={(e) => handleSelectAllCollectionBills(e.target.checked)}
  />{" "}
  All
</th>
                      <th>Bill Series</th>
                      <th>Bill No</th>
                      <th>Bill Date</th>
                      <th>Party Code</th>
                      <th>Party Name</th>
                      <th>Bill Amt</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="no-data">No pending bills available</td>
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
                          <td>{bill.billSeries || "26-27"}</td>
                          <td>{bill.billNo}</td>
                          <td>{bill.billDate}</td>
                          <td>{bill.partyCode}</td>
                          <td>{bill.partyName}</td>
                          <td className="amount-cell">₹{bill.billAmt.toFixed(2)}</td>
                          <td className="amount-cell">₹{bill.balance.toFixed(2)}</td>
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
                      <th style={{ width: "40px" }}>
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Salesman Code</th>
                      <th>Salesman Name</th>
                      <th>Total Bills</th>
                      <th>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesmen.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="no-data">No salesmen available</td>
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
                          <td>{salesman.code}</td>
                          <td>{salesman.name}</td>
                          <td className="text-center">{salesman.bills.length}</td>
                          <td className="amount-cell">
                            ₹{salesman.bills.reduce((sum, b) => sum + b.balance, 0).toFixed(2)}
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
                      <th style={{ width: "40px" }}>
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Area Code</th>
                      <th>Area Name</th>
                      <th>Total Bills</th>
                      <th>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areas.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="no-data">No areas available</td>
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
                          <td>{area.code}</td>
                          <td>{area.name}</td>
                          <td className="text-center">{area.bills.length}</td>
                          <td className="amount-cell">
                            ₹{area.bills.reduce((sum, b) => sum + b.balance, 0).toFixed(2)}
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
  return (state.receipts || []).reduce((sum, receipt) => {
    return sum + (receipt.items || [])
      .filter(i =>
        clean(i.trnSeries) === clean(billSeries) &&
        clean(i.trnNo) === clean(billNo)
      )
      .reduce(
        (s, i) =>
          s + (Number(i.nowAdjust) || 0) + (Number(i.discAmount) || 0),
        0
      );
  }, 0);
};

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
        invoice.party,
        invoice.customerName,
        header.partyName,
        header.party,
        header.customerName
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
    const openSelectionModal = (type) => {
      setCurrentSelectionType(type);
      if (type === "Bill wise") {
        setShowBillSelectionModal(true);
      } else if (type === "Salesman wise") {
        setShowSalesmanSelectionModal(true);
      } else if (type === "Area wise") {
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
      collectionAmt: 0,
      selected: bill.selected || false
    }))
  );
};

 const handleSalesmanSelectionConfirm = (selectedSalesmenData) => {
  const allBills = [];

  selectedSalesmenData.forEach((salesman) => {
    if (salesman.selected) {
      (salesman.bills || []).forEach((bill) => {
        allBills.push({
          ...bill,
          selected: true,
          collectionAmt: 0
        });
      });
    }
  });

  setBillItems(allBills);
};

const handleAreaSelectionConfirm = (selectedAreasData) => {
  const allBills = [];

  selectedAreasData.forEach((area) => {
    if (area.selected) {
      (area.bills || []).forEach((bill) => {
        allBills.push({
          ...bill,
          selected: true,
          collectionAmt: 0
        });
      });
    }
  });

  setBillItems(allBills);
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
  const receiptLimit = Number(receiptFormData.receiptAmount) || 0;
  const items = [...receiptItems];

  if (field === "nowAdjust") {
    const enteredValue = Math.max(Number(value) || 0, 0);

    const otherRowsTotal = items.reduce((sum, item, i) => {
      if (i === index) return sum;
      return sum + (Number(item.nowAdjust) || 0);
    }, 0);

    const remainingReceiptAmount = Math.max(receiptLimit - otherRowsTotal, 0);
    const rowBalance = Number(items[index].balanceAmt) || Number(items[index].amount) || 0;

    items[index].nowAdjust = Math.min(enteredValue, remainingReceiptAmount, rowBalance);
  } else {
    items[index][field] = value;
  }

  const amount = Number(items[index].amount) || 0;
  const adjusted = Number(items[index].adjustAmt) || 0;
  const nowAdjust = Number(items[index].nowAdjust) || 0;
  const discount = Number(items[index].discount) || 0;

  const discAmount = (nowAdjust * discount) / 100;

  items[index].discAmount = discAmount.toFixed(2);
  items[index].balanceAmt = Math.max(
    amount - adjusted - nowAdjust - discAmount,
    0
  ).toFixed(2);

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
const loadReceiptBillBySeriesNo = (billSeries, billNo, baseData = receiptFormData) => {
  if (!billSeries || !billNo) return false;

  const selectedBill = pendingBills.find(
    (b) =>
      clean(b.billSeries) === clean(billSeries) &&
      clean(b.billNo) === clean(billNo)
  );

  if (!selectedBill) {
    setReceiptItems([]);
    setReceiptSummary({ totalAdjusted: 0, balanceAmount: 0, totalDiscount: 0 });
    return false;
  }

  const partyBills = pendingBills.filter(
    (b) => clean(b.party) === clean(selectedBill.party)
  );

  const orderedBills = [
    selectedBill,
    ...partyBills.filter(
      (b) =>
        !(
          clean(b.billSeries) === clean(selectedBill.billSeries) &&
          clean(b.billNo) === clean(selectedBill.billNo)
        )
    )
  ];

  // IMPORTANT: when bill is entered, receipt amount should become entered bill balance
  const receiptAmt = Number(selectedBill.balance) || 0;

  const billRows = distributeReceiptAmountToBills(orderedBills, receiptAmt);

  setReceiptItems(billRows);

  setReceiptFormData({
    ...baseData,
    billSeries: selectedBill.billSeries,
    billNo: selectedBill.billNo,
    partyName: selectedBill.party,
    salesman: selectedBill.salesman,
    receiptAmount: receiptAmt
  });

  calculateReceiptSummary(billRows);

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

  if (name === "billSeries" || name === "billNo") {
    const nextSeries = name === "billSeries" ? value : updatedData.billSeries;
    const nextBillNo = name === "billNo" ? value : updatedData.billNo;

    if (nextSeries && nextBillNo) {
      setTimeout(() => {
        loadReceiptBillBySeriesNo(nextSeries, nextBillNo, updatedData);
      }, 0);
    }
  }
};

    const handlePartyTyping = (e) => {
      const value = e.target.value;
      setReceiptFormData(prev => ({ ...prev, partyName: value }));
      if (!value.trim()) {
        setPartySuggestions([]);
        setReceiptItems([]);
        return;
      }
      const matches = pendingBills.filter(bill => String(bill.party).toLowerCase().includes(value.toLowerCase()));
      const uniqueParties = [...new Set(matches.map(bill => bill.party))];
      setPartySuggestions(uniqueParties);
    };

    const selectParty = (selectedParty) => {
      setReceiptFormData(prev => ({ ...prev, partyName: selectedParty }));
      setPartySuggestions([]);
      const filteredBills = pendingBills.filter(bill => String(bill.party).toLowerCase() === String(selectedParty).toLowerCase());
      const billRows = filteredBills.map((bill, index) => ({
        id: Date.now() + index, srNo: index + 1, trnSeries: bill.billSeries,
        trnNo: bill.trnNo, trnDate: bill.trnDate, amount: bill.amount,
        adjustAmt: bill.adjusted, balanceAmt: bill.balance, nowAdjust: bill.balance,
        discount: 0, discAmount: 0, remark: ""
      }));
      setReceiptItems(billRows);
      setReceiptFormData(prev => ({
        ...prev, billSeries: filteredBills[0]?.billSeries || "",
        billNo: filteredBills[0]?.billNo || "", salesman: filteredBills[0]?.salesman || "",
        receiptAmount: filteredBills.reduce((sum, bill) => sum + bill.balance, 0)
      }));
      calculateReceiptSummary(billRows);
    };

const saveReceipt = () => {
  if (!receiptItems.length) {
    alert("No pending bill selected.");
    return;
  }

  const hasAmount = receiptItems.some(i => Number(i.nowAdjust) > 0);
  if (!hasAmount) {
    alert("Please enter Now Adjust amount.");
    return;
  }

  const payload = {
    id: editReceiptId || Date.now(),
    header: { ...receiptFormData },
    items: receiptItems.map(i => ({ ...i })),
    summary: { ...receiptSummary }
  };

  if (editReceiptId) {
    const updatedReceipts = state.receipts.map(r =>
      r.id === editReceiptId ? payload : r
    );
    dispatch({ type: "SET_RECEIPTS", payload: updatedReceipts });
    alert("Receipt Updated Successfully");
  } else {
    dispatch({ type: "ADD_RECEIPT", payload });
    alert("Receipt Saved Successfully");
  }
if (collectionReceiptBillId) {
  const savedReceiptNo = receiptFormData.rno;
  const savedReceiptSeries = receiptFormData.billSeries || "REC";
  const savedAmount = Number(receiptSummary.totalAdjusted || receiptFormData.receiptAmount || 0);

  setBillItems((prev) =>
    prev.map((item) =>
      item.id === collectionReceiptBillId
        ? {
            ...item,
            selected: true,
            collectionAmt: savedAmount,
            recSeries: savedReceiptSeries,
            recVNo: savedReceiptNo
          }
        : item
    )
  );

  setCollectionReceiptBillId(null);
  setShowCollectionReceiptModal(false);
}
  resetReceiptForm();

  setTransactionFormMode(prev => ({
  ...prev,
  Receipt: true
}));
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
  const updated = [...journalItems];
  updated[index].accountName = value;
  setJournalItems(updated);
  setActiveAccountRow(index);

  const search = value.toLowerCase().trim();

  const filtered = allJournalAccounts.filter((acc) => {
    const name = getAccountName(acc).toLowerCase();
    const code = String(getAccountCode(acc)).toLowerCase();

    return !search || name.includes(search) || code.includes(search);
  });

  setAccountSuggestions(filtered);
};

    const selectAccount = (index, account) => {
  const updated = [...journalItems];

  updated[index] = {
    ...updated[index],
    accountCode: getAccountCode(account),
    accountName: getAccountName(account)
  };

  setJournalItems(updated);
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
      setShowPaymentForm(false);
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

  setTransactionFormMode(prev => ({
    ...prev,
    ["Journal Voucher"]: true
  }));
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

const saveChequeBounce = () => {
  if (!chequeBounceFormData.partyName || !chequeBounceFormData.chequeNo) {
    alert("Please select Party Name and Cheque No.");
    return;
  }

  const payload = {
    id: editChequeBounceId || Date.now(),
    ...chequeBounceFormData,
    accountNameDr: chequeBounceFormData.partyName,
    accountNameCr: chequeBounceFormData.bankName,
    recNo: chequeBounceFormData.recNo || chequeBounceFormData.receiptNo,
    recSeries: chequeBounceFormData.recSeries || "REC",
    updatedAt: new Date().toISOString()
  };

  if (editChequeBounceId) {
    dispatch({
      type: "SET_CHEQUE_BOUNCES",
      payload: (state.chequeBounces || []).map(cb =>
        cb.id === editChequeBounceId ? payload : cb
      )
    });

    alert("Cheque Bounce Updated Successfully");
  } else {
    dispatch({ type: "ADD_CHEQUE_BOUNCE", payload });
    alert("Cheque Bounce Saved Successfully");
  }

  resetChequeBounceForm();
  setTransactionFormMode(prev => ({
  ...prev,
  ["Cheque Bounce"]: true
}));
};
const getNextChequeBounceNo = () => {
  return (state.chequeBounces?.length || 0) + 1;
};

const resetChequeBounceForm = () => {
  setEditChequeBounceId(null);

  setChequeBounceFormData({
    chqBounceDate: new Date().toISOString().split("T")[0],
    chqBounceNo: getNextChequeBounceNo(),
    narration: "",
    partyName: "",
    chqBounceCharges: "0.00",
    chequeNo: "",
    chequeDate: "",
    chequeAmt: "",
    clearingDate: "",
    receiptNo: "",
    recNo: "",
    recSeries: "REC",
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

  setShowChequeBounceForm(true);
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

   const savePDCDocket = () => {
  const payload = {
    id: editPDCDocketId || Date.now(),
    header: pdcDocketFormData,
    items: pdcDocketItems,
    createdAt: new Date().toISOString()
  };

  if (editPDCDocketId) {
    dispatch({
      type: "SET_PDC_DOCKETS",
      payload: (state.pdcDockets || []).map(d =>
        d.id === editPDCDocketId ? payload : d
      )
    });
    alert("PDC Docket Updated Successfully");
  } else {
    dispatch({ type: "ADD_PDC_DOCKET", payload });
    alert("PDC Docket Saved Successfully");
  }

  resetPDCDocketForm();
  setShowPDCDocketForm(false);
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
  setEditPDCDocketId(docket.id);
  setPDCDocketFormData(docket.header);
  setPDCDocketItems(docket.items || []);
  setShowPDCDocketForm(true);
};

    const deletePDCDocket = (id) => {
      if (window.confirm("Are you sure you want to delete this PDC Docket?")) {
        dispatch({ type: "DELETE_PDC_DOCKET", payload: id });
      }
    };

    // =========================
    // CONTRA FUNCTIONS
    // =========================
    const handleContraInput = (e) => {
      const { name, value } = e.target;
      setContraFormData({ ...contraFormData, [name]: value });
    };

    const saveContra = () => {
      const payload = { id: editContraId || Date.now(), ...contraFormData, createdAt: new Date().toISOString() };
      if (editContraId) {
        const updated = state.contra?.map(c => c.id === editContraId ? payload : c) || [payload];
        dispatch({ type: "SET_CONTRA", payload: updated });
        alert("Bank Deposit/Withdrawal Updated Successfully");
      } else {
        dispatch({ type: "ADD_CONTRA", payload });
        alert("Bank Deposit/Withdrawal Saved Successfully");
      }
      resetContraForm();
      setShowContraForm(false);
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
      setShowContraForm(true);
    };

    const deleteContra = (id) => {
      if (window.confirm("Are you sure you want to delete this Bank Deposit/Withdrawal record?")) {
        dispatch({ type: "DELETE_CONTRA", payload: id });
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

  newBillItems[index].selected = selected;
  newBillItems[index].collectionAmt = 0;

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

const handleCollectionAmtChange = (index) => {
  const bill = billItems[index];

  if (!bill?.selected) {
    alert("Please select this bill first.");
    return;
  }

  const ok = window.confirm("Do you want to Create Receipt!");
  if (!ok) return;

  openReceiptFromCollectionBill(bill);
};

    const handleDiscountChange = (index, value) => {
      const newBillItems = [...billItems];
      newBillItems[index].discount = parseFloat(value) || 0;
      setBillItems(newBillItems);
    };

    const saveCollectionVoucher = () => {
      const selectedBillData = billItems.filter(item => item.selected).map(item => ({
        billNo: item.billNo, billDate: item.billDate, partyCode: item.partyCode,
        partyName: item.partyName, billAmt: item.billAmt, collectionAmt: item.collectionAmt, discount: item.discount
      }));
      const payload = {
        id: editCollectionVoucherId || Date.now(), ...collectionVoucherFormData,
        selectedBills: selectedBillData, totalCollectionAmount, totalCashCollection,
        totalChequeCollection, totalBills, createdAt: new Date().toISOString()
      };
      if (editCollectionVoucherId) {
        const updated = state.collectionVouchers?.map(c => c.id === editCollectionVoucherId ? payload : c) || [payload];
        dispatch({ type: "SET_COLLECTION_VOUCHERS", payload: updated });
        alert("Collection Voucher Updated Successfully");
      } else {
        dispatch({ type: "ADD_COLLECTION_VOUCHER", payload });
        alert("Collection Voucher Saved Successfully");
      }
      resetCollectionVoucherForm();
      setShowCollectionVoucherForm(false);
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
      setShowCollectionVoucherForm(true);
    };

    const deleteCollectionVoucher = (id) => {
      if (window.confirm("Are you sure you want to delete this Collection Voucher record?")) {
        dispatch({ type: "DELETE_COLLECTION_VOUCHER", payload: id });
      }
    };

    // =========================
    // RENDER FUNCTIONS
    // =========================

  const renderReceiptList = () => (
  <div className="receipt-sales-list-section">
    <div className="receipt-sales-list-header">
      <h3>Receipt List ({state.receipts.length})</h3>

      <div className="receipt-sales-list-actions">
        <input className="receipt-sales-search" type="text" placeholder="Search..." />
        <button className="receipt-export-excel">📊 Export Excel</button>
        <button className="receipt-export-pdf">📄 Export PDF</button>
        <button
          className="receipt-settle-load-btn"
          onClick={() => window.dispatchEvent(new CustomEvent("openSettleLoad"))}
        >
          Settle Load
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

const receiptBottomSummary = {
  totalPendingAmount: selectedPartyPendingBills.reduce(
    (sum, b) => sum + (Number(b.balance) || 0),
    0
  ),

  totalCollectedAmount: selectedPartyReceipts.reduce(
    (sum, r) =>
      sum +
      (Number(r.summary?.totalAdjusted) ||
        Number(r.header?.receiptAmount) ||
        0),
    0
  ),

  totalPendingBills: selectedPartyPendingBills.length,

  lastCollectionAmount: Number(
    lastSelectedPartyReceipt?.summary?.totalAdjusted || 0
  ),

  lastCollectionDate:
    lastSelectedPartyReceipt?.header?.receiptDate || "-",

  lastPaymentAgainstBillNo:
    lastSelectedPartyReceipt?.items?.[0]?.trnNo || "-"
};
  // REPLACE your isBankAccount/getBankAccountName/bankCashAccounts block with this

const normalize = (v) => String(v || "").trim().toLowerCase();

const getBankAccountName = (acc) =>
  acc.accountName || acc.acName || acc.AcName || acc.name || acc.bankName || "";

const getBankAccountNo = (acc) =>
  acc.bankAccountNo || acc.accountNumber || acc.bankAcNo || acc.acNo || "";

const getBankIFSC = (acc) =>
  acc.ifscCode || acc.ifsc || acc.IFSC || "";

const getBankBranch = (acc) =>
  acc.branchName || acc.branch || acc.bankBranch || "";

const isBankAccount = (acc) => {
  const group = normalize(
    acc.accountGroup ||
    acc.accountGroupName ||
    acc.groupName ||
    acc.acGroup ||
    acc.AcGroup ||
    acc.group ||
    ""
  );

  return group === "bank accounts" || group === "bank account";
};

const bankCashAccounts = [
  ...(otherAccounts || []),
  ...(accounts || [])
]
  .filter(isBankAccount)
  .filter((acc, index, self) => {
    const name = normalize(getBankAccountName(acc));
    return name && index === self.findIndex(a => normalize(getBankAccountName(a)) === name);
  });
const getPdcDateValue = (dateValue) => {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};
// ADD this helper before getPDCDocketReceipts

const getCustomerBankBranch = (partyName, bankName) => {
  const party = clean(partyName);
  const bank = clean(bankName);

  const matchedBank = (customerBanks || []).find((b) => {
    const bParty = clean(
      b.partyName ||
      b.customerName ||
      b.customer ||
      b.accountName ||
      b.party ||
      b.partyNameInput ||
      ""
    );

    const bBank = clean(
      b.bankName ||
      b.BankName ||
      b.bank ||
      b.name ||
      b.customerBankName ||
      ""
    );

    return bParty === party && bBank === bank;
  });

  return (
    matchedBank?.branchName ||
    matchedBank?.bankBranch ||
    matchedBank?.branch ||
    matchedBank?.Branch ||
    matchedBank?.branchNameInput ||
    matchedBank?.bankBranchName ||
    ""
  );
};

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
    const renderReceiptForm = () => (
      <div className="master-section receipt-section">
        <div className="form-header"><h2 className="page-title-large">Receipt Entry</h2><button className="close-form-btn" onClick={() => setShowReceiptForm(false)}>×</button></div>
        <div className="form-section">
          <h3 className="section-header">Receipt Information</h3>
          <div className="form-grid-4">
            <div className="labeled-input"><label>Receipt Date</label><input type="date" name="receiptDate" value={receiptFormData.receiptDate} onChange={handleReceiptInput} /></div>
            <div className="labeled-input"><label>RNo</label><input type="text" name="rno" value={receiptFormData.rno} onChange={handleReceiptInput} /></div>
            <div className="labeled-input"><label>Bill Series</label><input type="text" name="billSeries" value={receiptFormData.billSeries} onChange={handleReceiptInput} /></div>
            <div className="labeled-input"><label>Bill No</label><input type="text" name="billNo" value={receiptFormData.billNo} onChange={handleReceiptInput} /></div>
          </div>
          <div className="form-grid-4">
            <div className="labeled-input party-search-box"><label>Party Name</label><input type="text" name="partyName" value={receiptFormData.partyName} onChange={handlePartyTyping} placeholder="Enter Party Name" />
              {partySuggestions.length > 0 && (<div className="party-suggestion-dropdown">{partySuggestions.map((party, idx) => (<div key={idx} className="party-suggestion-item" onClick={() => selectParty(party)}>{party}</div>))}</div>)}
            </div>
            <div className="labeled-input"><label>Salesman</label><select name="salesman" value={receiptFormData.salesman} onChange={handleReceiptInput}><option value="">Select Salesman</option>{salesmen.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}</select></div>
            <div className="labeled-input">
  <label>Bank/Cash</label>
  <select
    name="bankCash"
    value={receiptFormData.bankCash}
    onChange={handleReceiptInput}
  >
    <option value="">Select</option>
    <option value="Cash">Cash</option>

   {bankCashAccounts.map((acc, index) => {
  const bankName = getBankAccountName(acc);

  return (
    <option key={acc.id || acc.accountCode || index} value={bankName}>
      {bankName}
    </option>
  );
})}
  </select>
</div>
            <div className="labeled-input"><label>Receipt Amount</label><input type="number" name="receiptAmount" value={receiptFormData.receiptAmount} onChange={handleReceiptInput} /></div>
          </div>
          <div className="form-grid-4">
            <div className="labeled-input"><label>Cheque No</label><input type="text" name="chequeNo" value={receiptFormData.chequeNo} onChange={handleReceiptInput} disabled={receiptFormData.bankCash === "Cash"} /></div>
            <div className="labeled-input"><label>Cheque Date</label><input type="date" name="chequeDate" value={receiptFormData.chequeDate} onChange={handleReceiptInput} disabled={receiptFormData.bankCash === "Cash"} /></div>
           <div className="labeled-input">
  <label>Drawer Bank</label>
  <select
    name="drawerBank"
    value={receiptFormData.drawerBank}
    onChange={handleReceiptInput}
    disabled={receiptFormData.bankCash === "Cash"}
  >
    <option value="">Select Customer Bank</option>
    {filteredCustomerBanks.map((bank, index) => {
      const bankName = getCustomerBankName(bank);
      return (
        <option key={bank.id || index} value={bankName}>
          {bankName}
        </option>
      );
    })}
  </select>
</div>
            <div className="labeled-input"><label>MICR</label><input type="text" name="micr" value={receiptFormData.micr} onChange={handleReceiptInput} disabled={receiptFormData.bankCash === "Cash"} /></div>
          </div>
          <div className="form-row-single"><div className="labeled-input narration-field"><label>Narration</label><textarea name="narration" value={receiptFormData.narration} onChange={handleReceiptInput} /></div></div>
        </div>
        <div className="form-section">
  <div className="grid-header">
    <h3 className="section-header">Receipt Bills</h3>
  </div>

  <div className="receipt-grid-wrap">
    <table className="receipt-entry-table">
      <thead>
        <tr>
          <th>Sr</th>
          <th>Trn Series</th>
          <th>Trn No</th>
          <th>Trn Date</th>
          <th>Amount</th>
          <th>Adjust Amt</th>
          <th>Balance Amt</th>
          <th>Now Adjust</th>
          <th>Discount %</th>
          <th>Disc Amt</th>
          <th>Remark</th>
        </tr>
      </thead>

      <tbody>
        {receiptItems.length === 0 ? (
          <tr>
            <td colSpan="11" className="no-data">
              Enter Bill Series and Bill No to load pending bill
            </td>
          </tr>
        ) : (
          receiptItems.map((item, index) => (
            <tr key={item.id}>
              <td>{index + 1}</td>
              <td>{item.trnSeries}</td>
              <td>{item.trnNo}</td>
              <td>{item.trnDate}</td>
              <td className="amount-cell">₹{Number(item.amount || 0).toFixed(2)}</td>
              <td className="amount-cell">₹{Number(item.adjustAmt || 0).toFixed(2)}</td>
              <td className="amount-cell">₹{Number(item.balanceAmt || 0).toFixed(2)}</td>

              <td>
                <input
                  type="number"
                  value={item.nowAdjust}
                  onChange={(e) => updateReceiptItem(index, "nowAdjust", e.target.value)}
                />
              </td>

              <td>
                <input
                  type="number"
                  value={item.discount}
                  onChange={(e) => updateReceiptItem(index, "discount", e.target.value)}
                />
              </td>

              <td className="amount-cell">₹{Number(item.discAmount || 0).toFixed(2)}</td>

              <td>
                <input
                  className="remark-input"
                  value={item.remark}
                  onChange={(e) => updateReceiptItem(index, "remark", e.target.value)}
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</div>
<div className="receipt-bottom-summary">
  <div className="receipt-summary-pill">
    <span>Total Pending Amount</span>
    <b>₹{receiptBottomSummary.totalPendingAmount.toFixed(2)}</b>
  </div>

  <div className="receipt-summary-pill">
    <span>Total Collected Amount</span>
    <b>₹{receiptBottomSummary.totalCollectedAmount.toFixed(2)}</b>
  </div>

  <div className="receipt-summary-pill">
    <span>Total Pending Bills</span>
    <b>{receiptBottomSummary.totalPendingBills}</b>
  </div>

  <div className="receipt-summary-pill">
    <span>Last Collection Amount</span>
    <b>₹{receiptBottomSummary.lastCollectionAmount.toFixed(2)}</b>
  </div>

  <div className="receipt-summary-pill">
    <span>Last Collection Date</span>
    <b>{receiptBottomSummary.lastCollectionDate}</b>
  </div>

  <div className="receipt-summary-pill">
    <span>Last Payment Against Bill No</span>
    <b>{receiptBottomSummary.lastPaymentAgainstBillNo}</b>
  </div>
</div>
        <div className="form-actions"><button className="btn-save" onClick={saveReceipt}>Save Receipt</button><button className="btn-cancel" onClick={() => setShowReceiptForm(false)}>Cancel</button></div>
      </div>
    );

    // Journal List
    const renderJournalList = () => (
      <div className="master-section"><div className="grid-header"><h3>Journal Voucher Management</h3><button className="btn-add-new" onClick={() => { setShowJournalForm(true); if (journalItems.length === 0) addJournalRow(); }}>+ Add Journal Voucher</button></div>
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
const renderJournalForm = () => (
  <div className="master-section journal-section">
    <div className="form-header">
      <h2 className="page-title-large">Journal Voucher Entry</h2>
      <button className="close-form-btn" onClick={() => setShowJournalForm(false)}>×</button>
    </div>

    <div className="form-section">
      <h3 className="section-header">Journal Information</h3>

      <div className="journal-header-grid">
        <div className="labeled-input">
          <label>VDate</label>
          <input type="date" name="vDate" value={journalFormData.vDate} onChange={handleJournalInput} />
        </div>

        <div className="labeled-input">
          <label>VNo</label>
          <input type="text" name="vNo" value={journalFormData.vNo} onChange={handleJournalInput} />
        </div>

        <div className="labeled-input">
          <label>Is Gst</label>
          <select name="isGst" value={journalFormData.isGst} onChange={handleJournalInput}>
            <option value="N">N</option>
            <option value="Y">Y</option>
          </select>
        </div>
      </div>

      <div className="journal-narration-row">
        <div className="labeled-input narration-field">
          <label>Narration</label>
          <textarea name="narr" value={journalFormData.narr} onChange={handleJournalInput} />
        </div>
      </div>
    </div>

    <div className="form-section">
      <div className="grid-header">
        <h3 className="section-header">Journal Entries</h3>
      </div>

      <div className="receipt-grid-wrap">
        <table className="receipt-entry-table">
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
                <td>{index + 1}</td>

                <td>
                  <input type="text" value={item.accountCode} readOnly />
                </td>

              <td className="account-search-cell">
  <input
    type="text"
    value={item.accountName || ""}
    onChange={(e) => handleAccountSearch(index, e.target.value)}
    onFocus={() => handleAccountSearch(index, item.accountName || "")}
    placeholder="Search Account"
    autoComplete="off"
  />

  {activeAccountRow === index && accountSuggestions.length > 0 && (
    <div className="party-suggestion-box">
      {accountSuggestions.map((acc, i) => (
        <div
          key={getAccountCode(acc) || acc.id || i}
          className="party-suggestion-item"
          onMouseDown={() => selectAccount(index, acc)}
        >
          {getAccountCode(acc)} - {getAccountName(acc)}
        </div>
      ))}
    </div>
  )}
</td>
                <td>
                  <input
                    type="number"
                    value={item.drAmount}
                    onChange={(e) => updateJournalItem(index, "drAmount", e.target.value)}
                  />
                </td>

                <td>
                  <input
                    type="number"
                    value={item.crAmount}
                    onChange={(e) => updateJournalItem(index, "crAmount", e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn-add-row" onClick={addJournalRow}>
        + Add Row
      </button>

      <div className="receipt-bottom-summary">
        <span>Total Debit : ₹{Number(journalSummary.totalDr || 0).toFixed(2)}</span>
        <span>Total Credit : ₹{Number(journalSummary.totalCr || 0).toFixed(2)}</span>
        <span>Difference : ₹{Number(journalSummary.difference || 0).toFixed(2)}</span>
        <span>Total Entries : {journalSummary.totalEntries || 0}</span>
      </div>
    </div>

    <div className="form-actions">
      <button className="btn-save" onClick={saveJournalVoucher}>Save Journal</button>
      <button className="btn-cancel" onClick={() => setShowJournalForm(false)}>Cancel</button>
    </div>
  </div>
);

    // Payment List
    const renderPaymentList = () => (
      <div className="master-section"><div className="grid-header"><h3>Payment Management</h3><button className="btn-add-new" onClick={() => setShowPaymentForm(true)}>+ Add Payment</button></div>
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
        <div className="form-actions"><button className="btn-primary" onClick={savePayment}>Save</button><button className="btn-secondary" onClick={() => setShowPaymentForm(false)}>Cancel</button></div>
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
const renderChequeBounceForm = () => (
  <div className="master-section cheque-bounce-section">
    <div className="form-header">
      <h2 className="page-title-large">
        {editChequeBounceId ? "Edit Cheque Bounce" : "Cheque Bounce Entry"}
      </h2>

      <button
        className="close-form-btn"
        onClick={() => {
          resetChequeBounceForm();
          setShowChequeBounceForm(false);
        }}
      >
        ×
      </button>
    </div>

    <div className="form-section">
      <div className="cheque-bounce-form">
        <div className="form-row-4">
          <div className="form-field">
            <label>Chq Bounce Date :</label>
            <input
              type="date"
              name="chqBounceDate"
              value={chequeBounceFormData.chqBounceDate}
              onChange={handleChequeBounceInput}
            />
          </div>

          <div className="form-field">
            <label>Chq Bounce No. :</label>
            <input
              type="text"
              name="chqBounceNo"
              value={chequeBounceFormData.chqBounceNo}
              onChange={handleChequeBounceInput}
              placeholder="Enter bounce number"
            />
          </div>

          <div className="form-field">
            <label>Party Name :</label>
            <select
              name="partyName"
              value={chequeBounceFormData.partyName}
              onChange={handleChequeBounceInput}
            >
              <option value="">Select Party</option>
              {chequeBounceParties.map((party, index) => (
                <option key={index} value={party}>
                  {party}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Cheque No. :</label>
            <input
              type="text"
              name="chequeNo"
              value={chequeBounceFormData.chequeNo}
              onChange={handleChequeBounceInput}
              placeholder="Enter cheque no"
            />
          </div>
        </div>

        <div className="form-row-4">
          <div className="form-field">
            <label>Cheque Date :</label>
            <input
              type="date"
              name="chequeDate"
              value={chequeBounceFormData.chequeDate}
              readOnly
            />
          </div>

          <div className="form-field">
            <label>Cheque Amt :</label>
            <input
              type="number"
              name="chequeAmt"
              value={chequeBounceFormData.chequeAmt}
              readOnly
              step="0.01"
            />
          </div>

          <div className="form-field">
            <label>Chq Bounce Charges :</label>
            <input
              type="number"
              name="chqBounceCharges"
              value={chequeBounceFormData.chqBounceCharges}
              onChange={handleChequeBounceInput}
              step="0.01"
            />
          </div>

          <div className="form-field">
            <label>Total Amt :</label>
            <input
              type="text"
              name="totalAmt"
              value={chequeBounceFormData.totalAmt}
              readOnly
              className="total-amount-field"
            />
          </div>
        </div>

        <div className="form-row-4">
          <div className="form-field">
            <label>Clearing Date :</label>
            <input
              type="date"
              name="clearingDate"
              value={chequeBounceFormData.clearingDate}
              readOnly
            />
          </div>

          <div className="form-field">
            <label>Receipt No. :</label>
            <input
              type="text"
              name="receiptNo"
              value={chequeBounceFormData.receiptNo}
              readOnly
            />
          </div>

          <div className="form-field">
            <label>Bank Name :</label>
            <select
              name="bankName"
              value={chequeBounceFormData.bankName}
              onChange={handleChequeBounceInput}
            >
              <option value="">Select Bank</option>
              {bankCashAccounts.map((acc, index) => {
                const bankName = getBankAccountName(acc);

                return (
                  <option
                    key={acc.id || acc.accountCode || index}
                    value={bankName}
                  >
                    {bankName}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-field">
            <label>Narration :</label>
            <input
              type="text"
              name="narration"
              value={chequeBounceFormData.narration}
              onChange={handleChequeBounceInput}
              placeholder="Enter narration details..."
            />
          </div>
        </div>
      </div>
    </div>

    <div className="form-actions">
      <button className="btn-save" onClick={saveChequeBounce}>
        {editChequeBounceId ? "Update Cheque Bounce" : "Save Cheque Bounce"}
      </button>

      <button
        className="btn-cancel"
        onClick={() => {
          resetChequeBounceForm();
          setTransactionFormMode(prev => ({
  ...prev,
  ["Cheque Bounce"]: false
}));
        }}
      >
        Cancel
      </button>
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
            ${
              rows.length === 0
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
            setShowPDCDocketForm(true);
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
              const h = docket.header || {};

              return (
                <tr key={docket.id}>
                  <td>{h.depositDate || "-"}</td>
                  <td>{h.pdcSeries || h.series || "-"}</td>
                  <td>{h.pdcNo || h.docVNo || "-"}</td>
                  <td>{h.houseBank || h.bankName || h.houseBankName || "-"}</td>
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
                        onClick={() => deletePDCDocket(docket.id)}
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
  const renderPDCDocketForm = () => (
  <div className="master-section pdc-docket-section">
    <div className="form-header">
      <h2 className="page-title-large">
        {editPDCDocketId ? "Edit PDC Docket" : "Add PDC Docket"}
      </h2>
      <button className="close-form-btn" onClick={() => {
        resetPDCDocketForm();
        setShowPDCDocketForm(false);
      }}>×</button>
    </div>

    <div className="form-section">
      <div className="form-grid-4">
        <div className="labeled-input">
          <label>Deposit Date</label>
          <input type="date" name="depositDate" value={pdcDocketFormData.depositDate} onChange={handlePDCDocketInput} />
        </div>

        <div className="labeled-input">
          <label>Doc Series</label>
          <input type="text" name="docSeries" value={pdcDocketFormData.docSeries} onChange={handlePDCDocketInput} />
        </div>

        <div className="labeled-input">
          <label>Doc VNo</label>
          <input type="text" name="docVNo" value={pdcDocketFormData.docVNo} onChange={handlePDCDocketInput} />
        </div>

        <div className="labeled-input">
          <label>House Bank</label>
          <select name="houseBank" value={pdcDocketFormData.houseBank} onChange={handlePDCDocketInput}>
            <option value="">Select Bank</option>
            {bankCashAccounts.map((acc, index) => {
              const bankName = getBankAccountName(acc);
              return (
                <option key={acc.id || acc.accountCode || index} value={bankName}>
                  {bankName}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="form-grid-4">
        <div className="labeled-input">
          <label>From Date</label>
          <input type="date" name="fromDate" value={pdcDocketFormData.fromDate} onChange={handlePDCDocketInput} />
        </div>

        <div className="labeled-input">
          <label>To Date</label>
          <input type="date" name="toDate" value={pdcDocketFormData.toDate} onChange={handlePDCDocketInput} />
        </div>

        <div className="labeled-input">
          <label>Clearing Type</label>
          <select
  name="clearingType"
  value={pdcDocketFormData.clearingType}
  onChange={handlePDCDocketInput}
>
  <option value="SAME BANK">Same Bank</option>
  <option value="LOCAL BANK">Local Bank</option>
  <option value="OUTSIDE BANK">Outside Bank</option>
</select>
        </div>

        <div className="labeled-input">
          <label>Clearing Date</label>
          <input type="date" name="clearingDate" value={pdcDocketFormData.clearingDate} onChange={handlePDCDocketInput} />
        </div>
      </div>

      <div className="form-row-single">
        <div className="labeled-input narration-field">
          <label>Narration</label>
          <textarea name="narration" value={pdcDocketFormData.narration} onChange={handlePDCDocketInput} />
        </div>
      </div>
    </div>

    <div className="form-section">
      <div className="receipt-grid-wrap">
        <table className="receipt-entry-table">
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
                <td colSpan="11" className="no-data">
                  Select House Bank, Clearing Type, From Date and To Date to load cheques
                </td>
              </tr>
            ) : (
              pdcDocketItems.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{index + 1}</td>
                  <td>{item.chequeNo}</td>
                  <td>{item.chequeDate}</td>
                  <td className="amount-cell">₹{Number(item.amount || 0).toFixed(2)}</td>
                  <td>{item.clearingDate}</td>
                  <td>{item.recSeries}</td>
                  <td>{item.recNo}</td>
                  <td>{item.recTrnBank}</td>
                       <td>{item.branch || "-"}</td>
                  <td>{item.partyCode}</td>
                  <td>{item.partyName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="receipt-bottom-summary">
        <span>Total Amount : ₹{Number(pdcDocketFormData.totalAmount || 0).toFixed(2)}</span>
        <span>Total Cheques : {pdcDocketFormData.totalCheques}</span>
      </div>
    </div>

    <div className="form-actions">
      <button className="btn-save" onClick={savePDCDocket}>Save</button>
      <button className="btn-cancel" onClick={() => {
        resetPDCDocketForm();
        setShowPDCDocketForm(false);
      }}>Cancel</button>
    </div>
  </div>
);

    // Contra List
    const renderContraList = () => (
      <div className="master-section"><div className="grid-header"><h3>Bank Deposit/Withdrawal</h3><button className="btn-add-new btn-contra" onClick={() => { resetContraForm(); setShowContraForm(true); }}>+ Add Transaction</button></div>
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
    const renderContraForm = () => (
      <div className="master-section contra-section"><div className="form-header"><h2 className="page-title-large">{editContraId ? 'Edit Bank Deposit/Withdrawal' : 'Add Bank Deposit/Withdrawal'}</h2><button className="close-form-btn" onClick={() => { resetContraForm(); setShowContraForm(false); }}>×</button></div>
        <div className="form-section"><div className="contra-form"><div className="form-row-3"><div className="form-field"><label>Transaction Date :</label><input type="date" name="transactionDate" value={contraFormData.transactionDate} onChange={handleContraInput} /></div><div className="form-field"><label>Tran VNo. :</label><input type="text" name="tranVNo" value={contraFormData.tranVNo} onChange={handleContraInput} placeholder="Enter number" /></div><div className="form-field"><label>Transaction Type :</label><select name="transactionType" value={contraFormData.transactionType} onChange={handleContraInput}><option value="CASH DEPOSIT">CASH DEPOSIT</option><option value="CASH WITHDRAWAL">CASH WITHDRAWAL</option><option value="CHEQUE DEPOSIT">CHEQUE DEPOSIT</option><option value="CHEQUE WITHDRAWAL">CHEQUE WITHDRAWAL</option><option value="TRANSFER">TRANSFER</option></select></div></div>
          <div className="form-row-3"><div className="form-field"><label>Amount :</label><input type="number" name="amount" value={contraFormData.amount} onChange={handleContraInput} step="0.01" placeholder="Enter amount" /></div><div className="form-field"><label>Narration :</label><input type="text" name="narration" value={contraFormData.narration} onChange={handleContraInput} placeholder="Enter narration" /></div><div className="form-field"></div></div></div></div>
        <div className="form-actions"><button className="btn-save" onClick={saveContra}>{editContraId ? 'Update' : 'Save'}</button><button className="btn-cancel" onClick={() => { resetContraForm(); setShowContraForm(false); }}>Cancel</button></div>
      </div>
    );

    // Collection Voucher List
    const renderCollectionVoucherList = () => (
      <div className="master-section"><div className="grid-header"><h3>Collection Voucher</h3><button className="btn-add-new btn-collection-voucher" onClick={() => { resetCollectionVoucherForm(); setShowCollectionVoucherForm(true); }}>+ Add Collection Voucher</button></div>
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
          readOnly
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
const renderCollectionVoucherForm = () => {
  const selectedBills = billItems.filter((item) => item.selected);

  const formatAmt = (v) =>
    Number(v || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
const allBillsSelected =
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

const handleSelectedBillCheck = (id) => {
    setBillItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              selected: !item.selected,
              collectionAmt: !item.selected ? item.balance : 0
            }
          : item
      )
    );
  };
const handleCollectionAmtFocus = (itemId, e) => {
  e?.target?.blur();

  const bill = billItems.find((item) => item.id === itemId);
  if (!bill) return;

  if (!bill.selected) {
    alert("Please select this bill first.");
    return;
  }

  if (showCollectionReceiptModal || collectionReceiptBillId === bill.id) return;

  openReceiptFromCollectionBill(bill);
};
const updateBillItem = (id, field, value) => {
    setBillItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

    return (
    <>
      <div className="master-section collection-voucher-section">
        <div className="form-header">
          <h2 className="page-title-large">
            {editCollectionVoucherId
              ? "Edit Collection Voucher"
              : "Add Collection Voucher"}
          </h2>

          <button
            className="close-form-btn"
            onClick={() => {
              resetCollectionVoucherForm();
              setShowCollectionVoucherForm(false);
            }}
          >
            ×
          </button>
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
                  <th>Sel</th>
                  <th>Bill Series</th>
                  <th>Bill No</th>
                  <th>Bill Date</th>
                  <th>Party Code</th>
                  <th>Party Name</th>
                  <th>Bill Amt</th>
                  <th>Old Collection</th>
                  <th>Balance</th>
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
                          onChange={() => handleSelectedBillCheck(item.id)}
                        />
                      </td>

                      <td>{item.billSeries || "-"}</td>
                      <td>{item.billNo || "-"}</td>
                      <td>{item.billDate || "-"}</td>
                      <td>{item.partyCode || "-"}</td>
                      <td>{item.partyName || "-"}</td>
                      <td className="amount-cell">₹{formatAmt(item.billAmt)}</td>
                      <td className="amount-cell">
                        ₹{formatAmt(item.oldCollection)}
                      </td>
                      <td className="amount-cell">₹{formatAmt(item.balance)}</td>

                      <td>
                        <input
  type="number"
  value={item.collectionAmt || ""}
  readOnly
  onMouseDown={(e) => e.preventDefault()}
  onClick={(e) => handleCollectionAmtFocus(item.id, e)}
  className="collection-amt-input"
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

        <div className="form-actions">
          <button className="btn-save" onClick={saveCollectionVoucher}>
            {editCollectionVoucherId ? "Update" : "Save"}
          </button>

          <button
            className="btn-cancel"
            onClick={() => {
              resetCollectionVoucherForm();
              setShowCollectionVoucherForm(false);
            }}
          >
            Cancel
          </button>
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
    // Main Render
    return (
      <div className="transaction-page">

        {activeTransaction === "Receipt" &&
          (transactionFormMode["Receipt"]
            ? renderReceiptForm()
            : renderReceiptList())
        }

        {activeTransaction === "Payment" &&
          (transactionFormMode["Payment"]
            ? renderPaymentForm()
            : renderPaymentList())
        }

        {activeTransaction === "Journal Voucher" &&
          (transactionFormMode["Journal Voucher"]
            ? renderJournalForm()
            : renderJournalList())
        }

        {activeTransaction === "Cheque Bounce" &&
          (transactionFormMode["Cheque Bounce"]
            ? renderChequeBounceForm()
            : renderChequeBounceList())
        }

        {activeTransaction === "PDC Docket" &&
          (transactionFormMode["PDC Docket"]
            ? renderPDCDocketForm()
            : renderPDCDocketList())
        }

        {activeTransaction === "Contra" &&
          (transactionFormMode["Contra"]
            ? renderContraForm()
            : renderContraList())
        }

        {activeTransaction === "Collection Voucher" &&
          (transactionFormMode["Collection Voucher"]
            ? renderCollectionVoucherForm()
            : renderCollectionVoucherList())
        }

      </div>
    );
  };

  export default Transaction;
