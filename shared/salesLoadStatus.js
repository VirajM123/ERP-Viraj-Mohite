// Match Create Load's existing availability rule: a bill is unavailable only
// when it is marked loaded and has a non-zero load number.
export function salesLoadStatus(sale = {}) {
  if (sale.IsBillCancelled === true || String(sale.BillStatus || "").toUpperCase() === "CANCELLED") return "cancelled";
  return sale.IsLoaded === true && Number.isFinite(Number(sale.LoadNo)) && Number(sale.LoadNo) !== 0 ? "loaded" : "not_loaded";
}

export function salesLoadStatusCondition(status) {
  const cancelled = { $or: [{ IsBillCancelled: true }, { BillStatus: /^cancelled$/i }] };
  if (status === "cancelled") return cancelled;
  const active = { isActive: { $ne: false }, IsBillCancelled: { $ne: true }, BillStatus: { $not: /^cancelled$/i } };
  if (status === "loaded") return { ...active, IsLoaded: true, LoadNo: { $exists: true, $nin: [null, 0] } };
  if (status === "not_loaded") return { ...active, $or: [{ IsLoaded: { $ne: true } }, { LoadNo: null }, { LoadNo: { $exists: false } }, { LoadNo: 0 }] };
  return null;
}
