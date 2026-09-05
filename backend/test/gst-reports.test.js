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
    PartyCode: "A1", TaxableValue: 200, GSTAmount: 10, NetAmount: 210,
    items: [{ taxable: 200, gstPercent: 5, gstAmt: 10 }],
  }], accounts, { fromDate: "2026-04-01", toDate: "2026-09-05" });
  assert.equal(purchase[0].GST5, 25);
  assert.equal(purchase[0].BillAmt, 525);
  assert.equal(crn[0].CRN5, 200);
  assert.equal(crn[0].TotalTax, 10);
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
    NetAmount: 118, items: [{ productName: "Item", hsn: "1001", unit: "PCS-PIECES", qty: 1, taxable: 100, gstPercent: 18, cgst: 9, sgst: 9 }],
  }], accounts, { fromDate: "2026-08-01", toDate: "2026-08-31", withDamage: "Y" });

  assert.deepEqual(sections.map((section) => section.name), ["B2B", "B2CL", "B2CS", "Cdnr", "Cdnur", "HSN", "Docs", "HSNR", "HSNU"]);
  assert.equal(sections.find((section) => section.name === "B2B").rows[0].GSTNo, "27ABCDE1234F1Z5");
  assert.equal(sections.find((section) => section.name === "Cdnr").rows[0].CreditNoteNo, "4");
  assert.equal(sections.find((section) => section.name === "HSN").rows[0].Taxable, 900);
  assert.equal(sections.find((section) => section.name === "HSNU").rows.filter((row) => row.RowType !== "total").length, 0);
});
