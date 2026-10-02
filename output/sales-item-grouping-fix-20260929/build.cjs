const fs = require('fs');
const path = require('path');
const root = __dirname;
const original = fs.readFileSync('C:/Users/Total Solution/.codex/attachments/9bd4fc6b-7c9d-4915-97f1-b5b11fd91459/Pasted text.txt','utf8');
const exporter = fs.readFileSync('C:/Users/Total Solution/.codex/attachments/61f4dfb8-e982-4184-a22c-e7183f73b9b1/Pasted text.txt');
const begin = original.indexOf('    Private Sub MakeStringSal()');
const end = original.indexOf('    Private Sub SetUnitRate()',begin);
const section = original.slice(begin,end);
const detail = section.slice(0,section.indexOf('                MakeCalculation()'));
const fields = [...new Map([...detail.matchAll(/^\s*(\w+) = \1 \+ .*Space\((\d+)\), 1, \2\)/gm)].map(m=>[m[1],Number(m[2])])).entries()];
const sums = new Set('strQty strFrQty strAmt strTPRAmt strSchAmt strCDAmt strBtmAmt strStarAmt StrTaxable strVatAmt strLoadQty strLoadFrQty strOQty strAddOthAmt strLessOthAmt StrCessAmt StrCessPerPCSAmt StrCGST StrSGST StrIGST StrCrateQty'.split(' ').map(x=>x.toLowerCase()));
let helper = fs.readFileSync(path.join(root,'Grouping.template.vb'),'utf8');
helper = helper.replace('        \x27 GENERATED PAYLOAD',fields.map(([n,w])=>`        payload.Columns.Add("${n}", GetType(String))\n        If ${n}.Length <> ItemCount * ${w} Then Throw New InvalidOperationException("Sales detail length mismatch: ${n}")`).join('\n'));
helper = helper.replace('            \x27 GENERATED ROW',fields.map(([n,w])=>`            record("${n}") = ${n}.Substring(detailIndex * ${w}, ${w})`).join('\n'));
helper = helper.replace('        \x27 GENERATED WRITE',fields.map(([n])=>`        ${n} = JoinSalesPayload(grouped, "${n}")`).join('\n'));
helper = helper.replace('SUM_FIELDS', [...sums].map(n=>'"'+fields.find(([v])=>v.toLowerCase()===n)[0]+'"').join(', '));
helper = helper.replace(/\r?\n/g,'\r\n');
const call = '        GroupSalesIMEIDetailsForSave()\r\n';
if (!section.includes('        SaveBill()')) throw Error('Missing save');
let result = original.slice(0,begin) + helper + '\r\n' + section.replace('        SaveBill()',call+'        SaveBill()') + original.slice(end);
const anchor = '                    For Each OneIMEI As String In IMEIList';
const stockStart = result.indexOf('SaveSalesIMEIStockOut(');
const position = result.indexOf(anchor,stockStart);
if (stockStart < 0 || position < 0) throw Error('Missing serial save');
const map = '                    If SalesGroupedSerialSeq.ContainsKey(SerialRow) Then\r\n                        TmpSerialSeqNo = SalesGroupedSerialSeq(SerialRow)\r\n                    End If\r\n\r\n';
result = result.slice(0,position)+map+result.slice(position);
for (const ext of ['vb','txt']) {
 fs.writeFileSync(path.join(root,'WinImportData.'+ext),result);
 fs.writeFileSync(path.join(root,'Import.'+ext),exporter);
}
fs.writeFileSync(path.join(root,'GroupingHelpers.vb'),helper);
fs.writeFileSync(path.join(root,'fields.json'),JSON.stringify(fields,null,2));
// Removing only the additions must recover the user's original exactly.
if(result.replace(helper+'\r\n','').replace(call,'').replace(map,'')!==original) throw Error('Unrelated change');
console.log('Built complete files; original code preserved apart from helper and two sales-only calls. '+fields.length+' detail fields.');
