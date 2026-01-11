import { activeContext } from "../context/context";

/**
 * Memoize a value based on dependencies, similar to React's useMemo.
 *
 * @param {() => any} factory - Function to compute the memoized value
 * @param {Array<any>} deps - Dependency array
 * @returns {any} Memoized value
 */
export function nixMemo(factory, deps = []) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixMemo() called outside component");

  if (typeof factory !== "function") {
    console.error("[nixMemo] First argument must be a function");
    return undefined;
  }

  if (!Array.isArray(deps)) {
    console.error("[nixMemo] Second argument must be an array");
    deps = [];
  }

  const idx = ctx.hookIndex++;
  const prev = ctx.hooks[idx];

  const hasChanged =
    !prev ||
    prev.deps.length !== deps.length ||
    deps.some((dep, i) => !Object.is(dep, prev.deps[i]));

  if (hasChanged) {
    try {
      const value = factory();
      ctx.hooks[idx] = { value, deps: [...deps] };
    } catch (err) {
      console.error("[nixMemo] Factory function error:", err);
      ctx.hooks[idx] = { value: undefined, deps: [...deps] };
    }
  }

  return ctx.hooks[idx].value;
}
