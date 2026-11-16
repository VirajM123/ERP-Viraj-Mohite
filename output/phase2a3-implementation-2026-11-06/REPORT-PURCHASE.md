# Phase 2A.3 — Purchase financial-period integration — 6 November 2026

Bounded guard integration completed in the existing isolated `checkout`. Unactivated; not production ready. Reviewed VERIFIED-INVENTORY.md, REPORT-CONTROLLED-TRANSACTIONS.md, REPORT-JOURNAL-VOUCHER.md, financialPeriods.js, accounting.js, purchase routes, stock resolution/movement, counters, transaction commit and audit helpers. PURCHASE-WRITER-MATRIX.md was written before the application edit (verified by preservation evidence).

## Routes and files

Only existing application file changed: `checkout/backend/server.js`.

- POST `/api/purchase`: validate proposed invoiceDate before latest-number lookup, counter increment, header, posting, audit and stock upserts.
- PUT `/api/purchase/:id`: validate stored invoiceDate, proposed invoiceDate and latest eligible original journal.documentDate before reversing old stock, applying new stock, updating header, reversing/reposting journal and writing audit.
- DELETE `/api/purchase/:id`: validate stored invoiceDate, existing current IST cancellation date and latest eligible original journal.documentDate before stock decrement, cancellation update, reversal, stock movement and audit. Capture IST date once for all effective-date uses; no change to the existing date policy. Existing missing-scope/not-found exits now explicitly abort their transaction.
- POST `/api/purchase/reconcile-desktop-import`: after existing identity/item-equivalence checks, validate persisted invoiceDate and existing reactivation posting/movement date before stock/batch updates, item identity repair, optional reactivation journal/movements, document save and audit. Missing stored invoiceDate fails closed. Active repair never had missing-journal creation; it still does not create a journal.

Added local `validatePurchasePeriods` and existing guard/Journal imports. Latest-event lookup matches reverseSourceJournal: tenant/source/id, descending postingVersion; validate original date only when latest event is POSTED and has no reversalOf. A missing journal or latest reversal retains the existing reversal no-op behavior. Repair performs no reversal, so it does not invoke original-journal reversal-date validation.

All four handlers catch session acquisition failures, abort only active acquired sessions, end acquired sessions and return guard status codes through existing success/message envelopes. New test file: `checkout/backend/test/purchase-periods.test.js`. Review incremental application changes in purchase.patch against server.purchase-baseline.js. No other existing source or test file changed.

## Mutation order and transaction analysis

See PURCHASE-WRITER-MATRIX.md for the precise pre-edit matrix. Existing manual startTransaction boundaries remain. All new snapshot reads and PeriodControl revision writes use the same active session as existing financial mutations. Product tax/reference reads before the guard are same-session reads; calculation changes before it are request-memory changes only. No counter, header, persisted stock/batch, allocation, journal or audit mutation precedes successful validation.

Create retains session-bound numbering. Edit retains reverse-old/add-new stock behavior, including temporary negative quantity allowance. Cancellation Stock.updateOne uses chained .session(session). resolveStockRowContext reads and helper upserts already use the caller session. recordStockMovements and writeAuditEvent receive it. No allocation mutation occurs in these routes. CLOSED, missing, incomplete, uncovered and invalid periods fail closed. No caller bypass is introduced.

Global /api authenticateApi and existing VOUCHERS/PURCHASE add/edit/delete middleware remain. The guard independently requires the authenticated principal and matches supplied tenant to req.auth. Header queries remain tenant scoped. Desktop supplied-number behavior remains guarded.

## Preserved policy and limitations

GST formulas, purchase pricing/discounts, inventory costing, quantity/batch keys, product identities, numbering rules, journal lines/versions/reversal links, audit payloads and permissions are unchanged. Journal services are byte-identical. Previous Phase 2A reversal/report corrections, Sales Service and Journal Voucher integrations are preserved.

Existing edit reversal and replacement posting both use proposed invoiceDate. Existing cancellation uses current businessDateIST. Cancelled desktop reactivation posts at the stored historical invoiceDate and restores stock at that date; active repair uses persisted invoiceDate as the authority for stock/rate/metadata repair. These are guarded existing dates, not a claim that every workflow now complies with A1 adjustment-date policy. Changing historical reactivation treatment or introducing explicit edit adjustment dates requires a separate business decision; that policy correction was not attempted. No new repair or history rewrite was introduced.

No transaction-architecture blocker was found for adding guards to these four existing transactions. Broader policy certification remains unresolved. No runtime bypass, transaction architecture redesign or new retry behavior was added.

Create has no idempotency-key lookup: ordinary create requests continue allocating numbers; supplied duplicate numbers rely on the existing unique index and 409 response. Repair preserves missing-row-only quantity behavior for active purchases, full quantity restoration on cancelled reactivation and rate/metadata/audit updates on repeated active repair. Cancellation repeat returns 404 without a second reversal. Existing commitTransactionReliably retries UnknownTransactionCommitResult up to three attempts. These routes do not retry entire transaction callbacks. No callback replay was added.

## Verification

`regression-purchase-final.tap`: **220 passed, 0 failed, 0 skipped, 0 cancelled, 0 TODO**. Includes all 167 selected baseline tests plus 53 Purchase tests. `node --check checkout/backend/server.js` passed.

Purchase tests evaluate actual extracted route handlers and local helper with the real financial-period validator. Model/session adapters simulate persistence. Coverage includes OPEN operations, CLOSED/missing/incomplete/uncovered denials, stored/proposed and latest-original dates, invalid proposed dates, cancellation date, repeat cancellation, active repair repeat and cancelled reactivation, tenant mismatch, bypass flags, desktop numbering, acquisition errors, simulated audit/commit failures and state restoration. Denial assertions check entire modeled state (documents, counter, stock, journals, audit, revision) plus absence of stock/counter calls. Permission middleware preservation is a static assertion, not a new runtime authorization test. Journal posting/reversal, stock movement, counter and tax services are mocked in the Purchase harness; their prior regression suites still pass, and their implementations are unchanged.

Baseline suites: financial-periods, phase2a-accounting, ledger-opening, opening-accounting, payment, debit-note-stock, p0-features, remediation, transaction-commit, opening-transactions, gst-reports, sales-service-periods and journal-voucher-periods.

Command from checkout/backend:

```powershell
node --permission --allow-fs-read=* --import ./test/phase1-isolation.mjs --test --test-isolation=none --test-reporter=tap test/financial-periods.test.js test/phase2a-accounting.test.js test/ledger-opening.test.js test/opening-accounting.test.js test/payment.test.js test/debit-note-stock.test.js test/p0-features.test.js test/remediation.test.js test/transaction-commit.test.js test/opening-transactions.test.js test/gst-reports.test.js test/sales-service-periods.test.js test/journal-voucher-periods.test.js test/purchase-periods.test.js
```

These are simulated rollback tests, not real MongoDB rollback proof. No database/network/server access occurred under the isolation preload and Node read-only permission mode. Real replica-set rollback, concurrent purchase edits/cancellations, unique-index duplicate races, repair quantity races, commit ambiguity and period-transition contention remain unverified. Purchase HTTP/JWT/grant enforcement, real stock/batch writes and duplicate-create index behavior were not exercised end to end. Existing transaction-commit tests cover the shared commit retry helper; no new Purchase callback-retry test is claimed because these routes have no callback retries. Full backend suite was not run.

Initial evidence is retained: purchase-initial.tap contains a test syntax defect; purchase-second.tap had 37 passes and one harness context redeclaration failure on a repeat invocation. Correcting the harness led to the final passing run; application behavior was not weakened. An initial test-writing command used an incorrect relative path and created no file.

## Preservation and remaining work

purchase-baseline-hashes.json captures 345 isolated checkout files before edits. purchase-initial-working-tree.diff captures the original existing tracked diff. purchase-preservation.json confirms only isolated backend/server.js differs among captured files; all 343 captured original working-tree files still match. All prior test files, service.js, p0Features.js, financialPeriods.js, accounting.js, openingBalances.js and src/api/config.js match the immediate baseline. Added evidence/report/test files are scoped to this output directory. No reset, stash, clean, commit, push, deployment, activation, migration, historical record edit, dependency install, UI/performance work or Phase 2B occurred.

Remaining unguarded groups: sales and F4; payment/receipt allocations; debit/credit notes; cheque/PDC/contra/collection vouchers; account openings/history/allocation helpers; stock adjustments/valuation/batch rate/lock writers; load/settlement/generated receipts; import rollback/compensation and optional-session shared journal callers. VERIFIED-INVENTORY.md remains the route-level inventory; its Purchase classification is now implemented as described here. Import dispatch to these Purchase routes inherits guard enforcement, while batch rollback/compensation remains a separate blocked group.

Recommended next bounded group: debit-note create/edit/cancellation, after reviewing stored/proposed VDate, selected original journal date, IST cancellation date and referenced purchase return constraints. Allocation/opening and other architecture/date decisions require separate approval.

Production activation prerequisites: enforce all remaining writers; approve unresolved effective-date policies and tenant schedules; verify replica-set support and deployed PeriodControl, Purchase, counter, journal and stock-movement indexes; run real MongoDB rollback/concurrency/retry/period-transition and authenticated HTTP/import tests; certify reconciliation and obtain explicit activation approval. Closure gates remain UNKNOWN and unchanged. Do not activate this partial checkout.

Stopped after this bounded Purchase guard integration.
