/**
 * Debounce a function with options for leading, trailing, maxWait, and AbortController support.
 *
 * @param {Function} fn - The function to debounce.
 * @param {number} [delay=300] - Delay in milliseconds.
 * @param {Object} [options={}] - Debounce options.
 * @param {boolean} [options.leading=false] - Invoke on the leading edge.
 * @param {boolean} [options.trailing=true] - Invoke on the trailing edge.
 * @param {number} [options.maxWait] - Maximum wait time before forced invocation.
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel pending calls.
 * @returns {Function} Debounced function with `.cancel()` method.
 *
 * @example
 * const controller = new AbortController();
 * const debounced = nixDebounce(() => console.log('Hello'), 500, {
 *   leading: true,
 *   maxWait: 2000,
 *   signal: controller.signal
 * });
 * debounced();
 * controller.abort(); // Cancel pending invocation
 */
export function nixDebounce(fn, delay = 300, options = {}) {
  let timerId = null;
  let lastInvokeTime = 0;
  let lastArgs;
  let lastThis;

  const { leading = false, trailing = true, maxWait, signal } = options;

  if (signal) {
    signal.addEventListener("abort", () => {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      lastArgs = null;
      lastThis = null;
    });
  }

  const invoke = () => {
    lastInvokeTime = Date.now();
    if (lastArgs) {
      fn.apply(lastThis, lastArgs);
      lastArgs = lastThis = null;
    }
  };

  const debounced = function (...args) {
    const now = Date.now();
    lastArgs = args;
    lastThis = this;

    const shouldInvokeLeading = leading && !timerId;
    const timeSinceLastInvoke = now - lastInvokeTime;
    const remainingTime = delay - timeSinceLastInvoke;

    if (maxWait !== undefined && timeSinceLastInvoke >= maxWait) {
      if (timerId) clearTimeout(timerId);
      timerId = null;
      invoke();
      return;
    }

    if (timerId) clearTimeout(timerId);

    if (shouldInvokeLeading) {
      invoke();
    }

    if (trailing) {
      timerId = setTimeout(invoke, remainingTime > 0 ? remainingTime : delay);
    }
  };

  debounced.cancel = () => {
    if (timerId) clearTimeout(timerId);
    timerId = lastArgs = lastThis = null;
  };

  return debounced;
}
