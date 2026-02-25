export declare function nixAsyncCached(key: any, promiseFactory: () => Promise<any>, options?: {
    ttl?: number;
    maxCacheSize?: number;
    validateKey?: (key: any) => boolean;
}): {
    data: {
        value: any;
    };
    error: {
        value: any;
    };
    loading: {
        value: boolean;
    };
    run: () => Promise<void>;
    cancel: () => void;
    clearCache: () => void;
};
