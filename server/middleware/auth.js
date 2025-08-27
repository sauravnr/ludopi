// server/middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { refreshVipStatus } = require("../utils/vip");

async function protect(req, res, next) {
  let token = req.cookies.authToken;
  if (!token) return res.status(401).json({ message: "Not authorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    await refreshVipStatus(req.user._id);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = protect;
