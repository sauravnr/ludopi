// src/components/LudoCanvas.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import Dice from "./Dice";
import { useSocket } from "../context/SocketContext";

// dice dimensions in pixels
const DICE_SIZE = 56;

// preload token PNGs at 3 resolutions (64,128,192 px)
const tokenImages = {};
["red", "yellow", "green", "blue"].forEach((color) => {
  tokenImages[color] = {};
  [64, 128, 192].forEach((size) => {
    const img = new Image();
    img.src = `/tokens/${color}-${size}.png`;
    tokenImages[color][size] = img;
  });
});

const MAIN_STARS = [
  [2, 6],
  [6, 12],
  [8, 2],
  [12, 8],
];
const CORRIDOR_STARS = [
  [6, 1],
  [1, 8],
  [13, 6],
  [8, 13],
];
const STAR_COUNTER_ROTATION = Math.PI / 2 - 0.6;

// → sentinel for a token that has finished
const FINISHED = -2;

// ── Helper: build a 5-point star centered at 0,0 ──────────
function makeStarPath(outerR, innerR, points = 5) {
  const star = new Path2D();
  const step = Math.PI / points;
  // zero‐offset: starts one point to the right, so star sits “upright”
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    i === 0 ? star.moveTo(x, y) : star.lineTo(x, y);
  }
  star.closePath();
  return star;
}

const rotationMap = {
  red: 270,
  yellow: 180,
  green: 0,
  blue: 90,
};

const positionMap = {
  green: {
    green: "bottom-left",
    yellow: "top-right",
    blue: "bottom-right",
    red: "top-left",
  },
  red: {
    red: "bottom-left",
    green: "bottom-right",
    yellow: "top-left",
    blue: "top-right",
  },
  yellow: {
    yellow: "bottom-left",
    green: "top-right",
    blue: "top-left",
    red: "bottom-right",
  },
  blue: {
    blue: "bottom-left",
    yellow: "bottom-right",
    green: "top-left",
    red: "top-right",
  },
};

const getRotatedPosition = (targetColor, localColor) =>
  positionMap[localColor]?.[targetColor] || "top-left";

// ← new: define each color’s path of [row, col] on the 15×15 grid
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
  [2, 6], // main board stars
  [6, 12],
  [8, 2],
  [12, 8],
  [6, 1], // corridor stars
  [1, 8],
  [13, 6],
  [8, 13],
];
// mapping tokens → spark colors
const SPARK_COLORS = {
  red: "#ff4d4f",
  yellow: "#ffcc00",
  green: "#00cc66",
  blue: "#00AAFF",
};

const drawBoard = (ctx, tileSize, playerColor) => {
  // 1) Draw every cell’s fill & faint grid
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      const isHomeBox =
        (row >= 1 && row <= 4 && col >= 1 && col <= 4) ||
        (row >= 1 && row <= 4 && col >= 10 && col <= 13) ||
        (row >= 10 && row <= 13 && col >= 1 && col <= 4) ||
        (row >= 10 && row <= 13 && col >= 10 && col <= 13);

      // → **Override** main‐star cells to grey background
      if (MAIN_STARS.some(([r, c]) => r === row && c === col)) {
        ctx.fillStyle = "#ddd";
      }
      // corridor entry & quadrant logic
      else if (row === 6 && col === 1) ctx.fillStyle = "#ff4d4f";
      else if (row === 1 && col === 8) ctx.fillStyle = "#ffcc00";
      else if (row === 13 && col === 6) ctx.fillStyle = "#00cc66";
      else if (row === 8 && col === 13) ctx.fillStyle = "#3399ff";
      else if (row < 6 && col < 6) ctx.fillStyle = "#ff4d4f";
      else if (row < 6 && col > 8) ctx.fillStyle = "#ffcc00";
      else if (row > 8 && col < 6) ctx.fillStyle = "#00cc66";
      else if (row > 8 && col > 8) ctx.fillStyle = "#3399ff";
      else if (row === 7 && col >= 1 && col <= 5) ctx.fillStyle = "#ff4d4f";
      else if (col === 7 && row >= 1 && row <= 5) ctx.fillStyle = "#ffcc00";
      else if (row === 7 && col >= 9 && col <= 13) ctx.fillStyle = "#3399ff";
      else if (col === 7 && row >= 9 && row <= 13) ctx.fillStyle = "#00cc66";
      else ctx.fillStyle = "#fff";

      // draw cell
      ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);

      // faint grid outside home‐boxes
      if (!isHomeBox) {
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.strokeRect(col * tileSize, row * tileSize, tileSize, tileSize);
      }
    }
  }

  // 2) Overlay each quadrant solidly (unchanged)
  ctx.fillStyle = "#ff4d4f";
  ctx.fillRect(0, 0, 6 * tileSize, 6 * tileSize);
  ctx.fillStyle = "#ffcc00";
  ctx.fillRect(9 * tileSize, 0, 6 * tileSize, 6 * tileSize);
  ctx.fillStyle = "#00cc66";
  ctx.fillRect(0, 9 * tileSize, 6 * tileSize, 6 * tileSize);
  ctx.fillStyle = "#3399ff";
  ctx.fillRect(9 * tileSize, 9 * tileSize, 6 * tileSize, 6 * tileSize);

  // 3) Draw all stars (white vector shapes)
  ctx.fillStyle = "#fff";

  // 3a) Main‐track stars (keep upright)
  const boardAngle = (rotationMap[playerColor] * Math.PI) / 180;

  // 3a) Main‐track stars (upright)
  MAIN_STARS.forEach(([r, c]) => {
    const x = c * tileSize + tileSize / 2;
    const y = r * tileSize + tileSize / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-boardAngle + STAR_COUNTER_ROTATION);
    ctx.fill(makeStarPath(tileSize * 0.4, tileSize * 0.18));
    ctx.restore();
  });

  // 3b) Corridor‐entry stars (upright)
  CORRIDOR_STARS.forEach(([r, c]) => {
    const x = c * tileSize + tileSize / 2;
    const y = r * tileSize + tileSize / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-boardAngle + STAR_COUNTER_ROTATION);
    ctx.fill(makeStarPath(tileSize * 0.4, tileSize * 0.18));
    ctx.restore();
  });

  // 4) Center triangles & home‐boxes (leave these as-is)
  drawCenterTriangles(ctx, tileSize);
  drawHomeBoxes(ctx, tileSize);
};

const drawCenterTriangles = (ctx, tileSize) => {
  const start = 6 * tileSize;
  const size = tileSize * 3;
  const mid = start + tileSize * 1.5;

  const triangles = [
    {
      color: "#ffcc00",
      points: [
        [start, start],
        [start + size, start],
      ],
    },
    {
      color: "#ff4d4f",
      points: [
        [start, start],
        [start, start + size],
      ],
    },
    {
      color: "#00cc66",
      points: [
        [start, start + size],
        [start + size, start + size],
      ],
    },
    {
      color: "#3399ff",
      points: [
        [start + size, start],
        [start + size, start + size],
      ],
    },
  ];

  for (const { color, points } of triangles) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    ctx.lineTo(...points[1]);
    ctx.lineTo(mid, mid);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
};

// Replace your existing drawHomeBoxes with this:

const drawHomeBoxes = (ctx, tileSize) => {
  const boxSize = tileSize * 4;
  const radius = tileSize * 0.5; // tweak for more/less rounding

  // Configure stroke + fill
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fillStyle = "#fff"; // interior
  ctx.strokeStyle = "#000"; // border
  ctx.lineWidth = 1;

  // The four home‐box origins
  const origins = [
    [1, 1], // top‐left
    [10, 1], // top‐right
    [1, 10], // bottom‐left
    [10, 10], // bottom‐right
  ];

  for (const [gx, gy] of origins) {
    const x = gx * tileSize;
    const y = gy * tileSize;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + boxSize - radius, y);
    ctx.quadraticCurveTo(x + boxSize, y, x + boxSize, y + radius);

    ctx.lineTo(x + boxSize, y + boxSize - radius);
    ctx.quadraticCurveTo(
      x + boxSize,
      y + boxSize,
      x + boxSize - radius,
      y + boxSize
    );

    ctx.lineTo(x + radius, y + boxSize);
    ctx.quadraticCurveTo(x, y + boxSize, x, y + boxSize - radius);

    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    ctx.fill(); // white interior, clipped to rounded shape
    ctx.stroke(); // black border exactly on the curve
  }

  // restore defaults if you like
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
};

// In LudoCanvas.jsx, above drawArrows:
const makeChevron = (w, h) => {
  // Creates a ">" chevron centered at (0,0), width w, height h
  const p = new Path2D();
  p.moveTo(-w / 2, -h / 2); // top-left
  p.lineTo(w / 2, 0); // point
  p.lineTo(-w / 2, h / 2); // bottom-left
  p.closePath();
  return p;
};

// Replace drawArrows with:
const drawArrows = (ctx, tileSize) => {
  const size = tileSize * 0.6; // 60% of a cell
  const arrow = makeChevron(size, size);

  // center text mode off (we're drawing a path)
  ctx.save();
  // ctx.shadowBlur = size * 0.15;
  // ctx.shadowColor = "rgba(0,0,0,0.3)";

  const configs = [
    { x: 7.5, y: 0.5, rot: Math.PI / 2, color: "#ffcc00" }, // down (yellow)
    { x: 0.5, y: 7.5, rot: 0, color: "#ff4d4f" }, // right (red)
    { x: 14.5, y: 7.5, rot: Math.PI, color: "#3399ff" }, // left (blue)
    { x: 7.5, y: 14.5, rot: -Math.PI / 2, color: "#00cc66" }, // up (green)
  ];

  for (const { x, y, rot, color } of configs) {
    ctx.save();
    ctx.translate(x * tileSize, y * tileSize);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.fill(arrow);
    ctx.restore();
  }

  ctx.restore();
};

const LudoCanvas = ({
  roomCode,
  playerColor,
  playerId,
  players = [],
  currentTurnColor,
  gameOver,
}) => {
  const socket = useSocket();
  const canvasRef = useRef(null);
  // ── SPINNER SETUP ──────────────────────────────────────
  // holds our continuous angle, doesn’t trigger React renders:
  const spinAngleRef = useRef(0);
  // RAF handle so we can cancel on unmount:
  const rafRef = useRef(null);
  // list of active spin‐overlays (no React state to avoid re-renders):
  const spinnersRef = useRef([]);
  // ← NEW: ref for in-flight jump animations
  const jumpsRef = useRef([]);
  // ← NEW: capture fade-out animations
  const fadesRef = useRef([]);
  // ← NEW: spark-in animations when token hits home
  const sparksRef = useRef([]);
  // rotate a grid [row,col] into pixel coords after canvas rotation
  const project = (r, c) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const tile = rect.width / 15;
    const x = c * tile + tile / 2;
    const y = r * tile + tile / 2;
    // rotation in radians
    const θ = (rotationMap[playerColor] * Math.PI) / 180;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const rx = dx * Math.cos(θ) - dy * Math.sin(θ) + cx;
    const ry = dx * Math.sin(θ) + dy * Math.cos(θ) + cy;
    return [rx, ry, tile];
  };

  // offscreen‐canvas refs for caching the static board drawing
  const boardCacheRef = useRef(null);
  const lastPlayerColorRef = useRef(null);

  const [timer, setTimer] = useState(12); // drives auto-roll logic
  const [rolledDice, setRolledDice] = useState({});
  const [visibleDice, setVisibleDice] = useState({});
  const [rollingDice, setRollingDice] = useState({});
  const [localTurnColor, setLocalTurnColor] = useState(null);
  const [hasRolled, setHasRolled] = useState(false);
  const [pendingRoll, setPendingRoll] = useState(null);
  // track four tokens per color; -1 = still at home
  const [tokenSteps, setTokenSteps] = useState({
    red: [-1, -1, -1, -1],
    yellow: [-1, -1, -1, -1],
    green: [-1, -1, -1, -1],
    blue: [-1, -1, -1, -1],
  });
  // ← NEW: ref to always have the latest tokenSteps inside your socket handler
  const tokenStepsRef = useRef(tokenSteps);
  useEffect(() => {
    tokenStepsRef.current = tokenSteps;
  }, [tokenSteps]);

  // ← NEW: precompute “groups of tokens per cell” whenever players or tokenSteps change
  const groupsRef = useRef({});

  useEffect(() => {
    const newGroups = {};
    players.forEach((p) => {
      (tokenSteps[p.color] || []).forEach((step, idx) => {
        // figure out (row,col) exactly as before
        let coord;
        if (step === -1) {
          coord = homeIntersections[p.color][idx];
        } else if (step >= 0 && step < PATHS[p.color].length) {
          coord = PATHS[p.color][step];
        } else {
          return;
        }
        const key = `${coord[0]}-${coord[1]}`;
        if (!newGroups[key]) newGroups[key] = [];
        newGroups[key].push({ color: p.color, idx });
      });
    });
    groupsRef.current = newGroups;
  }, [players, tokenSteps]);

  const isLocalTurn = localTurnColor === playerColor;

  // ── Only emit intent if click is on one of this player's tokens ──
  const handleCanvasClick = (e) => {
    if (gameOver) return; // don’t let anyone move tokens once game is over
    // 1) Must be local player's turn and have a roll pending
    if (!isLocalTurn || pendingRoll == null) return;

    // 2) Figure out mouse coords in board-space:
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tile = rect.width / 15;
    const tol = tile * 0.6; // clickable radius around each token

    // 3) Look at each of this player's tokens in tokenSteps[playerColor].
    const myArr = tokenStepsRef.current[playerColor] || [];
    const pathLen = PATHS[playerColor].length;

    for (let idx = 0; idx < myArr.length; idx++) {
      const step = myArr[idx];

      // a) If the token is already finished, skip it entirely.
      if (step === FINISHED) continue;

      // b) Determine its grid-coords (home vs on-board):
      let coord; // [row, col]
      if (step === -1) {
        // still at home → use homeIntersections
        // BUT only allow if pendingRoll === 6
        if (pendingRoll !== 6) continue;
        coord = homeIntersections[playerColor][idx];
      } else {
        // on-board → only allow if it can move
        if (step + pendingRoll > pathLen - 1) {
          // overshoot → cannot move
          continue;
        }
        coord = PATHS[playerColor][step];
      }

      // 4) Convert grid [row, col] → pixel center (after rotation):
      const [cx, cy] = project(coord[0], coord[1]);

      // 5) If click is within tol pixels of (cx, cy), that's a valid hit:
      if (Math.hypot(x - cx, y - cy) < tol) {
        // ✅ User clicked on a LEGAL token (#idx). Emit intent:
        socket.emit("dice-move-intent", {
          roomCode,
          color: playerColor,
          tokenIdx: idx,
          value: pendingRoll,
        });
        // Clear pendingRoll so they can’t click again until next roll
        setPendingRoll(null);
        return;
      }
    }

    // If we get here, click was NOT on a legally movable token → ignore
  };
  useEffect(() => {
    if (!currentTurnColor) return;
    // Mirror PlayRoom's initial turn-change if socket missed it
    setLocalTurnColor(currentTurnColor);
    setVisibleDice((v) => ({ ...v, [currentTurnColor]: true }));
    setHasRolled(false);
    setTimer(12);
  }, [currentTurnColor]);

  // ── Countdown & auto-roll logic (patched) ─────────────────────
  useEffect(() => {
    if (!isLocalTurn) return;
    setTimer(12);
    setVisibleDice((v) => ({ ...v, [playerColor]: true }));

    let didRoll = false;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (pendingRoll != null) return t; // ← don’t tick down while waiting
        if (t <= 1) {
          clearInterval(interval);
          if (!didRoll) {
            didRoll = true;
            // auto-roll
            handleDiceRoll();
            socket.emit("bot-toggle", {
              roomCode,
              color: playerColor,
              enabled: true,
            });
            setVisibleDice((v) => {
              const upd = { ...v };
              delete upd[playerColor];
              return upd;
            });
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocalTurn, playerColor, pendingRoll]);

  // Socket listeners
  useEffect(() => {
    const onDice = ({ color, value, updatedSteps }) => {
      console.log(`📣 Broadcast → ${color} rolled`, value);

      // CASE A: single-color move
      if (Array.isArray(updatedSteps)) {
        setTokenSteps((ts) => {
          const oldArr = ts[color] || [];
          const newArr = updatedSteps;
          const diffs = newArr
            .map((step, idx) =>
              step !== oldArr[idx] ? { idx, from: oldArr[idx], to: step } : null
            )
            .filter(Boolean);

          diffs.forEach(({ idx, from, to }) => {
            const segments = [];
            for (let i = 1; i <= to - from; i++) {
              segments.push({ from: from + i - 1, to: from + i });
            }
            jumpsRef.current.push({
              color,
              tokenIdx: idx,
              segments,
              segIdx: 0,
              start: performance.now(),
            });
          });

          return { ...ts, [color]: newArr };
        });
        return;
      }

      // CASE B: multi-color update (captures, simultaneous moves…)
      if (
        updatedSteps !== null &&
        typeof updatedSteps === "object" &&
        !Array.isArray(updatedSteps)
      ) {
        // ← NEW: detect captured tokens (oldStep ≥0 → newStep === -1) and queue their fade
        Object.entries(updatedSteps).forEach(([clr, newArr]) => {
          const oldArr = tokenStepsRef.current[clr] || [];
          oldArr.forEach((oldStep, idx) => {
            if (oldStep >= 0 && newArr[idx] === -1) {
              // capture detected → queue fade _and_ record its home coords
              fadesRef.current.push({
                color: clr,
                tokenIdx: idx,
                step: oldStep,
                start: performance.now(),
                dest: homeIntersections[clr][idx],
              });
            }
          });
        });

        setTokenSteps((ts) => {
          const copy = { ...ts };
          Object.entries(updatedSteps).forEach(([clr, newArr]) => {
            const oldArr = ts[clr] || [];
            const diffs = newArr
              .map((step, idx) =>
                step !== oldArr[idx]
                  ? { idx, from: oldArr[idx], to: step }
                  : null
              )
              .filter(Boolean);

            diffs.forEach(({ idx, from, to }) => {
              const segments = [];
              for (let i = 1; i <= to - from; i++) {
                segments.push({ from: from + i - 1, to: from + i });
              }
              jumpsRef.current.push({
                color: clr,
                tokenIdx: idx,
                segments,
                segIdx: 0,
                start: performance.now(),
              });
            });

            copy[clr] = newArr;
          });
          return copy;
        });
        return;
      }

      // CASE C: just the roll/spin animation (no movement)
      setRollingDice((r) => ({ ...r, [color]: true }));
      setVisibleDice((v) => ({ ...v, [color]: true }));

      setTimeout(() => {
        setRollingDice((r) => {
          const u = { ...r };
          delete u[color];
          return u;
        });
        setRolledDice((r) => ({ ...r, [color]: value }));
        if (color === playerColor) {
          setPendingRoll(value);
          console.log("🎲 You rolled:", value);

          const myArr = tokenStepsRef.current[playerColor] || [];
          const pathLen = PATHS[playerColor].length;
          const canBringOut = value === 6 && myArr.some((pos) => pos === -1);
          const canMove = myArr.some(
            (pos) => pos >= 0 && pos + value <= pathLen - 1
          );

          if (!canBringOut && !canMove) {
            socket.emit("dice-move-intent", {
              roomCode,
              color: playerColor,
              value,
            });
            setPendingRoll(null);
          }
        }
        setTimeout(() => {
          setVisibleDice((v) => {
            const u = { ...v };
            delete u[color];
            return u;
          });
          setRolledDice((r) => {
            const u = { ...r };
            delete u[color];
            return u;
          });
        }, 2000);
      }, 1000);
    };

    const onTurn = ({ currentTurnColor }) => {
      setHasRolled(false);
      setPendingRoll(null); // ← clear any leftover roll
      setLocalTurnColor(currentTurnColor);
      setRolledDice({});
      setVisibleDice({});
      setRollingDice({});
      setTimer(12);
      setVisibleDice((v) => ({ ...v, [currentTurnColor]: true }));
    };

    socket.on("dice-rolled-broadcast", onDice);
    socket.on("turn-change", onTurn);
    const onSync = ({ tokenSteps }) => {
      if (tokenSteps) setTokenSteps(tokenSteps);
    };
    socket.on("state-sync", onSync);

    return () => {
      socket.off("dice-rolled-broadcast", onDice);
      socket.off("turn-change", onTurn);
      socket.off("state-sync", onSync);
    };
  }, [playerColor]);

  const handleDiceRoll = () => {
    if (gameOver) return; // don’t let anyone roll once game is over
    if (!isLocalTurn || hasRolled) return;
    setHasRolled(true);

    // 1) Locally start your own spinner immediately
    setRollingDice((r) => ({ ...r, [playerColor]: true }));
    setVisibleDice((v) => ({ ...v, [playerColor]: true }));

    // 2) SEND “spin only” to server right away
    socket.emit("dice-spin-intent", {
      roomCode,
      color: playerColor,
    });

    // spinner will stop when server broadcasts the roll result
  };

  // for overlay clicks: the [row,col] of each home‐box position
  const homeIntersections = {
    red: [
      [1.5, 1.5],
      [1.5, 3.5],
      [3.5, 1.5],
      [3.5, 3.5],
    ],
    yellow: [
      [1.5, 10.5],
      [1.5, 12.5],
      [3.5, 10.5],
      [3.5, 12.5],
    ],
    green: [
      [10.5, 1.5],
      [10.5, 3.5],
      [12.5, 1.5],
      [12.5, 3.5],
    ],
    blue: [
      [10.5, 10.5],
      [10.5, 12.5],
      [12.5, 10.5],
      [12.5, 12.5],
    ],
  };
  // Board drawing
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // 1) Measure container minus padding
    const parent = canvas.parentElement;
    const style = window.getComputedStyle(parent);
    const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const cssWidth = parent.clientWidth - padX;
    const cssHeight = parent.clientHeight - padY;
    const cssSize = Math.min(cssWidth, cssHeight);

    // 2) HiDPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;

    // 3) Scale so 1 unit = 1 CSS px
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // 4) Compute tile size for a 15×15 grid
    const tileSize = cssSize / 15;

    // 5) Clear & rotate
    ctx.clearRect(0, 0, cssSize, cssSize);
    const angle = rotationMap[playerColor] || 0;
    ctx.save();
    ctx.translate(cssSize / 2, cssSize / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.translate(-cssSize / 2, -cssSize / 2);

    // ── USE CACHED OFFSCREEN CANVAS FOR BOARD + ARROWS ──
    if (!boardCacheRef.current || lastPlayerColorRef.current !== playerColor) {
      // 1) Create offscreen at HiDPI resolution
      const offscreen = document.createElement("canvas");
      offscreen.width = cssSize * dpr;
      offscreen.height = cssSize * dpr;
      const offCtx = offscreen.getContext("2d");
      offCtx.scale(dpr, dpr);

      // 2) Draw board + arrows ONCE onto offscreen
      drawBoard(offCtx, tileSize, playerColor);
      drawArrows(offCtx, tileSize);

      // 3) Cache it
      boardCacheRef.current = offscreen;
      lastPlayerColorRef.current = playerColor;
    }

    // 4) Blit cached board onto real canvas
    ctx.drawImage(boardCacheRef.current, 0, 0, cssSize, cssSize);

    // Restore to draw tokens un-rotated
    ctx.restore();
    // ── HOMEBOX TOKEN PLACEHOLDERS ───────────────────────
    ["red", "yellow", "green", "blue"].forEach((color) => {
      homeIntersections[color].forEach(([r, c]) => {
        const [cx, cy, tile] = project(r, c);
        const radius = tile * 0.5; // adjust size as needed
        ctx.save();
        ctx.fillStyle = "#ededed"; // light grey background
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    });
    // ── SPINNERS FOR PENDING ROLLS ──────────────────────
    if (pendingRoll != null) {
      // Collect screen coords for every pending token
      const spinCoords = [];
      tokenSteps[playerColor].forEach((pos, idx) => {
        if (pendingRoll === 6 && pos === -1) {
          spinCoords.push(homeIntersections[playerColor][idx]);
        } else if (pos >= 0) {
          spinCoords.push(PATHS[playerColor][pos]);
        }
      });

      // ── COMET-STYLE SPINNER ──────────────────────
      spinCoords.forEach(([r, c]) => {
        const [cx, cy, tile] = project(r, c);
        const baseR = tile * 0.45;
        const ringW = tile * 0.08;
        const segmentCount = 5;
        const segmentAngle = (Math.PI * 2) / segmentCount;
        const segmentLength = segmentAngle * 0.6;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(spinAngleRef.current);

        for (let i = 0; i < segmentCount; i++) {
          const start = i * segmentAngle;
          ctx.strokeStyle = "#FF6600"; // solid orange for all
          ctx.lineWidth = ringW;
          ctx.beginPath();
          ctx.arc(0, 0, baseR, start, start + segmentLength);
          ctx.stroke();
        }
        ctx.restore();
      });
    }

    // ── DRAW SPINNING OVERLAYS ───────────────────────────

    spinnersRef.current.forEach(({ color, tokenIdx, start }) => {
      // get that token’s current step:
      const step = tokenSteps[color][tokenIdx];
      if (step < 0 || step >= PATHS[color].length) return;
      // compute its screen center:
      const [cx, cy, tile] = project(...PATHS[color][step]);
      const diam = tile * 1.5;
      const offsetY = diam * 0.2; // same lift as your token

      // draw a rotating ring centered under the token:
      ctx.save();
      ctx.translate(cx, cy - offsetY);
      ctx.rotate(spinAngleRef.current);
      ctx.lineWidth = tile * 0.1;
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(0, 0, diam * 0.7, 0, Math.PI * 1.5); // 270° arc → you’ll see it rotate
      ctx.stroke();
      ctx.restore();
    });

    // ── DRAW ACTIVE JUMPS ───────────────────────────────
    const now = performance.now();
    const DURATION = 300; // ms per hop
    const running = [];

    jumpsRef.current.forEach((jump) => {
      let { segments, segIdx, start, color, tokenIdx } = jump;
      let elapsed = now - start;

      // advance through any completed hops (including the final one)
      while (elapsed >= DURATION && segIdx < segments.length) {
        elapsed -= DURATION;
        segIdx++;
        start += DURATION;
      }

      // if there’s still a hop to draw, render it
      if (segIdx < segments.length) {
        const t = Math.min(elapsed / DURATION, 1);
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        const { from, to } = segments[segIdx];
        const fromCoord =
          from < 0 ? homeIntersections[color][tokenIdx] : PATHS[color][from];
        const toCoord =
          to < 0 ? homeIntersections[color][tokenIdx] : PATHS[color][to];
        const [fx, fy, tileSize] = project(...fromCoord);
        const [tx, ty] = project(...toCoord);
        const height = tileSize * 0.5;

        const x = fx + (tx - fx) * e;
        const y = fy + (ty - fy) * e - Math.sin(Math.PI * e) * height;

        const diam = tileSize * 1.5;
        const realPx = diam * window.devicePixelRatio;
        const size = [64, 128, 192].find((s) => s >= realPx) || 192;
        const img = tokenImages[color][size];
        if (img.complete) {
          // draw a subtle shadow beneath the hopping token
          ctx.save();
          ctx.filter = `blur(${2 * window.devicePixelRatio}px)`; // tweak px
          ctx.globalAlpha = 0.3 * (1 - e);
          ctx.fillStyle = "black";
          ctx.beginPath();
          // x,y is the token center; adjust vertical offset for the board
          ctx.ellipse(
            x,
            y + tileSize * 0.4,
            tileSize * 0.2 * (1 - Math.sin(Math.PI * e) * 0.6),
            tileSize * 0.1 * (1 - Math.sin(Math.PI * e) * 0.6),
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.translate(x, y - diam * 0.2);
          ctx.drawImage(img, -diam / 2, -diam / 2, diam, diam);
          ctx.restore();
        }

        // write back the updated segIdx & start
        jump.segIdx = segIdx;
        jump.start = start;
        running.push(jump);
      }
    });

    // replace with only the still-in-flight hops
    jumpsRef.current = running;

    // ← NEW: handle fade-out animations
    {
      const now = performance.now();
      const DURATION = 900; // fade lasts 900ms
      const stillFades = [];
      fadesRef.current.forEach(({ color, tokenIdx, step, start, dest }) => {
        const t = (now - start) / DURATION;
        if (t < 1) {
          const alpha = 1 - t;
          // compute on-board pixel position:
          const [cx, cy, tile] = project(...PATHS[color][step]);
          const diam = tile * 1.5;
          const size =
            [64, 128, 192].find((s) => s >= diam * window.devicePixelRatio) ||
            192;
          const img = tokenImages[color][size];
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(cx, cy - diam * 0.2);
          ctx.drawImage(img, -diam / 2, -diam / 2, diam, diam);
          ctx.restore();
          stillFades.push({ color, tokenIdx, step, start, dest });
        } else {
          // fade complete → queue spark at home
          sparksRef.current.push({
            color,
            tokenIdx,
            start: now,
            // propagate the home‐cell coords so spark knows where to draw
            dest,
          });
        }
      });
      fadesRef.current = stillFades;
    }

    // ← Enhanced spark effect in home box
    {
      const now = performance.now();
      const SPARK_DUR = 800; // lengthen the fade-out for a bit more drama

      sparksRef.current = sparksRef.current.filter(
        ({ color, tokenIdx, start, dest }) => {
          const t = (now - start) / SPARK_DUR;
          if (t < 1) {
            const [cx, cy, tile] = project(...dest);

            ctx.save();
            ctx.globalAlpha = 1 - t;

            // pick the spark color based on which token was captured
            const sparkColor = SPARK_COLORS[color] || "#fff";
            ctx.strokeStyle = sparkColor;
            ctx.fillStyle = sparkColor;

            // scale line width + add a glow
            ctx.lineWidth = tile * 0.04;
            ctx.shadowBlur = tile * 0.1;
            ctx.shadowColor = sparkColor;

            // draw multiple rays + little spark dots
            const sparksCount = 8;
            for (let i = 0; i < sparksCount; i++) {
              const angle =
                -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3);
              const len = tile * (0.3 + 0.6 * Math.random()) * (1 - t);

              const x2 = cx + Math.cos(angle) * len;
              const y2 = cy + tile / 2 + Math.sin(angle) * len;

              // ray
              ctx.beginPath();
              ctx.moveTo(cx, cy + tile / 2);
              ctx.lineTo(x2, y2);
              ctx.stroke();

              // spark dot
              ctx.beginPath();
              ctx.arc(x2, y2, tile * 0.04, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.restore();
            return true;
          }
          return false;
        }
      );
    }

    // ── 7) Draw tokens upright with grid-based stacking ─────────────────
    Object.entries(groupsRef.current).forEach(([cell, tokens]) => {
      // cell = "row-col"
      // Filter out any token that’s mid‐hop, fading, or sparking
      const staticTokens = tokens.filter((t) => {
        // if there’s a jump where segIdx < segments.length, skip
        if (
          jumpsRef.current.some(
            (j) =>
              j.color === t.color &&
              j.tokenIdx === t.idx &&
              j.segIdx < j.segments.length
          )
        ) {
          return false;
        }
        // skip if still fading out
        if (
          fadesRef.current.some(
            (f) => f.color === t.color && f.tokenIdx === t.idx
          )
        ) {
          return false;
        }
        // skip if still in spark
        if (
          sparksRef.current.some(
            (s) => s.color === t.color && s.tokenIdx === t.idx
          )
        ) {
          return false;
        }
        return true;
      });

      if (staticTokens.length === 0) {
        return; // nothing to draw here
      }

      const [row, col] = cell.split("-").map(Number);
      const [cx, cy, tile] = project(row, col);
      const baseDiam = tile * 1.5;
      const lift = baseDiam * 0.2;

      // clamp to at most 4 tokens drawn
      const toDraw = staticTokens.slice(0, 4);
      const extras = staticTokens.length - toDraw.length;

      // pick offsets for 1–4 tokens
      const gridOffsets = {
        1: [[0, 0]],
        2: [
          [-1, 0],
          [1, 0],
        ],
        3: [
          [-1, -1],
          [1, -1],
          [0, 1],
        ],
        4: [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ],
      }[toDraw.length];

      const unit = tile * 0.25;
      const diam = baseDiam * (staticTokens.length > 1 ? 0.8 : 1);
      const realPx = diam * window.devicePixelRatio;
      const size = [64, 128, 192].find((s) => s >= realPx) || 192;

      // draw each of the up-to-4 tokens
      toDraw.forEach((t, i) => {
        const [ox, oy] = gridOffsets[i];
        const x = cx + ox * unit;
        const y = cy - lift + oy * unit;
        const img = tokenImages[t.color][size];
        if (!img.complete) return;
        ctx.save();
        ctx.translate(x, y);
        ctx.drawImage(img, -diam / 2, -diam / 2, diam, diam);
        ctx.restore();
      });

      // if more than 4, draw “+N”
      if (extras > 0) {
        ctx.save();
        ctx.font = `${tile * 0.6}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.fillText(`+${extras}`, cx, cy - lift);
        ctx.restore();
      }
    });
  }, [playerColor, players, tokenSteps, pendingRoll]);

  useEffect(() => {
    // initial draw
    drawCanvas();

    // ── THROTTLED RESIZE HANDLER ──
    const resizeTimeoutRef = { current: null };
    const handleResize = () => {
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
        drawCanvas();
      }, 100);
    };

    window.addEventListener("resize", handleResize);

    // hook up onload for token images, but remember old handlers
    const prevOnloads = [];
    Object.values(tokenImages).forEach((map) =>
      Object.values(map).forEach((img) => {
        prevOnloads.push({ img, old: img.onload });
        img.onload = drawCanvas;
      })
    );

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeoutRef.current);
      // restore each img.onload to its previous value
      prevOnloads.forEach(({ img, old }) => {
        img.onload = old;
      });
    };
  }, [drawCanvas]);

  // ── START ANIMATION LOOP ───────────────────────────────
  useEffect(() => {
    const loop = () => {
      // advance rotation:
      spinAngleRef.current += 0.03; // ← tweak speed here
      // prune old spinners after 700ms:
      const now = performance.now();
      spinnersRef.current = spinnersRef.current.filter(
        (sp) => now - sp.start < 700
      );
      drawCanvas(); // redraw board + overlays
      // ONLY schedule next frame if there’s still something animating:
      if (
        pendingRoll != null ||
        jumpsRef.current.length > 0 ||
        fadesRef.current.length > 0 ||
        sparksRef.current.length > 0
      ) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawCanvas]);

  // Render player UI & dice
  const renderAllPlayerUI = () => {
    const posStyles = {
      "bottom-left": "absolute -bottom-[4rem] left-2",
      "bottom-right": "absolute -bottom-[4rem] right-2",
      "top-left": "absolute -top-[4rem] left-2",
      "top-right": "absolute -top-[4rem] right-2",
    };

    return players.map((p) => {
      const pos = getRotatedPosition(p.color, playerColor);
      const myTurn = p.color === playerColor && isLocalTurn;
      const curr = p.color === localTurnColor;
      const isLeftSide = pos.endsWith("left");
      // if pos is "bottom-left" or "bottom-right", swap the column order
      const isBottom = pos.startsWith("bottom");

      return (
        <div
          key={p.playerId}
          className={`${posStyles[pos]} flex ${
            isBottom ? "flex-col-reverse" : "flex-col"
          } items-center`}
        >
          <div className="flex items-center gap-2">
            {isLeftSide ? (
              <>
                {/* Avatar on left-side players */}
                <div className="w-12 h-12 bg-white rounded-lg border border-gray-300 relative overflow-hidden">
                  {curr && (
                    <div
                      className="absolute inset-0 bg-pink-500 rounded-full"
                      style={{
                        animation: "countdownRing 12s linear forwards",
                      }}
                    />
                  )}
                </div>
                {/* Dice to the right of avatar */}
                <div
                  className="flex items-center justify-center"
                  style={{ width: DICE_SIZE, height: DICE_SIZE }}
                >
                  {(myTurn || visibleDice[p.color]) && (
                    <div
                      className={`transition-opacity duration-300 ${
                        visibleDice[p.color] ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <div className="dice-pit">
                        <Dice
                          onRoll={handleDiceRoll}
                          disabled={!myTurn || hasRolled}
                          rollingNow={rollingDice[p.color]}
                          forcedFace={rolledDice[p.color]}
                          size={56}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Dice on left for right-side players */}
                <div
                  className="flex items-center justify-center"
                  style={{ width: DICE_SIZE, height: DICE_SIZE }}
                >
                  {(myTurn || visibleDice[p.color]) && (
                    <div
                      className={`transition-opacity duration-300 ${
                        visibleDice[p.color] ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <div className="dice-pit">
                        <Dice
                          onRoll={handleDiceRoll}
                          disabled={!myTurn || hasRolled}
                          rollingNow={rollingDice[p.color]}
                          forcedFace={rolledDice[p.color]}
                          size={56}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {/* Avatar on right-side players */}
                <div className="w-12 h-12 bg-white rounded-lg border border-gray-300 relative overflow-hidden">
                  {curr && (
                    <div
                      className="absolute inset-0 bg-pink-500 rounded-full"
                      style={{
                        animation: "countdownRing 12s linear forwards",
                      }}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          <div className="text-base font-bold text-white text-center leading-tight">
            {p.name || "Unknown"}
            <br />
            <span className="text-xs text-gray-300">({p.color})</span>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="relative w-full mx-auto aspect-square px-1">
      <canvas
        ref={canvasRef}
        className="w-full h-full box-border rounded-xl border border-black"
        onClick={handleCanvasClick}
      />
      {renderAllPlayerUI()}
    </div>
  );
};

export default LudoCanvas;
