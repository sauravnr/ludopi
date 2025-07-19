require("dotenv").config();
const mongoose = require("mongoose");
const Message = require("../models/Message");

async function buildIndexes() {
  await mongoose.connect(process.env.MONGO_URI);
  await Message.syncIndexes();
  console.log("\u2728 Indexes built");
  await mongoose.disconnect();
}

buildIndexes().catch((err) => {
  console.error(err);
  process.exit(1);
});
