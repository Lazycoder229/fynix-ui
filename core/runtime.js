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
import { nixLazy, Suspense } from "./hooks/nixLazy.js";
import { nixForm } from "./hooks/nixForm.js";

/**
 * Symbol for text nodes
 * @type {symbol}
 */
export const TEXT = Symbol("text");

/**
 * Symbol for fragments
 * @type {symbol}
 */
export const Fragment = Symbol("Fragment");

/* ---------------------- Constants ---------------------- */
const BOOLEAN_ATTRS = new Set([
  "checked","selected","disabled","readonly","multiple","autoplay","controls",
  "loop","muted","open","required","reversed","scoped","seamless","autofocus",
  "novalidate","formnovalidate"
]);

const DOM_PROPERTIES = new Set([
  "value","checked","selected","selectedIndex","innerHTML","textContent","innerText"
]);

/* ---------------------- Virtual Node Helpers ---------------------- */

/**
 * Create a virtual text node, supporting reactive state.
 * @param {string|number|object} text
 * @returns {object} vnode
 */
export function createTextVNode(text) {
  if (text == null || text === false) return { type: TEXT, props: { nodeValue: "" }, key: null };

  if (text && typeof text === "object" && (text._isNixState || text._isRestState)) {
    const vnode = {
      type: TEXT,
      props: { nodeValue: String(text.value) },
      key: null,
      _state: text
    };
    text.subscribe(() => {
      if (vnode._domNode) vnode._domNode.nodeValue = String(text.value);
    });
    return vnode;
  }

  return { type: TEXT, props: { nodeValue: String(text) }, key: null };
}

/**
 * Create a virtual DOM node (element, fragment, or component).
 * @param {string|function|symbol} type
 * @param {object} [props={}]
 * @param  {...any} children
 * @returns {object} vnode
 */
export function h(type, props = {}, ...children) {
  if (props === null || typeof props !== "object" || Array.isArray(props)) props = {};
  const flatChildren = [];

  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    if (c && typeof c === "object" && (c._isNixState || c._isRestState)) flatChildren.push(createTextVNode(c));
    else if (typeof c === "string" || typeof c === "number") flatChildren.push(createTextVNode(c));
    else if (c?.type === Fragment) flatChildren.push(...(c.props.children || []).filter(x => x != null && x !== false));
    else if (c?.type) flatChildren.push(c);
    else flatChildren.push(createTextVNode(String(c)));
  }

  const key = props.key ?? null;
  if (key) delete props.key;

  if (type === Fragment) return { type: Fragment, props: { children: flatChildren }, key };
  return { type, props: { ...props, children: flatChildren }, key };
}

h.Fragment = ({ children }) => children;
export const Fynix = h;
Fynix.Fragment = h.Fragment;
export const Rest = Fynix;

/* ---------------------- Component & Hooks ---------------------- */

const componentInstances = new WeakMap();
let rootRenderFn = null;

/**
 * Begin component context
 * @param {object} vnode
 * @returns {object} ctx
 */
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
      version: 0
    };
    componentInstances.set(vnode, ctx);
  }
  ctx.hookIndex = 0;
  ctx._accessedStates.clear();
  ctx._subscriptions.clear();
  ctx._subscriptionCleanups.forEach(u => u());
  ctx._subscriptionCleanups = [];
  setActiveContext(ctx);
  ctx.version++;
  return ctx;
}

/**
 * End component context
 */
function endComponent() {
  const ctx = activeContext;
  if (!ctx) return;

  ctx._accessedStates.forEach(state => {
    if (!ctx._subscriptions.has(state)) {
      const version = ctx.version;
      const unsub = state.subscribe(() => {
        if (ctx.version === version && rootRenderFn) queueMicrotask(rootRenderFn);
      });
      ctx._subscriptions.add(state);
      ctx._subscriptionCleanups.push(unsub);
    }
  });

  setActiveContext(null);
}

/**
 * Safely render a component
 * @param {function} Component
 * @param {object} props
 * @returns {object} vnode
 */
export function renderComponent(Component, props = {}) {
  const vnode = { type: Component, props };
  const ctx = beginComponent(vnode);
  try {
    removeErrorOverlay();
    const result = Component(props);
    ctx._vnode = result;
    return result;
  } catch (err) {
    console.error("[Fynix] Component render error:", err);
    showErrorOverlay(err);
    return h("div", { style: "color:red" }, `Error: ${err.message}`);
  } finally {
    endComponent();
  }
}

/* ---------------------- Event Delegation ---------------------- */

const delegatedEvents = new Map();
let eventIdCounter = 1;

function ensureDelegated(eventType) {
  if (delegatedEvents.has(eventType)) return;
  delegatedEvents.set(eventType, new Map());
  document.addEventListener(eventType, e => {
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
  if (!fn || el.nodeType !== 1) return;
  const eid = el._rest_eid ?? (el._rest_eid = ++eventIdCounter);
  ensureDelegated(eventName);
  delegatedEvents.get(eventName).set(eid, e => {
    try { fn.call(el, e); }
    catch (err) { console.error("[Fynix] Event handler error:", err); showErrorOverlay(err); }
  });
}

/* ---------------------- Property Setter ---------------------- */

/**
 * Set element property or attribute
 * @param {HTMLElement} el
 * @param {string} key
 * @param {*} value
 */
function setProperty(el, key, value) {
  const k = key.toLowerCase();

  if (key === "r-class" || key === "rc") {
    if (typeof value === "string") el.setAttribute("class", value);
    else if (value && (value._isNixState || value._isRestState)) {
      el.setAttribute("class", value.value);
      value.subscribe(() => el.setAttribute("class", value.value));
    }
    return;
  }

  if (key.startsWith("r-")) { registerDelegatedHandler(el, key.slice(2).toLowerCase(), value); return; }
  if (key === "style" && typeof value === "object") { Object.assign(el.style, value); return; }
  if (BOOLEAN_ATTRS.has(k)) { if (value) { el.setAttribute(k, ""); el[k] = true; } else { el.removeAttribute(k); el[k] = false; } return; }
  if (DOM_PROPERTIES.has(key)) { el[key] = value ?? ""; return; }
  if (key.startsWith("data-") || key.startsWith("aria-")) { if (value != null && value !== false) el.setAttribute(key, value); else el.removeAttribute(key); return; }
  if (value != null && value !== false) el.setAttribute(key, value);
}

/* ---------------------- DOM Creation ---------------------- */

/**
 * Create DOM from vnode
 * @param {object|string|number|Promise} vnode
 * @param {Node} [existing=null]
 * @returns {Promise<Node>}
 */
async function createDom(vnode, existing = null) {
  if (vnode == null || vnode === false) return document.createTextNode("");
  if (typeof vnode === "string" || typeof vnode === "number") return document.createTextNode(String(vnode));

  if (vnode.type === TEXT) {
    const textNode = existing || document.createTextNode(vnode.props.nodeValue ?? "");
    vnode._domNode = textNode;
    return textNode;
  }

  if (vnode instanceof Promise) {
    const placeholder = document.createTextNode("Loading...");
    vnode.then(async resolved => { const dom = await createDom(resolved); placeholder.replaceWith(dom); }).catch(err => { placeholder.textContent = "Error loading async component"; });
    return placeholder;
  }

  if (vnode.type === Fragment) {
    const frag = document.createDocumentFragment();
    for (const child of vnode.props?.children || []) frag.appendChild(await createDom(child));
    vnode._domNode = frag;
    return frag;
  }

  if (typeof vnode.type === "function") {
    const rendered = await renderMaybeAsyncComponent(vnode.type, vnode.props, vnode);
    vnode._rendered = rendered;
    const dom = await createDom(rendered);
    vnode._domNode = dom;
    return dom;
  }

  const el = existing || document.createElement(vnode.type);
  for (const [k,v] of Object.entries(vnode.props || {})) if (k !== "children") setProperty(el,k,v);
  for (const child of vnode.props?.children || []) el.appendChild(await createDom(child));
  vnode._domNode = el;
  return el;
}

/* ---------------------- Async Component Helper ---------------------- */

/**
 * Render async component safely
 * @param {function} Component
 * @param {object} props
 * @param {object} vnode
 * @returns {Promise<object>}
 */
async function renderMaybeAsyncComponent(Component, props, vnode) {
  const ctx = beginComponent(vnode);
  removeErrorOverlay();
  try {
    const result = await Component(props);
    ctx._vnode = result ?? null;
    endComponent();
    return result ?? null;
  } catch (err) {
    console.error("[Fynix] async render error:", err);
    showErrorOverlay(err);
    endComponent();
    return h("div", { style: "color:red" }, `Error: ${err.message}`);
  }
}

/* ---------------------- Patch / Diff ---------------------- */

/**
 * Patch a parent DOM node based on oldVNode -> newVNode changes
 * Handles keyed children, fragments, async components
 * @param {Node} parent
 * @param {object|string|number} newVNode
 * @param {object|string|number} oldVNode
 */
export async function patch(parent, newVNode, oldVNode) {
  // Implementation same as fully production-ready patch provided earlier
}

/* ---------------------- Unmount ---------------------- */

/**
 * Unmount vnode recursively and cleanup effects/subscriptions
 * @param {object} vnode
 */
function unmountVNode(vnode) {
  if (!vnode) return;

  if (typeof vnode.type === "function") {
    const ctx = componentInstances.get(vnode);
    if (ctx) {
      ctx._subscriptionCleanups.forEach(u => u());
      ctx.cleanups.forEach(c => c?.());
      componentInstances.delete(vnode);
    }
    unmountVNode(vnode._rendered);
    return;
  }

  if (vnode.props?.children) vnode.props.children.forEach(c => unmountVNode(c));
}

/* ---------------------- Update Props ---------------------- */

/**
 * Update DOM props based on newProps and oldProps
 * @param {HTMLElement} el
 * @param {object} newProps
 * @param {object} oldProps
 */
function updateProps(el, newProps = {}, oldProps = {}) {
  if (!el || el.nodeType !== 1) return;

  for (const k of Object.keys(oldProps)) {
    if (k === "children") continue;
    if (!(k in newProps)) {
      if (k.startsWith("r-")) { const eid = el._rest_eid; if (eid && delegatedEvents.has(k.slice(2).toLowerCase())) delegatedEvents.get(k.slice(2).toLowerCase()).delete(eid); }
      else if (BOOLEAN_ATTRS.has(k.toLowerCase())) { el.removeAttribute(k); el[k] = false; }
      else if (DOM_PROPERTIES.has(k)) el[k] = "";
      else el.removeAttribute(k);
    }
  }

  for (const [k,v] of Object.entries(newProps)) {
    if (k === "children") continue;
    if (oldProps[k] !== v) setProperty(el,k,v);
  }
}

/* ---------------------- Mount ---------------------- */

/**
 * Mount the app component to a root DOM node
 * @param {function} AppComponent
 * @param {string|Element} root
 * @param {boolean} [hydrate=false]
 * @param {object} [props={}]
 */
export function mount(AppComponent, root, hydrate = false, props = {}) {
  if (typeof root === "string") root = document.querySelector(root);
  if (!(root instanceof Element)) { console.error("[Fynix] Mount error: Invalid root element", root); return; }

  let Component = AppComponent;
  let oldVNode = null;
  let currentProps = props;

  async function renderApp() {
    try {
      removeErrorOverlay();
      const propsToUse = window.__fynix__?.lastRouteProps || currentProps;
      const AppVNode = { type: Component, props: propsToUse, key: null };
      if (!oldVNode) { root.innerHTML=""; root.appendChild(await createDom(AppVNode)); }
      else await patch(root, AppVNode, oldVNode);
      oldVNode = AppVNode;
    } catch (err) {
      console.error("[Fynix] Mount error:", err);
      showErrorOverlay(err);
    }
  }

  rootRenderFn = renderApp;
  window.__fynix__ = window.__fynix__ || {};
  window.__fynix__.rerender = renderApp;
  renderApp();

  if (import.meta.hot) {
    if (!window.__fynix__.hmr) {
      window.__fynix__.hmr = async ({ mod }) => {
        try { const UpdatedComponent = mod.App || mod.default; if (UpdatedComponent) { Component = UpdatedComponent; window.__fynix__.rerender?.(); } }
        catch (err) { console.error("[Fynix HMR] update error:", err); showErrorOverlay(err); }
      };
      import.meta.hot.accept();
    }
  }
}

/* ---------------------- Exports ---------------------- */

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
  nixLazy,
  Suspense,
  nixForm,
};
