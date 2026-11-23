import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../../src/Transaction.jsx', import.meta.url), 'utf8');
const start = source.indexOf('  const clean = (v) =>');
const end = source.indexOf('  const pendingPurchaseBills =', start);

function outstanding(receipts) {
  const context = {
    state: { receipts }, openingReceiptBills: [],
    receiptSalesBills: [{ BillSeries: '2627/', BillNo: 11, BillDate: '2026-11-23', NetAmount: 1000, PartyName: 'Supplier' }],
  };
  vm.runInNewContext(source.slice(start, end) + '\nthis.result = pendingBills;', context);
  return context.result;
}

test('invoice remains outstanding until a saved receipt allocates it', () => {
  assert.equal(outstanding([])[0].balance, 1000);
  assert.equal(outstanding([{ items: [{ trnSeries: '2627/', trnNo: '11', nowAdjust: 400, discAmt: 50 }] }])[0].balance, 550);
  assert.equal(outstanding([{ items: [{ trnSeries: '2627/', trnNo: '11', nowAdjust: 950, discAmt: 50 }] }]).length, 0);
});

test('legacy allocations and opening bills do not overstate sales adjustments', () => {
  const receipts = [{ items: [
    { trnSeries: '2627/', trnNo: '11', nowAdjust: 1000, legacyOverAllocation: true, appliedAmount: 200 },
    { trnSeries: '2627/', trnNo: '11', nowAdjust: 500, openingTransactionId: 'opening' },
  ] }];
  assert.equal(outstanding(receipts)[0].balance, 800);
});
