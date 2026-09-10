import express from "express";
import mongoose from "mongoose";

const text = (value) => String(value ?? "").trim();

const batchRateAuditSchema = new mongoose.Schema(
  {
    distributorId: { type: String, required: true, index: true },
    firmId: { type: String, required: true, index: true },
    stockId: { type: mongoose.Schema.Types.ObjectId, required: true },
    companyCode: { type: String, default: "" },
    companyName: { type: String, default: "" },
    productCode: { type: String, required: true },
    productName: { type: String, default: "" },
    godownCode: { type: String, default: "" },
    batch: { type: String, default: "." },
    mrp: { type: Number, default: 0 },
    purchaseRate: { type: Number, default: 0 },
    previousSalesRate: { type: Number, default: 0 },
    newSalesRate: { type: Number, default: 0 },
    previousLocked: { type: String, enum: ["Y", "N"], default: "N" },
    newLocked: { type: String, enum: ["Y", "N"], default: "N" },
    reason: { type: String, required: true, trim: true },
    editedBy: { type: String, default: "" },
    editedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "Audit_BatchRateChange" }
);

batchRateAuditSchema.index({ distributorId: 1, firmId: 1, editedAt: -1 });

const BatchRateAudit =
  mongoose.models.Audit_BatchRateChange ||
  mongoose.model("Audit_BatchRateChange", batchRateAuditSchema);

const scopeFor = (req) => ({
  distributorId: text(req.auth?.distributorId),
  firmId: text(req.auth?.firmId),
});

const companyKeys = (company) =>
  new Set(
    [company?._id, company?.companyCode, company?.companyName]
      .map((value) => text(value).toUpperCase())
      .filter(Boolean)
  );

export default function createBatchLockRouter({ Stock, Product, Company, authorizeRequest, authorize }) {
  const router = express.Router();

  router.get("/stock", authorizeRequest("TOOLS", "BATCH_LOCK", "view"), async (req, res) => {
    try {
      const scope = scopeFor(req);
      const requestedCompany = text(req.query.companyCode).toUpperCase();
      const withStockOnly = text(req.query.withStockOnly || "Y").toUpperCase() !== "N";
      const search = text(req.query.search).toUpperCase();

      const [stockRows, products, selectedCompany] = await Promise.all([
        Stock.find({
          ...scope,
          ...(withStockOnly ? { Qty: { $gt: 0 } } : {}),
          $or: [{ isActive: true }, { isActive: { $exists: false } }],
        })
          .sort({ ProdCode: 1, Batch: 1, MRP: 1 })
          .limit(5000)
          .lean(),
        Product.find({ ...scope, isActive: { $ne: false } })
          .select({ productCode: 1, productName: 1, companyId: 1, companyName: 1 })
          .lean(),
        requestedCompany && requestedCompany !== "ALL"
          ? Company.findOne({
              ...scope,
              $or: [
                { companyCode: requestedCompany },
                { companyName: requestedCompany },
              ],
            }).lean()
          : null,
      ]);

      const productMap = new Map(
        products.map((product) => [text(product.productCode).toUpperCase(), product])
      );
      const latestAuditRows = stockRows.length
        ? await BatchRateAudit.aggregate([
            { $match: { ...scope, stockId: { $in: stockRows.map((row) => row._id) } } },
            { $sort: { editedAt: -1, createdAt: -1 } },
            { $group: { _id: "$stockId", latest: { $first: "$$ROOT" } } },
          ])
        : [];
      const latestAuditMap = new Map(
        latestAuditRows.map((row) => [String(row._id), row.latest])
      );
      const selectedKeys = companyKeys(selectedCompany);
      if (requestedCompany && requestedCompany !== "ALL") selectedKeys.add(requestedCompany);

      const rows = stockRows
        .map((stock) => {
          const product = productMap.get(text(stock.ProdCode).toUpperCase()) || {};
          const latestAudit = latestAuditMap.get(String(stock._id));
          const productCompanyKeys = [product.companyId, product.companyName]
            .map((value) => text(value).toUpperCase())
            .filter(Boolean);
          return {
            id: String(stock._id),
            productCode: text(stock.ProdCode),
            productName: text(product.productName),
            companyCode: text(selectedCompany?.companyCode || product.companyId),
            companyName: text(product.companyName || selectedCompany?.companyName),
            godownCode: text(stock.GDCode),
            batch: text(stock.Batch) || ".",
            mrp: Number(stock.MRP || 0),
            purchaseRate: Number(stock.PRate || 0),
            salesRate: Number(stock.SRate || 0),
            previousSalesRate: latestAudit ? Number(latestAudit.previousSalesRate || 0) : null,
            quantity: Number(stock.Qty || 0),
            locked: text(stock.IsLocked || "N").toUpperCase() === "Y" ? "Y" : "N",
            editedBy: text(latestAudit?.editedBy),
            editedAt: latestAudit?.editedAt || null,
            matchesCompany:
              !requestedCompany ||
              requestedCompany === "ALL" ||
              productCompanyKeys.some((key) => selectedKeys.has(key)),
          };
        })
        .filter((row) => row.matchesCompany)
        .filter(
          (row) =>
            !search ||
            row.productCode.toUpperCase().includes(search) ||
            row.productName.toUpperCase().includes(search) ||
            row.batch.toUpperCase().includes(search)
        )
        .map(({ matchesCompany, ...row }) => row);

      return res.json({ success: true, rows });
    } catch (error) {
      console.error("Batch lock stock load error:", error);
      return res.status(500).json({ success: false, message: "Failed to load stock batches." });
    }
  });

  router.get("/history", authorizeRequest("TOOLS", "BATCH_LOCK", "view"), async (req, res) => {
    try {
      const rows = await BatchRateAudit.find(scopeFor(req))
        .sort({ editedAt: -1, createdAt: -1 })
        .limit(1000)
        .lean();
      return res.json({ success: true, rows });
    } catch (error) {
      console.error("Batch rate history load error:", error);
      return res.status(500).json({ success: false, message: "Failed to load batch change history." });
    }
  });

  router.put("/stock", async (req, res) => {
    const session = await mongoose.startSession();
    try {
      const scope = scopeFor(req);
      const reason = text(req.body.reason);
      const requestedUpdates = Array.isArray(req.body.updates) ? req.body.updates : [];

      if (!reason) {
        return res.status(400).json({ success: false, message: "A reason is required for batch lock or rate changes." });
      }
      const ids = requestedUpdates
        .map((row) => text(row.stockId))
        .filter((id) => mongoose.Types.ObjectId.isValid(id));

      if (!ids.length) {
        return res.status(400).json({ success: false, message: "Select at least one stock batch to update." });
      }

      const stocks = await Stock.find({ ...scope, _id: { $in: ids } }).lean();
      const stockMap = new Map(stocks.map((row) => [String(row._id), row]));
      const productCodes = [...new Set(stocks.map((row) => text(row.ProdCode)).filter(Boolean))];
      const products = await Product.find({ ...scope, productCode: { $in: productCodes } })
        .select({ productCode: 1, productName: 1, companyId: 1, companyName: 1 })
        .lean();
      const productMap = new Map(products.map((row) => [text(row.productCode), row]));

      const operations = [];
      const auditRows = [];
      let changesRate = false;
      let changesLock = false;
      for (const requested of requestedUpdates) {
        const stock = stockMap.get(text(requested.stockId));
        if (!stock) continue;

        const newSalesRate = Number(requested.salesRate);
        if (!Number.isFinite(newSalesRate) || newSalesRate < 0) {
          return res.status(400).json({
            success: false,
            message: `Enter a valid sales rate for ${stock.ProdCode}.`,
          });
        }
        const newLocked = text(requested.locked).toUpperCase() === "Y" ? "Y" : "N";
        const previousSalesRate = Number(stock.SRate || 0);
        const previousLocked = text(stock.IsLocked || "N").toUpperCase() === "Y" ? "Y" : "N";
        if (previousSalesRate === newSalesRate && previousLocked === newLocked) continue;
        if (previousSalesRate !== newSalesRate) changesRate = true;
        if (previousLocked !== newLocked) changesLock = true;

        const product = productMap.get(text(stock.ProdCode)) || {};
        operations.push({
          updateOne: {
            filter: { ...scope, _id: stock._id },
            update: { $set: { SRate: newSalesRate, IsLocked: newLocked } },
          },
        });
        auditRows.push({
          ...scope,
          stockId: stock._id,
          companyCode: text(product.companyId),
          companyName: text(product.companyName),
          productCode: text(stock.ProdCode),
          productName: text(product.productName),
          godownCode: text(stock.GDCode),
          batch: text(stock.Batch) || ".",
          mrp: Number(stock.MRP || 0),
          purchaseRate: Number(stock.PRate || 0),
          previousSalesRate,
          newSalesRate,
          previousLocked,
          newLocked,
          reason,
          editedBy: text(req.auth?.userName || req.auth?.userId),
          editedAt: new Date(),
        });
      }

      if (!operations.length) {
        return res.status(400).json({ success: false, message: "No rate or lock changes were found." });
      }

      const user = {
        distributorId: scope.distributorId,
        firmId: scope.firmId,
        userId: text(req.auth?.userId),
        role: text(req.auth?.role),
      };
      if (changesLock && !(await authorize(user.distributorId, user.firmId, user.userId, user.role, "TOOLS", "BATCH_LOCK", "edit"))) {
        return res.status(403).json({ success: false, message: "You do not have permission to lock or unlock batches." });
      }
      if (changesRate && !(await authorize(user.distributorId, user.firmId, user.userId, user.role, "TOOLS", "BATCH_RATE_OVERRIDE", "edit"))) {
        return res.status(403).json({ success: false, message: "You do not have permission to change batch sales rates." });
      }

      session.startTransaction();
      await Stock.bulkWrite(operations, { session });
      await BatchRateAudit.insertMany(auditRows, { session });
      await session.commitTransaction();
      return res.json({
        success: true,
        message: `${operations.length} stock batch${operations.length === 1 ? "" : "es"} updated successfully.`,
        changedCount: operations.length,
      });
    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      console.error("Batch rate update error:", error);
      return res.status(500).json({ success: false, message: "Failed to update batch lock or sales rate." });
    } finally {
      await session.endSession();
    }
  });

  return router;
}
