import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serverSource = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
const transactionSource = fs.readFileSync(new URL("../transaction.js", import.meta.url), "utf8");
const dashboardSource = fs.readFileSync(new URL("../../src/Dashboard.jsx", import.meta.url), "utf8");

test("settle load receipt numbers use the receipt series", () => {
  assert.match(
    serverSource,
    /documentType: "RECEIPT", series: item\.receiptSeries \|\| "RC"/
  );
});

test("settle-load receipts allow payment corrections and synchronize the settlement", () => {
  assert.doesNotMatch(
    transactionSource,
    /This receipt belongs to a load settlement and cannot be edited separately\./
  );
  assert.match(
    transactionSource,
    /A receipt created by Settle Load can only have its payment details corrected\./
  );
  assert.match(transactionSource, /collection\("T_SettleLoad"\)/);
});

test("taking a settlement receipt does not show the temporary-receipt alert", () => {
  assert.doesNotMatch(
    dashboardSource,
    /Receipt added temporarily\. Click Save Settle Load to save it\./
  );
  assert.match(dashboardSource, /settleLoadSaveInFlight\.current/);
});
