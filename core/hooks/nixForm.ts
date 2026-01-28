// core/hooks/nixForm.js - Form handling utilities with memory-safe async support
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
  handleSubmit: (
    onSubmit: (values: T, signal: AbortSignal) => Promise<void>
  ) => Promise<void>;
  cancelSubmit: () => void;
  reset: () => void;
  getFieldProps: (fieldName: keyof T) => {
    value: any;
    "r-input": (e: any) => void;
    "r-blur": () => void;
  };
};

/**
 * Reactive form handler with validation, reactive state, and safe async submit.
 *
 * @param {Object} [initialValues={}] - Initial values for form fields.
 * @param {Object} [validationRules={}] - Validation rules for fields.
 * @returns {Object} Form utilities: values, errors, touched, isSubmitting, isValid,
 *   handleChange, handleBlur, handleSubmit, reset, getFieldProps, cancelSubmit
 *
 * @example
 * const form = nixForm({ email: "" }, {
 *   email: { required: true, pattern: /^\S+@\S+$/, message: "Invalid email" }
 * });
 * form.handleSubmit(async (values) => { await api.submit(values); });
 */
export function nixForm<T extends Record<string, any> = Record<string, any>>(
  initialValues: T = {} as T,
  validationRules: ValidationRules<T> = {} as ValidationRules<T>
): FormState<T> {
  const values = nixState<T>({ ...initialValues });
  const errors = nixState<Partial<Record<keyof T, string>>>({});
  const touched = nixState<Partial<Record<keyof T, boolean>>>({});
  const isSubmitting = nixState<boolean>(false);

  const isValid = nixComputed<boolean>(
    () => Object.keys(errors.value).length === 0
  );

  let abortController: AbortController | null = null;

  function validate(fieldName: keyof T, value: any): string | null {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    if (rules.required && !value) {
      return rules.message || `${String(fieldName)} is required`;
    }
    if (rules.minLength && value.length < rules.minLength) {
      return (
        rules.message ||
        `${String(fieldName)} must be at least ${rules.minLength} characters`
      );
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return (
        rules.message ||
        `${String(fieldName)} must be at most ${rules.maxLength} characters`
      );
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.message || `${String(fieldName)} is invalid`;
    }
    if (rules.custom && !rules.custom(value, values.value)) {
      return rules.message || `${String(fieldName)} is invalid`;
    }
    return null;
  }

  function handleChange(fieldName: keyof T, value: any): void {
    values.value = { ...values.value, [fieldName]: value };

    if (touched.value[fieldName]) {
      const error = validate(fieldName, value);
      if (error) {
        errors.value = { ...errors.value, [fieldName]: error };
      } else {
        const newErrors = { ...errors.value };
        delete newErrors[fieldName];
        errors.value = newErrors;
      }
    }
  }

  function handleBlur(fieldName: keyof T): void {
    touched.value = { ...touched.value, [fieldName]: true };
    const error = validate(fieldName, values.value[fieldName]);
    if (error) {
      errors.value = { ...errors.value, [fieldName]: error };
    }
  }

  function validateAll(): boolean {
    const newErrors: Partial<Record<keyof T, string>> = {};
    (Object.keys(validationRules) as Array<keyof T>).forEach((fieldName) => {
      const error = validate(fieldName, values.value[fieldName]);
      if (error) newErrors[fieldName] = error;
    });
    errors.value = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(
    onSubmit: (values: T, signal: AbortSignal) => Promise<void>
  ): Promise<void> {
    const allTouched = (Object.keys(validationRules) as Array<keyof T>).reduce(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      {} as Partial<Record<keyof T, boolean>>
    );
    touched.value = allTouched;

    if (!validateAll()) return;

    if (abortController) abortController.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    isSubmitting.value = true;
    try {
      await onSubmit(values.value, signal);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("[nixForm] Submission error:", err);
      }
    } finally {
      if (!signal.aborted) isSubmitting.value = false;
    }
  }

  function cancelSubmit(): void {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  function reset(): void {
    values.value = { ...initialValues };
    errors.value = {};
    touched.value = {};
    isSubmitting.value = false;
    cancelSubmit();
  }

  function getFieldProps(fieldName: keyof T) {
    return {
      value: values.value[fieldName] || "",
      "r-input": (e: any) => handleChange(fieldName, e.target.value),
      "r-blur": () => handleBlur(fieldName),
    };
  }

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    cancelSubmit,
    reset,
    getFieldProps,
  };
}
