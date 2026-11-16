# Phase 2A implementation assessment — 6 November 2026

Status: PARTIAL IMPLEMENTATION; NOT READY FOR PRODUCTION SIGN-OFF.

Implemented bounded reversal selection and financial-event reporting fixes. Stopped transaction-date migration, opening-edit event migration and closed-period enforcement at the requested missing-dependency stop condition. No deployment, commit, push, database access or historical data repair was performed.

## Changed files and functions

| File | Function / change |
|---|---|
| backend/accounting.js | reverseSourceJournal: inspect the latest source event, return null if already reversed or a reversal, validate reversal date, reject dates before the original event, default an omitted date to the current IST business date |
| backend/p0Features.js | financialRows: include POSTED and REVERSED transaction events; retain POSTED-only behavior for legacy OPENING_BALANCE journals |
| backend/test/ledger-opening.test.js | Update one expected database filter to the new financial-event query; retain all balance assertions |
| backend/test/phase2a-accounting.test.js | New isolated service/report regression tests and deterministic persistence adapter |
| output/phase2a-2026-11-06/ | This report, before.json, preservation-result.json, syntax.log, regression.tap, phase1.tap and a query-adapter-compatible Phase 1 copy with its TAP results |

No journal schema or index declarations were changed. postBalancedJournal, openingBalance mutation logic and all transaction handlers remain unchanged.

## Defect and correction

Previously reverseSourceJournal selected the latest POSTED row, including reversal rows. A repeated cancellation could reverse a reversal. Reports excluded an original after its status changed to REVERSED, while retaining its opposite reversal. Editing then accumulated stale reversal movements instead of the intended replacement balances.

The latest source event now determines whether there is a posting left to reverse. A latest reversal or already reversed event produces no new journal. The existing reversalOf relationship and postingVersion sequence identify the affected event. Existing transaction/session boundaries and unique source/version index declarations are retained. Financial reports count original and reversal transaction events on their stored effective dates, irrespective of subsequent REVERSED status.

This is deliberately not a blanket removal of status filtering. Journal consumers found by repository search are posting/version allocation, source reversal, financialRows, opening source lookup and legacy opening supersession. Source lookup still selects an active non-reversal posting. OpeningTransaction and receipt/payment document status filters retain their operational purposes.

## Required examples

All after-results below were asserted using the actual exported services and financialRows with in-memory persistence. Before-results for the first four rows are from Phase 1. The last two before-results are derived from the original implementation for the same sequential edit chain, not measured against a database.

| Sequence | Before | After |
|---|---|---|
| Original 100 | Dr 100 | Dr 100 |
| Cancel original, independent scenario | Cr 100 | 0 |
| Edit 100 to 120 | Dr 20 | Dr 120 |
| Edit 120 to 140 | Cr 80 | Dr 140 |
| Cancel edited 140 | Cr 360, source-derived | 0 |
| Repeat that cancellation | Cr 80, source-derived; an extra journal | 0; no extra journal |

The tested edited chain retains six events: three postings and their three reversals. Reversal links are to posting IDs 1, 3 and 5. A repeated cancellation leaves six events. Tenant predicates prevent reversing another firm's posting.

March 15 posting of 100 / April 10 cancellation: March-end as-of balance is Dr 100; April-only movement is Cr 100; cumulative through April is zero. Tests use explicit effective dates. They do not establish that every HTTP handler now supplies the approved adjustment date.

## Opening balances and allocations

Inspected saveAccountWithOpenings, lookupOpeningSource, allocateOpening, releaseOpening, reverseOpeningAwareJournal, receipt reversal and payment edit/cancellation, plus financialRows. Genuine brought-forward openings post to OPENING_BALANCE; EXISTING rows reference a source document without another journal. Account openingBal is a summary. Allocation changes affect outstanding references rather than creating another opening movement.

Legacy opening edits/removals mark earlier OPENING_BALANCE journals REVERSED without posting an opposite event. Including those rows would double-count superseded opening amounts. Those rows therefore remain excluded, preserving the current correct cumulative opening behavior. Existing repeated saves, opening edit/clear, allocation release, allocated-row protections and mocked rollback tests pass. These tests do not prove effective-dated opening edit history; that migration is stopped.

reverseOpeningAwareJournal historically marks both sides of an opening-linked receipt/payment reversal REVERSED. Both transaction events are now visible to financialRows and cancel to zero. A focused test calls this actual wrapper and verifies repeated reversal creates no additional effect. Its persistence behavior was not changed. Its old POSTED-only explanatory comment describes the previous report behavior and is no longer a description of financialRows.

General/party ledgers still carry prior activity forward. Trial balance uses the same financial-event selection but retains its existing period filter. Cumulative trial balance with a supplied fromDate remains a known failed Phase 1 gate; no new period/as-of policy was silently imposed. Existing opening tests and event tests do not prove full GL/subledger/trial-balance reconciliation.

## Stopped portions and missing dependency

Repository searches found businessDate/financialYearFor and fiscal-year numbering in counters.js, but no persisted accounting period-close state or corresponding override authorization rules. No periods were assumed closed or open. No reopening, generalized adjustment workflow or invented permission was added.

The common reversal service rejects malformed dates and dates before its target event. Missing dates now default to the current IST date. However, several existing callers explicitly pass voucher/invoice dates: journal edit/cancellation, payment edit/cancellation, receipt reversal and sales/purchase/debit-note/credit-note edits. Those caller arguments still take precedence. Sales/purchase/note cancellation handlers that already use businessDateIST retain that behavior.

Changing all replacement journals to adjustment dates safely also requires validating the original period, the adjustment period and ordering before document/stock/allocation mutation. Those workflow changes, opening event migration and closed-period posting enforcement remain STOPPED pending a reliable period-state and authorization dependency. The patch therefore does not enforce the complete approved date/close policy. Do not deploy it as a completed Phase 2A release. A separate authorized adjustment document may be required for closed-period source documents; no existing compliant workflow was verified here. GST document dates and statutory treatment were not changed.

## Verification

- Focused and reviewed existing regression set: 57 passed, 0 failed, 0 skipped or TODOs (regression.tap). This includes 46 existing tests and 11 focused tests.
- Seven backend/application/test syntax checks: all passed (syntax.log).
- Original unchanged Phase 1 suite: 4 passed, 13 failed (phase1.tap). Its memory adapter cannot interpret the new $or/$ne query, so these raw counts do not isolate implementation defects.
- Phase 1 copy with only import resolution and mock $or/$ne support adjusted: 7 passed, 10 failed, no skips (phase1-compatible.tap). The three cancellation/edit correctness gates now pass. One failure asserts the obsolete cancellation bug. Nine failures remain outside this bounded patch: two business-policy candidates (free quantity, excess credit), combined discounts, three common posting validation gaps, bank classification, GST P&L classification and trial balance cutoff semantics. Assertions were not disabled.

Backend tests used the existing Phase 1 preload, --permission, --allow-fs-read=*, --allow-fs-write=output/phase2a-2026-11-06, --test, --test-isolation=none and TAP output. No backend server or dotenv configuration was executed. Socket and Mongoose denial probes passed in the final regression runs. No child-process/native-addon/worker permission was granted. The compatible Phase 1 copy additionally used --test-timeout=10000.

During preparation, relocating the Phase 1 copy under output initially resolved a second root-level Mongoose installation, causing its connection-denial probe to fail and its test process to remain open. That run was interrupted. The network-level preload still blocked socket connections; the probe URI was localhost, not production. The final copy explicitly imports the same backend Mongoose installation guarded by the preload, and its denial probes pass. No database was used. Python was unavailable for an initial test-file preparation command; preparation was completed using Node.

Reproduce focused and existing verification from repository root:

```powershell
node --permission --allow-fs-read=* --allow-fs-write=output/phase2a-2026-11-06 --import ./backend/test/phase1-isolation.mjs --test --test-isolation=none --test-reporter=tap backend/test/phase2a-accounting.test.js backend/test/ledger-opening.test.js backend/test/opening-accounting.test.js backend/test/payment.test.js backend/test/debit-note-stock.test.js backend/test/p0-features.test.js backend/test/remediation.test.js backend/test/transaction-commit.test.js backend/test/opening-transactions.test.js backend/test/gst-reports.test.js
```

## Preservation and remaining risk

SHA-256 comparison checked 316 pre-existing tracked/untracked files. Exactly three changed: accounting.js, p0Features.js and ledger-opening.test.js. All other pre-existing files, including src/api/config.js, Phase 1 files and review artifacts, retain identical bytes. New tests/evidence are listed above. No dependencies, environment files, schemas, indexes, unrelated UI, stock, GST, document numbering or API response contracts were edited.

No real database transaction/rollback, concurrent reversal, unknown commit recovery, deployed unique index, historical production journal integrity or authenticated browser flow was proven. Sequential retry safety is tested; concurrent safety still depends on existing transactions and the actual deployed unique source/version index. Historic malformed/repeated reversal chains are not repaired or reconciled by this patch. Report reads may now expose their existing arithmetic; no conclusion about affected record counts is possible without separately authorized read-only assessment. No performance claim is made for the changed report predicate.

Next step remains completing Phase 2A's blocked dependencies and workflows, not Phase 2B. Once Phase 2A is complete and reconciled, recommended Phase 2B is common per-line/tenant-owned active-account posting validation and an approved exact minor-unit policy, followed by combined-discount validation. Free-unit and excess-credit policies still need decisions. No Phase 2B work was started.
