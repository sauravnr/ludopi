// server/index.js

require("dotenv").config();
const connectDB = require("./config/db");
connectDB();

const express = require("express");
const https = require("https");
const fs = require("fs");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const cookie = require("cookie");
const crypto = require("crypto");
const sanitizeHtml = require("sanitize-html");
const rateLimit = require("express-rate-limit");
const { RateLimiterMemory } = require("rate-limiter-flexible");
const protect = require("./middleware/auth"); // your JWT auth middleware
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Player = require("./models/Player");
const Message = require("./models/Message");
const mongoose = require("mongoose");

const app = express();
// trust proxy so req.secure & Secure cookies work behind proxies
app.set("trust proxy", 1);

// ─── PARSE COOKIES ───────────────────────────────────────
app.use(cookieParser());

// ─── TIGHTEN CORS ────────────────────────────────────────────────────────
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://your-game-domain.com"
        : "http://localhost:5173", // ← match your React dev server
    credentials: true,
  })
);

app.use(express.json());

// ─── GLOBAL RATE LIMITER ──────────────────────────────
// limit every IP to 200 requests per minute
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // limit each IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests; please slow down." },
});
app.use(globalLimiter); // applies to all routes

// ─── API ROUTES ───────────────────────────────────────
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const playerRoutes = require("./routes/player");
const avatarRoutes = require("./routes/avatar");
const friendRequests = require("./routes/friendRequests");
const chatRoutes = require("./routes/chat");
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/player", playerRoutes);
app.use("/api/avatar", avatarRoutes);
app.use("/api/friend-requests", friendRequests);
app.use("/api/chat", chatRoutes);

// ─── IN-MEMORY ROOM STORE ────────────────────────────
const rooms = {};

// ─── ROOM-CODE GENERATOR ─────────────────────────────
function generateRoomCode(length = 6) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code;
  do {
    const bytes = crypto.randomBytes(length);
    code = Array.from(bytes)
      .map((b) => alphabet[b % alphabet.length])
      .join("");
  } while (rooms[code]);
  return code;
}

// ─── RATE LIMITER ─────────────────────────────────────
const createRoomLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit to 10 creates per IP per window
  message: { error: "Too many room‐creates; please wait a minute." },
});

// ─── ROOM-CREATION ENDPOINT ──────────────────────────
app.post(
  "/api/rooms",
  protect, // must be logged in
  createRoomLimiter, // throttle brute-force
  (req, res) => {
    const { mode } = req.body; // e.g. "2P" or "4P"
    const code = generateRoomCode(6); // ~2.8T possible codes
    // initialize exactly as your socket “create” logic would:
    rooms[code] = {
      createdAt: Date.now(),
      // when was the lobby last touched?
      lastActive: Date.now(),
      // hasn’t started until we emit “start-game”
      started: false,
      players: [],
      capacity: mode === "4P" ? 4 : 2,
      shuffledColors: shuffleArray(
        PLAYER_COLORS_BY_MODE[mode] || ["red", "blue"]
      ),
      finishOrder: [],
      currentTurnIndex: 0,
      mode,
      // track “rolled this turn?” and “moved this roll?” per color
      hasRolled: {
        red: false,
        yellow: false,
        green: false,
        blue: false,
      },
      hasMoved: {
        red: false,
        yellow: false,
        green: false,
        blue: false,
      },
      tokenSteps: {
        red: [-1, -1, -1, -1],
        yellow: [-1, -1, -1, -1],
        green: [-1, -1, -1, -1],
        blue: [-1, -1, -1, -1],
      },
      // for rule “three sixes in a row”
      consecutiveSixes: {
        red: 0,
        yellow: 0,
        green: 0,
        blue: 0,
      },
    };
    return res.status(201).json({ code });
  }
);

// ─── HTTP + SOCKET.IO SETUP ─────────────────────────
// ─── HTTP/HTTPS + SOCKET.IO SETUP ───────────────────────
let server;
if (process.env.NODE_ENV === "development") {
  // Dev: use mkcert certificates for HTTPS on localhost
  const opts = {
    key: fs.readFileSync(__dirname + "/localhost-key.pem"),
    cert: fs.readFileSync(__dirname + "/localhost.pem"),
  };
  server = https.createServer(opts, app);
} else {
  // Prod: plain HTTP (behind your real TLS)
  server = http.createServer(app);
}

// Share the same server with socket.io, but only allow our front-end origin
const io = new Server(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? "https://your-game-domain.com"
        : "http://localhost:5173",
    credentials: true,
  },
});

const msgLimiter = new RateLimiterMemory({
  points: 10, // 10 messages
  duration: 1, // per second
});

// ─── SOCKET.IO JOIN LIMITER ───────────────────────────────────
// allow max 15 join-room attempts per user per 60 seconds
const joinLimiter = new RateLimiterMemory({
  points: 15,
  duration: 60,
});

// ─── SOCKET AUTH MIDDLEWARE ──────────────────────────
io.use(async (socket, next) => {
  const cookies = cookie.parse(socket.handshake.headers.cookie || "");
  const token = cookies.authToken;
  if (!token) return next(new Error("Authentication error"));
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id).select("-password");
    if (!user) throw new Error("User not found");
    socket.user = user;
    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Authentication error"));
  }
});

// ─── COLOR HELPERS ────────────────────────────────────
const PLAYER_COLORS_BY_MODE = {
  "2P": ["red", "blue"],
  "4P": ["red", "yellow", "green", "blue"],
};
const PATHS = {
  red: [
    [6, 1],
    [6, 2],
    [6, 3],
    [6, 4],
    [6, 5],
    [5, 6],
    [4, 6],
    [3, 6],
    [2, 6],
    [1, 6],
    [0, 6],
    [0, 7],
    [0, 8],
    [1, 8],
    [2, 8],
    [3, 8],
    [4, 8],
    [5, 8],
    [6, 9],
    [6, 10],
    [6, 11],
    [6, 12],
    [6, 13],
    [6, 14],
    [7, 14],
    [8, 14],
    [8, 13],
    [8, 12],
    [8, 11],
    [8, 10],
    [8, 9],
    [9, 8],
    [10, 8],
    [11, 8],
    [12, 8],
    [13, 8],
    [14, 8],
    [14, 7],
    [14, 6],
    [13, 6],
    [12, 6],
    [11, 6],
    [10, 6],
    [9, 6],
    [8, 5],
    [8, 4],
    [8, 3],
    [8, 2],
    [8, 1],
    [8, 0],
    [7, 0],
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
    [7, 6],
  ],
  yellow: [
    [1, 8],
    [2, 8],
    [3, 8],
    [4, 8],
    [5, 8],
    [6, 9],
    [6, 10],
    [6, 11],
    [6, 12],
    [6, 13],
    [6, 14],
    [7, 14],
    [8, 14],
    [8, 13],
    [8, 12],
    [8, 11],
    [8, 10],
    [8, 9],
    [9, 8],
    [10, 8],
    [11, 8],
    [12, 8],
    [13, 8],
    [14, 8],
    [14, 7],
    [14, 6],
    [13, 6],
    [12, 6],
    [11, 6],
    [10, 6],
    [9, 6],
    [8, 5],
    [8, 4],
    [8, 3],
    [8, 2],
    [8, 1],
    [8, 0],
    [7, 0],
    [6, 0],
    [6, 1],
    [6, 2],
    [6, 3],
    [6, 4],
    [6, 5],
    [5, 6],
    [4, 6],
    [3, 6],
    [2, 6],
    [1, 6],
    [0, 6],
    [0, 7],
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
    [6, 7],
  ],
  green: [
    [13, 6],
    [12, 6],
    [11, 6],
    [10, 6],
    [9, 6],
    [8, 5],
    [8, 4],
    [8, 3],
    [8, 2],
    [8, 1],
    [8, 0],
    [7, 0],
    [6, 0],
    [6, 1],
    [6, 2],
    [6, 3],
    [6, 4],
    [6, 5],
    [5, 6],
    [4, 6],
    [3, 6],
    [2, 6],
    [1, 6],
    [0, 6],
    [0, 7],
    [0, 8],
    [1, 8],
    [2, 8],
    [3, 8],
    [4, 8],
    [5, 8],
    [6, 9],
    [6, 10],
    [6, 11],
    [6, 12],
    [6, 13],
    [6, 14],
    [7, 14],
    [8, 14],
    [8, 13],
    [8, 12],
    [8, 11],
    [8, 10],
    [8, 9],
    [9, 8],
    [10, 8],
    [11, 8],
    [12, 8],
    [13, 8],
    [14, 8],
    [14, 7],
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
    [8, 7],
  ],
  blue: [
    [8, 13],
    [8, 12],
    [8, 11],
    [8, 10],
    [8, 9],
    [9, 8],
    [10, 8],
    [11, 8],
    [12, 8],
    [13, 8],
    [14, 8],
    [14, 7],
    [14, 6],
    [13, 6],
    [12, 6],
    [11, 6],
    [10, 6],
    [9, 6],
    [8, 5],
    [8, 4],
    [8, 3],
    [8, 2],
    [8, 1],
    [8, 0],
    [7, 0],
    [6, 0],
    [6, 1],
    [6, 2],
    [6, 3],
    [6, 4],
    [6, 5],
    [5, 6],
    [4, 6],
    [3, 6],
    [2, 6],
    [1, 6],
    [0, 6],
    [0, 7],
    [0, 8],
    [1, 8],
    [2, 8],
    [3, 8],
    [4, 8],
    [5, 8],
    [6, 9],
    [6, 10],
    [6, 11],
    [6, 12],
    [6, 13],
    [6, 14],
    [7, 14],
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
    [7, 8],
  ],
};

const SAFE_COORDS = [
  [2, 6],
  [6, 12],
  [8, 2],
  [12, 8], // main‐track “stars”
  [6, 1],
  [1, 8],
  [13, 6],
  [8, 13], // corridor entry “stars”
];

const FINISHED = -2;

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── 3) Connection & event handlers ───────────────────
io.on("connection", (socket) => {
  console.log("🔌 New connection:", socket.id, "user:", socket.user.username);
  // lets us target this user by their ID when sending PMs:
  socket.join(socket.user._id.toString());

  socket.on("simulate-finish", ({ color }) => {
    // Immediately re-broadcast to everyone in the room:
    io.to(socket.data.roomCode).emit("dice-rolled-broadcast", {
      color,
      finished: true,
    });
  });

  // helper to remove a player (and tear down if host)
  function handleDeparture(socket, roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    // find index of departing user
    const idx = room.players.findIndex(
      (p) => p.userId === socket.user._id.toString()
    );
    if (idx === -1) return;
    const isHost = idx === 0;
    // remove the player
    room.players.splice(idx, 1);

    if (isHost) {
      // host left → tell everyone the room is closed and delete it
      io.to(roomCode).emit("room-closed", {
        message: "The host has left. This room is now closed.",
      });
      // force everyone out of the socket.io room
      const clients = io.sockets.adapter.rooms.get(roomCode) || new Set();
      for (const sid of clients) {
        io.sockets.sockets.get(sid)?.leave(roomCode);
      }
      delete rooms[roomCode];
    } else {
      // normal departure → broadcast updated list
      io.to(roomCode).emit("player-list", {
        players: room.players,
        mode: room.mode,
      });
      // if empty, clean up
      if (room.players.length === 0) {
        console.log(`[Room ${roomCode}] deleted: no players left.`);
        delete rooms[roomCode];
      }
    }
  }

  // old leave-room listener
  socket.on("leave-room", ({ roomCode }) => {
    socket.leave(roomCode);
    handleDeparture(socket, roomCode);
  });

  // also on abrupt disconnect
  socket.on("disconnect", () => {
    handleDeparture(socket, socket.data.roomCode);
    console.log("❌ Disconnected:", socket.id);
  });

  // Join or create
  socket.on("join-room", async ({ roomCode, mode, action }) => {
    // enforce rate limit per user
    try {
      await joinLimiter.consume(socket.user._id.toString());
    } catch {
      return socket.emit("rate-limit", {
        message: "Too many join attempts; please wait a minute.",
      });
    }
    const user = socket.user;
    const capacity = mode === "4P" ? 4 : 2;

    const room = rooms[roomCode];
    if (!room) {
      return socket.emit("room-not-found");
    }
    // mark lobby as “touched” right now
    room.lastActive = Date.now();

    // Add or update player
    let player = room.players.find((p) => p.userId === user._id.toString());
    if (!player) {
      const used = room.players.map((p) => p.color);
      const available = room.shuffledColors.filter((c) => !used.includes(c));
      if (available.length === 0) return socket.emit("room-full");

      // ── Double‐check that no one has already taken available[0] ──
      const chosen = available[0];
      if (room.players.some((p) => p.color === chosen)) {
        // someone else just snatched it, so fail out
        return socket.emit("room-full");
      }

      player = {
        socketId: socket.id,
        userId: user._id.toString(),
        username: user.username,
        color: chosen,
      };
      room.players.push(player);
    } else {
      player.socketId = socket.id;
    }

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    io.to(roomCode).emit("player-list", {
      players: room.players,
      mode: room.mode, // “2P” or “4P”
    });

    // If game already started, send current turn
    if (room.currentTurnIndex != null) {
      const turnColor = room.players[room.currentTurnIndex].color;
      io.to(socket.id).emit("turn-change", { currentTurnColor: turnColor });
    }
  });

  // Start game
  socket.on("start-game", () => {
    const rc = socket.data.roomCode;
    const room = rooms[rc];
    if (!room || room.players.length !== room.capacity) return;

    // we’re officially “in‐game” now—stop treating it as a lobby
    room.started = true;

    // Determine turn order
    const boardOrder = ["red", "yellow", "blue", "green"];
    const byColor = Object.fromEntries(room.players.map((p) => [p.color, p]));
    const joined = room.players.map((p) => p.color);
    const filtered = boardOrder.filter((c) => joined.includes(c));
    const hostColor = room.players[0].color;
    const startIndex = filtered.indexOf(hostColor);
    const rotated = [
      ...filtered.slice(startIndex),
      ...filtered.slice(0, startIndex),
    ];
    room.players = rotated.map((c) => byColor[c]);
    room.currentTurnIndex = 0;
    room.finishOrder = [];

    // snapshot the starting participants so we can update stats later
    room.participants = room.players.map((p) => ({
      userId: p.userId,
      color: p.color,
    }));

    // reset both “rolled” and “moved” flags for all colors
    for (const clr of ["red", "yellow", "green", "blue"]) {
      room.hasRolled[clr] = false;
      room.hasMoved[clr] = false;
    }

    io.to(rc).emit("start-game");
    io.to(rc).emit("turn-change", {
      currentTurnColor: room.players[0].color,
    });
  });

  // 1) “Spin only” event: broadcast immediately with updatedSteps = null
  socket.on("dice-spin-intent", ({ roomCode, color, value }) => {
    const room = rooms[roomCode];
    if (!room) return;

    // Verify user/color and turn‐check exactly as before:
    const playerObj = room.players.find((p) => p.color === color);
    if (!playerObj) return;
    if (socket.user._id.toString() !== playerObj.userId) return;
    const currentColor = room.players[room.currentTurnIndex]?.color;
    if (currentColor !== color) return;

    // if they already rolled this turn, ignore
    if (room.hasRolled[color]) {
      return;
    }
    // mark “rolled this turn” so they can’t spin again
    room.hasRolled[color] = true;

    // Immediately broadcast just the spin (no movement)
    io.to(roomCode).emit("dice-rolled-broadcast", {
      color,
      value,
      updatedSteps: null,
      capture: false,
      finished: false,
    });
  });

  // 2) “Move token” event: apply three‐sixes + movement logic, broadcast updatedSteps
  socket.on(
    "dice-move-intent",
    async ({ roomCode, color, tokenIdx, value }) => {
      const room = rooms[roomCode];
      if (!room) return;

      // 1) Verify user/color
      const playerObj = room.players.find((p) => p.color === color);
      if (!playerObj) return;
      if (socket.user._id.toString() !== playerObj.userId) return;

      // 2) Must be their turn
      const currentColor = room.players[room.currentTurnIndex]?.color;
      if (currentColor !== color) return;

      // 3) Cannot move if they never rolled or already moved
      if (!room.hasRolled[color] || room.hasMoved[color]) {
        return;
      }
      room.hasMoved[color] = true;

      // — Part A: “three sixes in a row” check (unchanged) —
      if (value === 6) {
        room.consecutiveSixes[color] += 1;
      } else {
        room.consecutiveSixes[color] = 0;
      }
      if (room.consecutiveSixes[color] === 3) {
        // Forfeit the third‐six immediately
        const oldArr = room.tokenSteps[color].slice();
        const updatedSteps = { [color]: oldArr };
        room.consecutiveSixes[color] = 0;

        // Clear their “rolled/moved” flags so that if they somehow re‐join,
        // they start fresh next time they get a turn.
        room.hasRolled[color] = false;
        room.hasMoved[color] = false;

        // Advance to next player
        room.currentTurnIndex =
          (room.currentTurnIndex + 1) % room.players.length;

        io.to(roomCode).emit("dice-rolled-broadcast", {
          color,
          value,
          updatedSteps,
          capture: false,
          finished: false,
        });
        setTimeout(() => {
          const nextColor = room.players[room.currentTurnIndex].color;
          room.hasRolled[nextColor] = false;
          room.hasMoved[nextColor] = false;
          io.to(roomCode).emit("turn-change", { currentTurnColor: nextColor });
        }, 2000);
        return;
      }

      // — Part B: Normal‐move logic —
      const oldArr = room.tokenSteps[color].slice();
      const newArr = oldArr.slice();
      let isCapture = false;
      // “finished” means “this move just put all 4 tokens in home”
      let finished = false;
      const updatedSteps = {};

      if (typeof tokenIdx !== "number") {
        // “no legal token clicked” ⇒ no move
        updatedSteps[color] = oldArr.slice();
      } else {
        // Move that specific tokenIdx
        if (tokenIdx < 0 || tokenIdx > 3 || oldArr[tokenIdx] === FINISHED) {
          return; // invalid index / already finished
        }

        if (oldArr[tokenIdx] === -1 && value === 6) {
          newArr[tokenIdx] = 0;
        } else {
          const pathLen = PATHS[color].length;
          const pos = oldArr[tokenIdx];
          const next = pos + value;
          if (pos >= 0 && next <= pathLen - 1) {
            if (next === pathLen - 1) {
              newArr[tokenIdx] = FINISHED;
              // Check if ALL tokens are now FINISHED
              finished = newArr.every((s) => s === FINISHED);
            } else {
              newArr[tokenIdx] = next;
            }
          } else {
            // overshoot ⇒ stay
            newArr[tokenIdx] = pos;
          }
        }

        // Detect captures as before
        updatedSteps[color] = newArr.slice();
        const landingStep = newArr[tokenIdx];
        if (landingStep >= 0) {
          const coord = PATHS[color][landingStep];
          if (!SAFE_COORDS.some(([r, c]) => r === coord[0] && c === coord[1])) {
            for (const [otherColor, otherArr] of Object.entries(
              room.tokenSteps
            )) {
              if (otherColor === color) continue;
              for (let i = 0; i < otherArr.length; i++) {
                const os = otherArr[i];
                if (os < 0) continue;
                const otherCoord = PATHS[otherColor][os];
                if (otherCoord[0] === coord[0] && otherCoord[1] === coord[1]) {
                  if (!updatedSteps[otherColor]) {
                    updatedSteps[otherColor] = otherArr.slice();
                  }
                  updatedSteps[otherColor][i] = -1;
                  isCapture = true;
                }
              }
            }
          }
        }
      }

      // Commit updatedPositions to room.tokenSteps:
      for (const [clr, arr] of Object.entries(updatedSteps)) {
        room.tokenSteps[clr] = arr.slice();
      }

      // ─── NEW: If “finished===true” (all 4 tokens done for this color) ───
      if (finished) {
        // 1) Record their place:
        room.finishOrder.push(color);
        // 2) Remove them from future rotation:
        room.players = room.players.filter((p) => p.color !== color);
        room.hasRolled[color] = false;
        room.hasMoved[color] = false;

        // 3) Adjust currentTurnIndex so the next person in the new array is up:
        if (room.players.length > 0) {
          room.currentTurnIndex = room.currentTurnIndex % room.players.length;
        } else {
          // (everyone finished—game over)
          room.currentTurnIndex = null;
          // Schedule chat closure once the game ends
          setTimeout(() => {
            io.to(roomCode).emit("chat-closed");
          }, 5 * 60 * 1000); // 5 minutes
        }
        // ─── RECORD STATS FOR 2P IMMEDIATELY WHEN SOMEONE WINS ───
        if (room.mode === "2P") {
          try {
            // all participants
            const allIds = room.participants.map((p) => p.userId);
            await Player.updateMany(
              { userId: { $in: allIds } },
              { $inc: { totalGamesPlayed: 1 } }
            );
            // this winner
            await Player.findOneAndUpdate(
              {
                userId: room.participants.find((p) => p.color === color).userId,
              },
              {
                $inc: {
                  totalWins: 1,
                  wins2P: 1,
                },
              }
            );
          } catch (err) {
            console.error("Failed to write 2P game stats:", err);
          }
        }
        // ─── RECORD STATS FOR 4P AS SOON AS FIRST PLACE FINISHES ───
        if (room.mode === "4P" && room.finishOrder.length === 1) {
          try {
            // 1) everybody played a game
            const allIds = room.participants.map((p) => p.userId);
            await Player.updateMany(
              { userId: { $in: allIds } },
              { $inc: { totalGamesPlayed: 1 } }
            );
            // 2) only the first‐placer gets wins4P
            const winnerId = room.participants.find(
              (p) => p.color === color
            ).userId;
            await Player.findOneAndUpdate(
              { userId: winnerId },
              { $inc: { totalWins: 1, wins4P: 1 } }
            );
          } catch (err) {
            console.error("Failed to write 4P game stats:", err);
          }
        }
      }

      // “Extra‐roll if they finished one token but still have others”
      const justFinishedOne =
        !finished && // (if finished===true, that falls into the block above instead)
        typeof tokenIdx === "number" &&
        newArr[tokenIdx] === FINISHED &&
        !newArr.every((s) => s === FINISHED);

      if (justFinishedOne) {
        if (value !== 6) {
          room.consecutiveSixes[color] = 0;
        }
        // keep same turn index → they get to roll again
        room.hasRolled[color] = false;
        room.hasMoved[color] = false;
      } else if (!finished) {
        // Normal turn advance if no capture and no six
        if (!isCapture && value !== 6) {
          room.currentTurnIndex =
            (room.currentTurnIndex + 1) % room.players.length;
        }
        // If they captured or rolled a six, same turnIndex again
        if (isCapture || value === 6) {
          room.hasRolled[color] = false;
          room.hasMoved[color] = false;
        } else {
          // We truly moved on: clear flags for the new current player
          const nextColor = room.players[room.currentTurnIndex]?.color;
          if (nextColor) {
            room.hasRolled[nextColor] = false;
            room.hasMoved[nextColor] = false;
          }
        }
      }

      // Broadcast move + captures + finished flag
      io.to(roomCode).emit("dice-rolled-broadcast", {
        color,
        value,
        updatedSteps,
        capture: isCapture,
        finished,
      });

      // After 2s, announce whoever’s next (unless game over)
      setTimeout(() => {
        if (room.currentTurnIndex !== null && room.players.length > 0) {
          const nextColor = room.players[room.currentTurnIndex].color;
          // Clear next player’s flags just in case
          room.hasRolled[nextColor] = false;
          room.hasMoved[nextColor] = false;
          io.to(roomCode).emit("turn-change", { currentTurnColor: nextColor });
        }
      }, 2000);
    }
  );

  // Chat
  socket.on("chat-message", async ({ roomCode, playerId, text }) => {
    const room = rooms[roomCode];
    if (!room) return;
    // Rate limit chat messages per user
    try {
      await msgLimiter.consume(socket.user._id.toString());
    } catch {
      return; // silently drop when exceeding limit
    }

    // Validate membership
    const player = room.players.find(
      (p) => p.userId === socket.user._id.toString() && p.userId === playerId
    );
    if (!player) return; // ignore non-members or impersonation

    // Validate and sanitize text
    if (typeof text !== "string") return;
    const trimmed = text.trim();
    if (trimmed.length === 0 || trimmed.length > 500) return;
    const cleanText = sanitizeHtml(trimmed, {
      allowedTags: [],
      allowedAttributes: {},
    });
    io.to(roomCode).emit("chat-message", {
      playerId: socket.user._id.toString(),
      name: player.username,
      text: cleanText,
      ts: Date.now(),
    });
  });

  // ── 1) “private-message” with persistent deliveredAt & ACK ──
  socket.on("private-message", async ({ to, text }, callback) => {
    // 1) Rate-limit by user ID
    try {
      await msgLimiter.consume(socket.user._id.toString());
    } catch {
      return callback({ status: "error", message: "Too many messages" });
    }

    // 2) Validate & sanitize the payload
    if (typeof text !== "string" || text.length > 500) {
      return callback({ status: "error", message: "Invalid message" });
    }
    const cleanText = sanitizeHtml(text, {
      allowedTags: [],
      allowedAttributes: {},
    });

    // 3) Persist & broadcast
    try {
      const now = new Date();
      const msg = await Message.create({
        from: socket.user._id,
        to,
        text: cleanText,
        deliveredAt: now,
      });

      // A) ACK back to sender
      callback({
        status: "ok",
        id: msg._id.toString(),
        deliveredAt: msg.deliveredAt,
      });

      // B) Emit full payload (readAt is null initially)
      io.to(to.toString())
        .to(socket.user._id.toString())
        .emit("private-message", {
          _id: msg._id.toString(),
          from: msg.from.toString(),
          to: msg.to.toString(),
          text: msg.text,
          createdAt: msg.createdAt,
          deliveredAt: msg.deliveredAt,
          readAt: msg.readAt,
        });
    } catch (err) {
      console.error("Socket private-message save error:", err);
      callback({ status: "error", message: "Server error" });
    }
  });

  // ── 2) “message-seen” read-receipt persistence & broadcast ──
  socket.on("message-seen", async ({ messageId, from }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      msg.readAt = new Date();
      await msg.save();
      // Notify the original sender that their messageId was seen
      io.to(from.toString()).emit("message-seen", {
        messageId,
        readAt: msg.readAt,
      });
    } catch (err) {
      console.error("Error saving read receipt:", err);
    }
  });
});

// ─── Garbage-collect empty rooms older than 5 minutes ───
setInterval(() => {
  const now = Date.now();
  for (const code in rooms) {
    const room = rooms[code];
    if (
      room.players.length === 0 &&
      now - (room.createdAt || now) > 5 * 60 * 1000
    ) {
      console.log(`🗑️ Deleting stale room ${code}`);
      delete rooms[code];
    }
  }
}, 60 * 1000);

// ─── Auto-close idle lobbies ─────────────────────────
const IDLE_LIMIT = 10 * 60 * 1000; // 10 minutes
const CHECK_FREQ = 60 * 1000; // every 1 minute

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of Object.entries(rooms)) {
    // only target rooms that haven’t started yet
    if (!room.started) {
      const last = room.lastActive || room.createdAt;
      if (now - last > IDLE_LIMIT) {
        // notify and evict
        io.to(code).emit("room-closed", {
          message: "Room expired due to inactivity.",
        });
        for (const sid of io.sockets.adapter.rooms.get(code) || []) {
          io.sockets.sockets.get(sid)?.leave(code);
        }
        delete rooms[code];
        console.log(`🗑️ Closed idle lobby ${code}`);
      }
    }
  }
}, CHECK_FREQ);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  if (process.env.NODE_ENV === "development") {
    console.log(`🔒 HTTPS Dev server running on https://localhost:${PORT}`);
  } else {
    console.log(`🚀 HTTP Server running on port ${PORT}`);
  }
});
