import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../../src/Dashboard.jsx', import.meta.url), 'utf8');
const mapStart = source.indexOf('  const getCreateLoadBillKey =');
const mapEnd = source.indexOf('  const getSelectedSalesmanText =', mapStart);
const fetchStart = source.indexOf('  const loadCreateLoadBills = useCallback(');
const fetchEnd = source.indexOf('  useEffect(() => {', fetchStart);
assert.ok(mapStart >= 0 && mapEnd > mapStart && fetchStart >= 0 && fetchEnd > fetchStart);

test('editing a load displays only its saved bills even when the lookup also returns available bills', async () => {
  const state = {};
  const savedBills = [{ BillSeries: 'S', BillNo: 1, selected: true }];
  const form = { company: 'C', selectedSalesman: ['S1'], billFromDate: '2026-01-01', billToDate: '2026-12-31' };
  const context = {
    useCallback: (fn) => fn, createLoadBillsRequestRef: { current: 0 }, createLoadFormData: form,
    createLoadItems: [], editingCreateLoadId: 'load1', editingCreateLoadBills: savedBills,
    getFirmSession: () => ({ distributorId: 'D', firmId: 'F' }), URLSearchParams, API_URL: '/api',
    fetch: async () => ({ ok: true, json: async () => ({ success: true, bills: [
      { BillSeries: 'S', BillNo: 1, loadWeight: 180 }, { BillSeries: 'S', BillNo: 2, loadWeight: 20 },
    ] }) }),
    setCreateLoadItems: (items) => { state.items = items; }, alert: (message) => { throw new Error(message); }, console,
  };
  await vm.runInNewContext(`${source.slice(mapStart, mapEnd)}\n${source.slice(fetchStart, fetchEnd)}\nloadCreateLoadBills(false);`, context);
  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].billNo, '1');
  assert.equal(state.items[0].loadWeight, 180);
  assert.equal(state.items[0].selected, true);
});
