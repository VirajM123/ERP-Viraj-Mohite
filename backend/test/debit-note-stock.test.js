import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const dashboard = await readFile(new URL("../../src/Dashboard.jsx", import.meta.url), "utf8");
const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
const section = (start, end) => dashboard.slice(dashboard.indexOf(start), dashboard.indexOf(end, dashboard.indexOf(start)));

function createHarness() {
  const requests = [];
  const product = { productCode: "P1", productName: "Product", gstPercent: 18 };
  const context = vm.createContext({
    URLSearchParams, console, API_URL: "http://test/api",
    debitNoteFormData: { godown: "G1", godownCode: "G1", godownName: "Shop", company: "C1", igst: "N" },
    debitNoteItems: [{ trn: "GDR", productCode: "P1", itemCode: "P1", qty: 2, free: 1, batchNo: "GOOD", stockQty: 20 }],
    godowns: [{ godownCode: "G1", godownName: "Shop" }, { godownCode: "G2", godownName: "Warehouse" }],
    products: [product], getProductCode: (entry) => entry.productCode,
    getProductName: (entry) => entry.productName,
    getFirmSession: () => ({ distributorId: "D1", firmId: "F1" }),
    regexInputValue: (_name, value) => value,
    window: { setTimeout() {} }, alert(message) { assert.fail(message); },
    calcDebitNoteSummary() { assert.fail("Stock loading must not change financial calculations"); },
    setDebitNoteActiveRow() {},
  });
  context.setDebitNoteFormData = (update) => {
    context.debitNoteFormData = typeof update === "function" ? update(context.debitNoteFormData) : update;
  };
  const selectSource = section("  const handleDebitProductSelect =", "  const selectDebitNoteBatch =");
  for (const name of new Set(selectSource.match(/\bset[A-Z]\w+/g))) context[name] = () => {};
  context.setDebitNoteItems = (update) => {
    context.debitNoteItems = typeof update === "function" ? update(context.debitNoteItems) : update;
  };
  context.setDebitBatchRows = (rows) => { context.batches = rows; };
  context.setDebitBatchLoading = (loading) => { context.loading = loading; };
  const model = (batchNo, Qty) => ({ find(filter) {
    context.stockFilter = filter;
    return { sort() { return this; }, async lean() { return [{ Batch: batchNo, Qty, MRP: 10, SRate: 9 }]; } };
  } });
  let batchHandler;
  const routeStart = server.lastIndexOf("app.get(", server.indexOf('"/api/stock/credit-note-batches"'));
  vm.runInNewContext(server.slice(routeStart, server.indexOf("app.get(", routeStart + 10)), {
    app: { get(...args) { batchHandler = args.at(-1); } }, ensureConnection() {},
    DamStock: model("DAMAGE", 7), Stock: model("GOOD", 20), console,
  });
  context.fetch = async (url) => {
    const query = Object.fromEntries(new URL(url).searchParams);
    requests.push(query);
    let payload;
    await batchHandler({ query }, { json(value) { payload = value; }, status(code) { assert.fail(`Unexpected status ${code}`); } });
    return { ok: true, json: async () => payload };
  };
  vm.runInContext([
    section("  const handleDebitNoteInputChange =", "  const addDebitNoteItem ="),
    section("  const updateDebitNoteItem =", "  const deleteDebitNoteItem ="),
    selectSource,
    "globalThis.change = handleDebitNoteInputChange; globalThis.update = updateDebitNoteItem; globalThis.select = handleDebitProductSelect;",
  ].join("\n"), context);
  return { context, requests, product };
}

test("debit note loads damage batches for the newly selected godown", async () => {
  const { context, requests, product } = createHarness();
  context.change({ target: { name: "godown", value: "G2" } });
  await context.select(0, product, "DGR");
  assert.equal(requests[0].gdCode, "G2");
  assert.equal(context.debitNoteFormData.godownCode, "G2");
  assert.equal(context.debitNoteFormData.godownName, "Warehouse");
  assert.equal(context.debitNoteFormData.company, "C1");
  assert.equal(context.batches[0].stockQty, 7);
  assert.equal(context.stockFilter.distributorId, "D1");
  assert.equal(context.stockFilter.firmId, "F1");
  assert.equal(context.stockFilter.ProdCode, "P1");
});

test("switching debit note TRN reloads damage and good batches without changing quantities", async () => {
  const { context, requests } = createHarness();
  for (const [trn, batch, stock] of [["DGR", "DAMAGE", 7], ["GDR", "GOOD", 20]]) {
    context.update(0, "trn", trn);
    await new Promise(setImmediate);
    assert.equal(requests.at(-1).trnType, trn);
    assert.equal(requests.at(-1).includeLocked, "N");
    assert.equal(context.batches[0].batchNo, batch);
    assert.equal(context.batches[0].stockQty, stock);
    assert.equal(context.debitNoteItems[0].selectedBatch, null);
    assert.equal(context.debitNoteItems[0].qty, 2);
    assert.equal(context.debitNoteItems[0].free, 1);
    assert.equal(context.loading, false);
  }
});

test("unchanged TRN and blank debit rows do not request stock", () => {
  const { context, requests } = createHarness();
  context.update(0, "trn", "GDR");
  context.debitNoteItems = [{ trn: "GDR", itemCode: "" }];
  context.update(0, "trn", "DGR");
  assert.equal(requests.length, 0);
});
