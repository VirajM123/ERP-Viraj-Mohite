import test from "node:test";
import assert from "node:assert/strict";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { einvoiceJsonDirectory, saveEInvoiceJson, validateEInvoicePayload } from "../einvoiceJsonFiles.js";

const invoice = {
  DocDtls: { No: "INV1", Dt: "02/10/2026" },
  SellerDtls: { Gstin: "27ABCDE1234F1Z5" },
  BuyerDtls: { Gstin: "27ABCDE1234F1Z5" },
  ItemList: [{ HsnCd: "1234" }],
};

test("E-Invoice JSON is saved in TsEinvoiceJSon without changing its payload", async () => {
  const payload = [invoice];
  const { fileName, folder, count } = await saveEInvoiceJson({ payload, firmId: "FIRM-1" });
  const savedPath = path.join(einvoiceJsonDirectory, fileName);
  try {
    assert.equal(folder, "TsEinvoiceJSon");
    assert.equal(count, 1);
    assert.ok(fileName.startsWith("E-InvoiceJSON_FIRM-1_"));
    assert.deepEqual(JSON.parse(await readFile(savedPath, "utf8")), payload);
  } finally {
    await unlink(savedPath);
  }
});

test("E-Invoice JSON rejects empty or malformed invoice lists", () => {
  assert.throws(() => validateEInvoicePayload([]), /valid E-Invoice JSON/);
  assert.throws(() => validateEInvoicePayload([{ DocDtls: { No: "INV1" } }]), /valid E-Invoice JSON/);
});
