// fynix/index.js - Single entry point for all core functionality
export * from "../runtime.js";
// Re-export Fynix namespace and hooks under new names
export { Fynix, Rest } from "../runtime.js";
export * from "../hooks/nixState.js";
export * from "../hooks/nixForm.js";
export * from "../hooks/nixStore.js";
export * from "../hooks/nixEffect.js";
export * from "../hooks/nixAsync.js";
export * from "../hooks/nixMemo.js";
export * from "../hooks/nixCallback.js";
export * from "../hooks/nixComputed.js";
export * from "../hooks/nixDebounce.js";
export * from "../hooks/nixInterval.js";
export * from "../hooks/nixRef.js";
export * from "../hooks/nixLocalStorage.js";
export * from "../hooks/nixPrevious.js";

// Compatibility aliases (legacy rest* hook names)
export { nixForm as restForm } from "../hooks/nixForm.js";
export { nixStore as restStore } from "../hooks/nixStore.js";
export { nixState as restState } from "../hooks/nixState.js";
export { nixEffect as restEffect } from "../hooks/nixEffect.js";
export { nixAsync as restAsync } from "../hooks/nixAsync.js";
export { nixMemo as restMemo } from "../hooks/nixMemo.js";
export { nixCallback as restCallback } from "../hooks/nixCallback.js";
export { nixComputed as restComputed } from "../hooks/nixComputed.js";
export { nixDebounce as restDebounce } from "../hooks/nixDebounce.js";
export { nixInterval as restInterval } from "../hooks/nixInterval.js";
export { nixRef as restRef } from "../hooks/nixRef.js";
export { nixLocalStorage as restLocalStorage } from "../hooks/nixLocalStorage.js";
export { nixPrevious as restPrevious } from "../hooks/nixPrevious.js";
export { nixLazy as restLazy, Suspense } from "../hooks/nixLazy.js";
export * from "../router/router.js";
export * from "../custom/index.js";
