import { activeContext } from "../context/context";

/**
 * Returns the previous value of a variable across renders.
 *
 * @param {any} val - Current value
 * @returns {any} Previous value
 */
export function nixPrevious(val) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixPrevious() called outside component");

  const idx = ctx.hookIndex++;
  const prev = ctx.hooks[idx]?.value;

  try {
    ctx.hooks[idx] = { value: val };
  } catch (err) {
    console.error("[nixPrevious] Error storing value:", err);
  }

  return prev;
}
