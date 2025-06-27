// src/utils/PlayerColors.js
const PLAYER_COLORS = ["red", "yellow", "green", "blue"];

export const assignPlayerColors = (roomCode) => {
  const hash = Array.from(roomCode).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );
  const shuffled = [...PLAYER_COLORS].sort(
    (a, b) => ((hash + a.charCodeAt(0)) % 7) - ((hash + b.charCodeAt(0)) % 7)
  );
  return shuffled;
};

export default PLAYER_COLORS;
