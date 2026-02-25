import { h, ComponentFunction, hydrate } from "../runtime";

/**
 * The Island component is a wrapper that marks a subtree for client-side hydration.
 */
export function Island(props: {
    component: ComponentFunction;
    name: string;
    props?: any;
}) {
    return h(props.component, props.props || {});
}

// Marker for the renderer to detect this component
(Island as any).isFynixIsland = true;

/**
 * Registry to map component names to actual functions on the client.
 */
export const componentRegistry: Record<string, ComponentFunction> = {};

export function registerIsland(name: string, component: ComponentFunction) {
    componentRegistry[name] = component;
}

/**
 * Client-side utility to find and hydrate all islands on the page.
 */
export function hydrateIslands() {
    if (typeof document === "undefined") return;

    const islands = document.querySelectorAll("[data-fynix-island]");

    islands.forEach(el => {
        const name = el.getAttribute("data-fynix-island");
        if (!name) return;

        const Component = componentRegistry[name];
        if (!Component) {
            console.warn(`[Fynix Islands] No component registered for island: ${name}`);
            return;
        }

        const propsStr = el.getAttribute("data-props");
        let props = {};
        if (propsStr) {
            try {
                props = JSON.parse(propsStr);
            } catch (e) {
                console.error(`[Fynix Islands] Failed to parse props for island: ${name}`, e);
            }
        }

        // Hydrate this specific element
        hydrate(Component, el as HTMLElement, props);
    });
}
