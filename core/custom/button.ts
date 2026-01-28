/**
 * @fileoverview Button component for Fynix applications.
 * Simple wrapper around native button element with Fynix integration.
 */

import { Fynix } from "../runtime.js";

/**
 * @typedef {Object} ButtonProps
 * @property {string} [value=""] - Button text content
 * @property {string} [type="button"] - Button type (button, submit, reset)
 * @property {boolean} [disabled=false] - Whether button is disabled
 * @property {string} [rc] - Reactive class attribute (Fynix-specific)
 * @property {string} [class] - CSS class names
 * @property {(this: HTMLElement, event: MouseEvent) => void} [r-click] - Click event handler
 */

/**
 * Button component for Fynix applications.
 * Renders a native HTML button element with Fynix event handling.
 *
 * @param {ButtonProps & Record<string, any>} props - Component props
 * @returns {VNode} Button element virtual node
 *
 * @example
 * // Basic button
 * <Button value="Click Me" />
 *
 * @example
 * // With click handler
 * <Button
 *   value="Submit"
 *   r-click={() => console.log('Clicked!')}
 * />
 *
 * @example
 * // Submit button with styling
 * <Button
 *   value="Save"
 *   type="submit"
 *   rc="px-4 py-2 bg-blue-500 text-white rounded"
 * />
 */
// Use 'any' as the return type to avoid the VNode type export error
export function Button({ value = "", ...props }: Record<string, any>): any {
  return Fynix("button", props, value);
}
