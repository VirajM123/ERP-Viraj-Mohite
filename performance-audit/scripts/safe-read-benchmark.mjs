/* Read-only HTTP benchmark. It sends GET only and has no credentials by default.
 * Example: node performance-audit/scripts/safe-read-benchmark.mjs
 * Optional: AUDIT_BASE_URL=http://127.0.0.1:5101 AUDIT_PATH=/health/live AUDIT_REQUESTS=100 AUDIT_CONCURRENCY=1
 * For an approved protected GET only: AUDIT_AUTHORIZATION='Bearer <synthetic token>'.
 */
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const base = (process.env.AUDIT_BASE_URL || "http://127.0.0.1:5101").replace(/\/$/, "");
const endpoint = process.env.AUDIT_PATH || "/health/live";
const requests = Number(process.env.AUDIT_REQUESTS || 100);
const concurrency = Number(process.env.AUDIT_CONCURRENCY || 1);
const warmup = Number(process.env.AUDIT_WARMUP || 10);
if (!endpoint.startsWith("/") || !Number.isInteger(requests) || requests < 1 || !Number.isInteger(concurrency) || concurrency < 1) throw new Error("Invalid AUDIT_PATH, AUDIT_REQUESTS, or AUDIT_CONCURRENCY.");

const headers = process.env.AUDIT_AUTHORIZATION ? { authorization: process.env.AUDIT_AUTHORIZATION } : {};
async function one(measured) {
  const started = performance.now();
  let response;
  try {
    response = await fetch(`${base}${endpoint}`, { method: "GET", headers, signal: AbortSignal.timeout(Number(process.env.AUDIT_TIMEOUT_MS || 30000)) });
    await response.arrayBuffer();
    return { measured, ok: response.ok, status: response.status, ms: performance.now() - started, bytes: Number(response.headers.get("content-length") || 0) };
  } catch (error) {
    return { measured, ok: false, status: "NETWORK_ERROR", ms: performance.now() - started, bytes: 0, error: error.name };
  }
}
for (let i = 0; i < warmup; i += 1) await one(false);
const samples = [];
let next = 0;
await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, async () => {
  while (next < requests) { next += 1; samples.push(await one(true)); }
}));
const ms = samples.map((sample) => sample.ms).sort((a, b) => a - b);
const pct = (fraction) => ms.length ? ms[Math.min(ms.length - 1, Math.ceil(ms.length * fraction) - 1)] : null;
const summary = { generatedAt: new Date().toISOString(), base, endpoint, method: "GET", warmup, requests, concurrency, minMs: ms[0] ?? null, avgMs: ms.length ? ms.reduce((sum, value) => sum + value, 0) / ms.length : null, p50Ms: pct(.5), p95Ms: pct(.95), p99Ms: pct(.99), maxMs: ms.at(-1) ?? null, unexpectedErrorCount: samples.filter((sample) => !sample.ok).length, sampleCount: samples.length, status: "MEASURED — compare only with same environment, data, and cache state" };
const destination = path.join(root, "performance-audit", "raw-timing-samples.jsonl");
fs.appendFileSync(destination, samples.map((sample) => JSON.stringify({ ...sample, endpoint, method: "GET", concurrency })).join("\n") + "\n");
console.log(JSON.stringify(summary, null, 2));
