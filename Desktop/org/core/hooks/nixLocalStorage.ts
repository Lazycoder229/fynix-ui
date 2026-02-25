/* MIT License

* Copyright (c) 2026 Resty Gonzales

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
 */
/**
 * @fileoverview Reactive localStorage hook for Fynix.
 * Automatically syncs state with localStorage using JSON serialization.
 */

import { nixState } from "./nixState";

/**
 * Safe JSON parsing with validation to prevent code injection
 * @param value - String to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed value or fallback
 */
function safeJSONParse<T>(value: string | null, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  try {
    // Basic validation: check for suspicious patterns
    if (typeof value !== "string") {
      console.warn("[nixLocalStorage] Non-string value provided to JSON.parse");
      return fallback;
    }

    // Check for potentially malicious patterns
    const suspiciousPatterns = [
      /__proto__/,
      /constructor/,
      /prototype/,
      /function\s*\(/,
      /=>\s*{/,
      /javascript:/,
      /<script/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(value)) {
        console.warn(
          "[nixLocalStorage] Potentially malicious content detected, using fallback"
        );
        return fallback;
      }
    }

    // Parse and validate the result
    const parsed = JSON.parse(value);

    // Additional validation: ensure the parsed object doesn't have dangerous properties
    if (parsed && typeof parsed === "object") {
      if (parsed.constructor !== Object && parsed.constructor !== Array) {
        console.warn("[nixLocalStorage] Unsafe object constructor detected");
        return fallback;
      }
    }

    return parsed as T;
  } catch (error) {
    console.warn("[nixLocalStorage] JSON parsing failed:", error);
    return fallback;
  }
}

/**
 * Safe JSON stringification with size limits
 * @param value - Value to stringify
 * @param maxSize - Maximum size in characters (default: 1MB)
 * @returns JSON string or null if too large/invalid
 */
function safeJSONStringify<T>(value: T, maxSize = 1024 * 1024): string | null {
  try {
    const stringified = JSON.stringify(value);

    if (stringified.length > maxSize) {
      console.warn(
        "[nixLocalStorage] Value too large to store:",
        stringified.length,
        "characters"
      );
      return null;
    }

    return stringified;
  } catch (error) {
    console.warn("[nixLocalStorage] JSON stringification failed:", error);
    return null;
  }
}

/**
 * Reactive wrapper around localStorage with safe JSON parsing/stringifying.
 * Automatically persists state changes to localStorage.
 *
 * @template T
 * @param {string} key - LocalStorage key
 * @param {T} initial - Initial value if key does not exist
 * @returns {{ value: T, set: (v: T) => void, clear: () => void, getSize: () => number }} Secure storage object
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
): {
  value: T;
  set: (v: T) => boolean;
  clear: () => void;
  getSize: () => number;
  isValid: () => boolean;
} {
  // Validate inputs
  if (!key || typeof key !== "string") {
    throw new Error("[nixLocalStorage] Key must be a non-empty string");
  }

  if (key.length > 100) {
    throw new Error("[nixLocalStorage] Key too long (max 100 characters)");
  }

  let initialValue: T;
  let isStorageValid = true;

  try {
    // Check if localStorage is available
    if (typeof localStorage === "undefined") {
      console.warn(
        "[nixLocalStorage] localStorage not available, using in-memory fallback"
      );
      isStorageValid = false;
      initialValue = initial;
    } else {
      const stored = localStorage.getItem(key);
      initialValue = safeJSONParse(stored, initial);
    }
  } catch (err) {
    console.error(`[nixLocalStorage] Error reading key "${key}":`, err);
    initialValue = initial;
    isStorageValid = false;
  }

  const state = nixState<T>(initialValue);

  const set = (v: T): boolean => {
    if (!isStorageValid) {
      state.value = v;
      return false;
    }

    try {
      const stringified = safeJSONStringify(v);
      if (stringified === null) {
        console.error(
          `[nixLocalStorage] Failed to stringify value for key "${key}"`
        );
        return false;
      }

      localStorage.setItem(key, stringified);
      state.value = v;
      return true;
    } catch (err) {
      console.error(`[nixLocalStorage] Error setting key "${key}":`, err);
      // Update state even if localStorage fails (in-memory fallback)
      state.value = v;
      return false;
    }
  };

  const clear = (): void => {
    try {
      if (isStorageValid) {
        localStorage.removeItem(key);
      }
      state.value = initial;
    } catch (err) {
      console.error(`[nixLocalStorage] Error clearing key "${key}":`, err);
    }
  };

  const getSize = (): number => {
    try {
      if (!isStorageValid) return 0;
      const stored = localStorage.getItem(key);
      return stored ? stored.length : 0;
    } catch {
      return 0;
    }
  };

  const isValid = (): boolean => isStorageValid;

  return {
    get value() {
      return state.value;
    },
    set value(v: T) {
      set(v);
    },
    set,
    clear,
    getSize,
    isValid,
  };
}
