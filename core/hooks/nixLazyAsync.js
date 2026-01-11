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
export function nixLazyAsync(importFn, options = {}) {
  const { retry = 0 } = options;

  const cache = {
    status: "pending", // pending | success | error
    component: null,
    error: null,
    promise: null,
    retriesLeft: retry,
  };

  let abortController = new AbortController();
  let canceled = false;

  const loadModule = () => {
    cache.promise = importFn()
      .then((module) => {
        if (!canceled) {
          cache.status = "success";
          cache.component = module.default || module;
        }
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
      });

    return cache.promise;
  };

  loadModule();

  const cancel = () => {
    canceled = true;
    abortController.abort();
    abortController = null;
  };

  return function LazyWrapper(props) {
    const ctx = activeContext;
    if (!ctx) throw new Error("nixLazyAsync() called outside component");

    if (cache.status === "pending") {
      throw cache.promise; // Suspense fallback
    }

    if (cache.status === "error") {
      throw cache.error;
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
export function Suspense({ fallback, children }) {
  const loading = nixState(false);
  const error = nixState(null);

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
