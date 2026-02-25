import { VNode } from "../runtime";
import { renderToHTML } from "./render";

interface StaticPageOptions {
    template: string;
    title?: string;
    meta?: Record<string, string>;
    scripts?: string[];
    styles?: string[];
    initialState?: any;
}

/**
 * Generates a full HTML document for a static page.
 * Wraps the server-rendered component HTML in a base template.
 */
export async function generateStaticPage(
    options: StaticPageOptions & { contentHTML?: string },
    vnode?: VNode
): Promise<string> {
    const contentHTML = options.contentHTML || (vnode ? await renderToHTML(vnode) : "");

    let html = options.template;

    // Inject content
    html = html.replace("<!--fynix-app-->", contentHTML);

    // Inject Title
    if (options.title) {
        html = html.replace(/<title>.*?<\/title>/, `<title>${options.title}</title>`);
    }

    // Inject Meta Tags
    if (options.meta) {
        let metaTags = "";
        for (const [name, content] of Object.entries(options.meta)) {
            metaTags += `<meta name="${name}" content="${content}">\n`;
        }
        html = html.replace("<!--fynix-meta-->", metaTags);
    }

    // Inject State for Hydration
    if (options.initialState) {
        const stateScript = `<script id="__FYNIX_DATA__" type="application/json">${JSON.stringify(options.initialState)}</script>`;
        html = html.replace("<!--fynix-state-->", stateScript);
    }

    // Inject Scripts
    if (options.scripts) {
        const scripts = options.scripts.map(src => `<script src="${src}" type="module"></script>`).join("\n");
        html = html.replace("<!--fynix-scripts-->", scripts);
    }

    // Inject Styles
    if (options.styles) {
        const styles = options.styles.map(href => `<link rel="stylesheet" href="${href}">`).join("\n");
        html = html.replace("<!--fynix-styles-->", styles);
    }

    return html;
}

/**
 * Interface that components can implement to support dynamic SSG routes.
 */
export interface StaticPathsResult {
    paths: Array<{ params: Record<string, string> }>;
    fallback?: boolean;
}

export type StaticPathsHook = () => Promise<StaticPathsResult> | StaticPathsResult;
