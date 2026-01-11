// core/hooks/nixLazy.js
import { activeContext } from "../context/context.js";
import { nixState } from "./nixState.js";

/**
 * Lazy-load a module/component with caching.
 *
 * @param {() => Promise<any>} importFn - Function that returns a dynamic import.
 * @returns {Function} Component wrapper for lazy-loaded module.
 */
export function nixLazy(importFn) {
  const cache = {
    status: "pending", // pending | success | error
    component: null,
    error: null,
    promise: null,
  };

  let canceled = false;

  cache.promise = importFn()
    .then((module) => {
      if (!canceled) {
        cache.status = "success";
        cache.component = module.default || module;
      }
    })
    .catch((err) => {
      if (!canceled) {
        cache.status = "error";
        cache.error = err;
      }
    });

  return function LazyWrapper(props) {
    const ctx = activeContext;
    if (!ctx) throw new Error("nixLazy() called outside component");

    if (cache.status === "pending") {
      throw cache.promise; // Suspense-like behavior
    }

    if (cache.status === "error") {
      throw cache.error;
    }

    return cache.component(props);
  };
}

/**
 * Suspense-like wrapper for lazy components.
 *
 * @param {Object} props
 * @param {any} props.fallback - Element to render while loading.
 * @param {Function} props.children - Function returning child component.
 * @returns {any} Rendered fallback or child.
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
        .then(() => {
          loading.value = false;
        })
        .catch((err) => {
          error.value = err;
          loading.value = false;
        });
      return fallback;
    }
    throw promise;
  }
}
