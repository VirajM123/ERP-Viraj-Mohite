# Phase 1 regression assessment — 6 November 2026

Scope: tests, build and evidence only. No Phase 2 fixes, deployment or commit. Application business logic, dependency manifests, environment files, schemas and indexes were not edited. SHA-256 verification of 298 pre-existing tracked/untracked files found zero changes; see preservation-result.json. The pre-existing src/api/config.js edit and earlier review artifacts remain intact.

## Results

| Check | Result |
|---|---|
| Selected existing backend tests (9 files) | 46 passed, 0 failed |
| Dedicated Phase 1 regression suite | 17 tests: 5 passed, 12 failed; no skips or TODOs |
| Test/preload JavaScript syntax | Both files passed node --check |
| Frontend build | Passed in 25.63 seconds; large-chunk warning |

Build evidence: main JavaScript 3,462.66 kB minified / 1,019.99 kB gzip; CSS 1,338.12 kB / 189.59 kB gzip. These are emitted bundle sizes, not measured user latency. PowerShell formats Vite's stderr warning as NativeCommandError in the captured log; Vite completed successfully with its final built message.

Raw assertion details: regression.tap. Existing test results: existing-tests.tap. Build output: frontend-build.log. Failed assertions are deliberately active regression gates, not passing tests marked as known defects. Two failed policy candidates require business confirmation before their expected behavior becomes a specification. Passing characterization tests establish current behavior only.

## Existing behavior identified before tests

Read accounting.js, financialValidation.js, financialRows and the financial-report route in p0Features.js, plus the selected existing tests and relevant imports. Common posting checks aggregate totals; reversal changes the original to REVERSED and creates an opposite POSTED entry. Financial reports select POSTED only. The sales calculator adds paid and free quantities to charged quantity, validates discounts individually, then clamps commercial net/excess credit. Purchase gross excludes free units. Report classification uses account-code regex; only general/party ledgers request brought-forward rows.

The new harness calls the actual exported services and actual Express report handler with deterministic in-memory persistence adapters. It does not copy the financial calculator or reversal implementation. The mocks reproduce only the filters used in these fixtures; they do not emulate MongoDB transactions, validation, indexes or concurrency.

## Confirmed results and limits

| Issue | Observed result | Interpretation |
|---|---|---|
| Cancel sale Dr 100 | POSTED-only party balance Cr 100, expected zero | Confirmed service/report interaction defect |
| Edit 100 to 120 | Dr 20, expected Dr 120 | Confirmed defect |
| Repeated edit to 140 | Cr 80, expected Dr 140 | Confirmed defect |
| Paid 10 + free 2 at 100 | Gross 1,200, candidate expectation 1,000 | Behavior confirmed; uncharged-free/blended-rate policy requires approval |
| Discounts 80 + 80 against gross 100, GST 18 | Accepted; net 18 | Confirmed missing combined-discount rejection |
| Credit 150 against sale 100 | Net zero, no explicit remainder result | Behavior confirmed; reject versus advance/carry policy requires approval |
| Negative line, both-sided line | Both accepted when totals balance | Confirmed common posting validation gaps; mock does not test tenant/account existence |
| Debit 100, credit 99.995 | Accepted | Confirmed lack of exact minor-unit balancing |
| Numeric bank fixture 100201 | Omitted from bank book | Confirmed code-based filtering; bank classification is stipulated by fixture, not verified against a real chart |
| OUTPUT_GST control fixture | Included in P&L | Confirmed code-based filtering; no statutory conclusion |
| Trial balance with April start and March activity | Prior Dr 100 excluded | Confirmed period filter behavior conflicts with cumulative as-of expectation |

Passing new checks: isolation probes; normal balanced posting and aggregate rejection; cancellation characterization; calculator characterization; purchase free-unit and sales tax-split baseline. Existing passes cover ledger openings, opening saves/allocations and mock rollback, payment normalization, debit-note stock harness, journal normalization/stock consolidation, financial/security utility regressions, transaction commit retry logic, opening input validation and GST report fixtures. Their scope is unit/mocked/source-fixture verification, not production assurance.

## Isolation and reproduction

Backend runs used Node v24.16.0 with the test-only preload phase1-isolation.mjs, --permission, --allow-fs-read=*, --allow-fs-write=output/phase1-2026-11-06, --test and --test-isolation=none. No child-process, worker or native-addon permission was granted to backend tests. The preload blocks TCP socket connection, TLS connection, UDP send/connect, DNS lookup/resolve/SRV, server listen and Mongoose connect/createConnection/openUri before application modules load. Mongoose buffering, automatic collection creation and automatic indexing are disabled in the test process. Socket/Mongoose denial probes passed; the default Mongoose connection remained disconnected. A production database connection therefore cannot be opened through the reviewed JavaScript database/network paths, even if the shell contains production credentials. No database of any kind was used.

No backend server entrypoint or dotenv configuration was executed. Backend filesystem writes are restricted to this report folder. Models registering schema/index declarations in memory do not apply them to a database. This preload is a guard for these reviewed tests, not a general security sandbox for arbitrary hostile/native programs.

Commands from repository root:

```powershell
node --permission --allow-fs-read=* --allow-fs-write=output/phase1-2026-11-06 --import ./backend/test/phase1-isolation.mjs --test --test-isolation=none --test-reporter=tap backend/test/phase1-accounting.test.js
```

The same guarded command ran these existing files: ledger-opening, opening-accounting, payment, debit-note-stock, p0-features, remediation, transaction-commit, opening-transactions and gst-reports (all under backend/test with .test.js suffix). They were inspected before selection. Other existing test files were not run; the suite was deliberately bounded to reviewed modules and fixtures.

Frontend build command:

```powershell
node --import ./backend/test/phase1-isolation.mjs ./node_modules/vite/bin/vite.js build --outDir output/phase1-2026-11-06/frontend-build
```

The build uses existing installed dependencies and reviewed Vite configuration; it starts no application/server and executes no client API calls. Vite may read existing environment values for compilation but changes none. The network/database preload guards the Node build process. Vite/esbuild requires its normal local build subprocess, so backend filesystem/process permission restrictions were not applied to this separate build. The frontend artifact is local and may embed existing public Vite configuration; it has not been published.

## Coverage gaps and risks

No real database transaction/rollback, unknown commit recovery against a replica set, concurrent sale, duplicate retry, deployed unique index, tenant-owned/active account validation, year rollover, historical reversal cutoff or close-period enforcement was proven. No authenticated browser flow, load test, accessibility audit, export completeness or backup restore was performed. Coverage percentages were not measured; 46 passing tests do not imply broad workflow coverage.

Service/contra posting completeness, party outstanding versus GL, credit-note original-document mutation, inventory/COGS costing, tax/cess reconciliation and dashboard/lookup performance findings remain source-review risks without new end-to-end confirmation. Existing opening behavior passes its own mock tests and must be preserved while choosing a coherent reversal model. No conclusion about historic production balances or affected record counts can be drawn from these fixtures.

## Recommended first fixes — require Phase 2 authorization

1. Choose a single reversal/reporting model, including effective dates, opening behavior and repeated edits; make cancellation/edit regression gates pass before touching historical records. First assess existing data read-only and plan reconciliation separately.
2. Add common per-line posting validation, tenant-owned active account checks and an agreed exact minor-unit policy. Reject combined discounts exceeding gross. Confirm free-unit and excess-credit business policies before changing those calculators.
3. Replace financial statement account-code guessing with explicit chart classification and define period versus as-of cutoff semantics. Reconcile GL, subledgers and statements with approved fixtures.

Keep performance and UI work outside this first accounting fix group. No fixes or data repair are authorized by this report. Production sign-off remains blocked.
