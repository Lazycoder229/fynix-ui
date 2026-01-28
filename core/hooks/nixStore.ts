import { activeContext } from "../context/context";

/**
 * Reactive store hook with subscription support.
 * Memory-safe: cleans up subscribers on component unmount.
 *
 * @param {string} path - Optional path identifier
 * @param {any} initial - Initial value
 * @returns {Object} Reactive store object with get/set/subscribe
 */
export function nixStore<T = any>(
  path: string,
  initial: T
): {
  value: T;
  subscribe: (fn: () => void) => () => void;
  path: string;
  _isNixState: boolean;
} {
  type StoreHook = {
    value: T;
    subscribe: (fn: () => void) => () => void;
    path: string;
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

    const s: StoreHook = {
      get value() {
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
        value = v;
        subscribers.forEach((fn) => {
          try {
            fn();
          } catch (err) {
            console.error("[nixStore] Subscriber error:", err);
          }
        });
      },
      subscribe(fn: () => void) {
        if (typeof fn !== "function") {
          console.error("[nixStore] Subscriber must be a function");
          return () => {};
        }
        subscribers.add(fn);
        // Return cleanup function
        return () => subscribers.delete(fn);
      },
      path,
      _isNixState: true,
    };

    // Optional: register cleanup on component unmount
    if (!ctx.cleanups) ctx.cleanups = [];
    ctx.cleanups.push(() => subscribers.clear());

    ctx.hooks[idx] = s;
  }

  return ctx.hooks[idx] as StoreHook;
}
