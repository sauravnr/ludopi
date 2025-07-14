const Player = require("../models/Player");

function requireRole(role) {
  return async function (req, res, next) {
    try {
      const player = await Player.findOne({ userId: req.user._id })
        .select("role")
        .lean();
      if (!player || player.role !== role) {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    } catch (err) {
      console.error("requireRole error:", err);
      res.status(500).json({ message: "Server error" });
    }
  };
}

module.exports = requireRole;
