// core/hooks/nixLazy.js - Lazy loading and code splitting
import { activeContext } from "../context/context.js";
import { nixState } from "./nixState.js";

export function nixLazy(importFn) {
  const cache = {
    status: "pending", // pending | success | error
    component: null,
    error: null,
    promise: null,
  };

  cache.promise = importFn()
    .then((module) => {
      cache.status = "success";
      cache.component = module.default || module;
    })
    .catch((err) => {
      cache.status = "error";
      cache.error = err;
    });

  return function LazyWrapper(props) {
    const ctx = activeContext;
    if (!ctx) throw new Error("nixLazy() called outside component");

    if (cache.status === "pending") {
      throw cache.promise; // Suspense will catch this
    }

    if (cache.status === "error") {
      throw cache.error;
    }

    return cache.component(props);
  };
}

export function Suspense({ fallback, children }) {
  const loading = nixState(false);
  const error = nixState(null);

  try {
    if (loading.value) {
      return fallback;
    }
    return children;
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
