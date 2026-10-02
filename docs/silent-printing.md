# Print invoices without the Edge print dialog

The invoice Print button calls `window.print()` from a hidden iframe. Edge owns the print dialog; website JavaScript cannot bypass it. Microsoft Edge 144 and newer supports silent printing through a browser policy. This setup affects printing from **all Edge tabs for this Windows user**, not just this ERP.

1. Set the intended physical printer as the **Windows default printer**. Turn off "Let Windows manage my default printer" if Windows keeps changing it. The printer shown as "Microsoft Print to PDF" in the dialog is not a physical printer.
2. Run this once in PowerShell from the project folder:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\configure-edge-silent-print.ps1
   ```

3. Restart Edge. Open `edge://policy` and confirm `SilentPrintingEnabled` and `PrintPreviewUseSystemDefaultPrinter` both show `true`. Then use the existing invoice **Print** button. Edge sends the invoice to the Windows default printer without waiting for a click in print preview. Edge may briefly show the preview while it closes automatically.

To restore the normal print dialog:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\configure-edge-silent-print.ps1 -Disable
```

The script changes only two current-user Edge policy values. It does not alter invoice generation, PDF download, or report data. If Edge is managed by an organization, a higher-priority policy may override these settings; `edge://policy` shows the effective values.

Microsoft documentation: [SilentPrintingEnabled](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/SilentPrintingEnabled) and [PrintPreviewUseSystemDefaultPrinter](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/PrintPreviewUseSystemDefaultPrinter).
