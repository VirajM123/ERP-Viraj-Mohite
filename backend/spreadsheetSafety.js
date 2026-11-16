import { csvCell, sanitizeSpreadsheetCell } from "../shared/spreadsheetSafety.js";

export { csvCell, sanitizeSpreadsheetCell };

export const sanitizeSpreadsheetRow = (row) => Object.fromEntries(
  Object.entries(row || {}).map(([key, value]) => [key, sanitizeSpreadsheetCell(value)])
);
