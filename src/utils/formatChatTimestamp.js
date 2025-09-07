export function formatChatTimestamp(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const week = 7 * day;
  if (diff < week) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
