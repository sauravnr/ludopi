// src/context/SocketContex.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import socket from "../socket";
import { useAuth } from "./AuthContext";

// The context stores the shared socket instance plus a simple
// connection status string ("connected", "reconnecting", "failed").
const SocketContext = createContext({
  socket,
  status: "disconnected",
  setStatus: () => {},
});

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [status, setStatus] = useState(
    socket.connected ? "connected" : "disconnected"
  );

  // Connect when a user is present, disconnect when logged out
  useEffect(() => {
    if (user && !socket.connected) {
      socket.connect();
    } else if (!user && socket.connected) {
      socket.disconnect();
    }
  }, [user]);

  // Always disconnect when provider unmounts
  useEffect(() => {
    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, status, setStatus }}>
      {children}
    </SocketContext.Provider>
  );
}

// Hook to get the raw socket instance
export function useSocket() {
  return useContext(SocketContext).socket;
}

// Hook to access connection status and updater
export function useSocketStatus() {
  const { status, setStatus } = useContext(SocketContext);
  return { status, setStatus };
}
