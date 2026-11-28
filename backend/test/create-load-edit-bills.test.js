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

test('opening a summary-only list row fetches and displays all saved bills', async () => {
  const start = source.indexOf('    const handleEditLoad = async (item) => {');
  const end = source.indexOf('    const handleDeleteLoad =', start);
  assert.ok(start >= 0 && end > start);
  const saved = Array.from({ length: 28 }, (_, index) => ({ BillSeries: 'UE', BillNo: index + 1, PartyName: `Party ${index + 1}`, Amount: 100 }));
  const state = { alerts: [], calls: [] };
  const set = (key) => (value) => { state[key] = value; };
  const context = {
    API_URL: '/api', console, businessDateIST: () => '2026-11-28', getCurrentYearAprilFirst: () => '2026-04-01',
    secureFetch: async (url) => { state.calls.push(url); return { ok: true, json: async () => ({ success: true, load: {
      _id: 'load-1', LoadSeries: 'UE', LoadNo: 7, CompanyName: 'Company', SelectedSalesmen: [{ salesmanCode: 'S1' }], Bills: saved,
    } }) }; },
    setEditingCreateLoadId: set('editingId'), setEditingCreateLoadBills: set('savedBills'),
    setCreateLoadFormData: set('form'), setCreateLoadItems: set('items'), setSelectedCreateLoadAreas: set('areas'),
    setCreateLoadBillSearch: set('search'), setShowCreateLoadList: set('list'), setShowSettleLoad: () => {},
    setShowSettleLoadList: () => {}, setActiveMenu: () => {}, setActiveSubMenu: () => {},
    setOpenFormFor: set('openForm'), setShowDashboard: () => {}, alert: (message) => state.alerts.push(message),
  };
  await vm.runInNewContext(`${source.slice(mapStart, mapEnd)}\n${source.slice(start, end)}\nhandleEditLoad({ _id: 'load-1', TotalBills: 28, items: [] });`, context);
  assert.equal(state.calls[0], '/api/create-load/load-1');
  assert.equal(state.items.length, 28);
  assert.equal(state.items[0].billNo, '1');
  assert.equal(state.items[0].partyName, 'Party 1');
  assert.ok(state.items.every((bill) => bill.selected));
  assert.equal(state.openForm, 'Create Load');
  assert.equal(state.alerts.length, 0);
  assert.equal(state.areas.length, 0);
  assert.equal(state.search, '');
});

test('editing retains saved bills when lookup filters are incomplete', () => {
  const start = source.indexOf('  useEffect(() => {', fetchEnd);
  const end = source.indexOf('  useEffect(() => {', start + 1);
  let effect, cleared = false;
  const context = {
    useEffect: (fn) => { effect = fn; }, openFormFor: 'Create Load', editingCreateLoadId: 'load-1',
    createLoadFormData: { company: '', selectedSalesman: [], billFromDate: '', billToDate: '' },
    setCreateLoadItems: () => { cleared = true; }, window: {},
  };
  vm.runInNewContext(source.slice(start, end), context);
  effect();
  assert.equal(cleared, false);
});
