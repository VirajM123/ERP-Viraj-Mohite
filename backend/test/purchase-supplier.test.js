import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { findPurchaseSupplier, purchaseSupplierValue } from "../../src/utils/purchaseSupplier.js";
import { purchaseSupplierFilter } from "../purchaseSupplier.js";
import { validateFinancialEnvelope } from "../financialValidation.js";

const supplier = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", accountCode: "SUP-1", accountName: "Supplier & Co.", isActive: true };
const duplicateName = { ...supplier, _id: "bbbbbbbbbbbbbbbbbbbbbbbb", accountCode: "SUP-2" };
const scope = { distributorId: "D1", firmId: "F1" };

test("purchase selection identifies the chosen supplier even with duplicate names", () => {
  assert.equal(findPurchaseSupplier([supplier, duplicateName], duplicateName._id), duplicateName);
  assert.equal(findPurchaseSupplier([supplier, duplicateName], supplier.accountName), undefined);
  assert.equal(findPurchaseSupplier([supplier, duplicateName], duplicateName.accountCode), duplicateName);
});

test("existing purchases resolve by code or a unique name without changing tax settings", () => {
  const row = { ...supplier, invType: "TAXABLE", taxOn: "PRATE" };
  for (const value of [row._id, row.accountCode, row.accountName]) {
    assert.equal(findPurchaseSupplier([row], value), row);
    assert.equal(purchaseSupplierValue(findPurchaseSupplier([row], value)), row._id);
  }
  assert.equal(findPurchaseSupplier([{ ...supplier, isActive: false }], supplier._id), undefined);
});

test("supplier ID lookup retains tenant and active-account checks", () => {
  assert.deepEqual(purchaseSupplierFilter({ ...scope, supplierId: supplier._id, supplierCode: supplier.accountCode }), {
    ...scope, isActive: { $ne: false }, _id: supplier._id,
  });
  assert.deepEqual(purchaseSupplierFilter({ ...scope, supplierCode: supplier.accountCode }), {
    ...scope, isActive: { $ne: false }, accountCode: supplier.accountCode,
  });
  assert.throws(() => purchaseSupplierFilter({ ...scope, supplierId: "invalid" }), (error) => error.statusCode === 400);
});

const dashboard = (await readFile(new URL("../../src/Dashboard.jsx", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
const saveStart = dashboard.indexOf("  const savePurchase = async () => {");
const saveEnd = dashboard.indexOf("\n  const creditNoteSeriesOptions", saveStart);

for (const editing of [false, true]) {
  test(`purchase ${editing ? "edit" : "create"} sends the selected ID, code and name without changing item amounts`, async () => {
    let request;
    const context = vm.createContext({
      findPurchaseSupplier, getFirmSession: () => scope,
      purchaseFormData: { supplier: duplicateName._id, company: "C1", storageLocation: "Shop", vouNo: 1, invoiceNumber: "INV1", netAmt: 105 },
      otherAccounts: [supplier, duplicateName], companies: [{ companyCode: "C1", companyName: "Company" }],
      godowns: [{ godownCode: "G1", godownName: "Shop" }],
      purchaseItems: [{ productCode: "P1", quantity: 1, purRate: 100, mrp: 110, tax: 5, amount: 105 }],
      editingPurchaseId: editing ? "purchase-id" : null, API_URL: "/api", alert() {}, console,
      secureFetch: async (url, options) => {
        request = { url, method: options.method, body: JSON.parse(options.body) };
        // Stop before navigation/reset effects; no real request is sent.
        return { ok: false, json: async () => ({ success: false }) };
      },
    });
    vm.runInContext(`${dashboard.slice(saveStart, saveEnd)}\nglobalThis.save = savePurchase;`, context);
    await context.save();
    assert.ok(request, "save must reach the API");
    assert.equal(request.method, editing ? "PUT" : "POST");
    assert.equal(request.body.supplierId, duplicateName._id);
    assert.equal(request.body.supplierCode, "SUP-2");
    assert.equal(request.body.supplierName, duplicateName.accountName);
    assert.equal(request.body.gdCode, "G1");
    assert.equal(request.body.companyCode, "C1");
    assert.equal(request.body.items[0].amount, 105);
    assert.equal(request.body.items[0].purRate, 100);
    assert.equal(request.body.netAmt, 105);
  });
}

const server = (await readFile(new URL("../server.js", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
for (const method of ["post", "put"]) {
  test(`purchase ${method} commits the selected supplier, stock and balanced journal together`, async () => {
    let handler, committed = 0, aborted = 0, ended = 0, saved, journal, supplierQuery;
    const movements = [];
    const session = { startTransaction() {}, inTransaction: () => true,
      async abortTransaction() { aborted++; }, endSession() { ended++; } };
    const old = { _id: "purchase-id", vouNo: 1, items: [], toObject: () => ({}) };
    const query = (value) => ({ session() { return this; }, sort() { return this; }, lean: async () => value,
      then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
    const context = vm.createContext({
      app: { [method](...args) { handler = args.at(-1); } },
      ensureConnection() {}, securityRouter: { authorizeRequest() {} },
      mongoose: { startSession: async () => session }, purchaseSupplierFilter, validateFinancialEnvelope,
      applyProductMasterTaxRates: async () => {}, nextDocumentNumber: async () => 1,
      OtherAccount: { findOne(filter) { supplierQuery = filter; return query(duplicateName); } },
      Company: { findOne: () => query({ companyCode: "C1", companyName: "Company" }) },
      GodownModel: { findOne: () => query({ godownCode: "G1" }) },
      PurchaseHeader: {
        findOne: () => query(old),
        async create([value], options) { assert.equal(options.session, session); saved = value; return [{ ...value, ...old }]; },
        async findOneAndUpdate(filter, update, options) { assert.equal(options.session, session); saved = update.$set; return { ...saved, ...old }; },
      },
      Stock: { async findOneAndUpdate(filter, update, options) { assert.equal(options.session, session); movements.push(update.$inc.Qty); } },
      async applyPurchaseStockMovement(args) { assert.equal(args.session, session); movements.push(args.direction); },
      async postBalancedJournal(entry, transaction) { assert.equal(transaction, session); journal = entry; },
      async reverseSourceJournal() {}, async writeAuditEvent(req, entry, transaction) { assert.equal(transaction, session); },
      async commitTransactionReliably(transaction) { assert.equal(transaction, session); committed++; },
      console: { log() {}, error() {} },
    });
    const start = server.indexOf(`app.${method}(\n  "/api/purchase${method === "put" ? "/:id" : ""}",`);
    const end = server.indexOf(method === "post" ? "\n});" : "\n);", start) + 4;
    vm.runInContext(server.slice(start, end), context);
    const req = { auth: { ...scope, userId: "U1" }, params: { id: "purchase-id" }, body: {
      ...scope, supplierId: duplicateName._id, supplierCode: "STALE-CODE", supplierName: "Stale name",
      company: "C1", gdCode: "G1", vouNo: 1, invoiceDate: "2026-09-10",
      items: [{ productCode: "P1", quantity: 1, mrp: 110, purRate: 100, tax: 5 }],
    } };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
    await handler(req, res);
    assert.equal(res.body.success, true, res.body.message);
    assert.equal(supplierQuery._id, duplicateName._id);
    assert.equal(supplierQuery.firmId, scope.firmId);
    assert.equal(saved.supplierCode, duplicateName.accountCode);
    assert.equal(saved.supplierName, duplicateName.accountName);
    assert.equal(saved.netAmt, 105);
    assert.equal(journal.lines.at(-1).accountCode, duplicateName.accountCode);
    assert.equal(journal.lines.reduce((sum, line) => sum + line.debit - line.credit, 0), 0);
    assert.deepEqual(movements, method === "post" ? [1] : [-1, 1]);
    assert.equal(committed, 1);
    assert.equal(aborted, 0);
    assert.equal(ended, 1);
  });
}
