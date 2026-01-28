# Fynix

A lightweight, reactive JavaScript framework for building modern web applications with JSX support, file-based routing, and a powerful hook system.

## Features

- **Reactive State Management** - Simple hooks like React
- **File-Based Routing** - No route config needed
- **Virtual DOM** - Fast and efficient rendering
- **Security Built-in** - Protected against XSS attacks
- **JSX Support** - Familiar React-like syntax
- **20+ Hooks** - Everything you need built-in
- **Hot Module Replacement** - Instant updates while coding
- **Zero Dependencies** - Lightweight and fast

## Quick Start

### Installation

```bash
npx @fynixorg/cli <app-name>

```

## Best Practices

1. **Always use keys** in lists
2. **Return cleanup** from effects when needed
3. **Use memoization** for expensive calculations
4. **Debounce inputs** that trigger searches
5. **Handle loading/error** states in async operations
6. **Keep components small** and focused
7. **Use global store** for shared state
8. **Add SEO meta** to important pages

## Browser Support

- Modern browsers with ES6+

## Performance Tips

- Use `nixMemo` for expensive computations
- Use `nixCallback` for stable function references
- Use `nixDebounce` for frequent updates
- Add `key` prop to lists
- Use `nixAsyncCached` for repeated API calls
- Keep component trees shallow when possible

## Common Issues

### State not updating?

Make sure you're using `.value`:

```js
//  Wrong
setCount(count + 1);

// Correct
setCount(count.value + 1);
```

### Events not working?

Use `r-` prefix:

```js
// Wrong
<button onClick={...}>

// Correct
<button r-click={...}>
```

### Navigation not working?

Add `data-fynix-link`:

```jsx
//  Wrong
<a href="/page">Link</a>

// Correct
<a href="/page" data-fynix-link>Link</a>
```

## TypeScript Support

Fynix works with TypeScript! Add type definitions for your components:

```typescript
interface Props {
  title: string;
  count: number;
}

function MyComponent({ title, count }: Props) {
  return <div>{title}: {count}</div>;
}
```

## Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## License

MIT License

---

**Happy coding with Fynix! **

For detailed documentation, check out:

- [Runtime Documentation](./RUNTIME.md) - Deep dive into the core
- [Router Documentation](./ROUTER.md) - Routing system details
