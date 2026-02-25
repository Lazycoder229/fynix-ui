type Priority = "immediate" | "high" | "normal" | "low" | "idle";
interface FynixFiber {
    type: string | symbol | ComponentFunction;
    props: any;
    key: string | number | null;
    child: FynixFiber | null;
    sibling: FynixFiber | null;
    parent: FynixFiber | null;
    alternate: FynixFiber | null;
    effectTag: "PLACEMENT" | "UPDATE" | "DELETION" | null;
    updatePriority: Priority;
    _domNode?: Node | null;
    _rendered?: FynixFiber | null;
    hooks?: any[];
    context?: ComponentContext;
}
export type VNodeType = string | symbol | ComponentFunction;
export type VNodeChild = VNode | string | number | boolean | null | undefined;
export type VNodeChildren = VNodeChild | VNodeChild[];
export interface VNodeProps {
    children?: VNode[];
    key?: string | number | null;
    [key: string]: any;
}
export interface VNode {
    type: VNodeType;
    props: VNodeProps;
    key: string | number | null;
    _domNode?: Node | null;
    _rendered?: VNode | null;
    _state?: ReactiveState<any> | null;
    _cleanup?: (() => void) | null;
}
export interface ComponentFunction {
    (props: any): VNode | Promise<VNode>;
}
interface ReactiveState<T> {
    value: T;
    _isNixState: boolean;
    subscribe(callback: () => void): () => void;
}
interface ComponentContext {
    hooks: any[];
    hookIndex: number;
    effects: Array<() => void | (() => void)>;
    cleanups: Array<() => void>;
    _vnode: VNode;
    _accessedStates: Set<ReactiveState<any>>;
    _subscriptions: Set<ReactiveState<any>>;
    _subscriptionCleanups: Array<() => void>;
    version: number;
    rerender: (() => void) | null;
    Component: ComponentFunction;
    _isMounted: boolean;
    _isRerendering: boolean;
}
import { Button, Path } from "./custom/index";
import { nixAsync } from "./hooks/nixAsync";
import { nixAsyncCached } from "./hooks/nixAsyncCache";
import { nixAsyncDebounce } from "./hooks/nixAsyncDebounce";
import { nixAsyncQuery } from "./hooks/nixAsyncQuery";
import { nixCallback } from "./hooks/nixCallback";
import { nixComputed } from "./hooks/nixComputed";
import { nixDebounce } from "./hooks/nixDebounce";
import { nixEffect, nixEffectAlways, nixEffectOnce } from "./hooks/nixEffect";
import { nixForm } from "./hooks/nixForm";
import { nixFormAsync } from "./hooks/nixFormAsync";
import { nixInterval } from "./hooks/nixInterval";
import { nixLazy, Suspense } from "./hooks/nixLazy";
import { nixLazyAsync } from "./hooks/nixLazyAsync";
import { nixLazyFormAsync } from "./hooks/nixLazyFormAsync";
import { nixLocalStorage } from "./hooks/nixLocalStorage";
import { nixMemo } from "./hooks/nixMemo";
import { nixPrevious } from "./hooks/nixPrevious";
import { nixRef } from "./hooks/nixRef";
import { nixState } from "./hooks/nixState";
import { nixStore } from "./hooks/nixStore";
import createFynix from "./router/router";
declare class FiberRenderer {
    private workInProgressRoot;
    private nextUnitOfWork;
    private currentRoot;
    private deletions;
    scheduleWork(fiber: FynixFiber): void;
    workLoop(deadline: number): void;
    performUnitOfWork(fiber: FynixFiber): FynixFiber | null;
    private reconcileChildren;
    private commitRoot;
    private commitWork;
    private commitDeletion;
    private updateDom;
}
export declare function useFiberRenderer(): FiberRenderer;
declare class HierarchicalStore {
    private root;
    private selectorCache;
    private stateSnapshot;
    select<T>(selector: (state: any) => T): T;
    optimisticUpdate<T>(path: string, update: T, rollback?: () => void): {
        commit: () => void;
        rollback: () => void;
    };
    private getState;
    private get;
    private set;
    private clearRollback;
    private invalidateSelectors;
}
export declare function useHierarchicalStore(): HierarchicalStore;
export declare const TEXT: unique symbol;
export declare const Fragment: unique symbol;
export declare const BOOLEAN_ATTRS: Set<string>;
export declare const DOM_PROPERTIES: Set<string>;
export declare const DANGEROUS_HTML_PROPS: Set<string>;
export declare const DANGEROUS_PROTOCOLS: Set<string>;
export declare const SAFE_PROTOCOLS: Set<string>;
export declare function createTextVNode(text: any): VNode;
export declare function h(type: VNodeType, props?: VNodeProps | null, ...children: VNodeChildren[]): VNode;
export declare namespace h {
    var Fragment: ({ children }: {
        children?: VNode[];
    }) => VNode[];
}
export declare const Fynix: typeof h;
export declare function renderComponent(Component: ComponentFunction, props?: any): VNode;
export declare function patch(parent: Node, newVNode: VNode | string | number | null | undefined, oldVNode: VNode | string | number | null | undefined): Promise<void>;
declare function mount(AppComponent: ComponentFunction, root: string | Element, props?: any): void;
declare function hydrate(AppComponent: ComponentFunction, root: string | Element, props?: any): void;
export { Button, createFynix, nixAsync, nixAsyncCached, nixAsyncDebounce, nixAsyncQuery, nixCallback, nixComputed, nixDebounce, nixEffect, nixEffectAlways, nixEffectOnce, nixForm, nixFormAsync, nixInterval, nixLazy, nixLazyAsync, nixLazyFormAsync, nixLocalStorage, nixMemo, nixPrevious, nixRef, nixState, nixStore, Path, Suspense, mount, hydrate, };
