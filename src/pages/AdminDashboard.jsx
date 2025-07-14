import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

export default function AdminDashboard() {
  const { player } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [userId, setUserId] = useState("");
  const [playerInfo, setPlayerInfo] = useState(null);
  const [reason, setReason] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [coinRanking, setCoinRanking] = useState([]);

  useEffect(() => {
    api.get("/admin/rooms").then(({ data }) => setRooms(data.rooms));
    api
      .get("/ranking/coins?page=1&limit=10")
      .then(({ data }) => setCoinRanking(data.players));
  }, []);

  const fetchPlayer = async () => {
    if (!userId) return;
    try {
      const { data } = await api.get(`/admin/player/${userId}`);
      setPlayerInfo(data.player);
      const tx = await api.get(`/admin/transactions/${userId}`);
      setTransactions(tx.data.transactions);
    } catch {
      setPlayerInfo(null);
      setTransactions([]);
    }
  };

  const banUser = async () => {
    await api.patch(`/admin/player/${userId}/ban`, { reason });
    fetchPlayer();
  };
  const unbanUser = async () => {
    await api.patch(`/admin/player/${userId}/unban`);
    fetchPlayer();
  };

  if (!player || player.role !== "admin") {
    return <div className="p-4">Not authorized.</div>;
  }

  return (
    <div className="p-4 space-y-6 overflow-y-auto">
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

      <section>
        <h2 className="text-lg font-bold mb-2">Player Moderation</h2>
        <div className="flex gap-2 mb-2">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID"
            className="border p-1 flex-1"
          />
          <button onClick={fetchPlayer} className="bg-blue-500 text-white px-2">
            Load
          </button>
        </div>
        {playerInfo && (
          <div className="space-y-2">
            <p>
              <strong>{playerInfo.username}</strong> – Coins: {playerInfo.coins}
            </p>
            <p>Banned: {playerInfo.isBanned ? "yes" : "no"}</p>
            {playerInfo.isBanned ? (
              <button onClick={unbanUser} className="bg-green-500 text-white px-2">
                Unban
              </button>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason"
                  className="border p-1 flex-1"
                />
                <button
                  onClick={banUser}
                  className="bg-red-500 text-white px-2"
                >
                  Ban
                </button>
              </div>
            )}
          </div>
          {transactions.length > 0 && (
            <div>
              <h3 className="font-medium">Recent Transactions</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="p-1">Amt</th>
                    <th className="p-1">Type</th>
                    <th className="p-1">Desc</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t._id} className="border-t">
                      <td className="p-1">{t.amount}</td>
                      <td className="p-1">{t.type}</td>
                      <td className="p-1">{t.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">Economy - Top Coins</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-1">Player</th>
              <th className="p-1 text-right">Coins</th>
            </tr>
          </thead>
          <tbody>
            {coinRanking.map((p) => (
              <tr key={p.playerId} className="border-t">
                <td className="p-1">{p.username}</td>
                <td className="p-1 text-right">{p.coins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}