const fs = require('fs'), path = require('path'), dir = __dirname;
const read = p => fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const old = read('C:/Users/Total Solution/.codex/attachments/1ecf6207-0c2a-4034-9eff-1cf09e36ec7f/Pasted text.txt');
const updated = read(path.join(dir,'Import.vb'));
const marker = '    Private Sub InsertPurchaseIMEIIntoSerialNo';
if (old.slice(old.indexOf(marker)) !== updated.slice(updated.indexOf(marker))) throw Error('Unrelated trailing routines changed');
const credit = "                ElseIf CmbEntry.SelectedIndex = 2 Then  '---CreditNote";
const end = 'N1:';
if (old.slice(old.indexOf(credit),old.indexOf(end,old.indexOf(credit))) !== updated.slice(updated.indexOf(credit),updated.indexOf(end,updated.indexOf(credit)))) throw Error('Credit Note mapping changed');
for (const name of ['Import','WinImportData']) {
    if (!fs.readFileSync(path.join(dir,name+'.vb')).equals(fs.readFileSync(path.join(dir,name+'.txt')))) throw Error('Copy mismatch');
}
const legacy=read(path.join(dir,'../jnj-purchase-fix-20260928/WinImportData.vb'));
let revised=read(path.join(dir,'WinImportData.vb'));
revised=revised.replace(read(path.join(dir,'ImportTotalsHelper.vb'))+'\n\n','');
revised=revised.replaceAll('label_0:\n        RestoreGeneratedLineTax(j)','label_0:');
revised=revised.replace('If TmpAutoVoucher = "Y" AndAlso CmbEntry.SelectedIndex <> 1 AndAlso Not IsGeneratedInvoice() Then','If TmpAutoVoucher = "Y" AndAlso CmbEntry.SelectedIndex <> 1 Then');
for(const after of ['        strMstSrNo = ""','        ACCGirdFormatPur()']) {
    const start=revised.indexOf('        If Not ApplyGeneratedInvoiceTotals() Then\n');
    const finish=revised.indexOf(after,start);
    const body=revised.slice(start,finish);
    if(!body.endsWith('        End If\n\n'))throw Error('Unexpected wrapper');
    revised=revised.slice(0,start)+body.slice('        If Not ApplyGeneratedInvoiceTotals() Then\n'.length,-'        End If\n\n'.length)+revised.slice(finish);
}
if(revised!==legacy)throw Error('Unexpected importer changes beyond the targeted hooks and helper');
console.log('PASS: Credit Note, serial/IMEI and remaining generator UI routines unchanged; importer differs only by targeted hooks/helper; TXT files identical.');
