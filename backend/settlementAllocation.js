// Reserve against the same sales balance used by normal receipt posting.
export async function reserveSettlementAllocation({ sales, Receipt, scope, item, session }) {
  const amount = Number(item.receiptAmount);
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(Math.round(amount * 100) - amount * 100) > 1e-7) {
    throw Object.assign(new Error("Receipt amount must be positive and have at most two decimal places."), { statusCode: 400 });
  }
  const series = String(item.billSeries || "").trim();
  const number = Number(item.billNo);
  const invoice = await sales.findOne({ ...scope, BillSeries: series, BillNo: number, isActive: { $ne: false }, IsBillCancelled: { $ne: true } }, { session });
  if (!invoice) throw Object.assign(new Error(`Active sales bill ${series}-${item.billNo} was not found.`), { statusCode: 404 });
  const rows = await Receipt.aggregate([
    { $match: { ...scope, status: { $ne: "REVERSED" }, receiptBills: { $elemMatch: { trnSeries: series, trnNo: String(item.billNo) } } } },
    { $unwind: "$receiptBills" },
    { $match: { "receiptBills.trnSeries": series, "receiptBills.trnNo": String(item.billNo), "receiptBills.openingTransactionId": { $in: [null, ""] } } },
    { $group: { _id: null, total: { $sum: { $cond: [ { $eq: ["$receiptBills.legacyOverAllocation", true] }, { $ifNull: ["$receiptBills.appliedAmount", 0] }, { $add: [{ $ifNull: ["$receiptBills.nowAdjust", 0] }, { $ifNull: ["$receiptBills.discAmt", 0] }] } ] } } } },
  ]).session(session);
  const allocated = Math.max(Number(invoice.receiptAllocated || 0), Number(rows[0]?.total || 0));
  const total = Number(invoice.NetAmount ?? invoice.BillAmount ?? 0);
  await sales.updateOne({ _id: invoice._id }, { $max: { receiptAllocated: allocated } }, { session });
  const reserved = await sales.updateOne({ _id: invoice._id, $expr: { $gte: [{ $subtract: [total, { $ifNull: ["$receiptAllocated", 0] }] }, amount] } }, { $inc: { receiptAllocated: amount } }, { session });
  if (reserved.modifiedCount !== 1) throw Object.assign(new Error(`Receipt exceeds the pending amount for bill ${series}-${item.billNo}.`), { statusCode: 409 });
  return { invoice, pending: Math.max(0, total - allocated - amount) };
}
