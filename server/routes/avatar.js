// server/routes/avatar.js
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const sharp = require("sharp");
const AWS = require("aws-sdk");
const protect = require("../middleware/auth");
const Player = require("../models/Player");
const User = require("../models/User");

const router = express.Router();

// Setup multer to store in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed =
      file.mimetype === "image/jpeg" || file.mimetype === "image/png";
    cb(null, allowed);
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});

// use the S3-API endpoint here:
const s3 = new AWS.S3({
  endpoint: process.env.R2_API_ENDPOINT, // e.g. https://<account>.r2.cloudflarestorage.com
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  signatureVersion: "v4",
  // no ACL (R2 doesn't implement x-amz-acl), public-ness is controlled at the bucket level
});

router.post("/upload", protect, upload.single("avatar"), async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const filename = `avatars/${userId}.jpg`;

    const compressed = await sharp(req.file.buffer)
      .resize(256, 256, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toBuffer();

    await s3
      .putObject({
        Bucket: process.env.R2_BUCKET,
        Key: filename,
        Body: compressed,
        ContentType: "image/jpeg",
      })
      .promise();

    const avatarUrl = `${process.env.R2_PUBLIC_URL}/${filename}`;
    await Player.findOneAndUpdate(
      { userId: req.user._id }, // Mongoose will auto-cast the ObjectId
      { avatarUrl }, // shorthand for `{ avatarUrl: avatarUrl }`
      { new: true }
    );
    await User.findByIdAndUpdate(userId, { avatarUrl });

    res.json({ avatarUrl });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ message: "Failed to upload avatar" });
  }
});

module.exports = router;
