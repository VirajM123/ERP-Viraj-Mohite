import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../../src/Dashboard.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const start = source.indexOf("  const saveCreateLoad = async () => {");
const end = source.indexOf("  const loadCreateLoads =", start);
assert.ok(start >= 0 && end > start);

function fixture({ editing = false, items = [{ selected: true, billNo: 1, amount: 100 }] } = {}) {
  const state = { loader: [], alerts: [], requests: [] };
  let resolveRequest, rejectRequest;
  const pending = new Promise((resolve, reject) => { resolveRequest = resolve; rejectRequest = reject; });
  const noop = () => {};
  const context = {
    localStorage: { getItem: () => "D" },
    createLoadFormData: { loadSeries: "L", loadNo: 1, loadDate: "2026-11-27", company: "C" },
    createLoadItems: items, companies: [{ companyCode: "C", companyName: "Company" }], salesmen: [], selectedCreateLoadAreas: [],
    selectedCreateLoadSummary: {}, createLoadRemarks: "", loggedUserName: "User", editingCreateLoadId: editing ? "id1" : null,
    API_URL: "/api", createLoadCurrentPage: 1, loadListRowsPerPage: 10, loadAppliedFilters: {}, createLoadSearchDebounced: "",
    createLoadSaveInFlight: { current: false }, flushSync: (fn) => fn(), setIsSavingCreateLoad: (v) => state.loader.push(v),
    secureFetch: (url, options) => { state.requests.push({ url, options }); return pending; },
    alert: (message) => state.alerts.push(message), console,
    loadCreateLoads: async () => {}, setCreateLoadCurrentPage: noop, setEditingCreateLoadId: noop, setEditingCreateLoadBills: noop,
    setCreateLoadItems: noop, setSelectedCreateLoadAreas: noop, setCreateLoadBillSearch: noop, setCreateLoadRemarks: noop,
    setOpenFormFor: noop, setShowCreateLoadList: noop,
  };
  vm.runInNewContext(`${source.slice(start, end)}\nthis.save = saveCreateLoad;`, context);
  return { state, context, resolveRequest, rejectRequest };
}

test("loader follows the save request and prevents duplicate submissions without an artificial delay", async () => {
  const { state, context, resolveRequest } = fixture();
  const first = context.save();
  await context.save();
  assert.equal(state.requests.length, 1);
  assert.equal(state.requests[0].options.method, "POST");
  assert.deepEqual(state.loader, [true]);
  resolveRequest({ ok: true, json: async () => ({ success: true }) });
  await first;
  assert.deepEqual(state.loader, [true, false]);
  assert.match(state.alerts[0], /created successfully/i);
  assert.equal(context.createLoadSaveInFlight.current, false);
});

test("failed requests hide the loader and permit retry", async () => {
  const { state, context, rejectRequest } = fixture({ editing: true });
  const first = context.save();
  assert.equal(state.requests[0].options.method, "PUT");
  rejectRequest(new Error("offline"));
  await first;
  assert.deepEqual(state.loader, [true, false]);
  assert.match(state.alerts[0], /not saved/i);
  assert.equal(context.createLoadSaveInFlight.current, false);
});

test("invalid form does not show a saving animation or send a request", async () => {
  const { state, context } = fixture({ items: [] });
  await context.save();
  assert.equal(state.requests.length, 0);
  assert.deepEqual(state.loader, []);
  assert.match(state.alerts[0], /at least one bill/i);
});
