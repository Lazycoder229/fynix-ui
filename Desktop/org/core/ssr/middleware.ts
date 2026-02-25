import { matchServerRoute } from "./serverRouter";
import { renderPage } from "./render";
import { generateStaticPage } from "./static";

interface SSRMiddlewareOptions {
    pagesDir: string;
    template: string;
    publicDir?: string;
}

/**
 * A standard middleware for Node.js servers to handle Fynix SSR.
 */
export function createFynixMiddleware(options: SSRMiddlewareOptions) {
    return async (req: any, res: any, next: () => void) => {
        const url = req.url || "/";

        // Try to match a route
        const match = await matchServerRoute(url, options.pagesDir);

        if (match) {
            try {
                console.log(`[Fynix SSR] Rendering route: ${url}`);

                // 1. Render the page (calls getServerSideProps if present)
                const { html: contentHTML, props } = await renderPage(match.module, {
                    params: match.params,
                    req,
                    res
                });

                // 2. Generate full HTML
                const fullHTML = await generateStaticPage({
                    template: options.template,
                    title: match.module.title || (match.module.default?.title) || "Fynix App",
                    meta: match.module.meta || (match.module.default?.meta) || {},
                    initialState: props,
                    contentHTML
                });

                res.setHeader("Content-Type", "text/html");
                res.end(fullHTML);
            } catch (err) {
                console.error(`[Fynix SSR] Error rendering ${url}:`, err);
                res.statusCode = 500;
                res.end("Internal Server Error");
            }
        } else {
            // Not a Fynix route, hand over to next middleware (e.g. static files)
            next();
        }
    };
}
