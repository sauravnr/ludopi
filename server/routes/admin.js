// server/routes/admin.js
const express = require("express");
const protect = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const Player = require("../models/Player");
const Message = require("../models/Message");
const CoinTransaction = require("../models/CoinTransaction");
const rooms = require("../roomStore");
const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(requireRole("admin"));
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many admin requests" },
});
router.use(adminLimiter);

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const users = await User.find().select("-password").limit(limit).lean();
    res.json({ users });
  } catch (err) {
    console.error("admin users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/player/:userId
router.get("/player/:userId", async (req, res) => {
  try {
    if (!req.params.userId || !req.params.userId.match(/^[a-fA-F0-9]{24}$/)) {
      return res.status(400).json({ message: "Invalid userId" });
    }
    const player = await Player.findOne({ userId: req.params.userId }).lean();
    if (!player) return res.status(404).json({ message: "Player not found" });
    res.json({ player });
  } catch (err) {
    console.error("admin player error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/messages
router.get("/messages", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const messages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("from to", "username")
      .lean();
    res.json({ messages });
  } catch (err) {
    console.error("admin messages error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/rooms - list active rooms
router.get("/rooms", (req, res) => {
  try {
    const list = Object.entries(rooms).map(([code, r]) => ({
      code,
      mode: r.mode,
      bet: r.bet,
      players: r.players.length,
      capacity: r.capacity,
      started: r.started,
      createdAt: r.createdAt,
      lastActive: r.lastActive,
    }));
    res.json({ rooms: list });
  } catch (err) {
    console.error("admin rooms error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/admin/player/:userId/ban
router.patch("/player/:userId/ban", async (req, res) => {
  try {
    const { reason, expiresAt } = req.body;
    const update = {
      isBanned: true,
      banReason: reason || "",
      banExpiresAt: expiresAt || null,
    };
    const player = await Player.findOneAndUpdate(
      { userId: req.params.userId },
      update,
      { new: true }
    ).lean();
    if (!player) return res.status(404).json({ message: "Player not found" });
    res.json({ player });
  } catch (err) {
    console.error("admin ban error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/admin/player/:userId/unban
router.patch("/player/:userId/unban", async (req, res) => {
  try {
    const player = await Player.findOneAndUpdate(
      { userId: req.params.userId },
      { isBanned: false, banReason: null, banExpiresAt: null },
      { new: true }
    ).lean();
    if (!player) return res.status(404).json({ message: "Player not found" });
    res.json({ player });
  } catch (err) {
    console.error("admin unban error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/transactions/:userId - coin transactions for a player
router.get("/transactions/:userId", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const txs = await CoinTransaction.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ transactions: txs });
  } catch (err) {
    console.error("admin transactions error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
