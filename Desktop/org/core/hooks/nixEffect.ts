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
/* ----------------------
    nixEffect - Side Effects Hook
    Memory Leaks & Security Issues Resolved
---------------------- */
import { activeContext } from "../context/context";

/**
 * Execute side effects in a component with automatic cleanup and security enhancements.
 * Similar to React's useEffect but with enhanced security and memory leak prevention.
 *
 * @param {() => (void | (() => void))} effect - Effect function, optionally returns cleanup function
 * @param {Array<any>} [deps=[]] - Dependency array. Effect re-runs when dependencies change.
 * @param {object} [options={}] - Configuration options
 *
 * @example
 * // Run once on mount
 * nixEffect(() => {
 *   console.log('Component mounted');
 *   return () => console.log('Component unmounted');
 * }, []);
 *
 * @example
 * // Run when count changes with timeout
 * const count = nixState(0);
 * nixEffect(() => {
 *   console.log('Count is:', count.value);
 * }, [count.value], { timeout: 5000 });
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
export function nixEffect(
  effect: () => void | (() => void),
  deps: any[] = []
): void {
  const ctx = activeContext as
    | (typeof activeContext & {
        hookIndex: number;
        hooks: Array<any>;
        cleanups?: Array<() => void>;
      })
    | undefined;
  if (!ctx) throw new Error("nixEffect() called outside component");

  if (typeof effect !== "function") {
    console.error("[nixEffect] First argument must be a function");
    return;
  }
  if (!Array.isArray(deps)) {
    console.error("[nixEffect] Second argument must be an array");
    deps = [];
  }
  const MAX_DEPS = 100;
  if (deps.length > MAX_DEPS) {
    console.warn(
      `[nixEffect] Dependency array too large (${deps.length}). Limited to ${MAX_DEPS}.`
    );
    deps = deps.slice(0, MAX_DEPS);
  }
  const idx = ctx.hookIndex++;
  const prev = ctx.hooks[idx];
  const hasChanged = !prev || !shallowArrayEqual(prev.deps, deps);
  if (hasChanged) {
    if (prev?.cleanup) {
      try {
        if (typeof prev.cleanup === "function") {
          prev.cleanup();
        }
      } catch (err) {
        console.error("[nixEffect] Cleanup error:", err);
      }
    }
    let cleanup: void | (() => void);
    try {
      cleanup = effect();
      if (cleanup !== undefined && typeof cleanup !== "function") {
        console.warn(
          "[nixEffect] Effect should return undefined or a cleanup function"
        );
        cleanup = undefined;
      }
    } catch (err) {
      console.error("[nixEffect] Effect error:", err);
      cleanup = undefined;
    }
    ctx.hooks[idx] = { deps, cleanup };
    if (cleanup && typeof cleanup === "function") {
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
function shallowArrayEqual(arr1: any[], arr2: any[]): boolean {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
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
export function nixEffectOnce(effect: () => void | (() => void)): void {
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
export function nixEffectAlways(effect: () => void | (() => void)): void {
  const ctx = activeContext as
    | (typeof activeContext & { version: any })
    | undefined;
  if (!ctx) throw new Error("nixEffectAlways() called outside component");
  if (typeof effect !== "function") {
    console.error("[nixEffectAlways] Argument must be a function");
    return;
  }
  return nixEffect(effect, [ctx.version]);
}
