// src/components/Dice.jsx
import React from "react";
import WebGLDice from "./WebGLDice";

export default function Dice(props) {
  const {
    rollingNow,
    forcedFace,
    disabled,
    onRoll,
    size = 128,
    design = "default",
  } = props;

  // determine which element should be visible
  const showIdle = !rollingNow && forcedFace == null;

  const DPR = window.devicePixelRatio > 1 ? "512" : "256";
  const base = design === "default" ? "/dice" : `/dice/${design}`;
  const src = `${base}/idle-${DPR}.png`;

  const handleClick = () => {
    if (!disabled && !rollingNow) {
      onRoll();
    }
  };

  return (
    <>
      <img
        src={src}
        alt="dice idle"
        onClick={handleClick}
        style={{
          width: size,
          height: size,
          cursor: disabled ? "default" : "pointer",
          display: showIdle ? "block" : "none",
        }}
      />
      {!showIdle && <WebGLDice {...props} design={design} />}
    </>
  );
}
