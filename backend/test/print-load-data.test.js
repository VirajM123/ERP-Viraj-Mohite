import test from "node:test";
import assert from "node:assert/strict";
import { buildPrintLoadPartyRows, buildPrintLoadProductRows } from "../printLoadData.js";

test("product load shows a 20-piece pack as 20 units, 20 quantity and one case", () => {
  const rows = buildPrintLoadProductRows([{ items: [{ productCode: "P", productName: "Salt", qty: 20, units: "PCS", boxPack: 20, mrp: 34, netAmount: 100 }] }]);
  assert.deepEqual([rows[0].unitQty, rows[0].qty, rows[0].cases, rows[0].totalQty, rows[0].netAmt], [20, 20, 1, 20, 100]);
});

test("product load aggregates cases across bills, respects BOX, free pieces and distinct pack sizes", () => {
  const bills = [{ items: [
    { productCode: "P", productName: "Salt", qty: 1, units: "BOX", boxPack: 20, free: 2 },
    { productCode: "P", productName: "Salt", qty: 18, units: "PCS", boxPack: 20 },
    { productCode: "P", productName: "Salt", qty: 12, units: "PCS", boxPack: 12 },
  ] }];
  const rows = buildPrintLoadProductRows(bills);
  assert.equal(rows.length, 2);
  assert.deepEqual([rows[0].unitQty, rows[0].qty, rows[0].freeQty, rows[0].totalQty, rows[0].cases], [20, 38, 2, 40, 2]);
  assert.equal(buildPrintLoadProductRows(bills, [], false)[0].totalQty, 38);
  assert.equal(rows[1].cases, 1);
});

test("product master supplies missing pack and unknown BOX quantities are not fabricated", () => {
  const bills = [{ items: [{ productCode: "P", productName: "Salt", qty: 1, units: "BOX" }] }];
  assert.equal(buildPrintLoadProductRows(bills, [{ productCode: "P", boxPack: 20 }])[0].totalQty, 20);
  const unknown = buildPrintLoadProductRows(bills)[0];
  assert.equal(unknown.totalQty, null);
  assert.equal(unknown.cases, null);
});

test("party load uses bill, area, salesman and receipt values without double-counting settlement", () => {
  const load = [{ Series: "UE", BillNo: 1, Amount: 500, PartyName: "Shop" }];
  const sales = [{ BillSeries: "UE", BillNo: 1, BillDate: "2026-11-26", AreaName: "Pune", SalesmanName: "Vilas" }];
  const receipts = [{ billSeries: "UE", billNo: "1", receiptAmount: 125, bankCashGroup: "CASH" }, { billSeries: "UE", billNo: "1", receiptAmount: 75, chequeNo: "123" }, { billSeries: "UE", billNo: "1", receiptAmount: 50, bankCashName: "UPI" }];
  const rows = buildPrintLoadPartyRows(load, sales, receipts, [{ billSeries: "UE", billNo: "1", receiptAmount: 250, receiptMode: "CASH" }]);
  assert.deepEqual([rows[0].billSeries, rows[0].billNo, rows[0].billDate, rows[0].areaName, rows[0].salesmanName], ["UE", 1, "2026-11-26", "Pune", "Vilas"]);
  assert.deepEqual([rows[0].amount, rows[0].cash, rows[0].cheque, rows[0].upi, rows[0].pending], [500, 125, 75, 50, 250]);
});

test("party load preserves zero bill values and falls back to settlement or unpaid balance", () => {
  const bills = [{ Series: "S", BillNo: 1, Amount: 100 }, { Series: "S", BillNo: 2, Amount: 0 }];
  const rows = buildPrintLoadPartyRows(bills, [{ BillSeries: "S", BillNo: 2, NetAmount: 90 }], [], [{ billSeries: "S", billNo: "1", receiptAmount: 30, receiptMode: "UPI" }]);
  assert.deepEqual([rows[0].upi, rows[0].pending, rows[1].amount, rows[1].pending], [30, 70, 0, 0]);
});
