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
      "isVip lastWheelSpinAt wheelSpinsUsed"
    );
    const now = Date.now();
    const limit = player.isVip ? 2 : 1;
    if (
      !player.lastWheelSpinAt ||
      now - player.lastWheelSpinAt.getTime() >= WINDOW_MS
    ) {
      return res.json({ remaining: limit, resetAt: null });
    }
    const remaining = Math.max(0, limit - (player.wheelSpinsUsed || 0));
    const resetAt = new Date(player.lastWheelSpinAt.getTime() + WINDOW_MS);
    res.json({ remaining, resetAt });
  } catch (err) {
    console.error("Wheel status failed:", err);
    res.status(500).json({ message: "Failed to get wheel status" });
  }
});

router.post("/spin", protect, async (req, res) => {
  try {
    const player = await Player.findOne({ userId: req.user._id }).select(
      "coins isVip lastWheelSpinAt wheelSpinsUsed"
    );
    const now = Date.now();
    const limit = player.isVip ? 2 : 1;
    if (
      !player.lastWheelSpinAt ||
      now - player.lastWheelSpinAt.getTime() >= WINDOW_MS
    ) {
      player.lastWheelSpinAt = new Date(now);
      player.wheelSpinsUsed = 0;
    }
    const resetAt = new Date(player.lastWheelSpinAt.getTime() + WINDOW_MS);
    if (player.wheelSpinsUsed >= limit) {
      return res.status(429).json({
        message: "No spins remaining",
        remaining: 0,
        resetAt,
      });
    }
    const index = pickIndex();
    const prize = slices[index];
    player.coins += prize;
    player.wheelSpinsUsed += 1;
    await player.save();
    res.json({
      index,
      prize,
      balance: player.coins,
      remaining: limit - player.wheelSpinsUsed,
      resetAt,
    });
  } catch (err) {
    console.error("Wheel spin failed:", err);
    res.status(500).json({ message: "Failed to spin wheel" });
  }
});

module.exports = router;
