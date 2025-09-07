const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const Player = require("../models/Player");
const CoinTransaction = require("../models/CoinTransaction");
const PROFILE_FIELDS = require("../utils/profileFields");
const { refreshVipStatus } = require("../utils/vip");

const VIP_COST = 100;
const VIP_DURATION_DAYS = 30;

router.get("/status", protect, async (req, res) => {
  try {
    await refreshVipStatus(req.user._id);
    const player = await Player.findOne({ userId: req.user._id })
      .select("isVip vipExpiresAt")
      .lean();
    res.json({ isVip: player?.isVip, vipExpiresAt: player?.vipExpiresAt });
  } catch (err) {
    console.error("Failed to fetch VIP status:", err);
    res.status(500).json({ message: "Failed to fetch VIP status" });
  }
});

router.post("/purchase", protect, async (req, res) => {
  try {
    const vipExpiresAt = new Date(Date.now() + VIP_DURATION_DAYS * 86400000);
    const player = await Player.findOneAndUpdate(
      { userId: req.user._id, coins: { $gte: VIP_COST }, isVip: { $ne: true } },
      {
        $inc: { coins: -VIP_COST },
        $set: { isVip: true, vipExpiresAt },
      },
      { new: true }
    ).select(PROFILE_FIELDS);

    if (!player) {
      return res
        .status(400)
        .json({ message: "Insufficient coins or already VIP" });
    }

    await CoinTransaction.create({
      userId: req.user._id,
      amount: -VIP_COST,
      type: "purchase",
      description: "vip",
    });

    console.log(`VIP purchased by user ${req.user._id}`);
    res.json({ player });
  } catch (err) {
    console.error("VIP purchase failed:", err);
    res.status(500).json({ message: "Failed to purchase VIP" });
  }
});

module.exports = router;
