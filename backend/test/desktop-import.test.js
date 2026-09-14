import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import * as XLSX from "xlsx";
import { canReuseDesktopImportPlan, createSourceWorkbook, localSqlServiceAccount, mapDesktopRows, parseInstalledSqlInstances, parseSqlXmlRows } from "../desktopImportRoutes.js";
import { loadExistingProductCodes } from "../importRoutes.js";
import { buildDesktopTransactionRows } from "../desktopTransactionMapper.js";
import { DESKTOP_IMPORT_ORDER, desktopCommittedTransactionFilter, desktopTransactionConcurrency, ensureDesktopReceiptBankAccounts, readDesktopWorkbook, readDesktopWorkbookStreaming } from "../desktopImportBatch.js";
import { calculatePurchaseFinancials, calculateSalesFinancials } from "../financialValidation.js";

test("desktop account rows map to the existing ERP Excel structure", () => {
  const [row] = mapDesktopRows({
    entryType: "Account",
    distributorId: "DIST-1",
    firmId: "FIRM-1",
    rows: [{ AcCode: "A001", AcName: "Retail Customer", Add1: "Main Road", Mobile: "9999999999", CrDays: 15 }],
  });
  assert.equal(row["Account Code"], "A001");
  assert.equal(row["Account Name"], "Retail Customer");
  assert.equal(row.Address, "Main Road");
  assert.equal(row["Mobile No"], "9999999999");
  assert.equal(row["Credit Days"], 15);
  assert.equal(row["Distributor ID"], "DIST-1");
  assert.equal(row["Firm ID"], "FIRM-1");
});

test("desktop conversion neutralizes spreadsheet formula text", () => {
  const [row] = mapDesktopRows({ entryType: "Area", distributorId: "D", firmId: "F", rows: [{ AreaCode: "=1+1", AreaName: "North" }] });
  assert.equal(row["Area Code"], "'=1+1");
});

test("desktop product and party mappings replace SysCompCode with the ERP company code", () => {
  const references = {
    companies: new Map([["1", { CompCode: "VICCO", CompName: "VICCO LABS" }]]),
    accounts: new Map([["20", { AcCode: "A020", AcName: "Retailer" }]]),
    areas: new Map([["n", { AreaName: "North" }]]),
  };
  const [product] = mapDesktopRows({ entryType: "Product", distributorId: "D", firmId: "F", references, rows: [{ ProdCode: "P1", ProdName: "Product", SysCompCode: 1 }] });
  assert.equal(product.Company, "VICCO");
  const [mapping] = mapDesktopRows({ entryType: "AreaToPartyMapping", distributorId: "D", firmId: "F", references, rows: [{ SysCompCode: 1, SysAcCode: 20, AreaCode: "N" }] });
  assert.deepEqual({ company: mapping["Company Code"], account: mapping["Account Code"], area: mapping["Area Name"] }, { company: "VICCO", account: "A020", area: "North" });
});

test("desktop area-to-party conversion omits parties that have no area mapping", () => {
  const rows = mapDesktopRows({
    entryType: "AreaToPartyMapping", distributorId: "D", firmId: "F",
    references: {
      companies: new Map([["1", { CompCode: "C1", CompName: "Company" }]]),
      accounts: new Map([["20", { AcCode: "A20", AcName: "Party" }]]),
      areas: new Map(),
    },
    rows: [{ SysCompCode: 1, SysAcCode: 20, AreaCode: "" }],
  });
  assert.deepEqual(rows, []);
});

test("existing area-to-party workbooks ignore rows that have no area mapping", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "erp-area-mapping-test-"));
  try {
    const filePath = path.join(directory, "area-mapping.xlsx");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
      { "Company Code": "C1", "Account Code": "A1", "Area Code": "", "Area Name": "" },
      { "Company Code": "C1", "Account Code": "A2", "Area Code": "N", "Area Name": "North" },
    ]), "Data");
    XLSX.writeFile(workbook, filePath);
    const records = readDesktopWorkbook(filePath, "AreaToPartyMapping");
    assert.equal(records.length, 1);
    assert.equal(records[0].payload["Account Code"], "A2");
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("product import passes the transaction session through native MongoDB find options", async () => {
  const session = { id: "session" };
  let receivedFilter; let receivedOptions;
  const collection = {
    find(filter, options) {
      receivedFilter = filter; receivedOptions = options;
      return { toArray: async () => [{ productCode: "Existing-Code" }] };
    },
  };
  const codes = await loadExistingProductCodes({ collection, distributorId: "D", firmId: "F", session });
  assert.deepEqual(receivedFilter, { distributorId: "D", firmId: "F" });
  assert.equal(receivedOptions.session, session);
  assert.deepEqual(receivedOptions.projection, { productCode: 1 });
  assert.equal(codes.get("existing-code"), "Existing-Code");
});

test("desktop conversion reads rows from pre-JSON SQL Server compatibility levels", () => {
  const rows = parseSqlXmlRows(`XML_F52E2B61-18A1-11d1-B105-00805F49916B
----------------
<rows><row><AcCode>A&amp;001</AcCode><AcName>Old &lt;Customer&gt;</AcName><Credit_x0020_Days>15</Credit_x0020_Days><Empty /></row></rows>`);
  assert.deepEqual(rows, [{ AcCode: "A&001", AcName: "Old <Customer>", "Credit Days": "15", Empty: "" }]);
});

test("desktop conversion prefers the newest installed SQL Server engine", () => {
  const instances = parseInstalledSqlInstances(`
    SQLEXPRESS    REG_SZ    MSSQL15.SQLEXPRESS
    LEGACY        REG_SZ    MSSQL13.LEGACY
    CURRENT       REG_SZ    MSSQL17.CURRENT`);
  assert.deepEqual(instances.map((item) => item.server), [".\\CURRENT", ".\\SQLEXPRESS", ".\\LEGACY"]);
});

test("desktop conversion grants staging access only to the selected local SQL service", () => {
  assert.equal(localSqlServiceAccount(".\\SQLEXPRESS"), "NT SERVICE\\MSSQL$SQLEXPRESS");
  assert.equal(localSqlServiceAccount("(localdb)\\MSSQLLocalDB"), "");
  assert.equal(localSqlServiceAccount("sql.example.test"), "");
});

test("desktop sales rows are converted to the ERP sales payload shape", () => {
  const references = {
    products: new Map([["10", { ProdCode: "P10", ProdName: "Product 10" }]]),
    accounts: new Map([["20", { AcCode: "A20", AcName: "Customer 20" }]]),
    companies: new Map([["30", { CompCode: "C30", CompName: "Company 30" }]]),
    salesmen: new Map(), areas: new Map(), godowns: new Map([["g1", { GDName: "Main" }]]),
  };
  const [row] = buildDesktopTransactionRows({
    job: { distributorId: "D", firmId: "F" }, definition: { entryType: "DesktopSales", label: "Sales" }, references,
    sheets: [
      { sheet: "Header", rows: [{ TrnSeries: "S", TrnNo: 1, TrnDate: "2026-01-02", SysAcCode: 20, SysCompCode: 30, GDCode: "G1", NetAmt: 118 }] },
      { sheet: "Details", rows: [{ TrnSeries: "S", TrnNo: 1, SysProdCode: 10, Batch: "B1", MRP: 120, Qty: 1, Rate: 100, VATPer: 18 }] },
    ],
  });
  const payload = JSON.parse(row["ERP Payload JSON"]);
  assert.equal(payload._desktopImport, true); assert.equal(payload.BillNo, 1);
  assert.equal(payload.PartyCode, "A20"); assert.equal(payload.CompanyCode, "C30");
  assert.equal(payload.items[0].productCode, "P10"); assert.equal(payload.items[0].batchNo, "B1");
});

test("legacy repeated counter-sale headers export only one bill", () => {
  const references = {
    products: new Map([["10", { ProdCode: "P10", ProdName: "Product 10" }]]),
    accounts: new Map([["20", { AcCode: "A20", AcName: "Customer 20" }]]),
    companies: new Map([["30", { CompCode: "C30", CompName: "Company 30" }]]),
    salesmen: new Map(), areas: new Map(), godowns: new Map([["g1", { GDName: "Main" }]]),
  };
  const rows = buildDesktopTransactionRows({
    job: { distributorId: "D", firmId: "F" }, definition: { entryType: "DesktopCounterSales", label: "Counter Sales" }, references,
    sheets: [
      { sheet: "Header", rows: [
        { TrnSeries: "CS", TrnNo: 1, TrnDate: "2026-01-02", SysAcCode: 20, SysCompCode: 30, GDCode: "G1" },
        { TrnSeries: "CS", TrnNo: 1, TrnDate: "2026-01-02", SysAcCode: 20, SysCompCode: 30, GDCode: "G1" },
      ] },
      { sheet: "Details", rows: [
        { TrnSeries: "CS", TrnNo: 1, SysProdCode: 10, Qty: 1, Rate: 10 },
        { TrnSeries: "CS", TrnNo: 1, SysProdCode: 10, Qty: 2, Rate: 10 },
      ] },
    ],
  });
  assert.equal(rows.length, 1);
  assert.equal(JSON.parse(rows[0]["ERP Payload JSON"]).items.length, 2);
});

test("sales lists use paginated data and have a matching counter-sales index", () => {
  const dashboard = fs.readFileSync(new URL("../../src/Dashboard.jsx", import.meta.url), "utf8");
  const server = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
  assert.doesNotMatch(dashboard, /\$\{API_URL\}\/sales\?distributorId=/);
  assert.match(dashboard, /\$\{API_URL\}\/sales\/list\?/);
  assert.match(server, /SalesEntryType: 1, BillDate: -1, BillNo: -1, _id: -1/);
});

test("desktop purchase rows retain the visible product label and stock fields", () => {
  const references = {
    products: new Map([["10", { ProdCode: "P10", ProdName: "Product 10" }]]),
    accounts: new Map([["20", { AcCode: "A20", AcName: "Supplier 20" }]]),
    companies: new Map([["30", { CompCode: "C30", CompName: "Company 30" }]]),
    salesmen: new Map(), areas: new Map(), godowns: new Map([["g1", { GDName: "Main" }]]),
  };
  const [row] = buildDesktopTransactionRows({
    job: { distributorId: "D", firmId: "F" }, definition: { entryType: "DesktopPurchase", label: "Purchase" }, references,
    sheets: [
      { sheet: "Header", rows: [{ TrnSeries: "P", TrnNo: 1, TrnDate: "2026-01-02", SysAcCode: 20, SysCompCode: 30, GDCode: "G1" }] },
      { sheet: "Details", rows: [{ TrnSeries: "P", TrnNo: 1, SysProdCode: 10, Batch: "B1", MRP: 120, Qty: 2, PRate: 80, SRate: 100 }] },
    ],
  });
  const payload = JSON.parse(row["ERP Payload JSON"]);
  assert.equal(payload.items[0].product, "P10 - Product 10");
  assert.equal(payload.items[0].productCode, "P10");
  assert.equal(payload.items[0].productName, "Product 10");
  assert.equal(payload.items[0].batchNo, "B1");
  assert.equal(payload.items[0].purchaseRate, 80);
});

test("desktop credit notes use the API canonical series when the legacy series is blank", () => {
  const references = {
    products: new Map([["10", { ProdCode: "P10", ProdName: "Product 10" }]]),
    accounts: new Map([["20", { AcCode: "A20", AcName: "Customer 20" }]]),
    companies: new Map([["30", { CompCode: "C30", CompName: "Company 30" }]]),
    salesmen: new Map(), areas: new Map(), godowns: new Map([["g1", { GDName: "Main" }]]),
  };
  const [row] = buildDesktopTransactionRows({
    job: { distributorId: "D", firmId: "F" }, definition: { entryType: "DesktopCreditNote", label: "Credit Note" }, references,
    sheets: [
      { sheet: "Header", rows: [{ TrnSeries: "", TrnNo: 1, TrnDate: "2026-01-02", SysAcCode: 20, SysCompCode: 30, GDCode: "G1" }] },
      { sheet: "Details", rows: [{ TrnSeries: "", TrnNo: 1, SysProdCode: 10, Batch: "B1", MRP: 120, Qty: 1, Rate: 100 }] },
    ],
  });
  const payload = JSON.parse(row["ERP Payload JSON"]);
  assert.equal(payload.CreditNoteSeries, "CN");
});

test("desktop purchase BV discounts remain amounts and do not become invalid percentages", () => {
  const references = {
    products: new Map([["10", { ProdCode: "P10", ProdName: "Product 10" }]]),
    accounts: new Map([["20", { AcCode: "A20", AcName: "Supplier 20" }]]),
    companies: new Map([["30", { CompCode: "C30", CompName: "Company 30" }]]),
    salesmen: new Map(), areas: new Map(), godowns: new Map([["g1", { GDName: "Main" }]]),
  };
  const [row] = buildDesktopTransactionRows({
    job: { distributorId: "D", firmId: "F" }, definition: { entryType: "DesktopPurchase", label: "Purchase" }, references,
    sheets: [
      { sheet: "Header", rows: [{ TrnSeries: "P", TrnNo: 1, TrnDate: "2026-01-02", SysAcCode: 20, SysCompCode: 30, GDCode: "G1" }] },
      { sheet: "Details", rows: [{ TrnSeries: "P", TrnNo: 1, SysProdCode: 10, Batch: "B1", MRP: 120, Qty: 60, PRate: 55.996, GrossAmount: 3359.76, BVDisc1: 209.99, VATPer: 5 }] },
    ],
  });
  const payload = JSON.parse(row["ERP Payload JSON"]);
  assert.equal(payload.items[0].disc1, 0);
  assert.equal(payload.items[0].disc1Amount, 209.99);
  const result = calculatePurchaseFinancials(payload, payload.items);
  assert.equal(result.items[0].grossAmount, 3359.76);
  assert.equal(result.items[0].taxable, 3149.77);
});

test("previously generated desktop purchase files can retry BV amount discounts", () => {
  const result = calculatePurchaseFinancials({ _desktopImport: true }, [{
    quantity: 2, unit: "BOX", boxPack: 30, purRate: 80.16666,
    mrp: 100, disc1: 745.56, disc2: 0, disc3: 0, tax: 5,
  }]);
  assert.equal(result.items[0].grossAmount, 4810);
  assert.equal(result.items[0].taxable, 4064.44);
});

test("desktop internal keys become ERP product, account and company codes", () => {
  const references = {
    products: new Map([["205", { SysProdCode: 205, ProdCode: "K042", ProdName: "DRAFT CALLIFORNIA ALMOND 150GM" }]]),
    accounts: new Map([["2518", { SysAcCode: 2518, AcCode: "1518", AcName: "BALAJI VARITIES" }]]),
    companies: new Map([["3", { SysCompCode: 3, CompCode: "KUBER", CompName: "SHRI KUBER" }]]),
    salesmen: new Map(), areas: new Map(), godowns: new Map([["g1", { GDName: "Main" }]]),
  };
  const [row] = buildDesktopTransactionRows({
    job: { distributorId: "D", firmId: "F" }, definition: { entryType: "DesktopSales", label: "Sales" }, references,
    sheets: [
      { sheet: "Header", rows: [{ TrnSeries: "A", TrnNo: 1, TrnDate: "2026-04-03", SysAcCode: 2518, SysCompCode: -1, GDCode: "G1" }] },
      { sheet: "Details", rows: [{ TrnSeries: "A", TrnNo: 1, SysProdCode: 205, SysCompCode: 3, Unit: "BOX", Box: 288, Batch: "5", MRP: 10, Qty: 20, Rate: 1980.952381 }] },
    ],
  });
  const payload = JSON.parse(row["ERP Payload JSON"]);
  assert.equal(payload.PartyCode, "1518"); assert.equal(payload.CompanyCode, "KUBER");
  assert.equal(payload.items[0].productCode, "K042"); assert.equal(payload.items[0].quantity, 20);
  assert.equal(payload.items[0].boxPack, 288); assert.ok(Math.abs(payload.items[0].rate - 6.878306878) < 0.000001);
  assert.equal("SysProdCode" in payload.items[0], false); assert.equal("SysAcCode" in payload, false);
});

test("transaction workbook contains ERP document and item sheets without desktop system keys", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "erp-workbook-test-"));
  try {
    const payload = { distributorId: "D", firmId: "F", BillSeries: "A", BillNo: 1, PartyCode: "1518", items: [{ productCode: "K042", productName: "Product", quantity: 20, batchNo: "5", mrp: 10 }] };
    const file = createSourceWorkbook({ directory, id: "12345678-test" }, { entryType: "DesktopSales", label: "Sales" }, [{ rows: [{}] }], [{ "ERP Payload JSON": JSON.stringify(payload) }]);
    const workbook = XLSX.read(fs.readFileSync(file.filePath), { type: "buffer" });
    assert.deepEqual(workbook.SheetNames, ["Data", "items"]);
    const [header] = XLSX.utils.sheet_to_json(workbook.Sheets.Data, { defval: "" });
    const [item] = XLSX.utils.sheet_to_json(workbook.Sheets.items, { defval: "" });
    assert.equal(header.PartyCode, "1518"); assert.equal(item.productCode, "K042"); assert.equal(item.quantity, 20);
    assert.equal("SysAcCode" in header, false); assert.equal("SysProdCode" in item, false);
    const [hydrated] = readDesktopWorkbook(file.filePath, "DesktopSales");
    assert.equal(hydrated.payload.PartyCode, "1518"); assert.equal(hydrated.payload.items[0].productCode, "K042");
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("previously generated credit-note workbooks normalize a blank series before retry", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "erp-credit-note-test-"));
  try {
    const filePath = path.join(directory, "credit-note.xlsx");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ distributorId: "D", firmId: "F", CreditNoteSeries: "", CreditNoteNo: 1, PartyCode: "A20" }]), "Data");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ CreditNoteSeries: "", CreditNoteNo: 1, ProductCode: "P10", Qty: 1 }]), "items");
    XLSX.writeFile(workbook, filePath);
    const [record] = readDesktopWorkbook(filePath, "DesktopCreditNote");
    assert.equal(record.payload.CreditNoteSeries, "CN");
    assert.equal(record.payload.items.length, 1);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("historical desktop credit notes do not reapply live sales-bill validation", () => {
  const server = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /if \(billNo > 0 && req\.body\._desktopImport !== true\)/);
});

test("zero-value historical sales remain editable without creating an invalid journal", () => {
  const server = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /const isZeroValueSalesEdit =/);
  assert.match(server, /if \(!isZeroValueSalesEdit\) \{\s*await postBalancedJournal/);
});

test("only desktop sales may retain zero-quantity historical items", () => {
  const zeroItem = [{ productCode: "P1", quantity: 0, free: 0, rate: 10, gst: 5 }];
  assert.throws(() => calculateSalesFinancials({}, zeroItem), /quantity must be positive/);

  const historical = calculateSalesFinancials({}, zeroItem, { allowZeroQuantityItems: true });
  assert.equal(historical.items.length, 1);
  assert.equal(historical.TotalQty, 0);
  assert.equal(historical.NetAmount, 0);
});

test("desktop sales preserve mixed positive and zero-quantity items without changing totals", () => {
  const historical = calculateSalesFinancials({}, [
    { productCode: "P1", quantity: 2, free: 0, rate: 10, gst: 5 },
    { productCode: "P2", quantity: 0, free: 0, rate: 25, gst: 5 },
  ], { allowZeroQuantityItems: true });

  assert.equal(historical.items.length, 2);
  assert.equal(historical.TotalQty, 2);
  assert.equal(historical.GrossAmount, 20);
  assert.equal(historical.NetAmount, 21);
});

test("desktop sales skip stock movement only for zero-quantity historical items", () => {
  const server = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /allowZeroQuantityItems: req\.body\._desktopImport === true/);
  assert.match(server, /skipZeroQuantityItems:\s*req\.body\._desktopImport === true/);
  assert.match(server, /if \(skipZeroQuantityItems && totalQty === 0\) \{\s*continue;/);
});

test("desktop receipts match a blank bill series exactly and retain unmatched legacy allocations", () => {
  const server = fs.readFileSync(new URL("../transaction.js", import.meta.url), "utf8");
  assert.match(server, /body\._desktopImport === true \? \{ BillSeries: bill\.trnSeries \} : \{\}/);
  assert.match(server, /billFilter\.BillDate = bill\.trnDate;/);
  assert.match(server, /bill\.legacyUnmatched = true;/);
});

test("desktop batch order imports stock sources before sales and receipts", () => {
  assert.ok(DESKTOP_IMPORT_ORDER.indexOf("Company") < DESKTOP_IMPORT_ORDER.indexOf("Category"));
  assert.ok(DESKTOP_IMPORT_ORDER.indexOf("Category") < DESKTOP_IMPORT_ORDER.indexOf("Group"));
  assert.ok(DESKTOP_IMPORT_ORDER.indexOf("Group") < DESKTOP_IMPORT_ORDER.indexOf("Product"));
  assert.ok(DESKTOP_IMPORT_ORDER.indexOf("Product") < DESKTOP_IMPORT_ORDER.indexOf("DesktopOpeningStock"));
  assert.ok(DESKTOP_IMPORT_ORDER.indexOf("DesktopOpeningStock") < DESKTOP_IMPORT_ORDER.indexOf("DesktopPurchase"));
  assert.ok(DESKTOP_IMPORT_ORDER.indexOf("DesktopPurchase") < DESKTOP_IMPORT_ORDER.indexOf("DesktopSales"));
  assert.ok(DESKTOP_IMPORT_ORDER.indexOf("AreaToPartyMapping") < DESKTOP_IMPORT_ORDER.indexOf("DesktopSales"));
  assert.ok(DESKTOP_IMPORT_ORDER.indexOf("DesktopSales") < DESKTOP_IMPORT_ORDER.indexOf("DesktopReceipt"));
  assert.ok(DESKTOP_IMPORT_ORDER.indexOf("DesktopReceipt") < DESKTOP_IMPORT_ORDER.indexOf("DesktopCHB"));
});

test("stock-mutating desktop imports are serialized to avoid write conflicts", () => {
  assert.equal(desktopTransactionConcurrency("DesktopPurchase"), 1);
  assert.equal(desktopTransactionConcurrency("DesktopOpeningStock"), 1);
  assert.equal(desktopTransactionConcurrency("DesktopStockIn"), 1);
  assert.equal(desktopTransactionConcurrency("DesktopStockOut"), 1);
  assert.equal(desktopTransactionConcurrency("DesktopSales"), 1);
  assert.equal(desktopTransactionConcurrency("DesktopCounterSales"), 1);
  assert.equal(desktopTransactionConcurrency("DesktopCreditNote"), 1);
  assert.equal(desktopTransactionConcurrency("DesktopReceipt"), 1);
});

test("desktop sales can be reconciled by their stored bill identity after an uncertain response", () => {
  const tenant = { distributorId: "D1", firmId: "F1" };
  assert.deepEqual(
    desktopCommittedTransactionFilter("DesktopSales", { BillSeries: " 26-27/ ", BillNo: "42" }, tenant),
    { ...tenant, BillSeries: "26-27/", BillNo: 42 },
  );
  assert.deepEqual(
    desktopCommittedTransactionFilter("DesktopCounterSales", { BillSeries: "CS", BillNo: 7 }, tenant),
    { ...tenant, BillSeries: "CS", BillNo: 7 },
  );
  assert.deepEqual(
    desktopCommittedTransactionFilter("DesktopCreditNote", { CreditNoteSeries: " CN ", CreditNoteNo: "8" }, tenant),
    { ...tenant, CreditNoteSeries: "CN", CreditNoteNo: 8 },
  );
  assert.equal(desktopCommittedTransactionFilter("DesktopReceipt", {}, tenant), null);
});

test("a repeated desktop import refreshes preflight instead of replaying the stale ready rows", () => {
  const selection = ["sales-file"];
  const cached = { importPlan: { files: [] }, importOptions: { fileIds: selection, companyCode: "C1" } };
  assert.equal(canReuseDesktopImportPlan({ ...cached, importState: null }, selection, "C1"), true);
  assert.equal(canReuseDesktopImportPlan({ ...cached, importState: { status: "completed_with_errors" } }, selection, "C1"), false);
  assert.equal(canReuseDesktopImportPlan({ ...cached, importState: { status: "completed" } }, selection, "C1"), false);
});

test("desktop receipt rows map the party, bank and bill allocations for outstanding updates", () => {
  const references = {
    products: new Map(), companies: new Map(), areas: new Map(), godowns: new Map(), groups: new Map(),
    salesmen: new Map([["05", { SSMCode: "05", SSMName: "Sales Person" }]]),
    banks: new Map([["7", { BankCode: "7", BankName: "Drawee Bank" }]]),
    accounts: new Map([["20", { AcCode: "PARTY", AcName: "Customer" }], ["30", { AcCode: "BANK", AcName: "Firm Bank" }]]),
  };
  const [row] = buildDesktopTransactionRows({
    job: { distributorId: "D", firmId: "F" }, definition: { entryType: "DesktopReceipt", label: "Receipt" }, references,
    sheets: [
      { sheet: "Header", rows: [{ TrnSeries: "R", TrnNo: 2, TrnDate: "2026-01-03", SysAcCodeDr: 20, SysAcCodeCr: 30, Bankcode: 7, SSMcode: "05", MicrCode: "MICR", LoadNo: 25, RloadNo: 3 }] },
      { sheet: "Details", rows: [{ TrnSeries: "R", TrnNo: 2, AdjTrnSeries: "S", AdjTrnNo: 1, NowAdjAmt: 75, DiscAmt: 5 }] },
    ],
  });
  const payload = JSON.parse(row["ERP Payload JSON"]);
  assert.equal(payload._desktopImport, true); assert.equal(payload.rno, 2);
  assert.equal(payload.partyId, "PARTY"); assert.equal(payload.bankCash, "BANK"); assert.equal(payload.receiptAmount, 75);
  assert.equal(payload.bankCashName, "Firm Bank"); assert.equal(payload.bankCashGroup, "BANK ACCOUNTS");
  assert.equal(payload.drawerBankId, "7"); assert.equal(payload.drawerBankName, "Drawee Bank");
  assert.equal(payload.salesmanId, "05"); assert.equal(payload.salesmanName, "Sales Person");
  assert.equal(payload.micr, "MICR"); assert.equal(payload.loadNo, "25"); assert.equal(payload.rloadNo, "3");
  assert.deepEqual(payload.receiptBills[0], { trnSeries: "S", trnNo: "1", trnDate: "", nowAdjust: 75, discAmt: 5, remark: "" });
});

test("desktop receipt import creates only missing receiving bank accounts", async () => {
  const inserted = [];
  const collection = {
    find() { return { toArray: async () => [{ accountCode: "EXISTING" }] }; },
    async insertMany(rows) { inserted.push(...rows); return { insertedIds: { 0: "new-id" } }; },
  };
  const ids = await ensureDesktopReceiptBankAccounts({
    tenant: { distributorId: "D", firmId: "F" }, firmName: "Firm", collection,
    records: [
      { payload: { bankCash: "EXISTING", bankCashName: "Existing Bank", bankCashGroup: "BANK ACCOUNTS" } },
      { payload: { bankCash: "CASH1", bankCashName: "Main Cash", bankCashGroup: "CASH IN HAND" } },
    ],
  });
  assert.deepEqual(ids, ["new-id"]);
  assert.equal(inserted.length, 1);
  assert.deepEqual({ code: inserted[0].accountCode, name: inserted[0].accountName, group: inserted[0].accountGroup }, { code: "CASH1", name: "Main Cash", group: "CASH IN HAND" });
});

test("streaming receipt reader keeps receiptBills separate when the nested sheet is emitted first", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "erp-receipt-stream-test-"));
  try {
    const job = { id: "stream-order", directory };
    const definition = { entryType: "DesktopReceipt" };
    const rows = [{
      receiptDate: "2026-07-08", billSeries: "", rno: 915, partyId: "2925", partyName: "Customer",
      bankCash: "16", receiptAmount: 786, distributorId: "D", firmId: "F",
      receiptBills: [{ trnSeries: "", trnNo: "25", trnDate: "2026-07-08", nowAdjust: 786, discAmt: 0, remark: "" }],
    }];
    const generated = createSourceWorkbook(job, definition, [], rows.map((payload) => ({ "ERP Payload JSON": JSON.stringify(payload) })));
    const records = await readDesktopWorkbookStreaming(generated.filePath, "DesktopReceipt");
    assert.equal(records.length, 1);
    assert.equal(records[0].payload.partyId, "2925");
    assert.equal(records[0].payload.receiptBills.length, 1);
    assert.equal(records[0].payload.receiptBills[0].nowAdjust, 786);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
