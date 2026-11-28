import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const transaction = fs.readFileSync(new URL('../../src/Transaction.jsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('PDC bank lookup returns only active banks in the authenticated firm', async () => {
  const start = server.indexOf('app.get("/api/pdc-docket/bank-accounts"');
  const end = server.indexOf('app.get("/api/receipt/lookups"', start);
  assert.ok(start >= 0 && end > start);
  let handler, scope, permissions;
  const banks = [{ _id: 'B1', accountCode: 'BNK', accountName: 'My Bank', accountGroup: 'BANK ACCOUNTS' }];
  vm.runInNewContext(server.slice(start, end), {
    app: { get: (...args) => { handler = args.at(-1); } }, ensureConnection() {},
    authorizeReadFor: (...args) => { permissions = args; return () => {}; },
    OtherAccount: { find: (query) => { scope = query; return { select() { return this; }, sort() { return this; }, lean: async () => banks }; } }, console,
  });
  const res = { set() {}, json(value) { this.body = value; return this; }, status(code) { this.code = code; return this; } };
  await handler({ auth: { distributorId: 'D', firmId: 'F' }, query: { distributorId: 'OTHER', firmId: 'OTHER' } }, res);
  assert.equal(scope.distributorId, 'D'); assert.equal(scope.firmId, 'F');
  assert.equal(scope.isActive.$ne, false);
  assert.equal(scope.accountGroup.test(' BANK   ACCOUNTS '), true);
  assert.equal(scope.accountGroup.test('CASH'), false);
  assert.equal(res.body.banks[0].accountName, 'My Bank');
  assert.deepEqual(Array.from(permissions, (p) => Array.from(p)), [
    ['TRANSACTIONS', 'PDC_DOCKET', 'view'], ['TRANSACTIONS', 'PDC_DOCKET', 'add'], ['TRANSACTIONS', 'PDC_DOCKET', 'edit'],
  ]);
});

test('opening the PDC form loads banks and selecting one updates the existing docket fields', async () => {
  const effectStart = transaction.indexOf('  useEffect(() => {\n    if (activeTransaction !== "PDC Docket"');
  const effectEnd = transaction.indexOf('  // =========================', effectStart);
  const inputStart = transaction.indexOf('  const handlePDCDocketInput =');
  const inputEnd = transaction.indexOf('  const savePDCDocket =', inputStart);
  assert.ok(effectStart >= 0 && effectEnd > effectStart && inputStart >= 0 && inputEnd > inputStart);
  let effect, banks = [], status = '', resultForm, loadedForm, requestedUrl;
  const context = {
    useEffect: (fn) => { effect = fn; }, activeTransaction: 'PDC Docket', transactionFormMode: { 'PDC Docket': true },
    AbortController, API_URL: '/api', console,
    setPDCDocketBanks: (value) => { banks = value; }, setPDCDocketBanksStatus: (value) => { status = value; },
    secureFetch: async (url) => { requestedUrl = url; return { ok: true, json: async () => ({ success: true, banks: [{ _id: 'B1', accountName: 'My Bank' }] }) }; },
  };
  vm.runInNewContext(transaction.slice(effectStart, effectEnd), context);
  const cleanup = effect();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requestedUrl, '/api/pdc-docket/bank-accounts');
  assert.equal(status, 'ready'); assert.equal(banks[0].accountName, 'My Bank');
  Object.assign(context, {
    pdcDocketBanks: banks, pdcDocketFormData: { fromDate: '2026-11-01' }, getBankAccountName: (account) => account.accountName || '',
    setPDCDocketFormData: (value) => { resultForm = value; }, loadPDCDocketGrid: (value) => { loadedForm = value; },
  });
  vm.runInNewContext(`${transaction.slice(inputStart, inputEnd)}\nhandlePDCDocketInput({ target: { name: 'houseBank', value: 'My Bank' } });`, context);
  assert.equal(resultForm.houseBank, 'My Bank'); assert.equal(resultForm.houseBankId, 'B1');
  assert.equal(loadedForm.houseBank, 'My Bank');
  cleanup();
});
