// src/components/Dice.jsx
import React from "react";
import WebGLDice from "./WebGLDice";

export default function Dice(props) {
  const { rollingNow, forcedFace, disabled, onRoll, size = 128 } = props;

  // 1) If we’re not in the middle of a roll and there's no face to show,
  //    just render the idle PNG:
  if (!rollingNow && forcedFace == null) {
    const DPR = window.devicePixelRatio > 1 ? "512" : "256";
    const src = `/dice/idle-${DPR}.png`;
    const handleClick = () => {
      if (!disabled && !rollingNow) {
        const v = Math.floor(Math.random() * 6) + 1;
        onRoll(v);
      }
    };
    return (
      <img
        src={src}
        alt="dice idle"
        onClick={handleClick}
        style={{
          width: size,
          height: size,
          cursor: disabled ? "default" : "pointer",
        }}
      />
    );
  }

  // 2) Otherwise, render the full 3D dice:
  return <WebGLDice {...props} />;
}
