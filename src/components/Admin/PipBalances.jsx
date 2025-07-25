import React, { useState } from "react";
import useSWRInfinite from "swr/infinite";
import api from "../../utils/api";

export default function PipBalances() {
  const LIMIT = 50;
  const fetcher = (url) => api.get(url).then((res) => res.data);
  const getKey = (pageIndex, prev) =>
    prev && prev.players.length < LIMIT
      ? null
      : `/admin/pip/balances?page=${pageIndex + 1}&limit=${LIMIT}`;

  const { data, error, size, setSize, isLoading } = useSWRInfinite(
    getKey,
    fetcher
  );
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("username");
  const [sortOrder, setSortOrder] = useState("desc");
  if (error)
    return <p className="p-4 alert alert-error">Failed to load balances.</p>;
  if (!data) return null;
  const players = data.flatMap((p) => p.players);
  const hasMore = data[data.length - 1].players.length === LIMIT;

  const filtered = players
    .filter((p) => p.username.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const valA = sortKey === "balance" ? a.pipBalance : a.username;
      const valB = sortKey === "balance" ? b.pipBalance : b.username;
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold mb-2">Top PIP Balances</h2>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="input input-sm input-bordered flex-1"
        />
        <select
          className="select select-sm"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
        >
          <option value="username">Player</option>
          <option value="balance">Balance</option>
        </select>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        >
          {sortOrder === "asc" ? "▲" : "▼"}
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-1">Player</th>
            <th className="p-1 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => (
            <tr key={p.playerId} className="border-t">
              <td className="p-1">{p.username}</td>
              <td className="p-1 text-right">{p.pipBalance}</td>
            </tr>
          ))}
          {!filtered.length && (
            <tr>
              <td className="p-2 text-center" colSpan="2">
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {hasMore && (
        <div className="mt-2 text-center">
          <button
            onClick={() => setSize(size + 1)}
            disabled={isLoading}
            className="text-sm text-blue-600 hover:underline"
          >
            {isLoading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </section>
  );
}
