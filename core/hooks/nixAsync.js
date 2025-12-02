import { nixState } from "./nixState";
export function nixAsync(promiseFactory) {
  const data = nixState(null);
  const error = nixState(null);
  const loading = nixState(false);
  const run = async () => {
    loading.value = true;
    error.value = null;
    try {
      data.value = await promiseFactory();
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
  };
  run();
  return { data, error, loading, run };
}
