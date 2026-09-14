import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

export default function PublicVisibilityPage() {
    const navigate = useNavigate();
    const [showPhone, setShowPhone] = useState(true);
    const [showEmail, setShowEmail] = useState(false);
    const [showWard, setShowWard] = useState(true);

    useEffect(() => {
        const savedTheme = localStorage.getItem("ente_gramam_theme");
        if (savedTheme === "dark") {
            document.body.classList.add("dark-theme");
        }
    }, []);

    const handleSave = (e) => {
        e.preventDefault();
        alert("Public visibility preferences updated successfully!");
    };

    return (
        <div className="feedback-wrapper">
            <div className="feedback-top-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h2>👁️ Manage Public Visibility</h2>
                    <p>Control what other citizens and ward members can see on your profile.</p>
                </div>
                <button 
                    onClick={() => navigate("/Settings")} 
                    style={{ background: "#e2e8f0", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", color: "#1e293b" }}
                >
                    ← Back to Settings
                </button>
            </div>

            <div className="section-block">
                <form onSubmit={handleSave} className="general-form-card" style={{ maxWidth: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <strong style={{ fontSize: "14px" }}>Show Phone Number</strong>
                            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>Allow ward members to view your contact number for emergencies.</p>
                        </div>
                        <input 
                            type="checkbox" 
                            checked={showPhone} 
                            onChange={() => setShowPhone(!showPhone)} 
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                    </div>

                    <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "0" }} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <strong style={{ fontSize: "14px" }}>Show Email Address</strong>
                            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>Display your email address on your public profile card.</p>
                        </div>
                        <input 
                            type="checkbox" 
                            checked={showEmail} 
                            onChange={() => setShowEmail(!showEmail)} 
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                    </div>

                    <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "0" }} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <strong style={{ fontSize: "14px" }}>Show Ward Information</strong>
                            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>Let others see your assigned ward and locality details.</p>
                        </div>
                        <input 
                            type="checkbox" 
                            checked={showWard} 
                            onChange={() => setShowWard(!showWard)} 
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                    </div>

                    <button 
                        type="submit" 
                        style={{ background: "#059669", color: "#fff", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" }}
                    >
                        Save Preferences
                    </button>
                </form>
            </div>
        </div>
    );
}