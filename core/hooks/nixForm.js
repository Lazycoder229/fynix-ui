// core/hooks/nixForm.js - Form handling utilities
import { nixState } from "./nixState.js";
import { nixComputed } from "./nixComputed.js";

export function nixForm(initialValues = {}, validationRules = {}) {
  const values = nixState({ ...initialValues });
  const errors = nixState({});
  const touched = nixState({});
  const isSubmitting = nixState(false);

  const isValid = nixComputed(() => {
    return Object.keys(errors.value).length === 0;
  });

  function validate(fieldName, value) {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    if (rules.required && !value) {
      return rules.message || `${fieldName} is required`;
    }

    if (rules.minLength && value.length < rules.minLength) {
      return (
        rules.message ||
        `${fieldName} must be at least ${rules.minLength} characters`
      );
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return (
        rules.message ||
        `${fieldName} must be at most ${rules.maxLength} characters`
      );
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
      if (error) {
        newErrors[fieldName] = error;
      }
    });
    errors.value = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(onSubmit) {
    const allTouched = {};
    Object.keys(validationRules).forEach((key) => {
      allTouched[key] = true;
    });
    touched.value = allTouched;

    if (!validateAll()) {
      return;
    }

    isSubmitting.value = true;
    try {
      await onSubmit(values.value);
    } finally {
      isSubmitting.value = false;
    }
  }

  function reset() {
    values.value = { ...initialValues };
    errors.value = {};
    touched.value = {};
    isSubmitting.value = false;
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
    reset,
    getFieldProps,
  };
}
