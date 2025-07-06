import React from "react";
import useSWRInfinite from "swr/infinite";
import api from "../utils/api";

export default function TrophiesRanking() {
  const LIMIT = 20;

  const fetcher = (url) => api.get(url).then((res) => res.data);
  const getKey = (pageIndex, prev) => {
    if (prev && prev.players.length < LIMIT) return null;
    return `/ranking/trophies?page=${pageIndex + 1}&limit=${LIMIT}`;
  };

  const { data, size, setSize, isLoading, error } = useSWRInfinite(
    getKey,
    fetcher
  );

  const players = data ? data.flatMap((p) => p.players) : [];
  const hasMore = data ? data[data.length - 1].players.length === LIMIT : false;

  if (error)
    return (
      <div className="flex items-center justify-center h-full text-gray-600">
        Failed to load ranking.
      </div>
    );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-700">
              <th className="px-2 py-1">#</th>
              <th className="px-2 py-1">Player</th>
              <th className="px-2 py-1 text-right">Trophies</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, idx) => (
              <tr key={p.playerId} className="border-t">
                <td className="px-2 py-1 w-8">{idx + 1}</td>
                <td className="px-2 py-1">
                  <div className="flex items-center gap-2">
                    <img
                      src={p.avatarUrl || "/default-avatar.png"}
                      alt={p.username}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="font-medium">{p.username}</span>
                  </div>
                </td>
                <td className="px-2 py-1 text-right">{p.trophies}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && !players.length && (
          <div className="text-center py-4 text-gray-600">Loading…</div>
        )}
      </div>

      {hasMore && (
        <div className="p-2 text-center">
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
