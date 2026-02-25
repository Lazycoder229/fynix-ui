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
 * @fileoverview Component context management for Fynix framework.
 * Tracks the currently rendering component to enable hooks to access component state.
 */

/**
 * @typedef {Object} ComponentContext
 * @property {Array<any>} hooks - Array of hook states
 * @property {number} hookIndex - Current hook index during render
 * @property {Array<Function>} effects - Array of effect cleanup functions
 * @property {Array<Function>} cleanups - Array of cleanup functions
 * @property {Array<Function>} [stateCleanups] - Array of state cleanup functions
 * @property {Object} _vnode - Associated virtual node
 * @property {Set<any>} _accessedStates - Set of states accessed during render
 * @property {Set<any>} _subscriptions - Set of active subscriptions
 * @property {Array<Function>} _subscriptionCleanups - Array of subscription cleanup functions
 * @property {number} version - Component version for tracking updates
 * @property {Function|null} rerender - Function to trigger component re-render
 * @property {Function} Component - Component function
 * @property {boolean} _isMounted - Whether component is mounted
 * @property {boolean} _isRerendering - Whether component is currently re-rendering
 */

// TypeScript interface for ComponentContext
export interface ComponentContext {
  hooks: any[];
  hookIndex: number;
  effects: Function[];
  cleanups: Function[];
  stateCleanups?: Function[];
  _vnode: object;
  _accessedStates: Set<any>;
  _subscriptions: Set<any>;
  _subscriptionCleanups: Function[];
  version: number;
  rerender: (() => void) | null;
  Component: Function;
  _isMounted: boolean;
  _isRerendering: boolean;
}

/**
 * The currently active component context.
 * This is set during component rendering to allow hooks to access the component's state.
 */
export let activeContext: ComponentContext | null = null;

/**
 * Set the active component context.
 * Called internally by the runtime when entering/exiting component rendering.
 *
 * @param ctx - The component context to set as active, or null to clear
 * @returns void
 */
export function setActiveContext(ctx: ComponentContext | null): void {
  activeContext = ctx;
}
