import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const dashboard = fs.readFileSync(new URL('../../src/Dashboard.jsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('next-number endpoint is registered before the dynamic load-detail route', async () => {
  const start = server.indexOf('app.get("/api/create-load/next-no"');
  const end = server.indexOf('const buildCreateLoadBillCondition', start);
  assert.ok(start >= 0 && end > start);
  const routes = [];
  let query;
  vm.runInNewContext(server.slice(start, end), {
    app: { get: (...args) => routes.push({ path: args[0], handler: args.at(-1) }) },
    ensureConnection() {}, authorizeReadFor: () => () => {},
    LoadHeader: { findOne: (filter) => { query = filter; return { select() { return this; }, sort() { return this; }, lean: async () => ({ LoadNo: 27 }) }; } },
    mongoose: { Types: { ObjectId: { isValid: () => false } } }, console,
  });
  const match = routes.find((route) => route.path === '/api/create-load/next-no' || route.path === '/api/create-load/:id');
  assert.equal(match.path, '/api/create-load/next-no');
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await match.handler({ query: { distributorId: 'D', firmId: 'F', loadSeries: 'UE' } }, res);
  assert.equal(res.body.nextLoadNo, 28);
  assert.equal(query.LoadSeries, 'UE'); assert.equal(query.DistributorId, 'D'); assert.equal(query.FirmId, 'F');
});

test('typing a series ignores late responses and does not overwrite a manually entered number', async () => {
  const start = dashboard.indexOf('  const handleCreateLoadInputChange = async');
  const end = dashboard.indexOf('  // =========================================================\n  // COMPACT MASTER FORM', start);
  assert.ok(start >= 0 && end > start);
  let form = { loadSeries: '', loadNo: '' };
  const pending = new Map();
  const context = {
    createLoadNumberRequestRef: { current: 0 },
    regexInputValue: (_, value) => value,
    setCreateLoadFormData: (update) => { form = update(form); },
    getNextCreateLoadNo: (series) => new Promise((resolve) => pending.set(series, resolve)),
    console,
  };
  vm.runInNewContext(`${dashboard.slice(start, end)}\nthis.change = handleCreateLoadInputChange;`, context);
  const first = context.change({ target: { name: 'loadSeries', value: 'U' } });
  const second = context.change({ target: { name: 'loadSeries', value: 'UE' } });
  assert.equal(form.loadSeries, 'UE'); assert.equal(form.loadNo, '');
  pending.get('UE')('28'); await second;
  pending.get('U')('2'); await first;
  assert.equal(form.loadSeries, 'UE'); assert.equal(form.loadNo, '28');
  const third = context.change({ target: { name: 'loadSeries', value: 'X' } });
  await context.change({ target: { name: 'loadNo', value: '42' } });
  pending.get('X')('10'); await third;
  assert.equal(form.loadSeries, 'X'); assert.equal(form.loadNo, '42');
});
