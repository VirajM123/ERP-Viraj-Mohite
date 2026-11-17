import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAccountMap,
  buildCrnGSTRows,
  buildGstSummaryRows,
  buildGstr1Sections,
  buildPurchaseGSTRows,
  buildSalesGSTRows,
} from "../gstReports.js";
import createGstReportsRouter from "../gstReports.js";

test("GST routes read only transaction collections needed by the selected report", async () => {
  const reads = [];
  const model = (name) => ({ find: () => ({ lean: async () => { reads.push(name); return []; } }) });
  const router = createGstReportsRouter({
    SalesHeader: model("sales"), PurchaseHeader: model("purchases"),
    CreditNote: model("credits"), DebitNote: model("debits"),
    Account: model("customers"), OtherAccount: model("suppliers"),
  });
  const handler = router.stack[0].route.stack[0].handle;
  for (const [report, expected] of [
    ["sales-register", ["sales"]],
    ["purchase-register", ["purchases"]],
    ["crn-register", ["credits"]],
    ["gstr1", ["sales", "credits"]],
    ["summary", ["sales", "purchases", "credits", "debits"]],
  ]) {
    reads.length = 0;
    let response;
    await handler({
      auth: { distributorId: "D1", firmId: "F1" },
      query: { fromDate: "2026-01-01", toDate: "2026-01-31" },
      params: { report },
    }, { json: (value) => { response = value; return value; } });
    assert.equal(response.success, true, report);
    assert.deepEqual(reads.sort(), expected.sort(), report);
  }
});

const accounts = buildAccountMap([{
  accountCode: "A1",
  accountName: "Registered Party",
  gstNo: "27ABCDE1234F1Z5",
  gstType: "Registered",
  address: "Pune",
}]);

test("sales GST register respects tenant-ready filters and rate bifurcation", () => {
  const rows = buildSalesGSTRows([{
    isActive: true, BillDate: "2026-05-01", BillSeries: "S", BillNo: 7, PartyCode: "A1",
    PartyName: "Registered Party", GrossAmount: 1180, TaxableValue: 1000, CGSTAmount: 90,
    SGSTAmount: 90, NetAmount: 1180, items: [{ taxable: 1000, gstPercent: 18, cgst: 90, sgst: 90 }],
  }], accounts, { fromDate: "2026-04-01", toDate: "2026-09-05", gstNo: "registered" });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].Sales18, 1000);
  assert.equal(rows[0].GST18, 180);
  assert.equal(rows[0].GSTNo, "27ABCDE1234F1Z5");
});

test("purchase and CRN register totals use stored split taxes", () => {
  const purchase = buildPurchaseGSTRows([{
    isActive: true, invoiceDate: "2026-05-02", vouSer: "P", vouNo: 2, supplierCode: "A1",
    groBsAmt: 500, cgstAmt: 12.5, sgstAmt: 12.5, netAmt: 525,
    items: [{ TaxableValue: 500, GSTPercent: 5, CGST: 12.5, SGST: 12.5 }],
  }], accounts, { fromDate: "2026-04-01", toDate: "2026-09-05" });
  const crn = buildCrnGSTRows([{
    isActive: true, VDate: "2026-05-03", CreditNoteSeries: "CN", CreditNoteNo: 3,
    PartyCode: "A1", TaxableValue: 200, GSTAmount: 10, NetAmt: 1498.35,
    items: [{ taxable: 200, gstPercent: 5, gstAmt: 10 }],
  }], accounts, { fromDate: "2026-04-01", toDate: "2026-09-05" });
  assert.equal(purchase[0].GST5, 25);
  assert.equal(purchase[0].BillAmt, 525);
  assert.equal(crn[0].CRN5, 200);
  assert.equal(crn[0].TotalTax, 10);
  assert.equal(crn[0].BillAmt, 1498.35);
});

test("GST summary keeps sales, purchase and return sections separate", () => {
  const rows = buildGstSummaryRows({
    salesRows: [{ Sales5: 100, GST5: 5, SalesValue: 100, GrossAmt: 105 }],
    purchaseRows: [{ Purchase5: 80, GST5: 4, Taxable: 80, BillAmt: 84 }],
    crnRows: [{ CRN5: 20, GST5: 1, Taxable: 20, BillAmt: 21 }],
    debitRows: [],
  });
  const detailRows = rows.filter((row) => row.RowType === "detail");
  assert.deepEqual(detailRows.map((row) => row.Section), ["Sales", "Purchase", "Sales Return"]);
  assert.deepEqual(detailRows.map((row) => row.Taxable), [100, 80, 20]);
  assert.ok(rows.some((row) => row.RowType === "section" && row.AccountName === "Purchase Return"));
  assert.ok(rows.some((row) => row.RowType === "total" && row.AccountName === "Total"));
  assert.ok(rows.some((row) => row.RowType === "final" && row.AccountName === "Final Total"));
  assert.equal(rows.at(-1).AccountName, "Check Previous Return before Paid");
});

test("GSTR1 report creates every reference workbook section", () => {
  const sections = buildGstr1Sections([{
    isActive: true, BillDate: "2026-08-02", BillSeries: "S", BillNo: 21, PartyCode: "A1",
    PartyName: "Registered Party", OriginalNetAmount: 1180, TaxableValue: 1000,
    CGSTAmount: 90, SGSTAmount: 90,
    items: [{ productName: "Item", hsn: "1001", unit: "PCS-PIECES", qty: 10, taxable: 1000, gstPercent: 18, cgst: 90, sgst: 90 }],
  }], [{
    isActive: true, VDate: "2026-08-03", CreditNoteNo: 4, PartyCode: "A1", PartyName: "Registered Party",
    NetAmt: 1498.35, items: [{ productName: "Item", hsn: "1001", unit: "PCS-PIECES", qty: 1, taxable: 100, gstPercent: 18, cgst: 9, sgst: 9 }],
  }], accounts, { fromDate: "2026-08-01", toDate: "2026-08-31", withDamage: "Y" });

  assert.deepEqual(sections.map((section) => section.name), ["B2B", "B2CL", "B2CS", "Cdnr", "Cdnur", "HSN", "Docs", "HSNR", "HSNU"]);
  assert.equal(sections.find((section) => section.name === "B2B").rows[0].GSTNo, "27ABCDE1234F1Z5");
  assert.equal(sections.find((section) => section.name === "Cdnr").rows[0].CreditNoteNo, "4");
  assert.equal(sections.find((section) => section.name === "Cdnr").rows[0].CreditNoteValue, 1498.35);
  assert.equal(sections.find((section) => section.name === "HSN").rows[0].Taxable, 900);
  assert.equal(sections.find((section) => section.name === "HSNU").rows.filter((row) => row.RowType !== "total").length, 0);
});

test("optimized route preserves legacy invoice results with projected documents and referenced accounts", async () => {
  const sales = [
    { BillDate: "2026-08-02", BillSeries: "S", BillNo: 21, PartyCode: "A1", PartyName: "Buyer", isActive: true, TaxableValue: 100.005, CGSTAmount: 2.5, SGSTAmount: 2.5, OriginalNetAmount: 105.01, GrossAmount: 105.01, items: [{ hsn: "1001", qty: 1, taxable: 50.005, gstPercent: 5, cgst: 1.25, sgst: 1.25 }, { hsn: "1002", qty: 1, taxable: 50, gstPercent: 5, cgst: 1.25, sgst: 1.25 }] },
    { BillDate: "2026-08-03", BillSeries: "S", BillNo: 22, PartyCode: "A1", isActive: false, IsBillCancelled: true, Status: "CANCELLED", items: [] },
  ];
  const purchases = [{ invoiceDate: "2026-08-04", vouSer: "P", vouNo: 5, supplierCode: "V1", supplierName: "Vendor", isActive: true, groBsAmt: 80, cgstAmt: 2, sgstAmt: 2, netAmt: 84, items: [{ taxable: 80, gstPercent: 5, cgst: 2, sgst: 2 }] }];
  const credits = [{ VDate: "2026-08-05", CreditNoteSeries: "CN", CreditNoteNo: 3, PartyCode: "A1", PartyName: "Buyer", isActive: true, NetAmt: 10.5, items: [{ hsn: "1001", taxable: 10, gstPercent: 5, cgst: 0.25, sgst: 0.25 }] }];
  const debits = [{ VDate: "2026-08-06", DebitNoteSeries: "DN", DebitNoteNo: 2, SupplierCode: "V1", SupplierName: "Vendor", isActive: true, NetAmount: 10.5, items: [{ taxable: 10, gstPercent: 5, CGST: 0.25, SGST: 0.25 }] }];
  const customers = [{ accountCode: "A1", accountName: "Buyer", gstNo: "27ABCDE1234F1Z5", gstType: "Registered", state: "Maharashtra", address: "Pune" }];
  const suppliers = [{ accountCode: "V1", accountName: "Vendor", gstNo: "27ABCDE1234F1Z5", gstType: "Registered", state: "Maharashtra" }];
  const data = { sales, purchases, credits, debits, customers, suppliers };
  const calls = [];
  const model = (name) => ({ find(filter, projection) {
    calls.push({ name, filter, projection });
    return { lean: async () => data[name]
      .filter((row) => !filter.$or || filter.$or.some((clause) => (clause.accountCode?.$in || clause.code?.$in).includes(row.accountCode || row.code)))
      .filter((row) => !filter.$and?.some((clause) => clause.isActive) || (row.isActive !== false && row.IsBillCancelled !== true && row.Status !== "CANCELLED"))
      .map((row) => Object.fromEntries(Object.keys(projection).filter((key) => Object.hasOwn(row, key)).map((key) => [key, row[key]]))) };
  } });
  const router = createGstReportsRouter({ SalesHeader: model("sales"), PurchaseHeader: model("purchases"), CreditNote: model("credits"), DebitNote: model("debits"), Account: model("customers"), OtherAccount: model("suppliers") });
  const handler = router.stack[0].route.stack[0].handle;
  const filters = { fromDate: "2026-08-01", toDate: "2026-08-31" };
  const accountMap = buildAccountMap([...customers, ...suppliers]);
  const salesRows = buildSalesGSTRows(sales, accountMap, filters);
  const purchaseRows = buildPurchaseGSTRows(purchases, accountMap, filters);
  const crnRows = buildCrnGSTRows(credits, accountMap, filters);
  const debitRows = buildPurchaseGSTRows(debits.map((row) => ({ ...row, invoiceDate: row.VDate, vouSer: row.DebitNoteSeries, vouNo: row.DebitNoteNo, supplierCode: row.SupplierCode, supplierName: row.SupplierName, netAmt: row.NetAmount, grossAmount: row.GrossAmount, rounding: row.RoundingAmount, cgstAmt: 0.25, sgstAmt: 0.25, igstAmt: 0 })), accountMap, filters);
  const expected = { "sales-register": salesRows, "purchase-register": purchaseRows, "crn-register": crnRows, summary: buildGstSummaryRows({ salesRows, purchaseRows, crnRows, debitRows }) };
  for (const report of ["sales-register", "purchase-register", "crn-register", "summary", "gstr1"]) {
    calls.length = 0;
    let response;
    await handler({ auth: { distributorId: "D1", firmId: "F1" }, query: filters, params: { report } }, { json(value) { response = value; return value; } });
    assert.equal(response.success, true, report);
    if (report === "gstr1") assert.deepEqual(response.sections, buildGstr1Sections(sales, credits, accountMap, filters));
    else assert.deepEqual(response.rows, expected[report], report);
    for (const call of calls) {
      assert.equal(call.filter.distributorId, "D1");
      assert.equal(call.filter.firmId, "F1");
      assert.ok(call.projection && Object.keys(call.projection).length > 0, report);
      if (call.name === "customers" || call.name === "suppliers") assert.deepEqual(call.filter.$or[0].accountCode.$in.sort(), (report === "summary" ? ["A1", "V1"] : report === "purchase-register" ? ["V1"] : ["A1"]).sort());
      else assert.deepEqual(call.filter[call.name === "sales" ? "BillDate" : call.name === "purchases" ? "invoiceDate" : "VDate"], { $gte: filters.fromDate, $lte: filters.toDate });
    }
    if (report === "gstr1") assert.equal(response.sections.find((section) => section.name === "Docs").rows[1].CancelledBills, 1);
  }
});

test("Mongo document filters retain the register and GSTR1 cancellation rules", async () => {
  const calls = [];
  const model = (name) => ({ find(filter, projection) {
    calls.push({ name, filter, projection });
    return { lean: async () => [] };
  } });
  const router = createGstReportsRouter({ SalesHeader: model("sales"), PurchaseHeader: model("purchases"), CreditNote: model("credits"), DebitNote: model("debits"), Account: model("customers"), OtherAccount: model("suppliers") });
  const handler = router.stack[0].route.stack[0].handle;
  const query = { fromDate: "2026-08-01", toDate: "2026-08-31", billType: "retail", specificSeries: "Y", series: "S" };
  for (const report of ["sales-register", "gstr1"]) {
    calls.length = 0;
    await handler({ auth: { distributorId: "D1", firmId: "F1" }, query, params: { report } }, { json(value) { return value; } });
    const salesCall = calls.find((call) => call.name === "sales");
    assert.ok(salesCall);
    assert.equal(salesCall.filter.$and.some((clause) => clause.BillType?.test?.(" RETAIL ")), true);
    assert.equal(salesCall.filter.$and.some((clause) => clause.$expr?.$eq?.[1] === "S"), true);
    assert.equal(salesCall.filter.$and.some((clause) => clause.isActive?.$ne === false), report !== "gstr1");
    if (report === "gstr1") {
      const creditCall = calls.find((call) => call.name === "credits");
      assert.ok(creditCall);
      assert.equal(creditCall.filter.$and.some((clause) => clause.isActive), false);
    }
  }
  calls.length = 0;
  await handler({ auth: { distributorId: "D1", firmId: "F1" }, query: { ...query, withDamage: "N" }, params: { report: "gstr1" } }, { json(value) { return value; } });
  assert.ok(calls.find((call) => call.name === "sales").filter.$and.some((clause) => clause.$expr?.$not));
});
