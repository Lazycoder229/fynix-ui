import { activeContext } from "../context/context";
export function nixMemo(factory, deps = []) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixMemo() called outside component");
  const idx = ctx.hookIndex++;
  const prev = ctx.hooks[idx];
  if (!prev || JSON.stringify(prev.deps) !== JSON.stringify(deps)) {
    ctx.hooks[idx] = { value: factory(), deps };
  }
  return ctx.hooks[idx].value;
}
