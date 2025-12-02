// runtime/context.js
export let activeContext = null;

export function setActiveContext(ctx) {
  activeContext = ctx;
}
