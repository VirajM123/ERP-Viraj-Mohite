const configuredRoot = String(import.meta.env.VITE_API_ROOT || "").trim();
//const defaultRoot = import.meta.env.DEV ? "http://localhost:5000" : window.location.origin;
const defaultRoot = "https://total-solution-backend.onrender.com"; // Replace with your actual Render backend URL
let parsedRoot;
try {
  parsedRoot = new URL(configuredRoot || defaultRoot, window.location.origin);
} catch {
  throw new Error("VITE_API_ROOT must be a valid HTTP(S) URL.");
}

if (!["http:", "https:"].includes(parsedRoot.protocol)) {
  throw new Error("VITE_API_ROOT must use HTTP or HTTPS.");
}
if (import.meta.env.PROD && parsedRoot.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsedRoot.hostname)) {
  throw new Error("Production VITE_API_ROOT must use HTTPS.");
}

export const API_ROOT = parsedRoot.origin;
export const API_ORIGIN = parsedRoot.origin;
export const API_URL = `${parsedRoot.origin}/api`;
