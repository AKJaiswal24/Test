import React from "react";
import "./Modal.css";

function Modal({ isOpen, onClose, title, icon, children, maxWidth = "520px" }) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-ui-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-ui-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-ui-title"
        style={{ maxWidth }}
      >
        {(title || icon) && (
          <div className="modal-ui-header">
            <span className="modal-ui-icon" aria-hidden="true">{icon}</span>
            {title && <h3 id="modal-ui-title" className="modal-ui-title">{title}</h3>}
            <button
              className="modal-ui-close"
              onClick={onClose}
              aria-label="Close dialog"
              type="button"
            >
              &times;
            </button>
          </div>
        )}
        <div className="modal-ui-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
