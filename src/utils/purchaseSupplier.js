const text = (value) => String(value ?? "").trim();

export const purchaseSupplierValue = (account) => text(account?._id || account?.id || account?.accountCode);

// New selections use IDs. Codes and unique names keep older purchases editable.
export const findPurchaseSupplier = (accounts, value) => {
  const selected = text(value);
  if (!selected) return undefined;
  const active = accounts.filter((account) => account.isActive !== false);
  for (const key of [purchaseSupplierValue, (account) => text(account.accountCode), (account) => text(account.accountName)]) {
    const matches = active.filter((account) => key(account) === selected);
    if (matches.length) return matches.length === 1 ? matches[0] : undefined;
  }
  return undefined;
};
