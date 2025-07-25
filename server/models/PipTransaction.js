// server/models/PipTransaction.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const pipTransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    txHash: { type: String, unique: true },
    amount: { type: Number, required: true },
    type: {
      type: String,
      required: true,
      enum: ["deposit", "earn", "withdraw"],
    },
    // for withdrawals, the blockchain tx hash will be stored once processed
    status: {
      type: String,
      enum: ["pending", "completed", "rejected"],
      default: "completed",
    },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PipTransaction", pipTransactionSchema);
