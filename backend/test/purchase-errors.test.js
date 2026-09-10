import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { validateFinancialEnvelope } from "../financialValidation.js";

const source = (await readFile(new URL("../server.js", import.meta.url), "utf8")).replace(/\r\n/g, "\n");

// Run the actual routes and production response middleware without database writes.
async function rejectedPurchase(method, missingMaster, databaseFailure = false) {
  let handler, middleware, aborted = 0, ended = 0;
  const session = {
    startTransaction() {}, inTransaction: () => true,
    async abortTransaction() { aborted += 1; }, endSession() { ended += 1; },
  };
  const query = (value) => ({ session() { return this; }, sort() { return this; }, async lean() { return value; } });
  const master = (name) => ({ findOne() {
    if (databaseFailure) throw new Error("private database connection details");
    return query(name === missingMaster ? null : {});
  } });
  const context = vm.createContext({
    app: { [method](...args) { handler = args.at(-1); }, use(fn) { middleware = fn; } },
    process: { env: { NODE_ENV: "production" } },
    mongoose: { startSession: async () => session },
    ensureConnection() {}, securityRouter: { authorizeRequest() {} },
    applyProductMasterTaxRates: async () => {}, validateFinancialEnvelope,
    PurchaseHeader: { findOne: () => query(null) }, nextDocumentNumber: async () => 1,
    OtherAccount: master("supplier"), Company: master("company"), GodownModel: master("godown"),
    console: { error() {} },
  });
  const routeStart = source.indexOf(`app.${method}(\n  "/api/purchase${method === "put" ? "/:id" : ""}",`);
  assert.ok(routeStart >= 0);
  const routeEnd = source.indexOf(method === "post" ? "\n});" : "\n);", routeStart) + 4;
  vm.runInContext(source.slice(routeStart, routeEnd), context);
  const middlewareStart = source.indexOf("app.use((req, res, next) => {");
  const middlewareEnd = source.indexOf("\n});", middlewareStart) + 4;
  vm.runInContext(source.slice(middlewareStart, middlewareEnd), context);
  const req = {
    params: { id: "test-purchase" }, setTimeout() {},
    body: { distributorId: "D1", firmId: "F1", vouNo: 1, supplierName: "Supplier", gdCode: "G1",
      items: [{ quantity: 1, purRate: 10, mrp: 12 }] },
  };
  const res = {
    statusCode: 200, setHeader() {}, setTimeout() {},
    status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; },
  };
  middleware(req, res, () => {});
  await handler(req, res);
  assert.equal(aborted, 1);
  assert.equal(ended, 1);
  return res;
}

for (const method of ["post", "put"]) {
  for (const [master, message] of [
    ["supplier", "Invalid or inactive supplier account."],
    ["company", "Invalid or inactive company."],
    ["godown", "Invalid or inactive godown."],
  ]) {
    test(`${method} purchase preserves ${master} validation message in production and rolls back`, async () => {
      const res = await rejectedPurchase(method, master);
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, message);
    });
  }
  test(`${method} purchase keeps unexpected database errors private in production and rolls back`, async () => {
    const res = await rejectedPurchase(method, null, true);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, "The request could not be completed.");
  });
}
