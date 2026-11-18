const groups = [
  [["sales-register", "sales-summary", "daily-sales", "monthly-sales", "salesman-sales", "area-sales", "company-sales", "counter-sales-summary", "top-selling-products", "e-invoice-register", "eway-bill-register"], ["T_Sal_Header"]],
  [["sales-return-register", "sales-return-analysis"], ["T_CreditNote_Header"]],
  [["purchase-return-register", "purchase-return-analysis"], [["DebitNote", "T_DebitNote_Header"]]],
  [["purchase-register", "purchase-summary", "supplier-purchase", "company-supplier-purchase", "purchase-rate"], ["T_Pur_Header"]],
  [["stock-valuation", "godown-stock", "batch-stock", "near-expiry-stock", "expired-stock", "reorder-stock"], ["Mas_Stock", "Mas_Product", "Mas_Godown"]],
  [["stock-adjustments"], ["T_Stock_Adjustment"]],
  [["customer-ageing"], ["T_Sal_Header", "T_OpeningTransaction"]],
  [["supplier-outstanding"], ["T_Pur_Header", "T_OpeningTransaction", ["DebitNote", "T_DebitNote_Header"]]],
  [["customer-statement"], ["Mas_Account", "Acc_Journal"]],
  [["supplier-statement"], ["Mas_OtherAccount", "Acc_Journal"]],
  [["collection-register", "collection-by-salesman", "receipt-allocation"], ["T_Receipt"]],
  [["load-dispatch-register"], ["T_Load_Header"]],
  [["load-settlement-summary"], ["T_SettleLoad"]],
  [["journal-voucher-register"], ["T_JournalVoucher"]],
  [["product-list"], ["Mas_Product"]], [["customer-list"], ["Mas_Account"]],
  [["supplier-list"], ["Mas_OtherAccount"]], [["company-list"], ["Mas_Company"]],
  [["area-list"], ["Mas_Area"]], [["salesman-list"], ["Mas_Salesman"]],
  [["godown-list"], ["Mas_Godown"]],
  [["product-price-list", "batch-expiry-list"], ["Mas_Stock", "Mas_Product"]],
  [["inactive-masters"], ["Mas_Product", "Mas_Account", "Mas_OtherAccount"]],
];
const requirements = new Map(groups.flatMap(([reports, models]) => reports.map(report => [report, models])));
export function missingCatalogSources(report, models, { companyCode = "" } = {}) {
  const required = [...(requirements.get(report) || [])];
  if (companyCode && ["purchase-register", "purchase-summary", "supplier-purchase", "company-supplier-purchase", "purchase-rate"].includes(report)) required.push("Mas_Company");
  return required.filter(source => !(Array.isArray(source) ? source.some(name => models[name]) : models[source]))
    .map(source => Array.isArray(source) ? source.join(" or ") : source);
}
export function missingDashboardSources(models) {
  return ["T_Sal_Header", "T_Pur_Header", "T_Receipt", "Mas_Stock", "T_Load_Header", "Mas_Account", "Mas_Product", "T_CreditNote_Header", "DebitNote", "Mas_DamStock", "T_Payment", "T_OpeningTransaction"].filter(name => !models[name]);
}
export function missingStockMovementSources(models, { companyCode = "" } = {}) {
  const required = ["Inv_StockMovement", "T_Stock_Adjustment"];
  if (companyCode) required.push("Mas_Company", "Mas_Product");
  return required.filter((name) => !models[name]);
}

