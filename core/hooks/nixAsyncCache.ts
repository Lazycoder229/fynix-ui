import { nixState } from "./nixState";

const asyncCache: Map<any, { data?: any; promise?: Promise<any> }> = new Map();

export function nixAsyncCached(
  key: any,
  promiseFactory: () => Promise<any>
): {
  data: { value: any };
  error: { value: any };
  loading: { value: boolean };
  run: () => Promise<void>;
  cancel: () => void;
} {
  const data = nixState(null) as { value: any };
  const error = nixState(null) as { value: any };
  const loading = nixState(false) as { value: boolean };

  let active: boolean = true;

  const run = async (): Promise<void> => {
    loading.value = true;
    error.value = null;

    // Cache hit with resolved data
    if (asyncCache.has(key)) {
      const cached = asyncCache.get(key);
      if (cached) {
        if (cached.data) {
          data.value = cached.data;
          loading.value = false;
          return;
        }

        // Deduping: reuse in-flight promise
        try {
          const result = await cached.promise;
          if (!active) return;
          data.value = result;
          loading.value = false;
        } catch (e) {
          if (!active) return;
          error.value = e;
          loading.value = false;
        }
        return;
      }
    }

    // Cache miss
    const promise = Promise.resolve().then(promiseFactory);
    asyncCache.set(key, { promise });

    try {
      const result = await promise;
      asyncCache.set(key, { data: result });
      if (!active) return;
      data.value = result;
    } catch (e) {
      asyncCache.delete(key);
      if (!active) return;
      error.value = e;
    } finally {
      if (active) loading.value = false;
    }
  };

  const cancel = () => {
    active = false;
  };

  return { data, error, loading, run, cancel };
}
