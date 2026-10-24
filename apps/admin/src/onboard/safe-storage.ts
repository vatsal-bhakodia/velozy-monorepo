// Browser storage is optional (private browsing and embedded contexts can deny it).
let available = true;
const listeners = new Set<() => void>();
function unavailable() {
  if (!available) return;
  available = false;
  queueMicrotask(() => listeners.forEach((listener) => listener()));
}
export const browserStorageStatus = {
  getSnapshot: () => available,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      unavailable();
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      unavailable();
    }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      unavailable();
    }
  },
};
