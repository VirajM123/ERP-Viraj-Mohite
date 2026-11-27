import test from "node:test";
import assert from "node:assert/strict";
import { reserveSettlementAllocation } from "../settlementAllocation.js";

function fixture({ allocated = 0, prior = 0 } = {}) {
  const invoice = { _id: "bill", NetAmount: 1000, receiptAllocated: allocated, PartyCode: "P" };
  const sales = {
    async findOne(filter) { return filter.BillSeries === "S" && filter.BillNo === 1 ? { ...invoice } : null; },
    async updateOne(filter, update) {
      if (update.$max) invoice.receiptAllocated = Math.max(invoice.receiptAllocated, update.$max.receiptAllocated);
      if (update.$inc) {
        if (invoice.NetAmount - invoice.receiptAllocated < update.$inc.receiptAllocated) return { modifiedCount: 0 };
        invoice.receiptAllocated += update.$inc.receiptAllocated;
      }
      return { modifiedCount: 1 };
    },
  };
  const Receipt = { aggregate: () => ({ session: async () => [{ total: prior }] }) };
  return { invoice, args: { sales, Receipt, scope: { distributorId: "D", firmId: "F" }, session: {}, item: { billSeries: "S", billNo: "1", receiptAmount: 400 } } };
}

test("settlement allocates a receipt and exposes the remaining balance", async () => {
  const { invoice, args } = fixture();
  const result = await reserveSettlementAllocation(args);
  assert.equal(invoice.receiptAllocated, 400);
  assert.equal(result.pending, 600);
});

test("prior receipts reduce available balance and full allocation cannot be repeated", async () => {
  const { invoice, args } = fixture({ prior: 600 });
  assert.equal((await reserveSettlementAllocation(args)).pending, 0);
  assert.equal(invoice.receiptAllocated, 1000);
  await assert.rejects(reserveSettlementAllocation(args), /exceeds the pending amount/);
  assert.equal(invoice.receiptAllocated, 1000);
});

test("over-allocation, unknown invoices and invalid amounts are rejected", async () => {
  const { args } = fixture({ allocated: 700 });
  await assert.rejects(reserveSettlementAllocation(args), /exceeds the pending amount/);
  await assert.rejects(reserveSettlementAllocation({ ...args, item: { ...args.item, billNo: "2" } }), /not found/);
  await assert.rejects(reserveSettlementAllocation({ ...args, item: { ...args.item, receiptAmount: 1.001 } }), /two decimal/);
});
