const fs=require('fs'), path=require('path'), x=require('xlsx');
const w=x.readFile('D:/JNJ_PurchaseImport.xls');
const rows=x.utils.sheet_to_json(w.Sheets.Sheet2,{defval:''});
fs.writeFileSync(path.join(__dirname,'input.tsv'),rows.map(r=>[r.TrnSeries,r.TrnNo,1,100,r.InvNo,'',0,r.ProdCode].join('\t')).join('\n'));
let helpers=fs.readFileSync(path.join(__dirname,'helpers.vb'),'utf8');
// Keep the real SQL helper compiled, but use a deterministic database adapter in tests.
helpers=helpers.replace('Dim Existing As DataTable = FindPurchaseIMEIHeader(', 'Dim Existing As DataTable = FakeFind(');
const harness=`Imports System
Imports System.Data
Imports System.Data.SqlClient
Imports System.Diagnostics
Imports System.IO
Imports System.Collections.Generic
Public Class FakeGrid
    Private Table As DataTable
    Public Property DataSource As Object
        Get
            Return Table
        End Get
        Set(ByVal Value As Object)
            Table = DirectCast(Value, DataTable)
        End Set
    End Property
    Public ReadOnly Property Cols As DataColumnCollection
        Get
            Return Table.Columns
        End Get
    End Property
    Public ReadOnly Property Rows As FakeRows
        Get
            Return New FakeRows(Table.Rows.Count + 1)
        End Get
    End Property
    Default Public Property Item(ByVal Row As Integer, ByVal Col As Integer) As Object
        Get
            Return Table.Rows(Row - 1)(Col)
        End Get
        Set(ByVal Value As Object)
            Table.Rows(Row - 1)(Col) = Value
        End Set
    End Property
End Class
Public Class FakeRows
    Public Count As Integer
    Public Sub New(ByVal n As Integer)
        Count = n
    End Sub
End Class
Public Class FakeText
    Public Text As String = "JNJ_PurchaseImport.xls"
End Class
Namespace Ultimate
    Public Module Mod_Connection
        Public Function OpenYearConn() As SqlConnection
            Throw New Exception("Live database calls are disabled in these tests.")
        End Function
        Public Sub CloseYearConn(ByVal c As SqlConnection)
        End Sub
    End Module
End Namespace
Public Class Checks
    Private d1 As DataTable
    Private VsfgSelect As New FakeGrid()
    Private TxtFilePath As New FakeText()
    Private start, k, start1, k1, end1 As Integer
    Private TmpSeries, TmpTrnNo, TmpInvoiceNo As String
    Private TmpSysCompCode, TmpSysAcCode As Integer
    Private PurchaseIMEIActive As Boolean
    Private PurchaseIMEISavedCount, PurchaseIMEIDuplicateCount, PurchaseIMEIFailedCount As Integer
    Private PurchaseIMEILastGroupStatus, PurchaseIMEILastGroupError, PurchaseIMEIReportPath As String
    Private PurchaseIMEIReport As New System.Text.StringBuilder()
    Private Existing As DataTable
    Private Saved As New List(Of Integer)()
    Private SavedRows As Integer
    Private FailNumber As Integer
${helpers}
    Private Function FakeFind(ByVal Series As String, ByVal Number As Integer, ByVal Company As Integer) As DataTable
        Dim Result As DataTable = Existing.Clone()
        For Each Row As DataRow In Existing.Rows
            If CStr(Row("TrnSeries")) = Series AndAlso CInt(Row("TrnNo")) = Number AndAlso CInt(Row("SysCompCode")) = Company Then Result.ImportRow(Row)
        Next
        Return Result
    End Function
    Private Sub MakeStringPur()
        If CInt(TmpTrnNo) = FailNumber Then Throw New Exception("Simulated product mapping or SQL failure")
        Saved.Add(CInt(TmpTrnNo))
        SavedRows += k - start + 1
        Existing.Rows.Add(TmpSeries, CInt(TmpTrnNo), TmpSysCompCode, TmpInvoiceNo, TmpSysAcCode)
        For Row As Integer = start To k
            VsfgSelect(Row, VsfgSelect.Cols.IndexOf("Import")) = "I"
        Next
        PurchaseIMEILastGroupStatus = "SAVED"
    End Sub
    Private Sub Reset(ByVal Input As String())
        d1 = New DataTable()
        For Each Name As String In New String() {"TrnSeries", "TrnNo", "SysCompCodeALL", "SysAcCode", "InvNo", "Import", "SeqNo", "ProdCode"}
            d1.Columns.Add(Name, GetType(String))
        Next
        For Each Line As String In Input
            d1.Rows.Add(Line.Split(ChrW(9)))
        Next
        VsfgSelect.DataSource = d1
        Existing = New DataTable()
        Existing.Columns.Add("TrnSeries", GetType(String))
        Existing.Columns.Add("TrnNo", GetType(Integer))
        Existing.Columns.Add("SysCompCode", GetType(Integer))
        Existing.Columns.Add("InvNo", GetType(String))
        Existing.Columns.Add("SysAcCode", GetType(Integer))
        Saved.Clear()
        SavedRows = 0
        FailNumber = 0
        PurchaseIMEISavedCount = 0
        PurchaseIMEIDuplicateCount = 0
        PurchaseIMEIFailedCount = 0
        PurchaseIMEIReport.Length = 0
    End Sub
    Private Sub Assert(ByVal Condition As Boolean, ByVal Message As String)
        If Not Condition Then Throw New Exception(Message + Environment.NewLine + PurchaseIMEIReport.ToString())
    End Sub
    Public Sub Run(ByVal InputPath As String)
        Dim Input As String() = File.ReadAllLines(InputPath)
        Reset(Input)
        GetDataPurchaseIMEI()
        Assert(Saved.Count = 21 AndAlso SavedRows = 1635 AndAlso PurchaseIMEIDuplicateCount = 0 AndAlso PurchaseIMEIFailedCount = 0, "Full file traversal")
        For n As Integer = 1 To 21
            Assert(Saved(n - 1) = n, "Numeric order")
        Next
        Console.WriteLine("PASS: All 1,635 workbook rows reach 21 complete GRNs in numeric order, with no duplicates.")
        GetDataPurchaseIMEI()
        Assert(Saved.Count = 21 AndAlso PurchaseIMEIDuplicateCount = 0, "Retry")
        Console.WriteLine("PASS: Same-session retry does not report successfully processed rows as duplicates.")
        Reset(Input)
        FailNumber = 14
        GetDataPurchaseIMEI()
        Assert(Saved.Count = 20 AndAlso Saved.Contains(21) AndAlso PurchaseIMEIFailedCount = 1 AndAlso PurchaseIMEIReport.ToString().Contains("Simulated product"), "Failure continuation")
        Console.WriteLine("PASS: A simulated GRN 14 failure is retained in the report; GRNs 15-21 still run.")
        Reset(Input)
        Existing.Rows.Add("GRN", 2, 1, "PO\\00001", 100)
        GetDataPurchaseIMEI()
        Assert(PurchaseIMEIDuplicateCount = 1 AndAlso Saved.Count = 20 AndAlso Not Saved.Contains(2), "Real duplicate")
        Console.WriteLine("PASS: An existing matching GRN/invoice/supplier is skipped exactly once.")
        Reset(Input)
        Existing.Rows.Add("GRN", 2, 1, "OTHER-INVOICE", 100)
        GetDataPurchaseIMEI()
        Assert(PurchaseIMEIDuplicateCount = 0 AndAlso PurchaseIMEIFailedCount = 1 AndAlso Saved.Count = 20 AndAlso PurchaseIMEIReport.ToString().Contains("GRN key conflict"), "Key conflict")
        Console.WriteLine("PASS: An occupied GRN belonging to another invoice is a conflict, not a duplicate invoice.")
        Reset(New String() {"A|01|1|100|I1||0|p1".Replace("|", vbTab), "A|1.0|1|100|I1||0|p2".Replace("|", vbTab), "A|1|2|100|I2||0|p3".Replace("|", vbTab)})
        GetDataPurchaseIMEI()
        Assert(Saved.Count = 2 AndAlso SavedRows = 3 AndAlso PurchaseIMEIDuplicateCount = 0, "Normalized identity and company")
        Console.WriteLine("PASS: Equivalent numeric GRNs group together; different companies remain separate.")
        Reset(New String() {"A|bad|1|100|I1||0|p1".Replace("|", vbTab), "A|22|1|100|I2||0|p2".Replace("|", vbTab)})
        GetDataPurchaseIMEI()
        Assert(Saved.Count = 1 AndAlso Saved(0) = 22 AndAlso PurchaseIMEIFailedCount = 1, "Invalid header")
        Console.WriteLine("PASS: Invalid GRNs fail explicitly and do not reuse a previous identity.")
        Reset(New String() {"A|1|1|100|I1|I|0|p1".Replace("|", vbTab), "A|1|1|100|I1||0|p2".Replace("|", vbTab)})
        GetDataPurchaseIMEI()
        Assert(Saved.Count = 0 AndAlso PurchaseIMEIFailedCount = 1, "Partial group")
        Console.WriteLine("PASS: A partially marked group is not silently imported as an incomplete purchase.")
    End Sub
End Class
Module Program
    Sub Main(ByVal Args As String())
        Dim Test As New Checks()
        Test.Run(Args(0))
    End Sub
End Module
`;
fs.writeFileSync(path.join(__dirname,'Checks.vb'),harness);
