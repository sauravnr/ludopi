const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const Player = require("../models/Player");
const CoinTransaction = require("../models/CoinTransaction");
const mongoose = require("mongoose");
const PROFILE_FIELDS = require("../utils/profileFields");

const VIP_COST = 100;
const VIP_DURATION_DAYS = 30;

router.post("/purchase", protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const vipExpiresAt = new Date(Date.now() + VIP_DURATION_DAYS * 86400000);
    const player = await Player.findOneAndUpdate(
      { userId: req.user._id, coins: { $gte: VIP_COST }, isVip: { $ne: true } },
      {
        $inc: { coins: -VIP_COST },
        $set: { isVip: true, vipExpiresAt },
      },
      { new: true, session }
    ).select(PROFILE_FIELDS);

    if (!player) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Insufficient coins or already VIP" });
    }

    await CoinTransaction.create(
      [
        {
          userId: req.user._id,
          amount: -VIP_COST,
          type: "purchase",
          description: "vip",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    console.log(`VIP purchased by user ${req.user._id}`);
    res.json({ player });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("VIP purchase failed:", err);
    res.status(500).json({ message: "Failed to purchase VIP" });
  }
});

module.exports = router;
