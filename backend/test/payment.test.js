import test from "node:test";
import assert from "node:assert/strict";
import { normalizePaymentAllocations, paymentAmountFromBody } from "../transaction.js";

test("payment requires equal positive debit and credit", () => {
  assert.equal(paymentAmountFromBody({ drAmt: 1250, crAmt: 1250 }), 1250);
  assert.throws(() => paymentAmountFromBody({ drAmt: 1250, crAmt: 1200 }), /must be equal/i);
  assert.throws(() => paymentAmountFromBody({ drAmt: 0, crAmt: 0 }), /greater than zero/i);
});

test("payment allocation accepts the existing form contract", () => {
  const allocations = normalizePaymentAllocations({
    items: [
      { trn: "PUR", trnSeries: "PUR", voucherNo: "12", amount: "5000", adjustedAmt: "1000", newAdjusted: "750" },
      { trn: "PUR", trnSeries: "PUR", voucherNo: "13", amount: "250", newAdjusted: "0" },
    ],
  });
  assert.deepEqual(allocations, [{
    trn: "PUR", trnSeries: "PUR", voucherNo: "12", amount: 5000,
    previouslyAdjusted: 1000, allocatedAmount: 750,
  }]);
});
