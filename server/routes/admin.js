// server/routes/admin.js
const express = require("express");
const protect = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const User = require("../models/User");
const Player = require("../models/Player");
const Message = require("../models/Message");
const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(requireRole("admin"));

// GET /api/admin/users
router.get("/users", async (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  const users = await User.find().select("-password").limit(limit).lean();
  res.json({ users });
});

// GET /api/admin/player/:userId
router.get("/player/:userId", async (req, res) => {
  const player = await Player.findOne({ userId: req.params.userId }).lean();
  if (!player) return res.status(404).json({ message: "Player not found" });
  res.json({ player });
});

// GET /api/admin/messages
router.get("/messages", async (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  const messages = await Message.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("from to", "username")
    .lean();
  res.json({ messages });
});

module.exports = router;
