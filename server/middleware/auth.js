// server/middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
  let token = req.cookies.authToken;
  if (!token) return res.status(401).json({ message: "Not authorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = protect;
