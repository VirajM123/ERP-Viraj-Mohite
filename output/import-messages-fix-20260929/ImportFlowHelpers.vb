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

    Private Function FindPurchaseInvoiceIdentity() As DataTable
        Dim result As New DataTable()
        If TmpInvoiceNo.Trim() = "" Then Return result
        Dim connection As SqlConnection = Ultimate.Mod_Connection.OpenYearConn()
        Try
            Using command As New SqlCommand("SELECT TrnNo,TrnSeries,SysCompCode,InvNo,SysAcCode FROM T_Pur_Header WHERE SysCompCode=@Company AND SysAcCode=@Supplier AND LTRIM(RTRIM(InvNo))=@Invoice", connection)
                command.Parameters.Add("@Company", SqlDbType.Int).Value = TmpSysCompCode
                command.Parameters.Add("@Supplier", SqlDbType.Int).Value = TmpSysAcCode
                command.Parameters.Add("@Invoice", SqlDbType.VarChar).Value = TmpInvoiceNo.Trim()
                Using reader As SqlDataReader = command.ExecuteReader()
                    result.Load(reader)
                End Using
            End Using
        Finally
            Ultimate.Mod_Connection.CloseYearConn(connection)
        End Try
        Return result
    End Function

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
