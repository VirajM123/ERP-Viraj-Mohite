    Private Function IsGeneratedInvoice() As Boolean
        If CmbEntry.SelectedIndex <> 0 AndAlso CmbEntry.SelectedIndex <> 1 Then Return False
        Return d1.Columns.Contains("ImportTotalsVersion") AndAlso start > 0 AndAlso start < VsfgSelect.Rows.Count AndAlso
            Convert.ToString(VsfgSelect(start, VsfgSelect.Cols.IndexOf("ImportTotalsVersion"))) = "SAM2"
    End Function

    Private Function GeneratedDecimal(ByVal row As Integer, ByVal name As String) As Decimal
        Dim result As Decimal
        If VsfgSelect.Cols.IndexOf(name) < 0 OrElse Not Decimal.TryParse(Convert.ToString(VsfgSelect(row, VsfgSelect.Cols.IndexOf(name))), System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, result) Then
            Throw New InvalidOperationException("Invalid generated invoice field " & name & " at row " & row.ToString())
        End If
        Return result
    End Function

    Private Function ApplyGeneratedInvoiceTotals() As Boolean
        If Not IsGeneratedInvoice() Then Return False
        Dim final As Decimal = GeneratedDecimal(start, "InvoiceNetValueIncludingTCS")
        Dim tcs As Decimal = GeneratedDecimal(start, "InvoiceTCSAmount")
        Dim adjustment As Decimal = GeneratedDecimal(start, "InvoiceRounding")
        Dim lines As Decimal = 0D
        Dim gross As Decimal = 0D
        Dim discounts As Decimal = 0D
        Dim taxes As Decimal = 0D
        Dim invoice As String = Convert.ToString(VsfgSelect(start, VsfgSelect.Cols.IndexOf("SourceInvoiceNo")))
        For row As Integer = start To k
            If Convert.ToString(VsfgSelect(row, VsfgSelect.Cols.IndexOf("ImportTotalsVersion"))) <> "SAM2" OrElse
                Convert.ToString(VsfgSelect(row, VsfgSelect.Cols.IndexOf("SourceInvoiceNo"))) <> invoice OrElse
                GeneratedDecimal(row, "InvoiceNetValueIncludingTCS") <> final OrElse
                GeneratedDecimal(row, "InvoiceTCSAmount") <> tcs OrElse
                GeneratedDecimal(row, "InvoiceRounding") <> adjustment Then
                Throw New InvalidOperationException("Inconsistent invoice totals within transaction " & invoice)
            End If
            Dim amount As Decimal = GeneratedDecimal(row, "Amount")
            Dim discount As Decimal
            If CmbEntry.SelectedIndex = 1 Then
                discount = GeneratedDecimal(row, "BVDisc1") + GeneratedDecimal(row, "BVDisc2")
            Else
                discount = GeneratedDecimal(row, "SchAmt") + GeneratedDecimal(row, "CDAmt")
            End If
            Dim tax As Decimal = GeneratedDecimal(row, "VatAmt")
            Dim net As Decimal = GeneratedDecimal(row, "NetAmt")
            If Decimal.Round(amount - discount + tax - net, 2, MidpointRounding.AwayFromZero) <> 0D Then
                Throw New InvalidOperationException("Line amounts no longer reconcile for " & invoice)
            End If
            gross += amount
            discounts += discount
            taxes += tax
            lines += net
        Next
        If Decimal.Round(final - lines - tcs - adjustment, 2, MidpointRounding.AwayFromZero) <> 0D OrElse Math.Abs(adjustment) > (k - start + 1) * 0.01D Then
            Throw New InvalidOperationException("Invoice total does not reconcile for " & invoice)
        End If
        'Do not let altered mappings or missing lines disappear into the rounding account.
        Dim actualDiscounts As Decimal
        If CmbEntry.SelectedIndex = 1 Then
            actualDiscounts = CDec(TmpBVDisc1) + CDec(TmpBVDisc2) + CDec(TmpBVDisc3) + CDec(TmpBVDisc4) + CDec(TmpBVDisc5) + CDec(TmpBVDisc6) + CDec(TmpAVDisc1) + CDec(TmpAVDisc2) + CDec(TmpAVDisc3) + CDec(TmpAVDisc4) + CDec(TmpAVDisc5) + CDec(TmpAVDisc6)
        Else
            actualDiscounts = CDec(TmpSchAmt) + CDec(TmpCdAmt) + CDec(TmpTprAmt) + CDec(TmpStarAmt) + CDec(TmpBtmAmt)
        End If
        If Decimal.Round(CDec(TmpGrossAmt) - gross, 2) <> 0D OrElse Decimal.Round(actualDiscounts - discounts, 2) <> 0D OrElse Decimal.Round(CDec(TmpVatAmt) - taxes, 2) <> 0D Then
            Throw New InvalidOperationException("ERP detail totals differ from generated invoice " & invoice)
        End If
        If Decimal.Round(CDec(TmpCGST) + CDec(TmpSGST) + CDec(TmpSurchargeAmt) - taxes, 2) <> 0D Then
            Throw New InvalidOperationException("ERP tax postings differ from generated invoice " & invoice)
        End If
        TmpTCSAmt = tcs
        TmpNetAmt = CDbl(final)
        TmpRndAmt = CDbl(adjustment)
        Return True
    End Function

    Private Sub RestoreGeneratedLineTax(ByVal row As Integer)
        If CmbEntry.SelectedIndex <> 0 AndAlso CmbEntry.SelectedIndex <> 1 Then Return
        If Not d1.Columns.Contains("ImportTotalsVersion") Then Return
        If Convert.ToString(VsfgSelect(row, VsfgSelect.Cols.IndexOf("ImportTotalsVersion"))) <> "SAM2" Then Return
        Dim taxable As Decimal = GeneratedDecimal(row, "SourceTaxableAmount")
        Dim tax As Decimal = GeneratedDecimal(row, "SourceTaxAmount")
        If Math.Abs(GeneratedDecimal(row, "Taxable") - taxable) > 0.01D Then Throw New InvalidOperationException("ERP taxable base differs from source at row " & row.ToString())
        Dim cgst As Decimal = GeneratedDecimal(row, "CGST")
        Dim sgst As Decimal = GeneratedDecimal(row, "SGST")
        'Retain the existing ERP tax allocation. Carry any one-paisa split residual
        'in its second component, instead of creating an invoice rounding error.
        If Math.Abs(cgst + sgst - tax) > 0.01D Then Throw New InvalidOperationException("ERP tax mapping differs from source at row " & row.ToString())
        VsfgSelect(row, VsfgSelect.Cols.IndexOf("Taxable")) = taxable
        VsfgSelect(row, VsfgSelect.Cols.IndexOf("VatAmt")) = tax
        If cgst + sgst <> 0D Then
            cgst = Decimal.Round(tax * cgst / (cgst + sgst), 2, MidpointRounding.AwayFromZero)
        End If
        VsfgSelect(row, VsfgSelect.Cols.IndexOf("CGST")) = cgst
        VsfgSelect(row, VsfgSelect.Cols.IndexOf("SGST")) = tax - cgst
    End Sub
