// src/socket.js
import { io } from "socket.io-client";

// Derive API and server URLs from Vite's env or fallback
const API = import.meta.env.VITE_API_URL || "https://ludopi.onrender.com/api";
const SERVER = API.replace("/api", "");

const socket = io(SERVER, {
  withCredentials: true,
  transports: ["polling", "websocket"], // start with polling, then upgrade
  autoConnect: false, // GameRoom/PlayRoom call socket.connect()
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  randomizationFactor: 0.5,
  timeout: 20000,
});

socket.on("connect_error", (err) => {
  console.warn("Socket connect error:", err.message);
});

export default socket;
