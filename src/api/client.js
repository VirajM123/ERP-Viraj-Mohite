import { API_ORIGIN } from "./config";
import { startVisualLoading } from "../components/loadingTracker";

const originalFetch = window.fetch.bind(window);
let nextLoadingRequestId = 0;
let csrfToken = "";

/*
 * These endpoints supply reference data used repeatedly by forms. Keeping a
 * small, in-memory cache avoids fetching the same tenant-scoped lookup more
 * than once while a user moves between forms. It deliberately excludes
 * transaction lists, reports and document-number endpoints so those stay live.
 */
const LOOKUP_CACHE_TTL_MS = 30_000;
const LOOKUP_CACHE_MAX_ENTRIES = 100;
const lookupResponseCache = new Map();
const pendingLookupRequests = new Map();
let lookupCacheGeneration = 0;
const CACHEABLE_LOOKUP_PATHS = new Set([
  "/api/companies",
  "/api/groups",
  "/api/categories",
  "/api/products/lookup",
  "/api/accounts",
  "/api/other-accounts",
  "/api/gst",
  "/api/salesmen",
  "/api/areas",
  "/api/godowns",
  "/api/customer-banks",
  "/api/company-wise-series",
  "/api/general-setup",
  "/api/salesman-area-mappings",
  "/api/area-to-party-mappings",
]);

export const clearApiLookupCache = () => {
  lookupCacheGeneration += 1;
  lookupResponseCache.clear();
  pendingLookupRequests.clear();
};

export const setCsrfToken = (value) => {
  const nextToken = String(value || "");
  if (csrfToken !== nextToken) clearApiLookupCache();
  csrfToken = nextToken;
};

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

const lookupCacheKey = (input) => requestUrl(input).toString();

const getCachedLookupResponse = (key) => {
  const entry = lookupResponseCache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    lookupResponseCache.delete(key);
    return null;
  }

  return entry.response.clone();
};

const cacheLookupResponse = (key, response) => {
  lookupResponseCache.set(key, {
    expiresAt: Date.now() + LOOKUP_CACHE_TTL_MS,
    response,
  });

  while (lookupResponseCache.size > LOOKUP_CACHE_MAX_ENTRIES) {
    lookupResponseCache.delete(lookupResponseCache.keys().next().value);
  }
};

const isCacheableLookupRequest = (input, init, trusted, method) => {
  if (!trusted || method !== "GET") return false;

  const requestedCacheMode = init.cache ||
    (input instanceof Request ? input.cache : "");

  if (requestedCacheMode === "no-store" || requestedCacheMode === "reload") {
    return false;
  }

  return CACHEABLE_LOOKUP_PATHS.has(requestUrl(input).pathname.toLowerCase());
};

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
  const cacheableLookup = isCacheableLookupRequest(input, init, trusted, method);
  const cacheKey = cacheableLookup ? lookupCacheKey(input) : "";

  if (cacheKey) {
    const cachedResponse = getCachedLookupResponse(cacheKey);
    if (cachedResponse) return Promise.resolve(cachedResponse);

    const pendingResponse = pendingLookupRequests.get(cacheKey);
    if (pendingResponse) {
      return pendingResponse.then(({ template }) => template.clone());
    }
  }

  /*
   * A completed write can change any reference list (for example a new party
   * can immediately be mapped to an area), therefore never serve a stale
   * lookup after a mutation.
   */
  if (trusted && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    clearApiLookupCache();
  }

  if (trusted && !["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) headers.set("X-CSRF-Token", csrfToken);

  const path = trusted ? requestUrl(input).pathname.toLowerCase() : "";
  const isSave = trusted && ["POST", "PUT", "PATCH"].includes(method) && !/\/(login|logout|session|report|search|lookup|preflight)(\/|$)/.test(path);
  const finishVisual = isSave
    ? startVisualLoading({
      title: path.includes("/sales") ? "Saving sales invoice..." : "Saving changes...",
      message: "Please wait while your changes are saved.",
      variant: "saving",
    })
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

  const trackedRequest = request.then(
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

  if (!cacheKey) return trackedRequest;

  /*
   * Duplicate lookup requests share one network call. Each caller receives a
   * clone, so consuming one response body never affects another form.
   */
  const requestGeneration = lookupCacheGeneration;
  const pendingRequest = trackedRequest.then((response) => {
    const template = response.clone();
    if (response.ok && requestGeneration === lookupCacheGeneration) {
      cacheLookupResponse(cacheKey, template);
    }
    return { response, template };
  });

  pendingLookupRequests.set(cacheKey, pendingRequest);
  void pendingRequest.then(
    () => {
      if (pendingLookupRequests.get(cacheKey) === pendingRequest) {
        pendingLookupRequests.delete(cacheKey);
      }
    },
    () => {
      if (pendingLookupRequests.get(cacheKey) === pendingRequest) {
        pendingLookupRequests.delete(cacheKey);
      }
    }
  );

  return pendingRequest.then(({ response }) => response);
};

export const installAuthenticatedFetch = () => {
  window.fetch = authenticatedFetch;
};
