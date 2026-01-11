// core/hooks/nixLazyFormAsync.js
import { nixState } from "./nixState.js";
import { nixComputed } from "./nixComputed.js";
import { activeContext } from "../context/context.js";

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
export function nixLazyFormAsync(
  importFn,
  formOptions = {},
  submitOptions = {},
  lazyOptions = {}
) {
  const { initialValues = {}, validationRules = {} } = formOptions;
  const { retry = 0 } = lazyOptions;
  const { delay = 300, leading = false, trailing = true, maxWait, cache = true } =
    submitOptions;

  /** ---------------- Lazy-load Component ---------------- */
  const lazyCache = {
    status: "pending",
    component: null,
    error: null,
    promise: null,
    retriesLeft: retry,
  };

  let lazyAbortController = new AbortController();
  let lazyCanceled = false;

  const loadLazy = () => {
    lazyCache.promise = importFn()
      .then((module) => {
        if (!lazyCanceled) {
          lazyCache.status = "success";
          lazyCache.component = module.default || module;
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
      });

    return lazyCache.promise;
  };

  loadLazy();

  const cancelLazyLoad = () => {
    lazyCanceled = true;
    lazyAbortController.abort();
    lazyAbortController = null;
  };

  const LazyComponentWrapper = (props) => {
    const ctx = activeContext;
    if (!ctx) throw new Error("nixLazyFormAsync: called outside component");

    if (lazyCache.status === "pending") throw lazyCache.promise;
    if (lazyCache.status === "error") throw lazyCache.error;

    return lazyCache.component(props);
  };

  /** ---------------- Form State ---------------- */
  const values = nixState({ ...initialValues });
  const errors = nixState({});
  const touched = nixState({});
  const isSubmitting = nixState(false);
  const isValid = nixComputed(() => Object.keys(errors.value).length === 0);

  /** Async submit state */
  const data = nixState(null);
  const error = nixState(null);
  const loading = nixState(false);

  let abortController = null;
  let timerId = null;
  let lastInvokeTime = 0;
  let lastResult = null;
  let lastError = null;
  let pendingPromise = null;

  /** ---------------- Form Validation ---------------- */
  function validate(fieldName, value) {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    if (rules.required && !value) return rules.message || `${fieldName} is required`;
    if (rules.minLength && value.length < rules.minLength)
      return rules.message || `${fieldName} must be at least ${rules.minLength} characters`;
    if (rules.maxLength && value.length > rules.maxLength)
      return rules.message || `${fieldName} must be at most ${rules.maxLength} characters`;
    if (rules.pattern && !rules.pattern.test(value))
      return rules.message || `${fieldName} is invalid`;
    if (rules.custom && !rules.custom(value, values.value))
      return rules.message || `${fieldName} is invalid`;

    return null;
  }

  function handleChange(fieldName, value) {
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

  function handleBlur(fieldName) {
    touched.value = { ...touched.value, [fieldName]: true };
    const err = validate(fieldName, values.value[fieldName]);
    if (err) errors.value = { ...errors.value, [fieldName]: err };
  }

  function validateAll() {
    const newErrors = {};
    Object.keys(validationRules).forEach((fieldName) => {
      const err = validate(fieldName, values.value[fieldName]);
      if (err) newErrors[fieldName] = err;
    });
    errors.value = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  /** ---------------- Debounced Async Submit ---------------- */
  async function invokeAsync(onSubmit) {
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
    } catch (err) {
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

  function handleSubmit(onSubmit) {
    if (!validateAll()) return;

    const now = Date.now();
    const timeSinceLastInvoke = now - lastInvokeTime;
    const remainingTime = delay - timeSinceLastInvoke;
    const shouldInvokeLeading = leading && !timerId;

    if (maxWait !== undefined && timeSinceLastInvoke >= maxWait) {
      if (timerId) clearTimeout(timerId);
      timerId = null;
      return invokeAsync(onSubmit);
    }

    if (timerId) clearTimeout(timerId);

    if (shouldInvokeLeading) return invokeAsync(onSubmit);

    if (trailing) {
      timerId = setTimeout(() => {
        timerId = null;
        invokeAsync(onSubmit);
      }, remainingTime > 0 ? remainingTime : delay);
    }
  }

  /** Cancel pending submit */
  function cancelSubmit() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    if (timerId) clearTimeout(timerId);
    timerId = null;
  }

  /** Reset form and cancel pending submit and lazy load */
  function reset() {
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

  function getFieldProps(fieldName) {
    return {
      value: values.value[fieldName] || "",
      "r-input": (e) => handleChange(fieldName, e.target.value),
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
