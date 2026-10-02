const x=require('xlsx');
const w=x.readFile('D:/SAM_PurchaseImport.xls');
const rows=x.utils.sheet_to_json(w.Sheets.Sheet2,{defval:''});
const groups=new Map(),serials=new Map();let invalid=[],blank=[],last='',blocks=0;
for(let i=0;i<rows.length;i++){
 const r=rows[i],key=[r.TrnSeries,r.TrnNo,r.InvNo].join('|');
 if(key!==last)blocks++;last=key;
 if(!groups.has(key))groups.set(key,{rows:0,net:0,final:new Set(),imeis:0});
 const g=groups.get(key);g.rows++;g.net+=Math.round(Number(r.NetAmt)*100);g.final.add(r.InvoiceNetValueIncludingTCS);
 const imei=String(r.IMEI).trim();if(!imei)blank.push(i+2);else{g.imeis++;if(!/^\d{15}$/.test(imei))invalid.push({row:i+2,imei});if(!serials.has(imei))serials.set(imei,[]);serials.get(imei).push(i+2);}
}
const duplicate=[...serials].filter(([s,v])=>v.length>1);
const source=x.readFile('C:/Users/Total Solution/Desktop/Purchasekucchal.xlsx');
const original=x.utils.sheet_to_json(source.Sheets.Sheet2,{defval:''});
const signature=r=>[String(r.InvoiceNo||r.InvNo).trim(),String(r.ProductCode||r.ProdCode).trim(),String(r.IMEI).trim()].join('|');
const a=new Map();for(const r of original){const k=signature(r);a.set(k,(a.get(k)||0)+1);}let extra=0;for(const r of rows){const k=signature(r);if(a.get(k)>0)a.set(k,a.get(k)-1);else extra++;}
const bad=rows.filter(r=>Math.abs(Number(r.Amount)-Number(r.BVDisc1)-Number(r.BVDisc2)+Number(r.VATAmt)-Number(r.NetAmt))>0.005);
const example=rows[0];const raw=original.find(r=>signature(r)===signature(example));
const invoiceChecks=[];
const cents=v=>Math.round(Number(v)*100);
for(const [key] of groups){
 const detail=rows.filter(r=>[r.TrnSeries,r.TrnNo,r.InvNo].join('|')===key),first=detail[0];
 const net=detail.reduce((n,r)=>n+cents(r.NetAmt),0);
 const consistent=detail.every(r=>r.ImportTotalsVersion==='SAM2' && cents(r.InvoiceNetValueIncludingTCS)===cents(first.InvoiceNetValueIncludingTCS) && cents(r.InvoiceTCSAmount)===cents(first.InvoiceTCSAmount) && cents(r.InvoiceRounding)===cents(first.InvoiceRounding));
 const sourceRows=original.filter(r=>String(r.InvoiceNo).trim()===String(first.InvNo).trim());
 const sourceMatch=sourceRows.every(r=>cents(r.NetValueIncludingTCS)===cents(first.InvoiceNetValueIncludingTCS));
 invoiceChecks.push({key,ok:consistent&&sourceMatch&&net+cents(first.InvoiceTCSAmount)+cents(first.InvoiceRounding)===cents(first.InvoiceNetValueIncludingTCS)&&Math.abs(cents(first.InvoiceRounding))<=detail.length});
}
console.log(JSON.stringify({invoiceTotalsPassed:invoiceChecks.filter(r=>r.ok).length,invoiceTotalsFailed:invoiceChecks.filter(r=>!r.ok)},null,2));
console.log(JSON.stringify({rows:rows.length,invoices:groups.size,blocks,uniqueSerials:serials.size,blankSerials:blank.length,non15DigitSerials:invalid.length,duplicateSerials:duplicate.length,missingSourceRows:[...a.values()].reduce((n,v)=>n+v,0),extraRows:extra,lineCalculationFailures:bad.length,example:{excelRow:2,invoice:example.InvNo,amount:example.Amount,tax:example.VATAmt,net:example.NetAmt,header:example.InvoiceNetValueIncludingTCS,sourceLineNet:raw.NetValue},numeric15digit:rows.filter(r=>/^\d{15}$/.test(String(r.IMEI).trim())).length},null,2));
