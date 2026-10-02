# Purchase import correction

`WinImportData.vb` contains the complete corrected source from the attachment, including the imports, form class, and all existing procedures. `WinImportData.txt` contains the identical source for copying. Replace the contents of the existing form's code file; retain its existing Designer and resource files.

## Why the duplicate message can be wrong

1. `SetData()` sorts only by `TrnNo`, while both purchase grouping paths expect each `TrnSeries` + `TrnNo` group to be contiguous. For input `A/1 item1`, `B/1 item2`, `A/1 item3`, the original IMEI grouping routine saves the first line of `A/1`, saves `B/1`, then reports the remaining `A/1` line as a duplicate. This was reproduced using the original routine in the regression harness. The database match at that point is the incomplete purchase created earlier in the same import.
2. The empty-cell initialization changes an empty `TrnSeries` to the literal string `0`. The subsequent attempt to preserve an empty series comes too late. Thus a purchase intended for the blank series can be checked against an existing purchase in series `0` instead.
3. The existing header refresh catches errors and continues, permitting old header state to survive. Some purchase validation and grouping safeguards also run only when an IMEI column exists.

These are defects visible in the supplied source. The user's particular Excel file and live application were not available to identify which path produced their specific message.

## Correction

- Keep blank purchase series blank.
- Normalize numeric purchase identities and sort the purchase view by both series and number before collecting complete groups.
- Use the purchase grouping routine for purchases with and without IMEI.
- Stop the current group on invalid header/product data instead of saving with stale header values. Continue to later groups after normal validation rejection or an existing purchase.
- Query `T_Pur_Header` through a local parameterized command using `TrnSeries` AND `TrnNo`. Company is deliberately not an additional duplicate criterion, following the requested series-and-number rule. Company data is still supplied to the unchanged save procedure.
- Mark every successfully saved purchase group imported.

`TrnNo` remains a positive SQL `Int`, as required by the existing `Add_Purchase` parameter. Thus `001`, `1`, and `1.0` denote the same number. Series comparison in the database retains the database's normal collation behavior.

## Verification

- Compiled and ran nine regression scenarios against the actual grouping/helper methods extracted from the corrected file, with a small grid adapter over real .NET `DataTable`/`DataView` objects.
- Reproduced the original split-group failure before checking the corrected behavior.
- Checked interleaved groups, same number/different series, same series/different number, an existing purchase followed by new purchases, whitespace and numeric normalization, blank versus literal-zero series, retry behavior, optional IMEI, apostrophes, and invalid numbers.
- Verified 76 unrelated procedures and the complete `Add_Purchase` command/parameter block are unchanged. Purchase calculations, accounting, stock, GST and serial-number save code were retained.

The complete desktop application could not be built or run here because its VB project, form Designer, C1 control and Ultimate dependencies were not supplied. The SQL lookup and stored procedure were not executed against a live database. The regression harness checks grouping and identity handling, not a full database import.

This change does not repair partial purchases already created by the old importer. Such purchases still have an existing series-and-number key and are correctly skipped by the corrected importer.
