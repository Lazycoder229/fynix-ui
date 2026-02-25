import { TEXT, Fragment, VNode, VNodeType, VNodeChildren, ComponentFunction, BOOLEAN_ATTRS, h } from "../runtime";

/**
 * Escapes strings for HTML output to prevent XSS.
 */
function escapeHTML(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Converts a VNode into an HTML string for Server-Side Rendering (SSR).
 * 
 * @param vnode The virtual node to render.
 * @returns A promise that resolves to the HTML string.
 */
export async function renderToHTML(vnode: VNode | any): Promise<string> {
    if (vnode == null || vnode === false) {
        return "";
    }

    // Handle Primitive Types (converted to strings)
    if (typeof vnode === "string" || typeof vnode === "number") {
        return escapeHTML(String(vnode));
    }

    // Handle Text VNodes
    if (vnode.type === TEXT) {
        return escapeHTML(vnode.props.nodeValue || "");
    }

    // Handle Fragments
    if (vnode.type === Fragment) {
        const children = vnode.props.children || [];
        const childHTML = await Promise.all(children.map((child: any) => renderToHTML(child)));
        return childHTML.join("");
    }

    // Handle Component VNodes
    if (typeof vnode.type === "function") {
        const Component = vnode.type as any;

        // Handle Islands Architecture
        if (Component.isFynixIsland) {
            const islandName = vnode.props.name;
            const islandProps = vnode.props.props || {};
            const innerVNode = h(vnode.props.component, islandProps);
            const content = await renderToHTML(innerVNode);
            const serializedProps = JSON.stringify(islandProps).replace(/"/g, "&quot;");

            return `<div data-fynix-island="${islandName}" data-props="${serializedProps}">${content}</div>`;
        }

        const result = await (Component as ComponentFunction)(vnode.props);
        return renderToHTML(result);
    }

    // Handle Standard HTML Elements
    if (typeof vnode.type === "string") {
        const tag = vnode.type;
        let props = "";

        // Build attributes string
        for (const [key, value] of Object.entries(vnode.props)) {
            if (key === "children" || key === "key" || key.startsWith("on")) {
                continue;
            }

            if (BOOLEAN_ATTRS.has(key)) {
                if (value) props += ` ${key}`;
                continue;
            }

            if (value != null && value !== false) {
                props += ` ${key}="${escapeHTML(String(value))}"`;
            }
        }

        // Self-closing tags
        const selfClosingTags = ["base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"];

        if (selfClosingTags.includes(tag)) {
            return `<${tag}${props}>`;
        }

        // Render children
        const children = vnode.props.children || [];
        const childHTML = await Promise.all(children.map((child: any) => renderToHTML(child)));

        return `<${tag}${props}>${childHTML.join("")}</${tag}>`;
    }

    return "";
}
/**
 * Interface for getServerSideProps result.
 */
export interface ServerSidePropsResult {
    props: Record<string, any>;
}

/**
 * Interface for getStaticProps result.
 */
export interface StaticPropsResult {
    props: Record<string, any>;
    revalidate?: number | boolean;
}

/**
 * Higher-level rendering function that handles automatic data fetching.
 * 
 * @param module The component module (containing the component and data fetching hooks).
 * @param context Context information (params, req, etc.)
 * @returns A promise that resolves to the HTML string and the fetched props.
 */
export async function renderPage(
    module: any,
    context: { params: Record<string, any>, req?: any, res?: any }
): Promise<{ html: string, props: Record<string, any> }> {
    const Component = module.default || module.App;
    let props = { ...context.params };

    // 1. Handle getServerSideProps (SSR)
    if (module.getServerSideProps) {
        const result = await module.getServerSideProps(context);
        if (result && result.props) {
            props = { ...props, ...result.props };
        }
    }
    // 2. Handle getStaticProps (SSG)
    else if (module.getStaticProps) {
        const result = await module.getStaticProps(context);
        if (result && result.props) {
            props = { ...props, ...result.props };
        }
    }

    // 3. Render the component with merged props
    const vnode = h(Component, props);
    const html = await renderToHTML(vnode);

    return { html, props };
}
