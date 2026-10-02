Imports System
Imports System.Collections
Imports System.ComponentModel
Imports System.Data
Imports System.Diagnostics
Imports System.Drawing
Imports System.Drawing.Font
Imports System.Runtime.CompilerServices
Imports System.Windows.Forms
Imports C1.Win.C1FlexGrid
Imports Microsoft.VisualBasic
Imports Microsoft.VisualBasic.CompilerServices
Imports System.Drawing.Printing
Imports Excel = Microsoft.Office.Interop.Excel
Public Class Import
    Private OmkarDbServerName As String
    Private CmdStr As String
    Public Cmd As System.Data.SqlClient.SqlCommand
    Public Conn As System.Data.SqlClient.SqlConnection
    Public Da As System.Data.SqlClient.SqlDataAdapter
    Private dsfrm As New System.Data.DataSet
    Private d1, d2 As New System.Data.DataTable
    Private Dt2 As New System.Data.DataTable

    Private j As Integer
    Private start As Integer
    Private end1 As Integer
    Private k As Integer
    Private BillType As String
    Private dt As New System.Data.DataTable
    Private i As Integer
    Private sqlstr As String

    Private StrFileName As String
    'Private ds As New System.Data.DataSet

    Private Sub BtnCancel_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles BtnCancel.Click
        Me.Close()
    End Sub

    Private Sub Import_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load

        Ultimate.Mod_GlobFunction.DbServerName = ReadFileUltimate()
        GetUltimateDataBase()

        CmbEntry.Items.Clear()
        CmbEntry.Items.Add("Sales")
        CmbEntry.Items.Add("Purchase")
        CmbEntry.Items.Add("CreditNote")
        'CmbEntry.Items.Add("Set To CreditNote")
        CmbEntry.SelectedIndex = 0
        CmbEntry.Focus()

        txtRateMargin.Text = 0

    End Sub

    Private Sub GetUltimateDataBase()
        Conn = New System.Data.SqlClient.SqlConnection("Data Source=" + Ultimate.Mod_GlobFunction.DbServerName + ";Initial Catalog=master;User ID=sa;Password=jay@321;Integrated Security=false")
        Da = New System.Data.SqlClient.SqlDataAdapter
        Dim dataSet1 As System.Data.DataSet = New System.Data.DataSet
        Dim dataTable1 As System.Data.DataTable = New System.Data.DataTable
        'CmdStr = "Select Name From Master.dbo.SysDatabases where Name like '%_1%'"
        CmdStr = "Select Name From Master.dbo.SysDatabases where Name like '%2%'"

        Cmd = New System.Data.SqlClient.SqlCommand(CmdStr, Conn)
        Da.SelectCommand = Cmd
        dataSet1.Clear()
        Da.Fill(dataSet1)
        Conn.Close()
        Dim flag1 As Boolean = (dataSet1.Tables.Count > 0) And (dataSet1.Tables(0).Rows.Count > 0)
        If flag1 Then
            dataTable1 = dataSet1.Tables(0)
            CmbOmkar.DataSource = dataTable1
            CmbOmkar.DisplayMember = "Name"
            CmbOmkar.ValueMember = "Name"
            If dataTable1.Rows.Count > 0 Then
                CmbOmkar.SelectedIndex = 0
            End If
        Else
            MessageBox.Show("TS DataBase Not Present")
        End If
    End Sub

    Public Shared Function ReadFileUltimate() As String
        Dim s1 As String = System.Windows.Forms.Application.StartupPath
        s1 = s1 + "\Total.ini"
        Dim fileStream1 As System.IO.FileStream = System.IO.File.Open(s1, System.IO.FileMode.Open)
        Dim streamReader1 As System.IO.StreamReader = New System.IO.StreamReader(fileStream1)
        Dim s3 As String = ""
        s3 = streamReader1.ReadLine()
        fileStream1.Close()
        streamReader1.Close()
        Return s3
    End Function

    Public Shared Function ReadFileOmkar() As String
        Dim s1 As String = System.Windows.Forms.Application.StartupPath
        s1 = s1 + "\Total1.ini"
        Dim fileStream1 As System.IO.FileStream = System.IO.File.Open(s1, System.IO.FileMode.Open)
        Dim streamReader1 As System.IO.StreamReader = New System.IO.StreamReader(fileStream1)
        Dim s3 As String = ""
        s3 = streamReader1.ReadLine()
        fileStream1.Close()
        streamReader1.Close()
        Return s3
    End Function


    '=====================================================================
    ' SAFE EXCEL VALUE HELPERS
    ' Purchase mapping uses Excel column names instead of fixed positions.
    '=====================================================================
    Private Function GetExcelValue(ByVal Row As System.Data.DataRow, ByVal ColumnName As String) As String
        Try
            If Row Is Nothing OrElse Row.Table Is Nothing Then Return ""
            If Not Row.Table.Columns.Contains(ColumnName) Then Return ""
            If IsDBNull(Row(ColumnName)) Then Return ""
            Return Row(ColumnName).ToString().Trim()
        Catch
            Return ""
        End Try
    End Function

    Private Function GetExcelNumber(ByVal Row As System.Data.DataRow, ByVal ColumnName As String) As Double
        Dim TmpValue As String = GetExcelValue(Row, ColumnName)
        If TmpValue = "" Then Return 0
        Return Microsoft.VisualBasic.Conversion.Val(TmpValue)
    End Function

    Private Function GetExcelIMEI(ByVal Row As System.Data.DataRow) As String
        Try
            If Row Is Nothing OrElse Row.Table Is Nothing Then Return ""
            If Not Row.Table.Columns.Contains("IMEI") Then Return ""
            If IsDBNull(Row("IMEI")) Then Return ""

            Dim RawIMEI As Object = Row("IMEI")

            'IMEI is normally 15 digits. Keep it out of scientific notation.
            If IsNumeric(RawIMEI) Then
                Try
                    Return Convert.ToDecimal(RawIMEI).ToString("0")
                Catch
                    Return RawIMEI.ToString().Trim()
                End Try
            End If

            Return RawIMEI.ToString().Trim()
        Catch
            Return ""
        End Try
    End Function

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


    Private Sub BtnSave_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles BtnSave.Click
        Dim TotalStar As Double = 0
        Dim TotalCD As Double = 0
        Dim TmpDisplay As Double = 0
        Dim Nextline As String = "Y"
        Dim ds As New System.Data.DataSet

        Ultimate.Mod_GlobFunction.UseFirmCode = CmbOmkar.Text

        Dim connectionString As String
        connectionString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=" + TxtFilePath.Text + ";Extended Properties=""Excel 12.0 Xml;HDR=YES;IMEX=1;\"""
        Dim ExcelConnection As New System.Data.OleDb.OleDbConnection(connectionString)
        ExcelConnection.Open()

        Dim da As New System.Data.OleDb.OleDbDataAdapter("Select * from [Sheet2$]", ExcelConnection)
        da.Fill(ds)

        'If CmbEntry.SelectedIndex = 1 Then
        '    Dim da As New System.Data.OleDb.OleDbDataAdapter("Select * from [SA_PRI_INVOICE$]", ExcelConnection)
        '    da.Fill(ds)
        'ElseIf CmbEntry.SelectedIndex = 0 Then
        '    Dim da As New System.Data.OleDb.OleDbDataAdapter("Select * from [SA_INV_DETAILS$]", ExcelConnection)
        '    da.Fill(ds)
        'Else
        '    Dim da As New System.Data.OleDb.OleDbDataAdapter("Select * from [Sheet2$]", ExcelConnection)
        '    da.Fill(ds)
        'End If


        ExcelConnection.Close()
        d1.Clear()
        d1 = ds.Tables(0)
        If CmbEntry.SelectedIndex = 0 OrElse CmbEntry.SelectedIndex = 1 Then
            Try
                d1 = PrepareInvoiceSource(d1, CmbEntry.SelectedIndex = 1)
            Catch ex As Exception
                MessageBox.Show(ex.Message, "Invoice validation", MessageBoxButtons.OK, MessageBoxIcon.Error)
                Return
            End Try
        End If
        VsfgSelect.DataSource = d1
        Dim c1FlexGrid2 As C1.Win.C1FlexGrid.C1FlexGrid = VsfgSelect
        c1FlexGrid2.AllowSorting = CType(1, C1.Win.C1FlexGrid.AllowSortingEnum)
        c1FlexGrid2.AllowResizing = CType(1, C1.Win.C1FlexGrid.AllowResizingEnum)
        c1FlexGrid2.AutoSearch = CType(2, C1.Win.C1FlexGrid.AutoSearchEnum)
        c1FlexGrid2.AllowAddNew = False
        c1FlexGrid2.AllowEditing = False
        c1FlexGrid2.AutoResize = False
        c1FlexGrid2.AutoSize = False
        c1FlexGrid2.ExtendLastCol = False

        If CmbEntry.SelectedIndex = 1 Then 'Purchase

            Ultimate.Mod_DataBase.CmdStr = "SELECT TrnSeries,Cast(TrnNo as Varchar(20)) as TrnNo,TrnDate,Unit,Batch,MRP,Qty,Rate,SRate,PRate,FrQty,'' FrBatch,''FrMrp,BVDisc1,VATAmt,Taxable,"
            Ultimate.Mod_DataBase.CmdStr = Ultimate.Mod_DataBase.CmdStr + " '' ProdCode,'' ProdName,'' Amount,0 NetAmt,0.00 RndAmt,''InvNo,Cast(Null as datetime) as InvDate,''CompAcCode,''CompAcName,''CompCode,0.00 TCSAMT,'' IMEI "
            Ultimate.Mod_DataBase.CmdStr = Ultimate.Mod_DataBase.CmdStr + " FROM T_PUR_Details where TrnNo='' and TrnSeries=''"

        ElseIf CmbEntry.SelectedIndex = 0 Then 'Sales

            Ultimate.Mod_DataBase.CmdStr = " SELECT Cast(TrnNo as Varchar(20)) as TrnNo,TrnDate,Unit,Batch,MRP,Qty,Rate,LoadQty,FrQty"
            Ultimate.Mod_DataBase.CmdStr = Ultimate.Mod_DataBase.CmdStr + " ,FrBatch,FrMrp,TPRAmt,SchAmt,CDAmt,VATAmt,LoadNo,RLoadNo"
            Ultimate.Mod_DataBase.CmdStr = Ultimate.Mod_DataBase.CmdStr + " ,StarProdLevel,CDProdLevel,BtmProdLevel,ADDOthProdLevel,LessOthProdLevel,taxable,''CashHeaderPer,''StarHeaderPer"
            Ultimate.Mod_DataBase.CmdStr = Ultimate.Mod_DataBase.CmdStr + " ,'' CompAcCode,''CompAcName,''CompCode,'' ProdCode,'' ProdName,'' Amount,'' NetAmt,'' RndAmt,''StarHeaderAmt,''CashHeaderAmt,''DisplayAmt,''AddLess,''Narr,''TrnSeries,0.00 CouponAmt,0.00 SchPer,0.00 CDPer,'' IMEI"
            Ultimate.Mod_DataBase.CmdStr = Ultimate.Mod_DataBase.CmdStr + " FROM T_Sal_Details where TrnNo='' and TrnSeries=''"

        ElseIf CmbEntry.SelectedIndex = 2 Then 'Credit Note
            Ultimate.Mod_DataBase.CmdStr = "SELECT Trn,TrnSeries,Cast(TrnNo as Varchar(20)) as TrnNo,TrnDate,''ProdCode,''ProdName,Batch,MRP,Unit"
            Ultimate.Mod_DataBase.CmdStr = Ultimate.Mod_DataBase.CmdStr + " ,Qty,FrQty,Rate,PRate,SRate,''CompAcCode,''CompAcName,SchPer,SchDisc as SchAmt,CDPer,CDAmt"
            Ultimate.Mod_DataBase.CmdStr = Ultimate.Mod_DataBase.CmdStr + " ,AVDisc1,AVDisc2,VatAmt,''Amount,''NetAmt,''BillNo,''BillDate,''Narr,''CompCode,TPRAmt"
            Ultimate.Mod_DataBase.CmdStr = Ultimate.Mod_DataBase.CmdStr + "  FROM T_CRN_Details where TrnNo='' and TrnSeries=''"

        ElseIf CmbEntry.SelectedIndex = 3 Then
            Ultimate.Mod_DataBase.CmdStr = "select ''TrnNo,''TrnSeries,''BillNo,''BillSeries,''IsExternalCRN from T_Crn_Header where TrnNo='' and TrnSeries='' "
        End If

        dsfrm = Ultimate.Mod_Connection.ReturnYeardata(Ultimate.Mod_DataBase.CmdStr)
        dt = dsfrm.Tables(0)
        If CmbEntry.SelectedIndex = 0 OrElse CmbEntry.SelectedIndex = 1 Then
            'Use numeric columns: the SQL template used integer NetAmt for purchases.
            For Each name As String In New String() {"Amount", "NetAmt", "RndAmt", "Rate", "PRate", "TCSAMT", "BVDisc2"}
                If Not dt.Columns.Contains(name) Then dt.Columns.Add(name, GetType(Decimal))
                dt.Columns(name).DataType = GetType(Decimal)
            Next
            dt.Columns("TrnNo").DataType = GetType(Integer)
            dt.Columns.Add("ImportTotalsVersion", GetType(String))
            dt.Columns.Add("SourceInvoiceNo", GetType(String))
            dt.Columns.Add("InvoiceNetValueIncludingTCS", GetType(Decimal))
            dt.Columns.Add("InvoiceTCSAmount", GetType(Decimal))
            dt.Columns.Add("InvoiceRounding", GetType(Decimal))
            dt.Columns.Add("SourceTaxAmount", GetType(Decimal))
            dt.Columns.Add("SourceTaxableAmount", GetType(Decimal))
        End If
        VsfgSelect.DataSource = dt


        If d1.Rows.Count > 0 Then
            Dim i As Integer = 0
            Dim i1 As Integer = 0
            Dim MaxNo As Integer = 0

            If CmbEntry.SelectedIndex = 1 Then
                'Use the next available GRN transaction number.
                sqlstr = "Select isnull(max(TrnNo),0) from T_Pur_Header where TrnSeries='GRN'"
                dsfrm = Ultimate.Mod_Connection.ReturnYeardata(sqlstr)
                If dsfrm.Tables.Count > 0 AndAlso dsfrm.Tables(0).Rows.Count > 0 Then
                    MaxNo = CInt(Microsoft.VisualBasic.Conversion.Val(dsfrm.Tables(0).Rows(0)(0).ToString()))
                Else
                    MaxNo = 0
                End If

            ElseIf CmbEntry.SelectedIndex = 0 Then
                'Use the next available KDM Sales transaction number.
                'If no KDM sale exists yet, MaxNo remains 0 and first new sale becomes 1.
                sqlstr = "Select isnull(max(TrnNo),0) from T_Sal_Header where TrnSeries='KDM'"
                dsfrm = Ultimate.Mod_Connection.ReturnYeardata(sqlstr)
                If dsfrm.Tables.Count > 0 AndAlso dsfrm.Tables(0).Rows.Count > 0 Then
                    MaxNo = CInt(Microsoft.VisualBasic.Conversion.Val(dsfrm.Tables(0).Rows(0)(0).ToString()))
                Else
                    MaxNo = 0
                End If
            End If

            'Every source InvoiceNo is assigned one internal GRN TrnNo.
            Dim PurchaseInvoiceTrnNos As New Hashtable

            'Every source Sales InvoiceNo is assigned one internal KDM TrnNo.
            'All detail rows of the same InvoiceNo get the same TrnNo.
            Dim SalesInvoiceTrnNos As New Hashtable

            Dim TmpCount As Integer = 0
            Dim StartFrom As Integer = 0

            If CmbEntry.SelectedIndex = 0 Then
                TmpCount = d1.Rows.Count - 1 '3
                StartFrom = 0
            ElseIf CmbEntry.SelectedIndex = 2 Or CmbEntry.SelectedIndex = 3 Then
                TmpCount = d1.Rows.Count - 1 ' 4
                StartFrom = 1
            ElseIf CmbEntry.SelectedIndex = 1 Then
                TmpCount = d1.Rows.Count - 1 '3
                StartFrom = 0
            End If


            For i = StartFrom To TmpCount


                If CmbEntry.SelectedIndex = 1 Then '----Purchase

                    '=========================================================
                    ' PURCHASE MAPPING FOR Purchasekucchal.xlsx
                    '
                    ' Uses Excel HEADER NAMES instead of old fixed positions.
                    ' There is no hard-coded company filter/code dependency.
                    '=========================================================

                    Dim SourceInvoiceNo As String = GetExcelValue(d1.Rows(i), "InvoiceNo")
                    Dim SourceInvoiceDate As String = GetExcelValue(d1.Rows(i), "InvoiceDate")
                    Dim SourceProdCode As String = GetExcelValue(d1.Rows(i), "ProductCode")
                    Dim SourceProdName As String = GetExcelValue(d1.Rows(i), "MarketName")

                    'Skip only a genuinely blank source row.
                    If SourceInvoiceNo = "" AndAlso SourceProdCode = "" AndAlso SourceProdName = "" Then
                        GoTo N1
                    End If

                    'One ERP GRN transaction number per source InvoiceNo.
                    Dim TrnSeries As String = "GRN"
                    Dim TrnNo As Integer = 0
                    Dim InvoiceKey As String = CStr(d1.Rows(i)("__InvoiceKey"))

                    If InvoiceKey = "" Then
                        InvoiceKey = "__ROW_" + i.ToString()
                    End If

                    If PurchaseInvoiceTrnNos.ContainsKey(InvoiceKey) Then
                        TrnNo = CInt(PurchaseInvoiceTrnNos(InvoiceKey))
                    Else
                        MaxNo = MaxNo + 1
                        TrnNo = MaxNo
                        PurchaseInvoiceTrnNos.Add(InvoiceKey, TrnNo)
                    End If

                    i1 = i1 + 1
                    VsfgSelect.AddItem("")

                    Dim PurchaseQty As Decimal = MoneyValue(d1.Rows(i), "Quantity")
                    Dim BaseRateWithTax As Decimal = MoneyValue(d1.Rows(i), "BaseRateWithTax")
                    Dim TaxableAmount As Decimal = MoneyValue(d1.Rows(i), "TaxableAmount")
                    Dim DiscountAmount As Decimal = MoneyValue(d1.Rows(i), "Discount")
                    Dim TaxAmount As Decimal = MoneyValue(d1.Rows(i), "TaxAmount")
                    Dim PurchaseRate As Decimal = 0

                    If PurchaseQty <> 0 Then
                        PurchaseRate = CDec(d1.Rows(i)("__Gross")) / PurchaseQty
                    End If

                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TrnSeries")) = TrnSeries
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TrnNo")) = TrnNo
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TrnDate")) = d1.Rows(i)("__InvoiceDate")
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Unit")) = "PCS"
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Batch")) = "."

                    'Source has no separate MRP field.
                    'BaseRateWithTax is the closest source value for MRP/SRate.
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("MRP")) = BaseRateWithTax
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Qty")) = PurchaseQty
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Rate")) = PurchaseRate
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("SRate")) = BaseRateWithTax
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("PRate")) = PurchaseRate

                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("FrQty")) = 0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("FrBatch")) = "."
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("FrMRP")) = 0

                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("BVDisc1")) = d1.Rows(i)("__Scheme")
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("BVDisc2")) = d1.Rows(i)("__Cash")
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("VatAmt")) = TaxAmount
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Taxable")) = TaxableAmount

                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("ProdCode")) = SourceProdCode
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("ProdName")) = SourceProdName
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Amount")) = d1.Rows(i)("__Gross")
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("NetAmt")) = MoneyValue(d1.Rows(i), "NetValue")
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("RndAmt")) = 0.0

                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("InvNo")) = SourceInvoiceNo
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("InvDate")) = d1.Rows(i)("__InvoiceDate")

                    'Keep existing supplier selection from the screen.
                    If CmbSupplier.SelectedValue IsNot Nothing Then
                        VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CompAcCode")) = CmbSupplier.SelectedValue.ToString()
                    Else
                        VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CompAcCode")) = ""
                    End If
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CompAcName")) = CmbSupplier.Text

                    'The new source file has no required ERP company code.
                    'Do not force "JNJ" and do not reject rows because of company.
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CompCode")) = ""

                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TCSAMT")) = MoneyValue(d1.Rows(i), "TCSAmount")

                    'Carry IMEI in generated Purchase Excel so Product -> IMEI
                    'mapping is visible and remains available for later import.
                    Dim SourceIMEI As String = GetExcelIMEI(d1.Rows(i))
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("IMEI")) = SourceIMEI
                    SetInvoiceContract(i1, d1.Rows(i))

                    'IMPORTANT:
                    'Do NOT save T_SerialNo while generating the Excel.
                    'The IMEI stays in the generated Purchase file.
                    'WinImportData saves it only after Add_Purchase succeeds.

                ElseIf CmbEntry.SelectedIndex = 0 Then  '---Sales

                    '=========================================================
                    ' SALES MAPPING FOR Sales Order dump.xlsx
                    '
                    ' Uses Excel HEADER NAMES instead of old fixed positions.
                    ' Purchase / Credit Note logic is not changed.
                    '
                    ' Source mapping:
                    '   InvoiceNo       -> TrnSeries + TrnNo
                    '   InvoiceDate     -> TrnDate
                    '   BuyerCode       -> CompAcCode
                    '   BuyerName       -> CompAcName
                    '   ProductCode     -> ProdCode
                    '   MarketName      -> ProdName
                    '   Quantity        -> Qty
                    '   BaseRateWithTax -> MRP
                    '   TaxableAmount   -> Rate / Taxable / Amount
                    '   Discount        -> SchAmt
                    '   TaxAmount       -> VatAmt
                    '   NetValue        -> NetAmt
                    '   IMEI            -> IMEI
                    '=========================================================

                    Dim SourceTransactionType As String = GetExcelValue(d1.Rows(i), "TransactionType")
                    Dim SourceInvoiceNo As String = GetExcelValue(d1.Rows(i), "InvoiceNo")
                    Dim SourceInvoiceDate As String = GetExcelValue(d1.Rows(i), "InvoiceDate")
                    Dim SourceBuyerCode As String = GetExcelValue(d1.Rows(i), "BuyerCode")
                    Dim SourceBuyerName As String = GetExcelValue(d1.Rows(i), "BuyerName")
                    Dim SourceProdCode As String = GetExcelValue(d1.Rows(i), "ProductCode")
                    Dim SourceProdName As String = GetExcelValue(d1.Rows(i), "MarketName")

                    'Skip only a genuinely blank source row.
                    If SourceInvoiceNo = "" AndAlso SourceBuyerCode = "" AndAlso SourceProdCode = "" AndAlso SourceProdName = "" Then
                        GoTo N1
                    End If

                    'The supplied Samsung file contains SALES ORDER rows.
                    'If TransactionType is blank, do not reject the row so that
                    'the converter also remains compatible with files where the
                    'column is not populated.
                    If SourceTransactionType <> "" AndAlso SourceTransactionType.Trim().ToUpper() <> "SALES ORDER" Then
                        GoTo N1
                    End If

                    '=========================================================
                    ' KDM SALES TRANSACTION NUMBERING
                    '
                    ' TrnSeries is always KDM.
                    ' TrnNo does NOT come from source InvoiceNo.
                    '
                    ' Example:
                    '   Existing KDM Max TrnNo = 0  -> first invoice = 1
                    '   Existing KDM Max TrnNo = 25 -> first invoice = 26
                    '
                    ' All rows having the same source InvoiceNo receive the same
                    ' KDM TrnNo. A different source InvoiceNo gets the next number.
                    '=========================================================
                    Dim TrnSeries As String = "KDM"
                    Dim TrnNo As Integer = 0

                    Dim SalesInvoiceKey As String = CStr(d1.Rows(i)("__InvoiceKey"))

                    If SalesInvoiceKey = "" Then
                        SalesInvoiceKey = "__ROW_" + i.ToString()
                    End If

                    If SalesInvoiceTrnNos.ContainsKey(SalesInvoiceKey) Then
                        TrnNo = CInt(SalesInvoiceTrnNos(SalesInvoiceKey))
                    Else
                        MaxNo = MaxNo + 1
                        TrnNo = MaxNo
                        SalesInvoiceTrnNos.Add(SalesInvoiceKey, TrnNo)
                    End If

                    i1 = i1 + 1
                    VsfgSelect.AddItem("")

                    Dim SalesQty As Decimal = MoneyValue(d1.Rows(i), "Quantity")
                    Dim BaseRateWithTax As Decimal = MoneyValue(d1.Rows(i), "BaseRateWithTax")
                    Dim TaxableAmount As Decimal = MoneyValue(d1.Rows(i), "TaxableAmount")
                    Dim DiscountAmount As Decimal = MoneyValue(d1.Rows(i), "Discount")
                    Dim TaxAmount As Decimal = MoneyValue(d1.Rows(i), "TaxAmount")
                    Dim NetValue As Decimal = MoneyValue(d1.Rows(i), "NetValue")
                    Dim SalesRate As Decimal = 0
                    Dim SchemePer As Decimal = 0

                    'ERP Rate is kept before tax because VatAmt/TaxAmount is stored
                    'separately. This also follows the same calculation style used
                    'by the new Purchase mapping.
                    If SalesQty <> 0 Then
                        SalesRate = CDec(d1.Rows(i)("__Gross")) / SalesQty
                    End If

                    If DiscountAmount > 0 AndAlso (TaxableAmount + DiscountAmount) <> 0 Then
                        SchemePer = MoneyRound(CDec(d1.Rows(i)("__Scheme")) * 100D / CDec(d1.Rows(i)("__Gross")))
                    End If

                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TrnNo")) = TrnNo.ToString()
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TrnDate")) = d1.Rows(i)("__InvoiceDate")
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Unit")) = "PCS"
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Batch")) = "."
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("MRP")) = BaseRateWithTax
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Qty")) = SalesQty
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Rate")) = SalesRate
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("LoadQty")) = 0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("FrQty")) = 0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("FrBatch")) = "."
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("FrMRP")) = 0

                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TPRAmt")) = 0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("SchAmt")) = d1.Rows(i)("__Scheme")
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CDAmt")) = d1.Rows(i)("__Cash")
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("VatAmt")) = TaxAmount
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("LoadNo")) = 0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("RLoadNo")) = 0

                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("StarProdLevel")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CDProdLevel")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("BtmProdLevel")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("ADDOthProdLevel")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("LessOthProdLevel")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Taxable")) = TaxableAmount

                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CashHeaderPer")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("StarHeaderPer")) = 0.0

                    'Customer comes directly from the Sales Order dump.
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CompAcCode")) = SourceBuyerCode
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CompAcName")) = SourceBuyerName

                    'Do not force the old JNJ company code.
                    'The Purchase conversion already follows the same principle.
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CompCode")) = ""

                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("ProdCode")) = SourceProdCode
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("ProdName")) = SourceProdName

                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Amount")) = d1.Rows(i)("__Gross")
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("NetAmt")) = NetValue
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("RndAmt")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("StarHeaderAmt")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CashHeaderAmt")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("DisplayAmt")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("AddLess")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Narr")) = ""
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TrnSeries")) = TrnSeries
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CouponAmt")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("SchPer")) = SchemePer
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CdPer")) = 0D
                    If TaxableAmount + CDec(d1.Rows(i)("__Cash")) <> 0D Then
                        VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CdPer")) = MoneyRound(CDec(d1.Rows(i)("__Cash")) * 100D / (TaxableAmount + CDec(d1.Rows(i)("__Cash"))))
                    End If

                    'Carry the serial/IMEI with the sales detail row.
                    'No T_SerialNo database update is done in this converter.
                    'That remains the responsibility of the actual Sales import/save.
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("IMEI")) = GetExcelIMEI(d1.Rows(i))
                    SetInvoiceContract(i1, d1.Rows(i))

                ElseIf CmbEntry.SelectedIndex = 2 Then  '---CreditNote

                    'If d1.Rows(i)(1).ToString() = "" Or d1.Rows(i)(1).ToString() = "Bill No" Then
                    '    GoTo N1
                    'End If

                    If d1.Rows(i)(12).ToString() <> "MGunSaleable" Then
                        GoTo N1
                    End If

                    'If d1.Rows(i)(14).ToString() < 0 Then
                    '    GoTo N1
                    'End If


                    'Dim i2 As Integer = 0
                    'Try
                    '    If d1.Rows(i - 1)(12).ToString = d1.Rows(i)(12).ToString Then
                    '        GoTo b
                    '    End If
                    'Catch ex As Exception

                    'End Try

                    'If Nextline = "Y" Then
                    '    For i2 = i To d1.Rows.Count - 1

                    '        If d1.Rows(i)(12).ToString = d1.Rows(i2)(12).ToString Then
                    '            TotalStar = TotalStar + d1.Rows(i2)("SplDiscAmount")
                    '            TotalCD = TotalCD + d1.Rows(i2)("CDAmount")
                    '            TmpDisplay = TmpDisplay + d1.Rows(i2)("TargetAmount")
                    '        Else
                    '            GoTo b
                    '        End If
                    '    Next
                    'End If
c:

                    i1 = i1 + 1
                    VsfgSelect.AddItem("")
                    Dim TrnSeries As String = ""
                    Dim TrnNo As Integer = 0
                    Dim BillDetails As String = d1.Rows(i)(2).ToString
                    ' If VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Bill No")) Like "BOS%" Then
                    Dim flag1 As Boolean = d1.Rows(i)(2).ToString Like "JR*"
                    If flag1 Then
                        TrnSeries = BillDetails.Substring(0, 2)
                        TrnNo = BillDetails.Substring(2, BillDetails.Length - 2)
                    Else
                        TrnSeries = BillDetails.Substring(0, 5)
                        TrnNo = BillDetails.Substring(5, BillDetails.Length - 5)
                    End If
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TRN")) = "DGR"
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TrnNo")) = TrnNo.ToString
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TrnDate")) = d1.Rows(i)(1).ToString()
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Unit")) = "PCS"
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Qty")) = d1.Rows(i)(13).ToString() '* d1.Rows(i)(33)) + d1.Rows(i)(36)
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Batch")) = "."
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("MRP")) = d1.Rows(i)(21).ToString()

                    'Dim Rate As Double = 0
                    'Rate = d1.Rows(i)(40)
                    'Rate = Rate + d1.Rows(i)(41)
                    'Rate = Microsoft.VisualBasic.Strings.Format(Rate / VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Qty")), "#0.000000")
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Rate")) = Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(14).ToString) / Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(13).ToString) 'd1.Rows(i)(14).ToString()
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("PRate")) = Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(14).ToString) / Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(13).ToString) 'd1.Rows(i)(14).ToString()
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("SRate")) = Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(14).ToString) / Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(13).ToString) 'd1.Rows(i)(14).ToString()
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("FrQty")) = 0 'd1.Rows(i)(28).ToString()
                    'VsfgSelect(i1, VsfgSelect.Cols.IndexOf("FrBatch")) = "."
                    'VsfgSelect(i1, VsfgSelect.Cols.IndexOf("FrMRP")) = 0 'VsfgSelect(i1, VsfgSelect.Cols.IndexOf("MRP"))
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TPRAmt")) = 0 'd1.Rows(i)(100).ToString
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("SchAmt")) = d1.Rows(i)(16).ToString
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CDAmt")) = d1.Rows(i)(17).ToString
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("VatAmt")) = 0 'd1.Rows(i)(29).ToString ' Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(81).ToString) + Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(85).ToString) + Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(88).ToString)
                    ' VsfgSelect(i1, VsfgSelect.Cols.IndexOf("LoadNo")) = 0
                    ' VsfgSelect(i1, VsfgSelect.Cols.IndexOf("RLoadNo")) = 0
                    'VsfgSelect(i1, VsfgSelect.Cols.IndexOf("StarProdLevel")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("AVDisc1")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("AVDisc2")) = 0.0
                    ' VsfgSelect(i1, VsfgSelect.Cols.IndexOf("ADDOthProdLevel")) = 0.0
                    ' VsfgSelect(i1, VsfgSelect.Cols.IndexOf("LessOthProdLevel")) = 0.0
                    'VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Taxable")) = 0.0 'd1.Rows(i)(15).ToString
                    'VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CashHeaderPer")) = 0.0
                    '(i1, VsfgSelect.Cols.IndexOf("StarHeaderPer")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CompAcCode")) = d1.Rows(i)(22).ToString
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CompAcName")) = d1.Rows(i)(7).ToString
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CompCode")) = "JNJ"
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("ProdCode")) = d1.Rows(i)(8).ToString
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("ProdName")) = d1.Rows(i)(9).ToString
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Amount")) = 0 'd1.Rows(i)(4).ToString 'd1.Rows(i)(21) * d1.Rows(i)(98) 'Microsoft.VisualBasic.Strings.Format(Microsoft.VisualBasic.Conversion.Val(VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Qty")).ToString) * Microsoft.VisualBasic.Conversion.Val(VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Selling with Scheme")).ToString), "#0.00")
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("NetAmt")) = 0 'd1.Rows(i)(10).ToString
                    'VsfgSelect(i1, VsfgSelect.Cols.IndexOf("RndAmt")) = 0.0
                    'VsfgSelect(i1, VsfgSelect.Cols.IndexOf("StarHeaderAmt")) = 0.0
                    ' VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CashHeaderAmt")) = 0.0
                    ' VsfgSelect(i1, VsfgSelect.Cols.IndexOf("DisplayAmt")) = 0.0 'd1.Rows(i)(8).ToString
                    'VsfgSelect(i1, VsfgSelect.Cols.IndexOf("AddLess")) = 0.0
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Narr")) = ""
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TrnSeries")) = TrnSeries.ToString
                    'VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CouponAmt")) = 0.0 'd1.Rows(i)(23).ToString
                    'VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Billtype")) = "C"
                    If d1.Rows(i)(16).ToString > 0 Then
                        VsfgSelect(i1, VsfgSelect.Cols.IndexOf("SchPer")) = Math.Round(Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(16).ToString) * 100 / Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(14).ToString), 2)
                        ' VsfgSelect(i1, VsfgSelect.Cols.IndexOf("SchPer")) = Microsoft.VisualBasic.Strings.Format(Microsoft.VisualBasic.Conversion.Val(VsfgSelect(i1, VsfgSelect.Cols.IndexOf(16)).ToString) * 100 / Microsoft.VisualBasic.Conversion.Val(VsfgSelect(i1, VsfgSelect.Cols.IndexOf(15)).ToString), "#0.00")
                    Else
                        VsfgSelect(i1, VsfgSelect.Cols.IndexOf("SchPer")) = 0
                    End If
                    If d1.Rows(i)(17).ToString > 0 Then
                        VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CdPer")) = Math.Round(Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(17).ToString) * 100 / Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(14).ToString), 2)
                    Else
                        VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CdPer")) = 0
                    End If
                    'for Devas
                    'VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CompCode")) = "SNK"
                    'If d1.Rows(i)(100).ToString() <= 0 Then
                    '    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TPRPer")) = 0
                    'Else
                    '    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TPRPer")) = Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(100).ToString) / Microsoft.VisualBasic.Conversion.Val(d1.Rows(i)(21).ToString) ' Microsoft.VisualBasic.Strings.Format(Microsoft.VisualBasic.Conversion.Val(VsfgSelect(i1, VsfgSelect.Cols.IndexOf(100)).ToString) / Microsoft.VisualBasic.Conversion.Val(VsfgSelect(i1, VsfgSelect.Cols.IndexOf(21)).ToString), "#0.00")
                    'End If
                    '--for Other client
                    ''--Code for Comp Code
                    'sqlstr = "Select c.Compcode from MaS_Product p,Mas_Company c"
                    'sqlstr = sqlstr + " Where p.SysCompCode=c.SysCompCode and p.ProdCode='" + d1.Rows(i)(27).ToString + "'"
                    'dsfrm = Ultimate.Mod_Connection.ReturnYeardata(sqlstr)
                    'If dsfrm.Tables(0).Rows.Count > 0 Then
                    '    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CompCode")) = dsfrm.Tables(0).Rows(0)("CompCode").ToString
                    'Else
                    '    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CompCode")) = ""
                    'End If
                    ''--Upto

                    'Try
                    '    If d1.Rows(i)("InvoiceNumber").ToString() <> d1.Rows(i + 1)("InvoiceNumber").ToString Then
                    '        TotalStar = 0
                    '        TotalCD = 0
                    '        TmpDisplay = 0
                    '        Nextline = "Y"
                    '    Else
                    '        Nextline = "N"
                    '    End If
                    'Catch ex As Exception

                    'End Try

                End If
N1:
            Next
        End If

        If CmbEntry.SelectedIndex = 1 Then
            VsfgSelect.SaveExcel("D:\SAM_PurchaseImport.xls", "Sheet2", C1.Win.C1FlexGrid.FileFlags.IncludeFixedCells)
        ElseIf CmbEntry.SelectedIndex = 0 Then
            VsfgSelect.SaveExcel("D:\SAM_SalesImport.xls", "Sheet2", C1.Win.C1FlexGrid.FileFlags.IncludeFixedCells)
        ElseIf CmbEntry.SelectedIndex = 2 Then
            VsfgSelect.SaveExcel("D:\SAM_CreditNoteImport.xls", "Sheet2", C1.Win.C1FlexGrid.FileFlags.IncludeFixedCells)
        ElseIf CmbEntry.SelectedIndex = 3 Then
            VsfgSelect.SaveExcel("D:\Pep_SetToCrnNote.xls", "Sheet2", C1.Win.C1FlexGrid.FileFlags.IncludeFixedCells)
        End If
        MessageBox.Show("Data Export Successfully")
    End Sub

    '=====================================================================
    ' PURCHASE IMEI / SERIAL NUMBER IMPORT
    '
    ' This method is deliberately kept separate from the existing Purchase,
    ' Sales and Credit Note generation logic.
    '
    ' Flow:
    '   1. Read IMEI from the raw Excel column named "IMEI".
    '   2. Read product name from "MarketName" when available.
    '      If MarketName does not exist, use the product name already generated
    '      by the existing Purchase mapping.
    '   3. Find Mas_Product.SysProdCode using the product name.
    '   4. Insert the IMEI into T_SerialNo for that SysProdCode.
    '   5. Existing IMEI + SysProdCode is not inserted again.
    '
    ' IMPORTANT:
    '   Any IMEI-specific error is written to Debug output and does not stop
    '   the existing Purchase Excel generation.
    '=====================================================================
    Private Sub InsertPurchaseIMEIIntoSerialNo(ByVal SourceRow As System.Data.DataRow,
                                                ByVal GeneratedProdCode As String,
                                                ByVal GeneratedProdName As String,
                                                ByVal PurchaseTrnNo As Integer,
                                                ByVal GeneratedTrnDate As String)

        Try
            If SourceRow Is Nothing Then Exit Sub

            Dim TmpIMEIRaw As String = GetExcelIMEI(SourceRow)
            If TmpIMEIRaw = "" Then Exit Sub

            '-------------------------------------------------------------
            ' Get ProductCode and ProductName from the same source row.
            ' ProductCode is the first/preferred key.
            '-------------------------------------------------------------
            Dim TmpProdCode As String = ""
            If GeneratedProdCode IsNot Nothing Then
                TmpProdCode = GeneratedProdCode.Trim()
            End If

            If SourceRow.Table.Columns.Contains("ProductCode") Then
                If Not IsDBNull(SourceRow("ProductCode")) Then
                    If SourceRow("ProductCode").ToString().Trim() <> "" Then
                        TmpProdCode = SourceRow("ProductCode").ToString().Trim()
                    End If
                End If
            End If

            Dim TmpProdName As String = ""
            If GeneratedProdName IsNot Nothing Then
                TmpProdName = GeneratedProdName.Trim()
            End If

            If SourceRow.Table.Columns.Contains("MarketName") Then
                If Not IsDBNull(SourceRow("MarketName")) Then
                    If SourceRow("MarketName").ToString().Trim() <> "" Then
                        TmpProdName = SourceRow("MarketName").ToString().Trim()
                    End If
                End If
            End If

            If TmpProdCode = "" AndAlso TmpProdName = "" Then
                Debug.WriteLine("IMEI NOT INSERTED - Product identification is blank. IMEI: " + TmpIMEIRaw)
                Exit Sub
            End If

            '-------------------------------------------------------------
            ' Purchase date
            '-------------------------------------------------------------
            Dim TmpPurchaseDate As Date = Date.Now
            Dim DateFound As Boolean = False

            If SourceRow.Table.Columns.Contains("InvoiceDate") Then
                If Not IsDBNull(SourceRow("InvoiceDate")) Then
                    If IsDate(SourceRow("InvoiceDate").ToString()) Then
                        TmpPurchaseDate = CDate(SourceRow("InvoiceDate").ToString())
                        DateFound = True
                    End If
                End If
            End If

            If Not DateFound Then
                If IsDate(GeneratedTrnDate) Then
                    TmpPurchaseDate = CDate(GeneratedTrnDate)
                End If
            End If

            Dim TmpDatabaseName As String = CmbOmkar.Text.Trim()
            If TmpDatabaseName = "" Then Exit Sub

            Dim SerialConnectionString As String
            SerialConnectionString = "Data Source=" + Ultimate.Mod_GlobFunction.DbServerName +
                                     ";Initial Catalog=" + TmpDatabaseName +
                                     ";User ID=sa;Password=jay@321;Integrated Security=false"

            Using SerialConn As New System.Data.SqlClient.SqlConnection(SerialConnectionString)
                SerialConn.Open()

                '---------------------------------------------------------
                ' Find SysProdCode:
                '   1) exact ProdCode match
                '   2) exact ProdName match as fallback
                '---------------------------------------------------------
                Dim TmpSysProdCode As Integer = 0

                Dim FindProductSql As String =
                    "SELECT TOP 1 SysProdCode " +
                    "FROM Mas_Product " +
                    "WHERE " +
                    "(@ProdCode<>'' AND LTRIM(RTRIM(ProdCode))=LTRIM(RTRIM(@ProdCode))) " +
                    "OR " +
                    "(@ProdName<>'' AND LTRIM(RTRIM(ProdName))=LTRIM(RTRIM(@ProdName))) " +
                    "ORDER BY CASE " +
                    "WHEN @ProdCode<>'' AND LTRIM(RTRIM(ProdCode))=LTRIM(RTRIM(@ProdCode)) THEN 0 " +
                    "ELSE 1 END"

                Using FindProductCmd As New System.Data.SqlClient.SqlCommand(FindProductSql, SerialConn)
                    FindProductCmd.Parameters.Add("@ProdCode", System.Data.SqlDbType.NVarChar, 500).Value = TmpProdCode
                    FindProductCmd.Parameters.Add("@ProdName", System.Data.SqlDbType.NVarChar, 500).Value = TmpProdName

                    Dim ProductResult As Object = FindProductCmd.ExecuteScalar()

                    If ProductResult Is Nothing OrElse ProductResult Is DBNull.Value Then
                        Debug.WriteLine("IMEI NOT INSERTED - Product not found. ProdCode: " +
                                        TmpProdCode + " | ProdName: " + TmpProdName +
                                        " | IMEI: " + TmpIMEIRaw)
                        Exit Sub
                    End If

                    TmpSysProdCode = Convert.ToInt32(ProductResult)
                End Using

                If TmpSysProdCode <= 0 Then Exit Sub

                '---------------------------------------------------------
                ' Supports:
                '   one IMEI per row
                '   multiple IMEIs in one cell separated by comma,
                '   semicolon, pipe or new line
                '---------------------------------------------------------
                Dim NormalizedIMEI As String = TmpIMEIRaw.Replace(vbCrLf, "|")
                NormalizedIMEI = NormalizedIMEI.Replace(vbCr, "|")
                NormalizedIMEI = NormalizedIMEI.Replace(vbLf, "|")
                NormalizedIMEI = NormalizedIMEI.Replace(",", "|")
                NormalizedIMEI = NormalizedIMEI.Replace(";", "|")

                Dim IMEIList() As String = NormalizedIMEI.Split("|"c)
                Dim StkInSeqNo As Integer = 0

                For Each OneIMEI As String In IMEIList

                    Dim TmpIMEI As String = OneIMEI.Trim()
                    If TmpIMEI = "" Then Continue For

                    StkInSeqNo = StkInSeqNo + 1

                    Dim InsertSerialSql As String =
                        "IF NOT EXISTS (" +
                        " SELECT 1 FROM T_SerialNo " +
                        " WHERE SysProdCode=@SysProdCode AND ProdSrNo=@ProdSrNo" +
                        ") " +
                        "BEGIN " +
                        " INSERT INTO T_SerialNo " +
                        " (SysProdCode,Batch,ProdSrNo,StkInTrn,StkInSeries," +
                        "  StkInTrnNo,StkInTrnDate,StkOutTrn,StkOutSeries," +
                        "  StkOutTrnNo,StkOutTrnDate,InStock,StkInSeqNo,StkOutSeqNo) " +
                        " VALUES " +
                        " (@SysProdCode,@Batch,@ProdSrNo,@StkInTrn,@StkInSeries," +
                        "  @StkInTrnNo,@StkInTrnDate,@StkOutTrn,@StkOutSeries," +
                        "  @StkOutTrnNo,@StkOutTrnDate,@InStock,@StkInSeqNo,@StkOutSeqNo) " +
                        "END"

                    Using InsertSerialCmd As New System.Data.SqlClient.SqlCommand(InsertSerialSql, SerialConn)
                        InsertSerialCmd.Parameters.Add("@SysProdCode", System.Data.SqlDbType.Int).Value = TmpSysProdCode
                        InsertSerialCmd.Parameters.Add("@Batch", System.Data.SqlDbType.NVarChar, 100).Value = "."
                        InsertSerialCmd.Parameters.Add("@ProdSrNo", System.Data.SqlDbType.NVarChar, 100).Value = TmpIMEI
                        InsertSerialCmd.Parameters.Add("@StkInTrn", System.Data.SqlDbType.NVarChar, 20).Value = "PUR"
                        InsertSerialCmd.Parameters.Add("@StkInSeries", System.Data.SqlDbType.NVarChar, 20).Value = "GRN"
                        InsertSerialCmd.Parameters.Add("@StkInTrnNo", System.Data.SqlDbType.Int).Value = PurchaseTrnNo
                        InsertSerialCmd.Parameters.Add("@StkInTrnDate", System.Data.SqlDbType.DateTime).Value = TmpPurchaseDate
                        InsertSerialCmd.Parameters.Add("@StkOutTrn", System.Data.SqlDbType.NVarChar, 20).Value = ""
                        InsertSerialCmd.Parameters.Add("@StkOutSeries", System.Data.SqlDbType.NVarChar, 20).Value = ""
                        InsertSerialCmd.Parameters.Add("@StkOutTrnNo", System.Data.SqlDbType.Int).Value = 0
                        InsertSerialCmd.Parameters.Add("@StkOutTrnDate", System.Data.SqlDbType.DateTime).Value = DBNull.Value
                        InsertSerialCmd.Parameters.Add("@InStock", System.Data.SqlDbType.NVarChar, 1).Value = "Y"
                        InsertSerialCmd.Parameters.Add("@StkInSeqNo", System.Data.SqlDbType.Int).Value = StkInSeqNo
                        InsertSerialCmd.Parameters.Add("@StkOutSeqNo", System.Data.SqlDbType.Int).Value = 0

                        InsertSerialCmd.ExecuteNonQuery()
                    End Using

                    Debug.WriteLine("IMEI SAVED - SysProdCode: " +
                                    TmpSysProdCode.ToString() +
                                    " | ProdCode: " + TmpProdCode +
                                    " | ProdName: " + TmpProdName +
                                    " | IMEI: " + TmpIMEI)
                Next

            End Using

        Catch ex As Exception
            Debug.WriteLine("PURCHASE IMEI INSERT ERROR: " + ex.Message)
        End Try

    End Sub

    Private Sub BtnSave1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles BtnSave1.Click
        OpenFileDialog1.ShowDialog()
    End Sub

    Private Sub OpenFileDialog1_FileOk(ByVal sender As Object, ByVal e As System.ComponentModel.CancelEventArgs) Handles OpenFileDialog1.FileOk
        StrFileName = OpenFileDialog1.FileName.ToString()
        TxtFilePath.Text = StrFileName
    End Sub

    Private Sub txtRateMargin_GotFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles txtRateMargin.GotFocus
        txtRateMargin.Focus()
        txtRateMargin.SelectAll()
    End Sub

    Private Sub txtRateMargin_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtRateMargin.KeyDown
        Dim flag1 As Boolean = e.KeyCode = Keys.Enter
        If flag1 Then
            SelectNextControl(ActiveControl, True, True, True, True)
        End If
    End Sub

    Private Sub txtRateMargin_KeyPress(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyPressEventArgs) Handles txtRateMargin.KeyPress
        Ultimate.Mod_GlobFunction.CheckDecimal(System.Runtime.CompilerServices.RuntimeHelpers.GetObjectValue(sender), e, 14, 2)
    End Sub

    Private Sub CmbEntry_GotFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles CmbEntry.GotFocus
        CmbEntry.SelectAll()
        CmbEntry.Focus()
        CmbEntry.DroppedDown = True
    End Sub

    Private Sub CmbEntry_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles CmbEntry.KeyDown
        Dim flag1 As Boolean = e.KeyCode = Keys.Enter
        If flag1 Then
            SelectNextControl(ActiveControl, True, True, True, True)
        End If
    End Sub

    Private Sub CmbOmkar_GotFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles CmbOmkar.GotFocus
        CmbOmkar.SelectAll()
        CmbOmkar.Focus()
        CmbOmkar.DroppedDown = True
    End Sub

    Private Sub CmbOmkar_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles CmbOmkar.KeyDown
        Dim Flag1 As Boolean = e.KeyCode = Keys.Enter
        If Flag1 Then
            SelectNextControl(ActiveControl, True, True, True, True)
        End If
    End Sub

    Private Sub CmbOmkar_LostFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles CmbOmkar.LostFocus

        Ultimate.Mod_GlobFunction.UseFirmCode = CmbOmkar.Text




        sqlstr = "Select AcCode,AcName From Mas_Account where AcGCode='L1L5L1'"
        dsfrm = Ultimate.Mod_Connection.ReturnYeardata(sqlstr)
        Dt2 = dsfrm.Tables(0)
        CmbSupplier.DataSource = Dt2
        CmbSupplier.DisplayMember = "AcName"
        CmbSupplier.ValueMember = "AcCode"
        If Dt2.Rows.Count > 0 Then
            CmbSupplier.SelectedIndex = 0
        End If

    End Sub

    Private Sub CmbSupplier_GotFocus(ByVal sender As Object, ByVal e As System.EventArgs) Handles CmbSupplier.GotFocus
        CmbSupplier.Focus()
        CmbSupplier.SelectAll()
        CmbSupplier.DroppedDown = True

    End Sub

    Private Sub CmbSupplier_KeyDown(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles CmbSupplier.KeyDown
        Dim flag1 As Boolean = e.KeyCode = Keys.Enter
        If flag1 Then
            SelectNextControl(ActiveControl, True, True, True, True)
        End If
    End Sub

    Private Sub CmbEntry_SelectedIndexChanged(ByVal sender As Object, ByVal e As System.EventArgs) Handles CmbEntry.SelectedIndexChanged

        If CmbEntry.SelectedIndex = 0 Then
            LblMargin.Visible = False
            txtRateMargin.Visible = False
            lblSupplier.Visible = False
            CmbSupplier.Visible = False

            lblfile.Top = lblEntry.Top + 35
            TxtFilePath.Top = CmbEntry.Top + 35
            BtnSave1.Top = TxtFilePath.Top
        Else
            'LblMargin.Visible = True
            'txtRateMargin.Visible = True


            If CmbEntry.SelectedIndex = 1 Then
                lblSupplier.Visible = True
                CmbSupplier.Visible = True

                lblfile.Top = lblSupplier.Top + 35
                TxtFilePath.Top = CmbSupplier.Top + 35
            Else
                lblSupplier.Visible = False
                CmbSupplier.Visible = False
                lblfile.Top = LblMargin.Top + 35
                TxtFilePath.Top = txtRateMargin.Top + 35


            End If
            BtnSave1.Top = TxtFilePath.Top
        End If
    End Sub

    Private Sub OpenFileDialog1_HelpRequest(ByVal sender As Object, ByVal e As System.EventArgs) Handles OpenFileDialog1.HelpRequest

    End Sub
End Class
