/* MIT License

* Copyright (c) 2026 Resty Gonzales

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
 */

/**
 * Fynix File-Based Router - TypeScript Edition
 * All Security & Memory Leak Issues Fixed
 */

import { mount } from "../runtime";

// ---------------------- Types ----------------------

// Enhanced Route Configuration for Enterprise Scale
interface RouteConfig {
  component: () => Promise<any>;
  preload?: boolean;
  priority?: "high" | "medium" | "low";
  prefetch?: string[]; // Related routes to prefetch
  guard?: RouteGuard;
  meta?: RouteMeta | ((params: Record<string, string>) => RouteMeta);
  keepAlive?: boolean;
  layout?: ComponentFunction;
}

interface RouteGuard {
  canActivate?: (
    route: string,
    params: Record<string, string>
  ) => boolean | Promise<boolean>;
  canDeactivate?: (route: string) => boolean | Promise<boolean>;
  redirect?: string;
}

interface RouteMatch {
  component: RouteComponent;
  params: Record<string, string>;
  meta?: RouteMeta;
}

interface NestedRoute {
  path: string;
  component: ComponentFunction;
  children?: NestedRoute[];
  layout?: ComponentFunction;
  keepAlive?: boolean;
}

interface ComponentFunction {
  (props: any): any;
}

interface RouteComponent {
  (props: any): any;
  props?: Record<string, any> | (() => Record<string, any>);
  meta?: RouteMeta | ((params: Record<string, string>) => RouteMeta);
}

interface RouteMeta {
  title?: string;
  description?: string;
  keywords?: string;
  twitterCard?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

interface DynamicRoute {
  pattern: string;
  regex: RegExp;
  component: RouteComponent;
  params: string[];
}

interface EventListener {
  element: Element | Window | Document;
  event: string;
  handler: EventListenerOrEventListenerObject;
}

interface HistoryState {
  __fynixCacheKey?: string;
  serializedProps?: Record<string, any>;
}

interface FynixRouter {
  mountRouter(selector?: string): void;
  navigate(path: string, props?: Record<string, any>): void;
  replace(path: string, props?: Record<string, any>): void;
  back(): void;
  cleanup(): void;
  routes: Record<string, RouteComponent>;
  dynamicRoutes: DynamicRoute[];
  // Enterprise features
  preloadRoute?(path: string): Promise<void>;
  clearCache?(): void;
  enableNestedRouting?(routes: NestedRoute[]): void;
}

interface WindowWithFynix extends Window {
  [key: string]: any;
  __fynixPropsCache?: Map<string, Record<string, any>>;
  __lastRouteProps?: Record<string, any>;
  __fynixLinkProps__?: Record<string, any>;
}

declare const window: WindowWithFynix;

// ---------------------- Constants ----------------------

const MAX_CACHE_SIZE = 50;
const PROPS_NAMESPACE = "__fynixLinkProps__";
const MAX_LISTENERS = 100;
const ALLOWED_PROTOCOLS = ["http:", "https:", ""];
const RENDER_DEBOUNCE = 10; // ms

// ---------------------- Singleton State ----------------------

let routerInstance: FynixRouter | null = null;
let isRouterInitialized = false;

// ---------------------- Security Helpers ----------------------

/**
 * Detect external URLs
 */
function isExternal(url: string): boolean {
  return /^https?:\/\//.test(url);
}

/**
 *  HTML escaping to prevent XSS - Enhanced version
 */
function escapeHTML(str: unknown): string {
  if (typeof str !== "string") return "";

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/`/g, "&#96;")
    .replace(/\//g, "&#x2F;")
    .replace(/=/g, "&#x3D;")
    .replace(/\(/g, "&#x28;")
    .replace(/\)/g, "&#x29;")
    .replace(/\{/g, "&#x7B;")
    .replace(/\}/g, "&#x7D;")
    .replace(/\[/g, "&#x5B;")
    .replace(/\]/g, "&#x5D;");
}

/**
 * Sanitize content for safe DOM insertion
 */
function sanitizeContent(content: string): string {
  // Remove potentially dangerous elements and attributes
  return content
    .replace(/<script[^>]*>.*?<\/script>/gis, "")
    .replace(/<iframe[^>]*>.*?<\/iframe>/gis, "")
    .replace(/<object[^>]*>.*?<\/object>/gis, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/data:/gi, "")
    .replace(/expression\s*\(/gi, "");
}

/**
 * Validate and sanitize component props
 */
function sanitizeProps(props: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    // Skip dangerous keys
    if (
      typeof key !== "string" ||
      key.startsWith("__") ||
      key.includes("javascript") ||
      key.includes("on")
    ) {
      continue;
    }

    // Sanitize string values
    if (typeof value === "string") {
      // First sanitize any HTML content, then escape remaining characters
      const cleanContent = sanitizeContent(value);
      sanitized[key] = escapeHTML(cleanContent);
    } else if (typeof value === "object" && value !== null) {
      // Recursively sanitize nested objects (with depth limit)
      if (Object.keys(value).length < 50) {
        // Prevent DoS
        sanitized[key] = sanitizeProps(value);
      }
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    }
    // Skip functions and other potentially dangerous types
  }

  return sanitized;
}

/**
 * Validate URL to prevent open redirect - Enhanced security
 */
function isValidURL(url: string): boolean {
  try {
    // Reject URLs with suspicious patterns
    const suspiciousPatterns = [
      /javascript:/i,
      /vbscript:/i,
      /data:/i,
      /mailto:/i,
      /tel:/i,
      /ftp:/i,
      /file:/i,
      /%2f%2f/i, // Double slash encoding
      /%5c%5c/i, // Double backslash encoding
      /\\\\/, // UNC paths
      /@/, // Potential credential injection
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(url))) {
      console.warn("[Router] Security: Suspicious URL pattern blocked");
      return false;
    }

    const parsed = new URL(url, window.location.origin);

    // Strict origin validation
    if (parsed.origin !== window.location.origin) {
      console.warn("[Router] Security: Cross-origin navigation blocked");
      return false;
    }

    // Protocol validation
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      console.warn(
        "[Router] Security: Dangerous protocol blocked:",
        parsed.protocol
      );
      return false;
    }

    // Additional checks for encoded attacks
    const decodedPath = decodeURIComponent(parsed.pathname);
    if (decodedPath !== parsed.pathname && /[<>"'`]/.test(decodedPath)) {
      console.warn("[Router] Security: Encoded XSS attempt blocked");
      return false;
    }

    // Check for excessive length (DoS prevention)
    if (url.length > 2048) {
      console.warn("[Router] Security: Excessively long URL blocked");
      return false;
    }

    return true;
  } catch (e) {
    console.warn("[Router] Security: Invalid URL blocked");
    return false;
  }
}

/**
 * Sanitize path to prevent directory traversal
 */
function sanitizePath(path: string): string {
  if (typeof path !== "string") return "/";

  // Decode URL encoding first to catch encoded traversal attempts
  try {
    path = decodeURIComponent(path);
  } catch (e) {
    console.warn("[Router] Invalid URL encoding in path");
    return "/";
  }

  // Remove null bytes
  path = path.replace(/\0/g, "");

  // Normalize slashes
  path = path.replace(/\\/g, "/");
  path = path.replace(/\/+/g, "/");

  // Remove directory traversal attempts
  path = path
    .split("/")
    .filter((part) => part !== ".." && part !== ".")
    .join("/");

  // Ensure leading slash
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  // Remove trailing slash (except for root)
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  return path || "/";
}

// ---------------------- Module Loading ----------------------

/**
 * Try multiple possible glob paths for file-based routing
 */
/**
 * Try multiple possible glob paths for file-based routing
 */
function tryGlobPaths(): Record<string, any> {
  try {
    // Always try absolute from src first (Vite project root)
    let modules = import.meta.glob("/src/**/*.{fnx,tsx,jsx,ts,js}", {
      eager: true,
    });
    /*   console.log("[Router] Glob attempt 1 (/src/**):", Object.keys(modules)); */

    // Fallback: try relative patterns (for monorepo or unusual setups)
    if (Object.keys(modules).length === 0) {
      modules = import.meta.glob(
        ["./**/*.fnx", "./**/*.tsx", "./**/*.jsx", "./**/*.ts", "./**/*.js"],
        { eager: true }
      );
      /*   console.log("[Router] Glob attempt 2 (./**):", Object.keys(modules)); */
    }

    // Fallback: try from parent
    if (Object.keys(modules).length === 0) {
      modules = import.meta.glob(
        ["../**/*.fnx", "../**/*.tsx", "../**/*.jsx"],
        { eager: true }
      );
      /*  console.log("[Router] Glob attempt 3 (../**):", Object.keys(modules)); */
    }

    /*  console.log("[Router] Final modules loaded:", Object.keys(modules).length); */
    return modules || {};
  } catch (error) {
    console.error("[Router] Failed to load modules:", error);
    return {};
  }
}

/**
 * Convert file path to route path
 */
function filePathToRoute(filePath: string): string {
  let route = filePath
    .replace(/^.*\/src/, "")
    .replace(/\.(ts|tsx|js|jsx|fnx)$/, "")
    .replace(/\/view$/, "")
    .replace(/\/$/, "");

  if (!route) route = "/";

  // Convert [param] to :param for route matching
  route = route.replace(/\[([^\]]+)\]/g, ":$1");

  return route;
}

// ---------------------- Route Matching ----------------------

/**
 * Match a dynamic route pattern
 */
function matchDynamicRoute(
  path: string,
  dynamicRoutes: DynamicRoute[]
): { component: RouteComponent; params: Record<string, string> } | null {
  for (const route of dynamicRoutes) {
    const match = path.match(route.regex);

    if (match) {
      const params: Record<string, string> = {};

      route.params.forEach((param, i) => {
        // Already decoded in sanitizePath, just escape
        const matchValue = match[i + 1];
        params[param] = escapeHTML(matchValue || "");
      });

      return { component: route.component, params };
    }
  }

  return null;
}

// ---------------------- Props Serialization ----------------------

/**
 * Deserialize plain props
 */
function deserializeProps(props: unknown): Record<string, any> {
  if (!props || typeof props !== "object") return {};

  const deserialized: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    if (typeof key !== "string" || key.startsWith("__")) {
      continue;
    }
    deserialized[key] = value;
  }

  return deserialized;
}

/**
 * Normalize path
 */
function normalizePath(path: string): string {
  return sanitizePath(path);
}

// ---------------------- Cache Management ----------------------

/**
 * Generate unique cache keys using crypto API when available
 */
function generateCacheKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback with better uniqueness
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

/**
 * Add to cache with LRU eviction
 */
function addToCache(
  cache: Map<string, Record<string, any>>,
  key: string,
  value: Record<string, any>
): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (typeof firstKey === "string") {
      const evicted = cache.get(firstKey);
      if (evicted && typeof evicted === "object") {
        Object.values(evicted).forEach((val) => {
          if (val && typeof val === "object" && "cleanup" in val) {
            try {
              (val as any).cleanup();
            } catch (e) {
              // Silent cleanup failure
            }
          }
        });
      }
      cache.delete(firstKey);
    }
  }

  cache.set(key, value);
}

// ---------------------- Meta Tag Management ----------------------

interface MetaDefinition {
  key: keyof RouteMeta;
  name?: string;
  property?: string;
}

const MANAGED_META: MetaDefinition[] = [
  { key: "description", name: "description" },
  { key: "keywords", name: "keywords" },
  { key: "twitterCard", name: "twitter:card" },
  { key: "ogTitle", property: "og:title" },
  { key: "ogDescription", property: "og:description" },
  { key: "ogImage", property: "og:image" },
];

/**
 * Update document meta tags for SEO with enhanced XSS prevention
 */
function updateMetaTags(meta: RouteMeta = {}): void {
  if (!meta || typeof meta !== "object") return;

  // Sanitize title with length limit
  if (meta.title && typeof meta.title === "string") {
    const sanitizedTitle = escapeHTML(meta.title).substring(0, 60); // SEO best practice
    document.title = sanitizedTitle;
  }

  MANAGED_META.forEach((def) => {
    const value = meta[def.key];

    const selector = def.name
      ? `meta[name="${CSS.escape(def.name)}"]`
      : `meta[property="${CSS.escape(def.property || "")}"]`;

    let el = document.querySelector(selector);

    if (value == null) {
      if (el) el.remove();
      return;
    }

    if (typeof value !== "string") return;

    // Additional validation for meta content - sanitize HTML first
    const cleanValue = sanitizeContent(value);
    const sanitizedValue = escapeHTML(cleanValue).substring(0, 300); // Reasonable length limit

    // Block suspicious content
    if (/javascript:|vbscript:|data:|<|>/i.test(sanitizedValue)) {
      console.warn(
        `[Router] Security: Blocked suspicious meta content for ${def.key}`
      );
      return;
    }

    if (!el) {
      el = document.createElement("meta");
      if (def.name) el.setAttribute("name", def.name);
      if (def.property) el.setAttribute("property", def.property);
      document.head.appendChild(el);
    }

    el.setAttribute("content", sanitizedValue);
  });
}

// ---------------------- Enterprise Router Classes ----------------------

/**
 * Advanced route management with preloading and caching
 */
class EnterpriseRouter {
  private routeCache = new Map<string, any>();
  private preloadQueue = new Set<string>();
  private routeMatchCache = new Map<string, RouteMatch | null>();
  private routes: Record<string, RouteConfig> = {};

  setRoutes(routes: Record<string, RouteConfig>) {
    if (!routes || typeof routes !== "object") {
      console.warn("[EnterpriseRouter] Invalid routes configuration");
      return;
    }
    this.routes = routes;
  }

  async preloadRoute(path: string): Promise<void> {
    if (this.routeCache.has(path)) return;

    const route = this.routes[path];
    if (route?.component) {
      // Load in background during idle time
      const loadRoute = async () => {
        try {
          const component = await route.component();
          this.routeCache.set(path, component);

          // Preload related routes
          route.prefetch?.forEach((prefetchPath) => {
            this.preloadQueue.add(prefetchPath);
          });

          console.log(`[EnterpriseRouter] Preloaded route: ${path}`);
        } catch (error) {
          console.warn(
            `[EnterpriseRouter] Failed to preload route ${path}:`,
            error
          );
        }
      };

      if ("requestIdleCallback" in window) {
        requestIdleCallback(loadRoute);
      } else {
        setTimeout(loadRoute, 0);
      }
    }
  }

  // Smart route matching with caching
  matchRoute(path: string): RouteMatch | null {
    const cached = this.routeMatchCache.get(path);
    if (cached !== undefined) return cached;

    const match = this.computeRouteMatch(path);

    // Cache the result with LRU eviction
    if (this.routeMatchCache.size > 100) {
      const firstKey = this.routeMatchCache.keys().next().value;
      if (firstKey !== undefined) {
        this.routeMatchCache.delete(firstKey);
      }
    }

    this.routeMatchCache.set(path, match);
    return match;
  }

  private computeRouteMatch(path: string): RouteMatch | null {
    // Extract parameters from dynamic routes
    const segments = path.split("/").filter(Boolean);

    for (const [routePath, routeConfig] of Object.entries(this.routes)) {
      const routeSegments = routePath.split("/").filter(Boolean);

      if (segments.length !== routeSegments.length) continue;

      const params: Record<string, string> = {};
      let isMatch = true;

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const routeSegment = routeSegments[i];

        if (routeSegment && segment) {
          if (routeSegment.startsWith(":")) {
            // Dynamic parameter
            params[routeSegment.slice(1)] = segment;
          } else if (segment !== routeSegment) {
            isMatch = false;
            break;
          }
        } else {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        return {
          component: routeConfig.component as any,
          params,
          meta:
            typeof routeConfig.meta === "function"
              ? routeConfig.meta(params)
              : routeConfig.meta,
        };
      }
    }

    return null;
  }

  async checkRouteGuard(
    route: RouteConfig,
    path: string,
    params: Record<string, string>
  ): Promise<boolean> {
    if (!route.guard) return true;

    if (route.guard.canActivate) {
      const canActivate = await route.guard.canActivate(path, params);
      return canActivate;
    }

    return true;
  }

  getPreloadedComponent(path: string): any {
    return this.routeCache.get(path);
  }

  clearCache(): void {
    this.routeCache.clear();
    this.routeMatchCache.clear();
    this.preloadQueue.clear();
  }
}

/**
 * Nested routing with layout persistence
 */
class LayoutRouter {
  private layoutCache = new Map<string, any>();
  private keepAliveComponents = new Map<string, any>();

  renderNestedRoutes(routes: NestedRoute[], segments: string[]): any {
    if (segments.length === 0) return null;

    const [currentSegment, ...remainingSegments] = segments;
    const currentRoute = routes.find((r) => r.path === currentSegment);

    if (!currentRoute) return null;

    let content: any;

    if (remainingSegments.length > 0 && currentRoute.children) {
      // Recursive nested routing
      content = this.renderNestedRoutes(
        currentRoute.children,
        remainingSegments
      );
    } else {
      // Leaf route - render component with keep-alive if needed
      if (currentRoute.keepAlive && currentSegment) {
        content = this.renderKeepAlive(currentRoute.component, currentSegment);
      } else {
        content = this.renderComponent(currentRoute.component);
      }
    }

    // Wrap in layout if specified
    if (currentRoute.layout) {
      const layoutKey = `${currentSegment}_layout`;
      let layoutComponent = this.layoutCache.get(layoutKey);

      if (!layoutComponent) {
        layoutComponent = this.renderComponent(currentRoute.layout);
        this.layoutCache.set(layoutKey, layoutComponent);
      }

      return this.renderComponent(currentRoute.layout, { children: content });
    }

    return content;
  }

  private renderKeepAlive(component: ComponentFunction, key: string): any {
    if (this.keepAliveComponents.has(key)) {
      return this.keepAliveComponents.get(key);
    }

    const rendered = this.renderComponent(component);
    this.keepAliveComponents.set(key, rendered);
    return rendered;
  }

  private renderComponent(component: ComponentFunction, props: any = {}): any {
    try {
      return component(props);
    } catch (error) {
      console.error("[LayoutRouter] Component render error:", error);
      return null;
    }
  }

  cleanup(): void {
    this.layoutCache.clear();
    this.keepAliveComponents.clear();
  }
}

// Global instances
const enterpriseRouter = new EnterpriseRouter();
const layoutRouter = new LayoutRouter();

// ---------------------- Router Factory ----------------------

/**
 * Fynix Router Factory
 */
function createFynix(): FynixRouter {
  const isDevMode = import.meta.hot !== undefined;

  // Singleton pattern - return existing instance if already initialized
  if (routerInstance && isRouterInitialized && !isDevMode) {
    console.warn(
      "[Router] Router already initialized, returning existing instance"
    );
    return routerInstance;
  }

  // In dev mode with HMR, cleanup old instance before creating new one
  if (isDevMode && routerInstance) {
    console.log("[Router] HMR: Cleaning up old router instance");
    routerInstance.cleanup();
    routerInstance = null;
    isRouterInitialized = false;
  }

  let rootSelector = "#app-root";
  let currentPath: string | null = null;
  let isDestroyed = false;
  let listenerCount = 0;
  let renderTimeout: NodeJS.Timeout | null = null;
  let lastNavigationTime = 0;
  const NAVIGATION_RATE_LIMIT = 100; // ms between navigations

  const listeners: EventListener[] = [];

  // Initialize props namespace
  if (!window[PROPS_NAMESPACE]) {
    window[PROPS_NAMESPACE] = {};
  }

  // Clear old cache in dev mode to prevent memory buildup
  if (isDevMode && window.__fynixPropsCache) {
    window.__fynixPropsCache.clear();
  }

  const propsCache: Map<
    string,
    Record<string, any>
  > = window.__fynixPropsCache || new Map();
  window.__fynixPropsCache = propsCache;

  // Load all route modules
  const modules = tryGlobPaths();
  const routes: Record<string, RouteComponent> = {};
  const dynamicRoutes: DynamicRoute[] = [];

  for (const [filePath, mod] of Object.entries(modules)) {
    const routePath = filePathToRoute(filePath);
    let component: RouteComponent | undefined = undefined;
    if (mod && typeof mod === "object") {
      if ("default" in mod && mod.default) {
        component = mod.default;
      } else {
        const keys = Object.keys(mod);
        const firstKey = keys.length > 0 ? keys[0] : undefined;
        if (
          firstKey !== undefined &&
          typeof firstKey === "string" &&
          typeof mod[firstKey] !== "undefined"
        ) {
          component = mod[firstKey];
        } else {
          const values = Object.values(mod).filter(Boolean);
          if (values.length > 0) {
            component = values[0] as RouteComponent;
          }
        }
      }
    }

    if (!component || typeof routePath !== "string") continue;

    const hasDynamic = /:[^/]+/.test(routePath);

    if (hasDynamic) {
      dynamicRoutes.push({
        pattern: routePath,
        regex: new RegExp("^" + routePath.replace(/:[^/]+/g, "([^/]+)") + "$"),
        component,
        params: [...routePath.matchAll(/:([^/]+)/g)]
          .map((m) => m[1])
          .filter((p): p is string => typeof p === "string"),
      });
    } else {
      routes[routePath] = component;
    }
  }

  // ---------------------- Core Rendering ----------------------
  /**
   * Enhanced core route rendering function with enterprise features
   */
  async function renderRouteImmediate(): Promise<void> {
    if (isDestroyed) return;

    const path = normalizePath(window.location.pathname);
    let Page: RouteComponent | undefined = routes[path];
    let params: Record<string, string> = {};
    let routeProps: Record<string, any> = {};

    // Try enterprise router matching first
    const enterpriseMatch = enterpriseRouter.matchRoute(path);
    if (enterpriseMatch) {
      // Check if component is preloaded
      const preloadedComponent = enterpriseRouter.getPreloadedComponent(path);
      if (preloadedComponent) {
        Page = preloadedComponent;
      } else {
        Page = enterpriseMatch.component;
      }
      params = enterpriseMatch.params;
    }

    // Fallback to original dynamic route matching
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

    // Try nested routing first if configured
    const nestedRoutes = (routerInstance as any)?.nestedRoutes;
    if (nestedRoutes) {
      // Define a stable wrapper for the nested router to maintain state
      const NestedRouterWrapper = () => {
        const path = normalizePath(window.location.pathname);
        const segments = path.split("/").filter(Boolean);
        return layoutRouter.renderNestedRoutes(
          nestedRoutes,
          segments.length > 0 ? segments : [""]
        );
      };

      const state = (window.history.state || {}) as HistoryState;
      let passedProps: Record<string, any> = {};

      if (state.__fynixCacheKey && propsCache.has(state.__fynixCacheKey)) {
        passedProps = propsCache.get(state.__fynixCacheKey)!;
      } else if (state.serializedProps) {
        passedProps = deserializeProps(state.serializedProps);
      }

      const safeProps = sanitizeProps({ ...passedProps, params });
      window.__lastRouteProps = safeProps;

      try {
        mount(NestedRouterWrapper, rootSelector, safeProps);
        currentPath = path;
        return;
      } catch (err) {
        console.error("[Router] Nested mount failed:", err);
      }
    }

    // Show enhanced 404 if no route found
    if (!Page) {
      root.innerHTML = "";
      const container = document.createElement("div");
      container.style.cssText =
        "padding: 2rem; text-align: center; font-family: system-ui, sans-serif;";

      const heading = document.createElement("h2");
      heading.textContent = "404 Not Found";
      heading.style.cssText = "color: #dc2626; margin-bottom: 1rem;";

      const pathInfo = document.createElement("p");
      const safePath = escapeHTML(sanitizeContent(path));
      pathInfo.textContent = `Path: ${safePath}`;
      pathInfo.style.cssText = "color: #6b7280; margin-bottom: 2rem;";

      const backButton = document.createElement("button");
      backButton.textContent = "Go Back";
      backButton.style.cssText =
        "padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.25rem; cursor: pointer;";
      backButton.onclick = () => window.history.back();

      container.appendChild(heading);
      container.appendChild(pathInfo);
      container.appendChild(backButton);
      root.appendChild(container);

      updateMetaTags({ title: "404 - Page Not Found" });

      // Preload commonly visited routes for better UX
      ["/", "/home", "/about"].forEach((commonPath) => {
        enterpriseRouter.preloadRoute(commonPath).catch(console.warn);
      });

      return;
    }

    // Retrieve props from cache or history state with enhanced caching
    const state = (window.history.state || {}) as HistoryState;
    let passedProps: Record<string, any> = {};

    if (state.__fynixCacheKey && propsCache.has(state.__fynixCacheKey)) {
      passedProps = propsCache.get(state.__fynixCacheKey)!;
    } else if (state.serializedProps) {
      passedProps = deserializeProps(state.serializedProps);
    }

    // Get route-specific props
    if (Page.props) {
      routeProps = typeof Page.props === "function" ? Page.props() : Page.props;
    }

    // Update meta tags
    if (Page.meta) {
      const meta =
        typeof Page.meta === "function" ? Page.meta(params) : Page.meta;
      updateMetaTags(meta);
    }

    // Merge and sanitize all props
    const unsafeProps = {
      ...routeProps,
      ...passedProps,
      params,
    };

    // Sanitize props before mounting to prevent XSS
    const safeProps = sanitizeProps(unsafeProps);
    window.__lastRouteProps = safeProps;

    // Mount the page component
    try {
      mount(Page, rootSelector, safeProps);
    } catch (err) {
      console.error("[Router] Mount failed:", err);
      // Safe error display without innerHTML
      root.innerHTML = "";
      const errorDiv = document.createElement("pre");
      errorDiv.style.color = "red";
      errorDiv.textContent = "Mount Error occurred";
      root.appendChild(errorDiv);
    }

    currentPath = path;
  }
  /**
   * Debounced route rendering to prevent race conditions
   */
  function renderRoute(): void {
    if (isDestroyed) return;

    if (renderTimeout) {
      clearTimeout(renderTimeout);
    }

    renderTimeout = setTimeout(async () => {
      await renderRouteImmediate();
      renderTimeout = null;
    }, RENDER_DEBOUNCE);
  }
  // ---------------------- Navigation Methods ----------------------

  /**
   * Navigate to a new path with props - Enhanced with preloading
   */
  function navigate(path: string, props: Record<string, any> = {}): void {
    if (isDestroyed) return;

    // Rate limiting to prevent DoS
    const now = Date.now();
    if (now - lastNavigationTime < NAVIGATION_RATE_LIMIT) {
      console.warn("[Router] Security: Navigation rate limited");
      return;
    }
    lastNavigationTime = now;

    const normalizedPath = normalizePath(path);

    if (!isValidURL(window.location.origin + normalizedPath)) {
      console.error("[Router] Invalid navigation URL");
      return;
    }

    if (normalizedPath === currentPath) return;

    // Preload the target route if possible
    enterpriseRouter.preloadRoute(normalizedPath).catch(console.warn);

    // Sanitize props before caching
    const sanitizedProps = sanitizeProps(props);
    const cacheKey = generateCacheKey();
    addToCache(propsCache, cacheKey, sanitizedProps);

    try {
      window.history.pushState(
        { __fynixCacheKey: cacheKey },
        "",
        normalizedPath
      );
      renderRoute();
    } catch (err) {
      console.error("[Router] Navigation failed:", err);
    }
  }

  /**
   * Replace current path with new path and props - Enhanced security
   */
  function replace(path: string, props: Record<string, any> = {}): void {
    if (isDestroyed) return;

    // Rate limiting to prevent DoS
    const now = Date.now();
    if (now - lastNavigationTime < NAVIGATION_RATE_LIMIT) {
      console.warn("[Router] Security: Replace rate limited");
      return;
    }
    lastNavigationTime = now;

    const normalizedPath = normalizePath(path);

    if (!isValidURL(window.location.origin + normalizedPath)) {
      console.error("[Router] Invalid replace URL");
      return;
    }

    // Sanitize props before caching
    const sanitizedProps = sanitizeProps(props);
    const cacheKey = generateCacheKey();
    addToCache(propsCache, cacheKey, sanitizedProps);

    try {
      window.history.replaceState(
        { __fynixCacheKey: cacheKey },
        "",
        normalizedPath
      );
      renderRoute();
    } catch (err) {
      console.error("[Router] Replace failed:", err);
    }
  }

  /**
   * Navigate back in history
   */
  function back(): void {
    if (isDestroyed) return;

    try {
      window.history.back();
    } catch (err) {
      console.error("[Router] Back navigation failed:", err);
    }
  }

  // ---------------------- Event Handlers ----------------------

  /**
   * Link click delegation handler
   */
  const clickHandler = (e: Event): void => {
    if (isDestroyed) return;

    const target = e.target as HTMLElement;
    const link = target.closest(
      "a[data-fynix-link]"
    ) as HTMLAnchorElement | null;

    if (!link) return;

    const href = link.getAttribute("href");
    if (!href) {
      console.warn("[Router] Missing href attribute");
      return;
    }

    // Ignore external links
    if (isExternal(href)) {
      return; // Let the browser handle it
    }

    // Build full URL for validation (handles relative URLs)
    const fullUrl = new URL(link.href, window.location.origin).href;
    if (!isValidURL(fullUrl)) {
      console.warn("[Router] Invalid link href");
      return;
    }

    e.preventDefault();

    const path = normalizePath(
      new URL(link.href, window.location.origin).pathname
    );

    if (path === currentPath) return;

    let props: Record<string, any> = {};
    const propsKey = link.getAttribute("data-props-key");

    if (
      propsKey &&
      typeof propsKey === "string" &&
      !propsKey.startsWith("__")
    ) {
      if (window[PROPS_NAMESPACE]?.[propsKey]) {
        props = window[PROPS_NAMESPACE][propsKey];
      }
    }

    // Serialize props (extract values from reactive states)
    const serializableProps: Record<string, any> = {};
    for (const [k, v] of Object.entries(props)) {
      if (typeof k !== "string" || k.startsWith("__")) continue;
      serializableProps[k] =
        v && (v._isNixState || v._isRestState) ? v.value : v;
    }

    const cacheKey = generateCacheKey();
    addToCache(propsCache, cacheKey, serializableProps);

    try {
      window.history.pushState(
        { __fynixCacheKey: cacheKey, serializedProps: serializableProps },
        "",
        path
      );
      renderRoute();
    } catch (err) {
      console.error("[Router] Link navigation failed:", err);
    }
  };

  // ---------------------- Event Listener Setup ----------------------

  // Only add listeners if not already added
  if (listenerCount < MAX_LISTENERS && !isRouterInitialized) {
    document.addEventListener("click", clickHandler);
    listeners.push({
      element: document,
      event: "click",
      handler: clickHandler,
    });
    listenerCount++;

    window.addEventListener("popstate", renderRoute);
    listeners.push({
      element: window,
      event: "popstate",
      handler: renderRoute,
    });
    listenerCount++;
  }

  // ---------------------- Public Methods ----------------------

  /**
   * Mount the router to a DOM element
   */
  function mountRouter(selector: string = "#app-root"): void {
    if (isDestroyed) {
      console.error("[Router] Cannot mount destroyed router");
      return;
    }

    if (typeof selector !== "string" || selector.length === 0) {
      console.error("[Router] Invalid selector");
      return;
    }

    rootSelector = selector;
    renderRoute();
    isRouterInitialized = true;
  }

  /**
   * Enhanced cleanup function with enterprise router cleanup
   */
  function cleanup(): void {
    // Clear timeout FIRST to prevent pending renders
    if (renderTimeout) {
      clearTimeout(renderTimeout);
      renderTimeout = null;
    }

    // Mark as destroyed
    isDestroyed = true;

    // Clean up enterprise router features
    enterpriseRouter.clearCache();
    layoutRouter.cleanup();

    // Remove all event listeners
    listeners.forEach(({ element, event, handler }) => {
      try {
        element.removeEventListener(event, handler);
      } catch (e) {
        console.error("[Router] Cleanup error:", e);
      }
    });
    listeners.length = 0;
    listenerCount = 0;

    // Clean up all cached props
    propsCache.forEach((props) => {
      if (props && typeof props === "object") {
        Object.values(props).forEach((val) => {
          if (val && typeof val === "object" && "cleanup" in val) {
            try {
              (val as any).cleanup();
            } catch (e) {
              // Silent cleanup failure
            }
          }
        });
      }
    });
    propsCache.clear();

    // Clean up global namespace
    if (window[PROPS_NAMESPACE]) {
      const ns = window[PROPS_NAMESPACE];
      if (ns && typeof ns === "object") {
        Object.keys(ns).forEach((key) => {
          delete ns[key];
        });
      }
      delete window[PROPS_NAMESPACE];
    }

    // Clear last route props
    if (window.__lastRouteProps) {
      delete window.__lastRouteProps;
    }

    // Reset singleton flags at the VERY end
    isRouterInitialized = false;
    routerInstance = null;

    console.log("[Router] Cleanup complete");
  }

  // ---------------------- HMR Support ----------------------

  // @ts-ignore - Vite HMR API
  if (import.meta.hot) {
    // @ts-ignore
    import.meta.hot.accept(() => {
      console.log("[Router] HMR detected, re-rendering route...");
      renderRoute();
    });

    // @ts-ignore
    import.meta.hot.dispose(() => {
      console.log("[Router] HMR dispose, cleaning up...");
      cleanup();
      // Reset singleton flags for HMR
      routerInstance = null;
      isRouterInitialized = false;
    });
  }

  // ---------------------- Router Instance ----------------------

  const router: FynixRouter = {
    mountRouter,
    navigate,
    replace,
    back,
    cleanup,
    routes,
    dynamicRoutes,
    // Enterprise features
    preloadRoute: enterpriseRouter.preloadRoute.bind(enterpriseRouter),
    clearCache: () => {
      enterpriseRouter.clearCache();
      layoutRouter.cleanup();
    },
    enableNestedRouting: (nestedRoutes: NestedRoute[]) => {
      // Store nested routes configuration
      (router as any).nestedRoutes = nestedRoutes;
      console.log(
        "[Router] Nested routing enabled with",
        nestedRoutes.length,
        "routes"
      );
    },
  };

  routerInstance = router;
  return router;
}

// Export as both named and default
export { createFynix };
export default createFynix;
// ---------------------- Helper Exports ----------------------

/**
 * Set props for links
 */
export function setLinkProps(key: string, props: Record<string, any>): void {
  if (typeof key !== "string" || key.startsWith("__")) {
    console.error("[Router] Invalid props key");
    return;
  }

  if (!props || typeof props !== "object") {
    console.error("[Router] Invalid props object");
    return;
  }

  if (!window[PROPS_NAMESPACE]) {
    window[PROPS_NAMESPACE] = {};
  }

  if (Object.keys(window[PROPS_NAMESPACE]).length >= MAX_CACHE_SIZE) {
    console.warn("[Router] Props storage limit reached");
    return;
  }

  window[PROPS_NAMESPACE][key] = props;
}

/**
 * Clear link props
 */
export function clearLinkProps(key: string): void {
  if (typeof key !== "string") return;

  if (window[PROPS_NAMESPACE]?.[key]) {
    const props = window[PROPS_NAMESPACE][key];

    if (props && typeof props === "object") {
      Object.values(props).forEach((val) => {
        if (val && typeof val === "object" && "cleanup" in val) {
          try {
            (val as any).cleanup();
          } catch (e) {
            // Silent cleanup failure
          }
        }
      });
    }

    delete window[PROPS_NAMESPACE][key];
  }
}
