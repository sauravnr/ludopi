import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/users")
      .then((res) => {
        setUsers(res.data);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load users");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="p-4">Loading users…</p>;
  if (error) return <p className="p-4 alert alert-error">{error}</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Registered Users</h2>
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u._id} className="p-2 border rounded">
            <strong>{u.username}</strong> ({u.email})
          </li>
        ))}
      </ul>
    </div>
  );
}
