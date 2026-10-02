const fs=require('fs'), path=require('path'), dir=__dirname;
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const original=read('C:/Users/Total Solution/.codex/attachments/93df7f39-3573-4519-8ed4-790edc2be467/Pasted text.txt');
let code=original;
function once(a,b){if(code.split(a).length!==2)throw Error('Match count '+a.slice(0,100));code=code.replace(a,b);}
function replaceRange(a,b,transform){const i=code.indexOf(a),j=code.indexOf(b,i);if(i<0||j<0)throw Error('Range '+a);const old=code.slice(i,j);once(old,transform(old));}
once('    Private Sub GetData()',read(path.join(dir,'ImportFlowHelpers.vb'))+'\n\n    Private Sub GetData()');
once('    Private Sub GetData()\n','    Private Sub GetData()\n        If UsesTrackedSalesImport() Then\n            GetDataSalesInvoices()\n            Return\n        End If\n');
once('        \'Reset only the dedicated IMEI Purchase import summary.',`        SaleSave = ""
        SalesImportSaved = 0 : SalesImportSkipped = 0 : SalesImportFailed = 0
        SalesImportCancelled = False
        SalesImportReport.Length = 0
        SalesImportReportPath = ""
        'Reset only the dedicated IMEI Purchase import summary.`);
// Report preparation errors too, before the group loops have started.
once('        BtnSave.Enabled = False\n        MakeStringImport()', '        BtnSave.Enabled = False\n        Try\n        MakeStringImport()');
once('        \'Catch ex As Exception\n        \'    MessageBox.Show(ex.Message)\n        \'End Try\nLabel_0:',`        Catch ex As Exception
            MessageBox.Show("Import preparation failed: " & ex.Message, "Import failed", MessageBoxButtons.OK, MessageBoxIcon.Error)
            BtnSave.Enabled = True
            Return
        Finally
            BtnSave.Enabled = True
        End Try
Label_0:`);
replaceRange('Label_0:\n        If CmbEntry.SelectedIndex = 1 AndAlso d1 IsNot Nothing AndAlso d1.Columns.Contains("IMEI") Then','    Private Sub CalNetAmt()',()=>`Label_0:
        If CmbEntry.SelectedIndex = 1 AndAlso d1 IsNot Nothing AndAlso d1.Columns.Contains("IMEI") Then
            ShowInvoiceImportSummary("Purchase import results", PurchaseIMEISavedCount, PurchaseIMEIDuplicateCount, PurchaseIMEIFailedCount, PurchaseIMEIReport.ToString(), PurchaseIMEIReportPath)
            If PurchaseIMEIFailedCount > 0 Then Return
        ElseIf UsesTrackedSalesImport() Then
            ShowInvoiceImportSummary("Sales import results", SalesImportSaved, SalesImportSkipped, SalesImportFailed, SalesImportReport.ToString(), SalesImportReportPath)
            If SalesImportFailed > 0 OrElse SalesImportCancelled Then Return
        ElseIf SaleSave = "Y" Then
            VsfgSelect.SaveExcel("D:\\Sales.xls", "Sheet2", C1.Win.C1FlexGrid.FileFlags.IncludeFixedCells Or C1.Win.C1FlexGrid.FileFlags.AsDisplayed)
            Microsoft.VisualBasic.Interaction.MsgBox("Record Saved Successfully.", Microsoft.VisualBasic.MsgBoxStyle.Information, Ultimate.Mod_GlobFunction.UseedFormName)
        End If
l1:
        Me.Close()
    End Sub

`);
// Database state, not an Excel I marker, determines whether a purchase exists.
replaceRange('                    If ImportedRows = GroupEnd - GroupStart + 1 Then','                        MakeStringPur()',()=>`                    If Not CheckPurchaseIMEIExisting() Then
                        'A previous grid marker cannot prove that a database save exists.
                        For row As Integer = GroupStart To GroupEnd
                            VsfgSelect(row, VsfgSelect.Cols.IndexOf("Import")) = ""
                        Next
`);
once('                    PurchaseIMEILastGroupStatus = "FAILED"\n                    PurchaseIMEILastGroupError = exGroup.Message','                    If PurchaseIMEILastGroupStatus <> "UNVERIFIED" Then PurchaseIMEILastGroupStatus = "FAILED"\n                    PurchaseIMEILastGroupError = exGroup.Message');
once('        If Existing.Rows.Count = 0 Then Return False',`        If Existing.Rows.Count = 0 Then
            'Regenerating a file can allocate a new GRN to an invoice already saved.
            Existing = FindPurchaseInvoiceIdentity()
            If Existing.Rows.Count = 0 Then Return False
        End If`);
once('        Return True\n    End Function\n\n    Private Sub GetDataPurchaseIMEI()',`        MessageBox.Show("Duplicate purchase: invoice " & Convert.ToString(Header("InvNo")) &
            " already exists as " & Convert.ToString(Header("TrnSeries")).Trim() & " " & Convert.ToString(Header("TrnNo")) &
            ". This purchase was skipped; other invoices will continue.", "Duplicate purchase", MessageBoxButtons.OK, MessageBoxIcon.Information)
        Return True
    End Function

    Private Sub GetDataPurchaseIMEI()`);
// Correctly distinguish failed verification from a normal duplicate.
replaceRange('                    Ultimate.Mod_DataBase.Cmd.ExecuteNonQuery()\n                    Ultimate.Mod_Connection.CloseYearConn(Ultimate.Mod_DataBase.Conn)\n\n                    If PurchaseIMEIActive Then','                    \'=========================================================\n                    \' OPTIONAL IMEI LOGIC',()=>`                    Try
                        Ultimate.Mod_DataBase.Cmd.ExecuteNonQuery()
                        If PurchaseIMEIActive Then VerifyPurchaseSave(Ultimate.Mod_DataBase.Conn)
                    Finally
                        Ultimate.Mod_Connection.CloseYearConn(Ultimate.Mod_DataBase.Conn)
                    End Try

`);
// All sales exceptions return to the per-invoice controller, which continues.
once('            If PurchaseIMEIActive Then\n                \'The group controller retains this GRN\'s error and continues.', '            If PurchaseIMEIActive OrElse SalesImportActive Then\n                \'The group controller retains this invoice error and continues.');
once('        \'If TmpAutoVoucher = "Y" Then', '        If SalesImportActive Then SetSalesImportResult("BLOCKED", "Bill did not reach a successful save. Review its customer, credit, stock or serial validation message.")\n        \'If TmpAutoVoucher = "Y" Then');
once('            SaveAcCode = dsfrm.Tables(0).Rows(0)("AcCode").ToString',`            If dsfrm.Tables.Count = 0 OrElse dsfrm.Tables(0).Rows.Count = 0 Then
                Throw New InvalidOperationException("Customer account not found: " & TmpSysAcCode.ToString())
            End If
            SaveAcCode = dsfrm.Tables(0).Rows(0)("AcCode").ToString`);
// Do not silently bypass override because the existing bill has settlements.
once('                    If dst12.Tables(0).Rows.Count > 0 Then\n                        GoTo Label_0',`                    If dst12.Tables(0).Rows.Count > 0 Then
                        SetSalesImportResult("SKIPPED", "Existing sales bill has receipt adjustments; override is blocked.")
                        MessageBox.Show("Sales bill " & TmpSeries & "/" & TmpTrnNo & " has receipt adjustments and cannot be overridden.", "Sales import", MessageBoxButtons.OK, MessageBoxIcon.Information)
                        GoTo Label_0`);
once('                        If dst12.Tables(0).Rows.Count > 0 Then\n                            GoTo Label_0',`                        If dst12.Tables(0).Rows.Count > 0 Then
                            SetSalesImportResult("SKIPPED", "Existing sales bill has transaction adjustments; override is blocked.")
                            MessageBox.Show("Sales bill " & TmpSeries & "/" & TmpTrnNo & " has transaction adjustments and cannot be overridden.", "Sales import", MessageBoxButtons.OK, MessageBoxIcon.Information)
                            GoTo Label_0`);
replaceRange('                        If tmpflag = 0 Then\n','                            \'Validate the incoming serials before deleting the old bill.',()=>`                        If tmpflag = 0 Then
                            Using overrideDialog As New msg_Override()
                                dr2 = overrideDialog.ShowDialog()
                            End Using
                            tmpflag = 1
                        End If
                        Dim confirmOne As Boolean = False
                        If dr2 = Windows.Forms.DialogResult.Cancel Then
                            confirmOne = MessageBox.Show("Bill " & TmpSeries & "/" & TmpTrnNo & " already exists. Override this bill?", "Sales", MessageBoxButtons.YesNo, MessageBoxIcon.Question, MessageBoxDefaultButton.Button2) = Windows.Forms.DialogResult.Yes
                        End If
                        Dim action As String = SalesOverrideDecision(dr2,
                            Decimal.Round(CDec(TmpNetAmt), 2) = Decimal.Round(Convert.ToDecimal(ds2.Tables(0).Rows(0)("NetAmt")), 2), confirmOne)
                        If action <> "OVERWRITE" Then
                            If action = "CANCELLED" Then
                                SalesImportCancelled = True
                                SetSalesImportResult("CANCELLED", "Override dialog was closed; import cancelled.")
                            Else
                                SetSalesImportResult("SKIPPED", "Existing bill: " & action)
                            End If
                            GoTo Label_0
                        End If
                        flag2 = True
                        If flag2 Then
`);
once('                            If Not ValidateSalesIMEIForCurrentBill() Then GoTo Label_0',`                            If Not ValidateSalesIMEIForCurrentBill() Then
                                SetSalesImportResult("FAILED", "Serial/IMEI validation failed; the existing bill was not deleted.")
                                GoTo Label_0
                            End If`);
once('                    If Not ValidateSalesIMEIForCurrentBill() Then\n                        GoTo Label_0',`                    If Not ValidateSalesIMEIForCurrentBill() Then
                        SetSalesImportResult("FAILED", "Serial/IMEI validation failed; see the product/serial message.")
                        GoTo Label_0`);
once('                    SaleSave = "Y"\n                    Dim i2 As Integer', '                    SaleSave = "Y"\n                    SetSalesImportResult("SAVED", "Sales bill saved successfully.")\n                    Dim i2 As Integer');
once('                    Ultimate.Mod_DataBase.Cmd.ExecuteNonQuery()\n                    Ultimate.Mod_Connection.CloseYearConn(Ultimate.Mod_DataBase.Conn)\n\n                    \'=========================================================\n                    \' SALES SERIAL/IMEI STOCK-OUT',`                    Try
                        Ultimate.Mod_DataBase.Cmd.ExecuteNonQuery()
                        If SalesImportActive Then VerifySalesSave(Ultimate.Mod_DataBase.Conn)
                    Finally
                        Ultimate.Mod_Connection.CloseYearConn(Ultimate.Mod_DataBase.Conn)
                    End Try

                    '=========================================================
                    ' SALES SERIAL/IMEI STOCK-OUT`);
once('Select TrnNo,TrnSeries,NetAmt from t_sal_Header where TrnNo=', 'Select TrnNo,TrnSeries,NetAmt,SysAcCode,SysCompCode from t_sal_Header where TrnNo=');
once('                    If ds2.Tables(0).Rows.Count > 0 Then\n                        If tmpflag = 0 Then',`                    If ds2.Tables(0).Rows.Count > 0 Then
                        If SalesImportActive AndAlso (ds2.Tables(0).Rows.Count <> 1 OrElse
                            Convert.ToInt32(ds2.Tables(0).Rows(0)("SysCompCode")) <> TmpSysCompCode OrElse
                            Convert.ToInt32(ds2.Tables(0).Rows(0)("SysAcCode")) <> CInt(TmpSysAcCode)) Then
                            Throw New InvalidOperationException("Sales key conflict: " & TmpSeries & "/" & TmpTrnNo & " belongs to another customer/company or multiple headers. It was not overwritten.")
                        End If
                        If tmpflag = 0 Then`);
once('                    If TmpLoadLock.ToString = "Y" Then\n', '                    If TmpLoadLock.ToString = "Y" Then\n                        SetSalesImportResult("SKIPPED", "Existing load " & TmpLoadSeries & "/" & TmpLoadNo.ToString() & " is locked; override is blocked.")\n');
once('                If dsfrm.Tables(0).Rows(0)("BlackListed").ToString = "Y" Then\n', '                If dsfrm.Tables(0).Rows(0)("BlackListed").ToString = "Y" Then\n                    SetSalesImportResult("SKIPPED", "Customer " & SaveAcCode & " " & SaveAcName & " is blacklisted.")\n');
once('                        MakeStringSal()\n                    ElseIf CmbEntry.SelectedIndex = 1 Then','                        MakeStringSal()\n                        If SalesImportCancelled Then Exit While\n                    ElseIf CmbEntry.SelectedIndex = 1 Then');
// Preserve the previously delivered SAM2 calculation contract, missing in this attachment.
once('    Private Sub MakeCalculation()',read(path.join(dir,'../sales-purchase-fix-20260929/ImportTotalsHelper.vb'))+'\n\n    Private Sub MakeCalculation()');
for(const name of ['ReCalculateVat','CalculateVat']){
    replaceRange('    Private Sub '+name+'(', '    End Sub',b=>b.replace('label_0:', 'label_0:\n        RestoreGeneratedLineTax(j)'));
}
let a=code.indexOf('        If CmbEntry.SelectedIndex = 0 Then\n\n            TmpRndAmt = TmpNetAmt -');
let b=code.indexOf('        strMstSrNo = ""',a); if(a<0||b<0)throw Error('Sales totals');
once(code.slice(a,b),'        If Not ApplyGeneratedInvoiceTotals() Then\n'+code.slice(a,b)+'        End If\n\n');
a=code.indexOf('        If CmbEntry.SelectedIndex = 1 Then\n\n            \'TmpRndAmt = TmpNetAmt -');
b=code.indexOf('        ACCGirdFormatPur()',a);if(a<0||b<0)throw Error('Purchase totals');
once(code.slice(a,b),'        If Not ApplyGeneratedInvoiceTotals() Then\n'+code.slice(a,b)+'        End If\n\n');
// Give the legacy controller an actionable error as well, rather than swallowing it.
replaceRange('    Private Sub GetData()','    Private Sub GetDataRec()',s=>s.replace('        Catch ex As Exception\n\n        End Try','        Catch ex As Exception\n            MessageBox.Show("Import stopped at row " & k.ToString() & ": " & ex.Message, "Import failed", MessageBoxButtons.OK, MessageBoxIcon.Error)\n        End Try'));
fs.writeFileSync(path.join(dir,'WinImportData.vb'),code.replace(/\n/g,'\r\n'));
fs.copyFileSync(path.join(dir,'WinImportData.vb'),path.join(dir,'WinImportData.txt'));
fs.copyFileSync(path.join(dir,'msg_Override.vb'),path.join(dir,'msg_Override.txt'));
console.log('Full importer and override form generated from latest attachment.');
