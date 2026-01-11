// core/hooks/nixFormAsync.js
import { nixState } from "./nixState.js";
import { nixComputed } from "./nixComputed.js";

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
export function nixFormAsync(initialValues = {}, validationRules = {}, options = {}) {
  // Form state
  const values = nixState({ ...initialValues });
  const errors = nixState({});
  const touched = nixState({});
  const isSubmitting = nixState(false);
  const isValid = nixComputed(() => Object.keys(errors.value).length === 0);

  // Async submit state
  const { delay = 300, leading = false, trailing = true, maxWait, cache = true } = options;
  const data = nixState(null);
  const error = nixState(null);
  const loading = nixState(false);

  let abortController = null;
  let timerId = null;
  let lastInvokeTime = 0;
  let lastResult = null;
  let lastError = null;
  let pendingPromise = null;

  /** ------------------------ Validation ------------------------ */
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

  /** ------------------------ Debounced Async Submit ------------------------ */
  async function invokeAsync(onSubmit) {
    // Use cache if available
    if (cache && lastResult !== null) {
      data.value = lastResult;
      error.value = lastError;
      loading.value = false;
      return lastResult;
    }

    // Cancel any ongoing submit
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
        console.error("[nixFormAsync] submit error:", err);
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

  /** Cancel ongoing submit */
  function cancelSubmit() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    if (timerId) clearTimeout(timerId);
    timerId = null;
  }

  /** Reset form and cancel pending submit */
  function reset() {
    values.value = { ...initialValues };
    errors.value = {};
    touched.value = {};
    isSubmitting.value = false;
    cancelSubmit();
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
