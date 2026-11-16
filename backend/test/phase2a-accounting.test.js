import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import mongoose from 'mongoose';
import { Journal, postBalancedJournal, reverseSourceJournal } from '../accounting.js';
import createRouter, { financialRows } from '../p0Features.js';
import { calculateSalesFinancials as sales, calculatePurchaseFinancials as purchase } from '../financialValidation.js';

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
test('event ledger: cancellation retains original and opposite event', async t => {
  const entries = memory(t);
  await postBalancedJournal({ ...tenant, lines: lines(100) });
  await reverseSourceJournal(tenant);
  assert.deepEqual(entries.map(e => e.status), ['REVERSED', 'POSTED']);
  assert.equal(await balance(), 0);
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

test('edited cancellation retries have no additional effects', async t => {
 const entries = memory(t);
 for (const value of [100,120,140]) {
  if(value !== 100) await reverseSourceJournal(tenant);
  await postBalancedJournal({...tenant, lines:lines(value)});
  assert.equal(await balance(),value);
 }
 await reverseSourceJournal(tenant);
 assert.equal(await balance(),0);
 assert.equal(entries.length,6);
 assert.deepEqual(entries.filter(e=>e.reversalOf).map(e=>e.reversalOf),['1','3','5']);
 assert.equal(await reverseSourceJournal(tenant),null);
 assert.equal(entries.length,6);
 assert.equal(await balance(),0);
});
test('March posting and separate April cancellation', async t => {
 memory(t);
 await postBalancedJournal({...tenant,documentDate:'2026-03-15',lines:lines(100)});
 await reverseSourceJournal({...tenant,documentDate:'2026-04-10'});
 const net=async query=>(await financialRows({auth:tenant,query})).filter(r=>r.accountCode==='PARTY').reduce((s,r)=>s+r.debit-r.credit,0);
 assert.equal(await net({toDate:'2026-03-31'}),100);
 assert.equal(await net({fromDate:'2026-04-01',toDate:'2026-04-30'}),-100);
 assert.equal(await net({toDate:'2026-04-30'}),0);
});
test('tenant isolation and superseded legacy opening selection',async t=>{
 const entries=memory(t);
 await postBalancedJournal({...tenant,lines:lines(100)});
 await postBalancedJournal({...tenant,firmId:'OTHER',lines:lines(500)});
 entries.push({...tenant,status:'REVERSED',sourceType:'OPENING_BALANCE',lines:lines(600)});
 entries.push({...tenant,status:'POSTED',sourceType:'OPENING_BALANCE',lines:lines(200)});
 assert.equal(await balance(),300);
 await reverseSourceJournal(tenant);
 assert.equal(await balance(),200);
 assert.equal(entries.find(e=>e.firmId==='OTHER').status,'POSTED');
});

test('reversal rejects invalid dates and dates preceding the event without writes',async t=>{
 const entries=memory(t);
 await postBalancedJournal({...tenant,lines:lines(100)});
 for(const documentDate of ['2026-03-31','2026-02-30']) {
  await assert.rejects(reverseSourceJournal({...tenant,documentDate}));
  assert.equal(entries.length,1);
  assert.equal(entries[0].status,'POSTED');
 }
});
test('opening-linked voucher reversal remains a pair of financial events',async t=>{
 const {reverseOpeningAwareJournal}=await import('../openingBalances.js');
 const entries=memory(t);
 await postBalancedJournal({...tenant,sourceType:'RECEIPT',lines:lines(100)});
 await reverseOpeningAwareJournal({...tenant,sourceType:'RECEIPT'},[{openingTransactionId:'opening-fixture'}]);
 assert.deepEqual(entries.map(e=>e.status),['REVERSED','REVERSED']);
 assert.equal(await balance(),0);
 assert.equal(await reverseOpeningAwareJournal({...tenant,sourceType:'RECEIPT'},[{openingTransactionId:'opening-fixture'}]),null);
 assert.equal(entries.length,2);
});
