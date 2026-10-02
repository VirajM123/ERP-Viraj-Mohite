# Complete importer and override-dialog correction

## Replace these two form code files

1. `WinImportData.vb` — the complete importer, built from the latest attachment supplied in this request.
2. `msg_Override.vb` — the complete code-behind for the existing four-button dialog.

Keep both existing Designer files and resources, including the dialog's button names. The `.txt` files contain identical full code if easier to copy. All helpers are embedded in WinImportData; do not add the helper/test files to the ERP project. The generator Import.vb does not need another replacement for this change.

## Confirmed problems addressed

- The attachment displayed only “Purchase Saved Successfully” when at least one purchase saved. It suppressed the existing duplicate/failure report. The corrected importer always displays saved, existing/skipped and failed/unverified counts with invoice-specific reasons and a full report path, even when nothing was saved.
- Purchase duplicates were assigned a status but had no popup in the dedicated IMEI path. A genuine duplicate now explicitly identifies the saved invoice/GRN and continues with the remaining groups. Re-generated files assigning a new GRN are also checked against supplier, company and source invoice in the selected year database. A GRN occupied by a different invoice remains a conflict, not a duplicate.
- Grid “I” markers previously prevented an actual database check or the sales override flow. Purchase reimports now check database state; sales reimports reach the existing-bill policy even if grid rows were previously marked imported.
- The legacy sales loop swallowed exceptions and could terminate before reaching later invoices. Generated/IMEI sales now use a numeric, per-invoice controller with local boundaries, mapping validation, failure isolation and a per-bill report.
- Receipt-adjusted or transaction-adjusted sales silently exited before the override dialog. They now explain why override is blocked. Existing blacklisting, load locks, credit checks and serial/stock validation remain in place.
- Each import gets a fresh override choice. A newly created dialog avoids stale DialogResult. Closing its title-bar X cancels the import; it is not confused with the “Update One by One Bill” button.
- The latest attachment did not contain the previously delivered SAM2 totals contract. That exact helper is restored, gated to marked generated files, so the importer can read invoice-level final totals correctly. Legacy files retain their original calculation path.

## Override choices

| Button | Result |
|---|---|
| Override All | Overwrite eligible existing bills using the existing save logic. |
| Override Only Edit Bills | Overwrite when net amount differs to two decimal places; otherwise report unchanged/skipped. This retains the existing net-amount definition of “edited”. |
| Update One by One Bill | Ask Yes/No for each existing bill. No skips that bill and continues. |
| New Records Only | Skip existing bills with an explicit reason; save new bills. |
| Title-bar X | Cancel and report remaining rows not attempted. |

The dialog appears for eligible existing bills. An invalid mapping, tax mismatch, settled bill, lock, or serial validation failure must show its actual error instead of being bypassed to force an overwrite. An existing sales key belonging to another customer/company, or multiple matching headers, is blocked before deletion.

## The purchase error in the screenshot

The screenshot proves that the old verification did not find exactly one matching header after Add_Purchase returned. It does not prove why. The stored-procedure definition and current database contents were not supplied.

The correction verifies on the same open connection/database used for the save, before closing it. If verification still fails, the result is **UNVERIFIED**, with the database, expected GRN/company/supplier/invoice and any candidate headers found. It does not falsely label that invoice saved or blindly retry it. Other invoice groups continue. A matching header is still required before serial import and imported-row marking. Sales receives a corresponding same-connection header/party/company/net verification before serial stock-out.

If Add_Purchase does not insert the requested header, or saves a different key, its SQL definition/behavior must be examined using that report. This form correction cannot guarantee a successful save from an unknown stored procedure, and does not change the procedure or silently accept an unrelated header.

## Verification

- Compiled the actual new VB helpers/controllers with the installed .NET Framework compiler and fake grid/database fixtures.
- Passed tests for purchase grouping and continuation, duplicates under the same and newly generated GRN, duplicate popups, stale imported markers, occupied keys, verification failures and expected/found diagnostics.
- Passed tests for sales continuation after errors, reimports, missing products, cancellation and all four override decisions.
- Verified that a zero-saved import still shows its result/reasons.
- Compiled the complete override dialog code against a minimal Designer stub using the existing four button names.
- Checked existing routines against the latest attachment; changes are limited to import control/reporting, duplicate/save handling and the marked-file calculation integration.

The complete ERP project, C1/Ultimate references, deployed Add_Purchase/Add_Sales definitions and live data were unavailable. No real database was changed. Full ERP compilation, actual modal interaction and database-backed import/overwrite still need checking in your existing solution.
