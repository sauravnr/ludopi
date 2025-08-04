// src/pages/Profile.jsx
import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import { FaArrowLeft } from "react-icons/fa";
import Modal from "../components/Modal";
const WithdrawModal = lazy(() => import("../components/WithdrawModal"));
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";
import { COUNTRY_NAMES, getCountryFlag } from "../utils/countries";

// Server enforces 2MB max avatar size
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export default function Profile() {
  const { user, player: me, setPlayer } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  const showAlert = useAlert();
  const isOwn = !userId || userId === (user._id || user.id);

  const [profile, setProfile] = useState(null);
  const [relationship, setRelationship] = useState("none");
  const [requestId, setRequestId] = useState(null);
  const [buttonLoading, setButtonLoading] = useState(false);

  // Profile fields
  const [bioInput, setBioInput] = useState("");
  const maxLength = 30;
  const [countryInput, setCountryInput] = useState("Worldwide");
  const [ranking, setRanking] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [walletInput, setWalletInput] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const withdrawMax = parseFloat(
    import.meta.env.VITE_PIP_WITHDRAW_MAX || "100"
  );
  // Countries list for the dropdown. We keep "Worldwide" as a custom option.
  const countries = ["Worldwide", ...COUNTRY_NAMES];

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > MAX_AVATAR_SIZE) {
      showAlert("Avatar must be 2MB or less", "error");
      e.target.value = "";
      return;
    }
    setAvatarFile(file);
  };

  // 1. load profile
  useEffect(() => {
    if (isOwn) {
      setProfile(me);
    } else {
      api
        .get(`/player/${userId}`)
        .then(({ data }) => setProfile(data.player))
        .catch(() => showAlert("Could not load that profile.", "error"));
    }
  }, [isOwn, me, userId]);

  // 2. fetch relationship status if not own
  useEffect(() => {
    if (!isOwn && profile) {
      api
        .get(`/friend-requests/status/${profile.userId}`)
        .then(({ data }) => {
          setRelationship(data.status);
          setRequestId(data.requestId || null);
        })
        .catch(console.error);
    }
  }, [isOwn, profile]);

  // 3. fetch ranking info for the displayed profile
  useEffect(() => {
    if (!profile) return;
    const endpoint = isOwn ? "/ranking/me" : `/ranking/${profile.userId}`;
    api
      .get(endpoint)
      .then(({ data }) => setRanking(data))
      .catch(() => {});
  }, [isOwn, profile]);

  // encapsulate actions
  const sendRequest = async () => {
    setButtonLoading(true);
    try {
      const { data } = await api.post("/friend-requests", {
        toUserId: profile.userId,
      });
      setRelationship("sent");
      setRequestId(data.request._id);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Failed to send request.";
      showAlert(msg, "error");
    } finally {
      setButtonLoading(false);
    }
  };

  const cancelRequest = async () => {
    if (!requestId) return;
    setButtonLoading(true);
    try {
      await api.delete(`/friend-requests/${requestId}`);
      setRelationship("none");
      setRequestId(null);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to cancel.";
      showAlert(msg, "error");
    } finally {
      setButtonLoading(false);
    }
  };

  const unfriend = async () => {
    if (!window.confirm(`Remove ${profile.username} from your friends?`))
      return;
    setButtonLoading(true);
    try {
      await api.delete(`/friend-requests/friends/${profile.userId}`);
      setRelationship("none");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to unfriend.";
      showAlert(msg, "error");
    } finally {
      setButtonLoading(false);
    }
  };

  // Sync bioInput when profile loads/changes
  useEffect(() => {
    if (profile) {
      setBioInput(profile.bio || "");
      setCountryInput(profile.country || "Worldwide");
      setWalletInput(profile.walletAddress || "");
    }
  }, [profile]);

  // Save updated bio (only affects your own)
  const saveBio = async () => {
    try {
      const { data } = await api.patch("/player/me/bio", { bio: bioInput });
      setPlayer(data.player);
      setProfile(data.player);
      showAlert("Bio updated!");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        "Failed to update bio. Please try again.";
      showAlert(msg, "error");
    }
  };

  const saveCountry = async () => {
    try {
      const { data } = await api.patch("/player/me/country", {
        country: countryInput,
      });
      setPlayer(data.player);
      setProfile(data.player);
      showAlert("Country will update!");
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Failed to update country.";
      showAlert(msg, "error");
    }
  };

  const saveWallet = async () => {
    try {
      const { data } = await api.patch("/player/me/wallet", {
        address: walletInput || null,
      });
      setPlayer(data.player);
      setProfile(data.player);
      showAlert("Wallet updated!");
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Failed to update wallet.";
      showAlert(msg, "error");
    }
  };

  const saveProfileChanges = async () => {
    try {
      if (avatarFile) {
        const compressed = await compressImage(avatarFile, 300, 300, 0.7);
        const formData = new FormData();
        formData.append("avatar", compressed);
        const res = await api.post("/avatar/upload", formData);
        if (!res.data?.avatarUrl) {
          showAlert("Upload failed.", "error");
        } else {
          const url = `${res.data.avatarUrl}?t=${Date.now()}`;
          setPlayer((p) => ({ ...p, avatarUrl: url }));
          setProfile((p) => ({ ...p, avatarUrl: url }));
          showAlert("Avatar updated!");
        }
      }
      if (bioInput !== profile.bio) {
        await saveBio();
      }
      if (countryInput !== profile.country) {
        await saveCountry();
      }
      if (walletInput !== (profile.walletAddress || "")) {
        await saveWallet();
      }
      setShowEditModal(false);
      setAvatarFile(null);
    } catch (err) {
      console.error(err);
      showAlert("Failed to save changes.", "error");
    }
  };

  if (!profile) {
    return <div className="p-4">Loading profile…</div>;
  }

  // Destructure all the fields we need
  const {
    avatarUrl,
    bio,
    badges = [],
    totalGamesPlayed: totalGames = 0,
    wins2P: twoWins = 0,
    wins4P: fourWins = 0,
    tokenCaptures: captures = 0,
    sixesRolled = 0,
    tokensHomed = 0,
    joinedAt,
    username,
    coins: coinBalance = 0,
    pipBalance = 0,
    walletAddress = "",
  } = profile;

  const winRate = totalGames
    ? Math.round(((twoWins + fourWins) / totalGames) * 100)
    : 0;
  const coins = Number(coinBalance).toLocaleString();
  const pipCoins = Number(pipBalance).toLocaleString();

  return (
    <div className="min-h-screen p-2 overflow-y-auto bg-cosmic">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-white hover:text-yellow-300 mb-4"
      >
        <FaArrowLeft className="mr-2" size={20} />
        <span className="font-medium">Back</span>
      </button>

      <div className="bg-[#fff8e6] border border-[#e0c08b] rounded-2xl shadow-[0_3px_0_#c7994a,0_8px_2px_rgba(0,0,0,0.5)] text-gray-900 p-4 space-y-6 page-fade">
        {/* Avatar & upload button */}
        <div className="flex items-center bg-[#eeebe3] rounded-xl p-4 shadow">
          <div className="relative">
            <img
              src={avatarUrl || "/default-avatar.png"}
              alt="avatar"
              className="w-24 h-24 rounded-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
            />
          </div>

          {/* Username & bio editing */}
          <div className="ml-4 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-semibold">{username}</h2>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 text-yellow-600">
                    <img
                      src="/icons/coin.png"
                      alt="Coins"
                      className="w-4 h-4"
                    />
                    <span>{coins}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-purple-700">
                    <img
                      src="/icons/pipips.png"
                      alt="PIP"
                      className="w-4 h-4"
                    />
                    <span>{pipCoins}</span>
                    {isOwn && (
                      <button
                        onClick={() => {
                          setShowWithdraw(true);
                        }}
                        className="underline text-xs ml-1"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {isOwn ? (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="btn btn-primary text-sm px-2 py-1"
                >
                  Edit
                </button>
              ) : (
                <>
                  {relationship === "none" && (
                    <button
                      disabled={buttonLoading}
                      onClick={sendRequest}
                      className="btn btn-primary text-sm px-2 py-1"
                    >
                      {buttonLoading ? "..." : "Add"}
                    </button>
                  )}
                  {relationship === "sent" && (
                    <button
                      disabled={buttonLoading}
                      onClick={cancelRequest}
                      className="btn btn-yellow text-sm px-2 py-1"
                    >
                      {buttonLoading ? "..." : "Sent"}
                    </button>
                  )}
                  {relationship === "friends" && (
                    <button
                      disabled={buttonLoading}
                      onClick={unfriend}
                      className="btn btn-secondary text-sm px-2 py-1"
                    >
                      {buttonLoading ? "..." : "Friends"}
                    </button>
                  )}
                </>
              )}
            </div>
            {bio && <p className="mt-2">{bio}</p>}
            {isOwn && (
              <p className="mt-2">Country: {profile.country || "Worldwide"}</p>
            )}
            {isOwn && walletAddress && (
              <p className="mt-1 break-all text-sm text-gray-700">
                Wallet: {walletAddress}
              </p>
            )}
          </div>
        </div>

        {/* Ranking */}
        {ranking && (
          <div className="bg-white/50 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Ranking</h3>
            <p className="mb-1">🏆 {ranking.trophies}</p>
            <p className="mb-1">
              🌐 World rank: {Number(ranking.worldRank).toLocaleString()} out of{" "}
              {Number(ranking.worldTotal).toLocaleString()}
            </p>
            <p className="mb-1">
              {getCountryFlag(ranking.country)} Country rank:{" "}
              {Number(ranking.countryRank).toLocaleString()} out of{" "}
              {Number(ranking.countryTotal).toLocaleString()}
            </p>
          </div>
        )}

        {/* Badges */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Badges</h3>
          <div className="flex space-x-2">
            {badges.length > 0
              ? badges.map((b, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center"
                  >
                    <span className="text-sm font-bold">{b.code || i + 1}</span>
                  </div>
                ))
              : [0, 1, 2].map((_, i) => (
                  <div key={i} className="w-10 h-10 bg-gray-300 rounded-full" />
                ))}
          </div>
        </div>

        {/* Stats */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <Stat title="Games Played" value={totalGames} />
            <Stat title="2-Player Wins" value={twoWins} />
            <Stat title="4-Player Wins" value={fourWins} />
            <Stat title="Win Rate" value={`${winRate}%`} />
            <Stat title="Tokens Captured" value={captures} />
            <Stat title="Sixes Rolled" value={sixesRolled} />
            <Stat title="Tokens Homed" value={tokensHomed} />
            {joinedAt && (
              <Stat
                title="Joined"
                value={new Date(joinedAt).toLocaleDateString()}
              />
            )}
          </div>
        </div>
      </div>
      {isOwn && (
        <Modal
          show={showEditModal}
          title="Edit Profile"
          onClose={() => setShowEditModal(false)}
          footer={[
            { label: "Save", onClick: saveProfileChanges },
            {
              label: "Cancel",
              variant: "secondary",
              onClick: () => setShowEditModal(false),
            },
          ]}
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <img
                src={
                  avatarFile
                    ? URL.createObjectURL(avatarFile)
                    : avatarUrl || "/default-avatar.png"
                }
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover"
              />
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Bio</label>
              <textarea
                rows={3}
                maxLength={maxLength}
                className="w-full border rounded p-2"
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
              />
              <div className="text-right text-sm text-gray-500">
                {bioInput.length}/{maxLength}
              </div>
            </div>
            <div>
              <label className="block mb-1 font-medium">Country</label>
              <select
                className="w-full max-w-full border rounded p-2"
                value={countryInput}
                onChange={(e) => setCountryInput(e.target.value)}
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Wallet Address</label>
              <input
                type="text"
                className="w-full border rounded p-2"
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                placeholder="0x..."
              />
            </div>
          </div>
        </Modal>
      )}
      {isOwn && (
        <Suspense fallback={null}>
          <WithdrawModal
            show={showWithdraw}
            max={withdrawMax}
            onClose={() => setShowWithdraw(false)}
            onSuccess={(player) => {
              setPlayer(player);
              setProfile(player);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="bg-white/70 p-3 rounded-lg text-center shadow">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-sm">{title}</div>
    </div>
  );
}

// Utility to compress images before upload
async function compressImage(file, maxW, maxH, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => (img.src = reader.result);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxW / img.width, maxH / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          const newFile = new File([blob], file.name, {
            type: "image/jpeg",
          });
          resolve(newFile);
        },
        "image/jpeg",
        quality
      );
    };
    reader.readAsDataURL(file);
  });
}
