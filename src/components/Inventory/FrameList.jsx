import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import Modal from "../Modal";
import Loader from "../Loader";
import FRAME_SKINS from "../../utils/frameSkins";

let imagesLoaded = false;

export default function FrameList() {
  const { player, setPlayer } = useAuth();
  const [loading, setLoading] = useState(null);
  const [preview, setPreview] = useState(null);
  const [imagesLoading, setImagesLoading] = useState(!imagesLoaded);
  const [buyItem, setBuyItem] = useState(null);

  useEffect(() => {
    if (imagesLoaded) return;
    const sources = FRAME_SKINS.flatMap((d) => [
      imgSrc(d.id),
      previewSrc(d.id),
    ]);
    Promise.all(
      sources.map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = src;
          })
      )
    ).then(() => {
      imagesLoaded = true;
      setImagesLoading(false);
    });
  }, []);

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

  const doPurchase = async (id, price) => {
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

  const handleConfirm = async () => {
    if (buyItem) {
      await doPurchase(buyItem.id, buyItem.price);
      setBuyItem(null);
    }
  };

  return imagesLoading ? (
    <Loader />
  ) : (
    <>
      <div className="p-4">
        <div className="grid grid-cols-2 xs:grid-cols-3 gap-4">
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
                loading="lazy"
                decoding="async"
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
                  className="btn btn-secondary text-sm px-2 py-1"
                >
                  {selected(d.id) ? "Selected" : "Use"}
                </button>
              ) : (
                <button
                  disabled={loading === d.id}
                  onClick={() => setBuyItem(d)}
                  className="btn btn-primary text-sm px-2 py-1"
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
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
      </Modal>
      <Modal
        show={!!buyItem}
        onClose={() => setBuyItem(null)}
        title={
          player && buyItem && player.coins >= buyItem.price
            ? "Confirm Purchase"
            : "Insufficient Coins"
        }
        width="sm"
        footer={
          buyItem && player && player.coins >= buyItem.price
            ? [
                {
                  label: "Confirm",
                  onClick: handleConfirm,
                  variant: "primary",
                },
                {
                  label: "Cancel",
                  onClick: () => setBuyItem(null),
                  variant: "secondary",
                },
              ]
            : [{ label: "Buy coin", onClick: () => {}, variant: "secondary" }]
        }
      >
        {buyItem && player && player.coins >= buyItem.price ? (
          <p className="text-center">
            Buy {buyItem.name} for {buyItem.price} coins?
          </p>
        ) : (
          <p className="text-center">Insufficient coin</p>
        )}
      </Modal>
    </>
  );
}
