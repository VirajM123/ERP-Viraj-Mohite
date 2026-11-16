# ERP performance review and possible fixes

Date: 5 November 2026

## Scope and confidence

This is a read-only source review of the React/Vite frontend, Express/Mongoose backend, shared state, reporting, stock lookup, imports, database index declarations, and existing build artifacts. Only this report was created. No fixes, configuration changes, dependency changes, database operations, index creation, or deployments were performed. The pre-existing modification to `src/api/config.js` was left untouched.

This is a broad architecture and hotspot review, not a claim that every business path has been executed or every line individually audited. Production traffic, browser traces, live database statistics, deployed indexes, hosting plans, and replica topology were unavailable. Therefore the findings below identify demonstrated code patterns and their likely effects; they do not establish measured production root causes or promise speedup percentages. No production build was run because it would overwrite build artifacts.

## Main conclusion

The highest-value work is likely to be reducing dashboard database work, reducing the initial frontend download, preventing repeated full-data processing in browser state, and limiting stock lookup fan-out. Indexing should be validated against actual queries. A read replica is a later capacity decision, not the first fix.

| Proposal | Decision | Priority | Reason |
|---|---|---|---|
| Lazy loading | Strongly recommended | P1 | Major screens and export libraries are eagerly reachable from the app entry. |
| Dashboard query redesign | Strongly recommended | P1 | Summary runs 16 top-level parallel operations, several over full tenant history. |
| Pagination and bounded payloads | Recommended on remaining unbounded paths | P1 | Dashboard receipts and loads have no result limit; frontend-only pagination cannot reduce transfer. |
| Targeted cache | Recommended with explicit invalidation | P1/P2 | Repeated settings/lookups and expensive summaries are candidates. Financial validation must remain authoritative. |
| Indexing | Inspect and tune; do not add blindly | P1 | Many indexes already exist; query shape, field order, and deployed inventory determine usefulness. |
| Read replica | Conditional, after measurement | P3 | Can isolate reporting reads but cannot fix JavaScript, large payloads, or inefficient aggregation. |
| UI changes | Recommended | P1/P2 | Prioritize fast search, stable lists, staged dashboard loading, and responsive forms. |

## 1. Frontend loading and rendering

### F1 — Eager screen and export dependencies (high confidence)

Evidence: `src/App.jsx:3` statically imports Dashboard. `src/Dashboard.jsx:4` onward imports spreadsheet/PDF libraries, invoice output, Report, Transaction, imports, setup, stock, and service screens. `src/Report.jsx:36` onward also imports spreadsheet/PDF and synchronous zip code. `src/utils/invoiceOutput.js:1` imports html2canvas and jsPDF. Login and the authenticated application are reachable through the same initial module graph.

Likely effect: users pay download, parsing, and evaluation costs for workspaces and export tools they have not opened. Conditional JSX rendering alone does not defer static imports.

Possible fix: lazy-load Dashboard after login and each major workspace when selected, with Suspense skeletons and a recoverable chunk-load error state. Load PDF, Excel, image capture, and archive code inside export actions. Split large modules so lazy boundaries actually remove code from the initial graph; preserve permission checks and navigation state. Prefetch only likely next screens after the current screen is usable.

Existing `vite.config.js` sets `manualChunks: undefined`; this is not itself a defect. Dynamic import boundaries matter more than arbitrarily splitting vendor files.

### F2 — Large existing assets and source modules (measured files, runtime effect unmeasured)

Existing `dist/assets` files, last modified 8 October 2026:

| File | Uncompressed bytes |
|---|---:|
| index-DtGjUfOG.js | 3,706,961 |
| index-CBcRGOgw.css | 1,338,166 |
| login-office-hero-CUQJo3-w.png | 1,342,064 |
| CASH-DHW0S8ME.png | 1,097,361 |
| BANK-CA7WeTOy.png | 860,773 |
| UPI-B9ys0m8J.png | 809,296 |

These are historical local artifacts, not proof of today's production bundle, compressed transfer size, or initial image loading behavior. Current source sizes include Dashboard.jsx ~2.59 MB, Dashboard.css ~1.06 MB, Transaction.jsx ~526 KB, and Report.jsx ~504 KB. Source size is a maintenance and bundling warning, not a direct render-time measurement.

Possible fix: audit unused/overridden CSS using browser coverage, split styles by workspace, resize/compress images to their rendered dimensions, and consider WebP/AVIF for raster assets. Keep intentional above-the-fold login imagery appropriately prioritized; defer offscreen images. Verify Brotli/gzip and immutable caching for hashed assets at the actual host. Express has no compression middleware visible in the reviewed bootstrap; a proxy may already compress responses, so inspect response headers before changing anything.

### F3 — Repeated storage parsing and broad context updates (high confidence)

Evidence: `src/context/ERPContext.jsx` calls `loadFromLocalStorage()` directly in the provider body on every render. It reads and parses eight transaction datasets. Reducer actions serialize complete arrays with synchronous `localStorage.setItem`. The provider creates a new value object and helper functions on every render. `src/main.jsx` mounts this provider around the entire app, including login.

Likely effect: increasing history can cause startup delays and pauses after transaction updates; context consumers are notified together. `src/Transaction.jsx:65` onward also logs the full context/state/receipts during render.

Possible fix: initialize storage once through the reducer initializer; persist only necessary drafts/preferences; keep server transaction lists paginated rather than duplicating full history in localStorage. Split state by business domain and stabilize provider values where profiling shows value. Remove or development-gate verbose render logs. Handle quota failures visibly if local persistence is required. Any replacement cache must be scoped by user, distributor and firm and cleared on identity changes.

### F4 — Global DOM sorting and observation (high confidence)

Evidence: `src/hooks/useSortableListTables.js` observes the entire root subtree, schedules a document-wide header scan after child mutations, and sorts by reading DOM cell text and moving rows manually. App installs this hook globally.

Possible effect: repeated scanning adds work during large table updates. Manual row ordering can conflict with React reconciliation. It also sorts only currently rendered rows, which is misleading for paginated data.

Possible fix: move sort state into React; send sort keys to paginated APIs; scope observers to tables that need them if an interim implementation is necessary. Use stable row keys. Virtualize genuinely large visible lists; avoid adding virtualization to already-small pages without evidence.

## 2. Backend and database work

### B1 — Dashboard is the clearest database hotspot (high confidence)

Evidence: `backend/p0Features.js:388–500`, `/api/p0/dashboard/summary`, creates 16 top-level Promise.all operations, including an opening-outstanding helper that may do additional work. Several sales/purchase/receipt/stock aggregations match the tenant without an early date range. Sales is aggregated separately for facets and flash totals; purchase is scanned for total, flash figures, and trends. Date conditions inside `$group` do not restrict the initial candidate set.

The sales facet computes full-history totals, customer/product rankings and item unwinds. Receipt details at line 479 include every non-reversed receipt up to the selected date. Load details at line 480 fetch every non-cancelled load. DashboardHome then filters collectionRows locally (`src/DashboardHome.jsx:80` onward). Promise.all reduces serial waiting but can increase simultaneous database pressure across users.

Possible fixes, preserving existing accounting semantics:

1. Separate all-time totals from date-specific KPIs, trends and detail widgets. Push applicable date predicates into the initial match; do not silently change all-time outstanding into a date-limited figure.
2. Return grouped collection totals by method/date for the required period. Fetch receipt drilldowns separately with pagination. Bound load/task lists and return independent total counts.
3. Combine compatible calculations or use reconciled daily summaries for historical metrics. Keep current-period adjustments, reversals and imported transactions correct; provide a rebuild/reconciliation path for summaries.
4. Load KPIs first; defer rankings, trends and drilldowns. Consider a short-lived summary cache after query improvements.
5. Evaluate separate indexed recent-invoice queries: a sort inside a facet after broad matching should not be assumed to get the same index benefit as an initial indexed match/sort. Confirm with explain.

### B2 — Stock lookup can fan out to 40 requests (high confidence)

Evidence: `src/StockManagement.jsx:71–73` limits matching products to 40. Lines 142–168 issue one `/stock/batches` request for each missing product with Promise.all. The cancellation flag suppresses state updates but does not abort network requests. Batch cache keys use godown and product, while stock type is also a request dimension.

Possible fix: fetch batches only after selecting/highlighting a product, or add a bounded bulk endpoint. Debounce search and abort obsolete requests; deduplicate in-flight work and limit concurrency. Include distributor, firm, godown, product and stock type in cache identity, and invalidate after stock movements. Do not store failed requests as permanent valid empty results. Reuse existing bounded lookup endpoints where appropriate.

### B3 — Reporting and import work can grow with data (high confidence pattern)

Evidence: `backend/gstReports.js:504–517` already applies date/scope filters, projections and lean reads, but materializes matching transaction arrays for processing. `backend/productSalesReport.js:351–427` uses aggregation and detail pipelines, including allowDiskUse. `backend/desktopImportBatch.js:156` synchronously reads and parses an Excel workbook with XLSX.read. `src/Report.jsx` imports zipSync; exports need profiling for large reports.

Possible fix: benchmark large fiscal periods and workbooks. Use paginated report previews, a separate complete export path, and background jobs/workers for expensive imports/exports when they block the event loop. Stream or chunk processing where library support allows; preserve idempotency, transaction boundaries and full export completeness. Disk spill can prevent memory failures but does not guarantee a fast report.

### B4 — Existing optimizations must be preserved

The ERP already has bounded product/account lookup endpoints (`backend/server.js:5776`, `6247`), paginated master queries with limit caps, frontend request cancellation in some Dashboard flows, scoped indexes, lean/projection reads, bulk import operations, and request/process observability. The correct action is to extend these patterns to gaps, not rewrite every endpoint.

`src/main.jsx` enables StrictMode. Extra development checks can exaggerate duplicate effects in local development; compare against a production build before attributing all perceived slowness to hosting.

## 3. Indexing decision and candidate review

Index declarations are not proof that the live database has those indexes. Do not run syncIndexes or create/drop indexes as part of this review. First inventory deployed indexes, collection sizes, representative filters, sort patterns, and execution plans. MongoDB documents that compound field order matters and recommends explain analysis: [query plans](https://www.mongodb.com/docs/manual/tutorial/analyze-query-plan/) and [index strategy](https://www.mongodb.com/docs/manual/applications/indexes/).

| Query family | Existing evidence | Candidate investigation, not executable migration |
|---|---|---|
| Sales date lists and summary | server.js:2462–2474 has tenant+series unique index, entry-type/date sort, party/due-date and godown/date indexes | Test tenant + BillDate + BillNo + _id ordering for lists without equality on SalesEntryType or GDCode. Existing leading fields may prevent efficient use for that sort. |
| Purchases by date | server.js:2182–2196 declares multiple purchase indexes | Compare exact deployed keys with invoiceDate filters and voucher sorts before proposing another. |
| Receipt collections | transaction.js:193–196 includes tenant/status/date and party/cheque indexes | Test tenant+receiptDate access for summary bounds; status `$ne` does not behave like a simple equality prefix. |
| Stock batches | server.js:2125 unique tenant/GDCode/ProdCode/Batch/MRP | This prefix already supports godown/product lookup. Check explain before duplicating. Stock-wide totals still read matching stock. |
| Product/account search | server.js:5787 uses unanchored case-insensitive regex over product code/name/EAN; account lookup also exists | Ordinary B-tree indexes may not efficiently satisfy contains search. Evaluate normalized exact/prefix code searches and a suitable search index for names; preserve expected matching behavior. |
| Loads | dashboard uses uppercase DistributorId/FirmId, IsCancelled and descending LoadDate/LoadNo | Inspect actual load indexes and test matching uppercase scope/date sort keys. Do not copy lowercase tenant field names into an index for this query. |

For each candidate record executionTimeMillis, nReturned, totalDocsExamined, totalKeysExamined, scan type and blocking sort/spill behavior on representative small and large tenants. Full-history aggregates may legitimately examine many rows; an index alone will not make exact all-time totals constant cost. Compare write latency, index storage and import throughput before accepting extra indexes. Preserve uniqueness indexes required for business correctness.

## 4. Cache strategy

The frontend fetch wrapper (`src/api/client.js`) adds authentication but contains no explicit response cache or in-flight request deduplication. Local settings and stock batch caches already exist. There is no reason to introduce Redis for every response.

| Data | Suggested policy to evaluate | Invalidation |
|---|---|---|
| Master lookups/setup | Client query cache; initial stale interval 1–5 minutes | Successful edit/import, firm switch, logout and permission change |
| Dashboard analytics | Server cache, initial TTL 15–60 seconds; show updated-at time | Relevant committed postings/reversals/imports, or documented TTL freshness |
| Historical reports | Cache normalized filter results only if reuse justifies cost | Backdated postings, reversals and imports |
| Available stock, credit checks, allocation balances, next document numbers | Keep final validation on the primary/write path | Cached display must never authorize a transaction |

These TTLs are proposed starting points, not measured requirements. Include tenant, firm, date range, normalized filters and applicable permission identity/version in cache keys. Authorize each request before serving cached data. Prevent cross-firm leakage, stampedes, unbounded memory and stale refill races after invalidation. Start with a client cache; use shared Redis only when multiple server instances or measured repeated work justify it. Do not treat synchronous localStorage transaction copies as a complete caching solution.

## 5. Read replica decision

Do not change the application's global read preference at this stage. `backend/server.js:127` shows a single Mongoose connection without explicit read routing; the actual URI/topology was not inspected, so this does not prove the deployment lacks replica members.

MongoDB secondary reads can return stale data: [official read preference documentation](https://www.mongodb.com/docs/manual/core/read-preference/). A replica set used for availability and deliberate routing of reporting traffic to secondaries are separate decisions.

Consider reporting reads on a secondary or dedicated analytics node only if optimized queries still cause sustained primary CPU/I/O or read contention and reports can accept a defined lag. Keep stock reservation, posting, allocation, credit validation, document sequencing, and immediate post-save verification on an appropriate primary/transaction path. Evaluate replication lag, secondary capacity, report duration, fallback load and failure behavior. A read preference cannot fix browser freezes or full-history payloads; adding nodes introduces infrastructure cost and operational work.

## 6. Recommended UI modifications

These are proposals from source inspection; visual usability and responsiveness still require a browser session with representative data.

| Area | Modification | Intended result |
|---|---|---|
| Dashboard | Immediate shell; independent KPI/chart/task loading, skeletons, per-widget retry and updated-at label | A slow optional widget does not block the whole workspace. |
| Masters and transaction lists | Server-side filter/sort/page controls, stable row height, sticky header and explicit result count | Bounded data transfer and predictable navigation. |
| Product/party search | Debounced bounded autocomplete, loading/empty/error states, keyboard navigation and cancellation | Less work per keystroke and fewer stale results. |
| Large option lists | Replace full option-tree processing with remote lookup or bounded results; inspect SearchablePartySelect | Avoid constructing and filtering every option on each render. |
| Billing forms | Keep editing state local to the active form/row; defer optional panels and load batches on demand | Reduce unrelated rerenders and keep typing responsive. |
| Reports | Apply/Generate action for expensive filters, paginated preview, separate full export with progress | Avoid expensive regeneration and blocking exports. |
| Navigation | Lazy workspace boundaries with retained filters and intentional draft preservation | Faster first use without losing work during navigation. |
| Styling/assets | Audit repeated overrides, scope screen CSS, optimize dashboard icons and login image | Lower style/download cost while preserving the existing design. |

Keep existing table accessibility and keyboard workflows. Lazy-loading a form must not discard an unsaved voucher; background work must expose success/failure and prevent duplicate posting.

## 7. Proposed implementation order and verification

No items below were implemented.

1. **Baseline first:** capture production-like cold login, warm dashboard, product search, list navigation, voucher save, full-period report and large import. Record browser network waterfall, compressed bytes, long tasks, React commits, API route p50/p95/p99, payload sizes, database CPU/I/O and query plans. Compare first request versus warm requests to detect hosting wake-up/network effects. Verify frontend/API/database regions and actual API origin without exposing secrets.
2. **P1 frontend:** lazy screen/export boundaries; one-time provider initialization; remove full-state render logs; optimize proven oversized assets. Confirm initial entry no longer includes unopened report/import/export modules. React's supported mechanism is documented in [lazy](https://react.dev/reference/react/lazy).
3. **P1 backend:** reduce dashboard full-history duplication and payloads; bound stock lookup fan-out; connect remaining lists to server pagination. Preserve all-time totals and reconciliation.
4. **P1/P2 database:** inventory and explain; test only justified indexes on representative data, then plan controlled rollout and rollback. Do not remove uniqueness protections.
5. **P2 cache/UI:** query deduplication, scoped invalidation, widget-level loading, responsive lists and optional worker-based exports/imports.
6. **P3 infrastructure:** evaluate pool saturation, server CPU/memory, database tier/region and reporting replicas only after remaining bottlenecks are demonstrated. Connection code does not explicitly tune pool size; increasing it blindly can overload the database.

Suggested acceptance targets, to agree against real workloads: p75 interaction latency at or below 200 ms; paginated lookup/list API p95 below 500 ms; dashboard KPI API p95 below 1 second under representative concurrency. These are goals, not current results or guarantees. Report large-job completion separately from interactive API latency. Check cold and warm behavior and low-end client devices.

Correctness checks must cover firm isolation, permission changes, posting/reversal/import cache invalidation, fresh post-save balances, batch availability, pagination/sort accuracy, complete exports, and reconciliation of optimized dashboard figures to existing accounting totals.

Existing `backend/observability.js` already records request duration and minute-level process metrics. Use it as a starting point, with route-level aggregation and payload/query metrics. Its current percentile sample is bounded to 10,000 durations per interval; account for that when interpreting high-volume measurements.

## Final recommendation

Approve a measured optimization phase centered on dashboard queries, frontend loading, browser state and bounded searches. Implement targeted indexing and caching after validating query behavior and freshness rules. Defer read-replica spending until production evidence shows that reporting isolation remains necessary.
