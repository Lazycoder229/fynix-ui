/* MIT License
* Copyright (c) 2026 Resty Gonzales
*/

import { Fragment } from "../runtime";
import { VNode } from "../types/fnx";

interface ReactiveState<T> {
    value: T;
    _isNixState: boolean;
    subscribe(callback: (value: T) => void): () => void;
}

interface ForProps<T> {
    each: T[] | ReactiveState<T[]>;
    children?: ((item: T, index: number) => VNode) | ((item: T, index: number) => VNode)[];
}

/**
 * <For> Component
 *
 * A reactive list iteration component that efficiently renders items from an array or reactive state.
 *
 * @example
 * ```tsx
 * <For each={items}>
 *   {(item, index) => <div key={index}>{item.name}</div>}
 * </For>
 * ```
 *
 * @param props - Component properties
 * @param props.each - The array or reactive state of array to iterate over
 * @param props.children - Render function that receives (item, index) and returns a VNode
 */
export function For<T>(props: ForProps<T>): VNode {
    // Extract items from reactive state or plain array
    let items: T[] = [];

    if (props.each && typeof props.each === "object" && "_isNixState" in props.each) {
        // Access .value to subscribe to reactive state
        items = (props.each as ReactiveState<T[]>).value;
    } else if (Array.isArray(props.each)) {
        items = props.each;
    }

    // Get the renderer function
    // In Fynix's JSX transform, children passed as {() => ...} becomes props.children directly
    let renderer: ((item: T, index: number) => VNode) | undefined;

    // Handle both direct function and array of children (depends on JSX transform)
    if (typeof props.children === "function") {
        renderer = props.children;
    } else if (Array.isArray(props.children)) {
        // If JSX transform wraps it in an array, get first element
        const firstChild = props.children[0];
        if (typeof firstChild === "function") {
            renderer = firstChild as (item: T, index: number) => VNode;
        }
    }

    if (!renderer) {
        if (items.length > 0) {
            console.warn("[Fynix] <For> expects a function as its child. Received:", typeof props.children);
        }
        return { type: Fragment, props: { children: [] }, key: null };
    }

    // Map items to VNodes
    const mapped = items.map((item, index) => {
        try {
            return renderer!(item, index);
        } catch (error) {
            console.error(`[Fynix] Error rendering item at index ${index}:`, error);
            // Return a safe fallback
            return {
                type: "div",
                props: {
                    children: ["Error rendering item"],
                    style: "color: red;"
                },
                key: index
            } as VNode;
        }
    });

    return { type: Fragment, props: { children: mapped }, key: null };
}