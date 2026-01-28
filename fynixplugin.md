# Fynix Vite Plugin Documentation

**Version:** 1.0.0  
**Plugin Name:** `vite-plugin-fynix-sfc`

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [SFC File Format](#sfc-file-format)
- [API Reference](#api-reference)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Overview

The Fynix Vite Plugin is a powerful build tool integration that enables Single File Component (SFC) development for the Fynix framework. It provides seamless transformation of `.fnx` files, JSX/TSX support, optional TypeScript type checking, and Hot Module Replacement (HMR) capabilities.

### Key Capabilities

- **SFC Support**: Parse and transform `.fnx` files into fully functional components
- **Multi-language Support**: Handle TypeScript, JavaScript, JSX, and TSX files
- **Type Checking**: Optional TypeScript type checking with customizable compiler options
- **Scoped Styles**: Automatic style scoping to prevent CSS conflicts
- **Meta Tag Injection**: Built-in support for SEO meta tags
- **Hot Module Replacement**: Fast development with instant updates
- **esbuild Integration**: Lightning-fast transformations using esbuild

---

## Features

### 1. Single File Component (SFC) Support

Transform `.fnx` files into complete React-style components with three distinct sections:

- **Logic Block**: Component state, functions, and business logic
- **View Block**: JSX/TSX template markup (required)
- **Style Block**: Component-specific CSS with optional scoping

### 2. Flexible File Processing

- Process `.ts`, `.tsx`, `.js`, `.jsx`, and `.fnx` files
- Exclude specific paths (e.g., `node_modules`)
- Custom file extension configuration

### 3. TypeScript Type Checking

- Optional compile-time type checking
- Virtual file system for efficient checking
- Customizable TypeScript compiler options
- Smart error filtering and reporting

### 4. Style Management

- Automatic style injection into the DOM
- Scoped styles using data attributes
- Support for both scoped and global styles
- Hash-based unique identifiers

### 5. Development Experience

- Colored terminal output for better readability
- Debug mode with generated code preview
- HMR support for instant updates
- Detailed error messages with file context

---

## Installation

### Prerequisites

- Node.js 14.x or higher
- Vite 2.x or higher
- TypeScript 4.x or higher (optional, for type checking)

### Package Installation

```bash
npm install vite-plugin-fynix-sfc --save-dev
```

or using yarn:

```bash
yarn add -D vite-plugin-fynix-sfc
```

or using pnpm:

```bash
pnpm add -D vite-plugin-fynix-sfc
```

---

## Quick Start

### Basic Setup

1. **Create or modify `vite.config.ts`:**

```typescript
import { defineConfig } from 'vite';
import fynixPlugin from 'vite-plugin-fynix-sfc';

export default defineConfig({
  plugins: [
    fynixPlugin()
  ]
});
```

2. **Create your first `.fnx` file (`App.fnx`):**

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';

const count = useState(0);

function increment() {
  count.value++;
}
</logic>

<view>
  <div class="counter">
    <h1>Count: {count.value}</h1>
    <button onClick={increment}>Increment</button>
  </div>
</view>

<style scoped>
.counter {
  text-align: center;
  padding: 2rem;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
}
</style>
```

3. **Import and use the component:**

```typescript
import App from './App.fnx';

// Render the app
document.getElementById('app')?.appendChild(App());
```

---

## Configuration

### Plugin Options

The plugin accepts a configuration object with the following properties:

#### `FynixPluginOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `jsxFactory` | `string` | `"Fynix"` | JSX factory function name |
| `jsxFragment` | `string` | `"Fynix.Fragment"` | JSX fragment factory name |
| `include` | `string[]` | `[".ts", ".js", ".jsx", ".tsx", ".fnx"]` | File extensions to transform |
| `exclude` | `string[]` | `["node_modules"]` | Paths to exclude from transformation |
| `sourcemap` | `boolean` | `true` | Enable source maps |
| `esbuildOptions` | `Partial<TransformOptions>` | `{}` | Custom esbuild transform options |
| `enableSFC` | `boolean` | `true` | Enable SFC parsing for .fnx files |
| `debug` | `boolean` | `false` | Enable debug logging |
| `showGeneratedCode` | `boolean` | `false` | Show generated code in console |
| `typeCheck` | `boolean` | `false` | Enable TypeScript type checking |
| `tsConfig` | `ts.CompilerOptions` | `undefined` | TypeScript compiler options override |

### Configuration Examples

#### Basic Configuration

```typescript
import { defineConfig } from 'vite';
import fynixPlugin from 'vite-plugin-fynix-sfc';

export default defineConfig({
  plugins: [
    fynixPlugin({
      jsxFactory: 'Fynix',
      jsxFragment: 'Fynix.Fragment',
      enableSFC: true,
      sourcemap: true
    })
  ]
});
```

#### Advanced Configuration with Type Checking

```typescript
import { defineConfig } from 'vite';
import fynixPlugin from 'vite-plugin-fynix-sfc';

export default defineConfig({
  plugins: [
    fynixPlugin({
      typeCheck: true,
      showGeneratedCode: true,
      tsConfig: {
        strict: true,
        noImplicitAny: true,
        strictNullChecks: true
      },
      esbuildOptions: {
        minify: false,
        keepNames: true
      }
    })
  ]
});
```

#### Custom File Extensions

```typescript
import { defineConfig } from 'vite';
import fynixPlugin from 'vite-plugin-fynix-sfc';

export default defineConfig({
  plugins: [
    fynixPlugin({
      include: ['.ts', '.tsx', '.fnx', '.fynix'],
      exclude: ['node_modules', 'dist', 'build']
    })
  ]
});
```

---

## SFC File Format

### File Structure

A `.fnx` file consists of three optional sections (though `<view>` is required):

```html
<logic setup="ts|js">
  // Component logic
</logic>

<view>
  // JSX/TSX template (REQUIRED)
</view>

<style scoped?>
  // CSS styles
</style>
```

### Logic Block

The `<logic>` block contains component state, functions, imports, and exports.

#### Attributes

- `setup="ts"` - Use TypeScript (default)
- `setup="js"` - Use JavaScript

#### Example

```html
<logic setup="ts">
import { useState, useEffect } from '@fynixorg/ui';
import type { User } from './types';

const user = useState<User | null>(null);
const loading = useState(true);

async function fetchUser() {
  loading.value = true;
  const response = await fetch('/api/user');
  user.value = await response.json();
  loading.value = false;
}

export const meta = {
  title: 'User Profile',
  description: 'View user profile information'
};
</logic>
```

### View Block

The `<view>` block contains the component's JSX/TSX template. This block is **required**.

#### Example

```html
<view>
  <div class="user-profile">
    {loading.value ? (
      <div class="spinner">Loading...</div>
    ) : (
      <div class="user-info">
        <h1>{user.value?.name}</h1>
        <p>{user.value?.email}</p>
      </div>
    )}
  </div>
</view>
```

### Style Block

The `<style>` block contains CSS styles for the component.

#### Attributes

- `scoped` - Scope styles to this component only (optional)

#### Global Styles

```html
<style>
.container {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
```

#### Scoped Styles

```html
<style scoped>
.container {
  /* Only applies to this component */
  padding: 2rem;
  background: white;
}
</style>
```

### Complete Example

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const todos = useState<Todo[]>([]);
const inputValue = useState('');

function addTodo() {
  if (inputValue.value.trim()) {
    todos.value = [
      ...todos.value,
      {
        id: Date.now(),
        text: inputValue.value,
        completed: false
      }
    ];
    inputValue.value = '';
  }
}

function toggleTodo(id: number) {
  todos.value = todos.value.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
}

export const meta = {
  title: 'Todo List',
  description: 'A simple todo list application'
};
</logic>

<view>
  <div class="todo-app">
    <h1>My Todos</h1>
    
    <div class="input-group">
      <input
        type="text"
        value={inputValue.value}
        onInput={(e) => inputValue.value = e.target.value}
        placeholder="Add a new todo..."
      />
      <button onClick={addTodo}>Add</button>
    </div>
    
    <ul class="todo-list">
      {todos.value.map(todo => (
        <li key={todo.id} class={todo.completed ? 'completed' : ''}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
          />
          <span>{todo.text}</span>
        </li>
      ))}
    </ul>
  </div>
</view>

<style scoped>
.todo-app {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.input-group input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.input-group button {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.todo-list {
  list-style: none;
  padding: 0;
}

.todo-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: white;
  margin-bottom: 0.5rem;
  border-radius: 4px;
}

.todo-list li.completed span {
  text-decoration: line-through;
  opacity: 0.6;
}
</style>
```

---

## API Reference

See [API.md](./API.md) for detailed API documentation.

---

## Advanced Usage

### Custom JSX Factory

```typescript
fynixPlugin({
  jsxFactory: 'CustomFactory',
  jsxFragment: 'CustomFactory.Fragment'
})
```

### Debug Mode

Enable debug logging to see transformation details:

```typescript
fynixPlugin({
  debug: true,
  showGeneratedCode: true
})
```

This will output:
- Transformation logs
- Generated component code
- Type checking results

### Type Checking in Production

```typescript
fynixPlugin({
  typeCheck: process.env.NODE_ENV === 'production',
  tsConfig: {
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true
  }
})
```

### Excluding Specific Paths

```typescript
fynixPlugin({
  exclude: [
    'node_modules',
    'dist',
    'build',
    'test',
    '__tests__'
  ]
})
```

---

## Troubleshooting

### Common Issues

#### 1. Missing `<view>` Block Error

**Error Message:**
```
[Fynix SFC] Missing <view> block in /path/to/file.fnx. Every .fnx file must have a <view> section.
```

**Solution:**
Every `.fnx` file must include a `<view>` block. Add one even if it returns null:

```html
<view>
  <div>Content here</div>
</view>
```

#### 2. TypeScript Syntax in JavaScript Mode

**Error Message:**
```
[Fynix SFC] TypeScript syntax detected (type annotation) in /path/to/file.fnx with setup="js".
Either change to setup="ts" or remove TypeScript-specific syntax.
```

**Solution:**
Change `setup="js"` to `setup="ts"` or remove TypeScript syntax:

```html
<!-- Before -->
<logic setup="js">
const count: number = 0;
</logic>

<!-- Solution 1: Use TypeScript -->
<logic setup="ts">
const count: number = 0;
</logic>

<!-- Solution 2: Remove types -->
<logic setup="js">
const count = 0;
</logic>
```

#### 3. Scoped Styles Not Working

**Issue:** Styles are not scoped to the component.

**Solution:**
Ensure the `scoped` attribute is present on the `<style>` tag:

```html
<style scoped>
  /* Styles here will be scoped */
</style>
```

#### 4. Hot Module Replacement Not Working

**Issue:** Changes don't reflect immediately.

**Solution:**
The plugin triggers full-page reloads for `.fnx` files. Ensure your Vite dev server is running properly:

```bash
vite --force
```

#### 5. Type Checking Errors

**Issue:** Type errors are shown even when code is correct.

**Solution:**
Customize TypeScript configuration:

```typescript
fynixPlugin({
  typeCheck: true,
  tsConfig: {
    skipLibCheck: true,
    strict: false
  }
})
```

---

## Performance Optimization

### 1. Disable Type Checking in Development

```typescript
fynixPlugin({
  typeCheck: process.env.NODE_ENV === 'production'
})
```

### 2. Use Selective Includes

```typescript
fynixPlugin({
  include: ['.fnx'], // Only process .fnx files
  exclude: ['node_modules', 'dist']
})
```

### 3. Optimize esbuild Options

```typescript
fynixPlugin({
  esbuildOptions: {
    target: 'es2020',
    minify: process.env.NODE_ENV === 'production'
  }
})
```

---

## Best Practices

### 1. File Organization

```
src/
├── components/
│   ├── Button.fnx
│   ├── Card.fnx
│   └── Layout.fnx
├── pages/
│   ├── Home.fnx
│   ├── About.fnx
│   └── Contact.fnx
└── App.fnx
```

### 2. Use TypeScript for Better Type Safety

```html
<logic setup="ts">
import type { ComponentProps } from './types';

interface Props extends ComponentProps {
  title: string;
  onClick: () => void;
}
</logic>
```

### 3. Export Metadata for SEO

```html
<logic setup="ts">
export const meta = {
  title: 'Page Title',
  description: 'Page description',
  keywords: 'keyword1, keyword2',
  ogTitle: 'Open Graph Title',
  ogDescription: 'Open Graph Description',
  ogImage: 'https://example.com/image.jpg'
};
</logic>
```

### 4. Use Scoped Styles by Default

```html
<style scoped>
/* Component-specific styles */
</style>
```

### 5. Keep Logic Separate from View

```html
<logic setup="ts">
// All business logic here
const state = useState(initialValue);
function handleClick() { /* ... */ }
</logic>

<view>
  <!-- Only presentation here -->
  <button onClick={handleClick}>{state.value}</button>
</view>
```

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build: `npm run build`

---

## License

[MIT License](./LICENSE)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/fynixorg/vite-plugin-fynix-sfc/issues)
- **Documentation:** [Full Documentation](https://fynix.org/docs)
- **Community:** [Discord](https://discord.gg/fynix)

---

**Last Updated:** January 2026  
**Maintainers:** Fynix Core Team