import React, { useEffect, useState } from "react";
import api from "../../utils/api";

export default function PipBalances() {
  const [players, setPlayers] = useState([]);
  useEffect(() => {
    api.get("/admin/pip/balances?limit=50").then(({ data }) => {
      setPlayers(data.players || []);
    });
  }, []);

  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold mb-2">Top PIP Balances</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-1">Player</th>
            <th className="p-1 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.playerId} className="border-t">
              <td className="p-1">{p.username}</td>
              <td className="p-1 text-right">{p.pipBalance}</td>
            </tr>
          ))}
          {!players.length && (
            <tr>
              <td className="p-2 text-center" colSpan="2">
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
