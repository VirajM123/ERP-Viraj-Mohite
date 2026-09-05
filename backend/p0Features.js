import express from "express";
import mongoose from "mongoose";
import { Journal, postBalancedJournal, reverseSourceJournal } from "./accounting.js";
import { AuditEvent, writeAuditEvent } from "./audit.js";
import { nextDocumentNumber } from "./counters.js";

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
const JournalVoucher = mongoose.models.T_JournalVoucher || mongoose.model("T_JournalVoucher", journalVoucherSchema);

const tenant = (req, extra = {}) => ({ ...extra, distributorId: req.auth.distributorId, firmId: req.auth.firmId });
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
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
  if (!Account || !Sales) return null;
  const partyCode = String(body.PartyCode || "").trim();
  const partyName = String(body.PartyName || "").trim();
  const account = await Account.findOne(tenant(req, partyCode ? { accountCode: partyCode } : { accountName: partyName })).session(session).lean();
  if (!account) return null;
  const bills = await Sales.find(tenant(req, { PartyCode: account.accountCode, isActive: { $ne: false }, IsBillCancelled: { $ne: true } }))
    .select({ NetAmount: 1, receiptAllocated: 1, DueDate: 1, BillDate: 1 }).session(session).lean();
  const outstanding = bills.reduce((sum, bill) => sum + Math.max(0, number(bill.NetAmount) - number(bill.receiptAllocated)), 0);
  const exposure = outstanding + number(body.NetAmount);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = bills.some((bill) => Math.max(0, number(bill.NetAmount) - number(bill.receiptAllocated)) > 0 && String(bill.DueDate || "") < today);
  const violations = [];
  if (String(account.blackListed || "NO").toUpperCase() === "YES") violations.push("Customer is blacklisted");
  if (number(account.creditAmt) > 0 && exposure > number(account.creditAmt) + 0.01) violations.push(`Credit limit exceeded (${exposure.toFixed(2)} > ${number(account.creditAmt).toFixed(2)})`);
  if (number(account.creditBills) > 0 && bills.filter((bill) => number(bill.NetAmount) - number(bill.receiptAllocated) > 0).length >= number(account.creditBills)) violations.push("Maximum pending bills limit reached");
  if (overdue) violations.push("Customer has overdue bills");
  if (!violations.length) return { outstanding, exposure, violations: [] };
  const override = body.creditOverride || {};
  const role = String(req.auth.role || "").toUpperCase();
  if (override.approved === true && String(override.reason || "").trim() && ["ADMIN", "DISTRIBUTOR_ADMIN"].includes(role)) {
    return { outstanding, exposure, violations, overridden: true, reason: String(override.reason), userId: req.auth.userId, timestamp: new Date() };
  }
  throw Object.assign(new Error(`Credit control blocked sale: ${violations.join("; ")}`), { statusCode: 409, code: "CREDIT_CONTROL_BLOCK" });
};

export const normalizeJournalLines = (body) => (body.lines || body.items || []).map((line) => ({
  accountCode: String(line.accountCode || line.code || line.accountName || "").trim(),
  accountName: String(line.accountName || "").trim(), debit: number(line.debit ?? line.drAmount), credit: number(line.credit ?? line.crAmount),
  narration: String(line.narration || body.narration || body.narr || ""),
})).filter((line) => line.accountCode && (line.debit > 0 || line.credit > 0));

export const validateJournalLines = (lines) => {
  if (lines.length < 2) throw Object.assign(new Error("Journal Voucher requires at least two lines."), { statusCode: 400 });
  const debit = lines.reduce((sum, line) => sum + line.debit, 0), credit = lines.reduce((sum, line) => sum + line.credit, 0);
  if (debit <= 0 || Math.abs(debit - credit) > 0.01) throw Object.assign(new Error("Journal Voucher debit and credit totals must be equal."), { statusCode: 400 });
};

const dateMatch = (req, field = "documentDate") => {
  const condition = {};
  if (req.query.fromDate) condition.$gte = String(req.query.fromDate);
  if (req.query.toDate) condition.$lte = String(req.query.toDate);
  return Object.keys(condition).length ? { [field]: condition } : {};
};

const financialRows = async (req) => {
  const journals = await Journal.find(tenant(req, { status: "POSTED", ...dateMatch(req) })).sort({ documentDate: 1, createdAt: 1 }).lean();
  return journals.flatMap((entry) => entry.lines.map((line) => ({
    date: entry.documentDate, documentNo: entry.documentNo || "", source: entry.sourceType,
    accountCode: line.accountCode, narration: line.narration || "", debit: number(line.debit), credit: number(line.credit),
  })));
};

export default function createP0FeaturesRouter(securityRouter) {
  const router = express.Router();

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
        const vNo = await nextDocumentNumber({ distributorId: req.auth.distributorId, firmId: req.auth.firmId, documentType: "JOURNAL_VOUCHER", documentDate: req.body.vDate, session, minimumValue: number(last?.vNo) });
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

  router.get("/reports/financial/:report", securityRouter.authorizeRequest("REPORTS", "FINANCIAL_REPORT", "view"), async (req, res) => {
    let rows = await financialRows(req); const report = String(req.params.report || "general-ledger");
    const account = String(req.query.account || "").trim().toLowerCase();
    if (account) rows = rows.filter((row) => row.accountCode.toLowerCase().includes(account));
    if (report === "cash-book") rows = rows.filter((row) => /cash/i.test(row.accountCode));
    if (report === "bank-book") rows = rows.filter((row) => /bank/i.test(row.accountCode));
    if (["trial-balance", "profit-loss", "balance-sheet"].includes(report)) {
      const grouped = new Map();
      for (const row of rows) { const value = grouped.get(row.accountCode) || { accountCode: row.accountCode, debit: 0, credit: 0 }; value.debit += row.debit; value.credit += row.credit; grouped.set(row.accountCode, value); }
      rows = [...grouped.values()].map((row) => ({ ...row, closing: row.debit - row.credit }));
      if (report === "profit-loss") rows = rows.filter((row) => /sales|purchase|income|expense|discount|profit|loss|gst/i.test(row.accountCode));
      if (report === "balance-sheet") rows = rows.filter((row) => !/sales|purchase|income|expense|discount/i.test(row.accountCode));
    }
    res.json({ success: true, report, rows, summary: { debit: rows.reduce((s, r) => s + number(r.debit), 0), credit: rows.reduce((s, r) => s + number(r.credit), 0) } });
  });
  router.get("/reports/stock-movement", securityRouter.authorizeRequest("REPORTS", "STOCK_REPORT", "view"), async (req, res) => {
    const StockAdjustment = mongoose.models.T_Stock_Adjustment;
    if (!StockAdjustment) return res.json({ success: true, rows: [] });
    const entryType = String(req.query.entryType || "").trim().toUpperCase();
    const filter = tenant(req, {
      Status: "COMPLETED",
      AdjustmentType: entryType === "IN" || entryType === "OUT" ? entryType : { $in: ["IN", "OUT"] },
      ...dateMatch(req, "VoucherDate"),
    });
    if (req.query.godownCode) filter.GDCode = String(req.query.godownCode);
    const companyCode = String(req.query.companyCode || "").trim();
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
      filter.$and = [{ $or: [{ CompanyCode: companyCode }, { ProdCode: { $in: productCodes } }] }];
    }
    if (req.query.product) {
      const escaped = String(req.query.product).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const search = new RegExp(escaped, "i");
      filter.$or = [{ ProdCode: search }, { ProductName: search }];
    }
    const adjustments = await StockAdjustment.find(filter).sort({ VoucherDate: 1, createdAt: 1 }).lean();
    const rows = adjustments.map((row, index) => {
      const quantity = number(row.TotalQty || row.Qty);
      const stockIn = row.AdjustmentType === "IN" ? quantity : 0;
      const stockOut = row.AdjustmentType === "OUT" ? quantity : 0;
      const voucherParts = String(row.VoucherNo || "").split("-");
      return {
        SrNo: index + 1,
        Date: row.VoucherDate || "",
        TrnSeries: voucherParts[0] || "",
        TrnNo: voucherParts.slice(1).join("-") || row.VoucherNo || "",
        Movement: row.AdjustmentType === "IN" ? "Stock In" : "Stock Out",
        Godown: row.GodownName || row.GDCode || "",
        ProductCode: row.ProdCode || "",
        ProductName: row.ProductName || "",
        Batch: row.Batch || ".",
        MRP: number(row.MRP),
        StockIn: stockIn,
        StockOut: stockOut,
        BalanceQty: number(row.BalanceAfter),
        Qty: number(row.Qty),
        FreeQty: number(row.FreeQty),
        Narration: row.Narration || "",
      };
    });
    res.json({ success: true, rows });
  });
  router.get("/reports/audit-trail", securityRouter.authorizeRequest("REPORTS", "AUDIT_TRAIL", "view"), async (req, res) => {
    const filter = tenant(req); if (req.query.fromDate || req.query.toDate) { filter.createdAt = {}; if (req.query.fromDate) filter.createdAt.$gte = new Date(`${req.query.fromDate}T00:00:00.000Z`); if (req.query.toDate) filter.createdAt.$lte = new Date(`${req.query.toDate}T23:59:59.999Z`); }
    res.json({ success: true, rows: await AuditEvent.find(filter).sort({ createdAt: -1 }).limit(1000).lean() });
  });
  router.get("/reports/permission-audit", securityRouter.authorizeRequest("REPORTS", "PERMISSION_AUDIT", "view"), async (req, res) => {
    const Security = mongoose.models.Mas_SecuritySetup;
    const docs = Security ? await Security.find(tenant(req)).lean() : [];
    const rows = docs.flatMap((doc) => Object.entries(doc.permissions || {}).flatMap(([module, operations]) => Object.entries(operations || {}).map(([operation, permission]) => ({ userId: doc.userId || doc.userName || "", userName: doc.userName || "", module: module.toUpperCase(), operation, view: !!permission.view, add: !!permission.add, edit: !!permission.edit, delete: !!permission.delete, print: !!permission.print, export: !!permission.export }))));
    res.json({ success: true, rows });
  });
  router.get("/reports/credit-control", securityRouter.authorizeRequest("REPORTS", "CREDIT_CONTROL", "view"), async (req, res) => {
    const Account = mongoose.models.Mas_Account, Sales = mongoose.models.T_Sal_Header;
    const accounts = Account ? await Account.find(tenant(req, { isActive: { $ne: false } })).lean() : [];
    const sales = Sales ? await Sales.find(tenant(req, { isActive: { $ne: false }, IsBillCancelled: { $ne: true } })).select({ PartyCode: 1, NetAmount: 1, receiptAllocated: 1, DueDate: 1 }).lean() : [];
    const today = new Date().toISOString().slice(0, 10);
    const rows = accounts.map((account) => { const bills = sales.filter((bill) => bill.PartyCode === account.accountCode); const outstanding = bills.reduce((sum, bill) => sum + Math.max(0, number(bill.NetAmount) - number(bill.receiptAllocated)), 0); return { accountCode: account.accountCode, accountName: account.accountName, blackListed: account.blackListed, creditLimit: number(account.creditAmt), creditDays: number(account.creditDays), maximumBills: number(account.creditBills), pendingBills: bills.filter((bill) => number(bill.NetAmount) - number(bill.receiptAllocated) > 0).length, outstanding, overdue: bills.some((bill) => number(bill.NetAmount) - number(bill.receiptAllocated) > 0 && String(bill.DueDate || "") < today) ? "YES" : "NO" }; });
    res.json({ success: true, rows });
  });
  router.get("/dashboard/summary", async (req, res) => {
    const Sales = mongoose.models.T_Sal_Header, Purchase = mongoose.models.T_Pur_Header, Receipt = mongoose.models.T_Receipt, Stock = mongoose.models.Mas_Stock;
    const [sales, purchases, receipts, stock] = await Promise.all([
      Sales ? Sales.find(tenant(req, { isActive: { $ne: false }, IsBillCancelled: { $ne: true } })).lean() : [],
      Purchase ? Purchase.find(tenant(req, { isActive: { $ne: false } })).lean() : [],
      Receipt ? Receipt.find(tenant(req, { status: { $ne: "REVERSED" } })).lean() : [],
      Stock ? Stock.find(tenant(req)).lean() : [],
    ]);
    const totalSales = sales.reduce((s, row) => s + number(row.NetAmount), 0), totalPurchase = purchases.reduce((s, row) => s + number(row.netAmt), 0), collection = receipts.reduce((s, row) => s + number(row.receiptAmount), 0);
    const outstanding = sales.reduce((s, row) => s + Math.max(0, number(row.NetAmount) - number(row.receiptAllocated)), 0), today = new Date().toISOString().slice(0, 10);
    const overdue = sales.filter((row) => String(row.DueDate || "") < today).reduce((s, row) => s + Math.max(0, number(row.NetAmount) - number(row.receiptAllocated)), 0);
    const stockValue = stock.reduce((s, row) => s + number(row.Qty) * number(row.PRate), 0), lowStock = stock.filter((row) => number(row.Qty) > 0 && number(row.Qty) <= 10).length;
    const topProducts = Object.values(sales.flatMap((row) => row.items || []).reduce((map, item) => { const key = itemCode(item) || itemName(item) || "Unknown"; map[key] ||= { code: key, name: itemName(item) || key, quantity: 0, amount: 0 }; map[key].quantity += itemQty(item); map[key].amount += number(item.netAmount ?? item.NetAmount ?? item.amount ?? item.grossAmount); return map; }, {})).sort((a, b) => b.amount - a.amount).slice(0, 5);
    const salesTrend = Object.values(sales.reduce((map, row) => { const key = String(row.BillDate || "No date"); map[key] ||= { label: key, sales: 0, collections: 0 }; map[key].sales += number(row.NetAmount); return map; }, {})).sort((a, b) => a.label.localeCompare(b.label)).slice(-30);
    const recentInvoices = sales.slice().sort((a, b) => String(b.BillDate).localeCompare(String(a.BillDate))).slice(0, 10).map((row) => ({ billNo: `${row.BillSeries || ""}${row.BillNo}`, date: row.BillDate, party: row.PartyName, amount: row.NetAmount, status: Math.max(0, number(row.NetAmount) - number(row.receiptAllocated)) > 0 ? "Pending" : "Paid" }));
    const topCustomers = Object.values(sales.reduce((map, row) => { const key = row.PartyName || row.PartyCode || "Unknown"; map[key] ||= { name: key, amount: 0 }; map[key].amount += number(row.NetAmount); return map; }, {})).sort((a, b) => b.amount - a.amount).slice(0, 5);
    const lowStockItems = stock.filter((row) => number(row.Qty) > 0 && number(row.Qty) <= 10).slice(0, 10).map((row) => ({ product: row.ProdCode, stock: row.Qty, unit: "Units" }));
    res.json({ success: true, data: { totalSales, totalPurchase, collection, outstanding, overdue, stockValue, lowStock, lowStockItems, expiry: stock.filter((row) => row.ExpDt && row.ExpDt <= today && number(row.Qty) > 0).length, totalInvoices: sales.length, recentInvoices, topCustomers, topProducts, salesTrend } });
  });
  return router;
}
