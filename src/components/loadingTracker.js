const REVEAL_DELAY_MS = 200;
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
  const timer = window.setTimeout(() => {
    tasks.set(id, { content });
    publish();
  }, REVEAL_DELAY_MS);
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timer);
    if (tasks.delete(id)) publish();
  };
}
