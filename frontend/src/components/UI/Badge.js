import React from "react";
import "./Badge.css";

const VARIANT_MAP = {
  green:   "badge-ui-green",
  yellow:  "badge-ui-yellow",
  blue:    "badge-ui-blue",
  red:     "badge-ui-red",
  orange:  "badge-ui-orange",
  purple:  "badge-ui-purple",
  teal:    "badge-ui-teal",
  indigo:  "badge-ui-indigo",
  emerald: "badge-ui-emerald",
  gray:    "badge-ui-gray",
};

function Badge({ children, variant = "gray", className = "", ...rest }) {
  const classes = [
    "badge-ui",
    VARIANT_MAP[variant] || VARIANT_MAP.gray,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} role="status" {...rest}>
      {children}
    </span>
  );
}

export const statusBadgeClass = (status) => {
  const map = {
    "Waiting for Agent": "yellow",
    "Accepted": "blue",
    "Picking Up Product": "orange",
    "In Transit": "purple",
    "Delivered": "green",
    "Pickup Scheduled": "teal",
    "Return In Transit": "indigo",
    "Returned to Lender": "emerald",
    "Completed": "gray",
    "Rejected": "red",
    "Ongoing": "yellow",
    "Cancelled": "red",
    "Delivering": "blue",
    "submitted": "yellow",
    "completed": "green",
    "verified": "blue",
    "paid": "green",
    "pending": "yellow",
    "approved": "green",
  };
  return map[status] || "gray";
};

export const statusLabel = (status) => {
  const map = {
    "Waiting for Agent": "Waiting",
    "Picking Up Product": "Picking Up",
    "Return In Transit": "Returning",
    "Returned to Lender": "Returned",
    "Pickup Scheduled": "Scheduled",
  };
  return map[status] || status;
};

export default Badge;
