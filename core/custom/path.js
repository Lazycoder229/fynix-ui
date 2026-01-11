import { Fynix, nixState } from "../runtime.js";

/**
 * @typedef {Object} PathProps
 * @property {string} [to] - URL to navigate to
 * @property {string} [value] - Link text
 * @property {Object} [props] - Props to pass to the next route
 */

/** Unique counter for props keys */
let propsCounter = 0;

/**
 * SPA navigation link for Fynix router
 * @param {PathProps & Record<string, any>} options
 * @returns {HTMLElement} anchor element
 */
export function Path({
  to = "#",
  value = "",
  props: routeProps = {},
  ...attrs
}) {
  ///console.log("[Path Component] Received routeProps:", routeProps);

  // Wrap plain props in nixState if not already
  const wrappedProps = {};
  for (const [k, v] of Object.entries(routeProps)) {
    wrappedProps[k] = v && v._isNixState ? v : nixState(v);
  }

  // Generate a unique key for this props object
  // FIX: Do not use __ prefix as router blocks it for security
  const propsKey = `fynixProp_${Date.now()}_${propsCounter++}`;
  
  // FIX: Store props in the namespace expected by the router
  if (!window.__fynixLinkProps__) {
    window.__fynixLinkProps__ = {};
  }
  
  // Debug log
 // console.log("[Path] Storage props:", propsKey, wrappedProps);
  
  window.__fynixLinkProps__[propsKey] = wrappedProps;

  // Create the anchor element
  const el = Fynix(
    "a",
    {
      href: to,
      "data-fynix-link": true, // SPA link detection
      "data-props-key": propsKey,
      ...attrs,
    },
    value
  );

  return el;
}
