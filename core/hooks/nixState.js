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
export function nixState(initial) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixState() called outside component");

  const idx = ctx.hookIndex++;
  if (!ctx.hooks[idx]) {
    let value = initial;
    const subscribers = new Set();
    let isDestroyed = false;
    
    // Security: Validate initial value to prevent prototype pollution
    if (initial !== null && typeof initial === 'object') {
      if ('__proto__' in initial || 'constructor' in initial || 'prototype' in initial) {
        console.warn('[nixState] Security: Dangerous properties detected in initial value');
        // Create a clean copy without dangerous properties
        if (Array.isArray(initial)) {
          value = [...initial];
        } else {
          value = { ...initial };
          delete value.__proto__;
          delete value.constructor;
          delete value.prototype;
        }
      }
    }

    const s = {
      /**
       * Get the current state value. Automatically tracks this state as a dependency.
       * @returns {*} The current state value
       */
      get value() {
        // Memory Leak Fix: Check if state is destroyed
        if (isDestroyed) {
          console.warn('[nixState] Accessing destroyed state');
          return value;
        }
        
        // Track dependency only if there's an active context
        if (activeContext && !isDestroyed) {
          activeContext._accessedStates.add(s);
        }
        return value;
      },
      
      /**
       * Set a new state value. Triggers all subscribers if value changed.
       * @param {any} newVal - The new value to set
       */
      set value(newVal) {
        // Memory Leak Fix: Prevent updates on destroyed state
        if (isDestroyed) {
          console.warn('[nixState] Attempting to update destroyed state');
          return;
        }
        
        // Performance: Skip update if value hasn't changed
        if (newVal === value) return;
        
        // Security: Validate new value to prevent prototype pollution
        if (newVal !== null && typeof newVal === 'object') {
          if ('__proto__' in newVal || 'constructor' in newVal || 'prototype' in newVal) {
            console.warn('[nixState] Security: Dangerous properties detected in new value');
            // Create a clean copy
            if (Array.isArray(newVal)) {
              newVal = [...newVal];
            } else {
              newVal = { ...newVal };
              delete newVal.__proto__;
              delete newVal.constructor;
              delete newVal.prototype;
            }
          }
        }
        
        value = newVal;
        
        // Notify all subscribers
        // Memory Leak Fix: Use Array.from to prevent modification during iteration
        const subsArray = Array.from(subscribers);
        subsArray.forEach((fn) => {
          try {
            fn(newVal);
          } catch (err) {
            console.error('[nixState] Subscriber error:', err);
            // Remove failed subscriber to prevent future errors
            subscribers.delete(fn);
          }
        });
      },
      
      /**
       * Subscribe to state changes.
       * @param {(value: any) => void} fn - Callback function called when state changes
       * @returns {() => void} Unsubscribe function
       * 
       * @example
       * const unsub = state.subscribe((newVal) => {
       *   console.log('State changed to:', newVal);
       * });
       * // Later: unsub();
       */
      subscribe(fn) {
        // Security: Validate subscriber function
        if (typeof fn !== 'function') {
          console.error('[nixState] subscribe() requires a function');
          return () => {}; // Return no-op unsubscribe
        }
        
        // Memory Leak Fix: Don't add subscribers to destroyed state
        if (isDestroyed) {
          console.warn('[nixState] Cannot subscribe to destroyed state');
          return () => {};
        }
        
        // Security: Limit number of subscribers to prevent DOS
        const MAX_SUBSCRIBERS = 1000;
        if (subscribers.size >= MAX_SUBSCRIBERS) {
          console.error('[nixState] Maximum subscriber limit reached');
          return () => {};
        }
        
        subscribers.add(fn);
        
        // Return unsubscribe function
        return () => {
          subscribers.delete(fn);
        };
      },
      
      /**
       * Cleanup all subscriptions and mark state as destroyed.
       * Call this when component unmounts to prevent memory leaks.
       * 
       * @example
       * nixEffect(() => {
       *   return () => myState.cleanup();
       * }, []);
       */
      cleanup() {
        if (isDestroyed) return;
        
        // Mark as destroyed to prevent further operations
        isDestroyed = true;
        
        // Clear all subscribers
        subscribers.clear();
        
        // Clear value if it's an object/array to help garbage collection
        if (value !== null && typeof value === 'object') {
          if (Array.isArray(value)) {
            value = [];
          } else {
            value = null;
          }
        }
        
        console.log('[nixState] State cleaned up');
      },
      
      /**
       * Get the number of active subscribers (useful for debugging)
       * @returns {number} Number of active subscribers
       */
      getSubscriberCount() {
        return subscribers.size;
      },
      
      /**
       * Check if state has been destroyed
       * @returns {boolean} True if state is destroyed
       */
      isDestroyed() {
        return isDestroyed;
      },
      
      /**
       * Get a read-only version of the state (prevents modification)
       * Useful for passing to child components
       * @returns {Object} Read-only state object
       * 
       * @example
       * const readOnly = state.asReadOnly();
       * console.log(readOnly.value); // Can read
       * readOnly.value = 5; // Has no effect (no setter)
       */
      asReadOnly() {
        return {
          get value() {
            return s.value;
          },
          subscribe: s.subscribe.bind(s),
          _isNixState: true,
          _isReadOnly: true,
        };
      },
      
      // Internal flags
      _isNixState: true,
    };

    // Store state in hooks
    ctx.hooks[idx] = s;
    
    // Memory Leak Fix: Track state for cleanup
    if (ctx.stateCleanups) {
      ctx.stateCleanups.push(() => s.cleanup());
    }
  }

  return ctx.hooks[idx];
}