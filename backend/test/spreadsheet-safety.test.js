import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, sanitizeSpreadsheetCell, sanitizeSpreadsheetRow } from "../spreadsheetSafety.js";
import { isLikelySqlServerBackup } from "../desktopImportRoutes.js";

test("spreadsheet formula payloads are neutralized without changing numeric negatives", () => {
  for (const value of ["=1+1", "+SUM(A1:A2)", "-cmd", "@IMPORT", "\tformula", "\rformula", "\nformula"]) {
    assert.equal(sanitizeSpreadsheetCell(value), `'${value}`);
  }
  assert.equal(sanitizeSpreadsheetCell(-125.5), -125.5);
  assert.equal(sanitizeSpreadsheetCell("ordinary text"), "ordinary text");
  assert.deepEqual(sanitizeSpreadsheetRow({ text: "=1+1", amount: -2 }), { text: "'=1+1", amount: -2 });
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
});

test("desktop backup preflight rejects renamed arbitrary files", () => {
  assert.equal(isLikelySqlServerBackup(Buffer.from("not a database backup")), false);
  assert.equal(isLikelySqlServerBackup(Buffer.concat([Buffer.alloc(32), Buffer.from("TAPE"), Buffer.alloc(32)])), true);
  assert.equal(isLikelySqlServerBackup(Buffer.alloc(0)), false);
});
