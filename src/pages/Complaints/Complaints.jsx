import React, { useState, useEffect } from "react";
import api from "../../axiosInstance";
import './Complaints.css';

const getFieldValue = (obj, ...keys) => {
    if (!obj || typeof obj !== "object") return "";
    for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") {
            return String(obj[k]).trim();
        }
    }
    return "";
};

const WARD_MAP = {
    "ward-1": "North Ward",
    "ward-2": "South Ward",
    "ward-3": "East Ward",
    "ward-4": "West Ward",
    "ward-5": "Central Ward",
    "ward-6": "Hill View",
    "ward-7": "River Side",
    "ward-8": "Market Ward"
};

const ALL_WARDS = Object.values(WARD_MAP);

const normalizeWard = (str) => {
    if (!str) return "";
    const s = str.toString().trim().toLowerCase();
    if (s === "all" || s === "all wards" || s === "panchayat view") return "all";

    for (const [key, val] of Object.entries(WARD_MAP)) {
        if (val.toLowerCase() === s || key.toLowerCase() === s) {
            return val.toLowerCase();
        }
    }

    const match = s.match(/\d+/);
    if (match) {
        const key = `ward-${match[0]}`;
        if (WARD_MAP[key]) return WARD_MAP[key].toLowerCase();
    }

    return s;
};

const formatWardName = (str) => {
    if (!str) return "North Ward";
    const norm = normalizeWard(str);
    for (const val of Object.values(WARD_MAP)) {
        if (val.toLowerCase() === norm) return val;
    }
    return str;
};

export default function ComplaintsPage() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("citizen");
    const [currentWard, setCurrentWard] = useState("North Ward");
    const [currentUserId, setCurrentUserId] = useState("");
    const [selectedWardFilter, setSelectedWardFilter] = useState("All"); 
    const [filter, setFilter] = useState("All");
    
    const [searchQuery, setSearchQuery] = useState("");
    const [codeSearchQuery, setCodeSearchQuery] = useState(""); 

    const [showModal, setShowModal] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const [editTitle, setEditTitle] = useState("");
    const [editCategory, setEditCategory] = useState("");
    const [editDescription, setEditDescription] = useState("");

    const [newName, setNewName] = useState("");
    const [newMobile, setNewMobile] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const [newCategory, setNewCategory] = useState("Water Supply");
    const [newDescription, setNewDescription] = useState("");

    useEffect(() => {
        let loggedInUser = {};
        try {
            loggedInUser = JSON.parse(
                localStorage.getItem("loggedInUser") ||
                localStorage.getItem("user") ||
                localStorage.getItem("member") ||
                "{}"
            );
        } catch (e) {
            loggedInUser = {};
        }

        const role = (
            getFieldValue(loggedInUser, "role", "userRole") || 
            localStorage.getItem("userRole") || 
            "citizen"
        ).toLowerCase();
        
        setUserRole(role);

        const userId = getFieldValue(loggedInUser, "id", "email", "phone", "mobile", "name") || "DefaultCitizen";
        setCurrentUserId(userId.toString());

        const uName = 
            getFieldValue(loggedInUser, "name", "fullName", "username", "userName", "first_name") ||
            getFieldValue(loggedInUser.user, "name", "fullName", "username") ||
            localStorage.getItem("userName") || 
            localStorage.getItem("name") || "";

        const uMobile = 
            getFieldValue(loggedInUser, "mobile", "phone", "phone_number", "phoneNumber", "mobileNumber", "contact") ||
            getFieldValue(loggedInUser.user, "mobile", "phone", "phone_number", "phoneNumber") ||
            getFieldValue(loggedInUser.profile, "mobile", "phone", "phone_number", "phoneNumber") ||
            localStorage.getItem("userMobile") ||
            localStorage.getItem("mobile") ||
            localStorage.getItem("phone") ||
            localStorage.getItem("userPhone") ||
            localStorage.getItem("phoneNumber") || "";

        setNewName(uName);
        setNewMobile(uMobile);

        let rawWard = 
            getFieldValue(loggedInUser, "wardNumber", "wardName", "ward", "location") ||
            localStorage.getItem("userWard") ||
            localStorage.getItem("loggedInWard") ||
            "North Ward";

        let formattedWard = formatWardName(rawWard);

        setCurrentWard(formattedWard);

        const isPanchayatOrAdmin = role.includes("panchayat") || role.includes("admin");

        if (!isPanchayatOrAdmin && role.includes("ward")) {
            setSelectedWardFilter(formattedWard);
        } else {
            setSelectedWardFilter("All");
        }

        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const res = await api.get("complaints/");
            const data = res.data;
            setComplaints(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            console.error("Error fetching complaints:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this complaint?")) {
            try {
                await api.delete(`complaints/${id}/`);
                setComplaints(prev => prev.filter(c => c.id !== id));
                setSelectedComplaint(null);
            } catch (err) {
                console.error("Error deleting complaint:", err);
                alert("പരാതി ഡിലീറ്റ് ചെയ്യാൻ സാധിച്ചില്ല.");
            }
        }
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.patch(`complaints/${selectedComplaint.id}/`, {
                title: editTitle,
                category: editCategory,
                description: editDescription
            });

            const updatedItem = res.data;
            setComplaints(prev => prev.map(c => c.id === updatedItem.id ? updatedItem : c));
            setIsEditing(false);
            setSelectedComplaint(null);
        } catch (err) {
            console.error("Error updating complaint:", err);
            alert("Could not update..");
        }
    };

    const handleStatusChange = async (id, newStatusVal) => {
        try {
            const res = await api.patch(`complaints/${id}/`, { status: newStatusVal });
            const updatedItem = res.data;
            setComplaints(prev => prev.map(c => c.id === id ? updatedItem : c));
            if (selectedComplaint && selectedComplaint.id === id) {
                setSelectedComplaint(updatedItem);
            }
        } catch (err) {
            console.error("Error updating status:", err);
        }
    };

    const handleTargetDateChange = async (id, newDateVal) => {
        try {
            const res = await api.patch(`complaints/${id}/`, { targetDate: newDateVal });
            const updatedItem = res.data;
            setComplaints(prev => prev.map(c => c.id === id ? updatedItem : c));
            if (selectedComplaint && selectedComplaint.id === id) {
                setSelectedComplaint(updatedItem);
            }
        } catch (err) {
            console.error("Error setting target date:", err);
        }
    };

    const handleNewSubmit = async (e) => {
        e.preventDefault();
        if (!newName.trim() || !newMobile.trim() || !newTitle.trim() || !newDescription.trim()) {
            alert("Please fill in all the details (Name, Mobile Number, Title, Description)");
            return;
        }

        if (newMobile.trim().length < 10) {
            alert("Please provide a valid 10-digit mobile number.");
            return;
        }

        const payload = {
            name: newName,
            mobile: newMobile,
            phone: newMobile,
            title: newTitle,
            category: newCategory,
            description: newDescription,
            location: currentWard,
            submittedBy: "Citizen",
            userId: currentUserId
        };

        try {
            const res = await api.post("complaints/", payload);
            const newEntry = res.data;
            setComplaints([newEntry, ...complaints]);
            setNewTitle("");
            setNewDescription("");
            setShowModal(false);
        } catch (err) {
            console.error("Error creating complaint:", err);
            alert("പുതിയ പരാതി സമർപ്പിക്കാൻ സാധിച്ചില്ല.");
        }
    };

    const getStatusBadgeClass = (status) => {
        switch ((status || "").toLowerCase()) {
            case "pending": return "badge-pending";
            case "resolved":
            case "completed": return "badge-completed";
            case "rejected": return "badge-rejected";
            default: return "badge-pending";
        }
    };

    const isPanchayatOrAdmin = userRole.includes("panchayat") || userRole.includes("admin");
    const isWardMemberOnly = !isPanchayatOrAdmin && userRole.includes("ward");

    const filteredComplaints = complaints.filter(c => {
        if (isWardMemberOnly) {
            if (normalizeWard(c.location) !== normalizeWard(currentWard)) {
                return false;
            }
        } else if (isPanchayatOrAdmin) {
            if (selectedWardFilter !== "All" && normalizeWard(c.location) !== normalizeWard(selectedWardFilter)) {
                return false;
            }
        } else {
            if (c.userId && c.userId.toString() !== currentUserId.toString()) {
                return false;
            }
        }

        const codeQuery = codeSearchQuery.trim().toLowerCase().replace('#', '');
        if (codeQuery && (isPanchayatOrAdmin || isWardMemberOnly)) {
            const itemCode = (c.code || c.complaint_number || c.complaintNumber || c.id || "").toString().toLowerCase().replace('#', '');
            if (!itemCode.includes(codeQuery)) {
                return false;
            }
        }

        const query = searchQuery.trim().toLowerCase();
        if (query) {
            const compName = getFieldValue(c, "name", "userName", "username", "fullName", "submitted_by_name");
            const compMobile = getFieldValue(c, "mobile", "phone", "phone_number", "phoneNumber", "mobileNumber");

            const matchesSearch =
                (c.title || "").toLowerCase().includes(query) ||
                (c.code || "").toLowerCase().includes(query) ||
                compName.toLowerCase().includes(query) ||
                compMobile.includes(query) ||
                (c.category || "").toLowerCase().includes(query) ||
                (c.location || "").toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }

        const currentStatus = (c.status || "Pending").trim().toLowerCase();
        const activeFilter = filter.trim().toLowerCase();

        if (activeFilter === "pending") {
            return currentStatus === "pending";
        }
        if (activeFilter === "resolved") {
            return currentStatus === "resolved" || currentStatus === "completed";
        }
        if (activeFilter === "rejected") {
            return currentStatus === "rejected";
        }

        return true;
    });

    return (
        <div className="complaint-page-wrapper">
            <div className="complaints-top-bar">
                <div className="search-box" style={{ flex: "1" }}>
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search title, name, category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="complaints-main-container">
                <div className="complaints-header-row">
                    <div>
                        <h2>{isWardMemberOnly ? `Ward Member Portal (${currentWard})` : (isPanchayatOrAdmin ? "Panchayat Management Portal" : "My Complaints Portal")}</h2>
                        <p>{isWardMemberOnly ? `Viewing complaints assigned only to ${currentWard}.` : (!isPanchayatOrAdmin ? "View and manage complaints submitted by you." : "View and manage all complaints across wards.")}</p>
                    </div>
                    {!isPanchayatOrAdmin && (
                        <button onClick={() => setShowModal(true)} className="submit-complaint-btn">
                            + Submit New Complaint
                        </button>
                    )}
                </div>

                {(isPanchayatOrAdmin || isWardMemberOnly) && (
                    <div style={{ margin: "15px 0", display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap", background: "#f8f9fa", padding: "12px 15px", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                        {isPanchayatOrAdmin && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <label style={{ fontWeight: "600", fontSize: "13px" }}>📍 Filter by Ward:</label>
                                <select
                                    value={selectedWardFilter}
                                    onChange={(e) => setSelectedWardFilter(e.target.value)}
                                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ced4da", fontSize: "13px", background: "#fff" }}
                                >
                                    <option value="All">All Wards (Panchayat View)</option>
                                    {ALL_WARDS.map((wardName) => (
                                        <option key={wardName} value={wardName}>
                                            {wardName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1", minWidth: "220px" }}>
                            <span style={{ fontSize: "14px" }}>🎫</span>
                            <input
                                type="text"
                                placeholder="Search Complaint No (e.g. #CMP-2026-680)..."
                                value={codeSearchQuery}
                                onChange={(e) => setCodeSearchQuery(e.target.value)}
                                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ced4da", fontSize: "13px", background: "#fff", width: "100%" }}
                            />
                        </div>
                    </div>
                )}

                <div className="complaints-filter-tabs">
                    {["All", "Pending", "Resolved", "Rejected"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`filter-tab-btn ${filter === tab ? "active" : ""}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="complaints-list">
                    {loading ? (
                        <p style={{ textAlign: "center", padding: "30px", color: "#666" }}>Loading complaints...</p>
                    ) : filteredComplaints.length > 0 ? (
                        filteredComplaints.map((item) => {
                            const citizenName = getFieldValue(item, "name", "userName", "username", "fullName", "submitted_by_name") || "Citizen";
                            const citizenMobile = getFieldValue(item, "mobile", "phone", "phone_number", "phoneNumber", "mobileNumber");

                            return (
                                <div
                                    key={item.id}
                                    className="complaint-card"
                                    onClick={() => {
                                        setSelectedComplaint(item);
                                        setEditTitle(item.title || "");
                                        setEditCategory(item.category || "Water Supply");
                                        setEditDescription(item.description || "");
                                        setIsEditing(false);
                                    }}
                                >
                                    <div className="complaint-card-left">
                                        <div className="complaint-icon-box">{item.submittedBy === "Panchayat" ? "🏛️" : "🙋‍♂️"}</div>
                                        <div className="complaint-info">
                                            <div className="card-top-meta">
                                                <span className="complaint-code">{item.code || item.complaint_number || `#CMP-${item.id}`}</span>
                                                <span className={`status-badge ${getStatusBadgeClass(item.status)}`}>
                                                    {(item.status || "Pending").toUpperCase()}
                                                </span>
                                            </div>
                                            <h3>{item.title}</h3>
                                            <p>
                                                Submitted by: <strong>{citizenName}</strong> {citizenMobile && `(${citizenMobile})`}
                                            </p>
                                            <p style={{ fontSize: "12px", color: "#6c757d", marginTop: "2px" }}>
                                                Category: {item.category} • Location: <strong>{formatWardName(item.location)}</strong>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="complaint-card-arrow">&rsaquo;</div>
                                </div>
                            );
                        })
                    ) : (
                        <p style={{ textAlign: "center", padding: "30px", color: "#666" }}>
                            No complaints found matching your selection.
                        </p>
                    )}
                </div>
            </div>

            {selectedComplaint && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button onClick={() => setSelectedComplaint(null)} className="close-btn">&times;</button>
                        
                        {!isPanchayatOrAdmin && !isWardMemberOnly ? (
                            !isEditing ? (
                                <>
                                    <div className="modal-top-tags">
                                        <span className="complaint-code">{selectedComplaint.code || selectedComplaint.complaint_number || `#CMP-${selectedComplaint.id}`}</span>
                                        <span className={`status-badge ${getStatusBadgeClass(selectedComplaint.status)}`}>
                                            {(selectedComplaint.status || "Pending").toUpperCase()}
                                        </span>
                                    </div>
                                    <h2>{selectedComplaint.title}</h2>
                                    <p className="modal-cat">
                                        <strong>Category:</strong> {selectedComplaint.category} | <strong>Location:</strong> {formatWardName(selectedComplaint.location)}
                                    </p>
                                    <div className="modal-desc" style={{ margin: "15px 0" }}>
                                        <h4>Description:</h4>
                                        <p>{selectedComplaint.description}</p>
                                    </div>
                                    <p style={{ fontSize: "13px", color: "#d9534f", fontWeight: "600" }}>
                                        Target Date by Panchayat: {selectedComplaint.targetDate || "Not Set Yet"}
                                    </p>

                                    <div className="modal-actions" style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                                        <button onClick={() => setIsEditing(true)} style={{ background: "#ffc107", border: "none", padding: "8px 15px", borderRadius: "5px", cursor: "pointer", fontWeight: "600" }}>
                                            Edit / Update
                                        </button>
                                        <button onClick={() => handleDelete(selectedComplaint.id)} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "5px", cursor: "pointer", fontWeight: "600" }}>
                                            Delete
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <form onSubmit={handleUpdateSubmit}>
                                    <h3>Edit Complaint</h3>
                                    <div className="form-group" style={{ marginBottom: "10px" }}>
                                        <label>Title</label>
                                        <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }} required />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: "10px" }}>
                                        <label>Category</label>
                                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}>
                                            <option value="Water Supply">Water Supply</option>
                                            <option value="Electrical">Electrical</option>
                                            <option value="Sanitation">Sanitation</option>
                                            <option value="Roads">Roads & Infrastructure</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: "10px" }}>
                                        <label>Description</label>
                                        <textarea rows="3" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }} required></textarea>
                                    </div>
                                    <div className="modal-actions" style={{ display: "flex", gap: "10px" }}>
                                        <button type="submit" className="submit-btn">Save Changes</button>
                                        <button type="button" onClick={() => setIsEditing(false)} className="cancel-btn">Cancel</button>
                                    </div>
                                </form>
                            )
                        ) : (
                            <>
                                <div className="modal-top-tags">
                                    <span className="complaint-code">{selectedComplaint.code || selectedComplaint.complaint_number || `#CMP-${selectedComplaint.id}`}</span>
                                    <span className={`status-badge ${getStatusBadgeClass(selectedComplaint.status)}`}>
                                        {(selectedComplaint.status || "Pending").toUpperCase()}
                                    </span>
                                </div>
                                <h2>{selectedComplaint.title}</h2>
                                <p className="modal-cat">
                                    <strong>Category:</strong> {selectedComplaint.category} | <strong>Location:</strong> {formatWardName(selectedComplaint.location)}
                                </p>

                                <div style={{ background: "#e0f2fe", padding: "12px", borderRadius: "8px", margin: "15px 0", border: "1px solid #bae6fd" }}>
                                    <h4 style={{ fontSize: "13px", color: "#0369a1", marginBottom: "6px" }}>👤 Applicant Details</h4>
                                    <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>
                                        Name: {getFieldValue(selectedComplaint, "name", "userName", "username", "fullName", "submitted_by_name") || "Citizen"}
                                    </p>
                                    <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#334155" }}>
                                        Mobile: {getFieldValue(selectedComplaint, "mobile", "phone", "phone_number", "phoneNumber", "mobileNumber") || "Not Provided"}{" "}
                                        {getFieldValue(selectedComplaint, "mobile", "phone", "phone_number", "phoneNumber", "mobileNumber") && (
                                            <a href={`tel:${getFieldValue(selectedComplaint, "mobile", "phone", "phone_number", "phoneNumber", "mobileNumber")}`} style={{ marginLeft: "10px", color: "#0284c7", fontWeight: "600" }}>
                                                📞 Call Citizen
                                            </a>
                                        )}
                                    </p>
                                </div>

                                <div style={{ background: "#f8f9fa", padding: "12px", borderRadius: "8px", margin: "15px 0", border: "1px solid #e9ecef" }}>
                                    <h4 style={{ fontSize: "13px", marginBottom: "10px", color: "#333" }}>🏛️ Ward Management Action Panel</h4>
                                    
                                    <div className="form-group" style={{ marginBottom: "10px" }}>
                                        <label style={{ fontSize: "12px" }}>Update Status:</label>
                                        <select
                                            value={selectedComplaint.status || "Pending"}
                                            onChange={(e) => handleStatusChange(selectedComplaint.id, e.target.value)}
                                            style={{ padding: "6px", borderRadius: "6px", border: "1px solid #ced4da", width: "100%", fontSize: "13px" }}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Resolved">Resolved</option>
                                            <option value="Rejected">Rejected</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label style={{ fontSize: "12px" }}>Set Target Date:</label>
                                        <input
                                            type="date"
                                            value={selectedComplaint.targetDate || ""}
                                            onChange={(e) => handleTargetDateChange(selectedComplaint.id, e.target.value)}
                                            style={{ padding: "6px", borderRadius: "6px", border: "1px solid #ced4da", width: "100%", fontSize: "13px" }}
                                        />
                                    </div>
                                </div>

                                <div className="modal-desc">
                                    <h4>Description:</h4>
                                    <p>{selectedComplaint.description}</p>
                                </div>
                                <div className="modal-actions">
                                    <button onClick={() => setSelectedComplaint(null)} className="submit-btn">Close</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {showModal && !isPanchayatOrAdmin && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
                        <h2>Submit New Complaint</h2>
                        <form onSubmit={handleNewSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Your Full Name <span style={{ color: "red" }}>*</span></label>
                                <input 
                                    type="text" 
                                    placeholder="Enter your name..." 
                                    value={newName} 
                                    onChange={(e) => setNewName(e.target.value)} 
                                    required 
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Mobile Number <span style={{ color: "red" }}>*</span></label>
                                <input 
                                    type="text" 
                                    maxLength={10} 
                                    placeholder="Enter 10-digit mobile number..." 
                                    value={newMobile} 
                                    onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, ''))} 
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Issue Title <span style={{ color: "red" }}>*</span></label>
                                <input type="text" placeholder="e.g. Broken street light..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
                            </div>

                            <div className="form-group">
                                <label>Category</label>
                                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                                    <option value="Water Supply">Water Supply</option>
                                    <option value="Electrical">Electrical</option>
                                    <option value="Sanitation">Sanitation</option>
                                    <option value="Roads">Roads & Infrastructure</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Ward / Location</label>
                                <input 
                                    type="text" 
                                    value={currentWard} 
                                    disabled 
                                    style={{ background: "#e9ecef", cursor: "not-allowed", color: "#495057", fontWeight: "600" }}
                                />
                            </div>

                            <div className="form-group">
                                <label>Description <span style={{ color: "red" }}>*</span></label>
                                <textarea rows="3" placeholder="Describe the problem..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} required></textarea>
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">Cancel</button>
                                <button type="submit" className="submit-btn">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}