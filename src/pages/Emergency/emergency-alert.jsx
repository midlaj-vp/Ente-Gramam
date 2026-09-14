import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AlertTriangle, Send, Trash2, Volume2 } from "lucide-react";
import api from "../../axiosInstance";
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

  const playEmergencySiren = () => {
    try {
      const audio = new Audio("/alert.mp3");
      audio.currentTime = 0;
      audio.play().catch((e) => console.error("Audio playback error:", e));
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

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
        setWardInfo({ wardName: detectedWardName, wardNo: String(detectedWardNo) });
      }
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
      setUserRole("");
    }
  }, []);

  const fetchAlertsFromBackend = useCallback(async () => {
    try {
      const res = await api.get("emergency-alerts/");
      const results = Array.isArray(res.data) ? res.data : res.data.results || [];
      setEmergencyAlertsHistory(results);
    } catch (e) {
      console.error("Failed to fetch alerts from backend:", e);
    }
  }, []);

  useEffect(() => {
    fetchAlertsFromBackend();
    const interval = setInterval(fetchAlertsFromBackend, 15000); 
    return () => clearInterval(interval);
  }, [fetchAlertsFromBackend]);

  const filteredHistory = useMemo(() => {
    if (!loggedInUser || !wardInfo.wardNo) return [];
    return emergencyAlertsHistory
      .filter(alert =>
        String(alert.sender_id) === String(loggedInUser.id) &&
        String(alert.ward_no) === String(wardInfo.wardNo)
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [emergencyAlertsHistory, loggedInUser, wardInfo.wardNo]);

  const handleReasonChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_CHAR_COUNT) {
      setReason(value);
      setValidationError("");
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
      const payload = {
        title: "Emergency Alert",
        message: trimmedReason,
        ward_name: wardInfo.wardName,
        ward_no: String(wardInfo.wardNo),
        sender_id: String(loggedInUser.id),
        sender_name: loggedInUser.name || loggedInUser.username || "Ward Member",
        sender_role: "ward",
        status: "active"
      };

      await api.post("emergency-alerts/", payload);

      setReason("");
      setSuccessMessage("Emergency alert sent successfully to citizens.");
      fetchAlertsFromBackend();

      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      console.error("Error sending emergency alert:", error);
      setValidationError("Failed to send alert. Please check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAlert = async (alertId) => {
    if (window.confirm("Are you sure you want to remove this emergency alert from history?")) {
      try {
        await api.delete(`emergency-alerts/${alertId}/`);
        setEmergencyAlertsHistory(prev => prev.filter(item => item.id !== alertId));
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

          <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
            <button
              className="ea-send-button"
              onClick={handleSubmit}
              disabled={isSubmitting || !reason.trim() || reason.length > MAX_CHAR_COUNT}
              style={{ flex: 1 }}
            >
              <Send size={18} />
              {isSubmitting ? "Sending..." : "Send Emergency Alert"}
            </button>
            <button
              type="button"
              onClick={playEmergencySiren}
              title="Test Emergency Siren Sound"
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #dc2626",
                background: "#fef2f2",
                color: "#dc2626",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Volume2 size={18} /> Test Sound
            </button>
          </div>
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
                    {formatDate(alert.created_at)}
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
                  <span className="ea-history-ward">Ward: {alert.ward_name}</span>
                  <span className="ea-history-time">Time: {formatTime(alert.created_at)}</span>
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