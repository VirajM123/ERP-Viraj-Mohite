const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, 'WinImportData.vb'), 'utf8').replace(/\r\n/g, '\n');
const original = fs.readFileSync('C:/Users/Total Solution/.codex/attachments/f7e37d68-295a-4634-9cee-b63f88abdecd/Pasted text.txt', 'utf8').replace(/\r\n/g, '\n');
function method(source, name) {
  const match = source.match(new RegExp('^    Private (?:Sub|Function) ' + name + '\\([^]*?^    End (?:Sub|Function)', 'm'));
  if (!match) throw new Error(name);
  return match[0];
}
const methods = ['TryGetPurchaseTrnNo', 'PreparePurchaseGroups', 'PurchaseExists', 'GetDataPurchase'].map(n => method(code, n)).join('\n\n');
const oldGrouping = method(original, 'GetDataPurchaseIMEI').replace('GetDataPurchaseIMEI()', 'GetDataPurchaseOriginal()');
const harness = `Imports System
Imports System.Data
Imports System.Data.SqlClient
Imports System.Diagnostics
Imports System.Collections.Generic
Imports System.Windows.Forms

Public Class FakeGrid
    Private _view As DataView
    Public Property DataSource As Object
        Get
            Return _view
        End Get
        Set(ByVal value As Object)
            _view = DirectCast(value, DataView)
        End Set
    End Property
    Public ReadOnly Property Cols As DataColumnCollection
        Get
            Return _view.Table.Columns
        End Get
    End Property
    Public ReadOnly Property Rows As FakeRows
        Get
            Return New FakeRows(_view.Count + 1)
        End Get
    End Property
    Default Public Property Item(ByVal row As Integer, ByVal col As Integer) As Object
        Get
            Return _view(row - 1)(col)
        End Get
        Set(ByVal value As Object)
            _view(row - 1)(col) = value
        End Set
    End Property
End Class
Public Class FakeRows
    Public Count As Integer
    Public Sub New(ByVal value As Integer)
        Count = value
    End Sub
End Class
Public Class MessageBox
    Public Shared Sub Show(ByVal ParamArray args() As Object)
        Throw New Exception("Unexpected import error: " + Convert.ToString(args(0)))
    End Sub
End Class
Namespace Ultimate
    Public Module Mod_GlobFunction
        Public UseedFormName As String = "Regression check"
    End Module
    Public Module Mod_Connection
        Public Function OpenYearConn() As SqlConnection
            Throw New Exception("Database access is not part of the grouping regression checks.")
        End Function
        Public Sub CloseYearConn(ByVal connection As SqlConnection)
        End Sub
    End Module
End Namespace

Public Class PurchaseChecks
    Private d1 As DataTable
    Private VsfgSelect As New FakeGrid()
    Private start, k, start1, k1, end1 As Integer
    Private Saved As New List(Of String)()
    Private Existing As New HashSet(Of String)(StringComparer.Ordinal)
    Private Duplicates As Integer

${methods}

${oldGrouping}

    Private Sub MakeStringPur()
        'Capture exactly the group passed to the existing calculations/save.
        Dim series As String = Convert.ToString(VsfgSelect(start, VsfgSelect.Cols.IndexOf("TrnSeries"))).Trim()
        Dim number As Integer
        If Not TryGetPurchaseTrnNo(VsfgSelect(start, VsfgSelect.Cols.IndexOf("TrnNo")), number) Then
            Throw New Exception("Unexpected invalid test number")
        End If
        Dim key As String = series + "/" + number.ToString()
        If Existing.Contains(key) Then
            Duplicates += 1
            Return
        End If
        Dim products As New List(Of String)()
        For row As Integer = start To k
            Assert(Convert.ToString(VsfgSelect(row, VsfgSelect.Cols.IndexOf("TrnSeries"))).Trim() = series, "Series crossed a group boundary")
            Dim rowNumber As Integer
            Assert(TryGetPurchaseTrnNo(VsfgSelect(row, VsfgSelect.Cols.IndexOf("TrnNo")), rowNumber) AndAlso rowNumber = number, "Number crossed a group boundary")
            Assert(CInt(VsfgSelect(row, VsfgSelect.Cols.IndexOf("SeqNo"))) = row - start + 1, "Invalid line sequence")
            products.Add(Convert.ToString(VsfgSelect(row, VsfgSelect.Cols.IndexOf("Product"))))
            VsfgSelect(row, VsfgSelect.Cols.IndexOf("Import")) = "I"
        Next
        Existing.Add(key)
        Saved.Add(key + ":" + String.Join(",", products.ToArray()))
    End Sub

    Private Sub Reset(ByVal ParamArray rows() As String)
        d1 = New DataTable()
        For Each name As String In New String() {"TrnSeries", "TrnNo", "Product", "Import", "SeqNo"}
            d1.Columns.Add(name, GetType(String))
        Next
        For Each row As String In rows
            Dim cells() As String = row.Split("|"c)
            d1.Rows.Add(cells(0), cells(1), cells(2), If(cells.Length > 3, cells(3), ""), "0")
        Next
        VsfgSelect.DataSource = New DataView(d1)
        Saved.Clear()
        Existing.Clear()
        Duplicates = 0
    End Sub

    Private Shared Sub Assert(ByVal condition As Boolean, ByVal message As String)
        If Not condition Then Throw New Exception(message)
    End Sub

    Public Sub Run()
        Reset("A|1|p1", "B|1|p2", "A|1|p3")
        GetDataPurchaseOriginal()
        Assert(Duplicates = 1 AndAlso Saved.Contains("A/1:p1"), "Could not reproduce the original split purchase defect")
        Console.WriteLine("PASS: Original code reproduced a partial A/1 import followed by a false duplicate for its remaining line.")

        Reset("A|1|p1", "B|1|p2", "A|1|p3", "A|2|p4")
        GetDataPurchase()
        Assert(Duplicates = 0 AndAlso Saved.Count = 3 AndAlso Saved.Contains("A/1:p1,p3") AndAlso Saved.Contains("B/1:p2") AndAlso Saved.Contains("A/2:p4"), "Interleaved purchase grouping failed")
        Console.WriteLine("PASS: Different series with the same number and the same series with different numbers all import completely.")

        Reset("A|1|p1", "B|1|p2", "A|1|p3", "A|2|p4")
        Existing.Add("A/1")
        GetDataPurchase()
        Assert(Duplicates = 1 AndAlso Saved.Count = 2 AndAlso Saved.Contains("B/1:p2") AndAlso Saved.Contains("A/2:p4"), "Existing purchase stopped or blocked later purchases")
        Console.WriteLine("PASS: An existing exact series/number is skipped once and all other groups continue.")

        Reset(" A |001|p1", "A|1.0|p2", "A|2|p3")
        GetDataPurchase()
        Assert(Duplicates = 0 AndAlso Saved.Count = 2 AndAlso Saved.Contains("A/1:p1,p2"), "Numeric identity normalization failed")
        Console.WriteLine("PASS: Whitespace, leading zeroes and integral decimal Excel numbers group consistently.")

        Reset("|1|p1", "0|1|p2", "|1|p3")
        GetDataPurchase()
        Assert(Duplicates = 0 AndAlso Saved.Count = 2 AndAlso Saved.Contains("/1:p1,p3") AndAlso Saved.Contains("0/1:p2"), "Blank series merged with literal zero")
        Console.WriteLine("PASS: Blank series and literal series 0 remain separate purchases.")

        Reset("A|1|p1|I", "B|1|p2", "A|2|p3")
        GetDataPurchase()
        Assert(Saved.Count = 2 AndAlso Not Saved.Contains("A/1:p1"), "Already imported rows processed again")
        GetDataPurchase()
        Assert(Saved.Count = 2 AndAlso Duplicates = 0, "Retry reprocessed successful groups")
        Console.WriteLine("PASS: Successful rows are skipped on retry, including files without IMEI.")

        Reset("A|1|p1", "B|1|p2", "A|1|p3")
        d1.Columns.Add("IMEI", GetType(String))
        GetDataPurchase()
        Assert(Saved.Count = 2 AndAlso Saved.Contains("A/1:p1,p3"), "IMEI grouping failed")
        Console.WriteLine("PASS: The same grouping also works when IMEI is present.")

        Reset("O'B|1|p1", "X|1|p2", "O'B|1|p3")
        GetDataPurchase()
        Assert(Saved.Contains("O'B/1:p1,p3"), "Apostrophe series grouping failed")
        Console.WriteLine("PASS: Series containing an apostrophe remain intact.")

        Dim parsed As Integer
        For Each invalid As String In New String() {"", "0", "-1", "1.5", "12abc", "2147483648"}
            parsed = 99
            Assert(Not TryGetPurchaseTrnNo(invalid, parsed) AndAlso parsed = 0, "Invalid number reused previous identity: " + invalid)
        Next
        Assert(TryGetPurchaseTrnNo("2147483647", parsed) AndAlso parsed = Integer.MaxValue, "Maximum integer rejected")
        Console.WriteLine("PASS: Invalid transaction numbers cannot reuse a previous identity.")
    End Sub
End Class

Module Program
    Sub Main()
        Dim checks As New PurchaseChecks()
        checks.Run()
    End Sub
End Module
`;
fs.writeFileSync(path.join(__dirname, 'PurchaseGroupingChecks.vb'), harness.replace(/\n/g, '\r\n'));
console.log('Generated regression harness using the actual corrected grouping/helper methods and the original grouping method.');
