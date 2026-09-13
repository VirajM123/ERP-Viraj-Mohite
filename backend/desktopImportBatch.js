import fs from "fs";
import mongoose from "mongoose";
import * as XLSX from "xlsx";
import { importConfig } from "./importConfig.js";

const DESKTOP_TRANSACTION_CONCURRENCY = Math.max(1, Math.min(32, Number.parseInt(process.env.DESKTOP_IMPORT_TRANSACTION_CONCURRENCY || "16", 10) || 16));
const DESKTOP_TRANSACTION_BATCH_SIZE = Math.max(25, Math.min(500, Number.parseInt(process.env.DESKTOP_IMPORT_TRANSACTION_BATCH_SIZE || "100", 10) || 100));

const SERIAL_DESKTOP_TRANSACTION_TYPES = new Set([
  "DesktopPurchase",
  "DesktopOpeningStock",
  "DesktopStockIn",
  "DesktopStockOut",
  "DesktopSelfDamage",
  "DesktopDamageStockOut",
]);

export const desktopTransactionConcurrency = (entryType) => SERIAL_DESKTOP_TRANSACTION_TYPES.has(entryType)
  ? 1
  : DESKTOP_TRANSACTION_CONCURRENCY;

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

export const readDesktopWorkbook = (filePath, entryType) => {
  const workbook = XLSX.read(fs.readFileSync(filePath), { type: "buffer", cellDates: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  const transaction = transactionDefinitions[entryType];
  if (!transaction) return rows
    .map((row, index) => ({ row: index + 2, source: row, payload: row }))
    // A party without an area is intentionally unmapped in the desktop data;
    // it is not a malformed Area-to-Party mapping to import.
    .filter((record) => entryType !== "AreaToPartyMapping"
      || (String(record.payload["Area Code"] || "").trim() && String(record.payload["Area Name"] || "").trim()));
  const hasJson = Object.keys(rows[0] || {}).some((key) => /^ERP Payload JSON(?: \d+)?$/.test(key));
  let nestedRows = [];
  if (!hasJson && transaction.nested) {
    const nestedName = workbook.SheetNames.find((name) => normalize(name) === normalize(transaction.nested));
    nestedRows = nestedName ? XLSX.utils.sheet_to_json(workbook.Sheets[nestedName], { defval: "" }) : [];
  }
  const nestedRowsByIdentity = !hasJson && transaction?.nested
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
    // Older generated Credit Note workbooks can contain a blank desktop
    // transaction series. The API stores those notes under its canonical CN
    // default, so normalize them before duplicate preflight and submission.
    if (entryType === "DesktopCreditNote" && !String(payload.CreditNoteSeries || "").trim()) {
      payload.CreditNoteSeries = "CN";
    }
    return { row: index + 2, source: row, payload };
  });
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

export const preflightDesktopImport = async ({ job, fileIds, companyCode }) => {
  const chosen = (job.files || []).filter((file) => !fileIds?.length || fileIds.includes(file.id));
  const ordered = [...chosen].sort((left, right) => DESKTOP_IMPORT_ORDER.indexOf(left.entryType) - DESKTOP_IMPORT_ORDER.indexOf(right.entryType));
  const tenant = { distributorId: job.distributorId, firmId: job.firmId };
  const known = await loadKnownReferences(tenant);
  for (const file of ordered) {
    if (file.entryType === "Company") readDesktopWorkbook(job.filePaths.get(file.id), file.entryType).forEach(({ payload }) => known.companies.add(normalize(payload["Company Code"])));
    if (file.entryType === "Product") readDesktopWorkbook(job.filePaths.get(file.id), file.entryType).forEach(({ payload }) => known.products.add(normalize(payload["Product Code"])));
    if (file.entryType === "Account") readDesktopWorkbook(job.filePaths.get(file.id), file.entryType).forEach(({ payload }) => known.accounts.add(normalize(payload["Account Code"])));
    if (file.entryType === "Area") readDesktopWorkbook(job.filePaths.get(file.id), file.entryType).forEach(({ payload }) => known.areas.add(normalize(payload["Area Code"])));
    if (file.entryType === "Salesman") readDesktopWorkbook(job.filePaths.get(file.id), file.entryType).forEach(({ payload }) => known.salesmen.add(normalize(payload["Salesman Code"])));
    if (["DesktopOpeningStock", "DesktopPurchase", "DesktopStockIn"].includes(file.entryType)) readDesktopWorkbook(job.filePaths.get(file.id), file.entryType).forEach(({ payload }) => {
      const definition = transactionDefinitions[file.entryType];
      const items = definition.nested ? payload[definition.nested] || [] : [payload];
      for (const item of items) known.stocks.add(`${normalize(payload.GDCode || payload.gdCode)}|${normalize(item.productCode || item.prodCode || item.ProductCode)}`);
    });
  }
  const files = [];
  const report = [];
  for (const file of ordered) {
    const records = readDesktopWorkbook(job.filePaths.get(file.id), file.entryType);
    const master = masterDefinitions[file.entryType];
    const transaction = transactionDefinitions[file.entryType];
    const seen = new Set();
    let existing = new Set();
    if (master) {
      const docs = await mongoose.connection.collection(master.collection).find(tenant, { projection: Object.fromEntries(master.dbKey.map((key) => [key, 1])) }).toArray();
      existing = new Set(docs.map((doc) => composite(doc, master.dbKey)));
    } else if (transaction) {
      const docs = await mongoose.connection.collection(transaction.collection).find(tenant, { projection: Object.fromEntries(transaction.duplicate.map((key) => [key, 1])) }).toArray();
      existing = new Set(docs.map((doc) => composite(doc, transaction.duplicate)));
    }
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
    const error = new Error(result.message || result.error || `${method} ${endpoint} failed (${response.status})`);
    error.status = response.status;
    error.code = result.code;
    throw error;
  }
  return result;
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const isRetryableDesktopTransactionError = (error) => error?.status >= 500
  || [112, 244, 251].includes(Number(error?.code));

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
        for (let offset = 0; offset < candidates.length; offset += 500) {
          await waitWhilePaused(state);
          const chunk = candidates.slice(offset, offset + 500);
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
            const result = ["DesktopSales", "DesktopCounterSales"].includes(file.entryType)
              ? await requestDesktopTransaction(request)
              : await apiRequest(request);
            let id = responseId(result);
            if (!id && definition.collection === "T_Stock_Adjustment") id = String((await mongoose.connection.collection(definition.collection).findOne({ ...tenant, RequestId: payload.requestId }, { projection: { _id: 1 } }))?._id || "");
            // A reconciliation updates a purchase that existed before this job;
            // it must never be registered as a job-created record for rollback.
            if (id && record.status !== "repair") state.rollback.push({ kind: "transaction", endpoint: definition.deleteEndpoint, id, fileId: file.id, entryType: file.entryType });
            fileState.imported += 1; state.imported += 1;
          } catch (error) {
            state.failures.push({ fileId: file.id, file: file.fileName, entryType: file.entryType, row: record.row, message: error.message });
            fileState.failed += 1; state.failed += 1;
          }
          fileState.processed += 1; state.processed += 1; fileState.updatedAt = new Date().toISOString(); state.updatedAt = fileState.updatedAt;
        };
        // Sales use bounded parallelism for throughput; transient stock write
        // conflicts are retried by requestDesktopTransaction above.
        const concurrency = desktopTransactionConcurrency(file.entryType);
        for (let batchOffset = 0; batchOffset < candidates.length; batchOffset += DESKTOP_TRANSACTION_BATCH_SIZE) {
          const batch = candidates.slice(batchOffset, batchOffset + DESKTOP_TRANSACTION_BATCH_SIZE);
          for (let offset = 0; offset < batch.length; offset += concurrency) {
            await waitWhilePaused(state);
            await Promise.all(batch.slice(offset, offset + concurrency).map(importRecord));
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
