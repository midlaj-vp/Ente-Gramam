import React, { useState, useEffect } from "react";
import "./HarithaKarmaSena.css";

export default function HarithaKarmaSenaPage() {
    const [userRole, setUserRole] = useState("citizen");
    const [currentUser, setCurrentUser] = useState({});
    const [schedules, setSchedules] = useState([]);
    const [pickupRequests, setPickupRequests] = useState([]);
    const [activeTab, setActiveTab] = useState("schedules"); // 'schedules' or 'requests'

    // Modal state for Request Special Pickup
    const [showPickupModal, setShowPickupModal] = useState(false);
    const [pickupData, setPickupData] = useState({ 
        name: "", 
        phone: "", 
        ward: "", 
        wasteType: "Plastic Bulk", 
        note: "" 
    });

    // Modal state for Add Schedule
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [wasteType, setWasteType] = useState("");
    const [scheduleDay, setScheduleDay] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [wardInfo, setWardInfo] = useState("");

    // Modal state for Updating Impact Stats (Admin / HKS / Panchayat)
    const [showImpactModal, setShowImpactModal] = useState(false);
    const [impactStats, setImpactStats] = useState({ totalKg: 1250, monthlyGoalPercent: 80 });
    const [newTotalKg, setNewTotalKg] = useState("1250");
    const [newGoalPercent, setNewGoalPercent] = useState("80");

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

        setCurrentUser(loggedInUser);
        const role = (loggedInUser.role || localStorage.getItem("userRole") || "citizen").toLowerCase();
        setUserRole(role);

        const userWard = loggedInUser.ward || localStorage.getItem("userWard") || "Ward 4";

        // Pre-fill user data (Ward is locked to the logged-in user's ward)
        setPickupData((prev) => ({
            ...prev,
            name: loggedInUser.name || loggedInUser.username || "",
            phone: loggedInUser.phone || "",
            ward: userWard
        }));

        // Initial Sample Schedules
        const defaultSchedules = [
            {
                id: 1,
                wasteType: "Plastic Waste",
                day: "Monday",
                time: "8:00 AM - 12:00 PM",
                wards: "Wards 1, 3, 5",
                icon: "♻️"
            },
            {
                id: 2,
                wasteType: "Organic Waste",
                day: "Wednesday",
                time: "7:00 AM - 10:00 AM",
                wards: "All Wards",
                icon: "🌿"
            }
        ];

        // Load Saved Schedules
        const savedSchedules = localStorage.getItem("ente_gramam_hks_schedules");
        if (savedSchedules) {
            try {
                setSchedules(JSON.parse(savedSchedules));
            } catch (err) {
                setSchedules(defaultSchedules);
            }
        } else {
            setSchedules(defaultSchedules);
            localStorage.setItem("ente_gramam_hks_schedules", JSON.stringify(defaultSchedules));
        }

        // Load Saved Special Pickup Requests
        const savedPickups = localStorage.getItem("ente_gramam_hks_pickups");
        if (savedPickups) {
            try {
                setPickupRequests(JSON.parse(savedPickups));
            } catch (e) {}
        }

        // Load Saved Impact Stats
        const savedImpact = localStorage.getItem("ente_gramam_hks_impact");
        if (savedImpact) {
            try {
                const parsed = JSON.parse(savedImpact);
                setImpactStats(parsed);
                setNewTotalKg(parsed.totalKg.toString());
                setNewGoalPercent(parsed.monthlyGoalPercent.toString());
            } catch (e) {}
        }
    }, []);

    // Helper check for Admin / Panchayat / HKS Privilege
    const isPrivileged = userRole.includes("panchayat") || userRole.includes("admin") || userRole.includes("hks") || userRole.includes("ward");

    // Handle Schedule Actions
    const handleAddSchedule = (e) => {
        e.preventDefault();
        if (!wasteType || !scheduleDay) return;

        const newSch = {
            id: Date.now(),
            wasteType,
            day: scheduleDay,
            time: scheduleTime || "8:00 AM - 12:00 PM",
            wards: wardInfo || "All Wards",
            icon: "🚛"
        };

        const updated = [newSch, ...schedules];
        setSchedules(updated);
        localStorage.setItem("ente_gramam_hks_schedules", JSON.stringify(updated));

        setShowScheduleModal(false);
        setWasteType("");
        setScheduleDay("");
        setScheduleTime("");
        setWardInfo("");
        alert("Collection schedule added successfully!");
    };

    const handleDeleteSchedule = (id) => {
        if (!window.confirm("Are you sure you want to delete this schedule?")) return;
        const updated = schedules.filter((s) => s.id !== id);
        setSchedules(updated);
        localStorage.setItem("ente_gramam_hks_schedules", JSON.stringify(updated));
    };

    // Handle Pickup Request Submission (By Citizen)
    const handlePickupSubmit = (e) => {
        e.preventDefault();
        const activeWard = currentUser.ward || localStorage.getItem("userWard") || "Ward 4";

        const newRequest = {
            id: Date.now(),
            ...pickupData,
            ward: activeWard, // Locked strictly to logged-in user's ward
            status: "Pending",
            date: new Date().toLocaleDateString(),
            requestedBy: currentUser.username || pickupData.name
        };

        const updated = [newRequest, ...pickupRequests];
        setPickupRequests(updated);
        localStorage.setItem("ente_gramam_hks_pickups", JSON.stringify(updated));

        alert("Special pickup request submitted successfully! Haritha Karma Sena will review it shortly.");
        setShowPickupModal(false);
        setPickupData({ 
            name: currentUser.name || "", 
            phone: currentUser.phone || "", 
            ward: activeWard, 
            wasteType: "Plastic Bulk", 
            note: "" 
        });
    };

    // Toggle Pickup Request Status (By HKS / Admin)
    const handleTogglePickupStatus = (id) => {
        const updated = pickupRequests.map((req) => {
            if (req.id === id) {
                return { ...req, status: req.status === "Pending" ? "Completed" : "Pending" };
            }
            return req;
        });
        setPickupRequests(updated);
        localStorage.setItem("ente_gramam_hks_pickups", JSON.stringify(updated));
    };

    // Delete Pickup Request (By HKS / Admin)
    const handleDeletePickupRequest = (id) => {
        if (!window.confirm("Delete this request?")) return;
        const updated = pickupRequests.filter((req) => req.id !== id);
        setPickupRequests(updated);
        localStorage.setItem("ente_gramam_hks_pickups", JSON.stringify(updated));
    };

    // Handle Impact Stats Update (By HKS / Admin)
    const handleUpdateImpact = (e) => {
        e.preventDefault();
        const updatedStats = {
            totalKg: Number(newTotalKg) || 0,
            monthlyGoalPercent: Number(newGoalPercent) || 0
        };
        setImpactStats(updatedStats);
        localStorage.setItem("ente_gramam_hks_impact", JSON.stringify(updatedStats));
        setShowImpactModal(false);
        alert("Green Karma Impact updated successfully!");
    };

    // Filter requests for Citizens (Show only their own) vs Admins (Show all)
    const userPickupRequests = isPrivileged
        ? pickupRequests
        : pickupRequests.filter((req) => req.requestedBy === currentUser.username || req.name === currentUser.name);

    return (
        <div className="hks-wrapper">
            {/* Top Header */}
            <div className="hks-top-header">
                <div>
                    <h2>Haritha Karma Sena</h2>
                    <p>Waste Management Hub & Green Initiatives ({userRole.toUpperCase()} PANEL)</p>
                </div>
                <button className="btn-request-pickup" onClick={() => setShowPickupModal(true)}>
                    🚚 Request Special Pickup
                </button>
            </div>

            {/* Navigation Tabs for Switching Views */}
            <div className="hks-tabs-bar" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                <button
                    className={`tab-btn ${activeTab === "schedules" ? "active" : ""}`}
                    onClick={() => setActiveTab("schedules")}
                    style={{
                        padding: "8px 16px",
                        borderRadius: "20px",
                        border: "1px solid #cbd5e1",
                        background: activeTab === "schedules" ? "#16a34a" : "#f8fafc",
                        color: activeTab === "schedules" ? "#fff" : "#334155",
                        cursor: "pointer",
                        fontWeight: "600"
                    }}
                >
                    🗓️ Collection Schedules
                </button>
                <button
                    className={`tab-btn ${activeTab === "requests" ? "active" : ""}`}
                    onClick={() => setActiveTab("requests")}
                    style={{
                        padding: "8px 16px",
                        borderRadius: "20px",
                        border: "1px solid #cbd5e1",
                        background: activeTab === "requests" ? "#16a34a" : "#f8fafc",
                        color: activeTab === "requests" ? "#fff" : "#334155",
                        cursor: "pointer",
                        fontWeight: "600"
                    }}
                >
                    📋 Special Pickup Requests {userPickupRequests.length > 0 && `(${userPickupRequests.length})`}
                </button>
            </div>

            {/* View 1: Collection Schedules & Impact Dashboard */}
            {activeTab === "schedules" && (
                <div className="hks-main-grid">
                    {/* Left Section: Collection Schedule */}
                    <div className="hks-schedule-section">
                        <div className="schedule-header-row">
                            <h3>Collection Schedule</h3>
                            {isPrivileged && (
                                <button className="btn-add-sched" onClick={() => setShowScheduleModal(true)}>
                                    + Add Schedule
                                </button>
                            )}
                        </div>

                        <div className="schedule-cards-list">
                            {schedules.map((item) => (
                                <div key={item.id} className="schedule-card-item" style={{ position: "relative" }}>
                                    <div className="sched-left">
                                        <div className="sched-icon-box">{item.icon}</div>
                                        <div>
                                            <h4>{item.wasteType}</h4>
                                            <span className="sched-wards">{item.wards}</span>
                                        </div>
                                    </div>
                                    <div className="sched-right" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <div>
                                            <span className="sched-day">{item.day}</span>
                                            <span className="sched-time">{item.time}</span>
                                        </div>
                                        {isPrivileged && (
                                            <button
                                                onClick={() => handleDeleteSchedule(item.id)}
                                                style={{
                                                    background: "#fee2e2",
                                                    color: "#dc2626",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    padding: "4px 8px",
                                                    cursor: "pointer",
                                                    fontSize: "12px"
                                                }}
                                                title="Delete Schedule"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Section: Green Karma Impact Box */}
                    <div className="hks-impact-card">
                        <div>
                            <div className="impact-header-flex">
                                <h3>Green Karma Impact</h3>
                                {isPrivileged && (
                                    <button className="btn-edit-impact" onClick={() => setShowImpactModal(true)} title="Update Impact Stats">
                                        ⚙️ Edit
                                    </button>
                                )}
                            </div>
                            <div className="impact-subtitle">Total Plastic Collected (This Month)</div>
                            <div className="impact-kg-value">
                                {impactStats.totalKg.toLocaleString()} <span className="kg-unit">kg</span>
                            </div>
                        </div>

                        <div>
                            <div className="impact-goal-row">
                                <span>Monthly Goal</span>
                                <span>{impactStats.monthlyGoalPercent}%</span>
                            </div>
                            <div className="impact-progress-bar">
                                <div className="impact-progress-fill" style={{ width: `${Math.min(impactStats.monthlyGoalPercent, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View 2: Special Pickup Requests Management / Tracking */}
            {activeTab === "requests" && (
                <div className="pickup-requests-section" style={{ background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <h3>{isPrivileged ? "Manage Special Pickup Requests" : "My Special Pickup Requests"}</h3>
                    <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "16px" }}>
                        {isPrivileged
                            ? "Review requests submitted by residents and update completion status."
                            : "Track status of special waste collection requests you submitted."}
                    </p>

                    {userPickupRequests.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>No pickup requests found.</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {userPickupRequests.map((req) => (
                                <div
                                    key={req.id}
                                    style={{
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "8px",
                                        padding: "16px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        background: req.status === "Completed" ? "#f0fdf4" : "#ffffff"
                                    }}
                                >
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                                            <strong style={{ fontSize: "16px" }}>{req.wasteType}</strong>
                                            <span
                                                style={{
                                                    fontSize: "11px",
                                                    padding: "2px 8px",
                                                    borderRadius: "12px",
                                                    fontWeight: "bold",
                                                    background: req.status === "Completed" ? "#dcfce7" : "#fef3c7",
                                                    color: req.status === "Completed" ? "#166534" : "#92400e"
                                                }}
                                            >
                                                {req.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: "13px", color: "#475569" }}>
                                            👤 <strong>{req.name}</strong> ({req.phone}) | 📍 <strong>{req.ward}</strong>
                                        </div>
                                        {req.note && <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>📝 "{req.note}"</div>}
                                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>📅 Requested on: {req.date}</div>
                                    </div>

                                    {isPrivileged && (
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <button
                                                onClick={() => handleTogglePickupStatus(req.id)}
                                                style={{
                                                    background: req.status === "Pending" ? "#16a34a" : "#ca8a04",
                                                    color: "#fff",
                                                    border: "none",
                                                    padding: "6px 12px",
                                                    borderRadius: "6px",
                                                    cursor: "pointer",
                                                    fontSize: "12px"
                                                }}
                                            >
                                                {req.status === "Pending" ? "Mark Completed" : "Mark Pending"}
                                            </button>
                                            <button
                                                onClick={() => handleDeletePickupRequest(req.id)}
                                                style={{
                                                    background: "#fee2e2",
                                                    color: "#dc2626",
                                                    border: "1px solid #fca5a5",
                                                    padding: "6px 10px",
                                                    borderRadius: "6px",
                                                    cursor: "pointer",
                                                    fontSize: "12px"
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Green Tips Section */}
            <div className="green-tips-section" style={{ marginTop: "24px" }}>
                <h3>🌱 Green Tips</h3>
                <div className="tips-grid">
                    <div className="tip-card">
                        <div className="tip-icon">💧</div>
                        <h4>Wash Plastics</h4>
                        <p>Rinse plastic containers before disposal to prevent contamination and odor.</p>
                    </div>
                    <div className="tip-card">
                        <div className="tip-icon">📦</div>
                        <h4>Crush Cartons</h4>
                        <p>Flatten cardboard boxes to save space in bins and collection vehicles.</p>
                    </div>
                    <div className="tip-card">
                        <div className="tip-icon">🔋</div>
                        <h4>E-Waste Separation</h4>
                        <p>Keep batteries and electronics separate for specialized collection days.</p>
                    </div>
                </div>
            </div>

            {/* Request Special Pickup Modal */}
            {showPickupModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button className="close-btn" onClick={() => setShowPickupModal(false)}>&times;</button>
                        <h2>Request Special Pickup</h2>
                        <p>Fill out details for bulky waste or special clearance.</p>
                        <form onSubmit={handlePickupSubmit}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input type="text" required value={pickupData.name} onChange={(e) => setPickupData({ ...pickupData, name: e.target.value })} placeholder="Your Name" />
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input type="text" required value={pickupData.phone} onChange={(e) => setPickupData({ ...pickupData, phone: e.target.value })} placeholder="10-digit mobile number" />
                            </div>

                            {/* WARD FIELD IS LOCKED TO LOGGED-IN USER'S WARD */}
                            <div className="form-group">
                                <label>Ward Number (Assigned Location)</label>
                                <input 
                                    type="text" 
                                    value={pickupData.ward || currentUser.ward || "Ward 4"} 
                                    readOnly 
                                    disabled
                                    style={{ background: "#f1f5f9", cursor: "not-allowed", color: "#64748b", fontWeight: "bold" }} 
                                />
                                <small style={{ color: "#94a3b8", fontSize: "11px" }}>🔒 Locked to your logged-in ward</small>
                            </div>

                            <div className="form-group">
                                <label>Waste Type</label>
                                <select value={pickupData.wasteType} onChange={(e) => setPickupData({ ...pickupData, wasteType: e.target.value })}>
                                    <option value="Plastic Bulk">Bulk Plastic / Materials</option>
                                    <option value="E-Waste">Electronic Waste</option>
                                    <option value="Glass & Old Items">Glass / Old Household Items</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Additional Notes</label>
                                <textarea rows="2" value={pickupData.note} onChange={(e) => setPickupData({ ...pickupData, note: e.target.value })} placeholder="Details about quantity..."></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowPickupModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Schedule Modal (Admin / HKS Only) */}
            {showScheduleModal && isPrivileged && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button className="close-btn" onClick={() => setShowScheduleModal(false)}>&times;</button>
                        <h2>Add Collection Schedule</h2>
                        <p>Set new waste collection timings for wards.</p>
                        <form onSubmit={handleAddSchedule}>
                            <div className="form-group">
                                <label>Waste Type</label>
                                <input type="text" required value={wasteType} onChange={(e) => setWasteType(e.target.value)} placeholder="e.g. Glass & E-Waste" />
                            </div>
                            <div className="form-group">
                                <label>Day</label>
                                <input type="text" required value={scheduleDay} onChange={(e) => setScheduleDay(e.target.value)} placeholder="e.g. Friday" />
                            </div>
                            <div className="form-group">
                                <label>Time Slot</label>
                                <input type="text" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} placeholder="e.g. 9:00 AM - 1:00 PM" />
                            </div>
                            <div className="form-group">
                                <label>Wards Applicable</label>
                                <input type="text" value={wardInfo} onChange={(e) => setWardInfo(e.target.value)} placeholder="e.g. Wards 2, 4, 6" />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">Save Schedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Update Impact Modal (Admin / HKS Only) */}
            {showImpactModal && isPrivileged && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button className="close-btn" onClick={() => setShowImpactModal(false)}>&times;</button>
                        <h2>Update Green Karma Impact</h2>
                        <p>Modify total plastic collection and monthly goal progress.</p>
                        <form onSubmit={handleUpdateImpact}>
                            <div className="form-group">
                                <label>Total Plastic Collected (in kg)</label>
                                <input type="number" required value={newTotalKg} onChange={(e) => setNewTotalKg(e.target.value)} placeholder="e.g. 1500" />
                            </div>
                            <div className="form-group">
                                <label>Monthly Goal Percentage (%)</label>
                                <input type="number" min="0" max="100" required value={newGoalPercent} onChange={(e) => setNewGoalPercent(e.target.value)} placeholder="e.g. 85" />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowImpactModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">Update Impact</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}