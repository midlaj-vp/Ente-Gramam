import React, { useState, useEffect } from "react";
import api from "../../axiosInstance";
import "./HarithaKarmaSena.css";

const WARD_NAMES = {
    "ward-1": "North Ward",
    "ward-2": "South Ward",
    "ward-3": "East Ward",
    "ward-4": "West Ward",
    "ward-5": "Central Ward",
    "ward-6": "Hill View",
    "ward-7": "River Side",
    "ward-8": "Market Ward"
};

const formatDateTime = (rawDate) => {
    if (!rawDate) return "Recently";
    try {
        const dateObj = new Date(rawDate);
        if (isNaN(dateObj.getTime())) return String(rawDate);
        return dateObj.toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
    } catch (e) {
        return String(rawDate);
    }
};

const formatWardName = (rawWard) => {
    if (!rawWard) return "Ward 1 (North Ward)";
    let str = String(rawWard).trim();

    const numMatch = str.match(/\d+/);
    if (numMatch) {
        const wardNum = parseInt(numMatch[0], 10);
        const name = WARD_NAMES[`ward-${wardNum}`];
        return name ? `Ward ${wardNum} (${name})` : `Ward ${wardNum}`;
    }

    const foundKey = Object.keys(WARD_NAMES).find(
        (key) => WARD_NAMES[key].toLowerCase() === str.toLowerCase()
    );
    if (foundKey) {
        const wardNum = foundKey.replace("ward-", "");
        return `Ward ${wardNum} (${WARD_NAMES[foundKey]})`;
    }

    return str;
};

const AVAILABLE_WARDS = Array.from({ length: 20 }, (_, i) => {
    const wardNum = i + 1;
    const name = WARD_NAMES[`ward-${wardNum}`];
    return name ? `Ward ${wardNum} (${name})` : `Ward ${wardNum}`;
});

const isScheduleForUserWard = (scheduleWards, userWardStr) => {
    if (!scheduleWards || !userWardStr) return true;

    const schedLower = scheduleWards.toLowerCase();
    const userLower = userWardStr.toLowerCase();

    if (schedLower.includes("all")) return true;

    if (schedLower.includes(userLower) || userLower.includes(schedLower)) {
        return true;
    }

    const userNumMatch = userWardStr.match(/\d+/);
    if (userNumMatch) {
        const userNum = parseInt(userNumMatch[0], 10);

        const rangeMatch = schedLower.match(/wards?\s+(\d+)\s+to\s+(\d+)/);
        if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            if (userNum >= start && userNum <= end) return true;
        }

        const schedNumbers = scheduleWards.match(/\d+/g);
        if (schedNumbers && schedNumbers.map(Number).includes(userNum)) {
            return true;
        }
    }

    return false;
};

export default function HarithaKarmaSenaPage() {
    const [userRole, setUserRole] = useState("citizen");
    const [currentUser, setCurrentUser] = useState({});
    const [currentWard, setCurrentWard] = useState("Ward 1 (North Ward)");
    const [schedules, setSchedules] = useState([]);
    const [pickupRequests, setPickupRequests] = useState([]);
    const [activeTab, setActiveTab] = useState("schedules");
    const [loading, setLoading] = useState(true);

    const [showPickupModal, setShowPickupModal] = useState(false);
    const [editingPickupId, setEditingPickupId] = useState(null);
    const [pickupData, setPickupData] = useState({
        name: "",
        phone: "",
        ward: "Ward 1 (North Ward)",
        wasteType: "Plastic Bulk",
        note: ""
    });

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [wasteType, setWasteType] = useState("Non-biodegradable Plastic");
    const [scheduleDay, setScheduleDay] = useState("Every Monday");
    const [scheduleTime, setScheduleTime] = useState("8:00 AM - 12:00 PM");
    const [wardInfo, setWardInfo] = useState("All Wards (1 to 20)");

    const [showImpactModal, setShowImpactModal] = useState(false);
    const [impactStats, setImpactStats] = useState({ totalKg: 0, monthlyGoalPercent: 0 });
    const [newTotalKg, setNewTotalKg] = useState("");
    const [newGoalPercent, setNewGoalPercent] = useState("");

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

        const rawWard = loggedInUser.wardName || 
                        loggedInUser.ward || 
                        loggedInUser.wardNumber || 
                        loggedInUser.ward_number || 
                        localStorage.getItem("userWard") || 
                        localStorage.getItem("ward") || 
                        "ward-1";

        const formattedWard = formatWardName(rawWard);
        setCurrentWard(formattedWard);

        setPickupData((prev) => ({
            ...prev,
            name: loggedInUser.name || loggedInUser.username || "",
            phone: loggedInUser.phone || loggedInUser.mobile || "",
            ward: formattedWard
        }));

        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [schedRes, pickupRes, impactRes] = await Promise.all([
                api.get("schedules/"),
                api.get("pickups/"),
                api.get("impact/")
            ]);

            setSchedules(schedRes.data);
            setPickupRequests(pickupRes.data);
            if (impactRes.data) {
                setImpactStats(impactRes.data);
                setNewTotalKg(impactRes.data.totalKg?.toString() || "0");
                setNewGoalPercent(impactRes.data.monthlyGoalPercent?.toString() || "0");
            }
        } catch (error) {
            console.error("Error fetching data from server:", error);
        } finally {
            setLoading(false);
        }
    };

    const isPrivileged = userRole.includes("panchayat") || userRole.includes("admin") || userRole.includes("hks") || userRole.includes("ward");

    const filteredSchedules = schedules.filter((item) => {
        if (isPrivileged) return true;
        return isScheduleForUserWard(item.wards, currentWard);
    });

    const handleAddSchedule = async (e) => {
        e.preventDefault();
        if (!wasteType || !scheduleDay) return;

        const payload = {
            wasteType,
            day: scheduleDay,
            time: scheduleTime || "8:00 AM - 12:00 PM",
            wards: wardInfo || "All Wards (1 to 20)",
            icon: "🚛"
        };

        try {
            const res = await api.post("schedules/", payload);
            setSchedules([res.data, ...schedules]);
            setShowScheduleModal(false);
            alert("Schedule added successfully!");
        } catch (err) {
            alert("Failed to save schedule.");
        }
    };

    const handleDeleteSchedule = async (id) => {
        if (!window.confirm("Are you sure you want to delete this schedule?")) return;
        try {
            await api.delete(`schedules/${id}/`);
            setSchedules(schedules.filter((s) => s.id !== id));
        } catch (err) {
            alert("Failed to delete schedule.");
        }
    };

    const closePickupModal = () => {
        setShowPickupModal(false);
        setEditingPickupId(null);
        setPickupData({
            name: currentUser.name || currentUser.username || "",
            phone: currentUser.phone || currentUser.mobile || "",
            ward: currentWard,
            wasteType: "Plastic Bulk",
            note: ""
        });
    };

    const handleEditPickupClick = (req) => {
        setEditingPickupId(req.id);
        setPickupData({
            name: req.name || "",
            phone: req.phone || "",
            ward: formatWardName(req.ward),
            wasteType: req.wasteType || "Plastic Bulk",
            note: req.note || ""
        });
        setShowPickupModal(true);
    };

    const handlePickupSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...pickupData,
            status: editingPickupId ? (pickupRequests.find(r => r.id === editingPickupId)?.status || "Pending") : "Pending",
            requestedBy: currentUser.username || pickupData.name
        };

        try {
            if (editingPickupId) {
                const res = await api.put(`pickups/${editingPickupId}/`, payload);
                setPickupRequests(prev => prev.map(req => req.id === editingPickupId ? res.data : req));
                alert("Pickup request updated successfully!");
            } else {
                const res = await api.post("pickups/", payload);
                setPickupRequests([res.data, ...pickupRequests]);
                alert("Special pickup request submitted successfully!");
            }
            closePickupModal();
        } catch (err) {
            alert("Failed to save pickup request.");
        }
    };

    const handleTogglePickupStatus = async (id, currentStatus) => {
        let collectedKg = 0;
        if (currentStatus === "Pending") {
            const input = window.prompt("എത്ര Kg മാലിന്യം ശേഖരിച്ചു? (Enter weight in Kg):");
            if (input === null) return;
            collectedKg = parseFloat(input);
            if (isNaN(collectedKg) || collectedKg <= 0) {
                alert("ദയവായി സാധുവായ ഒരു Kg എന്റർ ചെയ്യുക.");
                return;
            }
        }

        const nextStatus = currentStatus === "Pending" ? "Completed" : "Pending";

        try {
            await api.patch(`pickups/${id}/status/`, {
                status: nextStatus,
                collected_kg: nextStatus === "Completed" ? collectedKg : 0
            });

            setPickupRequests(prev => prev.map((req) =>
                req.id === id ? { ...req, status: nextStatus, collected_kg: nextStatus === "Completed" ? collectedKg : 0 } : req
            ));

            const impactRes = await api.get("impact/");
            if (impactRes.data) setImpactStats(impactRes.data);
        } catch (err) {
            alert("Failed to update status.");
        }
    };

    const handleDeletePickupRequest = async (id) => {
        if (!window.confirm("ഈ റിക്വസ്റ്റ് ഡിലീറ്റ് ചെയ്യണമെന്നുറപ്പാണോ?")) return;
        try {
            await api.delete(`pickups/${id}/`);
            setPickupRequests(prev => prev.filter((req) => req.id !== id));
            const impactRes = await api.get("impact/");
            if (impactRes.data) setImpactStats(impactRes.data);
        } catch (err) {
            alert("Failed to delete request.");
        }
    };

    const handleUpdateImpact = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post("impact/", {
                totalKg: Number(newTotalKg) || 0,
                monthlyGoalPercent: Number(newGoalPercent) || 0
            });
            setImpactStats(res.data);
            setShowImpactModal(false);
            alert("Impact stats updated!");
        } catch (err) {
            alert("Failed to update impact stats.");
        }
    };

    const userPickupRequests = isPrivileged
        ? pickupRequests
        : pickupRequests.filter((req) => req.requestedBy === currentUser.username || req.name === (currentUser.name || currentUser.username));

    return (
        <div className="hks-wrapper">
            <div className="hks-top-header">
                <div>
                    <h2>Haritha Karma Sena</h2>
                    <p>Waste Management Hub ({userRole.toUpperCase()} PANEL)</p>
                </div>
                <button className="btn-request-pickup" onClick={() => { setEditingPickupId(null); setShowPickupModal(true); }}>
                    🚚 Request Special Pickup
                </button>
            </div>

            <div className="hks-tabs-bar">
                <button className={`tab-btn ${activeTab === "schedules" ? "active" : ""}`} onClick={() => setActiveTab("schedules")}>
                    🗓️ Collection Schedules
                </button>
                <button className={`tab-btn ${activeTab === "requests" ? "active" : ""}`} onClick={() => setActiveTab("requests")}>
                    📋 Pickup Requests ({userPickupRequests.length})
                </button>
            </div>

            {loading ? (
                <div className="hks-loading">Loading data from server...</div>
            ) : (
                <>
                    {activeTab === "schedules" && (
                        <div className="hks-main-grid">
                            <div className="hks-schedule-section">
                                <div className="schedule-header-row">
                                    <h3>Collection Schedule {!isPrivileged && `(${currentWard})`}</h3>
                                    {isPrivileged && (
                                        <button className="btn-add-sched" onClick={() => setShowScheduleModal(true)}>
                                            + Add Schedule
                                        </button>
                                    )}
                                </div>

                                <div className="schedule-cards-list">
                                    {filteredSchedules.length === 0 ? (
                                        <div className="hks-empty-state">No collection schedules found for {currentWard}.</div>
                                    ) : (
                                        filteredSchedules.map((item) => (
                                            <div key={item.id} className="schedule-card-item">
                                                <div className="sched-left">
                                                    <div className="sched-icon-box">{item.icon || "♻️"}</div>
                                                    <div>
                                                        <h4>{item.wasteType}</h4>
                                                        <span className="sched-wards">{formatWardName(item.wards)}</span>
                                                    </div>
                                                </div>
                                                <div className="sched-right">
                                                    <div>
                                                        <span className="sched-day">{item.day}</span>
                                                        <span className="sched-time">{item.time}</span>
                                                    </div>
                                                    {isPrivileged && (
                                                        <button className="btn-icon-delete" onClick={() => handleDeleteSchedule(item.id)} title="Delete">
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="hks-impact-card">
                                <div>
                                    <div className="impact-header-flex">
                                        <h3>Green Karma Impact</h3>
                                        {isPrivileged && (
                                            <button className="btn-edit-impact" onClick={() => setShowImpactModal(true)}>⚙️ Edit</button>
                                        )}
                                    </div>
                                    <div className="impact-subtitle">Total Plastic Collected (This Month)</div>
                                    <div className="impact-kg-wrapper">
                                        <div className="impact-kg-value">
                                            {impactStats.totalKg.toLocaleString()} <span className="kg-unit">kg</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="impact-footer">
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

                    {activeTab === "requests" && (
                        <div className="pickup-requests-section">
                            <h3>{isPrivileged ? "Manage Pickup Requests" : "My Requests"}</h3>

                            {userPickupRequests.length === 0 ? (
                                <div className="hks-empty-state">No pickup requests found.</div>
                            ) : (
                                <div className="pickup-cards-list">
                                    {userPickupRequests.map((req) => {
                                        const reqDate = req.created_at || req.time || req.date_time || req.date || req.createdAt;

                                        return (
                                            <div key={req.id} className="pickup-card-item">
                                                <div className="pickup-card-info">
                                                    <div className="pickup-title-row">
                                                        <strong>{req.wasteType}</strong>
                                                        <span className={`status-badge ${req.status === "Completed" ? "completed" : "pending"}`}>
                                                            {req.status}
                                                        </span>
                                                    </div>
                                                    <div className="pickup-details">
                                                        👤 <strong>{req.name}</strong> ({req.phone}) | 📍 <strong>{formatWardName(req.ward)}</strong>
                                                    </div>
                                                    
                                                    <div className="pickup-datetime" style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                                                        🕒 <strong>Submitted:</strong> {formatDateTime(reqDate)}
                                                    </div>

                                                    {req.note && <div className="pickup-note">📝 "{req.note}"</div>}
                                                </div>

                                                <div className="hks-action-group">
                                                    {isPrivileged && (
                                                        <button
                                                            className={`btn-action btn-status ${req.status === "Pending" ? "is-pending" : "is-completed"}`}
                                                            onClick={() => handleTogglePickupStatus(req.id, req.status)}
                                                        >
                                                            {req.status === "Pending" ? "✓ Mark Completed" : "↺ Mark Pending"}
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn-action btn-edit"
                                                        style={{ background: "#f59e0b", color: "#ffffff", border: "none" }}
                                                        onClick={() => handleEditPickupClick(req)}
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        className="btn-action btn-delete"
                                                        onClick={() => handleDeletePickupRequest(req.id)}
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {showPickupModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button className="close-btn" onClick={closePickupModal}>&times;</button>
                        <h2>{editingPickupId ? "Edit Pickup Request" : "Request Special Pickup"}</h2>
                        <form onSubmit={handlePickupSubmit}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input type="text" required value={pickupData.name} onChange={(e) => setPickupData({ ...pickupData, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input type="text" required value={pickupData.phone} onChange={(e) => setPickupData({ ...pickupData, phone: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Ward Number</label>
                                <input type="text" value={pickupData.ward} readOnly className="read-only-input" />
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
                                <textarea rows="2" value={pickupData.note} onChange={(e) => setPickupData({ ...pickupData, note: e.target.value })}></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={closePickupModal}>Cancel</button>
                                <button type="submit" className="submit-btn">{editingPickupId ? "Update Request" : "Submit Request"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showScheduleModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button className="close-btn" onClick={() => setShowScheduleModal(false)}>&times;</button>
                        <h2>Add Collection Schedule</h2>
                        <form onSubmit={handleAddSchedule}>
                            <div className="form-group">
                                <label>Waste Type</label>
                                <select value={wasteType} onChange={(e) => setWasteType(e.target.value)} required>
                                    <option value="Non-biodegradable Plastic">Non-biodegradable Plastic</option>
                                    <option value="Clean & Dry Plastic">Clean & Dry Plastic</option>
                                    <option value="E-Waste / Electronics">E-Waste / Electronics</option>
                                    <option value="Glass Bottles & Items">Glass Bottles & Items</option>
                                    <option value="Paper & Cardboard">Paper & Cardboard</option>
                                    <option value="Old Clothes & Footwear">Old Clothes & Footwear</option>
                                    <option value="Hazardous & Medicine Waste">Hazardous & Medicine Waste</option>
                                    <option value="All Dry Waste">All Dry Waste</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Collection Day</label>
                                <select value={scheduleDay} onChange={(e) => setScheduleDay(e.target.value)} required>
                                    <option value="Every Monday">Every Monday</option>
                                    <option value="Every Tuesday">Every Tuesday</option>
                                    <option value="Every Wednesday">Every Wednesday</option>
                                    <option value="Every Thursday">Every Thursday</option>
                                    <option value="Every Friday">Every Friday</option>
                                    <option value="Every Saturday">Every Saturday</option>
                                    <option value="1st & 3rd Monday of Month">1st & 3rd Monday of Month</option>
                                    <option value="1st of Every Month">1st of Every Month</option>
                                    <option value="15th of Every Month">15th of Every Month</option>
                                    <option value="Last Sunday of Month">Last Sunday of Month</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Time Slot</label>
                                <select value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}>
                                    <option value="8:00 AM - 12:00 PM">8:00 AM - 12:00 PM</option>
                                    <option value="9:00 AM - 1:00 PM">9:00 AM - 1:00 PM</option>
                                    <option value="10:00 AM - 2:00 PM">10:00 AM - 2:00 PM</option>
                                    <option value="2:00 PM - 5:00 PM">2:00 PM - 5:00 PM</option>
                                    <option value="All Day (8:00 AM - 5:00 PM)">All Day (8:00 AM - 5:00 PM)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Wards Covered</label>
                                <select value={wardInfo} onChange={(e) => setWardInfo(e.target.value)}>
                                    <option value="All Wards (1 to 20)">All Wards (1 to 20)</option>
                                    <option value="Wards 1 to 5">Wards 1 to 5</option>
                                    <option value="Wards 6 to 10">Wards 6 to 10</option>
                                    <option value="Wards 11 to 15">Wards 11 to 15</option>
                                    <option value="Wards 16 to 20">Wards 16 to 20</option>
                                    {AVAILABLE_WARDS.map((w) => (
                                        <option key={w} value={w}>{w}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">Add Schedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showImpactModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button className="close-btn" onClick={() => setShowImpactModal(false)}>&times;</button>
                        <h2>Update Impact Statistics</h2>
                        <form onSubmit={handleUpdateImpact}>
                            <div className="form-group">
                                <label>Total Plastic Collected (kg)</label>
                                <input type="number" required value={newTotalKg} onChange={(e) => setNewTotalKg(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Monthly Goal Percentage (%)</label>
                                <input type="number" min="0" max="100" required value={newGoalPercent} onChange={(e) => setNewGoalPercent(e.target.value)} />
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