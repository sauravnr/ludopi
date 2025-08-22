import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import api from "../utils/api";

const slices = [500, 300, 500, 100, 1000, 500, 300, 300, 500, 300];
const SLICE_ANGLE = 360 / slices.length;

export default function WheelModal({ show, onClose, onResult }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!show) {
      setRotation(0);
      setSpinning(false);
    }
  }, [show]);

  const handleSpin = async () => {
    if (spinning) return;
    try {
      const { data } = await api.post("/wheel/spin");
      const { index, prize, balance } = data;
      const spins = 5;
      const stopAngle = index * SLICE_ANGLE + SLICE_ANGLE / 2;
      const totalRotation = spins * 360 + stopAngle;
      setSpinning(true);
      setRotation((prev) => prev - totalRotation);
      setTimeout(() => {
        setSpinning(false);
        onResult(prize, balance);
      }, 5000);
    } catch (err) {
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

        <button
          onClick={handleSpin}
          disabled={spinning}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {spinning ? "Spinning…" : "Spin"}
        </button>
      </div>
    </Modal>
  );
}
