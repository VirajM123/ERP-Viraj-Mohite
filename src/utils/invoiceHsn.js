export const getInvoiceProductCode = (item = {}) => String(
  item.productCode ??
  item.ProdCode ??
  item.itemCode ??
  item.productId ??
  String(item.product || '').split(' - ')[0] ??
  ''
).trim();

export const resolveInvoiceItemHsn = (item = {}, products = []) => {
  const rowHsn = String(
    item.hsn ?? item.HSN ?? item.hsnCode ?? item.HSNCode ?? item.HsnCode ??
    item.productHsn ?? item.ProductHSN ?? ''
  ).trim();
  if (rowHsn) return rowHsn;

  const productCode = getInvoiceProductCode(item);
  const masterProduct = products.find((product) =>
    String(
      product.productCode ?? product.itemCode ?? product.code ?? product.productId ?? ''
    ).trim() === productCode
  );
  return String(masterProduct?.hsn ?? masterProduct?.hsnCode ?? masterProduct?.HSN ?? '').trim();
};
