import React, { useState, useEffect } from "react";
import useSWRInfinite from "swr/infinite";
import api from "../utils/api";
import { getCountryFlag } from "../utils/countries";
import { useAuth } from "../context/AuthContext";

export default function TrophiesRanking() {
  const LIMIT = 20;

  const [scope, setScope] = useState("world");

  const { player } = useAuth();
  const fetcher = (url) => api.get(url).then((res) => res.data);
  const getKey = (pageIndex, prev) => {
    if (scope === "country" && !player?.country) return null;
    if (prev && prev.players.length < LIMIT) return null;
    const countryParam =
      scope === "country" && player?.country
        ? `&country=${player.country}`
        : "";
    return `/ranking/trophies?page=${
      pageIndex + 1
    }&limit=${LIMIT}${countryParam}`;
  };

  const { data, size, setSize, isLoading, error, mutate } = useSWRInfinite(
    getKey,
    fetcher,
    { revalidateOnMount: false }
  );

  useEffect(() => {
    if (!data) {
      mutate();
    }
  }, [data, mutate]);

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
      <div className="flex justify-center gap-5 mb-2">
        <button
          onClick={() => {
            setScope("world");
            setSize(1);
          }}
          className={`px-4 py-1 text-sm rounded-full font-medium transition-colors ${
            scope === "world"
              ? "bg-header text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Worldwide
        </button>
        <button
          onClick={() => {
            setScope("country");
            setSize(1);
          }}
          className={`px-4 py-1 text-sm rounded-full font-medium transition-colors ${
            scope === "country"
              ? "bg-header text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {player?.country || "Country"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-700">
              <th className="px-2 py-1">#</th>
              <th className="px-2 py-1">Player</th>
              <th className="px-2 py-1">Country</th>
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
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="font-medium">{p.username}</span>
                  </div>
                </td>
                <td className="px-2 py-1">
                  <div className="flex items-center gap-1">
                    <span>{getCountryFlag(p.country)}</span>
                    <span>{p.country}</span>
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
