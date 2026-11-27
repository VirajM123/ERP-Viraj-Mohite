import { missingCatalogSources, missingDashboardSources, missingStockMovementSources } from "./reportSources.js";
import express from "express";
import mongoose from "mongoose";
import { Journal, postBalancedJournal, reverseSourceJournal, validateJournalEntryLines } from "./accounting.js";
import { AuditEvent, writeAuditEvent } from "./audit.js";
import { nextDocumentNumber } from "./counters.js";
import { openingOutstanding } from './openingBalances.js';
import { businessDateIST } from "./businessDate.js";
import { ChartAccount, listChartAccounts, validateChartAccountMapping } from "./chartOfAccounts.js";
import { registerAccountLedgerRoutes } from "./accountLedger.js";

const stockMovementSchema = new mongoose.Schema({
  distributorId: { type: String, required: true }, firmId: { type: String, required: true },
  godown: { type: String, default: "" }, productCode: { type: String, required: true }, productName: { type: String, default: "" },
  batch: { type: String, default: "." }, mrp: { type: Number, default: 0 }, movementDate: { type: String, required: true },
  sourceType: { type: String, required: true }, sourceId: { type: String, required: true }, documentNo: { type: String, default: "" },
  quantityIn: { type: Number, default: 0 }, quantityOut: { type: Number, default: 0 }, userId: { type: String, required: true },
}, { timestamps: true, collection: "Inv_StockMovement" });
stockMovementSchema.index({ distributorId: 1, firmId: 1, sourceType: 1, sourceId: 1, productCode: 1, batch: 1, quantityIn: 1, quantityOut: 1 }, { unique: true });
stockMovementSchema.index({ distributorId: 1, firmId: 1, movementDate: 1, productCode: 1 });
export const StockMovement = mongoose.models.Inv_StockMovement || mongoose.model("Inv_StockMovement", stockMovementSchema);

const journalVoucherSchema = new mongoose.Schema({
  distributorId: { type: String, required: true }, firmId: { type: String, required: true },
  vDate: { type: String, required: true }, vNo: { type: Number, required: true }, narration: { type: String, default: "" },
  reference: { type: String, default: "" }, lines: { type: [mongoose.Schema.Types.Mixed], default: [] },
  idempotencyKey: { type: String, default: "" }, status: { type: String, enum: ["POSTED", "REVERSED"], default: "POSTED" },
  reversedAt: Date, reversedBy: String, reversalReason: String, editHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
}, { timestamps: true, collection: "T_JournalVoucher" });
journalVoucherSchema.index({ distributorId: 1, firmId: 1, vNo: 1 }, { unique: true });
journalVoucherSchema.index({ distributorId: 1, firmId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string", $gt: "" } } });
journalVoucherSchema.index({ distributorId: 1, firmId: 1, status: 1, vDate: -1, vNo: -1 });
const JournalVoucher = mongoose.models.T_JournalVoucher || mongoose.model("T_JournalVoucher", journalVoucherSchema);

const tenant = (req, extra = {}) => ({ ...extra, distributorId: req.auth.distributorId, firmId: req.auth.firmId });
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const isValidReportDate = (value) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
export const reportDateRangeError = (fromDate = "", toDate = "") => {
  if (!isValidReportDate(fromDate) || !isValidReportDate(toDate)) return "Enter a valid date range.";
  if (fromDate && toDate && fromDate > toDate) return "From Date cannot be greater than To Date.";
  return "";
};
export const filterCreditControlRows = (rows, account = "") => {
  const search = String(account || "").trim().toLowerCase();
  return search
    ? rows.filter((row) => `${row.accountCode || ""} ${row.accountName || ""}`.toLowerCase().includes(search))
    : rows;
};
export const filterPermissionAuditRows = (rows, { user = "", module = "" } = {}) => {
  const userSearch = String(user || "").trim().toLowerCase();
  const moduleSearch = String(module || "").trim().toLowerCase();
  return rows.filter((row) =>
    (!userSearch || `${row.userId || ""} ${row.userName || ""}`.toLowerCase().includes(userSearch)) &&
    (!moduleSearch || String(row.module || "").toLowerCase().includes(moduleSearch))
  );
};
export const stockAdjustmentQuantity = (row) =>
  number(row.TotalQty) || number(row.Qty) + number(row.FreeQty);
export const outstandingAfterAllocation = (amount, allocated) => Math.max(0, number(amount) - number(allocated));
export const ageingBucketAmounts = (ageDays, balance) => ({
  Current: ageDays === 0 ? balance : 0,
  Days1To30: ageDays >= 1 && ageDays <= 30 ? balance : 0,
  Days31To60: ageDays >= 31 && ageDays <= 60 ? balance : 0,
  Days61To90: ageDays >= 61 && ageDays <= 90 ? balance : 0,
  Over90Days: ageDays > 90 ? balance : 0,
});
export const isCreditDaysOverdue = (creditDays, overdue) =>
  number(creditDays) > 0 && overdue;
const itemCode = (item) => String(item.productCode || item.ProductCode || item.code || item.productId || String(item.product || "").split(" - ")[0] || "").trim();
const itemName = (item) => String(item.productName || item.ProductName || item.name || "").trim();
const itemBatch = (item) => String(item.batchNo || item.Batch || item.batch || item.selectedBatch?.Batch || ".").trim() || ".";
const itemMrp = (item) => number(item.mrp ?? item.MRP ?? item.selectedBatch?.MRP);
const itemQty = (item) => number(item.quantity ?? item.qty ?? item.Qty) + number(item.free ?? item.Free);

export const consolidateStockMovementRows = (rows = []) => [
  ...rows.reduce((movementMap, row) => {
    const movementKey = [
      String(row.productCode).trim().toUpperCase(),
      String(row.batch || ".").trim().toUpperCase(),
    ].join("\u0000");
    const existingRow = movementMap.get(movementKey);

    if (!existingRow) {
      movementMap.set(movementKey, { ...row });
      return movementMap;
    }

    existingRow.quantityIn += Number(row.quantityIn || 0);
    existingRow.quantityOut += Number(row.quantityOut || 0);

    /* A zero MRP explicitly represents a movement spanning multiple MRPs. */
    if (Math.abs(Number(existingRow.mrp || 0) - Number(row.mrp || 0)) > 0.001) {
      existingRow.mrp = 0;
    }

    return movementMap;
  }, new Map()).values(),
];

export const buildStockMovementReportRows = (movements = [], { fromDate = "", toDate = "", entryType = "" } = {}) => {
  const balances = new Map();
  const rows = [];
  const sortedMovements = [...movements].sort((first, second) =>
    String(first.movementDate || "").localeCompare(String(second.movementDate || "")) ||
    new Date(first.createdAt || 0).getTime() - new Date(second.createdAt || 0).getTime() ||
    String(first._id || "").localeCompare(String(second._id || ""))
  );

  sortedMovements.forEach((movement) => {
    const quantityIn = number(movement.quantityIn);
    const quantityOut = number(movement.quantityOut);
    const productCode = String(movement.productCode || "");
    const batch = String(movement.batch || ".") || ".";
    const godown = String(movement.godown || "");
    const key = [godown, productCode, batch].join("\u0000");
    const balance = (balances.get(key) || 0) + quantityIn - quantityOut;
    balances.set(key, balance);

    const date = String(movement.movementDate || "");
    if ((fromDate && date < fromDate) || (toDate && date > toDate)) return;
    if (entryType === "IN" && quantityIn <= 0) return;
    if (entryType === "OUT" && quantityOut <= 0) return;

    rows.push({
      SrNo: rows.length + 1,
      Date: date,
      TrnSeries: String(movement.sourceType || ""),
      TrnNo: String(movement.documentNo || movement.sourceId || ""),
      Movement: quantityIn > 0 ? "Stock In" : "Stock Out",
      Godown: godown,
      ProductCode: productCode,
      ProductName: String(movement.productName || ""),
      Batch: batch,
      MRP: number(movement.mrp),
      StockIn: quantityIn,
      StockOut: quantityOut,
      BalanceQty: balance,
      Qty: quantityIn || quantityOut,
      Narration: "",
    });
  });

  return rows;
};

export const recordStockMovements = async ({ distributorId, firmId, godown, items, movementDate, sourceType, sourceId, documentNo, direction, userId, session, replaceExisting = false }) => {
  if (replaceExisting) {
    await StockMovement.deleteMany({
      distributorId,
      firmId,
      sourceType,
      sourceId: String(sourceId),
    }).session(session);
  }

  const rows = (items || []).map((item) => {
    const qty = itemQty(item);
    return {
      distributorId, firmId, godown: String(godown || ""), productCode: itemCode(item), productName: itemName(item),
      batch: itemBatch(item), mrp: itemMrp(item), movementDate: String(movementDate || ""), sourceType, sourceId: String(sourceId),
      documentNo: String(documentNo || ""), quantityIn: direction > 0 ? qty : 0, quantityOut: direction < 0 ? qty : 0, userId: String(userId || "system"),
    };
  }).filter((row) => row.productCode && (row.quantityIn > 0 || row.quantityOut > 0));

  if (!rows.length) return [];

  /*
   * The movement index represents one movement per source/product/batch.
   * Sales invoices can legitimately contain the same product and batch on
   * several grid rows. Consolidate those rows before insert so an update
   * cannot fail with a duplicate-key error and the ledger still records the
   * exact total quantity moved by the invoice.
   */
  const consolidatedRows = consolidateStockMovementRows(rows);

  return StockMovement.insertMany(consolidatedRows, { session, ordered: true });
};

export const validateCustomerCredit = async ({ req, session }) => {
  const body = req.body || {};
  if (String(body.BillType || "").toLowerCase().includes("cash")) return null;
  const Account = mongoose.models.Mas_Account;
  const Sales = mongoose.models.T_Sal_Header;
  if (!Account || !Sales) throw new Error("Customer credit validation is unavailable.");
  const partyCode = String(body.PartyCode || "").trim();
  const partyName = String(body.PartyName || "").trim();
  const account = await Account.findOne(tenant(req, partyCode ? { accountCode: partyCode, isActive: { $ne: false } } : { accountName: partyName, isActive: { $ne: false } })).session(session).lean();
  if (!account) throw Object.assign(new Error("Invalid or inactive customer account."), { statusCode: 400 });
  // Calculate the historical sales exposure in MongoDB.  Previously every
  // bill for the party was transferred to Node and reduced there, making save
  // time grow with the imported history rather than the current voucher.
  const today = new Date().toISOString().slice(0, 10);
  const [salesExposure = {}] = await Sales.aggregate([
    { $match: tenant(req, { PartyCode: account.accountCode, isActive: { $ne: false }, IsBillCancelled: { $ne: true } }) },
    { $project: {
      pending: { $max: [{ $subtract: [{ $ifNull: ["$NetAmount", 0] }, { $ifNull: ["$receiptAllocated", 0] }] }, 0] },
      DueDate: { $ifNull: ["$DueDate", ""] },
    } },
    { $group: {
      _id: null,
      outstanding: { $sum: "$pending" },
      pendingBills: { $sum: { $cond: [{ $gt: ["$pending", 0] }, 1, 0] } },
      hasOverdue: { $max: { $cond: [
        { $and: [{ $gt: ["$pending", 0] }, { $lt: ["$DueDate", today] }] },
        1,
        0,
      ] } },
    } },
  ]).session(session);
  const accountOpenings = await openingOutstanding(req, 'Dr', session, account.accountCode);
  const openingOutstandingAmount = accountOpenings.reduce(
    (sum, row) => sum + Math.max(0, number(row.balanceAmount) - number(row.allocatedAmount)),
    0
  );
  const openingPendingBills = accountOpenings.filter(
    row => number(row.balanceAmount) - number(row.allocatedAmount) > 0
  );
  const outstanding = number(salesExposure.outstanding) + openingOutstandingAmount;
  const pendingBillCount = number(salesExposure.pendingBills) + openingPendingBills.length;
  const exposure = outstanding + number(body.NetAmount);
  const overdue = Boolean(salesExposure.hasOverdue) || openingPendingBills.some(row => String(row.postingDate || "") < today);
  const violations = [];
  if (String(account.blackListed || "NO").toUpperCase() === "YES") violations.push("Customer is blacklisted");
  if (number(account.creditAmt) > 0 && exposure > number(account.creditAmt) + 0.01) violations.push(`Credit limit exceeded (${exposure.toFixed(2)} > ${number(account.creditAmt).toFixed(2)})`);
  if (number(account.creditBills) > 0 && pendingBillCount >= number(account.creditBills)) violations.push("Maximum pending bills limit reached");
  if (isCreditDaysOverdue(account.creditDays, overdue)) violations.push("Customer has overdue bills");
  if (!violations.length) return { outstanding, exposure, violations: [] };
  const override = body.creditOverride || {};
  const role = String(req.auth.role || "").toUpperCase();
  if (override.approved === true && String(override.reason || "").trim() && ["ADMIN", "DISTRIBUTOR_ADMIN"].includes(role)) {
    return { outstanding, exposure, violations, overridden: true, reason: String(override.reason), userId: req.auth.userId, timestamp: new Date() };
  }
  throw Object.assign(new Error(`Credit control blocked sale: ${violations.join("; ")}`), { statusCode: 409, code: "CREDIT_CONTROL_BLOCK" });
};

export const normalizeJournalLines = (body) => (body.lines || body.items || []).map((line) => {
  if (!line || typeof line !== "object") return { accountCode: "", debit: Number.NaN, credit: Number.NaN, narration: "" };
  return {
    accountCode: String(line.accountCode || line.code || line.accountName || "").trim(),
    accountName: String(line.accountName || "").trim(),
    debit: line.debit === undefined && line.drAmount === undefined ? 0 : Number(line.debit ?? line.drAmount),
    credit: line.credit === undefined && line.crAmount === undefined ? 0 : Number(line.credit ?? line.crAmount),
    narration: String(line.narration || body.narration || body.narr || ""),
  };
}).filter((line) => line.accountCode || line.debit !== 0 || line.credit !== 0);

export const validateJournalLines = validateJournalEntryLines;

const dateMatch = (req, field = "documentDate") => {
  const condition = {};
  if (req.query.fromDate) condition.$gte = String(req.query.fromDate);
  if (req.query.toDate) condition.$lte = String(req.query.toDate);
  return Object.keys(condition).length ? { [field]: condition } : {};
};

export const financialRows = async (req, includeOpening = false) => {
  // Reversed transaction postings remain effective on their original dates.
  // OPENING_BALANCE is different: legacy edits supersede rows without emitting
  // reversal events. Retain its POSTED-only selection until that path is migrated.
  // OpeningTransaction is never itself read as a financial movement.
  // OpeningTransaction is a reference/summary, not a second ledger posting.
  const filter = includeOpening && req.query.fromDate
    ? (req.query.toDate ? { documentDate: { $lte: String(req.query.toDate) } } : {})
    : dateMatch(req);
  const account = String(req.query.account || "").trim();
  const accountPattern = account ? new RegExp(account.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
  const journals = await Journal.find(tenant(req, { $or: [
    { status: "POSTED" },
    { status: "REVERSED", sourceType: { $ne: "OPENING_BALANCE" } },
  ], ...filter, ...(accountPattern ? { "lines.accountCode": accountPattern } : {}) }),
  { documentDate: 1, documentNo: 1, sourceType: 1, lines: 1, createdAt: 1 })
    .sort({ documentDate: 1, createdAt: 1 }).lean();
  const rows = journals.flatMap((entry) => entry.lines.map((line) => ({
    date: entry.documentDate, documentNo: entry.documentNo || "", source: entry.sourceType,
    accountCode: line.accountCode, narration: line.narration || "", debit: number(line.debit), credit: number(line.credit),
  }))).filter((row) => !accountPattern || accountPattern.test(row.accountCode));
  if (!includeOpening || !req.query.fromDate) return rows;
  const fromDate = String(req.query.fromDate), balances = new Map(), movements = [];
  for (const row of rows) {
    if (row.date < fromDate || (row.date === fromDate && row.source === 'OPENING_BALANCE')) {
      balances.set(row.accountCode, (balances.get(row.accountCode) || 0) + Math.round(row.debit * 100) - Math.round(row.credit * 100));
    } else movements.push(row);
  }
  const openings = [...balances].filter(([, cents]) => cents !== 0).map(([accountCode, cents]) => ({
    date: fromDate, documentNo: "", source: "OPENING_BALANCE", accountCode,
    narration: "Opening Balance", debit: Math.max(cents, 0) / 100, credit: Math.max(-cents, 0) / 100,
  }));
  return [...openings, ...movements];
};

export const summarizeClassifiedRows = (rows, report) => {
  const grouped = new Map();
  for (const row of rows) {
    const value = grouped.get(row.accountCode) || {
      accountCode: row.accountCode,
      accountName: row.accountName,
      accountType: row.accountType,
      normalSide: row.normalSide,
      debit: 0,
      credit: 0,
    };
    value.debit += row.debit;
    value.credit += row.credit;
    grouped.set(row.accountCode, value);
  }
  const summarized = [...grouped.values()].map((row) => ({ ...row, closing: row.debit - row.credit }));
  if (report === "profit-loss") return summarized.filter((row) => ["INCOME", "EXPENSE"].includes(row.accountType));
  if (report === "balance-sheet") return summarized.filter((row) => ["ASSET", "LIABILITY", "EQUITY"].includes(row.accountType));
  return summarized;
};

export default function createP0FeaturesRouter(securityRouter) {
  const router = express.Router();
  registerAccountLedgerRoutes(router, securityRouter, reportDateRangeError);

  // Billing customer details are scoped to the authenticated firm, and use
  // the same open-sales and opening-balance basis as customer credit checks.
  router.get('/sales/customer-details', securityRouter.authorizeRequest('SALES', 'SALES_BILLING', 'view'), async (req, res) => {
    try {
      const accountCode = String(req.query.accountCode || '').trim();
      if (!accountCode || accountCode.length > 100) {
        return res.status(400).json({ success: false, message: 'A valid customer code is required.' });
      }
      const Account = mongoose.models.Mas_Account;
      const Sales = mongoose.models.T_Sal_Header;
      const account = await Account.findOne(tenant(req, { accountCode, isActive: { $ne: false } }))
        .select('accountCode accountName address add2 town state pinCode gstNo').lean();
      if (!account) return res.status(404).json({ success: false, message: 'Customer not found.' });

      const [salesExposure, openings] = await Promise.all([
        Sales.aggregate([
          { $match: tenant(req, { PartyCode: accountCode, isActive: { $ne: false }, IsBillCancelled: { $ne: true } }) },
          { $group: { _id: null, outstanding: { $sum: { $max: [{ $subtract: [{ $ifNull: ['$NetAmount', 0] }, { $ifNull: ['$receiptAllocated', 0] }] }, 0] } } } },
        ]),
        openingOutstanding(req, 'Dr', null, accountCode),
      ]);
      const outstanding = number(salesExposure[0]?.outstanding) + openings.reduce(
        (sum, row) => sum + Math.max(0, number(row.balanceAmount) - number(row.allocatedAmount)), 0
      );
      return res.json({ success: true, customer: account, outstanding: Math.round(outstanding * 100) / 100 });
    } catch (error) {
      console.error('Billing customer details error:', error);
      return res.status(500).json({ success: false, message: 'Customer details could not be loaded.' });
    }
  });

  router.get('/reports/party-outstanding', securityRouter.authorizeRequest('REPORTS', 'OUTSTANDING_REPORT', 'view'), async (req, res) => {
    const account = String(req.query.account || '').trim();
    const accountPattern = account ? new RegExp(account.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'i') : null;
    const accountFilter = (codeField, nameField) => accountPattern
      ? { $expr: { $regexMatch: {
        input: { $concat: [{ $ifNull: [`$${codeField}`, ""] }, " ", { $ifNull: [`$${nameField}`, ""] }] },
        regex: accountPattern,
      } } }
      : {};
    const [sales, purchases, openings] = await Promise.all([
      mongoose.models.T_Sal_Header.find(tenant(req, { isActive: { $ne: false }, IsBillCancelled: { $ne: true }, ...accountFilter('PartyCode', 'PartyName') }))
        .select("PartyCode PartyName BillSeries BillNo BillDate NetAmount receiptAllocated").lean(),
      mongoose.models.T_Pur_Header.find(tenant(req, { isActive: { $ne: false }, ...accountFilter('supplierCode', 'supplierName') }))
        .select("supplierCode supplierName vouSer vouNo invoiceDate netAmt paymentAllocated").lean(),
      openingOutstanding(req),
    ]);
    let rows = [
      ...sales.map(row => ({ accountCode: row.PartyCode, accountName: row.PartyName, source: 'Sales', type: 'SAL', series: row.BillSeries, number: row.BillNo, date: row.BillDate, originalAmount: number(row.NetAmount), broughtForward: '', allocated: number(row.receiptAllocated), debit: Math.max(0, number(row.NetAmount) - number(row.receiptAllocated)), credit: 0 })),
      ...purchases.map(row => ({ accountCode: row.supplierCode, accountName: row.supplierName, source: 'Purchase', type: 'PUR', series: row.vouSer, number: row.vouNo, date: row.invoiceDate, originalAmount: number(row.netAmt), broughtForward: '', allocated: number(row.paymentAllocated), debit: 0, credit: Math.max(0, number(row.netAmt) - number(row.paymentAllocated)) })),
      ...openings.map(row => ({ accountCode: row.accountCode, accountName: row.accountName, source: 'Opening', type: row.transactionType, series: row.transactionSeries, number: row.transactionNo, date: row.date, originalAmount: row.originalAmount, broughtForward: row.balanceAmount, allocated: row.allocatedAmount, debit: row.balanceType === 'Dr' ? row.balanceAmount - row.allocatedAmount : 0, credit: row.balanceType === 'Cr' ? row.balanceAmount - row.allocatedAmount : 0 })),
    ].filter(row => row.debit > 0 || row.credit > 0);
    const accountSearch = account.toLowerCase();
    if (accountSearch) rows = rows.filter(row => `${row.accountCode} ${row.accountName}`.toLowerCase().includes(accountSearch));
    rows.sort((a, b) => String(a.accountName).localeCompare(String(b.accountName)) || String(a.date).localeCompare(String(b.date)));
    res.json({ success: true, rows, summary: { debit: rows.reduce((sum, row) => sum + row.debit, 0), credit: rows.reduce((sum, row) => sum + row.credit, 0) } });
  });

  router.get("/journal-voucher/next-no", securityRouter.authorizeRequest("TRANSACTIONS", "JOURNAL_VOUCHER", "view"), async (req, res) => {
    const last = await JournalVoucher.findOne(tenant(req)).sort({ vNo: -1 }).lean();
    res.json({ success: true, nextNo: number(last?.vNo) + 1 });
  });
  router.get("/journal-voucher", securityRouter.authorizeRequest("TRANSACTIONS", "JOURNAL_VOUCHER", "view"), async (req, res) => {
    res.json({ success: true, data: await JournalVoucher.find(tenant(req, { status: "POSTED" })).sort({ vDate: -1, vNo: -1 }).lean() });
  });
  router.post("/journal-voucher", securityRouter.authorizeRequest("TRANSACTIONS", "JOURNAL_VOUCHER", "add"), async (req, res) => {
    const session = await mongoose.startSession();
    try {
      let saved;
      await session.withTransaction(async () => {
        const lines = normalizeJournalLines(req.body); validateJournalLines(lines);
        const idempotencyKey = String(req.get("Idempotency-Key") || req.body.idempotencyKey || "").trim();
        if (idempotencyKey) {
          const existing = await JournalVoucher.findOne(tenant(req, { idempotencyKey })).session(session);
          if (existing) { saved = existing; return; }
        }
        const last = await JournalVoucher.findOne(tenant(req)).sort({ vNo: -1 }).session(session).lean();
        const importedVNo = number(req.body.vNo);
        const vNo = req.body._desktopImport === true && importedVNo > 0
          ? importedVNo
          : await nextDocumentNumber({ distributorId: req.auth.distributorId, firmId: req.auth.firmId, documentType: "JOURNAL_VOUCHER", documentDate: req.body.vDate, session, minimumValue: number(last?.vNo) });
        [saved] = await JournalVoucher.create([{ distributorId: req.auth.distributorId, firmId: req.auth.firmId, vDate: String(req.body.vDate), vNo, narration: String(req.body.narration || req.body.narr || ""), reference: String(req.body.reference || ""), lines, idempotencyKey }], { session });
        await postBalancedJournal({ distributorId: req.auth.distributorId, firmId: req.auth.firmId, sourceType: "JOURNAL_VOUCHER", sourceId: String(saved._id), documentNo: String(vNo), documentDate: saved.vDate, createdBy: req.auth.userId, lines }, session);
        await writeAuditEvent(req, { entityType: "JOURNAL_VOUCHER", entityId: String(saved._id), action: "CREATE", after: saved.toObject() }, session);
      });
      res.status(201).json({ success: true, data: saved });
    } catch (error) { res.status(error.statusCode || (error.code === 11000 ? 409 : 500)).json({ success: false, message: error.message }); }
    finally { await session.endSession(); }
  });
  router.put("/journal-voucher/:id", securityRouter.authorizeRequest("TRANSACTIONS", "JOURNAL_VOUCHER", "edit"), async (req, res) => {
    const session = await mongoose.startSession();
    try {
      let saved;
      await session.withTransaction(async () => {
        const voucher = await JournalVoucher.findOne(tenant(req, { _id: req.params.id, status: "POSTED" })).session(session);
        if (!voucher) throw Object.assign(new Error("Journal Voucher not found."), { statusCode: 404 });
        const before = voucher.toObject(), lines = normalizeJournalLines(req.body); validateJournalLines(lines);
        await reverseSourceJournal({ distributorId: req.auth.distributorId, firmId: req.auth.firmId, sourceType: "JOURNAL_VOUCHER", sourceId: String(voucher._id), createdBy: req.auth.userId, documentDate: req.body.vDate || voucher.vDate, reason: req.body.reason || "Journal edit reversal" }, session);
        voucher.editHistory.push({ changedAt: new Date(), changedBy: req.auth.userId, reason: String(req.body.reason || "Corrected"), snapshot: before });
        voucher.vDate = String(req.body.vDate || voucher.vDate); voucher.narration = String(req.body.narration || req.body.narr || ""); voucher.reference = String(req.body.reference || ""); voucher.lines = lines;
        saved = await voucher.save({ session });
        await postBalancedJournal({ distributorId: req.auth.distributorId, firmId: req.auth.firmId, sourceType: "JOURNAL_VOUCHER", sourceId: String(voucher._id), documentNo: String(voucher.vNo), documentDate: voucher.vDate, createdBy: req.auth.userId, lines }, session);
        await writeAuditEvent(req, { entityType: "JOURNAL_VOUCHER", entityId: String(voucher._id), action: "EDIT_REPOST", before, after: saved.toObject() }, session);
      });
      res.json({ success: true, data: saved });
    } catch (error) { res.status(error.statusCode || 500).json({ success: false, message: error.message }); }
    finally { await session.endSession(); }
  });
  router.delete("/journal-voucher/:id", securityRouter.authorizeRequest("TRANSACTIONS", "JOURNAL_VOUCHER", "delete"), async (req, res) => {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const voucher = await JournalVoucher.findOne(tenant(req, { _id: req.params.id, status: "POSTED" })).session(session);
        if (!voucher) throw Object.assign(new Error("Journal Voucher not found or already cancelled."), { statusCode: 404 });
        const before = voucher.toObject();
        await reverseSourceJournal({ distributorId: req.auth.distributorId, firmId: req.auth.firmId, sourceType: "JOURNAL_VOUCHER", sourceId: String(voucher._id), createdBy: req.auth.userId, documentDate: voucher.vDate, reason: req.body.reason || "Journal cancellation" }, session);
        voucher.status = "REVERSED"; voucher.reversedAt = new Date(); voucher.reversedBy = req.auth.userId; voucher.reversalReason = String(req.body.reason || "Cancelled"); await voucher.save({ session });
        await writeAuditEvent(req, { entityType: "JOURNAL_VOUCHER", entityId: String(voucher._id), action: "REVERSE", reason: voucher.reversalReason, before, after: voucher.toObject() }, session);
      });
      res.json({ success: true, message: "Journal Voucher cancelled and reversed." });
    } catch (error) { res.status(error.statusCode || 500).json({ success: false, message: error.message }); }
    finally { await session.endSession(); }
  });

  router.get("/chart-of-accounts", securityRouter.authorizeRequest("REPORTS", "FINANCIAL_REPORT", "view"), async (req, res) => {
    try {
      res.json({ success: true, accounts: await listChartAccounts(req) });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message || "Chart of accounts could not be loaded." });
    }
  });

  router.patch("/chart-of-accounts/:accountCode", securityRouter.authorizeRequest("REPORTS", "FINANCIAL_REPORT", "edit"), async (req, res) => {
    try {
      const accountCode = String(req.params.accountCode || "").trim();
      if (!accountCode || accountCode.length > 100) {
        return res.status(400).json({ success: false, message: "A valid account code is required." });
      }
      const mapping = validateChartAccountMapping(req.body);
      if (mapping.postingRole) {
        const duplicateRole = await ChartAccount.findOne(tenant(req, {
          postingRole: mapping.postingRole,
          accountCode: { $ne: accountCode },
        })).select("accountCode").lean();
        if (duplicateRole) {
          return res.status(409).json({ success: false, message: `The ${mapping.postingRole.replaceAll("_", " ").toLowerCase()} role is already assigned to ${duplicateRole.accountCode}.` });
        }
      }
      const saved = await ChartAccount.findOneAndUpdate(
        tenant(req, { accountCode }),
        { $set: { ...mapping, accountName: String(req.body.accountName || "").trim() } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      ).lean();
      res.json({ success: true, account: saved });
    } catch (error) {
      const status = error.statusCode || (error.code === 11000 ? 409 : 500);
      res.status(status).json({ success: false, message: error.message || "Chart account could not be saved." });
    }
  });

  router.get("/reports/financial/:report", securityRouter.authorizeRequest("REPORTS", "FINANCIAL_REPORT", "view"), async (req, res) => {
    try {
      const report = String(req.params.report || "general-ledger");
      const classifiedReports = ["trial-balance", "profit-loss", "balance-sheet", "cash-book", "bank-book"];
      const statementReports = ["trial-balance", "profit-loss", "balance-sheet"];
      const reportFromDate = ["trial-balance", "balance-sheet"].includes(report) ? "" : String(req.query.fromDate || "");
      const dateError = reportDateRangeError(reportFromDate, String(req.query.toDate || ""));
      if (dateError) return res.status(400).json({ success: false, message: dateError });
      let rows;
      if (["trial-balance", "balance-sheet"].includes(report)) {
        const query = { ...req.query, fromDate: "" };
        rows = await financialRows({ auth: req.auth, query });
      } else {
        rows = await financialRows(req, ["general-ledger", "party-ledger"].includes(report));
      }
      const account = String(req.query.account || "").trim().toLowerCase();
      if (account) rows = rows.filter((row) => String(row.accountCode || "").toLowerCase().includes(account));

      let accountMappings = new Map();
      if (classifiedReports.includes(report)) {
        const codes = [...new Set(rows.map((row) => row.accountCode))];
        const mappings = await ChartAccount.find(tenant(req, { accountCode: { $in: codes } })).lean();
        accountMappings = new Map(mappings.map((mapping) => [mapping.accountCode, mapping]));
        const unmappedAccounts = codes.filter((code) => !accountMappings.has(code));
        if (unmappedAccounts.length) {
          return res.status(409).json({
            success: false,
            message: "Classify every account used by this report in Chart of Accounts Setup.",
            unmappedAccounts,
          });
        }
        rows = rows.map((row) => ({
          ...row,
          accountName: accountMappings.get(row.accountCode).accountName || row.accountCode,
          accountType: accountMappings.get(row.accountCode).accountType,
          normalSide: accountMappings.get(row.accountCode).normalSide,
          cashBankType: accountMappings.get(row.accountCode).cashBankType,
        }));
        if (report === "cash-book") rows = rows.filter((row) => row.cashBankType === "CASH");
        if (report === "bank-book") rows = rows.filter((row) => row.cashBankType === "BANK");
      }

      if (statementReports.includes(report)) {
        rows = summarizeClassifiedRows(rows, report);
      }
      res.json({ success: true, report, rows, summary: { debit: rows.reduce((s, r) => s + number(r.debit), 0), credit: rows.reduce((s, r) => s + number(r.credit), 0) } });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message || "Financial report could not be generated." });
    }
  });
  const catalogReportPermissions = {
    "sales-register": ["REPORTS", "PARTY_WISE_SALES"],
    "sales-summary": ["REPORTS", "PARTY_WISE_SALES"],
    "daily-sales": ["REPORTS", "PARTY_WISE_SALES"],
    "monthly-sales": ["REPORTS", "PARTY_WISE_SALES"],
    "salesman-sales": ["REPORTS", "PARTY_WISE_SALES"],
    "area-sales": ["REPORTS", "PARTY_WISE_SALES"],
    "company-sales": ["REPORTS", "PARTY_WISE_SALES"],
    "counter-sales-summary": ["REPORTS", "PARTY_WISE_SALES"],
    "sales-return-register": ["REPORTS", "PARTY_WISE_SALES"],
    "top-selling-products": ["REPORTS", "PRODUCT_WISE_SALES"],
    "purchase-register": ["REPORTS", "PURCHASE_REPORT"],
    "purchase-summary": ["REPORTS", "PURCHASE_REPORT"],
    "supplier-purchase": ["REPORTS", "PURCHASE_REPORT"],
    "company-supplier-purchase": ["REPORTS", "PURCHASE_REPORT"],
    "purchase-rate": ["REPORTS", "PURCHASE_REPORT"],
    "stock-valuation": ["REPORTS", "STOCK_REPORT"],
    "godown-stock": ["REPORTS", "STOCK_REPORT"],
    "batch-stock": ["REPORTS", "STOCK_REPORT"],
    "near-expiry-stock": ["REPORTS", "STOCK_REPORT"],
    "expired-stock": ["REPORTS", "STOCK_REPORT"],
    "reorder-stock": ["REPORTS", "STOCK_REPORT"],
    "stock-adjustments": ["REPORTS", "STOCK_REPORT"],
    "customer-ageing": ["REPORTS", "OUTSTANDING_REPORT"],
    "supplier-outstanding": ["REPORTS", "OUTSTANDING_REPORT"],
    "product-list": ["MASTER", "PRODUCT"],
    "customer-list": ["MASTER", "ACCOUNT"],
    "supplier-list": ["MASTER", "OTHER_ACCOUNT"],
    "company-list": ["MASTER", "COMPANY"],
    "area-list": ["MASTER", "AREA"],
    "salesman-list": ["MASTER", "SALESMAN"],
    "godown-list": ["MASTER", "GODOWN"],
    "e-invoice-register": ["REPORTS", "GST_REPORTS"],
    "eway-bill-register": ["REPORTS", "GST_REPORTS"],
    "collection-register": ["REPORTS", "OUTSTANDING_REPORT"],
    "load-dispatch-register": ["SALES", "CREATE_LOAD"],
    "load-settlement-summary": ["SALES", "SETTLE_LOAD"],
    "purchase-return-register": ["REPORTS", "PURCHASE_REPORT"],
    "purchase-return-analysis": ["REPORTS", "PURCHASE_REPORT"],
    "sales-return-analysis": ["REPORTS", "PARTY_WISE_SALES"],
    "customer-statement": ["REPORTS", "FINANCIAL_REPORT"],
    "supplier-statement": ["REPORTS", "FINANCIAL_REPORT"],
    "collection-by-salesman": ["REPORTS", "OUTSTANDING_REPORT"],
    "receipt-allocation": ["REPORTS", "OUTSTANDING_REPORT"],
    "product-price-list": ["MASTER", "PRODUCT"],
    "batch-expiry-list": ["REPORTS", "STOCK_REPORT"],
    "inactive-masters": ["MASTER", "ACCOUNT"],
    "journal-voucher-register": ["REPORTS", "FINANCIAL_REPORT"],
  };
  router.get("/reports/catalog/:report", (req, res, next) => {
    const permission = catalogReportPermissions[String(req.params.report || "")];
    if (!permission) return res.status(404).json({ success: false, message: "This report is not available." });
    if (req.params.report === "inactive-masters") {
      return securityRouter.authorizeRequest("MASTER", "PRODUCT", "view")(req, res, () =>
        securityRouter.authorizeRequest("MASTER", "ACCOUNT", "view")(req, res, () =>
          securityRouter.authorizeRequest("MASTER", "OTHER_ACCOUNT", "view")(req, res, next)
        )
      );
    }
    return securityRouter.authorizeRequest(permission[0], permission[1], "view")(req, res, next);
  }, async (req, res) => {
    const report = String(req.params.report || "");
    const fromDate = String(req.query.fromDate || "").trim();
    const toDate = String(req.query.toDate || "").trim();
    const dateError = reportDateRangeError(fromDate, toDate);
    if (dateError) return res.status(400).json({ success: false, message: dateError });

    const scope = tenant(req);
    const inRange = () => ({
      ...(fromDate ? { $gte: fromDate } : {}),
      ...(toDate ? { $lte: toDate } : {}),
    });
    const dateQuery = (field) => (fromDate || toDate ? { [field]: inRange() } : {});
    const activeQuery = { isActive: { $ne: false } };
    const text = (value) => String(value ?? "").trim();
    const matchesText = (values, filter) => !filter || values.some((value) =>
      text(value).toLowerCase().includes(filter.toLowerCase())
    );
    const respond = (rows, extra = {}) => res.json({
      success: true,
      rows,
      columns: Object.keys(rows[0] || {}).map((key) => ({ key, label: key.replace(/([a-z])([A-Z])/g, "$1 $2") })),
      ...extra,
    });

    try {
      const missingSources = missingCatalogSources(report, mongoose.models, { companyCode: req.query.companyCode });
      if (missingSources.length) return res.status(503).json({ success: false, message: `Report data source unavailable: ${missingSources.join(", ")}.` });
      const Sales = mongoose.models.T_Sal_Header;
      const Purchase = mongoose.models.T_Pur_Header;
      const CreditNote = mongoose.models.T_CreditNote_Header;
      const Product = mongoose.models.Mas_Product;
      const Stock = mongoose.models.Mas_Stock;
      const Account = mongoose.models.Mas_Account;
      const Company = mongoose.models.Mas_Company;
      const Area = mongoose.models.Mas_Area;
      const Salesman = mongoose.models.Mas_Salesman;
      const Godown = mongoose.models.Mas_Godown;
      const filterProduct = text(req.query.product).toLowerCase();
      const companyCode = text(req.query.companyCode);
      const godownCode = text(req.query.godownCode);
      const accountFilter = text(req.query.account).toLowerCase();
      const dimension = (key, fallback = "") => text(key || fallback) || "Unassigned";

      if (["sales-register", "sales-summary", "daily-sales", "monthly-sales", "salesman-sales", "area-sales", "company-sales", "counter-sales-summary", "top-selling-products", "e-invoice-register", "eway-bill-register"].includes(report)) {
        const query = {
          ...scope, ...activeQuery, IsBillCancelled: { $ne: true },
          BillStatus: { $ne: "CANCELLED" }, ...dateQuery("BillDate"),
        };
        if (companyCode) query.CompanyCode = companyCode;
        if (report === "counter-sales-summary") query.SalesEntryType = "COUNTER_SALES";
        const bills = Sales ? await Sales.find(query).sort({ BillDate: 1, BillNo: 1 }).lean() : [];
        if (report === "sales-register") return respond(bills.filter((bill) =>
          matchesText([bill.PartyCode, bill.PartyName, bill.BillNo, bill.BillSeries], accountFilter)
        ).map((bill) => ({
          Date: bill.BillDate || "", Invoice: [bill.BillSeries, bill.BillNo].filter(Boolean).join("-"),
          CustomerCode: bill.PartyCode || "", Customer: bill.PartyName || "",
          Company: bill.CompanyName || bill.CompanyCode || "", Salesman: bill.SalesmanName || "",
          TaxableValue: number(bill.TaxableValue), Tax: number(bill.SGSTAmount) + number(bill.CGSTAmount) + number(bill.IGSTAmount),
          Total: number(bill.NetAmount), Status: bill.BillStatus || (bill.IsBillCancelled ? "CANCELLED" : "ACTIVE"),
        })));
        if (report === "e-invoice-register") return respond(bills.map((bill) => ({
          Date: bill.BillDate || "", Invoice: [bill.BillSeries, bill.BillNo].filter(Boolean).join("-"),
          Customer: bill.PartyName || "", GSTIN: bill.PartyGSTNo || "",
          IRN: bill.IRNNo || bill.irnNo || bill.historicalSnapshot?.irnNo || "",
          AcknowledgementNo: bill.AckNo || bill.AcknowledgementNo || bill.acknowledgementNo || "",
          Status: bill.IRNNo || bill.irnNo || bill.historicalSnapshot?.irnNo ? "Generated" : "Pending",
        })));
        if (report === "eway-bill-register") return respond(bills.map((bill) => ({
          Date: bill.BillDate || "", Invoice: [bill.BillSeries, bill.BillNo].filter(Boolean).join("-"),
          Customer: bill.PartyName || "", EWayBillNo: bill.EwayBillNo || bill.ewayBillNo || "",
          Status: bill.EwayBillNo || bill.ewayBillNo ? "Generated" : "Not generated", Total: number(bill.NetAmount),
        })));
        if (report === "top-selling-products") {
          const grouped = new Map();
          bills.forEach((bill) => (Array.isArray(bill.items) ? bill.items : []).forEach((item) => {
            const code = text(item.productCode || item.ProductCode || item.code || item.productId || item.ProdCode);
            const name = text(item.productName || item.ProductName || item.name || item.ProdName);
            if (!code || !matchesText([code, name], filterProduct)) return;
            const row = grouped.get(code) || { ProductCode: code, Product: name, Quantity: 0, invoiceIds: new Set() };
            const quantity = number(item.quantity ?? item.qty ?? item.Qty);
            row.Quantity += quantity + number(item.freeQty ?? item.FreeQty ?? item.free);
            row.invoiceIds.add(String(bill._id));
            grouped.set(code, row);
          }));
          return respond([...grouped.values()].map(({ invoiceIds, ...row }) => ({
            ...row, Invoices: invoiceIds.size,
          })).sort((a, b) => b.Quantity - a.Quantity));
        }
        const grouped = new Map();
        const dimensionFor = (bill) => {
          if (report === "salesman-sales") return [dimension(bill.SalesmanCode), dimension(bill.SalesmanName)];
          if (report === "area-sales") return [dimension(bill.AreaCode), dimension(bill.AreaName)];
          if (report === "company-sales") return [dimension(bill.CompanyCode), dimension(bill.CompanyName)];
          if (report === "daily-sales") return [text(bill.BillDate) || "No date", ""];
          if (report === "monthly-sales") return [text(bill.BillDate).slice(0, 7) || "No date", ""];
          if (report === "counter-sales-summary") return [text(bill.BillDate) || "No date", "Counter Sales"];
          if (report === "sales-summary") return [
            text(bill.BillDate) || "No date",
            text(bill.CompanyName || bill.CompanyCode) || "Unassigned",
            text(bill.BillSeries) || "Unassigned",
            text(bill.BillType) || "Unspecified",
          ];
          return ["Total", ""];
        };
        bills.forEach((bill) => {
          const dimensions = dimensionFor(bill);
          const [code, name] = dimensions;
          const key = dimensions.join("\u0000");
          const row = grouped.get(key) || {
            ...(report === "salesman-sales" ? { SalesmanCode: code, Salesman: name } : {}),
            ...(report === "area-sales" ? { AreaCode: code, Area: name } : {}),
            ...(report === "company-sales" ? { CompanyCode: code, Company: name } : {}),
            ...(report === "daily-sales" || report === "monthly-sales" || report === "counter-sales-summary" ? { Period: code } : {}),
            ...(report === "sales-summary" ? { Date: dimensions[0], Company: dimensions[1], Series: dimensions[2], PaymentType: dimensions[3] } : {}),
            Invoices: 0, TaxableValue: 0, Tax: 0, Sales: 0,
          };
          row.Invoices += 1;
          row.TaxableValue += number(bill.TaxableValue);
          row.Tax += number(bill.SGSTAmount) + number(bill.CGSTAmount) + number(bill.IGSTAmount);
          row.Sales += number(bill.NetAmount);
          grouped.set(key, row);
        });
        return respond([...grouped.values()].sort((a, b) => String(a.Date || a.Period || a.Company || a.Salesman || a.Area || "").localeCompare(String(b.Date || b.Period || b.Company || b.Salesman || b.Area || ""))));
      }

      if (report === "collection-register") {
        const Receipt = mongoose.models.T_Receipt;
        const receipts = Receipt ? await Receipt.find({
          ...scope, isActive: { $ne: false }, ...dateQuery("receiptDate"),
        }).sort({ receiptDate: 1, rno: 1 }).lean() : [];
        return respond(receipts.filter((receipt) =>
          matchesText([receipt.partyId, receipt.partyName, receipt.receiptSeries, receipt.rno], accountFilter)
        ).map((receipt) => ({
          Date: receipt.receiptDate || "", Receipt: [receipt.receiptSeries, receipt.rno].filter(Boolean).join("-"),
          Customer: receipt.partyName || "", Amount: number(receipt.receiptAmount),
          Mode: receipt.bankCashName || receipt.bankCash || "", ChequeNo: receipt.chequeNo || "",
          ChequeDate: receipt.chequeDate || "", Load: [receipt.loadSeries, receipt.loadNo].filter(Boolean).join("-"),
          Source: receipt.receiptSource || "",
        })));
      }

      if (report === "collection-by-salesman") {
        const Receipt = mongoose.models.T_Receipt;
        const receipts = Receipt ? await Receipt.find({
          ...scope, isActive: { $ne: false }, ...dateQuery("receiptDate"),
        }).lean() : [];
        const grouped = new Map();
        receipts.forEach((receipt) => {
          const code = text(receipt.salesmanId || receipt.salesman);
          const name = text(receipt.salesmanName || receipt.salesman) || "Unassigned";
          const key = `${code}\u0000${name}`;
          const row = grouped.get(key) || { SalesmanCode: code, Salesman: name, Receipts: 0, Collections: 0 };
          row.Receipts += 1;
          row.Collections += number(receipt.receiptAmount);
          grouped.set(key, row);
        });
        return respond([...grouped.values()].sort((a, b) => a.Salesman.localeCompare(b.Salesman)));
      }

      if (report === "receipt-allocation") {
        const Receipt = mongoose.models.T_Receipt;
        const receipts = Receipt ? await Receipt.find({
          ...scope, isActive: { $ne: false }, ...dateQuery("receiptDate"),
        }).sort({ receiptDate: 1, rno: 1 }).lean() : [];
        const rows = [];
        receipts.filter((receipt) =>
          matchesText([receipt.partyId, receipt.partyName, receipt.receiptSeries, receipt.rno], accountFilter)
        ).forEach((receipt) => {
          const allocations = Array.isArray(receipt.receiptBills) ? receipt.receiptBills : [];
          const applied = allocations.reduce((sum, item) =>
            sum + (number(item.appliedAmount) || number(item.nowAdjust)) + number(item.discAmt), 0);
          allocations.forEach((item) => rows.push({
            Date: receipt.receiptDate || "", Receipt: [receipt.receiptSeries, receipt.rno].filter(Boolean).join("-"),
            Customer: receipt.partyName || "", Bill: [item.trnSeries, item.trnNo].filter(Boolean).join("-"),
            BillDate: item.trnDate || "", Applied: number(item.appliedAmount) || number(item.nowAdjust),
            Discount: number(item.discAmt), Unallocated: 0, AllocationStatus: "Allocated",
          }));
          const unallocated = Math.max(0, number(receipt.receiptAmount) - applied);
          if (unallocated > 0) rows.push({
            Date: receipt.receiptDate || "", Receipt: [receipt.receiptSeries, receipt.rno].filter(Boolean).join("-"),
            Customer: receipt.partyName || "", Bill: "", Applied: 0, Discount: 0,
            Unallocated: unallocated, AllocationStatus: "Unallocated",
          });
        });
        return respond(rows);
      }

      if (report === "sales-return-register" || report === "sales-return-analysis") {
        const notes = CreditNote ? await CreditNote.find({
          ...scope, ...activeQuery, Status: { $ne: "CANCELLED" }, ...dateQuery("VDate"),
          ...(companyCode ? { CompanyCode: companyCode } : {}),
        }).sort({ VDate: 1, CreditNoteNo: 1 }).lean() : [];
        if (report === "sales-return-analysis") {
          const grouped = new Map();
          notes.filter((note) => matchesText([note.PartyCode, note.PartyName], accountFilter))
            .forEach((note) => (Array.isArray(note.items) ? note.items : []).forEach((item) => {
              const productCode = text(item.productCode || item.ProductCode || item.ProdCode);
              const productName = text(item.productName || item.ProductName || item.ProdName);
              if (!productCode || !matchesText([productCode, productName], filterProduct)) return;
              const key = `${productCode}\u0000${note.PartyCode || ""}`;
              const row = grouped.get(key) || {
                ProductCode: productCode, Product: productName,
                CustomerCode: note.PartyCode || "", Customer: note.PartyName || "",
                Quantity: 0, TaxableValue: 0, Tax: 0,
              };
              row.Quantity += number(item.qty ?? item.Qty ?? item.quantity) + number(item.freeQty ?? item.FreeQty ?? item.Free);
              row.TaxableValue += number(item.taxableValue ?? item.TaxableValue);
              row.Tax += number(item.gstAmount ?? item.GSTAmount ?? item.vatAmount ?? item.VatAmt);
              grouped.set(key, row);
            }));
          return respond([...grouped.values()]);
        }
        return respond(notes.map((note) => ({
          Date: note.VDate || "", CreditNote: [note.CreditNoteSeries, note.CreditNoteNo].filter(Boolean).join("-"),
          Invoice: [note.BillSeries, note.BillNo].filter(Boolean).join("-"), CustomerCode: note.PartyCode || "",
          Customer: note.PartyName || "", Company: note.CompanyName || note.CompanyCode || "",
          Quantity: number(note.TotalQty), Tax: number(note.GSTAmount), ReturnValue: number(note.NetAmount ?? note.amount),
          Status: note.Status || "",
        })));
      }

      if (report === "purchase-return-register" || report === "purchase-return-analysis") {
        const DebitNote = mongoose.models.DebitNote || mongoose.models.T_DebitNote_Header;
        const notes = DebitNote ? await DebitNote.find({
          ...scope, ...activeQuery, Status: { $ne: "CANCELLED" }, ...dateQuery("VDate"),
          ...(companyCode ? { CompanyCode: companyCode } : {}),
        }).sort({ VDate: 1, DebitNoteNo: 1 }).lean() : [];
        if (report === "purchase-return-register") return respond(notes.filter((note) =>
          matchesText([note.SupplierCode, note.SupplierName], accountFilter)
        ).map((note) => ({
          Date: note.VDate || "", DebitNote: [note.DebitNoteSeries, note.DebitNoteNo].filter(Boolean).join("-"),
          PurchaseBill: [note.BillSeries, note.BillNo].filter(Boolean).join("-"),
          SupplierCode: note.SupplierCode || "", Supplier: note.SupplierName || "",
          Company: note.CompanyName || note.CompanyCode || "", Quantity: number(note.TotalQty),
          Tax: number(note.GSTAmount), ReturnValue: number(note.NetAmount ?? note.amount), Status: note.Status || "",
        })));
        const grouped = new Map();
        notes.forEach((note) => (Array.isArray(note.items) ? note.items : []).forEach((item) => {
          const productCode = text(item.ProductCode || item.productCode);
          const productName = text(item.ProductName || item.productName);
          if (!productCode || !matchesText([productCode, productName], filterProduct) ||
              !matchesText([note.SupplierCode, note.SupplierName], accountFilter)) return;
          const key = `${productCode}\u0000${note.SupplierCode || ""}`;
          const row = grouped.get(key) || {
            ProductCode: productCode, Product: productName,
            SupplierCode: note.SupplierCode || "", Supplier: note.SupplierName || "",
            Quantity: 0, TaxableValue: 0, Tax: 0, ReturnValue: 0,
          };
          row.Quantity += number(item.Qty) + number(item.Free);
          row.TaxableValue += number(item.TaxableValue);
          row.Tax += number(item.GSTAmount);
          row.ReturnValue += number(item.TaxableValue) + number(item.GSTAmount);
          grouped.set(key, row);
        }));
        return respond([...grouped.values()]);
      }

      if (report === "load-dispatch-register") {
        const Load = mongoose.models.T_Load_Header;
        const loadDateQuery = fromDate || toDate ? { LoadDate: inRange("LoadDate") } : {};
        const loads = Load ? await Load.find({
          DistributorId: req.auth.distributorId, FirmId: req.auth.firmId,
          IsCancelled: { $ne: true }, ...loadDateQuery,
        }).sort({ LoadDate: 1, LoadNo: 1 }).lean() : [];
        return respond(loads.map((load) => ({
          Date: load.LoadDate || "", Load: [load.LoadSeries, load.LoadNo].filter(Boolean).join("-"),
          Company: load.CompanyName || load.CompanyCode || "", DeliveryBoy: load.DeliveryBoyName || load.DeliveryBy || "",
          Salesman: load.SalesmanName || "", Vehicle: load.VehicleNo || "",
          Bills: number(load.TotalBills || load.LoadSummary?.totalBills),
          Parties: number(load.TotalParties || load.LoadSummary?.totalParties),
          Amount: number(load.TotalAmount || load.LoadSummary?.totalAmount),
          Status: load.Status || "",
        })));
      }

      if (report === "load-settlement-summary") {
        const Settlement = mongoose.models.T_SettleLoad;
        const settlementDateQuery = fromDate || toDate ? { settlementDate: inRange("settlementDate") } : {};
        const settlements = Settlement ? await Settlement.find({
          ...scope, isActive: { $ne: false }, ...settlementDateQuery,
        }).sort({ settlementDate: 1, loadNo: 1 }).lean() : [];
        return respond(settlements.map((settlement) => ({
          Date: settlement.settlementDate || "", Load: [settlement.loadSeries, settlement.loadNo].filter(Boolean).join("-"),
          Bills: number(settlement.totalBills), Amount: number(settlement.totalAmount),
          Collections: number(settlement.totalReceiptAmount), Pending: number(settlement.totalPendingAmount),
          Status: settlement.status || "",
        })));
      }

      if (report === "customer-statement" || report === "supplier-statement") {
        const accountSearch = text(req.query.account);
        if (!accountSearch) return res.status(400).json({ success: false, message: "Enter an account code or name." });
        const AccountModel = report === "customer-statement" ? mongoose.models.Mas_Account : mongoose.models.Mas_OtherAccount;
        const escapedAccount = accountSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const exactAccount = AccountModel ? await AccountModel.findOne({
          ...scope, $or: [
            { accountCode: new RegExp(`^${escapedAccount}$`, "i") },
            { accountName: new RegExp(`^${escapedAccount}$`, "i") },
          ],
        }).lean() : null;
        const accountCode = text(exactAccount?.accountCode || accountSearch);
        const ledgerRows = (await financialRows({ auth: req.auth, query: { ...req.query, account: accountCode } }, true))
          .filter((row) => text(row.accountCode).toLowerCase() === accountCode.toLowerCase())
          .sort((a, b) => String(a.date).localeCompare(String(b.date)));
        let runningBalance = 0;
        const rows = ledgerRows.map((row) => {
          runningBalance += number(row.debit) - number(row.credit);
          return {
            Date: row.date || "", Voucher: row.documentNo || "", Source: row.source || "",
            AccountCode: row.accountCode || "", Narration: row.narration || "",
            Debit: number(row.debit), Credit: number(row.credit), Balance: runningBalance,
          };
        });
        return respond(rows);
      }

      if (report === "journal-voucher-register") {
        const JournalVoucher = mongoose.models.T_JournalVoucher;
        const vouchers = JournalVoucher ? await JournalVoucher.find({
          ...scope, ...dateQuery("vDate"), status: { $ne: "REVERSED" },
        }).sort({ vDate: 1, vNo: 1 }).lean() : [];
        return respond(vouchers.map((voucher) => ({
          Date: voucher.vDate || "", VoucherNo: voucher.vNo || "", Reference: voucher.reference || "",
          Narration: voucher.narration || "",
          Debit: (voucher.lines || []).reduce((sum, line) => sum + number(line.debit ?? line.drAmount), 0),
          Credit: (voucher.lines || []).reduce((sum, line) => sum + number(line.credit ?? line.crAmount), 0),
          Status: voucher.status || "",
        })));
      }

      if (["purchase-register", "purchase-summary", "supplier-purchase", "company-supplier-purchase", "purchase-rate"].includes(report)) {
        const purchaseDates = report === "purchase-rate"
          ? (toDate ? { invoiceDate: { $lte: toDate } } : {})
          : dateQuery("invoiceDate");
        const query = { ...scope, ...activeQuery, ...purchaseDates };
        const purchases = Purchase ? await Purchase.find(query).sort({ invoiceDate: 1, vouNo: 1 }).lean() : [];
        let filteredPurchases = purchases;
        if (companyCode) {
          const selectedCompany = Company ? await Company.findOne({ ...scope, companyCode }).lean() : null;
          const acceptedCompanyNames = [companyCode, selectedCompany?.companyName].filter(Boolean).map(text);
          filteredPurchases = filteredPurchases.filter((purchase) => acceptedCompanyNames.includes(text(purchase.company)));
        }
        if (report === "purchase-register") return respond(purchases.filter((row) =>
          matchesText([row.supplierCode, row.supplierName], accountFilter) &&
          filteredPurchases.includes(row)
        ).map((row) => ({
          Date: row.invoiceDate || "", Voucher: [row.vouSer, row.vouNo].filter(Boolean).join("-"),
          SupplierCode: row.supplierCode || "", Supplier: row.supplierName || "",
          Company: row.company || "", InvoiceNo: row.invoiceNumber || "",
          GrossAmount: number(row.grossAmount), Tax: number(row.cgstAmt) + number(row.sgstAmt) + number(row.igstAmt),
          Total: number(row.netAmt),
        })));
        if (report === "purchase-rate") {
          const latest = new Map();
          filteredPurchases.forEach((purchase) => (Array.isArray(purchase.items) ? purchase.items : []).forEach((item) => {
            const code = text(item.productCode || item.ProductCode || item.ProdCode || item.code);
            const name = text(item.productName || item.ProductName || item.ProdName || item.name);
            if (!code || !matchesText([code, name], filterProduct)) return;
            const date = text(purchase.invoiceDate);
            const key = `${code}\u0000${text(item.batch || item.Batch)}`;
            const existing = latest.get(key);
            if (!existing || date >= existing.Date) latest.set(key, {
              ProductCode: code, Product: name, Batch: item.batch || item.Batch || "",
              Date: date, Supplier: purchase.supplierName || "",
              PurchaseRate: number(item.purchaseRate ?? item.PurchaseRate ?? item.PRate ?? item.rate ?? item.Rate),
              Quantity: number(item.quantity ?? item.qty ?? item.Qty),
            });
          }));
          return respond([...latest.values()].sort((a, b) => a.Product.localeCompare(b.Product)));
        }
        if (report === "supplier-purchase" || report === "company-supplier-purchase" || report === "purchase-summary") {
          const groups = new Map();
          filteredPurchases.filter((purchase) => matchesText([purchase.supplierCode, purchase.supplierName], accountFilter)).forEach((purchase) => {
            const keys = report === "supplier-purchase" ? [purchase.supplierCode || "", purchase.supplierName || ""]
              : report === "company-supplier-purchase" ? [purchase.company || "", purchase.supplierName || ""]
                : ["Total", ""];
            const key = keys.join("\u0000");
            const row = groups.get(key) || {
              ...(report === "supplier-purchase" ? { SupplierCode: keys[0], Supplier: keys[1] } : {}),
              ...(report === "company-supplier-purchase" ? { Company: keys[0], Supplier: keys[1] } : {}),
              Invoices: 0, TaxableValue: 0, Tax: 0, Purchases: 0,
            };
            row.Invoices += 1; row.TaxableValue += number(purchase.grossAmount);
            row.Tax += number(purchase.cgstAmt) + number(purchase.sgstAmt) + number(purchase.igstAmt);
            row.Purchases += number(purchase.netAmt); groups.set(key, row);
          });
          return respond([...groups.values()]);
        }
      }

      if (["stock-valuation", "godown-stock", "batch-stock", "near-expiry-stock", "expired-stock", "reorder-stock"].includes(report)) {
        const Stock = mongoose.models.Mas_Stock;
        const stockQuery = { ...scope };
        if (godownCode) stockQuery.GDCode = godownCode;
        if (filterProduct) stockQuery.ProdCode = new RegExp(filterProduct.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        const stocks = Stock ? await Stock.find(stockQuery).sort({ ProdCode: 1, Batch: 1 }).lean() : [];
        const productCodes = [...new Set(stocks.map((row) => text(row.ProdCode)).filter(Boolean))];
        const products = Product && productCodes.length ? await Product.find({ ...scope, productCode: { $in: productCodes } }).lean() : [];
        const productsByCode = new Map(products.map((row) => [text(row.productCode), row]));
        const godowns = Godown ? await Godown.find(scope).lean() : [];
        const godownNames = new Map(godowns.map((row) => [text(row.godownCode || row.GDCode || row.code), text(row.godownName || row.GodownName || row.name)]));
        const expiryDays = Math.max(0, Math.min(Number(req.query.expiryDays) || 90, 3650));
        const today = businessDateIST();
        const expiryLimit = new Date(`${today}T00:00:00.000Z`);
        expiryLimit.setUTCDate(expiryLimit.getUTCDate() + expiryDays);
        const limitDate = expiryLimit.toISOString().slice(0, 10);
        let rows = stocks.map((stock) => {
          const product = productsByCode.get(text(stock.ProdCode)) || {};
          const qty = number(stock.Qty);
          const rate = number(stock.PRate);
          return {
            ProductCode: stock.ProdCode || "", Product: product.productName || "",
            Company: product.companyName || product.companyId || "", GodownCode: stock.GDCode || "",
            Godown: godownNames.get(text(stock.GDCode)) || stock.GDCode || "",
            Batch: stock.Batch || "", Expiry: stock.ExpDt || "", MRP: number(stock.MRP),
            Quantity: qty, PurchaseRate: rate, StockValueAtPurchaseRate: qty * rate,
            ReorderLevel: number(product.Reorder_Level), MinimumStock: number(product.Min_Stock_Holding),
          };
        });
        if (report === "near-expiry-stock") rows = rows.filter((row) => row.Quantity > 0 && row.Expiry && row.Expiry >= today && row.Expiry <= limitDate);
        if (report === "expired-stock") rows = rows.filter((row) => row.Quantity > 0 && row.Expiry && row.Expiry < today);
        if (report === "reorder-stock") rows = rows.filter((row) => row.ReorderLevel > 0 && row.Quantity <= row.ReorderLevel);
        if (report === "godown-stock") {
          const grouped = new Map();
          rows.forEach((row) => {
            const key = `${row.GodownCode}\u0000${row.ProductCode}`;
            const item = grouped.get(key) || { GodownCode: row.GodownCode, Godown: row.Godown, ProductCode: row.ProductCode, Product: row.Product, Quantity: 0, StockValueAtPurchaseRate: 0 };
            item.Quantity += row.Quantity; item.StockValueAtPurchaseRate += row.StockValueAtPurchaseRate; grouped.set(key, item);
          });
          rows = [...grouped.values()];
        }
        if (report === "stock-valuation") rows.forEach((row) => { row.ValuationMethod = "Current quantity × recorded purchase rate"; });
        return respond(rows);
      }

      if (report === "stock-adjustments") {
        const Adjustment = mongoose.models.T_Stock_Adjustment;
        const filter = { ...scope, Status: "COMPLETED", ...dateQuery("VoucherDate") };
        if (godownCode) filter.GDCode = godownCode;
        const rows = Adjustment ? await Adjustment.find(filter).sort({ VoucherDate: 1, VoucherNo: 1 }).lean() : [];
        return respond(rows.filter((row) => matchesText([row.ProdCode, row.ProductName], filterProduct)).map((row) => ({
          Date: row.VoucherDate || "", Voucher: row.VoucherNo || "", Type: row.AdjustmentType || "",
          ProductCode: row.ProdCode || "", Product: row.ProductName || "", Godown: row.GodownName || row.GDCode || "",
          Batch: row.Batch || "", Quantity: stockAdjustmentQuantity(row),
          BalanceAfter: number(row.BalanceAfter), Status: row.Status || "", Narration: row.Narration || "",
        })));
      }

      if (report === "customer-ageing" || report === "supplier-outstanding") {
        const isCustomer = report === "customer-ageing";
        const source = isCustomer ? Sales : Purchase;
        const dateField = isCustomer ? "BillDate" : "invoiceDate";
        const query = {
          ...scope, ...activeQuery,
          ...(isCustomer ? { IsBillCancelled: { $ne: true }, BillStatus: { $ne: "CANCELLED" } } : {}),
        };
        const documents = source ? await source.find(query).sort({ [dateField]: 1 }).lean() : [];
        const openings = await openingOutstanding(req, isCustomer ? "Dr" : "Cr");
        const DebitNote = !isCustomer ? mongoose.models.DebitNote : null;
        const debitNotes = DebitNote ? await DebitNote.find({
          ...scope, isActive: { $ne: false }, Status: { $ne: "CANCELLED" },
        }).lean() : [];
        const debitNotesByBill = new Map();
        const unlinkedDebitNotes = [];
        debitNotes.forEach((note) => {
          const amount = number(note.NetAmount ?? note.amount);
          const billSeries = text(note.BillSeries);
          const billNo = text(note.BillNo);
          if (!billSeries || !billNo || billNo === "0") {
            unlinkedDebitNotes.push(note);
            return;
          }
          const key = `${text(note.SupplierCode)}\u0000${billSeries}\u0000${billNo}`;
          debitNotesByBill.set(key, (debitNotesByBill.get(key) || 0) + amount);
        });
        const today = businessDateIST();
        let rows = documents.map((document) => {
          const debitNoteAdjustment = isCustomer ? 0 : number(debitNotesByBill.get(`${text(document.supplierCode)}\u0000${text(document.vouSer)}\u0000${text(document.vouNo)}`));
          const balance = isCustomer
            ? outstandingAfterAllocation(document.NetAmount, document.receiptAllocated)
            : number(document.netAmt) - number(document.paymentAllocated) - debitNoteAdjustment;
          const ageDate = isCustomer ? text(document.DueDate || document.BillDate) : text(document.invoiceDate);
          const parsedAgeDate = ageDate ? Date.parse(`${ageDate}T00:00:00Z`) : Number.NaN;
          const ageDays = Number.isFinite(parsedAgeDate)
            ? Math.max(0, Math.floor((Date.parse(`${today}T00:00:00Z`) - parsedAgeDate) / 86400000))
            : 0;
          return {
            ...(isCustomer
              ? { AccountCode: document.PartyCode || "", Account: document.PartyName || "", Invoice: [document.BillSeries, document.BillNo].filter(Boolean).join("-") }
              : { AccountCode: document.supplierCode || "", Account: document.supplierName || "", Invoice: [document.vouSer, document.vouNo].filter(Boolean).join("-") }),
            Date: ageDate, OriginalAmount: isCustomer ? number(document.NetAmount) : number(document.netAmt),
            Allocated: isCustomer ? number(document.receiptAllocated) : number(document.paymentAllocated),
            ...(isCustomer ? {} : { DebitNoteAdjustment: debitNoteAdjustment }), Outstanding: balance,
            ...(isCustomer ? { AgeDays: ageDays, ...ageingBucketAmounts(ageDays, balance) } : {}),
          };
        }).filter((row) => isCustomer ? row.Outstanding > 0 : Math.abs(row.Outstanding) > 0.001);
        rows.push(...unlinkedDebitNotes.map((note) => ({
          AccountCode: note.SupplierCode || "", Account: note.SupplierName || "",
          Invoice: [note.DebitNoteSeries, note.DebitNoteNo].filter(Boolean).join("-"),
          Date: note.VDate || "", OriginalAmount: 0, Allocated: 0,
          DebitNoteAdjustment: number(note.NetAmount ?? note.amount),
          Outstanding: -number(note.NetAmount ?? note.amount), Source: "Unlinked Debit Note",
        })));
        rows.push(...openings.map((opening) => {
          const balance = outstandingAfterAllocation(opening.balanceAmount, opening.allocatedAmount);
          const ageDate = text(opening.postingDate || opening.date);
          const parsedToday = Date.parse(`${today}T00:00:00Z`);
          const parsedDate = ageDate ? Date.parse(`${ageDate}T00:00:00Z`) : Number.NaN;
          const ageDays = Number.isFinite(parsedDate) ? Math.max(0, Math.floor((parsedToday - parsedDate) / 86400000)) : 0;
          return {
            AccountCode: opening.accountCode || "", Account: opening.accountName || "",
            Invoice: [opening.transactionSeries, opening.transactionNo].filter(Boolean).join("-"),
            Date: ageDate, OriginalAmount: number(opening.originalAmount), Allocated: number(opening.allocatedAmount),
            Outstanding: balance, Source: "Opening Balance",
            ...(isCustomer ? { AgeDays: ageDays, ...ageingBucketAmounts(ageDays, balance) } : {}),
          };
        }).filter((row) => row.Outstanding > 0));
        rows = rows.filter((row) => matchesText([row.AccountCode, row.Account], accountFilter));
        return respond(rows);
      }

      if (["product-list", "customer-list", "supplier-list", "company-list", "area-list", "salesman-list", "godown-list", "product-price-list", "batch-expiry-list", "inactive-masters"].includes(report)) {
        const active = String(req.query.active || "all");
        const activeFilter = active === "active" ? { isActive: { $ne: false } } : active === "inactive" ? { isActive: false } : {};
        const search = text(req.query.search).toLowerCase();
        const asRows = (records, codeField, nameField, fields = []) => records
          .filter((record) => matchesText([record[codeField], record[nameField], ...fields.map((field) => record[field])], search))
          .map((record) => ({ Code: record[codeField] || "", Name: record[nameField] || "", Status: record.isActive === false ? "Inactive" : "Active" }));
        let rows = [];
        if (report === "product-price-list" && Product) {
          const stockRows = Stock ? await Stock.find(scope).sort({ ProdCode: 1, Batch: 1 }).lean() : [];
          const productCodes = [...new Set(stockRows.map((row) => text(row.ProdCode)).filter(Boolean))];
          const products = productCodes.length ? await Product.find({ ...scope, productCode: { $in: productCodes } }).lean() : [];
          const productNames = new Map(products.map((row) => [text(row.productCode), row]));
          rows = stockRows.map((stock) => {
            const product = productNames.get(text(stock.ProdCode)) || {};
            return {
              ProductCode: stock.ProdCode || "", Product: product.productName || "",
              Batch: stock.Batch || "", MRP: number(stock.MRP), PurchaseRate: number(stock.PRate),
              SalesRate: number(stock.SRate || product.Rate_Per_Unit), Quantity: number(stock.Qty),
            };
          }).filter((row) => matchesText([row.ProductCode, row.Product, row.Batch], search));
        } else if (report === "batch-expiry-list" && Stock) {
          const stockRows = await Stock.find(scope).sort({ ProdCode: 1, Batch: 1 }).lean();
          const productCodes = [...new Set(stockRows.map((row) => text(row.ProdCode)).filter(Boolean))];
          const products = Product && productCodes.length ? await Product.find({ ...scope, productCode: { $in: productCodes } }).lean() : [];
          const productNames = new Map(products.map((row) => [text(row.productCode), row.productName || ""]));
          rows = stockRows.map((stock) => ({
            ProductCode: stock.ProdCode || "", Product: productNames.get(text(stock.ProdCode)) || "",
            Batch: stock.Batch || "", MfgDate: stock.MfgDt || "", Expiry: stock.ExpDt || "",
            Quantity: number(stock.Qty), Godown: stock.GDCode || "",
          })).filter((row) => matchesText([row.ProductCode, row.Product, row.Batch], search));
        } else if (report === "inactive-masters") {
          const OtherAccount = mongoose.models.Mas_OtherAccount;
          const [inactiveProducts, inactiveAccounts] = await Promise.all([
            Product ? Product.find({ ...scope, $or: [{ isActive: false }, { locked: true } ] }).lean() : [],
            Account ? Account.find({ ...scope, $or: [{ isActive: false }, { isLock: "YES" }, { blackListed: "YES" }] }).lean() : [],
          ]);
          rows = [
            ...inactiveProducts.map((item) => ({ Type: "Product", Code: item.productCode || "", Name: item.productName || "", Status: item.isActive === false ? "Inactive" : "Blocked" })),
            ...inactiveAccounts.map((item) => ({ Type: "Account", Code: item.accountCode || "", Name: item.accountName || "", Status: item.isActive === false ? "Inactive" : item.blackListed === "YES" ? "Blacklisted" : "Blocked" })),
            ...(OtherAccount ? (await OtherAccount.find({ ...scope, $or: [{ isActive: false }, { isLock: "YES" }, { blackListed: "YES" }] }).lean())
              .map((item) => ({ Type: "Supplier", Code: item.accountCode || "", Name: item.accountName || "", Status: item.isActive === false ? "Inactive" : item.blackListed === "YES" ? "Blacklisted" : "Blocked" })) : []),
          ].filter((row) => matchesText([row.Type, row.Code, row.Name, row.Status], search));
        } else if (report === "product-list" && Product) {
          rows = asRows(await Product.find({ ...scope, ...activeFilter }).sort({ productCode: 1 }).lean(), "productCode", "productName", ["hsn", "companyName", "category", "group"]);
        } else if (report === "customer-list" && Account) {
          rows = asRows(await Account.find({ ...scope, ...activeFilter }).sort({ accountCode: 1 }).lean(), "accountCode", "accountName", ["town", "state", "gstNo", "mobileNo"]);
        } else if (report === "supplier-list") {
          const OtherAccount = mongoose.models.Mas_OtherAccount;
          rows = OtherAccount ? asRows(await OtherAccount.find({ ...scope, ...activeFilter }).sort({ accountCode: 1 }).lean(), "accountCode", "accountName", ["town", "state", "gstNo", "mobileNo"]) : [];
        } else if (report === "company-list" && Company) {
          rows = asRows(await Company.find({ ...scope, ...activeFilter }).sort({ companyCode: 1 }).lean(), "companyCode", "companyName", ["gstNo", "state"]);
        } else if (report === "area-list" && Area) {
          rows = asRows(await Area.find({ ...scope, ...activeFilter }).sort({ areaCode: 1 }).lean(), "areaCode", "areaName");
        } else if (report === "salesman-list" && Salesman) {
          rows = asRows(await Salesman.find({ ...scope, ...activeFilter }).sort({ salesmanCode: 1 }).lean(), "salesmanCode", "salesmanName", ["mobileNo"]);
        } else if (report === "godown-list" && Godown) {
          rows = asRows(await Godown.find({ ...scope, ...activeFilter }).sort({ godownCode: 1 }).lean(), "godownCode", "godownName", ["GDCode"]);
        }
        return respond(rows);
      }
      return res.status(404).json({ success: false, message: "This report is not available." });
    } catch (error) {
      console.error(`Catalog report generation failed (${report}):`, error);
      return res.status(500).json({ success: false, message: "Report generation failed.", error: error.message });
    }
  });
  router.get("/reports/stock-movement", securityRouter.authorizeRequest("REPORTS", "STOCK_REPORT", "view"), async (req, res) => {
    const dateError = reportDateRangeError(String(req.query.fromDate || ""), String(req.query.toDate || ""));
    if (dateError) return res.status(400).json({ success: false, message: dateError });
    const StockMovementModel = mongoose.models.Inv_StockMovement;
    const StockAdjustment = mongoose.models.T_Stock_Adjustment;
    const missingSources = missingStockMovementSources(mongoose.models, { companyCode: req.query.companyCode });
    if (missingSources.length) return res.status(503).json({ success: false, message: `Stock movement data source unavailable: ${missingSources.join(", ")}.` });
    const entryType = String(req.query.entryType || "").trim().toUpperCase();
    const movementFilter = tenant(req);
    const adjustmentFilter = tenant(req, { Status: "COMPLETED" });
    if (req.query.toDate) {
      movementFilter.movementDate = { $lte: String(req.query.toDate) };
      adjustmentFilter.VoucherDate = { $lte: String(req.query.toDate) };
    }
    if (req.query.godownCode) {
      movementFilter.godown = String(req.query.godownCode);
      adjustmentFilter.GDCode = String(req.query.godownCode);
    }
    const companyCode = String(req.query.companyCode || "").trim();
    const movementConditions = [];
    const adjustmentConditions = [];
    if (companyCode) {
      const Company = mongoose.models.Mas_Company;
      const Product = mongoose.models.Mas_Product;
      const selectedCompany = Company
        ? await Company.findOne(tenant(req, { companyCode, isActive: { $ne: false } })).lean()
        : null;
      const acceptedCompanyKeys = new Set([
        companyCode,
        selectedCompany?._id,
        selectedCompany?.companyCode,
        selectedCompany?.companyName,
      ].filter(Boolean).map((value) => String(value).trim().toLowerCase()));
      const companyProducts = Product
        ? await Product.find(tenant(req, { isActive: { $ne: false } })).select("productCode companyId companyName").lean()
        : [];
      const productCodes = companyProducts.filter((product) =>
        [product.companyId, product.companyName]
          .filter(Boolean)
          .some((value) => acceptedCompanyKeys.has(String(value).trim().toLowerCase()))
      ).map((product) => String(product.productCode || "")).filter(Boolean);
      movementConditions.push({ productCode: { $in: productCodes } });
      adjustmentConditions.push({ $or: [{ CompanyCode: companyCode }, { ProdCode: { $in: productCodes } }] });
    }
    if (req.query.product) {
      const escaped = String(req.query.product).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const search = new RegExp(escaped, "i");
      movementConditions.push({ $or: [{ productCode: search }, { productName: search }] });
      adjustmentConditions.push({ $or: [{ ProdCode: search }, { ProductName: search }] });
    }
    if (movementConditions.length) movementFilter.$and = movementConditions;
    if (adjustmentConditions.length) adjustmentFilter.$and = adjustmentConditions;
    const [movements, adjustments] = await Promise.all([
      StockMovementModel ? StockMovementModel.find(movementFilter).sort({ movementDate: 1, createdAt: 1, _id: 1 }).lean() : [],
      StockAdjustment ? StockAdjustment.find(adjustmentFilter).sort({ VoucherDate: 1, createdAt: 1, _id: 1 }).lean() : [],
    ]);
    const trackedAdjustments = new Set(movements
      .filter((movement) => String(movement.sourceType || "").startsWith("STOCK_ADJUSTMENT"))
      .map((movement) => String(movement.sourceId || "")));
    const legacyAdjustments = adjustments
      .filter((row) => !trackedAdjustments.has(String(row._id)))
      .map((row) => {
        const quantity = stockAdjustmentQuantity(row);
        const stockIn = ["IN", "DAMAGE_IN"].includes(row.AdjustmentType) ? quantity : 0;
        const stockOut = ["OUT", "DAMAGE_OUT"].includes(row.AdjustmentType) ? quantity : 0;
        return {
          _id: row._id,
          movementDate: row.VoucherDate,
          sourceType: "STOCK_ADJUSTMENT",
          sourceId: String(row._id),
          documentNo: row.VoucherNo,
          godown: row.GDCode,
          productCode: row.ProdCode,
          productName: row.ProductName,
          batch: row.Batch,
          mrp: row.MRP,
          quantityIn: stockIn,
          quantityOut: stockOut,
          createdAt: row.createdAt,
        };
      });
    const rows = buildStockMovementReportRows([...movements, ...legacyAdjustments], {
      fromDate: String(req.query.fromDate || ""),
      toDate: String(req.query.toDate || ""),
      entryType: entryType === "IN" || entryType === "OUT" ? entryType : "",
    });
    res.json({ success: true, rows });
  });
  router.get("/reports/audit-trail", securityRouter.authorizeRequest("REPORTS", "AUDIT_TRAIL", "view"), async (req, res) => {
    const dateError = reportDateRangeError(String(req.query.fromDate || ""), String(req.query.toDate || ""));
    if (dateError) return res.status(400).json({ success: false, message: dateError });
    const filter = tenant(req); if (req.query.fromDate || req.query.toDate) { filter.createdAt = {}; if (req.query.fromDate) filter.createdAt.$gte = new Date(`${req.query.fromDate}T00:00:00.000Z`); if (req.query.toDate) filter.createdAt.$lte = new Date(`${req.query.toDate}T23:59:59.999Z`); }
    res.json({ success: true, rows: await AuditEvent.find(filter).sort({ createdAt: -1 }).limit(1000).lean() });
  });
  router.get("/reports/permission-audit", securityRouter.authorizeRequest("REPORTS", "PERMISSION_AUDIT", "view"), async (req, res) => {
    const Security = mongoose.models.Mas_SecuritySetup;
    if (!Security) return res.status(503).json({ success: false, message: "Permission data source is unavailable." });
    const docs = await Security.find(tenant(req)).lean();
    const rows = docs.flatMap((doc) => Object.entries(doc.permissions || {}).flatMap(([module, operations]) => Object.entries(operations || {}).map(([operation, permission]) => ({ userId: doc.userId || doc.userName || "", userName: doc.userName || "", module: module.toUpperCase(), operation, view: !!permission.view, add: !!permission.add, edit: !!permission.edit, delete: !!permission.delete, print: !!permission.print, export: !!permission.export }))));
    res.json({ success: true, rows: filterPermissionAuditRows(rows, { user: req.query.user, module: req.query.module }) });
  });
  router.get("/reports/credit-control", securityRouter.authorizeRequest("REPORTS", "CREDIT_CONTROL", "view"), async (req, res) => {
    const Account = mongoose.models.Mas_Account, Sales = mongoose.models.T_Sal_Header;
    if (!Account || !Sales) return res.status(503).json({ success: false, message: "Credit control data source is unavailable." });
    const accounts = Account ? await Account.find(tenant(req, { isActive: { $ne: false } }))
      .select("accountCode accountName blackListed creditAmt creditDays creditBills").lean() : [];
    const sales = Sales ? await Sales.find(tenant(req, { isActive: { $ne: false }, IsBillCancelled: { $ne: true } })).select({ PartyCode: 1, NetAmount: 1, receiptAllocated: 1, DueDate: 1 }).lean() : [];
    const openingBills = await openingOutstanding(req, 'Dr');
    sales.push(...openingBills.map(row => ({ PartyCode: row.accountCode, NetAmount: row.balanceAmount, receiptAllocated: row.allocatedAmount, DueDate: row.postingDate })));
    const today = new Date().toISOString().slice(0, 10);
    const rows = accounts.map((account) => { const bills = sales.filter((bill) => bill.PartyCode === account.accountCode); const outstanding = bills.reduce((sum, bill) => sum + Math.max(0, number(bill.NetAmount) - number(bill.receiptAllocated)), 0); return { accountCode: account.accountCode, accountName: account.accountName, blackListed: account.blackListed, creditLimit: number(account.creditAmt), creditDays: number(account.creditDays), maximumBills: number(account.creditBills), pendingBills: bills.filter((bill) => number(bill.NetAmount) - number(bill.receiptAllocated) > 0).length, outstanding, overdue: bills.some((bill) => number(bill.NetAmount) - number(bill.receiptAllocated) > 0 && String(bill.DueDate || "") < today) ? "YES" : "NO" }; });
    res.json({ success: true, rows: filterCreditControlRows(rows, req.query.account) });
  });
  router.get("/dashboard/summary", async (req, res) => {
    const Sales = mongoose.models.T_Sal_Header, Purchase = mongoose.models.T_Pur_Header, Receipt = mongoose.models.T_Receipt, Stock = mongoose.models.Mas_Stock;
    const Load = mongoose.models.T_Load_Header;
    const Account = mongoose.models.Mas_Account, Product = mongoose.models.Mas_Product;
    const CreditNote = mongoose.models.T_CreditNote_Header, DebitNote = mongoose.models.DebitNote;
    const DamageStock = mongoose.models.Mas_DamStock, Payment = mongoose.models.T_Payment;
    const missingSources = missingDashboardSources(mongoose.models);
    if (missingSources.length) return res.status(503).json({ success: false, message: `Dashboard data source unavailable: ${missingSources.join(", ")}.` });
    const scope = tenant(req);
    const today = new Date().toISOString().slice(0, 10);
    const requestedDate = String(req.query.date || "");
    const dateError = reportDateRangeError("", requestedDate);
    if (dateError) return res.status(400).json({ success: false, message: dateError });
    const selectedDate = requestedDate || today;
    const requestedStart = String(req.query.fromDate || "");
    const startDateError = reportDateRangeError(requestedStart, selectedDate);
    if (startDateError) return res.status(400).json({ success: false, message: startDateError });
    const selectedStart = requestedStart || selectedDate;
    const requestedCollectionStart = String(req.query.collectionFromDate || "");
    const requestedCollectionEnd = String(req.query.collectionToDate || "");
    const hasCollectionRange = requestedCollectionStart || requestedCollectionEnd;
    const collectionDateError = hasCollectionRange && (!requestedCollectionStart || !requestedCollectionEnd)
      ? "Enter a valid collection date range."
      : hasCollectionRange
      ? reportDateRangeError(requestedCollectionStart, requestedCollectionEnd)
      : "";
    if (collectionDateError || (requestedCollectionEnd && requestedCollectionEnd > selectedDate)) {
      return res.status(400).json({ success: false, message: collectionDateError || "Collection date range cannot be later than the report date." });
    }
    const collectionDateFilter = hasCollectionRange
      ? { $gte: requestedCollectionStart, $lte: requestedCollectionEnd }
      : { $lte: selectedDate };
    const selectedMonth = selectedDate.slice(0, 7);
    const previousMonth = new Date(`${selectedMonth}-01T00:00:00Z`);
    previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1);
    const previousMonthKey = previousMonth.toISOString().slice(0, 7);
    const salesMatch = { ...scope, isActive: { $ne: false }, IsBillCancelled: { $ne: true } };
    const numeric = (field) => ({ $convert: { input: field, to: "double", onError: 0, onNull: 0 } });
    const pending = { $max: [{ $subtract: [numeric("$NetAmount"), numeric("$receiptAllocated")] }, 0] };
    const pendingEInvoiceMatch = {
      BillDate: { $lte: selectedDate },
      SalesEntryType: { $ne: "COUNTER_SALES" },
      $expr: { $eq: [{ $trim: { input: { $ifNull: ["$IRNNo", ""] } } }, ""] },
    };

    const [salesFacets, purchaseFacets, receiptFacets, stockFacets, openingBills, flashCredit, flashDamage, flashDebit, flashPayment, accountCount, productCount, loadRows] = await Promise.all([
      Sales ? Sales.aggregate([
        { $match: salesMatch },
        { $facet: {
          totals: [{ $group: { _id: null, totalSales: { $sum: numeric("$NetAmount") }, outstanding: { $sum: pending }, totalInvoices: { $sum: 1 }, overdue: { $sum: { $cond: [{ $lt: [{ $ifNull: ["$DueDate", ""] }, today] }, pending, 0] } } } }],
          flash: [{ $group: { _id: null,
            today: { $sum: { $cond: [{ $eq: ["$BillDate", selectedDate] }, numeric("$NetAmount"), 0] } },
            period: { $sum: { $cond: [{ $and: [{ $gte: ["$BillDate", selectedStart] }, { $lte: ["$BillDate", selectedDate] }] }, numeric("$NetAmount"), 0] } },
            month: { $sum: { $cond: [{ $eq: [{ $substrBytes: [{ $ifNull: ["$BillDate", ""] }, 0, 7] }, selectedMonth] }, numeric("$NetAmount"), 0] } },
            previousMonth: { $sum: { $cond: [{ $eq: [{ $substrBytes: [{ $ifNull: ["$BillDate", ""] }, 0, 7] }, previousMonthKey] }, numeric("$NetAmount"), 0] } },
          } } ],
          recentInvoices: [{ $sort: { BillDate: -1, BillNo: -1, _id: -1 } }, { $limit: 10 }, { $project: { _id: 0, billNo: { $concat: [{ $ifNull: ["$BillSeries", ""] }, { $convert: { input: "$BillNo", to: "string", onError: "", onNull: "" } }] }, date: "$BillDate", party: "$PartyName", amount: "$NetAmount", pending } }],
          pendingEInvoices: [{ $match: { BillDate: { $lte: selectedDate }, SalesEntryType: { $ne: "COUNTER_SALES" } } }, { $sort: { BillDate: -1, BillNo: -1, _id: -1 } }, { $limit: 12 }, { $project: { billNo: { $concat: [{ $ifNull: ["$BillSeries", ""] }, { $convert: { input: "$BillNo", to: "string", onError: "", onNull: "" } }] }, date: "$BillDate", party: "$PartyName", amount: "$NetAmount", irnNo: "$IRNNo" } }],
          generateEInvoices: [{ $match: pendingEInvoiceMatch }, { $sort: { BillDate: -1, BillNo: -1, _id: -1 } }, { $limit: 12 }, { $project: { billNo: { $concat: [{ $ifNull: ["$BillSeries", ""] }, { $convert: { input: "$BillNo", to: "string", onError: "", onNull: "" } }] }, date: "$BillDate", party: "$PartyName", amount: "$NetAmount", irnNo: "$IRNNo" } }],
          generateEInvoiceCount: [{ $match: pendingEInvoiceMatch }, { $count: "total" }],
          topCustomers: [{ $group: { _id: { $ifNull: ["$PartyName", { $ifNull: ["$PartyCode", "Unknown"] }] }, amount: { $sum: numeric("$NetAmount") } } }, { $sort: { amount: -1 } }, { $limit: 5 }, { $project: { _id: 0, name: "$_id", amount: 1 } }],
          salesTrend: [{ $group: { _id: { $ifNull: ["$BillDate", "No date"] }, sales: { $sum: numeric("$NetAmount") } } }, { $sort: { _id: -1 } }, { $limit: 30 }, { $sort: { _id: 1 } }, { $project: { _id: 0, label: "$_id", sales: 1, collections: { $literal: 0 } } }],
          topProducts: [
            { $unwind: "$items" },
            { $project: {
              code: { $ifNull: ["$items.productCode", { $ifNull: ["$items.ProductCode", { $ifNull: ["$items.code", { $ifNull: ["$items.productId", "Unknown"] }] }] }] },
              name: { $ifNull: ["$items.productName", { $ifNull: ["$items.ProductName", { $ifNull: ["$items.name", ""] }] }] },
              quantity: { $add: [
                { $convert: { input: { $ifNull: ["$items.quantity", { $ifNull: ["$items.qty", { $ifNull: ["$items.Qty", 0] }] }] }, to: "double", onError: 0, onNull: 0 } },
                { $convert: { input: { $ifNull: ["$items.free", { $ifNull: ["$items.Free", { $ifNull: ["$items.freeQty", 0] }] }] }, to: "double", onError: 0, onNull: 0 } },
              ] },
              amount: { $convert: { input: { $ifNull: ["$items.netAmount", { $ifNull: ["$items.NetAmount", { $ifNull: ["$items.amount", { $ifNull: ["$items.grossAmount", 0] }] }] }] }, to: "double", onError: 0, onNull: 0 } },
            } },
            { $group: { _id: "$code", name: { $first: "$name" }, quantity: { $sum: "$quantity" }, amount: { $sum: "$amount" } } },
            { $sort: { amount: -1 } }, { $limit: 5 },
            { $project: { _id: 0, code: "$_id", name: { $cond: [{ $eq: ["$name", ""] }, "$_id", "$name"] }, quantity: 1, amount: 1 } },
          ],
        } },
      ]) : Promise.resolve([{ totals: [], flash: [], recentInvoices: [], topCustomers: [], topProducts: [], salesTrend: [] }]),
      Purchase ? Purchase.aggregate([
        { $match: { ...scope, isActive: { $ne: false } } },
        { $facet: {
          totals: [{ $group: { _id: null, total: { $sum: numeric("$netAmt") } } }],
          flash: [{ $group: { _id: null,
            today: { $sum: { $cond: [{ $eq: ["$invoiceDate", selectedDate] }, numeric("$netAmt"), 0] } },
            period: { $sum: { $cond: [{ $and: [{ $gte: ["$invoiceDate", selectedStart] }, { $lte: ["$invoiceDate", selectedDate] }] }, numeric("$netAmt"), 0] } },
            month: { $sum: { $cond: [{ $eq: [{ $substrBytes: [{ $ifNull: ["$invoiceDate", ""] }, 0, 7] }, selectedMonth] }, numeric("$netAmt"), 0] } },
            previousMonth: { $sum: { $cond: [{ $eq: [{ $substrBytes: [{ $ifNull: ["$invoiceDate", ""] }, 0, 7] }, previousMonthKey] }, numeric("$netAmt"), 0] } },
          } } ],
          trend: [
            { $match: { invoiceDate: { $type: "string", $ne: "" } } },
            { $group: { _id: "$invoiceDate", purchase: { $sum: numeric("$netAmt") } } },
            { $sort: { _id: -1 } }, { $limit: 30 }, { $sort: { _id: 1 } },
            { $project: { _id: 0, label: "$_id", purchase: 1 } },
          ],
        } },
      ]) : Promise.resolve([{ totals: [], flash: [], trend: [] }]),
      Receipt ? Receipt.aggregate([
        { $match: { ...scope, status: { $ne: "REVERSED" } } },
        { $facet: {
          totals: [{ $group: { _id: null, total: { $sum: numeric("$receiptAmount") } } }],
          rows: [
            { $match: { receiptDate: collectionDateFilter } },
            { $project: { receiptDate: 1, receiptAmount: 1, bankCash: 1, bankCashName: 1, bankCashGroup: 1, chequeNo: 1 } },
          ],
        } },
      ]) : Promise.resolve([{ totals: [], rows: [] }]),
      Stock ? Stock.aggregate([
        { $match: scope },
        { $facet: {
          totals: [{ $group: { _id: null, stockValue: { $sum: { $multiply: [numeric("$Qty"), numeric("$PRate")] } }, lowStock: { $sum: { $cond: [{ $and: [{ $gt: [numeric("$Qty"), 0] }, { $lte: [numeric("$Qty"), 10] }] }, 1, 0] } }, expiry: { $sum: { $cond: [{ $and: [{ $gt: [numeric("$Qty"), 0] }, { $ne: [{ $ifNull: ["$ExpDt", ""] }, ""] }, { $lte: ["$ExpDt", today] }] }, 1, 0] } } } }],
          lowStockItems: [{ $match: { Qty: { $gt: 0, $lte: 10 } } }, { $limit: 10 }, { $project: { _id: 0, product: "$ProdCode", stock: "$Qty", unit: { $literal: "Units" } } }],
        } },
      ]) : Promise.resolve([{ totals: [], lowStockItems: [] }]),
      openingOutstanding(req, 'Dr'),
      CreditNote ? CreditNote.aggregate([{ $match: { ...scope, isActive: { $ne: false }, Status: { $ne: "Cancelled" } } }, { $group: { _id: null,
        today: { $sum: { $cond: [{ $eq: ["$VDate", selectedDate] }, numeric("$NetAmount"), 0] } },
        month: { $sum: { $cond: [{ $eq: [{ $substrBytes: [{ $ifNull: ["$VDate", ""] }, 0, 7] }, selectedMonth] }, numeric("$NetAmount"), 0] } },
      } }]) : [],
      DamageStock ? DamageStock.aggregate([{ $match: scope }, { $group: { _id: null, value: { $sum: { $multiply: [numeric("$Qty"), numeric("$PRate")] } } } }]) : [],
      DebitNote ? DebitNote.aggregate([{ $match: { ...scope, isActive: { $ne: false }, Status: { $ne: "Cancelled" } } }, { $group: { _id: null,
        month: { $sum: { $cond: [{ $eq: [{ $substrBytes: [{ $ifNull: ["$VDate", ""] }, 0, 7] }, selectedMonth] }, numeric("$NetAmount"), 0] } },
      } }]) : [],
      Payment ? Payment.aggregate([{ $match: { ...scope, status: { $ne: "REVERSED" } } }, { $group: { _id: null, total: { $sum: numeric("$amount") } } }]) : [],
      Account ? Account.countDocuments({ ...scope, isActive: true }) : 0,
      Product ? Product.countDocuments({ ...scope, isActive: true }) : 0,
      Load ? Load.aggregate([
        { $match: { DistributorId: req.auth.distributorId, FirmId: req.auth.firmId, IsCancelled: { $ne: true } } },
        { $sort: { LoadDate: -1, LoadNo: -1 } },
        { $facet: {
          rows: [
            { $limit: 10 },
            { $project: { LoadSeries: 1, LoadNo: 1, LoadDate: 1, Status: 1, IsSettled: 1, TotalBills: 1, TotalAmount: 1 } },
          ],
          pendingCount: [
            { $match: {
              IsSettled: { $ne: true },
              $expr: { $ne: [{ $toUpper: { $convert: { input: { $ifNull: ["$Status", "ACTIVE"] }, to: "string", onError: "", onNull: "" } } }, "SETTLED"] },
            } },
            { $count: "total" },
          ],
        } },
      ]) : [],
    ]);

    const salesData = salesFacets[0] || {}, salesTotals = salesData.totals?.[0] || {};
    const purchaseData = purchaseFacets[0] || {}, receiptData = receiptFacets[0] || {};
    const purchaseTotals = purchaseData.totals || [], receiptTotals = receiptData.totals || [];
    const flashSales = salesData.flash || [], flashPurchase = purchaseData.flash || [];
    const purchaseTrend = purchaseData.trend || [], collectionRows = receiptData.rows || [];
    const stockData = stockFacets[0] || {}, stockTotals = stockData.totals?.[0] || {};
    const openingOutstandingAmount = openingBills.reduce((sum, row) => sum + number(row.balanceAmount) - number(row.allocatedAmount), 0);
    const openingOverdue = openingBills.filter(row => row.postingDate < today).reduce((sum, row) => sum + number(row.balanceAmount) - number(row.allocatedAmount), 0);
    const recentInvoices = (salesData.recentInvoices || []).map(row => ({ ...row, status: number(row.pending) > 0 ? "Pending" : "Paid", pending: undefined }));
    const loadData = loadRows[0] || {};
    res.json({ success: true, data: {
      accountCount, productCount,
      totalSales: number(salesTotals.totalSales), totalPurchase: number(purchaseTotals[0]?.total), collection: number(receiptTotals[0]?.total),
      outstanding: number(salesTotals.outstanding) + openingOutstandingAmount, overdue: number(salesTotals.overdue) + openingOverdue,
      stockValue: number(stockTotals.stockValue), lowStock: number(stockTotals.lowStock), lowStockItems: stockData.lowStockItems || [],
      expiry: number(stockTotals.expiry), totalInvoices: number(salesTotals.totalInvoices), recentInvoices,
      pendingEInvoices: salesData.pendingEInvoices || [],
      generateEInvoices: salesData.generateEInvoices || [], generateEInvoiceCount: number(salesData.generateEInvoiceCount?.[0]?.total),
      collectionRows: collectionRows.map(row => ({ date: row.receiptDate, amount: number(row.receiptAmount), bankCash: row.bankCash || "", bankCashName: row.bankCashName || "", bankCashGroup: row.bankCashGroup || "", chequeNo: row.chequeNo || "" })),
      loads: (loadData.rows || []).map(row => ({ id: row._id, number: `${row.LoadSeries || ""}${row.LoadNo ?? ""}`, date: row.LoadDate || "", status: row.Status || "ACTIVE", delivered: row.IsSettled === true || String(row.Status || "").toUpperCase() === "SETTLED", bills: number(row.TotalBills), amount: number(row.TotalAmount) })),
      pendingLoadCount: number(loadData.pendingCount?.[0]?.total),
      topCustomers: salesData.topCustomers || [], topProducts: salesData.topProducts || [], salesTrend: salesData.salesTrend || [], purchaseTrend,
      flashCard: { date: selectedDate, todaySales: number(flashSales[0]?.today), periodSales: number(flashSales[0]?.period), monthlySales: number(flashSales[0]?.month),
        previousMonthSales: number(flashSales[0]?.previousMonth),
        todayPurchase: number(flashPurchase[0]?.today), periodPurchase: number(flashPurchase[0]?.period), monthlyPurchase: number(flashPurchase[0]?.month),
        previousMonthPurchase: number(flashPurchase[0]?.previousMonth),
        todaySalesReturns: number(flashCredit[0]?.today), monthlySalesReturns: number(flashCredit[0]?.month),
        monthlyPurchaseReturns: number(flashDebit[0]?.month),
        currentStockValue: number(stockTotals.stockValue), damageStockValue: number(flashDamage[0]?.value),
        totalReceipts: number(receiptTotals[0]?.total), totalPayments: number(flashPayment[0]?.total),
        partyOutstanding: number(salesTotals.outstanding) + openingOutstandingAmount },
    } });
  });
  return router;
}
