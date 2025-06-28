// src/components/Dice.jsx
import React from "react";
import WebGLDice from "./WebGLDice";

export default function Dice(props) {
  const { rollingNow, forcedFace, disabled, onRoll, size = 128 } = props;

  // determine which element should be visible
  const showIdle = !rollingNow && forcedFace == null;

  const DPR = window.devicePixelRatio > 1 ? "512" : "256";
  const src = `/dice/idle-${DPR}.png`;

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
      {!showIdle && <WebGLDice {...props} />}
    </>
  );
}
