const fs=require('fs'),p=require('path'),d=__dirname;
const helper=fs.readFileSync(p.join(d,'InvoiceHelpers.vb'),'utf8');
const importer=fs.readFileSync(p.join(d,'ImportTotalsHelper.vb'),'utf8');
const variables=[...new Set([...importer.matchAll(/\bTmp\w+/g)].map(x=>x[0]))];
fs.writeFileSync(p.join(d,'Checks.vb'),`Imports System
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
    Private ${variables.join(', ')} As Double
    Private Function GetExcelValue(ByVal row As DataRow, ByVal name As String) As String
        If Not row.Table.Columns.Contains(name) OrElse IsDBNull(row(name)) Then Return ""
        Return row(name).ToString().Trim()
    End Function
${helper}
${importer}
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
`);
