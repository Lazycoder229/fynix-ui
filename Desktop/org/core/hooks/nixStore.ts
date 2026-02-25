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
import { activeContext } from "../context/context";

/**
 * Reactive store hook with subscription support and enhanced security.
 * Memory-safe: cleans up subscribers on component unmount.
 * Prevents prototype pollution and validates inputs.
 *
 * @template T
 * @param {string} path - Path identifier (required, must be safe)
 * @param {T} initial - Initial value
 * @returns {Object} Reactive store object with get/set/subscribe
 */
export function nixStore<T = any>(
  path: string,
  initial: T
): {
  value: T;
  subscribe: (fn: () => void) => () => void;
  path: string;
  cleanup: () => void;
  getSubscriberCount: () => number;
  isDestroyed: () => boolean;
  _isNixState: boolean;
} {
  // Input validation
  if (!path || typeof path !== "string") {
    throw new Error("[nixStore] Path must be a non-empty string");
  }

  // Validate path for security (prevent prototype pollution)
  const dangerousKeys = ["__proto__", "constructor", "prototype"];
  if (dangerousKeys.some((key) => path.includes(key))) {
    throw new Error("[nixStore] Path contains dangerous keywords");
  }

  if (path.length > 200) {
    throw new Error("[nixStore] Path too long (max 200 characters)");
  }

  type StoreHook = {
    value: T;
    subscribe: (fn: () => void) => () => void;
    path: string;
    cleanup: () => void;
    getSubscriberCount: () => number;
    isDestroyed: () => boolean;
    _isNixState: boolean;
  };

  const ctx = activeContext as
    | (typeof activeContext & {
        hookIndex: number;
        hooks: Array<StoreHook | undefined>;
        cleanups?: Array<() => void>;
      })
    | undefined;
  if (!ctx) throw new Error("nixStore() called outside component");

  const idx: number = ctx.hookIndex++;

  if (!ctx.hooks[idx]) {
    let value: T = initial;
    const subscribers: Set<() => void> = new Set();
    let isDestroyed = false;
    let maxSubscribers = 100; // Prevent memory leaks

    const s: StoreHook = {
      get value() {
        if (isDestroyed) {
          console.warn("[nixStore] Accessing destroyed store:", path);
          return value;
        }

        try {
          if ((activeContext as any)?._accessedStates) {
            (activeContext as any)._accessedStates.add(s);
          }
        } catch (err) {
          console.error("[nixStore] Error tracking accessed state:", err);
        }
        return value;
      },
      set value(v: T) {
        if (isDestroyed) {
          console.warn(
            "[nixStore] Attempting to set value on destroyed store:",
            path
          );
          return;
        }

        // Validate value for security
        if (v && typeof v === "object") {
          // Create safe object without dangerous properties
          const safeValue = Object.create(null);
          for (const key in v) {
            if (
              Object.prototype.hasOwnProperty.call(v, key) &&
              !dangerousKeys.includes(key)
            ) {
              safeValue[key] = v[key];
            }
          }
          value = safeValue as T;
        } else {
          value = v;
        }

        // Notify subscribers safely
        const subscriberArray = Array.from(subscribers);
        subscriberArray.forEach((fn) => {
          try {
            fn();
          } catch (err) {
            console.error("[nixStore] Subscriber error:", err);
            // Remove failing subscriber to prevent repeated errors
            subscribers.delete(fn);
          }
        });
      },
      subscribe(fn: () => void) {
        if (isDestroyed) {
          console.warn(
            "[nixStore] Attempting to subscribe to destroyed store:",
            path
          );
          return () => {};
        }

        if (typeof fn !== "function") {
          console.error("[nixStore] Subscriber must be a function");
          return () => {};
        }

        if (subscribers.size >= maxSubscribers) {
          console.warn(
            `[nixStore] Maximum subscribers (${maxSubscribers}) reached for store:`,
            path
          );
          return () => {};
        }

        subscribers.add(fn);
        // Return cleanup function
        return () => {
          subscribers.delete(fn);
        };
      },
      cleanup() {
        if (isDestroyed) return;

        isDestroyed = true;
        subscribers.clear();
        console.debug(`[nixStore] Cleaned up store: ${path}`);
      },
      getSubscriberCount: () => subscribers.size,
      isDestroyed: () => isDestroyed,
      path,
      _isNixState: true,
    };

    // Register cleanup on component unmount
    if (!ctx.cleanups) ctx.cleanups = [];
    ctx.cleanups.push(() => s.cleanup());

    ctx.hooks[idx] = s;
  }

  return ctx.hooks[idx] as StoreHook;
}
