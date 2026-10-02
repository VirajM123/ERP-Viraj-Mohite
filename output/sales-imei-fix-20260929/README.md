# Invoice 22: sales serial lookup correction

Replace the existing WinImportData.vb code-behind with the complete file here. WinImportData.txt is an identical copy for pasting. Keep the existing Designer, resources and other project files. Do not add build.cjs or checks.cjs to the ERP project.

Built from the attachment supplied in this request. Only ValidateSalesIMEIForCurrentBill and SaveSalesIMEIStockOut change. All code outside these two routines is checked for exact equality after line-ending normalization. Purchase, GST, totals, invoice grouping, override and normal product logic are preserved.

The supplied database row has IMEI 359470360571444, SysProdCode 189 and InStock Y. The original lookup also requires either the grid's SysProdCode or Mas_Product.ProdCode to match. Existence of the IMEI alone does not meet that condition. There is no purchase-date restriction in this lookup, so the supplied purchase date of September 29 versus the September 26 sale does not explain this particular rejection.

Confirmed code inconsistencies corrected:

- Both sales serial queries now recognize T_CommonProduct.CompProdCode, which the existing product mapping logic already supports. The mapped SysProdCode remains preferred. A blank code cannot create a fallback match. IMEI-only matching is not used.
- Stock-out now trims serial spaces exactly as validation does. Previously a leading space could pass validation and then fail the update.
- The no-match message includes the mapped product ID and selected server/database, and accurately explains that the product/serial combination was not found.

The exact invoice 22 cause remains unconfirmed: the exact error text, grid mapping and live database were not provided. This correction resolves the identified mapping/whitespace inconsistencies; it cannot guarantee that invoice 22 imports if its underlying problem differs. Use diagnose-invoice-22.sql against the database shown by the new message to compare product 189 and its mappings. An unrelated mapped product, different year database or altered Excel IMEI requires correcting that source/mapping; existing stock checks remain in effect.

Validation: node build.cjs verifies scope and generates complete files. node checks.cjs executes the generated lookup/update SQL against in-memory fixtures using SQLite with TOP/ISNULL translation. Cases cover exact ID, master code, common-product alias, missing/wrong IMEI, wrong/blank code, padded serial, stock-out, same-bill retry and rejection of another sale. These checks are not a SQL Server integration test or a full ERP compile; the application dependencies/database are unavailable.

Existing behavior retained: serial stock-out runs after Add_Sales. This patch does not make invoice saving and serial updates one atomic transaction, change product IDs on sales lines, or change TOP 1 precedence for existing fallback matches. If a serial belongs to a genuinely different product, correct the mapping before retrying the invoice.
