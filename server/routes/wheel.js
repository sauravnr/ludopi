const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const Player = require("../models/Player");

const slices = [500, 300, 500, 100, 1000, 500, 300, 300, 500, 300];
const weights = [3, 5, 3, 2, 1, 3, 5, 5, 3, 5]; // lower weight makes prize rarer
const totalWeight = weights.reduce((a, b) => a + b, 0);
const WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

function pickIndex() {
  const r = Math.random() * totalWeight;
  let acc = 0;
  for (let i = 0; i < slices.length; i++) {
    acc += weights[i];
    if (r < acc) return i;
  }
  return slices.length - 1;
}

router.get("/status", protect, async (req, res) => {
  try {
    const player = await Player.findOne({ userId: req.user._id }).select(
      "isVip wheelSpinsUsed wheelSpinResetAt"
    );
    const now = Date.now();
    let save = false;
    if (!player.wheelSpinResetAt || now >= player.wheelSpinResetAt.getTime()) {
      player.wheelSpinsUsed = 0;
      player.wheelSpinResetAt = new Date(now + WINDOW_MS);
      save = true;
    }
    if (save) await player.save();
    const maxSpins = player.isVip ? 2 : 1;
    const remaining = Math.max(0, maxSpins - player.wheelSpinsUsed);
    res.json({ remaining, resetAt: player.wheelSpinResetAt });
  } catch (err) {
    console.error("Wheel status failed:", err);
    res.status(500).json({ message: "Failed to get wheel status" });
  }
});

router.post("/spin", protect, async (req, res) => {
  try {
    const player = await Player.findOne({ userId: req.user._id }).select(
      "isVip wheelSpinsUsed wheelSpinResetAt coins"
    );
    const now = Date.now();
    if (!player.wheelSpinResetAt || now >= player.wheelSpinResetAt.getTime()) {
      player.wheelSpinsUsed = 0;
      player.wheelSpinResetAt = new Date(now + WINDOW_MS);
    }
    const maxSpins = player.isVip ? 2 : 1;
    if (player.wheelSpinsUsed >= maxSpins) {
      return res
        .status(429)
        .json({
          message: "No spins remaining",
          remaining: 0,
          resetAt: player.wheelSpinResetAt,
        });
    }
    const index = pickIndex();
    const prize = slices[index];
    player.coins += prize;
    player.wheelSpinsUsed += 1;
    player.lastWheelSpinAt = new Date(now);
    await player.save();
    const remaining = maxSpins - player.wheelSpinsUsed;
    res.json({
      index,
      prize,
      balance: player.coins,
      remaining,
      resetAt: player.wheelSpinResetAt,
    });
  } catch (err) {
    console.error("Wheel spin failed:", err);
    res.status(500).json({ message: "Failed to spin wheel" });
  }
});

module.exports = router;
