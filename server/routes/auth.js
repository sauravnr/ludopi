// server/routes/auth.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const protect = require("../middleware/auth");
const User = require("../models/User");
const Player = require("../models/Player");
const { checkAwards } = require("../utils/awards");
const router = express.Router();

// limit PI-login to 5 attempts/IP per minute
const piLoginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts; please wait a minute." },
});

// ─── default avatars ─────────────────────────────────
const defaultAvatars = [
  "/default-avatars/avatar1.png",
  "/default-avatars/avatar2.png",
  "/default-avatars/avatar3.png",
  "/default-avatars/avatar4.png",
];
function randomAvatar() {
  return defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
}

// Fields required by the front-end player profile
const PROFILE_FIELDS = require("../utils/profileFields");

// POST /api/auth/pi-login
router.post("/pi-login", piLoginLimiter, async (req, res) => {
  try {
    const { accessToken } = req.body;

    // 1) Verify with Pi’s /me endpoint
    const piRes = await axios.get("https://api.minepi.com/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const { uid, username: piUsername } = piRes.data.user;

    // 2) Find—or create—a User
    let user = await User.findOne({ piUid: uid });
    if (!user) {
      user = await User.create({
        username: `pi_${piUsername}`,
        piUid: uid,
        avatarUrl: randomAvatar(),
      });
    }

    // 3) Find—or create—the Player
    let player = await Player.findOne({ userId: user._id });
    if (!player) {
      player = await Player.create({
        userId: user._id,
        playerId: uid,
        piUid: uid,
        username: user.username,
        avatarUrl: user.avatarUrl,
      });
    }

    // 4) Update last login without blocking response
    Player.updateOne(
      { userId: user._id },
      { $set: { lastLogin: new Date() } }
    ).catch((err) => console.error("Failed to update lastLogin:", err));

    // grant any overdue awards and fetch profile fields for response
    await checkAwards(user._id, req.app.get("io"));
    // fetch profile fields for response
    const playerProfile = await Player.findOne({ userId: user._id })
      .select(PROFILE_FIELDS)
      .lean();

    // 5) Issue JWT and set cookie
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    return res
      .cookie("authToken", token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        user: {
          id: user._id,
          username: user.username,
          piUid: user.piUid,
          avatarUrl: user.avatarUrl,
        },
        player: playerProfile,
      });
  } catch (err) {
    console.error("Pi login error:", err);
    return res.status(401).json({ message: "Invalid Pi access token" });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // 1) Create User with random avatar
    const user = await User.create({
      username,
      email,
      password,
      avatarUrl: randomAvatar(),
    });

    // 2) Create matching Player
    await Player.create({
      userId: user._id,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });

    await checkAwards(user._id, req.app.get("io"));
    const playerProfile = await Player.findOne({ userId: user._id })
      .select(PROFILE_FIELDS)
      .lean();

    // 3) Issue JWT and set cookie
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    return res
      .cookie("authToken", token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(201)
      .json({
        user: {
          id: user._id,
          username: user.username,
          email,
          avatarUrl: user.avatarUrl,
        },
        player: playerProfile,
      });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // fire-and-forget lastLogin update
    Player.updateOne(
      { userId: user._id },
      { $set: { lastLogin: new Date() } }
    ).catch((err) => console.error("Failed to update lastLogin:", err));
    await checkAwards(user._id, req.app.get("io"));
    const playerProfile = await Player.findOne({ userId: user._id })
      .select(PROFILE_FIELDS)
      .lean();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    return res
      .cookie("authToken", token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
        },
        player: playerProfile,
      });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res
    .clearCookie("authToken", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    })
    .json({ message: "Logged out successfully" });
});

// GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  await checkAwards(req.user._id, req.app.get("io"));
  const player = await Player.findOne({ userId: req.user._id })
    .select(PROFILE_FIELDS)
    .lean();
  res.json({ user: req.user, player });
});

module.exports = router;
