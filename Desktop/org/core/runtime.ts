/* MIT License

* Copyright (c) 2026 Resty Gonzales
*
* SECURITY NOTICE:
* This runtime includes built-in XSS protection mechanisms.
* For additional security, consider implementing:
* 1. Content Security Policy (CSP) headers
* 2. Subresource Integrity (SRI) for external scripts
* 3. Regular security audits of your application code
* 4. Input validation on the server side
*
* CSP Header Example:
* Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';

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

// ---------------------- Types ----------------------

// Advanced Scheduling Types
type Priority = "immediate" | "high" | "normal" | "low" | "idle";
type UpdateType = "state" | "props" | "effect" | "layout";

interface Update {
  id: string;
  type: UpdateType;
  priority: Priority;
  component?: ComponentContext;
  callback: () => void;
  timestamp: number;
}

interface PriorityQueue<T> {
  push(item: T, priority: Priority): void;
  pop(): T | undefined;
  peek(): T | undefined;
  size(): number;
  isEmpty(): boolean;
}

interface ReactiveScheduler {
  schedule(update: Update, priority: Priority): void;
  batchUpdates(updates: Update[]): void;
  timeSlice(deadline: number): boolean;
  flush(): void;
}

// Fiber Architecture Types
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

// ---------------------- Imports ----------------------

import { activeContext, setActiveContext } from "./context/context";
import { Button, Path } from "./custom/index";
import { removeErrorOverlay, showErrorOverlay } from "./error/errorOverlay";
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

// ---------------------- Advanced Scheduling System ----------------------

class SimplePriorityQueue<T> implements PriorityQueue<T> {
  private items: Array<{ item: T; priority: Priority }> = [];
  private priorityOrder: Record<Priority, number> = {
    immediate: 0,
    high: 1,
    normal: 2,
    low: 3,
    idle: 4,
  };

  push(item: T, priority: Priority): void {
    this.items.push({ item, priority });
    this.items.sort(
      (a, b) => this.priorityOrder[a.priority] - this.priorityOrder[b.priority]
    );
  }

  pop(): T | undefined {
    return this.items.shift()?.item;
  }

  peek(): T | undefined {
    return this.items[0]?.item;
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

class FynixScheduler implements ReactiveScheduler {
  private updateQueue = new SimplePriorityQueue<Update>();
  private batchedUpdates = new Set<Update>();
  private isScheduled = false;
  private isWorking = false;
  private currentPriority: Priority = "normal";
  private updateIdCounter = 0;

  schedule(update: Update, priority: Priority = "normal"): void {
    update.id = `update_${this.updateIdCounter++}`;
    update.priority = priority;
    update.timestamp = performance.now();

    if (priority === "immediate") {
      this.flushUpdate(update);
    } else {
      this.updateQueue.push(update, priority);
      this.scheduleWork();
    }
  }

  batchUpdates(updates: Update[]): void {
    updates.forEach((update) => this.batchedUpdates.add(update));
    this.scheduleWork();
  }

  timeSlice(deadline: number): boolean {
    const startTime = performance.now();
    const previousPriority = this.currentPriority;

    while (
      !this.updateQueue.isEmpty() &&
      performance.now() - startTime < deadline
    ) {
      const update = this.updateQueue.pop();
      if (update) {
        // Check if we should yield to higher priority work
        if (this.shouldYield() && update.priority !== "immediate") {
          // Put update back and yield
          this.updateQueue.push(update, update.priority);
          break;
        }

        this.flushUpdate(update);
      }
    }

    this.currentPriority = previousPriority;
    return this.updateQueue.isEmpty();
  }

  flush(): void {
    if (this.isWorking) return;

    this.isWorking = true;

    try {
      // Process immediate updates first
      while (!this.updateQueue.isEmpty()) {
        const update = this.updateQueue.peek();
        if (update && update.priority === "immediate") {
          this.flushUpdate(this.updateQueue.pop()!);
        } else {
          break;
        }
      }

      // Process batched updates
      this.batchedUpdates.forEach((update) => this.flushUpdate(update));
      this.batchedUpdates.clear();
    } finally {
      this.isWorking = false;
      this.isScheduled = false;
    }
  }

  private flushUpdate(update: Update): void {
    const previousPriority = this.currentPriority;
    this.currentPriority = update.priority;

    try {
      update.callback();
    } catch (error) {
      console.error("[FynixScheduler] Update error:", error);
      showErrorOverlay(error as Error);
    } finally {
      this.currentPriority = previousPriority;
    }
  }

  private scheduleWork(): void {
    if (this.isScheduled) return;

    this.isScheduled = true;

    // Use different scheduling strategies based on priority
    const nextUpdate = this.updateQueue.peek();
    if (nextUpdate) {
      if (nextUpdate.priority === "high") {
        // High priority - schedule for next frame
        requestAnimationFrame(() => this.workLoop(16.67)); // ~60fps
      } else {
        // Normal/low priority - use idle time
        if ("requestIdleCallback" in window) {
          requestIdleCallback((deadline) => {
            this.workLoop(deadline.timeRemaining());
          });
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(() => this.workLoop(5), 0);
        }
      }
    }
  }

  private workLoop(deadline: number): void {
    const hasMoreWork = !this.timeSlice(deadline);

    if (hasMoreWork) {
      // Continue in next frame/idle period
      this.isScheduled = false;
      this.scheduleWork();
    } else {
      this.flush();
    }
  }

  getCurrentPriority(): Priority {
    return this.currentPriority;
  }

  // Check if current execution should yield to higher priority work
  shouldYield(): boolean {
    const nextUpdate = this.updateQueue.peek();
    if (!nextUpdate) return false;

    const currentPriorityLevel = this.getPriorityLevel(this.currentPriority);
    const nextPriorityLevel = this.getPriorityLevel(nextUpdate.priority);

    return nextPriorityLevel < currentPriorityLevel;
  }

  private getPriorityLevel(priority: Priority): number {
    const levels = { immediate: 0, high: 1, normal: 2, low: 3, idle: 4 };
    return levels[priority];
  }
}

// Global scheduler instance
const scheduler = new FynixScheduler();

// ---------------------- Fiber Architecture ----------------------

class FiberRenderer {
  private workInProgressRoot: FynixFiber | null = null;
  private nextUnitOfWork: FynixFiber | null = null;
  private currentRoot: FynixFiber | null = null;
  private deletions: FynixFiber[] = [];

  scheduleWork(fiber: FynixFiber): void {
    this.workInProgressRoot = {
      ...fiber,
      alternate: this.currentRoot,
    };
    this.nextUnitOfWork = this.workInProgressRoot;
    this.deletions = [];

    scheduler.schedule(
      {
        id: "",
        type: "layout",
        priority: "high",
        callback: () => this.workLoop(5),
        timestamp: performance.now(),
      },
      "high"
    );
  }

  workLoop(deadline: number): void {
    const startTime = performance.now();

    while (this.nextUnitOfWork && performance.now() - startTime < deadline) {
      this.nextUnitOfWork = this.performUnitOfWork(this.nextUnitOfWork);
    }

    if (!this.nextUnitOfWork && this.workInProgressRoot) {
      // Commit phase
      this.commitRoot();
    } else if (this.nextUnitOfWork) {
      // Continue work in next frame
      scheduler.schedule(
        {
          id: "",
          type: "layout",
          priority: "normal",
          callback: () => this.workLoop(5),
          timestamp: performance.now(),
        },
        "normal"
      );
    }
  }

  performUnitOfWork(fiber: FynixFiber): FynixFiber | null {
    // Reconcile children
    this.reconcileChildren(fiber, fiber.props?.children || []);

    // Return next unit of work
    if (fiber.child) {
      return fiber.child;
    }

    let nextFiber: FynixFiber | null = fiber;
    while (nextFiber) {
      if (nextFiber.sibling) {
        return nextFiber.sibling;
      }
      nextFiber = nextFiber.parent;
    }

    return null;
  }

  private reconcileChildren(wipFiber: FynixFiber, elements: any[]): void {
    let index = 0;
    let oldFiber = wipFiber.alternate?.child;
    let prevSibling: FynixFiber | null = null;

    while (index < elements.length || oldFiber != null) {
      const element = elements[index];
      let newFiber: FynixFiber | null = null;

      const sameType = oldFiber && element && element.type === oldFiber.type;

      if (sameType && oldFiber) {
        // Update the fiber
        newFiber = {
          type: oldFiber.type,
          props: element.props,
          key: element.key,
          _domNode: oldFiber._domNode,
          parent: wipFiber,
          alternate: oldFiber,
          effectTag: "UPDATE",
          updatePriority: "normal",
          child: null,
          sibling: null,
          _rendered: null,
        };
      }

      if (element && !sameType) {
        // Create new fiber
        newFiber = {
          type: element.type,
          props: element.props,
          key: element.key,
          _domNode: null,
          parent: wipFiber,
          alternate: null,
          effectTag: "PLACEMENT",
          updatePriority: "normal",
          child: null,
          sibling: null,
          _rendered: null,
        };
      }

      if (oldFiber && !sameType) {
        // Delete old fiber
        oldFiber.effectTag = "DELETION";
        this.deletions.push(oldFiber);
      }

      if (oldFiber) {
        oldFiber = oldFiber.sibling;
      }

      if (index === 0) {
        wipFiber.child = newFiber;
      } else if (newFiber && prevSibling) {
        prevSibling.sibling = newFiber;
      }

      prevSibling = newFiber;
      index++;
    }
  }

  private commitRoot(): void {
    this.deletions.forEach((fiber) => this.commitWork(fiber));
    if (this.workInProgressRoot?.child) {
      this.commitWork(this.workInProgressRoot.child);
    }
    this.currentRoot = this.workInProgressRoot;
    this.workInProgressRoot = null;
  }

  private commitWork(fiber: FynixFiber | null): void {
    if (!fiber) return;

    let domParentFiber = fiber.parent;
    while (!domParentFiber?._domNode) {
      domParentFiber = domParentFiber?.parent || null;
    }

    const domParent = domParentFiber?._domNode;

    if (fiber.effectTag === "PLACEMENT" && fiber._domNode && domParent) {
      domParent.appendChild(fiber._domNode);
    } else if (fiber.effectTag === "UPDATE" && fiber._domNode) {
      // Update DOM properties
      this.updateDom(
        fiber._domNode as Element,
        fiber.alternate?.props || {},
        fiber.props
      );
    } else if (fiber.effectTag === "DELETION" && domParent) {
      this.commitDeletion(fiber, domParent);
    }

    this.commitWork(fiber.child);
    this.commitWork(fiber.sibling);
  }

  private commitDeletion(fiber: FynixFiber, domParent: Node): void {
    if (fiber._domNode) {
      domParent.removeChild(fiber._domNode);
    } else if (fiber.child) {
      this.commitDeletion(fiber.child, domParent);
    }
  }

  private updateDom(dom: Element, prevProps: any, nextProps: any): void {
    // Remove old properties
    Object.keys(prevProps)
      .filter((key) => key !== "children" && !(key in nextProps))
      .forEach((name) => {
        if (name.startsWith("on")) {
          const eventType = name.toLowerCase().substring(2);
          (dom as any).removeEventListener(eventType, prevProps[name]);
        } else {
          (dom as any)[name] = "";
        }
      });

    // Set new properties
    Object.keys(nextProps)
      .filter((key) => key !== "children")
      .forEach((name) => {
        if (prevProps[name] !== nextProps[name]) {
          if (name.startsWith("on")) {
            const eventType = name.toLowerCase().substring(2);
            (dom as any).addEventListener(eventType, nextProps[name]);
          } else {
            (dom as any)[name] = nextProps[name];
          }
        }
      });
  }
}

// Global fiber renderer instance
const fiberRenderer = new FiberRenderer();

// Export for use in enhanced rendering
export function useFiberRenderer(): FiberRenderer {
  return fiberRenderer;
}

// ---------------------- Enhanced State Store ----------------------

interface StoreNode<T = any> {
  path: string;
  value: T;
  children: Map<string, StoreNode>;
  subscribers: Set<() => void>;
  selector?: (state: any) => T;
}

class HierarchicalStore {
  private root = new Map<string, StoreNode>();
  private selectorCache = new Map<string, any>();
  private stateSnapshot: any = {};

  select<T>(selector: (state: any) => T): T {
    const selectorKey = selector.toString();

    if (this.selectorCache.has(selectorKey)) {
      return this.selectorCache.get(selectorKey);
    }

    const result = selector(this.getState());
    this.selectorCache.set(selectorKey, result);

    return result;
  }

  optimisticUpdate<T>(path: string, update: T, rollback?: () => void) {
    const original = this.get(path);
    this.set(path, update);

    return {
      commit: () => this.clearRollback(path),
      rollback: () => {
        this.set(path, original);
        rollback?.();
      },
    };
  }

  private getState(): any {
    return this.stateSnapshot;
  }

  private get(path: string): any {
    return this.root.get(path)?.value;
  }

  private set(path: string, value: any): void {
    const node = this.root.get(path);
    if (node) {
      node.value = value;
      this.stateSnapshot = { ...this.stateSnapshot, [path]: value };
      this.invalidateSelectors();
    }
  }

  private clearRollback(path: string): void {
    // Mark optimistic update as committed - no rollback needed
    // This could involve clearing rollback data or updating transaction logs
    console.log(
      `[HierarchicalStore] Optimistic update committed for path: ${path}`
    );
  }

  private invalidateSelectors(): void {
    this.selectorCache.clear();
  }
}

// Global hierarchical store instance
const hierarchicalStore = new HierarchicalStore();

// Export for advanced state management
export function useHierarchicalStore(): HierarchicalStore {
  return hierarchicalStore;
}
// ---------------------- Symbols ----------------------

export const TEXT = Symbol("text");
export const Fragment = Symbol("Fragment");

// ---------------------- Constants ----------------------

export const BOOLEAN_ATTRS = new Set([
  "checked",
  "selected",
  "disabled",
  "readonly",
  "multiple",
  "autoplay",
  "controls",
  "loop",
  "muted",
  "open",
  "required",
  "reversed",
  "scoped",
  "seamless",
  "autofocus",
  "novalidate",
  "formnovalidate",
]);

export const DOM_PROPERTIES = new Set([
  "value",
  "checked",
  "selected",
  "selectedIndex",
  "innerHTML",
  "textContent",
  "innerText",
]);

// Security: Dangerous HTML properties that should be sanitized
export const DANGEROUS_HTML_PROPS = new Set([
  "innerHTML",
  "outerHTML",
  "insertAdjacentHTML",
  "srcdoc",
]);

// Security: Dangerous URL protocols
export const DANGEROUS_PROTOCOLS = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "about:",
]);

// Security: Allowed URL protocols
export const SAFE_PROTOCOLS = new Set([
  "http:",
  "https:",
  "ftp:",
  "ftps:",
  "mailto:",
  "tel:",
  "#",
  "/",
  "./",
  "../",
]);

// ---------------------- Virtual Node Helpers ----------------------

/**
 * Creates a text virtual node from any value
 * Handles reactive state values by subscribing to changes
 *
 * @param text - Any value to convert to text (string, number, reactive state, etc.)
 * @returns VNode representing the text content
 *
 * @example
 * ```typescript
 * const textNode = createTextVNode("Hello World");
 * const reactiveText = createTextVNode(nixState("Dynamic Text"));
 * ```
 */
export function createTextVNode(text: any): VNode {
  if (text == null || text === false) {
    return { type: TEXT, props: { nodeValue: "" }, key: null };
  }

  if (text && typeof text === "object" && text._isNixState) {
    const vnode: VNode = {
      type: TEXT,
      props: { nodeValue: String(text.value) },
      key: null,
      _state: text,
      _cleanup: null,
    };

    vnode._cleanup = text.subscribe(() => {
      if (vnode._domNode) {
        (vnode._domNode as Text).nodeValue = String(text.value);
      }
    });

    return vnode;
  }

  return { type: TEXT, props: { nodeValue: String(text) }, key: null };
}

/**
 * Creates a virtual node (hyperscript function)
 * The core function for creating virtual DOM elements
 *
 * @param type - Element type (string for HTML elements, symbol for special nodes, or component function)
 * @param props - Element properties and attributes (can be null)
 * @param children - Child elements (can be nested arrays, will be flattened)
 * @returns VNode representing the element
 *
 * @example
 * ```typescript
 * // HTML element
 * const div = h('div', { class: 'container' }, 'Hello');
 *
 * // Component
 * const component = h(MyComponent, { prop: 'value' });
 *
 * // Fragment
 * const fragment = h(Fragment, null, child1, child2);
 * ```
 */
export function h(
  type: VNodeType,
  props: VNodeProps | null = null,
  ...children: VNodeChildren[]
): VNode {
  const normalizedProps: VNodeProps =
    props === null || typeof props !== "object" || Array.isArray(props)
      ? {}
      : props;

  const flatChildren: VNode[] = [];

  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;

    if (c && typeof c === "object" && "_isNixState" in c) {
      flatChildren.push(createTextVNode(c));
    } else if (typeof c === "string" || typeof c === "number") {
      flatChildren.push(createTextVNode(c));
    } else if (c && typeof c === "object" && "type" in c) {
      if (c.type === Fragment) {
        const fragmentChildren = (c.props.children || []).filter(
          (x: any) => x != null && x !== false
        );
        flatChildren.push(...fragmentChildren);
      } else {
        flatChildren.push(c as VNode);
      }
    } else if (typeof c === "function") {
      // Preserve function children as-is (used by components like <For>)
      flatChildren.push(c as any);
    } else {
      flatChildren.push(createTextVNode(String(c)));
    }
  }

  const key = normalizedProps.key ?? null;
  if (key !== undefined) delete normalizedProps.key;

  if (type === Fragment) {
    return { type: Fragment, props: { children: flatChildren }, key };
  }

  return {
    type,
    props: { ...normalizedProps, children: flatChildren },
    key,
  };
}

h.Fragment = ({ children }: { children?: VNode[] }) => children || [];

export const Fynix = h;
Fynix.Fragment = h.Fragment;

// ---------------------- Component Management ----------------------

const componentInstances = new WeakMap<VNode, ComponentContext>();
let rootRenderFn: (() => Promise<void>) | null = null;
const pendingRerenders = new WeakSet<ComponentContext>();

/**
 * Initializes or retrieves a component context for rendering
 * Sets up the component's hooks, state tracking, and lifecycle management
 *
 * @param vnode - The virtual node representing the component
 * @returns ComponentContext for the component
 *
 * @internal Used by the runtime for component lifecycle management
 */
function beginComponent(vnode: VNode): ComponentContext {
  let ctx = componentInstances.get(vnode);

  if (!ctx) {
    ctx = {
      hooks: [],
      hookIndex: 0,
      effects: [],
      cleanups: [],
      _vnode: vnode,
      _accessedStates: new Set(),
      _subscriptions: new Set(),
      _subscriptionCleanups: [],
      version: 0,
      rerender: null,
      Component: vnode.type as ComponentFunction,
      _isMounted: false,
      _isRerendering: false,
    };
    componentInstances.set(vnode, ctx);
  }

  ctx.hookIndex = 0;
  ctx._accessedStates.clear();
  setActiveContext(ctx);
  ctx.version++;

  return ctx;
}

/**
 * Finalizes component rendering and sets up reactive subscriptions
 * Handles state change subscriptions and cleanup for component reactivity
 *
 * @internal Used by the runtime after component rendering
 */
function endComponent(): void {
  const ctx = activeContext as ComponentContext | null;
  if (!ctx) return;

  ctx._accessedStates.forEach((state) => {
    if (!ctx._subscriptions.has(state)) {
      if (!ctx.rerender) {
        let rerenderTimeout: NodeJS.Timeout | null = null;

        ctx.rerender = function rerender() {
          if (ctx._isRerendering || pendingRerenders.has(ctx)) {
            return;
          }

          if (rerenderTimeout) {
            clearTimeout(rerenderTimeout);
          }

          rerenderTimeout = setTimeout(async () => {
            if (ctx._isRerendering || !ctx._isMounted) return;

            ctx._isRerendering = true;
            pendingRerenders.add(ctx);

            try {
              removeErrorOverlay();

              const vnode = ctx._vnode;
              const oldRendered = vnode._rendered;

              beginComponent(vnode);
              const result = ctx.Component(vnode.props);
              const newRendered =
                result instanceof Promise ? await result : result;
              endComponent();

              vnode._rendered = newRendered;

              const domNode = vnode._domNode;
              if (domNode && domNode.parentNode) {
                await patch(domNode.parentNode, newRendered, oldRendered);
                if (newRendered && typeof newRendered === "object") {
                  vnode._domNode = (newRendered as VNode)._domNode;
                }
                ctx._isRerendering = false;
                pendingRerenders.delete(ctx);
              } else if (rootRenderFn) {
                await rootRenderFn();
                ctx._isRerendering = false;
                pendingRerenders.delete(ctx);
              } else {
                ctx._isRerendering = false;
                pendingRerenders.delete(ctx);
              }
            } catch (err) {
              console.error("[Fynix] Component rerender error:", err);
              showErrorOverlay(err as Error);
              ctx._isRerendering = false;
              pendingRerenders.delete(ctx);
            }

            rerenderTimeout = null;
          }, 0);
        };
      }

      const unsub = state.subscribe(() => {
        if (ctx.rerender && ctx._isMounted) {
          if (typeof queueMicrotask === "function") {
            queueMicrotask(() => ctx.rerender!());
          } else {
            setTimeout(ctx.rerender, 0);
          }
        }
      });

      ctx._subscriptions.add(state);
      ctx._subscriptionCleanups.push(unsub);
    }
  });

  setActiveContext(null);
}

/**
 * Renders a component function with given props
 * Handles both synchronous and asynchronous components
 *
 * @param Component - The component function to render
 * @param props - Properties to pass to the component
 * @returns VNode result of the component rendering
 *
 * @example
 * ```typescript
 * const MyComponent = (props) => h('div', null, props.message);
 * const rendered = renderComponent(MyComponent, { message: 'Hello' });
 * ```
 */
export function renderComponent(
  Component: ComponentFunction,
  props: any = {}
): VNode {
  const vnode: VNode = { type: Component, props, key: null };
  const ctx = beginComponent(vnode);
  ctx.Component = Component;

  if (!ctx.rerender) {
    let rerenderTimeout: NodeJS.Timeout | null = null;

    ctx.rerender = () => {
      if (ctx._isRerendering || pendingRerenders.has(ctx)) return;

      if (rerenderTimeout) {
        clearTimeout(rerenderTimeout);
      }

      rerenderTimeout = setTimeout(async () => {
        if (ctx._isRerendering || !ctx._isMounted) return;

        ctx._isRerendering = true;
        pendingRerenders.add(ctx);

        try {
          removeErrorOverlay();

          const vnode = ctx._vnode;
          const oldRendered = vnode._rendered;

          beginComponent(vnode);
          const result = ctx.Component(vnode.props);
          const newRendered = result instanceof Promise ? await result : result;
          endComponent();

          vnode._rendered = newRendered;

          const domNode = vnode._domNode;
          if (domNode && domNode.parentNode) {
            await patch(domNode.parentNode, newRendered, oldRendered);
            if (newRendered && typeof newRendered === "object") {
              vnode._domNode = (newRendered as VNode)._domNode;
            }
            ctx._isRerendering = false;
            pendingRerenders.delete(ctx);
          } else if (rootRenderFn) {
            await rootRenderFn();
            ctx._isRerendering = false;
            pendingRerenders.delete(ctx);
          } else {
            ctx._isRerendering = false;
            pendingRerenders.delete(ctx);
          }
        } catch (err) {
          console.error("[Fynix] Component rerender error:", err);
          showErrorOverlay(err as Error);
          ctx._isRerendering = false;
          pendingRerenders.delete(ctx);
        }

        rerenderTimeout = null;
      }, 0);
    };
  }

  try {
    removeErrorOverlay();
    const result = Component(props);

    // Handle both sync and async components
    if (result instanceof Promise) {
      // For async components, return a placeholder and handle async rendering
      const placeholderVNode = h("div", null, "Loading...");
      ctx._vnode = vnode;
      vnode._rendered = placeholderVNode;
      ctx._isMounted = true;

      result
        .then((resolvedVNode) => {
          vnode._rendered = resolvedVNode;
          if (ctx.rerender) {
            ctx.rerender();
          }
        })
        .catch((err) => {
          console.error("[Fynix] Async component error:", err);
          showErrorOverlay(err as Error);
        });

      return placeholderVNode;
    }

    ctx._vnode = vnode;
    vnode._rendered = result;
    ctx._isMounted = true;
    return result;
  } catch (err) {
    console.error("[Fynix] Component render error:", err);
    showErrorOverlay(err as Error);
    return h(
      "div",
      { style: "color:red" },
      `Error: ${sanitizeErrorMessage(err)}`
    );
  } finally {
    endComponent();
  }
}

// ---------------------- Event Delegation ----------------------

const delegatedEvents = new Map<string, Map<number, (e: Event) => void>>();
let eventIdCounter = 1;

/**
 * Ensures event delegation is set up for a specific event type
 * Creates a global event listener that delegates to specific elements
 *
 * @param eventType - The event type to delegate (e.g., 'click', 'change')
 *
 * @internal Used by the event system for performance optimization
 */
function ensureDelegated(eventType: string): void {
  if (delegatedEvents.has(eventType)) return;

  delegatedEvents.set(eventType, new Map());

  document.addEventListener(eventType, (e: Event) => {
    let cur: Node | null = e.target as Node;

    while (cur && cur !== document) {
      if (cur.nodeType !== 1) break;

      const el = cur as any;
      const eid = el._rest_eid;
      const map = delegatedEvents.get(eventType);

      if (eid != null && map?.has(eid)) {
        map.get(eid)!(e);
        return;
      }

      cur = (cur as Element).parentElement;
    }
  });
}

/**
 * Registers an event handler using the delegation system
 * More efficient than individual event listeners on each element
 *
 * @param el - The HTML element to attach the handler to
 * @param eventName - Name of the event (without 'on' prefix)
 * @param fn - Event handler function
 *
 * @internal Used when processing r- prefixed event attributes
 */
function registerDelegatedHandler(
  el: HTMLElement,
  eventName: string,
  fn: (e: Event) => void
): void {
  if (!fn || el.nodeType !== 1) return;

  const anyEl = el as any;
  const eid = anyEl._rest_eid ?? (anyEl._rest_eid = ++eventIdCounter);

  ensureDelegated(eventName);

  delegatedEvents.get(eventName)!.set(eid, (e: Event) => {
    try {
      fn.call(el, e);
    } catch (err) {
      console.error("[Fynix] Event handler error:", err);
      showErrorOverlay(err as Error);
    }
  });
}

// ---------------------- Security Helpers ----------------------

/**
 * Sanitizes text content to prevent XSS attacks
 */
function sanitizeText(text: string): string {
  if (typeof text !== "string") return String(text);

  // Remove potentially dangerous characters and patterns
  return text
    .replace(/[<>"'&]/g, (match) => {
      const entityMap: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "&": "&amp;",
      };
      return entityMap[match] || match;
    })
    .replace(/javascript:/gi, "blocked:")
    .replace(/data:.*?base64/gi, "blocked:");
}

/**
 * Sanitizes attribute values
 */
function sanitizeAttributeValue(value: string): string {
  if (typeof value !== "string") return String(value);

  return value
    .replace(/["'<>]/g, (match) => {
      const entityMap: Record<string, string> = {
        '"': "&quot;",
        "'": "&#x27;",
        "<": "&lt;",
        ">": "&gt;",
      };
      return entityMap[match] || match;
    })
    .replace(/javascript:/gi, "blocked:")
    .replace(/on\w+=/gi, "blocked=");
}

/**
 * Validates and sanitizes error messages to prevent XSS
 */
function sanitizeErrorMessage(error: any): string {
  if (!error) return "Unknown error";

  const message = error.message || error.toString() || "Unknown error";
  return sanitizeText(String(message)).slice(0, 200); // Limit length
}

// ---------------------- Property Setter ----------------------

/**
 * Sets a property or attribute on an HTML element with security validation
 * Handles special cases like reactive classes, events, and dangerous properties
 *
 * @param el - The HTML element to modify
 * @param key - Property/attribute name
 * @param value - Value to set
 *
 * @security Blocks dangerous properties like innerHTML and validates URLs
 *
 * @internal Used during DOM creation and updates
 */
function setProperty(el: HTMLElement, key: string, value: any): void {
  const k = key.toLowerCase();

  if (key === "r-class" || key === "rc") {
    if (typeof value === "string") {
      el.setAttribute("class", value);
    } else if (value && (value._isNixState || value._isRestState)) {
      el.setAttribute("class", value.value);

      const anyEl = el as any;
      if (!anyEl._fynixCleanups) anyEl._fynixCleanups = [];

      const unsub = value.subscribe(() =>
        el.setAttribute("class", value.value)
      );
      anyEl._fynixCleanups.push(unsub);
    }
    return;
  }

  if (key.startsWith("r-")) {
    registerDelegatedHandler(el, key.slice(2).toLowerCase(), value);
    return;
  }

  if (key === "style" && typeof value === "object") {
    Object.assign(el.style, value);
    return;
  }

  // Security: Block dangerous HTML properties completely
  if (DANGEROUS_HTML_PROPS.has(key)) {
    console.error(
      `[Fynix] Security: ${key} is blocked for security reasons. Use textContent or children instead.`
    );
    return;
  }

  // Security: Validate URL attributes more thoroughly
  if (
    (key === "href" ||
      key === "src" ||
      key === "action" ||
      key === "formaction") &&
    typeof value === "string"
  ) {
    const normalizedValue = value.trim().toLowerCase();

    // Check for dangerous protocols (blacklist)
    for (const protocol of DANGEROUS_PROTOCOLS) {
      if (normalizedValue.startsWith(protocol)) {
        console.error(
          `[Fynix] Security: ${protocol} protocol blocked in ${key}`
        );
        return;
      }
    }

    // Validate against safe protocols (whitelist) - more secure approach
    if (normalizedValue.includes(":")) {
      const protocol = normalizedValue.split(":")[0] + ":";
      if (
        !SAFE_PROTOCOLS.has(protocol) &&
        !SAFE_PROTOCOLS.has(normalizedValue.charAt(0))
      ) {
        console.error(
          `[Fynix] Security: Protocol '${protocol}' not in safe list for ${key}`
        );
        return;
      }
    }

    // Additional validation for data: URLs (can contain base64 encoded scripts)
    if (normalizedValue.startsWith("data:")) {
      if (
        normalizedValue.includes("javascript") ||
        normalizedValue.includes("<script")
      ) {
        console.error(
          `[Fynix] Security: Suspicious data: URL blocked in ${key}`
        );
        return;
      }
    }
  }

  // Security: Sanitize event handler attributes
  if (key.toLowerCase().startsWith("on") && key !== "open") {
    console.error(
      `[Fynix] Security: Inline event handler '${key}' blocked. Use r-${key.slice(2)} instead.`
    );
    return;
  }

  if (BOOLEAN_ATTRS.has(k)) {
    if (value) {
      el.setAttribute(k, "");
      (el as any)[k] = true;
    } else {
      el.removeAttribute(k);
      (el as any)[k] = false;
    }
    return;
  }

  if (DOM_PROPERTIES.has(key) && !DANGEROUS_HTML_PROPS.has(key)) {
    // Security: Sanitize textContent and innerText
    if (key === "textContent" || key === "innerText") {
      (el as any)[key] = sanitizeText(value ?? "");
    } else {
      (el as any)[key] = value ?? "";
    }
    return;
  }

  if (key.startsWith("data-") || key.startsWith("aria-")) {
    if (value != null && value !== false) {
      // Security: Sanitize data and aria attributes
      el.setAttribute(key, sanitizeAttributeValue(String(value)));
    } else {
      el.removeAttribute(key);
    }
    return;
  }

  if (value != null && value !== false) {
    el.setAttribute(key, value);
  }
}

// ---------------------- DOM Creation ----------------------

/**
 * Creates actual DOM nodes from virtual nodes
 * Handles all types of vnodes including components, text, and fragments
 *
 * @param vnode - Virtual node or primitive value to create DOM for
 * @param existing - Existing DOM node to reuse (optional)
 * @returns Promise resolving to the created DOM node
 *
 * @example
 * ```typescript
 * const vnode = h('div', { class: 'test' }, 'Hello');
 * const domNode = await createDom(vnode);
 * document.body.appendChild(domNode);
 * ```
 *
 * @internal Core function for DOM creation
 */
async function createDom(
  vnode: VNode | string | number | Promise<any> | null | undefined,
  existing: Node | null = null
): Promise<Node> {
  if (vnode == null) {
    return document.createTextNode("");
  }

  if (typeof vnode === "string" || typeof vnode === "number") {
    return document.createTextNode(String(vnode));
  }

  if (vnode instanceof Promise) {
    const placeholder = document.createTextNode("Loading...");

    vnode
      .then(async (resolved) => {
        try {
          const dom = await createDom(resolved);
          if (placeholder.parentNode) {
            placeholder.replaceWith(dom);
          }
        } catch (err) {
          console.error("[Fynix] Async component error:", err);
          if (placeholder.parentNode) {
            placeholder.textContent = "Error loading component";
          }
        }
      })
      .catch((err) => {
        console.error("[Fynix] Async component promise error:", err);
        if (placeholder.parentNode) {
          placeholder.textContent = "Error loading async component";
        }
      });

    return placeholder;
  }

  const vnodeObj = vnode as VNode;

  if (vnodeObj.type === TEXT) {
    const textValue = String(vnodeObj.props.nodeValue ?? "");
    if (existing && existing.nodeType === 3) {
      if (existing.nodeValue !== textValue) {
        existing.nodeValue = textValue;
      }
      vnodeObj._domNode = existing;
      return existing;
    }
    const textNode = document.createTextNode(textValue);
    vnodeObj._domNode = textNode;
    return textNode;
  }

  if (vnodeObj.type === Fragment) {
    const frag = existing || document.createDocumentFragment();
    const children = vnodeObj.props?.children || [];
    const existingChildren = existing ? Array.from(existing.childNodes) : [];

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const existingChild = existingChildren[i] || null;
      const dom = await createDom(child, existingChild);
      if (!existingChild) {
        frag.appendChild(dom);
      }
    }
    vnodeObj._domNode = frag;
    return frag;
  }

  if (typeof vnodeObj.type === "function") {
    const rendered = await renderMaybeAsyncComponent(
      vnodeObj.type as ComponentFunction,
      vnodeObj.props,
      vnodeObj
    );
    vnodeObj._rendered = rendered;
    // When hydrating a component, we pass the existing node to its rendered output
    const dom = await createDom(rendered, existing);
    vnodeObj._domNode = dom;
    return dom;
  }

  const el =
    existing &&
      existing.nodeType === 1 &&
      (existing as HTMLElement).tagName.toLowerCase() ===
      (vnodeObj.type as string).toLowerCase()
      ? (existing as HTMLElement)
      : document.createElement(vnodeObj.type as string);

  for (const [k, v] of Object.entries(vnodeObj.props || {})) {
    if (k !== "children") {
      setProperty(el as HTMLElement, k, v);
    }
  }

  const children = vnodeObj.props?.children || [];
  const existingChildren = Array.from(el.childNodes);

  for (let i = 0; i < children.length; i++) {
    const childVNode = children[i];
    const existingChild = existingChildren[i] || null;
    const dom = await createDom(childVNode, existingChild);
    if (!existingChild) {
      el.appendChild(dom);
    }
  }

  vnodeObj._domNode = el;
  return el;
}

// ---------------------- Async Component Helper ----------------------

/**
 * Renders a component that may be synchronous or asynchronous
 * Handles the component lifecycle and error boundaries
 *
 * @param Component - Component function to render
 * @param props - Properties to pass to the component
 * @param vnode - Virtual node representing this component
 * @returns Promise resolving to the rendered VNode or null on error
 *
 * @internal Used for rendering components during DOM creation
 */
async function renderMaybeAsyncComponent(
  Component: ComponentFunction,
  props: any,
  vnode: VNode
): Promise<VNode | null> {
  const ctx = beginComponent(vnode);
  removeErrorOverlay();

  try {
    const result = await Component(props);
    ctx._vnode = vnode;
    vnode._rendered = result;
    ctx._isMounted = true;
    endComponent();
    return result ?? null;
  } catch (err) {
    console.error("[Fynix] async render error:", err);
    showErrorOverlay(err as Error);
    ctx._isMounted = false;
    endComponent();
    return h(
      "div",
      { style: "color:red" },
      `Error: ${sanitizeErrorMessage(err)}`
    );
  }
}

// ---------------------- Patch / Diff ----------------------

/**
 * Efficiently updates the DOM by comparing old and new virtual nodes
 * Core diffing algorithm that minimizes DOM manipulations
 *
 * @param parent - Parent DOM node containing the elements to patch
 * @param newVNode - New virtual node or primitive value
 * @param oldVNode - Previous virtual node or primitive value
 *
 * @example
 * ```typescript
 * const oldVNode = h('div', null, 'Old text');
 * const newVNode = h('div', null, 'New text');
 * await patch(container, newVNode, oldVNode);
 * ```
 *
 * @public Core API for manual DOM updates
 */
export async function patch(
  parent: Node,
  newVNode: VNode | string | number | null | undefined,
  oldVNode: VNode | string | number | null | undefined
): Promise<void> {
  if (!(parent instanceof Node)) {
    console.error(
      "[Fynix] patch() expects a DOM Node, got:",
      typeof parent,
      parent
    );
    return;
  }

  if (!newVNode && !oldVNode) return;

  if (!newVNode && oldVNode) {
    const domNode = (oldVNode as VNode)._domNode;
    if (domNode?.parentNode) {
      domNode.parentNode.removeChild(domNode);
    }
    unmountVNode(oldVNode as VNode);
    return;
  }

  if (newVNode && !oldVNode) {
    const newDom = await createDom(newVNode);
    if (newDom instanceof Node) {
      parent.appendChild(newDom);
    }
    return;
  }

  const newIsPrimitive =
    typeof newVNode === "string" || typeof newVNode === "number";
  const oldIsPrimitive =
    typeof oldVNode === "string" || typeof oldVNode === "number";

  if (newIsPrimitive || oldIsPrimitive) {
    if (
      newIsPrimitive &&
      oldIsPrimitive &&
      String(newVNode) === String(oldVNode)
    )
      return;

    const newDom = await createDom(newVNode);
    const oldDom = (oldVNode as VNode)?._domNode || parent.firstChild;

    if (oldDom?.parentNode && newDom instanceof Node) {
      oldDom.parentNode.replaceChild(newDom, oldDom);
    }

    if (oldVNode && typeof oldVNode === "object") {
      unmountVNode(oldVNode as VNode);
    }
    return;
  }

  const newVN = newVNode as VNode;
  const oldVN = oldVNode as VNode;

  const newType = newVN.type;
  const oldType = oldVN.type;

  if (newType !== oldType) {
    const newDom = await createDom(newVN);
    const oldDom = oldVN._domNode;

    if (oldDom?.parentNode && newDom instanceof Node) {
      oldDom.parentNode.replaceChild(newDom, oldDom);
    }

    unmountVNode(oldVN);
    return;
  }

  if (newType === TEXT) {
    const oldDom = oldVN._domNode;
    const newText = newVN.props.nodeValue ?? "";
    const oldText = oldVN.props.nodeValue ?? "";

    if (newText !== oldText && oldDom) {
      (oldDom as Text).nodeValue = newText;
    }

    newVN._domNode = oldDom;
    return;
  }

  if (newType === Fragment) {
    const newChildren = newVN.props?.children || [];
    const oldChildren = oldVN.props?.children || [];
    await patchChildren(parent, newChildren, oldChildren);
    newVN._domNode = oldVN._domNode;
    return;
  }

  if (typeof newType === "function") {
    const oldCtx = componentInstances.get(oldVN);

    if (oldCtx && newType === oldType) {
      componentInstances.delete(oldVN);
      componentInstances.set(newVN, oldCtx);

      oldCtx._vnode = newVN;

      beginComponent(newVN);
      const rendered = await oldCtx.Component(newVN.props);
      endComponent();

      newVN._rendered = rendered;

      const oldRendered = oldVN._rendered;
      const oldDom = oldVN._domNode;

      if (oldDom?.parentNode instanceof Node) {
        await patch(oldDom.parentNode, rendered, oldRendered);
        newVN._domNode = (rendered as VNode)?._domNode || oldDom;
      }
    } else {
      const rendered = await renderMaybeAsyncComponent(
        newType as ComponentFunction,
        newVN.props,
        newVN
      );
      newVN._rendered = rendered;

      const oldRendered = oldVN._rendered;
      const oldDom = oldVN._domNode;

      if (oldDom?.parentNode instanceof Node) {
        await patch(oldDom.parentNode, rendered, oldRendered);
        newVN._domNode = (rendered as VNode)?._domNode || oldDom;
      } else {
        const newDom = await createDom(rendered);
        if (parent && newDom instanceof Node) {
          parent.appendChild(newDom);
        }
        newVN._domNode = newDom;
      }

      if (oldCtx && newType !== oldType) {
        unmountVNode(oldVN);
      }
    }
    return;
  }

  const el = oldVN._domNode;
  if (!el || el.nodeType !== 1) {
    const newDom = await createDom(newVN);
    if (parent && newDom instanceof Node) {
      parent.appendChild(newDom);
    }
    unmountVNode(oldVN);
    return;
  }

  updateProps(el as HTMLElement, newVN.props, oldVN.props);
  newVN._domNode = el;

  const newChildren = newVN.props?.children || [];
  const oldChildren = oldVN.props?.children || [];
  await patchChildren(el, newChildren, oldChildren);
}

/**
 * Updates child elements using efficient diffing with key-based optimization
 * Handles both keyed and non-keyed reconciliation strategies
 *
 * @param parent - Parent DOM node containing the children
 * @param newChildren - Array of new child vnodes
 * @param oldChildren - Array of previous child vnodes
 *
 * @internal Used by the patch function for child reconciliation
 */
async function patchChildren(
  parent: Node,
  newChildren: VNode[],
  oldChildren: VNode[]
): Promise<void> {
  if (!(parent instanceof Node)) return;

  const hasKeys =
    newChildren.some((c) => c?.key != null) ||
    oldChildren.some((c) => c?.key != null);

  if (!hasKeys) {
    const maxLen = Math.max(newChildren.length, oldChildren.length);

    for (let i = 0; i < maxLen; i++) {
      const newChild = newChildren[i];
      const oldChild = oldChildren[i];

      if (i >= newChildren.length) {
        const dom = oldChild?._domNode;
        if (dom?.parentNode) {
          dom.parentNode.removeChild(dom);
        }
        unmountVNode(oldChild);
      } else if (i >= oldChildren.length) {
        const newDom = await createDom(newChild);
        if (newDom instanceof Node) {
          parent.appendChild(newDom);
        }
      } else {
        await patch(parent, newChild, oldChild);
      }
    }
    return;
  }

  const oldKeyMap = new Map<string | number, VNode>();

  oldChildren.forEach((child) => {
    if (child?.key != null) {
      oldKeyMap.set(child.key, child);
    }
  });

  const newKeySet = new Set(
    newChildren.filter((c) => c?.key != null).map((c) => c.key!)
  );

  oldChildren.forEach((oldChild) => {
    if (oldChild?.key != null && !newKeySet.has(oldChild.key)) {
      const dom = oldChild._domNode;
      if (dom?.parentNode) {
        dom.parentNode.removeChild(dom);
      }
      unmountVNode(oldChild);
    }
  });

  for (let i = 0; i < newChildren.length; i++) {
    const newChild = newChildren[i];
    const key = newChild?.key;

    if (key != null && oldKeyMap.has(key)) {
      const oldChild = oldKeyMap.get(key)!;
      const oldDom = oldChild._domNode;
      const childNodes = Array.from(parent.childNodes);
      const currentPos = childNodes.indexOf(oldDom as ChildNode);
      const desiredPos = i;

      if (currentPos !== desiredPos) {
        const refNode = childNodes[desiredPos] || null;
        if (oldDom && oldDom.parentNode === parent) {
          parent.insertBefore(oldDom, refNode as ChildNode | null);
        }
      }

      await patch(parent, newChild, oldChild);
    } else {
      const newDom = await createDom(newChild);
      if (newDom instanceof Node) {
        const childNodes = Array.from(parent.childNodes);
        const refNode = childNodes[i] || null;
        parent.insertBefore(newDom, refNode as ChildNode | null);
      }
    }
  }
}

// ---------------------- Unmount ----------------------

/**
 * Properly unmounts a virtual node and cleans up all associated resources
 * Handles component cleanup, subscriptions, effects, and event listeners
 *
 * @param vnode - Virtual node to unmount
 *
 * @example
 * ```typescript
 * // Cleanup when removing from DOM
 * unmountVNode(oldVNode);
 * ```
 *
 * @internal Critical for preventing memory leaks
 */
function unmountVNode(vnode: VNode | any): void {
  if (!vnode) return;

  if (vnode._cleanup && typeof vnode._cleanup === "function") {
    try {
      vnode._cleanup();
    } catch (e) {
      console.error("[Fynix] Text vnode cleanup error:", e);
    }
    vnode._cleanup = null;
  }

  if (typeof vnode.type === "function") {
    const ctx = componentInstances.get(vnode);

    if (ctx) {
      ctx._isMounted = false;

      ctx._subscriptionCleanups.forEach((u) => {
        try {
          u();
        } catch (e) {
          console.error("[Fynix] Cleanup error:", e);
        }
      });

      ctx.cleanups.forEach((c) => {
        try {
          c?.();
        } catch (e) {
          console.error("[Fynix] Effect cleanup error:", e);
        }
      });

      ctx._subscriptions.clear();
      ctx._accessedStates.clear();
      ctx._subscriptionCleanups = [];
      ctx.cleanups = [];
      ctx.hooks = [];
      ctx.effects = [];
      ctx.rerender = null;
      ctx._vnode = null as any;

      componentInstances.delete(vnode);
      pendingRerenders.delete(ctx);
    }

    unmountVNode(vnode._rendered);
    return;
  }

  if (vnode._domNode && vnode._domNode.nodeType === 1) {
    const anyNode = vnode._domNode as any;
    const eid = anyNode._rest_eid;

    if (eid) {
      delegatedEvents.forEach((map) => map.delete(eid));
    }

    if (anyNode._fynixCleanups) {
      anyNode._fynixCleanups.forEach((cleanup: () => void) => {
        try {
          cleanup();
        } catch (e) {
          console.error("[Fynix] Element cleanup error:", e);
        }
      });
      anyNode._fynixCleanups = null;
    }
  }

  if (vnode.props?.children) {
    vnode.props.children.forEach((c: VNode) => unmountVNode(c));
  }

  vnode._domNode = null;
  vnode._rendered = null;
}

// ---------------------- Update Props ----------------------

/**
 * Updates element properties by comparing old and new props
 * Efficiently adds, removes, and modifies attributes and properties
 *
 * @param el - HTML element to update
 * @param newProps - New properties object
 * @param oldProps - Previous properties object
 *
 * @internal Used during DOM patching to sync element state
 */
function updateProps(
  el: HTMLElement,
  newProps: VNodeProps = {},
  oldProps: VNodeProps = {}
): void {
  if (!el || el.nodeType !== 1) return;

  for (const k of Object.keys(oldProps)) {
    if (k === "children") continue;

    if (!(k in newProps)) {
      if (k.startsWith("r-")) {
        const anyEl = el as any;
        const eid = anyEl._rest_eid;
        if (eid && delegatedEvents.has(k.slice(2).toLowerCase())) {
          delegatedEvents.get(k.slice(2).toLowerCase())!.delete(eid);
        }
      } else if (BOOLEAN_ATTRS.has(k.toLowerCase())) {
        el.removeAttribute(k);
        (el as any)[k] = false;
      } else if (DOM_PROPERTIES.has(k)) {
        (el as any)[k] = "";
      } else {
        el.removeAttribute(k);
      }
    }
  }

  for (const [k, v] of Object.entries(newProps)) {
    if (k === "children") continue;
    if (oldProps[k] !== v) {
      setProperty(el, k, v);
    }
  }
}

// ---------------------- Mount ----------------------

/**
 * Mounts a Fynix application to a DOM element
 */
function mount(
  AppComponent: ComponentFunction,
  root: string | Element,
  props: any = {}
): void {
  if (typeof root === "string") {
    const element = document.querySelector(root);
    if (!element) return;
    root = element;
  }

  let Component = AppComponent;
  let oldVNode: VNode | null = null;
  let currentProps = props;
  let appVNode: VNode | null = null;
  let isRendering = false;

  async function renderApp(): Promise<void> {
    if (isRendering) return;
    isRendering = true;

    try {
      removeErrorOverlay();
      const win = window as any;
      const propsToUse =
        win.__lastRouteProps || win.__fynix__?.lastRouteProps || currentProps;

      if (!appVNode) {
        appVNode = { type: Component, props: propsToUse, key: null };
        (root as Element).innerHTML = "";
        const dom = await createDom(appVNode);
        if (dom instanceof Node) {
          (root as Element).appendChild(dom);
        }
        oldVNode = appVNode;
      } else {
        appVNode.props = propsToUse;
        await patch(root as Node, appVNode, oldVNode);
        oldVNode = appVNode;
      }
    } catch (err) {
      console.error("[Fynix] Mount error:", err);
      showErrorOverlay(err as Error);
    } finally {
      isRendering = false;
    }
  }

  rootRenderFn = renderApp;
  const win = window as any;
  win.__fynix__ = win.__fynix__ || {};
  win.__fynix__.rerender = renderApp;

  renderApp();

  if (import.meta.hot) {
    if (!win.__fynix__.hmr) {
      win.__fynix__.hmr = async ({ mod }: { mod: any }) => {
        try {
          const UpdatedComponent = mod.App || mod.default;
          if (UpdatedComponent) {
            Component = UpdatedComponent;
            if (appVNode) (appVNode as VNode).type = UpdatedComponent;
            win.__fynix__.rerender?.();
          }
        } catch (err) {
          console.error("[Fynix HMR] update error:", err);
          showErrorOverlay(err as Error);
        }
      };
      import.meta.hot.accept();
    }
  }
}

/**
 * Hydrates a server-rendered app on the client side
 */
function hydrate(
  AppComponent: ComponentFunction,
  root: string | Element,
  props: any = {}
): void {
  if (typeof root === "string") {
    const element = document.querySelector(root);
    if (!element) return;
    root = element;
  }

  let Component = AppComponent;
  let oldVNode: VNode | null = null;
  let currentProps = props;
  let appVNode: VNode | null = null;
  let isRendering = false;

  async function renderApp(): Promise<void> {
    if (isRendering) return;
    isRendering = true;

    try {
      const win = window as any;
      const propsToUse =
        win.__lastRouteProps || win.__fynix__?.lastRouteProps || currentProps;

      if (!appVNode) {
        appVNode = { type: Component, props: propsToUse, key: null };
        const dom = await createDom(appVNode, (root as Element).firstChild);
        if (!(root as Element).firstChild) {
          (root as Element).appendChild(dom);
        }
        oldVNode = appVNode;
      } else {
        appVNode.props = propsToUse;
        await patch(root as Node, appVNode, oldVNode);
        oldVNode = appVNode;
      }
    } catch (err) {
      console.error("[Fynix] Hydration error:", err);
    } finally {
      isRendering = false;
    }
  }

  rootRenderFn = renderApp;
  renderApp();
}

// ---------------------- Exports ----------------------

export {
  Button,
  createFynix,
  nixAsync,
  nixAsyncCached,
  nixAsyncDebounce,
  nixAsyncQuery,
  nixCallback,
  nixComputed,
  nixDebounce,
  nixEffect,
  nixEffectAlways,
  nixEffectOnce,
  nixForm,
  nixFormAsync,
  nixInterval,
  nixLazy,
  nixLazyAsync,
  nixLazyFormAsync,
  nixLocalStorage,
  nixMemo,
  nixPrevious,
  nixRef,
  nixState,
  nixStore,
  Path,
  Suspense,
  mount,
  hydrate,
};
