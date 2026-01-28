# Architecture & Internals

Technical deep-dive into the Fynix Vite Plugin architecture and implementation details.

---

## Table of Contents

- [Overview](#overview)
- [Plugin Architecture](#plugin-architecture)
- [Transformation Pipeline](#transformation-pipeline)
- [SFC Parsing](#sfc-parsing)
- [Style Scoping](#style-scoping)
- [Type Checking](#type-checking)
- [Hot Module Replacement](#hot-module-replacement)
- [Performance Considerations](#performance-considerations)
- [Error Handling](#error-handling)

---

## Overview

The Fynix Vite Plugin is a Vite pre-transform plugin that processes `.fnx` files and other JavaScript/TypeScript files, converting them into React-compatible components with optional TypeScript type checking and style scoping.

### Key Components

1. **SFC Parser**: Extracts logic, view, and style sections from `.fnx` files
2. **Validator**: Ensures SFC structure and syntax correctness
3. **Transformer**: Converts SFC to executable JavaScript/TypeScript
4. **Style Scoper**: Adds unique identifiers to CSS selectors
5. **Type Checker**: Optional TypeScript type validation
6. **HMR Handler**: Manages hot module replacement

---

## Plugin Architecture

### Vite Plugin Structure

```typescript
export default function fynixPlugin(options: FynixPluginOptions = {}) {
  return {
    name: "vite-plugin-fynix-sfc",
    enforce: "pre",
    transform(code, id) { /* ... */ },
    handleHotUpdate(ctx) { /* ... */ },
    config() { /* ... */ },
    buildStart() { /* ... */ },
    buildEnd() { /* ... */ }
  };
}
```

### Plugin Lifecycle

```
1. buildStart()
   ↓
2. config() - Modify Vite configuration
   ↓
3. transform() - Transform files during build/dev
   ↓
4. handleHotUpdate() - Handle HMR updates
   ↓
5. buildEnd()
```

### Enforce: Pre

The plugin uses `enforce: "pre"` to run before other plugins, ensuring that:
- `.fnx` files are transformed before other build steps
- JSX/TSX files are processed with custom options
- Type checking happens early in the pipeline

---

## Transformation Pipeline

### High-Level Flow

```
Input File (.fnx, .tsx, .ts, etc.)
         ↓
  Path Normalization
         ↓
  Exclusion Check (node_modules, etc.)
         ↓
  Inclusion Check (.fnx, .ts, .tsx, etc.)
         ↓
  Add to Watch List (HMR)
         ↓
┌────────┴─────────┐
│   Is .fnx file?  │
└────────┬─────────┘
         │
    ┌────┴────┐
    │   Yes   │
    └────┬────┘
         │
    Parse SFC
         │
    Validate Structure
         │
    Transform to Component
         │
    (Optional) Type Check
         ↓
    Determine Loader (tsx/jsx)
         │
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │
    └────┬────┘
         │
    Determine Loader (ts/tsx/jsx/js)
         │
         ↓
  esbuild Transform
         ↓
  Return { code, map }
```

### Transform Function

```typescript
async transform(code: string, id: string) {
  // 1. Normalize path
  const normalizedId = normalizePath(id);
  
  // 2. Check exclusions
  if (exclude.some(pattern => normalizedId.includes(pattern))) {
    return null;
  }
  
  // 3. Check inclusions
  if (!include.some(ext => normalizedId.endsWith(ext))) {
    return null;
  }
  
  // 4. Add to watch list
  if (typeof ctx.addWatchFile === 'function') {
    ctx.addWatchFile(id);
  }
  
  // 5. Process file
  let codeToTransform = code;
  let loader: TransformOptions["loader"] = "tsx";
  
  if (normalizedId.endsWith(".fnx") && enableSFC) {
    // Parse and transform SFC
    const parsed = parseSFC(code);
    validateSFC(parsed, normalizedId);
    codeToTransform = transformSFC(parsed, normalizedId, jsxFactory);
    loader = parsed.logicLang === "ts" ? "tsx" : "jsx";
    
    // Optional type checking
    if (typeCheck && parsed.logicLang === "ts") {
      // ... type checking logic
    }
  } else {
    // Determine loader for regular files
    if (normalizedId.endsWith(".ts")) loader = "ts";
    else if (normalizedId.endsWith(".tsx")) loader = "tsx";
    else if (normalizedId.endsWith(".jsx")) loader = "jsx";
    else if (normalizedId.endsWith(".js")) loader = "js";
  }
  
  // 6. Transform with esbuild
  const result = await transform(codeToTransform, {
    loader,
    jsxFactory,
    jsxFragment,
    sourcemap,
    sourcefile: id,
    target: "esnext",
    format: "esm",
    ...esbuildOptions
  });
  
  return {
    code: result.code,
    map: result.map || null
  };
}
```

---

## SFC Parsing

### Parser Implementation

```typescript
function parseSFC(source: string): SFCParsedResult {
  const result: SFCParsedResult = {
    logic: "",
    view: "",
    style: "",
    logicLang: "ts",
    hasLogic: false,
    hasView: false,
    hasStyle: false,
    isStyleScoped: false,
    imports: [],
    exports: []
  };
  
  // Parse <logic> block
  // Parse <view> block
  // Parse <style> block
  
  return result;
}
```

### Logic Block Parsing

The logic block parser extracts three types of code:

1. **Imports**: Lines starting with `import `
2. **Exports**: Lines starting with `export ` (with multi-line support)
3. **Other Logic**: Everything else

```typescript
const logicLines = rawLogic.split("\n");
const imports: string[] = [];
const exports: string[] = [];
const otherLogic: string[] = [];
let inExportBlock = false;
let exportBuffer: string[] = [];
let exportBraceDepth = 0;

for (let i = 0; i < logicLines.length; i++) {
  const line: string = logicLines[i] ?? "";
  const trimmed: string = line.trim();
  
  if (inExportBlock) {
    exportBuffer.push(line);
    // Count braces to handle nested objects
    const openBraces = ((line && line.match(/{/g)) || []).length;
    const closeBraces = ((line && line.match(/}/g)) || []).length;
    exportBraceDepth += openBraces - closeBraces;
    
    if (exportBraceDepth <= 0) {
      exports.push(exportBuffer.join("\n"));
      exportBuffer = [];
      inExportBlock = false;
      exportBraceDepth = 0;
    }
    continue;
  }
  
  if (trimmed.startsWith("import ")) {
    imports.push(line);
  } else if (trimmed.startsWith("export ")) {
    // Handle multi-line exports
    if (/export\s+\w+\s*=\s*{/.test(trimmed) || trimmed.endsWith("{")) {
      inExportBlock = true;
      exportBuffer = [line];
      exportBraceDepth = /* calculate initial depth */;
    } else {
      exports.push(line);
    }
  } else if (trimmed) {
    otherLogic.push(line);
  }
}
```

### Regex Patterns

```typescript
// Logic block: <logic setup="ts|js">...</logic>
const logicMatch = source.match(
  /<logic\s+setup\s*=\s*["']?(ts|js)["']?\s*>([\s\S]*?)<\/logic>/i
);

// View block: <view>...</view>
const viewMatch = source.match(/<view\s*>([\s\S]*?)<\/view>/i);

// Style block: <style scoped?>...</style>
const styleMatch = source.match(/<style(\s+scoped)?\s*>([\s\S]*?)<\/style>/i);
```

**Explanation:**
- `[\s\S]*?`: Non-greedy match of any character (including newlines)
- `["']?`: Optional quote character
- `(\s+scoped)?`: Optional scoped attribute
- `/i`: Case-insensitive matching

---

## Style Scoping

### Scoping Algorithm

```typescript
function scopeStyles(css: string, scopeId: string): string {
  const dataAttr = `[data-${scopeId}]`;
  
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (match, selector, rules) => {
    // Skip at-rules
    if (selector.trim().startsWith("@")) {
      return match;
    }
    
    // Process each selector
    const selectors = selector.split(",").map((s: string) => {
      const trimmed = s.trim();
      
      // Handle pseudo-classes/elements
      const pseudoMatch = trimmed.match(/^(.+?)(::?[a-z-]+(?:\([^)]*\))?)$/i);
      if (pseudoMatch) {
        return `${dataAttr} ${pseudoMatch[1]}${pseudoMatch[2]}`;
      }
      
      return `${dataAttr} ${trimmed}`;
    });
    
    return `${selectors.join(", ")}{${rules}}`;
  });
}
```

### Scoping Examples

**Input:**
```css
.button { color: blue; }
.button:hover { color: red; }
.button::before { content: '→'; }
h1, h2 { margin: 0; }
@media (max-width: 768px) { .button { padding: 0.5rem; } }
```

**Output (scopeId = "fynix-abc123"):**
```css
[data-fynix-abc123] .button { color: blue; }
[data-fynix-abc123] .button:hover { color: red; }
[data-fynix-abc123] .button::before { content: '→'; }
[data-fynix-abc123] h1, [data-fynix-abc123] h2 { margin: 0; }
@media (max-width: 768px) { .button { padding: 0.5rem; } }
```

### Hash Generation

```typescript
function generateStyleId(filePath: string): string {
  let hash = 0;
  for (let i = 0; i < filePath.length; i++) {
    const char = filePath.charCodeAt(i);
    hash = (hash << 5) - hash + char; // hash * 31 + char
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `fynix-${Math.abs(hash).toString(36)}`;
}
```

**Algorithm Explanation:**
1. Initialize hash to 0
2. For each character in file path:
   - Get character code
   - Apply hash function: `(hash << 5) - hash + char` (equivalent to `hash * 31 + char`)
   - Convert to 32-bit integer with `hash & hash`
3. Convert absolute value to base-36 string
4. Prefix with "fynix-"

**Properties:**
- Deterministic: Same path always produces same hash
- Collision-resistant: Different paths unlikely to produce same hash
- Short: Base-36 encoding produces compact IDs

---

## Type Checking

### TypeScript Checker Architecture

```typescript
class TypeScriptChecker {
  private compilerOptions: ts.CompilerOptions;
  private virtualFiles: Map<string, string> = new Map();
  private program: ts.Program | null = null;
  
  constructor(customOptions?: ts.CompilerOptions) {
    this.compilerOptions = { /* default options */ };
  }
  
  addFile(fileName: string, content: string): void {
    this.virtualFiles.set(fileName, content);
    this.program = null; // Invalidate cached program
  }
  
  checkFile(fileName: string): string[] {
    // Create compiler host
    // Create program
    // Get diagnostics
    // Filter and format errors
    return errors;
  }
  
  clear(): void {
    this.virtualFiles.clear();
    this.program = null;
  }
}
```

### Virtual File System

```typescript
private createCompilerHost(): ts.CompilerHost {
  const defaultHost = ts.createCompilerHost(this.compilerOptions);
  
  return {
    ...defaultHost,
    getSourceFile: (fileName, languageVersion) => {
      // Check virtual files first
      if (this.virtualFiles.has(fileName)) {
        const content = this.virtualFiles.get(fileName);
        if (content === undefined) return undefined;
        return ts.createSourceFile(fileName, content, languageVersion, true);
      }
      
      // Fall back to file system
      try {
        if (ts.sys.fileExists(fileName)) {
          const content = ts.sys.readFile(fileName);
          if (content !== undefined) {
            return ts.createSourceFile(fileName, content, languageVersion, true);
          }
        }
      } catch (err) {
        // Silent fail
      }
      
      return undefined;
    },
    fileExists: (fileName) => {
      if (this.virtualFiles.has(fileName)) return true;
      return ts.sys.fileExists(fileName);
    },
    readFile: (fileName) => {
      if (this.virtualFiles.has(fileName)) {
        return this.virtualFiles.get(fileName);
      }
      return ts.sys.readFile(fileName);
    },
    writeFile: () => {} // No-op for type checking
  };
}
```

### Error Filtering

```typescript
const skipCodes = new Set([
  2307, // Cannot find module
  2792, // Cannot find name (JSX)
  7016, // Could not find declaration file
  2304, // Cannot find name
  7026, // JSX element implicitly has type 'any'
  2874  // Property does not exist on type
]);

diagnostics.forEach((diagnostic) => {
  if (skipCodes.has(diagnostic.code)) {
    return; // Skip this error
  }
  // Format and add error
});
```

### Diagnostic Formatting

```typescript
if (diagnostic.file && diagnostic.start !== undefined) {
  const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  const line = pos?.line ?? 0;
  const character = pos?.character ?? 0;
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  
  errors.push(
    `${colors.yellow}Line ${line + 1}:${character + 1}${colors.reset} - ${message} ${colors.gray}(TS${diagnostic.code})${colors.reset}`
  );
} else {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  errors.push(
    `${message} ${colors.gray}(TS${diagnostic.code})${colors.reset}`
  );
}
```

---

## Hot Module Replacement

### HMR Handler

```typescript
handleHotUpdate(ctx: HmrContext) {
  const { file, server } = ctx;
  const normalizedFile = normalizePath(file);
  const shouldReload = include.some((ext) => normalizedFile.endsWith(ext));
  
  if (shouldReload) {
    // Log update
    console.log(
      `${colors.green}[HMR]${colors.reset} ${colors.gray}${normalizedFile}${colors.reset}`
    );
    
    // Clear type checker cache
    if (typeChecker) {
      typeChecker.clear();
    }
    
    // Trigger full reload
    server.ws.send({
      type: "full-reload",
      path: "*"
    });
    
    return []; // Return empty to prevent default behavior
  }
  
  return undefined; // Let other plugins handle
}
```

### Why Full Reload?

The plugin triggers full-page reloads instead of hot updates because:

1. **SFC Structure Changes**: Changes to logic, view, or style sections may require full component re-initialization
2. **State Management**: Preserving state across SFC updates is complex
3. **Simplicity**: Full reloads ensure consistency
4. **Performance**: For typical SFC files, full reloads are fast enough

---

## Performance Considerations

### 1. Path Normalization Caching

Paths are normalized once per transform call:

```typescript
const normalizedId = normalizePath(id);
```

### 2. Regex Compilation

Regex patterns are compiled once at module load time, not per-parse:

```typescript
const logicMatch = source.match(
  /<logic\s+setup\s*=\s*["']?(ts|js)["']?\s*>([\s\S]*?)<\/logic>/i
);
```

### 3. Conditional Type Checking

Type checking is expensive, so it's:
- Optional (disabled by default)
- Only applied to TypeScript files
- Cached across builds

```typescript
if (typeCheck && parsed.logicLang === "ts") {
  // Only check TypeScript files when enabled
}
```

### 4. Virtual File System

Instead of writing temporary files to disk, the type checker uses a virtual file system:

```typescript
private virtualFiles: Map<string, string> = new Map();
```

Benefits:
- No I/O overhead
- Faster type checking
- No cleanup required

### 5. Program Caching

TypeScript programs are cached until files change:

```typescript
addFile(fileName: string, content: string): void {
  this.virtualFiles.set(fileName, content);
  this.program = null; // Invalidate only when files change
}
```

### 6. Early Returns

Transform function returns early for excluded files:

```typescript
if (shouldExclude) return null;
if (!shouldInclude) return null;
```

---

## Error Handling

### Error Categories

1. **Validation Errors**: SFC structure problems
2. **Transform Errors**: Code generation failures
3. **Type Errors**: TypeScript diagnostics
4. **Build Errors**: esbuild transformation failures

### Error Reporting

#### Validation Errors

```typescript
if (!parsed.hasView) {
  throw new Error(
    `${colors.red}[Fynix SFC]${colors.reset} Missing <view> block in ${colors.cyan}${filePath}${colors.reset}. Every .fnx file must have a <view> section.`
  );
}
```

#### Transform Errors

```typescript
catch (error) {
  const err = error as Error;
  console.error(
    `\n${colors.red}${colors.bold}[Fynix SFC] Transform Error${colors.reset} in ${colors.cyan}${id}${colors.reset}:`
  );
  console.error(`  ${colors.red}${err.message}${colors.reset}\n`);
  
  if (typeof ctx.error === 'function') {
    ctx.error({
      message: `Failed to transform ${id}: ${err.message}`,
      stack: err.stack,
      id
    });
  } else {
    throw err;
  }
}
```

#### Type Errors

```typescript
if (typeErrors.length > 0) {
  console.error(
    `\n${colors.red}${colors.bold}[Fynix SFC] TypeScript Errors${colors.reset} in ${colors.cyan}${normalizedId}${colors.reset}:`
  );
  typeErrors.forEach((error) => console.error(`  ${error}`));
  console.error("");
  
  if (process.env.NODE_ENV === "production") {
    throw new Error(`TypeScript errors in ${normalizedId}`);
  }
}
```

### Error Flow

```
Error Occurs
     ↓
Catch Block
     ↓
Format Error Message (with colors)
     ↓
Log to Console
     ↓
┌───────────────┐
│ Production?   │
└───────┬───────┘
        │
   ┌────┴────┐
   │   Yes   │
   └────┬────┘
        │
   Throw Error (fail build)
        │
   ┌────┴────┐
   │   No    │
   └────┬────┘
        │
   Continue (show error in dev)
```

---

## Debugging

### Enable Debug Logging

```typescript
fynixPlugin({
  showGeneratedCode: true
})
```

Output:
```
================================================================================
[Fynix SFC] Generated code for: /src/components/Button.fnx
================================================================================
import { Fynix } from '@fynixorg/ui';

function FynixComponent(props = {}) {
  // ...
}

export default FynixComponent;
================================================================================
```

### Type Checking Output

```typescript
fynixPlugin({
  typeCheck: true
})
```

Output:
```
[Fynix SFC] TypeScript Errors in /src/App.fnx:
  Line 10:5 - Type 'string' is not assignable to type 'number' (TS2322)
  Line 15:10 - Property 'value' does not exist on type 'State' (TS2339)
```

### HMR Logging

```
[HMR] /src/components/Button.fnx
```

---

## Testing Strategies

### Unit Testing

Test individual functions:

```typescript
import { parseSFC, validateSFC, transformSFC } from './plugin';

describe('parseSFC', () => {
  it('should parse logic block', () => {
    const source = '<logic setup="ts">const x = 1;</logic>';
    const result = parseSFC(source);
    expect(result.hasLogic).toBe(true);
  });
});
```

### Integration Testing

Test with Vite:

```typescript
import { build } from 'vite';
import fynixPlugin from './plugin';

describe('Vite Integration', () => {
  it('should transform .fnx files', async () => {
    await build({
      plugins: [fynixPlugin()],
      build: { write: false }
    });
  });
});
```

### End-to-End Testing

Test actual builds:

```bash
npm run build
# Check output in dist/
```

---

**Last Updated:** January 2026