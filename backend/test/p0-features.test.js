import test from "node:test";
import assert from "node:assert/strict";
import {
  consolidateStockMovementRows,
  normalizeJournalLines,
  validateJournalLines,
} from "../p0Features.js";

test("Journal Voucher accepts multiple balanced debit and credit lines", () => {
  const lines = normalizeJournalLines({ items: [
    { accountCode: "EXPENSE", drAmount: 600 },
    { accountCode: "INPUT_GST", drAmount: 108 },
    { accountCode: "BANK", crAmount: 708 },
  ] });
  assert.equal(lines.length, 3);
  assert.doesNotThrow(() => validateJournalLines(lines));
});

test("Journal Voucher rejects one-line and unbalanced entries", () => {
  assert.throws(() => validateJournalLines(normalizeJournalLines({ items: [{ accountCode: "CASH", drAmount: 100 }] })), /at least two lines/i);
  assert.throws(() => validateJournalLines(normalizeJournalLines({ items: [{ accountCode: "CASH", drAmount: 100 }, { accountCode: "SALES", crAmount: 90 }] })), /must be equal/i);
});

test("Sales stock movements consolidate repeated product and batch rows", () => {
  const common = {
    distributorId: "D1",
    firmId: "F1",
    sourceType: "SALES",
    sourceId: "SALE1",
    productCode: "PR101",
    batch: ".",
    quantityIn: 0,
  };
  const movements = consolidateStockMovementRows([
    { ...common, mrp: 90, quantityOut: 1 },
    { ...common, mrp: 90, quantityOut: 1 },
    { ...common, mrp: 90, quantityOut: 8 },
  ]);

  assert.equal(movements.length, 1);
  assert.equal(movements[0].quantityOut, 10);
  assert.equal(movements[0].mrp, 90);
});
