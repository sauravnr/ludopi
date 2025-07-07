const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const Player = require("../models/Player");

const RANK_FIELDS = "playerId trophies trophyUpdatedAt coins country";

// simple in-memory cache so ranks don't recalc every request
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour
const rankCache = new Map();

// GET /api/ranking/me
router.get("/me", protect, async (req, res) => {
  const player = await Player.findOne({ userId: req.user._id })
    .select(RANK_FIELDS)
    .lean();
  if (!player) return res.status(404).json({ message: "Profile not found" });
  const cacheKey = `me-${player.playerId}`;
  const cached = rankCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return res.json(cached.data);
  }

  const trophies = player.trophies || 0;
  const worldTotal = await Player.countDocuments();
  const worldRank =
    (await Player.countDocuments({
      $or: [
        { trophies: { $gt: trophies } },
        { trophies, trophyUpdatedAt: { $lt: player.trophyUpdatedAt } },
        {
          trophies,
          trophyUpdatedAt: player.trophyUpdatedAt,
          playerId: { $lt: player.playerId },
        },
      ],
    })) + 1;
  const country = player.country || "Worldwide";
  const countryTotal = await Player.countDocuments({ country });
  const countryRank =
    (await Player.countDocuments({
      $or: [
        { country, trophies: { $gt: trophies } },
        { country, trophies, trophyUpdatedAt: { $lt: player.trophyUpdatedAt } },
        {
          country,
          trophies,
          trophyUpdatedAt: player.trophyUpdatedAt,
          playerId: { $lt: player.playerId },
        },
      ],
    })) + 1;

  const result = {
    trophies,
    country,
    worldRank,
    worldTotal,
    countryRank,
    countryTotal,
  };

  rankCache.set(cacheKey, { time: Date.now(), data: result });
  res.json(result);
});

// GET /api/ranking/trophies?page=1&limit=50 - paginated trophy leaderboard
router.get("/trophies", protect, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 50);
  const skip = (page - 1) * limit;
  const country = req.query.country;
  const cacheKey = `trophies-${country || "world"}-${page}-${limit}`;
  const cached = rankCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return res.json(cached.data);
  }

  const query = country ? { country } : {};
  const [players, total] = await Promise.all([
    Player.find(query)
      .sort({ trophies: -1, trophyUpdatedAt: 1, playerId: 1 })
      .skip(skip)
      .limit(limit)
      .select("playerId username avatarUrl trophies country"),
    Player.countDocuments(query),
  ]);

  const result = { players, page, limit, total };
  rankCache.set(cacheKey, { time: Date.now(), data: result });
  res.json(result);
});

// GET /api/ranking/coins?page=1&limit=50 - paginated coin leaderboard
router.get("/coins", protect, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 50);
  const skip = (page - 1) * limit;
  const country = req.query.country;
  const cacheKey = `coins-${country || "world"}-${page}-${limit}`;
  const cached = rankCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return res.json(cached.data);
  }

  const query = country ? { country } : {};
  const [players, total] = await Promise.all([
    Player.find(query)
      // sort by coins first, then by playerId to break ties
      .sort({ coins: -1, playerId: 1 })
      .skip(skip)
      .limit(limit)
      .select("playerId username avatarUrl coins country"),
    Player.countDocuments(query),
  ]);

  const result = { players, page, limit, total };
  rankCache.set(cacheKey, { time: Date.now(), data: result });
  res.json(result);
});

// GET /api/ranking/coins/me - coin ranking for the logged in player
router.get("/coins/me", protect, async (req, res) => {
  const player = await Player.findOne({ userId: req.user._id })
    .select(RANK_FIELDS)
    .lean();
  if (!player) return res.status(404).json({ message: "Profile not found" });
  const cacheKey = `coins-me-${player.playerId}`;
  const cached = rankCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return res.json(cached.data);
  }

  const coins = player.coins || 0;
  const worldTotal = await Player.countDocuments();
  const worldRank =
    (await Player.countDocuments({
      // players with more coins or same coins but smaller playerId rank ahead
      $or: [
        { coins: { $gt: coins } },
        { coins, playerId: { $lt: player.playerId } },
      ],
    })) + 1;
  const country = player.country || "Worldwide";
  const countryTotal = await Player.countDocuments({ country });
  const countryRank =
    (await Player.countDocuments({
      // same tie-breaker within the country scope
      $or: [
        { country, coins: { $gt: coins } },
        { country, coins, playerId: { $lt: player.playerId } },
      ],
    })) + 1;

  const result = {
    coins,
    country,
    worldRank,
    worldTotal,
    countryRank,
    countryTotal,
  };

  rankCache.set(cacheKey, { time: Date.now(), data: result });
  res.json(result);
});

// GET /api/ranking/coins/:userId - coin ranking for any player
router.get("/coins/:userId", protect, async (req, res) => {
  try {
    const player = await Player.findOne({ userId: req.params.userId })
      .select(RANK_FIELDS)
      .lean();
    if (!player) {
      return res.status(404).json({ message: "Profile not found" });
    }
    const cacheKey = `coins-user-${player.playerId}`;
    const cached = rankCache.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return res.json(cached.data);
    }

    const coins = player.coins || 0;
    const worldTotal = await Player.countDocuments();
    const worldRank =
      (await Player.countDocuments({
        // players with more coins or same coins but smaller playerId rank ahead
        $or: [
          { coins: { $gt: coins } },
          { coins, playerId: { $lt: player.playerId } },
        ],
      })) + 1;
    const country = player.country || "Worldwide";
    const countryTotal = await Player.countDocuments({ country });
    const countryRank =
      (await Player.countDocuments({
        // same tie-breaker within the country scope
        $or: [
          { country, coins: { $gt: coins } },
          { country, coins, playerId: { $lt: player.playerId } },
        ],
      })) + 1;
    const result = {
      coins,
      country,
      worldRank,
      worldTotal,
      countryRank,
      countryTotal,
    };

    rankCache.set(cacheKey, { time: Date.now(), data: result });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/ranking/:userId - ranking information for any player
router.get("/:userId", protect, async (req, res) => {
  try {
    const player = await Player.findOne({ userId: req.params.userId })
      .select(RANK_FIELDS)
      .lean();
    if (!player) {
      return res.status(404).json({ message: "Profile not found" });
    }
    const cacheKey = `user-${player.playerId}`;
    const cached = rankCache.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return res.json(cached.data);
    }

    const trophies = player.trophies || 0;
    const worldTotal = await Player.countDocuments();
    const worldRank =
      (await Player.countDocuments({
        $or: [
          { trophies: { $gt: trophies } },
          { trophies, trophyUpdatedAt: { $lt: player.trophyUpdatedAt } },
          {
            trophies,
            trophyUpdatedAt: player.trophyUpdatedAt,
            playerId: { $lt: player.playerId },
          },
        ],
      })) + 1;
    const country = player.country || "Worldwide";
    const countryTotal = await Player.countDocuments({ country });
    const countryRank =
      (await Player.countDocuments({
        $or: [
          { country, trophies: { $gt: trophies } },
          {
            country,
            trophies,
            trophyUpdatedAt: { $lt: player.trophyUpdatedAt },
          },
          {
            country,
            trophies,
            trophyUpdatedAt: player.trophyUpdatedAt,
            playerId: { $lt: player.playerId },
          },
        ],
      })) + 1;
    const result = {
      trophies,
      country,
      worldRank,
      worldTotal,
      countryRank,
      countryTotal,
    };

    rankCache.set(cacheKey, { time: Date.now(), data: result });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
