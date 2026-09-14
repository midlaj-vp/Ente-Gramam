import React, { useState, useEffect } from "react";
import api from "../../axiosInstance";
import "./Notifications.css";

const WARD_MAP = {
  "ward-1": "North Ward",
  "ward-2": "South Ward",
  "ward-3": "East Ward",
  "ward-4": "West Ward",
  "ward-5": "Central Ward",
  "ward-6": "Hill View",
  "ward-7": "River Side",
  "ward-8": "Market Ward"
};

const ALL_WARDS_LIST = Object.values(WARD_MAP);

const normalizeWard = (str) => {
  if (!str) return "";
  const s = str.toString().trim().toLowerCase();
  if (s === "all" || s === "all wards" || s === "panchayat") return "all";

  for (const [key, val] of Object.entries(WARD_MAP)) {
    if (val.toLowerCase() === s || key.toLowerCase() === s) {
      return val.toLowerCase();
    }
  }

  const match = s.match(/\d+/);
  if (match) {
    const key = `ward-${match[0]}`;
    if (WARD_MAP[key]) return WARD_MAP[key].toLowerCase();
  }

  return s;
};

const formatWardName = (str) => {
  if (!str) return "";
  const norm = normalizeWard(str);
  if (norm === "all") return "All Wards";
  for (const val of Object.values(WARD_MAP)) {
    if (val.toLowerCase() === norm) return val;
  }
  return str;
};

export default function NotificationsPage({ userRole = "citizen", userWard = "North Ward" }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const formattedUserWard = formatWardName(userWard) || "North Ward";

  const [formData, setFormData] = useState({
    title: "",
    category: "General",
    message: "",
    targetWard: "All",
    targetAudience: "citizen",
  });

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get("notifications/");
      setNotifications(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error("Error fetching notifications from server:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeModal();
        setSelectedNotification(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const closeModal = () => {
    setShowUploadModal(false);
    setEditingId(null);
    setFormData({
      title: "",
      category: "General",
      message: "",
      targetWard: "All",
      targetAudience: "citizen",
    });
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUploadNotification = async (e) => {
    e.preventDefault();
    const trimmedTitle = formData.title.trim();
    const trimmedMessage = formData.message.trim();

    if (!trimmedTitle || !trimmedMessage) return;

    const activeWard = formattedUserWard && formattedUserWard.trim() !== "" ? formattedUserWard : "All";
    const assignedWard = userRole === "ward" ? activeWard : formData.targetWard;
    const finalAudience = userRole === "panchayat" ? formData.targetAudience : "citizen";
    
    const effectiveSenderWard = userRole === "panchayat" ? "Panchayat" : activeWard;

    const payload = {
      title: trimmedTitle,
      category: formData.category,
      message: trimmedMessage,
      target: assignedWard === "All" ? "All" : "Ward",
      ward: assignedWard,
      audience: finalAudience,
      senderRole: userRole,
      sender_role: userRole,
      senderWard: effectiveSenderWard,
      sender_ward: effectiveSenderWard,
    };

    try {
      if (editingId) {
        await api.put(`notifications/${editingId}/`, payload);
      } else {
        await api.post("notifications/", payload);
      }

      window.dispatchEvent(new Event('new-notification'));

      await fetchNotifications();
      closeModal();
    } catch (error) {
      console.error("Error saving notification:", error);
      const errorData = error.response?.data;
      alert(`Error: ${errorData?.detail || JSON.stringify(errorData) || "Failed to save notification!"}`);
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) return;

    try {
      await api.delete(`notifications/${id}/`);
      await fetchNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
      alert("Failed to delete notification");
    }
  };

  const handleEditClick = (n) => {
    setEditingId(n.id);
    setFormData({
      title: n.title || "",
      category: n.category || "General",
      message: n.message || "",
      targetWard: formatWardName(n.ward) || "All",
      targetAudience: n.audience || "citizen",
    });
    setShowUploadModal(true);
  };

  const filteredNotifications = notifications.filter((n) => {
    const nSenderRole = n.senderRole || n.sender_role;
    const nSenderWard = formatWardName(n.senderWard || n.sender_ward);
    const nWard = formatWardName(n.ward);

    if (userRole === "citizen") {
      if (n.audience === "ward_member_only") return false;
      if (nSenderRole === "ward" && normalizeWard(nSenderWard) !== normalizeWard(formattedUserWard)) return false;
      if (
        nSenderRole === "panchayat" &&
        nWard !== "All Wards" &&
        nWard !== "All" &&
        n.target === "Ward" &&
        normalizeWard(nWard) !== normalizeWard(formattedUserWard)
      ) {
        return false;
      }
    }

    if (userRole === "ward") {
      const isForEveryone = nWard === "All Wards" || nWard === "All";
      const isForThisWard = normalizeWard(nWard) === normalizeWard(formattedUserWard);
      const isSentBySelf = nSenderRole === "ward" && normalizeWard(nSenderWard) === normalizeWard(formattedUserWard);

      if (n.audience === "ward_member_only" && !isForEveryone && !isForThisWard) {
        return false;
      }
      if (
        n.audience !== "ward_member_only" &&
        !isForEveryone &&
        !isForThisWard &&
        !isSentBySelf
      ) {
        return false;
      }
    }

    if (filter === "Sent Notifications") {
      return nSenderRole === "ward" && normalizeWard(nSenderWard) === normalizeWard(formattedUserWard);
    }
    if (filter === "Ward Member Notices") {
      return n.audience === "ward_member_only";
    }
    if (filter === "All") return true;
    if (filter === "Emergency") return n.category === "Emergency";
    if (filter === "Ward") {
      return normalizeWard(nWard) === normalizeWard(formattedUserWard) || (nSenderRole === "ward" && normalizeWard(nSenderWard) === normalizeWard(formattedUserWard));
    }

    return n.category === filter;
  });

  const canModify = (n) => {
    const nSenderRole = n.senderRole || n.sender_role;
    const nSenderWard = formatWardName(n.senderWard || n.sender_ward);

    if (userRole === "panchayat") return true;
    if (userRole === "ward" && nSenderRole === "ward" && normalizeWard(nSenderWard) === normalizeWard(formattedUserWard)) return true;
    return false;
  };

  return (
    <div className="notif-container">
      <div className="notif-header">
        <div>
          <h1>
            {userRole === "ward" && filter === "Sent Notifications"
              ? "Sent Notifications"
              : filter === "Ward Member Notices"
              ? "Ward Member Official Notices"
              : "Notifications"}
          </h1>
          <p>
            {userRole === "ward" && filter === "Sent Notifications"
              ? "Notifications you have sent to your ward citizens."
              : filter === "Ward Member Notices"
              ? "Official communications and notices intended exclusively for ward members."
              : `Stay updated with the latest from your Panchayat and ${formattedUserWard}.`}
          </p>
        </div>

        {(userRole === "ward" || userRole === "panchayat") && (
          <button
            onClick={() => {
              closeModal();
              setShowUploadModal(true);
            }}
            className="upload-btn"
          >
            + Upload Notification
          </button>
        )}
      </div>

      <div className="filter-tabs">
        {userRole === "ward" && (
          <button
            onClick={() => setFilter("Sent Notifications")}
            className={`tab-btn ${filter === "Sent Notifications" ? "active" : ""}`}
          >
            📤 Sent Notifications
          </button>
        )}
        {(userRole === "ward" || userRole === "panchayat") && (
          <button
            onClick={() => setFilter("Ward Member Notices")}
            className={`tab-btn ${filter === "Ward Member Notices" ? "active" : ""}`}
          >
            🏛️ Ward Member Notices
          </button>
        )}
        {["All", "Panchayat", "Ward", "Emergency", "Haritha Karma Sena", "Welfare Schemes"].map(
          (cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`tab-btn ${filter === cat ? "active" : ""} ${
                cat === "Emergency" ? "emergency-tab" : ""
              }`}
            >
              {cat === "Emergency" && "⚠️ "} {cat}
            </button>
          )
        )}
      </div>

      <div className="notif-list">
        {loading ? (
          <div className="no-data">
            <p>Loading notifications from server...</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((n) => {
            const isMemberOnly = n.audience === "ward_member_only";
            const nSenderRole = n.senderRole || n.sender_role;
            const nSenderWard = formatWardName(n.senderWard || n.sender_ward);
            const formattedWard = formatWardName(n.ward);

            const badgeClass =
              n.category === "Emergency"
                ? "badge-red"
                : isMemberOnly
                ? "badge-purple"
                : nSenderRole === "panchayat"
                ? "badge-panchayat"
                : "badge-ward";

            return (
              <div
                key={n.id}
                className={`notif-card ${n.category === "Emergency" ? "emergency-card" : ""} ${
                  isMemberOnly ? "member-only-card" : ""
                }`}
              >
                <div className="card-top">
                  <span className={`badge ${badgeClass}`}>
                    {isMemberOnly
                      ? `🏛️ WARD MEMBER EXCLUSIVE (${formattedWard})`
                      : n.category.toUpperCase()}
                    {!isMemberOnly &&
                      (nSenderRole === "ward"
                        ? ` (Ward: ${nSenderWard || formattedUserWard})`
                        : ` (${formattedWard})`)}
                  </span>
                  <span className="time">{n.time || n.created_at}</span>
                </div>

                <h3>{n.title}</h3>
                <p>{n.message}</p>

                <div className="card-actions">
                  <button
                    onClick={() => setSelectedNotification(n)}
                    className={`action-btn ${
                      n.category === "Emergency" ? "btn-red" : "btn-green"
                    }`}
                  >
                    {n.category === "Emergency" ? "View Details" : "View Info"}
                  </button>

                  {canModify(n) && (
                    <div className="card-admin-actions">
                      <button
                        onClick={() => handleEditClick(n)}
                        className="edit-action-btn"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNotification(n.id)}
                        className="delete-action-btn"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-data">
            <p>No notifications found in this category.</p>
          </div>
        )}
      </div>

      {selectedNotification && (
        <div className="modal-overlay" onClick={() => setSelectedNotification(null)}>
          <div className="modal-box details-modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedNotification(null)}
              className="close-btn"
              aria-label="Close details modal"
            >
              &times;
            </button>

            <div className="details-header-tag">
              <span
                className={`badge ${
                  selectedNotification.category === "Emergency"
                    ? "badge-red"
                    : selectedNotification.audience === "ward_member_only"
                    ? "badge-purple"
                    : "badge-panchayat"
                }`}
              >
                {selectedNotification.category.toUpperCase()}
              </span>
              <span className="details-time">🕒 {selectedNotification.time || selectedNotification.created_at}</span>
            </div>

            <h2>{selectedNotification.title}</h2>

            <div className="details-meta-info">
              <p>
                <strong>Target:</strong>{" "}
                {formatWardName(selectedNotification.ward)}
              </p>
              <p>
                <strong>Audience:</strong>{" "}
                {selectedNotification.audience === "ward_member_only"
                  ? "Ward Members Only"
                  : "Public Citizens"}
              </p>
            </div>

            <div className="details-body-content">
              <p>{selectedNotification.message}</p>
            </div>

            <div className="modal-actions">
              <button onClick={() => setSelectedNotification(null)} className="submit-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeModal} className="close-btn" aria-label="Close edit modal">
              &times;
            </button>

            <h2>
              {editingId
                ? "Edit Notification"
                : userRole === "ward"
                ? "Send Notification to Ward"
                : "Upload Panchayat Notification"}
            </h2>

            <form onSubmit={handleUploadNotification} className="modal-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter notification title..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                >
                  <option value="General">General Notice</option>
                  <option value="Emergency">⚠️ Emergency Alert</option>
                  <option value="Panchayat">Panchayat Meeting/Update</option>
                  <option value="Haritha Karma Sena">Haritha Karma Sena</option>
                  <option value="Welfare Schemes">Welfare Schemes</option>
                </select>
              </div>

              {userRole === "panchayat" && (
                <>
                  <div className="form-group">
                    <label>Target Audience</label>
                    <select
                      value={formData.targetAudience}
                      onChange={(e) => handleInputChange("targetAudience", e.target.value)}
                    >
                      <option value="citizen">Public Citizens (All / Selected Ward)</option>
                      <option value="ward_member_only">
                        🏛️ Ward Members Only (Internal)
                      </option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Target Ward / Member</label>
                    <select
                      className="styled-scroll-select"
                      value={formData.targetWard}
                      onChange={(e) => handleInputChange("targetWard", e.target.value)}
                    >
                      <option value="All">All Wards (All Ward Members)</option>
                      {ALL_WARDS_LIST.map((wardName) => (
                        <option key={wardName} value={wardName}>
                          {wardName}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Message Details</label>
                <textarea
                  rows="3"
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  placeholder="Type complete details here..."
                  required
                ></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingId ? "Update Notice" : "Publish Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}