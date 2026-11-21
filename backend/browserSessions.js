import crypto from "node:crypto";
import mongoose from "mongoose";
import { buildAllowedOrigins } from "./corsOrigins.js";

const cookieName = "erp_session";
const lifetimeMs = 8 * 60 * 60 * 1000;
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const csrfFor = (value) => crypto.createHmac("sha256", process.env.JWT_SECRET).update(`csrf:${value}`).digest("hex");
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api" });
const getCookie = (req) => {
  const values = String(req.headers.cookie || "").split(";").map((part) => part.trim()).filter((part) => part.startsWith(`${cookieName}=`));
  if (values.length !== 1) return "";
  const value = values[0].slice(cookieName.length + 1);
  return /^[a-f0-9]{64}$/.test(value) ? value : "";
};
export const allowedBrowserOrigin = (req) => {
  const origin = String(req.headers.origin || "");
  return !!origin && buildAllowedOrigins(process.env.CORS_ORIGINS || "http://localhost:5173").has(origin);
};
export const browserLoginRequested = (req) => req.headers["x-erp-browser"] === "1";
export async function createBrowserSession(res, token) {
  const secret = crypto.randomBytes(32).toString("hex");
  const collection = mongoose.connection.collection("Sys_BrowserSession");
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await collection.insertOne({ _id: digest(secret), token, expiresAt: new Date(Date.now() + lifetimeMs) });
  res.cookie(cookieName, secret, { ...cookieOptions(), maxAge: lifetimeMs });
  return csrfFor(secret);
}
export async function readBrowserSession(req) {
  const secret = getCookie(req);
  if (!secret) return null;
  const id = digest(secret);
  const record = await mongoose.connection.collection("Sys_BrowserSession").findOne({ _id: id, expiresAt: { $gt: new Date() } });
  return record ? { id, token: record.token, csrf: csrfFor(secret) } : null;
}
export const validBrowserCsrf = (req, session) => {
  if (!allowedBrowserOrigin(req)) return false;
  const provided = String(req.headers["x-csrf-token"] || "");
  const expected = session.csrf;
  return provided.length === expected.length && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
};
export async function revokeBrowserSession(req, res) {
  if (req.browserSession) await mongoose.connection.collection("Sys_BrowserSession").deleteOne({ _id: req.browserSession.id });
  res.clearCookie(cookieName, cookieOptions());
}
