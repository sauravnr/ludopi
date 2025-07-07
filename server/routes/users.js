// server/routes/users.js
const express = require("express");
const User = require("../models/User");
const protect = require("../middleware/auth");
const router = express.Router();

// GET /api/users?page=1&limit=20 - paginated list of users
router.get("/", protect, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find().select("-password").skip(skip).limit(limit).lean(),
    User.countDocuments(),
  ]);
  res.json({ users, page, limit, total });
});

module.exports = router;
