import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const einvoiceJsonDirectory = path.join(projectRoot, "TsEinvoiceJSon");

export const validateEInvoicePayload = (payload) => {
  if (!Array.isArray(payload) || !payload.length || payload.length > 1000 ||
    payload.some((invoice) => !invoice || typeof invoice !== "object" ||
      !invoice.DocDtls?.No || !invoice.DocDtls?.Dt ||
      !invoice.SellerDtls?.Gstin || !invoice.BuyerDtls?.Gstin ||
      !Array.isArray(invoice.ItemList) || !invoice.ItemList.length)) {
    throw new Error("Select a valid E-Invoice JSON file containing at least one invoice.");
  }
  return payload;
};

export async function saveEInvoiceJson({ payload, firmId }) {
  validateEInvoicePayload(payload);
  const safeFirmId = String(firmId || "firm").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `E-InvoiceJSON_${safeFirmId}_${new Date().toISOString().replace(/[:.]/g, "-")}_${randomUUID().slice(0, 8)}.json`;
  await mkdir(einvoiceJsonDirectory, { recursive: true });
  await writeFile(path.join(einvoiceJsonDirectory, fileName), `${JSON.stringify(payload, null, 2)}\n`, { flag: "wx" });
  return { fileName, folder: "TsEinvoiceJSon", count: payload.length };
}
