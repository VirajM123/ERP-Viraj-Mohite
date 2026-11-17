const firstValue = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

const optionalNumber = (source, ...keys) => {
  const value = firstValue(source, keys);
  if (value === undefined || (typeof value === "string" && !value.trim())) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const number = (source, ...keys) => optionalNumber(source, ...keys) ?? 0;

const text = (source, ...keys) =>
  String(firstValue(source, keys) ?? "").trim();

export const getPartySalesDetailValues = (item = {}, product = {}, stock = {}) => {
  const selectedBatch =
    item.selectedBatch && typeof item.selectedBatch === "object"
      ? item.selectedBatch
      : {};
  const billQty =
    optionalNumber(item, "billQty", "BillQty", "qty", "Qty", "quantity", "Quantity", "saleQty", "SaleQty") ??
    optionalNumber(item, "OQty", "oQty") ??
    0;
  const unit = text(item, "unit", "Unit", "units", "Units") || text(product, "basicUnit", "BasicUnit");
  const boxPack =
    optionalNumber(item, "boxPack", "BoxPack") ??
    optionalNumber(selectedBatch, "boxPack", "BoxPack") ??
    optionalNumber(stock, "BoxPack", "boxPack") ??
    optionalNumber(product, "boxPack", "BoxPack") ??
    1;
  const legacyQty = optionalNumber(item, "OQty", "oQty");
  const reportQty =
    legacyQty ??
    (unit.toLowerCase() === "box" ? billQty * boxPack : billQty);
  const reportRate =
    optionalNumber(item, "ORate", "oRate", "unitRate", "UnitRate", "rate", "Rate") ??
    number(item, "salesRate", "SalesRate", "saleRate", "SaleRate");
  const billRate =
    optionalNumber(item, "billRate", "BillRate", "Rate") ??
    optionalNumber(item, "salesRate", "SalesRate", "saleRate", "SaleRate") ??
    reportRate;

  const tprAmount = number(item, "tprAmount", "TPRAmount", "tprAmt", "TPRAmt");
  const schemeAmount = number(item, "schemeAmount", "SchemeAmount", "schemeAmt", "schAmount", "schAmt", "SchAmt");
  const starAmount = number(item, "starDiscountAmount", "StarDiscountAmount", "starAmount", "StarAmount", "starAmt", "StarAmt", "StarProdLevel", "starProdLevel");
  const bottomDiscountAmount = number(item, "btmDiscountAmount", "BtmDiscountAmount", "bottomDiscountAmount", "BottomDiscountAmount", "btmAmount", "BtmAmount", "btmAmt", "BtmAmt", "BtmProdLevel", "btmProdLevel");
  const cashDiscountAmount = number(item, "cashDiscountAmount", "CashDiscountAmount", "cashDiscountAmt", "cdAmount", "cdAmt", "CDAmount", "CDAmt");
  const discountAmount =
    optionalNumber(item, "discountAmount", "DiscountAmount", "discAmount", "DiscAmount", "discAmt", "DiscAmt") ??
    tprAmount + schemeAmount + starAmount + bottomDiscountAmount;

  const cgstAmount = number(item, "cgstAmount", "CGSTAmount", "cgstAmt", "CGSTAmt", "cgst", "CGST");
  const sgstAmount = number(item, "sgstAmount", "SGSTAmount", "sgstAmt", "SGSTAmt", "sgst", "SGST");
  const igstAmount = number(item, "igstAmount", "IGSTAmount", "igstAmt", "IGSTAmt", "igst", "IGST");
  const componentGst = cgstAmount + sgstAmount + igstAmount;
  const grossAmount =
    optionalNumber(item, "grossAmount", "GrossAmount", "grossAmt", "GrossAmt") ??
    reportQty * reportRate;
  const gstAmount =
    componentGst ||
    number(item, "gstAmount", "GSTAmount", "gstAmt", "GSTAmt", "vatAmount", "VatAmount", "vatAmt", "VatAmt");
  const taxableAmount =
    optionalNumber(item, "taxableAmount", "TaxableAmount", "taxable", "Taxable", "taxableValue", "TaxableValue") ??
    grossAmount - tprAmount - schemeAmount - starAmount - bottomDiscountAmount - cashDiscountAmount;
  const netAmount =
    optionalNumber(item, "netAmount", "NetAmount", "netAmt", "amount", "Amount") ??
    grossAmount - tprAmount - schemeAmount - starAmount - bottomDiscountAmount - cashDiscountAmount + gstAmount;
  const normalizedBoxPack = boxPack > 0 ? boxPack : 1;
  const caseCount = Math.floor(reportQty / normalizedBoxPack);
  const caseRemainder = Math.floor(reportQty - caseCount * normalizedBoxPack);
  const caseQty =
    text(item, "caseQty", "CaseQty") || `${caseCount}/${caseRemainder}`;

  return {
    shortCode: text(item, "shortCode", "ShortCode", "productShortCode", "ProductShortCode") ||
      text(product, "shortCode", "ShortCode", "productShortCode", "ProductShortCode"),
    localProduct: text(item, "localProduct", "LocalProduct", "localProductName", "LocalProductName", "LocalProdName") ||
      text(product, "localProduct", "LocalProduct", "localProductName", "LocalProductName", "LocalProdName", "description"),
    unit,
    reportQty,
    billQty,
    reportRate,
    billRate,
    boxPack: normalizedBoxPack,
    caseQty,
    grossAmount,
    discountAmount,
    cashDiscountAmount,
    taxableAmount,
    tprAmount,
    schemeAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    gstAmount,
    netAmount,
  };
};

export const getPartySalesHeaderTotals = (bill = {}, withCreditNote = false) => {
  const grossAmount = number(bill, "GrossAmount", "grossAmount", "GrossAmt", "grossAmt");
  const tprAmount = number(bill, "TPRAmount", "tprAmount", "TPRAmt", "tprAmt");
  const schemeAmount = number(bill, "SchemeAmount", "schemeAmount", "SchAmt", "schemeAmt");
  const cashDiscountAmount = number(bill, "CashDiscountAmount", "cashDiscountAmount", "CDAmount", "CDAmt", "cdAmt");
  const starDiscountAmount = number(bill, "StarDiscountAmount", "starDiscountAmount", "StarAmount", "starAmount");
  const taxableAmount = number(bill, "TaxableValue", "taxableValue", "TaxableAmount", "taxableAmount", "taxable");
  const componentGst =
    number(bill, "CGSTAmount", "cgstAmount", "cgstAmt", "cgst") +
    number(bill, "SGSTAmount", "sgstAmount", "sgstAmt", "sgst") +
    number(bill, "IGSTAmount", "igstAmount", "igstAmt", "igst");
  const gstAmount =
    componentGst ||
    number(bill, "GSTAmount", "gstAmount", "VatAmount", "vatAmount", "VatAmt", "vatAmt");
  const creditNoteAmount = number(bill, "CreditNoteAmount", "creditNoteAmount");
  const storedNetAmount = optionalNumber(bill, "NetAmount", "netAmount", "NetAmt", "netAmt");
  const originalNetAmount = optionalNumber(bill, "OriginalNetAmount", "originalNetAmount");
  const netAfterCredit =
    storedNetAmount ??
    (originalNetAmount !== undefined
      ? originalNetAmount - creditNoteAmount
      : 0);
  const netBeforeCredit =
    originalNetAmount !== undefined && (originalNetAmount !== 0 || netAfterCredit === 0)
      ? originalNetAmount
      : netAfterCredit + creditNoteAmount;

  return {
    grossAmount,
    tprAmount,
    schemeAmount,
    discountAmount: tprAmount + schemeAmount + starDiscountAmount,
    cashDiscountAmount,
    taxableAmount,
    gstAmount,
    creditNoteAmount: withCreditNote ? creditNoteAmount : 0,
    netAmount: withCreditNote ? netAfterCredit : netBeforeCredit,
  };
};

export const getPartySalesBillTotals = (bill = {}) => {
  const headerTotals = getPartySalesHeaderTotals(bill);
  const items = Array.isArray(bill.items) ? bill.items : [];
  if (!items.length) return headerTotals;
  const hasLineField = (...keys) =>
    items.some((item) => keys.some((key) =>
      item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== ""
    ));

  const lineTotals = items
    .map((item) => getPartySalesDetailValues(item))
    .reduce(
      (totals, line) => ({
        grossAmount: totals.grossAmount + line.grossAmount,
        discountAmount: totals.discountAmount + line.discountAmount,
        cashDiscountAmount: totals.cashDiscountAmount + line.cashDiscountAmount,
        taxableAmount: totals.taxableAmount + line.taxableAmount,
        gstAmount: totals.gstAmount + line.gstAmount,
      }),
      {
        grossAmount: 0,
        discountAmount: 0,
        cashDiscountAmount: 0,
        taxableAmount: 0,
        gstAmount: 0,
      }
    );

  return {
    ...headerTotals,
    grossAmount: lineTotals.grossAmount,
    discountAmount: hasLineField(
      "discountAmount", "DiscountAmount", "discAmount", "DiscAmount",
      "tprAmt", "TPRAmt", "tprAmount", "TPRAmount",
      "schemeAmt", "SchAmt", "schemeAmount", "SchemeAmount",
      "starAmt", "StarAmt", "starAmount", "StarAmount", "StarProdLevel",
      "btmAmount", "BtmAmount", "btmDiscountAmount", "BtmDiscountAmount"
    ) ? lineTotals.discountAmount : headerTotals.discountAmount,
    cashDiscountAmount: hasLineField(
      "cashDiscountAmount", "CashDiscountAmount", "cashDiscountAmt",
      "cdAmount", "cdAmt", "CDAmount", "CDAmt"
    ) ? lineTotals.cashDiscountAmount : headerTotals.cashDiscountAmount,
    taxableAmount: hasLineField(
      "taxableAmount", "TaxableAmount", "taxable", "Taxable", "taxableValue", "TaxableValue"
    ) ? lineTotals.taxableAmount : headerTotals.taxableAmount,
    gstAmount: hasLineField(
      "cgstAmount", "CGSTAmount", "cgstAmt", "CGSTAmt", "cgst", "CGST",
      "sgstAmount", "SGSTAmount", "sgstAmt", "SGSTAmt", "sgst", "SGST",
      "igstAmount", "IGSTAmount", "igstAmt", "IGSTAmt", "igst", "IGST",
      "gstAmount", "GSTAmount", "gstAmt", "GSTAmt", "vatAmount", "VatAmount", "vatAmt", "VatAmt"
    ) ? lineTotals.gstAmount : headerTotals.gstAmount,
  };
};

export const getCreditNoteReportValues = (creditNote = {}) => {
  const items = Array.isArray(creditNote.items)
    ? creditNote.items
    : Array.isArray(creditNote.Items)
      ? creditNote.Items
      : [];
  const lines = items.map((item) => getPartySalesDetailValues(item));
  const lineTotals = lines.reduce(
    (totals, line, index) => {
      const item = items[index] || {};
      totals.grossAmount += line.grossAmount;
      totals.discountAmount += line.discountAmount;
      totals.cashDiscountAmount += line.cashDiscountAmount;
      totals.taxableAmount += line.taxableAmount;
      totals.tprAmount += line.tprAmount;
      totals.schemeAmount += line.schemeAmount;
      totals.gstAmount += line.gstAmount;
      totals.netAmount += line.netAmount;
      totals.starAmount += number(item, "starAmt", "StarAmt", "starAmount", "StarAmount", "StarProdLevel", "starProdLevel");
      return totals;
    },
    {
      grossAmount: 0,
      discountAmount: 0,
      cashDiscountAmount: 0,
      taxableAmount: 0,
      tprAmount: 0,
      schemeAmount: 0,
      gstAmount: 0,
      netAmount: 0,
      starAmount: 0,
    }
  );
  const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
  const headerGstTotal = optionalNumber(creditNote, "GSTAmount", "gstAmount", "VatAmount", "vatAmount");
  const headerCgst = optionalNumber(creditNote, "CGSTAmount", "cgstAmount");
  const headerSgst = optionalNumber(creditNote, "SGSTAmount", "sgstAmount");
  const headerIgst = optionalNumber(creditNote, "IGSTAmount", "igstAmount");
  const headerGstAmount = headerGstTotal ??
    (headerCgst !== undefined || headerSgst !== undefined || headerIgst !== undefined
      ? number(creditNote, "CGSTAmount", "cgstAmount") +
        number(creditNote, "SGSTAmount", "sgstAmount") +
        number(creditNote, "IGSTAmount", "igstAmount")
      : undefined);
  const headerDiscount = optionalNumber(creditNote, "discountAmount", "DiscountAmount");
  const headerTpr = optionalNumber(creditNote, "TPRAmount", "tprAmount");
  const headerScheme = optionalNumber(creditNote, "SchemeAmount", "schemeAmount");
  const headerStar = optionalNumber(creditNote, "StarAmount", "starAmount");
  const headerDiscountAmount = headerDiscount ??
    (headerTpr !== undefined || headerScheme !== undefined || headerStar !== undefined
      ? number(creditNote, "TPRAmount", "tprAmount") +
        number(creditNote, "SchemeAmount", "schemeAmount") +
        number(creditNote, "StarAmount", "starAmount")
      : undefined);
  const noteNetAmount =
    optionalNumber(creditNote, "NetAmount", "netAmount", "NetAmt", "netAmt", "amount", "Amount") ??
    lineTotals.netAmount;
  const remainder = {
    grossAmount: optionalNumber(creditNote, "GrossAmount", "grossAmount") === undefined
      ? 0
      : roundMoney(optionalNumber(creditNote, "GrossAmount", "grossAmount") - lineTotals.grossAmount),
    discountAmount: headerDiscountAmount === undefined
      ? 0
      : roundMoney(headerDiscountAmount - lineTotals.discountAmount),
    cashDiscountAmount: optionalNumber(creditNote, "CashDiscountAmount", "cashDiscountAmount") === undefined
      ? 0
      : roundMoney(optionalNumber(creditNote, "CashDiscountAmount", "cashDiscountAmount") - lineTotals.cashDiscountAmount),
    taxableAmount: optionalNumber(creditNote, "TaxableValue", "taxableValue") === undefined
      ? 0
      : roundMoney(optionalNumber(creditNote, "TaxableValue", "taxableValue") - lineTotals.taxableAmount),
    tprAmount: optionalNumber(creditNote, "TPRAmount", "tprAmount") === undefined
      ? 0
      : roundMoney(optionalNumber(creditNote, "TPRAmount", "tprAmount") - lineTotals.tprAmount),
    schemeAmount: optionalNumber(creditNote, "SchemeAmount", "schemeAmount") === undefined
      ? 0
      : roundMoney(optionalNumber(creditNote, "SchemeAmount", "schemeAmount") - lineTotals.schemeAmount),
    starAmount: optionalNumber(creditNote, "StarAmount", "starAmount") === undefined
      ? 0
      : roundMoney(optionalNumber(creditNote, "StarAmount", "starAmount") - lineTotals.starAmount),
    gstAmount: headerGstAmount === undefined
      ? 0
      : roundMoney(headerGstAmount - lineTotals.gstAmount),
    netAmount: roundMoney(noteNetAmount - lineTotals.netAmount),
  };

  return {
    lines,
    netAmount: roundMoney(noteNetAmount),
    remainder,
    remainderNetAmount: remainder.netAmount,
  };
};

export const groupPartySalesDetailRows = (rows) => {
  const groupFields = [
    "billDate",
    "billSeries",
    "billNo",
    "shortCode",
    "productCode",
    "productName",
    "localProduct",
    "mrp",
    "reportRate",
    "unit",
    "billRate",
    "reportBoxPack",
  ];
  const totalFields = [
    "qty",
    "reportQty",
    "billQty",
    "freeQty",
    "grossAmount",
    "discountAmount",
    "cashDiscountAmount",
    "taxableAmount",
    "tprAmount",
    "schemeAmount",
    "cgstAmount",
    "sgstAmount",
    "igstAmount",
    "gstAmount",
    "creditNoteAmount",
    "netAmount",
  ];
  const grouped = new Map();

  rows.forEach((row) => {
    const key = JSON.stringify(groupFields.map((field) => row[field] ?? ""));
    if (!grouped.has(key)) {
      grouped.set(key, { ...row });
      return;
    }

    const group = grouped.get(key);
    totalFields.forEach((field) => {
      group[field] = number({ value: group[field] }, "value") + number({ value: row[field] }, "value");
    });
  });

  return Array.from(grouped.values()).map((row) => {
    if (!row.caseQty) return row;
    const boxPack = Number(row.reportBoxPack) > 0 ? Number(row.reportBoxPack) : 1;
    const reportQty = Math.trunc(Number(row.reportQty) || 0);
    const caseCount = Math.floor(reportQty / boxPack);
    const caseRemainder = Math.floor(reportQty - caseCount * boxPack);
    return {
      ...row,
      reportQty,
      freeQty: Math.trunc(Number(row.freeQty) || 0),
      caseQty: `${caseCount}/${caseRemainder}`,
    };
  });
};
