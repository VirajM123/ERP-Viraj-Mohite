import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../../src/Dashboard.jsx", import.meta.url), "utf8");
const start = source.indexOf("  const navigateTransaction = (item, openNew = false) => {");
const end = source.indexOf("  const getProductSelectionLabel =", start);
assert.ok(start >= 0 && end > start);

function navigate(openNew) {
  const state = { transactionFormMode: { Receipt: true }, showReceiptForm: true };
  const setter = (key) => (value) => {
    state[key] = typeof value === "function" ? value(state[key]) : value;
  };
  const context = {
    setTransactionWorkspaceOpened: setter("opened"),
    setSidebarCollapsed: setter("sidebar"), setExpandedNavMenu: setter("expanded"),
    setShowDashboard: setter("dashboard"), setActiveMenu: setter("menu"),
    setActiveSubMenu: setter("submenu"), setOpenFormFor: setter("form"),
    setActiveTransactionMenu: setter("transaction"),
    setTransactionFormMode: setter("transactionFormMode"),
    setShowReceiptForm: setter("showReceiptForm"),
    setTransactionEntryRequest: setter("request"),
  };
  vm.runInNewContext(`${source.slice(start, end)}\nnavigateTransaction("Receipt", ${openNew});`, context);
  return state;
}

test("returning to a transaction keeps its unfinished form open", () => {
  const state = navigate(false);
  assert.equal(state.opened, true);
  assert.equal(state.transactionFormMode.Receipt, true);
  assert.equal(state.showReceiptForm, true);
  assert.equal(state.request, null);
});

test("explicitly creating a transaction starts a new entry", () => {
  const state = navigate(true);
  assert.equal(state.transactionFormMode.Receipt, false);
  assert.equal(state.showReceiptForm, false);
  assert.equal(state.request.menu, "Receipt");
});
