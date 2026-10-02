const fs = require('fs'), assert = require('assert/strict');
const { DatabaseSync } = require('node:sqlite');
const vb = fs.readFileSync(__dirname + '/WinImportData.vb', 'utf8');
function query(name) {
  const section = vb.slice(vb.indexOf('Dim ' + name + ' As String =')).split(/\r?\n\s*\r?\n/)[0];
  const sql = [...section.matchAll(/"([^"]*)"/g)].map(m => m[1]).join('');
  assert(sql);
  // Execute actual generated SQL with only TOP / ISNULL dialect translation.
  return sql.replace('TOP 1 ', '').replace(/ISNULL\(/g, 'IFNULL(') + (sql.startsWith('SELECT') ? ' LIMIT 1' : '');
}
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE T_SerialNo(SysProdCode INTEGER, ProdSrNo TEXT, InStock TEXT,
  StkOutTrn TEXT, StkOutSeries TEXT, StkOutTrnNo INTEGER, StkOutTrnDate TEXT, StkOutSeqNo INTEGER);
  CREATE TABLE Mas_Product(SysProdCode INTEGER, ProdCode TEXT);
  CREATE TABLE T_CommonProduct(SysProdCode INTEGER, CompProdCode TEXT);
  INSERT INTO Mas_Product VALUES(189,'INTERNAL-A17');
  INSERT INTO T_CommonProduct VALUES(189,'SM-A176BZKMIN');
  INSERT INTO T_SerialNo VALUES(189,' 359470360571444 ','Y','','',0,NULL,0);`);
const params = { SysProdCode: 999, ProdSrNo: '359470360571444', ProdCode: 'SM-A176BZKMIN' };
for (const name of ['CheckSerialSql', 'ResolveSerialSql']) {
  const stmt = db.prepare(query(name));
  assert.equal(stmt.get(params).SysProdCode, 189, 'common product mapping resolves');
  assert.equal(stmt.get({...params, ProdCode:'INTERNAL-A17'}).SysProdCode,189,'master code resolves');
  assert.equal(stmt.get({...params, SysProdCode:189, ProdCode:''}).SysProdCode,189,'exact ID resolves');
  assert.equal(stmt.get({...params, ProdCode:'UNRELATED'}),undefined,'unrelated product rejected');
  assert.equal(stmt.get({...params, ProdCode:''}),undefined,'blank code rejected');
  assert.equal(stmt.get({...params, ProdSrNo:'359470360571445'}),undefined,'different IMEI rejected');
}
const update = db.prepare(query('UpdateSerialSql'));
const sale = {SysProdCode:189, ProdSrNo:params.ProdSrNo, StkOutSeries:'',StkOutTrnNo:22, StkOutTrnDate:'2026-09-26', StkOutSeqNo:1};
assert.equal(update.run(sale).changes,1,'trimmed serial stock-out succeeds');
assert.equal(db.prepare('SELECT InStock FROM T_SerialNo').get().InStock,'N');
assert.equal(update.run(sale).changes,1,'same sale retry retained');
assert.equal(update.run({...sale, StkOutTrnNo:23}).changes,0,'another sale cannot consume sold serial');
assert(fs.readFileSync(__dirname+'/WinImportData.vb').equals(fs.readFileSync(__dirname+'/WinImportData.txt')));
console.log('PASS: lookup fixtures, alias/direct identity, whitespace, wrong product/IMEI rejection, stock-out and retry guards. SQLite dialect adaptation only; no live SQL Server or full ERP build.');
