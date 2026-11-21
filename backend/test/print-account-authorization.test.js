import test from "node:test";
import assert from "node:assert/strict";
import { requirePrintAdministrator } from "../printAccountDetails.js";

function invoke(role) {
  const result = { status: 200, body: null, next: false };
  const res = { status(value) { result.status = value; return this; }, json(value) { result.body = value; return this; } };
  requirePrintAdministrator({ auth: role ? { role } : undefined }, res, () => { result.next = true; });
  return result;
}

test("only authenticated distributor administrators may change print and bank settings", () => {
  assert.equal(invoke("DISTRIBUTOR_ADMIN").next, true);
  for (const role of ["ADMIN", "MANAGER", "USER", "SALESMAN", ""]) {
    const result = invoke(role);
    assert.equal(result.status, 403);
    assert.equal(result.next, false);
  }
});

test("administrator can persist report 3 and copies with a redacted audit event", async () => {
  const { default: router } = await import("../printAccountDetails.js");
  const { default: mongoose } = await import("mongoose");
  const model = mongoose.models.PrintAccountDetails;
  const audit = mongoose.models.Sys_AuditEvent;
  const saved = { findOne: model.findOne, findOneAndUpdate: model.findOneAndUpdate, startSession: mongoose.startSession, auditCreate: audit.create };
  const current = { _id: "settings-1", bankName: "Old", accountName: "Account", accountNumber: "1234", ifscCode: "ABC", qrCode: { dataUrl: "" }, outputSettings: {}, printContent: {} };
  let update, auditPayload;
  try {
    model.findOne = () => ({ lean: async () => current });
    model.findOneAndUpdate = (_scope, operation) => { update = operation.$set; return { lean: async () => ({ _id: "settings-1", ...update }) }; };
    mongoose.startSession = async () => ({ withTransaction: async (fn) => fn(), endSession: async () => {} });
    audit.create = async (events) => { auditPayload = events[0]; return events; };
    const route = router.stack.find((layer) => layer.route?.path === "/" && layer.route.methods.put).route;
    const handler = route.stack[route.stack.length - 1].handle;
    const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ auth: { role: "DISTRIBUTOR_ADMIN", userId: "u", firmId: "f", distributorId: "d" }, body: { bankName: "New", outputSettings: { reportNumber: "3", paperSize: "A5", copies: 2 } }, headers: {} }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(update.outputSettings.reportNumber, "3");
    assert.equal(update.outputSettings.copies, 2);
    assert.equal(update.outputSettings.orientation, "landscape");
    assert.equal(auditPayload.after.bankDetailsChanged, true);
    assert.equal(JSON.stringify(auditPayload).includes("1234"), false);
  } finally {
    model.findOne = saved.findOne; model.findOneAndUpdate = saved.findOneAndUpdate;
    mongoose.startSession = saved.startSession; audit.create = saved.auditCreate;
  }
});
