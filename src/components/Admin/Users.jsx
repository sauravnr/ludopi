import React from "react";
import useSWRInfinite from "swr/infinite";
import api from "../../utils/api";

export default function Users() {
  const LIMIT = 20;

  const fetcher = (url) => api.get(url).then((res) => res.data);
  const getKey = (pageIndex, prev) =>
    prev && prev.users.length < LIMIT
      ? null
      : `/users?page=${pageIndex + 1}&limit=${LIMIT}`;

  const { data, error, size, setSize, isLoading } = useSWRInfinite(
    getKey,
    fetcher
  );

  const users = data ? data.flatMap((p) => p.users) : [];
  const hasMore = data ? data[data.length - 1].users.length === LIMIT : false;

  if (error)
    return <p className="p-4 alert alert-error">Failed to load users.</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Registered Users</h2>
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u._id} className="p-2 border rounded">
            <strong>{u.username}</strong> ({u.email})
          </li>
        ))}
        {!users.length &&
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
