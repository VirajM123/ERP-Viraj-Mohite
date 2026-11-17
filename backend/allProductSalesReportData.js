const MONEY_FIELDS = [
  "Amount",
  "CreditNoteAmount",
  "Disc",
  "TPRAmt",
  "SchemeAmt",
  "OtherDisc",
  "Valuation",
  "BillCuts",
  "Outlets",
  "VatAmt",
  "Cess1",
  "Cess2",
];

const QUANTITY_FIELDS = ["Qty", "FreeQty", "Weight"];

const numericValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumMoney = (left, right) =>
  (Math.round(numericValue(left) * 100) + Math.round(numericValue(right) * 100)) / 100;

const sumQuantity = (left, right) =>
  Number((numericValue(left) + numericValue(right)).toFixed(6));

export const aggregateAllProductSalesRows = (
  rows,
  reportLevel,
  billWiseSalesman = false
) => {
  if (reportLevel === "details") return rows;

  const groupedRows = new Map();
  const ungroupedRows = [];

  rows.forEach((row) => {
    if (
      row.Trn !== "SALES" ||
      String(row._id || "").startsWith("zero-")
    ) {
      ungroupedRows.push(row);
      return;
    }

    const dimensions = [
      row.CompanyCode || "",
      row.ProductCode || row.ProductName || "",
      row.Unit || "",
    ];

    if (reportLevel === "units") {
      dimensions.push(
        row.Batch || "",
        numericValue(row.MRP),
        numericValue(row.Rate),
        numericValue(row.BasicRate)
      );
    }

    if (billWiseSalesman) dimensions.push(row.SalesmanName || "");

    const key = JSON.stringify(dimensions);
    const existing = groupedRows.get(key);
    if (!existing) {
      groupedRows.set(key, {
        ...row,
        _id: `aggregate-${groupedRows.size}`,
        BillDate: "",
        BillSeries: "",
        BillNo: "",
        PartyCode: "",
        PartyName: "",
        AreaName: "",
        Godown: "",
        GDCode: "",
        SalesmanName: billWiseSalesman ? row.SalesmanName : "",
      });
      return;
    }

    MONEY_FIELDS.forEach((field) => {
      existing[field] = sumMoney(existing[field], row[field]);
    });
    QUANTITY_FIELDS.forEach((field) => {
      existing[field] = sumQuantity(existing[field], row[field]);
    });
  });

  const aggregatedRows = Array.from(groupedRows.values());
  if (reportLevel === "amount") {
    aggregatedRows.forEach((row) => {
      row.Batch = "";
      row.MRP = 0;
      row.Rate = 0;
      row.BasicRate = 0;
      row.Difference = 0;
    });
  }

  return [...aggregatedRows, ...ungroupedRows];
};
