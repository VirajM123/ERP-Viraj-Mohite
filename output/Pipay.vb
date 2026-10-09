' =====================================================
' COMPLETE MODIFIED CODE - Pipay.vb
' With Small Grid + Scrollbar
' =====================================================

Imports System
Imports System.IO
Imports System.Web
Imports System.Net
Imports System.Text
Imports Newtonsoft.Json
Imports System.Net.Http
Imports System.Net.Http.Headers
Imports System.Data.SqlClient
Imports System.Threading.Tasks
Imports System.Security.Cryptography.X509Certificates
Imports System.Net.Security
Imports Google.Apis.Auth.OAuth2.Responses
Imports TotalSolution.pipay_salesorder
Imports System.Linq
Imports Newtonsoft.Json.Linq

Public Class Pipay
    Private IsValidt As Boolean
    Private Dsfrm As New System.Data.DataSet
    Private Dsfrm1 As New System.Data.DataSet
    Private Dsfrm2 As New System.Data.DataSet
    Private Dsfrm3 As New System.Data.DataSet
    Private Dsfrm4 As New System.Data.DataSet

    Private dataTable As New System.Data.DataTable
    Private dataTable1 As New System.Data.DataTable
    Private dataTable2 As New System.Data.DataTable
    Private dataTable3 As New System.Data.DataTable
    Private dataTable4 As New System.Data.DataTable

    ' --- API Endpoints ---
    Private ReadOnly BaseApiUrl As String = "https://totalmobileapp.onrender.com/api"
    ' Private ReadOnly BaseApiUrl As String = "http://localhost:3000/api"
    Private ReadOnly PartyMasterApiUrl As String = BaseApiUrl & "/import/customers"
    Private ReadOnly ProductsMasterApiUrl As String = BaseApiUrl & "/import/products"
    Private ReadOnly OrdersApiUrl As String = BaseApiUrl & "/orders"
    Private ReadOnly DeleteOrderApiUrl As String = BaseApiUrl & "/orders"
    Private ReadOnly UpdateOrderStatusApiUrl As String = BaseApiUrl & "/orders/status"
    Private ReadOnly OutstandingUploadApiUrl As String = BaseApiUrl & "/outstanding/upload"
    Private ReadOnly PaymentsByDistributorApiUrl As String = BaseApiUrl & "/payments/distributor"

    ' --- Distributor Info ---
    Private DistributorId As String = ""
    Private CreatedBy As String = ""
    Private XApiKey As String = ""

    ' --- Update existing flag ---
    Private Const UpdateExisting As Boolean = True

    ' --- Dictionary to cache salesman code mappings for performance ---
    Private salesmanCodeCache As New Dictionary(Of String, String)(StringComparer.OrdinalIgnoreCase)

    ' --- Store downloaded collections for grid display ---
    Private downloadedPayments As List(Of Payment) = Nothing
    Private ReadOnly receiptPanel As New Panel()
    Private ReadOnly receiptToolbar As New Panel()
    Private ReadOnly receiptFooter As New Panel()
    Private ReadOnly receiptTitle As New Label()
    Private ReadOnly receiptDownloadButton As New Button()
    Private ReadOnly receiptSeriesLabel As New Label()
    Private ReadOnly receiptSeriesText As New TextBox()
    Private ReadOnly receiptLoadLabel As New Label()
    Private ReadOnly receiptLoadText As New TextBox()
    Private ReadOnly receiptInvoiceLabel As New Label()
    Private ReadOnly receiptInvoiceSearch As New TextBox()
    Private ReadOnly receiptCloseButton As New Button()
    Private ReadOnly receiptSelectAll As New CheckBox()
    Private updatingReceiptSelection As Boolean = False
    Private receiptLoadInvoices As HashSet(Of String) = Nothing
    Private receiptLoadSearchVersion As Integer = 0
    Private receiptControlsReady As Boolean = False

    Private Function InvoiceKey(series As String, number As Integer) As String
        Return If(series, "").Trim().ToUpperInvariant() & "|" & number.ToString()
    End Function

    Private Function CollectionKey(payment As Payment) As String
        Return If(payment.collection_id, "").Trim()
    End Function

    ' MicrCode is the collection ID marker used by the existing receipt procedure.
    Private Function GetExistingCollectionIds(payments As IEnumerable(Of Payment)) As HashSet(Of String)
        Dim existing As New HashSet(Of String)(StringComparer.OrdinalIgnoreCase)
        Dim ids As New List(Of String)()
        Dim seenIds As New HashSet(Of String)(StringComparer.OrdinalIgnoreCase)
        For Each payment As Payment In payments
            Dim id As String = CollectionKey(payment)
            If id.Length > 0 AndAlso seenIds.Add(id) Then ids.Add(id)
        Next
        If ids.Count = 0 Then Return existing

        Using connection As SqlConnection = Ultimate.Mod_Connection.OpenYearConn()
            For offset As Integer = 0 To ids.Count - 1 Step 500
                Dim batch As List(Of String) = ids.GetRange(offset, Math.Min(500, ids.Count - offset))
                Using command As New SqlCommand()
                    command.Connection = connection
                    Dim names As New List(Of String)
                    For i As Integer = 0 To batch.Count - 1
                        Dim name As String = "@id" & i.ToString()
                        names.Add(name)
                        command.Parameters.Add(name, SqlDbType.VarChar).Value = batch(i)
                    Next
                    command.CommandText = "SELECT MicrCode FROM T_Rec_Header WHERE LTRIM(RTRIM(MicrCode)) IN (" & String.Join(",", names) & ")"
                    Using reader As SqlDataReader = command.ExecuteReader()
                        While reader.Read()
                            If Not reader.IsDBNull(0) Then existing.Add(reader.GetString(0).Trim())
                        End While
                    End Using
                End Using
            Next
        End Using
        Return existing
    End Function

    Private Sub ConfigureReceiptFilters()
        If receiptControlsReady Then Return
        receiptControlsReady = True
        receiptPanel.Dock = DockStyle.Fill
        receiptPanel.BackColor = Color.White
        receiptPanel.Visible = False
        receiptToolbar.Dock = DockStyle.Top
        receiptToolbar.Height = 116
        receiptToolbar.BackColor = Color.FromArgb(235, 246, 255)
        receiptFooter.Dock = DockStyle.Bottom
        receiptFooter.Height = 54
        receiptFooter.BackColor = Color.FromArgb(235, 246, 255)
        receiptTitle.Text = "Download Receipts"
        receiptTitle.Font = New Font("Segoe UI", 14, FontStyle.Bold)
        receiptTitle.ForeColor = Color.FromArgb(20, 58, 90)
        receiptTitle.AutoSize = True
        receiptTitle.Location = New Point(16, 12)
        receiptDownloadButton.Text = "Download Receipt"
        receiptDownloadButton.Size = New Size(170, 34)
        receiptDownloadButton.Location = New Point(240, 8)
        receiptDownloadButton.BackColor = Color.FromArgb(0, 108, 190)
        receiptDownloadButton.ForeColor = Color.White
        receiptDownloadButton.FlatStyle = FlatStyle.Flat
        receiptDownloadButton.FlatAppearance.BorderSize = 0
        receiptDownloadButton.Font = New Font("Segoe UI", 9, FontStyle.Bold)
        receiptSeriesLabel.Text = "Load Series:"
        receiptSeriesLabel.AutoSize = True
        receiptSeriesLabel.Location = New Point(16, 58)
        receiptSeriesText.Location = New Point(96, 54)
        receiptSeriesText.Size = New Size(100, 23)
        receiptLoadLabel.Text = "Load No:"
        receiptLoadLabel.AutoSize = True
        receiptLoadLabel.Location = New Point(216, 58)
        receiptLoadText.Location = New Point(275, 54)
        receiptLoadText.Size = New Size(100, 23)
        receiptLoadText.ShortcutsEnabled = True
        receiptInvoiceLabel.Text = "Search invoice:"
        receiptInvoiceLabel.AutoSize = True
        receiptInvoiceLabel.Location = New Point(398, 58)
        receiptInvoiceSearch.Location = New Point(498, 54)
        receiptInvoiceSearch.Size = New Size(220, 23)
        receiptCloseButton.Text = "Close"
        receiptCloseButton.Size = New Size(90, 32)
        receiptCloseButton.Anchor = AnchorStyles.Top Or AnchorStyles.Right
        receiptCloseButton.Location = New Point(Math.Max(0, ClientSize.Width - 106), 9)
        receiptCloseButton.BackColor = Color.White
        receiptCloseButton.ForeColor = Color.FromArgb(20, 58, 90)
        receiptSelectAll.Text = "Select All"
        receiptSelectAll.AutoSize = True
        receiptSelectAll.Location = New Point(16, 90)
        receiptSelectAll.ForeColor = Color.FromArgb(20, 58, 90)
        LblRecordCount.AutoSize = True
        LblRecordCount.Location = New Point(145, 90)
        LblRecordCount.ForeColor = Color.FromArgb(20, 58, 90)
        receiptToolbar.Controls.AddRange(New Control() {receiptTitle, receiptDownloadButton, receiptSeriesLabel, receiptSeriesText, receiptLoadLabel, receiptLoadText, receiptInvoiceLabel, receiptInvoiceSearch, receiptCloseButton, receiptSelectAll, LblRecordCount})
        receiptFooter.Controls.Add(BtnConvertReceipt)
        BtnConvertReceipt.Location = New Point(16, 8)
        receiptPanel.Controls.Add(DataGridView1)
        receiptPanel.Controls.Add(receiptToolbar)
        receiptPanel.Controls.Add(receiptFooter)
        DataGridView1.Dock = DockStyle.Fill
        DataGridView1.SendToBack()
        receiptToolbar.BringToFront()
        receiptFooter.BringToFront()
        Controls.Add(receiptPanel)
        AddHandler receiptSeriesText.TextChanged, AddressOf ReceiptLoadTextChanged
        AddHandler receiptLoadText.TextChanged, AddressOf ReceiptLoadTextChanged
        AddHandler receiptInvoiceSearch.TextChanged, AddressOf ReceiptInvoiceSearchChanged
        AddHandler receiptDownloadButton.Click, Sub() Button5.PerformClick()
        AddHandler receiptCloseButton.Click, AddressOf ReceiptCloseButtonClick
        AddHandler receiptSelectAll.CheckedChanged, AddressOf ReceiptSelectAllChanged
        AddHandler DataGridView1.CurrentCellDirtyStateChanged, AddressOf ReceiptGridCurrentCellDirtyStateChanged
        AddHandler DataGridView1.CellValueChanged, AddressOf ReceiptGridCellValueChanged
        SetReceiptFiltersVisible(False)
    End Sub

    Private Sub SetReceiptFiltersVisible(visible As Boolean)
        receiptPanel.Visible = visible
        receiptSeriesLabel.Visible = visible
        receiptSeriesText.Visible = visible
        receiptLoadLabel.Visible = visible
        receiptLoadText.Visible = visible
        receiptInvoiceLabel.Visible = visible
        receiptInvoiceSearch.Visible = visible
        receiptCloseButton.Visible = visible
        receiptSelectAll.Visible = visible
        If visible Then
            receiptPanel.BringToFront()
        End If
    End Sub

    Private Sub ReceiptSelectAllChanged(sender As Object, e As EventArgs)
        If updatingReceiptSelection Then Return
        updatingReceiptSelection = True
        Try
            DataGridView1.EndEdit()
            For Each row As DataGridViewRow In DataGridView1.Rows
                row.Cells("Select").Value = receiptSelectAll.Checked
            Next
        Finally
            updatingReceiptSelection = False
        End Try
    End Sub

    Private Sub ReceiptGridCurrentCellDirtyStateChanged(sender As Object, e As EventArgs)
        If DataGridView1.IsCurrentCellDirty AndAlso DataGridView1.CurrentCell IsNot Nothing AndAlso
            DataGridView1.CurrentCell.ColumnIndex = DataGridView1.Columns("Select").Index Then
            DataGridView1.CommitEdit(DataGridViewDataErrorContexts.Commit)
        End If
    End Sub

    Private Sub ReceiptGridCellValueChanged(sender As Object, e As DataGridViewCellEventArgs)
        If updatingReceiptSelection OrElse e.RowIndex < 0 OrElse
            e.ColumnIndex <> DataGridView1.Columns("Select").Index Then Return
        UpdateReceiptSelectAll()
    End Sub

    Private Sub UpdateReceiptSelectAll()
        updatingReceiptSelection = True
        Try
            receiptSelectAll.Checked = DataGridView1.Rows.Count > 0 AndAlso
                DataGridView1.Rows.Cast(Of DataGridViewRow)().All(Function(row)
                    Return row.Cells("Select").Value IsNot Nothing AndAlso
                        Convert.ToBoolean(row.Cells("Select").Value)
                End Function)
        Finally
            updatingReceiptSelection = False
        End Try
    End Sub

    Private Sub ReceiptCloseButtonClick(sender As Object, e As EventArgs)
        HideGrid()
    End Sub

    Private Sub ReceiptInvoiceSearchChanged(sender As Object, e As EventArgs)
        RefreshReceiptGrid()
    End Sub

    Private Sub ReceiptLoadTextChanged(sender As Object, e As EventArgs)
        receiptLoadSearchVersion += 1
        Dim version As Integer = receiptLoadSearchVersion
        Dim loadNumber As Integer
        Dim input As String = receiptLoadText.Text.Trim()
        Dim loadSeries As String = receiptSeriesText.Text.Trim()
        receiptLoadInvoices = Nothing
        If input.Length = 0 AndAlso loadSeries.Length = 0 Then
            RefreshReceiptGrid()
            Return
        End If
        If input.Length > 0 AndAlso (Not Integer.TryParse(input, loadNumber) OrElse loadNumber <= 0) Then
            receiptLoadInvoices = New HashSet(Of String)(StringComparer.OrdinalIgnoreCase)
            RefreshReceiptGrid()
            Return
        End If
        Try
            Dim invoices As New HashSet(Of String)(StringComparer.OrdinalIgnoreCase)
            Using connection As SqlConnection = Ultimate.Mod_Connection.OpenYearConn()
                Dim sql As String = "SELECT TrnSeries, TrnNo FROM T_Sal_Header WHERE 1 = 1"
                If input.Length > 0 Then sql &= " AND LoadNo = @LoadNo"
                If loadSeries.Length > 0 Then sql &= " AND LoadSeries = @LoadSeries"
                Using command As New SqlCommand(sql, connection)
                    If input.Length > 0 Then command.Parameters.Add("@LoadNo", SqlDbType.Int).Value = loadNumber
                    If loadSeries.Length > 0 Then command.Parameters.Add("@LoadSeries", SqlDbType.VarChar).Value = loadSeries
                    Using reader As SqlDataReader = command.ExecuteReader()
                        While reader.Read()
                            invoices.Add(InvoiceKey(Convert.ToString(reader("TrnSeries")), Convert.ToInt32(reader("TrnNo"))))
                        End While
                    End Using
                End Using
            End Using
            If version = receiptLoadSearchVersion Then receiptLoadInvoices = invoices
            RefreshReceiptGrid()
        Catch ex As Exception
            receiptLoadInvoices = New HashSet(Of String)(StringComparer.OrdinalIgnoreCase)
            RefreshReceiptGrid()
            TxtMsg.Text = "Could not find invoices for the selected load: " & ex.Message
        End Try
    End Sub

    Private Sub RefreshReceiptGrid()
        If downloadedPayments Is Nothing OrElse Not receiptControlsReady Then Return
        Dim invoiceText As String = receiptInvoiceSearch.Text.Trim()
        Dim selectedLoadNo As Integer = 0
        Dim hasLoadSeries As Boolean = receiptSeriesText.Text.Trim().Length > 0
        Integer.TryParse(receiptLoadText.Text.Trim(), selectedLoadNo)
        Dim visiblePayments As List(Of Payment) = downloadedPayments.Where(Function(p)
            If receiptLoadInvoices IsNot Nothing Then
                If (hasLoadSeries OrElse p.load_no.GetValueOrDefault() <> selectedLoadNo) AndAlso
                    (p.bill_details Is Nothing OrElse Not receiptLoadInvoices.Contains(InvoiceKey(p.bill_details.bill_series, p.bill_details.bill_no))) Then Return False
            End If
            If invoiceText.Length = 0 Then Return True
            Dim bill As String = If(p.bill_details Is Nothing, "", If(p.bill_details.bill_series, "") & p.bill_details.bill_no.ToString())
            Return bill.IndexOf(invoiceText, StringComparison.OrdinalIgnoreCase) >= 0 OrElse
                If(p.customer_name, "").IndexOf(invoiceText, StringComparison.OrdinalIgnoreCase) >= 0 OrElse
                If(p.customer_id, "").IndexOf(invoiceText, StringComparison.OrdinalIgnoreCase) >= 0 OrElse
                CollectionKey(p).IndexOf(invoiceText, StringComparison.OrdinalIgnoreCase) >= 0
        End Function).ToList()
        LoadPaymentsToGrid(visiblePayments)
    End Sub

    Private Function GetIniValue(key As String) As String
        Dim s1 As String = System.Windows.Forms.Application.StartupPath
        s1 = s1 + "\Upload.ini"
        If Not File.Exists(s1) Then
            Return ""
        End If
        Dim a() As String = IO.File.ReadAllLines(s1)
        Dim output As String = ""
        Dim i As Integer

        For i = 0 To UBound(a)
            If a(i).Contains(key) Then
                output = a(i).Replace(key + "=", "")
                Exit For
            End If
        Next
        Return output.Trim()
    End Function

    Public Sub New()
        InitializeComponent()
    End Sub

    ' --- Load Distributor Info from Mas_Firm ---
    Private Function LoadDistributorInfo() As Boolean
        Try
            Dim sql12 As String =
            "SELECT TOP 1 DistributorID, xapikey FROM Mas_Firm WHERE code=" &
            Ultimate.Mod_GlobFunction.UseFirmCode

            Dim ds12 As New System.Data.DataSet
            Ultimate.Mod_DataBase.CmdStr = sql12
            ds12 = Ultimate.Mod_Connection.Returnglobaldata(Ultimate.Mod_DataBase.CmdStr)

            If ds12 IsNot Nothing AndAlso
           ds12.Tables.Count > 0 AndAlso
           ds12.Tables(0).Rows.Count > 0 Then

                DistributorId = ds12.Tables(0).Rows(0)("DistributorID").ToString().Trim()
                XApiKey = ds12.Tables(0).Rows(0)("xapikey").ToString().Trim()
                CreatedBy = "system_upload"

                If String.IsNullOrEmpty(XApiKey) Then
                    MsgBox("XApiKey not found in Mas_Firm.")
                    Return False
                End If

                Return True
            Else
                DistributorId = ""
                XApiKey = ""
                Return False
            End If

        Catch ex As Exception
            MsgBox("Error loading distributor info: " & ex.Message)
            Return False
        End Try
    End Function

    ' --- Helper function to get actual SSMCode from Mas_salesman table ---
    Private Function GetActualSSMCodeFromDesktop(mobileSSMCode As String, salesmanName As String, refBy As String) As String
        Try
            If Not String.IsNullOrEmpty(refBy) AndAlso salesmanCodeCache.ContainsKey(refBy) Then
                Return salesmanCodeCache(refBy)
            End If

            Dim sqlQuery As String = ""
            Dim actualCode As String = mobileSSMCode

            If Not String.IsNullOrEmpty(refBy) Then
                sqlQuery = "SELECT TOP 1 SSMCode FROM Mas_salesman WHERE RefBy = '" & refBy.Replace("'", "''") & "'"
                Dim dsSalesman As DataSet = Ultimate.Mod_Connection.ReturnYeardata(sqlQuery)

                If dsSalesman IsNot Nothing AndAlso dsSalesman.Tables.Count > 0 AndAlso dsSalesman.Tables(0).Rows.Count > 0 Then
                    actualCode = dsSalesman.Tables(0).Rows(0)("SSMCode").ToString()
                    TxtMsg.Text = "Mapped RefBy '" & refBy & "' to desktop SSMCode '" & actualCode & "'"
                    Application.DoEvents()

                    If Not String.IsNullOrEmpty(refBy) AndAlso Not salesmanCodeCache.ContainsKey(refBy) Then
                        salesmanCodeCache.Add(refBy, actualCode)
                    End If
                    Return actualCode
                End If
            End If

            If Not String.IsNullOrEmpty(salesmanName) Then
                sqlQuery = "SELECT TOP 1 SSMCode FROM Mas_salesman WHERE SalesmanName = '" & salesmanName.Replace("'", "''") & "'"
                Dim dsSalesman As DataSet = Ultimate.Mod_Connection.ReturnYeardata(sqlQuery)

                If dsSalesman IsNot Nothing AndAlso dsSalesman.Tables.Count > 0 AndAlso dsSalesman.Tables(0).Rows.Count > 0 Then
                    actualCode = dsSalesman.Tables(0).Rows(0)("SSMCode").ToString()
                    TxtMsg.Text = "Mapped salesman '" & salesmanName & "' from mobile code '" & mobileSSMCode & "' to desktop code '" & actualCode & "'"
                    Application.DoEvents()

                    If Not String.IsNullOrEmpty(salesmanName) AndAlso Not salesmanCodeCache.ContainsKey(salesmanName) Then
                        salesmanCodeCache.Add(salesmanName, actualCode)
                    End If
                    Return actualCode
                End If
            End If

            If Not String.IsNullOrEmpty(mobileSSMCode) Then
                sqlQuery = "SELECT TOP 1 SSMCode FROM Mas_salesman WHERE SSMCode = '" & mobileSSMCode.Replace("'", "''") & "'"
                Dim dsSalesman As DataSet = Ultimate.Mod_Connection.ReturnYeardata(sqlQuery)

                If dsSalesman IsNot Nothing AndAlso dsSalesman.Tables.Count > 0 AndAlso dsSalesman.Tables(0).Rows.Count > 0 Then
                    actualCode = dsSalesman.Tables(0).Rows(0)("SSMCode").ToString()
                    TxtMsg.Text = "Found salesman by mobile code: " & mobileSSMCode & " mapped to desktop code: " & actualCode
                    Application.DoEvents()
                Else
                    TxtMsg.Text = "Warning: Salesman with RefBy '" & refBy & "' or Name '" & salesmanName & "' (Code: " & mobileSSMCode & ") not found in Mas_salesman table. Using mobile code."
                    Application.DoEvents()
                End If
            End If

            Return actualCode

        Catch ex As Exception
            TxtMsg.Text = "Error mapping salesman code: " & ex.Message
            Application.DoEvents()
            Return mobileSSMCode
        End Try
    End Function

    ' --- Upload Customers to MongoDB ---
    ' MODIFIED:
    ' 1) Keeps the existing customer upload flow/batching/API unchanged.
    ' 2) Adds Company mapping from Mas_Party -> Mas_Company.
    ' 3) Uses Mas_AreaMapping to validate Company + Area mapping.
    ' 4) Sends Area as Route also, so the current Route selector can show company-wise areas.
    ' 5) Sends Address, Town, GST Type (R/U), GST No and mapping codes.
    Private Async Function UploadCustomersToMongoDB() As Task(Of Boolean)
        Try
            TxtMsg.Text = "Starting Customer Master Upload to MongoDB..."
            Application.DoEvents()

            Dim dsinv_acmst As New System.Data.DataSet

            ' DistributorId is already loaded from the currently selected firm by LoadDistributorInfo().
            ' Use that same value in the upload data instead of taking TOP 1 distributor from Global.dbo.Mas_Firm.
            Dim safeDistributorId As String = If(DistributorId, "").Replace("'", "''")

            Dim SqlStr As String = "
WITH ValidAreaMapping AS
(
    SELECT DISTINCT
        SysCompCode,
        AreaCode
    FROM Mas_AreaMapping
),
CustomerData AS
(
    SELECT
        acc.SysAcCode,
        acc.AcCode AS [Customer Code],
        acc.AcName AS [Customer Name],

        LTRIM(RTRIM(
            ISNULL(acc.Add1, '') +
            CASE
                WHEN ISNULL(acc.Add2, '') = '' THEN ''
                ELSE ' ' + acc.Add2
            END
        )) AS Address,

        acc.MobileNo AS Phone,
        acc.GeoLatitude,
        acc.GeoLongitude,

        p.SysCompCode,
        ISNULL(c.CompCode, '') AS [Company Code],
        ISNULL(c.CompName, '') AS [Company Name],

        CASE
            WHEN am.AreaCode IS NULL THEN 'COUNTER'
            ELSE ISNULL(CAST(p.AreaCode AS VARCHAR(50)), 'COUNTER')
        END AS [Area Code],
        CASE
            WHEN am.AreaCode IS NULL THEN 'Counter'
            ELSE ISNULL(
                NULLIF(LTRIM(RTRIM(a.AreaName)), ''),
                ISNULL(NULLIF(LTRIM(RTRIM(acc.Town)), ''), 'Counter')
            )
        END AS Area,

        -- Your mobile screen currently uses Route.
        -- As requested, the company-mapped Area is also sent as Route.
        CASE
            WHEN am.AreaCode IS NULL THEN 'Counter'
            ELSE ISNULL(
                NULLIF(LTRIM(RTRIM(a.AreaName)), ''),
                ISNULL(NULLIF(LTRIM(RTRIM(acc.Town)), ''), 'Counter')
            )
        END AS Route,

        ISNULL(p.RouteCode, '') AS [ERP Route Code],
        ISNULL(acc.Town, '') AS Town,

        CASE
            WHEN UPPER(LTRIM(RTRIM(ISNULL(acc.GSTType, ''))))
                 IN ('U', 'UR', 'UNREGISTERED', 'UN-REGISTERED') THEN 'U'

            WHEN UPPER(LTRIM(RTRIM(ISNULL(acc.GSTType, ''))))
                 IN ('R', 'REG', 'REGISTERED') THEN 'R'

            WHEN LTRIM(RTRIM(ISNULL(acc.GSTNo, ''))) <> '' THEN 'R'
            ELSE 'U'
        END AS [GST Type],

        ISNULL(acc.GSTNo, '') AS [GST No],

        CAST(acc.SysAcCode AS VARCHAR(50)) + '_' +
        CAST(p.SysCompCode AS VARCHAR(50)) + '_' +
        CASE
            WHEN am.AreaCode IS NULL THEN 'COUNTER'
            ELSE ISNULL(CAST(p.AreaCode AS VARCHAR(50)), 'COUNTER')
        END AS [Customer Company Key],

        '" & safeDistributorId & "' AS [Distributor id],

        ROW_NUMBER() OVER
        (
            PARTITION BY
                acc.SysAcCode,
                p.SysCompCode,
                p.AreaCode,
                ISNULL(p.RouteCode, '')
            ORDER BY
                acc.SysAcCode
        ) AS rn

    FROM Mas_Account acc

    INNER JOIN Mas_Party p
        ON p.SysAcCode = acc.SysAcCode

    INNER JOIN Mas_Company c
        ON c.SysCompCode = p.SysCompCode

    LEFT JOIN ValidAreaMapping am
        ON am.SysCompCode = p.SysCompCode
       AND am.AreaCode = p.AreaCode

    LEFT JOIN Mas_Area a
        ON a.AreaCode = p.AreaCode

    WHERE acc.ACGCode LIKE 'A1A3A3%'
)
SELECT
    SysAcCode,
    [Customer Code],
    [Customer Name],
    Address,
    Phone,
    GeoLatitude,
    GeoLongitude,
    Area,
    Route,
    [Distributor id],

    SysCompCode,
    [Company Code],
    [Company Name],
    [Area Code],
    [ERP Route Code],
    Town,
    [GST Type],
    [GST No],
    [Customer Company Key]

FROM CustomerData
WHERE rn = 1
ORDER BY
    [Company Name],
    Area,
    [Customer Name]"

            dsinv_acmst = Ultimate.Mod_Connection.ReturnYeardata(SqlStr)

            If dsinv_acmst.Tables.Count = 0 OrElse dsinv_acmst.Tables(0).Rows.Count = 0 Then
                MsgBox("No customers found to upload.")
                Return False
            End If

            ' One customer can belong to several companies.  Keep one upload row per
            ' SysAcCode and carry every company/area relationship in a JSON array.
            Dim sourceCustomers As DataTable = dsinv_acmst.Tables(0)
            Dim groupedCustomers As DataTable = sourceCustomers.Clone()
            groupedCustomers.Columns.Add("Companies", GetType(String))

            Dim customerGroups As IEnumerable(Of IGrouping(Of String, DataRow)) =
                sourceCustomers.AsEnumerable().GroupBy(
                    Function(r As DataRow) r("SysAcCode").ToString().Trim()
                )

            For Each customerGroup As IGrouping(Of String, DataRow) In customerGroups
                Dim firstRow As DataRow = customerGroup.First()
                Dim outputRow As DataRow = groupedCustomers.NewRow()
                outputRow.ItemArray = CType(firstRow.ItemArray.Clone(), Object())

                Dim companies As New JArray()
                Dim uniqueCompanyRows As IEnumerable(Of DataRow) =
                    customerGroup.GroupBy(
                        Function(r As DataRow) r("SysCompCode").ToString().Trim() & "|" &
                                               r("Area Code").ToString().Trim() & "|" &
                                               r("ERP Route Code").ToString().Trim()
                    ).Select(Function(g As IGrouping(Of String, DataRow)) g.First())

                For Each companyRow As DataRow In uniqueCompanyRows
                    companies.Add(New JObject(
                        New JProperty("sysCompCode", companyRow("SysCompCode").ToString().Trim()),
                        New JProperty("companyCode", companyRow("Company Code").ToString().Trim()),
                        New JProperty("companyName", companyRow("Company Name").ToString().Trim()),
                        New JProperty("areaCode", companyRow("Area Code").ToString().Trim()),
                        New JProperty("area", companyRow("Area").ToString().Trim()),
                        New JProperty("route", companyRow("Route").ToString().Trim()),
                        New JProperty("erpRouteCode", companyRow("ERP Route Code").ToString().Trim())
                    ))
                Next

                outputRow("Companies") = companies.ToString(Formatting.None)
                groupedCustomers.Rows.Add(outputRow)
            Next

            Dim totalRecords As Integer = groupedCustomers.Rows.Count
            TxtMsg.Text = $"Total customers to upload: {totalRecords}"
            Application.DoEvents()

            Dim batchSize As Integer = 500
            Dim totalBatches As Integer = Math.Ceiling(totalRecords / batchSize)
            Dim successCount As Integer = 0
            Dim failedBatches As Integer = 0

            For batchIndex As Integer = 0 To totalBatches - 1
                Dim startIndex As Integer = batchIndex * batchSize
                Dim endIndex As Integer = Math.Min(startIndex + batchSize - 1, totalRecords - 1)
                Dim batchRecordCount As Integer = endIndex - startIndex + 1

                TxtMsg.Text = $"Processing Batch {batchIndex + 1} of {totalBatches} (Records {startIndex + 1} to {endIndex + 1})"
                Application.DoEvents()

                Dim dt As New DataTable()
                dt.TableName = "Customers"

                ' ============================================================
                ' KEEP ALL OLD COLUMNS FIRST IN THEIR ORIGINAL ORDER
                ' ============================================================
                dt.Columns.Add("Customer Code", GetType(String))
                dt.Columns.Add("Customer Name", GetType(String))
                dt.Columns.Add("Area", GetType(String))
                dt.Columns.Add("Route", GetType(String))
                dt.Columns.Add("Address", GetType(String))
                dt.Columns.Add("Distributor id", GetType(String))
                dt.Columns.Add("Phone", GetType(String))
                dt.Columns.Add("SysAcCode", GetType(String))
                dt.Columns.Add("GeoLatitude", GetType(String))
                dt.Columns.Add("GeoLongitude", GetType(String))

                ' ============================================================
                ' NEW COLUMNS - APPENDED ONLY, SO OLD LOGIC IS NOT DISTURBED
                ' ============================================================
                dt.Columns.Add("SysCompCode", GetType(String))
                dt.Columns.Add("Company Code", GetType(String))
                dt.Columns.Add("Company Name", GetType(String))
                dt.Columns.Add("Area Code", GetType(String))
                dt.Columns.Add("ERP Route Code", GetType(String))
                dt.Columns.Add("Town", GetType(String))
                dt.Columns.Add("GST Type", GetType(String))
                dt.Columns.Add("GST No", GetType(String))
                dt.Columns.Add("Customer Company Key", GetType(String))
                dt.Columns.Add("Companies", GetType(String))

                For i As Integer = startIndex To endIndex
                    Dim row = groupedCustomers.Rows(i)

                    Dim originalCode As String = row("Customer Code").ToString()

                    ' IMPORTANT:
                    ' Keep the existing customer code format unchanged so existing
                    ' orders/outstanding/customer references are not affected.
                    Dim customerCode As String = XApiKey & "_" & originalCode

                    dt.Rows.Add(
                        customerCode,
                        row("Customer Name").ToString(),
                        If(IsDBNull(row("Area")), "", row("Area").ToString()),
                        If(IsDBNull(row("Route")), "", row("Route").ToString()),
                        If(IsDBNull(row("Address")), "", row("Address").ToString()),
                        DistributorId,
                        If(IsDBNull(row("Phone")), "", row("Phone").ToString()),
                        row("SysAcCode").ToString(),
                        If(IsDBNull(row("GeoLatitude")), "", row("GeoLatitude").ToString()),
                        If(IsDBNull(row("GeoLongitude")), "", row("GeoLongitude").ToString()),
                        If(IsDBNull(row("SysCompCode")), "", row("SysCompCode").ToString()),
                        If(IsDBNull(row("Company Code")), "", row("Company Code").ToString()),
                        If(IsDBNull(row("Company Name")), "", row("Company Name").ToString()),
                        If(IsDBNull(row("Area Code")), "", row("Area Code").ToString()),
                        If(IsDBNull(row("ERP Route Code")), "", row("ERP Route Code").ToString()),
                        If(IsDBNull(row("Town")), "", row("Town").ToString()),
                        If(IsDBNull(row("GST Type")), "U", row("GST Type").ToString()),
                        If(IsDBNull(row("GST No")), "", row("GST No").ToString()),
                        If(IsDBNull(row("Customer Company Key")), "", row("Customer Company Key").ToString()),
                        If(IsDBNull(row("Companies")), "[]", row("Companies").ToString())
                                                                            )
                Next

                Dim csvFile As String = Path.Combine(Path.GetTempPath(), $"customers_batch_{batchIndex + 1}.csv")

                Using writer As New StreamWriter(csvFile, False, Encoding.UTF8)

                    ' Keep old headers first and append only the new fields.
                    writer.WriteLine(
                        "Customer Code,Customer Name,Area,Route,Address,Distributor id,Phone,SysAcCode,GeoLatitude,GeoLongitude," &
                        "SysCompCode,Company Code,Company Name,Area Code,ERP Route Code,Town,GST Type,GST No,Customer Company Key,Companies"
                    )

                    For Each row As DataRow In dt.Rows
                        writer.WriteLine(
                            $"{EscapeCsv(row(0).ToString())}," &
                            $"{EscapeCsv(row(1).ToString())}," &
                            $"{EscapeCsv(row(2).ToString())}," &
                            $"{EscapeCsv(row(3).ToString())}," &
                            $"{EscapeCsv(row(4).ToString())}," &
                            $"{EscapeCsv(row(5).ToString())}," &
                            $"{EscapeCsv(row(6).ToString())}," &
                            $"{EscapeCsv(row(7).ToString())}," &
                            $"{EscapeCsv(row(8).ToString())}," &
                            $"{EscapeCsv(row(9).ToString())}," &
                            $"{EscapeCsv(row(10).ToString())}," &
                            $"{EscapeCsv(row(11).ToString())}," &
                            $"{EscapeCsv(row(12).ToString())}," &
                            $"{EscapeCsv(row(13).ToString())}," &
                            $"{EscapeCsv(row(14).ToString())}," &
                            $"{EscapeCsv(row(15).ToString())}," &
                            $"{EscapeCsv(row(16).ToString())}," &
                            $"{EscapeCsv(row(17).ToString())}," &
                            $"{EscapeCsv(row(18).ToString())}," &
                            $"{EscapeCsv(row(19).ToString())}"
                        )
                    Next
                End Using

                Dim batchSuccess As Boolean = False
                Dim retryCount As Integer = 0
                Dim maxRetries As Integer = 3

                While Not batchSuccess AndAlso retryCount < maxRetries
                    Try
                        Using client As New HttpClient()
                            client.Timeout = TimeSpan.FromMinutes(10)

                            Using formData As New MultipartFormDataContent()
                                Dim fileContent As Byte() = File.ReadAllBytes(csvFile)
                                Dim fileContentBytes As New ByteArrayContent(fileContent)

                                fileContentBytes.Headers.ContentType = New MediaTypeHeaderValue("text/csv")

                                formData.Add(fileContentBytes, "file", $"customers_batch_{batchIndex + 1}.csv")
                                formData.Add(New StringContent(DistributorId), "distributorId")
                                formData.Add(New StringContent(CreatedBy), "createdBy")
                                formData.Add(New StringContent(UpdateExisting.ToString().ToLowerInvariant()), "updateExisting")

                                TxtMsg.Text = $"Uploading Batch {batchIndex + 1} (Attempt {retryCount + 1})..."
                                Application.DoEvents()

                                Dim response As HttpResponseMessage =
                                    Await client.PostAsync(PartyMasterApiUrl, formData)

                                If response.IsSuccessStatusCode Then
                                    Dim result As String = Await response.Content.ReadAsStringAsync()

                                    successCount += batchRecordCount
                                    batchSuccess = True

                                    TxtMsg.Text =
                                        $"✓ Batch {batchIndex + 1} uploaded successfully ({batchRecordCount} records)"

                                    Application.DoEvents()
                                Else
                                    Dim errorContent As String =
                                        Await response.Content.ReadAsStringAsync()

                                    TxtMsg.Text =
                                        $"✗ Batch {batchIndex + 1} failed: {response.StatusCode} - {errorContent}"

                                    Application.DoEvents()
                                    retryCount += 1
                                End If
                            End Using
                        End Using

                    Catch ex As Exception
                        TxtMsg.Text =
                            $"✗ Batch {batchIndex + 1} error: {ex.Message}"

                        Application.DoEvents()
                        retryCount += 1
                    End Try
                End While

                If Not batchSuccess Then
                    failedBatches += 1
                    TxtMsg.Text =
                        $"✗ Batch {batchIndex + 1} failed after {maxRetries} attempts"
                    Application.DoEvents()
                End If

                Try
                    If File.Exists(csvFile) Then File.Delete(csvFile)
                Catch
                End Try

                If batchIndex < totalBatches - 1 Then
                    Await Task.Delay(1000)
                End If
            Next

            TxtMsg.Text =
                $"Customer Upload Completed! Total: {totalRecords}, Success: {successCount}, Failed: {failedBatches} batches"

            Application.DoEvents()

            If failedBatches > 0 Then
                MsgBox(
                    $"Customer Master Upload completed with issues.{vbCrLf}" &
                    $"Total Records: {totalRecords}{vbCrLf}" &
                    $"Successfully Uploaded: {successCount}{vbCrLf}" &
                    $"Failed Batches: {failedBatches}{vbCrLf}" &
                    "Check messages for details.",
                    MsgBoxStyle.Exclamation,
                    "Partial Success"
                )
            Else
                MsgBox(
                    $"Customer Master Upload Completed Successfully!{vbCrLf}Total Records: {totalRecords}",
                    MsgBoxStyle.Information,
                    "Success"
                )
            End If

            Return successCount > 0

        Catch ex As Exception
            MsgBox("Error in Customer Upload: " & ex.Message)
            Return False
        End Try
    End Function

    ' --- Upload Products to MongoDB ---
    ' MODIFIED:
    ' Product upload flow is unchanged; Company mapping fields are appended.
    ' The mobile/backend can now filter products using SysCompCode / Company Code.
    Private Async Function UploadProductsToMongoDB() As Task(Of Boolean)
        Try
            TxtMsg.Text = "Starting Products Master Upload to MongoDB..."

            Dim ds_prod As New System.Data.DataSet

            Dim safeDistributorId As String = If(DistributorId, "").Replace("'", "''")

            Dim SqlStr As String = "
SELECT
    CAST(mp.SysProdCode AS VARCHAR(50)) + '_' +
    CAST(CAST(ISNULL(ms.MRP, 0) AS INT) AS VARCHAR(50)) AS [Product code],

    CAST(mp.ProdCode AS VARCHAR(50)) + ' - ' +
    mp.ProdName +
    ' (MRP:' + CAST(CAST(ISNULL(ms.MRP, 0) AS INT) AS VARCHAR(50)) + ')'
    AS [product name],

    ms.MRP,
    CAST(ISNULL(ms.SRate, 0) AS DECIMAL(18,2)) AS Price,
    mp.GrpCode AS Category,
    ISNULL(ms.Qty, 0) AS [Stock Quantity],
    mp.LocalProdName AS Description,

    '" & safeDistributorId & "' AS [Distirbutor Id],

    mp.SysCompCode AS SysCompCode,
    ISNULL(mc.CompCode, '') AS [Company Code],
    ISNULL(mc.CompName, '') AS [Company Name]

FROM Mas_Product mp

LEFT JOIN Mas_Stock ms
    ON mp.SysProdCode = ms.SysProdCode

INNER JOIN Mas_Company mc
    ON mc.SysCompCode = mp.SysCompCode

WHERE ms.IsLocked = 'N'

ORDER BY
    mc.CompName,
    mp.ProdName"

            ds_prod = Ultimate.Mod_Connection.ReturnYeardata(SqlStr)

            If ds_prod Is Nothing OrElse ds_prod.Tables.Count = 0 Then
                MsgBox("No products found to upload. Dataset returned no tables.")
                TxtMsg.Text = "Error: No product data available"
                Return False
            End If

            If ds_prod.Tables(0).Rows.Count = 0 Then
                MsgBox("No products found to upload. Please check if there are products with stock quantity > 0 in the database.")
                TxtMsg.Text = "Error: No products found with stock quantity > 0"
                Return False
            End If

            Dim dt As New DataTable()
            dt.TableName = "Products"

            ' ============================================================
            ' KEEP ALL OLD COLUMNS FIRST IN THEIR ORIGINAL ORDER
            ' ============================================================
            dt.Columns.Add("product name", GetType(String))
            dt.Columns.Add("Product code", GetType(String))
            dt.Columns.Add("MRP", GetType(Decimal))
            dt.Columns.Add("Price", GetType(Decimal))
            dt.Columns.Add("Category", GetType(String))
            dt.Columns.Add("Stock Quantity", GetType(Integer))
            dt.Columns.Add("Description", GetType(String))
            dt.Columns.Add("Distirbutor Id", GetType(String))

            ' ============================================================
            ' NEW COMPANY FIELDS - APPENDED ONLY
            ' ============================================================
            dt.Columns.Add("SysCompCode", GetType(String))
            dt.Columns.Add("Company Code", GetType(String))
            dt.Columns.Add("Company Name", GetType(String))

            For i As Integer = 0 To ds_prod.Tables(0).Rows.Count - 1
                Dim row = ds_prod.Tables(0).Rows(i)

                Dim mrpVal As Decimal = 0
                Dim priceVal As Decimal = 0
                Dim stockVal As Integer = 0

                Try
                    mrpVal =
                        If(
                            IsDBNull(row("MRP")),
                            0D,
                            Convert.ToDecimal(row("MRP"))
                        )
                Catch ex As Exception
                    mrpVal = 0
                End Try

                Try
                    priceVal =
                        If(
                            IsDBNull(row("Price")),
                            0D,
                            Convert.ToDecimal(row("Price"))
                        )
                Catch ex As Exception
                    priceVal = 0
                End Try

                Try
                    stockVal =
                        If(
                            IsDBNull(row("Stock Quantity")),
                            0,
                            Convert.ToInt32(row("Stock Quantity"))
                        )
                Catch ex As Exception
                    stockVal = 0
                End Try

                dt.Rows.Add(
                    row("product name").ToString(),
                    row("Product code").ToString(),
                    mrpVal,
                    priceVal,
                    If(IsDBNull(row("Category")), "General", row("Category").ToString()),
                    stockVal,
                    If(IsDBNull(row("Description")), "", row("Description").ToString()),
                    DistributorId,
                    If(IsDBNull(row("SysCompCode")), "", row("SysCompCode").ToString()),
                    If(IsDBNull(row("Company Code")), "", row("Company Code").ToString()),
                    If(IsDBNull(row("Company Name")), "", row("Company Name").ToString())
                                            )

                TxtMsg.Text =
                    "Processing Product: " &
                    (i + 1) &
                    " of " &
                    ds_prod.Tables(0).Rows.Count &
                    " - " &
                    row("product name").ToString()

                Application.DoEvents()
            Next

            Dim csvFile As String = Path.GetTempFileName() & ".csv"

            Using writer As New StreamWriter(csvFile, False, Encoding.UTF8)

                ' Keep the old product headers first and append company fields.
                writer.WriteLine(
                    "product name,Product code,MRP,Price,Category,Stock Quantity,Description,Distirbutor Id," &
                    "SysCompCode,Company Code,Company Name"
                )

                For Each row As DataRow In dt.Rows
                    writer.WriteLine(
                        $"{EscapeCsv(row(0).ToString())}," &
                        $"{EscapeCsv(row(1).ToString())}," &
                        $"{row(2)}," &
                        $"{row(3)}," &
                        $"{EscapeCsv(row(4).ToString())}," &
                        $"{row(5)}," &
                        $"{EscapeCsv(row(6).ToString())}," &
                        $"{EscapeCsv(row(7).ToString())}," &
                        $"{EscapeCsv(row(8).ToString())}," &
                        $"{EscapeCsv(row(9).ToString())}," &
                        $"{EscapeCsv(row(10).ToString())}"
                    )
                Next
            End Using

            Using client As New HttpClient()
                Using formData As New MultipartFormDataContent()
                    Dim fileContent As Byte() = File.ReadAllBytes(csvFile)
                    Dim fileContentBytes As New ByteArrayContent(fileContent)

                    fileContentBytes.Headers.ContentType =
                        New MediaTypeHeaderValue("text/csv")

                    formData.Add(fileContentBytes, "file", "products.csv")
                    formData.Add(New StringContent(DistributorId), "distributorId")
                    formData.Add(New StringContent(CreatedBy), "createdBy")
                    formData.Add(New StringContent(UpdateExisting.ToString().ToLowerInvariant()), "updateExisting")

                    Dim response As HttpResponseMessage =
                        Await client.PostAsync(ProductsMasterApiUrl, formData)

                    If response.IsSuccessStatusCode Then
                        Dim result As String =
                            Await response.Content.ReadAsStringAsync()

                        TxtMsg.Text =
                            "Products Upload Completed: " &
                            dt.Rows.Count &
                            " products processed"

                        File.Delete(csvFile)
                        Return True
                    Else
                        Dim errorContent As String =
                            Await response.Content.ReadAsStringAsync()

                        TxtMsg.Text =
                            "Products Upload Failed: " &
                            response.StatusCode.ToString() &
                            " - " &
                            errorContent

                        File.Delete(csvFile)
                        Return False
                    End If
                End Using
            End Using

        Catch ex As Exception
            MsgBox("Error in Products Upload: " & ex.Message)
            TxtMsg.Text = "Error: " & ex.Message
            Return False
        End Try
    End Function

    Private Function EscapeCsv(field As String) As String
        If String.IsNullOrEmpty(field) Then Return ""
        If field.Contains(",") OrElse field.Contains("""") OrElse field.Contains(vbCrLf) Then
            field = field.Replace("""", """""")
            Return """" & field & """"
        End If
        Return field
    End Function

    Private Async Function UpdateOrderStatusToDownloaded(orderId As String, orderNumber As String) As Task(Of Boolean)
        Try
            Using client As New HttpClient()
                Dim statusData As New Dictionary(Of String, String)
                statusData.Add("status", "downloaded")
                statusData.Add("orderNumber", orderNumber)

                Dim json As String = JsonConvert.SerializeObject(statusData)
                Dim content As New StringContent(json, Encoding.UTF8, "application/json")

                Dim url As String = $"{UpdateOrderStatusApiUrl}/{orderId}"
                Dim response As HttpResponseMessage = Await client.PutAsync(url, content)

                If response.IsSuccessStatusCode Then
                    TxtMsg.Text = $"Order {orderNumber} status updated to 'downloaded'"
                    Application.DoEvents()
                    Return True
                Else
                    Dim errorContent As String = Await response.Content.ReadAsStringAsync()
                    TxtMsg.Text = $"Failed to update status for order {orderNumber}: {response.StatusCode}"
                    Application.DoEvents()
                    Return False
                End If
            End Using
        Catch ex As Exception
            TxtMsg.Text = $"Error updating order status for {orderNumber}: {ex.Message}"
            Application.DoEvents()
            Return False
        End Try
    End Function

    ' --- Download Orders from MongoDB ---
    Private Async Function DownloadOrdersFromMongoDB() As Task(Of Boolean)

        Try
            TxtMsg.Text = "Downloading Orders from MongoDB..."

            salesmanCodeCache.Clear()

            Ultimate.Mod_DataBase.Conn = Ultimate.Mod_Connection.OpenYearConn()
            Ultimate.Mod_DataBase.CmdStr = "DELETE FROM Mobile_ImportBill"
            Ultimate.Mod_DataBase.Cmd = New SqlCommand(Ultimate.Mod_DataBase.CmdStr, Ultimate.Mod_DataBase.Conn)
            Ultimate.Mod_DataBase.Cmd.ExecuteNonQuery()
            Ultimate.Mod_Connection.CloseYearConn(Ultimate.Mod_DataBase.Conn)

            Using client As New HttpClient()

                Dim url As String = $"{OrdersApiUrl}/distributor/{DistributorId}"

                TxtMsg.Text = "Fetching orders from: " & url
                Application.DoEvents()

                Dim response As HttpResponseMessage = Await client.GetAsync(url)

                If response.IsSuccessStatusCode Then

                    Dim jsonString As String = Await response.Content.ReadAsStringAsync()

                    TxtMsg.Text = "Response received. Length: " & jsonString.Length & " characters"
                    Application.DoEvents()

                    If String.IsNullOrWhiteSpace(jsonString) OrElse
                   jsonString.Trim() = "{}" OrElse
                   jsonString.Trim() = "[]" Then

                        TxtMsg.Text =
                        "No orders found for distributor: " &
                        DistributorId &
                        " (empty response)"

                        Application.DoEvents()

                        Return False
                    End If

                    TxtMsg.Text = "Parsing orders..."
                    Application.DoEvents()

                    Dim orders As List(Of Order) = Nothing

                    Try

                        orders =
                        JsonConvert.DeserializeObject(Of List(Of Order))(jsonString)

                        TxtMsg.Text =
                        "Successfully parsed orders as list."

                        Application.DoEvents()

                    Catch ex As Exception

                        TxtMsg.Text =
                        "Error parsing orders: " &
                        ex.Message

                        Application.DoEvents()

                        Return False

                    End Try

                    If orders Is Nothing OrElse
                   orders.Count = 0 Then

                        TxtMsg.Text =
                        "No orders found for distributor: " &
                        DistributorId

                        Application.DoEvents()

                        Return False
                    End If

                    TxtMsg.Text =
                    "Found " &
                    orders.Count &
                    " orders. Processing..."

                    Application.DoEvents()

                    Dim pendingOrders =
                    orders.Where(
                        Function(o)
                            Return o.status Is Nothing OrElse
                                   o.status.ToLower() <> "downloaded"
                        End Function
                    ).ToList()

                    If pendingOrders.Count = 0 Then

                        TxtMsg.Text =
                        "No pending orders found. All orders are already downloaded."

                        Application.DoEvents()

                        Return False
                    End If

                    TxtMsg.Text =
                    "Found " &
                    pendingOrders.Count &
                    " pending orders (excluding already downloaded ones). Processing..."

                    Application.DoEvents()

                    Dim ordersToProcess As New List(Of Order)

                    Dim skippedExistingOrders As Integer = 0

                    For Each s As Order In pendingOrders

                        Dim orderNo As String = s.orderNumber

                        Dim checkSql As String =
                        $"SELECT COUNT(*) FROM t_sal_header WHERE PiPayId = '{orderNo.Replace("'", "''")}'"

                        Ultimate.Mod_DataBase.Conn =
                        Ultimate.Mod_Connection.OpenYearConn()

                        Dim checkCmd As New SqlCommand(
                        checkSql,
                        Ultimate.Mod_DataBase.Conn
                    )

                        Dim existingCount As Integer =
                        Convert.ToInt32(
                            checkCmd.ExecuteScalar()
                        )

                        Ultimate.Mod_Connection.CloseYearConn(
                        Ultimate.Mod_DataBase.Conn
                    )

                        If existingCount > 0 Then

                            skippedExistingOrders += 1

                            Continue For

                        Else

                            ordersToProcess.Add(s)

                        End If

                    Next

                    If ordersToProcess.Count = 0 Then

                        TxtMsg.Text =
                        "No new orders to download."

                        Application.DoEvents()

                        Me.Close()

                        Return False

                    End If

                    Dim processedCount As Integer = 0

                    For Each s As Order In ordersToProcess

                        If s.status IsNot Nothing AndAlso
                       s.status.ToLower() = "downloaded" Then

                            Continue For

                        End If

                        If s.items Is Nothing OrElse
                       s.items.Count = 0 Then

                            Continue For

                        End If

                        Dim mordno As String = s.orderNumber

                        Dim mseqno As Long = 1

                        For Each sitem As OrderItem In s.items

                            '=========================================================
                            ' GET GODOWN
                            '=========================================================
                            Dim tmp_gcode As String = "G1"

                            Dim dsgd As DataSet =
                            Ultimate.Mod_Connection.ReturnYeardata(
                                "SELECT TOP 1 GDCode FROM Mas_GoDown"
                            )

                            If dsgd IsNot Nothing AndAlso
                           dsgd.Tables.Count > 0 AndAlso
                           dsgd.Tables(0).Rows.Count > 0 Then

                                tmp_gcode =
                                dsgd.Tables(0).Rows(0)("GDCode").ToString()

                            End If


                            '=========================================================
                            ' GET PRODUCT SYSPRODCODE
                            '=========================================================
                            Dim tmp_prdcode As Integer = 0

                            Dim extractedSysProdCode As String = ""

                            If Not String.IsNullOrEmpty(sitem.sku) Then

                                If sitem.sku.Contains("_") Then

                                    Dim skuParts As String() =
                                    sitem.sku.Split("_"c)

                                    If skuParts.Length >= 1 Then

                                        extractedSysProdCode =
                                        skuParts(0)

                                        If Integer.TryParse(
                                        extractedSysProdCode,
                                        tmp_prdcode
                                    ) Then

                                        End If

                                    End If

                                Else

                                    Dim dsProd As DataSet =
                                    Ultimate.Mod_Connection.ReturnYeardata(
                                        "SELECT TOP 1 SysProdCode " &
                                        "FROM Mas_Product " &
                                        "WHERE ProdCode='" &
                                        sitem.sku.Replace("'", "''") &
                                        "'"
                                    )

                                    If dsProd IsNot Nothing AndAlso
                                   dsProd.Tables.Count > 0 AndAlso
                                   dsProd.Tables(0).Rows.Count > 0 Then

                                        tmp_prdcode =
                                        Convert.ToInt32(
                                            dsProd.Tables(0).Rows(0)("SysProdCode")
                                        )

                                    End If

                                End If

                            End If

                            If tmp_prdcode = 0 AndAlso
                           Not String.IsNullOrEmpty(sitem.productName) Then

                                Dim dsProd As DataSet =
                                Ultimate.Mod_Connection.ReturnYeardata(
                                    "SELECT TOP 1 SysProdCode " &
                                    "FROM Mas_Product " &
                                    "WHERE ProdName='" &
                                    sitem.productName.Replace("'", "''") &
                                    "'"
                                )

                                If dsProd IsNot Nothing AndAlso
                               dsProd.Tables.Count > 0 AndAlso
                               dsProd.Tables(0).Rows.Count > 0 Then

                                    tmp_prdcode =
                                    Convert.ToInt32(
                                        dsProd.Tables(0).Rows(0)("SysProdCode")
                                    )

                                End If

                            End If


                            '=========================================================
                            ' COMPANY CODE
                            '=========================================================
                            Dim tmp_cmpcode As Integer = -1


                            '=========================================================
                            ' GET CUSTOMER SYSACCODE
                            '=========================================================
                            Dim tmpdistretsyscode As String = ""

                            ' IMPORTANT:
                            ' customerId is uploaded in the format XApiKey_AcCode
                            ' Example: VIRA_1472 -> AcCode = 1472.
                            '
                            ' AcCode can be duplicated in Mas_Account,
                            ' so NEVER identify customer by AcCode alone.
                            '
                            ' Match BOTH:
                            ' AcCode + AcName.

                            Dim customerAcCode As String =
                            If(s.customerId, "").Trim()

                            Dim customerNameForLookup As String =
                            If(s.customerName, "").Trim()


                            '=========================================================
                            ' REMOVE XAPIKEY PREFIX FROM CUSTOMER ID
                            '=========================================================
                            If Not String.IsNullOrEmpty(customerAcCode) Then

                                Dim customerPrefix As String =
                                If(XApiKey, "").Trim() & "_"

                                If Not String.IsNullOrEmpty(XApiKey) AndAlso
                               customerAcCode.StartsWith(
                                   customerPrefix,
                                   StringComparison.OrdinalIgnoreCase
                               ) Then

                                    customerAcCode =
                                    customerAcCode.Substring(
                                        customerPrefix.Length
                                    ).Trim()

                                ElseIf customerAcCode.Contains("_") Then

                                    ' Safe fallback for already-uploaded customer IDs.
                                    ' Take the part after final prefix separator.

                                    Dim lastUnderscore As Integer =
                                    customerAcCode.LastIndexOf("_"c)

                                    If lastUnderscore >= 0 AndAlso
                                   lastUnderscore < customerAcCode.Length - 1 Then

                                        customerAcCode =
                                        customerAcCode.Substring(
                                            lastUnderscore + 1
                                        ).Trim()

                                    End If

                                End If

                            End If


                            '=========================================================
                            ' FIND CUSTOMER FROM MAS_ACCOUNT
                            '=========================================================
                            If Not String.IsNullOrEmpty(customerAcCode) AndAlso
                           Not String.IsNullOrEmpty(customerNameForLookup) Then

                                Dim safeCustomerAcCode As String =
                                customerAcCode.Replace("'", "''")

                                Dim safeCustomerName As String =
                                customerNameForLookup.Replace("'", "''")

                                Dim customerSql As String =
                                "SELECT TOP 1 SysAcCode FROM Mas_Account " &
                                "WHERE LTRIM(RTRIM(CAST(AcCode AS VARCHAR(100)))) = '" &
                                safeCustomerAcCode &
                                "' " &
                                "AND UPPER(LTRIM(RTRIM(AcName))) = UPPER('" &
                                safeCustomerName &
                                "')"

                                Dim dsCust As DataSet =
                                Ultimate.Mod_Connection.ReturnYeardata(
                                    customerSql
                                )

                                If dsCust IsNot Nothing AndAlso
                               dsCust.Tables.Count > 0 AndAlso
                               dsCust.Tables(0).Rows.Count > 0 Then

                                    tmpdistretsyscode =
                                    dsCust.Tables(0).Rows(0)(
                                        "SysAcCode"
                                    ).ToString()

                                End If

                            End If


                            '=========================================================
                            ' NEW VALIDATION
                            '
                            ' IMPORTANT:
                            ' Previously when customer was not found,
                            ' tmpdistretsyscode remained blank.
                            '
                            ' The INSERT below converted blank to SQL NULL.
                            '
                            ' Mobile_ImportBill.SysAcCode does NOT allow NULL.
                            '
                            ' Therefore stop here and show EXACT order/customer
                            ' instead of getting generic SQL NULL error.
                            '=========================================================
                            If String.IsNullOrWhiteSpace(
                            tmpdistretsyscode
                        ) Then

                                Dim customerMappingError As String =
                                "SysAcCode NOT FOUND." &
                                vbCrLf &
                                vbCrLf &
                                "Order No : " &
                                If(s.orderNumber, "") &
                                vbCrLf &
                                "Customer ID : " &
                                If(s.customerId, "") &
                                vbCrLf &
                                "Extracted AcCode : " &
                                customerAcCode &
                                vbCrLf &
                                "Customer Name : " &
                                If(s.customerName, "") &
                                vbCrLf &
                                "Product : " &
                                If(sitem.productName, "") &
                                vbCrLf &
                                "SKU : " &
                                If(sitem.sku, "")

                                Throw New Exception(
                                customerMappingError
                            )

                            End If


                            '=========================================================
                            ' ORDER DATE
                            '=========================================================
                            Dim orderDateStr As String =
                            DateTime.Now.ToString("yyyy-MM-dd")

                            If Not String.IsNullOrEmpty(s.order_date) Then

                                orderDateStr =
                                s.order_date

                            ElseIf Not String.IsNullOrEmpty(s.createdAt) Then

                                orderDateStr =
                                s.createdAt

                            End If

                            Try

                                Dim parsedDate As DateTime =
                                DateTime.Parse(orderDateStr)

                                orderDateStr =
                                parsedDate.ToString("yyyy-MM-dd")

                            Catch ex As Exception

                            End Try


                            '=========================================================
                            ' UNIT
                            '=========================================================
                            Dim tmpprduom As String =
                            If(
                                String.IsNullOrEmpty(sitem.Unit),
                                "PCS",
                                sitem.Unit.ToUpper()
                            )


                            '=========================================================
                            ' SALESMAN
                            '=========================================================
                            Dim mobileSSMCode As String =
                            If(
                                String.IsNullOrEmpty(s.salesman_id),
                                "S1",
                                s.salesman_id
                            )

                            Dim salesmanName As String =
                            If(
                                String.IsNullOrEmpty(s.salesmanName),
                                "",
                                s.salesmanName
                            )

                            Dim refBy As String =
                            If(
                                String.IsNullOrEmpty(s.salesman_id),
                                "",
                                s.salesman_id
                            )

                            Dim tmp_scode As String =
                            GetActualSSMCodeFromDesktop(
                                mobileSSMCode,
                                salesmanName,
                                refBy
                            )


                            '=========================================================
                            ' QUANTITY
                            '=========================================================
                            Dim itemQty As Integer =
                            sitem.quantity

                            If itemQty = 0 Then

                                itemQty =
                                sitem.qty

                            End If


                            '=========================================================
                            ' ORIGINAL QUANTITY
                            '=========================================================

                            ' IMPORTANT:
                            ' OQty is original/base ordered quantity used by
                            ' desktop billing flow.
                            '
                            ' FreeQty is separate scheme quantity.
                            '
                            ' FreeQty must NEVER overwrite OQty.

                            Dim itemOQty As Double =
                            sitem.oqty

                            If itemOQty = 0 Then

                                itemOQty =
                                itemQty

                            End If


                            '=========================================================
                            ' FREE QTY
                            '=========================================================
                            Dim itemFreeQty As Double =
                            sitem.freeQty


                            '=========================================================
                            ' RATE
                            '=========================================================
                            Dim itemRate As Double =
                            sitem.rate

                            If itemRate = 0 Then

                                itemRate =
                                sitem.price

                            End If


                            '=========================================================
                            ' ORIGINAL RATE
                            '=========================================================
                            Dim itemORate As Double =
                            sitem.orate

                            If itemORate = 0 AndAlso
                           itemRate > 0 Then

                                itemORate =
                                itemRate

                            End If


                            '=========================================================
                            ' MRP
                            '=========================================================
                            Dim itemMrp As Double =
                            sitem.mrp


                            '=========================================================
                            ' PRODUCT WISE SCHEME
                            '=========================================================

                            ' Product-wise scheme values received
                            ' from MongoDB/mobile order.

                            Dim itemSchPer As Double =
                            sitem.schPer

                            Dim itemSchAmt As Double =
                            sitem.schAmt


                            '=========================================================
                            ' GROSS AMOUNT
                            '=========================================================
                            Dim itemGrossAmt As Double =
                            sitem.grossAmt

                            If itemGrossAmt = 0 Then

                                If itemOQty <> 0 AndAlso
                               itemORate <> 0 Then

                                    itemGrossAmt =
                                    itemOQty * itemORate

                                Else

                                    itemGrossAmt =
                                    sitem.amount

                                End If

                            End If


                            '=========================================================
                            ' NET AMOUNT
                            '=========================================================
                            Dim itemNetAmt As Double =
                            sitem.netAmt

                            If itemNetAmt = 0 AndAlso
                           sitem.amount <> 0 Then

                                itemNetAmt =
                                sitem.amount

                            End If

                            If itemNetAmt = 0 AndAlso
                           itemGrossAmt <> 0 Then

                                itemNetAmt =
                                itemGrossAmt - itemSchAmt

                            End If


                            '=========================================================
                            ' INSERT INTO MOBILE_IMPORTBILL
                            '=========================================================
                            Dim sqlInsert As String =
                            $"INSERT INTO Mobile_ImportBill(" &
                            $"pipayID, OrderDate, seq_no, SysAcCode, SysProdCode, OrderNo, unit, qty, rate, mrp, oqty, orate, grossamt, FreeQty, SchPer, SchAmt, NetAmt, SSMCode, SysCompCode, gdcode) VALUES (" &
                            $"'{mordno}', " &
                            $"'{orderDateStr}', " &
                            $"{mseqno}, " &
                            $"{If(String.IsNullOrEmpty(tmpdistretsyscode), "NULL", tmpdistretsyscode)}, " &
                            $"{tmp_prdcode}, " &
                            $"'{mordno}', " &
                            $"'{tmpprduom}', " &
                            $"{itemQty}, " &
                            $"{itemRate}, " &
                            $"{itemMrp}, " &
                            $"{itemOQty}, " &
                            $"{itemORate}, " &
                            $"{itemGrossAmt}, " &
                            $"{itemFreeQty}, " &
                            $"{itemSchPer}, " &
                            $"{itemSchAmt}, " &
                            $"{itemNetAmt}, " &
                            $"'{tmp_scode}', " &
                            $"{tmp_cmpcode}, " &
                            $"'{tmp_gcode}')"


                            Ultimate.Mod_DataBase.Conn =
                            Ultimate.Mod_Connection.OpenYearConn()

                            Ultimate.Mod_DataBase.CmdStr =
                            sqlInsert

                            Ultimate.Mod_DataBase.Cmd =
                            New SqlCommand(
                                sqlInsert,
                                Ultimate.Mod_DataBase.Conn
                            )

                            Ultimate.Mod_DataBase.Cmd.ExecuteNonQuery()

                            Ultimate.Mod_Connection.CloseYearConn(
                            Ultimate.Mod_DataBase.Conn
                        )

                            mseqno += 1

                        Next


                        '=========================================================
                        ' UPDATE ORDER STATUS AFTER SUCCESSFUL INSERT
                        '=========================================================
                        Dim statusUpdated As Boolean =
                        Await UpdateOrderStatusToDownloaded(
                            s.id,
                            s.orderNumber
                        )

                        processedCount += 1

                    Next


                    '=========================================================
                    ' SUCCESS
                    '=========================================================
                    If processedCount > 0 Then

                        MessageBox.Show(
                        "Orders Downloaded Successfully!",
                        "Success",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    )

                    End If

                    TxtMsg.Text =
                    "Order download completed."

                    Application.DoEvents()

                    Return True

                Else

                    Dim errorContent As String =
                    Await response.Content.ReadAsStringAsync()

                    TxtMsg.Text =
                    "Failed to fetch orders: " &
                    response.StatusCode.ToString() &
                    " - " &
                    errorContent

                    Application.DoEvents()

                    Return False

                End If

            End Using


        Catch ex As Exception

            MsgBox(
            "Error downloading orders: " &
            ex.Message
        )

            TxtMsg.Text =
            "Error: " &
            ex.Message

            Application.DoEvents()

            Return False

        End Try

    End Function

    ' --- Delete Order from MongoDB ---
    Private Async Function DeleteOrderFromMongoDB(orderId As String) As Task(Of Boolean)
        Try
            Using client As New HttpClient()
                Dim url As String = $"{DeleteOrderApiUrl}/{orderId}"
                Dim response As HttpResponseMessage = Await client.DeleteAsync(url)
                Return response.IsSuccessStatusCode
            End Using
        Catch ex As Exception
            Return False
        End Try
    End Function

    ' =====================================================
    ' MODIFIED: PiPay_Load - Grid starts hidden
    ' =====================================================
    Private Sub PiPay_Load(ByVal sender As Object, ByVal e As System.EventArgs) Handles Me.Load
        cmbmst.FlatStyle = FlatStyle.Flat
        cmbmst.Font = New Font("Segoe UI", 10, FontStyle.Regular)
        cmbmst.BackColor = Color.White
        cmbmst.ForeColor = Color.FromArgb(64, 64, 64)
        cmbmst.DropDownStyle = ComboBoxStyle.DropDownList
        cmbmst.DrawMode = DrawMode.OwnerDrawFixed
        cmbmst.ItemHeight = 25

        With BtnCancel
            .FlatStyle = FlatStyle.Flat
            .FlatAppearance.BorderSize = 0
            .BackColor = Color.FromArgb(231, 76, 60)
            .ForeColor = Color.White
            .Font = New Font("Segoe UI Semibold", 10, FontStyle.Bold)
            .Cursor = Cursors.Hand
            .Size = New Size(120, 40)
            .Text = "Cancel"
        End With

        ' Configure DataGridView (initially hidden, small size with scrollbar)
        ConfigureDataGridView()
        ConfigureReceiptFilters()
        DataGridView1.Visible = False
        LblRecordCount.Visible = False
        BtnConvertReceipt.Visible = False

        ' Load distributor info
        If Not LoadDistributorInfo() Then
            MsgBox("Warning: Distributor ID not found in Mas_Firm. Uploads may fail.")
        Else
            TxtMsg.Text = "Distributor ID loaded: " & DistributorId
        End If

        ' Load combo box items
        cmbmst.Items.Clear()
        cmbmst.Items.Add("upload party master")
        cmbmst.Items.Add("upload product master")
        cmbmst.Items.Add("Order Download")
        cmbmst.SelectedIndex = 0

        ' Set button texts
        Button1.Text = "Upload Party Master"
        Button2.Text = "Upload Product Master"
        Button3.Text = "Download Orders"
        Button3.Visible = True
        Button5.Text = "Download Receipt"
    End Sub

    ' =====================================================
    ' MODIFIED: ConfigureDataGridView - Small size with scrollbar
    ' =====================================================
    Private Sub ConfigureDataGridView()
        Try
            With DataGridView1
                .AutoGenerateColumns = False
                .AllowUserToAddRows = False
                .AllowUserToDeleteRows = False
                .ReadOnly = False
                .SelectionMode = DataGridViewSelectionMode.FullRowSelect
                .MultiSelect = False
                .RowHeadersVisible = False

                ' --- REMOVED Dock = DockStyle.Fill ---
                ' Set fixed size (adjust these values as needed)
                .Size = New Size(900, 350)  ' Width: 900px, Height: 350px
                .Location = New Point(50, 180)  ' Position on form

                ' --- ENABLE SCROLLBARS ---
                .ScrollBars = ScrollBars.Both  ' Show both horizontal and vertical scrollbars

                ' Auto-resize columns to fit content
                .AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.None
                .AutoSizeRowsMode = DataGridViewAutoSizeRowsMode.None

                ' Clear existing columns
                .Columns.Clear()

                ' Add CheckBox column for selection
                Dim checkCol As New DataGridViewCheckBoxColumn()
                checkCol.Name = "Select"
                checkCol.HeaderText = "Select"
                checkCol.Width = 50
                checkCol.ReadOnly = False
                checkCol.Frozen = True  ' Freeze selection column
                .Columns.Add(checkCol)

                ' Add other columns with fixed widths
                Dim colCollectionId As New DataGridViewTextBoxColumn()
                colCollectionId.Name = "CollectionId"
                colCollectionId.HeaderText = "Collection ID"
                colCollectionId.DataPropertyName = "CollectionId"
                colCollectionId.Width = 130
                .Columns.Add(colCollectionId)

                Dim colInvoice As New DataGridViewTextBoxColumn()
                colInvoice.Name = "Invoice"
                colInvoice.HeaderText = "Invoice"
                colInvoice.Width = 105
                .Columns.Add(colInvoice)

                Dim colCustomerName As New DataGridViewTextBoxColumn()
                colCustomerName.Name = "CustomerName"
                colCustomerName.HeaderText = "Customer Name"
                colCustomerName.DataPropertyName = "CustomerName"
                colCustomerName.Width = 150
                .Columns.Add(colCustomerName)

                Dim colCustomerId As New DataGridViewTextBoxColumn()
                colCustomerId.Name = "CustomerId"
                colCustomerId.HeaderText = "Customer ID"
                colCustomerId.DataPropertyName = "CustomerId"
                colCustomerId.Width = 90
                .Columns.Add(colCustomerId)

                Dim colAmount As New DataGridViewTextBoxColumn()
                colAmount.Name = "Amount"
                colAmount.HeaderText = "Amount"
                colAmount.DataPropertyName = "Amount"
                colAmount.Width = 90
                colAmount.DefaultCellStyle.Format = "N2"
                colAmount.DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight
                .Columns.Add(colAmount)

                Dim colPaymentMode As New DataGridViewTextBoxColumn()
                colPaymentMode.Name = "PaymentMode"
                colPaymentMode.HeaderText = "Payment Mode"
                colPaymentMode.DataPropertyName = "PaymentMode"
                colPaymentMode.Width = 100
                .Columns.Add(colPaymentMode)

                Dim colCollectionDate As New DataGridViewTextBoxColumn()
                colCollectionDate.Name = "CollectionDate"
                colCollectionDate.HeaderText = "Collection Date"
                colCollectionDate.DataPropertyName = "CollectionDate"
                colCollectionDate.Width = 150
                .Columns.Add(colCollectionDate)

                Dim colStatus As New DataGridViewTextBoxColumn()
                colStatus.Name = "Status"
                colStatus.HeaderText = "Status"
                colStatus.DataPropertyName = "Status"
                colStatus.Width = 90
                .Columns.Add(colStatus)

                Dim colSalesman As New DataGridViewTextBoxColumn()
                colSalesman.Name = "Salesman"
                colSalesman.HeaderText = "Salesman"
                colSalesman.DataPropertyName = "Salesman"
                colSalesman.Width = 100
                .Columns.Add(colSalesman)

                Dim colRemark As New DataGridViewTextBoxColumn()
                colRemark.Name = "Remark"
                colRemark.HeaderText = "Remark"
                colRemark.DataPropertyName = "Remark"
                colRemark.Width = 120
                .Columns.Add(colRemark)

                Dim colPaymentData As New DataGridViewTextBoxColumn()
                colPaymentData.Name = "PaymentData"
                colPaymentData.HeaderText = "PaymentData"
                colPaymentData.Visible = False
                colPaymentData.DataPropertyName = "PaymentData"
                .Columns.Add(colPaymentData)

                ' Set row height
                .RowTemplate.Height = 25
            End With
        Catch ex As Exception
            MsgBox("Error configuring DataGridView: " & ex.Message)
        End Try
    End Sub

    ' =====================================================
    ' NEW: HideGrid - Hides the grid and related controls
    ' =====================================================
    Private Sub HideGrid()
        DataGridView1.Visible = False
        LblRecordCount.Visible = False
        BtnConvertReceipt.Visible = False
        SetReceiptFiltersVisible(False)
    End Sub

    ' =====================================================
    ' MODIFIED: LoadPaymentsToGrid - Shows grid after loading
    ' =====================================================
    Private Sub LoadPaymentsToGrid(payments As List(Of Payment))
        Try
            DataGridView1.Rows.Clear()

            For Each payment As Payment In payments
                Dim rowIndex As Integer = DataGridView1.Rows.Add()

                DataGridView1.Rows(rowIndex).Cells("Select").Value = False
                DataGridView1.Rows(rowIndex).Cells("CollectionId").Value = payment.collection_id
                DataGridView1.Rows(rowIndex).Cells("Invoice").Value = If(payment.bill_details Is Nothing, "", If(payment.bill_details.bill_series, "") & payment.bill_details.bill_no.ToString())
                DataGridView1.Rows(rowIndex).Cells("CustomerName").Value = If(payment.customer_name, "")
                DataGridView1.Rows(rowIndex).Cells("CustomerId").Value = If(payment.customer_id, "")
                DataGridView1.Rows(rowIndex).Cells("Amount").Value = payment.amount_collected
                DataGridView1.Rows(rowIndex).Cells("PaymentMode").Value = If(payment.payment_mode, "")
                DataGridView1.Rows(rowIndex).Cells("CollectionDate").Value = If(payment.collection_date, "")
                DataGridView1.Rows(rowIndex).Cells("Status").Value = If(payment.status, "")
                DataGridView1.Rows(rowIndex).Cells("Salesman").Value = If(payment.salesman_details IsNot Nothing, payment.salesman_details.name, "")
                DataGridView1.Rows(rowIndex).Cells("Remark").Value = If(payment.remark, "")
                DataGridView1.Rows(rowIndex).Cells("PaymentData").Value = payment
            Next

            ' Update status label
            LblRecordCount.Text = $"Total: {payments.Count} records"

            LblRecordCount.Visible = True

            BtnConvertReceipt.Visible = True

            ' --- SHOW THE GRID ---
            DataGridView1.Visible = True

            SetReceiptFiltersVisible(True)
            UpdateReceiptSelectAll()

        Catch ex As Exception
            MsgBox("Error loading payments to grid: " & ex.Message)
        End Try
    End Sub

    ' --- Button 1 Click: Upload Party Master ---
    Private Async Sub Button1_Click(sender As Object, e As EventArgs) Handles Button1.Click
        If String.IsNullOrEmpty(DistributorId) Then
            MsgBox("Distributor ID not found. Please check Mas_Firm table.")
            Exit Sub
        End If

        Button1.Enabled = False

        Try
            Dim uploadResult As Boolean = Await UploadCustomersToMongoDB()
            If uploadResult Then
                MsgBox("Party Master Upload Completed Successfully.")
            Else
                MsgBox("Party Master Upload Failed. Please check the message for details.")
            End If
        Catch ex As Exception
            MsgBox("Error: " & ex.Message)
        Finally
            Button1.Enabled = True
        End Try
    End Sub

    ' --- Button 2 Click: Upload Product Master ---
    Private Async Sub Button2_Click(sender As Object, e As EventArgs) Handles Button2.Click
        If String.IsNullOrEmpty(DistributorId) Then
            MsgBox("Distributor ID not found. Please check Mas_Firm table.")
            Exit Sub
        End If

        Button2.Enabled = False

        Try
            Dim uploadResult As Boolean = Await UploadProductsToMongoDB()

            If uploadResult Then
                MsgBox("Product Master Upload Completed Successfully.")
            Else
                MsgBox("Product Master Upload Failed. Please check the message for details.")
            End If
        Catch ex As Exception
            MsgBox("Error in Product Upload: " & ex.Message)
        Finally
            Button2.Enabled = True
        End Try
    End Sub

    ' --- Button 3 Click: Download Orders ---
    Private Async Sub Button3_Click(sender As Object, e As EventArgs) Handles Button3.Click
        If String.IsNullOrEmpty(DistributorId) Then
            MsgBox("Distributor ID not found. Please check Mas_Firm table.")
            Exit Sub
        End If

        Button3.Enabled = False

        Try
            Dim downloadResult As Boolean = Await DownloadOrdersFromMongoDB()
            If downloadResult Then
                MsgBox("Order Download Completed Successfully.")
            Else
                MsgBox("Order Download Failed. Please check the message for details.")
            End If
        Catch ex As Exception
            MsgBox("Error downloading orders: " & ex.Message)
        Finally
            Button3.Enabled = True
        End Try
    End Sub

    ' --- Cancel Button ---
    Private Sub BtnCancel_Click(sender As Object, e As EventArgs) Handles BtnCancel.Click
        IsValidt = False
        Me.Close()
    End Sub

    Private Async Function UploadOutstandingBillsToMongoDB() As Task(Of Boolean)

        Try

            If Not LoadDistributorInfo() Then
                MsgBox("Distributor ID not found in Mas_Firm.")
                Return False
            End If

            TxtMsg.Text = "Starting Outstanding Bills Upload..."
            Application.DoEvents()


            ' ============================================================
            ' GET OUTSTANDING BILLS WITH CUSTOMER NAME + GEO LOCATION
            ' ============================================================

            Dim SqlStr As String = "
SELECT 
    mf.DistributorID AS distributorId,
    'SAL' AS Trn,

    t.TrnSeries,
    t.TrnNo,
    t.TrnDate,
    t.DorC,

    t.SysAcCode,

    ISNULL(ma.AcName, '') AS AcName,

    ma.GeoLatitude,
    ma.GeoLongitude,

    t.Amt,
    t.Aamt,
    t.Bamt,
    t.ClrDate,
    t.seqno,
    t.VatAmt,
    t.VatPer,
    t.VatType,
    t.ChqNo,
    t.ChqDate,
    t.Narr,
    t.BankCode,
    t.DepDate,
    t.DueDate,
    t.DocNo

FROM t_alltran t

LEFT JOIN Mas_Account ma
    ON ma.SysAcCode = t.SysAcCode

CROSS APPLY
(
    SELECT TOP 1 DistributorID
    FROM Global.dbo.Mas_Firm
) mf

WHERE t.Bamt > 0
  AND t.SysAcCode > 2000
"


            Dim ds As DataSet =
            Ultimate.Mod_Connection.ReturnYeardata(SqlStr)


            If ds Is Nothing OrElse
           ds.Tables.Count = 0 OrElse
           ds.Tables(0).Rows.Count = 0 Then

                MsgBox("No outstanding bills found.")
                Return False

            End If


            ' ============================================================
            ' PREPARE OUTSTANDING BILL LIST
            ' ============================================================

            Dim allBills As New List(Of Object)


            For Each row As DataRow In ds.Tables(0).Rows

                ' ========================================================
                ' LATITUDE
                ' ========================================================

                Dim geoLatitude As Object = Nothing

                If Not IsDBNull(row("GeoLatitude")) AndAlso
               row("GeoLatitude").ToString().Trim() <> "" Then

                    Dim lat As Decimal

                    If Decimal.TryParse(
                    row("GeoLatitude").ToString(),
                    Globalization.NumberStyles.Any,
                    Globalization.CultureInfo.InvariantCulture,
                    lat) Then

                        geoLatitude = lat

                    ElseIf Decimal.TryParse(
                    row("GeoLatitude").ToString(),
                    lat) Then

                        geoLatitude = lat

                    End If

                End If


                ' ========================================================
                ' LONGITUDE
                ' ========================================================

                Dim geoLongitude As Object = Nothing

                If Not IsDBNull(row("GeoLongitude")) AndAlso
               row("GeoLongitude").ToString().Trim() <> "" Then

                    Dim lng As Decimal

                    If Decimal.TryParse(
                    row("GeoLongitude").ToString(),
                    Globalization.NumberStyles.Any,
                    Globalization.CultureInfo.InvariantCulture,
                    lng) Then

                        geoLongitude = lng

                    ElseIf Decimal.TryParse(
                    row("GeoLongitude").ToString(),
                    lng) Then

                        geoLongitude = lng

                    End If

                End If


                ' ========================================================
                ' PREPARE DATE VALUES
                ' ========================================================

                Dim trnDateValue As Object = Nothing
                Dim clrDateValue As Object = Nothing
                Dim chqDateValue As Object = Nothing
                Dim depDateValue As Object = Nothing
                Dim dueDateValue As Object = Nothing


                If Not IsDBNull(row("TrnDate")) Then
                    trnDateValue =
                    Convert.ToDateTime(row("TrnDate")).ToString("yyyy-MM-dd")
                End If


                If Not IsDBNull(row("ClrDate")) Then
                    clrDateValue =
                    Convert.ToDateTime(row("ClrDate")).ToString("yyyy-MM-dd")
                End If


                If Not IsDBNull(row("ChqDate")) Then
                    chqDateValue =
                    Convert.ToDateTime(row("ChqDate")).ToString("yyyy-MM-dd")
                End If


                If Not IsDBNull(row("DepDate")) Then
                    depDateValue =
                    Convert.ToDateTime(row("DepDate")).ToString("yyyy-MM-dd")
                End If


                If Not IsDBNull(row("DueDate")) Then
                    dueDateValue =
                    Convert.ToDateTime(row("DueDate")).ToString("yyyy-MM-dd")
                End If


                ' ========================================================
                ' CREATE BILL OBJECT
                '
                ' Dictionary is intentionally used here instead of
                ' New With { ... } to avoid anonymous-type compiler errors.
                ' ========================================================

                Dim bill As New Dictionary(Of String, Object)


                bill.Add(
                "distributorId",
                row("distributorId").ToString()
            )


                bill.Add(
                "Trn",
                row("Trn").ToString()
            )


                bill.Add(
                "TrnSeries",
                row("TrnSeries").ToString()
            )


                bill.Add(
                "TrnNo",
                Val(row("TrnNo").ToString())
            )


                bill.Add(
                "TrnDate",
                trnDateValue
            )


                bill.Add(
                "DorC",
                row("DorC").ToString()
            )


                ' ========================================================
                ' CUSTOMER DETAILS
                ' ========================================================

                bill.Add(
                "SysAcCode",
                row("SysAcCode").ToString()
            )


                bill.Add(
                "AcName",
                If(
                    IsDBNull(row("AcName")),
                    "",
                    row("AcName").ToString()
                )
            )


                bill.Add(
                "GeoLatitude",
                geoLatitude
            )


                bill.Add(
                "GeoLongitude",
                geoLongitude
            )

                ' Compatibility aliases. These do not replace the existing
                ' fields; they only ensure older/newer backend/mobile code
                ' can read the same values reliably.
                bill.Add(
                "customer_name",
                If(IsDBNull(row("AcName")), "", row("AcName").ToString())
            )

                bill.Add(
                "latitude",
                geoLatitude
            )

                bill.Add(
                "longitude",
                geoLongitude
            )


                ' ========================================================
                ' OUTSTANDING DETAILS
                ' ========================================================

                bill.Add(
                "Amt",
                Val(row("Amt").ToString())
            )


                bill.Add(
                "Aamt",
                Val(row("Aamt").ToString())
            )


                bill.Add(
                "Bamt",
                Val(row("Bamt").ToString())
            )


                bill.Add(
                "ClrDate",
                clrDateValue
            )


                bill.Add(
                "seqno",
                Val(row("seqno").ToString())
            )


                bill.Add(
                "VatAmt",
                Val(row("VatAmt").ToString())
            )


                bill.Add(
                "VatPer",
                Val(row("VatPer").ToString())
            )


                bill.Add(
                "VatType",
                row("VatType").ToString()
            )


                bill.Add(
                "ChqNo",
                row("ChqNo").ToString()
            )


                bill.Add(
                "ChqDate",
                chqDateValue
            )


                bill.Add(
                "Narr",
                row("Narr").ToString()
            )


                bill.Add(
                "BankCode",
                row("BankCode").ToString()
            )


                bill.Add(
                "DepDate",
                depDateValue
            )


                bill.Add(
                "DueDate",
                dueDateValue
            )


                bill.Add(
                "DocNo",
                row("DocNo").ToString()
            )


                ' Add prepared bill to upload list
                allBills.Add(bill)

            Next


            ' ============================================================
            ' COUNTERS
            ' ============================================================

            Dim insertedCount As Integer = 0
            Dim updatedCount As Integer = 0
            Dim skippedCount As Integer = 0
            Dim failedCount As Integer = 0

            Dim skippedErrors As New List(Of String)


            ' ============================================================
            ' BATCH SIZE
            ' ============================================================

            Dim batchSize As Integer = 100


            ' ============================================================
            ' UPLOAD TO BACKEND
            ' ============================================================

            Using client As New HttpClient()

                client.DefaultRequestHeaders.Accept.Clear()

                client.DefaultRequestHeaders.Accept.Add(
                New MediaTypeWithQualityHeaderValue(
                    "application/json"
                )
            )

                client.Timeout = TimeSpan.FromMinutes(30)


                For startIndex As Integer =
                0 To allBills.Count - 1 Step batchSize


                    Dim batchBills =
                    allBills _
                    .Skip(startIndex) _
                    .Take(batchSize) _
                    .ToList()


                    ' ====================================================
                    ' PAYLOAD
                    ' ====================================================

                    Dim payload As New Dictionary(Of String, Object)

                    payload.Add(
                    "distributorId",
                    DistributorId
                )

                    payload.Add(
                    "bills",
                    batchBills
                )


                    Dim jsonBody As String =
                    JsonConvert.SerializeObject(payload)


                    Dim content As New StringContent(
                    jsonBody,
                    Encoding.UTF8,
                    "application/json"
                )


                    TxtMsg.Text =
                    "Uploading Outstanding Bills " &
                    (startIndex + 1).ToString() &
                    " to " &
                    Math.Min(
                        startIndex + batchBills.Count,
                        allBills.Count
                    ).ToString() &
                    " of " &
                    allBills.Count.ToString()


                    Application.DoEvents()


                    ' ====================================================
                    ' POST REQUEST
                    ' ====================================================

                    Dim response As HttpResponseMessage =
                    Await client.PostAsync(
                        OutstandingUploadApiUrl,
                        content
                    )


                    Dim result As String =
                    Await response.Content.ReadAsStringAsync()


                    ' ====================================================
                    ' HTTP ERROR
                    ' ====================================================

                    If Not response.IsSuccessStatusCode Then

                        failedCount += batchBills.Count

                        skippedErrors.Add(result)

                        Continue For

                    End If


                    ' ====================================================
                    ' READ BACKEND RESPONSE
                    ' ====================================================

                    Dim obj As Newtonsoft.Json.Linq.JObject =
                    Newtonsoft.Json.Linq.JObject.Parse(result)


                    If obj("success") Is Nothing OrElse
                   obj("success").ToObject(Of Boolean)() = False Then

                        failedCount += batchBills.Count

                        skippedErrors.Add(result)

                        Continue For

                    End If


                    ' ====================================================
                    ' UPDATE COUNTERS
                    ' ====================================================

                    insertedCount +=
                    If(
                        obj("inserted") IsNot Nothing,
                        obj("inserted").ToObject(Of Integer)(),
                        0
                    )


                    updatedCount +=
                    If(
                        obj("updated") IsNot Nothing,
                        obj("updated").ToObject(Of Integer)(),
                        0
                    )


                    skippedCount +=
                    If(
                        obj("skipped") IsNot Nothing,
                        obj("skipped").ToObject(Of Integer)(),
                        0
                    )

                Next

            End Using


            ' ============================================================
            ' COMPLETED
            ' ============================================================

            TxtMsg.Text =
            "Outstanding Upload Completed. Inserted: " &
            insertedCount.ToString() &
            ", Updated: " &
            updatedCount.ToString() &
            ", Skipped: " &
            skippedCount.ToString() &
            ", Failed: " &
            failedCount.ToString()


            ' ============================================================
            ' SHOW RESULT
            ' ============================================================

            If failedCount > 0 OrElse
           skippedCount > 0 Then


                MsgBox(
                "Outstanding upload completed with some skipped/failed bills." &
                vbCrLf &
                "Inserted: " &
                insertedCount.ToString() &
                vbCrLf &
                "Updated: " &
                updatedCount.ToString() &
                vbCrLf &
                "Skipped: " &
                skippedCount.ToString() &
                vbCrLf &
                "Failed: " &
                failedCount.ToString() &
                vbCrLf &
                vbCrLf &
                "First errors:" &
                vbCrLf &
                String.Join(
                    vbCrLf,
                    skippedErrors.Take(10)
                )
            )

            Else

                MsgBox(
                "Outstanding bills uploaded successfully." &
                vbCrLf &
                "Inserted: " &
                insertedCount.ToString() &
                vbCrLf &
                "Updated: " &
                updatedCount.ToString()
            )

            End If


            Return (insertedCount + updatedCount) > 0


        Catch ex As Exception

            Dim msg As String =
            ex.Message


            If ex.InnerException IsNot Nothing Then

                msg &=
                vbCrLf &
                "Inner Error: " &
                ex.InnerException.Message

            End If


            MsgBox(
            "Error uploading outstanding bills: " &
            msg
        )


            Return False

        End Try

    End Function

    Private Async Sub Button4_Click(sender As Object, e As EventArgs) Handles Button4.Click
        Await UploadOutstandingBillsToMongoDB()
    End Sub

    ' --- UI Event Handlers ---
    Private Sub cmbmst_DrawItem(sender As Object, e As DrawItemEventArgs) Handles cmbmst.DrawItem
        If e.Index < 0 Then Exit Sub

        e.DrawBackground()
        Dim text As String = cmbmst.Items(e.Index).ToString()
        Dim textColor As Color = If((e.State And DrawItemState.Selected) = DrawItemState.Selected, Color.White, Color.FromArgb(64, 64, 64))
        Dim backColor As Color = If((e.State And DrawItemState.Selected) = DrawItemState.Selected, Color.FromArgb(0, 120, 215), Color.White)

        Using brush As New SolidBrush(backColor)
            e.Graphics.FillRectangle(brush, e.Bounds)
        End Using

        TextRenderer.DrawText(e.Graphics, text, cmbmst.Font, e.Bounds, textColor, TextFormatFlags.VerticalCenter Or TextFormatFlags.Left)
        e.DrawFocusRectangle()
    End Sub

    Private Sub BtnCancel_MouseEnter(sender As Object, e As EventArgs) Handles BtnCancel.MouseEnter
        BtnCancel.BackColor = Color.FromArgb(192, 57, 43)
    End Sub

    Private Sub BtnCancel_MouseLeave(sender As Object, e As EventArgs) Handles BtnCancel.MouseLeave
        BtnCancel.BackColor = Color.FromArgb(231, 76, 60)
    End Sub

    Private Sub BtnCancel_Paint(sender As Object, e As PaintEventArgs) Handles BtnCancel.Paint
        Dim button As Button = CType(sender, Button)
        Dim rect As Rectangle = button.ClientRectangle
        Dim path As New Drawing2D.GraphicsPath()
        Dim radius As Integer = 20
        path.AddArc(rect.X, rect.Y, radius, radius, 180, 90)
        path.AddArc(rect.Right - radius - 1, rect.Y, radius, radius, 270, 90)
        path.AddArc(rect.Right - radius - 1, rect.Bottom - radius - 1, radius, radius, 0, 90)
        path.AddArc(rect.X, rect.Bottom - radius - 1, radius, radius, 90, 90)
        path.CloseAllFigures()
        button.Region = New Region(path)
    End Sub

    Private Sub txtLoadNumber_GotFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles txtLoadNumber.GotFocus
        txtLoadNumber.SelectAll()
        Ultimate.Mod_GlobFunction.SetActiveControl(LblLoadNo, True)
    End Sub

    Private Sub txtLoadNumber_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtLoadNumber.KeyDown
        If e.KeyCode = Keys.Enter Then
            If Val(txtLoadNumber.Text) <= 0 Then
                MsgBox("Enter Valid Load No.", MsgBoxStyle.Information, Ultimate.Mod_GlobFunction.UseedFormName)
                txtLoadNumber.SelectAll()
                txtLoadNumber.Focus()
            Else
                Dim SqlStr As String = "Select * from t_loadinfo where loadno='" + txtLoadNumber.Text + "'"
                Dim dst5 As New System.Data.DataSet
                dst5 = Ultimate.Mod_Connection.ReturnYeardata(SqlStr)
                If dst5.Tables(0).Rows.Count > 0 Then
                    txtvan.Text = dst5.Tables(0).Rows(0)("VanCode").ToString()
                End If
            End If
            SelectNextControl(ActiveControl, True, True, True, True)
        End If
    End Sub

    Private Function MyRemoteCertificateValidationCallback(sender As Object, certificate As X509Certificate, chain As X509Chain, sslPolicyErrors As SslPolicyErrors) As Boolean
        Return True
    End Function

    ' --- Data Structures for Order API Response ---
    Public Class OrderListResponse
        Public Property data As List(Of Order)
    End Class

    Public Class Order
        Public Property id As String
        Public Property uid As String
        Public Property orderNumber As String
        Public Property order_id As String
        Public Property customerId As String
        Public Property customerName As String
        Public Property customerPhone As String
        Public Property areaName As String
        Public Property routeName As String
        Public Property salesman_id As String
        Public Property salesmanName As String
        Public Property distributor_id As String
        Public Property distributorId As String
        Public Property order_date As String
        Public Property createdAt As String
        Public Property updatedAt As String
        Public Property SysAcCode As Integer
        Public Property Qty As Integer
        Public Property MRP As Double
        Public Property OQty As Integer
        Public Property ORate As Double
        Public Property GrossAmt As Double
        Public Property SSMCode As String
        Public Property [date] As String
        Public Property modified_date As String
        Public Property companyId As String
        Public Property userId As String
        Public Property appId As String
        Public Property items As List(Of OrderItem)
        Public Property CompName As String
        Public Property AcName As String
        Public Property type As String
        Public Property party As Party
        Public Property totalAmount As Double
        Public Property paidAmount As Double
        Public Property dueAmount As Double
        Public Property grand_total As Double
        Public Property order_total As Double
        Public Property status As String
        Public Property orderType As String
        Public Property paymentMode As String
        Public Property payment_method As String
        Public Property payment_status As String
        Public Property scheduledDate As String
        Public Property notes As String
        Public Property internalNotes As String
        Public Property created_by_type As String
    End Class

    Public Class OrderItem
        Public Property productId As String
        Public Property productName As String
        Public Property sku As String
        Public Property oqty As Double
        Public Property freeQty As Double
        Public Property qty As Integer
        Public Property quantity As Integer
        Public Property Unit As String
        Public Property orate As Double
        Public Property rate As Double
        Public Property price As Double
        Public Property SysProdCode As Integer
        Public Property product As Product
        Public Property mrp As Double
        Public Property grossAmt As Double
        Public Property schPer As Double
        Public Property schAmt As Double
        Public Property netAmt As Double
        Public Property amount As Double
        Public Property product_id As String
    End Class

    Public Class Product
        Public Property id As String
        Public Property SysProdCode As Integer
        Public Property MRP As Double
        Public Property companyId As String
        Public Property userId As String
        Public Property SRate As Double
        Public Property PRate As Double
        Public Property Qty As Integer
        Public Property BoxPack As Integer
        Public Property InBoxPack As Integer
        Public Property BoxName As String
        Public Property InBoxName As String
        Public Property BasicUnit As String
        Public Property ProdCode As String
        Public Property ProdName As String
        Public Property CompName As String
        Public Property CatName As String
        Public Property GrpName As String
        Public Property BrName As String
        Public Property VatPer As Double
        Public Property appId As String
        Public Property name As String
        Public Property label As String
        Public Property value As Integer
        Public Property SysCompCode As Integer
    End Class

    Public Class Party
        Public Property SysAcCode As String
        Public Property AcCode As String
        Public Property AcName As String
        Public Property AreaName As String
        Public Property Add1 As String
        Public Property Add2 As String
        Public Property MobileNo As String
        Public Property SysCompCode As String
        Public Property SSMCOde As String
        Public Property CompName As String
        Public Property AreaCode As String
        Public Property NetBal As String
    End Class

    Public Class Cart
        Public Property billedamount As Decimal
        Public Property itemamount As Decimal
        Public Property itemcount As Integer
        Public Property totaldisc As Decimal
        Public Property totalmrp As Decimal
        Public Property items As List(Of Item)
    End Class

    Public Class Item
        Public Property actquantity As Decimal
        Public Property billedamount As Decimal
        Public Property billedquantity As Decimal
        Public Property disc As Decimal
        Public Property discper As Decimal
        Public Property itemamount As Decimal
        Public Property itemmrp As Decimal
        Public Property mrp As Decimal
        Public Property productid As Decimal
        Public Property productcode As String
        Public Property productname As String
        Public Property rate As Decimal
        Public Property uom As String
    End Class

    ' --- Data Structures for Payment API Response ---
    Public Class Payment
        Public Property _id As String
        Public Property collection_id As String
        Public Property collection_date As String
        Public Property distributor_id As String
        Public Property distributor_name As String
        Public Property customer_id As String
        Public Property customer_name As String
        Public Property load_no As Integer?
        Public Property load_series As String
        Public Property salesman_details As SalesmanDetails
        Public Property bill_details As BillDetails
        Public Property payment_mode As String
        Public Property payment_details As PaymentDetails
        Public Property amount_collected As Decimal
        Public Property remark As String
        Public Property status As String
        Public Property created_at As String
        Public Property updated_at As String
        Public Property cheque_number As String
        Public Property bank_name As String
        Public Property cheque_date As String
        Public Property upi_type As String
        Public Property transaction_number As String
        Public Property reference_number As String
        Public Property photo_path As String
        Public Property collected_by As CollectedBy
        Public Property order_details As OrderDetails
    End Class

    Public Class SalesmanDetails
        Public Property id As String
        Public Property name As String
        Public Property time As String
    End Class

    Public Class BillDetails
        Public Property bill_series As String
        Public Property bill_no As Integer
        Public Property sys_ac_code As String
        Public Property customer_name As String
        Public Property bill_amount As Decimal
        Public Property old_balance As Decimal
        Public Property amount_collected As Decimal
        Public Property balance_after_payment As Decimal
    End Class

    Public Class PaymentDetails
        Public Property cash_amount As Decimal
        Public Property cheque_amount As Decimal
        Public Property cheque_number As String
        Public Property cheque_date As String
        Public Property bank_name As String
        Public Property upi_app As String
        Public Property transaction_number As String
        Public Property reference_number As String
        Public Property photo_path As String
        Public Property mode As String
    End Class

    Public Class CollectedBy
        Public Property type As String
        Public Property id As String
        Public Property name As String
        Public Property time As String
    End Class

    Public Class OrderDetails
        Public Property order_id As String
        Public Property order_amount As Decimal
        Public Property previous_paid As Decimal
        Public Property previous_due As Decimal
        Public Property status As String
        Public Property created_at As String
        Public Property updated_at As String
    End Class

    Private Sub BtnGo_Click(sender As Object, e As EventArgs) Handles BtnGo.Click
    End Sub

    ' =====================================================
    ' MODIFIED: DownloadCollectionsToGrid - Fetches data
    ' =====================================================
    Private Async Function DownloadCollectionsToGrid() As Task(Of Boolean)
        Try
            TxtMsg.Text = "Downloading Collection Data from MongoDB..."
            Application.DoEvents()

            If String.IsNullOrEmpty(DistributorId) Then
                MsgBox("Distributor ID not found. Please check Mas_Firm table.")
                Return False
            End If

            Using client As New HttpClient()
                Dim url As String = $"{BaseApiUrl}/payments/distributor/{DistributorId}"
                TxtMsg.Text = "Fetching collections from: " & url
                Application.DoEvents()

                Dim response As HttpResponseMessage = Await client.GetAsync(url)

                If response.IsSuccessStatusCode Then
                    Dim jsonString As String = Await response.Content.ReadAsStringAsync()

                    TxtMsg.Text = "Response received. Length: " & jsonString.Length & " characters"
                    Application.DoEvents()

                    Dim payments As List(Of Payment) = Nothing

                    Try
                        payments = JsonConvert.DeserializeObject(Of List(Of Payment))(jsonString)
                        TxtMsg.Text = "Successfully parsed " & payments.Count & " payment records."
                        Application.DoEvents()
                    Catch ex As Exception
                        TxtMsg.Text = "Error parsing collections: " & ex.Message
                        Application.DoEvents()

                        Try
                            Dim obj = JsonConvert.DeserializeObject(Of Dictionary(Of String, Object))(jsonString)
                            If obj IsNot Nothing Then
                                If obj.ContainsKey("data") Then
                                    Dim dataJson = JsonConvert.SerializeObject(obj("data"))
                                    payments = JsonConvert.DeserializeObject(Of List(Of Payment))(dataJson)
                                    TxtMsg.Text = "Found data property with " & payments.Count & " records."
                                    Application.DoEvents()
                                End If
                            End If
                        Catch ex2 As Exception
                            TxtMsg.Text = "Also failed to parse as object: " & ex2.Message
                            Application.DoEvents()
                        End Try

                        If payments Is Nothing Then
                            Return False
                        End If
                    End Try

                    If payments Is Nothing OrElse payments.Count = 0 Then
                        TxtMsg.Text = "No collection records found for distributor: " & DistributorId
                        Application.DoEvents()
                        Return False
                    End If

                    ' Only completed collections without an existing receipt are eligible.
                    Dim completedPayments As List(Of Payment) = payments.Where(Function(p) p IsNot Nothing AndAlso
                        String.Equals(p.status, "completed", StringComparison.OrdinalIgnoreCase) AndAlso
                        CollectionKey(p).Length > 0).ToList()
                    Dim existing As HashSet(Of String) = GetExistingCollectionIds(completedPayments)
                    downloadedPayments = completedPayments.Where(Function(p) Not existing.Contains(CollectionKey(p))).
                        GroupBy(Function(p) CollectionKey(p), StringComparer.OrdinalIgnoreCase).
                        Select(Function(group) group.First()).ToList()
                    receiptSeriesText.Clear()
                    receiptLoadText.Clear()
                    receiptInvoiceSearch.Clear()
                    receiptLoadInvoices = Nothing
                    RefreshReceiptGrid()
                    TxtMsg.Text = $"{downloadedPayments.Count} new collections ready; {existing.Count} already converted."
                    Application.DoEvents()

                    Return True

                Else
                    Dim errorContent As String = Await response.Content.ReadAsStringAsync()
                    TxtMsg.Text = $"Failed to fetch collections: {response.StatusCode} - {errorContent}"
                    Application.DoEvents()
                    Return False
                End If
            End Using

        Catch ex As Exception
            MsgBox("Error downloading collections: " & ex.Message)
            TxtMsg.Text = "Error: " & ex.Message
            Return False
        End Try
    End Function

    ' =====================================================
    ' MODIFIED: Button5 Click - Shows grid only on success
    ' =====================================================
    Private Async Sub Button5_Click(sender As Object, e As EventArgs) Handles Button5.Click
        Try
            If String.IsNullOrEmpty(DistributorId) Then
                If Not LoadDistributorInfo() Then
                    MsgBox("Distributor ID not found. Please check Mas_Firm table.", MsgBoxStyle.Exclamation, "Error")
                    Exit Sub
                End If
            End If

            Button5.Enabled = False
            Button5.Text = "Loading..."

            ' Hide grid while loading
            HideGrid()

            Dim downloadResult As Boolean = Await DownloadCollectionsToGrid()

            If downloadResult Then
                ' Grid is shown inside LoadPaymentsToGrid
                If downloadedPayments.Count = 0 Then
                    MessageBox.Show("No new receipts are available. All completed collections have already been converted.",
                        "Information", MessageBoxButtons.OK, MessageBoxIcon.Information)
                    TxtMsg.Text = "No new receipts are available."
                Else
                    MessageBox.Show("New collections loaded. Select receipts and click 'Convert Receipt'.",
                        "Success", MessageBoxButtons.OK, MessageBoxIcon.Information)
                    TxtMsg.Text = $"{downloadedPayments.Count} new collections shown. Select receipts and click Convert Receipt."
                End If
            Else
                ' Ensure grid is hidden if download failed
                HideGrid()
                Dim failureMessage As String = TxtMsg.Text
                If String.IsNullOrWhiteSpace(failureMessage) Then failureMessage = "Could not load collections."
                MessageBox.Show(failureMessage, "Information", MessageBoxButtons.OK, MessageBoxIcon.Information)
            End If

        Catch ex As Exception
            HideGrid()
            MessageBox.Show("Error loading collections: " & ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error)
            TxtMsg.Text = "Error: " & ex.Message
        Finally
            Button5.Enabled = True
            Button5.Text = "Download Receipt"
        End Try
    End Sub

    ' --- Convert Selected Receipts ---
    Private Async Function ConvertSelectedReceipts() As Task(Of Boolean)
        Try
            DataGridView1.EndEdit()
            Dim selectedPayments As New List(Of Payment)

            ' Collect selected payments
            For Each row As DataGridViewRow In DataGridView1.Rows
                If row.Cells("Select").Value IsNot Nothing AndAlso Convert.ToBoolean(row.Cells("Select").Value) Then
                    Dim payment As Payment = TryCast(row.Cells("PaymentData").Value, Payment)
                    If payment IsNot Nothing Then
                        selectedPayments.Add(payment)
                    End If
                End If
            Next

            If selectedPayments.Count = 0 Then
                MsgBox("Please select at least one receipt to convert.", MsgBoxStyle.Exclamation, "No Selection")
                Return False
            End If

            ' Confirm conversion
            Dim confirmResult As DialogResult = MessageBox.Show(
                $"Are you sure you want to convert {selectedPayments.Count} selected receipt(s) to T_Rec_Header?",
                "Confirm Conversion",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            )

            If confirmResult <> DialogResult.Yes Then
                Return False
            End If

            TxtMsg.Text = $"Converting {selectedPayments.Count} selected receipts..."
            Application.DoEvents()

            Dim successCount As Integer = 0
            Dim errorCount As Integer = 0
            Dim errorMessages As New List(Of String)
            Dim convertedIds As New HashSet(Of String)(StringComparer.OrdinalIgnoreCase)

            For Each payment As Payment In selectedPayments
                Try
                    TxtMsg.Text = $"Processing: {payment.collection_id} - {payment.customer_name}"
                    Application.DoEvents()

                    ' Recheck because another conversion may have happened since download.
                    If GetExistingCollectionIds(New Payment() {payment}).Contains(CollectionKey(payment)) Then
                        errorMessages.Add($"Receipt {payment.collection_id} already exists. Skipping.")
                        convertedIds.Add(CollectionKey(payment))
                        errorCount += 1
                        Continue For
                    End If

                    ' Process the payment as a receipt
                    Dim success As Boolean = Await ProcessPaymentAsReceipt(payment)
                    If success Then
                        successCount += 1
                        convertedIds.Add(CollectionKey(payment))
                        TxtMsg.Text = $"✓ Converted: {payment.collection_id}"
                    Else
                        errorCount += 1
                        errorMessages.Add($"Failed to convert: {payment.collection_id}")
                        If GetExistingCollectionIds(New Payment() {payment}).Contains(CollectionKey(payment)) Then
                            convertedIds.Add(CollectionKey(payment))
                        End If
                        TxtMsg.Text = $"✗ Failed: {payment.collection_id}"
                    End If
                    Application.DoEvents()

                Catch ex As Exception
                    errorCount += 1
                    errorMessages.Add($"Error: {payment.collection_id} - {ex.Message}")
                    TxtMsg.Text = $"Error: {payment.collection_id} - {ex.Message}"
                    Application.DoEvents()
                End Try
            Next

            ' Show summary
            Dim summaryMsg As String = $"Conversion Complete!{vbCrLf}" &
                $"Successful: {successCount}{vbCrLf}" &
                $"Failed: {errorCount}"

            If errorMessages.Count > 0 Then
                summaryMsg &= vbCrLf & vbCrLf & "Errors:" & vbCrLf &
                    String.Join(vbCrLf, errorMessages.Take(10))
                If errorMessages.Count > 10 Then
                    summaryMsg &= vbCrLf & "... and " & (errorMessages.Count - 10) & " more errors."
                End If
            End If

            MessageBox.Show(summaryMsg, "Conversion Summary",
                MessageBoxButtons.OK,
                If(errorCount > 0, MessageBoxIcon.Warning, MessageBoxIcon.Information))

            ' Remove only successful conversions; failed entries remain for retry.
            downloadedPayments = downloadedPayments.Where(Function(p) Not convertedIds.Contains(CollectionKey(p))).ToList()
            RefreshReceiptGrid()

            Return successCount > 0

        Catch ex As Exception
            MsgBox("Error converting receipts: " & ex.Message)
            TxtMsg.Text = "Error: " & ex.Message
            Return False
        End Try
    End Function

    ' --- Convert Receipt Button Click ---
    Private Async Sub BtnConvertReceipt_Click(sender As Object, e As EventArgs) Handles BtnConvertReceipt.Click
        Try
            BtnConvertReceipt.Enabled = False
            BtnConvertReceipt.Text = "Converting..."

            Await ConvertSelectedReceipts()

        Catch ex As Exception
            MessageBox.Show("Error converting receipts: " & ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error)
        Finally
            BtnConvertReceipt.Enabled = True
            BtnConvertReceipt.Text = "Convert Receipt"
        End Try
    End Sub

    ' --- Process Payment As Receipt ---
    Private Async Function ProcessPaymentAsReceipt(payment As Payment) As Task(Of Boolean)
        Try
            TxtMsg.Text = $"Processing payment: {payment.collection_id} - Customer SysAcCode: {If(payment.bill_details IsNot Nothing, payment.bill_details.sys_ac_code, "N/A")}"
            Application.DoEvents()

            ' 1. DEBIT ACCOUNT = Customer account based on SysAcCode
            Dim tmpSysAcCodeDr As Integer = 0

            If payment.bill_details IsNot Nothing AndAlso Not String.IsNullOrEmpty(payment.bill_details.sys_ac_code) Then
                Dim sysAcCodeStr As String = payment.bill_details.sys_ac_code.Trim()

                If Integer.TryParse(sysAcCodeStr, tmpSysAcCodeDr) Then
                    TxtMsg.Text = $"Using customer SysAcCode from bill_details: {tmpSysAcCodeDr}"
                    Application.DoEvents()
                Else
                    Dim sqlCust As String = "SELECT TOP 1 SysAcCode FROM Mas_Account WHERE AcCode = '" &
                            sysAcCodeStr.Replace("'", "''") & "'"
                    Dim dsCust As DataSet = Ultimate.Mod_Connection.ReturnYeardata(sqlCust)

                    If dsCust IsNot Nothing AndAlso dsCust.Tables.Count > 0 AndAlso dsCust.Tables(0).Rows.Count > 0 Then
                        tmpSysAcCodeDr = Convert.ToInt32(dsCust.Tables(0).Rows(0)("SysAcCode"))
                        TxtMsg.Text = $"Found customer by AcCode: {tmpSysAcCodeDr}"
                        Application.DoEvents()
                    End If
                End If
            End If

            If tmpSysAcCodeDr = 0 AndAlso Not String.IsNullOrEmpty(payment.customer_id) Then
                Dim customerSysAcCode As String = payment.customer_id.Trim()

                Dim sqlCust As String =
        "SELECT TOP 1 SysAcCode, AcName " &
        "FROM Mas_Account " &
        "WHERE SysAcCode = " & customerSysAcCode

                Dim dsCust As DataSet = Ultimate.Mod_Connection.ReturnYeardata(sqlCust)

                If dsCust IsNot Nothing AndAlso
       dsCust.Tables.Count > 0 AndAlso
       dsCust.Tables(0).Rows.Count > 0 Then

                    tmpSysAcCodeDr = Convert.ToInt32(dsCust.Tables(0).Rows(0)("SysAcCode"))
                    Dim customerName As String = dsCust.Tables(0).Rows(0)("AcName").ToString()

                    TxtMsg.Text = "Debit Account (Customer): " &
                      customerName &
                      " | SysAcCode: " &
                      tmpSysAcCodeDr.ToString()

                    Application.DoEvents()
                Else
                    TxtMsg.Text = "Customer not found in Mas_Account for SysAcCode: " &
                      customerSysAcCode
                    Application.DoEvents()
                End If
            End If

            If tmpSysAcCodeDr = 0 AndAlso Not String.IsNullOrEmpty(payment.customer_name) Then
                Dim sqlCust As String = "SELECT TOP 1 SysAcCode FROM Mas_Account WHERE AcName = '" &
                        payment.customer_name.Replace("'", "''") & "'"
                Dim dsCust As DataSet = Ultimate.Mod_Connection.ReturnYeardata(sqlCust)

                If dsCust IsNot Nothing AndAlso dsCust.Tables.Count > 0 AndAlso dsCust.Tables(0).Rows.Count > 0 Then
                    tmpSysAcCodeDr = Convert.ToInt32(dsCust.Tables(0).Rows(0)("SysAcCode"))
                    TxtMsg.Text = $"Found customer by customer_name: {tmpSysAcCodeDr}"
                    Application.DoEvents()
                End If
            End If

            If tmpSysAcCodeDr = 0 Then
                TxtMsg.Text = $"ERROR: Customer not found for payment {payment.collection_id}"
                Application.DoEvents()
                Return False
            End If

            ' 2. CREDIT ACCOUNT = From General Setup 2 based on payment mode
            Dim tmpSysAcCodeCr As Integer = GetPiPayCreditAccount(payment.payment_mode)

            If tmpSysAcCodeCr = 0 Then
                TxtMsg.Text = "ERROR: Credit account not found in General Setup 2 for payment mode: " & payment.payment_mode
                Application.DoEvents()
                Return False
            End If

            ' 3. Get Salesman SSMCode
            Dim tmpSSMCode As String = ""
            Dim salesmanId As String = ""
            Dim salesmanName As String = ""

            If payment.salesman_details IsNot Nothing Then
                salesmanId = payment.salesman_details.id
                salesmanName = payment.salesman_details.name
            End If

            tmpSSMCode = GetActualSSMCodeFromDesktop(salesmanId, salesmanName, salesmanId)

            If String.IsNullOrEmpty(tmpSSMCode) Then
                tmpSSMCode = salesmanId
            End If

            ' 4. Get cheque/transaction details
            Dim tmpChqNo As String = "0"
            Dim tmpChqDate As String = ""
            Dim tmpBankCode As String = ""

            Dim paymentModeLower As String = If(String.IsNullOrEmpty(payment.payment_mode), "", payment.payment_mode.ToLower())

            Select Case paymentModeLower
                Case "cash"
                    tmpChqNo = "0"

                Case "cheque", "chq"
                    If payment.payment_details IsNot Nothing Then
                        tmpChqNo = If(String.IsNullOrEmpty(payment.payment_details.cheque_number),
                         If(String.IsNullOrEmpty(payment.cheque_number), "0", payment.cheque_number),
                         payment.payment_details.cheque_number)

                        tmpChqDate = If(String.IsNullOrEmpty(payment.payment_details.cheque_date),
                           If(String.IsNullOrEmpty(payment.cheque_date), "", payment.cheque_date),
                           payment.payment_details.cheque_date)

                        Dim mongoBankName As String = If(String.IsNullOrEmpty(payment.payment_details.bank_name),
    If(String.IsNullOrEmpty(payment.bank_name), "", payment.bank_name),
    payment.payment_details.bank_name)

                        tmpBankCode = GetBankCodeFromMasBank(mongoBankName)
                    Else
                        tmpChqNo = If(String.IsNullOrEmpty(payment.cheque_number), "0", payment.cheque_number)
                        tmpChqDate = If(String.IsNullOrEmpty(payment.cheque_date), "", payment.cheque_date)
                        tmpBankCode = If(String.IsNullOrEmpty(payment.bank_name), "", payment.bank_name)
                    End If

                Case "upi", "online"
                    If payment.payment_details IsNot Nothing Then
                        tmpChqNo = If(String.IsNullOrEmpty(payment.payment_details.transaction_number),
                         If(String.IsNullOrEmpty(payment.transaction_number), "0", payment.transaction_number),
                         payment.payment_details.transaction_number)
                    Else
                        tmpChqNo = If(String.IsNullOrEmpty(payment.transaction_number), "0", payment.transaction_number)
                    End If
                    tmpChqDate = DateTime.Now.ToString("dd/MM/yyyy")

                Case "neft", "rtgs", "imps", "bank"
                    If payment.payment_details IsNot Nothing Then
                        tmpChqNo = If(String.IsNullOrEmpty(payment.payment_details.transaction_number),
                         If(String.IsNullOrEmpty(payment.transaction_number),
                            If(String.IsNullOrEmpty(payment.reference_number), "0", payment.reference_number),
                            payment.transaction_number),
                         payment.payment_details.transaction_number)
                    Else
                        tmpChqNo = If(String.IsNullOrEmpty(payment.transaction_number),
                         If(String.IsNullOrEmpty(payment.reference_number), "0", payment.reference_number),
                         payment.transaction_number)
                    End If
                    tmpChqDate = DateTime.Now.ToString("dd/MM/yyyy")

                Case Else
                    tmpChqNo = "0"
            End Select

            ' 5. Get next Receipt number
            Dim newTrnNo As Integer = 0
            Dim sqlMax As String = "SELECT ISNULL(MAX(TrnNo), 0) + 1 FROM T_Rec_Header WHERE TrnSeries = 'TS'"
            Dim dsMax As DataSet = Ultimate.Mod_Connection.ReturnYeardata(sqlMax)

            If dsMax IsNot Nothing AndAlso dsMax.Tables.Count > 0 AndAlso dsMax.Tables(0).Rows.Count > 0 Then
                newTrnNo = Convert.ToInt32(dsMax.Tables(0).Rows(0)(0))
            End If

            TxtMsg.Text = $"Creating Receipt No. {newTrnNo} | Dr: {tmpSysAcCodeDr} (Customer) | Cr: {tmpSysAcCodeCr} (From Setup) | Amount: ₹{payment.amount_collected}"
            Application.DoEvents()

            ' 6. Insert Receipt
            Ultimate.Mod_DataBase.Conn = Ultimate.Mod_Connection.OpenYearConn()
            Ultimate.Mod_DataBase.Cmd = New SqlClient.SqlCommand("Add_Receipt", Ultimate.Mod_DataBase.Conn)
            Ultimate.Mod_DataBase.Cmd.CommandType = CommandType.StoredProcedure

            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@TrnSeries", SqlDbType.VarChar).Value = "TS"
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@TrnNo", SqlDbType.Int).Value = newTrnNo

            Dim receiptDate As DateTime = DateTime.Now
            If Not String.IsNullOrEmpty(payment.collection_date) Then
                Try
                    receiptDate = Convert.ToDateTime(payment.collection_date)
                Catch ex As Exception
                    receiptDate = DateTime.Now
                End Try
            End If

            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@TrnDate", SqlDbType.DateTime).Value = receiptDate

            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@SysAcCodeDr", SqlDbType.Int).Value = tmpSysAcCodeDr
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@SysAcCodeCr", SqlDbType.Int).Value = tmpSysAcCodeCr

            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@AmtDr", SqlDbType.Decimal).Value = payment.amount_collected
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@AmtCr", SqlDbType.Decimal).Value = payment.amount_collected
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@MicrCode", SqlDbType.VarChar).Value = CollectionKey(payment)
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@ChqNo", SqlDbType.VarChar).Value = tmpChqNo
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@ChqDate", SqlDbType.VarChar).Value = tmpChqDate
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@Bankcode", SqlDbType.VarChar).Value = tmpBankCode
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@SSMCode", SqlDbType.VarChar).Value = tmpSSMCode

            Dim narr As String = $"Collection from mobile app - {payment.payment_mode} - Ref: {payment.collection_id}"
            If Not String.IsNullOrEmpty(payment.remark) Then
                narr = payment.remark
            End If
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@Narr", SqlDbType.VarChar).Value = narr

            Dim loadNo As Integer = payment.load_no.GetValueOrDefault()
            Dim loadSeries As String = If(payment.load_series, "")
            If payment.bill_details IsNot Nothing AndAlso payment.bill_details.bill_no > 0 Then
                Dim sqlLoad As String = "SELECT TOP 1 LoadNo, LoadSeries FROM T_Sal_Header WHERE TrnNo = " & payment.bill_details.bill_no &
                        " AND TrnSeries = '" & If(payment.bill_details.bill_series, "").Replace("'", "''") & "'"
                Dim dsLoad As DataSet = Ultimate.Mod_Connection.ReturnYeardata(sqlLoad)

                If dsLoad IsNot Nothing AndAlso dsLoad.Tables.Count > 0 AndAlso dsLoad.Tables(0).Rows.Count > 0 Then
                    loadNo = Convert.ToInt32(dsLoad.Tables(0).Rows(0)("LoadNo"))
                    loadSeries = Convert.ToString(dsLoad.Tables(0).Rows(0)("LoadSeries"))
                End If
            End If

            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@LoadNo", SqlDbType.Int).Value = loadNo
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@RloadNo", SqlDbType.Int).Value = 0
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@TotADJAMT", SqlDbType.Decimal).Value = payment.amount_collected

            Dim balanceAfterPayment As Decimal = 0
            If payment.bill_details IsNot Nothing Then
                balanceAfterPayment = payment.bill_details.balance_after_payment
            End If

            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@TotBalAmt", SqlDbType.Decimal).Value = balanceAfterPayment
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@TotDiscAmt", SqlDbType.Decimal).Value = 0
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@PDCTrnSeries", SqlDbType.VarChar).Value = ""
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@PDCTrnNo", SqlDbType.Int).Value = 0
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@CLType", SqlDbType.VarChar).Value = ""
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@ClrDate", SqlDbType.VarChar).Value = tmpChqDate
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@RecFrom", SqlDbType.VarChar).Value = "Mobile App"

            Dim strTrn As String = "SAL"
            Dim StrTrnSeries As String = ""
            Dim StrTrnNo As String = "0" & Space(20)
            Dim StrTrnDate As String = receiptDate.ToString("yyyy-MM-dd") & Space(20)
            Dim strAmt As String = payment.amount_collected.ToString() & Space(20)
            Dim strAdjAmt As String = payment.amount_collected.ToString() & Space(20)
            Dim StrBalAmt As String = "0.00" & Space(20)
            Dim StrDisc As String = "0" & Space(20)
            Dim strOPB As String = "N" & Space(20)

            If payment.bill_details IsNot Nothing Then
                StrTrnSeries = payment.bill_details.bill_series & Space(20)
                StrTrnNo = payment.bill_details.bill_no.ToString() & Space(20)
                strAmt = payment.bill_details.bill_amount.ToString() & Space(20)
                StrBalAmt = payment.bill_details.balance_after_payment.ToString() & Space(20)
            End If

            Dim strMstTrn As String = "REC                 REC                                     "
            Dim strMstSrNo As String = "1                   2                   0                   "

            Dim strMstPrAcCode As String = tmpSysAcCodeCr.ToString() & Space(20) & tmpSysAcCodeDr.ToString() & Space(20) & "0" & Space(20)
            Dim strMstDorC As String = "C                   D                                       "

            Dim strMstAmt As String = payment.amount_collected.ToString() & Space(20) & payment.amount_collected.ToString() & Space(20) & "0" & Space(20)
            Dim StrMstAAmt As String = payment.amount_collected.ToString() & Space(20) & "0" & Space(20) & "0" & Space(20)
            Dim StrMstBAmt As String = "0" & Space(20) & payment.amount_collected.ToString() & Space(20) & "0" & Space(20)

            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@StrSeqNo", SqlDbType.VarChar).Value = "1"
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@StrAdjTrn", SqlDbType.VarChar).Value = strTrn
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@StrAdjSeries", SqlDbType.VarChar).Value = StrTrnSeries
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@StrAdjVNo", SqlDbType.VarChar).Value = StrTrnNo
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@StrAdjDate", SqlDbType.VarChar).Value = StrTrnDate
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@StrRemark", SqlDbType.VarChar).Value = narr
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@StrBillAmt", SqlDbType.VarChar).Value = strAmt
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@StrADJAMT", SqlDbType.VarChar).Value = strAdjAmt
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@StrBalAmt", SqlDbType.VarChar).Value = StrBalAmt
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@StrNowAdjAmt", SqlDbType.VarChar).Value = strAdjAmt
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@StrAdjDiscAmt", SqlDbType.VarChar).Value = StrDisc
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@StrSysAcCodeDisc", SqlDbType.VarChar).Value = "0" & Space(20)
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@StrOPB", SqlDbType.VarChar).Value = strOPB
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@AdjCnt", SqlDbType.Int).Value = 1

            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@strMasTrnTrn", SqlDbType.VarChar).Value = strMstTrn
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@strMasTrnDorC", SqlDbType.VarChar).Value = strMstDorC
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@strMasTrnPrAcCode", SqlDbType.VarChar).Value = strMstPrAcCode
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@strMasTrnAmt", SqlDbType.VarChar).Value = strMstAmt
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@strMasTrnAAmt", SqlDbType.VarChar).Value = StrMstAAmt
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@strMasTrnBAmt", SqlDbType.VarChar).Value = StrMstBAmt
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@strMasTrnSeqNo", SqlDbType.VarChar).Value = strMstSrNo
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@MasTrnCount", SqlDbType.Int).Value = 2
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("@LoadSeries", SqlDbType.VarChar).Value = loadSeries
            Ultimate.Mod_DataBase.Cmd.Parameters.Add("UserName", SqlDbType.VarChar).Value = Ultimate.Mod_GlobFunction.UseUserName

            ' Final duplicate guard on the same connection used for the insert.
            Using duplicateCommand As New SqlCommand("SELECT COUNT(*) FROM T_Rec_Header WHERE LTRIM(RTRIM(MicrCode)) = @CollectionId", Ultimate.Mod_DataBase.Conn)
                duplicateCommand.Parameters.Add("@CollectionId", SqlDbType.VarChar).Value = CollectionKey(payment)
                If Convert.ToInt32(duplicateCommand.ExecuteScalar()) > 0 Then
                    Ultimate.Mod_Connection.CloseYearConn(Ultimate.Mod_DataBase.Conn)
                    TxtMsg.Text = "Receipt " & CollectionKey(payment) & " already exists. Skipping."
                    Return False
                End If
            End Using
            Ultimate.Mod_DataBase.Cmd.ExecuteNonQuery()
            Ultimate.Mod_Connection.CloseYearConn(Ultimate.Mod_DataBase.Conn)

            TxtMsg.Text = $"✓ Receipt No. {newTrnNo} created | DEBIT(Dr): {tmpSysAcCodeDr} (Customer) | CREDIT(Cr): {tmpSysAcCodeCr} (From Setup) | Amount: ₹{payment.amount_collected}"
            Application.DoEvents()

            Return True

        Catch ex As Exception
            Try
                Ultimate.Mod_Connection.CloseYearConn(Ultimate.Mod_DataBase.Conn)
            Catch
            End Try

            TxtMsg.Text = $"ERROR processing payment {payment.collection_id}: {ex.Message}"
            If ex.InnerException IsNot Nothing Then
                TxtMsg.Text &= vbCrLf & "Inner Error: " & ex.InnerException.Message
            End If
            Application.DoEvents()
            Return False
        End Try
    End Function

    ' --- Get Credit Account from Setup Parameters ---
    Private Function GetPiPayCreditAccount(paymentMode As String) As Integer
        Try
            Dim mode As String = If(paymentMode, "").Trim().ToUpper()
            Dim paraName As String = "PI-CASH"

            If mode.Contains("CHEQUE") OrElse mode.Contains("CHQ") Then
                paraName = "PI-CHQ"
            ElseIf mode.Contains("UPI") OrElse mode.Contains("ONLINE") Then
                paraName = "PI-UPI"
            ElseIf mode.Contains("RTGS") OrElse mode.Contains("NEFT") OrElse mode.Contains("IMPS") OrElse mode.Contains("BANK") Then
                paraName = "PI-RTGS"
            ElseIf mode.Contains("CASH") Then
                paraName = "PI-CASH"
            End If

            Dim sql As String =
            "SELECT TOP 1 ParaValue FROM SetupParameters " &
            "WHERE UPPER(LTRIM(RTRIM(ParaName))) = '" & paraName & "'"

            Dim ds As DataSet = Ultimate.Mod_Connection.ReturnYeardata(sql)

            If ds IsNot Nothing AndAlso ds.Tables.Count > 0 AndAlso ds.Tables(0).Rows.Count > 0 Then
                Dim sysAcCode As String = ds.Tables(0).Rows(0)("ParaValue").ToString().Trim()

                If IsNumeric(sysAcCode) Then
                    Return Convert.ToInt32(sysAcCode)
                End If
            End If

            MsgBox("Credit account not found in General Setup 2 for " & paraName)
            Return 0

        Catch ex As Exception
            MsgBox("Error getting credit account from General Setup 2: " & ex.Message)
            Return 0
        End Try
    End Function

    ' --- Get Bank Code from Mas_Bank ---
    Private Function GetBankCodeFromMasBank(bankName As String) As String
        Try
            If String.IsNullOrWhiteSpace(bankName) Then Return ""

            Dim cleanBankName As String = bankName.Trim().Replace("'", "''")

            Dim sqlBank As String =
                "SELECT TOP 1 BankCode FROM Mas_Bank " &
                "WHERE UPPER(LTRIM(RTRIM(BankName))) = UPPER('" & cleanBankName & "') " &
                "OR UPPER(BankName) LIKE '%' + UPPER('" & cleanBankName & "') + '%'"

            Dim dsBank As DataSet = Ultimate.Mod_Connection.ReturnYeardata(sqlBank)

            If dsBank IsNot Nothing AndAlso
               dsBank.Tables.Count > 0 AndAlso
               dsBank.Tables(0).Rows.Count > 0 Then

                Return dsBank.Tables(0).Rows(0)("BankCode").ToString().Trim()
            End If

            TxtMsg.Text = "Bank not found in Mas_Bank: " & bankName
            Application.DoEvents()
            Return ""

        Catch ex As Exception
            TxtMsg.Text = "Error getting BankCode from Mas_Bank: " & ex.Message
            Application.DoEvents()
            Return ""
        End Try
    End Function

    ' --- Check Distributor ID ---
    Private Sub CheckDistributorId()
        TxtMsg.Text = "=== DISTRIBUTOR INFO ===" & vbCrLf
        TxtMsg.Text &= "DistributorId: '" & DistributorId & "'" & vbCrLf
        TxtMsg.Text &= "Length: " & DistributorId.Length & vbCrLf
        TxtMsg.Text &= "XApiKey: '" & XApiKey & "'"
        Application.DoEvents()
    End Sub

End Class
