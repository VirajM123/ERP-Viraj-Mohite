# Report layout inventory

The Reports menu selects reports by name inside the dashboard; these are not separate browser URL routes. All entries below have shared report presentation rules. Individual browser workflows and output comparisons have not been verified. Catalog columns are supplied by the API; filters are listed in `CatalogReport.jsx`. Other report-specific criteria, columns, totals and exports remain in `Report.jsx`.

| Report | Family | Renderer | Data endpoint |
| --- | --- | --- | --- |
| Party Wise Sales Report | Sales | Report.jsx | `/api/reports/party-sales` |
| All Party Wise Sales Report | Sales | Report.jsx | `/api/reports/all-party-sales` |
| Find Cheque Details | Financial | Report.jsx | `/api/transaction/find-cheque-details` |
| Product Wise Sales Report | Sales | Report.jsx | `/api/reports/product-wise-sales` |
| All Product Wise Sales Report | Sales | Report.jsx | `/api/reports/all-product-wise-sales` |
| Stock And Sales Report | Sales | Report.jsx | `/api/reports/stock-and-sales` |
| Company/Bill Wise Purchase Report | Purchase | Report.jsx | `/api/reports/purchase-analysis` |
| Company Wise Purchase Report | Purchase | Report.jsx | `/api/reports/company-wise-purchase` |
| Product Wise Purchase Report | Purchase | Report.jsx | `/api/reports/purchase-analysis` |
| Current Stock Report | Stock | Report.jsx (P0) | `/api/reports/current-stock` |
| As On Date Stock Report | Stock | Report.jsx (P0) | `/api/reports/as-on-date-stock` |
| Damage Stock Report | Stock | Report.jsx (P0) | `/api/reports/damage-stock` |
| Product Ledger | Stock | Report.jsx (P0) | `/api/reports/product-ledger` |
| Sales GST Register | GST | Report.jsx (GST) | `/api/reports/gst/sales-register` |
| Purchase GST Register | GST | Report.jsx (GST) | `/api/reports/gst/purchase-register` |
| CRN GST Register | GST | Report.jsx (GST) | `/api/reports/gst/crn-register` |
| GST Summary | GST | Report.jsx (GST) | `/api/reports/gst/summary` |
| GSTR1 Report | GST | Report.jsx (GST) | `/api/reports/gst/gstr1` |
| General Ledger | Financial | Report.jsx (P0) | `/p0/reports/financial/general-ledger` |
| Party Ledger | Financial | Report.jsx (P0) | `/p0/reports/financial/party-ledger` |
| Trial Balance | Financial | Report.jsx (P0) | `/p0/reports/financial/trial-balance` |
| Cash Book | Financial | Report.jsx (P0) | `/p0/reports/financial/cash-book` |
| Bank Book | Financial | Report.jsx (P0) | `/p0/reports/financial/bank-book` |
| Day Book | Financial | Report.jsx (P0) | `/p0/reports/financial/day-book` |
| Profit & Loss | Financial | Report.jsx (P0) | `/p0/reports/financial/profit-loss` |
| Balance Sheet | Financial | Report.jsx (P0) | `/p0/reports/financial/balance-sheet` |
| Stock Movement Ledger | Stock | Report.jsx (P0) | `/api/p0/reports/stock-movement` |
| Credit Control Report | Control | Report.jsx (P0) | `/p0/reports/credit-control` |
| Party Outstanding Report | Customer | Report.jsx (P0) | `/p0/reports/party-outstanding` |
| Permission Audit Report | Control | Report.jsx (P0) | `/p0/reports/permission-audit` |
| Audit Trail Report | Control | Report.jsx (P0) | `/p0/reports/audit-trail` |
| Dashboard Reconciliation | Control | Report.jsx (P0) | `/p0/dashboard/summary` |
| Sales Register / Invoice Register | Sales | CatalogReport.jsx | `/api/p0/reports/catalog/sales-register` |
| Sales Summary Report | Sales | CatalogReport.jsx | `/api/p0/reports/catalog/sales-summary` |
| Daily Sales Report | Sales | CatalogReport.jsx | `/api/p0/reports/catalog/daily-sales` |
| Monthly Sales Comparison Report | Sales | CatalogReport.jsx | `/api/p0/reports/catalog/monthly-sales` |
| Salesman Wise Sales Report | Sales | CatalogReport.jsx | `/api/p0/reports/catalog/salesman-sales` |
| Area / Route Wise Sales Report | Sales | CatalogReport.jsx | `/api/p0/reports/catalog/area-sales` |
| Company Wise Sales Report | Sales | CatalogReport.jsx | `/api/p0/reports/catalog/company-sales` |
| Counter Sales Summary | Sales | CatalogReport.jsx | `/api/p0/reports/catalog/counter-sales-summary` |
| Sales Return / Credit Note Register | Sales | CatalogReport.jsx | `/api/p0/reports/catalog/sales-return-register` |
| Sales Return Analysis by Product and Customer | Sales | CatalogReport.jsx | `/api/p0/reports/catalog/sales-return-analysis` |
| Top Selling Products Report | Sales | CatalogReport.jsx | `/api/p0/reports/catalog/top-selling-products` |
| Purchase Register / Supplier Invoice Register | Purchase | CatalogReport.jsx | `/api/p0/reports/catalog/purchase-register` |
| Purchase Summary Report | Purchase | CatalogReport.jsx | `/api/p0/reports/catalog/purchase-summary` |
| Supplier Wise Purchase Report | Purchase | CatalogReport.jsx | `/api/p0/reports/catalog/supplier-purchase` |
| Purchase by Company and Supplier Report | Purchase | CatalogReport.jsx | `/api/p0/reports/catalog/company-supplier-purchase` |
| Purchase Rate / Last Purchase Rate Report | Purchase | CatalogReport.jsx | `/api/p0/reports/catalog/purchase-rate` |
| Purchase Return / Debit Note Register | Purchase | CatalogReport.jsx | `/api/p0/reports/catalog/purchase-return-register` |
| Purchase Return Analysis by Product and Supplier | Purchase | CatalogReport.jsx | `/api/p0/reports/catalog/purchase-return-analysis` |
| Stock Valuation Report | Stock | CatalogReport.jsx | `/api/p0/reports/catalog/stock-valuation` |
| Godown Wise Stock Report | Stock | CatalogReport.jsx | `/api/p0/reports/catalog/godown-stock` |
| Batch Wise Stock Report | Stock | CatalogReport.jsx | `/api/p0/reports/catalog/batch-stock` |
| Near-Expiry Stock Report | Stock | CatalogReport.jsx | `/api/p0/reports/catalog/near-expiry-stock` |
| Expired Stock Report | Stock | CatalogReport.jsx | `/api/p0/reports/catalog/expired-stock` |
| Reorder / Minimum Stock Report | Stock | CatalogReport.jsx | `/api/p0/reports/catalog/reorder-stock` |
| Stock Adjustment Register | Stock | CatalogReport.jsx | `/api/p0/reports/catalog/stock-adjustments` |
| Batch and Expiry Master List | Stock | CatalogReport.jsx | `/api/p0/reports/catalog/batch-expiry-list` |
| Customer Ageing Report | Customer | CatalogReport.jsx | `/api/p0/reports/catalog/customer-ageing` |
| Bill Wise Outstanding Report | Customer | CatalogReport.jsx | `/api/p0/reports/catalog/customer-ageing` |
| Customer Statement of Account | Customer | CatalogReport.jsx | `/api/p0/reports/catalog/customer-statement` |
| Collection by Salesman Report | Customer | CatalogReport.jsx | `/api/p0/reports/catalog/collection-by-salesman` |
| Receipt Allocation and Unallocated Receipt Report | Customer | CatalogReport.jsx | `/api/p0/reports/catalog/receipt-allocation` |
| Supplier Outstanding Report | Supplier | CatalogReport.jsx | `/api/p0/reports/catalog/supplier-outstanding` |
| Bill Wise Payables Report | Supplier | CatalogReport.jsx | `/api/p0/reports/catalog/supplier-outstanding` |
| Supplier Debit Note Register | Supplier | CatalogReport.jsx | `/api/p0/reports/catalog/purchase-return-register` |
| Supplier Statement of Account | Supplier | CatalogReport.jsx | `/api/p0/reports/catalog/supplier-statement` |
| Collection Register | Customer | CatalogReport.jsx | `/api/p0/reports/catalog/collection-register` |
| E-Invoice Register and IRN Status | GST | CatalogReport.jsx | `/api/p0/reports/catalog/e-invoice-register` |
| E-Way Bill Register and Status | GST | CatalogReport.jsx | `/api/p0/reports/catalog/eway-bill-register` |
| Journal Voucher Register | Financial | CatalogReport.jsx | `/api/p0/reports/catalog/journal-voucher-register` |
| Load / Dispatch Register | Distribution | CatalogReport.jsx | `/api/p0/reports/catalog/load-dispatch-register` |
| Load Settlement Summary | Distribution | CatalogReport.jsx | `/api/p0/reports/catalog/load-settlement-summary` |
| Load Settlement and Collection Summary | Distribution | CatalogReport.jsx | `/api/p0/reports/catalog/load-settlement-summary` |
| Product / Item List | Master | CatalogReport.jsx | `/api/p0/reports/catalog/product-list` |
| Product Price List | Master | CatalogReport.jsx | `/api/p0/reports/catalog/product-price-list` |
| Inactive / Blocked Master Records | Master | CatalogReport.jsx | `/api/p0/reports/catalog/inactive-masters` |
| Customer / Party List | Master | CatalogReport.jsx | `/api/p0/reports/catalog/customer-list` |
| Supplier List | Master | CatalogReport.jsx | `/api/p0/reports/catalog/supplier-list` |
| Company List | Master | CatalogReport.jsx | `/api/p0/reports/catalog/company-list` |
| Area List | Master | CatalogReport.jsx | `/api/p0/reports/catalog/area-list` |
| Salesman List | Master | CatalogReport.jsx | `/api/p0/reports/catalog/salesman-list` |
| Godown List | Master | CatalogReport.jsx | `/api/p0/reports/catalog/godown-list` |

Total menu entries: 83; catalog definitions: 51. The E-Invoice Management screen is separately implemented in `EInvoiceReport.jsx` and received matching table colours.
