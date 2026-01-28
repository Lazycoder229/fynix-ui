# Fynix SFC Support for VS Code

Official VS Code extension for Fynix Single File Components (.fnx files).

## Features

### ✨ Syntax Highlighting

- **Logic Block** - Full TypeScript/JavaScript highlighting
- **View Block** - JSX/TSX syntax highlighting
- **Style Block** - CSS syntax highlighting with scoped support

### 🎯 IntelliSense

- Auto-completion for Fynix APIs
- Type checking in logic blocks
- JSX IntelliSense in view blocks
- CSS IntelliSense in style blocks

### 🔍 Validation

- Required `<view>` block validation
- `setup` attribute validation (ts/js)
- TypeScript syntax detection in JavaScript blocks
- Real-time error highlighting

### 📝 Snippets

- `fnx-ts` - Create TypeScript component
- `fnx-js` - Create JavaScript component
- `fnx-state` - Create component with state
- `logic` - Insert logic block
- `view` - Insert view block
- `style` - Insert style block
- `nstate` - Create nixState
- `nstore` - Create nixStore

### 🎨 Code Formatting

- Auto-indent for blocks
- Auto-closing tags
- Bracket matching
- Comment toggling

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Press `Ctrl+P` (or `Cmd+P` on Mac)
3. Type: `ext install fynixorg.fynix-sfc`
4. Press Enter

### From VSIX File

1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions (`Ctrl+Shift+X`)
4. Click `...` menu → `Install from VSIX...`
5. Select the downloaded file

### Manual Installation

```bash
cd vscode-extension
npm install
npm run compile
code --install-extension fynix-sfc-1.0.0.vsix
```

## Usage

### Create a New Component

**Method 1: Using Snippet**

1. Create a new `.fnx` file
2. Type `fnx-ts` or `fnx-js`
3. Press `Tab`

**Method 2: Using Command**

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: `Fynix: Create Component`
3. Enter component name
4. Select language (TypeScript/JavaScript)

### Example Component

```html
<logic setup="ts">
import { nixState } from "@fynixorg/ui";

interface User {
  name: string;
  age: number;
}

const user: User = { name: "John", age: 25 };
const count = nixState<number>(0);
</logic>

<view>
  <div>
    <h1>Hello, {user.name}!</h1>
    <p>Count: {count.value}</p>
    <button r-click={() => count.value++}>Increment</button>
  </div>
</view>

<style scoped>
div {
  padding: 20px;
  text-align: center;
}

button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #0056b3;
}
</style>
```

## Features in Detail

### Syntax Highlighting

The extension provides accurate syntax highlighting for all three blocks:

```html
<logic setup="ts">
  // TypeScript syntax highlighting
  const state = nixState<number>(0);
</logic>

<view>
  {/* JSX syntax highlighting */}
  <div>{state.value}</div>
</view>

<style scoped>
  /* CSS syntax highlighting */
  div { padding: 20px; }
</style>
```

### Validation

The extension validates your `.fnx` files in real-time:

#### ✅ Valid

```html
<logic setup="ts">
  const count = nixState<number>(0);
</logic>

<view>
  <div>{count.value}</div>
</view>
```

#### ❌ Invalid - Missing view block

```html
<logic setup="ts">
  const count = nixState<number>(0);
</logic>
<!-- Error: Missing <view> block -->
```

#### ❌ Invalid - TypeScript in JS block

```html
<logic setup="js">
  const count: number = 0; // Error: Type annotation in setup="js"
</logic>
```

#### ❌ Invalid - Wrong setup attribute

```html
<logic setup="typescript">
  <!-- Error: Must be "ts" or "js" -->
  const count = 0;
</logic>
```

### IntelliSense

Get full TypeScript/JavaScript IntelliSense in logic blocks:

```typescript
<logic setup="ts">
import { nixState, nixStore } from "@fynixorg/ui";

// IntelliSense for nixState
const count = nixState(0);
count.value // Auto-complete: value, subscribe, cleanup, etc.

// IntelliSense for nixStore
const store = nixStore({ name: "John" });
store.name // Auto-complete: name, setState, getState, subscribe
</logic>
```

## Configuration

Access settings via `Preferences > Settings > Fynix SFC`

### Available Settings

```json
{
  "fynix.format.enable": true,
  "fynix.validation.enable": true
}
```

## Snippets Reference

| Prefix      | Description                      |
| ----------- | -------------------------------- |
| `fnx-ts`    | TypeScript component template    |
| `fnx-js`    | JavaScript component template    |
| `fnx-state` | Component with state             |
| `logic`     | Logic block                      |
| `view`      | View block                       |
| `style`     | Style block (with scoped option) |
| `nstate`    | nixState declaration             |
| `nstore`    | nixStore declaration             |
| `r-click`   | Click event handler              |

## Keyboard Shortcuts

- `Ctrl+Space` - Trigger IntelliSense
- `Ctrl+K Ctrl+C` - Comment block
- `Ctrl+K Ctrl+U` - Uncomment block
- `Alt+Shift+F` - Format document

## Troubleshooting

### No syntax highlighting

1. Make sure file extension is `.fnx`
2. Reload VS Code window (`Ctrl+Shift+P` → `Reload Window`)
3. Check if extension is enabled

### No IntelliSense

1. Make sure you have TypeScript installed: `npm install -g typescript`
2. Check if `@fynixorg/ui` is installed in your project
3. Verify `tsconfig.json` includes `.fnx` files

### Validation not working

1. Check extension settings
2. Ensure `fynix.validation.enable` is `true`
3. Reload window

## Contributing

Found a bug or have a feature request?

- GitHub: https://github.com/fynixorg/vscode-fynix-sfc
- Issues: https://github.com/fynixorg/vscode-fynix-sfc/issues

## License

MIT

## Changelog

### 1.0.0

- Initial release
- Syntax highlighting for .fnx files
- IntelliSense support
- Validation
- Snippets
- Code formatting
