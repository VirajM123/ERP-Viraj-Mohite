const docketFields = [
  "depositDate",
  "houseBank",
  "bankName",
  "houseBankId",
  "houseBankName",
  "fromDate",
  "toDate",
  "clearingType",
  "clearingDate",
  "narration",
];

const chequeFields = [
  "srNo",
  "chequeNo",
  "chequeDate",
  "amount",
  "clearingDate",
  "receiptSeries",
  "receiptNo",
  "receiptTrnBank",
  "branch",
  "partyCode",
  "partyName",
];

const pickFields = (source, fields) => Object.fromEntries(
  fields.filter((field) => Object.hasOwn(source, field)).map((field) => [field, source[field]])
);

export function buildPdcDocketUpdate(body = {}, scope) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  return {
    ...pickFields(input, docketFields),
    distributorId: scope.distributorId,
    firmId: scope.firmId,
    docSeries: String(input.docSeries || "").trim(),
    docVNo: Number(input.docVNo) || 0,
    totalAmount: Number(input.totalAmount) || 0,
    totalCheques: Number(input.totalCheques) || 0,
    cheques: Array.isArray(input.cheques)
      ? input.cheques.map((cheque) => pickFields(cheque && typeof cheque === "object" ? cheque : {}, chequeFields))
      : [],
  };
}
