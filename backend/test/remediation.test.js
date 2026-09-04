import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { authenticateApi, hashPassword, isPasswordHash, requireRoles, verifyPassword } from "../auth.js";
import { businessDateIST, financialYearFor, istBusinessDateRange } from "../businessDate.js";
import { validateFinancialEnvelope } from "../financialValidation.js";
import { redactAuditValue } from "../audit.js";

test("passwords are bcrypt hashed and verified", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.equal(isPasswordHash(hash), true);
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("wrong", hash), false);
});

test("legacy plaintext verification remains migration-compatible", async () => {
  assert.equal(await verifyPassword("legacy", "legacy"), true);
  assert.equal(await verifyPassword("wrong", "legacy"), false);
});

test("IST business date and financial year boundaries are stable", () => {
  assert.equal(businessDateIST(new Date("2026-03-31T18:29:00.000Z")), "2026-03-31");
  assert.equal(businessDateIST(new Date("2026-03-31T18:31:00.000Z")), "2026-04-01");
  assert.equal(financialYearFor("2026-03-31"), "2025-26");
  assert.equal(financialYearFor("2026-04-01"), "2026-27");
  const range = istBusinessDateRange("2026-03-31", "2026-03-31");
  assert.equal(range.start.toISOString(), "2026-03-30T18:30:00.000Z");
  assert.equal(range.endExclusive.toISOString(), "2026-03-31T18:30:00.000Z");
});

test("financial totals are derived from quantity, rate, discounts and tax", () => {
  const result = validateFinancialEnvelope(
    { NetAmount: 1, CGSTAmount: 0, SGSTAmount: 0, IGSTAmount: 999 },
    [{ qty: 10, free: 0, rate: 10, schemePct: 10, gst: 18 }],
    { vatMode: "GROSS_SCHEME" }
  );
  assert.equal(result.GrossAmount, 100);
  assert.equal(result.SchemeAmount, 10);
  assert.equal(result.TaxableValue, 90);
  assert.equal(result.CGSTAmount, 8.1);
  assert.equal(result.SGSTAmount, 8.1);
  assert.equal(result.IGSTAmount, 0);
  assert.equal(result.NetAmount, 106.2);
  assert.throws(() => validateFinancialEnvelope({}, [{ qty: -1, rate: 10 }]), /valid number/);
});

test("purchase financial validation rejects a zero Purchase Rate before journal posting", () => {
  assert.throws(
    () => validateFinancialEnvelope(
      {},
      [{ quantity: 10, free: 0, mrp: 10, purRate: 0, tax: 5 }],
      { type: "purchase" }
    ),
    /Purchase Rate must be greater than zero/
  );
});

test("audit snapshots accept missing before or after values", () => {
  assert.equal(redactAuditValue(undefined), null);
  assert.equal(redactAuditValue(null), null);
  assert.deepEqual(
    redactAuditValue({ status: "CREATED", password: "secret" }),
    { status: "CREATED", password: "[REDACTED]" }
  );
});

const authResponse = () => {
  const result = { statusCode: 200, body: null };
  result.status = (code) => { result.statusCode = code; return result; };
  result.json = (body) => { result.body = body; return result; };
  return result;
};

test("protected API rejects missing token even with fake admin headers", async () => {
  process.env.JWT_SECRET = "test-only-secret-that-is-longer-than-32-characters";
  const req = { method: "GET", path: "/users", headers: { "x-user-role": "DISTRIBUTOR_ADMIN" } };
  const res = authResponse();
  await authenticateApi(req, res, () => assert.fail("request must not proceed"));
  assert.equal(res.statusCode, 401);
});

test("protected API rejects invalid and expired tokens", async () => {
  process.env.JWT_SECRET = "test-only-secret-that-is-longer-than-32-characters";
  for (const token of ["invalid", jwt.sign({ sub: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET, { expiresIn: -1, issuer: "fmcg-erp", audience: "fmcg-erp-web" })]) {
    const req = { method: "GET", path: "/users", headers: { authorization: `Bearer ${token}` } };
    const res = authResponse();
    await authenticateApi(req, res, () => assert.fail("request must not proceed"));
    assert.equal(res.statusCode, 401);
  }
});

test("user administration requires a database-derived distributor admin role", () => {
  const middleware = requireRoles("DISTRIBUTOR_ADMIN");
  const denied = authResponse();
  middleware({ auth: { role: "USER" } }, denied, () => assert.fail("normal user must not proceed"));
  assert.equal(denied.statusCode, 403);
  let proceeded = false;
  middleware({ auth: { role: "DISTRIBUTOR_ADMIN" } }, authResponse(), () => { proceeded = true; });
  assert.equal(proceeded, true);
});
