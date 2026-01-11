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
const asyncCache = new Map();

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
export function nixAsyncQuery(key, queryFn, options = {}) {
  const data = nixState(null);
  const error = nixState(null);
  const loading = nixState(false);

  const ttl = options.ttl ?? 0;
  let active = true;
  let callId = 0;

  const run = async () => {
    const id = ++callId;
    loading.value = true;
    error.value = null;

    const now = Date.now();
    const cached = asyncCache.get(key);

    // Serve fresh cached data
    if (
      cached?.data &&
      (!ttl || now - cached.timestamp < ttl)
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
        data.value = result;
      } catch (e) {
        if (!active || id !== callId) return;
        error.value = e;
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
          timestamp: Date.now()
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
      data.value = result;
    } catch (e) {
      if (!active || id !== callId) return;
      error.value = e;
    } finally {
      if (active && id === callId) loading.value = false;
    }
  };

  /**
   * Cancels in-flight request and prevents state updates.
   */
  const cancel = () => {
    active = false;
    const cached = asyncCache.get(key);
    if (cached?.controller) {
      cached.controller.abort();
    }
  };

  return { data, error, loading, run, cancel };
}
