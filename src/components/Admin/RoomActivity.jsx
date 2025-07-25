import React, { useEffect, useState } from "react";
import api from "../../utils/api";

export default function RoomActivity() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    api.get("/admin/rooms").then(({ data }) => setRooms(data.rooms));
  }, []);

  return (
    <section>
      <h2 className="text-lg font-bold mb-2">Room Activity</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-1">Code</th>
            <th className="p-1">Mode</th>
            <th className="p-1">Bet</th>
            <th className="p-1">Players</th>
            <th className="p-1">Started</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((r) => (
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
          {!rooms.length && (
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
