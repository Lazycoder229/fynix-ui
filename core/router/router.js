    
/**
 * Fynix File-Based Router
 * -----------------------
 * Fully file-based routing system inspired by Next.js.
 * Supports dynamic routes, SPA navigation, props caching with nixState, and HMR.
 *
 * Usage:
 * import createFynix from "fynix/ui";
 * const router = createFynix();
 * router.mountRouter("#app-root");
 * router.navigate("/user/123", { someProp: nixState("hello") });
 */

import { mount, nixState } from "../runtime.js";

/**
 * Helper: Try multiple possible glob paths for file-based routing
 * @returns {Record<string, any>} modules
 */
function tryGlobPaths() {
  const pathsToTry = [
    "../../../src/View/**/*.{js,jsx,res}",
    "../../../app/View/**/*.{js,jsx,res}",
    "../../src/View/**/*.{js,jsx,res}",
    "../../app/View/**/*.{js,jsx,res}",
    "../app/View/**/*.{js,jsx,res}",
    "/app/View/**/*.{js,jsx,res}",
    "./app/View/**/*.{js,jsx,res}",
  ];

  for (const path of pathsToTry) {
    const modules = import.meta.glob(path, { eager: true });
    if (Object.keys(modules).length > 0) return modules;
  }

  console.warn("[Router] No view modules found in any path.");
  return {};
}

/**
 * Convert file path to route path
 * e.g. /src/View/user/[id].res → /user/:id
 * @param {string} filePath
 * @returns {string} routePath
 */
function filePathToRoute(filePath) {
  let route = filePath
    .replace(/^.*\/View/, "")
    .replace(/\.(js|jsx|res)$/, "")
    .replace(/\/index$/, "")
    .replace(/\/$/, "");

  if (!route) route = "/";
  // Convert [param] to :param for dynamic routing
  route = route.replace(/\[([^\]]+)\]/g, ":$1");
  return route;
}

/**
 * Match a dynamic route pattern
 * @param {string} path
 * @param {Array} dynamicRoutes
 * @returns { { component: any, params: Record<string,string> } | null }
 */
function matchDynamicRoute(path, dynamicRoutes) {
  for (const route of dynamicRoutes) {
    const match = path.match(route.regex);
    if (match) {
      const params = {};
      route.params.forEach((param, i) => {
        params[param] = match[i + 1];
      });
      return { component: route.component, params };
    }
  }
  return null;
}

/**
 * Deserialize plain props into nixState
 * @param {Record<string, any>} props
 * @returns {Record<string, any>}
 */
function deserializeProps(props) {
  const deserialized = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "params") {
      deserialized[key] = value;
      continue;
    }
    if (value && (value._isNixState || value._isRestState)) {
      deserialized[key] = value;
    } else if (value !== null && value !== undefined) {
      deserialized[key] = nixState(value);
    } else {
      deserialized[key] = value;
    }
  }
  return deserialized;
}

/**
 * Fynix Router Factory
 * @returns {Object} router
 */
export default function createFynix() {
  let rootSelector = "#app-root";
  let currentPath = null;

  // Cache for props across SPA navigation
  const __fynixPropsCache = window.__fynixPropsCache || new Map();
  window.__fynixPropsCache = __fynixPropsCache;

  // Auto-discover view modules
  const modules = tryGlobPaths();
  const routes = {};
  const dynamicRoutes = [];

  // Map modules to routes
  for (const [filePath, mod] of Object.entries(modules)) {
    const routePath = filePathToRoute(filePath);
    const component = mod.default || mod[Object.keys(mod)[0]] || Object.values(mod)[0];

    if (!component) continue;

    const hasDynamic = /:[^/]+/.test(routePath);
    if (hasDynamic) {
      dynamicRoutes.push({
        pattern: routePath,
        regex: new RegExp("^" + routePath.replace(/:[^/]+/g, "([^/]+)") + "$"),
        component,
        params: [...routePath.matchAll(/:([^/]+)/g)].map((m) => m[1]),
      });
      console.log(`[Router] Dynamic route registered: ${routePath}`);
    } else {
      routes[routePath] = component;
      console.log(`[Router] Static route registered: ${routePath}`);
    }
  }

  /**
   * Core route rendering function
   */
  function renderRoute() {
    const path = window.location.pathname;
    let Page = routes[path];
    let params = {};
    let routeProps = {};

    // Match dynamic route if static not found
    if (!Page) {
      const match = matchDynamicRoute(path, dynamicRoutes);
      if (match) {
        Page = match.component;
        params = match.params;
      }
    }

    const root = document.querySelector(rootSelector);
    if (!root) {
      console.error("[Router] Root element not found:", rootSelector);
      return;
    }

    if (!Page) {
      root.innerHTML = "<h2>404 Not Found</h2>";
      return;
    }

    // Retrieve props from cache or history
    const state = window.history.state || {};
    let passedProps = {};
    if (state.__fynixCacheKey && __fynixPropsCache.has(state.__fynixCacheKey)) {
      passedProps = __fynixPropsCache.get(state.__fynixCacheKey);
    } else if (state.serializedProps) {
      passedProps = deserializeProps(state.serializedProps);
    }

    // Get static props if defined
    if (Page.props) {
      routeProps = typeof Page.props === "function" ? Page.props() : Page.props;
    }

    window.__lastRouteProps = {
      ...routeProps,
      ...passedProps,
      params,
    };

    try {
      mount(Page, rootSelector, false, window.__lastRouteProps);
    } catch (err) {
      console.error("[Router] Mount failed:", err);
      root.innerHTML = `<pre style="color:red;">Mount Error: ${err.message}</pre>`;
    }

    currentPath = path;
  }

  /**
   * SPA Navigation Helpers
   */
  function navigate(path, props = {}) {
    if (path === currentPath) return;
    const cacheKey = Date.now() + Math.random().toString(36).slice(2);
    __fynixPropsCache.set(cacheKey, props);
    window.history.pushState({ __fynixCacheKey: cacheKey }, "", path);
    renderRoute();
  }

  function replace(path, props = {}) {
    const cacheKey = Date.now() + Math.random().toString(36).slice(2);
    __fynixPropsCache.set(cacheKey, props);
    window.history.replaceState({ __fynixCacheKey: cacheKey }, "", path);
    renderRoute();
  }

  function back() {
    window.history.back();
  }

  /**
   * Mount the router to a DOM element
   * @param {string} selector
   */
  function mountRouter(selector = "#app-root") {
    rootSelector = selector;
    renderRoute();
  }

  /**
   * Link click delegation for SPA navigation
   */
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-fynix-link]");
    if (!link) return;
    e.preventDefault();
    const path = new URL(link.href).pathname;

    if (path === currentPath) return;

    // Optional props passed via data-props-key
    let props = {};
    const propsKey = link.getAttribute("data-props-key");
    if (propsKey && window[propsKey]) {
      props = window[propsKey];
    }

    const cacheKey = Date.now() + Math.random().toString(36).slice(2);
    __fynixPropsCache.set(cacheKey, props);
    const serializableProps = {};
    for (const [k, v] of Object.entries(props)) {
      serializableProps[k] = v && (v._isNixState || v._isRestState) ? v.value : v;
    }

    window.history.pushState({ __fynixCacheKey: cacheKey, serializedProps: serializableProps }, "", path);
    renderRoute();
  });

  window.addEventListener("popstate", renderRoute);

  // HMR support
  if (import.meta.hot) {
    import.meta.hot.accept(() => {
      console.log("[Router] HMR detected, re-rendering route...");
      renderRoute();
    });
  }

  return {
    mountRouter,
    navigate,
    replace,
    back,
    routes,
    dynamicRoutes,
  };
}
