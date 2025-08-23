// src/components/FriendList.jsx
import React, { useState } from "react";
import Modal from "./Modal";
import useSWRInfinite from "swr/infinite";
import { useNavigate } from "react-router-dom";
import { FaComment, FaEllipsisV } from "react-icons/fa";
import api from "../utils/api";

export default function FriendsList({ onMessageClick }) {
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState(null);
  const LIMIT = 15;

  const fetcher = (url) => api.get(url).then((res) => res.data.friends);
  const getKey = (pageIndex, prev) =>
    prev && prev.length < LIMIT
      ? null
      : `/friend-requests/friends?page=${pageIndex + 1}&limit=${LIMIT}`;
  const {
    data: pages,
    error,
    size,
    setSize,
    mutate,
    isLoading,
  } = useSWRInfinite(getKey, fetcher, { revalidateFirstPage: false });

  const friends = pages ? pages.flat() : [];
  const hasMore = pages?.[pages.length - 1]?.length === LIMIT;

  const [unfriendTarget, setUnfriendTarget] = useState(null);
  const toggleMenu = (id) => setOpenMenuId((o) => (o === id ? null : id));
  const handleUnfriend = (friend) => {
    setOpenMenuId(null);
    setUnfriendTarget(friend);
  };
  const confirmUnfriend = async () => {
    if (!unfriendTarget) return;
    await api.delete(`/friend-requests/friends/${unfriendTarget.userId}`);
    await mutate();
    setOpenMenuId(null);
    setUnfriendTarget(null);
  };
  const handleBlock = async (userId) => {
    if (!confirm("Block this user?")) return;
    await api.post("/block", { userId });
    await mutate();
    setOpenMenuId(null);
  };

  if (error)
    return (
      <div className="flex flex-col items-center justify-center p-4 gap-2">
        <div className="alert alert-error">Failed to load friends.</div>
        <button onClick={() => mutate()} className="btn btn-primary btn-sm">
          Retry
        </button>
      </div>
    );
  if (!pages) return <div>Loading friends…</div>;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-3">
          {friends.map((f) => (
            <li key={f.userId} className="flex items-center justify-between">
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => navigate(`/profile/${f.userId}`)}
              >
                <img
                  src={f.avatarUrl || "/default-avatar.png"}
                  alt={f.username}
                  className="w-10 h-10 rounded-full"
                />
                <span className="font-medium">{f.username}</span>
              </div>

              <div className="flex items-center gap-2 relative">
                <FaComment
                  className="cursor-pointer text-gray-600 hover:text-gray-800"
                  onClick={() =>
                    onMessageClick({
                      id: f.userId,
                      username: f.username,
                      avatarUrl: f.avatarUrl,
                    })
                  }
                />
                <FaEllipsisV
                  className="cursor-pointer text-gray-600 hover:text-gray-800"
                  onClick={() => toggleMenu(f.userId)}
                />
                {openMenuId === f.userId && (
                  <div className="absolute right-0 top-full mt-2 w-32 bg-white border rounded shadow-lg z-10">
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100"
                      onClick={() => handleUnfriend(f)}
                    >
                      Unfriend
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100"
                      onClick={() => handleBlock(f.userId)}
                    >
                      Block
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
          {!friends.length && (
            <li className="text-gray-500">No friends yet.</li>
          )}
        </ul>
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setSize(size + 1)}
            disabled={isLoading}
            className="text-sm text-blue-600 hover:underline"
          >
            {isLoading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
      {unfriendTarget && (
        <Modal
          show={!!unfriendTarget}
          title={`Unfriend ${unfriendTarget.username}`}
          onClose={() => setUnfriendTarget(null)}
          footer={[
            {
              label: "Cancel",
              variant: "secondary",
              onClick: () => setUnfriendTarget(null),
            },
            { label: "Confirm", onClick: confirmUnfriend },
          ]}
        >
          <p>Remove {unfriendTarget.username} from your friends?</p>
        </Modal>
      )}
    </div>
  );
}
