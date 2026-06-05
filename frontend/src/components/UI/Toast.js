import React from "react";
import "./ToastContainer.css";

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = React.useState([]);

  const addToast = React.useCallback((message, variant = "success") => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const ToastContainer = () => (
    <div className="toast-ui-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-ui toast-ui-${t.variant}`} role="status">
          <span className="toast-ui-icon" aria-hidden="true">
            {t.variant === "success" ? "✅" : t.variant === "error" ? "❌" : "ℹ️"}
          </span>
          <span className="toast-ui-msg">{t.message}</span>
          <button
            className="toast-ui-dismiss"
            onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
            aria-label={`Dismiss: ${t.message}`}
            type="button"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );

  return { addToast, ToastContainer };
}

export default useToast;
