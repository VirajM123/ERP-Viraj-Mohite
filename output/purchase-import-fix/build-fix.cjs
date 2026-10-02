const fs = require('node:fs');
const path = require('node:path');
const input = 'C:/Users/Total Solution/.codex/attachments/f7e37d68-295a-4634-9cee-b63f88abdecd/Pasted text.txt';
const original = fs.readFileSync(input, 'utf8');
let code = original.replace(/\r\n/g, '\n');
const changes = [];
function replaceOnce(before, after, description) {
  if (code.split(before).length !== 2) throw new Error('Expected one match: ' + description);
  code = code.replace(before, after);
  changes.push(description);
}
function replaceSection(begin, end, replacement, description) {
  const first = code.indexOf(begin);
  const last = code.indexOf(end, first);
  if (first < 0 || last < 0) throw new Error(description);
  replaceOnce(code.slice(first, last), replacement, description);
}

replaceOnce(
  'And k <> VsfgSelect.Cols.IndexOf("TrnNo") And k <> VsfgSelect.Cols.IndexOf("Import") Then',
  'And k <> VsfgSelect.Cols.IndexOf("TrnNo") And k <> VsfgSelect.Cols.IndexOf("Import") AndAlso Not (CmbEntry.SelectedIndex = 1 AndAlso k = VsfgSelect.Cols.IndexOf("TrnSeries")) Then',
  'Preserve a blank purchase series instead of replacing it with 0.');

const helpers = `    'Use the same integer identity for grouping, lookup and Add_Purchase.
    'Decimal Excel values such as 001 and 1.0 refer to the integer GRN 1.
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

    'Process each complete purchase group once, with or without an IMEI column.
`;
replaceSection("    '=====================================================================\n    ' DEDICATED PURCHASE GROUPING FOR IMEI PURCHASE FILES", '    Private Sub GetDataPurchaseIMEI()', helpers, 'Add normalized purchase grouping and a parameterized series + number lookup.');
replaceOnce('    Private Sub GetDataPurchaseIMEI()', '    Private Sub GetDataPurchase()', 'Use a purchase-specific grouping routine for all purchase imports.');
replaceOnce('        Dim PurchaseRow As Integer = 1\n\n        Try\n\n            While PurchaseRow', '        Dim PurchaseRow As Integer = 1\n\n        Try\n            PreparePurchaseGroups()\n\n            While PurchaseRow', 'Prepare complete groups before iterating purchases.');
replaceSection("        '=====================================================================\n        ' IMEI PURCHASE GROUPING FIX", '        start = 1\n        Dim SeqNo As Integer = 1', `        'Purchase grouping must not depend on the optional IMEI column.
        If CmbEntry.SelectedIndex = 1 Then
            GetDataPurchase()
            Exit Sub
        End If

`, 'Leave the generic loop for other transaction types only.');

replaceSection("        '=============================================================\n        ' SPECIAL SAFE HANDLING FOR PURCHASE FILES WITH IMEI", '            Dim TmpValidateRow As Integer = start', `        'Read the current purchase identity before processing any products.
        'Invalid headers must never fall through with the previous GRN values.
        If CmbEntry.SelectedIndex = 1 Then
            TmpSeries = ""
            TmpTrnNo = ""
            Try
                TmpSeries = Convert.ToString(VsfgSelect(start, VsfgSelect.Cols.IndexOf("TrnSeries"))).Trim()
                Dim PurchaseNumber As Integer
                If Not TryGetPurchaseTrnNo(VsfgSelect(start, VsfgSelect.Cols.IndexOf("TrnNo")), PurchaseNumber) Then
                    Throw New InvalidOperationException("Purchase number must be a positive whole number: " + Convert.ToString(VsfgSelect(start, VsfgSelect.Cols.IndexOf("TrnNo"))))
                End If
                TmpTrnNo = PurchaseNumber.ToString(System.Globalization.CultureInfo.InvariantCulture)
                TmpTrnDate = Microsoft.VisualBasic.Strings.Format(
                    Microsoft.VisualBasic.CompilerServices.Conversions.ToDate(
                        VsfgSelect(start, VsfgSelect.Cols.IndexOf("TrnDate"))
                    ),
                    "dd/MM/yyyy"
                )

                If VsfgSelect.Cols.IndexOf("InvNo") >= 0 Then
                    TmpInvoiceNo = VsfgSelect(start, VsfgSelect.Cols.IndexOf("InvNo")).ToString().Trim()
                End If

                If VsfgSelect.Cols.IndexOf("InvDate") >= 0 Then
                    TmpInvoiceDate = VsfgSelect(start, VsfgSelect.Cols.IndexOf("InvDate")).ToString().Trim()
                    If TmpInvoiceDate = "" OrElse TmpInvoiceDate = "0" Then
                        TmpInvoiceDate = TmpTrnDate
                    End If
                End If
            Catch ex As Exception
                MessageBox.Show("Purchase " + TmpSeries + " " + TmpTrnNo +
                                " was not imported: " + ex.Message,
                                Ultimate.Mod_GlobFunction.UseedFormName,
                                MessageBoxButtons.OK, MessageBoxIcon.Information)
                Exit Sub
            End Try

`, 'Validate each purchase header and product group without falling back to stale state.');

replaceSection("                '=================================================================\n                ' PURCHASE IMPORT - FINAL CURRENT-GRN REFRESH + CORRECT DUP CHECK", '                    Ultimate.Mod_DataBase.Conn = Ultimate.Mod_Connection.OpenYearConn()\n                    Ultimate.Mod_DataBase.Cmd = New SqlClient.SqlCommand("Add_Purchase"', `                'Reload only the current group identity. A failed read must not
                'continue with a previous purchase's series, number or company.
                Dim PurchaseNumber As Integer
                TmpSeries = Convert.ToString(VsfgSelect(start, VsfgSelect.Cols.IndexOf("TrnSeries"))).Trim()
                If Not TryGetPurchaseTrnNo(VsfgSelect(start, VsfgSelect.Cols.IndexOf("TrnNo")), PurchaseNumber) Then
                    Throw New InvalidOperationException("Invalid purchase number at import row " + start.ToString())
                End If
                TmpTrnNo = PurchaseNumber.ToString(System.Globalization.CultureInfo.InvariantCulture)
                TmpSysCompCode = CInt(VsfgSelect(start, VsfgSelect.Cols.IndexOf("SysCompCodeALL")))

                If PurchaseNumber > 0 Then
                    'The requested duplicate key is the same series AND number.
                    If PurchaseExists(TmpSeries, PurchaseNumber) Then
                        MessageBox.Show(
                            "Purchase No  " + TmpSeries + " " + TmpTrnNo + " already exists.",
                            Ultimate.Mod_GlobFunction.UseedFormName,
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Information
                        )
                        GoTo Label_0
                    End If
`, 'Replace the shared SQL/dataset duplicate check with an exact parameterized lookup.');

replaceOnce(`                    'For IMEI Purchase files only, mark the current GRN rows
                    'as imported after Add_Purchase has succeeded.
                    If d1.Columns.Contains("IMEI") Then
                        Dim TmpImportedRow As Integer = start
                        While TmpImportedRow <= k
                            Try
                                VsfgSelect(TmpImportedRow, VsfgSelect.Cols.IndexOf("Import")) = "I"
                            Catch
                            End Try
                            TmpImportedRow = TmpImportedRow + 1
                        End While
                    End If`, `                    'Mark the complete purchase group only after Add_Purchase succeeds.
                    Dim TmpImportedRow As Integer = start
                    While TmpImportedRow <= k
                        Try
                            VsfgSelect(TmpImportedRow, VsfgSelect.Cols.IndexOf("Import")) = "I"
                        Catch
                        End Try
                        TmpImportedRow = TmpImportedRow + 1
                    End While`, 'Mark successful purchase groups imported even without IMEI.');

// Verify the business logic and all other procedures are byte-for-byte unchanged
// apart from the deliberately listed purchase-import edits.
function methodMap(source) {
  return new Map([...source.matchAll(/^    (?:(?:Private|Public) )?(?:Sub|Function) (\w+)\([^]*?^    End (?:Sub|Function)/gm)].map(m => [m[1], m[0]]));
}
const before = methodMap(original.replace(/\r\n/g, '\n'));
const after = methodMap(code);
const allowed = new Set(['SetData', 'GetDataPurchaseIMEI', 'GetData', 'MakeStringPur', 'SaveBill']);
for (const [name, body] of before) {
  if (!allowed.has(name) && after.get(name) !== body) throw new Error('Unrelated method changed: ' + name);
}
const procStart = '                    Ultimate.Mod_DataBase.Cmd = New SqlClient.SqlCommand("Add_Purchase"';
function purchaseCall(s) {
  const start = s.indexOf(procStart);
  return s.slice(start, s.indexOf('                    Ultimate.Mod_Connection.CloseYearConn', start));
}
if (purchaseCall(code) !== purchaseCall(original.replace(/\r\n/g, '\n'))) throw new Error('Stored procedure call changed');
const output = code.replace(/\n/g, '\r\n');
fs.writeFileSync(path.join(__dirname, 'WinImportData.vb'), output);
fs.writeFileSync(path.join(__dirname, 'WinImportData.txt'), output);
fs.writeFileSync(path.join(__dirname, 'changes.json'), JSON.stringify(changes, null, 2));
console.log(JSON.stringify({ originalLines: original.split('\n').length, correctedLines: code.split('\n').length, bytes: Buffer.byteLength(output), changes, unrelatedMethodsVerified: [...before.keys()].filter(k => !allowed.has(k)).length }, null, 2));
