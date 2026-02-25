# Fynix Rendering Architecture: SSR / SSG / CSR

A complete guide to making Fynix default to the right rendering mode per-route, with
a unified API that mirrors the best ideas from Next.js and Astro.

---

## The Core Idea: Rendering Modes as a Spectrum

```
SSG (build-time)  →  SSR (request-time)  →  CSR (client-time)
     fastest              flexible              interactive
```

Every route in Fynix should declare its rendering intent through **exports**.
The framework reads those exports and automatically picks the right pipeline.
No config files. No wrapping HOCs. Just exports.

---

## 1. The Rendering Decision Tree

When Fynix encounters a route module, it applies this logic (in priority order):

```
Does the module export getServerSideProps?  → SSR  (runs on every request)
Does the module export getStaticProps?      → SSG  (runs at build time)
Does the module export getStaticPaths?      → SSG  (dynamic SSG, multi-page)
None of the above?                          → SSG  (pure static, no data fetching)
Does the component have client: true?       → CSR  (skip SSR/SSG entirely)
```

This is already **partially** implemented across your `render.ts`, `build-static.ts`,
and `middleware.ts`. The missing piece is a **unified router** that applies this
decision tree automatically instead of having it split across files.

---

## 2. What Needs to Change in Each File

### 2.1 `discovery.ts` — Add Rendering Mode to RouteInfo

Add a `renderMode` field so the rest of the system doesn't have to re-inspect modules:

```typescript
export type RenderMode = "ssr" | "ssg" | "csr";

export interface RouteInfo {
  path: string;
  filePath: string;
  isDynamic: boolean;
  params: string[];
  renderMode?: RenderMode; // populated after module inspection
}
```

Add a helper that inspects a loaded module and returns its mode:

```typescript
export function detectRenderMode(module: any): RenderMode {
  // Explicit override always wins
  if (module.renderMode === "csr") return "csr";
  if (module.default?.clientOnly === true) return "csr";

  if (module.getServerSideProps) return "ssr";
  if (module.getStaticProps || module.getStaticPaths) return "ssg";

  // Default: SSG (fastest, no runtime server needed)
  return "ssg";
}
```

**Why SSG as the default?** Static pages can be served from a CDN with zero server
overhead. Any page that doesn't need fresh data should be static. This is the
same philosophy as Astro and Next.js App Router.

---

### 2.2 `middleware.ts` — The SSR Entry Point

Your current middleware always SSRs every matched route. It needs to:

1. Detect the mode via `detectRenderMode`.
2. Serve pre-built HTML for SSG routes (from an output dir) instead of re-rendering.
3. Skip SSR entirely for CSR routes and serve a shell HTML.

```typescript
import { detectRenderMode } from "./discovery";

export function createFynixMiddleware(options: SSRMiddlewareOptions) {
  return async (req: any, res: any, next: () => void) => {
    const url = req.url || "/";
    const match = await matchServerRoute(url, options.pagesDir);

    if (!match) return next();

    const mode = detectRenderMode(match.module);

    // ── CSR route: send empty shell, client does everything ──────────────
    if (mode === "csr") {
      res.setHeader("Content-Type", "text/html");
      return res.end(options.template); // bare HTML, no SSR content
    }

    // ── SSG route: try to serve pre-built file first ──────────────────────
    if (mode === "ssg" && options.outputDir) {
      const staticFile = resolveStaticFile(url, options.outputDir);
      if (staticFile) {
        res.setHeader("Content-Type", "text/html");
        return res.end(fs.readFileSync(staticFile, "utf8"));
      }
      // Fall through to on-demand SSG render (ISR-style)
    }

    // ── SSR (or on-demand SSG fallback) ──────────────────────────────────
    try {
      const { html: contentHTML, props } = await renderPage(match.module, {
        params: match.params, req, res,
      });

      const fullHTML = await generateStaticPage({
        template: options.template,
        title: match.module.title ?? match.module.default?.title ?? "Fynix App",
        meta: match.module.meta ?? match.module.default?.meta ?? {},
        initialState: props,
        contentHTML,
      });

      // Cache SSG responses to disk for next request
      if (mode === "ssg" && options.outputDir) {
        saveStaticFile(url, options.outputDir, fullHTML); // async, fire-and-forget
      }

      res.setHeader("Content-Type", "text/html");
      res.end(fullHTML);
    } catch (err) {
      console.error(`[Fynix SSR] Error rendering ${url}:`, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  };
}
```

---

### 2.3 `render.ts` — Add CSR Awareness

`renderPage` currently always renders. Add a guard:

```typescript
export async function renderPage(
  module: any,
  context: { params: Record<string, any>; req?: any; res?: any }
): Promise<{ html: string; props: Record<string, any>; mode: RenderMode }> {
  const mode = detectRenderMode(module);

  // CSR: render nothing server-side, return empty content
  if (mode === "csr") {
    return { html: "<!--fynix-csr-->", props: {}, mode };
  }

  const Component = module.default || module.App;
  let props = { ...context.params };

  if (module.getServerSideProps) {
    const result = await module.getServerSideProps(context);
    if (result?.props) props = { ...props, ...result.props };
  } else if (module.getStaticProps) {
    const result = await module.getStaticProps(context);
    if (result?.props) props = { ...props, ...result.props };
  }

  const vnode = h(Component, props);
  const html = await renderToHTML(vnode);

  return { html, props, mode };
}
```

---

### 2.4 `build-static.ts` — Respect Render Modes at Build Time

The build tool should **skip SSR routes** (those will be rendered at runtime)
and **skip CSR routes** (those will be rendered in the browser):

```typescript
for (const routeInfo of routes) {
  const module = await import(fileUrl);
  const mode = detectRenderMode(module);

  if (mode === "ssr") {
    console.log(`[Fynix SSG] Skipping SSR route (runtime): ${routeInfo.path}`);
    // Optionally emit a manifest entry so the server knows this route exists
    continue;
  }

  if (mode === "csr") {
    console.log(`[Fynix SSG] Skipping CSR route (client-only): ${routeInfo.path}`);
    // Write a shell HTML with no content
    await writeShellHTML(routeInfo.path, outputDir, template);
    continue;
  }

  // mode === "ssg" — render to static HTML
  if (routeInfo.isDynamic) {
    if (!module.getStaticPaths) {
      console.warn(`[Fynix SSG] Dynamic route missing getStaticPaths: ${routeInfo.path}`);
      continue;
    }
    const { paths } = await module.getStaticPaths();
    for (const { params } of paths) {
      let dynamicUrl = routeInfo.path;
      for (const [key, value] of Object.entries(params)) {
        dynamicUrl = dynamicUrl.replace(`[${key}]`, String(value));
      }
      await renderAndSave(module, params, dynamicUrl, outputDir, template);
    }
  } else {
    await renderAndSave(module, {}, routeInfo.path, outputDir, template);
  }
}
```

Also fix the double-invocation bug at the bottom of `build-static.ts` — `build()` is called twice:

```typescript
// ❌ Current (broken) — build() called twice
build().catch(err => { ... });
build().catch(err => { ... }); // DELETE THIS LINE

// ✅ Correct
build().catch(err => {
  console.error("[Fynix SSG] Fatal Error:", err);
  process.exit(1);
});
```

---

### 2.5 `static.ts` — ISR (Incremental Static Regeneration) Support

Add `revalidate` support so SSG pages can opt into background re-rendering:

```typescript
interface StaticPageOptions {
  template: string;
  title?: string;
  meta?: Record<string, string>;
  scripts?: string[];
  styles?: string[];
  initialState?: any;
  revalidate?: number | false; // seconds before stale, false = forever
  generatedAt?: number;        // timestamp for cache-busting
}
```

In the middleware, check if a cached SSG page has expired:

```typescript
function isCacheStale(filePath: string, revalidate: number): boolean {
  const stat = fs.statSync(filePath);
  const ageSeconds = (Date.now() - stat.mtimeMs) / 1000;
  return ageSeconds > revalidate;
}
```

---

### 2.6 `runtime.ts` — Client-Side Hydration Entry Point

The client needs to read the render mode from the injected state and decide
whether to fully hydrate or just mount fresh:

```typescript
// In the client entry (e.g. src/main.ts)
const stateEl = document.getElementById("__FYNIX_DATA__");
const initialState = stateEl ? JSON.parse(stateEl.textContent || "{}") : {};
const renderMode = initialState.__renderMode || "ssg";

if (renderMode === "csr") {
  // Full mount — server sent nothing, client does everything
  mount(App, "#app-root", initialState);
} else {
  // Hydrate — server sent HTML, client takes over
  hydrate(App, "#app-root", initialState);
}
```

Inject `__renderMode` in `generateStaticPage`:

```typescript
if (options.initialState) {
  const stateWithMode = {
    ...options.initialState,
    __renderMode: options.renderMode ?? "ssg",
  };
  const stateScript = `<script id="__FYNIX_DATA__" type="application/json">${JSON.stringify(stateWithMode)}</script>`;
  html = html.replace("<!--fynix-state-->", stateScript);
}
```

---

### 2.7 `islands.ts` — Already Works, Needs One Wire-Up

Islands are already implemented correctly. The only missing step is calling
`hydrateIslands()` from the client entry after the main hydration:

```typescript
// src/main.ts
import { hydrateIslands, registerIsland } from "fynixui/islands";
import { Counter } from "./components/Counter";

registerIsland("Counter", Counter);

hydrate(App, "#app-root", initialState);
hydrateIslands(); // activates all [data-fynix-island] elements
```

---

## 3. The Page Author API

This is what a developer writing a Fynix page actually sees:

### Pure Static (SSG — default)

```typescript
// pages/about.tsx
export default function About() {
  return <h1>About Us</h1>;
}
// No exports → SSG at build time, served from CDN forever
```

### Static with Data (SSG + getStaticProps)

```typescript
// pages/blog/[slug].tsx
export async function getStaticPaths() {
  const posts = await db.posts.findAll();
  return {
    paths: posts.map(p => ({ params: { slug: p.slug } })),
  };
}

export async function getStaticProps({ params }) {
  const post = await db.posts.findBySlug(params.slug);
  return { props: { post }, revalidate: 60 }; // re-build after 60s
}

export default function BlogPost({ post }) {
  return <article>{post.content}</article>;
}
```

### Server-Rendered (SSR + getServerSideProps)

```typescript
// pages/dashboard.tsx
export async function getServerSideProps({ req }) {
  const user = await auth.verify(req.headers.cookie);
  if (!user) return { redirect: "/login" };
  return { props: { user } };
}

export default function Dashboard({ user }) {
  return <h1>Welcome, {user.name}</h1>;
}
```

### Client-Only (CSR)

```typescript
// pages/editor.tsx
export const renderMode = "csr"; // explicit opt-out of SSR

export default function Editor() {
  // Can safely use browser APIs here — this never runs on the server
  const [content, setContent] = nixState("");
  return <textarea value={content} r-input={e => setContent(e.target.value)} />;
}
```

### Island in an SSG Page

```typescript
// pages/home.tsx
import { Island } from "fynixui/islands";
import { Counter } from "../components/Counter";

export async function getStaticProps() {
  return { props: { heroText: "Welcome to Fynix" } };
}

export default function Home({ heroText }) {
  return (
    <div>
      <h1>{heroText}</h1>          {/* static — rendered at build time */}
      <Island                       {/* interactive — hydrated in browser */}
        component={Counter}
        name="Counter"
        props={{ initialCount: 0 }}
      />
    </div>
  );
}
```

---

## 4. File to Create: `ssr/modeResolver.ts`

This is the single source of truth for rendering decisions. Extract it from
the scattered logic above into one file:

```typescript
// ssr/modeResolver.ts
export type RenderMode = "ssr" | "ssg" | "csr";

export function detectRenderMode(module: any): RenderMode {
  if (!module) return "ssg";

  // Explicit declaration always wins
  if (module.renderMode === "csr") return "csr";
  if (module.renderMode === "ssr") return "ssr";
  if (module.renderMode === "ssg") return "ssg";
  if (module.default?.clientOnly === true) return "csr";

  // Implicit from exports
  if (module.getServerSideProps) return "ssr";
  if (module.getStaticProps)     return "ssg";
  if (module.getStaticPaths)     return "ssg";

  // Safe default: pre-render everything at build time
  return "ssg";
}

export function shouldPrerender(module: any): boolean {
  return detectRenderMode(module) !== "ssr";
}

export function getRevalidateSeconds(module: any): number | false {
  // getStaticProps can return { revalidate: N }
  // We store it on the module after first load
  return module.__revalidate ?? false;
}
```

---

## 5. Priority Order of All Changes

Apply in this order to avoid breaking your existing code:

| Step | File | Change |
|------|------|--------|
| 1 | Create `ssr/modeResolver.ts` | Central mode detection |
| 2 | `ssr/discovery.ts` | Add `renderMode` to `RouteInfo` |
| 3 | `ssr/render.ts` | Add mode guard, return mode in result |
| 4 | `ssr/static.ts` | Add `revalidate` + `renderMode` to options |
| 5 | `ssr/middleware.ts` | Route by mode: CSR shell / SSG cache / SSR |
| 6 | `build-static.ts` | Skip SSR/CSR routes, fix double `build()` call |
| 7 | `src/main.ts` (client entry) | Read `__renderMode`, call `mount` or `hydrate` |
| 8 | `islands.ts` | Call `hydrateIslands()` after hydration |

---

## 6. Common Pitfalls to Avoid

**1. SSR modules importing browser APIs**
Any module with `getServerSideProps` runs in Node. Imports like `localStorage`
will crash. Guard with `if (typeof window !== "undefined")` or move browser
code into island components.

**2. SSG + ISR cache invalidation**
When `revalidate` is set, the middleware needs to check file mtime before
serving the cached file. Don't skip this — stale SSG + no revalidation =
users seeing old data forever.

**3. CSR pages still need an HTML shell**
`mode === "csr"` routes should still write an `index.html` with the `<script>`
tags and `<div id="app-root">`. The difference is there's no server-rendered
content inside that div.

**4. Islands hydration race**
Call `hydrateIslands()` *after* the main app hydrates, not before. The main
hydration sets up the DOM structure that islands attach to.

**5. The double `build()` bug**
`build-static.ts` currently calls `build()` twice at the bottom. The second
call re-processes all routes, doubles your build time, and can cause file-write
conflicts on concurrent builds. Delete the duplicate.

**6. Dynamic SSG routes need `getStaticPaths`**
If a route has `[param]` in its path and exports only `getStaticProps` (no
`getStaticPaths`), the build tool can't know which URLs to generate. Always
export both for dynamic SSG routes.

---

## 7. Recommended Default Behavior Per Route Pattern

| Route Pattern | Recommended Mode | Reason |
|---------------|-----------------|--------|
| `/` (homepage) | SSG | Almost never needs per-request data |
| `/about`, `/pricing` | SSG | Pure content, no auth |
| `/blog/[slug]` | SSG + getStaticPaths | Pre-render all known posts |
| `/dashboard` | SSR | Requires auth cookie inspection |
| `/api/*` | SSR (or separate handler) | Always dynamic |
| `/editor`, `/canvas` | CSR | Needs heavy browser APIs |
| `/search` | SSR or CSR | Depends on whether results are indexable |
| `/product/[id]` | SSG + revalidate: 60 | Mostly static, prices may change |