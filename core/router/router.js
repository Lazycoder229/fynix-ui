import { mount } from "../runtime.js";

export function fynixCreate(customRoutes) {
  let rootSelector = "#app-root";
  let currentPath = null;
  const routes = customRoutes || {};
  const dynamicRoutes = [];

  console.log("[Router] Custom routes received:", customRoutes);

  // Skip auto-discovery if custom routes provided
  if (!customRoutes) {
    console.log("[Router] Current file path:", import.meta.url);

    //  Try multiple possible paths for src/View
    let modules = import.meta.glob("../../../src/View/**/*.{js,jsx,res}", {
      eager: true,
    });

    // If empty, try app/View paths
    if (Object.keys(modules).length === 0) {
      modules = import.meta.glob("../../../app/View/**/*.{js,jsx,res}", {
        eager: true,
      });
    }
    if (Object.keys(modules).length === 0) {
      modules = import.meta.glob("../../src/View/**/*.{js,jsx,res}", {
        eager: true,
      });
    }
    if (Object.keys(modules).length === 0) {
      modules = import.meta.glob("../../app/View/**/*.{js,jsx,res}", {
        eager: true,
      });
    }
    if (Object.keys(modules).length === 0) {
      modules = import.meta.glob("../app/View/**/*.{js,jsx,res}", {
        eager: true,
      });
    }
    if (Object.keys(modules).length === 0) {
      modules = import.meta.glob("/app/View/**/*.{js,jsx,res}", {
        eager: true,
      });
    }
    if (Object.keys(modules).length === 0) {
      modules = import.meta.glob("./app/View/**/*.{js,jsx,res}", {
        eager: true,
      });
    }

    console.log("[Router] Found modules:", Object.keys(modules));

    // Auto-map components to routes (Next.js convention)
    for (const [path, mod] of Object.entries(modules)) {
      let route = path
        .replace(/^.*\/View/, "")
        .replace(/\.(js|res)$/, "")
        .replace(/\/view$/, "")
        .replace(/\/index$/, "");

      if (!route || route === "/") {
        route = "/";
      }

      const hasDynamicSegment = /\[([^\]]+)\]/g.test(route);
      if (hasDynamicSegment) {
        const dynamicRoute = route.replace(/\[([^\]]+)\]/g, ":$1");
        dynamicRoutes.push({
          pattern: dynamicRoute,
          regex: new RegExp(
            "^" + dynamicRoute.replace(/:[^\/]+/g, "([^/]+)") + "$"
          ),
          component: mod.default || mod[Object.keys(mod)[0]],
          params: [...dynamicRoute.matchAll(/:([^\/]+)/g)].map((m) => m[1]),
        });
        console.log(`[Router] Dynamic route: ${route} → ${dynamicRoute}`);
        continue;
      }

      const component =
        mod.default || mod[Object.keys(mod)[0]] || Object.values(mod)[0];

      if (component) {
        routes[route || "/"] = component;
        console.log(`[Router] Static route: ${route || "/"}`);
      }
    }
  }

  console.log("[Router] Loaded routes:", {
    static: routes,
    dynamic: dynamicRoutes,
  });

  //  Match dynamic routes
  function matchDynamicRoute(path) {
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

  //  Deserialize plain values back to restState objects
  function deserializeProps(props) {
    const deserialized = {};

    for (const [key, value] of Object.entries(props)) {
      // Skip params
      if (key === "params") {
        deserialized[key] = value;
        continue;
      }

      // If it's already a restState object, keep it
      if (
        value &&
        typeof value === "object" &&
        (value._isNixState || value._isRestState)
      ) {
        deserialized[key] = value;
      }
      // If it's a plain value, convert to restState
      else if (value !== null && value !== undefined) {
        // Create a simple restState without component context
        const subscribers = new Set();
        let val = value;

        deserialized[key] = {
          get value() {
            return val;
          },
          set value(newVal) {
            if (newVal === val) return;
            val = newVal;
            subscribers.forEach((fn) => fn());
          },
          subscribe(fn) {
            subscribers.add(fn);
            return () => subscribers.delete(fn);
          },
          _isNixState: true,
        };
      } else {
        deserialized[key] = value;
      }
    }

    return deserialized;
  }

  //  Keep a global prop cache (to handle restState and other live objects)
  const __fynixPropsCache = window.__fynixPropsCache || new Map();
  window.__fynixPropsCache = __fynixPropsCache;

  //  Core route rendering
  function renderRoute() {
    const path = window.location.pathname;
    let Page = routes[path];
    let params = {};
    let routeProps = {};

    // Read from history state
    const state = window.history.state || {};
    let passedProps = {};

    // Try to match dynamic routes (e.g. /user/:id)
    if (!Page) {
      const dynamicMatch = matchDynamicRoute(path);
      if (dynamicMatch) {
        Page = dynamicMatch.component;
        params = dynamicMatch.params;
      }
    }

    //  Fallback if root element is missing
    const root = document.querySelector(rootSelector);
    if (!root) {
      console.error("[Router] Root element not found:", rootSelector);
      return;
    }

    //  404 fallback
    if (!Page) {
      root.innerHTML = "<h2>404 Not Found</h2>";
      return;
    }

    // Retrieve props — from cache if available, fallback to history props
    if (state.__fynixCacheKey && __fynixPropsCache.has(state.__fynixCacheKey)) {
      passedProps = __fynixPropsCache.get(state.__fynixCacheKey);
      console.log("[Router] Retrieved from cache:", passedProps);
    } else if (state.serializedProps) {
      //  Deserialize props back to restState objects
      passedProps = deserializeProps(state.serializedProps);
      console.log("[Router] Deserialized props:", passedProps);
    } else if (state.props) {
      passedProps = state.props;
      console.log("[Router] Retrieved from history:", passedProps);
    }

    //  Get any static props defined by the page
    if (Page.props) {
      routeProps = typeof Page.props === "function" ? Page.props() : Page.props;
    }

    console.log("[Router] Mounting page:", Page.name || "Anonymous Page", {
      routeProps,
      params,
      passedProps,
    });

    //  Store props globally for HMR access (AFTER getting all props)
    window.__lastRouteProps = {
      ...routeProps,
      ...passedProps,
      params,
    };

    console.log("[Router] Stored __lastRouteProps:", window.__lastRouteProps);

    try {
      mount(Page, rootSelector, false, window.__lastRouteProps);
    } catch (err) {
      console.error("[Router] Mount failed:", err);
      root.innerHTML = `<pre style="color:red;">Mount Error: ${err.message}</pre>`;
    }

    currentPath = path;
  }

  //  SPA navigation handler
  document.addEventListener("click", (e) => {
    const link = e.target.closest(
      "a[data-fynix-link], a[data-rest-link], a[href]"
    );
    if (!link) return;

    e.preventDefault();
    const path = new URL(link.href).pathname;
    if (path === currentPath) return;

    //  Get props from window using the key
    let props = {};
    const propsKey = link.getAttribute("data-props-key");
    if (propsKey && window[propsKey]) {
      props = window[propsKey];
    }

    console.log("[Router] Link clicked, props:", props);

    // Store props in cache
    const cacheKey = Date.now() + Math.random().toString(36).slice(2);
    __fynixPropsCache.set(cacheKey, props);

    // Serialize props for history state (in case of page reload)
    const serializableProps = {};
    for (const [key, val] of Object.entries(props)) {
      if (val && (val._isNixState || val._isRestState)) {
        serializableProps[key] = val.value; // Just the value
      } else {
        serializableProps[key] = val;
      }
    }

    window.history.pushState(
      {
        __restCacheKey: cacheKey,
        serializedProps: serializableProps,
      },
      "",
      path
    );

    renderRoute();
  });

  window.addEventListener("popstate", renderRoute);

  //  Navigation helpers
  const navigate = (path, props = {}) => {
    if (path !== currentPath) {
      const cacheKey = Date.now() + Math.random().toString(36).slice(2);
      __fynixPropsCache.set(cacheKey, props);
      __fynixCacheKey: cacheKey, __fynixPropsCache.set(cacheKey, props);
      window.history.pushState({ __fynixCacheKey: cacheKey }, "", path);
      renderRoute();
    }
  };

  const replace = (path, props = {}) => {
    const cacheKey = Date.now() + Math.random().toString(36).slice(2);
    __fynixPropsCache.set(cacheKey, props);
    window.history.replaceState({ __fynixCacheKey: cacheKey }, "", path);
    renderRoute();
  };

  const back = () => {
    window.history.back();
  };

  const mountRouter = (selector = "#app-root") => {
    rootSelector = selector;
    renderRoute();
  };

  //  HMR handling - re-render with cached props
  if (import.meta.hot) {
    import.meta.hot.accept(() => {
      console.log("[Router] HMR detected, re-rendering with cached props...");

      // Just call renderRoute to re-mount with existing __lastRouteProps
      renderRoute();
    });
  }

  return {
    mountRouter,
    routes,
    navigate,
    replace,
    back,
    dynamicRoutes,
  };
}

// Backward compatibility
export const restCreate = fynixCreate;

// Simple router helper - accepts glob results directly
export function createRouter(globModules, rootSelector = "#root") {
  const routes = {};

  // Convert glob results to routes
  for (const [path, mod] of Object.entries(globModules)) {
    const route = path.replace(/^\./, "").replace(/\/view\.js$/, "") || "/";
    routes[route] = mod.default;
  }

  let mounted = false;

  const render = () => {
    requestAnimationFrame(() => {
      const Page = routes[location.pathname] || routes["/"];
      const root = document.querySelector(rootSelector);

      if (!root) {
        console.error("[Router] Root element not found:", rootSelector);
        return;
      }

      if (Page) {
        root.innerHTML = "";
        requestAnimationFrame(() => {
          mount(Page, rootSelector);
          mounted = true;
        });
      } else {
        root.innerHTML = "<h2>404 Not Found</h2>";
      }
    });
  };

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (
      a?.href.startsWith(location.origin) &&
      routes[new URL(a.href).pathname]
    ) {
      e.preventDefault();
      history.pushState({}, "", a.href);
      render();
    }
  });

  addEventListener("popstate", render);

  return {
    render,
    routes,
  };
}
