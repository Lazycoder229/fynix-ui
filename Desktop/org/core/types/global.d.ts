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
/**
 * Virtual DOM node type - re-exported from fnx.d.ts (single source of truth)
 */
export type { VNode } from "./fnx";

// global.d.ts - Fynix Global Type Declarations

/**
 * Reactive state object - references actual nixState return type
 */
export type NixState<T> = {
  value: T;
  subscribe: (fn: (value: T) => void) => () => void;
  cleanup: () => void;
  getSubscriberCount: () => number;
  isDestroyed: () => boolean;
  asReadOnly: () => {
    value: T;
    subscribe: (fn: (value: T) => void) => () => void;
    _isNixState: true;
    _isReadOnly: true;
  };
  _isNixState: true;
};

/**
 * Reactive store object
 */
interface NixStore<T extends Record<string, any>> {
  _isNixStore: true;
  subscribe(callback: () => void): () => void;
  getState(): T;
  setState(updates: Partial<T> | ((state: T) => Partial<T>)): void;
  [key: string]: any;
}

/**
 * Async state result
 */
interface NixAsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Form field
 */
interface NixFormField<T = any> {
  value: T;
  error: string | null;
  touched: boolean;
}

/**
 * Form state
 */
interface NixFormState<T extends Record<string, any>> {
  values: { [K in keyof T]: NixFormField<T[K]> };
  isValid: boolean;
  isSubmitting: boolean;
  errors: { [K in keyof T]?: string };
  handleSubmit: (
    onSubmit: (values: T) => void | Promise<void>
  ) => (e?: Event) => Promise<void>;
  reset: () => void;
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setFieldError: <K extends keyof T>(field: K, error: string) => void;
}

/**
 * Lazy component result
 */
interface NixLazyComponent {
  Component: any;
  loading: boolean;
  error: Error | null;
}

/**
 * Fynix Router instance
 */
interface FynixRouter {
  mountRouter(selector?: string): void;
  navigate(path: string, props?: Record<string, any>): void;
  replace(path: string, props?: Record<string, any>): void;
  back(): void;
  cleanup(): void;
  routes: Record<string, any>;
  dynamicRoutes: Array<{
    pattern: string;
    regex: RegExp;
    component: any;
    params: string[];
  }>;
}

/**
 * Window object extensions for Fynix framework
 */
interface Window {
  /** Cache for router props to prevent memory leaks */
  __fynixPropsCache?: Map<string, any>;

  /** Link props namespace for router navigation */
  __fynixLinkProps__?: Record<string, any>;

  /** Last route props passed to components */
  __lastRouteProps?: any;

  /** Fynix global state and utilities */
  __fynix__?: {
    /** Current route props */
    lastRouteProps?: any;
    /** Force re-render function */
    rerender?: () => void;
    /** Hot Module Replacement handler */
    hmr?: (ctx: { mod: any }) => void;
  };
}

/**
 * HTMLElement extensions for event delegation and Fynix internals
 */
interface HTMLElement {
  /** Event delegation ID for r-* event handlers */
  _rest_eid?: number;

  /** Fynix internal data storage */
  _fynix_?: any;
}

/**
 * Node extensions for Fynix virtual DOM
 */
interface Node {
  /** Event delegation ID */
  _rest_eid?: number;
  /** Fynix cleanup functions */
  _fynixCleanups?: Array<() => void>;
}

/**
 * Text node type with nodeValue
 */
interface Text {
  nodeValue: string | null;
}

/**
 * Vite-specific import.meta extensions
 */
interface ImportMeta {
  /** Vite Hot Module Replacement API */
  readonly hot?: {
    /** Accept HMR updates */
    accept: (cb?: (mod: any) => void) => void;
    /** Cleanup before module disposal */
    dispose: (cb: () => void) => void;
    /** Decline HMR for this module */
    decline?: () => void;
    /** Invalidate and force full reload */
    invalidate?: () => void;
    /** Custom HMR event handling */
    on?: (event: string, cb: (...args: any[]) => void) => void;
  };

  /** Vite glob import function */
  readonly glob: <T = any>(
    pattern: string,
    options?: {
      /** Load modules eagerly (at build time) */
      eager?: boolean;
      /** Import as URL strings */
      as?: "url" | "raw";
      /** Custom import query */
      query?: Record<string, string | number | boolean>;
    }
  ) => Record<string, T>;

  /** Environment variables */
  readonly env: {
    MODE: string;
    BASE_URL: string;
    PROD: boolean;
    DEV: boolean;
    SSR: boolean;
    [key: string]: any;
  };
}

/**
 * Module declarations for non-TypeScript files
 */
declare module "*.css" {
  const content: string;
  export default content;
}

declare module "*.scss" {
  const content: string;
  export default content;
}

declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  export default content;
}

declare module "*.gif" {
  const content: string;
  export default content;
}

declare module "*.webp" {
  const content: string;
  export default content;
}

/**
 * Fynix-specific module patterns
 */


declare module "*.js" {
  const Component: any;
  export default Component;
}
declare module "*.fnx" {
  const Component: any;
  export default Component;
}
declare module "*.ts" {
  const Component: any;
  export default Component;
}
/**
 * Vite client types
 */
/// <reference types="vite/client" />

