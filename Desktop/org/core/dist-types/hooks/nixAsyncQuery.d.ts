export declare function nixAsyncQuery<T>(key: string, queryFn: (signal: AbortSignal) => Promise<T>, options?: {
    ttl?: number;
}): {
    data: {
        value: T | null;
    };
    error: {
        value: Error | null;
    };
    loading: {
        value: boolean;
    };
    run: () => Promise<void>;
    cancel: () => void;
};
