// src/components/Chat/ChatProvider.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import socket from "../../socket";

const ChatCtx = createContext();
export const useChat = () => useContext(ChatCtx);

export function ChatProvider({ roomCode, children }) {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // listen for incoming chat
  useEffect(() => {
    socket.on("chat-message", (msg) => {
      setMessages((m) => [...m, msg]);
    });
    return () => {
      socket.off("chat-message");
    };
  }, []);

  const sendMessage = (text) => {
    const playerId = localStorage.getItem("playerId");
    socket.emit("chat-message", { roomCode, playerId, text });
  };

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);

  return (
    <ChatCtx.Provider
      value={{ messages, sendMessage, isOpen, openChat, closeChat }}
    >
      {children}
    </ChatCtx.Provider>
  );
}
