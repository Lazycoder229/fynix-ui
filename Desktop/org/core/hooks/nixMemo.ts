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
 * Memoize a value based on dependencies, similar to React's useMemo.
 *
 * @param {() => any} factory - Function to compute the memoized value
 * @param {Array<any>} deps - Dependency array
 * @returns {any} Memoized value
 */
export function nixMemo<T>(factory: () => T, deps: any[] = []): T | undefined {
  type MemoHook = { value: T; deps: any[] };
  const ctx = activeContext as
    | (typeof activeContext & {
        hookIndex: number;
        hooks: Array<MemoHook | undefined>;
      })
    | undefined;
  if (!ctx) throw new Error("nixMemo() called outside component");

  if (typeof factory !== "function") {
    console.error("[nixMemo] First argument must be a function");
    return undefined;
  }

  if (!Array.isArray(deps)) {
    console.error("[nixMemo] Second argument must be an array");
    deps = [];
  }

  const idx: number = ctx.hookIndex++;
  const prev = ctx.hooks[idx] as MemoHook | undefined;

  const hasChanged =
    !prev ||
    prev.deps.length !== deps.length ||
    deps.some((dep, i) => !Object.is(dep, prev.deps[i]));

  if (hasChanged) {
    try {
      const value = factory();
      ctx.hooks[idx] = { value, deps: [...deps] };
    } catch (err) {
      console.error("[nixMemo] Factory function error:", err);
      ctx.hooks[idx] = { value: undefined as unknown as T, deps: [...deps] };
    }
  }

  return (ctx.hooks[idx] as MemoHook | undefined)?.value;
}
