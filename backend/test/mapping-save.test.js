import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

function saveHandler(path, modelName, model) {
  const start = source.indexOf(`app.post("${path}",`);
  const end = source.indexOf('\n});', start) + 4;
  assert.ok(start >= 0 && end > start);
  let handler;
  vm.runInNewContext(source.slice(start, end), {
    app: { post(...args) { handler = args.at(-1); } },
    ensureConnection() {},
    securityRouter: { authorizeRequest() { return () => {}; } },
    authenticatedTenantScope: (req) => req.auth,
    [modelName]: model,
  });
  return handler;
}

function memoryModel() {
  const rows = [];
  return {
    rows,
    async bulkWrite(operations) {
      for (const { updateOne } of operations) {
        const filter = updateOne.filter;
        let row = rows.find((item) => Object.entries(filter).every(([key, value]) => item[key] === value));
        if (!row) { row = {}; rows.push(row); }
        Object.assign(row, updateOne.update.$set);
      }
    },
    async updateMany(filter, update) {
      const field = filter.accountCode ? 'accountCode' : 'areaCode';
      for (const row of rows) {
        if (row.distributorId === filter.distributorId && row.firmId === filter.firmId &&
            row.companyCode === filter.companyCode && filter[field].$in.includes(row[field]) && row.isActive !== false) {
          Object.assign(row, update.$set);
        }
      }
    },
  };
}

const call = async (handler, body, auth = { distributorId: 'D1', firmId: 'F1' }) => {
  const res = { status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
  await handler({ body, auth }, res);
  return res;
};

test('area to party saves, changes, clears and restores within the selected company', async () => {
  const model = memoryModel();
  const handler = saveHandler('/api/area-to-party-mappings', 'AreaToPartyMapping', model);
  const row = { accountCode: 'P1', accountName: 'Omkar', areaCode: 'A1', areaName: 'Karvenagar' };
  const body = { companyCode: 'C1', companyName: 'Company', mappings: [row] };
  assert.equal((await call(handler, body)).body.success, true);
  assert.equal(model.rows[0].areaCode, 'A1');
  await call(handler, { ...body, companyCode: 'C2' });
  await call(handler, { ...body, mappings: [{ ...row, areaCode: 'A2', areaName: 'Other' }] });
  assert.equal(model.rows[0].areaCode, 'A2');
  const cleared = await call(handler, { ...body, mappings: [], unmappedAccountCodes: ['P1'] });
  assert.equal(cleared.body.success, true);
  assert.equal(model.rows[0].isActive, false);
  assert.equal(model.rows[1].isActive, true);
  await call(handler, body);
  assert.equal(model.rows[0].isActive, true);
  assert.equal(model.rows[0].areaCode, 'A1');
});

test('salesman to area saves, replaces and clears within the selected company', async () => {
  const model = memoryModel();
  const handler = saveHandler('/api/salesman-area-mappings', 'SalesmanAreaMapping', model);
  const row = { areaCode: 'A1', areaName: 'Karvenagar', salesmanCode: 'S1', salesmanName: 'Viraj' };
  const body = { companyCode: 'C1', companyName: 'Company', mappings: [row] };
  assert.equal((await call(handler, body)).body.success, true);
  await call(handler, { ...body, companyCode: 'C2' });
  await call(handler, { ...body, mappings: [{ ...row, salesmanCode: 'S2', salesmanName: 'Other' }] });
  assert.equal(model.rows[0].salesmanCode, 'S2');
  assert.equal((await call(handler, { ...body, mappings: [], unmappedAreaCodes: ['A1'] })).body.success, true);
  assert.equal(model.rows[0].isActive, false);
  assert.equal(model.rows[1].isActive, true);
});
