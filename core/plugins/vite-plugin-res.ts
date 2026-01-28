import { transform, type TransformOptions } from "esbuild";
import type { HmrContext, UserConfig } from "vite";
import { normalizePath } from "vite";
import * as ts from "typescript";

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

/**
 * Vite plugin options for Fynix with SFC support
 */
interface FynixPluginOptions {
  /**
   * JSX factory function name
   * @default "Fynix"
   */
  jsxFactory?: string;

  /**
   * JSX fragment factory name
   * @default "Fynix.Fragment"
   */
  jsxFragment?: string;

  /**
   * File extensions to transform
   * @default [".ts", ".js", ".jsx", ".tsx", ".fnx"]
   */
  include?: string[];

  /**
   * Paths to exclude from transformation
   * @default ["node_modules"]
   */
  exclude?: string[];

  /**
   * Enable source maps
   * @default true
   */
  sourcemap?: boolean;

  /**
   * Custom esbuild transform options
   */
  esbuildOptions?: Partial<TransformOptions>;

  /**
   * Enable SFC parsing for .fnx files
   * @default true
   */
  enableSFC?: boolean;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Show generated code in console (useful for debugging SFC transformation)
   * @default false
   */
  showGeneratedCode?: boolean;

  /**
   * Enable TypeScript type checking (slower but catches type errors)
   * @default false
   */
  typeCheck?: boolean;

  /**
   * TypeScript compiler options override
   */
  tsConfig?: ts.CompilerOptions;
}

/**
 * Extended context type that includes Vite's transform context methods
 */
interface TransformContext {
  addWatchFile?: (id: string) => void;
  error?: (error: { message: string; stack?: string; id?: string }) => void;
}

/**
 * Parsed SFC sections
 */
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

/**
 * Parse a Fynix SFC file (.fnx)
 */
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
    exports: [],
  };

  // Parse <logic> block with setup attribute
  const logicMatch = source.match(
    /<logic\s+setup\s*=\s*["']?(ts|js)["']?\s*>([\s\S]*?)<\/logic>/i
  );

  if (logicMatch && logicMatch[1] && logicMatch[2] !== undefined) {
    result.hasLogic = true;
    result.logicLang = logicMatch[1].toLowerCase() as "js" | "ts";
    const rawLogic = logicMatch[2].trim();

    // Extract imports, exports, and other logic (multi-line export support)
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
        imports.push(line ?? "");
      } else if (trimmed.startsWith("export ")) {
        // Check if this is a multi-line export (object or function)
        // Handles: export const foo = { ... }, export const foo =\n{ ... }, and nested objects
        if (/export\s+\w+\s*=\s*{/.test(trimmed) || trimmed.endsWith("{")) {
          inExportBlock = true;
          exportBuffer = [line];
          // Count braces in the first line
          exportBraceDepth =
            ((line && line.match(/{/g)) || []).length -
            ((line && line.match(/}/g)) || []).length;
          // If the export starts and ends on the same line, close immediately
          if (exportBraceDepth <= 0) {
            exports.push(exportBuffer.join("\n"));
            exportBuffer = [];
            inExportBlock = false;
            exportBraceDepth = 0;
          }
        } else {
          exports.push(line ?? "");
        }
      } else if (trimmed) {
        otherLogic.push(line ?? "");
      }
    }

    // If file ends while still in export block, flush buffer
    if (exportBuffer.length > 0) {
      exports.push(exportBuffer.join("\n"));
    }

    result.imports = imports;
    result.exports = exports;
    result.logic = otherLogic.join("\n");
  }

  // Parse <view> block
  const viewMatch = source.match(/<view\s*>([\s\S]*?)<\/view>/i);
  if (viewMatch && viewMatch[1] !== undefined) {
    result.hasView = true;
    result.view = viewMatch[1].trim();
  }

  // Parse <style> block with optional scoped attribute
  const styleMatch = source.match(/<style(\s+scoped)?\s*>([\s\S]*?)<\/style>/i);
  if (styleMatch && styleMatch[2] !== undefined) {
    result.hasStyle = true;
    result.isStyleScoped = !!styleMatch[1];
    result.style = styleMatch[2].trim();
  }

  return result;
}

/**
 * Generate a unique style ID for scoped styles
 */
function generateStyleId(filePath: string): string {
  let hash = 0;
  for (let i = 0; i < filePath.length; i++) {
    const char = filePath.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `fynix-${Math.abs(hash).toString(36)}`;
}

/**
 * Transform SFC to component code
 */
function transformSFC(
  parsed: SFCParsedResult,
  filePath: string,
  jsxFactory: string
): string {
  const styleId = generateStyleId(filePath);
  const lines: string[] = [];

  lines.push(`import { ${jsxFactory} } from '@fynixorg/ui';`);

  if (parsed.imports.length > 0) {
    parsed.imports.forEach((importLine) => {
      lines.push(importLine);
    });
  }

  lines.push("");

  if (parsed.hasStyle) {
    let processedStyle = parsed.style;

    if (parsed.isStyleScoped) {
      processedStyle = scopeStyles(parsed.style, styleId);
    }

    lines.push(`// Inject styles`);
    lines.push(`if (typeof document !== 'undefined') {`);
    lines.push(`  const styleId = '${styleId}';`);
    lines.push(`  if (!document.getElementById(styleId)) {`);
    lines.push(`    const styleEl = document.createElement('style');`);
    lines.push(`    styleEl.id = styleId;`);
    lines.push(`    styleEl.textContent = ${JSON.stringify(processedStyle)};`);
    lines.push(`    document.head.appendChild(styleEl);`);
    lines.push(`  }`);
    lines.push(`}`);
    lines.push("");
  }

  // ✅ Add exports BEFORE component (module-level)
  if (parsed.exports.length > 0) {
    parsed.exports.forEach((exportLine) => {
      lines.push(exportLine);
    });
    lines.push("");
  }

  // ✅ Use separate function declaration
  lines.push(`function FynixComponent(props = {}) {`);

  if (parsed.hasLogic && parsed.logic.trim()) {
    lines.push(`  // Component logic`);
    const logicLines = parsed.logic.split("\n");
    logicLines.forEach((line) => {
      if (line.trim()) {
        lines.push(`  ${line}`);
      }
    });
    lines.push("");
  }

  // Inject meta tags if meta export exists
  if (parsed.exports.some((e) => e.trim().startsWith("export const meta"))) {
    lines.push(
      `  if (typeof document !== "undefined" && typeof meta !== "undefined") {`
    );
    lines.push(`    document.title = meta.title;`);
    lines.push(`    const metaTags = [`);
    lines.push(`      { name: "description", content: meta.description },`);
    lines.push(`      { name: "keywords", content: meta.keywords },`);
    lines.push(`      { property: "og:title", content: meta.ogTitle },`);
    lines.push(
      `      { property: "og:description", content: meta.ogDescription },`
    );
    lines.push(`      { property: "og:image", content: meta.ogImage },`);
    lines.push(`    ];`);
    lines.push(`    metaTags.forEach(({ name, property, content }) => {`);
    lines.push(`      if (!content) return;`);
    lines.push(`      let tag;`);
    lines.push(`      if (name) {`);
    lines.push(
      `        tag = document.querySelector(\`meta[name='\${name}\']\`);`
    );
    lines.push(`        if (!tag) {`);
    lines.push(`          tag = document.createElement("meta");`);
    lines.push(`          tag.setAttribute("name", name);`);
    lines.push(`          document.head.appendChild(tag);`);
    lines.push(`        }`);
    lines.push(`      } else if (property) {`);
    lines.push(
      `        tag = document.querySelector(\`meta[property='\${property}\']\`);`
    );
    lines.push(`        if (!tag) {`);
    lines.push(`          tag = document.createElement("meta");`);
    lines.push(`          tag.setAttribute("property", property);`);
    lines.push(`          document.head.appendChild(tag);`);
    lines.push(`        }`);
    lines.push(`      }`);
    lines.push(`      if (tag) tag.setAttribute("content", content);`);
    lines.push(`    });`);
    lines.push(`  }`);
    lines.push("");
  }

  if (parsed.hasView) {
    lines.push(`  // Component view`);

    if (parsed.isStyleScoped) {
      lines.push(`  return (`);
      lines.push(`    <div data-${styleId}="">`);
      const viewLines = parsed.view.split("\n");
      viewLines.forEach((line) => {
        lines.push(`      ${line}`);
      });
      lines.push(`    </div>`);
      lines.push(`  );`);
    } else {
      lines.push(`  return (`);
      const viewLines = parsed.view.split("\n");
      viewLines.forEach((line) => {
        lines.push(`    ${line}`);
      });
      lines.push(`  );`);
    }
  } else {
    lines.push(`  return null;`);
  }

  lines.push(`}`);
  lines.push("");

  // ✅ Export default separately
  lines.push(`export default FynixComponent;`);

  return lines.join("\n");
}

/**
 * Scope CSS styles by adding data attribute selector
 */
function scopeStyles(css: string, scopeId: string): string {
  const dataAttr = `[data-${scopeId}]`;

  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (match, selector, rules) => {
    if (selector.trim().startsWith("@")) {
      return match;
    }

    const selectors = selector.split(",").map((s: string) => {
      const trimmed = s.trim();

      const pseudoMatch = trimmed.match(/^(.+?)(::?[a-z-]+(?:\([^)]*\))?)$/i);
      if (pseudoMatch) {
        return `${dataAttr} ${pseudoMatch[1]}${pseudoMatch[2]}`;
      }

      return `${dataAttr} ${trimmed}`;
    });

    return `${selectors.join(", ")}{${rules}}`;
  });
}

/**
 * Validate SFC structure
 */
function validateSFC(parsed: SFCParsedResult, filePath: string): void {
  if (!parsed.hasView) {
    throw new Error(
      `${colors.red}[Fynix SFC]${colors.reset} Missing <view> block in ${colors.cyan}${filePath}${colors.reset}. Every .fnx file must have a <view> section.`
    );
  }

  if (parsed.hasLogic && !["ts", "js"].includes(parsed.logicLang)) {
    throw new Error(
      `${colors.red}[Fynix SFC]${colors.reset} Invalid setup attribute in <logic> block in ${colors.cyan}${filePath}${colors.reset}. Must be "ts" or "js".`
    );
  }

  if (parsed.hasLogic && parsed.logicLang === "js") {
    const tsPatterns = [
      { pattern: /\binterface\s+\w+/, name: "interface declaration" },
      { pattern: /\btype\s+\w+\s*=/, name: "type alias" },
      { pattern: /:\s*\w+(\[\]|<[^>]+>)?\s*[;,=)]/, name: "type annotation" },
      { pattern: /<\w+>(?!\s*<)/, name: "generic type" },
      { pattern: /\benum\s+\w+/, name: "enum declaration" },
      { pattern: /\bas\s+\w+/, name: "type assertion" },
      { pattern: /\bnamespace\s+\w+/, name: "namespace" },
      { pattern: /\babstract\s+class/, name: "abstract class" },
      {
        pattern: /\bpublic\s+|private\s+|protected\s+/,
        name: "access modifier",
      },
    ];

    const allCode = parsed.logic + "\n" + parsed.imports.join("\n");

    for (const { pattern, name } of tsPatterns) {
      if (pattern.test(allCode)) {
        throw new Error(
          `${colors.red}[Fynix SFC]${colors.reset} TypeScript syntax detected ${colors.yellow}(${name})${colors.reset} in ${colors.cyan}${filePath}${colors.reset} with ${colors.yellow}setup="js"${colors.reset}.\n` +
            `${colors.gray}Either change to setup="ts" or remove TypeScript-specific syntax.${colors.reset}`
        );
      }
    }
  }
}

/**
 * Improved type checker with better error handling and virtual file system
 */
class TypeScriptChecker {
  private compilerOptions: ts.CompilerOptions;
  private virtualFiles: Map<string, string> = new Map();
  private program: ts.Program | null = null;

  constructor(customOptions?: ts.CompilerOptions) {
    this.compilerOptions = {
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
      isolatedModules: true,
      ...customOptions,
    };
  }

  addFile(fileName: string, content: string): void {
    this.virtualFiles.set(fileName, content);
    this.program = null;
  }

  private createCompilerHost(): ts.CompilerHost {
    const defaultHost = ts.createCompilerHost(this.compilerOptions);

    return {
      ...defaultHost,
      getSourceFile: (fileName, languageVersion) => {
        if (this.virtualFiles.has(fileName)) {
          const content = this.virtualFiles.get(fileName);
          if (content === undefined) return undefined;
          return ts.createSourceFile(fileName, content, languageVersion, true);
        }

        try {
          if (ts.sys.fileExists(fileName)) {
            const content = ts.sys.readFile(fileName);
            if (content !== undefined) {
              return ts.createSourceFile(
                fileName,
                content,
                languageVersion,
                true
              );
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
          const content = this.virtualFiles.get(fileName);
          return content === undefined ? undefined : content;
        }
        const sysContent = ts.sys.readFile(fileName);
        return sysContent === undefined ? undefined : sysContent;
      },
      writeFile: () => {},
    };
  }

  checkFile(fileName: string): string[] {
    const errors: string[] = [];

    try {
      if (!this.virtualFiles.has(fileName)) {
        return ["File not found in virtual file system"];
      }

      const compilerHost = this.createCompilerHost();

      if (!this.program) {
        this.program = ts.createProgram(
          [fileName],
          this.compilerOptions,
          compilerHost
        );
      }

      const sourceFile = this.program.getSourceFile(fileName);
      if (!sourceFile) {
        return [`Could not get source file for ${fileName}`];
      }

      const diagnostics = [
        ...this.program.getSyntacticDiagnostics(sourceFile),
        ...this.program.getSemanticDiagnostics(sourceFile),
      ];

      const skipCodes = new Set([2307, 2792, 7016, 2304, 7026, 2874]);

      diagnostics.forEach((diagnostic) => {
        if (skipCodes.has(diagnostic.code)) {
          return;
        }

        if (diagnostic.file && diagnostic.start !== undefined) {
          const pos = diagnostic.file.getLineAndCharacterOfPosition(
            diagnostic.start
          );
          const line = pos?.line ?? 0;
          const character = pos?.character ?? 0;
          const message = ts.flattenDiagnosticMessageText(
            diagnostic.messageText,
            "\n"
          );
          errors.push(
            `${colors.yellow}Line ${line + 1}:${character + 1}${colors.reset} - ${message} ${colors.gray}(TS${diagnostic.code})${colors.reset}`
          );
        } else {
          const message = ts.flattenDiagnosticMessageText(
            diagnostic.messageText,
            "\n"
          );
          errors.push(
            `${message} ${colors.gray}(TS${diagnostic.code})${colors.reset}`
          );
        }
      });
    } catch (error) {
      errors.push(
        `${colors.red}Type checking error:${colors.reset} ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return errors;
  }

  clear(): void {
    this.virtualFiles.clear();
    this.program = null;
  }
}

/**
 * Vite plugin for Fynix framework with improved SFC support
 */
export default function fynixPlugin(options: FynixPluginOptions = {}): any {
  const {
    jsxFactory = "Fynix",
    jsxFragment = "Fynix.Fragment",
    include = [".ts", ".js", ".jsx", ".tsx", ".fnx"],
    exclude = ["node_modules"],
    sourcemap = true,
    esbuildOptions = {},
    enableSFC = true,
    showGeneratedCode = false,
    typeCheck = false,
    tsConfig,
  } = options;

  let typeChecker: TypeScriptChecker | null = null;

  if (typeCheck) {
    typeChecker = new TypeScriptChecker(tsConfig);
  }

  return {
    name: "vite-plugin-fynix-sfc",
    enforce: "pre" as const,

    async transform(code: string, id: string) {
      const normalizedId = normalizePath(id);

      const shouldExclude = exclude.some((pattern) =>
        normalizedId.includes(pattern)
      );
      if (shouldExclude) return null;

      const shouldInclude = include.some((ext) => normalizedId.endsWith(ext));
      if (!shouldInclude) return null;

      const ctx = this as unknown as TransformContext;
      if (typeof ctx.addWatchFile === "function") {
        ctx.addWatchFile(id);
      }

      try {
        let codeToTransform = code;
        let loader: TransformOptions["loader"] = "tsx";
        let shouldTypeCheck = false;

        if (normalizedId.endsWith(".fnx") && enableSFC) {
          const parsed = parseSFC(code);
          validateSFC(parsed, normalizedId);

          codeToTransform = transformSFC(parsed, normalizedId, jsxFactory);

          if (showGeneratedCode) {
            console.log(`\n${colors.cyan}${"=".repeat(80)}${colors.reset}`);
            console.log(
              `${colors.cyan}[Fynix SFC]${colors.reset} Generated code for: ${colors.gray}${normalizedId}${colors.reset}`
            );
            console.log(`${colors.cyan}${"=".repeat(80)}${colors.reset}`);
            console.log(codeToTransform);
            console.log(`${colors.cyan}${"=".repeat(80)}${colors.reset}\n`);
          }

          shouldTypeCheck = typeCheck && parsed.logicLang === "ts";
          loader = parsed.logicLang === "ts" ? "tsx" : "jsx";

          if (shouldTypeCheck && typeChecker) {
            const virtualFileName = normalizedId.replace(
              /\.fnx$/,
              ".virtual.tsx"
            );
            typeChecker.addFile(virtualFileName, codeToTransform);
            const typeErrors = typeChecker.checkFile(virtualFileName);

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

            shouldTypeCheck = false;
          }
        } else {
          if (normalizedId.endsWith(".ts")) {
            loader = "ts";
            shouldTypeCheck = typeCheck;
          } else if (normalizedId.endsWith(".tsx")) {
            loader = "tsx";
            shouldTypeCheck = typeCheck;
          } else if (normalizedId.endsWith(".jsx")) {
            loader = "jsx";
          } else if (normalizedId.endsWith(".js")) {
            loader = "js";
          }
        }

        if (shouldTypeCheck && typeChecker) {
          typeChecker.addFile(normalizedId, codeToTransform);
          const typeErrors = typeChecker.checkFile(normalizedId);

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
        }

        const result = await transform(codeToTransform, {
          loader,
          jsxFactory,
          jsxFragment,
          sourcemap,
          sourcefile: id,
          target: "esnext",
          format: "esm",
          ...esbuildOptions,
        });

        return {
          code: result.code,
          map: result.map || null,
        };
      } catch (error) {
        const err = error as Error;
        console.error(
          `\n${colors.red}${colors.bold}[Fynix SFC] Transform Error${colors.reset} in ${colors.cyan}${id}${colors.reset}:`
        );
        console.error(`  ${colors.red}${err.message}${colors.reset}\n`);

        const ctx = this as unknown as TransformContext;
        if (typeof ctx.error === "function") {
          ctx.error({
            message: `Failed to transform ${id}: ${err.message}`,
            stack: err.stack,
            id,
          });
        } else {
          throw err;
        }
        return null;
      }
    },

    handleHotUpdate(ctx: HmrContext) {
      const { file, server } = ctx;
      const normalizedFile = normalizePath(file);
      const shouldReload = include.some((ext) => normalizedFile.endsWith(ext));

      if (shouldReload) {
        console.log(
          `${colors.green}[HMR]${colors.reset} ${colors.gray}${normalizedFile}${colors.reset}`
        );

        if (typeChecker) {
          typeChecker.clear();
        }

        server.ws.send({
          type: "full-reload",
          path: "*",
        });
        return [];
      }

      return undefined;
    },

    config() {
      const config: Omit<UserConfig, "plugins"> = {
        esbuild: {
          jsxFactory,
          jsxFragment,
          jsxInject: `import { ${jsxFactory} } from '@fynixorg/ui'`,
        },
        optimizeDeps: {
          include: ["@fynixorg/ui"],
          esbuildOptions: {
            jsx: "transform",
            jsxFactory,
            jsxFragment,
          },
        },
        resolve: {
          extensions: [".fnx", ".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      };

      return config;
    },

    buildStart() {
      console.log(
        `${colors.cyan}[vite-plugin-fynix-sfc]${colors.reset} Initialized`
      );
      if (enableSFC) {
        console.log(
          `${colors.cyan}[vite-plugin-fynix-sfc]${colors.reset} SFC support: ${colors.green}enabled${colors.reset}`
        );
      }
      if (typeCheck) {
        console.log(
          `${colors.cyan}[vite-plugin-fynix-sfc]${colors.reset} Type checking: ${colors.green}enabled${colors.reset}`
        );
      }
    },

    buildEnd() {
      if (typeChecker) {
        typeChecker.clear();
      }
    },
  };
}

export { fynixPlugin, TypeScriptChecker };
export type { FynixPluginOptions, SFCParsedResult };
