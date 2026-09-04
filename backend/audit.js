import mongoose from "mongoose";

const auditEventSchema = new mongoose.Schema({
  entityType: { type: String, required: true, index: true },
  entityId: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  distributorId: { type: String, required: true, index: true },
  firmId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  reason: { type: String, default: "" },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  requestId: { type: String, default: "" },
  ip: { type: String, default: "" },
  userAgent: { type: String, default: "" },
}, { timestamps: true, collection: "Sys_AuditEvent" });

auditEventSchema.index({ firmId: 1, createdAt: -1 });

export const AuditEvent = mongoose.models.Sys_AuditEvent || mongoose.model("Sys_AuditEvent", auditEventSchema);

export const redactAuditValue = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const secretKeys = new Set(["password", "oldpassword", "token", "apikey", "authorization", "secret"]);
  const visit = (input) => {
    if (Array.isArray(input)) return input.map(visit);
    if (!input || typeof input !== "object") return input;
    return Object.fromEntries(Object.entries(input).map(([key, nested]) => [key, secretKeys.has(key.toLowerCase()) ? "[REDACTED]" : visit(nested)]));
  };
  const serializedValue = JSON.stringify(value);
  return serializedValue === undefined
    ? null
    : visit(JSON.parse(serializedValue));
};

export const writeAuditEvent = (req, event, session) => AuditEvent.create([{
  ...event,
  distributorId: req.auth.distributorId,
  firmId: req.auth.firmId,
  userId: req.auth.userId,
  before: redactAuditValue(event.before),
  after: redactAuditValue(event.after),
  requestId: String(req.headers["x-request-id"] || ""),
  ip: String(req.ip || ""),
  userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
}], { session });
