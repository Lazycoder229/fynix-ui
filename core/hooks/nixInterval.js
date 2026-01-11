/**
 * Safe interval with automatic cleanup support and optional AbortController.
 *
 * @param {Function} fn - Function to run at each interval.
 * @param {number} ms - Interval duration in milliseconds.
 * @param {AbortSignal} [signal] - Optional AbortSignal to cancel the interval.
 * @returns {Function} Cleanup function to stop the interval.
 *
 * @example
 * const cancel = nixInterval(() => console.log('tick'), 1000);
 * // stop interval
 * cancel();
 *
 * @example
 * const controller = new AbortController();
 * nixInterval(() => console.log('tick'), 1000, controller.signal);
 * controller.abort(); // automatically clears interval
 */
export function nixInterval(fn, ms, signal) {
  if (typeof fn !== "function") {
    throw new TypeError("nixInterval: first argument must be a function");
  }
  if (typeof ms !== "number" || ms < 0) {
    throw new TypeError("nixInterval: second argument must be a non-negative number");
  }

  const id = setInterval(fn, ms);

  const cancel = () => clearInterval(id);

  if (signal) {
    if (signal.aborted) {
      cancel();
    } else {
      const listener = () => {
        cancel();
        signal.removeEventListener("abort", listener);
      };
      signal.addEventListener("abort", listener);
    }
  }

  return cancel;
}
