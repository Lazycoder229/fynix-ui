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
// core/hooks/nixLazyAsync.js
import { activeContext } from "../context/context.js";
import { nixState } from "./nixState.js";

/**
 * Lazy-load a module/component with caching, retry, and abort support.
 *
 * @param {() => Promise<any>} importFn - Function returning a dynamic import.
 * @param {Object} [options={}] - Options for lazy loading.
 * @param {number} [options.retry=0] - Number of retry attempts on failure.
 * @returns {Function} Component wrapper for lazy-loaded module.
 *
 * @example
 * const LazyComp = nixLazyAsync(() => import("./MyComponent"), { retry: 2 });
 */
export function nixLazyAsync<TProps = any>(
  importFn: () => Promise<
    { default?: (props: TProps) => any } | ((props: TProps) => any)
  >,
  options: { retry?: number } = {}
): (props: TProps) => any {
  const { retry = 0 } = options;

  type Cache = {
    status: "pending" | "success" | "error";
    component: ((props: TProps) => any) | null;
    error: any;
    promise: Promise<any> | null;
    retriesLeft: number;
  };
  const cache: Cache = {
    status: "pending",
    component: null,
    error: null,
    promise: null,
    retriesLeft: retry,
  };

  let canceled = false;

  const loadModule = (): Promise<any> => {
    cache.promise = importFn()
      .then((module) => {
        if (!canceled) {
          cache.status = "success";
          cache.component = (module as any).default || module;
        }
        return cache.component;
      })
      .catch((err) => {
        if (!canceled) {
          if (cache.retriesLeft > 0) {
            cache.retriesLeft--;
            return loadModule();
          }
          cache.status = "error";
          cache.error = err;
        }
        return Promise.reject(cache.error);
      });
    return cache.promise;
  };

  loadModule();

  // Removed unused 'cancel' function

  return function LazyWrapper(props: TProps): any {
    const ctx = activeContext;
    if (!ctx) throw new Error("nixLazyAsync() called outside component");

    if (cache.status === "pending") {
      throw cache.promise; // Suspense fallback
    }

    if (cache.status === "error") {
      throw cache.error;
    }

    if (!cache.component) {
      throw new Error("nixLazyAsync: component not loaded");
    }
    return cache.component(props);
  };
}

/**
 * Suspense wrapper to catch pending promises and render fallback.
 *
 * @param {Object} props
 * @param {any} props.fallback - Element to render while loading.
 * @param {Function} props.children - Function returning child component.
 * @returns {any} Rendered fallback or child component.
 */
export function Suspense<T = any>({
  fallback,
  children,
}: {
  fallback: any;
  children: () => T;
}): T | any {
  const loading = nixState<boolean>(false);
  const error = nixState<any>(null);

  try {
    return children();
  } catch (promise) {
    if (promise instanceof Promise) {
      loading.value = true;
      promise
        .then(() => (loading.value = false))
        .catch((err) => {
          error.value = err;
          loading.value = false;
        });
      return fallback;
    }
    throw promise;
  }
}
