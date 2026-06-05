import React from "react";
import "./Button.css";

const VARIANT_MAP = {
  primary:   "btn-ui-primary",
  secondary: "btn-ui-secondary",
  success:   "btn-ui-success",
  danger:    "btn-ui-danger",
  outline:   "btn-ui-outline",
  ghost:     "btn-ui-ghost",
};

const SIZE_MAP = {
  sm: "btn-ui-sm",
  md: "btn-ui-md",
  lg: "btn-ui-lg",
};

function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  type = "button",
  onClick,
  className = "",
  ...rest
}) {
  const classes = [
    "btn-ui",
    VARIANT_MAP[variant] || VARIANT_MAP.primary,
    SIZE_MAP[size] || SIZE_MAP.md,
    disabled || loading ? "btn-ui-disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="btn-ui-spinner" aria-hidden="true" />}
      <span className={loading ? "btn-ui-text-loading" : ""}>{children}</span>
    </button>
  );
}

export default Button;
