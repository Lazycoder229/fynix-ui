import { nixState } from "./nixState";

/**
 * Global async cache.
 * key -> {
 *   data?: any,
 *   error?: Error,
 *   promise?: Promise<any>,
 *   controller?: AbortController,
 *   timestamp?: number
 * }
 */
const asyncCache: Map<
  string,
  {
    data?: any;
    error?: Error;
    promise?: Promise<any>;
    controller?: AbortController;
    timestamp?: number;
  }
> = new Map();

/**
 * Unified async query helper with:
 * - AbortController cancellation
 * - Request deduping
 * - Shared caching
 *
 * @template T
 * @param {string} key
 * Unique cache key representing the request
 *
 * @param {(signal: AbortSignal) => Promise<T>} queryFn
 * Function that performs the async operation
 *
 * @param {{
 *   ttl?: number
 * }} [options]
 *
 * @returns {{
 *   data: { value: T | null },
 *   error: { value: Error | null },
 *   loading: { value: boolean },
 *   run: () => Promise<void>,
 *   cancel: () => void
 * }}
 */
export function nixAsyncQuery<T>(
  key: string,
  queryFn: (signal: AbortSignal) => Promise<T>,
  options: { ttl?: number } = {}
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

  const ttl: number = options.ttl ?? 0;
  let active: boolean = true;
  let callId: number = 0;

  const run = async (): Promise<void> => {
    const id = ++callId;
    loading.value = true;
    error.value = null;

    const now = Date.now();
    const cached = asyncCache.get(key);

    // Serve fresh cached data
    if (
      cached?.data &&
      (!ttl ||
        (typeof cached.timestamp === "number" && now - cached.timestamp < ttl))
    ) {
      data.value = cached.data;
      loading.value = false;
      return;
    }

    //  Deduping: reuse in-flight request
    if (cached?.promise) {
      try {
        const result = await cached.promise;
        if (!active || id !== callId) return;
        // Sanitize result before storing in state
        const safeResult =
          typeof result === "object" && result !== null
            ? JSON.parse(JSON.stringify(result))
            : result;
        data.value = safeResult;
      } catch (e: any) {
        if (!active || id !== callId) return;
        error.value = e instanceof Error ? e : new Error(String(e));
      } finally {
        if (active && id === callId) loading.value = false;
      }
      return;
    }

    // New request
    const controller = new AbortController();
    const promise = (async () => {
      try {
        const result = await queryFn(controller.signal);
        asyncCache.set(key, {
          data: result,
          timestamp: Date.now(),
        });
        return result;
      } catch (e) {
        asyncCache.delete(key);
        throw e instanceof Error ? e : new Error(String(e));
      }
    })();

    asyncCache.set(key, { promise, controller });

    try {
      const result = await promise;
      if (!active || id !== callId) return;
      // Sanitize result before storing in state
      const safeResult =
        typeof result === "object" && result !== null
          ? JSON.parse(JSON.stringify(result))
          : result;
      data.value = safeResult;
    } catch (e: any) {
      if (!active || id !== callId) return;
      error.value = e instanceof Error ? e : new Error(String(e));
    } finally {
      if (active && id === callId) loading.value = false;
    }
  };

  /**
   * Cancels in-flight request and prevents state updates.
   */
  const cancel = (): void => {
    active = false;
    const cached = asyncCache.get(key);
    if (cached?.controller) {
      cached.controller.abort();
    }
  };

  return { data, error, loading, run, cancel };
}
