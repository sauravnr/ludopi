const express = require("express");
const protect = require("../middleware/auth");
const Notification = require("../models/Notification");

const router = express.Router();

// GET /api/notifications - recent notifications for current user
router.get("/", protect, async (req, res) => {
  try {
    const limit = Math.min(5, parseInt(req.query.limit, 10) || 5);
    const notifications = await Notification.find({
      $or: [{ userId: req.user._id }, { userId: null }],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ notifications });
  } catch (err) {
    console.error("notifications fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
