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

declare module "fynixui" {
  // ============================================
  // Core Types
  // ============================================

  export type VNode = {
    type: string | symbol | ((props: any) => any);
    props: Record<string, any>;
    key: string | number | null;
    _domNode?: Node;
    _rendered?: VNode;
    _state?: any;
  };

  // ============================================
  // State Management Types
  // ============================================

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

  export interface NixStore<T extends Record<string, any>> {
    _isNixStore: true;
    subscribe(callback: () => void): () => void;
    getState(): T;
    setState(updates: Partial<T> | ((state: T) => Partial<T>)): void;
    [key: string]: any;
  }

  export interface NixAsyncResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
  }

  export interface NixFormField<T = any> {
    value: T;
    error: string | null;
    touched: boolean;
  }

  export interface NixFormState<T extends Record<string, any>> {
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

  export interface NixLazyComponent {
    Component: any;
    loading: boolean;
    error: Error | null;
  }

  // ============================================
  // Hook Functions
  // ============================================

  /**
   * Creates a reactive state that automatically updates the UI when changed.
   * @param initialValue - The initial value for the state
   * @returns A reactive state object with value getter/setter
   * @example
   * const count = nixState(0);
   * count.value++; // Updates UI automatically
   */
  export function nixState<T>(initialValue: T): NixState<T>;

  /**
   * Creates a reactive store for managing multiple related state values.
   * @param initialState - The initial state object
   * @returns A reactive store with direct property access
   * @example
   * const user = nixStore({ name: 'John', age: 30 });
   * user.name = 'Jane'; // Updates UI automatically
   */
  export function nixStore<T extends Record<string, any>>(
    initialState: T
  ): NixStore<T>;

  /**
   * Manages async operations with loading and error states.
   * @param fn - Async function to execute
   * @returns Object with data, loading, error, and refetch
   * @example
   * const result = nixAsync(() => fetch('/api/data').then(r => r.json()));
   */
  export function nixAsync<T>(fn: () => Promise<T>): NixAsyncResult<T>;

  /**
   * Runs side effects when dependencies change.
   * @param fn - Effect function, can return cleanup function
   * @param deps - Array of dependencies
   * @example
   * nixEffect(() => {
   *   console.log('Count changed:', count.value);
   *   return () => console.log('Cleanup');
   * }, [count]);
   */
  export function nixEffect(fn: () => void | (() => void), deps?: any[]): void;

  /**
   * Creates a computed value that updates when dependencies change.
   * @param fn - Computation function
   * @param deps - Array of dependencies
   * @returns Reactive state with computed value
   * @example
   * const doubled = nixComputed(() => count.value * 2, [count]);
   */
  export function nixComputed<T>(fn: () => T, deps: any[]): NixState<T>;

  /**
   * Creates a form state manager with validation.
   * @param config - Form configuration
   * @returns Form state manager
   * @example
   * const form = nixForm({
   *   initialValues: { email: '', password: '' },
   *   onSubmit: (values) => console.log(values),
   *   validate: (values) => ({
   *     email: !values.email ? 'Required' : null
   *   })
   * });
   */
  export function nixForm<T extends Record<string, any>>(config: {
    initialValues: T;
    onSubmit: (values: T) => void | Promise<void>;
    validate?: (values: T) => { [K in keyof T]?: string };
  }): NixFormState<T>;

  /**
   * Memoizes a computed value to prevent unnecessary recalculations.
   */
  export function nixMemo<T>(fn: () => T, deps: any[]): T;

  /**
   * Creates a memoized callback function.
   */
  export function nixCallback<T extends (...args: any[]) => any>(
    callback: T,
    deps: any[]
  ): T;

  /**
   * Creates a reference to a DOM element or value.
   */
  export function nixRef<T = any>(
    initialValue?: T
  ): {
    current: T;
  };

  /**
   * Returns the previous value of a state or variable.
   */
  export function nixPrevious<T>(value: T): T | undefined;

  /**
   * Debounces a value update.
   */
  export function nixDebounce<T>(value: T, delay: number): NixState<T>;

  /**
   * Manages intervals within component lifecycle.
   */
  export function nixInterval(callback: () => void, delay: number | null): void;

  /**
   * Manages localStorage with reactive updates.
   */
  export function nixLocalStorage<T>(key: string, initialValue: T): NixState<T>;

  /**
   * Lazy loads a component.
   */
  export function nixLazy(
    loader: () => Promise<{ default: any }>
  ): NixLazyComponent;

  /**
   * Effect that runs only once on mount.
   */
  export function nixEffectOnce(fn: () => void | (() => void)): void;

  /**
   * Effect that runs on every render.
   */
  export function nixEffectAlways(fn: () => void | (() => void)): void;

  /**
   * Async with caching support.
   */
  export function nixAsyncCached<T>(
    key: string,
    fn: () => Promise<T>
  ): NixAsyncResult<T>;

  /**
   * Async with debouncing.
   */
  export function nixAsyncDebounce<T>(
    fn: () => Promise<T>,
    delay: number
  ): NixAsyncResult<T>;

  /**
   * Async with query parameters.
   */
  export function nixAsyncQuery<T>(
    fn: (query: any) => Promise<T>,
    query: any
  ): NixAsyncResult<T>;

  /**
   * Form with async validation.
   */
  export function nixFormAsync<T extends Record<string, any>>(config: {
    initialValues: T;
    onSubmit: (values: T) => Promise<void>;
    validate?: (values: T) => Promise<{ [K in keyof T]?: string }>;
  }): NixFormState<T>;

  /**
   * Lazy async operation.
   */
  export function nixLazyAsync<T>(loader: () => Promise<T>): NixAsyncResult<T>;

  /**
   * Lazy form with async operations.
   */
  export function nixLazyFormAsync<T extends Record<string, any>>(config: {
    initialValues: T;
    onSubmit: (values: T) => Promise<void>;
  }): NixFormState<T>;

  // ============================================
  // JSX Factory
  // ============================================

  export namespace Fynix {
    export function Fragment(props: { children?: any }): VNode;
  }

  export function Fynix(
    type: string | symbol | ((props: any) => any),
    props: any,
    ...children: any[]
  ): VNode;

  // ============================================
  // Router
  // ============================================

  export interface FynixRouter {
    mountRouter(selector?: string): void;
    navigate(path: string, props?: Record<string, any>): void;
    replace(path: string, props?: Record<string, any>): void;
    back(): void;
    cleanup(): void;
  }

  // Fixed: createFynix can accept optional routes or no arguments
  export function createFynix(routes?: Record<string, any>): FynixRouter;
  export default createFynix;

  // ============================================
  // Components
  // ============================================

  export function Suspense(props: { fallback: any; children: any }): VNode;

  export function Button(props: any): VNode;
  export function Path(props: any): VNode;

  // ============================================
  // Utilities
  // ============================================

  export const TEXT: unique symbol;
  export const Fragment: unique symbol;
}
