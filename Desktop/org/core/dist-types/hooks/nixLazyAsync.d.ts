export declare function nixLazyAsync<TProps = any>(importFn: () => Promise<{
    default?: (props: TProps) => any;
} | ((props: TProps) => any)>, options?: {
    retry?: number;
}): (props: TProps) => any;
export declare function Suspense<T = any>({ fallback, children, }: {
    fallback: any;
    children: () => T;
}): T | any;
