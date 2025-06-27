// src/context/SocketContex.jsx
import React, { createContext, useContext, useEffect } from "react";
import socket from "../socket";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(socket);

export function SocketProvider({ children }) {
  const { user } = useAuth();

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
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
