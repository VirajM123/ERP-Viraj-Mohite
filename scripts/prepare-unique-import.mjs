import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';
import { importConfig } from '../backend/importConfig.js';

const [productFile, customerFile, outputDir] = process.argv.slice(2);
if (!productFile || !customerFile || !outputDir) throw new Error('Provide product workbook, customer workbook and output directory.');
const productBook = xlsx.readFile(productFile);
const customerBook = xlsx.readFile(customerFile);
const read = (book, name) => xlsx.utils.sheet_to_json(book.Sheets[name], { defval: '', raw: true });
const clean = (value) => { const s = String(value ?? '').trim(); return /^null$/i.test(s) ? '' : s; };
const key = (value) => clean(value).toLowerCase();
const textInvalid = (value) => /^[=+\-@]/.test(clean(value));
const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const scope = { 'Distributor ID': 'DIST-1006', 'Firm ID': 'FIRM-2006' };
const company = { 'Company Code': 'TATA', 'Company Name': 'TATA CONSUMER PRODUCTS' };
const review = [];
const addReview = (type, row, reason, source) => review.push({ Type: type, 'Source sheet': source, 'Source row': row, Reason: reason });
const productRows = read(productBook, 'Sheet1');
const accountRows = read(customerBook, 'mas_account');
const partyRows = read(customerBook, 'mas_party').filter((r) => clean(r.SysCompCode) === '7');
const areaRows = read(customerBook, 'mas_area');
const rawMapping = xlsx.utils.sheet_to_json(customerBook.Sheets.areamapping, { header: 1, defval: '', raw: true, blankrows: true });
const mappings = rawMapping.slice(1).map((r, i) => ({ area: clean(r[0]), company: clean(r[1]), salesman: clean(r[2]), row: i + 2 })).filter((r) => r.company === '7');
const salesmanNames = new Map();
for (const row of rawMapping.slice(1)) {
  const code = clean(row[6]), name = clean(row[7]);
  if (!code || !name) continue;
  if (!salesmanNames.has(key(code))) salesmanNames.set(key(code), new Set());
  salesmanNames.get(key(code)).add(name);
}
const multi = (rows, fn) => {
  const map = new Map();
  for (const row of rows) { const k = key(fn(row)); if (!map.has(k)) map.set(k, []); map.get(k).push(row); }
  return map;
};
const accountByCode = multi(accountRows, (r) => r.AcCode);
const accountBySys = multi(accountRows, (r) => r.SysAcCode);
const areaByCode = multi(areaRows, (r) => r.AreaCode);
const areaAssignment = multi(mappings, (r) => r.area);
const tataProducts = productRows.map((data, i) => ({ data, row: (data.__rowNum__ ?? i + 1) + 1 })).filter(({ data }) => clean(data.SysCompCode) === '7');
const productByCode = multi(tataProducts, (r) => r.data.Code);
const cleanArea = (code) => {
  const matches = areaByCode.get(key(code)) || [];
  const names = [...new Set(matches.map(r => clean(r.AreaName)).filter(Boolean))];
  return names.length === 1 && !textInvalid(code) && !textInvalid(names[0]) ? names[0] : '';
};
const num = (value, field, errors) => {
  const s = clean(value);
  if (!s) return '';
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) { errors.push(`${field}: invalid or negative number`); return ''; }
  return n;
};
const checkText = (row, errors) => {
  for (const [field, value] of Object.entries(row)) if (typeof value === 'string' && textInvalid(value)) errors.push(`${field}: starts with a formula character`);
};
const products = [];
for (const { data: r, row } of tataProducts) {
  const errors = [];
  if (clean(r.IsActive).toUpperCase() !== 'Y') errors.push('Product is not marked active');
  if (!clean(r.Code) || !clean(r.Name)) errors.push('Missing product code or name');
  if ((productByCode.get(key(r.Code)) || []).length !== 1) errors.push('Duplicate product code');
  const result = {
    'Product Code': clean(r.Code), 'Product Name': clean(r.Name), Company: '6b06de28cd514a2cf603f8f7',
    Group: 'TATA CONSUMER PRODUCT', Category: 'TATA CONSUMER PRODUCT', Description: clean(r['Local Product Name']),
    'GST %': num(r.VatPer, 'GST %', errors), 'Basic Unit': clean(r['Basic Unit']),
    'Box Pack': num(r.BoxPack, 'Box Pack', errors), 'Inbox Pack': num(r.InBoxPack, 'Inbox Pack', errors),
    'Retailer Margin': num(r['Resaler Margin'], 'Retailer Margin', errors), 'Distributor Margin': num(r['Distributor Margin'], 'Distributor Margin', errors),
    HSN: clean(r.HSNCode), Weight: num(r.Weight, 'Weight', errors), 'EAN Code': '',
    'Rate Per Unit': num(r.RatePerUnit, 'Rate Per Unit', errors), 'Reorder Level': num(r.ReorderLevel, 'Reorder Level', errors),
    'Min Stock Holding': num(r['Min Stock Holding'], 'Min Stock Holding', errors), Cess: num(r['Cess%'], 'Cess', errors),
    'Exp Days': num(r.ExpDays, 'Exp Days', errors), ...scope,
  };
  if (result['GST %'] === '') errors.push('GST percentage is missing');
  checkText(result, errors);
  if (errors.length) addReview('Product', row, errors.join('; '), 'Product Master / Sheet1');
  else products.push(result);
}
const referencedAreas = new Set([...partyRows.map(r => clean(r.AreaCode)), ...mappings.map(r => r.area)].filter(Boolean));
const areas = [];
for (const code of [...referencedAreas].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))) {
  const name = cleanArea(code);
  if (name) areas.push({ 'Area Code': code, 'Area Name': name, ...scope });
  else addReview('Area', '', `Area code ${code}: missing or conflicting area names; check mas_area`, 'Customer master / mas_area');
}
const usableAreas = new Set(areas.map(r=>key(r['Area Code'])));
const accounts = [], usableAccounts = new Map();
for (const [i, r] of accountRows.entries()) {
  const errors = [], code = clean(r.AcCode), name = clean(r.AcName);
  if (!code || !name) errors.push('Missing account code or name');
  if ((accountByCode.get(key(code)) || []).length !== 1) errors.push(`Duplicate account code ${code}`);
  if ((accountBySys.get(key(r.SysAcCode)) || []).length !== 1) errors.push('Duplicate legacy account ID');
  const gst = clean(r.GSTNo).toUpperCase();
  if (gst && !gstPattern.test(gst)) errors.push(`Invalid GSTIN: ${gst}`);
  const mobile = clean(r.MobileNo) || (/^\d{10}$/.test(clean(r.Phone)) ? clean(r.Phone) : '');
  const result = { 'Account Code': code, 'Account Name': name, Address: [clean(r.Add1), clean(r.Add2)].filter(Boolean).join(', '), Town: clean(r.Town), State: clean(r.State), 'PIN Code': clean(r.Pin), 'Mobile No': mobile, 'Email ID': clean(r.EmailID), GSTIN: gst, 'PAN No': clean(r.PanNo), Area: '', 'Opening Balance': '', 'Opening Balance Type': '', 'Credit Days': num(r.CRDays, 'Credit Days', errors), ...scope };
  checkText(result, errors);
  if (errors.length) addReview('Account', (r.__rowNum__ ?? i + 1) + 1, errors.join('; '), 'Customer master / mas_account');
  else { accounts.push(result); usableAccounts.set(key(r.SysAcCode), result); }
}
const partyMappings = [];
for (const [i, r] of read(customerBook, 'mas_party').entries()) {
  if (clean(r.SysCompCode) !== '7') continue;
  const acct = usableAccounts.get(key(r.SysAcCode));
  const areaCode = clean(r.AreaCode), areaName = cleanArea(areaCode);
  if (!acct || !areaName || !usableAreas.has(key(areaCode))) { addReview('Area to Party', (r.__rowNum__ ?? i + 1) + 1, 'Account or area is missing or needs review', 'Customer master / mas_party'); continue; }
  partyMappings.push({ ...company, 'Account Code': acct['Account Code'], 'Account Name': acct['Account Name'], 'Area Code': areaCode, 'Area Name': areaName, ...scope });
}
const usedSalesmanCodes = new Set(mappings.map(r=>key(r.salesman)).filter(Boolean));
const salesmen = [], validSalesmen = new Map();
for (const code of usedSalesmanCodes) {
  const originalCode = mappings.find(r=>key(r.salesman)===code).salesman;
  const names = [...(salesmanNames.get(code) || [])];
  if (names.length !== 1 || textInvalid(originalCode) || textInvalid(names[0])) { addReview('Salesman', '', `Salesman ${originalCode}: name is missing or ambiguous`, 'Customer master / areamapping'); continue; }
  const row = { 'Salesman Code': originalCode, 'Salesman Name': names[0], 'Salesman Type': 'SALESMAN', ...scope };
  salesmen.push(row); validSalesmen.set(code, row);
}
const salesmanMappings = [];
for (const r of mappings) {
  const salesman = validSalesmen.get(key(r.salesman));
  const name = cleanArea(r.area);
  if (!name || !usableAreas.has(key(r.area)) || !salesman || (areaAssignment.get(key(r.area)) || []).length !== 1) {
    addReview('Salesman to Area', r.row, `Area ${r.area}, salesman ${r.salesman}: missing, ambiguous, or multiple assignments for this area`, 'Customer master / areamapping'); continue;
  }
  salesmanMappings.push({ ...company, 'Area Code': r.area, 'Area Name': name, 'Salesman Code': salesman['Salesman Code'], 'Salesman Name': salesman['Salesman Name'], ...scope });
}
fs.mkdirSync(outputDir, { recursive: true });
const files = [ ['01_Product_Master.xlsx','Product',products], ['02_Account_Master.xlsx','Account',accounts], ['03_Area_Master.xlsx','Area',areas], ['04_Salesman_Master.xlsx','Salesman',salesmen], ['05_Area_To_Party.xlsx','AreaToPartyMapping',partyMappings], ['06_Salesman_To_Area.xlsx','SalesmanToAreaMapping',salesmanMappings] ];
for (const [filename, type, data] of files) {
  const headers = importConfig[type].columns.map(c=>c.excel);
  const sheet = xlsx.utils.json_to_sheet(data, { header: headers });
  sheet['!cols'] = headers.map(h=>({wch:Math.min(32,Math.max(15,h.length+2))}));
  const book = xlsx.utils.book_new(); xlsx.utils.book_append_sheet(book,sheet,'Data');
  xlsx.writeFile(book,path.join(outputDir,filename));
}
for (const [filename, data] of [
  ['08_Mas_AreaToPartyMapping_Compass.json', partyMappings.map(r => ({ companyCode:r['Company Code'], companyName:r['Company Name'], accountCode:r['Account Code'], accountName:r['Account Name'], areaCode:r['Area Code'], areaName:r['Area Name'], distributorId:scope['Distributor ID'], firmId:scope['Firm ID'], firmName:'UNIQUE ENTERPRISES', isActive:true }))],
  ['09_Mas_SalesmanAreaMapping_Compass.json', salesmanMappings.map(r => ({ companyCode:r['Company Code'], companyName:r['Company Name'], areaCode:r['Area Code'], areaName:r['Area Name'], salesmanCode:r['Salesman Code'], salesmanName:r['Salesman Name'], distributorId:scope['Distributor ID'], firmId:scope['Firm ID'], firmName:'UNIQUE ENTERPRISES', isActive:true }))],
]) fs.writeFileSync(path.join(outputDir,filename), JSON.stringify(data,null,2) + '\n');
const report = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(report,xlsx.utils.json_to_sheet(review, {header:['Type','Source sheet','Source row','Reason']}),'Needs Review');
const balances = accountRows.map((r,i)=>({ 'Source row':(r.__rowNum__ ?? i + 1) + 1, 'Legacy ID':clean(r.SysAcCode), 'Account Code':clean(r.AcCode), 'Account Name':clean(r.AcName), 'Legacy Opening Balance':r.OPBal, 'Legacy Net Balance':r.NetBal }));
xlsx.utils.book_append_sheet(report,xlsx.utils.json_to_sheet(balances),'Balance Reference');
xlsx.writeFile(report,path.join(outputDir,'07_Review_Only_Not_For_Import.xlsx'));
console.log(JSON.stringify({ files: files.map(([file,type,data])=>({file,type,rows:data.length})), review: review.reduce((a,r)=>(a[r.Type]=(a[r.Type]||0)+1,a),{}), outputDir },null,2));
