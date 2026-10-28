/**
 * localStorage helpers. Only non-secret UI state lives here (theme, chat text, local activity).
 * Keys and backups never touch localStorage; the wallet keeps its key in IndexedDB, encrypted.
 */

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode: state stays in memory */
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Minimal external store for useSyncExternalStore. */
export function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next: T | ((prev: T) => T)) {
      state = typeof next === "function" ? (next as (prev: T) => T)(state) : next;
      for (const l of listeners) l();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const KEYS = {
  theme: "t402.theme",
  chat: (owner: string) => `t402.chat.v1.${owner}`,
  activity: (owner: string) => `t402.activity.v1.${owner}`,
  subject: "t402.subject",
  model: "t402.model",
  /** Which sign-in is active: absent = the built-in account; otherwise Freighter + its public address. */
  signin: "t402.signin.v1",
} as const;
