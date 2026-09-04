const IST_OFFSET_MS = 330 * 60 * 1000;

export const businessDateIST = (instant = new Date()) => {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
};

export const financialYearFor = (dateText = businessDateIST()) => {
  const [year, month, day] = String(dateText).split("-").map(Number);
  if (!year || !month || !day) throw new Error("Invalid business date");
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
};

export const istBusinessDateRange = (fromDate, toDate) => {
  const start = new Date(`${fromDate}T00:00:00+05:30`);
  const end = new Date(`${toDate}T00:00:00+05:30`);
  end.setUTCDate(end.getUTCDate() + 1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) throw new Error("Invalid date range");
  return { start, endExclusive: end };
};

