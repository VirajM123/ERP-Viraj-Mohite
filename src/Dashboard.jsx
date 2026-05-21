// Dashboard.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './Dashboard.css';
// Change this at the top of Dashboard.jsx:
import logo from "./assets/images/Totalsolution.PNG";
// Note: Adjust the "../" or "./" depending on exactly where Dashboard.jsx sits relative to assets
import SalesmanToAreaMapping from './SalesmanToAreaMapping';
import Transaction from "./Transaction";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

import { ShoppingBag, Package, Users, Wallet } from "lucide-react";


const Dashboard = () => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [activeSubMenu, setActiveSubMenu] = useState(null);
  const [openFormFor, setOpenFormFor] = useState(null);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [accountActiveTab, setAccountActiveTab] = useState('basic');
  const [otherAccountActiveTab, setOtherAccountActiveTab] = useState('basic');
  const [transactionFormMode, setTransactionFormMode] = useState({});
  // Batch  State
  const [batches, setBatches] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [existingBatches, setExistingBatches] = useState([]);

  const [currentBatchRow, setCurrentBatchRow] = useState(null);

  // Add these with other state declarations (around line 50)
  const [showBatchSelectionModal, setShowBatchSelectionModal] = useState(false);
  const [productBatchesForSelection, setProductBatchesForSelection] = useState([]);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState(null);

  const [showDashboard, setShowDashboard] = useState(true); // Set to true by default
  // VOUCHER LIST STATE VARIABLES
  const [showSalesList, setShowSalesList] = useState(false);
  const [showPurchaseList, setShowPurchaseList] = useState(false);
  const [showCreditNoteList, setShowCreditNoteList] = useState(false);
  const [showDebitNoteList, setShowDebitNoteList] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [viewType, setViewType] = useState('');

  // Sample saved data for voucher lists (replace with your actual saved data)
  const [salesListData, setSalesListData] = useState([]);
  const [purchaseListData, setPurchaseListData] = useState([]);
  const [creditNoteListData, setCreditNoteListData] = useState([]);
  const [debitNoteListData, setDebitNoteListData] = useState([]);
  // Create Load List State
  const [showCreateLoadList, setShowCreateLoadList] = useState(false);
  const [createLoadListData, setCreateLoadListData] = useState([]);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [originalSettleLoadItems, setOriginalSettleLoadItems] = useState([]);
  // Add this state with other state declarations (around line 50-60)
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceiptItem, setCurrentReceiptItem] = useState(null);
  const [receiptFormData, setReceiptFormData] = useState({
    ourBankAccount: '',
    bankName: '',
    chequeNo: '',
    chequeDate: '',
    billAmount: 0,
    receiptAmount: 0,
    discount: 0,
    salesman: '',
    receiptSeries: '',  // ADD THIS
    receiptNo: ''       // ADD THIS
  });
  const [showOtherBillsModal, setShowOtherBillsModal] = useState(false);
  const [otherPendingBills, setOtherPendingBills] = useState([]);

  // Add this function to get salesman mapping for customer
  const getSalesmanForCustomer = (partyCode, partyName) => {
    // Find salesman mapped to this customer from area to party mapping
    const partyMapping = areaToPartyData.find(
      mapping => mapping.accountCode === partyCode || mapping.accountName === partyName
    );
    if (partyMapping && partyMapping.areaName) {
      const areaMapping = mappingData.find(
        m => m.areaName === partyMapping.areaName
      );
      if (areaMapping && areaMapping.salesmanName) {
        return areaMapping.salesmanName;
      }
    }
    return '';
  };

  // Bill Print State
  const [billPrintFormData, setBillPrintFormData] = useState({
    invoiceNumber: '',
    printType: 'original' // original, duplicate, triplicate
  });
  const [billPrintData, setBillPrintData] = useState(null);
  const [showBillPrintPreview, setShowBillPrintPreview] = useState(false);

  // Print Load State
  const [printLoadFormData, setPrintLoadFormData] = useState({
    loadSeries: '',
    loadNo: '',
    reportLevel: '',
    printOn: '',
    areaWise: 'N',
    salesmanWise: 'N',
    printLayout: 'portrait',
    orderBy: 'product_wise'
  });

  const [printLoadItems, setPrintLoadItems] = useState([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

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
  const [products, setProducts] = useState([
  { id: 1, code: 'P001', name: 'Parle G Biscuit', basicUnit: 'PCS', mrp: 15, gst: 18, Rate_Per_Unit: 12, salesRate: 12 },
  { id: 2, code: 'P002', name: 'Lays Classic Salted', basicUnit: 'PCS', mrp: 20, gst: 18, Rate_Per_Unit: 18, salesRate: 18 },
  { id: 3, code: 'P003', name: 'Coca Cola 2L', basicUnit: 'LTR', mrp: 85, gst: 18, Rate_Per_Unit: 75, salesRate: 75 },
  { id: 4, code: 'P004', name: 'Tata Tea 1kg', basicUnit: 'KG', mrp: 250, gst: 5, Rate_Per_Unit: 220, salesRate: 220 },
  { id: 5, code: 'P005', name: 'Surf Excel 2kg', basicUnit: 'KG', mrp: 450, gst: 18, Rate_Per_Unit: 380, salesRate: 380 },
]);
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

  // ==================== SETTLE LOAD STATE VARIABLES ====================
  // Add these with other state declarations
  const [showSettleLoad, setShowSettleLoad] = useState(false);
  const [settleLoadData, setSettleLoadData] = useState(null);
  const [settleLoadFormData, setSettleLoadFormData] = useState({
    loadNo: '',
    loadDate: new Date().toISOString().split('T')[0],
    settleLoadDate: new Date().toISOString().split('T')[0],
    narration: ''
  });
  const [settleLoadItems, setSettleLoadItems] = useState([]);
  const [settleLoadSummary, setSettleLoadSummary] = useState({
    // Left Summary Fields
    totalBills: 0,
    totalCashBills: 0,
    totalCreditBills: 0,
    totalRecAdjBills: 0,
    totalPendingBills: 0,
    totalCancelBills: 0,
    previousCollection: 0,
    // Right Summary Fields
    totalAmt: 0,
    totalCashAmt: 0,
    totalCreditAmt: 0,
    totalChequeAmt: 0,
    totalPendingAmt: 0,
    totalCancelAmt: 0
  });
  const [settleLoadOptions, setSettleLoadOptions] = useState({
    loadLock: false,
    report: false
  });
// ================= COMMON REGEX VALIDATION =================
const numericFields = [
  'mobileNo', 'phoneNo', 'pinCode', 'accountNumber', 'chequeNo',
  'billNo', 'vNo', 'loadNo', 'invoiceNumber', 'creditDays',
  'creditBills', 'lockDays', 'seqNo', 'qty', 'free', 'mrp',
  'rate', 'gst', 'vat', 'amount', 'openingBal', 'creditAmt',
  'distKm', 'boxPack', 'inboxPack', 'weight', 'hsnCode',
  'cess', 'cessAmt', 'ExpDays', 'tcsPercent'
];

const emailFields = ['emailId', 'email'];

const regexInputValue = (name, value) => {
  if (emailFields.includes(name)) {
    return value.replace(/[^a-zA-Z0-9@._-]/g, '');
  }
// HSN CODE -> ONLY 8 DIGITS
  if (name === 'hsn' || name === 'hsnCode') {
    return value.replace(/\D/g, '').slice(0, 8);
  }
  if (name === 'mobileNo') {
    return value.replace(/\D/g, '').slice(0, 10);
  }

  if (name === 'phoneNo') {
    return value.replace(/\D/g, '').slice(0, 10);
  }

  if (name === 'pinCode') {
    return value.replace(/\D/g, '').slice(0, 6);
  }

  if (numericFields.includes(name)) {
    return value.replace(/[^0-9.]/g, '');
  }

  return value;
};

const isValidEmail = (email) => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validateFormRegex = (formData) => {
  if (formData.emailId && !isValidEmail(formData.emailId)) {
    alert('Please enter valid Email ID');
    return false;
  }

  if (formData.mobileNo && formData.mobileNo.length !== 10) {
    alert('Mobile No must be 10 digits');
    return false;
  }

  if (formData.pinCode && formData.pinCode.length !== 6) {
    alert('Pin Code must be 6 digits');
    return false;
  }
if (formData.hsn && formData.hsn.length > 8) {
  alert('HSN Code cannot exceed 8 digits');
  return false;
}
  return true;
};




  // Add this function where other handler functions are defined
  const handleSettleLoad = (loadData) => {
    console.log('Settling Load:', loadData);

    if (!loadData || !loadData.items || loadData.items.length === 0) {
      alert('No items found in this load to settle');
      return;
    }
    // Replace the updateSettleLoadItem function with this improved version:
    const updateSettleLoadItem = (index, field, value) => {
      const newItems = [...settleLoadItems];
      newItems[index][field] = value;

      if (field === 'adjust') {
        const billAmount = parseFloat(newItems[index].billAmount) || 0;
        if (value === 'Y') {
          newItems[index].receiptAmount = billAmount;
          newItems[index].pending = 'N';
          newItems[index].cancel = 'N';
          newItems[index].status = 'Settled';
        } else {
          newItems[index].receiptAmount = 0;
          newItems[index].status = 'Pending';
        }
      } else if (field === 'pending') {
        if (value === 'Y') {
          newItems[index].receiptAmount = 0;
          newItems[index].adjust = 'N';
          newItems[index].cancel = 'N';
          newItems[index].status = 'Pending';
        }
      } else if (field === 'cancel') {
        if (value === 'Y') {
          newItems[index].receiptAmount = 0;
          newItems[index].adjust = 'N';
          newItems[index].pending = 'N';
          newItems[index].status = 'Cancelled';
        } else {
          newItems[index].status = 'Pending';
        }
      }

      setSettleLoadItems(newItems);
      calculateSettleLoadSummary(newItems);
    };
    // Handle receipt submission - Make sure this is defined at the component level, not inside another function
    const handleReceiptSubmit = () => {
      if (currentReceiptItem) {
        const { index, item } = currentReceiptItem;
        let receiptAmount = parseFloat(receiptFormData.receiptAmount);
        const billAmount = parseFloat(item.billAmount);
        const discount = parseFloat(receiptFormData.discount) || 0;

        // Apply discount if any
        if (discount > 0 && receiptAmount <= billAmount) {
          receiptAmount = receiptAmount - discount;
        }

        const newItems = [...settleLoadItems];

        // Update receipt series and number
        newItems[index].receiptSeries = receiptFormData.receiptSeries || '';
        newItems[index].receiptNo = receiptFormData.receiptNo || '';
        newItems[index].receiptAmount = receiptAmount;
        newItems[index].receiptMode = receiptFormData.ourBankAccount === 'cash' ? 'Cash' : 'Bank';

        if (receiptFormData.ourBankAccount !== 'cash') {
          newItems[index].chequeNo = receiptFormData.chequeNo;
          newItems[index].chequeDate = receiptFormData.chequeDate;
          newItems[index].bankName = receiptFormData.bankName || receiptFormData.ourBankAccount;
        }

        // Update status based on receipt amount
        if (receiptAmount >= billAmount && billAmount > 0) {
          newItems[index].adjust = 'Y';
          newItems[index].pending = 'N';
          newItems[index].cancel = 'N';
          newItems[index].status = 'Settled';
        } else if (receiptAmount > 0 && receiptAmount < billAmount) {
          newItems[index].adjust = 'N';
          newItems[index].pending = 'Y';
          newItems[index].cancel = 'N';
          newItems[index].status = 'Partial';
        }

        setSettleLoadItems(newItems);
        calculateSettleLoadSummary(newItems);

        // Check if receipt amount exceeds bill amount and show other pending bills
        if (receiptAmount > billAmount) {
          const excessAmount = receiptAmount - billAmount;
          const otherBills = settleLoadItems.filter((_, i) =>
            i !== index &&
            parseFloat(settleLoadItems[i].billAmount) > parseFloat(settleLoadItems[i].receiptAmount) &&
            settleLoadItems[i].status !== 'Settled' &&
            settleLoadItems[i].cancel !== 'Y'
          ).map(bill => ({
            ...bill,
            pendingAmount: parseFloat(bill.billAmount) - parseFloat(bill.receiptAmount),
            selectedAmount: 0
          }));

          if (otherBills.length > 0) {
            setOtherPendingBills(otherBills);
            setShowOtherBillsModal(true);
          }
        }

        setShowReceiptModal(false);
        setCurrentReceiptItem(null);
      }
    };

    // Handle applying excess amount to other bills
    const applyExcessToOtherBills = () => {
      if (currentReceiptItem && otherPendingBills.length > 0) {
        const excessAmount = parseFloat(receiptFormData.receiptAmount) - parseFloat(currentReceiptItem.item.billAmount);
        let remainingExcess = excessAmount;
        const updatedOtherBills = [...otherPendingBills];
        const adjustedBills = [];

        for (let i = 0; i < updatedOtherBills.length && remainingExcess > 0; i++) {
          const bill = updatedOtherBills[i];
          const pendingAmount = bill.pendingAmount;
          const applyAmount = Math.min(remainingExcess, pendingAmount);

          if (applyAmount > 0) {
            bill.selectedAmount = applyAmount;
            remainingExcess -= applyAmount;
            adjustedBills.push({ index: bill.originalIndex, amount: applyAmount });
          }
        }

        // Update the main settleLoadItems with adjustments to other bills
        const newItems = [...settleLoadItems];
        adjustedBills.forEach(adj => {
          if (newItems[adj.index]) {
            const newReceiptAmount = (parseFloat(newItems[adj.index].receiptAmount) || 0) + adj.amount;
            newItems[adj.index].receiptAmount = newReceiptAmount;
            const billAmt = parseFloat(newItems[adj.index].billAmount) || 0;

            if (newReceiptAmount >= billAmt) {
              newItems[adj.index].adjust = 'Y';
              newItems[adj.index].pending = 'N';
              newItems[adj.index].status = 'Settled';
            } else if (newReceiptAmount > 0) {
              newItems[adj.index].adjust = 'N';
              newItems[adj.index].pending = 'Y';
              newItems[adj.index].status = 'Partial';
            }
          }
        });

        setSettleLoadItems(newItems);
        calculateSettleLoadSummary(newItems);
        setShowOtherBillsModal(false);
        alert(`Excess amount of ₹${excessAmount.toFixed(2)} applied to ${adjustedBills.length} other bill(s).`);
      }
    };
    const calculateSettleLoadSummary = (items) => {
      let totalBills = items.length;
      let totalCashBills = 0;
      let totalCreditBills = 0;
      let totalRecAdjBills = 0;
      let totalPendingBills = 0;
      let totalCancelBills = 0;
      let previousCollection = 0;

      let totalAmt = 0;
      let totalCashAmt = 0;
      let totalCreditAmt = 0;
      let totalChequeAmt = 0;
      let totalPendingAmt = 0;
      let totalCancelAmt = 0;

      items.forEach(item => {
        const billAmount = parseFloat(item.billAmount) || 0;
        const receiptAmount = parseFloat(item.receiptAmount) || 0;

        totalAmt += billAmount;

        if (item.billType === 'Cash') {
          totalCashBills++;
          totalCashAmt += billAmount;
        } else if (item.billType === 'Credit') {
          totalCreditBills++;
          totalCreditAmt += billAmount;
        }

        if (item.adjust === 'Y') {
          totalRecAdjBills++;
          totalChequeAmt += receiptAmount;
        } else if (item.pending === 'Y') {
          totalPendingBills++;
          totalPendingAmt += (billAmount - receiptAmount);
        } else if (item.cancel === 'Y') {
          totalCancelBills++;
          totalCancelAmt += billAmount;
        }
      });

      setSettleLoadSummary({
        totalBills,
        totalCashBills,
        totalCreditBills,
        totalRecAdjBills,
        totalPendingBills,
        totalCancelBills,
        previousCollection,
        totalAmt,
        totalCashAmt,
        totalCreditAmt,
        totalChequeAmt,
        totalPendingAmt,
        totalCancelAmt
      });
    };

    
const handleSettleLoadInputChange = (e) => {
  const { name, value } = e.target;
  setSettleLoadFormData({ ...settleLoadFormData, [name]: regexInputValue(name, value) });
};

    const handleSettleLoadOptionChange = (option) => {
      setSettleLoadOptions({ ...settleLoadOptions, [option]: !settleLoadOptions[option] });
    };

    const exportSettleLoadToExcel = () => {
      const exportData = settleLoadItems.map(item => ({
        'Sr No': item.sr,
        'Adjust': item.adjust === 'Y' ? 'Yes' : 'No',
        'Pending': item.pending === 'Y' ? 'Yes' : 'No',
        'Cancel': item.cancel === 'Y' ? 'Yes' : 'No',
        'Receipt': item.receiptAmount,
        'Status': item.status,
        'Bill Type': item.billType,
        'Bill Date': item.billDate,
        'Bill Series': item.billSeries,
        'Bill No': item.billNo,
        'Party Code': item.partyCode,
        'Party Name': item.partyName,
        'Bill Amount': item.billAmount,
        'Receipt Amount': item.receiptAmount
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Settle Load');
      XLSX.writeFile(workbook, `Settle_Load_${settleLoadFormData.loadNo}.xlsx`);
    };

    const saveSettleLoad = () => {
      const settledData = {
        ...settleLoadData,
        settlementDate: settleLoadFormData.settleLoadDate,
        narration: settleLoadFormData.narration,
        settledItems: settleLoadItems,
        summary: settleLoadSummary,
        options: settleLoadOptions,
        status: 'Settled'
      };

      console.log('Saving settled load:', settledData);

      setCreateLoadListData(prevData =>
        prevData.map(load =>
          load.id === settleLoadData?.id
            ? { ...load, status: 'Settled', settlementData: settledData }
            : load
        )
      );

      alert('Load settled successfully!');
      setShowSettleLoad(false);
      setSettleLoadData(null);
      setSettleLoadItems([]);
    };
    // Transform load data to settle load grid format
    const transformedItems = (loadData.items || []).map((item, index) => ({
      id: item.id || Date.now() + index,
      sr: index + 1,
      adjust: 'N',
      pending: 'N',
      cancel: 'N',
      receipt: '',
      status: 'Pending',
      billType: item.billType || 'Credit',
      billDate: item.billDate || loadData.billFromDate || new Date().toISOString().split('T')[0],
      billSeries: item.billSeries || loadData.loadSeries || '',
      billNo: item.billNo || '',
      partyCode: item.partyCode || '',
      partyName: item.partyName || '',
      billAmount: parseFloat(item.amount) || 0,
      receiptAmount: 0
    }));

    setSettleLoadItems(transformedItems);
    setSettleLoadFormData({
      loadNo: loadData.loadNo || '',
      loadDate: loadData.loadDate || new Date().toISOString().split('T')[0],
      settleLoadDate: new Date().toISOString().split('T')[0],
      narration: ''
    });
    setSettleLoadData(loadData);
    setShowSettleLoad(true);
    setShowCreateLoadList(false); // Hide the list view when showing form

    // Calculate initial summary
    calculateSettleLoadSummary(transformedItems);
  };
  const updateSettleLoadItem = (index, field, value) => {
    const newItems = [...settleLoadItems];
    newItems[index][field] = value;

    // Update receipt amount when adjust, pending, cancel are toggled
    if (field === 'adjust') {
      const billAmount = parseFloat(newItems[index].billAmount) || 0;
      if (value === 'Y') {
        newItems[index].receiptAmount = billAmount;
        newItems[index].pending = 'N';
        newItems[index].cancel = 'N';
        newItems[index].status = 'Adjusted';
      } else {
        newItems[index].receiptAmount = 0;
        newItems[index].status = 'Pending';
      }
    } else if (field === 'pending') {
      if (value === 'Y') {
        newItems[index].receiptAmount = 0;
        newItems[index].adjust = 'N';
        newItems[index].cancel = 'N';
        newItems[index].status = 'Pending';
      }
    } else if (field === 'cancel') {
      if (value === 'Y') {
        newItems[index].receiptAmount = 0;
        newItems[index].adjust = 'N';
        newItems[index].pending = 'N';
        newItems[index].status = 'Cancelled';
      }
    } else if (field === 'receiptAmount') {
      const receiptAmt = parseFloat(value) || 0;
      const billAmount = parseFloat(newItems[index].billAmount) || 0;
      newItems[index][field] = receiptAmt;

      if (receiptAmt >= billAmount && billAmount > 0) {
        newItems[index].adjust = 'Y';
        newItems[index].pending = 'N';
        newItems[index].cancel = 'N';
        newItems[index].status = 'Adjusted';
      } else if (receiptAmt > 0 && receiptAmt < billAmount) {
        newItems[index].adjust = 'N';
        newItems[index].pending = 'Y';
        newItems[index].cancel = 'N';
        newItems[index].status = 'Partial';
      } else {
        newItems[index].adjust = 'N';
        newItems[index].pending = 'N';
        newItems[index].cancel = 'N';
        newItems[index].status = 'Pending';
      }
    }

    setSettleLoadItems(newItems);
    calculateSettleLoadSummary(newItems);
  };

  const calculateSettleLoadSummary = (items) => {
    let totalBills = items.length;
    let totalCashBills = 0;
    let totalCreditBills = 0;
    let totalRecAdjBills = 0;
    let totalPendingBills = 0;
    let totalCancelBills = 0;
    let previousCollection = 0;

    let totalAmt = 0;
    let totalCashAmt = 0;
    let totalCreditAmt = 0;
    let totalChequeAmt = 0;
    let totalPendingAmt = 0;
    let totalCancelAmt = 0;

    items.forEach(item => {
      const billAmount = parseFloat(item.billAmount) || 0;
      const receiptAmount = parseFloat(item.receiptAmount) || 0;

      totalAmt += billAmount;

      // Bill type counting
      if (item.billType === 'Cash') {
        totalCashBills++;
        totalCashAmt += billAmount;
      } else if (item.billType === 'Credit') {
        totalCreditBills++;
        totalCreditAmt += billAmount;
      }

      // Status counting
      if (item.adjust === 'Y') {
        totalRecAdjBills++;
        totalChequeAmt += receiptAmount;
      } else if (item.pending === 'Y') {
        totalPendingBills++;
        totalPendingAmt += (billAmount - receiptAmount);
      } else if (item.cancel === 'Y') {
        totalCancelBills++;
        totalCancelAmt += billAmount;
      }
    });

    setSettleLoadSummary({
      totalBills,
      totalCashBills,
      totalCreditBills,
      totalRecAdjBills,
      totalPendingBills,
      totalCancelBills,
      previousCollection,
      totalAmt,
      totalCashAmt,
      totalCreditAmt,
      totalChequeAmt,
      totalPendingAmt,
      totalCancelAmt
    });
  };

  const handleSettleLoadInputChange = (e) => {
    setSettleLoadFormData({ ...settleLoadFormData, [e.target.name]: e.target.value });
  };

  const handleSettleLoadOptionChange = (option) => {
    setSettleLoadOptions({ ...settleLoadOptions, [option]: !settleLoadOptions[option] });
  };

  const exportSettleLoadToExcel = () => {
    const exportData = settleLoadItems.map(item => ({
      'Sr No': item.sr,
      'Adjust': item.adjust,
      'Pending': item.pending,
      'Cancel': item.cancel,
      'Receipt': item.receiptAmount,
      'Status': item.status,
      'Bill Type': item.billType,
      'Bill Date': item.billDate,
      'Bill Series': item.billSeries,
      'Bill No': item.billNo,
      'Party Code': item.partyCode,
      'Party Name': item.partyName,
      'Bill Amount': item.billAmount,
      'Receipt Amount': item.receiptAmount
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Settle Load');
    XLSX.writeFile(workbook, `Settle_Load_${settleLoadFormData.loadNo}.xlsx`);
  };

  const saveSettleLoad = () => {
    const settledData = {
      ...settleLoadData,
      settlementDate: settleLoadFormData.settleLoadDate,
      narration: settleLoadFormData.narration,
      settledItems: settleLoadItems,
      summary: settleLoadSummary,
      options: settleLoadOptions,
      status: 'Settled'
    };

    console.log('Saving settled load:', settledData);

    // Update the load status in createLoadListData
    setCreateLoadListData(prevData =>
      prevData.map(load =>
        load.id === settleLoadData?.id
          ? { ...load, status: 'Settled', settlementData: settledData }
          : load
      )
    );

    alert('Load settled successfully!');
    setShowSettleLoad(false);
    setSettleLoadData(null);
    setSettleLoadItems([]);
  };


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
  code: '',
  name: '',
  companyId: '',
  group: '',
  category: '',
  description: '',
  gst: '0',
  basicUnit: 'PCS',
  boxPack: '0',
  inboxPack: '0',
  retailerMargin: '0',
  distributorMargin: '0',
  hsn: '0',
  weight: '0',
  Rate_Per_Unit: '0',
  Reorder_Level: '0',
  Min_Stock_Holding: '0',
  cess: '0',
  cessAmt: '0',
  ExpDays: '0',
  create: '0',
  active: true,
  locked: false,
  allowFraction: false
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
  // Create Load State
  const [createLoadFormData, setCreateLoadFormData] = useState({
    loadSeries: '',
    loadNo: '',
    loadDate: new Date().toISOString().split('T')[0],
    company: '',
    deliverBoy: '',
    selectedSalesman: '',
    billFromDate: new Date().toISOString().split('T')[0],
    billToDate: new Date().toISOString().split('T')[0],
    narration: '',
    deliveryBy: ''
  });
  const [createLoadItems, setCreateLoadItems] = useState([]);



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
    // Dashboard icon
    dashboard: { title: 'Dashboard', icon: '⚛️', items: ['Firm Creation', 'User Creation'] },

    // Changed master icon to 📁 to avoid duplicate chart icons
    master: { title: 'Master', icon: '📁', items: ['Company Master', 'Group Master', 'Category Master', 'Product', 'Account', 'Other Account', 'GST Master', 'Salesman', 'Area', 'Service', 'GoDown Master', 'Scheme', 'Customer Bank Master'] },
    mapping: { title: 'Mapping', icon: '🔗', items: ['Salesman To Area', 'Area To Party'] },

    // Changed sales icon to 📊 to match your statistics/sales icon image
    sales: { title: 'Sales', icon: '📊', items: ['Billing', 'Quotation', 'Create Load', 'Print Load', 'Settle Load', 'Bill Print', 'Load Transfer'] },

    vouchers: { title: 'Vouchers', icon: '📄', items: ['Purchase', 'Credit Note', 'Debit Note'] },

    // MODIFIED: Added 'Payment' and 'Collection voucher' to Transactions menu
    transactions: { title: 'Transactions', icon: '💳', items: ['Receipt', 'Cheque Bounce', 'PDC Docket', 'Journal Voucher', 'Contra', 'Payment', 'Collection Voucher'] },

    reports: { title: 'Reports', icon: '📈', items: ['Sales', 'Purchase', 'Stock Reports', 'GST Reports'] },
    tools: { title: 'Tools', icon: '⚙️', items: ['General Setup', 'Security Setup'] },
    logout: { title: 'Logout', icon: '🚪', items: [] }
  };
  const handleGodownInput = (e) => {
  const { name, value } = e.target;
  setGodownForm({ ...godownForm, [name]: regexInputValue(name, value) });
};

  // Bill Print Handlers
  const handleBillPrintInputChange = (e) => {
    setBillPrintFormData({ ...billPrintFormData, [e.target.name]: e.target.value });
  };

  const generateBillPrint = (e) => {
    if (e) e.preventDefault();

    // REMOVED: Invoice number validation - now generates without requiring invoice number

    // Generate a random invoice number if none provided
    const invoiceNumber = billPrintFormData.invoiceNumber || `INV-${Date.now()}`;

    // Sample invoice data - In real implementation, fetch from backend/database
    const sampleInvoice = {
      // Company Header
      company: {
        name: 'TOTAL SOLUTION DISTRIBUTORS PVT LTD',
        address: '123, Business Park, Andheri East, Mumbai - 400093',
        phone: '+91 22 1234 5678',
        email: 'info@totalsolution.com',
        gstin: '27AAACT1234A1Z',
        fssai: '10021021001234',
        invoiceTitle: 'TAX INVOICE'
      },

      // Invoice Information
      invoice: {
        number: invoiceNumber,
        date: new Date().toLocaleDateString('en-GB'),
        orderNumber: 'PO-2026-001234',
        deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        route: 'Route A - Western Suburbs',
        salesman: 'Krishna Patil',
        vehicleNumber: 'MH-01-AB-1234',
        beat: 'Andheri East Beat'
      },

      // Customer Information (Sample - can be modified)
      customer: {
        code: 'CUST-001234',
        name: 'M/S SHREEJI GENERAL STORE',
        billingAddress: 'Shop No. 5, Sai Plaza, MG Road, Andheri East, Mumbai - 400093',
        shippingAddress: 'Shop No. 5, Sai Plaza, MG Road, Andheri East, Mumbai - 400093',
        mobile: '+91 98765 43210',
        gstin: '27AAACF1234A1Z'
      },

      // Products
      products: [
        { sr: 1, code: 'P001', name: 'Parle G Biscuit', batch: 'BATCH-001', expiry: '12/2026', qty: 50, free: 2, rate: 12.00, mrp: 15.00, disc: 5, gst: 18, taxable: 570.00, total: 672.60 },
        { sr: 2, code: 'P002', name: 'Lay\'s Classic Salted', batch: 'BATCH-002', expiry: '11/2026', qty: 30, free: 1, rate: 18.00, mrp: 20.00, disc: 5, gst: 18, taxable: 513.00, total: 605.34 },
        { sr: 3, code: 'P003', name: 'Coca Cola 2L', batch: 'BATCH-003', expiry: '10/2026', qty: 20, free: 0, rate: 75.00, mrp: 85.00, disc: 8, gst: 18, taxable: 1500.00, total: 1770.00 }
      ],

      // Scheme Information
      schemes: [
        { name: 'Buy 10 Get 1 Free - Parle G', discount: 0, freeItem: '2 Pcs Parle G' },
        { name: 'Buy 5 Get 5% Extra - Lay\'s', discount: 5, freeItem: '1 Pc Extra' }
      ],

      // Summary
      summary: {
        totalQty: 100,
        totalFree: 3,
        grossAmount: 3465.00,
        discountAmount: 243.25,
        taxableAmount: 2583.00,
        cgst: 232.47,
        sgst: 232.47,
        igst: 0,
        roundOff: 0.06,
        netAmount: 3048.00
      },

      // Payment Information
      payment: {
        mode: 'Credit',
        creditDays: 30,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        outstandingBalance: 15000.00
      },

      // Logistics
      logistics: {
        transport: 'VRL Logistics',
        lrNumber: 'LR-2026-001234',
        deliveredBy: 'Rajesh Kumar',
        vehicleNumber: 'MH-01-AB-1234',
        receivedBy: 'Mahesh Patel'
      },

      // Footer
      footer: {
        terms: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged on overdue payments.\n3. Subject to Mumbai jurisdiction.',
        thankYou: 'Thank you for your business!',
        software: 'Total Solution ERP v2.0',
        pageNumber: 1
      }
    };

    setBillPrintData(sampleInvoice);
    setShowBillPrintPreview(true);
  };
  const handlePrintBill = () => {
    // Direct print without popup that might affect sidebar
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(getBillPrintHTML());
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 100);
  };
  const getBillPrintHTML = () => {
    if (!billPrintData) return '';

    const data = billPrintData;

    return `<!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${data.invoice.number}</title>
      <style>
        /* Use !important and specific selectors to prevent style leakage */
        .bill-print-wrapper * {
          all: revert;
        }
        
        .bill-print-wrapper {
          font-family: 'Courier New', 'Segoe UI', Arial, sans-serif !important;
          background: #e2e8f0 !important;
          padding: 20px !important;
          font-size: 11px !important;
          max-width: 1100px !important;
          margin: 0 auto !important;
        }
        
        .bill-print-wrapper .invoice-container {
          max-width: 1100px;
          margin: 0 auto;
          background: white;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        
        .bill-print-wrapper .invoice {
          padding: 15px 20px;
          background: white;
        }
        
        .bill-print-wrapper .company-header {
          text-align: center;
          border-bottom: 2px solid #1e3a8a;
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        
        .bill-print-wrapper .company-name {
          font-size: 22px;
          font-weight: bold;
          color: #1e3a8a;
          margin-bottom: 5px;
          letter-spacing: 1px;
        }
        
        .bill-print-wrapper .company-details {
          font-size: 10px;
          color: #4b5563;
          line-height: 1.4;
        }
        
        .bill-print-wrapper .gst-fssai {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 6px;
          font-size: 9px;
          font-weight: bold;
        }
        
        .bill-print-wrapper .invoice-title {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          background: #1e3a8a;
          color: white;
          padding: 6px;
          margin: 10px 0;
          letter-spacing: 2px;
        }
        
        .bill-print-wrapper .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        
        .bill-print-wrapper .info-box {
          border: 1px solid #d1d5db;
          padding: 8px 10px;
          background: #f9fafb;
        }
        
        .bill-print-wrapper .info-title {
          font-weight: bold;
          font-size: 10px;
          background: #e5e7eb;
          padding: 3px 6px;
          margin-bottom: 6px;
          display: inline-block;
        }
        
        .bill-print-wrapper .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 10px;
          line-height: 1.3;
        }
        
        .bill-print-wrapper .info-label {
          font-weight: 600;
          min-width: 90px;
        }
        
        .bill-print-wrapper .product-table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 9px;
        }
        
        .bill-print-wrapper .product-table th {
          background: #1e3a8a;
          color: white;
          padding: 6px 3px;
          border: 1px solid #2563eb;
          font-weight: bold;
          text-align: center;
        }
        
        .bill-print-wrapper .product-table td {
          border: 1px solid #d1d5db;
          padding: 5px 3px;
          text-align: center;
        }
        
        .bill-print-wrapper .scheme-section {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          padding: 6px 10px;
          margin: 10px 0;
          font-size: 9px;
        }
        
        .bill-print-wrapper .scheme-title {
          font-weight: bold;
          color: #92400e;
          margin-bottom: 4px;
        }
        
        .bill-print-wrapper .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin: 12px 0;
        }
        
        .bill-print-wrapper .summary-box {
          border: 1px solid #d1d5db;
          padding: 8px;
        }
        
        .bill-print-wrapper .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 10px;
        }
        
        .bill-print-wrapper .net-amount {
          font-size: 14px;
          font-weight: bold;
          color: #1e3a8a;
          border-top: 2px solid #1e3a8a;
          padding-top: 6px;
          margin-top: 6px;
        }
        
        .bill-print-wrapper .signature-section {
          display: flex;
          justify-content: space-between;
          margin: 15px 0 10px;
          padding-top: 10px;
        }
        
        .bill-print-wrapper .signature-box {
          width: 45%;
          text-align: center;
        }
        
        .bill-print-wrapper .signature-line {
          border-top: 1px solid #000;
          margin-top: 25px;
          padding-top: 5px;
          font-size: 9px;
        }
        
        .bill-print-wrapper .footer {
          margin-top: 15px;
          padding-top: 8px;
          border-top: 1px solid #d1d5db;
          font-size: 8px;
          text-align: center;
          color: #6b7280;
        }
        
        .bill-print-wrapper .terms {
          font-size: 8px;
          margin-top: 8px;
          padding: 6px;
          background: #f3f4f6;
        }
        
        .bill-print-wrapper .col-sr { width: 4%; }
        .bill-print-wrapper .col-code { width: 8%; }
        .bill-print-wrapper .col-name { width: 20%; }
        .bill-print-wrapper .col-batch { width: 8%; }
        .bill-print-wrapper .col-expiry { width: 6%; }
        .bill-print-wrapper .col-qty { width: 5%; }
        .bill-print-wrapper .col-free { width: 5%; }
        .bill-print-wrapper .col-rate { width: 6%; }
        .bill-print-wrapper .col-mrp { width: 6%; }
        .bill-print-wrapper .col-disc { width: 5%; }
        .bill-print-wrapper .col-gst { width: 5%; }
        .bill-print-wrapper .col-taxable { width: 8%; }
        .bill-print-wrapper .col-total { width: 9%; }
        
        .bill-print-wrapper .no-print {
          text-align: center;
          margin-top: 20px;
        }
        
        .bill-print-wrapper .no-print button {
          padding: 10px 20px;
          margin: 10px;
          background: #1e3a8a;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        
        @media print {
          .bill-print-wrapper .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background: #e2e8f0;">
      <div class="bill-print-wrapper">
        <div class="invoice-container">
          <div class="invoice">
            <!-- Company Header -->
            <div class="company-header">
              <div class="company-name">${data.company.name}</div>
              <div class="company-details">${data.company.address}</div>
              <div class="company-details">📞 ${data.company.phone} | ✉ ${data.company.email}</div>
              <div class="gst-fssai">
                <span>GSTIN: ${data.company.gstin}</span>
                <span>FSSAI: ${data.company.fssai}</span>
              </div>
            </div>
            
            <div class="invoice-title">${data.company.invoiceTitle} - ${billPrintFormData.printType.toUpperCase()}</div>
            
            <!-- Invoice & Customer Info -->
            <div class="info-grid">
              <div class="info-box">
                <div class="info-title">📄 INVOICE INFORMATION</div>
                <div class="info-row"><span class="info-label">Invoice No:</span><span>${data.invoice.number}</span></div>
                <div class="info-row"><span class="info-label">Invoice Date:</span><span>${data.invoice.date}</span></div>
                <div class="info-row"><span class="info-label">Order No:</span><span>${data.invoice.orderNumber}</span></div>
                <div class="info-row"><span class="info-label">Delivery Date:</span><span>${data.invoice.deliveryDate}</span></div>
                <div class="info-row"><span class="info-label">Route:</span><span>${data.invoice.route}</span></div>
                <div class="info-row"><span class="info-label">Salesman:</span><span>${data.invoice.salesman}</span></div>
                <div class="info-row"><span class="info-label">Vehicle No:</span><span>${data.invoice.vehicleNumber}</span></div>
                <div class="info-row"><span class="info-label">Beat/Area:</span><span>${data.invoice.beat}</span></div>
              </div>
              
              <div class="info-box">
                <div class="info-title">👤 CUSTOMER INFORMATION</div>
                <div class="info-row"><span class="info-label">Customer Code:</span><span>${data.customer.code}</span></div>
                <div class="info-row"><span class="info-label">Customer Name:</span><span>${data.customer.name}</span></div>
                <div class="info-row"><span class="info-label">Billing Address:</span><span>${data.customer.billingAddress}</span></div>
                <div class="info-row"><span class="info-label">Shipping Address:</span><span>${data.customer.shippingAddress}</span></div>
                <div class="info-row"><span class="info-label">Mobile No:</span><span>${data.customer.mobile}</span></div>
                <div class="info-row"><span class="info-label">GSTIN:</span><span>${data.customer.gstin}</span></div>
              </div>
            </div>
            
            <!-- Product Table -->
            <table class="product-table">
              <thead>
                <tr>
                  <th class="col-sr">Sr</th>
                  <th class="col-code">Code</th>
                  <th class="col-name">Product Name</th>
                  <th class="col-batch">Batch</th>
                  <th class="col-expiry">Expiry</th>
                  <th class="col-qty">Qty</th>
                  <th class="col-free">Free</th>
                  <th class="col-rate">Rate</th>
                  <th class="col-mrp">MRP</th>
                  <th class="col-disc">Disc%</th>
                  <th class="col-gst">GST%</th>
                  <th class="col-taxable">Taxable</th>
                  <th class="col-total">Total</th>
                </tr>
              </thead>
              <tbody>
                ${data.products.map(p => `
                  <tr>
                    <td class="col-sr">${p.sr}</td>
                    <td class="col-code">${p.code}</td>
                    <td class="col-name" style="text-align:left">${p.name}</td>
                    <td class="col-batch">${p.batch}</td>
                    <td class="col-expiry">${p.expiry}</td>
                    <td class="col-qty">${p.qty}</td>
                    <td class="col-free">${p.free}</td>
                    <td class="col-rate">₹${p.rate}</td>
                    <td class="col-mrp">₹${p.mrp}</td>
                    <td class="col-disc">${p.disc}%</td>
                    <td class="col-gst">${p.gst}%</td>
                    <td class="col-taxable">₹${p.taxable.toFixed(2)}</td>
                    <td class="col-total">₹${p.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <!-- Scheme Section -->
            <div class="scheme-section">
              <div class="scheme-title">🎯 SCHEME / OFFER DETAILS</div>
              ${data.schemes.map(s => `
                <div>• ${s.name} | Discount: ${s.discount > 0 ? s.discount + '%' : 'N/A'} | Free: ${s.freeItem}</div>
              `).join('')}
            </div>
            
            <!-- Summary & Payment -->
            <div class="summary-grid">
              <div class="summary-box">
                <div class="info-title">💰 BILL SUMMARY</div>
                <div class="summary-row"><span>Total Quantity:</span><span>${data.summary.totalQty} Pcs</span></div>
                <div class="summary-row"><span>Free Quantity:</span><span>${data.summary.totalFree} Pcs</span></div>
                <div class="summary-row"><span>Gross Amount:</span><span>₹${data.summary.grossAmount.toFixed(2)}</span></div>
                <div class="summary-row"><span>Discount Amount:</span><span>-₹${data.summary.discountAmount.toFixed(2)}</span></div>
                <div class="summary-row"><span>Taxable Amount:</span><span>₹${data.summary.taxableAmount.toFixed(2)}</span></div>
                <div class="summary-row"><span>CGST (9%):</span><span>+₹${data.summary.cgst.toFixed(2)}</span></div>
                <div class="summary-row"><span>SGST (9%):</span><span>+₹${data.summary.sgst.toFixed(2)}</span></div>
                <div class="summary-row"><span>Round Off:</span><span>₹${data.summary.roundOff.toFixed(2)}</span></div>
                <div class="net-amount summary-row"><span>NET AMOUNT:</span><span>₹${data.summary.netAmount.toFixed(2)}</span></div>
              </div>
              
              <div class="summary-box">
                <div class="info-title">💳 PAYMENT INFORMATION</div>
                <div class="summary-row"><span>Payment Mode:</span><span>${data.payment.mode}</span></div>
                <div class="summary-row"><span>Credit Days:</span><span>${data.payment.creditDays} Days</span></div>
                <div class="summary-row"><span>Due Date:</span><span>${data.payment.dueDate}</span></div>
                <div class="summary-row"><span>Outstanding Balance:</span><span>₹${data.payment.outstandingBalance.toFixed(2)}</span></div>
              </div>
            </div>
            
            <!-- Logistics Details -->
            <div class="info-box" style="margin-bottom: 12px;">
              <div class="info-title">🚚 LOGISTICS / DELIVERY DETAILS</div>
              <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
                <span>Transport: ${data.logistics.transport}</span>
                <span>LR No: ${data.logistics.lrNumber}</span>
                <span>Delivered By: ${data.logistics.deliveredBy}</span>
                <span>Vehicle No: ${data.logistics.vehicleNumber}</span>
                <span>Received By: ${data.logistics.receivedBy}</span>
              </div>
            </div>
            
            <!-- Signature Section -->
            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-line">Customer Signature</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Authorised Signatory</div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <div class="terms">
                <strong>Terms & Conditions:</strong><br>
                ${data.footer.terms.replace(/\n/g, '<br>')}
              </div>
              <div style="margin-top: 8px;">
                ${data.footer.thankYou}<br>
                ${data.footer.software} | Page ${data.footer.pageNumber}
              </div>
            </div>
          </div>
        </div>
        
        <div class="no-print">
          <button onclick="window.print()">🖨️ Print</button>
          <button onclick="window.close()">❌ Close</button>
        </div>
      </div>
    </body>
    </html>`;
  };

  const closeBillPrint = () => {
    setShowBillPrintPreview(false);
    setBillPrintData(null);
    setBillPrintFormData({
      LoadSeries: '',
      Trnseries: '',
      FromTrnno: '',
      Totrnno: '',
      NoOfCopies: '',
      loadNo: '',
      Goodsreturn: 'N',
      damageReturn: 'original',
      SchemeSummary: 'Y',
      VatSummary: 'Y',
      HSNSummary: 'Y',
      printType: 'original',
      invoiceNumber: `INV-${Date.now()}`
    });
    // Keep the form open by not changing activeSubMenu or openFormFor
    // This ensures the user returns to the bill print form
  };
 const handleFirmInput = (e) => {
  const { name, value } = e.target;
  setFirmData({ ...firmData, [name]: regexInputValue(name, value) });
};

 const saveFirm = (e) => {
  e.preventDefault();

  if (!validateFormRegex(firmData)) return;

  if (!firmData.firmCode || !firmData.firmName) {
    return alert('Firm Code and Firm Name are required');
  }

  const newFirm = { id: Date.now(), ...firmData };
  setFirms([...firms, newFirm]);
  alert('Firm created successfully!');

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
 
const handleCustomerBankInput = (e) => {
  const { name, value } = e.target;
  setCustomerBankForm({ ...customerBankForm, [name]: regexInputValue(name, value) });
};

const saveCustomerBank = (e) => {
  e.preventDefault();

  if (!validateFormRegex(customerBankForm)) return;

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
  // Dashboard State for KPI metrics
  const [dashboardMetrics, setDashboardMetrics] = useState({
    totalSales: 1245680,
    totalSalesChange: 8.6,
    totalOrders: 256,
    totalOrdersChange: 11.3,
    totalCustomers: 1245,
    totalCustomersChange: 5.4,
    totalOutstanding: 875230,
    totalOutstandingChange: -3.2
  });

  // Sales Trend Data (Weekly)
  const [salesTrend, setSalesTrend] = useState([
    { day: 'Mon 20', sales: 125000 },
    { day: 'Tue 21', sales: 142000 },
    { day: 'Wed 22', sales: 138000 },
    { day: 'Thu 23', sales: 165000 },
    { day: 'Fri 24', sales: 189000 },
    { day: 'Sat 25', sales: 210000 },
    { day: 'Sun 26', sales: 176680 }
  ]);

  const salesByCategory = [
    { name: "Beverages", amount: 325400, color: "#3b82f6" },
    { name: "Snacks", amount: 285750, color: "#10b981" },
    { name: "Personal Care", amount: 210300, color: "#f59e0b" },
    { name: "Home Care", amount: 175500, color: "#ef4444" },
    { name: "Others", amount: 148730, color: "#8b5cf6" }
  ];


  // Top 5 Customers
  const [topCustomers, setTopCustomers] = useState([
    { rank: 1, name: 'Sai Retailers', amount: 125430 },
    { rank: 2, name: 'Om Super Store', amount: 98750 },
    { rank: 3, name: 'Patil Traders', amount: 88600 },
    { rank: 4, name: 'Shree Ganesh Provision Store', amount: 75230 },
    { rank: 5, name: 'New India Mart', amount: 68940 }
  ]);

  // Outstanding Summary by Days
  const [outstandingSummary, setOutstandingSummary] = useState([
    { days: '0 - 30 Days', amount: 345120 },
    { days: '31 - 60 Days', amount: 265340 },
    { days: '61 - 90 Days', amount: 180450 },
    { days: 'Above 90 Days', amount: 84320 }
  ]);

  // Low Stock Alerts
  const [lowStockAlerts, setLowStockAlerts] = useState([
    { product: 'Tata Tea 1kg', stock: 12, unit: 'Units' },
    { product: 'Parle-G Biscuit 400g', stock: 18, unit: 'Units' },
    { product: 'Surf Excel 2kg', stock: 8, unit: 'Units' },
    { product: 'Colgate Strong Teeth 200g', stock: 15, unit: 'Units' }
  ]);
  const todaySales = {
    bills: 42,
    amount: 125430
  }

  const todayCollection = {
    received: 80000,
    pending: 45430
  }

  const salesmanPerformance = [
    { name: "Ramesh", amount: 45000 },
    { name: "Ajay", amount: 32000 },
    { name: "Vikas", amount: 27000 }
  ]

  const recentBills = [
    { billNo: "INV-1024", customer: "Raj Traders", amount: 2500 },
    { billNo: "INV-1025", customer: "Om Stores", amount: 1800 },
    { billNo: "INV-1026", customer: "Shree Mart", amount: 3200 }
  ]

  const renderDashboard = () => {
    const salesTrendData = [
      { day: "Mon 20", sales: 115000 },
      { day: "Tue 21", sales: 132000 },
      { day: "Wed 22", sales: 126000 },
      { day: "Thu 23", sales: 150000 },
      { day: "Fri 24", sales: 175000 },
      { day: "Sat 25", sales: 202000 },
      { day: "Sun 26", sales: 165000 }
    ];

    const categoryData = [
      { name: "Beverage", value: 25, amount: 286500, color: "#3b64f4" },
      { name: "Home Care", value: 15, amount: 171900, color: "#ff3030" },
      { name: "Personal Care", value: 18, amount: 206280, color: "#ff9f0a" },
      { name: "Food", value: 22, amount: 252120, color: "#10a86b" },
      { name: "Others", value: 20, amount: 229200, color: "#7c3aed" }
    ];

    const topProducts = [
      { name: "Product A", sales: 125430 },
      { name: "Product B", sales: 95230 },
      { name: "Product C", sales: 78450 },
      { name: "Product D", sales: 50120 },
      { name: "Product E", sales: 35600 }
    ];

    const recentTransactions = [
      { invoice: "INV-1001", customer: "Rahul Enterprises", amount: 12450, status: "Paid" },
      { invoice: "INV-1002", customer: "Sharma Stores", amount: 8750, status: "Paid" },
      { invoice: "INV-1003", customer: "Kumar Super Mart", amount: 15230, status: "Pending" },
      { invoice: "INV-1004", customer: "Patel Distributors", amount: 9850, status: "Paid" },
      { invoice: "INV-1005", customer: "Gupta Traders", amount: 6500, status: "Overdue" }
    ];

    const kpis = [
      {
        title: "TOTAL SALES",
        value: "₹12,45,680",
        change: "8.6% vs last week",
        trend: "positive",
        icon: <ShoppingBag size={22} />,
        color: "blue",
        spark: "M5 42 L35 35 L65 36 L95 18 L125 22 L155 29 L185 20 L215 26 L245 15 L275 21"
      },
      {
        title: "TOTAL ORDERS",
        value: "256",
        change: "11.3% vs last week",
        trend: "positive",
        icon: <Package size={22} />,
        color: "green",
        spark: "M5 42 L35 30 L65 35 L95 12 L125 28 L155 27 L185 26 L215 35 L245 18 L275 15"
      },
      {
        title: "TOTAL CUSTOMERS",
        value: "1245",
        change: "5.4% vs last week",
        trend: "positive",
        icon: <Users size={22} />,
        color: "orange",
        spark: "M5 38 L35 24 L65 27 L95 16 L125 28 L155 25 L185 26 L215 15 L245 21 L275 14"
      },
      {
        title: "TOTAL OUTSTANDING",
        value: "₹8,75,230",
        change: "3.2% vs last week",
        trend: "negative",
        icon: <Wallet size={22} />,
        color: "purple",
        spark: "M5 40 L35 22 L65 26 L95 12 L125 24 L155 18 L185 20 L215 35 L245 14 L275 18"
      }
    ];

    return (
      <div className="dashboard-view pro-dashboard">
        <div className="dashboard-page-head">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back! Here's what's happening with your business today.</p>
          </div>
        </div>

        <div className="dashboard-kpi-row">
          {kpis.map((item, index) => (
            <div className="kpi-card pro-kpi-card" key={index}>
              <div className={`kpi-icon-bg ${item.color}`}>{item.icon}</div>

              <div className="kpi-content">
                <div className="kpi-title">{item.title}</div>
                <div className="kpi-value">{item.value}</div>
                <div className={`kpi-change ${item.trend}`}>
                  {item.trend === "positive" ? "▲" : "▼"} {item.change}
                </div>
              </div>

              <svg className={`kpi-sparkline ${item.color}`} viewBox="0 0 280 55" preserveAspectRatio="none">
                <path d={item.spark} strokeWidth="3.2" />
              </svg>
            </div>
          ))}
        </div>

        <div className="dashboard-main-grid">
          <div className="dashboard-card sales-trend-card">
            <div className="card-header">
              <h3>Sales Trend</h3>
              <select className="week-selector">
                <option>This Week</option>
                <option>Last Week</option>
                <option>This Month</option>
              </select>
            </div>

            <ResponsiveContainer width="100%" height={245}>
              <LineChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => `${v / 1000}K`} />
                <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#5b46ff"
                  strokeWidth={4}
                  dot={{ r: 5, strokeWidth: 3, fill: "#fff", stroke: "#5b46ff" }}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="chart-tip">⚡ Tip: Sales peak on Sat. Plan offers accordingly!</div>
          </div>

          {/* <div className="dashboard-card category-card">
            <div className="card-header">
              <h3>Sales by Category</h3>
            </div>

            <div className="category-chart-wrapper">
              <div className="donut-box">
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" innerRadius={62} outerRadius={92} paddingAngle={2}>
                      {categoryData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <span>Total</span>
                  <strong>₹1146K</strong>
                </div>
              </div>

              <div className="category-legend">
                {categoryData.map((cat, index) => (
                  <div className="legend-item" key={index}>
                    <span className="legend-left">
                      <i style={{ background: cat.color }}></i>
                      {cat.name} ({cat.value}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-footer-link">View full report →</div>
          </div> */}
        </div>

        <div className="dashboard-bottom-grid">
          <div className="dashboard-card">
            <h3 className="mini-card-title">Key Metrics</h3>

            <div className="metric-row">
              <div className="metric-icon blue">♙</div>
              <div>
                <span>Today's Sales</span>
                <strong>₹1,25,430</strong>
              </div>
              <em className="up">▲ 6.2%</em>
            </div>

            <div className="metric-row">
              <div className="metric-icon green">⏱</div>
              <div>
                <span>Today's Collection</span>
                <strong className="green-text">₹80,000</strong>
              </div>
              <em className="up">▲ 8.1%</em>
            </div>

            <div className="metric-row">
              <div className="metric-icon red">▣</div>
              <div>
                <span>Today's Outstanding</span>
                <strong className="red-text">₹45,430</strong>
              </div>
              <em className="down">▼ 2.4%</em>
            </div>

            <div className="card-footer-link">View all metrics →</div>
          </div>

          <div className="dashboard-card">
            <h3 className="mini-card-title">Top Products</h3>

            <div className="product-table-head">
              <span>Product</span>
              <span>Sales (₹)</span>
            </div>

            {topProducts.map((p, index) => (
              <div className="product-row" key={index}>
                <span>{p.name}</span>
                <div className="product-bar">
                  <i style={{ width: `${(p.sales / 125430) * 100}%` }}></i>
                </div>
                <strong>{p.sales.toLocaleString("en-IN")}</strong>
              </div>
            ))}

            <div className="card-footer-link">View all products →</div>
          </div>

          <div className="dashboard-card transaction-card">
            <div className="card-header">
              <h3>Recent Transactions</h3>
              <span className="view-link">View all →</span>
            </div>

            <table className="recent-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((t, index) => (
                  <tr key={index}>
                    <td>{t.invoice}</td>
                    <td>{t.customer}</td>
                    <td>₹{t.amount.toLocaleString("en-IN")}</td>
                    <td>
                      <span className={`status-pill ${t.status.toLowerCase()}`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-footer">
          <span>© 2025 Billing Software. All rights reserved.</span>
          <span>Last updated: 2:23:34 PM <b></b></span>
        </div>
      </div>
    );
  };
 const handleInvoiceInputChange = (e) => {
  const { name, value } = e.target;
  setInvoiceFormData({ ...invoiceFormData, [name]: regexInputValue(name, value) });
};

  const addInvoiceItem = useCallback(() => {
  const newItem = {
    id: Date.now(),
    sr: invoiceItems.length + 1,
    product: '',
    units: 'PCS',
    qty: '1',           // Default: 1
    free: '0',          // Default: 0
    mrp: '',
    rate: '',
    rateGst: '',        // NON-EDITABLE
    tprAmt: '0',        // EDITABLE - Default 0
    schemePct: '0',     // Default: 0
    schemeAmt: '0',     // NON-EDITABLE - calculated
    cdPct: '0',         // Default: 0
    cdAmt: '0',         // NON-EDITABLE - calculated
    starPct: '0',       // Default: 0
    starAmt: '0',       // Default: 0
    taxable: '',        // NON-EDITABLE
    gst: '',
    sgst: '',           // NON-EDITABLE
    cgst: '',           // NON-EDITABLE
    amount: ''          // NON-EDITABLE
  };
  setInvoiceItems([...invoiceItems, newItem]);
  setActiveRow(invoiceItems.length);
}, [invoiceItems.length]);

  const updateInvoiceItem = (index, field, value) => {
  // List of non-editable fields - prevent manual changes
  // REMOVED: 'mrp', 'tprAmt' (now editable)
  // ADDED: 'schemeAmt', 'cdAmt' (now non-editable)
  const nonEditableFields = ['rateGst', 'taxable', 'sgst', 'cgst', 'amount', 'schemeAmt', 'cdAmt'];
  
  // Block manual editing of non-editable fields
  if (nonEditableFields.includes(field)) {
    return;
  }
  
  const newItems = [...invoiceItems];
  newItems[index][field] = value;
  
  // ... rest of your existing code remains exactly the same from here

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

  // ========== DECLARATION OF saveInvoice FUNCTION BECAUSE BELOW WE ARE CALLING THIS FUNCTION ==========
const saveVoucherToList = (type, data) => {
  console.log(`Saving ${type}:`, data);
  
  const newEntry = {
    id: editingInvoiceId || Date.now(),  // Use existing ID if editing
    ...data,
    savedAt: new Date().toISOString()
  };

  if (type === 'Sales' || type === 'Billing' || type === 'Quotation') {
    if (editingInvoiceId) {
      // UPDATE existing entry
      setSalesListData(prev => prev.map(item => 
        item.id === editingInvoiceId ? newEntry : item
      ));
      alert('Invoice updated successfully!');
    } else {
      // ADD new entry
      setSalesListData(prev => [...prev, newEntry]);
      alert('Invoice saved successfully!');
    }
  } else if (type === 'Purchase') {
    if (editingInvoiceId) {
      setPurchaseListData(prev => prev.map(item => 
        item.id === editingInvoiceId ? newEntry : item
      ));
      alert('Purchase updated successfully!');
    } else {
      setPurchaseListData(prev => [...prev, newEntry]);
      alert('Purchase saved successfully!');
    }
  } else if (type === 'Credit Note') {
    if (editingInvoiceId) {
      setCreditNoteListData(prev => prev.map(item => 
        item.id === editingInvoiceId ? newEntry : item
      ));
      alert('Credit Note updated successfully!');
    } else {
      setCreditNoteListData(prev => [...prev, newEntry]);
      alert('Credit Note saved successfully!');
    }
  } else if (type === 'Debit Note') {
    if (editingInvoiceId) {
      setDebitNoteListData(prev => prev.map(item => 
        item.id === editingInvoiceId ? newEntry : item
      ));
      alert('Debit Note updated successfully!');
    } else {
      setDebitNoteListData(prev => [...prev, newEntry]);
      alert('Debit Note saved successfully!');
    }
  } else if (type === 'Create Load') {
    if (editingInvoiceId) {
      setCreateLoadListData(prev => prev.map(item => 
        item.id === editingInvoiceId ? newEntry : item
      ));
      alert('Load updated successfully!');
    } else {
      setCreateLoadListData(prev => [...prev, newEntry]);
      alert('Load created successfully!');
    }
  }
  
  // Reset editing mode after save
  setEditingInvoiceId(null);
  return true;
};
// ========== END OF ADDED FUNCTION ==========
  const saveInvoice = () => {
    const invoiceData = {
      ...invoiceFormData,
      items: invoiceItems,
      summary: invoiceSummary,
      amount: invoiceSummary.net,
      partyName: invoiceFormData.party,
      partyCode: invoiceFormData.party?.substring(0, 10),
      branchName: invoiceFormData.area,
      type: activeSubMenu === 'Quotation' ? 'Quotation' : 'Invoice'
    };
    console.log('Saving invoice:', invoiceData);

    if (activeSubMenu === 'Sales' || activeSubMenu === 'Billing') {
      saveVoucherToList('Sales', invoiceData);
      alert('Invoice saved successfully!');
    } else if (activeSubMenu === 'Quotation') {
      saveVoucherToList('Quotation', invoiceData);
      alert('Quotation saved successfully!');
    }

    closeForm();
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
  const cleanValue = regexInputValue(name, value);

  const updatedForm = { ...purchaseFormData, [name]: cleanValue };

  if (['tcbPercent', 'diBc1', 'diBc2', 'diBc3', 'rounding'].includes(name)) {
    setPurchaseFormData(updatedForm);
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
    // Show existing batch modal with proper data
    setBatchMode('existing');
    setCurrentBatchRow(index);
    setExistingBatches(productBatches); // Store the batches for display
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
  const selectedSupplier = otherAccounts.find(acc => 
    acc.accountName === purchaseFormData.supplier && 
    acc.accountGroup === 'SUNDRY CREDITORS'
  );
  
  const purchaseData = {
    ...purchaseFormData,
    items: purchaseItems,
    amount: purchaseFormData.netAmt,
    partyName: purchaseFormData.supplier,
    partyCode: selectedSupplier?.accountCode || purchaseFormData.supplier?.substring(0, 10),
    partyGroup: 'SUNDRY CREDITORS', // Add this to identify supplier type
    branchName: purchaseFormData.storageLocation
  };
  console.log('Saving purchase:', purchaseData);

  // Add to purchase list
  saveVoucherToList('Purchase', purchaseData);

  alert('Purchase saved successfully!');
  closeForm();
};

 
const handleCreditNoteInputChange = (e) => {
  const { name, value } = e.target;
  setCreditNoteFormData({ ...creditNoteFormData, [name]: regexInputValue(name, value) });
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

  // Update saveCreditNote function
  const saveCreditNote = () => {
    const creditNoteData = {
      ...creditNoteFormData,
      items: creditNoteItems,
      summary: creditNoteSummary,
      amount: creditNoteSummary.netAmt,
      partyName: creditNoteFormData.party
    };
    console.log('Saving credit note:', creditNoteData);

    // Add to credit note list
    saveVoucherToList('Credit Note', creditNoteData);

    alert('Credit Note saved successfully!');
    closeForm();
  };
 const handleDebitNoteInputChange = (e) => {
  const { name, value } = e.target;
  setDebitNoteFormData({ ...debitNoteFormData, [name]: regexInputValue(name, value) });
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

  // Update saveDebitNote function
  const saveDebitNote = () => {
    const debitNoteData = {
      ...debitNoteFormData,
      items: debitNoteItems,
      summary: debitNoteSummary,
      amount: debitNoteSummary.netAmt,
      partyName: debitNoteFormData.supplier
    };
    console.log('Saving debit note:', debitNoteData);

    // Add to debit note list
    saveVoucherToList('Debit Note', debitNoteData);

    alert('Debit Note saved successfully!');
    closeForm();
  };
const handleCreateLoadInputChange = (e) => {
  const { name, value } = e.target;
  setCreateLoadFormData({ ...createLoadFormData, [name]: regexInputValue(name, value) });
};

  const addCreateLoadItem = () => {
    const newItem = {
      id: Date.now(),
      sr: createLoadItems.length + 1,
      partyCode: '',
      partyName: '',
      billSeries: '',
      billNo: '',
      billDate: '',
      salesman: '',
      area: '',
      amount: ''
    };
    setCreateLoadItems([...createLoadItems, newItem]);
  };

  const updateCreateLoadItem = (index, field, value) => {
    const newItems = [...createLoadItems];
    newItems[index][field] = value;
    setCreateLoadItems(newItems);
  };

  const deleteCreateLoadItem = (index) => {
    const newItems = createLoadItems.filter((_, i) => i !== index);
    newItems.forEach((item, i) => { item.sr = i + 1; });
    setCreateLoadItems(newItems);
  };
  const saveCreateLoad = () => {
    // Calculate total amount from items
    const totalAmount = createLoadItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    const createLoadData = {
      ...createLoadFormData,
      items: createLoadItems,
      amount: totalAmount,
      totalAmount: totalAmount,
      status: 'Pending'
    };
    console.log('Saving create load:', createLoadData);

    // Add to create load list
    saveVoucherToList('Create Load', createLoadData);

    alert('Load created successfully!');
    closeForm();
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
const handlePrintLoadInputChange = (e) => {
  const { name, value } = e.target;
  setPrintLoadFormData({ ...printLoadFormData, [name]: regexInputValue(name, value) });
};

  const handlePrintLoadSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    if (!printLoadFormData.loadSeries || !printLoadFormData.loadNo) {
      alert('Please fill Load Series and Load No');
      return;
    }

    // Here you would fetch the load data from your backend/state
    // For demo, we'll use sample data
    const sampleLoadData = {
      loadInfo: {
        series: printLoadFormData.loadSeries,
        number: printLoadFormData.loadNo,
        date: new Date().toISOString().split('T')[0],
        company: 'Sample Company',
        salesman: 'John Doe'
      },
      invoices: [
        { sr: 1, partyName: 'Party A', billNo: 'INV-001', amount: 5000, area: 'Area 1', salesman: 'John Doe' },
        { sr: 2, partyName: 'Party B', billNo: 'INV-002', amount: 7500, area: 'Area 2', salesman: 'Jane Smith' },
        { sr: 3, partyName: 'Party C', billNo: 'INV-003', amount: 3000, area: 'Area 1', salesman: 'John Doe' }
      ]
    };

    setPrintLoadItems(sampleLoadData.invoices);
    setShowPrintPreview(true);
    alert('Load data loaded successfully!');
  };

  const generatePrintLayout = () => {
    let sortedData = [...printLoadItems];

    // Sort based on order by selection
    if (printLoadFormData.orderBy === 'product_wise') {
      sortedData.sort((a, b) => a.partyName?.localeCompare(b.partyName || ''));
    } else if (printLoadFormData.orderBy === 'product_code_wise') {
      sortedData.sort((a, b) => (a.partyCode || '').localeCompare(b.partyCode || ''));
    } else if (printLoadFormData.orderBy === 'short_code_wise') {
      sortedData.sort((a, b) => (a.shortCode || '').localeCompare(b.shortCode || ''));
    }

    // Filter by area if area-wise is Yes
    if (printLoadFormData.areaWise === 'Y') {
      // Group by area logic would go here
      console.log('Area wise filtering enabled');
    }

    // Filter by salesman if salesman-wise is Yes
    if (printLoadFormData.salesmanWise === 'Y') {
      // Group by salesman logic would go here
      console.log('Salesman wise filtering enabled');
    }

    return sortedData;
  };

  const handlePrint = () => {
    const printContent = document.getElementById('print-load-content');
    const originalContents = document.body.innerHTML;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Load - ${printLoadFormData.loadSeries} ${printLoadFormData.loadNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .print-header { text-align: center; margin-bottom: 30px; }
            .print-header h1 { margin: 0; color: #333; }
            .print-header p { margin: 5px 0; color: #666; }
            .load-info { margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
            .load-info table { width: 100%; }
            .load-info td { padding: 5px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            table.data-table th, table.data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            table.data-table th { background-color: #4CAF50; color: white; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <div class="footer">
            Printed on: ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportToExcel = () => {
    const sortedData = generatePrintLayout();
    const exportData = sortedData.map((item, index) => ({
      'Sr No': index + 1,
      'Party Name': item.partyName,
      'Bill No': item.billNo,
      'Amount': item.amount,
      'Area': item.area,
      'Salesman': item.salesman
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Print Load');
    XLSX.writeFile(workbook, `Print_Load_${printLoadFormData.loadSeries}_${printLoadFormData.loadNo}.xlsx`);
  };
  // Add this with other state declarations (around line 50-60)
  const [settleLoadDummyData, setSettleLoadDummyData] = useState([
    {
      id: 1,
      loadSeries: 'LD-SER-001',
      loadNo: 'LD-2026-001',
      loadDate: '2026-05-15',
      settleLoadDate: '2026-05-18',
      narration: 'Monthly settlement for May 2026',
      items: [
        {
          id: 101,
          sr: 1,
          billType: 'Credit',
          billDate: '2026-05-10',
          billSeries: 'INV',
          billNo: 'INV-001',
          partyCode: 'CUST-001',
          partyName: 'M/S Shreeji General Store',
          billAmount: 12500.00,
          receiptAmount: 0,
          receiptSeries: '',
          receiptNo: '',
          adjust: 'N',
          pending: 'N',
          cancel: 'N',
          status: 'Pending'
        },
        {
          id: 102,
          sr: 2,
          billType: 'Cash',
          billDate: '2026-05-11',
          billSeries: 'INV',
          billNo: 'INV-002',
          partyCode: 'CUST-002',
          partyName: 'Sharma Enterprises',
          billAmount: 8750.50,
          receiptAmount: 0,
          receiptSeries: '',
          receiptNo: '',
          adjust: 'N',
          pending: 'N',
          cancel: 'N',
          status: 'Pending'
        },
        {
          id: 103,
          sr: 3,
          billType: 'Credit',
          billDate: '2026-05-12',
          billSeries: 'INV',
          billNo: 'INV-003',
          partyCode: 'CUST-003',
          partyName: 'ABC Traders',
          billAmount: 5600.00,
          receiptAmount: 0,
          receiptSeries: '',
          receiptNo: '',
          adjust: 'N',
          pending: 'N',
          cancel: 'N',
          status: 'Pending'
        },
        {
          id: 104,
          sr: 4,
          billType: 'Credit',
          billDate: '2026-05-13',
          billSeries: 'INV',
          billNo: 'INV-004',
          partyCode: 'CUST-004',
          partyName: 'Patel Medical Store',
          billAmount: 3200.00,
          receiptAmount: 0,
          receiptSeries: '',
          receiptNo: '',
          adjust: 'N',
          pending: 'N',
          cancel: 'N',
          status: 'Pending'
        },
        {
          id: 105,
          sr: 5,
          billType: 'Cash',
          billDate: '2026-05-14',
          billSeries: 'INV',
          billNo: 'INV-005',
          partyCode: 'CUST-005',
          partyName: 'Gupta Kirana Store',
          billAmount: 4500.00,
          receiptAmount: 0,
          receiptSeries: '',
          receiptNo: '',
          adjust: 'N',
          pending: 'N',
          cancel: 'N',
          status: 'Pending'
        }
      ],
      summary: {
        totalBills: 5,
        totalCashBills: 2,
        totalCreditBills: 3,
        totalRecAdjBills: 0,
        totalPendingBills: 5,
        totalCancelBills: 0,
        totalAmt: 34550.50,
        totalCashAmt: 13250.50,
        totalCreditAmt: 21300.00,
        totalChequeAmt: 0,
        totalPendingAmt: 34550.50,
        totalCancelAmt: 0
      },
      options: {
        loadLock: false,
        report: false
      },
      status: 'Pending'
    },
    {
      id: 2,
      loadSeries: 'LD-SER-002',
      loadNo: 'LD-2026-002',
      loadDate: '2026-05-10',
      settleLoadDate: '2026-05-12',
      narration: 'Partial settlement for early May',
      items: [
        {
          id: 201,
          sr: 1,
          billType: 'Credit',
          billDate: '2026-05-05',
          billSeries: 'INV',
          billNo: 'INV-101',
          partyCode: 'CUST-006',
          partyName: 'Singh Electricals',
          billAmount: 15000.00,
          receiptAmount: 10000.00,
          receiptSeries: 'REC',
          receiptNo: 'REC-001',
          adjust: 'N',
          pending: 'Y',
          cancel: 'N',
          status: 'Partial'
        },
        {
          id: 202,
          sr: 2,
          billType: 'Credit',
          billDate: '2026-05-06',
          billSeries: 'INV',
          billNo: 'INV-102',
          partyCode: 'CUST-007',
          partyName: 'Joshi Distributors',
          billAmount: 22500.00,
          receiptAmount: 22500.00,
          receiptSeries: 'REC',
          receiptNo: 'REC-002',
          adjust: 'Y',
          pending: 'N',
          cancel: 'N',
          status: 'Settled'
        },
        {
          id: 203,
          sr: 3,
          billType: 'Cash',
          billDate: '2026-05-07',
          billSeries: 'INV',
          billNo: 'INV-103',
          partyCode: 'CUST-008',
          partyName: 'Mehta Traders',
          billAmount: 8500.00,
          receiptAmount: 0,
          receiptSeries: '',
          receiptNo: '',
          adjust: 'N',
          pending: 'N',
          cancel: 'Y',
          status: 'Cancelled'
        }
      ],
      summary: {
        totalBills: 3,
        totalCashBills: 1,
        totalCreditBills: 2,
        totalRecAdjBills: 1,
        totalPendingBills: 1,
        totalCancelBills: 1,
        totalAmt: 46000.00,
        totalCashAmt: 8500.00,
        totalCreditAmt: 37500.00,
        totalChequeAmt: 32500.00,
        totalPendingAmt: 5000.00,
        totalCancelAmt: 8500.00
      },
      options: {
        loadLock: true,
        report: false
      },
      status: 'Settled'
    }
  ]);
  const handleSubMenuClick = (item) => {
    setShowDashboard(false); // Hide dashboard when any menu is clicked
    setActiveSubMenu(item);
    setOpenFormFor(null);
    setAccountActiveTab('basic');
    setOtherAccountActiveTab('basic');
    setEditGstId(null);
    setEditSalesmanId(null);

    // Reset ALL list views FIRST
    setShowSalesList(false);
    setShowPurchaseList(false);
    setShowCreditNoteList(false);
    setShowDebitNoteList(false);
    setShowCreateLoadList(false);
    setShowPrintPreview(false);


    // Handle Logout
    if (item === 'Logout') {
      handleLogout();
      return;
    }

    // Handle Dashboard
    if (item === 'Dashboard') {
      setOpenFormFor(null);
      setActiveSubMenu(null);
      setShowDashboard(true);
      calculateDashboardPerformance();
      return;
    }

    // ========== SHOW LIST VIEWS (NOT FORMS) ==========

    // Handle Billing - SHOW LIST VIEW
    if (item === 'Billing') {
      if (salesListData.length === 0) {
        setSalesListData([
          {
            id: Date.now(),
            billDate: '2026-05-15',
            billSeries: 'INV',
            billNo: 'INV-001',
            billType: 'Credit',
            party: 'M/S Shreeji General Store',
            partyCode: 'CUST-001',
            area: 'Andheri East',
            amount: 12500.00,
            items: [],
            status: 'Pending',
            type: 'Invoice'
          },
          {
            id: Date.now() + 1,
            billDate: '2026-05-14',
            billSeries: 'INV',
            billNo: 'INV-002',
            billType: 'Cash',
            party: 'Sharma Enterprises',
            partyCode: 'CUST-002',
            area: 'Andheri West',
            amount: 8750.50,
            items: [],
            status: 'Paid',
            type: 'Invoice'
          }
        ]);
      }
      setShowSalesList(true);
      return;
    }

    // Handle Quotation - SHOW LIST VIEW
    if (item === 'Quotation') {
      if (salesListData.filter(s => s.type === 'Quotation').length === 0) {
        const quotations = [
          {
            id: Date.now() + 100,
            billDate: '2026-05-16',
            billSeries: 'QUO',
            billNo: 'QUO-001',
            billType: 'Credit',
            party: 'New Customer A',
            partyCode: 'CUST-NEW-001',
            area: 'Vile Parle',
            amount: 5600.00,
            items: [],
            status: 'Draft',
            type: 'Quotation'
          },
          {
            id: Date.now() + 101,
            billDate: '2026-05-15',
            billSeries: 'QUO',
            billNo: 'QUO-002',
            billType: 'Credit',
            party: 'ABC Traders',
            partyCode: 'CUST-ABC-001',
            area: 'Santacruz',
            amount: 12450.00,
            items: [],
            status: 'Draft',
            type: 'Quotation'
          }
        ];
        setSalesListData(prev => [...prev, ...quotations]);
      }
      setShowSalesList(true);
      return;
    }

    // Handle Create Load - SHOW LIST VIEW
    if (item === 'Create Load') {
      if (createLoadListData.length === 0) {
        setCreateLoadListData([
          {
            id: Date.now() + 200,
            loadDate: '2026-05-16',
            loadSeries: 'LD',
            loadNo: 'LD-001',
            company: 'Main Company',
            deliverBoy: 'Rajesh',
            selectedSalesman: 'Krishna Patil',
            totalAmount: 125000.00,
            items: [],
            status: 'Pending'
          },
          {
            id: Date.now() + 201,
            loadDate: '2026-05-15',
            loadSeries: 'LD',
            loadNo: 'LD-002',
            company: 'Main Company',
            deliverBoy: 'Mahesh',
            selectedSalesman: 'Ramesh Sharma',
            totalAmount: 87500.00,
            items: [],
            status: 'Settled'
          }
        ]);
      }
      setShowCreateLoadList(true);
      return;
    }
    // ========== FIXED: Purchase - SHOW LIST VIEW WITH DUMMY DATA ==========
    if (item === 'Purchase') {
      if (purchaseListData.length === 0) {
        setPurchaseListData([
          {
            id: Date.now(),
            invoiceDate: '2026-05-15',
            invoiceNumber: 'PUR-001',
            supplier: 'Wholesale Supplier A',
            company: 'Main Company',
            storageLocation: 'Main Godown',
            amount: 45800.00,
            status: 'Received',
            billDate: '2026-05-15',
            billNo: 'PUR-001',
            partyName: 'Wholesale Supplier A',
            branchName: 'Main Godown'
          },
          {
            id: Date.now() + 1,
            invoiceDate: '2026-05-14',
            invoiceNumber: 'PUR-002',
            supplier: 'Electronics Distributors',
            company: 'Main Company',
            storageLocation: 'Branch Godown',
            amount: 124500.00,
            status: 'Pending',
            billDate: '2026-05-14',
            billNo: 'PUR-002',
            partyName: 'Electronics Distributors',
            branchName: 'Branch Godown'
          }
        ]);
      }
      setOpenFormFor(null); // Make sure no form is open
      setShowPurchaseList(true);
      return;
    }
    // ========== FIXED: Credit Note - SHOW LIST VIEW WITH DUMMY DATA ==========
    if (item === 'Credit Note') {
      if (creditNoteListData.length === 0) {
        setCreditNoteListData([
          {
            id: Date.now(),
            billDate: '2026-05-15',  // Changed from vDate to match renderVoucherList
            billSeries: 'CN',         // Added billSeries
            billNo: 'CN-001',         // Changed from vNo to billNo
            billType: 'Credit',       // Added billType
            partyCode: 'PARTY-001',   // Added partyCode
            party: 'M/S Shreeji General Store',  // Kept party
            partyName: 'M/S Shreeji General Store', // Added partyName
            branchName: 'Andheri East',
            amount: 1250.00,
            items: [
              { sr: 1, product: 'Damaged Product', quantity: 5, rate: 250, amount: 1250 }
            ],
            status: 'Approved',
            vDate: '2026-05-15',      // Keep original for reference
            vNo: 'CN-001'             // Keep original for reference
          },
          {
            id: Date.now() + 1,
            billDate: '2026-05-14',
            billSeries: 'CN',
            billNo: 'CN-002',
            billType: 'Credit',
            partyCode: 'PARTY-002',
            party: 'Sharma Enterprises',
            partyName: 'Sharma Enterprises',
            branchName: 'Andheri West',
            amount: 500.00,
            items: [
              { sr: 1, product: 'Returned Item', quantity: 2, rate: 250, amount: 500 }
            ],
            status: 'Pending',
            vDate: '2026-05-14',
            vNo: 'CN-002'
          },
          {
            id: Date.now() + 2,
            billDate: '2026-05-13',
            billSeries: 'CN',
            billNo: 'CN-003',
            billType: 'Credit',
            partyCode: 'PARTY-003',
            party: 'ABC Traders',
            partyName: 'ABC Traders',
            branchName: 'Santacruz',
            amount: 2500.00,
            items: [
              { sr: 1, product: 'Discount Adjustment', quantity: 1, rate: 2500, amount: 2500 }
            ],
            status: 'Approved',
            vDate: '2026-05-13',
            vNo: 'CN-003'
          }
        ]);
      }
      setOpenFormFor(null);
      setShowCreditNoteList(true);
      return;
    }
    // ========== FIXED: Debit Note - SHOW LIST VIEW WITH DUMMY DATA ==========
    if (item === 'Debit Note') {
      if (debitNoteListData.length === 0) {
        setDebitNoteListData([
          {
            id: Date.now(),
            billDate: '2026-05-15',
            billSeries: 'DN',
            billNo: 'DN-001',
            billType: 'Debit',
            partyCode: 'SUPPLIER-001',
            party: 'Wholesale Supplier A',
            partyName: 'Wholesale Supplier A',
            supplier: 'Wholesale Supplier A',
            branchName: 'Main Godown',
            amount: 500.00,
            items: [
              { sr: 1, product: 'Shortage Claim', quantity: 1, rate: 500, amount: 500 }
            ],
            status: 'Approved',
            vDate: '2026-05-15',
            vNo: 'DN-001'
          },
          {
            id: Date.now() + 1,
            billDate: '2026-05-14',
            billSeries: 'DN',
            billNo: 'DN-002',
            billType: 'Debit',
            partyCode: 'SUPPLIER-002',
            party: 'Electronics Distributors',
            partyName: 'Electronics Distributors',
            supplier: 'Electronics Distributors',
            branchName: 'Branch Godown',
            amount: 1500.00,
            items: [
              { sr: 1, product: 'Price Difference', quantity: 1, rate: 1500, amount: 1500 }
            ],
            status: 'Pending',
            vDate: '2026-05-14',
            vNo: 'DN-002'
          }
        ]);
      }
      // IMPORTANT: Close any open form and show the list
      setOpenFormFor(null);
      setShowDebitNoteList(true);
      return;
    }
    // ========== THESE OPEN FORMS IMMEDIATELY (no list view) ==========
    if (item === 'Print Load') {
      return;
    }

    if (item === 'Bill Print') {
      return;
    }

    // Inside handleSubMenuClick function, update the Settle Load case:

    if (item === 'Settle Load') {
      // Open the settle load form directly
      setActiveSubMenu(item);
      setOpenFormFor(item);
      setShowSettleLoad(true);

      // Load dummy data or existing data
      if (settleLoadDummyData[0] && settleLoadDummyData[0].items) {
        const transformedItems = settleLoadDummyData[0].items.map((item, index) => ({
          id: item.id || Date.now() + index,
          sr: index + 1,
          adjust: item.adjust || 'N',
          pending: item.pending || 'N',
          cancel: item.cancel || 'N',
          receiptSeries: item.receiptSeries || '',
          receiptNo: item.receiptNo || '',
          status: item.status || 'Pending',
          billType: item.billType || 'Credit',
          billDate: item.billDate || settleLoadDummyData[0].loadDate,
          billSeries: item.billSeries || '',
          billNo: item.billNo || '',
          partyCode: item.partyCode || '',
          partyName: item.partyName || '',
          billAmount: parseFloat(item.billAmount) || 0,
          receiptAmount: parseFloat(item.receiptAmount) || 0,
          chequeNo: item.chequeNo || '',
          chequeDate: item.chequeDate || '',
          bankName: item.bankName || '',
          receiptMode: item.receiptMode || ''
        }));
        setSettleLoadItems(transformedItems);
        setOriginalSettleLoadItems(JSON.parse(JSON.stringify(transformedItems))); // Store deep copy for search reset
        calculateSettleLoadSummary(transformedItems);
      } else {
        setSettleLoadItems([]);
        setOriginalSettleLoadItems([]);
      }

      setSettleLoadFormData({
        loadNo: settleLoadDummyData[0]?.loadNo || '',
        loadDate: settleLoadDummyData[0]?.loadDate || new Date().toISOString().split('T')[0],
        settleLoadDate: new Date().toISOString().split('T')[0],
        narration: settleLoadDummyData[0]?.narration || ''
      });

      setSettleLoadOptions({
        loadLock: false,
        report: false
      });
      return;
    }

    // For all master items - show message to click plus button
    if (item !== 'Billing' && item !== 'Quotation' && item !== 'Create Load' &&
      item !== 'Purchase' && item !== 'Credit Note' && item !== 'Debit Note' &&
      item !== 'Print Load' && item !== 'Settle Load' && item !== 'Bill Print' &&
      item !== 'Dashboard' && item !== 'Firm Creation' && item !== 'User Creation') {

      return;
    }
  };
  const handlePlusClick = (item, e) => {
    if (e) e.stopPropagation();

    // Reset ALL list views FIRST
     setEditingInvoiceId(null);
    setShowSalesList(false);
    setShowPurchaseList(false);
    setShowCreditNoteList(false);
    setShowDebitNoteList(false);
    setShowCreateLoadList(false);
    setShowPrintPreview(false);

    // Set active submenu and open form
    setActiveSubMenu(item);
    setOpenFormFor(item);

    // Reset tabs and edit states
    setAccountActiveTab('basic');
    setOtherAccountActiveTab('basic');
    setEditGstId(null);
    setEditSalesmanId(null);
    setEditGodownId(null);
    setEditCustomerBankId(null);

    if (item === 'Settle Load') {
      // Load dummy data when plus button is clicked
      setSettleLoadFormData({
        loadNo: settleLoadDummyData[0]?.loadNo || '',
        loadDate: settleLoadDummyData[0]?.loadDate || new Date().toISOString().split('T')[0],
        settleLoadDate: new Date().toISOString().split('T')[0],
        narration: settleLoadDummyData[0]?.narration || ''
      });

      // Transform dummy data to settle load items
      if (settleLoadDummyData[0]?.items) {
        const transformedItems = settleLoadDummyData[0].items.map((item, index) => ({
          id: item.id || Date.now() + index,
          sr: index + 1,
          adjust: item.adjust || 'N',
          pending: item.pending || 'N',
          cancel: item.cancel || 'N',
          receiptSeries: item.receiptSeries || '',
          receiptNo: item.receiptNo || '',
          status: item.status || 'Pending',
          billType: item.billType || 'Credit',
          billDate: item.billDate || settleLoadDummyData[0].loadDate,
          billSeries: item.billSeries || '',
          billNo: item.billNo || '',
          partyCode: item.partyCode || '',
          partyName: item.partyName || '',
          billAmount: parseFloat(item.billAmount) || 0,
          receiptAmount: parseFloat(item.receiptAmount) || 0,
          chequeNo: item.chequeNo || '',
          chequeDate: item.chequeDate || '',
          bankName: item.bankName || '',
          receiptMode: item.receiptMode || ''
        }));
        setSettleLoadItems(transformedItems);
        calculateSettleLoadSummary(transformedItems);
      } else {
        setSettleLoadItems([]);
        setSettleLoadSummary({
          totalBills: 0,
          totalCashBills: 0,
          totalCreditBills: 0,
          totalRecAdjBills: 0,
          totalPendingBills: 0,
          totalCancelBills: 0,
          previousCollection: 0,
          totalAmt: 0,
          totalCashAmt: 0,
          totalCreditAmt: 0,
          totalChequeAmt: 0,
          totalPendingAmt: 0,
          totalCancelAmt: 0
        });
      }

      setSettleLoadOptions({
        loadLock: false,
        report: false
      });
      setShowSettleLoad(true);
      return;
    }
    // ========== REST OF YOUR EXISTING CODE ==========
    if (item === 'Billing') {
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
    else if (item === 'Quotation') {
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
    else if (item === 'Create Load') {
      setCreateLoadItems([]);
      setCreateLoadFormData({
        loadSeries: '',
        loadNo: '',
        loadDate: new Date().toISOString().split('T')[0],
        company: '',
        deliverBoy: '',
        selectedSalesman: '',
        billFromDate: new Date().toISOString().split('T')[0],
        billToDate: new Date().toISOString().split('T')[0],
        narration: '',
        deliveryBy: ''
      });
    }
    else if (item === 'Purchase') {
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
    else if (item === 'Credit Note') {
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
    else if (item === 'Debit Note') {
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
    else if (item === 'Print Load') {
      setPrintLoadFormData({
        loadSeries: '',
        loadNo: '',
        reportLevel: '',
        printOn: '',
        areaWise: 'N',
        salesmanWise: 'N',
        printLayout: 'portrait',
        orderBy: 'product_wise'
      });
      setPrintLoadItems([]);
      setShowPrintPreview(false);
    }
    else if (item === 'Bill Print') {
      setBillPrintFormData({
        LoadSeries: '',
        Trnseries: '',
        FromTrnno: '',
        Totrnno: '',
        NoOfCopies: '',
        loadNo: '',
        Goodsreturn: 'N',
        damageReturn: 'original',
        SchemeSummary: 'Y',
        VatSummary: 'Y',
        HSNSummary: 'Y',
        printType: 'original',
        invoiceNumber: `INV-${Date.now()}`
      });
      setShowBillPrintPreview(false);
      setBillPrintData(null);
    }
    else if (item === 'Service') {
      resetServiceForm();
    }
    else if (item === 'GoDown Master') {
      setGodownForm({ code: '', name: '', address: '', location: '' });
    }
    else if (item === 'Customer Bank Master') {
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
    }
    else if (item === 'GST Master') {
      setGstForm({ code: '', vat: '', purchaseType: 'VAT ON PURCHASE PRICE', salesType: 'VAT ON SALES PRICE' });
    }
    else if (item === 'Salesman') {
      setSalesmanForm({ code: '', name: '', type: 'SALESMAN', address: '', town: '', pinCode: '', state: '', country: '', phoneNo: '', mobileNo: '', emailId: '', dateOfBirth: '', qualification: '', reference: '', imeiNo: '' });
    }
    else if (item === 'Firm Creation') {
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
    }
    else if (item === 'User Creation') {
      setUserData({
        userName: '',
        oldPassword: '',
        password: '',
        reEnterPassword: ''
      });
    }
  };
  const closeForm = () => {
  setOpenFormFor(null);
  setEditGstId(null);
  setEditSalesmanId(null);
  setEditGodownId(null);
  setEditingInvoiceId(null);  // ADD THIS LINE
};

  useEffect(() => {
    if (activeSubMenu === 'Billing' && invoiceItems.length === 0) {
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


  useEffect(() => {
  const handleOpenSettleLoad = () => {
    setActiveMenu("sales");
    setActiveSubMenu("Settle Load");
    setShowDashboard(false);
    setShowSettleLoad(true);
    setOpenFormFor(null);
  };

  window.addEventListener("openSettleLoad", handleOpenSettleLoad);

  return () => {
    window.removeEventListener("openSettleLoad", handleOpenSettleLoad);
  };
}, []);
 const handleGstInput = (e) => {
  const { name, value } = e.target;
  setGstForm({ ...gstForm, [name]: regexInputValue(name, value) });
};
  // Add this useEffect to set Dashboard as default when component mounts
  useEffect(() => {
    // Set Dashboard as default active view on login
    setActiveSubMenu(null);
    setShowDashboard(false);
    calculateDashboardPerformance();
  }, []);
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

const handleSalesmanInput = (e) => {
  const { name, value } = e.target;
  setSalesmanForm({ ...salesmanForm, [name]: regexInputValue(name, value) });
};

  const saveSalesman = (e) => {
  e.preventDefault();

  if (!validateFormRegex(salesmanForm)) return;

  if (!salesmanForm.code || !salesmanForm.name) {
    return alert('Code and Name required');
  }

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

  setSalesmanForm({
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
  const { name, value } = e.target;
  setCompanyForm({ ...companyForm, [name]: regexInputValue(name, value) });
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
  setProductForm({
    ...productForm,
    [name]: type === 'checkbox' ? checked : regexInputValue(name, value)
  });
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

 const handleAccountInput = (e) => {
  const { name, value, type, checked } = e.target;
  setAccountForm({
    ...accountForm,
    [name]: type === 'checkbox' ? checked : regexInputValue(name, value)
  });
};
const saveAccount = (e) => {
  e.preventDefault();

  if (!validateFormRegex(accountForm)) return;

  if (!accountForm.accountCode || !accountForm.accountName) {
    return alert('Account Code and Name required');
  }

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

  const handleOtherAccountInput = (e) => {
  const { name, value } = e.target;
  setOtherAccountForm({ ...otherAccountForm, [name]: regexInputValue(name, value) });
};
const saveOtherAccount = (e) => {
  e.preventDefault();

  if (!validateFormRegex(otherAccountForm)) return;

  if (!otherAccountForm.accountCode || !otherAccountForm.accountName) {
    return alert('Account Code and Name required');
  }

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
  // Replace the existing renderDataTable function with this modified version:

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
                  <th className="actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(item => (
                  <tr key={item.id}>
                    {columns.map(col => <td key={col.key}>{item[col.key] || '-'}</td>)}
                    <td className="action-buttons-cell">
                      <div className="action-buttons-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          className="action-btn action-btn-view"
                          onClick={() => {
                            // View action - can be implemented as needed
                            alert(`View ${title} item: ${item.name || item.code || item.accountName || 'details'}`);
                          }}
                          title="View"
                          style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                        >
                          👁️ View
                        </button>
                        <button
                          className="action-btn action-btn-edit"
                          onClick={() => {
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
                          }}
                          title="Edit"
                          style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="action-btn action-btn-delete"
                          onClick={() => onDelete(item.id)}
                          title="Delete"
                          style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                        >
                          🗑 Delete
                        </button>
                      </div>
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
const renderVoucherList = (title, data, columns) => {
  // Calculate maximum content width for each column dynamically
  const calculateColumnWidths = (items) => {
    const widths = {
      date: { min: 100, max: 120 },
      billSeries: { min: 90, max: 110 },
      billNumber: { min: 100, max: 140 },
      billType: { min: 80, max: 100 },
      partyCode: { min: 110, max: 180 },
      partyName: { min: 180, max: 350 },
      branchName: { min: 160, max: 300 },
      amount: { min: 120, max: 150 },
      loadSeries: { min: 90, max: 110 },
      loadNumber: { min: 100, max: 140 },
      status: { min: 100, max: 120 },
      actions: { width: 300 } // Fixed width for actions
    };

    // Calculate actual widths based on content
    items.forEach(item => {
      if (widths.date && item.date && item.date.length * 8 > widths.date.max) widths.date.max = item.date.length * 8;
      if (widths.billSeries && item.billSeries !== '-' && item.billSeries.length * 8 > widths.billSeries.max) widths.billSeries.max = item.billSeries.length * 8;
      if (widths.billNumber && item.billNumber !== '-' && item.billNumber.length * 8 > widths.billNumber.max) widths.billNumber.max = item.billNumber.length * 8;
      if (widths.partyCode && item.partyCode !== '-' && item.partyCode.length * 8 > widths.partyCode.max) widths.partyCode.max = item.partyCode.length * 8;
      if (widths.partyName && item.partyName !== '-' && item.partyName.length * 9 > widths.partyName.max) widths.partyName.max = Math.min(item.partyName.length * 9, 450);
      if (widths.branchName && item.branchName !== '-' && item.branchName.length * 9 > widths.branchName.max) widths.branchName.max = Math.min(item.branchName.length * 9, 380);
      if (widths.amount && item.amount.toString().length * 10 > widths.amount.max) widths.amount.max = item.amount.toString().length * 10;
    });

    return widths;
  };

  const standardColumns = [
    { key: 'date', label: 'Date' },
    { key: 'billSeries', label: 'Bill Series' },
    { key: 'billNumber', label: 'Bill Number' },
    { key: 'billType', label: 'Bill Type' },
    { key: 'partyCode', label: 'Party Code' },
    { key: 'partyName', label: 'Party Name' },
    { key: 'branchName', label: 'Branch Name' },
    { key: 'amount', label: 'Amount (₹)' },
    { key: 'loadSeries', label: 'Load Series' },
    { key: 'loadNumber', label: 'Load Number' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' }
  ];

  const transformedData = data.map(item => ({
    id: item.id,
    date: item.billDate || item.invoiceDate || item.vDate || item.date || '-',
    billSeries: item.billSeries || item.BillSeries || '-',
    billNumber: item.billNo || item.invoiceNumber || item.vNo || '-',
    billType: item.billType || '-',
    partyCode: item.partyCode || item.supplierCode || '-',
    partyName: item.party || item.supplier || item.partyName || '-',
    branchName: item.branchName || item.area || item.storageLocation || '-',
    amount: parseFloat(item.amount) || parseFloat(item.netAmt) || parseFloat(item.totalAmount) || 0,
    loadSeries: item.loadSeries || '-',
    loadNumber: item.loadNumber || '-',
    status: item.status || (item.amount ? 'Pending' : 'Draft'),
    originalItem: item
  }));

  // Calculate dynamic column widths
  const columnWidths = calculateColumnWidths(transformedData);

  const getStatusBadgeClass = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'paid' || statusLower === 'approved' || statusLower === 'received' || statusLower === 'settled') {
      return 'status-badge status-success';
    } else if (statusLower === 'pending' || statusLower === 'draft') {
      return 'status-badge status-warning';
    } else if (statusLower === 'cancelled' || statusLower === 'rejected') {
      return 'status-badge status-danger';
    }
    return 'status-badge status-info';
  };

  const getType = () => {
    if (title.includes('Sales')) return 'Sales';
    if (title.includes('Purchase')) return 'Purchase';
    if (title.includes('Credit Note')) return 'Credit Note';
    if (title.includes('Debit Note')) return 'Debit Note';
    return title;
  };

  const type = getType();

  // Generate professional invoice preview HTML for A4 Portrait
  const generateInvoicePreviewHTML = (item) => {
    const data = item.originalItem;
    
    // Invoice data structure based on the provided image
    const invoiceData = {
      firmDetails: {
        name: "RAJKUMAR PENURKAR",
        address: "S NO 58 SAI NAGAR GALLI NO 4 NEAR SHANKAR MANDIR GOUKLNAGER KONDHWA",
        phone: "9011585811 / 9011585811",
        gstin: "27BCRPS8746P1Z7",
        fssai: "11518035000600"
      },
      receiverDetails: {
        name: "CHITAMANI MEDICAL",
        address: "SHOP NO 15 GROUND FLOOR HEERABAUG BUSINESS CENTRE",
        gstin: "27AA0FC4285D1ZB",
        state: "MAHARASHTRA STATE CODE:27",
        city: "SHUKRWAR PETH PUNE 2",
        phone: "9011585811"
      },
      consigneeDetails: {
        name: "CHITAMANI MEDICAL",
        address: "SHOP NO 15 GROUND FLOOR HEERABAUG BUSINESS CENTRE",
        gstin: "27AA0FC4285D1ZB",
        state: "MAHARASHTRA STATE CODE:27",
        city: "SHUKRWAR PETH PUNE 2"
      },
      invoiceInfo: {
        number: data.billNo || data.invoiceNumber || "Satur2771",
        date: data.billDate || data.invoiceDate || "28/09/2021 22:18",
        poNumber: "Font Style",
        foodLicNo: "Single box, double",
        beat: "GANJPETH"
      },
      products: [
        { sr: 1, name: "Aqua Yellow", hsn: "155.54", mrp: 42, unit: "Pcs", qty: 2, rate: 701.78, taxableAmt: 1403.56, cgst: 126.32, sgst: 126.32, netAmt: 1656.20 },
        { sr: 2, name: "Yellow Green", hsn: "258.44", mrp: 310, unit: "Pcs", qty: 1, rate: 701.78, taxableAmt: 701.78, cgst: 63.16, sgst: 63.16, netAmt: 828.10 },
        { sr: 3, name: "Olive Purple", hsn: "217.94", mrp: 148, unit: "Pcs", qty: 1, rate: 478.14, taxableAmt: 478.14, cgst: 43.04, sgst: 43.04, netAmt: 564.21 },
        { sr: 4, name: "Silver Fuchsia", hsn: "213.42", mrp: 64, unit: "Pcs", qty: 6, rate: 520.55, taxableAmt: 3123.30, cgst: 281.10, sgst: 281.10, netAmt: 3685.49 },
        { sr: 5, name: "Aqua Navy", hsn: "245.86", mrp: 300, unit: "Pcs", qty: 1, rate: 520.55, taxableAmt: 520.55, cgst: 46.86, sgst: 46.86, netAmt: 614.27 }
      ],
      summary: {
        grossAmt: 6227.33,
        taxableAmt: -628.05,
        scheDisc: 589.73,
        cgstAmt: 44.88,
        sgstAmt: 44.88,
        starDisc: 502.71,
        tcsAmt: 55.57,
        rounding: 212.83,
        netAmount: 263.17
      },
      bankDetails: {
        accountNo: "00160010921",
        ifsc: "COSB0000001",
        branch: "PARVATI DARSHAN, PUNE",
        accountType: "CC"
      }
    };

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>TAX INVOICE - ${invoiceData.invoiceInfo.number}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', 'Segoe UI', Arial, sans-serif;
          background: #e2e8f0;
          padding: 20px;
          font-size: 10px;
        }
        
        /* A4 Portrait Layout */
        .invoice-wrapper {
          max-width: 210mm;
          width: 210mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          min-height: 297mm;
        }
        
        .invoice {
          padding: 15px 20px;
          background: white;
        }
        
        /* Header Section */
        .header-section {
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        
        .firm-details {
          text-align: center;
          margin-bottom: 10px;
        }
        
        .firm-name {
          font-size: 18px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        
        .firm-address {
          font-size: 9px;
          line-height: 1.3;
          color: #333;
        }
        
        .firm-contact {
          font-size: 9px;
          margin-top: 3px;
        }
        
        .gst-fssai {
          font-size: 8px;
          margin-top: 2px;
          color: #555;
        }
        
        /* Horizontal Layout for all sections */
        .details-section {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .info-card {
          flex: 1;
          min-width: 200px;
          border: 1px solid #ddd;
          padding: 10px;
          background: #fff;
        }
        
        .info-title {
          font-weight: bold;
          font-size: 10px;
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #ccc;
          background: none;
          padding: 0 0 4px 0;
        }
        
        .info-row {
          margin-bottom: 4px;
          font-size: 9px;
          line-height: 1.3;
        }
        
        .info-label {
          font-weight: 600;
          min-width: 90px;
          display: inline-block;
        }
        
        /* Invoice Title */
        .invoice-title-section {
          text-align: center;
          margin: 10px 0;
        }
        
        .invoice-title {
          font-size: 16px;
          font-weight: bold;
          letter-spacing: 2px;
          background: #f0f0f0;
          display: inline-block;
          padding: 4px 20px;
        }
        
        .invoice-subtitle {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-top: 6px;
          font-size: 9px;
        }
        
        /* Product Table - Compact for A4 */
        .product-table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
          font-size: 8px;
        }
        
        .product-table th {
          background: #e8e8e8;
          border: 1px solid #999;
          padding: 5px 2px;
          font-weight: bold;
          text-align: center;
          font-size: 8px;
        }
        
        .product-table td {
          border: 1px solid #999;
          padding: 4px 2px;
          text-align: center;
          font-size: 8px;
        }
        
        .product-table td:first-child,
        .product-table th:first-child {
          text-align: center;
        }
        
        .product-table td:nth-child(2) {
          text-align: left;
        }
        
        /* Summary Section - Clean horizontal layout without boxes */
        .summary-section {
          margin: 15px 0;
          padding: 10px 0;
          border-top: 1px solid #ccc;
          border-bottom: 1px solid #ccc;
        }
        
        .summary-grid {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-width: 150px;
          padding: 5px 10px;
        }
        
        .summary-label {
          font-weight: 600;
          margin-right: 10px;
        }
        
        .summary-value {
          font-weight: 500;
        }
        
        .net-amount-item {
          font-weight: bold;
          font-size: 12px;
          background: #f0f0f0;
          padding: 8px 15px;
          border-radius: 4px;
        }
        
        /* Bank Details - Clean style */
        .bank-details {
          margin: 10px 0;
          padding: 8px 0;
          font-size: 8px;
        }
        
        .bank-grid {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        
        /* Footer */
        .footer-section {
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid #ccc;
        }
        
        .declaration {
          font-size: 8px;
          font-style: italic;
          margin-bottom: 8px;
        }
        
        .signature-row {
          display: flex;
          justify-content: space-between;
          margin-top: 15px;
        }
        
        .signature-line {
          border-top: 1px solid #000;
          width: 200px;
          padding-top: 4px;
          font-size: 8px;
          text-align: center;
        }
        
        .total-words {
          font-size: 8px;
          margin: 8px 0;
          font-weight: bold;
        }
        
        .no-print {
          text-align: center;
          margin-top: 20px;
        }
        
        .no-print button {
          padding: 8px 16px;
          margin: 5px;
          background: #1e3a8a;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }
        
        .no-print button:hover {
          background: #1e40af;
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none;
          }
          .invoice-wrapper {
            box-shadow: none;
            width: 100%;
            max-width: 210mm;
            margin: 0;
            padding: 0;
          }
          .invoice {
            padding: 10px;
          }
        }
        
        @page {
          size: A4;
          margin: 10mm;
        }
      </style>
    </head>
    <body>
      <div class="invoice-wrapper">
        <div class="invoice">
          <!-- Firm Header -->
          <div class="header-section">
            <div class="firm-details">
              <div class="firm-name">${invoiceData.firmDetails.name}</div>
              <div class="firm-address">${invoiceData.firmDetails.address}</div>
              <div class="firm-contact">📞 ${invoiceData.firmDetails.phone}</div>
              <div class="gst-fssai">GSTIN: ${invoiceData.firmDetails.gstin} | FSSAI: ${invoiceData.firmDetails.fssai}</div>
            </div>
          </div>
          
          <!-- TAX INVOICE Title -->
          <div class="invoice-title-section">
            <div class="invoice-title">TAX INVOICE</div>
            <div class="invoice-subtitle">
              <span>INVOICE NO: ${invoiceData.invoiceInfo.number}</span>
              <span>INVOICE DATE: ${invoiceData.invoiceInfo.date}</span>
              <span>PO NUMBER: ${invoiceData.invoiceInfo.poNumber}</span>
            </div>
          </div>
          
          <!-- Three Column Horizontal Layout for Details (one beside each other) -->
          <div class="details-section">
            <div class="info-card">
              <div class="info-title">DETAILS OF CONSIGNEE (SHIPPED TO)</div>
              <div class="info-row"><strong>${invoiceData.consigneeDetails.name}</strong></div>
              <div class="info-row">${invoiceData.consigneeDetails.address}</div>
              <div class="info-row">GSTIN/UNIQUE ID: ${invoiceData.consigneeDetails.gstin}</div>
              <div class="info-row">STATE: ${invoiceData.consigneeDetails.state}</div>
              <div class="info-row">${invoiceData.consigneeDetails.city}</div>
            </div>
            
            <div class="info-card">
              <div class="info-title">DETAILS OF RECEIVER (BILLED TO)</div>
              <div class="info-row"><strong>${invoiceData.receiverDetails.name}</strong></div>
              <div class="info-row">${invoiceData.receiverDetails.address}</div>
              <div class="info-row">GSTIN/UNIQUE ID: ${invoiceData.receiverDetails.gstin}</div>
              <div class="info-row">STATE: ${invoiceData.receiverDetails.state}</div>
              <div class="info-row">${invoiceData.receiverDetails.city}</div>
              <div class="info-row">Phone: ${invoiceData.receiverDetails.phone}</div>
            </div>
            
            <div class="info-card">
              <div class="info-title">INVOICE DETAILS</div>
              <div class="info-row"><span class="info-label">Firm Food Lic No:</span> ${invoiceData.invoiceInfo.foodLicNo}</div>
              <div class="info-row"><span class="info-label">Beat:</span> ${invoiceData.invoiceInfo.beat}</div>
            </div>
          </div>
          
          <!-- Product Table -->
          <table class="product-table">
            <thead>
              <tr>
                <th>SR</th>
                <th>Product Name</th>
                <th>HSN</th>
                <th>MRP</th>
                <th>Unit</th>
                <th>Qty</th>
                <th>Fr.</th>
                <th>Rate</th>
                <th>Taxable Amt</th>
                <th>CGST</th>
                <th>SGST</th>
                <th>Net Amt</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.products.map(product => `
                <tr>
                  <td>${product.sr}</td>
                  <td style="text-align:left">${product.name}</td>
                  <td>${product.hsn}</td>
                  <td>${product.mrp}</td>
                  <td>${product.unit}</td>
                  <td>${product.qty}</td>
                  <td>-</td>
                  <td>${product.rate.toFixed(2)}</td>
                  <td>${product.taxableAmt.toFixed(2)}</td>
                  <td>${product.cgst.toFixed(2)}</td>
                  <td>${product.sgst.toFixed(2)}</td>
                  <td>${product.netAmt.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f0f0f0;">
                <td colspan="8" style="text-align:right; font-weight:bold;">Total</td>
                <td style="font-weight:bold;">₹${invoiceData.products.reduce((sum, p) => sum + p.taxableAmt, 0).toFixed(2)}</td>
                <td style="font-weight:bold;">₹${invoiceData.products.reduce((sum, p) => sum + p.cgst, 0).toFixed(2)}</td>
                <td style="font-weight:bold;">₹${invoiceData.products.reduce((sum, p) => sum + p.sgst, 0).toFixed(2)}</td>
                <td style="font-weight:bold;">₹${invoiceData.products.reduce((sum, p) => sum + p.netAmt, 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <!-- Summary Section - Clean without boxes, horizontal layout -->
          <div class="summary-section">
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">TAXABLE AMT:</span>
                <span class="summary-value">₹${invoiceData.summary.taxableAmt.toFixed(2)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Sche/Cash:</span>
                <span class="summary-value">₹${invoiceData.summary.scheDisc.toFixed(2)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">CGST AMT:</span>
                <span class="summary-value">₹${invoiceData.summary.cgstAmt.toFixed(2)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">SGST AMT:</span>
                <span class="summary-value">₹${invoiceData.summary.sgstAmt.toFixed(2)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">CN/STAR/DIS:</span>
                <span class="summary-value">₹${invoiceData.summary.starDisc.toFixed(2)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">TCS Amt:</span>
                <span class="summary-value">₹${invoiceData.summary.tcsAmt.toFixed(2)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">ROUNDING:</span>
                <span class="summary-value">₹${invoiceData.summary.rounding.toFixed(2)}</span>
              </div>
              <div class="summary-item net-amount-item">
                <span class="summary-label"><strong>NET AMOUNT:</strong></span>
                <span class="summary-value"><strong>₹${invoiceData.summary.netAmount.toFixed(2)}</strong></span>
              </div>
            </div>
          </div>
          
          <!-- Total in Words -->
          <div class="total-words">
            <strong>Tot Value (Words):</strong> RS. Two Hundred Sixty-Three And Seventeen Paisa Only
          </div>
          
          <!-- Bank Details - Clean without box -->
          <div class="bank-details">
            <div class="bank-grid">
              <span><strong>A/c No:</strong> ${invoiceData.bankDetails.accountNo}</span>
              <span><strong>IFSC:</strong> ${invoiceData.bankDetails.ifsc}</span>
              <span><strong>Branch:</strong> ${invoiceData.bankDetails.branch}</span>
              <span><strong>A/c Type:</strong> ${invoiceData.bankDetails.accountType}</span>
            </div>
          </div>
          
          <!-- Declaration and Signature -->
          <div class="footer-section">
            <div class="declaration">
              Declaration: Certified that the particulars given above are true and correct and the amount indicated.
            </div>
            
            <div class="signature-row">
              <div>
                <div class="signature-line">Receiver's Stamp & Sign.</div>
              </div>
              <div>
                <div class="signature-line">FOR RAJKUMAR PENURKAR</div>
                <div style="font-size:8px; text-align:center; margin-top:3px">Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="no-print">
        <button onclick="window.print()">🖨️ Print Invoice (A4)</button>
        <button onclick="window.close()">❌ Close</button>
      </div>
    </body>
    </html>`;
  };

  // Handle Print
  const handlePrintVoucher = (item) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(generateInvoicePreviewHTML(item));
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 100);
  };

  // Handle Preview
  const handlePreviewVoucher = (item) => {
    const previewWindow = window.open('', '_blank', 'width=900,height=700');
    previewWindow.document.write(generateInvoicePreviewHTML(item));
    previewWindow.document.close();
  };

  return (
    <div className="master-section grid-section">
      <div className="grid-header">
        <h3>{title} List ({transformedData.length})</h3>
        <div className="table-controls">
          <input
            type="text"
            placeholder="Search..."
            className="filter-input"
            value={filters[type.toLowerCase()] || ''}
            onChange={(e) => setFilters({ ...filters, [type.toLowerCase()]: e.target.value })}
          />
          <button className="btn-excel" onClick={() => exportToExcel(transformedData.filter(d =>
            d.partyName?.toLowerCase().includes((filters[type.toLowerCase()] || '').toLowerCase()) ||
            d.billNumber?.toLowerCase().includes((filters[type.toLowerCase()] || '').toLowerCase())
          ), title, standardColumns.filter(c => c.key !== 'actions'))}>
            📊 Export Excel
          </button>
          <button className="btn-pdf" onClick={() => exportToPDF(transformedData.filter(d =>
            d.partyName?.toLowerCase().includes((filters[type.toLowerCase()] || '').toLowerCase()) ||
            d.billNumber?.toLowerCase().includes((filters[type.toLowerCase()] || '').toLowerCase())
          ), title, standardColumns.filter(c => c.key !== 'actions'))}>
            📄 Export PDF
          </button>
          <button className="btn-add-new" onClick={() => handlePlusClick(type, new Event('click'))}>
            + Add New {type}
          </button>
        </div>
      </div>
      {transformedData.length > 0 ? (
        <div className="data-table-container" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: '100%', width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap', width: `${columnWidths.date?.max || 110}px`, minWidth: `${columnWidths.date?.min || 100}px` }}>Date</th>
                <th style={{ whiteSpace: 'nowrap', width: `${columnWidths.billSeries?.max || 100}px`, minWidth: `${columnWidths.billSeries?.min || 90}px` }}>Bill Series</th>
                <th style={{ whiteSpace: 'nowrap', width: `${columnWidths.billNumber?.max || 120}px`, minWidth: `${columnWidths.billNumber?.min || 100}px` }}>Bill Number</th>
                <th style={{ whiteSpace: 'nowrap', width: `${columnWidths.billType?.max || 90}px`, minWidth: `${columnWidths.billType?.min || 80}px` }}>Bill Type</th>
                <th style={{ whiteSpace: 'nowrap', width: `${columnWidths.partyCode?.max || 150}px`, minWidth: `${columnWidths.partyCode?.min || 110}px` }}>Party Code</th>
                <th style={{ whiteSpace: 'nowrap', width: `${columnWidths.partyName?.max || 250}px`, minWidth: `${columnWidths.partyName?.min || 180}px`, maxWidth: '450px' }}>Party Name</th>
                <th style={{ whiteSpace: 'nowrap', width: `${columnWidths.branchName?.max || 220}px`, minWidth: `${columnWidths.branchName?.min || 160}px`, maxWidth: '380px' }}>Branch Name</th>
                <th style={{ whiteSpace: 'nowrap', width: `${columnWidths.amount?.max || 130}px`, minWidth: `${columnWidths.amount?.min || 120}px`, textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ whiteSpace: 'nowrap', width: `${columnWidths.loadSeries?.max || 100}px`, minWidth: `${columnWidths.loadSeries?.min || 90}px` }}>Load Series</th>
                <th style={{ whiteSpace: 'nowrap', width: `${columnWidths.loadNumber?.max || 120}px`, minWidth: `${columnWidths.loadNumber?.min || 100}px` }}>Load Number</th>
                <th style={{ whiteSpace: 'nowrap', width: `${columnWidths.status?.max || 110}px`, minWidth: `${columnWidths.status?.min || 100}px` }}>Status</th>
                <th style={{ whiteSpace: 'nowrap', width: '300px', minWidth: '300px', position: 'sticky', right: 0, backgroundColor: '#f8fafc', zIndex: 15, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transformedData
                .filter(d =>
                  d.partyName?.toLowerCase().includes((filters[type.toLowerCase()] || '').toLowerCase()) ||
                  d.billNumber?.toLowerCase().includes((filters[type.toLowerCase()] || '').toLowerCase())
                )
                .map((item, index) => (
                  <tr key={index}>
                    <td style={{ whiteSpace: 'nowrap' }}>{item.date}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{item.billSeries}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{item.billNumber}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{item.billType}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{item.partyCode}</td>
                    <td style={{ whiteSpace: 'nowrap', maxWidth: '450px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.partyName}>{item.partyName}</td>
                    <td style={{ whiteSpace: 'nowrap', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.branchName}>{item.branchName}</td>
                    <td className="amount-cell" style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{item.loadSeries}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{item.loadNumber}</td>
                    <td style={{ whiteSpace: 'nowrap' }}><span className={getStatusBadgeClass(item.status)}>{item.status}</span></td>
                    <td className="action-buttons" style={{ whiteSpace: 'nowrap', position: 'sticky', right: 0, backgroundColor: '#ffffff', zIndex: 10, boxShadow: '-2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                      <button className="btn-view" onClick={() => handleViewVoucher(type, item.originalItem)} title="View" style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', margin: '0 2px', cursor: 'pointer' }}>👁️ View</button>
                      <button className="btn-edit" onClick={() => handleEditVoucher(type, item.originalItem)} title="Edit" style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', margin: '0 2px', cursor: 'pointer' }}>✏️ Edit</button>
                      <button className="btn-print" onClick={() => handlePrintVoucher(item)} title="Print" style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', margin: '0 2px', cursor: 'pointer' }}>🖨️ Print</button>
                      <button className="btn-preview" onClick={() => handlePreviewVoucher(item)} title="Preview" style={{ background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', margin: '0 2px', cursor: 'pointer' }}>👁️ Preview</button>
                      <button className="btn-delete" onClick={() => handleDeleteVoucher(type, item.id)} title="Delete" style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', margin: '0 2px', cursor: 'pointer' }}>🗑 Delete</button>
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
  const renderLoadList = (title, data) => {
  const loadColumns = [
    { key: 'date', label: 'Load Date' },
    { key: 'loadSeries', label: 'Load Series' },
    { key: 'loadNumber', label: 'Load Number' },
    { key: 'company', label: 'Company' },
    { key: 'deliveryBy', label: 'Delivery By' },
    { key: 'selectedSalesman', label: 'Salesman' },
    { key: 'totalAmount', label: 'Total Amount (₹)' },
    { key: 'itemCount', label: 'Items' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' }
  ];

  const handleViewLoad = (item) => {
    setViewData(item);
    setViewType('Create Load');
    setShowViewModal(true);
  };

  const handleEditLoad = (item) => {
    console.log('Editing Load:', item);

    setShowCreateLoadList(false);

    setCreateLoadFormData({
      loadSeries: item.loadSeries || '',
      loadNo: item.loadNo || '',
      loadDate: item.loadDate || new Date().toISOString().split('T')[0],
      company: item.company || '',
      deliverBoy: item.deliverBoy || '',
      selectedSalesman: item.selectedSalesman || '',
      billFromDate: item.billFromDate || new Date().toISOString().split('T')[0],
      billToDate: item.billToDate || new Date().toISOString().split('T')[0],
      narration: item.narration || '',
      deliveryBy: item.deliveryBy || ''
    });
    setCreateLoadItems(item.items || []);
    setOpenFormFor('Create Load');
  };

  const handleDeleteLoad = (id) => {
    if (window.confirm('Are you sure you want to delete this Load?')) {
      setCreateLoadListData(createLoadListData.filter(item => item.id !== id));
      alert('Load deleted successfully!');
    }
  };

  const transformedData = data.map(item => ({
    id: item.id,
    date: item.loadDate || item.date || '-',
    loadSeries: item.loadSeries || '-',
    loadNumber: item.loadNo || item.loadNumber || '-',
    company: item.company || '-',
    deliveryBy: item.deliveryBy || '-',
    selectedSalesman: item.selectedSalesman || '-',
    totalAmount: parseFloat(item.totalAmount) || parseFloat(item.amount) || 0,
    itemCount: item.items?.length || 0,
    status: item.status || 'Pending',
    originalItem: item
  }));

  const getStatusBadgeClass = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'settled') {
      return 'status-badge status-success';
    } else if (statusLower === 'pending') {
      return 'status-badge status-warning';
    }
    return 'status-badge status-info';
  };

  return (
    <div className="master-section grid-section">
      <div className="grid-header">
        <h3>{title} ({transformedData.length})</h3>
        <div className="table-controls">
          <input
            type="text"
            placeholder="Search..."
            className="filter-input"
            value={filters['load'] || ''}
            onChange={(e) => setFilters({ ...filters, load: e.target.value })}
          />
          <button className="btn-excel" onClick={() => exportToExcel(
            transformedData.filter(d =>
              d.loadSeries?.toLowerCase().includes((filters['load'] || '').toLowerCase()) ||
              d.loadNumber?.toLowerCase().includes((filters['load'] || '').toLowerCase())
            ),
            title,
            loadColumns.filter(c => c.key !== 'actions')
          )}>
            📊 Export Excel
          </button>
          <button className="btn-pdf" onClick={() => exportToPDF(
            transformedData.filter(d =>
              d.loadSeries?.toLowerCase().includes((filters['load'] || '').toLowerCase()) ||
              d.loadNumber?.toLowerCase().includes((filters['load'] || '').toLowerCase())
            ),
            title,
            loadColumns.filter(c => c.key !== 'actions')
          )}>
            📄 Export PDF
          </button>
        </div>
      </div>
      {transformedData.length > 0 ? (
        <div className="data-table-container" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: '1000px' }}>
            <thead>
              <tr>
                {loadColumns.map(col => (
                  <th key={col.key} style={col.key === 'actions' ? {
                    textAlign: 'center',
                    width: '200px',
                    position: 'sticky',
                    right: 0,
                    backgroundColor: '#f8fafc',
                    zIndex: 15
                  } : {}}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transformedData
                .filter(d =>
                  d.loadSeries?.toLowerCase().includes((filters['load'] || '').toLowerCase()) ||
                  d.loadNumber?.toLowerCase().includes((filters['load'] || '').toLowerCase())
                )
                .map((item, index) => (
                  <tr key={index}>
                    <td>{item.date}</td>
                    <td>{item.loadSeries}</td>
                    <td>{item.loadNumber}</td>
                    <td>{item.company}</td>
                    <td>{item.deliveryBy}</td>
                    <td>{item.selectedSalesman}</td>
                    <td className="amount-cell">₹{item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{item.itemCount}</td>
                    <td><span className={getStatusBadgeClass(item.status)}>{item.status}</span></td>
                    <td className="action-buttons" style={{
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      right: 0,
                      backgroundColor: '#ffffff',
                      zIndex: 10,
                      boxShadow: '-2px 0 5px -2px rgba(0,0,0,0.1)'
                    }}>
                      <button
                        className="btn-view"
                        onClick={() => handleViewLoad(item.originalItem)}
                        title="View"
                        style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', margin: '0 2px', cursor: 'pointer' }}
                      >
                        👁️ View
                      </button>
                      <button
                        className="btn-edit"
                        onClick={() => handleEditLoad(item.originalItem)}
                        title="Edit"
                        style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', margin: '0 2px', cursor: 'pointer' }}
                      >
                        ✏️ Edit
                      </button>
                      {item.status !== 'Settled' && (
                        <button
                          className="btn-settle"
                          onClick={() => handleSettleLoad(item.originalItem)}
                          title="Settle Load"
                          style={{ background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', margin: '0 2px', cursor: 'pointer' }}
                        >
                          ✅ Settle
                        </button>
                      )}
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteLoad(item.id)}
                        title="Delete"
                        style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', margin: '0 2px', cursor: 'pointer' }}
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
        <div className="empty-state">No loads found. Click + Add New to create one.</div>
      )}
    </div>
  );
};

// ========== VIEW, EDIT, DELETE HANDLERS FOR ALL VOUCHERS ==========

const handleViewVoucher = (type, item) => {
  setViewData(item);
  setViewType(type);
  setShowViewModal(true);
};

const handleEditVoucher = (type, item) => {
  console.log('Editing voucher:', type, item);
  
  // Close the list view
    setEditingInvoiceId(item.id);
  if (type === 'Sales' || type === 'Billing' || type === 'Quotation') {
    setShowSalesList(false);
  } else if (type === 'Purchase') {
    setShowPurchaseList(false);
  } else if (type === 'Credit Note') {
    setShowCreditNoteList(false);
  } else if (type === 'Debit Note') {
    setShowDebitNoteList(false);
  } else if (type === 'Create Load') {
    setShowCreateLoadList(false);
  }
  
  // Populate the form based on type
  if (type === 'Sales' || type === 'Billing') {
    setInvoiceFormData({
      billDate: item.billDate || new Date().toISOString().split('T')[0],
      godown: item.godown || 'G1',
      company: item.company || '',
      area: item.area || '',
      party: item.party || item.partyName || '',
      BillSeries: item.billSeries || '',
      billNo: item.billNo || '',
      billType: item.billType || 'Credit',
      dueDate: item.dueDate || '',
      salesman: item.salesman || '',
      narration: item.narration || ''
    });
    setInvoiceItems(item.items || []);
    setInvoiceSummary(item.summary || { gross: 0, tpr: 0, scheme: 0, bottom: 0, star: 0, cd: 0, gst: 0, cess: 0, tcs: 0, rounding: 0, net: 0 });
    setOpenFormFor('Billing');
    setActiveSubMenu('Billing');
  } 
  else if (type === 'Quotation') {
    setInvoiceFormData({
      billDate: item.billDate || new Date().toISOString().split('T')[0],
      godown: item.godown || 'G1',
      company: item.company || '',
      area: item.area || '',
      party: item.party || item.partyName || '',
      BillSeries: item.billSeries || '',
      billNo: item.billNo || '',
      billType: item.billType || 'Credit',
      dueDate: item.dueDate || '',
      salesman: item.salesman || '',
      narration: item.narration || ''
    });
    setInvoiceItems(item.items || []);
    setInvoiceSummary(item.summary || { gross: 0, tpr: 0, scheme: 0, bottom: 0, star: 0, cd: 0, gst: 0, cess: 0, tcs: 0, rounding: 0, net: 0 });
    setOpenFormFor('Quotation');
    setActiveSubMenu('Quotation');
  }
  else if (type === 'Purchase') {
    setPurchaseFormData({
      supplier: item.supplier || item.partyName || '',
      company: item.company || '',
      storageLocation: item.storageLocation || item.branchName || '',
      invoiceDate: item.invoiceDate || item.billDate || new Date().toISOString().split('T')[0],
      vno: item.vno || '',
      invoiceNumber: item.invoiceNumber || item.billNo || '',
      narration: item.narration || '',
      discountPercent: item.discountPercent || '',
      grossAmount: item.grossAmount || 0,
      mrpTotal: item.mrpTotal || 0,
      tcbPercent: item.tcbPercent || 0,
      diBc1: item.diBc1 || 0,
      afterDiBc1: item.afterDiBc1 || 0,
      groBsAmt: item.groBsAmt || 0,
      tcbAmount: item.tcbAmount || 0,
      diBc2: item.diBc2 || 0,
      afterDiBc2: item.afterDiBc2 || 0,
      qbtAmt: item.qbtAmt || 0,
      rounding: item.rounding || 0,
      diBc3: item.diBc3 || 0,
      afterDiBc3: item.afterDiBc3 || 0,
      ceBsAmt: item.ceBsAmt || 0,
      netAmt: item.netAmt || item.amount || 0
    });
    setPurchaseItems(item.items || []);
    setOpenFormFor('Purchase');
    setActiveSubMenu('Purchase');
  }
  else if (type === 'Credit Note') {
    setCreditNoteFormData({
      vDate: item.vDate || item.billDate || new Date().toISOString().split('T')[0],
      vNo: item.vNo || item.billNo || '',
      party: item.party || item.partyName || '',
      godown: item.godown || 'G1',
      salesman: item.salesman || '',
      tinNo: item.tinNo || '',
      company: item.company || '',
      narr: item.narr || item.narration || '',
      billSeries: item.billSeries || '',
      billNo: item.billNo || '',
      full: item.full || '',
      refNo: item.refNo || '',
      refDate: item.refDate || ''
    });
    setCreditNoteItems(item.items || []);
    setCreditNoteSummary(item.summary || { grossAmt: 0, schemeAmt: 0, tprAmt: 0, cashDisc: 0, gstAmt: 0, starAmt: 0, starPercent: 0, addLess: 0, display: 0, coupon: 0, rounding: 0, cessAmt: 0, tcsPercent: 0, tcsAmt: 0, billBalAmt: 0, netAmt: 0 });
    setOpenFormFor('Credit Note');
    setActiveSubMenu('Credit Note');
  }
  else if (type === 'Debit Note') {
    setDebitNoteFormData({
      vDate: item.vDate || item.billDate || new Date().toISOString().split('T')[0],
      vNo: item.vNo || item.billNo || '',
      godown: item.godown || 'G1',
      company: item.company || '',
      narr: item.narr || item.narration || '',
      supplier: item.supplier || item.partyName || '',
      igst: item.igst || 'N'
    });
    setDebitNoteItems(item.items || []);
    setDebitNoteSummary(item.summary || { grossAmt: 0, gstAmt: 0, tcsPercent: 0, tcsAmt: 0, beforeVatDiscAmt: 0, surcharge: 0, rounding: 0, beforeVatAddAmt: 0, afterVatDiscAmt: 0, netAmt: 0 });
    setOpenFormFor('Debit Note');
    setActiveSubMenu('Debit Note');
  }
  
  // Add a default row if items are empty
  if ((type === 'Sales' || type === 'Billing' || type === 'Quotation') && invoiceItems.length === 0) {
    addInvoiceItem();
  }
  if (type === 'Purchase' && purchaseItems.length === 0) {
    addPurchaseItem();
  }
  if (type === 'Credit Note' && creditNoteItems.length === 0) {
    addCreditNoteItem();
  }
  if (type === 'Debit Note' && debitNoteItems.length === 0) {
    addDebitNoteItem();
  }
};

const handleDeleteVoucher = (type, id) => {
  if (window.confirm(`Are you sure you want to delete this ${type}?`)) {
    if (type === 'Sales' || type === 'Billing' || type === 'Quotation') {
      setSalesListData(salesListData.filter(item => item.id !== id));
    } else if (type === 'Purchase') {
      setPurchaseListData(purchaseListData.filter(item => item.id !== id));
    } else if (type === 'Credit Note') {
      setCreditNoteListData(creditNoteListData.filter(item => item.id !== id));
    } else if (type === 'Debit Note') {
      setDebitNoteListData(debitNoteListData.filter(item => item.id !== id));
    } else if (type === 'Create Load') {
      setCreateLoadListData(createLoadListData.filter(item => item.id !== id));
    }
    alert(`${type} deleted successfully!`);
  }
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
                        <span
                          className="submenu-text"
                          onClick={() => {
                            handleSubMenuClick(item);

                            setTransactionFormMode(prev => ({
                              ...prev,
                              [item]: false
                            }));
                          }}
                        >{item}</span>
                        <span
                          className="plus-icon"
                          onClick={(e) => {
                            e.stopPropagation();

                            handlePlusClick(item, e);

                            setTransactionFormMode(prev => ({
                              ...prev,
                              [item]: true
                            }));
                          }}
                        >+</span>
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
            <button
              onClick={() => {
                setActiveSubMenu(null);
                setOpenFormFor(null);
                setShowDashboard(true);
                setShowSalesList(false);
                setShowPurchaseList(false);
                setShowCreditNoteList(false);
                setShowDebitNoteList(false);
                setShowCreateLoadList(false);
                setShowPrintPreview(false);
                calculateDashboardPerformance();
              }}
              style={{
                background: showDashboard && !activeSubMenu ? '#3b82f6' : '#f3f4f6',
                color: showDashboard && !activeSubMenu ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                marginRight: '12px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📊 Dashboard
            </button>
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


             {activeSubMenu === 'Settle Load' && (
            <div className="master-section erp-master-form settle-load-form" style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div className="erp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="erp-title">Settle Load</h2>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                    Create a new settlement
                  </p>
                </div>
                <button className="close-form-btn" onClick={() => {
                  setShowSettleLoad(false);
                  setOpenFormFor(null);
                  setActiveSubMenu(null);
                }}>✕</button>
              </div>

              {/* Header Fields - Added Load Series */}
              <div className="form-section" style={{ marginBottom: '20px', paddingBottom: '10px' }}>
                <h4 className="section-header">Settlement Information</h4>
                <div className="form-grid-3">
                  <div className="labeled-input">
                    <label>Load Series</label>
                    <input
                      type="text"
                      name="loadSeries"
                      className="erp-input"
                      placeholder="Enter Load Series"
                      value={settleLoadFormData.loadSeries || ''}
                      onChange={handleSettleLoadInputChange}
                    />
                  </div>
                  <div className="labeled-input">
                    <label>Load No *</label>
                    <input
                      type="text"
                      name="loadNo"
                      className="erp-input"
                      placeholder="Enter Load Number"
                      value={settleLoadFormData.loadNo}
                      onChange={handleSettleLoadInputChange}
                      required
                    />
                  </div>
                  <div className="labeled-input">
                    <label>Load Date</label>
                    <input
                      type="date"
                      name="loadDate"
                      className="erp-input"
                      value={settleLoadFormData.loadDate}
                      onChange={handleSettleLoadInputChange}
                    />
                  </div>
                  <div className="labeled-input">
                    <label>Settle Load Date *</label>
                    <input
                      type="date"
                      name="settleLoadDate"
                      className="erp-input"
                      value={settleLoadFormData.settleLoadDate}
                      onChange={handleSettleLoadInputChange}
                      required
                    />
                  </div>
                  <div className="labeled-input">
                    <label>Narration</label>
                    <input
                      type="text"
                      name="narration"
                      className="erp-input"
                      placeholder="Enter settlement narration..."
                      value={settleLoadFormData.narration}
                      onChange={handleSettleLoadInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Add Invoice Button */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '12px',
                paddingRight: '16px'
              }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    const newItem = {
                      id: Date.now(),
                      sr: settleLoadItems.length + 1,
                      adjust: 'N',
                      pending: 'N',
                      cancel: 'N',
                      receipt: '',
                      receiptSeries: '',
                      receiptNo: '',
                      status: 'Pending',
                      billType: 'Credit',
                      billDate: new Date().toISOString().split('T')[0],
                      billSeries: '',
                      billNo: '',
                      partyCode: '',
                      partyName: '',
                      billAmount: 0,
                      receiptAmount: 0
                    };
                    setSettleLoadItems([...settleLoadItems, newItem]);
                  }}
                  style={{ background: '#3b82f6', padding: '8px 20px', fontSize: '13px' }}
                >
                  + Add Invoice
                </button>
              </div>
              {/* Invoices Table Section - MODIFIED WITH PROPER BUTTON HEADERS */}
              <div className="form-section" style={{ marginTop: '0', paddingTop: '0' }}>
                <h4 className="section-header" style={{ marginBottom: '12px' }}>Invoices for Settlement</h4>

                {/* Search Bar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: '12px',
                  paddingRight: '16px',
                  gap: '10px'
                }}>
                  <input
                    type="text"
                    placeholder="🔍 Search by Bill No, Party Name, Party Code, Amount..."
                    className="erp-input"
                    onChange={(e) => {
                      const searchTerm = e.target.value.toLowerCase();
                      if (searchTerm === '') {
                        setSettleLoadItems(originalSettleLoadItems);
                        calculateSettleLoadSummary(originalSettleLoadItems);
                      } else {
                        const filteredItems = originalSettleLoadItems.filter(item =>
                          (item.billNo && item.billNo.toLowerCase().includes(searchTerm)) ||
                          (item.partyName && item.partyName.toLowerCase().includes(searchTerm)) ||
                          (item.partyCode && item.partyCode.toLowerCase().includes(searchTerm)) ||
                          (item.billAmount && item.billAmount.toString().includes(searchTerm))
                        );
                        setSettleLoadItems(filteredItems);
                        calculateSettleLoadSummary(filteredItems);
                      }
                    }}
                    style={{
                      width: '300px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0'
                    }}
                  />
                  <button
                    onClick={() => {
                      setSettleLoadItems(originalSettleLoadItems);
                      calculateSettleLoadSummary(originalSettleLoadItems);
                      const searchInput = document.querySelector('.settle-load-search');
                      if (searchInput) searchInput.value = '';
                    }}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      background: '#f3f4f6',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Reset
                  </button>
                </div>

                <div className="data-table-container" style={{
                  overflowX: 'auto',
                  overflowY: 'auto',
                  maxHeight: '500px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  position: 'relative'
                }}>
                  <table className="data-table" style={{
                    minWidth: '1400px',
                    fontSize: '12px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    borderCollapse: 'collapse',
                    width: '100%',
                    margin: 0,
                    padding: 0
                  }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#f8fafc' }}>
                      {/* Main Headers Row */}
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{
                          padding: '10px 8px',
                          textAlign: 'center',
                          fontWeight: '600',
                          fontSize: '12px',
                          color: '#1e293b',
                          borderRight: '1px solid #e2e8f0',
                          position: 'sticky',
                          left: 0,
                          backgroundColor: '#f8fafc',
                          zIndex: 30,
                          width: '50px'
                        }}>Sr</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>Bill Series</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>Bill No</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>Bill Type</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>Party Code</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>Party Name</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600', fontSize: '12px', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>Bill Amt</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>Rec Series</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>Rec No</th>
                        <th style={{
                          padding: '10px 8px',
                          textAlign: 'center',
                          fontWeight: '600',
                          fontSize: '12px',
                          color: '#1e293b',
                          position: 'sticky',
                          right: 0,
                          backgroundColor: '#f8fafc',
                          zIndex: 30,
                          minWidth: '280px'
                        }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settleLoadItems.map((item, index) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          {/* Sticky Sr No */}
                          <td style={{
                            position: 'sticky',
                            left: 0,
                            backgroundColor: 'white',
                            zIndex: 10,
                            padding: '8px 4px',
                            textAlign: 'center',
                            fontWeight: '500',
                            color: '#475569',
                            borderRight: '1px solid #e2e8f0',
                            fontSize: '11px'
                          }}>
                            {item.sr}
                          </td>

                          <td style={{ padding: '8px 4px', borderRight: '1px solid #e2e8f0' }}>
                            <div style={{
                              background: '#f1f5f9',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#1e293b'
                            }}>
                              {item.billSeries || '-'}
                            </div>
                          </td>

                          <td style={{ padding: '8px 4px', borderRight: '1px solid #e2e8f0' }}>
                            <div style={{
                              background: '#f1f5f9',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#1e293b'
                            }}>
                              {item.billNo || '-'}
                            </div>
                          </td>

                          <td style={{ padding: '8px 4px', borderRight: '1px solid #e2e8f0' }}>
                            <span className={`badge ${item.billType === 'Credit' ? 'badge-info' : 'badge-success'}`} style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '10px',
                              fontWeight: '500',
                              background: item.billType === 'Credit' ? '#dbeafe' : '#d1fae5',
                              color: item.billType === 'Credit' ? '#1e40af' : '#065f46'
                            }}>
                              {item.billType}
                            </span>
                          </td>

                          <td style={{ padding: '8px 4px', borderRight: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '11px', color: '#475569' }}>
                              {item.partyCode || '-'}
                            </div>
                          </td>

                          <td style={{ padding: '8px 4px', borderRight: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '11px', fontWeight: '500', color: '#1e293b' }}>
                              {item.partyName || '-'}
                            </div>
                          </td>

                          <td style={{ padding: '8px 4px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: '600', color: '#059669', fontSize: '11px' }}>
                              ₹{parseFloat(item.billAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </td>

                          <td style={{ padding: '8px 4px', borderRight: '1px solid #e2e8f0' }}>
                            <input
                              type="text"
                              className="erp-input"
                              value={item.receiptSeries || ''}
                              onChange={(e) => updateSettleLoadItem(index, 'receiptSeries', e.target.value)}
                              style={{
                                width: '100%',
                                fontSize: '11px',
                                padding: '4px 6px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                background: item.status === 'Settled' || item.status === 'Cancelled' ? '#f1f5f9' : 'white'
                              }}
                              placeholder="Series"
                              disabled={item.status === 'Settled' || item.status === 'Cancelled'}
                            />
                          </td>

                          <td style={{ padding: '8px 4px', borderRight: '1px solid #e2e8f0' }}>
                            <input
                              type="text"
                              className="erp-input"
                              value={item.receiptNo || ''}
                              onChange={(e) => updateSettleLoadItem(index, 'receiptNo', e.target.value)}
                              style={{
                                width: '100%',
                                fontSize: '11px',
                                padding: '4px 6px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                background: item.status === 'Settled' || item.status === 'Cancelled' ? '#f1f5f9' : 'white'
                              }}
                              placeholder="Receipt No"
                              disabled={item.status === 'Settled' || item.status === 'Cancelled'}
                            />
                          </td>

                          {/* STICKY BUTTONS GROUP */}
                          <td style={{
                            position: 'sticky',
                            right: 0,
                            backgroundColor: 'white',
                            zIndex: 10,
                            padding: '8px 4px',
                            boxShadow: '-2px 0 5px -2px rgba(0,0,0,0.05)'
                          }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-start', alignItems: 'center' }}>
                              {/* Adjust Button */}
                              <button
                                className={`action-btn ${item.adjust === 'Y' ? 'btn-success' : 'btn-secondary'}`}
                                onClick={() => {
                                  if (item.billNo && item.billSeries) {
                                    const originalInvoice = salesListData.find(
                                      inv => inv.billNo === item.billNo && inv.billSeries === item.billSeries
                                    );

                                    if (originalInvoice) {
                                      setInvoiceFormData({
                                        billDate: originalInvoice.billDate || new Date().toISOString().split('T')[0],
                                        godown: originalInvoice.godown || 'G1',
                                        company: originalInvoice.company || '',
                                        area: originalInvoice.area || '',
                                        party: originalInvoice.party || originalInvoice.partyName || '',
                                        BillSeries: originalInvoice.billSeries || '',
                                        billNo: originalInvoice.billNo || '',
                                        billType: originalInvoice.billType || 'Credit',
                                        dueDate: originalInvoice.dueDate || '',
                                        salesman: originalInvoice.salesman || '',
                                        narration: originalInvoice.narration || ''
                                      });

                                      setInvoiceItems(originalInvoice.items || []);
                                      setInvoiceSummary(originalInvoice.summary || {
                                        gross: 0, tpr: 0, scheme: 0, bottom: 0, star: 0, cd: 0, gst: 0, cess: 0, tcs: 0, rounding: 0, net: 0
                                      });

                                      setShowSettleLoad(false);
                                      setOpenFormFor('Billing');
                                      setActiveSubMenu('Billing');

                                      alert(`Opening invoice ${item.billNo} for editing...`);
                                    } else {
                                      alert('Invoice data not found. Please check the invoice details.');
                                    }
                                  } else {
                                    updateSettleLoadItem(index, 'adjust', item.adjust === 'Y' ? 'N' : 'Y');
                                  }
                                }}
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '11px',
                                  minWidth: '65px',
                                  background: item.adjust === 'Y' ? '#10b981' : '#e2e8f0',
                                  color: item.adjust === 'Y' ? 'white' : '#475569',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: item.status === 'Settled' || item.status === 'Cancelled' ? 'not-allowed' : 'pointer',
                                  opacity: item.status === 'Settled' || item.status === 'Cancelled' ? 0.5 : 1,
                                  fontWeight: '500'
                                }}
                                disabled={item.status === 'Settled' || item.status === 'Cancelled'}
                                title={item.billNo ? "Click to edit invoice" : "Toggle adjust status"}
                              >
                                {item.adjust === 'Y' ? '✓ Adj' : 'Adjust'}
                              </button>

                              {/* Pending Button */}
                              <button
                                className={`action-btn ${item.pending === 'Y' ? 'btn-warning' : 'btn-secondary'}`}
                                onClick={() => updateSettleLoadItem(index, 'pending', item.pending === 'Y' ? 'N' : 'Y')}
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '11px',
                                  minWidth: '65px',
                                  background: item.pending === 'Y' ? '#f59e0b' : '#e2e8f0',
                                  color: item.pending === 'Y' ? 'white' : '#475569',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: item.status === 'Settled' || item.status === 'Cancelled' ? 'not-allowed' : 'pointer',
                                  opacity: item.status === 'Settled' || item.status === 'Cancelled' ? 0.5 : 1,
                                  fontWeight: '500'
                                }}
                                disabled={item.status === 'Settled' || item.status === 'Cancelled'}
                              >
                                {item.pending === 'Y' ? '⏳ Pend' : 'Pending'}
                              </button>

                              {/* Cancel Button */}
                              <button
                                className={`action-btn ${item.cancel === 'Y' ? 'btn-danger' : 'btn-secondary'}`}
                                onClick={() => updateSettleLoadItem(index, 'cancel', item.cancel === 'Y' ? 'N' : 'Y')}
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '11px',
                                  minWidth: '65px',
                                  background: item.cancel === 'Y' ? '#ef4444' : '#e2e8f0',
                                  color: item.cancel === 'Y' ? 'white' : '#475569',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: item.status === 'Settled' ? 'not-allowed' : 'pointer',
                                  opacity: item.status === 'Settled' ? 0.5 : 1,
                                  fontWeight: '500'
                                }}
                                disabled={item.status === 'Settled'}
                              >
                                {item.cancel === 'Y' ? '✗ Can' : 'Cancel'}
                              </button>

                              {/* Receipt Button - FIXED to open receipt modal */}
                              <button
                                className="btn-receipt"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (item.cancel !== 'Y') {
                                    console.log('Opening receipt modal for:', item);
                                    setCurrentReceiptItem({ index, item });
                                    setReceiptFormData({
                                      ourBankAccount: item.receiptMode === 'Cash' ? 'cash' : (item.bankName || ''),
                                      bankName: item.bankName || '',
                                      chequeNo: item.chequeNo || '',
                                      chequeDate: item.chequeDate || '',
                                      billAmount: parseFloat(item.billAmount) || 0,
                                      receiptAmount: parseFloat(item.receiptAmount) || 0,
                                      discount: 0,
                                      salesman: getSalesmanForCustomer(item.partyCode, item.partyName),
                                      receiptSeries: item.receiptSeries || '',  // ADD THIS
                                      receiptNo: item.receiptNo || ''           // ADD THIS
                                    });
                                    setShowReceiptModal(true);
                                  } else {
                                    alert('Cannot take receipt for cancelled bill');
                                  }
                                }}
                                style={{
                                  background: '#8b5cf6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '6px 10px',
                                  minWidth: '65px',
                                  cursor: item.cancel === 'Y' ? 'not-allowed' : 'pointer',
                                  fontSize: '11px',
                                  opacity: item.cancel === 'Y' ? 0.5 : 1,
                                  fontWeight: '500'
                                }}
                                disabled={item.cancel === 'Y'}
                              >
                                💰 Receipt
                              </button>

                              {/* Delete Button */}
                              <button
                                className="btn-delete"
                                onClick={() => {
                                  const newItems = settleLoadItems.filter((_, i) => i !== index);
                                  newItems.forEach((item, i) => { item.sr = i + 1; });
                                  setSettleLoadItems(newItems);
                                  calculateSettleLoadSummary(newItems);
                                }}
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '11px',
                                  minWidth: '65px',
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: item.status === 'Settled' ? 'not-allowed' : 'pointer',
                                  opacity: item.status === 'Settled' ? 0.5 : 1,
                                  fontWeight: '500'
                                }}
                                disabled={item.status === 'Settled'}
                              >
                                🗑 Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {settleLoadItems.length === 0 && (
                    <div className="empty-state" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                      <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
                      <div style={{ fontSize: '12px' }}>No invoices added. Click "Add Invoice" to add rows.</div>
                    </div>
                  )}
                </div>
              </div>
              {/* Summary Fields - Bottom Summary */}
              <div className="form-section" style={{ marginTop: '20px' }}>
                <h4 className="section-header">Settlement Summary</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                  <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Bills</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#374151' }}>{settleLoadSummary.totalBills}</div>
                  </div>
                  <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Settled Bills</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{settleLoadSummary.totalRecAdjBills}</div>
                  </div>
                  <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Collection</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                      ₹{settleLoadSummary.totalChequeAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Cancel Bills</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{settleLoadSummary.totalCancelBills}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="form-actions" style={{ marginTop: '20px' }}>
                <button className="btn-excel" onClick={exportSettleLoadToExcel} style={{ background: '#10b981' }}>
                  📊 Export
                </button>
                <button className="btn-primary" onClick={saveSettleLoad} style={{ background: '#3b82f6' }}>
                  💾 Save
                </button>
                <button className="btn-secondary" onClick={() => {
                  setShowSettleLoad(false);
                  setOpenFormFor(null);
                  setActiveSubMenu(null);
                }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Receipt Modal - Place this BEFORE the Batch Modal */}
          {showReceiptModal && currentReceiptItem && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 999999
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowReceiptModal(false);
              }}
            >
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  width: '500px',
                  maxWidth: '90%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Receipt Details</h3>
                  <button
                    onClick={() => setShowReceiptModal(false)}
                    style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Our Bank Account *</label>
                  <select
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                    value={receiptFormData.ourBankAccount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setReceiptFormData({
                        ...receiptFormData,
                        ourBankAccount: value,
                        bankName: value !== 'cash' ? value : '',
                        chequeNo: '',
                        chequeDate: ''
                      });
                    }}
                  >
                    <option value="">Select Account</option>
                    <option value="cash">Cash In Hand</option>
                    {customerBanks.map(bank => (
                      <option key={bank.id} value={bank.bankName}>
                        {bank.bankName} - {bank.accountNumber}
                      </option>
                    ))}
                  </select>
                </div>

                {receiptFormData.ourBankAccount !== 'cash' && receiptFormData.ourBankAccount !== '' && (
                  <>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Cheque No *</label>
                      <input
                        type="text"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                        value={receiptFormData.chequeNo}
                        onChange={(e) => setReceiptFormData({ ...receiptFormData, chequeNo: e.target.value })}
                        placeholder="Enter Cheque Number"
                      />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Cheque Date *</label>
                      <input
                        type="date"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                        value={receiptFormData.chequeDate}
                        onChange={(e) => setReceiptFormData({ ...receiptFormData, chequeDate: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Receipt Series</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                    value={receiptFormData.receiptSeries || ''}
                    onChange={(e) => setReceiptFormData({ ...receiptFormData, receiptSeries: e.target.value })}
                    placeholder="Receipt Series"
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Receipt No</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                    value={receiptFormData.receiptNo || ''}
                    onChange={(e) => setReceiptFormData({ ...receiptFormData, receiptNo: e.target.value })}
                    placeholder="Receipt Number"
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Bill Amount</label>
                  <input
                    type="number"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', background: '#f3f4f6' }}
                    value={receiptFormData.billAmount}
                    readOnly
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Receipt Amount *</label>
                  <input
                    type="number"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                    value={receiptFormData.receiptAmount}
                    onChange={(e) => setReceiptFormData({ ...receiptFormData, receiptAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter Receipt Amount"
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Discount</label>
                  <input
                    type="number"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                    value={receiptFormData.discount}
                    onChange={(e) => setReceiptFormData({ ...receiptFormData, discount: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter Discount"
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Salesman</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', background: '#f3f4f6' }}
                    value={receiptFormData.salesman}
                    readOnly
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowReceiptModal(false)}
                    style={{ padding: '8px 20px', background: '#9ca3af', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReceiptSubmit}
                    style={{ padding: '8px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Submit Receipt
                  </button>
                </div>
              </div>
            </div>
          )}  
                   {/* Bill Print Form */}

          {activeSubMenu === 'Bill Print' && !showBillPrintPreview && (
            <div className="master-section erp-master-form">
              <div className="erp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="erp-title">Bill Print</h2>
                </div>
                <button className="close-form-btn" onClick={() => {
                  setActiveSubMenu(null);
                  setOpenFormFor(null);
                }}>✕</button>
              </div>

              <form className="master-form" onSubmit={generateBillPrint}>
                <div className="form-section">
                  <h4 className="section-header">Invoice Information</h4>

                  <div className="form-grid-6">
                    <div className="labeled-input">
                      <label>Load Series</label>
                      <input
                        type="text"
                        name="LoadSeries"
                        className="erp-input"
                        placeholder="Enter Load Series"
                        value={billPrintFormData.LoadSeries || ''}
                        onChange={handleBillPrintInputChange}
                        style={{ fontSize: '14px' }}
                      />
                    </div>

                    <div className="labeled-input">
                      <label>Trnseries</label>
                      <input
                        type="text"
                        name="Trnseries"
                        className="erp-input"
                        placeholder="Enter Trnseries"
                        value={billPrintFormData.Trnseries || ''}
                        onChange={handleBillPrintInputChange}
                        style={{ fontSize: '14px' }}
                      />
                    </div>

                    <div className="labeled-input">
                      <label>From Trnno</label>
                      <input
                        type="text"
                        name="FromTrnno"
                        className="erp-input"
                        placeholder="Enter From Trnno"
                        value={billPrintFormData.FromTrnno || ''}
                        onChange={handleBillPrintInputChange}
                        style={{ fontSize: '14px' }}
                      />
                    </div>

                    <div className="labeled-input">
                      <label>To Trnno</label>
                      <input
                        type="text"
                        name="Totrnno"
                        className="erp-input"
                        placeholder="Enter To Trnno"
                        value={billPrintFormData.Totrnno || ''}
                        onChange={handleBillPrintInputChange}
                        style={{ fontSize: '14px' }}
                      />
                    </div>

                    <div className="labeled-input">
                      <label>No Of Copies</label>
                      <input
                        type="text"
                        name="NoOfCopies"
                        className="erp-input"
                        placeholder="Enter No Of Copies"
                        value={billPrintFormData.NoOfCopies || ''}
                        onChange={handleBillPrintInputChange}
                        style={{ fontSize: '14px' }}
                      />
                    </div>

                    <div className="labeled-input">
                      <label>Load No</label>
                      <input
                        type="text"
                        name="loadNo"
                        className="erp-input"
                        placeholder="Enter Load Number"
                        value={billPrintFormData.loadNo || ''}
                        onChange={handleBillPrintInputChange}
                        style={{ fontSize: '14px' }}
                      />
                    </div>

                    <div className="labeled-input">
                      <label>Goods Return</label>
                      <select
                        name="Goodsreturn"
                        className="erp-select"
                        value={billPrintFormData.Goodsreturn || 'N'}
                        onChange={handleBillPrintInputChange}
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </div>

                    <div className="labeled-input">
                      <label>Damage Return</label>
                      <select
                        name="damageReturn"
                        className="erp-select"
                        value={billPrintFormData.damageReturn || 'original'}
                        onChange={handleBillPrintInputChange}
                      >
                        <option value="original">Original Copy</option>
                        <option value="duplicate">Duplicate Copy</option>
                        <option value="triplicate">Triplicate Copy</option>
                      </select>
                    </div>

                    <div className="labeled-input">
                      <label>Scheme Summary</label>
                      <select
                        name="SchemeSummary"
                        className="erp-select"
                        value={billPrintFormData.SchemeSummary || 'Y'}
                        onChange={handleBillPrintInputChange}
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </div>

                    <div className="labeled-input">
                      <label>Vat Summary</label>
                      <select
                        name="VatSummary"
                        className="erp-select"
                        value={billPrintFormData.VatSummary || 'Y'}
                        onChange={handleBillPrintInputChange}
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </div>

                    <div className="labeled-input">
                      <label>HSN Summary</label>
                      <select
                        name="HSNSummary"
                        className="erp-select"
                        value={billPrintFormData.HSNSummary || 'Y'}
                        onChange={handleBillPrintInputChange}
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </div>

                    <div className="labeled-input">
                      <label>Print Type</label>
                      <select
                        name="printType"
                        className="erp-select"
                        value={billPrintFormData.printType || 'original'}
                        onChange={handleBillPrintInputChange}
                      >
                        <option value="original">Original Copy</option>
                        <option value="duplicate">Duplicate Copy</option>
                        <option value="triplicate">Triplicate Copy</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      generateBillPrint(e);
                    }}
                    style={{ fontSize: '14px', fontWeight: 'normal' }}
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      generateBillPrint(e);
                    }}
                    style={{ fontSize: '14px', fontWeight: 'normal' }}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      generateBillPrint(e);
                    }}
                    style={{ fontSize: '14px', fontWeight: 'normal' }}
                  >
                    PDF
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => {
                    setActiveSubMenu(null);
                    setOpenFormFor(null);
                  }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          {/* Bill Print Preview */}
          {showBillPrintPreview && billPrintData && (
            <div className="master-section" style={{ padding: 0, background: '#f1f5f9', overflow: 'auto' }}>
              <div
                style={{
                  background: '#f1f5f9',
                  minHeight: '100vh'
                }}
                dangerouslySetInnerHTML={{ __html: getBillPrintHTML() }}
              />
              {/* Add a close button overlay for better UX */}
              <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                gap: '10px'
              }}>
                <button
                  onClick={closeBillPrint}
                  style={{
                    padding: '10px 20px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  ❌ Close Preview & Return to Bill Print
                </button>
              </div>
            </div>
          )}

          {/* Quotation Form - Same as Sales Invoice but with Quotation title */}
          {/* Quotation Form */}
          {activeSubMenu === 'Quotation' && openFormFor === 'Quotation' && (
            <div className="master-section erp-master-form sales-invoice">
              <div className="erp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="erp-title">Quotation</h2>
                </div>
                <button className="close-form-btn" onClick={closeForm}>✕</button>
              </div>

              {/* Invoice Header - 4 col grid */}
              <div className="form-section">
                <h4 className="section-header">Quotation Header</h4>
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

              {/* Product Entry Table - Same as Sales Invoice */}
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
                                                      setShowBatchSelectionModal(true);
                                                    } else if (productBatches.length === 1) {
                                                      handleProductSelect(currentProductIndex, {
                                                        ...product,
                                                        selectedBatch: productBatches[0]
                                                      });
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
                            <td><input className="erp-input numeric" data-field="mrp" data-index={index} value={item.mrp} readOnly style={{ width: '100%', backgroundColor: '#f3f4f6' }} /></td>
                            <td><input className="erp-input numeric" data-field="rate" data-index={index} value={item.rate} onChange={(e) => updateInvoiceItem(index, 'rate', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'rate')} style={{ width: '100%' }} /></td>
                            <td><input className="erp-input numeric" data-field="rateGst" data-index={index} value={item.rateGst} readOnly style={{ width: '100%', backgroundColor: '#f3f4f6' }} /></td>
                            <td><input className="erp-input numeric" data-field="tprAmt" data-index={index} value={item.tprAmt} onChange={(e) => updateInvoiceItem(index, 'tprAmt', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'tprAmt')} style={{ width: '100%' }} /></td>
                            <td><input className="erp-input numeric small" data-field="schemePct" data-index={index} value={item.schemePct} onChange={(e) => updateInvoiceItem(index, 'schemePct', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'schemePct')} style={{ width: '100%' }} /></td>
                            <td><input className="erp-input numeric" data-field="schemeAmt" data-index={index} value={item.schemeAmt} readOnly style={{ width: '100%', backgroundColor: '#f3f4f6' }} /></td>
                            <td><input className="erp-input numeric small" data-field="cdPct" data-index={index} value={item.cdPct} onChange={(e) => updateInvoiceItem(index, 'cdPct', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'cdPct')} style={{ width: '100%' }} /></td>
                            <td><input className="erp-input numeric" data-field="cdAmt" data-index={index} value={item.cdAmt} readOnly style={{ width: '100%', backgroundColor: '#f3f4f6' }} /></td>
                            <td><input className="erp-input numeric small" data-field="starPct" data-index={index} value={item.starPct} onChange={(e) => updateInvoiceItem(index, 'starPct', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'starPct')} style={{ width: '100%' }} /></td>
                            <td><input className="erp-input numeric" data-field="starAmt" data-index={index} value={item.starAmt} onChange={(e) => updateInvoiceItem(index, 'starAmt', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'starAmt')} style={{ width: '100%' }} /></td>
                            <td><input className="erp-input numeric" data-field="taxable" data-index={index} value={item.taxable} readOnly style={{ width: '100%', backgroundColor: '#f3f4f6' }} /></td>
                            <td><input className="erp-input numeric small" data-field="gst" data-index={index} value={item.gst} onChange={(e) => updateInvoiceItem(index, 'gst', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'gst')} style={{ width: '100%' }} /></td>
                            <td><input className="erp-input numeric" data-field="sgst" data-index={index} value={item.sgst} readOnly style={{ width: '100%', backgroundColor: '#f3f4f6' }} /></td>
                            <td><input className="erp-input numeric" data-field="cgst" data-index={index} value={item.cgst} readOnly style={{ width: '100%', backgroundColor: '#f3f4f6' }} /></td>
                            <td><input className="erp-input numeric font-bold" data-field="amount" data-index={index} value={item.amount} readOnly style={{ width: '100%', fontWeight: 'bold', backgroundColor: '#f3f4f6' }} /></td>
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
                <h4 className="section-header">Quotation Summary</h4>
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
                  💾 Save Quotation
                </button>
                <button type="button" className="btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </div>
          )}


          {/* Create Load Form */}
            {/* Create Load Form */}
          {activeSubMenu === 'Create Load' && openFormFor === 'Create Load' && (
            <div className="master-section erp-master-form">
              <div className="erp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="erp-title">Create Load</h2>
                </div>
                <button className="close-form-btn" onClick={closeForm}>✕</button>
              </div>

              <form className="master-form" onSubmit={(e) => { e.preventDefault(); saveCreateLoad(); }}>
                <div className="form-section">
                  <h4 className="section-header">Load Information</h4>
                  {/* Row 1: 5 fields */}
                  <div className="form-grid-5">
                    <div className="labeled-input">
                      <label>Load Series *</label>
                      <input
                        type="text"
                        name="loadSeries"
                        className="erp-input"
                        placeholder="Load Series"
                        value={createLoadFormData.loadSeries}
                        onChange={handleCreateLoadInputChange}
                        required
                      />
                    </div>
                    <div className="labeled-input">
                      <label>Load No *</label>
                      <input
                        type="text"
                        name="loadNo"
                        className="erp-input"
                        placeholder="Load Number"
                        value={createLoadFormData.loadNo}
                        onChange={handleCreateLoadInputChange}
                        required
                      />
                    </div>
                    <div className="labeled-input">
                      <label>Load Date *</label>
                      <input
                        type="date"
                        name="loadDate"
                        className="erp-input"
                        value={createLoadFormData.loadDate}
                        onChange={handleCreateLoadInputChange}
                        required
                      />
                    </div>
                    <div className="labeled-input">
                      <label>Company *</label>
                      <select
                        name="company"
                        className="erp-select"
                        value={createLoadFormData.company}
                        onChange={handleCreateLoadInputChange}
                        required
                      >
                        <option value="">Select Company</option>
                        {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="labeled-input">
                      <label>Delivery By *</label>
                      <input
                        type="text"
                        name="deliveryBy"
                        className="erp-input"
                        placeholder="Delivery By"
                        value={createLoadFormData.deliveryBy}
                        onChange={handleCreateLoadInputChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Row 2: 5 fields */}
                  <div className="form-grid-5">
                    <div className="labeled-input">
                      <label>Delivery Boy *</label>
                      <select
                        name="deliverBoy"
                        className="erp-select"
                        value={createLoadFormData.deliverBoy}
                        onChange={handleCreateLoadInputChange}
                        required
                      >
                        <option value="db">DB</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="labeled-input">
                      <label>Salesman Selection</label>
                      <select
                        name="selectedSalesman"
                        className="erp-select"
                        value={createLoadFormData.selectedSalesman}
                        onChange={handleCreateLoadInputChange}
                        multiple
                        size="3"
                        style={{ height: 'auto', minHeight: '80px' }}
                      >
                        {salesmen.filter(s => s.type === 'SALESMAN').map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                      <small style={{ fontSize: '11px', color: '#666' }}>Hold Ctrl/Cmd to select multiple</small>
                    </div>
                    <div className="labeled-input">
                      <label>Bill From Date *</label>
                      <input
                        type="date"
                        name="billFromDate"
                        className="erp-input"
                        value={createLoadFormData.billFromDate}
                        onChange={handleCreateLoadInputChange}
                        required
                      />
                    </div>
                    <div className="labeled-input">
                      <label>Bill To Date *</label>
                      <input
                        type="date"
                        name="billToDate"
                        className="erp-input"
                        value={createLoadFormData.billToDate}
                        onChange={handleCreateLoadInputChange}
                        required
                      />
                    </div>
                    <div className="labeled-input narration-field">
                      <label>Narration</label>
                      <textarea
                        name="narration"
                        className="erp-textarea"
                        rows="2"
                        placeholder="Enter narration..."
                        value={createLoadFormData.narration}
                        onChange={handleCreateLoadInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-header">Invoices Grid</h4>

                  {/* Removed Add Invoice button - only grid is shown */}

                  <div className="data-table-container" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px' }}>
                    <table className="data-table" style={{ minWidth: '1200px' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          <th style={{ position: 'sticky', left: 0, backgroundColor: '#f8fafc', zIndex: 20, width: '50px' }}>Sl No</th>
                          <th style={{ width: '100px' }}>Select</th>
                          <th style={{ width: '120px' }}>Party Code</th>
                          <th style={{ width: '180px' }}>Party Name</th>
                          <th style={{ width: '100px' }}>Bill Series</th>
                          <th style={{ width: '100px' }}>Bill No</th>
                          <th style={{ width: '110px' }}>Bill Date</th>
                          <th style={{ width: '120px' }}>Salesman</th>
                          <th style={{ width: '120px' }}>Area</th>
                          <th style={{ width: '120px' }}>Amount</th>
                          <th style={{ position: 'sticky', right: 0, backgroundColor: '#f8fafc', zIndex: 20, width: '80px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {createLoadItems.map((item, index) => (
                          <tr key={item.id}>
                            <td style={{ position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 5 }}>{item.sr}</td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={item.selected || false}
                                onChange={(e) => updateCreateLoadItem(index, 'selected', e.target.checked)}
                                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="erp-input"
                                value={item.partyCode}
                                onChange={(e) => updateCreateLoadItem(index, 'partyCode', e.target.value)}
                                placeholder="Party Code"
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="erp-input"
                                value={item.partyName}
                                onChange={(e) => updateCreateLoadItem(index, 'partyName', e.target.value)}
                                placeholder="Party Name"
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="erp-input"
                                value={item.billSeries}
                                onChange={(e) => updateCreateLoadItem(index, 'billSeries', e.target.value)}
                                placeholder="Series"
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="erp-input"
                                value={item.billNo}
                                onChange={(e) => updateCreateLoadItem(index, 'billNo', e.target.value)}
                                placeholder="Bill No"
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                className="erp-input"
                                value={item.billDate}
                                onChange={(e) => updateCreateLoadItem(index, 'billDate', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <select
                                className="erp-select"
                                value={item.salesman}
                                onChange={(e) => updateCreateLoadItem(index, 'salesman', e.target.value)}
                                style={{ width: '100%' }}
                              >
                                <option value="">Select</option>
                                {salesmen.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                              </select>
                            </td>
                            <td>
                              <select
                                className="erp-select"
                                value={item.area}
                                onChange={(e) => updateCreateLoadItem(index, 'area', e.target.value)}
                                style={{ width: '100%' }}
                              >
                                <option value="">Select</option>
                                {areas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                className="erp-input numeric"
                                value={item.amount}
                                onChange={(e) => updateCreateLoadItem(index, 'amount', e.target.value)}
                                placeholder="Amount"
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-delete"
                                onClick={() => deleteCreateLoadItem(index)}
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                🗑 Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {createLoadItems.length === 0 && (
                      <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                        No invoices added.
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    💾 Create Load
                  </button>
                  <button type="button" className="btn-secondary" onClick={closeForm}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
                    {/* Print Load Form */}
          {activeSubMenu === 'Print Load' && openFormFor === 'Print Load' && (
            <div className="master-section erp-master-form">
              <div className="erp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="erp-title">Print Load</h2>
                </div>
                <button className="close-form-btn" onClick={closeForm}>✕</button>
              </div>

              <form className="master-form" onSubmit={handlePrintLoadSubmit}>
                <div className="form-section">
                  <h4 className="section-header">Load Information</h4>

                  {/* Row 1: 5 fields */}
                  <div className="form-grid-5">
                    <div className="labeled-input">
                      <label>Load Series *</label>
                      <select
                        name="loadSeries"
                        className="erp-select"
                        value={printLoadFormData.loadSeries}
                        onChange={handlePrintLoadInputChange}
                        required
                      >
                        <option value="">Select Load Series</option>
                        <option value="LS-001">LS-001</option>
                        <option value="LS-002">LS-002</option>
                        <option value="LS-003">LS-003</option>
                      </select>
                    </div>
                    <div className="labeled-input">
                      <label>Load No *</label>
                      <input
                        type="text"
                        name="loadNo"
                        className="erp-input"
                        placeholder="Enter Load Number"
                        value={printLoadFormData.loadNo}
                        onChange={handlePrintLoadInputChange}
                        required
                      />
                    </div>
                    <div className="labeled-input">
                      <label>Report Level</label>
                      <select
                        name="reportLevel"
                        className="erp-select"
                        value={printLoadFormData.reportLevel}
                        onChange={handlePrintLoadInputChange}
                      >
                        <option value="">Select Report Level</option>
                        <option value="summary">Summary</option>
                        <option value="detailed">Detailed</option>
                        <option value="consolidated">Consolidated</option>
                      </select>
                    </div>
                    <div className="labeled-input">
                      <label>Print On</label>
                      <select
                        name="printOn"
                        className="erp-select"
                        value={printLoadFormData.printOn}
                        onChange={handlePrintLoadInputChange}
                      >
                        <option value="">Select Print Option</option>
                        <option value="printer">Printer</option>
                        <option value="pdf">PDF</option>
                        <option value="email">Email</option>
                      </select>
                    </div>
                    <div className="labeled-input">
                      <label>Print Layout</label>
                      <select
                        name="printLayout"
                        className="erp-select"
                        value={printLoadFormData.printLayout}
                        onChange={handlePrintLoadInputChange}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: 5 fields */}
                  <div className="form-grid-5">
                    <div className="labeled-input">
                      <label>Area Wise</label>
                      <select
                        name="areaWise"
                        className="erp-select"
                        value={printLoadFormData.areaWise}
                        onChange={handlePrintLoadInputChange}
                      >
                        <option value="N">No</option>
                        <option value="Y">Yes</option>
                      </select>
                    </div>
                    <div className="labeled-input">
                      <label>Salesman Wise</label>
                      <select
                        name="salesmanWise"
                        className="erp-select"
                        value={printLoadFormData.salesmanWise}
                        onChange={handlePrintLoadInputChange}
                      >
                        <option value="N">No</option>
                        <option value="Y">Yes</option>
                      </select>
                    </div>
                    <div className="labeled-input">
                      <label>Order By</label>
                      <select
                        name="orderBy"
                        className="erp-select"
                        value={printLoadFormData.orderBy}
                        onChange={handlePrintLoadInputChange}
                      >
                        <option value="product_wise">Product Wise</option>
                        <option value="product_code_wise">Product Code Wise</option>
                        <option value="short_code_wise">Short Code Wise</option>
                      </select>
                    </div>
                    <div className="labeled-input">
                      <label>Select Load</label>
                      <select className="erp-select">
                        <option value="">Select Load</option>
                        <option value="load1">Load 1</option>
                        <option value="load2">Load 2</option>
                      </select>
                    </div>
                    <div className="labeled-input">
                      <label>Filter By</label>
                      <select className="erp-select">
                        <option value="">All</option>
                        <option value="date">Date Range</option>
                        <option value="party">Party Wise</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    🔍 Load Data
                  </button>
                  <button type="button" className="btn-secondary" onClick={closeForm}>
                    Cancel
                  </button>
                </div>
              </form>

              {/* Print Preview Section with Scrollable Grid - MODIFIED VERSION */}
              {showPrintPreview && (
                <div className="form-section" style={{ marginTop: '30px' }}>
                  {/* Header with title and buttons in corner */}
                  <div className="print-preview-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '15px',
                    paddingBottom: '10px',
                    borderBottom: '2px solid #e5e7eb',

                  }}>

                    <h4 className="section-header" style={{ marginBottom: 0 }}>Print Preview</h4>
                    <div className="print-preview-actions" style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handlePrint}
                        style={{
                          background: '#3b82f6',
                          padding: '8px 20px',
                          fontSize: '13px',
                          fontWeight: '500',
                          borderRadius: '6px'
                        }}
                      >
                        🖨️ Print Selected
                      </button>
                      <button
                        type="button"
                        className="btn-excel"
                        onClick={handleExportToExcel}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          padding: '8px 20px',
                          fontSize: '13px',
                          fontWeight: '500',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        📊 Export Excel
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Grid with proper styling */}
                  <div id="print-load-content">
                    <div className="data-table-container" style={{
                      overflowX: 'auto',
                      overflowY: 'auto',
                      maxHeight: '500px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: 'white'
                    }}>
                      <table className="data-table" style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '13px',
                        fontFamily: 'inherit'
                      }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                          <tr style={{ backgroundColor: '#4CAF50', color: 'white' }}>
                            <th style={{ padding: '12px 10px', border: '1px solid #ddd', textAlign: 'center', width: '50px' }}>
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  const updatedItems = generatePrintLayout().map((item, idx) => ({
                                    ...item,
                                    selected: isChecked
                                  }));
                                  setPrintLoadItems(updatedItems);
                                }}
                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                              />
                            </th>
                            <th style={{ padding: '12px 10px', border: '1px solid #ddd', textAlign: 'center', width: '60px' }}>Sr No</th>
                            <th style={{ padding: '12px 10px', border: '1px solid #ddd', textAlign: 'left' }}>Party Name</th>
                            <th style={{ padding: '12px 10px', border: '1px solid #ddd', textAlign: 'left' }}>Bill No</th>
                            <th style={{ padding: '12px 10px', border: '1px solid #ddd', textAlign: 'right' }}>Amount (₹)</th>
                            <th style={{ padding: '12px 10px', border: '1px solid #ddd', textAlign: 'left' }}>Area</th>
                            <th style={{ padding: '12px 10px', border: '1px solid #ddd', textAlign: 'left' }}>Salesman</th>
                            <th style={{ padding: '12px 10px', border: '1px solid #ddd', textAlign: 'left' }}>Bill Date</th>
                            <th style={{ padding: '12px 10px', border: '1px solid #ddd', textAlign: 'left' }}>Party Code</th>
                          </tr>
                        </thead>
                        <tbody>
                          {generatePrintLayout().map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={item.selected || false}
                                  onChange={(e) => {
                                    const updatedItems = [...printLoadItems];
                                    updatedItems[index].selected = e.target.checked;
                                    setPrintLoadItems(updatedItems);
                                  }}
                                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                />
                              </td>
                              <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                              <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '500' }}>{item.partyName}</td>
                              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.billNo}</td>
                              <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#059669' }}>
                                ₹{item.amount.toFixed(2)}
                              </td>
                              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.area}</td>
                              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.salesman}</td>
                              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.billDate || '-'}</td>
                              <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.partyCode || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ backgroundColor: '#f9fafb', fontWeight: 'bold', borderTop: '2px solid #e5e7eb' }}>
                            <td colSpan="4" style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', background: '#f9fafb' }}>
                              Total Selected:
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', background: '#f9fafb', fontWeight: 'bold', color: '#059669' }}>
                              ₹{generatePrintLayout()
                                .filter(item => item.selected)
                                .reduce((sum, item) => sum + item.amount, 0)
                                .toFixed(2)}
                            </td>
                            <td colSpan="4" style={{ padding: '12px', border: '1px solid #ddd', background: '#f9fafb' }}>
                              ({generatePrintLayout().filter(item => item.selected).length} items selected)
                            </td>
                          </tr>
                          <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                            <td colSpan="4" style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', background: '#f3f4f6' }}>
                              Grand Total:
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', background: '#f3f4f6', fontWeight: 'bold', color: '#059669' }}>
                              ₹{generatePrintLayout().reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                            </td>
                            <td colSpan="4" style={{ padding: '12px', border: '1px solid #ddd', background: '#f3f4f6' }}>
                              ({generatePrintLayout().length} total items)
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dashboard Performance View - Show when no other menu is active or when explicitly set */}
          {((!activeSubMenu && showDashboard) || (activeSubMenu === 'Dashboard')) &&
            openFormFor !== 'Firm Creation' &&
            openFormFor !== 'User Creation' && (
              renderDashboard()
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
                    onChange={(e) => setFilters({ ...filters, firm: e.target.value })}
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
                        <th className="actions-header">Actions</th>
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
                            <td>{firm.address1 || '-'} {firm.address2 || ''}</td>
                            <td>{firm.city || '-'}</td>
                            <td>{firm.state || '-'}</td>
                            <td>{firm.mobileNo || '-'}</td>
                            <td>{firm.gstNo || '-'}</td>
                            <td className="action-buttons-cell">
                              <div className="action-buttons-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                                <button
                                  className="action-btn action-btn-view"
                                  onClick={() => {
                                    alert(`View Firm:\n\nCode: ${firm.firmCode}\nName: ${firm.firmName}\nAddress: ${firm.address1 || 'N/A'}\nCity: ${firm.city || 'N/A'}\nState: ${firm.state || 'N/A'}\nMobile: ${firm.mobileNo || 'N/A'}\nGST: ${firm.gstNo || 'N/A'}`);
                                  }}
                                  title="View"
                                  style={{
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                                >
                                  👁️ View
                                </button>
                                <button
                                  className="action-btn action-btn-edit"
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
                                  title="Edit"
                                  style={{
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className="action-btn action-btn-delete"
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this firm?')) {
                                      setFirms(firms.filter(f => f.id !== firm.id));
                                    }
                                  }}
                                  title="Delete"
                                  style={{
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                                >
                                  🗑 Delete
                                </button>
                              </div>
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
                    onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                  />
                  <button className="btn-excel" onClick={() => exportToExcel(
                    users.filter(u =>
                      u.userName?.toLowerCase().includes((filters.user || '').toLowerCase())
                    ),
                    'Users_List',
                    [
                      { key: 'userName', label: 'User Name' },
                      { key: 'role', label: 'Role' },
                      { key: 'status', label: 'Status' }
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
                      { key: 'userName', label: 'User Name' },
                      { key: 'role', label: 'Role' }
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
                        <th className="actions-header">Actions</th>
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
                                display: 'inline-block',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500',
                                background: user.userName === currentUser ? '#d1fae5' : '#f3f4f6',
                                color: user.userName === currentUser ? '#059669' : '#6b7280'
                              }}>
                                {user.userName === currentUser ? '✅ Current Session' : 'Inactive'}
                              </span>
                            </td>
                            <td className="action-buttons-cell">
                              <div className="action-buttons-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                                <button
                                  className="action-btn action-btn-view"
                                  onClick={() => {
                                    alert(`View User:\n\nUsername: ${user.userName}\nRole: ${user.userName === 'ADMIN' ? 'Administrator' : 'User'}\nStatus: ${user.userName === currentUser ? 'Active Session' : 'Inactive'}`);
                                  }}
                                  title="View"
                                  style={{
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                                >
                                  👁️ View
                                </button>
                                {user.userName !== 'ADMIN' ? (
                                  <>
                                    <button
                                      className="action-btn action-btn-edit"
                                      onClick={() => {
                                        setUserData({
                                          userName: user.userName,
                                          oldPassword: '',
                                          password: '',
                                          reEnterPassword: ''
                                        });
                                        setOpenFormFor('User Creation');
                                      }}
                                      title="Edit"
                                      style={{
                                        background: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '6px 12px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      className="action-btn action-btn-delete"
                                      onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete user "${user.userName}"?`)) {
                                          setUsers(users.filter(u => u.userName !== user.userName));
                                          alert(`User "${user.userName}" deleted successfully!`);
                                        }
                                      }}
                                      title="Delete"
                                      style={{
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '6px 12px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                                    >
                                      🗑 Delete
                                    </button>
                                  </>
                                ) : (
                                  <span style={{ fontSize: '12px', color: '#9ca3af', padding: '6px 12px' }}>System User</span>
                                )}
                              </div>
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

          {activeMenu === "transactions" && (

            <Transaction
              salesInvoices={salesListData}
              salesmen={salesmen}
              accounts={accounts}
              customerBanks={customerBanks}
              activeTransaction={activeSubMenu}
              openFormFor={openFormFor}
              showReceiptForm={showReceiptForm}
              setShowReceiptForm={setShowReceiptForm}
              transactionFormMode={transactionFormMode}
              setTransactionFormMode={setTransactionFormMode}
              setActiveTransaction={setOpenFormFor}

            />
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
                      <div className="form-actions-left">
  <button type="submit" className="btn-primary">
    Save Product
  </button>

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

            {/* Sales Invoice (Billing) Form */}
          {activeSubMenu === 'Billing' && openFormFor === 'Billing' && (
            <div className="master-section erp-master-form sales-invoice">
              <div className="erp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="erp-title">Sales Invoice (Billing)</h2>
                </div>
                <button className="close-form-btn" onClick={closeForm}>✕</button>
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

              {/* Product Entry Table - Keep the existing product entry table code */}
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
                                                    setShowBatchSelectionModal(true);
                                                  } else if (productBatches.length === 1) {
                                                    handleProductSelect(currentProductIndex, {
                                                      ...product,
                                                      selectedBatch: productBatches[0]
                                                    });
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
                            <td><input className="erp-input numeric" data-field="mrp" data-index={index} value={item.mrp} readOnly style={{ width: '100%', backgroundColor: '#f3f4f6' }} /></td>
                            <td><input className="erp-input numeric" data-field="rate" data-index={index} value={item.rate} onChange={(e) => updateInvoiceItem(index, 'rate', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'rate')} style={{ width: '100%' }} /></td>
                            <td><input className="erp-input numeric" data-field="rateGst" data-index={index} value={item.rateGst} readOnly style={{ width: '100%', backgroundColor: '#f3f4f6' }} /></td>
                            <td><input className="erp-input numeric" data-field="tprAmt" data-index={index} value={item.tprAmt} onChange={(e) => updateInvoiceItem(index, 'tprAmt', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'tprAmt')} style={{ width: '100%' }} /></td>
                            <td><input className="erp-input numeric small" data-field="schemePct" data-index={index} value={item.schemePct} onChange={(e) => updateInvoiceItem(index, 'schemePct', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'schemePct')} style={{ width: '100%' }} /></td>
                            <td><input className="erp-input numeric" data-field="schemeAmt" data-index={index} value={item.schemeAmt} readOnly style={{ width: '100%', backgroundColor: '#f3f4f6' }} /></td>
                            <td><input className="erp-input numeric small" data-field="cdPct" data-index={index} value={item.cdPct} onChange={(e) => updateInvoiceItem(index, 'cdPct', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'cdPct')} style={{ width: '100%' }} /></td>
                            <td><input className="erp-input numeric" data-field="cdAmt" data-index={index} value={item.cdAmt} readOnly style={{ width: '100%', backgroundColor: '#f3f4f6' }} /></td>
                            <td><input className="erp-input numeric small" data-field="starPct" data-index={index} value={item.starPct} onChange={(e) => updateInvoiceItem(index, 'starPct', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'starPct')} style={{ width: '100%' }} /></td>
                            <td><input className="erp-input numeric" data-field="starAmt" data-index={index} value={item.starAmt} onChange={(e) => updateInvoiceItem(index, 'starAmt', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'starAmt')} style={{ width: '100%' }} /></td>
                            <td><input className="erp-input numeric" data-field="taxable" data-index={index} value={item.taxable} readOnly style={{ width: '100%', backgroundColor: '#f3f4f6' }} /></td>
                            <td><input className="erp-input numeric small" data-field="gst" data-index={index} value={item.gst} onChange={(e) => updateInvoiceItem(index, 'gst', e.target.value)} onKeyDown={(e) => handleInvoiceKeyDown(e, index, 'gst')} style={{ width: '100%' }} /></td>
                            <td><input className="erp-input numeric" data-field="sgst" data-index={index} value={item.sgst} readOnly style={{ width: '100%', backgroundColor: '#f3f4f6' }} /></td>
                            <td><input className="erp-input numeric" data-field="cgst" data-index={index} value={item.cgst} readOnly style={{ width: '100%', backgroundColor: '#f3f4f6' }} /></td>
                            <td><input className="erp-input numeric font-bold" data-field="amount" data-index={index} value={item.amount} readOnly style={{ width: '100%', fontWeight: 'bold', backgroundColor: '#f3f4f6' }} /></td>
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
                <button type="button" className="btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Purchase Form - Only shown when openFormFor is 'Purchase' */}
          {activeSubMenu === 'Purchase' && openFormFor === 'Purchase' && (
            <div className="master-section erp-master-form purchase-invoice">
              <div className="erp-header">
                <div>
                  <h2 className="erp-title">Add Purchase</h2>
                </div>
                <button className="close-form-btn" onClick={closeForm}>✕</button>
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
                <div className="labeled-input">
  <label>SUPPLIER *</label>
  <select name="supplier" className="erp-select" value={purchaseFormData.supplier} onChange={handlePurchaseInputChange}>
    <option value="">Select Supplier</option>
    {otherAccounts
      .filter(acc => acc.accountGroup === 'SUNDRY CREDITORS')
      .map(acc => <option key={acc.id} value={acc.accountName}>{acc.accountName}</option>)}
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
                      value={purchaseFormData.narration}
                      onChange={handlePurchaseInputChange}
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
                              {showPurchaseProductList && currentPurchaseProductIndex === index && (
                                <div className="product-dropdown-overlay">
                                  <div className="product-dropdown">
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
                                    </div>
                                  </div>
                                </div>
                              )}
                            </td>
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
                <button type="button" className="btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {/* Credit Note Form - Only shown when openFormFor is 'Credit Note' */}
          {activeSubMenu === 'Credit Note' && openFormFor === 'Credit Note' && (
            <div className="master-section erp-master-form credit-note">
              <div className="erp-header">
                <div>
                  <h2 className="erp-title">Credit Note</h2>
                </div>
                <button className="close-form-btn" onClick={closeForm}>✕</button>
              </div>

              {/* Credit Note Header */}
              <div className="form-section">
                <h4 className="section-header">Credit Note Information</h4>
                <div className="invoice-header-grid">
                  <div className="labeled-input">
                    <label>VDate *</label>
                    <input
                      type="date"
                      name="vDate"
                      className="erp-input"
                      value={creditNoteFormData?.vDate || ''}
                      onChange={handleCreditNoteInputChange}
                    />
                  </div>

                  <div className="labeled-input">
                    <label>VNo.</label>
                    <input
                      name="vNo"
                      className="erp-input"
                      placeholder="VNo."
                      value={creditNoteFormData?.vNo || ''}
                      onChange={handleCreditNoteInputChange}
                    />
                  </div>

                  <div className="labeled-input">
                    <label>Party *</label>
                    <select
                      name="party"
                      className="erp-select"
                      value={creditNoteFormData?.party || ''}
                      onChange={handleCreditNoteInputChange}
                    >
                      <option value="">Select Party</option>
                      {accounts?.map(a => <option key={a.id} value={a.accountName}>{a.accountName}</option>)}
                    </select>
                  </div>

                  <div className="labeled-input">
                    <label>Godown</label>
                    <select
                      name="godown"
                      className="erp-select"
                      value={creditNoteFormData?.godown || ''}
                      onChange={handleCreditNoteInputChange}
                    >
                      <option value="">Select Godown</option>
                      {godowns?.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                    </select>
                  </div>

                  <div className="labeled-input">
                    <label>Salesman</label>
                    <select
                      name="salesman"
                      className="erp-select"
                      value={creditNoteFormData?.salesman || ''}
                      onChange={handleCreditNoteInputChange}
                    >
                      <option value="">Select Salesman</option>
                      {salesmen?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="labeled-input">
                    <label>TIN No.</label>
                    <input
                      name="tinNo"
                      className="erp-input"
                      placeholder="TIN No."
                      value={creditNoteFormData?.tinNo || ''}
                      onChange={handleCreditNoteInputChange}
                    />
                  </div>

                  <div className="labeled-input">
                    <label>Company</label>
                    <select
                      name="company"
                      className="erp-select"
                      value={creditNoteFormData?.company || ''}
                      onChange={handleCreditNoteInputChange}
                    >
                      <option value="">Select Company</option>
                      {companies?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="labeled-input narration-field">
                    <label>Narr</label>
                    <textarea
                      name="narr"
                      className="erp-textarea"
                      rows="2"
                      placeholder="Narration"
                      value={creditNoteFormData?.narr || ''}
                      onChange={handleCreditNoteInputChange}
                    />
                  </div>

                  <div className="labeled-input">
                    <label>BillSeries</label>
                    <input
                      name="billSeries"
                      className="erp-input"
                      placeholder="Bill Series"
                      value={creditNoteFormData?.billSeries || ''}
                      onChange={handleCreditNoteInputChange}
                    />
                  </div>

                  <div className="labeled-input">
                    <label>BillNo</label>
                    <input
                      name="billNo"
                      className="erp-input"
                      placeholder="Bill No"
                      value={creditNoteFormData?.billNo || ''}
                      onChange={handleCreditNoteInputChange}
                    />
                  </div>

                  <div className="labeled-input">
                    <label>Full</label>
                    <input
                      name="full"
                      className="erp-input"
                      placeholder="Full"
                      value={creditNoteFormData?.full || ''}
                      onChange={handleCreditNoteInputChange}
                    />
                  </div>

                  <div className="labeled-input">
                    <label>RefNo</label>
                    <input
                      name="refNo"
                      className="erp-input"
                      placeholder="Ref No"
                      value={creditNoteFormData?.refNo || ''}
                      onChange={handleCreditNoteInputChange}
                    />
                  </div>

                  <div className="labeled-input">
                    <label>RefDate</label>
                    <input
                      type="date"
                      name="refDate"
                      className="erp-input"
                      value={creditNoteFormData?.refDate || ''}
                      onChange={handleCreditNoteInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Product Entry Grid for Credit Note */}
              <div className="form-section">
                <h4 className="section-header">
                  Product Entry
                  <button className="btn-secondary ml-auto" onClick={addCreditNoteItem}>+ Add Product</button>
                </h4>
                <div className="product-entry-container" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px' }}>
                  <div className="erp-table-container" style={{ minWidth: '2500px' }}>
                    <table className="product-entry-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          <th style={{ position: 'sticky', left: 0, backgroundColor: '#f8fafc', zIndex: 20, minWidth: '50px' }}>SrNo</th>
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
                        {creditNoteItems?.map((item, index) => (
                          <tr key={item.id || index} className={index === creditNoteActiveRow ? 'active-row' : ''}>
                            <td style={{ position: 'sticky', left: 0, backgroundColor: index === creditNoteActiveRow ? '#eff6ff' : 'white', zIndex: 5 }}>{item.sr || index + 1}</td>
                            <td>
                              <select
                                className="erp-select"
                                value={item.trn || 'GDR'}
                                onChange={(e) => updateCreditNoteItem(index, 'trn', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown?.(e, index, 'trn')}
                                style={{ width: '100%' }}
                              >
                                <option value="GDR">GDR</option>
                                <option value="DGR">DGR</option>
                              </select>
                            </td>
                            <td>
                              <input
                                className="erp-input"
                                value={item.itemCode || ''}
                                onChange={(e) => updateCreditNoteItem(index, 'itemCode', e.target.value)}
                                onClick={() => handleCreditProductClick?.(index)}
                                onKeyDown={(e) => handleCreditNoteKeyDown?.(e, index, 'itemCode')}
                                style={{ width: '100%', cursor: 'pointer' }}
                                placeholder="Click to select"
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input"
                                value={item.itemName || ''}
                                onChange={(e) => updateCreditNoteItem(index, 'itemName', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown?.(e, index, 'itemName')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <select
                                className="erp-select"
                                value={item.unit || 'PCS'}
                                onChange={(e) => updateCreditNoteItem(index, 'unit', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown?.(e, index, 'unit')}
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
                                value={item.qty || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'qty', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown?.(e, index, 'qty')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.free || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'free', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown?.(e, index, 'free')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.rate || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'rate', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown?.(e, index, 'rate')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.grossAmt || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'grossAmt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                value={item.schPercent || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'schPercent', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown?.(e, index, 'schPercent')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.schAmt || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'schAmt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                value={item.cdPercent || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'cdPercent', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown?.(e, index, 'cdPercent')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.cdAmt || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'cdAmt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                value={item.tprPercent || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'tprPercent', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown?.(e, index, 'tprPercent')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.tprAmt || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'tprAmt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                value={item.starPercent || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'starPercent', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown?.(e, index, 'starPercent')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.taxable || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'taxable', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                value={item.gstPercent || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'gstPercent', e.target.value)}
                                onKeyDown={(e) => handleCreditNoteKeyDown?.(e, index, 'gstPercent')}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.gstAmt || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'gstAmt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.avDisc1 || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'avDisc1', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.avDisc2 || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'avDisc2', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input"
                                value={item.areaCode || ''}
                                onChange={(e) => updateCreditNoteItem(index, 'areaCode', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.cgst || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'cgst', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.sgst || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'sgst', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.igst || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'igst', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric small"
                                type="number"
                                value={item.cessPercent || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'cessPercent', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.cessAmt || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'cessAmt', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.cessPerPi || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'cessPerPi', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.secCessi || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'secCessi', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.crateSize || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'crateSize', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                value={item.crateQty || 0}
                                onChange={(e) => updateCreditNoteItem(index, 'crateQty', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <input
                                className="erp-input"
                                value={item.crateSysProc || ''}
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
                  <div>Gross Amt: <span className="amount">₹{creditNoteSummary?.grossAmt?.toFixed(2) || '0.00'}</span></div>
                  <div>Scheme Amt: <span className="amount">-₹{creditNoteSummary?.schemeAmt?.toFixed(2) || '0.00'}</span></div>
                  <div>TPR Amt: <span className="amount">-₹{creditNoteSummary?.tprAmt?.toFixed(2) || '0.00'}</span></div>
                  <div>Cash Disc: <span className="amount">-₹{creditNoteSummary?.cashDisc?.toFixed(2) || '0.00'}</span></div>
                  <div>GST Amt: <span className="amount">+₹{creditNoteSummary?.gstAmt?.toFixed(2) || '0.00'}</span></div>
                  <div>STAR Amt: <span className="amount">₹{creditNoteSummary?.starAmt?.toFixed(2) || '0.00'}</span></div>
                  <div>AddLess: <span className="amount">₹{creditNoteSummary?.addLess || '0'}</span></div>
                  <div>Display: <span className="amount">₹{creditNoteSummary?.display || '0'}</span></div>
                  <div>Coupon: <span className="amount">₹{creditNoteSummary?.coupon || '0'}</span></div>
                  <div>Rounding: <span className="amount">₹{creditNoteSummary?.rounding || '0'}</span></div>
                  <div>Cess Amt: <span className="amount">₹{creditNoteSummary?.cessAmt?.toFixed(2) || '0.00'}</span></div>
                  <div className="tcs-field">
                    TCS %: <input
                      className="erp-input small"
                      placeholder="0"
                      value={creditNoteSummary?.tcsPercent || ''}
                      onChange={(e) => setCreditNoteSummary?.({ ...creditNoteSummary, tcsPercent: e.target.value })}
                    />
                    TCS Amt: ₹{creditNoteSummary?.tcsAmt || '0'}
                  </div>
                  <div>Bill Bal. Amt: <span className="amount">₹{creditNoteSummary?.billBalAmt || '0'}</span></div>
                  <div className="net-amount">Net Amt: <strong>₹{creditNoteSummary?.netAmt || '0'}</strong></div>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-add-invoice" onClick={saveCreditNote}>
                  💾 Save Credit Note
                </button>
                <button type="button" className="btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Debit Note Form - Only shown when openFormFor is 'Debit Note' */}
          {activeSubMenu === 'Debit Note' && openFormFor === 'Debit Note' && (
            <div className="master-section erp-master-form debit-note">
              <div className="erp-header">
                <div>
                  <h2 className="erp-title">Debit Note</h2>
                </div>
                <button className="close-form-btn" onClick={closeForm}>✕</button>
              </div>

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
                            <td>
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
                            </td>
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
                            <td>
                              <input
                                className="erp-input numeric"
                                type="number"
                                data-debit-field="avDisc1"
                                data-debit-index={index}
                                value={item.avDisc1}
                                onChange={(e) => updateDebitNoteItem(index, 'avDisc1', e.target.value)}
                                style={{ width: '100%' }}
                              />
                            </td>
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
                <button type="button" className="btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Sales/Billing List View */}
          {activeSubMenu === 'Billing' && showSalesList && (
            renderVoucherList('Sales', salesListData.filter(s => s.type !== 'Quotation'), [])
          )}

          {/* Quotation List View */}
          {activeSubMenu === 'Quotation' && showSalesList && (
            renderVoucherList('Quotation', salesListData.filter(s => s.type === 'Quotation'), [])
          )}

          {/* Purchase List View */}
          {activeSubMenu === 'Purchase' && showPurchaseList && !openFormFor && (
            renderVoucherList('Purchase', purchaseListData, [])
          )}
          {/* Credit Note List View */}
          {activeSubMenu === 'Credit Note' && showCreditNoteList && !openFormFor && (
            renderVoucherList('Credit Note', creditNoteListData, [])
          )}
          {/* Debit Note List View */}
          {activeSubMenu === 'Debit Note' && showDebitNoteList && !openFormFor && (
            renderVoucherList('Debit Note', debitNoteListData, [])
          )}
          {/* Create Load List View */}
          {activeSubMenu === 'Create Load' && showCreateLoadList && (
            renderLoadList('Create Load', createLoadListData)
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
    selectedBatch: { ...batch },
    batchNo: batch.batchNo,
    mfgDate: batch.mfgDate,
    expDate: batch.expDate,
    mrp: batch.mrp,
    purRate: batch.purchaseRate,
    salesRate: batch.salesRate,
    stockQty: batch.stockQty,
    boxPack: batch.boxPack || 1,
    ratePerUnit: batch.ratePerUnit || 1,
    previousPurchaseRate: batch.previousPurchaseRate || '',
    quantity: updatedItems[currentBatchRow]?.quantity || 1
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

      {/* View Modal */}
      {showViewModal && viewData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999999
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowViewModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '600px',
              maxWidth: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>View {viewType} Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <strong>Date:</strong> {viewData.billDate || viewData.invoiceDate || viewData.vDate || '-'}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Bill Series:</strong> {viewData.billSeries || '-'}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Bill Number:</strong> {viewData.billNo || viewData.invoiceNumber || viewData.vNo || '-'}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Bill Type:</strong> {viewData.billType || '-'}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Party Name:</strong> {viewData.party || viewData.partyName || viewData.supplier || '-'}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Party Code:</strong> {viewData.partyCode || '-'}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Branch/Area:</strong> {viewData.area || viewData.branchName || viewData.storageLocation || '-'}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Amount:</strong> <span style={{ fontWeight: 'bold', color: '#059669' }}>₹{parseFloat(viewData.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Status:</strong> <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: viewData.status === 'Paid' || viewData.status === 'Approved' ? '#d1fae5' : '#fef3c7', color: viewData.status === 'Paid' || viewData.status === 'Approved' ? '#065f46' : '#92400e' }}>{viewData.status || 'Pending'}</span>
            </div>
            {viewData.narration && (
              <div style={{ marginBottom: '15px' }}>
                <strong>Narration:</strong> {viewData.narration}
              </div>
            )}

            {viewData.items && viewData.items.length > 0 && (
              <>
                <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Products/Items</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ padding: '8px', border: '1px solid #e5e7eb' }}>Sr</th>
                        <th style={{ padding: '8px', border: '1px solid #e5e7eb' }}>Product</th>
                        <th style={{ padding: '8px', border: '1px solid #e5e7eb' }}>Qty</th>
                        <th style={{ padding: '8px', border: '1px solid #e5e7eb' }}>Rate</th>
                        <th style={{ padding: '8px', border: '1px solid #e5e7eb' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{item.sr || idx + 1}</td>
                          <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{item.product || item.itemName || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{item.qty || item.quantity || '-'}</td>
                          <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>₹{parseFloat(item.rate || 0).toFixed(2)}</td>
                          <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f9fafb', fontWeight: 'bold' }}>
                        <td colSpan="4" style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>Total:</td>
                        <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>₹{parseFloat(viewData.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setShowViewModal(false)}
                style={{ padding: '8px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
