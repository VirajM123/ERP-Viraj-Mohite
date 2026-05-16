// Dashboard.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './Dashboard.css';
import logo from "./assets/images/Totalsolution.png";
import SalesmanToAreaMapping from './SalesmanToAreaMapping';



const Dashboard = () => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [activeSubMenu, setActiveSubMenu] = useState(null);
  const [openFormFor, setOpenFormFor] = useState(null);
  const [accountActiveTab, setAccountActiveTab] = useState('basic');
  const [otherAccountActiveTab, setOtherAccountActiveTab] = useState('basic');
  // Batch  State
  const [batches, setBatches] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const [currentBatchRow, setCurrentBatchRow] = useState(null);

  // Updated batchForm state (replace the existing batchForm state)
const [batchForm, setBatchForm] = useState({
  batchNo: '',
  mfgDate: '',
  expDate: '',
  mrp: '',
  purchaseRate: '',
  salesRate: '',
  stockQty: '',
  boxPack: '1',
  ratePerUnit: '1',
  previousPurchaseRate: '',
  quantity: '1'
});
  const [batchMode, setBatchMode] = useState('new');

  // GoDown Master State
  const [godowns, setGodowns] = useState([
    { id: 1, code: 'G1', name: 'Main Godown', address: 'Main Street', location: 'Central' },
    { id: 2, code: 'G2', name: 'Branch Godown', address: 'Branch Road', location: 'North' }
  ]);
  const [godownForm, setGodownForm] = useState({ code: '', name: '', address: '', location: '' });
  const [editGodownId, setEditGodownId] = useState(null);

  // Sales Invoice State
  const [invoiceFormData, setInvoiceFormData] = useState({
    billDate: new Date().toISOString().split('T')[0],
    godown: 'G1',
    company: '',
    area: '',
    party: '',
    BillSeries: '',
    billNo: '',
    billType: 'Credit',
    dueDate: '',
    salesman: '',
    narration: ''
  });
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [invoiceSummary, setInvoiceSummary] = useState({
    gross: 0, tpr: 0, scheme: 0, bottom: 0, star: 0, cd: 0, gst: 0, cess: 0, tcs: 0, rounding: 0, net: 0
  });
  const [activeRow, setActiveRow] = useState(-1);
  const tableRef = useRef(null);
  const productInputRef = useRef(null);
  const [showProductList, setShowProductList] = useState(false);
  const [productListFilter, setProductListFilter] = useState('');
  const [currentProductIndex, setCurrentProductIndex] = useState(-1);

  // Purchase Invoice State
  const [purchaseFormData, setPurchaseFormData] = useState({
    supplier: '',
    company: '',
    storageLocation: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    vno: '',
    invoiceNumber: '',
    narration: '',
    discountPercent: '',
    grossAmount: 0,
    mrpTotal: 0,
    tcbPercent: 0,
    diBc1: 0,
    afterDiBc1: 0,
    groBsAmt: 0,
    tcbAmount: 0,
    diBc2: 0,
    afterDiBc2: 0,
    qbtAmt: 0,
    rounding: 0,
    diBc3: 0,
    afterDiBc3: 0,
    ceBsAmt: 0,
    netAmt: 0
  });
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [purchaseActiveRow, setPurchaseActiveRow] = useState(-1);
  const [showPurchaseProductList, setShowPurchaseProductList] = useState(false);
  const [purchaseProductListFilter, setPurchaseProductListFilter] = useState('');
  const [currentPurchaseProductIndex, setCurrentPurchaseProductIndex] = useState(-1);

  // Credit Note State
  const [creditNoteFormData, setCreditNoteFormData] = useState({
    vDate: new Date().toISOString().split('T')[0],
    vNo: '',
    party: '',
    godown: 'G1',
    salesman: '',
    tinNo: '',
    company: '',
    narr: '',
    billSeries: '',
    billNo: '',
    full: '',
    refNo: '',
    refDate: ''
  });
  const [creditNoteItems, setCreditNoteItems] = useState([]);
  const [creditNoteSummary, setCreditNoteSummary] = useState({
    grossAmt: 0,
    schemeAmt: 0,
    tprAmt: 0,
    cashDisc: 0,
    gstAmt: 0,
    starAmt: 0,
    starPercent: 0,
    addLess: 0,
    display: 0,
    coupon: 0,
    rounding: 0,
    cessAmt: 0,
    tcsPercent: 0,
    tcsAmt: 0,
    billBalAmt: 0,
    netAmt: 0
  });
  const [creditNoteActiveRow, setCreditNoteActiveRow] = useState(-1);
  const [showCreditProductList, setShowCreditProductList] = useState(false);
  const [creditProductListFilter, setCreditProductListFilter] = useState('');
  const [currentCreditProductIndex, setCurrentCreditProductIndex] = useState(-1);

  // Debit Note State
  const [debitNoteFormData, setDebitNoteFormData] = useState({
    vDate: new Date().toISOString().split('T')[0],
    vNo: '',
    godown: 'G1',
    company: '',
    narr: '',
    supplier: '',
    igst: 'N'
  });
  const [debitNoteItems, setDebitNoteItems] = useState([]);
  const [debitNoteSummary, setDebitNoteSummary] = useState({
    grossAmt: 0,
    gstAmt: 0,
    tcsPercent: 0,
    tcsAmt: 0,
    beforeVatDiscAmt: 0,
    surcharge: 0,
    rounding: 0,
    beforeVatAddAmt: 0,
    afterVatDiscAmt: 0,
    netAmt: 0
  });
  const [debitNoteActiveRow, setDebitNoteActiveRow] = useState(-1);
  const [showDebitProductList, setShowDebitProductList] = useState(false);
  const [debitProductListFilter, setDebitProductListFilter] = useState('');
  const [currentDebitProductIndex, setCurrentDebitProductIndex] = useState(-1);

  const [filters, setFilters] = useState({
  company: '',
  group: '',
  category: '',
  product: '',
  account: '',
  otherAccount: '',
  gst: '',
  salesman: '',
  area: '',
  service: '',
  godown: '',
  firm: '',      // Add this
  user: ''       // Add this
});

  // Master data state
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [groupsState, setGroupsState] = useState([]);
  const [categoriesState, setCategoriesState] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [otherAccounts, setOtherAccounts] = useState([]);
  const [gstRates] = useState([0, 5, 12, 18, 28]);
  const [basicUnits] = useState(['PCS', 'Box', 'Inbox', 'KG', 'Litre']);

  // GST Master State
  const [gstList, setGstList] = useState([
    { id: 1, srNo: 1, code: '1', vat: 0.00, purchaseType: 'VAT ON PURCHASE PRICE', salesType: 'VAT ON SALES PRICE' },
    { id: 2, srNo: 2, code: '2', vat: 5.00, purchaseType: 'VAT ON PURCHASE PRICE', salesType: 'VAT ON SALES PRICE' },
    { id: 3, srNo: 3, code: '3', vat: 12.00, purchaseType: 'VAT ON PURCHASE PRICE', salesType: 'VAT ON SALES PRICE' },
    { id: 4, srNo: 4, code: '4', vat: 18.00, purchaseType: 'VAT ON PURCHASE PRICE', salesType: 'VAT ON SALES PRICE' },
    { id: 5, srNo: 5, code: '5', vat: 28.00, purchaseType: 'VAT ON PURCHASE PRICE', salesType: 'VAT ON SALES PRICE' }
  ]);
  const [gstForm, setGstForm] = useState({
    code: '',
    vat: '',
    purchaseType: 'VAT ON PURCHASE PRICE',
    salesType: 'VAT ON SALES PRICE'
  });
  const [editGstId, setEditGstId] = useState(null);

  // Salesman Master State
  const [salesmen, setSalesmen] = useState([
    { id: 1, code: '28', name: 'Krishna Patil', type: 'SALESMAN', address: '', town: '', pinCode: '', state: '', country: '', phoneNo: '', mobileNo: '', emailId: '', dateOfBirth: '', qualification: '', reference: 'SM98537', imeiNo: '' },
    { id: 2, code: 'S1', name: 'Salesman 1', type: 'SALESMAN', address: '', town: '', pinCode: '', state: '', country: '', phoneNo: '', mobileNo: '', emailId: '', dateOfBirth: '', qualification: '', reference: '', imeiNo: '' },
    { id: 3, code: 'H1', name: 'SALESMAN 2', type: 'SALESMAN', address: '', town: '', pinCode: '', state: '', country: '', phoneNo: '', mobileNo: '', emailId: '', dateOfBirth: '', qualification: '', reference: '', imeiNo: '' }
  ]);

  // Service Master State
  const [services, setServices] = useState([]);
  const [serviceForm, setServiceForm] = useState({
    code: '',
    name: '',
    vat: '',
    purchaseType: 'VAT ON PURCHASE PRICE',
    salesType: 'VAT ON SALES PRICE'
  });
  const [editServiceId, setEditServiceId] = useState(null);

  // Area Master State
  const [areas, setAreas] = useState([]);
  const [areaForm, setAreaForm] = useState({ code: '', name: '' });
  const [editAreaId, setEditAreaId] = useState(null);

  const [salesmanForm, setSalesmanForm] = useState({
    code: '',
    name: '',
    type: 'SALESMAN',
    address: '',
    town: '',
    pinCode: '',
    state: '',
    country: '',
    phoneNo: '',
    mobileNo: '',
    emailId: '',
    dateOfBirth: '',
    qualification: '',
    reference: '',
    imeiNo: ''
  });
  const [editSalesmanId, setEditSalesmanId] = useState(null);

  // Salesman to Area Mapping States
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [mappingData, setMappingData] = useState([]);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [showSalesmanDropdown, setShowSalesmanDropdown] = useState(false);
  const [currentEditingRow, setCurrentEditingRow] = useState(-1);
  const [currentEditingCell, setCurrentEditingCell] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('');

  // Area To Party Mapping States
  const [areaToPartyCompany, setAreaToPartyCompany] = useState(null);
  const [areaToPartyData, setAreaToPartyData] = useState([]);
  const [showAreaToPartyDropdown, setShowAreaToPartyDropdown] = useState(false);
  const [areaToPartyEditingRow, setAreaToPartyEditingRow] = useState(-1);
  const [areaToPartyEditingCell, setAreaToPartyEditingCell] = useState('');
  const [areaToPartyFilter, setAreaToPartyFilter] = useState('');

  const resetServiceForm = () => {
    setServiceForm({
      code: '',
      name: '',
      vat: '',
      purchaseType: 'VAT ON PURCHASE PRICE',
      salesType: 'VAT ON SALES PRICE'
    });
    setEditServiceId(null);
  };
// Customer Bank Master State
const [customerBanks, setCustomerBanks] = useState([]);
const [customerBankForm, setCustomerBankForm] = useState({
  bankCode: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  branchName: '',
  accountType: 'Savings', // Savings, Current, etc.
  customerName: '',
  customerCode: '',
  mobileNo: '',
  emailId: '',
  upiId: '',
  swiftCode: '',
  micrCode: '',
  panNumber: '',
  beneficiaryName: '',
  remarks: ''
});
const [editCustomerBankId, setEditCustomerBankId] = useState(null);

// Dashboard Performance State
const [dashboardPerformance, setDashboardPerformance] = useState({
  sales: { total: 0, count: 0, recent: [] },
  purchase: { total: 0, count: 0, recent: [] },
  creditNote: { total: 0, count: 0, recent: [] },
  debitNote: { total: 0, count: 0, recent: [] }
});

// Firm Creation State
const [firmData, setFirmData] = useState({
  firmCode: '',
  firmName: '',
  address1: '',
  address2: '',
  city: '',
  pinCode: '',
  state: '',
  country: '',
  phoneNo: '',
  mobileNo: '',
  tinNo: '',
  regNo: '',
  gstNo: '',
  drugLicNo: '',
  foodLicenceNo: '',
  distributorId: '',
  apiKey: ''
});

// User Creation State
const [userData, setUserData] = useState({
  userName: '',
  oldPassword: '',
  password: '',
  reEnterPassword: ''
});

const [firms, setFirms] = useState([]);
const [users, setUsers] = useState([{ userName: 'ADMIN', password: 'admin123' }]);
const [currentUser, setCurrentUser] = useState('ADMIN');

// Filter for Customer Bank Master
const [customerBankFilter, setCustomerBankFilter] = useState('');
  // Form states
  const [companyForm, setCompanyForm] = useState({ code: '', name: '', address: '', branchAddress: '' });
  const [productForm, setProductForm] = useState({
    code: '', name: '', companyId: '', group: '', category: '', description: '',
    gst: '', basicUnit: 'PCS', boxPack: '', inboxPack: '', retailerMargin: '',
    distributorMargin: '', active: true, locked: false, hsn: '', weight: '0', allowFraction: false,
    Rate_Per_Unit: '1', Reorder_Level: '0', Min_Stock_Holding: '0'
  });

  // Account Form State
  const [accountForm, setAccountForm] = useState({
    accountCode: '',
    accountName: '',
    address: '',
    town: 'Pune',
    state: 'MAHARASHTRA',
    pinCode: '',
    phoneNo: '',
    mobileNo: '',
    emailId: '',
    tinNo: '',
    openingBal: '0.00',
    openingBalType: 'Dr',
    dlNo1: '',
    dlExp1: '',
    dlNo2: '',
    dlExp2: '',
    birthDate: '',
    contactPerson: '',
    commonCode: '',
    commonName: '',
    billType: 'CREDIT',
    invType: 'TAXABLE',
    taxOn: 'SRATE',
    tradeDisc: 'YES',
    tradePercent: '0.00',
    creditDays: '0',
    creditBills: '0',
    lockDays: '0',
    creditAmt: '0.00',
    weeklyOff: 'NONE',
    blackListed: 'NO',
    distKm: '0.00',
    closeTime: '',
    seqNo: '0',
    panNo: '',
    foodLicense: '',
    gstNo: '',
    billToAdd1: '',
    tcsPercent: '0.0000',
    tanNo: '',
    gstType: 'Unregistered',
    gstDate: '',
    add2: '',
    gstClsDate: '',
    allowInPurchase: 'N'
  });

  // Other Account Form State
  const [otherAccountForm, setOtherAccountForm] = useState({
    accountCode: '',
    accountName: '',
    accountGroup: 'INCOMES DIRECT',
    address: '',
    town: '',
    state: '',
    country: '',
    pinCode: '',
    phoneNo: '',
    mobileNo: '',
    emailId: '',
    tinNo: '',
    openingBal: '0.00',
    openingBalType: 'Dr',
    dlNo1: '',
    dlExp1: '',
    dlNo2: '',
    dlExp2: '',
    invType: 'CST',
    taxOn: 'SRATE',
    commonCode: '',
    commonName: '',
    panNo: '',
    foodLicense: '',
    gstNo: '',
    billToAdd1: '',
    remark: '',
    tcsPercent: '',
    tanNo: '',
    gstType: 'Unregistered',
    gstDate: '',
    add2: '',
    gstClsDate: ''
  });

  // Group/Category forms
  const [groupForm, setGroupForm] = useState({ code: '', name: '' });
  const [categoryForm, setCategoryForm] = useState({ code: '', name: '' });

  const menuItems = {
  dashboard: { title: 'Dashboard', icon: '📊', items: ['Firm Creation', 'User Creation'] },
  master: { title: 'Master', icon: '📊', items: ['Company Master', 'Group Master', 'Category Master', 'Product', 'Account', 'Other Account', 'GST Master', 'Salesman', 'Area', 'Service', 'GoDown Master', 'Scheme','Customer Bank Master'] },
  mapping: { title: 'Mapping', icon: '🔗', items: ['Salesman To Area', 'Area To Party'] },
  vouchers: { title: 'Vouchers', icon: '📄', items: ['Sales', 'Purchase', 'Credit Note', 'Debit Note'] },
  transactions: { title: 'Transactions', icon: '💰', items: ['Receipt', 'Expense', 'Cheque Bounce', 'PDC Docket', 'Journal Voucher', 'Contra'] },
  reports: { title: 'Reports', icon: '📈', items: ['Sales', 'Purchase', 'Stock Reports', 'GST Reports'] },
  tools: { title: 'Tools', icon: '⚙️', items: ['General Setup', 'Security Setup'] },
  logout: { title: 'Logout', icon: '🚪', items: [] }
};

  // GoDown Master Handlers
  const handleGodownInput = (e) => {
    setGodownForm({ ...godownForm, [e.target.name]: e.target.value });
  };
// Firm Creation Handlers
const handleFirmInput = (e) => {
  setFirmData({ ...firmData, [e.target.name]: e.target.value });
};

const saveFirm = (e) => {
  e.preventDefault();
  if (!firmData.firmCode || !firmData.firmName) {
    return alert('Firm Code and Firm Name are required');
  }
  
  const newFirm = { id: Date.now(), ...firmData };
  setFirms([...firms, newFirm]);
  alert('Firm created successfully!');
  
  // Reset form
  setFirmData({
    firmCode: '',
    firmName: '',
    address1: '',
    address2: '',
    city: '',
    pinCode: '',
    state: '',
    country: '',
    phoneNo: '',
    mobileNo: '',
    tinNo: '',
    regNo: '',
    gstNo: '',
    drugLicNo: '',
    foodLicenceNo: '',
    distributorId: '',
    apiKey: ''
  });
  closeForm();
};

// User Creation Handlers
const handleUserInput = (e) => {
  setUserData({ ...userData, [e.target.name]: e.target.value });
};

const saveUser = (e) => {
  e.preventDefault();
  if (!userData.userName) {
    return alert('User Name is required');
  }
  if (userData.password !== userData.reEnterPassword) {
    return alert('Password and Re-enter Password do not match');
  }
  
  // Check if user already exists
  if (users.find(u => u.userName === userData.userName)) {
    return alert('User already exists!');
  }
  
  const newUser = { userName: userData.userName, password: userData.password };
  setUsers([...users, newUser]);
  alert('User created successfully!');
  
  // Reset form
  setUserData({
    userName: '',
    oldPassword: '',
    password: '',
    reEnterPassword: ''
  });
  closeForm();
};

// Logout Handler
const handleLogout = () => {
  if (window.confirm('Are you sure you want to logout?')) {
    setCurrentUser(null);
    setActiveMenu(null);
    setActiveSubMenu(null);
    alert('Logged out successfully!');
  }
};
  const saveGodown = (e) => {
    e.preventDefault();
    if (!godownForm.code || !godownForm.name) return alert('Code and Name required');

    if (editGodownId) {
      setGodowns(godowns.map(godown =>
        godown.id === editGodownId
          ? { ...godown, ...godownForm }
          : godown
      ));
      setEditGodownId(null);
    } else {
      const newId = Math.max(...godowns.map(g => g.id), 0) + 1;

      setGodowns([...godowns, { id: newId, ...godownForm }]);
    }
    setGodownForm({ code: '', name: '', address: '', location: '' });
    closeForm();
  };

  const editGodown = (godown) => {
    setEditGodownId(godown.id);
    setGodownForm({
      code: godown.code,
      name: godown.name,
      address: godown.address || '',
      location: godown.location || ''
    });
    setOpenFormFor('GoDown Master');
  };

  const deleteGodown = (id) => {
    if (window.confirm('Are you sure you want to delete this godown?')) {
      setGodowns(godowns.filter(g => g.id !== id));
    }
  };

  const getFilteredGodowns = () => {
    return godowns.filter(godown =>
      godown.code?.toLowerCase().includes(filters.godown.toLowerCase()) ||
      godown.name?.toLowerCase().includes(filters.godown.toLowerCase())
    );
  };
// Customer Bank Master Handlers
const handleCustomerBankInput = (e) => {
  setCustomerBankForm({ ...customerBankForm, [e.target.name]: e.target.value });
};

const saveCustomerBank = (e) => {
  e.preventDefault();
  if (!customerBankForm.bankCode || !customerBankForm.bankName || !customerBankForm.accountNumber) {
    return alert('Bank Code, Bank Name and Account Number are required');
  }

  if (editCustomerBankId) {
    setCustomerBanks(customerBanks.map(bank =>
      bank.id === editCustomerBankId
        ? { ...bank, ...customerBankForm }
        : bank
    ));
    setEditCustomerBankId(null);
  } else {
    const newId = Math.max(...customerBanks.map(b => b.id), 0) + 1;
    setCustomerBanks([...customerBanks, { id: newId, ...customerBankForm }]);
  }
  
  // Reset form
  setCustomerBankForm({
    bankCode: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    accountType: 'Savings',
    customerName: '',
    customerCode: '',
    mobileNo: '',
    emailId: '',
    upiId: '',
    swiftCode: '',
    micrCode: '',
    panNumber: '',
    beneficiaryName: '',
    remarks: ''
  });
  closeForm();
};

const editCustomerBank = (bank) => {
  setEditCustomerBankId(bank.id);
  setCustomerBankForm({
    bankCode: bank.bankCode,
    bankName: bank.bankName,
    accountNumber: bank.accountNumber,
    ifscCode: bank.ifscCode || '',
    branchName: bank.branchName || '',
    accountType: bank.accountType || 'Savings',
    customerName: bank.customerName || '',
    customerCode: bank.customerCode || '',
    mobileNo: bank.mobileNo || '',
    emailId: bank.emailId || '',
    upiId: bank.upiId || '',
    swiftCode: bank.swiftCode || '',
    micrCode: bank.micrCode || '',
    panNumber: bank.panNumber || '',
    beneficiaryName: bank.beneficiaryName || '',
    remarks: bank.remarks || ''
  });
  setOpenFormFor('Customer Bank Master');
};

const deleteCustomerBank = (id) => {
  if (window.confirm('Are you sure you want to delete this bank account?')) {
    setCustomerBanks(customerBanks.filter(b => b.id !== id));
  }
};

const getFilteredCustomerBanks = () => {
  return customerBanks.filter(bank =>
    bank.bankCode?.toLowerCase().includes(customerBankFilter.toLowerCase()) ||
    bank.bankName?.toLowerCase().includes(customerBankFilter.toLowerCase()) ||
    bank.accountNumber?.toLowerCase().includes(customerBankFilter.toLowerCase()) ||
    bank.customerName?.toLowerCase().includes(customerBankFilter.toLowerCase())
  );
};
// Calculate Dashboard Performance
const calculateDashboardPerformance = useCallback(() => {
  // Calculate from sales invoices
  const salesTotal = invoiceItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  // Calculate from purchase invoices
  const purchaseTotal = purchaseItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  // Calculate from credit notes
  const creditTotal = creditNoteItems.reduce((sum, item) => sum + (parseFloat(item.grossAmt) || 0), 0);
  
  // Calculate from debit notes
  const debitTotal = debitNoteItems.reduce((sum, item) => sum + (parseFloat(item.grossAmt) || 0), 0);
  
  setDashboardPerformance({
    sales: { 
      total: salesTotal, 
      count: invoiceItems.length,
      recent: invoiceItems.slice(-5)
    },
    purchase: { 
      total: purchaseTotal, 
      count: purchaseItems.length,
      recent: purchaseItems.slice(-5)
    },
    creditNote: { 
      total: creditTotal, 
      count: creditNoteItems.length,
      recent: creditNoteItems.slice(-5)
    },
    debitNote: { 
      total: debitTotal, 
      count: debitNoteItems.length,
      recent: debitNoteItems.slice(-5)
    }
  });
}, [invoiceItems, purchaseItems, creditNoteItems, debitNoteItems]);


  // Sales Invoice Functions
  const handleInvoiceInputChange = (e) => {
    setInvoiceFormData({ ...invoiceFormData, [e.target.name]: e.target.value });
  };

  const addInvoiceItem = useCallback(() => {
  const newItem = {
    id: Date.now(),
    sr: invoiceItems.length + 1,
    product: '',
    units: 'PCS',
    qty: '',
    free: '',
    mrp: '',
    rate: '',
    rateGst: '',
    tprAmt: '',           // Direct TPR amount (removed TPR%)
    schemePct: '',        // Scheme percentage
    schemeAmt: '',        // Scheme amount
    cdPct: '',           // CD percentage  
    cdAmt: '',           // CD amount
    starPct: '',         // Star percentage
    starAmt: '',         // Star amount
    taxable: '',
    gst: '',
    sgst: '',            // Added SGST
    cgst: '',            // Added CGST
    amount: ''
  };
  setInvoiceItems([...invoiceItems, newItem]);
  setActiveRow(invoiceItems.length);
}, [invoiceItems.length]);
const updateInvoiceItem = (index, field, value) => {
  const newItems = [...invoiceItems];
  newItems[index][field] = value;

  if (field === 'qty' && value !== undefined) {
    const item = newItems[index];
    const qty = parseFloat(value) || 0;
    const rate = parseFloat(item.rate) || 0;
    const baseAmount = qty * rate;
    item.amount = baseAmount.toFixed(2);

    // Calculate TPR amount
    let tprAmt = parseFloat(item.tprAmt) || 0;
    
    // Calculate Scheme amount from percentage or direct amount
    let schemeAmt = 0;
    if (item.schemePct) {
      const schemePct = parseFloat(item.schemePct) || 0;
      schemeAmt = (baseAmount * schemePct / 100);
      item.schemeAmt = schemeAmt.toFixed(2);
    } else if (item.schemeAmt) {
      schemeAmt = parseFloat(item.schemeAmt) || 0;
    }
    
    // Calculate CD amount from percentage or direct amount  
    let cdAmt = 0;
    if (item.cdPct) {
      const cdPct = parseFloat(item.cdPct) || 0;
      cdAmt = (baseAmount * cdPct / 100);
      item.cdAmt = cdAmt.toFixed(2);
    } else if (item.cdAmt) {
      cdAmt = parseFloat(item.cdAmt) || 0;
    }
    
    const starAmt = parseFloat(item.starAmt) || 0;
    
    // Taxable amount after all deductions
    let taxable = baseAmount - tprAmt - schemeAmt - cdAmt - starAmt;
    item.taxable = taxable.toFixed(2);
    
    // Calculate GST on taxable amount
    if (item.gst && taxable > 0) {
      const gstPct = parseFloat(item.gst) || 0;
      const gstAmount = (taxable * gstPct / 100);
      const halfGst = gstAmount / 2;
      item.sgst = halfGst.toFixed(2);
      item.cgst = halfGst.toFixed(2);
      
      const rateValue = parseFloat(item.rate) || 0;
      const gstPerUnit = (rateValue * gstPct / 100);
      item.rateGst = (rateValue + gstPerUnit).toFixed(2);
    }

    // Final amount = taxable + GST amount
    const gstAmount = (parseFloat(item.sgst) || 0) + (parseFloat(item.cgst) || 0);
    const finalAmount = taxable + gstAmount;
    item.amount = finalAmount.toFixed(2);
  } 
  else if (field === 'rate' && value !== undefined) {
    const item = newItems[index];
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(value) || 0;
    const baseAmount = qty * rate;
    item.amount = baseAmount.toFixed(2);
    
    let schemeAmt = 0;
    if (item.schemePct) {
      const schemePct = parseFloat(item.schemePct) || 0;
      schemeAmt = (baseAmount * schemePct / 100);
      item.schemeAmt = schemeAmt.toFixed(2);
    } else if (item.schemeAmt) {
      schemeAmt = parseFloat(item.schemeAmt) || 0;
    }
    
    let cdAmt = 0;
    if (item.cdPct) {
      const cdPct = parseFloat(item.cdPct) || 0;
      cdAmt = (baseAmount * cdPct / 100);
      item.cdAmt = cdAmt.toFixed(2);
    } else if (item.cdAmt) {
      cdAmt = parseFloat(item.cdAmt) || 0;
    }
    
    const tprAmt = parseFloat(item.tprAmt) || 0;
    const starAmt = parseFloat(item.starAmt) || 0;
    
    let taxable = baseAmount - tprAmt - schemeAmt - cdAmt - starAmt;
    item.taxable = taxable.toFixed(2);
    
    if (item.gst && taxable > 0) {
      const gstPct = parseFloat(item.gst) || 0;
      const gstAmount = (taxable * gstPct / 100);
      const halfGst = gstAmount / 2;
      item.sgst = halfGst.toFixed(2);
      item.cgst = halfGst.toFixed(2);
      
      const rateValue = parseFloat(value) || 0;
      const gstPerUnit = (rateValue * gstPct / 100);
      item.rateGst = (rateValue + gstPerUnit).toFixed(2);
    }
    
    const gstAmount = (parseFloat(item.sgst) || 0) + (parseFloat(item.cgst) || 0);
    const finalAmount = taxable + gstAmount;
    item.amount = finalAmount.toFixed(2);
  }
  else if (field === 'tprAmt' && value !== undefined) {
    const item = newItems[index];
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const baseAmount = qty * rate;
    const tprAmt = parseFloat(value) || 0;
    
    let schemeAmt = 0;
    if (item.schemePct) {
      const schemePct = parseFloat(item.schemePct) || 0;
      schemeAmt = (baseAmount * schemePct / 100);
      item.schemeAmt = schemeAmt.toFixed(2);
    } else if (item.schemeAmt) {
      schemeAmt = parseFloat(item.schemeAmt) || 0;
    }
    
    let cdAmt = 0;
    if (item.cdPct) {
      const cdPct = parseFloat(item.cdPct) || 0;
      cdAmt = (baseAmount * cdPct / 100);
      item.cdAmt = cdAmt.toFixed(2);
    } else if (item.cdAmt) {
      cdAmt = parseFloat(item.cdAmt) || 0;
    }
    
    const starAmt = parseFloat(item.starAmt) || 0;
    let taxable = baseAmount - tprAmt - schemeAmt - cdAmt - starAmt;
    item.taxable = taxable.toFixed(2);
    
    if (item.gst && taxable > 0) {
      const gstPct = parseFloat(item.gst) || 0;
      const gstAmount = (taxable * gstPct / 100);
      const halfGst = gstAmount / 2;
      item.sgst = halfGst.toFixed(2);
      item.cgst = halfGst.toFixed(2);
    }
    
    const gstAmount = (parseFloat(item.sgst) || 0) + (parseFloat(item.cgst) || 0);
    const finalAmount = taxable + gstAmount;
    item.amount = finalAmount.toFixed(2);
  }
  else if (field === 'schemePct' && value !== undefined) {
    const item = newItems[index];
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const baseAmount = qty * rate;
    const schemePct = parseFloat(value) || 0;
    
    // Calculate scheme amount from percentage
    const schemeAmt = (baseAmount * schemePct / 100);
    item.schemeAmt = schemeAmt.toFixed(2);
    item[field] = value;
    
    // Recalculate with new scheme amount
    const tprAmt = parseFloat(item.tprAmt) || 0;
    let cdAmt = 0;
    if (item.cdPct) {
      const cdPct = parseFloat(item.cdPct) || 0;
      cdAmt = (baseAmount * cdPct / 100);
      item.cdAmt = cdAmt.toFixed(2);
    } else if (item.cdAmt) {
      cdAmt = parseFloat(item.cdAmt) || 0;
    }
    const starAmt = parseFloat(item.starAmt) || 0;
    
    let taxable = baseAmount - tprAmt - schemeAmt - cdAmt - starAmt;
    item.taxable = taxable.toFixed(2);
    
    if (item.gst && taxable > 0) {
      const gstPct = parseFloat(item.gst) || 0;
      const gstAmount = (taxable * gstPct / 100);
      const halfGst = gstAmount / 2;
      item.sgst = halfGst.toFixed(2);
      item.cgst = halfGst.toFixed(2);
    }
    
    const gstAmount = (parseFloat(item.sgst) || 0) + (parseFloat(item.cgst) || 0);
    const finalAmount = taxable + gstAmount;
    item.amount = finalAmount.toFixed(2);
  }
  else if (field === 'schemeAmt' && value !== undefined) {
    const item = newItems[index];
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const baseAmount = qty * rate;
    const schemeAmt = parseFloat(value) || 0;
    
    // Clear percentage if direct amount is entered
    if (schemeAmt > 0) {
      item.schemePct = '';
    }
    item[field] = value;
    
    const tprAmt = parseFloat(item.tprAmt) || 0;
    let cdAmt = 0;
    if (item.cdPct) {
      const cdPct = parseFloat(item.cdPct) || 0;
      cdAmt = (baseAmount * cdPct / 100);
      item.cdAmt = cdAmt.toFixed(2);
    } else if (item.cdAmt) {
      cdAmt = parseFloat(item.cdAmt) || 0;
    }
    const starAmt = parseFloat(item.starAmt) || 0;
    
    let taxable = baseAmount - tprAmt - schemeAmt - cdAmt - starAmt;
    item.taxable = taxable.toFixed(2);
    
    if (item.gst && taxable > 0) {
      const gstPct = parseFloat(item.gst) || 0;
      const gstAmount = (taxable * gstPct / 100);
      const halfGst = gstAmount / 2;
      item.sgst = halfGst.toFixed(2);
      item.cgst = halfGst.toFixed(2);
    }
    
    const gstAmount = (parseFloat(item.sgst) || 0) + (parseFloat(item.cgst) || 0);
    const finalAmount = taxable + gstAmount;
    item.amount = finalAmount.toFixed(2);
  }
  else if (field === 'cdPct' && value !== undefined) {
    const item = newItems[index];
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const baseAmount = qty * rate;
    const cdPct = parseFloat(value) || 0;
    
    // Calculate CD amount from percentage
    const cdAmt = (baseAmount * cdPct / 100);
    item.cdAmt = cdAmt.toFixed(2);
    item[field] = value;
    
    const tprAmt = parseFloat(item.tprAmt) || 0;
    let schemeAmt = 0;
    if (item.schemePct) {
      const schemePct = parseFloat(item.schemePct) || 0;
      schemeAmt = (baseAmount * schemePct / 100);
      item.schemeAmt = schemeAmt.toFixed(2);
    } else if (item.schemeAmt) {
      schemeAmt = parseFloat(item.schemeAmt) || 0;
    }
    const starAmt = parseFloat(item.starAmt) || 0;
    
    let taxable = baseAmount - tprAmt - schemeAmt - cdAmt - starAmt;
    item.taxable = taxable.toFixed(2);
    
    if (item.gst && taxable > 0) {
      const gstPct = parseFloat(item.gst) || 0;
      const gstAmount = (taxable * gstPct / 100);
      const halfGst = gstAmount / 2;
      item.sgst = halfGst.toFixed(2);
      item.cgst = halfGst.toFixed(2);
    }
    
    const gstAmount = (parseFloat(item.sgst) || 0) + (parseFloat(item.cgst) || 0);
    const finalAmount = taxable + gstAmount;
    item.amount = finalAmount.toFixed(2);
  }
  else if (field === 'cdAmt' && value !== undefined) {
    const item = newItems[index];
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const baseAmount = qty * rate;
    const cdAmt = parseFloat(value) || 0;
    
    // Clear percentage if direct amount is entered
    if (cdAmt > 0) {
      item.cdPct = '';
    }
    item[field] = value;
    
    const tprAmt = parseFloat(item.tprAmt) || 0;
    let schemeAmt = 0;
    if (item.schemePct) {
      const schemePct = parseFloat(item.schemePct) || 0;
      schemeAmt = (baseAmount * schemePct / 100);
      item.schemeAmt = schemeAmt.toFixed(2);
    } else if (item.schemeAmt) {
      schemeAmt = parseFloat(item.schemeAmt) || 0;
    }
    const starAmt = parseFloat(item.starAmt) || 0;
    
    let taxable = baseAmount - tprAmt - schemeAmt - cdAmt - starAmt;
    item.taxable = taxable.toFixed(2);
    
    if (item.gst && taxable > 0) {
      const gstPct = parseFloat(item.gst) || 0;
      const gstAmount = (taxable * gstPct / 100);
      const halfGst = gstAmount / 2;
      item.sgst = halfGst.toFixed(2);
      item.cgst = halfGst.toFixed(2);
    }
    
    const gstAmount = (parseFloat(item.sgst) || 0) + (parseFloat(item.cgst) || 0);
    const finalAmount = taxable + gstAmount;
    item.amount = finalAmount.toFixed(2);
  }
  else if (field === 'gst' && value !== undefined) {
    const item = newItems[index];
    const taxable = parseFloat(item.taxable) || 0;
    const gstPct = parseFloat(value) || 0;
    
    if (taxable > 0) {
      const gstAmount = (taxable * gstPct / 100);
      const halfGst = gstAmount / 2;
      item.sgst = halfGst.toFixed(2);
      item.cgst = halfGst.toFixed(2);
      
      const rateValue = parseFloat(item.rate) || 0;
      const gstPerUnit = (rateValue * gstPct / 100);
      item.rateGst = (rateValue + gstPerUnit).toFixed(2);
    }
    
    const gstAmount = (parseFloat(item.sgst) || 0) + (parseFloat(item.cgst) || 0);
    const finalAmount = taxable + gstAmount;
    item.amount = finalAmount.toFixed(2);
  }

  calcInvoiceSummary(newItems);
  setInvoiceItems(newItems);
  setActiveRow(index);
};

const deleteInvoiceItem = (index) => {
  const newItems = invoiceItems.filter((_, i) => i !== index);
  newItems.forEach((item, i) => { item.sr = i + 1; });
  setInvoiceItems(newItems);
  calcInvoiceSummary(newItems);
};

// Replace the calcInvoiceSummary function with this corrected version:
const calcInvoiceSummary = (currentItems) => {
  let gross = 0, tpr = 0, scheme = 0, cd = 0, star = 0, gst = 0;
  currentItems.forEach(item => {
    const baseAmount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
    gross += baseAmount;
    tpr += parseFloat(item.tprAmt || 0);
    scheme += parseFloat(item.schemeAmt || 0);
    cd += parseFloat(item.cdAmt || 0);
    star += parseFloat(item.starAmt || 0);
    
    // Calculate GST amount properly (sgst + cgst)
    const sgst = parseFloat(item.sgst) || 0;
    const cgst = parseFloat(item.cgst) || 0;
    gst += (sgst + cgst);
  });
  
  const taxable = gross - tpr - scheme - star - cd;
  const net = taxable + gst;
  
  setInvoiceSummary({ 
    gross, 
    tpr, 
    scheme, 
    bottom: taxable,  // Taxable value is now shown as bottom amount
    star, 
    cd, 
    gst, 
    net: Math.round(net * 100) / 100 
  });
};

const handleInvoiceKeyDown = (e, index, field) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    
    const fields = ['product', 'units', 'qty', 'free', 'mrp', 'rate', 'tprAmt', 'schemePct', 'cdPct', 'starPct', 'gst'];
    const nextFieldIndex = fields.indexOf(field) + 1;
    
    if (nextFieldIndex < fields.length) {
      const nextInput = document.querySelector(`[data-field="${fields[nextFieldIndex]}"][data-index="${index}"]`);
      if (nextInput) {
        nextInput.focus();
      } else if (field === 'qty') {
        const nextField = fields[nextFieldIndex];
        const nextFieldInput = document.querySelector(`[data-field="${nextField}"][data-index="${index}"]`);
        if (nextFieldInput) nextFieldInput.focus();
      }
    } else {
      if (field === 'gst') {
        addInvoiceItem();
        setTimeout(() => {
          const nextProductInput = document.querySelector(`[data-product-index="${index + 1}"]`);
          if (nextProductInput) nextProductInput.focus();
        }, 100);
      } else {
        const nextProduct = document.querySelector(`[data-product-index="${index + 1}"]`);
        if (nextProduct) {
          nextProduct.focus();
        }
      }
    }
  }
};

const handleInvoiceProductClick = (index) => {
  setActiveRow(index);
  setCurrentProductIndex(index);
  setProductListFilter('');
  setShowProductList(true);

  setTimeout(() => {
    const currentInput = document.querySelector(
      `[data-product-index="${index}"]`
    );
    if (currentInput) {
      currentInput.focus();
    }
  }, 0);
};

 const handleProductSelect = (index, product) => {
  const selectedBatch = product.selectedBatch;
  
  updateInvoiceItem(index, 'product', `${product.code} - ${product.name}`);
  updateInvoiceItem(index, 'mrp', selectedBatch?.mrp || product.mrp || '');
  // Use sales rate from batch if available
  const salesRate = selectedBatch?.salesRate || product.salesRate || product.mrp || '';
  updateInvoiceItem(index, 'rate', salesRate);
  updateInvoiceItem(index, 'gst', product.gst || '');
  updateInvoiceItem(index, 'units', product.basicUnit || 'PCS');
  
  // Store batch info for calculation reference
  updateInvoiceItem(index, 'selectedBatch', selectedBatch);
  updateInvoiceItem(index, 'batchNo', selectedBatch?.batchNo || '');
  
  setShowProductList(false);
  setCurrentProductIndex(-1);
  
  // Focus on units field after selection
  setTimeout(() => {
    const unitsInput = document.querySelector(`[data-field="units"][data-index="${index}"]`);
    if (unitsInput) unitsInput.focus();
  }, 50);
};
  const saveInvoice = () => {
    const invoiceData = { ...invoiceFormData, items: invoiceItems, summary: invoiceSummary };
    console.log('Saving invoice:', invoiceData);
    alert('Invoice saved successfully!');
  };

  const addPurchaseItem = useCallback(() => {
  const newItem = {
    id: Date.now(),
    sr: purchaseItems.length + 1,
    product: '',
    productId: '',
    batchNo: '',
    mfgDate: '',
    expDate: '',
    unitId: 'PCS',
    quantity: '',
    free: '',
    stockQty: '',
    mrp: '',
    purRate: '',
    salesRate: '',
    grossAmount: '',
    disc1: '',
    disc2: '',
    disc3: '',
    taxable: '',
    tax: '',
    cgst: '',
    sgst: '',
    afterDisc1: '',
    afterDisc2: '',
    afterDisc3: '',
    amount: '',
    discountPercent: ''
  };
  setPurchaseItems([...purchaseItems, newItem]);
  setPurchaseActiveRow(purchaseItems.length);
  
  // Note: Don't call calcPurchaseSummary here as it will be called when items change
}, [purchaseItems.length]);

 const updatePurchaseItem = (index, field, value) => {
  const newItems = [...purchaseItems];
  newItems[index][field] = value;

  // Helper function to recalculate all values for an item
  const recalculateItem = (item) => {
    // Get quantity and rate
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.purRate) || parseFloat(item.selectedBatch?.purchaseRate) || 0;
    
    // Calculate gross amount
    const grossAmt = qty * rate;
    item.grossAmount = grossAmt.toFixed(2);

    // Apply disc1
    let afterDisc1 = grossAmt;
    if (parseFloat(item.disc1)) {
      const disc1Amt = grossAmt * (parseFloat(item.disc1) / 100);
      afterDisc1 = grossAmt - disc1Amt;
    }
    item.afterDisc1 = afterDisc1.toFixed(2);

    // Apply disc2
    let afterDisc2 = afterDisc1;
    if (parseFloat(item.disc2)) {
      const disc2Amt = afterDisc1 * (parseFloat(item.disc2) / 100);
      afterDisc2 = afterDisc1 - disc2Amt;
    }
    item.afterDisc2 = afterDisc2.toFixed(2);

    // Apply disc3
    let afterDisc3 = afterDisc2;
    if (parseFloat(item.disc3)) {
      const disc3Amt = afterDisc2 * (parseFloat(item.disc3) / 100);
      afterDisc3 = afterDisc2 - disc3Amt;
    }
    item.afterDisc3 = afterDisc3.toFixed(2);

    // Taxable amount is the amount after all discounts
    const taxableVal = afterDisc3;
    item.taxable = taxableVal.toFixed(2);

    // Calculate CGST and SGST based on taxable amount and GST percentage
    const taxPercentage = parseFloat(item.tax) || 0;
    if (taxPercentage > 0) {
      const totalTaxAmt = taxableVal * (taxPercentage / 100);
      const cgstAmt = totalTaxAmt / 2;
      const sgstAmt = totalTaxAmt / 2;
      item.cgst = cgstAmt.toFixed(2);
      item.sgst = sgstAmt.toFixed(2);
    } else {
      item.cgst = (0).toFixed(2);
      item.sgst = (0).toFixed(2);
    }

    // Calculate final amount = taxable + CGST + SGST
    const amount = taxableVal + (parseFloat(item.cgst) || 0) + (parseFloat(item.sgst) || 0);
    item.amount = amount.toFixed(2);
  };

  // Recalculate whenever any relevant field changes
  if (['quantity', 'purRate', 'tax', 'disc1', 'disc2', 'disc3'].includes(field)) {
    recalculateItem(newItems[index]);
  }

  setPurchaseItems(newItems);
  setPurchaseActiveRow(index);
  
  // ADD THIS LINE - Calculate summary after updating items
  calcPurchaseSummary();
};
// Add this function - place it after the updatePurchaseItem function
const calcPurchaseSummary = useCallback(() => {
  let totalMrp = 0;
  let totalGrossAmount = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  
  purchaseItems.forEach(item => {
    const qty = parseFloat(item.quantity) || 0;
    const mrp = parseFloat(item.mrp) || 0;
    const rate = parseFloat(item.purRate) || 0;
    
    totalMrp += qty * mrp;
    totalGrossAmount += qty * rate;
    
    const taxable = parseFloat(item.taxable) || 0;
    const cgst = parseFloat(item.cgst) || 0;
    const sgst = parseFloat(item.sgst) || 0;
    
    totalTaxable += taxable;
    totalCgst += cgst;
    totalSgst += sgst;
  });
  
  // Calculate header-level discounts (these are separate from item-level discounts)
  const tcbPercent = parseFloat(purchaseFormData.tcbPercent) || 0;
  const diBc1 = parseFloat(purchaseFormData.diBc1) || 0;
  const diBc2 = parseFloat(purchaseFormData.diBc2) || 0;
  const diBc3 = parseFloat(purchaseFormData.diBc3) || 0;
  const rounding = parseFloat(purchaseFormData.rounding) || 0;
  
  // Calculate TCB Amount on MRP Total
  const tcbAmount = totalMrp * tcbPercent / 100;
  
  // After DISC1 (direct discount)
  const afterDiBc1 = totalMrp - diBc1;
  
  // Gross Amount = After DISC1 - TCB Amount
  const groBsAmt = afterDiBc1 - tcbAmount;
  
  // After DISC2
  const afterDiBc2 = groBsAmt - diBc2;
  
  // QBT Amount (GST on taxable value) - this should be total taxable from items
  // But since the purchase items already include GST in their calculations,
  // we need to calculate QBT Amount properly
  const qbtAmt = totalTaxable;
  
  // After DISC3
  const afterDiBc3 = qbtAmt - diBc3;
  
  // CEBS Amount
  const ceBsAmt = afterDiBc3;
  
  // Net Amount
  const netAmt = ceBsAmt + rounding;
  
  setPurchaseFormData(prev => ({
    ...prev,
    mrpTotal: totalMrp.toFixed(2),
    tcbAmount: tcbAmount.toFixed(2),
    afterDiBc1: afterDiBc1.toFixed(2),
    groBsAmt: groBsAmt.toFixed(2),
    afterDiBc2: afterDiBc2.toFixed(2),
    qbtAmt: qbtAmt.toFixed(2),
    afterDiBc3: afterDiBc3.toFixed(2),
    ceBsAmt: ceBsAmt.toFixed(2),
    netAmt: netAmt.toFixed(2)
  }));
}, [purchaseItems, purchaseFormData.tcbPercent, purchaseFormData.diBc1, purchaseFormData.diBc2, purchaseFormData.diBc3, purchaseFormData.rounding]);
  
const deletePurchaseItem = (index) => {
  const newItems = purchaseItems.filter((_, i) => i !== index);
  newItems.forEach((item, i) => { item.sr = i + 1; });
  setPurchaseItems(newItems);
  
  // ADD THIS LINE - Calculate summary after deleting item
  calcPurchaseSummary();
};

  const handlePurchaseInputChange = (e) => {
  const { name, value } = e.target;
  let newValue = value;
  let updatedForm = { ...purchaseFormData, [name]: value };

  if (name === 'tcbPercent' || name === 'diBc1' || name === 'diBc2' || name === 'diBc3' || name === 'rounding') {
    setPurchaseFormData(updatedForm);
    // ADD THIS - Trigger recalculation of summary when these fields change
    setTimeout(() => calcPurchaseSummary(), 0);
  } else {
    setPurchaseFormData(updatedForm);
  }
};
 const handlePurchaseKeyDown = (e, index, field) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    
    // If we're in the quantity field, trigger calculations and add new row
    if (field === 'quantity') {
      // Trigger the quantity update
      const qtyValue = e.target.value;
      if (qtyValue && parseFloat(qtyValue) > 0) {
        // Add new row after quantity is entered
        setTimeout(() => {
          addPurchaseItem();
          setTimeout(() => {
            const nextProductInput = document.querySelector(`[data-purchase-product-index="${index + 1}"]`);
            if (nextProductInput) nextProductInput.focus();
          }, 50);
        }, 100);
      }
    } else {
      const fields = ['product', 'unitId', 'quantity', 'free', 'mrp', 'purRate', 'disc1', 'disc2', 'disc3', 'tax'];
      const nextFieldIndex = fields.indexOf(field) + 1;
      if (nextFieldIndex < fields.length) {
        const nextInput = document.querySelector(`[data-purchase-field="${fields[nextFieldIndex]}"][data-purchase-index="${index}"]`);
        nextInput?.focus();
      } else {
        const nextProduct = document.querySelector(`[data-purchase-product-index="${index + 1}"]`);
        if (nextProduct) {
          nextProduct.focus();
        } else {
          addPurchaseItem();
          setTimeout(() => {
            const nextProductInput = document.querySelector(`[data-purchase-product-index="${index + 1}"]`);
            if (nextProductInput) nextProductInput.focus();
          }, 100);
        }
      }
    }
  }
};
  const handlePurchaseProductClick = (index) => {

  setShowPurchaseProductList(false);

  setTimeout(() => {

    setCurrentPurchaseProductIndex(index);

    setPurchaseProductListFilter('');

    setShowPurchaseProductList(true);

  }, 50);

};

 const handlePurchaseProductSelect = (index, product) => {
  updatePurchaseItem(index, 'product', `${product.code} - ${product.name}`);
  updatePurchaseItem(index, 'productId', product.id);
  updatePurchaseItem(index, 'mrp', product.mrp || '');
  updatePurchaseItem(index, 'purRate', product.Rate_Per_Unit || '');
  updatePurchaseItem(index, 'tax', product.gst || '');
  updatePurchaseItem(index, 'unitId', product.basicUnit || 'PCS');
  updatePurchaseItem(index, 'salesRate', product.salesRate || '');
  
  setShowPurchaseProductList(false);
  setCurrentPurchaseProductIndex(-1);
  
  // Check if product has existing batches
  const productBatches = batches.filter(b => b.productId === product.id);
  
  if (productBatches.length > 0) {
    // Show existing batch modal
    setBatchMode('existing');
    setCurrentBatchRow(index);
    setShowBatchModal(true);
  } else {
    // Show new batch modal
    setBatchMode('new');
    setCurrentBatchRow(index);
    setBatchForm({
      batchNo: '',
      mfgDate: '',
      expDate: '',
      mrp: product.mrp || '',
      purchaseRate: product.Rate_Per_Unit || '',
      salesRate: product.salesRate || product.mrp || '',
      stockQty: '',
      boxPack: '1',
      ratePerUnit: '1',
      previousPurchaseRate: '',
      quantity: '1'
    });
    setShowBatchModal(true);
  }
  
  setTimeout(() => {
    const qtyInput = document.querySelector(`[data-purchase-field="quantity"][data-purchase-index="${index}"]`);
    if (qtyInput) qtyInput.focus();
  }, 50);
};
  const openBatchModal = (index) => {
    console.log("BATCH BUTTON CLICKED");
    setCurrentBatchRow(index);

    setBatchForm({
      batchNo: '',
      mfgDate: '',
      expDate: '',
      mrp: '',
      purchaseRate: '',
      salesRate: '',
      stockQty: ''
    });

    setShowBatchModal(true);
  };


const saveBatchDetails = () => {
  const updatedItems = [...purchaseItems];
  updatedItems[currentBatchRow] = {
    ...updatedItems[currentBatchRow],
    selectedBatch: { ...batchForm },
    batchNo: batchForm.batchNo,
    mfgDate: batchForm.mfgDate,
    expDate: batchForm.expDate,
    mrp: batchForm.mrp,
    purRate: batchForm.purchaseRate,
    salesRate: batchForm.salesRate,
    stockQty: batchForm.stockQty,
    boxPack: batchForm.boxPack,
    ratePerUnit: batchForm.ratePerUnit,
    previousPurchaseRate: batchForm.previousPurchaseRate,
    quantity: batchForm.quantity
  };
  setPurchaseItems(updatedItems);
  setBatches([
    ...batches,
    {
      productId: updatedItems[currentBatchRow].productId,
      product: updatedItems[currentBatchRow].product,
      ...batchForm
    }
  ]);
  setShowBatchModal(false);
};

  const savePurchase = () => {
    const purchaseData = { ...purchaseFormData, items: purchaseItems };
    console.log('Saving purchase:', purchaseData);
    alert('Purchase saved successfully!');
  };
  const existingBatches = batches.filter(
    b =>
      b.productId === purchaseItems[currentBatchRow]?.productId
  );



  // ==================== CREDIT NOTE FUNCTIONS ====================
  const handleCreditNoteInputChange = (e) => {
    setCreditNoteFormData({ ...creditNoteFormData, [e.target.name]: e.target.value });
  };

  const addCreditNoteItem = useCallback(() => {
    const newItem = {
      id: Date.now(),
      sr: creditNoteItems.length + 1,
      trn: 'GDR',
      itemCode: '',
      itemName: '',
      unit: 'PCS',
      qty: '',
      free: '',
      rate: '',
      grossAmt: '',
      schPercent: '',
      schAmt: '',
      cdPercent: '',
      cdAmt: '',
      tprPercent: '',
      tprAmt: '',
      starPercent: '',
      taxable: '',
      gstPercent: '',
      gstAmt: '',
      avDisc1: '',
      avDisc2: '',
      areaCode: '',
      cgst: '',
      sgst: '',
      igst: '',
      cessPercent: '',
      cessAmt: '',
      cessPerPi: '',
      secCessi: '',
      crateSize: '',
      crateQty: '',
      crateSysProc: ''
    };
    setCreditNoteItems([...creditNoteItems, newItem]);
    setCreditNoteActiveRow(creditNoteItems.length);
  }, [creditNoteItems.length]);

  const updateCreditNoteItem = (index, field, value) => {
    const newItems = [...creditNoteItems];
    newItems[index][field] = value;

    if (field === 'qty' && value) {
      const item = newItems[index];
      const qty = parseFloat(value) || 0;
      const rate = parseFloat(item.rate) || 0;
      const grossAmt = qty * rate;
      item.grossAmt = grossAmt.toFixed(2);

      let schAmt = 0;
      if (parseFloat(item.schPercent)) {
        schAmt = grossAmt * (parseFloat(item.schPercent) / 100);
        item.schAmt = schAmt.toFixed(2);
      }

      let tprAmt = 0;
      if (parseFloat(item.tprPercent)) {
        tprAmt = grossAmt * (parseFloat(item.tprPercent) / 100);
        item.tprAmt = tprAmt.toFixed(2);
      }

      let cdAmt = 0;
      if (parseFloat(item.cdPercent)) {
        cdAmt = grossAmt * (parseFloat(item.cdPercent) / 100);
        item.cdAmt = cdAmt.toFixed(2);
      }

      const taxable = grossAmt - tprAmt - schAmt;
      item.taxable = taxable.toFixed(2);

      if (parseFloat(item.gstPercent)) {
        const gstAmt = taxable * (parseFloat(item.gstPercent) / 100);
        item.gstAmt = gstAmt.toFixed(2);
        const halfGst = (gstAmt / 2).toFixed(2);
        if (item.igst === 'Y') {
          item.igst = gstAmt.toFixed(2);
        } else {
          item.cgst = halfGst;
          item.sgst = halfGst;
        }
      }

      calcCreditNoteSummary(newItems);

      // Add new row when qty is entered and it's the last row
      if (value && parseFloat(value) > 0 && index === newItems.length - 1) {
        setTimeout(() => {
          addCreditNoteItem();
          setTimeout(() => {
            const nextProductInput = document.querySelector(`[data-credit-product-index="${index + 1}"]`);
            if (nextProductInput) nextProductInput.focus();
          }, 50);
        }, 100);
      }
    } else if (field === 'rate' && value) {
      const item = newItems[index];
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(value) || 0;
      const grossAmt = qty * rate;
      item.grossAmt = grossAmt.toFixed(2);

      let schAmt = 0;
      if (parseFloat(item.schPercent)) {
        schAmt = grossAmt * (parseFloat(item.schPercent) / 100);
        item.schAmt = schAmt.toFixed(2);
      }

      let tprAmt = 0;
      if (parseFloat(item.tprPercent)) {
        tprAmt = grossAmt * (parseFloat(item.tprPercent) / 100);
        item.tprAmt = tprAmt.toFixed(2);
      }

      let cdAmt = 0;
      if (parseFloat(item.cdPercent)) {
        cdAmt = grossAmt * (parseFloat(item.cdPercent) / 100);
        item.cdAmt = cdAmt.toFixed(2);
      }

      const taxable = grossAmt - tprAmt - schAmt;
      item.taxable = taxable.toFixed(2);

      if (parseFloat(item.gstPercent)) {
        const gstAmt = taxable * (parseFloat(item.gstPercent) / 100);
        item.gstAmt = gstAmt.toFixed(2);
        const halfGst = (gstAmt / 2).toFixed(2);
        if (item.igst === 'Y') {
          item.igst = gstAmt.toFixed(2);
        } else {
          item.cgst = halfGst;
          item.sgst = halfGst;
        }
      }

      calcCreditNoteSummary(newItems);
    } else if (field === 'schPercent' && value) {
      const item = newItems[index];
      const grossAmt = parseFloat(item.grossAmt) || 0;
      const schAmt = grossAmt * (parseFloat(value) / 100);
      item.schAmt = schAmt.toFixed(2);
      const taxable = grossAmt - (parseFloat(item.tprAmt) || 0) - schAmt;
      item.taxable = taxable.toFixed(2);
      if (parseFloat(item.gstPercent)) {
        const gstAmt = taxable * (parseFloat(item.gstPercent) / 100);
        item.gstAmt = gstAmt.toFixed(2);
      }
      calcCreditNoteSummary(newItems);
    } else if (field === 'tprPercent' && value) {
      const item = newItems[index];
      const grossAmt = parseFloat(item.grossAmt) || 0;
      const tprAmt = grossAmt * (parseFloat(value) / 100);
      item.tprAmt = tprAmt.toFixed(2);
      const taxable = grossAmt - tprAmt - (parseFloat(item.schAmt) || 0);
      item.taxable = taxable.toFixed(2);
      if (parseFloat(item.gstPercent)) {
        const gstAmt = taxable * (parseFloat(item.gstPercent) / 100);
        item.gstAmt = gstAmt.toFixed(2);
      }
      calcCreditNoteSummary(newItems);
    } else if (field === 'gstPercent' && value) {
      const item = newItems[index];
      const taxable = parseFloat(item.taxable) || 0;
      const gstAmt = taxable * (parseFloat(value) / 100);
      item.gstAmt = gstAmt.toFixed(2);
      const halfGst = (gstAmt / 2).toFixed(2);
      if (item.igst === 'Y') {
        item.igst = gstAmt.toFixed(2);
      } else {
        item.cgst = halfGst;
        item.sgst = halfGst;
      }
      calcCreditNoteSummary(newItems);
    } else if (field === 'cdPercent' && value) {
      const item = newItems[index];
      const grossAmt = parseFloat(item.grossAmt) || 0;
      const cdAmt = grossAmt * (parseFloat(value) / 100);
      item.cdAmt = cdAmt.toFixed(2);
      calcCreditNoteSummary(newItems);
    }

    setCreditNoteItems(newItems);
    setCreditNoteActiveRow(index);
  };

  const deleteCreditNoteItem = (index) => {
    const newItems = creditNoteItems.filter((_, i) => i !== index);
    newItems.forEach((item, i) => { item.sr = i + 1; });
    setCreditNoteItems(newItems);
    calcCreditNoteSummary(newItems);
  };

  const calcCreditNoteSummary = (currentItems) => {
    let grossAmt = 0, schemeAmt = 0, tprAmt = 0, cashDisc = 0, gstAmt = 0, starAmt = 0, cessAmt = 0;
    currentItems.forEach(item => {
      grossAmt += parseFloat(item.grossAmt || 0);
      schemeAmt += parseFloat(item.schAmt || 0);
      tprAmt += parseFloat(item.tprAmt || 0);
      cashDisc += parseFloat(item.cdAmt || 0);
      gstAmt += parseFloat(item.gstAmt || 0);
    });
    const netAmt = grossAmt - tprAmt - schemeAmt - cashDisc + gstAmt;
    setCreditNoteSummary({
      ...creditNoteSummary,
      grossAmt,
      schemeAmt,
      tprAmt,
      cashDisc,
      gstAmt,
      netAmt: netAmt.toFixed(2),
      tcsAmt: 0,
      rounding: 0,
      cessAmt
    });
  };

  const handleCreditNoteKeyDown = (e, index, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const fields = ['trn', 'itemCode', 'itemName', 'unit', 'qty', 'free', 'rate', 'schPercent', 'cdPercent', 'tprPercent', 'starPercent', 'gstPercent'];
      const nextFieldIndex = fields.indexOf(field) + 1;
      if (nextFieldIndex < fields.length) {
        const nextInput = document.querySelector(`[data-credit-field="${fields[nextFieldIndex]}"][data-credit-index="${index}"]`);
        nextInput?.focus();
      } else {
        const nextProduct = document.querySelector(`[data-credit-product-index="${index + 1}"]`);
        if (nextProduct) {
          nextProduct.focus();
        } else {
          addCreditNoteItem();
          setTimeout(() => {
            const nextProductInput = document.querySelector(`[data-credit-product-index="${index + 1}"]`);
            if (nextProductInput) nextProductInput.focus();
          }, 100);
        }
      }
    }
  };

  const handleCreditProductClick = (index) => {
    setCurrentCreditProductIndex(index);
    setCreditProductListFilter('');
    setShowCreditProductList(true);
  };

  const handleCreditProductSelect = (index, product) => {
    updateCreditNoteItem(index, 'itemCode', product.code);
    updateCreditNoteItem(index, 'itemName', product.name);
    updateCreditNoteItem(index, 'rate', product.Rate_Per_Unit || '');
    updateCreditNoteItem(index, 'gstPercent', product.gst || '');
    updateCreditNoteItem(index, 'unit', product.basicUnit || 'PCS');
    setShowCreditProductList(false);
    setCurrentCreditProductIndex(-1);
    setTimeout(() => {
      const qtyInput = document.querySelector(`[data-credit-field="qty"][data-credit-index="${index}"]`);
      if (qtyInput) qtyInput.focus();
    }, 50);
  };

  const saveCreditNote = () => {
    const creditNoteData = { ...creditNoteFormData, items: creditNoteItems, summary: creditNoteSummary };
    console.log('Saving credit note:', creditNoteData);
    alert('Credit Note saved successfully!');
  };

  // ==================== DEBIT NOTE FUNCTIONS ====================
  const handleDebitNoteInputChange = (e) => {
    setDebitNoteFormData({ ...debitNoteFormData, [e.target.name]: e.target.value });
  };

  const addDebitNoteItem = useCallback(() => {
    const newItem = {
      id: Date.now(),
      sr: debitNoteItems.length + 1,
      trn: 'DGR',
      itemCode: '',
      itemName: '',
      unit: 'PCS',
      qty: '',
      free: '',
      rate: '',
      grossAmt: '',
      bvDisc1: '',
      bvDisc2: '',
      bvAdd1: '',
      bvAdd2: '',
      taxable: '',
      gstPercent: '',
      gstArt: '',
      avDisc1: '',
      avDisc2: '',
      cgst: '',
      sgst: '',
      igst: '',
      cessPercent: '',
      cessAmt: '',
      cessPerP: ''
    };
    setDebitNoteItems([...debitNoteItems, newItem]);
    setDebitNoteActiveRow(debitNoteItems.length);
  }, [debitNoteItems.length]);

  const updateDebitNoteItem = (index, field, value) => {
    const newItems = [...debitNoteItems];
    newItems[index][field] = value;

    if (field === 'qty' && value) {
      const item = newItems[index];
      const qty = parseFloat(value) || 0;
      const rate = parseFloat(item.rate) || 0;
      const grossAmt = qty * rate;
      item.grossAmt = grossAmt.toFixed(2);

      let afterDisc1 = grossAmt;
      if (parseFloat(item.bvDisc1)) {
        const disc1Amt = grossAmt * (parseFloat(item.bvDisc1) / 100);
        afterDisc1 = grossAmt - disc1Amt;
      }

      let afterDisc2 = afterDisc1;
      if (parseFloat(item.bvDisc2)) {
        const disc2Amt = afterDisc1 * (parseFloat(item.bvDisc2) / 100);
        afterDisc2 = afterDisc1 - disc2Amt;
      }

      let afterAdd1 = afterDisc2;
      if (parseFloat(item.bvAdd1)) {
        afterAdd1 = afterDisc2 + (grossAmt * parseFloat(item.bvAdd1) / 100);
      }

      let afterAdd2 = afterAdd1;
      if (parseFloat(item.bvAdd2)) {
        afterAdd2 = afterAdd1 + (grossAmt * parseFloat(item.bvAdd2) / 100);
      }

      item.taxable = afterAdd2.toFixed(2);

      if (parseFloat(item.gstPercent)) {
        const gstAmt = afterAdd2 * (parseFloat(item.gstPercent) / 100);
        item.gstArt = gstAmt.toFixed(2);
        const halfGst = (gstAmt / 2).toFixed(2);
        if (debitNoteFormData.igst === 'Y') {
          item.igst = gstAmt.toFixed(2);
        } else {
          item.cgst = halfGst;
          item.sgst = halfGst;
        }
      }

      calcDebitNoteSummary(newItems);

      // Add new row when qty is entered and it's the last row
      if (value && parseFloat(value) > 0 && index === newItems.length - 1) {
        setTimeout(() => {
          addDebitNoteItem();
          setTimeout(() => {
            const nextProductInput = document.querySelector(`[data-debit-product-index="${index + 1}"]`);
            if (nextProductInput) nextProductInput.focus();
          }, 50);
        }, 100);
      }
    } else if (field === 'rate' && value) {
      const item = newItems[index];
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(value) || 0;
      const grossAmt = qty * rate;
      item.grossAmt = grossAmt.toFixed(2);

      let afterDisc1 = grossAmt;
      if (parseFloat(item.bvDisc1)) {
        const disc1Amt = grossAmt * (parseFloat(item.bvDisc1) / 100);
        afterDisc1 = grossAmt - disc1Amt;
      }

      let afterDisc2 = afterDisc1;
      if (parseFloat(item.bvDisc2)) {
        const disc2Amt = afterDisc1 * (parseFloat(item.bvDisc2) / 100);
        afterDisc2 = afterDisc1 - disc2Amt;
      }

      let afterAdd1 = afterDisc2;
      if (parseFloat(item.bvAdd1)) {
        afterAdd1 = afterDisc2 + (grossAmt * parseFloat(item.bvAdd1) / 100);
      }

      let afterAdd2 = afterAdd1;
      if (parseFloat(item.bvAdd2)) {
        afterAdd2 = afterAdd1 + (grossAmt * parseFloat(item.bvAdd2) / 100);
      }

      item.taxable = afterAdd2.toFixed(2);

      if (parseFloat(item.gstPercent)) {
        const gstAmt = afterAdd2 * (parseFloat(item.gstPercent) / 100);
        item.gstArt = gstAmt.toFixed(2);
        const halfGst = (gstAmt / 2).toFixed(2);
        if (debitNoteFormData.igst === 'Y') {
          item.igst = gstAmt.toFixed(2);
        } else {
          item.cgst = halfGst;
          item.sgst = halfGst;
        }
      }

      calcDebitNoteSummary(newItems);
    } else if (field === 'bvDisc1' && value) {
      const item = newItems[index];
      const grossAmt = parseFloat(item.grossAmt) || 0;
      const disc1Amt = grossAmt * (parseFloat(value) / 100);
      const afterDisc1 = grossAmt - disc1Amt;
      let afterDisc2 = afterDisc1;
      if (parseFloat(item.bvDisc2)) {
        const disc2Amt = afterDisc1 * (parseFloat(item.bvDisc2) / 100);
        afterDisc2 = afterDisc1 - disc2Amt;
      }
      let afterAdd1 = afterDisc2;
      if (parseFloat(item.bvAdd1)) {
        afterAdd1 = afterDisc2 + (grossAmt * parseFloat(item.bvAdd1) / 100);
      }
      let afterAdd2 = afterAdd1;
      if (parseFloat(item.bvAdd2)) {
        afterAdd2 = afterAdd1 + (grossAmt * parseFloat(item.bvAdd2) / 100);
      }
      item.taxable = afterAdd2.toFixed(2);
      if (parseFloat(item.gstPercent)) {
        const gstAmt = afterAdd2 * (parseFloat(item.gstPercent) / 100);
        item.gstArt = gstAmt.toFixed(2);
      }
      calcDebitNoteSummary(newItems);
    } else if (field === 'gstPercent' && value) {
      const item = newItems[index];
      const taxable = parseFloat(item.taxable) || 0;
      const gstAmt = taxable * (parseFloat(value) / 100);
      item.gstArt = gstAmt.toFixed(2);
      const halfGst = (gstAmt / 2).toFixed(2);
      if (debitNoteFormData.igst === 'Y') {
        item.igst = gstAmt.toFixed(2);
      } else {
        item.cgst = halfGst;
        item.sgst = halfGst;
      }
      calcDebitNoteSummary(newItems);
    }

    setDebitNoteItems(newItems);
    setDebitNoteActiveRow(index);
  };

  const deleteDebitNoteItem = (index) => {
    const newItems = debitNoteItems.filter((_, i) => i !== index);
    newItems.forEach((item, i) => { item.sr = i + 1; });
    setDebitNoteItems(newItems);
    calcDebitNoteSummary(newItems);
  };

  const calcDebitNoteSummary = (currentItems) => {
    let grossAmt = 0, gstAmt = 0;
    currentItems.forEach(item => {
      grossAmt += parseFloat(item.grossAmt || 0);
      gstAmt += parseFloat(item.gstArt || 0);
    });
    const netAmt = grossAmt + gstAmt;
    setDebitNoteSummary({
      ...debitNoteSummary,
      grossAmt,
      gstAmt,
      netAmt: netAmt.toFixed(2),
      beforeVatDiscAmt: grossAmt,
      afterVatDiscAmt: grossAmt,
      tcsAmt: 0
    });
  };

  const handleDebitNoteKeyDown = (e, index, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const fields = ['trn', 'itemCode', 'itemName', 'unit', 'qty', 'free', 'rate', 'bvDisc1', 'bvDisc2', 'bvAdd1', 'bvAdd2', 'gstPercent'];
      const nextFieldIndex = fields.indexOf(field) + 1;
      if (nextFieldIndex < fields.length) {
        const nextInput = document.querySelector(`[data-debit-field="${fields[nextFieldIndex]}"][data-debit-index="${index}"]`);
        nextInput?.focus();
      } else {
        const nextProduct = document.querySelector(`[data-debit-product-index="${index + 1}"]`);
        if (nextProduct) {
          nextProduct.focus();
        } else {
          addDebitNoteItem();
          setTimeout(() => {
            const nextProductInput = document.querySelector(`[data-debit-product-index="${index + 1}"]`);
            if (nextProductInput) nextProductInput.focus();
          }, 100);
        }
      }
    }
  };

  const handleDebitProductClick = (index) => {
    setCurrentDebitProductIndex(index);
    setDebitProductListFilter('');
    setShowDebitProductList(true);
  };

  const handleDebitProductSelect = (index, product) => {
    updateDebitNoteItem(index, 'itemCode', product.code);
    updateDebitNoteItem(index, 'itemName', product.name);
    updateDebitNoteItem(index, 'rate', product.Rate_Per_Unit || '');
    updateDebitNoteItem(index, 'gstPercent', product.gst || '');
    updateDebitNoteItem(index, 'unit', product.basicUnit || 'PCS');
    setShowDebitProductList(false);
    setCurrentDebitProductIndex(-1);
    setTimeout(() => {
      const qtyInput = document.querySelector(`[data-debit-field="qty"][data-debit-index="${index}"]`);
      if (qtyInput) qtyInput.focus();
    }, 50);
  };

  const saveDebitNote = () => {
    const debitNoteData = { ...debitNoteFormData, items: debitNoteItems, summary: debitNoteSummary };
    console.log('Saving debit note:', debitNoteData);
    alert('Debit Note saved successfully!');
  };

  // Filter handler
  const handleFilterChange = (masterType, value) => {
    setFilters({ ...filters, [masterType]: value });
  };

  // Export to Excel
  const exportToExcel = (data, filename, columns) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, filename);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = (data, title, columns) => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);

    const tableData = data.map(row => columns.map(col => row[col.key] || '-'));
    const headers = columns.map(col => col.label);

    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 25,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 }
    });

    doc.save(`${title}.pdf`);
  };

  // Get filtered data
  const getFilteredCompanies = () => {
    return companies.filter(company =>
      company.code?.toLowerCase().includes(filters.company.toLowerCase()) ||
      company.name?.toLowerCase().includes(filters.company.toLowerCase())
    );
  };

  const getFilteredGroups = () => {
    return groupsState.filter(group =>
      group.code?.toLowerCase().includes(filters.group.toLowerCase()) ||
      group.name?.toLowerCase().includes(filters.group.toLowerCase())
    );
  };

  const getFilteredCategories = () => {
    return categoriesState.filter(category =>
      category.code?.toLowerCase().includes(filters.category.toLowerCase()) ||
      category.name?.toLowerCase().includes(filters.category.toLowerCase())
    );
  };

  const getFilteredProducts = () => {
    return products.filter(product =>
      product.code?.toLowerCase().includes(filters.product.toLowerCase()) ||
      product.name?.toLowerCase().includes(filters.product.toLowerCase())
    );
  };

  const getFilteredAccounts = () => {
    return accounts.filter(account =>
      account.accountCode?.toLowerCase().includes(filters.account.toLowerCase()) ||
      account.accountName?.toLowerCase().includes(filters.account.toLowerCase())
    );
  };

  const getFilteredOtherAccounts = () => {
    return otherAccounts.filter(account =>
      account.accountCode?.toLowerCase().includes(filters.otherAccount.toLowerCase()) ||
      account.accountName?.toLowerCase().includes(filters.otherAccount.toLowerCase())
    );
  };

  const getFilteredGST = () => {
    return gstList.filter(gst =>
      gst.code?.toLowerCase().includes(filters.gst.toLowerCase())
    );
  };

  const getFilteredSalesmen = () => {
    return salesmen.filter(salesman =>
      salesman.code?.toLowerCase().includes(filters.salesman.toLowerCase()) ||
      salesman.name?.toLowerCase().includes(filters.salesman.toLowerCase())
    );
  };

  const getFilteredAreas = () => {
    return areas.filter(area =>
      area.code?.toLowerCase().includes(filters.area.toLowerCase()) ||
      area.name?.toLowerCase().includes(filters.area.toLowerCase())
    );
  };

  const getFilteredServices = () => {
    return services.filter(service =>
      service.code?.toLowerCase().includes(filters.service.toLowerCase()) ||
      service.name?.toLowerCase().includes(filters.service.toLowerCase())
    );
  };

  const handleMenuClick = (menuKey) => {
    setActiveMenu(activeMenu === menuKey ? null : menuKey);
  };

  const handleSubMenuClick = (item) => {
  setActiveSubMenu(item);
  setOpenFormFor(null);
  setAccountActiveTab('basic');
  setOtherAccountActiveTab('basic');
  setEditGstId(null);
  setEditSalesmanId(null);
  
  // Handle Logout
  if (item === 'Logout') {
    handleLogout();
    return;
  }
  
  // Handle Dashboard items
  if (item === 'Firm Creation') {
    setOpenFormFor('Firm Creation');
    return;
  }
  if (item === 'User Creation') {
    setOpenFormFor('User Creation');
    return;
  }
  
  // Calculate performance when showing Dashboard view
  if (item === 'Dashboard') {
    calculateDashboardPerformance();
  }

  // Rest of your existing code...
  if (item === 'Sales') {
    setInvoiceItems([]);
    setInvoiceFormData({
      billDate: new Date().toISOString().split('T')[0],
      godown: 'G1',
      company: '',
      area: '',
      party: '',
      BillSeries: '',
      billNo: '',
      billType: 'Credit',
      dueDate: '',
      salesman: '',
      narration: ''
    });
    setInvoiceSummary({
      gross: 0, tpr: 0, scheme: 0, bottom: 0, star: 0, cd: 0, gst: 0, cess: 0, tcs: 0, rounding: 0, net: 0
    });
    addInvoiceItem();
  }

    if (item === 'Purchase') {
      setPurchaseItems([]);
      setPurchaseFormData({
        supplier: '',
        company: '',
        storageLocation: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        vno: '',
        invoiceNumber: '',
        narration: '',
        discountPercent: '',
        grossAmount: 0,
        mrpTotal: 0,
        tcbPercent: 0,
        diBc1: 0,
        afterDiBc1: 0,
        groBsAmt: 0,
        tcbAmount: 0,
        diBc2: 0,
        afterDiBc2: 0,
        qbtAmt: 0,
        rounding: 0,
        diBc3: 0,
        afterDiBc3: 0,
        ceBsAmt: 0,
        netAmt: 0
      });
      addPurchaseItem();
    }

    if (item === 'Credit Note') {
      setCreditNoteItems([]);
      setCreditNoteFormData({
        vDate: new Date().toISOString().split('T')[0],
        vNo: '',
        party: '',
        godown: 'G1',
        salesman: '',
        tinNo: '',
        company: '',
        narr: '',
        billSeries: '',
        billNo: '',
        full: '',
        refNo: '',
        refDate: ''
      });
      setCreditNoteSummary({
        grossAmt: 0, schemeAmt: 0, tprAmt: 0, cashDisc: 0, gstAmt: 0, starAmt: 0, starPercent: 0,
        addLess: 0, display: 0, coupon: 0, rounding: 0, cessAmt: 0, tcsPercent: 0, tcsAmt: 0, billBalAmt: 0, netAmt: 0
      });
      addCreditNoteItem();
    }

    if (item === 'Debit Note') {
      setDebitNoteItems([]);
      setDebitNoteFormData({
        vDate: new Date().toISOString().split('T')[0],
        vNo: '',
        godown: 'G1',
        company: '',
        narr: '',
        supplier: '',
        igst: 'N'
      });
      setDebitNoteSummary({
        grossAmt: 0, gstAmt: 0, tcsPercent: 0, tcsAmt: 0, beforeVatDiscAmt: 0,
        surcharge: 0, rounding: 0, beforeVatAddAmt: 0, afterVatDiscAmt: 0, netAmt: 0
      });
      addDebitNoteItem();
    }
  };

  const handlePlusClick = (item, e) => {
  e.stopPropagation();
  setActiveSubMenu(item);
  setOpenFormFor(item);
  setAccountActiveTab('basic');
  setOtherAccountActiveTab('basic');
  setEditGstId(null);
  setEditSalesmanId(null);
  setEditGodownId(null);
  setEditCustomerBankId(null); // Add this line
  if (item === 'Service') {
    resetServiceForm();
  } else if (item === 'GoDown Master') {
    setGodownForm({ code: '', name: '', address: '', location: '' });
  } else if (item === 'Customer Bank Master') {
    // Reset customer bank form when opening
    setCustomerBankForm({
      bankCode: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: '',
      accountType: 'Savings',
      customerName: '',
      customerCode: '',
      mobileNo: '',
      emailId: '',
      upiId: '',
      swiftCode: '',
      micrCode: '',
      panNumber: '',
      beneficiaryName: '',
      remarks: ''
    });
  } else {
    setGstForm({ code: '', vat: '', purchaseType: 'VAT ON PURCHASE PRICE', salesType: 'VAT ON SALES PRICE' });
    setSalesmanForm({ code: '', name: '', type: 'SALESMAN', address: '', town: '', pinCode: '', state: '', country: '', phoneNo: '', mobileNo: '', emailId: '', dateOfBirth: '', qualification: '', reference: '', imeiNo: '' });
  }
};

  const closeForm = () => {
    setOpenFormFor(null);
    setEditGstId(null);
    setEditSalesmanId(null);
    setEditGodownId(null);
  };

  useEffect(() => {
    if (activeSubMenu === 'Sales' && invoiceItems.length === 0) {
      addInvoiceItem();
    }
    if (activeSubMenu === 'Purchase' && purchaseItems.length === 0) {
      addPurchaseItem();
    }
    if (activeSubMenu === 'Credit Note' && creditNoteItems.length === 0) {
      addCreditNoteItem();
    }
    if (activeSubMenu === 'Debit Note' && debitNoteItems.length === 0) {
      addDebitNoteItem();
    }
  }, [activeSubMenu, invoiceItems.length, addInvoiceItem, purchaseItems.length, addPurchaseItem, creditNoteItems.length, addCreditNoteItem, debitNoteItems.length, addDebitNoteItem]);

  // GST Master Handlers
  const handleGstInput = (e) => {
    setGstForm({ ...gstForm, [e.target.name]: e.target.value });
  };

  const saveGst = (e) => {
    e.preventDefault();
    if (!gstForm.code || !gstForm.vat === '') return alert('Code and VAT % required');

    if (editGstId) {
      setGstList(gstList.map(gst =>
        gst.id === editGstId
          ? { ...gst, ...gstForm }
          : gst
      ));
      setEditGstId(null);
    } else {
      const newId = Math.max(...gstList.map(g => g.id), 0) + 1;
      const newSrNo = gstList.length + 1;
      setGstList([...gstList, { id: newId, srNo: newSrNo, ...gstForm }]);
    }
    setGstForm({ code: '', vat: '', purchaseType: 'VAT ON PURCHASE PRICE', salesType: 'VAT ON SALES PRICE' });
    closeForm();
  };

  const editGst = (gst) => {
    setEditGstId(gst.id);
    setGstForm({
      code: gst.code,
      vat: gst.vat,
      purchaseType: gst.purchaseType,
      salesType: gst.salesType
    });
    setOpenFormFor('GST Master');
  };

  const deleteGst = (id) => {
    if (window.confirm('Are you sure you want to delete this GST rate?')) {
      setGstList(gstList.filter(g => g.id !== id));
    }
  };

  // Salesman Master Handlers
  const handleSalesmanInput = (e) => {
    setSalesmanForm({ ...salesmanForm, [e.target.name]: e.target.value });
  };

  const saveSalesman = (e) => {
    e.preventDefault();
    if (!salesmanForm.code || !salesmanForm.name) return alert('Code and Name required');

    if (editSalesmanId) {
      setSalesmen(salesmen.map(sm =>
        sm.id === editSalesmanId
          ? { ...sm, ...salesmanForm }
          : sm
      ));
      setEditSalesmanId(null);
    } else {
      const newId = Math.max(...salesmen.map(s => s.id), 0) + 1;
      setSalesmen([...salesmen, { id: newId, ...salesmanForm }]);
    }
    setSalesmanForm({ code: '', name: '', type: 'SALESMAN', address: '', town: '', pinCode: '', state: '', country: '', phoneNo: '', mobileNo: '', emailId: '', dateOfBirth: '', qualification: '', reference: '', imeiNo: '' });
    closeForm();
  };

  const editSalesman = (salesman) => {
    setEditSalesmanId(salesman.id);
    setSalesmanForm({
      code: salesman.code,
      name: salesman.name,
      type: salesman.type,
      address: salesman.address || '',
      town: salesman.town || '',
      pinCode: salesman.pinCode || '',
      state: salesman.state || '',
      country: salesman.country || '',
      phoneNo: salesman.phoneNo || '',
      mobileNo: salesman.mobileNo || '',
      emailId: salesman.emailId || '',
      dateOfBirth: salesman.dateOfBirth || '',
      qualification: salesman.qualification || '',
      reference: salesman.reference || '',
      imeiNo: salesman.imeiNo || ''
    });
    setOpenFormFor('Salesman');
  };

  const deleteSalesman = (id) => {
    if (window.confirm('Are you sure you want to delete this salesman?')) {
      setSalesmen(salesmen.filter(s => s.id !== id));
    }
  };

  // Area Master Handlers
  const handleAreaInput = (e) => {
    setAreaForm({ ...areaForm, [e.target.name]: e.target.value });
  };

  const saveArea = (e) => {
    e.preventDefault();
    if (!areaForm.code || !areaForm.name) return alert('Code and Name required');

    if (editAreaId) {
      setAreas(areas.map(area =>
        area.id === editAreaId
          ? { ...area, ...areaForm }
          : area
      ));
      setEditAreaId(null);
    } else {
      const newId = Math.max(...areas.map(a => a.id), 0) + 1;
      setAreas([...areas, { id: newId, ...areaForm }]);
    }
    setAreaForm({ code: '', name: '' });
    closeForm();
  };

  const editArea = (area) => {
    setEditAreaId(area.id);
    setAreaForm({ code: area.code, name: area.name });
    setOpenFormFor('Area');
  };

  const deleteArea = (id) => {
    if (window.confirm('Are you sure you want to delete this area?')) {
      setAreas(areas.filter(a => a.id !== id));
    }
  };

  // Service Handlers
  const handleServiceInput = (e) => {
    setServiceForm({ ...serviceForm, [e.target.name]: e.target.value });
  };

  const saveService = (e) => {
    e.preventDefault();
    if (!serviceForm.code || !serviceForm.name || !serviceForm.vat) return alert('Code, Name and VAT % required');

    if (editServiceId) {
      setServices(services.map(service =>
        service.id === editServiceId
          ? { ...service, ...serviceForm }
          : service
      ));
      setEditServiceId(null);
    } else {
      const newId = Math.max(...services.map(s => s.id), 0) + 1;
      const newSrNo = services.length + 1;
      setServices([...services, { id: newId, srNo: newSrNo, ...serviceForm }]);
    }
    resetServiceForm();
    closeForm();
  };

  const editService = (service) => {
    setEditServiceId(service.id);
    setServiceForm({
      code: service.code,
      name: service.name,
      vat: service.vat,
      purchaseType: service.purchaseType,
      salesType: service.salesType
    });
    setOpenFormFor('Service');
  };

  const deleteService = (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  const handleCompanyInput = (e) => {
    setCompanyForm({ ...companyForm, [e.target.name]: e.target.value });
  };

  const saveCompany = (e) => {
    e.preventDefault();
    if (!companyForm.code || !companyForm.name) return alert('Code and Name required');
    setCompanies([...companies, { id: Date.now(), ...companyForm }]);
    setCompanyForm({ code: '', name: '', address: '', branchAddress: '' });
    closeForm();
  };

  const deleteCompany = (id) => {
    setCompanies(companies.filter(c => c.id !== id));
  };

  const handleProductInput = (e) => {
    const { name, value, type, checked } = e.target;
    setProductForm({ ...productForm, [name]: type === 'checkbox' ? checked : value });
  };

  const saveProduct = (e) => {
    e.preventDefault();
    if (!productForm.code || !productForm.name) return alert('Code and Name required');
    setProducts([...products, { id: Date.now(), ...productForm }]);
    setProductForm({
      code: '', name: '', companyId: '', group: '', category: '', description: '',
      gst: '', basicUnit: 'PCS', boxPack: '', inboxPack: '', retailerMargin: '',
      distributorMargin: '', active: true, locked: false, hsn: '', weight: '', allowFraction: false,
      Rate_Per_Unit: '1', Min_Stock_Holding: '0', Reorder_Level: '0'
    });
    closeForm();
  };

  const deleteProduct = (id) => {
    setProducts(products.filter(p => p.id !== id));
  };

  // Account Handlers
  const handleAccountInput = (e) => {
    const { name, value, type, checked } = e.target;
    setAccountForm({ ...accountForm, [name]: type === 'checkbox' ? checked : value });
  };

  const saveAccount = (e) => {
    e.preventDefault();
    if (!accountForm.accountCode || !accountForm.accountName) return alert('Account Code and Name required');
    setAccounts([...accounts, { id: Date.now(), ...accountForm }]);
    setAccountForm({
      accountCode: '',
      accountName: '',
      address: '',
      town: 'Pune',
      state: 'MAHARASHTRA',
      pinCode: '',
      phoneNo: '',
      mobileNo: '',
      emailId: '',
      tinNo: '',
      openingBal: '0.00',
      openingBalType: 'Dr',
      dlNo1: '',
      dlExp1: '',
      dlNo2: '',
      dlExp2: '',
      birthDate: '',
      contactPerson: '',
      commonCode: '',
      commonName: '',
      billType: 'CREDIT',
      invType: 'TAXABLE',
      taxOn: 'SRATE',
      tradeDisc: 'YES',
      tradePercent: '0.00',
      creditDays: '0',
      creditBills: '0',
      lockDays: '0',
      creditAmt: '0.00',
      weeklyOff: 'NONE',
      blackListed: 'NO',
      distKm: '0.00',
      closeTime: '',
      seqNo: '0',
      panNo: '',
      foodLicense: '',
      gstNo: '',
      billToAdd1: '',
      tcsPercent: '0.0000',
      tanNo: '',
      gstType: 'Unregistered',
      gstDate: '',
      add2: '',
      gstClsDate: '',
      allowInPurchase: 'N'
    });
    closeForm();
  };

  const deleteAccount = (id) => {
    setAccounts(accounts.filter(a => a.id !== id));
  };

  // Other Account Handlers
  const handleOtherAccountInput = (e) => {
    const { name, value } = e.target;
    setOtherAccountForm({ ...otherAccountForm, [name]: value });
  };

  const saveOtherAccount = (e) => {
    e.preventDefault();
    if (!otherAccountForm.accountCode || !otherAccountForm.accountName) return alert('Account Code and Name required');
    setOtherAccounts([...otherAccounts, { id: Date.now(), ...otherAccountForm }]);
    setOtherAccountForm({
      accountCode: '',
      accountName: '',
      accountGroup: 'INCOMES DIRECT',
      address: '',
      town: '',
      state: '',
      country: '',
      pinCode: '',
      phoneNo: '',
      mobileNo: '',
      emailId: '',
      tinNo: '',
      openingBal: '0.00',
      openingBalType: 'Dr',
      dlNo1: '',
      dlExp1: '',
      dlNo2: '',
      dlExp2: '',
      invType: 'CST',
      taxOn: 'SRATE',
      commonCode: '',
      commonName: '',
      panNo: '',
      foodLicense: '',
      gstNo: '',
      billToAdd1: '',
      remark: '',
      tcsPercent: '',
      tanNo: '',
      gstType: 'Unregistered',
      gstDate: '',
      add2: '',
      gstClsDate: ''
    });
    closeForm();
  };

  const deleteOtherAccount = (id) => {
    setOtherAccounts(otherAccounts.filter(oa => oa.id !== id));
  };

  // Group Master handlers
  const handleGroupInput = (e) => {
    setGroupForm({ ...groupForm, [e.target.name]: e.target.value });
  };

  const saveGroup = (e) => {
    e.preventDefault();
    if (!groupForm.code || !groupForm.name) return alert('Code and Name required');
    setGroupsState([...groupsState, { id: Date.now(), ...groupForm }]);
    setGroupForm({ code: '', name: '' });
    closeForm();
  };

  const deleteGroup = (id) => {
    setGroupsState(groupsState.filter(g => g.id !== id));
  };

  // Category Master handlers
  const handleCategoryInput = (e) => {
    setCategoryForm({ ...categoryForm, [e.target.name]: e.target.value });
  };

  const saveCategory = (e) => {
    e.preventDefault();
    if (!categoryForm.code || !categoryForm.name) return alert('Code and Name required');
    setCategoriesState([...categoriesState, { id: Date.now(), ...categoryForm }]);
    setCategoryForm({ code: '', name: '' });
    closeForm();
  };

  const deleteCategory = (id) => {
    setCategoriesState(categoriesState.filter(c => c.id !== id));
  };

  // ===== Salesman to Area Mapping Handlers =====
  const filteredAreasForMapping = areas.filter(area =>
    area.name.toLowerCase().includes(areaFilter.toLowerCase()) ||
    area.code.toLowerCase().includes(areaFilter.toLowerCase())
  );

  const filteredSalesmenForMapping = salesmen.filter(salesman =>
    salesman.name.toLowerCase().includes(salesmanFilter.toLowerCase()) ||
    salesman.code.toLowerCase().includes(salesmanFilter.toLowerCase())
  );

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setAreaFilter('');
    setSalesmanFilter('');
    setCurrentEditingRow(-1);
    setCurrentEditingCell('');
    setShowAreaDropdown(false);
    setShowSalesmanDropdown(false);

    if (company && areas.length > 0) {
      const initialData = areas.map((area, index) => ({
        id: `row_${index}_${Date.now()}`,
        areaCode: area.code,
        areaName: '',
        salesmanCode: '',
        salesmanName: ''
      }));
      setMappingData(initialData);
    } else {
      setMappingData([]);
    }
  };

  const handleCellClick = (rowIndex, cellType) => {
    setCurrentEditingRow(rowIndex);
    setCurrentEditingCell(`${cellType}_${rowIndex}`);
    if (cellType === 'areaName') {
      setShowAreaDropdown(true);
      setShowSalesmanDropdown(false);
      setAreaFilter(mappingData[rowIndex].areaName || '');
    } else if (cellType === 'salesmanName') {
      setShowSalesmanDropdown(true);
      setShowAreaDropdown(false);
      setSalesmanFilter(mappingData[rowIndex].salesmanName || '');
    }
  };

  const handleAreaSelect = (rowIndex, selectedArea) => {
    const updatedData = mappingData.map((row, idx) =>
      idx === rowIndex
        ? { ...row, areaCode: selectedArea.code, areaName: selectedArea.name }
        : row
    );
    setMappingData(updatedData);
    setShowAreaDropdown(false);
    setAreaFilter('');
    setTimeout(() => {
      const salesmanCell = document.querySelector(`[data-cell="salesman_${rowIndex}"]`);
      if (salesmanCell) salesmanCell.focus();
    }, 100);
  };

  const handleSalesmanSelect = (rowIndex, selectedSalesman) => {
    const updatedData = mappingData.map((row, idx) =>
      idx === rowIndex
        ? { ...row, salesmanCode: selectedSalesman.code, salesmanName: selectedSalesman.name }
        : row
    );
    setMappingData(updatedData);
    setShowSalesmanDropdown(false);
    setSalesmanFilter('');
    const nextRow = rowIndex + 1;
    if (nextRow < mappingData.length) {
      setTimeout(() => {
        const nextAreaCell = document.querySelector(`[data-cell="areaName_${nextRow}"]`);
        if (nextAreaCell) nextAreaCell.focus();
      }, 100);
    }
  };

  const handleKeyDown = (e, rowIndex, cellType) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (cellType === 'areaName') {
        const salesmanCell = document.querySelector(`[data-cell="salesman_${rowIndex}"]`);
        if (salesmanCell) salesmanCell.focus();
      } else if (cellType === 'salesmanName') {
        const nextRow = rowIndex + 1;
        if (nextRow < mappingData.length) {
          const nextAreaCell = document.querySelector(`[data-cell="areaName_${nextRow}"]`);
          if (nextAreaCell) nextAreaCell.focus();
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (cellType === 'areaName') {
        handleCellClick(rowIndex, 'salesmanName');
      } else if (cellType === 'salesmanName') {
        const nextRow = rowIndex + 1;
        if (nextRow < mappingData.length) {
          handleCellClick(nextRow, 'areaName');
        }
      }
    } else if (e.key === 'Escape') {
      setShowAreaDropdown(false);
      setShowSalesmanDropdown(false);
      setCurrentEditingRow(-1);
      setCurrentEditingCell('');
    }
  };

  const handleAreaFilterChange = (e) => {
    setAreaFilter(e.target.value);
  };

  const handleSalesmanFilterChange = (e) => {
    setSalesmanFilter(e.target.value);
  };

  const saveMapping = () => {
    console.log('Mapping saved:', { company: selectedCompany, mappings: mappingData });
    alert('Mapping saved successfully!');
  };

  const resetMapping = () => {
    setSelectedCompany(null);
    setMappingData([]);
    setCurrentEditingRow(-1);
    setCurrentEditingCell('');
  };

  // ===== Area To Party Mapping Handlers =====
  const filteredAreasForPartyMapping = areas.filter(area =>
    area.name.toLowerCase().includes(areaToPartyFilter.toLowerCase()) ||
    area.code.toLowerCase().includes(areaToPartyFilter.toLowerCase())
  );

  const handleAreaToPartyCompanySelect = (company) => {
    setAreaToPartyCompany(company);
    setAreaToPartyFilter('');
    setAreaToPartyEditingRow(-1);
    setAreaToPartyEditingCell('');
    setShowAreaToPartyDropdown(false);

    if (company && accounts.length > 0) {
      const initialData = accounts.map((account, index) => ({
        id: `atp_${index}_${Date.now()}`,
        accountCode: account.accountCode,
        accountName: account.accountName,
        areaCode: '',
        areaName: ''
      }));
      setAreaToPartyData(initialData);
    } else {
      setAreaToPartyData([]);
    }
  };

  const handleAreaToPartyCellClick = (rowIndex, cellType) => {
    setAreaToPartyEditingRow(rowIndex);
    setAreaToPartyEditingCell(`${cellType}_${rowIndex}`);
    if (cellType === 'areaName') {
      setShowAreaToPartyDropdown(true);
      setAreaToPartyFilter(areaToPartyData[rowIndex].areaName || '');
    }
  };

  const handleAreaToPartySelect = (rowIndex, selectedArea) => {
    const updatedData = areaToPartyData.map((row, idx) =>
      idx === rowIndex
        ? { ...row, areaCode: selectedArea.code, areaName: selectedArea.name }
        : row
    );
    setAreaToPartyData(updatedData);
    setShowAreaToPartyDropdown(false);
    setAreaToPartyFilter('');
    const nextRow = rowIndex + 1;
    if (nextRow < areaToPartyData.length) {
      setTimeout(() => {
        const nextCell = document.querySelector(`[data-atp-cell="areaName_${nextRow}"]`);
        if (nextCell) nextCell.focus();
      }, 100);
    }
  };

  const handleAreaToPartyKeyDown = (e, rowIndex, cellType) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextRow = rowIndex + 1;
      if (nextRow < areaToPartyData.length) {
        const nextCell = document.querySelector(`[data-atp-cell="areaName_${nextRow}"]`);
        if (nextCell) nextCell.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const nextRow = rowIndex + 1;
      if (nextRow < areaToPartyData.length) {
        handleAreaToPartyCellClick(nextRow, 'areaName');
      }
    } else if (e.key === 'Escape') {
      setShowAreaToPartyDropdown(false);
      setAreaToPartyEditingRow(-1);
      setAreaToPartyEditingCell('');
    }
  };

  const handleAreaToPartyFilterChange = (e) => {
    setAreaToPartyFilter(e.target.value);
  };

  const saveAreaToPartyMapping = () => {
    console.log('Area To Party Mapping saved:', { company: areaToPartyCompany, mappings: areaToPartyData });
    alert('Area To Party Mapping saved successfully!');
  };

  const resetAreaToPartyMapping = () => {
    setAreaToPartyCompany(null);
    setAreaToPartyData([]);
    setAreaToPartyEditingRow(-1);
    setAreaToPartyEditingCell('');
    setShowAreaToPartyDropdown(false);
  };

  // Render data table with filters and export buttons
  const renderDataTable = (title, data, columns, masterType, onDelete) => {
    const filteredData = data;


    return (

      <div className="master-section grid-section">
        <div className="grid-header">
          <h3>{title} ({filteredData.length})</h3>
          <div className="table-controls">
            <input
              type="text"
              placeholder="Search..."
              className="filter-input"
              value={filters[masterType]}
              onChange={(e) => handleFilterChange(masterType, e.target.value)}
            />
            <button className="btn-excel" onClick={() => exportToExcel(filteredData, title, columns)}>
              📊 Export Excel
            </button>
            <button className="btn-pdf" onClick={() => exportToPDF(filteredData, title, columns)}>
              📄 Export PDF
            </button>
            <button className="btn-add-new" onClick={() => setOpenFormFor(masterType === 'company' ? 'Company Master' :
              masterType === 'group' ? 'Group Master' :
                masterType === 'category' ? 'Category Master' :
                  masterType === 'product' ? 'Product' :
                    masterType === 'account' ? 'Account' :
                      masterType === 'otherAccount' ? 'Other Account' :
                        masterType === 'gst' ? 'GST Master' :
                          masterType === 'salesman' ? 'Salesman' :
                            masterType === 'area' ? 'Area' :
                              masterType === 'godown' ? 'GoDown Master' : 'Service')}>
              + Add New
            </button>
          </div>
        </div>
        {filteredData.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map(col => <th key={col.key}>{col.label}</th>)}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(item => (
                  <tr key={item.id}>
                    {columns.map(col => <td key={col.key}>{item[col.key] || '-'}</td>)}
                    <td>
                      <button className="btn-edit" onClick={() => {
                        if (masterType === 'company') editCompany?.(item);
                        else if (masterType === 'group') editGroup?.(item);
                        else if (masterType === 'category') editCategory?.(item);
                        else if (masterType === 'product') editProduct?.(item);
                        else if (masterType === 'account') editAccount?.(item);
                        else if (masterType === 'otherAccount') editOtherAccount?.(item);
                        else if (masterType === 'gst') editGst(item);
                        else if (masterType === 'salesman') editSalesman(item);
                        else if (masterType === 'area') editArea(item);
                        else if (masterType === 'godown') editGodown(item);
                        else if (masterType === 'service') editService(item);
                      }}>✏️ Edit</button>
                      <button className="btn-delete" onClick={() => onDelete(item.id)}>🗑 Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No data found. Click + Add New to create one.</div>
        )}
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-image">
            <img src={logo} alt="Company Logo" className="company-logo" />
          </div>
        </div>
        <nav className="nav-menu">
          {Object.entries(menuItems).map(([key, menu]) => (
            <div key={key} className="nav-item">
              <div className={`nav-header ${activeMenu === key ? 'active' : ''}`} onClick={() => handleMenuClick(key)}>
                <span className="nav-icon">{menu.icon}</span>
                <span className="nav-title">{menu.title}</span>
                <span className={`nav-arrow ${activeMenu === key ? 'open' : ''}`}>⌄</span>
              </div>
              {activeMenu === key && (
                <div className="nav-submenu">
                  {menu.items.map((item, idx) => (
                    <div key={idx} className="nav-subitem-wrapper">
                      <div className={`nav-subitem ${activeSubMenu === item ? 'active' : ''}`}>
                        <span className="submenu-text" onClick={() => handleSubMenuClick(item)}>{item}</span>
                        <span className="plus-icon" onClick={(e) => handlePlusClick(item, e)}>+</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-nav">
          <div className="page-title">{activeSubMenu ? `${activeSubMenu} - Management` : 'Dashboard'}</div>
          <div className="nav-right">
            <div className="notification-bell">🔔</div>
            <div className="user-profile">
              <div className="avatar">MK</div>
            </div>
          </div>
        </header>

        <div className="content-body">
        {/* GoDown Master - Form View */}
{activeSubMenu === 'GoDown Master' && openFormFor === 'GoDown Master' && (
  <div className="master-section erp-master-form">
    <div className="form-header">
      <div className="page-title-large">{editGodownId ? 'Edit GoDown' : 'Add New GoDown'}</div>
      <button className="close-form-btn" onClick={closeForm}>✕</button>
    </div>
    <form className="master-form" onSubmit={saveGodown}>
      <div className="form-section">
        <h4 className="section-header">Basic Information</h4>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>GoDown Code *</label>
            <input name="code" placeholder="GoDown Code" value={godownForm.code} onChange={handleGodownInput} required />
          </div>
          <div className="labeled-input">
            <label>GoDown Name *</label>
            <input name="name" placeholder="GoDown Name" value={godownForm.name} onChange={handleGodownInput} required />
          </div>
        </div>
      </div>
      <div className="form-section">
        <h4 className="section-header">Location Details</h4>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Address</label>
            <textarea name="address" placeholder="Address" value={godownForm.address} onChange={handleGodownInput} rows="2" />
          </div>
          <div className="labeled-input">
            <label>Location</label>
            <input name="location" placeholder="Location" value={godownForm.location} onChange={handleGodownInput} />
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">{editGodownId ? 'Update' : 'Save GoDown'}</button>
        <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
      </div>
    </form>
  </div>
)}
          {/* GoDown Master - Grid View */}
          {activeSubMenu === 'GoDown Master' && openFormFor !== 'GoDown Master' && (
            renderDataTable('GoDowns List', getFilteredGodowns(), [
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'address', label: 'Address' },
              { key: 'location', label: 'Location' }
            ], 'godown', deleteGodown)
          )}
          {/* Dashboard Performance View */}
{activeSubMenu === 'Dashboard' && openFormFor !== 'Firm Creation' && openFormFor !== 'User Creation' && (
  <div className="master-section">
    <div className="page-title-large">Performance Dashboard</div>
    
    {/* Summary Cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
      <div className="performance-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px', borderRadius: '12px', color: 'white' }}>
        <h3>Sales</h3>
        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>₹{dashboardPerformance.sales.total.toFixed(2)}</div>
        <div>Total Invoices: {dashboardPerformance.sales.count}</div>
      </div>
      
      <div className="performance-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '20px', borderRadius: '12px', color: 'white' }}>
        <h3>Purchase</h3>
        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>₹{dashboardPerformance.purchase.total.toFixed(2)}</div>
        <div>Total Invoices: {dashboardPerformance.purchase.count}</div>
      </div>
      
      <div className="performance-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', padding: '20px', borderRadius: '12px', color: 'white' }}>
        <h3>Credit Note</h3>
        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>₹{dashboardPerformance.creditNote.total.toFixed(2)}</div>
        <div>Total Notes: {dashboardPerformance.creditNote.count}</div>
      </div>
      
      <div className="performance-card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', padding: '20px', borderRadius: '12px', color: 'white' }}>
        <h3>Debit Note</h3>
        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>₹{dashboardPerformance.debitNote.total.toFixed(2)}</div>
        <div>Total Notes: {dashboardPerformance.debitNote.count}</div>
      </div>
    </div>
    
    {/* Chart Section */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
      <div className="chart-card" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3>Revenue Overview</h3>
        <div style={{ marginTop: '20px' }}>
          <div><strong>Total Sales:</strong> ₹{dashboardPerformance.sales.total.toFixed(2)}</div>
          <div><strong>Total Purchase:</strong> ₹{dashboardPerformance.purchase.total.toFixed(2)}</div>
          <div><strong>Net Profit:</strong> ₹{(dashboardPerformance.sales.total - dashboardPerformance.purchase.total).toFixed(2)}</div>
          <div><strong>Credit Notes:</strong> ₹{dashboardPerformance.creditNote.total.toFixed(2)}</div>
          <div><strong>Debit Notes:</strong> ₹{dashboardPerformance.debitNote.total.toFixed(2)}</div>
        </div>
      </div>
      
      <div className="stats-card" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3>Quick Stats</h3>
        <div style={{ marginTop: '20px' }}>
          <div>📊 Total Transactions: {dashboardPerformance.sales.count + dashboardPerformance.purchase.count + dashboardPerformance.creditNote.count + dashboardPerformance.debitNote.count}</div>
          <div>💰 Average Sale Value: ₹{(dashboardPerformance.sales.total / (dashboardPerformance.sales.count || 1)).toFixed(2)}</div>
          <div>📦 Average Purchase Value: ₹{(dashboardPerformance.purchase.total / (dashboardPerformance.purchase.count || 1)).toFixed(2)}</div>
        </div>
      </div>
    </div>
    
    {/* Recent Activity */}
    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3>Recent Activity</h3>
      <div style={{ marginTop: '15px' }}>
        <div><strong>Recent Sales:</strong> {dashboardPerformance.sales.count > 0 ? `${dashboardPerformance.sales.count} invoices` : 'No sales yet'}</div>
        <div><strong>Recent Purchases:</strong> {dashboardPerformance.purchase.count > 0 ? `${dashboardPerformance.purchase.count} invoices` : 'No purchases yet'}</div>
        <div><strong>Recent Credit Notes:</strong> {dashboardPerformance.creditNote.count > 0 ? `${dashboardPerformance.creditNote.count} notes` : 'No credit notes yet'}</div>
        <div><strong>Recent Debit Notes:</strong> {dashboardPerformance.debitNote.count > 0 ? `${dashboardPerformance.debitNote.count} notes` : 'No debit notes yet'}</div>
      </div>
    </div>
  </div>
)}
{/* Firm Creation Form */}
{activeSubMenu === 'Firm Creation' && openFormFor === 'Firm Creation' && (
  <div className="master-section erp-master-form">
    <div className="form-header">
      <div className="page-title-large">New Firm Creation</div>
      <button className="close-form-btn" onClick={closeForm}>✕</button>
    </div>
    <form className="master-form" onSubmit={saveFirm}>
      <div className="form-section">
        <h4 className="section-header">Firm Basic Information</h4>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Firm Code *</label>
            <input name="firmCode" placeholder="Firm Code" value={firmData.firmCode} onChange={handleFirmInput} required />
          </div>
          <div className="labeled-input">
            <label>Firm Name *</label>
            <input name="firmName" placeholder="Firm Name" value={firmData.firmName} onChange={handleFirmInput} required />
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h4 className="section-header">Address Information</h4>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Address Line 1</label>
            <input name="address1" placeholder="Address Line 1" value={firmData.address1} onChange={handleFirmInput} />
          </div>
          <div className="labeled-input">
            <label>Address Line 2</label>
            <input name="address2" placeholder="Address Line 2" value={firmData.address2} onChange={handleFirmInput} />
          </div>
        </div>
        <div className="form-grid-3">
          <div className="labeled-input">
            <label>City</label>
            <input name="city" placeholder="City" value={firmData.city} onChange={handleFirmInput} />
          </div>
          <div className="labeled-input">
            <label>Pin Code</label>
            <input name="pinCode" placeholder="Pin Code" value={firmData.pinCode} onChange={handleFirmInput} />
          </div>
          <div className="labeled-input">
            <label>State</label>
            <input name="state" placeholder="State" value={firmData.state} onChange={handleFirmInput} />
          </div>
        </div>
        <div className="form-grid-3">
          <div className="labeled-input">
            <label>Country</label>
            <input name="country" placeholder="Country" value={firmData.country} onChange={handleFirmInput} />
          </div>
          <div className="labeled-input">
            <label>Phone No.</label>
            <input name="phoneNo" placeholder="Phone No." value={firmData.phoneNo} onChange={handleFirmInput} />
          </div>
          <div className="labeled-input">
            <label>Mobile No.</label>
            <input name="mobileNo" placeholder="Mobile No." value={firmData.mobileNo} onChange={handleFirmInput} />
          </div>
        </div>
      </div>
      
      <div className="form-section">
        <h4 className="section-header">Tax & Registration Information</h4>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Tin No.</label>
            <input name="tinNo" placeholder="Tin No." value={firmData.tinNo} onChange={handleFirmInput} />
          </div>
          <div className="labeled-input">
            <label>Registration No.</label>
            <input name="regNo" placeholder="Registration No." value={firmData.regNo} onChange={handleFirmInput} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>GST No.</label>
            <input name="gstNo" placeholder="GST No." value={firmData.gstNo} onChange={handleFirmInput} />
          </div>
          <div className="labeled-input">
            <label>Drug License No.</label>
            <input name="drugLicNo" placeholder="Drug License No." value={firmData.drugLicNo} onChange={handleFirmInput} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Food License No.</label>
            <input name="foodLicenceNo" placeholder="Food License No." value={firmData.foodLicenceNo} onChange={handleFirmInput} />
          </div>
          <div className="labeled-input">
            <label>Distributor ID</label>
            <input name="distributorId" placeholder="Distributor ID" value={firmData.distributorId} onChange={handleFirmInput} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>API Key</label>
            <input name="apiKey" placeholder="API Key" value={firmData.apiKey} onChange={handleFirmInput} />
          </div>
        </div>
      </div>
      
      <div className="form-actions">
        <button type="submit" className="btn-primary">Create Firm</button>
        <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
      </div>
    </form>
  </div>
)}
{/* Firm Details Grid - Show all saved firms */}
{activeSubMenu === 'Firm Creation' && openFormFor !== 'Firm Creation' && (
  <div className="master-section grid-section">
    <div className="grid-header">
      <h3>Firms List ({firms.length})</h3>
      <div className="table-controls">
        <input
          type="text"
          placeholder="Search firms..."
          className="filter-input"
          value={filters.firm || ''}
          onChange={(e) => setFilters({...filters, firm: e.target.value})}
        />
        <button className="btn-excel" onClick={() => exportToExcel(
          firms.filter(f => 
            f.firmName?.toLowerCase().includes((filters.firm || '').toLowerCase()) ||
            f.firmCode?.toLowerCase().includes((filters.firm || '').toLowerCase())
          ), 
          'Firms_List', 
          [
            { key: 'firmCode', label: 'Firm Code' },
            { key: 'firmName', label: 'Firm Name' },
            { key: 'city', label: 'City' },
            { key: 'state', label: 'State' },
            { key: 'mobileNo', label: 'Mobile No.' },
            { key: 'gstNo', label: 'GST No.' }
          ]
        )}>
          📊 Export Excel
        </button>
        <button className="btn-pdf" onClick={() => exportToPDF(
          firms.filter(f => 
            f.firmName?.toLowerCase().includes((filters.firm || '').toLowerCase()) ||
            f.firmCode?.toLowerCase().includes((filters.firm || '').toLowerCase())
          ), 
          'Firms_List', 
          [
            { key: 'firmCode', label: 'Firm Code' },
            { key: 'firmName', label: 'Firm Name' },
            { key: 'city', label: 'City' },
            { key: 'state', label: 'State' },
            { key: 'mobileNo', label: 'Mobile No.' }
          ]
        )}>
          📄 Export PDF
        </button>
        <button className="btn-add-new" onClick={() => setOpenFormFor('Firm Creation')}>
          + Add New Firm
        </button>
      </div>
    </div>
    {firms.filter(f => 
      f.firmName?.toLowerCase().includes((filters.firm || '').toLowerCase()) ||
      f.firmCode?.toLowerCase().includes((filters.firm || '').toLowerCase())
    ).length > 0 ? (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Firm Code</th>
              <th>Firm Name</th>
              <th>Address</th>
              <th>City</th>
              <th>State</th>
              <th>Mobile No.</th>
              <th>GST No.</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {firms
              .filter(f => 
                f.firmName?.toLowerCase().includes((filters.firm || '').toLowerCase()) ||
                f.firmCode?.toLowerCase().includes((filters.firm || '').toLowerCase())
              )
              .map(firm => (
                <tr key={firm.id}>
                  <td>{firm.firmCode}</td>
                  <td>{firm.firmName}</td>
                  <td>{firm.address1 || '-'}</td>
                  <td>{firm.city || '-'}</td>
                  <td>{firm.state || '-'}</td>
                  <td>{firm.mobileNo || '-'}</td>
                  <td>{firm.gstNo || '-'}</td>
                  <td>
                    <button 
                      className="btn-edit" 
                      onClick={() => {
                        setFirmData({
                          firmCode: firm.firmCode,
                          firmName: firm.firmName,
                          address1: firm.address1 || '',
                          address2: firm.address2 || '',
                          city: firm.city || '',
                          pinCode: firm.pinCode || '',
                          state: firm.state || '',
                          country: firm.country || '',
                          phoneNo: firm.phoneNo || '',
                          mobileNo: firm.mobileNo || '',
                          tinNo: firm.tinNo || '',
                          regNo: firm.regNo || '',
                          gstNo: firm.gstNo || '',
                          drugLicNo: firm.drugLicNo || '',
                          foodLicenceNo: firm.foodLicenceNo || '',
                          distributorId: firm.distributorId || '',
                          apiKey: firm.apiKey || ''
                        });
                        setOpenFormFor('Firm Creation');
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="btn-delete" 
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this firm?')) {
                          setFirms(firms.filter(f => f.id !== firm.id));
                        }
                      }}
                    >
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="empty-state">No firms found. Click + Add New Firm to create one.</div>
    )}
  </div>
)}

{/* User Creation Form */}
{activeSubMenu === 'User Creation' && openFormFor === 'User Creation' && (
  <div className="master-section erp-master-form">
    <div className="form-header">
      <div className="page-title-large">Create New User</div>
      <button className="close-form-btn" onClick={closeForm}>✕</button>
    </div>
    <form className="master-form" onSubmit={saveUser}>
      <div className="form-section">
        <h4 className="section-header">User Information</h4>
        
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>User Name *</label>
            <input 
              type="text" 
              name="userName" 
              placeholder="Enter username" 
              value={userData.userName} 
              onChange={handleUserInput} 
              required 
            />
          </div>
          <div className="labeled-input">
            <label>Old Password (For existing users)</label>
            <input 
              type="password" 
              name="oldPassword" 
              placeholder="Enter old password" 
              value={userData.oldPassword} 
              onChange={handleUserInput} 
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Password *</label>
            <input 
              type="password" 
              name="password" 
              placeholder="Enter password" 
              value={userData.password} 
              onChange={handleUserInput} 
              required 
            />
          </div>
          <div className="labeled-input">
            <label>Re-enter Password *</label>
            <input 
              type="password" 
              name="reEnterPassword" 
              placeholder="Re-enter password" 
              value={userData.reEnterPassword} 
              onChange={handleUserInput} 
              required 
            />
          </div>
        </div>

        <div className="info-message" style={{ 
          background: '#e0f2fe', 
          padding: '10px', 
          borderRadius: '6px', 
          marginTop: '15px',
          fontSize: '13px',
          color: '#0369a1'
        }}>
          <strong>Note:</strong> Password must be at least 6 characters long. The ADMIN user is system default.
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">Create User</button>
        <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
      </div>
    </form>
  </div>
)}

{/* Users List Grid - Show all created users */}
{activeSubMenu === 'User Creation' && openFormFor !== 'User Creation' && (
  <div className="master-section grid-section">
    <div className="grid-header">
      <h3>Users List ({users.length})</h3>
      <div className="table-controls">
        <input
          type="text"
          placeholder="Search users..."
          className="filter-input"
          value={filters.user || ''}
          onChange={(e) => setFilters({...filters, user: e.target.value})}
        />
        <button className="btn-excel" onClick={() => exportToExcel(
          users.filter(u => 
            u.userName?.toLowerCase().includes((filters.user || '').toLowerCase())
          ),
          'Users_List',
          [
            { key: 'userName', label: 'User Name' }
          ]
        )}>
          📊 Export Excel
        </button>
        <button className="btn-pdf" onClick={() => exportToPDF(
          users.filter(u => 
            u.userName?.toLowerCase().includes((filters.user || '').toLowerCase())
          ),
          'Users_List',
          [
            { key: 'userName', label: 'User Name' }
          ]
        )}>
          📄 Export PDF
        </button>
        <button className="btn-add-new" onClick={() => setOpenFormFor('User Creation')}>
          + Add New User
        </button>
      </div>
    </div>
    {users.filter(u => 
      u.userName?.toLowerCase().includes((filters.user || '').toLowerCase())
    ).length > 0 ? (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>User Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users
              .filter(u => 
                u.userName?.toLowerCase().includes((filters.user || '').toLowerCase())
              )
              .map((user, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{user.userName}</td>
                  <td>{user.userName === 'ADMIN' ? 'Administrator' : 'User'}</td>
                  <td>
                    <span style={{ 
                      color: user.userName === currentUser ? '#059669' : '#6b7280',
                      fontWeight: '500'
                    }}>
                      {user.userName === currentUser ? '✅ Current Session' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {user.userName !== 'ADMIN' && (
                      <button 
                        className="btn-delete" 
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete user "${user.userName}"?`)) {
                            setUsers(users.filter(u => u.userName !== user.userName));
                          }
                        }}
                      >
                        🗑 Delete
                      </button>
                    )}
                    {user.userName === 'ADMIN' && (
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>System User</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="empty-state">No users found. Click + Add New User to create one.</div>
    )}
  </div>
)}
{/* Customer Bank Master - Form View */}
{activeSubMenu === 'Customer Bank Master' && openFormFor === 'Customer Bank Master' && (
  <div className="master-section erp-master-form">
    <div className="form-header">
      <div className="page-title-large">{editCustomerBankId ? 'Edit Customer Bank Details' : 'Add Customer Bank Details'}</div>
      <button className="close-form-btn" onClick={closeForm}>✕</button>
    </div>
    <form className="master-form" onSubmit={saveCustomerBank}>
      <div className="form-section">
        <h4 className="section-header">Basic Bank Information</h4>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Bank Code *</label>
            <input name="bankCode" placeholder="Bank Code" value={customerBankForm.bankCode} onChange={handleCustomerBankInput} required />
          </div>
          <div className="labeled-input">
            <label>Bank Name *</label>
            <input name="bankName" placeholder="Bank Name" value={customerBankForm.bankName} onChange={handleCustomerBankInput} required />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Account Number *</label>
            <input name="accountNumber" placeholder="Account Number" value={customerBankForm.accountNumber} onChange={handleCustomerBankInput} required />
          </div>
          <div className="labeled-input">
            <label>IFSC Code</label>
            <input name="ifscCode" placeholder="IFSC Code" value={customerBankForm.ifscCode} onChange={handleCustomerBankInput} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Branch Name</label>
            <input name="branchName" placeholder="Branch Name" value={customerBankForm.branchName} onChange={handleCustomerBankInput} />
          </div>
          <div className="labeled-input">
            <label>Account Type</label>
            <select name="accountType" value={customerBankForm.accountType} onChange={handleCustomerBankInput}>
              <option value="Savings">Savings</option>
              <option value="Current">Current</option>
              <option value="Fixed Deposit">Fixed Deposit</option>
              <option value="NRI">NRI</option>
            </select>
          </div>
        </div>
      </div>

      

      <div className="form-section">
        <h4 className="section-header">Additional Details</h4>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>SWIFT Code</label>
            <input name="swiftCode" placeholder="SWIFT Code" value={customerBankForm.swiftCode} onChange={handleCustomerBankInput} />
          </div>
          <div className="labeled-input">
            <label>MICR Code</label>
            <input name="micrCode" placeholder="MICR Code" value={customerBankForm.micrCode} onChange={handleCustomerBankInput} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>PAN Number</label>
            <input name="panNumber" placeholder="PAN Number" value={customerBankForm.panNumber} onChange={handleCustomerBankInput} />
          </div>
        </div>
        <div className="form-row-single">
          <div className="labeled-input">
            <label>Remarks</label>
            <textarea name="remarks" placeholder="Additional Remarks" value={customerBankForm.remarks} onChange={handleCustomerBankInput} rows="2" />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">{editCustomerBankId ? 'Update' : 'Save Bank Details'}</button>
        <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
      </div>
    </form>
  </div>
)}

{/* Customer Bank Master - Grid View */}
{activeSubMenu === 'Customer Bank Master' && openFormFor !== 'Customer Bank Master' && (
  <div className="master-section grid-section">
    <div className="grid-header">
      <h3>Customer Bank Details ({getFilteredCustomerBanks().length})</h3>
      <div className="table-controls">
        <input
          type="text"
          placeholder="Search by Bank/Account/Customer..."
          className="filter-input"
          value={customerBankFilter}
          onChange={(e) => setCustomerBankFilter(e.target.value)}
        />
        <button className="btn-excel" onClick={() => exportToExcel(getFilteredCustomerBanks(), 'Customer_Bank_Master', [
          { key: 'bankCode', label: 'Bank Code' },
          { key: 'bankName', label: 'Bank Name' },
          { key: 'accountNumber', label: 'Account Number' },
          { key: 'customerName', label: 'Customer Name' },
          { key: 'ifscCode', label: 'IFSC Code' },
          { key: 'accountType', label: 'Account Type' }
        ])}>
          📊 Export Excel
        </button>
        <button className="btn-pdf" onClick={() => exportToPDF(getFilteredCustomerBanks(), 'Customer_Bank_Master', [
          { key: 'bankCode', label: 'Bank Code' },
          { key: 'bankName', label: 'Bank Name' },
          { key: 'accountNumber', label: 'Account Number' },
          { key: 'customerName', label: 'Customer Name' },
          { key: 'ifscCode', label: 'IFSC Code' }
        ])}>
          📄 Export PDF
        </button>
        <button className="btn-add-new" onClick={() => setOpenFormFor('Customer Bank Master')}>
          + Add New Bank
        </button>
      </div>
    </div>
    {getFilteredCustomerBanks().length > 0 ? (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bank Code</th>
              <th>Bank Name</th>
              <th>Account Number</th>
              <th>Customer Name</th>
              <th>IFSC Code</th>
              <th>Account Type</th>
              <th>UPI ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getFilteredCustomerBanks().map(bank => (
              <tr key={bank.id}>
                <td>{bank.bankCode}</td>
                <td>{bank.bankName}</td>
                <td>{bank.accountNumber}</td>
                <td>{bank.customerName || '-'}</td>
                <td>{bank.ifscCode || '-'}</td>
                <td>{bank.accountType}</td>
                <td>{bank.upiId || '-'}</td>
                <td>
                  <button className="btn-edit" onClick={() => editCustomerBank(bank)}>✏️ Edit</button>
                  <button className="btn-delete" onClick={() => deleteCustomerBank(bank.id)}>🗑 Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="empty-state">No bank details found. Click + Add New Bank to add customer bank information.</div>
    )}
  </div>
)}
         {/* Company Master - Form View */}
{activeSubMenu === 'Company Master' && openFormFor === 'Company Master' && (
  <div className="master-section erp-master-form">
    <div className="form-header">
      <div className="page-title-large">Add New Company</div>
      <button className="close-form-btn" onClick={closeForm}>✕</button>
    </div>
    <form className="master-form" onSubmit={saveCompany}>
      <div className="form-section">
        <h4 className="section-header">Basic Information</h4>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Company Code *</label>
            <input name="code" placeholder="Company Code" value={companyForm.code} onChange={handleCompanyInput} required />
          </div>
          <div className="labeled-input">
            <label>Company Name *</label>
            <input name="name" placeholder="Company Name" value={companyForm.name} onChange={handleCompanyInput} required />
          </div>
           <div className="labeled-input">
            <label>Company Address</label>
            <textarea name="address" placeholder="Company Address" value={companyForm.address} onChange={handleCompanyInput} rows="2" />
          </div>
        </div>
         <div className="labeled-input">
            <label>Branch/Office Address</label>
            <textarea name="branchAddress" placeholder="Branch/Office Address" value={companyForm.branchAddress} onChange={handleCompanyInput} rows="2" />
          </div>
      </div>
     
      <div className="form-actions">
        <button type="submit" className="btn-primary">Save Company</button>
        <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
      </div>
    </form>
  </div>
)}
          {/* Company Master - Grid View */}
          {activeSubMenu === 'Company Master' && openFormFor !== 'Company Master' && (
            renderDataTable('Companies List', getFilteredCompanies(), [
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'address', label: 'Address' },
              { key: 'branchAddress', label: 'Branch Address' }
            ], 'company', deleteCompany)
          )}

          {/* Group Master - Form View */}
{activeSubMenu === 'Group Master' && openFormFor === 'Group Master' && (
  <div className="master-section erp-master-form">
    <div className="form-header">
      <div className="page-title-large">Add New Group</div>
      <button className="close-form-btn" onClick={closeForm}>✕</button>
    </div>
    <form className="master-form" onSubmit={saveGroup}>
      <div className="form-section">
        <h4 className="section-header">Basic Information</h4>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Group Code *</label>
            <input name="code" placeholder="Group Code" value={groupForm.code} onChange={handleGroupInput} required />
          </div>
          <div className="labeled-input">
            <label>Group Name *</label>
            <input name="name" placeholder="Group Name" value={groupForm.name} onChange={handleGroupInput} required />
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">Save Group</button>
        <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
      </div>
    </form>
  </div>
)}

          {/* Group Master - Grid View */}
          {activeSubMenu === 'Group Master' && openFormFor !== 'Group Master' && (
            renderDataTable('Groups List', getFilteredGroups(), [
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' }
            ], 'group', deleteGroup)
          )}

        {/* Category Master - Form View */}
{activeSubMenu === 'Category Master' && openFormFor === 'Category Master' && (
  <div className="master-section erp-master-form">
    <div className="form-header">
      <div className="page-title-large">Add New Category</div>
      <button className="close-form-btn" onClick={closeForm}>✕</button>
    </div>
    <form className="master-form" onSubmit={saveCategory}>
      <div className="form-section">
        <h4 className="section-header">Basic Information</h4>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Category Code *</label>
            <input name="code" placeholder="Category Code" value={categoryForm.code} onChange={handleCategoryInput} required />
          </div>
          <div className="labeled-input">
            <label>Category Name *</label>
            <input name="name" placeholder="Category Name" value={categoryForm.name} onChange={handleCategoryInput} required />
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">Save Category</button>
        <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
      </div>
    </form>
  </div>
)}

          {/* Category Master - Grid View */}
          {activeSubMenu === 'Category Master' && openFormFor !== 'Category Master' && (
            renderDataTable('Categories List', getFilteredCategories(), [
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' }
            ], 'category', deleteCategory)
          )}

          {/* Product - Form View */}
{activeSubMenu === 'Product' && openFormFor === 'Product' && (
  <div className="master-section erp-master-form">
    <div className="form-header">
      <div className="page-title-large">Add New Product</div>
      <button className="close-form-btn" onClick={closeForm}>✕</button>
    </div>
    <form className="master-form" onSubmit={saveProduct}>
      <div className="form-section">
        <h4 className="section-header">Product Identification</h4>
        <div className="form-grid-3">
          <div className="labeled-input">
            <label>Product Code *</label>
            <input name="code" placeholder="Product Code" value={productForm.code} onChange={handleProductInput} required />
          </div>
          <div className="labeled-input">
            <label>Product Name *</label>
            <input name="name" placeholder="Product Name" value={productForm.name} onChange={handleProductInput} required />
          </div>
          <div className="labeled-input">
            <label>Company</label>
            <select name="companyId" value={productForm.companyId} onChange={handleProductInput}>
              <option value="">Select Company</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-grid-3">
          <div className="labeled-input">
            <label>Group</label>
            <select name="group" value={productForm.group} onChange={handleProductInput}>
              <option value="">Select Group</option>
              {groupsState.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div className="labeled-input">
            <label>Category</label>
            <select name="category" value={productForm.category} onChange={handleProductInput}>
              <option value="">Select Category</option>
              {categoriesState.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
          </div>
          <div className="labeled-input">
            <label>GST %</label>
            <select name="gst" value={productForm.gst} onChange={handleProductInput}>
              <option value="">Select GST %</option>
              {gstRates.map(rate => <option key={rate} value={rate}>{rate}%</option>)}
            </select>
          </div>
        </div>
        <div className="form-row-single">
          <div className="labeled-input">
            <label>Product Description</label>
            <textarea name="description" placeholder="Product Description" value={productForm.description} onChange={handleProductInput} rows="2" />
          </div>
        </div>

 <div className="form-section">
        <h4 className="section-header">Logistics & Classification</h4>
        <div className="form-grid-4">
          <div className="labeled-input">
            <label>Basic Unit</label>
            <select name="basicUnit" value={productForm.basicUnit} onChange={handleProductInput}>
              <option value="PCS">PCS</option>
              <option value="BOX">BOX</option>
              <option value="INBOX">INBOX</option>
              <option value="KG">KG</option>
              <option value="LTR">LTR</option>
            </select>
          </div>
           <div className="labeled-input">
            <label>Weight</label>
            <input name="Weight" placeholder="Weight" value={productForm.boxPack} onChange={handleProductInput} type="number" />
          </div>
          {(productForm.basicUnit === 'KG' || productForm.basicUnit === 'Litre') && (
            <div className="labeled-input">
              <label>Weight [Gms/Ltr]</label>
              <input name="weight" placeholder="100" value={productForm.weight} onChange={handleProductInput} type="number" />
            </div>
          )}
          <div className="labeled-input">
            <label>Inbox Pack</label>
            <input name="inboxPack" placeholder="Inbox Pack" value={productForm.inboxPack} onChange={handleProductInput} type="number" />
          </div>
          <div className="labeled-input">
            <label>Box Pack</label>
            <input name="boxPack" placeholder="Box Pack" value={productForm.boxPack} onChange={handleProductInput} type="number" />
          </div>
           <div className="labeled-input">
            <label>HSN Code</label>
            <input name="hsnCode" placeholder="HSN Code" value={productForm.hsnCode} onChange={handleProductInput} type="number" />
          </div>
          <div className="labeled-input">
            <label>Cess %</label>
            <input name="cess" placeholder="Cess %" value={productForm.cess} onChange={handleProductInput} type="number" />
          </div>
          <div className="labeled-input">
            <label>Cess Amt</label>
            <input name="cessAmt" placeholder="Cess Amount" value={productForm.cessAmt} onChange={handleProductInput} type="number" />
          </div>
          <div className="labeled-input">
            <label>Create</label>
            <input name="Create" placeholder="Create" value={productForm.Create} onChange={handleProductInput} type="number" />
          </div>
          <div className="labeled-input">
            <label>ExpDays</label>
            <input name="ExpDays" placeholder="Exp Days" value={productForm.ExpDays} onChange={handleProductInput} type="number" />
          </div>
         <div className="labeled-input">
            <label>Retailer Margin (%)</label>
            <input name="retailerMargin" placeholder="Retailer Margin (%)" value={productForm.retailerMargin} onChange={handleProductInput} type="number" step="0.01" />
          </div>
          <div className="labeled-input">
            <label>Distributor Margin (%)</label>
            <input name="distributorMargin" placeholder="Distributor Margin (%)" value={productForm.distributorMargin} onChange={handleProductInput} type="number" step="0.01" />
          </div>
           <div className="checkbox-group">
            <label>
              <input name="active" type="checkbox" checked={productForm.active} onChange={handleProductInput} /> Active
            </label>
            <label>
              <input name="locked" type="checkbox" checked={productForm.locked} onChange={handleProductInput} /> Locked
            </label>
            <label>
              <input name="allowFraction" type="checkbox" checked={productForm.allowFraction} onChange={handleProductInput} /> Allow Qty In Fraction
            </label> 
        </div>
         <div className="labeled-input">
            <label>Min Stock Holding</label>
            <input name="Min_Stock_Holding" placeholder="0" value={productForm.Min_Stock_Holding} onChange={handleProductInput} type="number" />
          </div>
           <div className="labeled-input">
            <label>Reorder Level</label>
            <input name="Reorder_Level" placeholder="0" value={productForm.Reorder_Level} onChange={handleProductInput} type="number" />
          </div>
     <div className="form-actions">
  <button type="submit" className="btn-primary">Save Product</button>

  <button
    type="button"
    className="btn-secondary"
    onClick={closeForm}
  >
    Cancel
  </button>

  <a href="/product-mapping" className="link-mapping">
    Product Mapping
  </a>
</div>
      </div>
        </div>
      </div>   
    </form>
  </div>
)}
          {/* Product - Grid View */}
          {activeSubMenu === 'Product' && openFormFor !== 'Product' && (
            renderDataTable('Products List', getFilteredProducts(), [
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'group', label: 'Group' },
              { key: 'gst', label: 'GST' },
              { key: 'Rate_Per_Unit', label: 'Rate/Unit' },
              { key: 'Min_Stock_Holding', label: 'Stock' }
            ], 'product', deleteProduct)
          )}

          {/* Account - Form View */}
          {activeSubMenu === 'Account' && openFormFor === 'Account' && (
            <div className="master-section">
              <div className="form-header">
                <div className="page-title-large">Add New Account</div>
                <button className="close-form-btn" onClick={closeForm}>✕</button>
              </div>

              <div className="account-tabs" role="tablist">
                <button className={`tab-btn ${accountActiveTab === 'basic' ? 'active' : ''}`} onClick={() => setAccountActiveTab('basic')} type="button">Basic Information</button>
                <button className={`tab-btn ${accountActiveTab === 'gst' ? 'active' : ''}`} onClick={() => setAccountActiveTab('gst')} type="button">GST Details</button>
              </div>


              <form className="master-form" onSubmit={saveAccount}>
                {accountActiveTab === 'basic' && (
                  <>
                    <div className="form-row">
                      <div className="labeled-input"><label>Account Code *</label><input name="accountCode" placeholder="Account Code" value={accountForm.accountCode} onChange={handleAccountInput} required /></div>
                      <div className="labeled-input"><label>Opening Date</label><input name="openingDate" type="date" value={accountForm.openingDate || '2026-04-21'} onChange={handleAccountInput} /></div>
                    </div>
                    <div className="form-row"><div className="labeled-input"><label>Account Name *</label><input name="accountName" placeholder="Account Name" value={accountForm.accountName} onChange={handleAccountInput} required /></div></div>
                    <div className="form-row"><div className="labeled-input"><label>Address</label><textarea name="address" placeholder="Address" value={accountForm.address} onChange={handleAccountInput} rows="2" /></div></div>
                    <div className="form-grid-3">
                      <div className="labeled-input"><label>Town</label><input name="town" placeholder="Town" value={accountForm.town} onChange={handleAccountInput} /></div>
                      <div className="labeled-input"><label>State</label><input name="state" placeholder="State" value={accountForm.state} onChange={handleAccountInput} /></div>
                      <div className="labeled-input"><label>Pin Code</label><input name="pinCode" placeholder="Pin Code" value={accountForm.pinCode} onChange={handleAccountInput} /></div>
                    </div>
                    <div className="form-grid-3">
                      <div className="labeled-input"><label>Phone No.</label><input name="phoneNo" placeholder="Phone No." value={accountForm.phoneNo} onChange={handleAccountInput} /></div>
                      <div className="labeled-input"><label>Mobile No.</label><input name="mobileNo" placeholder="Mobile No." value={accountForm.mobileNo} onChange={handleAccountInput} /></div>
                      <div className="labeled-input"><label>Email ID</label><input name="emailId" placeholder="Email ID" value={accountForm.emailId} onChange={handleAccountInput} type="email" /></div>
                    </div>
                    <div className="form-grid-3">
                      <div className="labeled-input"><label>Tin No.</label><input name="tinNo" placeholder="Tin No." value={accountForm.tinNo} onChange={handleAccountInput} /></div>
                      <div className="labeled-input"><label>Opening Balance</label><div style={{ display: 'flex', gap: '8px' }}><input name="openingBal" placeholder="0.00" value={accountForm.openingBal} onChange={handleAccountInput} style={{ flex: 1 }} /><select name="openingBalType" value={accountForm.openingBalType} onChange={handleAccountInput} style={{ width: '80px' }}><option value="Dr">Dr</option><option value="Cr">Cr</option></select></div></div>
                      <div className="labeled-input"><label>Contact Person</label><input name="contactPerson" placeholder="Contact Person" value={accountForm.contactPerson} onChange={handleAccountInput} /></div>
                    </div>
                  </>
                )}
                {accountActiveTab === 'gst' && (
                  <>
                    <div className="form-grid-3">
                      <div className="labeled-input"><label>Pan No.</label><input name="panNo" placeholder="Pan No." value={accountForm.panNo} onChange={handleAccountInput} /></div>
                      <div className="labeled-input"><label>Food License</label><input name="foodLicense" placeholder="Food License" value={accountForm.foodLicense} onChange={handleAccountInput} /></div>
                      <div className="labeled-input"><label>GST No.</label><input name="gstNo" placeholder="GST No." value={accountForm.gstNo} onChange={handleAccountInput} /></div>
                    </div>
                    <div className="form-grid-3">
                      <div className="labeled-input"><label>Bill To Add 1</label><input name="billToAdd1" placeholder="Bill To Add 1" value={accountForm.billToAdd1} onChange={handleAccountInput} /></div>
                      <div className="labeled-input"><label>Town</label><input name="town" placeholder="Town" value={accountForm.town} onChange={handleAccountInput} /></div>
                      <div className="labeled-input"><label>TCS %</label><input name="tcsPercent" placeholder="0.0000" value={accountForm.tcsPercent} onChange={handleAccountInput} type="number" step="0.0001" /></div>
                    </div>
                    <div className="form-grid-3">
                      <div className="labeled-input"><label>Tan No.</label><input name="tanNo" placeholder="Tan No." value={accountForm.tanNo} onChange={handleAccountInput} /></div>
                      <div className="labeled-input"><label>GST Type</label><select name="gstType" value={accountForm.gstType} onChange={handleAccountInput}><option value="Unregistered">Unregistered</option><option value="Registered">Registered</option><option value="Composition">Composition</option></select></div>
                      <div className="labeled-input"><label>Gst Date</label><input name="gstDate" type="date" value={accountForm.gstDate} onChange={handleAccountInput} /></div>
                    </div>
                    <div className="form-grid-3">
                      <div className="labeled-input"><label>Add 2</label><input name="add2" placeholder="Add 2" value={accountForm.add2} onChange={handleAccountInput} /></div>
                      <div className="labeled-input"><label>Gst Cls Date</label><input name="gstClsDate" type="date" value={accountForm.gstClsDate} onChange={handleAccountInput} /></div>
                      <div className="labeled-input"><label>Allow in Purchase</label><select name="allowInPurchase" value={accountForm.allowInPurchase} onChange={handleAccountInput}><option value="N">N</option><option value="Y">Y</option></select></div>
                    </div>
                  </>
                )}

                <div className="form-actions">
                  <button type="submit" className="btn-save">Save Account</button>
                  <button type="button" className="btn-cancel" onClick={closeForm}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Account - Grid View */}
          {activeSubMenu === 'Account' && openFormFor !== 'Account' && (
            renderDataTable('Accounts List', getFilteredAccounts(), [
              { key: 'accountCode', label: 'Account Code' },
              { key: 'accountName', label: 'Account Name' },
              { key: 'contactPerson', label: 'Contact Person' },
              { key: 'mobileNo', label: 'Mobile No' },
              { key: 'gstType', label: 'GST Type' }
            ], 'account', deleteAccount)
          )}

          {/* Other Account - Form View */}
          {activeSubMenu === 'Other Account' && openFormFor === 'Other Account' && (
            <div className="master-section">
              <div className="form-header">
                <div className="page-title-large">Add Other Account</div>
                <button className="close-form-btn" onClick={closeForm}>✕</button>
              </div>

              <div className="account-tabs">
                <button className={`tab-btn ${otherAccountActiveTab === 'basic' ? 'active' : ''}`} onClick={() => setOtherAccountActiveTab('basic')}>Basic Information</button>
                <button className={`tab-btn ${otherAccountActiveTab === 'gst' ? 'active' : ''}`} onClick={() => setOtherAccountActiveTab('gst')}>GST Details</button>
              </div>

              <form className="master-form" onSubmit={saveOtherAccount}>
                {otherAccountActiveTab === 'basic' && (
                  <>
                    <div className="form-row">
                      <div className="labeled-input"><label>Last Account</label><input placeholder={otherAccounts.length > 0 ? otherAccounts[otherAccounts.length - 1].accountCode : 'OUTIGST-1'} disabled /></div>
                      <div className="labeled-input"><label>Opening Date</label><input name="openingDate" type="date" value={otherAccountForm.openingDate || '2026-04-04'} onChange={handleOtherAccountInput} /></div>
                    </div>
                    <div className="form-row">
                      <div className="labeled-input"><label>Account Code *</label><input name="accountCode" placeholder="Account Code" value={otherAccountForm.accountCode} onChange={handleOtherAccountInput} required /></div>
                      <div className="labeled-input"><label>Account Name *</label><input name="accountName" placeholder="Account Name" value={otherAccountForm.accountName} onChange={handleOtherAccountInput} required /></div>
                    </div>
                   <div className="form-row">
  <div className="labeled-input">
    <label>Account Group</label>
    <select name="accountGroup" value={otherAccountForm.accountGroup} onChange={handleOtherAccountInput}>
      <option value="ASSETS">ASSETS</option>
      <option value="LIABILITIES">LIABILITIES</option>
      <option value="EXPENSES">EXPENSES</option>
      <option value="INCOMES">INCOMES</option>
      <option value="FIXED ASSETS">FIXED ASSETS</option>
      <option value="INVESTMENT">INVESTMENT</option>
      <option value="CURRENT ASSETS">CURRENT ASSETS</option>
      <option value="LOANS GIVEN">LOANS GIVEN</option>
      <option value="MISCELLANEOUS EXPENSES">MISCELLANEOUS EXPENSES</option>
      <option value="LAND & BULDING">LAND & BULDING</option>
      <option value="CASH IN HAND">CASH IN HAND</option>
      <option value="BANK ACCOUNTS">BANK ACCOUNTS</option>
      <option value="SUNDRY DEBTORS">SUNDRY DEBTORS</option>
      <option value="CAPITAL ACCOUNTS">CAPITAL ACCOUNTS</option>
      <option value="RESERVES & SURPLUS">RESERVES & SURPLUS</option>
      <option value="SECURED LOANS">SECURED LOANS</option>
      <option value="UNSECURED LOANS">UNSECURED LOANS</option>
      <option value="CURRENT LIABILITIES">CURRENT LIABILITIES</option>
      <option value="PROVISIONS (LIABILITIES)">PROVISIONS (LIABILITIES)</option>
      <option value="SUNDRY CREDITORS">SUNDRY CREDITORS</option>
      <option value="TAXES & DUTIES">TAXES & DUTIES</option>
      <option value="EXPENSES DIRECT">EXPENSES DIRECT</option>
      <option value="EXPENSES INDIRECT">EXPENSES INDIRECT</option>
      <option value="TRADING EXPENSES">TRADING EXPENSES</option>
      <option value="PROFIT & LOSS EXPENSES">PROFIT & LOSS EXPENSES</option>
      <option value="INCOMES DIRECT">INCOMES DIRECT</option>
      <option value="INCOMES INDIRECT">INCOMES INDIRECT</option>
      <option value="PURCHASE ACCOUNTS">PURCHASE ACCOUNTS</option>
      <option value="SALES ACCOUNTS">SALES ACCOUNTS</option>
      <option value="OPENING STOCK">OPENING STOCK</option>
      <option value="CLOSING STOCK">CLOSING STOCK</option>
      <option value="BANK OVER DRAFT">BANK OVER DRAFT</option>
      <option value="PROFIT&LOSS TRANSFER">PROFIT&LOSS TRANSFER</option>
      <option value="COUPON ACCOUNTS">COUPON ACCOUNTS</option>
      <option value="CASH DISCOUNT ACCOUNTS">CASH DISCOUNT ACCOUNTS</option>
      <option value="DISPLAY ACCOUNTS">DISPLAY ACCOUNTS</option>
      <option value="ADD LESS ACCOUNTS">ADD LESS ACCOUNTS</option>
      <option value="SERVICE ACCOUNT">SERVICE ACCOUNT</option>
    </select>
  </div>
</div>
                    <div className="form-row"><div className="labeled-input"><label>Address</label><textarea name="address" placeholder="Address" value={otherAccountForm.address} onChange={handleOtherAccountInput} rows="2" /></div></div>
                    <div className="form-grid-3">
                      <div className="labeled-input"><label>Town</label><input name="town" placeholder="Town" value={otherAccountForm.town} onChange={handleOtherAccountInput} /></div>
                      <div className="labeled-input"><label>State</label><input name="state" placeholder="State" value={otherAccountForm.state} onChange={handleOtherAccountInput} /></div>
                      <div className="labeled-input"><label>Country</label><input name="country" placeholder="Country" value={otherAccountForm.country} onChange={handleOtherAccountInput} /></div>
                    </div>
                    <div className="form-grid-3">
                      <div className="labeled-input"><label>Pin Code</label><input name="pinCode" placeholder="Pin Code" value={otherAccountForm.pinCode} onChange={handleOtherAccountInput} /></div>
                      <div className="labeled-input"><label>Phone No.</label><input name="phoneNo" placeholder="Phone No." value={otherAccountForm.phoneNo} onChange={handleOtherAccountInput} /></div>
                      <div className="labeled-input"><label>Mobile No.</label><input name="mobileNo" placeholder="Mobile No." value={otherAccountForm.mobileNo} onChange={handleOtherAccountInput} /></div>
                    </div>
                    <div className="form-grid-3">
                      <div className="labeled-input"><label>Email ID</label><input name="emailId" placeholder="Email ID" value={otherAccountForm.emailId} onChange={handleOtherAccountInput} type="email" /></div>
                      <div className="labeled-input"><label>Tin No.</label><input name="tinNo" placeholder="Tin No." value={otherAccountForm.tinNo} onChange={handleOtherAccountInput} /></div>
                      <div className="labeled-input"><label>Opening Balance</label><div style={{ display: 'flex', gap: '8px' }}><input name="openingBal" placeholder="0.00" value={otherAccountForm.openingBal} onChange={handleOtherAccountInput} style={{ flex: 1 }} /><select name="openingBalType" value={otherAccountForm.openingBalType} onChange={handleOtherAccountInput} style={{ width: '80px' }}><option value="Dr">Dr</option><option value="Cr">Cr</option></select></div></div>
                    </div>
                  </>
                )}
                {otherAccountActiveTab === 'gst' && (
                  <>
                    <div className="form-grid-3">
                      <div className="labeled-input"><label>Pan No.</label><input name="panNo" placeholder="Pan No." value={otherAccountForm.panNo} onChange={handleOtherAccountInput} /></div>
                      <div className="labeled-input"><label>Food License</label><input name="foodLicense" placeholder="Food License" value={otherAccountForm.foodLicense} onChange={handleOtherAccountInput} /></div>
                      <div className="labeled-input"><label>GST No.</label><input name="gstNo" placeholder="GST No." value={otherAccountForm.gstNo} onChange={handleOtherAccountInput} /></div>
                    </div>
                    <div className="form-grid-3">
                      <div className="labeled-input"><label>Bill To Add 1</label><input name="billToAdd1" placeholder="Bill To Add 1" value={otherAccountForm.billToAdd1} onChange={handleOtherAccountInput} /></div>
                      <div className="labeled-input"><label>Remark</label><input name="remark" placeholder="Remark" value={otherAccountForm.remark} onChange={handleOtherAccountInput} /></div>
                      <div className="labeled-input"><label>TCS %</label><input name="tcsPercent" placeholder="0.0000" value={otherAccountForm.tcsPercent} onChange={handleOtherAccountInput} type="number" step="0.0001" /></div>
                    </div>
                    <div className="form-grid-3">
                      <div className="labeled-input"><label>Tan No.</label><input name="tanNo" placeholder="Tan No." value={otherAccountForm.tanNo} onChange={handleOtherAccountInput} /></div>
                      <div className="labeled-input"><label>GST Type</label><select name="gstType" value={otherAccountForm.gstType} onChange={handleOtherAccountInput}><option value="Unregistered">Unregistered</option><option value="Registered">Registered</option><option value="Composition">Composition</option></select></div>
                      <div className="labeled-input"><label>Gst Date</label><input name="gstDate" type="date" value={otherAccountForm.gstDate} onChange={handleOtherAccountInput} /></div>
                    </div>
                    <div className="form-grid-3">
                      <div className="labeled-input"><label>Add 2.</label><input name="add2" placeholder="Add 2." value={otherAccountForm.add2} onChange={handleOtherAccountInput} /></div>
                      <div className="labeled-input"><label>Gst Cls Date</label><input name="gstClsDate" type="date" value={otherAccountForm.gstClsDate} onChange={handleOtherAccountInput} /></div>
                    </div>
                  </>
                )}
                <div className="form-actions">
                  <button type="submit" className="btn-save">Save Account</button>
                  <button type="button" className="btn-cancel" onClick={closeForm}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Other Account - Grid View */}
          {activeSubMenu === 'Other Account' && openFormFor !== 'Other Account' && (
            renderDataTable('Other Accounts List', getFilteredOtherAccounts(), [
              { key: 'accountCode', label: 'Code' },
              { key: 'accountName', label: 'Name' },
              { key: 'accountGroup', label: 'Account Group' },
              { key: 'invType', label: 'Inv Type' }
            ], 'otherAccount', deleteOtherAccount)
          )}

         {/* GST Master - Form View */}
{activeSubMenu === 'GST Master' && openFormFor === 'GST Master' && (
  <div className="master-section erp-master-form">
    <div className="form-header">
      <div className="page-title-large">{editGstId ? 'Edit GST Information' : 'Add VAT/GST Information'}</div>
      <button className="close-form-btn" onClick={closeForm}>✕</button>
    </div>
    <form className="master-form" onSubmit={saveGst}>
      <div className="form-section">
        <h4 className="section-header">GST Details</h4>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Code *</label>
            <input name="code" placeholder="Code" value={gstForm.code} onChange={handleGstInput} required />
          </div>
          <div className="labeled-input">
            <label>VAT % *</label>
            <input name="vat" type="number" step="0.01" placeholder="VAT %" value={gstForm.vat} onChange={handleGstInput} required />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Purchase Type</label>
            <select name="purchaseType" value={gstForm.purchaseType} onChange={handleGstInput}>
              <option value="VAT ON PURCHASE PRICE">VAT ON PURCHASE PRICE</option>
              <option value="VAT ON MRP">VAT ON MRP</option>
              <option value="OTHER STATE">OTHER STATE</option>
              <option value="EXPT PURCHASE">EXPT PURCHASE</option>
              <option value="VAT ON MARGIN">VAT ON MARGIN</option>
            </select>
          </div>
          <div className="labeled-input">
            <label>Sales Type</label>
            <select name="salesType" value={gstForm.salesType} onChange={handleGstInput}>
              <option value="VAT ON SALES PRICE">VAT ON SALES PRICE</option>
              <option value="VAT ON MRP">VAT ON MRP</option>
              <option value="OTHER STATE">OTHER STATE</option>
            </select>
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">{editGstId ? 'Update' : 'Save'}</button>
        <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
      </div>
    </form>
  </div>
)}

          {/* GST Master - Grid View */}
          {activeSubMenu === 'GST Master' && openFormFor !== 'GST Master' && (
            renderDataTable('VAT/GST Rates List', getFilteredGST(), [
              { key: 'srNo', label: 'Sr. No' },
              { key: 'code', label: 'Code' },
              { key: 'vat', label: 'VAT %' },
              { key: 'purchaseType', label: 'Purchase Type' },
              { key: 'salesType', label: 'Sales Type' }
            ], 'gst', deleteGst)
          )}

         {/* Area Master - Form View */}
{activeSubMenu === 'Area' && openFormFor === 'Area' && (
  <div className="master-section erp-master-form">
    <div className="form-header">
      <div className="page-title-large">{editAreaId ? 'Edit Area' : 'Add New Area'}</div>
      <button className="close-form-btn" onClick={closeForm}>✕</button>
    </div>
    <form className="master-form" onSubmit={saveArea}>
      <div className="form-section">
        <h4 className="section-header">Basic Information</h4>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Area Code *</label>
            <input name="code" placeholder="Area Code" value={areaForm.code} onChange={handleAreaInput} required />
          </div>
          <div className="labeled-input">
            <label>Area Name *</label>
            <input name="name" placeholder="Area Name" value={areaForm.name} onChange={handleAreaInput} required />
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">{editAreaId ? 'Update' : 'Save Area'}</button>
        <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
      </div>
    </form>
  </div>
)}

          {/* Area Master - Grid View */}
          {activeSubMenu === 'Area' && openFormFor !== 'Area' && (
            renderDataTable('Areas List', getFilteredAreas(), [
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' }
            ], 'area', deleteArea)
          )}

         {/* Service Master - Form View */}
{activeSubMenu === 'Service' && openFormFor === 'Service' && (
  <div className="master-section erp-master-form">
    <div className="form-header">
      <div className="page-title-large">{editServiceId ? 'Edit Service Information' : 'Add Service Information'}</div>
      <button className="close-form-btn" onClick={closeForm}>✕</button>
    </div>
    <form className="master-form" onSubmit={saveService}>
      <div className="form-section">
        <h4 className="section-header">Service Details</h4>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Code *</label>
            <input name="code" placeholder="Code" value={serviceForm.code} onChange={handleServiceInput} required />
          </div>
          <div className="labeled-input">
            <label>Name *</label>
            <input name="name" placeholder="Service Name" value={serviceForm.name} onChange={handleServiceInput} required />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>VAT % *</label>
            <input name="vat" type="number" step="0.01" placeholder="VAT %" value={serviceForm.vat} onChange={handleServiceInput} required />
          </div>
          <div className="labeled-input">
            <label>Purchase Type</label>
            <select name="purchaseType" value={serviceForm.purchaseType} onChange={handleServiceInput}>
              <option value="VAT ON PURCHASE PRICE">VAT ON PURCHASE PRICE</option>
              <option value="VAT ON MRP">VAT ON MRP</option>
              <option value="OTHER STATE">OTHER STATE</option>
              <option value="EXPT PURCHASE">EXPT PURCHASE</option>
              <option value="VAT ON MARGIN">VAT ON MARGIN</option>
            </select>
          </div>
        </div>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>Sales Type</label>
            <select name="salesType" value={serviceForm.salesType} onChange={handleServiceInput}>
              <option value="VAT ON SALES PRICE">VAT ON SALES PRICE</option>
              <option value="VAT ON MRP">VAT ON MRP</option>
              <option value="OTHER STATE">OTHER STATE</option>
            </select>
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">{editServiceId ? 'Update' : 'Save'}</button>
        <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
      </div>
    </form>
  </div>
)}
          {/* Service Master - Grid View */}
          {activeSubMenu === 'Service' && openFormFor !== 'Service' && (
            renderDataTable('Services List', getFilteredServices(), [
              { key: 'srNo', label: 'Sr. No' },
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'vat', label: 'VAT %' },
              { key: 'purchaseType', label: 'Purchase Type' },
              { key: 'salesType', label: 'Sales Type' }
            ], 'service', deleteService)
          )}

          {/* Salesman Master - Form View */}
{activeSubMenu === 'Salesman' && openFormFor === 'Salesman' && (
  <div className="master-section erp-master-form">
    <div className="form-header">
      <div className="page-title-large">{editSalesmanId ? 'Edit Salesman Information' : 'Add Salesman Information'}</div>
      <button className="close-form-btn" onClick={closeForm}>✕</button>
    </div>
    <form className="master-form" onSubmit={saveSalesman}>
      <div className="form-section">
        <h4 className="section-header">Personal Information</h4>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>SalesMan Code *</label>
            <input name="code" placeholder="SalesMan Code" value={salesmanForm.code} onChange={handleSalesmanInput} required />
          </div>
          <div className="labeled-input">
            <label>SalesMan Name *</label>
            <input name="name" placeholder="SalesMan Name" value={salesmanForm.name} onChange={handleSalesmanInput} required />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>SalesMan Type</label>
            <select name="type" value={salesmanForm.type} onChange={handleSalesmanInput}>
              <option value="SALESMAN">SALESMAN</option>
              <option value="DELIVERY BOY">DELIVERY BOY</option>
              <option value="COLLECTION PERSON">COLLECTION PERSON</option>
            </select>
          </div>
          <div className="labeled-input">
            <label>Date Of Birth</label>
            <input name="dateOfBirth" type="date" value={salesmanForm.dateOfBirth} onChange={handleSalesmanInput} />
          </div>
        </div>
        <div className="form-row-single">
          <div className="labeled-input">
            <label>Address</label>
            <input name="address" placeholder="Address" value={salesmanForm.address} onChange={handleSalesmanInput} />
          </div>
        </div>
        <div className="form-grid-3">
          <div className="labeled-input">
            <label>Town</label>
            <input name="town" placeholder="Town" value={salesmanForm.town} onChange={handleSalesmanInput} />
          </div>
          <div className="labeled-input">
            <label>Pin Code</label>
            <input name="pinCode" placeholder="Pin Code" value={salesmanForm.pinCode} onChange={handleSalesmanInput} />
          </div>
          <div className="labeled-input">
            <label>State</label>
            <input name="state" placeholder="State" value={salesmanForm.state} onChange={handleSalesmanInput} />
          </div>
        </div>
        <div className="form-grid-3">
          <div className="labeled-input">
            <label>Country</label>
            <input name="country" placeholder="Country" value={salesmanForm.country} onChange={handleSalesmanInput} />
          </div>
          <div className="labeled-input">
            <label>Phone No.</label>
            <input name="phoneNo" placeholder="Phone No." value={salesmanForm.phoneNo} onChange={handleSalesmanInput} />
          </div>
          <div className="labeled-input">
            <label>Mobile No.</label>
            <input name="mobileNo" placeholder="Mobile No." value={salesmanForm.mobileNo} onChange={handleSalesmanInput} />
          </div>
        </div>
        <div className="form-grid-3">
          <div className="labeled-input">
            <label>Email ID</label>
            <input name="emailId" placeholder="Email ID" value={salesmanForm.emailId} onChange={handleSalesmanInput} type="email" />
          </div>
          <div className="labeled-input">
            <label>Qualification</label>
            <input name="qualification" placeholder="Qualification" value={salesmanForm.qualification} onChange={handleSalesmanInput} />
          </div>
          <div className="labeled-input">
            <label>Reference</label>
            <input name="reference" placeholder="Reference" value={salesmanForm.reference} onChange={handleSalesmanInput} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="labeled-input">
            <label>IMEI No</label>
            <input name="imeiNo" placeholder="IMEI No" value={salesmanForm.imeiNo} onChange={handleSalesmanInput} />
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">{editSalesmanId ? 'Update' : 'Save'}</button>
        <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
      </div>
    </form>
  </div>
)}
          {/* Salesman Master - Grid View */}
          {activeSubMenu === 'Salesman' && openFormFor !== 'Salesman' && (
            renderDataTable('Salesmen List', getFilteredSalesmen(), [
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'type', label: 'Type' },
              { key: 'mobileNo', label: 'Mobile No.' },
              { key: 'reference', label: 'Reference' }
            ], 'salesman', deleteSalesman)
          )}

          {/* Salesman To Area Mapping UI */}
          {activeSubMenu === 'Salesman To Area' && <SalesmanToAreaMapping />}

        
{activeSubMenu === 'Sales' && (
  <div className="master-section erp-master-form sales-invoice">
    <div className="erp-header">
      <div>
        <h2 className="erp-title">Sales Invoice</h2>
      </div>
    </div>

    {/* Invoice Header - 4 col grid */}
    <div className="form-section">
      <h4 className="section-header">Invoice Header</h4>
      <div className="invoice-header-grid">
        <div className="labeled-input"><label>Bill Date *</label><input type="date" name="billDate" className="erp-input" value={invoiceFormData.billDate} onChange={handleInvoiceInputChange} /></div>
        <div className="labeled-input"><label>Godown *</label>
          <select name="godown" className="erp-select" value={invoiceFormData.godown} onChange={handleInvoiceInputChange}>
            <option value="">Select</option>
            {godowns.map(g => <option key={g.id} value={g.code}>{g.name}</option>)}
          </select>
        </div>
        <div className="labeled-input"><label>Company</label>
          <select name="company" className="erp-select" value={invoiceFormData.company} onChange={handleInvoiceInputChange}>
            <option value="">Select</option>
            {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="labeled-input"><label>Area *</label>
          <select name="area" className="erp-select" value={invoiceFormData.area} onChange={handleInvoiceInputChange}>
            <option value="">Select</option>
            {areas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
          </select>
        </div>

        <div className="labeled-input"><label>Party *</label>
          <select name="party" className="erp-select" value={invoiceFormData.party} onChange={handleInvoiceInputChange}>
            <option value="">Select</option>
            {accounts.map(a => <option key={a.id} value={a.accountName}>{a.accountName}</option>)}
          </select>
        </div>
        <div className="labeled-input"><label>BillSeries</label><input name="BillSeries" className="erp-input" value={invoiceFormData.BillSeries} onChange={handleInvoiceInputChange} /></div>
        <div className="labeled-input"><label>Bill No</label><input name="billNo" className="erp-input" value={invoiceFormData.billNo} onChange={handleInvoiceInputChange} /></div>
        <div className="labeled-input"><label>Bill Type *</label>
          <select name="billType" className="erp-select" value={invoiceFormData.billType} onChange={handleInvoiceInputChange}>
            <option>Cash</option><option>Credit</option>
          </select>
        </div>
        <div className="labeled-input"><label>Due Date *</label><input type="date" name="dueDate" className="erp-input" value={invoiceFormData.dueDate} onChange={handleInvoiceInputChange} /></div>
        <div className="labeled-input"><label>Sales Man *</label>
          <select name="salesman" className="erp-select" value={invoiceFormData.salesman} onChange={handleInvoiceInputChange}>
            <option value="">Select</option>
            {salesmen.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div className="labeled-input narration-field"><label>Narration</label><textarea name="narration" className="erp-textarea" rows="2" value={invoiceFormData.narration} onChange={handleInvoiceInputChange} /></div>
      </div>
    </div>

   
<div className="form-section">
  <h4 className="section-header">Product Entry</h4>
  <div className="product-entry-container" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px' }}>
    <div className="erp-table-container" style={{ minWidth: '2000px' }}>
      <table className="product-entry-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <tr>
            <th style={{ position: 'sticky', left: 0, backgroundColor: '#f8fafc', zIndex: 20, minWidth: '50px' }}>Sr</th>
            <th style={{ minWidth: '180px' }}>Product</th>
            <th style={{ minWidth: '100px' }}>Units</th>
            <th style={{ minWidth: '100px' }}>Qty</th>
            <th style={{ minWidth: '100px' }}>Free</th>
            <th style={{ minWidth: '100px' }}>MRP</th>
            <th style={{ minWidth: '100px' }}>Rate</th>
            <th style={{ minWidth: '120px' }}>Rate GST</th>
            <th style={{ minWidth: '120px' }}>TPR Amt</th>
            <th style={{ minWidth: '100px' }}>Scheme %</th>
            <th style={{ minWidth: '120px' }}>Scheme Amt</th>
            <th style={{ minWidth: '100px' }}>CD %</th>
            <th style={{ minWidth: '120px' }}>CD Amt</th>
            <th style={{ minWidth: '100px' }}>Star %</th>
            <th style={{ minWidth: '120px' }}>Star Amt</th>
            <th style={{ minWidth: '120px' }}>Taxable</th>
            <th style={{ minWidth: '100px' }}>GST %</th>
            <th style={{ minWidth: '100px' }}>SGST</th>
            <th style={{ minWidth: '100px' }}>CGST</th>
            <th style={{ minWidth: '120px' }}>Amount</th>
            <th style={{ position: 'sticky', right: 0, backgroundColor: '#f8fafc', zIndex: 20, minWidth: '70px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {invoiceItems.map((item, index) => (
            <tr key={item.id} className={index === activeRow ? 'active-row' : ''}>
              <td style={{ position: 'sticky', left: 0, backgroundColor: index === activeRow ? '#eff6ff' : 'white', zIndex: 5, minWidth: '50px' }}>{item.sr}</td>
              <td style={{ position: 'relative' }}>
                <input
                  data-product-index={index}
                  className="erp-input product-search"
                  value={item.product}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateInvoiceItem(index, 'product', value);
                    setCurrentProductIndex(index);
                    if (value.trim() !== '') {
                      setProductListFilter(value);
                      setShowProductList(true);
                    } else {
                      setShowProductList(false);
                    }
                  }}
                  onFocus={() => {
                    setActiveRow(index);
                    if (item.product) {
                      setProductListFilter(item.product);
                      setCurrentProductIndex(index);
                      setShowProductList(true);
                    }
                  }}
                  style={{ width: '100%', minWidth: '150px', cursor: 'pointer' }}
                  placeholder="Click to select product"
                />
                
                {showProductList && currentProductIndex === index && productListFilter.trim() !== '' && (
                  <div className="erlay">
                    <div className="product-dropdown">
                      <div className="dropdown-list">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ background: '#eff6ff', position: 'sticky', top: 0 }}>
                              <th style={{ padding: '6px', textAlign: 'left' }}>Item Code</th>
                              <th style={{ padding: '6px', textAlign: 'left' }}>Name</th>
                              <th style={{ padding: '6px', textAlign: 'left' }}>Batch</th>
                              <th style={{ padding: '6px', textAlign: 'right' }}>MRP</th>
                              <th style={{ padding: '6px', textAlign: 'right' }}>Sales Rate</th>
                              <th style={{ padding: '6px', textAlign: 'right' }}>Stock</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products
                              .filter(p =>
                                p.name?.toLowerCase().includes(productListFilter.toLowerCase()) ||
                                p.code?.toLowerCase().includes(productListFilter.toLowerCase())
                              )
                              .map(product => {
                                const productBatches = batches.filter(b => b.productId === product.id);
                                const displayBatch = productBatches[0];
                                const totalStock = productBatches.reduce((sum, b) => sum + (parseFloat(b.stockQty) || 0), 0);
                                
                                return (
                                  <tr
                                    key={product.id}
                                    onClick={() => {
                                      if (productBatches.length > 1) {
                                        setCurrentProductIndex(index);
                                        setProductBatchesForSelection(productBatches);
                                        setSelectedProductForBatch(product);
                                        setShowBatchSelectionModal(true);
                                      } else if (productBatches.length === 1) {
                                        handleProductSelect(currentProductIndex, {
                                          ...product,
                                          selectedBatch: productBatches[0]
                                        });
                                        // Auto-add new row after product selection (except for last row)
                                        if (index === invoiceItems.length - 1) {
                                          setTimeout(() => {
                                            addInvoiceItem();
                                            setTimeout(() => {
                                              const nextProductInput = document.querySelector(`[data-product-index="${index + 1}"]`);
                                              if (nextProductInput) nextProductInput.focus();
                                            }, 50);
                                          }, 150);
                                        } else {
                                          setTimeout(() => {
                                            const nextProductInput = document.querySelector(`[data-product-index="${index + 1}"]`);
                                            if (nextProductInput) nextProductInput.focus();
                                          }, 50);
                                        }
                                      } else {
                                        handleProductSelect(currentProductIndex, product);
                                        // Auto-add new row after product selection (except for last row)
                                        if (index === invoiceItems.length - 1) {
                                          setTimeout(() => {
                                            addInvoiceItem();
                                            setTimeout(() => {
                                              const nextProductInput = document.querySelector(`[data-product-index="${index + 1}"]`);
                                              if (nextProductInput) nextProductInput.focus();
                                            }, 50);
                                          }, 150);
                                        } else {
                                          setTimeout(() => {
                                            const nextProductInput = document.querySelector(`[data-product-index="${index + 1}"]`);
                                            if (nextProductInput) nextProductInput.focus();
                                          }, 50);
                                        }
                                      }
                                    }}
                                    style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                                  >
                                    <td style={{ padding: '6px' }}>{product.code}</td>
                                    <td style={{ padding: '6px' }}>{product.name}</td>
                                    <td style={{ padding: '6px' }}>
                                      {productBatches.length > 1 
                                        ? `${productBatches.length} batches` 
                                        : displayBatch?.batchNo || '-'}
                                    </td>
                                    <td style={{ padding: '6px', textAlign: 'right' }}>
                                      ₹{displayBatch?.mrp || product.mrp || 0}
                                    </td>
                                    <td style={{ padding: '6px', textAlign: 'right' }}>
                                      ₹{displayBatch?.salesRate || product.salesRate || product.mrp || 0}
                                    </td>
                                    <td style={{ padding: '6px', textAlign: 'right' }}>
                                      {totalStock}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </td>
              <td>
                <select
                  className="erp-select"
                  data-field="units"
                  data-index={index}
                  value={item.units}
                  onChange={(e) => updateInvoiceItem(index, 'units', e.target.value)}
                  onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'units')}
                  style={{ width: '100%' }}
                >
                  <option value="PCS">PCS</option>
                  <option value="BOX">BOX</option>
                  <option value="INBOX">INBOX</option>
                  <option value="OUTER">OUTER</option>
                  <option value="KG">KG</option>
                  <option value="LTR">LTR</option>
                </select>
              </td>
              <td><input className="erp-input numeric" data-field="qty" data-index={index} value={item.qty} onChange={(e) => updateInvoiceItem(index, 'qty', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'qty')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric" data-field="free" data-index={index} value={item.free} onChange={(e) => updateInvoiceItem(index, 'free', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'free')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric" data-field="mrp" data-index={index} value={item.mrp} onChange={(e) => updateInvoiceItem(index, 'mrp', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'mrp')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric" data-field="rate" data-index={index} value={item.rate} onChange={(e) => updateInvoiceItem(index, 'rate', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'rate')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric" data-field="rateGst" data-index={index} value={item.rateGst} onChange={(e) => updateInvoiceItem(index, 'rateGst', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'rateGst')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric" data-field="tprAmt" data-index={index} value={item.tprAmt} onChange={(e) => updateInvoiceItem(index, 'tprAmt', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'tprAmt')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric small" data-field="schemePct" data-index={index} value={item.schemePct} onChange={(e) => updateInvoiceItem(index, 'schemePct', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'schemePct')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric" data-field="schemeAmt" data-index={index} value={item.schemeAmt} onChange={(e) => updateInvoiceItem(index, 'schemeAmt', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'schemeAmt')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric small" data-field="cdPct" data-index={index} value={item.cdPct} onChange={(e) => updateInvoiceItem(index, 'cdPct', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'cdPct')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric" data-field="cdAmt" data-index={index} value={item.cdAmt} onChange={(e) => updateInvoiceItem(index, 'cdAmt', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'cdAmt')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric small" data-field="starPct" data-index={index} value={item.starPct} onChange={(e) => updateInvoiceItem(index, 'starPct', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'starPct')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric" data-field="starAmt" data-index={index} value={item.starAmt} onChange={(e) => updateInvoiceItem(index, 'starAmt', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'starAmt')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric" data-field="taxable" data-index={index} value={item.taxable} onChange={(e) => updateInvoiceItem(index, 'taxable', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'taxable')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric small" data-field="gst" data-index={index} value={item.gst} onChange={(e) => updateInvoiceItem(index, 'gst', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'gst')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric" data-field="sgst" data-index={index} value={item.sgst} onChange={(e) => updateInvoiceItem(index, 'sgst', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'sgst')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric" data-field="cgst" data-index={index} value={item.cgst} onChange={(e) => updateInvoiceItem(index, 'cgst', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'cgst')} style={{ width: '100%' }} /></td>
              <td><input className="erp-input numeric font-bold" data-field="amount" data-index={index} value={item.amount} onChange={(e) => updateInvoiceItem(index, 'amount', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'amount')} style={{ width: '100%', fontWeight: 'bold' }} /></td>
              <td style={{ position: 'sticky', right: 0, backgroundColor: index === activeRow ? '#eff6ff' : 'white', zIndex: 5 }}>
                <button className="btn-delete text-red-500" onClick={() => deleteInvoiceItem(index)} style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}>🗑 Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</div>
   
<div className="form-section">
  <h4 className="section-header">Invoice Summary</h4>
  <div className="summary-bar">
    <div>Gross Amount: <span className="amount">₹{invoiceSummary.gross.toFixed(2)}</span></div>
    <div>TPR Amount: <span className="amount">-₹{invoiceSummary.tpr.toFixed(2)}</span></div>
    <div>Scheme Amount: <span className="amount">-₹{invoiceSummary.scheme.toFixed(2)}</span></div>
    <div>Star Discount: <span className="amount">-₹{invoiceSummary.star.toFixed(2)}</span></div>
    <div>Cash Discount: <span className="amount">-₹{invoiceSummary.cd.toFixed(2)}</span></div>
    <div className="taxable-value">Taxable Value: <span className="amount">₹{(invoiceSummary.gross - invoiceSummary.tpr - invoiceSummary.scheme - invoiceSummary.star - invoiceSummary.cd).toFixed(2)}</span></div>
    <div>SGST Amount: <span className="amount">+₹{(invoiceSummary.gst / 2).toFixed(2)}</span></div>
    <div>CGST Amount: <span className="amount">+₹{(invoiceSummary.gst / 2).toFixed(2)}</span></div>
    <div className="net-amount">Net Amount: <strong>₹{((invoiceSummary.gross - invoiceSummary.tpr - invoiceSummary.scheme - invoiceSummary.star - invoiceSummary.cd) + invoiceSummary.gst).toFixed(2)}</strong></div>
  </div>
</div>
    {/* Action Button */}
    <div className="form-actions">
      <button className="btn-add-invoice" onClick={saveInvoice}>
        💾 Add Invoice
      </button>
    </div>
  </div>
)}

          {/* Purchase Invoice */}
          {activeSubMenu === 'Purchase' && (
            <div className="master-section erp-master-form purchase-invoice">
              <div className="erp-header">
                <div>
                  <h2 className="erp-title">Add Purchase</h2>
                </div>
              </div>
              


              {/* Purchase Header Fields */}
              <div className="form-section">
                <div className="purchase-header-grid">
                   <div className="labeled-input"><label>Date</label>
                    <input type="date" name="invoiceDate" className="erp-input" value={purchaseFormData.invoiceDate} onChange={handlePurchaseInputChange} />
                  </div>
                  <div className="labeled-input"><label>Vou Ser</label>
                    <input type="text" name="Vou Ser" className="erp-input" placeholder="Vou Ser" value={purchaseFormData.vno} onChange={handlePurchaseInputChange} />
                  </div>
                   <div className="labeled-input"><label>Vou No</label>
                    <input type="text" name="Vou No" className="erp-input" placeholder="Vou No" value={purchaseFormData.vno} onChange={handlePurchaseInputChange} />
                  </div>
                  <div className="labeled-input"><label>SUPPLIER *</label>
                    <select name="supplier" className="erp-select" value={purchaseFormData.supplier} onChange={handlePurchaseInputChange}>
                      <option value="">Select Supplier</option>
                      {accounts.map(acc => <option key={acc.id} value={acc.accountName}>{acc.accountName}</option>)}
                    </select>
                  </div>
                  <div className="labeled-input"><label>COMPANY *</label>
                    <select name="company" className="erp-select" value={purchaseFormData.company} onChange={handlePurchaseInputChange}>
                      <option value="">Select Company</option>
                      {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="labeled-input"><label>STORAGE LOCATION/GODOWN *</label>
                    <select name="storageLocation" className="erp-select" value={purchaseFormData.storageLocation} onChange={handlePurchaseInputChange}>
                      <option value="">Select Godown</option>
                      {godowns.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="labeled-input"><label>INVOICE DATE</label>
                    <input type="date" name="invoiceDate" className="erp-input" value={purchaseFormData.invoiceDate} onChange={handlePurchaseInputChange} />
                  </div>
                </div>

                <div className="purchase-header-grid">
                  <div className="labeled-input"><label>ENTER VNO</label>
                    <input type="text" name="vno" className="erp-input" placeholder="Enter VNO" value={purchaseFormData.vno} onChange={handlePurchaseInputChange} />
                  </div>
                  <div className="labeled-input"><label>ENTER INVOICE NUMBER *</label>
                    <input type="text" name="invoiceNumber" className="erp-input" placeholder="Enter Invoice Number" value={purchaseFormData.invoiceNumber} onChange={handlePurchaseInputChange} required />
                  </div>
                
<div className="labeled-input narration-field" style={{ gridColumn: 'span 2' }}>
  <label>Narration</label>
  <textarea 
    name="narration" 
    className="erp-textarea" 
    rows="2" 
    style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
    value={invoiceFormData.narration} 
    onChange={handleInvoiceInputChange} 
  />
</div>
                 
                </div>
              </div>

              {/* Product Entry Grid for Purchase */}
              <div className="form-section">
                <h4 className="section-header">Product Entry <button className="btn-secondary ml-auto" onClick={addPurchaseItem}>+ Add Product</button></h4>
                <div className="product-entry-container" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px' }}>
                  <div className="erp-table-container" style={{ minWidth: '1400px' }}>
                    <table className="product-entry-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          <th style={{ position: 'sticky', left: 0, backgroundColor: '#f8fafc', zIndex: 20, minWidth: '50px' }}>SNL NO.</th>
                          <th style={{ minWidth: '180px' }}>PRODUCT NAME</th>
                          {/* <th style={{ minWidth: '100px' }}>BATCH</th> */}
                          <th style={{ minWidth: '100px' }}>UNIT</th>
                          <th style={{ minWidth: '100px' }}>QUANTITY</th>
                          <th style={{ minWidth: '80px' }}>FREE</th>
                          <th style={{ minWidth: '100px' }}>MRP</th>
                          <th style={{ minWidth: '100px' }}>PUR RATE</th>
                          <th style={{ minWidth: '100px' }}>DISC 1</th>
                          <th style={{ minWidth: '100px' }}>DISC 2</th>
                          <th style={{ minWidth: '100px' }}>DISC 3</th>
                          <th style={{ minWidth: '100px' }}>TAXABLE</th>
                          <th style={{ minWidth: '80px' }}>TAX</th>
                          <th style={{ minWidth: '80px' }}>CGST</th>
                          <th style={{ minWidth: '80px' }}>SGST</th>
                          <th style={{ minWidth: '100px' }}>AfterDisc 1</th>
                          <th style={{ minWidth: '100px' }}>AfterDisc 2</th>
                          <th style={{ minWidth: '100px' }}>AfterDisc 3</th>
                          <th style={{ minWidth: '100px' }}>AMOUNT</th>
                          <th style={{ position: 'sticky', right: 0, backgroundColor: '#f8fafc', zIndex: 20, minWidth: '70px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseItems.map((item, index) => (
                          <tr key={item.id} className={index === purchaseActiveRow ? 'active-row' : ''}>
                            <td style={{ position: 'sticky', left: 0, backgroundColor: index === purchaseActiveRow ? '#eff6ff' : 'white', zIndex: 5 }}>{item.sr}</td>
                            <td>
                              <input
                                data-purchase-product-index={index}
                                className="erp-input"
                                placeholder="Click to select product"
                                value={item.product}
                                onChange={(e) => {
                                  updatePurchaseItem(index, 'product', e.target.value);

                                  setPurchaseProductListFilter(e.target.value);
                                  setCurrentPurchaseProductIndex(index);
                                  setShowPurchaseProductList(true);
                                }}
                                //onClick={() => handlePurchaseProductClick(index)}
                                onFocus={() => {
                                  setPurchaseActiveRow(index);

                                  if (item.product) {
                                    setPurchaseProductListFilter(item.product);
                                    setCurrentPurchaseProductIndex(index);
                                    setShowPurchaseProductList(true);
                                  }
                                }}
                                onKeyDown={(e) => handlePurchaseKeyDown(e, index, 'product')}
                                style={{ width: '100%', cursor: 'pointer' }}
                              />
                             {/* {item.selectedBatch && (
  <div
    style={{
      marginTop: '3px',
      fontSize: '10px',
      color: '#2563eb',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }}
  >
    Batch: {item.selectedBatch.batchNo}
    {' | '}
    MRP: ₹{item.selectedBatch.mrp}
    {' | '}
    Exp: {item.selectedBatch.expDate}
  </div>
)} */}
                              {/* Product Selection Dropdown for Purchase */}
                             {showPurchaseProductList &&
 currentPurchaseProductIndex === index && (
                                <div className="product-dropdown-overlay">
                                  <div className="product-dropdown">
                                    {/* <div className="dropdown-header">
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={purchaseProductListFilter}
                        onChange={(e) => setPurchaseProductListFilter(e.target.value)}
                        autoFocus
                      />
                      <button onClick={() => setShowPurchaseProductList(false)}>✕</button>
                    </div> */}
                                    <div className="dropdown-list">
                                      {products
                                        .filter(p => {
                                          const search = purchaseProductListFilter.trim().toLowerCase();

                                          if (!search) return false;

                                          return (
                                            p.name?.toLowerCase().startsWith(search) ||
                                            p.code?.toLowerCase().startsWith(search)
                                          );
                                        })
                                        .slice(0, 10)
                                        .map(product => (
                                          <div
                                            key={product.id}
                                            className="dropdown-item"
                                            onClick={() => handlePurchaseProductSelect(currentPurchaseProductIndex, product)}
                                          >
                                            <strong>{product.code}</strong> - {product.name}
                                          </div>
                                        ))}
                                      {products.length === 0 && (
                                        <div className="dropdown-item no-results">No products found</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </td>
                            {/* <td>

  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      alignItems: 'center'
    }}
  >

    <button
      type="button"
      className="batch-btn"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openBatchModal(index);
      }}
      style={{
        padding: '4px 10px',
        background: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '12px'
      }}
    >
      Batch
    </button>

    {item.batchNo && (
      <span
        style={{
          fontSize: '11px',
          color: '#2563eb',
          fontWeight: '600'
        }}
      >
        {item.batchNo}
      </span>
    )}

  </div>

</td> */}
                            <td>
                              <select
                                data-purchase-field="unitId"
                                data-purchase-index={index}
                                className="erp-select"
                                value={item.unitId}
                                onChange={(e) => updatePurchaseItem(index, 'unitId', e.target.value)}
                                onKeyDown={(e) => handlePurchaseKeyDown(e, index, 'unitId')}
                                style={{ width: '100%' }}
                              >
                                <option value="PCS">PCS</option>
                                <option value="BOX">BOX</option>
                                <option value="INBOX">INBOX</option>
                                <option value="KG">KG</option>
                                <option value="LTR">LTR</option>
                              </select>
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-purchase-field="quantity"
                                data-purchase-index={index}
                                placeholder="Qty"
                                value={item.quantity}
                                onChange={(e) => updatePurchaseItem(index, 'quantity', e.target.value)}
                                onKeyDown={(e) => handlePurchaseKeyDown(e, index, 'quantity')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-purchase-field="free"
                                data-purchase-index={index}
                                placeholder="Free"
                                value={item.free}
                                onChange={(e) => updatePurchaseItem(index, 'free', e.target.value)}
                                onKeyDown={(e) => handlePurchaseKeyDown(e, index, 'free')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-purchase-field="mrp"
                                data-purchase-index={index}
                                placeholder="MRP"
                                value={item.mrp}
                                onChange={(e) => updatePurchaseItem(index, 'mrp', e.target.value)}
                                onKeyDown={(e) => handlePurchaseKeyDown(e, index, 'mrp')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-purchase-field="purRate"
                                data-purchase-index={index}
                                placeholder="Pur Rate"
                                value={item.purRate}
                                onChange={(e) => updatePurchaseItem(index, 'purRate', e.target.value)}
                                onKeyDown={(e) => handlePurchaseKeyDown(e, index, 'purRate')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-purchase-field="disc1"
                                data-purchase-index={index}
                                placeholder="Disc 1 %"
                                value={item.disc1}
                                onChange={(e) => updatePurchaseItem(index, 'disc1', e.target.value)}
                                onKeyDown={(e) => handlePurchaseKeyDown(e, index, 'disc1')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-purchase-field="disc2"
                                data-purchase-index={index}
                                placeholder="Disc 2 %"
                                value={item.disc2}
                                onChange={(e) => updatePurchaseItem(index, 'disc2', e.target.value)}
                                onKeyDown={(e) => handlePurchaseKeyDown(e, index, 'disc2')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-purchase-field="disc3"
                                data-purchase-index={index}
                                placeholder="Disc 3 %"
                                value={item.disc3}
                                onChange={(e) => updatePurchaseItem(index, 'disc3', e.target.value)}
                                onKeyDown={(e) => handlePurchaseKeyDown(e, index, 'disc3')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-purchase-field="taxable"
                                data-purchase-index={index}
                                placeholder="Taxable"
                                value={item.taxable}
                                onChange={(e) => updatePurchaseItem(index, 'taxable', e.target.value)}
                                onKeyDown={(e) => handlePurchaseKeyDown(e, index, 'taxable')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-purchase-field="tax"
                                data-purchase-index={index}
                                placeholder="Tax %"
                                value={item.tax}
                                onChange={(e) => updatePurchaseItem(index, 'tax', e.target.value)}
                                onKeyDown={(e) => handlePurchaseKeyDown(e, index, 'tax')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-purchase-field="cgst"
                                data-purchase-index={index}
                                placeholder="CGST"
                                value={item.cgst}
                                onChange={(e) => updatePurchaseItem(index, 'cgst', e.target.value)}
                                onKeyDown={(e) => handlePurchaseKeyDown(e, index, 'cgst')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-purchase-field="sgst"
                                data-purchase-index={index}
                                placeholder="SGST"
                                value={item.sgst}
                                onChange={(e) => updatePurchaseItem(index, 'sgst', e.target.value)}
                                onKeyDown={(e) => handlePurchaseKeyDown(e, index, 'sgst')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-purchase-field="afterDisc1"
                                data-purchase-index={index}
                                placeholder="After Disc 1"
                                value={item.afterDisc1}
                                onChange={(e) => updatePurchaseItem(index, 'afterDisc1', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-purchase-field="afterDisc2"
                                data-purchase-index={index}
                                placeholder="After Disc 2"
                                value={item.afterDisc2}
                                onChange={(e) => updatePurchaseItem(index, 'afterDisc2', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-purchase-field="afterDisc3"
                                data-purchase-index={index}
                                placeholder="After Disc 3"
                                value={item.afterDisc3}
                                onChange={(e) => updatePurchaseItem(index, 'afterDisc3', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric font-bold"
                                type="number"
                                data-purchase-field="amount"
                                data-purchase-index={index}
                                placeholder="Amount"
                                value={item.amount}
                                onChange={(e) => updatePurchaseItem(index, 'amount', e.target.value)}
                                style={{ width: '100%', fontWeight: 'bold' }}
                              />
                            </td>
                            <td style={{ position: 'sticky', right: 0, backgroundColor: index === purchaseActiveRow ? '#eff6ff' : 'white', zIndex: 5 }}>
                              <button className="btn-delete" onClick={() => deletePurchaseItem(index)}>🗑 Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Purchase Summary Section */}
              <div className="form-section">
                <h4 className="section-header">Invoice Summary</h4>
                <div className="summary-bar">
                  <div>MRP Total: <span className="amount">₹{purchaseFormData.mrpTotal || '0.00'}</span></div>
                  <div>TCS %: <span className="amount">{purchaseFormData.tcbPercent || '0.00'}%</span></div>
                  <div>TCS Amount: <span className="amount">-₹{purchaseFormData.tcbAmount || '0.00'}</span></div>
                  <div>DISC1: <span className="amount">-₹{purchaseFormData.diBc1 || '0.00'}</span></div>
                  <div>After DISC1: <span className="amount">₹{purchaseFormData.afterDiBc1 || '0.00'}</span></div>
                  <div>Gross Amount: <span className="amount">₹{purchaseFormData.groBsAmt || '0.00'}</span></div>
                  <div>DISC2: <span className="amount">-₹{purchaseFormData.diBc2 || '0.00'}</span></div>
                  <div>After DISC2: <span className="amount">₹{purchaseFormData.afterDiBc2 || '0.00'}</span></div>
                  <div>GST Amount: <span className="amount">+₹{purchaseFormData.qbtAmt || '0.00'}</span></div>
                  <div>DISC3: <span className="amount">-₹{purchaseFormData.diBc3 || '0.00'}</span></div>
                  <div>After DISC3: <span className="amount">₹{purchaseFormData.afterDiBc3 || '0.00'}</span></div>
                  <div>Rounding: <span className="amount">₹{purchaseFormData.rounding || '0.00'}</span></div>
                  <div className="net-amount">Net Amount: <strong>₹{purchaseFormData.netAmt || '0.00'}</strong></div>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-add-invoice" onClick={savePurchase}>
                  💾 Add Invoice
                </button>
              </div>
            </div>
          )}

          {/* Credit Note Form */}
          {activeSubMenu === 'Credit Note' && (
            <div className="master-section erp-master-form credit-note">
              <div className="erp-header">
                <div>
                  <h2 className="erp-title">Credit Note</h2>
                </div>
              </div>

              {/* Product Selection Dropdown for Credit Note */}
              {showCreditProductList && currentCreditProductIndex >= 0 && (
                <div className="product-dropdown-overlay">
                  <div className="product-dropdown">
                    <div className="dropdown-header">
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={creditProductListFilter}
                        onChange={(e) => setCreditProductListFilter(e.target.value)}
                        autoFocus
                      />
                      <button onClick={() => setShowCreditProductList(false)}>✕</button>
                    </div>
                    <div className="dropdown-list">
                      {products
                        .filter(p =>
                          p.name.toLowerCase().includes(creditProductListFilter.toLowerCase()) ||
                          p.code.toLowerCase().includes(creditProductListFilter.toLowerCase())
                        )
                        .map(product => (
                          <div
                            key={product.id}
                            className="dropdown-item"
                            onClick={() => handleCreditProductSelect(currentCreditProductIndex, product)}
                          >
                            <strong>{product.code}</strong> - {product.name}
                          </div>
                        ))}
                      {products.length === 0 && (
                        <div className="dropdown-item no-results">No products found</div>
                      )}
                    </div>
                  </div>
                </div>

              )}

              {/* Batch Modal for Purchase */}
              {showBatchModal && (
                <div className="batch-modal-overlay" style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'white',
                  padding: '20px',
                  border: '2px solid black',
                  zIndex: 999999
                }}>

                  <div
                    className="batch-modal"
                    style={{
                      width: '700px',
                      background: 'white',
                      padding: '20px',
                      borderRadius: '10px',
                      maxHeight: '90vh',
                      overflowY: 'auto'
                    }}
                  >
                    <div className="batch-header">

                      <h3>Batch Details</h3>

                      <button
                        onClick={() => setShowBatchModal(false)}
                      >
                        ✕
                      </button>

                    </div>

                    <div
                      className="batch-form-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '15px'
                      }}
                    >

                      <input
                        type="text"
                        placeholder="Batch No"
                        value={batchForm.batchNo}
                        onChange={(e) =>
                          setBatchForm({
                            ...batchForm,
                            batchNo: e.target.value
                          })
                        }
                      />

                      <input
                        type="date"
                        value={batchForm.mfgDate}
                        onChange={(e) =>
                          setBatchForm({
                            ...batchForm,
                            mfgDate: e.target.value
                          })
                        }
                      />

                      <input
                        type="date"
                        value={batchForm.expDate}
                        onChange={(e) =>
                          setBatchForm({
                            ...batchForm,
                            expDate: e.target.value
                          })
                        }
                      />

                      <input
                        type="number"
                        placeholder="MRP"
                        value={batchForm.mrp}
                        onChange={(e) =>
                          setBatchForm({
                            ...batchForm,
                            mrp: e.target.value
                          })
                        }
                      />

                    </div>
                    {batchMode === 'new' && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          marginTop: '20px',
                          gap: '10px'
                        }}
                      >

                        <button
                          type="button"
                          onClick={() => setShowBatchModal(false)}
                          style={{
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={saveBatchDetails}
                          style={{
                            padding: '8px 16px',
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          Save Batch
                        </button>

                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* Credit Note Header */}
              <div className="form-section">
                <h4 className="section-header">Credit Note Information</h4>
                <div className="invoice-header-grid">
                  <div className="labeled-input"><label>VDate *</label><input type="date" name="vDate" className="erp-input" value={creditNoteFormData.vDate} onChange={handleCreditNoteInputChange} /></div>
                  <div className="labeled-input"><label>VNo.</label><input name="vNo" className="erp-input" placeholder="VNo." value={creditNoteFormData.vNo} onChange={handleCreditNoteInputChange} /></div>
                  <div className="labeled-input"><label>Party *</label>
                    <select name="party" className="erp-select" value={creditNoteFormData.party} onChange={handleCreditNoteInputChange}>
                      <option value="">Select Party</option>
                      {accounts.map(a => <option key={a.id} value={a.accountName}>{a.accountName}</option>)}
                    </select>
                  </div>
                  <div className="labeled-input"><label>Godown</label>
                    <select name="godown" className="erp-select" value={creditNoteFormData.godown} onChange={handleCreditNoteInputChange}>
                      <option value="">Select Godown</option>
                      {godowns.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="labeled-input"><label>Salesman</label>
                    <select name="salesman" className="erp-select" value={creditNoteFormData.salesman} onChange={handleCreditNoteInputChange}>
                      <option value="">Select Salesman</option>
                      {salesmen.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="labeled-input"><label>TIN No.</label><input name="tinNo" className="erp-input" placeholder="TIN No." value={creditNoteFormData.tinNo} onChange={handleCreditNoteInputChange} /></div>
                  <div className="labeled-input"><label>Company</label>
                    <select name="company" className="erp-select" value={creditNoteFormData.company} onChange={handleCreditNoteInputChange}>
                      <option value="">Select Company</option>
                      {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="labeled-input narration-field"><label>Narr</label><textarea name="narr" className="erp-textarea" rows="2" placeholder="Narration" value={creditNoteFormData.narr} onChange={handleCreditNoteInputChange} /></div>
                  <div className="labeled-input"><label>BillSeries</label><input name="billSeries" className="erp-input" placeholder="Bill Series" value={creditNoteFormData.billSeries} onChange={handleCreditNoteInputChange} /></div>
                  <div className="labeled-input"><label>BillNo</label><input name="billNo" className="erp-input" placeholder="Bill No" value={creditNoteFormData.billNo} onChange={handleCreditNoteInputChange} /></div>
                  <div className="labeled-input"><label>Full</label><input name="full" className="erp-input" placeholder="Full" value={creditNoteFormData.full} onChange={handleCreditNoteInputChange} /></div>
                  <div className="labeled-input"><label>RefNo</label><input name="refNo" className="erp-input" placeholder="Ref No" value={creditNoteFormData.refNo} onChange={handleCreditNoteInputChange} /></div>
                  <div className="labeled-input"><label>RefDate</label><input type="date" name="refDate" className="erp-input" value={creditNoteFormData.refDate} onChange={handleCreditNoteInputChange} /></div>
                </div>
              </div>

              {/* Product Entry Grid for Credit Note */}
              <div className="form-section">
                <h4 className="section-header">Product Entry <button className="btn-secondary ml-auto" onClick={addCreditNoteItem}>+ Add Product</button></h4>
                <div className="product-entry-container" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px' }}>
                  <div className="erp-table-container" style={{ minWidth: '2500px' }}>
                    <table className="product-entry-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          <th style={{ position: 'sticky', left: 0, backgroundColor: '#f8fafc', zIndex: 20, minWidth: '50px' }}>SrNi</th>
                          <th style={{ minWidth: '80px' }}>Trn</th>
                          <th style={{ minWidth: '120px' }}>Item Code</th>
                          <th style={{ minWidth: '180px' }}>Item Name</th>
                          <th style={{ minWidth: '80px' }}>Unit</th>
                          <th style={{ minWidth: '100px' }}>Qty</th>
                          <th style={{ minWidth: '80px' }}>Free</th>
                          <th style={{ minWidth: '100px' }}>Rate</th>
                          <th style={{ minWidth: '120px' }}>Gross Amt</th>
                          <th style={{ minWidth: '100px' }}>Sch %</th>
                          <th style={{ minWidth: '120px' }}>Sch Amt</th>
                          <th style={{ minWidth: '100px' }}>CD %</th>
                          <th style={{ minWidth: '120px' }}>CD Amt</th>
                          <th style={{ minWidth: '100px' }}>TPR %</th>
                          <th style={{ minWidth: '120px' }}>TPR Amt</th>
                          <th style={{ minWidth: '100px' }}>Star %</th>
                          <th style={{ minWidth: '120px' }}>Taxable</th>
                          <th style={{ minWidth: '100px' }}>GST %</th>
                          <th style={{ minWidth: '120px' }}>GST Amt</th>
                          <th style={{ minWidth: '100px' }}>AVDisc1</th>
                          <th style={{ minWidth: '100px' }}>AVDisc2</th>
                          <th style={{ minWidth: '100px' }}>AREACODE</th>
                          <th style={{ minWidth: '80px' }}>CGST</th>
                          <th style={{ minWidth: '80px' }}>SGST</th>
                          <th style={{ minWidth: '80px' }}>IGST</th>
                          <th style={{ minWidth: '100px' }}>Cess%</th>
                          <th style={{ minWidth: '120px' }}>CessAmt</th>
                          <th style={{ minWidth: '120px' }}>CessPerPI</th>
                          <th style={{ minWidth: '100px' }}>Sec.Cessi</th>
                          <th style={{ minWidth: '100px' }}>CrateSize</th>
                          <th style={{ minWidth: '100px' }}>CrateQty</th>
                          <th style={{ minWidth: '120px' }}>CrateSysProc</th>
                          <th style={{ position: 'sticky', right: 0, backgroundColor: '#f8fafc', zIndex: 20, minWidth: '70px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creditNoteItems.map((item, index) => (
                          <tr key={item.id} className={index === creditNoteActiveRow ? 'active-row' : ''}>
                            <td style={{ position: 'sticky', left: 0, backgroundColor: index === creditNoteActiveRow ? '#eff6ff' : 'white', zIndex: 5 }}>{item.sr}</td>
                            <td>
                              <select
                                className="erp-select"
                                data-credit-field="trn"
                                data-credit-index={index}
                                value={item.trn}
                                onChange={(e) => updateCreditNoteItem(index, 'trn', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown(e, index, 'trn')}
                                style={{ width: '100%' }}
                              >
                                <option value="GDR">GDR</option>
                                <option value="DGR">DGR</option>
                              </select>
                            </td>
                            <td>
                              <input
                                className="erp-input"
                                data-credit-field="itemCode"
                                data-credit-index={index}
                                value={item.itemCode}
                                onChange={(e) => updateCreditNoteItem(index, 'itemCode', e.target.value)}
                                onClick={() => handleCreditProductClick(index)}
                                onKeyDown={(e) => handleCreditNoteKeyDown(e, index, 'itemCode')}
                                style={{ width: '100%', cursor: 'pointer' }}
                                placeholder="Click to select"
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input"
                                data-credit-field="itemName"
                                data-credit-index={index}
                                value={item.itemName}
                                onChange={(e) => updateCreditNoteItem(index, 'itemName', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown(e, index, 'itemName')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <select
                                className="erp-select"
                                data-credit-field="unit"
                                data-credit-index={index}
                                value={item.unit}
                                onChange={(e) => updateCreditNoteItem(index, 'unit', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown(e, index, 'unit')}
                                style={{ width: '100%' }}
                              >
                                <option value="PCS">PCS</option>
                                <option value="BOX">BOX</option>
                                <option value="INBOX">INBOX</option>
                                <option value="KG">KG</option>
                                <option value="LTR">LTR</option>
                              </select>
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="qty"
                                data-credit-index={index}
                                value={item.qty}
                                onChange={(e) => updateCreditNoteItem(index, 'qty', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown(e, index, 'qty')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="free"
                                data-credit-index={index}
                                value={item.free}
                                onChange={(e) => updateCreditNoteItem(index, 'free', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown(e, index, 'free')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="rate"
                                data-credit-index={index}
                                value={item.rate}
                                onChange={(e) => updateCreditNoteItem(index, 'rate', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown(e, index, 'rate')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="grossAmt"
                                data-credit-index={index}
                                value={item.grossAmt}
                                onChange={(e) => updateCreditNoteItem(index, 'grossAmt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                data-credit-field="schPercent"
                                data-credit-index={index}
                                value={item.schPercent}
                                onChange={(e) => updateCreditNoteItem(index, 'schPercent', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown(e, index, 'schPercent')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="schAmt"
                                data-credit-index={index}
                                value={item.schAmt}
                                onChange={(e) => updateCreditNoteItem(index, 'schAmt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <tr>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                data-credit-field="cdPercent"
                                data-credit-index={index}
                                value={item.cdPercent}
                                onChange={(e) => updateCreditNoteItem(index, 'cdPercent', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown(e, index, 'cdPercent')}
                                style={{ width: '100%' }}
                              />
                            </tr>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="cdAmt"
                                data-credit-index={index}
                                value={item.cdAmt}
                                onChange={(e) => updateCreditNoteItem(index, 'cdAmt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <tr>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                data-credit-field="tprPercent"
                                data-credit-index={index}
                                value={item.tprPercent}
                                onChange={(e) => updateCreditNoteItem(index, 'tprPercent', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown(e, index, 'tprPercent')}
                                style={{ width: '100%' }}
                              />
                            </tr>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="tprAmt"
                                data-credit-index={index}
                                value={item.tprAmt}
                                onChange={(e) => updateCreditNoteItem(index, 'tprAmt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                data-credit-field="starPercent"
                                data-credit-index={index}
                                value={item.starPercent}
                                onChange={(e) => updateCreditNoteItem(index, 'starPercent', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown(e, index, 'starPercent')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="taxable"
                                data-credit-index={index}
                                value={item.taxable}
                                onChange={(e) => updateCreditNoteItem(index, 'taxable', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                data-credit-field="gstPercent"
                                data-credit-index={index}
                                value={item.gstPercent}
                                onChange={(e) => updateCreditNoteItem(index, 'gstPercent', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown(e, index, 'gstPercent')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="gstAmt"
                                data-credit-index={index}
                                value={item.gstAmt}
                                onChange={(e) => updateCreditNoteItem(index, 'gstAmt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="avDisc1"
                                data-credit-index={index}
                                value={item.avDisc1}
                                onChange={(e) => updateCreditNoteItem(index, 'avDisc1', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="avDisc2"
                                data-credit-index={index}
                                value={item.avDisc2}
                                onChange={(e) => updateCreditNoteItem(index, 'avDisc2', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input"
                                data-credit-field="areaCode"
                                data-credit-index={index}
                                value={item.areaCode}
                                onChange={(e) => updateCreditNoteItem(index, 'areaCode', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="cgst"
                                data-credit-index={index}
                                value={item.cgst}
                                onChange={(e) => updateCreditNoteItem(index, 'cgst', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="sgst"
                                data-credit-index={index}
                                value={item.sgst}
                                onChange={(e) => updateCreditNoteItem(index, 'sgst', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="igst"
                                data-credit-index={index}
                                value={item.igst}
                                onChange={(e) => updateCreditNoteItem(index, 'igst', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                data-credit-field="cessPercent"
                                data-credit-index={index}
                                value={item.cessPercent}
                                onChange={(e) => updateCreditNoteItem(index, 'cessPercent', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="cessAmt"
                                data-credit-index={index}
                                value={item.cessAmt}
                                onChange={(e) => updateCreditNoteItem(index, 'cessAmt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="cessPerPi"
                                data-credit-index={index}
                                value={item.cessPerPi}
                                onChange={(e) => updateCreditNoteItem(index, 'cessPerPi', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="secCessi"
                                data-credit-index={index}
                                value={item.secCessi}
                                onChange={(e) => updateCreditNoteItem(index, 'secCessi', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="crateSize"
                                data-credit-index={index}
                                value={item.crateSize}
                                onChange={(e) => updateCreditNoteItem(index, 'crateSize', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-credit-field="crateQty"
                                data-credit-index={index}
                                value={item.crateQty}
                                onChange={(e) => updateCreditNoteItem(index, 'crateQty', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                data-credit-field="crateSysProc"
                                data-credit-index={index}
                                value={item.crateSysProc}
                                onChange={(e) => updateCreditNoteItem(index, 'crateSysProc', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td style={{ position: 'sticky', right: 0, backgroundColor: index === creditNoteActiveRow ? '#eff6ff' : 'white', zIndex: 5 }}>
                              <button className="btn-delete" onClick={() => deleteCreditNoteItem(index)}>🗑 Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Credit Note Summary */}
              <div className="form-section">
                <h4 className="section-header">Summary</h4>
                <div className="summary-bar">
                  <div>Gross Amt: <span className="amount">₹{creditNoteSummary.grossAmt.toFixed(2)}</span></div>
                  <div>Scheme Amt: <span className="amount">-₹{creditNoteSummary.schemeAmt.toFixed(2)}</span></div>
                  <div>TPR Amt: <span className="amount">-₹{creditNoteSummary.tprAmt.toFixed(2)}</span></div>
                  <div>Cash Disc: <span className="amount">-₹{creditNoteSummary.cashDisc.toFixed(2)}</span></div>
                  <div>GST Amt: <span className="amount">+₹{creditNoteSummary.gstAmt.toFixed(2)}</span></div>
                  <div>STAR Amt: <span className="amount">₹{creditNoteSummary.starAmt.toFixed(2)}</span></div>
                  <div>AddLess: <span className="amount">₹{creditNoteSummary.addLess}</span></div>
                  <div>Display: <span className="amount">₹{creditNoteSummary.display}</span></div>
                  <div>Coupon: <span className="amount">₹{creditNoteSummary.coupon}</span></div>
                  <div>Rounding: <span className="amount">₹{creditNoteSummary.rounding}</span></div>
                  <div>Cess Amt: <span className="amount">₹{creditNoteSummary.cessAmt.toFixed(2)}</span></div>
                  <div className="tcs-field">TCS %: <input className="erp-input small" placeholder="0" value={creditNoteSummary.tcsPercent} onChange={(e) => setCreditNoteSummary({ ...creditNoteSummary, tcsPercent: e.target.value })} /> TCS Amt: ₹{creditNoteSummary.tcsAmt}</div>
                  <div>Bill Bal. Amt: <span className="amount">₹{creditNoteSummary.billBalAmt}</span></div>
                  <div className="net-amount">Net Amt: <strong>₹{creditNoteSummary.netAmt}</strong></div>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-add-invoice" onClick={saveCreditNote}>
                  💾 Save Credit Note
                </button>
              </div>
            </div>
          )}

          {/* Debit Note Form */}
          {activeSubMenu === 'Debit Note' && (
            <div className="master-section erp-master-form debit-note">
              <div className="erp-header">
                <div>
                  <h2 className="erp-title">Debit Note</h2>
                </div>
              </div>

              {/* Product Selection Dropdown for Debit Note */}
              {showDebitProductList && currentDebitProductIndex >= 0 && (
                <div className="product-dropdown-overlay">
                  <div className="product-dropdown">
                    <div className="dropdown-header">
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={debitProductListFilter}
                        onChange={(e) => setDebitProductListFilter(e.target.value)}
                        autoFocus
                      />
                      <button onClick={() => setShowDebitProductList(false)}>✕</button>
                    </div>
                    <div className="dropdown-list">
                      {products
                        .filter(p =>
                          p.name.toLowerCase().includes(debitProductListFilter.toLowerCase()) ||
                          p.code.toLowerCase().includes(debitProductListFilter.toLowerCase())
                        )
                        .map(product => (
                          <div
                            key={product.id}
                            className="dropdown-item"
                            onClick={() => handleDebitProductSelect(currentDebitProductIndex, product)}
                          >
                            <strong>{product.code}</strong> - {product.name}
                          </div>
                        ))}
                      {products.length === 0 && (
                        <div className="dropdown-item no-results">No products found</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Debit Note Header */}
              <div className="form-section">
                <h4 className="section-header">Debit Note Information</h4>
                <div className="invoice-header-grid">
                  <div className="labeled-input"><label>VDate *</label><input type="date" name="vDate" className="erp-input" value={debitNoteFormData.vDate} onChange={handleDebitNoteInputChange} /></div>
                  <div className="labeled-input"><label>VNo.</label><input name="vNo" className="erp-input" placeholder="VNo." value={debitNoteFormData.vNo} onChange={handleDebitNoteInputChange} /></div>
                  <div className="labeled-input"><label>Godown</label>
                    <select name="godown" className="erp-select" value={debitNoteFormData.godown} onChange={handleDebitNoteInputChange}>
                      <option value="">Select Godown</option>
                      {godowns.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="labeled-input"><label>Company</label>
                    <select name="company" className="erp-select" value={debitNoteFormData.company} onChange={handleDebitNoteInputChange}>
                      <option value="">Select Company</option>
                      {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="labeled-input narration-field"><label>Narr</label><textarea name="narr" className="erp-textarea" rows="2" placeholder="Narration" value={debitNoteFormData.narr} onChange={handleDebitNoteInputChange} /></div>
                  <div className="labeled-input"><label>Supplier</label>
                    <select name="supplier" className="erp-select" value={debitNoteFormData.supplier} onChange={handleDebitNoteInputChange}>
                      <option value="">Select Supplier</option>
                      {accounts.map(a => <option key={a.id} value={a.accountName}>{a.accountName}</option>)}
                    </select>
                  </div>
                  <div className="labeled-input"><label>IGST.</label>
                    <select name="igst" className="erp-select" value={debitNoteFormData.igst} onChange={handleDebitNoteInputChange}>
                      <option value="N">N</option>
                      <option value="Y">Y</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Product Entry Grid for Debit Note */}
              <div className="form-section">
                <h4 className="section-header">Product Entry <button className="btn-secondary ml-auto" onClick={addDebitNoteItem}>+ Add Product</button></h4>
                <div className="product-entry-container" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px' }}>
                  <div className="erp-table-container" style={{ minWidth: '1800px' }}>
                    <table className="product-entry-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          <th style={{ position: 'sticky', left: 0, backgroundColor: '#f8fafc', zIndex: 20, minWidth: '50px' }}>SrNi</th>
                          <th style={{ minWidth: '80px' }}>Trn</th>
                          <th style={{ minWidth: '120px' }}>Item Code</th>
                          <th style={{ minWidth: '180px' }}>Item Name</th>
                          <th style={{ minWidth: '80px' }}>Unit</th>
                          <th style={{ minWidth: '100px' }}>Qty</th>
                          <th style={{ minWidth: '80px' }}>Free</th>
                          <th style={{ minWidth: '100px' }}>Rate</th>
                          <th style={{ minWidth: '120px' }}>Gross Amt</th>
                          <th style={{ minWidth: '100px' }}>BVDisc1</th>
                          <th style={{ minWidth: '100px' }}>BVDisc2</th>
                          <th style={{ minWidth: '100px' }}>BVAadd1</th>
                          <th style={{ minWidth: '100px' }}>BVAadd2</th>
                          <th style={{ minWidth: '120px' }}>Taxable</th>
                          <th style={{ minWidth: '100px' }}>GST %</th>
                          <th style={{ minWidth: '120px' }}>GST Art</th>
                          <th style={{ minWidth: '100px' }}>AVDisc1</th>
                          <th style={{ minWidth: '100px' }}>AVDisc2</th>
                          <th style={{ minWidth: '80px' }}>CGST</th>
                          <th style={{ minWidth: '80px' }}>SGST</th>
                          <th style={{ minWidth: '80px' }}>IGST</th>
                          <th style={{ minWidth: '100px' }}>Cess%</th>
                          <th style={{ minWidth: '120px' }}>CessAmt</th>
                          <th style={{ minWidth: '120px' }}>CessPerP</th>
                          <th style={{ position: 'sticky', right: 0, backgroundColor: '#f8fafc', zIndex: 20, minWidth: '70px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debitNoteItems.map((item, index) => (
                          <tr key={item.id} className={index === debitNoteActiveRow ? 'active-row' : ''}>
                            <td style={{ position: 'sticky', left: 0, backgroundColor: index === debitNoteActiveRow ? '#eff6ff' : 'white', zIndex: 5 }}>{item.sr}</td>
                            <td>
                              <select
                                className="erp-select"
                                data-debit-field="trn"
                                data-debit-index={index}
                                value={item.trn}
                                onChange={(e) => updateDebitNoteItem(index, 'trn', e.target.value)}
                                onKeyDown={(e) => handleDebitNoteKeyDown(e, index, 'trn')}
                                style={{ width: '100%' }}
                              >
                                <option value="DGR">DGR</option>
                                <option value="GDR">GDR</option>
                              </select>
                            </td>
                            <td>
                              <input
                                className="erp-input"
                                data-debit-field="itemCode"
                                data-debit-index={index}
                                value={item.itemCode}
                                onChange={(e) => updateDebitNoteItem(index, 'itemCode', e.target.value)}
                                onClick={() => handleDebitProductClick(index)}
                                onKeyDown={(e) => handleDebitNoteKeyDown(e, index, 'itemCode')}
                                style={{ width: '100%', cursor: 'pointer' }}
                                placeholder="Click to select"
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input"
                                data-debit-field="itemName"
                                data-debit-index={index}
                                value={item.itemName}
                                onChange={(e) => updateDebitNoteItem(index, 'itemName', e.target.value)}
                                onKeyDown={(e) => handleDebitNoteKeyDown(e, index, 'itemName')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <select
                                className="erp-select"
                                data-debit-field="unit"
                                data-debit-index={index}
                                value={item.unit}
                                onChange={(e) => updateDebitNoteItem(index, 'unit', e.target.value)}
                                onKeyDown={(e) => handleDebitNoteKeyDown(e, index, 'unit')}
                                style={{ width: '100%' }}
                              >
                                <option value="PCS">PCS</option>
                                <option value="BOX">BOX</option>
                                <option value="INBOX">INBOX</option>
                                <option value="KG">KG</option>
                                <option value="LTR">LTR</option>
                              </select>
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-debit-field="qty"
                                data-debit-index={index}
                                value={item.qty}
                                onChange={(e) => updateDebitNoteItem(index, 'qty', e.target.value)}
                                onKeyDown={(e) => handleDebitNoteKeyDown(e, index, 'qty')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-debit-field="free"
                                data-debit-index={index}
                                value={item.free}
                                onChange={(e) => updateDebitNoteItem(index, 'free', e.target.value)}
                                onKeyDown={(e) => handleDebitNoteKeyDown(e, index, 'free')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-debit-field="rate"
                                data-debit-index={index}
                                value={item.rate}
                                onChange={(e) => updateDebitNoteItem(index, 'rate', e.target.value)}
                                onKeyDown={(e) => handleDebitNoteKeyDown(e, index, 'rate')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-debit-field="grossAmt"
                                data-debit-index={index}
                                value={item.grossAmt}
                                onChange={(e) => updateDebitNoteItem(index, 'grossAmt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <tr>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                data-debit-field="bvDisc1"
                                data-debit-index={index}
                                value={item.bvDisc1}
                                onChange={(e) => updateDebitNoteItem(index, 'bvDisc1', e.target.value)}
                                onKeyDown={(e) => handleDebitNoteKeyDown(e, index, 'bvDisc1')}
                                style={{ width: '100%' }}
                              />
                            </tr>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                data-debit-field="bvDisc2"
                                data-debit-index={index}
                                value={item.bvDisc2}
                                onChange={(e) => updateDebitNoteItem(index, 'bvDisc2', e.target.value)}
                                onKeyDown={(e) => handleDebitNoteKeyDown(e, index, 'bvDisc2')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                data-debit-field="bvAdd1"
                                data-debit-index={index}
                                value={item.bvAdd1}
                                onChange={(e) => updateDebitNoteItem(index, 'bvAdd1', e.target.value)}
                                onKeyDown={(e) => handleDebitNoteKeyDown(e, index, 'bvAdd1')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                data-debit-field="bvAdd2"
                                data-debit-index={index}
                                value={item.bvAdd2}
                                onChange={(e) => updateDebitNoteItem(index, 'bvAdd2', e.target.value)}
                                onKeyDown={(e) => handleDebitNoteKeyDown(e, index, 'bvAdd2')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-debit-field="taxable"
                                data-debit-index={index}
                                value={item.taxable}
                                onChange={(e) => updateDebitNoteItem(index, 'taxable', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                data-debit-field="gstPercent"
                                data-debit-index={index}
                                value={item.gstPercent}
                                onChange={(e) => updateDebitNoteItem(index, 'gstPercent', e.target.value)}
                                onKeyDown={(e) => handleDebitNoteKeyDown(e, index, 'gstPercent')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-debit-field="gstArt"
                                data-debit-index={index}
                                value={item.gstArt}
                                onChange={(e) => updateDebitNoteItem(index, 'gstArt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <tr>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-debit-field="avDisc1"
                                data-debit-index={index}
                                value={item.avDisc1}
                                onChange={(e) => updateDebitNoteItem(index, 'avDisc1', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </tr>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-debit-field="avDisc2"
                                data-debit-index={index}
                                value={item.avDisc2}
                                onChange={(e) => updateDebitNoteItem(index, 'avDisc2', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-debit-field="cgst"
                                data-debit-index={index}
                                value={item.cgst}
                                onChange={(e) => updateDebitNoteItem(index, 'cgst', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-debit-field="sgst"
                                data-debit-index={index}
                                value={item.sgst}
                                onChange={(e) => updateDebitNoteItem(index, 'sgst', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-debit-field="igst"
                                data-debit-index={index}
                                value={item.igst}
                                onChange={(e) => updateDebitNoteItem(index, 'igst', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                data-debit-field="cessPercent"
                                data-debit-index={index}
                                value={item.cessPercent}
                                onChange={(e) => updateDebitNoteItem(index, 'cessPercent', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-debit-field="cessAmt"
                                data-debit-index={index}
                                value={item.cessAmt}
                                onChange={(e) => updateDebitNoteItem(index, 'cessAmt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-debit-field="cessPerP"
                                data-debit-index={index}
                                value={item.cessPerP}
                                onChange={(e) => updateDebitNoteItem(index, 'cessPerP', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td style={{ position: 'sticky', right: 0, backgroundColor: index === debitNoteActiveRow ? '#eff6ff' : 'white', zIndex: 5 }}>
                              <button className="btn-delete" onClick={() => deleteDebitNoteItem(index)}>🗑 Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Debit Note Summary */}
              <div className="form-section">
                <h4 className="section-header">Summary</h4>
                <div className="summary-bar">
                  <div>Gross Amt: <span className="amount">₹{debitNoteSummary.grossAmt.toFixed(2)}</span></div>
                  <div>GST Amt: <span className="amount">+₹{debitNoteSummary.gstAmt.toFixed(2)}</span></div>
                  <div className="tcs-field">TCS %: <input className="erp-input small" placeholder="0" value={debitNoteSummary.tcsPercent} onChange={(e) => setDebitNoteSummary({ ...debitNoteSummary, tcsPercent: e.target.value })} /> TCS Amt: ₹{debitNoteSummary.tcsAmt}</div>
                  <div>Before Vat Disc Amt: <span className="amount">₹{debitNoteSummary.beforeVatDiscAmt.toFixed(2)}</span></div>
                  <div>Surcharge: <span className="amount">₹{debitNoteSummary.surcharge}</span></div>
                  <div>Rounding: <span className="amount">₹{debitNoteSummary.rounding}</span></div>
                  <div>Before Vat Add Amt: <span className="amount">₹{debitNoteSummary.beforeVatAddAmt}</span></div>
                  <div>After Vat Disc Amt: <span className="amount">₹{debitNoteSummary.afterVatDiscAmt.toFixed(2)}</span></div>
                  <div className="net-amount">Net Amt: <strong>₹{debitNoteSummary.netAmt}</strong></div>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-add-invoice" onClick={saveDebitNote}>
                  💾 Save Debit Note
                </button>
              </div>
            </div>
          )}

          {/* Area To Party Mapping UI */}
          {activeSubMenu === 'Area To Party' && (
            <div className="master-section">
              <div className="page-title-large">Area to Party Mapping</div>

              <div className="form-row mb-4">
                <label className="form-label">Select Company:</label>
                <select className="form-select" value={areaToPartyCompany?.id || ''} onChange={(e) => handleAreaToPartyCompanySelect(companies.find(c => c.id == e.target.value))}>
                  <option value="">--- Select Company ---</option>
                  {companies.map(company => (<option key={company.id} value={company.id}>{company.code} - {company.name}</option>))}
                </select>
              </div>

              {areaToPartyCompany && areaToPartyData.length > 0 && (
                <>
                  <div className="grid-header">
                    <h3>Mapping for {areaToPartyCompany.code} - {areaToPartyCompany.name} ({areaToPartyData.length} accounts)</h3>
                    <div className="form-actions"><button className="btn-save" onClick={saveAreaToPartyMapping}>💾 Save Mapping</button><button className="btn-cancel" onClick={resetAreaToPartyMapping}>🔄 Reset</button></div>
                  </div>
                  <div className="data-table-container">
                    <table className="data-table">
                      <thead><tr><th style={{ width: '20%' }}>Account Code</th><th style={{ width: '40%' }}>Account Name</th><th style={{ width: '25%' }}>Area Name</th><th style={{ width: '15%' }}>Status</th></tr></thead>
                      <tbody>
                        {areaToPartyData.map((row, rowIndex) => (
                          <tr key={row.id} className={areaToPartyEditingRow === rowIndex ? 'editing-row' : ''}>
                            <td data-label="Account Code">{row.accountCode}</td>
                            <td data-label="Account Name">{row.accountName}</td>
                            <td data-atp-cell={`areaName_${rowIndex}`} data-label="Area Name" className={`editable-cell ${areaToPartyEditingCell === `areaName_${rowIndex}` ? 'editing' : ''}`} onClick={() => handleAreaToPartyCellClick(rowIndex, 'areaName')} tabIndex={0} onKeyDown={(e) => handleAreaToPartyKeyDown(e, rowIndex, 'areaName')}>
                              {row.areaName ? row.areaName : <span className="placeholder" style={{ color: '#999', fontStyle: 'italic' }}>Click to select area...</span>}
                              {showAreaToPartyDropdown && areaToPartyEditingRow === rowIndex && (<div className="dropdown-overlay"><div className="dropdown-filter"><input type="text" placeholder="Search Area..." value={areaToPartyFilter} onChange={handleAreaToPartyFilterChange} autoFocus /></div><div className="dropdown-list">{filteredAreasForPartyMapping.length > 0 ? filteredAreasForPartyMapping.map(area => (<div key={area.id} className="dropdown-item" onClick={() => handleAreaToPartySelect(rowIndex, area)}><strong>{area.code}</strong> - {area.name}</div>)) : <div className="dropdown-item no-results">No areas found</div>}</div></div>)}
                            </td>
                            <td data-label="Status"><span className={`status-badge ${row.areaName ? 'complete' : 'pending'}`}>{row.areaName ? '✅ Complete' : '⏳ Pending'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mapping-stats mt-4"><div className="stat"><strong>Progress:</strong> <span className="progress-count">{areaToPartyData.filter(row => row.areaName).length}/{areaToPartyData.length} accounts mapped</span></div></div>
                </>
              )}
              {!areaToPartyCompany && (<div className="empty-state"><div className="empty-icon">🔗</div><h4>Select a company to start mapping</h4><p>Add companies in Company Master first, then select one above to map areas to parties.</p></div>)}
              {!accounts.length && areaToPartyCompany && (<div className="empty-state"><div className="empty-icon">👤</div><h4>No Accounts Found</h4><p>Add accounts in Account Master first to enable mapping.</p></div>)}
            </div>
          )}
        </div>
      </main>


    {/* Batch Modal */}
{showBatchModal && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999999
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) setShowBatchModal(false);
    }}
  >
    <div
      style={{
        width: '800px',
        background: 'white',
        borderRadius: '10px',
        padding: '20px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: '1px solid #e5e7eb'
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Batch Details</h2>
        <button
          onClick={() => setShowBatchModal(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          ✕
        </button>
      </div>

      {/* Existing / New Batch Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '10px'
        }}
      >
        <button
          type="button"
          onClick={() => setBatchMode('existing')}
          style={{
            padding: '8px 20px',
            background: batchMode === 'existing' ? '#2563eb' : '#f3f4f6',
            color: batchMode === 'existing' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          Existing Batch
        </button>

        <button
          type="button"
          onClick={() => setBatchMode('new')}
          style={{
            padding: '8px 20px',
            background: batchMode === 'new' ? '#2563eb' : '#f3f4f6',
            color: batchMode === 'new' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          New Batch
        </button>
      </div>

      {/* Existing Batch Mode */}
      {batchMode === 'existing' && (
        <>
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              maxHeight: '350px',
              overflowY: 'auto',
              marginBottom: '20px'
            }}
          >
            {existingBatches.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                No Existing Batch Found
              </div>
            )}

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12px'
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    position: 'sticky',
                    top: 0,
                    borderBottom: '2px solid #e5e7eb'
                  }}
                >
                  <th style={{ padding: '10px', textAlign: 'center', width: '60px' }}>Sl</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Batch</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>MRP</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Mfg Date</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Expiry Date</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Stock</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Sales Rate</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Purchase Rate</th>
                  <th style={{ padding: '10px', textAlign: 'center', width: '60px' }}>BoxPack</th>
                 </tr>
              </thead>
              <tbody>
                {existingBatches.map((batch, idx) => (
                  <tr
                    key={idx}
                    onClick={() => {
                      const updatedItems = [...purchaseItems];
                      updatedItems[currentBatchRow] = {
                        ...updatedItems[currentBatchRow],
                        batchNo: batch.batchNo,
                        mfgDate: batch.mfgDate,
                        expDate: batch.expDate,
                        mrp: batch.mrp,
                        purRate: batch.purchaseRate,
                        salesRate: batch.salesRate,
                        quantity: updatedItems[currentBatchRow]?.quantity || 1,
                        stockQty: batch.stockQty,
                        boxPack: batch.boxPack || 1
                      };
                      setPurchaseItems(updatedItems);
                      setShowBatchModal(false);
                    }}
                    style={{
                      cursor: 'pointer',
                      transition: '0.2s',
                      borderBottom: '1px solid #f3f4f6'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#eff6ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ fontWeight: '500', color: '#2563eb' }}>{batch.batchNo}</span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>₹{parseFloat(batch.mrp || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {batch.mfgDate !== '01/01/1900' && batch.mfgDate !== '1900-01-01' 
                        ? batch.mfgDate 
                        : '-'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {batch.expDate !== '01/01/1900' && batch.expDate !== '1900-01-01' 
                        ? batch.expDate 
                        : '-'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <span style={{ color: parseFloat(batch.stockQty) < 0 ? '#dc2626' : '#059669' }}>
                        {parseFloat(batch.stockQty).toFixed(0)}
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>₹{parseFloat(batch.salesRate || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>₹{parseFloat(batch.purchaseRate || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{batch.boxPack || 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '10px',
              paddingTop: '10px',
              borderTop: '1px solid #e5e7eb'
            }}
          >
            <div style={{ flex: 1, fontSize: '12px', color: '#6b7280' }}>
              <strong>Total Batches:</strong> {existingBatches.length}
            </div>
            <button
              type="button"
              onClick={() => setShowBatchModal(false)}
              style={{
                padding: '8px 20px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* New Batch Mode - Reordered and with fields removed */}
      {batchMode === 'new' && (
        <>
          {/* Row 1: Batch No, Mfg Date, Exp Date */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '15px',
              marginBottom: '20px'
            }}
          >
            <div className="labeled-input">
              <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Batch No *</label>
              <input
                type="text"
                placeholder="Enter Batch Number"
                value={batchForm.batchNo}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    batchNo: e.target.value
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div className="labeled-input">
              <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Mfg Date</label>
              <input
                type="date"
                value={batchForm.mfgDate}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    mfgDate: e.target.value
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div className="labeled-input">
              <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Expiry Date</label>
              <input
                type="date"
                value={batchForm.expDate}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    expDate: e.target.value
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Row 2: MRP, Purchase Rate, Sales Rate */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '15px',
              marginBottom: '20px'
            }}
          >
            <div className="labeled-input">
              <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>MRP *</label>
              <input
                type="number"
                placeholder="Enter MRP"
                value={batchForm.mrp}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    mrp: e.target.value
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div className="labeled-input">
              <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Purchase Rate</label>
              <input
                type="number"
                placeholder="Enter Purchase Rate"
                value={batchForm.purchaseRate}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    purchaseRate: e.target.value
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div className="labeled-input">
              <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Sales Rate</label>
              <input
                type="number"
                placeholder="Enter Sales Rate"
                value={batchForm.salesRate}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    salesRate: e.target.value
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Row 3: Rate Per Unit (Default 1), Previous Purchase Rate */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginBottom: '20px'
            }}
          >
            <div className="labeled-input">
              <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Rate Per Unit</label>
              <input
                type="number"
                step="0.01"
                placeholder="Rate Per Unit"
                value={batchForm.ratePerUnit || '1'}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    ratePerUnit: e.target.value
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Default: 1</div>
            </div>

            <div className="labeled-input">
              <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Previous Purchase Rate</label>
              <input
                type="number"
                step="0.01"
                placeholder="Previous Purchase Rate"
                value={batchForm.previousPurchaseRate}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    previousPurchaseRate: e.target.value
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Hidden/Additional fields (Stock Qty and Box Pack) - kept but can be hidden if needed */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginBottom: '20px'
            }}
          >
            <div className="labeled-input">
              <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Stock Quantity</label>
              <input
                type="number"
                placeholder="Enter Stock Quantity"
                value={batchForm.stockQty}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    stockQty: e.target.value
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div className="labeled-input">
              <label style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Box Pack</label>
              <input
                type="number"
                placeholder="Box Pack"
                value={batchForm.boxPack || 1}
                onChange={(e) =>
                  setBatchForm({
                    ...batchForm,
                    boxPack: e.target.value
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Action Buttons - Gross Amt and GST Amt removed */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '10px',
              paddingTop: '15px',
              borderTop: '1px solid #e5e7eb'
            }}
          >
            <button
              type="button"
              onClick={() => setShowBatchModal(false)}
              style={{
                padding: '10px 24px',
                background: '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveBatchDetails}
              style={{
                padding: '10px 24px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Save Batch
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}
    </div>
  );
}

export default Dashboard;
