const Player = require("../models/Player");

const DEFAULT_ICON = "/awards/medal-first-win.png";

const AWARDS = [
  {
    code: "first_win",
    name: "First Win",
    icon: DEFAULT_ICON,
    criterion: (p) => p.totalWins >= 1,
  },
  {
    code: "five_captures",
    name: "5 Tokens Captured",
    icon: DEFAULT_ICON,
    criterion: (p) => p.tokenCaptures >= 5,
  },
  {
    code: "wins2p_20",
    name: "2P 20 Wins",
    icon: DEFAULT_ICON,
    criterion: (p) => p.wins2P >= 20,
  },
  {
    code: "wins4p_20",
    name: "4P 20 Wins",
    icon: DEFAULT_ICON,
    criterion: (p) => p.wins4P >= 20,
  },
];

async function checkAwards(userId) {
  const player = await Player.findOne({ userId });
  if (!player) return;
  let updated = false;
  for (const award of AWARDS) {
    if (player.awards.some((a) => a.code === award.code)) continue;
    if (award.criterion(player)) {
      player.awards.push({
        code: award.code,
        name: award.name,
        icon: award.icon,
      });
      updated = true;
    }
  }
  if (updated) {
    await player.save();
  }
}

module.exports = { AWARDS, checkAwards };
