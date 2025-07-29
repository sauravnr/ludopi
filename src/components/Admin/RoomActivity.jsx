import React, { useEffect, useState } from "react";
import api from "../../utils/api";

export default function RoomActivity() {
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("code");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    api.get("/admin/rooms").then(({ data }) => setRooms(data.rooms));
  }, []);

  const filtered = rooms
    .filter((r) => {
      const q = search.toLowerCase();
      return (
        r.code.toLowerCase().includes(q) || r.mode.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const getVal = (room) => {
        switch (sortKey) {
          case "bet":
            return room.bet;
          case "players":
            return room.players;
          case "started":
            return room.started ? 1 : 0;
          default:
            return room.code;
        }
      };
      const valA = getVal(a);
      const valB = getVal(b);
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <section>
      <h2 className="text-lg font-bold mb-2">Room Activity</h2>
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
          <option value="code">Code</option>
          <option value="bet">Entry</option>
          <option value="players">Players</option>
          <option value="started">Started</option>
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
            <th className="p-1">Code</th>
            <th className="p-1">Mode</th>
            <th className="p-1">Entry</th>
            <th className="p-1">Players</th>
            <th className="p-1">Started</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.code} className="border-t">
              <td className="p-1 font-mono">{r.code}</td>
              <td className="p-1">{r.mode}</td>
              <td className="p-1">{r.bet}</td>
              <td className="p-1">
                {r.players}/{r.capacity}
              </td>
              <td className="p-1">{r.started ? "yes" : "no"}</td>
            </tr>
          ))}
          {!filtered.length && (
            <tr>
              <td className="p-2 text-center" colSpan="5">
                No active rooms
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
