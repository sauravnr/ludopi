// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import { FaArrowLeft, FaEdit } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";

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

  // Editing state for bio
  const [isEditing, setIsEditing] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const maxLength = 30;
  const [countryEditing, setCountryEditing] = useState(false);
  const [countryInput, setCountryInput] = useState("Worldwide");
  const [ranking, setRanking] = useState(null);
  const countries = [
    "Worldwide",
    "United States",
    "United Kingdom",
    "Canada",
    "Germany",
    "France",
  ];

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

  // 3. fetch ranking info for own profile
  useEffect(() => {
    if (isOwn) {
      api
        .get("/ranking/me")
        .then(({ data }) => setRanking(data))
        .catch(() => {});
    }
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
      showAlert("Failed to send request.", "error");
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
    } catch {
      showAlert("Failed to cancel.", "error");
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
    } catch {
      showAlert("Failed to unfriend.", "error");
    } finally {
      setButtonLoading(false);
    }
  };

  // Sync bioInput when profile loads/changes
  useEffect(() => {
    if (profile) {
      setBioInput(profile.bio || "");
      setCountryInput(profile.country || "Worldwide");
    }
  }, [profile]);

  // Save updated bio (only affects your own)
  const saveBio = async () => {
    try {
      const { data } = await api.patch("/player/me/bio", { bio: bioInput });
      setPlayer(data.player);
      setProfile(data.player);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      showAlert("Failed to update bio. Please try again.", "error");
    }
  };

  const saveCountry = async () => {
    try {
      const { data } = await api.patch("/player/me/country", {
        country: countryInput,
      });
      setPlayer(data.player);
      setProfile(data.player);
      setCountryEditing(false);
    } catch (err) {
      console.error(err);
      showAlert("Failed to update country.", "error");
    }
  };

  // Handle avatar file upload (only for your own)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file, 300, 300, 0.7);

    const formData = new FormData();
    formData.append("avatar", compressed);

    try {
      const res = await api.post("/avatar/upload", formData);
      if (res.data?.avatarUrl) {
        showAlert("Avatar updated!");
        window.location.reload();
      } else {
        showAlert("Upload failed.", "error");
      }
    } catch (err) {
      console.error("Upload error:", err);
      showAlert("Upload failed: " + err.message, "error");
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
    joinedAt,
    username,
  } = profile;

  const winRate = totalGames
    ? Math.round(((twoWins + fourWins) / totalGames) * 100)
    : 0;

  return (
    <div
      className="min-h-screen bg-cover bg-center p-4"
      style={{ backgroundImage: "url(/images/cosmic-bg.png)" }}
    >
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-900 mb-4"
      >
        <FaArrowLeft className="mr-2" size={20} />
        <span className="font-medium">Back</span>
      </button>

      <div className="bg-[#fff8e6] border border-[#e0c08b] rounded-2xl shadow-[0_3px_0_#c7994a,0_8px_2px_rgba(0,0,0,0.5)] text-gray-900 p-6 space-y-6">
        {/* --- Action Button (only when viewing someone else's profile) --- */}
        {!isOwn && (
          <div className="text-right">
            {relationship === "none" && (
              <button
                disabled={buttonLoading}
                onClick={sendRequest}
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
              >
                {buttonLoading ? "..." : "Add Friend"}
              </button>
            )}
            {relationship === "sent" && (
              <button
                disabled={buttonLoading}
                onClick={cancelRequest}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md"
              >
                {buttonLoading ? "..." : "Sent"}
              </button>
            )}
            {relationship === "friends" && (
              <button
                disabled={buttonLoading}
                onClick={unfriend}
                className="px-4 py-2 bg-green-500 text-white rounded-md"
              >
                {buttonLoading ? "..." : "Friends"}
              </button>
            )}
          </div>
        )}
        {/* Avatar & upload button */}
        <div className="flex items-center bg-[#eeebe3] rounded-xl p-4">
          <div className="relative">
            <img
              src={avatarUrl || "/default-avatar.png"}
              alt="avatar"
              className="w-24 h-24 rounded-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
            />
            {isOwn && (
              <>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  hidden
                  id="avatar-upload"
                  onChange={handleImageUpload}
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow cursor-pointer"
                >
                  <FaEdit size={14} />
                </label>
              </>
            )}
          </div>

          {/* Username & bio editing */}
          <div className="ml-4 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{username}</h2>
              {isOwn && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-gray-900"
                >
                  <FaEdit size={16} />
                </button>
              )}
            </div>

            {isEditing ? (
              <>
                <textarea
                  className="mt-2 w-full border rounded p-2"
                  rows={3}
                  maxLength={maxLength}
                  placeholder="Tell us about yourself..."
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-500">
                    {bioInput.length}/{maxLength}
                  </span>
                  <div>
                    <button
                      onClick={saveBio}
                      className="mr-2 text-blue-600 hover:underline"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setBioInput(profile.bio || "");
                      }}
                      className="text-gray-600 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            ) : (
              bio && <p className="mt-2">{bio}</p>
            )}

            {isOwn && (
              <div className="mt-2">
                {countryEditing ? (
                  <>
                    <select
                      className="border p-1 rounded mr-2"
                      value={countryInput}
                      onChange={(e) => setCountryInput(e.target.value)}
                    >
                      {countries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={saveCountry}
                      className="mr-2 text-blue-600 hover:underline"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setCountryEditing(false);
                        setCountryInput(profile.country || "Worldwide");
                      }}
                      className="text-gray-600 hover:underline"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <p>
                    Country: {profile.country || "Worldwide"}{" "}
                    <button
                      onClick={() => setCountryEditing(true)}
                      className="ml-2 text-gray-900"
                    >
                      <FaEdit size={12} />
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

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
            {joinedAt && (
              <Stat
                title="Joined"
                value={new Date(joinedAt).toLocaleDateString()}
              />
            )}
          </div>
        </div>

        {isOwn && ranking && (
          <div>
            <h3 className="text-lg font-semibold mb-3">My Ranking</h3>
            <p className="mb-1">Trophies: {ranking.trophies}</p>
            <p className="mb-1">
              World rank: {ranking.worldRank} out of {ranking.worldTotal}
            </p>
            <p className="mb-1">
              Country rank: {ranking.countryRank} out of {ranking.countryTotal}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="bg-white/50 p-3 rounded-lg text-center">
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
