import { nixState } from "./nixState";

/**
 * Reactive wrapper around localStorage with safe JSON parsing/stringifying.
 *
 * @param {string} key - LocalStorage key
 * @param {any} initial - Initial value if key does not exist
 * @returns {{ value: any, set: (v: any) => void }}
 */
export function nixLocalStorage(key, initial) {
  const s = nixState(() => {
    try {
      const v = localStorage.getItem(key);
      if (v != null) return JSON.parse(v);
      return initial;
    } catch (err) {
      console.error(`[nixLocalStorage] Error reading key "${key}":`, err);
      return initial;
    }
  });

  const set = (v) => {
    s.value = v;
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch (err) {
      console.error(`[nixLocalStorage] Error setting key "${key}":`, err);
    }
  };

  return { value: s.value, set };
}
