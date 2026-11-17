import { API_ORIGIN } from "./config";

const originalFetch = window.fetch.bind(window);
let nextLoadingRequestId = 0;

const getLoadingType = (input, init) => {
  if (!isTrustedApiDestination(input)) return null;

  const url = requestUrl(input);
  const method = String(init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  const path = url.pathname.toLowerCase();

  if (path.includes("/login")) return "login";
  if (method !== "GET") return null;
  if (path.includes("/report")) return "reports";
  if (path.includes("/stock") || path.includes("/inventory") || path.includes("/batches")) return "stock";
  if (path.includes("/sales") || path.includes("/invoice")) return "sales";
  if (path.includes("/purchase")) return "purchase";
  if (path.includes("/gst")) return "gst";
  return "workspace";
};

export const notifyLoadingStart = (requestId, type) => {
  window.dispatchEvent(new CustomEvent("erp:loading-start", { detail: { requestId, type } }));
};

export const notifyLoadingEnd = (requestId) => {
  window.dispatchEvent(new CustomEvent("erp:loading-end", { detail: { requestId } }));
};

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

  const type = getLoadingType(input, init);
  const requestId = ++nextLoadingRequestId;
  if (type) notifyLoadingStart(requestId, type);

  const finishLoading = () => {
    if (type) notifyLoadingEnd(requestId);
  };

  let request;
  try {
    request = originalFetch(input, { ...init, headers });
  } catch (error) {
    finishLoading();
    throw error;
  }

  return request.then(
    (response) => {
      finishLoading();
      return response;
    },
    (error) => {
      finishLoading();
      throw error;
    }
  );
};

export const installAuthenticatedFetch = () => {
  window.fetch = authenticatedFetch;
};
