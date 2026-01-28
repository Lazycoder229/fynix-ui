/**
 * @fileoverview Reactive localStorage hook for Fynix.
 * Automatically syncs state with localStorage using JSON serialization.
 */

import { nixState } from "./nixState";

/**
 * Reactive wrapper around localStorage with safe JSON parsing/stringifying.
 * Automatically persists state changes to localStorage.
 *
 * @template T
 * @param {string} key - LocalStorage key
 * @param {T} initial - Initial value if key does not exist
 * @returns {{ value: T, set: (v: T) => void }} Object with value getter and setter
 *
 * @example
 * const theme = nixLocalStorage('theme', 'light');
 * console.log(theme.value); // 'light' or stored value
 * theme.set('dark'); // Updates state and localStorage
 *
 * @example
 * const user = nixLocalStorage('user', { name: '', age: 0 });
 * user.set({ name: 'John', age: 30 });
 */
export function nixLocalStorage<T>(
  key: string,
  initial: T
): { value: T; set: (v: T) => void } {
  let initialValue: T;
  try {
    const v = localStorage.getItem(key);
    if (v != null) initialValue = JSON.parse(v) as T;
    else initialValue = initial;
  } catch (err) {
    console.error(`[nixLocalStorage] Error reading key "${key}":`, err);
    initialValue = initial;
  }
  const s = nixState<T>(initialValue);

  const set = (v: T) => {
    s.value = v;
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch (err) {
      console.error(`[nixLocalStorage] Error setting key "${key}":`, err);
    }
  };

  return { value: s.value, set };
}
