# Complete purchase/sales correction

## Install both complete form files

- `Import.vb` is the entire generator from the attachment supplied on 29 September, with purchase/sales corrections integrated. `Import.txt` is identical.
- `WinImportData.vb` is the entire companion importer based on `output/jnj-purchase-fix-20260928/WinImportData.vb`. `WinImportData.txt` is identical.
- Replace the code in the existing **Import** and **WinImportData** forms respectively. Keep each form's existing Designer/resources. Do not replace WinImportData with Import: they are different forms.
- All helpers are embedded in the full form files. Do not add the separate helper/test files to the ERP project.
- Regenerate the purchase/sales files using the updated generator, then use the updated importer. The new format is marked `ImportTotalsVersion=SAM2`. Old files keep their legacy calculation path.

## Behavior

The generator groups by seller, buyer, source invoice and invoice date, orders by date/natural invoice number, preserves detail order inside each invoice, then assigns sequential internal numbers. The existing GRN/KDM series, starting-number database queries, supplier selection, product/IMEI mapping and output paths remain in place. SourceInvoiceNo is preserved for sales as well as purchases.

Line NetAmt remains a line amount. InvoiceNetValueIncludingTCS is a separately identified repeated header amount read once by the importer. TCSAmount is interpreted as a line amount and summed once into InvoiceTCSAmount; an export containing repeated header-level TCS requires a different mapping and should not be treated as this format.

Gross is taxable plus before-tax discounts; rates are derived from gross, so discounts are deducted once. Generic Discount maps to scheme/BVDisc1. Optional SchAmt and CDAmt columns provide a split and must sum to Discount; purchase cash discount uses BVDisc2. No percentage or SCH/CD split is invented from a zero-discount source. This contract treats these discounts as before-tax amounts. Other source discount conventions need a separate mapping.

Decimal parsing and numeric output columns retain paise. Missing/invalid required values, zero/negative quantities, inconsistent repeated header totals, and line reconciliation errors stop generation with a message before export. Existing CreditNote and auxiliary routines are retained.

The importer reads the marked header total once, bypasses whole-rupee rounding for SAM2 and retains the explicit invoice reconciliation adjustment. A matching total produces zero rounding. It retains the ERP's existing CGST/SGST allocation, correcting only a one-paisa component split residual; incompatible tax mappings fail rather than being concealed in rounding. This does not add an IGST/cess mapping absent from the supplied converter.

## Source reconciliation

The supplied workbook has 1,635 detail rows, 21 invoices, and 17 differences between summed line values and the repeated invoice final. All source Discount and TCSAmount values are zero. These differences cannot be removed while preserving both the line values and stated invoice total.

Examples: PO\00002 has -0.30; PO\00001 has +0.08; PO\00018 has -1.00. They are retained explicitly as InvoiceRounding. The code permits up to 0.01 per detail row as a source-precision reconciliation allowance (two rounded source components), and rejects larger discrepancies. This is a validation allowance, not proof of the company's internal rounding method. The values are not forced to zero or disguised as discounts.

## Verification and limits

The actual new VB helpers compile with the installed .NET Framework VB compiler. Executable tests cover all 1,635 supplied rows, 21 contiguous invoice groups and all 21 header totals through both purchase and sales helper paths. They also cover nonzero scheme/cash discount/TCS, natural ordering, different-party invoice collisions, zero rounding, one-paisa tax allocation, altered lines, invalid numbers, conflicting header totals, excessive differences and the legacy-format bypass.

The sales-path workbook cases reuse purchase source amounts to exercise the shared calculation contract; they are not a substitute for a real sales export. No nonzero-discount sales workbook was supplied.

The complete ERP UI/database application has not been built or executed: its project, C1/Ultimate dependencies and runtime configuration are not supplied here. Compile both forms in the existing ERP solution and validate a purchase and a multi-line sale against a test database before using production data. No database changes or imports were performed during this correction.
