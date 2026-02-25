/* MIT License

* Copyright (c) 2026 Resty Gonzales

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
 */
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
