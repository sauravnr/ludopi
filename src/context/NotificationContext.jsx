import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";
import api from "../utils/api";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const socket = useSocket();
  const [chatCount, setChatCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [chatTabOpen, setChatTabOpen] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState(null);

  // initial friend request count
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await api.get(
          "/friend-requests/received?page=1&limit=50"
        );
        setRequestCount(data.requests?.length || 0);
      } catch (err) {
        console.error("Failed to load friend request count", err);
      }
    })();
  }, [user]);

  // load recent notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setNotifCount(0);
      return;
    }
    (async () => {
      try {
        const { data } = await api.get("/notifications");
        setNotifications(data.notifications || []);
        setNotifCount(data.notifications?.length || 0);
      } catch (err) {
        console.error("Failed to load notifications", err);
      }
    })();
  }, [user]);

  // handle incoming chat messages
  useEffect(() => {
    if (!socket) return;
    const handleMsg = (msg) => {
      const myId = user?._id || user?.id;
      if (msg.from !== myId && (!chatTabOpen || activeChatUser !== msg.from)) {
        setChatCount((c) => Math.min(99, c + 1));
      }
    };
    socket.on("private-message", handleMsg);
    return () => socket.off("private-message", handleMsg);
  }, [socket, user, chatTabOpen, activeChatUser]);

  // incoming general notifications
  useEffect(() => {
    if (!socket) return;
    const handleNotification = (n) => {
      setNotifications((list) => [n, ...list].slice(0, 5));
      setNotifCount((c) => Math.min(99, c + 1));
    };
    socket.on("notification", handleNotification);
    return () => socket.off("notification", handleNotification);
  }, [socket]);

  // listen for incoming friend requests
  const incrementRequest = useCallback(() => {
    setRequestCount((c) => Math.min(99, c + 1));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleRequest = (req) => {
      const myId = user?._id || user?.id;
      if (req.to === myId) incrementRequest();
    };
    socket.on("friend-request", handleRequest);
    return () => socket.off("friend-request", handleRequest);
  }, [socket, user, incrementRequest]);

  const clearChat = useCallback(() => setChatCount(0), []);
  const clearRequests = useCallback(() => setRequestCount(0), []);
  const clearNotifications = useCallback(() => setNotifCount(0), []);

  const total = chatCount + requestCount + notifCount;

  return (
    <NotificationContext.Provider
      value={{
        chatCount,
        requestCount,
        notifications,
        notifCount,
        total,
        clearChat,
        clearRequests,
        clearNotifications,
        setChatTabOpen,
        setActiveChatUser,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
