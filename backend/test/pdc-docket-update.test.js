import test from "node:test";
import assert from "node:assert/strict";
import { buildPdcDocketUpdate } from "../pdcDocketUpdate.js";

test("PDC docket update only includes schema fields and authenticated tenant scope", () => {
  const body = JSON.parse('{"docSeries":" PDC ","docVNo":"7","totalAmount":"125.50","totalCheques":"1","distributorId":"OTHER","firmId":"OTHER","__proto__":{"polluted":true},"cheques":[{"chequeNo":"123","partyName":"Party","__proto__":{"polluted":true}}]}');
  const update = buildPdcDocketUpdate(body, { distributorId: "DIST", firmId: "FIRM" });

  assert.deepEqual(update, {
    docSeries: "PDC",
    docVNo: 7,
    totalAmount: 125.5,
    totalCheques: 1,
    distributorId: "DIST",
    firmId: "FIRM",
    cheques: [{ chequeNo: "123", partyName: "Party" }],
  });
  assert.equal(Object.prototype.polluted, undefined);
});
