import React, { useEffect, useState } from "react";
import api from "../../utils/api";
import Loader from "../Loader";

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/messages")
      .then(({ data }) => setMessages(data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  return (
    <section className="overflow-y-auto">
      <h2 className="text-lg font-bold mb-2">Recent Messages</h2>
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
          {messages.map((m) => (
            <tr key={m._id} className="border-t">
              <td className="p-1">{m.from?.username}</td>
              <td className="p-1">{m.to?.username}</td>
              <td className="p-1 max-w-xs break-words">{m.text}</td>
              <td className="p-1">{new Date(m.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {!messages.length && (
            <tr>
              <td className="p-2 text-center" colSpan="4">
                No messages
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
