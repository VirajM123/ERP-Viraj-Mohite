import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../../src/Dashboard.jsx", import.meta.url), "utf8");
const start = source.indexOf("  const openPrintLoadFromList =");
const end = source.indexOf("  const handlePrintLoadInputChange =", start);
assert.ok(start >= 0 && end > start);

test("Print Load opens for the selected list row and previews that load", async () => {
  const state = { data: { old: true }, items: ["old"], error: "old", preview: true };
  const set = (key) => (value) => { state[key] = typeof value === "function" ? value(state[key]) : value; };
  const context = {
    URLSearchParams, API_URL: "/api", console,
    localStorage: { getItem: (key) => key === "distributorId" ? "D" : "F" },
    businessDateIST: () => "2026-11-27",
    getSavedPrintLoadSettings: () => ({ reportLevel: "party_wise", withFreeQty: "yes", partyWiseSelectedColumns: ["partyName"] }),
    getActiveSelectedPrintLoadColumns: (form) => form.partyWiseSelectedColumns,
    fetch: async (url) => { state.url = url; return { ok: true, json: async () => ({ header: { loadDate: "2026-11-26" }, rows: [{ partyName: "Shop" }] }) }; },
    setPrintLoadFormData: set("form"), setPrintLoadData: set("data"), setPrintLoadItems: set("items"),
    setPrintLoadError: set("error"), setShowPrintPreview: set("preview"), setShowPrintLoadColumnModal: set("columns"),
    setPrintLoadDirectPrint: set("directPrint"), setActiveMenu: set("menu"), setActiveSubMenu: set("submenu"),
    setOpenFormFor: set("openForm"), setShowDashboard: set("dashboard"), setShowCreateLoadList: set("loadList"),
    setPrintLoadLoading: set("loading"), alert: (message) => { throw new Error(message); },
  };
  vm.runInNewContext(`${source.slice(start, end)}\nopenPrintLoadFromList({ loadSeries: "UE", loadNo: 5, loadDate: "2026-11-26" }); this.previewSelectedLoad = loadPrintLoadData;`, context);
  assert.equal(state.form.loadSeries, "UE");
  assert.equal(state.form.loadNo, "5");
  assert.equal(state.form.loadDate, "2026-11-26");
  assert.equal(state.form.reportLevel, "party_wise");
  assert.equal(state.items.length, 0);
  assert.equal(state.error, "");
  assert.equal(state.preview, false);
  assert.equal(state.submenu, "Print Load");
  assert.equal(state.openForm, "Print Load");
  assert.equal(state.loadList, false);
  assert.equal(await context.previewSelectedLoad(state.form, true), true);
  const params = new URL(state.url, "https://example.test").searchParams;
  assert.equal(params.get("loadSeries"), "UE");
  assert.equal(params.get("loadNo"), "5");
  assert.equal(params.get("reportLevel"), "party_wise");
  assert.equal(state.items[0].partyName, "Shop");
  assert.equal(state.preview, true);
});
