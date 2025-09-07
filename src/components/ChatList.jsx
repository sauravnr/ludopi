import React, { useEffect } from "react";
import useSWRInfinite from "swr/infinite";
import api from "../utils/api";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";

// Helper: split flat array into pages
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export default function ChatList({ onSelect }) {
  const LIMIT = 10;
  const { user: me } = useAuth();
  const socket = useSocket();
  const myId = me._id || me.id;

  // 1) infinite SWR, no auto-remount revalidation
  const {
    data: pages,
    size,
    setSize,
    mutate,
  } = useSWRInfinite(
    (index, prev) =>
      prev && prev.length < LIMIT
        ? null
        : `/chat/conversations?page=${index + 1}&limit=${LIMIT}`,
    (url) => api.get(url).then((r) => r.data.conversations),
    {
      dedupeInterval: 300_000, // 5m
      revalidateFirstPage: true, // default: fetch page1 on mount exactly once
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  // ─── re‐fetch on mount so we pick up any outgoing messages we missed ───
  useEffect(() => {
    // this forces SWR to go back to the server and pull fresh data
    mutate();
  }, [mutate]);

  const convs = pages?.flat() || [];
  const hasMore = pages?.[pages.length - 1]?.length === LIMIT;

  // 2) purely in-memory reorder on new messages
  useEffect(() => {
    const handler = (msg) => {
      const otherId = msg.from === myId ? msg.to : msg.from;

      mutate((oldPages) => {
        if (!oldPages) return oldPages;

        // flatten, drop old entry, prepend updated
        let flat = oldPages.flat().filter((c) => c.userId !== otherId);

        // find any existing metadata
        const existing =
          oldPages.flat().find((c) => c.userId === otherId) || {};

        flat.unshift({
          userId: otherId,
          username: existing.username || "",
          avatarUrl: existing.avatarUrl || "",
          lastMessage: msg.text,
          updatedAt: msg.createdAt,
          lastFrom: msg.from,
          lastReadAt: msg.readAt,
        });

        return chunk(flat, LIMIT);
      }, false); // <-- `false` means: update cache only, no HTTP
    };

    socket.on("private-message", handler);
    return () => socket.off("private-message", handler);
  }, [myId, mutate, socket]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y">
          {convs.map((c) => {
            const isUnread = c.lastFrom !== myId && !c.lastReadAt;
            return (
              <li
                key={c.userId}
                onClick={() => {
                  onSelect({
                    id: c.userId,
                    username: c.username,
                    avatarUrl: c.avatarUrl,
                  });
                  if (c.lastFrom !== myId && !c.lastReadAt) {
                    mutate((oldPages) => {
                      if (!oldPages) return oldPages;
                      const flat = oldPages.flat();
                      const idx = flat.findIndex(
                        (cc) => cc.userId === c.userId
                      );
                      if (idx >= 0) {
                        flat[idx] = {
                          ...flat[idx],
                          lastReadAt: new Date().toISOString(),
                        };
                      }
                      return chunk(flat, LIMIT);
                    }, false);
                  }
                }}
                className="p-3 cursor-pointer flex items-center gap-3 hover:bg-gray-100"
              >
                <img
                  src={c.avatarUrl || "/default-avatar.png"}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <div className={isUnread ? "font-bold" : "font-medium"}>
                    {c.username}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span
                      className={`truncate max-w-[150px] ${
                        isUnread ? "font-bold" : ""
                      }`}
                    >
                      {c.lastMessage.length > 15
                        ? `${c.lastMessage.slice(0, 15)}…`
                        : c.lastMessage}
                    </span>
                    <span
                      className={`ml-2 text-xs text-gray-400 ${
                        isUnread ? "font-bold" : ""
                      }`}
                    >
                      {new Date(c.updatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                {isUnread && (
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {hasMore && (
        <div className="p-2 text-center">
          <button
            onClick={() => setSize(size + 1)}
            className="text-sm text-blue-600 hover:underline"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
