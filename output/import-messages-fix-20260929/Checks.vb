Imports System
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
    Private SalesImportActive As Boolean = False
    Private SalesImportStatus As String = ""
    Private SalesImportReason As String = ""
    Private SalesImportSaved As Integer = 0
    Private SalesImportSkipped As Integer = 0
    Private SalesImportFailed As Integer = 0
    Private SalesImportCancelled As Boolean = False
    Private SalesImportReport As New System.Text.StringBuilder()
    Private SalesImportReportPath As String = ""

    Private Function UsesTrackedSalesImport() As Boolean
        Return CmbEntry.SelectedIndex = 0 AndAlso d1 IsNot Nothing AndAlso
            (d1.Columns.Contains("IMEI") OrElse d1.Columns.Contains("ImportTotalsVersion"))
    End Function

    Private Sub SetSalesImportResult(ByVal status As String, ByVal reason As String)
        If Not SalesImportActive Then Return
        SalesImportStatus = status
        SalesImportReason = reason
    End Sub

    Private Sub GetDataSalesInvoices()
        SalesImportActive = True
        SalesImportSaved = 0 : SalesImportSkipped = 0 : SalesImportFailed = 0
        SalesImportCancelled = False
        SalesImportReport.Length = 0
        SalesImportReport.AppendLine("Sales import results - " & DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"))
        SalesImportReport.AppendLine("Input: " & TxtFilePath.Text)
        Dim cursor As Integer = 1
        Try
            'Same numeric company/series/number ordering used by the purchase controller.
            PreparePurchaseIMEIRows()
            While cursor < VsfgSelect.Rows.Count
                Dim first As Integer = cursor
                Dim last As Integer = cursor
                Dim description As String = "Row " & cursor.ToString()
                SalesImportStatus = "" : SalesImportReason = ""
                SaleSave = ""
                Try
                    description = PurchaseIMEICell(first, "TrnSeries") & " " & PurchaseIMEICell(first, "TrnNo")
                    Dim key As String = PurchaseIMEIKey(first)
                    While last + 1 < VsfgSelect.Rows.Count
                        Dim nextKey As String
                        Try
                            nextKey = PurchaseIMEIKey(last + 1)
                        Catch
                            Exit While
                        End Try
                        If nextKey <> key Then Exit While
                        last += 1
                    End While
                    start = first : k = last : start1 = first : k1 = last : end1 = last
                    Dim party As String = PurchaseIMEICell(first, "SysAcCode")
                    If Microsoft.VisualBasic.Conversion.Val(party) <= 0 Then Throw New InvalidOperationException("Customer is not mapped: " & PurchaseIMEICell(first, "CompAcCode"))
                    For row As Integer = first To last
                        If PurchaseIMEICell(row, "SysAcCode") <> party Then Throw New InvalidOperationException("Different customers share this sales transaction number.")
                        If Microsoft.VisualBasic.Conversion.Val(PurchaseIMEICell(row, "SysProdCode")) <= 0 AndAlso Microsoft.VisualBasic.Conversion.Val(PurchaseIMEICell(row, "SchNo")) = 0 Then
                            Throw New InvalidOperationException("Product not mapped at row " & row.ToString() & ": " & PurchaseIMEICell(row, "ProdCode") & " " & PurchaseIMEICell(row, "ProdName"))
                        End If
                        VsfgSelect(row, VsfgSelect.Cols.IndexOf("SeqNo")) = row - first + 1
                    Next
                    'An I marker is not a duplicate check. Reimports must reach the
                    'database and the four-choice override dialog again.
                    MakeStringSal()
                    If SalesImportStatus = "" Then Throw New InvalidOperationException("Sales preparation returned without saving. Review the validation message for this bill.")
                Catch ex As Exception
                    If SalesImportStatus <> "UNVERIFIED" Then SalesImportStatus = "FAILED"
                    SalesImportReason = ex.Message
                    Debug.WriteLine("SALES FAILED: " & description & Environment.NewLine & ex.ToString())
                End Try
                Select Case SalesImportStatus
                    Case "SAVED"
                        SalesImportSaved += 1
                    Case "SKIPPED", "CANCELLED"
                        SalesImportSkipped += 1
                    Case Else
                        SalesImportFailed += 1
                End Select
                SalesImportReport.AppendLine(description & " | Rows " & first.ToString() & "-" & last.ToString() & " | " & SalesImportStatus & " | " & SalesImportReason)
                cursor = last + 1
                If SalesImportCancelled Then
                    SalesImportReport.AppendLine("Import cancelled; remaining detail rows not attempted: " & (VsfgSelect.Rows.Count - cursor).ToString())
                    Exit While
                End If
            End While
        Catch ex As Exception
            SalesImportFailed += 1
            SalesImportReport.AppendLine("IMPORT STOPPED: " & ex.Message)
        Finally
            SalesImportActive = False
            SalesImportReportPath = WriteInvoiceReport("SalesImport", SalesImportReport.ToString())
        End Try
    End Sub

    Private Function WriteInvoiceReport(ByVal prefix As String, ByVal contents As String) As String
        Try
            Dim reportFile As String = Path.Combine(Path.GetTempPath(), prefix & "-" & DateTime.Now.ToString("yyyyMMdd-HHmmss") & "-" & Guid.NewGuid().ToString("N") & ".txt")
            File.WriteAllText(reportFile, contents)
            Return reportFile
        Catch
            Return ""
        End Try
    End Function

    Private Sub ShowInvoiceImportSummary(ByVal title As String, ByVal saved As Integer, ByVal skipped As Integer, ByVal failed As Integer, ByVal report As String, ByVal reportFile As String)
        Dim message As String = "Saved: " & saved.ToString() & Environment.NewLine &
            "Existing / skipped: " & skipped.ToString() & Environment.NewLine &
            "Failed / unverified: " & failed.ToString() & Environment.NewLine & Environment.NewLine
        'Show the reasons even when zero invoices were saved.
        If report.Length > 6500 AndAlso reportFile <> "" Then
            message &= report.Substring(0, 6500) & Environment.NewLine & "Further results are in the report."
        Else
            message &= report
        End If
        If reportFile <> "" Then message &= Environment.NewLine & "Full report: " & reportFile
        MessageBox.Show(message, title, MessageBoxButtons.OK, If(failed > 0, MessageBoxIcon.Warning, MessageBoxIcon.Information))
    End Sub

    Private Sub VerifyPurchaseSave(ByVal connection As SqlConnection)
        'Verify on the SAME connection/database as Add_Purchase, before closing it.
        Dim found As New DataTable()
        Using command As New SqlCommand("SELECT TrnNo,TrnSeries,SysCompCode,InvNo,SysAcCode FROM T_Pur_Header WHERE (TrnNo=@Number AND LTRIM(RTRIM(ISNULL(TrnSeries,'')))=@Series) OR (SysCompCode=@Company AND SysAcCode=@Supplier AND LTRIM(RTRIM(InvNo))=@Invoice)", connection)
            command.Parameters.Add("@Number", SqlDbType.Int).Value = CInt(TmpTrnNo)
            command.Parameters.Add("@Series", SqlDbType.VarChar).Value = TmpSeries.Trim()
            command.Parameters.Add("@Company", SqlDbType.Int).Value = TmpSysCompCode
            command.Parameters.Add("@Supplier", SqlDbType.Int).Value = TmpSysAcCode
            command.Parameters.Add("@Invoice", SqlDbType.VarChar).Value = TmpInvoiceNo.Trim()
            Using reader As SqlDataReader = command.ExecuteReader()
                found.Load(reader)
            End Using
        End Using
        ValidatePurchaseSaveResult(found, connection.DataSource & "/" & connection.Database)
    End Sub

    Private Sub ValidatePurchaseSaveResult(ByVal found As DataTable, ByVal database As String)
        Dim exact As Integer = 0
        Dim details As New System.Text.StringBuilder()
        For Each header As DataRow In found.Rows
            If Convert.ToInt32(header("TrnNo")) = CInt(TmpTrnNo) AndAlso
                String.Equals(Convert.ToString(header("TrnSeries")).Trim(), TmpSeries.Trim(), StringComparison.OrdinalIgnoreCase) AndAlso
                Convert.ToInt32(header("SysCompCode")) = TmpSysCompCode AndAlso PurchaseIMEIInvoiceMatches(header) Then exact += 1
            details.AppendLine("Found " & Convert.ToString(header("TrnSeries")).Trim() & " " & Convert.ToString(header("TrnNo")) &
                "; company " & Convert.ToString(header("SysCompCode")) & "; supplier " & Convert.ToString(header("SysAcCode")) & "; invoice " & Convert.ToString(header("InvNo")))
        Next
        If exact = 1 Then Return
        PurchaseIMEILastGroupStatus = "UNVERIFIED"
        Throw New InvalidOperationException("Purchase save could not be verified in " & database & ". Expected " & TmpSeries & " " & TmpTrnNo &
            "; company " & TmpSysCompCode.ToString() & "; supplier " & TmpSysAcCode.ToString() & "; invoice " & TmpInvoiceNo & ". " &
            If(found.Rows.Count = 0, "No matching header was returned.", details.ToString()) &
            " Check Add_Purchase and its saved key/return behavior. This is not confirmed as a successful import; check the database before retrying.")
    End Sub

    Private Function SalesOverrideDecision(ByVal choice As DialogResult, ByVal sameNet As Boolean, ByVal confirmOne As Boolean) As String
        Select Case choice
            Case DialogResult.Yes
                Return "OVERWRITE"
            Case DialogResult.No
                Return If(sameNet, "UNCHANGED", "OVERWRITE")
            Case DialogResult.Cancel
                Return If(confirmOne, "OVERWRITE", "DECLINED")
            Case DialogResult.OK
                Return "NEW ONLY"
            Case Else
                Return "CANCELLED"
        End Select
    End Function

    Private Sub VerifySalesSave(ByVal connection As SqlConnection)
        Using command As New SqlCommand("SELECT SysCompCode,SysAcCode,NetAmt FROM T_Sal_Header WHERE TrnNo=@Number AND LTRIM(RTRIM(ISNULL(TrnSeries,'')))=@Series", connection)
            command.Parameters.Add("@Number", SqlDbType.Int).Value = CInt(TmpTrnNo)
            command.Parameters.Add("@Series", SqlDbType.VarChar).Value = TmpSeries.Trim()
            Dim found As New DataTable()
            Using reader As SqlDataReader = command.ExecuteReader()
                found.Load(reader)
            End Using
            If found.Rows.Count = 1 AndAlso Convert.ToInt32(found.Rows(0)("SysCompCode")) = TmpSysCompCode AndAlso
                Convert.ToInt32(found.Rows(0)("SysAcCode")) = CInt(TmpSysAcCode) AndAlso
                Decimal.Round(Convert.ToDecimal(found.Rows(0)("NetAmt")), 2) = Decimal.Round(CDec(TmpNetAmt), 2) Then Return
            SalesImportStatus = "UNVERIFIED"
            Throw New InvalidOperationException("Add_Sales returned but the saved bill could not be verified: " & TmpSeries & "/" & TmpTrnNo &
                "; company " & TmpSysCompCode.ToString() & "; customer " & TmpSysAcCode.ToString() & "; database " & connection.Database &
                ". Check the database before retrying. Serial stock-out was not run by this importer.")
        End Using
    End Sub

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
    Private Function PurchaseIMEIInvoiceMatches(ByVal Header As DataRow) As Boolean
        Return String.Equals(Convert.ToString(Header("InvNo")).Trim(), TmpInvoiceNo.Trim(), StringComparison.OrdinalIgnoreCase) AndAlso
            Convert.ToString(Header("SysAcCode")).Trim() = TmpSysAcCode.ToString().Trim()
    End Function
    Private Function CheckPurchaseIMEIExisting() As Boolean
        Dim Existing As DataTable = FindPurchaseIMEIHeader(TmpSeries, CInt(TmpTrnNo), TmpSysCompCode)
        If Existing.Rows.Count = 0 Then
            'Regenerating a file can allocate a new GRN to an invoice already saved.
            Existing = FindPurchaseInvoiceIdentity()
            If Existing.Rows.Count = 0 Then Return False
        End If
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
        MessageBox.Show("Duplicate purchase: invoice " & Convert.ToString(Header("InvNo")) &
            " already exists as " & Convert.ToString(Header("TrnSeries")).Trim() & " " & Convert.ToString(Header("TrnNo")) &
            ". This purchase was skipped; other invoices will continue.", "Duplicate purchase", MessageBoxButtons.OK, MessageBoxIcon.Information)
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
                    If Not CheckPurchaseIMEIExisting() Then
                        'A previous grid marker cannot prove that a database save exists.
                        For row As Integer = GroupStart To GroupEnd
                            VsfgSelect(row, VsfgSelect.Cols.IndexOf("Import")) = ""
                        Next
                        MakeStringPur()
                        If PurchaseIMEILastGroupStatus = "" Then
                            Throw New InvalidOperationException("Purchase preparation returned without saving or recording a result.")
                        End If
                    End If
                Catch exGroup As Exception
                    If PurchaseIMEILastGroupStatus <> "UNVERIFIED" Then PurchaseIMEILastGroupStatus = "FAILED"
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
