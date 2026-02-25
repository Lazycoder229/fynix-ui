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
 * Async state helper with AbortController support and race condition protection.
 *
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} promiseFactory
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Request timeout in milliseconds (default: 30000)
 * @param {number} options.retries - Number of retry attempts (default: 0)
 * @param {boolean} options.autoRun - Whether to run immediately (default: false)
 */
export function nixAsync<T>(
  promiseFactory: (signal: AbortSignal) => Promise<T>,
  options: {
    timeout?: number;
    retries?: number;
    autoRun?: boolean;
  } = {}
): {
  data: { value: T | null };
  error: { value: Error | null };
  loading: { value: boolean };
  run: () => Promise<void>;
  cancel: () => void;
  cleanup: () => void;
  getCallId: () => number;
} {
  const { timeout = 30000, retries = 0, autoRun = false } = options;

  if (typeof promiseFactory !== "function") {
    throw new TypeError("[nixAsync] promiseFactory must be a function");
  }

  const data = nixState<T | null>(null);
  const error = nixState<Error | null>(null);
  const loading = nixState<boolean>(false);

  let active = true;
  let controller: AbortController | null = null;
  let callId = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let retryCount = 0;

  const cleanup = (): void => {
    active = false;
    if (controller) {
      controller.abort();
      controller = null;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    callId = 0;
    retryCount = 0;
  };

  const run = async (): Promise<void> => {
    if (!active) {
      console.warn("[nixAsync] Attempted to run on destroyed async hook");
      return;
    }

    // Cancel previous request
    if (controller) {
      controller.abort();
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    controller = new AbortController();
    const signal = controller.signal;
    const currentCallId = ++callId;
    retryCount = 0;

    loading.value = true;
    error.value = null;

    // Set timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        if (controller && currentCallId === callId) {
          controller.abort();
          if (active && currentCallId === callId) {
            error.value = new Error(`Request timeout after ${timeout}ms`);
            loading.value = false;
          }
        }
      }, timeout);
    }

    try {
      const result = await promiseFactory(signal);

      // Check if this is still the current call and component is active
      if (!active || currentCallId !== callId || signal.aborted) {
        return;
      }

      data.value = result;
      retryCount = 0;
    } catch (e: unknown) {
      // Check if this is still the current call and component is active
      if (!active || currentCallId !== callId) {
        return;
      }

      // Don't set error if aborted (user cancelled)
      if (signal.aborted) {
        return;
      }

      const errorInstance = e instanceof Error ? e : new Error(String(e));

      // Retry logic
      if (retryCount < retries && active && currentCallId === callId) {
        retryCount++;
        console.warn(
          `[nixAsync] Retrying (${retryCount}/${retries}):`,
          errorInstance.message
        );
        // Exponential backoff: 1s, 2s, 4s, etc.
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        setTimeout(() => {
          if (active && currentCallId === callId) {
            run();
          }
        }, retryDelay);
        return;
      }

      error.value = errorInstance;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (active && currentCallId === callId && !signal.aborted) {
        loading.value = false;
      }
    }
  };

  const cancel = (): void => {
    if (controller) {
      controller.abort();
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    loading.value = false;
    retryCount = 0;
  };

  const getCallId = (): number => callId;

  // Auto-run if requested
  if (autoRun) {
    // Use setTimeout to avoid running during component initialization
    setTimeout(() => {
      if (active) run();
    }, 0);
  }

  return { data, error, loading, run, cancel, cleanup, getCallId };
}
