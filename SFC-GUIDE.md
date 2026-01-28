# Single File Component (SFC) Guide

Complete guide to writing Fynix Single File Components.

---

## Table of Contents

- [Introduction](#introduction)
- [File Structure](#file-structure)
- [Logic Block](#logic-block)
- [View Block](#view-block)
- [Style Block](#style-block)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Migration Guide](#migration-guide)

---

## Introduction

Fynix Single File Components (SFCs) provide a Vue-like development experience for React-style components. Each `.fnx` file encapsulates logic, view, and styles in a single, organized structure.

### Why Use SFCs?

- **Colocation**: Keep related code together
- **Scoped Styles**: Prevent CSS conflicts
- **Type Safety**: Full TypeScript support
- **SEO Friendly**: Built-in meta tag injection
- **Developer Experience**: Clean separation of concerns

---

## File Structure

### Basic Template

```html
<logic setup="ts">
  // Imports, state, functions
</logic>

<view>
  // JSX/TSX template
</view>

<style scoped>
  /* Component styles */
</style>
```

### Minimal Component

```html
<view>
  <div>Hello, World!</div>
</view>
```

### Full Component

```html
<logic setup="ts">
import { useState, useEffect } from '@fynixorg/ui';
import type { User } from './types';

const user = useState<User | null>(null);

async function loadUser() {
  const response = await fetch('/api/user');
  user.value = await response.json();
}

export const meta = {
  title: 'User Profile',
  description: 'View and edit user profile'
};
</logic>

<view>
  <div class="profile">
    {user.value ? (
      <h1>{user.value.name}</h1>
    ) : (
      <button onClick={loadUser}>Load User</button>
    )}
  </div>
</view>

<style scoped>
.profile {
  padding: 2rem;
  background: white;
  border-radius: 8px;
}
</style>
```

---

## Logic Block

The `<logic>` block contains component state, functions, imports, and exports.

### Attributes

#### `setup="ts"` (TypeScript)

Use TypeScript for type safety.

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';

interface User {
  id: number;
  name: string;
  email: string;
}

const user = useState<User | null>(null);
const loading = useState<boolean>(false);

async function fetchUser(id: number): Promise<void> {
  loading.value = true;
  const response = await fetch(`/api/users/${id}`);
  user.value = await response.json();
  loading.value = false;
}
</logic>
```

#### `setup="js"` (JavaScript)

Use plain JavaScript when types aren't needed.

```html
<logic setup="js">
import { useState } from '@fynixorg/ui';

const count = useState(0);

function increment() {
  count.value++;
}

function decrement() {
  count.value--;
}

function reset() {
  count.value = 0;
}
</logic>
```

### Imports

All imports go at the top of the logic block.

```html
<logic setup="ts">
// External packages
import { useState, useEffect, computed } from '@fynixorg/ui';

// Type imports
import type { User, Post, Comment } from './types';

// Utility functions
import { formatDate, capitalize } from './utils';

// Components
import { Button, Card, Modal } from './components';

// Constants
import { API_URL, MAX_ITEMS } from './constants';
</logic>
```

### State Management

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';

// Primitive state
const count = useState<number>(0);
const name = useState<string>('');
const isOpen = useState<boolean>(false);

// Array state
const items = useState<string[]>([]);

// Object state
const user = useState<User>({
  id: 1,
  name: 'John Doe',
  email: 'john@example.com'
});

// Null state
const data = useState<Data | null>(null);
</logic>
```

### Computed Values

```html
<logic setup="ts">
import { useState, computed } from '@fynixorg/ui';

const firstName = useState('John');
const lastName = useState('Doe');

// Computed full name
const fullName = computed(() => {
  return `${firstName.value} ${lastName.value}`;
});

const items = useState([1, 2, 3, 4, 5]);

// Computed filtered list
const evenItems = computed(() => {
  return items.value.filter(item => item % 2 === 0);
});
</logic>
```

### Effects

```html
<logic setup="ts">
import { useState, useEffect } from '@fynixorg/ui';

const userId = useState<number>(1);
const user = useState<User | null>(null);

// Run on mount
useEffect(() => {
  console.log('Component mounted');
  return () => console.log('Component unmounted');
}, []);

// Run when userId changes
useEffect(() => {
  async function loadUser() {
    const response = await fetch(`/api/users/${userId.value}`);
    user.value = await response.json();
  }
  loadUser();
}, [userId.value]);
</logic>
```

### Functions

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';

const count = useState(0);

// Regular function
function increment() {
  count.value++;
}

// Arrow function
const decrement = () => {
  count.value--;
};

// Async function
async function saveData() {
  const response = await fetch('/api/save', {
    method: 'POST',
    body: JSON.stringify({ count: count.value })
  });
  return response.json();
}

// Function with parameters
function updateCount(newValue: number) {
  count.value = newValue;
}

// Function returning value
function getDoubleCount(): number {
  return count.value * 2;
}
</logic>
```

### Exports

Export constants, functions, or metadata from your component.

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';

const count = useState(0);

// Export constants
export const VERSION = '1.0.0';
export const MAX_COUNT = 100;

// Export functions
export function getCount() {
  return count.value;
}

export function resetCount() {
  count.value = 0;
}

// Export metadata for SEO
export const meta = {
  title: 'Counter App',
  description: 'A simple counter application',
  keywords: 'counter, react, typescript',
  ogTitle: 'Counter App - Fynix Framework',
  ogDescription: 'Interactive counter application',
  ogImage: 'https://example.com/counter.jpg'
};

// Export types
export type CounterState = {
  value: number;
  max: number;
};
</logic>
```

---

## View Block

The `<view>` block contains the component's JSX/TSX template. This block is **required**.

### Basic Elements

```html
<view>
  <div>
    <h1>Title</h1>
    <p>Paragraph text</p>
    <button>Click me</button>
  </div>
</view>
```

### Dynamic Content

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';

const name = useState('World');
const count = useState(0);
</logic>

<view>
  <div>
    <h1>Hello, {name.value}!</h1>
    <p>Count: {count.value}</p>
  </div>
</view>
```

### Conditional Rendering

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';

const isLoggedIn = useState(false);
const user = useState(null);
const loading = useState(false);
</logic>

<view>
  <div>
    {/* Ternary operator */}
    {isLoggedIn.value ? (
      <p>Welcome back!</p>
    ) : (
      <p>Please log in</p>
    )}
    
    {/* Logical AND */}
    {user.value && <p>Hello, {user.value.name}</p>}
    
    {/* Multiple conditions */}
    {loading.value ? (
      <div>Loading...</div>
    ) : user.value ? (
      <div>Loaded: {user.value.name}</div>
    ) : (
      <div>No data</div>
    )}
  </div>
</view>
```

### List Rendering

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';

const items = useState(['Apple', 'Banana', 'Cherry']);
const users = useState([
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' },
  { id: 3, name: 'Bob' }
]);
</logic>

<view>
  <div>
    {/* Simple list */}
    <ul>
      {items.value.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
    
    {/* Object list */}
    <ul>
      {users.value.map(user => (
        <li key={user.id}>
          {user.name}
        </li>
      ))}
    </ul>
    
    {/* Empty state */}
    {items.value.length === 0 ? (
      <p>No items</p>
    ) : (
      <ul>
        {items.value.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    )}
  </div>
</view>
```

### Event Handling

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';

const count = useState(0);
const inputValue = useState('');

function increment() {
  count.value++;
}

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  inputValue.value = target.value;
}

function handleSubmit(e: Event) {
  e.preventDefault();
  console.log('Submitted:', inputValue.value);
}
</logic>

<view>
  <div>
    {/* Click event */}
    <button onClick={increment}>
      Count: {count.value}
    </button>
    
    {/* Input event */}
    <input
      type="text"
      value={inputValue.value}
      onInput={handleInput}
    />
    
    {/* Form submit */}
    <form onSubmit={handleSubmit}>
      <input type="text" value={inputValue.value} onInput={handleInput} />
      <button type="submit">Submit</button>
    </form>
    
    {/* Inline handler */}
    <button onClick={() => count.value++}>
      Increment
    </button>
  </div>
</view>
```

### Component Composition

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';
import { Button, Card, Modal } from './components';

const isOpen = useState(false);
</logic>

<view>
  <div>
    <Card title="Welcome">
      <p>This is a card component</p>
      <Button onClick={() => isOpen.value = true}>
        Open Modal
      </Button>
    </Card>
    
    <Modal isOpen={isOpen.value} onClose={() => isOpen.value = false}>
      <h2>Modal Content</h2>
      <p>This is a modal</p>
    </Modal>
  </div>
</view>
```

### Props Access

```html
<logic setup="ts">
// Props are available via the component function parameter
// Note: Transform adds props = {} by default
</logic>

<view>
  <div>
    <h1>{props.title || 'Default Title'}</h1>
    <p>{props.description}</p>
    {props.children}
  </div>
</view>
```

---

## Style Block

The `<style>` block contains CSS styles for your component.

### Global Styles

```html
<style>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
}

.button {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

### Scoped Styles

Add the `scoped` attribute to limit styles to this component only.

```html
<style scoped>
/* These styles only apply to this component */
.container {
  padding: 2rem;
  background: white;
}

h1 {
  color: blue; /* Won't affect h1 in other components */
}

.button {
  background: green; /* Component-specific button style */
}
</style>
```

### How Scoping Works

When you use `scoped`, the plugin:

1. Generates a unique ID based on the file path
2. Wraps the component view in a div with a data attribute
3. Prefixes all CSS selectors with the data attribute

**Input:**

```html
<style scoped>
.button {
  color: blue;
}
</style>
```

**Generated Code:**

```javascript
// Scoped styles
const styleId = 'fynix-abc123';
const css = '[data-fynix-abc123] .button { color: blue; }';

// Wrapped view
<div data-fynix-abc123="">
  <button class="button">Click</button>
</div>
```

### Pseudo-classes and Pseudo-elements

Scoped styles work with pseudo-classes and pseudo-elements:

```html
<style scoped>
.button:hover {
  background: red;
}

.button::before {
  content: '→ ';
}

.input:focus {
  border-color: blue;
}

.item:first-child {
  margin-top: 0;
}

.item:nth-child(2n) {
  background: #f5f5f5;
}
</style>
```

### Media Queries

Media queries are preserved as-is:

```html
<style scoped>
.container {
  padding: 1rem;
}

@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 3rem;
  }
}
</style>
```

### Animations and Keyframes

```html
<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-in;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
```

### CSS Variables

```html
<style scoped>
.theme {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --spacing: 1rem;
}

.button {
  background: var(--primary-color);
  padding: var(--spacing);
}

.badge {
  background: var(--secondary-color);
  padding: calc(var(--spacing) / 2);
}
</style>
```

### Complex Selectors

```html
<style scoped>
/* Descendant selectors */
.card .header {
  font-weight: bold;
}

/* Child selectors */
.list > li {
  margin-bottom: 0.5rem;
}

/* Adjacent sibling */
h1 + p {
  margin-top: 0;
}

/* General sibling */
h1 ~ p {
  color: gray;
}

/* Attribute selectors */
input[type="text"] {
  border: 1px solid #ddd;
}

/* Multiple classes */
.button.primary {
  background: blue;
}
</style>
```

---

## Advanced Patterns

### Form Handling

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';

interface FormData {
  name: string;
  email: string;
  message: string;
}

const form = useState<FormData>({
  name: '',
  email: '',
  message: ''
});

const errors = useState<Partial<FormData>>({});
const submitting = useState(false);

function updateField(field: keyof FormData, value: string) {
  form.value = { ...form.value, [field]: value };
  // Clear error when user types
  if (errors.value[field]) {
    errors.value = { ...errors.value, [field]: undefined };
  }
}

function validate(): boolean {
  const newErrors: Partial<FormData> = {};
  
  if (!form.value.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!form.value.email.includes('@')) {
    newErrors.email = 'Invalid email';
  }
  
  if (form.value.message.length < 10) {
    newErrors.message = 'Message must be at least 10 characters';
  }
  
  errors.value = newErrors;
  return Object.keys(newErrors).length === 0;
}

async function handleSubmit(e: Event) {
  e.preventDefault();
  
  if (!validate()) return;
  
  submitting.value = true;
  
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    });
    
    if (response.ok) {
      // Reset form
      form.value = { name: '', email: '', message: '' };
      alert('Message sent!');
    }
  } catch (error) {
    alert('Failed to send message');
  } finally {
    submitting.value = false;
  }
}
</logic>

<view>
  <form class="contact-form" onSubmit={handleSubmit}>
    <div class="field">
      <label>Name</label>
      <input
        type="text"
        value={form.value.name}
        onInput={(e) => updateField('name', e.target.value)}
      />
      {errors.value.name && <span class="error">{errors.value.name}</span>}
    </div>
    
    <div class="field">
      <label>Email</label>
      <input
        type="email"
        value={form.value.email}
        onInput={(e) => updateField('email', e.target.value)}
      />
      {errors.value.email && <span class="error">{errors.value.email}</span>}
    </div>
    
    <div class="field">
      <label>Message</label>
      <textarea
        value={form.value.message}
        onInput={(e) => updateField('message', e.target.value)}
      />
      {errors.value.message && <span class="error">{errors.value.message}</span>}
    </div>
    
    <button type="submit" disabled={submitting.value}>
      {submitting.value ? 'Sending...' : 'Send Message'}
    </button>
  </form>
</view>

<style scoped>
.contact-form {
  max-width: 500px;
  margin: 2rem auto;
}

.field {
  margin-bottom: 1rem;
}

.field label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.field input,
.field textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.error {
  color: red;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}

button {
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

### Data Fetching

```html
<logic setup="ts">
import { useState, useEffect } from '@fynixorg/ui';

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

const posts = useState<Post[]>([]);
const loading = useState(true);
const error = useState<string | null>(null);
const page = useState(1);
const hasMore = useState(true);

async function fetchPosts() {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await fetch(
      `https://jsonplaceholder.typicode.com/posts?_page=${page.value}&_limit=10`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      hasMore.value = false;
    } else {
      posts.value = [...posts.value, ...data];
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  page.value++;
  fetchPosts();
}

// Load initial posts
useEffect(() => {
  fetchPosts();
}, []);
</logic>

<view>
  <div class="posts-list">
    <h1>Posts</h1>
    
    {error.value && (
      <div class="error">Error: {error.value}</div>
    )}
    
    <div class="posts">
      {posts.value.map(post => (
        <div key={post.id} class="post">
          <h2>{post.title}</h2>
          <p>{post.body}</p>
        </div>
      ))}
    </div>
    
    {loading.value && <div class="loading">Loading...</div>}
    
    {!loading.value && hasMore.value && (
      <button onClick={loadMore}>Load More</button>
    )}
    
    {!hasMore.value && <p>No more posts</p>}
  </div>
</view>

<style scoped>
.posts-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.error {
  padding: 1rem;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.posts {
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
}

.post {
  padding: 1.5rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.post h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.post p {
  margin: 0;
  color: #666;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

button {
  width: 100%;
  padding: 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  background: #0056b3;
}
</style>
```

### Modal Component

```html
<logic setup="ts">
import { useState, useEffect } from '@fynixorg/ui';

const isOpen = useState(false);
const title = useState('Modal Title');
const content = useState('Modal content goes here...');

function open(newTitle?: string, newContent?: string) {
  if (newTitle) title.value = newTitle;
  if (newContent) content.value = newContent;
  isOpen.value = true;
}

function close() {
  isOpen.value = false;
}

function handleOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    close();
  }
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    close();
  }
}

useEffect(() => {
  if (isOpen.value) {
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
  } else {
    document.removeEventListener('keydown', handleEscape);
    document.body.style.overflow = '';
  }
  
  return () => {
    document.removeEventListener('keydown', handleEscape);
    document.body.style.overflow = '';
  };
}, [isOpen.value]);

export { open, close };
</logic>

<view>
  {isOpen.value && (
    <div class="modal-overlay" onClick={handleOverlayClick}>
      <div class="modal">
        <div class="modal-header">
          <h2>{title.value}</h2>
          <button class="close-button" onClick={close}>×</button>
        </div>
        <div class="modal-body">
          <p>{content.value}</p>
        </div>
        <div class="modal-footer">
          <button onClick={close}>Close</button>
        </div>
      </div>
    </div>
  )}
</view>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #999;
  line-height: 1;
}

.close-button:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #eee;
  text-align: right;
}

.modal-footer button {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

---

## Best Practices

### 1. Use TypeScript for Type Safety

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';

interface User {
  id: number;
  name: string;
  email: string;
}

const user = useState<User | null>(null);
</logic>
```

### 2. Scope Styles by Default

```html
<style scoped>
/* Prevents CSS conflicts */
</style>
```

### 3. Export Meta for SEO

```html
<logic setup="ts">
export const meta = {
  title: 'Page Title',
  description: 'Page description',
  keywords: 'keyword1, keyword2'
};
</logic>
```

### 4. Handle Loading and Error States

```html
<logic setup="ts">
const loading = useState(false);
const error = useState<string | null>(null);
</logic>

<view>
  {loading.value && <div>Loading...</div>}
  {error.value && <div class="error">{error.value}</div>}
  {/* Main content */}
</view>
```

### 5. Clean Up Effects

```html
<logic setup="ts">
useEffect(() => {
  const interval = setInterval(() => {
    // Do something
  }, 1000);
  
  return () => clearInterval(interval);
}, []);
</logic>
```

### 6. Validate Forms

```html
<logic setup="ts">
function validate() {
  const errors = {};
  if (!form.value.email.includes('@')) {
    errors.email = 'Invalid email';
  }
  return errors;
}
</logic>
```

---

## Common Patterns

See complete examples in the [Advanced Patterns](#advanced-patterns) section above.

---

## Migration Guide

### From React Components

**Before (React):**

```tsx
import React, { useState } from 'react';
import './Button.css';

interface Props {
  label: string;
  onClick: () => void;
}

export const Button: React.FC<Props> = ({ label, onClick }) => {
  const [clicked, setClicked] = useState(false);
  
  const handleClick = () => {
    setClicked(true);
    onClick();
  };
  
  return (
    <button className="button" onClick={handleClick}>
      {clicked ? 'Clicked!' : label}
    </button>
  );
};
```

**After (Fynix SFC):**

```html
<logic setup="ts">
import { useState } from '@fynixorg/ui';

const clicked = useState(false);

function handleClick() {
  clicked.value = true;
  props.onClick();
}
</logic>

<view>
  <button class="button" onClick={handleClick}>
    {clicked.value ? 'Clicked!' : props.label}
  </button>
</view>

<style scoped>
.button {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

### From Vue Components

**Before (Vue):**

```vue
<template>
  <div class="counter">
    <h1>{{ count }}</h1>
    <button @click="increment">Increment</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);

function increment() {
  count.value++;
}
</script>

<style scoped>
.counter {
  padding: 2rem;
}
</style>
```

**After (Fynix SFC):**

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
    <h1>{count.value}</h1>
    <button onClick={increment}>Increment</button>
  </div>
</view>

<style scoped>
.counter {
  padding: 2rem;
}
</style>
```

---

**Last Updated:** January 2026