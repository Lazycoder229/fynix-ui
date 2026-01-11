/* ----------------------
    nixEffect - Side Effects Hook
    Memory Leaks & Security Issues Resolved
---------------------- */
import { activeContext } from "../context/context";

/**
 * Execute side effects in a component with automatic cleanup.
 * Similar to React's useEffect.
 * 
 * @param {() => (void | (() => void))} effect - Effect function, optionally returns cleanup function
 * @param {Array<any>} [deps=[]] - Dependency array. Effect re-runs when dependencies change.
 * 
 * @example
 * // Run once on mount
 * nixEffect(() => {
 *   console.log('Component mounted');
 *   return () => console.log('Component unmounted');
 * }, []);
 * 
 * @example
 * // Run when count changes
 * const count = nixState(0);
 * nixEffect(() => {
 *   console.log('Count is:', count.value);
 * }, [count.value]);
 * 
 * @example
 * // Timer with cleanup
 * nixEffect(() => {
 *   const timer = setInterval(() => console.log('tick'), 1000);
 *   return () => clearInterval(timer);
 * }, []);
 * 
 * @example
 * // Event listener with cleanup
 * nixEffect(() => {
 *   const handler = (e) => console.log('clicked', e);
 *   document.addEventListener('click', handler);
 *   return () => document.removeEventListener('click', handler);
 * }, []);
 * 
 * @throws {Error} If called outside a component context
 */
export function nixEffect(effect, deps = []) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixEffect() called outside component");

  // Security: Validate effect function
  if (typeof effect !== 'function') {
    console.error('[nixEffect] First argument must be a function');
    return;
  }

  // Security: Validate deps array
  if (!Array.isArray(deps)) {
    console.error('[nixEffect] Second argument must be an array');
    deps = [];
  }

  // Security: Limit dependency array size to prevent DOS
  const MAX_DEPS = 100;
  if (deps.length > MAX_DEPS) {
    console.warn(`[nixEffect] Dependency array too large (${deps.length}). Limited to ${MAX_DEPS}.`);
    deps = deps.slice(0, MAX_DEPS);
  }

  const idx = ctx.hookIndex++;
  const prev = ctx.hooks[idx];

  // Performance & Security: Deep comparison instead of JSON.stringify
  // JSON.stringify issues:
  // 1. Can throw on circular references
  // 2. Fails on undefined, functions, symbols
  // 3. Performance issue with large objects
  // 4. Security: Can expose internal object structure
  const hasChanged = !prev || !shallowArrayEqual(prev.deps, deps);

  if (hasChanged) {
    // Memory Leak Fix: Clean up previous effect
    if (prev?.cleanup) {
      try {
        if (typeof prev.cleanup === 'function') {
          prev.cleanup();
        }
      } catch (err) {
        console.error('[nixEffect] Cleanup error:', err);
      }
    }

    // Run the new effect
    let cleanup;
    try {
      cleanup = effect();
      
      // Validate cleanup return value
      if (cleanup !== undefined && typeof cleanup !== 'function') {
        console.warn('[nixEffect] Effect should return undefined or a cleanup function');
        cleanup = undefined;
      }
    } catch (err) {
      console.error('[nixEffect] Effect error:', err);
      cleanup = undefined;
    }

    // Store effect data
    ctx.hooks[idx] = { deps, cleanup };

    // Memory Leak Fix: Track cleanup for component unmount
    if (cleanup && typeof cleanup === 'function') {
      if (!ctx.cleanups) ctx.cleanups = [];
      ctx.cleanups.push(cleanup);
    }
  }
}

/**
 * Shallow comparison of two arrays for dependency checking.
 * More reliable and secure than JSON.stringify.
 * 
 * @param {Array<any>} arr1 - First array
 * @param {Array<any>} arr2 - Second array
 * @returns {boolean} True if arrays are shallowly equal
 */
function shallowArrayEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  
  for (let i = 0; i < arr1.length; i++) {
    // Use Object.is for proper comparison (handles NaN, -0, +0)
    if (!Object.is(arr1[i], arr2[i])) {
      return false;
    }
  }
  
  return true;
}

/**
 * Run an effect only once on component mount.
 * Convenience wrapper around nixEffect.
 * 
 * @param {() => (void | (() => void))} effect - Effect function
 * 
 * @example
 * nixEffectOnce(() => {
 *   console.log('Mounted');
 *   return () => console.log('Unmounted');
 * });
 */
export function nixEffectOnce(effect) {
  return nixEffect(effect, []);
}

/**
 * Run an effect every time the component renders.
 * Use with caution - can cause performance issues.
 * 
 * @param {() => (void | (() => void))} effect - Effect function
 * 
 * @example
 * nixEffectAlways(() => {
 *   console.log('Component rendered');
 * });
 */
export function nixEffectAlways(effect) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixEffectAlways() called outside component");
  
  if (typeof effect !== 'function') {
    console.error('[nixEffectAlways] Argument must be a function');
    return;
  }

  // Always run by using a unique dependency each time
  return nixEffect(effect, [ctx.version]);
}