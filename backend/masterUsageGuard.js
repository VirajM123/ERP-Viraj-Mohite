import mongoose from "mongoose";

const TRANSACTION_COLLECTION = /^(T_|Acc_|Inv_)/i;
const LEGACY_TRANSACTION_COLLECTIONS = new Set(["purchasebills"]);
const NESTED_PREFIXES = [
  "items.", "Items.", "lines.", "Lines.", "entries.", "Entries.",
  "allocations.", "receiptBills.", "billItems.", "products.",
  "Bills.", "SelectedSalesmen.", "SelectedAreas.",
  "snapshot.products.", "masterSnapshot.products.", "historicalSnapshot.products.",
];

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactText = (value) => new RegExp(`^${escapeRegex(String(value).trim())}$`, "i");

const referenceDefinitions = {
  company: {
    label: "Company",
    idFields: ["companyId", "CompanyId", "CompanyID"],
    codeFields: ["companyCode", "CompanyCode"],
    nameFields: ["companyName", "CompanyName", "company", "Company"],
  },
  group: {
    label: "Group",
    codeFields: ["groupCode", "GroupCode"],
    nameFields: ["groupName", "GroupName", "group", "Group"],
  },
  category: {
    label: "Category",
    codeFields: ["categoryCode", "CategoryCode"],
    nameFields: ["categoryName", "CategoryName", "category", "Category"],
  },
  product: {
    label: "Product",
    idFields: ["productId", "ProductId", "prodId", "ProdId", "itemId", "ItemId"],
    codeFields: ["productCode", "ProductCode", "prodCode", "ProdCode", "itemCode", "ItemCode"],
    nameFields: ["productName", "ProductName", "prodName", "ProdName", "itemName", "ItemName"],
  },
  account: {
    label: "Account",
    idFields: ["accountId", "AccountId", "partyId", "PartyId", "customerId", "CustomerId", "supplierId", "SupplierId"],
    codeFields: ["accountCode", "AccountCode", "partyCode", "PartyCode", "customerCode", "CustomerCode", "supplierCode", "SupplierCode"],
    nameFields: ["accountName", "AccountName", "partyName", "PartyName", "customerName", "CustomerName", "supplierName", "SupplierName"],
  },
  otherAccount: {
    label: "Other Account",
    idFields: ["accountId", "AccountId", "partyId", "PartyId", "supplierId", "SupplierId"],
    codeFields: ["accountCode", "AccountCode", "partyCode", "PartyCode", "supplierCode", "SupplierCode"],
    nameFields: ["accountName", "AccountName", "partyName", "PartyName", "supplierName", "SupplierName"],
  },
  gst: {
    label: "GST",
    idFields: ["gstId", "GstId", "GSTId"],
    codeFields: ["gstCode", "GstCode", "GSTCode"],
  },
  salesman: {
    label: "Salesman",
    idFields: ["salesmanId", "SalesmanId"],
    codeFields: ["salesmanCode", "SalesmanCode"],
    nameFields: ["salesmanName", "SalesmanName", "salesman", "Salesman"],
  },
  area: {
    label: "Area",
    idFields: ["areaId", "AreaId"],
    codeFields: ["areaCode", "AreaCode"],
    nameFields: ["areaName", "AreaName", "area", "Area"],
  },
  godown: {
    label: "Godown",
    idFields: ["godownId", "GodownId"],
    codeFields: ["godownCode", "GodownCode", "gdCode", "GDCode"],
    nameFields: ["godownName", "GodownName", "godown", "Godown"],
  },
  customerBank: {
    label: "Customer Bank",
    idFields: ["bankId", "BankId", "customerBankId", "CustomerBankId"],
    codeFields: ["bankCode", "BankCode"],
    nameFields: ["bankName", "BankName", "bankCash", "BankCash", "houseBank", "houseBankName"],
  },
  service: {
    label: "Service",
    idFields: ["serviceId", "ServiceId"],
    codeFields: ["serviceCode", "ServiceCode"],
    nameFields: ["serviceName", "ServiceName"],
  },
};

const pathsFor = (fields = []) => [
  ...fields,
  ...NESTED_PREFIXES.flatMap((prefix) => fields.map((field) => `${prefix}${field}`)),
];

export function buildMasterUsageQuery({ scope, type, record }) {
  const definition = referenceDefinitions[type];
  if (!definition) throw new Error(`Unsupported master usage check: ${type}`);

  const references = [];
  const addReferences = (fields, value, includeObjectId = false) => {
    const cleanValue = String(value ?? "").trim();
    if (!cleanValue) return;
    const values = [exactText(cleanValue)];
    if (includeObjectId && mongoose.isValidObjectId(cleanValue)) {
      values.push(new mongoose.Types.ObjectId(cleanValue));
    }
    for (const field of pathsFor(fields)) {
      for (const candidate of values) references.push({ [field]: candidate });
    }
  };

  addReferences(definition.idFields, record._id || record.id, true);
  // Several legacy voucher schemas named this field "...Id" but stored the
  // master code in it. Check both representations without changing old data.
  addReferences(definition.idFields, record.code);
  addReferences(definition.codeFields, record.code);
  addReferences(definition.nameFields, record.name);

  return {
    $and: [
      {
        $or: [
          { distributorId: String(scope.distributorId), firmId: String(scope.firmId) },
          { DistributorId: String(scope.distributorId), FirmId: String(scope.firmId) },
        ],
      },
      { $or: references },
    ],
  };
}

export async function assertMasterNotUsed({ connection, scope, type, record }) {
  const definition = referenceDefinitions[type];
  const query = buildMasterUsageQuery({ scope, type, record });
  const collections = await connection.db.listCollections({}, { nameOnly: true }).toArray();

  for (const { name } of collections) {
    if (!TRANSACTION_COLLECTION.test(name) && !LEGACY_TRANSACTION_COLLECTIONS.has(name)) continue;
    const used = await connection.db.collection(name).findOne(query, { projection: { _id: 1 } });
    if (used) {
      const error = new Error(`Cannot delete ${definition.label} "${record.name || record.code}" because it is used in a transaction or voucher.`);
      error.statusCode = 409;
      error.collection = name;
      throw error;
    }
  }
}
