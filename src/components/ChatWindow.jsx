// src/components/ChatWindow.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import useSWRInfinite from "swr/infinite";
import api from "../utils/api";
import { useSocket } from "../context/SocketContext";
import { FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";

export default function ChatWindow({ user: partner, onBack }) {
  const LIMIT = 10;
  const { user: me, setPlayer } = useAuth();
  const socket = useSocket();
  const showAlert = useAlert();
  const myId = me._id || me.id;
  const activeUserId = partner.id;

  // 1) SWR key function
  const getKey = (pageIndex, previousPage) => {
    if (!activeUserId) return null;
    // stop if no more
    if (previousPage && previousPage.length < LIMIT) return null;
    return `/chat/${activeUserId}/messages?page=${
      pageIndex + 1
    }&limit=${LIMIT}`;
  };

  // 2) Fetcher
  const fetcher = (url) => api.get(url).then((res) => res.data.messages);

  // 3) SWR Infinite with dedupe + no focus revalidate
  const {
    data: pages,
    size,
    setSize,
    mutate,
    error,
  } = useSWRInfinite(getKey, fetcher, {
    // never revalidate page 1 automatically:
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateFirstPage: false,
    revalidateIfStale: false,
    dedupeInterval: 60_000, // still dedupe duplicates for 1m
  });

  // 4) Flatten pages
  const remoteMessages = useMemo(
    () => (pages ? pages.slice().reverse().flat() : []),
    [pages]
  );

  // 5) Optimistic buffer
  const [optimistic, setOptimistic] = useState([]);

  // 6) Combined view
  const messages = [...remoteMessages, ...optimistic];

  // 6b) De-duplicate by _id so map(key={_id}) never sees the same
  const uniqueMessages = useMemo(() => {
    const seen = new Set();
    return messages.filter((m) => {
      if (seen.has(m._id)) return false;
      seen.add(m._id);
      return true;
    });
  }, [messages]);

  // 7) Pagination
  const hasMore = pages?.[pages.length - 1]?.length === LIMIT;

  // 8) Scroll & load-earlier logic
  const scrollRef = useRef();
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showLoadEarlier, setShowLoadEarlier] = useState(false);

  const onScroll = (e) => {
    const el = e.currentTarget;
    const atTop = el.scrollTop < 50;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setShowLoadEarlier(hasMore && atTop);
    setIsAtBottom(atBottom);
  };

  // auto-scroll when new remote messages arrive (but not when user scrolls up)
  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [remoteMessages]);

  // reset on chat switch
  useEffect(() => {
    setSize(1);
    setOptimistic([]);
  }, [activeUserId, setSize]);

  // 9) Socket: append incoming
  useEffect(() => {
    const handler = (msg) => {
      if (msg.from === activeUserId || msg.to === activeUserId) {
        mutate((old) => {
          if (!old) return old;
          const newPages = [...old];
          // pageIndex=0 always holds the newest messages
          newPages[0] = [...(newPages[0] || []), msg];
          return newPages;
        }, false);
      }
    };
    socket.on("private-message", handler);
    return () => socket.off("private-message", handler);
  }, [activeUserId, mutate]);

  // SOCKET: patch in read receipts
  useEffect(() => {
    const handleSeen = ({ messageId, readAt }) => {
      mutate((pages) => {
        if (!pages) return pages;
        // pages is Array<Array<message>>
        return pages.map((page) =>
          page.map((msg) =>
            msg._id === messageId ? { ...msg, readAt: new Date(readAt) } : msg
          )
        );
      }, false);
    };
    socket.on("message-seen", handleSeen);
    return () => socket.off("message-seen", handleSeen);
  }, [mutate]);
  // ─── SOCKET: emit read receipt for last incoming message ───
  useEffect(() => {
    if (remoteMessages.length) {
      const last = remoteMessages[remoteMessages.length - 1];
      // only if it’s from the other user and not already read
      if (last.from === activeUserId && !last.readAt) {
        socket.emit("message-seen", {
          messageId: last._id,
          from: last.from,
        });
      }
    }
  }, [remoteMessages, activeUserId]);
  // 10) Send with optimistic update
  const [input, setInput] = useState("");
  const send = () => {
    if (!input.trim()) return;
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const tempMsg = {
      _id: tempId,
      from: myId,
      to: activeUserId,
      text: input,
      createdAt: now,
      deliveredAt: null,
      readAt: null,
    };

    // 10a) Optimistically append
    setOptimistic((o) => [...o, tempMsg]);
    setInput("");

    // 10b) Emit
    socket.emit("private-message", { to: activeUserId, text: input }, (ack) => {
      if (ack.status === "ok") {
        // replace temp with real
        setOptimistic((o) => o.filter((m) => m._id !== tempId));
        mutate((old) => {
          if (!old) return old;
          const newPages = [...old];
          // patch only page 0 (the newest chunk)
          newPages[0] = newPages[0].map((m) =>
            m._id === tempId
              ? { ...m, _id: ack.id, deliveredAt: ack.deliveredAt }
              : m
          );
          return newPages;
        }, false);
        if (typeof ack.balance === "number") {
          setPlayer((prev) => (prev ? { ...prev, coins: ack.balance } : prev));
        }
      } else {
        // error – you could mark temp as “failed” here
        showAlert("Message failed to send", "error");
      }
    });
  };
  if (error)
    return (
      <div className="flex flex-col items-center justify-center p-4 gap-2">
        <div>Failed to load messages.</div>
        <button onClick={() => mutate()} className="btn btn-primary btn-sm">
          Retry
        </button>
      </div>
    );
  if (!pages) return <div className="p-4 text-center">Loading messages…</div>;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-3 border-b">
        <button onClick={onBack} className="mr-3">
          <FaArrowLeft />
        </button>
        <img
          src={partner.avatarUrl || "/default-avatar.png"}
          alt={partner.username}
          className="w-8 h-8 rounded-full mr-2"
        />
        <span className="font-semibold">{partner.username}</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        onScroll={onScroll}
      >
        {showLoadEarlier && (
          <div className="text-center mb-2">
            <button
              onClick={() => setSize(size + 1)}
              className="text-sm text-blue-600 hover:underline"
            >
              Load earlier messages
            </button>
          </div>
        )}

        {uniqueMessages.map((m) => (
          <div
            key={m._id}
            className={`flex ${
              m.from === activeUserId ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`px-3 py-2 rounded-lg max-w-[60%] ${
                m.from === activeUserId
                  ? "bg-gray-200 text-gray-800"
                  : "bg-blue-500 text-white"
              }`}
            >
              <div>{m.text}</div>
              <div className="mt-1 text-xs text-gray-400 text-right">
                {new Date(m.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Status on last outgoing */}
        {messages.length > 0 && messages[messages.length - 1].from === myId && (
          <div className="text-right text-xs text-gray-500">
            {(() => {
              const last = messages[messages.length - 1];
              if (!last.deliveredAt) return "Sending…";
              if (!last.readAt) return "Sent";
              return "Seen";
            })()}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
