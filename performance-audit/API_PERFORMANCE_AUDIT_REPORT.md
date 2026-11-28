# API Performance Audit Report

## Result

Static inventory completed for **283 unique method + path endpoints** at repository revision recorded in `environment.md`. No endpoint has a measured latency classification: all are **NOT TESTED/BLOCKED**, not fast or slow. This is deliberate—there is no running disposable database/service, the documented MongoDB executable is absent, and no safe credentials or representative sanitized dataset were supplied.

## Coverage

| Measure | Count |
|---|---:|
| Unique endpoints inventoried | 283 |
| Measured endpoint scenarios | 0 |
| Blocked/unmeasured endpoint scenarios | 283 |
| Measurement coverage | 0% |
| Very fast / fast / acceptable / slow / very slow / critical | 0 / 0 / 0 / 0 / 0 / 0 |
| Existing isolated unit tests | 260 passed |

The inventory includes routes declared in mounted routers and direct application routes. It does not claim route reachability beyond static source resolution; client use is a textual cross-reference and may miss dynamically constructed URLs. Dynamic `/:param` routes remain parameterized.

## Environment and safety

- Repository revision: see `environment.md`; pre-existing modified files were not changed.
- Node.js: see `environment.md`. Express/Mongoose versions are recorded there.
- No production connection was attempted, and no environment variable values, credentials, tokens, or customer data are present in this audit.
- No writes, index changes, cache changes, process configuration changes, or schema changes were made.
- The existing backend suite passed under its network/database isolation harness. It validates behavior but is not an HTTP/DB performance benchmark.

## Measurement blocker

The repository documents a disposable integration setup requiring `C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe`, a loopback MongoDB service, two API processes, and synthetic fixtures. On this workstation the executable is absent and ports 27991/5101/5102 were not listening. Consequently, launching the application would either fail or risk using the configured non-disposable URI, which was not permitted. The missing inputs for a complete audit are: (1) a disposable/staging MongoDB service, (2) sanitized representative fixture data and tenant/role credentials, and (3) an approved load envelope.

## Source-backed hotspot verification queue

These are **suspected**, not measured slow APIs. They are listed because their current source shape can scale with data volume; do not treat them as latency findings or apply a fix before profiling.

### `/api/p0/reports/credit-control`

- Source: `backend/p0Features.js:1281`
- Observation: Two unbounded tenant reads followed by per-account in-memory filtering.
- Collections/models seen in route body: Account; Sales.
- Verification: Capture collection counts and an executionStats plan; benchmark a tenant with realistic account and sales cardinality.
- Safeguard: keep tenant filters and financial/inventory consistency rules unchanged; test only on isolated sanitized data.

### `/api/p0/reports/permission-audit`

- Source: `backend/p0Features.js:1274`
- Observation: Unbounded security-record read and in-memory permission expansion.
- Collections/models seen in route body: Security.
- Verification: Measure response bytes, heap, event-loop delay, and p95 with a large user/permission set.
- Safeguard: keep tenant filters and financial/inventory consistency rules unchanged; test only on isolated sanitized data.

### `/api/p0/reports/account-ledger`

- Source: `backend/accountLedger.js:50`
- Observation: Unbounded journal retrieval plus cross-collection document/name hydration.
- Collections/models seen in route body: Journal.
- Verification: Run executionStats for journal and referenced-document queries with a representative date range.
- Safeguard: keep tenant filters and financial/inventory consistency rules unchanged; test only on isolated sanitized data.

### `/api/p0/dashboard/summary`

- Source: `backend/p0Features.js:1293`
- Observation: Multi-collection aggregate fan-out.
- Collections/models seen in route body: Account; CreditNote; DamageStock; DebitNote; Load; Payment; Product; Purchase; Receipt; Sales; Stock.
- Verification: Record individual aggregate durations, plans, pool wait, and response serialization time under warm and loaded reads.
- Safeguard: keep tenant filters and financial/inventory consistency rules unchanged; test only on isolated sanitized data.

## Existing observability gap

`backend/observability.js` records whole-request latency, process CPU/memory, and event-loop lag. It does not attribute time to authentication, validation, controller, MongoDB operation/pool wait, external calls, or serialization. During the approved measurement phase, add temporary isolated correlation/timing instrumentation or use APM/profiler traces; remove it afterward if not adopted.

## How to complete the blocked measurements

1. Provision the documented loopback disposable MongoDB service or a dedicated staging database with sanitized representative data. Do not point `MONGODB_URI` at production.
2. Start a single test API with an explicit disposable URI, synthetic JWT secret, explicit CORS origin, and a non-production port. Create valid least-privilege credentials for each role.
3. Run the included read-only health benchmark first, then benchmark individually authorized GET scenarios using an approved request manifest. Keep writes to isolated fixtures and clean them up.
4. For each important database query, capture `explain("executionStats")`, deployed index lists, collection stats, and application/DB correlation timings.
5. Repeat warm runs three times: 10-request warm-up excluded, at least 100 samples for safe reads, then controlled 5/10/25/50 concurrency only after capacity approval. Stop at >2% unexpected error rate, integrity failure, or saturation.

## Proposed next steps requiring approval

- Supply or authorize installation/use of a disposable MongoDB 8.2 service and sanitized fixtures.
- Supply the permitted benchmark role/tenant matrix and staging capacity limits.
- Approve temporary request/DB timing instrumentation in the isolated environment.
- After measurements, produce actual latency bands, per-endpoint plans for measured slow APIs, and only then request approval for any remediation.

## MongoDB and infrastructure evidence boundary

Source declares tenant-oriented indexes for sales, purchase, receipt, stock movement, journals, and master data. Declarations do not prove a deployed database has those indexes, that their field order serves live query shapes, or that write overhead is acceptable. With no safe running database, this audit did not run getIndexes, collStats, profiler capture, explain("executionStats"), replica-lag checks, pool-contention checks, or cache-hit analysis. No index, cache, replica, RAM/CPU, connection-pool, or sharding recommendation is justified yet.
