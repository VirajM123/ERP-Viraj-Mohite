const REVEAL_DELAY_MS = 200;
const REPORT_MIN_VISIBLE_MS = 1200;
const tasks = new Map();
const listeners = new Set();
let snapshot = null;

function publish() {
  snapshot = Array.from(tasks.values()).at(-1)?.content || null;
  listeners.forEach((listener) => listener());
}
export function subscribeLoading(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function getLoadingSnapshot() { return snapshot; }
export function startVisualLoading(content) {
  const id = Symbol();
  const isReport = content.variant === "report";
  let shownAt;
  const show = () => {
    shownAt = Date.now();
    tasks.set(id, { content });
    publish();
  };
  const timer = isReport ? null : window.setTimeout(show, REVEAL_DELAY_MS);
  if (isReport) show();
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    if (timer !== null) window.clearTimeout(timer);
    const remove = () => { if (tasks.delete(id)) publish(); };
    const remaining = isReport ? Math.max(0, REPORT_MIN_VISIBLE_MS - (Date.now() - shownAt)) : 0;
    if (remaining) window.setTimeout(remove, remaining);
    else remove();
  };
}
