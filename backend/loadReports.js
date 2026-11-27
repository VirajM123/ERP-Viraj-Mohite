const value = (item, ...keys) => {
  for (const key of keys) if (item?.[key] !== undefined && item[key] !== null && item[key] !== "") return item[key];
  return "";
};
const number = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const key = (series, no) => `${String(series || "").trim().toUpperCase()}|${String(no || "").trim()}`;
const billKey = (b) => key(value(b, "billSeries", "BillSeries", "Series"), value(b, "billNo", "BillNo"));
const isCancelled = (b) => b.cancel === "Y" || /cancel/i.test(b.status || "");
const billAmount = (bill, sale = {}) => number(bill.originalBillAmount || value(bill, "billAmount", "Amount", "BillAmount") || sale.NetAmount);

export function buildLoadReports({ type, loads = [], settlements = [], sales = [], receipts = [], products = [], accounts = [] }) {
  const saleByKey = new Map(sales.map((b) => [billKey(b), b]));
  const settlementByKey = new Map(settlements.map((s) => [key(s.loadSeries, s.loadNo), s]));
  const productByCode = new Map(products.map((p) => [String(p.productCode || "").trim(), p]));
  const accountByCode = new Map(accounts.map((p) => [String(p.accountCode || "").trim(), p]));
  const rows = [];
  for (const load of loads) {
    const settlement = settlementByKey.get(key(load.LoadSeries, load.LoadNo));
    const bills = settlement?.bills?.length ? settlement.bills : (load.Bills || []);
    if (type === "summary") {
      const row = { loadSeries: load.LoadSeries || "", loadNo: load.LoadNo, loadDate: load.LoadDate || "", totalBill: bills.length, totalBillAmt: 0, cashBill: 0, cashBillAmt: 0, creditBill: 0, creditBillAmt: 0, adjustBill: 0, adjustBillAmt: 0, pendingBill: 0, pendingBillAmt: 0, cancelBill: 0, cancelBillAmt: 0, recBill: 0, recBillAmt: 0, narration: settlement?.narration || load.Narration || "" };
      for (const bill of bills) {
        const amt = billAmount(bill, saleByKey.get(billKey(bill)));
        const received = number(value(bill, "receiptAmount", "ReceiptAmount"));
        row.totalBillAmt += amt;
        if (isCancelled(bill)) { row.cancelBill++; row.cancelBillAmt += amt; continue; }
        if (String(value(bill, "billType", "BillType")).toLowerCase() === "cash") { row.cashBill++; row.cashBillAmt += amt; }
        else { row.creditBill++; row.creditBillAmt += amt; }
        if (received > 0) { row.recBill++; row.recBillAmt += received; }
        else if (bill.adjust === "Y") { row.adjustBill++; row.adjustBillAmt += amt; }
        if (bill.pending === "Y") { row.pendingBill++; row.pendingBillAmt += number(value(bill, "pendingAmount", "billAmount", "Amount")); }
      }
      rows.push(row);
      continue;
    }
    for (const bill of bills) {
      const sale = saleByKey.get(billKey(bill)) || {};
      const partyCode = value(bill, "partyCode", "PartyCode") || sale.PartyCode || "";
      const party = accountByCode.get(String(partyCode).trim()) || {};
      const base = { billDate: value(bill, "billDate", "BillDate") || sale.BillDate || "", billSeries: value(bill, "billSeries", "BillSeries", "Series"), billNo: value(bill, "billNo", "BillNo"), partyCode, partyName: party.accountName || value(bill, "partyName", "PartyName") || sale.PartyName || "" };
      if (type === "cancel") {
        const loadedItems = value(bill, "loadedItems", "items", "Items");
        const snapshot = Array.isArray(loadedItems) ? loadedItems : null;
        const detailItems = new Map();
        for (const item of [...(snapshot || []), ...(sale.items || [])]) {
          const code = String(value(item, "productCode", "ProductCode", "productId", "ProdCode")).trim();
          if (code && !detailItems.has(code)) detailItems.set(code, item);
        }
        for (const item of detailItems.values()) {
          const code = String(value(item, "productCode", "ProductCode", "productId", "ProdCode")).trim();
          const master = productByCode.get(code) || {};
          const sumQty = (items) => items.filter((i) => String(value(i, "productCode", "ProductCode", "productId", "ProdCode")).trim() === code).reduce((sum, i) => sum + number(value(i, "qty", "Qty", "quantity")), 0);
          const delivered = isCancelled(bill) ? 0 : sumQty(sale.items || []);
          const loadQty = snapshot ? sumQty(snapshot) : null;
          rows.push({ ...base, productCode: code, productName: master.productName || value(item, "productName", "ProductName", "product"), localProduct: value(master, "localProduct", "localProductName"), hsn: value(master, "hsn", "hsnCode") || value(item, "hsn", "HSNCode"), salesmanCode: sale.SalesmanCode || "", salesmanName: sale.SalesmanName || value(bill, "salesman", "SalesmanName"), loadQty, deliverQty: delivered, cancelQty: loadQty === null ? null : Math.max(0, loadQty - delivered) });
        }
        continue;
      }
      const matching = receipts.flatMap((receipt) => {
        const allocations = Array.isArray(receipt.receiptBills) ? receipt.receiptBills : [];
        const allocation = allocations.find((a) => key(a.trnSeries, a.trnNo) === billKey(bill));
        if (allocation) return [{ receipt, amount: number(value(allocation, "appliedAmount", "nowAdjust", "adjustAmt")) }];
        return billKey(receipt) === billKey(bill) ? [{ receipt, amount: number(receipt.receiptAmount) }] : [];
      });
      let cash = 0, cheque = 0, online = 0;
      for (const { receipt, amount } of matching) {
        const mode = `${receipt.receiptMode || ""} ${receipt.bankCash || ""} ${receipt.bankCashGroup || ""}`.toUpperCase();
        if (/UPI|ONLINE|NEFT|IMPS|RTGS/.test(mode)) online += amount;
        else if (/CASH/.test(mode)) cash += amount;
        else if (/CHEQUE|BANK/.test(mode) || receipt.chequeNo) cheque += amount;
      }
      const amt = billAmount(bill, sale);
      rows.push({ ...base, billAmount: amt, adjustedAmount: null, finalAmount: isCancelled(bill) ? 0 : amt, cash, cheque, online, receiptSeries: matching.map(({ receipt }) => receipt.receiptSeries || "").filter(Boolean).join(", "), receiptNo: matching.map(({ receipt }) => receipt.rno || "").filter(Boolean).join(", "), creditAmt: null, pendingAmount: isCancelled(bill) ? 0 : Math.max(0, amt - matching.reduce((sum, entry) => sum + entry.amount, 0)), billType: value(bill, "billType", "BillType") || sale.BillType || "", cashierName: matching.map(({ receipt }) => receipt.addUser || "").filter(Boolean).join(", "), currentOs: null, ledgerOs: null });
    }
  }
  return rows.map((row, index) => ({ sr: index + 1, ...row }));
}
