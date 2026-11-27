import test from "node:test";
import assert from "node:assert/strict";
import { isBoxLikeSalesUnit, salesBillingHeaderError } from "../../shared/salesBillingRules.js";
import { calculateSalesFinancials } from "../financialValidation.js";
import { getPartySalesDetailValues } from "../partySalesReportData.js";
import { buildPrintLoadProductRows } from "../printLoadData.js";

test("sales billing requires both a selected area and a salesman", () => {
  assert.match(salesBillingHeaderError({ areaCode: "", salesmanCode: "S1" }), /area/i);
  assert.match(salesBillingHeaderError({ areaCode: "A1", salesmanCode: "  " }), /salesman/i);
  assert.equal(salesBillingHeaderError({ areaCode: "A1", salesmanCode: "S1" }), "");
  assert.equal(salesBillingHeaderError({ entryType: "counter sales" }), "");
  assert.equal(salesBillingHeaderError({ desktopImport: true }), "");
});

test("BAG uses the same sales quantity, discounts and tax as BOX", () => {
  const row = { qty: 2, free: 1, boxPack: 12, rate: 5, gst: 18, schemePct: 5, cdPct: 2 };
  const box = calculateSalesFinancials({}, [{ ...row, units: "BOX" }]);
  const bag = calculateSalesFinancials({}, [{ ...row, units: "BAG" }]);
  assert.equal(bag.GrossAmount, 120);
  assert.equal(bag.TotalQty, 25);
  for (const key of ["GrossAmount", "SchemeAmount", "CashDiscountAmount", "TaxableValue", "CGSTAmount", "SGSTAmount", "NetAmount", "TotalQty"]) {
    assert.equal(bag[key], box[key], key);
  }
  assert.equal(bag.items[0].units, "BAG");
  assert.equal(calculateSalesFinancials({}, [{ ...row, units: "PCS" }]).GrossAmount, 10);
  assert.equal(isBoxLikeSalesUnit("bag"), true);
  assert.equal(isBoxLikeSalesUnit("PCS"), false);
});

test("BAG is reported as the same packed quantity as BOX", () => {
  const row = { productCode: "P", qty: 2, free: 1, boxPack: 12, rate: 5 };
  const box = { ...row, units: "BOX" };
  const bag = { ...row, units: "BAG" };
  assert.equal(getPartySalesDetailValues(bag).reportQty, 24);
  assert.equal(getPartySalesDetailValues(bag).reportQty, getPartySalesDetailValues(box).reportQty);
  assert.deepEqual(buildPrintLoadProductRows([{ items: [bag] }]), buildPrintLoadProductRows([{ items: [box] }]));
});
