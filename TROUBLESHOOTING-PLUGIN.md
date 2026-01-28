# Troubleshooting & FAQ

Common issues, solutions, and frequently asked questions.

---

## Table of Contents

- [Common Issues](#common-issues)
- [Error Messages](#error-messages)
- [Performance Issues](#performance-issues)
- [Type Checking Issues](#type-checking-issues)
- [Style Issues](#style-issues)
- [Build Issues](#build-issues)
- [HMR Issues](#hmr-issues)
- [FAQ](#faq)

---

## Common Issues

### 1. Plugin Not Working

**Symptoms:**
- `.fnx` files not being transformed
- Components not rendering
- No errors in console

**Solutions:**

```typescript
// ✅ Correct - plugin in vite.config.ts
import { defineConfig } from 'vite';
import fynixPlugin from 'vite-plugin-fynix-sfc';

export default defineConfig({
  plugins: [fynixPlugin()]
});

// ❌ Wrong - missing plugin
export default defineConfig({
  plugins: []
});

// ❌ Wrong - plugin after build
export default defineConfig({
  plugins: [],
  build: {
    plugins: [fynixPlugin()] // Don't do this
  }
});
```

**Checklist:**
- [ ] Plugin is imported correctly
- [ ] Plugin is added to `plugins` array
- [ ] Vite dev server is restarted after configuration change
- [ ] File extension is `.fnx`

---

### 2. Missing `<view>` Block Error

**Error:**
```
[Fynix SFC] Missing <view> block in /path/to/Component.fnx. 
Every .fnx file must have a <view> section.
```

**Cause:**
The `<view>` block is required in every `.fnx` file.

**Solution:**

```html
<!-- ❌ Wrong - no view block -->
<logic setup="ts">
const count = useState(0);
</logic>

<!-- ✅ Correct - has view block -->
<logic setup="ts">
const count = useState(0);
</logic>

<view>
  <div>{count.value}</div>
</view>
```

---

### 3. TypeScript Syntax in JavaScript Mode

**Error:**
```
[Fynix SFC] TypeScript syntax detected (interface declaration) 
in /path/to/Component.fnx with setup="js".
Either change to setup="ts" or remove TypeScript-specific syntax.
```

**Cause:**
Using TypeScript syntax (types, interfaces, etc.) with `setup="js"`.

**Solution:**

**Option 1: Switch to TypeScript**
```html
<!-- ✅ Change to setup="ts" -->
<logic setup="ts">
interface User {
  id: number;
  name: string;
}
const user: User = { id: 1, name: 'John' };
</logic>
```

**Option 2: Remove TypeScript Syntax**
```html
<!-- ✅ Use JavaScript only -->
<logic setup="js">
const user = { id: 1, name: 'John' };
</logic>
```

---

### 4. Styles Not Scoped

**Symptoms:**
- Styles affecting other components
- CSS conflicts between components

**Cause:**
Missing `scoped` attribute on `<style>` tag.

**Solution:**

```html
<!-- ❌ Wrong - global styles -->
<style>
.button {
  background: blue;
}
</style>

<!-- ✅ Correct - scoped styles -->
<style scoped>
.button {
  background: blue; /* Only affects this component */
}
</style>
```

---

### 5. Props Not Working

**Symptoms:**
- `props` is undefined
- Component doesn't receive props

**Cause:**
Props are passed as function parameter but needs to be accessed correctly.

**Solution:**

```html
<logic setup="ts">
// Props are available via function parameter
// The transform adds props = {} by default
</logic>

<view>
  <div>
    <!-- ✅ Access props directly -->
    <h1>{props.title}</h1>
    <p>{props.description}</p>
  </div>
</view>
```

**Usage:**
```typescript
import MyComponent from './MyComponent.fnx';

// Pass props when calling component
const app = MyComponent({ 
  title: 'Hello', 
  description: 'World' 
});
```

---

## Error Messages

### Transform Errors

#### "Failed to transform"

**Full Error:**
```
[Fynix SFC] Transform Error in /path/to/file.fnx:
  Failed to transform /path/to/file.fnx: [error details]
```

**Common Causes:**
1. Syntax errors in logic block
2. Invalid JSX in view block
3. Malformed CSS in style block
4. Missing closing tags

**Solutions:**
1. Check syntax in logic block
2. Validate JSX syntax
3. Validate CSS syntax
4. Ensure all tags are properly closed

---

#### "Invalid esbuild configuration"

**Cause:**
Custom esbuild options are incompatible.

**Solution:**
```typescript
fynixPlugin({
  esbuildOptions: {
    // ✅ Valid options
    target: 'es2020',
    minify: true,
    keepNames: true,
    
    // ❌ Avoid conflicting with plugin settings
    // Don't override: loader, jsxFactory, jsxFragment
  }
})
```

---

### Type Checking Errors

#### TypeScript Errors Not Shown

**Symptom:**
Type errors exist but not displayed.

**Cause:**
Type checking is disabled.

**Solution:**
```typescript
fynixPlugin({
  typeCheck: true // Enable type checking
})
```

---

#### Too Many Type Errors

**Symptom:**
Overwhelming number of type errors.

**Cause:**
Strict TypeScript configuration.

**Solution:**
```typescript
fynixPlugin({
  typeCheck: true,
  tsConfig: {
    strict: false,
    skipLibCheck: true,
    noImplicitAny: false
  }
})
```

---

## Performance Issues

### Slow Build Times

**Symptoms:**
- Build takes too long
- Dev server is slow to start

**Solutions:**

#### 1. Disable Type Checking in Development

```typescript
fynixPlugin({
  typeCheck: process.env.NODE_ENV === 'production'
})
```

#### 2. Exclude Unnecessary Paths

```typescript
fynixPlugin({
  exclude: [
    'node_modules',
    'dist',
    'build',
    'test',
    '__tests__',
    'coverage'
  ]
})
```

#### 3. Limit File Extensions

```typescript
fynixPlugin({
  include: ['.fnx'] // Only process .fnx files
})
```

#### 4. Use Faster esbuild Target

```typescript
fynixPlugin({
  esbuildOptions: {
    target: 'es2020' // Instead of 'esnext'
  }
})
```

---

### Slow HMR Updates

**Symptoms:**
- Changes take long to reflect
- Full page reloads are slow

**Cause:**
Large number of files being watched or transformed.

**Solution:**
1. Limit included files
2. Optimize component size
3. Split large components into smaller ones

---

## Type Checking Issues

### Module Not Found Errors

**Error:**
```
Line 1:1 - Cannot find module '@fynixorg/ui' (TS2307)
```

**Cause:**
TypeScript cannot resolve module paths.

**Solution:**

```typescript
fynixPlugin({
  typeCheck: true,
  tsConfig: {
    skipLibCheck: true, // Skip type checking for libraries
    moduleResolution: ts.ModuleResolutionKind.Bundler
  }
})
```

---

### Implicit Any Errors

**Error:**
```
Line 5:10 - Parameter 'e' implicitly has an 'any' type (TS7006)
```

**Cause:**
Strict type checking enabled.

**Solution:**

**Option 1: Add Type Annotations**
```html
<logic setup="ts">
function handleClick(e: MouseEvent) {
  // ...
}
</logic>
```

**Option 2: Disable Strict Checking**
```typescript
fynixPlugin({
  typeCheck: true,
  tsConfig: {
    noImplicitAny: false
  }
})
```

---

## Style Issues

### Scoped Styles Not Working

**Symptom:**
Styles are global despite `scoped` attribute.

**Checklist:**
- [ ] `scoped` attribute is on `<style>` tag
- [ ] Plugin is processing the file
- [ ] Browser cache is cleared

**Verify:**
```html
<style scoped>
.test { color: red; }
</style>
```

**Check generated code:**
```typescript
fynixPlugin({
  showGeneratedCode: true // See transformed output
})
```

Should generate:
```css
[data-fynix-xxxxx] .test { color: red; }
```

---

### CSS Not Loading

**Symptom:**
Styles don't appear in the page.

**Cause:**
1. Style injection happens on client side
2. SSR/SSG environments don't support it

**Solution:**

For SSR/SSG, extract styles separately:
```typescript
// Not recommended for SSR
// Use global styles or CSS modules instead
```

---

### Styles Conflicting

**Symptom:**
Multiple components with same class names conflict.

**Solution:**
Always use `scoped` for component-specific styles:

```html
<style scoped>
/* Component-specific styles */
.button {
  background: blue;
}
</style>

<style>
/* Global styles (use sparingly) */
body {
  margin: 0;
  font-family: Arial;
}
</style>
```

---

## Build Issues

### Build Fails in Production

**Error:**
```
[Fynix SFC] TypeScript Errors in /path/to/file.fnx:
  Line 10:5 - Type error...
```

**Cause:**
Type checking enabled and errors exist.

**Solution:**

**Option 1: Fix Type Errors**
```html
<logic setup="ts">
// Fix type errors in your code
const count: number = 0; // Add proper types
</logic>
```

**Option 2: Disable Type Checking in Production** (not recommended)
```typescript
fynixPlugin({
  typeCheck: false
})
```

---

### Missing Files in Build

**Symptom:**
Some `.fnx` files not included in build output.

**Cause:**
Files not imported anywhere.

**Solution:**
Ensure all components are imported:

```typescript
// main.ts
import App from './App.fnx';
import Button from './components/Button.fnx'; // Import even if used in App

// Vite only bundles imported files
```

---

## HMR Issues

### HMR Not Triggered

**Symptom:**
Changes don't reflect without manual refresh.

**Checklist:**
- [ ] Vite dev server is running
- [ ] File is saved
- [ ] File matches `include` patterns
- [ ] Browser DevTools is open (helps see console errors)

**Solution:**

Force rebuild:
```bash
vite --force
```

Clear Vite cache:
```bash
rm -rf node_modules/.vite
```

---

### Full Reload Instead of HMR

**Symptom:**
Page refreshes completely on every change.

**This is Expected:**
The plugin triggers full reloads for `.fnx` files by design to ensure consistency.

**Why:**
- SFC structure changes require full re-initialization
- State preservation is complex
- Full reloads are fast for most applications

---

## FAQ

### Q: Can I use Vue syntax in `.fnx` files?

**A:** No. Fynix SFCs use JSX/TSX syntax in the `<view>` block, not Vue template syntax.

```html
<!-- ❌ Wrong - Vue syntax -->
<view>
  <div v-if="show">{{ message }}</div>
</view>

<!-- ✅ Correct - JSX syntax -->
<view>
  {show && <div>{message}</div>}
</view>
```

---

### Q: Can I import other components in the logic block?

**A:** Yes, import them normally.

```html
<logic setup="ts">
import Button from './Button.fnx';
import Card from './Card.fnx';
</logic>

<view>
  <Card>
    <Button onClick={handleClick}>Click me</Button>
  </Card>
</view>
```

---

### Q: How do I pass props to components?

**A:** Components are functions, pass props as arguments.

```typescript
// MyComponent.fnx
<view>
  <h1>{props.title}</h1>
</view>

// Usage
import MyComponent from './MyComponent.fnx';
const component = MyComponent({ title: 'Hello' });
```

---

### Q: Can I use CSS preprocessors?

**A:** Not directly in `.fnx` files. Use separate `.scss` files or Vite plugins.

```html
<!-- ❌ Not supported -->
<style scoped lang="scss">
$color: blue;
.button { color: $color; }
</style>

<!-- ✅ Alternative: Import external styles -->
<logic setup="ts">
import './styles.scss';
</logic>
```

---

### Q: How do I handle global state?

**A:** Create a separate state management file.

```typescript
// store.ts
import { useState } from '@fynixorg/ui';

export const globalCount = useState(0);
export const user = useState(null);
```

```html
<!-- Component.fnx -->
<logic setup="ts">
import { globalCount } from './store';

function increment() {
  globalCount.value++;
}
</logic>

<view>
  <div>{globalCount.value}</div>
  <button onClick={increment}>+</button>
</view>
```

---

### Q: Can I use async/await in the logic block?

**A:** Yes, for functions. Not for top-level await.

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';

const data = useState(null);

// ✅ Async function
async function fetchData() {
  const response = await fetch('/api/data');
  data.value = await response.json();
}

// ❌ Top-level await not supported
// const data = await fetch('/api/data');
</logic>
```

---

### Q: How do I test components?

**A:** Import and test like regular functions.

```typescript
// Component.test.ts
import { describe, it, expect } from 'vitest';
import Counter from './Counter.fnx';

describe('Counter', () => {
  it('should render', () => {
    const component = Counter();
    expect(component).toBeDefined();
  });
});
```

---

### Q: Can I use third-party UI libraries?

**A:** Yes, import them normally.

```html
<logic setup="ts">
import { Button } from 'some-ui-library';
</logic>

<view>
  <div>
    <Button>Click me</Button>
  </div>
</view>
```

---

### Q: How do I optimize bundle size?

**A:**

1. Use tree-shaking friendly imports:
```typescript
// ✅ Good
import { useState } from '@fynixorg/ui';

// ❌ Avoid
import * as Fynix from '@fynixorg/ui';
```

2. Enable minification:
```typescript
fynixPlugin({
  esbuildOptions: {
    minify: true
  }
})
```

3. Use code splitting:
```typescript
// Lazy load components
const HeavyComponent = () => import('./HeavyComponent.fnx');
```

---

### Q: Does the plugin work with TypeScript strict mode?

**A:** Yes, but you may need to adjust compiler options:

```typescript
fynixPlugin({
  typeCheck: true,
  tsConfig: {
    strict: true,
    // Adjust as needed:
    noImplicitAny: false,
    strictNullChecks: false
  }
})
```

---

### Q: Can I use the plugin with React?

**A:** The plugin is designed for the Fynix framework, which is React-like but not React itself. The JSX syntax is similar, but the runtime is different.

---

### Q: How do I debug generated code?

**A:** Enable `showGeneratedCode`:

```typescript
fynixPlugin({
  showGeneratedCode: true
})
```

This will print the transformed code to the console for inspection.

---

### Q: What's the difference between `.fnx` and `.tsx`?

**A:**

| Feature | `.fnx` | `.tsx` |
|---------|--------|--------|
| Structure | Three sections (logic, view, style) | Single file |
| Styles | Inline with scoping | External or CSS-in-JS |
| Meta tags | Built-in support | Manual |
| Organization | Enforced separation | Free-form |

---

### Q: Can I disable source maps?

**A:** Yes:

```typescript
fynixPlugin({
  sourcemap: false
})
```

Note: This makes debugging harder.

---

### Q: How do I handle environment variables?

**A:** Use Vite's built-in support:

```html
<logic setup="ts">
const API_URL = import.meta.env.VITE_API_URL;
const IS_DEV = import.meta.env.DEV;
</logic>
```

---

## Still Having Issues?

If your issue isn't covered here:

1. **Check the logs**: Look for error messages in the console
2. **Enable debug mode**: `showGeneratedCode: true`
3. **Check GitHub Issues**: [github.com/fynixorg/vite-plugin-fynix-sfc/issues](https://github.com/fynixorg/vite-plugin-fynix-sfc/issues)
4. **Ask for help**: [Discord Community](https://discord.gg/fynix)

When reporting issues, include:
- Plugin version
- Vite version
- Node version
- Minimal reproduction code
- Full error message
- Generated code (if applicable)

---

**Last Updated:** January 2026