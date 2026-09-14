import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../axiosInstance"; // 👈 1. നമ്മൾ നിർമ്മിച്ച Axios Instance ഇമ്പോർട്ട് ചെയ്തു
import "./Settings.css";

export default function SettingsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("citizen");
  const [userName, setUserName] = useState("Anonymous User");
  const [userWard, setUserWard] = useState("Ward 1");

  const [settings, setSettings] = useState({
    smsAlerts: true,
    pushAlerts: false,
    emergencyBroadcasts: true,
    language: "English",
    theme: localStorage.getItem("theme") || "light",
  });

  const [adminSettings, setAdminSettings] = useState({
    maintenanceMode: false,
    publicRegistration: true,
  });

  // 🟢 Theme 적용
  useEffect(() => {
    const currentTheme = settings.theme || "light";
    localStorage.setItem("theme", currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);

    if (currentTheme === "dark") {
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
    } else {
      document.body.classList.add("light-theme");
      document.body.classList.remove("dark-theme");
    }
  }, [settings.theme]);

  // 🟢 Settings Data Fetching
  useEffect(() => {
    async function fetchSettings() {
      const storedUser = localStorage.getItem("user") || localStorage.getItem("loggedInUser");
      if (!storedUser) {
        navigate("/");
        return;
      }

      try {
        // 👈 2. fetch-ന് പകരം api.get ഉപയോഗിച്ചു (HttpOnly Cookie ഓട്ടോമാറ്റിക്കായി അയക്കപ്പെടും)
        const userRes = await api.get("settings/user/");

        if (userRes.data) {
          const data = userRes.data;

          setUserRole(data.role || "citizen");
          setUserName(data.username || "Anonymous User");
          setUserWard(data.ward || "Ward 1");

          setSettings({
            smsAlerts: data.sms_alerts ?? true,
            pushAlerts: data.push_alerts ?? false,
            emergencyBroadcasts: data.emergency_broadcasts ?? true,
            language: data.language || "English",
            theme: data.theme || localStorage.getItem("theme") || "light",
          });

          const role = (data.role || "").toLowerCase();
          const isPrivilegedRole = role.includes("panchayat") || role.includes("admin");

          if (isPrivilegedRole) {
            const adminRes = await api.get("settings/admin/");
            if (adminRes.data) {
              const adminData = adminRes.data;
              setAdminSettings({
                maintenanceMode: adminData.maintenance_mode ?? false,
                publicRegistration: adminData.public_registration ?? true,
              });
            }
          }
        }
      } catch (error) {
        console.error("Error connecting to backend settings API:", error);
        if (error.response?.status === 401) {
          localStorage.clear();
          navigate("/");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [navigate]);

  // 🟢 Update User Settings
  const updateUserSettings = async (key, newValue, apiKey) => {
    const previousValue = settings[key];
    setSettings((prev) => ({ ...prev, [key]: newValue }));

    try {
      // 👈 3. api.patch ഉപയോഗിച്ച് അപ്‌ഡേറ്റ് ചെയ്യുന്നു
      await api.patch("settings/user/", { [apiKey]: newValue });
    } catch (err) {
      console.error("Setting sync failed:", err);
      alert("Failed to sync change with server.");
      setSettings((prev) => ({ ...prev, [key]: previousValue }));
    }
  };

  // 🟢 Update Admin Settings
  const updateAdminSettings = async (key, newValue, apiKey) => {
    const previousValue = adminSettings[key];
    setAdminSettings((prev) => ({ ...prev, [key]: newValue }));

    try {
      await api.patch("settings/admin/", { [apiKey]: newValue });
    } catch (err) {
      console.error("Admin setting sync failed:", err);
      alert("Failed to sync system setting with server.");
      setAdminSettings((prev) => ({ ...prev, [key]: previousValue }));
    }
  };

  // 🟢 Delete Account
  const handleDeleteAccount = async () => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete your account and history? This action cannot be undone."
      )
    ) {
      try {
        // 👈 4. api.delete ഉപയോഗിക്കുന്നു
        const res = await api.delete("settings/delete-account/");
        if (res.status === 200 || res.status === 204) {
          alert("Account deleted successfully.");
          localStorage.clear();
          navigate("/");
        }
      } catch (err) {
        console.error("Account deletion failed:", err);
        alert("Failed to delete account from server.");
      }
    }
  };

  const isPrivileged = userRole.includes("panchayat") || userRole.includes("admin");
  const isWardMember = userRole.includes("ward");

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading Settings...</div>;
  }

  return (
    <div className="feedback-wrapper">
      <div className="feedback-top-header">
        <div>
          <h2>Settings</h2>
          <p>
            Manage your account preferences, app experience, and role permissions for{" "}
            <strong>{userName}</strong> ({userRole.toUpperCase()} - {userWard}).
          </p>
        </div>
      </div>

      <div className="section-block">
        <div className="section-title-row">
          <h3>🔔 Notifications</h3>
          <span className="section-subtitle">Choose how you want to receive alerts and updates.</span>
        </div>

        <div className="general-form-card" style={{ maxWidth: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "14px" }}>SMS Alerts</strong>
              <p style={{ fontSize: "12px", opacity: 0.8, margin: "2px 0 0 0" }}>
                Emergency alerts and OTPs sent to your registered mobile.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.smsAlerts}
              onChange={(e) => updateUserSettings("smsAlerts", e.target.checked, "sms_alerts")}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
          </div>

          <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "14px" }}>In-App Push Notifications</strong>
              <p style={{ fontSize: "12px", opacity: 0.8, margin: "2px 0 0 0" }}>
                Real-time status updates of complaints, projects, and feedback replies.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.pushAlerts}
              onChange={(e) => updateUserSettings("pushAlerts", e.target.checked, "push_alerts")}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
          </div>

          {(isPrivileged || isWardMember) && (
            <>
              <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: "14px" }}>Ward Emergency Broadcasts</strong>
                  <p style={{ fontSize: "12px", opacity: 0.8, margin: "2px 0 0 0" }}>
                    Receive immediate alerts when citizens raise SOS or urgent ward issues.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emergencyBroadcasts}
                  onChange={(e) => updateUserSettings("emergencyBroadcasts", e.target.checked, "emergency_broadcasts")}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="section-block">
        <div className="section-title-row">
          <h3>⚙️ App Preferences</h3>
          <span className="section-subtitle">Customize your portal layout and language.</span>
        </div>

        <div className="general-form-card" style={{ maxWidth: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "13px", fontWeight: "bold" }}>Preferred Language</label>
            <select
              value={settings.language}
              onChange={(e) => updateUserSettings("language", e.target.value, "language")}
              style={{ marginTop: "6px" }}
            >
              <option value="English">English</option>
              <option value="Malayalam">മലയാളം (Malayalam)</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "6px" }}>
              Appearance / Theme
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => updateUserSettings("theme", "light", "theme")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "6px",
                  border: settings.theme === "light" ? "2px solid #059669" : "1px solid #cbd5e1",
                  background: settings.theme === "light" ? "#ecfdf5" : "transparent",
                  color: settings.theme === "light" ? "#065f46" : "inherit",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                ☀️ Light Mode
              </button>
              <button
                type="button"
                onClick={() => updateUserSettings("theme", "dark", "theme")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "6px",
                  border: settings.theme === "dark" ? "2px solid #059669" : "1px solid #cbd5e1",
                  background: settings.theme === "dark" ? "#1e293b" : "transparent",
                  color: settings.theme === "dark" ? "#f8fafc" : "inherit",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                🌙 Dark Mode
              </button>
            </div>
          </div>
        </div>
      </div>

      {isPrivileged && (
        <div className="section-block" style={{ border: "1px dashed #0284c7" }}>
          <div className="section-title-row">
            <h3>🛡️ Panchayat Admin Controls</h3>
            <span className="section-subtitle">Portal-wide system configurations.</span>
          </div>

          <div className="general-form-card" style={{ maxWidth: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: "14px" }}>System Maintenance Mode</strong>
                <p style={{ fontSize: "12px", opacity: 0.8, margin: "2px 0 0 0" }}>
                  Temporarily restrict citizen portal access during updates.
                </p>
              </div>
              <input
                type="checkbox"
                checked={adminSettings.maintenanceMode}
                onChange={(e) => updateAdminSettings("maintenanceMode", e.target.checked, "maintenance_mode")}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
            </div>

            <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: "14px" }}>New Citizen Self-Registration</strong>
                <p style={{ fontSize: "12px", opacity: 0.8, margin: "2px 0 0 0" }}>
                  Allow new citizens to sign up and join village wards.
                </p>
              </div>
              <input
                type="checkbox"
                checked={adminSettings.publicRegistration}
                onChange={(e) => updateAdminSettings("publicRegistration", e.target.checked, "public_registration")}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="section-block">
        <div className="section-title-row">
          <h3>🔒 Privacy & Security</h3>
          <span className="section-subtitle">Manage your account security and data visibility.</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          <div className="general-form-card" style={{ maxWidth: "100%", margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h4 style={{ fontSize: "15px", color: "#0369a1", marginBottom: "6px" }}>Public Visibility</h4>
              <p style={{ fontSize: "13px", opacity: 0.8 }}>Control what other citizens in your ward can see on your profile.</p>
            </div>
            <button
              onClick={() => navigate("/manage-visibility")}
              style={{ background: "transparent", border: "none", color: "#0284c7", fontWeight: "bold", padding: 0, textAlign: "left", cursor: "pointer", marginTop: "12px" }}
            >
              Manage Visibility ›
            </button>
          </div>

          <div className="general-form-card" style={{ maxWidth: "100%", margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h4 style={{ fontSize: "15px", color: "#0369a1", marginBottom: "6px" }}>Data Sharing</h4>
              <p style={{ fontSize: "13px", opacity: 0.8 }}>Sharing anonymized data for rural development research.</p>
            </div>
            <button
              onClick={() => navigate("/privacy-policy")}
              style={{ background: "transparent", border: "none", color: "#0284c7", fontWeight: "bold", padding: 0, textAlign: "left", cursor: "pointer", marginTop: "12px" }}
            >
              Privacy Policy ›
            </button>
          </div>

          <div className="general-form-card danger-card" style={{ maxWidth: "100%", margin: 0, border: "1px solid #fecdd3", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h4 style={{ fontSize: "15px", color: "#be123c", marginBottom: "6px" }}>Danger Zone</h4>
              <p style={{ fontSize: "13px", color: "#881337" }}>Permanently delete your account and history.</p>
            </div>
            <button
              onClick={handleDeleteAccount}
              style={{ background: "transparent", border: "none", color: "#e11d48", fontWeight: "bold", padding: 0, textAlign: "left", cursor: "pointer", marginTop: "12px" }}
            >
              Delete Account 🗑️
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: "linear-gradient(135deg, #065f46 0%, #047857 100%)", padding: "20px", borderRadius: "8px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginTop: "20px" }}>
        <div>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "18px" }}>Enhance your Security</h3>
          <p style={{ margin: 0, fontSize: "13px", opacity: 0.9 }}>
            Enable Two-Factor Authentication (2FA) to protect your Ente Gramam account from unauthorized access.
          </p>
        </div>
        <button
          onClick={() => alert("2FA setup wizard initiated.")}
          style={{ background: "#fff", color: "#065f46", border: "none", padding: "10px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
        >
          🔒 Enable 2FA Now
        </button>
      </div>
    </div>
  );
}