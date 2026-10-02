Imports System
Imports System.Data
Imports System.IO
Imports System.Collections.Generic
Public Class Grid
    Public Table As DataTable
    Public ReadOnly Property Cols As DataColumnCollection
        Get
            Return Table.Columns
        End Get
    End Property
    Public ReadOnly Property Rows As List(Of Integer)
        Get
            Return New List(Of Integer)(New Integer(Table.Rows.Count) {})
        End Get
    End Property
    Default Public Property Item(ByVal row As Integer, ByVal col As Integer) As Object
        Get
            Return Table.Rows(row - 1)(col)
        End Get
        Set(ByVal value As Object)
            Table.Rows(row - 1)(col) = value
        End Set
    End Property
End Class
Public Class Combo
    Public SelectedIndex As Integer
End Class
Public Class Checks
    Private VsfgSelect As New Grid()
    Private CmbEntry As New Combo()
    Private d1 As DataTable
    Private start, k As Integer
    Private TmpBVDisc1, TmpBVDisc2, TmpBVDisc3, TmpBVDisc4, TmpBVDisc5, TmpBVDisc6, TmpAVDisc1, TmpAVDisc2, TmpAVDisc3, TmpAVDisc4, TmpAVDisc5, TmpAVDisc6, TmpSchAmt, TmpCdAmt, TmpTprAmt, TmpStarAmt, TmpBtmAmt, TmpGrossAmt, TmpVatAmt, TmpCGST, TmpSGST, TmpSurchargeAmt, TmpTCSAmt, TmpNetAmt, TmpRndAmt As Double
    Private Function GetExcelValue(ByVal row As DataRow, ByVal name As String) As String
        If Not row.Table.Columns.Contains(name) OrElse IsDBNull(row(name)) Then Return ""
        Return row(name).ToString().Trim()
    End Function
    'Only the named-column Sales/Purchase converter uses these helpers.
    Private Function MoneyValue(ByVal row As DataRow, ByVal name As String) As Decimal
        Dim value As Decimal
        Dim raw As String = GetExcelValue(row, name)
        If raw = "" OrElse Not Decimal.TryParse(raw, System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, value) Then
            Throw New InvalidOperationException("Missing/invalid " & name & " for invoice " & GetExcelValue(row, "InvoiceNo"))
        End If
        Return value
    End Function

    Private Function MoneyRound(ByVal value As Decimal) As Decimal
        Return Decimal.Round(value, 2, MidpointRounding.AwayFromZero)
    End Function

    Private Function KeyPart(ByVal value As String) As String
        value = value.Trim().ToUpperInvariant()
        Return value.Length.ToString() & ":" & value
    End Function

    Private Function NaturalInvoice(ByVal value As String) As String
        Return System.Text.RegularExpressions.Regex.Replace(value.ToUpperInvariant(), "\d+", AddressOf PadInvoiceDigits)
    End Function

    Private Function PadInvoiceDigits(ByVal match As System.Text.RegularExpressions.Match) As String
        Return match.Value.TrimStart("0"c).PadLeft(30, "0"c)
    End Function

    Private Function PrepareInvoiceSource(ByVal source As DataTable, ByVal purchase As Boolean) As DataTable
        Dim result As DataTable = source.Clone()
        result.Columns.Add("__InvoiceKey", GetType(String))
        result.Columns.Add("__InvoiceSort", GetType(String))
        result.Columns.Add("__InvoiceDate", GetType(DateTime))
        result.Columns.Add("__Ordinal", GetType(Integer))
        For Each name As String In New String() {"__Gross", "__Scheme", "__Cash", "__Final", "__TCS", "__Rounding"}
            result.Columns.Add(name, GetType(Decimal))
        Next
        Dim groups As New System.Collections.Generic.Dictionary(Of String, System.Collections.Generic.List(Of DataRow))(StringComparer.Ordinal)
        Dim ordinal As Integer = 0
        For Each original As DataRow In source.Rows
            ordinal += 1
            Dim invoice As String = GetExcelValue(original, "InvoiceNo")
            If invoice = "" AndAlso GetExcelValue(original, "ProductCode") = "" AndAlso GetExcelValue(original, "MarketName") = "" Then Continue For
            If Not purchase AndAlso GetExcelValue(original, "TransactionType") <> "" AndAlso Not String.Equals(GetExcelValue(original, "TransactionType"), "SALES ORDER", StringComparison.OrdinalIgnoreCase) Then Continue For
            If invoice = "" Then Throw New InvalidOperationException("Missing InvoiceNo at source row " & (ordinal + 1).ToString())
            Dim dateValue As DateTime
            If TypeOf original("InvoiceDate") Is DateTime Then
                dateValue = CDate(original("InvoiceDate")).Date
            ElseIf Not DateTime.TryParse(GetExcelValue(original, "InvoiceDate"), System.Globalization.CultureInfo.GetCultureInfo("en-IN"), System.Globalization.DateTimeStyles.None, dateValue) Then
                Throw New InvalidOperationException("Invalid InvoiceDate for " & invoice)
            End If
            Dim key As String = KeyPart(GetExcelValue(original, "SellerCode")) & KeyPart(GetExcelValue(original, "BuyerCode")) & KeyPart(invoice) & KeyPart(dateValue.Date.ToString("yyyy-MM-dd"))
            Dim qty As Decimal = MoneyValue(original, "Quantity")
            If qty <= 0D Then Throw New InvalidOperationException("Quantity must be positive for " & invoice)
            Dim taxable As Decimal = MoneyValue(original, "TaxableAmount")
            Dim discount As Decimal = MoneyValue(original, "Discount")
            Dim scheme As Decimal = discount
            Dim cash As Decimal = 0D
            'When separate amounts exist, Discount is their total, not an extra deduction.
            If source.Columns.Contains("SchAmt") OrElse source.Columns.Contains("CDAmt") Then
                scheme = 0D
                If source.Columns.Contains("SchAmt") Then scheme = MoneyValue(original, "SchAmt")
                If source.Columns.Contains("CDAmt") Then cash = MoneyValue(original, "CDAmt")
                If MoneyRound(scheme + cash) <> MoneyRound(discount) Then Throw New InvalidOperationException("Discount must equal SchAmt + CDAmt for " & invoice)
            End If
            If discount < 0D OrElse scheme < 0D OrElse cash < 0D Then Throw New InvalidOperationException("Negative discount for " & invoice)
            If MoneyRound(taxable + MoneyValue(original, "TaxAmount")) <> MoneyRound(MoneyValue(original, "NetValue")) Then
                Throw New InvalidOperationException("TaxableAmount + TaxAmount does not equal line NetValue for " & invoice)
            End If
            MoneyValue(original, "BaseRateWithTax")
            result.ImportRow(original)
            Dim row As DataRow = result.Rows(result.Rows.Count - 1)
            row("__InvoiceKey") = key
            row("__InvoiceSort") = NaturalInvoice(invoice)
            row("__InvoiceDate") = dateValue.Date
            row("__Ordinal") = ordinal
            row("__Gross") = taxable + scheme + cash
            row("__Scheme") = scheme
            row("__Cash") = cash
            row("__Final") = MoneyValue(original, "NetValueIncludingTCS")
            If Not groups.ContainsKey(key) Then groups.Add(key, New System.Collections.Generic.List(Of DataRow)())
            groups(key).Add(row)
        Next
        For Each rows As System.Collections.Generic.List(Of DataRow) In groups.Values
            Dim final As Decimal = CDec(rows(0)("__Final"))
            Dim lineTotal As Decimal = 0D
            Dim tcs As Decimal = 0D
            For Each row As DataRow In rows
                If CDec(row("__Final")) <> final Then Throw New InvalidOperationException("Conflicting NetValueIncludingTCS for " & GetExcelValue(row, "InvoiceNo"))
                lineTotal += MoneyRound(MoneyValue(row, "NetValue"))
                'TCSAmount is a line amount in this contract; header TCS is summed once.
                tcs += MoneyRound(MoneyValue(row, "TCSAmount"))
            Next
            Dim difference As Decimal = MoneyRound(final - lineTotal - tcs)
            'Two rounded source components per line can accumulate one paisa per line.
            'Reject larger unexplained differences instead of hiding them in rounding.
            If Math.Abs(difference) > rows.Count * 0.01D Then Throw New InvalidOperationException("Invoice reconciliation exceeds source precision allowance for " & GetExcelValue(rows(0), "InvoiceNo") & ": " & difference.ToString("0.00"))
            For Each row As DataRow In rows
                row("__TCS") = tcs
                row("__Rounding") = difference
            Next
        Next
        Dim view As New DataView(result)
        view.Sort = "__InvoiceDate ASC, __InvoiceSort ASC, __InvoiceKey ASC, __Ordinal ASC"
        Return view.ToTable()
    End Function

    Private Sub SetInvoiceContract(ByVal gridRow As Integer, ByVal source As DataRow)
        VsfgSelect(gridRow, VsfgSelect.Cols.IndexOf("ImportTotalsVersion")) = "SAM2"
        VsfgSelect(gridRow, VsfgSelect.Cols.IndexOf("SourceInvoiceNo")) = GetExcelValue(source, "InvoiceNo")
        VsfgSelect(gridRow, VsfgSelect.Cols.IndexOf("InvoiceNetValueIncludingTCS")) = source("__Final")
        VsfgSelect(gridRow, VsfgSelect.Cols.IndexOf("InvoiceTCSAmount")) = source("__TCS")
        VsfgSelect(gridRow, VsfgSelect.Cols.IndexOf("InvoiceRounding")) = source("__Rounding")
        VsfgSelect(gridRow, VsfgSelect.Cols.IndexOf("SourceTaxAmount")) = MoneyValue(source, "TaxAmount")
        VsfgSelect(gridRow, VsfgSelect.Cols.IndexOf("SourceTaxableAmount")) = MoneyValue(source, "TaxableAmount")
        VsfgSelect(gridRow, VsfgSelect.Cols.IndexOf("TCSAMT")) = source("__TCS")
    End Sub

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

    Private Sub Assert(ByVal ok As Boolean, ByVal message As String)
        If Not ok Then Throw New Exception(message)
    End Sub
    Private Sub Reject(ByVal table As DataTable, ByVal message As String)
        Try
            PrepareInvoiceSource(table, True)
        Catch ex As InvalidOperationException
            Return
        End Try
        Throw New Exception("Expected rejection: " & message)
    End Sub
    Private Sub CheckInvoice(ByVal rows As List(Of DataRow), ByVal sales As Boolean)
        Dim table As New DataTable()
        For Each name As String In New String() {"ImportTotalsVersion", "SourceInvoiceNo"}
            table.Columns.Add(name, GetType(String))
        Next
        For Each name As String In New String() {"InvoiceNetValueIncludingTCS", "InvoiceTCSAmount", "InvoiceRounding", "TCSAMT", "SourceTaxAmount", "SourceTaxableAmount", "Amount", "NetAmt", "VatAmt", "Taxable", "CGST", "SGST", "BVDisc1", "BVDisc2", "SchAmt", "CDAmt"}
            table.Columns.Add(name, GetType(Decimal))
        Next
        VsfgSelect.Table = table
        d1 = table
        CmbEntry.SelectedIndex = If(sales, 0, 1)
        TmpGrossAmt = 0 : TmpBVDisc1 = 0 : TmpBVDisc2 = 0 : TmpSchAmt = 0 : TmpCdAmt = 0 : TmpVatAmt = 0
        TmpCGST = 0 : TmpSGST = 0 : TmpSurchargeAmt = 0
        For Each source As DataRow In rows
            Dim row As DataRow = table.NewRow()
            table.Rows.Add(row)
            Dim n As Integer = table.Rows.Count
            SetInvoiceContract(n, source)
            row("Amount") = source("__Gross")
            row("NetAmt") = MoneyValue(source, "NetValue")
            row("VatAmt") = MoneyValue(source, "TaxAmount")
            row("Taxable") = MoneyValue(source, "TaxableAmount")
            row("CGST") = MoneyRound(CDec(row("VatAmt")) / 2D)
            row("SGST") = row("CGST")
            RestoreGeneratedLineTax(n)
            Assert(CDec(row("CGST")) + CDec(row("SGST")) = CDec(row("VatAmt")), "Tax split residual")
            row("BVDisc1") = source("__Scheme") : row("SchAmt") = source("__Scheme")
            row("BVDisc2") = source("__Cash") : row("CDAmt") = source("__Cash")
            TmpGrossAmt += CDbl(row("Amount"))
            TmpVatAmt += CDbl(row("VatAmt"))
            TmpCGST += CDbl(row("CGST")) : TmpSGST += CDbl(row("SGST"))
            TmpBVDisc1 += CDbl(row("BVDisc1")) : TmpSchAmt += CDbl(row("SchAmt"))
            TmpBVDisc2 += CDbl(row("BVDisc2")) : TmpCdAmt += CDbl(row("CDAmt"))
        Next
        start = 1 : k = table.Rows.Count
        TmpNetAmt = -99 : TmpRndAmt = -99
        Assert(ApplyGeneratedInvoiceTotals(), "Contract not applied")
        Assert(CDec(TmpNetAmt) = CDec(rows(0)("__Final")), "Header multiplied or last line used")
        Assert(CDec(TmpRndAmt) = CDec(rows(0)("__Rounding")), "Wrong rounding")
        Assert(CDec(TmpTCSAmt) = CDec(rows(0)("__TCS")), "TCS counted incorrectly")
        table.Rows(0)("NetAmt") = CDec(table.Rows(0)("NetAmt")) + 1D
        Dim failed As Boolean = False
        Try
            ApplyGeneratedInvoiceTotals()
        Catch ex As InvalidOperationException
            failed = True
        End Try
        Assert(failed, "Tampered line accepted")
        table.Columns.Remove("ImportTotalsVersion")
        Assert(Not ApplyGeneratedInvoiceTotals(), "Legacy format changed")
    End Sub
    Public Sub Run(ByVal file As String)
        Dim source As New DataTable()
        Dim lines As String() = System.IO.File.ReadAllLines(file)
        For Each name As String In lines(0).Split(ChrW(9))
            source.Columns.Add(name, GetType(String))
        Next
        For i As Integer = 1 To lines.Length - 1
            source.Rows.Add(lines(i).Split(ChrW(9)))
        Next
        Dim prepared As DataTable = PrepareInvoiceSource(source, True)
        Assert(prepared.Rows.Count = 1635, "Lost source rows")
        Dim groups As New Dictionary(Of String, List(Of DataRow))()
        Dim seen As New HashSet(Of String)()
        Dim previous As String = ""
        For Each row As DataRow In prepared.Rows
            Dim key As String = CStr(row("__InvoiceKey"))
            If key <> previous Then Assert(seen.Add(key), "Noncontiguous invoice")
            If Not groups.ContainsKey(key) Then groups.Add(key, New List(Of DataRow)())
            groups(key).Add(row)
            previous = key
        Next
        Assert(groups.Count = 21, "Wrong invoice count")
        Dim nonzero As Integer = 0
        For Each group As List(Of DataRow) In groups.Values
            If CDec(group(0)("__Rounding")) <> 0D Then nonzero += 1
            CheckInvoice(group, False)
            CheckInvoice(group, True)
        Next
        Assert(nonzero = 17, "Unexpected reconciliation count")
        Console.WriteLine("PASS: 1635 rows, 21 contiguous invoices; all 21 header totals reconciled in purchase and sales; 17 source differences retained; tampering rejected; legacy bypass preserved.")
        Dim sample As DataTable = source.Clone()
        sample.ImportRow(source.Rows(0))
        sample.Columns.Add("SchAmt", GetType(String)) : sample.Columns.Add("CDAmt", GetType(String))
        Dim r As DataRow = sample.Rows(0)
        r("TaxableAmount") = "850.00" : r("Discount") = "150.00"
        r("SchAmt") = "100.00" : r("CDAmt") = "50.00"
        r("TaxAmount") = "153.00" : r("NetValue") = "1003.00"
        r("TCSAmount") = "10.03" : r("NetValueIncludingTCS") = "1013.03"
        Dim one As DataTable = PrepareInvoiceSource(sample, True)
        Assert(CDec(one.Rows(0)("__Gross")) = 1000D, "Discount subtracted twice")
        CheckInvoice(New List(Of DataRow)(New DataRow() {one.Rows(0)}), True)
        CheckInvoice(New List(Of DataRow)(New DataRow() {one.Rows(0)}), False)
        r("InvoiceNo") = "I10" : sample.ImportRow(r) : sample.Rows(1)("InvoiceNo") = "I2"
        one = PrepareInvoiceSource(sample, True)
        Assert(CStr(one.Rows(0)("InvoiceNo")) = "I2", "Lexical invoice order")
        sample.Rows(1)("InvoiceNo") = "I10" : sample.Rows(1)("BuyerCode") = "OTHER"
        one = PrepareInvoiceSource(sample, True)
        Assert(CStr(one.Rows(0)("__InvoiceKey")) <> CStr(one.Rows(1)("__InvoiceKey")), "Parties merged")
        sample.Rows.RemoveAt(1)
        r("Discount") = "151" : Reject(sample, "Ambiguous split") : r("Discount") = "150"
        r("NetValueIncludingTCS") = "2000" : Reject(sample, "Unexplained difference") : r("NetValueIncludingTCS") = "1013.03"
        r("Quantity") = "bad" : Reject(sample, "Invalid number") : r("Quantity") = "1"
        sample.ImportRow(r) : sample.Rows(1)("NetValueIncludingTCS") = "999" : Reject(sample, "Conflicting repeated total")
        Console.WriteLine("PASS: SCH/CD split, TCS once, zero rounding, natural ordering, party separation, invalid numbers, conflicting totals and excessive differences.")
    End Sub
End Class
Module Program
    Sub Main(ByVal args As String())
        Dim test As New Checks()
        test.Run(args(0))
    End Sub
End Module
