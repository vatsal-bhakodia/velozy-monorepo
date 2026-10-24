let rememberSession = true;
export function getStorageRememberSession() {
  return rememberSession;
}
export function setStorageRememberSession(value: boolean) {
  rememberSession = value;
}
const rememberSessionKey = "velozy-auth-remember-session";
const fallbackStorage = new Map<string, string>();
export const authStorage = {
  getItem(key: string) {
    try {
      const localValue = window.localStorage.getItem(key);
      const sessionValue = window.sessionStorage.getItem(key);
      if (
        key.endsWith("-auth-token") &&
        (localValue !== null || sessionValue !== null)
      ) {
        rememberSession = localValue !== null;
        try {
          window.sessionStorage.setItem(
            rememberSessionKey,
            String(rememberSession),
          );
        } catch {}
      }
      return localValue ?? sessionValue ?? fallbackStorage.get(key) ?? null;
    } catch {
      return fallbackStorage.get(key) ?? null;
    }
  },
  setItem(key: string, value: string) {
    fallbackStorage.set(key, value);
    try {
      const target = rememberSession
        ? window.localStorage
        : window.sessionStorage;
      const other = rememberSession
        ? window.sessionStorage
        : window.localStorage;
      other.removeItem(key);
      target.setItem(key, value);
    } catch {}
  },
  removeItem(key: string) {
    fallbackStorage.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch {}
    try {
      window.sessionStorage.removeItem(key);
    } catch {}
  },
};
