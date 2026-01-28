# API Reference

Complete API reference for the Fynix Vite Plugin.

---

## Table of Contents

- [Plugin Export](#plugin-export)
- [Interfaces](#interfaces)
- [Functions](#functions)
- [Classes](#classes)
- [Type Definitions](#type-definitions)

---

## Plugin Export

### `fynixPlugin(options?: FynixPluginOptions)`

Creates and returns a Vite plugin instance configured for Fynix framework development.

**Parameters:**
- `options` (optional): `FynixPluginOptions` - Configuration object

**Returns:**
- Vite plugin object with the following properties:
  - `name`: `"vite-plugin-fynix-sfc"`
  - `enforce`: `"pre"`
  - `transform`: Transform hook
  - `handleHotUpdate`: HMR hook
  - `config`: Vite configuration hook
  - `buildStart`: Build lifecycle hook
  - `buildEnd`: Build lifecycle hook

**Example:**

```typescript
import fynixPlugin from 'vite-plugin-fynix-sfc';

export default {
  plugins: [
    fynixPlugin({
      enableSFC: true,
      typeCheck: true
    })
  ]
};
```

---

## Interfaces

### `FynixPluginOptions`

Configuration options for the Fynix Vite Plugin.

```typescript
interface FynixPluginOptions {
  jsxFactory?: string;
  jsxFragment?: string;
  include?: string[];
  exclude?: string[];
  sourcemap?: boolean;
  esbuildOptions?: Partial<TransformOptions>;
  enableSFC?: boolean;
  debug?: boolean;
  showGeneratedCode?: boolean;
  typeCheck?: boolean;
  tsConfig?: ts.CompilerOptions;
}
```

#### Properties

##### `jsxFactory`
- **Type:** `string`
- **Default:** `"Fynix"`
- **Description:** Name of the JSX factory function used to create elements.

**Example:**
```typescript
fynixPlugin({ jsxFactory: 'h' })
```

##### `jsxFragment`
- **Type:** `string`
- **Default:** `"Fynix.Fragment"`
- **Description:** Name of the JSX fragment factory for rendering fragments.

**Example:**
```typescript
fynixPlugin({ jsxFragment: 'Fragment' })
```

##### `include`
- **Type:** `string[]`
- **Default:** `[".ts", ".js", ".jsx", ".tsx", ".fnx"]`
- **Description:** Array of file extensions to transform.

**Example:**
```typescript
fynixPlugin({
  include: ['.ts', '.tsx', '.fnx']
})
```

##### `exclude`
- **Type:** `string[]`
- **Default:** `["node_modules"]`
- **Description:** Array of path patterns to exclude from transformation.

**Example:**
```typescript
fynixPlugin({
  exclude: ['node_modules', 'dist', 'test']
})
```

##### `sourcemap`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Enable or disable source map generation.

**Example:**
```typescript
fynixPlugin({ sourcemap: false })
```

##### `esbuildOptions`
- **Type:** `Partial<TransformOptions>`
- **Default:** `{}`
- **Description:** Custom esbuild transform options to merge with defaults.

**Example:**
```typescript
fynixPlugin({
  esbuildOptions: {
    target: 'es2020',
    minify: true,
    keepNames: true
  }
})
```

##### `enableSFC`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Enable Single File Component parsing for `.fnx` files.

**Example:**
```typescript
fynixPlugin({ enableSFC: false })
```

##### `debug`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enable debug logging (currently reserved for future use).

**Example:**
```typescript
fynixPlugin({ debug: true })
```

##### `showGeneratedCode`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Display generated component code in console during transformation.

**Example:**
```typescript
fynixPlugin({ showGeneratedCode: true })
```

**Output:**
```
================================================================================
[Fynix SFC] Generated code for: /src/components/Button.fnx
================================================================================
import { Fynix } from '@fynixorg/ui';
...
================================================================================
```

##### `typeCheck`
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enable TypeScript type checking during build. Slower but catches type errors.

**Example:**
```typescript
fynixPlugin({ typeCheck: true })
```

##### `tsConfig`
- **Type:** `ts.CompilerOptions`
- **Default:** `undefined`
- **Description:** Custom TypeScript compiler options to override defaults.

**Example:**
```typescript
fynixPlugin({
  typeCheck: true,
  tsConfig: {
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    target: ts.ScriptTarget.ES2020
  }
})
```

---

### `SFCParsedResult`

Result object from parsing a Single File Component.

```typescript
interface SFCParsedResult {
  logic: string;
  view: string;
  style: string;
  logicLang: "js" | "ts";
  hasLogic: boolean;
  hasView: boolean;
  hasStyle: boolean;
  isStyleScoped: boolean;
  imports: string[];
  exports: string[];
}
```

#### Properties

##### `logic`
- **Type:** `string`
- **Description:** Component logic code (excluding imports and exports)

##### `view`
- **Type:** `string`
- **Description:** JSX/TSX template markup

##### `style`
- **Type:** `string`
- **Description:** CSS styles

##### `logicLang`
- **Type:** `"js" | "ts"`
- **Description:** Language of the logic block (JavaScript or TypeScript)

##### `hasLogic`
- **Type:** `boolean`
- **Description:** Whether the component has a `<logic>` block

##### `hasView`
- **Type:** `boolean`
- **Description:** Whether the component has a `<view>` block (required)

##### `hasStyle`
- **Type:** `boolean`
- **Description:** Whether the component has a `<style>` block

##### `isStyleScoped`
- **Type:** `boolean`
- **Description:** Whether the styles are scoped (has `scoped` attribute)

##### `imports`
- **Type:** `string[]`
- **Description:** Array of import statements from the logic block

##### `exports`
- **Type:** `string[]`
- **Description:** Array of export statements from the logic block

---

### `TransformContext`

Extended Vite transform context with additional methods.

```typescript
interface TransformContext {
  addWatchFile?: (id: string) => void;
  error?: (error: { 
    message: string; 
    stack?: string; 
    id?: string 
  }) => void;
}
```

#### Methods

##### `addWatchFile(id: string)`
- **Description:** Add a file to Vite's watch list for HMR
- **Parameters:**
  - `id`: File path to watch

##### `error(error: object)`
- **Description:** Emit a transformation error
- **Parameters:**
  - `error.message`: Error message
  - `error.stack`: Optional stack trace
  - `error.id`: Optional file identifier

---

## Functions

### `parseSFC(source: string): SFCParsedResult`

Parse a Fynix Single File Component source code into structured sections.

**Parameters:**
- `source`: `string` - Raw `.fnx` file content

**Returns:**
- `SFCParsedResult` - Parsed component sections

**Example:**

```typescript
const source = `
<logic setup="ts">
import { useState } from '@fynixorg/ui';
const count = useState(0);
</logic>

<view>
  <div>{count.value}</div>
</view>

<style scoped>
div { color: blue; }
</style>
`;

const parsed = parseSFC(source);
console.log(parsed.hasView); // true
console.log(parsed.isStyleScoped); // true
console.log(parsed.logicLang); // "ts"
```

**Parsing Rules:**

1. **Logic Block:**
   - Regex: `/<logic\s+setup\s*=\s*["']?(ts|js)["']?\s*>([\s\S]*?)<\/logic>/i`
   - Extracts: imports, exports, and component logic
   - Supports multi-line exports with brace counting

2. **View Block:**
   - Regex: `/<view\s*>([\s\S]*?)<\/view>/i`
   - Required for all components

3. **Style Block:**
   - Regex: `/<style(\s+scoped)?\s*>([\s\S]*?)<\/style>/i`
   - Detects `scoped` attribute

---

### `transformSFC(parsed: SFCParsedResult, filePath: string, jsxFactory: string): string`

Transform parsed SFC result into executable component code.

**Parameters:**
- `parsed`: `SFCParsedResult` - Parsed component structure
- `filePath`: `string` - Source file path (for generating style IDs)
- `jsxFactory`: `string` - JSX factory function name

**Returns:**
- `string` - Generated JavaScript/TypeScript code

**Example:**

```typescript
const parsed = parseSFC(sourceCode);
const transformed = transformSFC(parsed, '/src/App.fnx', 'Fynix');

console.log(transformed);
// Output:
// import { Fynix } from '@fynixorg/ui';
// import { useState } from '@fynixorg/ui';
// ...
// function FynixComponent(props = {}) {
//   const count = useState(0);
//   return (<div>{count.value}</div>);
// }
// export default FynixComponent;
```

**Transformation Steps:**

1. Add JSX factory import
2. Add user imports
3. Inject styles (if present)
4. Add module-level exports
5. Generate component function
6. Add component logic
7. Inject meta tags (if meta export exists)
8. Add view template
9. Export default component

---

### `validateSFC(parsed: SFCParsedResult, filePath: string): void`

Validate SFC structure and throw errors for invalid configurations.

**Parameters:**
- `parsed`: `SFCParsedResult` - Parsed component structure
- `filePath`: `string` - Source file path (for error messages)

**Throws:**
- `Error` - If validation fails

**Validation Rules:**

1. **Missing View Block:**
   ```typescript
   if (!parsed.hasView) {
     throw new Error('Missing <view> block');
   }
   ```

2. **Invalid Setup Attribute:**
   ```typescript
   if (parsed.hasLogic && !['ts', 'js'].includes(parsed.logicLang)) {
     throw new Error('Invalid setup attribute');
   }
   ```

3. **TypeScript Syntax in JavaScript Mode:**
   - Checks for: interfaces, type aliases, type annotations, generics, enums, type assertions, namespaces, abstract classes, access modifiers
   ```typescript
   if (parsed.logicLang === 'js' && hasTypeScriptSyntax) {
     throw new Error('TypeScript syntax detected in setup="js"');
   }
   ```

**Example:**

```typescript
try {
  validateSFC(parsed, '/src/App.fnx');
} catch (error) {
  console.error(error.message);
  // [Fynix SFC] Missing <view> block in /src/App.fnx
}
```

---

### `scopeStyles(css: string, scopeId: string): string`

Scope CSS styles by adding data attribute selectors.

**Parameters:**
- `css`: `string` - Raw CSS code
- `scopeId`: `string` - Unique scope identifier

**Returns:**
- `string` - Scoped CSS code

**Example:**

```typescript
const css = `
.button {
  color: blue;
}

.button:hover {
  color: red;
}
`;

const scoped = scopeStyles(css, 'fynix-abc123');

console.log(scoped);
// [data-fynix-abc123] .button { color: blue; }
// [data-fynix-abc123] .button:hover { color: red; }
```

**Scoping Rules:**

1. Adds `[data-{scopeId}]` prefix to all selectors
2. Preserves pseudo-classes and pseudo-elements
3. Skips at-rules (e.g., `@media`, `@keyframes`)
4. Handles comma-separated selectors

**Special Cases:**

```typescript
// Pseudo-class
'.button:hover' → '[data-scope] .button:hover'

// Pseudo-element
'.button::before' → '[data-scope] .button::before'

// Multiple selectors
'.a, .b' → '[data-scope] .a, [data-scope] .b'

// At-rule (unchanged)
'@media (max-width: 768px) { .a {} }' → '@media (max-width: 768px) { .a {} }'
```

---

### `generateStyleId(filePath: string): string`

Generate a unique hash-based identifier for component styles.

**Parameters:**
- `filePath`: `string` - Component file path

**Returns:**
- `string` - Unique style ID in format `fynix-{hash}`

**Example:**

```typescript
const id1 = generateStyleId('/src/components/Button.fnx');
const id2 = generateStyleId('/src/components/Card.fnx');

console.log(id1); // fynix-1a2b3c
console.log(id2); // fynix-4d5e6f
```

**Algorithm:**

```typescript
function generateStyleId(filePath: string): string {
  let hash = 0;
  for (let i = 0; i < filePath.length; i++) {
    const char = filePath.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `fynix-${Math.abs(hash).toString(36)}`;
}
```

---

## Classes

### `TypeScriptChecker`

Provides TypeScript type checking with virtual file system support.

```typescript
class TypeScriptChecker {
  constructor(customOptions?: ts.CompilerOptions);
  addFile(fileName: string, content: string): void;
  checkFile(fileName: string): string[];
  clear(): void;
}
```

#### Constructor

##### `new TypeScriptChecker(customOptions?: ts.CompilerOptions)`

Create a new TypeScript checker instance.

**Parameters:**
- `customOptions` (optional): `ts.CompilerOptions` - Custom compiler options

**Default Compiler Options:**

```typescript
{
  noEmit: true,
  strict: false,
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  jsx: ts.JsxEmit.Preserve,
  lib: ["lib.es2023.d.ts", "lib.dom.d.ts"],
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  esModuleInterop: true,
  skipLibCheck: true,
  allowSyntheticDefaultImports: true,
  strictNullChecks: false,
  strictFunctionTypes: false,
  noImplicitAny: false,
  allowJs: true,
  checkJs: false,
  resolveJsonModule: true,
  isolatedModules: true
}
```

**Example:**

```typescript
const checker = new TypeScriptChecker({
  strict: true,
  noImplicitAny: true
});
```

#### Methods

##### `addFile(fileName: string, content: string): void`

Add a file to the virtual file system for type checking.

**Parameters:**
- `fileName`: File path identifier
- `content`: File content

**Example:**

```typescript
checker.addFile('/src/App.tsx', `
  const count: number = 0;
  count = "string"; // Type error
`);
```

##### `checkFile(fileName: string): string[]`

Check a file for TypeScript errors.

**Parameters:**
- `fileName`: File path to check

**Returns:**
- `string[]` - Array of error messages (empty if no errors)

**Example:**

```typescript
const errors = checker.checkFile('/src/App.tsx');

if (errors.length > 0) {
  errors.forEach(error => console.error(error));
}

// Output:
// Line 3:3 - Type 'string' is not assignable to type 'number' (TS2322)
```

**Filtered Error Codes:**

The following TypeScript diagnostic codes are automatically filtered out:
- `2307` - Cannot find module
- `2792` - Cannot find name
- `7016` - Could not find declaration file
- `2304` - Cannot find name
- `7026` - JSX element implicitly has type 'any'
- `2874` - Property does not exist on type

##### `clear(): void`

Clear the virtual file system and program cache.

**Example:**

```typescript
checker.clear();
```

**Use Case:**

Called automatically during HMR to reset type checking state:

```typescript
handleHotUpdate(ctx: HmrContext) {
  if (typeChecker) {
    typeChecker.clear();
  }
}
```

---

## Type Definitions

### ANSI Color Codes

Terminal color utilities for formatted output.

```typescript
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m"
};
```

**Usage:**

```typescript
console.log(`${colors.cyan}[Info]${colors.reset} Processing file...`);
console.log(`${colors.red}[Error]${colors.reset} Transformation failed`);
console.log(`${colors.green}[Success]${colors.reset} Build complete`);
```

---

## Plugin Hooks

### `transform(code: string, id: string)`

Transform source code for compatible file types.

**Flow:**

1. Normalize file path
2. Check exclusion patterns
3. Check inclusion patterns
4. Add file to watch list
5. Determine loader type
6. Parse SFC (if `.fnx`)
7. Validate structure
8. Transform to component code
9. Type check (if enabled)
10. Run esbuild transform
11. Return transformed code and source map

**Example Output:**

```typescript
{
  code: "import { Fynix } from '@fynixorg/ui'...",
  map: { /* source map */ }
}
```

---

### `handleHotUpdate(ctx: HmrContext)`

Handle Hot Module Replacement for file changes.

**Behavior:**

- Triggers full-page reload for compatible files
- Clears type checker cache
- Sends reload message to client

**Example:**

```typescript
handleHotUpdate(ctx: HmrContext) {
  const { file, server } = ctx;
  
  if (shouldReload) {
    console.log(`[HMR] ${file}`);
    server.ws.send({ type: 'full-reload', path: '*' });
    return [];
  }
}
```

---

### `config()`

Modify Vite configuration.

**Injected Configuration:**

```typescript
{
  esbuild: {
    jsxFactory: 'Fynix',
    jsxFragment: 'Fynix.Fragment',
    jsxInject: `import { Fynix } from '@fynixorg/ui'`
  },
  optimizeDeps: {
    include: ['@fynixorg/ui'],
    esbuildOptions: {
      jsx: 'transform',
      jsxFactory: 'Fynix',
      jsxFragment: 'Fynix.Fragment'
    }
  },
  resolve: {
    extensions: ['.fnx', '.ts', '.tsx', '.js', '.jsx', '.json']
  }
}
```

---

### `buildStart()`

Lifecycle hook called when build starts.

**Output:**

```
[vite-plugin-fynix-sfc] Initialized
[vite-plugin-fynix-sfc] SFC support: enabled
[vite-plugin-fynix-sfc] Type checking: enabled
```

---

### `buildEnd()`

Lifecycle hook called when build ends.

**Behavior:**

Clears type checker cache to free memory.

---

## Error Messages

### SFC Validation Errors

```typescript
// Missing view block
"[Fynix SFC] Missing <view> block in /path/to/file.fnx. Every .fnx file must have a <view> section."

// Invalid setup attribute
"[Fynix SFC] Invalid setup attribute in <logic> block in /path/to/file.fnx. Must be 'ts' or 'js'."

// TypeScript syntax in JavaScript mode
"[Fynix SFC] TypeScript syntax detected (interface declaration) in /path/to/file.fnx with setup=\"js\".
Either change to setup=\"ts\" or remove TypeScript-specific syntax."
```

### Transform Errors

```typescript
"[Fynix SFC] Transform Error in /path/to/file.fnx:
  Error message here"
```

### Type Checking Errors

```typescript
"[Fynix SFC] TypeScript Errors in /path/to/file.fnx:
  Line 10:5 - Type 'string' is not assignable to type 'number' (TS2322)
  Line 15:10 - Property 'value' does not exist on type 'State' (TS2339)"
```

---

## Complete Example

```typescript
import { defineConfig } from 'vite';
import fynixPlugin from 'vite-plugin-fynix-sfc';

export default defineConfig({
  plugins: [
    fynixPlugin({
      // JSX Configuration
      jsxFactory: 'Fynix',
      jsxFragment: 'Fynix.Fragment',
      
      // File Processing
      include: ['.ts', '.tsx', '.fnx'],
      exclude: ['node_modules', 'dist'],
      
      // Features
      enableSFC: true,
      sourcemap: true,
      
      // Type Checking
      typeCheck: process.env.NODE_ENV === 'production',
      tsConfig: {
        strict: true,
        noImplicitAny: true,
        strictNullChecks: true
      },
      
      // Debug
      debug: false,
      showGeneratedCode: process.env.DEBUG === 'true',
      
      // esbuild
      esbuildOptions: {
        target: 'es2020',
        minify: process.env.NODE_ENV === 'production'
      }
    })
  ]
});
```

---

**Last Updated:** January 2026