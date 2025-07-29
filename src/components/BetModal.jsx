import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import "../styles/modal.css";

export default function BetModal({
  show,
  onClose,
  onConfirm,
  options = [],
  error,
  mode,
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
  const title = mode === "4P" ? "4 Players" : "2 Players";

  return (
    <Modal show={show} title={title} onClose={onClose} footer={footer}>
      <div className="flex flex-col items-center">
        <p className="text-lg font-bold mb-2">Entry</p>
        <div className="flex items-center justify-center">
          <button onClick={decrease} className="w-8 flex-shrink-0">
            <img
              src="/icons/minus.png"
              alt="decrease"
              className="w-6 h-6 mx-auto"
            />
          </button>
          <div className="mx-4 flex items-center justify-center w-20">
            <img src="/icons/coin.png" alt="coin" className="w-4 h-4 mr-1" />
            <span className="text-lg font-semibold">{current.entry}</span>
          </div>
          <button onClick={increase} className="w-8 flex-shrink-0">
            <img
              src="/icons/add.png"
              alt="increase"
              className="w-6 h-6 mx-auto"
            />
          </button>
        </div>
        <div className="flex items-center justify-center mt-2 ml-4">
          <div className="flex items-center mr-1 flex-shrink-0">
            <span className="text-sm mr-1">Win:</span>
            <img
              src="/icons/coinpiles.png"
              alt="coin piles"
              className="w-5 h-5"
            />
          </div>
          <span className="text-sm font-mono w-16 text-left">
            {current.win}
          </span>
        </div>
      </div>
      {error && <p className="alert alert-error mt-2">{error}</p>}
    </Modal>
  );
}
