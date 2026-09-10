import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveInvoiceItemHsn } from '../../src/utils/invoiceHsn.js';

test('invoice HSN uses the row value first and Product Master as a fallback', () => {
  const products = [{ productCode: 'P1', hsn: '180690' }];
  assert.equal(resolveInvoiceItemHsn({ productCode: 'P1', hsn: 'ROW-HSN' }, products), 'ROW-HSN');
  assert.equal(resolveInvoiceItemHsn({ product: 'P1 - Chocolate' }, products), '180690');
});

test('invoice HSN remains missing when Product Master also has no HSN', () => {
  assert.equal(resolveInvoiceItemHsn({ productCode: 'P1' }, [{ productCode: 'P1', hsn: '' }]), '');
});

test('invoice HSN fallback supports Product Master itemCode records', () => {
  assert.equal(resolveInvoiceItemHsn({ productCode: 'P2' }, [{ itemCode: 'P2', HSN: '210690' }]), '210690');
});
