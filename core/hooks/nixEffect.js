import { activeContext } from "../context/context";
export function nixEffect(effect, deps = []) {
  const ctx = activeContext;
  if (!ctx) throw new Error("nixEffect() called outside component");
  const idx = ctx.hookIndex++;
  const prev = ctx.hooks[idx];
  const hasChanged =
    !prev || JSON.stringify(prev.deps) !== JSON.stringify(deps);
  if (hasChanged) {
    if (prev?.cleanup) prev.cleanup();
    const cleanup = effect();
    ctx.hooks[idx] = { deps, cleanup };
  }
}
