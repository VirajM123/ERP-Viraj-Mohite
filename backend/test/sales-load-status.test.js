import test from "node:test";
import assert from "node:assert/strict";
import { salesLoadStatus, salesLoadStatusCondition } from "../../shared/salesLoadStatus.js";

function matches(document, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$or") return condition.some((part) => matches(document, part));
    const value = document[key];
    if (condition instanceof RegExp) return condition.test(String(value || ""));
    if (condition && typeof condition === "object") return Object.entries(condition).every(([op, expected]) => {
      if (op === "$ne") return value !== expected;
      if (op === "$not") return !expected.test(String(value || ""));
      if (op === "$exists") return (value !== undefined) === expected;
      if (op === "$nin") return !expected.includes(value);
      throw new Error(`Unknown operator ${op}`);
    });
    return condition === null ? value == null : value === condition;
  });
}

test("load badges and server filters agree with Create Load availability", () => {
  const bills = [
    { name: "unassigned", IsLoaded: false, LoadNo: null, isActive: true },
    { name: "legacy", isActive: true },
    { name: "missing load number", IsLoaded: true, LoadNo: 0, isActive: true },
    { name: "unloaded flag", IsLoaded: false, LoadNo: 9, isActive: true },
    { name: "assigned", IsLoaded: true, LoadNo: 7, isActive: true },
    { name: "cancelled", IsBillCancelled: true, BillStatus: "CANCELLED", isActive: false },
  ];
  for (const status of ["not_loaded", "loaded", "cancelled"]) {
    const expected = bills.filter((bill) => salesLoadStatus(bill) === status).map((bill) => bill.name);
    const filtered = bills.filter((bill) => matches(bill, salesLoadStatusCondition(status))).map((bill) => bill.name);
    assert.deepEqual(filtered, expected);
  }
  assert.deepEqual(bills.filter((bill) => salesLoadStatus(bill) === "not_loaded").map((bill) => bill.name), ["unassigned", "legacy", "missing load number", "unloaded flag"]);
});

test("cancelled bills are never presented as available even if their load fields are empty", () => {
  const cancelled = { BillStatus: "CANCELLED", IsLoaded: false, LoadNo: null, isActive: false };
  assert.equal(salesLoadStatus(cancelled), "cancelled");
  assert.equal(matches(cancelled, salesLoadStatusCondition("not_loaded")), false);
  assert.equal(matches(cancelled, salesLoadStatusCondition("cancelled")), true);
});
