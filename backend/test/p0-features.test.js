import test from "node:test";
import assert from "node:assert/strict";
import {
  consolidateStockMovementRows,
  financialRows,
  isCreditDaysOverdue,
  normalizeJournalLines,
  validateJournalLines,
} from "../p0Features.js";
import { Journal } from "../accounting.js";

test("overdue bills do not block customers without a configured credit-days limit", () => {
  assert.equal(isCreditDaysOverdue(0, true), false);
  assert.equal(isCreditDaysOverdue(undefined, true), false);
  assert.equal(isCreditDaysOverdue(30, true), true);
  assert.equal(isCreditDaysOverdue(30, false), false);
});

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

test("Journal Voucher rejects invalid per-line amounts and sub-paise precision", () => {
  const invalidCases = [
    [{ accountCode: "CASH", debit: -100 }, { accountCode: "SALES", credit: 100 }],
    [{ accountCode: "CASH", debit: 100, credit: 1 }, { accountCode: "SALES", credit: 101 }],
    [{ accountCode: "CASH", debit: 100.001 }, { accountCode: "SALES", credit: 100.001 }],
    [{ accountCode: "", debit: 100 }, { accountCode: "SALES", credit: 100 }],
    [null, { accountCode: "SALES", credit: 100 }],
  ];
  for (const items of invalidCases) {
    assert.throws(() => validateJournalLines(normalizeJournalLines({ items })));
  }
});

test("Financial report query narrows account rows and projects only report fields", async (t) => {
  let filter;
  let projection;
  t.mock.method(Journal, "find", (query, fields) => {
    filter = query;
    projection = fields;
    return {
      sort() {
        return this;
      },
      async lean() {
        return [{
          documentDate: "2026-04-01",
          sourceType: "SALES",
          lines: [
            { accountCode: "CASH", debit: 100 },
            { accountCode: "SALES", credit: 100 },
          ],
        }];
      },
    };
  });

  const rows = await financialRows({
    auth: { distributorId: "D1", firmId: "F1" },
    query: { account: "cash" },
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].accountCode, "CASH");
  assert.equal(filter["lines.accountCode"].ignoreCase, true);
  assert.deepEqual(projection, { documentDate: 1, documentNo: 1, sourceType: 1, lines: 1, createdAt: 1 });
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
