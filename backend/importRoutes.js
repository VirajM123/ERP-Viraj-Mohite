import express from "express";
import mongoose from "mongoose";
import { importConfig, importTypes, getImportConfig } from "./importConfig.js";
import { writeAuditEvent } from "./audit.js";

const clean = (value) => String(value ?? "").trim();
const gstin = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const MAX_IMPORT_ROWS = Number(process.env.MAX_IMPORT_ROWS || 2000);
const unsafeSpreadsheetText = /^[=+\-@]/;
const importBatchSchema = new mongoose.Schema({
  distributorId: { type: String, required: true },
  firmId: { type: String, required: true },
  idempotencyKey: { type: String, required: true },
  entryType: { type: String, required: true },
  rowCount: { type: Number, required: true },
}, { timestamps: true, collection: "Sys_ImportBatch" });
importBatchSchema.index({ distributorId: 1, firmId: 1, idempotencyKey: 1 }, { unique: true });
const ImportBatch = mongoose.models.Sys_ImportBatch || mongoose.model("Sys_ImportBatch", importBatchSchema);
const samples = { "Account Code": "AC001", "Account Name": "ABC Traders", "Product Code": "P001", "Product Name": "Sample Product", "Company Code": "CMP01", "Company Name": "Sample Company", "Godown Code": "GD01", "Godown Name": "Main Godown", "GST Code": "GST18", "VAT Percent": 18 };
const duplicateKey = (config, doc) => {
  if (config.duplicateField === "mappingKey") {
    return config.label === "Area To Party Mapping"
      ? [doc.companyCode, doc.accountCode].map(clean).join("|")
      : [doc.companyCode, doc.areaCode, doc.salesmanCode].map(clean).join("|");
  }
  return clean(doc[config.duplicateField]);
};

export default function createImportRouter({ authorizeRequest, models }) {
  const router = express.Router();
  const companyViewPermission = authorizeRequest("MASTER", "COMPANY", "view");
  const entryOperations = { Account: "ACCOUNT", Product: "PRODUCT", Bank: "BANK", Salesman: "SALESMAN", Area: "AREA", AreaToPartyMapping: "AREA_TO_PARTY", SalesmanToAreaMapping: "SALESMAN_TO_AREA" };
  const importPermission = (req, res, next) => {
    const operation = entryOperations[req.body?.entryType];
    if (!operation) return res.status(400).json({ success: false, message: "Unsupported import entry type." });
    return authorizeRequest("MASTER", operation, "add")(req, res, next);
  };

  router.get("/import/types", companyViewPermission, (req, res) => res.json({ success: true, importTypes, config: importConfig }));

  const validate = async (req, res, next) => {
    try {
      const { entryType, data, company } = req.body || {};
      const config = getImportConfig(entryType);
      const Model = models[entryType];
      const { distributorId, firmId, firmName } = req.security;
      if (!config || !Model) return res.status(400).json({ success: false, message: "Unsupported import entry type." });
      if (!Array.isArray(data) || !data.length) return res.status(400).json({ success: false, message: "No Excel rows were supplied." });
      if (data.length > MAX_IMPORT_ROWS) return res.status(413).json({ success: false, message: `Import is limited to ${MAX_IMPORT_ROWS} rows per request.` });
      if (entryType !== "Company") {
        const companyCode = clean(company);
        if (!companyCode) return res.status(400).json({ success: false, message: "Please select a Company before importing." });
        const selectedCompany = await mongoose.connection.collection("Mas_Company").findOne({ distributorId, firmId, companyCode, isActive: true });
        if (!selectedCompany) return res.status(400).json({ success: false, message: "The selected Company is not available for this firm." });
        req.selectedCompany = selectedCompany;
      }
      const headers = Object.keys(data[0] || {});
      const missingColumns = config.columns.filter((column) => column.required && !headers.includes(column.excel)).map((column) => column.excel);
      if (missingColumns.length) return res.status(422).json({ success: false, message: `Missing required column(s): ${missingColumns.join(", ")}`, missingColumns });
      const collection = mongoose.connection.collection(config.collection);
      const existing = await collection.find({ distributorId, firmId }).toArray();
      const keys = new Set(existing.map((doc) => duplicateKey(config, doc).toLowerCase()).filter(Boolean));
      const seen = new Set(); const rows = []; const documents = [];
      for (let index = 0; index < data.length; index += 1) {
        const source = data[index]; const errors = []; const doc = { distributorId, firmId, firmName, isActive: true };
        for (const column of config.columns) {
          const raw = source[column.excel]; const value = clean(raw);
          if (column.required && !value) errors.push(`${column.excel} is required`);
          if (!value) continue;
          if (column.type === "number") { const numeric = Number(raw); if (!Number.isFinite(numeric)) errors.push(`${column.excel} must be a number`); else if (numeric < 0) errors.push(`${column.excel} cannot be negative`); else doc[column.field] = numeric; }
          else {
            if (unsafeSpreadsheetText.test(value)) errors.push(`${column.excel} cannot start with a spreadsheet formula character`);
            else doc[column.field] = value;
          }
        }
        if (doc._importDistributorId !== distributorId) {
          errors.push("Distributor ID must match the logged-in distributor");
        }
        if (doc._importFirmId !== firmId) {
          errors.push("Firm ID must match the logged-in firm");
        }
        // Tenant values in Excel are validation-only. They must never be
        // persisted or allowed to override the authenticated tenant scope.
        delete doc._importDistributorId;
        delete doc._importFirmId;
        if (doc.gstNo && !gstin.test(doc.gstNo.toUpperCase())) errors.push("GSTIN must be a valid 15-character GSTIN");
        const schemaError = new Model(doc).validateSync();
        if (schemaError) errors.push(...Object.values(schemaError.errors).map((item) => item.message));
        if (entryType === "AreaToPartyMapping") {
          if (doc.companyCode !== req.selectedCompany.companyCode) errors.push("Company Code must match the selected Company");
          const [account, area] = await Promise.all([
            mongoose.connection.collection("Mas_Account").findOne({ distributorId, firmId, accountCode: doc.accountCode, isActive: true }),
            mongoose.connection.collection("Mas_Area").findOne({ distributorId, firmId, areaCode: doc.areaCode, isActive: true }),
          ]);
          if (!account) errors.push(`Account Code "${doc.accountCode || ""}" does not exist`); else doc.accountName = account.accountName;
          if (!area) errors.push(`Area Code "${doc.areaCode || ""}" does not exist`); else doc.areaName = area.areaName;
          doc.companyName = req.selectedCompany.companyName;
        }
        if (entryType === "SalesmanToAreaMapping") {
          if (doc.companyCode !== req.selectedCompany.companyCode) errors.push("Company Code must match the selected Company");
          const [area, salesman] = await Promise.all([
            mongoose.connection.collection("Mas_Area").findOne({ distributorId, firmId, areaCode: doc.areaCode, isActive: true }),
            mongoose.connection.collection("Mas_Salesman").findOne({ distributorId, firmId, salesmanCode: doc.salesmanCode, isActive: true }),
          ]);
          if (!area) errors.push(`Area Code "${doc.areaCode || ""}" does not exist`); else doc.areaName = area.areaName;
          if (!salesman) errors.push(`Salesman Code "${doc.salesmanCode || ""}" does not exist`); else doc.salesmanName = salesman.salesmanName;
          doc.companyName = req.selectedCompany.companyName;
        }
        const key = duplicateKey(config, doc).toLowerCase();
        if (key && (keys.has(key) || seen.has(key))) errors.push(`${config.label} with ${config.duplicateField} "${doc[config.duplicateField]}" already exists`);
        if (key) seen.add(key);
        rows.push({ row: index + 2, status: errors.length ? "Error" : "Valid", message: errors.join("; ") });
        if (!errors.length) documents.push(doc);
      }
      req.importValidation = { config, rows, documents, total: data.length };
      next();
    } catch (error) { next(error); }
  };

  router.post("/import/validate", importPermission, validate, (req, res) => {
    const { rows, total } = req.importValidation;
    res.json({ success: true, total, valid: rows.filter((row) => row.status === "Valid").length, invalid: rows.filter((row) => row.status === "Error").length, rows });
  });

  router.post("/import/save", importPermission, validate, async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const { config, rows, documents, total } = req.importValidation;
      const invalid = rows.filter((row) => row.status === "Error");
      if (invalid.length) {
        await session.abortTransaction();
        return res.status(422).json({ success: false, message: "Fix every invalid row before saving. Nothing was imported.", total, valid: documents.length, invalid: invalid.length, rows });
      }
      const idempotencyKey = clean(req.headers["idempotency-key"]);
      if (!idempotencyKey) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: "Idempotency-Key header is required for import save." });
      }
      await ImportBatch.create([{
        distributorId: req.security.distributorId,
        firmId: req.security.firmId,
        idempotencyKey,
        entryType: req.body.entryType,
        rowCount: documents.length,
      }], { session });
      await models[req.body.entryType].insertMany(documents, { ordered: true, session });
      await writeAuditEvent(req, { entityType: "IMPORT_BATCH", entityId: idempotencyKey, action: "IMPORT", after: { entryType: req.body.entryType, rowCount: documents.length } }, session);
      await session.commitTransaction();
      return res.status(201).json({ success: true, message: `${documents.length} ${config.label} record(s) imported.`, total, inserted: documents.length, failed: 0, rows });
    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      if (error?.code === 11000) return res.status(409).json({ success: false, message: "This import request was already processed or contains duplicates." });
      next(error);
    } finally { await session.endSession(); }
  });
  router.use((error, req, res, next) => { console.error("Excel import error:", error); res.status(error?.code === 11000 ? 409 : 500).json({ success: false, message: error?.code === 11000 ? "A duplicate record was detected. Nothing was imported." : "Import failed. No data was saved.", error: error.message }); });
  return router;
}
