export const isBoxLikeSalesUnit = (unit) => {
  const value = String(unit || "").toLowerCase();
  return value === "box" || value === "bag";
};

export const salesBillingHeaderError = ({ areaCode, salesmanCode, entryType, desktopImport = false }) => {
  const type = String(entryType || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (desktopImport || type === "COUNTER_SALES") return "";
  if (!String(areaCode || "").trim()) return "Select an area before saving the sales bill.";
  if (!String(salesmanCode || "").trim()) return "Select a salesman before saving the sales bill.";
  return "";
};
