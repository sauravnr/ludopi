require("dotenv").config();
const mongoose = require("mongoose");
const Player = require("../models/Player");

async function backfill() {
  await mongoose.connect(process.env.MONGO_URI);

  const players = await Player.find({ trophyUpdatedAt: { $exists: false } });
  for (const p of players) {
    p.trophyUpdatedAt = p.createdAt || new Date();
    await p.save();
    console.log(`\uD83D\uDD04 Set trophyUpdatedAt for ${p._id}`);
  }

  console.log("\u2728 Backfill complete");
  process.exit(0);
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
