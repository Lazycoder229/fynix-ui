/* MIT License

* Copyright (c) 2026 Resty Gonzales

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
 */
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
