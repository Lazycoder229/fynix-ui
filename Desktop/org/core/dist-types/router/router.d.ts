interface NestedRoute {
    path: string;
    component: ComponentFunction;
    children?: NestedRoute[];
    layout?: ComponentFunction;
    keepAlive?: boolean;
}
interface ComponentFunction {
    (props: any): any;
}
interface RouteComponent {
    (props: any): any;
    props?: Record<string, any> | (() => Record<string, any>);
    meta?: RouteMeta | ((params: Record<string, string>) => RouteMeta);
}
interface RouteMeta {
    title?: string;
    description?: string;
    keywords?: string;
    twitterCard?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
}
interface DynamicRoute {
    pattern: string;
    regex: RegExp;
    component: RouteComponent;
    params: string[];
}
interface FynixRouter {
    mountRouter(selector?: string): void;
    navigate(path: string, props?: Record<string, any>): void;
    replace(path: string, props?: Record<string, any>): void;
    back(): void;
    cleanup(): void;
    routes: Record<string, RouteComponent>;
    dynamicRoutes: DynamicRoute[];
    preloadRoute?(path: string): Promise<void>;
    clearCache?(): void;
    enableNestedRouting?(routes: NestedRoute[]): void;
}
declare function createFynix(): FynixRouter;
export { createFynix };
export default createFynix;
export declare function setLinkProps(key: string, props: Record<string, any>): void;
export declare function clearLinkProps(key: string): void;
