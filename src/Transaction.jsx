import React, { useState, useCallback, useEffect } from "react";
import "./Transaction.css";
import { useERP } from "./context/ERPContext";

const Transaction = ({
  salesInvoices = [],
  salesmen = [],
  accounts = [],
  customerBanks = [],
  activeTransaction,
  openFormFor
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

  // =========================
  // RECEIPT STATES
  // =========================
  const [showReceiptForm, setShowReceiptForm] = useState(false);
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
  const [showPaymentForm, setShowPaymentForm] = useState(false);
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
  const [showJournalForm, setShowJournalForm] = useState(false);
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
  const [journalSummary, setJournalSummary] = useState({ totalDr: 0, totalCr: 0 });

  // =========================
  // CHEQUE BOUNCE STATES
  // =========================
  const [showChequeBounceForm, setShowChequeBounceForm] = useState(false);
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
  const [showPDCDocketForm, setShowPDCDocketForm] = useState(false);
  const [editPDCDocketId, setEditPDCDocketId] = useState(null);
  const [pdcDocketFormData, setPDCDocketFormData] = useState({
    depositDate: new Date().toISOString().split("T")[0],
    docVNo: "",
    fromDate: new Date().toISOString().split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
    houseBank: "SYG",
    bankName: "SURNAYUG CO OP BANK",
    narration: "",
    clearingType: "SAME BANK",
    clearingDate: "",
    totalAmount: "0.00",
    totalCheques: "0"
  });

  // =========================
  // CONTRA STATES
  // =========================
  const [showContraForm, setShowContraForm] = useState(false);
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
  const [showCollectionVoucherForm, setShowCollectionVoucherForm] = useState(false);
  const [editCollectionVoucherId, setEditCollectionVoucherId] = useState(null);
  const [collectionVoucherFormData, setCollectionVoucherFormData] = useState({
    collectionDate: new Date().toISOString().split("T")[0],
    colVNo: "",
    narration: "",
    collectionType: "Bill wise"
  });
  
  const [totalCollectionAmount, setTotalCollectionAmount] = useState(0);
  const [totalCashCollection, setTotalCashCollection] = useState(0);
  const [totalChequeCollection, setTotalChequeCollection] = useState(0);
  const [totalBills, setTotalBills] = useState(0);

  // =========================
  // DUMMY DATA FOR COLLECTION VOUCHER MODALS
  // =========================
  const getDummyBillsData = () => {
    return [
      {
        id: 1,
        billSeries: "26-27",
        billNo: "INV-001",
        billDate: "2024-01-15",
        partyCode: "P001",
        partyName: "ABC Medical Store",
        billAmt: 50000,
        oldCollection: 10000,
        balance: 40000,
        salesmanCode: "SM001",
        salesmanName: "Rajesh Kumar",
        areaCode: "AR001",
        areaName: "North Zone",
        selected: false,
        collectionAmt: 0,
        discount: 0,
        recSeries: "",
        recVNo: ""
      },
      {
        id: 2,
        billSeries: "26-27",
        billNo: "INV-002",
        billDate: "2024-01-20",
        partyCode: "P002",
        partyName: "Ratnahira Enterprises",
        billAmt: 75000,
        oldCollection: 25000,
        balance: 50000,
        salesmanCode: "SM002",
        salesmanName: "Priya Sharma",
        areaCode: "AR002",
        areaName: "South Zone",
        selected: false,
        collectionAmt: 0,
        discount: 0,
        recSeries: "",
        recVNo: ""
      },
      {
        id: 3,
        billSeries: "26-27",
        billNo: "INV-003",
        billDate: "2024-01-25",
        partyCode: "P003",
        partyName: "MediCare Solutions",
        billAmt: 60000,
        oldCollection: 15000,
        balance: 45000,
        salesmanCode: "SM001",
        salesmanName: "Rajesh Kumar",
        areaCode: "AR001",
        areaName: "North Zone",
        selected: false,
        collectionAmt: 0,
        discount: 0,
        recSeries: "",
        recVNo: ""
      },
      {
        id: 4,
        billSeries: "26-27",
        billNo: "INV-004",
        billDate: "2024-02-01",
        partyCode: "P004",
        partyName: "HealthCare Plus",
        billAmt: 85000,
        oldCollection: 35000,
        balance: 50000,
        salesmanCode: "SM003",
        salesmanName: "Amit Patel",
        areaCode: "AR003",
        areaName: "East Zone",
        selected: false,
        collectionAmt: 0,
        discount: 0,
        recSeries: "",
        recVNo: ""
      },
      {
        id: 5,
        billSeries: "26-27",
        billNo: "INV-005",
        billDate: "2024-02-05",
        partyCode: "P005",
        partyName: "City Medicals",
        billAmt: 45000,
        oldCollection: 5000,
        balance: 40000,
        salesmanCode: "SM002",
        salesmanName: "Priya Sharma",
        areaCode: "AR002",
        areaName: "South Zone",
        selected: false,
        collectionAmt: 0,
        discount: 0,
        recSeries: "",
        recVNo: ""
      }
    ];
  };

  const getUniqueSalesmen = () => {
    const bills = getDummyBillsData();
    const salesmanMap = new Map();
    bills.forEach(bill => {
      if (!salesmanMap.has(bill.salesmanCode)) {
        salesmanMap.set(bill.salesmanCode, {
          code: bill.salesmanCode,
          name: bill.salesmanName,
          selected: false,
          bills: []
        });
      }
      salesmanMap.get(bill.salesmanCode).bills.push(bill);
    });
    return Array.from(salesmanMap.values());
  };

  const getUniqueAreas = () => {
    const bills = getDummyBillsData();
    const areaMap = new Map();
    bills.forEach(bill => {
      if (!areaMap.has(bill.areaCode)) {
        areaMap.set(bill.areaCode, {
          code: bill.areaCode,
          name: bill.areaName,
          selected: false,
          bills: []
        });
      }
      areaMap.get(bill.areaCode).bills.push(bill);
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
                    <th style={{ width: "40px" }}>
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
  const pendingBills = (salesInvoices || []).map((invoice, index) => ({
    id: invoice.id || index + 1,
    billSeries: invoice.billSeries || invoice.header?.billSeries || "INV",
    billNo: invoice.billNumber || invoice.billNo || invoice.header?.billNumber || `INV-00${index + 1}`,
    trnNo: invoice.billNumber || invoice.billNo || index + 1,
    trnDate: invoice.date || invoice.billDate || invoice.header?.billDate || "",
    amount: parseFloat(invoice.amount || invoice.summary?.net || 0),
    adjusted: 0,
    balance: parseFloat(invoice.amount || invoice.summary?.net || 0),
    party: invoice.party || invoice.partyName || invoice.header?.party || "",
    salesman: invoice.salesman || invoice.header?.salesman || ""
  }));

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

  const handleBillSelectionConfirm = (selectedBillsData) => {
    setBillItems(selectedBillsData);
  };

  const handleSalesmanSelectionConfirm = (selectedSalesmenData) => {
    const allBills = [];
    selectedSalesmenData.forEach(salesman => {
      if (salesman.selected) {
        salesman.bills.forEach(bill => {
          allBills.push({
            ...bill,
            selected: true,
            collectionAmt: bill.balance
          });
        });
      }
    });
    setBillItems(allBills);
  };

  const handleAreaSelectionConfirm = (selectedAreasData) => {
    const allBills = [];
    selectedAreasData.forEach(area => {
      if (area.selected) {
        area.bills.forEach(bill => {
          allBills.push({
            ...bill,
            selected: true,
            collectionAmt: bill.balance
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
      totalAdjusted += parseFloat(item.nowAdjust) || 0;
      totalDiscount += parseFloat(item.discAmount) || 0;
      totalBalance += parseFloat(item.balanceAmt) || 0;
    });
    setReceiptSummary({ totalAdjusted, totalDiscount, balanceAmount: totalBalance });
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
    const items = [...receiptItems];
    items[index][field] = value;
    const amount = parseFloat(items[index].amount) || 0;
    const adjusted = parseFloat(items[index].adjustAmt) || 0;
    const nowAdjust = parseFloat(items[index].nowAdjust) || 0;
    const discount = parseFloat(items[index].discount) || 0;
    const discAmount = (nowAdjust * discount) / 100;
    items[index].discAmount = discAmount.toFixed(2);
    items[index].balanceAmt = (amount - adjusted - nowAdjust - discAmount).toFixed(2);
    setReceiptItems(items);
    calculateReceiptSummary(items);
  };

  const handleReceiptInput = (e) => {
    const { name, value } = e.target;
    let updatedData = { ...receiptFormData, [name]: value };
    if (name === "bankCash" && value === "Cash") {
      updatedData.chequeNo = "";
      updatedData.chequeDate = "";
      updatedData.drawerBank = "";
      updatedData.micr = "";
    }
    setReceiptFormData(updatedData);
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
    const payload = { id: editReceiptId || Date.now(), header: receiptFormData, items: receiptItems, summary: receiptSummary };
    if (editReceiptId) {
      const updatedReceipts = state.receipts.map(r => r.id === editReceiptId ? payload : r);
      dispatch({ type: "SET_RECEIPTS", payload: updatedReceipts });
      alert("Receipt Updated Successfully");
    } else {
      dispatch({ type: "ADD_RECEIPT", payload });
      alert("Receipt Saved Successfully");
    }
    resetReceiptForm();
    setShowReceiptForm(false);
  };

  const resetReceiptForm = () => {
    setEditReceiptId(null);
    setReceiptFormData({
      receiptDate: new Date().toISOString().split("T")[0], rno: state.receipts.length + 2,
      billSeries: "", billNo: "", salesman: "", partyName: "", narration: "",
      bankCash: "", loadNo: "", receiptAmount: "", chequeNo: "", chequeDate: "",
      rloadNo: "", drawerBank: "", micr: "", pdcType: "LOCAL BANK"
    });
    setReceiptItems([]);
    setReceiptSummary({ totalAdjusted: 0, balanceAmount: 0, totalDiscount: 0 });
  };

  const editReceipt = (receipt) => {
    setEditReceiptId(receipt.id);
    setReceiptFormData(receipt.header);
    setReceiptItems(receipt.items);
    setReceiptSummary(receipt.summary);
    setShowReceiptForm(true);
  };

  const deleteReceipt = (id) => {
    if (window.confirm("Are you sure you want to delete?")) {
      dispatch({ type: "DELETE_RECEIPT", payload: id });
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
    items[index][field] = value;
    setJournalItems(items);
    calculateJournalSummary(items);
  };

  const calculateJournalSummary = (items) => {
    let totalDr = 0, totalCr = 0;
    items.forEach((item) => {
      totalDr += parseFloat(item.drAmount) || 0;
      totalCr += parseFloat(item.crAmount) || 0;
    });
    setJournalSummary({ totalDr, totalCr });
  };

  const handleAccountSearch = (index, value) => {
    const updated = [...journalItems];
    updated[index].accountName = value;
    setJournalItems(updated);
    setActiveAccountRow(index);
    if (!value.trim()) {
      setAccountSuggestions([]);
      return;
    }
    const filtered = accounts.filter((acc) => {
      const search = value.toLowerCase();
      return acc.accountName?.toLowerCase().includes(search) ||
             acc.accountCode?.toString().toLowerCase().includes(search);
    });
    setAccountSuggestions(filtered);
  };

  const selectAccount = (index, account) => {
    const updated = [...journalItems];
    updated[index] = { ...updated[index], accountCode: account.accountCode, accountName: account.accountName };
    setJournalItems(updated);
    setAccountSuggestions([]);
    setActiveAccountRow(null);
  };

  const saveJournalVoucher = () => {
    const payload = { id: Date.now(), header: journalFormData, items: journalItems, summary: journalSummary };
    dispatch({ type: "ADD_JOURNAL", payload });
    alert("Journal Voucher Saved");
    setShowJournalForm(false);
    resetJournalForm();
  };

  const resetJournalForm = () => {
    setJournalFormData({
      vDate: new Date().toISOString().split("T")[0],
      vNo: state.journals?.length + 2 || 1, narr: "", isGst: "N"
    });
    setJournalItems([{ id: Date.now(), seqNo: 1, accountCode: "", accountName: "", drAmount: 0, crAmount: 0 }]);
    setJournalSummary({ totalDr: 0, totalCr: 0 });
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
  const handleChequeBounceInput = (e) => {
    const { name, value } = e.target;
    let updatedData = { ...chequeBounceFormData, [name]: value };
    if (name === "chqBounceCharges") {
      const charges = parseFloat(value) || 0;
      const chequeAmt = parseFloat(chequeBounceFormData.chequeAmt) || 0;
      updatedData.totalAmt = (chequeAmt + charges).toFixed(2);
    }
    if (name === "chequeAmt") {
      const chequeAmt = parseFloat(value) || 0;
      const charges = parseFloat(chequeBounceFormData.chqBounceCharges) || 0;
      updatedData.totalAmt = (chequeAmt + charges).toFixed(2);
    }
    setChequeBounceFormData(updatedData);
  };

  const saveChequeBounce = () => {
    const payload = { id: editChequeBounceId || Date.now(), ...chequeBounceFormData };
    if (editChequeBounceId) {
      const updated = state.chequeBounces.map(cb => cb.id === editChequeBounceId ? payload : cb);
      dispatch({ type: "SET_CHEQUE_BOUNCES", payload: updated });
      alert("Cheque Bounce Updated Successfully");
    } else {
      dispatch({ type: "ADD_CHEQUE_BOUNCE", payload });
      alert("Cheque Bounce Saved Successfully");
    }
    resetChequeBounceForm();
    setShowChequeBounceForm(false);
  };

  const resetChequeBounceForm = () => {
    setChequeBounceFormData({
      chqBounceDate: new Date().toISOString().split("T")[0], chqBounceNo: "", narration: "",
      partyName: "", chqBounceCharges: "0.00", chequeNo: "", chequeDate: "", chequeAmt: "",
      clearingDate: "", receiptNo: "", bankName: "", totalAmt: ""
    });
    setEditChequeBounceId(null);
  };

  const editChequeBounce = (chequeBounce) => {
    setEditChequeBounceId(chequeBounce.id);
    setChequeBounceFormData(chequeBounce);
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
    setPDCDocketFormData({ ...pdcDocketFormData, [name]: value });
  };

  const savePDCDocket = () => {
    const payload = { id: editPDCDocketId || Date.now(), header: pdcDocketFormData, createdAt: new Date().toISOString() };
    if (editPDCDocketId) {
      const updated = state.pdcDockets?.map(d => d.id === editPDCDocketId ? payload : d) || [payload];
      dispatch({ type: "SET_PDC_DOCKETS", payload: updated });
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
      depositDate: new Date().toISOString().split("T")[0], docVNo: "", fromDate: new Date().toISOString().split("T")[0],
      toDate: new Date().toISOString().split("T")[0], houseBank: "SYG", bankName: "SURNAYUG CO OP BANK",
      narration: "", clearingType: "SAME BANK", clearingDate: "", totalAmount: "0.00", totalCheques: "0"
    });
    setEditPDCDocketId(null);
  };

  const editPDCDocket = (docket) => {
    setEditPDCDocketId(docket.id);
    setPDCDocketFormData(docket.header);
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
    setCollectionVoucherFormData({ ...collectionVoucherFormData, [name]: value });
  };

  // Load bills when collection type changes to Bill wise
  useEffect(() => {
    const dummyBills = getDummyBillsData();
    if (collectionVoucherFormData.collectionType === "Bill wise") {
      setBillItems(dummyBills);
    } else if (collectionVoucherFormData.collectionType === "Salesman wise") {
      setBillItems([]);
    } else if (collectionVoucherFormData.collectionType === "Area wise") {
      setBillItems([]);
    }
  }, [collectionVoucherFormData.collectionType]);

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
    if (!selected) {
      newBillItems[index].collectionAmt = 0;
    } else {
      newBillItems[index].collectionAmt = newBillItems[index].balance;
    }
    setBillItems(newBillItems);
  };

  const handleCollectionAmtChange = (index, value) => {
    const newBillItems = [...billItems];
    newBillItems[index].collectionAmt = parseFloat(value) || 0;
    setBillItems(newBillItems);
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

  // Receipt List
  const renderReceiptList = () => (
    <div className="master-section">
      <div className="grid-header">
        <h3>Receipt Management</h3>
        <button className="btn-add-new" onClick={() => { setShowReceiptForm(true); if (receiptItems.length === 0) addReceiptItem(); }}>
          + Add Receipt
        </button>
      </div>
      <div className="table-responsive">
        <table className="erp-table">
          <thead><tr><th>RNo</th><th>Date</th><th>Party</th><th>Amount</th><th>Actions</th></tr></thead>
          <tbody>
            {state.receipts.length === 0 ? (
              <tr><td colSpan="5">No Receipts Added</td></tr>
            ) : (
              state.receipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td>{receipt.header.rno}</td>
                  <td>{receipt.header.receiptDate}</td>
                  <td>{receipt.header.partyName}</td>
                  <td>{receipt.summary.totalAdjusted}</td>
                  <td><button className="btn-edit" onClick={() => editReceipt(receipt)}>Edit</button><button className="btn-delete" onClick={() => deleteReceipt(receipt.id)}>Delete</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

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
          <div className="labeled-input"><label>Bank/Cash</label><select name="bankCash" value={receiptFormData.bankCash} onChange={handleReceiptInput}><option value="">Select</option><option value="Cash">Cash</option><option value="HDFC BANK">HDFC BANK</option></select></div>
          <div className="labeled-input"><label>Receipt Amount</label><input type="number" name="receiptAmount" value={receiptFormData.receiptAmount} onChange={handleReceiptInput} /></div>
        </div>
        <div className="form-grid-4">
          <div className="labeled-input"><label>Cheque No</label><input type="text" name="chequeNo" value={receiptFormData.chequeNo} onChange={handleReceiptInput} disabled={receiptFormData.bankCash === "Cash"} /></div>
          <div className="labeled-input"><label>Cheque Date</label><input type="date" name="chequeDate" value={receiptFormData.chequeDate} onChange={handleReceiptInput} disabled={receiptFormData.bankCash === "Cash"} /></div>
          <div className="labeled-input"><label>Drawer Bank</label><select name="drawerBank" value={receiptFormData.drawerBank} onChange={handleReceiptInput} disabled={receiptFormData.bankCash === "Cash"}><option value="">Select Bank</option>{customerBanks.map((bank) => (<option key={bank.id} value={bank.bankName}>{bank.bankName}</option>))}</select></div>
          <div className="labeled-input"><label>MICR</label><input type="text" name="micr" value={receiptFormData.micr} onChange={handleReceiptInput} disabled={receiptFormData.bankCash === "Cash"} /></div>
        </div>
        <div className="form-row-single"><div className="labeled-input narration-field"><label>Narration</label><textarea name="narration" value={receiptFormData.narration} onChange={handleReceiptInput} /></div></div>
      </div>
      <div className="form-section"><div className="grid-header"><h3 className="section-header">Receipt Bills</h3><button className="btn-add-new" onClick={addReceiptItem}>+ Add Row</button></div>
        <div className="table-responsive"><table className="erp-table"><thead><tr><th>SrNo</th><th>TrnSeries</th><th>TrnNo</th><th>TrnDate</th><th>Amount</th><th>Adjust Amt</th><th>Balance Amt</th><th>Now Adjust</th><th>Discount %</th><th>Disc Amt</th><th>Remark</th></tr></thead>
          <tbody>{receiptItems.map((item, index) => (<tr key={item.id}><td>{item.srNo}</td><td>{item.trnSeries}</td><td>{item.trnNo}</td><td>{item.trnDate}</td><td className="amount-cell">₹ {Number(item.amount).toFixed(2)}</td><td className="amount-cell">₹ {Number(item.adjustAmt).toFixed(2)}</td>
          <td><input type="number" value={item.balanceAmt} onChange={(e) => updateReceiptItem(index, "balanceAmt", e.target.value)} /></td>
          <td><input type="number" value={item.nowAdjust} onChange={(e) => updateReceiptItem(index, "nowAdjust", e.target.value)} /></td>
          <td><input type="number" value={item.discount} onChange={(e) => updateReceiptItem(index, "discount", e.target.value)} /></td>
          <td className="amount-cell">₹ {Number(item.discAmount).toFixed(2)}</td>
          <td><input className="remark-input" value={item.remark} onChange={(e) => updateReceiptItem(index, "remark", e.target.value)} /></td></tr>))}</tbody></table></div></div>
      <div className="form-section"><h3 className="section-header">Summary</h3><div className="receipt-summary-grid"><div className="summary-card"><label>Total Adjusted</label><h3>₹{receiptSummary.totalAdjusted.toFixed(2)}</h3></div><div className="summary-card"><label>Total Discount</label><h3>₹{receiptSummary.totalDiscount.toFixed(2)}</h3></div><div className="summary-card"><label>Balance Amount</label><h3>₹{receiptSummary.balanceAmount.toFixed(2)}</h3></div></div></div>
      <div className="form-actions"><button className="btn-save" onClick={saveReceipt}>Save Receipt</button><button className="btn-cancel" onClick={() => setShowReceiptForm(false)}>Cancel</button></div>
    </div>
  );

  // Journal List
  const renderJournalList = () => (
    <div className="master-section"><div className="grid-header"><h3>Journal Voucher Management</h3><button className="btn-add-new" onClick={() => { setShowJournalForm(true); if (journalItems.length === 0) addJournalRow(); }}>+ Add Journal Voucher</button></div>
      <div className="table-responsive"><table className="erp-table"><thead><tr><th>VNo</th><th>VDate</th><th>Narration</th><th>Total Dr</th><th>Total Cr</th></tr></thead>
        <tbody>{state.journals.length === 0 ? (<tr><td colSpan="5">No Journal Vouchers Added</td></tr>) : (state.journals.map((journal) => (<tr key={journal.id}><td>{journal.header.vNo}</td><td>{journal.header.vDate}</td><td>{journal.header.narr}</td><td>₹ {journal.summary.totalDr.toFixed(2)}</td><td>₹ {journal.summary.totalCr.toFixed(2)}</td></tr>)))}</tbody></table></div></div>
  );

  // Journal Form
  const renderJournalForm = () => (
    <div className="master-section journal-section"><div className="form-header"><h2 className="page-title-large">Journal Voucher Entry</h2><button className="close-form-btn" onClick={() => setShowJournalForm(false)}>×</button></div>
      <div className="form-section"><h3 className="section-header">Journal Information</h3><div className="journal-header-grid"><div className="labeled-input"><label>VDate</label><input type="date" name="vDate" value={journalFormData.vDate} onChange={handleJournalInput} /></div><div className="labeled-input"><label>VNo</label><input type="text" name="vNo" value={journalFormData.vNo} onChange={handleJournalInput} /></div><div className="labeled-input"><label>Is Gst</label><select name="isGst" value={journalFormData.isGst} onChange={handleJournalInput}><option value="N">N</option><option value="Y">Y</option></select></div></div>
        <div className="journal-narration-row"><div className="labeled-input narration-field"><label>Narration</label><textarea name="narr" value={journalFormData.narr} onChange={handleJournalInput} /></div></div></div>
      <div className="form-section"><div className="grid-header"><h3 className="section-header">Journal Entries</h3><button className="btn-add-new" onClick={addJournalRow}>+ Add Row</button></div>
        <div className="table-responsive"><table className="erp-table journal-table"><thead><tr><th>SeqNo</th><th>Account Code</th><th>Account Name</th><th>Dr Amount</th><th>Cr Amount</th></tr></thead>
          <tbody>{journalItems.map((item, index) => (<tr key={item.id}><td>{item.seqNo}</td><td><input value={item.accountCode} onChange={(e) => updateJournalItem(index, "accountCode", e.target.value)} /></td>
          <td style={{ width: "300px", minWidth: "300px" }}><div className="live-search-box"><input type="text" placeholder="Search Account" value={item.accountName || ""} onChange={(e) => handleAccountSearch(index, e.target.value)} />
          {activeAccountRow === index && (<div className="live-dropdown">{accountSuggestions.length > 0 ? (accountSuggestions.map((acc) => (<div key={acc.id} className="live-item" onClick={() => selectAccount(index, acc)}>{acc.accountCode} - {acc.accountName}</div>))) : (<div className="live-item">No Accounts Found</div>)}</div>)}</div></td>
          <td><input type="number" value={item.drAmount} onChange={(e) => updateJournalItem(index, "drAmount", e.target.value)} /></td>
          <td><input type="number" value={item.crAmount} onChange={(e) => updateJournalItem(index, "crAmount", e.target.value)} /></td></tr>))}</tbody></table></div></div>
      <div className="form-section"><h3 className="section-header">Summary</h3><div className="receipt-summary-grid"><div className="summary-card"><label>Total Dr</label><h3>₹ {journalSummary.totalDr.toFixed(2)}</h3></div><div className="summary-card"><label>Total Cr</label><h3>₹ {journalSummary.totalCr.toFixed(2)}</h3></div></div></div>
      <div className="form-actions"><button className="btn-save" onClick={saveJournalVoucher}>Save Journal</button><button className="btn-cancel" onClick={() => setShowJournalForm(false)}>Cancel</button></div>
    </div>
  );

  // Payment List
  const renderPaymentList = () => (
    <div className="master-section"><div className="grid-header"><h3>Payment Management</h3><button className="btn-add-new" onClick={() => setShowPaymentForm(true)}>+ Add Payment</button></div>
      <div className="table-responsive"><table className="erp-table"><thead><tr><th>VNo</th><th>Date</th><th>Party</th><th>Dr Amt</th><th>Cr Amt</th></tr></thead>
        <tbody>{(state.payments || []).length === 0 ? (<tr><td colSpan="5">No Payments Added</td></tr>) : ((state.payments || []).map((payment) => (<tr key={payment.id}><td>{payment.header.vNo}</td><td>{payment.header.vDate}</td><td>{payment.header.partyName}</td><td>{payment.header.drAmt}</td><td>{payment.header.crAmt}</td></tr>)))}</tbody></table></div></div>
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
  const renderChequeBounceList = () => (
    <div className="master-section"><div className="grid-header"><h3>Cheque Bounce Management</h3><button className="btn-add-new btn-cheque-bounce" onClick={() => { resetChequeBounceForm(); setShowChequeBounceForm(true); }}>+ Add Cheque Bounce</button></div>
      <div className="table-responsive"><table className="erp-table"><thead><tr><th>Chq Bounce No.</th><th>Chq Bounce Date</th><th>Party Name</th><th>Cheque No.</th><th>Cheque Amount</th><th>Total Amount</th><th>Actions</th></tr></thead>
        <tbody>{state.chequeBounces?.length === 0 ? (<tr><td colSpan="7" className="no-data">No Cheque Bounce Records Added</td></tr>) : (state.chequeBounces?.map((chequeBounce) => (<tr key={chequeBounce.id}><td>{chequeBounce.chqBounceNo || '-'}</td><td>{chequeBounce.chqBounceDate}</td><td>{chequeBounce.partyName}</td><td>{chequeBounce.chequeNo}</td><td>₹{parseFloat(chequeBounce.chequeAmt || 0).toFixed(2)}</td><td>₹{parseFloat(chequeBounce.totalAmt || 0).toFixed(2)}</td><td><button className="btn-edit" onClick={() => editChequeBounce(chequeBounce)}>Edit</button><button className="btn-delete" onClick={() => deleteChequeBounce(chequeBounce.id)}>Delete</button></td></tr>)))}</tbody></table></div></div>
  );

  // Cheque Bounce Form
  const renderChequeBounceForm = () => (
    <div className="master-section cheque-bounce-section"><div className="form-header"><h2 className="page-title-large">{editChequeBounceId ? 'Edit Cheque Bounce' : 'Cheque Bounce Entry'}</h2><button className="close-form-btn" onClick={() => { resetChequeBounceForm(); setShowChequeBounceForm(false); }}>×</button></div>
      <div className="form-section"><div className="cheque-bounce-form"><div className="form-row-4"><div className="form-field"><label>Chq Bounce Date :</label><input type="date" name="chqBounceDate" value={chequeBounceFormData.chqBounceDate} onChange={handleChequeBounceInput} /></div><div className="form-field"><label>Chq Bounce No. :</label><input type="text" name="chqBounceNo" value={chequeBounceFormData.chqBounceNo} onChange={handleChequeBounceInput} placeholder="Enter bounce number" /></div><div className="form-field"><label>Party Name :</label><select name="partyName" value={chequeBounceFormData.partyName} onChange={handleChequeBounceInput}><option value="">Select Party</option><option value="JV-21">JV-21</option><option value="ABC MEDICAL">ABC MEDICAL</option><option value="RATNAHIRA ENTERPRISES">RATNAHIRA ENTERPRISES</option></select></div><div className="form-field"><label>Cheque No. :</label><input type="text" name="chequeNo" value={chequeBounceFormData.chequeNo} onChange={handleChequeBounceInput} placeholder="Enter cheque number" /></div></div>
      <div className="form-row-4"><div className="form-field"><label>Cheque Date :</label><input type="date" name="chequeDate" value={chequeBounceFormData.chequeDate} onChange={handleChequeBounceInput} /></div><div className="form-field"><label>Cheque Amt :</label><input type="number" name="chequeAmt" value={chequeBounceFormData.chequeAmt} onChange={handleChequeBounceInput} step="0.01" placeholder="Enter cheque amount" /></div><div className="form-field"><label>Chq Bounce Charges :</label><input type="number" name="chqBounceCharges" value={chequeBounceFormData.chqBounceCharges} onChange={handleChequeBounceInput} step="0.01" /></div><div className="form-field"><label>Total Amt :</label><input type="text" name="totalAmt" value={chequeBounceFormData.totalAmt} readOnly className="total-amount-field" /></div></div>
      <div className="form-row-4"><div className="form-field"><label>Clearing Date :</label><input type="date" name="clearingDate" value={chequeBounceFormData.clearingDate} onChange={handleChequeBounceInput} /></div><div className="form-field"><label>Receipt No. :</label><input type="text" name="receiptNo" value={chequeBounceFormData.receiptNo} onChange={handleChequeBounceInput} placeholder="Enter receipt number" /></div><div className="form-field"><label>Bank Name :</label><select name="bankName" value={chequeBounceFormData.bankName} onChange={handleChequeBounceInput}><option value="">Select Bank</option><option value="HDFC BANK">HDFC BANK</option><option value="ICICI BANK">ICICI BANK</option><option value="SBI BANK">SBI BANK</option><option value="AXIS BANK">AXIS BANK</option><option value="YES BANK">YES BANK</option><option value="KOTAK BANK">KOTAK BANK</option><option value="PNB BANK">PNB BANK</option><option value="BOB BANK">BOB BANK</option><option value="CANARA BANK">CANARA BANK</option><option value="UNION BANK">UNION BANK</option></select></div><div className="form-field"><label>Narration :</label><input type="text" name="narration" value={chequeBounceFormData.narration} onChange={handleChequeBounceInput} placeholder="Enter narration details..." /></div></div></div></div>
      <div className="form-actions"><button className="btn-save" onClick={saveChequeBounce}>{editChequeBounceId ? 'Update Cheque Bounce' : 'Save Cheque Bounce'}</button><button className="btn-cancel" onClick={() => { resetChequeBounceForm(); setShowChequeBounceForm(false); }}>Cancel</button></div>
    </div>
  );

  // PDC Docket List
  const renderPDCDocketList = () => (
    <div className="master-section"><div className="grid-header"><h3>PDC Docket Management</h3><button className="btn-add-new btn-pdc-docket" onClick={() => { resetPDCDocketForm(); setShowPDCDocketForm(true); }}>+ Add PDC Docket</button></div>
      <div className="table-responsive"><table className="erp-table"><thead><tr><th>Doc VNo.</th><th>Deposit Date</th><th>From Date</th><th>To Date</th><th>Total Amount</th><th>Total Cheques</th><th>Actions</th></tr></thead>
        <tbody>{state.pdcDockets?.length === 0 ? (<tr><td colSpan="7" className="no-data">No PDC Dockets Added</td></tr>) : (state.pdcDockets?.map((docket) => (<tr key={docket.id}><td>{docket.header.docVNo || '-'}</td><td>{docket.header.depositDate}</td><td>{docket.header.fromDate}</td><td>{docket.header.toDate}</td><td>₹{parseFloat(docket.header.totalAmount || 0).toFixed(2)}</td><td>{docket.header.totalCheques}</td>
        <td><button className="btn-edit" onClick={() => editPDCDocket(docket)}>Edit</button><button className="btn-delete" onClick={() => deletePDCDocket(docket.id)}>Delete</button></td></tr>)))}</tbody></table></div></div>
  );

  // PDC Docket Form
  const renderPDCDocketForm = () => (
    <div className="master-section pdc-docket-section"><div className="form-header"><h2 className="page-title-large">{editPDCDocketId ? 'Edit PDC Docket' : 'Add PDC Docket'}</h2><button className="close-form-btn" onClick={() => { resetPDCDocketForm(); setShowPDCDocketForm(false); }}>×</button></div>
      <div className="form-section"><div className="pdc-header-grid"><div className="pdc-header-left"><div className="info-group"><label>Deposit Date:</label><input type="date" name="depositDate" value={pdcDocketFormData.depositDate} onChange={handlePDCDocketInput} /></div><div className="info-group"><label>Doc VNo.:</label><input type="text" name="docVNo" value={pdcDocketFormData.docVNo} onChange={handlePDCDocketInput} placeholder="Enter document number" /></div><div className="info-group"><label>From Date:</label><input type="date" name="fromDate" value={pdcDocketFormData.fromDate} onChange={handlePDCDocketInput} /></div><div className="info-group"><label>To Date:</label><input type="date" name="toDate" value={pdcDocketFormData.toDate} onChange={handlePDCDocketInput} /></div></div>
      <div className="pdc-header-right"><div className="info-group"><label>House Bank:</label><select name="houseBank" value={pdcDocketFormData.houseBank} onChange={handlePDCDocketInput}><option value="SYG">SYG</option><option value="HDFC">HDFC</option><option value="ICICI">ICICI</option><option value="SBI">SBI</option></select></div><div className="info-group"><label>Bank Name:</label><input type="text" name="bankName" value={pdcDocketFormData.bankName} onChange={handlePDCDocketInput} placeholder="Enter bank name" /></div><div className="info-group full-width"><label>Narr:</label><textarea name="narration" value={pdcDocketFormData.narration} onChange={handlePDCDocketInput} rows="2" placeholder="Enter narration..." /></div></div></div>
      <div className="pdc-clearing-grid"><div className="info-group"><label>Clearing Type:</label><select name="clearingType" value={pdcDocketFormData.clearingType} onChange={handlePDCDocketInput}><option value="SAME BANK">SAME BANK</option><option value="OTHER BANK">OTHER BANK</option><option value="OUTSTATION">OUTSTATION</option></select></div><div className="info-group"><label>Clearing Date:</label><input type="date" name="clearingDate" value={pdcDocketFormData.clearingDate} onChange={handlePDCDocketInput} /></div></div>
      <div className="pdc-summary"><div className="summary-item"><label>Total Amount:</label><h3>₹{pdcDocketFormData.totalAmount}</h3></div><div className="summary-item"><label>Total Cheques:</label><h3>{pdcDocketFormData.totalCheques}</h3></div></div></div>
      <div className="form-actions"><button className="btn-save" onClick={savePDCDocket}>Save</button><button className="btn-cancel" onClick={() => { resetPDCDocketForm(); setShowPDCDocketForm(false); }}>Cancel</button></div>
    </div>
  );

  // Contra List
  const renderContraList = () => (
    <div className="master-section"><div className="grid-header"><h3>Bank Deposit/Withdrawal</h3><button className="btn-add-new btn-contra" onClick={() => { resetContraForm(); setShowContraForm(true); }}>+ Add Transaction</button></div>
      <div className="table-responsive"><table className="erp-table"><thead><tr><th>Tran VNo.</th><th>Date</th><th>Type</th><th>Amount</th><th>Narration</th><th>Actions</th></tr></thead>
        <tbody>{state.contra?.length === 0 ? (<tr><td colSpan="6" className="no-data">No Transactions Added</td></tr>) : (state.contra?.map((transaction) => (<tr key={transaction.id}><td>{transaction.tranVNo || '-'}</td><td>{transaction.transactionDate}</td><td>{transaction.transactionType}</td><td>₹{parseFloat(transaction.amount || 0).toFixed(2)}</td><td>{transaction.narration || '-'}</td>
        <td><button className="btn-edit" onClick={() => editContra(transaction)}>Edit</button><button className="btn-delete" onClick={() => deleteContra(transaction.id)}>Delete</button></td></tr>)))}</tbody></table></div></div>
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
        <td><button className="btn-edit" onClick={() => editCollectionVoucher(voucher)}>Edit</button><button className="btn-delete" onClick={() => deleteCollectionVoucher(voucher.id)}>Delete</button></td></tr>)))}</tbody></table></div></div>
  );

  // Collection Voucher Form
  const renderCollectionVoucherForm = () => (
    <>
      <div className="master-section collection-voucher-section">
        <div className="form-header">
          <h2 className="page-title-large">{editCollectionVoucherId ? 'Edit Collection Voucher' : 'Add Collection Voucher'}</h2>
          <button className="close-form-btn" onClick={() => { resetCollectionVoucherForm(); setShowCollectionVoucherForm(false); }}>×</button>
        </div>

        <div className="form-section">
          <div className="collection-voucher-form">
            {/* Header Fields - with button aligned to right */}
            <div className="form-row-with-button">
              <div className="form-row-4">
                <div className="form-field">
                  <label>Collection Date :</label>
                  <input type="date" name="collectionDate" value={collectionVoucherFormData.collectionDate} onChange={handleCollectionVoucherInput} />
                </div>
                <div className="form-field">
                  <label>Col VNo. :</label>
                  <input type="text" name="colVNo" value={collectionVoucherFormData.colVNo} onChange={handleCollectionVoucherInput} placeholder="Enter collection voucher number" />
                </div>
                <div className="form-field">
                  <label>Collection Type :</label>
                  <select name="collectionType" value={collectionVoucherFormData.collectionType} onChange={handleCollectionVoucherInput}>
                    <option value="Bill wise">Bill wise</option>
                    <option value="Salesman wise">Salesman wise</option>
                    <option value="Area wise">Area wise</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Narration :</label>
                  <input type="text" name="narration" value={collectionVoucherFormData.narration} onChange={handleCollectionVoucherInput} placeholder="Enter narration..." />
                </div>
              </div>
              <div className="select-bills-button-wrapper">
                <button 
                  className="btn-select-bills-modal"
                  onClick={() => openSelectionModal(collectionVoucherFormData.collectionType)}
                >
                  Select {collectionVoucherFormData.collectionType === "Bill wise" ? "Bills" : 
                           collectionVoucherFormData.collectionType === "Salesman wise" ? "Salesmen" : "Areas"}
                </button>
              </div>
            </div>

            {/* Bills Table - Bill Wise View */}
            {collectionVoucherFormData.collectionType === "Bill wise" && (
              <div className="bills-table-container">
                <div className="table-header">
                  <h3>Selected Bills</h3>
                </div>
                <div className="table-responsive">
                  <table className="bills-table">
                    <thead>
                      <tr>
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
                      {billItems.filter(item => item.selected).length === 0 ? (
                        <tr>
                          <td colSpan="12" className="no-data">No bills selected. Click 'Select Bills' to choose bills.</td>
                        </tr>
                      ) : (
                        billItems.filter(item => item.selected).map((item, index) => {
                          const originalIndex = billItems.findIndex(b => b.id === item.id);
                          return (
                            <tr key={item.id}>
                              <td>{item.billSeries}</td>
                              <td>{item.billNo}</td>
                              <td>{item.billDate}</td>
                              <td>{item.partyCode}</td>
                              <td>{item.partyName}</td>
                              <td className="amount-cell">₹{item.billAmt.toFixed(2)}</td>
                              <td className="amount-cell">₹{item.oldCollection.toFixed(2)}</td>
                              <td className="amount-cell">₹{item.balance.toFixed(2)}</td>
                              <td>
                                <input 
                                  type="number" 
                                  className="collection-input"
                                  value={item.collectionAmt || 0} 
                                  onChange={(e) => {
                                    const newBillItems = [...billItems];
                                    newBillItems[originalIndex].collectionAmt = parseFloat(e.target.value) || 0;
                                    setBillItems(newBillItems);
                                  }}
                                  step="0.01"
                                  placeholder="0.00"
                                />
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  className="discount-input"
                                  value={item.discount || 0} 
                                  onChange={(e) => {
                                    const newBillItems = [...billItems];
                                    newBillItems[originalIndex].discount = parseFloat(e.target.value) || 0;
                                    setBillItems(newBillItems);
                                  }}
                                  step="0.01"
                                  placeholder="0.00"
                                />
                              </td>
                              <td>
                                <input 
                                  type="text" 
                                  className="rec-input" 
                                  placeholder="Series" 
                                />
                              </td>
                              <td>
                                <input 
                                  type="text" 
                                  className="rec-input" 
                                  placeholder="VNo" 
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Salesman Wise View */}
            {collectionVoucherFormData.collectionType === "Salesman wise" && (
              <div className="bills-table-container">
                <div className="table-header">
                  <h3>Selected Salesman Bills</h3>
                </div>
                <div className="table-responsive">
                  <table className="bills-table">
                    <thead>
                      <tr>
                        <th>Bill Series</th>
                        <th>Bill No</th>
                        <th>Bill Date</th>
                        <th>Party Code</th>
                        <th>Party Name</th>
                        <th>Bill Amt</th>
                        <th>Existing salesman</th>
                        <th>Area name</th>
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
                          <td colSpan="14" className="no-data">No salesman selected. Click 'Select Salesmen' to choose salesmen.</td>
                        </tr>
                      ) : (
                        billItems.map((item, index) => (
                          <tr key={`${item.id}-${index}`}>
                            <td>{item.billSeries}</td>
                            <td>{item.billNo}</td>
                            <td>{item.billDate}</td>
                            <td>{item.partyCode}</td>
                            <td>{item.partyName}</td>
                            <td className="amount-cell">₹{item.billAmt.toFixed(2)}</td>
                            <td>{item.salesmanName}</td>
                            <td>{item.areaName}</td>
                            <td className="amount-cell">₹{item.oldCollection.toFixed(2)}</td>
                            <td className="amount-cell">₹{item.balance.toFixed(2)}</td>
                            <td>
                              <input 
                                type="number" 
                                className="collection-input"
                                value={item.collectionAmt || 0} 
                                onChange={(e) => {
                                  const newBillItems = [...billItems];
                                  newBillItems[index].collectionAmt = parseFloat(e.target.value) || 0;
                                  setBillItems(newBillItems);
                                }}
                                step="0.01"
                                placeholder="0.00"
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                className="discount-input"
                                value={item.discount || 0} 
                                onChange={(e) => {
                                  const newBillItems = [...billItems];
                                  newBillItems[index].discount = parseFloat(e.target.value) || 0;
                                  setBillItems(newBillItems);
                                }}
                                step="0.01"
                                placeholder="0.00"
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="rec-input" 
                                placeholder="Series" 
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="rec-input" 
                                placeholder="VNo" 
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Area Wise View */}
            {collectionVoucherFormData.collectionType === "Area wise" && (
              <div className="bills-table-container">
                <div className="table-header">
                  <h3>Selected Area Bills</h3>
                </div>
                <div className="table-responsive">
                  <table className="bills-table">
                    <thead>
                      <tr>
                        <th>Bill Series</th>
                        <th>Bill No</th>
                        <th>Bill Date</th>
                        <th>Party Code</th>
                        <th>Party Name</th>
                        <th>Bill Amt</th>
                        <th>Existing salesman</th>
                        <th>Area name</th>
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
                          <td colSpan="14" className="no-data">No area selected. Click 'Select Areas' to choose areas.</td>
                        </tr>
                      ) : (
                        billItems.map((item, index) => (
                          <tr key={`${item.id}-${index}`}>
                            <td>{item.billSeries}</td>
                            <td>{item.billNo}</td>
                            <td>{item.billDate}</td>
                            <td>{item.partyCode}</td>
                            <td>{item.partyName}</td>
                            <td className="amount-cell">₹{item.billAmt.toFixed(2)}</td>
                            <td>{item.salesmanName}</td>
                            <td>{item.areaName}</td>
                            <td className="amount-cell">₹{item.oldCollection.toFixed(2)}</td>
                            <td className="amount-cell">₹{item.balance.toFixed(2)}</td>
                            <td>
                              <input 
                                type="number" 
                                className="collection-input"
                                value={item.collectionAmt || 0} 
                                onChange={(e) => {
                                  const newBillItems = [...billItems];
                                  newBillItems[index].collectionAmt = parseFloat(e.target.value) || 0;
                                  setBillItems(newBillItems);
                                }}
                                step="0.01"
                                placeholder="0.00"
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                className="discount-input"
                                value={item.discount || 0} 
                                onChange={(e) => {
                                  const newBillItems = [...billItems];
                                  newBillItems[index].discount = parseFloat(e.target.value) || 0;
                                  setBillItems(newBillItems);
                                }}
                                step="0.01"
                                placeholder="0.00"
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="rec-input" 
                                placeholder="Series" 
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="rec-input" 
                                placeholder="VNo" 
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Summary Section - Below the table */}
            <div className="collection-summary">
              <div className="summary-grid">
                <div className="summary-card">
                  <label>Total Collection Amount</label>
                  <h3>₹{totalCollectionAmount.toFixed(2)}</h3>
                </div>
                <div className="summary-card">
                  <label>Total Cash Collection</label>
                  <h3>₹{totalCashCollection.toFixed(2)}</h3>
                </div>
                <div className="summary-card">
                  <label>Total Cheque Collection</label>
                  <h3>₹{totalChequeCollection.toFixed(2)}</h3>
                </div>
                <div className="summary-card">
                  <label>Total Bills</label>
                  <h3>{totalBills}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-save" onClick={saveCollectionVoucher}>{editCollectionVoucherId ? 'Update' : 'Save'}</button>
          <button className="btn-cancel" onClick={() => { resetCollectionVoucherForm(); setShowCollectionVoucherForm(false); }}>Cancel</button>
        </div>
      </div>
      
      {/* Bill Selection Modal - Only show for Bill wise */}
      {collectionVoucherFormData.collectionType === "Bill wise" && (
        <BillSelectionModal 
          isOpen={showBillSelectionModal}
          onClose={closeSelectionModal}
          bills={getDummyBillsData()}
          onConfirm={handleBillSelectionConfirm}
        />
      )}
      
      {/* Salesman Selection Modal */}
      {collectionVoucherFormData.collectionType === "Salesman wise" && (
        <SalesmanSelectionModal 
          isOpen={showSalesmanSelectionModal}
          onClose={closeSelectionModal}
          salesmen={getUniqueSalesmen()}
          onConfirm={handleSalesmanSelectionConfirm}
        />
      )}
      
      {/* Area Selection Modal */}
      {collectionVoucherFormData.collectionType === "Area wise" && (
        <AreaSelectionModal 
          isOpen={showAreaSelectionModal}
          onClose={closeSelectionModal}
          areas={getUniqueAreas()}
          onConfirm={handleAreaSelectionConfirm}
        />
      )}
    </>
  );

  // Main Render
  return (
    <div className="transaction-page">
      {activeTransaction === "Receipt" && !showReceiptForm && renderReceiptList()}
      {activeTransaction === "Receipt" && showReceiptForm && renderReceiptForm()}
      {activeTransaction === "Payment" && !showPaymentForm && renderPaymentList()}
      {activeTransaction === "Payment" && showPaymentForm && renderPaymentForm()}
      {activeTransaction === "Journal Voucher" && !showJournalForm && renderJournalList()}
      {activeTransaction === "Journal Voucher" && showJournalForm && renderJournalForm()}
      {activeTransaction === "Cheque Bounce" && !showChequeBounceForm && renderChequeBounceList()}
      {activeTransaction === "Cheque Bounce" && showChequeBounceForm && renderChequeBounceForm()}
      {activeTransaction === "PDC Docket" && !showPDCDocketForm && renderPDCDocketList()}
      {activeTransaction === "PDC Docket" && showPDCDocketForm && renderPDCDocketForm()}
      {activeTransaction === "Contra" && !showContraForm && renderContraList()}
      {activeTransaction === "Contra" && showContraForm && renderContraForm()}
      {activeTransaction === "Collection Voucher" && !showCollectionVoucherForm && renderCollectionVoucherList()}
      {activeTransaction === "Collection Voucher" && showCollectionVoucherForm && renderCollectionVoucherForm()}
    </div>
  );
};

export default Transaction;