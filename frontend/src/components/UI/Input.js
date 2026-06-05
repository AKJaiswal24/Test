import React from "react";

const Input = React.forwardRef(function Input(
  {
    label,
    id,
    type = "text",
    value,
    onChange,
    onBlur,
    placeholder,
    error,
    hint,
    disabled = false,
    required = false,
    maxLength,
    min,
    max,
    className = "",
    ...rest
  },
  ref
) {
  const inputId = id || `input-${label?.replace(/\s+/g, "-").toLowerCase()}`;
  const hintId = `${inputId}-hint`;

  return (
    <div className={`input-ui-wrap ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="input-ui-label">
          {label}
          {required && <span className="input-ui-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        min={min}
        max={max}
        className={`input-ui ${error ? "input-ui-error" : ""}`}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? hintId : undefined}
        {...rest}
      />
      {(error || hint) && (
        <p id={hintId} className={`input-ui-helper ${error ? "input-ui-helper-error" : ""}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

export default Input;
