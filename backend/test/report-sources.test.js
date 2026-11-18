import test from "node:test";
import assert from "node:assert/strict";
import { missingCatalogSources, missingDashboardSources, missingStockMovementSources } from "../reportSources.js";
test("catalog reports identify only required missing sources", () => {
  assert.deepEqual(missingCatalogSources("sales-register", {}), ["T_Sal_Header"]);
  assert.deepEqual(missingCatalogSources("sales-register", { T_Sal_Header: {} }), []);
  assert.deepEqual(missingCatalogSources("purchase-register", { T_Pur_Header: {} }, { companyCode: "A" }), ["Mas_Company"]);
  assert.deepEqual(missingCatalogSources("purchase-return-register", { T_DebitNote_Header: {} }), []);
  assert.deepEqual(missingCatalogSources("batch-expiry-list", { Mas_Stock: {} }), ["Mas_Product"]);
});
test("dashboard identifies missing sources", () => {
  const names = ["T_Sal_Header", "T_Pur_Header", "T_Receipt", "Mas_Stock", "T_Load_Header", "Mas_Account", "Mas_Product", "T_CreditNote_Header", "DebitNote", "Mas_DamStock", "T_Payment", "T_OpeningTransaction"];
  const models = Object.fromEntries(names.map(name => [name, {}]));
  assert.deepEqual(missingDashboardSources(models), []);
  delete models.T_Receipt;
  assert.deepEqual(missingDashboardSources(models), ["T_Receipt"]);
});
test("stock movement requires filter lookup sources only for company filtering", () => {
  const movementModels = { Inv_StockMovement: {}, T_Stock_Adjustment: {} };
  assert.deepEqual(missingStockMovementSources(movementModels), []);
  assert.deepEqual(missingStockMovementSources(movementModels, { companyCode: "ACME" }), ["Mas_Company", "Mas_Product"]);
  movementModels.Mas_Company = {};
  movementModels.Mas_Product = {};
  assert.deepEqual(missingStockMovementSources(movementModels, { companyCode: "ACME" }), []);
});
