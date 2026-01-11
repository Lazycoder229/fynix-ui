// core/hooks/nixForm.js - Form handling utilities with memory-safe async support
import { nixState } from "./nixState.js";
import { nixComputed } from "./nixComputed.js";

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
export function nixForm(initialValues = {}, validationRules = {}) {
  const values = nixState({ ...initialValues });
  const errors = nixState({});
  const touched = nixState({});
  const isSubmitting = nixState(false);

  const isValid = nixComputed(() => Object.keys(errors.value).length === 0);

  let abortController = null;

  function validate(fieldName, value) {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    if (rules.required && !value) {
      return rules.message || `${fieldName} is required`;
    }
    if (rules.minLength && value.length < rules.minLength) {
      return rules.message || `${fieldName} must be at least ${rules.minLength} characters`;
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return rules.message || `${fieldName} must be at most ${rules.maxLength} characters`;
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.message || `${fieldName} is invalid`;
    }
    if (rules.custom && !rules.custom(value, values.value)) {
      return rules.message || `${fieldName} is invalid`;
    }
    return null;
  }

  function handleChange(fieldName, value) {
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

  function handleBlur(fieldName) {
    touched.value = { ...touched.value, [fieldName]: true };
    const error = validate(fieldName, values.value[fieldName]);
    if (error) {
      errors.value = { ...errors.value, [fieldName]: error };
    }
  }

  function validateAll() {
    const newErrors = {};
    Object.keys(validationRules).forEach((fieldName) => {
      const error = validate(fieldName, values.value[fieldName]);
      if (error) newErrors[fieldName] = error;
    });
    errors.value = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  /**
   * Submits the form safely with optional async support.
   * Cancels previous submission if running.
   *
   * @param {(values: Object, signal: AbortSignal) => Promise<void>} onSubmit - Async submit callback.
   */
  async function handleSubmit(onSubmit) {
    // Mark all fields as touched
    const allTouched = Object.keys(validationRules).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    touched.value = allTouched;

    if (!validateAll()) return;

    // Cancel any ongoing submit
    if (abortController) abortController.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    isSubmitting.value = true;
    try {
      await onSubmit(values.value, signal);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("[nixForm] Submission error:", err);
      }
    } finally {
      if (!signal.aborted) isSubmitting.value = false;
    }
  }

  /**
   * Cancels any ongoing async submission.
   */
  function cancelSubmit() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  function reset() {
    values.value = { ...initialValues };
    errors.value = {};
    touched.value = {};
    isSubmitting.value = false;
    cancelSubmit();
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
    handleChange,
    handleBlur,
    handleSubmit,
    cancelSubmit,
    reset,
    getFieldProps,
  };
}
