import test from "node:test";
import assert from "node:assert/strict";
import { buildAccountLedger } from "../accountLedger.js";

const line = (accountCode, debit = 0, credit = 0) => ({ accountCode, debit, credit });
test("account ledger brings forward opening and shows sales, receipts and reversals in order", () => {
  const journals = [
    { documentDate: "2026-03-31", sourceType: "SALES", sourceId: "old", lines: [line("P1", 100), line("SALES", 0, 100)] },
    { documentDate: "2026-04-01", sourceType: "OPENING_BALANCE", lines: [line("P1", 50), line("OPENING", 0, 50)] },
    { documentDate: "2026-04-02", sourceType: "SALES", sourceId: "sale", documentNo: "S23", lines: [line("P1", 300), line("SALES", 0, 300)] },
    { documentDate: "2026-04-03", sourceType: "RECEIPT", sourceId: "receipt", documentNo: "12", lines: [line("CASH", 200), line("P1", 0, 200)] },
    { documentDate: "2026-04-04", sourceType: "RECEIPT", sourceId: "receipt", documentNo: "12", reversalOf: "original", lines: [line("CASH", 0, 200), line("P1", 200)] },
  ];
  const documents = new Map([["SALES:sale", { series: "S", number: "23" }], ["RECEIPT:receipt", { series: "RC", number: "12" }]]);
  const names = new Map([["sales", "Sales A/C"], ["cash", "Cash in hand"]]);
  const result = buildAccountLedger(journals, { accountCode: "p1", fromDate: "2026-04-01", documents, names });
  assert.deepEqual(result.rows.map((row) => row.balance), [150, 450, 250, 450]);
  assert.deepEqual([result.rows[1].billType, result.rows[1].billSeries, result.rows[1].billNo, result.rows[1].particular], ["SAL", "S", "23", "Sales A/C"]);
  assert.deepEqual([result.rows[2].billType, result.rows[2].particular, result.rows[3].isReversal], ["REC", "Cash in hand", true]);
  assert.deepEqual(result.summary, { opening: 150, debit: 650, credit: 200, closing: 450 });
});

test("credit opening and empty accounts are represented without fabricated movements", () => {
  const journals = [{ documentDate: "2026-03-01", sourceType: "RECEIPT", lines: [line("P", 0, 250), line("CASH", 250)] }];
  const result = buildAccountLedger(journals, { accountCode: "P", fromDate: "2026-04-01" });
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].balance, -250);
  assert.equal(result.summary.credit, 250);
  assert.equal(buildAccountLedger([], { accountCode: "P", fromDate: "2026-04-01" }).summary.closing, 0);
});
