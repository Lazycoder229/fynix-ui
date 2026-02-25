export declare function nixStore<T = any>(path: string, initial: T): {
    value: T;
    subscribe: (fn: () => void) => () => void;
    path: string;
    cleanup: () => void;
    getSubscriberCount: () => number;
    isDestroyed: () => boolean;
    _isNixState: boolean;
};
