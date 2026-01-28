// ---------------------- Types ----------------------

type VNodeType = string | symbol | ComponentFunction;
type VNodeChild = VNode | string | number | boolean | null | undefined;
type VNodeChildren = VNodeChild | VNodeChild[];

interface VNodeProps {
  children?: VNode[];
  key?: string | number | null;
  [key: string]: any;
}

interface VNode {
  type: VNodeType;
  props: VNodeProps;
  key: string | number | null;
  _domNode?: Node | null;
  _rendered?: VNode | null;
  _state?: ReactiveState<any> | null;
  _cleanup?: (() => void) | null;
}

interface ComponentFunction {
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
// ---------------------- Symbols ----------------------

export const TEXT = Symbol("text");
export const Fragment = Symbol("Fragment");

// ---------------------- Constants ----------------------

const BOOLEAN_ATTRS = new Set([
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

const DOM_PROPERTIES = new Set([
  "value",
  "checked",
  "selected",
  "selectedIndex",
  "innerHTML",
  "textContent",
  "innerText",
]);

// ---------------------- Virtual Node Helpers ----------------------

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
    return h("div", { style: "color:red" }, `Error: ${(err as Error).message}`);
  } finally {
    endComponent();
  }
}

// ---------------------- Event Delegation ----------------------

const delegatedEvents = new Map<string, Map<number, (e: Event) => void>>();
let eventIdCounter = 1;

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

// ---------------------- Property Setter ----------------------

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

  if (key === "innerHTML" || key === "outerHTML") {
    console.warn(
      "[Fynix] Security: innerHTML/outerHTML not allowed. Use textContent or children."
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

  if (DOM_PROPERTIES.has(key)) {
    (el as any)[key] = value ?? "";
    return;
  }

  if (key.startsWith("data-") || key.startsWith("aria-")) {
    if (value != null && value !== false) {
      el.setAttribute(key, value);
    } else {
      el.removeAttribute(key);
    }
    return;
  }

  if ((key === "href" || key === "src") && typeof value === "string") {
    if (value.trim().toLowerCase().startsWith("javascript:")) {
      console.warn("[Fynix] Security: javascript: protocol blocked in", key);
      return;
    }
  }

  if (value != null && value !== false) {
    el.setAttribute(key, value);
  }
}

// ---------------------- DOM Creation ----------------------

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
    const textNode =
      existing || document.createTextNode(vnodeObj.props.nodeValue ?? "");
    vnodeObj._domNode = textNode;
    return textNode;
  }

  if (vnodeObj.type === Fragment) {
    const frag = document.createDocumentFragment();
    for (const child of vnodeObj.props?.children || []) {
      frag.appendChild(await createDom(child));
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
    const dom = await createDom(rendered);
    vnodeObj._domNode = dom;
    return dom;
  }

  const el = existing || document.createElement(vnodeObj.type as string);

  for (const [k, v] of Object.entries(vnodeObj.props || {})) {
    if (k !== "children") {
      setProperty(el as HTMLElement, k, v);
    }
  }

  for (const child of vnodeObj.props?.children || []) {
    el.appendChild(await createDom(child));
  }

  vnodeObj._domNode = el;
  return el;
}

// ---------------------- Async Component Helper ----------------------

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
    return h("div", { style: "color:red" }, `Error: ${(err as Error).message}`);
  }
}

// ---------------------- Patch / Diff ----------------------

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

export function mount(
  AppComponent: ComponentFunction,
  root: string | Element,
  props: any = {}
): void {
  if (typeof root === "string") {
    const element = document.querySelector(root);
    if (!element) {
      console.error(
        "[Fynix] Mount error: Element not found for selector:",
        root
      );
      return;
    }
    root = element;
  }

  if (!(root instanceof Element)) {
    console.error("[Fynix] Mount error: Invalid root element", root);
    return;
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

        if (root instanceof Element) {
          root.innerHTML = "";
          const dom = await createDom(appVNode);
          if (dom instanceof Node) {
            root.appendChild(dom);
          }
        } else {
          console.error("[Fynix] Mount error: root is not a DOM Element", root);
          return;
        }

        oldVNode = appVNode;
      } else {
        appVNode.props = propsToUse;

        if (root instanceof Node) {
          await patch(root, appVNode, oldVNode);
          oldVNode = appVNode;
        } else {
          console.error("[Fynix] Patch error: root is not a DOM Node", root);
          return;
        }
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
            if (appVNode) {
              appVNode.type = UpdatedComponent;
            }
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

};
