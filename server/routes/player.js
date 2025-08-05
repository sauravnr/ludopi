// server/routes/player.js
const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const Player = require("../models/Player");
const CoinTransaction = require("../models/CoinTransaction");
const DICE_SKINS = require("../utils/diceSkins");
const FRAME_SKINS = require("../utils/frameSkins");
const TOKEN_SKINS = require("../utils/tokenSkins");
const MAX_BIO_LEN = 30;

// Fields needed by the front-end profile views
const PROFILE_FIELDS = require("../utils/profileFields");
const { checkAwards } = require("../utils/awards");

router.get("/me", protect, async (req, res) => {
  await checkAwards(req.user._id);
  const player = await Player.findOne({ userId: req.user._id })
    .select(PROFILE_FIELDS)
    .lean();
  if (!player) return res.status(404).json({ message: "Profile not found" });
  res.json({ player });
});

// fetch another user's profile by their userId
router.get("/:userId", protect, async (req, res) => {
  try {
    await checkAwards(req.params.userId);
    const player = await Player.findOne({ userId: req.params.userId })
      .select(PROFILE_FIELDS)
      .lean();
    if (!player) return res.status(404).json({ message: "Player not found" });
    res.json({ player });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/player/me/bio
router.patch("/me/bio", protect, async (req, res) => {
  const { bio } = req.body;
  // enforce max length
  if (typeof bio !== "string" || bio.length > MAX_BIO_LEN) {
    return res
      .status(400)
      .json({ message: `Bio must be at most ${MAX_BIO_LEN} characters.` });
  }
  const player = await Player.findOneAndUpdate(
    { userId: req.user._id },
    { bio },
    { new: true }
  )
    .select(PROFILE_FIELDS)
    .lean();
  return res.json({ player });
});

// PATCH /api/player/me/country
router.patch("/me/country", protect, async (req, res) => {
  const { country } = req.body;
  if (typeof country !== "string" || country.length > 60) {
    return res.status(400).json({ message: "Invalid country" });
  }
  const player = await Player.findOneAndUpdate(
    { userId: req.user._id },
    { country },
    { new: true }
  )
    .select(PROFILE_FIELDS)
    .lean();
  return res.json({ player });
});

// PATCH /api/player/me/wallet
router.patch("/me/wallet", protect, async (req, res) => {
  const { address } = req.body;
  if (
    address != null &&
    (typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(address))
  ) {
    return res.status(400).json({ message: "Invalid wallet address" });
  }
  const player = await Player.findOneAndUpdate(
    { userId: req.user._id },
    { walletAddress: address },
    { new: true }
  )
    .select(PROFILE_FIELDS)
    .lean();
  return res.json({ player });
});

// POST /api/player/purchase
router.post("/purchase", protect, async (req, res) => {
  const { item, cost } = req.body;
  const price = parseInt(cost, 10);
  if (!item || typeof item !== "string") {
    return res.status(400).json({ message: "Invalid item" });
  }
  if (isNaN(price) || price <= 0) {
    return res.status(400).json({ message: "Invalid cost" });
  }
  const player = await Player.findOneAndUpdate(
    { userId: req.user._id, coins: { $gte: price } },
    {
      $inc: { coins: -price },
      $push: { purchasedItems: item },
      $set: { lastPurchaseDate: new Date() },
    },
    { new: true }
  )
    .select(PROFILE_FIELDS)
    .lean();
  if (!player) {
    return res.status(400).json({ message: "Not enough coins" });
  }

  await CoinTransaction.create({
    userId: req.user._id,
    amount: -price,
    type: "purchase",
    description: item,
  });

  return res.json({ player });
});

// POST /api/player/dice/purchase
router.post("/dice/purchase", protect, async (req, res) => {
  const { designId } = req.body;
  if (!designId || typeof designId !== "string") {
    return res.status(400).json({ message: "Invalid design" });
  }
  const design = DICE_SKINS.find((d) => d.id === designId);
  if (!design) {
    return res.status(400).json({ message: "Invalid design" });
  }
  const price = design.price;
  const player = await Player.findOneAndUpdate(
    { userId: req.user._id, coins: { $gte: price } },
    {
      $inc: { coins: -price },
      $addToSet: { ownedDiceDesigns: designId },
      $set: { lastPurchaseDate: new Date() },
    },
    { new: true }
  )
    .select(PROFILE_FIELDS)
    .lean();
  if (!player) {
    return res.status(400).json({ message: "Not enough coins" });
  }

  await CoinTransaction.create({
    userId: req.user._id,
    amount: -price,
    type: "purchase",
    description: `dice:${designId}`,
  });

  return res.json({ player });
});

// POST /api/player/frame/purchase
router.post("/frame/purchase", protect, async (req, res) => {
  const { designId } = req.body;
  if (!designId || typeof designId !== "string") {
    return res.status(400).json({ message: "Invalid design" });
  }
  const design = FRAME_SKINS.find((d) => d.id === designId);
  if (!design) {
    return res.status(400).json({ message: "Invalid design" });
  }
  const price = design.price;
  const player = await Player.findOneAndUpdate(
    { userId: req.user._id, coins: { $gte: price } },
    {
      $inc: { coins: -price },
      $addToSet: { ownedFrameDesigns: designId },
      $set: { lastPurchaseDate: new Date() },
    },
    { new: true }
  )
    .select(PROFILE_FIELDS)
    .lean();
  if (!player) {
    return res.status(400).json({ message: "Not enough coins" });
  }

  await CoinTransaction.create({
    userId: req.user._id,
    amount: -price,
    type: "purchase",
    description: `frame:${designId}`,
  });

  return res.json({ player });
});

// POST /api/player/token/purchase
router.post("/token/purchase", protect, async (req, res) => {
  const { designId } = req.body;
  if (!designId || typeof designId !== "string") {
    return res.status(400).json({ message: "Invalid design" });
  }
  const design = TOKEN_SKINS.find((d) => d.id === designId);
  if (!design) {
    return res.status(400).json({ message: "Invalid design" });
  }
  const price = design.price;
  const player = await Player.findOneAndUpdate(
    { userId: req.user._id, coins: { $gte: price } },
    {
      $inc: { coins: -price },
      $addToSet: { ownedTokenDesigns: designId },
      $set: { lastPurchaseDate: new Date() },
    },
    { new: true }
  )
    .select(PROFILE_FIELDS)
    .lean();
  if (!player) {
    return res.status(400).json({ message: "Not enough coins" });
  }

  await CoinTransaction.create({
    userId: req.user._id,
    amount: -price,
    type: "purchase",
    description: `token:${designId}`,
  });

  return res.json({ player });
});

// PATCH /api/player/dice/design
router.patch("/dice/design", protect, async (req, res) => {
  const { designId } = req.body;
  if (designId != null && typeof designId !== "string") {
    return res.status(400).json({ message: "Invalid design" });
  }
  const playerDoc = await Player.findOne({ userId: req.user._id }).lean();
  if (!playerDoc) {
    return res.status(404).json({ message: "Player not found" });
  }
  if (
    designId &&
    designId !== "default" &&
    !playerDoc.ownedDiceDesigns.includes(designId)
  ) {
    return res.status(400).json({ message: "Design not owned" });
  }
  const player = await Player.findOneAndUpdate(
    { userId: req.user._id },
    { diceDesign: designId && designId !== "default" ? designId : null },
    { new: true }
  )
    .select(PROFILE_FIELDS)
    .lean();
  return res.json({ player });
});

// PATCH /api/player/frame/design
router.patch("/frame/design", protect, async (req, res) => {
  const { designId } = req.body;
  if (designId != null && typeof designId !== "string") {
    return res.status(400).json({ message: "Invalid design" });
  }
  const playerDoc = await Player.findOne({ userId: req.user._id }).lean();
  if (!playerDoc) {
    return res.status(404).json({ message: "Player not found" });
  }
  if (
    designId &&
    designId !== "default" &&
    !playerDoc.ownedFrameDesigns.includes(designId)
  ) {
    return res.status(400).json({ message: "Design not owned" });
  }
  const player = await Player.findOneAndUpdate(
    { userId: req.user._id },
    { frameDesign: designId && designId !== "default" ? designId : null },
    { new: true }
  )
    .select(PROFILE_FIELDS)
    .lean();
  return res.json({ player });
});

// PATCH /api/player/token/design
router.patch("/token/design", protect, async (req, res) => {
  const { designId } = req.body;
  if (designId != null && typeof designId !== "string") {
    return res.status(400).json({ message: "Invalid design" });
  }
  const playerDoc = await Player.findOne({ userId: req.user._id }).lean();
  if (!playerDoc) {
    return res.status(404).json({ message: "Player not found" });
  }
  if (
    designId &&
    designId !== "default" &&
    !playerDoc.ownedTokenDesigns.includes(designId)
  ) {
    return res.status(400).json({ message: "Design not owned" });
  }
  const player = await Player.findOneAndUpdate(
    { userId: req.user._id },
    { tokenDesign: designId && designId !== "default" ? designId : null },
    { new: true }
  )
    .select(PROFILE_FIELDS)
    .lean();
  return res.json({ player });
});

// GET /api/player/me/transactions
router.get("/me/transactions", protect, async (req, res) => {
  const transactions = await CoinTransaction.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20);
  res.json({ transactions });
});

module.exports = router;
