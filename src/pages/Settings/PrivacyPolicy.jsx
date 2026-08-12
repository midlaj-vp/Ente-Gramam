import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

export default function PrivacyPolicyPage() {
    const navigate = useNavigate();

    useEffect(() => {
        const savedTheme = localStorage.getItem("ente_gramam_theme");
        if (savedTheme === "dark") {
            document.body.classList.add("dark-theme");
        }
    }, []);

    return (
        <div className="feedback-wrapper">
            <div className="feedback-top-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h2>📜 Privacy Policy & Data Sharing</h2>
                    <p>Last updated: August 2026</p>
                </div>
                {/* തിരികെ സെറ്റിങ്സിലേക്ക് പോകാനുള്ള ബാക്ക് ബട്ടൺ */}
                <button 
                    onClick={() => navigate("/Settings")} 
                    style={{ background: "#e2e8f0", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", color: "#1e293b" }}
                >
                    ← Back to Settings
                </button>
            </div>

            <div className="section-block" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className="general-form-card" style={{ maxWidth: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <h3 style={{ color: "#0284c7", fontSize: "16px" }}>1. Information We Collect</h3>
                    <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#475569" }}>
                        Ente Gramam collects personal information such as your name, phone number, ward number, and address when you register as a citizen or official. This data is strictly used for local governance, grievance redressal, and community announcements.
                    </p>

                    <h3 style={{ color: "#0284c7", fontSize: "16px", marginTop: "10px" }}>2. Data Sharing for Rural Development</h3>
                    <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#475569" }}>
                        We may share completely anonymized and aggregated statistical data with authorized rural development researchers and government bodies to improve village infrastructure and welfare projects. Your personal identity is never exposed in these reports.
                    </p>

                    <h3 style={{ color: "#0284c7", fontSize: "16px", marginTop: "10px" }}>3. Data Security</h3>
                    <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#475569" }}>
                        We implement robust security measures, including encrypted local storage and role-based access control, to protect your account details from unauthorized access.
                    </p>

                    <h3 style={{ color: "#0284c7", fontSize: "16px", marginTop: "10px" }}>4. Your Rights</h3>
                    <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#475569" }}>
                        You have the right to request a complete export of your personal history or permanently delete your account through the Settings menu under the Danger Zone.
                    </p>
                </div>
            </div>
        </div>
    );
}