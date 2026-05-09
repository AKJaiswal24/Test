import React from "react";
import { Navigate } from "react-router-dom";

function LenderRoute({ children }) {
  // Get user from localStorage to check isLender flag
  const user = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const isLender = user?.isLender === true;

  // 🔒 BLOCK NON-LENDER
  if (!isLender) {
    return <Navigate to="/become-lender" />;
  }

  return children;
}

export default LenderRoute;