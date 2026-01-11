/* ----------------------
    nixComputed - Computed/Derived State
    Memory Leaks & Security Issues Resolved
---------------------- */
import { activeContext, setActiveContext } from "../context/context";

/**
 * Create a derived/computed state from other states.
 * Automatically tracks dependencies and updates when any dependency changes.
 * 
 * @param {() => any} computeFn - Function that computes the derived value
 * @returns {ComputedState} A reactive state object with the computed value
 * 
 * @typedef {Object} ComputedState
 * @property {any} value - Get the computed value (read-only)
 * @property {(fn: Function) => Function} subscribe - Subscribe to computed value changes
 * @property {() => void} cleanup - Cleanup all subscriptions and dependencies
 * @property {() => number} getSubscriberCount - Get number of active subscribers (debugging)
 * @property {() => number} getDependencyCount - Get number of tracked dependencies (debugging)
 * @property {() => boolean} isDestroyed - Check if computed state has been destroyed
 * @property {boolean} _isNixState - Internal flag (computed states behave like states)
 * @property {boolean} _isComputed - Internal flag to identify computed states
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
export function nixComputed(computeFn) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixComputed() called outside component");
  
  // Security: Validate compute function
  if (typeof computeFn !== 'function') {
    throw new TypeError('[nixComputed] First argument must be a function');
  }

  const idx = ctx.hookIndex++;
  if (!ctx.hooks[idx]) {
    const subscribers = new Set();
    const dependencies = new Set();
    const unsubscribers = new Map(); // Map<dependency, unsubscribe function>
    let cachedValue;
    let isStale = true;
    let isDestroyed = false;
    let isComputing = false; // Prevent infinite loops

    /**
     * Compute the value and track dependencies
     */
    function compute() {
      if (isDestroyed) return cachedValue;
      
      // Prevent infinite computation loops
      if (isComputing) {
        console.error('[nixComputed] Circular dependency detected');
        return cachedValue;
      }
      
      isComputing = true;
      
      // Create a mock context for dependency tracking
      const trackingContext = {
        _accessedStates: new Set(),
        hookIndex: 0,
        hooks: [],
        _subscriptions: new Set(),
        _subscriptionCleanups: [],
      };
      
      // Save the previous context
      const prevContext = activeContext;
      
      try {
        // Temporarily set the tracking context
        setActiveContext(trackingContext);
        
        // Compute the value - this will trigger state.value getters
        // which will add themselves to trackingContext._accessedStates
        cachedValue = computeFn();
        
        // Find dependencies that are no longer needed
        const oldDeps = Array.from(dependencies);
        oldDeps.forEach(dep => {
          if (!trackingContext._accessedStates.has(dep)) {
            // This dependency is no longer accessed - unsubscribe
            if (unsubscribers.has(dep)) {
              try {
                unsubscribers.get(dep)();
              } catch (e) {
                console.error('[nixComputed] Error unsubscribing from old dependency:', e);
              }
              unsubscribers.delete(dep);
            }
            dependencies.delete(dep);
          }
        });
        
        // Subscribe to new dependencies
        trackingContext._accessedStates.forEach(state => {
          if (!dependencies.has(state)) {
            // New dependency found - subscribe to it
            const unsub = state.subscribe(() => {
              // Mark computed value as stale when dependency changes
              isStale = true;
              
              // Notify computed subscribers
              const subsArray = Array.from(subscribers);
              subsArray.forEach(fn => {
                try { 
                  fn(s.value); 
                } catch (e) { 
                  console.error('[nixComputed] Subscriber error:', e);
                  subscribers.delete(fn);
                }
              });
            });
            
            // Store unsubscribe function
            unsubscribers.set(state, unsub);
            dependencies.add(state);
          }
        });
        
        isStale = false;
      } catch (err) {
        console.error('[nixComputed] Compute error:', err);
        isStale = false; // Don't retry immediately
      } finally {
        // Restore the previous context
        setActiveContext(prevContext);
        isComputing = false;
      }
      
      return cachedValue;
    }

    const s = {
      /**
       * Get the computed value (read-only).
       * Automatically recomputes if dependencies have changed.
       * @returns {any} The computed value
       */
      get value() {
        if (isDestroyed) {
          console.warn('[nixComputed] Accessing destroyed computed state');
          return cachedValue;
        }
        
        // Recompute if stale
        if (isStale) {
          compute();
        }
        
        // Track this computed state as a dependency if accessed in another computed
        if (activeContext && activeContext._accessedStates) {
          activeContext._accessedStates.add(s);
        }
        
        return cachedValue;
      },
      
      /**
       * Subscribe to computed value changes.
       * @param {(value: T) => void} fn - Callback function
       * @returns {() => void} Unsubscribe function
       */
      subscribe(fn) {
        // Security: Validate subscriber function
        if (typeof fn !== 'function') {
          console.error('[nixComputed] subscribe() requires a function');
          return () => {};
        }
        
        // Memory Leak Fix: Don't add subscribers to destroyed state
        if (isDestroyed) {
          console.warn('[nixComputed] Cannot subscribe to destroyed computed state');
          return () => {};
        }
        
        // Security: Limit number of subscribers to prevent DOS
        const MAX_SUBSCRIBERS = 1000;
        if (subscribers.size >= MAX_SUBSCRIBERS) {
          console.error('[nixComputed] Maximum subscriber limit reached');
          return () => {};
        }
        
        subscribers.add(fn);
        
        // Return unsubscribe function
        return () => {
          subscribers.delete(fn);
        };
      },
      
      /**
       * Cleanup all subscriptions and dependencies.
       * Call this when component unmounts to prevent memory leaks.
       * 
       * @example
       * nixEffect(() => {
       *   return () => myComputed.cleanup();
       * }, []);
       */
      cleanup() {
        if (isDestroyed) return;
        
        // Mark as destroyed to prevent further operations
        isDestroyed = true;
        
        // Unsubscribe from all dependencies
        unsubscribers.forEach((unsub, dep) => {
          try {
            unsub();
          } catch (e) {
            console.error('[nixComputed] Cleanup error:', e);
          }
        });
        
        // Clear all collections
        unsubscribers.clear();
        dependencies.clear();
        subscribers.clear();
        
        // Clear cached value to help garbage collection
        cachedValue = null;
        
        console.log('[nixComputed] Computed state cleaned up');
      },
      
      /**
       * Get the number of active subscribers (useful for debugging)
       * @returns {number} Number of active subscribers
       */
      getSubscriberCount() {
        return subscribers.size;
      },
      
      /**
       * Get the number of tracked dependencies (useful for debugging)
       * @returns {number} Number of dependencies
       */
      getDependencyCount() {
        return dependencies.size;
      },
      
      /**
       * Check if computed state has been destroyed
       * @returns {boolean} True if state is destroyed
       */
      isDestroyed() {
        return isDestroyed;
      },
      
      /**
       * Get information about current dependencies (debugging)
       * @returns {Array<{state: Object, hasCleanup: boolean}>} Dependency info
       */
      getDependencyInfo() {
        return Array.from(dependencies).map(dep => ({
          state: dep,
          hasCleanup: unsubscribers.has(dep),
          isComputed: !!dep._isComputed,
        }));
      },
      
      // Internal flags
      _isNixState: true,  // Computed states behave like states
      _isComputed: true,  // Flag to identify computed states
    };

    // Initial computation
    compute();
    
    // Store in hooks
    ctx.hooks[idx] = s;
    
    // Memory Leak Fix: Track for cleanup
    if (ctx.stateCleanups) {
      ctx.stateCleanups.push(() => s.cleanup());
    }
  }

  return ctx.hooks[idx];
}