// core/hooks/nixLazy.js
import { activeContext } from "../context/context.js";
import { nixState } from "./nixState.js";

/**
 * Lazy-load a module/component with caching.
 *
 * @param {() => Promise<any>} importFn - Function that returns a dynamic import.
 * @returns {Function} Component wrapper for lazy-loaded module.
 */
export function nixLazy<TProps = any>(
  importFn: () => Promise<
    { default?: (props: TProps) => any } | ((props: TProps) => any)
  >
): (props: TProps) => any {
  type Cache = {
    status: "pending" | "success" | "error";
    component: ((props: TProps) => any) | null;
    error: any;
    promise: Promise<any> | null;
  };
  const cache: Cache = {
    status: "pending",
    component: null,
    error: null,
    promise: null,
  };

  let canceled = false;

  cache.promise = importFn()
    .then((module) => {
      if (!canceled) {
        cache.status = "success";
        cache.component = (module as any).default || module;
      }
    })
    .catch((err) => {
      if (!canceled) {
        cache.status = "error";
        cache.error = err;
      }
    });

  return function LazyWrapper(props: TProps): any {
    const ctx = activeContext;
    if (!ctx) throw new Error("nixLazy() called outside component");

    if (cache.status === "pending") {
      throw cache.promise; // Suspense-like behavior
    }

    if (cache.status === "error") {
      throw cache.error;
    }

    return cache.component!(props);
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
