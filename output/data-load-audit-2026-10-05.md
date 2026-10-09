# Data loading audit — 5 October 2026

## Scope and limits

Static review of the React application in `src/` and API/query code in `backend/`, focusing on requests made before a screen needs the data, unbounded responses, repeated requests, and database queries that read far more records than the result needs. No production dataset, network waterfall, response byte counts, or database query timings were available. Impact rankings below are based on code paths and expected data growth, not measured latency. Existing uncommitted application changes were left untouched.

## Prioritized findings

| ID | Priority | Area | What loads unnecessarily | Code evidence | Example of waste | Suggested fix and example | How to verify |
|---|---|---|---|---|---|---|---|
| 1 | P0 | Initial dashboard | Twelve master requests run immediately on `Dashboard` mount: companies, series, groups, categories, products, accounts, other accounts, GST, salesmen, areas, godowns, customer banks. Most are unrelated to the first visible dashboard screen. | `src/Dashboard.jsx:13068-13081` | User only opens the dashboard, yet every master collection is fetched. | Load a small dashboard summary on entry; fetch each lookup when its form opens. Example: `useEffect(() => { if (openFormFor === 'Billing') loadBillingLookups(); }, [openFormFor]);`. Cache lookup results per firm and invalidate after edits. The home tile counts currently use `accounts.length` and `products.length` (`src/Dashboard.jsx:18944`), so return those counts in the summary before removing the preload. | Compare Network request count and transferred bytes from login to home before/after; open Billing and confirm its lookups still work. |
| 2 | P0 | Product lookup | `loadProducts()` fetches every active product with full documents and stores them in dashboard state. The backend `/api/products` has no limit or field projection. A separate paginated `/api/products/list` already exists for the master grid. | `src/Dashboard.jsx:17400-17428`; `backend/server.js:5663-5703`; `src/Dashboard.jsx:9501` | 50,000 products can be sent on login even when the user does not open Billing or Product Master. | Add a compact, server searched lookup such as `GET /api/products/lookup?companyCode=C1&q=par&page=1&limit=30` returning only `productCode`, `productName`, unit, tax, and rate fields needed by the picker. Fetch on search after a short debounce; fetch detail/batches on selection. Keep `/list` for the grid. | Confirm login has no products response; typing in Billing transfers at most one page; chosen product still populates required fields. |
| 3 | P0 | Account lookup | `/api/accounts` returns all active accounts with a very large field selection, including address, tax, credit, and `openingTransactions`, plus all areas. Dashboard fetches this on mount. `/api/accounts/list` is paginated, but the global account state remains full size. | `src/Dashboard.jsx:46852-46890`; `backend/server.js:6088-6136` | Party dropdown needs code/name, yet each account carries detailed fields and opening transactions. | Split `GET /api/accounts/lookup?q=&limit=30` from `GET /api/accounts/:id` detail. Project code/name and essential flags in lookup; load credit settings/opening history only when selecting or editing that account. Return areas from their own lookup only where used. | Compare JSON bytes for login and party search; verify account editing and credit checks use fetched detail. |
| 4 | P0 | E-Invoice report | Candidate API reads and returns all sales bills and all matching parties. Date, amount, series, and bill number filters are applied in the browser only after the full response arrives. | `src/EInvoiceReport.jsx:103-122`; `backend/server.js:12898-12918` | Asking for one day still downloads the entire firm's sales history, potentially with invoice item arrays. | Send `fromDate`, `toDate`, `minimumAmount`, `series`, and number/load filters as query parameters. Apply filters to `SalesHeader.find()` before `.lean()`. Return a paged summary for selection, then fetch full bills only for selected IDs when generating JSON. | A one-day search should scan/return only matching bills; compare response bytes and confirm generated JSON is identical. |
| 5 | P0 | Product ledger report | The server reads all purchase and sales headers, adjustments, current stocks, and all product masters, then applies date/product filters while iterating the loaded documents. | `backend/server.js:32979-33004` | A report for one product this month reads years of unrelated transactions and invoice items. | Push date, product, godown, and company constraints into MongoDB queries. Use a narrower item projection or a line-item/indexed reporting collection for product filtering; paginate display rows and stream export separately. | Inspect MongoDB `explain()` documents examined for one product/month; assert report totals match current output. |
| 6 | P1 | Current stock report | Each request loads all active products and companies plus all purchase headers and their `items` to discover the last purchase for every product, even for a selected godown/company and a filtered stock list. | `backend/server.js:32738-32748`, `32779-32805`, `32875-32908` | A current-stock view for one godown re-reads historical purchase items for the entire firm. | First filter stock rows, collect their product codes, then query only those product masters. Derive latest purchase per code with an indexed aggregation or a maintained `lastPurchase` summary. Apply report filters before work where possible. | Check docs examined and request time for one-godown report; reconcile last purchase date/rate/qty with existing report. |
| 7 | P1 | Stock adjustment product search | Opening product dropdown can show up to 40 products and fires one `/api/stock/batches` request for each uncached match in parallel, before the user selects a product. | `src/StockManagement.jsx:66-74`, `143-169`; `backend/server.js:14319-14375` | One click on an empty search can make 40 batch requests. | Search products first, fetch batches only for the selected product; or add a bulk `POST /api/stock/batches/by-products` endpoint if batch counts must appear in the dropdown. Example: `onSelectProduct(product) => loadBatches(product.code)`. | Count batch requests on dropdown open and product selection; confirm stock-in and damage flows still show correct batches. |
| 8 | P1 | Transaction module | On `Transaction` mount, effects fetch collection vouchers, PDC dockets, contra, receipts, and cheque bounces regardless of the selected transaction screen. Several of these are full list endpoints. | `src/Transaction.jsx:311-362`; `backend/server.js:22353-22373` | Opening only Receipt still fetches four other voucher types. | Trigger each list query from `activeTransaction` and list/form mode, and paginate all transaction lists. Example: `if (activeTransaction === 'Receipt' && !isFormOpen) loadReceipts({page: 1, limit: 20})`. | Open each transaction type and inspect Network; ensure only its data loads and paging remains accurate. |
| 9 | P1 | Party sales report criteria | Two effects call `loadPartyReportCriteria` when the report is selected: one with no company filter and another with the selected company. Responses can race and the unfiltered response can overwrite the filtered values. | `src/Report.jsx:2682-2733`; `src/Report.jsx:2550-2594` | Opening a party report sends duplicate criteria requests; changing company can leave stale party options. | Remove the unfiltered effect, keep one effect keyed by report and company, and cancel stale requests with `AbortController` or a request sequence. | Selecting report should send one criteria request; quickly changing company must show options for the last selection. |
| 10 | P1 | Product sales report criteria | Product report criteria makes its own request and then calls party criteria merely to obtain area/salesman options. This repeats server work and may return party data that the product screen does not use. | `src/Report.jsx:2600-2660` | Opening a product sales report makes two requests and loads extra party records. | Have `/api/reports/product-sales/criteria` return projected companies, products, areas, and salesmen required by that screen, or use a shared cached area/salesman lookup. | One criteria request on open; dropdown contents unchanged. |
| 11 | P1 | Home dashboard computation | The home summary response is compact, but the endpoint executes many all-history aggregations and facets on every date change, including sales item unwind for top products. Some totals do not depend on the selected date. | `src/DashboardHome.jsx:28-39`; `backend/p0Features.js:388-435` | Changing the dashboard date recomputes lifetime totals and top products. | Separate date-dependent metrics from long-lived totals; cache or maintain daily/monthly aggregates per firm. Keep the response shape small. Ensure indexes support firm, date, and status matches. | Time the summary endpoint for a large firm and compare `explain()` scans; verify totals for several dates. |
| 12 | P2 | Browser storage and React state | `ERPProvider` parses all persisted voucher arrays during provider render, and reducer actions serialize entire updated arrays back to localStorage. The provider wraps the app, including login. | `src/context/ERPContext.jsx:17-64`, `69-275`, `456-465`; `src/main.jsx:8-13` | Updating one invoice can stringify the whole invoice array; large local data delays UI work. | Store only small session/preferences in localStorage. Keep voucher lists server paginated, or persist individual records in IndexedDB if offline support is required. Initialize legacy storage once and migrate carefully. | Profile login and voucher save with large local arrays; check that legacy offline records remain accessible after migration. |
| 13 | P2 | Development-only duplicate requests | The app is wrapped in React `StrictMode`, which deliberately re-runs mount effects in development. Mount effects without cleanup or request cancellation can therefore issue duplicate development requests. This does not by itself prove duplicate production traffic. | `src/main.jsx:8-14`; `src/Dashboard.jsx:13068-13081` | A local Network waterfall may show roughly twice the mount requests and exaggerate the production count. | Make effects safe to restart, abort pending requests on cleanup, and use a shared query cache for reusable lookups. Measure a production build separately before attributing all duplicates to app logic. | Compare development and production-build waterfalls; navigate away during a lookup and confirm no stale update. |

## Implementation sequence

1. Measure baseline on a representative firm: requests, transferred bytes, slow endpoints, database documents examined. Record login-to-home, Billing open, product search, E-Invoice one-day search, and one-product ledger report.
2. Remove dashboard mount preload; add dedicated cached lookups and keep list pages paginated. Start with products and accounts because they grow most and affect every login.
3. Move E-Invoice and ledger filters into database queries. Add indexes based on actual `explain()` results and verify financial totals.
4. Remove repeated report criteria requests and 40-way batch fan-out; gate transaction list loads by active screen.
5. Optimize stock report history query and home summary aggregates. Re-measure against the baseline.

## Practical query examples

**Product lookup (proposed):**

```js
const q = String(req.query.q || '').trim();
const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);
const filter = { distributorId: req.auth.distributorId, firmId: req.auth.firmId, isActive: true };
if (req.query.companyCode) filter.companyCode = String(req.query.companyCode);
if (q) filter.$or = [
  { productCode: new RegExp(`^${escapeRegex(q)}`, 'i') },
  { productName: new RegExp(escapeRegex(q), 'i') },
];
const products = await Product.find(filter)
  .select('productCode productName basicUnit gst salesRate')
  .sort({ productName: 1, _id: 1 })
  .limit(limit)
  .lean();
```

Escape regex input and use appropriate indexes or a search index for contains searches. For deep paging, use a cursor instead of increasing `skip` values.

**E-Invoice candidate filter (proposed):**

```js
const filter = {
  distributorId: req.auth.distributorId,
  firmId: req.auth.firmId,
  isActive: { $ne: false },
  IsBillCancelled: { $ne: true },
  BillDate: { $gte: fromDate, $lte: toDate },
};
if (series) filter.BillSeries = series;
// Apply amount and bill/load number filters here before reading documents.
const bills = await SalesHeader.find(filter)
  .select('BillDate BillSeries BillNo LoadSeries LoadNo PartyCode PartyName NetAmount')
  .sort({ BillDate: 1, BillNo: 1, _id: 1 })
  .limit(100)
  .lean();
```

Use a separate detail request for selected invoices so JSON generation still has complete invoice and party fields.

## What is already reasonably scoped

Sales, purchase, credit note, debit note, and several master list grids have server pagination. Their list endpoints are not the main source of the login payload. The home dashboard API also sends a summary rather than raw sales rows; its main concern is backend work per request.
