const hasErrorLabel = (error, label) =>
  typeof error?.hasErrorLabel === "function"
    ? error.hasErrorLabel(label)
    : Array.isArray(error?.errorLabels) && error.errorLabels.includes(label);

export const commitTransactionReliably = async (session, maxAttempts = 3) => {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await session.commitTransaction();
    } catch (error) {
      attempt += 1;
      if (!hasErrorLabel(error, "UnknownTransactionCommitResult") || attempt >= maxAttempts) {
        throw error;
      }
    }
  }
};
