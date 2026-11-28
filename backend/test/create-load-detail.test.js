import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('app.get(\n  "/api/create-load/:id",');
const end = source.indexOf('const buildCreateLoadBillCondition', start);
assert.ok(start >= 0 && end > start);

test('load detail fetches only the selected load in the authenticated firm', async () => {
  let handler, filter;
  const load = { _id: 'load-1', Bills: [{ BillNo: 1 }, { BillNo: 2 }] };
  vm.runInNewContext(source.slice(start, end), {
    app: { get: (...args) => { handler = args.at(-1); } }, ensureConnection: () => {}, authorizeReadFor: () => () => {},
    mongoose: { Types: { ObjectId: { isValid: (id) => id === 'load-1' } } },
    LoadHeader: { findOne: (query) => { filter = query; return { lean: async () => load }; } }, console,
  });
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ params: { id: 'load-1' }, auth: { distributorId: 'D', firmId: 'F' } }, res);
  assert.equal(filter._id, 'load-1');
  assert.equal(filter.DistributorId, 'D');
  assert.equal(filter.FirmId, 'F');
  assert.equal(res.body.load.Bills.length, 2);
  await handler({ params: { id: 'invalid' }, auth: { distributorId: 'D', firmId: 'F' } }, res);
  assert.equal(res.code, 400);
});
