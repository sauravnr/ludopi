import React from "react";

export default function Alert({ type = "info", children, onClose }) {
  const base = "alert";
  const typeClass = type === "error" ? "alert-error" : "";

  return (
    <div className={`${base} ${typeClass}`.trim()}>
      <span>{children}</span>
      {onClose && (
        <button onClick={onClose} className="ml-2 font-bold">
          ✕
        </button>
      )}
    </div>
  );
}
