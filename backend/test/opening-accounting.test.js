import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Journal } from '../accounting.js';
import { AuditEvent } from '../audit.js';
import { OpeningTransaction, openingJournalLines, saveAccountWithOpenings, allocateOpening, releaseOpening, openingBillRows, lookupOpeningSource, openingTenant } from '../openingBalances.js';

const accountId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const row = (extra = {}) => ({ transactionType: 'OPB', transactionSeries: 'OLD', transactionNo: '101', date: '2026-03-01', originalAmount: 1000, balanceAmount: 600, balanceType: 'Dr', adjusted: 'N', appeared: 'M', ...extra });
const request = rows => ({ auth: { distributorId: 'D1', firmId: 'F1', userId: 'U1' }, headers: {}, body: { accountCode: 'A1', openingTransactions: rows }, query: {} });
const query = value => ({ session() { return this; }, sort() { return this; }, lean: async () => structuredClone(value), then: resolve => Promise.resolve(value).then(resolve) });

// Exercise the real posting service with deterministic persistence adapters.
// This verifies commit/rollback contracts without touching the user's database.
function harness(t) {
  let data = { rows: [], journals: [], audits: [], account: { _id: accountId, distributorId: 'D1', firmId: 'F1', accountCode: 'A1', accountName: 'Party One', openingDate: '2026-04-01', openingBal: 99, openingBalType: 'Dr' } };
  const matches = (item, filter) => Object.entries(filter).every(([key, value]) => key === '$expr' || (value && typeof value === 'object' && '$gte' in value ? item[key] >= value.$gte : item[key] === value));
  const session = { ended: false, async withTransaction(callback) { const before = structuredClone(data); try { await callback(); } catch (error) { data = before; throw error; } }, async endSession() { this.ended = true; } };
  t.mock.method(mongoose, 'startSession', async () => session);
  t.mock.method(OpeningTransaction, 'find', filter => query(data.rows.filter(item => matches(item, filter))));
  t.mock.method(OpeningTransaction, 'findOne', filter => query(data.rows.find(item => matches(item, filter)) || null));
  t.mock.method(OpeningTransaction, 'findOneAndUpdate', async (filter, update, options) => {
    assert.equal(options.session, session);
    let item = data.rows.find(item => matches(item, filter));
    if (!item) { item = { _id: new mongoose.Types.ObjectId().toString(), ...filter }; data.rows.push(item); }
    Object.assign(item, update.$set); return { ...item };
  });
  t.mock.method(OpeningTransaction, 'updateOne', async (filter, update, options) => {
    assert.equal(options.session, session);
    const item = data.rows.find(item => matches(item, filter));
    if (!item || (filter.$expr && item.balanceAmount - item.allocatedAmount < filter.$expr.$gte[1])) return { modifiedCount: 0 };
    Object.assign(item, update.$set || {});
    if (update.$inc) item.allocatedAmount = Math.round((item.allocatedAmount + update.$inc.allocatedAmount) * 100) / 100;
    return { modifiedCount: 1 };
  });
  t.mock.method(Journal, 'findOne', filter => query(data.journals.filter(item => matches(item, filter)).at(-1) || null));
  t.mock.method(Journal, 'updateMany', async (filter, update, options) => {
    assert.equal(options.session, session);
    data.journals.filter(item => matches(item, filter)).forEach(item => Object.assign(item, update.$set));
  });
  t.mock.method(Journal, 'create', async (entries, options) => {
    assert.equal(options.session, session);
    const created = entries.map(entry => ({ _id: new mongoose.Types.ObjectId().toString(), status: 'POSTED', ...entry }));
    data.journals.push(...created); return created;
  });
  t.mock.method(AuditEvent, 'create', async (entries, options) => { assert.equal(options.session, session); data.audits.push(...entries); return entries; });
  const save = async currentSession => {
    assert.equal(currentSession, session);
    return { ...data.account, async save(options) { assert.equal(options.session, session); const { save, ...account } = this; data.account = structuredClone(account); } };
  };
  return { get data() { return data; }, session, save };
}

test('opening journal posts remaining balance and balances against equity for Dr and Cr', () => {
  for (const balanceType of ['Dr', 'Cr']) {
    const lines = openingJournalLines(row({ balanceType }), 'A1');
    assert.equal(lines[0][balanceType === 'Dr' ? 'debit' : 'credit'], 600);
    assert.equal(lines[1].accountCode, 'OPENING_BALANCE_EQUITY');
    assert.equal(lines.reduce((sum, line) => sum + line.debit - line.credit, 0), 0);
    assert.ok(lines.every(line => !['SALES', 'PURCHASE', 'OUTPUT_GST'].includes(line.accountCode)));
  }
});

test('account save persists separate opening rows and balanced journals once, including repeat saves', async t => {
  const h = harness(t), req = request([row(), row({ transactionNo: '102', balanceAmount: 100, balanceType: 'Cr' })]);
  await saveAccountWithOpenings(req, h.save);
  assert.equal(h.data.rows.length, 2);
  assert.equal(h.data.journals.length, 2);
  assert.equal(h.data.account.openingBal, 500);
  assert.equal(h.data.account.openingBalType, 'Dr');
  assert.ok(h.data.journals.every(entry => entry.documentDate === '2026-04-01'));
  assert.equal(h.data.rows[0].date, '2026-03-01');
  await saveAccountWithOpenings(req, h.save);
  assert.equal(h.data.rows.length, 2);
  assert.equal(h.data.journals.length, 2);
  assert.equal(h.data.audits.length, 2);
  assert.equal(h.session.ended, true);
});

test('editing and clearing openings leaves only the corrected live journal', async t => {
  const h = harness(t);
  await saveAccountWithOpenings(request([row()]), h.save);
  await saveAccountWithOpenings(request([row({ balanceAmount: 300 })]), h.save);
  assert.equal(h.data.journals.filter(entry => entry.status === 'POSTED').length, 1);
  assert.equal(h.data.account.openingBal, 300);
  await saveAccountWithOpenings(request([]), h.save);
  assert.equal(h.data.journals.filter(entry => entry.status === 'POSTED').length, 0);
  assert.equal(h.data.rows[0].status, 'REVERSED');
  assert.equal(h.data.account.openingBal, 0);
});

test('duplicate references and dates after the opening date roll back the entire save', async t => {
  const h = harness(t);
  for (const rows of [[row(), row()], [row({ date: '2026-04-02' })]]) {
    await assert.rejects(saveAccountWithOpenings(request(rows), h.save));
    assert.equal(h.data.journals.length, 0); assert.equal(h.data.rows.length, 0); assert.equal(h.data.account.openingBal, 99);
  }
});

test('failure after journal writes rolls back both transaction and account', async t => {
  const h = harness(t);
  t.mock.method(AuditEvent, 'create', async () => { throw new Error('Audit write failed'); });
  await assert.rejects(saveAccountWithOpenings(request([row()]), h.save), /Audit write failed/);
  assert.equal(h.data.rows.length, 0); assert.equal(h.data.journals.length, 0); assert.equal(h.data.account.openingBal, 99);
});

test('opening receipts reduce outstanding, reject over-allocation and restore on reversal', async t => {
  const h = harness(t), req = request([row()]);
  await saveAccountWithOpenings(req, h.save);
  const id = h.data.rows[0]._id;
  await allocateOpening(req, id, 400, 'Dr', 'A1', h.session, '2026-04-02');
  assert.equal(openingBillRows(h.data.rows)[0].balance, 200);
  await assert.rejects(allocateOpening(req, id, 201, 'Dr', 'A1', h.session, '2026-04-02'), /exceeds/);
  await assert.rejects(allocateOpening(req, id, 1, 'Cr', 'A1', h.session, '2026-04-02'), /selected party/);
  await assert.rejects(allocateOpening(req, id, 1, 'Dr', 'WRONG', h.session, '2026-04-02'), /selected party/);
  await assert.rejects(allocateOpening(req, id, 1, 'Dr', 'A1', h.session, '2026-03-31'), /precede/);
  await releaseOpening(id, 400, h.session);
  assert.equal(openingBillRows(h.data.rows)[0].balance, 600);
});

test('allocated openings cannot be changed or deleted, but unrelated account saves work', async t => {
  const h = harness(t), req = request([row()]);
  await saveAccountWithOpenings(req, h.save);
  await allocateOpening(req, h.data.rows[0]._id, 50, 'Dr', 'A1', h.session, '2026-04-02');
  await assert.rejects(saveAccountWithOpenings(request([]), h.save), /allocated/);
  await assert.rejects(saveAccountWithOpenings(request([row({ balanceAmount: 500 })]), h.save), /allocations/);
  await saveAccountWithOpenings(req, h.save);
  assert.equal(h.data.rows[0].allocatedAmount, 50);
});

test('legacy account requests and empty unused details retain the old opening balance', async t => {
  let called = false;
  assert.equal(await saveAccountWithOpenings(request(undefined), async session => { called = true; assert.equal(session, null); return 'saved'; }), 'saved');
  assert.equal(called, true);
  const h = harness(t);
  await saveAccountWithOpenings(request([]), h.save);
  assert.equal(h.data.account.openingBal, 99);
  assert.equal(h.data.journals.length, 0);
});

test('lookup matches the exact firm, account, series and number and returns unpaid amounts', async t => {
  const Account = mongoose.models.Mas_Account || mongoose.model('Mas_Account', new mongoose.Schema({}));
  t.mock.method(Account, 'findOne', () => query({ _id: accountId, accountCode: 'A1', town: 'Pune' }));
  const seen = [];
  t.mock.method(mongoose.connection, 'collection', collection => ({
    find(filter) { seen.push({ collection, filter }); return { limit() { return this; }, async toArray() { return [{ _id: 'sale1', BillDate: '2026-04-05', NetAmount: 1000, receiptAllocated: 250, PartyCode: 'A1' }]; } }; },
    aggregate() { return { toArray: async () => [] }; },
  }));
  t.mock.method(Journal, 'findOne', () => query({ _id: 'journal1' }));
  const req = request([]), input = row({ transactionType: 'SAL', transactionSeries: 'S', transactionNo: '12' });
  const result = await lookupOpeningSource(req, input);
  assert.equal(result.balanceAmount, 750); assert.equal(result.originalAmount, 1000); assert.equal(result.mode, 'EXISTING'); assert.equal(result.hasJournal, true);
  assert.equal(seen[0].filter.distributorId, 'D1'); assert.equal(seen[0].filter.firmId, 'F1'); assert.equal(seen[0].filter.BillSeries, 'S');
  assert.deepEqual(seen[0].filter.BillNo, { $in: ['12', 12] }); assert.deepEqual(seen[0].filter.PartyCode, { $in: ['A1', accountId] });
  assert.deepEqual(openingTenant(req, { firmId: 'OTHER' }), { distributorId: 'D1', firmId: 'F1' });
});


test('matched prior-year bills save opening references and unpaid amounts without a duplicate journal', async t => {
  const h = harness(t);
  const Account = mongoose.models.Mas_Account || mongoose.model('Mas_Account', new mongoose.Schema({}));
  t.mock.method(Account, 'findOne', () => query({ _id: accountId, accountCode: 'A1' }));
  t.mock.method(mongoose.connection, 'collection', () => ({
    find() { return { limit() { return this; }, toArray: async () => [{ _id: 'sale1', BillDate: '2026-03-01', NetAmount: 1000, receiptAllocated: 400 }] }; },
    aggregate() { return { toArray: async () => [] }; },
  }));
  h.data.journals.push({ _id: 'journal1', distributorId: 'D1', firmId: 'F1', sourceType: 'SALES', sourceId: 'sale1', status: 'POSTED', reversalOf: null });
  const req = request([row({ transactionType: 'SAL', mode: 'EXISTING' })]);
  await saveAccountWithOpenings(req, h.save);
  await saveAccountWithOpenings(req, h.save);
  assert.equal(h.data.rows.length, 1);
  assert.equal(h.data.rows[0].mode, 'EXISTING');
  assert.equal(h.data.rows[0].balanceAmount, 600);
  assert.equal(h.data.journals.length, 1);
});
