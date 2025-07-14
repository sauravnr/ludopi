// server/routes/admin.js
const express = require("express");
const protect = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const Player = require("../models/Player");
const Message = require("../models/Message");
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

module.exports = router;
