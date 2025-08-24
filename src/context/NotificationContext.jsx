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
import { useSWRConfig } from "swr";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const socket = useSocket();
  const { mutate: globalMutate } = useSWRConfig();
  const [chatCount, setChatCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [lastSeen, setLastSeen] = useState(null);
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

  // load last seen timestamp for notifications
  useEffect(() => {
    if (!user) {
      setLastSeen(null);
      return;
    }
    const key = `notifLastSeen_${user._id || user.id}`;
    setLastSeen(localStorage.getItem(key));
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
        const list = data.notifications || [];
        setNotifications(list);
        if (lastSeen) {
          const last = new Date(lastSeen).getTime();
          const count = list.filter(
            (n) => new Date(n.createdAt).getTime() > last
          ).length;
          setNotifCount(count);
        } else {
          setNotifCount(list.length);
        }
      } catch (err) {
        console.error("Failed to load notifications", err);
      }
    })();
  }, [user, lastSeen]);

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

  // update friends (and requests) when a request is accepted or a friend is removed
  useEffect(() => {
    if (!socket) return;
    const updateFriends = () => {
      globalMutate(
        (key) =>
          typeof key === "string" &&
          (key.startsWith("/friend-requests/friends") ||
            key.startsWith("/friend-requests/received")),
        undefined,
        { revalidate: true }
      );
    };
    socket.on("friend-accepted", updateFriends);
    socket.on("friend-removed", updateFriends);
    return () => {
      socket.off("friend-accepted", updateFriends);
      socket.off("friend-removed", updateFriends);
    };
  }, [socket, globalMutate]);

  const clearChat = useCallback(() => setChatCount(0), []);
  const clearRequests = useCallback(() => setRequestCount(0), []);
  const clearNotifications = useCallback(() => {
    setNotifCount(0);
    const key = user ? `notifLastSeen_${user._id || user.id}` : null;
    const now = new Date().toISOString();
    if (key) {
      localStorage.setItem(key, now);
    }
    setLastSeen(now);
  }, [user]);

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
