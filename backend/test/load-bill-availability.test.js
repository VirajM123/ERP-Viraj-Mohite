import test from 'node:test';
import assert from 'node:assert/strict';
import { excludeBillsInOtherLoads } from '../loadBillAvailability.js';

test('active load membership excludes assigned bills despite stale sales flags', () => {
  const bills = [{ _id: 'a', BillSeries: 'S', BillNo: 1 }, { _id: 'b', BillSeries: 'S', BillNo: 2 }, { _id: 'c', BillSeries: 'S', BillNo: 3 }];
  const loads = [{ _id: 'load1', Bills: [{ SalesBillId: 'a', BillSeries: 'S', BillNo: 1 }] }, { _id: 'load2', Bills: [{ Series: 'S', BillNo: 2 }] }];
  assert.deepEqual(excludeBillsInOtherLoads(bills, loads).map((bill) => bill._id), ['c']);
  assert.deepEqual(excludeBillsInOtherLoads(bills, loads, 'load1').map((bill) => bill._id), ['a', 'c']);
  // A bill removed from the active load (for example, pending transfer) is available again.
  assert.deepEqual(excludeBillsInOtherLoads(bills, [{ _id: 'load1', Bills: [] }]).map((bill) => bill._id), ['a', 'b', 'c']);
});
