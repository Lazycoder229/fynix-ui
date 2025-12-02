/* ----------------------
    Reactive State
---------------------- */
import { activeContext } from "../context/context";
export function nixState(initial) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixState() called outside component");

  const idx = ctx.hookIndex++;
  if (!ctx.hooks[idx]) {
    let value = initial;
    const subscribers = new Set();

    const s = {
      get value() {
        if (activeContext) activeContext._accessedStates.add(s);
        return value;
      },
      set value(newVal) {
        if (newVal === value) return;
        value = newVal;
        subscribers.forEach((fn) => fn());
      },
      subscribe(fn) {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
      },
      _isNixState: true,
    };

    ctx.hooks[idx] = s;
  }

  return ctx.hooks[idx];
}
