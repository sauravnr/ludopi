import React from "react";
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
  if (error)
    return <p className="p-4 alert alert-error">Failed to load withdrawals.</p>;
  if (!data) return null;
  const withdrawals = data.flatMap((p) => p.withdrawals);
  const hasMore = data[data.length - 1].withdrawals.length === LIMIT;

  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold mb-2">Pending PIP Withdrawals</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-1">Player</th>
            <th className="p-1 text-right">Amount</th>
            <th className="p-1">Requested</th>
          </tr>
        </thead>
        <tbody>
          {withdrawals.map((w) => (
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
          {!withdrawals.length && (
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
