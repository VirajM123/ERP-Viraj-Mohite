import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import mongoose from '../../backend/node_modules/mongoose/index.js';
import { Journal, postBalancedJournal, reverseSourceJournal } from '../../backend/accounting.js';
import createRouter, { financialRows } from '../../backend/p0Features.js';
import { calculateSalesFinancials as sales, calculatePurchaseFinancials as purchase } from '../../backend/financialValidation.js';

assert.equal(globalThis.phase1Isolation, true, 'Run with --import ./backend/test/phase1-isolation.mjs');
const tenant = { distributorId: 'PHASE1', firmId: 'FAKE', sourceType: 'SALES', sourceId: 'fixture', createdBy: 'test', documentDate: '2026-04-01' };
const lines = value => [{ accountCode: 'PARTY', debit: value, credit: 0 }, { accountCode: 'SALES', debit: 0, credit: value }];
const req = { auth: tenant, query: {} };
function memory(t) {
  const entries = [];
  const matches = (entry, filter) => Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(part => matches(entry, part));
    if (value && typeof value === 'object' && '$ne' in value) return entry[key] !== value.$ne;
    if (key === 'documentDate' && typeof value === 'object') return (!value.$gte || entry[key] >= value.$gte) && (!value.$lte || entry[key] <= value.$lte);
    return entry[key] === value;
  });
  t.mock.method(Journal, 'findOne', filter => ({ sort() { return this; }, session() { return this; }, lean: async () => entries.filter(e => matches(e, filter)).at(-1), then(resolve, reject) { return Promise.resolve(entries.filter(e => matches(e, filter)).at(-1)).then(resolve, reject); } }));
  t.mock.method(Journal, 'create', async rows => rows.map(row => {
    const entry = { _id: String(entries.length + 1), status: 'POSTED', ...row, async save() { return this; } };
    entries.push(entry); return entry;
  }));
  t.mock.method(Journal, 'find', filter => ({ sort() { return this; }, lean: async () => entries.filter(e => matches(e, filter)) }));
  return entries;
}
async function balance() {
  return (await financialRows(req)).filter(r => r.accountCode === 'PARTY').reduce((sum, r) => sum + r.debit - r.credit, 0);
}
test('isolation blocks socket and Mongoose connection entry points', () => {
  assert.throws(() => new net.Socket().connect(27017, '127.0.0.1'), /PHASE1_ISOLATION/);
  assert.throws(() => mongoose.connect('mongodb://127.0.0.1/phase1'), /PHASE1_ISOLATION/);
  assert.throws(() => mongoose.createConnection('mongodb://127.0.0.1/phase1'), /PHASE1_ISOLATION/);
  assert.equal(mongoose.connection.readyState, 0);
});
test('baseline: balanced sale posts 100 and nonfinite/unbalanced totals reject', async t => {
  memory(t);
  await postBalancedJournal({ ...tenant, lines: lines(100) });
  assert.equal(await balance(), 100);
  await assert.rejects(postBalancedJournal({ ...tenant, lines: [{ debit: Infinity }, { credit: 100 }] }));
  await assert.rejects(postBalancedJournal({ ...tenant, lines: [{ debit: 100 }, { credit: 90 }] }));
});
test('characterization: cancellation currently leaves credit 100 in POSTED-only reports', async t => {
  const entries = memory(t);
  await postBalancedJournal({ ...tenant, lines: lines(100) });
  await reverseSourceJournal(tenant);
  assert.deepEqual(entries.map(e => e.status), ['REVERSED', 'POSTED']);
  assert.equal(await balance(), -100);
});
test('correctness: cancellation must leave zero party balance', async t => {
  memory(t); await postBalancedJournal({ ...tenant, lines: lines(100) }); await reverseSourceJournal(tenant);
  assert.equal(await balance(), 0);
});
test('correctness: edit 100 to 120 must report 120', async t => {
  memory(t); await postBalancedJournal({ ...tenant, lines: lines(100) }); await reverseSourceJournal(tenant);
  await postBalancedJournal({ ...tenant, lines: lines(120) }); assert.equal(await balance(), 120);
});
test('correctness: repeated edit to 140 must report 140', async t => {
  memory(t);
  for (const value of [100, 120, 140]) {
    if (value !== 100) await reverseSourceJournal(tenant);
    await postBalancedJournal({ ...tenant, lines: lines(value) });
  }
  assert.equal(await balance(), 140);
});
test('characterization: free quantity is charged and combined discounts/excess credit are clamped', () => {
  assert.equal(sales({}, [{ qty: 10, free: 2, rate: 100 }]).GrossAmount, 1200);
  assert.equal(sales({}, [{ qty: 1, rate: 100, schemeAmt: 80, starAmt: 80, gst: 18 }]).NetAmount, 18);
  assert.equal(sales({ CreditNoteAmount: 150 }, [{ qty: 1, rate: 100 }]).NetAmount, 0);
});
test('policy candidate: uncharged free units must not increase billed gross', () => {
  assert.equal(sales({}, [{ qty: 10, free: 2, rate: 100 }]).GrossAmount, 1000);
});
test('correctness: reject combined discounts above gross', () => {
  assert.throws(() => sales({}, [{ qty: 1, rate: 100, schemeAmt: 80, starAmt: 80, gst: 18 }]));
});
test('policy candidate: reject excess credit when no explicit advance result exists', () => {
  assert.throws(() => sales({ CreditNoteAmount: 150 }, [{ qty: 1, rate: 100 }]));
});
test('baseline: purchase excludes free quantity from gross; sales tax splits reconcile', () => {
  assert.equal(purchase({}, [{ qty: 10, free: 2, purRate: 100 }]).grossAmount, 1000);
  const local = sales({}, [{ qty: 1, rate: 100, gst: 18 }]);
  assert.equal(local.CGSTAmount + local.SGSTAmount, 18);
  assert.equal(sales({ isIgst: 'Y' }, [{ qty: 1, rate: 100, gst: 18 }]).IGSTAmount, 18);
  assert.throws(() => sales({}, [{ qty: -1, rate: 100 }]));
});
for (const [label, invalid] of [
  ['negative side', [{ accountCode: 'PARTY', debit: -10 }, { accountCode: 'PARTY', debit: 110 }, { accountCode: 'SALES', credit: 100 }]],
  ['both sides', [{ accountCode: 'PARTY', debit: 100, credit: 20 }, { accountCode: 'SALES', credit: 80 }]],
  ['sub-cent imbalance', [{ accountCode: 'PARTY', debit: 100 }, { accountCode: 'SALES', credit: 99.995 }]],
]) test(`correctness: common posting rejects ${label}`, async t => {
  memory(t); await assert.rejects(postBalancedJournal({ ...tenant, lines: invalid }));
});
async function report(t, name, fixture, query = {}) {
  t.mock.method(Journal, 'find', filter => ({ sort() { return this; }, lean: async () => fixture.filter(e => !filter.documentDate?.$gte || e.documentDate >= filter.documentDate.$gte) }));
  const router = createRouter({ authorizeRequest: () => (_req, _res, next) => next() });
  const layer = router.stack.find(l => l.route?.path === '/reports/financial/:report');
  let result;
  await layer.route.stack.at(-1).handle({ ...req, params: { report: name }, query }, { json(value) { result = value; } });
  return result;
}
test('correctness: numeric bank account remains visible in bank book', async t => {
  const result = await report(t, 'bank-book', [{ documentDate: '2026-04-01', lines: [{ accountCode: '100201', debit: 100 }] }]);
  assert.equal(result.rows.length, 1, 'Fixture account 100201 represents a bank; current route has no chart join');
});
test('correctness: GST control account excluded from profit and loss', async t => {
  const result = await report(t, 'profit-loss', [{ documentDate: '2026-04-01', lines: [{ accountCode: 'OUTPUT_GST', credit: 18 }] }]);
  assert.equal(result.rows.length, 0);
});
test('correctness: as-of trial balance includes prior activity despite period start', async t => {
  const result = await report(t, 'trial-balance', [{ documentDate: '2026-03-01', lines: [{ accountCode: 'PARTY', debit: 100 }] }], { fromDate: '2026-04-01', toDate: '2026-04-30' });
  assert.equal(result.summary.debit, 100);
});
