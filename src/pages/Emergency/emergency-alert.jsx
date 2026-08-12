import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AlertTriangle, Send, Trash2 } from "lucide-react"; // Added Trash2
import "./EmergencyAlert.css";

const MAX_CHAR_COUNT = 500;

export default function EmergencyAlert() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [wardInfo, setWardInfo] = useState({ wardName: "", wardNo: "" });

  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [emergencyAlertsHistory, setEmergencyAlertsHistory] = useState([]);

  // --- User Role and Ward Detection ---
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("loggedInUser") || localStorage.getItem("user");
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser);
        setLoggedInUser(parsedUser);
        const role = (parsedUser.role || "").toLowerCase();
        setUserRole(role);

        let detectedWardName = "";
        let detectedWardNo = "";
        if (parsedUser.wardName) {
          detectedWardName = parsedUser.wardName;
          detectedWardNo = parsedUser.wardNo || parsedUser.wardName.replace('Ward ', '');
        } else if (parsedUser.ward) {
          detectedWardName = parsedUser.ward;
          detectedWardNo = parsedUser.wardNo || parsedUser.ward.replace('Ward ', '');
        } else if (parsedUser.wardNo) {
          detectedWardNo = parsedUser.wardNo;
          detectedWardName = `Ward ${parsedUser.wardNo}`;
        } else if (parsedUser.wardNumber) {
          detectedWardNo = parsedUser.wardNumber;
          detectedWardName = `Ward ${parsedUser.wardNumber}`;
        }
        setWardInfo({ wardName: detectedWardName, wardNo: detectedWardNo });
      }
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
      // Fallback to no user or invalid role
      setUserRole("");
    }
  }, []);

  // --- History Management ---
  const getStoredAlerts = useCallback(() => {
    try {
      const alerts = JSON.parse(localStorage.getItem("emergencyAlerts") || "[]");
      return Array.isArray(alerts) ? alerts : [];
    } catch (e) {
      console.error("Failed to parse emergencyAlerts from localStorage:", e);
      return [];
    }
  }, []);

  const updateHistoryFromStorage = useCallback(() => {
    setEmergencyAlertsHistory(getStoredAlerts());
  }, [getStoredAlerts]);

  useEffect(() => {
    updateHistoryFromStorage(); // Initial load

    // Listen for custom event and storage event
    window.addEventListener("new-emergency-alert", updateHistoryFromStorage);
    window.addEventListener("storage", updateHistoryFromStorage);

    return () => {
      window.removeEventListener("new-emergency-alert", updateHistoryFromStorage);
      window.removeEventListener("storage", updateHistoryFromStorage);
    };
  }, [updateHistoryFromStorage]);

  const filteredHistory = useMemo(() => {
    if (!loggedInUser || !wardInfo.wardNo) return [];
    return emergencyAlertsHistory
      .filter(alert =>
        alert.senderId === loggedInUser.id && // Only show alerts sent by this specific ward member
        alert.wardNo === wardInfo.wardNo
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Newest first
  }, [emergencyAlertsHistory, loggedInUser, wardInfo.wardNo]);

  // --- Form Handlers ---
  const handleReasonChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_CHAR_COUNT) {
      setReason(value);
      setValidationError(""); // Clear validation error on change
    }
  };

  const handleSubmit = async () => {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setValidationError("Emergency reason cannot be empty.");
      return;
    }
    if (trimmedReason.length > MAX_CHAR_COUNT) {
      setValidationError(`Reason exceeds maximum ${MAX_CHAR_COUNT} characters.`);
      return;
    }
    if (!loggedInUser || !wardInfo.wardName) {
      setValidationError("User information or ward details are missing. Cannot send alert.");
      return;
    }

    setIsSubmitting(true);
    setValidationError("");
    setSuccessMessage("");

    try {
      const newAlert = {
        id: `alert_${Date.now()}`, // Unique ID
        title: "Emergency Alert",
        message: trimmedReason,
        wardName: wardInfo.wardName,
        wardNo: wardInfo.wardNo,
        senderId: loggedInUser.id,
        senderName: loggedInUser.name || "Ward Member", // Fallback sender name
        senderRole: "ward",
        createdAt: new Date().toISOString(),
        status: "active",
        read: false,
      };

      const currentAlerts = getStoredAlerts();
      const updatedAlerts = [newAlert, ...currentAlerts]; // Add new alert at the beginning

      localStorage.setItem("emergencyAlerts", JSON.stringify(updatedAlerts));

      // Dispatch custom event for other tabs/windows
      window.dispatchEvent(
        new CustomEvent("new-emergency-alert", {
          detail: newAlert,
        })
      );

      setReason(""); // Clear textarea
      setSuccessMessage("Emergency alert sent successfully.");

      // Automatically clear success message after a few seconds
      setTimeout(() => setSuccessMessage(""), 5000);

    } catch (error) {
      console.error("Error sending emergency alert:", error);
      setValidationError("Failed to send alert. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAlert = (alertId) => {
    if (window.confirm("Are you sure you want to remove this emergency alert from history? This action cannot be undone.")) {
      try {
        const currentAlerts = getStoredAlerts();
        const updatedAlerts = currentAlerts.filter(alert => alert.id !== alertId);
        localStorage.setItem("emergencyAlerts", JSON.stringify(updatedAlerts));
        updateHistoryFromStorage(); // Refresh the history display
      } catch (error) {
        console.error("Error removing alert:", error);
        alert("Failed to remove alert.");
      }
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (userRole !== "ward") {
    return (
      <div className="ea-container ea-access-denied">
        <h1>Access Denied</h1>
        <p>You must be a Ward Member to access this page.</p>
        <p>Please log in with a Ward Member account.</p>
      </div>
    );
  }

  return (
    <div className="ea-container">
      <div className="ea-main-content">
        <div className="ea-header">
          <AlertTriangle className="ea-header-icon" size={24} />
          <div className="ea-header-text">
            <h1>Emergency Alert</h1>
            <p>Send an emergency notification to all citizens in your ward.</p>
          </div>
        </div>

        <div className="ea-card ea-warning-card">
          <div className="ea-warning-header">
            <AlertTriangle className="ea-warning-icon" size={20} />
            <h2>Send Emergency Alert</h2>
          </div>
          <p className="ea-warning-description">
            This alert will immediately notify all registered citizens in your ward (
            <span className="ea-bold">{wardInfo.wardName || 'N/A'}</span>) via SMS and App Push Notification.
          </p>
        </div>

        <div className="ea-card ea-form-card">
          <label htmlFor="emergencyReason" className="ea-label">Emergency Reason</label>
          <textarea
            id="emergencyReason"
            className="ea-textarea"
            placeholder="Enter the reason for this emergency alert..."
            value={reason}
            onChange={handleReasonChange}
            rows="6"
            maxLength={MAX_CHAR_COUNT}
            disabled={isSubmitting}
          ></textarea>
          <div className="ea-textarea-footer">
            <p className="ea-example-text">
              Example: "Heavy rainfall and flooding expected in Ward 07. Citizens are advised to avoid low-lying areas and remain indoors."
            </p>
            <span className="ea-char-counter">{reason.length}/{MAX_CHAR_COUNT}</span>
          </div>
          {validationError && <p className="ea-error-message">{validationError}</p>}
          {successMessage && <p className="ea-success-message">{successMessage}</p>}

          <button
            className="ea-send-button"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim() || reason.length > MAX_CHAR_COUNT}
          >
            <Send size={18} />
            {isSubmitting ? "Sending..." : "Send Emergency Alert"}
          </button>
        </div>
      </div>

      <div className="ea-history-sidebar">
        <h2>Emergency Alert History</h2>
        <div className="ea-history-list">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((alert) => (
              <div key={alert.id} className="ea-history-item">
                <div className="ea-history-item-header">
                  <AlertTriangle size={16} className="ea-history-icon" />
                  <span className="ea-history-title">{alert.title}</span>
                  <span className="ea-history-date">
                    {formatDate(alert.createdAt)}
                  </span>
                  <button
                    className="ea-remove-alert-btn"
                    onClick={() => handleRemoveAlert(alert.id)}
                    title="Remove alert"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="ea-history-message">{alert.message}</p>
                <div className="ea-history-footer">
                  <span className="ea-history-status">
                    <span className="ea-dot ea-dot-green"></span> Sent
                  </span>
                  <span className="ea-history-ward">Ward: {alert.wardName}</span>
                  <span className="ea-history-time">Time: {formatTime(alert.createdAt)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="ea-no-history">No emergency alerts sent yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}