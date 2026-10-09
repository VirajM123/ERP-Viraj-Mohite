import { randomUUID } from "node:crypto";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";

const sampleLimit = 10_000;
const durations = [];
const eventLoop = monitorEventLoopDelay({ resolution: 20 });
eventLoop.enable();
let requests = 0;
let errors = 0;
let sampleIndex = 0;
let previousCpu = process.cpuUsage();
let previousTime = performance.now();

const percentile = (values, fraction) => values.length
  ? Math.round(values[Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)] * 10) / 10
  : 0;

export function observeRequest(req, res, next) {
  const started = performance.now();
  const suppliedId = String(req.headers["x-request-id"] || "");
  const requestId = /^[A-Za-z0-9._:-]{1,128}$/.test(suppliedId) ? suppliedId : randomUUID();
  res.setHeader("X-Request-Id", requestId);
  res.once("finish", () => {
    const latencyMs = performance.now() - started;
    durations[sampleIndex % sampleLimit] = latencyMs;
    sampleIndex += 1;
    requests += 1;
    if (res.statusCode >= 500) errors += 1;
    console.log(JSON.stringify({ event: "http_request", requestId, method: req.method,
      route: req.route?.path || req.path, status: res.statusCode,
      latencyMs: Math.round(latencyMs * 10) / 10 }));
  });
  next();
}

const interval = setInterval(() => {
  const now = performance.now();
  const cpu = process.cpuUsage(previousCpu);
  const elapsedMs = now - previousTime;
  previousCpu = process.cpuUsage();
  previousTime = now;
  const sorted = durations.slice().sort((a, b) => a - b);
  const memory = process.memoryUsage();
  console.log(JSON.stringify({ event: "process_metrics", periodMs: Math.round(elapsedMs),
    requests, errors, p50Ms: percentile(sorted, 0.50), p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99), cpuMs: Math.round((cpu.user + cpu.system) / 1000),
    rssBytes: memory.rss, heapUsedBytes: memory.heapUsed,
    eventLoopLagP95Ms: Math.round(eventLoop.percentile(95) / 1e6 * 10) / 10 }));
  durations.length = 0;
  requests = 0;
  errors = 0;
  sampleIndex = 0;
  eventLoop.reset();
}, 60_000);
interval.unref();
