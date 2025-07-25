import React from "react";
import useSWRInfinite from "swr/infinite";
import api from "../../utils/api";

export default function Users() {
  const LIMIT = 20;

  const fetcher = (url) => api.get(url).then((res) => res.data);
  const getKey = (pageIndex, prev) =>
    prev && prev.players.length < LIMIT
      ? null
      : `/admin/users?page=${pageIndex + 1}&limit=${LIMIT}`;

  const { data, error, size, setSize, isLoading, mutate } = useSWRInfinite(
    getKey,
    fetcher
  );

  const players = data ? data.flatMap((p) => p.players) : [];
  const hasMore = data ? data[data.length - 1].players.length === LIMIT : false;

  if (error)
    return <p className="p-4 alert alert-error">Failed to load users.</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Registered Users</h2>
      <ul className="space-y-2">
        {players.map((p) => (
          <li
            key={p._id}
            className="p-2 border rounded flex justify-between items-center"
          >
            <span>
              <strong>{p.username}</strong> ({p.userId?.email})
              {p.isBanned && (
                <span className="ml-2 text-red-600">[banned]</span>
              )}
            </span>
            <button
              onClick={async () => {
                const reason = !p.isBanned
                  ? prompt("Reason for ban:") || ""
                  : null;
                const days = !p.isBanned
                  ? parseInt(prompt("Ban days", "1"), 10) || 0
                  : 0;
                const expiresAt = days
                  ? new Date(Date.now() + days * 86400000)
                  : null;
                if (!p.isBanned) {
                  await api.patch(`/admin/player/${p.userId._id}/ban`, {
                    reason,
                    expiresAt,
                  });
                } else {
                  await api.patch(`/admin/player/${p.userId._id}/unban`);
                }
                mutate();
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              {p.isBanned ? "Unban" : "Ban"}
            </button>
          </li>
        ))}
        {!players.length &&
          (isLoading ? (
            <li className="text-gray-500">Loading users…</li>
          ) : (
            <li className="text-gray-500">No users found.</li>
          ))}
      </ul>
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
    </div>
  );
}
