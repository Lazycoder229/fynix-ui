export declare function nixComputed<T>(computeFn: () => T): {
    value: T;
    subscribe: (fn: (value: T) => void) => () => void;
    cleanup: () => void;
    getSubscriberCount: () => number;
    getDependencyCount: () => number;
    isDestroyed: () => boolean;
    getDependencyInfo: () => Array<{
        state: any;
        hasCleanup: boolean;
        isComputed: boolean;
    }>;
    _isNixState: true;
    _isComputed: true;
};
