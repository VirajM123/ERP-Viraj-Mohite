# Completed static financial-writer inventory � 6 November 2026

Completed before application edits. All 134 prior candidates resolved against parsed executable route bodies. Independently examined all 270 route registrations and mutation sites in the backend top-level runtime modules. This is a source inventory for this captured checkout, not certification of production reachability, deployed jobs or external database writers. AST evidence excludes comments and nearby helper bodies; the original lexical list is not used as proof of coverage.

Categories: S = Safe to integrate using existing transaction boundaries; T = Requires an approved transaction-boundary change; B = Requires an accounting or effective-date business decision; N = Not a financial writer. B takes priority where both policy and architecture blockers exist. Only Sales Service T rows are approved for this phase. S denotes suitable boundaries, not approval to implement additional routes or proof of full period enforcement.

## Dependency profiles

- **master (N)**: Master/configuration/security or mapping only; no dated transaction, stock quantity or journal mutation. Referenced master changes affect future documents; do not guard these as historical postings.
- **read (N)**: Read/validation/export or job-file preparation only. E-invoice JSON writes an export file, upload returns 501; neither changes ERP financial documents.
- **control (N)**: Period configuration/reopen/blocked-close control and audit, not a source financial document. Own authenticated ACCOUNTING grants and active transaction retained.
- **service (T)**: APPROVED HERE only: SALES/SALES_SERVICE add/edit/delete + requestTenant. voucherDate requested and persisted original on edit/delete. Baseline has no transaction. Party/firm/service reads, number floor/increment, create/save/soft-delete must share active session; guard before counter or document mutation. Desktop supplied numbering remains unchanged.
- **journal (S)**: TRANSACTIONS/JOURNAL_VOUCHER; tenant(req.auth). withTransaction already includes number/document/journal/audit. Dates: stored and proposed vDate, selected original journal documentDate, actual reversal argument (edit proposed-or-stored; delete stored). Guard before number/reversal/save; preserve idempotent existing-result path.
- **purchase (S)**: VOUCHERS/PURCHASE; tenant source shown in evidence (some body-derived; compare against req.auth before guard). Existing transaction covers number/header/stock/journal/audit. Dates: invoiceDate original/proposed, selected journal dates and actual reversal date (businessDateIST for cancellation). Repair uses persisted invoiceDate, reactivation stock movements and missing-journal creation; guard before first mutation. No new date rule needed for own posting dates.
- **salesedit (S)**: SALES/SALES_BILLING; existing active transaction. req.auth plus tenant-scoped source reads. BillDate stored/proposed, selected journal and actual reversal dates; cancellation uses businessDateIST. Preflight before stock reversal/header/load snapshot/journal/movement/audit. Include zero-value skip-posting path and both cancellation entry points.
- **salescreate (T)**: UNAPPROVED: active document transaction but nextDocumentNumber deliberately reserves independently (server.js:12633-12645 omits session). Move number reservation into same transaction requires separate approval. BillDate; party/company/godown/tax/rate/credit/stock and idempotent commit reconciliation must remain intact.
- **billtype (T)**: UNAPPROVED: body tenant, global authentication but no route grant. SalesHeader and embedded LoadHeader bill-type updates have no transaction. Persisted BillDate and affected load dates must be resolved; no authorization correction authorized here.
- **allocation (B)**: TRANSACTIONS PAYMENT/RECEIPT and authenticated tenant. Primary create/edit/delete have withTransaction but mutate purchase/sales/opening allocated counters before journal. Own old/new vDate or receiptDate and selected original/reversal journal dates are available. Business decision needed on whether linked source invoice/opening posting periods must also be OPEN; do not substitute receipt bill reference date for postingDate. releaseOpening has no tenant in signature. Existing early idempotent/no-op behavior retained.
- **legacyreceipt (T)**: UNAPPROVED nontransactional legacy receipt writer: preserve posted-receipt immutability rejection; non-POSTED edit still mutates. Date receiptDate stored/proposed; tenantFilter on lookup/update but update payload tenant fields require review. Duplicate POST at transaction.js:1270 is shadowed by first handler (no next), still inventoried as dormant code.
- **serverreceipt (B)**: Legacy /api/receipt has active transaction and number+Receipt create but no balanced journal call. receiptDate defaults from existing behavior; linked bill BillDate. Decide reference-period policy and relationship to primary receipt workflow before integration. Do not add posting as incidental guard work.
- **cheque (T)**: UNAPPROVED: TRANSACTIONS route-specific add/edit/delete, no transaction around counter/document/status mutation. chqBounceDate / pdcDate or docDate / transactionDate / collectionDate respectively, stored and proposed. Create cheque-bounce trusts body tenant; other creates force auth tenant; edits initially load tenantFilter but may copy body tenant into update. Delete status REVERSED with no invented cancellation posting/date. No common journal call in these families.
- **stock (B)**: VOUCHERS/STOCK_ADJUSTMENT; existing transaction and authenticated tenant. Create VoucherDate defaults UTC today; edit/delete movementDate is businessDateIST, while original/replacement VoucherDate may differ. Require explicit effective-date treatment of these existing movements before integration; do not change dates/valuation. moveStockForAdjustment, Stock/DamStock, request-id/status locks, movements and audit are one dependency set.
- **batch (B)**: TOOLS/BATCH_LOCK and BATCH_RATE_OVERRIDE conditional edit grants; auth tenant. Stock/product reads before transaction; stock SRate/IsLocked + audit bulk writes inside it. No authoritative financial effective date; decide whether rate/lock is a period-controlled event. If included, same-session source-read boundary change also needs approval.
- **opening (B)**: MASTER/ACCOUNT, authenticated tenant on main account routes. saveAccountWithOpenings legacy path save(null); transactional path saves account before deriving old/new opening postingDate. Direct opening/journal supersession, allocations and account summary/history semantics require business decision AND separate transaction approval for legacy branch. Do not turn reference row.date into postingDate or rewrite historical events. Delete master can affect legacy opening visibility; no opening reversal is implemented.
- **otheropening (B)**: MASTER/OTHER_ACCOUNT; openingBal can be created/edited and account soft-deleted with no authoritative opening posting date/transaction. Requires effective-date and opening-summary policy, then separate same-session architecture approval. No journal posting added.
- **import (B)**: importPermission + req.security tenant; Account import carries openingBal without openingDate/billwise events (importConfig.js). Active transaction includes ImportBatch + master inserts; Product upsert and postcommit GST sync are master-only. Decide legacy opening effective-date semantics for Account rows; do not fabricate dates.
- **dispatch (B)**: TOOLS desktop-import grant, owned job tenant + forwarded Authorization. runDesktopImport dispatches mapped sales/purchase/notes/receipt/service/stock/cheque/etc to target HTTP writers, repair targets purchase reconciliation; independent per-record commits, not one Mongo transaction. Retry/resume may continue writes; pause does not undo in-flight writes. Inherits each target blocker/date policy. Direct supplier/bank master inserts have no transaction; rollback deletes captured master IDs without tenant predicate and calls transaction DELETE endpoints. Require scope/compensation decisions; no global batch transaction authorized.
- **load (B)**: Load snapshots mutate sales/load financial-document metadata and totals; conservatively included, even without journal. CREATE_LOAD/SETTLE_LOAD grants where present; load-transfer lacks route-specific grant. LoadDate / loadDate, embedded BillDate and receiptDate are not one authoritative posting date. Create/edit/transfer/load-delete have transaction; GET load-bills repairs snapshots without one; legacy settle create/edit/delete lack transaction. settle-load/save additionally upserts/reverses Receipt and sales statuses inside existing transaction. Requires business decision for snapshot/settlement and generated receipt effective dates; any missing boundary separately approved.
- **quotation (N)**: Quotation document/number only; inspected create/edit/delete do not mutate stock, journals, sales allocations or posted invoices. Prospective quote, outside financial-period enforcement; counter is QUOTATION only.
- **debit (S)**: VOUCHERS/DEBIT_NOTE, authenticated tenant (cancellation body scope must match req.auth). Existing transaction includes tenant references, original purchase limits, stock helper, number/note/journal/audit. Dates old/new VDate, original/latest journal date and actual reversal argument; delete uses businessDateIST. Guard before stock and numbering. Reference purchase is validated but no allocation counter mutation; preserve return limits.
- **allocationNote (B)**: VOUCHERS/CREDIT_NOTE, existing transaction. Old/new VDate, original/latest journal and actual reversal date (delete businessDateIST) available. In addition stock helper and adjustSalesBillForCreditNote / direct SalesHeader updates change referenced sales return/credit metadata. Resolve linked source-period policy before implementation; no tax, valuation or reversal-date redesign authorized.

## Every prior candidate

Each row links its source line and dependency profile above. JSON retains source hash, exact authorization calls and direct mutation sites. Helper-only effects are specified in the profiles and helper matrix.

| # | Baseline source | Operation (router-local where applicable) | Category | Profile / direct mutation sites |
|---|---|---|---|---|
| 1 | backend/batchLock.js:156 | PUT /stock | B | batch; 250: Stock.bulkWrite; 251: BatchRateAudit.insertMany |
| 2 | backend/companyWiseSeries.js:100 | PUT / | N | master; 140: CompanyWiseSeries.bulkWrite |
| 3 | backend/companyWiseSeries.js:171 | DELETE /:id | N | master; 178: CompanyWiseSeries.findOneAndDelete |
| 4 | backend/desktopImportRoutes.js:544 | POST /desktop-import/generate | N | read; indirect only or no DB mutation � see profile |
| 5 | backend/desktopImportRoutes.js:580 | POST /desktop-import/upload-excel | N | read; indirect only or no DB mutation � see profile |
| 6 | backend/desktopImportRoutes.js:631 | POST /desktop-import/jobs/:jobId/preflight | N | read; indirect only or no DB mutation � see profile |
| 7 | backend/desktopImportRoutes.js:649 | POST /desktop-import/jobs/:jobId/import | B | dispatch; indirect only or no DB mutation � see profile |
| 8 | backend/desktopImportRoutes.js:677 | POST /desktop-import/jobs/:jobId/import/pause | B | dispatch; indirect only or no DB mutation � see profile |
| 9 | backend/desktopImportRoutes.js:684 | POST /desktop-import/jobs/:jobId/import/resume | B | dispatch; indirect only or no DB mutation � see profile |
| 10 | backend/desktopImportRoutes.js:691 | POST /desktop-import/jobs/:jobId/import/retry | B | dispatch; indirect only or no DB mutation � see profile |
| 11 | backend/desktopImportRoutes.js:702 | POST /desktop-import/jobs/:jobId/import/rollback | B | dispatch; indirect only or no DB mutation � see profile |
| 12 | backend/financialPeriods.js:155 | POST /${action.toLowerCase()} | N | control; indirect only or no DB mutation � see profile |
| 13 | backend/generalSetup.js:781 | GET / | N | master; 815: GeneralSetup.create |
| 14 | backend/generalSetup.js:853 | PUT / | N | master; 877: GeneralSetup.findOneAndUpdate |
| 15 | backend/importRoutes.js:242 | POST /import/validate | N | read; indirect only or no DB mutation � see profile |
| 16 | backend/importRoutes.js:247 | POST /import/save | B | import; 264: ImportBatch.create; 285: productCollection.bulkWrite; 301: models[req.body.entryType].insertMany |
| 17 | backend/p0Features.js:233 | POST /journal-voucher | S | journal; 249: JournalVoucher.create |
| 18 | backend/p0Features.js:257 | PUT /journal-voucher/:id | S | journal; 268: voucher.save |
| 19 | backend/p0Features.js:276 | DELETE /journal-voucher/:id | S | journal; 284: voucher.save |
| 20 | backend/printAccountDetails.js:72 | PUT / | N | master; 131: PrintAccountDetails.findOneAndUpdate |
| 21 | backend/productMapping.js:70 | POST / | N | master; 99: ProductMapping.findOneAndUpdate; 102: ProductMapping.create |
| 22 | backend/productMapping.js:119 | DELETE /:id | N | master; 122: ProductMapping.findOneAndUpdate |
| 23 | backend/securitySetup.js:740 | GET / | N | master; 771: SecuritySetup.create |
| 24 | backend/securitySetup.js:878 | PUT / | N | master; 928: SecuritySetup.findOneAndUpdate |
| 25 | backend/server.js:352 | POST /api/register | N | master; 425: Register.create |
| 26 | backend/server.js:476 | POST /api/login/firms | N | read; indirect only or no DB mutation � see profile |
| 27 | backend/server.js:632 | POST /api/login | N | read; indirect only or no DB mutation � see profile |
| 28 | backend/server.js:960 | POST /api/users | N | master; 1029: User.create |
| 29 | backend/server.js:1060 | PUT /api/users/:id | N | master; 1085: User.findOneAndUpdate |
| 30 | backend/server.js:1110 | DELETE /api/users/:id | N | master; 1112: User.findOneAndUpdate |
| 31 | backend/server.js:1598 | GET /api/reports/party-sales/criteria | N | read; indirect only or no DB mutation � see profile |
| 32 | backend/server.js:5068 | POST /api/companies | N | master; 5104: Company.create |
| 33 | backend/server.js:5125 | PUT /api/companies/:id | N | master; 5161: Company.findOneAndUpdate |
| 34 | backend/server.js:5179 | DELETE /api/companies/:id | N | master; 5249: Company.findOneAndUpdate |
| 35 | backend/server.js:5459 | POST /api/groups | N | master; 5478: Group.create |
| 36 | backend/server.js:5693 | POST /api/categories | N | master; 5712: Category.create |
| 37 | backend/server.js:6146 | POST /api/products | N | master; 6164: Product.create |
| 38 | backend/server.js:6565 | POST /api/accounts | B | opening; 6612: Account.create |
| 39 | backend/server.js:6972 | POST /api/other-accounts | B | otheropening; 6996: OtherAccount.create |
| 40 | backend/server.js:7199 | POST /api/firms | N | master; 7229: Register.create |
| 41 | backend/server.js:7563 | POST /api/gst | N | master; 7599: GST.create |
| 42 | backend/server.js:8154 | POST /api/salesmen | N | master; 8190: Salesman.create |
| 43 | backend/server.js:8236 | PUT /api/sales/change-bill-type-f4 | T | billtype; 8281: salesBill.save; 8284: LoadHeader.updateMany |
| 44 | backend/server.js:8332 | PUT /api/sales/:id | S | salesedit; 8550: SalesHeader.findOneAndUpdate; 8938: load.save |
| 45 | backend/server.js:9301 | POST /api/areas | N | master; 9332: Area.create |
| 46 | backend/server.js:9607 | POST /api/godowns | N | master; 9643: GodownModel.create |
| 47 | backend/server.js:9957 | POST /api/customer-banks | N | master; 9980: CustomerBank.create |
| 48 | backend/server.js:10070 | POST /api/salesman-area-mappings | N | master; 10146: SalesmanAreaMapping.bulkWrite; 10148: SalesmanAreaMapping.updateMany |
| 49 | backend/server.js:10318 | POST /api/area-to-party-mappings | N | master; 10382: AreaToPartyMapping.bulkWrite |
| 50 | backend/server.js:10449 | POST /api/purchase | S | purchase; 10518: PurchaseHeader.create; 10681: Stock.findOneAndUpdate |
| 51 | backend/server.js:10992 | POST /api/purchase/reconcile-desktop-import | S | purchase; 11078: Stock.updateOne; 11118: purchase.save |
| 52 | backend/server.js:11135 | PUT /api/purchase/:id | S | purchase; 11218: PurchaseHeader.findOneAndUpdate |
| 53 | backend/server.js:11900 | GET /api/sales/next-bill-no | N | read; indirect only or no DB mutation � see profile |
| 54 | backend/server.js:12483 | POST /api/sales | T | salescreate; 12696: SalesHeader.create |
| 55 | backend/server.js:13085 | POST /api/sales/einvoice-details | N | read; indirect only or no DB mutation � see profile |
| 56 | backend/server.js:13110 | POST /api/sales/einvoice-json | N | read; indirect only or no DB mutation � see profile |
| 57 | backend/server.js:13132 | POST /api/sales/einvoice-upload | N | read; indirect only or no DB mutation � see profile |
| 58 | backend/server.js:14579 | GET /api/stock/adjustments | N | read; indirect only or no DB mutation � see profile |
| 59 | backend/server.js:14700 | PUT /api/stock/adjustments/:id | B | stock; 14771: StockAdjustment.updateOne; 14784: StockAdjustment.updateOne |
| 60 | backend/server.js:14863 | DELETE /api/stock/adjustments/:id | B | stock; 14893: StockAdjustment.updateOne; 14904: StockAdjustment.findOneAndUpdate |
| 61 | backend/server.js:14937 | POST /api/stock/adjust | B | stock; 15024: StockAdjustment.create; 15057: StockModel.findOneAndUpdate; 15075: StockModel.findOneAndUpdate; 15091: StockAdjustment.updateOne |
| 62 | backend/server.js:15391 | POST /api/quotation | N | quotation; 15546: QuotationHeader.create |
| 63 | backend/server.js:16889 | PUT /api/create-load/:id | B | load; 17045: SalesHeader.updateMany; 17282: LoadHeader.findOneAndUpdate; 17413: SalesHeader.updateMany |
| 64 | backend/server.js:18410 | POST /api/create-load | B | load; 18739: LoadHeader.create; 18843: SalesHeader.updateMany |
| 65 | backend/server.js:19298 | GET /api/load-transfer/load-bills | B | load; 19452: sourceLoad.save |
| 66 | backend/server.js:19656 | POST /api/load-transfer | B | load; 20129: currentSourceLoad.save; 20212: destinationLoad.save; 20219: SalesHeader.updateMany |
| 67 | backend/server.js:20599 | POST /api/settle-load/save | B | load; 20848: SettleLoad.findOneAndUpdate; 20940: Receipt.findOneAndUpdate; 21079: Receipt.updateMany; 21120: SalesHeader.updateMany; 21168: SalesHeader.updateMany; 21194: SalesHeader.updateOne; 21327: load.save |
| 68 | backend/server.js:21358 | POST /api/settle-load | B | load; 21465: SettleLoad.create; 21493: SalesHeader.updateMany |
| 69 | backend/server.js:22393 | PUT /api/settle-load/:id | B | load; 22452: SettleLoad.findOneAndUpdate |
| 70 | backend/server.js:22488 | POST /api/receipt | B | serverreceipt; 22516: Receipt.create |
| 71 | backend/server.js:22606 | GET /api/create-load/next-no | N | read; indirect only or no DB mutation � see profile |
| 72 | backend/server.js:22694 | PUT /api/sales/cancel-bill | S | salesedit; indirect only or no DB mutation � see profile |
| 73 | backend/server.js:24427 | POST /api/debit-note | S | debit; 24598: DebitNote.create |
| 74 | backend/server.js:24718 | PUT /api/debit-note/:id | S | debit; 24901: DebitNote.findOneAndUpdate |
| 75 | backend/server.js:25025 | DELETE /api/debit-note/:id | S | debit; 25100: DebitNote.findOneAndUpdate |
| 76 | backend/server.js:25770 | POST /api/credit-note | B | allocationNote; 26183: CreditNote.create; 26358: stockModel.findOneAndUpdate; 26379: SalesHeader.updateOne |
| 77 | backend/server.js:26484 | PUT /api/credit-note/:id | B | allocationNote; 26892: CreditNote.findOneAndUpdate |
| 78 | backend/server.js:27669 | PUT /api/firms/:id | N | master; 27673: Register.findOneAndUpdate |
| 79 | backend/server.js:27718 | DELETE /api/firms/:id | N | master; 27720: Register.findOneAndUpdate |
| 80 | backend/server.js:27741 | PUT /api/groups/:id | N | master; 27761: Group.findOneAndUpdate |
| 81 | backend/server.js:27790 | DELETE /api/groups/:id | N | master; 27805: Group.findOneAndUpdate |
| 82 | backend/server.js:27825 | PUT /api/categories/:id | N | master; 27845: Category.findOneAndUpdate |
| 83 | backend/server.js:27874 | DELETE /api/categories/:id | N | master; 27889: Category.findOneAndUpdate |
| 84 | backend/server.js:27909 | PUT /api/products/:id | N | master; 27934: Product.findOneAndUpdate |
| 85 | backend/server.js:27960 | DELETE /api/products/:id | N | master; 27974: Product.findOneAndUpdate |
| 86 | backend/server.js:27994 | PUT /api/accounts/:id | B | opening; 28093: Account.findOneAndUpdate |
| 87 | backend/server.js:28131 | PATCH /api/accounts/:id/mapping-details | N | master; 28196: Account.findOneAndUpdate; 28210: AreaToPartyMapping.updateMany |
| 88 | backend/server.js:28278 | DELETE /api/accounts/:id | B | opening; 28292: Account.findOneAndUpdate |
| 89 | backend/server.js:28312 | PUT /api/other-accounts/:id | B | otheropening; 28342: OtherAccount.findOneAndUpdate |
| 90 | backend/server.js:28368 | DELETE /api/other-accounts/:id | B | otheropening; 28383: OtherAccount.findOneAndUpdate |
| 91 | backend/server.js:28403 | PUT /api/gst/:id | N | master; 28426: GST.findOneAndUpdate |
| 92 | backend/server.js:28462 | DELETE /api/gst/:id | N | master; 28477: GST.findOneAndUpdate |
| 93 | backend/server.js:28497 | PUT /api/salesmen/:id | N | master; 28524: Salesman.findOneAndUpdate |
| 94 | backend/server.js:28555 | DELETE /api/salesmen/:id | N | master; 28570: Salesman.findOneAndUpdate |
| 95 | backend/server.js:28590 | PUT /api/areas/:id | N | master; 28610: Area.findOneAndUpdate |
| 96 | backend/server.js:28644 | DELETE /api/areas/:id | N | master; 28659: Area.findOneAndUpdate |
| 97 | backend/server.js:28679 | PUT /api/godowns/:id | N | master; 28699: GodownModel.findOneAndUpdate |
| 98 | backend/server.js:28734 | DELETE /api/godowns/:id | N | master; 28749: GodownModel.findOneAndUpdate |
| 99 | backend/server.js:28768 | PUT /api/customer-banks/:id | N | master; 28797: CustomerBank.findOneAndUpdate |
| 100 | backend/server.js:28826 | DELETE /api/customer-banks/:id | N | master; 28833: CustomerBank.findOneAndUpdate |
| 101 | backend/server.js:28853 | DELETE /api/sales/:id | S | salesedit; indirect only or no DB mutation � see profile |
| 102 | backend/server.js:28988 | PUT /api/quotation/:id | N | quotation; 29483: QuotationHeader.findOneAndUpdate |
| 103 | backend/server.js:29549 | DELETE /api/quotation/:id | N | quotation; 29579: QuotationHeader.findOneAndUpdate |
| 104 | backend/server.js:29596 | DELETE /api/purchase/:id | S | purchase; 29653: Stock.updateOne; 29667: PurchaseHeader.findOneAndUpdate |
| 105 | backend/server.js:29707 | DELETE /api/credit-note/:id | B | allocationNote; 29870: CreditNote.findOneAndUpdate; 29898: SalesHeader.updateOne |
| 106 | backend/server.js:29970 | DELETE /api/create-load/:id | B | load; 30029: SalesHeader.updateMany; 30047: LoadHeader.findOneAndUpdate |
| 107 | backend/server.js:30068 | DELETE /api/settle-load/:id | B | load; 30108: SalesHeader.updateMany; 30125: SettleLoad.findOneAndUpdate |
| 108 | backend/server.js:30295 | PUT /api/bill-print/settings | N | master; 30363: BillPrintSettings.findOneAndUpdate |
| 109 | backend/service.js:164 | POST /services | N | master; 167: Service.create |
| 110 | backend/service.js:172 | PUT /services/:id | N | master; 176: Service.findOneAndUpdate |
| 111 | backend/service.js:183 | DELETE /services/:id | N | master; 192: Service.findOneAndUpdate |
| 112 | backend/service.js:225 | POST /sales-services | T | service; 236: SalesService.create |
| 113 | backend/service.js:241 | PUT /sales-services/:id | T | service; 248: voucher.save |
| 114 | backend/service.js:253 | DELETE /sales-services/:id | T | service; 256: SalesService.findOneAndUpdate |
| 115 | backend/transaction.js:358 | GET /find-cheque-details | N | read; indirect only or no DB mutation � see profile |
| 116 | backend/transaction.js:902 | POST /payment | B | allocation; 934: Payment.create |
| 117 | backend/transaction.js:968 | PUT /payment/:id | B | allocation; 997: payment.save |
| 118 | backend/transaction.js:1017 | DELETE /payment/:id | B | allocation; 1035: payment.save |
| 119 | backend/transaction.js:1051 | POST /receipt | B | allocation; 1164: sales.updateOne; 1176: sales.updateOne; 1185: sales.updateOne; 1243: Receipt.create |
| 120 | backend/transaction.js:1270 | POST /receipt | T | legacyreceipt; 1454: Receipt.create |
| 121 | backend/transaction.js:1981 | PUT /receipt/:id | T | legacyreceipt; 2291: Receipt.findOneAndUpdate |
| 122 | backend/transaction.js:2354 | DELETE /receipt/:id | B | allocation; 2384: sales.updateOne; 2400: receipt.save |
| 123 | backend/transaction.js:2498 | POST /cheque-bounce | T | cheque; 2567: ChequeBounce.create |
| 124 | backend/transaction.js:2595 | PUT /cheque-bounce/:id | T | cheque; 2674: ChequeBounce.findOneAndUpdate |
| 125 | backend/transaction.js:3193 | DELETE /cheque-bounce/:id | T | cheque; 3198: ChequeBounce.findOneAndUpdate |
| 126 | backend/transaction.js:3212 | POST /pdc-docket | T | cheque; 3223: PDCDocket.create |
| 127 | backend/transaction.js:3243 | PUT /pdc-docket/:id | T | cheque; 3331: PDCDocket.findOneAndUpdate |
| 128 | backend/transaction.js:3915 | DELETE /pdc-docket/:id | T | cheque; 3921: PDCDocket.findOneAndUpdate |
| 129 | backend/transaction.js:3937 | POST /contra | T | cheque; 3948: Contra.create |
| 130 | backend/transaction.js:3965 | PUT /contra/:id | T | cheque; 4029: Contra.findOneAndUpdate |
| 131 | backend/transaction.js:4527 | DELETE /contra/:id | T | cheque; 4533: Contra.findOneAndUpdate |
| 132 | backend/transaction.js:4613 | POST /collection-voucher | T | cheque; 4624: CollectionVoucher.create |
| 133 | backend/transaction.js:4640 | PUT /collection-voucher/:id | T | cheque; 4717: CollectionVoucher.findOneAndUpdate |
| 134 | backend/transaction.js:5250 | DELETE /collection-voucher/:id | T | cheque; 5257: CollectionVoucher.findOneAndUpdate |

## Indirect mutation and coverage cross-check

- accounting.js postBalancedJournal (21�34): Journal.create, optional caller session, source tenant and documentDate; no authenticated request. reverseSourceJournal (37�54): selects latest posted original, creates opposite event, changes original.status; actual supplied reversal date retained. Requires caller preflight of source/original/latest/reversal dates. Optional-session public contract means standalone use needs separately approved architecture; no common guard was added.
- counters.js nextDocumentNumber (12�48): counter floor upsert then increment, financialYearFor(documentDate), caller tenant/session. Same-session protection belongs before BOTH updates. Sales create intentionally omits session; Sales Service now approved to change, other caller rules untouched. QUOTATION and LOAD counters inherit their source classification.
- openingBalances.js saveAccountWithOpenings, lookupOpeningSource, allocateOpening, releaseOpening, reverseOpeningAwareJournal: B, see opening/allocation profiles. Account save callback and mapping sync are part of the dependency graph, not just Journal.updateMany. allocate uses tenant-owned persisted opening postingDate and allocatedAmount; release signature lacks tenant and trusts caller-held ID. Reversal wrapper changes reversal status for opening allocations; preserve Phase 2A behavior.
- transaction.js reservePaymentAllocations/releasePaymentAllocations (around 535�624): purchase paymentAllocated and opening allocatedAmount updates with caller session; persisted purchase ID/date and account ownership must be resolved before mutation; releasePurchase update is by stored ID. Receipt primary create/delete directly mutate sales receiptAllocated; prior receipt sums and _desktopImport repair paths included. Posted receipt PUT refuses POSTED; non-POSTED branch remains a writer. Second POST is shadowed, not silently counted as enforced.
- server.js applyPurchaseStockMovement (around 10800), applySalesStockMovement (around 12100), moveStockForAdjustment (14641), applyDebitNoteStockMovement (around 23500), applyCreditNoteStockMovement (around 25300), adjustSalesBillForCreditNote (around 25500), cancelSalesBill (22645): caller transaction and tenant, stock qty/rates, original/replacement headers, linked invoices and stock movements. Category inherited from each parent profile; no separate public route. cancelSalesBill original date and businessDateIST reversal/movement all need checks.
- p0Features.js recordStockMovements (64): deletes prior source movements on replacement and inserts consolidated rows in caller session; financial date is supplied movementDate. Requires parent preflight before deletes, including zero-journal paths. validateCustomerCredit is read-only; no writer classification.
- desktopImportBatch.js runDesktopImport / requestDesktopTransaction / rollbackDesktopImport: B, dispatch profile. Mapped endpoints and repair are not bypasses around target route guards. resolveDesktopTransactionIds reads tenant references before HTTP dispatch; target must resolve again in its transaction. ensureDesktopPurchaseSuppliers and ensureDesktopReceiptBankAccounts only insert master defaults (no opening events); rollback can delete Account masters imported with openingBal, so policy/tenant/compensation boundary unresolved. Pause/resume controls are indirect orchestration, preflight/generate/upload are N.
- importRoutes.js syncProductGstRates: N, postcommit GST master synchronization only. importConfig Account openingBal lacks authoritative date (B); other master definitions N. masterUsageGuard only reads usage. syncAccountCompanyMappings writes mappings only (N), but participates in opening save transaction when present.
- audit.js audit write; auth.js password upgrade and rate-limit counters; financialPeriods.js control revision/configuration transitions; setup/security defaults; company series, product mappings, print settings and master usage checks: N source financial writers. Financial-period validation revision write is intentionally in the protected transaction.
- E-invoice export is a filesystem artifact; no invoice update or GST adjustment. Quotation routes only quote snapshots/counter. Load routes conservatively B for money snapshots/settlement receipt dependencies, including GET /api/load-transfer/load-bills automatic repair (not a read-only route).

Cross-check: route-source-evidence.json records every parsed route and nested calls; mutation-source-evidence.json records standalone and nested mutation calls. No additional route with direct DB mutation was found outside the 134 candidates. Independent search also checked insertOne, deleteOne, findById/One deletion/update/replace/remove, aggregation $out/$merge, raw collections, dynamic route registration and nested backend/scripts. The receipt-index verification script is administrative schema tooling, not a financial writer; it was not run. Functions dispatched over HTTP and callback/helper mutations are covered above. This does not claim runtime or external-writer exhaustiveness.

## Additional approvals / next groups

Unapproved architecture: independent sales-create numbering; F4 bill type; cheque bounce/PDC/contra/collection (all CRUD); dormant legacy receipt POST and non-POSTED edit; legacy account opening save(null); nontransactional load snapshot/settlement writers and GET repair; import master rollback ownership/compensation. Batch lock needs same-session source reads if policy makes it financial. Optional-session shared journal callers require authenticated caller context before defensive common integration.

Business decisions: allocation reference/source periods, credit-note linked invoice periods, legacy opening history/supersession and summary-only balances, stock UTC/default/IST movement treatment, batch rate/lock effective date, load/settlement/generated receipt dates and import/compensation semantics. None implemented.

Recommended next bounded group: journal-voucher POST/PUT/DELETE only (S), after approving integration scope with persisted/latest journal and old/new vDate preflight; retain current reversals/idempotency/permissions. Do not combine with opening history or allocation policy work.

## Authentication and scan clarification

All mounted /api runtime routes pass authenticateApi (server.js:107): JWT verification, active principal/sessionVersion resolution and recursive tenant mismatch rejection across body/query/params/headers (auth.js:135�165). Body-derived tenant fields identified above therefore do not establish an HTTP cross-tenant vulnerability; retain this outer protection and compare req.auth inside protected transactions. Missing route-specific grants are reported separately from global authentication. New tests directly exercise the Sales Service route middleware and handlers, not the full JWT/HTTP transport.

The parsed mutation list contains 190 create/save/update/insert/bulk/delete sites from the original scan. Independent extended-method search additionally verifies companyWiseSeries.js:178 findOneAndDelete (N, company-series configuration), already classified in candidate row 3. No financial writer was inferred solely from names. Backend scripts/verifyReceiptIndex.js reads query plans/indexes and can explicitly create a nonunique receipt lookup index; no financial data writer and not executed.
