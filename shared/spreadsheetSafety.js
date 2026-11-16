const FORMULA_PREFIX = /^[=+\-@\t\r\n]/;

export const sanitizeSpreadsheetCell = (value) => {
  if (typeof value !== "string") return value;
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
};

export const csvCell = (value) => {
  const safe = sanitizeSpreadsheetCell(value);
  return `"${String(safe ?? "").replaceAll('"', '""')}"`;
};
