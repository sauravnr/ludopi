import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import "../styles/modal.css";

export default function BetModal({
  show,
  onClose,
  onConfirm,
  options = [],
  error,
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (show) setIndex(0);
  }, [show]);

  const footer = [
    {
      label: "Confirm",
      variant: "primary",
      onClick: () => onConfirm(options[index]?.entry),
    },
    { label: "Cancel", variant: "secondary", onClick: onClose },
  ];

  const increase = () => setIndex((i) => (i + 1) % (options.length || 1));
  const decrease = () =>
    setIndex((i) => (i - 1 + (options.length || 1)) % (options.length || 1));

  const current = options[index] || {};

  return (
    <Modal show={show} title="Bet Amount" onClose={onClose} footer={footer}>
      <div className="flex items-center justify-center gap-4">
        <button onClick={decrease}>
          <img src="/icons/minus.png" alt="decrease" className="w-6 h-6" />
        </button>
        <div className="text-center">
          <p className="text-lg font-bold">Entry {current.entry}</p>
          <p className="text-sm">Win {current.win}</p>
        </div>
        <button onClick={increase}>
          <img src="/icons/add.png" alt="increase" className="w-6 h-6" />
        </button>
      </div>
      {error && <p className="alert alert-error mt-2">{error}</p>}
    </Modal>
  );
}
