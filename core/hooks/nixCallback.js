import { activeContext } from "../context/context";
export function nixCallback(fn, deps = []) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixCallback() called outside component");
  const idx = ctx.hookIndex++;
  const prev = ctx.hooks[idx];
  if (!prev || JSON.stringify(prev.deps) !== JSON.stringify(deps)) {
    ctx.hooks[idx] = { value: fn, deps };
  }
  return ctx.hooks[idx].value;
}
