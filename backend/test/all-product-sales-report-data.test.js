import test from "node:test";
import assert from "node:assert/strict";
import { aggregateAllProductSalesRows } from "../allProductSalesReportData.js";

const salesRow = (overrides = {}) => ({
  _id: "invoice-item",
  Trn: "SALES",
  CompanyCode: "C1",
  ProductCode: "P1",
  ProductName: "Product",
  Unit: "PCS",
  Batch: "B1",
  MRP: 12,
  Rate: 10,
  BasicRate: 8,
  Qty: 1,
  FreeQty: 0,
  Amount: 10.1,
  VatAmt: 1.01,
  BillDate: "2026-01-01",
  BillNo: "1",
  SalesmanName: "A",
  ...overrides,
});

test("units report groups only matching product, unit, batch and rates", () => {
  const rows = aggregateAllProductSalesRows([
    salesRow(),
    salesRow({ _id: "second", Qty: 2, Amount: 20.2, VatAmt: 2.02 }),
    salesRow({ _id: "other-batch", Batch: "B2", Qty: 4 }),
  ], "units");

  assert.equal(rows.length, 2);
  assert.equal(rows[0].Qty, 3);
  assert.equal(rows[0].Amount, 30.3);
  assert.equal(rows[0].VatAmt, 3.03);
  assert.equal(rows[0].BillNo, "");
  assert.equal(rows[1].Batch, "B2");
});

test("amount report combines batches and rates by product and unit without showing a false rate", () => {
  const rows = aggregateAllProductSalesRows([
    salesRow(),
    salesRow({ _id: "other-batch-rate", Batch: "B2", Rate: 9, Qty: 2, Amount: 18.18 }),
  ], "amount");

  assert.equal(rows.length, 1);
  assert.equal(rows[0].Qty, 3);
  assert.equal(rows[0].Amount, 28.28);
  assert.equal(rows[0].Batch, "");
  assert.equal(rows[0].Rate, 0);
  assert.equal(rows[0].MRP, 0);
});

test("bill-wise salesman keeps product totals separated by salesman", () => {
  const rows = aggregateAllProductSalesRows([
    salesRow({ SalesmanName: "A" }),
    salesRow({ _id: "other-salesman", SalesmanName: "B", Qty: 2 }),
  ], "units", true);

  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.SalesmanName), ["A", "B"]);
});

test("details and non-sales rows retain their original granularity", () => {
  const detail = salesRow();
  const creditNote = salesRow({ _id: "credit-note", Trn: "CRN" });
  const zeroSales = salesRow({ _id: "zero-product", Qty: 0, Amount: 0 });

  assert.deepEqual(aggregateAllProductSalesRows([detail], "details"), [detail]);
  const grouped = aggregateAllProductSalesRows([detail, creditNote, zeroSales], "units");
  assert.equal(grouped.length, 3);
  assert.equal(grouped[0].BillNo, "");
  assert.equal(grouped[1], creditNote);
  assert.equal(grouped[2], zeroSales);
});
