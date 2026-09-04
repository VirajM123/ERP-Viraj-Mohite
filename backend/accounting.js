import mongoose from "mongoose";

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
export const Journal = mongoose.models.Acc_Journal || mongoose.model("Acc_Journal", journalSchema);

export const postBalancedJournal = async (entry, session) => {
  const debit = entry.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const credit = entry.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  if (!Number.isFinite(debit) || !Number.isFinite(credit) || Math.abs(debit - credit) > 0.01 || debit <= 0) {
    throw new Error("Journal debit and credit totals must be equal and positive");
  }
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
  const original = await Journal.findOne({ distributorId, firmId, sourceType, sourceId, status: "POSTED" }).sort({ postingVersion: -1 }).session(session);
  if (!original) return null;
  const reversal = await postBalancedJournal({
    distributorId, firmId, sourceType, sourceId, documentNo: original.documentNo,
    documentDate: documentDate || original.documentDate, createdBy, reversalOf: original._id,
    lines: original.lines.map((line) => ({ accountCode: line.accountCode, debit: Number(line.credit || 0), credit: Number(line.debit || 0), narration: reason })),
  }, session);
  original.status = "REVERSED";
  await original.save({ session });
  return reversal;
};
