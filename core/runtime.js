import { removeErrorOverlay, showErrorOverlay } from "./error/errorOverlay";
import { setActiveContext, activeContext } from "./context/context.js";
import { nixStore } from "./hooks/nixStore";
import { nixState } from "./hooks/nixState";
import { nixEffect } from "./hooks/nixEffect";
import { nixAsync } from "./hooks/nixAsync";
import { nixMemo } from "./hooks/nixMemo";
import { nixCallback } from "./hooks/nixCallback";
import { nixComputed } from "./hooks/nixComputed";
import { nixDebounce } from "./hooks/nixDebounce";
import { nixInterval } from "./hooks/nixInterval";
import { nixRef } from "./hooks/nixRef";
import { nixLocalStorage } from "./hooks/nixLocalStorage";
import { nixPrevious } from "./hooks/nixPrevious";
// runtime/index.js

export const TEXT = Symbol("text");
export const Fragment = Symbol("Fragment");

/* ----------------------
    Constants for Attribute Handling
---------------------- */
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

/* ----------------------
    Virtual Node Creation (Fynix/h)
---------------------- */
export function createTextVNode(text) {
  if (text == null || text === false) {
    return { type: TEXT, props: { nodeValue: "" }, key: null };
  }

  if (
    text &&
    typeof text === "object" &&
    (text._isNixState === true || text._isRestState === true)
  ) {
    const initialValue = text.value;
    const vnode = {
      type: TEXT,
      props: { nodeValue: String(initialValue) },
      key: null,
      _state: text,
    };
    return vnode;
  }

  return { type: TEXT, props: { nodeValue: String(text) }, key: null };
}

export function Layout({ children }) {
  return h("div", { class: "layout" }, ...children);
}

export function h(type, props = {}, ...children) {
  if (props === null || typeof props !== "object" || Array.isArray(props)) {
    props = {};
  }

  const flatChildren = [];

  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;

    if (
      c &&
      typeof c === "object" &&
      (c._isNixState === true || c._isRestState === true)
    ) {
      const currentValue = c.value;
      const textVNode = createTextVNode(c);
      flatChildren.push(textVNode);
    } else if (typeof c === "string" || typeof c === "number") {
      flatChildren.push(createTextVNode(c));
    } else if (c?.type === Fragment) {
      const filteredFragmentChildren = (c.props.children || []).filter(
        (child) => child != null && child !== false
      );
      flatChildren.push(...filteredFragmentChildren);
    } else if (c?.type) {
      flatChildren.push(c);
    } else if (typeof c === "object") {
      console.warn("[Fynix] Unknown object passed as child:", c);
      flatChildren.push(createTextVNode(String(c)));
    }
  }

  const key = props.key ?? null;
  if (key) delete props.key;

  if (type === Fragment)
    return { type: Fragment, props: { children: flatChildren }, key };

  return { type, props: { ...props, children: flatChildren }, key };
}

h.Fragment = ({ children }) => children;
export const Fynix = h;
Fynix.Fragment = h.Fragment;

// Backward compatibility alias
export const Rest = Fynix;

/* ----------------------
    Component & Hooks
---------------------- */
const componentInstances = new WeakMap();

let rootRenderFn = null;

function beginComponent(vnode) {
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
    };
    componentInstances.set(vnode, ctx);
  }
  ctx.hookIndex = 0;
  ctx._accessedStates.clear();
  if (ctx._subscriptionCleanups) {
    ctx._subscriptionCleanups.forEach((unsub) => unsub());
  }
  ctx._subscriptions.clear();
  ctx._subscriptionCleanups = [];
  setActiveContext(ctx);

  return ctx;
}

function endComponent() {
  if (!activeContext) return;

  const componentCtx = activeContext;

  componentCtx._accessedStates.forEach((state) => {
    if (!componentCtx._subscriptions.has(state)) {
      const globalRerenderer = () => {
        if (componentCtx._vnode && rootRenderFn) {
          rootRenderFn();
        }
      };

      const unsub = state.subscribe(() => {
        queueMicrotask(globalRerenderer);
      });

      componentCtx._subscriptions.add(state);
      componentCtx._subscriptionCleanups.push(unsub);
    }
  });

  setActiveContext(null); //  Properly clear active context
}
export function renderComponent(Component, props = {}) {
  const vnodeKey = { type: Component, props };
  const ctx = beginComponent(vnodeKey);
  try {
    removeErrorOverlay();
    const result = Component(props);
    ctx._vnode = result;
    return result;
  } catch (err) {
    console.error(`[Fynix] Component render error:`, err);
    showErrorOverlay(err);
    return h("div", { style: "color:red" }, `Error: ${err.message}`);
  } finally {
    endComponent();
  }
}

/* ----------------------
    Event Delegation
---------------------- */
const delegatedEvents = new Map();
let eventIdCounter = 1;

function ensureDelegated(eventType) {
  if (delegatedEvents.has(eventType)) return;
  delegatedEvents.set(eventType, new Map());

  document.addEventListener(eventType, (e) => {
    let cur = e.target;
    while (cur && cur !== document) {
      if (cur.nodeType !== 1) break;
      const eid = cur._rest_eid;
      const map = delegatedEvents.get(eventType);
      if (eid != null && map?.has(eid)) {
        map.get(eid)(e);
        return;
      }
      cur = cur.parentElement;
    }
  });
}

function registerDelegatedHandler(el, eventName, fn) {
  if (!fn) return;
  if (el.nodeType !== 1) return;

  const eid = el._rest_eid ?? (el._rest_eid = ++eventIdCounter);
  ensureDelegated(eventName);

  delegatedEvents.get(eventName).set(eid, (e) => {
    try {
      fn.call(el, e);
    } catch (err) {
      console.error("[Fynix] Event handler error:", err);
      showErrorOverlay(err);
    }
  });
}

/* ----------------------
    Enhanced Property Setter
---------------------- */
function setProperty(el, key, value) {
  const k = key.toLowerCase();
  // 2. Handle className
  if (key === "r-class" || key === "rc") {
    if (typeof value === "string") {
      el.setAttribute("class", value);
    } else if (value && (value._isNixState || value._isRestState)) {
      el.setAttribute("class", value.value);
      // Subscribe for updates
      value.subscribe(() => {
        el.setAttribute("class", value.value);
      });
    }
    return;
  }
  // 1. Handle r-* events (delegated)
  if (key.startsWith("r-")) {
    registerDelegatedHandler(el, key.slice(2).toLowerCase(), value);
    return;
  }

  // 3. Handle style object
  if (key === "style" && typeof value === "object") {
    Object.assign(el.style, value);
    return;
  }

  // 4. Handle boolean attributes
  if (BOOLEAN_ATTRS.has(k)) {
    if (value) {
      el.setAttribute(k, "");
      el[k] = true;
    } else {
      el.removeAttribute(k);
      el[k] = false;
    }
    return;
  }

  // 5. Handle DOM properties (value, checked, etc.)
  if (DOM_PROPERTIES.has(key)) {
    el[key] = value ?? "";
    return;
  }

  // 6. Handle data-* and aria-* attributes
  if (key.startsWith("data-") || key.startsWith("aria-")) {
    if (value != null && value !== false) {
      el.setAttribute(key, value);
    } else {
      el.removeAttribute(key);
    }
    return;
  }

  // 7. Default: set as attribute
  if (value != null && value !== false) {
    el.setAttribute(key, value);
  }
}

/* ----------------------
    DOM Creation & Hydration
---------------------- */
async function createDom(vnode, existing = null) {
  if (vnode == null || vnode === false) {
    return document.createTextNode("");
  }

  if (typeof vnode === "string" || typeof vnode === "number") {
    return document.createTextNode(String(vnode));
  }

  if (vnode.type === TEXT) {
    const textNode =
      existing || document.createTextNode(vnode.props.nodeValue ?? "");
    vnode._domNode = textNode;
    return textNode;
  }

  if (vnode instanceof Promise) {
    const placeholder = document.createTextNode("Loading...");
    vnode
      .then(async (resolved) => {
        const dom = await createDom(resolved);
        placeholder.replaceWith(dom);
      })
      .catch((err) => {
        console.error("[Fynix Suspense] async render failed:", err);
        placeholder.textContent = "Error loading async component";
      });
    return placeholder;
  }

  if (vnode.type === Fragment) {
    const frag = document.createDocumentFragment();
    for (const child of vnode.props?.children || []) {
      frag.appendChild(await createDom(child));
    }
    vnode._domNode = frag;
    return frag;
  }

  if (typeof vnode.type === "function") {
    const rendered = await renderMaybeAsyncComponent(
      vnode.type,
      vnode.props,
      vnode
    );
    vnode._rendered = rendered;
    const dom = await createDom(rendered);
    vnode._domNode = dom;
    return dom;
  }

  const el = existing || document.createElement(vnode.type);

  // Apply props using enhanced setter
  for (const [k, v] of Object.entries(vnode.props || {})) {
    if (k === "children") continue;
    setProperty(el, k, v);
  }

  const children = vnode.props?.children || [];
  for (const child of children) {
    el.appendChild(await createDom(child));
  }

  vnode._domNode = el;
  return el;
}

/* ----------------------
    Component Async Render Helper
---------------------- */
async function renderMaybeAsyncComponent(Component, props, vnode) {
  const ctx = beginComponent(vnode);
  removeErrorOverlay();

  try {
    const result = await Component(props);
    const rendered = result ?? null;
    ctx._vnode = rendered;
    endComponent();
    return rendered;
  } catch (err) {
    console.error("[Fynix] async render error:", err);
    showErrorOverlay(err);
    endComponent();
    return h("div", { style: "color:red" }, `Error: ${err.message}`);
  }
}

/* ----------------------
    Diff & Patch with Keyed Children
---------------------- */
function isSame(a, b) {
  return a && b && a.type === b.type && a.key === b.key;
}

export async function patch(parent, newVNode, oldVNode) {
  if (!newVNode) {
    if (oldVNode?._domNode?.parentNode) {
      oldVNode._domNode.parentNode.removeChild(oldVNode._domNode);
      unmountVNode(oldVNode);
    }
    return;
  }

  const isOldText =
    typeof oldVNode === "string" ||
    typeof oldVNode === "number" ||
    oldVNode?.type === TEXT;
  const isNewText =
    typeof newVNode === "string" ||
    typeof newVNode === "number" ||
    newVNode?.type === TEXT;

  if (isOldText || isNewText) {
    const oldTextValue = isOldText
      ? oldVNode?.type === TEXT
        ? oldVNode.props.nodeValue
        : String(oldVNode)
      : "";
    const newTextValue = isNewText
      ? newVNode?.type === TEXT
        ? newVNode.props.nodeValue
        : String(newVNode)
      : "";

    if (oldTextValue !== newTextValue) {
      if (oldVNode?._domNode) {
        oldVNode._domNode.textContent = newTextValue;
      }
    }

    newVNode._domNode =
      oldVNode?._domNode || document.createTextNode(newTextValue);
    return;
  }

  if (!oldVNode || typeof oldVNode !== "object" || !oldVNode.type) {
    const newDom = await createDom(newVNode);
    parent.appendChild(newDom);
    return;
  }

  if (typeof newVNode.type === "function") {
    if (!isSame(oldVNode, newVNode)) {
      const newDom = await createDom(newVNode);
      oldVNode._domNode?.parentNode?.replaceChild(newDom, oldVNode._domNode);
      unmountVNode(oldVNode);
      return;
    }

    const ctx = componentInstances.get(oldVNode);
    if (ctx) {
      componentInstances.set(newVNode, ctx);
      ctx._vnode = newVNode;
    }

    const rendered = await renderMaybeAsyncComponent(
      newVNode.type,
      newVNode.props,
      newVNode
    );

    newVNode._rendered = rendered;
    newVNode._domNode = oldVNode._domNode;
    const componentParentDom = oldVNode._domNode?.parentNode || parent;
    await patch(componentParentDom, rendered, oldVNode._rendered);
    return;
  }

  if (!isSame(oldVNode, newVNode)) {
    const newDom = await createDom(newVNode);
    oldVNode._domNode?.parentNode?.replaceChild(newDom, oldVNode._domNode);
    unmountVNode(oldVNode);
    newVNode._domNode = newDom;
    return;
  }

  const el = (newVNode._domNode = oldVNode._domNode);

  //  Enhanced: Handle all form elements
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    const newValue = newVNode.props?.value ?? "";
    if (el.value !== newValue) el.value = newValue;

    if (el.type === "checkbox" || el.type === "radio") {
      const newChecked = newVNode.props?.checked ?? false;
      if (el.checked !== newChecked) el.checked = newChecked;
    }
  }

  if (el.tagName === "SELECT") {
    const newValue = newVNode.props?.value;
    if (newValue != null && el.value !== newValue) {
      el.value = newValue;
    }
  }

  updateProps(el, newVNode.props, oldVNode.props);

  const oldChildren = oldVNode.props?.children || [];
  const newChildren = newVNode.props?.children || [];
  const maxLen = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < maxLen; i++) {
    const oldChild = oldChildren[i];
    const newChild = newChildren[i];

    if (!oldChild && newChild) {
      el.appendChild(await createDom(newChild));
      continue;
    }

    if (oldChild && !newChild) {
      el.removeChild(oldChild._domNode);
      unmountVNode(oldChild);
      continue;
    }

    if (oldChild && newChild) {
      await patch(el, newChild, oldChild);
    }
  }
}

/* ----------------------
    Unmount Cleanup (Effects)
---------------------- */
function unmountVNode(vnode) {
  if (!vnode) return;

  if (typeof vnode.type === "function") {
    const ctx = componentInstances.get(vnode);
    if (ctx) {
      if (ctx._subscriptionCleanups)
        ctx._subscriptionCleanups.forEach((unsub) => unsub());
      if (ctx.cleanups) ctx.cleanups.forEach((c) => c?.());
      componentInstances.delete(vnode);
    }
    unmountVNode(vnode._rendered);
    return;
  }

  if (vnode.props?.children)
    for (const c of vnode.props.children) unmountVNode(c);
}

/* ----------------------
    Enhanced Props Update
---------------------- */
function updateProps(el, newProps = {}, oldProps = {}) {
  if (!el || el.nodeType !== 1) return;

  // Remove old props
  for (const k of Object.keys(oldProps)) {
    if (k === "children") continue;
    if (!(k in newProps)) {
      if (k.startsWith("r-")) {
        const eid = el._rest_eid;
        if (eid && delegatedEvents.has(k.slice(2).toLowerCase())) {
          delegatedEvents.get(k.slice(2).toLowerCase()).delete(eid);
        }
      } else if (BOOLEAN_ATTRS.has(k.toLowerCase())) {
        el.removeAttribute(k);
        el[k] = false;
      } else if (DOM_PROPERTIES.has(k)) {
        el[k] = "";
      } else {
        el.removeAttribute(k);
      }
    }
  }

  // Add or update new props
  for (const [k, v] of Object.entries(newProps)) {
    if (k === "children") continue;
    if (oldProps[k] !== v) {
      setProperty(el, k, v);
    }
  }
}

/* ----------------------
    Mount / Hydrate
---------------------- */
export function mount(AppComponent, root, hydrate = false, props = {}) {
  if (typeof root === "string") root = document.querySelector(root);
  if (!(root instanceof Element)) {
    console.error("[Fynix] Mount error: Invalid root element:", root);
    return;
  }

  let Component = AppComponent;
  let oldVNode = null;
  let currentProps = props; // store current props here

  async function renderApp() {
    try {
      removeErrorOverlay();

      //  IMPORTANT: Check for updated props from router
      const propsToUse = window.__lastRouteProps || currentProps;

      const AppVNode = {
        type: Component,
        props: propsToUse, // use latest props from router
        key: null,
      };

      if (!oldVNode) {
        root.innerHTML = "";
        root.appendChild(await createDom(AppVNode));
      } else {
        await patch(root, AppVNode, oldVNode);
      }
      oldVNode = AppVNode;
    } catch (err) {
      console.error("[Fynix] Mount error:", err);
      showErrorOverlay(err);
    }
  }

  rootRenderFn = renderApp;
  window.__rest_rerender = renderApp;

  renderApp();

  // Support Hot Module Replacement
  if (import.meta.hot) {
    if (!window.__rest_hmr) {
      window.__rest_hmr = async ({ id, mod }) => {
        try {
          const UpdatedComponent = mod.App || mod.default;
          if (UpdatedComponent) {
            Component = UpdatedComponent;
            window.__rest_rerender?.();
          }
        } catch (err) {
          console.error("[Fynix HMR] update error:", err);
          showErrorOverlay(err);
        }
      };
      import.meta.hot.accept();
    }
  }
}
/* ----------------------
    SSR: renderToString
---------------------- */
export function renderToString(vnode) {
  if (!vnode) return "";
  if (vnode.type === TEXT) return vnode.props.nodeValue;
  if (vnode.type === Fragment)
    return (vnode.props?.children || []).map(renderToString).join("");
  if (typeof vnode.type === "function")
    return renderToString(renderComponent(vnode.type, vnode.props));

  const propsStr = Object.entries(vnode.props || {})
    .filter(([k]) => k !== "children")
    .map(([k, v]) => `${k === "className" ? "class" : k}="${v}"`)
    .join(" ");

  const childrenStr = (vnode.props?.children || [])
    .map(renderToString)
    .join("");
  return `<${vnode.type}${propsStr ? " " + propsStr : ""}>${childrenStr}</${
    vnode.type
  }>`;
}

export {
  nixState,
  nixEffect,
  nixStore,
  nixInterval,
  nixAsync,
  nixCallback,
  nixComputed,
  nixMemo,
  nixDebounce,
  nixPrevious,
  nixLocalStorage,
  nixRef,
};

// Lazy loading and Suspense
export { nixLazy, Suspense } from "./hooks/nixLazy.js";

// Form helpers
export { nixForm } from "./hooks/nixForm.js";
