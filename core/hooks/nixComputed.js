import { activeContext } from "../context/context";
export function nixComputed(fn) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixComputed() called outside component");
  const idx = ctx.hookIndex++;
  if (!ctx.hooks[idx]) {
    let cache;
    let deps = new Set();
    const compute = () => {
      activeContext && (activeContext._accessedStates = new Set());
      const result = fn();
      cache = result;
      deps = new Set(activeContext?._accessedStates ?? []);
    };
    compute();
    deps.forEach((state) => state.subscribe(() => compute()));
    ctx.hooks[idx] = {
      get value() {
        return cache;
      },
    };
  }
  return ctx.hooks[idx];
}
