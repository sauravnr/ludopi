const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const Player = require("../models/Player");

const slices = [500, 300, 500, 100, 1000, 500, 300, 300, 500, 300];
const weights = [3, 5, 3, 2, 1, 3, 5, 5, 3, 5]; // lower weight makes prize rarer
const totalWeight = weights.reduce((a, b) => a + b, 0);

function pickIndex() {
  const r = Math.random() * totalWeight;
  let acc = 0;
  for (let i = 0; i < slices.length; i++) {
    acc += weights[i];
    if (r < acc) return i;
  }
  return slices.length - 1;
}

router.post("/spin", protect, async (req, res) => {
  try {
    const index = pickIndex();
    const prize = slices[index];
    const player = await Player.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { coins: prize } },
      { new: true }
    ).select("coins");
    res.json({ index, prize, balance: player.coins });
  } catch (err) {
    console.error("Wheel spin failed:", err);
    res.status(500).json({ message: "Failed to spin wheel" });
  }
});

module.exports = router;
