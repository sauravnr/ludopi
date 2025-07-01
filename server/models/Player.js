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

    // Progression
    level: {
      type: Number,
      default: 1,
    },
    experiencePoints: {
      type: Number,
      default: 0,
    },
    badges: [badgeSchema],

    // Economy / Inventory
    coins: {
      type: Number,
      default: 100,
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
    lastPurchaseDate: {
      type: Date,
      default: null,
    },

    // Social
    friends: [{ type: Schema.Types.ObjectId, ref: "Player" }],
    friendRequestsSent: [{ type: Schema.Types.ObjectId, ref: "Player" }],
    friendRequestsReceived: [{ type: Schema.Types.ObjectId, ref: "Player" }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: "Player" }],

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

module.exports = mongoose.model("Player", playerSchema);
