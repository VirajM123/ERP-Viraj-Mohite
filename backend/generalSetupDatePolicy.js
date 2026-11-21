import { businessDateIST, validateBusinessDate } from "./businessDate.js";

// Document dates are compared as calendar dates, not elapsed 24-hour periods.
export function assertSalesDateAllowed({ setup = {}, documentDate, existingDate, action = "create", today = businessDateIST() }) {
  const lockDate = String(setup?.dateLocking || "").trim();
  const days = Number(setup?.autoBillLockDays || 0);
  const datesToCheck = action === "create" ? [documentDate] : [existingDate, documentDate];
  if (lockDate) {
    validateBusinessDate(lockDate);
    for (const date of datesToCheck.filter(Boolean)) {
      if (validateBusinessDate(String(date).slice(0, 10)) <= lockDate) {
        throw Object.assign(new Error(`Document date is locked through ${lockDate}.`), { statusCode: 403 });
      }
    }
  }
  if (action !== "create" && Number.isInteger(days) && days > 0 && existingDate) {
    const oldDate = validateBusinessDate(String(existingDate).slice(0, 10));
    const current = validateBusinessDate(today);
    const cutoff = new Date(`${current}T00:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
    if (oldDate < cutoff.toISOString().slice(0, 10)) {
      throw Object.assign(new Error(`Bill is locked outside the ${days}-day edit window.`), { statusCode: 403 });
    }
  }
}
