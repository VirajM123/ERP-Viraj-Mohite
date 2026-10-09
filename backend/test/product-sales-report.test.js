import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Read the actual aggregation expressions without importing server.js, which
// creates the application's database connection as a module side effect.
const source = readFileSync(new URL("../productSalesReport.js", import.meta.url), "utf8");
const expressions = source.slice(source.indexOf("const firstItemValue"), source.indexOf("const createProductSalesReportRouter"))
  .replace("export const buildProductSalesSummaryPipeline", "const buildProductSalesSummaryPipeline");
const context = vm.createContext({});
vm.runInContext(`${expressions}\nthis.pipeline = buildProductSalesSummaryPipeline;`, context);

const get = (object, path) => path.split(".").reduce((value, part) => value?.[part], object);
const evaluate = (expression, document, variables = {}) => {
  if (typeof expression === "string") {
    if (expression.startsWith("$$")) return get(variables, expression.slice(2));
    if (expression.startsWith("$")) return get(document, expression.slice(1));
    return expression;
  }
  if (Array.isArray(expression)) return expression.map((entry) => evaluate(entry, document, variables));
  if (expression === null || typeof expression !== "object") return expression;
  const [[operator, argument]] = Object.entries(expression);
  const value = (input) => evaluate(input, document, variables);
  switch (operator) {
    case "$ifNull": return value(argument[0]) ?? value(argument[1]);
    case "$trim": return String(value(argument.input)).trim();
    case "$convert": {
      const raw = value(argument.input);
      if (raw == null) return value(argument.onNull);
      const converted = argument.to === "string" ? String(raw) : Number(raw);
      return typeof converted === "number" && Number.isNaN(converted) ? value(argument.onError) : converted;
    }
    case "$let": {
      const bound = Object.fromEntries(Object.entries(argument.vars).map(([key, entry]) => [key, value(entry)]));
      return evaluate(argument.in, document, { ...variables, ...bound });
    }
    case "$cond": return value(argument[0]) ? value(argument[1]) : value(argument[2]);
    case "$eq": return value(argument[0]) === value(argument[1]);
    case "$ne": return value(argument[0]) !== value(argument[1]);
    case "$in": return value(argument[1]).includes(value(argument[0]));
    case "$gte": return value(argument[0]) >= value(argument[1]);
    case "$indexOfBytes": return value(argument[0]).indexOf(value(argument[1]));
    case "$substrBytes": return value(argument[0]).slice(value(argument[1]), value(argument[1]) + value(argument[2]));
    case "$strLenBytes": return value(argument).length;
    case "$add": return argument.reduce((total, entry) => total + value(entry), 0);
    case "$subtract": return value(argument[0]) - value(argument[1]);
    case "$multiply": return argument.reduce((total, entry) => total * value(entry), 1);
    default: throw new Error(`Unsupported expression: ${operator}`);
  }
};

const oldValue = (item, keys) => {
  for (const key of keys) if (item[key] !== undefined && item[key] !== null) return item[key];
  return "";
};
const oldNumber = (value, fallback = 0) => {
  for (const candidate of [value, fallback]) {
    if (candidate !== undefined && candidate !== null && candidate !== "" && !Number.isNaN(Number(candidate))) return Number(candidate);
  }
  return 0;
};
const codeKeys = ["productCode", "ProductCode", "prodCode", "ProdCode", "productId", "ProductId", "code"];
const nameKeys = ["productName", "ProductName", "prodName", "ProdName", "name"];
const qtyKeys = ["qty", "Qty", "quantity", "Quantity", "saleQty", "SaleQty"];
const rateKeys = ["salesRate", "SalesRate", "saleRate", "SaleRate", "sRate", "SRate", "rate", "Rate"];
const grossKeys = ["grossAmount", "GrossAmount", "grossAmt", "GrossAmt"];
const tprKeys = ["tprAmount", "TPRAmount", "tprAmt", "TPRAmt"];
const cashKeys = ["cashDiscountAmount", "CashDiscountAmount", "cashDiscountAmt", "cdAmount", "cdAmt", "CDAmount"];

const oldSummary = (bills, selected) => {
  const result = new Map();
  for (const bill of bills) for (const item of bill.items || []) {
    const combined = String(oldValue(item, ["product", "Product", "productDisplay", "productDescription"]) || "").trim();
    const split = combined.indexOf(" - ");
    const code = String(oldValue(item, codeKeys) || "").trim() || (split >= 0 ? combined.slice(0, split).trim() : "");
    const name = String(oldValue(item, nameKeys) || "").trim() || (split >= 0 ? combined.slice(split + 3).trim() : combined);
    if (!selected.has(code)) continue;
    const qty = oldNumber(oldValue(item, qtyKeys));
    const rate = oldNumber(oldValue(item, rateKeys), item.selectedBatch?.salesRate || item.selectedBatch?.SalesRate || item.selectedBatch?.sRate || item.selectedBatch?.SRate);
    const amt = oldNumber(oldValue(item, grossKeys), qty * rate);
    if (!result.has(code)) result.set(code, { productCode: code, productName: name, qty: 0, amt: 0, tprAmt: 0, cdAmt: 0 });
    const group = result.get(code);
    group.qty += qty;
    group.amt += amt;
    group.tprAmt += oldNumber(oldValue(item, tprKeys));
    group.cdAmt += oldNumber(oldValue(item, cashKeys));
  }
  return [...result.values()];
};

test("summary aggregation matches the previous product calculation", () => {
  const bills = [
    { items: [
      { product: "P1 - First name", qty: 2, salesRate: 12.5, tprAmt: 1, cdAmt: 0.5, freeQty: 3 },
      { ProductCode: "P2", ProductName: "Second", Quantity: "3", GrossAmount: "27", TPRAmount: "2", CashDiscountAmount: "1" },
      { product: "P3 - Third", productCode: "", ProductCode: "OTHER", qty: 1, grossAmount: 4 },
      { productCode: "OTHER", qty: 500, grossAmount: 999 },
    ] },
    { items: [
      { productCode: "P1", productName: "Later name", Qty: "4", grossAmount: "invalid", selectedBatch: { salesRate: 0, SalesRate: 5 }, tprAmount: 2, cashDiscountAmount: 0.25 },
      { productCode: "P2", qty: 1, grossAmount: 0, salesRate: 100, tprAmount: "  " },
    ] },
  ];
  const selected = new Set(["P1", "P2", "P3"]);
  const pipeline = context.pipeline({ distributorId: "D1", firmId: "F1", isActive: true, BillDate: { $gte: "2026-01-01", $lte: "2026-01-31" } }, selected, "productName");
  assert.equal(pipeline[0].$match.distributorId, "D1");
  assert.equal(pipeline[0].$match.firmId, "F1");
  assert.deepEqual({ ...pipeline[0].$match.BillDate }, { $gte: "2026-01-01", $lte: "2026-01-31" });
  assert.ok(pipeline.find((stage) => stage.$unwind));
  assert.ok(pipeline.find((stage) => stage.$match?.productCode));
  assert.ok(pipeline.findIndex((stage) => stage.$match?.productCode) < pipeline.findIndex((stage) => stage.$group));
  assert.ok(pipeline.some((stage) => stage.$setWindowFields?.output?.srNo));
  const group = pipeline.find((stage) => stage.$group).$group;
  const actual = new Map();
  for (const bill of bills) for (const item of bill.items) {
    const document = { items: item };
    for (const [key, expression] of Object.entries(pipeline.find((stage) => stage.$set?.combined).$set)) document[key] = evaluate(expression, document);
    document.separator = evaluate(pipeline.find((stage) => stage.$set?.separator).$set.separator, document);
    const fields = pipeline.find((stage) => stage.$set?.productCode).$set;
    document.productCode = evaluate(fields.productCode, document);
    document.savedProductName = evaluate(fields.savedProductName, document);
    if (!selected.has(document.productCode)) continue;
    if (!actual.has(document.productCode)) actual.set(document.productCode, { productCode: document.productCode, productName: document.savedProductName, qty: 0, amt: 0, tprAmt: 0, cdAmt: 0 });
    const row = actual.get(document.productCode);
    for (const field of ["qty", "amt", "tprAmt", "cdAmt"]) row[field] += evaluate(group[field].$sum, document);
  }
  assert.deepEqual([...actual.values()], oldSummary(bills, selected));
});
