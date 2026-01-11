import { nixState } from "./nixState";

/**
 * Async state helper with AbortController support.
 *
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} promiseFactory
 */
export function nixAsync(promiseFactory) {
  const data = nixState(null);
  const error = nixState(null);
  const loading = nixState(false);

  let active = true;
  let controller = null;
  let callId = 0;

  const run = async () => {
    // Cancel previous request
    if (controller) controller.abort();

    controller = new AbortController();
    const signal = controller.signal;
    const id = ++callId;

    loading.value = true;
    error.value = null;

    try {
      const result = await promiseFactory(signal);
      if (!active || id !== callId || signal.aborted) return;
      data.value = result;
    } catch (e) {
      if (!active || id !== callId || signal.aborted) return;
      error.value = e instanceof Error ? e : new Error(String(e));
    } finally {
      if (active && id === callId && !signal.aborted) {
        loading.value = false;
      }
    }
  };

  const cancel = () => {
    active = false;
    if (controller) controller.abort();
  };

  return { data, error, loading, run, cancel };
}
