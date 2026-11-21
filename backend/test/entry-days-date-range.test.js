import test from "node:test";
import assert from "node:assert/strict";
import { entryDaysDateRange } from "../../src/utils/entryDaysDateRange.js";

test("entry list date defaults include today and permit all dates at zero", () => {
  assert.deepEqual(entryDaysDateRange(7, "2026-11-20"), { fromDate: "2026-11-14", toDate: "2026-11-20" });
  assert.deepEqual(entryDaysDateRange(1, "2026-11-20"), { fromDate: "2026-11-20", toDate: "2026-11-20" });
  assert.deepEqual(entryDaysDateRange(0, "2026-11-20"), { fromDate: "", toDate: "" });
  assert.deepEqual(entryDaysDateRange(3, "2024-03-01"), { fromDate: "2024-02-28", toDate: "2024-03-01" });
});
