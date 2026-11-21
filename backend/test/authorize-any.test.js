import test from "node:test";
import assert from "node:assert/strict";
import { authorizeAny } from "../authorizeAny.js";

const principal = { distributorId: "D", firmId: "F", userId: "U", role: "USER" };
const permissions = [["SALES", "SALES_BILLING", "view"], ["SALES", "SETTLE_LOAD", "add"]];

test("cross-feature reads require an explicitly authorized workflow", async () => {
  for (const allowed of [true, false]) {
    let proceeded = false;
    let status;
    let result;
    const res = { status(value) { status = value; return this; }, json(value) { result = value; return this; } };
    const calls = [];
    await authorizeAny(async (...args) => {
      calls.push(args);
      return allowed && args[5] === "SETTLE_LOAD";
    }, permissions)({ auth: principal }, res, () => { proceeded = true; });
    assert.equal(proceeded, allowed);
    assert.ok(calls.every((call) => call.slice(0, 4).join(":") === "D:F:U:USER"));
    if (!allowed) { assert.equal(status, 403); assert.equal(result.success, false); }
  }
});

test("cross-feature reads fail closed without an authenticated scope", async () => {
  let status;
  const res = { status(value) { status = value; return this; }, json() { return this; } };
  await authorizeAny(() => assert.fail("must not authorize"), permissions)({ auth: {} }, res, () => assert.fail("must not continue"));
  assert.equal(status, 401);
});
