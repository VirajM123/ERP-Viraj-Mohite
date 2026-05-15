import React, { useState, useCallback } from "react";
import "./Transaction.css";


const Transaction = () => {

  const [activeTransaction, setActiveTransaction] = useState(null);
  const [showReceiptForm, setShowReceiptForm] = useState(false);

  // Receipt Header State
 const [receiptFormData, setReceiptFormData] = useState({
  receiptDate: new Date().toISOString().split("T")[0],
  rno: "",
  billSeries: "",
  billNo: "",
  salesman: "",
  partyName: "",
  bankCash: "",
  receiptAmount: "",
  chequeNo: "",
  chequeDate: "",
  drawerBank: "",
  micr: "",
  narration: "",
  loadNo: "",
  rloadNo: "",
  pdcType: "LOCAL BANK"
});
  // Receipt Table State
  const [receiptItems, setReceiptItems] = useState([]);

  // Summary State
  const [receiptSummary, setReceiptSummary] = useState({
    totalAdjusted: 0,
    balanceAmount: 0,
    totalDiscount: 0
  });
  const pendingBills = [
  {
    billNo: "SAL-101",
    amount: 5000,
    adjusted: 2000,
    balance: 3000
  },
  {
    billNo: "SAL-102",
    amount: 7000,
    adjusted: 1000,
    balance: 6000
  },
  {
    billNo: "SAL-103",
    amount: 4000,
    adjusted: 500,
    balance: 3500
  }
];

  // Add Row
  const addReceiptItem = useCallback(() => {
    const newItem = {
      id: Date.now(),
      srNo: receiptItems.length + 1,
      trn: "",
      trnSeries: "",
      trnNo: "",
      trnDate: "",
      amount: "",
      adjustAmt: "",
      balanceAmt: "",
      nowAdjust: "",
      discount: "",
      discAccount: "",
      remark: ""
    };

    setReceiptItems([...receiptItems, newItem]);
  }, [receiptItems]);

  // Update Row
const updateReceiptItem = (index, field, value) => {

  const newItems = [...receiptItems];

  newItems[index][field] = value;

  // Recalculate row balance
  const amount =
    parseFloat(newItems[index].amount) || 0;

  const adjusted =
    parseFloat(newItems[index].adjustAmt) || 0;

  const nowAdjust =
    parseFloat(newItems[index].nowAdjust) || 0;

  const discount =
    parseFloat(newItems[index].discount) || 0;

  const balance =
    amount - adjusted - nowAdjust - discount;

  newItems[index].balanceAmt =
    balance.toFixed(2);

  setReceiptItems(newItems);

  calcReceiptSummary(newItems);
};

  // Summary Calculation
 const calcReceiptSummary = (items) => {

  let totalAdjusted = 0;
  let totalDiscount = 0;
  let totalBalance = 0;

  items.forEach((item) => {

    const amount =
      parseFloat(item.amount) || 0;

    const adjusted =
      parseFloat(item.adjustAmt) || 0;

    const nowAdjust =
      parseFloat(item.nowAdjust) || 0;

    const discount =
      parseFloat(item.discount) || 0;

    const currentBalance =
      amount - adjusted - nowAdjust - discount;

    item.balanceAmt =
      currentBalance.toFixed(2);

    totalAdjusted += nowAdjust;

    totalDiscount += discount;

    totalBalance += currentBalance;
  });

  setReceiptSummary({
    totalAdjusted,
    totalDiscount,
    balanceAmount: totalBalance
  });
};
  // Header Change
 const handleReceiptInput = (e) => {

  const { name, value } = e.target;

  let updatedData = {
    ...receiptFormData,
    [name]: value
  };

  // If Cash selected reset cheque fields
  if (name === "bankCash" && value === "Cash") {

    updatedData.chequeNo = "";
    updatedData.chequeDate = "";
    updatedData.drawerBank = "";
    updatedData.micr = "";
  }

  setReceiptFormData(updatedData);
};

  const handlePartyChange = (e) => {

  const value = e.target.value;

  setReceiptFormData({
    ...receiptFormData,
    partyName: value
  });

  const billRows = pendingBills.map((bill, index) => ({
    id: Date.now() + index,
    srNo: index + 1,
    trn: "SAL",
    trnSeries: "2627",
    billNo: bill.billNo,
    trnNo: index + 1,
    trnDate: "2026-05-15",
    amount: bill.amount,
    adjustAmt: bill.adjusted,
    balanceAmt: bill.balance,
    nowAdjust: 0,
    discount: 0,
    discAccount: "",
    remark: ""
  }));

  setReceiptItems(billRows);
};

const handleBillSelection = (index, selectedBillNo) => {

  const selectedBill = pendingBills.find(
    (bill) => bill.billNo === selectedBillNo
  );

  if (!selectedBill) return;

  const newItems = [...receiptItems];

  newItems[index] = {
    ...newItems[index],

    trn: "SAL",
    trnSeries: "2627",

    billNo: selectedBill.billNo,

    trnNo: Math.floor(Math.random() * 500),

    trnDate: "2026-05-15",

    amount: selectedBill.amount,

    adjustAmt: selectedBill.adjusted,

    balanceAmt: selectedBill.balance,

    nowAdjust: selectedBill.balance,

    discount: 0
  };

  calcReceiptSummary(newItems);
  if (index === receiptItems.length - 1) {

  newItems.push({
    id: Date.now(),
    srNo: newItems.length + 1,
    trn: "",
    trnSeries: "",
    billNo: "",
    trnNo: "",
    trnDate: "",
    amount: "",
    adjustAmt: "",
    balanceAmt: "",
    nowAdjust: "",
    discount: "",
    discAccount: "",
    remark: ""
  });
}

  setReceiptItems(newItems);
};

  // Save
  const saveReceipt = () => {

    const payload = {
      header: receiptFormData,
      items: receiptItems,
      summary: receiptSummary
    };

    console.log(payload);

    alert("Receipt Saved Successfully");
  };

  return (

    <div className="transaction-page">

      {/* LIST SCREEN */}

      {!showReceiptForm && (
        <div className="master-section">

          <div className="grid-header">

            <h3>Receipt Management</h3>

            <div className="table-controls">

              <button
                className="btn-add-new"
                onClick={() => {
                  setShowReceiptForm(true);

                  if (receiptItems.length === 0) {
                    addReceiptItem();
                  }
                }}
              >
                + Add Receipt
              </button>
            </div>
          </div>

          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <h4>No Receipts Added</h4>
            <p>Create your first receipt voucher</p>
          </div>

        </div>
      )}

      {/* FORM SCREEN */}

      {showReceiptForm && (

        <div className="master-section receipt-section">

          {/* HEADER */}

          <div className="erp-header">

            <div>
              <h2 className="erp-title">
                Receipt Entry
              </h2>

              <p className="erp-subtitle">
                Manage receipt vouchers
              </p>
            </div>

            <button
              className="close-form-btn"
              onClick={() => setShowReceiptForm(false)}
            >
              ×
            </button>

          </div>

          {/* HEADER FORM */}

          <div className="receipt-header-grid">

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
                onChange={handleReceiptInput}
              />
            </div>

            <div className="labeled-input">
              <label>Bill No</label>

              <input
                type="text"
                name="billNo"
                value={receiptFormData.billNo}
                onChange={handleReceiptInput}
              />
            </div>

            <div className="labeled-input">
              <label>Salesman</label>

              <input
                type="text"
                name="salesman"
                value={receiptFormData.salesman}
                onChange={handleReceiptInput}
              />
            </div>

            <div className="labeled-input">
  <label>Party Name</label>

  <select
    name="partyName"
    value={receiptFormData.partyName}
    onChange={handlePartyChange}
  >
    <option value="">Select Party</option>
    <option value="JV-21">JV-21</option>
    <option value="ABC MEDICAL">ABC MEDICAL</option>
    <option value="PQR PHARMA">PQR PHARMA</option>
  </select>
</div>

           <div className="labeled-input">
  <label>Bank/Cash</label>

  <select
    name="bankCash"
    value={receiptFormData.bankCash}
    onChange={handleReceiptInput}
  >
    <option value="">Select Bank/Cash</option>
    <option value="Cash">Cash</option>
    <option value="HDFC BANK">HDFC BANK</option>
    <option value="ICICI BANK">ICICI BANK</option>
    <option value="SBI BANK">SBI BANK</option>
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
  readOnly={receiptFormData.bankCash === "Cash"}
/>
</div>

<div className="labeled-input">
  <label>Cheque Date</label>

  <input
  type="date"
  name="chequeDate"
  value={receiptFormData.chequeDate}
  onChange={handleReceiptInput}
  readOnly={receiptFormData.bankCash === "Cash"}
/>
</div>

<div className="labeled-input">
  <label>Drawer Bank</label>

  <input
  type="text"
  name="drawerBank"
  value={receiptFormData.drawerBank}
  onChange={handleReceiptInput}
  readOnly={receiptFormData.bankCash === "Cash"}
/>
</div>

<div className="labeled-input">
  <label>MICR</label>

  <input
  type="text"
  name="micr"
  value={receiptFormData.micr}
  onChange={handleReceiptInput}
  readOnly={receiptFormData.bankCash === "Cash"}
/>
</div>

<div className="labeled-input">
  <label>Narration</label>

  <input
    type="text"
    name="narration"
    value={receiptFormData.narration}
    onChange={handleReceiptInput}
  />
</div>

          </div>

          {/* TABLE */}

          <div className="product-entry-container">

            <div className="erp-table-container">

              <table className="product-entry-table">

                <thead>
                  <tr>
                    <th>SrNo</th>
                    <th>Trn</th>
                    <th>Series</th>
                    <th>Select Bill</th>
<th>Bill No</th>
                    <th>Trn No</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Adjust Amt</th>
                    <th>Balance</th>
                    <th>Now Adjust</th>
                    <th>Discount</th>
                    <th>Disc Account</th>
                    <th>Remark</th>
                  </tr>
                </thead>

                <tbody>

                  {receiptItems.map((item, index) => (

                    <tr key={item.id}>

                      <td>{item.srNo}</td>

                      <td>
                        <input
                          value={item.trn}
                          onChange={(e) =>
                            updateReceiptItem(
                              index,
                              "trn",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          value={item.trnSeries}
                          onChange={(e) =>
                            updateReceiptItem(
                              index,
                              "trnSeries",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td>
  <select
    value={item.billNo}
    onChange={(e) =>
      handleBillSelection(index, e.target.value)
    }
  >
    <option value="">Select Bill</option>

    {pendingBills.map((bill) => (
      <option
        key={bill.billNo}
        value={bill.billNo}
      >
        {bill.billNo}
      </option>
    ))}
  </select>
</td>

                      <td>
  <input
    value={item.billNo}
    readOnly
  />
</td>

                      <td>
                        <input
                          value={item.trnNo}
                          onChange={(e) =>
                            updateReceiptItem(
                              index,
                              "trnNo",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="date"
                          value={item.trnDate}
                          onChange={(e) =>
                            updateReceiptItem(
                              index,
                              "trnDate",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) =>
                            updateReceiptItem(
                              index,
                              "amount",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          value={item.adjustAmt}
                          onChange={(e) =>
                            updateReceiptItem(
                              index,
                              "adjustAmt",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          value={item.balanceAmt}
                          readOnly
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          value={item.nowAdjust}
                          onChange={(e) =>
                            updateReceiptItem(
                              index,
                              "nowAdjust",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(e) =>
                            updateReceiptItem(
                              index,
                              "discount",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          value={item.discAccount}
                          onChange={(e) =>
                            updateReceiptItem(
                              index,
                              "discAccount",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          value={item.remark}
                          onChange={(e) =>
                            updateReceiptItem(
                              index,
                              "remark",
                              e.target.value
                            )
                          }
                        />
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>

          </div>

          {/* SUMMARY */}

          <div className="receipt-summary-grid">

            <div className="summary-card">
              <label>Total Adjusted</label>
              <h3>
                {receiptSummary.totalAdjusted.toFixed(2)}
              </h3>
            </div>

            <div className="summary-card">
              <label>Balance Amount</label>
              <h3>
                {receiptSummary.balanceAmount.toFixed(2)}
              </h3>
            </div>

            <div className="summary-card">
              <label>Total Discount</label>
              <h3>
                {receiptSummary.totalDiscount.toFixed(2)}
              </h3>
            </div>

          </div>

          

          {/* ACTIONS */}

          <div className="form-actions">

            <button
              className="btn-save"
              onClick={saveReceipt}
            >
              Save
            </button>

            <button
              className="btn-cancel"
              onClick={() => setShowReceiptForm(false)}
            >
              Cancel
            </button>

          </div>

        </div>
      )}

    </div>
  );
};

export default Transaction;