import { Rest } from "../runtime.js";

/**
 * @typedef {Object} PathProps
 * @property {string} [to] - URL to navigate to
 * @property {string} [value] - Link text
 * @property {Object} [props] - Props to pass to the next route
 */

let propsCounter = 0; // Add a counter for uniqueness

export function Path({
  to = "#",
  value = "",
  props: routeProps = {},
  ...attrs
}) {
  // Store a reference to props in window for retrieval
  const propsKey = `__pathProps_${Date.now()}_${propsCounter++}`;
  window[propsKey] = routeProps;

  const el = Rest(
    "a",
    {
      href: to,
      "data-rest-link": true,
      "data-props-key": propsKey,
      ...attrs,
    },
    value
  );

  return el;
}
