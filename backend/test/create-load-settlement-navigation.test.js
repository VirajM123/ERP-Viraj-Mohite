import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../../src/Dashboard.jsx", import.meta.url), "utf8");
const start = source.indexOf("  const loadSettleLoadBySeriesNo = async");
const end = source.indexOf("  const getSettleStatusStyle =", start);
assert.ok(start >= 0 && end > start);

async function openLoad(response) {
  const state = { form: {}, alerts: [] };
  const set = (key) => (value) => { state[key] = typeof value === "function" ? value(state[key]) : value; };
  const context = {
    URLSearchParams, API_URL: "/api", businessDateIST: () => "2026-11-27",
    getFirmSession: () => ({ distributorId: "D", firmId: "F" }),
    secureFetch: async (url) => { state.url = url; return response; },
    setSettleLoadData: set("load"), setSettleLoadItems: set("items"),
    setOriginalSettleLoadItems: set("originalItems"), calculateSettleLoadSummary: set("summaryItems"),
    setSettleLoadFormData: set("form"), setEditingSettleLoadId: set("editingId"),
    setSettleLoadSaved: set("saved"), setSettleLoadOptions: set("options"),
    setActiveMenu: set("menu"), setActiveSubMenu: set("submenu"), setOpenFormFor: set("openForm"),
    setShowDashboard: set("dashboard"), setShowCreateLoadList: set("loadList"),
    setShowSettleLoadList: set("settleList"), setShowSettleLoad: set("settlement"),
    alert: (message) => state.alerts.push(message), console,
  };
  await vm.runInNewContext(`${source.slice(start, end)}\nopenSettlementFromLoadList({ loadSeries: "UE", loadNo: 5 });`, context);
  return state;
}

test("settle action fetches full bills for a list row and opens the settlement", async () => {
  const state = await openLoad({ ok: true, json: async () => ({ success: true, load: {
    loadSeries: "UE", loadNo: 5, loadDate: "2026-11-27", items: [
      { Series: "S", BillNo: 1, PartyName: "Shop", Amount: 100 },
      { Series: "S", BillNo: 2, PartyName: "Store", Amount: 250 },
    ],
  } }) });
  assert.match(state.url, /settle-load\?/);
  assert.match(state.url, /loadSeries=UE/);
  assert.match(state.url, /loadNo=5/);
  assert.equal(state.items.length, 2);
  assert.equal(state.items[0].billAmount, 100);
  assert.equal(state.items[1].billNo, 2);
  assert.equal(state.form.loadSeries, "UE");
  assert.equal(state.form.loadNo, "5");
  assert.equal(state.form.settleLoadDate, "2026-11-27");
  assert.equal(state.submenu, "Settle Load");
  assert.equal(state.loadList, false);
  assert.equal(state.settlement, true);
});

test("failed lookup and a genuinely empty load do not navigate", async () => {
  const failed = await openLoad({ ok: false, json: async () => ({ success: false, message: "Already settled" }) });
  assert.equal(failed.settlement, undefined);
  assert.equal(failed.alerts[0], "Already settled");
  const empty = await openLoad({ ok: true, json: async () => ({ success: true, load: { items: [] } }) });
  assert.equal(empty.settlement, undefined);
  assert.equal(empty.alerts[0], "No items found in this load to settle");
});
