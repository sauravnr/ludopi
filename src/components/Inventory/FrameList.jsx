import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import Modal from "../Modal";
import FRAME_SKINS from "../../utils/frameSkins";

export default function FrameList() {
  const { player, setPlayer } = useAuth();
  const [loading, setLoading] = useState(null);
  const [preview, setPreview] = useState(null);

  const selectDesign = async (id) => {
    setLoading(id);
    try {
      const { data } = await api.patch("/player/frame/design", {
        designId: id,
      });
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
      const { data } = await api.post("/player/frame/purchase", {
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
    id === "default" || player?.ownedFrameDesigns?.includes(id);

  const selected = (id) =>
    id === "default" ? !player?.frameDesign : player?.frameDesign === id;

  const imgSrc = (id) =>
    id === "default" ? `/frames/idle-128.png` : `/frames/${id}/idle-128.png`;
  const previewSrc = (id) =>
    id === "default" ? `/frames/idle-128.png` : `/frames/${id}/idle-128.png`;

  return (
    <>
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {FRAME_SKINS.map((d) => (
            <div
              key={d.id}
              className={`bg-[#fff8e6] border border-[#e0c08b] rounded-xl shadow-[0_2px_0_#c7994a,0_5px_2px_rgba(0,0,0,0.3)] flex flex-col items-center p-4 ${
                selected(d.id) ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <div className="font-medium text-center mb-2">{d.name}</div>
              <img
                src={imgSrc(d.id)}
                alt={d.name}
                className="w-16 h-16 cursor-pointer mb-2"
                onClick={() => setPreview(d.id)}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              {!owned(d.id) && d.price > 0 && (
                <div className="text-sm text-gray-500 mb-2">
                  {d.price} coins
                </div>
              )}
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
              className="w-64 h-64"
            />
          </div>
        )}
      </Modal>
    </>
  );
}
