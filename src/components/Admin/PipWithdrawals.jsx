import React, { useState } from "react";
import useSWRInfinite from "swr/infinite";
import api from "../../utils/api";

export default function PipWithdrawals() {
  const LIMIT = 50;
  const fetcher = (url) => api.get(url).then((res) => res.data);
  const getKey = (pageIndex, prev) =>
    prev && prev.withdrawals.length < LIMIT
      ? null
      : `/admin/pip/withdrawals?page=${pageIndex + 1}&limit=${LIMIT}`;

  const { data, error, size, setSize, isLoading, mutate } = useSWRInfinite(
    getKey,
    fetcher
  );
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  if (error)
    return <p className="p-4 alert alert-error">Failed to load withdrawals.</p>;
  if (!data) return null;
  const withdrawals = data.flatMap((p) => p.withdrawals);
  const hasMore = data[data.length - 1].withdrawals.length === LIMIT;

  const filtered = withdrawals
    .filter((w) => {
      const q = search.toLowerCase();
      return (
        w.userId?.username?.toLowerCase().includes(q) ||
        String(w.amount).includes(q)
      );
    })
    .sort((a, b) => {
      let valA;
      let valB;
      if (sortKey === "amount") {
        valA = a.amount;
        valB = b.amount;
      } else {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold mb-2">Pending PIP Withdrawals</h2>
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
          <option value="date">Date</option>
          <option value="amount">Amount</option>
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
            <th className="p-1 text-right">Amount</th>
            <th className="p-1">Requested</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((w) => (
            <tr key={w._id} className="border-t">
              <td className="p-1">{w.userId?.username}</td>
              <td className="p-1 text-right">{w.amount}</td>
              <td className="p-1">
                {new Date(w.createdAt).toLocaleDateString()}
                <div className="mt-1 space-x-2">
                  <button
                    onClick={async () => {
                      await api.patch(`/admin/pip/withdrawals/${w._id}`, {
                        status: "completed",
                      });
                      mutate();
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Approve
                  </button>
                  <button
                    onClick={async () => {
                      await api.patch(`/admin/pip/withdrawals/${w._id}`, {
                        status: "rejected",
                      });
                      mutate();
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!filtered.length && (
            <tr>
              <td className="p-2 text-center" colSpan="3">
                No withdrawals
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
