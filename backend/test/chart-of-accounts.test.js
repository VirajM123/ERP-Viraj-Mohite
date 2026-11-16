import test from "node:test";
import assert from "node:assert/strict";
import { validateChartAccountMapping } from "../chartOfAccounts.js";
import { summarizeClassifiedRows } from "../p0Features.js";

test("chart mappings require valid accounting types and posting-role compatibility", () => {
  assert.deepEqual(validateChartAccountMapping({
    accountType: "asset",
    normalSide: "debit",
    cashBankType: "cash",
    taxControlType: "none",
    postingRole: "cash",
  }), {
    accountType: "ASSET",
    normalSide: "DEBIT",
    cashBankType: "CASH",
    taxControlType: "NONE",
    postingRole: "CASH",
  });
  assert.throws(() => validateChartAccountMapping({
    accountType: "INCOME",
    normalSide: "CREDIT",
    cashBankType: "BANK",
  }), /must be classified as assets/i);
  assert.throws(() => validateChartAccountMapping({
    accountType: "LIABILITY",
    normalSide: "CREDIT",
    taxControlType: "GST_OUTPUT",
    postingRole: "BANK",
  }), /requires a bank account/i);
});

test("financial statements summarize and filter by configured account classifications", () => {
  const rows = [
    { accountCode: "CASH01", accountName: "Cash", accountType: "ASSET", debit: 120, credit: 0 },
    { accountCode: "CASH01", accountName: "Cash", accountType: "ASSET", debit: 0, credit: 20 },
    { accountCode: "SALE01", accountName: "Sales", accountType: "INCOME", debit: 0, credit: 100 },
    { accountCode: "GST01", accountName: "Output GST", accountType: "LIABILITY", debit: 0, credit: 18 },
    { accountCode: "EXP01", accountName: "Expenses", accountType: "EXPENSE", debit: 10, credit: 0 },
  ];

  assert.deepEqual(
    summarizeClassifiedRows(rows, "profit-loss").map((row) => row.accountCode),
    ["SALE01", "EXP01"],
  );
  assert.deepEqual(
    summarizeClassifiedRows(rows, "balance-sheet").map((row) => row.accountCode),
    ["CASH01", "GST01"],
  );
  assert.deepEqual(
    summarizeClassifiedRows(rows, "trial-balance").find((row) => row.accountCode === "CASH01"),
    { accountCode: "CASH01", accountName: "Cash", accountType: "ASSET", normalSide: undefined, debit: 120, credit: 20, closing: 100 },
  );
});
