import test from 'node:test';
import assert from 'node:assert/strict';
import { Journal } from '../accounting.js';
import { financialRows } from '../p0Features.js';

const entry = (date, source, debit, credit = 0) => ({ documentDate: date, sourceType: source, lines: [{ accountCode: 'A1', debit, credit }] });
test('ledger carries prior invoices less receipts and opening-date openings without double counting', async t => {
  let filter;
  t.mock.method(Journal, 'find', value => { filter = value; return { sort() { return this; }, lean: async () => [
    entry('2026-03-01', 'SALES', 1000), entry('2026-03-20', 'RECEIPT', 0, 400),
    entry('2026-04-01', 'OPENING_BALANCE', 200), entry('2026-04-01', 'SALES', 50), entry('2026-04-02', 'RECEIPT', 0, 100),
  ] }; });
  const rows = await financialRows({ auth: { distributorId: 'D1', firmId: 'F1' }, query: { fromDate: '2026-04-01', toDate: '2026-04-30' } }, true);
  assert.deepEqual(filter, { distributorId: 'D1', firmId: 'F1', status: 'POSTED', documentDate: { $lte: '2026-04-30' } });
  assert.equal(rows.length, 3);
  assert.equal(rows[0].narration, 'Opening Balance');
  assert.equal(rows[0].debit, 800);
  assert.equal(rows[1].source, 'SALES');
  assert.equal(rows.reduce((sum, row) => sum + row.debit - row.credit, 0), 750);
});
test('credit openings retain Cr side; other financial reports retain their date filter', async t => {
  let filter;
  t.mock.method(Journal, 'find', value => { filter = value; return { sort() { return this; }, lean: async () => [entry('2026-03-01', 'PURCHASE', 0, 600)] }; });
  const req = { auth: { distributorId: 'D1', firmId: 'F1' }, query: { fromDate: '2026-04-01', toDate: '2026-04-30' } };
  const rows = await financialRows(req, true);
  assert.equal(rows[0].credit, 600); assert.equal(rows[0].debit, 0);
  await financialRows(req);
  assert.deepEqual(filter.documentDate, { $gte: '2026-04-01', $lte: '2026-04-30' });
});
