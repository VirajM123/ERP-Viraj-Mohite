const fs=require('fs'), path=require('path'), dir=__dirname;
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const old=read('C:/Users/Total Solution/.codex/attachments/93df7f39-3573-4519-8ed4-790edc2be467/Pasted text.txt');
const revised=read(path.join(dir,'WinImportData.vb'));
function routines(code){const result=new Map();const re=/^    (?:Private|Public|Protected) (?:Shared )?(Sub|Function) (\w+)\(/gm;let m;while((m=re.exec(code))){const end=code.indexOf('    End '+m[1],m.index);if(end<0)throw Error(m[2]);result.set(m[2],code.slice(m.index,end+('    End '+m[1]).length));}return result;}
const allowed=new Set(['BtnSave_Click','GetData','GetDataPurchaseIMEI','CheckPurchaseIMEIExisting','ReCalculateVat','CalculateVat','MakeStringSal','MakeStringPur','SaveBill']);
const before=routines(old),after=routines(revised);let unchanged=0,changed=[];
for(const [name,body] of before){if(!after.has(name))throw Error('Missing routine '+name);if(after.get(name)!==body){if(!allowed.has(name))throw Error('Unexpected change '+name);changed.push(name);}else unchanged++;}
for(const name of ['ImportFlowHelpers.vb','../sales-purchase-fix-20260929/ImportTotalsHelper.vb']){
    if(!revised.includes(read(path.join(dir,name)).trim()))throw Error('Helper content mismatch '+name);
}
for(const name of ['WinImportData','msg_Override'])if(!fs.readFileSync(path.join(dir,name+'.vb')).equals(fs.readFileSync(path.join(dir,name+'.txt'))))throw Error('TXT copy differs');
if(!revised.includes('If SalesImportCancelled Then Exit While'))throw Error('Missing legacy cancellation');
if(!revised.includes('If SalesImportActive Then VerifySalesSave(Ultimate.Mod_DataBase.Conn)'))throw Error('Missing sales verification');
if(!revised.includes('If PurchaseIMEIActive Then VerifyPurchaseSave(Ultimate.Mod_DataBase.Conn)'))throw Error('Missing purchase verification');
console.log('PASS: '+unchanged+' existing routines unchanged; changes confined to '+changed.join(', ')+'. Helpers embedded and complete TXT copies identical.');
