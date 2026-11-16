# Phase 2A.3 implementation approval execution ? 6 November 2026

Status: STOPPED AT MANDATORY TRANSACTION-ARCHITECTURE BOUNDARY. No financial-writer integration delivered. Not production ready.

## Isolation and baseline

Created a separate local clone at checkout/ (HEAD 6761b66) without hardlinks. Overlaid all 343 captured tracked and nonignored untracked files byte-for-byte, preserving the existing Phase 2A and unrelated edits. baseline-hashes.json records those files; baseline.diff records the existing tracked changes against HEAD before preparation. No reset, stash, clean, commit or push occurred. The original application files and isolated baseline files have zero hash differences (preservation-result.json), including src/api/config.js. New files are confined to this output directory. The clone contains prior output artifacts as part of the preserved baseline.

The isolated backend/node_modules junction references the existing installed backend dependencies. Tests had filesystem read permission only and network/database denial; no dependency installation or dependency edit occurred. This checkout is unactivated and must not be started or deployed as a protected release.

## Verified stop condition and exact affected writers

The approval says: ?Stop if implementation requires? ?Unapproved transaction architecture changes.? It also requires retaining transaction boundaries and validating before document and numbering mutations in the same active transaction. The following financial document writers cannot meet those requirements within their current boundaries:

| Exact route/function | Verified behavior | Dependency and required correction |
|---|---|---|
| backend/service.js:225 POST /sales-services | voucherPayload reads tenant-scoped party, firm and service records without a session; nextDocumentNumber at 234 receives no session; SalesService.create at 236 receives no session. | Explicitly approve a transaction spanning source reads, period preflight, numbering and document creation. All participating reads/writes must receive that session; guard must precede the first counter mutation. |
| backend/service.js:241 PUT /sales-services/:id | Loads the stored voucher without a session; voucherPayload reads source records without a session; voucher.save at 248 receives no session. | Explicitly approve a transaction spanning persisted source snapshot, old/new voucherDate checks, reference reads and save. Preserve permissions, tax calculations and existing voucher series behavior. |
| backend/service.js:253 DELETE /sales-services/:id | Immediately soft-deletes via SalesService.findOneAndUpdate at 256 without a session or prior persisted-date preflight. | Explicitly approve a transaction with tenant-scoped persisted-voucher read, period preflight and soft-delete in the same session. Preserve soft-delete semantics; do not invent a cancellation posting/date. |

These route paths are router-local. createServiceRouter defines sales grants SALES/SALES_SERVICE add/edit/delete. requestTenant checks authenticated identity against supplied identity. voucherPayload resolves party, firm and service data; nextDocumentNumber (backend/counters.js:14) performs both counter-floor update and increment. Thus protecting only SalesService.create would still leave numbering mutated before denial. These are direct document writers even though they do not call the journal posting service.

The guard at backend/financialPeriods.js requires session.inTransaction(). Adding a call without changing these boundaries would reject every request without a transaction; a check in a separate transaction would not protect dependent writes. Neither is a valid integration. No bypass or new transaction boundary was implemented.

Additional inspected dependency: backend/openingBalances.js:96 saveAccountWithOpenings returns save(null) at 97 when openingTransactions is absent. Its transactional branch calls save(session) at 104 before loading prior opening records or deriving all opening dates. Direct Journal.updateMany supersession occurs at 135 and 143. allocateOpening at 176 mutates counters; releaseOpening at 186 lacks authenticated tenant context in its signature. These remain unintegrated; no opening history, date policy or transaction behavior was changed. A complete correction requires further caller and effective-date review, not a journal-only guard.

## Inventory and integration status

Mandatory stop was reached before application edits and before completing the 134-candidate semantic inventory. The prior route-candidates.json remains discovery evidence, not certified coverage. No claim of exhaustive direct/indirect writer coverage is made. The verified rows above supplement that discovery evidence; they do not replace a complete inventory.

Integrated routes/functions: none. All financial writers remain unintegrated, including sales, purchases, receipts, payments, vouchers, notes, openings, service invoices, stock/valuation writers, cheque/PDC transitions, import dispatch/repair/rollback and direct journal mutations identified in the previous inventory. Their complete per-route classification is unfinished. No partially guarded application was produced or activated.

Exact application changes/functions changed: none. Incremental application diff against captured baseline: empty. Existing reversal and report fixes preserved byte-for-byte.

## Verification

Final regression.tap: 69 tests passed, 0 failed, 0 cancelled, 0 skipped, 0 TODO. Ran the financial-period, phase2a-accounting, ledger-opening, opening-accounting, payment, debit-note-stock, p0-features, remediation, transaction-commit, opening-transactions and gst-reports suites from the isolated checkout using Node --permission --allow-fs-read=*, the existing phase1-isolation.mjs preload, --test --test-isolation=none and TAP output.

Initial regression-initial.tap: 57 passed and one test-file load failure because the isolated clone did not contain backend's installed jsonwebtoken dependency. After adding the dependency junction, the unchanged complete selected suite passed. The initial result is retained; no assertions were changed.

New integration tests: none because no integration was implemented. Existing tests use mocked dependencies and source assertions; they do not prove HTTP period enforcement, no mutation on route denial, real MongoDB transaction rollback/concurrency, deployed indexes or production authorization. No disposable database was authorized or used. The 69 passing tests are regression evidence only.

## Bounded next step

A separate approval would be needed to change transaction boundaries for these three Sales Service routes: include existing tenant-scoped source reads, guard, numbering and document writes in one MongoDB transaction, using persisted old/new voucherDate values without changing accounting dates, tax rules or permissions. That approval alone would not resolve other writer dependencies. Complete the verified inventory before any application edits and obtain separate decisions for any additional transaction or effective-date blockers found there.

Remaining business-policy decisions include source/reference-date handling for allocations, legacy opening correction/history semantics and effective dates where current writers do not provide an authoritative financial date. No decision was assumed.

Production activation still requires complete verified writer coverage, resolution of all blocked writers, approved tenant schedules, deployed unique-index and replica-set validation, real transaction and concurrency verification, reconciliation certification and maintenance/activation planning. Reads must remain available. Missing configuration on an enforced release must fail closed. No activation or runtime bypass was introduced. Closure gates remain UNKNOWN.

No database connection, server startup, migration, schema provisioning, deployment, activation, commit, push, historical rewrite or Phase 2B work occurred.
