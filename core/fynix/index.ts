// fynix/index.js - Single entry point for all core functionality
export * from "../runtime.js";
// Re-export Fynix namespace and hooks under new names
export * from "../router/router.js";
export { default as createFynix } from "../router/router.js";
export { Fynix } from "../runtime.js";
