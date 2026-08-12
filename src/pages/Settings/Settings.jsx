import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

export default function SettingsPage() {
    const navigate = useNavigate();
    const [userRole, setUserRole] = useState("citizen");
    const [userName, setUserName] = useState("Anonymous User");
    const [userWard, setUserWard] = useState("Ward 1");

    // Notification states
    const [smsAlerts, setSmsAlerts] = useState(true);
    const [pushAlerts, setPushAlerts] = useState(false);
    const [emergencyBroadcasts, setEmergencyBroadcasts] = useState(true);

    // App Preferences
    const [language, setLanguage] = useState("English");
    const [theme, setTheme] = useState("light");

    // Admin Specific Settings
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [publicRegistration, setPublicRegistration] = useState(true);

    useEffect(() => {
        let loggedInUser = {};
        try {
            loggedInUser = JSON.parse(
                localStorage.getItem("loggedInUser") ||
                localStorage.getItem("user") ||
                "{}"
            );
        } catch (e) {
            loggedInUser = {};
        }

        const role = (loggedInUser.role || localStorage.getItem("userRole") || "citizen").toLowerCase();
        const name = loggedInUser.name || loggedInUser.fullName || localStorage.getItem("userName") || "Anonymous User";
        const ward = loggedInUser.ward || loggedInUser.wardNumber || localStorage.getItem("userWard") || "Ward 1";

        setUserRole(role);
        setUserName(name);
        setUserWard(ward);

        // Load saved settings from localStorage if available
        const savedTheme = localStorage.getItem("ente_gramam_theme");
        if (savedTheme) setTheme(savedTheme);

        const savedLang = localStorage.getItem("ente_gramam_lang");
        if (savedLang) setLanguage(savedLang);
    }, []);

 const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem("ente_gramam_theme", newTheme);
        
        if (newTheme === "dark") {
            document.body.classList.add("dark-theme");
        } else {
            document.body.classList.remove("dark-theme");
        }
    };

    const handleLanguageChange = (e) => {
        const lang = e.target.value;
        setLanguage(lang);
        localStorage.setItem("ente_gramam_lang", lang);
        alert(`Language changed to ${lang}`);
    };

    const handleDeleteAccount = () => {
        if (window.confirm("Are you sure you want to permanently delete your account and history? This action cannot be undone.")) {
            alert("Account deletion request submitted.");
            // Handle account deletion logic here
        }
    };

    const isPrivileged = userRole.includes("panchayat") || userRole.includes("admin");
    const isWardMember = userRole.includes("ward");

    return (
        <div className="feedback-wrapper">
            {/* Top Header */}
            <div className="feedback-top-header">
                <div>
                    <h2>Settings</h2>
                    <p>
                        Manage your account preferences, app experience, and role permissions for <strong>{userName}</strong> ({userRole.toUpperCase()} - {userWard}).
                    </p>
                </div>
            </div>

            {/* Notifications Section */}
            <div className="section-block">
                <div className="section-title-row">
                    <h3>🔔 Notifications</h3>
                    <span className="section-subtitle">Choose how you want to receive alerts and updates.</span>
                </div>

                <div className="general-form-card" style={{ maxWidth: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <strong style={{ fontSize: "14px", color: "#1e293b" }}>SMS Alerts</strong>
                            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>Emergency alerts and OTPs sent to your registered mobile.</p>
                        </div>
                        <input 
                            type="checkbox" 
                            checked={smsAlerts} 
                            onChange={() => setSmsAlerts(!smsAlerts)} 
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                    </div>

                    <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "0" }} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <strong style={{ fontSize: "14px", color: "#1e293b" }}>In-App Push Notifications</strong>
                            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>Real-time status updates of complaints, projects, and feedback replies.</p>
                        </div>
                        <input 
                            type="checkbox" 
                            checked={pushAlerts} 
                            onChange={() => setPushAlerts(!pushAlerts)} 
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                    </div>

                    {(isPrivileged || isWardMember) && (
                        <>
                            <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "0" }} />
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <strong style={{ fontSize: "14px", color: "#1e293b" }}>Ward Emergency Broadcasts</strong>
                                    <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>Receive immediate alerts when citizens raise SOS or urgent ward issues.</p>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={emergencyBroadcasts} 
                                    onChange={() => setEmergencyBroadcasts(!emergencyBroadcasts)} 
                                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* App Preferences Section */}
            <div className="section-block">
                <div className="section-title-row">
                    <h3>⚙️ App Preferences</h3>
                    <span className="section-subtitle">Customize your portal layout and language.</span>
                </div>

                <div className="general-form-card" style={{ maxWidth: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "13px", fontWeight: "bold", color: "#1e293b" }}>Preferred Language</label>
                        <select value={language} onChange={handleLanguageChange} style={{ marginTop: "6px" }}>
                            <option value="English">English</option>
                            <option value="Malayalam">മലയാളം (Malayalam)</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "13px", fontWeight: "bold", color: "#1e293b", display: "block", marginBottom: "6px" }}>Appearance / Theme</label>
                        <div style={{ display: "flex", gap: "12px" }}>
                            <button 
                                type="button" 
                                onClick={() => handleThemeChange("light")}
                                style={{
                                    flex: 1,
                                    padding: "10px",
                                    borderRadius: "6px",
                                    border: theme === "light" ? "2px solid #059669" : "1px solid #cbd5e1",
                                    background: theme === "light" ? "#ecfdf5" : "#fff",
                                    color: theme === "light" ? "#065f46" : "#334155",
                                    fontWeight: "bold",
                                    cursor: "pointer"
                                }}
                            >
                                ☀️ Light Mode
                            </button>
                            <button 
                                type="button" 
                                onClick={() => handleThemeChange("dark")}
                                style={{
                                    flex: 1,
                                    padding: "10px",
                                    borderRadius: "6px",
                                    border: theme === "dark" ? "2px solid #059669" : "1px solid #cbd5e1",
                                    background: theme === "dark" ? "#1e293b" : "#fff",
                                    color: theme === "dark" ? "#f8fafc" : "#334155",
                                    fontWeight: "bold",
                                    cursor: "pointer"
                                }}
                            >
                                🌙 Dark Mode
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Panchayat / Admin Control Panel Settings (Role-Based) */}
            {isPrivileged && (
                <div className="section-block" style={{ border: "1px dashed #0284c7", background: "#f0f9ff" }}>
                    <div className="section-title-row">
                        <h3>🛡️ Panchayat Admin Controls</h3>
                        <span className="section-subtitle">Portal-wide system configurations.</span>
                    </div>

                    <div className="general-form-card" style={{ maxWidth: "100%", display: "flex", flexDirection: "column", gap: "16px", background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <strong style={{ fontSize: "14px", color: "#1e293b" }}>System Maintenance Mode</strong>
                                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>Temporarily restrict citizen portal access during updates.</p>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={maintenanceMode} 
                                onChange={() => setMaintenanceMode(!maintenanceMode)} 
                                style={{ width: "18px", height: "18px", cursor: "pointer" }}
                            />
                        </div>

                        <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "0" }} />

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <strong style={{ fontSize: "14px", color: "#1e293b" }}>New Citizen Self-Registration</strong>
                                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>Allow new citizens to sign up and join village wards.</p>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={publicRegistration} 
                                onChange={() => setPublicRegistration(!publicRegistration)} 
                                style={{ width: "18px", height: "18px", cursor: "pointer" }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Privacy & Security Section */}
            <div className="section-block">
                <div className="section-title-row">
                    <h3>🔒 Privacy & Security</h3>
                    <span className="section-subtitle">Manage your account security and data visibility.</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                    <div className="general-form-card" style={{ maxWidth: "100%", margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                            <h4 style={{ fontSize: "15px", color: "#0369a1", marginBottom: "6px" }}>Public Visibility</h4>
                            <p style={{ fontSize: "13px", color: "#64748b" }}>Control what other citizens in your ward can see on your profile.</p>
                        </div>
                        <button 
                            onClick={() => navigate('/manage-visibility')} 
                            style={{ background: "transparent", border: "none", color: "#0284c7", fontWeight: "bold", padding: 0, textAlign: "left", cursor: "pointer", marginTop: "12px" }}
                        >
                            Manage Visibility ›
                        </button>
                    </div>

                    <div className="general-form-card" style={{ maxWidth: "100%", margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                            <h4 style={{ fontSize: "15px", color: "#0369a1", marginBottom: "6px" }}>Data Sharing</h4>
                            <p style={{ fontSize: "13px", color: "#64748b" }}>Sharing anonymized data for rural development research.</p>
                        </div>
                        <button 
                            onClick={() => navigate('/privacy-policy')} 
                            style={{ background: "transparent", border: "none", color: "#0284c7", fontWeight: "bold", padding: 0, textAlign: "left", cursor: "pointer", marginTop: "12px" }}
                        >
                            Privacy Policy ›
                        </button>
                    </div>

                    <div className="general-form-card" style={{ maxWidth: "100%", margin: 0, background: "#fff1f2", border: "1px solid #fecdd3", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
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

            {/* Security Banner */}
            <div style={{ background: "linear-gradient(135deg, #065f46 0%, #047857 100%)", padding: "20px", borderRadius: "8px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginTop: "20px" }}>
                <div>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: "18px" }}>Enhance your Security</h3>
                    <p style={{ margin: 0, fontSize: "13px", opacity: 0.9 }}>Enable Two-Factor Authentication (2FA) to protect your Ente Gramam account from unauthorized access.</p>
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