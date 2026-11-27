import mongoose from "mongoose";
import { Journal } from "./accounting.js";
import { ChartAccount } from "./chartOfAccounts.js";

const text = (value) => String(value ?? "").trim();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const amount = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const sourceLabels = { SALES: "SAL", RECEIPT: "REC", PURCHASE: "PUR", PAYMENT: "PAY", CREDIT_NOTE: "CRN", DEBIT_NOTE: "DBN", JOURNAL_VOUCHER: "JV" };

export function buildAccountLedger(journals, { accountCode, fromDate, documents = new Map(), names = new Map() }) {
  const code = text(accountCode).toLowerCase();
  let balance = 0;
  const movements = [];
  for (const journal of journals) {
    const lines = journal.lines || [];
    const matching = lines.filter((line) => text(line.accountCode).toLowerCase() === code);
    for (const line of matching) {
      const debit = Math.round(amount(line.debit) * 100), credit = Math.round(amount(line.credit) * 100);
      const opening = journal.documentDate < fromDate || (journal.documentDate === fromDate && journal.sourceType === "OPENING_BALANCE");
      if (opening) { balance += debit - credit; continue; }
      const doc = documents.get(`${journal.sourceType}:${journal.sourceId}`) || {};
      const counterpart = [...new Set(lines.filter((other) => text(other.accountCode).toLowerCase() !== code && ((debit > 0 && amount(other.credit) > 0) || (credit > 0 && amount(other.debit) > 0))).map((other) => names.get(text(other.accountCode).toLowerCase()) || text(other.accountCode)))].join(", ");
      movements.push({ date: journal.documentDate || "", billType: sourceLabels[journal.sourceType] || journal.sourceType || "", billSeries: doc.series || "", billNo: doc.number || journal.documentNo || "", particular: counterpart, debit: debit / 100, credit: credit / 100, narration: line.narration || "", isReversal: Boolean(journal.reversalOf) });
    }
  }
  const openingBalance = balance;
  const rows = [{ srNo: 1, date: "", billType: "", billSeries: "", billNo: "", particular: "Opening Balance", debit: Math.max(balance, 0) / 100, credit: Math.max(-balance, 0) / 100, balance: balance / 100, narration: "" }];
  for (const row of movements) {
    balance += Math.round(row.debit * 100) - Math.round(row.credit * 100);
    rows.push({ srNo: rows.length + 1, ...row, balance: balance / 100 });
  }
  return { rows, summary: { opening: openingBalance / 100, debit: rows.reduce((sum, row) => sum + Math.round(row.debit * 100), 0) / 100, credit: rows.reduce((sum, row) => sum + Math.round(row.credit * 100), 0) / 100, closing: balance / 100 } };
}

export function registerAccountLedgerRoutes(router, securityRouter, reportDateRangeError) {
  const authorize = securityRouter.authorizeRequest("REPORTS", "FINANCIAL_REPORT", "view");
  const scope = (req) => ({ distributorId: req.auth.distributorId, firmId: req.auth.firmId });
  router.get("/reports/account-ledger/accounts", authorize, async (req, res) => {
    try {
      const query = text(req.query.q).slice(0, 100);
      if (!query) return res.json({ success: true, accounts: [] });
      const pattern = new RegExp(escapeRegex(query), "i");
      const models = [mongoose.models.Mas_Account, mongoose.models.Mas_OtherAccount, ChartAccount].filter(Boolean);
      const groups = await Promise.all(models.map((model) => model.find({ ...scope(req), $or: [{ accountCode: pattern }, { accountName: pattern }] }).select("accountCode accountName").sort({ accountName: 1 }).limit(30).lean()));
      const unique = new Map();
      for (const row of groups.flat()) if (row.accountCode && !unique.has(text(row.accountCode).toLowerCase())) unique.set(text(row.accountCode).toLowerCase(), { code: row.accountCode, name: row.accountName || row.accountCode });
      res.json({ success: true, accounts: [...unique.values()].slice(0, 40) });
    } catch { res.status(500).json({ success: false, message: "Could not search accounts." }); }
  });
  router.get("/reports/account-ledger", authorize, async (req, res) => {
    try {
      const accountCode = text(req.query.accountCode), fromDate = text(req.query.fromDate), toDate = text(req.query.toDate);
      if (!accountCode || accountCode.length > 100 || !fromDate || !toDate) return res.status(400).json({ success: false, message: "Select an account and date range." });
      const dateError = reportDateRangeError(fromDate, toDate);
      if (dateError) return res.status(400).json({ success: false, message: dateError });
      const accountPattern = new RegExp(`^${escapeRegex(accountCode)}$`, "i");
      const journals = await Journal.find({ ...scope(req), documentDate: { $lte: toDate }, "lines.accountCode": accountPattern, $or: [{ status: "POSTED" }, { status: "REVERSED", sourceType: { $ne: "OPENING_BALANCE" } }] }).sort({ documentDate: 1, createdAt: 1, _id: 1 }).lean();
      const refs = { SALES: "T_Sal_Header", PURCHASE: "T_Pur_Header", RECEIPT: "T_Receipt", PAYMENT: "T_Payment" };
      const documents = new Map();
      await Promise.all(Object.entries(refs).map(async ([type, modelName]) => {
        const model = mongoose.models[modelName];
        const ids = [...new Set(journals.filter((j) => j.sourceType === type && mongoose.isValidObjectId(j.sourceId)).map((j) => j.sourceId))];
        if (!model || !ids.length) return;
        const found = await model.find({ ...scope(req), _id: { $in: ids } }).lean();
        for (const doc of found) {
          const series = type === "SALES" ? doc.BillSeries : type === "PURCHASE" ? doc.vouSer : type === "RECEIPT" ? doc.receiptSeries : doc.vSeries;
          const number = type === "SALES" ? doc.BillNo : type === "PURCHASE" ? doc.vouNo : type === "RECEIPT" ? doc.rno : doc.vNo;
          documents.set(`${type}:${doc._id}`, { series: text(series), number: text(number) });
        }
      }));
      const codes = [...new Set(journals.flatMap((j) => (j.lines || []).map((line) => text(line.accountCode))).filter(Boolean))];
      const models = [mongoose.models.Mas_Account, mongoose.models.Mas_OtherAccount, ChartAccount].filter(Boolean);
      const groups = await Promise.all(models.map((model) => model.find({ ...scope(req), accountCode: { $in: codes } }).select("accountCode accountName").lean()));
      const names = new Map();
      for (const item of groups.flat()) if (item.accountCode && item.accountName && !names.has(text(item.accountCode).toLowerCase())) names.set(text(item.accountCode).toLowerCase(), item.accountName);
      res.json({ success: true, account: { code: accountCode, name: names.get(accountCode.toLowerCase()) || accountCode }, ...buildAccountLedger(journals, { accountCode, fromDate, documents, names }) });
    } catch { res.status(500).json({ success: false, message: "Could not generate the account ledger." }); }
  });
}
