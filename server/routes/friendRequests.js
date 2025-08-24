// server/routes/friendRequests.js
const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const FriendRequest = require("../models/FriendRequest");
const mongoose = require("mongoose");
const Player = require("../models/Player");
const { checkAwards } = require("../utils/awards");
const rateLimit = require("express-rate-limit");
const { body, param, validationResult } = require("express-validator");

// RATE LIMITER: max 5 “send request” calls per user per minute
const sendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each user
  keyGenerator: (req) => req.user._id.toString(),
  message: { message: "Too many friend requests; please wait a minute." },
});

// RATE LIMITER: max 30 "accept/decline/unfriend" calls per user per minute
const actionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  keyGenerator: (req) => req.user._id.toString(),
  message: { message: "Too many friend actions; please wait a minute." },
});

// 1. Send a friend request
// POST /api/friend-requests   { toUserId }
router.post(
  "/",
  protect,
  sendLimiter,
  body("toUserId").isMongoId().withMessage("Invalid target user ID"),
  async (req, res) => {
    // validation errors?
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const from = req.user._id.toString();
    const to = req.body.toUserId;
    if (from === to) {
      return res.status(400).json({ message: "Cannot friend yourself." });
    }

    // avoid duplicates
    const exists = await FriendRequest.findOne({ from, to });
    if (exists) {
      return res.status(400).json({ message: "Request already sent." });
    }

    const fr = await FriendRequest.create({ from, to });
    return res.json({ request: fr });
  }
);

// 2. Cancel a pending request
// DELETE /api/friend-requests/:id
router.delete(
  "/:id",
  protect,
  param("id").isMongoId().withMessage("Invalid request ID"),
  async (req, res) => {
    // validation errors?
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // generic 404 to avoid enumeration
      return res.status(404).json({ message: "Not found." });
    }

    const fr = await FriendRequest.findById(req.params.id);
    if (!fr) {
      return res.status(404).json({ message: "Not found." });
    }
    if (fr.from.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "No permission." });
    }
    if (fr.status !== "pending") {
      return res.status(400).json({ message: "Cannot cancel." });
    }

    await FriendRequest.findByIdAndDelete(req.params.id);
    return res.json({ message: "Request canceled." });
  }
);

// 3. Unfriend (delete any accepted relationship both ways)
// DELETE /api/friend-requests/friends/:otherUserId
router.delete(
  "/friends/:other",
  protect,
  actionLimiter,
  param("other").isMongoId().withMessage("Invalid user ID"),
  async (req, res) => {
    // validation errors?
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const me = req.user._id.toString();
    const them = req.params.other;
    await FriendRequest.deleteMany({
      status: "accepted",
      $or: [
        { from: me, to: them },
        { from: them, to: me },
      ],
    });
    // ── Also remove each other from Player.friends ──
    {
      const [meDoc, otherDoc] = await Promise.all([
        Player.findOne({ userId: me }).select("_id"),
        Player.findOne({ userId: them }).select("_id"),
      ]);
      if (meDoc && otherDoc) {
        await Promise.all([
          Player.updateOne(
            { userId: me },
            { $pull: { friends: otherDoc._id } }
          ),
          Player.updateOne({ userId: them }, { $pull: { friends: meDoc._id } }),
        ]);
      }
    }
    const io = req.app.get("io");
    io.to(me).emit("friend-removed");
    io.to(them).emit("friend-removed");
    return res.json({ message: "Unfriended." });
  }
);

// 4. Get relationship status
// GET /api/friend-requests/status/:otherUserId
router.get(
  "/status/:other",
  protect,
  param("other")
    .custom((v) => mongoose.Types.ObjectId.isValid(v))
    // no error message—treat invalid IDs same as “none”
    .withMessage(""),
  async (req, res) => {
    const other = req.params.other;
    const me = req.user._id.toString();

    // if invalid or same as me, report “none” or “self”
    if (!mongoose.Types.ObjectId.isValid(other)) {
      return res.json({ status: "none" });
    }
    if (me === other) {
      return res.json({ status: "self" });
    }

    // have I sent them a request?
    let fr = await FriendRequest.findOne({ from: me, to: other });
    if (fr) {
      return res.json({
        status: fr.status === "pending" ? "sent" : "friends",
        requestId: fr._id,
      });
    }

    // have they sent me one?
    fr = await FriendRequest.findOne({ from: other, to: me });
    if (fr) {
      return res.json({
        status: fr.status === "pending" ? "received" : "friends",
        requestId: fr._id,
      });
    }

    return res.json({ status: "none" });
  }
);

// GET /api/friend-requests/friends?page=1&limit=15
router.get("/friends", protect, async (req, res) => {
  const me = req.user._id.toString();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(15, parseInt(req.query.limit) || 15);
  const skip = (page - 1) * limit;

  const accepted = await FriendRequest.find({
    status: "accepted",
    $or: [{ from: me }, { to: me }],
  })
    .skip(skip)
    .limit(limit)
    .populate("from", "username avatarUrl")
    .populate("to", "username avatarUrl");

  const friends = accepted.map((fr) => {
    const other = fr.from._id.toString() === me ? fr.to : fr.from;
    return {
      userId: other._id,
      username: other.username,
      avatarUrl: other.avatarUrl,
    };
  });

  return res.json({ friends, page, limit });
});

// GET /api/friend-requests/received?page=1&limit=15
router.get("/received", protect, async (req, res) => {
  const me = req.user._id.toString();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(15, parseInt(req.query.limit) || 15);
  const skip = (page - 1) * limit;

  const incoming = await FriendRequest.find({
    to: me,
    status: "pending",
  })
    .skip(skip)
    .limit(limit)
    .populate("from", "username avatarUrl");

  const requests = incoming.map((fr) => ({
    id: fr._id,
    fromUserId: fr.from._id,
    fromUsername: fr.from.username,
    avatarUrl: fr.from.avatarUrl,
  }));

  return res.json({ requests, page, limit });
});

// POST /api/friend-requests/:id
// body: { accept: true|false }
router.post("/:id", protect, actionLimiter, async (req, res) => {
  const { accept } = req.body;
  const me = req.user._id.toString();
  const fr = await FriendRequest.findById(req.params.id);
  if (!fr) return res.status(404).json({ message: "Request not found." });

  // only the recipient can accept/decline
  if (fr.to.toString() !== me) {
    return res.status(403).json({ message: "Not allowed." });
  }
  // must be pending
  if (fr.status !== "pending") {
    return res.status(400).json({ message: "Already processed." });
  }

  if (accept) {
    // accept: mark accepted
    fr.status = "accepted";
    await fr.save();
    const io = req.app.get("io");
    // ── Add each other to Player.friends ──
    {
      // my Player doc
      const [meDoc, otherDoc] = await Promise.all([
        Player.findOne({ userId: me }).select("_id"),
        Player.findOne({ userId: fr.from }).select("_id"),
      ]);
      if (meDoc && otherDoc) {
        await Promise.all([
          Player.updateOne(
            { userId: me },
            { $addToSet: { friends: otherDoc._id } }
          ),
          Player.updateOne(
            { userId: fr.from },
            { $addToSet: { friends: meDoc._id } }
          ),
        ]);
        await Promise.all([checkAwards(me, io), checkAwards(fr.from, io)]);
      }
    }
    io.to(me).emit("friend-accepted");
    io.to(fr.from.toString()).emit("friend-accepted");
    return res.json({ request: fr });
  } else {
    // decline: delete
    await FriendRequest.findByIdAndDelete(req.params.id);
    return res.json({ message: "Request declined." });
  }
});

module.exports = router;
