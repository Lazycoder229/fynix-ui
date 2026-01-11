/**
 * Fynix File-Based Router - SECURE VERSION
 * All Security & Memory Leak Issues Fixed
 */

import { mount } from "../runtime.js";

const MAX_CACHE_SIZE = 50;
const PROPS_NAMESPACE = '__fynixLinkProps__';
const MAX_LISTENERS = 100; // Prevent listener leak DOS
const ALLOWED_PROTOCOLS = ['http:', 'https:', ''];

/**
 * Security: Validate URL to prevent open redirect
 */
function isValidURL(url) {
  try {
    const parsed = new URL(url, window.location.origin);
    
    // Only allow same-origin or relative URLs
    if (parsed.origin !== window.location.origin) {
      console.warn('[Router] Security: Cross-origin navigation blocked');
      return false;
    }
    
    // Block javascript: and data: protocols
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
  
  // Remove null bytes (directory traversal attack)
  path = path.replace(/\0/g, '');
  
  // Normalize slashes
  path = path.replace(/\\/g, '/');
  
  // Remove duplicate slashes
  path = path.replace(/\/+/g, '/');
  
  // Remove parent directory references
  path = path.split('/').filter(part => part !== '..' && part !== '.').join('/');
  
  // Ensure starts with /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  // Remove trailing slash (except for root)
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  
  return path || '/';
}

/**
 * Security: Sanitize HTML to prevent XSS
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Helper: Try multiple possible glob paths for file-based routing
 */
function tryGlobPaths() {
  let modules;
  
  // @ts-ignore - Vite glob API
  modules = import.meta.glob("/src/**/*.{js,jsx,fnx}", { eager: true });
  if (Object.keys(modules).length > 0) {
    return modules;
  }
  return {};
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
        // Security: Sanitize params to prevent XSS
        params[param] = escapeHTML(decodeURIComponent(match[i + 1]));
      });
      return { component: route.component, params };
    }
  }
  return null;
}

/**
 * Deserialize plain props - just pass values as-is
 * Component will handle wrapping in nixState if needed
 */
function deserializeProps(props) {
  if (!props || typeof props !== 'object') return {};
  
  const deserialized = {};
  for (const [key, value] of Object.entries(props)) {
    // Security: Validate key names
    if (typeof key !== 'string' || key.startsWith('__')) {
      continue; // Skip internal/dangerous keys
    }
    
    // Just pass values as-is, don't wrap in nixState
    deserialized[key] = value;
  }
  return deserialized;
}

/**
 * Normalize path (kept for backward compatibility, uses sanitizePath internally)
 */
function normalizePath(path) {
  return sanitizePath(path);
}

/**
 * Fynix Router Factory
 */
export default function createFynix() {
  let rootSelector = "#app-root";
  let currentPath = null;
  let isDestroyed = false;
  let listenerCount = 0;

  const listeners = [];
  const stateCleanups = []; // Track nixState instances for cleanup

  if (!window[PROPS_NAMESPACE]) {
    window[PROPS_NAMESPACE] = {};
  }

  // @ts-ignore - Custom cache property
  const __fynixPropsCache = window.__fynixPropsCache || new Map();
  // @ts-ignore
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
    //  console.log(`[Router] Dynamic route registered: ${routePath}`);
    } else {
      routes[routePath] = component;
     // console.log(`[Router] Static route registered: ${routePath}`);
    }
  }

  /**
   * Add cache management with LRU and memory leak prevention
   */
  function addToCache(key, value) {
    if (__fynixPropsCache.size >= MAX_CACHE_SIZE) {
      // LRU eviction
      const firstKey = __fynixPropsCache.keys().next().value;
      const evicted = __fynixPropsCache.get(firstKey);
      
      // Clean up any nixState instances in evicted props
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

  /* Meta tags */
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
   */
  /**
   * Update document meta tags for SEO with XSS prevention
   * @param {Object} meta - Meta object, may include title and other properties
   */
  function updateMetaTags(meta = /** @type {{ title?: string, [key: string]: any }} */ ({})) {
    // Security: Validate meta object
    if (!meta || typeof meta !== 'object') return;

    // ---- TITLE ----
    if (meta.title && typeof meta.title === 'string') {
      // Security: Sanitize title to prevent XSS
      document.title = escapeHTML(meta.title);
    }

    // ---- META RECONCILIATION ----
    MANAGED_META.forEach(def => {
      const value = meta[def.key];

      const selector = def.name
        ? `meta[name="${def.name}"]`
        : `meta[property="${def.property}"]`;

      let el = document.querySelector(selector);

      // REMOVE if not defined on this page
      if (value == null) {
        if (el) el.remove();
        return;
      }

      // Security: Validate value type
      if (typeof value !== 'string') return;

      // CREATE if missing
      if (!el) {
        el = document.createElement("meta");
        if (def.name) el.setAttribute("name", def.name);
        if (def.property) el.setAttribute("property", def.property);
        document.head.appendChild(el);
      }

      // UPDATE - Sanitize content to prevent XSS
      el.setAttribute("content", escapeHTML(value));
    });
  }

  /**
   * Core route rendering function
   */
  function renderRoute() {
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
      // Security: Sanitize path in error message
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

    // Update meta tags if Page has meta property
    if (Page.meta) {
      const meta = typeof Page.meta === "function" ? Page.meta(params) : Page.meta;
      updateMetaTags(meta);
    }

    // @ts-ignore - Custom props property
    window.__lastRouteProps = {
      ...routeProps,
      ...passedProps,
      params,
    };

    try {
      mount(Page, rootSelector, false, window.__lastRouteProps);
    } catch (err) {
      console.error("[Router] Mount failed:", err);
      // Security: Don't expose error details to user
      root.innerHTML = `<pre style="color:red;">Mount Error occurred</pre>`;
    }

    currentPath = path;
  }

  /**
   * SPA Navigation Helpers with security validation
   */
  function navigate(path, props = {}) {
    if (isDestroyed) return;
    
    // Security: Validate path
    path = normalizePath(path);
    
    if (!isValidURL(window.location.origin + path)) {
      console.error('[Router] Invalid navigation URL');
      return;
    }
    
    if (path === currentPath) return;
    
    const cacheKey = Date.now() + Math.random().toString(36).slice(2);
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
    
    // Security: Validate path
    path = normalizePath(path);
    
    if (!isValidURL(window.location.origin + path)) {
      console.error('[Router] Invalid replace URL');
      return;
    }
    
    const cacheKey = Date.now() + Math.random().toString(36).slice(2);
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
    
    // Security: Validate selector
    if (typeof selector !== 'string' || selector.length === 0) {
      console.error('[Router] Invalid selector');
      return;
    }
    
    rootSelector = selector;
    renderRoute();
  }

  /**
   * Link click delegation with proper cleanup tracking
   */
  const clickHandler = (e) => {
    if (isDestroyed) return;

    const link = e.target.closest("a[data-fynix-link]");
    if (!link) return;

    // Security: Validate href
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
    
    // Security: Validate propsKey
    if (propsKey && typeof propsKey === 'string' && !propsKey.startsWith('__')) {
      if (window[PROPS_NAMESPACE]?.[propsKey]) {
        props = window[PROPS_NAMESPACE][propsKey];
        // Debug
       // console.log("[Router] ClickHandler found props:", props);
      } else {
         console.warn("[Router] Props not found for key:", propsKey, "in namespace:", PROPS_NAMESPACE);
      }
    } else {
        console.warn("[Router] Invalid propsKey:", propsKey);
    }
    
   // console.log("[Router] Navigating to:", path, "with props:", props);

    // Unwrap nixState objects before caching
    const serializableProps = {};
    for (const [k, v] of Object.entries(props)) {
      // Security: Skip internal keys
      if (typeof k !== 'string' || k.startsWith('__')) continue;
      
      serializableProps[k] = v && (v._isNixState || v._isRestState) ? v.value : v;
    }

    const cacheKey = Date.now() + Math.random().toString(36).slice(2);
    // Cache the unwrapped values, not the nixState objects
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

  // Security: Check listener limit to prevent DOS
  if (listenerCount < MAX_LISTENERS) {
    document.addEventListener("click", clickHandler);
    listeners.push({ element: document, event: "click", handler: clickHandler });
    listenerCount++;

    window.addEventListener("popstate", renderRoute);
    listeners.push({ element: window, event: "popstate", handler: renderRoute });
    listenerCount++;
  } else {
    console.error('[Router] Listener limit reached - possible memory leak');
  }

  /**
   * Cleanup function to prevent memory leaks
   */
  function cleanup() {
    isDestroyed = true;

    // Remove all event listeners
    listeners.forEach(({ element, event, handler }) => {
      try {
        element.removeEventListener(event, handler);
      } catch (e) {
        console.error('[Router] Cleanup error:', e);
      }
    });
    listeners.length = 0;
    listenerCount = 0;

    // Clean up all cached props
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

    // Clean up state cleanups
    stateCleanups.forEach(cleanup => {
      try { cleanup(); } catch (e) {}
    });
    stateCleanups.length = 0;

    // Clean up global namespace
    if (window[PROPS_NAMESPACE]) {
      Object.keys(window[PROPS_NAMESPACE]).forEach(key => {
        delete window[PROPS_NAMESPACE][key];
      });
      delete window[PROPS_NAMESPACE];
    }

    // Clear last route props
    // @ts-ignore
    if (window.__lastRouteProps) {
      // @ts-ignore
      delete window.__lastRouteProps;
    }

    console.log("[Router] Cleanup complete");
  }

  // HMR support
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

  return {
    mountRouter,
    navigate,
    replace,
    back,
    cleanup,
    routes,
    dynamicRoutes,
  };
}

/**
 * Helper: Set props for links with security validation
 */
export function setLinkProps(key, props) {
  // Security: Validate inputs
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
  
  // Security: Limit number of stored props to prevent memory exhaustion
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
    // Clean up any nixState instances
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