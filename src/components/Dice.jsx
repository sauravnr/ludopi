// src/components/Dice.jsx
import React, { useEffect, useRef } from "react";
import WebGLDice from "./WebGLDice";

let audioCtx;

const ensureAudio = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

const playTick = (progress = 0) => {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  const startFreq = 720 - 420 * progress;
  const endFreq = 140;
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.04);

  const startGain = 0.055 - 0.03 * progress;
  gain.gain.setValueAtTime(startGain, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
};

const startRollSound = (durationMs = 700) => {
  const ctx = ensureAudio();
  if (!ctx) return null;

  let stopped = false;
  let timeoutId = null;
  const start = performance.now();
  const minInterval = 45;
  const maxInterval = 140;

  const schedule = () => {
    if (stopped) return;
    const now = performance.now();
    const progress = Math.min(1, (now - start) / durationMs);
    playTick(progress);
    if (progress >= 1) return;
    const interval =
      minInterval + (maxInterval - minInterval) * progress;
    timeoutId = setTimeout(schedule, interval);
  };

  schedule();

  return {
    stop: () => {
      stopped = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
};

export default function Dice(props) {
  const {
    rollingNow,
    forcedFace,
    disabled,
    onRoll,
    size = 128,
    design = "default",
    soundOn = true,
    rollDurationMs = 700,
  } = props;

  // determine which element should be visible
  const showIdle = !rollingNow && forcedFace == null;

  const wasRolling = useRef(false);
  const soundRef = useRef(null);
  useEffect(() => {
    if (!soundOn) {
      if (wasRolling.current) {
        if (soundRef.current) soundRef.current.stop();
        wasRolling.current = false;
        soundRef.current = null;
      }
      return;
    }
    if (rollingNow && !wasRolling.current) {
      soundRef.current = startRollSound(rollDurationMs);
      wasRolling.current = true;
    } else if (!rollingNow && wasRolling.current) {
      if (soundRef.current) soundRef.current.stop();
      wasRolling.current = false;
      soundRef.current = null;
    }
    return () => {
      if (wasRolling.current) {
        if (soundRef.current) soundRef.current.stop();
        wasRolling.current = false;
        soundRef.current = null;
      }
    };
  }, [rollingNow, soundOn, rollDurationMs]);

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
