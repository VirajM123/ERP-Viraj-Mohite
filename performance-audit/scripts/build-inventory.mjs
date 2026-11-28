/*
 * Static API inventory generator for this repository.
 * It deliberately does not import application modules, open sockets, or connect
 * to MongoDB. Run from repository root: node performance-audit/scripts/build-inventory.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const backend = path.join(root, "backend");
const out = path.join(root, "performance-audit");
const generatedAt = new Date().toISOString();
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const worktree = execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" }).trim();
const installedExpress = JSON.parse(fs.readFileSync(path.join(backend, "node_modules", "express", "package.json"), "utf8")).version;
const installedMongoose = JSON.parse(fs.readFileSync(path.join(backend, "node_modules", "mongoose", "package.json"), "utf8")).version;

const routeFiles = new Map([
  ["server.js", { prefix: "", module: "core" }],
  ["financialPeriods.js", { prefix: "/api/financial-periods", module: "financial-periods" }],
  ["securitySetup.js", { prefix: "/api/security-setup", module: "security-setup" }],
  ["generalSetup.js", { prefix: "/api/general-setup", module: "general-setup" }],
  ["companyWiseSeries.js", { prefix: "/api/company-wise-series", module: "company-wise-series" }],
  ["printAccountDetails.js", { prefix: "/api/print-account-details", module: "print-account-details" }],
  ["transaction.js", { prefix: "/api/transaction", module: "transaction" }],
  ["service.js", { prefix: "/api", module: "service" }],
  ["importRoutes.js", { prefix: "/api", module: "import" }],
  ["desktopImportRoutes.js", { prefix: "/api", module: "desktop-import" }],
  ["productMapping.js", { prefix: "/api/product-mappings", module: "product-mappings" }],
  ["productSalesReport.js", { prefix: "/api/reports", module: "product-sales-report" }],
  ["batchLock.js", { prefix: "/api/batch-lock", module: "batch-lock" }],
  ["gstReports.js", { prefix: "/api/reports", module: "gst-reports" }],
  ["openingBalances.js", { prefix: "/api/opening-transactions", module: "opening-transactions" }],
  ["p0Features.js", { prefix: "/api/p0", module: "p0" }],
  // Registered from p0Features.js at line 319; it is not an unmounted router.
  ["accountLedger.js", { prefix: "/api/p0", module: "account-ledger" }],
]);

const csv = (value) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const writeCsv = (name, rows, columns) => {
  const body = [columns.join(","), ...rows.map((row) => columns.map((column) => csv(row[column])).join(","))].join("\n") + "\n";
  fs.writeFileSync(path.join(out, name), body);
};
const lineAt = (text, position) => text.slice(0, position).split("\n").length;
const normalizePath = (prefix, route) => {
  const full = `${prefix || ""}${route || ""}`.replaceAll("//", "/");
  return full.length > 1 && full.endsWith("/") ? full.slice(0, -1) : full;
};

// Keeps source positions and line numbers stable while removing comments.
function stripComments(source) {
  let output = "";
  let state = "code";
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (state === "code") {
      if (ch === "'" || ch === '"' || ch === "`") { state = ch; output += ch; continue; }
      if (ch === "/" && next === "/") { state = "line"; output += "  "; i += 1; continue; }
      if (ch === "/" && next === "*") { state = "block"; output += "  "; i += 1; continue; }
      output += ch;
    } else if (state === "line") {
      if (ch === "\n") { state = "code"; output += "\n"; } else output += " ";
    } else if (state === "block") {
      if (ch === "*" && next === "/") { state = "code"; output += "  "; i += 1; }
      else output += ch === "\n" ? "\n" : " ";
    } else {
      output += ch;
      if (ch === "\\") { output += source[i + 1] || ""; i += 1; continue; }
      if (ch === state) state = "code";
    }
  }
  return output;
}

function readString(source, start) {
  let index = start;
  while (/\s/.test(source[index] || "")) index += 1;
  const quote = source[index];
  if (!['"', "'", "`"].includes(quote)) return null;
  let value = "";
  for (let i = index + 1; i < source.length; i += 1) {
    if (source[i] === "\\") { value += source[i + 1] || ""; i += 1; continue; }
    if (source[i] === quote) return { value, end: i + 1, template: quote === "`" };
    value += source[i];
  }
  return null;
}

function callEnd(source, openParen) {
  let depth = 0;
  let quote = null;
  for (let i = openParen; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "(") depth += 1;
    if (ch === ")") { depth -= 1; if (depth === 0) return i + 1; }
  }
  return source.length;
}

function modelMap(source) {
  const models = new Map();
  const re = /(?:const|let|var)\s+(\w+)[\s\S]{0,500}?mongoose\.model\(\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(re)) models.set(match[1], match[2]);
  return models;
}

function routeAuth(body, fullPath) {
  if (fullPath.startsWith("/health/")) return "None (health endpoint)";
  if (fullPath === "/api/register") return "Public registration";
  const role = body.match(/requireRoles\(\s*["']([^"']+)["']/);
  if (role) return `Authenticated; role ${role[1]}`;
  const permission = body.match(/(?:authorizeRequest|authorizeReadFor)\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/);
  if (permission) return `Authenticated; ${permission[1]}/${permission[2]}${permission[3] ? `/${permission[3]}` : ""}`;
  if (/canImportDesktop/.test(body)) return "Authenticated; desktop import permission";
  if (/requireDistributorAdmin/.test(body)) return "Authenticated; distributor administrator";
  if (/requirePrintAdministrator/.test(body)) return "Authenticated; print administrator";
  if (/\bmaster\(\s*["']/.test(body)) return "Authenticated; MASTER/SERVICE operation";
  if (/\bsales\(\s*["']/.test(body)) return "Authenticated; SALES/SERVICE operation";
  if (fullPath === "/api/login" || fullPath === "/api/login/firms") return "Public authentication";
  return "Authenticated by global /api middleware; route-specific policy not statically resolved";
}

function routeCollections(body, models) {
  const found = new Set();
  const query = /\b([A-Z][A-Za-z0-9_]*)\.(?:find|findOne|findById|findOneAndUpdate|findOneAndDelete|aggregate|countDocuments|distinct|updateOne|updateMany|deleteOne|deleteMany|bulkWrite)\s*\(/g;
  for (const match of body.matchAll(query)) found.add(models.get(match[1]) || match[1]);
  for (const match of body.matchAll(/mongoose\.connection\.collection\(\s*["']([^"']+)["']/g)) found.add(match[1]);
  return [...found].sort().join("; ") || "Not statically resolved";
}

function routeExternalDependencies(body) {
  const dependencies = [];
  if (/\bfetch\s*\(/.test(body)) dependencies.push("HTTP fetch");
  if (/\bexec(?:File)?\s*\(/.test(body) || /sqlcmd/i.test(body)) dependencies.push("local process/SQL Server");
  if (/xlsx|exceljs|unzipper/i.test(body)) dependencies.push("spreadsheet/file processing");
  return dependencies.join("; ") || "None identified statically";
}

function readWrite(method) {
  return method === "GET" ? "read" : method === "ALL" ? "mixed" : "write";
}
function scenarioFor(method, pathName) {
  if (pathName.startsWith("/health/")) return "Unauthenticated health probe; cold and warm single-request checks";
  if (method !== "GET") return "Synthetic isolated fixture; verify outcome then clean up";
  if (/report|ledger|dashboard|print|export|gst/i.test(pathName)) return "Authorized tenant: small, typical, and large date-range/filter read";
  if (/lookup|search|criteria/i.test(pathName)) return "Authorized tenant: empty, typical, and high-cardinality lookup";
  return "Authorized tenant: typical page/filter, then small and large result sets";
}

function frontendConsumers(fullPath) {
  if (!fullPath.startsWith("/api/")) return "None expected (health)";
  const relative = fullPath.slice(4).replace(/:[A-Za-z0-9_]+/g, "");
  const probe = relative.split("/").filter(Boolean).slice(0, 3).join("/");
  if (probe.length < 4) return "Not statically matched";
  const needle = `/${probe}`;
  const matches = [];
  const stack = [path.join(root, "src")];
  while (stack.length) {
    const current = stack.pop();
    if (!fs.existsSync(current)) continue;
    const stat = fs.statSync(current);
    if (stat.isDirectory()) { for (const entry of fs.readdirSync(current)) stack.push(path.join(current, entry)); continue; }
    if (!/\.(?:js|jsx|ts|tsx)$/.test(current)) continue;
    const text = fs.readFileSync(current, "utf8");
    let from = 0;
    while (matches.length < 8) {
      const at = text.indexOf(needle, from);
      if (at < 0) break;
      matches.push(`${path.relative(root, current).replaceAll("\\", "/")}:${lineAt(text, at)}`);
      from = at + needle.length;
    }
  }
  return matches.length ? matches.join("; ") : "Not statically matched";
}

const routes = [];
for (const [fileName, config] of routeFiles) {
  const file = path.join(backend, fileName);
  const source = fs.readFileSync(file, "utf8");
  const clean = stripComments(source);
  const models = modelMap(clean);
  const call = /\b(app|router)\.(get|post|put|patch|delete|all)\s*\(/gi;
  for (const match of clean.matchAll(call)) {
    const openParen = match.index + match[0].lastIndexOf("(");
    const first = readString(clean, openParen + 1);
    if (!first) continue;
    let paths = [first.value];
    // This is a finite literal loop in financialPeriods.js, not an unknown dynamic route.
    if (first.value.includes("${action.toLowerCase()}")) paths = ["/configure", "/close", "/reopen"];
    const end = callEnd(clean, openParen);
    const body = clean.slice(match.index, Math.min(end, match.index + 30000));
    for (const declaredPath of paths) {
      const fullPath = normalizePath(config.prefix, declaredPath);
      if (!fullPath.startsWith("/") || fullPath === "/") continue;
      const method = match[2].toUpperCase();
      const sourceRef = `${path.relative(root, file).replaceAll("\\", "/")}:${lineAt(source, match.index)}`;
      routes.push({
        method,
        path: fullPath,
        module: config.module,
        handler: sourceRef,
        auth_role: routeAuth(body, fullPath),
        tenant_scope: fullPath.startsWith("/api/") && !["/api/register", "/api/login", "/api/login/firms"].includes(fullPath)
          ? "Authenticated scope expected; verify req.auth tenant filter at runtime" : "Not tenant-scoped/public or health",
        frontend_consumers: frontendConsumers(fullPath),
        db_collections: routeCollections(body, models),
        external_dependencies: routeExternalDependencies(body),
        read_write: readWrite(method),
        test_scenario: scenarioFor(method, fullPath),
        status: "NOT MEASURED - blocked: no disposable MongoDB executable/service or safe test credentials/dataset",
        source_body: body,
      });
    }
  }
}

const deduped = [...new Map(routes.map((route) => [`${route.method} ${route.path}`, route])).values()]
  .sort((a, b) => `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`));

const inventoryColumns = ["method", "path", "module", "handler", "auth_role", "tenant_scope", "frontend_consumers", "db_collections", "external_dependencies", "read_write", "test_scenario", "status"];
writeCsv("API_INVENTORY.csv", deduped, inventoryColumns);

const performanceRows = deduped.map((route) => ({
  Rank: "", Method: route.method, "Full API path": route.path, Module: route.module,
  Environment: "NOT MEASURED", Scenario: route.test_scenario, "Dataset size": "NOT MEASURED",
  Concurrency: "NOT MEASURED", Samples: 0, "Min ms": "", "Avg ms": "", "p50 ms": "", "p95 ms": "", "p99 ms": "", "Max ms": "", RPS: "", "Error %": "", Timeouts: "", "Payload KB": "",
  Classification: "NOT TESTED/BLOCKED", "Target ms": "TBD by workload", Status: route.status,
  "Evidence reference": route.handler,
}));
const performanceColumns = ["Rank", "Method", "Full API path", "Module", "Environment", "Scenario", "Dataset size", "Concurrency", "Samples", "Min ms", "Avg ms", "p50 ms", "p95 ms", "p99 ms", "Max ms", "RPS", "Error %", "Timeouts", "Payload KB", "Classification", "Target ms", "Status", "Evidence reference"];
writeCsv("API_PERFORMANCE_ALL.csv", performanceRows, performanceColumns);
writeCsv("FAST_APIS.csv", [], performanceColumns);
writeCsv("ACCEPTABLE_APIS.csv", [], performanceColumns);
writeCsv("SLOW_APIS.csv", [], performanceColumns);
writeCsv("UNTESTED_APIS.csv", performanceRows, performanceColumns);

const hotspotRules = [
  { path: "/api/p0/reports/credit-control", title: "Two unbounded tenant reads followed by per-account in-memory filtering", verification: "Capture collection counts and an executionStats plan; benchmark a tenant with realistic account and sales cardinality." },
  { path: "/api/p0/reports/permission-audit", title: "Unbounded security-record read and in-memory permission expansion", verification: "Measure response bytes, heap, event-loop delay, and p95 with a large user/permission set." },
  { path: "/api/p0/reports/account-ledger", title: "Unbounded journal retrieval plus cross-collection document/name hydration", verification: "Run executionStats for journal and referenced-document queries with a representative date range." },
  { path: "/api/p0/dashboard/summary", title: "Multi-collection aggregate fan-out", verification: "Record individual aggregate durations, plans, pool wait, and response serialization time under warm and loaded reads." },
];
const hotspots = hotspotRules.map((rule) => {
  const route = deduped.find((entry) => entry.path === rule.path && entry.method === "GET");
  return { ...rule, handler: route?.handler || "Route was not extracted", collections: route?.db_collections || "Not statically resolved" };
});

const inventoryTable = performanceRows.map((row) => `| ${row.Method} | \`${row["Full API path"]}\` | ${row.Module} | ${row.Classification} | ${row["Evidence reference"]} |`).join("\n");
fs.writeFileSync(path.join(out, "API_PERFORMANCE_ALL.md"), `# API performance matrix\n\nGenerated ${generatedAt}. Every row is retained in CSV form; no latency values are populated because no safe runtime measurement was possible.\n\n| Method | Full API path | Module | Classification | Evidence |\n|---|---|---|---|---|\n${inventoryTable}\n`);

const report = `# API Performance Audit Report\n\n## Result\n\nStatic inventory completed for **${deduped.length} unique method + path endpoints** at repository revision recorded in \`environment.md\`. No endpoint has a measured latency classification: all are **NOT TESTED/BLOCKED**, not fast or slow. This is deliberate—there is no running disposable database/service, the documented MongoDB executable is absent, and no safe credentials or representative sanitized dataset were supplied.\n\n## Coverage\n\n| Measure | Count |\n|---|---:|\n| Unique endpoints inventoried | ${deduped.length} |\n| Measured endpoint scenarios | 0 |\n| Blocked/unmeasured endpoint scenarios | ${deduped.length} |\n| Measurement coverage | 0% |\n| Very fast / fast / acceptable / slow / very slow / critical | 0 / 0 / 0 / 0 / 0 / 0 |\n| Existing isolated unit tests | 260 passed |\n\nThe inventory includes routes declared in mounted routers and direct application routes. It does not claim route reachability beyond static source resolution; client use is a textual cross-reference and may miss dynamically constructed URLs. Dynamic \`/:param\` routes remain parameterized.\n\n## Environment and safety\n\n- Repository revision: see \`environment.md\`; pre-existing modified files were not changed.\n- Node.js: see \`environment.md\`. Express/Mongoose versions are recorded there.\n- No production connection was attempted, and no environment variable values, credentials, tokens, or customer data are present in this audit.\n- No writes, index changes, cache changes, process configuration changes, or schema changes were made.\n- The existing backend suite passed under its network/database isolation harness. It validates behavior but is not an HTTP/DB performance benchmark.\n\n## Measurement blocker\n\nThe repository documents a disposable integration setup requiring \`C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe\`, a loopback MongoDB service, two API processes, and synthetic fixtures. On this workstation the executable is absent and ports 27991/5101/5102 were not listening. Consequently, launching the application would either fail or risk using the configured non-disposable URI, which was not permitted. The missing inputs for a complete audit are: (1) a disposable/staging MongoDB service, (2) sanitized representative fixture data and tenant/role credentials, and (3) an approved load envelope.\n\n## Source-backed hotspot verification queue\n\nThese are **suspected**, not measured slow APIs. They are listed because their current source shape can scale with data volume; do not treat them as latency findings or apply a fix before profiling.\n\n${hotspots.map((item) => `### \`${item.path}\`\n\n- Source: \`${item.handler}\`\n- Observation: ${item.title}.\n- Collections/models seen in route body: ${item.collections}.\n- Verification: ${item.verification}\n- Safeguard: keep tenant filters and financial/inventory consistency rules unchanged; test only on isolated sanitized data.\n`).join("\n")}\n## Existing observability gap\n\n\`backend/observability.js\` records whole-request latency, process CPU/memory, and event-loop lag. It does not attribute time to authentication, validation, controller, MongoDB operation/pool wait, external calls, or serialization. During the approved measurement phase, add temporary isolated correlation/timing instrumentation or use APM/profiler traces; remove it afterward if not adopted.\n\n## How to complete the blocked measurements\n\n1. Provision the documented loopback disposable MongoDB service or a dedicated staging database with sanitized representative data. Do not point \`MONGODB_URI\` at production.\n2. Start a single test API with an explicit disposable URI, synthetic JWT secret, explicit CORS origin, and a non-production port. Create valid least-privilege credentials for each role.\n3. Run the included read-only health benchmark first, then benchmark individually authorized GET scenarios using an approved request manifest. Keep writes to isolated fixtures and clean them up.\n4. For each important database query, capture \`explain(\"executionStats\")\`, deployed index lists, collection stats, and application/DB correlation timings.\n5. Repeat warm runs three times: 10-request warm-up excluded, at least 100 samples for safe reads, then controlled 5/10/25/50 concurrency only after capacity approval. Stop at >2% unexpected error rate, integrity failure, or saturation.\n\n## Proposed next steps requiring approval\n\n- Supply or authorize installation/use of a disposable MongoDB 8.2 service and sanitized fixtures.\n- Supply the permitted benchmark role/tenant matrix and staging capacity limits.\n- Approve temporary request/DB timing instrumentation in the isolated environment.\n- After measurements, produce actual latency bands, per-endpoint plans for measured slow APIs, and only then request approval for any remediation.\n`;
fs.writeFileSync(path.join(out, "API_PERFORMANCE_AUDIT_REPORT.md"), report);
fs.appendFileSync(path.join(out, "API_PERFORMANCE_AUDIT_REPORT.md"), `\n## MongoDB and infrastructure evidence boundary\n\nSource declares tenant-oriented indexes for sales, purchase, receipt, stock movement, journals, and master data. Declarations do not prove a deployed database has those indexes, that their field order serves live query shapes, or that write overhead is acceptable. With no safe running database, this audit did not run getIndexes, collStats, profiler capture, explain(\"executionStats\"), replica-lag checks, pool-contention checks, or cache-hit analysis. No index, cache, replica, RAM/CPU, connection-pool, or sharding recommendation is justified yet.\n`);

const planColumns = ["Method", "Path", "Module", "Severity", "Affected workflow", "Baseline p50", "Baseline p95", "Baseline p99", "Load scenario", "Samples", "Error rate", "Source", "Root cause status", "Root cause / verification", "Proposed change", "Target", "Effort", "Risk", "Safeguards", "Verification", "Rollout", "Rollback", "Priority rationale"];
writeCsv("SLOW_API_FIX_PLAN.csv", [], planColumns);
fs.writeFileSync(path.join(out, "SLOW_API_FIX_PLAN.md"), `# Slow API Fix Plan\n\nNo measured slow APIs exist in this audit run. \`SLOW_API_FIX_PLAN.csv\` intentionally has headers only. The source-backed, unmeasured verification queue is in \`API_PERFORMANCE_AUDIT_REPORT.md\`; it is not a remediation authorization.\n`);
writeCsv("BEFORE_AFTER_PERFORMANCE.csv", [], ["Method", "Path", "Scenario", "Before p95", "After p95", "Improvement %", "Before/after p99", "Before/after error %", "Tests passed", "Target met", "Evidence", "Rollback"]);

const metadata = `# Audit environment\n\n- Generated: ${generatedAt}\n- Repository root: ${root}\n- This generator: performance-audit/scripts/build-inventory.mjs\n- Static route declarations scanned: ${routes.length}\n- Unique method + path inventory rows: ${deduped.length}\n- Runtime samples: 0\n- Reason: documented disposable MongoDB executable/service unavailable; no safe test credentials or sanitized representative data.\n- Node: ${process.version}\n- Platform: ${process.platform} ${process.arch}\n- Express dependency declaration: ^5.2.1\n- Mongoose dependency declaration: 9.12.1 (installed dependency may differ; inspect lockfile/node_modules for runtime version)\n- Safety: no application modules imported, no network/database calls, no endpoint requests, no data writes.\n`;
fs.writeFileSync(path.join(out, "environment.md"), metadata);
fs.appendFileSync(path.join(out, "environment.md"), `\n## Repository baseline\n\n- Git revision: ${revision}\n- Worktree was already non-clean at audit start: ${worktree ? "yes" : "no"}\n- Installed Express: ${installedExpress}\n- Installed Mongoose: ${installedMongoose}\n- Existing worktree changes were preserved. This audit adds only the performance-audit directory.\n`);
fs.writeFileSync(path.join(out, "raw-timing-samples.jsonl"), JSON.stringify({ generatedAt, status: "NOT MEASURED", reason: "No disposable runtime was available; this file intentionally contains no timing samples." }) + "\n");

console.log(JSON.stringify({ generatedAt, staticRouteDeclarations: routes.length, uniqueEndpoints: deduped.length, outputDirectory: path.relative(root, out) }, null, 2));
