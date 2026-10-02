Imports System
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

    Private Function TryGetPurchaseTrnNo(ByVal Value As Object,
                                       ByRef PurchaseTrnNo As Integer) As Boolean
        PurchaseTrnNo = 0
        Dim NumberValue As Decimal
        Dim NumberText As String = Convert.ToString(Value, System.Globalization.CultureInfo.InvariantCulture).Trim()
        If Not Decimal.TryParse(NumberText,
                                System.Globalization.NumberStyles.AllowLeadingSign Or System.Globalization.NumberStyles.AllowDecimalPoint,
                                System.Globalization.CultureInfo.InvariantCulture,
                                NumberValue) Then Return False
        If NumberValue <= 0D OrElse NumberValue > Integer.MaxValue OrElse Decimal.Truncate(NumberValue) <> NumberValue Then Return False
        PurchaseTrnNo = Decimal.ToInt32(NumberValue)
        Return True
    End Function

    Private Sub PreparePurchaseGroups()
        If d1 Is Nothing OrElse Not d1.Columns.Contains("TrnSeries") OrElse Not d1.Columns.Contains("TrnNo") Then
            Throw New InvalidOperationException("Purchase import requires TrnSeries and TrnNo columns.")
        End If

        'Normalize the source rows before binding the sorted view. Do not edit
        'identity columns through sorted grid row indexes while they can move.
        For Each PurchaseDataRow As System.Data.DataRow In d1.Rows
            If PurchaseDataRow.RowState = System.Data.DataRowState.Deleted Then Continue For
            PurchaseDataRow("TrnSeries") = Convert.ToString(PurchaseDataRow("TrnSeries")).Trim()
            Dim PurchaseNumber As Integer
            If TryGetPurchaseTrnNo(PurchaseDataRow("TrnNo"), PurchaseNumber) Then
                PurchaseDataRow("TrnNo") = PurchaseNumber.ToString(System.Globalization.CultureInfo.InvariantCulture)
            End If
        Next

        'Sorting only TrnNo can interleave A/1, B/1, A/1. Keep ALL lines of
        'each series + number together before calculating or saving a purchase.
        Dim PurchaseView As New System.Data.DataView(d1)
        PurchaseView.Sort = "[TrnSeries] ASC, [TrnNo] ASC"
        VsfgSelect.DataSource = PurchaseView
    End Sub

    Private Function PurchaseExists(ByVal PurchaseSeries As String,
                                    ByVal PurchaseNumber As Integer) As Boolean
        Dim PurchaseConnection As SqlConnection = Ultimate.Mod_Connection.OpenYearConn()
        Try
            Using PurchaseCommand As New SqlCommand(
                "SELECT TOP (1) 1 FROM T_Pur_Header WHERE TrnNo = @TrnNo AND ISNULL(TrnSeries, '') = @TrnSeries",
                PurchaseConnection)
                PurchaseCommand.Parameters.Add("@TrnNo", SqlDbType.Int).Value = PurchaseNumber
                PurchaseCommand.Parameters.Add("@TrnSeries", SqlDbType.VarChar).Value = PurchaseSeries
                Dim ExistingPurchase As Object = PurchaseCommand.ExecuteScalar()
                Return ExistingPurchase IsNot Nothing AndAlso ExistingPurchase IsNot DBNull.Value
            End Using
        Finally
            Ultimate.Mod_Connection.CloseYearConn(PurchaseConnection)
        End Try
    End Function

    Private Sub GetDataPurchase()

        Dim PurchaseRow As Integer = 1

        Try
            PreparePurchaseGroups()

            While PurchaseRow < VsfgSelect.Rows.Count

                '-------------------------------------------------------------
                ' Skip completely blank/fixed rows safely.
                '-------------------------------------------------------------
                Dim CurrentSeries As String = ""
                Dim CurrentTrnNo As String = ""

                Try
                    CurrentSeries =
                        VsfgSelect(
                            PurchaseRow,
                            VsfgSelect.Cols.IndexOf("TrnSeries")
                        ).ToString().Trim()

                    CurrentTrnNo =
                        VsfgSelect(
                            PurchaseRow,
                            VsfgSelect.Cols.IndexOf("TrnNo")
                        ).ToString().Trim()
                Catch
                    PurchaseRow = PurchaseRow + 1
                    Continue While
                End Try

                If CurrentSeries = "" AndAlso CurrentTrnNo = "" Then
                    PurchaseRow = PurchaseRow + 1
                    Continue While
                End If

                '-------------------------------------------------------------
                ' If this row was already marked imported in the current
                ' session, move past it. This does NOT query/delete anything.
                '-------------------------------------------------------------
                Try
                    If VsfgSelect(PurchaseRow, VsfgSelect.Cols.IndexOf("Import")).ToString().Trim().ToUpper() = "I" Then
                        PurchaseRow = PurchaseRow + 1
                        Continue While
                    End If
                Catch
                    'If Import column is unavailable, continue normally.
                End Try

                '-------------------------------------------------------------
                ' Find the LAST row of this exact GRN.
                ' Group key = TrnSeries + TrnNo
                '-------------------------------------------------------------
                Dim GroupStart As Integer = PurchaseRow
                Dim GroupEnd As Integer = PurchaseRow
                Dim CheckRow As Integer = PurchaseRow + 1

                While CheckRow < VsfgSelect.Rows.Count

                    Dim NextSeries As String = ""
                    Dim NextTrnNo As String = ""

                    Try
                        NextSeries =
                            VsfgSelect(
                                CheckRow,
                                VsfgSelect.Cols.IndexOf("TrnSeries")
                            ).ToString().Trim()

                        NextTrnNo =
                            VsfgSelect(
                                CheckRow,
                                VsfgSelect.Cols.IndexOf("TrnNo")
                            ).ToString().Trim()
                    Catch
                        Exit While
                    End Try

                    If NextSeries = CurrentSeries AndAlso
                       NextTrnNo = CurrentTrnNo Then

                        GroupEnd = CheckRow
                        CheckRow = CheckRow + 1

                    Else
                        Exit While
                    End If

                End While

                '-------------------------------------------------------------
                ' Set the SAME global boundaries expected by the existing
                ' MakeStringPur(), SaveBill() and T_SerialNo logic.
                '-------------------------------------------------------------
                start = GroupStart
                k = GroupEnd
                start1 = GroupStart
                k1 = GroupEnd
                end1 = GroupEnd

                '-------------------------------------------------------------
                ' Rebuild SeqNo for this GRN from 1..N.
                ' The original purchase logic consumes this field.
                '-------------------------------------------------------------
                Dim SeqRow As Integer = GroupStart
                Dim PurchaseSeqNo As Integer = 1

                While SeqRow <= GroupEnd

                    Try
                        VsfgSelect(
                            SeqRow,
                            VsfgSelect.Cols.IndexOf("SeqNo")
                        ) = PurchaseSeqNo
                    Catch
                    End Try

                    PurchaseSeqNo = PurchaseSeqNo + 1
                    SeqRow = SeqRow + 1
                End While

                Debug.WriteLine(
                    "IMEI PURCHASE GROUP -> " +
                    CurrentSeries + " " + CurrentTrnNo +
                    " | Rows " + GroupStart.ToString() +
                    " To " + GroupEnd.ToString()
                )

                '-------------------------------------------------------------
                ' IMPORTANT:
                ' Existing purchase creation remains completely untouched.
                ' MakeStringPur() prepares strings/calculations and calls
                ' SaveBill(), which uses the existing Add_Purchase procedure.
                ' SavePurchaseIMEIIfPresent() still runs after Add_Purchase.
                '-------------------------------------------------------------
                MakeStringPur()

                '-------------------------------------------------------------
                ' ALWAYS advance to the first row AFTER this GRN.
                ' Even if this GRN already exists, SaveBill() returns to
                ' MakeStringPur(), and processing continues with the next GRN.
                '-------------------------------------------------------------
                PurchaseRow = GroupEnd + 1

            End While

        Catch ex As Exception

            'Unlike the old empty Catch, expose the real GRN if something
            'unexpected stops the Purchase import.
            Dim ErrorSeries As String = ""
            Dim ErrorTrnNo As String = ""

            Try
                If PurchaseRow > 0 AndAlso PurchaseRow < VsfgSelect.Rows.Count Then
                    ErrorSeries =
                        VsfgSelect(
                            PurchaseRow,
                            VsfgSelect.Cols.IndexOf("TrnSeries")
                        ).ToString().Trim()

                    ErrorTrnNo =
                        VsfgSelect(
                            PurchaseRow,
                            VsfgSelect.Cols.IndexOf("TrnNo")
                        ).ToString().Trim()
                End If
            Catch
            End Try

            MessageBox.Show(
                "Purchase import stopped at " +
                ErrorSeries + " " + ErrorTrnNo +
                "." + Environment.NewLine +
                ex.Message,
                Ultimate.Mod_GlobFunction.UseedFormName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Information
            )

            Debug.WriteLine(
                "IMEI PURCHASE GROUPING ERROR -> " +
                ErrorSeries + " " + ErrorTrnNo +
                " | " + ex.ToString()
            )

        End Try

    End Sub

    Private Sub GetDataPurchaseOriginal()

        Dim PurchaseRow As Integer = 1

        Try

            While PurchaseRow < VsfgSelect.Rows.Count

                '-------------------------------------------------------------
                ' Skip completely blank/fixed rows safely.
                '-------------------------------------------------------------
                Dim CurrentSeries As String = ""
                Dim CurrentTrnNo As String = ""

                Try
                    CurrentSeries =
                        VsfgSelect(
                            PurchaseRow,
                            VsfgSelect.Cols.IndexOf("TrnSeries")
                        ).ToString().Trim()

                    CurrentTrnNo =
                        VsfgSelect(
                            PurchaseRow,
                            VsfgSelect.Cols.IndexOf("TrnNo")
                        ).ToString().Trim()
                Catch
                    PurchaseRow = PurchaseRow + 1
                    Continue While
                End Try

                If CurrentSeries = "" AndAlso CurrentTrnNo = "" Then
                    PurchaseRow = PurchaseRow + 1
                    Continue While
                End If

                '-------------------------------------------------------------
                ' If this row was already marked imported in the current
                ' session, move past it. This does NOT query/delete anything.
                '-------------------------------------------------------------
                Try
                    If VsfgSelect(PurchaseRow, VsfgSelect.Cols.IndexOf("Import")).ToString().Trim().ToUpper() = "I" Then
                        PurchaseRow = PurchaseRow + 1
                        Continue While
                    End If
                Catch
                    'If Import column is unavailable, continue normally.
                End Try

                '-------------------------------------------------------------
                ' Find the LAST row of this exact GRN.
                ' Group key = TrnSeries + TrnNo
                '-------------------------------------------------------------
                Dim GroupStart As Integer = PurchaseRow
                Dim GroupEnd As Integer = PurchaseRow
                Dim CheckRow As Integer = PurchaseRow + 1

                While CheckRow < VsfgSelect.Rows.Count

                    Dim NextSeries As String = ""
                    Dim NextTrnNo As String = ""

                    Try
                        NextSeries =
                            VsfgSelect(
                                CheckRow,
                                VsfgSelect.Cols.IndexOf("TrnSeries")
                            ).ToString().Trim()

                        NextTrnNo =
                            VsfgSelect(
                                CheckRow,
                                VsfgSelect.Cols.IndexOf("TrnNo")
                            ).ToString().Trim()
                    Catch
                        Exit While
                    End Try

                    If NextSeries = CurrentSeries AndAlso
                       NextTrnNo = CurrentTrnNo Then

                        GroupEnd = CheckRow
                        CheckRow = CheckRow + 1

                    Else
                        Exit While
                    End If

                End While

                '-------------------------------------------------------------
                ' Set the SAME global boundaries expected by the existing
                ' MakeStringPur(), SaveBill() and T_SerialNo logic.
                '-------------------------------------------------------------
                start = GroupStart
                k = GroupEnd
                start1 = GroupStart
                k1 = GroupEnd
                end1 = GroupEnd

                '-------------------------------------------------------------
                ' Rebuild SeqNo for this GRN from 1..N.
                ' The original purchase logic consumes this field.
                '-------------------------------------------------------------
                Dim SeqRow As Integer = GroupStart
                Dim PurchaseSeqNo As Integer = 1

                While SeqRow <= GroupEnd

                    Try
                        VsfgSelect(
                            SeqRow,
                            VsfgSelect.Cols.IndexOf("SeqNo")
                        ) = PurchaseSeqNo
                    Catch
                    End Try

                    PurchaseSeqNo = PurchaseSeqNo + 1
                    SeqRow = SeqRow + 1
                End While

                Debug.WriteLine(
                    "IMEI PURCHASE GROUP -> " +
                    CurrentSeries + " " + CurrentTrnNo +
                    " | Rows " + GroupStart.ToString() +
                    " To " + GroupEnd.ToString()
                )

                '-------------------------------------------------------------
                ' IMPORTANT:
                ' Existing purchase creation remains completely untouched.
                ' MakeStringPur() prepares strings/calculations and calls
                ' SaveBill(), which uses the existing Add_Purchase procedure.
                ' SavePurchaseIMEIIfPresent() still runs after Add_Purchase.
                '-------------------------------------------------------------
                MakeStringPur()

                '-------------------------------------------------------------
                ' ALWAYS advance to the first row AFTER this GRN.
                ' Even if this GRN already exists, SaveBill() returns to
                ' MakeStringPur(), and processing continues with the next GRN.
                '-------------------------------------------------------------
                PurchaseRow = GroupEnd + 1

            End While

        Catch ex As Exception

            'Unlike the old empty Catch, expose the real GRN if something
            'unexpected stops the Purchase import.
            Dim ErrorSeries As String = ""
            Dim ErrorTrnNo As String = ""

            Try
                If PurchaseRow > 0 AndAlso PurchaseRow < VsfgSelect.Rows.Count Then
                    ErrorSeries =
                        VsfgSelect(
                            PurchaseRow,
                            VsfgSelect.Cols.IndexOf("TrnSeries")
                        ).ToString().Trim()

                    ErrorTrnNo =
                        VsfgSelect(
                            PurchaseRow,
                            VsfgSelect.Cols.IndexOf("TrnNo")
                        ).ToString().Trim()
                End If
            Catch
            End Try

            MessageBox.Show(
                "Purchase import stopped at " +
                ErrorSeries + " " + ErrorTrnNo +
                "." + Environment.NewLine +
                ex.Message,
                Ultimate.Mod_GlobFunction.UseedFormName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Information
            )

            Debug.WriteLine(
                "IMEI PURCHASE GROUPING ERROR -> " +
                ErrorSeries + " " + ErrorTrnNo +
                " | " + ex.ToString()
            )

        End Try

    End Sub

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
