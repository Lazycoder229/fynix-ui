import { activeContext } from "../context/context";

/**
 * Memoizes a callback function based on a dependency array.
 * Similar to React's useCallback.
 *
 * @param {Function} fn
 * Function to memoize. Should be pure and not mutate external state.
 *
 * @param {Array<any>} [deps=[]]
 * Dependency array. Callback identity changes only when deps change.
 *
 * @returns {Function}
 * Memoized callback function.
 *
 * @throws {Error}
 * If called outside of a component context.
 *
 * @example
 * const onClick = nixCallback(() => {
 *   console.log(count.value);
 * }, [count.value]);
 *
 * @security
 * - Avoids JSON.stringify to prevent crashes on circular references
 * - Limits dependency array size to prevent performance abuse
 *
 * @memory
 * - Does not allocate large temporary strings
 * - Reuses function reference when deps are unchanged
 */
export function nixCallback<T extends (...args: any[]) => any>(
  fn: T,
  deps: any[] = []
): T {
  const ctx = activeContext as {
    hookIndex: number;
    hooks: Array<{ value: T; deps: any[] } | undefined>;
  };
  if (!ctx) throw new Error("nixCallback() called outside component");

  if (typeof fn !== "function") {
    console.error("[nixCallback] First argument must be a function");
    return fn;
  }

  if (!Array.isArray(deps)) {
    console.error("[nixCallback] Second argument must be an array");
    deps = [];
  }

  const MAX_DEPS = 100;
  if (deps.length > MAX_DEPS) {
    console.warn(
      `[nixCallback] Dependency array too large (${deps.length}). Limited to ${MAX_DEPS}.`
    );
    deps = deps.slice(0, MAX_DEPS);
  }

  const idx: number = ctx.hookIndex++;
  const prev: { value: T; deps: any[] } | undefined = ctx.hooks[idx];

  if (!prev || !shallowArrayEqual(prev.deps, deps)) {
    ctx.hooks[idx] = { value: fn, deps };
  }

  return ctx.hooks[idx]!.value;
}

/**
 * Shallow comparison for dependency arrays.
 *
 * @param {Array<any>} a
 * @param {Array<any>} b
 * @returns {boolean}
 */
function shallowArrayEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}
