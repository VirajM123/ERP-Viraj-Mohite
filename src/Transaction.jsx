import React, { useState, useMemo } from 'react';
import './Transaction.css';

const Transaction = ({ transactionType }) => {
  // Helper functions
  const todayISO = () => new Date().toISOString().split('T')[0];
  const toNum = (val) => parseFloat(val) || 0;

  // Sample accounts and banks (replace with your actual data from props)
  const sampleAccounts = [
    { id: 1, accountCode: 'JV_21', accountName: 'JV_21' },
    { id: 2, accountCode: 'CUST001', accountName: 'Customer A' },
    { id: 3, accountCode: 'CUST002', accountName: 'Customer B' },
  ];

  const sampleBanks = ['KOTAK', 'HDFC', 'SBI', 'ICICI', 'ABHUDAYA CO-OP BANK LTD'];

  // ========================= RECEIPT =========================
  const [receiptForm, setReceiptForm] = useState({
    receiptDate: todayISO(),
    rno: '148',
    billSeries: '',
    partyName: 'JV_21',
    bankCash: 'KOTAK',
    receiptAmt: '12454',
    chqNo: '564',
    draweeBank: 'ABHUDAYA CO-OP BANK LTD',
    add: 'SH.1 - PESH INDUSTRIAL PREMISES LANDEWADI',
    add2: 'NR. CENTURY ENKA COLONY TELCO RD',
    town: ''
  });

  const [receiptRows, setReceiptRows] = useState([
    { id: 1, sr: 1, trn: 'SAL', trnSeries: '2627', trnNo: '41', date: '03/04/2026', amount: '2180.00', adjustAmt: '0.00', balanceAmt: '2180.00', nowAdjust: '0.00', discount: '0.00', discAccount: '', remark: '' },
    { id: 2, sr: 2, trn: 'SAL', trnSeries: '2627', trnNo: '142', date: '17/04/2026', amount: '2598.00', adjustAmt: '0.00', balanceAmt: '2598.00', nowAdjust: '0.00', discount: '0.00', discAccount: '', remark: '' },
    { id: 3, sr: 3, trn: 'SAL', trnSeries: '2627', trnNo: '218', date: '27/04/2026', amount: '4275.00', adjustAmt: '0.00', balanceAmt: '4275.00', nowAdjust: '0.00', discount: '0.00', discAccount: '', remark: '' },
    { id: 4, sr: 4, trn: 'SAL', trnSeries: '2627', trnNo: '223', date: '27/04/2026', amount: '2700.00', adjustAmt: '0.00', balanceAmt: '2700.00', nowAdjust: '0.00', discount: '0.00', discAccount: '', remark: '' },
    { id: 5, sr: 5, trn: 'SAL', trnSeries: '2627', trnNo: '248', date: '04/05/2026', amount: '2422.00', adjustAmt: '0.00', balanceAmt: '2422.00', nowAdjust: '0.00', discount: '0.00', discAccount: '', remark: '' },
  ]);

  const receiptSummary = useMemo(() => {
    const totalAdjusted = receiptRows.reduce((sum, row) => sum + toNum(row.adjustAmt), 0);
    const totalNowAdjust = receiptRows.reduce((sum, row) => sum + toNum(row.nowAdjust), 0);
    const totalDisc = receiptRows.reduce((sum, row) => sum + toNum(row.discount), 0);
    const balanceAmt = toNum(receiptForm.receiptAmt) - totalNowAdjust;
    return { totalAdjusted, balanceAmt, totalDisc };
  }, [receiptRows, receiptForm.receiptAmt]);

  const updateReceiptRow = (index, field, value) => {
    const newRows = [...receiptRows];
    const row = newRows[index];
    row[field] = value;
    
    if (field === 'amount' || field === 'adjustAmt') {
      row.balanceAmt = (toNum(row.amount) - toNum(row.adjustAmt)).toFixed(2);
    }
    if (field === 'nowAdjust') {
      // When Now Adjust changes, update Adjust Amt
      row.adjustAmt = value;
      row.balanceAmt = (toNum(row.amount) - toNum(value)).toFixed(2);
    }
    setReceiptRows(newRows);
  };

  const addReceiptRow = () => {
    const newId = Date.now();
    setReceiptRows([...receiptRows, {
      id: newId,
      sr: receiptRows.length + 1,
      trn: 'SAL',
      trnSeries: '',
      trnNo: '',
      date: '',
      amount: '0.00',
      adjustAmt: '0.00',
      balanceAmt: '0.00',
      nowAdjust: '0.00',
      discount: '0.00',
      discAccount: '',
      remark: ''
    }]);
  };

  const deleteReceiptRow = (index) => {
    const newRows = receiptRows.filter((_, i) => i !== index);
    newRows.forEach((row, i) => row.sr = i + 1);
    setReceiptRows(newRows);
  };

  // ========================= EXPENSE =========================
  const [expenseForm, setExpenseForm] = useState({
    expenseDate: todayISO(),
    voucherNo: '',
    partyName: '',
    payeeName: '',
    paymentMode: 'Cash',
    bankCash: '',
    chequeNo: '',
    expenseType: '',
    narration: ''
  });

  const [expenseRows, setExpenseRows] = useState([
    { id: 1, sr: 1, accountHead: '', description: '', amount: '0.00', taxPercent: '0', gstAmt: '0.00', total: '0.00' }
  ]);

  const expenseSummary = useMemo(() => {
    let subtotal = 0, totalGST = 0;
    expenseRows.forEach(row => {
      subtotal += toNum(row.amount);
      totalGST += toNum(row.gstAmt);
    });
    return { subtotal, totalGST, grand: subtotal + totalGST };
  }, [expenseRows]);

  const updateExpenseRow = (index, field, value) => {
    const newRows = [...expenseRows];
    const row = newRows[index];
    row[field] = value;
    if (field === 'amount' || field === 'taxPercent') {
      const gstAmt = toNum(row.amount) * toNum(row.taxPercent) / 100;
      row.gstAmt = gstAmt.toFixed(2);
      row.total = (toNum(row.amount) + gstAmt).toFixed(2);
    }
    setExpenseRows(newRows);
  };

  const addExpenseRow = () => {
    setExpenseRows([...expenseRows, {
      id: Date.now(),
      sr: expenseRows.length + 1,
      accountHead: '',
      description: '',
      amount: '0.00',
      taxPercent: '0',
      gstAmt: '0.00',
      total: '0.00'
    }]);
  };

  const deleteExpenseRow = (index) => {
    const newRows = expenseRows.filter((_, i) => i !== index);
    newRows.forEach((row, i) => row.sr = i + 1);
    setExpenseRows(newRows);
  };

  // ========================= CHEQUE BOUNCE =========================
  const [bounceForm, setBounceForm] = useState({
    receiptDate: todayISO(),
    partyName: '',
    bankName: '',
    chequeNo: '',
    chequeDate: todayISO(),
    amount: '',
    bounceDate: todayISO(),
    reason: 'Insufficient funds',
    newChequeNo: '',
    status: 'Pending'
  });

  const [bounceRows, setBounceRows] = useState([
    { id: 1, sr: 1, billNo: '', billDate: '', originalAmount: '0.00', outstandingAmount: '0.00', bounceCharges: '0.00', adjustedAmount: '0.00', remark: '' }
  ]);

  const bounceSummary = useMemo(() => {
    const outstanding = bounceRows.reduce((s, r) => s + toNum(r.outstandingAmount), 0);
    const bounceCharges = bounceRows.reduce((s, r) => s + toNum(r.bounceCharges), 0);
    return { outstanding, bounceCharges, net: outstanding + bounceCharges };
  }, [bounceRows]);

  const updateBounceRow = (index, field, value) => {
    const newRows = [...bounceRows];
    newRows[index][field] = value;
    setBounceRows(newRows);
  };

  const addBounceRow = () => {
    setBounceRows([...bounceRows, {
      id: Date.now(),
      sr: bounceRows.length + 1,
      billNo: '',
      billDate: '',
      originalAmount: '0.00',
      outstandingAmount: '0.00',
      bounceCharges: '0.00',
      adjustedAmount: '0.00',
      remark: ''
    }]);
  };

  const deleteBounceRow = (index) => {
    const newRows = bounceRows.filter((_, i) => i !== index);
    newRows.forEach((row, i) => row.sr = i + 1);
    setBounceRows(newRows);
  };

  // ========================= PDC DOCKET =========================
  const [pdcForm, setPdcForm] = useState({
    pdcDate: todayISO(),
    partyName: '',
    bankName: '',
    chequeNo: '',
    chequeDate: todayISO(),
    amount: '',
    status: 'Pending',
    narration: ''
  });

  const [pdcRows, setPdcRows] = useState([
    { id: 1, sr: 1, invoiceNo: '', invoiceDate: '', dueDate: '', amount: '0.00', pdcAmount: '0.00', balance: '0.00', remark: '' }
  ]);

  const pdcSummary = useMemo(() => {
    const totalPdc = pdcRows.reduce((s, r) => s + toNum(r.pdcAmount), 0);
    const totalInvoiced = pdcRows.reduce((s, r) => s + toNum(r.amount), 0);
    return { totalPdc, totalInvoiced, netBalance: totalInvoiced - totalPdc };
  }, [pdcRows]);

  const updatePdcRow = (index, field, value) => {
    const newRows = [...pdcRows];
    newRows[index][field] = value;
    if (field === 'amount' || field === 'pdcAmount') {
      newRows[index].balance = (toNum(newRows[index].amount) - toNum(newRows[index].pdcAmount)).toFixed(2);
    }
    setPdcRows(newRows);
  };

  const addPdcRow = () => {
    setPdcRows([...pdcRows, {
      id: Date.now(),
      sr: pdcRows.length + 1,
      invoiceNo: '',
      invoiceDate: '',
      dueDate: '',
      amount: '0.00',
      pdcAmount: '0.00',
      balance: '0.00',
      remark: ''
    }]);
  };

  const deletePdcRow = (index) => {
    const newRows = pdcRows.filter((_, i) => i !== index);
    newRows.forEach((row, i) => row.sr = i + 1);
    setPdcRows(newRows);
  };

  // ========================= JOURNAL VOUCHER =========================
  const [jvForm, setJvForm] = useState({
    voucherDate: todayISO(),
    voucherNo: '',
    narration: '',
    voucherType: 'Payment'
  });

  const [jvRows, setJvRows] = useState([
    { id: 1, sr: 1, accountCode: '', accountName: '', debit: '0.00', credit: '0.00', narration: '' }
  ]);

  const jvSummary = useMemo(() => {
    const totalDebit = jvRows.reduce((s, r) => s + toNum(r.debit), 0);
    const totalCredit = jvRows.reduce((s, r) => s + toNum(r.credit), 0);
    return { totalDebit, totalCredit, difference: totalDebit - totalCredit };
  }, [jvRows]);

  const updateJvRow = (index, field, value) => {
    const newRows = [...jvRows];
    newRows[index][field] = value;
    setJvRows(newRows);
  };

  const addJvRow = () => {
    setJvRows([...jvRows, {
      id: Date.now(),
      sr: jvRows.length + 1,
      accountCode: '',
      accountName: '',
      debit: '0.00',
      credit: '0.00',
      narration: ''
    }]);
  };

  const deleteJvRow = (index) => {
    const newRows = jvRows.filter((_, i) => i !== index);
    newRows.forEach((row, i) => row.sr = i + 1);
    setJvRows(newRows);
  };

  // ========================= CONTRA =========================
  const [contraForm, setContraForm] = useState({
    contraDate: todayISO(),
    voucherNo: '',
    fromAccount: '',
    toAccount: '',
    amount: '',
    narration: ''
  });

  const [contraRows, setContraRows] = useState([
    { id: 1, sr: 1, description: '', fromAccount: '', toAccount: '', amount: '0.00', remark: '' }
  ]);

  const contraSummary = useMemo(() => {
    const totalAmount = contraRows.reduce((s, r) => s + toNum(r.amount), 0);
    return { totalAmount };
  }, [contraRows]);

  const updateContraRow = (index, field, value) => {
    const newRows = [...contraRows];
    newRows[index][field] = value;
    setContraRows(newRows);
  };

  const addContraRow = () => {
    setContraRows([...contraRows, {
      id: Date.now(),
      sr: contraRows.length + 1,
      description: '',
      fromAccount: '',
      toAccount: '',
      amount: '0.00',
      remark: ''
    }]);
  };

  const deleteContraRow = (index) => {
    const newRows = contraRows.filter((_, i) => i !== index);
    newRows.forEach((row, i) => row.sr = i + 1);
    setContraRows(newRows);
  };

  const handleSave = () => {
    const data = {
      type: transactionType,
      form: transactionType === 'Receipt' ? receiptForm :
            transactionType === 'Expense' ? expenseForm :
            transactionType === 'Cheque Bounce' ? bounceForm :
            transactionType === 'PDC Docket' ? pdcForm :
            transactionType === 'Journal Voucher' ? jvForm : contraForm,
      rows: transactionType === 'Receipt' ? receiptRows :
            transactionType === 'Expense' ? expenseRows :
            transactionType === 'Cheque Bounce' ? bounceRows :
            transactionType === 'PDC Docket' ? pdcRows :
            transactionType === 'Journal Voucher' ? jvRows : contraRows
    };
    console.log('Saving:', data);
    alert(`${transactionType} saved successfully!`);
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Unsaved changes will be lost.')) {
      // Reset logic can be added here
      alert('Cancelled');
    }
  };

  // ========================= RECEIPT RENDER =========================
  const renderReceipt = () => (
    <>
      <div className="form-section">
        <h4 className="section-header">Master Details</h4>
        <div className="form-grid-3">
          <div className="labeled-input"><label>Receipt Date *</label><input type="date" value={receiptForm.receiptDate} onChange={(e) => setReceiptForm({...receiptForm, receiptDate: e.target.value})} /></div>
          <div className="labeled-input"><label>RNO.</label><input value={receiptForm.rno} onChange={(e) => setReceiptForm({...receiptForm, rno: e.target.value})} /></div>
          <div className="labeled-input"><label>Bill Series</label><input value={receiptForm.billSeries} onChange={(e) => setReceiptForm({...receiptForm, billSeries: e.target.value})} /></div>
          <div className="labeled-input"><label>Party Name *</label><select value={receiptForm.partyName} onChange={(e) => setReceiptForm({...receiptForm, partyName: e.target.value})}><option value="">Select</option>{sampleAccounts.map(a => <option key={a.id} value={a.accountName}>{a.accountName}</option>)}</select></div>
          <div className="labeled-input"><label>Bank/Cash *</label><select value={receiptForm.bankCash} onChange={(e) => setReceiptForm({...receiptForm, bankCash: e.target.value})}><option value="">Select</option>{sampleBanks.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
          <div className="labeled-input"><label>Receipt Amt</label><input type="number" value={receiptForm.receiptAmt} onChange={(e) => setReceiptForm({...receiptForm, receiptAmt: e.target.value})} /></div>
          <div className="labeled-input"><label>Chq No.</label><input value={receiptForm.chqNo} onChange={(e) => setReceiptForm({...receiptForm, chqNo: e.target.value})} /></div>
          <div className="labeled-input"><label>Drawee Bank</label><input value={receiptForm.draweeBank} onChange={(e) => setReceiptForm({...receiptForm, draweeBank: e.target.value})} /></div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-header">Adjustment Entries <button className="btn-secondary ml-auto" onClick={addReceiptRow}>+ Add Row</button></h4>
        <div className="product-entry-container" style={{ overflowX: 'auto', maxHeight: '400px' }}>
          <div className="erp-table-container" style={{ minWidth: '1400px' }}>
            <table className="product-entry-table">
              <thead><tr><th>SrNo</th><th>Trn</th><th>TrnSeries</th><th>TrnNo</th><th>Date</th><th>Amount</th><th>Adjust Amt</th><th>Balance Amt</th><th>Now Adjust</th><th>Discount</th><th>Disc Account</th><th>Remark</th><th>Action</th></tr></thead>
              <tbody>
                {receiptRows.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{row.sr}</td>
                    <td><input className="erp-input" value={row.trn} onChange={(e) => updateReceiptRow(idx, 'trn', e.target.value)} style={{width:'80px'}} /></td>
                    <td><input className="erp-input" value={row.trnSeries} onChange={(e) => updateReceiptRow(idx, 'trnSeries', e.target.value)} style={{width:'100px'}} /></td>
                    <td><input className="erp-input" value={row.trnNo} onChange={(e) => updateReceiptRow(idx, 'trnNo', e.target.value)} style={{width:'80px'}} /></td>
                    <td><input className="erp-input" type="date" value={row.date} onChange={(e) => updateReceiptRow(idx, 'date', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.amount} onChange={(e) => updateReceiptRow(idx, 'amount', e.target.value)} style={{width:'100px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.adjustAmt} onChange={(e) => updateReceiptRow(idx, 'adjustAmt', e.target.value)} style={{width:'100px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.balanceAmt} readOnly style={{width:'100px', background:'#f8fafc'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.nowAdjust} onChange={(e) => updateReceiptRow(idx, 'nowAdjust', e.target.value)} style={{width:'100px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.discount} onChange={(e) => updateReceiptRow(idx, 'discount', e.target.value)} style={{width:'100px'}} /></td>
                    <td><input className="erp-input" value={row.discAccount} onChange={(e) => updateReceiptRow(idx, 'discAccount', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input" value={row.remark} onChange={(e) => updateReceiptRow(idx, 'remark', e.target.value)} style={{width:'120px'}} /></td>
                    <td><button className="btn-delete" onClick={() => deleteReceiptRow(idx)}>🗑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-grid-2">
          <div className="labeled-input"><label>Add</label><textarea rows="2" value={receiptForm.add} onChange={(e) => setReceiptForm({...receiptForm, add: e.target.value})} /></div>
          <div className="labeled-input"><label>Bal</label><input readOnly value={receiptSummary.balanceAmt.toFixed(2)} style={{background:'#f8fafc'}} /></div>
          <div className="labeled-input"><label>Add2</label><input value={receiptForm.add2} onChange={(e) => setReceiptForm({...receiptForm, add2: e.target.value})} /></div>
          <div className="labeled-input"><label>TOWN</label><input value={receiptForm.town} onChange={(e) => setReceiptForm({...receiptForm, town: e.target.value})} /></div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-header">Summary</h4>
        <div className="summary-bar">
          <div>Total Adjusted Amt: <span className="amount">₹{receiptSummary.totalAdjusted.toFixed(2)}</span></div>
          <div>Balance Amt: <span className="amount">₹{receiptSummary.balanceAmt.toFixed(2)}</span></div>
          <div>Total Disc Amt: <span className="amount">₹{receiptSummary.totalDisc.toFixed(2)}</span></div>
        </div>
      </div>
    </>
  );

  // ========================= EXPENSE RENDER =========================
  const renderExpense = () => (
    <>
      <div className="form-section">
        <h4 className="section-header">Expense Details</h4>
        <div className="form-grid-3">
          <div className="labeled-input"><label>Expense Date *</label><input type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm({...expenseForm, expenseDate: e.target.value})} /></div>
          <div className="labeled-input"><label>Voucher No</label><input value={expenseForm.voucherNo} onChange={(e) => setExpenseForm({...expenseForm, voucherNo: e.target.value})} /></div>
          <div className="labeled-input"><label>Party Name</label><select value={expenseForm.partyName} onChange={(e) => setExpenseForm({...expenseForm, partyName: e.target.value})}><option value="">Select</option>{sampleAccounts.map(a => <option key={a.id} value={a.accountName}>{a.accountName}</option>)}</select></div>
          <div className="labeled-input"><label>Payee Name</label><input value={expenseForm.payeeName} onChange={(e) => setExpenseForm({...expenseForm, payeeName: e.target.value})} /></div>
          <div className="labeled-input"><label>Payment Mode</label><select value={expenseForm.paymentMode} onChange={(e) => setExpenseForm({...expenseForm, paymentMode: e.target.value})}><option>Cash</option><option>Bank</option><option>Cheque</option></select></div>
          <div className="labeled-input"><label>Bank/Cash</label><select value={expenseForm.bankCash} onChange={(e) => setExpenseForm({...expenseForm, bankCash: e.target.value})}><option value="">Select</option>{sampleBanks.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
          <div className="labeled-input"><label>Cheque No</label><input value={expenseForm.chequeNo} onChange={(e) => setExpenseForm({...expenseForm, chequeNo: e.target.value})} /></div>
          <div className="labeled-input"><label>Expense Type</label><input value={expenseForm.expenseType} onChange={(e) => setExpenseForm({...expenseForm, expenseType: e.target.value})} /></div>
          <div className="labeled-input narration-field"><label>Narration</label><textarea rows="2" value={expenseForm.narration} onChange={(e) => setExpenseForm({...expenseForm, narration: e.target.value})} /></div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-header">Expense Entries <button className="btn-secondary ml-auto" onClick={addExpenseRow}>+ Add Row</button></h4>
        <div className="product-entry-container" style={{ overflowX: 'auto', maxHeight: '400px' }}>
          <div className="erp-table-container" style={{ minWidth: '800px' }}>
            <table className="product-entry-table">
              <thead><tr><th>SrNo</th><th>Account Head</th><th>Description</th><th>Amount (₹)</th><th>Tax %</th><th>GST Amt (₹)</th><th>Total (₹)</th><th>Action</th></tr></thead>
              <tbody>
                {expenseRows.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{row.sr}</td>
                    <td><input className="erp-input" value={row.accountHead} onChange={(e) => updateExpenseRow(idx, 'accountHead', e.target.value)} style={{width:'150px'}} /></td>
                    <td><input className="erp-input" value={row.description} onChange={(e) => updateExpenseRow(idx, 'description', e.target.value)} style={{width:'200px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.amount} onChange={(e) => updateExpenseRow(idx, 'amount', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.taxPercent} onChange={(e) => updateExpenseRow(idx, 'taxPercent', e.target.value)} style={{width:'80px'}} /></td>
                    <td><input className="erp-input numeric" value={row.gstAmt} readOnly style={{width:'120px', background:'#f8fafc'}} /></td>
                    <td><input className="erp-input numeric" value={row.total} readOnly style={{width:'120px', background:'#f8fafc', fontWeight:'bold'}} /></td>
                    <td><button className="btn-delete" onClick={() => deleteExpenseRow(idx)}>🗑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-header">Summary</h4>
        <div className="summary-bar">
          <div>Subtotal: <span className="amount">₹{expenseSummary.subtotal.toFixed(2)}</span></div>
          <div>Total GST: <span className="amount">₹{expenseSummary.totalGST.toFixed(2)}</span></div>
          <div className="net-amount">Grand Total: <strong>₹{expenseSummary.grand.toFixed(2)}</strong></div>
        </div>
      </div>
    </>
  );

  // ========================= CHEQUE BOUNCE RENDER =========================
  const renderChequeBounce = () => (
    <>
      <div className="form-section">
        <h4 className="section-header">Cheque Bounce Details</h4>
        <div className="form-grid-3">
          <div className="labeled-input"><label>Receipt Date</label><input type="date" value={bounceForm.receiptDate} onChange={(e) => setBounceForm({...bounceForm, receiptDate: e.target.value})} /></div>
          <div className="labeled-input"><label>Party Name</label><select value={bounceForm.partyName} onChange={(e) => setBounceForm({...bounceForm, partyName: e.target.value})}><option value="">Select</option>{sampleAccounts.map(a => <option key={a.id} value={a.accountName}>{a.accountName}</option>)}</select></div>
          <div className="labeled-input"><label>Bank Name</label><input value={bounceForm.bankName} onChange={(e) => setBounceForm({...bounceForm, bankName: e.target.value})} /></div>
          <div className="labeled-input"><label>Cheque No</label><input value={bounceForm.chequeNo} onChange={(e) => setBounceForm({...bounceForm, chequeNo: e.target.value})} /></div>
          <div className="labeled-input"><label>Cheque Date</label><input type="date" value={bounceForm.chequeDate} onChange={(e) => setBounceForm({...bounceForm, chequeDate: e.target.value})} /></div>
          <div className="labeled-input"><label>Amount</label><input type="number" value={bounceForm.amount} onChange={(e) => setBounceForm({...bounceForm, amount: e.target.value})} /></div>
          <div className="labeled-input"><label>Bounce Date</label><input type="date" value={bounceForm.bounceDate} onChange={(e) => setBounceForm({...bounceForm, bounceDate: e.target.value})} /></div>
          <div className="labeled-input"><label>Reason for Bounce</label><select value={bounceForm.reason} onChange={(e) => setBounceForm({...bounceForm, reason: e.target.value})}><option>Insufficient funds</option><option>Signature mismatch</option><option>Other</option></select></div>
          <div className="labeled-input"><label>New Cheque No</label><input value={bounceForm.newChequeNo} onChange={(e) => setBounceForm({...bounceForm, newChequeNo: e.target.value})} /></div>
          <div className="labeled-input"><label>Status</label><select value={bounceForm.status} onChange={(e) => setBounceForm({...bounceForm, status: e.target.value})}><option>Pending</option><option>Resolved</option></select></div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-header">Invoice Details <button className="btn-secondary ml-auto" onClick={addBounceRow}>+ Add Row</button></h4>
        <div className="product-entry-container" style={{ overflowX: 'auto', maxHeight: '400px' }}>
          <div className="erp-table-container" style={{ minWidth: '1000px' }}>
            <table className="product-entry-table">
              <thead><tr><th>SrNo</th><th>Bill No</th><th>Bill Date</th><th>Original Amount</th><th>Outstanding Amount</th><th>Bounce Charges</th><th>Adjusted Amount</th><th>Remark</th><th>Action</th></tr></thead>
              <tbody>
                {bounceRows.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{row.sr}</td>
                    <td><input className="erp-input" value={row.billNo} onChange={(e) => updateBounceRow(idx, 'billNo', e.target.value)} style={{width:'100px'}} /></td>
                    <td><input className="erp-input" type="date" value={row.billDate} onChange={(e) => updateBounceRow(idx, 'billDate', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.originalAmount} onChange={(e) => updateBounceRow(idx, 'originalAmount', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.outstandingAmount} onChange={(e) => updateBounceRow(idx, 'outstandingAmount', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.bounceCharges} onChange={(e) => updateBounceRow(idx, 'bounceCharges', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.adjustedAmount} onChange={(e) => updateBounceRow(idx, 'adjustedAmount', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input" value={row.remark} onChange={(e) => updateBounceRow(idx, 'remark', e.target.value)} style={{width:'150px'}} /></td>
                    <td><button className="btn-delete" onClick={() => deleteBounceRow(idx)}>🗑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-header">Summary</h4>
        <div className="summary-bar">
          <div>Total Outstanding: <span className="amount">₹{bounceSummary.outstanding.toFixed(2)}</span></div>
          <div>Total Bounce Charges: <span className="amount">₹{bounceSummary.bounceCharges.toFixed(2)}</span></div>
          <div className="net-amount">Net Amount to Recover: <strong>₹{bounceSummary.net.toFixed(2)}</strong></div>
        </div>
      </div>
    </>
  );

  // ========================= PDC DOCKET RENDER =========================
  const renderPdcDocket = () => (
    <>
      <div className="form-section">
        <h4 className="section-header">PDC Details</h4>
        <div className="form-grid-3">
          <div className="labeled-input"><label>PDC Date</label><input type="date" value={pdcForm.pdcDate} onChange={(e) => setPdcForm({...pdcForm, pdcDate: e.target.value})} /></div>
          <div className="labeled-input"><label>Party Name</label><select value={pdcForm.partyName} onChange={(e) => setPdcForm({...pdcForm, partyName: e.target.value})}><option value="">Select</option>{sampleAccounts.map(a => <option key={a.id} value={a.accountName}>{a.accountName}</option>)}</select></div>
          <div className="labeled-input"><label>Bank Name</label><input value={pdcForm.bankName} onChange={(e) => setPdcForm({...pdcForm, bankName: e.target.value})} /></div>
          <div className="labeled-input"><label>Cheque No</label><input value={pdcForm.chequeNo} onChange={(e) => setPdcForm({...pdcForm, chequeNo: e.target.value})} /></div>
          <div className="labeled-input"><label>Cheque Date</label><input type="date" value={pdcForm.chequeDate} onChange={(e) => setPdcForm({...pdcForm, chequeDate: e.target.value})} /></div>
          <div className="labeled-input"><label>Amount</label><input type="number" value={pdcForm.amount} onChange={(e) => setPdcForm({...pdcForm, amount: e.target.value})} /></div>
          <div className="labeled-input"><label>Status</label><select value={pdcForm.status} onChange={(e) => setPdcForm({...pdcForm, status: e.target.value})}><option>Pending</option><option>Cleared</option><option>Bounced</option></select></div>
          <div className="labeled-input narration-field"><label>Narration</label><textarea rows="2" value={pdcForm.narration} onChange={(e) => setPdcForm({...pdcForm, narration: e.target.value})} /></div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-header">Invoice Mapping <button className="btn-secondary ml-auto" onClick={addPdcRow}>+ Add Row</button></h4>
        <div className="product-entry-container" style={{ overflowX: 'auto', maxHeight: '400px' }}>
          <div className="erp-table-container" style={{ minWidth: '1000px' }}>
            <table className="product-entry-table">
              <thead><tr><th>SrNo</th><th>Invoice No</th><th>Invoice Date</th><th>Due Date</th><th>Amount (₹)</th><th>PDC Amount (₹)</th><th>Balance (₹)</th><th>Remark</th><th>Action</th></tr></thead>
              <tbody>
                {pdcRows.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{row.sr}</td>
                    <td><input className="erp-input" value={row.invoiceNo} onChange={(e) => updatePdcRow(idx, 'invoiceNo', e.target.value)} style={{width:'100px'}} /></td>
                    <td><input className="erp-input" type="date" value={row.invoiceDate} onChange={(e) => updatePdcRow(idx, 'invoiceDate', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input" type="date" value={row.dueDate} onChange={(e) => updatePdcRow(idx, 'dueDate', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.amount} onChange={(e) => updatePdcRow(idx, 'amount', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.pdcAmount} onChange={(e) => updatePdcRow(idx, 'pdcAmount', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input numeric" value={row.balance} readOnly style={{width:'120px', background:'#f8fafc'}} /></td>
                    <td><input className="erp-input" value={row.remark} onChange={(e) => updatePdcRow(idx, 'remark', e.target.value)} style={{width:'150px'}} /></td>
                    <td><button className="btn-delete" onClick={() => deletePdcRow(idx)}>🗑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-header">Summary</h4>
        <div className="summary-bar">
          <div>Total PDC Amount: <span className="amount">₹{pdcSummary.totalPdc.toFixed(2)}</span></div>
          <div>Total Invoiced Amount: <span className="amount">₹{pdcSummary.totalInvoiced.toFixed(2)}</span></div>
          <div className="net-amount">Net Balance: <strong>₹{pdcSummary.netBalance.toFixed(2)}</strong></div>
        </div>
      </div>
    </>
  );

  // ========================= JOURNAL VOUCHER RENDER =========================
  const renderJournalVoucher = () => (
    <>
      <div className="form-section">
        <h4 className="section-header">Voucher Details</h4>
        <div className="form-grid-3">
          <div className="labeled-input"><label>Voucher Date</label><input type="date" value={jvForm.voucherDate} onChange={(e) => setJvForm({...jvForm, voucherDate: e.target.value})} /></div>
          <div className="labeled-input"><label>Voucher No</label><input value={jvForm.voucherNo} onChange={(e) => setJvForm({...jvForm, voucherNo: e.target.value})} /></div>
          <div className="labeled-input"><label>Voucher Type</label><select value={jvForm.voucherType} onChange={(e) => setJvForm({...jvForm, voucherType: e.target.value})}><option>Payment</option><option>Receipt</option><option>Contra</option><option>Adjustment</option></select></div>
          <div className="labeled-input narration-field"><label>Narration</label><textarea rows="2" value={jvForm.narration} onChange={(e) => setJvForm({...jvForm, narration: e.target.value})} /></div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-header">Journal Entries <button className="btn-secondary ml-auto" onClick={addJvRow}>+ Add Row</button></h4>
        <div className="product-entry-container" style={{ overflowX: 'auto', maxHeight: '400px' }}>
          <div className="erp-table-container" style={{ minWidth: '900px' }}>
            <table className="product-entry-table">
              <thead><tr><th>SrNo</th><th>Account Code</th><th>Account Name</th><th>Debit (₹)</th><th>Credit (₹)</th><th>Narration</th><th>Action</th></tr></thead>
              <tbody>
                {jvRows.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{row.sr}</td>
                    <td><input className="erp-input" value={row.accountCode} onChange={(e) => updateJvRow(idx, 'accountCode', e.target.value)} style={{width:'100px'}} /></td>
                    <td><input className="erp-input" value={row.accountName} onChange={(e) => updateJvRow(idx, 'accountName', e.target.value)} style={{width:'150px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.debit} onChange={(e) => updateJvRow(idx, 'debit', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.credit} onChange={(e) => updateJvRow(idx, 'credit', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input" value={row.narration} onChange={(e) => updateJvRow(idx, 'narration', e.target.value)} style={{width:'200px'}} /></td>
                    <td><button className="btn-delete" onClick={() => deleteJvRow(idx)}>🗑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-header">Summary</h4>
        <div className="summary-bar">
          <div>Total Debit: <span className="amount">₹{jvSummary.totalDebit.toFixed(2)}</span></div>
          <div>Total Credit: <span className="amount">₹{jvSummary.totalCredit.toFixed(2)}</span></div>
          <div className={jvSummary.difference === 0 ? "net-amount" : ""} style={{color: jvSummary.difference !== 0 ? '#dc2626' : ''}}>
            Difference: <strong>₹{Math.abs(jvSummary.difference).toFixed(2)}</strong> {jvSummary.difference !== 0 ? '(⚠️ Must be zero)' : '(✓ Balanced)'}
          </div>
        </div>
      </div>
    </>
  );

  // ========================= CONTRA RENDER =========================
  const renderContra = () => (
    <>
      <div className="form-section">
        <h4 className="section-header">Contra Details</h4>
        <div className="form-grid-3">
          <div className="labeled-input"><label>Contra Date</label><input type="date" value={contraForm.contraDate} onChange={(e) => setContraForm({...contraForm, contraDate: e.target.value})} /></div>
          <div className="labeled-input"><label>Voucher No</label><input value={contraForm.voucherNo} onChange={(e) => setContraForm({...contraForm, voucherNo: e.target.value})} /></div>
          <div className="labeled-input"><label>From Account</label><select value={contraForm.fromAccount} onChange={(e) => setContraForm({...contraForm, fromAccount: e.target.value})}><option value="">Select</option>{sampleBanks.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
          <div className="labeled-input"><label>To Account</label><select value={contraForm.toAccount} onChange={(e) => setContraForm({...contraForm, toAccount: e.target.value})}><option value="">Select</option>{sampleBanks.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
          <div className="labeled-input"><label>Amount</label><input type="number" value={contraForm.amount} onChange={(e) => setContraForm({...contraForm, amount: e.target.value})} /></div>
          <div className="labeled-input narration-field"><label>Narration</label><textarea rows="2" value={contraForm.narration} onChange={(e) => setContraForm({...contraForm, narration: e.target.value})} /></div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-header">Transfer Details <button className="btn-secondary ml-auto" onClick={addContraRow}>+ Add Row</button></h4>
        <div className="product-entry-container" style={{ overflowX: 'auto', maxHeight: '400px' }}>
          <div className="erp-table-container" style={{ minWidth: '800px' }}>
            <table className="product-entry-table">
              <thead><tr><th>SrNo</th><th>Description</th><th>From Account</th><th>To Account</th><th>Amount (₹)</th><th>Remark</th><th>Action</th></tr></thead>
              <tbody>
                {contraRows.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{row.sr}</td>
                    <td><input className="erp-input" value={row.description} onChange={(e) => updateContraRow(idx, 'description', e.target.value)} style={{width:'200px'}} /></td>
                    <td><input className="erp-input" value={row.fromAccount} onChange={(e) => updateContraRow(idx, 'fromAccount', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input" value={row.toAccount} onChange={(e) => updateContraRow(idx, 'toAccount', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input numeric" type="number" value={row.amount} onChange={(e) => updateContraRow(idx, 'amount', e.target.value)} style={{width:'120px'}} /></td>
                    <td><input className="erp-input" value={row.remark} onChange={(e) => updateContraRow(idx, 'remark', e.target.value)} style={{width:'150px'}} /></td>
                    <td><button className="btn-delete" onClick={() => deleteContraRow(idx)}>🗑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="section-header">Summary</h4>
        <div className="summary-bar">
          <div className="net-amount">Total Transfer Amount: <strong>₹{contraSummary.totalAmount.toFixed(2)}</strong></div>
        </div>
      </div>
    </>
  );

  // Main render switch
  const renderForm = () => {
    switch(transactionType) {
      case 'Receipt': return renderReceipt();
      case 'Expense': return renderExpense();
      case 'Cheque Bounce': return renderChequeBounce();
      case 'PDC Docket': return renderPdcDocket();
      case 'Journal Voucher': return renderJournalVoucher();
      case 'Contra': return renderContra();
      default: return <div className="empty-state">Select a transaction type</div>;
    }
  };

  return (
    <div className="master-section erp-master-form transaction-container">
      <div className="form-header">
        <div className="page-title-large">{transactionType}</div>
      </div>
      
      {renderForm()}
      
      <div className="form-actions">
        <button className="btn-primary" onClick={handleSave}>💾 Save</button>
        <button className="btn-secondary" onClick={handleCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default Transaction;