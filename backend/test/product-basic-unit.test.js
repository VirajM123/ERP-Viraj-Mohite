import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../../src/Dashboard.jsx", import.meta.url), "utf8");
const start = source.indexOf("  const handleProductSelect = (");
const end = source.indexOf("  // ========== DECLARATION OF saveInvoice", start);
assert.ok(start >= 0 && end > start, "Sales product selection handler must exist");

function selectProduct(product) {
  const noop = () => {};
  const context = {
    loadedBillProductReadOnly: false, invoiceItems: [{}],
    getProductCode: (p) => p.productCode, getProductName: (p) => p.productName,
    cloneInvoiceDraftValue: (value) => structuredClone(value),
    createEmptyInvoiceRow: () => ({}), invoiceRound: (value) => value,
    recalculateInvoiceCashDiscount: (items) => items,
    setInvoiceItems: (items) => { context.result = items; },
    calcInvoiceSummary: noop, updateActiveInvoiceDraft: noop, setSelectedSalesDetailRow: noop,
    setActiveRow: noop, setShowProductList: noop, setCurrentProductIndex: noop,
    setProductListFilter: noop, setProductDropdownIndex: noop, setFilteredProductList: noop,
    focusSalesQty: noop, product,
  };
  vm.runInNewContext(`${source.slice(start, end)}\nhandleProductSelect(0, product);`, context);
  return context.result[0];
}

test("sales product selection copies BAG and pack size from product master", () => {
  const row = selectProduct({ productCode: "P1", productName: "Salt", basicUnit: "BAG", boxPack: 30, selectedBatch: { salesRate: 10 } });
  assert.equal(row.units, "BAG");
  assert.equal(row.boxPack, 30);
  assert.equal(row.rate, 10);
});

test("other product units and the default remain unchanged", () => {
  assert.equal(selectProduct({ productCode: "P2", productName: "Oil", basicUnit: "LTR" }).units, "LTR");
  assert.equal(selectProduct({ productCode: "P3", productName: "Item" }).units, "PCS");
});
