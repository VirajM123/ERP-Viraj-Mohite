import express from 'express';
import mongoose from 'mongoose';
import { Journal, postBalancedJournal, reverseSourceJournal } from './accounting.js';
import { writeAuditEvent } from './audit.js';
import { businessDateIST } from './businessDate.js';
import { validateOpeningTransactions } from '../shared/openingTransactions.js';

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const text = value => String(value ?? '').trim();
const money = value => Math.round(Number(value || 0) * 100) / 100;
const rowFields = ['transactionType', 'transactionSeries', 'transactionNo', 'date', 'originalAmount', 'balanceAmount', 'balanceType', 'company', 'salesman', 'areaName', 'adjusted', 'appeared', 'mode'];
export const openingTenant = (req, extra = {}) => ({ ...extra, distributorId: req.auth.distributorId, firmId: req.auth.firmId });
export const openingKey = row => JSON.stringify([row.transactionType, text(row.transactionSeries).toUpperCase(), text(row.transactionNo).toUpperCase(), row.date]);

const schema = new mongoose.Schema({
  distributorId: { type: String, required: true }, firmId: { type: String, required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, required: true }, accountCode: { type: String, required: true }, accountName: String,
  referenceKey: { type: String, required: true }, transactionType: String, transactionSeries: String, transactionNo: String,
  date: String, postingDate: String, originalAmount: Number, balanceAmount: Number, balanceType: { type: String, enum: ['Dr', 'Cr'] },
  company: String, salesman: String, areaName: String, adjusted: String, appeared: String,
  mode: { type: String, enum: ['OPENING', 'EXISTING'], required: true }, sourceType: String, sourceId: String,
  allocatedAmount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['POSTED', 'REVERSED'], default: 'POSTED' }, createdBy: String,
}, { timestamps: true, collection: 'T_OpeningTransaction' });
schema.index({ distributorId: 1, firmId: 1, accountId: 1, referenceKey: 1 }, { unique: true });
schema.index({ distributorId: 1, firmId: 1, status: 1, mode: 1, accountCode: 1, postingDate: 1 });
export const OpeningTransaction = mongoose.models.T_OpeningTransaction || mongoose.model('T_OpeningTransaction', schema);

const sources = {
  SAL: { collection: 'T_Sal_Header', series: 'BillSeries', no: 'BillNo', date: 'BillDate', amount: 'NetAmount', allocated: 'receiptAllocated', party: 'PartyCode', sourceType: 'SALES', side: 'Dr' },
  PUR: { collection: 'T_Pur_Header', series: 'vouSer', no: 'vouNo', date: 'invoiceDate', amount: 'netAmt', allocated: 'paymentAllocated', party: 'supplierCode', sourceType: 'PURCHASE', side: 'Cr' },
  CRN: { collection: 'T_CreditNote_Header', series: 'CreditNoteSeries', no: 'CreditNoteNo', date: 'VDate', amount: 'NetAmount', party: 'PartyCode', sourceType: 'CREDIT_NOTE', side: 'Cr' },
  DRN: { collection: 'T_DebitNote_Header', series: 'DebitNoteSeries', no: 'DebitNoteNo', date: 'VDate', amount: 'NetAmount', party: 'SupplierCode', sourceType: 'DEBIT_NOTE', side: 'Dr' },
  REC: { collection: 'T_Receipt', series: 'billSeries', no: 'rno', date: 'receiptDate', amount: 'receiptAmount', party: 'partyId', sourceType: 'RECEIPT', side: 'Cr' },
  PAY: { collection: 'T_Payment', series: null, no: 'vNo', date: 'vDate', amount: 'amount', party: 'partyCode', sourceType: 'PAYMENT', side: 'Dr' },
  JOU: { collection: 'T_JournalVoucher', series: null, no: 'vNo', date: 'vDate', sourceType: 'JOURNAL_VOUCHER' },
};

export async function lookupOpeningSource(req, row, session) {
  const config = sources[row.transactionType];
  if (!config) {
    if (row.transactionType === 'OPB') return null;
    throw fail('Select a valid transaction type.');
  }
  const series = text(row.transactionSeries);
  if (!config.series && series) throw fail(`${row.transactionType} vouchers do not have a series. Leave Trn Series empty.`);
  const number = text(row.transactionNo);
  if (!number) throw fail('Enter a transaction number.');
  const filter = openingTenant(req, {
    [config.no]: { $in: [number, ...(Number.isFinite(Number(number)) ? [Number(number)] : [])] },
    ...(config.series ? { [config.series]: series || { $in: ['', null] } } : {}),
    isActive: { $ne: false }, IsBillCancelled: { $ne: true }, status: { $ne: 'REVERSED' },
  });
  const accountCode = text(row.accountCode || req.body?.accountCode || req.query?.accountCode);
  if (!accountCode) throw fail('Enter or select an account before loading a transaction.');
  const account = await mongoose.models.Mas_Account.findOne(openingTenant(req, { accountCode })).session(session || null).lean();
  if (config.party) filter[config.party] = { $in: [accountCode, ...(account ? [String(account._id)] : [])] };
  else filter['lines.accountCode'] = accountCode;
  const matches = await mongoose.connection.collection(config.collection).find(filter, { session }).limit(2).toArray();
  if (matches.length > 1) throw fail('Multiple transactions match this reference. Resolve the duplicate reference before using it.', 409);
  if (!matches.length) return null;
  const document = matches[0];
  const journal = await Journal.findOne(openingTenant(req, { sourceType: config.sourceType, sourceId: String(document._id), status: 'POSTED', reversalOf: null })).session(session || null).lean();
  let amount = Number(document[config.amount] || 0), side = config.side;
  if (row.transactionType === 'JOU') {
    const net = (document.lines || []).filter(line => text(line.accountCode) === accountCode).reduce((sum, line) => sum + Number(line.debit || 0) - Number(line.credit || 0), 0);
    amount = Math.abs(net); side = net < 0 ? 'Cr' : 'Dr';
  }
  let allocated = Number(document[config.allocated] || 0);
  if (row.transactionType === 'SAL') {
    const receiptTotals = await mongoose.connection.collection('T_Receipt').aggregate([
      { $match: openingTenant(req, { status: { $ne: 'REVERSED' } }) }, { $unwind: '$receiptBills' },
      { $match: { 'receiptBills.trnSeries': series, 'receiptBills.trnNo': number, 'receiptBills.openingTransactionId': { $in: [null, ''] } } },
      { $group: { _id: null, total: { $sum: { $add: [{ $ifNull: ['$receiptBills.nowAdjust', 0] }, { $ifNull: ['$receiptBills.discAmt', 0] }] } } } },
    ], { session }).toArray();
    allocated = Math.max(allocated, Number(receiptTotals[0]?.total || 0));
  }
  return {
    transactionType: row.transactionType, transactionSeries: series, transactionNo: number,
    date: text(document[config.date]).slice(0, 10), originalAmount: money(amount), balanceAmount: money(Math.max(0, amount - allocated)), balanceType: side,
    company: text(document.CompanyName || document.CompanyCode || document.company), salesman: text(document.SalesmanName || document.salesmanName),
    areaName: text(document.AreaName || document.areaName || account?.town), adjusted: allocated > 0 ? 'Y' : 'N', appeared: 'M',
    mode: 'EXISTING', sourceType: config.sourceType, sourceId: String(document._id), hasJournal: Boolean(journal),
  };
}

export function openingJournalLines(row, accountCode) {
  const amount = money(row.balanceAmount);
  const debit = row.balanceType === 'Dr' ? amount : 0, credit = row.balanceType === 'Cr' ? amount : 0;
  const narration = `Opening ${row.transactionType} ${row.transactionSeries || ''}/${row.transactionNo} dated ${row.date}`;
  return [{ accountCode, debit, credit, narration }, { accountCode: 'OPENING_BALANCE_EQUITY', debit: credit, credit: debit, narration }];
}

// The account, bill-wise opening records, journals and audit event commit together.
// Calls from old clients that do not supply openingTransactions keep the old path.
export async function saveAccountWithOpenings(req, save) {
  if (req.body.openingTransactions === undefined) return save(null);
  const message = validateOpeningTransactions(req.body.openingTransactions);
  if (message) throw fail(message);
  const session = await mongoose.startSession();
  let account;
  try {
    await session.withTransaction(async () => {
      account = await save(session);
      if (!account) throw fail('Account not found.', 404);
      if (account.distributorId !== req.auth.distributorId || account.firmId !== req.auth.firmId) throw fail('Account does not belong to this firm.', 403);
      const previous = await OpeningTransaction.find(openingTenant(req, { accountId: account._id })).session(session).lean();
      const byKey = new Map(previous.map(row => [row.referenceKey, row]));
      const seen = new Set(), normalized = [];
      for (const input of req.body.openingTransactions) {
        let row = { ...Object.fromEntries(rowFields.map(key => [key, input[key]])), transactionSeries: text(input.transactionSeries), transactionNo: text(input.transactionNo), originalAmount: money(input.originalAmount), balanceAmount: money(input.balanceAmount) };
        const source = await lookupOpeningSource(req, row, session);
        if (source) {
          if (!source.hasJournal) throw fail(`Transaction ${row.transactionSeries}/${row.transactionNo} exists but has no posted journal. Reconcile that document before using it as an opening reference.`, 409);
          row = { ...row, ...source };
        } else {
          if (input.mode === 'EXISTING') throw fail('A linked transaction is no longer available. Reload its details.', 409);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(account.openingDate || '') || !Number.isFinite(Date.parse(account.openingDate)) || new Date(account.openingDate).toISOString().slice(0, 10) !== account.openingDate) throw fail('Set a valid account Opening Date before posting brought-forward balances.');
          if (row.date > account.openingDate) throw fail('A brought-forward transaction cannot be dated after the account Opening Date.');
          row.mode = 'OPENING'; row.sourceId = ''; row.sourceType = '';
        }
        const key = openingKey(row);
        if (seen.has(key)) throw fail('The same opening transaction has been entered more than once.');
        seen.add(key);
        const old = byKey.get(key);
        if (old?.allocatedAmount > 0 && (old.balanceAmount !== row.balanceAmount || old.balanceType !== row.balanceType || old.postingDate !== account.openingDate || old.mode !== row.mode || old.accountCode !== account.accountCode)) {
          throw fail('An opening transaction has receipt/payment allocations. Reverse those allocations before changing its amount, side or posting date.', 409);
        }
        normalized.push({ ...row, ...openingTenant(req), accountId: account._id, accountCode: account.accountCode, accountName: account.accountName,
          referenceKey: key, postingDate: account.openingDate, allocatedAmount: old?.allocatedAmount || 0, status: 'POSTED', createdBy: req.auth.userId });
      }
      for (const old of previous.filter(row => row.status === 'POSTED' && !seen.has(row.referenceKey))) {
        if (old.allocatedAmount > 0) throw fail('An allocated opening transaction cannot be removed. Reverse its receipts/payments first.', 409);
        await OpeningTransaction.updateOne({ _id: old._id }, { $set: { status: 'REVERSED' } }, { session });
        await Journal.updateMany(openingTenant(req, { sourceType: 'OPENING_BALANCE', sourceId: String(old._id), status: 'POSTED' }), { $set: { status: 'REVERSED' } }, { session });
      }
      for (const row of normalized) {
        const old = byKey.get(row.referenceKey);
        const saved = await OpeningTransaction.findOneAndUpdate(openingTenant(req, { accountId: account._id, referenceKey: row.referenceKey }),
          { $set: row }, { upsert: true, new: true, runValidators: true, session });
        const unchanged = old?.status === 'POSTED' && old.balanceAmount === row.balanceAmount && old.balanceType === row.balanceType && old.postingDate === row.postingDate && old.accountCode === row.accountCode && old.mode === row.mode;
        if (!unchanged) {
          await Journal.updateMany(openingTenant(req, { sourceType: 'OPENING_BALANCE', sourceId: String(saved._id), status: 'POSTED' }), { $set: { status: 'REVERSED' } }, { session });
          if (row.mode === 'OPENING' && row.balanceAmount > 0) await postBalancedJournal({
            ...openingTenant(req), sourceType: 'OPENING_BALANCE', sourceId: String(saved._id), documentNo: `${row.transactionType} ${row.transactionSeries}/${row.transactionNo}`,
            documentDate: row.postingDate, createdBy: req.auth.userId, lines: openingJournalLines(row, account.accountCode),
          }, session);
        }
      }
      // This field is a summary of genuine openings, never an additional posting.
      const net = money(normalized.filter(row => row.mode === 'OPENING').reduce((sum, row) => sum + (row.balanceType === 'Cr' ? -row.balanceAmount : row.balanceAmount), 0));
      if (normalized.some(row => row.mode === 'OPENING') || previous.some(row => row.mode === 'OPENING')) {
        account.openingBal = Math.abs(net); account.openingBalType = net < 0 ? 'Cr' : 'Dr';
      }
      account.openingTransactions = normalized;
      await account.save({ session });
      await writeAuditEvent(req, { entityType: 'OPENING_BALANCE', entityId: String(account._id), action: 'SAVE', before: previous, after: normalized }, session);
    });
    return account;
  } finally { await session.endSession(); }
}

export async function openingOutstanding(req, side, session) {
  return OpeningTransaction.find(openingTenant(req, { status: 'POSTED', mode: 'OPENING', ...(side ? { balanceType: side } : {}),
    postingDate: { $lte: businessDateIST() },
    $expr: { $gt: ['$balanceAmount', '$allocatedAmount'] } })).session(session || null).lean();
}

export const openingBillRows = rows => rows.map(row => ({
  id: String(row._id), openingTransactionId: String(row._id), party: row.accountName, partyCode: row.accountCode,
  billSeries: row.transactionSeries, billNo: row.transactionNo, trnDate: row.date, transactionType: row.transactionType,
  amount: row.balanceAmount, adjusted: row.allocatedAmount, balance: money(row.balanceAmount - row.allocatedAmount), salesman: row.salesman,
}));

export async function allocateOpening(req, id, amount, side, party, session, documentDate) {
  if (!mongoose.isValidObjectId(id) || !Number.isFinite(amount) || amount <= 0) throw fail('Invalid opening transaction allocation.');
  const row = await OpeningTransaction.findOne(openingTenant(req, { _id: id, status: 'POSTED', mode: 'OPENING', balanceType: side })).session(session);
  if (!row || ![row.accountCode, String(row.accountId), row.accountName].some(value => text(value).toLowerCase() === text(party).toLowerCase())) throw fail('Opening transaction does not belong to the selected party.', 409);
  if (!documentDate || documentDate < row.postingDate) throw fail('Receipt/payment date cannot precede the opening posting date.');
  const result = await OpeningTransaction.updateOne({ _id: row._id, $expr: { $gte: [{ $subtract: ['$balanceAmount', '$allocatedAmount'] }, money(amount)] } }, { $inc: { allocatedAmount: money(amount) } }, { session });
  if (result.modifiedCount !== 1) throw fail('Allocation exceeds the remaining opening balance. Reload and retry.', 409);
  return row;
}

export async function releaseOpening(id, amount, session) {
  const result = await OpeningTransaction.updateOne({ _id: id, allocatedAmount: { $gte: money(amount) } }, { $inc: { allocatedAmount: -money(amount) } }, { session });
  if (result.modifiedCount !== 1) throw fail('Opening allocation could not be reversed.', 409);
}

// Financial reports select POSTED journals. For opening allocations a cancelled
// voucher must leave no live journal (retain both versions for the audit trail).
export async function reverseOpeningAwareJournal(entry, allocations, session) {
  const reversal = await reverseSourceJournal(entry, session);
  if (reversal && allocations?.some(row => row.openingTransactionId)) {
    reversal.status = 'REVERSED';
    await reversal.save({ session });
  }
  return reversal;
}

export default function createOpeningBalancesRouter(securityRouter) {
  const router = express.Router();
  router.get('/lookup', securityRouter.authorizeRequest('MASTER', 'ACCOUNT', 'view'), async (req, res) => {
    try {
      const data = await lookupOpeningSource(req, req.query);
      res.json({ success: true, found: Boolean(data), data, message: data ? 'Existing transaction loaded. It will not be posted twice.' : 'No matching transaction for this account. Enter the brought-forward details manually.' });
    } catch (error) { res.status(error.statusCode || 500).json({ success: false, message: error.message }); }
  });
  router.get('/account/:id', securityRouter.authorizeRequest('MASTER', 'ACCOUNT', 'view'), async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid account.' });
    const data = await OpeningTransaction.find(openingTenant(req, { accountId: req.params.id, status: 'POSTED' })).sort({ date: 1, transactionNo: 1 }).lean();
    const managed = data.length > 0 || Boolean(await OpeningTransaction.exists(openingTenant(req, { accountId: req.params.id })));
    res.json({ success: true, data, managed });
  });
  return router;
}
