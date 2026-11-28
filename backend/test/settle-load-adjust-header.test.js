import test from "node:test";
import assert from "node:assert/strict";
import {
  createSettleAdjustHeader,
  settleAdjustHeaderValue,
} from "../../src/utils/settleAdjustHeader.js";

test("settle-load adjustment preserves saved header values when lookup data is unavailable", () => {
  const header = createSettleAdjustHeader({
    bill: {
      BillDate: "2026-11-26",
      GDCode: "G1",
      Godown: "Main Godown",
      CompanyCode: "CMP",
      CompanyName: "Company",
      BillSeries: "SL",
      BillNo: 12,
      BillType: "Credit",
      DueDate: "2026-12-26",
      Narration: "Saved bill",
    },
    areaCode: "A1",
    areaName: "North",
    partyCode: "P1",
    partyName: "Saved Party",
    salesmanCode: "S1",
    salesmanName: "Saved Salesman",
  });

  assert.deepEqual(header, {
    billDate: "2026-11-26",
    godown: "Main Godown",
    godownCode: "G1",
    companyCode: "CMP",
    companyName: "Company",
    areaCode: "A1",
    areaName: "North",
    partyCode: "P1",
    partyName: "Saved Party",
    billSeries: "SL",
    billNo: 12,
    billType: "Credit",
    dueDate: "2026-12-26",
    salesmanCode: "S1",
    salesmanName: "Saved Salesman",
    narration: "Saved bill",
  });
  assert.equal(settleAdjustHeaderValue(header, "partyName", "Lookup Party"), "Saved Party");
  assert.equal(settleAdjustHeaderValue(null, "partyName", "Lookup Party"), "Lookup Party");
});
