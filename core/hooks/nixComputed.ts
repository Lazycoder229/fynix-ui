/* ----------------------
    nixComputed - Computed/Derived State
    Memory Leaks & Security Issues Resolved
---------------------- */
import { activeContext, setActiveContext } from "../context/context";

/**
 * @template T
 * @typedef {Object} ComputedState
 * @property {T} value - Get the computed value (read-only)
 * @property {(fn: (value: T) => void) => (() => void)} subscribe - Subscribe to computed value changes
 * @property {() => void} cleanup - Cleanup all subscriptions and dependencies
 * @property {() => number} getSubscriberCount - Get number of active subscribers (debugging)
 * @property {() => number} getDependencyCount - Get number of tracked dependencies (debugging)
 * @property {() => boolean} isDestroyed - Check if computed state has been destroyed
 * @property {boolean} _isNixState - Internal flag (computed states behave like states)
 * @property {boolean} _isComputed - Internal flag to identify computed states
 */

/**
 * Create a derived/computed state from other states.
 * Automatically tracks dependencies and updates when any dependency changes.
 *
 * @template T
 * @param {() => T} computeFn - Function that computes the derived value
 * @returns {ComputedState<T>} A reactive state object with the computed value
 *
 * @example
 * const count = nixState(5);
 * const doubled = nixComputed(() => count.value * 2);
 * console.log(doubled.value); // 10
 * count.value = 10;
 * console.log(doubled.value); // 20
 *
 * @example
 * // Multiple dependencies
 * const a = nixState(5);
 * const b = nixState(10);
 * const sum = nixComputed(() => a.value + b.value);
 * console.log(sum.value); // 15
 *
 * @example
 * // Conditional dependencies
 * const flag = nixState(true);
 * const x = nixState(1);
 * const y = nixState(2);
 * const result = nixComputed(() => flag.value ? x.value : y.value);
 *
 * @example
 * // With cleanup
 * const MyComponent = () => {
 *   const count = nixState(0);
 *   const doubled = nixComputed(() => count.value * 2);
 *
 *   nixEffect(() => {
 *     return () => {
 *       doubled.cleanup();
 *       count.cleanup();
 *     };
 *   }, []);
 * };
 *
 * @throws {Error} If called outside a component context
 * @throws {TypeError} If computeFn is not a function
 */
export function nixComputed<T>(computeFn: () => T): {
  value: T;
  subscribe: (fn: (value: T) => void) => () => void;
  cleanup: () => void;
  getSubscriberCount: () => number;
  getDependencyCount: () => number;
  isDestroyed: () => boolean;
  getDependencyInfo: () => Array<{
    state: any;
    hasCleanup: boolean;
    isComputed: boolean;
  }>;
  _isNixState: true;
  _isComputed: true;
} {
  const ctx = activeContext as
    | (typeof activeContext & {
        hookIndex: number;
        hooks: Array<any>;
        stateCleanups?: Array<() => void>;
      })
    | undefined;
  if (!ctx) throw new Error("nixComputed() called outside component");

  if (typeof computeFn !== "function") {
    throw new TypeError("[nixComputed] First argument must be a function");
  }

  const idx = ctx.hookIndex++;
  if (!ctx.hooks[idx]) {
    const subscribers: Set<(value: T) => void> = new Set();
    const dependencies: Set<any> = new Set();
    const unsubscribers: Map<any, () => void> = new Map();
    let cachedValue: T;
    let isStale = true;
    let isDestroyed = false;
    let isComputing = false;

    function compute(): T {
      if (isDestroyed) return cachedValue;
      if (isComputing) {
        console.error("[nixComputed] Circular dependency detected");
        return cachedValue;
      }
      isComputing = true;
      // Provide all required properties for ComponentContext type
      // Use type assertion for safety and future-proofing
      const trackingContext = {
        _accessedStates: new Set(),
        hookIndex: 0,
        hooks: [],
        _subscriptions: new Set(),
        _subscriptionCleanups: [],
        effects: [],
        cleanups: [],
        _vnode: null,
        version: 0,
        props: {},
        stateCleanups: [],
        parent: null,
        context: {},
        rerender: () => {},
        Component: null,
        _isMounted: false,
        _isRerendering: false,
      } as any; // Use 'as any' to satisfy ComponentContext type
      const prevContext = activeContext;
      try {
        setActiveContext(trackingContext);
        cachedValue = computeFn();
        const oldDeps = Array.from(dependencies);
        oldDeps.forEach((dep) => {
          if (!trackingContext._accessedStates.has(dep)) {
            if (unsubscribers.has(dep)) {
              try {
                unsubscribers.get(dep)!();
              } catch (e) {
                console.error(
                  "[nixComputed] Error unsubscribing from old dependency:",
                  e
                );
              }
              unsubscribers.delete(dep);
            }
            dependencies.delete(dep);
          }
        });
        trackingContext._accessedStates.forEach((state: any) => {
          if (!dependencies.has(state)) {
            const unsub = state.subscribe(() => {
              isStale = true;
              const subsArray = Array.from(subscribers);
              subsArray.forEach((fn) => {
                try {
                  fn(s.value);
                } catch (e) {
                  console.error("[nixComputed] Subscriber error:", e);
                  subscribers.delete(fn);
                }
              });
            });
            unsubscribers.set(state, unsub);
            dependencies.add(state);
          }
        });
        isStale = false;
      } catch (err) {
        console.error("[nixComputed] Compute error:", err);
        isStale = false;
      } finally {
        setActiveContext(prevContext);
        isComputing = false;
      }
      return cachedValue;
    }

    const s = {
      get value(): T {
        if (isDestroyed) {
          console.warn("[nixComputed] Accessing destroyed computed state");
          return cachedValue;
        }
        if (isStale) {
          compute();
        }
        if (activeContext && activeContext._accessedStates) {
          activeContext._accessedStates.add(s);
        }
        return cachedValue;
      },
      subscribe(fn: (value: T) => void): () => void {
        if (typeof fn !== "function") {
          console.error("[nixComputed] subscribe() requires a function");
          return () => {};
        }
        if (isDestroyed) {
          console.warn(
            "[nixComputed] Cannot subscribe to destroyed computed state"
          );
          return () => {};
        }
        const MAX_SUBSCRIBERS = 1000;
        if (subscribers.size >= MAX_SUBSCRIBERS) {
          console.error("[nixComputed] Maximum subscriber limit reached");
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
        unsubscribers.forEach((unsub) => {
          try {
            unsub();
          } catch (e) {
            console.error("[nixComputed] Cleanup error:", e);
          }
        });
        unsubscribers.clear();
        dependencies.clear();
        subscribers.clear();
        cachedValue = null as any as T;
        console.log("[nixComputed] Computed state cleaned up");
      },
      getSubscriberCount(): number {
        return subscribers.size;
      },
      getDependencyCount(): number {
        return dependencies.size;
      },
      isDestroyed(): boolean {
        return isDestroyed;
      },
      getDependencyInfo(): Array<{
        state: any;
        hasCleanup: boolean;
        isComputed: boolean;
      }> {
        return Array.from(dependencies).map((state) => ({
          state,
          hasCleanup: unsubscribers.has(state),
          isComputed: !!state._isComputed,
        }));
      },
      _isNixState: true as const,
      _isComputed: true as const,
    };

    compute();
    ctx.hooks[idx] = s;
    if (ctx.stateCleanups) {
      ctx.stateCleanups.push(() => s.cleanup());
    }
  }
  return ctx.hooks[idx] as ReturnType<typeof nixComputed<T>>;
}
