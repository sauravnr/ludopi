// server/routes/pip.js
const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const Player = require("../models/Player");
const PipTransaction = require("../models/PipTransaction");
const verifyPipDeposit = require("../utils/verifyPipDeposit");
const PROFILE_FIELDS = require("../utils/profileFields");

// POST /api/pip/deposit
router.post("/deposit", protect, async (req, res) => {
  const { txHash } = req.body;
  if (!txHash || typeof txHash !== "string") {
    return res.status(400).json({ message: "Invalid transaction hash" });
  }
  const already = await PipTransaction.findOne({ txHash }).lean();
  if (already) {
    return res.status(400).json({ message: "Transaction already processed" });
  }
  let amount;
  try {
    amount = await verifyPipDeposit(txHash);
  } catch (err) {
    console.error("verifyPipDeposit error:", err);
    return res.status(500).json({ message: "Failed to verify transaction" });
  }
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Transaction not valid" });
  }
  const player = await Player.findOneAndUpdate(
    { userId: req.user._id },
    { $inc: { pipBalance: amount } },
    { new: true }
  )
    .select(PROFILE_FIELDS)
    .lean();
  await PipTransaction.create({
    userId: req.user._id,
    txHash,
    amount,
    type: "deposit",
    description: "PIP deposit",
  });
  res.json({ player, amount });
});

module.exports = router;
