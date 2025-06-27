// src/components/ContentModal.jsx
import React from "react";
import "../styles/modal.css"; // brings in .modal-window, .modal-title-bar, .modal-body

export default function ContentModal({
  title,
  children,
  width = "md", // "sm" | "md" | "lg"
}) {
  // choose your size class from modal.css
  const sizeClass =
    width === "sm" ? "modal-sm" : width === "lg" ? "modal-lg" : "";

  return (
    // small vertical padding + center horizontally
    <div className="flex justify-center items-start py-8">
      <div className={`modal-window ${sizeClass}`}>
        {/* lifted header — already positioned relative to .modal-window */}
        <div className="modal-title-bar">
          <span className="modal-title">{title}</span>
        </div>

        {/* body area — you can override padding here if 2rem is too much */}
        <div className="modal-body" style={{ padding: "1rem" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
