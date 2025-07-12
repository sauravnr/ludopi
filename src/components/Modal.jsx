// src/components/Modal.jsx
import { useState, useEffect } from "react";
import { IoMdClose } from "react-icons/io"; // pick any icon you like
import "../styles/modal.css";

export function ToggleSwitch({ id, checked, onChange }) {
  return (
    <label className="toggle-switch" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} />
      <span className="slider" />
      <span className="labels" data-on="On" data-off="Off" />
    </label>
  );
}
export default function Modal({
  show,
  title,
  children,
  footer, // array of { label, onClick, variant }
  onClose, // callback to run when user tries to close
  closable = true, // whether the user may close (default=true)
  width = "md", // 'sm' | 'md' | 'lg'
}) {
  const [closing, setClosing] = useState(false);
  // Reset closing state when reopened
  useEffect(() => {
    if (show) setClosing(false);
  }, [show]);

  const sizeClass =
    width === "sm" ? "modal-sm" : width === "lg" ? "modal-lg" : ""; // md → no extra class → default 90%

  // Wrap your real onClose so we can play fade-out first
  const handleClose = () => {
    if (!closable) return;
    setClosing(true);
    setTimeout(() => {
      onClose();
      setClosing(false);
    }, 300); // match CSS 0.3s
  };

  // Don’t render at all if we’re fully closed
  if (!show && !closing) return null;

  return (
    <div
      className={`modal-overlay ${closing ? "closing" : ""}`}
      onClick={closable ? handleClose : undefined}
    >
      <div
        className={`modal-window ${sizeClass} ${closing ? "closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lifted title bar */}
        <div className="modal-title-bar">
          <span className="modal-title">{title}</span>
        </div>

        {/* Close button (only when closable) */}
        {closable && (
          <button className="modal-close-btn" onClick={handleClose}>
            <IoMdClose size={28} />
          </button>
        )}

        {/* Body */}
        <div className="modal-body">{children}</div>

        {/* Footer buttons */}
        {footer && (
          <div className="modal-footer">
            {footer.map((btn, i) => (
              <button
                key={i}
                className={`btn btn-${btn.variant || "primary"}`}
                onClick={btn.onClick}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
