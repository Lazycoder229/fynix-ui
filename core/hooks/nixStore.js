import { activeContext } from "../context/context";

/**
 * Reactive store hook with subscription support.
 * Memory-safe: cleans up subscribers on component unmount.
 *
 * @param {string} path - Optional path identifier
 * @param {any} initial - Initial value
 * @returns {Object} Reactive store object with get/set/subscribe
 */
export function nixStore(path, initial) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixStore() called outside component");

  const idx = ctx.hookIndex++;

  if (!ctx.hooks[idx]) {
    let value = initial;
    const subscribers = new Set();

    const s = {
      get value() {
        try {
          if (activeContext?._accessedStates) {
            activeContext._accessedStates.add(s);
          }
        } catch (err) {
          console.error("[nixStore] Error tracking accessed state:", err);
        }
        return value;
      },
      set value(v) {
        value = v;
        subscribers.forEach((fn) => {
          try {
            fn();
          } catch (err) {
            console.error("[nixStore] Subscriber error:", err);
          }
        });
      },
      subscribe(fn) {
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

  return ctx.hooks[idx];
}
