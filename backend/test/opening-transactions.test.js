import test from 'node:test';
import assert from 'node:assert/strict';
import { OPENING_TRANSACTION_TYPES, openingTransactionTotals, validateOpeningTransactions } from '../../shared/openingTransactions.js';

const transaction = overrides => ({
  transactionType: 'SAL', transactionSeries: '', transactionNo: '2546',
  date: '2026-09-10', originalAmount: '71293.00', balanceAmount: '71293.00',
  balanceType: 'Dr', adjusted: 'N', appeared: 'M', ...overrides,
});

test('accepts empty detail lists and all supported transaction types', () => {
  assert.equal(validateOpeningTransactions([]), '');
  for (const transactionType of OPENING_TRANSACTION_TYPES) {
    assert.equal(validateOpeningTransactions([transaction({ transactionType })]), '');
  }
});

test('rejects invalid rows, missing references, dates, and transaction choices', () => {
  for (const rows of [null, {}, [null]]) assert.ok(validateOpeningTransactions(rows));
  for (const overrides of [
    { transactionNo: ' ' }, { transactionType: 'BAD' }, { date: '2026-02-30' },
    { date: '' }, { balanceType: 'BAD' }, { adjusted: 'BAD' },
  ]) assert.ok(validateOpeningTransactions([transaction(overrides)]));
});

test('rejects negative, nonnumeric, missing, or excessive outstanding amounts', () => {
  for (const value of [-1, 'NaN', 'Infinity', '', null, false, [], '1e100']) {
    assert.ok(validateOpeningTransactions([transaction({ balanceAmount: value })]));
  }
  assert.ok(validateOpeningTransactions([transaction({ originalAmount: 1, balanceAmount: 2 })]));
  assert.equal(validateOpeningTransactions([transaction({ balanceAmount: 0 })]), '');
});

test('totals outstanding balances rather than original invoice amounts without changing rows', () => {
  const rows = [transaction({ balanceAmount: 100 }), transaction({ balanceAmount: 25, balanceType: 'Cr' })];
  const original = structuredClone(rows);
  assert.deepEqual(openingTransactionTotals(rows), { debit: 100, credit: 25, net: 75 });
  assert.deepEqual(rows, original);
});

test('totals handle decimal rounding, credit balances, and clearing all rows', () => {
  assert.deepEqual(openingTransactionTotals([
    transaction({ balanceAmount: '0.10' }), transaction({ balanceAmount: '0.20' }),
    transaction({ balanceAmount: '1.00', balanceType: 'Cr' }),
  ]), { debit: 0.3, credit: 1, net: -0.7 });
  assert.deepEqual(openingTransactionTotals([]), { debit: 0, credit: 0, net: 0 });
});
