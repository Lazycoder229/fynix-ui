export interface NixDebounceOptions {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
    signal?: AbortSignal;
}
export type DebouncedFunction<T extends (...args: any[]) => any> = ((...args: Parameters<T>) => void) & {
    cancel: () => void;
};
export declare function nixDebounce<T extends (...args: any[]) => any>(fn: T, delay?: number, options?: NixDebounceOptions): DebouncedFunction<T>;
