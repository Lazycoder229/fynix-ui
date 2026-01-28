/**
 * @fileoverview Debounce utility function with advanced options.
 * Supports leading/trailing edge invocation, maxWait, and AbortController.
 */

/**
 * Debounce a function with options for leading, trailing, maxWait, and AbortController support.
 *
 * @param {Function} fn - The function to debounce
 * @param {number} [delay=300] - Delay in milliseconds
 * @param {Object} [options={}] - Debounce options
 * @param {boolean} [options.leading=false] - Invoke on the leading edge
 * @param {boolean} [options.trailing=true] - Invoke on the trailing edge
 * @param {number} [options.maxWait] - Maximum wait time before forced invocation
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel pending calls
 * @returns {Function} Debounced function with `.cancel()` method
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
export interface NixDebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
  signal?: AbortSignal;
}

export type DebouncedFunction<T extends (...args: any[]) => any> = ((
  ...args: Parameters<T>
) => void) & {
  cancel: () => void;
};

export function nixDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300,
  options: NixDebounceOptions = {}
): DebouncedFunction<T> {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

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

  const debounced = function (this: unknown, ...args: Parameters<T>) {
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
  } as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timerId) clearTimeout(timerId);
    timerId = null;
    lastArgs = null;
    lastThis = null;
  };

  return debounced;
}
