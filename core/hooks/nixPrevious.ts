/**
 * @fileoverview Hook to track previous value across renders.
 * Useful for comparing current and previous state.
 */

import { activeContext } from "../context/context";

/**
 * Returns the previous value of a variable across renders.
 * Useful for detecting changes and implementing undo functionality.
 *
 * @template T
 * @param {T} val - Current value
 * @returns {T | undefined} Previous value (undefined on first render)
 *
 * @example
 * const count = nixState(0);
 * const prevCount = nixPrevious(count.value);
 *
 * // prevCount will be undefined on first render
 * // then will hold the previous value on subsequent renders
 *
 * @throws {Error} If called outside a component context
 */
export function nixPrevious<T>(val: T): T | undefined {
  const ctx = activeContext as {
    hookIndex: number;
    hooks: Array<{ value: T } | undefined>;
  };
  if (!ctx) throw new Error("nixPrevious() called outside component");

  const idx: number = ctx.hookIndex++;
  const prev: T | undefined = ctx.hooks[idx]?.value;

  try {
    ctx.hooks[idx] = { value: val };
  } catch (err) {
    console.error("[nixPrevious] Error storing value:", err);
  }

  return prev;
}
