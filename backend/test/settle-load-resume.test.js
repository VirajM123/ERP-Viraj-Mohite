import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../../src/Dashboard.jsx", import.meta.url), "utf8");
const start = source.indexOf("  const handleSubMenuClick = async (item) => {");
const end = source.indexOf("  // Replace the handlePlusClick", start);
assert.ok(start >= 0 && end > start);
const handler = source.slice(start, end);

async function navigate(item, initial = {}) {
  const state = { ...initial, listLoads: 0, draftSaves: 0 };
  const context = new Proxy({
    ...state,
    unfinishedSettleLoad: { current: initial.unfinished ?? false },
    refreshPermissions: async () => {},
    saveInvoiceDraft: () => { state.draftSaves++; },
    loadSettleLoadList: async () => { state.listLoads++; },
  }, {
    has: () => true,
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === "string" && key.startsWith("set")) {
        return (value) => { state[key.slice(3)] = value; };
      }
      return undefined;
    },
  });
  await vm.runInNewContext(`${handler}\nhandleSubMenuClick(${JSON.stringify(item)})`, context);
  return state;
}

test("returning to Settle Load restores an unfinished settlement", async () => {
  const result = await navigate("Settle Load", { unfinished: true, isSettleAdjustMode: false });
  assert.equal(result.ShowSettleLoad, true);
  assert.equal(result.ShowSettleLoadList, false);
  assert.equal(result.ActiveSubMenu, "Settle Load");
  assert.equal(result.listLoads, 0);
});

test("a bill adjustment survives a trip through General Setup", async () => {
  const setup = await navigate("General Setup", { openFormFor: "Billing", isSettleAdjustMode: true });
  assert.equal(setup.draftSaves, 0);
  const result = await navigate("Settle Load", {
    unfinished: true, isSettleAdjustMode: true, editingInvoiceId: "invoice-1",
  });
  assert.equal(result.ShowSettleLoad, true);
  assert.equal(result.ActiveSubMenu, "Billing");
  assert.equal(result.OpenFormFor, "Billing");
  assert.equal(result.listLoads, 0);
});

test("with no unfinished settlement the menu opens the saved list", async () => {
  const result = await navigate("Settle Load", { unfinished: false });
  assert.equal(result.ShowSettleLoad, false);
  assert.equal(result.ShowSettleLoadList, true);
  assert.equal(result.listLoads, 1);
});
