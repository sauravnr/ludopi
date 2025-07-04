// server/utils/experience.js
const Player = require("../models/Player");

// Experience rewards
const COMPLETE_GAME_XP = 50;
const WIN_XP_2P = 100;
const WIN_XP_4P = 150;

/**
 * Increment a player's XP and adjust their level
 * @param {ObjectId} userId
 * @param {number} xp
 */
async function addExperience(userId, xp) {
  const player = await Player.findOneAndUpdate(
    { userId },
    { $inc: { experiencePoints: xp } },
    { new: true }
  );
  if (!player) return;
  let lvl = player.level;
  while (player.experiencePoints >= lvl * 1000) {
    lvl += 1;
  }
  if (lvl !== player.level) {
    player.level = lvl;
    await player.save();
  }
}

module.exports = {
  COMPLETE_GAME_XP,
  WIN_XP_2P,
  WIN_XP_4P,
  addExperience,
};
