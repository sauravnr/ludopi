import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const diceItems = [{ id: "pi", name: "Pi Dice", price: 500 }];

const Store = () => {
  const { player, setPlayer } = useAuth();
  const [loading, setLoading] = useState(null);

  const buy = async (item) => {
    setLoading(item.id);
    try {
      const { data } = await api.post("/player/dice/purchase", {
        designId: item.id,
        cost: item.price,
      });
      setPlayer(data.player);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {diceItems.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between bg-white p-4 rounded shadow"
        >
          <div className="flex items-center">
            <img
              src={`/dice/${d.id}/idle-256.png`}
              alt={d.name}
              className="w-12 h-12"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <div className="ml-4">
              <div className="font-medium">{d.name}</div>
              <div className="text-sm text-gray-500">{d.price} coins</div>
            </div>
          </div>
          <button
            disabled={
              loading === d.id || player?.ownedDiceDesigns?.includes(d.id)
            }
            onClick={() => buy(d)}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            {player?.ownedDiceDesigns?.includes(d.id) ? "Owned" : "Buy"}
          </button>
        </div>
      ))}
    </div>
  );
};

export default Store;
