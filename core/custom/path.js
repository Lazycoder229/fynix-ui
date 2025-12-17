import { Rest, nixState } from "../runtime.js";

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
  // Wrap plain props in nixState if not already
  const wrappedProps = {};
  for (const [k, v] of Object.entries(routeProps)) {
    wrappedProps[k] = v && v._isNixState ? v : nixState(v);
  }

  // Generate a unique key for this props object
  const propsKey = `__pathProps_${Date.now()}_${propsCounter++}`;
  window[propsKey] = wrappedProps;

  // Create the anchor element
  const el = Rest(
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
