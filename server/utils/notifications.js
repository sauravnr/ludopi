const Notification = require("../models/Notification");

/**
 * Remove notifications older than the five most recent for a user.
 * @param {import("mongoose").Types.ObjectId|null} userId
 */
async function pruneNotifications(userId) {
  const filter = { userId: userId || null };
  const excess = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip(5)
    .select("_id")
    .lean();

  if (excess.length > 0) {
    await Notification.deleteMany({
      _id: { $in: excess.map((n) => n._id) },
    });
  }
}

/**
 * Create a notification and ensure only the five latest remain for that user.
 * @param {{userId: any, message: string, type: string}} data
 */
async function createNotification(data) {
  const notif = await Notification.create(data);
  await pruneNotifications(data.userId || null);
  return notif;
}

/**
 * Insert multiple notifications and prune per user afterwards.
 * @param {Array<{userId: any, message: string, type: string}>} list
 */
async function createNotifications(list) {
  const created = await Notification.insertMany(list);
  const uniqueUsers = new Map();
  for (const n of list) {
    const key = n.userId ? n.userId.toString() : "null";
    if (!uniqueUsers.has(key)) {
      uniqueUsers.set(key, n.userId || null);
    }
  }
  for (const userId of uniqueUsers.values()) {
    await pruneNotifications(userId);
  }
  return created;
}

module.exports = {
  pruneNotifications,
  createNotification,
  createNotifications,
};
