import { activeContext } from "../context/context";

/**
 * Returns a mutable ref object that persists across renders.
 * Similar to React's useRef.
 *
 * @param {any} initial - Initial value for the ref
 * @returns {{ current: any }} Ref object
 */
export function nixRef(initial = null) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixRef() called outside component");

  const idx = ctx.hookIndex++;

  if (!ctx.hooks[idx]) {
    try {
      ctx.hooks[idx] = { current: initial };
    } catch (err) {
      console.error("[nixRef] Error initializing ref:", err);
      ctx.hooks[idx] = { current: null };
    }
  }

  return ctx.hooks[idx];
}
