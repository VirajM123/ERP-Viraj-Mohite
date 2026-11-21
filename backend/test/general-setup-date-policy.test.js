import test from "node:test";
import assert from "node:assert/strict";
import { assertSalesDateAllowed } from "../generalSetupDatePolicy.js";

test("sales lock date includes the selected date for new and existing bills", () => {
  const setup = { dateLocking: "2026-10-31" };
  assert.throws(() => assertSalesDateAllowed({ setup, documentDate: "2026-10-31" }), /locked/);
  assert.doesNotThrow(() => assertSalesDateAllowed({ setup, documentDate: "2026-11-01" }));
  assert.throws(() => assertSalesDateAllowed({ setup, existingDate: "2026-10-31", documentDate: "2026-11-01", action: "edit" }), /locked/);
  assert.throws(() => assertSalesDateAllowed({ setup, existingDate: "2026-11-01", documentDate: "2026-10-31", action: "edit" }), /locked/);
});

test("rolling sales edit window includes today and six preceding days", () => {
  const setup = { autoBillLockDays: 7 }, today = "2026-11-20";
  assert.doesNotThrow(() => assertSalesDateAllowed({ setup, existingDate: "2026-11-14", action: "edit", today }));
  assert.throws(() => assertSalesDateAllowed({ setup, existingDate: "2026-11-13", action: "cancel", today }), /locked/);
  assert.doesNotThrow(() => assertSalesDateAllowed({ setup, documentDate: "2026-11-13", action: "create", today }));
  assert.doesNotThrow(() => assertSalesDateAllowed({ setup: { autoBillLockDays: 0 }, existingDate: "2020-01-01", action: "edit", today }));
});

test("purchase bills use the same cutoff and rolling-window policy", () => {
  const setup = { dateLocking: "2026-10-31", autoBillLockDays: 7 }, today = "2026-11-20";
  assert.throws(() => assertSalesDateAllowed({ setup, documentDate: "2026-10-31", action: "create", today }), /locked/);
  assert.throws(() => assertSalesDateAllowed({ setup, existingDate: "2026-11-13", documentDate: "2026-11-20", action: "edit", today }), /locked/);
  assert.throws(() => assertSalesDateAllowed({ setup, existingDate: "2026-11-15", documentDate: "2026-10-31", action: "edit", today }), /locked/);
  assert.doesNotThrow(() => assertSalesDateAllowed({ setup, existingDate: "2026-11-14", action: "cancel", today }));
});
