// src/components/Chat/ChatProvider.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { v4 as uuidv4 } from "uuid";
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
  const pendingRef = useRef([]);

  const flushQueue = useCallback(() => {
    pendingRef.current.forEach((msg) => {
      const playerId = user?._id || user?.id;
      socket
        .timeout(5000)
        .emit(
          "chat-message",
          { roomCode, playerId, text: msg.text, id: msg.id },
          (err) => {
            if (err) {
              setMessages((m) =>
                m.map((x) => (x.id === msg.id ? { ...x, status: "failed" } : x))
              );
            }
          }
        );
    });
  }, [roomCode, socket, user]);

  // listen for incoming chat
  useEffect(() => {
    const onMessage = (msg) => {
      setMessages((m) => {
        const idx = m.findIndex((x) => x.id === msg.id);
        if (idx !== -1) {
          const copy = [...m];
          copy[idx] = { ...copy[idx], ...msg, status: "sent" };
          pendingRef.current = pendingRef.current.filter(
            (x) => x.id !== msg.id
          );
          return copy;
        }
        return [...m, { ...msg, status: "sent" }];
      });
    };
    const onClosed = () => {
      setIsOpen(false);
      setClosed(true);
      setMessages([]);
      pendingRef.current = [];
    };
    socket.on("chat-message", onMessage);
    socket.on("chat-closed", onClosed);
    socket.on("connect", flushQueue);
    socket.on("reconnect", flushQueue);
    return () => {
      socket.off("chat-message", onMessage);
      socket.off("chat-closed", onClosed);
      socket.off("connect", flushQueue);
      socket.off("reconnect", flushQueue);
    };
  }, [socket, flushQueue]);

  const sendMessage = (text) => {
    if (closed) return;
    const playerId = user?._id || user?.id;
    const id = uuidv4();
    const tempMsg = {
      id,
      playerId,
      name: user?.username || user?.name || "You",
      text,
      status: "pending",
    };
    setMessages((m) => [...m, tempMsg]);
    pendingRef.current.push(tempMsg);

    if (!socket.connected) {
      setMessages((m) =>
        m.map((x) => (x.id === id ? { ...x, status: "failed" } : x))
      );
      return;
    }

    socket
      .timeout(5000)
      .emit("chat-message", { roomCode, playerId, text, id }, (err) => {
        if (err) {
          setMessages((m) =>
            m.map((x) => (x.id === id ? { ...x, status: "failed" } : x))
          );
        } else {
          setMessages((m) =>
            m.map((x) => (x.id === id ? { ...x, status: "sent" } : x))
          );
          pendingRef.current = pendingRef.current.filter((m) => m.id !== id);
        }
      });
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
