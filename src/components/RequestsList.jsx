// src/components/RequestsList.jsx
import React from "react";
import useSWRInfinite from "swr/infinite";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function RequestsList() {
  const navigate = useNavigate();
  const LIMIT = 15;

  // SWR infinite setup
  const fetcher = (url) => api.get(url).then((res) => res.data.requests);
  const getKey = (pageIndex, previousPage) => {
    if (previousPage && previousPage.length < LIMIT) return null;
    return `/friend-requests/received?page=${pageIndex + 1}&limit=${LIMIT}`;
  };
  const {
    data: pages,
    error,
    size,
    setSize,
    mutate,
    isLoading,
  } = useSWRInfinite(getKey, fetcher);

  const reqs = pages ? pages.flat() : [];
  const hasMore = pages ? pages[pages.length - 1].length === LIMIT : false;

  const respond = async (id, accept) => {
    try {
      await api.post(`/friend-requests/${id}`, { accept });
      await mutate(); // refresh pages
    } catch {
      console.error("Failed to respond.");
    }
  };

  if (error) return <div className="text-red-500">Error loading requests.</div>;
  if (!pages) return <div>Loading requests…</div>;

  return (
    <>
      <div className="max-h-[60vh] overflow-y-auto">
        <ul className="space-y-3">
          {reqs.map((r) => (
            <li key={r.id} className="flex items-center justify-between">
              {/* Avatar+Name */}
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => navigate(`/profile/${r.fromUserId}`)}
              >
                <img
                  src={r.avatarUrl || "/default-avatar.png"}
                  alt={r.fromUsername}
                  className="w-10 h-10 rounded-full"
                />
                <span className="font-medium">{r.fromUsername}</span>
              </div>

              {/* Accept / Decline */}
              <div className="space-x-2">
                <button
                  onClick={() => respond(r.id, true)}
                  className="btn btn-secondary text-sm px-2 py-1"
                >
                  Accept
                </button>
                <button
                  onClick={() => respond(r.id, false)}
                  className="btn btn-warning text-sm px-2 py-1"
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
          {reqs.length === 0 && <li className="text-gray-500">No requests.</li>}
        </ul>
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setSize(size + 1)}
            disabled={isLoading}
            className="btn btn-primary text-sm px-2 py-1"
          >
            {isLoading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
