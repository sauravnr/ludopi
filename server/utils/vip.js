const Player = require("../models/Player");

async function refreshVipStatus(userId) {
  await Player.updateOne(
    { userId, isVip: true, vipExpiresAt: { $lt: new Date() } },
    { $set: { isVip: false, vipExpiresAt: null } }
  );
}

module.exports = { refreshVipStatus };
