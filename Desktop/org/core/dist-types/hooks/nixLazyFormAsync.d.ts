import { nixComputed } from "./nixComputed.js";
import { nixState } from "./nixState.js";
type ValidationRule<T> = {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any, values: T) => boolean;
    message?: string;
};
type ValidationRules<T> = {
    [K in keyof T]?: ValidationRule<T>;
};
type LazyFormAsyncReturn<T, D = any, E = any, P = any> = {
    LazyComponentWrapper: (props: P) => any;
    values: ReturnType<typeof nixState<T>>;
    errors: ReturnType<typeof nixState<Partial<Record<keyof T, string>>>>;
    touched: ReturnType<typeof nixState<Partial<Record<keyof T, boolean>>>>;
    isSubmitting: ReturnType<typeof nixState<boolean>>;
    isValid: ReturnType<typeof nixComputed<boolean>>;
    data: ReturnType<typeof nixState<D | null>>;
    error: ReturnType<typeof nixState<E | null>>;
    loading: ReturnType<typeof nixState<boolean>>;
    handleChange: (fieldName: keyof T, value: any) => void;
    handleBlur: (fieldName: keyof T) => void;
    handleSubmit: (onSubmit: (values: T, signal: AbortSignal) => Promise<D>) => void;
    cancelSubmit: () => void;
    reset: () => void;
    getFieldProps: (fieldName: keyof T) => {
        value: any;
        "r-input": (e: any) => void;
        "r-blur": () => void;
    };
};
export declare function nixLazyFormAsync<T extends Record<string, any> = Record<string, any>, D = any, E = any, P = any>(importFn: () => Promise<{
    default?: (props: P) => any;
} | ((props: P) => any)>, formOptions?: {
    initialValues?: T;
    validationRules?: ValidationRules<T>;
}, submitOptions?: {
    delay?: number;
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
    cache?: boolean;
}, lazyOptions?: {
    retry?: number;
}): LazyFormAsyncReturn<T, D, E, P>;
export {};
