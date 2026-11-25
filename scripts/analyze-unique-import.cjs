const xlsx = require('xlsx');
const [productFile, customerFile] = process.argv.slice(2);
const products = xlsx.readFile(productFile);
const customers = xlsx.readFile(customerFile);
const rows = (wb, sheet) => xlsx.utils.sheet_to_json(wb.Sheets[sheet], { defval: '', raw: false });
const val = (x) => String(x ?? '').trim();
const counts = (items, key) => Object.entries(items.reduce((a, r) => { const k = val(r[key]); a[k] = (a[k] || 0) + 1; return a; }, {})).sort((a,b) => b[1]-a[1]);
const pr = rows(products, 'Sheet1');
const account = rows(customers, 'mas_account');
const parties = rows(customers, 'mas_party');
const area = rows(customers, 'mas_area');
const areaMapping = xlsx.utils.sheet_to_json(customers.Sheets.areamapping, { header: 1, defval: '', raw: false });
const accountRaw = xlsx.utils.sheet_to_json(customers.Sheets.mas_account, { defval: '', raw: true });
const tataProducts = pr.filter(r => val(r.SysCompCode) === '7');
const party7 = parties.filter(r => val(r.SysCompCode) === '7');
const salesmanRows = areaMapping.slice(1).filter(r => val(r[1]) === '7').map(r => ({ area: val(r[0]), salesman: val(r[2]) }));
const salesmanNames = areaMapping.slice(1).map(r => ({code: val(r[6]), name: val(r[7])})).filter(r=>r.code);
const areaNames = new Map(area.map(r=>[val(r.AreaCode), val(r.AreaName)]));
const accountIds = new Set(account.map(r=>val(r.SysAcCode)));
const duplicate = (items, field) => counts(items, field).filter(([k,n]) => k && n > 1);
console.log(JSON.stringify({
  companies: counts(pr, 'Company Code').map(([code,count]) => ({code, count, sys: [...new Set(pr.filter(r=>val(r['Company Code'])===code).map(r=>val(r.SysCompCode)))], names: [...new Set(pr.filter(r=>val(r['Company Code'])===code).map(r=>val(r['Company Name'])))]})),
  partyCompanies: counts(parties, 'SysCompCode'), areaMappingCompanies: counts(areaMapping.slice(1).map(r=>({company:r[1]})), 'company'),
  accountCount: account.length, duplicateAccounts: duplicate(account,'AcCode'), emptyAccounts: account.filter(r=>!val(r.AcCode)||!val(r.AcName)).length,
  areaCount: area.length, duplicateAreas: duplicate(area,'AreaCode'),
  tataProducts: {count:tataProducts.length,active:counts(tataProducts,'IsActive'),tax:counts(tataProducts,'VatPer'),duplicateCodes:duplicate(tataProducts,'Code'),missingCodeOrName:tataProducts.filter(r=>!val(r.Code)||!val(r.Name)).length},
  rawDuplicateAccounts:duplicate(accountRaw,'AcCode'), rawCodes:accountRaw.filter(r=>String(r.AcCode).startsWith('134562')).map(r=>r.AcCode),
  tataParty: {count:party7.length, missingArea:party7.filter(r=>!val(r.AreaCode)||val(r.AreaCode)==='NULL').length, unknownArea:party7.filter(r=>val(r.AreaCode)&&val(r.AreaCode)!=='NULL'&&!areaNames.has(val(r.AreaCode))).length,missingAccounts:party7.filter(r=>!accountIds.has(val(r.SysAcCode))).length, repeatedAccounts:duplicate(party7,'SysAcCode')},
  salesman: {count:salesmanRows.length, duplicateAreas:duplicate(salesmanRows,'area'), unknownArea:salesmanRows.filter(r=>!areaNames.has(r.area)), missingSalesman:salesmanRows.filter(r=>!r.salesman), noName:salesmanRows.filter(r=>!salesmanNames.some(s=>s.code===r.salesman)).map(r=>r.salesman), duplicateNames:duplicate(salesmanNames,'code')},
  salesmenSample: areaMapping.slice(1,8).map(r=>({area:r[0], company:r[1], salesman:r[2], nameCode:r[6], name:r[7]})),
},null,2));
