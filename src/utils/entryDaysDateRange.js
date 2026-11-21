// The entry-list filter is inclusive and never restricts transaction entry.
export function entryDaysDateRange(days, today) {
  const count = Number(days);
  if (!Number.isInteger(count) || count <= 0) return { fromDate: "", toDate: "" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(today))) throw new Error("Invalid business date");
  const start = new Date(`${today}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== today) throw new Error("Invalid business date");
  start.setUTCDate(start.getUTCDate() - (count - 1));
  return { fromDate: start.toISOString().slice(0, 10), toDate: today };
}
