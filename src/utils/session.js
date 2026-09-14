export const SESSION_EXPIRES_AT_KEY = "sessionExpiresAt";

export const startSession = () => {
  localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
  return 0;
};

export const getSessionExpiresAt = () => {
  const storedValue = Number(localStorage.getItem(SESSION_EXPIRES_AT_KEY));
  return Number.isFinite(storedValue) && storedValue > 0 ? storedValue : 0;
};

export const hasActiveSession = () => {
  return Boolean(localStorage.getItem("token"));
};
