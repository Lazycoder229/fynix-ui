import { RouteInfo, discoverRoutes, matchRoute } from "./discovery";

interface RouteMatch {
    module: any;
    params: Record<string, string>;
    route: RouteInfo;
}

/**
 * Matches a URL path against a set of routes on the server using filesystem discovery.
 */
export async function matchServerRoute(
    path: string,
    pagesDir: string
): Promise<RouteMatch | null> {
    const routes = await discoverRoutes(pagesDir);
    const match = matchRoute(path, routes);

    if (match) {
        try {
            // Import the module using absolute path
            const absolutePath = match.route.filePath.replace(/\\/g, "/");
            const fileUrl = `file:///${absolutePath.startsWith("/") ? absolutePath.slice(1) : absolutePath}`;
            const module = await import(fileUrl);
            return {
                module,
                params: match.params,
                route: match.route
            };
        } catch (err) {
            console.error(`[Fynix Router] Error importing route module: ${match.route.filePath}`, err);
            return null;
        }
    }

    return null;
}
