// Type definitions for Fynix Runtime
// This file provides TypeScript support for the Fynix framework

/// <reference path="./types/jsx.d.ts" />
/// <reference path="./types/global.d.ts" />

export const TEXT: unique symbol;
export const Fragment: unique symbol;

export interface VNode {
  type: string | symbol | ((props: any) => any);
  props: Record<string, any>;
  key: string | number | null;
  _domNode?: Node;
  _rendered?: VNode;
  _state?: any;
}

export type Element = 
  | VNode
  | string 
  | number 
  | boolean 
  | null 
  | undefined
  | Element[];

export type ComponentFunction<P = {}> = (props: P) => Element;

export function Fynix(
  type: string | symbol | ComponentFunction,
  props?: Record<string, any> | null,
  ...children: any[]
): VNode;

export namespace Fynix {
  export function Fragment(props: { children?: any }): any;
}

export const h: typeof Fynix;

export function createTextVNode(text: string | number | any): VNode;

export function mount(
  AppComponent: ComponentFunction,
  root: string | Element,
  hydrate?: boolean,
  props?: Record<string, any>
): void;

export function renderComponent(
  Component: ComponentFunction,
  props?: Record<string, any>
): VNode;

// Hooks
export function nixState<T>(initialValue: T): any;
export function nixStore<T extends Record<string, any>>(initialState: T): any;
export function nixComputed<T>(fn: () => T): any;
export function nixRef<T = any>(initial?: T): { current: T };
export function nixEffect(fn: () => void | (() => void), deps?: any[]): void;
export function nixEffectAlways(fn: () => void | (() => void)): void;
export function nixEffectOnce(fn: () => void | (() => void)): void;
export function nixInterval(callback: () => void, delay: number): void;
export function nixMemo<T>(fn: () => T, deps?: any[]): T;
export function nixCallback<T extends (...args: any[]) => any>(fn: T, deps?: any[]): T;
export function nixPrevious<T>(value: T): T | undefined;
export function nixAsync<T>(fn: (signal: AbortSignal) => Promise<T>): any;
export function nixAsyncCached<T>(fn: () => Promise<T>, cacheKey?: string): any;
export function nixAsyncDebounce<T>(fn: () => Promise<T>, delay: number): any;
export function nixAsyncQuery<T>(queryKey: any, queryFn: () => Promise<T>, options?: any): any;
export function nixDebounce<T extends (...args: any[]) => any>(fn: T, delay: number): T;
export function nixLocalStorage<T>(key: string, initialValue: T): any;
export function nixLazy(loader: () => Promise<any>): any;
export function nixLazyAsync(loader: () => Promise<any>): any;
export function nixForm<T extends Record<string, any>>(initialValues: T, options?: any): any;
export function nixFormAsync<T extends Record<string, any>>(initialValues: T, options?: any): any;
export function nixLazyFormAsync<T extends Record<string, any>>(loader: () => Promise<any>, options?: any): any;

// Components
export const Suspense: any;
export const Path: any;
export const Button: any;
