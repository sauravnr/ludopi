import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import Modal from "../Modal";
import DICE_SKINS from "../../utils/diceSkins";

export default function DiceList() {
  const { player, setPlayer } = useAuth();
  const [loading, setLoading] = useState(null);
  const [preview, setPreview] = useState(null);

  const selectDesign = async (id) => {
    setLoading(id);
    try {
      const { data } = await api.patch("/player/dice/design", { designId: id });
      setPlayer(data.player);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const purchase = async (id, price) => {
    setLoading(id);
    try {
      const { data } = await api.post("/player/dice/purchase", {
        designId: id,
        cost: price,
      });
      setPlayer(data.player);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const owned = (id) =>
    id === "default" || player?.ownedDiceDesigns?.includes(id);

  const selected = (id) =>
    id === "default" ? !player?.diceDesign : player?.diceDesign === id;

  const imgSrc = (id) =>
    id === "default" ? `/dice/idle-256.png` : `/dice/${id}/idle-256.png`;
  const previewSrc = (id) =>
    id === "default" ? `/dice/idle-512.png` : `/dice/${id}/idle-512.png`;

  return (
    <>
      <div className="p-4 space-y-4">
        {DICE_SKINS.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between bg-white p-4 rounded shadow"
          >
            <div
              className="flex items-center cursor-pointer"
              onClick={() => setPreview(d.id)}
            >
              <img
                src={imgSrc(d.id)}
                alt={d.name}
                className="w-12 h-12"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <div className="ml-4">
                <div className="font-medium">{d.name}</div>
                {d.price > 0 && (
                  <div className="text-sm text-gray-500">{d.price} coins</div>
                )}
              </div>
            </div>
            {owned(d.id) ? (
              <button
                disabled={loading === d.id || selected(d.id)}
                onClick={() => selectDesign(d.id)}
                className="bg-green-500 text-white px-3 py-1 rounded"
              >
                {selected(d.id) ? "Selected" : "Use"}
              </button>
            ) : (
              <button
                disabled={loading === d.id}
                onClick={() => purchase(d.id, d.price)}
                className="bg-blue-500 text-white px-3 py-1 rounded"
              >
                Buy
              </button>
            )}
          </div>
        ))}
      </div>
      <Modal
        show={!!preview}
        onClose={() => setPreview(null)}
        title="Preview"
        width="sm"
      >
        {preview && (
          <div className="flex justify-center">
            <img
              src={previewSrc(preview)}
              alt={preview}
              className="w-48 h-48"
            />
          </div>
        )}
      </Modal>
    </>
  );
}
