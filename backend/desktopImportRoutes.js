import crypto from "crypto";
import { execFile } from "child_process";
import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import multer from "multer";
import * as XLSX from "xlsx";
import { importConfig } from "./importConfig.js";
import { buildDesktopTransactionRows } from "./desktopTransactionMapper.js";
import { DESKTOP_IMPORT_ORDER, preflightDesktopImport, publicImportState, readDesktopWorkbook, readDesktopWorkbookStreaming, rollbackDesktopImport, runDesktopImport } from "./desktopImportBatch.js";
import { csvCell, sanitizeSpreadsheetCell, sanitizeSpreadsheetRow } from "./spreadsheetSafety.js";

const execFileAsync = promisify(execFile);
const MAX_BACKUP_BYTES = Math.min(512 * 1024 * 1024, Math.max(1, Number(process.env.DESKTOP_IMPORT_MAX_BYTES || 256 * 1024 * 1024)));
const MAX_BACKUP_FILES = Math.min(4, Math.max(1, Number(process.env.DESKTOP_IMPORT_MAX_FILES || 2)));
const MAX_BACKUP_TOTAL_BYTES = Math.min(1024 * 1024 * 1024, Math.max(MAX_BACKUP_BYTES, Number(process.env.DESKTOP_IMPORT_MAX_TOTAL_BYTES || 512 * 1024 * 1024)));
const MAX_EXCEL_BYTES = Math.min(64 * 1024 * 1024, Math.max(1, Number(process.env.DESKTOP_IMPORT_EXCEL_MAX_BYTES || 32 * 1024 * 1024)));
const MAX_EXCEL_FILES = Math.min(50, Math.max(1, Number(process.env.DESKTOP_IMPORT_EXCEL_MAX_FILES || 30)));
const JOB_TTL_MS = Number(process.env.DESKTOP_IMPORT_JOB_TTL_MS || 24 * 60 * 60 * 1000);
const SQL_TIMEOUT_MS = Math.min(60 * 60 * 1000, Math.max(60_000, Number(process.env.DESKTOP_IMPORT_SQL_TIMEOUT_MS || 30 * 60 * 1000)));
// Desktop workbook upload/parsing and preflight are intentionally allowed more
// time than ordinary API calls. The app-wide 30 second response timeout can
// otherwise close the socket after the browser has finished uploading a large
// workbook, which fetch reports only as "Failed to fetch".
const ACTION_TIMEOUT_MS = Math.min(30 * 60 * 1000, Math.max(60_000, Number(process.env.DESKTOP_IMPORT_ACTION_TIMEOUT_MS || 10 * 60 * 1000)));
const jobs = new Map();
let detectedSqlServer;

export const isLikelySqlServerBackup = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return false;
  // Native SQL Server backup media contains the Microsoft Tape Format marker
  // near the beginning of the first media family. This rejects renamed text,
  // spreadsheet, executable, and empty files before SQL Server sees them.
  return buffer.subarray(0, Math.min(buffer.length, 512)).includes(Buffer.from("TAPE"));
};

const sourceDefinitions = {
  Company: {
    tables: ["Mas_Company"],
    fields: {
      "Company Code": ["CompCode", "CompanyCode"], "Company Name": ["CompName", "CompanyName"],
      "Head Office Address": ["HeadOffAdd", "CompanyAddress", "Address"], "Branch Office Address": ["BranchOffAdd", "BranchOfficeAddress"],
      GSTIN: ["GSTNo", "GSTIN"], State: ["State", "StateName"], "PIN Code": ["PinCode", "PIN"],
    },
  },
  Category: {
    tables: ["Mas_Category"],
    fields: { "Category Code": ["CatCode", "CategoryCode"], "Category Name": ["CatName", "CategoryName"] },
  },
  Group: {
    tables: ["Mas_Group"],
    fields: { "Group Code": ["GrpCode", "GroupCode"], "Group Name": ["GrpName", "GroupName"] },
  },
  Account: {
    tables: ["Mas_Account", "AccountMaster", "Mas_Party"],
    fields: {
      "Account Code": ["AcCode", "AccountCode", "PartyCode", "Code"],
      "Account Name": ["AcName", "AccountName", "PartyName", "Name"],
      Address: ["Address", "Add1", "Address1"], Town: ["Town", "City"], State: ["State", "StateName"],
      "PIN Code": ["PinCode", "PIN", "ZipCode"], "Mobile No": ["MobileNo", "Mobile", "PhoneNo"],
      "Email ID": ["EmailId", "Email", "EMail"], GSTIN: ["GSTNo", "GSTIN", "GSTTinNo"],
      "PAN No": ["PANNo", "PanNumber"], Area: ["AreaCode", "Area", "RouteCode"],
      "Opening Balance": ["OpeningBal", "OpBal", "OpenBal"], "Opening Balance Type": ["OpeningBalType", "OpBalType", "BalType"],
      "Credit Days": ["CreditDays", "CrDays"],
    },
  },
  Product: {
    tables: ["Mas_Product", "ProductMaster"],
    fields: {
      "Product Code": ["ProdCode", "ProductCode", "ICode", "Code"], "Product Name": ["ProdName", "ProductName", "IName", "Name"],
      Company: ["CompCode", "CompanyCode", "SysCompCode"], Group: ["GrpCode", "GroupCode", "Group"], Category: ["CatCode", "CategoryCode", "Category"],
      Description: ["Description", "ProdDesc", "LocalProdName"], "GST %": ["GST", "GSTPer", "VatPer", "TaxPer"],
      "Basic Unit": ["BasicUnit", "Unit", "SaleUnit"], "Box Pack": ["BoxPack", "Packing", "CasePack"], "Inbox Pack": ["InboxPack", "InnerPack"],
      "Retailer Margin": ["RetailerMargin", "RetMargin"], "Distributor Margin": ["DistributorMargin", "DistMargin"], HSN: ["HSN", "HSNCode"],
      Weight: ["Weight", "ProdWeight"], "EAN Code": ["EANCode", "BarCode", "Barcode"], "Rate Per Unit": ["RatePerUnit", "SRate", "SaleRate"],
      "Reorder Level": ["ReorderLevel"], "Min Stock Holding": ["MinStockHolding", "MinStock"], Cess: ["Cess", "CessPer"], "Exp Days": ["ExpDays", "ExpiryDays"],
    },
  },
  Bank: {
    tables: ["Mas_Bank"],
    fields: {
      "Bank Code": ["BankCode", "BCode", "Code"], "Bank Name": ["BankName", "BName", "Name"], "Account Number": ["AccountNumber", "AccountNo", "AcNo"],
      "IFSC Code": ["IFSCCode", "IFISCCode", "IFSC"], "Branch Name": ["BranchName", "Branch"], "Account Type": ["AccountType", "AcType"],
      "Clearing Type": ["ClearingType", "CLType"], "Customer Name": ["CustomerName", "AcName"], "Customer Code": ["CustomerCode", "AcCode"],
      "Mobile No": ["MobileNo", "Mobile"], "Email ID": ["EmailId", "Email"], "UPI ID": ["UPIId", "UPI"],
      "Beneficiary Name": ["BeneficiaryName"], "SWIFT Code": ["SwiftCode", "SWIFT"], "MICR Code": ["MicrCode", "MICR"],
      "PAN Number": ["PanNumber", "PANNo"], Remarks: ["Remarks", "Remark"],
    },
  },
  Salesman: {
    tables: ["Mas_SalesMan", "SalesmanMaster"],
    fields: {
      "Salesman Code": ["SalesmanCode", "SalesManCode", "SSMCode", "SMCode", "SCode", "Code"], "Salesman Name": ["SalesmanName", "SalesManName", "SSMName", "SMName", "SName", "Name"],
      "Salesman Type": ["SalesmanType", "SSMType", "SMType"], "Date of Birth": ["DateOfBirth", "DOB"], Address: ["Address", "Add1"], Town: ["Town", "City"],
      "PIN Code": ["PinCode", "Pin", "PIN"], State: ["State", "StateName"], "Mobile No": ["MobileNo", "Mobile"], "Email ID": ["EmailId", "Email"],
      Qualification: ["Qualification"], Reference: ["Reference", "RefName"], "IMEI No": ["IMEINo", "IMEI"],
    },
  },
  Area: {
    tables: ["Mas_Area", "AreaMaster", "Mas_Route"],
    fields: { "Area Code": ["AreaCode", "RouteCode", "Code"], "Area Name": ["AreaName", "RouteName", "Name"] },
  },
  AreaToPartyMapping: {
    tables: ["Mas_Party"],
    fields: {
      "Company Code": ["CompanyCode", "CompCode", "SysCompCode"], "Company Name": ["CompanyName", "CompName"],
      "Account Code": ["AccountCode", "AcCode", "SysAcCode"], "Account Name": ["AccountName", "AcName"],
      "Area Code": ["AreaCode", "RouteCode"], "Area Name": ["AreaName", "RouteName"],
    },
  },
  SalesmanToAreaMapping: {
    tables: ["Mas_AreaMapping"],
    fields: {
      "Company Code": ["CompanyCode", "CompCode", "SysCompCode"], "Company Name": ["CompanyName", "CompName"],
      "Area Code": ["AreaCode", "RouteCode"], "Area Name": ["AreaName", "RouteName"],
      "Salesman Code": ["SalesmanCode", "SSMCode", "SMCode"], "Salesman Name": ["SalesmanName", "SSMName", "SMName"],
    },
  },
};

const transactionDefinitions = [
  { entryType: "DesktopOpeningStock", label: "Opening Stock", tables: [{ sheet: "Data", names: ["OpeningStock"] }] },
  { entryType: "DesktopSales", label: "Sales", tables: [{ sheet: "Header", names: ["T_Sal_Header", "SalesHeader"] }, { sheet: "Details", names: ["T_Sal_Details", "SalesDetails"] }] },
  { entryType: "DesktopCounterSales", label: "Counter Sales", tables: [{ sheet: "Header", names: ["T_Sal_Header", "SalesHeader"] }, { sheet: "Details", names: ["T_Sal_Details", "SalesDetails"] }] },
  { entryType: "DesktopSalesService", label: "Sales Service", tables: [{ sheet: "Data", names: ["T_SalService"] }] },
  { entryType: "DesktopLoads", label: "Loads", tables: [{ sheet: "Header", names: ["T_LoadInfo"] }, { sheet: "Details", names: ["T_Sal_Header"] }] },
  { entryType: "DesktopSettleLoad", label: "Settle Load Data", tables: [{ sheet: "Data", names: ["T_SmanCollection"] }] },
  { entryType: "DesktopPurchase", label: "Purchase", tables: [{ sheet: "Header", names: ["T_PUR_Header", "T_Pur_Header", "PurchaseHeader"] }, { sheet: "Details", names: ["T_PUR_Details", "T_Pur_Details", "PurchaseDetails"] }] },
  { entryType: "DesktopCreditNote", label: "Credit Note", tables: [{ sheet: "Header", names: ["T_CRN_Header", "T_CreditNote_Header"] }, { sheet: "Details", names: ["T_CRN_Details", "T_CreditNote_Details"] }] },
  { entryType: "DesktopDebitNote", label: "Debit Note", tables: [{ sheet: "Header", names: ["T_Drn_Header", "T_Drn_Header", "T_DebitNote_Header"] }, { sheet: "Details", names: ["T_DRN_Details", "T_Drn_Details", "T_DebitNote_Details"] }] },
  { entryType: "DesktopStockIn", label: "Stock In", tables: [{ sheet: "Header", names: ["T_Siv_Header", "T_StockIn_Header"] }, { sheet: "Details", names: ["T_Siv_Details", "T_StockIn_Details"] }] },
  { entryType: "DesktopStockOut", label: "Stock Out", tables: [{ sheet: "Header", names: ["T_Sov_Header", "T_StockOut_Header"] }, { sheet: "Details", names: ["T_Sov_Details", "T_StockOut_Details"] }] },
  { entryType: "DesktopSelfDamage", label: "Self Damage", tables: [{ sheet: "Header", names: ["T_GodownDam_Header"] }, { sheet: "Details", names: ["T_GodownDam_Details"] }] },
  { entryType: "DesktopDamageStockOut", label: "Damage Stock Out", tables: [{ sheet: "Header", names: ["T_DamOut_Header"] }, { sheet: "Details", names: ["T_DamOut_Details"] }] },
  { entryType: "DesktopReceipt", label: "Receipt", tables: [{ sheet: "Header", names: ["T_REC_Header", "T_Receipt"] }, { sheet: "Details", names: ["T_REC_Details", "T_Receipt_Details"] }] },
  { entryType: "DesktopCHB", label: "Cheque Bounce", tables: [{ sheet: "Data", names: ["T_ChequeBounce"] }] },
  { entryType: "DesktopContra", label: "Contra", tables: [{ sheet: "Data", names: ["T_Contra"] }] },
  { entryType: "DesktopPDC", label: "PDC", tables: [{ sheet: "Data", names: ["PDCDocket", "T_PDCDocket", "T_PDC"] }] },
  { entryType: "DesktopJournalVoucher", label: "Journal Voucher", tables: [{ sheet: "Data", names: ["T_JOU_Header", "T_JournalVoucher"] }] },
  { entryType: "DesktopPayment", label: "Payment", tables: [{ sheet: "Header", names: ["T_Pay_Header"] }, { sheet: "Details", names: ["T_Pay_Details", "T_PAY_ADJUST"] }] },
  { entryType: "DesktopCollectionVoucher", label: "Collection Voucher", tables: [{ sheet: "Header", names: ["T_Col_Header", "T_CollectionVoucher"] }, { sheet: "Details", names: ["T_Col_Details", "T_CollectionVoucher_Details"] }] },
];

const normalizedFileStem = (value) => String(value || "")
  .replace(/\.(xlsx|xls)$/i, "")
  .replace(/_From_Desktop(?:_[0-9a-f-]+)?$/i, "")
  .replace(/[^a-z0-9]/gi, "")
  .toLowerCase();

const excelTypeNames = new Map(DESKTOP_IMPORT_ORDER.flatMap((entryType) => {
  const shortName = entryType.replace(/^Desktop/, "");
  return [[normalizedFileStem(entryType), entryType], [normalizedFileStem(shortName), entryType]];
}));

export const desktopExcelEntryType = (fileName) => excelTypeNames.get(normalizedFileStem(fileName)) || "";

const desktopExcelLabel = (entryType) => importConfig[entryType]?.label
  || transactionDefinitions.find((definition) => definition.entryType === entryType)?.label
  || entryType.replace(/^Desktop/, "");

const cleanCell = (value) => sanitizeSpreadsheetCell(value ?? "");

const normalizedLookup = (object) => new Map(Object.keys(object || {}).map((key) => [key.toLowerCase(), key]));
const valueFromAliases = (row, aliases) => {
  const keys = normalizedLookup(row);
  const alias = aliases.find((name) => keys.has(name.toLowerCase()));
  return alias ? row[keys.get(alias.toLowerCase())] : "";
};

export const mapDesktopRows = ({ entryType, rows, distributorId, firmId, references = {} }) => {
  const target = importConfig[entryType];
  const definition = sourceDefinitions[entryType];
  if (!target || !definition) return [];
  return rows.map((source) => {
    const sourceKeys = normalizedLookup(source);
    const output = {};
    for (const column of target.columns) {
      if (column.excel === "Distributor ID") output[column.excel] = distributorId;
      else if (column.excel === "Firm ID") output[column.excel] = firmId;
      else {
        const alias = (definition.fields[column.excel] || []).find((name) => sourceKeys.has(name.toLowerCase()));
        output[column.excel] = alias ? cleanCell(source[sourceKeys.get(alias.toLowerCase())]) : "";
      }
    }
    const referenceValue = (map, sourceValue, field) => map?.get(String(sourceValue ?? "").trim().toLowerCase())?.[field] || "";
    if (entryType === "Product") {
      const sysCompany = valueFromAliases(source, ["SysCompCode"]);
      if (sysCompany !== "") output.Company = cleanCell(referenceValue(references.companies, sysCompany, "CompCode") || output.Company);
    }
    if (entryType === "AreaToPartyMapping") {
      const sysCompany = valueFromAliases(source, ["SysCompCode", "CompCode"]);
      const sysAccount = valueFromAliases(source, ["SysAcCode", "AcCode"]);
      const areaCode = valueFromAliases(source, ["AreaCode", "RouteCode"]);
      output["Company Code"] = cleanCell(referenceValue(references.companies, sysCompany, "CompCode") || output["Company Code"]);
      output["Company Name"] = cleanCell(referenceValue(references.companies, sysCompany, "CompName") || output["Company Name"]);
      output["Account Code"] = cleanCell(referenceValue(references.accounts, sysAccount, "AcCode") || output["Account Code"]);
      output["Account Name"] = cleanCell(referenceValue(references.accounts, sysAccount, "AcName") || output["Account Name"]);
      output["Area Name"] = cleanCell(referenceValue(references.areas, areaCode, "AreaName") || output["Area Name"]);
    }
    if (entryType === "SalesmanToAreaMapping") {
      const sysCompany = valueFromAliases(source, ["SysCompCode", "CompCode"]);
      const areaCode = valueFromAliases(source, ["AreaCode", "RouteCode"]);
      const salesmanCode = valueFromAliases(source, ["SSMCode", "SMCode", "SalesmanCode"]);
      output["Company Code"] = cleanCell(referenceValue(references.companies, sysCompany, "CompCode") || output["Company Code"]);
      output["Company Name"] = cleanCell(referenceValue(references.companies, sysCompany, "CompName") || output["Company Name"]);
      output["Area Name"] = cleanCell(referenceValue(references.areas, areaCode, "AreaName") || output["Area Name"]);
      output["Salesman Name"] = cleanCell(referenceValue(references.salesmen, salesmanCode, "SSMName") || output["Salesman Name"]);
    }
    return output;
  }).filter((output) => entryType !== "AreaToPartyMapping"
    || (String(output["Area Code"] || "").trim() && String(output["Area Name"] || "").trim()));
};

const quoteSqlName = (value) => `[${String(value).replaceAll("]", "]]" )}]`;
const quoteSqlText = (value) => `N'${String(value).replaceAll("'", "''")}'`;

const sqlcmdArgs = (query, database = "master", server = "(localdb)\\MSSQLLocalDB") => {
  const args = ["-S", server, "-d", database, "-b", "-r", "1", "-y", "0", "-s", "|", "-Q", query];
  if (process.env.DESKTOP_IMPORT_SQL_USER) args.push("-U", process.env.DESKTOP_IMPORT_SQL_USER, "-P", process.env.DESKTOP_IMPORT_SQL_PASSWORD || "");
  else args.push("-E");
  if (process.env.DESKTOP_IMPORT_SQL_TRUST_CERTIFICATE !== "false") args.push("-C");
  return args;
};

const executeSql = async (query, database, server) => {
  const { stdout } = await execFileAsync(process.env.DESKTOP_IMPORT_SQLCMD || "sqlcmd", sqlcmdArgs(query, database, server), {
    windowsHide: true, maxBuffer: 256 * 1024 * 1024, timeout: SQL_TIMEOUT_MS,
  });
  return stdout;
};

export const parseInstalledSqlInstances = (output) => [...String(output).matchAll(/^\s*(\S+)\s+REG_SZ\s+MSSQL(\d+)\./gmi)]
  .map((match) => ({ server: match[1].toUpperCase() === "MSSQLSERVER" ? "localhost" : `.\\${match[1]}`, major: Number(match[2]) }))
  .sort((left, right) => right.major - left.major);

const resolveSqlServer = async () => {
  if (process.env.DESKTOP_IMPORT_SQL_SERVER) return process.env.DESKTOP_IMPORT_SQL_SERVER;
  if (detectedSqlServer) return detectedSqlServer;
  const candidates = [];
  if (process.platform === "win32") {
    const registry = await execFileAsync("reg.exe", ["query", "HKLM\\SOFTWARE\\Microsoft\\Microsoft SQL Server\\Instance Names\\SQL"])
      .then(({ stdout }) => parseInstalledSqlInstances(stdout)).catch(() => []);
    candidates.push(...registry);
  }
  candidates.push({ server: "(localdb)\\MSSQLLocalDB", major: 0 });
  const accessible = [];
  for (const candidate of candidates) {
    try {
      const output = await executeSql("SET NOCOUNT ON; SELECT '[SQL_VERSION:' + CONVERT(varchar(30), SERVERPROPERTY('ProductVersion')) + '][ENGINE_EDITION:' + CONVERT(varchar(10), SERVERPROPERTY('EngineEdition')) + ']';", "master", candidate.server);
      const version = output.match(/\[SQL_VERSION:(\d+)(?:\.\d+)*\]/)?.[1];
      const engineEdition = Number(output.match(/\[ENGINE_EDITION:(\d+)\]/)?.[1]);
      if (version) accessible.push({ server: candidate.server, major: Number(version), express: engineEdition === 4 });
    } catch { /* Try the next installed instance. */ }
  }
  accessible.sort((left, right) => right.major - left.major || Number(left.express) - Number(right.express));
  if (accessible.length) { detectedSqlServer = accessible[0].server; return detectedSqlServer; }
  throw new Error("No accessible SQL Server instance was found. Install or start a SQL Server version at least as new as the uploaded backup, or set DESKTOP_IMPORT_SQL_SERVER.");
};

const runSql = async (query, database, server) => executeSql(query, database, server || await resolveSqlServer());

export const localSqlServiceAccount = (server) => {
  const value = String(server || "").trim();
  if (!value || /\(localdb\)/i.test(value)) return "";
  const match = value.match(/^(?:\.|localhost|\(local\)|[^\\]+)\\([^\\]+)$/i);
  if (!match) return "";
  return `NT SERVICE\\MSSQL$${match[1]}`;
};

const readJsonQuery = async (database, query, server) => {
  const output = await runSql(`SET NOCOUNT ON; ${query} FOR JSON PATH, INCLUDE_NULL_VALUES;`, database, server);
  const compact = output.replace(/\r?\n/g, "");
  const start = compact.indexOf("[");
  const end = compact.lastIndexOf("]");
  if (start < 0 || end < start) return [];
  return JSON.parse(compact.slice(start, end + 1));
};

const decodeXml = (value) => String(value)
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

export const parseSqlXmlRows = (output) => {
  const compact = String(output).replace(/\r?\n/g, "");
  const rows = [];
  for (const rowMatch of compact.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)) {
    const row = {};
    const fields = rowMatch[1].matchAll(/<([A-Za-z_][\w:.-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>|<([A-Za-z_][\w:.-]*)(?:\s[^>]*)?\s*\/>/g);
    for (const field of fields) {
      const encodedName = field[1] || field[3];
      const name = encodedName.replace(/_x([0-9a-f]{4})_/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
      row[name] = field[2] === undefined ? "" : decodeXml(field[2]);
    }
    rows.push(row);
  }
  return rows;
};

const readXmlQuery = async (database, query, server) => {
  const output = await runSql(`SET NOCOUNT ON; ${query} FOR XML PATH('row'), ROOT('rows');`, database, server);
  return parseSqlXmlRows(output);
};

const databaseSupportsJson = async (database, server) => {
  const output = await runSql("SET NOCOUNT ON; SELECT '[' + CONVERT(varchar(3), compatibility_level) + ']' FROM sys.databases WHERE name=DB_NAME();", database, server);
  const compatibilityLevel = Number(output.match(/\[(\d+)\]/)?.[1]);
  return compatibilityLevel >= 130;
};

const updateJob = (job, progress, stage) => { job.progress = progress; job.stage = stage; job.updatedAt = new Date().toISOString(); };
const removeJobFiles = (job) => { if (job?.directory) fs.rm(job.directory, { recursive: true, force: true }, () => {}); };
const ownedJob = (req) => {
  const job = jobs.get(req.params.jobId);
  return job && job.distributorId === req.security.distributorId && job.firmId === req.security.firmId ? job : null;
};
const internalApiUrl = () => String(process.env.DESKTOP_IMPORT_INTERNAL_API_URL || `http://127.0.0.1:${process.env.PORT || 5000}/api`).replace(/\/$/, "");
const sameImportSelection = (previous = {}, fileIds = [], companyCode = "") => {
  const previousIds = [...(previous.fileIds || [])].sort();
  const requestedIds = [...fileIds].sort();
  return String(previous.companyCode || "") === String(companyCode || "")
    && previousIds.length === requestedIds.length
    && previousIds.every((id, index) => id === requestedIds[index]);
};
export const canReuseDesktopImportPlan = ({ importPlan, importState, importOptions }, fileIds = [], companyCode = "") => Boolean(
  importPlan
  && !importState
  && sameImportSelection(importOptions, fileIds, companyCode)
);
const summarizePreflight = (plan) => ({
  totals: plan.totals,
  files: plan.files.map(({ records, ...file }) => file),
  report: plan.report.slice(0, 500),
  reportTruncated: plan.report.length > 500,
});
const createWorkbook = (job, entryType, rows) => {
  const config = importConfig[entryType];
  const fileName = `${entryType.replace(/([a-z])([A-Z])/g, "$1_$2")}_From_Desktop_${job.id.slice(0, 8)}.xlsx`;
  const filePath = path.join(job.directory, fileName);
  const sheet = XLSX.utils.json_to_sheet(rows.map(sanitizeSpreadsheetRow), { header: config.columns.map((column) => column.excel) });
  sheet["!cols"] = config.columns.map((column) => ({ wch: Math.min(30, Math.max(12, column.excel.length + 2)) }));
  const instructions = XLSX.utils.json_to_sheet(config.columns.map((column) => ({
    Field: column.excel, Required: column.required ? "YES" : "NO", Format: column.type === "number" ? "Number" : "Text",
  })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Data");
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
  XLSX.writeFile(workbook, filePath, { compression: true });
  return { id: crypto.randomUUID(), entryType, label: config.label, fileName, filePath, rows: rows.length };
};

export const createSourceWorkbook = (job, definition, sheets, dataRows) => {
  const fileName = `${definition.entryType.replace(/^Desktop/, "")}_From_Desktop_${job.id.slice(0, 8)}.xlsx`;
  const filePath = path.join(job.directory, fileName);
  const workbook = XLSX.utils.book_new();
  const payloads = dataRows.map((row) => {
    const json = Object.keys(row).filter((key) => /^ERP Payload JSON(?: \d+)?$/.test(key))
      .sort((left, right) => Number(left.match(/\d+$/)?.[0] || 1) - Number(right.match(/\d+$/)?.[0] || 1))
      .map((key) => String(row[key] || "")).join("");
    const payload = JSON.parse(json);
    delete payload._desktopImport;
    return payload;
  });
  const nestedFields = ["items", "Bills", "receiptBills", "allocations", "lines", "bills", "cheques"];
  const identityFields = {
    DesktopSales: ["BillSeries", "BillNo"], DesktopPurchase: ["vouSer", "vouNo"],
    DesktopCreditNote: ["CreditNoteSeries", "CreditNoteNo"], DesktopDebitNote: ["DebitNoteSeries", "DebitNoteNo"],
    DesktopReceipt: ["billSeries", "rno"], DesktopJournalVoucher: ["vDate", "vNo"],
    DesktopCollectionVoucher: ["collectionDate", "colVNo"], DesktopPDC: ["docSeries", "docVNo"],
    DesktopCounterSales: ["BillSeries", "BillNo"], DesktopSalesService: ["voucherSeries", "voucherNo"],
    DesktopLoads: ["LoadSeries", "LoadNo"], DesktopSettleLoad: ["loadSeries", "loadNo"], DesktopPayment: ["vNo"],
  }[definition.entryType] || [];
  const excelValue = (value) => value && typeof value === "object" ? JSON.stringify(value) : value;
  const headerRows = payloads.map((payload) => {
    const entries = Object.entries(payload)
      .filter(([name]) => !nestedFields.includes(name))
      .map(([name, value]) => [name, excelValue(value)]);
    return sanitizeSpreadsheetRow(Object.fromEntries(entries));
  });
  const dataSheet = XLSX.utils.json_to_sheet(headerRows);
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Data");
  for (const nestedField of nestedFields) {
    const rows = payloads.flatMap((payload) => {
      const nestedItems = Array.isArray(payload[nestedField]) ? payload[nestedField] : [];
      return nestedItems.map((item) => sanitizeSpreadsheetRow({
        ...Object.fromEntries(identityFields.map((field) => [field, payload[field]])),
        ...Object.fromEntries(Object.entries(item).map(([name, value]) => [name, excelValue(value)])),
      }));
    });
    if (rows.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), nestedField);
  }
  XLSX.writeFile(workbook, filePath, { compression: true });
  return { id: crypto.randomUUID(), entryType: definition.entryType, label: definition.label, fileName, filePath, rows: dataRows.length, sourceRows: sheets.reduce((total, source) => total + source.rows.length, 0), importable: true };
};

export const generateDesktopImportFiles = async (job, backupFiles) => {
  const backupPaths = Array.isArray(backupFiles) ? backupFiles : [backupFiles];
  const backupDevices = backupPaths.map((backupPath) => `DISK=${quoteSqlText(backupPath)}`).join(", ");
  const database = `ERPDesktopImport_${job.id.replaceAll("-", "")}`;
  try {
    const sqlServer = await resolveSqlServer();
    job.sqlServer = sqlServer;
    const sqlServiceAccount = process.platform === "win32" ? localSqlServiceAccount(sqlServer) : "";
    if (sqlServiceAccount) {
      await execFileAsync("icacls.exe", [job.directory, "/grant", `${sqlServiceAccount}:(OI)(CI)M`, "/T", "/Q"], { windowsHide: true }).catch(() => {});
    }
    updateJob(job, 15, "Reading SQL Server backup metadata");
    const fileList = await runSql(`RESTORE FILELISTONLY FROM ${backupDevices};`, undefined, sqlServer);
    const lines = fileList.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const records = lines.map((line) => line.split("|").map((part) => part.trim())).filter((parts) => parts.length >= 3);
    const databaseFiles = records.filter((parts) => parts[2] === "D" || parts[2] === "L");
    if (!databaseFiles.some((parts) => parts[2] === "D") || !databaseFiles.some((parts) => parts[2] === "L")) throw new Error("The backup file does not contain a readable SQL Server data and log file.");
    const moves = databaseFiles.map((parts, index) => {
      const extension = parts[2] === "L" ? ".ldf" : index === 0 ? ".mdf" : ".ndf";
      return `MOVE ${quoteSqlText(parts[0])} TO ${quoteSqlText(path.join(job.directory, `${database}_${index}${extension}`))}`;
    });

    const existingDatabase = await runSql(`SET NOCOUNT ON; SELECT CASE WHEN DB_ID(${quoteSqlText(database)}) IS NULL THEN '0' ELSE '1' END;`, undefined, sqlServer);
    if (/(^|\s)1(\s|$)/.test(existingDatabase)) throw new Error("The isolated restore database already exists.");
    updateJob(job, 22, "Restoring desktop database in an isolated workspace");
    await runSql(`RESTORE DATABASE ${quoteSqlName(database)} FROM ${backupDevices} WITH ${moves.join(", ")}, RECOVERY;`, undefined, sqlServer);

    updateJob(job, 48, "Inspecting desktop master tables");
    const readRows = await databaseSupportsJson(database, sqlServer) ? readJsonQuery : readXmlQuery;
    const tables = await readRows(database, "SELECT TABLE_SCHEMA AS [schema], TABLE_NAME AS [name] FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'", sqlServer);
    const tableIndex = new Map(tables.map((table) => [String(table.name).toLowerCase(), table]));
    const available = Object.entries(sourceDefinitions).filter(([, definition]) => definition.tables.some((name) => tableIndex.has(name.toLowerCase())));
    if (!available.length) throw new Error("No supported desktop master tables were found in this backup.");

    const loadSourceTable = async (name) => {
      const table = tableIndex.get(name.toLowerCase());
      return table ? readRows(database, `SELECT * FROM ${quoteSqlName(table.schema)}.${quoteSqlName(table.name)}`, sqlServer) : [];
    };
    const mapReference = (rows, aliases) => new Map(rows.map((row) => {
      const field = aliases.find((alias) => Object.hasOwn(row, alias));
      return [String(field ? row[field] : "").trim().toLowerCase(), row];
    }).filter(([key]) => key));
    const [referenceProducts, referenceAccounts, referenceCompanies, referenceSalesmen, referenceAreas, referenceGodowns, referenceServices] = await Promise.all([
      loadSourceTable("Mas_Product"), loadSourceTable("Mas_Account"), loadSourceTable("Mas_Company"),
      loadSourceTable("Mas_SalesMan"), loadSourceTable("Mas_Area"), loadSourceTable("Mas_GoDown"), loadSourceTable("Mas_Service"),
    ]);
    const references = {
      products: mapReference(referenceProducts, ["SysProdCode", "ProdCode"]),
      accounts: mapReference(referenceAccounts, ["SysAcCode", "AcCode"]),
      companies: mapReference(referenceCompanies, ["SysCompCode", "CompCode"]),
      salesmen: mapReference(referenceSalesmen, ["SSMCode", "SalesmanCode", "SMCode"]),
      areas: mapReference(referenceAreas, ["AreaCode", "RouteCode"]),
      godowns: mapReference(referenceGodowns, ["GDCode", "GodownCode"]),
      services: mapReference(referenceServices, ["SysServiceCode", "ServiceCode"]),
    };
    const generated = [];
    for (let index = 0; index < available.length; index += 1) {
      const [entryType, definition] = available[index];
      const tableName = definition.tables.find((name) => tableIndex.has(name.toLowerCase()));
      const table = tableIndex.get(tableName.toLowerCase());
      updateJob(job, 52 + Math.round((index / available.length) * 38), `Converting ${importConfig[entryType].label}`);
      let sourceRows = await readRows(database, `SELECT * FROM ${quoteSqlName(table.schema)}.${quoteSqlName(table.name)}`, sqlServer);
      const mapped = mapDesktopRows({ entryType, rows: sourceRows, distributorId: job.exportDistributorId || job.distributorId, firmId: job.exportFirmId || job.firmId, references });
      if (mapped.length) generated.push(createWorkbook(job, entryType, mapped));
    }
    for (let index = 0; index < transactionDefinitions.length; index += 1) {
      const definition = transactionDefinitions[index];
      updateJob(job, 72 + Math.round((index / transactionDefinitions.length) * 23), `Exporting ${definition.label}`);
      const sheets = [];
      for (const source of definition.tables) {
        const tableName = source.names.find((name) => tableIndex.has(name.toLowerCase()));
        if (!tableName) continue;
        const table = tableIndex.get(tableName.toLowerCase());
        let rows = await readRows(database, `SELECT * FROM ${quoteSqlName(table.schema)}.${quoteSqlName(table.name)}`, sqlServer);
        if (source.sheet === "Header" && ["DesktopSales", "DesktopCounterSales"].includes(definition.entryType)) {
          const isCounter = (row) => ["C", "CS", "COUNTER", "COUNTER_SALES"].includes(String(row.EntryType || "").trim().toUpperCase());
          rows = rows.filter((row) => definition.entryType === "DesktopCounterSales" ? isCounter(row) : !isCounter(row));
        }
        if (rows.length) sheets.push({ sheet: source.sheet, rows });
      }
      if (sheets.length) {
        const exportJob = { ...job, distributorId: job.exportDistributorId || job.distributorId, firmId: job.exportFirmId || job.firmId };
        const dataRows = buildDesktopTransactionRows({ job: exportJob, definition, sheets, references });
        if (dataRows.length) generated.push(createSourceWorkbook(job, definition, sheets, dataRows));
      }
    }
    generated.sort((left, right) => DESKTOP_IMPORT_ORDER.indexOf(left.entryType) - DESKTOP_IMPORT_ORDER.indexOf(right.entryType));
    job.files = generated.map(({ filePath, ...file }) => file);
    job.filePaths = new Map(generated.map((file) => [file.id, file.filePath]));
    if (!job.files.length) throw new Error("Supported tables were found, but they did not contain any rows.");
    job.status = "completed";
    updateJob(job, 100, `${job.files.length} Excel file(s) are ready`);
  } catch (error) {
    job.status = "failed";
    const detail = String(error?.stderr || error?.message || "Desktop backup conversion failed.").trim();
    console.error("Desktop backup conversion failed", { jobId: job.id, code: String(error?.code || "RESTORE_FAILED") });
    job.error = detail.includes("media families")
      ? "This is one part of a multi-file SQL Server backup. Select every .bak part from the same backup set and generate again."
      : /Msg 3169|incompatible with this server/i.test(detail)
        ? `The uploaded backup is newer than the available restore engine (${job.sqlServer || "unknown"}). Install/start a SQL Server version at least as new as the backup, or set DESKTOP_IMPORT_SQL_SERVER to that instance. SQL Server backup files cannot be restored by an older engine.`
        : "Desktop backup conversion failed. Review the server log using the job ID and retry with a verified backup.";
    updateJob(job, job.progress || 0, "Conversion failed");
  } finally {
    await runSql(`IF DB_ID(${quoteSqlText(database)}) IS NOT NULL BEGIN ALTER DATABASE ${quoteSqlName(database)} SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ${quoteSqlName(database)}; END;`, undefined, job.sqlServer).catch(() => {});
    backupPaths.forEach((backupPath) => fs.rm(backupPath, { force: true }, () => {}));
  }
};

export default function createDesktopImportRouter({ authorizeRequest }) {
  const router = express.Router();
  const canImportDesktop = authorizeRequest("TOOLS", "DESKTOP_IMPORT", "add");
  const upload = multer({
    storage: multer.diskStorage({
      destination(req, file, callback) { callback(null, req.desktopImportDirectory); },
      filename(req, file, callback) { callback(null, `${crypto.randomUUID()}.bak`); },
    }),
    limits: { fileSize: MAX_BACKUP_BYTES, files: MAX_BACKUP_FILES },
    fileFilter(req, file, callback) { callback(null, path.extname(file.originalname).toLowerCase() === ".bak"); },
  });
  const excelUpload = multer({
    storage: multer.diskStorage({
      destination(req, file, callback) { callback(null, req.desktopImportDirectory); },
      filename(req, file, callback) { callback(null, `${crypto.randomUUID()}.xlsx`); },
    }),
    limits: { fileSize: MAX_EXCEL_BYTES, files: MAX_EXCEL_FILES },
    fileFilter(req, file, callback) { callback(null, [".xlsx", ".xls"].includes(path.extname(file.originalname).toLowerCase())); },
  });

  const allowDesktopImportTime = (req, res, next) => {
    req.setTimeout(ACTION_TIMEOUT_MS);
    res.setTimeout(ACTION_TIMEOUT_MS);
    next();
  };

  const rejectActiveJob = (req, res, next) => {
    const activeForTenant = [...jobs.values()].some((job) =>
      job.distributorId === req.security.distributorId && job.firmId === req.security.firmId &&
      ["processing", "running", "paused", "rolling_back"].includes(job.status === "completed" ? job.import?.status : job.status)
    );
    if (activeForTenant) return res.status(429).json({ success: false, message: "A desktop import job is already active for this firm." });
    next();
  };

  router.post("/desktop-import/generate", canImportDesktop, rejectActiveJob, allowDesktopImportTime, (req, res, next) => {
    req.setTimeout(SQL_TIMEOUT_MS + 60_000);
    req.desktopImportDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "erp-desktop-import-"));
    next();
  }, upload.array("backup", MAX_BACKUP_FILES), (req, res) => {
    if (!req.files?.length) { fs.rmSync(req.desktopImportDirectory, { recursive: true, force: true }); return res.status(400).json({ success: false, message: "Please select one or more valid .bak SQL Server backup files." }); }
    const uploadedBytes = req.files.reduce((total, file) => total + Number(file.size || 0), 0);
    if (uploadedBytes > MAX_BACKUP_TOTAL_BYTES) {
      fs.rmSync(req.desktopImportDirectory, { recursive: true, force: true });
      return res.status(413).json({ success: false, message: `Combined backup files exceed the ${Math.round(MAX_BACKUP_TOTAL_BYTES / 1024 / 1024)} MB tenant upload limit.` });
    }
    const invalidUpload = req.files.some((file) => {
      const handle = fs.openSync(file.path, "r");
      try {
        const header = Buffer.alloc(512);
        const bytes = fs.readSync(handle, header, 0, header.length, 0);
        return !isLikelySqlServerBackup(header.subarray(0, bytes));
      } finally { fs.closeSync(handle); }
    });
    if (invalidUpload) {
      fs.rmSync(req.desktopImportDirectory, { recursive: true, force: true });
      return res.status(415).json({ success: false, message: "Every upload must be a native SQL Server backup file." });
    }
    const exportDistributorId = String(req.body?.exportDistributorId || req.security.distributorId).trim();
    const exportFirmId = String(req.body?.exportFirmId || req.security.firmId).trim();
    if (!exportDistributorId || !exportFirmId || exportDistributorId.length > 100 || exportFirmId.length > 100) {
      fs.rmSync(req.desktopImportDirectory, { recursive: true, force: true });
      return res.status(400).json({ success: false, message: "Enter valid Distributor ID and Firm ID values for the generated Excel files." });
    }
    const id = crypto.randomUUID();
    const job = { id, status: "processing", progress: 12, stage: "Backup uploaded", directory: req.desktopImportDirectory, distributorId: req.security.distributorId, firmId: req.security.firmId, exportDistributorId, exportFirmId, firmName: req.security.firmName || "", files: [], createdAt: new Date().toISOString() };
    jobs.set(id, job);
    generateDesktopImportFiles(job, req.files.map((file) => file.path));
    return res.status(202).json({ success: true, jobId: id });
  });

  router.post("/desktop-import/upload-excel", canImportDesktop, rejectActiveJob, allowDesktopImportTime, (req, res, next) => {
    req.desktopImportDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "erp-desktop-excel-"));
    next();
  }, excelUpload.array("excel", MAX_EXCEL_FILES), async (req, res) => {
    if (!req.files?.length) {
      fs.rmSync(req.desktopImportDirectory, { recursive: true, force: true });
      return res.status(400).json({ success: false, message: "Please select one or more ERP Excel files." });
    }
    try {
      const seenTypes = new Set();
      const importedFiles = [];
      for (const file of req.files) {
        const entryType = desktopExcelEntryType(file.originalname);
        if (!entryType) throw Object.assign(new Error(`${file.originalname} is not a recognized ERP desktop export file.`), { status: 415 });
        if (seenTypes.has(entryType)) throw Object.assign(new Error(`Select only one ${desktopExcelLabel(entryType)} file.`), { status: 400 });
        seenTypes.add(entryType);
        const records = path.extname(file.originalname).toLowerCase() === ".xls"
          ? readDesktopWorkbook(file.path, entryType)
          : await readDesktopWorkbookStreaming(file.path, entryType);
        importedFiles.push({ id: crypto.randomUUID(), entryType, label: desktopExcelLabel(entryType), fileName: file.originalname, rows: records.length, importable: true, filePath: file.path, records });
      }
      importedFiles.sort((left, right) => DESKTOP_IMPORT_ORDER.indexOf(left.entryType) - DESKTOP_IMPORT_ORDER.indexOf(right.entryType));
      const id = crypto.randomUUID();
      const job = {
        id, status: "completed", progress: 100, stage: `${importedFiles.length} Excel file(s) are ready to import`, source: "excel",
        directory: req.desktopImportDirectory, distributorId: req.security.distributorId, firmId: req.security.firmId,
        firmName: req.security.firmName || "", files: importedFiles.map(({ filePath, records, ...file }) => file),
        filePaths: new Map(importedFiles.map((file) => [file.id, file.filePath])), createdAt: new Date().toISOString(),
        parsedRecords: new Map(importedFiles.map((file) => [file.id, file.records])),
      };
      jobs.set(id, job);
      return res.status(201).json({ success: true, job: { id: job.id, status: job.status, progress: job.progress, stage: job.stage, source: job.source, files: job.files } });
    } catch (error) {
      fs.rmSync(req.desktopImportDirectory, { recursive: true, force: true });
      return res.status(error.status || 415).json({ success: false, message: error.message || "The selected Excel files could not be read." });
    }
  });

  router.get("/desktop-import/jobs/:jobId", canImportDesktop, (req, res) => {
    const job = ownedJob(req);
    if (!job) return res.status(404).json({ success: false, message: "Conversion job was not found or has expired." });
    return res.json({ success: true, job: { id: job.id, status: job.status, progress: job.progress, stage: job.stage, source: job.source, error: job.error, files: job.files, preflight: job.preflight, import: publicImportState(job.import) } });
  });

  router.get("/desktop-import/jobs/:jobId/files/:fileId", canImportDesktop, (req, res) => {
    const job = ownedJob(req);
    const file = job?.files.find((item) => item.id === req.params.fileId);
    if (!job || !file) return res.status(404).json({ success: false, message: "Generated Excel file was not found." });
    return res.download(job.filePaths.get(file.id), file.fileName);
  });

  router.post("/desktop-import/jobs/:jobId/preflight", canImportDesktop, allowDesktopImportTime, express.json({ limit: "2mb" }), async (req, res, next) => {
    try {
      const job = ownedJob(req);
      if (!job || job.status !== "completed") return res.status(404).json({ success: false, message: "Completed conversion job was not found." });
      const fileIds = Array.isArray(req.body?.fileIds) ? req.body.fileIds : [];
      const companyCode = String(req.body?.companyCode || "").trim();
      // Reuse the exact dry-run result when the selection is unchanged. Large
      // transaction workbooks no longer have to be parsed and queried twice.
      const plan = canReuseDesktopImportPlan({ importPlan: job.importPlan, importState: job.import, importOptions: job.importOptions }, fileIds, companyCode)
        ? job.importPlan
        : await preflightDesktopImport({ job, fileIds, companyCode });
      job.importPlan = plan;
      job.importOptions = { fileIds, companyCode };
      job.preflight = summarizePreflight(plan);
      return res.json({ success: true, preflight: job.preflight });
    } catch (error) { next(error); }
  });

  router.post("/desktop-import/jobs/:jobId/import", canImportDesktop, allowDesktopImportTime, express.json({ limit: "2mb" }), async (req, res, next) => {
    try {
      const job = ownedJob(req);
      if (!job || job.status !== "completed") return res.status(404).json({ success: false, message: "Completed conversion job was not found." });
      if (["running", "paused", "rolling_back"].includes(job.import?.status)) return res.status(409).json({ success: false, message: "This desktop import job is already active." });
      const fileIds = Array.isArray(req.body?.fileIds) ? req.body.fileIds : [];
      const companyCode = String(req.body?.companyCode || "").trim();
      // Once an import has run, its cached plan is stale: rows committed by
      // that run are still marked "ready" in memory. Rebuild preflight so a
      // second Import Selected click queries MongoDB again and processes only
      // records that are still missing.
      const plan = canReuseDesktopImportPlan({ importPlan: job.importPlan, importState: job.import, importOptions: job.importOptions }, fileIds, companyCode)
        ? job.importPlan
        : await preflightDesktopImport({ job, fileIds, companyCode });
      job.importPlan = plan; job.importOptions = { fileIds, companyCode }; job.preflight = summarizePreflight(plan);
      if (plan.totals.errors) return res.status(422).json({ success: false, message: "Preflight found errors. Fix them before importing.", preflight: job.preflight });
      const state = {
        status: "queued", total: plan.totals.ready, processed: 0, imported: 0, failed: 0,
        duplicates: plan.totals.duplicates, errors: plan.totals.errors, warnings: plan.totals.warnings,
        files: plan.files.map((file) => ({ id: file.id, entryType: file.entryType, label: file.label, fileName: file.fileName, total: file.ready, processed: 0, imported: 0, failed: 0, duplicates: file.duplicates, status: file.ready ? "queued" : "skipped", startedAt: null, updatedAt: null, finishedAt: null })),
        failures: [], rollback: [], createdAt: new Date().toISOString(),
      };
      job.import = state;
      runDesktopImport({ job, plan, state, companyCode, authorization: req.get("authorization") || "", baseUrl: internalApiUrl() });
      return res.status(202).json({ success: true, message: "Desktop batch import started.", import: publicImportState(state) });
    } catch (error) { next(error); }
  });

  router.post("/desktop-import/jobs/:jobId/import/pause", canImportDesktop, (req, res) => {
    const job = ownedJob(req);
    if (!job?.import || job.import.status !== "running") return res.status(409).json({ success: false, message: "No running import is available to pause." });
    job.import.status = "paused"; job.import.updatedAt = new Date().toISOString();
    return res.json({ success: true, import: publicImportState(job.import) });
  });

  router.post("/desktop-import/jobs/:jobId/import/resume", canImportDesktop, (req, res) => {
    const job = ownedJob(req);
    if (!job?.import || job.import.status !== "paused") return res.status(409).json({ success: false, message: "No paused import is available to resume." });
    job.import.status = "running"; job.import.updatedAt = new Date().toISOString();
    return res.json({ success: true, import: publicImportState(job.import) });
  });

  router.post("/desktop-import/jobs/:jobId/import/retry", canImportDesktop, async (req, res) => {
    const job = ownedJob(req);
    if (!job?.import || !job.import.failures?.length || !job.importPlan) return res.status(409).json({ success: false, message: "No failed rows are available to retry." });
    if (["running", "paused", "rolling_back"].includes(job.import.status)) return res.status(409).json({ success: false, message: "Wait for the current operation to finish." });
    const retryTotal = job.import.failures.length;
    job.import.total = retryTotal; job.import.processed = 0; job.import.imported = 0; job.import.failed = 0; job.import.startedAt = null; job.import.finishedAt = null;
    job.import.files.forEach((file) => { file.total = job.import.failures.filter((failure) => failure.fileId === file.id).length; file.processed = 0; file.imported = 0; file.failed = 0; file.status = file.total ? "queued" : "skipped"; file.startedAt = null; file.updatedAt = null; file.finishedAt = null; });
    runDesktopImport({ job, plan: job.importPlan, state: job.import, companyCode: job.importOptions.companyCode, authorization: req.get("authorization") || "", baseUrl: internalApiUrl(), retryOnly: true });
    return res.status(202).json({ success: true, message: "Retry started.", import: publicImportState(job.import) });
  });

  router.post("/desktop-import/jobs/:jobId/import/rollback", canImportDesktop, async (req, res) => {
    const job = ownedJob(req);
    if (!job?.import?.rollback?.length) return res.status(409).json({ success: false, message: "No imported records are available to roll back." });
    if (["running", "paused", "rolling_back"].includes(job.import.status)) return res.status(409).json({ success: false, message: "Wait for the current operation to finish." });
    rollbackDesktopImport({ state: job.import, authorization: req.get("authorization") || "", baseUrl: internalApiUrl() });
    return res.status(202).json({ success: true, message: "Rollback started.", import: publicImportState(job.import) });
  });

  router.get("/desktop-import/jobs/:jobId/import/report", canImportDesktop, (req, res) => {
    const job = ownedJob(req);
    if (!job) return res.status(404).json({ success: false, message: "Desktop import job was not found." });
    const rows = [...(job.importPlan?.report || job.preflight?.report || []), ...(job.import?.failures || []).map((failure) => ({ ...failure, status: "failed" }))];
    const csv = [["File", "Entry Type", "Row", "Status", "Message"], ...rows.map((row) => [row.file, row.entryType, row.row, row.status, row.message])].map((row) => row.map(csvCell).join(",")).join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8"); res.setHeader("Content-Disposition", `attachment; filename="Desktop_Import_Report_${job.id.slice(0, 8)}.csv"`);
    return res.send(`\uFEFF${csv}`);
  });

  router.use((error, req, res, next) => {
    if (req.desktopImportDirectory) fs.rm(req.desktopImportDirectory, { recursive: true, force: true }, () => {});
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ success: false, message: req.path.includes("upload-excel") ? `Excel file is larger than the ${Math.round(MAX_EXCEL_BYTES / 1024 / 1024)} MB limit.` : `Backup file is larger than the ${Math.round(MAX_BACKUP_BYTES / 1024 / 1024)} MB limit.` });
    return res.status(500).json({ success: false, message: error.message || "Desktop backup upload failed." });
  });
  return router;
}

setInterval(() => {
  const expiredBefore = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) if (new Date(job.createdAt).getTime() < expiredBefore) { removeJobFiles(job); jobs.delete(id); }
}, Math.min(JOB_TTL_MS, 10 * 60 * 1000)).unref();
