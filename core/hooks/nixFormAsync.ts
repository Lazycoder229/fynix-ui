// core/hooks/nixFormAsync.js

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

type FormAsyncState<T, D = any, E = any> = {
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
  handleSubmit: (
    onSubmit: (values: T, signal: AbortSignal) => Promise<D>
  ) => void;
  cancelSubmit: () => void;
  reset: () => void;
  getFieldProps: (fieldName: keyof T) => {
    value: any;
    "r-input": (e: any) => void;
    "r-blur": () => void;
  };
};

/**
 * Full-featured reactive form with debounced async API submission.
 *
 * @param {Object} [initialValues={}] - Initial field values.
 * @param {Object} [validationRules={}] - Validation rules for each field.
 * @param {Object} [options={}] - Async submit options.
 * @param {number} [options.delay=300] - Debounce delay in ms.
 * @param {boolean} [options.leading=false] - Invoke submit on leading edge.
 * @param {boolean} [options.trailing=true] - Invoke submit on trailing edge.
 * @param {number} [options.maxWait] - Maximum wait time before forced invocation.
 * @param {boolean} [options.cache=true] - Cache last submission result.
 * @returns {Object} Form API with state, validation, and debounced async submission.
 */
export function nixFormAsync<
  T extends Record<string, any> = Record<string, any>,
  D = any,
  E = any,
>(
  initialValues: T = {} as T,
  validationRules: ValidationRules<T> = {} as ValidationRules<T>,
  options: {
    delay?: number;
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
    cache?: boolean;
  } = {}
): FormAsyncState<T, D, E> {
  const values = nixState<T>({ ...initialValues });
  const errors = nixState<Partial<Record<keyof T, string>>>({});
  const touched = nixState<Partial<Record<keyof T, boolean>>>({});
  const isSubmitting = nixState<boolean>(false);
  const isValid = nixComputed<boolean>(
    () => Object.keys(errors.value).length === 0
  );

  const {
    delay = 300,
    leading = false,
    trailing = true,
    maxWait,
    cache = true,
  } = options;
  const data = nixState<D | null>(null);
  const error = nixState<E | null>(null);
  const loading = nixState<boolean>(false);

  let abortController: AbortController | null = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastInvokeTime = 0;
  let lastResult: D | null = null;
  let lastError: E | null = null;
  let pendingPromise: Promise<D> | null = null;

  function validate(fieldName: keyof T, value: any): string | null {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    if (rules.required && !value)
      return rules.message || `${String(fieldName)} is required`;
    if (rules.minLength && value.length < rules.minLength)
      return (
        rules.message ||
        `${String(fieldName)} must be at least ${rules.minLength} characters`
      );
    if (rules.maxLength && value.length > rules.maxLength)
      return (
        rules.message ||
        `${String(fieldName)} must be at most ${rules.maxLength} characters`
      );
    if (rules.pattern && !rules.pattern.test(value))
      return rules.message || `${String(fieldName)} is invalid`;
    if (rules.custom && !rules.custom(value, values.value))
      return rules.message || `${String(fieldName)} is invalid`;

    return null;
  }

  function handleChange(fieldName: keyof T, value: any): void {
    values.value = { ...values.value, [fieldName]: value };

    if (touched.value[fieldName]) {
      const err = validate(fieldName, value);
      if (err) errors.value = { ...errors.value, [fieldName]: err };
      else {
        const newErrors = { ...errors.value };
        delete newErrors[fieldName];
        errors.value = newErrors;
      }
    }
  }

  function handleBlur(fieldName: keyof T): void {
    touched.value = { ...touched.value, [fieldName]: true };
    const err = validate(fieldName, values.value[fieldName]);
    if (err) errors.value = { ...errors.value, [fieldName]: err };
  }

  function validateAll(): boolean {
    const newErrors: Partial<Record<keyof T, string>> = {};
    (Object.keys(validationRules) as Array<keyof T>).forEach((fieldName) => {
      const err = validate(fieldName, values.value[fieldName]);
      if (err) newErrors[fieldName] = err;
    });
    errors.value = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  async function invokeAsync(
    onSubmit: (values: T, signal: AbortSignal) => Promise<D>
  ): Promise<D | undefined> {
    if (cache && lastResult !== null) {
      data.value = lastResult;
      error.value = lastError;
      loading.value = false;
      return lastResult;
    }
    if (abortController) abortController.abort();
    abortController = new AbortController();
    const signal = abortController.signal;
    loading.value = true;
    error.value = null;
    pendingPromise = onSubmit(values.value, signal);
    try {
      const result = await pendingPromise;
      lastResult = result;
      data.value = result;
      return result;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        lastError = err;
        error.value = err;
        console.error("[nixFormAsync] submit error:", err);
      }
      throw err;
    } finally {
      loading.value = false;
      pendingPromise = null;
      lastInvokeTime = Date.now();
    }
  }

  function handleSubmit(
    onSubmit: (values: T, signal: AbortSignal) => Promise<D>
  ): void {
    if (!validateAll()) return;
    const now = Date.now();
    const timeSinceLastInvoke = now - lastInvokeTime;
    const remainingTime = delay - timeSinceLastInvoke;
    const shouldInvokeLeading = leading && !timerId;
    if (maxWait !== undefined && timeSinceLastInvoke >= maxWait) {
      if (timerId) clearTimeout(timerId);
      timerId = null;
      void invokeAsync(onSubmit);
      return;
    }
    if (timerId) clearTimeout(timerId);
    if (shouldInvokeLeading) {
      void invokeAsync(onSubmit);
      return;
    }
    if (trailing) {
      timerId = setTimeout(
        () => {
          timerId = null;
          void invokeAsync(onSubmit);
        },
        remainingTime > 0 ? remainingTime : delay
      );
    }
  }

  function cancelSubmit(): void {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    if (timerId) clearTimeout(timerId);
    timerId = null;
  }

  function reset(): void {
    values.value = { ...initialValues };
    errors.value = {};
    touched.value = {};
    isSubmitting.value = false;
    cancelSubmit();
    data.value = null;
    error.value = null;
    loading.value = false;
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
    data,
    error,
    loading,
    handleChange,
    handleBlur,
    handleSubmit,
    cancelSubmit,
    reset,
    getFieldProps,
  };
}
