const SUCCESS_WORDS = /\b(?:saved|created|updated|posted|completed|successful(?:ly)?|corrected|reposted)\b/i;
const FAILURE_WORDS = /\b(?:fail(?:ed|ure)?|error|unable|could not|cannot|can't|invalid|required|denied|expired|not found|insufficient|already exists|not saved)\b/i;
const DELETE_WORDS = /\b(?:delete(?:d)?|remove(?:d)?)\b/i;

let lastMessage = "";
let lastShownAt = 0;

const normalise = (message) => String(message || "")
  .replace(/[^a-z0-9]+/gi, " ")
  .trim()
  .toLowerCase();

export const isSaveSuccessMessage = (message) => {
  const text = String(message || "").trim();
  return Boolean(text) && SUCCESS_WORDS.test(text) && !FAILURE_WORDS.test(text) && !DELETE_WORDS.test(text);
};

export function showSuccessNotice(message) {
  const text = String(message || "").trim();
  if (!text) return;

  const normalized = normalise(text);
  const now = Date.now();
  // Some screens retain their success alert after a save. Do not show the
  // same notice twice when another layer has just reported it.
  if (normalized === lastMessage && now - lastShownAt < 1000) return;

  lastMessage = normalized;
  lastShownAt = now;
  window.dispatchEvent(new CustomEvent("erp:success-notice", { detail: { message: text } }));
}

export function installSuccessAlertBridge() {
  if (typeof window === "undefined" || window.__erpSuccessAlertBridgeInstalled) return;

  const nativeAlert = window.alert.bind(window);
  window.__erpSuccessAlertBridgeInstalled = true;

  window.alert = (message) => {
    if (isSaveSuccessMessage(message)) {
      showSuccessNotice(message);
      return undefined;
    }
    return nativeAlert(message);
  };
}
