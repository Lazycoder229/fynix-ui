// core/hooks/nixLazyFormAsync.js
import { activeContext } from "../context/context.js";
import { nixComputed } from "./nixComputed.js";
import { nixState } from "./nixState.js";

/**
 * Lazy-load a form component and manage its state with debounced async submissions.
 *
 * @param {() => Promise<any>} importFn - Function returning a dynamic import of the form component.
 * @param {Object} [formOptions={}] - Initial values and validation rules.
 * @param {Object} [formOptions.initialValues={}] - Initial field values.
 * @param {Object} [formOptions.validationRules={}] - Validation rules per field.
 * @param {Object} [submitOptions={}] - Debounce and async submission options.
 * @param {number} [submitOptions.delay=300] - Debounce delay.
 * @param {boolean} [submitOptions.leading=false] - Invoke submit on leading edge.
 * @param {boolean} [submitOptions.trailing=true] - Invoke submit on trailing edge.
 * @param {number} [submitOptions.maxWait] - Max wait before forced submission.
 * @param {boolean} [submitOptions.cache=true] - Cache last submission result.
 * @param {Object} [lazyOptions={}] - Options for lazy-loaded component import.
 * @param {number} [lazyOptions.retry=0] - Retry count for lazy-loaded component import.
 * @returns {Object} Lazy-loaded form component and reactive form API.
 */
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

export function nixLazyFormAsync<
  T extends Record<string, any> = Record<string, any>,
  D = any,
  E = any,
  P = any,
>(
  importFn: () => Promise<
    { default?: (props: P) => any } | ((props: P) => any)
  >,
  formOptions: { initialValues?: T; validationRules?: ValidationRules<T> } = {},
  submitOptions: {
    delay?: number;
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
    cache?: boolean;
  } = {},
  lazyOptions: { retry?: number } = {}
): LazyFormAsyncReturn<T, D, E, P> {
  const {
    initialValues = {} as T,
    validationRules = {} as ValidationRules<T>,
  } = formOptions;
  const { retry = 0 } = lazyOptions;
  const {
    delay = 300,
    leading = false,
    trailing = true,
    maxWait,
    cache = true,
  } = submitOptions;

  type LazyCache = {
    status: "pending" | "success" | "error";
    component: ((props: P) => any) | null;
    error: any;
    promise: Promise<any> | null;
    retriesLeft: number;
  };
  const lazyCache: LazyCache = {
    status: "pending",
    component: null,
    error: null,
    promise: null,
    retriesLeft: retry,
  };

  let lazyAbortController: AbortController | null = new AbortController();
  let lazyCanceled = false;

  const loadLazy = (): Promise<any> => {
    lazyCache.promise = importFn()
      .then((module) => {
        if (!lazyCanceled) {
          lazyCache.status = "success";
          lazyCache.component = (module as any).default || module;
        }
      })
      .catch((err) => {
        if (!lazyCanceled) {
          if (lazyCache.retriesLeft > 0) {
            lazyCache.retriesLeft--;
            return loadLazy();
          }
          lazyCache.status = "error";
          lazyCache.error = err;
        }
        return Promise.reject(err);
      });
    return lazyCache.promise;
  };

  loadLazy();

  const cancelLazyLoad = (): void => {
    lazyCanceled = true;
    if (lazyAbortController) {
      lazyAbortController.abort();
      lazyAbortController = null;
    }
  };

  const LazyComponentWrapper = (props: P): any => {
    const ctx = activeContext;
    if (!ctx) throw new Error("nixLazyFormAsync: called outside component");
    if (lazyCache.status === "pending") throw lazyCache.promise;
    if (lazyCache.status === "error") throw lazyCache.error;
    return lazyCache.component!(props);
  };

  /** ---------------- Form State ---------------- */
  const values = nixState({ ...initialValues });
  const errors = nixState<Partial<Record<keyof T, string>>>({});
  const touched = nixState<Partial<Record<keyof T, boolean>>>({});
  const isSubmitting = nixState(false);
  const isValid = nixComputed(() => Object.keys(errors.value).length === 0);

  /** Async submit state */
  const data = nixState<D | null>(null);
  const error = nixState<E | null>(null);
  const loading = nixState(false);

  let abortController: AbortController | null = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastInvokeTime = 0;
  let lastResult: D | null = null;
  let lastError: E | null = null;
  let pendingPromise: Promise<D> | null = null;

  /** ---------------- Form Validation ---------------- */

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

    if ((touched.value as Partial<Record<keyof T, boolean>>)[fieldName]) {
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

  /** ---------------- Debounced Async Submit ---------------- */

  async function invokeAsync(
    onSubmit: (values: T, signal: AbortSignal) => Promise<D>
  ): Promise<D | undefined> {
    // Use cache if enabled and lastResult exists
    if (cache && lastResult !== null) {
      data.value = lastResult ?? null;
      error.value = lastError ?? null;
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
      data.value = result ?? null;
      return result;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        lastError = err;
        error.value = err;
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

  /** Cancel pending submit */

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
    cancelLazyLoad();
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
    LazyComponentWrapper,
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
