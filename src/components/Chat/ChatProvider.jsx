// src/components/Chat/ChatProvider.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";

const ChatCtx = createContext();
export const useChat = () => useContext(ChatCtx);

export function ChatProvider({ roomCode, children }) {
  const socket = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [closed, setClosed] = useState(false);

  // listen for incoming chat
  useEffect(() => {
    socket.on("chat-message", (msg) => {
      setMessages((m) => [...m, msg]);
    });
    socket.on("chat-closed", () => {
      setIsOpen(false);
      setClosed(true);
      setMessages([]);
    });
    return () => {
      socket.off("chat-message");
      socket.off("chat-closed");
    };
  }, []);

  const sendMessage = (text) => {
    if (closed) return;
    const playerId = user?._id || user?.id;
    socket.emit("chat-message", { roomCode, playerId, text });
  };

  const openChat = () => {
    if (closed) return;
    setIsOpen(true);
  };
  const closeChat = () => setIsOpen(false);

  return (
    <ChatCtx.Provider
      value={{ messages, sendMessage, isOpen, openChat, closeChat }}
    >
      {children}
    </ChatCtx.Provider>
  );
}
