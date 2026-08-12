import React, { useState, useEffect } from "react";
import './Complaints.css';

export default function ComplaintsPage() {
    const [complaints, setComplaints] = useState([]);
    const [userRole, setUserRole] = useState("citizen");
    const [currentWard, setCurrentWard] = useState("");
    const [currentUserId, setCurrentUserId] = useState("");
    const [selectedWardFilter, setSelectedWardFilter] = useState("All"); 
    const [filter, setFilter] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Edit states (Citizen)
    const [editTitle, setEditTitle] = useState("");
    const [editCategory, setEditCategory] = useState("");
    const [editDescription, setEditDescription] = useState("");

    // New complaint states
    const [newTitle, setNewTitle] = useState("");
    const [newCategory, setNewCategory] = useState("Water Supply");
    const [newDescription, setNewDescription] = useState("");
    const [newWard, setNewWard] = useState("Ward 1");

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
            loggedInUser.role || 
            loggedInUser.userRole || 
            localStorage.getItem("userRole") || 
            "citizen"
        ).toLowerCase();
        
        setUserRole(role);

        const userId = loggedInUser.id || loggedInUser.email || loggedInUser.phone || loggedInUser.name || "DefaultCitizen";
        setCurrentUserId(userId);

        let rawWard = 
            loggedInUser.wardNumber ||
            loggedInUser.wardName ||
            loggedInUser.ward ||
            localStorage.getItem("userWard") ||
            localStorage.getItem("loggedInWard") ||
            "Ward 1";

        let formattedWard = rawWard.toString().toLowerCase().includes("ward") 
            ? rawWard.toString() 
            : `Ward ${rawWard}`;

        setCurrentWard(formattedWard);
        setNewWard(formattedWard);

        const isPanchayatOrAdmin = role.includes("panchayat") || role.includes("admin");

        if (!isPanchayatOrAdmin && role.includes("ward")) {
            setSelectedWardFilter(formattedWard);
        } else {
            setSelectedWardFilter("All");
        }

        const savedComplaints = localStorage.getItem("ente_gramam_complaints");
        const defaultComplaints = [
            {
                id: 1,
                code: "#CMP-2026-075",
                title: "Streetlight not working",
                category: "Electrical",
                submittedDate: "May 10, 2026",
                targetDate: "2026-06-05",
                status: "Pending",
                description: "The street light pole near junction is completely dead.",
                location: "Ward 1",
                submittedBy: "Panchayat",
                userId: "Admin"
            },
            {
                id: 2,
                code: "#CMP-2026-076",
                title: "Water pipe leakage",
                category: "Water Supply",
                submittedDate: "May 11, 2026",
                targetDate: "",
                status: "Resolved",
                description: "Pipe bursting near main road.",
                location: "Ward 2",
                submittedBy: "Citizen",
                userId: "DefaultCitizen"
            },
            {
                id: 3,
                code: "#CMP-2026-077",
                title: "Waste management issue",
                category: "Sanitation",
                submittedDate: "May 12, 2026",
                targetDate: "",
                status: "Rejected",
                description: "Garbage collection delayed.",
                location: "Ward 3",
                submittedBy: "Citizen",
                userId: "DefaultCitizen"
            }
        ];

        if (savedComplaints) {
            try {
                setComplaints(JSON.parse(savedComplaints));
            } catch (err) {
                setComplaints(defaultComplaints);
            }
        } else {
            setComplaints(defaultComplaints);
            localStorage.setItem("ente_gramam_complaints", JSON.stringify(defaultComplaints));
        }
    }, []);

    const handleDelete = (id) => {
        if (window.confirm("ഈ പരാതി ഡിലീറ്റ് ചെയ്യണമെന്നുറപ്പാണോ?")) {
            const updated = complaints.filter(c => c.id !== id);
            setComplaints(updated);
            localStorage.setItem("ente_gramam_complaints", JSON.stringify(updated));
            setSelectedComplaint(null);
        }
    };

    const handleUpdateSubmit = (e) => {
        e.preventDefault();
        const updated = complaints.map(c => {
            if (c.id === selectedComplaint.id) {
                return {
                    ...c,
                    title: editTitle,
                    category: editCategory,
                    description: editDescription
                };
            }
            return c;
        });

        setComplaints(updated);
        localStorage.setItem("ente_gramam_complaints", JSON.stringify(updated));
        setIsEditing(false);
        setSelectedComplaint(null);
    };

    const handleStatusChange = (id, newStatusVal) => {
        const updated = complaints.map(c => {
            if (c.id === id) {
                return { ...c, status: newStatusVal };
            }
            return c;
        });
        setComplaints(updated);
        localStorage.setItem("ente_gramam_complaints", JSON.stringify(updated));
        if (selectedComplaint && selectedComplaint.id === id) {
            setSelectedComplaint(prev => ({ ...prev, status: newStatusVal }));
        }
    };

    const handleTargetDateChange = (id, newDateVal) => {
        const updated = complaints.map(c => {
            if (c.id === id) {
                return { ...c, targetDate: newDateVal };
            }
            return c;
        });
        setComplaints(updated);
        localStorage.setItem("ente_gramam_complaints", JSON.stringify(updated));
        if (selectedComplaint && selectedComplaint.id === id) {
            setSelectedComplaint(prev => ({ ...prev, targetDate: newDateVal }));
        }
    };

    const handleNewSubmit = (e) => {
        e.preventDefault();
        if (!newTitle || !newDescription) return;

        const randomNum = Math.floor(100 + Math.random() * 900);
        const isPanchayatOrAdmin = userRole.includes("panchayat") || userRole.includes("admin");
        const isWardMemberOnly = !isPanchayatOrAdmin && userRole.includes("ward");

        let assignedLocation = newWard;
        if (isWardMemberOnly) {
            assignedLocation = currentWard;
        }

        const newEntry = {
            id: Date.now(),
            code: `#CMP-2026-${randomNum}`,
            title: newTitle,
            category: newCategory,
            submittedDate: "Today",
            targetDate: "",
            status: "Pending",
            description: newDescription,
            location: assignedLocation,
            submittedBy: isPanchayatOrAdmin || isWardMemberOnly ? "Panchayat" : "Citizen",
            userId: currentUserId
        };

        const updatedList = [newEntry, ...complaints];
        setComplaints(updatedList);
        localStorage.setItem("ente_gramam_complaints", JSON.stringify(updatedList));

        setNewTitle("");
        setNewDescription("");
        setShowModal(false);
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

    const normalizeWard = (str) => {
        return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    };

    // Clean and Precise Filtering Logic
    const filteredComplaints = complaints.filter(c => {
        // 1. Role & Ward Based Filtering
        if (isWardMemberOnly) {
            if (normalizeWard(c.location) !== normalizeWard(currentWard)) {
                return false;
            }
        } else if (isPanchayatOrAdmin) {
            if (selectedWardFilter !== "All" && normalizeWard(c.location) !== normalizeWard(selectedWardFilter)) {
                return false;
            }
        } else {
            if (!c.userId || c.userId !== currentUserId) {
                return false;
            }
        }

        // 2. Search Query Filtering
        const query = searchQuery.trim().toLowerCase();
        if (query) {
            const matchesSearch =
                (c.title || "").toLowerCase().includes(query) ||
                (c.code || "").toLowerCase().includes(query) ||
                (c.category || "").toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }

        // 3. Status Tab Filtering (Strict matching)
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

        return true; // For "All" tab
    });

    return (
        <div className="complaint-page-wrapper">
            <div className="complaints-top-bar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search complaints..."
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
                    <button onClick={() => setShowModal(true)} className="submit-complaint-btn">
                        + Submit New Complaint
                    </button>
                </div>

                {isPanchayatOrAdmin && (
                    <div style={{ margin: "15px 0", display: "flex", alignItems: "center", gap: "10px", background: "#f8f9fa", padding: "10px", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                        <label style={{ fontWeight: "600", fontSize: "13px" }}>📍 Filter by Ward:</label>
                        <select
                            value={selectedWardFilter}
                            onChange={(e) => setSelectedWardFilter(e.target.value)}
                            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ced4da", fontSize: "13px", background: "#fff" }}
                        >
                            <option value="All">All Wards (Panchayat View)</option>
                            <option value="Ward 1">Ward 1</option>
                            <option value="Ward 2">Ward 2</option>
                            <option value="Ward 3">Ward 3</option>
                            <option value="Ward 4">Ward 4</option>
                            <option value="Ward 5">Ward 5</option>
                        </select>
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
                    {filteredComplaints.length > 0 ? (
                        filteredComplaints.map((item) => (
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
                                            <span className="complaint-code">{item.code}</span>
                                            <span className={`status-badge ${getStatusBadgeClass(item.status)}`}>
                                                {(item.status || "Pending").toUpperCase()}
                                            </span>
                                        </div>
                                        <h3>{item.title}</h3>
                                        <p>Category: {item.category} • Location: <strong>{item.location}</strong></p>
                                    </div>
                                </div>
                                <div className="complaint-card-arrow">&rsaquo;</div>
                            </div>
                        ))
                    ) : (
                        <p style={{ textAlign: "center", padding: "30px", color: "#666" }}>
                            No complaints found for this selection.
                        </p>
                    )}
                </div>
            </div>

            {/* Modal */}
            {selectedComplaint && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button onClick={() => setSelectedComplaint(null)} className="close-btn">&times;</button>
                        
                        {!isPanchayatOrAdmin && !isWardMemberOnly ? (
                            !isEditing ? (
                                <>
                                    <div className="modal-top-tags">
                                        <span className="complaint-code">{selectedComplaint.code}</span>
                                        <span className={`status-badge ${getStatusBadgeClass(selectedComplaint.status)}`}>
                                            {(selectedComplaint.status || "Pending").toUpperCase()}
                                        </span>
                                    </div>
                                    <h2>{selectedComplaint.title}</h2>
                                    <p className="modal-cat">
                                        <strong>Category:</strong> {selectedComplaint.category} | <strong>Location:</strong> {selectedComplaint.location}
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
                                    <span className="complaint-code">{selectedComplaint.code}</span>
                                    <span className={`status-badge ${getStatusBadgeClass(selectedComplaint.status)}`}>
                                        {(selectedComplaint.status || "Pending").toUpperCase()}
                                    </span>
                                </div>
                                <h2>{selectedComplaint.title}</h2>
                                <p className="modal-cat">
                                    <strong>Category:</strong> {selectedComplaint.category} | <strong>Location:</strong> {selectedComplaint.location}
                                </p>

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

            {/* New Complaint Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
                        <h2>Submit New Complaint</h2>
                        <form onSubmit={handleNewSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Issue Title</label>
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
                            {!isPanchayatOrAdmin && !isWardMemberOnly ? (
                                <div className="form-group">
                                    <label>Ward / Location</label>
                                    <select value={newWard} onChange={(e) => setNewWard(e.target.value)}>
                                        <option value="Ward 1">Ward 1</option>
                                        <option value="Ward 2">Ward 2</option>
                                        <option value="Ward 3">Ward 3</option>
                                        <option value="Ward 4">Ward 4</option>
                                        <option value="Ward 5">Ward 5</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>Assign to Ward</label>
                                    <input 
                                        type="text" 
                                        value={isWardMemberOnly ? currentWard : (selectedWardFilter !== "All" ? selectedWardFilter : "Ward 1")} 
                                        disabled 
                                        style={{ background: "#e9ecef", cursor: "not-allowed" }}
                                    />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Description</label>
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