import mongoose from "mongoose";
import { Journal } from "./accounting.js";

export const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];
export const NORMAL_SIDES = ["DEBIT", "CREDIT"];
export const CASH_BANK_TYPES = ["NONE", "CASH", "BANK"];
export const TAX_CONTROL_TYPES = ["NONE", "GST_INPUT", "GST_OUTPUT"];
export const POSTING_ROLES = ["SERVICE_REVENUE", "OUTPUT_GST", "CASH", "BANK", "BANK_CHARGES"];

const chartAccountSchema = new mongoose.Schema({
  distributorId: { type: String, required: true },
  firmId: { type: String, required: true },
  accountCode: { type: String, required: true, trim: true },
  accountName: { type: String, default: "" },
  accountType: { type: String, enum: ACCOUNT_TYPES, required: true },
  normalSide: { type: String, enum: NORMAL_SIDES, required: true },
  cashBankType: { type: String, enum: CASH_BANK_TYPES, required: true, default: "NONE" },
  taxControlType: { type: String, enum: TAX_CONTROL_TYPES, required: true, default: "NONE" },
  postingRole: { type: String, enum: [...POSTING_ROLES, null], default: null },
}, { timestamps: true, collection: "Acc_ChartOfAccounts" });

chartAccountSchema.index({ distributorId: 1, firmId: 1, accountCode: 1 }, { unique: true });
chartAccountSchema.index(
  { distributorId: 1, firmId: 1, postingRole: 1 },
  { unique: true, partialFilterExpression: { postingRole: { $type: "string" } } }
);

export const ChartAccount = mongoose.models.Acc_ChartOfAccounts
  || mongoose.model("Acc_ChartOfAccounts", chartAccountSchema);

export function validateChartAccountMapping(value = {}) {
  const mapping = {
    accountType: String(value.accountType || "").trim().toUpperCase(),
    normalSide: String(value.normalSide || "").trim().toUpperCase(),
    cashBankType: String(value.cashBankType || "NONE").trim().toUpperCase(),
    taxControlType: String(value.taxControlType || "NONE").trim().toUpperCase(),
    postingRole: String(value.postingRole || "").trim().toUpperCase() || null,
  };
  const invalid = (message) => {
    throw Object.assign(new Error(message), { statusCode: 400 });
  };

  if (!ACCOUNT_TYPES.includes(mapping.accountType) || !NORMAL_SIDES.includes(mapping.normalSide)
    || !CASH_BANK_TYPES.includes(mapping.cashBankType) || !TAX_CONTROL_TYPES.includes(mapping.taxControlType)
    || (mapping.postingRole && !POSTING_ROLES.includes(mapping.postingRole))) {
    invalid("Choose valid account classification values.");
  }
  if (mapping.cashBankType !== "NONE" && mapping.accountType !== "ASSET") {
    invalid("Cash and bank accounts must be classified as assets.");
  }
  if (mapping.taxControlType === "GST_INPUT" && mapping.accountType !== "ASSET") {
    invalid("Input GST control accounts must be classified as assets.");
  }
  if (mapping.taxControlType === "GST_OUTPUT" && mapping.accountType !== "LIABILITY") {
    invalid("Output GST control accounts must be classified as liabilities.");
  }
  if (mapping.postingRole === "SERVICE_REVENUE" && mapping.accountType !== "INCOME") {
    invalid("The service revenue posting role requires an income account.");
  }
  if (mapping.postingRole === "OUTPUT_GST" && mapping.taxControlType !== "GST_OUTPUT") {
    invalid("The output GST posting role requires an output GST control account.");
  }
  if (mapping.postingRole === "CASH" && mapping.cashBankType !== "CASH") {
    invalid("The cash posting role requires a cash account.");
  }
  if (mapping.postingRole === "BANK" && mapping.cashBankType !== "BANK") {
    invalid("The bank posting role requires a bank account.");
  }
  if (mapping.postingRole === "BANK_CHARGES" && mapping.accountType !== "EXPENSE") {
    invalid("The bank charges posting role requires an expense account.");
  }
  return mapping;
}

export async function listChartAccounts(req) {
  const scope = { distributorId: req.auth.distributorId, firmId: req.auth.firmId };
  const Account = mongoose.models.Mas_Account;
  const OtherAccount = mongoose.models.Mas_OtherAccount;
  const [journalCodes, parties, otherAccounts, mappings] = await Promise.all([
    Journal.distinct("lines.accountCode", scope),
    Account ? Account.find({ ...scope, isActive: { $ne: false } }).select("accountCode accountName").lean() : [],
    OtherAccount ? OtherAccount.find({ ...scope, isActive: { $ne: false } }).select("accountCode accountName accountGroup").lean() : [],
    ChartAccount.find(scope).lean(),
  ]);
  const names = new Map();
  for (const account of [...parties, ...otherAccounts]) {
    const code = String(account.accountCode || "").trim();
    if (code && !names.has(code)) names.set(code, String(account.accountName || "").trim());
  }
  const existing = new Map(mappings.map((mapping) => [mapping.accountCode, mapping]));
  const codes = new Set([
    ...journalCodes.map((code) => String(code || "").trim()),
    ...parties.map((account) => String(account.accountCode || "").trim()),
    ...otherAccounts.map((account) => String(account.accountCode || "").trim()),
  ]);
  return [...codes].filter(Boolean).sort((a, b) => a.localeCompare(b)).map((accountCode) => {
    const mapping = existing.get(accountCode);
    return {
      accountCode,
      accountName: mapping?.accountName || names.get(accountCode) || accountCode,
      ...(mapping ? {
        accountType: mapping.accountType,
        normalSide: mapping.normalSide,
        cashBankType: mapping.cashBankType,
        taxControlType: mapping.taxControlType,
        postingRole: mapping.postingRole || "",
      } : {}),
      mapped: Boolean(mapping),
    };
  });
}
