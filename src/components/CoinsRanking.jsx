import React, { useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import api from "../utils/api";
import { getCountryFlag } from "../utils/countries";

export default function CoinsRanking() {
  const LIMIT = 20;

  const fetcher = (url) => api.get(url).then((res) => res.data);
  const { data: myRank } = useSWR("/ranking/coins/me", fetcher);
  const [scope, setScope] = useState("world");
  const getKey = (pageIndex, prev) => {
    if (scope === "country" && !myRank) return null;
    if (prev && prev.players.length < LIMIT) return null;
    const countryParam =
      scope === "country" && myRank ? `&country=${myRank.country}` : "";
    return `/ranking/coins?page=${pageIndex + 1}&limit=${LIMIT}${countryParam}`;
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
      {myRank && (
        <div className="bg-white/70 p-3 rounded-md mb-2 text-sm">
          <p className="font-medium mb-1">
            {getCountryFlag(myRank.country)} {myRank.country}
          </p>
          <p>
            🌐 World rank: {Number(myRank.worldRank).toLocaleString()} /{" "}
            {Number(myRank.worldTotal).toLocaleString()}
          </p>
          <p>
            Country rank: {Number(myRank.countryRank).toLocaleString()} /{" "}
            {Number(myRank.countryTotal).toLocaleString()}
          </p>
        </div>
      )}
      <div className="flex border-b mb-2">
        <button
          onClick={() => {
            setScope("world");
            setSize(1);
          }}
          className={`flex-1 py-2 text-center font-medium transition-colors ${
            scope === "world"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Worldwide
        </button>
        <button
          onClick={() => {
            setScope("country");
            setSize(1);
          }}
          className={`flex-1 py-2 text-center font-medium transition-colors ${
            scope === "country"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          {myRank ? myRank.country : "Country"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-700">
              <th className="px-2 py-1">#</th>
              <th className="px-2 py-1">Player</th>
              <th className="px-2 py-1">Country</th>
              <th className="px-2 py-1 text-right">Coins</th>
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
                <td className="px-2 py-1 text-right">{p.coins}</td>
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
