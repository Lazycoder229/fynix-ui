# Fynix Framework Documentation & Tutorial

> **Version**: 1.0.11 | **License**: MIT | **Author**: Resty Gonzales  
> **Target Audience**: Beginner → Advanced Developers

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Core Concepts](#2-core-concepts-deep-explanation)
3. [Installation & Setup](#3-installation--setup)
4. [Project Structure Explained](#4-project-structure-explained)
5. [Step-by-Step Tutorial](#5-step-by-step-tutorial-build-a-real-project)
6. [Intermediate Concepts](#6-intermediate-concepts)
7. [Advanced Concepts](#7-advanced-concepts)
8. [Design Patterns](#8-design-patterns-used-in-the-framework)
9. [Performance Considerations](#9-performance-considerations)
10. [Security Best Practices](#10-security-best-practices)
11. [Testing Strategy](#11-testing-strategy)
12. [Deployment Guide](#12-deployment-guide)
13. [Ecosystem & Tools](#13-ecosystem--tools)
14. [Common Mistakes](#14-common-mistakes)
15. [Summary & Learning Path](#15-summary--learning-path)

---

## 1. Introduction

### What Fynix Is

**Fynix** is a lightweight, reactive UI framework built in TypeScript. It provides a complete solution for building modern web applications with a Virtual DOM, fiber-based rendering architecture, reactive hooks, a file-based router, and Server-Side Rendering (SSR) — all in a single, zero-dependency package.

Fynix uses JSX (via a custom `.fnx` file extension) and a hook-based API that will feel familiar to React developers, but with a fundamentally different reactive model. Instead of re-running entire component functions on every state change, Fynix uses **fine-grained reactivity**: state objects notify only their subscribers, enabling surgical DOM updates.

### Why It Was Created

Modern frameworks often ship megabytes of JavaScript and require complex build pipelines. Fynix was created to answer:

- **Can a full-featured framework be lightweight?** — Fynix ships as a single ESM package with no runtime dependencies.
- **Can reactivity be simpler and more secure?** — Fynix's `nixState` model is push-based (state notifies subscribers), avoiding the re-render-everything pattern.
- **Can security be built-in, not bolted on?** — Fynix blocks `innerHTML`, validates URLs, prevents prototype pollution, and sanitizes text output by default.

### Problems It Solves

| Problem | Fynix Solution |
|---|---|
| Large bundle sizes | Zero runtime dependencies; tree-shakeable ESM exports |
| Complex build configs | Vite plugin handles `.fnx` files out of the box |
| XSS vulnerabilities | Built-in text sanitization, URL validation, dangerous property blocking |
| Memory leaks in SPAs | Automatic subscription cleanup, component unmount lifecycle |
| Boilerplate for forms/async | Dedicated hooks: `nixForm`, `nixAsync`, `nixAsyncQuery` |
| SEO for SPAs | Full SSR with `renderToHTML`, streaming, and Islands Architecture |

### Key Advantages

- **Reactive State Primitives** — `nixState` is a first-class reactive object with `.value` getter/setter, `.subscribe()`, and `.cleanup()`.
- **Fiber Architecture** — Work is broken into units; rendering can yield to the browser for responsiveness.
- **Priority Scheduling** — Updates are classified as `immediate`, `high`, `normal`, `low`, or `idle` and processed accordingly.
- **21 Built-in Hooks** — State, effects, computed, async, forms, debounce, intervals, lazy loading, local storage, and more.
- **File-Based Routing** — With nested layouts, route guards, SEO meta, preloading, and keep-alive.
- **SSR + Streaming + Islands** — Full server rendering pipeline with out-of-order delivery via Suspense.
- **Event Delegation** — All events are delegated to `document` for performance, using the `r-` prefix syntax.
- **Security by Default** — XSS protection, prototype pollution prevention, dangerous protocol blocking.

### When to Use It

- Single-Page Applications (SPAs)
- Server-Rendered applications needing hydration
- Projects requiring fine-grained reactivity without a large framework overhead
- Applications where security is a first-class concern
- Building component libraries with TypeScript

### When NOT to Use It

- Projects requiring a massive ecosystem of third-party UI component libraries (React/Vue have larger ecosystems)
- Teams unfamiliar with JSX who prefer template-based frameworks
- Legacy browsers (Fynix requires ES2020+, Node ≥ 18)
- Static content-only sites (a static site generator might be more appropriate)

---

## 2. Core Concepts (Deep Explanation)

### Architecture Style

Fynix follows a **component-based, reactive architecture** with three key layers:

```
┌──────────────────────────────────────────────────┐
│                   Application                     │
│  ┌──────────────────────────────────────────────┐ │
│  │             Component Layer                   │ │
│  │  Components → JSX → h() → VNode tree         │ │
│  └──────────────┬───────────────────────────────┘ │
│                 │                                  │
│  ┌──────────────▼───────────────────────────────┐ │
│  │            Reactive Layer                     │ │
│  │  nixState ──subscribe──► Component.rerender() │ │
│  │  nixComputed, nixStore, nixForm...            │ │
│  └──────────────┬───────────────────────────────┘ │
│                 │                                  │
│  ┌──────────────▼───────────────────────────────┐ │
│  │          Runtime / Reconciler                 │ │
│  │  Fiber Renderer → Scheduler → patch/diff     │ │
│  │  Event Delegation → DOM Creation             │ │
│  └──────────────┬───────────────────────────────┘ │
│                 │                                  │
│  ┌──────────────▼───────────────────────────────┐ │
│  │               DOM                             │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Core Philosophy

1. **Reactivity over Re-rendering** — Only the parts of the DOM that depend on changed state are updated.
2. **Security First** — The runtime blocks dangerous operations by default.
3. **Hooks, Not Classes** — All state and side effects are managed through function-based hooks.
4. **Convention over Configuration** — File-based routing, automatic cleanup, sensible defaults.

### Important Terminology

| Term | Definition |
|---|---|
| **VNode** | A plain JavaScript object representing a DOM element, text node, or component. Created by `h()`. |
| **nixState** | A reactive state container with `.value` getter/setter that triggers subscribers. |
| **Component** | A function that receives `props` and returns a `VNode`. |
| **Fiber** | A unit of work in the rendering pipeline. Fibers have parent/child/sibling pointers. |
| **Patch** | The process of comparing old and new VNode trees and applying minimal DOM changes. |
| **Hook** | A function (prefixed with `nix`) that manages state, side effects, or other logic within a component. |
| **Context** | The `ComponentContext` object that tracks hooks, subscriptions, and lifecycle for a component instance. |
| **Fragment** | A special VNode type (`Symbol("Fragment")`) that groups children without adding a wrapper DOM element. |
| **Event Delegation** | Events are registered on `document` and dispatched to the correct handler via element IDs (`r-click`, `r-input`, etc.). |

### Internal Mechanics

#### The `h()` Function (Hyperscript)

All JSX is compiled down to `h()` calls:

```tsx
// JSX
<div class="hello">World</div>

// Compiles to:
h("div", { class: "hello" }, "World")
```

`h()` creates a `VNode` object:

```typescript
interface VNode {
  type: VNodeType;      // "div", Fragment, or a ComponentFunction
  props: VNodeProps;    // { class: "hello", children: [...] }
  key: string | number | null;
  _domNode?: Node;      // Reference to the actual DOM node
  _rendered?: VNode;    // Rendered output for component VNodes
  _state?: ReactiveState; // Linked reactive state (for text nodes)
  _cleanup?: () => void;  // Cleanup function
}
```

#### Reactive State Model

When a component accesses `state.value`, the runtime tracks this access:

```
Component renders → accesses state.value
                  → state added to ctx._accessedStates
                  → subscription created: state.subscribe(rerender)
                  
State changes → state.value = newVal
             → subscribers notified
             → component re-renders
             → DOM patched efficiently
```

### Lifecycle

```
mount(App, "#root")
  │
  ├─ createDom(appVNode)
  │    ├─ beginComponent(vnode)   ← sets activeContext
  │    ├─ Component(props)        ← hooks run here
  │    ├─ endComponent()          ← subscribes to accessed states
  │    └─ DOM nodes created
  │
  ├─ State changes trigger rerender()
  │    ├─ beginComponent(vnode)
  │    ├─ Component(props)        ← hooks run again
  │    ├─ endComponent()
  │    └─ patch(parent, newVNode, oldVNode)
  │         ├─ Same type? → updateProps + patchChildren
  │         ├─ Different type? → replace DOM node
  │         └─ Key-based reconciliation for lists
  │
  └─ Unmount
       ├─ unmountVNode(vnode)
       ├─ Component cleanups run
       ├─ Subscriptions removed
       └─ Event handlers cleaned up
```

---

## 3. Installation & Setup

### System Requirements

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0
- **TypeScript** ≥ 5.0.0 (optional but recommended)
- **Vite** ^6.0.0 or ^7.0.0 (as build tool)

### Installation

```bash
npm install fynixui
```

### Project Setup with Vite

1. **Create a new Vite project:**

```bash
npm create vite@latest my-fynix-app -- --template vanilla-ts
cd my-fynix-app
npm install fynixui
```

2. **Configure `vite.config.ts`:**

```typescript
import { defineConfig } from "vite";
import fynixPlugin from "fynixui/plugins/vite-plugin-res";

export default defineConfig({
  plugins: [fynixPlugin()],
});
```

3. **Configure `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "fynixui",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

4. **Add type declarations** — Create `fynix-env.d.ts`:

```typescript
/// <reference types="fynixui/types/jsx" />
/// <reference types="fynixui/types/global" />

declare module "*.fnx" {
  const component: any;
  export default component;
}
```

### First Run

```bash
npm run dev
```

---

## 4. Project Structure Explained

```
core/
├── fynix/
│   └── index.ts           # Main entry point — re-exports everything
├── runtime.ts             # Core engine: VDOM, scheduler, fiber, mount, hydrate
├── context/
│   └── context.ts         # Component context tracking (activeContext)
├── hooks/
│   ├── nixState.ts        # Reactive state
│   ├── nixEffect.ts       # Side effects (+ nixEffectOnce, nixEffectAlways)
│   ├── nixComputed.ts     # Derived/computed state
│   ├── nixStore.ts        # Global reactive store
│   ├── nixAsync.ts        # Async data fetching with AbortController
│   ├── nixAsyncCache.ts   # Cached async data
│   ├── nixAsyncDebounce.ts# Debounced async operations
│   ├── nixAsyncQuery.ts   # Query-style async data
│   ├── nixForm.ts         # Form management with validation
│   ├── nixFormAsync.ts    # Async form submission
│   ├── nixLazy.ts         # Lazy loading + Suspense
│   ├── nixLazyAsync.ts    # Async lazy loading
│   ├── nixLazyFormAsync.ts# Combined lazy + form + async
│   ├── nixCallback.ts     # Memoized callbacks
│   ├── nixMemo.ts         # Memoized values
│   ├── nixRef.ts          # DOM references
│   ├── nixPrevious.ts     # Previous value tracking
│   ├── nixDebounce.ts     # Debounced values
│   ├── nixInterval.ts     # Interval management
│   ├── nixLocalStorage.ts # Persistent state in localStorage
│   └── nixFor.ts          # <For> list iteration component
├── router/
│   └── router.ts          # File-based router with nested routing, guards, SEO
├── ssr/
│   ├── render.ts          # renderToHTML() — full SSR
│   ├── stream.ts          # renderToStream() — streaming SSR with Suspense
│   ├── islands.ts         # Islands Architecture — selective hydration
│   ├── serverRouter.ts    # Server-side routing
│   └── static.ts          # Static site generation
├── plugins/
│   └── vite-plugin-res.ts # Vite plugin for .fnx file support
├── custom/
│   ├── index.ts           # Custom element exports
│   ├── button.ts          # Custom <Button> component
│   └── path.ts            # Custom <Path> component (SVG)
├── error/
│   └── errorOverlay.ts    # Development error overlay
├── types/
│   ├── jsx.d.ts           # JSX type definitions
│   ├── global.d.ts        # Global type augmentations
│   ├── fnx.d.ts           # .fnx file types
│   ├── index.d.ts         # Main type index
│   ├── fynix-ui.d.ts      # Framework UI types
│   └── vite-env.d.ts      # Vite environment types
├── scripts/
│   └── build-static.ts    # Static build script
├── tests/
│   ├── nixState.test.ts   # State hook tests
│   ├── nixEffect.test.ts  # Effect hook tests
│   ├── render.test.ts     # Render tests
│   └── router_nested.test.ts # Nested routing tests
├── build.js               # esbuild-based build script
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
└── tsconfig.build.json    # Build-specific TS config
```

### How Components Connect

```
fynix/index.ts ──exports──► runtime.ts ──imports──► context/context.ts
                                                  ├──► hooks/* (all 21 hooks)
                                                  ├──► router/router.ts
                                                  ├──► custom/* (Button, Path)
                                                  └──► error/errorOverlay.ts

hooks/* ──all import──► context/context.ts (for activeContext)
hooks/* ──some import──► nixState.ts (as primitive)

ssr/* ──imports──► runtime.ts (h, Fragment, TEXT, BOOLEAN_ATTRS)
ssr/stream.ts ──imports──► ssr/render.ts + hooks/nixLazy.ts (Suspense)
ssr/islands.ts ──imports──► runtime.ts (hydrate)
```

---

## 5. Step-by-Step Tutorial (Build a Real Project)

We'll build a **Task Manager** application to demonstrate Fynix's core features.

### Step 1: Project Setup

```bash
npm create vite@latest task-manager -- --template vanilla-ts
cd task-manager
npm install fynixui
```

Configure `vite.config.ts` and `tsconfig.json` as shown in [Section 3](#3-installation--setup).

Create `src/main.ts`:

```typescript
import { mount, h } from "fynixui";
import App from "./App";

mount(App, "#app");
```

### Step 2: Basic App Structure

Create `src/App.ts`:

```typescript
import { h } from "fynixui";
import { TaskList } from "./components/TaskList";

export function App() {
  return h("div", { class: "app" },
    h("h1", null, "📋 Task Manager"),
    h(TaskList, null)
  );
}
```

### Step 3: Core Feature — Reactive Task List

Create `src/components/TaskList.ts`:

```typescript
import { h, nixState, nixEffect, For, Fragment } from "fynixui";

interface Task {
  id: number;
  title: string;
  completed: boolean;
}

export function TaskList() {
  // Reactive state — components automatically re-render when .value changes
  const tasks = nixState<Task[]>([
    { id: 1, title: "Learn Fynix", completed: false },
    { id: 2, title: "Build an App", completed: false },
  ]);

  const newTaskTitle = nixState("");

  // WHY: nixState creates a reactive container. Accessing .value inside
  // a component registers a subscription. Setting .value notifies subscribers.

  function addTask() {
    if (!newTaskTitle.value.trim()) return;

    tasks.value = [
      ...tasks.value,
      {
        id: Date.now(),
        title: newTaskTitle.value,
        completed: false,
      },
    ];
    newTaskTitle.value = "";
  }

  function toggleTask(id: number) {
    tasks.value = tasks.value.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
  }

  function removeTask(id: number) {
    tasks.value = tasks.value.filter((t) => t.id !== id);
  }

  // Log task count whenever it changes
  nixEffect(() => {
    console.log(`Tasks: ${tasks.value.length}`);
  }, [tasks.value.length]);

  return h("div", { class: "task-list" },
    // Input section
    h("div", { class: "input-row" },
      h("input", {
        type: "text",
        placeholder: "New task...",
        value: newTaskTitle.value,
        "r-input": (e: any) => { newTaskTitle.value = e.target.value; },
        "r-keydown": (e: any) => { if (e.key === "Enter") addTask(); },
      }),
      h("button", { "r-click": addTask }, "Add Task")
    ),

    // Task list using <For> component
    h(For, { each: tasks },
      (task: Task, index: number) =>
        h("div", { key: task.id, class: `task ${task.completed ? "done" : ""}` },
          h("input", {
            type: "checkbox",
            checked: task.completed,
            "r-change": () => toggleTask(task.id),
          }),
          h("span", null, task.title),
          h("button", { "r-click": () => removeTask(task.id) }, "✕")
        )
    )
  );
}
```

**WHY**: The `<For>` component efficiently renders lists from reactive state. Using `r-click` instead of `onclick` leverages event delegation for better performance.

### Step 4: Routing (Complete Guide)

#### 4a. How the Router Works

The Fynix router is a **file-based, singleton router** created via `createFynix()`. It automatically discovers page components using Vite's `import.meta.glob`, maps file paths to URL routes, and mounts the matched component into a root DOM element.

**Architecture flow:**

```
createFynix()
  ├─ tryGlobPaths()              ← Discover all .fnx/.tsx/.jsx/.ts/.js files
  ├─ filePathToRoute(filePath)   ← Convert /src/tasks/[id]/view.fnx → /tasks/:id
  ├─ Build routes{} map          ← Static routes (exact match)
  ├─ Build dynamicRoutes[]       ← Dynamic routes (regex-based :param matching)
  ├─ Set up event listeners      ← click delegation + popstate
  └─ Return FynixRouter instance ← { mountRouter, navigate, replace, back, cleanup, ... }
```

#### 4b. Basic Setup — File-Based Routing

Fynix discovers routes from your `src/` directory automatically. Just create files:

```
src/
├── view.fnx          → /           (index route)
├── about/
│   └── view.fnx      → /about
├── tasks/
│   ├── view.fnx      → /tasks
│   └── [id]/
│       └── view.fnx  → /tasks/:id  (dynamic route)
└── admin/
    └── view.fnx      → /admin
```

**Initialize the router** in `src/main.ts`:

```typescript
import createFynix from "fynixui/router";

// createFynix() auto-discovers routes via import.meta.glob
const router = createFynix();

// Mount to a DOM element (default: "#app-root")
router.mountRouter("#app");
```

That's it! The router will:
1. Glob all `.fnx`, `.tsx`, `.jsx`, `.ts`, `.js` files under `/src/`
2. Convert file paths to route paths (removing `/view`, file extensions, converting `[param]` to `:param`)
3. Match the current `window.location.pathname` to a route
4. Mount the matched component via `mount(Component, "#app", props)`

#### 4c. Programmatic Navigation

```typescript
import createFynix, { setLinkProps, clearLinkProps } from "fynixui/router";

const router = createFynix();
router.mountRouter("#app");

// Navigate to a new page (pushState)
router.navigate("/tasks");

// Navigate with props (props are cached and passed to the component)
router.navigate("/tasks/42", { highlightNew: true });

// Replace current history entry (replaceState)
router.replace("/login");

// Go back
router.back();
```

**Security:** Navigation is rate-limited (100ms between navigations) and URLs are validated against the current origin. Cross-origin and suspicious URLs are blocked.

#### 4d. Link-Based Navigation

Use `data-fynix-link` on anchor tags for SPA navigation with event delegation:

```typescript
import { h } from "fynixui";
import { setLinkProps } from "fynixui/router";

function NavBar() {
  // Set props that will be passed to the target page
  setLinkProps("task-detail", { highlight: true, source: "navbar" });

  return h("nav", null,
    h("a", { href: "/", "data-fynix-link": true }, "Home"),
    h("a", { href: "/tasks", "data-fynix-link": true }, "Tasks"),
    h("a", {
      href: "/tasks/42",
      "data-fynix-link": true,
      "data-props-key": "task-detail",  // Links to setLinkProps key
    }, "Task #42")
  );
}
```

**How it works:** The router uses event delegation — a single `click` listener on `document` intercepts all `a[data-fynix-link]` clicks, prevents default behavior, and calls `navigate()` internally.

#### 4e. Dynamic Routes and Parameters

Dynamic segments use `[param]` in file names or `:param` in route patterns:

```
src/users/[userId]/view.fnx  →  /users/:userId
```

The matched parameters are passed to the component via `props.params`:

```typescript
function UserProfile(props: { params: { userId: string } }) {
  const { userId } = props.params;

  return h("div", null,
    h("h1", null, `User Profile: ${userId}`)
  );
}
```

**Security:** All dynamic parameters are HTML-escaped via `escapeHTML()` to prevent XSS through URL manipulation.

#### 4f. SEO Meta Tags

Route components can define `meta` for automatic SEO tag management:

```typescript
// Page component with SEO metadata
function AboutPage(props: any) {
  return h("div", null, h("h1", null, "About Us"));
}

// Attach meta to the component
AboutPage.meta = {
  title: "About Us",                              // <title> tag (max 60 chars)
  description: "Learn about our company",          // <meta name="description">
  keywords: "about, company, team",                // <meta name="keywords">
  ogTitle: "About Us - Fynix App",                 // <meta property="og:title">
  ogDescription: "Learn about our company",        // <meta property="og:description">
  ogImage: "https://example.com/og-about.png",     // <meta property="og:image">
  twitterCard: "summary_large_image",              // <meta name="twitter:card">
};

export default AboutPage;
```

Dynamic meta based on route params:

```typescript
TaskDetail.meta = (params: Record<string, string>) => ({
  title: `Task ${params.id}`,
  description: `Details for task ${params.id}`,
});
```

The router calls `updateMetaTags()` on every navigation, creating or updating meta elements in `<head>`. All values are sanitized and length-limited (title: 60 chars, meta: 300 chars).

#### 4g. Route Guards (Authentication / Authorization)

The `EnterpriseRouter` supports `canActivate` and `canDeactivate` guards:

```typescript
// Define routes with guards using EnterpriseRouter
const routeConfigs = {
  "/admin": {
    component: () => import("./pages/Admin"),
    guard: {
      canActivate: async (route: string, params: Record<string, string>) => {
        const user = await fetchCurrentUser();
        return user.role === "admin";  // Return false to block
      },
      canDeactivate: async (route: string) => {
        // Confirm before leaving (e.g., unsaved changes)
        return confirm("Leave this page?");
      },
      redirect: "/login",  // Redirect destination if guard returns false
    },
    meta: { title: "Admin Panel" },
    priority: "high",
    preload: true,
    prefetch: ["/admin/settings", "/admin/users"],  // Preload related routes
  },
};
```

#### 4h. Nested Routing with Layouts

Enable nested routes for layout persistence:

```typescript
import createFynix from "fynixui/router";

const router = createFynix();

// Define nested route tree
router.enableNestedRouting([
  {
    path: "dashboard",
    component: DashboardLayout,    // Parent layout
    layout: MainLayout,           // Wraps everything in MainLayout
    children: [
      {
        path: "overview",
        component: OverviewPage,
        keepAlive: true,           // Component state preserved across navigations
      },
      {
        path: "analytics",
        component: AnalyticsPage,
      },
      {
        path: "settings",
        component: SettingsPage,
        layout: SettingsLayout,    // Nested layout within dashboard
        children: [
          { path: "profile", component: ProfileSettings },
          { path: "security", component: SecuritySettings },
        ],
      },
    ],
  },
]);

router.mountRouter("#app");
```

**How it works:** The `LayoutRouter` class recursively matches URL segments to the route tree. For `/dashboard/settings/profile`:
1. Match `dashboard` → render `DashboardLayout` wrapped in `MainLayout`
2. Match `settings` → render `SettingsLayout` as child
3. Match `profile` → render `ProfileSettings` as leaf

`keepAlive: true` caches the rendered component so state is preserved when navigating away and back.

#### 4i. Route Preloading

Preload routes during idle time for instant navigation:

```typescript
const router = createFynix();

// Preload a specific route (loads component in background)
router.preloadRoute("/dashboard");

// Routes with prefetch arrays auto-preload related routes
// When /admin loads, /admin/settings and /admin/users are queued
```

Preloading uses `requestIdleCallback` (with `setTimeout` fallback) to avoid blocking the UI.

#### 4j. Router Cleanup and HMR

```typescript
// Full cleanup (removes all listeners, clears caches, resets singleton)
router.cleanup();

// Clear route caches only
router.clearCache();
```

The router has built-in HMR support via `import.meta.hot`:
- On HMR accept: re-renders the current route
- On HMR dispose: full cleanup + singleton reset

#### 4k. Complete Router API Reference

| Method / Property | Description |
|---|---|
| `createFynix()` | Factory function, returns `FynixRouter` singleton |
| `router.mountRouter(selector)` | Mount router to DOM element (default: `"#app-root"`) |
| `router.navigate(path, props?)` | Push new history entry and render route |
| `router.replace(path, props?)` | Replace current history entry |
| `router.back()` | Navigate back (`history.back()`) |
| `router.cleanup()` | Remove all listeners, clear caches, destroy instance |
| `router.clearCache()` | Clear route and layout caches only |
| `router.preloadRoute(path)` | Preload a route component during idle time |
| `router.enableNestedRouting(routes)` | Enable nested routing with layout tree |
| `router.routes` | Map of static route path → component |
| `router.dynamicRoutes` | Array of dynamic route patterns with regex |
| `setLinkProps(key, props)` | Set props for `data-props-key` link navigation |
| `clearLinkProps(key)` | Remove and cleanup stored link props |

#### 4l. Router Security Features

| Feature | Details |
|---|---|
| URL validation | Same-origin only, blocks `javascript:`, `vbscript:`, `data:`, `file:` |
| Path sanitization | Removes `..`, `.`, null bytes, normalizes slashes |
| Navigation rate-limiting | 100ms minimum between navigations (DoS prevention) |
| Props sanitization | Strips `__` prefixed keys, sanitizes strings, blocks functions |
| HTML escaping | All route params are escaped before passing to components |
| Meta tag sanitization | Content sanitized, length-limited, suspicious patterns blocked |
| Cache size limits | Max 50 cached props, LRU eviction with cleanup |
| Listener limits | Max 100 event listeners tracked |

### Step 5: State Management with Stores

```typescript
import { nixStore } from "fynixui/hooks/nixStore";

function UserProfile() {
  // Global reactive store — shared across components
  const user = nixStore("user", {
    name: "Guest",
    isLoggedIn: false,
  });

  return h("div", null,
    h("p", null, "Welcome, ", user.value.name),
    h("button", {
      "r-click": () => {
        user.value = { name: "Resty", isLoggedIn: true };
      },
    }, "Login")
  );
}
```

**WHY**: `nixStore` provides a global state container identified by a path string, enabling cross-component data sharing without prop drilling.

### Step 6: Async Data Fetching

```typescript
import { nixAsync } from "fynixui/hooks/nixAsync";
import { h } from "fynixui";

function TasksFromAPI() {
  const { data, loading, error, run } = nixAsync(
    async (signal) => {
      const res = await fetch("/api/tasks", { signal });
      return res.json();
    },
    { autoRun: true, timeout: 10000, retries: 2 }
  );

  if (loading.value) return h("p", null, "Loading...");
  if (error.value) return h("p", null, "Error: ", error.value.message);

  return h("ul", null,
    ...(data.value || []).map((task: any) =>
      h("li", { key: task.id }, task.title)
    )
  );
}
```

**WHY**: `nixAsync` provides AbortController support (preventing race conditions), configurable timeouts, and exponential backoff retries — all out of the box.

### Step 7: Form Validation

```typescript
import { nixForm } from "fynixui/hooks/nixForm";
import { h } from "fynixui";

function CreateTaskForm() {
  const form = nixForm(
    { title: "", priority: "medium" },
    {
      title: {
        required: true,
        minLength: 3,
        message: "Title must be at least 3 characters",
      },
    }
  );

  return h("form", {
    "r-submit": async (e: Event) => {
      e.preventDefault();
      await form.handleSubmit(async (values, signal) => {
        await fetch("/api/tasks", {
          method: "POST",
          body: JSON.stringify(values),
          signal,
        });
      });
    },
  },
    h("input", { ...form.getFieldProps("title"), placeholder: "Task title" }),
    h("p", { style: "color: red" }, form.errors.value.title || ""),
    h("button", { type: "submit", disabled: form.isSubmitting.value }, "Create")
  );
}
```

**WHY**: `nixForm` bundles values, errors, touched state, validation, and async submission with AbortController support in one hook.

### Step 8: Error Handling

Fynix provides built-in error handling:

```typescript
function SafeComponent() {
  // If this component throws, Fynix renders an error message
  // and shows a development error overlay in dev mode
  try {
    const data = riskyOperation();
    return h("div", null, data);
  } catch (err) {
    // Fynix sanitizes error messages to prevent XSS
    return h("div", { style: "color: red" }, "Something went wrong");
  }
}
```

The runtime automatically catches component render errors and displays them via `showErrorOverlay()` in development mode. Error messages are sanitized and truncated to 200 characters.

### Step 9: Testing

```typescript
// tests/TaskList.test.ts
import { describe, it, expect } from "vitest";
import { nixState } from "../hooks/nixState";

describe("Task State", () => {
  it("should add a task", () => {
    // nixState requires a component context, so we test the logic directly
    const tasks = [{ id: 1, title: "Test", completed: false }];
    const newTasks = [...tasks, { id: 2, title: "New", completed: false }];
    expect(newTasks).toHaveLength(2);
  });
});
```

Run tests:

```bash
npm test          # vitest run
npm run test:watch  # vitest (watch mode)
```

### Step 10: Production Build

```bash
npm run build
```

This runs:
1. `clean` — removes `dist/` and `dist-types/`
2. `type-check` — `tsc --noEmit`
3. `build:esbuild` — bundles via esbuild (`build.js`)
4. `build:types` — generates `.d.ts` files

---

## 6. Intermediate Concepts

### Reusability Patterns

**Custom Hooks**: Compose existing hooks into reusable logic:

```typescript
function useToggle(initial = false) {
  const state = nixState(initial);
  const toggle = () => { state.value = !state.value; };
  return { value: state, toggle };
}
```

**Computed State**: Derive values automatically:

```typescript
const todos = nixState([{ done: false }, { done: true }]);
const remaining = nixComputed(() =>
  todos.value.filter((t) => !t.done).length
);
// remaining.value auto-updates when todos changes
```

### Performance Optimization

- **`nixMemo`** — Memoize expensive computations:
  ```typescript
  const sorted = nixMemo(() => heavySort(items.value), [items.value]);
  ```

- **`nixCallback`** — Memoize event handlers:
  ```typescript
  const handleClick = nixCallback(() => { /* ... */ }, [dep]);
  ```

- **`nixDebounce`** — Debounce rapidly changing values:
  ```typescript
  const debouncedSearch = nixDebounce(searchTerm.value, 300);
  ```

### Code Splitting / Lazy Loading

```typescript
import { nixLazy, Suspense } from "fynixui";

const HeavyChart = nixLazy(() => import("./components/Chart"));

function Dashboard() {
  return h(Suspense, { fallback: h("p", null, "Loading chart...") },
    () => h(HeavyChart, { data: chartData })
  );
}
```

**WHY**: `nixLazy` wraps dynamic imports with caching. `Suspense` catches the thrown `Promise` and renders a fallback until the module loads.

### State Management

Fynix offers a hierarchy of state tools:

| Scope | Hook | Use Case |
|---|---|---|
| Component | `nixState` | Local UI state (counters, toggles, inputs) |
| Component | `nixComputed` | Derived values from other states |
| Global | `nixStore` | Shared state across components |
| Persistent | `nixLocalStorage` | State persisted in localStorage |
| Previous | `nixPrevious` | Track the previous value of a state |

### Middleware

The router supports route guards that act as middleware:

```typescript
const routes = {
  "/admin": {
    component: () => import("./pages/Admin"),
    guard: {
      canActivate: async (route, params) => {
        const user = await checkAuth();
        return user.isAdmin;
      },
      redirect: "/login", // Redirect if guard fails
    },
  },
};
```

---

## 7. Advanced Concepts

### Internal Architecture

#### Fiber Architecture

Fynix uses a **fiber-based rendering model** inspired by React Fiber. Each VNode can be represented as a `FynixFiber`:

```typescript
interface FynixFiber {
  type: string | symbol | ComponentFunction;
  props: any;
  key: string | number | null;
  child: FynixFiber | null;       // First child
  sibling: FynixFiber | null;     // Next sibling
  parent: FynixFiber | null;      // Parent fiber
  alternate: FynixFiber | null;   // Previous version (for diffing)
  effectTag: "PLACEMENT" | "UPDATE" | "DELETION" | null;
  updatePriority: Priority;
  _domNode?: Node;
}
```

The `FiberRenderer` class processes work in units:

```
performUnitOfWork(fiber)
  ├─ reconcileChildren()  ← diff children
  ├─ return child         ← depth-first
  └─ or sibling           ← breadth when done
```

#### Priority Scheduling

The `FynixScheduler` uses a priority queue:

- **`immediate`** — Processed synchronously (e.g., user input)
- **`high`** — Scheduled via `requestAnimationFrame` (~60fps)
- **`normal`/`low`** — Scheduled via `requestIdleCallback`
- **`idle`** — Processed when the browser is idle

```typescript
scheduler.schedule({
  type: "state",
  priority: "high",
  callback: () => rerender(),
}, "high");
```

The scheduler supports **time slicing**: if work exceeds the deadline, it yields to the browser and resumes in the next frame.

### Hierarchical Store

For enterprise-scale state management, Fynix provides `HierarchicalStore`:

```typescript
const store = useHierarchicalStore();

// Selector-based reads with caching
const count = store.select((state) => state.counter);

// Optimistic updates with rollback
const { commit, rollback } = store.optimisticUpdate("cart", newCart, () => {
  showToast("Failed to update cart");
});

try {
  await api.updateCart(newCart);
  commit();
} catch (e) {
  rollback();
}
```

### SSR Deep Dive (Complete Guide)

Fynix provides a complete server-rendering pipeline via 5 modules in the `ssr/` folder and a build tool in `scripts/`:

```
ssr/
├── render.ts        → renderToHTML()        Full static HTML generation
├── stream.ts        → renderToStream()      Streaming with Suspense out-of-order
├── islands.ts       → Island, hydrate       Partial hydration (Islands Architecture)
├── serverRouter.ts  → matchServerRoute()    Server-side route matching
└── static.ts        → generateStaticPage()  Full HTML document generation (SSG)

scripts/
└── build-static.ts  → CLI SSG build tool    Crawl pages, render, write to disk
```

---

#### 7a. `renderToHTML()` — Full HTML Rendering (`ssr/render.ts`)

Converts a VNode tree into an HTML string. This is the foundation of all SSR in Fynix.

**How it works internally:**

```
renderToHTML(vnode)
  ├─ null / false          → ""
  ├─ string / number       → escapeHTML(String(value))
  ├─ TEXT VNode            → escapeHTML(props.nodeValue)
  ├─ Fragment              → render all children, join
  ├─ Component function    → call Component(props), recurse on result
  │   └─ Island component  → render inner component + wrap with data-fynix-island div
  └─ HTML element string   → build <tag attrs>children</tag>
       ├─ Skip: children, key, on* event props
       ├─ Boolean attrs     → add attr name only (e.g., `disabled`)
       ├─ Self-closing tags → <br>, <img>, <input>, etc. (no closing tag)
       └─ Children          → recurse renderToHTML for each child
```

**Full Example — Express.js server:**

```typescript
// server.ts
import express from "express";
import { h } from "fynixui";
import { renderToHTML } from "fynixui/ssr/render";
import { matchServerRoute } from "fynixui/ssr/serverRouter";

const app = express();

// Import all page modules (server-side glob equivalent)
const routes = {
  "/src/pages/index.tsx": await import("./src/pages/index"),
  "/src/pages/about.tsx": await import("./src/pages/about"),
  "/src/pages/tasks/view.tsx": await import("./src/pages/tasks/view"),
  "/src/pages/tasks/[id]/view.tsx": await import("./src/pages/tasks/[id]/view"),
};

app.get("*", async (req, res) => {
  // 1. Match the request URL to a route
  const match = matchServerRoute(req.path, routes);

  if (!match) {
    res.status(404).send("<h1>404 Not Found</h1>");
    return;
  }

  // 2. Create the VNode tree with matched component + params
  const vnode = h(match.component, { params: match.params });

  // 3. Render to HTML string
  const html = await renderToHTML(vnode);

  // 4. Send complete HTML document
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Fynix SSR App</title>
      <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
      <div id="app">${html}</div>
      <script type="module" src="/client.js"></script>
    </body>
    </html>
  `);
});

app.listen(3000, () => console.log("SSR server running on port 3000"));
```

**Security:** All text content is HTML-escaped (`&`, `<`, `>`, `"`, `'`) to prevent XSS. Event handler attributes (`on*`) are stripped during SSR.

---

#### 7b. `matchServerRoute()` — Server-Side Route Matching (`ssr/serverRouter.ts`)

A lightweight version of the client router for use on the server:

```typescript
import { matchServerRoute } from "fynixui/ssr/serverRouter";

const routes = {
  "/src/pages/index.tsx": indexModule,
  "/src/pages/users/[id].tsx": userModule,
};

// Exact match
const homeMatch = matchServerRoute("/", routes);
// → { component: indexModule.default, params: {} }

// Dynamic match — supports both [id] and :id syntax
const userMatch = matchServerRoute("/users/42", routes);
// → { component: userModule.default, params: { id: "42" } }

// No match
const noMatch = matchServerRoute("/not-found", routes);
// → null
```

**Route resolution rules:**
1. Strip path prefix up to `/src`
2. Remove file extension (`.ts`, `.tsx`, `.js`, `.jsx`, `.fnx`)
3. Remove trailing `/view` and `/index`
4. Match segments: `[param]` and `:param` capture dynamic values
5. Component resolved from `module.default` or `module.App`

---

#### 7c. `renderToStream()` — Streaming SSR with Suspense (`ssr/stream.ts`)

Streaming renders HTML progressively, sending content to the client as it becomes available. Suspense boundaries enable **out-of-order delivery** — fallbacks are sent immediately while async content resolves in the background.

**Architecture:**

```
renderToStream(vnode, stream)
  └─ StreamingRenderer
       ├─ render(vnode) — recursive, writes chunks to stream
       │   ├─ Suspense VNode detected:
       │   │   ├─ Write <div id="fynix-s-0">
       │   │   ├─ Try rendering children()
       │   │   │   ├─ Success → write content inline
       │   │   │   └─ Throws Promise → write fallback HTML
       │   │   │       └─ Queue deferred task:
       │   │   │           await promise → render children()
       │   │   │           → write <template> + <script> to swap content
       │   │   └─ Write </div>
       │   ├─ Component function → call, recurse
       │   ├─ Fragment → render children sequentially
       │   └─ HTML element → write <tag>, children, </tag>
       └─ finalize() — await all pending Suspense, end stream
```

**Full Example — Streaming with Suspense:**

```typescript
// server-stream.ts
import { PassThrough } from "stream";
import express from "express";
import { h } from "fynixui";
import { renderToStream } from "fynixui/ssr/stream";
import { Suspense } from "fynixui/hooks/nixLazy";

const app = express();

// A component that fetches data asynchronously
function UserList() {
  // In SSR, this would throw a Promise that Suspense catches
  const users = fetchUsers(); // async operation
  return h("ul", null,
    ...users.map((u: any) => h("li", { key: u.id }, u.name))
  );
}

// App with Suspense boundary
function App() {
  return h("div", null,
    h("h1", null, "My App"),
    h("p", null, "This renders immediately!"),
    h(Suspense, { fallback: h("p", null, "Loading users...") },
      () => h(UserList, null)
    )
  );
}

app.get("/", async (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  // Write the HTML shell immediately
  res.write(`<!DOCTYPE html><html><head><title>Streaming SSR</title></head><body><div id="app">`);

  // Create a passthrough stream to pipe into response
  const stream = new PassThrough();
  stream.pipe(res, { end: false });

  // Render the app — fallbacks sent immediately, resolved content follows
  await renderToStream(h(App, {}), stream);

  // Close the HTML document
  res.write(`</div><script type="module" src="/client.js"></script></body></html>`);
  res.end();
});

app.listen(3000);
```

**What the client receives (in order):**

1. **Immediately:** HTML shell + `<h1>My App</h1>` + `<p>This renders immediately!</p>` + `<p>Loading users...</p>` (fallback)
2. **Later (after data loads):**
   ```html
   <template id="fynix-s-0-t"><ul><li>Alice</li><li>Bob</li></ul></template>
   <script>
     (function() {
       var template = document.getElementById("fynix-s-0-t");
       var dest = document.getElementById("fynix-s-0");
       if (template && dest) {
         dest.innerHTML = template.innerHTML;
         template.remove();
       }
     })();
   </script>
   ```

This swaps the fallback with the actual content — the user sees loading state instantly, then real content appears without a full page reload.

---

#### 7d. Islands Architecture (`ssr/islands.ts`)

Islands Architecture renders the full page as static HTML on the server, but only hydrates specific interactive components ("islands") on the client. This dramatically reduces client-side JavaScript.

**Concept:**

```
Static HTML (server-rendered, no JS needed)
  ┌────────────────────────────────┐
  │  Header (static)               │
  │  ┌─────────────────────┐       │
  │  │ 🏝️ Counter Island   │ ← hydrated with JS
  │  └─────────────────────┘       │
  │  Article text (static)         │
  │  ┌─────────────────────┐       │
  │  │ 🏝️ Comments Island  │ ← hydrated with JS
  │  └─────────────────────┘       │
  │  Footer (static)               │
  └────────────────────────────────┘
```

**Server-side — Mark components as islands:**

```typescript
// server.ts
import { h } from "fynixui";
import { Island } from "fynixui/ssr/islands";
import { renderToHTML } from "fynixui/ssr/render";

function Counter(props: { initial: number }) {
  // Interactive component — needs JS on client
  return h("button", null, `Count: ${props.initial}`);
}

function CommentsSection(props: { postId: string }) {
  return h("div", null, "Comments for post ", props.postId);
}

function BlogPost() {
  return h("article", null,
    h("h1", null, "My Blog Post"),                              // Static
    h("p", null, "This is server-rendered static content."),     // Static
    h(Island, {                                                   // 🏝️ Island
      component: Counter,
      name: "Counter",
      props: { initial: 0 },
    }),
    h("p", null, "More static content..."),                      // Static
    h(Island, {                                                   // 🏝️ Island
      component: CommentsSection,
      name: "Comments",
      props: { postId: "123" },
    }),
  );
}

const html = await renderToHTML(h(BlogPost, {}));
```

**Rendered HTML output:**

```html
<article>
  <h1>My Blog Post</h1>
  <p>This is server-rendered static content.</p>
  <div data-fynix-island="Counter" data-props="{&quot;initial&quot;:0}">
    <button>Count: 0</button>
  </div>
  <p>More static content...</p>
  <div data-fynix-island="Comments" data-props="{&quot;postId&quot;:&quot;123&quot;}">
    <div>Comments for post 123</div>
  </div>
</article>
```

**Client-side — Register and hydrate islands:**

```typescript
// client.ts
import { registerIsland, hydrateIslands } from "fynixui/ssr/islands";
import { Counter } from "./components/Counter";
import { CommentsSection } from "./components/Comments";

// Register components by their island name
registerIsland("Counter", Counter);
registerIsland("Comments", CommentsSection);

// Find all [data-fynix-island] elements and hydrate them
// - Parses data-props JSON
// - Calls hydrate(Component, element, props)
hydrateIslands();
```

**API Reference:**

| Function | Description |
|---|---|
| `Island(props)` | Server-side wrapper that marks a component as an island |
| `registerIsland(name, Component)` | Register a component for client-side hydration |
| `hydrateIslands()` | Find and hydrate all `[data-fynix-island]` elements on the page |
| `componentRegistry` | Map of island name → component function |

---

#### 7e. Static Site Generation (`ssr/static.ts`)

Generate full HTML documents from VNodes with a template:

```typescript
import { h } from "fynixui";
import { generateStaticPage } from "fynixui/ssr/static";

function HomePage() {
  return h("div", null,
    h("h1", null, "Welcome to My Site"),
    h("p", null, "This page was statically generated.")
  );
}

const html = await generateStaticPage(h(HomePage, {}), {
  // Required: HTML template with placeholder comments
  template: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <!--fynix-meta-->
      <title>Default Title</title>
      <!--fynix-styles-->
    </head>
    <body>
      <!--fynix-app-->
      <!--fynix-state-->
      <!--fynix-scripts-->
    </body>
    </html>
  `,
  title: "Welcome - My Site",                        // Replaces <title>
  meta: {                                             // Injects <meta> tags
    description: "A statically generated Fynix page",
    keywords: "fynix, ssg, static",
  },
  scripts: ["/js/app.js", "/js/vendor.js"],           // Injects <script type="module">
  styles: ["/css/main.css"],                          // Injects <link rel="stylesheet">
  initialState: { theme: "dark", user: null },       // Injects <script id="__FYNIX_DATA__">
});

// Write to file
fs.writeFileSync("dist/index.html", html);
```

**Template placeholders:**

| Placeholder | Replaced With |
|---|---|
| `<!--fynix-app-->` | Rendered component HTML |
| `<!--fynix-meta-->` | `<meta>` tags from `options.meta` |
| `<!--fynix-scripts-->` | `<script type="module" src="...">` from `options.scripts` |
| `<!--fynix-styles-->` | `<link rel="stylesheet" href="...">` from `options.styles` |
| `<!--fynix-state-->` | `<script id="__FYNIX_DATA__" type="application/json">` with serialized state |
| `<title>...</title>` | Replaced with `options.title` |

**Dynamic SSG with `getStaticPaths`:**

For dynamic routes like `/posts/[id]`, export a `getStaticPaths` function:

```typescript
// src/pages/posts/[id].tsx
import { h } from "fynixui";
import type { StaticPathsResult } from "fynixui/ssr/static";

export async function getStaticPaths(): Promise<StaticPathsResult> {
  const posts = await fetchAllPosts();
  return {
    paths: posts.map(post => ({ params: { id: String(post.id) } })),
    fallback: false,  // true = render on-demand at runtime
  };
}

// StaticPathsResult = {
//   paths: Array<{ params: Record<string, string> }>,
//   fallback?: boolean
// }

export default function PostPage(props: { id: string }) {
  return h("article", null, h("h1", null, `Post ${props.id}`));
}
```

---

#### 7f. SSG Build Tool (`scripts/build-static.ts`)

The SSG build tool is a CLI script that crawls your pages directory, renders each page to static HTML, and writes the output files.

**Usage:**

```bash
node scripts/build-static.js <pages-dir> <output-dir> <template-file>

# Example:
node scripts/build-static.js ./src/pages ./dist ./src/template.html
```

**What it does (step by step):**

```
1. Parse CLI args: pages-dir, output-dir, template-file
2. Clean & recreate output directory
3. Read HTML template file
4. Crawl pages directory (using fdir library)
5. For each .tsx/.jsx/.fnx/.ts/.js file:
   a. Convert file path → route path
      /src/pages/about.tsx → /about
      /src/pages/index.tsx → /
      /src/pages/posts/[id].tsx → /posts/[id]
   b. Dynamic import the module
   c. Get Component from module.default or module.App
   d. If module.getStaticPaths exists:
      - Call getStaticPaths()
      - For each { params }, render a separate HTML file
      - /posts/[id] + { id: "1" } → dist/posts/1.html
   e. Otherwise:
      - Render single HTML file
      - /about → dist/about.html
   f. Pass to generateStaticPage() with template
   g. Write HTML file to output directory
6. Done!
```

**Full Example — HTML Template:**

```html
<!-- src/template.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--fynix-meta-->
  <title>My Fynix Site</title>
  <!--fynix-styles-->
</head>
<body>
  <div id="app"><!--fynix-app--></div>
  <!--fynix-state-->
  <!--fynix-scripts-->
</body>
</html>
```

**Pages directory:**

```
src/pages/
├── index.tsx           → dist/index.html
├── about.tsx           → dist/about.html
├── contact.tsx         → dist/contact.html
└── posts/
    └── [id].tsx        → dist/posts/1.html, dist/posts/2.html, ...
                           (from getStaticPaths)
```

**Component with static meta:**

```typescript
// src/pages/about.tsx
import { h } from "fynixui";

function AboutPage() {
  return h("main", null,
    h("h1", null, "About Us"),
    h("p", null, "We build great things with Fynix.")
  );
}

// Static metadata used by the SSG tool
AboutPage.title = "About Us - My Site";
AboutPage.meta = {
  description: "Learn about our team and mission",
  keywords: "about, team, mission",
};

export default AboutPage;
```

**Run the build:**

```bash
node scripts/build-static.js ./src/pages ./dist ./src/template.html
```

**Output:**

```
[Fynix SSG] Building site...
[Fynix SSG] Pages directory: /app/src/pages
[Fynix SSG] Output directory: /app/dist
[Fynix SSG] Template file: /app/src/template.html
[Fynix SSG] Template loaded (450 characters)
[Fynix SSG] Found 4 potential files to crawl.
[Fynix SSG] Processing file: /app/src/pages/index.tsx -> Route: /
[Fynix SSG]   Writing file: /app/dist/index.html
[Fynix SSG] Processing file: /app/src/pages/about.tsx -> Route: /about
[Fynix SSG]   Writing file: /app/dist/about.html
[Fynix SSG] Processing file: /app/src/pages/posts/[id].tsx -> Route: /posts/[id]
[Fynix SSG]   Found getStaticPaths in /app/src/pages/posts/[id].tsx
[Fynix SSG]   Generating 3 dynamic routes...
[Fynix SSG]   -> Rendering Dynamic Route: /posts/1
[Fynix SSG]   Writing file: /app/dist/posts/1.html
[Fynix SSG]   -> Rendering Dynamic Route: /posts/2
[Fynix SSG]   Writing file: /app/dist/posts/2.html
[Fynix SSG]   -> Rendering Dynamic Route: /posts/3
[Fynix SSG]   Writing file: /app/dist/posts/3.html
[Fynix SSG] Build complete!
```

---

#### 7g. SSR Module API Reference

| Module | Export | Description |
|---|---|---|
| `ssr/render` | `renderToHTML(vnode)` | Async VNode → HTML string conversion |
| `ssr/stream` | `renderToStream(vnode, stream)` | Streaming render to Node.js Writable |
| `ssr/islands` | `Island(props)` | SSR component wrapper for islands |
| `ssr/islands` | `registerIsland(name, fn)` | Register client component for hydration |
| `ssr/islands` | `hydrateIslands()` | Find and hydrate all islands on page |
| `ssr/islands` | `componentRegistry` | Island name → component registry |
| `ssr/serverRouter` | `matchServerRoute(path, routes)` | Server-side URL → component matching |
| `ssr/static` | `generateStaticPage(vnode, opts)` | Full HTML document from VNode + template |
| `ssr/static` | `StaticPathsResult` | Type for `getStaticPaths()` return |
| `ssr/static` | `StaticPathsHook` | Type for `getStaticPaths` function |
| `scripts/build-static` | CLI tool | `node build-static.js <pages> <out> <template>` |

### Plugin/Extension System

Fynix provides a Vite plugin for `.fnx` file support:

```typescript
import fynixPlugin from "fynixui/plugins/vite-plugin-res";

export default defineConfig({
  plugins: [fynixPlugin()],
});
```

---

## 8. Design Patterns Used in the Framework

### Observer Pattern

`nixState` is the Observer pattern at its core:
- **Subject**: The reactive state object
- **Observers**: Subscriber functions registered via `.subscribe()`
- **Notification**: Setting `.value` notifies all subscribers

### Factory Pattern

`h()` is a factory that creates VNode objects based on the type argument (string for HTML elements, function for components, symbol for fragments).

### Singleton Pattern

- `FynixScheduler` — single global instance (`scheduler`)
- `FiberRenderer` — single global instance (`fiberRenderer`)
- `HierarchicalStore` — single global instance (`hierarchicalStore`)
- Router — singleton with `routerInstance`

### Dependency Injection via Context

`activeContext` acts as an ambient dependency injection container. Hooks access the current component's context without explicit parameters:

```typescript
export function nixState<T>(initial: T) {
  const ctx = activeContext; // DI — injected by the runtime
  // ...
}
```

### Middleware Pattern

Route guards follow the middleware pattern:
```
Request → canActivate? → Component rendered
                  ↓ no
            redirect → different route
```

### Strategy Pattern

The scheduler uses different strategies based on priority:
- High → `requestAnimationFrame`
- Normal → `requestIdleCallback`
- Fallback → `setTimeout`

---

## 9. Performance Considerations

### Bottlenecks to Watch

- **Large lists without keys** — Fynix will do index-based diffing, which is O(n). Use `key` props.
- **Deeply nested state objects** — Mutating nested properties won't trigger re-renders; always create new references.
- **Too many subscribers** — `nixState` caps at 1000, `nixStore` at 100. Monitor with `.getSubscriberCount()`.
- **Excessive effects** — `nixEffectAlways` runs every render; prefer `nixEffect` with targeted deps.

### Optimization Strategies

1. **Use `nixMemo`** for expensive computations
2. **Use `nixCallback`** to avoid creating new function references each render
3. **Use `nixLazy`** for code splitting heavy components
4. **Use `nixDebounce`** for search/filter inputs
5. **Use `key` props** on list items for efficient reconciliation
6. **Use `nixComputed`** instead of computing in the render function

### Time Slicing

The scheduler automatically time-slices work:
- High-priority work gets 16.67ms frames (60fps)
- Normal/low priority work uses `requestIdleCallback` with yielding
- The `shouldYield()` check ensures higher-priority work preempts lower-priority work

### Event Delegation

All `r-*` events are delegated to `document`, meaning only one listener per event type regardless of how many elements use that event. This provides O(1) event registration overhead.

---

## 10. Security Best Practices

### Built-in Protections

Fynix includes comprehensive security by default:

#### XSS Prevention

| Attack Vector | Protection |
|---|---|
| Text content | `sanitizeText()` escapes `<>'"&` |
| Attribute values | `sanitizeAttributeValue()` blocks `javascript:` and inline handlers |
| URL attributes | `href`, `src`, `action` validated against safe protocols |
| `innerHTML` | **Completely blocked** by the runtime |
| Inline event handlers (`onclick`) | **Blocked** — must use `r-click` delegation |
| Error messages | Sanitized and truncated to 200 characters |

#### Prototype Pollution Prevention

`nixState` and `nixStore` detect and strip `__proto__`, `constructor`, and `prototype` from state values:

```typescript
// This is safe — dangerous keys are automatically removed
state.value = { __proto__: malicious, data: "clean" };
// Result: state.value = { data: "clean" }
```

#### URL Validation

The runtime blocks these protocols: `javascript:`, `data:`, `vbscript:`, `file:`, `about:`

And only allows: `http:`, `https:`, `ftp:`, `ftps:`, `mailto:`, `tel:`, relative paths

### Additional Security Recommendations

1. **Set CSP headers**:
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
   ```
2. **Use Subresource Integrity (SRI)** for external scripts
3. **Validate inputs server-side** — client-side protection is defense-in-depth only
4. **Use `nixAsync` with timeouts** to prevent hung requests (default: 30s)

---

## 11. Testing Strategy

### Unit Testing

Fynix uses **Vitest** for testing. Test hooks and logic independently:

```typescript
import { describe, it, expect } from "vitest";

describe("nixState", () => {
  it("should track value changes", () => {
    // Note: nixState requires component context
    // Test the subscriber pattern directly
    let notified = false;
    const subscribers = new Set<() => void>();
    subscribers.add(() => { notified = true; });
    subscribers.forEach((fn) => fn());
    expect(notified).toBe(true);
  });
});
```

### Integration Testing

Test component rendering with the runtime:

```typescript
import { renderComponent, h } from "fynixui";

it("renders TaskList", () => {
  const result = renderComponent(TaskList, {});
  expect(result.type).toBe("div");
  expect(result.props.children).toBeDefined();
});
```

### Testing Commands

```bash
npm test                # Run all tests once
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Testing Tools Ecosystem

| Tool | Purpose |
|---|---|
| Vitest | Test runner |
| @vitest/coverage-v8 | Code coverage |
| TypeScript | Type checking (`npm run type-check`) |
| ESLint | Linting (`npm run lint`) |
| Prettier | Format checking (`npm run format:check`) |

---

## 12. Deployment Guide

### Build Process

```bash
npm run build
```

This executes:
1. **`clean`** — `rimraf dist dist-types`
2. **`type-check`** — `tsc --noEmit`
3. **`build:esbuild`** — `node build.js` (produces `dist/`)
4. **`build:types`** — `tsc --project tsconfig.build.json` (produces `dist-types/`)

Output:
```
dist/              # ESM JavaScript bundles
dist-types/        # TypeScript declaration files
```

### Environment Variables

Use Vite's `import.meta.env` for environment-specific configuration:

```
VITE_API_URL=https://api.example.com
VITE_APP_TITLE=My Fynix App
```

### Publishing to NPM

```bash
npm version patch   # or minor/major
npm publish         # runs prepublishOnly → build automatically
```

The `files` field in `package.json` ensures only `dist/`, `dist-types/`, `types/`, `README.md`, and `LICENSE` are published.

### Static Site Generation

```typescript
import { buildStatic } from "fynixui/scripts/build-static";
// Generates static HTML for all routes
```

---

## 13. Ecosystem & Tools

### Official Components

| Package | Description |
|---|---|
| `fynixui` | Core framework (hooks, runtime, router, SSR) |
| `fynixui/router` | File-based router with nested routing |
| `fynixui/plugins/vite-plugin-res` | Vite plugin for `.fnx` file support |

### Built-in Components

- **`<For>`** — Reactive list iteration
- **`<Suspense>`** — Async loading boundaries
- **`<Island>`** — Islands Architecture for partial hydration
- **`<Button>`** — Custom button component
- **`<Path>`** — SVG path component

### DevTools

- **Error Overlay** — Development-mode error overlay with styled error display
- **HMR (Hot Module Replacement)** — Automatic through Vite integration
- **Type Checking** — Full TypeScript support with comprehensive `.d.ts` files

---

## 14. Common Mistakes

### Beginner Mistakes

1. **Directly mutating state objects**
   ```typescript
   // ❌ Wrong — won't trigger re-render
   tasks.value.push(newTask);
   
   // ✅ Correct — creates new reference
   tasks.value = [...tasks.value, newTask];
   ```

2. **Using `onclick` instead of `r-click`**
   ```typescript
   // ❌ Blocked by Fynix's security system
   h("button", { onclick: handler }, "Click")
   
   // ✅ Uses event delegation
   h("button", { "r-click": handler }, "Click")
   ```

3. **Forgetting to return cleanup from effects**
   ```typescript
   // ❌ Memory leak — timer never cleared
   nixEffect(() => {
     setInterval(tick, 1000);
   }, []);
   
   // ✅ Cleanup prevents memory leak
   nixEffect(() => {
     const id = setInterval(tick, 1000);
     return () => clearInterval(id);
   }, []);
   ```

4. **Calling hooks outside components**
   ```typescript
   // ❌ Throws: "nixState() called outside component"
   const count = nixState(0);
   function App() { /* ... */ }
   
   // ✅ Hooks must be inside component functions
   function App() {
     const count = nixState(0);
   }
   ```

### Architectural Mistakes

5. **Overusing `nixStore` for local state** — Use `nixState` for component-local state. Reserve `nixStore` for truly global shared state.

6. **Not using keys in lists** — Without keys, Fynix falls back to index-based diffing. Use `key` props with stable, unique identifiers.

7. **Circular computed dependencies** — `nixComputed(() => a.value + b.value)` where `a` depends on the same computed will cause infinite loops.

### Performance Mistakes

8. **Using `nixEffectAlways` unnecessarily** — It runs on every render. Prefer `nixEffect` with targeted dependency arrays.

9. **Creating inline functions in render** — Each render creates a new function reference:
   ```typescript
   // ❌ New function every render
   h("button", { "r-click": () => doSomething() })
   
   // ✅ Use nixCallback
   const handler = nixCallback(() => doSomething(), []);
   h("button", { "r-click": handler })
   ```

10. **Not cleaning up async operations** — Always use the AbortController signal from `nixAsync`:
    ```typescript
    const { cleanup } = nixAsync(async (signal) => {
      return fetch(url, { signal });
    });
    // cleanup() is called automatically on unmount
    ```

---

## 15. Summary & Learning Path

### What You've Learned

1. **Fundamentals** — How `h()` creates VNodes, how `nixState` drives reactivity, how `mount()` renders to the DOM.
2. **Hooks** — The full hook system from state to async to forms.
3. **Routing** — File-based routing with guards, nested layouts, and SEO.
4. **SSR** — Full HTML rendering, streaming with Suspense, and Islands Architecture.
5. **Security** — Built-in XSS prevention, prototype pollution protection, URL validation.
6. **Architecture** — Fiber architecture, priority scheduling, event delegation.

### Recommended Learning Progression

```
📚 Beginner
├── 1. h() and VNodes
├── 2. nixState and reactivity
├── 3. nixEffect and lifecycle
├── 4. Event handling (r-click, r-input)
└── 5. Basic routing

📘 Intermediate
├── 6. nixComputed and nixMemo
├── 7. nixAsync for data fetching
├── 8. nixForm for forms
├── 9. Lazy loading and code splitting
└── 10. nixStore for global state

📕 Advanced
├── 11. SSR with renderToHTML
├── 12. Streaming SSR and Suspense
├── 13. Islands Architecture
├── 14. Custom hooks composition
└── 15. Fiber architecture internals
```

### Complete Hook Reference

| Hook | Purpose |
|---|---|
| `nixState(initial)` | Reactive local state |
| `nixEffect(fn, deps)` | Side effects with cleanup |
| `nixEffectOnce(fn)` | Run once on mount |
| `nixEffectAlways(fn)` | Run every render |
| `nixComputed(fn)` | Derived/computed values |
| `nixStore(path, initial)` | Global reactive store |
| `nixAsync(fn, opts)` | Async operations with abort/retry |
| `nixAsyncCached(fn, opts)` | Cached async operations |
| `nixAsyncDebounce(fn, opts)` | Debounced async operations |
| `nixAsyncQuery(fn, opts)` | Query-style async data |
| `nixForm(values, rules)` | Form management with validation |
| `nixFormAsync(...)` | Async form handling |
| `nixLazy(importFn)` | Lazy component loading |
| `nixLazyAsync(...)` | Async lazy loading |
| `nixLazyFormAsync(...)` | Combined lazy + form + async |
| `nixCallback(fn, deps)` | Memoized callback |
| `nixMemo(fn, deps)` | Memoized value |
| `nixRef(initial)` | DOM element reference |
| `nixPrevious(value)` | Previous value tracking |
| `nixDebounce(value, delay)` | Debounced value |
| `nixInterval(fn, delay)` | Managed interval |
| `nixLocalStorage(key, initial)` | Persistent localStorage state |

### Advanced Resources

- **Source Code**: The `runtime.ts` file (~2100 lines) is heavily commented and is the best reference for understanding the framework internals.
- **Type Definitions**: `types/jsx.d.ts` contains comprehensive JSX type definitions for IDE support.
- **Tests**: The `tests/` directory demonstrates how to test each module.

---

*Fynix Framework — © 2026 Resty Gonzales. MIT License.*
