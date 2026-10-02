# Analysis of the supplied JNJ import

The complete corrected form is `WinImportData.vb`; `WinImportData.txt` is an identical copy. Replace the code in the existing WinImportData form, keeping its Designer and resources. This was built from the attachment supplied in this request, not the earlier correction already present in the workspace.

## What the actual workbook establishes

`D:\JNJ_PurchaseImport.xls`, Sheet2, contains 1,635 data rows and 21 distinct GRNs, numbered 1 through 21. Each GRN has one contiguous block and one invoice number. All rows have series GRN. There is no split group in this file.

The stored GRN numbers are text. Their file order is 1, 10–19, 2, 20, 21, 3–9. The original sort preserves this text ordering. It is confusing, but it does not by itself drop rows or cause a duplicate.

The eight GRNs after number 13 contain 266 data rows:

| GRN | Invoice | Excel rows | Item rows |
|---|---|---|---:|
| 14 | PO\00015 | 1090–1099 | 10 |
| 15 | PO\00017 | 1100–1104 | 5 |
| 16 | PO\00020 | 1105–1264 | 160 |
| 17 | PO\00019 | 1265–1304 | 40 |
| 18 | PO\00022 | 1305–1328 | 24 |
| 19 | PO\00024 | 1329–1330 | 2 |
| 20 | PO\00023 | 1421–1430 | 10 |
| 21 | PO\00021 | 1431–1445 | 15 |

## Why the reported behavior cannot be attributed to one proven cause yet

The supplied source already contains a dedicated IMEI grouping loop and an explicit T_Pur_Header lookup using company, series and GRN. The duplicate message is displayed when that lookup returns a row. Successful presence in the database is consistent with a genuine duplicate on a later import attempt; the popup alone does not establish when the existing purchase was inserted.

Nothing in the examined loop imposes a 13-invoice limit. Each GRN should be attempted. Product mapping failure, invalid header/date data, SQL errors or Add_Purchase behavior may reject a group. The source workbook does not contain the resolved SysProdCode values, and neither the live database nor the Add_Purchase definition is available here. Therefore the exact historical reason for GRNs 14–21, and whether GRNs 2–9 were already present before the run, cannot be proved from these two files alone.

GRN 14 starts with product SM-S741BLGC; GRN 15 uses SM-X400NZSE. Check their resolved mappings if the new report identifies missing products. Their presence in Excel does not establish their presence in the product master.

## Confirmed weaknesses corrected

- The original header-read catches log an error and continue, allowing stale or partially refreshed header state to survive. The corrected path fails the current group instead.
- Original grouping uses only series and number, although its duplicate key also includes company. The corrected path uses company, series and integer GRN consistently and orders GRNs numerically.
- The old duplicate popup does not compare or identify the supplier invoice. The corrected lookup uses local parameterized SQL, retains the original GRN key, and checks the matched invoice/supplier. An occupied GRN belonging to another invoice is explicitly a key conflict, not a duplicate invoice; it is never overwritten.
- Exceptions in SaveBill were swallowed after a popup, and the final summary retained only the most recent group error, which later successes could clear. The corrected controller captures every group result and continues after an individual failure.
- An ExecuteNonQuery return was treated as success without checking the requested header. The corrected IMEI path verifies the company/series/GRN and invoice/supplier header before marking rows imported. This is a header check, not proof that all detail/serial/accounting writes succeeded internally.
- Previously marked complete groups are skipped without a new duplicate warning; partially marked groups are explicitly rejected for review.
- Blank series are preserved on the IMEI purchase path instead of being initialized to the literal value 0.

The final dialog gives the location of a uniquely named PurchaseImport text report in the Windows temporary folder. It lists every attempted GRN, invoice, company, working row range, outcome and error. A setup failure is explicitly labeled as stopped with remaining rows unattempted. Row numbers in this report refer to the sorted working grid, not original Excel rows.

## Scope and verification

Changes are confined to the existing IMEI purchase path plus its summary and helpers. Non-IMEI grouping and duplicate behavior are retained. The full Add_Purchase command and all of its parameter assignments are unchanged. Purchase arithmetic, GST, accounting, stock and optional serial-number persistence are retained. An automated source comparison verified that 75 other existing methods were unchanged.

The actual corrected grouping and helper code compiled under the installed VB.NET compiler. Eight regression scenarios passed using a DataTable-backed grid adapter and simulated database/save operations. The tests use all 1,635 workbook rows and verify 21 complete groups, numeric order, retry behavior, continuation through GRN 21 after a simulated GRN 14 failure, existing invoices, invoice key conflicts, company separation, normalized numbers, invalid numbers and partially marked groups.

The complete desktop application was not built: its VB project, Designer, C1 control and Ultimate dependencies are not provided. No live purchases were imported and no database writes were made. The regression results establish traversal and classification behavior, not end-to-end SQL correctness. Existing partial purchases, missing product mappings, and stored-procedure defects require their own database investigation; this form does not silently repair or overwrite them.
