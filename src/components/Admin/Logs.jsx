import React from "react";
import useSWR from "swr";
import api from "../../utils/api";

const fetcher = (url) => api.get(url).then((res) => res.data);

export default function Logs() {
  const { data, error } = useSWR("/admin/logs", fetcher);

  if (error)
    return <p className="p-4 alert alert-error">Failed to load logs.</p>;
  if (!data) return <p className="p-4">Loading…</p>;

  return (
    <section className="mt-4 space-y-1 text-sm">
      <h2 className="text-lg font-bold mb-2">Admin Logs</h2>
      <ul className="divide-y">
        {data.logs.map((log, i) => (
          <li key={i} className="py-1">
            <span className="font-mono text-xs mr-2">
              {new Date(log.timestamp).toLocaleString()}
            </span>
            <span className="font-semibold mr-1">{log.user}</span>
            <span className="mr-1">{log.action}</span>
            {log.meta && Object.keys(log.meta).length > 0 && (
              <code className="break-all">{JSON.stringify(log.meta)}</code>
            )}
          </li>
        ))}
        {data.logs.length === 0 && <li>No log entries found.</li>}
      </ul>
    </section>
  );
}
