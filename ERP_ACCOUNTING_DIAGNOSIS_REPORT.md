# ERP accounting diagnosis and proposed corrections

Date: 5 November 2026

## Scope and result

This report reviews accounting correctness separately from scalability and reliability. Only this report was created. Application source, configuration, dependencies, database records and indexes were not changed. The existing performance report and pre-existing edit to `src/api/config.js` were preserved.

The review covered journal posting/reversal, financial reports, receipts/payments, opening balances, sales/purchases, credit/debit notes, contra and cheque-bounce vouchers, service sales, stock valuation and financial calculators. Evidence is from local source and selected existing tests. No live company books, bank statements, GST returns or production database were inspected. Confirmed code behavior does not establish the amount of any historical misstatement; that requires reconciliation against actual data. This is a software accounting diagnosis, not an audit opinion or tax compliance certification.

**Main finding:** several paths can produce balanced journals while still producing incorrect account balances, incomplete books or misleading financial statements. Fixing performance alone will not resolve these accounting problems.

## Priority register

| ID | Finding | Severity | Confidence |
|---|---|---|---|
| A01 | Reversal status/report mismatch can leave opposite balances after cancellation | Critical | Confirmed incompatible code paths |
| A02 | Financial statements classify accounts using text in account codes | Critical | Confirmed |
| A03 | Balance sheet and trial balance date ranges omit brought-forward activity | High | Confirmed for reviewed financial endpoint |
| A04 | Service sales are saved without general-ledger posting | High | Confirmed in service router |
| A05 | Contra and cheque-bounce saves lack corresponding accounting effects | High | Confirmed in reviewed routes |
| A06 | Party outstanding is not a full receivable/payable reconciliation | High | Confirmed construction gap |
| A07 | Credit notes alter original invoice figures as well as creating separate return records | High | Confirmed mutation; reporting impact needs fixture reconciliation |
| A08 | Journal validation checks totals but permits invalid line structures/account identities | High | Confirmed validation gap |
| A09 | Sales calculator charges the quantity described as free | High | Confirmed arithmetic; commercial policy must be confirmed |
| A10 | Excess combined discounts and excess credit adjustment are silently clamped | High | Confirmed calculator behavior |
| A11 | Inventory cost and financial-report integration are incomplete | High | Confirmed patterns; valuation policy needs confirmation |
| A12 | Tax computation and tax-ledger mapping are inconsistent across modules | High | Confirmed patterns; applicability depends on transaction |
| A13 | No common accounting period-close control found | High | Not found in reviewed posting paths |
| A14 | Financial-year counter scope differs from document uniqueness scope | Medium | Confirmed design mismatch; numbering policy determines impact |

Critical means the affected result should not be treated as an authoritative accounting balance until reconciled. Severity describes potential consequence, not measured loss.

## A01 — Journal reversals and report selection disagree

Evidence: `backend/accounting.js`, `reverseSourceJournal`, creates an opposite journal through `postBalancedJournal`, whose default status is POSTED, then changes the original journal to REVERSED. `backend/p0Features.js:174–180`, `financialRows`, selects only POSTED journals. Sales/purchase/note edit and cancellation routes use this helper. `backend/openingBalances.js:193–199`, `reverseOpeningAwareJournal`, additionally hides the reversal only when the voucher contains an opening allocation.

Example using a sale without tax:

| Stage | Expected customer balance | Balance from POSTED-only selection |
|---|---:|---:|
| Original sale 100 | Dr 100 | Dr 100 |
| Cancel sale | 0 | Cr 100: only the reversal remains visible |
| Edit original sale to 120 | Dr 120 | Dr 20: reversal 100 plus new posting 120 |

A voucher containing opening allocations can behave differently because its reversal is also marked REVERSED. The same accounting action therefore has inconsistent ledger semantics across paths. Reversal records also share source type/id with originals, so repeated edits/cancellations need explicit original-versus-reversal selection tests.

Proposed correction: choose one model consistently. An immutable accounting-event ledger normally includes the original, its reversal, and any replacement in reporting, with each event's effective date preserved. A current-version model excludes both superseded original and its reversal; that model additionally needs a separate historical reporting design. Do not merely change the status filter globally without checking openings and edit history.

Acceptance: create/edit/cancel each voucher type, including opening allocations; compare ledger and subledger after every step. Check reporting before the reversal date, after that date, after two edits, and after cancellation. An edited or cancelled voucher must not leave an unexplained residual.

## A02 — Account classification is based on code spelling

Evidence: `backend/p0Features.js:286–300` filters cash book with `/cash/i`, bank book with `/bank/i`, P&L with `/sales|purchase|income|expense|discount|profit|loss|gst/i`, and balance sheet with an inverse text filter. It does not join a chart-of-accounts classification.

Consequences:

- A bank account coded `1002` can be absent from the bank book.
- Salary expense coded `5001` can be excluded from P&L and included in the balance sheet.
- A customer code containing SALES can be treated as income.
- INPUT_GST and OUTPUT_GST match the P&L rule even though their accounting treatment requires explicit classification. GST can also survive the balance-sheet exclusion rule, creating inconsistent presentation.
- The endpoint returns grouped debit/credit/closing rows, not a complete statement with explicit retained earnings/current-period result and presentation hierarchy.

Proposed correction: assign immutable account IDs and explicit asset/liability/equity/income/expense groups, normal side, cash/bank flags and tax-control attributes. Map system-generated accounts to real ledger accounts. Generate statements from that metadata and approved presentation rules. A balanced trial balance does not prove correct account classification.

Accounting context: ICAI's framework distinguishes financial-statement elements by their economic nature, not account-name fragments: [ICAI framework](https://www.icai.org/post/2007). The appropriate reporting framework and statutory format must be established for the business.

## A03 — Date-filtered balance reports can omit opening activity

Evidence: `financialRows` includes prior activity only when its second argument is true. The financial-report endpoint enables this for general-ledger and party-ledger, but not trial-balance or balance-sheet. With fromDate/toDate, those reports read activity within the range only. Existing `backend/test/ledger-opening.test.js` explicitly verifies that other reports retain their date filter.

Example: bank Dr 1,000 on 31 March, no April movements. A 1–30 April balance sheet can omit that bank balance instead of showing 1,000. Without fromDate the behavior differs, so report filters affect correctness.

Proposed correction: distinguish period movement reports from balances as of a date. Balance sheet requires cumulative balances to the cutoff, including valid migration openings. Trial balance should expose opening, period debit/credit and closing columns. P&L needs its defined period plus appropriate inventory/closing adjustments. Avoid counting source-document references and genuine brought-forward journals twice.

## A04 — Service invoices do not enter the books

Evidence: `backend/service.js:225–258` saves, edits and soft-deletes T_SalesService records without `postBalancedJournal`, journal reversal or a transaction covering financial effects. The reviewed GST router (`backend/gstReports.js:436–506`) loads sales, purchase, credit and debit collections; it does not load T_SalesService. The P0 outstanding report likewise reads sales/purchases/openings only.

Consequence: a saved service invoice can appear in its own workspace while revenue, customer control balance, output tax and financial reports omit it. Its later edit/deletion has no matching journal history in this router. Service tax splitting does derive from saved firm/party states, which is a useful existing control to preserve.

Proposed correction: define the service voucher's accounting lifecycle and integrate ledger, receivables, tax reports and audit history atomically. Reconcile existing service vouchers before considering any controlled historical posting. Do not backfill blindly or assume an external process has never posted them.

## A05 — Contra and bounced-cheque vouchers are isolated records

Evidence: `backend/transaction.js:3939–3950` creates a Contra document but does not debit the destination cash/bank account and credit the source account. The cheque-bounce save at approximately lines 2500–2580 creates ChequeBounce without journal posting, receipt-allocation release or bank/cheque-control adjustment in that path.

Example: a cash deposit of 10,000 needs an increase in bank and decrease in cash. Saving a contra record alone cannot update the general ledger. A receipt already credited to a customer that subsequently bounces needs the correct re-opening/cheque-control treatment; recording a bounce description alone leaves the receipt's prior effects untouched.

Proposed correction: establish source/destination ledger IDs for contra, and explicit cheque states and bank/uncleared-cheque policy. Link a bounce to its original receipt, restore only the appropriate allocations, post charges to approved accounts, and reverse those effects on cancellation. Merely preparing a PDC docket should not itself be assumed to be a bank receipt; define when recognition and clearing occur.

## A06 — Outstanding report does not reconcile all party activity

Evidence: `backend/p0Features.js:201–218` builds outstanding from sale NetAmount minus receiptAllocated, purchase netAmt minus paymentAllocated, and opening rows. It does not incorporate service invoices, general journal adjustments, unallocated customer advances/supplier payments, or standalone credit/debit notes as independent balances. `openingOutstanding` in `backend/openingBalances.js:166–170` uses today's date and current allocation fields rather than an arbitrary historical cutoff.

Consequence: party ledger, outstanding and dashboard can disagree. Current allocation totals cannot reconstruct what was outstanding before a later receipt/payment. Standalone notes and advances need their own settlement visibility even when no bill is available to reduce.

Proposed correction: make a dated allocation subledger cover invoices, returns, opening items, on-account receipts/payments, journals and service sales. Reconcile its net control balance to the GL. Provide separate gross debit/credit items and net balances; do not silently hide credit balances using a zero clamp. Reconstruct historical outstanding using dated allocation/reversal events.

Acceptance examples: advance receipt before invoice; unallocated supplier payment; standalone credit note; journal write-off; backdated invoice; receipt after report cutoff; cancellation after cutoff.

## A07 — Credit notes mutate original sales values

Evidence: `backend/server.js:26374–26421` subtracts creditAmount from the linked sale's NetAmount, and also subtracts GrossAmount, TaxableValue, CGSTAmount, SGSTAmount and IGSTAmount, while creating a separate credit-note journal. `backend/gstReports.js:400–410` builds sales and sales-return sections and subtracts returns in its net summary.

Risk: netted invoice figures plus a separate return deduction can reduce reported sales/tax twice. Header amounts and unchanged invoice items may also describe different values. A later credit note can change a prior-period invoice's figures when that invoice period is re-reported. Exact output depends on each report's header-versus-item field selection, so quantify this with complete saved-document fixtures rather than assuming every report is affected equally.

Proposed correction: preserve original invoice commercial/tax values; represent returns and settlements separately with explicit references. Compute open balance from invoice, allocations and notes. Define whether a credit note is a price adjustment, sales return or settlement credit, and make reports use each event once.

Acceptance: save a sale of 1,000 plus 180 GST, then a return of 100 plus 18 GST. Net sales should reconcile to 900 and net output tax to 162 across GL, sales/return registers and GST summary. Repeat with the return dated in the next month, partial payment, note edit and note cancellation.

## A08 — Balanced totals are the only common journal guard

Evidence: `backend/accounting.js:21–34` verifies finite, positive total debits and equal credits within 0.01, but not nonnegative amounts per line, mutually exclusive debit/credit sides, valid active account membership or currency precision. Journal line schema has Number fields without min/side constraints. `validateJournalLines` in P0 also mainly checks count and equality. Several posting paths fall back from party code to party name or generic SUNDRY accounts.

Examples the common total check cannot distinguish: a line with debit 100 and credit 100; a negative debit offset by another line; a customer name used as a new account code; valid balanced entries to the wrong account. The balance tolerance can accept a small mismatch rather than enforce exact minor-unit equality.

Proposed correction: validate every line against tenant-owned account IDs, allowed posting state, one positive side, finite supported precision and exact rounded totals. Use integer paise or a consistent decimal strategy. Keep free-text names as snapshots rather than ledger keys. Define supported zero-value documents explicitly rather than forcing artificial postings.

## A09 — Free quantity is included in billed sales quantity

Evidence: `backend/financialValidation.js`, `calculateSalesFinancials`, defines chargedQty as qty + free, or box qty * boxPack + free, and calculates gross as chargedQty * rate. Purchase calculation excludes free quantity from the ordinary billed gross.

Read-only arithmetic reproduction: qty 10, free 2, rate 100, GST 0 produces GrossAmount 1,200 and NetAmount 1,200. If free means goods supplied at no commercial charge, expected billed gross is 1,000 while stock movement is 12 units. Tax treatment for promotional supplies must be established separately; no GST legal conclusion is inferred from the field name.

Proposed correction: explicitly separate paid quantity, free stock quantity, billing unit conversion and taxable base. Confirm whether the current rate is intentionally blended across paid/free units before changing historical calculations.

## A10 — Invalid commercial amounts are silently clamped

Evidence: sales discounts are individually limited to gross, but their combined sum is not. commercialNet and taxableBase can be clamped with Math.max(0,...). NetAmount also clamps originalNet minus CreditNoteAmount. Purchase net similarly clamps after adjustments.

Read-only calculator results:

| Input | Current result | Problem to resolve |
|---|---|---|
| Gross 100; TPR 80; scheme 80; GST 18; default VAT mode | Net 18; taxable 100 | Combined discounts 160 are accepted even though gross is 100. |
| Sale 100; CreditNoteAmount 150; GST 0 | Net 0 | Excess credit disappears from net rather than being rejected or carried as an explicit credit. |

A downstream journal balance check may reject some such documents, resulting in a save failure instead of corrupted books. That does not make the calculator correct or give the user an appropriate validation message.

Proposed correction: define combined discount limits and sequence, validate before posting, and route over-credit/overpayment to an explicit advance or credit balance when allowed. Preserve commercially approved negative adjustments through the proper document type.

## A11 — Inventory valuation is not a complete accounting policy

Evidence: dashboard stock value uses current Qty * PRate (`backend/p0Features.js`, summary stock aggregation). Purchase stock updates can overwrite PRate on existing batch records (`backend/server.js:10944–10950`); credit-return stock updates set PRate from the returned item (`26331–26335`). Sales journals credit SALES and OUTPUT_GST but do not post COGS/inventory relief. Purchase journals debit PURCHASE rather than a separately maintained inventory asset.

Consequences: updating the unit rate can revalue all remaining stock in a batch without an explicit valuation journal. For example, combining 10 units at 100 with 10 at 120 at a last rate of 120 values 20 units at 2,400; a weighted-average policy would give 2,200. This illustrates the policy difference, not a claim that the ERP always follows that exact path.

A periodic inventory system can validly post purchases to a purchases account, but then it needs opening/closing stock and cost-of-sales adjustments for correct period profit. A perpetual system needs inventory/COGS postings. Neither should be inferred from the presence of a stock quantity table. The reviewed regex financial report has no explicit closing-stock adjustment mechanism. Damage/expiry and stock-adjustment movements also require reconciliation to the financial books.

Proposed correction: establish the intended inventory method, landed-cost components, return-cost rules and period-end adjustments. Keep effective-dated valuation history and reconcile quantity/value movements to GL controls. Evaluate write-downs where applicable. ICAI AS 2 addresses cost formulas and valuation at the lower of cost and net realisable value: [AS 2](https://kb.icai.org/pdfs/69232asb55316-as2.pdf). Applicability and the chosen policy must be confirmed for the entity.

## A12 — Tax and tax-account mapping need a separate reconciliation

Evidence:

- Goods sales/purchase calculators accept tax rates and tax mode from supplied rows/body; service invoices derive rate and state split from saved masters.
- `calculateSalesFinancials` returns CGST/SGST/IGST but does not add cess fields to its computed totals. A row with rate 100, GST 18 and cess fields still produces net 118 in the standalone calculator.
- Core postings combine CGST/SGST/IGST into INPUT_GST or OUTPUT_GST. Returns use separate INPUT_GST_REVERSAL / OUTPUT_GST_REVERSAL accounts without explicit chart mapping in the financial-report endpoint.
- Purchase financials calculate tcbAmount; journal creation includes net minus GST in PURCHASE, so non-GST adjustments can be absorbed into purchase cost rather than posted to explicit control accounts.

These patterns do not prove every transaction is legally wrong. Cess, withholding, collection taxes, reverse charge, recoverability and place-of-supply rules apply only in particular cases; this review did not establish those legal obligations. It does establish a need for explicit calculation/posting rules and reconciliations.

Proposed correction: centralize transaction-type-specific tax determination, distinguish tax liabilities/recoverable inputs from expense/cost components, map CGST/SGST/IGST/cess and return offsets, and reconcile invoice tax to GST registers and GL. Confirm whether TCB is intended as statutory TCS or another commercial adjustment before assigning it an account. Independently verify legal applicability before implementation.

## A13 — Accounting-period controls are not common to posting paths

Evidence: financial-year date helpers and counters exist, but no shared closed-period check was found in the reviewed journal, sales/purchase, service, opening and voucher posting paths. Batch locks govern stock behavior and are not evidence of a financial period close.

Risk: permitted users may backdate, edit or cancel documents affecting finalized books without a controlled reopen process. The reversal helper can default to the original document date, while some cancellations pass today's date; cutoff policy is not uniform.

Proposed correction: enforce business-date validation, open financial year, period lock, authorized reopen with reason, effective reversal date policy and audit evidence centrally on every accounting mutation, including imports and opening changes. Confirm any external/manual close controls before concluding there is no operational control.

## A14 — Numbering policy and uniqueness need alignment

Evidence: `backend/counters.js` scopes counters by tenant, financial year, document type and series. Sales/purchase/journal/service uniqueness keys shown in their schemas generally omit financial year. Several routes use the latest voucher across years as minimumValue.

Risk: annual counter design suggests yearly numbering, while global minimum/uniqueness can enforce continuing numbers or reject an attempted repeat series/number. This is a document identity and year-end rollover issue, not proof of duplicate posted vouchers; unique indexes already provide useful protection.

Proposed correction: document continuous-versus-annual numbering, include the chosen identity consistently in lookup/allocation/export references and uniqueness rules, and test the 31 March/1 April boundary. Do not reset counters or alter live invoice identities as part of diagnosis.

## Existing controls to preserve

- Core sales/purchase financials are recalculated server-side rather than trusting header totals alone.
- Journal posting has a debit/credit balance check and version uniqueness.
- Many core financial paths use database transactions, idempotency, audit records and allocation guards.
- Opening rows distinguish genuine opening postings from references to existing documents, and guard allocated balances against unsafe edits.
- Receipt/payment workflows contain allocation-release and reversal logic; these need semantic reconciliation rather than removal.

## Verification performed

Read-only execution of the existing suites `ledger-opening.test.js`, `opening-accounting.test.js`, `payment.test.js`, and `debit-note-stock.test.js`: **17 tests passed, 0 failed**. These tests cover selected opening, payment and UI stock behaviors; they do not prove complete accounting correctness. Some explicitly assert the current status/date-filter model, so passing tests do not resolve A01/A03.

The sales-calculator examples in A09/A10/A12 were executed through an in-memory Node invocation importing the existing calculator. No test files or source files were created or edited, and no database connection was opened for those arithmetic examples. Reversal outcomes were traced through source selection rules; no live cancellation/edit was performed.

## Proposed correction and reconciliation order — not implemented

1. Establish the ledger event/reversal model and reconcile cancellation/edit histories (A01). This must precede bulk historical repair.
2. Define chart-of-accounts mappings and opening/as-of report semantics (A02/A03/A08).
3. Complete posting coverage for services, contra and cheque lifecycles; reconcile party subledgers (A04–A06).
4. Make invoice/return representations consistent across GL, outstanding and tax registers (A07/A12).
5. Resolve paid/free quantities, excessive discounts and credit behavior with approved sample invoices (A09/A10).
6. Establish inventory valuation/closing procedures and period locks, then validate year-end identities (A11/A13/A14).

Before any data correction, prepare a dated, tenant-scoped reconciliation showing source document, journal versions, allocations, stock effects and tax-register effects. Identify missing postings separately from duplicate/opposite postings. Produce proposed adjustment journals with reviewer sign-off; do not delete history or regenerate all books indiscriminately.

Required acceptance pack: original/edit/cancel/re-edit for every financial voucher; mixed opening/current allocations; service invoice receipt; cash deposit/withdrawal; bounced and cleared cheque; partial returns; overpayment/advance; prior-period return; cross-year opening/numbering; stock cost change; historical cutoff. Reconcile customer/supplier control totals, cash/bank balances, inventory value, tax controls and period profit. Total debits equalling total credits is necessary but insufficient.

**Conclusion:** the most urgent accounting issue is reversal/report inconsistency, followed by account classification, historical balance reporting and missing module postings. Quantifying the effect on existing company accounts requires a separate read-only reconciliation of actual books. No proposed correction or historical repair has been applied.
