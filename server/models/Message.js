// models/Message.js
const mongoose = require("mongoose");
const sanitizeHtml = require("sanitize-html");

const messageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: {
      type: String,
      required: true,
      maxlength: 500, // prevent huge payloads
      trim: true,
    },

    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
  },
  {
    timestamps: true, // adds createdAt + updatedAt
  }
);

// strip any HTML before saving
messageSchema.pre("save", function (next) {
  if (this.isModified("text")) {
    this.text = sanitizeHtml(this.text, {
      allowedTags: [], // no tags allowed
      allowedAttributes: {},
    });
  }
  next();
});

module.exports = mongoose.model("Message", messageSchema);
