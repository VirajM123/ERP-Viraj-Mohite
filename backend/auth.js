import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const BCRYPT_ROUNDS = 12;
const PUBLIC_API_PATHS = new Set([
  "/login",
  "/login/firms",
  "/register",
  "/connection-status",
  "/bill-print/health",
]);

export const isPasswordHash = (value = "") => /^\$2[aby]\$\d{2}\$/.test(String(value));

export const hashPassword = (value) => bcrypt.hash(String(value), BCRYPT_ROUNDS);

export const verifyPassword = async (candidate, stored) => {
  if (!stored) return false;
  return isPasswordHash(stored)
    ? bcrypt.compare(String(candidate), String(stored))
    : String(candidate) === String(stored);
};

// Legacy plaintext credentials are upgraded only after a successful login.
export const migrateLegacyPassword = async (model, id, candidate, stored) => {
  if (!isPasswordHash(stored)) {
    await model.updateOne(
      { _id: id, password: stored },
      { $set: { password: await hashPassword(candidate), oldPassword: "" } }
    );
  }
};

const jwtSecret = () => {
  const value = String(process.env.JWT_SECRET || "").trim();
  if (value.length < 32) {
    const error = new Error("JWT_SECRET must contain at least 32 characters.");
    error.code = "JWT_SECRET_INVALID";
    throw error;
  }
  return value;
};

export const assertSecurityConfiguration = () => {
  jwtSecret();
  if (process.env.NODE_ENV === "production") {
    const origins = String(process.env.CORS_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
    if (origins.length === 0 || origins.some((origin) => /localhost|127\.0\.0\.1/i.test(origin))) {
      const error = new Error("Production CORS_ORIGINS must contain the deployed frontend origin.");
      error.code = "CORS_ORIGINS_INVALID";
      throw error;
    }
  }
};

export const requireRoles = (...roles) => {
  const allowed = new Set(roles.map((role) => String(role).trim().toUpperCase()));
  return (req, res, next) => {
    if (!req.auth || !allowed.has(String(req.auth.role || "").toUpperCase())) {
      return res.status(403).json({ success: false, message: "Administrator permission is required." });
    }
    next();
  };
};

export const issueAccessToken = (user, source) =>
  jwt.sign(
    {
      sub: String(user._id),
      src: source,
      firmId: String(user.firmId || ""),
      distributorId: String(user.distributorId || ""),
      ver: Number(user.sessionVersion || 0),
    },
    jwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "30m", issuer: "fmcg-erp", audience: "fmcg-erp-web" }
  );

const resolvePrincipal = async (payload) => {
  if (!mongoose.isValidObjectId(payload.sub)) return null;
  const collectionName = payload.src === "REGISTER" ? "Mas_Register" : "Mas_User";
  const record = await mongoose.connection.collection(collectionName).findOne({
    _id: new mongoose.Types.ObjectId(payload.sub),
    isActive: true,
  });
  if (!record) return null;
  if (
    String(record.firmId || "") !== String(payload.firmId || "") ||
    String(record.distributorId || "") !== String(payload.distributorId || "") ||
    Number(record.sessionVersion || 0) !== Number(payload.ver || 0)
  ) return null;
  return {
    id: String(record._id),
    userId: String(record.userId || record.userName || ""),
    userName: String(record.userName || ""),
    distributorId: String(record.distributorId || ""),
    firmId: String(record.firmId || ""),
    firmName: String(record.firmName || ""),
    role: String(record.role || "USER").trim().toUpperCase(),
    source: payload.src,
  };
};

const rejectTenantMismatch = (req, principal) => {
  const candidates = [req.body, req.query, req.params];
  for (const source of candidates) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      const normalized = key.toLowerCase();
      if (normalized === "firmid" && value && String(value) !== principal.firmId) return true;
      if (normalized === "distributorid" && value && String(value) !== principal.distributorId) return true;
    }
  }
  return false;
};

export const authenticateApi = async (req, res, next) => {
  if (req.method === "OPTIONS" || PUBLIC_API_PATHS.has(req.path)) return next();
  try {
    const match = String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ success: false, message: "Authentication required." });
    const payload = jwt.verify(match[1], jwtSecret(), {
      issuer: "fmcg-erp",
      audience: "fmcg-erp-web",
    });
    const principal = await resolvePrincipal(payload);
    if (!principal) return res.status(401).json({ success: false, message: "User session is no longer valid." });
    if (rejectTenantMismatch(req, principal)) {
      return res.status(403).json({ success: false, message: "Cross-firm access is not allowed." });
    }
    req.auth = principal;
    req.security = principal;
    if (req.body && typeof req.body === "object") {
      req.body.distributorId ||= principal.distributorId;
      req.body.firmId ||= principal.firmId;
      req.body.firmName ||= principal.firmName;
      if (Object.prototype.hasOwnProperty.call(req.body, "DistributorId")) req.body.DistributorId = principal.distributorId;
      if (Object.prototype.hasOwnProperty.call(req.body, "FirmId")) req.body.FirmId = principal.firmId;
    }
    next();
  } catch (error) {
    const message = error?.name === "TokenExpiredError" ? "Session expired." : "Invalid authentication token.";
    return res.status(401).json({ success: false, message });
  }
};

export const createRateLimiter = ({ windowMs, max, paths = null }) => {
  const buckets = new Map();
  let indexReady = false;
  return async (req, res, next) => {
    if (paths && !paths.has(req.path)) return next();
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    if (process.env.NODE_ENV === "production" && mongoose.connection.readyState === 1) {
      try {
        const collection = mongoose.connection.collection("Sys_RateLimit");
        if (!indexReady) {
          await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
          indexReady = true;
        }
        const windowStart = Math.floor(now / windowMs) * windowMs;
        const distributed = await collection.findOneAndUpdate(
          { _id: `${req.path}:${req.ip}:${windowStart}` },
          { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart + windowMs) } },
          { upsert: true, returnDocument: "after" }
        );
        const count = Number(distributed?.count || 0);
        res.setHeader("RateLimit-Limit", String(max));
        res.setHeader("RateLimit-Remaining", String(Math.max(0, max - count)));
        if (count > max) return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
        return next();
      } catch {
        if (paths) return res.status(503).json({ success: false, message: "Authentication protection is temporarily unavailable." });
      }
    }
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
    if (buckets.size > 10000) {
      for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
    }
    next();
  };
};
