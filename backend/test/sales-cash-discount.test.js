import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../src/Dashboard.jsx', import.meta.url), 'utf8');
const start = source.indexOf('  const recalculateInvoiceCashDiscount =');
const end = source.indexOf('  const calculateInvoiceRowAmounts =', start);
assert.ok(start >= 0 && end > start);

for (const mode of ['ITEM_WISE_GROSS', 'ITEM_WISE_GROSS_SCHEME']) {
  test(`${mode} calculates percentage and entered amounts independently for multiple rows`, () => {
    const context = vm.createContext({
      cloneInvoiceDraftValue: value => structuredClone(value),
      getInvoiceCashDiscountMode: () => mode,
      getSalesItemTotalQty: row => Number(row.qty),
      invoiceRound: value => Math.round((value + Number.EPSILON) * 100) / 100,
      calculateInvoiceRowTax: (row, discount) => {
        const net = Number(row.grossAmt) - Number(row.schemeAmt) - discount;
        return { commercialNet: net, taxable: net, cgst: net * 0.09, sgst: net * 0.09, igst: 0 };
      },
    });
    vm.runInContext(`${source.slice(start, end)}\nglobalThis.recalculate = recalculateInvoiceCashDiscount;`, context);
    const rows = context.recalculate([
      { qty: 10, rate: 100, schemePct: 10, cdPct: 5, gst: 18 },
      { qty: 2, rate: 100, schemeAmt: 0, cdPct: '', cdAmt: 7, gst: 18 },
    ]);
    assert.equal(rows[0].schemeAmt, '100.00');
    assert.equal(rows[0].cdAmt, mode === 'ITEM_WISE_GROSS' ? '50.00' : '45.00');
    assert.equal(rows[0].amount, mode === 'ITEM_WISE_GROSS' ? '1003.00' : '1008.90');
    assert.equal(rows[1].cdAmt, '7.00');
    assert.equal(rows[1].amount, '227.74');
  });
}

test('a manual amount overrides bill-wide percentages and remains on later recalculation', () => {
  const context = vm.createContext({
    cloneInvoiceDraftValue: value => structuredClone(value),
    getInvoiceCashDiscountMode: () => 'BILL_GROSS_AMOUNT',
    getSalesItemTotalQty: row => Number(row.qty),
    invoiceRound: value => Math.round((value + Number.EPSILON) * 100) / 100,
    calculateInvoiceRowTax: (row, discount) => {
      const net = Number(row.grossAmt) - Number(row.schemeAmt) - discount;
      return { commercialNet: net, taxable: net, cgst: 0, sgst: 0, igst: 0 };
    },
  });
  vm.runInContext(`${source.slice(start, end)}\nglobalThis.recalculate = recalculateInvoiceCashDiscount;`, context);
  const rows = context.recalculate([
    { productCode: 'A', qty: 1, rate: 100, schemePct: '', schemeAmt: 10, cdPct: 5, cdAmt: 7 },
    { productCode: 'B', qty: 1, rate: 100, schemePct: '', schemeAmt: 0, cdPct: 5, cdAmt: 5 },
  ], { changedIndex: 0, changedField: 'cdAmt' });
  assert.equal(rows[0].cdPct, '');
  assert.equal(rows[0].schemeAmt, '10.00');
  assert.equal(rows[0].cdAmt, '7.00');
  assert.equal(rows[0].amount, '83.00');
  assert.equal(context.recalculate(rows)[0].cdAmt, '7.00');
});
