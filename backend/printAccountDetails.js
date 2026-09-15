import express from "express";
import mongoose from "mongoose";

const router = express.Router();
const DEFAULT_INVOICE_TERMS = "1. Goods once sold will not be taken back or exchanged.\n2. Interest will be charged on overdue payments.\n3. Subject to local jurisdiction only.";

const printAccountDetailsSchema = new mongoose.Schema(
  {
    distributorId: { type: String, required: true, trim: true },
    firmId: { type: String, required: true, trim: true },
    firmName: { type: String, default: "", trim: true },
    bankName: { type: String, default: "", trim: true, maxlength: 120 },
    accountName: { type: String, default: "", trim: true, maxlength: 120 },
    accountNumber: { type: String, default: "", trim: true, maxlength: 50 },
    ifscCode: { type: String, default: "", trim: true, uppercase: true, maxlength: 20 },
    termsAndConditions: { type: String, default: DEFAULT_INVOICE_TERMS, trim: true, maxlength: 2000 },
    qrCode: {
      fileName: { type: String, default: "", trim: true, maxlength: 180 },
      mimeType: { type: String, default: "", trim: true, maxlength: 40 },
      dataUrl: { type: String, default: "" },
    },
    printContent: {
      goodsReturn: { type: Boolean, default: true },
      damageReturn: { type: Boolean, default: true },
      showScheme: { type: Boolean, default: true },
      showTaxSummary: { type: Boolean, default: true },
    },
    outputSettings: {
      reportNumber: { type: String, default: "1", enum: ["1", "2"] },
      paperSize: { type: String, default: "A4", enum: ["A4", "A5"] },
      orientation: { type: String, default: "portrait", enum: ["portrait", "landscape"] },
      fontSizePercent: { type: Number, default: 150, min: 80, max: 150 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "PrintAccountDetails" }
);

printAccountDetailsSchema.index({ distributorId: 1, firmId: 1 }, { unique: true });

const PrintAccountDetails =
  mongoose.models.PrintAccountDetails ||
  mongoose.model("PrintAccountDetails", printAccountDetailsSchema);

const clean = (value) => String(value ?? "").trim();
const bool = (value, fallback) =>
  typeof value === "boolean" ? value : fallback;

const tenant = (req) => ({
  distributorId: clean(req.auth?.distributorId),
  firmId: clean(req.auth?.firmId),
});

router.get("/", async (req, res) => {
  try {
    const scope = tenant(req);
    const details = await PrintAccountDetails.findOne({
      ...scope,
      isActive: true,
    }).lean();

    return res.json({ success: true, details: details || null });
  } catch (error) {
    console.error("Print account details load error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load print account details.",
    });
  }
});

router.put("/", async (req, res) => {
  try {
    const scope = tenant(req);
    const current = await PrintAccountDetails.findOne(scope).lean();
    const incomingQr = req.body.qrCode;
    const qrCode = incomingQr === undefined
      ? current?.qrCode || { fileName: "", mimeType: "", dataUrl: "" }
      : {
          fileName: clean(incomingQr?.fileName),
          mimeType: clean(incomingQr?.mimeType).toLowerCase(),
          dataUrl: clean(incomingQr?.dataUrl),
        };

    if (qrCode.dataUrl) {
      if (!/^data:image\/(png|jpeg);base64,[a-z0-9+/=\s]+$/i.test(qrCode.dataUrl)) {
        return res.status(400).json({ success: false, message: "QR code must be a PNG or JPEG image." });
      }
      if (Buffer.byteLength(qrCode.dataUrl, "utf8") > 1_500_000) {
        return res.status(400).json({ success: false, message: "QR code image must be smaller than 1 MB." });
      }
    }

    const printContent = req.body.printContent || {};
    const outputSettings = req.body.outputSettings || {};
    const paperSize = ["A4", "A5"].includes(outputSettings.paperSize)
      ? outputSettings.paperSize
      : current?.outputSettings?.paperSize || "A4";
    const reportNumber = ["1", "2"].includes(String(outputSettings.reportNumber))
      ? String(outputSettings.reportNumber)
      : current?.outputSettings?.reportNumber || "1";
    const requestedFontSize = Number(outputSettings.fontSizePercent);
    const fontSizePercent = Number.isFinite(requestedFontSize)
      ? Math.min(150, Math.max(80, Math.round(requestedFontSize)))
      : current?.outputSettings?.fontSizePercent || 150;

    const update = {
      ...scope,
      firmName: clean(req.auth?.firmName),
      bankName: clean(req.body.bankName ?? current?.bankName),
      accountName: clean(req.body.accountName ?? current?.accountName),
      accountNumber: clean(req.body.accountNumber ?? current?.accountNumber),
      ifscCode: clean(req.body.ifscCode ?? current?.ifscCode).toUpperCase(),
      termsAndConditions: clean(req.body.termsAndConditions ?? current?.termsAndConditions),
      qrCode,
      printContent: {
        goodsReturn: bool(printContent.goodsReturn, current?.printContent?.goodsReturn ?? true),
        damageReturn: bool(printContent.damageReturn, current?.printContent?.damageReturn ?? true),
        showScheme: bool(printContent.showScheme, current?.printContent?.showScheme ?? true),
        showTaxSummary: bool(printContent.showTaxSummary, current?.printContent?.showTaxSummary ?? true),
      },
      outputSettings: {
        reportNumber,
        paperSize,
        orientation: paperSize === "A5" ? "landscape" : "portrait",
        fontSizePercent,
      },
      isActive: true,
    };

    const details = await PrintAccountDetails.findOneAndUpdate(
      scope,
      { $set: update },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({
      success: true,
      message: "Print account details saved successfully.",
      details,
    });
  } catch (error) {
    console.error("Print account details save error:", error);
    return res.status(error?.code === 11000 ? 409 : 500).json({
      success: false,
      message: "Failed to save print account details.",
    });
  }
});

export default router;
