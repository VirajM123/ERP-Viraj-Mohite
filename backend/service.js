import express from "express";
import mongoose from "mongoose";
import { nextDocumentNumber } from "./counters.js";
import { assertMasterNotUsed } from "./masterUsageGuard.js";

const Service = mongoose.models.Mas_Service || mongoose.model("Mas_Service", new mongoose.Schema({
  serviceCode: { type: String, required: true, trim: true, uppercase: true },
  serviceName: { type: String, required: true, trim: true },
  gstId: { type: mongoose.Schema.Types.ObjectId, ref: "Mas_GST", required: true },
  gstCode: { type: String, default: "" },
  gstPercent: { type: Number, required: true, min: 0, max: 100 },
  hsnCode: { type: String, default: "", trim: true },
  description: { type: String, default: "", trim: true },
  distributorId: { type: String, required: true },
  firmId: { type: String, required: true },
  firmName: { type: String, default: "" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, collection: "Mas_Service" }));
Service.schema.index({ distributorId: 1, firmId: 1, serviceCode: 1 }, { unique: true });

const salesItemSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Mas_Service", required: true },
  serviceCode: { type: String, required: true }, serviceName: { type: String, required: true },
  hsnCode: { type: String, default: "" }, amount: { type: Number, required: true, min: 0 },
  gstPercent: { type: Number, required: true, min: 0, max: 100 },
  gstAmount: { type: Number, required: true, min: 0 }, igstAmount: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 }, sgstAmount: { type: Number, default: 0 },
}, { _id: false });

const SalesService = mongoose.models.T_SalesService || mongoose.model("T_SalesService", new mongoose.Schema({
  voucherDate: { type: String, required: true }, voucherSeries: { type: String, default: "SS" },
  voucherNo: { type: Number, required: true }, partyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  partyCode: { type: String, required: true }, partyName: { type: String, required: true },
  narration: { type: String, default: "" }, fromDate: { type: String, default: "" }, toDate: { type: String, default: "" },
  acknowledgementNo: { type: String, default: "" }, ewayBillNo: { type: String, default: "" },
  irnNo: { type: String, default: "" }, acknowledgementDate: { type: String, default: "" },
  addAmount: { type: Number, default: 0 }, lessAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true }, gstAmount: { type: Number, required: true },
  netAmount: { type: Number, required: true }, items: { type: [salesItemSchema], required: true },
  distributorId: { type: String, required: true }, firmId: { type: String, required: true },
  firmName: { type: String, default: "" }, isActive: { type: Boolean, default: true },
}, { timestamps: true, collection: "T_SalesService" }));
SalesService.schema.index({ distributorId: 1, firmId: 1, voucherSeries: 1, voucherNo: 1 }, { unique: true });

const clean = (value) => String(value ?? "").trim();
const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const tenant = (source = {}) => ({ distributorId: clean(source.distributorId), firmId: clean(source.firmId) });
const checkTenant = (scope, res) => {
  if (scope.distributorId && scope.firmId) return true;
  res.status(400).json({ success: false, message: "Distributor/Firm not found. Please login again." });
  return false;
};
const requestTenant = (req, source, res) => {
  const supplied = tenant(source);
  const authenticated = tenant(req.security || req.auth || {});
  if (!checkTenant(authenticated, res)) return null;
  if ((supplied.distributorId && supplied.distributorId !== authenticated.distributorId) ||
      (supplied.firmId && supplied.firmId !== authenticated.firmId)) {
    res.status(403).json({ success: false, message: "The requested firm does not match your session." });
    return null;
  }
  return authenticated;
};
const paging = (query) => ({
  page: Math.max(parseInt(query.page, 10) || 1, 1), limit: Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100),
});

async function servicePayload(body, scope) {
  const serviceCode = clean(body.serviceCode || body.code).toUpperCase();
  const serviceName = clean(body.serviceName || body.name);
  const gstId = clean(body.gstId);
  if (!serviceCode || !serviceName || !mongoose.isValidObjectId(gstId)) {
    throw Object.assign(new Error("Service Code, Service Name and GST are required."), { status: 400 });
  }
  const gst = await mongoose.connection.collection("Mas_GST").findOne({
    _id: new mongoose.Types.ObjectId(gstId), ...scope, isActive: { $ne: false },
  });
  if (!gst) throw Object.assign(new Error("Selected GST was not found in this firm."), { status: 400 });
  return { serviceCode, serviceName, gstId: gst._id, gstCode: clean(gst.gstCode),
    gstPercent: Number(gst.vatPercent || 0), hsnCode: clean(body.hsnCode), description: clean(body.description) };
}

async function voucherPayload(body, scope) {
  const partyId = clean(body.partyId);
  if (!mongoose.isValidObjectId(partyId)) throw Object.assign(new Error("Please select a valid party."), { status: 400 });
  const party = await mongoose.connection.collection("Mas_Account").findOne({
    _id: new mongoose.Types.ObjectId(partyId), ...scope, isActive: { $ne: false },
  });
  if (!party) throw Object.assign(new Error("Selected party was not found in this firm."), { status: 400 });
  const firm = await mongoose.connection.collection("Mas_Register").findOne({
    ...scope, isActive: { $ne: false },
  });
  const firmState = clean(firm?.state).toUpperCase();
  const partyState = clean(party.state).toUpperCase();
  const partyInvoiceType = clean(party.invType || party.taxType || "TAXABLE").toUpperCase();
  const isCstInvoice = partyInvoiceType === "CST" || partyInvoiceType === "IGST" ||
    partyInvoiceType === "INTERSTATE" || partyInvoiceType.includes("CST") || partyInvoiceType.includes("IGST");
  const isInterstateSupply = isCstInvoice || Boolean(firmState && partyState && firmState !== partyState);
  const requested = Array.isArray(body.items) ? body.items : [];
  if (!requested.length) throw Object.assign(new Error("Add at least one service row."), { status: 400 });
  const ids = requested.map((row) => clean(row.serviceId));
  if (ids.some((id) => !mongoose.isValidObjectId(id))) throw Object.assign(new Error("Select a service in every row."), { status: 400 });
  const records = await Service.find({ _id: { $in: [...new Set(ids)] }, ...scope, isActive: { $ne: false } }).lean();
  const byId = new Map(records.map((record) => [String(record._id), record]));
  const items = requested.map((row) => {
    const service = byId.get(clean(row.serviceId));
    const amount = round(row.amount);
    if (!service || !Number.isFinite(amount) || amount <= 0) {
      throw Object.assign(new Error("Each service amount must be greater than zero."), { status: 400 });
    }
    const gstPercent = Number(service.gstPercent || 0);
    const gstAmount = round(amount * gstPercent / 100);
    // Tax split is derived from the saved firm and party states, not trusted from the browser.
    const interstate = isInterstateSupply;
    const cgstAmount = interstate ? 0 : round(gstAmount / 2);
    return { serviceId: service._id, serviceCode: service.serviceCode, serviceName: service.serviceName,
      hsnCode: service.hsnCode || "", amount, gstPercent, gstAmount,
      igstAmount: interstate ? gstAmount : 0, cgstAmount, sgstAmount: interstate ? 0 : round(gstAmount - cgstAmount) };
  });
  const totalAmount = round(items.reduce((sum, row) => sum + row.amount, 0));
  const gstAmount = round(items.reduce((sum, row) => sum + row.gstAmount, 0));
  const addAmount = round(body.addAmount || 0), lessAmount = round(body.lessAmount || 0);
  if (addAmount < 0 || lessAmount < 0) throw Object.assign(new Error("Add/Less Amount cannot be negative."), { status: 400 });
  return {
    voucherDate: clean(body.voucherDate), voucherSeries: clean(body.voucherSeries || "SS").toUpperCase(),
    partyId: party._id, partyCode: party.accountCode, partyName: party.accountName,
    narration: clean(body.narration), fromDate: clean(body.fromDate), toDate: clean(body.toDate),
    acknowledgementNo: clean(body.acknowledgementNo), ewayBillNo: clean(body.ewayBillNo),
    irnNo: clean(body.irnNo), acknowledgementDate: clean(body.acknowledgementDate),
    addAmount, lessAmount, totalAmount, gstAmount, netAmount: round(totalAmount + gstAmount + addAmount - lessAmount), items,
  };
}

function listFilter(query, scope, fields) {
  const filter = { ...scope, isActive: { $ne: false } }, search = clean(query.search);
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = fields.map((field) => ({ [field]: regex }));
  }
  return filter;
}

export default function createServiceRouter(securityRouter) {
  const router = express.Router();
  const master = (action) => securityRouter.authorizeRequest("MASTER", "SERVICE", action);
  const sales = (action) => securityRouter.authorizeRequest("SALES", "SALES_SERVICE", action);

  router.get("/services", master("view"), async (req, res) => {
    try {
      const scope = requestTenant(req, req.query, res); if (!scope) return;
      const { page, limit } = paging(req.query), filter = listFilter(req.query, scope, ["serviceCode", "serviceName", "hsnCode", "description"]);
      const totalRecords = await Service.countDocuments(filter), totalPages = Math.max(Math.ceil(totalRecords / limit), 1);
      const currentPage = Math.min(page, totalPages);
      const services = await Service.find(filter).sort({ serviceCode: 1 }).skip((currentPage - 1) * limit).limit(limit).lean();
      res.json({ success: true, services, pagination: { currentPage, limit, totalRecords, totalPages } });
    } catch (error) { res.status(500).json({ success: false, message: "Failed to load Service Master.", error: error.message }); }
  });

  router.post("/services", master("add"), async (req, res) => {
    try {
      const scope = requestTenant(req, req.body, res); if (!scope) return;
      const service = await Service.create({ ...(await servicePayload(req.body, scope)), ...scope, firmName: clean(req.body.firmName) });
      res.status(201).json({ success: true, message: "Service saved successfully.", service });
    } catch (error) { res.status(error.code === 11000 ? 409 : error.status || 500).json({ success: false, message: error.code === 11000 ? "Service Code already exists in this firm." : error.message }); }
  });

  router.put("/services/:id", master("edit"), async (req, res) => {
    try {
      const scope = requestTenant(req, req.body, res); if (!scope) return;
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid Service ID." });
      const service = await Service.findOneAndUpdate({ _id: req.params.id, ...scope, isActive: { $ne: false } },
        { $set: await servicePayload(req.body, scope) }, { new: true, runValidators: true });
      if (!service) return res.status(404).json({ success: false, message: "Service not found." });
      res.json({ success: true, message: "Service updated successfully.", service });
    } catch (error) { res.status(error.code === 11000 ? 409 : error.status || 500).json({ success: false, message: error.code === 11000 ? "Service Code already exists in this firm." : error.message }); }
  });

  router.delete("/services/:id", master("delete"), async (req, res) => {
    try {
      const scope = requestTenant(req, req.query, res); if (!scope) return;
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid Service ID." });
      const filter = { _id: req.params.id, ...scope, isActive: { $ne: false } };
      const record = await Service.findOne(filter);
      if (!record) return res.status(404).json({ success: false, message: "Service not found." });
      await assertMasterNotUsed({ connection: mongoose.connection, scope, type: "service",
        record: { _id: record._id, code: record.serviceCode, name: record.serviceName } });
      await Service.findOneAndUpdate(filter, { $set: { isActive: false } });
      res.json({ success: true, message: "Service deleted successfully." });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false,
        message: error.statusCode ? error.message : "Service delete failed." });
    }
  });

  router.get("/sales-services", sales("view"), async (req, res) => {
    try {
      const scope = requestTenant(req, req.query, res); if (!scope) return;
      const { page, limit } = paging(req.query), filter = listFilter(req.query, scope, ["voucherSeries", "partyCode", "partyName", "narration"]);
      const numeric = Number(clean(req.query.search)); if (clean(req.query.search) && Number.isFinite(numeric)) filter.$or.push({ voucherNo: numeric });
      const totalRecords = await SalesService.countDocuments(filter), totalPages = Math.max(Math.ceil(totalRecords / limit), 1);
      const currentPage = Math.min(page, totalPages);
      const vouchers = await SalesService.find(filter).sort({ voucherDate: -1, voucherNo: -1 }).skip((currentPage - 1) * limit).limit(limit).lean();
      res.json({ success: true, vouchers, pagination: { currentPage, limit, totalRecords, totalPages } });
    } catch (error) { res.status(500).json({ success: false, message: "Failed to load Sales Service list.", error: error.message }); }
  });

  router.get("/sales-services/next-voucher-no", sales("add"), async (req, res) => {
    try {
      const scope = requestTenant(req, req.query, res); if (!scope) return;
      const voucherSeries = clean(req.query.voucherSeries || "SS").toUpperCase();
      const latest = await SalesService.findOne({ ...scope, voucherSeries }).sort({ voucherNo: -1 }).select("voucherNo").lean();
      res.json({ success: true, nextVoucherNo: latest ? Number(latest.voucherNo || 0) + 1 : 1 });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to load next Sales Service voucher number.", error: error.message });
    }
  });

  router.post("/sales-services", sales("add"), async (req, res) => {
    try {
      const scope = requestTenant(req, req.body, res); if (!scope) return;
      const payload = await voucherPayload(req.body, scope);
      if (!payload.voucherDate) return res.status(400).json({ success: false, message: "Voucher Date is required." });
      const latest = await SalesService.findOne({ ...scope, voucherSeries: payload.voucherSeries }).sort({ voucherNo: -1 }).lean();
      const voucherNo = await nextDocumentNumber({ ...scope, documentType: "SALES_SERVICE", series: payload.voucherSeries,
        documentDate: payload.voucherDate, minimumValue: latest?.voucherNo || 0 });
      const voucher = await SalesService.create({ ...payload, voucherNo, ...scope, firmName: clean(req.body.firmName) });
      res.status(201).json({ success: true, message: "Sales Service saved successfully.", voucher });
    } catch (error) { res.status(error.status || 500).json({ success: false, message: error.message || "Sales Service save failed." }); }
  });

  router.put("/sales-services/:id", sales("edit"), async (req, res) => {
    try {
      const scope = requestTenant(req, req.body, res); if (!scope) return;
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid voucher ID." });
      const voucher = await SalesService.findOne({ _id: req.params.id, ...scope, isActive: { $ne: false } });
      if (!voucher) return res.status(404).json({ success: false, message: "Sales Service voucher not found." });
      const payload = await voucherPayload(req.body, scope); delete payload.voucherSeries;
      Object.assign(voucher, payload); await voucher.save();
      res.json({ success: true, message: "Sales Service updated successfully.", voucher });
    } catch (error) { res.status(error.status || 500).json({ success: false, message: error.message || "Sales Service update failed." }); }
  });

  router.delete("/sales-services/:id", sales("delete"), async (req, res) => {
    const scope = requestTenant(req, req.query, res); if (!scope) return;
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid voucher ID." });
    const voucher = await SalesService.findOneAndUpdate({ _id: req.params.id, ...scope, isActive: { $ne: false } }, { $set: { isActive: false } });
    if (!voucher) return res.status(404).json({ success: false, message: "Sales Service voucher not found." });
    res.json({ success: true, message: "Sales Service deleted successfully." });
  });
  return router;
}

export { Service, SalesService };
