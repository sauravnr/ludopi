import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import "../styles/modal.css";

export default function BetModal({
  show,
  onClose,
  onConfirm,
  minBet = 10,
  maxBet = 1000,
  error,
}) {
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (show) setAmount("");
  }, [show]);

  const footer = [
    { label: "Confirm", variant: "primary", onClick: () => onConfirm(amount) },
    { label: "Cancel", variant: "secondary", onClick: onClose },
  ];

  return (
    <Modal show={show} title="Bet Amount" onClose={onClose} footer={footer}>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={`Enter bet (${minBet}-${maxBet})`}
      />
      {error && (
        <p className="text-red-500 text-center text-sm mt-2">{error}</p>
      )}
    </Modal>
  );
}
