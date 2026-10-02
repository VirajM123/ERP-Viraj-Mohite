const fs=require('fs'), path=require('path'), dir=__dirname;
const full=fs.readFileSync(path.join(dir,'WinImportData.vb'),'utf8').replace(/\r\n/g,'\n');
function method(name){const re=new RegExp('    Private (?:Sub|Function) '+name+'\\(');const i=full.search(re);if(i<0)throw Error(name);const tail=full.slice(i);const m=tail.match(/^    End (Sub|Function)$/m);return tail.slice(0,m.index+m[0].length);}
const shared=['PurchaseIMEINumber','PurchaseIMEICell','PurchaseIMEIKey','PreparePurchaseIMEIRows','ReadPurchaseIMEIHeader','PurchaseIMEIInvoiceMatches','CheckPurchaseIMEIExisting','GetDataPurchaseIMEI'].map(method).join('\n');
// SQL methods are compiled but not executed. Database lookups use deterministic fixtures.
let helpers=fs.readFileSync(path.join(dir,'ImportFlowHelpers.vb'),'utf8');
const from=helpers.indexOf('    Private Function FindPurchaseInvoiceIdentity()');
const to=helpers.indexOf('    Private Sub VerifyPurchaseSave',from);
helpers=helpers.slice(0,from)+helpers.slice(to);
fs.writeFileSync(path.join(dir,'Checks.vb'),`Imports System
Imports System.Data
Imports System.Data.SqlClient
Imports System.IO
Imports System.Diagnostics
Imports System.Collections.Generic
Imports System.Windows.Forms
Public Class FakeRows
    Public Count As Integer
    Public Sub New(ByVal count As Integer)
        Me.Count = count
    End Sub
End Class
Public Class FakeGrid
    Private table As DataTable
    Public Property DataSource As Object
        Get
            Return table
        End Get
        Set(ByVal value As Object)
            table = DirectCast(value, DataTable)
        End Set
    End Property
    Public ReadOnly Property Cols As DataColumnCollection
        Get
            Return table.Columns
        End Get
    End Property
    Public ReadOnly Property Rows As FakeRows
        Get
            Return New FakeRows(table.Rows.Count + 1)
        End Get
    End Property
    Default Public Property Item(ByVal row As Integer, ByVal col As Integer) As Object
        Get
            Return table.Rows(row - 1)(col)
        End Get
        Set(ByVal value As Object)
            table.Rows(row - 1)(col) = value
        End Set
    End Property
End Class
Public Class FakeControl
    Public SelectedIndex As Integer
    Public Text As String = "test-input.xls"
End Class
Public Class MessageBox
    Public Shared Messages As New List(Of String)()
    Public Shared Function Show(ByVal ParamArray args As Object()) As DialogResult
        Messages.Add(Convert.ToString(args(0)))
        Return DialogResult.OK
    End Function
End Class
Namespace Ultimate
    Public Module Mod_Connection
        Public Function OpenYearConn() As SqlConnection
            Throw New Exception("Tests must not access a real database")
        End Function
        Public Sub CloseYearConn(ByVal connection As SqlConnection)
        End Sub
    End Module
End Namespace
Public Class Checks
    Private d1 As DataTable
    Private VsfgSelect As New FakeGrid()
    Private CmbEntry As New FakeControl()
    Private TxtFilePath As New FakeControl()
    Private start, k, start1, k1, end1 As Integer
    Private TmpSeries, TmpTrnNo, TmpInvoiceNo, SaleSave As String
    Private TmpSysCompCode As Integer
    Private TmpSysAcCode, TmpNetAmt As Double
    Private PurchaseIMEIActive As Boolean
    Private PurchaseIMEILastGroupStatus As String = ""
    Private PurchaseIMEILastGroupError As String = ""
    Private PurchaseIMEISavedCount, PurchaseIMEIDuplicateCount, PurchaseIMEIFailedCount As Integer
    Private PurchaseIMEIReport As New System.Text.StringBuilder()
    Private PurchaseIMEIReportPath As String = ""
    Private Existing As DataTable
    Private Attempted As New List(Of Integer)()
    Private SalesMode As String = "normal"
${helpers}
${shared}
    Private Function FindPurchaseIMEIHeader(ByVal series As String, ByVal number As Integer, ByVal company As Integer) As DataTable
        Dim result As DataTable = Existing.Clone()
        For Each row As DataRow In Existing.Rows
            If CInt(row("TrnNo")) = number AndAlso CInt(row("SysCompCode")) = company AndAlso CStr(row("TrnSeries")) = series Then result.ImportRow(row)
        Next
        Return result
    End Function
    Private Function FindPurchaseInvoiceIdentity() As DataTable
        Dim result As DataTable = Existing.Clone()
        For Each row As DataRow In Existing.Rows
            If CInt(row("SysAcCode")) = CInt(TmpSysAcCode) AndAlso CInt(row("SysCompCode")) = TmpSysCompCode AndAlso CStr(row("InvNo")) = TmpInvoiceNo Then result.ImportRow(row)
        Next
        Return result
    End Function
    Private Sub MakeStringPur()
        Attempted.Add(CInt(TmpTrnNo))
        If CInt(TmpTrnNo) = 2 Then Throw New InvalidOperationException("Test product failure")
        If CInt(TmpTrnNo) = 4 Then
            ValidatePurchaseSaveResult(Existing.Clone(), "test/database")
        End If
        PurchaseIMEILastGroupStatus = "SAVED"
        'Simulate legacy calculation code changing shared loop counters.
        k = 999
    End Sub
    Private Sub MakeStringSal()
        Dim number As Integer = CInt(PurchaseIMEICell(start, "TrnNo"))
        Attempted.Add(number)
        If SalesMode = "cancel" Then
            SalesImportCancelled = True
            SetSalesImportResult("CANCELLED", "Dialog closed")
        ElseIf SalesMode = "saved" Then
            SetSalesImportResult("SAVED", "Saved")
        ElseIf number = 2 Then
            Throw New InvalidOperationException("Test calculation failure")
        ElseIf number = 3 Then
            SetSalesImportResult("SKIPPED", "NEW ONLY")
        Else
            SetSalesImportResult("SAVED", "Saved")
        End If
        k = 999
    End Sub
    Private Sub Reset(ByVal entry As Integer)
        CmbEntry.SelectedIndex = entry
        d1 = New DataTable()
        For Each name As String In New String() {"TrnSeries", "TrnNo", "SysCompCodeALL", "SysAcCode", "InvNo", "Import", "SeqNo", "SysProdCode", "SchNo", "ProdCode", "ProdName", "CompAcCode", "IMEI"}
            d1.Columns.Add(name, GetType(String))
        Next
        Existing = New DataTable()
        For Each name As String In New String() {"TrnNo", "TrnSeries", "SysCompCode", "InvNo", "SysAcCode"}
            Existing.Columns.Add(name, GetType(String))
        Next
        VsfgSelect.DataSource = d1
        Attempted.Clear() : MessageBox.Messages.Clear()
        PurchaseIMEIReport.Length = 0
        PurchaseIMEISavedCount = 0 : PurchaseIMEIDuplicateCount = 0 : PurchaseIMEIFailedCount = 0
    End Sub
    Private Sub Add(ByVal number As String, Optional ByVal imported As String = "")
        d1.Rows.Add("A",number,"1","100","INV" & number,imported,"0","101","0","P1","Product","AC1","123")
    End Sub
    Private Sub Assert(ByVal condition As Boolean, ByVal description As String)
        If Not condition Then Throw New Exception(description)
    End Sub
    Public Sub Run()
        Reset(1)
        Add("10") : Add("1", "I") : Add("2") : Add("1", "I") : Add("3") : Add("4") : Add("5")
        Existing.Rows.Add("1","A","1","INV1","100")
        GetDataPurchaseIMEI()
        Assert(PurchaseIMEISavedCount = 3 AndAlso PurchaseIMEIDuplicateCount = 1 AndAlso PurchaseIMEIFailedCount = 2, "Purchase outcomes")
        Assert(String.Join(",", Attempted.ConvertAll(Function(n) n.ToString()).ToArray()) = "2,3,4,5,10", "Purchase skipped later groups")
        Assert(MessageBox.Messages.Count = 1 AndAlso MessageBox.Messages(0).Contains("Duplicate purchase"), "Duplicate message absent")
        Assert(PurchaseIMEIReport.ToString().Contains("UNVERIFIED") AndAlso PurchaseIMEIReport.ToString().Contains("Test product failure"), "Failure reasons absent")
        Reset(1) : Add("7", "I") : Existing.Rows.Add("99","A","1","INV7","100")
        GetDataPurchaseIMEI()
        Assert(PurchaseIMEIDuplicateCount = 1 AndAlso Attempted.Count = 0, "New GRN duplicated existing invoice")
        Reset(1) : Add("7", "I") : GetDataPurchaseIMEI()
        Assert(PurchaseIMEISavedCount = 1, "Stale I flag prevented purchase save")
        Reset(1) : Add("7") : Existing.Rows.Add("7","A","1","OTHER","100") : GetDataPurchaseIMEI()
        Assert(PurchaseIMEIFailedCount = 1 AndAlso Attempted.Count = 0 AndAlso PurchaseIMEIReport.ToString().Contains("key conflict"), "Key conflict treated as duplicate")
        Console.WriteLine("PASS: purchase continuation, numeric grouping, duplicate popup, changed-GRN duplicate, stale I marker, key conflict and unverified-save diagnostics.")
        Reset(0) : Add("10") : Add("1", "I") : Add("2") : Add("1", "I") : Add("3") : Add("4")
        GetDataSalesInvoices()
        Assert(SalesImportSaved = 3 AndAlso SalesImportFailed = 1 AndAlso SalesImportSkipped = 1, "Sales outcomes")
        Assert(Attempted.Count = 5 AndAlso Attempted(0) = 1 AndAlso Attempted(4) = 10, "Reimport or later sales skipped")
        Assert(SalesImportReport.ToString().Contains("Test calculation failure"), "Sales exception swallowed")
        SalesMode = "cancel" : Reset(0) : Add("1") : Add("2") : GetDataSalesInvoices()
        Assert(Attempted.Count = 1 AndAlso SalesImportCancelled, "Cancel did not stop import")
        SalesMode = "saved" : Reset(0) : Add("1") : Add("2") : d1.Rows(0)("SysProdCode") = "0" : GetDataSalesInvoices()
        Assert(SalesImportFailed = 1 AndAlso SalesImportSaved = 1 AndAlso SalesImportReport.ToString().Contains("Product not mapped"), "Missing product did not isolate bill")
        Assert(SalesOverrideDecision(DialogResult.Yes,True,False) = "OVERWRITE", "Override all")
        Assert(SalesOverrideDecision(DialogResult.No,True,False) = "UNCHANGED", "Skip unchanged")
        Assert(SalesOverrideDecision(DialogResult.No,False,False) = "OVERWRITE", "Override changed")
        Assert(SalesOverrideDecision(DialogResult.Cancel,True,True) = "OVERWRITE", "One by one yes")
        Assert(SalesOverrideDecision(DialogResult.Cancel,True,False) = "DECLINED", "One by one no")
        Assert(SalesOverrideDecision(DialogResult.OK,False,False) = "NEW ONLY", "New records only")
        Assert(SalesOverrideDecision(DialogResult.Abort,False,False) = "CANCELLED", "Dialog close")
        Console.WriteLine("PASS: sales continuation, I-marked reimports, product errors, cancel and all four override choices.")
        Reset(1) : TmpTrnNo = "7" : TmpSeries = "A" : TmpSysCompCode = 1 : TmpSysAcCode = 100 : TmpInvoiceNo = "INV7"
        Existing.Rows.Add("7","A","1","INV7","100") : ValidatePurchaseSaveResult(Existing,"test")
        Existing.Rows(0)("SysCompCode") = "2"
        Dim rejected As Boolean = False
        Try
            ValidatePurchaseSaveResult(Existing,"test")
        Catch ex As InvalidOperationException
            rejected = ex.Message.Contains("company 2")
        End Try
        Assert(rejected, "Mismatched saved company accepted")
        ShowInvoiceImportSummary("test",0,1,1,"DUPLICATE and FAILED reasons","")
        Assert(MessageBox.Messages(MessageBox.Messages.Count - 1).Contains("DUPLICATE and FAILED"), "Zero-saved summary hidden")
        Console.WriteLine("PASS: exact purchase verification, mismatch details and zero-saved summaries.")
    End Sub
End Class
Module Program
    Sub Main()
        Dim test As New Checks()
        test.Run()
    End Sub
End Module
`);
fs.writeFileSync(path.join(dir,'OverrideDesignerStub.vb'),`Imports System.Windows.Forms
Partial Public Class msg_Override
    Inherits Form
    Friend WithEvents Yes_Button As New Button()
    Friend WithEvents No_Button As New Button()
    Friend WithEvents Cancel_Button As New Button()
    Friend WithEvents BtnNewRecord As New Button()
End Class
`);
