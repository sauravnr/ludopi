const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "..", "admin-actions.log");

function logAdminAction(user, action, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    user,
    action,
    meta,
  };
  fs.appendFile(logFile, JSON.stringify(entry) + "\n", (err) => {
    if (err) console.error("Log error:", err);
  });
}

module.exports = logAdminAction;
