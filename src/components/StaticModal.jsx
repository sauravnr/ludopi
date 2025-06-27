// src/components/StaticModal.jsx
import React from "react";
import "../styles/modal.css";

export default function StaticModal({
  title,
  children,
  width = "md", // 'sm' | 'md' | 'lg'
}) {
  const sizeClass =
    width === "sm" ? "modal-sm" : width === "lg" ? "modal-lg" : "";

  return (
    <div className="modal-overlay">
      <div className={`modal-window ${sizeClass}`}>
        <div className="modal-title-bar">
          <span className="modal-title">{title}</span>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
