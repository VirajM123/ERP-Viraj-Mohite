const fs = require('fs');
const path = require('path');
const input = 'C:/Users/Total Solution/.codex/attachments/7ab28344-f3b6-486c-b55d-f608c202d01d/Pasted text.txt';
const original = fs.readFileSync(input, 'utf8').replace(/\r\n/g, '\n');
let code = original;
function once(a,b) { if(code.split(a).length!==2) throw Error('Match count: '+a.slice(0,120)); code=code.replace(a,b); }
function section(a,b,text) {const i=code.indexOf(a),j=code.indexOf(b,i);if(i<0||j<0)throw Error(a);once(code.slice(i,j),text);}
once('    Private PurchaseIMEILastGroupError As String = ""', `    Private PurchaseIMEILastGroupError As String = ""
    Private PurchaseIMEIActive As Boolean = False
    Private PurchaseIMEIReport As New System.Text.StringBuilder()
    Private PurchaseIMEIReportPath As String = ""`);
once('        PurchaseIMEISavedCount = 0', `        PurchaseIMEIReport.Length = 0
        PurchaseIMEIReportPath = ""
        PurchaseIMEISavedCount = 0`);
section("    '=====================================================================\n    ' DEDICATED PURCHASE GROUPING FOR IMEI PURCHASE FILES", '    Private Sub GetData()',[fs.readFileSync(path.join(__dirname,'helpers.vb'),'utf8').replace(/\r\n/g,'\n'),'\n\n'].join(''));
once('            Catch ex As Exception\n                Debug.WriteLine("IMEI PURCHASE HEADER READ ERROR: " + ex.Message)\n            End Try', `            Catch ex As Exception
                'Do not continue with a previous purchase's header.
                Throw New InvalidOperationException("Cannot read the current purchase header: " + ex.Message, ex)
            End Try`);
// Restrict the new duplicate and failure handling to the existing dedicated path.
const dupStart=code.indexOf("                '=================================================================\n                ' PURCHASE IMPORT - FINAL CURRENT-GRN REFRESH + CORRECT DUP CHECK");
const addStart=code.indexOf('                    Ultimate.Mod_DataBase.Conn = Ultimate.Mod_Connection.OpenYearConn()\n                    Ultimate.Mod_DataBase.Cmd = New SqlClient.SqlCommand("Add_Purchase"',dupStart);
const oldCheck=code.slice(dupStart,addStart);
const refreshEnd=oldCheck.indexOf('                If Microsoft.VisualBasic.Conversion.Val(TmpTrnNo) > 0 Then');
const refresh=oldCheck.slice(0,refreshEnd);
const query=oldCheck.slice(refreshEnd).replace('                If Microsoft.VisualBasic.Conversion.Val(TmpTrnNo) > 0 Then\n','');
once(oldCheck,`                If PurchaseIMEIActive Then
                    ReadPurchaseIMEIHeader(start)
                Else
${refresh}                End If

                If Microsoft.VisualBasic.Conversion.Val(TmpTrnNo) > 0 Then
                    If PurchaseIMEIActive Then
                        If CheckPurchaseIMEIExisting() Then GoTo Label_0
                    Else
${query}                    End If
`);
// Postcondition: ExecuteNonQuery alone does not prove the requested header was saved.
const post=`                    '=========================================================
                    ' OPTIONAL IMEI LOGIC`;
once(post,`                    If PurchaseIMEIActive Then
                        Dim SavedHeader As DataTable = FindPurchaseIMEIHeader(TmpSeries, CInt(TmpTrnNo), TmpSysCompCode)
                        If SavedHeader.Rows.Count <> 1 OrElse
                           Not PurchaseIMEIInvoiceMatches(SavedHeader.Rows(0)) Then
                            Throw New InvalidOperationException("Add_Purchase returned, but the requested company/series/GRN and supplier invoice could not be verified. Check the stored procedure and database before retrying this GRN.")
                        End If
                    End If

${post}`);
once(`        Catch ex As Exception
            VsfgSelect.SaveExcel("D:\\Sales.xls", "Sheet2", C1.Win.C1FlexGrid.FileFlags.IncludeFixedCells Or C1.Win.C1FlexGrid.FileFlags.AsDisplayed)
            MessageBox.Show(ex.Message, Ultimate.Mod_GlobFunction.UseedFormName, MessageBoxButtons.OK, MessageBoxIcon.Information)
        End Try
Label_0:
Label_1:`, `        Catch ex As Exception
            If PurchaseIMEIActive Then
                'The group controller retains this GRN's error and continues.
                Throw
            End If
            VsfgSelect.SaveExcel("D:\\Sales.xls", "Sheet2", C1.Win.C1FlexGrid.FileFlags.IncludeFixedCells Or C1.Win.C1FlexGrid.FileFlags.AsDisplayed)
            MessageBox.Show(ex.Message, Ultimate.Mod_GlobFunction.UseedFormName, MessageBoxButtons.OK, MessageBoxIcon.Information)
        End Try
Label_0:
Label_1:`);
once(`                If PurchaseIMEILastGroupError <> "" Then
                    TmpPurchaseSummary = TmpPurchaseSummary +
                        Environment.NewLine + Environment.NewLine +
                        "Last Error: " + PurchaseIMEILastGroupError
                End If`, `                If PurchaseIMEIReportPath <> "" Then
                    TmpPurchaseSummary += Environment.NewLine + Environment.NewLine +
                        "Per-GRN results and failure reasons: " + PurchaseIMEIReportPath
                Else
                    TmpPurchaseSummary += Environment.NewLine + PurchaseIMEIReport.ToString()
                End If`);
once('            If PurchaseIMEISavedCount > 0 OrElse PurchaseIMEIDuplicateCount > 0 OrElse PurchaseIMEIFailedCount > 0 Then',
     '            If PurchaseIMEIReport.Length > 0 OrElse PurchaseIMEISavedCount > 0 OrElse PurchaseIMEIDuplicateCount > 0 OrElse PurchaseIMEIFailedCount > 0 Then');
// Keep empty series valid on this path; the generic initialization otherwise changes it to 0.
once('And k <> VsfgSelect.Cols.IndexOf("Import") Then', 'And k <> VsfgSelect.Cols.IndexOf("Import") AndAlso Not (CmbEntry.SelectedIndex = 1 AndAlso d1.Columns.Contains("IMEI") AndAlso k = VsfgSelect.Cols.IndexOf("TrnSeries")) Then');
// Assert that calculations, accounting, serial-number persistence and other paths were retained.
const methods=s=>new Map([...s.matchAll(/^    (?:Private|Public) (?:Sub|Function) (\w+)\([^]*?^    End (?:Sub|Function)/gm)].map(m=>[m[1],m[0]]));
const allowed=new Set(['BtnSave_Click','SetData','GetDataPurchaseIMEI','MakeStringPur','SaveBill']);
let unchanged=0;
for(const [name,body] of methods(original)) {if(!allowed.has(name)){if(methods(code).get(name)!==body)throw Error('Unrelated change '+name);unchanged++;}}
const call=s=>{const a=s.indexOf('                    Ultimate.Mod_DataBase.Cmd = New SqlClient.SqlCommand("Add_Purchase"');return s.slice(a,s.indexOf('                    Ultimate.Mod_Connection.CloseYearConn',a));};
if(call(original)!==call(code))throw Error('Purchase command changed');
for(const ext of ['vb','txt'])fs.writeFileSync(path.join(__dirname,'WinImportData.'+ext),code.replace(/\n/g,'\r\n'));
console.log(JSON.stringify({lines:code.split('\n').length,unchangedMethods:unchanged,storedProcedureCallUnchanged:true}));
