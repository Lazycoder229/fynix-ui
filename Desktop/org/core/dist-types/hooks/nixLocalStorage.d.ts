export declare function nixLocalStorage<T>(key: string, initial: T): {
    value: T;
    set: (v: T) => boolean;
    clear: () => void;
    getSize: () => number;
    isValid: () => boolean;
};
