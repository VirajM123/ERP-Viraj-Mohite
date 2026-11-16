import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import net from 'node:net';
import createSecurity from '../securitySetup.js';
import { AuditEvent } from '../audit.js';
import { PeriodControl, validateSchedule, assessConfiguration, closureAssessment, createPeriodService, validateFinancialOperation } from '../financialPeriods.js';
assert.equal(globalThis.phase1Isolation, true);
const req = () => ({ auth: { id: 'actor', userId: 'admin', distributorId: 'D', firmId: 'F', role: 'DISTRIBUTOR_ADMIN' }, headers: {}, body: {} });
const session = { inTransaction: () => true };
const schedule = () => ({ timezone: 'Asia/Kolkata', coverageStart: '2024-02-01', coverageEnd: '2024-04-30', periods: [
  { id: '2024-02', startDate: '2024-02-01', endDate: '2024-02-29', financialYear: '2023-24', status: 'CLOSED' },
  { id: '2024-03', startDate: '2024-03-01', endDate: '2024-03-31', financialYear: '2023-24', status: 'OPEN' },
  { id: '2024-04', startDate: '2024-04-01', endDate: '2024-04-30', financialYear: '2024-25', status: 'OPEN' },
] });
const security = createSecurity(mongoose.models.PeriodTestUser || mongoose.model('PeriodTestUser', new mongoose.Schema({})));
function memory(t, initial) {
  let state = initial && structuredClone(initial);
  const audits = [];
  const filters = [];
  t.mock.method(PeriodControl, 'findOne', filter => {
    filters.push(filter);
    const chain = { session: () => chain, lean: async () => state && state.distributorId === filter.distributorId && state.firmId === filter.firmId ? structuredClone(state) : null };
    return chain;
  });
  t.mock.method(PeriodControl, 'create', async rows => { state = structuredClone(rows[0]); return rows; });
  t.mock.method(PeriodControl, 'replaceOne', async (filter, row) => {
    if (state.revision !== filter.revision) return { modifiedCount: 0 };
    state = structuredClone(row); return { modifiedCount: 1 };
  });
  t.mock.method(PeriodControl, 'updateOne', async filter => {
    if (state.revision !== filter.revision) return { modifiedCount: 0 };
    state.revision++; return { modifiedCount: 1 };
  });
  t.mock.method(AuditEvent, 'create', async (rows, options) => { assert.equal(options.session, session); audits.push(...rows); return rows; });
  return { state: () => state, audits, filters };
}
const control = () => ({ ...schedule(), distributorId: 'D', firmId: 'F', policyVersion: 1, configurationState: 'CONFIGURED', revision: 0, requests: [] });
test('isolated network and database', () => {
  assert.throws(() => mongoose.connect('mongodb://127.0.0.1/test'), /PHASE1_ISOLATION/);
  assert.throws(() => new net.Socket().connect(27017, '127.0.0.1'), /PHASE1_ISOLATION/);
});
test('calendar months, leap February and fiscal rollover', () => { assert.equal(validateSchedule(schedule()).periods.length, 3); });
test('gaps, overlaps, wrong year, timezone and malformed month reject', () => {
  for (const alter of [s => s.periods.splice(1, 1), s => s.periods[1].startDate = '2024-02-01', s => s.periods[2].financialYear = '2023-24', s => s.timezone = 'UTC', s => s.periods[0].endDate = '2024-02-28']) {
    const s = schedule(); alter(s); assert.throws(() => validateSchedule(s));
  }
});
test('missing and malformed configuration fails closed', async t => {
  memory(t); assert.equal(assessConfiguration(null).configured, false);
  await assert.rejects(validateFinancialOperation(req(), { distributorId: 'D', firmId: 'F', dates: ['2024-03-31'] }, session), /PERIOD_CONFIGURATION_REQUIRED/);
});
test('open periods share revision write; closed and uncovered dates reject', async t => {
  const m = memory(t, control());
  await validateFinancialOperation(req(), { distributorId: 'D', firmId: 'F', dates: ['2024-03-31', '2024-04-01'] }, session);
  assert.equal(m.state().revision, 1);
  for (const date of ['2024-02-29', '2025-01-01']) await assert.rejects(validateFinancialOperation(req(), { distributorId: 'D', firmId: 'F', dates: [date] }, session));
  assert.equal(m.state().revision, 1);
});
test('tenant mismatch and inactive session reject before reads', async t => {
  const m = memory(t, control());
  await assert.rejects(validateFinancialOperation(req(), { distributorId: 'D', firmId: 'OTHER', dates: ['2024-03-01'] }, session), /TENANT_MISMATCH/);
  await assert.rejects(validateFinancialOperation(req(), {}, {}), /TRANSACTION_REQUIRED/);
  assert.equal(m.filters.length, 0);
});
test('real permission engine denies ordinary users and accepts only explicit delegation', async t => {
  const model = mongoose.models.Mas_SecuritySetup;
  t.mock.method(model, 'findOne', () => ({ lean: async () => ({ permissions: { accounting: { FINANCIAL_PERIOD_REOPEN: { edit: true } } } }) }));
  assert.equal(await security.authorize('D', 'F', 'user', 'USER', 'ACCOUNTING', 'FINANCIAL_PERIOD_REOPEN', 'edit'), true);
  assert.equal(await security.authorize('D', 'F', 'user', 'USER', 'ACCOUNTING', 'FINANCIAL_PERIOD_CLOSE', 'edit'), false);
  const r = req(); r.auth.role = 'USER'; r.body = { expectedRevision: 0, reason: 'test', requestKey: 'x' };
  await assert.rejects(createPeriodService(security).transition(r, 'CLOSE', session), /PERMISSION_DENIED/);
});
test('explicit configuration, audit, identical retry and conflicting retry', async t => {
  const m = memory(t); const r = req(); const service = createPeriodService(security);
  r.body = { expectedRevision: 0, reason: 'Approved schedule reference A', requestKey: 'configure', schedule: schedule() };
  const result = await service.transition(r, 'CONFIGURE', session);
  assert.deepEqual(await service.transition(r, 'CONFIGURE', session), result);
  assert.equal(m.audits.length, 1); assert.equal(m.audits[0].after.actorId, 'actor');
  assert.equal(m.audits[0].distributorId, 'D'); assert.equal(m.audits[0].reason, r.body.reason);
  r.body.reason = 'different'; await assert.rejects(service.transition(r, 'CONFIGURE', session), /IDEMPOTENCY_CONFLICT/);
});
test('reopen requires reason, records transition, stale revision rejects', async t => {
  const m = memory(t, control()); const r = req(); const service = createPeriodService(security);
  r.body = { expectedRevision: 0, reason: '', requestKey: 'reopen', periodId: '2024-02' };
  await assert.rejects(service.transition(r, 'REOPEN', session), /INVALID_PERIOD_REQUEST/);
  r.body.reason = 'Approved correction'; await service.transition(r, 'REOPEN', session);
  assert.equal(m.state().periods[0].status, 'OPEN'); assert.equal(m.audits[0].action, 'REOPEN');
  r.body.requestKey = 'other'; await assert.rejects(service.transition(r, 'REOPEN', session), /REVISION_CONFLICT/);
});
test('all unknown mandatory gates block closure, record assessment, preserve status', async t => {
  const m = memory(t, control()); const r = req();
  r.body = { expectedRevision: 0, reason: 'Month end', requestKey: 'close', periodId: '2024-03' };
  assert.equal((await createPeriodService(security).transition(r, 'CLOSE', session)).blocked, true);
  assert.equal(closureAssessment().gates.length, 6); assert.equal(m.state().periods[1].status, 'OPEN');
  assert.equal(m.audits[0].action, 'CLOSE_BLOCKED');
});
test('audit failure propagates; mock does not prove rollback', async t => {
  memory(t, control()); t.mock.method(AuditEvent, 'create', async () => { throw Error('audit unavailable'); });
  const r = req(); r.body = { expectedRevision: 0, reason: 'Approved', requestKey: 'r', periodId: '2024-02' };
  await assert.rejects(createPeriodService(security).transition(r, 'REOPEN', session), /audit unavailable/);
});
test('conditional revision conflict rejects mocked stale posting', async t => {
  memory(t, control()); t.mock.method(PeriodControl, 'updateOne', async () => ({ modifiedCount: 0 }));
  await assert.rejects(validateFinancialOperation(req(), { distributorId: 'D', firmId: 'F', dates: ['2024-04-01'] }, session), /REVISION_CONFLICT/);
});
