// models/FriendRequest.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const FriendRequestSchema = new Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// for fast lookups
FriendRequestSchema.index({ from: 1, status: 1 });
FriendRequestSchema.index({ to: 1, status: 1 });
FriendRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model("FriendRequest", FriendRequestSchema);
