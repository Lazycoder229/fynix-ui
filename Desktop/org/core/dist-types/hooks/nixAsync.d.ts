export declare function nixAsync<T>(promiseFactory: (signal: AbortSignal) => Promise<T>, options?: {
    timeout?: number;
    retries?: number;
    autoRun?: boolean;
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
    cleanup: () => void;
    getCallId: () => number;
};
