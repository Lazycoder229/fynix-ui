/**
 * @fileoverview Path component for SPA navigation in Fynix applications.
 * Provides client-side routing with prop passing between routes.
 */

import { Fynix, nixState } from "../runtime.js";

/**
 * @typedef {Object} PathProps
 * @property {string} [to="#"] - URL to navigate to (relative or absolute)
 * @property {string} [value=""] - Link text content
 * @property {Record<string, any>} [props={}] - Props to pass to the destination route component
 * @property {string} [target] - Link target (_blank, _self, etc.)
 * @property {string} [rel] - Link relationship (noopener, noreferrer, etc.)
 * @property {string} [rc] - Reactive class attribute (Fynix-specific)
 * @property {string} [class] - CSS class names
 * @property {string} [id] - Element ID
 */

/** Extend Window interface for __fynixLinkProps__ */
declare global {
  interface Window {
    __fynixLinkProps__?: Record<string, any>;
  }
}

/** Unique counter for props keys */
let propsCounter = 0;

/**
 * SPA navigation link component for Fynix router.
 * Automatically handles client-side navigation and prop passing between routes.
 *
 * @param {PathProps & Record<string, any>} options - Component props
 * @returns {VNode} Anchor element virtual node
 *
 * @example
 * // Basic navigation
 * <Path to="/about" value="About Us" />
 *
 * @example
 * // Navigate with props
 * <Path
 *   to="/user/123"
 *   value="View Profile"
 *   props={{ userId: 123, fromSearch: true }}
 * />
 *
 * @example
 * // External link
 * <Path
 *   to="https://github.com"
 *   value="GitHub"
 *   target="_blank"
 *   rel="noopener noreferrer"
 * />
 *
 * @example
 * // With styling
 * <Path
 *   to="/dashboard"
 *   value="Dashboard"
 *   rc="px-4 py-2 bg-blue-500 text-white rounded"
 * />
 */
// Use 'any' as the return type to avoid the VNode type export error
export function Path({
  to = "#",
  value = "",
  props: routeProps = {},
  ...attrs
}: {
  to?: string;
  value?: string;
  props?: { [key: string]: any };
  [key: string]: any;
}): any {
  ///console.log("[Path Component] Received routeProps:", routeProps);

  // Wrap plain props in nixState if not already
  const wrappedProps: { [key: string]: any } = {};
  for (const [k, v] of Object.entries(routeProps as { [key: string]: any })) {
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
