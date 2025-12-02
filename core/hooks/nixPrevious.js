import { activeContext } from "../context/context";
export function nixPrevious(val) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixPrevious() called outside component");
  const idx = ctx.hookIndex++;
  const prev = ctx.hooks[idx]?.value;
  ctx.hooks[idx] = { value: val };
  return prev;
}
