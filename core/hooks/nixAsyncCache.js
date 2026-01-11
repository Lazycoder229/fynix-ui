import { nixState } from "./nixState";

const asyncCache = new Map();

export function nixAsyncCached(key, promiseFactory) {
  const data = nixState(null);
  const error = nixState(null);
  const loading = nixState(false);

  let active = true;

  const run = async () => {
    loading.value = true;
    error.value = null;

    // Cache hit with resolved data
    if (asyncCache.has(key)) {
      const cached = asyncCache.get(key);

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
