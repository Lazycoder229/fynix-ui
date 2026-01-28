import * as vscode from "vscode";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  console.log("Fynix SFC extension is now active!");

  // Register virtual document provider for .fnx files
  const provider = new FynixVirtualDocumentProvider();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      "fynix-virtual",
      provider,
    ),
  );

  // Watch for .fnx file changes
  const watcher = vscode.workspace.createFileSystemWatcher("**/*.fnx");

  watcher.onDidChange((uri) => {
    provider.update(uri);
  });

  watcher.onDidCreate((uri) => {
    provider.update(uri);
  });

  context.subscriptions.push(watcher);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("fynix.createComponent", createComponent),
  );

  // Provide TypeScript diagnostics
  provideDiagnostics(context);

  // Provide hover information
  provideHoverSupport(context);

  // Provide completion items
  provideCompletionSupport(context);

  // Provide definition support
  provideDefinitionSupport(context);
}

export function deactivate() {
  console.log("Fynix SFC extension is now deactivated");
}

/**
 * Virtual document provider to show generated TypeScript code
 */
class FynixVirtualDocumentProvider
  implements vscode.TextDocumentContentProvider
{
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;
  private cache = new Map<string, string>();

  update(uri: vscode.Uri) {
    // Clear cache for this file
    this.cache.delete(uri.toString());
    this._onDidChange.fire(uri);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    const originalUri = vscode.Uri.parse(uri.query);
    const cacheKey = originalUri.toString();

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const document = vscode.workspace.textDocuments.find(
      (doc) => doc.uri.toString() === originalUri.toString(),
    );

    if (!document) {
      return "// Document not found";
    }

    const transformed = transformFnxToTs(document.getText());
    this.cache.set(cacheKey, transformed);
    return transformed;
  }
}

/**
 * Transform .fnx content to TypeScript for IntelliSense
 */
function transformFnxToTs(source: string): string {
  const lines: string[] = [];

  // Parse logic block
  const logicMatch = source.match(
    /<logic\s+setup\s*=\s*["']?(ts|js)["']?\s*>([\s\S]*?)<\/logic>/i,
  );

  // Parse view block
  const viewMatch = source.match(/<view\s*>([\s\S]*?)<\/view>/i);

  // Add Fynix import with all common exports
  lines.push(`import { 
    Fynix, 
    nixState, 
    nixStore, 
    nixAsync, 
    nixEffect, 
    nixComputed, 
    nixForm,
    type VNode,
    type NixState,
    type NixStore,
    type NixAsyncResult,
    type NixFormState
  } from '@fynixorg/ui';`);
  lines.push("");

  // Add imports and logic from logic block
  if (logicMatch && logicMatch[2]) {
    const logicContent = logicMatch[2].trim();
    const logicLines = logicContent.split("\n");

    // Extract imports
    logicLines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("import ")) {
        lines.push(line);
      }
    });

    lines.push("");
    lines.push("export default function FynixComponent(props: any = {}) {");

    // Add logic content
    logicLines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("import ") && trimmed) {
        lines.push(`  ${line}`);
      }
    });
  } else {
    lines.push("export default function FynixComponent(props: any = {}) {");
  }

  // Add view
  if (viewMatch && viewMatch[1]) {
    lines.push("");
    lines.push("  return (");
    const viewLines = viewMatch[1].trim().split("\n");
    viewLines.forEach((line) => {
      lines.push(`    ${line}`);
    });
    lines.push("  );");
  } else {
    lines.push("  return null;");
  }

  lines.push("}");

  return lines.join("\n");
}
/**
 * Provide hover support for Fynix elements
 */
function provideHoverSupport(context: vscode.ExtensionContext) {
  const hoverProvider = vscode.languages.registerHoverProvider("fynix", {
    provideHover(document, position, token) {
      const line = document.lineAt(position.line).text;
      const range = document.getWordRangeAtPosition(position);
      const word = range ? document.getText(range) : "";

      // ===== Check for r-* attributes first (using line context) =====
      const linePrefix = line.substring(0, position.character);
      const rAttrMatch = linePrefix.match(/\br-([\w-]+)(?:\s*=)?/);
      
      if (rAttrMatch) {
        const eventName = rAttrMatch[1];
        const eventType = getEventType(eventName);

        return new vscode.Hover([
          `**Fynix Event Handler**`,
          ``,
          `\`r-${eventName}\`: React to \`${eventName}\` events`,
          ``,
          `**Type:** \`(event: ${eventType}) => void\``,
          ``,
          `**Example:**`,
          `\`\`\`jsx`,
          `<button r-${eventName}={(e) => console.log('${eventName}', e)}>Click me</button>`,
          `\`\`\``,
        ]);
      }

      // ===== Fynix SFC Block Elements =====

      // Hover for <logic> block
      if (word === "logic") {
        return new vscode.Hover([
          `**\`<logic>\` Block**`,
          ``,
          `The logic block contains TypeScript/JavaScript code for component logic.`,
          ``,
          `**Usage:**`,
          `\`\`\`xml`,
          `<logic setup="ts">`,
          `  import { nixState } from "@fynixorg/ui";`,
          `  const count = nixState(0);`,
          `</logic>`,
          `\`\`\``,
          ``,
          `**Attributes:**`,
          `- \`setup="ts"\` - Use TypeScript (recommended)`,
          `- \`setup="js"\` - Use JavaScript`,
          ``,
          `**Features:**`,
          `- Import Fynix hooks and utilities`,
          `- Define reactive state with \`nixState\`, \`nixStore\``,
          `- Add side effects with \`nixEffect\``,
          `- All variables are accessible in the \`<view>\` block`,
        ]);
      }

      // Hover for <view> block
      if (word === "view") {
        return new vscode.Hover([
          `**\`<view>\` Block**`,
          ``,
          `The view block contains JSX markup for component rendering.`,
          ``,
          `**Usage:**`,
          `\`\`\`xml`,
          `<view>`,
          `  <div>`,
          `    <h1>{message.value}</h1>`,
          `    <button r-click={() => handleClick()}>Click</button>`,
          `  </div>`,
          `</view>`,
          `\`\`\``,
          ``,
          `**Features:**`,
          `- Standard HTML/JSX elements`,
          `- Access logic block variables: \`{count.value}\``,
          `- Fynix event handlers: \`r-click\`, \`r-input\`, etc.`,
          `- Reactive class binding: \`r-class\` or \`rc\``,
        ]);
      }

      // Hover for <style> block
      if (word === "style") {
        return new vscode.Hover([
          `**\`<style>\` Block**`,
          ``,
          `The style block contains CSS styles for the component.`,
          ``,
          `**Usage:**`,
          `\`\`\`xml`,
          `<style scoped>`,
          `  .container {`,
          `    padding: 20px;`,
          `    background: #f0f0f0;`,
          `  }`,
          `</style>`,
          `\`\`\``,
          ``,
          `**Attributes:**`,
          `- \`scoped\` - Styles apply only to this component (recommended)`,
          `- No attribute - Global styles (affects entire app)`,
          ``,
          `**Note:** Use \`scoped\` to prevent style conflicts.`,
        ]);
      }

      // ===== HTML Element Hover Definitions =====

     const htmlElementDocs: Record<
  string,
  { desc: string; attrs: string; example: string }
> = {
  div: {
    desc: "Generic container for flow content. Commonly used for layout and grouping.",
    attrs: "class, id, style, r-click, r-*, data-*",
    example: `<div class="container">\n  <h1>Content</h1>\n</div>`,
  },
      span: {
          desc: "Inline container for phrasing content. Used for styling text inline.",
          attrs: "class, id, style",
          example: `<span class="highlight">Important</span>`,
        },
        p: {
          desc: "Paragraph element. Represents a paragraph of text.",
          attrs: "class, id, style",
          example: `<p>This is a paragraph of text.</p>`,
        },
        h1: {
          desc: "Heading level 1 (highest importance)",
          attrs: "class, id, style",
          example: `<h1>Main Title</h1>`,
        },
        h2: {
          desc: "Heading level 2",
          attrs: "class, id, style",
          example: `<h2>Section Title</h2>`,
        },
        h3: {
          desc: "Heading level 3",
          attrs: "class, id, style",
          example: `<h3>Subsection</h3>`,
        },
        h4: {
          desc: "Heading level 4",
          attrs: "class, id, style",
          example: `<h4>Subheading</h4>`,
        },
        h5: {
          desc: "Heading level 5",
          attrs: "class, id, style",
          example: `<h5>Minor heading</h5>`,
        },
        h6: {
          desc: "Heading level 6 (lowest importance)",
          attrs: "class, id, style",
          example: `<h6>Small heading</h6>`,
        },
        button: {
          desc: "Interactive button element. Use r-click for event handling.",
          attrs: "type, disabled, r-click, class, id",
          example: `<button r-click={() => handleClick()}>Click Me</button>`,
        },
        input: {
          desc: "Input field for user data entry.",
          attrs:
            "type, value, placeholder, r-input, r-change, disabled, required",
          example: `<input type="text" placeholder="Enter name" r-input={(e) => handleInput(e)} />`,
        },
        a: {
          desc: "Anchor/hyperlink element for navigation.",
          attrs: "href, target, rel, r-click",
          example: `<a href="/about">About Us</a>`,
        },
        img: {
          desc: "Image element for displaying graphics.",
          attrs: "src, alt, width, height, loading",
          example: `<img src="/logo.png" alt="Logo" />`,
        },
        ul: {
          desc: "Unordered list (bullet points).",
          attrs: "class, id, style",
          example: `<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>`,
        },
        ol: {
          desc: "Ordered list (numbered).",
          attrs: "class, id, style, type, start",
          example: `<ol>\n  <li>First</li>\n  <li>Second</li>\n</ol>`,
        },
        li: {
          desc: "List item. Must be inside <ul> or <ol>.",
          attrs: "class, id, style, value",
          example: `<li>List item content</li>`,
        },
        form: {
          desc: "Form container for user input. Use r-submit for handling.",
          attrs: "action, method, r-submit",
          example: `<form r-submit={(e) => handleSubmit(e)}>\n  <input type="text" />\n  <button type="submit">Submit</button>\n</form>`,
        },
        select: {
          desc: "Dropdown selection menu.",
          attrs: "r-change, multiple, disabled, required",
          example: `<select r-change={(e) => handleChange(e)}>\n  <option value="1">Option 1</option>\n</select>`,
        },
        textarea: {
          desc: "Multi-line text input field.",
          attrs: "rows, cols, placeholder, r-input, r-change",
          example: `<textarea rows="4" r-input={(e) => handleInput(e)}></textarea>`,
        },
        label: {
          desc: "Label for form inputs. Use htmlFor to associate.",
          attrs: "htmlFor, class, id",
          example: `<label htmlFor="email">Email:</label>\n<input id="email" type="email" />`,
        },
        table: {
          desc: "Table for tabular data.",
          attrs: "class, id, style",
          example: `<table>\n  <thead><tr><th>Header</th></tr></thead>\n  <tbody><tr><td>Data</td></tr></tbody>\n</table>`,
        },
        section: {
          desc: "Thematic grouping of content with a heading.",
          attrs: "class, id, style",
          example: `<section>\n  <h2>Section Title</h2>\n  <p>Content</p>\n</section>`,
        },
        article: {
          desc: "Self-contained composition (blog post, article, etc.).",
          attrs: "class, id, style",
          example: `<article>\n  <h2>Article Title</h2>\n  <p>Content</p>\n</article>`,
        },
        header: {
          desc: "Introductory content or navigation container.",
          attrs: "class, id, style",
          example: `<header>\n  <h1>Site Title</h1>\n  <nav>...</nav>\n</header>`,
        },
        footer: {
          desc: "Footer content (copyright, links, etc.).",
          attrs: "class, id, style",
          example: `<footer>\n  <p>&copy; 2024 Company</p>\n</footer>`,
        },
        nav: {
          desc: "Navigation links container.",
          attrs: "class, id, style",
          example: `<nav>\n  <a href="/">Home</a>\n  <a href="/about">About</a>\n</nav>`,
        },
        main: {
          desc: "Main content of the document. Should be unique per page.",
          attrs: "class, id, style",
          example: `<main>\n  <h1>Page Content</h1>\n  <p>Main content here</p>\n</main>`,
        },
        aside: {
          desc: "Content tangentially related to main content (sidebar).",
          attrs: "class, id, style",
          example: `<aside>\n  <h3>Related Links</h3>\n  <ul>...</ul>\n</aside>`,
        },
        br: {
          desc: "Line break element.",
          attrs: "none",
          example: `<p>Line 1<br/>Line 2</p>`,
        },
        hr: {
          desc: "Horizontal rule / thematic break.",
          attrs: "class, id, style",
          example: `<hr />`,
        },
        strong: {
          desc: "Strong importance/emphasis (bold text).",
          attrs: "class, id, style",
          example: `<strong>Important</strong>`,
        },
        em: {
          desc: "Emphasized text (italic).",
          attrs: "class, id, style",
          example: `<em>Emphasized</em>`,
        },
        code: {
          desc: "Inline code fragment.",
          attrs: "class, id, style",
          example: `<code>const x = 10;</code>`,
        },
        pre: {
          desc: "Preformatted text block.",
          attrs: "class, id, style",
          example: `<pre>\n  code block\n  preserved whitespace\n</pre>`,
        },
      };

      // Check if hovering over an HTML element
      if (htmlElementDocs[word]) {
        const doc = htmlElementDocs[word];
        return new vscode.Hover([
          `**\`<${word}>\` Element**`,
          ``,
          doc.desc,
          ``,
          `**Common Attributes:** ${doc.attrs}`,
          ``,
          `**Example:**`,
          `\`\`\`jsx`,
          doc.example,
          `\`\`\``,
        ]);
      }

      // ===== Fynix Functions =====

      // Hover for nixState
      if (word === "nixState") {
        return new vscode.Hover([
          `**nixState**`,
          ``,
          `Creates a reactive state that automatically updates the UI when changed.`,
          ``,
          `**Signature:** \`function nixState<T>(initialValue: T): NixState<T>\``,
          ``,
          `**Example:**`,
          `\`\`\`typescript`,
          `const count = nixState(0);`,
          `count.value++; // Updates UI automatically`,
          `\`\`\``,
          ``,
          `**Returns:** An object with:`,
          `- \`value\`: The current state value`,
          `- \`subscribe(fn)\`: Subscribe to changes`,
          `- \`cleanup()\`: Clean up subscriptions`,
        ]);
      }

      // Hover for nixStore
      if (word === "nixStore") {
        return new vscode.Hover([
          `**nixStore**`,
          ``,
          `Creates a reactive store for managing multiple related state values.`,
          ``,
          `**Signature:** \`function nixStore<T>(initialState: T): NixStore<T>\``,
          ``,
          `**Example:**`,
          `\`\`\`typescript`,
          `const user = nixStore({`,
          `  name: 'John',`,
          `  age: 30`,
          `});`,
          `user.name = 'Jane'; // Updates UI automatically`,
          `\`\`\``,
        ]);
      }

      // Hover for nixAsync
      if (word === "nixAsync") {
        return new vscode.Hover([
          `**nixAsync**`,
          ``,
          `Manages async operations with loading and error states.`,
          ``,
          `**Signature:** \`function nixAsync<T>(fn: () => Promise<T>): NixAsyncResult<T>\``,
          ``,
          `**Example:**`,
          `\`\`\`typescript`,
          `const result = nixAsync(() => fetch('/api/data').then(r => r.json()));`,
          `// result.data, result.loading, result.error`,
          `\`\`\``,
        ]);
      }

      // Hover for nixEffect
      if (word === "nixEffect") {
        return new vscode.Hover([
          `**nixEffect**`,
          ``,
          `Runs side effects when dependencies change.`,
          ``,
          `**Signature:** \`function nixEffect(fn: () => void | (() => void), deps?: any[]): void\``,
          ``,
          `**Example:**`,
          `\`\`\`typescript`,
          `nixEffect(() => {`,
          `  console.log('Count changed:', count.value);`,
          `  return () => console.log('Cleanup');`,
          `}, [count]);`,
          `\`\`\``,
        ]);
      }

      // Hover for nixComputed
      if (word === "nixComputed") {
        return new vscode.Hover([
          `**nixComputed**`,
          ``,
          `Creates a computed value that updates when dependencies change.`,
          ``,
          `**Signature:** \`function nixComputed<T>(fn: () => T, deps: any[]): NixState<T>\``,
          ``,
          `**Example:**`,
          `\`\`\`typescript`,
          `const doubled = nixComputed(() => count.value * 2, [count]);`,
          `\`\`\``,
        ]);
      }

      // Hover for nixForm
      if (word === "nixForm") {
        return new vscode.Hover([
          `**nixForm**`,
          ``,
          `Creates a form state manager with validation.`,
          ``,
          `**Signature:** \`function nixForm<T>(config): NixFormState<T>\``,
          ``,
          `**Example:**`,
          `\`\`\`typescript`,
          `const form = nixForm({`,
          `  initialValues: { email: '', password: '' },`,
          `  onSubmit: (values) => console.log(values),`,
          `  validate: (values) => ({`,
          `    email: !values.email ? 'Required' : null`,
          `  })`,
          `});`,
          `\`\`\``,
        ]);
      }

      return null;
    },
  });

  context.subscriptions.push(hoverProvider);
}
/**
 * Provide completion support
 */
function provideCompletionSupport(context: vscode.ExtensionContext) {
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    "fynix",
    {
      provideCompletionItems(document, position, token, context) {
        const lineText = document.lineAt(position.line).text;
        const linePrefix = lineText.substring(0, position.character);

        // ✅ NEW: HTML Element Completion in <view> block
        if (isInViewBlock(document, position)) {
          // Check if we should provide HTML completions
          const beforeCursor = lineText.substring(0, position.character);
          const afterCursor = lineText.substring(position.character);

          // Only provide if not inside a tag and not after <
          if (!beforeCursor.match(/<\w*$/) && !beforeCursor.endsWith("<")) {
            const htmlElements = [
              {
                name: "div",
                desc: "Division element",
                snippet: "<div$1>$0</div>",
              },
              {
                name: "span",
                desc: "Inline span element",
                snippet: "<span$1>$0</span>",
              },
              { name: "p", desc: "Paragraph", snippet: "<p$1>$0</p>" },
              { name: "h1", desc: "Heading 1", snippet: "<h1$1>$0</h1>" },
              { name: "h2", desc: "Heading 2", snippet: "<h2$1>$0</h2>" },
              { name: "h3", desc: "Heading 3", snippet: "<h3$1>$0</h3>" },
              {
                name: "button",
                desc: "Button element",
                snippet: "<button r-click={() => {$1}}>$0</button>",
              },
              {
                name: "input",
                desc: "Input field",
                snippet:
                  '<input type="${1:text}" placeholder="$2" r-input={(e) => {$3}}$4/>',
              },
              {
                name: "a",
                desc: "Anchor link",
                snippet: '<a href="${1:#}"$2>$0</a>',
              },
              {
                name: "img",
                desc: "Image",
                snippet: '<img src="${1}" alt="${2}"$3/>',
              },
              {
                name: "ul",
                desc: "Unordered list",
                snippet: "<ul$1>\n  <li>$0</li>\n</ul>",
              },
              {
                name: "ol",
                desc: "Ordered list",
                snippet: "<ol$1>\n  <li>$0</li>\n</ol>",
              },
              { name: "li", desc: "List item", snippet: "<li$1>$0</li>" },
              {
                name: "form",
                desc: "Form element",
                snippet: "<form r-submit={(e) => {$1}}$2>\n  $0\n</form>",
              },
              {
                name: "select",
                desc: "Select dropdown",
                snippet:
                  '<select r-change={(e) => {$1}}$2>\n  <option value="$3">$4</option>\n  $0\n</select>',
              },
              {
                name: "textarea",
                desc: "Text area",
                snippet: "<textarea r-input={(e) => {$1}}$2>$0</textarea>",
              },
              {
                name: "label",
                desc: "Label",
                snippet: '<label htmlFor="${1}"$2>$0</label>',
              },
              {
                name: "section",
                desc: "Section",
                snippet: "<section$1>\n  $0\n</section>",
              },
              {
                name: "article",
                desc: "Article",
                snippet: "<article$1>\n  $0\n</article>",
              },
              {
                name: "header",
                desc: "Header",
                snippet: "<header$1>\n  $0\n</header>",
              },
              {
                name: "footer",
                desc: "Footer",
                snippet: "<footer$1>\n  $0\n</footer>",
              },
              {
                name: "nav",
                desc: "Navigation",
                snippet: "<nav$1>\n  $0\n</nav>",
              },
              {
                name: "main",
                desc: "Main content",
                snippet: "<main$1>\n  $0\n</main>",
              },
            ];

            return htmlElements.map((el) => {
              const item = new vscode.CompletionItem(
                el.name,
                vscode.CompletionItemKind.Snippet,
              );
              item.insertText = new vscode.SnippetString(el.snippet);
              item.documentation = new vscode.MarkdownString(el.desc);
              item.detail = `HTML <${el.name}> element`;
              return item;
            });
          }
        }

        // Completion for r-* event handlers
        if (linePrefix.endsWith("r-")) {
          const events = [
            "click",
            "dblclick",
            "input",
            "change",
            "submit",
            "focus",
            "blur",
            "keydown",
            "keyup",
            "keypress",
            "mouseenter",
            "mouseleave",
            "mouseover",
            "mouseout",
            "mousedown",
            "mouseup",
            "mousemove",
            "scroll",
          ];

          return events.map((event) => {
            const item = new vscode.CompletionItem(
              `r-${event}`,
              vscode.CompletionItemKind.Property,
            );
            item.insertText = new vscode.SnippetString(
              `r-${event}={(e) => \${1:/* handle ${event} */}}`,
            );
            item.documentation = new vscode.MarkdownString(
              `Fynix event handler for \`${event}\` events`,
            );
            return item;
          });
        }

        // Completion for Fynix functions in logic block
        if (isInLogicBlock(document, position)) {
          const functions = [
            {
              name: "nixState",
              snippet: "nixState<${1:type}>(${2:initialValue})",
              doc: "Creates a reactive state",
            },
            {
              name: "nixStore",
              snippet: "nixStore({ ${1:key}: ${2:value} })",
              doc: "Creates a reactive store",
            },
            {
              name: "nixAsync",
              snippet: "nixAsync(() => ${1:asyncFunction()})",
              doc: "Manages async operations",
            },
            {
              name: "nixEffect",
              snippet:
                "nixEffect(() => {\n  ${1:// side effect}\n}, [${2:deps}])",
              doc: "Runs side effects",
            },
            {
              name: "nixComputed",
              snippet: "nixComputed(() => ${1:computation}, [${2:deps}])",
              doc: "Creates computed value",
            },
            {
              name: "nixForm",
              snippet:
                "nixForm({\n  initialValues: { ${1:field}: ${2:value} },\n  onSubmit: (values) => ${3:handleSubmit(values)},\n  validate: (values) => ({\n    ${4:field}: ${5:validation}\n  })\n})",
              doc: "Creates form state manager",
            },
          ];

          return functions.map((func) => {
            const item = new vscode.CompletionItem(
              func.name,
              vscode.CompletionItemKind.Function,
            );
            item.insertText = new vscode.SnippetString(func.snippet);
            item.documentation = new vscode.MarkdownString(func.doc);
            return item;
          });
        }

        return [];
      },
    },
    "-", // Trigger on '-' for r-* attributes
    " ", // Trigger on space
    "<", // ✅ NEW: Trigger on '<' for HTML elements
  );

  context.subscriptions.push(completionProvider);
}

/**
 * Provide definition support
 */
function provideDefinitionSupport(context: vscode.ExtensionContext) {
  const definitionProvider = vscode.languages.registerDefinitionProvider(
    "fynix",
    {
      provideDefinition(document, position, token) {
        const range = document.getWordRangeAtPosition(position);
        const word = document.getText(range);

        // Find variable definitions in logic block
        const text = document.getText();
        const logicMatch = text.match(
          /<logic\s+setup\s*=\s*["']?(ts|js)["']?\s*>([\s\S]*?)<\/logic>/i,
        );

        if (logicMatch && logicMatch[2]) {
          const logicContent = logicMatch[2];
          const regex = new RegExp(`(const|let|var)\\s+${word}\\s*[=:]`, "g");
          const match = regex.exec(logicContent);

          if (match) {
            const offset = text.indexOf(logicContent) + match.index;
            const pos = document.positionAt(offset);
            return new vscode.Location(document.uri, pos);
          }
        }

        return null;
      },
    },
  );

  context.subscriptions.push(definitionProvider);
}

/**
 * Check if position is inside logic block
 */
function isInLogicBlock(
  document: vscode.TextDocument,
  position: vscode.Position,
): boolean {
  const text = document.getText();
  const offset = document.offsetAt(position);

  const logicMatch = text.match(
    /<logic\s+setup\s*=\s*["']?(ts|js)["']?\s*>([\s\S]*?)<\/logic>/i,
  );

  if (logicMatch) {
    const startOffset = text.indexOf(logicMatch[0]);
    const endOffset = startOffset + logicMatch[0].length;
    return offset >= startOffset && offset <= endOffset;
  }

  return false;
}

/**
 * ✅ NEW: Check if position is inside view block
 */
function isInViewBlock(
  document: vscode.TextDocument,
  position: vscode.Position,
): boolean {
  const text = document.getText();
  const offset = document.offsetAt(position);

  const viewMatch = text.match(/<view\s*>([\s\S]*?)<\/view>/i);

  if (viewMatch) {
    const startOffset = text.indexOf(viewMatch[0]);
    const endOffset = startOffset + viewMatch[0].length;
    return offset >= startOffset && offset <= endOffset;
  }

  return false;
}

/**
 * Get event type for event name
 */
function getEventType(eventName: string): string {
  const eventTypeMap: Record<string, string> = {
    click: "MouseEvent",
    dblclick: "MouseEvent",
    mouseenter: "MouseEvent",
    mouseleave: "MouseEvent",
    mouseover: "MouseEvent",
    mouseout: "MouseEvent",
    mousedown: "MouseEvent",
    mouseup: "MouseEvent",
    mousemove: "MouseEvent",
    keydown: "KeyboardEvent",
    keyup: "KeyboardEvent",
    keypress: "KeyboardEvent",
    input: "InputEvent",
    change: "Event",
    submit: "SubmitEvent",
    focus: "FocusEvent",
    blur: "FocusEvent",
    scroll: "Event",
  };

  return eventTypeMap[eventName] || "Event";
}

/**
 * Provide TypeScript diagnostics for .fnx files
 */
function provideDiagnostics(context: vscode.ExtensionContext) {
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("fynix");
  context.subscriptions.push(diagnosticCollection);

  // Validate on open and change
  if (vscode.window.activeTextEditor) {
    validateDocument(
      vscode.window.activeTextEditor.document,
      diagnosticCollection,
    );
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        validateDocument(editor.document, diagnosticCollection);
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      validateDocument(e.document, diagnosticCollection);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      diagnosticCollection.delete(doc.uri);
    }),
  );
}

/**
 * Validate .fnx document structure
 */
function validateDocument(
  document: vscode.TextDocument,
  diagnosticCollection: vscode.DiagnosticCollection,
) {
  if (document.languageId !== "fynix") {
    return;
  }

  const diagnostics: vscode.Diagnostic[] = [];
  const text = document.getText();

  // Check for required <view> block
  if (!/<view\s*>[\s\S]*?<\/view>/i.test(text)) {
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 0),
      "Missing <view> block. Every .fnx file must have a <view> section.",
      vscode.DiagnosticSeverity.Error,
    );
    diagnostic.source = "fynix";
    diagnostics.push(diagnostic);
  }

  // Check for invalid setup attribute
  const logicMatch = text.match(/<logic\s+setup\s*=\s*["']?(\w+)["']?\s*>/i);
  if (logicMatch && !["ts", "js"].includes(logicMatch[1].toLowerCase())) {
    const startPos = document.positionAt(text.indexOf(logicMatch[0]));
    const endPos = document.positionAt(
      text.indexOf(logicMatch[0]) + logicMatch[0].length,
    );

    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(startPos, endPos),
      `Invalid setup attribute "${logicMatch[1]}". Must be "ts" or "js".`,
      vscode.DiagnosticSeverity.Error,
    );
    diagnostic.source = "fynix";
    diagnostics.push(diagnostic);
  }

  // Check for TypeScript syntax in setup="js"
  if (logicMatch && logicMatch[1].toLowerCase() === "js") {
    const logicContent = text.match(
      /<logic\s+setup\s*=\s*["']?js["']?\s*>([\s\S]*?)<\/logic>/i,
    );
    if (logicContent && logicContent[1]) {
      const tsPatterns = [
        {
          pattern: /:\s*\w+(\[\]|<[^>]+>)?\s*[;,=)]/,
          message: "Type annotation",
        },
        { pattern: /\binterface\s+\w+/, message: "Interface declaration" },
        { pattern: /\btype\s+\w+\s*=/, message: "Type alias" },
      ];

      for (const { pattern, message } of tsPatterns) {
        if (pattern.test(logicContent[1])) {
          const match = logicContent[1].match(pattern);
          if (match) {
            const startOffset =
              text.indexOf(logicContent[0]) + logicContent[0].indexOf(match[0]);
            const startPos = document.positionAt(startOffset);
            const endPos = document.positionAt(startOffset + match[0].length);

            const diagnostic = new vscode.Diagnostic(
              new vscode.Range(startPos, endPos),
              `${message} detected with setup="js". Change to setup="ts" or remove TypeScript syntax.`,
              vscode.DiagnosticSeverity.Error,
            );
            diagnostic.source = "fynix";
            diagnostics.push(diagnostic);
          }
        }
      }
    }
  }

  diagnosticCollection.set(document.uri, diagnostics);
}

/**
 * Create a new Fynix component
 */
async function createComponent() {
  const componentName = await vscode.window.showInputBox({
    prompt: "Enter component name",
    placeHolder: "MyComponent",
  });

  if (!componentName) {
    return;
  }

  const language = await vscode.window.showQuickPick(
    ["TypeScript", "JavaScript"],
    {
      placeHolder: "Select language",
    },
  );

  if (!language) {
    return;
  }

  const setup = language === "TypeScript" ? "ts" : "js";

  const template = `<logic setup="${setup}">
import { nixState } from "@fynixorg/ui";

const count = nixState(0);
</logic>

<view>
  <div>
    <h1>${componentName}</h1>
    <p>Count: {count.value}</p>
    <button r-click={() => count.value++}>Increment</button>
  </div>
</view>

<style scoped>
div {
  padding: 20px;
}
</style>
`;

  const document = await vscode.workspace.openTextDocument({
    language: "fynix",
    content: template,
  });

  await vscode.window.showTextDocument(document);
}
