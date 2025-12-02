import { Fynix } from "../runtime.js";

/**
 * @typedef {Object} ButtonProps
 * @property {string} [value] - Inner text of the button (default: "")
 * @property {Record<string, any>} [props] - Other attributes
 */

/**
 * @param {ButtonProps} props
 */
export function Button({ value = "", ...props }) {
  return Fynix("button", props, value);
}
