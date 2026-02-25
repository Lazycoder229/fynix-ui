/* MIT License

* Copyright (c) 2026 Resty Gonzales

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
 */

// =====================================================
// types/vite-env.d.ts - Complete Vite Environment Types
// =====================================================
/// <reference types="vite/client" />

/**
 * Environment variables available in import.meta.env
 * Add your custom VITE_ prefixed variables here
 */
interface ImportMetaEnv {
  // Vite built-in env variables
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly SSR: boolean;

  // Custom Fynix environment variables
  readonly VITE_APP_TITLE?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_API_KEY?: string;
  readonly VITE_PUBLIC_PATH?: string;
  readonly VITE_ROUTER_BASE?: string;

  // Add more custom env variables as needed
  // Example:
  // readonly VITE_STRIPE_PUBLIC_KEY?: string;
  // readonly VITE_FIREBASE_API_KEY?: string;
  // readonly VITE_ANALYTICS_ID?: string;
}

/**
 * Extended ImportMeta interface for Vite
 */
interface ImportMeta {
  /** Environment variables */
  readonly env: ImportMetaEnv;

  /**
   * Vite Hot Module Replacement API
   * @see https://vitejs.dev/guide/api-hmr.html
   */
  readonly hot?: ViteHotContext;

  /**
   * Vite glob import - imports multiple modules
   * @see https://vitejs.dev/guide/features.html#glob-import
   */
  readonly glob: {
    <T = any>(
      pattern: string | string[],
      options?: GlobOptions<true>
    ): Record<string, T>;
    <T = any>(
      pattern: string | string[],
      options: GlobOptions<false>
    ): Record<string, () => Promise<T>>;
    <T = any>(
      pattern: string | string[],
      options?: GlobOptions<boolean>
    ): Record<string, T | (() => Promise<T>)>;
  };

  /**
   * Vite URL imports - import assets as URLs
   * @see https://vitejs.dev/guide/assets.html#explicit-url-imports
   */
  readonly url?: string;
}

/**
 * Vite HMR API Context
 */
interface ViteHotContext {
  /**
   * Accept hot updates for this module
   * @param callback - Optional callback when module is updated
   */
  accept(callback?: (newModule: any) => void): void;

  /**
   * Accept hot updates with specific dependencies
   * @param deps - Array of dependency paths
   * @param callback - Callback when dependencies are updated
   */
  accept(
    deps: string | string[],
    callback: (newModules: any | any[]) => void
  ): void;

  /**
   * Cleanup before this module is replaced
   * @param callback - Cleanup function
   */
  dispose(callback: (data: any) => void): void;

  /**
   * Decline HMR for this module (forces full reload)
   */
  decline(): void;

  /**
   * Invalidate this module and trigger a full reload
   */
  invalidate(): void;

  /**
   * Listen for custom HMR events
   * @param event - Event name
   * @param callback - Event handler
   */
  on<T = any>(event: string, callback: (payload: T) => void): void;

  /**
   * Send custom HMR event to all clients
   * @param event - Event name
   * @param data - Event payload
   */
  send<T = any>(event: string, data?: T): void;

  /**
   * Data object persisted across hot updates
   */
  data: any;

  /**
   * Prune accepted modules that are no longer imported
   */
  prune(callback: (data: any) => void): void;
}

/**
 * Glob import options
 */
interface GlobOptions<Eager extends boolean = boolean> {
  /**
   * Import modules eagerly (at build time)
   * @default false
   */
  eager?: Eager;

  /**
   * Import as specific type
   * - 'url': Import as URL string
   * - 'raw': Import as raw string
   * - undefined: Import as module (default)
   */
  as?: "url" | "raw";

  /**
   * Custom import query parameters
   */
  query?: string | Record<string, string | number | boolean> | URLSearchParams;

  /**
   * Import default export only
   * @default true
   */
  import?: string;

  /**
   * Glob patterns are case-sensitive
   * @default true
   */
  caseSensitive?: boolean;

  /**
   * Restrict glob to specific number of results
   */
  exhaustive?: boolean;
}

/**
 * Asset URL with query parameters
 */
type AssetUrl = string & {
  /** Mark as asset URL type */
  readonly __assetUrl: unique symbol;
};

/**
 * Module declarations for asset imports
 */
declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.svg?component" {
  import { FunctionalComponent, SVGAttributes } from "vue";
  const component: FunctionalComponent<SVGAttributes>;
  export default component;
}

declare module "*.svg?url" {
  const url: AssetUrl;
  export default url;
}

declare module "*.svg?raw" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const url: AssetUrl;
  export default url;
}

declare module "*.jpg" {
  const url: AssetUrl;
  export default url;
}

declare module "*.jpeg" {
  const url: AssetUrl;
  export default url;
}

declare module "*.gif" {
  const url: AssetUrl;
  export default url;
}

declare module "*.webp" {
  const url: AssetUrl;
  export default url;
}

declare module "*.avif" {
  const url: AssetUrl;
  export default url;
}

declare module "*.ico" {
  const url: AssetUrl;
  export default url;
}

declare module "*.bmp" {
  const url: AssetUrl;
  export default url;
}

/**
 * CSS Modules
 */
declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.module.scss" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.module.sass" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.module.less" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.module.styl" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

/**
 * Regular CSS imports
 */
declare module "*.css" {
  const content: string;
  export default content;
}

declare module "*.scss" {
  const content: string;
  export default content;
}

declare module "*.sass" {
  const content: string;
  export default content;
}

declare module "*.less" {
  const content: string;
  export default content;
}

declare module "*.styl" {
  const content: string;
  export default content;
}

/**
 * Web Worker imports
 */
declare module "*?worker" {
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}

declare module "*?worker&inline" {
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}

declare module "*?worker&url" {
  const url: AssetUrl;
  export default url;
}

/**
 * Shared Worker imports
 */
declare module "*?sharedworker" {
  const SharedWorkerFactory: new () => SharedWorker;
  export default SharedWorkerFactory;
}

declare module "*?sharedworker&inline" {
  const SharedWorkerFactory: new () => SharedWorker;
  export default SharedWorkerFactory;
}

declare module "*?sharedworker&url" {
  const url: AssetUrl;
  export default url;
}

/**
 * JSON imports
 */
declare module "*.json" {
  const value: any;
  export default value;
}

/**
 * WebAssembly imports
 */
declare module "*.wasm" {
  const initWasm: (
    imports?: WebAssembly.Imports
  ) => Promise<WebAssembly.Instance>;
  export default initWasm;
}

declare module "*.wasm?init" {
  const initWasm: (
    imports?: WebAssembly.Imports
  ) => Promise<WebAssembly.Instance>;
  export default initWasm;
}

declare module "*.wasm?url" {
  const url: AssetUrl;
  export default url;
}

/**
 * Font file imports
 */
declare module "*.woff" {
  const url: AssetUrl;
  export default url;
}

declare module "*.woff2" {
  const url: AssetUrl;
  export default url;
}

declare module "*.ttf" {
  const url: AssetUrl;
  export default url;
}

declare module "*.otf" {
  const url: AssetUrl;
  export default url;
}

declare module "*.eot" {
  const url: AssetUrl;
  export default url;
}

/**
 * Video file imports
 */
declare module "*.mp4" {
  const url: AssetUrl;
  export default url;
}

declare module "*.webm" {
  const url: AssetUrl;
  export default url;
}

declare module "*.ogg" {
  const url: AssetUrl;
  export default url;
}

declare module "*.mp3" {
  const url: AssetUrl;
  export default url;
}

declare module "*.wav" {
  const url: AssetUrl;
  export default url;
}

declare module "*.flac" {
  const url: AssetUrl;
  export default url;
}

declare module "*.aac" {
  const url: AssetUrl;
  export default url;
}

/**
 * Document imports
 */
declare module "*.pdf" {
  const url: AssetUrl;
  export default url;
}

declare module "*.txt" {
  const content: string;
  export default content;
}

declare module "*.md" {
  const content: string;
  export default content;
}

/**
 * Raw imports (bypass loaders)
 */
declare module "*?raw" {
  const content: string;
  export default content;
}

/**
 * URL imports (get asset URL)
 */
declare module "*?url" {
  const url: AssetUrl;
  export default url;
}

/**
 * Inline imports (inline as base64)
 */
declare module "*?inline" {
  const content: string;
  export default content;
}

/**
 * TypeScript/JavaScript module re-declarations
 * (already in global.d.ts but keeping for completeness)
 */
declare module "*.ts" {
  const content: any;
  export default content;
}

declare module "*.tsx" {
  const content: any;
  export default content;
}

declare module "*.js" {
  const content: any;
  export default content;
}

declare module "*.jsx" {
  const content: any;
  export default content;
}

declare module "*.mjs" {
  const content: any;
  export default content;
}

/**
 * Global augmentation for Vite client types
 */
declare global {
  /**
   * Client-side HMR WebSocket connection
   */
  interface ViteWebSocket extends WebSocket {
    send(data: string): void;
    addEventListener(
      type: "message",
      listener: (event: MessageEvent<any>) => void
    ): void;
  }
}

// Ensure this is treated as a module
export { };
