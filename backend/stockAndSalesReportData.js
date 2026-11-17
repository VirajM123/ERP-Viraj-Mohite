const laterMovementStockEffect = {
  SALE: -1,
  PURCHASE: 1,
  CREDIT_NOTE: 1,
  DEBIT_NOTE: -1,
  IN: 1,
  OUT: -1,
  DAMAGE_IN: -1,
  DAMAGE_OUT: 1,
};

export const reverseLaterStockMovement = (currentQuantity, movementType, quantity) => {
  const effect = laterMovementStockEffect[String(movementType || "").toUpperCase()];
  if (effect === undefined) {
    throw new Error(`Unsupported stock movement type: ${movementType}`);
  }

  const current = Number(currentQuantity);
  const moved = Number(quantity);
  if (!Number.isFinite(current) || !Number.isFinite(moved)) {
    throw new Error("Stock movement quantities must be finite numbers.");
  }

  return current - effect * moved;
};
