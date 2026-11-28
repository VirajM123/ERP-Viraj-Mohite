import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../../src/Dashboard.jsx", import.meta.url), "utf8");
const lockStart = source.indexOf("  const isSettleLoadItemFinalized =");
const lockEnd = source.indexOf("  const saveSettleLoad =", lockStart);
const updateStart = source.indexOf("          const updatedItems = settleLoadItems.map(", source.indexOf("      if (isSettleAdjustMode) {", source.indexOf("  const saveInvoice =")));
const updateEnd = source.indexOf("          setSettleLoadItems(updatedItems);", updateStart);
const receiptStart = source.indexOf("  const handleReceiptSubmit = async");
const receiptEnd = source.indexOf("  const handleSettleAdjustEdit = async", receiptStart);
assert.ok(lockStart >= 0 && lockEnd > lockStart && updateStart >= 0 && updateEnd > updateStart && receiptStart >= 0 && receiptEnd > receiptStart);

test("editing a bill locks other actions but permits a receipt for its updated balance", async () => {
  const original = { billAmount: 100, originalBillAmount: 100, receiptAmount: 0, pending: "N", adjust: "N", cancel: "N", status: "Pending" };
  const context = {
    settleLoadItems: [original], settleAdjustRowIndex: 0, updatedBillAmount: 90, updatedBillType: "Credit",
    receiptFormData: { ourBankAccount: "cash", receiptAmount: 90 },
    getBillPendingAmount: async () => 90,
    receiptLookups: { salesmen: [] },
    setSettleLoadItems: (items) => { context.result = items; },
    calculateSettleLoadSummary: () => {}, setShowReceiptModal: () => {}, setCurrentReceiptItem: () => {},
    alert: (message) => { throw new Error(message); },
  };
  vm.runInNewContext(`${source.slice(lockStart, lockEnd)}\n${source.slice(updateStart, updateEnd)}\nthis.edited = updatedItems[0]; this.finalized = isSettleLoadItemFinalized;`, context);
  assert.equal(context.edited.pendingAmount, 90);
  assert.equal(context.edited.pending, "N");
  assert.equal(context.finalized(context.edited), true);
  assert.equal(context.finalized(context.edited, { allowBillEdit: true }), false);
  context.settleLoadItems = [context.edited];
  context.currentReceiptItem = { index: 0, item: context.edited };
  await vm.runInNewContext(`${source.slice(receiptStart, receiptEnd)}\nhandleReceiptSubmit();`, context);
  assert.equal(context.result[0].receiptAmount, 90);
  assert.equal(context.result[0].pendingAmount, 0);
  assert.equal(context.finalized(context.result[0], { allowBillEdit: true }), true);
  for (const action of [{ pending: "Y" }, { cancel: "Y" }, { adjust: "Y" }, { receiptAmount: 10, status: "Partial" }]) {
    assert.equal(context.finalized({ ...original, ...action }, { allowBillEdit: true }), true);
  }
  assert.match(source, /className="settle-row-button settle-receipt-button"\s+disabled=\{isSettleLoadItemFinalized\(item, \{ allowBillEdit: true \}\)\}/);
});
