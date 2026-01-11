# Fynix Runtime

The core runtime engine for the Fynix framework, providing virtual DOM rendering, reactive state management, component lifecycle, and event handling.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Virtual DOM](#virtual-dom)
- [Component System](#component-system)
- [Hook System](#hook-system)
- [Event System](#event-system)
- [Security Features](#security-features)
- [Memory Management](#memory-management)
- [API Reference](#api-reference)

## Overview

The Fynix runtime (`runtime.js`) is a lightweight, production-ready framework core that handles:

- **Virtual DOM creation and reconciliation**
- **Component lifecycle management**
- **Reactive state subscriptions**
- **Event delegation**
- **Memory leak prevention**
- **Error boundaries**
- **Hot Module Replacement (HMR)**

### Key Features

✅ **WeakMap-based component storage** - Automatic garbage collection  
✅ **Debounced rerenders** - Prevents excessive updates  
✅ **Race condition prevention** - Manages concurrent render attempts  
✅ **Keyed reconciliation** - Efficient list updates  
✅ **Event delegation** - Single listener per event type  
✅ **Security built-in** - XSS prevention, safe attributes  
✅ **Async component support** - Code splitting ready  

## Core Concepts

### Virtual Node (VNode)

A virtual node is a JavaScript object representing a DOM element:

```javascript
{
  type: 'div',              // Element type or component function
  props: {                  // Properties and attributes
    class: 'container',
    children: [...]
  },
  key: null,               // Optional key for reconciliation
  _domNode: null,          // Reference to actual DOM node
  _rendered: null,         // For components: rendered vnode
  _cleanup: null           // Cleanup function for subscriptions
}
```

### Component Context

Each component instance maintains a context object:

```javascript
{
  hooks: [],                    // Hook state array
  hookIndex: 0,                 // Current hook position
  effects: [],                  // Effect callbacks
  cleanups: [],                 // Cleanup functions
  _vnode: vnode,                // Reference to component vnode
  _accessedStates: Set,         // Tracked reactive states
  _subscriptions: Set,          // Active subscriptions
  _subscriptionCleanups: [],    // Unsubscribe functions
  version: 0,                   // Render version counter
  rerender: null,               // Rerender function
  Component: Function,          // Component function
  _isMounted: false,            // Mount status
  _isRerendering: false         // Rerender status
}
```

## Virtual DOM

### Element Creation

The `h()` function creates virtual nodes with JSX-like syntax:

```javascript
import { h } from 'fynix';

// Create elements
const vnode = h('div', { class: 'container' },
  h('h1', {}, 'Title'),
  h('p', {}, 'Paragraph')
);

// With reactive state
const [count] = nixState(0);
const countNode = h('span', {}, count); // Automatically reactive
```

### Fragments

Fragments allow multiple children without wrapper elements:

```javascript
import { Fragment } from 'fynix';

h(Fragment, {},
  h('li', {}, 'Item 1'),
  h('li', {}, 'Item 2')
);
```

### Text Nodes

Text nodes support reactive state:

```javascript
const [name] = nixState('John');

// Reactive text node
const textVNode = createTextVNode(name);

// Automatically updates when name changes
name.value = 'Jane';
```

## Component System

### Component Lifecycle

1. **Mount Phase**
   - Component function called
   - Context created (if first render)
   - Hooks executed in order
   - State accesses tracked
   - Subscriptions created
   - DOM created

2. **Update Phase**
   - State changes trigger rerender
   - Rerender debounced (0ms timeout)
   - Race conditions prevented
   - New vnode created
   - DOM patched with minimal changes

3. **Unmount Phase**
   - Component marked as unmounted
   - All subscriptions cleaned up
   - Effect cleanups executed
   - DOM nodes removed
   - Context deleted

### Component Instance Management

Components are stored in a **WeakMap** for automatic garbage collection:

```javascript
const componentInstances = new WeakMap();

// Component context lifecycle
beginComponent(vnode)  → Create/retrieve context
  → Execute component
  → Track state access
endComponent()         → Setup subscriptions
  → Store context
```

### Rerender System

Rerenders are **debounced and protected** against race conditions:

```javascript
// Debounced rerender (0ms timeout)
ctx.rerender = () => {
  // Skip if already rerendering
  if (ctx._isRerendering || pendingRerenders.has(ctx)) return;
  
  // Clear pending timeout
  if (rerenderTimeout) clearTimeout(rerenderTimeout);
  
  // Schedule rerender
  rerenderTimeout = setTimeout(() => {
    ctx._isRerendering = true;
    pendingRerenders.add(ctx);
    
    // Perform rerender...
    
    ctx._isRerendering = false;
    pendingRerenders.delete(ctx);
  }, 0);
};
```

## Hook System

### Available Hooks

The runtime exports 20+ hooks:

**State Management:**
- `nixState` - Local component state
- `nixStore` - Global store
- `nixComputed` - Computed values
- `nixRef` - DOM references

**Effects:**
- `nixEffect` - Run on dependency changes
- `nixEffectOnce` - Run once on mount
- `nixEffectAlways` - Run on every render

**Performance:**
- `nixMemo` - Memoize expensive computations
- `nixCallback` - Memoize callback functions
- `nixDebounce` - Debounced functions

**Async:**
- `nixAsync` - Async data fetching
- `nixAsyncCached` - Cached async operations
- `nixAsyncQuery` - Query with dependencies
- `nixAsyncDebounce` - Debounced async operations

**Utilities:**
- `nixPrevious` - Previous value tracking
- `nixInterval` - Interval management
- `nixLocalStorage` - Local storage sync
- `nixForm` - Form handling
- `nixFormAsync` - Async form handling
- `nixLazy` - Lazy component loading
- `nixLazyAsync` - Async lazy loading
- `nixLazyFormAsync` - Lazy form with async

### Hook Rules

Hooks must follow these rules (enforced by `hookIndex`):

1. ✅ Always call hooks in the same order
2. ✅ Only call hooks at the top level
3. ✅ Don't call hooks in loops or conditions
4. ❌ Don't call hooks after early returns

## Event System

### Event Delegation

All events use **delegation** for performance:

```javascript
// Single listener per event type on document
const delegatedEvents = new Map();

document.addEventListener('click', e => {
  // Traverse up to find handler
  let cur = e.target;
  while (cur && cur !== document) {
    const eid = cur._rest_eid;
    const handler = delegatedEvents.get('click').get(eid);
    if (handler) {
      handler(e);
      return;
    }
    cur = cur.parentElement;
  }
});
```

### Event Attributes

Use `r-` prefix for events in JSX:

```javascript
h('button', {
  'r-click': (e) => handleClick(e),
  'r-input': (e) => handleInput(e),
  'r-submit': (e) => handleSubmit(e)
}, 'Submit');
```

### Supported Events

Any DOM event can be delegated:
- Mouse: `r-click`, `r-dblclick`, `r-mouseover`, `r-mouseout`
- Input: `r-input`, `r-change`, `r-focus`, `r-blur`
- Form: `r-submit`, `r-reset`
- Keyboard: `r-keydown`, `r-keyup`, `r-keypress`
- Touch: `r-touchstart`, `r-touchend`, `r-touchmove`

## Security Features

### XSS Prevention

The runtime blocks dangerous operations:

```javascript
// ❌ Blocked - innerHTML/outerHTML
h('div', { innerHTML: userContent }); 
// Console warning: "innerHTML/outerHTML not allowed"

// ✅ Safe - textContent or children
h('div', {}, userContent);
```

### Protocol Filtering

Dangerous protocols are blocked:

```javascript
// ❌ Blocked - javascript: protocol
h('a', { href: 'javascript:alert(1)' });
// Console warning: "javascript: protocol blocked"

// ✅ Safe protocols
h('a', { href: '/page' });
h('a', { href: 'https://example.com' });
```

### Attribute Sanitization

- Boolean attributes properly set/removed
- Data and ARIA attributes validated
- DOM properties handled separately
- Special attributes (style, class) sanitized

## Memory Management

### Automatic Cleanup

The runtime prevents memory leaks through:

1. **WeakMap Component Storage**
   - Components garbage collected when vnodes destroyed
   - No manual cleanup needed

2. **Subscription Tracking**
   ```javascript
   // All subscriptions stored and cleaned up
   ctx._subscriptionCleanups.push(unsub);
   
   // On unmount
   ctx._subscriptionCleanups.forEach(u => u());
   ```

3. **Effect Cleanup**
   ```javascript
   // User-defined cleanups executed
   ctx.cleanups.forEach(cleanup => cleanup?.());
   ```

4. **Event Cleanup**
   ```javascript
   // Event handlers removed
   const eid = el._rest_eid;
   delegatedEvents.forEach(map => map.delete(eid));
   ```

5. **Reactive Class Cleanup**
   ```javascript
   // Reactive attribute subscriptions cleaned
   el._fynixCleanups.forEach(cleanup => cleanup());
   ```

### Race Condition Prevention

```javascript
// Prevent concurrent rerenders
const pendingRerenders = new WeakSet();

if (ctx._isRerendering || pendingRerenders.has(ctx)) {
  return; // Skip this rerender
}

pendingRerenders.add(ctx);
// ... perform rerender ...
pendingRerenders.delete(ctx);
```

## API Reference

### Core Functions

#### `h(type, props, ...children)`
Create a virtual node.

**Parameters:**
- `type` - Element tag, component function, or Fragment
- `props` - Properties and attributes object
- `children` - Child elements (variadic)

**Returns:** Virtual node object

```javascript
h('div', { class: 'box' }, 
  h('span', {}, 'Text')
);
```

#### `mount(AppComponent, root, hydrate?, props?)`
Mount application to DOM.

**Parameters:**
- `AppComponent` - Root component function
- `root` - CSS selector or DOM element
- `hydrate` - (Optional) Enable hydration
- `props` - (Optional) Initial props

```javascript
mount(App, '#app-root');
```

#### `patch(parent, newVNode, oldVNode)`
Update DOM based on vnode differences.

**Parameters:**
- `parent` - Parent DOM node
- `newVNode` - New virtual node
- `oldVNode` - Old virtual node

**Returns:** Promise<void>

```javascript
await patch(parentEl, newVNode, oldVNode);
```

#### `renderComponent(Component, props)`
Safely render a component.

**Parameters:**
- `Component` - Component function
- `props` - Component props

**Returns:** Rendered virtual node

```javascript
const vnode = renderComponent(MyComponent, { title: 'Hello' });
```

### Element Properties

#### Standard Attributes
```javascript
h('input', {
  type: 'text',
  placeholder: 'Enter text',
  disabled: false,
  value: 'initial'
});
```

#### Boolean Attributes
Auto-handled: `checked`, `selected`, `disabled`, `readonly`, `multiple`, `autoplay`, `controls`, `loop`, `muted`, `open`, `required`, `autofocus`

```javascript
h('input', { 
  checked: true,    // Set as checked=""
  disabled: false   // Removed
});
```

#### DOM Properties
Direct property access: `value`, `checked`, `selected`, `selectedIndex`, `innerHTML`, `textContent`, `innerText`

```javascript
h('input', { 
  value: 'text'  // Sets el.value directly
});
```

#### Data & ARIA Attributes
```javascript
h('div', {
  'data-id': '123',
  'aria-label': 'Close button'
});
```

#### Style Objects
```javascript
h('div', {
  style: {
    color: 'red',
    fontSize: '16px',
    marginTop: '10px'
  }
});
```

#### Reactive Classes
```javascript
const [isActive] = nixState(true);

h('div', { 
  'r-class': isActive.value ? 'active' : 'inactive' 
});

// Or shorthand with reactive state
h('div', { rc: isActive });
```

### Special Symbols

#### `TEXT`
Symbol for text nodes.

```javascript
const textVNode = {
  type: TEXT,
  props: { nodeValue: 'Hello' }
};
```

#### `Fragment`
Symbol for fragments (no wrapper element).

```javascript
h(Fragment, {},
  h('li', {}, 'Item 1'),
  h('li', {}, 'Item 2')
);
```

### Constants

#### `BOOLEAN_ATTRS`
Set of HTML boolean attributes automatically handled.

#### `DOM_PROPERTIES`
Set of properties accessed directly on elements.

### Error Handling

Errors are caught and displayed:

```javascript
try {
  Component(props);
} catch (err) {
  console.error("[Fynix] Component render error:", err);
  showErrorOverlay(err);
  return h('div', { style: 'color:red' }, `Error: ${err.message}`);
}
```

### Hot Module Replacement

HMR automatically wired up in development:

```javascript
if (import.meta.hot) {
  window.__fynix__.hmr = async ({ mod }) => {
    const UpdatedComponent = mod.App || mod.default;
    if (UpdatedComponent) {
      Component = UpdatedComponent;
      window.__fynix__.rerender?.();
    }
  };
  import.meta.hot.accept();
}
```

## Performance Characteristics

### Time Complexity

- **Element creation**: O(n) where n = total nodes
- **Keyed reconciliation**: O(n) where n = children count
- **Non-keyed reconciliation**: O(n)
- **Event delegation**: O(h) where h = DOM height
- **Component lookup**: O(1) (WeakMap)

### Space Complexity

- **Component contexts**: O(c) where c = component count
- **Event handlers**: O(e) where e = unique event types
- **Subscriptions**: O(s) where s = state accesses

### Optimizations

1. **Debounced rerenders** - Batches state updates
2. **WeakMap storage** - Automatic memory cleanup
3. **Event delegation** - Reduces listener count
4. **Keyed reconciliation** - Minimal DOM operations
5. **Early bailouts** - Skips unnecessary updates

## Browser Requirements

- ES6+ support (classes, arrow functions, destructuring)
- Promise API
- WeakMap and WeakSet
- Symbol support
- Proxy support (for reactive state)
- queueMicrotask (fallback to setTimeout)

## Debugging Tips

### Component Rerenders
```javascript
// Add to component
nixEffect(() => {
  console.log('Component rendered', Date.now());
}, []);
```

### State Tracking
```javascript
const [count, setCount] = nixState(0);
console.log('State created:', count);
```

### Event Issues
Check delegated events map in console:
```javascript
// In browser console
window.__fynixDebug = delegatedEvents;
```

### Memory Leaks
Monitor component instances:
```javascript
// Components should be garbage collected
// when vnodes are removed
```

## Common Patterns

### Conditional Rendering
```javascript
condition && h('div', {}, 'Shown')
condition ? h('div', {}, 'A') : h('div', {}, 'B')
```

### List Rendering
```javascript
items.map(item => 
  h('li', { key: item.id }, item.name)
)
```

### Component Composition
```javascript
function Parent() {
  return h('div', {},
    h(Child, { prop: 'value' })
  );
}
```

### Error Boundaries
```javascript
try {
  return h(Component, props);
} catch (err) {
  return h('div', {}, 'Error occurred');
}
```

## Known Limitations

1. **No SSR support** - Client-side only
2. **No Concurrent Mode** - Single-threaded rendering
3. **No Suspense** - Except via `nixLazy`
4. **No Context API** - Use global stores instead
5. **No Portals** - Direct DOM manipulation needed

## Conclusion

The Fynix runtime provides a solid foundation for building reactive web applications with:

- ✅ Efficient virtual DOM
- ✅ Automatic memory management
- ✅ Built-in security
- ✅ Rich hook system
- ✅ Event delegation
- ✅ HMR support

For routing capabilities, see the separate router documentation.