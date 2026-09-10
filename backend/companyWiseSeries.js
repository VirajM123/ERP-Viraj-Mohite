import express from "express";
import mongoose from "mongoose";

const router = express.Router();

export const COMPANY_SERIES_FIELDS = [
  "sales",
  "purchase",
  "creditNote",
  "debitNote",
  "stockIn",
  "stockOut",
  "materialTransfer",
  "selfDamage",
  "godownTransfer",
  "manufacturing",
  "discountJv",
  "salesService",
  "purchaseService",
];

const seriesFields = Object.fromEntries(
  COMPANY_SERIES_FIELDS.map((field) => [
    field,
    { type: String, default: "", trim: true, maxlength: 20 },
  ])
);

const companyWiseSeriesSchema = new mongoose.Schema(
  {
    distributorId: { type: String, required: true, trim: true },
    firmId: { type: String, required: true, trim: true },
    companyCode: { type: String, required: true, trim: true, uppercase: true },
    companyName: { type: String, default: "", trim: true },
    ...seriesFields,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "Mas_CompanyWiseSeries" }
);

companyWiseSeriesSchema.index(
  { distributorId: 1, firmId: 1, companyCode: 1 },
  { unique: true }
);

const CompanyWiseSeries =
  mongoose.models.Mas_CompanyWiseSeries ||
  mongoose.model("Mas_CompanyWiseSeries", companyWiseSeriesSchema);

const cleanText = (value) => String(value ?? "").trim();
const cleanSeries = (value) => cleanText(value).toUpperCase().slice(0, 20);

const readScope = (req, source) => {
  const distributorId = cleanText(source.distributorId);
  const firmId = cleanText(source.firmId);
  const authorizedDistributorId = cleanText(
    req.security?.distributorId || req.auth?.distributorId
  );
  const authorizedFirmId = cleanText(
    req.security?.firmId || req.auth?.firmId
  );

  if (
    (authorizedDistributorId && authorizedDistributorId !== distributorId) ||
    (authorizedFirmId && authorizedFirmId !== firmId)
  ) {
    return null;
  }

  return distributorId && firmId ? { distributorId, firmId } : null;
};

router.get("/", async (req, res) => {
  try {
    const scope = readScope(req, req.query);
    if (!scope) {
      return res.status(400).json({
        success: false,
        message: "A valid distributorId and firmId are required.",
      });
    }

    const rows = await CompanyWiseSeries.find({
      ...scope,
      isActive: true,
    })
      .sort({ companyCode: 1 })
      .lean();

    return res.json({ success: true, rows });
  } catch (error) {
    console.error("Company-wise series load error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load Company Wise Series Setup.",
    });
  }
});

router.put("/", async (req, res) => {
  try {
    const scope = readScope(req, req.body);
    if (!scope) {
      return res.status(400).json({
        success: false,
        message: "A valid distributorId and firmId are required.",
      });
    }

    if (!Array.isArray(req.body.rows)) {
      return res.status(400).json({
        success: false,
        message: "Series rows are required.",
      });
    }

    const uniqueRows = new Map();
    for (const sourceRow of req.body.rows) {
      const companyCode = cleanText(sourceRow?.companyCode).toUpperCase();
      if (!companyCode) continue;

      const row = {
        companyCode,
        companyName: cleanText(sourceRow.companyName),
        isActive: true,
      };
      for (const field of COMPANY_SERIES_FIELDS) {
        row[field] = cleanSeries(sourceRow[field]);
      }
      uniqueRows.set(companyCode, row);
    }

    if (uniqueRows.size === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one company row is required.",
      });
    }

    await CompanyWiseSeries.bulkWrite(
      [...uniqueRows.values()].map((row) => ({
        updateOne: {
          filter: { ...scope, companyCode: row.companyCode },
          update: { $set: row, $setOnInsert: scope },
          upsert: true,
        },
      }))
    );

    const rows = await CompanyWiseSeries.find({
      ...scope,
      isActive: true,
    })
      .sort({ companyCode: 1 })
      .lean();

    return res.json({
      success: true,
      message: "Company Wise Series Setup saved successfully.",
      rows,
    });
  } catch (error) {
    console.error("Company-wise series save error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save Company Wise Series Setup.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const scope = readScope(req, req.query);
    if (!scope || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "A valid setup row is required." });
    }

    const deleted = await CompanyWiseSeries.findOneAndDelete({
      ...scope,
      _id: req.params.id,
    }).lean();

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Series setup row was not found." });
    }

    return res.json({ success: true, message: "Series setup row deleted successfully." });
  } catch (error) {
    console.error("Company-wise series delete error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete series setup row." });
  }
});

export default router;
