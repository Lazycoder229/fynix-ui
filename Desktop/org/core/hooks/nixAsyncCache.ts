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

const asyncCache: Map<
  any,
  {
    data?: any;
    promise?: Promise<any>;
    timestamp?: number;
    ttl?: number;
  }
> = new Map();

// Cache cleanup to prevent memory leaks
const CACHE_CLEANUP_INTERVAL = 60000; // 1 minute
let cacheCleanupTimer: NodeJS.Timeout | null = null;

const startCacheCleanup = () => {
  if (cacheCleanupTimer) return;

  cacheCleanupTimer = setInterval(() => {
    const now = Date.now();
    const entries = Array.from(asyncCache.entries());

    for (const [key, entry] of entries) {
      if (entry.timestamp && entry.ttl && now - entry.timestamp > entry.ttl) {
        asyncCache.delete(key);
      }
    }

    // If cache is empty, stop cleanup timer
    if (asyncCache.size === 0 && cacheCleanupTimer) {
      clearInterval(cacheCleanupTimer);
      cacheCleanupTimer = null;
    }
  }, CACHE_CLEANUP_INTERVAL);
};

/**
 * Cached async hook with enhanced security and memory management.
 *
 * @param {any} key - Cache key (must be serializable)
 * @param {() => Promise<any>} promiseFactory - Function that returns a promise
 * @param {object} options - Configuration options
 * @returns {object} Reactive state object with data, error, loading, and control methods
 */

export function nixAsyncCached(
  key: any,
  promiseFactory: () => Promise<any>,
  options: {
    ttl?: number; // Time to live in ms
    maxCacheSize?: number;
    validateKey?: (key: any) => boolean;
  } = {}
): {
  data: { value: any };
  error: { value: any };
  loading: { value: boolean };
  run: () => Promise<void>;
  cancel: () => void;
  clearCache: () => void;
} {
  // Input validation
  if (!promiseFactory || typeof promiseFactory !== "function") {
    throw new Error("[nixAsyncCache] promiseFactory must be a function");
  }

  // Validate cache key
  if (key == null) {
    throw new Error("[nixAsyncCache] Key cannot be null or undefined");
  }

  if (options.validateKey && !options.validateKey(key)) {
    throw new Error("[nixAsyncCache] Invalid cache key");
  }

  const { ttl = 300000, maxCacheSize = 100 } = options; // 5 min default TTL

  // Enforce cache size limits to prevent memory attacks
  if (asyncCache.size >= maxCacheSize) {
    // Remove oldest entries
    const entries = Array.from(asyncCache.entries());
    const entriesToRemove = Math.max(1, Math.floor(maxCacheSize * 0.1)); // Remove 10%

    for (let i = 0; i < entriesToRemove; i++) {
      const entry = entries[i];
      if (entry) {
        asyncCache.delete(entry[0]);
      }
    }
  }

  const data = nixState(null) as { value: any };
  const error = nixState(null) as { value: any };
  const loading = nixState(false) as { value: boolean };

  let active: boolean = true;
  let abortController: AbortController | null = null;

  startCacheCleanup();

  const run = async (): Promise<void> => {
    if (!active) return;

    // Cancel previous request if still running
    if (abortController) {
      abortController.abort();
    }

    abortController = new AbortController();
    loading.value = true;
    error.value = null;

    try {
      // Cache hit with resolved data
      if (asyncCache.has(key)) {
        const cached = asyncCache.get(key)!;
        const now = Date.now();

        // Check TTL
        if (cached.timestamp && now - cached.timestamp > ttl) {
          asyncCache.delete(key);
        } else if (cached.data !== undefined) {
          data.value = cached.data;
          loading.value = false;
          return;
        }

        // Deduping: reuse in-flight promise if still valid
        if (cached.promise) {
          try {
            const result = await cached.promise;
            if (!active || abortController?.signal.aborted) return;
            data.value = result;
            loading.value = false;
            return;
          } catch (e) {
            if (!active || abortController?.signal.aborted) return;
            error.value = e;
            loading.value = false;
            return;
          }
        }
      }

      // Cache miss - create new promise
      const promise = Promise.resolve().then(() => {
        if (abortController?.signal.aborted) {
          throw new Error("Request was aborted");
        }
        return promiseFactory();
      });

      asyncCache.set(key, {
        promise,
        timestamp: Date.now(),
        ttl,
      });

      const result = await promise;

      if (!active || abortController?.signal.aborted) return;

      // Cache successful result
      asyncCache.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl,
      });

      data.value = result;
    } catch (e) {
      // Remove failed promise from cache
      if (asyncCache.has(key)) {
        const cached = asyncCache.get(key)!;
        if (cached.promise && !cached.data) {
          asyncCache.delete(key);
        }
      }

      if (!active || abortController?.signal.aborted) return;
      error.value = e;
    } finally {
      if (active && !abortController?.signal.aborted) {
        loading.value = false;
      }
    }
  };

  const cancel = (): void => {
    active = false;
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  };

  const clearCache = (): void => {
    asyncCache.delete(key);
  };

  return { data, error, loading, run, cancel, clearCache };
}
