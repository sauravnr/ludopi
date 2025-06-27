// server/config/db.js
const mongoose = require("mongoose");
require("dotenv").config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10, // limit of 10 concurrent connections
      serverSelectionTimeoutMS: 5000, // fail if no primary in 5s
      socketTimeoutMS: 45000, // close idle sockets after 45s
    });
    console.log("✅ MongoDB connected to", process.env.MONGO_URI);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

module.exports = connectDB;
