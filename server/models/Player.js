// models/Player.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { nanoid } = require("nanoid");

// Badge sub‐schema
const badgeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const playerSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    playerId: {
      type: String,
      required: true,
      unique: true,
      default: () => nanoid(10),
    },
    piUid: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Profile fields
    username: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 30,
    },
    avatarUrl: {
      type: String,
      default: null,
    },

    // Statistics
    totalGamesPlayed: {
      type: Number,
      default: 0,
    },
    totalWins: {
      type: Number,
      default: 0,
    },
    wins2P: {
      type: Number,
      default: 0,
    },
    wins4P: {
      type: Number,
      default: 0,
    },
    tokenCaptures: {
      type: Number,
      default: 0,
    },
    sixesRolled: {
      type: Number,
      default: 0,
    },
    tokensHomed: {
      type: Number,
      default: 0,
    },
    // Ranking
    trophies: {
      type: Number,
      default: 0,
      min: 0,
    },
    trophyUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    country: {
      type: String,
      default: "Worldwide",
    },
    // Progression
    badges: [badgeSchema],

    // Economy / Inventory
    coins: {
      type: Number,
      default: 100,
    },
    // Coins temporarily locked for an in-progress game
    lockedBet: {
      type: Number,
      default: 0,
      min: 0,
    },
    purchasedItems: [{ type: String }],
    ownedDiceDesigns: [{ type: String }],
    diceDesign: {
      type: String,
      default: null,
    },
    ownedFrameDesigns: [{ type: String }],
    frameDesign: {
      type: String,
      default: null,
    },
    ownedTokenDesigns: [{ type: String }],
    tokenDesign: {
      type: String,
      default: null,
    },
    lastPurchaseDate: {
      type: Date,
      default: null,
    },

    // Social
    friends: [{ type: Schema.Types.ObjectId, ref: "Player" }],
    friendRequestsSent: [{ type: Schema.Types.ObjectId, ref: "Player" }],
    friendRequestsReceived: [{ type: Schema.Types.ObjectId, ref: "Player" }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: "Player" }],

    // Track which room the user is currently in (if any)
    activeRoomCode: {
      type: String,
      default: null,
      index: true,
    },

    // Preferences
    chatOn: {
      type: Boolean,
      default: true,
    },
    language: {
      type: String,
      default: "en",
    },

    // Moderation
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: null,
    },
    banExpiresAt: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },

    // Custom timestamps
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

// Index to speed ranking queries with tie-breakers
playerSchema.index({ trophies: -1, trophyUpdatedAt: 1, playerId: 1 });
// Additional index for coins ranking
playerSchema.index({ coins: -1, playerId: 1 });

module.exports = mongoose.model("Player", playerSchema);
