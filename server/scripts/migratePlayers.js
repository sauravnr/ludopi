// scripts/migratePlayers.js

require("dotenv").config();
const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const Player = require("../models/Player");
const User = require("../models/User");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);

  // 1) Ensure every User has a Player
  const users = await User.find();
  for (const user of users) {
    let player = await Player.findOne({ userId: user._id });
    if (!player) {
      player = await Player.create({
        userId: user._id,
        username: user.username,
        // playerId will auto-generate via schema default
      });
      console.log(`✅ Created Player for User ${user._id}`);
    } else if (!player.playerId) {
      // 2) Backfill missing playerId
      player.playerId = nanoid(10);
      await player.save();
      console.log(`🔄 Backfilled playerId for Player ${player._id}`);
    }
  }

  console.log("🎉 Migration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
