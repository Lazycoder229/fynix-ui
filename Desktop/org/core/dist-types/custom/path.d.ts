declare global {
    interface Window {
        __fynixLinkProps__?: Record<string, any>;
    }
}
export declare function Path({ to, value, props: routeProps, ...attrs }: {
    to?: string;
    value?: string;
    props?: {
        [key: string]: any;
    };
    [key: string]: any;
}): any;
