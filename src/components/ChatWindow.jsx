// src/components/ChatWindow.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import useSWRInfinite from "swr/infinite";
import api from "../utils/api";
import { useSocket } from "../context/SocketContext";
import { FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";
import { formatChatTimestamp } from "../utils/formatChatTimestamp";

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
          const page = newPages[0] || [];
          const idx = page.findIndex((m) => m._id === msg._id);
          if (idx >= 0) {
            page[idx] = { ...page[idx], ...msg };
            newPages[0] = page;
          } else {
            newPages[0] = [...page, msg];
          }
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
          const realMsg = {
            ...tempMsg,
            _id: ack.id,
            deliveredAt: ack.deliveredAt,
            feeDeducted: ack.feeDeducted,
          };
          newPages[0] = [...(newPages[0] || []), realMsg];
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

        {uniqueMessages.map((m, i) => {
          const prev = uniqueMessages[i - 1];
          const senderIsVip = m.from === myId ? me?.isVip : partner?.isVip;
          const showBadge =
            m.from === myId &&
            m.feeDeducted &&
            (!prev || prev.from !== m.from) &&
            !senderIsVip;

          const badge = (
            <div className="flex items-center text-xs text-red-500 mx-1">
              -10
              <img
                src="/icons/coin.png"
                alt="coin"
                className="w-3 h-3 ml-0.5"
              />
            </div>
          );

          return (
            <div
              key={m._id}
              className={`flex items-center ${
                m.from === activeUserId ? "justify-start" : "justify-end"
              }`}
            >
              {m.from === myId && showBadge && badge}
              <div
                className={`px-3 py-2 rounded-lg max-w-[60%] ${
                  m.from === activeUserId
                    ? "bg-gray-200 text-gray-800"
                    : "bg-blue-500 text-white"
                }`}
              >
                <div>{m.text}</div>
                <div className="mt-1 text-xs text-gray-400 text-right">
                  {formatChatTimestamp(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}

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
