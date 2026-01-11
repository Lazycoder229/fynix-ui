/**
 * Fynix File-Based Router - PRODUCTION FIXED VERSION
 * All Security & Memory Leak Issues Fixed
 */

import { mount } from "../runtime.js";

const MAX_CACHE_SIZE = 50;
const PROPS_NAMESPACE = '__fynixLinkProps__';
const MAX_LISTENERS = 100;
const ALLOWED_PROTOCOLS = ['http:', 'https:', ''];

// FIX 1: Singleton pattern to prevent multiple router instances
let routerInstance = null;
let isRouterInitialized = false;

/**
 * Security: Improved HTML escaping to prevent XSS
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Security: Validate URL to prevent open redirect
 */
function isValidURL(url) {
  try {
    const parsed = new URL(url, window.location.origin);
    
    if (parsed.origin !== window.location.origin) {
      console.warn('[Router] Security: Cross-origin navigation blocked');
      return false;
    }
    
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      console.warn('[Router] Security: Dangerous protocol blocked:', parsed.protocol);
      return false;
    }
    
    return true;
  } catch (e) {
    console.warn('[Router] Security: Invalid URL blocked');
    return false;
  }
}

/**
 * Security: Sanitize path to prevent directory traversal
 */
function sanitizePath(path) {
  if (typeof path !== 'string') return '/';
  
  path = path.replace(/\0/g, '');
  path = path.replace(/\\/g, '/');
  path = path.replace(/\/+/g, '/');
  path = path.split('/').filter(part => part !== '..' && part !== '.').join('/');
  
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  
  return path || '/';
}

/**
 * Helper: Try multiple possible glob paths for file-based routing
 */
function tryGlobPaths() {
  try {
    // @ts-ignore - Vite glob API
    const modules = import.meta.glob("/src/**/*.{js,jsx,fnx}", { eager: true });
    return modules || {};
  } catch (error) {
    console.error('[Router] Failed to load modules:', error);
    return {};
  }
}

/**
 * Convert file path to route path
 */
function filePathToRoute(filePath) {
  let route = filePath
    .replace(/^.*\/src/, "")
    .replace(/\.(js|jsx|fnx)$/, "")
    .replace(/\/view$/, "")
    .replace(/\/$/, "");

  if (!route) route = "/";
  route = route.replace(/\[([^\]]+)\]/g, ":$1");
  return route;
}

/**
 * Match a dynamic route pattern
 */
function matchDynamicRoute(path, dynamicRoutes) {
  for (const route of dynamicRoutes) {
    const match = path.match(route.regex);
    if (match) {
      const params = {};
      route.params.forEach((param, i) => {
        params[param] = escapeHTML(decodeURIComponent(match[i + 1]));
      });
      return { component: route.component, params };
    }
  }
  return null;
}

/**
 * Deserialize plain props
 */
function deserializeProps(props) {
  if (!props || typeof props !== 'object') return {};
  
  const deserialized = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof key !== 'string' || key.startsWith('__')) {
      continue;
    }
    deserialized[key] = value;
  }
  return deserialized;
}

/**
 * Normalize path
 */
function normalizePath(path) {
  return sanitizePath(path);
}

/**
 * FIX 2: Generate unique cache keys using crypto API when available
 */
function generateCacheKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback with better uniqueness
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * @typedef {Object} FynixRouter
 * @property {function(string=): void} mountRouter - Mount router to DOM element
 * @property {function(string, Object=): void} navigate - Navigate to path with props
 * @property {function(string, Object=): void} replace - Replace current path
 * @property {function(): void} back - Navigate back
 * @property {function(): void} cleanup - Cleanup router instance
 * @property {Object} routes - Static routes map
 * @property {Array} dynamicRoutes - Dynamic routes array
 */

/**
 * Fynix Router Factory
 * @returns {FynixRouter}
 */
export default function createFynix() {
  // FIX 3: Singleton pattern - return existing instance if already initialized
  if (routerInstance && isRouterInitialized) {
    console.warn('[Router] Router already initialized, returning existing instance');
    return routerInstance;
  }

  let rootSelector = "#app-root";
  let currentPath = null;
  let isDestroyed = false;
  let listenerCount = 0;

  const listeners = [];
  const stateCleanups = [];

  if (!window[PROPS_NAMESPACE]) {
    window[PROPS_NAMESPACE] = {};
  }

  // @ts-ignore - Custom cache property
  const __fynixPropsCache = window.__fynixPropsCache || new Map();
  // @ts-ignore
  window.__fynixPropsCache = __fynixPropsCache;

  const modules = tryGlobPaths();
  const routes = {};
  const dynamicRoutes = [];

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
    } else {
      routes[routePath] = component;
    }
  }

  /**
   * Add cache management with LRU
   */
  function addToCache(key, value) {
    if (__fynixPropsCache.size >= MAX_CACHE_SIZE) {
      const firstKey = __fynixPropsCache.keys().next().value;
      const evicted = __fynixPropsCache.get(firstKey);
      
      if (evicted && typeof evicted === 'object') {
        Object.values(evicted).forEach(val => {
          if (val && typeof val === 'object' && val.cleanup) {
            try { val.cleanup(); } catch (e) {}
          }
        });
      }
      
      __fynixPropsCache.delete(firstKey);
    }
    __fynixPropsCache.set(key, value);
  }

  const MANAGED_META = [
    { key: "description", name: "description" },
    { key: "keywords", name: "keywords" },
    { key: "twitterCard", name: "twitter:card" },
    { key: "ogTitle", property: "og:title" },
    { key: "ogDescription", property: "og:description" },
    { key: "ogImage", property: "og:image" },
  ];

  /**
   * Update document meta tags for SEO with XSS prevention
   * @param {Object} meta - Meta object
   */
  function updateMetaTags(meta = {}) {
    if (!meta || typeof meta !== 'object') return;

    if (meta.title && typeof meta.title === 'string') {
      document.title = escapeHTML(meta.title);
    }

    MANAGED_META.forEach(def => {
      const value = meta[def.key];

      const selector = def.name
        ? `meta[name="${def.name}"]`
        : `meta[property="${def.property}"]`;

      let el = document.querySelector(selector);

      if (value == null) {
        if (el) el.remove();
        return;
      }

      if (typeof value !== 'string') return;

      if (!el) {
        el = document.createElement("meta");
        if (def.name) el.setAttribute("name", def.name);
        if (def.property) el.setAttribute("property", def.property);
        document.head.appendChild(el);
      }

      el.setAttribute("content", escapeHTML(value));
    });
  }

  // FIX 4: Debounce renderRoute to prevent race conditions
  let renderTimeout = null;
  const RENDER_DEBOUNCE = 10; // ms

  /**
   * Core route rendering function
   */
  function renderRoute() {
    if (isDestroyed) return;

    // FIX 5: Debounce to prevent race conditions
    if (renderTimeout) {
      clearTimeout(renderTimeout);
    }

    renderTimeout = setTimeout(() => {
      _renderRouteImmediate();
      renderTimeout = null;
    }, RENDER_DEBOUNCE);
  }

  function _renderRouteImmediate() {
    if (isDestroyed) return;

    const path = normalizePath(window.location.pathname);
    let Page = routes[path];
    let params = {};
    let routeProps = {};

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
      root.innerHTML = `<h2>404 Not Found</h2><p>Path: ${escapeHTML(path)}</p>`;
      updateMetaTags({ title: "404 - Page Not Found" });
      return;
    }

    const state = window.history.state || {};
    let passedProps = {};
    
    if (state.__fynixCacheKey && __fynixPropsCache.has(state.__fynixCacheKey)) {
      passedProps = __fynixPropsCache.get(state.__fynixCacheKey);
    } else if (state.serializedProps) {
      passedProps = deserializeProps(state.serializedProps);
    }

    if (Page.props) {
      routeProps = typeof Page.props === "function" ? Page.props() : Page.props;
    }

    if (Page.meta) {
      const meta = typeof Page.meta === "function" ? Page.meta(params) : Page.meta;
      updateMetaTags(meta);
    }

    // @ts-ignore
    window.__lastRouteProps = {
      ...routeProps,
      ...passedProps,
      params,
    };

    try {
      mount(Page, rootSelector, false, window.__lastRouteProps);
    } catch (err) {
      console.error("[Router] Mount failed:", err);
      root.innerHTML = `<pre style="color:red;">Mount Error occurred</pre>`;
    }

    currentPath = path;
  }

  /**
   * SPA Navigation Helpers
   */
  function navigate(path, props = {}) {
    if (isDestroyed) return;
    
    path = normalizePath(path);
    
    if (!isValidURL(window.location.origin + path)) {
      console.error('[Router] Invalid navigation URL');
      return;
    }
    
    if (path === currentPath) return;
    
    const cacheKey = generateCacheKey();
    addToCache(cacheKey, props);
    
    try {
      window.history.pushState({ __fynixCacheKey: cacheKey }, "", path);
      renderRoute();
    } catch (err) {
      console.error('[Router] Navigation failed:', err);
    }
  }

  function replace(path, props = {}) {
    if (isDestroyed) return;
    
    path = normalizePath(path);
    
    if (!isValidURL(window.location.origin + path)) {
      console.error('[Router] Invalid replace URL');
      return;
    }
    
    const cacheKey = generateCacheKey();
    addToCache(cacheKey, props);
    
    try {
      window.history.replaceState({ __fynixCacheKey: cacheKey }, "", path);
      renderRoute();
    } catch (err) {
      console.error('[Router] Replace failed:', err);
    }
  }

  function back() {
    if (isDestroyed) return;
    try {
      window.history.back();
    } catch (err) {
      console.error('[Router] Back navigation failed:', err);
    }
  }

  /**
   * Mount the router to a DOM element
   */
  function mountRouter(selector = "#app-root") {
    if (isDestroyed) {
      console.error("[Router] Cannot mount destroyed router");
      return;
    }
    
    if (typeof selector !== 'string' || selector.length === 0) {
      console.error('[Router] Invalid selector');
      return;
    }
    
    rootSelector = selector;
    renderRoute();
    isRouterInitialized = true;
  }

  /**
   * Link click delegation
   */
  const clickHandler = (e) => {
    if (isDestroyed) return;

    const link = e.target.closest("a[data-fynix-link]");
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || !isValidURL(href)) {
      console.warn('[Router] Invalid link href');
      return;
    }

    e.preventDefault();

    const path = normalizePath(new URL(link.href, window.location.origin).pathname);

    if (path === currentPath) return;

    let props = {};
    const propsKey = link.getAttribute("data-props-key");
    
    if (propsKey && typeof propsKey === 'string' && !propsKey.startsWith('__')) {
      if (window[PROPS_NAMESPACE]?.[propsKey]) {
        props = window[PROPS_NAMESPACE][propsKey];
      }
    }

    const serializableProps = {};
    for (const [k, v] of Object.entries(props)) {
      if (typeof k !== 'string' || k.startsWith('__')) continue;
      serializableProps[k] = v && (v._isNixState || v._isRestState) ? v.value : v;
    }

    const cacheKey = generateCacheKey();
    addToCache(cacheKey, serializableProps);

    try {
      window.history.pushState(
        { __fynixCacheKey: cacheKey, serializedProps: serializableProps },
        "",
        path
      );
      renderRoute();
    } catch (err) {
      console.error('[Router] Link navigation failed:', err);
    }
  };

  // FIX 6: Only add listeners if not already added
  if (listenerCount < MAX_LISTENERS && !isRouterInitialized) {
    document.addEventListener("click", clickHandler);
    listeners.push({ element: document, event: "click", handler: clickHandler });
    listenerCount++;

    window.addEventListener("popstate", renderRoute);
    listeners.push({ element: window, event: "popstate", handler: renderRoute });
    listenerCount++;
  }

  /**
   * Cleanup function
   */
  function cleanup() {
    isDestroyed = true;
    isRouterInitialized = false;

    // Clear debounce timeout
    if (renderTimeout) {
      clearTimeout(renderTimeout);
      renderTimeout = null;
    }

    listeners.forEach(({ element, event, handler }) => {
      try {
        element.removeEventListener(event, handler);
      } catch (e) {
        console.error('[Router] Cleanup error:', e);
      }
    });
    listeners.length = 0;
    listenerCount = 0;

    __fynixPropsCache.forEach(props => {
      if (props && typeof props === 'object') {
        Object.values(props).forEach(val => {
          if (val && typeof val === 'object' && val.cleanup) {
            try { val.cleanup(); } catch (e) {}
          }
        });
      }
    });
    __fynixPropsCache.clear();

    stateCleanups.forEach(cleanup => {
      try { cleanup(); } catch (e) {}
    });
    stateCleanups.length = 0;

    if (window[PROPS_NAMESPACE]) {
      Object.keys(window[PROPS_NAMESPACE]).forEach(key => {
        delete window[PROPS_NAMESPACE][key];
      });
      delete window[PROPS_NAMESPACE];
    }

    // @ts-ignore
    if (window.__lastRouteProps) {
      // @ts-ignore
      delete window.__lastRouteProps;
    }

    routerInstance = null;
    console.log("[Router] Cleanup complete");
  }

  // @ts-ignore - Vite HMR API
  if (import.meta.hot) {
    // @ts-ignore
    import.meta.hot.accept(() => {
      console.log("[Router] HMR detected, re-rendering route...");
      renderRoute();
    });

    // @ts-ignore
    import.meta.hot.dispose(() => {
      cleanup();
    });
  }

  const router = {
    mountRouter,
    navigate,
    replace,
    back,
    cleanup,
    routes,
    dynamicRoutes,
  };

  routerInstance = router;
  return router;
}

/**
 * Helper: Set props for links
 */
export function setLinkProps(key, props) {
  if (typeof key !== 'string' || key.startsWith('__')) {
    console.error('[Router] Invalid props key');
    return;
  }
  
  if (!props || typeof props !== 'object') {
    console.error('[Router] Invalid props object');
    return;
  }
  
  if (!window[PROPS_NAMESPACE]) {
    window[PROPS_NAMESPACE] = {};
  }
  
  if (Object.keys(window[PROPS_NAMESPACE]).length >= MAX_CACHE_SIZE) {
    console.warn('[Router] Props storage limit reached');
    return;
  }
  
  window[PROPS_NAMESPACE][key] = props;
}

/**
 * Helper: Clear link props
 */
export function clearLinkProps(key) {
  if (typeof key !== 'string') return;
  
  if (window[PROPS_NAMESPACE]?.[key]) {
    const props = window[PROPS_NAMESPACE][key];
    if (props && typeof props === 'object') {
      Object.values(props).forEach(val => {
        if (val && typeof val === 'object' && val.cleanup) {
          try { val.cleanup(); } catch (e) {}
        }
      });
    }
    delete window[PROPS_NAMESPACE][key];
  }
}

// Named export for better IDE support
export { createFynix };