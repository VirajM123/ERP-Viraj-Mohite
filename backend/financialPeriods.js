import mongoose from "mongoose";
import express from "express";
import { validateBusinessDate, financialYearFor } from "./businessDate.js";
import { writeAuditEvent } from "./audit.js";

const fail = (code, status = 409) => { throw Object.assign(new Error(code), { code, status }); };
const civilDate = value => {
  try { return validateBusinessDate(value); } catch { fail("INVALID_PERIOD_DATE", 400); }
};
const schema = new mongoose.Schema({
  distributorId: { type: String, required: true }, firmId: { type: String, required: true },
  policyVersion: { type: Number, required: true }, configurationState: String,
  timezone: String, coverageStart: String, coverageEnd: String,
  revision: { type: Number, required: true }, periods: [mongoose.Schema.Types.Mixed],
  requests: [mongoose.Schema.Types.Mixed],
}, { timestamps: true, collection: "Acc_PeriodControl" });
schema.index({ distributorId: 1, firmId: 1 }, { unique: true });
export const PeriodControl = mongoose.models.Acc_PeriodControl || mongoose.model("Acc_PeriodControl", schema);

export function validateSchedule(schedule) {
  if (schedule?.timezone !== "Asia/Kolkata" || !Array.isArray(schedule.periods) ||
      !schedule.periods.length || schedule.periods.length > 1200) fail("INVALID_PERIOD_SCHEDULE", 400);
  const start = civilDate(schedule.coverageStart);
  const end = civilDate(schedule.coverageEnd);
  let next = start;
  const ids = new Set();
  for (const p of schedule.periods) {
    const date = civilDate(p?.startDate);
    const monthEnd = new Date(`${date}T00:00:00Z`);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);
    if (date !== next || !date.endsWith("-01") || p.endDate !== monthEnd.toISOString().slice(0, 10) ||
        p.id !== date.slice(0, 7) || ids.has(p.id) || !["OPEN", "CLOSED"].includes(p.status) ||
        p.financialYear !== financialYearFor(date)) fail("INVALID_PERIOD_SCHEDULE", 400);
    ids.add(p.id);
    monthEnd.setUTCDate(monthEnd.getUTCDate() + 1);
    next = monthEnd.toISOString().slice(0, 10);
  }
  if (schedule.periods.at(-1).endDate !== end) fail("INVALID_PERIOD_SCHEDULE", 400);
  return schedule;
}

const scope = req => {
  const { distributorId, firmId, userId, id } = req.auth || {};
  if (!distributorId || !firmId || !userId || !id) fail("AUTHENTICATION_REQUIRED", 401);
  return { distributorId, firmId };
};
const transaction = session => {
  if (!session?.inTransaction?.()) fail("PERIOD_TRANSACTION_REQUIRED");
};
export const GATE_NAMES = ["JOURNAL_BALANCING", "DOCUMENT_LEDGER", "PARTY_CASH_BANK", "STOCK", "PENDING_OPERATIONS", "GST"];
// No complete, verified reconciliation implementation is available. Unknown always blocks.
export const closureAssessment = () => ({ canClose: false, gates: GATE_NAMES.map(gate => ({ gate, status: "UNKNOWN", reason: "Verified reconciliation implementation required" })) });

export function assessConfiguration(control) {
  try {
    if (!control || control.configurationState !== "CONFIGURED" || control.policyVersion !== 1 || !Number.isSafeInteger(control.revision)) throw Error();
    validateSchedule(control);
    return { configured: true, coverageStart: control.coverageStart, coverageEnd: control.coverageEnd, closure: closureAssessment() };
  } catch { return { configured: false, code: "PERIOD_CONFIGURATION_REQUIRED", closure: closureAssessment() }; }
}

export function createPeriodService(security) {
  async function authorize(req, operation, action) {
    const tenant = scope(req);
    if (!await security.authorize(tenant.distributorId, tenant.firmId, req.auth.userId, req.auth.role, "ACCOUNTING", `FINANCIAL_PERIOD_${operation}`, action)) fail("PERIOD_PERMISSION_DENIED", 403);
    return tenant;
  }
  async function assess(req) {
    const tenant = await authorize(req, "VIEW", "view");
    return assessConfiguration(await PeriodControl.findOne(tenant).lean());
  }
  async function transition(req, action, session) {
    if (!["CONFIGURE", "CLOSE", "REOPEN"].includes(action)) fail("INVALID_PERIOD_ACTION", 400);
    const tenant = await authorize(req, action, action === "CONFIGURE" ? "add" : "edit");
    transaction(session);
    const { expectedRevision, reason, requestKey, schedule, periodId } = req.body || {};
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || typeof reason !== "string" || !reason.trim() || reason.length > 1000 ||
        typeof requestKey !== "string" || !requestKey.trim() || requestKey.length > 100) fail("INVALID_PERIOD_REQUEST", 400);
    const before = await PeriodControl.findOne(tenant).session(session).lean();
    const fingerprint = JSON.stringify({ action, expectedRevision, reason, schedule, periodId, actor: req.auth.id });
    const previous = before?.requests?.find(r => r.key === requestKey);
    if (previous) {
      if (previous.fingerprint !== fingerprint) fail("PERIOD_IDEMPOTENCY_CONFLICT");
      return previous.result;
    }
    if ((before?.revision ?? 0) !== expectedRevision) fail("PERIOD_REVISION_CONFLICT");
    if ((before?.requests?.length || 0) >= 1000) fail("PERIOD_REQUEST_CAPACITY_REACHED");
    let after;
    if (action === "CONFIGURE") {
      validateSchedule(schedule);
      if (before) {
        if (!assessConfiguration(before).configured || schedule.coverageStart !== before.coverageStart ||
            schedule.periods.length < before.periods.length || before.periods.some((p, i) =>
              ["id", "startDate", "endDate", "financialYear", "status"].some(k => p[k] !== schedule.periods[i]?.[k]))) fail("PERIOD_EXISTING_SCHEDULE_IMMUTABLE");
      }
      // Configuration may record explicitly approved historical CLOSED states; this is not a reconciliation-certified close.
      after = { ...tenant, policyVersion: 1, configurationState: "CONFIGURED", timezone: schedule.timezone,
        coverageStart: schedule.coverageStart, coverageEnd: schedule.coverageEnd,
        periods: schedule.periods.map((p, i) => before?.periods[i] || ({ id: p.id, startDate: p.startDate, endDate: p.endDate, financialYear: p.financialYear, status: p.status, revision: 0 })) };
    } else {
      if (!assessConfiguration(before).configured) fail("PERIOD_CONFIGURATION_REQUIRED");
      after = { ...before, periods: before.periods.map(p => ({ ...p })) };
      const period = after.periods.find(p => p.id === periodId);
      if (!period) fail("PERIOD_NOT_FOUND", 404);
      if (action === "CLOSE") {
        const assessment = closureAssessment();
        await writeAuditEvent(req, { entityType: "FINANCIAL_PERIOD", entityId: periodId, action: "CLOSE_BLOCKED", reason,
          before, after: { assessment, actorId: req.auth.id, requestKey } }, session);
        return { blocked: true, assessment };
      }
      if (period.status !== "CLOSED") fail("PERIOD_NOT_CLOSED");
      Object.assign(period, { status: "OPEN", revision: Number(period.revision || 0) + 1,
        transition: { actorId: req.auth.id, at: new Date().toISOString(), reason, action, requestKey } });
    }
    after.revision = expectedRevision + 1;
    const result = { revision: after.revision, action, periodId };
    after.requests = [...(before?.requests || []), { key: requestKey, fingerprint, result }];
    if (before) {
      const updated = await PeriodControl.replaceOne({ ...tenant, revision: expectedRevision }, after, { session, runValidators: true });
      if (updated.modifiedCount !== 1) fail("PERIOD_REVISION_CONFLICT");
    } else await PeriodControl.create([after], { session });
    await writeAuditEvent(req, { entityType: "FINANCIAL_PERIOD", entityId: periodId || "CONFIGURATION", action, reason,
      before, after: { ...after, actorId: req.auth.id, requestKey } }, session);
    return result;
  }
  return { assess, transition };
}

// Integration contract: call inside the SAME transaction as the financial mutation.
// Existing journal/handler integration is deliberately pending; no caller-supplied validation flag is trusted.
export async function validateFinancialOperation(req, { distributorId, firmId, dates }, session) {
  const tenant = scope(req);
  transaction(session);
  if (tenant.distributorId !== distributorId || tenant.firmId !== firmId) fail("PERIOD_TENANT_MISMATCH", 403);
  if (!Array.isArray(dates) || !dates.length) fail("PERIOD_DATES_REQUIRED", 400);
  const control = await PeriodControl.findOne(tenant).session(session).lean();
  if (!assessConfiguration(control).configured) fail("PERIOD_CONFIGURATION_REQUIRED");
  for (const date of dates) {
    civilDate(date);
    const period = control.periods.find(p => p.startDate <= date && p.endDate >= date);
    if (!period) fail("PERIOD_CONFIGURATION_REQUIRED");
    if (period.status !== "OPEN") fail("PERIOD_CLOSED");
  }
  const updated = await PeriodControl.updateOne({ ...tenant, revision: control.revision }, { $inc: { revision: 1 } }, { session });
  if (updated.modifiedCount !== 1) fail("PERIOD_REVISION_CONFLICT");
  return { revision: control.revision + 1, policyVersion: control.policyVersion };
}

export default function createFinancialPeriodsRouter(security) {
  const router = express.Router();
  const service = createPeriodService(security);
  router.get("/assessment", async (req, res, next) => {
    try { res.json({ success: true, ...(await service.assess(req)) }); } catch (error) { next(error); }
  });
  for (const action of ["CONFIGURE", "CLOSE", "REOPEN"]) router.post(`/${action.toLowerCase()}`, async (req, res, next) => {
    let session;
    try {
      session = await mongoose.startSession();
      let result;
      await session.withTransaction(async () => { result = await service.transition(req, action, session); });
      res.status(result.blocked ? 409 : 200).json({ success: !result.blocked, ...result });
    } catch (error) { next(error); } finally { if (session) await session.endSession(); }
  });
  router.use((error, req, res, next) => {
    if (!error.code || ![400, 401, 403, 404, 409].includes(error.status)) return next(error);
    res.status(error.status).json({ success: false, code: error.code, message: error.code });
  });
  return router;
}
