const text = (value) => String(value ?? "").trim();
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const date = (value) => text(value).slice(0, 10);
const key = (row) => `${text(row.TrnSeries).toLowerCase()}\u0000${number(row.TrnNo)}`;
const mapBy = (rows, field) => new Map((rows || []).map((row) => [text(row[field]).toLowerCase(), row]));
const ref = (map, value) => map.get(text(value).toLowerCase()) || {};

const payloadRow = (job, definition, payload, fields = {}) => {
  payload.distributorId = job.distributorId;
  payload.firmId = job.firmId;
  payload._desktopImport = true;
  const json = JSON.stringify(payload); const chunks = json.match(/[\s\S]{1,30000}/g) || [""];
  const erpFields = Object.fromEntries(Object.entries(payload).filter(([name, value]) => name !== "_desktopImport" && (value === null || ["string", "number", "boolean"].includes(typeof value))));
  return {
    "Entry Type": definition.label,
    "Document Date": fields.date || "",
    Series: fields.series || "",
    Number: fields.number || 0,
    Party: fields.party || "",
    Amount: fields.amount || 0,
    ...erpFields,
    ...Object.fromEntries(chunks.map((chunk, index) => [index ? `ERP Payload JSON ${index + 1}` : "ERP Payload JSON", chunk])),
    "Distributor ID": job.distributorId,
    "Firm ID": job.firmId,
  };
};

const groupDetails = (rows) => {
  const groups = new Map();
  for (const row of rows || []) {
    const group = groups.get(key(row)) || [];
    group.push(row);
    groups.set(key(row), group);
  }
  return groups;
};

const productItem = (row, references, note = false) => {
  const product = ref(references.products, row.SysProdCode);
  const productCode = text(product.ProdCode || row.ProdCode || row.ProductCode);
  if (!productCode) throw new Error(`No ProdCode mapping was found in Mas_Product for desktop SysProdCode ${text(row.SysProdCode) || "(blank)"}.`);
  const unit = text(row.Unit) || "PCS";
  const boxPack = number(row.BoxPack || row.Box) || 1;
  const sourceRate = number(row.Rate || row.SRate);
  const erpRate = /^box$/i.test(unit) ? sourceRate / boxPack : sourceRate;
  const common = {
    productCode,
    productName: text(product.ProdName || row.ProdName || row.ProductName),
    batchNo: text(row.Batch) || ".",
    mrp: number(row.MRP),
    expDate: date(row.ExpDt),
    mfgDate: date(row.MfgDt),
    quantity: number(row.Qty),
    free: number(row.FrQty),
    rate: erpRate,
    salesRate: number(row.SRate || row.Rate),
    purRate: number(row.PRate || row.Rate),
    unit,
    boxPack,
    inBoxPack: number(row.InBoxPack || row.INBoxPack || row.InBox) || 1,
    gst: number(row.VATPer || row.Vat || row.GSTPercent),
    tprAmt: number(row.TPRAmt),
    schemeAmt: number(row.SchAmt || row.SchDisc),
    starAmt: number(row.StarAmt),
    cdAmt: number(row.CDAmt),
  };
  return note ? {
    ...common,
    ProductCode: common.productCode, ProductName: common.productName, Batch: common.batchNo,
    MRP: common.mrp, Qty: common.quantity, Free: common.free, Rate: common.rate,
    SRate: common.salesRate, PRate: common.purRate, Unit: common.unit,
    BoxPack: common.boxPack, InBoxPack: common.inBoxPack, TRN: text(row.Trn).toUpperCase() === "DGR" ? "DGR" : "GDR",
    GrossAmount: number(row.Amt || row.GrossAmount), TaxableValue: number(row.Taxable),
    GSTPercent: common.gst, CGST: number(row.CGST), SGST: number(row.SGST), IGST: number(row.IGST),
  } : common;
};

const masterName = (references, type, code, codeField, nameField, required = false) => {
  const row = ref(references[type], code);
  const result = { code: text(row[codeField]), name: text(row[nameField]) };
  if (required && !result.code) throw new Error(`No ${codeField} mapping was found for desktop ${type === "accounts" ? "SysAcCode" : "SysCompCode"} ${text(code) || "(blank)"}.`);
  return result;
};

const salesRows = (job, definition, headerRows, detailRows, references) => {
  const details = groupDetails(detailRows);
  // Some legacy Counter Sales header tables repeat the same bill once per
  // detail row. Export one document per API identity so createSourceWorkbook
  // does not multiply the complete item set for every repeated header.
  const uniqueHeaders = [...new Map(headerRows.map((header) => [key(header), header])).values()];
  return uniqueHeaders.map((header) => {
    const billDetails = details.get(key(header)) || [];
    const account = masterName(references, "accounts", header.SysAcCode, "AcCode", "AcName", true);
    const company = masterName(references, "companies", number(header.SysCompCode) > 0 ? header.SysCompCode : billDetails[0]?.SysCompCode, "CompCode", "CompName", true);
    const salesman = ref(references.salesmen, header.SSMCode);
    const area = ref(references.areas, header.AreaCode);
    const godown = ref(references.godowns, header.GDCode);
    const payload = {
      distributorId: job.distributorId, firmId: job.firmId,
      BillDate: date(header.TrnDate), DueDate: date(header.DueDate), BillSeries: text(header.TrnSeries), BillNo: number(header.TrnNo),
      BillType: text(header.BillType) || "Credit", SalesEntryType: definition.entryType === "DesktopCounterSales" ? "COUNTER_SALES" : "BILLING",
      GDCode: text(header.GDCode), Godown: text(godown.GDName), CompanyCode: company.code, CompanyName: company.name,
      AreaCode: text(header.AreaCode), AreaName: text(area.AreaName), PartyCode: account.code, PartyName: text(header.PName) || account.name,
      SalesmanCode: text(header.SSMCode), SalesmanName: text(salesman.SSMName || salesman.SalesmanName), Narration: text(header.Narr),
      DisplayAmount: number(header.DisplayAmt), CouponAmount: number(header.CouponAmt), AddLessAmount: number(header.ADDLessAmt),
      GrossAmount: number(header.GrossAmt), TPRAmount: number(header.TPRAmt), SchemeAmount: number(header.SchAmt),
      StarDiscountAmount: number(header.StarAmt), CashDiscountAmount: number(header.CDAmt),
      CGSTAmount: number(header.CGSTAmt), SGSTAmount: number(header.SGSTAmt), IGSTAmount: number(header.IGSTAmt), NetAmount: number(header.NetAmt),
      items: billDetails.map((row) => productItem(row, references)),
    };
    return payloadRow(job, definition, payload, { date: payload.BillDate, series: payload.BillSeries, number: payload.BillNo, party: payload.PartyName, amount: payload.NetAmount });
  });
};

const purchaseRows = (job, definition, headerRows, detailRows, references) => {
  const details = groupDetails(detailRows);
  return headerRows.map((header) => {
    const billDetails = details.get(key(header)) || [];
    const account = masterName(references, "accounts", header.SysAcCode, "AcCode", "AcName", true);
    const company = masterName(references, "companies", number(header.SysCompCode) > 0 ? header.SysCompCode : billDetails[0]?.SysCompCode, "CompCode", "CompName", true);
    const godown = ref(references.godowns, header.GDCode);
    const payload = {
      distributorId: job.distributorId, firmId: job.firmId,
      invoiceDate: date(header.InvDate || header.TrnDate), vouSer: text(header.TrnSeries), vouNo: number(header.TrnNo),
      supplierCode: account.code, supplierName: account.name, company: company.name,
      gdCode: text(header.GDCode), godownName: text(godown.GDName), invoiceNumber: text(header.InvNo), narration: text(header.Narr),
      isIgst: text(header.ISGST) || "N", rounding: number(header.RNDAmt), netAmt: number(header.NetAmt), grossAmount: number(header.GrossAmt),
      items: billDetails.map((row) => {
        const item = productItem(row, references);
        return {
          ...item,
          // The Purchase editor binds its visible input to `product`. Keep the
          // canonical code/name fields as well because stock posting uses them.
          product: [item.productCode, item.productName].filter(Boolean).join(" - "),
          purchaseRate: number(row.PRate || row.Rate),
          // Desktop BVDisc fields contain currency amounts, not percentages.
          // Keep them separate so normal ERP percentage discounts retain their
          // existing meaning and historical desktop invoices validate correctly.
          grossAmount: number(row.GrossAmount || row.Amt),
          disc1Amount: number(row.BVDisc1), disc2Amount: number(row.BVDisc2), disc3Amount: number(row.BVDisc3),
          disc1: 0, disc2: 0, disc3: 0, tax: number(row.VATPer),
        };
      }),
    };
    return payloadRow(job, definition, payload, { date: payload.invoiceDate, series: payload.vouSer, number: payload.vouNo, party: payload.supplierName, amount: payload.netAmt });
  });
};

const noteRows = (job, definition, headerRows, detailRows, references, credit) => {
  const details = groupDetails(detailRows);
  return headerRows.map((header) => {
    const billDetails = details.get(key(header)) || [];
    const account = masterName(references, "accounts", header.SysAcCode, "AcCode", "AcName", true);
    const company = masterName(references, "companies", number(header.SysCompCode) > 0 ? header.SysCompCode : billDetails[0]?.SysCompCode, "CompCode", "CompName", true);
    const godown = ref(references.godowns, header.GDCode);
    const seriesField = credit ? "CreditNoteSeries" : "DebitNoteSeries";
    const numberField = credit ? "CreditNoteNo" : "DebitNoteNo";
    const payload = {
      distributorId: job.distributorId, firmId: job.firmId, VDate: date(header.TrnDate), VNo: number(header.TrnNo),
      [seriesField]: text(header.TrnSeries) || (credit ? "CN" : "DN"), [numberField]: number(header.TrnNo), BillSeries: text(header.BillSeries), BillNo: number(header.BillNo),
      ...(credit ? { PartyCode: account.code, PartyName: text(header.PName) || account.name } : { SupplierCode: account.code, SupplierName: account.name }),
      GDCode: text(header.GDCode), Godown: text(godown.GDName), CompanyCode: company.code, CompanyName: company.name,
      Narration: text(header.Narr), GrossAmount: number(header.Amt), NetAmount: number(header.NetAmt), Rounding: number(header.RndAmt),
      GSTAmount: number(header.VatAmt), items: billDetails.map((row) => productItem(row, references, true)),
    };
    return payloadRow(job, definition, payload, { date: payload.VDate, series: payload[seriesField], number: payload[numberField], party: payload.PartyName || payload.SupplierName, amount: payload.NetAmount });
  });
};

const stockRows = (job, definition, headerRows, detailRows, references, adjustmentType) => {
  const headers = mapBy(headerRows, "TrnNo");
  return detailRows.map((row, index) => {
    const header = headers.get(text(row.TrnNo).toLowerCase()) || {};
    const product = ref(references.products, row.SysProdCode);
    const productCode = text(product.ProdCode || row.ProdCode || row.ProductCode);
    if (!productCode) throw new Error(`No ProdCode mapping was found in Mas_Product for desktop SysProdCode ${text(row.SysProdCode) || "(blank)"}.`);
    const godown = ref(references.godowns, row.GDCode || header.GDCode);
    const payload = {
      distributorId: job.distributorId, firmId: job.firmId, requestId: `desktop-${definition.entryType}-${text(row.TrnSeries)}-${number(row.TrnNo)}-${number(row.SeqNo) || index + 1}`,
      adjustmentType, voucherDate: date(row.TrnDate || header.TrnDate), gdCode: text(row.GDCode || header.GDCode), godownName: text(godown.GDName),
      prodCode: productCode, productName: text(product.ProdName), unit: text(row.Unit) || "PCS", batch: text(row.Batch) || ".",
      mrp: number(row.MRP), purchaseRate: number(row.PRate ?? row.Prate), salesRate: number(row.SRate ?? row.Srate ?? row.Rate), quantity: number(row.Qty), freeQuantity: number(row.FrQty),
      manufacturingDate: date(row.MfgDt), expiryDate: date(row.ExpDt ?? row.Expdt), boxPack: number(row.BoxPack) || 1, inBoxPack: number(row.INBoxPack) || 1, narration: text(header.Narr),
    };
    return payloadRow(job, definition, payload, { date: payload.voucherDate, series: text(row.TrnSeries), number: number(row.TrnNo), party: payload.productName, amount: payload.quantity + payload.freeQuantity });
  });
};

const receiptRows = (job, definition, headerRows, detailRows, references) => {
  const details = groupDetails(detailRows);
  return headerRows.map((header) => {
    const party = masterName(references, "accounts", header.SysAcCodeDr, "AcCode", "AcName", true);
    const bank = masterName(references, "accounts", header.SysAcCodeCr, "AcCode", "AcName", true);
    const draweeBank = ref(references.banks, header.Bankcode ?? header.BankCode);
    const salesman = ref(references.salesmen, header.SSMcode ?? header.SSMCode);
    const accountRow = ref(references.accounts, header.SysAcCodeCr);
    const accountGroupCode = accountRow.SysGrpCode ?? accountRow.SysGroupCode ?? accountRow.GrpCode ?? accountRow.GroupCode;
    const accountGroup = ref(references.groups, accountGroupCode);
    const sourceGroupName = text(accountGroup.GrpName || accountGroup.GroupName || accountRow.GrpName || accountRow.GroupName || accountRow.AcGroup);
    const bankCashGroup = /cash/i.test(sourceGroupName || bank.name) ? "CASH IN HAND" : "BANK ACCOUNTS";
    const receiptBills = (details.get(key(header)) || []).map((row) => ({
      trnSeries: text(row.AdjTrnSeries), trnNo: text(row.AdjTrnNo), trnDate: date(row.AdjTrnDate),
      nowAdjust: number(row.NowAdjAmt), discAmt: number(row.DiscAmt), remark: text(row.Remark),
    })).filter((row) => row.nowAdjust > 0 || row.discAmt > 0);
    const receiptAmount = receiptBills.reduce((sum, row) => sum + row.nowAdjust, 0);
    const payload = {
      receiptDate: date(header.TrnDate), billSeries: text(header.TrnSeries), rno: number(header.TrnNo), partyId: party.code, partyName: party.name,
      bankCash: bank.code || bank.name || "CASH", bankCashName: bank.name, bankCashGroup,
      salesmanId: text(header.SSMcode ?? header.SSMCode), salesmanName: text(salesman.SSMName || salesman.SalesmanName),
      drawerBankId: text(header.Bankcode ?? header.BankCode), drawerBankName: text(draweeBank.BankName || draweeBank.BName),
      receiptAmount, narration: text(header.Narr), chequeNo: text(header.Chqno ?? header.ChqNo), chequeDate: date(header.ChqDate),
      micr: text(header.MicrCode ?? header.MICRCode), loadNo: text(header.LoadNo), rloadNo: text(header.RloadNo), receiptBills,
    };
    return receiptBills.length ? payloadRow(job, definition, payload, { date: payload.receiptDate, series: payload.billSeries, number: payload.rno, party: payload.partyName, amount: receiptAmount }) : null;
  }).filter(Boolean);
};

const journalRows = (job, definition, rows, references) => [...groupDetails(rows).values()].map((lines) => {
  const first = lines[0] || {};
  const payload = {
    vDate: date(first.TrnDate), vNo: number(first.TrnNo), narration: text(first.Narr), reference: `${text(first.TrnSeries)}${number(first.TrnNo)}`,
    lines: lines.map((line) => {
      const account = masterName(references, "accounts", line.SysAcCode, "AcCode", "AcName", true);
      const debit = text(line.DrCr).toUpperCase().startsWith("D") ? number(line.Amt) : 0;
      return { accountCode: account.code || text(line.SysAcCode), accountName: account.name, debit, credit: debit ? 0 : number(line.Amt), narration: text(line.Narr) };
    }),
  };
  return payloadRow(job, definition, payload, { date: payload.vDate, series: text(first.TrnSeries), number: number(first.TrnNo), amount: payload.lines.reduce((sum, line) => sum + line.debit, 0) });
});

const contraRows = (job, definition, rows) => rows.map((row) => {
  const payload = { transactionDate: date(row.ConTrnDate), tranVNo: number(row.ConTrnNo), transactionType: text(row.ConType), amount: number(row.Amt), narration: text(row.Narr) };
  return payloadRow(job, definition, payload, { date: payload.transactionDate, series: text(row.ConTrnSeries), number: payload.tranVNo, amount: payload.amount });
});

const pdcRows = (job, definition, rows, references) => rows.map((row) => {
  const bank = masterName(references, "accounts", row.HBSysAcCode, "AcCode", "AcName", true);
  const payload = {
    depositDate: date(row.DeptDate), docSeries: text(row.PDCTrnSeries) || "PDC", docVNo: number(row.PDCTrnNo),
    houseBank: bank.code, bankName: bank.name, fromDate: date(row.FromChqDt), toDate: date(row.ToChqDt),
    clearingType: text(row.PDCType), clearingDate: date(row.ClrDate), narration: text(row.Narr), totalAmount: number(row.TotAmt), totalCheques: number(row.TotChq), cheques: [],
  };
  return payloadRow(job, definition, payload, { date: payload.depositDate, series: payload.docSeries, number: payload.docVNo, party: payload.bankName, amount: payload.totalAmount });
});

const collectionRows = (job, definition, headerRows, detailRows, references) => {
  const details = new Map();
  for (const row of detailRows) {
    const rowKey = `${text(row.ColTrnSeries).toLowerCase()}\u0000${number(row.ColTrnNo)}`;
    const group = details.get(rowKey) || []; group.push(row); details.set(rowKey, group);
  }
  return headerRows.map((header) => {
    const rowKey = `${text(header.ColTrnSeries).toLowerCase()}\u0000${number(header.ColTrnNo)}`;
    const bills = (details.get(rowKey) || []).map((row) => {
      const party = masterName(references, "accounts", row.SysAcCode, "AcCode", "AcName", true);
      return { billSeries: text(row.BillSeries), billNo: text(row.BillNo), billDate: date(row.BillDate), partyCode: party.code, partyName: party.name, billAmt: number(row.BillAmt), oldCollection: number(row.ColOldAmt), balance: number(row.BalAmt), collectionAmt: number(row.ColCurrAmt), recSeries: text(row.RecTrnSeries), recVNo: text(row.RecTrnNo) };
    });
    const payload = { collectionDate: date(header.ColTrnDate), colVNo: number(header.ColTrnNo), collectionType: text(header.ColType), narration: text(header.Narr), totalCollectionAmount: number(header.TotCurrColAmt), totalBills: bills.length, bills };
    return payloadRow(job, definition, payload, { date: payload.collectionDate, series: text(header.ColTrnSeries), number: payload.colVNo, amount: payload.totalCollectionAmount });
  });
};

const salesServiceRows = (job, definition, rows, references) => rows.map((row) => {
  const party = masterName(references, "accounts", row.SysAcCode, "AcCode", "AcName", true);
  const service = ref(references.services, row.SysServiceCode);
  const serviceCode = text(service.ServiceCode || row.ServiceCode);
  if (!serviceCode) throw new Error(`No ServiceCode mapping was found for desktop SysServiceCode ${text(row.SysServiceCode) || "(blank)"}.`);
  const amount = number(row.Amt);
  const payload = {
    voucherDate: date(row.TrnDate), voucherSeries: text(row.TrnSeries) || "SS", voucherNo: number(row.TrnNo),
    partyCode: party.code, partyName: party.name, narration: text(row.Narr), fromDate: date(row.FromDate), toDate: date(row.ToDate),
    addAmount: number(row.AddAmt), lessAmount: number(row.LessAmt),
    items: [{ serviceCode, serviceName: text(service.ServiceName), amount }],
  };
  return payloadRow(job, definition, payload, { date: payload.voucherDate, series: payload.voucherSeries, number: payload.voucherNo, party: payload.partyName, amount: number(row.NetAmt) || amount });
});

const loadRows = (job, definition, headers, sales, references) => headers.map((header) => {
  const loadSeries = text(header.LoadSeries);
  const loadNo = number(header.LoadNo);
  const company = masterName(references, "companies", header.SysCompCode, "CompCode", "CompName");
  const bills = sales.filter((row) => number(row.LoadNo) === loadNo && (!loadSeries || !text(row.LoadSeries) || text(row.LoadSeries) === loadSeries)).map((row) => {
    const party = masterName(references, "accounts", row.SysAcCode, "AcCode", "AcName", true);
    const salesman = ref(references.salesmen, row.SSMCode); const area = ref(references.areas, row.AreaCode);
    return { BillDate: date(row.TrnDate), BillSeries: text(row.TrnSeries), BillNo: number(row.TrnNo), BillType: text(row.BillType) || "Credit", PartyCode: party.code, PartyName: party.name, SalesmanCode: text(row.SSMCode), SalesmanName: text(salesman.SSMName), AreaCode: text(row.AreaCode), AreaName: text(area.AreaName), Amount: number(row.NetAmt), Selected: true };
  });
  const payload = { LoadSeries: loadSeries || "LD", LoadNo: loadNo, LoadDate: date(header.LoadDate), CompanyCode: company.code, CompanyName: company.name, DeliveryBoyCode: text(header.DCode), DeliveryBoyName: text(header.CourierName || header.ContactName), VehicleNo: text(header.VanCode), DriverMobile: text(header.ContactNo), BillFromDate: date(header.FromDt), BillToDate: date(header.ToDt), Narration: text(header.Narr), Bills: bills, DistributorId: job.distributorId, FirmId: job.firmId };
  return bills.length ? payloadRow(job, definition, payload, { date: payload.LoadDate, series: payload.LoadSeries, number: payload.LoadNo, party: payload.DeliveryBoyName, amount: number(header.TotAmt) }) : null;
}).filter(Boolean);

const settleLoadRows = (job, definition, rows, references) => [...groupDetails(rows).values()].map((group) => {
  const first = group[0] || {};
  const items = group.map((row) => {
    const party = masterName(references, "accounts", row.SysAcCodeCr, "AcCode", "AcName", true);
    const amount = number(row.CashAmt) + number(row.ChqAmt);
    return { billDate: date(row.BillDate), billSeries: text(row.BillSeries), billNo: number(row.BillNo), partyCode: party.code, partyName: party.name, originalBillAmount: number(row.BillAmt), billAmount: number(row.BillAmt), receiptAmount: amount, pendingAmount: Math.max(number(row.BillAmt) - amount, 0), chequeNo: text(row.ChqNo), chequeDate: date(row.ChqDate), narration: text(row.Narr) };
  });
  const payload = { loadSeries: text(first.TrnSeries), loadNo: number(first.TrnNo), loadDate: date(first.TrnDate), settlementDate: date(first.TrnDate), narration: text(first.Narr), items, summary: { totalBills: items.length, receiptAmount: items.reduce((sum, item) => sum + item.receiptAmount, 0) } };
  return payloadRow(job, definition, payload, { date: payload.settlementDate, series: payload.loadSeries, number: payload.loadNo, amount: payload.summary.receiptAmount });
});

const chequeBounceRows = (job, definition, rows, references) => rows.map((row) => {
  const party = masterName(references, "accounts", row.SysAcCodeDr, "AcCode", "AcName", true);
  const bank = masterName(references, "accounts", row.SysAcCodeCr || row.SysAcCodeCh, "AcCode", "AcName");
  const payload = { chqBounceDate: date(row.TrnDate), trnSeries: text(row.TrnSeries), trnNo: number(row.TrnNo), partyId: party.code, partyName: party.name, chequeNo: text(row.ChqNo), chequeDate: date(row.ChqDate), chequeAmt: number(row.ChqAmt), chqBounceCharges: number(row.ChargeAmt), totalAmt: number(row.Amt) || number(row.ChqAmt) + number(row.ChargeAmt), clearingDate: date(row.ClrDate), receiptNo: `${text(row.RecSeries)}${number(row.RecNo) || ""}`, bankId: bank.code, bankName: bank.name, narration: text(row.Narr) };
  return payloadRow(job, definition, payload, { date: payload.chqBounceDate, series: payload.trnSeries, number: payload.trnNo, party: payload.partyName, amount: payload.totalAmt });
});

const paymentRows = (job, definition, headers, details, references) => {
  const groups = groupDetails(details);
  return headers.map((row) => {
    const party = masterName(references, "accounts", row.SysAcCodeDr, "AcCode", "AcName", true);
    const bank = masterName(references, "accounts", row.SysAcCodeCr, "AcCode", "AcName", true);
    const amount = number(row.AmtDr || row.AmtCr);
    const allocations = (groups.get(key(row)) || []).map((item) => ({ trn: text(item.AdjTrn), trnSeries: text(item.AdjTrnSeries), voucherNo: text(item.AdjTrnNo), amount: number(item.AdjAmt), allocatedAmount: number(item.AdjAmt) })).filter((item) => item.allocatedAmount > 0);
    const payload = { vDate: date(row.TrnDate), vNo: number(row.TrnNo), partyCode: party.code, partyName: party.name, bankCash: bank.code || bank.name, amount, debitAmount: amount, creditAmount: amount, narration: text(row.Narr), chequeNo: text(row.ChqNo), chequeDate: date(row.ChqDate), clearingDate: date(row.ClrDate), partyBankName: text(row.CustBank), bankAccountNo: text(row.AcNo), allocations };
    return payloadRow(job, definition, payload, { date: payload.vDate, series: text(row.TrnSeries), number: payload.vNo, party: payload.partyName, amount });
  });
};

export const buildDesktopTransactionRows = ({ job, definition, sheets, references }) => {
  const headerRows = sheets.find((sheet) => sheet.sheet === "Header")?.rows || sheets[0]?.rows || [];
  const detailRows = sheets.find((sheet) => sheet.sheet === "Details")?.rows || [];
  switch (definition.entryType) {
    case "DesktopOpeningStock": return stockRows(job, definition, [], headerRows, references, "IN");
    case "DesktopSales": return salesRows(job, definition, headerRows, detailRows, references);
    case "DesktopCounterSales": return salesRows(job, definition, headerRows, detailRows, references);
    case "DesktopSalesService": return salesServiceRows(job, definition, headerRows, references);
    case "DesktopLoads": return loadRows(job, definition, headerRows, detailRows, references);
    case "DesktopSettleLoad": return settleLoadRows(job, definition, headerRows, references);
    case "DesktopPurchase": return purchaseRows(job, definition, headerRows, detailRows, references);
    case "DesktopCreditNote": return noteRows(job, definition, headerRows, detailRows, references, true);
    case "DesktopDebitNote": return noteRows(job, definition, headerRows, detailRows, references, false);
    case "DesktopStockIn": return stockRows(job, definition, headerRows, detailRows, references, "IN");
    case "DesktopStockOut": return stockRows(job, definition, headerRows, detailRows, references, "OUT");
    case "DesktopSelfDamage": return stockRows(job, definition, headerRows, detailRows, references, "DAMAGE_IN");
    case "DesktopDamageStockOut": return stockRows(job, definition, headerRows, detailRows, references, "DAMAGE_OUT");
    case "DesktopReceipt": return receiptRows(job, definition, headerRows, detailRows, references);
    case "DesktopCHB": return chequeBounceRows(job, definition, headerRows, references);
    case "DesktopContra": return contraRows(job, definition, headerRows);
    case "DesktopPDC": return pdcRows(job, definition, headerRows, references);
    case "DesktopJournalVoucher": return journalRows(job, definition, headerRows, references);
    case "DesktopPayment": return paymentRows(job, definition, headerRows, detailRows, references);
    case "DesktopCollectionVoucher": return collectionRows(job, definition, headerRows, detailRows, references);
    default: return headerRows.map((row) => payloadRow(job, definition, row, { date: date(row.TrnDate || row.ConTrnDate || row.ColTrnDate), series: text(row.TrnSeries || row.ConTrnSeries || row.ColTrnSeries), number: number(row.TrnNo || row.ConTrnNo || row.ColTrnNo), amount: number(row.Amt || row.TotAmt) }));
  }
};
