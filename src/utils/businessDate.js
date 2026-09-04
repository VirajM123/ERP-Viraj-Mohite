export const businessDateIST = (instant = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(instant);

export const financialYearFor = (dateText = businessDateIST()) => {
  const [year, month] = String(dateText).split("-").map(Number);
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
};

