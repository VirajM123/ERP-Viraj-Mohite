const number = (value, label, negative = false) => {
  const result = Number(value ?? 0);
  if (!Number.isFinite(result) || (!negative && result < 0)) throw new Error(`${label} must be a valid number`);
  return result;
};
const percent = (value, label) => {
  const result = number(value, label);
  if (result > 100) throw new Error(`${label} cannot exceed 100`);
  return result;
};
export const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const taxableBase = ({ gross, tpr, scheme, star, cash }, mode) => {
  switch (String(mode || "GROSS_AMOUNT").toUpperCase()) {
    case "NET_AMOUNT": return Math.max(0, gross - tpr - scheme - star - cash);
    case "GROSS_SCHEME": return Math.max(0, gross - tpr - scheme);
    case "GROSS_SCHEME_STAR": return Math.max(0, gross - tpr - scheme - star);
    case "GROSS_SCHEME_CASH": return Math.max(0, gross - tpr - scheme - cash);
    case "GROSS_CASH": return Math.max(0, gross - tpr - cash);
    default: return gross;
  }
};

export const calculateSalesFinancials = (body, rows, { vatMode = "GROSS_AMOUNT" } = {}) => {
  if (!Array.isArray(rows) || !rows.length) throw new Error("At least one product is required");
  const totals = { gross: 0, tpr: 0, scheme: 0, star: 0, cash: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, qty: 0, free: 0 };
  const headerIgst = ["Y", "YES", "TRUE", "1", "IGST"].includes(String(body.isIgst || body.taxType || "").toUpperCase());
  const items = rows.map((row, index) => {
    const qty = number(row.qty ?? row.quantity ?? row.Qty, `Item ${index + 1} quantity`);
    const free = number(row.free ?? row.Free ?? row.freeQty, `Item ${index + 1} free quantity`);
    const boxPack = number(row.boxPack ?? row.BoxPack ?? 1, `Item ${index + 1} box pack`);
    const chargedQty = String(row.units ?? row.unit ?? "").toLowerCase() === "box" ? qty * (boxPack || 1) + free : qty + free;
    if (chargedQty <= 0) throw new Error(`Item ${index + 1} quantity must be positive`);
    const rate = number(row.rate ?? row.salesRate ?? row.SRate, `Item ${index + 1} rate`);
    const gross = roundMoney(chargedQty * rate);
    const discount = (amountKeys, percentKeys, label) => {
      const pct = percentKeys.map((key) => row[key]).find((value) => value !== undefined && value !== null && value !== "");
      const amount = amountKeys.map((key) => row[key]).find((value) => value !== undefined && value !== null && value !== "");
      const result = roundMoney(pct !== undefined ? gross * percent(pct, `${label} percent`) / 100 : number(amount || 0, `${label} amount`));
      if (result > gross) throw new Error(`${label} cannot exceed gross amount`);
      return result;
    };
    const tpr = discount(["tprAmt", "tprAmount"], ["tprPct", "tprPercent"], "TPR");
    const scheme = discount(["schemeAmt", "schemeAmount"], ["schemePct", "schemePercent"], "Scheme");
    const star = discount(["starAmt", "starAmount"], ["starPct", "starPercent"], "Star discount");
    const cash = discount(["cdAmt", "cashDiscountAmount"], ["cdPct", "cashDiscountPercent"], "Cash discount");
    const commercialNet = roundMoney(Math.max(0, gross - tpr - scheme - star - cash));
    const taxable = roundMoney(taxableBase({ gross, tpr, scheme, star, cash }, vatMode));
    const gstPercent = percent(row.gst ?? row.gstPercent ?? row.GSTPercent ?? 0, `Item ${index + 1} GST`);
    const gst = roundMoney(taxable * gstPercent / 100);
    const igstMode = headerIgst || row.useIgst === true || row.igstApplicable === true || String(row.taxType || "").toUpperCase() === "IGST";
    const cgst = igstMode ? 0 : roundMoney(gst / 2), sgst = igstMode ? 0 : roundMoney(gst - cgst), igst = igstMode ? gst : 0;
    for (const [key, value] of Object.entries({ gross, tpr, scheme, star, cash, taxable, cgst, sgst, igst })) totals[key] = roundMoney(totals[key] + value);
    totals.qty += chargedQty; totals.free += free;
    return { ...row, grossAmt: gross, tprAmt: tpr, schemeAmt: scheme, starAmt: star, cdAmt: cash, taxable, cgst, sgst, igst, commercialNet, amount: roundMoney(commercialNet + gst) };
  });
  const display = number(body.DisplayAmount || 0, "Display amount"), coupon = number(body.CouponAmount || 0, "Coupon amount");
  const addLess = number(body.AddLessAmount || 0, "Add/Less amount", true), creditNote = number(body.CreditNoteAmount || 0, "Credit note amount");
  const originalNet = roundMoney(items.reduce((sum, item) => sum + item.commercialNet, 0) + totals.cgst + totals.sgst + totals.igst - display - coupon + addLess);
  return { items, GrossAmount: totals.gross, TPRAmount: totals.tpr, SchemeAmount: totals.scheme, StarDiscountAmount: totals.star, CashDiscountAmount: totals.cash, TaxableValue: totals.taxable, CGSTAmount: totals.cgst, SGSTAmount: totals.sgst, IGSTAmount: totals.igst, OriginalNetAmount: originalNet, NetAmount: roundMoney(Math.max(0, originalNet - creditNote)), TotalQty: totals.qty, TotalFreeQty: totals.free, TotalItems: items.length };
};

export const calculatePurchaseFinancials = (body, rows) => {
  if (!Array.isArray(rows) || !rows.length) throw new Error("At least one product is required");
  const igstMode = ["Y", "YES", "TRUE", "1"].includes(String(body.isIgst || "").toUpperCase());
  const totals = { mrp: 0, gross: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, amount: 0 };
  const items = rows.map((row, index) => {
    const qty = number(row.quantity ?? row.qty ?? row.Qty, `Item ${index + 1} quantity`), free = number(row.free ?? row.Free ?? 0, `Item ${index + 1} free quantity`);
    if (qty + free <= 0) throw new Error(`Item ${index + 1} quantity must be positive`);
    const mrp = number(row.mrp ?? row.MRP, `Item ${index + 1} MRP`), rate = number(row.purRate ?? row.purchaseRate ?? row.PRate ?? row.pRate, `Item ${index + 1} Purchase Rate`);
    if (rate <= 0) throw new Error(`Item ${index + 1} Purchase Rate must be greater than zero`);
    const gross = roundMoney(qty * rate); let taxable = gross;
    for (const key of ["disc1", "disc2", "disc3"]) taxable = roundMoney(taxable - taxable * percent(row[key] || 0, `${key} percent`) / 100);
    const gst = roundMoney(taxable * percent(row.tax ?? row.gst ?? row.gstPercent ?? 0, `Item ${index + 1} GST`) / 100);
    const cgst = igstMode ? 0 : roundMoney(gst / 2), sgst = igstMode ? 0 : roundMoney(gst - cgst), igst = igstMode ? gst : 0, amount = roundMoney(taxable + gst);
    totals.mrp = roundMoney(totals.mrp + (qty + free) * mrp); totals.gross = roundMoney(totals.gross + gross); totals.taxable = roundMoney(totals.taxable + taxable); totals.cgst = roundMoney(totals.cgst + cgst); totals.sgst = roundMoney(totals.sgst + sgst); totals.igst = roundMoney(totals.igst + igst); totals.amount = roundMoney(totals.amount + amount);
    return { ...row, grossAmount: gross, taxable, cgst, sgst, igst, amount };
  });
  const di1 = number(body.diBc1 || 0, "DI/BC 1"), di2 = number(body.diBc2 || 0, "DI/BC 2"), di3 = number(body.diBc3 || 0, "DI/BC 3");
  const tcbAmount = roundMoney(totals.amount * percent(body.tcbPercent || 0, "TCB percent") / 100), qbtAmt = roundMoney(totals.amount - di1 - di2 + tcbAmount);
  return { items, mrpTotal: totals.mrp, grossAmount: totals.gross, taxableAmount: totals.taxable, cgstAmt: totals.cgst, sgstAmt: totals.sgst, igstAmt: totals.igst, tcbAmount, qbtAmt, netAmt: roundMoney(Math.max(0, qbtAmt - di3 + number(body.rounding || 0, "Rounding", true))) };
};

export const validateFinancialEnvelope = (body, items, options = {}) => options.type === "purchase" ? calculatePurchaseFinancials(body, items) : calculateSalesFinancials(body, items, options);
