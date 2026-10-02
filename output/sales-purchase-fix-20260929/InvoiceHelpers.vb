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
