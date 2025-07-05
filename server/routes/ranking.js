const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const Player = require("../models/Player");

// GET /api/ranking/me
router.get("/me", protect, async (req, res) => {
  const player = await Player.findOne({ userId: req.user._id });
  if (!player) return res.status(404).json({ message: "Profile not found" });
  const trophies = player.trophies || 0;
  const worldTotal = await Player.countDocuments();
  const worldRank =
    (await Player.countDocuments({ trophies: { $gt: trophies } })) + 1;
  const country = player.country || "Worldwide";
  const countryTotal = await Player.countDocuments({ country });
  const countryRank =
    (await Player.countDocuments({ country, trophies: { $gt: trophies } })) + 1;
  res.json({
    trophies,
    country,
    worldRank,
    worldTotal,
    countryRank,
    countryTotal,
  });
});

// GET /api/ranking/:userId - ranking information for any player
router.get("/:userId", protect, async (req, res) => {
  try {
    const player = await Player.findOne({ userId: req.params.userId });
    if (!player) {
      return res.status(404).json({ message: "Profile not found" });
    }
    const trophies = player.trophies || 0;
    const worldTotal = await Player.countDocuments();
    const worldRank =
      (await Player.countDocuments({ trophies: { $gt: trophies } })) + 1;
    const country = player.country || "Worldwide";
    const countryTotal = await Player.countDocuments({ country });
    const countryRank =
      (await Player.countDocuments({ country, trophies: { $gt: trophies } })) +
      1;
    res.json({
      trophies,
      country,
      worldRank,
      worldTotal,
      countryRank,
      countryTotal,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
