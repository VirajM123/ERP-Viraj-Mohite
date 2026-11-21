import { API_ORIGIN } from "./config";
import { startVisualLoading } from "../components/loadingTracker";

const originalFetch = window.fetch.bind(window);
let nextLoadingRequestId = 0;
let csrfToken = "";
export const setCsrfToken = (value) => { csrfToken = String(value || ""); };

// XMLHttpRequest is used for upload progress and does not pass through fetch.
export const authenticateUpload = (request, destination) => {
  if (!isTrustedApiDestination(destination)) throw new Error("Untrusted upload destination");
  if (requestUrl(destination).pathname.toLowerCase().includes("desktop-import")) {
    const finish = startVisualLoading({ title: "Importing your file...", message: "Please keep this page open.", variant: "dashboard" });
    request.addEventListener("loadend", finish, { once: true });
  }
  request.withCredentials = true;
  if (csrfToken) request.setRequestHeader("X-CSRF-Token", csrfToken);
};

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
  const trusted = isTrustedApiDestination(input);
  const method = String(init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (trusted && !["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) headers.set("X-CSRF-Token", csrfToken);

  const path = trusted ? requestUrl(input).pathname.toLowerCase() : "";
  const isSave = trusted && ["POST", "PUT", "PATCH"].includes(method) && !/\/(login|logout|session|report|search|lookup|preflight)(\/|$)/.test(path);
  const finishVisual = isSave && path.includes("import") && !path.includes("/validate")
    ? startVisualLoading({ title: "Importing your data...", message: "Please keep this page open.", variant: "dashboard" })
    : null;
  const type = getLoadingType(input, init);
  const requestId = ++nextLoadingRequestId;
  if (type) notifyLoadingStart(requestId, type);

  const finishLoading = () => {
    if (finishVisual) finishVisual();
    if (type) notifyLoadingEnd(requestId);
  };

  let request;
  try {
    request = originalFetch(input, { ...init, headers, ...(trusted ? { credentials: "include" } : {}) });
  } catch (error) {
    finishLoading();
    throw error;
  }

  return request.then(
    (response) => {
      finishLoading();
      if (response.status === 401 && csrfToken && trusted && !requestUrl(input).pathname.startsWith("/api/login")) {
        window.dispatchEvent(new Event("erp:session-expired"));
      }
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
