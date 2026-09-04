export const SESSION_DURATION_MS = 30 * 60 * 1000;
export const SESSION_EXPIRES_AT_KEY = "sessionExpiresAt";

export const startSession = () => {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem(SESSION_EXPIRES_AT_KEY, String(expiresAt));
  return expiresAt;
};

export const getSessionExpiresAt = () => {
  const storedValue = Number(localStorage.getItem(SESSION_EXPIRES_AT_KEY));
  return Number.isFinite(storedValue) && storedValue > 0 ? storedValue : 0;
};

export const hasActiveSession = () => {
  const hasToken = Boolean(localStorage.getItem("token"));
  const expiresAt = getSessionExpiresAt();
  return hasToken && expiresAt > Date.now();
};
