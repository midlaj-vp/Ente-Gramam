import React, { useState, useEffect, useRef } from "react";

const API_BASE_URL = "http://127.0.0.1:8000/api/emergency-alerts";

export default function CitizenEmergencyListener() {
  const [activeAlert, setActiveAlert] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const checkNewAlerts = async () => {
      try {
        const rawUser = localStorage.getItem("loggedInUser") || localStorage.getItem("user");
        if (!rawUser) return;

        const user = JSON.parse(rawUser);
        const userRole = (user.role || "").toLowerCase().trim();

        if (userRole === "citizen") {
          const res = await fetch(`${API_BASE_URL}/`);
          if (res.ok) {
            const data = await res.json();
            const alerts = Array.isArray(data) ? data : data.results || [];

            if (alerts.length > 0) {
              const latestAlert = alerts[0]; 

              const userWardStr = String(user.wardName || user.ward || user.wardNo || "").toLowerCase();
              const alertWardStr = String(latestAlert.ward_name || latestAlert.ward_no || "").toLowerCase();

              const userWardNum = userWardStr.match(/\d+/)?.[0];
              const alertWardNum = alertWardStr.match(/\d+/)?.[0];

              const isWardMatched = 
                (userWardNum && alertWardNum && userWardNum === alertWardNum) ||
                alertWardStr.includes(userWardStr) || 
                userWardStr.includes(alertWardStr);

              if (isWardMatched) {
                const seenAlertId = localStorage.getItem("last_seen_alert_id");

                if (String(seenAlertId) !== String(latestAlert.id)) {
                  setActiveAlert(latestAlert);

                  if (!audioRef.current) {
                    const audio = new Audio("/alert.mp3");
                    audio.loop = true;
                    audioRef.current = audio;
                    audio.play().catch((err) => console.log("Audio autoplay restricted:", err));
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Error fetching emergency alert:", e);
      }
    };

    checkNewAlerts();
    const interval = setInterval(checkNewAlerts, 4000); 
    return () => clearInterval(interval);
  }, []);

  const handleStopAlert = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (activeAlert) {
      localStorage.setItem("last_seen_alert_id", String(activeAlert.id));
    }
    setActiveAlert(null);
  };

  if (!activeAlert) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0, 0, 0, 0.85)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999999,
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: "#ffffff",
        padding: "28px",
        borderRadius: "16px",
        maxWidth: "480px",
        width: "90%",
        textAlign: "center",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
        border: "2px solid #dc2626"
      }}>
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>🚨</div>
        <h2 style={{ color: "#dc2626", margin: "0 0 8px 0", fontSize: "22px" }}>EMERGENCY ALERT!</h2>
        <p style={{ fontWeight: "bold", color: "#1e293b", fontSize: "14px", margin: "4px 0" }}>
          Ward: {activeAlert.ward_name}
        </p>
        <p style={{ color: "#334155", fontSize: "15px", margin: "16px 0", background: "#fef2f2", padding: "12px", borderRadius: "8px" }}>
          "{activeAlert.message}"
        </p>
        
        <button
          onClick={handleStopAlert}
          style={{
            background: "#dc2626",
            color: "#ffffff",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "15px",
            width: "100%",
            marginTop: "10px"
          }}
        >
          🔕 Stop Alarm & Dismiss
        </button>
      </div>
    </div>
  );
}