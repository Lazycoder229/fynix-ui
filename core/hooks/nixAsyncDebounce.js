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
export function nixAsyncDebounce(promiseFactory, options = {}) {
  const data = nixState(null);
  const error = nixState(null);
  const loading = nixState(false);

  const {
    delay = 300,
    leading = false,
    trailing = true,
    maxWait,
    cache = true,
    signal
  } = options;

  let lastResult = null;
  let lastError = null;
  let timerId = null;
  let lastInvokeTime = 0;
  let pendingPromise = null;

  const invoke = async () => {
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
    } catch (e) {
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

  const run = () => {
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
      timerId = setTimeout(() => {
        timerId = null;
        invoke();
      }, remainingTime > 0 ? remainingTime : delay);
    }
  };

  const cancel = () => {
    if (timerId) clearTimeout(timerId);
    timerId = pendingPromise = null;
  };

  return { data, error, loading, run, cancel };
}
