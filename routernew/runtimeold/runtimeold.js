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
import {Path, Button} from "./custom/index.js"

//new imports
import { nixAsyncCached } from "./hooks/nixAsyncCache";
import { nixAsyncDebounce } from "./hooks/nixAsyncDebounce";
import { nixAsyncQuery } from "./hooks/nixAsyncQuery";
import { nixEffectAlways } from "./hooks/nixEffect";
import { nixEffectOnce } from "./hooks/nixEffect";
import { nixFormAsync } from "./hooks/nixFormAsync";
import { nixLazyAsync } from "./hooks/nixLazyAsync"; 
import { nixLazyFormAsync } from "./hooks/nixLazyFormAsync";
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

  if (text && typeof text === "object" && (text._isNixState)) {
    const vnode = {
      type: TEXT,
      props: { nodeValue: String(text.value) },
      key: null,
      _state: text
    };
    
    // Correct subscription
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
    if (c && typeof c === "object" && (c._isNixState)) flatChildren.push(createTextVNode(c));
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
      version: 0,
      rerender: null,
      Component: vnode.type
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
 * End component context
 */
function endComponent() {
  const ctx = activeContext;
  if (!ctx) return;

  ctx._accessedStates.forEach(state => {
    if (!ctx._subscriptions.has(state)) {
      // FIX: Create rerender that preserves vnode identity
      if (!ctx.rerender) {
        ctx.rerender = () => {
          try {
            removeErrorOverlay();
            
            // Key fix: Reuse the same vnode
            const vnode = ctx._vnode;
            const oldRendered = vnode._rendered;
            
            // Re-render component with current props
            beginComponent(vnode);
            const newRendered = ctx.Component(vnode.props);
            endComponent();
            
            // Update the rendered output in place
            vnode._rendered = newRendered;
            
            // Patch the DOM if we have a parent
            const domNode = vnode._domNode;
            if (domNode && domNode.parentNode) {
              patch(domNode.parentNode, newRendered, oldRendered).then(() => {
                // Update DOM reference
                vnode._domNode = newRendered?._domNode;
              });
            } else if (rootRenderFn) {
              rootRenderFn();
            }
          } catch (err) {
            console.error("[Fynix] Component rerender error:", err);
            showErrorOverlay(err);
          }
        };
      }
      
      const unsub = state.subscribe(() => {
        if (ctx.rerender) {
          if (typeof queueMicrotask === "function") queueMicrotask(ctx.rerender);
          else setTimeout(ctx.rerender, 0);
        }
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
  ctx.Component = Component;
  
  // FIX: Create rerender that preserves identity
  if (!ctx.rerender) {
    ctx.rerender = () => {
      try {
        removeErrorOverlay();
        
        const vnode = ctx._vnode;
        const oldRendered = vnode._rendered;
        
        beginComponent(vnode);
        const newRendered = ctx.Component(vnode.props);
        endComponent();
        
        vnode._rendered = newRendered;
        
        const domNode = vnode._domNode;
        if (domNode && domNode.parentNode) {
          patch(domNode.parentNode, newRendered, oldRendered).then(() => {
            vnode._domNode = newRendered?._domNode;
          });
        } else if (rootRenderFn) {
          rootRenderFn();
        }
      } catch (err) {
        console.error("[Fynix] Component rerender error:", err);
        showErrorOverlay(err);
      }
    };
  }
  
  try {
    removeErrorOverlay();
    const result = Component(props);
    ctx._vnode = vnode;
    vnode._rendered = result;
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
  
  // Security: Prevent dangerous attributes
  if (key === "innerHTML" || key === "outerHTML") {
    console.warn("[Fynix] Security: innerHTML/outerHTML not allowed. Use textContent or children.");
    return;
  }
  
  if (BOOLEAN_ATTRS.has(k)) { if (value) { el.setAttribute(k, ""); el[k] = true; } else { el.removeAttribute(k); el[k] = false; } return; }
  if (DOM_PROPERTIES.has(key)) { el[key] = value ?? ""; return; }
  if (key.startsWith("data-") || key.startsWith("aria-")) { if (value != null && value !== false) el.setAttribute(key, value); else el.removeAttribute(key); return; }
  
  // Security: Sanitize href and src attributes
  if ((key === "href" || key === "src") && typeof value === "string") {
    if (value.trim().toLowerCase().startsWith("javascript:")) {
      console.warn("[Fynix] Security: javascript: protocol blocked in", key);
      return;
    }
  }
  
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
    ctx._vnode = vnode;
    vnode._rendered = result;
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
 * @param {Node} parent - Must be a DOM Node
 * @param {object|string|number} newVNode
 * @param {object|string|number} oldVNode
 * @returns {Promise<void>}
 */
export async function patch(parent, newVNode, oldVNode) {
  // Type guard: Ensure parent is a DOM Node
  if (!(parent instanceof Node)) {
    console.error("[Fynix] patch() expects a DOM Node, got:", typeof parent, parent);
    return;
  }

  // Case 1: Both null/false - do nothing
  if (!newVNode && !oldVNode) return;

  // Case 2: Old exists but new is null/false - remove
  if (!newVNode && oldVNode) {
    const domNode = oldVNode._domNode;
    if (domNode?.parentNode) domNode.parentNode.removeChild(domNode);
    unmountVNode(oldVNode);
    return;
  }

  // Case 3: New exists but old doesn't - create and append
  if (newVNode && !oldVNode) {
    const newDom = await createDom(newVNode);
    if (newDom instanceof Node) {
      parent.appendChild(newDom);
    }
    return;
  }

  // Case 4: Both exist - need to diff

  // Handle primitives (string/number)
  const newIsPrimitive = typeof newVNode === "string" || typeof newVNode === "number";
  const oldIsPrimitive = typeof oldVNode === "string" || typeof oldVNode === "number";

  if (newIsPrimitive || oldIsPrimitive) {
    if (newIsPrimitive && oldIsPrimitive && newVNode === oldVNode) return;
    const newDom = await createDom(newVNode);
    const oldDom = oldVNode._domNode || parent.firstChild;
    if (oldDom?.parentNode && newDom instanceof Node) {
      oldDom.parentNode.replaceChild(newDom, oldDom);
    }
    if (oldVNode && typeof oldVNode === "object") {
      unmountVNode(oldVNode);
    }
    return;
  }

  // Both are vnodes
  const newType = newVNode.type;
  const oldType = oldVNode.type;

  // Case 5: Different types - replace entirely
  if (newType !== oldType) {
    const newDom = await createDom(newVNode);
    const oldDom = oldVNode._domNode;
    if (oldDom?.parentNode && newDom instanceof Node) {
      oldDom.parentNode.replaceChild(newDom, oldDom);
    }
    unmountVNode(oldVNode);
    return;
  }

  // Case 6: Text nodes - update if different
  if (newType === TEXT) {
    const oldDom = oldVNode._domNode;
    const newText = newVNode.props.nodeValue ?? "";
    const oldText = oldVNode.props.nodeValue ?? "";
    if (newText !== oldText && oldDom) {
      oldDom.nodeValue = newText;
    }
    newVNode._domNode = oldDom;
    return;
  }

  // Case 7: Fragment - patch children
  if (newType === Fragment) {
    const newChildren = newVNode.props?.children || [];
    const oldChildren = oldVNode.props?.children || [];
    await patchChildren(parent, newChildren, oldChildren);
    newVNode._domNode = oldVNode._domNode;
    return;
  }

  // Case 8: Component - FIX: Reuse component instance when possible
  if (typeof newType === "function") {
    const oldCtx = componentInstances.get(oldVNode);
    
    // FIX: Check if we can reuse the component instance
    if (oldCtx && newType === oldType) {
      // Same component type - update props and reuse instance
      // Transfer the context to the new vnode
      componentInstances.delete(oldVNode);
      componentInstances.set(newVNode, oldCtx);
      
      // Update the context's vnode reference
      oldCtx._vnode = newVNode;
      
      // Re-render with new props
      beginComponent(newVNode);
      const rendered = await oldCtx.Component(newVNode.props);
      endComponent();
      
      newVNode._rendered = rendered;
      
      const oldRendered = oldVNode._rendered;
      const oldDom = oldVNode._domNode;
      
      if (oldDom?.parentNode instanceof Node) {
        await patch(oldDom.parentNode, rendered, oldRendered);
        newVNode._domNode = rendered?._domNode || oldDom;
      }
    } else {
      // Different component or first render
      const rendered = await renderMaybeAsyncComponent(newType, newVNode.props, newVNode);
      newVNode._rendered = rendered;
      
      const oldRendered = oldVNode._rendered;
      const oldDom = oldVNode._domNode;
      
      if (oldDom?.parentNode instanceof Node) {
        await patch(oldDom.parentNode, rendered, oldRendered);
        newVNode._domNode = rendered?._domNode || oldDom;
      } else {
        const newDom = await createDom(rendered);
        if (parent && newDom instanceof Node) {
          parent.appendChild(newDom);
        }
        newVNode._domNode = newDom;
      }
      
      // Clean up old component if it was different
      if (oldCtx && newType !== oldType) {
        unmountVNode(oldVNode);
      }
    }
    return;
  }

  // Case 9: DOM element - update props and children
  const el = oldVNode._domNode;
  if (!el || el.nodeType !== 1) {
    // Fallback: create new
    const newDom = await createDom(newVNode);
    if (parent && newDom instanceof Node) {
      parent.appendChild(newDom);
    }
    unmountVNode(oldVNode);
    return;
  }

  // Update props
  updateProps(el, newVNode.props, oldVNode.props);
  newVNode._domNode = el;

  // Patch children
  const newChildren = newVNode.props?.children || [];
  const oldChildren = oldVNode.props?.children || [];
  await patchChildren(el, newChildren, oldChildren);
}

/**
 * Patch children with keyed reconciliation
 * @param {Node} parent
 * @param {Array} newChildren
 * @param {Array} oldChildren
 */
async function patchChildren(parent, newChildren, oldChildren) {
  if (!(parent instanceof Node)) return;

  // Check if any children have keys
  const hasKeys = newChildren.some(c => c?.key != null) || oldChildren.some(c => c?.key != null);

  if (!hasKeys) {
    // Simple index-based patching
    const maxLen = Math.max(newChildren.length, oldChildren.length);
    for (let i = 0; i < maxLen; i++) {
      const newChild = newChildren[i];
      const oldChild = oldChildren[i];

      if (i >= newChildren.length) {
        // Remove old child
        const dom = oldChild?._domNode;
        if (dom?.parentNode) dom.parentNode.removeChild(dom);
        unmountVNode(oldChild);
      } else if (i >= oldChildren.length) {
        // Append new child
        const newDom = await createDom(newChild);
        if (newDom instanceof Node) {
          parent.appendChild(newDom);
        }
      } else {
        // Patch existing
        await patch(parent, newChild, oldChild);
      }
    }
    return;
  }

  // Keyed reconciliation
  const oldKeyMap = new Map();
  const oldIndexMap = new Map();
  
  oldChildren.forEach((child, idx) => {
    if (child?.key != null) {
      oldKeyMap.set(child.key, child);
      oldIndexMap.set(child.key, idx);
    }
  });

  const newKeySet = new Set(newChildren.filter(c => c?.key != null).map(c => c.key));
  
  // Remove old keyed children not in new list
  oldChildren.forEach(oldChild => {
    if (oldChild?.key != null && !newKeySet.has(oldChild.key)) {
      const dom = oldChild._domNode;
      if (dom?.parentNode) dom.parentNode.removeChild(dom);
      unmountVNode(oldChild);
    }
  });

  // Process new children
  for (let i = 0; i < newChildren.length; i++) {
    const newChild = newChildren[i];
    const key = newChild?.key;

    if (key != null && oldKeyMap.has(key)) {
      // Found matching key
      const oldChild = oldKeyMap.get(key);
      const oldDom = oldChild._domNode;
      const childNodes = Array.from(parent.childNodes);
      const currentPos = childNodes.indexOf(oldDom);
      const desiredPos = i;

      // Move if needed
      if (currentPos !== desiredPos) {
        const refNode = childNodes[desiredPos] || null;
        if (oldDom && oldDom.parentNode === parent) {
          parent.insertBefore(oldDom, refNode);
        }
      }

      // Patch the node
      await patch(parent, newChild, oldChild);
    } else {
      // New child - insert at position
      const newDom = await createDom(newChild);
      if (newDom instanceof Node) {
        const childNodes = Array.from(parent.childNodes);
        const refNode = childNodes[i] || null;
        parent.insertBefore(newDom, refNode);
      }
    }
  }
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
      // Clean up all subscriptions
      ctx._subscriptionCleanups.forEach(u => {
        try { u(); } catch (e) { console.error("[Fynix] Cleanup error:", e); }
      });
      
      // Clean up all effects
      ctx.cleanups.forEach(c => {
        try { c?.(); } catch (e) { console.error("[Fynix] Effect cleanup error:", e); }
      });
      
      // Clear all references to prevent memory leaks
      ctx._subscriptions.clear();
      ctx._accessedStates.clear();
      ctx._subscriptionCleanups = [];
      ctx.cleanups = [];
      ctx.hooks = [];
      ctx.effects = [];
      ctx.rerender = null;
      ctx._vnode = null;
      
      componentInstances.delete(vnode);
    }
    unmountVNode(vnode._rendered);
    return;
  }

  // Clean up event listeners from delegated events
  if (vnode._domNode && vnode._domNode.nodeType === 1) {
    const eid = vnode._domNode._rest_eid;
    if (eid) {
      delegatedEvents.forEach(map => map.delete(eid));
    }
  }

  if (vnode.props?.children) vnode.props.children.forEach(c => unmountVNode(c));
  
  // Clear vnode references
  vnode._domNode = null;
  vnode._rendered = null;
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

  // Remove old props
  for (const k of Object.keys(oldProps)) {
    if (k === "children") continue;
    if (!(k in newProps)) {
      if (k.startsWith("r-")) { 
        const eid = el._rest_eid; 
        if (eid && delegatedEvents.has(k.slice(2).toLowerCase())) {
          delegatedEvents.get(k.slice(2).toLowerCase()).delete(eid);
        }
      }
      else if (BOOLEAN_ATTRS.has(k.toLowerCase())) { el.removeAttribute(k); el[k] = false; }
      else if (DOM_PROPERTIES.has(k)) el[k] = "";
      else el.removeAttribute(k);
    }
  }

  // Add/update new props
  for (const [k,v] of Object.entries(newProps)) {
    if (k === "children") continue;
    // Only update if value actually changed
    if (oldProps[k] !== v) setProperty(el,k,v);
  }
}

/* ---------------------- Mount ---------------------- */

/**
 * Mount the app component to a root DOM node
 * @param {function} AppComponent
 * @param {string|Element} root - CSS selector or DOM element
 * @param {boolean} [hydrate=false]
 * @param {object} [props={}]
 */
export function mount(AppComponent, root, hydrate = false, props = {}) {
  // Convert string selector to Element
  if (typeof root === "string") {
    const element = document.querySelector(root);
    if (!element) {
      console.error("[Fynix] Mount error: Element not found for selector:", root);
      return;
    }
    root = element;
  }

  if (!(root instanceof Element)) {
    console.error("[Fynix] Mount error: Invalid root element", root);
    return;
  }

  let Component = AppComponent;
  let oldVNode = null;
  let currentProps = props;
  let appVNode = null; // Persistent vnode reference

  async function renderApp() {
    try {
      removeErrorOverlay();
      const propsToUse = window.__lastRouteProps || window.__fynix__?.lastRouteProps || currentProps;
      
     // console.log("[Fynix Runtime] Rendering Root with props:", propsToUse);

      // FIX: Reuse the same vnode instance to preserve component context
      if (!appVNode) {
        // First render - create new vnode
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
        // Subsequent renders - update props but reuse vnode
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
        try { 
          const UpdatedComponent = mod.App || mod.default; 
          if (UpdatedComponent) { 
            Component = UpdatedComponent;
            // Update the component type but preserve vnode identity
            if (appVNode) {
              appVNode.type = UpdatedComponent;
            }
            window.__fynix__.rerender?.(); 
          } 
        }
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
  nixAsyncCached,
  nixAsyncDebounce,
  nixAsyncQuery,
  nixEffectAlways,
  nixEffectOnce,
  nixFormAsync,
  nixLazyAsync,
  nixLazyFormAsync,
  Path,
  Button
};