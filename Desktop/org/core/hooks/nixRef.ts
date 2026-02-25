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
