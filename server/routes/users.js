// server/routes/users.js
const express = require("express");
const User = require("../models/User");
const protect = require("../middleware/auth");
const router = express.Router();

router.get("/", protect, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

module.exports = router;
