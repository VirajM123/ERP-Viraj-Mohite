const fs = require('fs');
const path = require('path');
const source = 'C:/Users/Total Solution/.codex/attachments/e47e947c-221e-499d-8789-8c2f98ca9f77/Pasted text.txt';
const original = fs.readFileSync(source, 'utf8');
let code = original.replace(/\r\n/g, '\n');
function replace(oldText, newText, expected = 1) {
  const count = code.split(oldText).length - 1;
  if (count !== expected) throw Error(`Expected ${expected} occurrences, found ${count}: ${oldText}`);
  code = code.split(oldText).join(newText);
}
replace(
  `                            "OR LTRIM(RTRIM(ISNULL(MP.ProdCode,'')))=LTRIM(RTRIM(@ProdCode))) " +`,
  `                            "OR (LTRIM(RTRIM(@ProdCode))<>'' AND (" +
                            "LTRIM(RTRIM(ISNULL(MP.ProdCode,'')))=LTRIM(RTRIM(@ProdCode)) " +
                            "OR EXISTS (SELECT 1 FROM T_CommonProduct CP " +
                            "WHERE CP.SysProdCode=TS.SysProdCode " +
                            "AND LTRIM(RTRIM(CP.CompProdCode))=LTRIM(RTRIM(@ProdCode)))))) " +`, 2);
replace(`                            "AND ProdSrNo=@ProdSrNo " +`,
        `                            "AND LTRIM(RTRIM(ProdSrNo))=LTRIM(RTRIM(@ProdSrNo)) " +`);
replace(`                                        "IMEI " + OneIMEI + " is not available in T_SerialNo for product " +
                                        TmpProdCode + " " + TmpProdName + "." +`,
        `                                        "IMEI " + OneIMEI + " has no matching serial/product row for " +
                                        TmpProdCode + " " + TmpProdName + "." +
                                        Environment.NewLine +
                                        "Mapped SysProdCode: " + TmpSerialSysProdCode.ToString() +
                                        " | Server: " + SerialConn.DataSource + " | Database: " + SerialConn.Database +
                                        Environment.NewLine +
                                        "Checked product ID, product code and T_CommonProduct mapping. " +
                                        "An IMEI under another product or database does not satisfy this lookup." +`);
replace(`                        'the SAME Excel ProdCode + IMEI. This fixes only Sales SERIALNO imports.`,
        `                        'the SAME product code/common-product mapping + IMEI. Sales SERIALNO only.`);
replace(`                        'Fallback: same Excel ProdCode + same IMEI.`,
        `                        'Fallback: same product code/common-product mapping + same IMEI.`);
const revised = code.replace(/\n/g, '\r\n');
for (const ext of ['vb', 'txt']) fs.writeFileSync(path.join(__dirname, 'WinImportData.' + ext), revised);
// Prove the supplied file is preserved outside the two sales serial routines.
function removeChanged(s) {
  for (const name of ['ValidateSalesIMEIForCurrentBill', 'SaveSalesIMEIStockOut']) {
    const begin = s.indexOf('    Private Function ' + name + '(');
    const end = s.indexOf('    End Function', begin) + '    End Function'.length;
    if (begin < 0 || end < begin) throw Error(name);
    s = s.slice(0, begin) + '<' + name + '>' + s.slice(end);
  }
  return s;
}
if (removeChanged(original.replace(/\r\n/g, '\n')) !== removeChanged(code)) throw Error('Unrelated code changed');
console.log('PASS: complete VB/TXT copies generated; only the two sales IMEI routines changed.');
