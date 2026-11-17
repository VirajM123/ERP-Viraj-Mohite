import test from "node:test";
import assert from "node:assert/strict";
import {
  getCreditNoteReportValues,
  getPartySalesBillTotals,
  getPartySalesDetailValues,
  getPartySalesHeaderTotals,
  groupPartySalesDetailRows,
} from "../partySalesReportData.js";

test("maps persisted invoice line values to the Party Wise Sales export fields", () => {
  const values = getPartySalesDetailValues(
    {
      unit: "BOX",
      qty: 2,
      boxPack: 12,
      rate: 8.25,
      salesRate: 99,
      grossAmt: 198,
      tprAmt: 2,
      schemeAmt: 3,
      starProdLevel: 1,
      btmProdLevel: 0.5,
      cdAmt: 5,
      taxable: 186.5,
      cgst: 4.6625,
      sgst: 4.6625,
      amount: 195.825,
      freeQty: 1,
    },
    {
      shortCode: "SHORT",
      localProductName: "Local name",
      boxPack: 12,
    }
  );

  assert.deepEqual(
    {
      shortCode: values.shortCode,
      localProduct: values.localProduct,
      unit: values.unit,
      reportQty: values.reportQty,
      billQty: values.billQty,
      reportRate: values.reportRate,
      billRate: values.billRate,
      caseQty: values.caseQty,
      grossAmount: values.grossAmount,
      discountAmount: values.discountAmount,
      cashDiscountAmount: values.cashDiscountAmount,
      taxableAmount: values.taxableAmount,
      gstAmount: values.gstAmount,
      netAmount: values.netAmount,
    },
    {
      shortCode: "SHORT",
      localProduct: "Local name",
      unit: "BOX",
      reportQty: 24,
      billQty: 2,
      reportRate: 8.25,
      billRate: 99,
      caseQty: "2/0",
      grossAmount: 198,
      discountAmount: 6.5,
      cashDiscountAmount: 5,
      taxableAmount: 186.5,
      gstAmount: 9.325,
      netAmount: 195.825,
    }
  );
});

test("uses saved bill-header totals and switches net amount for credit notes", () => {
  const bill = {
    GrossAmount: 100,
    TPRAmount: 5,
    SchemeAmount: 3,
    StarDiscountAmount: 2,
    CashDiscountAmount: 1,
    TaxableValue: 89,
    CGSTAmount: 4.45,
    SGSTAmount: 4.45,
    OriginalNetAmount: 97.9,
    CreditNoteAmount: 6,
    NetAmount: 91.9,
  };

  assert.deepEqual(getPartySalesHeaderTotals(bill), {
    grossAmount: 100,
    tprAmount: 5,
    schemeAmount: 3,
    discountAmount: 10,
    cashDiscountAmount: 1,
    taxableAmount: 89,
    gstAmount: 8.9,
    creditNoteAmount: 0,
    netAmount: 97.9,
  });
  assert.equal(getPartySalesHeaderTotals(bill, true).creditNoteAmount, 6);
  assert.equal(getPartySalesHeaderTotals(bill, true).netAmount, 91.9);
});

test("rebuilds sales summary totals from unchanged invoice lines after a credit note", () => {
  const totals = getPartySalesBillTotals({
    GrossAmount: 80,
    TaxableValue: 70,
    CGSTAmount: 3.5,
    SGSTAmount: 3.5,
    CreditNoteAmount: 10,
    OriginalNetAmount: 77,
    NetAmount: 67,
    items: [
      {
        qty: 1,
        rate: 100,
        grossAmt: 100,
        tprAmt: 10,
        taxable: 90,
        cgst: 4.5,
        sgst: 4.5,
        amount: 99,
      },
    ],
  });

  assert.equal(totals.grossAmount, 100);
  assert.equal(totals.taxableAmount, 90);
  assert.equal(totals.gstAmount, 9);
  assert.equal(totals.netAmount, 77);
});

test("reconciles credit-note line values to the saved document net amount", () => {
  const creditNote = getCreditNoteReportValues({
    GrossAmount: 12,
    TaxableValue: 11.2,
    GSTAmount: 0.1,
    NetAmount: 12.35,
    items: [
      { Qty: 1, Rate: 10, grossAmt: 10, taxable: 10, amount: 10.5 },
      { Qty: 1, Rate: 1, grossAmt: 1, taxable: 1, amount: 1.25 },
    ],
  });

  assert.equal(creditNote.lines.length, 2);
  assert.equal(creditNote.lines[0].netAmount, 10.5);
  assert.equal(creditNote.lines[1].netAmount, 1.25);
  assert.equal(creditNote.remainder.grossAmount, 1);
  assert.equal(creditNote.remainder.taxableAmount, 0.2);
  assert.equal(creditNote.remainder.gstAmount, 0.1);
  assert.equal(creditNote.remainderNetAmount, 0.6);
});

test("uses the legacy saved NetAmt as the credit-note final amount", () => {
  const creditNote = getCreditNoteReportValues({
    NetAmt: 1498.35,
    Items: [{ Amount: 1760.85 }],
  });

  assert.equal(creditNote.netAmount, 1498.35);
  assert.equal(creditNote.remainderNetAmount, -262.5);
});

test("groups selected-party lines using the legacy report dimensions", () => {
  const rows = groupPartySalesDetailRows([
    {
      billDate: "2026-02-01",
      billSeries: "S",
      billNo: 10,
      productCode: "P1",
      reportRate: 2,
      reportBoxPack: 12,
      reportQty: 12,
      billQty: 1,
      qty: 1,
      freeQty: 0,
      caseQty: "1/0",
      grossAmount: 24,
      discountAmount: 1,
      cashDiscountAmount: 0.5,
      gstAmount: 1.15,
      netAmount: 23.65,
    },
    {
      billDate: "2026-02-01",
      billSeries: "S",
      billNo: 10,
      productCode: "P1",
      reportRate: 2,
      reportBoxPack: 12,
      reportQty: 12,
      billQty: 1,
      qty: 1,
      freeQty: 1,
      caseQty: "1/0",
      grossAmount: 24,
      discountAmount: 1,
      cashDiscountAmount: 0.5,
      gstAmount: 1.15,
      netAmount: 23.65,
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].reportQty, 24);
  assert.equal(rows[0].billQty, 2);
  assert.equal(rows[0].freeQty, 1);
  assert.equal(rows[0].caseQty, "2/0");
  assert.equal(rows[0].grossAmount, 48);
  assert.equal(rows[0].discountAmount, 2);
  assert.equal(rows[0].netAmount, 47.3);
});
