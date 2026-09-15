import fs from "fs";
import ExcelJS from "exceljs";
import mongoose from "mongoose";
import path from "path";
import * as XLSX from "xlsx";
import { importConfig } from "./importConfig.js";

const DESKTOP_TRANSACTION_CONCURRENCY = Math.max(1, Math.min(16, Number.parseInt(process.env.DESKTOP_IMPORT_TRANSACTION_CONCURRENCY || "8", 10) || 8));
const DESKTOP_TRANSACTION_BATCH_SIZE = Math.max(25, Math.min(500, Number.parseInt(process.env.DESKTOP_IMPORT_TRANSACTION_BATCH_SIZE || "100", 10) || 100));
const DESKTOP_PRODUCT_BATCH_SIZE = Math.max(25, Math.min(250, Number.parseInt(process.env.DESKTOP_IMPORT_PRODUCT_BATCH_SIZE || "100", 10) || 100));

const SERIAL_DESKTOP_TRANSACTION_TYPES = new Set([
  "DesktopOpeningStock",
  "DesktopStockOut",
  "DesktopSelfDamage",
  "DesktopDamageStockOut",
]);

export const desktopTransactionConcurrency = (entryType) => SERIAL_DESKTOP_TRANSACTION_TYPES.has(entryType)
  ? 1
  : DESKTOP_TRANSACTION_CONCURRENCY;

// Vouchers that touch the same stock batch or outstanding bill must retain
// their original order. Independent vouchers can safely run together. This
// gives imports bounded parallelism without changing stock/allocation logic.
export const desktopTransactionConflictKeys = (entryType, payload = {}) => {
  const definition = transactionDefinitions[entryType];
  const nested = definition?.nested && Array.isArray(payload[definition.nested])
    ? payload[definition.nested]
    : [];
  const keys = new Set();
  if (["DesktopPurchase", "DesktopSales", "DesktopCounterSales", "DesktopCreditNote", "DesktopDebitNote"].includes(entryType)) {
    const godown = normalize(payload.GDCode || payload.gdCode);
    for (const item of nested) {
      const product = normalize(item.productCode || item.prodCode || item.ProductCode || item.code || item.productId);
      if (product) keys.add(`stock|${godown}|${product}`);
    }
  }
  if (entryType === "DesktopReceipt") {
    for (const bill of nested) {
      const openingId = normalize(bill.openingTransactionId);
      if (openingId) keys.add(`opening|${openingId}`);
      else keys.add(`sale|${normalize(bill.trnSeries || bill.billSeries)}|${normalize(bill.trnNo || bill.billNo)}`);
    }
  }
  return keys;
};

export const createConflictFreeWaves = (records, entryType, concurrency) => {
  const pending = [...records];
  const waves = [];
  while (pending.length) {
    const used = new Set();
    const wave = [];
    for (let index = 0; index < pending.length && wave.length < concurrency;) {
      const keys = desktopTransactionConflictKeys(entryType, pending[index].payload);
      if ([...keys].some((key) => used.has(key))) { index += 1; continue; }
      keys.forEach((key) => used.add(key));
      wave.push(pending.splice(index, 1)[0]);
    }
    // A record can always enter an empty wave, including records without keys.
    waves.push(wave.length ? wave : [pending.shift()]);
  }
  return waves;
};

export const DESKTOP_IMPORT_ORDER = [
  "Company", "Category", "Group", "Product", "Account", "Bank", "Area", "Salesman",
  "AreaToPartyMapping", "SalesmanToAreaMapping", "DesktopOpeningStock", "DesktopPurchase",
  "DesktopStockIn", "DesktopSales", "DesktopCounterSales", "DesktopSalesService", "DesktopLoads",
  "DesktopSettleLoad", "DesktopStockOut", "DesktopSelfDamage", "DesktopDamageStockOut",
  "DesktopCreditNote", "DesktopDebitNote", "DesktopReceipt", "DesktopCHB", "DesktopPDC",
  "DesktopJournalVoucher", "DesktopContra", "DesktopPayment", "DesktopCollectionVoucher",
];

const transactionDefinitions = {
  DesktopOpeningStock: { endpoint: "/stock/adjust", required: ["adjustmentType", "prodCode", "quantity"], collection: "T_Stock_Adjustment", duplicate: ["RequestId"], payloadDuplicate: ["requestId"], deleteEndpoint: "/stock/adjustments" },
  DesktopPurchase: { endpoint: "/purchase", nested: "items", identity: ["vouSer", "vouNo"], required: ["vouNo", "supplierCode", "items"], collection: "T_Pur_Header", duplicate: ["vouSer", "vouNo"], deleteEndpoint: "/purchase" },
  DesktopSales: { endpoint: "/sales", nested: "items", identity: ["BillSeries", "BillNo"], required: ["BillNo", "PartyCode", "items"], collection: "T_Sal_Header", duplicate: ["BillSeries", "BillNo"], deleteEndpoint: "/sales" },
  DesktopCounterSales: { endpoint: "/sales", nested: "items", identity: ["BillSeries", "BillNo"], required: ["BillNo", "PartyCode", "items"], collection: "T_Sal_Header", duplicate: ["BillSeries", "BillNo"], deleteEndpoint: "/sales" },
  DesktopSalesService: { endpoint: "/sales-services", nested: "items", identity: ["voucherSeries", "voucherNo"], required: ["voucherDate", "partyCode", "items"], collection: "T_SalesService", duplicate: ["voucherSeries", "voucherNo"], deleteEndpoint: "/sales-services" },
  DesktopLoads: { endpoint: "/create-load", nested: "Bills", identity: ["LoadSeries", "LoadNo"], required: ["LoadNo", "Bills"], collection: "T_Load_Header", duplicate: ["LoadSeries", "LoadNo"], deleteEndpoint: "/create-load" },
  DesktopSettleLoad: { endpoint: "/settle-load/save", nested: "items", identity: ["loadSeries", "loadNo"], required: ["loadNo", "settlementDate", "items"], collection: "T_SettleLoad", duplicate: ["loadSeries", "loadNo"], deleteEndpoint: "/settle-load" },
  DesktopCreditNote: { endpoint: "/credit-note", nested: "items", identity: ["CreditNoteSeries", "CreditNoteNo"], required: ["CreditNoteNo", "PartyCode", "items"], collection: "T_CreditNote_Header", duplicate: ["CreditNoteSeries", "CreditNoteNo"], deleteEndpoint: "/credit-note" },
  DesktopDebitNote: { endpoint: "/debit-note", nested: "items", identity: ["DebitNoteSeries", "DebitNoteNo"], required: ["DebitNoteNo", "SupplierCode", "items"], collection: "T_DebitNote_Header", duplicate: ["DebitNoteSeries", "DebitNoteNo"], deleteEndpoint: "/debit-note" },
  DesktopStockIn: { endpoint: "/stock/adjust", required: ["adjustmentType", "prodCode", "quantity"], collection: "T_Stock_Adjustment", duplicate: ["RequestId"], payloadDuplicate: ["requestId"], deleteEndpoint: "/stock/adjustments" },
  DesktopStockOut: { endpoint: "/stock/adjust", required: ["adjustmentType", "prodCode", "quantity"], collection: "T_Stock_Adjustment", duplicate: ["RequestId"], payloadDuplicate: ["requestId"], deleteEndpoint: "/stock/adjustments" },
  DesktopSelfDamage: { endpoint: "/stock/adjust", required: ["adjustmentType", "prodCode", "quantity"], collection: "T_Stock_Adjustment", duplicate: ["RequestId"], payloadDuplicate: ["requestId"], deleteEndpoint: "/stock/adjustments" },
  DesktopDamageStockOut: { endpoint: "/stock/adjust", required: ["adjustmentType", "prodCode", "quantity"], collection: "T_Stock_Adjustment", duplicate: ["RequestId"], payloadDuplicate: ["requestId"], deleteEndpoint: "/stock/adjustments" },
  DesktopReceipt: { endpoint: "/transaction/receipt", nested: "receiptBills", identity: ["billSeries", "rno"], required: ["rno", "partyId", "receiptBills"], collection: "T_Receipt", duplicate: ["billSeries", "rno"], deleteEndpoint: "/transaction/receipt" },
  DesktopCHB: { endpoint: "/transaction/cheque-bounce", required: ["chqBounceDate", "trnNo", "partyId"], collection: "T_ChequeBounce", duplicate: ["trnSeries", "trnNo"], deleteEndpoint: "/transaction/cheque-bounce" },
  DesktopContra: { endpoint: "/transaction/contra", required: ["transactionDate", "tranVNo"], collection: "T_Contra", duplicate: ["tranVNo"], deleteEndpoint: "/transaction/contra" },
  DesktopPDC: { endpoint: "/transaction/pdc-docket", nested: "cheques", identity: ["docSeries", "docVNo"], required: ["docVNo"], collection: "T_PDCDocket", duplicate: ["docSeries", "docVNo"], deleteEndpoint: "/transaction/pdc-docket" },
  DesktopJournalVoucher: { endpoint: "/p0/journal-voucher", nested: "lines", identity: ["vDate", "vNo"], required: ["vDate", "vNo", "lines"], collection: "T_JournalVoucher", duplicate: ["vDate", "vNo"], deleteEndpoint: "/p0/journal-voucher" },
  DesktopPayment: { endpoint: "/transaction/payment", nested: "allocations", identity: ["vNo"], required: ["vDate", "partyName", "bankCash", "amount"], collection: "T_Payment", duplicate: ["vNo"], deleteEndpoint: "/transaction/payment" },
  DesktopCollectionVoucher: { endpoint: "/transaction/collection-voucher", nested: "bills", identity: ["collectionDate", "colVNo"], required: ["collectionDate", "colVNo", "bills"], collection: "T_CollectionVoucher", duplicate: ["collectionDate", "colVNo"], deleteEndpoint: "/transaction/collection-voucher" },
};

const masterDefinitions = {
  Company: { collection: "Mas_Company", excelKey: ["Company Code"], dbKey: ["companyCode"] },
  Category: { collection: "Mas_Category", excelKey: ["Category Code"], dbKey: ["categoryCode"] },
  Group: { collection: "Mas_Group", excelKey: ["Group Code"], dbKey: ["groupCode"] },
  Account: { collection: "Mas_Account", excelKey: ["Account Code", "Account Name"], dbKey: ["accountCode", "accountName"] },
  Product: { collection: "Mas_Product", excelKey: ["Product Code"], dbKey: ["productCode"] },
  Bank: { collection: "Mas_CustomerBank", excelKey: ["Bank Code"], dbKey: ["bankCode"] },
  Salesman: { collection: "Mas_Salesman", excelKey: ["Salesman Code"], dbKey: ["salesmanCode"] },
  Area: { collection: "Mas_Area", excelKey: ["Area Code"], dbKey: ["areaCode"] },
  AreaToPartyMapping: { collection: "Mas_AreaToPartyMapping", excelKey: ["Company Code", "Account Code"], dbKey: ["companyCode", "accountCode"] },
  SalesmanToAreaMapping: { collection: "Mas_SalesmanAreaMapping", excelKey: ["Company Code", "Area Code", "Salesman Code"], dbKey: ["companyCode", "areaCode", "salesmanCode"] },
};

const normalize = (value) => String(value ?? "").trim().toLowerCase();
const validGstin = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const composite = (row, fields) => fields.map((field) => normalize(row?.[field])).join("|");
const jsonCell = (value) => {
  if (typeof value !== "string" || !/^[{[]/.test(value.trim())) return value;
  try { return JSON.parse(value); } catch { return value; }
};
const payloadJson = (row) => JSON.parse(Object.keys(row).filter((key) => /^ERP Payload JSON(?: \d+)?$/.test(key))
  .sort((left, right) => Number(left.match(/\d+$/)?.[0] || 1) - Number(right.match(/\d+$/)?.[0] || 1))
  .map((key) => String(row[key] || "")).join(""));

const hydrateDesktopRows = ({ rows, nestedRows = [], entryType }) => {
  const transaction = transactionDefinitions[entryType];
  if (!transaction) return rows
    .map((row, index) => ({ row: index + 2, source: row, payload: row }))
    .filter((record) => entryType !== "AreaToPartyMapping"
      || (String(record.payload["Area Code"] || "").trim() && String(record.payload["Area Name"] || "").trim()));
  const hasJson = Object.keys(rows[0] || {}).some((key) => /^ERP Payload JSON(?: \d+)?$/.test(key));
  const nestedRowsByIdentity = !hasJson && transaction.nested
    ? nestedRows.reduce((groups, item) => {
      const key = transaction.identity.map((field) => String(item[field] ?? "")).join("\u0000");
      const group = groups.get(key) || [];
      group.push(item);
      groups.set(key, group);
      return groups;
    }, new Map())
    : null;
  return rows.map((row, index) => {
    let payload;
    if (hasJson) payload = payloadJson(row);
    else {
      payload = Object.fromEntries(Object.entries(row).map(([name, value]) => [name, jsonCell(value)]));
      if (transaction.nested) {
        const identityKey = transaction.identity.map((field) => String(row[field] ?? "")).join("\u0000");
        payload[transaction.nested] = (nestedRowsByIdentity.get(identityKey) || [])
          .map((item) => Object.fromEntries(Object.entries(item).filter(([name]) => !transaction.identity.includes(name)).map(([name, value]) => [name, jsonCell(value)])));
      }
    }
    if (entryType === "DesktopCreditNote" && !String(payload.CreditNoteSeries || "").trim()) payload.CreditNoteSeries = "CN";
    return { row: index + 2, source: row, payload };
  });
};

export const readDesktopWorkbook = (filePath, entryType) => {
  const workbook = XLSX.read(fs.readFileSync(filePath), { type: "buffer", cellDates: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  const transaction = transactionDefinitions[entryType];
  const hasJson = Object.keys(rows[0] || {}).some((key) => /^ERP Payload JSON(?: \d+)?$/.test(key));
  let nestedRows = [];
  if (!hasJson && transaction?.nested) {
    const nestedName = workbook.SheetNames.find((name) => normalize(name) === normalize(transaction.nested));
    nestedRows = nestedName ? XLSX.utils.sheet_to_json(workbook.Sheets[nestedName], { defval: "" }) : [];
  }
  return hydrateDesktopRows({ rows, nestedRows, entryType });
};

const streamedCellValue = (value) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (!value || typeof value !== "object") return value ?? "";
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
  if (Object.hasOwn(value, "result")) return value.result ?? "";
  if (Object.hasOwn(value, "text")) return value.text ?? "";
  return String(value);
};

export const readDesktopWorkbookStreaming = async (filePath, entryType) => {
  // ExcelJS streams the Office Open XML format. Preserve the existing legacy
  // BIFF .xls path exactly as it was for the smaller legacy files it supports.
  if (path.extname(filePath).toLowerCase() === ".xls") return readDesktopWorkbook(filePath, entryType);
  const transaction = transactionDefinitions[entryType];
  const firstRows = [];
  const nestedGroups = new Map();
  let worksheetIndex = 0;
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    // Generated workbooks store headers and most text in the shared-string
    // table. Resolve those values while streaming; otherwise every text cell
    // becomes { sharedString: n } and the importer cannot recognize columns.
    sharedStrings: "cache", hyperlinks: "ignore", styles: "ignore", worksheets: "emit",
  });
  for await (const worksheet of reader) {
    worksheetIndex += 1;
    const normalizedSheetName = normalize(worksheet.name);
    // ExcelJS emits worksheets in ZIP-entry order, which is not guaranteed to
    // match workbook tab order. Generated files explicitly name the import
    // sheet "Data", so do not accidentally parse the Instructions sheet when
    // it happens to be emitted first. Retain first-sheet fallback for legacy
    // workbooks that do not use the generated format.
    const collectNested = Boolean(transaction?.nested) && normalizedSheetName === normalize(transaction.nested);
    const collectFirst = normalizedSheetName === "data"
      || (worksheetIndex === 1 && normalizedSheetName !== "instructions" && !collectNested);
    if (!collectFirst && !collectNested) continue;
    let headers = [];
    for await (const row of worksheet) {
      const values = Array.from({ length: Math.max(0, row.cellCount) }, (_, index) => streamedCellValue(row.getCell(index + 1).value));
      if (!headers.length) { headers = values.map((value) => String(value || "").trim()); continue; }
      if (!values.some((value) => value !== "" && value !== null && value !== undefined)) continue;
      const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]).filter(([header]) => header));
      if (collectFirst) firstRows.push(record);
      else {
        const rowIdentity = transaction.identity.map((field) => String(record[field] ?? "")).join("\u0000");
        const signature = JSON.stringify(record);
        const signatures = nestedGroups.get(rowIdentity) || new Map();
        const entry = signatures.get(signature) || { row: record, count: 0 };
        entry.count += 1;
        signatures.set(signature, entry);
        nestedGroups.set(rowIdentity, signatures);
      }
    }
  }
  if (!firstRows.length) throw Object.assign(new Error(`${path.basename(filePath)} does not contain importable rows.`), { status: 422 });

  // Repair workbooks produced from legacy Counter Sales tables where each
  // header was repeated once per detail and the exporter consequently wrote
  // the complete detail set once for every repeated header. Dividing exact
  // detail repetitions by that header multiplicity preserves genuine repeated
  // product lines while removing only the exporter-created multiplication.
  const nestedRows = [];
  if (transaction?.nested && transaction.identity.length && nestedGroups.size) {
    const identity = (row) => transaction.identity.map((field) => String(row[field] ?? "")).join("\u0000");
    const headerCounts = new Map();
    const uniqueHeaders = new Map();
    for (const row of firstRows) {
      const rowIdentity = identity(row);
      headerCounts.set(rowIdentity, (headerCounts.get(rowIdentity) || 0) + 1);
      if (!uniqueHeaders.has(rowIdentity)) uniqueHeaders.set(rowIdentity, row);
    }
    const repeatedHeaders = [...headerCounts.values()].some((count) => count > 1);
    for (const [rowIdentity, signatures] of nestedGroups) {
      const multiplier = repeatedHeaders ? headerCounts.get(rowIdentity) || 1 : 1;
      for (const { row, count } of signatures.values()) {
        for (let index = 0; index < Math.ceil(count / multiplier); index += 1) nestedRows.push(row);
      }
    }
    if (repeatedHeaders) {
      firstRows.length = 0;
      firstRows.push(...uniqueHeaders.values());
    }
  }

  return hydrateDesktopRows({ rows: firstRows, nestedRows, entryType });
};

const loadKnownReferences = async (tenant) => {
  const filter = { ...tenant, isActive: { $ne: false } };
  const [products, accounts, companies, godowns, areas, salesmen, services, stocks] = await Promise.all([
    mongoose.connection.collection("Mas_Product").find(filter, { projection: { productCode: 1 } }).toArray(),
    mongoose.connection.collection("Mas_Account").find(filter, { projection: { accountCode: 1 } }).toArray(),
    mongoose.connection.collection("Mas_Company").find(filter, { projection: { companyCode: 1 } }).toArray(),
    mongoose.connection.collection("Mas_Godown").find(filter, { projection: { godownCode: 1 } }).toArray(),
    mongoose.connection.collection("Mas_Area").find(filter, { projection: { areaCode: 1 } }).toArray(),
    mongoose.connection.collection("Mas_Salesman").find(filter, { projection: { salesmanCode: 1 } }).toArray(),
    mongoose.connection.collection("Mas_Service").find(filter, { projection: { serviceCode: 1 } }).toArray(),
    mongoose.connection.collection("Mas_Stock").find({ ...tenant, Qty: { $gt: 0 }, IsLocked: { $ne: "Y" } }, { projection: { GDCode: 1, ProdCode: 1 } }).toArray(),
  ]);
  return {
    products: new Set(products.map((row) => normalize(row.productCode))),
    accounts: new Set(accounts.map((row) => normalize(row.accountCode))),
    companies: new Set(companies.map((row) => normalize(row.companyCode))),
    godowns: new Set(godowns.map((row) => normalize(row.godownCode))),
    areas: new Set(areas.map((row) => normalize(row.areaCode))),
    salesmen: new Set(salesmen.map((row) => normalize(row.salesmanCode))),
    services: new Set(services.map((row) => normalize(row.serviceCode))),
    stocks: new Set(stocks.map((row) => `${normalize(row.GDCode)}|${normalize(row.ProdCode)}`)),
  };
};

const transactionReferences = (payload, definition) => {
  const items = Array.isArray(payload[definition.nested]) ? payload[definition.nested] : [];
  return {
    products: [payload.prodCode, payload.productCode, payload.ProductCode, ...items.map((item) => item.productCode || item.prodCode || item.ProductCode)].filter(Boolean),
    accounts: [payload.PartyCode, payload.SupplierCode, payload.supplierCode, payload.partyId, payload.partyCode].filter(Boolean),
    companies: [payload.CompanyCode, payload.companyCode].filter(Boolean),
    godowns: [payload.GDCode, payload.gdCode].filter(Boolean),
    salesmen: [payload.SalesmanCode, payload.salesmanCode].filter(Boolean),
    services: items.map((item) => item.serviceCode).filter(Boolean),
  };
};

const loadExistingImportKeys = async ({ records, tenant, master, transaction }) => {
  const definition = master || transaction;
  const collection = mongoose.connection.collection(definition.collection);
  const dbFields = master ? master.dbKey : transaction.duplicate;
  const payloadFields = master ? master.excelKey : (transaction.payloadDuplicate || transaction.duplicate);
  const projection = Object.fromEntries(dbFields.map((field) => [field, 1]));
  const documents = [];
  const identityCondition = (value) => {
    const trimmed = String(value ?? "").trim();
    const numeric = Number(trimmed);
    return trimmed && Number.isFinite(numeric) && numeric !== value
      ? { $in: [value, numeric] }
      : value;
  };
  // Keep each $or query bounded. It returns only identities present in this
  // workbook instead of scanning every historical document in the firm.
  for (let offset = 0; offset < records.length; offset += 400) {
    const clauses = records.slice(offset, offset + 400).map((record) => Object.fromEntries(
      dbFields.map((field, index) => [field, identityCondition(record.payload[payloadFields[index]])])
    ));
    if (!clauses.length) continue;
    documents.push(...await collection.find({ ...tenant, $or: clauses }, { projection }).toArray());
  }
  return new Set(documents.map((document) => composite(document, dbFields)));
};

export const preflightDesktopImport = async ({ job, fileIds, companyCode }) => {
  const chosen = (job.files || []).filter((file) => !fileIds?.length || fileIds.includes(file.id));
  const ordered = [...chosen].sort((left, right) => DESKTOP_IMPORT_ORDER.indexOf(left.entryType) - DESKTOP_IMPORT_ORDER.indexOf(right.entryType));
  const tenant = { distributorId: job.distributorId, firmId: job.firmId };
  const recordsFor = (file) => job.parsedRecords?.get(file.id) || readDesktopWorkbook(job.filePaths.get(file.id), file.entryType);
  const known = await loadKnownReferences(tenant);
  for (const file of ordered) {
    if (file.entryType === "Company") recordsFor(file).forEach(({ payload }) => known.companies.add(normalize(payload["Company Code"])));
    if (file.entryType === "Product") recordsFor(file).forEach(({ payload }) => known.products.add(normalize(payload["Product Code"])));
    if (file.entryType === "Account") recordsFor(file).forEach(({ payload }) => known.accounts.add(normalize(payload["Account Code"])));
    if (file.entryType === "Area") recordsFor(file).forEach(({ payload }) => known.areas.add(normalize(payload["Area Code"])));
    if (file.entryType === "Salesman") recordsFor(file).forEach(({ payload }) => known.salesmen.add(normalize(payload["Salesman Code"])));
    if (["DesktopOpeningStock", "DesktopPurchase", "DesktopStockIn"].includes(file.entryType)) recordsFor(file).forEach(({ payload }) => {
      const definition = transactionDefinitions[file.entryType];
      const items = definition.nested ? payload[definition.nested] || [] : [payload];
      for (const item of items) known.stocks.add(`${normalize(payload.GDCode || payload.gdCode)}|${normalize(item.productCode || item.prodCode || item.ProductCode)}`);
    });
  }
  const files = [];
  const report = [];
  for (const file of ordered) {
    const records = recordsFor(file);
    const master = masterDefinitions[file.entryType];
    const transaction = transactionDefinitions[file.entryType];
    const seen = new Set();
    let existing = new Set();
    if (master || transaction) existing = await loadExistingImportKeys({ records, tenant, master, transaction });
    let ready = 0; let duplicates = 0; let errors = 0; let warnings = 0;
    for (const record of records) {
      const rowErrors = []; const rowWarnings = [];
      if (master) {
        const config = importConfig[file.entryType];
        if (file.entryType === "Account") {
          const openingBalance = Number(record.payload["Opening Balance"] || 0);
          if (Number.isFinite(openingBalance)) {
            record.payload["Opening Balance"] = Math.abs(openingBalance);
            if (!String(record.payload["Opening Balance Type"] || "").trim()) {
              record.payload["Opening Balance Type"] = openingBalance < 0 ? "Cr" : "Dr";
            }
          }
        }
        if (file.entryType === "Account" && record.payload.GSTIN && !validGstin.test(String(record.payload.GSTIN).trim().toUpperCase())) {
          rowWarnings.push(`Invalid legacy GSTIN ${record.payload.GSTIN} was omitted`);
          record.payload.GSTIN = "";
        }
        for (const column of config.columns.filter((column) => column.required)) if (!String(record.payload[column.excel] ?? "").trim()) rowErrors.push(`${column.excel} is required`);
        if (file.entryType === "Product" && record.payload.Company && !known.companies.has(normalize(record.payload.Company))) rowErrors.push(`company ${record.payload.Company} does not exist`);
        if (file.entryType === "AreaToPartyMapping") {
          if (!known.companies.has(normalize(record.payload["Company Code"]))) rowErrors.push(`company ${record.payload["Company Code"]} does not exist`);
          if (!known.accounts.has(normalize(record.payload["Account Code"]))) rowErrors.push(`account ${record.payload["Account Code"]} does not exist`);
          if (!known.areas.has(normalize(record.payload["Area Code"]))) rowErrors.push(`area ${record.payload["Area Code"]} does not exist`);
        }
        if (file.entryType === "SalesmanToAreaMapping") {
          if (!known.companies.has(normalize(record.payload["Company Code"]))) rowErrors.push(`company ${record.payload["Company Code"]} does not exist`);
          if (!known.areas.has(normalize(record.payload["Area Code"]))) rowErrors.push(`area ${record.payload["Area Code"]} does not exist`);
          if (!known.salesmen.has(normalize(record.payload["Salesman Code"]))) rowErrors.push(`salesman ${record.payload["Salesman Code"]} does not exist`);
        }
        record.key = composite(record.payload, master.excelKey);
      } else if (transaction) {
        for (const field of transaction.required) {
          const value = record.payload[field];
          if (Array.isArray(value) ? !value.length : value === "" || value === null || value === undefined) rowErrors.push(`${field} is required`);
        }
        if (String(record.payload.distributorId || record.source["Distributor ID"] || "") !== job.distributorId) rowErrors.push("Distributor ID does not match this login");
        if (String(record.payload.firmId || record.source["Firm ID"] || "") !== job.firmId) rowErrors.push("Firm ID does not match this firm");
        const payloadKeys = transaction.payloadDuplicate || transaction.duplicate;
        record.key = composite(record.payload, payloadKeys);
        const refs = transactionReferences(record.payload, transaction);
        for (const [kind, values] of Object.entries(refs)) for (const value of values) if (!known[kind].has(normalize(value))) {
          const canCreatePurchaseGodown = file.entryType === "DesktopPurchase" && kind === "godowns"
            && normalize(value) === normalize(record.payload.gdCode) && String(record.payload.godownName || "").trim();
          if (canCreatePurchaseGodown) rowWarnings.push(`Godown ${value} will be created from the purchase file`);
          else rowErrors.push(`${kind.slice(0, -1)} ${value} does not exist`);
        }
        if (["DesktopSales", "DesktopStockOut"].includes(file.entryType)) for (const product of refs.products) {
          const stockKey = `${normalize(record.payload.GDCode || record.payload.gdCode)}|${normalize(product)}`;
          if (!known.stocks.has(stockKey)) rowWarnings.push(`No current or selected opening/incoming stock was found for product ${product}; existing stock rules will recheck it`);
        }
      }
      const isExistingDesktopPurchase = file.entryType === "DesktopPurchase" && existing.has(record.key);
      record.status = rowErrors.length
        ? "error"
        : isExistingDesktopPurchase
          ? "repair"
          : existing.has(record.key) || seen.has(record.key)
            ? "duplicate"
            : "ready";
      record.errors = rowErrors; record.warnings = rowWarnings;
      seen.add(record.key);
      if (record.status === "ready" || record.status === "repair") ready += 1;
      if (record.status === "duplicate") duplicates += 1;
      if (record.status === "error") errors += 1;
      warnings += rowWarnings.length;
      if (record.status !== "ready" || rowWarnings.length) report.push({ file: file.fileName, entryType: file.entryType, row: record.row, status: record.status, message: [...rowErrors, ...rowWarnings, ...(record.status === "duplicate" ? ["Duplicate already exists and will be skipped"] : []), ...(record.status === "repair" ? ["Existing purchase will be checked and only missing product display data and stock batches will be repaired"] : [])].join("; ") });
    }
    files.push({ ...file, records, total: records.length, ready, duplicates, errors, warnings });
  }
  return { files, report, totals: files.reduce((result, file) => ({ total: result.total + file.total, ready: result.ready + file.ready, duplicates: result.duplicates + file.duplicates, errors: result.errors + file.errors, warnings: result.warnings + file.warnings }), { total: 0, ready: 0, duplicates: 0, errors: 0, warnings: 0 }) };
};

const apiRequest = async ({ baseUrl, authorization, endpoint, method = "POST", body, idempotencyKey }) => {
  const response = await fetch(`${baseUrl}${endpoint}`, { method, headers: { Authorization: authorization, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const stage = String(result.stage || "").trim();
    const message = result.message || result.error || `${method} ${endpoint} failed (${response.status})`;
    const error = new Error(stage ? `${message} (stage: ${stage})` : message);
    error.status = response.status;
    error.code = result.code;
    throw error;
  }
  return result;
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const isRetryableDesktopTransactionError = (error) => error?.status >= 500
  || [112, 244, 251].includes(Number(error?.code))
  || /write conflict|please retry your operation|transienttransactionerror|unknowntransactioncommitresult/i.test(String(error?.message || ""));

export const requestDesktopTransaction = async (options, { attempts = 5 } = {}) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await apiRequest(options);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryableDesktopTransactionError(error)) throw error;
      await wait(Math.min(1600, 100 * (2 ** (attempt - 1))));
    }
  }
  throw lastError;
};

const responseId = (result) => String(result.savedBillId || result.data?._id || result.data?.header?._id || result.purchase?._id || result.creditNote?._id || result.debitNote?._id || result.voucher?._id || result.load?._id || result.saved?._id || "");

export const desktopCommittedTransactionFilter = (entryType, payload, tenant) => {
  if (entryType === "DesktopPurchase" && Number(payload.vouNo) > 0) return {
    ...tenant,
    vouSer: String(payload.vouSer || "").trim(),
    vouNo: Number(payload.vouNo),
  };
  if (entryType === "DesktopCreditNote") return {
    ...tenant,
    CreditNoteSeries: String(payload.CreditNoteSeries || "CN").trim(),
    CreditNoteNo: Number(payload.CreditNoteNo),
  };
  if (entryType === "DesktopReceipt" && Number(payload.rno) > 0) return {
    ...tenant,
    billSeries: String(payload.billSeries || "").trim(),
    rno: Number(payload.rno),
  };
  if (!["DesktopSales", "DesktopCounterSales"].includes(entryType)) return null;
  return {
    ...tenant,
    BillSeries: String(payload.BillSeries || "").trim(),
    BillNo: Number(payload.BillNo),
  };
};

const resolveDesktopTransactionIds = async (entryType, payload, tenant) => {
  if (entryType !== "DesktopSalesService") return payload;
  const party = await mongoose.connection.collection("Mas_Account").findOne({ ...tenant, accountCode: payload.partyCode, isActive: { $ne: false } }, { projection: { _id: 1 } });
  const codes = [...new Set((payload.items || []).map((item) => String(item.serviceCode || "").trim()).filter(Boolean))];
  const services = await mongoose.connection.collection("Mas_Service").find({ ...tenant, serviceCode: { $in: codes }, isActive: { $ne: false } }, { projection: { _id: 1, serviceCode: 1 } }).toArray();
  const ids = new Map(services.map((item) => [normalize(item.serviceCode), String(item._id)]));
  return { ...payload, partyId: String(party?._id || ""), items: (payload.items || []).map((item) => ({ ...item, serviceId: ids.get(normalize(item.serviceCode)) || "" })) };
};
const waitWhilePaused = async (state) => {
  while (state.status === "paused") await new Promise((resolve) => setTimeout(resolve, 300));
  if (state.cancelRequested) throw Object.assign(new Error("Import cancelled"), { cancelled: true });
};

const captureMasterIds = async (file, records, tenant) => {
  const definition = masterDefinitions[file.entryType];
  const keys = new Set(records.map((record) => record.key));
  const docs = await mongoose.connection.collection(definition.collection).find(tenant, { projection: { _id: 1, ...Object.fromEntries(definition.dbKey.map((key) => [key, 1])) } }).toArray();
  return docs.filter((doc) => keys.has(composite(doc, definition.dbKey))).map((doc) => String(doc._id));
};

const ensureDesktopPurchaseSuppliers = async ({ records, tenant, firmName }) => {
  const suppliers = new Map(records.map((record) => [normalize(record.payload.supplierCode), {
    accountCode: String(record.payload.supplierCode || "").trim(),
    accountName: String(record.payload.supplierName || "").trim(),
  }]).filter(([key, supplier]) => key && supplier.accountName));
  if (!suppliers.size) return [];
  const collection = mongoose.connection.collection("Mas_OtherAccount");
  const existing = await collection.find({ ...tenant, accountCode: { $in: [...suppliers.values()].map((item) => item.accountCode) }, isActive: { $ne: false } }, { projection: { accountCode: 1 } }).toArray();
  existing.forEach((item) => suppliers.delete(normalize(item.accountCode)));
  if (!suppliers.size) return [];
  const result = await collection.insertMany([...suppliers.values()].map((supplier) => ({
    ...supplier, ...tenant, firmName: firmName || "", accountGroup: "SUNDRY CREDITORS", isActive: true,
    createdAt: new Date(), updatedAt: new Date(),
  })), { ordered: true });
  return Object.values(result.insertedIds || {}).map((id) => String(id));
};

export const ensureDesktopReceiptBankAccounts = async ({ records, tenant, firmName, collection = mongoose.connection.collection("Mas_OtherAccount") }) => {
  const accounts = new Map(records.map((record) => [normalize(record.payload.bankCash), {
    accountCode: String(record.payload.bankCash || "").trim(),
    accountName: String(record.payload.bankCashName || record.payload.bankCash || "").trim(),
    accountGroup: String(record.payload.bankCashGroup || "BANK ACCOUNTS").trim(),
  }]).filter(([key, account]) => key && account.accountName));
  if (!accounts.size) return [];
  const existing = await collection.find({ ...tenant, accountCode: { $in: [...accounts.values()].map((item) => item.accountCode) }, isActive: { $ne: false } }, { projection: { accountCode: 1 } }).toArray();
  existing.forEach((item) => accounts.delete(normalize(item.accountCode)));
  if (!accounts.size) return [];
  const result = await collection.insertMany([...accounts.values()].map((account) => ({
    ...account, ...tenant, firmName: firmName || "", isActive: true, createdAt: new Date(), updatedAt: new Date(),
  })), { ordered: true });
  return Object.values(result.insertedIds || {}).map((id) => String(id));
};

export const runDesktopImport = async ({ job, plan, state, companyCode, authorization, baseUrl, retryOnly = false }) => {
  const tenant = { distributorId: job.distributorId, firmId: job.firmId };
  state.status = "running"; state.startedAt ||= new Date().toISOString(); state.updatedAt = new Date().toISOString();
  const failedKeys = retryOnly ? new Set((state.failures || []).map((item) => `${item.fileId}|${item.row}`)) : null;
  if (retryOnly) state.failures = [];
  try {
    let activeCompanyCode = companyCode || String(plan.files.find((item) => item.entryType === "Company")?.records?.[0]?.payload?.["Company Code"] || "").trim();
    for (const file of plan.files) {
      const fileState = state.files.find((item) => item.id === file.id);
      const candidates = file.records.filter((record) => ["ready", "repair"].includes(record.status) && (!failedKeys || failedKeys.has(`${file.id}|${record.row}`)));
      if (!candidates.length) continue;
      fileState.status = "running"; fileState.startedAt = new Date().toISOString(); fileState.updatedAt = fileState.startedAt;
      if (masterDefinitions[file.entryType]) {
        const masterBatchSize = file.entryType === "Product" ? DESKTOP_PRODUCT_BATCH_SIZE : 500;
        for (let offset = 0; offset < candidates.length; offset += masterBatchSize) {
          await waitWhilePaused(state);
          const chunk = candidates.slice(offset, offset + masterBatchSize);
          try {
            const idempotencyKey = `desktop-${job.id}-${file.entryType}-${retryOnly ? "retry-" : ""}${offset}`;
            await apiRequest({ baseUrl, authorization, endpoint: "/import/validate", body: { entryType: file.entryType, company: activeCompanyCode, desktopBatch: true, data: chunk.map((record) => record.payload) } });
            await apiRequest({ baseUrl, authorization, endpoint: "/import/save", body: { entryType: file.entryType, company: activeCompanyCode, desktopBatch: true, data: chunk.map((record) => record.payload) }, idempotencyKey });
            const ids = await captureMasterIds(file, chunk, tenant);
            if (file.entryType === "Company" && !activeCompanyCode) activeCompanyCode = String(chunk[0]?.payload?.["Company Code"] || "").trim();
            state.rollback.push({ kind: "master", collection: masterDefinitions[file.entryType].collection, ids, fileId: file.id });
            fileState.imported += chunk.length; state.imported += chunk.length;
          } catch (error) {
            for (const record of chunk) state.failures.push({ fileId: file.id, file: file.fileName, entryType: file.entryType, row: record.row, message: error.message });
            fileState.failed += chunk.length; state.failed += chunk.length;
          }
          fileState.processed += chunk.length; state.processed += chunk.length; state.updatedAt = new Date().toISOString();
        }
      } else {
        const definition = transactionDefinitions[file.entryType];
        if (file.entryType === "DesktopPurchase") {
          const supplierIds = await ensureDesktopPurchaseSuppliers({ records: candidates, tenant, firmName: job.firmName });
          if (supplierIds.length) state.rollback.push({ kind: "master", collection: "Mas_OtherAccount", ids: supplierIds, fileId: file.id });
          const godowns = new Map(candidates.map((record) => [normalize(record.payload.gdCode), {
            godownCode: String(record.payload.gdCode || "").trim(), godownName: String(record.payload.godownName || "").trim(),
          }]).filter(([key, value]) => key && value.godownName));
          for (const godown of godowns.values()) {
            const existingGodown = await mongoose.connection.collection("Mas_Godown").findOne({ ...tenant, godownCode: godown.godownCode, isActive: { $ne: false } }, { projection: { _id: 1 } });
            if (existingGodown) continue;
            const result = await apiRequest({ baseUrl, authorization, endpoint: "/godowns", body: { ...godown, ...tenant, firmName: job.firmName || "" }, idempotencyKey: `desktop-${job.id}-godown-${normalize(godown.godownCode)}` });
            const id = responseId(result);
            if (id) state.rollback.push({ kind: "master", collection: "Mas_Godown", ids: [id], fileId: file.id });
          }
        }
        if (file.entryType === "DesktopReceipt") {
          const accountIds = await ensureDesktopReceiptBankAccounts({ records: candidates, tenant, firmName: job.firmName });
          if (accountIds.length) state.rollback.push({ kind: "master", collection: "Mas_OtherAccount", ids: accountIds, fileId: file.id });
        }
        const importRecord = async (record) => {
          await waitWhilePaused(state);
          let payload = { ...record.payload, distributorId: job.distributorId, firmId: job.firmId, firmName: job.firmName || "", _desktopImport: true };
          payload = await resolveDesktopTransactionIds(file.entryType, payload, tenant);
          if (definition.endpoint === "/stock/adjust" && !payload.requestId) payload.requestId = `desktop-${job.id}-${file.entryType}-${record.row}`;
          try {
            const endpoint = record.status === "repair" && file.entryType === "DesktopPurchase"
              ? "/purchase/reconcile-desktop-import"
              : definition.endpoint;
            const request = { baseUrl, authorization, endpoint, body: payload, idempotencyKey: `desktop-${job.id}-${file.entryType}-${record.row}` };
            const result = ["DesktopPurchase", "DesktopSales", "DesktopCounterSales", "DesktopCreditNote", "DesktopReceipt"].includes(file.entryType)
              ? await requestDesktopTransaction(request)
              : await apiRequest(request);
            let id = responseId(result);
            if (!id && definition.collection === "T_Stock_Adjustment") id = String((await mongoose.connection.collection(definition.collection).findOne({ ...tenant, RequestId: payload.requestId }, { projection: { _id: 1 } }))?._id || "");
            // A reconciliation updates a purchase that existed before this job;
            // it must never be registered as a job-created record for rollback.
            if (id && record.status !== "repair") state.rollback.push({ kind: "transaction", endpoint: definition.deleteEndpoint, id, fileId: file.id, entryType: file.entryType });
            fileState.imported += 1; state.imported += 1;
          } catch (error) {
            // A transaction commit can succeed even when its acknowledgement
            // is lost. Reconcile the sales identity before recording a failure
            // so retrying does not turn a committed bill into a false failure.
            const committedFilter = desktopCommittedTransactionFilter(file.entryType, payload, tenant);
            const committed = committedFilter
              ? await mongoose.connection.collection(definition.collection)
                .findOne(committedFilter, { projection: { _id: 1 } })
                .catch(() => null)
              : null;
            if (committed?._id) {
              state.rollback.push({ kind: "transaction", endpoint: definition.deleteEndpoint, id: String(committed._id), fileId: file.id, entryType: file.entryType });
              fileState.imported += 1; state.imported += 1;
            } else {
              state.failures.push({ fileId: file.id, file: file.fileName, entryType: file.entryType, row: record.row, message: error.message });
              fileState.failed += 1; state.failed += 1;
            }
          }
          fileState.processed += 1; state.processed += 1; fileState.updatedAt = new Date().toISOString(); state.updatedAt = fileState.updatedAt;
        };
        // Execute only conflict-free vouchers together. Rows sharing a stock
        // batch or an allocated bill stay ordered in later waves.
        const concurrency = desktopTransactionConcurrency(file.entryType);
        for (let batchOffset = 0; batchOffset < candidates.length; batchOffset += DESKTOP_TRANSACTION_BATCH_SIZE) {
          const batch = candidates.slice(batchOffset, batchOffset + DESKTOP_TRANSACTION_BATCH_SIZE);
          const waves = createConflictFreeWaves(batch, file.entryType, concurrency);
          for (const wave of waves) {
            await waitWhilePaused(state);
            await Promise.all(wave.map(importRecord));
          }
        }
      }
      fileState.status = fileState.failed ? "completed_with_errors" : "completed"; fileState.finishedAt = new Date().toISOString(); fileState.updatedAt = fileState.finishedAt;
    }
    state.status = state.failures.length ? "completed_with_errors" : "completed";
  } catch (error) {
    state.status = error.cancelled ? "cancelled" : "failed"; state.error = error.message;
  } finally {
    state.finishedAt = new Date().toISOString(); state.updatedAt = new Date().toISOString();
  }
};

export const rollbackDesktopImport = async ({ state, authorization, baseUrl }) => {
  state.status = "rolling_back"; const errors = [];
  for (const action of [...state.rollback].reverse()) {
    try {
      if (action.kind === "master") await mongoose.connection.collection(action.collection).deleteMany({ _id: { $in: action.ids.map((id) => new mongoose.Types.ObjectId(id)) } });
      else await apiRequest({ baseUrl, authorization, endpoint: `${action.endpoint}/${action.id}`, method: "DELETE", body: { reason: "Desktop import rollback" } });
    } catch (error) { errors.push(`${action.entryType || action.collection}: ${error.message}`); }
  }
  state.rollbackErrors = errors; state.status = errors.length ? "rollback_incomplete" : "rolled_back"; state.updatedAt = new Date().toISOString();
};

export const publicImportState = (state) => state ? {
  status: state.status, total: state.total, processed: state.processed, imported: state.imported, failed: state.failed,
  duplicates: state.duplicates, errors: state.errors, warnings: state.warnings, startedAt: state.startedAt,
  finishedAt: state.finishedAt, updatedAt: state.updatedAt, error: state.error, files: state.files,
  failures: (state.failures || []).slice(0, 500), failuresTruncated: (state.failures || []).length > 500,
  rollbackAvailable: state.rollback?.length > 0 && !["rolled_back", "rolling_back"].includes(state.status), rollbackErrors: state.rollbackErrors,
} : null;
