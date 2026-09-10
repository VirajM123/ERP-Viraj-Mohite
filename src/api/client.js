import { API_ORIGIN } from "./config";

const originalFetch = window.fetch.bind(window);

const requestUrl = (input) => new URL(
  typeof input === "string" || input instanceof URL ? input : input.url,
  window.location.href
);

export const isTrustedApiDestination = (input) => {
  try {
    const url = requestUrl(input);
    return url.origin === API_ORIGIN && (url.pathname === "/api" || url.pathname.startsWith("/api/"));
  } catch {
    return false;
  }
};

export const authenticatedFetch = (input, init = {}) => {
  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  const token = localStorage.getItem("token");
  if (token && isTrustedApiDestination(input) && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return originalFetch(input, { ...init, headers });
};

export const installAuthenticatedFetch = () => {
  window.fetch = authenticatedFetch;
};
