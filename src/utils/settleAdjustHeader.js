const hasValue = (value) =>
  value !== null &&
  value !== undefined &&
  String(value).trim() !== "";

const firstValue = (...values) =>
  values.find(hasValue) ?? "";

/*
 * Settle Load adjustment opens an existing bill in the Billing form.  Keep a
 * snapshot of its saved header so that the update request does not depend on
 * a lookup list still containing the same area/party/salesman mapping.
 */
export const createSettleAdjustHeader = ({
  bill = {},
  areaCode = "",
  areaName = "",
  partyCode = "",
  partyName = "",
  salesmanCode = "",
  salesmanName = "",
} = {}) => ({
  billDate: firstValue(bill.BillDate, bill.billDate),
  godown: firstValue(bill.Godown, bill.GDCode, bill.godown),
  godownCode: firstValue(bill.GDCode, bill.gdCode),
  companyCode: firstValue(bill.CompanyCode, bill.companyCode),
  companyName: firstValue(bill.CompanyName, bill.companyName),
  areaCode: firstValue(areaCode, bill.AreaCode, bill.areaCode),
  areaName: firstValue(areaName, bill.AreaName, bill.areaName),
  partyCode: firstValue(partyCode, bill.PartyCode, bill.partyCode),
  partyName: firstValue(partyName, bill.PartyName, bill.partyName),
  billSeries: firstValue(bill.BillSeries, bill.billSeries),
  billNo: firstValue(bill.BillNo, bill.billNo),
  billType: firstValue(bill.BillType, bill.billType),
  dueDate: firstValue(bill.DueDate, bill.dueDate),
  salesmanCode: firstValue(salesmanCode, bill.SalesmanCode, bill.salesmanCode),
  salesmanName: firstValue(salesmanName, bill.SalesmanName, bill.salesmanName),
  narration: firstValue(bill.Narration, bill.narration),
});

export const settleAdjustHeaderValue = (header, field, fallback = "") =>
  hasValue(header?.[field]) ? header[field] : fallback;
