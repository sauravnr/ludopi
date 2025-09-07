// server/routes/chat.js

const express = require("express");
const { query, param, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Message = require("../models/Message");
const Player = require("../models/Player");
const auth = require("../middleware/auth");
const rateLimit = require("express-rate-limit");
const router = express.Router();

// Protect all chat routes
router.use(auth);

// define a generous GET limiter
const getLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 200, // up to 200 GETs per minute
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply GET rate limiter to all chat routes
router.use(getLimiter);

// Helper: check if two users are friends via Player model
async function ensureFriends(meUserId, otherUserId) {
  // Fetch both Player documents
  const [mePlayer, otherPlayer] = await Promise.all([
    Player.findOne({ userId: meUserId }).select("friends").lean(),
    Player.findOne({ userId: otherUserId }).select("friends").lean(),
  ]);
  if (!mePlayer || !otherPlayer) return false;

  // Confirm each lists the other as a friend
  const meHasOther = mePlayer.friends.some((pid) =>
    pid.equals(otherPlayer._id)
  );
  const otherHasMe = otherPlayer.friends.some((pid) =>
    pid.equals(mePlayer._id)
  );
  return meHasOther && otherHasMe;
}

// 1) List conversations (paginated threads, 10 per page)
router.get(
  "/conversations",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 10);
      const skip = (page - 1) * limit;
      const meUid = new mongoose.Types.ObjectId(req.user.id);

      // A) Get my friends as Player._id[]
      const mePlayer = await Player.findOne({ userId: req.user.id })
        .select("friends")
        .lean();
      const friendPlayerIds = mePlayer?.friends || [];

      // B) Turn those into user IDs
      const friendPlayers = await Player.find({
        _id: { $in: friendPlayerIds },
      })
        .select("userId")
        .lean();
      const friendUserIds = friendPlayers.map(
        (p) => new mongoose.Types.ObjectId(p.userId)
      );

      // C) Aggregate last message per friend-userId
      const convs = await Message.aggregate([
        { $match: { $or: [{ from: meUid }, { to: meUid }] } },
        {
          $addFields: {
            other: { $cond: [{ $eq: ["$from", meUid] }, "$to", "$from"] },
          },
        },
        { $match: { other: { $in: friendUserIds } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$other",
            lastMessage: { $first: "$text" },
            updatedAt: { $first: "$createdAt" },
            lastFrom: { $first: "$from" },
            lastReadAt: { $first: "$readAt" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            userId: "$_id",
            username: "$user.username",
            avatarUrl: "$user.avatarUrl",
            lastMessage: 1,
            updatedAt: 1,
            lastFrom: 1,
            lastReadAt: 1,
          },
        },
        { $sort: { updatedAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);

      res.json({ conversations: convs });
    } catch (err) {
      console.error("Chat /conversations error:", err);
      res.status(500).json({ error: "Failed to load conversations" });
    }
  }
);

// 2) Fetch one convo’s messages (paginated 10 at a time)
router.get(
  "/:userId/messages",
  [
    param("userId").isMongoId(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const meUserId = req.user.id;
      const themUserId = req.params.userId;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 10);
      const skip = (page - 1) * limit;

      // Only friends can chat
      if (!(await ensureFriends(meUserId, themUserId))) {
        return res
          .status(403)
          .json({ error: "You can only message your friends" });
      }

      // Load messages, newest-first
      let msgs = await Message.find({
        $or: [
          { from: meUserId, to: themUserId },
          { from: themUserId, to: meUserId },
        ],
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Reverse to oldest-first
      msgs = msgs.reverse();
      res.json({ messages: msgs });
    } catch (err) {
      console.error("Chat /:userId/messages error:", err);
      res.status(500).json({ error: "Failed to load messages" });
    }
  }
);

// Expose ensureFriends so socket handlers can reuse it
router.ensureFriends = ensureFriends;

module.exports = router;
