export declare function nixState<T>(initial: T): {
    value: T;
    subscribe: (fn: (value: T) => void) => () => void;
    cleanup: () => void;
    getSubscriberCount: () => number;
    isDestroyed: () => boolean;
    asReadOnly: () => {
        value: T;
        subscribe: (fn: (value: T) => void) => () => void;
        _isNixState: true;
        _isReadOnly: true;
    };
    _isNixState: true;
};
