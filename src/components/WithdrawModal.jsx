import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import api from "../utils/api";

export default function WithdrawModal({ show, onClose, max, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const loadHistory = () => {
    api
      .get(`/pip/transactions?limit=5&type=withdraw`)
      .then(({ data }) => setHistory(data.transactions))
      .catch(() => {});
  };

  useEffect(() => {
    if (show) {
      setAmount("");
      setMessage("");
      loadHistory();
    }
  }, [show]);

  const submit = async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0 || value > max) {
      setMessage(`Enter amount up to ${max}`);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/pip/withdraw", { amount: value });
      if (onSuccess) onSuccess(data.player);
      setMessage("Withdrawal requested!");
      setAmount("");
      loadHistory();
    } catch (err) {
      const msg = err?.response?.data?.message || "Request failed";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const footer = [
    { label: "Cancel", variant: "neutral", onClick: onClose },
    { label: loading ? "..." : "Submit", onClick: submit },
  ];

  return (
    <Modal show={show} title="Withdraw" onClose={onClose} footer={footer}>
      <div className="space-y-4">
        <p className="text-center text-sm">Max {max} PIP per Withdraw</p>
        <input
          type="number"
          className="w-full border rounded p-2"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          max={max}
          min="0"
          step="any"
        />
        {message && (
          <p className="text-center text-sm text-red-600">{message}</p>
        )}
        {history.length > 0 && (
          <div>
            <h4 className="font-semibold mb-1">Last 5 Withdrawals</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-1">Date</th>
                  <th className="p-1 text-right">Amount</th>
                  <th className="p-1">Status</th>
                  <th className="p-1">Tx</th>
                </tr>
              </thead>
              <tbody>
                {history.map((w) => (
                  <tr key={w._id} className="border-t">
                    <td className="p-1">
                      {new Date(w.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-1 text-right">{w.amount}</td>
                    <td className="p-1">{w.status}</td>
                    <td className="p-1 break-all">{w.txHash || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
