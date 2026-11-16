# Phase 2A.3 — Journal Voucher integration — 6 November 2026

Bounded implementation complete in `output/phase2a3-implementation-2026-11-06/checkout`. Unactivated; not production ready. Baseline was the completed Sales Service checkout with 117 tests. Reviewed VERIFIED-INVENTORY.md, verified-writer-inventory.json and REPORT-CONTROLLED-TRANSACTIONS.md before changes.

## Routes and exact changes

Only existing application file changed in this step: `checkout/backend/p0Features.js`.

- Added existing `validateFinancialOperation` import and local `validateJournalVoucherPeriods(req, voucher, proposedDate, session)` helper. The helper selects the same tenant/source/latest postingVersion event as reverseSourceJournal, in the active caller session. It includes the original journal date when that event is a POSTED original eligible for reversal. Missing original journals and latest reversal events retain existing reversal no-op behavior; this step does not introduce repairs.
- POST `/api/p0/journal-voucher`: after existing idempotency lookup, validate proposed vDate before latest-number lookup, counter floor/increment, voucher create, posting and audit.
- PUT `/api/p0/journal-voucher/:id`: validate persisted vDate, proposed-or-persisted vDate and eligible latest original journal documentDate before reversal, editHistory assignment, voucher save, repost and audit.
- DELETE `/api/p0/journal-voucher/:id`: validate persisted vDate (also the reversal date) and eligible latest original documentDate before reversal, cancellation save and audit.
- All three handlers now catch session acquisition failures, end only acquired sessions and respect the guard's error.status alongside existing error.statusCode. Existing response envelopes remain.
- New test file: `checkout/backend/test/journal-voucher-periods.test.js` (50 tests). No pre-existing tests edited.

Read-only next-no/list and financial reports remain unchanged. Server mounts these routes at /api/p0. Desktop import dispatch targets these same handlers; desktop supplied-number behavior is retained and guarded. Import compensation/rollback remains its separate inventory group. Opening JOU lookup is read-only and was inspected; opening summary/allocation writers remain outside this scope.

Incremental patch against the actual isolated baseline: journal-voucher.patch. The ordinary git diff also contains pre-existing Phase 2A report fixes, so use this incremental patch to review this step.

## Transaction and date requirements confirmed before implementation

| Operation | Persisted date | Proposed/reversal date | Existing order and new preflight |
|---|---|---|---|
| Create | None for a new voucher; an idempotent existing result is returned without mutation | Request vDate for new voucher and posting; no reversal | Existing withTransaction: normalized balanced lines, tenant idempotency lookup, latest number, counter, voucher, journal, CREATE audit. Guard now precedes number/document/journal mutations. |
| Edit | Stored voucher.vDate plus selected latest eligible original journal.documentDate | Request vDate or stored vDate; same value used by reversal and repost | Existing withTransaction: persisted POSTED lookup, line validation, reversal event and original status update, history, voucher save, new posting, EDIT_REPOST audit. All dates checked before reversal/history/save. |
| Cancel | Stored voucher.vDate plus selected latest eligible original journal.documentDate | Stored vDate; request cancellation date remains ignored | Existing withTransaction: persisted POSTED lookup, reversal and original status update, voucher REVERSED metadata, REVERSE audit. All dates checked first. |

No transaction-boundary change. Every new read and guard revision write uses the existing active session. All existing counter, voucher, journal and audit writes already share it. No allocation writes occur in these handlers. Date guard checks fail closed for CLOSED, missing, incomplete, uncovered and malformed configuration/dates. No client validation flag or runtime bypass is used.

Permissions remain TRANSACTIONS/JOURNAL_VOUCHER add/edit/delete. Existing global authenticateApi validates JWT/current principal and supplied tenant mismatches; route middleware checks identity and grants before session acquisition. Queries and writes use req.auth tenant. No body tenant is used as authorization. New tests exercise the actual route permission middleware with mocked grant storage, not live JWT transport.

Edit/cancel keep existing reverseSourceJournal behavior: select latest event; never reverse a reversal; reject reversal dates before the original posting. No business date default or cancellation-date policy changed. postBalancedJournal still derives the next postingVersion and swaps debits/credits for reversal. Original entries remain with their original dates/lines and REVERSED status; reversalOf, subsequent postings, audit snapshots and editHistory remain intact. financialRows continues including reversed non-opening originals plus reversal events, while OPENING_BALANCE retains its legacy POSTED-only rule.

Create idempotency still returns the tenant's stored result before guard mutation, including when the requested date is now closed: this path performs no financial mutation. It retains existing pre-lookup line validation and does not introduce payload conflict rules. Number uniqueness/idempotency indexes and duplicate-key response remain unchanged. Edits retain existing repost-on-repeat semantics; no new edit idempotency contract. Repeated cancellation retains 404 and creates no second reversal. Driver withTransaction retry behavior remains; callback reruns reload persisted state and revalidate periods. No new application retries were added.

## Verification

Final `regression-journal-final.tap`: **167 passed, 0 failed, 0 skipped, 0 cancelled, 0 TODO**. This is the complete selected 117-test Sales Service baseline plus 50 new Journal Voucher tests, run together.

New coverage: OPEN create; CLOSED/missing/incomplete/uncovered/invalid date and revision conflict rejection; stored/proposed/latest original journal date protection; OPEN-to-OPEN edit; CLOSED-to-OPEN and OPEN-to-CLOSED denial; backward reversal-date rule; cancellation/repeated cancellation; original-date retention, opposite reversal lines, links, versions, number/history/audit retention; no financial mutation calls on period denial; desktop numbering; permission and missing-auth enforcement; cross-tenant persisted voucher isolation; client bypass flag rejection; duplicate create idempotency; session acquisition errors; simulated counter/create/post/save/audit/commit failures and rollback; callback retries for all three operations.

Existing suites: financial-periods, phase2a-accounting, ledger-opening, opening-accounting, payment, debit-note-stock, p0-features, remediation, transaction-commit, opening-transactions, gst-reports and sales-service-periods. These cover prior reversal/report and opening-balance compatibility.

Command from checkout/backend:

```powershell
node --permission --allow-fs-read=* --import ./test/phase1-isolation.mjs --test --test-isolation=none --test-reporter=tap test/financial-periods.test.js test/phase2a-accounting.test.js test/ledger-opening.test.js test/opening-accounting.test.js test/payment.test.js test/debit-note-stock.test.js test/p0-features.test.js test/remediation.test.js test/transaction-commit.test.js test/opening-transactions.test.js test/gst-reports.test.js test/sales-service-periods.test.js test/journal-voucher-periods.test.js
```

Tests invoke real handler, permission, guard, counter, posting, reversal and audit code with mocked Mongoose persistence and session adapters. Snapshot restoration and callback replay simulate rollback/retry; they do not prove MongoDB behavior. No real MongoDB tests were performed. The isolation preload denies connections, network and HTTP listening; no server, production database or disposable database was accessed. Real replica-set rollback, conflicts, concurrent edit/cancel, unique-index races, ambiguous commits and period-transition contention remain unverified. Full backend suite was not run.

Retained initial evidence: journal-initial.tap and journal-second.tap reflect test fixture defects (missing mocked grant read, then missing authenticated principal id); journal-third.tap passed the initial 40 focused tests. Test fixtures were corrected to match the established authenticated context; application checks were retained. No unresolved test failures remain in the selected final run.

## Preservation and remaining scope

journal-preservation.json confirms all 343 captured original working-tree files still match their hashes. Among 161 source/config files captured immediately before this step, only isolated backend/p0Features.js changed. Sales Service source, accounting.js and openingBalances.js remain byte-identical to this step's baseline. The incremental patch leaves financialRows and all prior reversal fixes intact. New test/report/evidence files are additions only. No commit, push, deployment, activation, migration, historical rewrite, dependency installation, GST/stock/pricing or unrelated workflow change occurred.

No unresolved accounting-policy or architecture blocker for these three Journal Voucher handlers. Existing inconsistent/missing journal behavior was preserved rather than repaired. Other groups retain their inventory blockers.

Remaining unguarded financial-writer groups include sales (create/edit/cancel and F4), purchase, receipts/payments and allocations, credit/debit notes, cheque/PDC/contra/collection vouchers, account openings/history/allocation helpers, stock adjustments/valuation/batch writers, load/settlement/generated receipts, import repair/rollback/compensation and optional-session shared journal callers. Only the three Sales Service and three Journal Voucher routes are claimed integrated; consult VERIFIED-INVENTORY.md for per-route classification.

Recommended next bounded group: purchase create/edit/cancellation and its existing transactional repair path, after confirming persisted/proposed invoiceDate, latest original journal date and existing IST cancellation date before numbering, stock and journal mutations. This is a recommendation only; no purchase implementation started. Allocation/opening policy and architecture approvals remain separate.

Production activation prerequisites: complete remaining writer enforcement; resolve inventory date/architecture decisions; approve tenant period schedules; verify replica-set transactions and deployed PeriodControl, voucher/idempotency, counter and journal unique indexes; run real MongoDB rollback/concurrency/retry/period-transition tests; verify authenticated HTTP/import paths and ambiguous commit behavior; perform reconciliation certification and obtain maintenance/activation approval. No index provisioning was performed. Closure gates remain UNKNOWN. Do not activate this partial checkout; reads remain available and future enforced writes must fail closed for unconfigured tenants.

Stopped at the requested bounded Phase 2A.3 group. No Phase 2B, performance work or UI redesign.
