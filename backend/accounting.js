import mongoose from "mongoose";
import { businessDateIST, validateBusinessDate } from "./businessDate.js";

const journalLineSchema = new mongoose.Schema({
  accountCode: { type: String, required: true }, debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 }, narration: { type: String, default: "" },
}, { _id: false });
const journalSchema = new mongoose.Schema({
  distributorId: { type: String, required: true }, firmId: { type: String, required: true },
  sourceType: { type: String, required: true }, sourceId: { type: String, required: true },
  postingVersion: { type: Number, default: 1 }, documentNo: String, documentDate: String,
  status: { type: String, enum: ["POSTED", "REVERSED"], default: "POSTED" },
  reversalOf: { type: mongoose.Schema.Types.ObjectId, default: null }, createdBy: { type: String, required: true },
  lines: { type: [journalLineSchema], validate: [(value) => value.length >= 2, "Journal requires at least two lines"] },
}, { timestamps: true, collection: "Acc_Journal" });
journalSchema.index({ distributorId: 1, firmId: 1, sourceType: 1, sourceId: 1, postingVersion: 1 }, { unique: true });
journalSchema.index({ distributorId: 1, firmId: 1, status: 1, documentDate: 1, createdAt: 1 });
journalSchema.index({ distributorId: 1, firmId: 1, "lines.accountCode": 1, documentDate: 1 });
export const Journal = mongoose.models.Acc_Journal || mongoose.model("Acc_Journal", journalSchema);

export const validateJournalEntryLines = (lines) => {
  const invalid = (message) => {
    throw Object.assign(new Error(message), { statusCode: 400 });
  };
  if (!Array.isArray(lines) || lines.length < 2) {
    invalid("Journal requires at least two lines.");
  }

  let debitCents = 0;
  let creditCents = 0;
  for (const line of lines) {
    const debit = Number(line.debit ?? 0);
    const credit = Number(line.credit ?? 0);
    if (!String(line.accountCode || "").trim() || !Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0) {
      invalid("Each journal line requires an account and nonnegative debit or credit amounts.");
    }

    const debitMinor = Math.round(debit * 100);
    const creditMinor = Math.round(credit * 100);
    if (!Number.isSafeInteger(debitMinor) || !Number.isSafeInteger(creditMinor)
      || Math.abs(debit * 100 - debitMinor) > 1e-7 || Math.abs(credit * 100 - creditMinor) > 1e-7) {
      invalid("Journal line amounts must use two decimal places.");
    }
    if ((debitMinor > 0) === (creditMinor > 0)) {
      invalid("Each journal line must contain either a debit or a credit amount, but not both.");
    }

    debitCents += debitMinor;
    creditCents += creditMinor;
    if (!Number.isSafeInteger(debitCents) || !Number.isSafeInteger(creditCents)) {
      invalid("Journal totals exceed the supported amount.");
    }
  }
  if (debitCents <= 0 || debitCents !== creditCents) {
    invalid("Journal debit and credit totals must be equal and positive.");
  }
};

export const postBalancedJournal = async (entry, session) => {
  validateJournalEntryLines(entry.lines);
  let postingVersion = entry.postingVersion;
  if (!postingVersion) {
    const latest = await Journal.findOne({ distributorId: entry.distributorId, firmId: entry.firmId, sourceType: entry.sourceType, sourceId: entry.sourceId })
      .sort({ postingVersion: -1 }).session(session).lean();
    postingVersion = Number(latest?.postingVersion || 0) + 1;
  }
  const [journal] = await Journal.create([{ ...entry, postingVersion }], { session });
  return journal;
};

export const reverseSourceJournal = async ({ distributorId, firmId, sourceType, sourceId, createdBy, documentDate, reason = "Reversal" }, session) => {
  // The latest event is either the current posting or its reversal. Never
  // reverse a reversal (including retries after a successful cancellation).
  const original = await Journal.findOne({ distributorId, firmId, sourceType, sourceId }).sort({ postingVersion: -1 }).session(session);
  if (!original || original.reversalOf || original.status !== "POSTED") return null;
  const effectiveDate = validateBusinessDate(documentDate || businessDateIST());
  if (original.documentDate && effectiveDate < original.documentDate) {
    throw Object.assign(new Error("Reversal date cannot precede the posting being reversed."), { statusCode: 400 });
  }
  const reversal = await postBalancedJournal({
    distributorId, firmId, sourceType, sourceId, documentNo: original.documentNo,
    documentDate: effectiveDate, createdBy, reversalOf: original._id,
    lines: original.lines.map((line) => ({ accountCode: line.accountCode, debit: Number(line.credit || 0), credit: Number(line.debit || 0), narration: reason })),
  }, session);
  original.status = "REVERSED";
  await original.save({ session });
  return reversal;
};
