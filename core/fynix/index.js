// fynix/index.js - Single entry point for all core functionality
export * from "../runtime.js";
// Re-export Fynix namespace and hooks under new names
export { Fynix} from "../runtime.js";
export * from "../router/router.js";
export * from "../custom/index.js";
export { default as createFynix } from "../router/router.js";
export * from "../custom/index.js"