import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const start = source.indexOf('app.get("/api/sales/last-product-rate"');
const end = source.indexOf('app.get("/api/sales/bill"', start);
assert.ok(start >= 0 && end > start);

test('last product rate is scoped to the customer, firm and prior invoice date', async () => {
  let handler, filter, sort, bill = { items: [{ productCode: 'P1', rate: 25 }, { productCode: 'P2', rate: 90 }] };
  function ObjectId(id) { this.id = id; }
  ObjectId.isValid = (id) => id === 'current';
  vm.runInNewContext(source.slice(start, end), {
    app: { get: (...args) => { handler = args.at(-1); } }, ensureConnection() {}, authorizeReadFor: () => () => {},
    mongoose: { Types: { ObjectId } },
    SalesHeader: { findOne: (query) => { filter = query; return { select() { return this; }, sort(value) { sort = value; return this; }, lean: async () => bill }; } }, console,
  });
  const response = () => ({ status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  const req = { auth: { distributorId: 'D', firmId: 'F' }, query: { partyCode: 'C1', productCode: 'P1', billDate: '2026-11-28', excludeBillId: 'current' } };
  const res = response();
  await handler(req, res);
  assert.equal(res.body.rate, 25);
  assert.equal(filter.distributorId, 'D'); assert.equal(filter.firmId, 'F'); assert.equal(filter.PartyCode, 'C1');
  assert.equal(filter.BillDate.$lte, '2026-11-28'); assert.equal(filter._id.$ne.id, 'current');
  assert.equal(sort.BillDate, -1);
  bill = null;
  const noHistory = response(); await handler(req, noHistory);
  assert.equal(noHistory.body.rate, null);
  const invalid = response(); await handler({ ...req, query: { ...req.query, excludeBillId: 'bad' } }, invalid);
  assert.equal(invalid.code, 400);
});
