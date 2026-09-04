import React, {
  createContext,
  useContext,
  useReducer,
  useEffect
} from "react";

const ERPContext = createContext();

const initialState = {
  salesInvoices: [],
  payments: [],
  receipts: [],
  journals: [],
  chequeBounces: [],
  pdcDockets: [],
  contra: [],
  collectionVouchers: []
};

// Helper function to load data from localStorage
const loadFromLocalStorage = () => {
  try {
    const savedChequeBounces = localStorage.getItem('erp_cheque_bounces');
    const savedSalesInvoices = localStorage.getItem('erp_sales_invoices');
    const savedPDCDockets = localStorage.getItem('erp_pdc_dockets');
    const savedContra = localStorage.getItem('erp_contra');
    const savedCollectionVouchers = localStorage.getItem('erp_collection_vouchers');
    const savedReceipts = localStorage.getItem('erp_receipts');
    const savedPayments = localStorage.getItem('erp_payments');
    const savedJournals = localStorage.getItem('erp_journals');
    
    return {
      chequeBounces: savedChequeBounces ? JSON.parse(savedChequeBounces) : [],
      salesInvoices: savedSalesInvoices ? JSON.parse(savedSalesInvoices) : [],
      pdcDockets: savedPDCDockets ? JSON.parse(savedPDCDockets) : [],
      contra: savedContra ? JSON.parse(savedContra) : [],
      collectionVouchers: savedCollectionVouchers ? JSON.parse(savedCollectionVouchers) : [],
      receipts: savedReceipts ? JSON.parse(savedReceipts) : [],
      payments: savedPayments ? JSON.parse(savedPayments) : [],
      journals: savedJournals ? JSON.parse(savedJournals) : []
    };
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return {
      chequeBounces: [],
      salesInvoices: [],
      pdcDockets: [],
      contra: [],
      collectionVouchers: [],
      receipts: [],
      payments: [],
      journals: []
    };
  }
};

// Helper function to save to localStorage
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

function erpReducer(state, action) {
  switch (action.type) {
    // =========================
    // SALES INVOICE
    // =========================
    case "ADD_SALES_INVOICE": {
      const newSalesInvoices = [...state.salesInvoices, action.payload];
      saveToLocalStorage('erp_sales_invoices', newSalesInvoices);
      return { ...state, salesInvoices: newSalesInvoices };
    }

    case "SET_SALES_INVOICES": {
      saveToLocalStorage('erp_sales_invoices', action.payload);
      return { ...state, salesInvoices: action.payload };
    }

    case "UPDATE_SALES_INVOICE": {
      const updatedSalesInvoices = state.salesInvoices.map((invoice) =>
        invoice.id === action.payload.id ? action.payload : invoice
      );
      saveToLocalStorage('erp_sales_invoices', updatedSalesInvoices);
      return { ...state, salesInvoices: updatedSalesInvoices };
    }

    case "DELETE_SALES_INVOICE": {
      const filtered = state.salesInvoices.filter((inv) => inv.id !== action.payload);
      saveToLocalStorage('erp_sales_invoices', filtered);
      return { ...state, salesInvoices: filtered };
    }

    // =========================
    // RECEIPTS
    // =========================
    case "ADD_RECEIPT": {
      const newReceipts = [...state.receipts, action.payload];
      saveToLocalStorage('erp_receipts', newReceipts);
      return { ...state, receipts: newReceipts };
    }

    case "SET_RECEIPTS": {
      saveToLocalStorage('erp_receipts', action.payload);
      return { ...state, receipts: action.payload };
    }

    case "UPDATE_RECEIPT": {
      const updatedReceipts = state.receipts.map((r) =>
        r.id === action.payload.id ? action.payload : r
      );
      saveToLocalStorage('erp_receipts', updatedReceipts);
      return { ...state, receipts: updatedReceipts };
    }

    case "DELETE_RECEIPT": {
      const filtered = state.receipts.filter((r) => r.id !== action.payload);
      saveToLocalStorage('erp_receipts', filtered);
      return { ...state, receipts: filtered };
    }

    // =========================
    // PAYMENTS
    // =========================
    case "ADD_PAYMENT": {
      const newPayments = [...state.payments, action.payload];
      saveToLocalStorage('erp_payments', newPayments);
      return { ...state, payments: newPayments };
    }

    case "SET_PAYMENTS": {
      saveToLocalStorage('erp_payments', action.payload);
      return { ...state, payments: action.payload };
    }

    case "UPDATE_PAYMENT": {
      const updatedPayments = state.payments.map((p) =>
        String(p._id || p.id) === String(action.payload._id || action.payload.id) ? action.payload : p
      );
      saveToLocalStorage('erp_payments', updatedPayments);
      return { ...state, payments: updatedPayments };
    }

    case "DELETE_PAYMENT": {
      const filtered = state.payments.filter((p) => String(p._id || p.id) !== String(action.payload));
      saveToLocalStorage('erp_payments', filtered);
      return { ...state, payments: filtered };
    }

    // =========================
    // JOURNALS
    // =========================
    case "ADD_JOURNAL": {
      const newJournals = [...state.journals, action.payload];
      saveToLocalStorage('erp_journals', newJournals);
      return { ...state, journals: newJournals };
    }

    case "SET_JOURNALS": {
      saveToLocalStorage('erp_journals', action.payload);
      return { ...state, journals: action.payload };
    }

    case "UPDATE_JOURNAL": {
      const updatedJournals = state.journals.map((j) =>
        String(j._id || j.id) === String(action.payload._id || action.payload.id) ? action.payload : j
      );
      saveToLocalStorage('erp_journals', updatedJournals);
      return { ...state, journals: updatedJournals };
    }

    case "DELETE_JOURNAL": {
      const filtered = state.journals.filter((j) => String(j._id || j.id) !== String(action.payload));
      saveToLocalStorage('erp_journals', filtered);
      return { ...state, journals: filtered };
    }

   // =========================
// CHEQUE BOUNCE
// =========================
case "ADD_CHEQUE_BOUNCE": {
  const newChequeBounces = [...state.chequeBounces, action.payload];
  saveToLocalStorage("erp_cheque_bounces", newChequeBounces);
  return { ...state, chequeBounces: newChequeBounces };
}

case "SET_CHEQUE_BOUNCES": {
  saveToLocalStorage("erp_cheque_bounces", action.payload);
  return { ...state, chequeBounces: action.payload };
}

case "UPDATE_CHEQUE_BOUNCE": {
  const updatedChequeBounces = state.chequeBounces.map((cb) =>
    cb.id === action.payload.id ? action.payload : cb
  );
  saveToLocalStorage("erp_cheque_bounces", updatedChequeBounces);
  return { ...state, chequeBounces: updatedChequeBounces };
}

case "DELETE_CHEQUE_BOUNCE": {
  const filtered = state.chequeBounces.filter(
    (cb) => cb.id !== action.payload
  );
  saveToLocalStorage("erp_cheque_bounces", filtered);
  return { ...state, chequeBounces: filtered };
}

    // =========================
    // PDC DOCKET
    // =========================
    case "ADD_PDC_DOCKET": {
      const newPDCDockets = [...state.pdcDockets, action.payload];
      saveToLocalStorage('erp_pdc_dockets', newPDCDockets);
      return { ...state, pdcDockets: newPDCDockets };
    }

    case "SET_PDC_DOCKETS": {
      saveToLocalStorage('erp_pdc_dockets', action.payload);
      return { ...state, pdcDockets: action.payload };
    }

    case "UPDATE_PDC_DOCKET": {
      const updatedPDCDockets = state.pdcDockets.map((d) =>
        d.id === action.payload.id ? action.payload : d
      );
      saveToLocalStorage('erp_pdc_dockets', updatedPDCDockets);
      return { ...state, pdcDockets: updatedPDCDockets };
    }

    case "DELETE_PDC_DOCKET": {
      const filtered = state.pdcDockets.filter((d) => d.id !== action.payload);
      saveToLocalStorage('erp_pdc_dockets', filtered);
      return { ...state, pdcDockets: filtered };
    }

    // =========================
    // CONTRA
    // =========================
    case "ADD_CONTRA": {
      const newContra = [...state.contra, action.payload];
      saveToLocalStorage('erp_contra', newContra);
      return { ...state, contra: newContra };
    }

    case "SET_CONTRA": {
      saveToLocalStorage('erp_contra', action.payload);
      return { ...state, contra: action.payload };
    }

    case "UPDATE_CONTRA": {
      const updatedContra = state.contra.map((c) =>
        c.id === action.payload.id ? action.payload : c
      );
      saveToLocalStorage('erp_contra', updatedContra);
      return { ...state, contra: updatedContra };
    }

    case "DELETE_CONTRA": {
      const filtered = state.contra.filter((c) => c.id !== action.payload);
      saveToLocalStorage('erp_contra', filtered);
      return { ...state, contra: filtered };
    }

    // =========================
    // COLLECTION VOUCHER
    // =========================
    case "ADD_COLLECTION_VOUCHER": {
      const newCollectionVouchers = [...state.collectionVouchers, action.payload];
      saveToLocalStorage('erp_collection_vouchers', newCollectionVouchers);
      return { ...state, collectionVouchers: newCollectionVouchers };
    }

    case "SET_COLLECTION_VOUCHERS": {
      saveToLocalStorage('erp_collection_vouchers', action.payload);
      return { ...state, collectionVouchers: action.payload };
    }

    case "UPDATE_COLLECTION_VOUCHER": {
      const updatedCollectionVouchers = state.collectionVouchers.map((c) =>
        c.id === action.payload.id ? action.payload : c
      );
      saveToLocalStorage('erp_collection_vouchers', updatedCollectionVouchers);
      return { ...state, collectionVouchers: updatedCollectionVouchers };
    }

    case "DELETE_COLLECTION_VOUCHER": {
      const filtered = state.collectionVouchers.filter((c) => c.id !== action.payload);
      saveToLocalStorage('erp_collection_vouchers', filtered);
      return { ...state, collectionVouchers: filtered };
    }

    // =========================
    // UTILITY ACTIONS
    // =========================
    case "CLEAR_ALL_DATA": {
      const keys = ['erp_cheque_bounces', 'erp_sales_invoices', 'erp_pdc_dockets', 
                    'erp_contra', 'erp_collection_vouchers', 'erp_receipts', 
                    'erp_payments', 'erp_journals'];
      keys.forEach(key => localStorage.removeItem(key));
      return {
        ...state,
        salesInvoices: [],
        payments: [],
        receipts: [],
        journals: [],
        chequeBounces: [],
        pdcDockets: [],
        contra: [],
        collectionVouchers: []
      };
    }

    case "RESET_DEMO_DATA": {
      // Demo data for testing
      const demoChequeBounces = [
        {
          id: 1,
          chqBounceDate: "2026-05-18",
          chqBounceNo: "CB001",
          narration: "Cheque bounced due to insufficient funds",
          partyName: "ABC MEDICAL",
          chqBounceCharges: "500",
          chequeNo: "CHK123",
          chequeDate: "2026-05-15",
          chequeAmt: "25000",
          clearingDate: "2026-05-16",
          receiptNo: "REC001",
          bankName: "HDFC BANK",
          totalAmt: "25500"
        }
      ];

      const demoPDCDockets = [
        {
          id: 1,
          header: {
            depositDate: "2026-05-18",
            docVNo: "DOC001",
            fromDate: "2026-04-01",
            toDate: "2026-05-18",
            houseBank: "SYG",
            bankName: "SURNAYUG CO OP BANK",
            narration: "Test PDC Docket",
            clearingType: "SAME BANK",
            clearingDate: "2026-05-19",
            totalAmount: "25000.00",
            totalCheques: "1"
          },
          createdAt: new Date().toISOString()
        }
      ];

      const demoContra = [
        {
          id: 1,
          transactionDate: "2026-05-18",
          tranVNo: "CT001",
          transactionType: "CASH DEPOSIT",
          amount: "50000",
          narration: "Test deposit",
          createdAt: new Date().toISOString()
        }
      ];

      const demoCollectionVouchers = [
        {
          id: 1,
          collectionDate: "2026-05-18",
          colVNo: "CV001",
          narration: "Test collection voucher",
          collectionType: "Bill wise",
          createdAt: new Date().toISOString()
        }
      ];
      
      saveToLocalStorage('erp_cheque_bounces', demoChequeBounces);
      saveToLocalStorage('erp_pdc_dockets', demoPDCDockets);
      saveToLocalStorage('erp_contra', demoContra);
      saveToLocalStorage('erp_collection_vouchers', demoCollectionVouchers);
      
      return {
        ...state,
        chequeBounces: demoChequeBounces,
        salesInvoices: [],
        payments: [],
        receipts: [],
        journals: [],
        pdcDockets: demoPDCDockets,
        contra: demoContra,
        collectionVouchers: demoCollectionVouchers
      };
    }

    default:
      return state;
  }
}

export const ERPProvider = ({ children }) => {
  const savedData = loadFromLocalStorage();
  
  const [state, dispatch] = useReducer(erpReducer, {
    ...initialState,
    ...savedData
  });

  useEffect(() => {
    saveToLocalStorage('erp_receipts', state.receipts);
    saveToLocalStorage('erp_payments', state.payments);
    saveToLocalStorage('erp_journals', state.journals);
    saveToLocalStorage('erp_cheque_bounces', state.chequeBounces);
    saveToLocalStorage('erp_sales_invoices', state.salesInvoices);
    saveToLocalStorage('erp_pdc_dockets', state.pdcDockets);
    saveToLocalStorage('erp_contra', state.contra);
    saveToLocalStorage('erp_collection_vouchers', state.collectionVouchers);
  }, [state]);

  // Helper functions for common operations
  const value = {
    state,
    dispatch,
    // Receipt helpers
    addReceipt: (receipt) => dispatch({ type: "ADD_RECEIPT", payload: receipt }),
    updateReceipt: (receipt) => dispatch({ type: "UPDATE_RECEIPT", payload: receipt }),
    deleteReceipt: (id) => dispatch({ type: "DELETE_RECEIPT", payload: id }),
    // Payment helpers
    addPayment: (payment) => dispatch({ type: "ADD_PAYMENT", payload: payment }),
    updatePayment: (payment) => dispatch({ type: "UPDATE_PAYMENT", payload: payment }),
    deletePayment: (id) => dispatch({ type: "DELETE_PAYMENT", payload: id }),
    // Journal helpers
    addJournal: (journal) => dispatch({ type: "ADD_JOURNAL", payload: journal }),
    updateJournal: (journal) => dispatch({ type: "UPDATE_JOURNAL", payload: journal }),
    deleteJournal: (id) => dispatch({ type: "DELETE_JOURNAL", payload: id }),
    // Cheque Bounce helpers
    addChequeBounce: (chequeBounce) => dispatch({ type: "ADD_CHEQUE_BOUNCE", payload: chequeBounce }),
    updateChequeBounce: (chequeBounce) => dispatch({ type: "UPDATE_CHEQUE_BOUNCE", payload: chequeBounce }),
    deleteChequeBounce: (id) => dispatch({ type: "DELETE_CHEQUE_BOUNCE", payload: id }),
    // PDC Docket helpers
    addPDCDocket: (docket) => dispatch({ type: "ADD_PDC_DOCKET", payload: docket }),
    updatePDCDocket: (docket) => dispatch({ type: "UPDATE_PDC_DOCKET", payload: docket }),
    deletePDCDocket: (id) => dispatch({ type: "DELETE_PDC_DOCKET", payload: id }),
    // Contra helpers
    addContra: (contra) => dispatch({ type: "ADD_CONTRA", payload: contra }),
    updateContra: (contra) => dispatch({ type: "UPDATE_CONTRA", payload: contra }),
    deleteContra: (id) => dispatch({ type: "DELETE_CONTRA", payload: id }),
    // Collection Voucher helpers
    addCollectionVoucher: (voucher) => dispatch({ type: "ADD_COLLECTION_VOUCHER", payload: voucher }),
    updateCollectionVoucher: (voucher) => dispatch({ type: "UPDATE_COLLECTION_VOUCHER", payload: voucher }),
    deleteCollectionVoucher: (id) => dispatch({ type: "DELETE_COLLECTION_VOUCHER", payload: id }),
    // Sales Invoice helpers
    addSalesInvoice: (invoice) => dispatch({ type: "ADD_SALES_INVOICE", payload: invoice }),
    updateSalesInvoice: (invoice) => dispatch({ type: "UPDATE_SALES_INVOICE", payload: invoice }),
    deleteSalesInvoice: (id) => dispatch({ type: "DELETE_SALES_INVOICE", payload: id }),
    // Utility helpers
    clearAllData: () => dispatch({ type: "CLEAR_ALL_DATA" }),
    resetDemoData: () => dispatch({ type: "RESET_DEMO_DATA" })
  };

  return (
    <ERPContext.Provider value={value}>
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => useContext(ERPContext);
