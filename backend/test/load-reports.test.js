import test from "node:test";
import assert from "node:assert/strict";
import { buildLoadReports } from "../loadReports.js";

const load = { LoadSeries: "L", LoadNo: 1, LoadDate: "2026-11-20", Bills: [{ BillSeries: "S", BillNo: 1, Amount: 100, BillType: "Credit" }] };
const sale = { BillSeries: "S", BillNo: 1, BillDate: "2026-11-19", PartyCode: "P", SalesmanCode: "SM", SalesmanName: "Jane", NetAmount: 100, items: [{ productCode: "X", productName: "Old", qty: 3 }] };
const settlement = { loadSeries: "L", loadNo: "1", bills: [{ billSeries: "S", billNo: "1", originalBillAmount: 100, billAmount: 100, billType: "Credit", receiptAmount: 40, pendingAmount: 60 }] };

test("load summary uses original bill amounts and recorded receipt amounts", () => {
  const [row] = buildLoadReports({ type: "summary", loads: [load], settlements: [settlement], sales: [sale] });
  assert.deepEqual([row.totalBill, row.totalBillAmt, row.recBill, row.recBillAmt], [1, 100, 1, 40]);
});

test("collection uses allocated cash and does not double count header and allocation", () => {
  const receipts = [{ billSeries: "S", billNo: "1", receiptAmount: 40, bankCash: "Cash", rno: 12, receiptBills: [{ trnSeries: "S", trnNo: "1", nowAdjust: 40 }] }];
  const [row] = buildLoadReports({ type: "collection", loads: [load], settlements: [settlement], sales: [sale], receipts, accounts: [{ accountCode: "P", accountName: "Renamed" }] });
  assert.deepEqual([row.cash, row.cheque, row.pendingAmount, row.partyName, row.ledgerOs], [40, 0, 60, "Renamed", null]);
});

test("cancel report uses current product name and leaves unavailable historical quantities blank", () => {
  const [row] = buildLoadReports({ type: "cancel", loads: [load], sales: [sale], products: [{ productCode: "X", productName: "New" }] });
  assert.deepEqual([row.productName, row.loadQty, row.deliverQty, row.cancelQty], ["New", null, 3, null]);
});

test("cancelled bill preserves amount and reports zero delivered", () => {
  const cancelled = { ...settlement, bills: [{ ...settlement.bills[0], billAmount: 0, receiptAmount: 0, cancel: "Y", status: "Cancelled" }] };
  const [summary] = buildLoadReports({ type: "summary", loads: [load], settlements: [cancelled], sales: [sale] });
  const [detail] = buildLoadReports({ type: "cancel", loads: [load], settlements: [cancelled], sales: [sale] });
  assert.deepEqual([summary.cancelBill, summary.cancelBillAmt, detail.deliverQty], [1, 100, 0]);
});

test("cancel report retains products removed after loading and compares the saved load quantity", () => {
  const loaded = { ...load, Bills: [{ ...load.Bills[0], items: [{ productCode: "X", qty: 7 }, { productCode: "Y", qty: 2 }] }] };
  const rows = buildLoadReports({ type: "cancel", loads: [loaded], sales: [sale] });
  assert.deepEqual(rows.map((row) => [row.productCode, row.loadQty, row.deliverQty, row.cancelQty]), [["X", 7, 3, 4], ["Y", 2, 0, 2]]);
});
