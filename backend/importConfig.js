/* Excel import definitions for collections whose create shape is known in server.js.
 * Transaction vouchers are deliberately excluded: they must go through their own
 * save services so stock, tax and outstanding balances stay consistent. */
const text = (excel, field, required = false) => ({ excel, field, required, type: "string" });
const number = (excel, field, required = false) => ({ excel, field, required, type: "number" });

export const importConfig = {
  Account: { label: "Account Master", collection: "Mas_Account", duplicateField: "accountCode", sampleFileName: "Account_Master_Sample.xlsx", columns: [text("Account Code", "accountCode", true), text("Account Name", "accountName", true), text("Address", "address"), text("Town", "town"), text("State", "state"), text("PIN Code", "pinCode"), text("Mobile No", "mobileNo"), text("Email ID", "emailId"), text("GSTIN", "gstNo"), text("PAN No", "panNo"), text("Area", "areaCode"), number("Opening Balance", "openingBal"), text("Opening Balance Type", "openingBalType"), number("Credit Days", "creditDays")] },
  Product: { label: "Product Master", collection: "Mas_Product", duplicateField: "productCode", sampleFileName: "Product_Master_Sample.xlsx", columns: [text("Product Code", "productCode", true), text("Product Name", "productName", true), text("Company", "companyId"), text("Group", "group"), text("Category", "category"), text("Description", "description"), number("GST %", "gst"), text("Basic Unit", "basicUnit"), number("Box Pack", "boxPack"), number("Inbox Pack", "inboxPack"), number("Retailer Margin", "retailerMargin"), number("Distributor Margin", "distributorMargin"), text("HSN", "hsn"), number("Weight", "weight"), text("EAN Code", "eanCode"), number("Rate Per Unit", "Rate_Per_Unit"), number("Reorder Level", "Reorder_Level"), number("Min Stock Holding", "Min_Stock_Holding"), number("Cess", "cess"), number("Exp Days", "ExpDays")] },
  Bank: { label: "Bank Master", collection: "Mas_CustomerBank", duplicateField: "bankCode", sampleFileName: "Bank_Master_Sample.xlsx", columns: [text("Bank Code", "bankCode", true), text("Bank Name", "bankName", true), text("Account Number", "accountNumber"), text("IFSC Code", "ifscCode"), text("Branch Name", "branchName"), text("Account Type", "accountType"), text("Clearing Type", "clearingType"), text("Customer Name", "customerName"), text("Customer Code", "customerCode"), text("Mobile No", "mobileNo"), text("Email ID", "emailId"), text("UPI ID", "upiId"), text("Beneficiary Name", "beneficiaryName"), text("SWIFT Code", "swiftCode"), text("MICR Code", "micrCode"), text("PAN Number", "panNumber"), text("Remarks", "remarks")] },
  Salesman: { label: "Salesman Master", collection: "Mas_Salesman", duplicateField: "salesmanCode", sampleFileName: "Salesman_Master_Sample.xlsx", columns: [text("Salesman Code", "salesmanCode", true), text("Salesman Name", "salesmanName", true), text("Salesman Type", "salesmanType"), text("Date of Birth", "dateOfBirth"), text("Address", "address"), text("Town", "town"), text("PIN Code", "pinCode"), text("State", "state"), text("Mobile No", "mobileNo"), text("Email ID", "emailId"), text("Qualification", "qualification"), text("Reference", "reference"), text("IMEI No", "imeiNo")] },
  Area: { label: "Area Master", collection: "Mas_Area", duplicateField: "areaCode", sampleFileName: "Area_Master_Sample.xlsx", columns: [text("Area Code", "areaCode", true), text("Area Name", "areaName", true)] },
  AreaToPartyMapping: { label: "Area To Party Mapping", collection: "Mas_AreaToPartyMapping", duplicateField: "mappingKey", sampleFileName: "Area_To_Party_Mapping_Sample.xlsx", columns: [text("Company Code", "companyCode", true), text("Company Name", "companyName", true), text("Account Code", "accountCode", true), text("Account Name", "accountName", true), text("Area Code", "areaCode", true), text("Area Name", "areaName", true)] },
  SalesmanToAreaMapping: { label: "Salesman To Area Mapping", collection: "Mas_SalesmanAreaMapping", duplicateField: "mappingKey", sampleFileName: "Salesman_To_Area_Mapping_Sample.xlsx", columns: [text("Company Code", "companyCode", true), text("Company Name", "companyName", true), text("Area Code", "areaCode", true), text("Area Name", "areaName", true), text("Salesman Code", "salesmanCode", true), text("Salesman Name", "salesmanName", true)] },
};

export const importTypes = Object.entries(importConfig).map(([value, config]) => ({ value, label: config.label }));
export const getImportConfig = (entryType) => importConfig[entryType] || null;

// Tenant identity is deliberately required in every workbook.  The importer
// verifies these values against the authenticated request and never trusts
// them for persistence; the session values are the only values written.
const tenantColumns = [
  text("Distributor ID", "_importDistributorId", true),
  text("Firm ID", "_importFirmId", true),
];
Object.values(importConfig).forEach((config) => {
  config.columns.push(...tenantColumns);
});
