export const OPENING_TRANSACTION_TYPES = ['SAL', 'PUR', 'CRN', 'DRN', 'REC', 'PAY', 'JOU', 'OPB'];

export function validateOpeningTransactions(rows) {
  if (!Array.isArray(rows)) return 'Opening transactions must be a list.';
  for (const [index, row] of rows.entries()) {
    const prefix = `Opening transaction ${index + 1}: `;
    if (!row || !OPENING_TRANSACTION_TYPES.includes(row.transactionType)) return prefix + 'select a transaction type.';
    if (!String(row.transactionNo ?? '').trim()) return prefix + 'enter a transaction number.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date || '') ||
        !Number.isFinite(Date.parse(row.date)) || new Date(row.date).toISOString().slice(0, 10) !== row.date) {
      return prefix + 'enter a valid date.';
    }
    for (const field of ['originalAmount', 'balanceAmount']) {
      const value = row[field];
      if (!['string', 'number'].includes(typeof value) || String(value).trim() === '' ||
          !Number.isFinite(Number(value)) || Number(value) < 0 ||
          !Number.isSafeInteger(Math.round(Number(value) * 100))) {
        return prefix + 'amounts must be valid non-negative numbers.';
      }
      if (Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) > 0.00001) return prefix + 'amounts can have at most two decimal places.';
    }
    if (Number(row.balanceAmount) > Number(row.originalAmount)) return prefix + 'balance cannot exceed the original amount.';
    if (!['Dr', 'Cr'].includes(row.balanceType)) return prefix + 'select Dr or Cr.';
    if (!['Y', 'N'].includes(row.adjusted)) return prefix + 'select an adjusted status.';
  }
  return '';
}

export function openingTransactionTotals(rows) {
  let debit = 0;
  let credit = 0;
  for (const row of rows) {
    const amount = Number(row.balanceAmount);
    if (!Number.isFinite(amount)) continue;
    if (row.balanceType === 'Cr') credit += Math.round(amount * 100);
    else debit += Math.round(amount * 100);
  }
  return { debit: debit / 100, credit: credit / 100, net: (debit - credit) / 100 };
}
