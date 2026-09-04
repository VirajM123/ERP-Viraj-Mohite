import mongoose from "mongoose";
import { financialYearFor } from "./businessDate.js";

const counterSchema = new mongoose.Schema({
  distributorId: { type: String, required: true }, firmId: { type: String, required: true },
  financialYear: { type: String, required: true }, documentType: { type: String, required: true },
  series: { type: String, default: "" }, value: { type: Number, default: 0 },
}, { timestamps: true, collection: "Sys_DocumentCounter" });
counterSchema.index({ distributorId: 1, firmId: 1, financialYear: 1, documentType: 1, series: 1 }, { unique: true });
const DocumentCounter = mongoose.models.Sys_DocumentCounter || mongoose.model("Sys_DocumentCounter", counterSchema);

export const nextDocumentNumber = async ({ distributorId, firmId, documentType, series = "", documentDate, session, minimumValue = 0 }) => {
  const financialYear = financialYearFor(documentDate);
  const counterFilter = { distributorId, firmId, financialYear, documentType, series };

  // Keep an existing counter at least level with the latest saved document.
  // This is a normal update document (not an aggregation update pipeline).
  await DocumentCounter.updateOne(
    counterFilter,
    {
      $max: { value: Number(minimumValue || 0) },
      $setOnInsert: counterFilter,
    },
    { upsert: true, session }
  );

  const counter = await DocumentCounter.findOneAndUpdate(
    counterFilter,
    { $inc: { value: 1 } },
    { new: true, session, runValidators: true }
  );
  return counter.value;
};
