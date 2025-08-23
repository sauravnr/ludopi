const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const Player = require("../models/Player");

const slices = [500, 300, 500, 100, 1000, 500, 300, 300, 500, 300];
const weights = [3, 5, 3, 2, 1, 3, 5, 5, 3, 5]; // lower weight makes prize rarer
const totalWeight = weights.reduce((a, b) => a + b, 0);
const COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 hours

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
      "lastWheelSpinAt"
    );
    const now = Date.now();
    const last = player?.lastWheelSpinAt?.getTime() || 0;
    const availableAt = last + COOLDOWN_MS;
    const remaining = Math.max(0, availableAt - now);
    res.json({ remaining, availableAt });
  } catch (err) {
    console.error("Wheel status failed:", err);
    res.status(500).json({ message: "Failed to get wheel status" });
  }
});

router.post("/spin", protect, async (req, res) => {
  try {
    const player = await Player.findOne({ userId: req.user._id }).select(
      "lastWheelSpinAt"
    );
    const now = Date.now();
    const last = player?.lastWheelSpinAt?.getTime() || 0;
    const availableAt = last + COOLDOWN_MS;
    if (now < availableAt) {
      return res.status(429).json({
        message: "Wheel on cooldown",
        remaining: availableAt - now,
        availableAt,
      });
    }

    const index = pickIndex();
    const prize = slices[index];
    const updatedPlayer = await Player.findOneAndUpdate(
      { userId: req.user._id },
      {
        $inc: { coins: prize },
        $set: { lastWheelSpinAt: new Date(now) },
      },
      { new: true }
    ).select("coins lastWheelSpinAt");
    const nextAvailable = updatedPlayer.lastWheelSpinAt.getTime() + COOLDOWN_MS;
    res.json({
      index,
      prize,
      balance: updatedPlayer.coins,
      availableAt: nextAvailable,
    });
  } catch (err) {
    console.error("Wheel spin failed:", err);
    res.status(500).json({ message: "Failed to spin wheel" });
  }
});

module.exports = router;
