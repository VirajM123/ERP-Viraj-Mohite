import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { findPurchaseSupplier, purchaseSupplierValue } from '../../src/utils/purchaseSupplier.js';
const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const dashboard = fs.readFileSync(new URL('../../src/Dashboard.jsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const supplierId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
for (const method of ['post', 'put']) {
  test('company ' + method + ' saves, clears and validates the default supplier within the firm', async () => {
    let handler, saved, filter, available = true;
    const start = server.indexOf('app.' + method + '(\n    "/api/companies' + (method === 'put' ? '/:id' : '') + '"');
    const end = server.indexOf('\n});', start) + 4;
    assert.ok(start >= 0);
    vm.runInNewContext(server.slice(start, end), {
      app: { [method](...args) { handler = args.at(-1); } }, ensureConnection() {},
      securityRouter: { authorizeRequest() { return () => {}; } },
      mongoose: { isValidObjectId: id => /^[a-f0-9]{24}$/.test(id) },
      OtherAccount: { async exists(value) { filter = value; return available; } },
      Company: { async create(value) { saved = value; return value; }, async findOneAndUpdate(scope, update) { saved = update.$set; return saved; } },
    });
    const scope = { distributorId: 'D1', firmId: 'F1' };
    const call = async body => {
      const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
      await handler({ body: { code: 'C1', name: 'Company', ...body }, security: scope, auth: scope, params: { id: 'company1' } }, res);
      return res;
    };
    assert.equal((await call({ defaultSupplierId: supplierId })).body.success, true);
    assert.equal(saved.defaultSupplierId, supplierId);
    assert.equal(filter.firmId, 'F1'); assert.equal(filter.distributorId, 'D1'); assert.equal(filter.accountGroup, 'SUNDRY CREDITORS');
    assert.equal((await call({ defaultSupplierId: '' })).body.success, true); assert.equal(saved.defaultSupplierId, '');
    available = false;
    assert.equal((await call({ defaultSupplierId: supplierId })).code, 400);
    assert.equal((await call({ defaultSupplierId: 'invalid' })).code, 400);
    assert.equal((await call({})).body.success, true);
    if (method === 'put') assert.equal(Object.hasOwn(saved, 'defaultSupplierId'), false);
  });
}
test('company selection applies the default while manual supplier changes and company series still work', () => {
  let form = { company: '', supplier: 'manual', vouSer: 'OLD', vouNo: '10', isIgst: 'Y' };
  const context = {
    companies: [{ code: 'C1', defaultSupplierId: supplierId }, { code: 'C2' }],
    otherAccounts: [{ _id: supplierId, accountGroup: 'SUNDRY CREDITORS', isActive: true }],
    findPurchaseSupplier, purchaseSupplierValue, regexInputValue: (_, value) => value,
    getConfiguredCompanySeries: () => ({ configured: true, value: 'PUR' }),
    setPurchaseFormData: update => { form = update(form); }, setTimeout() {},
  };
  const start = dashboard.indexOf('  const handlePurchaseInputChange =');
  const end = dashboard.indexOf('  const handlePurchaseKeyDown', start);
  vm.runInNewContext(dashboard.slice(start, end) + '\nthis.change = handlePurchaseInputChange;', context);
  context.change({ target: { name: 'company', value: 'C1' } });
  assert.equal(form.supplier, supplierId); assert.equal(form.vouSer, 'PUR'); assert.equal(form.vouNo, ''); assert.equal(form.isIgst, 'Y');
  context.change({ target: { name: 'supplier', value: 'manual' } }); assert.equal(form.supplier, 'manual');
  context.change({ target: { name: 'company', value: 'C2' } }); assert.equal(form.supplier, 'manual');
});
