import test from "node:test";
import assert from "node:assert/strict";
import createP0FeaturesRouter, {
  ageingBucketAmounts,
  buildStockMovementReportRows,
  consolidateStockMovementRows,
  filterCreditControlRows,
  filterPermissionAuditRows,
  financialRows,
  isCreditDaysOverdue,
  normalizeJournalLines,
  outstandingAfterAllocation,
  reportDateRangeError,
  stockAdjustmentQuantity,
  validateJournalLines,
} from "../p0Features.js";
import { Journal } from "../accounting.js";
import mongoose from "mongoose";
import { OpeningTransaction } from "../openingBalances.js";

test("billing customer details are tenant-scoped and include remaining sales and opening balances", async () => {
  const previousAccount = mongoose.models.Mas_Account;
  const previousSales = mongoose.models.T_Sal_Header;
  const previousOpeningFind = OpeningTransaction.find;
  let accountFilter, salesFilter, openingFilter;
  try {
    mongoose.models.Mas_Account = { findOne(filter) { accountFilter = filter; return { select() { return { lean: async () => ({ accountCode: 'C1', accountName: 'Balaji', address: 'Pune', gstNo: 'GST1' }) }; } }; } };
    mongoose.models.T_Sal_Header = { aggregate(pipeline) { salesFilter = pipeline[0].$match; return Promise.resolve([{ outstanding: 125 }]); } };
    OpeningTransaction.find = (filter) => { openingFilter = filter; return { session() { return { lean: async () => [{ balanceAmount: 100, allocatedAmount: 30 }] }; } }; };
    const router = createP0FeaturesRouter({ authorizeRequest: () => (_req, _res, next) => next() });
    const route = router.stack.find((layer) => layer.route?.path === '/sales/customer-details').route;
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await route.stack[route.stack.length - 1].handle({ auth: { distributorId: 'D1', firmId: 'F1' }, query: { accountCode: 'C1' } }, res);
    assert.equal(res.body.outstanding, 195);
    assert.equal(res.body.customer.gstNo, 'GST1');
    for (const filter of [accountFilter, salesFilter, openingFilter]) {
      assert.equal(filter.distributorId, 'D1');
      assert.equal(filter.firmId, 'F1');
    }
    assert.equal(salesFilter.PartyCode, 'C1');
    assert.equal(openingFilter.accountCode, 'C1');
    assert.deepEqual(salesFilter.IsBillCancelled, { $ne: true });
  } finally {
    if (previousAccount) mongoose.models.Mas_Account = previousAccount; else delete mongoose.models.Mas_Account;
    if (previousSales) mongoose.models.T_Sal_Header = previousSales; else delete mongoose.models.T_Sal_Header;
    OpeningTransaction.find = previousOpeningFind;
  }
});

test("overdue bills do not block customers without a configured credit-days limit", () => {
  assert.equal(isCreditDaysOverdue(0, true), false);
  assert.equal(isCreditDaysOverdue(undefined, true), false);
  assert.equal(isCreditDaysOverdue(30, true), true);
  assert.equal(isCreditDaysOverdue(30, false), false);
});

test("customer ageing assigns each open balance to one correct boundary bucket", () => {
  for (const [days, bucket] of [
    [0, "Current"], [1, "Days1To30"], [30, "Days1To30"],
    [31, "Days31To60"], [60, "Days31To60"], [61, "Days61To90"],
    [90, "Days61To90"], [91, "Over90Days"],
  ]) {
    const buckets = ageingBucketAmounts(days, 125);
    assert.equal(buckets[bucket], 125);
    assert.equal(Object.values(buckets).reduce((sum, value) => sum + value, 0), 125);
  }
});

test("outstanding balances exclude allocations and never become negative", () => {
  assert.equal(outstandingAfterAllocation(500, 125), 375);
  assert.equal(outstandingAfterAllocation(500, 700), 0);
});

test("report date filters reject malformed, impossible and reversed dates", () => {
  assert.equal(reportDateRangeError("", ""), "");
  assert.equal(reportDateRangeError("2024-02-29", "2024-03-01"), "");
  assert.equal(reportDateRangeError("2024-02-30", "2024-03-01"), "Enter a valid date range.");
  assert.equal(reportDateRangeError("04/01/2026", "2026-04-30"), "Enter a valid date range.");
  assert.equal(reportDateRangeError("2026-05-01", "2026-04-30"), "From Date cannot be greater than To Date.");
});

test("credit control filters by account code or name and preserves all rows when blank", () => {
  const rows = [
    { accountCode: "C001", accountName: "North Traders" },
    { accountCode: "C002", accountName: "South Stores" },
  ];
  assert.equal(filterCreditControlRows(rows).length, 2);
  assert.deepEqual(filterCreditControlRows(rows, " c001 "), [rows[0]]);
  assert.deepEqual(filterCreditControlRows(rows, "south"), [rows[1]]);
});

test("permission audit filters independently by user and module", () => {
  const rows = [
    { userId: "U1", userName: "Asha", module: "SALES", operation: "CREATE" },
    { userId: "U2", userName: "Ravi", module: "STOCK", operation: "VIEW" },
  ];
  assert.deepEqual(filterPermissionAuditRows(rows), rows);
  assert.deepEqual(filterPermissionAuditRows(rows, { user: "asha" }), [rows[0]]);
  assert.deepEqual(filterPermissionAuditRows(rows, { module: "stock" }), [rows[1]]);
  assert.deepEqual(filterPermissionAuditRows(rows, { user: "u2", module: "stock" }), [rows[1]]);
});

test("date-filtered report routes reject invalid ranges before reading data", async () => {
  const router = createP0FeaturesRouter({ authorizeRequest: () => (_req, _res, next) => next() });
  for (const [path, params] of [
    ["/reports/financial/:report", { report: "general-ledger" }],
    ["/reports/catalog/:report", { report: "daily-sales" }],
    ["/reports/stock-movement", {}],
    ["/reports/audit-trail", {}],
  ]) {
    const route = router.stack.find((layer) => layer.route?.path === path)?.route;
    assert.ok(route, `expected route ${path}`);
    const response = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await route.stack[route.stack.length - 1].handle({
      auth: { distributorId: "D1", firmId: "F1" },
      params,
      query: { fromDate: "2026-02-30", toDate: "2026-03-01" },
    }, response);
    assert.equal(response.statusCode, 400, path);
    assert.equal(response.body.success, false, path);
  }
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

test("Stock Movement Ledger includes prior balance while filtering displayed dates and direction", () => {
  const rows = buildStockMovementReportRows([
    { movementDate: "2026-04-01", productCode: "P1", godown: "G1", batch: "B1", quantityIn: 10, sourceType: "PURCHASE" },
    { movementDate: "2026-04-02", productCode: "P1", godown: "G1", batch: "B1", quantityOut: 3, sourceType: "SALES" },
    { movementDate: "2026-04-03", productCode: "P1", godown: "G1", batch: "B1", quantityIn: 5, sourceType: "PURCHASE" },
  ], { fromDate: "2026-04-02", toDate: "2026-04-03", entryType: "OUT" });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].Date, "2026-04-02");
  assert.equal(rows[0].BalanceQty, 7);
  assert.equal(rows[0].StockOut, 3);
});

test("stock adjustment quantity does not count the saved free quantity twice", () => {
  assert.equal(stockAdjustmentQuantity({ TotalQty: 4, Qty: 3, FreeQty: 1 }), 4);
  assert.equal(stockAdjustmentQuantity({ Qty: 3, FreeQty: 1 }), 4);
});
