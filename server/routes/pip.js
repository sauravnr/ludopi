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

// POST /api/pip/earn - award tokens for tasks or ads
router.post("/earn", protect, async (req, res) => {
  const { amount, description } = req.body;
  const value = parseFloat(amount);
  if (isNaN(value) || value <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }
  const player = await Player.findOneAndUpdate(
    { userId: req.user._id },
    { $inc: { pipBalance: value } },
    { new: true }
  )
    .select(PROFILE_FIELDS)
    .lean();
  await PipTransaction.create({
    userId: req.user._id,
    amount: value,
    type: "earn",
    description: description || "task reward",
  });
  res.json({ player });
});

// POST /api/pip/withdraw - request a withdrawal
router.post("/withdraw", protect, async (req, res) => {
  const { amount } = req.body;
  const value = parseFloat(amount);
  const limit = parseFloat(process.env.PIP_WITHDRAW_MAX || "100");
  if (isNaN(value) || value <= 0 || value > limit) {
    return res.status(400).json({ message: "Invalid amount" });
  }
  const playerDoc = await Player.findOne({ userId: req.user._id }).lean();
  if (!playerDoc.walletAddress) {
    return res.status(400).json({ message: "Wallet address required" });
  }
  if (!playerDoc || playerDoc.pipBalance < value) {
    return res.status(400).json({ message: "Insufficient balance" });
  }
  const player = await Player.findOneAndUpdate(
    { userId: req.user._id, pipBalance: { $gte: value } },
    { $inc: { pipBalance: -value } },
    { new: true }
  )
    .select(PROFILE_FIELDS)
    .lean();
  if (!player) {
    return res.status(400).json({ message: "Insufficient balance" });
  }
  await PipTransaction.create({
    userId: req.user._id,
    amount: value,
    type: "withdraw",
    status: "pending",
    description: "withdraw request",
  });
  res.json({ player });
});

// GET /api/pip/transactions - recent PIP transactions for the user
router.get("/transactions", protect, async (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  const txs = await PipTransaction.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json({ transactions: txs });
});

module.exports = router;
