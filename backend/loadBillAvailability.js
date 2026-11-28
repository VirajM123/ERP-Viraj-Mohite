const key = (bill) => `${String(bill.BillSeries ?? bill.Series ?? bill.billSeries ?? '').trim().toUpperCase()}|${String(bill.BillNo ?? bill.billNo ?? '').trim()}`;

// Load membership also protects against stale IsLoaded flags on legacy bills.
export function excludeBillsInOtherLoads(bills, loads, editingLoadId = '') {
  const ids = new Set();
  const keys = new Set();
  for (const load of loads) {
    if (editingLoadId && String(load._id) === String(editingLoadId)) continue;
    for (const bill of load.Bills || []) {
      const id = String(bill.SalesBillId || bill.salesBillId || '').trim();
      if (id) ids.add(id);
      const billKey = key(bill);
      if (!billKey.endsWith('|')) keys.add(billKey);
    }
  }
  return bills.filter((bill) => !ids.has(String(bill._id || '')) && !keys.has(key(bill)));
}
