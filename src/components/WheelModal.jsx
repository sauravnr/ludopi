import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import api from "../utils/api";

const slices = [500, 300, 500, 100, 1000, 500, 300, 300, 500, 300];
const SLICE_ANGLE = 360 / slices.length;

export default function WheelModal({ show, onClose, onResult }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [resetAt, setResetAt] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await api.get("/wheel/status");
        setRemaining(data.remaining);
        setResetAt(data.resetAt);
      } catch (err) {
        console.error("Failed to get wheel status:", err);
      }
    };
    if (show) {
      fetchStatus();
    } else {
      setRotation(0);
      setSpinning(false);
    }
  }, [show]);

  const handleSpin = async () => {
    if (spinning || remaining <= 0) return;
    try {
      const { data } = await api.post("/wheel/spin");
      const { index, prize, balance, remaining: rem, resetAt: reset } = data;
      const spins = 5;
      const stopAngle = index * SLICE_ANGLE + SLICE_ANGLE / 2;
      const totalRotation = spins * 360 + stopAngle;
      setSpinning(true);
      setRotation((prev) => prev - totalRotation);
      setRemaining(rem);
      setResetAt(reset);
      setTimeout(() => {
        setSpinning(false);
        onResult(prize, balance, rem);
      }, 5000);
    } catch (err) {
      const rem = err?.response?.data?.remaining;
      const reset = err?.response?.data?.resetAt;
      if (typeof rem === "number") setRemaining(rem);
      if (reset) setResetAt(reset);
      console.error("Spin failed:", err);
    }
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title={null}
      footer={null}
      closable={!spinning}
    >
      <div className="flex flex-col items-center">
        {/* OUTER SIZE WRAPPER (use aspect-square so it’s always a perfect circle) */}
        <div className="relative w-[80vw] max-w-[320px] aspect-square">
          {/* OUTER FRAME */}
          <img
            src="/icons/outerframe.png"
            alt="wheel frame"
            className="absolute inset-0 w-full h-full z-20 pointer-events-none select-none"
            draggable="false"
          />

          {/* INNER WHEEL — now 65% */}
          <img
            src="/icons/innerwheel.png"
            alt="wheel"
            className="absolute z-10 top-1/2 left-1/2 select-none"
            style={{
              width: "70%",
              height: "70%",
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              transition: spinning
                ? "transform 5s cubic-bezier(0.33,1,0.68,1)"
                : "none",
              willChange: "transform",
              backfaceVisibility: "hidden",
            }}
            draggable="false"
          />
        </div>

        {remaining <= 0 ? (
          <div className="mt-4 text-sm">
            No spins remaining. Next reset at{" "}
            {resetAt ? new Date(resetAt).toLocaleTimeString() : "later"}
          </div>
        ) : (
          <button
            onClick={handleSpin}
            disabled={spinning}
            className="btn btn-primary mt-4"
          >
            {spinning ? "Spinning..." : `Spin (${remaining} left)`}
          </button>
        )}
      </div>
    </Modal>
  );
}
