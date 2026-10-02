Imports System
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
    'IMEI purchases only. Keep the original SQL company/series/number identity.
    Private Function PurchaseIMEINumber(ByVal Value As Object) As Integer
        Dim Number As Decimal
        If Not Decimal.TryParse(Convert.ToString(Value, System.Globalization.CultureInfo.InvariantCulture).Trim(),
                                System.Globalization.NumberStyles.AllowLeadingSign Or System.Globalization.NumberStyles.AllowDecimalPoint,
                                System.Globalization.CultureInfo.InvariantCulture, Number) OrElse
           Number <= 0D OrElse Number > Integer.MaxValue OrElse Decimal.Truncate(Number) <> Number Then
            Throw New InvalidOperationException("Invalid GRN number: " + Convert.ToString(Value))
        End If
        Return Decimal.ToInt32(Number)
    End Function

    Private Function PurchaseIMEICell(ByVal Row As Integer, ByVal Column As String) As String
        Dim ColumnIndex As Integer = VsfgSelect.Cols.IndexOf(Column)
        If ColumnIndex < 0 Then Throw New InvalidOperationException("Missing purchase column: " + Column)
        Return Convert.ToString(VsfgSelect(Row, ColumnIndex)).Trim()
    End Function

    Private Function PurchaseIMEIKey(ByVal Row As Integer) As String
        Dim Series As String = PurchaseIMEICell(Row, "TrnSeries")
        Return Series.Length.ToString() + ":" + Series + ":" +
            PurchaseIMEINumber(PurchaseIMEICell(Row, "TrnNo")).ToString() + ":" +
            Integer.Parse(PurchaseIMEICell(Row, "SysCompCodeALL")).ToString()
    End Function

    Private Sub PreparePurchaseIMEIRows()
        'A separate index provides numeric ordering without changing source column types.
        Dim Index As New DataTable()
        Index.Columns.Add("Series", GetType(String))
        Index.Columns.Add("Number", GetType(Integer))
        Index.Columns.Add("Company", GetType(Integer))
        Index.Columns.Add("Ordinal", GetType(Integer))
        Index.Columns.Add("SourceRow", GetType(Object))
        Dim Ordinal As Integer = 0
        For Each SourceRow As DataRow In d1.Rows
            If SourceRow.RowState = DataRowState.Deleted Then Continue For
            Dim Number As Integer = Integer.MaxValue
            Dim Company As Integer = 0
            'Invalid rows stay in the work list and receive an explicit failure result.
            Try
                Number = PurchaseIMEINumber(SourceRow("TrnNo"))
            Catch
            End Try
            Integer.TryParse(Convert.ToString(SourceRow("SysCompCodeALL")), Company)
            Index.Rows.Add(Convert.ToString(SourceRow("TrnSeries")).Trim(), Number, Company, Ordinal, SourceRow)
            Ordinal += 1
        Next
        Dim View As New DataView(Index)
        View.Sort = "Series ASC, Number ASC, Company ASC, Ordinal ASC"
        Dim Ordered As DataTable = d1.Clone()
        For Each Entry As DataRowView In View
            Ordered.ImportRow(DirectCast(Entry("SourceRow"), DataRow))
        Next
        d1 = Ordered
        VsfgSelect.DataSource = d1
    End Sub

    Private Sub ReadPurchaseIMEIHeader(ByVal Row As Integer)
        'Read to locals first. An invalid field must never leave a partly refreshed header.
        Dim Series As String = PurchaseIMEICell(Row, "TrnSeries")
        Dim Number As Integer = PurchaseIMEINumber(PurchaseIMEICell(Row, "TrnNo"))
        Dim Company As Integer = Integer.Parse(PurchaseIMEICell(Row, "SysCompCodeALL"))
        Dim Supplier As Integer = Integer.Parse(PurchaseIMEICell(Row, "SysAcCode"))
        If Supplier <= 0 Then Throw New InvalidOperationException("Supplier is not mapped: " + PurchaseIMEICell(Row, "CompAcCode"))
        Dim Invoice As String = PurchaseIMEICell(Row, "InvNo")
        TmpSeries = Series
        TmpTrnNo = Number.ToString(System.Globalization.CultureInfo.InvariantCulture)
        TmpSysCompCode = Company
        TmpSysAcCode = Supplier
        TmpInvoiceNo = Invoice
    End Sub

    Private Function FindPurchaseIMEIHeader(ByVal Series As String, ByVal Number As Integer,
                                          ByVal Company As Integer) As DataTable
        Dim Result As New DataTable()
        Dim Connection As SqlConnection = Ultimate.Mod_Connection.OpenYearConn()
        Try
            Using Command As New SqlCommand("SELECT TrnNo, TrnSeries, SysCompCode, InvNo, SysAcCode FROM T_Pur_Header WHERE TrnNo=@Number AND ISNULL(TrnSeries,'')=@Series AND SysCompCode=@Company", Connection)
                Command.Parameters.Add("@Number", SqlDbType.Int).Value = Number
                Command.Parameters.Add("@Series", SqlDbType.VarChar).Value = Series
                Command.Parameters.Add("@Company", SqlDbType.Int).Value = Company
                Using Reader As SqlDataReader = Command.ExecuteReader()
                    Result.Load(Reader)
                End Using
            End Using
        Finally
            Ultimate.Mod_Connection.CloseYearConn(Connection)
        End Try
        Return Result
    End Function

    Private Function PurchaseIMEIInvoiceMatches(ByVal Header As DataRow) As Boolean
        Return String.Equals(Convert.ToString(Header("InvNo")).Trim(), TmpInvoiceNo.Trim(), StringComparison.OrdinalIgnoreCase) AndAlso
            Convert.ToString(Header("SysAcCode")).Trim() = TmpSysAcCode.ToString().Trim()
    End Function

    Private Function CheckPurchaseIMEIExisting() As Boolean
        Dim Existing As DataTable = FakeFind(TmpSeries, CInt(TmpTrnNo), TmpSysCompCode)
        If Existing.Rows.Count = 0 Then Return False
        If Existing.Rows.Count <> 1 Then
            Throw New InvalidOperationException("Multiple database headers match this company/series/GRN. Review the existing records.")
        End If
        Dim Header As DataRow = Existing.Rows(0)
        If Not PurchaseIMEIInvoiceMatches(Header) Then
            Throw New InvalidOperationException("GRN key conflict, not a duplicate invoice. Existing invoice: " +
                Convert.ToString(Header("InvNo")) + "; supplier code: " + Convert.ToString(Header("SysAcCode")) +
                ". Incoming invoice: " + TmpInvoiceNo + "; supplier code: " + TmpSysAcCode.ToString() +
                ". No existing purchase was overwritten.")
        End If
        PurchaseIMEILastGroupStatus = "DUPLICATE"
        PurchaseIMEILastGroupError = "Database match: company " + TmpSysCompCode.ToString() +
            ", " + TmpSeries + " " + TmpTrnNo + ", invoice " + Convert.ToString(Header("InvNo")) +
            ", supplier " + Convert.ToString(Header("SysAcCode"))
        Return True
    End Function

    Private Sub GetDataPurchaseIMEI()
        Dim PurchaseRow As Integer = 1
        Dim Processed As New System.Collections.Generic.HashSet(Of String)(StringComparer.Ordinal)
        PurchaseIMEIActive = True
        PurchaseIMEIReport.AppendLine("Purchase import results - " + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"))
        PurchaseIMEIReport.AppendLine("Input: " + TxtFilePath.Text)
        Try
            PreparePurchaseIMEIRows()
            While PurchaseRow < VsfgSelect.Rows.Count
                Dim GroupStart As Integer = PurchaseRow
                Dim GroupEnd As Integer = PurchaseRow
                Dim Description As String = "Working row " + PurchaseRow.ToString()
                PurchaseIMEILastGroupStatus = ""
                PurchaseIMEILastGroupError = ""
                Try
                    Description = PurchaseIMEICell(GroupStart, "TrnSeries") + " " + PurchaseIMEICell(GroupStart, "TrnNo") +
                        " | Invoice " + PurchaseIMEICell(GroupStart, "InvNo") +
                        " | Company " + PurchaseIMEICell(GroupStart, "SysCompCodeALL")
                    Dim Key As String = PurchaseIMEIKey(GroupStart)
                    While GroupEnd + 1 < VsfgSelect.Rows.Count
                        Dim NextKey As String
                        Try
                            NextKey = PurchaseIMEIKey(GroupEnd + 1)
                        Catch
                            Exit While
                        End Try
                        If NextKey <> Key Then Exit While
                        GroupEnd += 1
                    End While
                    If Not Processed.Add(Key) Then
                        Throw New InvalidOperationException("This GRN appeared again after grouping. Remaining rows were not saved; review the group identity.")
                    End If
                    start = GroupStart
                    k = GroupEnd
                    start1 = GroupStart
                    k1 = GroupEnd
                    end1 = GroupEnd
                    ReadPurchaseIMEIHeader(GroupStart)
                    Dim Invoice As String = TmpInvoiceNo
                    Dim Supplier As String = TmpSysAcCode.ToString()
                    Dim ImportedRows As Integer = 0
                    For Row As Integer = GroupStart To GroupEnd
                        If PurchaseIMEICell(Row, "InvNo") <> Invoice OrElse PurchaseIMEICell(Row, "SysAcCode") <> Supplier Then
                            Throw New InvalidOperationException("Different invoices/suppliers use the same company/series/GRN in the file.")
                        End If
                        If PurchaseIMEICell(Row, "Import").ToUpperInvariant() = "I" Then ImportedRows += 1
                        VsfgSelect(Row, VsfgSelect.Cols.IndexOf("SeqNo")) = Row - GroupStart + 1
                    Next
                    If ImportedRows = GroupEnd - GroupStart + 1 Then
                        'Already completed by this grid session: do not label it a database duplicate.
                        PurchaseIMEILastGroupStatus = "ALREADY PROCESSED"
                    ElseIf ImportedRows > 0 Then
                        Throw New InvalidOperationException("Only part of this GRN is marked imported. Review the existing purchase before retrying.")
                    ElseIf Not CheckPurchaseIMEIExisting() Then
                        MakeStringPur()
                        If PurchaseIMEILastGroupStatus = "" Then
                            Throw New InvalidOperationException("Purchase preparation returned without saving or recording a result.")
                        End If
                    End If
                Catch exGroup As Exception
                    PurchaseIMEILastGroupStatus = "FAILED"
                    PurchaseIMEILastGroupError = exGroup.Message
                    Debug.WriteLine("PURCHASE FAILED: " + Description + Environment.NewLine + exGroup.ToString())
                End Try
                Select Case PurchaseIMEILastGroupStatus
                    Case "SAVED"
                        PurchaseIMEISavedCount += 1
                    Case "DUPLICATE"
                        PurchaseIMEIDuplicateCount += 1
                    Case "ALREADY PROCESSED"
                        'Do not inflate either saved or duplicate counts on retry.
                    Case Else
                        PurchaseIMEIFailedCount += 1
                End Select
                PurchaseIMEIReport.AppendLine(Description + " | Rows " + GroupStart.ToString() + "-" + GroupEnd.ToString() +
                    " | " + PurchaseIMEILastGroupStatus + " | " + PurchaseIMEILastGroupError)
                'Use local boundaries, independent of shared counters used by calculations.
                PurchaseRow = GroupEnd + 1
            End While
        Catch ex As Exception
            PurchaseIMEIFailedCount += 1
            PurchaseIMEIReport.AppendLine("IMPORT STOPPED; remaining rows were not attempted: " + ex.ToString())
        Finally
            PurchaseIMEIActive = False
            PurchaseIMEIReport.AppendLine("Saved: " + PurchaseIMEISavedCount.ToString() +
                "; existing: " + PurchaseIMEIDuplicateCount.ToString() + "; failed: " + PurchaseIMEIFailedCount.ToString())
            Try
                PurchaseIMEIReportPath = Path.Combine(Path.GetTempPath(), "PurchaseImport-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + "-" + Guid.NewGuid().ToString("N") + ".txt")
                File.WriteAllText(PurchaseIMEIReportPath, PurchaseIMEIReport.ToString())
            Catch ex As Exception
                PurchaseIMEIReportPath = ""
                PurchaseIMEIReport.AppendLine("Could not write the report: " + ex.Message)
            End Try
        End Try
    End Sub

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
        Existing.Rows.Add("GRN", 2, 1, "PO\00001", 100)
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
