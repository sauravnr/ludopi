// server/models/CoinTransaction.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const coinTransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    type: {
      type: String,
      required: true,
      enum: ["win", "purchase", "grant", "bet"],
    },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CoinTransaction", coinTransactionSchema);
