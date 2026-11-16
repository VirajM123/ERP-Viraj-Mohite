# Phase 2A.3 — Controlled Sales Service transactions — 6 November 2026

Status: BOUNDED IMPLEMENTATION COMPLETE in the previously isolated checkout. Only the three approved Sales Service financial writers were changed. Not activated, not deployed and not production ready. The earlier REPORT.md remains the unchanged record of the previous stopped attempt; this report supersedes its implementation status for this bounded approval.

## Inventory completed before implementation

[VERIFIED-INVENTORY.md](VERIFIED-INVENTORY.md) classifies every one of the 134 prior candidates and documents transaction, effective-date, tenant, permission, mutation and indirect-helper dependencies. [verified-writer-inventory.json](verified-writer-inventory.json) records source hashes and route-specific authorization/mutation evidence. The inventory file was completed before the application edit (also checked in controlled-preservation-result.json).

| Baseline candidate classification | Count |
|---|---:|
| Safe to integrate using existing transaction boundaries | 13 |
| Requires an approved transaction-boundary change | 19 |
| Requires an accounting or effective-date business decision | 34 |
| Not a financial writer | 68 |
| Total | 134 |

The 19 transaction-change rows include the three Sales Service routes approved and implemented here. Categories describe the captured baseline; no other route is now claimed integrated. Where business policy and transaction changes are both required, the business-decision category takes priority and both dependencies are documented.

Independent review parsed all 270 top-level backend route registrations (including generated period-action registration) and 190 mutation sites, plus the extended-method company-series deletion. The remaining 136 routes are read routes without financial-helper mutations found in this checkout. Shared journal, counter, opening, stock, allocation, import dispatch/repair/rollback and callback writers were traced separately. Evidence: route-source-evidence.json, mutation-source-evidence.json, route-review.txt and coverage-cross-check.json. These record baseline source, so route anchors predate the small Sales Service expansion. The lexical 134-row list was not assumed exhaustive. This is completed static source coverage for the captured checkout, not proof of deployed/external writer coverage or runtime reachability.

Authentication context: server.js mounts authenticateApi globally for /api; it verifies the JWT and current principal/sessionVersion and rejects nested tenant mismatches. Routes additionally retain their existing grants. Inventory notes about body-derived tenant values do not imply that global tenant validation is absent. No permissions were changed.

## Exact application changes

Only `checkout/backend/service.js` changed against the captured 343-file baseline:

- Import the existing `validateFinancialOperation`.
- `voucherPayload(body, scope, session)`: pass session to native party/firm reads and the Service query. Calculation expressions and payload allow-list remain unchanged.
- POST `/sales-services`: authorized tenant check, startSession/withTransaction, same-session reference reads, guard, latest voucher read, existing numbering choice, and array-form create with that session. Response is sent after transaction completion.
- PUT `/sales-services/:id`: authorized tenant/ID checks, same-session persisted voucher lookup, guard on persisted original and cleaned proposed voucherDate, same-session reference reads, existing payload assignment and save. Voucher number, series and identity remain unchanged.
- DELETE `/sales-services/:id`: authorized tenant/ID checks, same-session persisted lookup, guard on stored voucherDate, then the same isActive=false soft-delete with session. Error handling returns the established success/message envelope and always ends an acquired session.

Routes are router-local and mounted under `/api`. The approved PUT/DELETE shorthand is implemented at the existing `/:id` endpoints; no new collection-level route was introduced. [sales-service.patch](sales-service.patch) is the incremental application diff against the captured baseline file, saved as service.baseline.js. No other backend application module, schema, counter helper, guard implementation or frontend file was edited.

New test file: `checkout/backend/test/sales-service-periods.test.js`. Other additions are review/test/report artifacts within this output directory. No dependency files were changed or installed.

## Before and after

| Operation | Before | After |
|---|---|---|
| Create | Reference reads, number floor/increment and document create had no shared session; no period guard. | All participating reads and writes use one active transaction. Guard precedes numbering and create. CLOSED/missing/uncovered/invalid dates deny before counter/document calls. Desktop supplied numbers retain their existing rule and still pass the guard. |
| Edit | Persisted lookup, reference reads and save were outside a transaction; no period guard. | Stored and proposed voucherDate must both pass the guard before document assignment/save. References and save share the active session. |
| Delete | Immediate tenant-scoped soft-delete without persisted date validation. | Load persisted active voucher, check its original voucherDate, then soft-delete in the same transaction. No cancellation date or journal is created. |

`withTransaction` supplies commit/abort and driver retry behavior; errors leave the callback without an application success response. Session cleanup runs in finally. The guard's PeriodControl revision write participates in the same transaction as number/document writes. No runtime enable flag, missing-configuration fallback or caller validation marker was added. This checkout must remain unactivated while other writers are unprotected.

## Preserved ERP logic and baseline

All pricing, GST selection/splitting/rounding, amounts, add/less handling, narration/metadata allow-list, numbering minimum/series/fiscal-year behavior, desktop-number behavior, sales grants and success response envelopes are retained. Edit still preserves the existing series/number; delete still only soft-deletes. No journal, reversal, stock movement, GST adjustment, opening-event change or historical rewrite was introduced. The guard adds the required fail-closed write eligibility and the approved transaction boundary.

`preimplementation-preservation.json`: 343 original and isolated files matched before edits. `controlled-preservation-result.json`: original 343 files still match; the only isolated baseline difference is backend/service.js. All other 342 isolated files match, including accounting.js, p0Features.js, openingBalances.js and src/api/config.js. service.baseline.js matches the captured original service hash. Baseline-hashes.json and baseline.diff were retained. Existing reversal/report/opening fixes and unrelated modifications are preserved.

The existing backend/node_modules junction continues to reference installed dependencies. No reset, stash, clean, commit or push was performed. A zero-length log from an initial wrong test output path was moved from checkout to empty-test-path-error.tap; it contained no application data. The initial command did not create the intended test file; the corrected command then created and tested it normally.

## Verification

Final `regression-sales-service-final.tap`: **117 passed, 0 failed, 0 cancelled, 0 skipped, 0 TODO**. This includes 48 new Sales Service tests and the same 69 previously selected regressions. The earlier 41-test Sales Service pass and intermediate 110-test combined pass are retained as sales-service-initial.tap and regression-sales-service.tap. No assertions in pre-existing tests were changed.

The new tests invoke the real Express route permission middleware/handler, real period validator and real numbering helper, with mocked Mongoose persistence/session adapters. They exercise:

1. OPEN create with same-session party/firm/service/latest-voucher reads, period revision, counter floor/increment, document create and commit-before-response.
2. CLOSED, missing configuration, uncovered and invalid/empty date denial; revision conflict.
3. No counter/document mutation calls on denial, and unchanged simulated committed state.
4. OPEN-to-OPEN, OPEN-to-CLOSED, CLOSED-to-OPEN and CLOSED-to-CLOSED edits; persisted series/number/identity and field allow-list retained.
5. Real SALES_SERVICE grant denial for add/edit/delete; missing authentication; supplied tenant mismatch; inability to edit/delete another tenant's persisted voucher.
6. OPEN soft-delete and CLOSED/missing/invalid persisted-date protection; invalid ID rejection before session start.
7. Simulated counter floor/increment, create, save, delete and commit failures; simulated rollback of period revision, counter and document state; session cleanup/start failure.
8. Simulated callback retry for all three operations, including fresh period validation and a single committed number/document result.
9. Desktop supplied-number preservation with period protection; invalid party/service references; edit reference failure after guard revision mutation.
10. Differential calculations against the captured baseline payload function for local/interstate/CST/IGST supply, multiple rows, rounding and add/less amounts.

Regressions: financial-periods, phase2a-accounting, ledger-opening, opening-accounting, payment, debit-note-stock, p0-features, remediation, transaction-commit, opening-transactions and gst-reports.

Exact final command, from `checkout/backend`:

```powershell
node --permission --allow-fs-read=* --import ./test/phase1-isolation.mjs --test --test-isolation=none --test-reporter=tap test/financial-periods.test.js test/phase2a-accounting.test.js test/ledger-opening.test.js test/opening-accounting.test.js test/payment.test.js test/debit-note-stock.test.js test/p0-features.test.js test/remediation.test.js test/transaction-commit.test.js test/opening-transactions.test.js test/gst-reports.test.js test/sales-service-periods.test.js
```

The approved preload denies network, database connections and HTTP listening; tests had filesystem read permission only. No app server was started. These are handler-level, mocked-persistence tests, not real HTTP/JWT transport tests and not MongoDB transaction verification. The commit-failure adapter models a definite failure and memory restoration; it does not prove behavior after an ambiguous real commit acknowledgment. No disposable or production database was used. Remaining failures: none in the selected suite; full backend suite and real database verification were not performed or claimed.

## Other writers and decisions left untouched

Separate architecture approval is needed for:

- Sales create: numbering is intentionally independent of its active document transaction (server.js:12633–12645). A guard only inside the document transaction would not make numbering atomic with denial/rollback.
- F4 sales bill type: SalesHeader and LoadHeader mutations lack a shared transaction.
- All cheque-bounce, PDC, contra and collection-voucher create/edit/delete writers: counter/document/status writes lack a common transaction.
- Shadowed legacy receipt POST and reachable non-POSTED receipt edit; the primary receipt POST remains the active earlier route.
- Legacy account-opening save(null), optional-session shared journal contracts and same-session caller context.
- Nontransactional legacy settlement/load repair writers, including GET load-transfer/load-bills, and import rollback ownership/compensation boundaries. Batch rate/lock source reads need a boundary change if that policy is classified as period-controlled.

Business/effective-date decisions remain for linked allocation source periods, credit-note references, opening summary/history/supersession, stock default/IST movement dates, batch rate/lock dates, load snapshots/generated settlement receipts and import compensation. The inventory gives per-route details. No date or posting policy was inferred to unblock those routes.

## Database, concurrency and release risks

Real replica-set transaction support, rollback, write conflicts, concurrent edits/deletes, callback retries, commit-result ambiguity and period-transition races remain unverified. The period revision write is intended to contend with period transitions in the same tenant control document; its actual behavior must be verified against MongoDB. Counter first-use upsert races may surface duplicate-key failures inside transactions; deployed unique indexes and retry outcomes require explicit verification. No concurrency or performance change was made.

Sales Service's existing unique tenant/series/voucherNo index, DocumentCounter's tenant/financial-year/type/series unique index and PeriodControl's tenant unique index must be present and valid. Schema declarations alone do not prove deployed indexes. Existing counter scope and Sales Service identity scope differ by financial-year inclusion; existing minimum-number behavior is deliberately preserved. No index provisioning or migrations ran.

The checkout has only three integrated writers. Production activation requires complete writer enforcement, approved tenant schedules, real MongoDB transaction/concurrency tests, deployed-index/replica-set checks, reconciliation certification and maintenance/activation approval. Closure gates remain UNKNOWN. Reads remain available; unconfigured tenants on a future enforced release must fail closed. No fallback to an unguarded release is proposed as an automatic operational rollback.

Recommended next bounded implementation group: the three journal-voucher routes, which already have suitable transaction boundaries and authoritative vDate fields. Approve that scope separately; validate persisted/proposed/latest-original/reversal dates before number/reversal/document mutation while retaining current reversal/idempotency semantics. Resolve allocation/opening policy in separate work.

Stopped after this bounded Phase 2A.3 implementation. No database connection, migration, schema provisioning, historical rewrite, deployment, production activation, commit, push, Phase 2B, performance optimization or UI redesign occurred.
