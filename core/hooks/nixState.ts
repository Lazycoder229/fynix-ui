/* ----------------------
    nixState - Reactive State
    Memory Leaks & Security Issues Resolved
---------------------- */
import { activeContext } from "../context/context";

/**
 * Creates a reactive state value that triggers component re-renders when changed.
 * Must be called within a component function.
 *
 * @param {any} initial - The initial value for the state
 * @returns {NixState} A reactive state object with value getter/setter and subscription methods
 *
 * @typedef {Object} NixState
 * @property {any} value - Get/set the current state value. Getting tracks the dependency, setting triggers subscribers.
 * @property {(fn: Function) => Function} subscribe - Subscribe to state changes. Returns unsubscribe function.
 * @property {() => void} cleanup - Cleanup all subscriptions to prevent memory leaks
 * @property {() => number} getSubscriberCount - Get number of active subscribers (debugging)
 * @property {() => boolean} isDestroyed - Check if state has been destroyed
 * @property {() => Object} asReadOnly - Get read-only version of the state
 * @property {boolean} _isNixState - Internal flag to identify nixState objects
 *
 * @example
 * const Counter = () => {
 *   const count = nixState(0);
 *
 *   return h("div", {},
 *     h("p", {}, "Count: ", count),
 *     h("button", { "r-click": () => count.value++ }, "Increment")
 *   );
 * };
 *
 * @example
 * // With cleanup
 * const MyComponent = () => {
 *   const state = nixState(0);
 *
 *   nixEffect(() => {
 *     return () => state.cleanup(); // Clean up on unmount
 *   }, []);
 * };
 *
 * @throws {Error} If called outside a component context
 */
export function nixState<T>(initial: T): {
  value: T;
  subscribe: (fn: (value: T) => void) => () => void;
  cleanup: () => void;
  getSubscriberCount: () => number;
  isDestroyed: () => boolean;
  asReadOnly: () => {
    value: T;
    subscribe: (fn: (value: T) => void) => () => void;
    _isNixState: true;
    _isReadOnly: true;
  };
  _isNixState: true;
} {
  const ctx = activeContext as
    | (typeof activeContext & {
        hookIndex: number;
        hooks: Array<any>;
        stateCleanups?: Array<() => void>;
      })
    | undefined;
  if (!ctx) throw new Error("nixState() called outside component");

  const idx = ctx.hookIndex++;
  if (!ctx.hooks[idx]) {
    let value: T = initial;
    const subscribers: Set<(value: T) => void> = new Set();
    let isDestroyed = false;

    // Security: Validate initial value to prevent prototype pollution
    if (initial !== null && typeof initial === "object") {
      if (
        "__proto__" in (initial as any) ||
        "constructor" in (initial as any) ||
        "prototype" in (initial as any)
      ) {
        // Create a clean copy without dangerous properties
        if (Array.isArray(initial)) {
          value = [...(initial as any)] as T;
        } else {
          value = { ...(initial as any) };
          delete (value as any).__proto__;
          delete (value as any).constructor;
          delete (value as any).prototype;
        }
      }
    }

    const s = {
      get value(): T {
        if (isDestroyed) {
          /*   console.warn("[nixState] Accessing destroyed state"); */
          return value;
        }
        if (activeContext && !isDestroyed) {
          activeContext._accessedStates.add(s);
        }
        return value;
      },
      set value(newVal: T) {
        if (isDestroyed) {
          /*   console.warn("[nixState] Attempting to update destroyed state"); */
          return;
        }
        if (newVal === value) return;
        if (newVal !== null && typeof newVal === "object") {
          if (
            "__proto__" in (newVal as any) ||
            "constructor" in (newVal as any) ||
            "prototype" in (newVal as any)
          ) {
            /* console.warn(
              "[nixState] Security: Dangerous properties detected in new value"
            ); */
            if (Array.isArray(newVal)) {
              newVal = [...(newVal as any)] as T;
            } else {
              newVal = { ...(newVal as any) };
              delete (newVal as any).__proto__;
              delete (newVal as any).constructor;
              delete (newVal as any).prototype;
            }
          }
        }
        value = newVal;
        const subsArray = Array.from(subscribers);
        subsArray.forEach((fn) => {
          try {
            fn(newVal);
          } catch (err) {
            console.error("[nixState] Subscriber error:", err);
            subscribers.delete(fn);
          }
        });
      },
      subscribe(fn: (value: T) => void): () => void {
        if (typeof fn !== "function") {
          console.error("[nixState] subscribe() requires a function");
          return () => {};
        }
        if (isDestroyed) {
          console.warn("[nixState] Cannot subscribe to destroyed state");
          return () => {};
        }
        const MAX_SUBSCRIBERS = 1000;
        if (subscribers.size >= MAX_SUBSCRIBERS) {
          console.error("[nixState] Maximum subscriber limit reached");
          return () => {};
        }
        subscribers.add(fn);
        return () => {
          subscribers.delete(fn);
        };
      },
      cleanup(): void {
        if (isDestroyed) return;
        isDestroyed = true;
        subscribers.clear();
        if (value !== null && typeof value === "object") {
          if (Array.isArray(value)) {
            value = [] as any as T;
          } else {
            value = null as any as T;
          }
        }
        console.log("[nixState] State cleaned up");
      },
      getSubscriberCount(): number {
        return subscribers.size;
      },
      isDestroyed(): boolean {
        return isDestroyed;
      },
      asReadOnly(): {
        value: T;
        subscribe: (fn: (value: T) => void) => () => void;
        _isNixState: true;
        _isReadOnly: true;
      } {
        return {
          get value() {
            return s.value;
          },
          subscribe: s.subscribe.bind(s),
          _isNixState: true,
          _isReadOnly: true,
        };
      },
      _isNixState: true as const,
    };

    ctx.hooks[idx] = s;
    if (ctx.stateCleanups) {
      ctx.stateCleanups.push(() => s.cleanup());
    }
  }
  return ctx.hooks[idx] as ReturnType<typeof nixState<T>>;
}
