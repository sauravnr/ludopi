import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import api from "../utils/api";

const slices = [500, 300, 500, 100, 1000, 500, 300, 300, 500, 300];
const SLICE_ANGLE = 360 / slices.length;

export default function WheelModal({ show, onClose, onResult }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let interval;
    const fetchStatus = async () => {
      try {
        const { data } = await api.get("/wheel/status");
        setCooldown(data.remaining);
      } catch (err) {
        console.error("Failed to get wheel status:", err);
      }
    };
    if (show) {
      fetchStatus();
      interval = setInterval(() => {
        setCooldown((prev) => (prev > 1000 ? prev - 1000 : 0));
      }, 1000);
    } else {
      setRotation(0);
      setSpinning(false);
      setCooldown(0);
    }
    return () => clearInterval(interval);
  }, [show]);

  const formatTime = (ms) => {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSpin = async () => {
    if (spinning || cooldown > 0) return;
    try {
      const { data } = await api.post("/wheel/spin");
      const { index, prize, balance, availableAt } = data;
      const spins = 5;
      const stopAngle = index * SLICE_ANGLE + SLICE_ANGLE / 2;
      const totalRotation = spins * 360 + stopAngle;
      setSpinning(true);
      setRotation((prev) => prev - totalRotation);
      setCooldown(availableAt - Date.now());
      setTimeout(() => {
        setSpinning(false);
        onResult(prize, balance, availableAt);
      }, 5000);
    } catch (err) {
      const remaining = err?.response?.data?.remaining;
      if (remaining) setCooldown(remaining);
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

        {cooldown > 0 ? (
          <div className="flex items-center mt-4 bg-slate-800 text-white rounded-full px-4 py-2 shadow">
            <span className="font-bold text-sm">
              Next {formatTime(cooldown)}
            </span>
          </div>
        ) : (
          <button
            onClick={handleSpin}
            disabled={spinning}
            className="btn btn-primary mt-4"
          >
            {spinning ? "Spinning..." : "Spin"}
          </button>
        )}
      </div>
    </Modal>
  );
}
