import React, { useEffect, useState } from "react";
import api from "../../utils/api";

export default function PipWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);

  useEffect(() => {
    api.get("/admin/pip/withdrawals?limit=50").then(({ data }) => {
      setWithdrawals(data.withdrawals || []);
    });
  }, []);

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
    </section>
  );
}
