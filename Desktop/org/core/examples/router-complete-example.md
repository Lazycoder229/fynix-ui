# Fynix Router — Complete Example (TSX)

A personal blog built with Fynix, showcasing every router feature in one clean project.

---

## Project Structure

```
src/
├── main.tsx                          # Router setup
├── shared/
│   └── Nav.tsx                       # Shared navigation
├── pages/
│   ├── view.tsx                      # /                Home (bio + recent posts)
│   ├── blog/
│   │   ├── view.tsx                  # /blog            All posts
│   │   └── [slug]/
│   │       └── view.tsx              # /blog/:slug      Single post (dynamic route)
│   ├── portfolio/
│   │   └── view.tsx                  # /portfolio       Projects
│   ├── login/
│   │   └── view.tsx                  # /login           Login
│   └── dashboard/
│       ├── view.tsx                  # Layout — persistent sidebar
│       ├── drafts/
│       │   └── view.tsx              # /dashboard/drafts    (keepAlive)
│       ├── stats/
│       │   └── view.tsx              # /dashboard/stats
│       └── settings/
│           ├── view.tsx              # Sub-layout — persistent tabs
│           ├── profile/
│           │   └── view.tsx          # /dashboard/settings/profile
│           └── appearance/
│               └── view.tsx          # /dashboard/settings/appearance
└── styles.css
```

**File-based routing** — create a file, get a route. Folder name `[slug]` becomes dynamic param `:slug`.

> **⚠️ Important: `createFynix()` is a singleton.**
> The router is created once in `main.tsx`. When other components call `createFynix()`,
> they get back the **same instance** — not a new router. It works like React's `useRouter()`:
> call it anywhere you need navigation, there's only ever one router underneath.
>
> ```
> main.tsx:       const router = createFynix();  // ← creates the router (1st call)
> Nav.tsx:        const router = createFynix();  // ← same instance returned
> BlogPost.tsx:   const router = createFynix();  // ← same instance returned
> LoginPage.tsx:  const router = createFynix();  // ← same instance returned
> ```

---

## 1. Router Setup — `src/main.tsx`

```tsx
import createFynix from "fynixui/router";

// First call — this CREATES the singleton router instance
const router = createFynix();

// ── Nested routing for dashboard ──
router.enableNestedRouting([
  {
    path: "dashboard",
    component: () => import("./pages/dashboard/view").then(m => m.default),
    guard: {
      // 🛡️ Route guard — blocks unauthenticated users
      canActivate: async () => {
        return localStorage.getItem("auth") === "true";
      },
      redirect: "/login",  // redirect here if guard fails
    },
    children: [
      {
        path: "drafts",
        component: () => import("./pages/dashboard/drafts/view").then(m => m.default),
        keepAlive: true,  // 💾 draft editor state survives navigation
      },
      {
        path: "stats",
        component: () => import("./pages/dashboard/stats/view").then(m => m.default),
      },
      {
        path: "settings",
        component: () => import("./pages/dashboard/settings/view").then(m => m.default),
        children: [
          {
            path: "profile",
            component: () => import("./pages/dashboard/settings/profile/view").then(m => m.default),
          },
          {
            path: "appearance",
            component: () => import("./pages/dashboard/settings/appearance/view").then(m => m.default),
          },
        ],
      },
    ],
  },
]);

// ── Preload likely routes in background ──
router.preloadRoute("/blog");
router.preloadRoute("/portfolio");

// ── Mount ──
router.mountRouter("#app");
```

**Features shown:** `enableNestedRouting`, `guard` with `canActivate` + `redirect`, `keepAlive`, `preloadRoute`, `mountRouter`.

---

## 2. Navigation — `src/shared/Nav.tsx`

```tsx
import createFynix, { setLinkProps } from "fynixui/router";

export function Nav() {
  const router = createFynix();  // singleton — same instance from main.tsx

  return (
    <header class="nav">
      {/* SPA link — data-fynix-link prevents full reload */}
      <a href="/" data-fynix-link class="nav-logo">resty.dev</a>

      <nav class="nav-links">
        <a href="/blog" data-fynix-link>Blog</a>
        <a href="/portfolio" data-fynix-link>Portfolio</a>

        {/* Link with pre-set props — the target page receives { featured: true } */}
        <a
          href="/blog/building-fynix"
          data-fynix-link
          data-props-key="featured"
          r-mouseenter={() => setLinkProps("featured", { featured: true })}
        >
          Featured ✦
        </a>

        {/* Programmatic navigation */}
        <button
          class="nav-btn"
          r-click={() => router.navigate("/dashboard/drafts")}
        >
          Dashboard
        </button>
      </nav>
    </header>
  );
}
```

**Features shown:** `data-fynix-link` (SPA navigation), `setLinkProps` + `data-props-key` (link props), `router.navigate()` (programmatic navigation).

---

## 3. Home Page — `src/pages/view.tsx`

```tsx
import createFynix from "fynixui/router";
import { Nav } from "../shared/Nav";

const recentPosts = [
  { slug: "building-fynix", title: "Building Fynix", date: "Feb 24, 2026" },
  { slug: "islands-architecture", title: "Islands Architecture Deep Dive", date: "Feb 20, 2026" },
  { slug: "ssr-streaming", title: "SSR Streaming with Suspense", date: "Feb 15, 2026" },
];

export default function HomePage() {
  const router = createFynix();

  return (
    <div class="page">
      <Nav />

      <section class="hero">
        <h1>Hey, I'm Resty 👋</h1>
        <p>
          I build web frameworks and write about modern frontend architecture.
          Currently working on <strong>Fynix</strong> — a reactive UI framework
          with fine-grained updates, SSR, and Islands Architecture.
        </p>
      </section>

      <section class="section">
        <h2>Recent Posts</h2>
        {recentPosts.map((post) => (
          <a key={post.slug} href={`/blog/${post.slug}`} data-fynix-link class="post-row">
            <span class="post-title">{post.title}</span>
            <span class="post-date">{post.date}</span>
          </a>
        ))}

        {/* Two ways to navigate: */}
        <div class="btn-row">
          {/* 1. SPA link */}
          <a href="/blog" data-fynix-link class="btn-link">
            View all posts →
          </a>
          {/* 2. Programmatic — with props */}
          <button
            class="btn-outline"
            r-click={() => router.navigate("/blog", { scrollTo: "latest" })}
          >
            Jump to latest
          </button>
        </div>
      </section>
    </div>
  );
}

// Static SEO meta — auto-injected into <title> and <meta> tags
HomePage.meta = {
  title: "Resty — Frontend Developer & Writer",
  description: "Personal blog about modern web development, Fynix framework, and reactive UI.",
  ogTitle: "Resty's Blog",
};
```

**Features shown:** `data-fynix-link`, `router.navigate()` with props, static `Component.meta` for SEO.

---

## 4. Blog Listing — `src/pages/blog/view.tsx`

```tsx
import { nixState } from "fynixui";
import { Nav } from "../../shared/Nav";

const allPosts = [
  { slug: "building-fynix", title: "Building Fynix", date: "Feb 24, 2026", tag: "framework" },
  { slug: "islands-architecture", title: "Islands Architecture Deep Dive", date: "Feb 20, 2026", tag: "ssr" },
  { slug: "ssr-streaming", title: "SSR Streaming with Suspense", date: "Feb 15, 2026", tag: "ssr" },
  { slug: "fine-grained-reactivity", title: "Fine-Grained Reactivity", date: "Feb 10, 2026", tag: "framework" },
  { slug: "file-based-routing", title: "File-Based Routing Done Right", date: "Feb 5, 2026", tag: "router" },
];

export default function BlogPage(props: { scrollTo?: string }) {
  // ✅ Receives props from router.navigate("/blog", { scrollTo: "latest" })
  const filter = nixState("all");

  const tags = ["all", "framework", "ssr", "router"];
  const filtered = filter.value === "all"
    ? allPosts
    : allPosts.filter((p) => p.tag === filter.value);

  return (
    <div class="page">
      <Nav />
      <section class="section">
        <h1>Blog</h1>
        {props.scrollTo && (
          <p class="info-msg">📌 Scrolled to: {props.scrollTo}</p>
        )}

        {/* Tag filter */}
        <div class="tags">
          {tags.map((tag) => (
            <button
              key={tag}
              class={`tag ${filter.value === tag ? "active" : ""}`}
              r-click={() => { filter.value = tag; }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Post list — each links to dynamic route /blog/:slug */}
        {filtered.map((post) => (
          <a key={post.slug} href={`/blog/${post.slug}`} data-fynix-link class="post-row">
            <span class="post-title">{post.title}</span>
            <span class="post-tag">{post.tag}</span>
            <span class="post-date">{post.date}</span>
          </a>
        ))}
      </section>
    </div>
  );
}

BlogPage.meta = {
  title: "Blog — Resty",
  description: "Articles about web frameworks, SSR, and reactive UI architecture.",
};
```

**Features shown:** Receiving navigation props (`scrollTo`), reactive filtering with `nixState`, linking to dynamic routes.

---

## 5. Single Post — `src/pages/blog/[slug]/view.tsx`

This is the **dynamic route** — `[slug]` folder maps to `:slug` parameter.

```tsx
import { nixState } from "fynixui";
import createFynix from "fynixui/router";
import { Nav } from "../../../shared/Nav";

const posts: Record<string, { title: string; body: string[]; date: string; next?: string }> = {
  "building-fynix": {
    title: "Building Fynix",
    body: [
      "Fynix started as an experiment in fine-grained reactivity. The idea was simple: what if DOM updates were as surgical as possible?",
      "Instead of re-rendering entire component trees, Fynix tracks exactly which DOM nodes depend on which reactive values. When state changes, only those specific nodes update.",
      "The result is a framework that's fast by default — no memoization needed, no shouldComponentUpdate, no useMemo. Just write your components and let the scheduler handle the rest.",
    ],
    date: "Feb 24, 2026",
    next: "islands-architecture",
  },
  "islands-architecture": {
    title: "Islands Architecture Deep Dive",
    body: [
      "Islands Architecture is a rendering pattern where the page is mostly static HTML, with small interactive 'islands' that hydrate independently on the client.",
      "The key insight: most of a blog page is static content. Why ship JavaScript for paragraphs, headings, and images? Only the comment form and like button need interactivity.",
      "In Fynix, you wrap interactive components with Island(). On the server, they render to HTML with data attributes. On the client, hydrateIslands() brings them to life.",
    ],
    date: "Feb 20, 2026",
    next: "ssr-streaming",
  },
  "ssr-streaming": {
    title: "SSR Streaming with Suspense",
    body: [
      "Traditional SSR waits for ALL data before sending HTML. Streaming SSR sends what's ready immediately and fills in the rest later.",
      "Fynix uses Suspense boundaries to identify async content. The fallback renders inline, and when data resolves, a template + script block streams in to swap the content.",
      "The user sees the page layout instantly. Slow API calls don't block the entire response — they pop in when ready.",
    ],
    date: "Feb 15, 2026",
    next: "fine-grained-reactivity",
  },
  "fine-grained-reactivity": {
    title: "Fine-Grained Reactivity",
    body: [
      "Most frameworks re-render entire components when state changes. Fynix takes a different approach — it tracks dependencies at the DOM node level.",
      "When you call nixState(), the framework creates a reactive signal. Any DOM node that reads this signal during render is automatically subscribed to updates.",
      "The result: changing a counter value updates one text node, not an entire component tree. This is what makes Fynix fast without explicit optimization.",
    ],
    date: "Feb 10, 2026",
  },
  "file-based-routing": {
    title: "File-Based Routing Done Right",
    body: [
      "File-based routing maps your folder structure directly to URL paths. Create src/pages/about/view.tsx and you get /about. Simple.",
      "Dynamic segments use bracket notation: [slug] becomes :slug. The router extracts parameters automatically and passes them as props.params.",
      "Nested layouts are opt-in through enableNestedRouting(). Parent layouts receive children as props — the sidebar stays, only the content changes.",
    ],
    date: "Feb 5, 2026",
  },
};

export default function BlogPost(props: {
  params: { slug: string };
  featured?: boolean;       // from setLinkProps via Nav "Featured ✦" link
}) {
  const router = createFynix();  // singleton — same instance from main.tsx
  const slug = props.params.slug;
  const post = posts[slug];
  const likes = nixState(0);

  // ── Not found ──
  if (!post) {
    return (
      <div class="page">
        <Nav />
        <section class="section">
          <h1>Post not found</h1>
          <p>No post matches "{slug}".</p>
          <button class="btn-primary" r-click={() => router.navigate("/blog")}>
            ← All Posts
          </button>
        </section>
      </div>
    );
  }

  return (
    <div class="page">
      <Nav />
      <article class="section">
        {/* Shows when navigated via the "Featured ✦" link with setLinkProps */}
        {props.featured && <p class="featured-badge">⭐ Featured Post</p>}

        {/* router.back() — go to previous page */}
        <button class="back-btn" r-click={() => router.back()}>
          ← Back
        </button>

        <h1>{post.title}</h1>
        <p class="post-meta">Resty · {post.date}</p>

        {post.body.map((p, i) => (
          <p key={i} class="post-paragraph">{p}</p>
        ))}

        {/* Interactive section */}
        <div class="post-actions">
          <button class="like-btn" r-click={() => { likes.value++; }}>
            ❤️ {likes.value}
          </button>
          <button
            class="btn-outline"
            r-click={() => {
              // router.navigate with props — share context to the target page
              router.navigate("/blog", { scrollTo: slug });
            }}
          >
            View all posts
          </button>
        </div>

        {/* Navigate to next post — SPA link to another dynamic route */}
        {post.next && (
          <div class="next-post">
            <span>Next post →</span>
            <a href={`/blog/${post.next}`} data-fynix-link class="next-link">
              {posts[post.next]?.title}
            </a>
          </div>
        )}

        {/* router.replace — replaces history (can't go "back" to current page) */}
        <div class="share-row">
          <button
            class="btn-sm"
            r-click={() => router.replace(`/blog/${post.next ?? slug}`)}
          >
            Skip to next (replace history)
          </button>
        </div>
      </article>
    </div>
  );
}

// Dynamic SEO meta — receives route params, returns meta per post
BlogPost.meta = (params: Record<string, string>) => {
  const post = posts[params.slug];
  return {
    title: post ? `${post.title} — Resty's Blog` : "Post Not Found",
    description: post?.body[0]?.substring(0, 155) ?? "Blog post not found.",
    ogTitle: post?.title,
  };
};
```

**Features shown:**
- `[slug]` folder → `props.params.slug` (dynamic routes)
- `props.featured` from `setLinkProps` (link props)
- `router.back()` (back navigation)
- `router.navigate("/blog", { scrollTo: slug })` (programmatic nav with props)
- `router.replace(path)` (replace history — no back)
- `data-fynix-link` to another dynamic page (SPA within dynamic routes)
- Dynamic `Component.meta` function (SEO per post)

---

## 6. Portfolio — `src/pages/portfolio/view.tsx`

```tsx
import createFynix from "fynixui/router";
import { Nav } from "../../shared/Nav";

const projects = [
  { name: "Fynix", desc: "Reactive UI framework with fine-grained updates", url: "/blog/building-fynix" },
  { name: "SSR Engine", desc: "Streaming SSR with Islands Architecture", url: "/blog/ssr-streaming" },
  { name: "Router", desc: "File-based routing with nested layouts", url: "/blog/file-based-routing" },
];

export default function PortfolioPage() {
  const router = createFynix();  // singleton — same instance from main.tsx

  return (
    <div class="page">
      <Nav />
      <section class="section">
        <h1>Portfolio</h1>
        <div class="project-grid">
          {projects.map((proj) => (
            <div key={proj.name} class="project-card">
              <h3>{proj.name}</h3>
              <p>{proj.desc}</p>
              {/* Navigate programmatically to related blog post */}
              <button
                class="btn-outline"
                r-click={() => router.navigate(proj.url, { fromPortfolio: true })}
              >
                Read more →
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

PortfolioPage.meta = {
  title: "Portfolio — Resty",
  description: "Projects by Resty: Fynix, SSR Engine, Router.",
};
```

---

## 7. Login — `src/pages/login/view.tsx`

The dashboard route guard redirects here when unauthenticated.

```tsx
import { nixState } from "fynixui";
import createFynix from "fynixui/router";
import { Nav } from "../../shared/Nav";

export default function LoginPage() {
  const router = createFynix();  // singleton — same instance from main.tsx
  const password = nixState("");
  const error = nixState("");

  function login() {
    if (password.value === "fynix") {
      localStorage.setItem("auth", "true");
      // replace — so "back" from dashboard doesn't return here
      router.replace("/dashboard/drafts");
    } else {
      error.value = "Try 'fynix'";
    }
  }

  return (
    <div class="page">
      <Nav />
      <section class="section login-section">
        <div class="login-card">
          <h1>Login</h1>
          <p class="subtle">Enter the password to access your dashboard.</p>
          {error.value && <p class="error">{error.value}</p>}
          <input
            type="password"
            class="input"
            placeholder="Password"
            value={password.value}
            r-input={(e: any) => { password.value = e.target.value; }}
            r-keydown={(e: any) => { if (e.key === "Enter") login(); }}
          />
          <button class="btn-primary full" r-click={login}>Sign In</button>
        </div>
      </section>
    </div>
  );
}
```

**Features shown:** `router.replace()` (no back-to-login after auth), works with `guard.redirect` from nested routing config.

---

## 8. Dashboard Layout — `src/pages/dashboard/view.tsx`

**Nested routing**: this sidebar persists across all `/dashboard/*` pages.

```tsx
import { nixState } from "fynixui";
import createFynix from "fynixui/router";

export default function DashboardLayout(props: { children?: any }) {
  const router = createFynix();  // singleton — same instance from main.tsx

  const links = [
    { href: "/dashboard/drafts", label: "📝 Drafts" },
    { href: "/dashboard/stats", label: "📊 Stats" },
    { href: "/dashboard/settings/profile", label: "⚙️ Settings" },
  ];

  return (
    <div class="dashboard">
      <aside class="sidebar">
        <a href="/" data-fynix-link class="sidebar-logo">resty.dev</a>
        <nav class="sidebar-nav">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              data-fynix-link
              class={`sidebar-link ${location.pathname.startsWith(link.href) ? "active" : ""}`}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <button
          class="sidebar-logout"
          r-click={() => {
            localStorage.removeItem("auth");
            router.replace("/");
          }}
        >
          Logout
        </button>
      </aside>

      {/* Content changes based on nested route — sidebar stays */}
      <main class="dash-main">
        {props.children}
      </main>
    </div>
  );
}
```

---

## 9. Drafts — `src/pages/dashboard/drafts/view.tsx`

`keepAlive: true` — the draft text you type is preserved when you navigate away and come back.

```tsx
import { nixState } from "fynixui";

export default function DraftsPage() {
  // 💾 keepAlive preserves ALL of this state across navigations
  const draftTitle = nixState("My new blog post");
  const draftBody = nixState("Start writing here...");
  const wordCount = nixState(0);

  function updateBody(value: string) {
    draftBody.value = value;
    wordCount.value = value.trim().split(/\s+/).filter(Boolean).length;
  }

  return (
    <div class="dash-page">
      <h1>📝 Drafts</h1>
      <p class="hint">
        💾 This page uses <code>keepAlive: true</code> — type something,
        navigate to Stats, then come back. Your text is preserved!
      </p>

      <input
        type="text"
        class="input draft-title"
        value={draftTitle.value}
        r-input={(e: any) => { draftTitle.value = e.target.value; }}
        placeholder="Post title"
      />
      <textarea
        class="input draft-body"
        rows={10}
        value={draftBody.value}
        r-input={(e: any) => updateBody(e.target.value)}
      />
      <p class="word-count">{wordCount.value} words</p>
    </div>
  );
}

DraftsPage.meta = { title: "Drafts — Dashboard" };
```

---

## 10. Stats — `src/pages/dashboard/stats/view.tsx`

```tsx
export default function StatsPage() {
  return (
    <div class="dash-page">
      <h1>📊 Stats</h1>
      <div class="stats-grid">
        <div class="stat"><h4>Posts</h4><p class="stat-val">24</p></div>
        <div class="stat"><h4>Views</h4><p class="stat-val">12.4k</p></div>
        <div class="stat"><h4>Subscribers</h4><p class="stat-val">380</p></div>
      </div>
      <p class="hint">Navigate back to Drafts — your typed text is still there (keepAlive).</p>
    </div>
  );
}

StatsPage.meta = { title: "Stats — Dashboard" };
```

---

## 11. Settings Layout — `src/pages/dashboard/settings/view.tsx`

**3-level nesting**: Dashboard sidebar → Settings tabs → Profile/Appearance.

```tsx
export default function SettingsLayout(props: { children?: any }) {
  return (
    <div class="dash-page">
      <h1>⚙️ Settings</h1>
      <div class="tabs">
        <a href="/dashboard/settings/profile" data-fynix-link
          class={`tab ${location.pathname.includes("profile") ? "active" : ""}`}>
          Profile
        </a>
        <a href="/dashboard/settings/appearance" data-fynix-link
          class={`tab ${location.pathname.includes("appearance") ? "active" : ""}`}>
          Appearance
        </a>
      </div>
      <div class="tab-content">{props.children}</div>
    </div>
  );
}
```

### `src/pages/dashboard/settings/profile/view.tsx`

```tsx
import { nixForm } from "fynixui";

export default function ProfilePage() {
  const form = nixForm(
    { name: "Resty", bio: "Building Fynix." },
    { name: { required: true, minLength: 2, message: "Name required" } }
  );

  return (
    <form r-submit={(e: Event) => {
      e.preventDefault();
      form.handleSubmit(async (vals) => alert(`Saved: ${vals.name}`));
    }}>
      <div class="field">
        <label>Name</label>
        <input {...form.getFieldProps("name")} class="input" />
        {form.errors.value.name && <p class="error">{form.errors.value.name}</p>}
      </div>
      <div class="field">
        <label>Bio</label>
        <textarea {...form.getFieldProps("bio")} class="input" rows={3} />
      </div>
      <button type="submit" class="btn-primary">Save</button>
    </form>
  );
}
```

### `src/pages/dashboard/settings/appearance/view.tsx`

```tsx
import { nixState } from "fynixui";

export default function AppearancePage() {
  const theme = nixState("dark");

  return (
    <div>
      <h3>Theme</h3>
      <div class="theme-picker">
        {["dark", "light", "auto"].map((t) => (
          <button
            key={t}
            class={`tag ${theme.value === t ? "active" : ""}`}
            r-click={() => { theme.value = t; }}
          >
            {t}
          </button>
        ))}
      </div>
      <p class="hint">Selected: {theme.value}</p>
    </div>
  );
}
```

---

## Styles — `src/styles.css`

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.7; }

.page { min-height: 100vh; display: flex; flex-direction: column; }
.section { max-width: 680px; margin: 0 auto; padding: 2rem; width: 100%; }

/* Nav */
.nav { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; border-bottom: 1px solid #1e293b; }
.nav-logo { color: #f1f5f9; text-decoration: none; font-weight: 700; }
.nav-links { display: flex; gap: 1.5rem; align-items: center; }
.nav-links a { color: #94a3b8; text-decoration: none; }
.nav-links a:hover { color: #f1f5f9; }
.nav-btn { background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }

/* Hero */
.hero { padding: 4rem 2rem; max-width: 680px; margin: 0 auto; }
.hero h1 { font-size: 2rem; margin-bottom: 0.75rem; }
.hero p { color: #94a3b8; font-size: 1.05rem; }

/* Posts */
.post-row { display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 0; border-bottom: 1px solid #1e293b; text-decoration: none; color: #e2e8f0; }
.post-row:hover .post-title { color: #3b82f6; }
.post-title { transition: color 0.2s; }
.post-tag { background: #1e293b; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; color: #94a3b8; }
.post-date { color: #64748b; font-size: 0.85rem; }
.post-meta { color: #64748b; margin-bottom: 1.5rem; }
.post-paragraph { margin-bottom: 1rem; }

/* Blog Post */
.featured-badge { background: #f59e0b20; color: #f59e0b; padding: 0.5rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; }
.post-actions { display: flex; gap: 1rem; margin: 2rem 0; padding-top: 1.5rem; border-top: 1px solid #1e293b; }
.like-btn { background: #1e293b; border: 1px solid #334155; color: #e2e8f0; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
.next-post { background: #1e293b; padding: 1rem; border-radius: 8px; margin: 1rem 0; display: flex; justify-content: space-between; align-items: center; }
.next-link { color: #3b82f6; text-decoration: none; }
.share-row { margin-top: 0.5rem; }

/* Portfolio */
.project-grid { display: grid; gap: 1rem; margin-top: 1rem; }
.project-card { background: #1e293b; padding: 1.5rem; border-radius: 10px; border: 1px solid #334155; }
.project-card h3 { margin-bottom: 0.5rem; }

/* Tags */
.tags { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
.tag { background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 0.35rem 0.85rem; border-radius: 20px; cursor: pointer; font-size: 0.85rem; }
.tag.active { background: #3b82f6; color: white; border-color: #3b82f6; }

/* Dashboard */
.dashboard { display: flex; min-height: 100vh; }
.sidebar { width: 200px; background: #1e293b; padding: 1.25rem; display: flex; flex-direction: column; border-right: 1px solid #334155; }
.sidebar-logo { color: #f1f5f9; text-decoration: none; font-weight: 700; margin-bottom: 1.5rem; display: block; }
.sidebar-nav { display: flex; flex-direction: column; gap: 4px; }
.sidebar-link { color: #94a3b8; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px; }
.sidebar-link:hover { background: #334155; }
.sidebar-link.active { background: #3b82f6; color: white; }
.sidebar-logout { margin-top: auto; background: none; border: 1px solid #334155; color: #64748b; padding: 0.5rem; border-radius: 6px; cursor: pointer; }
.dash-main { flex: 1; padding: 2rem; }
.dash-page { max-width: 680px; }
.dash-page h1 { margin-bottom: 1rem; }

/* keepAlive */
.draft-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem; }
.draft-body { font-family: 'JetBrains Mono', monospace; line-height: 1.6; }
.word-count { color: #64748b; font-size: 0.85rem; margin-top: 0.5rem; }

/* Tabs */
.tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
.tab { color: #94a3b8; text-decoration: none; padding: 0.4rem 0.85rem; border-radius: 6px 6px 0 0; }
.tab.active { color: #3b82f6; border-bottom: 2px solid #3b82f6; }
.tab-content { min-height: 200px; }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0; }
.stat { background: #1e293b; padding: 1.25rem; border-radius: 10px; text-align: center; border: 1px solid #334155; }
.stat h4 { color: #94a3b8; font-size: 0.8rem; }
.stat-val { font-size: 1.5rem; font-weight: 700; }

/* Forms & Inputs */
.field { margin-bottom: 1rem; }
.field label { display: block; color: #94a3b8; margin-bottom: 0.25rem; font-size: 0.875rem; }
.input { width: 100%; padding: 0.6rem 0.75rem; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 6px; font-size: 0.95rem; }
.input:focus { border-color: #3b82f6; outline: none; }
.error { color: #f87171; font-size: 0.8rem; margin-top: 0.25rem; }

/* Login */
.login-section { display: flex; align-items: center; justify-content: center; flex: 1; }
.login-card { background: #1e293b; padding: 2rem; border-radius: 12px; width: 100%; max-width: 360px; border: 1px solid #334155; }
.login-card h1 { margin-bottom: 0.25rem; }
.subtle { color: #64748b; margin-bottom: 1.25rem; font-size: 0.9rem; }

/* Buttons */
.btn-primary { padding: 0.55rem 1.1rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; }
.btn-primary:hover { background: #2563eb; }
.btn-outline { padding: 0.5rem 1rem; background: none; color: #3b82f6; border: 1px solid #334155; border-radius: 6px; cursor: pointer; text-decoration: none; display: inline-block; }
.btn-link { color: #3b82f6; text-decoration: none; }
.btn-sm { padding: 0.35rem 0.75rem; background: #334155; color: #94a3b8; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
.btn-row { display: flex; gap: 1rem; margin-top: 1.5rem; align-items: center; }
.full { width: 100%; margin-top: 1rem; }
.back-btn { background: none; border: none; color: #3b82f6; cursor: pointer; margin-bottom: 1rem; }
.hint { color: #64748b; font-size: 0.85rem; margin: 0.5rem 0; }
.info-msg { background: #3b82f620; color: #3b82f6; padding: 0.5rem 1rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem; }
.theme-picker { display: flex; gap: 0.5rem; margin: 0.75rem 0; }
```

---

## Router Features Summary

| Feature | Where | Code |
|---|---|---|
| File-based routing | Entire project | `src/pages/**/view.tsx` → auto-routes |
| SPA navigation | All `<a>` tags | `data-fynix-link` |
| Programmatic nav | Home, Portfolio | `router.navigate("/blog")` |
| Nav with props | Home, Blog | `router.navigate("/blog", { scrollTo: "latest" })` |
| Link props | Nav → Blog Post | `setLinkProps("featured", { featured: true })` |
| Dynamic routes | `/blog/:slug` | `[slug]` folder → `props.params.slug` |
| Back navigation | Blog Post | `router.back()` |
| Replace history | Login, Blog Post | `router.replace("/dashboard")` |
| Static SEO | Home, Blog listing | `Component.meta = { title, description }` |
| Dynamic SEO | Blog Post | `Component.meta = (params) => ({ ... })` |
| Route guards | Dashboard | `guard: { canActivate, redirect }` |
| Nested routing | Dashboard | Sidebar persists, content swaps |
| 3-level nesting | Dashboard → Settings | Sidebar → Tabs → Content |
| keepAlive | Drafts page | Draft text survives navigation |
| Preloading | main.tsx | `router.preloadRoute("/blog")` |
| Cleanup | Logout button | `router.replace("/")` after clearing auth |
