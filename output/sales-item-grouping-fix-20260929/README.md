# Sales item / IMEI grouping correction

## Complete files

- **WinImportData.vb** (or identical **WinImportData.txt**): complete modified software import form. Replace the code in the existing WinImportData form; retain its Designer/resources.
- **Import.vb** (or identical **Import.txt**): complete sales export utility supplied by you, unchanged. Included for completeness; replacing the exporter is not required.
- Helpers are embedded in WinImportData.vb. Do not add the test files, template, or separate GroupingHelpers.vb to the ERP project.

## Result

Five matching S26 sales rows, each with quantity 1 and its own IMEI, are saved as one sales detail with quantity 5. All five serial stock-out records receive that combined detail's StkOutSeqNo, which supplies the link for the existing Free Qty / IMEI selection workflow. Another product is saved on its own detail line. Non-adjacent matching rows in the same bill are supported.

Only Sales with an IMEI column and serial-number products are eligible. Rows must match in product, batch, MRP, rates, tax settings, discount percentages, unit, dates, accounts and other non-additive detail fields. Different prices or batches remain separate to preserve their meaning. Non-serial items are not combined.

The fix combines the final Add_Sales detail strings after the original row calculations, invoice reconciliation and accounting preparation. Quantity, amount, discount and tax amounts are summed as already calculated, retaining original per-row rounding. All 67 emitted detail fields are handled, including the 40-character product name and 50-character scheme name fields. Invoice headers, TCS, accounting entries and source rows are not consolidated or recalculated.

Every original source row and IMEI remains available to the existing duplicate, quantity and stock validation. Only the serial stock-out sequence mapping changes. Purchase, CreditNote and existing calculation/validation code are unchanged. No database was changed while producing these files.

## Existing invoices

Installing this code affects subsequent imports. It does not automatically rewrite already saved invoices. To consolidate an existing invoice, import its **same previously generated sales file with the same TrnSeries/TrnNo** and use the existing override workflow where allowed. The exporter allocates new KDM numbers when generating a new file, so regenerating it is not equivalent to overriding an existing bill. Existing receipt/adjustment restrictions still apply.

## Verification

The actual new VB helper and integration wrapper compile with the installed .NET Framework VB compiler and pass executable tests covering five non-adjacent serial rows, combined quantity, totals, per-row tax rounding, all field widths, serial sequence mapping, multiple IMEIs in one source row, different rate/batch/tax separation, purchase bypass, non-serial bypass, blank/duplicate serial preservation for existing validation, malformed payload rejection and mapping reset between bills.

Automated source comparison confirms that removing the new helper, its sales-only invocation and the serial sequence lookup restores the supplied WinImportData file exactly. The exporter is byte-for-byte identical to your attachment. Every detail string passed to Add_Sales is covered by the grouping helper.

The complete ERP solution, proprietary controls and live billing screen were not built or run. Compile the replacement form in your existing ERP project and verify in a test database: one S26 line with Qty 5, all five IMEIs under Free Qty, unchanged bill value, and an unchanged purchase import.
