# Fynix Core

This is the core package for the Fynix UI framework. It contains the essential runtime, hooks, context, and utilities for building Fynix-based applications.

## Structure
- `runtime.js`: Main runtime logic
- `context/`: Context management
- `custom/`: Custom UI elements
- `error/`: Error overlays and handling
- `fynix/`: Fynix core logic
- `hooks/`: Reactivity and utility hooks
- `plugins/`: Plugins (e.g., Vite integration)
- `router/`: Routing logic
- `types/`: TypeScript type definitions
- `global.d.ts`: Global type extensions

## Usage
Install via npm after publishing:

```sh
npm install fynix-core
```

Then import in your project:

```js
import { ... } from 'fynix-core';
```

## Development
- Ensure all files are included in `package.json`.
- Update type definitions in `global.d.ts` as needed.
- Export all public APIs via the `exports` field in `package.json`.

## License
MIT
