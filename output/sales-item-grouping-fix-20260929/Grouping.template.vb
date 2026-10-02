    'Sales-only consolidation of the ALREADY CALCULATED stored-procedure payload.
    'Source rows, invoice totals, tax rounding, validation and purchase code stay intact.
    Private SalesGroupedSerialSeq As New System.Collections.Generic.Dictionary(Of Integer, Integer)()

    Private Sub GroupSalesIMEIDetailsForSave()
        SalesGroupedSerialSeq.Clear()
        If CmbEntry.SelectedIndex <> 0 OrElse d1 Is Nothing OrElse Not d1.Columns.Contains("IMEI") OrElse ItemCount < 2 Then Return
        Dim sourceRows As New System.Collections.Generic.List(Of Integer)()
        For row As Integer = start To k
            If Microsoft.VisualBasic.Conversion.Val(PurchaseIMEICell(row, "SysProdCode")) > 0 AndAlso Microsoft.VisualBasic.Conversion.Val(PurchaseIMEICell(row, "SchNo")) = 0 Then sourceRows.Add(row)
        Next
        If sourceRows.Count <> ItemCount Then Throw New InvalidOperationException("Sales detail/source row count mismatch.")
        Dim payload As New DataTable()
        ' GENERATED PAYLOAD
        Dim eligible As New System.Collections.Generic.List(Of Boolean)()
        Dim serialProducts As New System.Collections.Generic.Dictionary(Of Integer, Boolean)()
        For detailIndex As Integer = 0 To sourceRows.Count - 1
            Dim record As DataRow = payload.NewRow()
            ' GENERATED ROW
            payload.Rows.Add(record)
            Dim row As Integer = sourceRows(detailIndex)
            Dim product As Integer = CInt(Microsoft.VisualBasic.Conversion.Val(PurchaseIMEICell(row, "SysProdCode")))
            Dim hasIMEI As Boolean = GetSalesIMEIList(VsfgSelect(row, VsfgSelect.Cols.IndexOf("IMEI"))).Count > 0
            Dim canGroup As Boolean = False
            If hasIMEI AndAlso Microsoft.VisualBasic.Conversion.Val(PurchaseIMEICell(row, "Qty")) > 0 Then
                If Not serialProducts.ContainsKey(product) Then serialProducts.Add(product, IsSalesSerialNoProduct(product))
                canGroup = serialProducts(product)
            End If
            eligible.Add(canGroup)
        Next
        Dim sequenceMap As New System.Collections.Generic.List(Of Integer)()
        Dim grouped As DataTable = ConsolidateSalesPayload(payload, eligible, sequenceMap)
        If grouped.Rows.Count = payload.Rows.Count Then Return
        'Build every output before publishing the source-row-to-detail mapping.
        ' GENERATED WRITE
        ItemCount = grouped.Rows.Count
        For detailIndex As Integer = 0 To sourceRows.Count - 1
            SalesGroupedSerialSeq.Add(sourceRows(detailIndex), sequenceMap(detailIndex))
        Next
    End Sub

    Private Function ConsolidateSalesPayload(ByVal payload As DataTable, ByVal eligible As System.Collections.Generic.List(Of Boolean), ByVal sequenceMap As System.Collections.Generic.List(Of Integer)) As DataTable
        Dim sums As New System.Collections.Generic.HashSet(Of String)(StringComparer.OrdinalIgnoreCase)
        For Each name As String In New String() {SUM_FIELDS}
            sums.Add(name)
        Next
        Dim result As DataTable = payload.Clone()
        Dim groups As New System.Collections.Generic.Dictionary(Of String, Integer)(StringComparer.Ordinal)
        sequenceMap.Clear()
        For index As Integer = 0 To payload.Rows.Count - 1
            Dim source As DataRow = payload.Rows(index)
            Dim key As New System.Text.StringBuilder()
            'Every non-additive field must match: product, batch, rates, tax,
            'discount percentages, unit, dates, accounts and scheme metadata.
            For Each column As DataColumn In payload.Columns
                If column.ColumnName <> "strSeqNo" AndAlso Not sums.Contains(column.ColumnName) Then
                    Dim value As String = CStr(source(column))
                    key.Append(value.Length).Append(":"c).Append(value)
                End If
            Next
            Dim groupKey As String = key.ToString()
            Dim targetIndex As Integer
            If eligible(index) AndAlso groups.TryGetValue(groupKey, targetIndex) Then
                Dim target As DataRow = result.Rows(targetIndex)
                For Each name As String In sums
                    Dim total As Decimal = SalesPayloadNumber(CStr(target(name))) + SalesPayloadNumber(CStr(source(name)))
                    target(name) = SalesPayloadField(total)
                Next
            Else
                targetIndex = result.Rows.Count
                result.ImportRow(source)
                result.Rows(targetIndex)("strSeqNo") = SalesPayloadField(targetIndex + 1)
                If eligible(index) Then groups.Add(groupKey, targetIndex)
            End If
            sequenceMap.Add(targetIndex + 1)
        Next
        Return result
    End Function

    Private Function SalesPayloadNumber(ByVal value As String) As Decimal
        'Match the existing VB Format/Conversions culture used by MakeStringSal.
        Return Decimal.Parse(value.Trim(), System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.CurrentCulture)
    End Function

    Private Function SalesPayloadField(ByVal value As Decimal) As String
        Dim text As String = value.ToString("0.############################", System.Globalization.CultureInfo.CurrentCulture)
        If text.Length > 20 Then Throw New InvalidOperationException("Grouped sales value exceeds the 20-character detail field.")
        Return text.PadRight(20)
    End Function

    Private Function JoinSalesPayload(ByVal payload As DataTable, ByVal name As String) As String
        Dim result As New System.Text.StringBuilder()
        For Each row As DataRow In payload.Rows
            result.Append(CStr(row(name)))
        Next
        Return result.ToString()
    End Function
