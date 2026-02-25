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
import { nixState } from "./nixState";

/**
 * Debounced and cancellable async data fetcher with caching and deduping.
 *
 * @param {() => Promise<any>} promiseFactory - Async function that returns a promise.
 * @param {Object} [options={}] - Options for debounce, caching, and abort.
 * @param {number} [options.delay=300] - Debounce delay in ms.
 * @param {boolean} [options.leading=false] - Run on leading edge.
 * @param {boolean} [options.trailing=true] - Run on trailing edge.
 * @param {number} [options.maxWait] - Max wait time before forced invocation.
 * @param {boolean} [options.cache=true] - Enable caching of last result.
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel request.
 * @returns {Object} { data, error, loading, run, cancel }
 *
 * @example
 * const controller = new AbortController();
 * const { data, error, loading, run, cancel } = nixAsyncDebounce(
 *   () => fetch('/api/data').then(r => r.json()),
 *   { delay: 500, maxWait: 2000, leading: true, signal: controller.signal }
 * );
 */
export interface NixAsyncDebounceOptions {
  delay?: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
  cache?: boolean;
  signal?: AbortSignal;
}

export function nixAsyncDebounce(
  promiseFactory: () => Promise<any>,
  options: NixAsyncDebounceOptions = {}
): {
  data: { value: any };
  error: { value: any };
  loading: { value: boolean };
  run: () => void | Promise<any>;
  cancel: () => void;
} {
  const data = nixState(null) as { value: any };
  const error = nixState(null) as { value: any };
  const loading = nixState(false) as { value: boolean };

  const {
    delay = 300,
    leading = false,
    trailing = true,
    maxWait,
    cache = true,
    signal,
  } = options;

  let lastResult: any = null;
  let lastError: any = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastInvokeTime: number = 0;
  let pendingPromise: Promise<any> | null = null;

  const invoke = async (): Promise<any> => {
    if (cache && lastResult !== null) {
      data.value = lastResult;
      error.value = lastError;
      loading.value = false;
      return lastResult;
    }

    loading.value = true;
    error.value = null;

    const abortController = new AbortController();
    if (signal) {
      signal.addEventListener("abort", () => {
        abortController.abort();
        cancel();
      });
    }

    pendingPromise = promiseFactory();

    try {
      const result = await pendingPromise;
      lastResult = result;
      data.value = result;
      return result;
    } catch (e: any) {
      if (e.name !== "AbortError") {
        lastError = e;
        error.value = e;
      }
      throw e;
    } finally {
      loading.value = false;
      pendingPromise = null;
      lastInvokeTime = Date.now();
    }
  };

  const run = (): void | Promise<any> => {
    const now = Date.now();
    const timeSinceLastInvoke = now - lastInvokeTime;
    const remainingTime = delay - timeSinceLastInvoke;

    const shouldInvokeLeading = leading && !timerId;

    if (maxWait !== undefined && timeSinceLastInvoke >= maxWait) {
      if (timerId) clearTimeout(timerId);
      timerId = null;
      return invoke();
    }

    if (timerId) clearTimeout(timerId);

    if (shouldInvokeLeading) return invoke();

    if (trailing) {
      timerId = setTimeout(
        () => {
          timerId = null;
          invoke();
        },
        remainingTime > 0 ? remainingTime : delay
      );
    }
  };

  const cancel = (): void => {
    if (timerId) clearTimeout(timerId);
    timerId = null;
    pendingPromise = null;
  };

  return { data, error, loading, run, cancel };
}
