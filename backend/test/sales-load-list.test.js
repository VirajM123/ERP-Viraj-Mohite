import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const start = source.indexOf('app.get(\n  "/api/sales/list"');
const end = source.indexOf("//Quotation backend", start);
assert.ok(start >= 0 && end > start);

function matches(doc, filter) {
  return Object.entries(filter).every(([key, rule]) => {
    if (key === "$and") return rule.every((item) => matches(doc, item));
    if (key === "$or") return rule.some((item) => matches(doc, item));
    const value = doc[key];
    if (Object.prototype.toString.call(rule) === "[object RegExp]") return rule.test(String(value || ""));
    if (rule && typeof rule === "object") return Object.entries(rule).every(([op, expected]) => {
      if (op === "$ne") return value !== expected;
      if (op === "$not") return !expected.test(String(value || ""));
      if (op === "$exists") return (value !== undefined) === expected;
      if (op === "$nin") return !expected.includes(value);
      throw new Error(`Unexpected operator ${op}`);
    });
    return rule === null ? value == null : value === rule;
  });
}

test("sales list filters every page and reports status counts for the filtered firm", async () => {
  const { salesLoadStatusCondition } = await import("../../shared/salesLoadStatus.js");
  const base = { distributorId: "D", firmId: "F", isActive: true, BillStatus: "ACTIVE" };
  const bills = [
    ...Array.from({ length: 23 }, (_, i) => ({ ...base, BillNo: i + 1, IsLoaded: false, LoadNo: null })),
    ...Array.from({ length: 4 }, (_, i) => ({ ...base, BillNo: i + 30, IsLoaded: true, LoadNo: 4 })),
    { ...base, BillNo: 50, isActive: false, IsBillCancelled: true, BillStatus: "CANCELLED" },
    { ...base, BillNo: 51, firmId: "OTHER", IsLoaded: false },
  ];
  let handler;
  const SalesHeader = {
    countDocuments: async (filter) => bills.filter((bill) => matches(bill, filter)).length,
    find(filter) {
      let skip = 0, limit = 0;
      return { select() { return this; }, sort() { return this; }, skip(n) { skip = n; return this; }, limit(n) { limit = n; return this; }, async lean() { return bills.filter((bill) => matches(bill, filter)).slice(skip, skip + limit); } };
    },
  };
  vm.runInNewContext(source.slice(start, end), { app: { get: (...args) => { handler = args.at(-1); } }, ensureConnection: () => {}, securityRouter: { authorizeRequest: () => () => {} }, SalesHeader, salesLoadStatusCondition, console });
  async function request(loadStatus, page = 1) {
    let result;
    const res = { status() { return this; }, json(data) { result = data; return data; } };
    await handler({ query: { distributorId: "D", firmId: "F", page: String(page), limit: "10", includeLoadCounts: "1", loadStatus }, auth: { role: "ADMIN" } }, res);
    return result;
  }
  const pending = await request("not_loaded", 3);
  assert.equal(pending.pagination.totalRecords, 23);
  assert.equal(pending.sales.length, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(pending.loadCounts)), { notLoaded: 23, loaded: 4, cancelled: 1 });
  const loaded = await request("loaded");
  assert.equal(loaded.pagination.totalRecords, 4);
  const cancelled = await request("cancelled");
  assert.equal(cancelled.pagination.totalRecords, 1);
  assert.equal(cancelled.sales[0].BillNo, 50);
  const all = await request("");
  assert.equal(all.pagination.totalRecords, 27);
});
