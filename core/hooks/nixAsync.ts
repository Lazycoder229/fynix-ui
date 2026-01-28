import { nixState } from "./nixState";

/**
 * Async state helper with AbortController support.
 *
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} promiseFactory
 */
export function nixAsync<T>(
  promiseFactory: (signal: AbortSignal) => Promise<T>
): {
  data: { value: T | null };
  error: { value: Error | null };
  loading: { value: boolean };
  run: () => Promise<void>;
  cancel: () => void;
} {
  const data = nixState(null) as { value: T | null };
  const error = nixState(null) as { value: Error | null };
  const loading = nixState(false) as { value: boolean };

  let active: boolean = true;
  let controller: AbortController | null = null;
  let callId: number = 0;

  const run = async (): Promise<void> => {
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
    } catch (e: unknown) {
      if (!active || id !== callId || signal.aborted) return;
      error.value = e instanceof Error ? e : new Error(String(e));
    } finally {
      if (active && id === callId && !signal.aborted) {
        loading.value = false;
      }
    }
  };

  const cancel = (): void => {
    active = false;
    if (controller) controller.abort();
  };

  return { data, error, loading, run, cancel };
}
