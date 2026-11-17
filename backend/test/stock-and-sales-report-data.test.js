import test from "node:test";
import assert from "node:assert/strict";
import { reverseLaterStockMovement } from "../stockAndSalesReportData.js";

test("reverses later inventory movements to the selected To Date balance", () => {
  const current = 500;
  const historical = [
    ["SALE", 30, 530],
    ["PURCHASE", 50, 450],
    ["CREDIT_NOTE", 5, 495],
    ["DEBIT_NOTE", 3, 503],
    ["IN", 12, 488],
    ["OUT", 7, 507],
    ["DAMAGE_IN", 2, 502],
    ["DAMAGE_OUT", 1, 499],
  ];

  historical.forEach(([type, quantity, expected]) => {
    assert.equal(reverseLaterStockMovement(current, type, quantity), expected);
  });
});

test("rejects unknown movement types instead of silently reporting live stock", () => {
  assert.throws(
    () => reverseLaterStockMovement(10, "UNPOSTED_MOVEMENT", 1),
    /Unsupported stock movement type/
  );
});
