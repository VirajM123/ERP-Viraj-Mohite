# Screen-by-screen redesign catalogue

6 November 2026. Proposed concepts derived from current source; application unchanged.

Images are multi-panel review boards, with one named concept panel per screen. They do not specify every tab, modal state, responsive layout or backend feature. Use this catalogue and REVIEW.md as the behavioral guide: generated text, sample numbers and any extra controls are illustrative.

Read [DESIGN-NOTES.md](DESIGN-NOTES.md) for specific corrections to illustrative accounting previews and interpretation of proposed features. The images are layout references, not posting or tax specifications.

| # | Existing workspace / important dialog | Proposed change | Image board |
|---|---|---|---|
| 1 | Login | Reduce login clutter; keep firm selection, clear connection errors and a working recovery path. | [01-access-and-home](01-access-and-home.png) |
| 2 | Firm Registration | Group distributor identity, tax and address fields; validate before registration. | [01-access-and-home](01-access-and-home.png) |
| 3 | Dashboard | Prioritize due collections, dispatch and stock exceptions; show freshness and independent card errors. | [01-access-and-home](01-access-and-home.png) |
| 4 | User Profile | Separate personal preferences from administrator-controlled access; show effective firm and role. | [01-access-and-home](01-access-and-home.png) |
| 5 | Firm Master | Separate legal identity, FY and tax context; protect switching with unsaved work. | [02-organisation](02-organisation.png) |
| 6 | User Master | Show role, firm scope and effective permissions; separate activation from deletion. | [02-organisation](02-organisation.png) |
| 7 | Company Master | Show default supplier relationship and company identity together. | [02-organisation](02-organisation.png) |
| 8 | Customer Bank Master | Group bank, branch and clearing attributes; validate duplicates. | [02-organisation](02-organisation.png) |
| 9 | Product | Group identity, pack/unit conversion, GST/HSN, pricing, reorder and expiry; retain rapid SKU search. | [03-products](03-products.png) |
| 10 | Group Master | Use a small code/name form with usage-aware delete feedback. | [03-products](03-products.png) |
| 11 | Category Master | Expose taxonomy relationship and status in a simple list/editor. | [03-products](03-products.png) |
| 12 | GST Master | Show effective rate and calculation type with tax mapping; validate applicability separately. | [03-products](03-products.png) |
| 13 | Service | Separate service code, SAC/HSN and GST from goods inventory fields. | [03-products](03-products.png) |
| 14 | Scheme | Explain offer eligibility, paid/free quantities, effective dates and discount precedence. | [03-products](03-products.png) |
| 15 | Account | Group identity, credit terms, territory, tax and opening balance; show Dr/Cr and linked outstanding. | [04-accounts-and-territory](04-accounts-and-territory.png) |
| 16 | Other Account | Use explicit ledger class, opening side and posting restrictions. | [04-accounts-and-territory](04-accounts-and-territory.png) |
| 17 | Salesman | Show territory and active assignments beside contact details. | [04-accounts-and-territory](04-accounts-and-territory.png) |
| 18 | Area | Show company/route scope and assigned outlet count. | [04-accounts-and-territory](04-accounts-and-territory.png) |
| 19 | GoDown Master | Keep godown identity, address and operational state visible. | [04-accounts-and-territory](04-accounts-and-territory.png) |
| 20 | Salesman To Area | Use searchable assigned/unassigned areas with salesman/company scope. | [05-mapping-and-openings](05-mapping-and-openings.png) |
| 21 | Area To Party | Select company/area first; bulk assign parties with an explicit change summary. | [05-mapping-and-openings](05-mapping-and-openings.png) |
| 22 | Account Company Area Mappings | Show account-company-area rows with duplicate/conflict feedback. | [05-mapping-and-openings](05-mapping-and-openings.png) |
| 23 | Account Opening Transactions | Distinguish opening posting from existing bill reference; show remaining balance and Dr/Cr reconciliation. | [05-mapping-and-openings](05-mapping-and-openings.png) |
| 24 | Billing | Use keyboard-first grocery grid; separate paid/free qty, pack, batch and tax; show credit exposure and sticky totals. | [06-sales](06-sales.png) |
| 25 | Counter Sales | Optimize barcode entry, tender and change; prevent accidental duplicate submission. | [06-sales](06-sales.png) |
| 26 | Quotation | Show validity, revision status and explicit conversion to invoice. | [06-sales](06-sales.png) |
| 27 | Sales Service | Design a service accounting invoice with service rate, tax, party and posting preview. | [06-sales](06-sales.png) |
| 28 | Create Load | Select route/vehicle/salesman, then eligible bills; show selected counts and value. | [07-distribution](07-distribution.png) |
| 29 | Print Load | Preview a legible dispatch manifest with load context and print controls. | [07-distribution](07-distribution.png) |
| 30 | Settle Load | Reconcile delivered/returned bills, collection modes and shortage before settlement. | [07-distribution](07-distribution.png) |
| 31 | Load Transfer | Show source/destination load, transferable bills and totals before confirmation. | [07-distribution](07-distribution.png) |
| 32 | Bill Print | Retain invoice search and selection; preview print template and output scope. | [07-distribution](07-distribution.png) |
| 33 | E-Invoice | Separate validation, JSON generation and IRN acknowledgement states; expose actionable errors. | [07-distribution](07-distribution.png) |
| 34 | Stock In | Require godown, grocery batch, expiry, quantity and reason; show stock/value effect. | [08-stock-and-returns](08-stock-and-returns.png) |
| 35 | Stock Out | Show available quantity and reason before outward movement. | [08-stock-and-returns](08-stock-and-returns.png) |
| 36 | Self Damage (Godown Damage) | Clearly move saleable quantity into damaged stock with reason. | [08-stock-and-returns](08-stock-and-returns.png) |
| 37 | Damage Stock Out | Show damaged availability, disposition and authorization. | [08-stock-and-returns](08-stock-and-returns.png) |
| 38 | Credit Note | Reference original sales invoice, paid/free returns, tax reversal and saleable/damaged destination. | [08-stock-and-returns](08-stock-and-returns.png) |
| 39 | Debit Note | Reference supplier purchase, eligible return quantity, damage/good source and input-tax adjustment. | [08-stock-and-returns](08-stock-and-returns.png) |
| 40 | Purchase | Match supplier invoice; show pack conversion, paid/free quantity, sequential discounts and tax breakup. | [09-purchase-and-cash](09-purchase-and-cash.png) |
| 41 | Receipt | Show customer bills, receipts, allocations, remaining amount and unapplied advance. | [09-purchase-and-cash](09-purchase-and-cash.png) |
| 42 | Payment | Show supplier bills, allocations, bank/cash and explicit advance balance. | [09-purchase-and-cash](09-purchase-and-cash.png) |
| 43 | Collection Voucher | Show collector/route and bill-wise allocation with cash/cheque/UPI totals. | [09-purchase-and-cash](09-purchase-and-cash.png) |
| 44 | Cheque Bounce | Link original receipt and rejected cheque; show bank charges and proposed effects. | [10-banking-and-journals](10-banking-and-journals.png) |
| 45 | PDC Docket | Separate pending, deposited and cleared cheques; show house bank and clearing date. | [10-banking-and-journals](10-banking-and-journals.png) |
| 46 | Journal Voucher | Validate real ledgers and one side per line; show exact debit/credit difference. | [10-banking-and-journals](10-banking-and-journals.png) |
| 47 | Contra | Show source/destination cash or bank accounts and transfer preview. | [10-banking-and-journals](10-banking-and-journals.png) |
| 48 | General Setup | Use searchable grouped settings, clear defaults and change impact. | [11-administration](11-administration.png) |
| 49 | Company Wise Series Setup | Display document series by company and FY with conflict feedback. | [11-administration](11-administration.png) |
| 50 | Batch Lock and Change Sales Rate | Show batch/godown, old/new price and lock state; require reason for change. | [11-administration](11-administration.png) |
| 51 | Security Setup | Use a module-operation matrix with role/firm context and clear inheritance. | [11-administration](11-administration.png) |
| 52 | Import Data | Stage upload, mapping, validation, preview, commit and rejection download. | [11-administration](11-administration.png) |
| 53 | Import Data From Desktop | Preserve desktop identity mapping, dry-run results and retry-safe outcomes. | [11-administration](11-administration.png) |
| 54 | Party Wise Sales Report | Group sales by selected party; link invoices and show returns separately. | [12-sales-and-purchase-reports](12-sales-and-purchase-reports.png) |
| 55 | All Party Wise Sales Report | Keep all-party totals with search, sorting and export over complete results. | [12-sales-and-purchase-reports](12-sales-and-purchase-reports.png) |
| 56 | Product Wise Sales Report | Group by selected grocery product, pack and quantity/value. | [12-sales-and-purchase-reports](12-sales-and-purchase-reports.png) |
| 57 | All Product Wise Sales Report | Show all-product totals with clear returns and free-quantity columns. | [12-sales-and-purchase-reports](12-sales-and-purchase-reports.png) |
| 58 | Company/Bill Wise Purchase Report | Expand company totals into supplier bills and item details. | [12-sales-and-purchase-reports](12-sales-and-purchase-reports.png) |
| 59 | Product Wise Purchase Report | Show product quantities, discount, tax and landed-cost basis explicitly. | [12-sales-and-purchase-reports](12-sales-and-purchase-reports.png) |
| 60 | Stock And Sales Report | Make opening + inward - outward = closing visible per SKU. | [13-inventory-reports](13-inventory-reports.png) |
| 61 | Current Stock Report | Separate saleable, damaged and reserved quantities with batch/expiry. | [13-inventory-reports](13-inventory-reports.png) |
| 62 | As On Date Stock Report | Use an explicit cutoff date and historical quantity/value basis. | [13-inventory-reports](13-inventory-reports.png) |
| 63 | Damage Stock Report | Show damage batch, reason, age and disposition. | [13-inventory-reports](13-inventory-reports.png) |
| 64 | Product Ledger | Show one product's opening, movements and running quantity by godown. | [13-inventory-reports](13-inventory-reports.png) |
| 65 | Stock Movement Ledger | Link dated movement events to source documents; expose reversals and corrections. | [13-inventory-reports](13-inventory-reports.png) |
| 66 | Sales GST Register | Show outward invoice tax by type and original document. | [14-tax-reports](14-tax-reports.png) |
| 67 | Purchase GST Register | Show supplier invoice tax and return/adjustment references. | [14-tax-reports](14-tax-reports.png) |
| 68 | CRN GST Register | Link credit notes to original invoices and separate tax offsets. | [14-tax-reports](14-tax-reports.png) |
| 69 | GST Summary | Reconcile outward/inward/returns by rate and tax type; show differences. | [14-tax-reports](14-tax-reports.png) |
| 70 | GSTR1 Report | Show outward classifications, validation exceptions and scoped export. | [14-tax-reports](14-tax-reports.png) |
| 71 | General Ledger | Select account; display brought-forward debit/credit and running balance. | [15-financial-reports](15-financial-reports.png) |
| 72 | Party Ledger | Show invoices, notes, advances and allocations with GL reconciliation. | [15-financial-reports](15-financial-reports.png) |
| 73 | Trial Balance | Use explicit as-of balances and chart-of-account classes, opening/movement/closing Dr/Cr. | [15-financial-reports](15-financial-reports.png) |
| 74 | Cash Book | Select a real cash ledger rather than name matching; show running balance. | [15-financial-reports](15-financial-reports.png) |
| 75 | Bank Book | Select bank ledger; distinguish book entry and clearing state. | [15-financial-reports](15-financial-reports.png) |
| 76 | Day Book | List dated accounting documents with source drilldown and debit/credit totals. | [15-financial-reports](15-financial-reports.png) |
| 77 | Profit & Loss | Use period income, cost of sales and expense classes; disclose stock policy. | [15-financial-reports](15-financial-reports.png) |
| 78 | Balance Sheet | Use cumulative as-of assets, liabilities and equity; show reconciliation difference. | [15-financial-reports](15-financial-reports.png) |
| 79 | Reports Catalogue | Show only implemented reports; search titles and retain recent filters. | [16-control-and-report-discovery](16-control-and-report-discovery.png) |
| 80 | Find Cheque Details | Search cheque number and show linked receipt/deposit/bounce chronology. | [16-control-and-report-discovery](16-control-and-report-discovery.png) |
| 81 | Credit Control Report | Show exposure, limits, overdue and permitted override states. | [16-control-and-report-discovery](16-control-and-report-discovery.png) |
| 82 | Party Outstanding Report | Show invoices/openings, notes and advances with explicit cutoff/ageing semantics. | [16-control-and-report-discovery](16-control-and-report-discovery.png) |
| 83 | Permission Audit Report | Explain user/role/module-operation effective access. | [16-control-and-report-discovery](16-control-and-report-discovery.png) |
| 84 | Audit Trail Report | Show actor, date, action, source and before/after detail. | [16-control-and-report-discovery](16-control-and-report-discovery.png) |
| 85 | Dashboard Reconciliation | Show source total, displayed total, difference, scope and data timestamp. | [16-control-and-report-discovery](16-control-and-report-discovery.png) |
| 86 | Company Wise Purchase Report | Group supplier purchases by company with bill drilldown, returns, tax and complete export. | [17-company-wise-purchase-report](17-company-wise-purchase-report.png) |

Source inventory: Dashboard menuItems and allReportItems; Report metadata; Login registration; UserProfileModal; AccountOpeningTransactions and AccountCompanyAreaMappings. Company Wise Purchase Report appears in Report metadata separately from the current company/bill navigation entry. Logout is an action, not a separate workspace. List/create/view/edit should use the same design system; variants are described, not individually rendered for every master.

