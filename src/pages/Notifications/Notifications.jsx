import React, { useState, useEffect } from "react";
import "./Notifications.css";

const INITIAL_NOTIFICATIONS = [
  {
    id: "default_1",
    title: "Heavy Rainfall Warning",
    category: "Emergency",
    isRead: false,
    target: "All",
    ward: "All",
    message:
      "District collector has issued a red alert for heavy rainfall in the next 24 hours. Please stay indoors and avoid travel unless absolutely necessary.",
    time: "10 mins ago",
    senderRole: "panchayat",
    audience: "citizen"
  },
  {
    id: "default_2",
    title: "Urgent Meeting for Ward 1 Member",
    category: "Panchayat",
    target: "Ward",
    ward: "Ward 1",
    isRead: false,
    message:
      "A special meeting is scheduled for Ward 1 member regarding upcoming water supply projects and sanitation work.",
    time: "2 hours ago",
    senderRole: "panchayat",
    audience: "ward_member_only"
  },
  {
    id: "default_3",
    title: "Ward 1 Cleanliness Drive",
    category: "General",
    target: "Ward",
    ward: "Ward 1",
    message:
      "A special cleaning drive will be held in Ward 1 this Sunday. All residents are requested to cooperate.",
    time: "Yesterday",
    senderRole: "ward",
    senderWard: "Ward 1",
    audience: "citizen"
  }
];

export default function NotificationsPage({ userRole = "citizen", userWard = "Ward 4" }) {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("All");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Consolidated form state
  const [formData, setFormData] = useState({
    title: "",
    category: "General",
    message: "",
    targetWard: "All",
    targetAudience: "citizen"
  });

  // 1. Load and sync localStorage on initial mount
  useEffect(() => {
    const saved = localStorage.getItem("panchayat_notifications");
    let currentList = INITIAL_NOTIFICATIONS;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentList = parsed;
        }
      } catch (error) {
        console.error("Failed to parse saved notifications from localStorage", error);
      }
    }

    // Mark unread items as read and sync back to localStorage
    const updatedList = currentList.map((n) => ({ ...n, isRead: true }));
    setNotifications(updatedList);
    localStorage.setItem("panchayat_notifications", JSON.stringify(updatedList));
  }, []);

  // 2. Keyboard shortcut to close modals on Escape
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

  // Persistence helper
  const saveToLocalStorage = (data) => {
    setNotifications(data);
    localStorage.setItem("panchayat_notifications", JSON.stringify(data));
  };

  const closeModal = () => {
    setShowUploadModal(false);
    setEditingId(null);
    setFormData({
      title: "",
      category: "General",
      message: "",
      targetWard: "All",
      targetAudience: "citizen"
    });
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUploadNotification = (e) => {
    e.preventDefault();
    const trimmedTitle = formData.title.trim();
    const trimmedMessage = formData.message.trim();

    if (!trimmedTitle || !trimmedMessage) return;

    const assignedWard = userRole === "ward" ? userWard : formData.targetWard;
    const finalAudience = userRole === "panchayat" ? formData.targetAudience : "citizen";
    let updatedNotifications;

    if (editingId) {
      updatedNotifications = notifications.map((n) =>
        n.id === editingId
          ? {
              ...n,
              title: trimmedTitle,
              category: formData.category,
              message: trimmedMessage,
              ward: assignedWard,
              audience: finalAudience,
              target: assignedWard === "All" ? "All" : "Ward"
            }
          : n
      );
    } else {
      const newNotif = {
        id: "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9),
        title: trimmedTitle,
        category: formData.category,
        target: assignedWard === "All" ? "All" : "Ward",
        ward: assignedWard,
        message: trimmedMessage,
        time: "Just now",
        isRead: true,
        senderRole: userRole,
        senderWard: userWard,
        audience: finalAudience
      };
      updatedNotifications = [newNotif, ...notifications];
    }

    saveToLocalStorage(updatedNotifications);
    closeModal();
  };

  const handleDeleteNotification = (id) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) return;
    const updatedList = notifications.filter((n) => n.id !== id);
    saveToLocalStorage(updatedList);
  };

  const handleEditClick = (n) => {
    setEditingId(n.id);
    setFormData({
      title: n.title || "",
      category: n.category || "General",
      message: n.message || "",
      targetWard: n.ward || "All",
      targetAudience: n.audience || "citizen"
    });
    setShowUploadModal(true);
  };

  // Notification filtering pipeline
  const filteredNotifications = notifications.filter((n) => {
    // Role-based visibility rules
    if (userRole === "citizen") {
      if (n.audience === "ward_member_only") return false;
      if (n.senderRole === "ward" && n.senderWard !== userWard) return false;
      if (
        n.senderRole === "panchayat" &&
        n.ward !== "All" &&
        n.target === "Ward" &&
        n.ward !== userWard
      ) {
        return false;
      }
    }

    if (userRole === "ward") {
      const isForEveryone = n.ward === "All";
      const isForThisWard = n.ward === userWard;
      const isSentBySelf = n.senderRole === "ward" && n.senderWard === userWard;

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

    // Active Tab filter rules
    if (filter === "Sent Notifications") {
      return n.senderRole === "ward" && n.senderWard === userWard;
    }
    if (filter === "Ward Member Notices") {
      return n.audience === "ward_member_only";
    }
    if (filter === "All") return true;
    if (filter === "Emergency") return n.category === "Emergency";
    if (filter === "Ward") {
      // Fixed: explicitly check current user's ward match
      return n.ward === userWard || (n.senderRole === "ward" && n.senderWard === userWard);
    }

    return n.category === filter;
  });

  const canModify = (n) => {
    if (userRole === "panchayat") return true;
    if (userRole === "ward" && n.senderRole === "ward" && n.senderWard === userWard) return true;
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
              : `Stay updated with the latest from your Panchayat and ${userWard}.`}
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
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((n) => {
            const isMemberOnly = n.audience === "ward_member_only";
            const badgeClass =
              n.category === "Emergency"
                ? "badge-red"
                : isMemberOnly
                ? "badge-purple"
                : n.senderRole === "panchayat"
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
                      ? `🏛️ WARD MEMBER EXCLUSIVE (${
                          n.ward === "All" ? "All Wards" : n.ward
                        })`
                      : n.category.toUpperCase()}
                    {!isMemberOnly &&
                      (n.senderRole === "ward"
                        ? ` (Ward: ${n.senderWard || userWard})`
                        : ` (${n.ward === "All" ? "All Wards" : n.ward})`)}
                  </span>
                  <span className="time">{n.time}</span>
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

      {/* Details View Modal */}
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
              <span className="details-time">🕒 {selectedNotification.time}</span>
            </div>

            <h2>{selectedNotification.title}</h2>

            <div className="details-meta-info">
              <p>
                <strong>Target:</strong>{" "}
                {selectedNotification.ward === "All" ? "All Wards" : selectedNotification.ward}
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

      {/* Upload/Edit Modal */}
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
                      {[...Array(10)].map((_, i) => (
                        <option key={i + 1} value={`Ward ${i + 1}`}>
                          Ward {i + 1}
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