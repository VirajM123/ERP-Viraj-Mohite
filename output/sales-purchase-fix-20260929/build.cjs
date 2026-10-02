const fs = require('fs'), path = require('path');
const dir = __dirname;
const source = 'C:/Users/Total Solution/.codex/attachments/1ecf6207-0c2a-4034-9eff-1cf09e36ec7f/Pasted text.txt';
const read = p => fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
let code = read(source);
function once(a,b) {if(code.split(a).length!==2)throw Error('Expected one match: '+a.slice(0,100));code=code.replace(a,b);}
once('    Private Sub BtnSave_Click',read(path.join(dir,'InvoiceHelpers.vb'))+'\n\n    Private Sub BtnSave_Click');
once('        d1 = ds.Tables(0)',`        d1 = ds.Tables(0)
        If CmbEntry.SelectedIndex = 0 OrElse CmbEntry.SelectedIndex = 1 Then
            Try
                d1 = PrepareInvoiceSource(d1, CmbEntry.SelectedIndex = 1)
            Catch ex As Exception
                MessageBox.Show(ex.Message, "Invoice validation", MessageBoxButtons.OK, MessageBoxIcon.Error)
                Return
            End Try
        End If`);
once('        dt = dsfrm.Tables(0)',`        dt = dsfrm.Tables(0)
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
        End If`);
once('Dim InvoiceKey As String = SourceInvoiceNo.Trim().ToUpper()', 'Dim InvoiceKey As String = CStr(d1.Rows(i)("__InvoiceKey"))');
once('Dim SalesInvoiceKey As String = SourceInvoiceNo.Trim().ToUpper()', 'Dim SalesInvoiceKey As String = CStr(d1.Rows(i)("__InvoiceKey"))');
// Restrict all mapping replacements to the two named-column branches.
const begin=code.indexOf("                If CmbEntry.SelectedIndex = 1 Then '----Purchase");
const end=code.indexOf("                ElseIf CmbEntry.SelectedIndex = 2 Then  '---CreditNote",begin);
let mapping=code.slice(begin,end);
mapping=mapping.replace(/As Double/g,'As Decimal').replace(/GetExcelNumber\(/g,'MoneyValue(');
mapping=mapping.replaceAll('PurchaseRate = TaxableAmount / PurchaseQty','PurchaseRate = CDec(d1.Rows(i)("__Gross")) / PurchaseQty');
mapping=mapping.replaceAll('SalesRate = TaxableAmount / SalesQty','SalesRate = CDec(d1.Rows(i)("__Gross")) / SalesQty');
mapping=mapping.replaceAll('VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Amount")) = TaxableAmount','VsfgSelect(i1, VsfgSelect.Cols.IndexOf("Amount")) = d1.Rows(i)("__Gross")');
mapping=mapping.replace('VsfgSelect(i1, VsfgSelect.Cols.IndexOf("BVDisc1")) = DiscountAmount',`VsfgSelect(i1, VsfgSelect.Cols.IndexOf("BVDisc1")) = d1.Rows(i)("__Scheme")
                    VsfgSelect(i1, VsfgSelect.Cols.IndexOf("BVDisc2")) = d1.Rows(i)("__Cash")`);
mapping=mapping.replace('VsfgSelect(i1, VsfgSelect.Cols.IndexOf("SchAmt")) = DiscountAmount','VsfgSelect(i1, VsfgSelect.Cols.IndexOf("SchAmt")) = d1.Rows(i)("__Scheme")');
mapping=mapping.replace('VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CDAmt")) = 0','VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CDAmt")) = d1.Rows(i)("__Cash")');
mapping=mapping.replace('SchemePer = Math.Round(DiscountAmount * 100 / (TaxableAmount + DiscountAmount), 2)','SchemePer = MoneyRound(CDec(d1.Rows(i)("__Scheme")) * 100D / CDec(d1.Rows(i)("__Gross")))');
mapping=mapping.replace('VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CdPer")) = 0.0',`VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CdPer")) = 0D
                    If TaxableAmount + CDec(d1.Rows(i)("__Cash")) <> 0D Then
                        VsfgSelect(i1, VsfgSelect.Cols.IndexOf("CdPer")) = MoneyRound(CDec(d1.Rows(i)("__Cash")) * 100D / (TaxableAmount + CDec(d1.Rows(i)("__Cash"))))
                    End If`);
mapping=mapping.replaceAll('VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TrnDate")) = SourceInvoiceDate','VsfgSelect(i1, VsfgSelect.Cols.IndexOf("TrnDate")) = d1.Rows(i)("__InvoiceDate")');
mapping=mapping.replace('VsfgSelect(i1, VsfgSelect.Cols.IndexOf("InvDate")) = SourceInvoiceDate','VsfgSelect(i1, VsfgSelect.Cols.IndexOf("InvDate")) = d1.Rows(i)("__InvoiceDate")');
mapping=mapping.replace('VsfgSelect(i1, VsfgSelect.Cols.IndexOf("IMEI")) = SourceIMEI','VsfgSelect(i1, VsfgSelect.Cols.IndexOf("IMEI")) = SourceIMEI\n                    SetInvoiceContract(i1, d1.Rows(i))');
mapping=mapping.replace('VsfgSelect(i1, VsfgSelect.Cols.IndexOf("IMEI")) = GetExcelIMEI(d1.Rows(i))','VsfgSelect(i1, VsfgSelect.Cols.IndexOf("IMEI")) = GetExcelIMEI(d1.Rows(i))\n                    SetInvoiceContract(i1, d1.Rows(i))');
once(code.slice(begin,end),mapping);
fs.writeFileSync(path.join(dir,'Import.vb'),code.replace(/\n/g,'\r\n'));
fs.copyFileSync(path.join(dir,'Import.vb'),path.join(dir,'Import.txt'));
code=read(path.join(dir,'../jnj-purchase-fix-20260928/WinImportData.vb'));
once('    Private Sub MakeCalculation()', read(path.join(dir,'ImportTotalsHelper.vb'))+'\n\n    Private Sub MakeCalculation()');
for(const method of ['ReCalculateVat','CalculateVat']) {
    const start=code.indexOf('    Private Sub '+method+'(');
    const end=code.indexOf('    End Sub',start);
    const body=code.slice(start,end);
    if(!body.includes('label_0:'))throw Error('Missing tax exit label');
    once(body,body.replace('label_0:', 'label_0:\n        RestoreGeneratedLineTax(j)'));
}
// Only SAM2 files bypass the legacy total/rounding block. Older formats retain it verbatim.
let a=code.indexOf('        If CmbEntry.SelectedIndex = 0 Then\n\n            TmpRndAmt = TmpNetAmt -');
let b=code.indexOf('        strMstSrNo = ""',a);
if(a<0||b<0)throw Error('Sales totals boundaries');
once(code.slice(a,b),'        If Not ApplyGeneratedInvoiceTotals() Then\n'+code.slice(a,b)+'        End If\n\n');
a=code.indexOf('        If CmbEntry.SelectedIndex = 1 Then\n\n            \'TmpRndAmt = TmpNetAmt -');
b=code.indexOf('        ACCGirdFormatPur()',a);
if(a<0||b<0)throw Error('Purchase totals boundaries');
once(code.slice(a,b),'        If Not ApplyGeneratedInvoiceTotals() Then\n'+code.slice(a,b)+'        End If\n\n');
once('If TmpAutoVoucher = "Y" AndAlso CmbEntry.SelectedIndex <> 1 Then','If TmpAutoVoucher = "Y" AndAlso CmbEntry.SelectedIndex <> 1 AndAlso Not IsGeneratedInvoice() Then');
fs.writeFileSync(path.join(dir,'WinImportData.vb'),code.replace(/\n/g,'\r\n'));
fs.copyFileSync(path.join(dir,'WinImportData.vb'),path.join(dir,'WinImportData.txt'));
console.log('Wrote complete generator and companion importer; original files preserved.');
