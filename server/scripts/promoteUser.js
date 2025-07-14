// promoteUser.js
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./server/config/db");
const Player = require("./server/models/Player");

async function promote(userId) {
  await connectDB();
  const updated = await Player.findOneAndUpdate(
    { userId }, // filter by the user’s ID
    { role: "admin" }, // set new role
    { new: true }
  ).lean();
  console.log(updated);
  mongoose.disconnect();
}

promote("68343a154cc9d97fc872ce04").catch((err) => console.error(err));
