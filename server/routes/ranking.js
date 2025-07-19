const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const Player = require("../models/Player");

const RANK_FIELDS = "playerId trophies trophyUpdatedAt coins country";

async function aggregateTrophyRanks(player) {
  const trophies = player.trophies || 0;
  const country = player.country || "Worldwide";
  const [stats] = await Player.aggregate([
    {
      $facet: {
        worldTotal: [{ $count: "c" }],
        countryTotal: [{ $match: { country } }, { $count: "c" }],
        worldRank: [
          {
            $match: {
              $or: [
                { trophies: { $gt: trophies } },
                { trophies, trophyUpdatedAt: { $lt: player.trophyUpdatedAt } },
                {
                  trophies,
                  trophyUpdatedAt: player.trophyUpdatedAt,
                  playerId: { $lt: player.playerId },
                },
              ],
            },
          },
          { $count: "c" },
        ],
        countryRank: [
          {
            $match: {
              country,
              $or: [
                { trophies: { $gt: trophies } },
                { trophies, trophyUpdatedAt: { $lt: player.trophyUpdatedAt } },
                {
                  trophies,
                  trophyUpdatedAt: player.trophyUpdatedAt,
                  playerId: { $lt: player.playerId },
                },
              ],
            },
          },
          { $count: "c" },
        ],
      },
    },
    {
      $project: {
        worldTotal: { $ifNull: [{ $arrayElemAt: ["$worldTotal.c", 0] }, 0] },
        countryTotal: {
          $ifNull: [{ $arrayElemAt: ["$countryTotal.c", 0] }, 0],
        },
        worldRank: {
          $add: [{ $ifNull: [{ $arrayElemAt: ["$worldRank.c", 0] }, 0] }, 1],
        },
        countryRank: {
          $add: [{ $ifNull: [{ $arrayElemAt: ["$countryRank.c", 0] }, 0] }, 1],
        },
      },
    },
  ]);

  return {
    trophies,
    country,
    worldRank: stats.worldRank,
    worldTotal: stats.worldTotal,
    countryRank: stats.countryRank,
    countryTotal: stats.countryTotal,
  };
}

async function aggregateCoinRanks(player) {
  const coins = player.coins || 0;
  const country = player.country || "Worldwide";
  const [stats] = await Player.aggregate([
    {
      $facet: {
        worldTotal: [{ $count: "c" }],
        countryTotal: [{ $match: { country } }, { $count: "c" }],
        worldRank: [
          {
            $match: {
              $or: [
                { coins: { $gt: coins } },
                { coins, playerId: { $lt: player.playerId } },
              ],
            },
          },
          { $count: "c" },
        ],
        countryRank: [
          {
            $match: {
              country,
              $or: [
                { coins: { $gt: coins } },
                { coins, playerId: { $lt: player.playerId } },
              ],
            },
          },
          { $count: "c" },
        ],
      },
    },
    {
      $project: {
        worldTotal: { $ifNull: [{ $arrayElemAt: ["$worldTotal.c", 0] }, 0] },
        countryTotal: {
          $ifNull: [{ $arrayElemAt: ["$countryTotal.c", 0] }, 0],
        },
        worldRank: {
          $add: [{ $ifNull: [{ $arrayElemAt: ["$worldRank.c", 0] }, 0] }, 1],
        },
        countryRank: {
          $add: [{ $ifNull: [{ $arrayElemAt: ["$countryRank.c", 0] }, 0] }, 1],
        },
      },
    },
  ]);

  return {
    coins,
    country,
    worldRank: stats.worldRank,
    worldTotal: stats.worldTotal,
    countryRank: stats.countryRank,
    countryTotal: stats.countryTotal,
  };
}

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

  const result = await aggregateTrophyRanks(player);

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

  const result = await aggregateCoinRanks(player);

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

    const result = await aggregateCoinRanks(player);

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

    const result = await aggregateTrophyRanks(player);

    rankCache.set(cacheKey, { time: Date.now(), data: result });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
