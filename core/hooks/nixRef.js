/* ----------------------
    Refs & Effects
---------------------- */
import { activeContext } from "../context/context";
export function nixRef(initial = null) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixRef() called outside component");
  const idx = ctx.hookIndex++;
  if (!ctx.hooks[idx]) ctx.hooks[idx] = { current: initial };
  return ctx.hooks[idx];
}
