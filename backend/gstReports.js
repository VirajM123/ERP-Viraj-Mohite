import express from "express";

export const GST_RATES = [0, 5, 12, 18, 28];

const text = (...values) => {
  const value = values.find((entry) => entry !== undefined && entry !== null && String(entry).trim() !== "");
  return value === undefined ? "" : String(value).trim();
};

const number = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
};

const round = (value) => Math.round((number(value) + Number.EPSILON) * 100) / 100;
const sum = (rows, getter) => round(rows.reduce((total, row) => total + number(getter(row)), 0));
const itemValue = (item, ...keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== "");
const itemRate = (item) => number(itemValue(item, "GSTPercent", "gstPercent", "gst", "VatPer", "vatPercent"));
const itemTaxable = (item) => number(itemValue(item, "TaxableValue", "taxableValue", "taxable", "Taxable", "amount", "Amount"));
const itemTax = (item) => {
  const direct = itemValue(item, "GSTAmount", "gstAmount", "gstAmt", "VatAmt", "vatAmt");
  if (direct !== undefined) return number(direct);
  const split = number(itemValue(item, "CGST", "cgst", "CGSTAmount", "cgstAmount"))
    + number(itemValue(item, "SGST", "sgst", "SGSTAmount", "sgstAmount"))
    + number(itemValue(item, "IGST", "igst", "IGSTAmount", "igstAmount"));
  return split || (itemTaxable(item) * itemRate(item)) / 100;
};
const itemMrpValue = (item) => number(itemValue(item, "MRPValue", "mrpValue"))
  || number(itemValue(item, "MRP", "mrp")) * (number(itemValue(item, "Qty", "qty")) + number(itemValue(item, "Free", "free", "FreeQty", "freeQty")));

const rateFields = (items, prefix) => Object.fromEntries(GST_RATES.flatMap((rate) => {
  const matching = items.filter((item) => Math.abs(itemRate(item) - rate) < 0.001);
  return [[`${prefix}${rate}`, sum(matching, itemTaxable)], [`GST${rate}`, sum(matching, itemTax)]];
}));

const active = (row) => row?.isActive !== false
  && row?.IsBillCancelled !== true
  && text(row?.BillStatus, row?.Status).toUpperCase() !== "CANCELLED";

const inDateRange = (value, fromDate, toDate) => {
  const date = text(value).slice(0, 10);
  return Boolean(date) && (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
};

const invoiceItems = (row) => Array.isArray(row?.items) ? row.items : Array.isArray(row?.Items) ? row.Items : [];
const registrationType = (account) => text(account?.gstType) || (text(account?.gstNo) ? "Registered" : "Unregistered");
const addressOf = (account) => [text(account?.address, account?.billToAdd1), text(account?.add2), text(account?.town)].filter(Boolean).join(", ");

export const buildAccountMap = (accounts = []) => new Map(accounts.map((account) => [
  text(account.accountCode, account.code),
  account,
]));

const matchesCommonFilters = (row, account, filters, kind) => {
  const series = text(row.BillSeries, row.vouSer, row.CreditNoteSeries, row.DebitNoteSeries);
  const gstChoice = text(filters.gstNo, "all").toLowerCase();
  const gstNo = text(account?.gstNo, row.GSTNo, row.gstNo);
  if (text(filters.specificSeries).toUpperCase() === "Y" && text(filters.series) && series !== text(filters.series)) return false;
  if (gstChoice === "registered" && !gstNo) return false;
  if (gstChoice === "unregistered" && gstNo) return false;
  if (kind === "sales" && text(filters.billType) && text(filters.billType).toLowerCase() !== "all"
      && text(row.BillType).toLowerCase() !== text(filters.billType).toLowerCase()) return false;
  const requestedTaxOn = text(filters.taxOnType).toLowerCase();
  const rowTaxOn = text(row.TaxOn, row.taxOn, ...invoiceItems(row).map((item) => item.TaxOn || item.taxOn)).toLowerCase();
  if (requestedTaxOn && requestedTaxOn !== "all" && rowTaxOn && rowTaxOn !== requestedTaxOn) return false;
  if (text(filters.invoiceType) && text(filters.invoiceType).toLowerCase() !== "all"
      && registrationType(account).toLowerCase() !== text(filters.invoiceType).toLowerCase()) return false;
  return true;
};

const salesColumns = [
  ["SrNo", "SrNo."], ["TrnSeries", "TrnSeries"], ["Date", "Date"], ["TrnNo", "TrnNo"],
  ["GSTNo", "GSTNo"], ["GSTType", "GSTType"], ["GstRegDate", "GstRegDate"], ["GSTCloseDate", "GSTCloseDate"],
  ["PartyName", "Party Name"], ["Tin", "Tin"], ["Address", "Address"], ["DeemedTaxableValue", "Deemed Taxable Value"], ["SalesValue", "Sales Value"],
  ...GST_RATES.flatMap((rate) => [[`Sales${rate}`, `Sales ${rate.toFixed(2)} % (GST ON SALES PRICE)`], [`GST${rate}`, `GST ${rate.toFixed(2)} % (GST ON SALES PRICE)`]]),
  ["TotalGST", "Total GST"], ["GstR1Value", "GSTR1 Value"], ["AddLessMinus", "AddLess (-)"], ["AddLessPlus", "AddLess (+)"],
  ["BillValue", "Bill Value"], ["CrnInBill", "CRN In Bill"], ["GrossAmt", "Gross Amt"], ["Rounding", "Rounding"],
  ["Surcharge", "Surcharge"], ["TaxOn", "Tax On"], ["Cess", "Cess"], ["MRPValue", "MRP Value"],
].map(([key, label]) => ({ key, label }));

const purchaseColumns = [
  ["SrNo", "SrNo."], ["TrnSeries", "TrnSeries"], ["Date", "Date"], ["TrnNo", "TrnNo"], ["PartyName", "Party Name"],
  ["InvNo", "InvNo"], ["InvDate", "InvDate"], ["GSTNo", "GSTNo"], ["GSTType", "GSTType"], ["Address", "Address"],
  ["MRPValue", "MRP Value"], ["Taxable", "Taxable"], ["GSTPurchaseValue", "GST Purchase Value"], ["Cess1", "Cess1"],
  ...GST_RATES.flatMap((rate) => [[`Purchase${rate}`, `Purchase ${rate.toFixed(2)} % (GST ON SALES PRICE)`], [`GST${rate}`, `GST ${rate.toFixed(2)} % (GST ON SALES PRICE)`]]),
  ["TotalGST", "Total GST"], ["TotalTCS", "Total TCS"], ["TDS", "TDS"], ["OtherLess", "OtherLess"], ["Rounding", "Rounding"], ["BillAmt", "Bill Amt"], ["Surcharge", "Surcharge"],
].map(([key, label]) => ({ key, label }));

const crnColumns = [
  ["SrNo", "SrNo."], ["TrnSeries", "TrnSeries"], ["Date", "Date"], ["TrnNo", "TrnNo"], ["PartyName", "Party Name"],
  ["GSTNo", "GSTNo"], ["GSTType", "GSTType"], ["Address", "Address"], ["Taxable", "Taxable"],
  ...GST_RATES.flatMap((rate) => [[`CRN${rate}`, `CRN ${rate.toFixed(2)} % (GST ON SALES PRICE)`], [`GST${rate}`, `GST ${rate.toFixed(2)} % (GST ON SALES PRICE)`]]),
  ["TotalTax", "Total Tax"], ["CessAMT", "CessAMT"], ["Rounding", "Rounding"], ["BillAmt", "Bill Amt"],
].map(([key, label]) => ({ key, label }));

const summaryColumns = ["SrNo", "AccountName", "Taxable", "GSTAmt", "IGST", "CGST", "SGST", "Cess1", "Cess2", "SalesType", "DeemedTaxableValue", "MRPValue"]
  .map((key) => ({ key, label: key === "SrNo" ? "SrNo." : key === "AccountName" ? "Account Name" : key === "GSTAmt" ? "GST Amt" : key.replace(/([a-z])([A-Z])/g, "$1 $2") }));

const gstr1Column = (key, label = key) => ({ key, label });
const GSTR1_COLUMNS = {
  B2B: [
    ["SrNo", "SrNo"], ["GSTNo", "GSTNo"], ["PartyName", "Party Name"], ["InvoiceNo", "Invoice No"],
    ["InvoiceDate", "Invoice Date"], ["InvoiceValue", "Invoice Value"], ["PlaceOfSupply", "Place of Supply"],
    ["ReverseCharge", "Reverse Charge"], ["ApplicableTaxRate", "Applicable % of Tax Rate"], ["InvoiceType", "Invoice Type"],
    ["ECommerceGSTIN", "E-Commerce GSTIN"], ["Rate", "Rate"], ["Taxable", "Taxable"], ["CessAmt", "Cess Amt"],
    ["SalesType", "SalesType"], ["DeemedTaxableValue", "Deemed Taxable Value"], ["IGSTValue", "IGST Value"],
    ["CGSTValue", "CGST Value"], ["SGSTValue", "SGST Value"], ["PartyCode", "Party Code"], ["IRNNo", "IRN No"],
  ],
  B2CL: [
    ["SrNo", "SrNo"], ["InvoiceNo", "Invoice No"], ["InvoiceDate", "Invoice Date"], ["InvoiceValue", "Invoice Value"],
    ["PlaceOfSupply", "Place of Supply"], ["Rate", "Rate"], ["Taxable", "Taxable"], ["CessAmt", "Cess Amt"],
    ["ECommerceGSTIN", "E-Commerce GSTIN"], ["PartyCode", "Party Code"], ["PartyName", "Party Name"],
  ],
  B2CS: [
    ["SrNo", "SrNo"], ["Type", "Type"], ["PlaceOfSupply", "Place Of Supply"], ["ApplicableTaxRate", "Applicable % of Tax Rate"],
    ["Rate", "Rate"], ["Taxable", "Taxable"], ["CessAmt", "Cess Amt"], ["ECommerceGSTIN", "E-Commerce GSTIN"],
    ["IGSTValue", "IGST Value"], ["CGSTValue", "CGST Value"], ["SGSTValue", "SGST Value"],
    ["DeemedTaxableValue", "Deemed Taxable Value"], ["MRPValue", "MRP Value"], ["InvoiceValue", "Invoice Value"], ["SalesType", "Sales Type"],
  ],
  Cdnr: [
    ["SrNo", "SrNo"], ["GSTNo", "GSTNo"], ["PartyName", "Party Name"], ["CreditNoteNo", "Crn Vou No"],
    ["CreditNoteDate", "Crn Vou date"], ["DocumentType", "Document Type"], ["PlaceOfSupply", "Place of Supply"],
    ["ReverseCharge", "Reverse Charge"], ["SupplyType", "Supply Type"], ["CreditNoteValue", "Crn Value"],
    ["ApplicableTaxRate", "Applicable % of TaxRate"], ["Rate", "Rate"], ["Taxable", "Taxable"], ["CessAmt", "Cess Amt"],
    ["PreGST", "PreGST"], ["SalesType", "SalesType"], ["DeemedTaxableValue", "Deemed Taxable Value"],
    ["Narration", "Narration"], ["RefNo", "RefNo"], ["RefDate", "Ref Date"], ["PartyCode", "Party Code"],
    ["ReceiptNo", "Inv/Adv Receipt No"], ["ReceiptDate", "Inv/Adv Receipt date"], ["Reason", "Reason For Issuing document"],
    ["BillSeries", "Bill Series"], ["BillNo", "Bill No"], ["IRNNo", "IRN No"],
  ],
  Cdnur: [
    ["SrNo", "SrNo"], ["URType", "UR Type"], ["ReceiptNo", "Inv/Adv Receipt No"], ["ReceiptDate", "Inv/Adv Receipt date"],
    ["DocumentType", "Document Type"], ["DebitNoteNo", "Drn Vou No"], ["DebitNoteDate", "Drn Vou date"],
    ["Reason", "Reason For Issuing document"], ["PlaceOfSupply", "Place of Supply"], ["DebitNoteValue", "Drn Value"],
    ["Rate", "Rate"], ["Taxable", "Taxable"], ["CessAmt", "Cess Amt"], ["PreGST", "PreGST"], ["Narration", "Narration"],
  ],
  HSN: [
    ["SrNo", "SrNo"], ["HSNCode", "HSNCode"], ["Description", "Description"], ["Unit", "Unit"], ["Qty", "Qty"],
    ["NetValue", "Net Value"], ["GSTPER", "GSTPER"], ["Taxable", "Taxable"], ["IGST", "IGST"], ["CGST", "CGST"],
    ["SGST", "SGST"], ["Cess", "Cess"], ["SalesType", "SalesType"], ["DeemedTaxableValue", "Deemed Taxable Value"], ["MRPValue", "MRPValue"],
  ],
  Docs: [
    ["Nature", "Nature  of Document"], ["FromBillNo", "From BillNo"], ["ToBillNo", "To BillNo"],
    ["TotalBills", "Total Bills"], ["CancelledBills", "Cancelled Bills"],
  ],
  HSNR: [],
  HSNU: [],
};
GSTR1_COLUMNS.HSNR = GSTR1_COLUMNS.HSN.filter(({ key }) => key !== "MRPValue");
GSTR1_COLUMNS.HSNU = GSTR1_COLUMNS.HSN.filter(({ key }) => key !== "MRPValue");
Object.keys(GSTR1_COLUMNS).forEach((name) => {
  GSTR1_COLUMNS[name] = GSTR1_COLUMNS[name].map((entry) => Array.isArray(entry) ? gstr1Column(...entry) : entry);
});

const formatGstrDate = (value) => {
  const source = text(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source)) return text(value);
  const [year, month, day] = source.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  }).replace(/ /g, "-");
};

const itemQty = (item) => number(itemValue(item, "TotalQty", "totalQty"))
  || number(itemValue(item, "Qty", "qty", "quantity")) + number(itemValue(item, "Free", "free", "FreeQty", "freeQty"));
const itemHsn = (item) => text(itemValue(item, "HSNCode", "hsnCode", "HSN", "hsn"));
const itemUnit = (item) => text(itemValue(item, "Unit", "unit", "BasicUnit", "basicUnit"), "PCS-PIECES");
const itemDescription = (item) => text(itemValue(item, "Description", "description", "ProductName", "productName"));
const itemCess = (item) => number(itemValue(item, "CessAmount", "cessAmount", "Cess", "cess"));
const itemSplitTax = (item, key) => number(itemValue(item, key, key.toLowerCase(), `${key}Amount`, `${key.toLowerCase()}Amount`));
const isRegistered = (account) => Boolean(text(account?.gstNo));
const isDamageBill = (bill) => invoiceItems(bill).some((item) => text(item.TRN, item.trn).toUpperCase() === "DGR");

const groupedInvoiceRates = (document) => {
  const items = invoiceItems(document);
  const groups = new Map();
  const sourceItems = items.length ? items : [{}];
  for (const item of sourceItems) {
    const rate = itemRate(item);
    if (!groups.has(rate)) groups.set(rate, []);
    groups.get(rate).push(item);
  }
  const totalTaxable = sum(sourceItems, itemTaxable) || number(document.TaxableValue);
  return [...groups.entries()].map(([rate, rateItems]) => {
    const taxable = sum(rateItems, itemTaxable) || (groups.size === 1 ? number(document.TaxableValue) : 0);
    const ratio = totalTaxable ? taxable / totalTaxable : 1 / groups.size;
    const split = (key, documentKey) => sum(rateItems, (item) => itemSplitTax(item, key))
      || round(number(document[documentKey]) * ratio);
    return {
      rate,
      items: rateItems,
      taxable,
      cess: sum(rateItems, itemCess),
      igst: split("IGST", "IGSTAmount"),
      cgst: split("CGST", "CGSTAmount"),
      sgst: split("SGST", "SGSTAmount"),
      mrpValue: sum(rateItems, itemMrpValue),
    };
  });
};

const salesDocumentValue = (bill) => round(number(bill.OriginalNetAmount, bill.NetAmount, bill.GrossAmount));
const billIrn = (bill) => text(bill.IRNNo, bill.irnNo, bill.IrnNo, bill.historicalSnapshot?.irnNo);
const billNumber = (bill) => text(bill.BillNo, bill.VNo);
const placeOfSupply = (account, document) => text(account?.state, document.PlaceOfSupply, document.placeOfSupply);

const makeSupplyRateRow = (bill, account, group) => ({
  InvoiceNo: billNumber(bill),
  InvoiceDate: formatGstrDate(bill.BillDate),
  InvoiceValue: salesDocumentValue(bill),
  PlaceOfSupply: placeOfSupply(account, bill),
  Rate: group.rate,
  Taxable: group.taxable,
  CessAmt: group.cess,
  ApplicableTaxRate: "",
  ECommerceGSTIN: "",
  SalesType: text(bill.TaxOn, bill.taxOn, ...group.items.map((item) => item.TaxOn || item.taxOn), "GST ON SALES PRICE"),
  DeemedTaxableValue: group.taxable,
  IGSTValue: group.igst,
  CGSTValue: group.cgst,
  SGSTValue: group.sgst,
  MRPValue: group.mrpValue,
  PartyCode: text(bill.PartyCode),
  PartyName: text(bill.PartyName, account?.accountName),
});

const addTotalsRow = (rows, labelKey, numericKeys) => {
  const total = { [labelKey]: "Total", RowType: "total" };
  numericKeys.forEach((key) => { total[key] = sum(rows, (row) => row[key]); });
  return [...rows, total];
};

const buildHsnRows = (salesDocuments, creditDocuments, accountMap, registrationFilter) => {
  const groups = new Map();
  const addDocuments = (documents, sign) => documents.forEach((document) => {
    const account = accountMap.get(text(document.PartyCode)) || {};
    if (registrationFilter !== null && isRegistered(account) !== registrationFilter) return;
    invoiceItems(document).forEach((item) => {
      const rate = itemRate(item);
      const key = `${itemHsn(item)}|${itemUnit(item)}|${rate}`;
      if (!groups.has(key)) groups.set(key, {
        HSNCode: itemHsn(item), Description: itemDescription(item), Unit: itemUnit(item), GSTPER: rate,
        Qty: 0, NetValue: 0, Taxable: 0, IGST: 0, CGST: 0, SGST: 0, Cess: 0, DeemedTaxableValue: 0, MRPValue: 0,
      });
      const row = groups.get(key);
      const taxable = itemTaxable(item);
      const tax = itemTax(item);
      row.Qty += sign * itemQty(item);
      row.NetValue += sign * (number(itemValue(item, "NetAmount", "netAmount", "Amount", "amount")) || taxable + tax + itemCess(item));
      row.Taxable += sign * taxable;
      row.IGST += sign * itemSplitTax(item, "IGST");
      row.CGST += sign * itemSplitTax(item, "CGST");
      row.SGST += sign * itemSplitTax(item, "SGST");
      row.Cess += sign * itemCess(item);
      row.DeemedTaxableValue += sign * taxable;
      row.MRPValue += sign * itemMrpValue(item);
      row.SalesType = text(item.TaxOn, item.taxOn, "GST ON SALES PRICE");
    });
  });
  addDocuments(salesDocuments, 1);
  addDocuments(creditDocuments, -1);
  return [...groups.values()].sort((a, b) => a.HSNCode.localeCompare(b.HSNCode) || a.GSTPER - b.GSTPER)
    .map((row, index) => ({ SrNo: index + 1, ...Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "number" ? round(value) : value])) }));
};

export const buildGstr1Sections = (bills, creditNotes, accountMap, filters = {}) => {
  const salesDocuments = bills.filter((bill) => inDateRange(bill.BillDate, filters.fromDate, filters.toDate))
    .filter((bill) => matchesCommonFilters(bill, accountMap.get(text(bill.PartyCode)), filters, "sales"))
    .filter((bill) => text(filters.withDamage, "Y").toUpperCase() === "Y" || !isDamageBill(bill));
  const creditDocuments = creditNotes.filter((note) => inDateRange(note.VDate, filters.fromDate, filters.toDate))
    .filter((note) => matchesCommonFilters(note, accountMap.get(text(note.PartyCode)), filters, "credit"));
  const b2b = [];
  const b2cl = [];
  const b2csDetails = [];

  salesDocuments.filter(active).forEach((bill) => {
    const account = accountMap.get(text(bill.PartyCode)) || {};
    groupedInvoiceRates(bill).forEach((group) => {
      const base = makeSupplyRateRow(bill, account, group);
      if (isRegistered(account)) {
        b2b.push({ ...base, GSTNo: text(account.gstNo), ReverseCharge: "N", InvoiceType: "Regular", IRNNo: billIrn(bill) });
      } else {
        const interstateLarge = Boolean(group.igst) && salesDocumentValue(bill) > 250000;
        if (interstateLarge) b2cl.push(base);
        else b2csDetails.push({ ...base, Type: "OE" });
      }
    });
  });

  const numberRows = (rows) => rows.map((row, index) => ({ SrNo: row.RowType === "total" ? "" : index + 1, ...row }));
  const b2csAggregates = new Map();
  b2csDetails.forEach((row) => {
    const key = `${row.Type}|${row.PlaceOfSupply}|${row.Rate}|${row.SalesType}`;
    if (!b2csAggregates.has(key)) b2csAggregates.set(key, { ...row, InvoiceNo: undefined, InvoiceDate: undefined, PartyCode: undefined, PartyName: undefined });
    else {
      const target = b2csAggregates.get(key);
      ["Taxable", "CessAmt", "IGSTValue", "CGSTValue", "SGSTValue", "DeemedTaxableValue", "MRPValue", "InvoiceValue"].forEach((field) => { target[field] = round(number(target[field]) + number(row[field])); });
    }
  });

  const registeredCredits = [];
  const unregisteredCredits = [];
  creditDocuments.filter(active).forEach((note) => {
    const account = accountMap.get(text(note.PartyCode)) || {};
    groupedInvoiceRates(note).forEach((group) => {
      const common = {
        GSTNo: text(account.gstNo), PartyName: text(note.PartyName, account.accountName), CreditNoteNo: text(note.CreditNoteNo, note.VNo),
        CreditNoteDate: formatGstrDate(note.VDate), DocumentType: "C", PlaceOfSupply: placeOfSupply(account, note), ReverseCharge: "N",
        SupplyType: "Regular", CreditNoteValue: round(number(note.NetAmount, note.amount)), ApplicableTaxRate: "", Rate: group.rate,
        Taxable: group.taxable, CessAmt: group.cess, PreGST: "N", SalesType: text(...group.items.map((item) => item.TaxOn || item.taxOn), "GST ON SALES PRICE"),
        DeemedTaxableValue: group.taxable, Narration: text(note.Narration), RefNo: text(note.RefBy, note.BillNo), RefDate: formatGstrDate(note.RefDate),
        PartyCode: text(note.PartyCode), ReceiptNo: text(note.BillNo, note.RefBy), ReceiptDate: formatGstrDate(note.RefDate), Reason: "",
        BillSeries: text(note.BillSeries), BillNo: text(note.BillNo), IRNNo: billIrn(note),
      };
      if (isRegistered(account)) registeredCredits.push(common);
      else unregisteredCredits.push({
        URType: "B2CS", ReceiptNo: common.ReceiptNo, ReceiptDate: common.ReceiptDate, DocumentType: "C",
        DebitNoteNo: common.CreditNoteNo, DebitNoteDate: common.CreditNoteDate, Reason: common.Reason,
        PlaceOfSupply: common.PlaceOfSupply, DebitNoteValue: common.CreditNoteValue, Rate: common.Rate,
        Taxable: common.Taxable, CessAmt: common.CessAmt, PreGST: common.PreGST, Narration: common.Narration,
      });
    });
  });

  const documentRows = (documents, numberKey, label) => {
    if (!documents.length) return { Nature: label, FromBillNo: "", ToBillNo: "", TotalBills: 0, CancelledBills: 0 };
    const values = documents.map((row) => number(row[numberKey])).filter((value) => Number.isFinite(value));
    return { Nature: label, FromBillNo: values.length ? Math.min(...values) : "", ToBillNo: values.length ? Math.max(...values) : "", TotalBills: documents.length, CancelledBills: documents.filter((row) => !active(row)).length };
  };
  const docs = [
    documentRows(creditDocuments, "CreditNoteNo", "Credit Note"),
    documentRows(salesDocuments, "BillNo", "Invoice for outward supply"),
  ];
  docs.push({ Nature: "Total", FromBillNo: "", ToBillNo: "", TotalBills: sum(docs, (row) => row.TotalBills), CancelledBills: sum(docs, (row) => row.CancelledBills), RowType: "total" });

  const hsnRows = (registrationFilter) => addTotalsRow(
    buildHsnRows(salesDocuments.filter(active), creditDocuments.filter(active), accountMap, registrationFilter),
    "HSNCode",
    ["Qty", "NetValue", "Taxable", "IGST", "CGST", "SGST", "Cess", "DeemedTaxableValue", "MRPValue"],
  ).map((row) => row.RowType === "total" ? { ...row, SrNo: "" } : row);
  const section = (name, rows) => ({ name, columns: GSTR1_COLUMNS[name], rows });
  return [
    section("B2B", numberRows(addTotalsRow(b2b, "InvoiceNo", ["Taxable", "CessAmt", "IGSTValue", "CGSTValue", "SGSTValue"]))),
    section("B2CL", numberRows(addTotalsRow(b2cl, "InvoiceNo", ["Taxable", "CessAmt"]))),
    section("B2CS", numberRows(addTotalsRow([...b2csAggregates.values()], "PlaceOfSupply", ["Taxable", "CessAmt", "IGSTValue", "CGSTValue", "SGSTValue", "DeemedTaxableValue", "MRPValue", "InvoiceValue"]))),
    section("Cdnr", numberRows(addTotalsRow(registeredCredits, "CreditNoteNo", ["Taxable", "CessAmt"]))),
    section("Cdnur", numberRows(addTotalsRow(unregisteredCredits, "DebitNoteNo", ["Taxable", "CessAmt"]))),
    section("HSN", hsnRows(null)),
    section("Docs", docs),
    section("HSNR", hsnRows(true)),
    section("HSNU", hsnRows(false)),
  ];
};

export const buildSalesGSTRows = (bills, accountMap, filters = {}) => bills.filter(active).filter((bill) => inDateRange(bill.BillDate, filters.fromDate, filters.toDate)).filter((bill) => {
  const account = accountMap.get(text(bill.PartyCode));
  return matchesCommonFilters(bill, account, filters, "sales");
}).map((bill, index) => {
  const items = invoiceItems(bill); const account = accountMap.get(text(bill.PartyCode)) || {};
  const totalGST = number(bill.CGSTAmount) + number(bill.SGSTAmount) + number(bill.IGSTAmount) || sum(items, itemTax);
  const rounding = number(bill.Rounding, bill.RoundingAmount, bill.AddLessAmount);
  return { SrNo: index + 1, TrnSeries: text(bill.BillSeries), Date: text(bill.BillDate), TrnNo: number(bill.BillNo), GSTNo: text(account.gstNo), GSTType: registrationType(account), GstRegDate: text(account.gstDate), GSTCloseDate: text(account.gstClsDate), PartyName: text(bill.PartyName, account.accountName), Tin: text(account.tinNo), Address: addressOf(account), DeemedTaxableValue: round(number(bill.TaxableValue) || sum(items, itemTaxable)), SalesValue: round(number(bill.TaxableValue) || sum(items, itemTaxable)), ...rateFields(items, "Sales"), TotalGST: round(totalGST), GstR1Value: round(number(bill.OriginalNetAmount, bill.NetAmount)), AddLessMinus: rounding < 0 ? Math.abs(rounding) : 0, AddLessPlus: rounding > 0 ? rounding : 0, BillValue: round(number(bill.OriginalNetAmount, bill.NetAmount)), CrnInBill: round(number(bill.CreditNoteAmount)), GrossAmt: round(number(bill.GrossAmount)), Rounding: round(rounding), Surcharge: round(number(bill.Surcharge)), TaxOn: text(bill.TaxOn, bill.taxOn, ...items.map((item) => item.TaxOn || item.taxOn), "GST ON SALES PRICE"), Cess: round(number(bill.CessAmount) || sum(items, (item) => itemValue(item, "CessAmount", "cessAmount"))), MRPValue: sum(items, itemMrpValue), IsDamage: items.some((item) => text(item.TRN, item.trn).toUpperCase() === "DGR"), _IGST: round(number(bill.IGSTAmount) || sum(items, (item) => itemValue(item, "IGST", "igst", "IGSTAmount", "igstAmount"))), _CGST: round(number(bill.CGSTAmount) || sum(items, (item) => itemValue(item, "CGST", "cgst", "CGSTAmount", "cgstAmount"))), _SGST: round(number(bill.SGSTAmount) || sum(items, (item) => itemValue(item, "SGST", "sgst", "SGSTAmount", "sgstAmount"))) };
});

export const buildPurchaseGSTRows = (bills, accountMap, filters = {}) => bills.filter(active).filter((bill) => inDateRange(bill.invoiceDate, filters.fromDate, filters.toDate)).map((bill, index) => {
  const items = invoiceItems(bill); const account = accountMap.get(text(bill.supplierCode)) || {};
  const totalGST = number(bill.cgstAmt) + number(bill.sgstAmt) + number(bill.igstAmt) || sum(items, itemTax);
  return { SrNo: index + 1, TrnSeries: text(bill.vouSer), Date: text(bill.invoiceDate), TrnNo: number(bill.vouNo), PartyName: text(bill.supplierName, account.accountName), InvNo: text(bill.invoiceNumber), InvDate: text(bill.invoiceDate), GSTNo: text(account.gstNo), GSTType: registrationType(account), Address: addressOf(account), MRPValue: round(number(bill.mrpTotal) || sum(items, itemMrpValue)), Taxable: round(number(bill.groBsAmt, bill.TaxableValue) || sum(items, itemTaxable)), GSTPurchaseValue: round(number(bill.groBsAmt, bill.TaxableValue) || sum(items, itemTaxable)), Cess1: round(number(bill.ceBsAmt) || sum(items, (item) => itemValue(item, "CessAmount", "cessAmount"))), ...rateFields(items, "Purchase"), TotalGST: round(totalGST), TotalTCS: round(number(bill.tcbAmount)), TDS: round(number(bill.tdsAmount)), OtherLess: round(number(bill.diBc3)), Rounding: round(number(bill.rounding)), BillAmt: round(number(bill.netAmt, bill.grossAmount)), Surcharge: round(number(bill.surcharge)), _IGST: round(number(bill.igstAmt) || sum(items, (item) => itemValue(item, "IGST", "igst"))), _CGST: round(number(bill.cgstAmt) || sum(items, (item) => itemValue(item, "CGST", "cgst"))), _SGST: round(number(bill.sgstAmt) || sum(items, (item) => itemValue(item, "SGST", "sgst"))) };
}).filter((row) => text(filters.reportWith, "gst").toLowerCase() !== "gst" || row.TotalGST !== 0);

export const buildCrnGSTRows = (notes, accountMap, filters = {}) => notes.filter(active).filter((note) => inDateRange(note.VDate, filters.fromDate, filters.toDate)).filter((note) => matchesCommonFilters(note, accountMap.get(text(note.PartyCode)), filters, "credit")).map((note, index) => {
  const items = invoiceItems(note); const account = accountMap.get(text(note.PartyCode)) || {};
  const totalTax = number(note.GSTAmount) || sum(items, itemTax);
  return { SrNo: index + 1, TrnSeries: text(note.CreditNoteSeries), Date: text(note.VDate), TrnNo: number(note.CreditNoteNo, note.VNo), PartyName: text(note.PartyName, account.accountName), GSTNo: text(account.gstNo), GSTType: registrationType(account), Address: addressOf(account), Taxable: round(number(note.TaxableValue) || sum(items, itemTaxable)), ...rateFields(items, "CRN"), TotalTax: round(totalTax), CessAMT: round(number(note.CessAmount)), Rounding: round(number(note.Rounding, note.AddLess)), BillAmt: round(number(note.NetAmount, note.amount)), _IGST: sum(items, (item) => itemValue(item, "IGST", "igst")), _CGST: sum(items, (item) => itemValue(item, "CGST", "cgst")), _SGST: sum(items, (item) => itemValue(item, "SGST", "sgst")) };
});

const aggregateSection = (section, sourceRows, itemPrefix, grossKey) => GST_RATES.map((rate, index) => {
  const taxableKey = `${itemPrefix}${rate}`; const gstKey = `GST${rate}`;
  const taxable = sum(sourceRows, (row) => row[taxableKey]); const gst = sum(sourceRows, (row) => row[gstKey]);
  return { SrNo: index + 1, AccountName: `GST - [${rate.toFixed(2)}%]`, Taxable: taxable, GSTAmt: gst, IGST: sum(sourceRows, (row) => number(row._IGST) * (number(row[gstKey]) / (number(row.TotalGST, row.TotalTax) || 1))), CGST: sum(sourceRows, (row) => number(row._CGST) * (number(row[gstKey]) / (number(row.TotalGST, row.TotalTax) || 1))), SGST: sum(sourceRows, (row) => number(row._SGST) * (number(row[gstKey]) / (number(row.TotalGST, row.TotalTax) || 1))), Cess1: sum(sourceRows, (row) => number(row.Cess1, row.CessAMT, row.Cess) * (number(row[taxableKey]) / (number(row.Taxable, row.SalesValue, row.DeemedTaxableValue) || 1))), Cess2: 0, SalesType: "GST ON SALES PRICE", DeemedTaxableValue: taxable, MRPValue: sum(sourceRows, (row) => number(row.MRPValue) * (number(row[taxableKey]) / (number(row.Taxable, row.SalesValue, row.DeemedTaxableValue) || 1))), RowType: "detail", Section: section, Gross: sum(sourceRows, (row) => row[grossKey] * (number(row[taxableKey]) / (number(row.Taxable, row.SalesValue, row.DeemedTaxableValue) || 1))) };
}).filter((row) => row.Taxable || row.GSTAmt || row.Gross);

const summaryAmountKeys = ["Taxable", "GSTAmt", "IGST", "CGST", "SGST", "Cess1", "Cess2"];
const sectionTotal = (rows) => ({
  AccountName: "Total",
  ...Object.fromEntries(summaryAmountKeys.map((key) => [key, sum(rows, (row) => row[key])])),
  RowType: "total",
});
const sectionBlock = (name, details, showHeaderZeroes = false) => [
  { AccountName: name, ...(showHeaderZeroes ? Object.fromEntries(summaryAmountKeys.map((key) => [key, 0])) : {}), DeemedTaxableValue: showHeaderZeroes ? 0 : "", MRPValue: showHeaderZeroes ? 0 : "", RowType: "section" },
  ...details,
  sectionTotal(details),
  { AccountName: "", RowType: "spacer" },
];

export const buildGstSummaryRows = ({ salesRows, purchaseRows, crnRows, debitRows }) => {
  const sales = aggregateSection("Sales", salesRows, "Sales", "GrossAmt");
  const purchase = aggregateSection("Purchase", purchaseRows, "Purchase", "BillAmt");
  const salesReturn = aggregateSection("Sales Return", crnRows, "CRN", "BillAmt");
  const purchaseReturn = aggregateSection("Purchase Return", debitRows, "Purchase", "BillAmt");
  const zeroSections = ["Jou Debit [Vat in]", "Jou [Vat Paid]", "Expenses", "Sales Service", "Purchase Service"];
  const salesTotal = sectionTotal(sales); const purchaseTotal = sectionTotal(purchase);
  const salesReturnTotal = sectionTotal(salesReturn); const purchaseReturnTotal = sectionTotal(purchaseReturn);
  const finalTax = Object.fromEntries(["IGST", "CGST", "SGST", "Cess1", "Cess2"].map((key) => [
    key,
    round(number(salesTotal[key]) - number(purchaseTotal[key]) - number(salesReturnTotal[key]) + number(purchaseReturnTotal[key])),
  ]));
  const netGstPaid = round(finalTax.IGST + finalTax.CGST + finalTax.SGST + finalTax.Cess1 + finalTax.Cess2);
  return [
    ...sectionBlock("Sales", sales, true),
    ...sectionBlock("Purchase", purchase),
    ...sectionBlock("Sales Return", salesReturn),
    ...sectionBlock("Purchase Return", purchaseReturn),
    ...zeroSections.flatMap((name) => sectionBlock(name, [])),
    { AccountName: "Final Total", ...finalTax, RowType: "final" },
    { AccountName: "", RowType: "spacer" },
    { AccountName: "Summary", RowType: "section" },
    { AccountName: "Net GST Paid", SGST: netGstPaid, RowType: "summary" },
    { AccountName: "", RowType: "spacer" },
    { AccountName: "Check Previous Return before Paid", RowType: "note" },
  ];
};

const totalColumns = (columns, rows) => Object.fromEntries(columns.filter((column) => !["SrNo", "TrnNo"].includes(column.key) && rows.some((row) => typeof row[column.key] === "number")).map((column) => [column.key, sum(rows, (row) => row[column.key])]));

export default function createGstReportsRouter({ SalesHeader, PurchaseHeader, CreditNote, DebitNote, Account, OtherAccount }) {
  const router = express.Router();
  router.get("/gst/:report", async (req, res) => {
    try {
      const distributorId = text(req.auth?.distributorId); const firmId = text(req.auth?.firmId);
      const fromDate = text(req.query.fromDate); const toDate = text(req.query.toDate);
      if (!distributorId || !firmId) return res.status(400).json({ success: false, message: "distributorId and firmId are required." });
      if (!fromDate || !toDate) return res.status(400).json({ success: false, message: "From Date and To Date are required." });
      if (fromDate > toDate) return res.status(400).json({ success: false, message: "From Date cannot be greater than To Date." });
      const scope = { distributorId, firmId };
      const between = { $gte: fromDate, $lte: toDate };
      const [sales, purchases, credits, debits, customers, suppliers] = await Promise.all([
        SalesHeader.find({ ...scope, BillDate: between }).lean(), PurchaseHeader.find({ ...scope, invoiceDate: between }).lean(), CreditNote.find({ ...scope, VDate: between }).lean(), DebitNote.find({ ...scope, VDate: between }).lean(), Account.find(scope).lean(), OtherAccount.find(scope).lean(),
      ]);
      const accounts = buildAccountMap([...customers, ...suppliers]); const filters = req.query;
      const salesRows = buildSalesGSTRows(sales, accounts, filters); const purchaseRows = buildPurchaseGSTRows(purchases, accounts, filters); const crnRows = buildCrnGSTRows(credits, accounts, filters);
      const debitRows = buildPurchaseGSTRows(debits.map((row) => ({ ...row, invoiceDate: row.VDate, vouSer: row.DebitNoteSeries, vouNo: row.DebitNoteNo, supplierCode: row.SupplierCode, supplierName: row.SupplierName, netAmt: row.NetAmount, grossAmount: row.GrossAmount, rounding: row.RoundingAmount, cgstAmt: sum(invoiceItems(row), (item) => item.CGST), sgstAmt: sum(invoiceItems(row), (item) => item.SGST), igstAmt: sum(invoiceItems(row), (item) => item.IGST) })), accounts, filters);
      let rows; let columns; let title; let sections;
      switch (req.params.report) {
        case "sales-register": rows = salesRows; columns = salesColumns; title = "Sales GST Register"; break;
        case "purchase-register": rows = purchaseRows; columns = purchaseColumns; title = "Purchase GST Register"; break;
        case "crn-register": rows = crnRows; columns = crnColumns; title = "CRN GST Register"; break;
        case "summary": rows = buildGstSummaryRows({ salesRows, purchaseRows, crnRows, debitRows }); columns = summaryColumns; title = "GST Summary"; break;
        case "gstr1": {
          sections = buildGstr1Sections(sales, credits, accounts, filters);
          const firstSection = sections[0] || { rows: [], columns: [] };
          rows = firstSection.rows;
          columns = firstSection.columns;
          title = "GSTR1 Report";
          break;
        }
        default: return res.status(404).json({ success: false, message: "Unknown GST report." });
      }
      const isSummaryReport = req.params.report === "summary";
      const sourceRows = isSummaryReport ? [...salesRows, ...purchaseRows, ...crnRows, ...debitRows] : sections ? salesRows : rows;
      return res.json({ success: true, title, columns, rows, sections, totals: isSummaryReport || sections ? {} : totalColumns(columns, rows), summary: { records: sections ? salesRows.length : rows.length, taxable: sum(sourceRows, (row) => row.Taxable || row.SalesValue || row.DeemedTaxableValue), gst: sum(sourceRows, (row) => row.TotalGST || row.TotalTax || row.GSTAmt), billValue: sum(sourceRows, (row) => row.BillValue || row.BillAmt) } });
    } catch (error) {
      console.error("GST report error:", error);
      return res.status(500).json({ success: false, message: "Failed to generate GST report.", error: error.message });
    }
  });
  return router;
}
