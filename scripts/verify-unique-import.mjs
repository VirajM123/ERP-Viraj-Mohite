import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import xlsx from 'xlsx';
import { importConfig } from '../backend/importConfig.js';
const dir = process.argv[2];
const entries = [['01_Product_Master.xlsx','Product','Product Code'],['02_Account_Master.xlsx','Account','Account Code'],['03_Area_Master.xlsx','Area','Area Code'],['04_Salesman_Master.xlsx','Salesman','Salesman Code'],['05_Area_To_Party.xlsx','AreaToPartyMapping','Account Code'],['06_Salesman_To_Area.xlsx','SalesmanToAreaMapping','Area Code']];
const values = {};
for (const [file,type,id] of entries) {
  const book = xlsx.readFile(path.join(dir,file));
  const rows = xlsx.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], {defval:'',raw:true});
  assert.ok(rows.length && rows.length <= 2000, `${file}: invalid row count`);
  const codes = new Set();
  for (const row of rows) {
    for (const col of importConfig[type].columns) {
      const v = String(row[col.excel] ?? '').trim();
      if (col.required) assert.ok(v, `${file}: missing ${col.excel}`);
      if (v && col.type === 'number') assert.ok(Number.isFinite(Number(v)) && Number(v) >= 0, `${file}: invalid ${col.excel}`);
      if (v && col.type === 'string') assert.ok(!/^[=+\-@]/.test(v), `${file}: invalid ${col.excel}`);
    }
    assert.equal(row['Distributor ID'], 'DIST-1006'); assert.equal(row['Firm ID'], 'FIRM-2006');
    const k = String(row[id]).trim().toLowerCase(); assert.ok(!codes.has(k), `${file}: duplicate ${id}`); codes.add(k);
  }
  values[type] = rows;
  console.log(`${file}: ${rows.length} rows checked`);
}
const accounts = new Set(values.Account.map(r=>String(r['Account Code'])));
const areas = new Set(values.Area.map(r=>String(r['Area Code'])));
const salesmen = new Set(values.Salesman.map(r=>String(r['Salesman Code'])));
for (const row of values.AreaToPartyMapping) assert.ok(accounts.has(String(row['Account Code'])) && areas.has(String(row['Area Code'])) && row['Company Code'] === 'TATA');
for (const row of values.SalesmanToAreaMapping) assert.ok(salesmen.has(String(row['Salesman Code'])) && areas.has(String(row['Area Code'])) && row['Company Code'] === 'TATA');
for (const [filename,type] of [['08_Mas_AreaToPartyMapping_Compass.json','AreaToPartyMapping'],['09_Mas_SalesmanAreaMapping_Compass.json','SalesmanToAreaMapping']]) {
  const docs=JSON.parse(fs.readFileSync(path.join(dir,filename),'utf8'));
  assert.equal(docs.length,values[type].length);
  assert.ok(docs.every(r=>r.distributorId==='DIST-1006' && r.firmId==='FIRM-2006' && r.companyCode==='TATA' && r.isActive === true));
  console.log(`${filename}: ${docs.length} documents checked`);
}
