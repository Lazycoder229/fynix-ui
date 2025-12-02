import { activeContext } from "../context/context";
export function nixStore(path, initial) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixStore() called outside component");
  const idx = ctx.hookIndex++;
  if (!ctx.hooks[idx]) {
    let value = initial;
    const subscribers = new Set();
    const s = {
      get value() {
        if (activeContext) activeContext._accessedStates.add(s);
        return value;
      },
      set value(v) {
        value = v;
        subscribers.forEach((fn) => fn());
      },
      subscribe(fn) {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
      },
      path,
      _isNixState: true,
    };
    ctx.hooks[idx] = s;
  }
  return ctx.hooks[idx];
}
