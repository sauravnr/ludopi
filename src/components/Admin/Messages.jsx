import React, { useState } from "react";
import useSWRInfinite from "swr/infinite";
import api from "../../utils/api";
import Loader from "../Loader";

export default function Messages() {
  const LIMIT = 50;
  const fetcher = (url) => api.get(url).then((res) => res.data);
  const getKey = (pageIndex, prev) =>
    prev && prev.messages.length < LIMIT
      ? null
      : `/admin/messages?page=${pageIndex + 1}&limit=${LIMIT}`;

  const { data, error, size, setSize, isLoading } = useSWRInfinite(
    getKey,
    fetcher
  );
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  if (error)
    return <p className="p-4 alert alert-error">Failed to load messages.</p>;
  if (!data) return <Loader />;
  const messages = data.flatMap((p) => p.messages);
  const hasMore = data[data.length - 1].messages.length === LIMIT;

  const filtered = messages
    .filter((m) => {
      const q = search.toLowerCase();
      return (
        m.text.toLowerCase().includes(q) ||
        m.from?.username?.toLowerCase().includes(q) ||
        m.to?.username?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const valA = new Date(a.createdAt).getTime();
      const valB = new Date(b.createdAt).getTime();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <section className="overflow-y-auto">
      <h2 className="text-lg font-bold mb-2">Recent Messages</h2>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="input input-sm input-bordered flex-1"
        />
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
            <th className="p-1">From</th>
            <th className="p-1">To</th>
            <th className="p-1">Text</th>
            <th className="p-1">At</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((m) => (
            <tr key={m._id} className="border-t">
              <td className="p-1">{m.from?.username}</td>
              <td className="p-1">{m.to?.username}</td>
              <td className="p-1 max-w-xs break-words">{m.text}</td>
              <td className="p-1">{new Date(m.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {!filtered.length && (
            <tr>
              <td className="p-2 text-center" colSpan="4">
                No messages
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
