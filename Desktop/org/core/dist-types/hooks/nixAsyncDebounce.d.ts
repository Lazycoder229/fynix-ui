export interface NixAsyncDebounceOptions {
    delay?: number;
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
    cache?: boolean;
    signal?: AbortSignal;
}
export declare function nixAsyncDebounce(promiseFactory: () => Promise<any>, options?: NixAsyncDebounceOptions): {
    data: {
        value: any;
    };
    error: {
        value: any;
    };
    loading: {
        value: boolean;
    };
    run: () => void | Promise<any>;
    cancel: () => void;
};
