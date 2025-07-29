require("dotenv").config();
const mongoose = require("mongoose");
const Player = require("../models/Player");
const logAdminAction = require("../utils/adminLogger");

async function grantCoins() {
  await mongoose.connect(process.env.MONGO_URI);

  const result = await Player.updateMany({}, { $inc: { coins: 20000 } });
  console.log(`\u2728 Granted coins to ${result.modifiedCount} players`);
  logAdminAction("script", "grantCoins", {
    amount: 20000,
    count: result.modifiedCount,
  });

  await mongoose.disconnect();
}

grantCoins().catch((err) => {
  console.error(err);
  process.exit(1);
});
