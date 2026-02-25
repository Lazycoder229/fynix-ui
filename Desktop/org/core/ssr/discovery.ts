import { fdir } from "fdir";
import * as path from "path";

export interface RouteInfo {
    path: string;
    filePath: string;
    isDynamic: boolean;
    params: string[];
}

/**
 * Discovers routes from a directory structure.
 * Maps files to URL paths following Next.js conventions.
 */
export async function discoverRoutes(pagesDir: string): Promise<RouteInfo[]> {
    const crawler = new fdir().withFullPaths().crawl(pagesDir);
    const files = await crawler.withPromise();

    const routes: RouteInfo[] = [];

    for (const filePath of files) {
        if (!filePath.match(/\.(tsx|jsx|fnx|ts|js)$/)) {
            continue;
        }

        const relativePath = path.relative(pagesDir, filePath);

        // Remove extension and normalize separators
        let route = "/" + relativePath
            .replace(/\.(tsx|jsx|fnx|ts|js)$/, "")
            .replace(/\\/g, "/");

        // Handle /index -> /
        route = route.replace(/\/index$/, "");
        if (route === "") route = "/";

        // Detect dynamic parameters [id]
        const params: string[] = [];
        const dynamicMatch = route.match(/\[([^\]]+)\]/g);
        if (dynamicMatch) {
            for (const match of dynamicMatch) {
                params.push(match.slice(1, -1));
            }
        }

        routes.push({
            path: route,
            filePath,
            isDynamic: params.length > 0,
            params
        });
    }

    // Sort routes: static routes first, then more specific dynamic routes
    return routes.sort((a, b) => {
        // More segments first
        const aSegments = a.path.split("/").length;
        const bSegments = b.path.split("/").length;
        if (aSegments !== bSegments) return bSegments - aSegments;

        // Static before dynamic
        if (a.isDynamic !== b.isDynamic) return a.isDynamic ? 1 : -1;

        return a.path.localeCompare(b.path);
    });
}

/**
 * Matches a URL path against discovered routes.
 */
export function matchRoute(urlPath: string, routes: RouteInfo[]): { route: RouteInfo, params: Record<string, string> } | null {
    const normalizedUrl = urlPath === "/" ? "/" : urlPath.replace(/\/$/, "");
    const segments = normalizedUrl.split("/").filter(Boolean);

    for (const route of routes) {
        const routeSegments = route.path.split("/").filter(Boolean);

        if (segments.length !== routeSegments.length) continue;

        const params: Record<string, string> = {};
        let isMatch = true;

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const routeSegment = routeSegments[i];

            if (routeSegment.startsWith("[") && routeSegment.endsWith("]")) {
                params[routeSegment.slice(1, -1)] = segment;
            } else if (segment !== routeSegment) {
                isMatch = false;
                break;
            }
        }

        if (isMatch) {
            return { route, params };
        }
    }

    return null;
}
