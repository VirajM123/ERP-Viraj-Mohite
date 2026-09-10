import express from "express";
import mongoose from "mongoose";
import { writeAuditEvent } from "./audit.js";

const clean = (value) => String(value ?? "").trim();

const productMappingSchema = new mongoose.Schema({
  distributorId: { type: String, required: true, trim: true },
  firmId: { type: String, required: true, trim: true },
  firmName: { type: String, default: "", trim: true },
  sourceProductCode: { type: String, required: true, trim: true, uppercase: true },
  sourceProductName: { type: String, default: "", trim: true },
  mappings: [{
    _id: false,
    companyProdCode: { type: String, required: true, trim: true, uppercase: true },
    companyProdName: { type: String, required: true, trim: true },
    seqNo: { type: Number, required: true, min: 1 },
  }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true, collection: "Mas_ProductMapping" });

productMappingSchema.index(
  { distributorId: 1, firmId: 1, sourceProductCode: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

export const ProductMapping = mongoose.models.Mas_ProductMapping ||
  mongoose.model("Mas_ProductMapping", productMappingSchema);

const scope = (req) => ({
  distributorId: clean(req.auth?.distributorId),
  firmId: clean(req.auth?.firmId),
});

const normalizeMappings = (value) => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return null;
  const seen = new Set();
  const rows = [];
  for (let index = 0; index < value.length; index += 1) {
    const companyProdCode = clean(value[index]?.companyProdCode).toUpperCase();
    const companyProdName = clean(value[index]?.companyProdName);
    if (!companyProdCode || !companyProdName || seen.has(companyProdCode)) return null;
    seen.add(companyProdCode);
    rows.push({ companyProdCode, companyProdName, seqNo: index + 1 });
  }
  return rows;
};

export default function createProductMappingRouter({ authorizeRequest, Product }) {
  const router = express.Router();
  const permission = (action) => authorizeRequest("MAPPING", "PRODUCT_MAPPING", action);

  router.get("/", permission("view"), async (req, res, next) => {
    try {
      const rows = await ProductMapping.find({ ...scope(req), isActive: true })
        .sort({ sourceProductCode: 1 }).lean();
      return res.json({ success: true, mappings: rows });
    } catch (error) { return next(error); }
  });

  router.get("/:productCode", permission("view"), async (req, res, next) => {
    try {
      const mapping = await ProductMapping.findOne({
        ...scope(req), sourceProductCode: clean(req.params.productCode).toUpperCase(), isActive: true,
      }).lean();
      return res.json({ success: true, mapping: mapping || null });
    } catch (error) { return next(error); }
  });

  router.post("/", permission("add"), async (req, res, next) => {
    try {
      const tenant = scope(req);
      const sourceProductCode = clean(req.body?.sourceProductCode).toUpperCase();
      const mappings = normalizeMappings(req.body?.mappings);
      if (!sourceProductCode || !mappings) {
        return res.status(400).json({ success: false, message: "A source product and unique mapped products are required." });
      }
      const sourceProduct = await Product.findOne({
        ...tenant, productCode: sourceProductCode, isActive: { $ne: false },
      }).select({ productName: 1 }).lean();
      if (!sourceProduct) return res.status(400).json({ success: false, message: "Source product is not available for this firm." });

      const filter = { ...tenant, sourceProductCode };
      const before = await ProductMapping.findOne(filter).lean();
      if (before) {
        let allowed = false;
        await permission("edit")(req, res, () => { allowed = true; });
        if (!allowed) return;
      }
      const update = {
          firmName: clean(req.auth?.firmName),
          sourceProductName: clean(sourceProduct.productName),
          mappings,
          isActive: true,
      };
      // A concurrent create must produce a duplicate conflict, never overwrite
      // a mapping without the edit permission checked above.
      const mapping = before
        ? await ProductMapping.findOneAndUpdate({ ...filter, _id: before._id }, {
            $set: update,
          }, { new: true, runValidators: true }).lean()
        : (await ProductMapping.create({ ...filter, ...update })).toObject();
      if (!mapping) return res.status(409).json({ success: false, message: "Product mapping changed. Please reload and retry." });
      await writeAuditEvent(req, {
        entityType: "PRODUCT_MAPPING", entityId: mapping._id,
        action: before ? "UPDATE" : "CREATE", before, after: mapping,
      });
      return res.status(before ? 200 : 201).json({
        success: true,
        message: before ? "Product Mapping Updated" : "Product Mapping Saved",
        mapping,
      });
    } catch (error) {
      if (error?.code === 11000) return res.status(409).json({ success: false, message: "A mapping already exists for this product." });
      return next(error);
    }
  });

  router.delete("/:id", permission("delete"), async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "A valid mapping is required." });
      const mapping = await ProductMapping.findOneAndUpdate(
        { ...scope(req), _id: req.params.id, isActive: true },
        { $set: { isActive: false } },
        { new: true }
      ).lean();
      if (!mapping) return res.status(404).json({ success: false, message: "Product mapping not found." });
      await writeAuditEvent(req, { entityType: "PRODUCT_MAPPING", entityId: mapping._id, action: "DELETE", before: { isActive: true }, after: { isActive: false } });
      return res.json({ success: true, message: "Product mapping deleted successfully." });
    } catch (error) { return next(error); }
  });

  return router;
}
