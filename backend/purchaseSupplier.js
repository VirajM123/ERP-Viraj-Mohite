export const purchaseSupplierFilter = (body) => {
  const scope = { distributorId: body.distributorId, firmId: body.firmId, isActive: { $ne: false } };
  const supplierId = String(body.supplierId ?? "").trim();
  if (supplierId) {
    if (!/^[a-f\d]{24}$/i.test(supplierId)) {
      throw Object.assign(new Error("Invalid supplier selection. Please select the supplier again."), { statusCode: 400 });
    }
    return { ...scope, _id: supplierId };
  }
  // Existing clients and desktop imports still identify suppliers by code.
  return { ...scope, accountCode: body.supplierCode };
};
