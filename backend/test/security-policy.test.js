import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import createSecuritySetupRouter from "../securitySetup.js";
import { authenticateApi, hasTenantMismatch } from "../auth.js";
import { financialYearFor, istBusinessDateRange, validateBusinessDate } from "../businessDate.js";
import { AuditEvent } from "../audit.js";
import { apiErrorHandler } from "../apiError.js";
import createProductMappingRouter, { ProductMapping } from "../productMapping.js";

const router = createSecuritySetupRouter({});
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test("permissions require explicit true and deny unknown operations even to admins", () => {
  for (const value of [false, "false", "true", 1, {}, undefined]) {
    assert.equal(router.checkPermission({ vouchers: { STOCK_ADJUSTMENT: { add: value } } }, "VOUCHERS", "STOCK_ADJUSTMENT", "add"), false);
  }
  assert.equal(router.checkPermission({ vouchers: { STOCK_ADJUSTMENT: { add: true } } }, "VOUCHERS", "STOCK_ADJUSTMENT", "add"), true);
  assert.equal(router.checkPermission({ role: "DISTRIBUTOR_ADMIN" }, "VOUCHERS", "UNKNOWN", "add"), false);
  assert.equal(router.checkPermission({ role: "DISTRIBUTOR_ADMIN" }, "VOUCHERS", "STOCK_ADJUSTMENT", "unknown"), false);
  assert.equal(router.checkPermission({ role: "DISTRIBUTOR_ADMIN" }, "MASTER", "SERVICE", "view"), true);
});

test("administrator permission bypass requires a tenant and user identity", async () => {
  assert.equal(await router.authorize("", "F", "U", "DISTRIBUTOR_ADMIN", "MASTER", "PRODUCT", "add"), false);
  assert.equal(await router.authorize("D", "F", "U", "DISTRIBUTOR_ADMIN", "MASTER", "PRODUCT", "add"), true);
});

test("direct stock adjustment middleware denies users without permission records", async (t) => {
  t.mock.method(mongoose.models.Mas_SecuritySetup, "findOne", () => ({ lean: async () => null }));
  const res = response();
  await router.authorizeRequest("VOUCHERS", "STOCK_ADJUSTMENT", "add")(
    { auth: { distributorId: "D", firmId: "F", userId: "U", role: "SALESMAN" } }, res,
    () => assert.fail("Unauthorized request proceeded"));
  assert.equal(res.statusCode, 403);
});

test("tenant header conflicts are rejected", () => {
  assert.equal(hasTenantMismatch({ "x-firm-id": "OTHER" }, { firmId: "F" }), true);
  assert.equal(hasTenantMismatch({ "x-distributor-id": "OTHER" }, { distributorId: "D" }), true);
});

test("revoked session tokens are rejected using database session version", async (t) => {
  const secret = "test-only-secret-that-is-longer-than-32-characters";
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  t.after(() => { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; });
  t.mock.method(mongoose.connection, "collection", () => ({ findOne: async () => ({
    _id: "507f1f77bcf86cd799439011", firmId: "F", distributorId: "D", sessionVersion: 3, isActive: true,
  }) }));
  const token = jwt.sign({ sub: "507f1f77bcf86cd799439011", src: "USER", firmId: "F", distributorId: "D", ver: 2 }, secret,
    { issuer: "fmcg-erp", audience: "fmcg-erp-web" });
  const res = response();
  await authenticateApi({ method: "GET", path: "/users", headers: { authorization: `Bearer ${token}` } }, res,
    () => assert.fail("Revoked token proceeded"));
  assert.equal(res.statusCode, 401);
});

test("business dates reject rollover, ambiguous formats, and reversed ranges", () => {
  for (const value of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01", "01/04/2026", "2026-04-01T00:00:00Z"]) {
    assert.throws(() => validateBusinessDate(value), /Invalid business date/);
    assert.throws(() => financialYearFor(value), /Invalid business date/);
  }
  assert.equal(validateBusinessDate("2024-02-29"), "2024-02-29");
  assert.throws(() => istBusinessDateRange("2026-04-02", "2026-04-01"), /Invalid date range/);
});

const handlerFor = (targetRouter, method) => targetRouter.stack.find((layer) => layer.route?.path === "/" && layer.route.methods[method]).route.stack.at(-1).handle;
const adminRequest = (users) => ({ auth: { distributorId: "D", firmId: "F", userId: "ADMIN", role: "DISTRIBUTOR_ADMIN" }, body: { users }, headers: {} });

test("security setup excludes current and legacy passwords from user query", async (t) => {
  const userQuery = { select(fields) { assert.equal(fields, "-password -oldPassword"); return this; }, sort() { return this; }, lean: async () => [] };
  const targetRouter = createSecuritySetupRouter({ find: () => userQuery });
  const res = response();
  await handlerFor(targetRouter, "get")(adminRequest([]), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.users, []);
});

test("permission save rejects malformed permissions before opening a transaction", async () => {
  for (const permissions of [{ master: { PRODUCT: { add: "false" } } }, { unknown: {} }, { master: { UNKNOWN: {} } }]) {
    const res = response();
    await handlerFor(router, "put")(adminRequest([{ userId: "U", permissions }]), res);
    assert.equal(res.statusCode, 400);
  }
});

test("permission save scopes target user and writes audit in the same transaction", async (t) => {
  const session = { withTransaction: async (work) => work(), endSession: async () => {} };
  t.mock.method(mongoose, "startSession", async () => session);
  const targetRouter = createSecuritySetupRouter({ findOne(filter) {
    assert.deepEqual(filter, { distributorId: "D", firmId: "F", userId: "U", isActive: true });
    return { session(actual) { assert.equal(actual, session); return this; }, lean: async () => ({ userName: "User", role: "USER", firmName: "Firm" }) };
  } });
  t.mock.method(mongoose.models.Mas_SecuritySetup, "findOne", () => ({ session() { return this; }, lean: async () => null }));
  let saved = false, audited = false;
  t.mock.method(mongoose.models.Mas_SecuritySetup, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(filter.firmId, "F"); assert.equal(options.session, session); saved = true;
  });
  t.mock.method(AuditEvent, "create", async ([event], options) => {
    assert.equal(options.session, session); assert.equal(event.distributorId, "D"); assert.equal(event.userId, "ADMIN"); audited = true;
  });
  const res = response();
  await handlerFor(targetRouter, "put")(adminRequest([{ userId: "U", permissions: { master: { PRODUCT: { view: true } } } }]), res);
  assert.equal(res.statusCode, 200); assert.equal(saved, true); assert.equal(audited, true);
});

test("uncaught API errors and malformed JSON have safe responses", () => {
  for (const [error, expectedStatus] of [
    [new Error("database path and secret details"), 500],
    [{ type: "entity.parse.failed", body: "secret request body" }, 400],
    [{ type: "entity.too.large" }, 413],
    [{ code: 11000, keyValue: { password: "secret" } }, 409],
  ]) {
    const res = response();
    apiErrorHandler(error, {}, res, () => assert.fail("Unexpected delegation"));
    assert.equal(res.statusCode, expectedStatus);
    assert.equal(JSON.stringify(res.body).includes("secret"), false);
    assert.equal(res.body.success, false);
  }
});

test("product mapping creation permission cannot overwrite an existing mapping", async (t) => {
  const targetRouter = createProductMappingRouter({
    authorizeRequest: (moduleCode, operation, action) => async (req, res, next) => {
      assert.equal(moduleCode, "MAPPING"); assert.equal(operation, "PRODUCT_MAPPING");
      if (action === "edit") return res.status(403).json({ success: false });
      next();
    },
    Product: { findOne: () => ({ select() { return this; }, lean: async () => ({ productName: "Product" }) }) },
  });
  t.mock.method(ProductMapping, "findOne", () => ({ lean: async () => ({ _id: "existing" }) }));
  t.mock.method(ProductMapping, "findOneAndUpdate", () => assert.fail("Unauthorized overwrite"));
  const req = adminRequest([]);
  req.body = { sourceProductCode: "P1", mappings: [{ companyProdCode: "C1", companyProdName: "Company product" }] };
  const res = response();
  await handlerFor(targetRouter, "post")(req, res, (error) => { throw error; });
  assert.equal(res.statusCode, 403);
});
