# Phase 2A.2 foundation — 6 November 2026

Status: FOUNDATION IMPLEMENTED; FINANCIAL WRITE INTEGRATION INCOMPLETE; NOT PRODUCTION READY.

No database access, server startup, production migration, activation, commit, push or deployment occurred. Phase 2A.3 and Phase 2B were not started.

## Changed files and functions

| File | Change |
|---|---|
| backend/financialPeriods.js | New Acc_PeriodControl schema and unique tenant index declaration; validateSchedule; assessConfiguration; closureAssessment; createPeriodService assessment/configure/reopen/blocked-close operations; validateFinancialOperation transaction guard; authenticated API router |
| backend/securitySetup.js | Register accounting FINANCIAL_PERIOD_VIEW/CONFIGURE/CLOSE/REOPEN operations in the existing permission catalog. Existing default grants provide no ordinary-user accounting access. Existing admin-only grant management and audit remain unchanged. |
| backend/server.js | Register /api/financial-periods behind existing API authentication and ensureConnection. |
| backend/test/financial-periods.test.js | Twelve isolated foundation tests using model mocks and the actual permission engine. |
| output/phase2a2-2026-11-06/ | Report, baseline hashes, preservation results, regression TAP, syntax results. |

## Implemented behavior

Calendar-month periods use ISO civil dates and Asia/Kolkata, with April–March year labels from existing businessDate utilities. Leap dates, complete ordered coverage, unique month identities, gaps, overlaps and wrong fiscal labels are validated. Explicit coverage is bounded to 1,200 months. No schedule or status is inferred. Unsupported timezones fail validation.

Configuration requires authenticated tenant scope, stable actor ID, existing permission-engine authorization, active transaction, expected revision, reason and request key. Initial OPEN/CLOSED statuses come solely from the submitted approved tenant schedule; historical CLOSED configuration is an onboarding assertion, not evidence that reconciliation passed. Existing boundaries and statuses cannot be rewritten through configure; coverage can extend at the end. Reopen requires CLOSED state and a nonempty reason. There is no direct closed-period posting override.

State transitions and Sys_AuditEvent writes use the same supplied transaction. Audit snapshots include actor ID, tenant, reason, action, request key, revisions and schedule; audit timestamps come from the existing timestamped schema. Reopen stores transition actor/time/reason on the period. Audit failure propagates. Successful configure/reopen requests retain bounded idempotency outcomes; conflicting payloads reject. Capacity is 1,000 successful transition requests per control record; reaching capacity blocks further transitions pending a separately designed archival approach. Blocked close attempts are audited separately and do not consume successful-transition keys or change state. They may produce another audit on retry.

The new validateFinancialOperation checks every supplied affected date and tenant within an active transaction. Missing, malformed, uncovered or incomplete configuration fails closed; CLOSED dates reject. An OPEN result requires a conditional revision increment on the same tenant control record that configure/reopen updates. No trusted client validation flag exists. This is the shared serialization contract for later financial writer integration.

GET /api/financial-periods/assessment is read-only and requires VIEW. POST configure, close and reopen use service permissions and transaction wrappers. This router has no production execution evidence; it was registered by source edit only.

## Reconciliation gates

All six mandatory gates are UNKNOWN: journal balancing, document-to-ledger, party/cash/bank, stock, pending financial operations and GST. None is implemented as a passing check. Existing journal total validation and report arithmetic do not establish complete period reconciliation, so they are not promoted into closure certification. Every authorized close attempt is blocked and its assessment audited. No override can bypass this block. No data is repaired to satisfy a gate.

## Important integration boundary

Existing accounting.js and p0Features.js were already uncommitted and the request explicitly prohibited changing existing uncommitted files. They retain identical bytes. Consequently, existing postBalancedJournal calls, legacy opening writes, imports and transaction handlers DO NOT call the new guard. The existing application can still perform financial writes without period validation. The new guard itself blocks unconfigured writes, but application-wide fail-closed enforcement is NOT delivered or activated by this foundation. Do not treat router registration or a configured schedule as production activation.

Completing enforcement requires separately authorized edits to the already-modified common posting service and a full writer inventory/preflight integration. Each transaction must pass all affected dates before financial/document/stock/allocation mutation and use the same guard session. Direct journal writes, opening summary mutations and imports must be covered. This report does not claim that original-source period validation, adjustment-date workflows, future-date policy, separate adjustment documents or opening-event migration exists. Existing transaction-handler reversal dates remain unchanged as requested.

## Verification

regression.tap: 69 passed, 0 failed, 0 skipped, 0 TODO. This includes the unchanged 57-test Phase 2A regression set and 12 new foundation tests. Four changed/new application and test files pass node --check.

New tests cover tenant rejection before reads, monthly/leap/fiscal boundaries, malformed and missing schedules, OPEN revision increments, CLOSED/uncovered rejection, inactive session rejection, real permission-engine explicit delegation and close denial, configuration audit/idempotency, reopen reason/audit/stale revision, all missing gates blocking close, audit-error propagation and mocked stale guard conflicts. Existing reversal and opening regressions pass unchanged.

All execution used the Phase 1 network/database-denial preload and Node permission model; socket/Mongoose denial probes pass. No dotenv or backend/server.js execution occurred. Tests use deterministic model mocks. Audit failure propagation does NOT prove rollback; conditional revision mocks do NOT prove MongoDB transaction isolation, deployed indexes or close-versus-post concurrency. Real MongoDB rollback/write-conflict guarantees and authenticated HTTP execution remain unverified. Closure cannot be concurrency-certified while mandatory gates are unavailable.

Reproduce from repository root:

```powershell
node --permission --allow-fs-read=* --allow-fs-write=output/phase2a2-2026-11-06 --import ./backend/test/phase1-isolation.mjs --test --test-isolation=none --test-reporter=tap backend/test/financial-periods.test.js backend/test/phase2a-accounting.test.js backend/test/ledger-opening.test.js backend/test/opening-accounting.test.js backend/test/payment.test.js backend/test/debit-note-stock.test.js backend/test/p0-features.test.js backend/test/remediation.test.js backend/test/transaction-commit.test.js backend/test/opening-transactions.test.js backend/test/gst-reports.test.js
```

## Read-only assessment and dry-run migration plan

No tenant was assessed against live data. The read-only assessment endpoint reports configuration validity and unknown closure gates; it does not inventory financial records or certify tenant readiness.

Before production activation, obtain a separately authorized read-only tenant inventory covering earliest/latest effective dates, existing journal/document gaps, active imports/failed operations, legacy openings, deployed indexes and database transaction support. Prepare an explicit tenant-approved monthly coverage/status schedule with approval reference and reason. Validate that proposed payload offline using validateSchedule; assess its full date coverage against that inventory without writing records. Preserve document dates and existing journals/openings/stock/GST. Do not infer historic OPEN/CLOSED state.

Review the resulting dry-run inventory and schedule, projected blocks for uncovered dates, integration coverage and recovery procedure before activation approval. Prove rollback, duplicate creation, audit atomicity, stale revision retry and posting/transition conflicts against a separately authorized disposable MongoDB replica set. Build and verify all six reconciliation gates before enabling closure. Only after approval may configuration and indexes be provisioned under an explicit migration runbook; no production migration command was run or supplied here. Unconfigured tenants must be expected to lose affected write access when the future guard integration is activated.

## Preservation and next step

preservation-result.json compares every pre-existing tracked/untracked file against before.json. Only the previously clean server.js and securitySetup.js changed. All pre-existing uncommitted files and prior reports/tests retain their bytes, including accounting.js, p0Features.js, ledger-opening.test.js and src/api/config.js. No calculations, numbering, schema/index declarations for existing accounting entities, historical records or UI were changed.

Recommended next Phase 2A step: review this foundation and authorize the common posting/writer integration against the existing dirty accounting changes, with explicit adoption and rollback planning. Reconciliation implementation and disposable-database verification remain prerequisites for closure and production readiness. Stop here; no Phase 2A.3, Phase 2B or deployment is authorized by this work.
