# Fynix UI Framework

A lightweight, reactive UI framework with JSX support, built-in hooks, and powerful state management.

> **Formerly RestJS** - Now rebranded as Fynix with improved naming conventions

## Features

- ✅ **Custom JSX Runtime** - Native JSX support with Virtual DOM
- ✅ **Reactive State Management** - Built-in hooks for reactive programming
- ✅ **File-based Router** - Automatic routing from file structure
- ✅ **Form Validation** - Comprehensive form handling with validation rules
- ✅ **Code Splitting** - Lazy loading and Suspense for performance
- ✅ **Local Storage Sync** - Persist state automatically
- ✅ **Tailwind CSS** - Modern styling with Tailwind v4
- ✅ **Hot Module Replacement** - Fast development with Vite

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Production Build

```bash
npm run build
```

## Project Structure

```
fynixjs/
├── app/
│   └── View/              # Application components
│       ├── main.js        # Entry point
│       ├── index.html     # HTML template
│       ├── view.js        # Home page component
│       ├── Global.css     # Global styles
│       └── test/
│           └── view.js    # Dashboard component (/test route)
├── core/                  # Framework core
│   ├── runtime.js         # JSX runtime & Virtual DOM
│   ├── fynix/
│   │   └── index.js      # Main export (alias: @fynix)
│   ├── hooks/            # Reactive hooks
│   │   ├── restState.js
│   │   ├── restStore.js
│   │   ├── restEffect.js
│   │   ├── restAsync.js
│   │   ├── restComputed.js
│   │   ├── restMemo.js
│   │   ├── restCallback.js
│   │   ├── restForm.js
│   │   ├── restLazy.js
│   │   ├── restLocalStorage.js
│   │   └── ...
│   ├── router/
│   │   └── router.js     # File-based routing
│   └── custom/
│       ├── button.js     # Custom Button component
│       └── path.js       # Custom Path (Link) component
├── vite.config.js        # Vite configuration
└── package.json
```

## Core Concepts

### JSX Syntax

FynixJS uses JSX with a custom runtime:

```javascript
import { Rest } from "@fynix";

function MyComponent() {
  return (
    <div class="container">
      <h1>Hello FynixJS!</h1>
      <button r-click={() => alert("Clicked!")}>Click Me</button>
    </div>
  );
}
```

### Event Handling

Use `r-*` attributes for event handlers:

```javascript
<button r-click={handleClick}>Click</button>
<input r-input={(e) => setValue(e.target.value)} />
<form r-submit={(e) => { e.preventDefault(); handleSubmit(); }}>
  {/* form content */}
</form>
```

Available events: `r-click`, `r-input`, `r-change`, `r-submit`, `r-blur`, `r-focus`, etc.

## Hooks Reference

### restState - Local Component State

Reactive state within a single component.

```javascript
import { restState } from "@fynix";

function Counter() {
  const count = restState(0);

  return (
    <div>
      <p>Count: {count.value}</p>
      <button r-click={() => count.value++}>Increment</button>
    </div>
  );
}
```

### restStore - Global Shared State

Persistent state shared across all components.

```javascript
import { restStore } from "@fynix";

// In App.js
function App() {
  const user = restStore("user.name", "Guest");

  return (
    <div>
      <p>Hello, {user.value}!</p>
      <input
        value={user.value}
        r-input={(e) => (user.value = e.target.value)}
      />
    </div>
  );
}

// In Dashboard.js - automatically synced!
function Dashboard() {
  const user = restStore("user.name", "Guest");

  return <p>Welcome back, {user.value}!</p>; // Shows same value
}
```

### restEffect - Side Effects

Run code when dependencies change.

```javascript
import { restState, restEffect } from "@fynix";

function UserProfile() {
  const userId = restState(1);
  const userData = restState(null);

  restEffect(() => {
    fetch(`/api/users/${userId.value}`)
      .then((res) => res.json())
      .then((data) => (userData.value = data));
  }, [userId]); // Re-runs when userId changes

  return <div>{userData.value?.name}</div>;
}
```

### restComputed - Derived Values

Compute values based on reactive dependencies.

```javascript
import { restState, restComputed } from "@fynix";

function ShoppingCart() {
  const items = restState([
    { name: "Book", price: 10, qty: 2 },
    { name: "Pen", price: 2, qty: 5 },
  ]);

  const total = restComputed(() => {
    return items.value.reduce((sum, item) => sum + item.price * item.qty, 0);
  });

  return <p>Total: ${total.value}</p>; // Automatically updates
}
```

### restAsync - Async Operations

Handle async operations with loading/error states.

```javascript
import { restAsync } from "@fynix";

function UserList() {
  const users = restAsync(async () => {
    const res = await fetch("/api/users");
    return res.json();
  });

  if (users.loading.value) return <p>Loading...</p>;
  if (users.error.value) return <p>Error: {users.error.value.message}</p>;

  return (
    <ul>
      {users.data.value.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### restForm - Form Validation

Complete form handling with validation.

```javascript
import { restForm } from "@fynix";

function ContactForm() {
  const form = restForm(
    { email: "", message: "" },
    {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Please enter a valid email",
      },
      message: {
        required: true,
        minLength: 10,
        message: "Message must be at least 10 characters",
      },
    }
  );

  const handleSubmit = async (values) => {
    await fetch("/api/contact", {
      method: "POST",
      body: JSON.stringify(values),
    });
    form.reset();
  };

  return (
    <form
      r-submit={(e) => {
        e.preventDefault();
        form.handleSubmit(handleSubmit);
      }}
    >
      <input
        type="email"
        {...form.getFieldProps("email")}
        placeholder="Your email"
      />
      {form.errors.value.email && form.touched.value.email && (
        <span class="error">{form.errors.value.email}</span>
      )}

      <textarea {...form.getFieldProps("message")} />
      {form.errors.value.message && form.touched.value.message && (
        <span class="error">{form.errors.value.message}</span>
      )}

      <button
        type="submit"
        disabled={!form.isValid.value || form.isSubmitting.value}
      >
        {form.isSubmitting.value ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
```

See [RESTFORM_DOCUMENTATION.md](./RESTFORM_DOCUMENTATION.md) for complete form documentation.

### restLazy + Suspense - Code Splitting

Lazy load components for better performance.

```javascript
import { restLazy, Suspense } from "@fynix";

const HeavyComponent = restLazy(() => import("./HeavyComponent.js"));

function App() {
  return (
    <Suspense fallback={<div>Loading component...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### restMemo - Memoization

Cache expensive computations.

```javascript
import { restState, restMemo } from "@fynix";

function DataProcessor() {
  const data = restState([
    /* large array */
  ]);

  const processed = restMemo(() => {
    console.log("Processing..."); // Only runs when data changes
    return data.value.map((item) => expensiveOperation(item));
  }, [data]);

  return <div>{processed.value.length} items processed</div>;
}
```

### restLocalStorage - Persistent State

Automatically sync state with localStorage.

```javascript
import { restLocalStorage } from "@fynix";

function ThemeToggle() {
  const theme = restLocalStorage("theme", "light");

  return (
    <button
      r-click={() => (theme.value = theme.value === "light" ? "dark" : "light")}
    >
      Current theme: {theme.value}
    </button>
  );
}
```

### restDebounce - Debounced Values

Delay updates for performance (search, autocomplete, etc).

```javascript
import { restState, restDebounce, restEffect } from "@fynix";

function SearchBox() {
  const query = restState("");
  const debouncedQuery = restDebounce(query, 500); // 500ms delay

  restEffect(() => {
    if (debouncedQuery.value) {
      fetch(`/api/search?q=${debouncedQuery.value}`)
        .then((res) => res.json())
        .then((data) => console.log(data));
    }
  }, [debouncedQuery]);

  return (
    <input
      value={query.value}
      r-input={(e) => (query.value = e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### Other Hooks

- **restCallback** - Memoize callback functions
- **restInterval** - Run code on an interval
- **restRef** - Create mutable refs
- **restPrevious** - Access previous value of state

## Routing

FynixJS uses automatic file-based routing.

### File Structure → Routes

```
app/View/
├── view.js           → /
├── about.js          → /about
└── test/
    └── view.js       → /test
```

### Navigation

Use the `Path` component for navigation:

```javascript
import { Path } from "@fynix";

function Navigation() {
  return (
    <nav>
      <Path to="/" value="Home" />
      <Path to="/test" value="Dashboard" />
      <Path to="/about" value="About" />
    </nav>
  );
}
```

### Custom Components

#### Button Component

```javascript
import { Button } from "@fynix";

<Button
  rc="bg-blue-500 text-white px-4 py-2 rounded"
  value="Click Me"
  r-click={handleClick}
/>;
```

#### Path (Link) Component

```javascript
import { Path } from "@fynix";

<Path
  to="/dashboard"
  value="Go to Dashboard"
  rc="text-blue-600 hover:underline"
/>;
```

## Styling with Tailwind CSS

FynixJS includes Tailwind CSS v4 for styling.

```javascript
function Card() {
  return (
    <div class="p-6 bg-white rounded-lg shadow-md">
      <h2 class="text-2xl font-bold mb-4">Card Title</h2>
      <p class="text-gray-600">Card content goes here.</p>
      <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Action
      </button>
    </div>
  );
}
```

Customize Tailwind in `tailwind.config.js` and add global styles in `app/View/Global.css`.

## Complete Example

```javascript
import {
  Rest,
  restState,
  restStore,
  restEffect,
  restComputed,
  Button,
  Path,
} from "@fynix";

export default function TodoApp() {
  // Local state
  const inputValue = restState("");

  // Global state (persisted across components)
  const todos = restStore("todos", []);

  // Computed value
  const remaining = restComputed(
    () => todos.value.filter((t) => !t.done).length
  );

  // Side effect - log changes
  restEffect(() => {
    console.log(`You have ${remaining.value} todos remaining`);
  }, [remaining]);

  function addTodo() {
    if (!inputValue.value.trim()) return;

    todos.value = [
      ...todos.value,
      { id: Date.now(), text: inputValue.value, done: false },
    ];
    inputValue.value = "";
  }

  function toggleTodo(id) {
    todos.value = todos.value.map((todo) =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    );
  }

  function deleteTodo(id) {
    todos.value = todos.value.filter((t) => t.id !== id);
  }

  return (
    <div class="max-w-2xl mx-auto p-6">
      <h1 class="text-3xl font-bold mb-6">Todo App</h1>

      {/* Add Todo */}
      <div class="flex gap-2 mb-6">
        <input
          type="text"
          value={inputValue.value}
          r-input={(e) => (inputValue.value = e.target.value)}
          r-keypress={(e) => e.key === "Enter" && addTodo()}
          placeholder="Add a new todo..."
          class="flex-1 px-4 py-2 border rounded"
        />
        <Button
          rc="px-6 py-2 bg-blue-600 text-white rounded"
          value="Add"
          r-click={addTodo}
        />
      </div>

      {/* Stats */}
      <p class="mb-4 text-gray-600">
        {remaining.value} of {todos.value.length} todos remaining
      </p>

      {/* Todo List */}
      <ul class="space-y-2">
        {todos.value.map((todo) => (
          <li
            key={todo.id}
            class="flex items-center gap-3 p-3 bg-gray-50 rounded"
          >
            <input
              type="checkbox"
              checked={todo.done}
              r-change={() => toggleTodo(todo.id)}
            />
            <span
              class={todo.done ? "flex-1 line-through text-gray-400" : "flex-1"}
            >
              {todo.text}
            </span>
            <button
              r-click={() => deleteTodo(todo.id)}
              class="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {/* Navigation */}
      <div class="mt-8">
        <Path to="/test" value="Go to Dashboard" />
      </div>
    </div>
  );
}
```

## API Integration Example

```javascript
import { restAsync, restState } from "@fynix";

function UserProfile() {
  const userId = restState(1);

  const user = restAsync(async () => {
    const res = await fetch(`https://api.example.com/users/${userId.value}`);
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  }, [userId]); // Refetch when userId changes

  if (user.loading.value) {
    return <div class="text-center p-8">Loading user...</div>;
  }

  if (user.error.value) {
    return (
      <div class="text-red-600 p-8">
        Error: {user.error.value.message}
        <button r-click={() => user.refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div class="p-6">
      <h2 class="text-2xl font-bold">{user.data.value.name}</h2>
      <p class="text-gray-600">{user.data.value.email}</p>
      <button r-click={() => userId.value++}>Next User</button>
    </div>
  );
}
```

## Configuration

### Vite Config (`vite.config.js`)

```javascript
import { defineConfig } from "vite";
import { transformSync } from "esbuild";
import path from "path";

export default defineConfig({
  root: "app/View",

  resolve: {
    alias: {
      "@fynix": path.resolve(__dirname, "core/fynix"),
    },
  },

  esbuild: {
    jsxFactory: "Rest",
    jsxFragment: "Rest.Fragment",
    loader: "jsx",
  },
});
```

### Import Alias

Import everything from `@fynix`:

```javascript
import {
  Rest,
  restState,
  restStore,
  restEffect,
  restAsync,
  restComputed,
  restForm,
  restLazy,
  Suspense,
  Button,
  Path,
} from "@fynix";
```

## Best Practices

1. **Use restStore for shared state** - Any state needed across components
2. **Use restState for local state** - Component-specific state
3. **Memoize expensive computations** - Use restComputed or restMemo
4. **Lazy load heavy components** - Use restLazy + Suspense
5. **Validate forms properly** - Use restForm with comprehensive rules
6. **Debounce search inputs** - Use restDebounce for performance
7. **Handle loading states** - Show loading indicators with restAsync
8. **Clean up effects** - Return cleanup functions from restEffect

## Documentation

- [restForm Complete Guide](./RESTFORM_DOCUMENTATION.md) - Comprehensive form validation documentation

## License

MIT
