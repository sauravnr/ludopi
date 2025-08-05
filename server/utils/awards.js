const Player = require("../models/Player");
const { createNotifications } = require("./notifications");

const DEFAULT_ICON = "/awards/medal-first-win.png";

const AWARDS = [
  {
    code: "first_win",
    name: "First Win",
    icon: DEFAULT_ICON,
    criterion: (p) => p.totalWins >= 1,
  },
  {
    code: "captures_100",
    name: "100 Tokens Captured",
    icon: DEFAULT_ICON,
    criterion: (p) => p.tokenCaptures >= 100,
  },
  {
    code: "captures_300",
    name: "300 Tokens Captured",
    icon: DEFAULT_ICON,
    criterion: (p) => p.tokenCaptures >= 300,
  },
  {
    code: "captures_500",
    name: "500 Tokens Captured",
    icon: DEFAULT_ICON,
    criterion: (p) => p.tokenCaptures >= 500,
  },
  {
    code: "wins2p_100",
    name: "2P 100 Wins",
    icon: DEFAULT_ICON,
    criterion: (p) => p.wins2P >= 100,
  },
  {
    code: "wins2p_300",
    name: "2P 300 Wins",
    icon: DEFAULT_ICON,
    criterion: (p) => p.wins2P >= 300,
  },
  {
    code: "wins2p_500",
    name: "2P 500 Wins",
    icon: DEFAULT_ICON,
    criterion: (p) => p.wins2P >= 500,
  },
  {
    code: "wins4p_100",
    name: "4P 100 Wins",
    icon: DEFAULT_ICON,
    criterion: (p) => p.wins4P >= 100,
  },
  {
    code: "wins4p_300",
    name: "4P 300 Wins",
    icon: DEFAULT_ICON,
    criterion: (p) => p.wins4P >= 300,
  },
  {
    code: "wins4p_500",
    name: "4P 500 Wins",
    icon: DEFAULT_ICON,
    criterion: (p) => p.wins4P >= 500,
  },
  {
    code: "friends_50",
    name: "50 Friends",
    icon: DEFAULT_ICON,
    criterion: (p) => (p.friends ? p.friends.length : 0) >= 50,
  },
  {
    code: "tokens_homed_1000",
    name: "1000 Tokens Homed",
    icon: DEFAULT_ICON,
    criterion: (p) => p.tokensHomed >= 1000,
  },
  {
    code: "tokens_homed_3000",
    name: "3000 Tokens Homed",
    icon: DEFAULT_ICON,
    criterion: (p) => p.tokensHomed >= 3000,
  },
  {
    code: "coins_50k",
    name: "50,000 Coins",
    icon: DEFAULT_ICON,
    criterion: (p) => p.coins >= 50000,
  },
  {
    code: "coins_100k",
    name: "100,000 Coins",
    icon: DEFAULT_ICON,
    criterion: (p) => p.coins >= 100000,
  },
  {
    code: "coins_500k",
    name: "500,000 Coins",
    icon: DEFAULT_ICON,
    criterion: (p) => p.coins >= 500000,
  },
  {
    code: "trophies_500",
    name: "500 Trophies",
    icon: DEFAULT_ICON,
    criterion: (p) => p.trophies >= 500,
  },
  {
    code: "trophies_1000",
    name: "1000 Trophies",
    icon: DEFAULT_ICON,
    criterion: (p) => p.trophies >= 1000,
  },
];

async function checkAwards(userId, io) {
  const player = await Player.findOne({ userId });
  if (!player) return;
  const newNotifs = [];
  let updated = false;
  for (const award of AWARDS) {
    if (player.awards.some((a) => a.code === award.code)) continue;
    if (award.criterion(player)) {
      player.awards.push({
        code: award.code,
        name: award.name,
        icon: award.icon,
      });
      newNotifs.push({
        userId,
        message: `Award earned: ${award.name}`,
        type: "award",
      });
      updated = true;
    }
  }
  if (updated) {
    await player.save();
    if (newNotifs.length > 0) {
      const created = await createNotifications(newNotifs);
      if (io) {
        created.forEach((n) =>
          io.to(userId.toString()).emit("notification", n)
        );
      }
    }
  }
}

module.exports = { AWARDS, checkAwards };
