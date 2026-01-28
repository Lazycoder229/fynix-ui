import { activeContext } from "../context/context";

/**
 * Returns a mutable ref object that persists across renders.
 * Similar to React's useRef.
 *
 * @param {any} initial - Initial value for the ref
 * @returns {{ current: any }} Ref object
 */
export function nixRef<T = any>(initial: T = null as any): { current: T } {
  type RefHook = { current: T };
  const ctx = activeContext as
    | (typeof activeContext & {
        hookIndex: number;
        hooks: Array<RefHook | undefined>;
      })
    | undefined;
  if (!ctx) throw new Error("nixRef() called outside component");

  const idx: number = ctx.hookIndex++;

  if (!ctx.hooks[idx]) {
    try {
      ctx.hooks[idx] = { current: initial };
    } catch (err) {
      console.error("[nixRef] Error initializing ref:", err);
      ctx.hooks[idx] = { current: null as any };
    }
  }

  return ctx.hooks[idx] as RefHook;
}
