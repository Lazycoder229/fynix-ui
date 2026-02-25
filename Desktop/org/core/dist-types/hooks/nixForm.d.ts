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
type FormState<T> = {
    values: ReturnType<typeof nixState<T>>;
    errors: ReturnType<typeof nixState<Partial<Record<keyof T, string>>>>;
    touched: ReturnType<typeof nixState<Partial<Record<keyof T, boolean>>>>;
    isSubmitting: ReturnType<typeof nixState<boolean>>;
    isValid: ReturnType<typeof nixComputed<boolean>>;
    handleChange: (fieldName: keyof T, value: any) => void;
    handleBlur: (fieldName: keyof T) => void;
    handleSubmit: (onSubmit: (values: T, signal: AbortSignal) => Promise<void>) => Promise<void>;
    cancelSubmit: () => void;
    reset: () => void;
    getFieldProps: (fieldName: keyof T) => {
        value: any;
        "r-input": (e: any) => void;
        "r-blur": () => void;
    };
};
export declare function nixForm<T extends Record<string, any> = Record<string, any>>(initialValues?: T, validationRules?: ValidationRules<T>): FormState<T>;
export {};
