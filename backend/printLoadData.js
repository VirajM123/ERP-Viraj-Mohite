import { isBoxLikeSalesUnit } from "../shared/salesBillingRules.js";

const pick = (obj, keys, fallback = "") => {
  for (const key of keys) if (obj?.[key] !== undefined && obj[key] !== null && obj[key] !== "") return obj[key];
  return fallback;
};
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
export const loadBillKey = (item) => `${String(pick(item, ["BillSeries", "billSeries", "Series", "series"], "")).trim().toUpperCase()}:${String(pick(item, ["BillNo", "billNo"], "")).trim()}`;

export function buildPrintLoadProductRows(bills, products = [], includeFree = true) {
  const masterByCode = new Map(products.map((p) => [String(p.productCode || "").trim(), p]));
  const rows = new Map();
  for (const bill of bills) for (const item of bill.items || []) {
    const code = String(pick(item, ["productCode", "ProdCode", "code"])).trim();
    const master = masterByCode.get(code) || {};
    const name = pick(item, ["productName", "ProdName", "name", "product"], master.productName || "");
    const mrp = number(pick(item, ["mrp", "MRP"], 0));
    const hsn = pick(item, ["hsnCode", "HSNCode", "hsn"], master.hsn || "");
    const savedPack = number(pick(item, ["boxPack", "BoxPack"], 0));
    const pack = savedPack > 0 ? savedPack : number(pick(item.selectedBatch, ["boxPack", "BoxPack"], master.boxPack));
    const key = JSON.stringify([code, name, mrp, hsn, pack]);
    if (!rows.has(key)) rows.set(key, {
      productCode: code, prodName: name, mrp, hsnCode: hsn, unitQty: pack, boxPack: pack,
      shortCode: pick(item, ["shortCode", "ShortCode"], master.shortCode || ""),
      weight: number(pick(item, ["weight", "Weight"], master.weight)), qty: 0, freeQty: 0, totalQty: 0, cases: 0, netAmt: 0, discount: 0,
    });
    const row = rows.get(key);
    const billed = number(pick(item, ["qty", "Qty", "quantity"], 0));
    const free = number(pick(item, ["free", "Free", "freeQty", "FreeQty"], 0));
    const unit = String(pick(item, ["units", "unit", "Unit"], "")).trim().toUpperCase();
    const pieces = isBoxLikeSalesUnit(unit) ? (pack > 0 ? billed * pack : null) : billed;
    if (pieces === null) row.unknownQty = true;
    row.qty += pieces ?? 0;
    row.freeQty += free;
    row.totalQty += (pieces ?? 0) + (includeFree ? free : 0);
    row.netAmt += number(pick(item, ["netAmount", "NetAmount", "netAmt", "amount", "Amount", "taxable"], 0));
    row.discount += number(pick(item, ["schemeAmount", "schemeAmt", "SchemeAmount"], 0)) + number(pick(item, ["cashDiscountAmount", "cdAmt", "CashDiscountAmount"], 0));
  }
  return [...rows.values()].map((row, index) => ({
    ...row,
    unitQty: row.unitQty > 0 ? row.unitQty : null,
    boxPack: row.boxPack > 0 ? row.boxPack : null,
    qty: row.unknownQty ? null : row.qty,
    totalQty: row.unknownQty ? null : row.totalQty,
    cases: !row.unknownQty && row.unitQty > 0 ? Math.floor((row.totalQty + 1e-9) / row.unitQty) : null,
    sr: index + 1,
  }));
}

function receiptKind(receipt, settlement) {
  const fallbackMode = receipt.receiptSource === "SETTLE_LOAD" ? settlement?.receiptMode : "";
  const mode = String(pick(receipt, ["receiptMode", "paymentMode", "mode"], fallbackMode || "")).trim().toUpperCase();
  const description = `${mode} ${receipt.bankCashGroup || ""} ${receipt.bankCash || ""} ${receipt.bankCashName || ""}`.toUpperCase();
  if (/UPI|ONLINE|NEFT|IMPS|RTGS/.test(description) || receipt.upiId) return "upi";
  if (/CHEQUE|CHECK/.test(description) || receipt.chequeNo) return "cheque";
  if (/CASH/.test(description)) return "cash";
  return "other";
}

export function buildPrintLoadPartyRows(loadBills, salesBills = [], receipts = [], settlements = []) {
  const sales = new Map(salesBills.map((item) => [loadBillKey(item), item]));
  const settled = new Map(settlements.map((item) => [loadBillKey(item), item]));
  const payments = new Map();
  for (const receipt of receipts) {
    const key = loadBillKey(receipt);
    if (!payments.has(key)) payments.set(key, []);
    payments.get(key).push(receipt);
  }
  return loadBills.map((bill, index) => {
    const key = loadBillKey(bill);
    const sale = sales.get(key) || {};
    const settlement = settled.get(key);
    const amount = number(pick(bill, ["Amount", "billAmount", "NetAmount"], pick(sale, ["NetAmount"], 0)));
    const billReceipts = payments.get(key) || [];
    const values = { cash: 0, cheque: 0, upi: 0, other: 0 };
    if (billReceipts.length) {
      for (const receipt of billReceipts) values[receiptKind(receipt, settlement)] += number(receipt.receiptAmount);
    } else if (settlement && number(settlement.receiptAmount)) {
      values[receiptKind(settlement, settlement)] += number(settlement.receiptAmount);
    } else {
      values.cash = number(pick(bill, ["Cash", "cash"], 0));
      values.cheque = number(pick(bill, ["Cheque", "cheque"], 0));
      values.upi = number(pick(bill, ["UPI", "upi", "Online", "online"], 0));
    }
    const paid = values.cash + values.cheque + values.upi + values.other;
    return {
      sr: index + 1, billSeries: pick(bill, ["BillSeries", "billSeries", "Series"], sale.BillSeries || ""),
      billNo: pick(bill, ["BillNo", "billNo"], sale.BillNo || ""), billDate: pick(bill, ["BillDate", "billDate"], sale.BillDate || ""),
      partyName: pick(bill, ["PartyName", "partyName"], sale.PartyName || ""), partyCode: pick(bill, ["PartyCode", "partyCode"], sale.PartyCode || ""),
      areaName: pick(bill, ["AreaName", "areaName"], sale.AreaName || ""), salesmanName: pick(bill, ["SalesmanName", "salesmanName", "salesman"], sale.SalesmanName || ""),
      companyName: pick(bill, ["CompanyName", "companyName"], sale.CompanyName || ""), billType: pick(bill, ["BillType", "billType"], sale.BillType || ""),
      narration: pick(bill, ["Narration", "narration"], sale.Narration || ""), remark: pick(bill, ["Remark", "remark", "Remarks"], ""),
      gstNo: pick(bill, ["GSTNo", "gstNo", "GSTIN"], ""), compInvNo: pick(bill, ["CompInvNo", "compInvNo"], ""),
      amount, cash: values.cash, cheque: values.cheque, upi: values.upi, unclassifiedPayment: values.other,
      pending: Math.max(0, Math.round((amount - paid) * 100) / 100),
    };
  });
}
