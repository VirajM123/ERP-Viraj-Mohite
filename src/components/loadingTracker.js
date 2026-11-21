const MINIMUM_MS = 3000;
const tasks = new Map();
const listeners = new Set();
let snapshot = null;

function publish() {
  snapshot = Array.from(tasks.values()).at(-1)?.content || null;
  listeners.forEach((listener) => listener());
}
export function subscribeLoading(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function getLoadingSnapshot() { return snapshot; }
export function startVisualLoading(content, minimumMs = MINIMUM_MS) {
  const id = Symbol();
  const started = Date.now();
  tasks.set(id, { content });
  publish();
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    const remove = () => { tasks.delete(id); publish(); };
    const remaining = minimumMs - (Date.now() - started);
    if (remaining > 0) window.setTimeout(remove, remaining); else remove();
  };
}
