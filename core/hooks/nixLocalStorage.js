import { nixState } from "./nixState";
export function nixLocalStorage(key, initial) {
  const s = nixState(() => {
    try {
      const v = localStorage.getItem(key);
      return v != null ? JSON.parse(v) : initial;
    } catch {
      return initial;
    }
  });
  const set = (v) => {
    s.value = v;
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  };
  return { value: s.value, set };
}
