import React, { useState, useEffect } from "react";
import api from "../../axiosInstance";
import "./BloodDonor.css";

const formatWardName = (rawWard) => {
    if (!rawWard) return "Ward 01";
    let str = String(rawWard).trim();
    if (/^\d+$/.test(str)) {
        return `Ward ${str.padStart(2, '0')}`;
    }
    const numMatch = str.match(/\d+/);
    if (numMatch) {
        return `Ward ${numMatch[0].padStart(2, '0')}`;
    }
    return str;
};

export default function BloodDonorPage() {
    const [donors, setDonors] = useState([]);
    const [userRole, setUserRole] = useState("citizen");
    const [currentWard, setCurrentWard] = useState("Ward 01");
    const [currentUserPhone, setCurrentUserPhone] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGroup, setSelectedGroup] = useState("All Groups");
    const [availableOnly, setAvailableOnly] = useState(false);
    
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingDonorId, setEditingDonorId] = useState(null);
    const [name, setName] = useState("");
    const [bloodGroup, setBloodGroup] = useState("O+");
    const [phone, setPhone] = useState("");
    const [dob, setDob] = useState("");
    const [selectedWard, setSelectedWard] = useState("Ward 01");
    const [lastDonatedDate, setLastDonatedDate] = useState("");

    const [urgentRequests, setUrgentRequests] = useState([]);
    const [showUrgentModal, setShowUrgentModal] = useState(false);
    const [editingUrgentId, setEditingUrgentId] = useState(null);
    const [urgentTitle, setUrgentTitle] = useState("");
    const [urgentHospital, setUrgentHospital] = useState("");
    const [urgentPatient, setUrgentPatient] = useState("");
    const [urgentBloodGroup, setUrgentBloodGroup] = useState("O+");
    const [urgentPhone, setUrgentPhone] = useState("");

    const fetchDonors = async () => {
        try {
            const res = await api.get("donors/");
            const data = res.data;
            setDonors(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            console.error("Error fetching donors:", err);
        }
    };

    const fetchUrgentRequests = async () => {
        try {
            const res = await api.get("urgent-requests/");
            const data = res.data;
            setUrgentRequests(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            console.error("Error fetching urgent requests:", err);
        }
    };

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
        setUserRole(role);

        const rawWard = loggedInUser.wardName || 
                        loggedInUser.ward || 
                        loggedInUser.wardNumber || 
                        loggedInUser.ward_number || 
                        localStorage.getItem("userWard") || 
                        localStorage.getItem("ward") || 
                        "Ward 01";

        const userWard = formatWardName(rawWard);
        setCurrentWard(userWard);
        setSelectedWard(userWard);

        const phoneNum = loggedInUser.phone || loggedInUser.mobile || loggedInUser.mobileNumber || localStorage.getItem("userPhone") || "";
        setCurrentUserPhone(phoneNum);

        fetchDonors();
        fetchUrgentRequests();
    }, []);

    const isPrivileged = userRole.includes("panchayat") || userRole.includes("admin") || userRole.includes("ward");

    const userRegistrations = donors.filter(d => d.registered_by === currentUserPhone);
    const citizenRegistrationCount = userRegistrations.length;

    const calculateAge = (birthDateStr) => {
        if (!birthDateStr) return 0;
        const today = new Date();
        const birthDate = new Date(birthDateStr);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const isWithinThreeMonths = (dateStr) => {
        if (!dateStr) return false;
        const lastDate = new Date(dateStr);
        const today = new Date();
        const diffTime = Math.abs(today - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays < 90;
    };

    const resetRegisterForm = () => {
        setName("");
        setBloodGroup("O+");
        setPhone("");
        setDob("");
        setSelectedWard(currentWard);
        setLastDonatedDate("");
        setIsEditing(false);
        setEditingDonorId(null);
    };

    const handleOpenRegisterModal = () => {
        if (!isPrivileged && citizenRegistrationCount >= 4) {
            alert("Limit reached! You can only register up to 4 family members as blood donors.");
            return;
        }
        resetRegisterForm();
        setShowRegisterModal(true);
    };

    const handleConnectAttendant = (phone, patientName, reqBloodGroup) => {
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        const message = encodeURIComponent(`Hello ${patientName}, I saw the urgent blood requirement (${reqBloodGroup}) in ${currentWard}. I am ready to donate blood.`);
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
    };

    const handleWhatsAppRedirect = (phone, donorName) => {
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        const message = encodeURIComponent(`Hello ${donorName}, We have an urgent blood requirement in ${currentWard}. Are you available to donate?`);
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();

        if (!dob) {
            alert("Registration failed: Date of Birth is required.");
            return;
        }

        const age = calculateAge(dob);
        if (age < 18) {
            alert(`Registration failed: Donor must be at least 18 years old to register. (Current calculated age: ${age})`);
            return;
        }

        if (!name || !phone) {
            alert("Please fill in all mandatory fields.");
            return;
        }

        const targetWard = isPrivileged ? selectedWard : currentWard;
        const payload = {
            name,
            blood_group: bloodGroup,
            phone,
            dob,
            ward: targetWard,
            location: "Local Area",
            last_donated: lastDonatedDate || null,
            registered_by: currentUserPhone
        };

        try {
            if (isEditing) {
                await api.put(`donors/${editingDonorId}/`, payload);
                alert("Blood Donor details updated successfully!");
                fetchDonors();
            } else {
                await api.post("donors/", payload);
                alert("Successfully registered new Blood Donor!");
                fetchDonors();
            }
        } catch (error) {
            console.error("API Error:", error);
            alert("Error connecting to the server.");
        }

        setShowRegisterModal(false);
        resetRegisterForm();
    };

    const handleOpenEditModal = (donor) => {
        setEditingDonorId(donor.id);
        setName(donor.name);
        setBloodGroup(donor.blood_group);
        setPhone(donor.phone);
        setDob(donor.dob || "");
        setSelectedWard(donor.ward ? formatWardName(donor.ward) : currentWard);
        setLastDonatedDate(donor.last_donated || "");
        setIsEditing(true);
        setShowRegisterModal(true);
    };

    const handleDeleteDonor = async (id) => {
        if (window.confirm("Are you sure you want to remove this donor?")) {
            try {
                await api.delete(`donors/${id}/`);
                fetchDonors();
            } catch (err) {
                console.error("Delete Error:", err);
                alert("Failed to delete donor.");
            }
        }
    };

    const handleUrgentSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            title: urgentTitle,
            hospital: urgentHospital,
            patient: urgentPatient,
            blood_group: urgentBloodGroup,
            phone: urgentPhone,
            ward: currentWard
        };

        try {
            if (editingUrgentId) {
                await api.put(`urgent-requests/${editingUrgentId}/`, payload);
                alert("Urgent Blood Request updated successfully!");
                fetchUrgentRequests();
            } else {
                await api.post("urgent-requests/", payload);
                alert("Urgent Blood Request posted successfully!");
                fetchUrgentRequests();
            }
        } catch (error) {
            console.error("Urgent Submit Error:", error);
        }

        setShowUrgentModal(false);
        setEditingUrgentId(null);
        setUrgentTitle("");
        setUrgentHospital("");
        setUrgentPatient("");
        setUrgentBloodGroup("O+");
        setUrgentPhone("");
    };

    const handleEditUrgentClick = (req) => {
        setEditingUrgentId(req.id);
        setUrgentTitle(req.title);
        setUrgentHospital(req.hospital);
        setUrgentPatient(req.patient);
        setUrgentBloodGroup(req.blood_group || "O+");
        setUrgentPhone(req.phone);
        setShowUrgentModal(true);
    };

    const handleRemoveUrgent = async (id) => {
        if (window.confirm("Remove this urgent request?")) {
            try {
                await api.delete(`urgent-requests/${id}/`);
                fetchUrgentRequests();
            } catch (err) {
                console.error("Error deleting urgent request:", err);
            }
        }
    };

    const filteredDonors = donors.filter(d => {
        const donorWard = formatWardName(d.ward || currentWard);
        const matchesWard = isPrivileged || donorWard.toLowerCase() === currentWard.toLowerCase();

        const matchesSearch = 
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            d.blood_group.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesGroup = selectedGroup === "All Groups" || d.blood_group === selectedGroup;
        const matchesAvailability = !availableOnly || d.available;

        return matchesWard && matchesSearch && matchesGroup && matchesAvailability;
    });

    const todayString = new Date().toISOString().split("T")[0];

    return (
        <div className="blood-donor-wrapper">
            <div className="donor-top-header">
                <div>
                    <h2>Blood Donor Directory</h2>
                    <p>Connecting lives in {currentWard}. Manage and request donors for urgent needs.</p>
                </div>
                <div className="donor-stats-boxes">
                    <div className="stat-card">
                        <span className="stat-icon">👥</span>
                        <div>
                            <h4>TOTAL DONORS</h4>
                            <h3>{filteredDonors.length}</h3>
                        </div>
                    </div>
                    <div className="stat-card">
                        <span className="stat-icon">🩸</span>
                        <div>
                            <h4>AVAILABLE</h4>
                            <h3>{filteredDonors.filter(d => d.available).length}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {isPrivileged && (
                <div style={{ marginBottom: "20px" }}>
                    <button className="submit-btn" onClick={() => {
                        setEditingUrgentId(null);
                        setUrgentTitle("");
                        setUrgentHospital("");
                        setUrgentPatient("");
                        setUrgentBloodGroup("O+");
                        setUrgentPhone("");
                        setShowUrgentModal(true);
                    }}>
                        + Post New Urgent Blood Request
                    </button>
                </div>
            )}

            {urgentRequests
                .filter(req => isPrivileged || formatWardName(req.ward || currentWard).toLowerCase() === currentWard.toLowerCase())
                .map((req) => (
                <div key={req.id} className="urgent-alert-banner" style={{ marginBottom: "15px" }}>
                    <div className="urgent-left">
                        <div className="urgent-badge-row">
                            <span className="urgent-badge">URGENT REQUEST ({req.blood_group || "General"})</span>
                            <span className="urgent-time">Recently</span>
                        </div>
                        <h4>{req.title}</h4>
                        <p>📍 {req.hospital} • Patient: {req.patient}</p>
                    </div>
                    <div className="urgent-actions">
                        <button className="btn-contact-attendant" onClick={() => handleConnectAttendant(req.phone, req.patient, req.blood_group)}>
                            📞 Contact Attendant
                        </button>
                        {isPrivileged && (
                            <>
                                <button className="btn-edit-urgent" onClick={() => handleEditUrgentClick(req)}>
                                    ✏️ Edit
                                </button>
                                <button className="btn-remove-urgent" onClick={() => handleRemoveUrgent(req.id)} title="Remove Banner">
                                    &times;
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ))}

            <div className="donor-filter-bar">
                <div className="filter-input-group">
                    <label>SEARCH DONOR</label>
                    <input 
                        type="text" 
                        placeholder="Name or Blood Group..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filter-input-group">
                    <label>BLOOD GROUP</label>
                    <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
                        <option value="All Groups">All Groups</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                    </select>
                </div>
                <div className="filter-checkbox-group">
                    <label>
                        <input 
                            type="checkbox" 
                            checked={availableOnly} 
                            onChange={(e) => setAvailableOnly(e.target.checked)} 
                        />
                        Available Only
                    </label>
                </div>
            </div>

            <div className="donors-grid">
                <div className="register-promo-card">
                    <div className="promo-icon">❤️</div>
                    <h3>Be a Hero.</h3>
                    <p>
                        {!isPrivileged 
                            ? `You have registered ${citizenRegistrationCount}/4 family members as donors.` 
                            : "Register donors and manage ward records."}
                    </p>
                    
                    <button 
                        onClick={handleOpenRegisterModal} 
                        className="btn-become-donor"
                        disabled={!isPrivileged && citizenRegistrationCount >= 4}
                        style={!isPrivileged && citizenRegistrationCount >= 4 ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                    >
                        {!isPrivileged && citizenRegistrationCount >= 4 
                            ? "Registration Limit Reached (4/4)" 
                            : "+ Register Donor / Family Member"}
                    </button>
                </div>

                {filteredDonors.map((donor) => {
                    const recentlyDonated = isWithinThreeMonths(donor.last_donated);
                    const isOwner = donor.registered_by === currentUserPhone;
                    const donorAge = donor.dob ? calculateAge(donor.dob) : null;

                    return (
                        <div key={donor.id} className="donor-card">
                            <div className="donor-card-top">
                                <div className="donor-avatar">👤</div>
                                <div>
                                    <h4>{donor.name} {donorAge ? `(${donorAge} yrs)` : ""}</h4>
                                    <p>{formatWardName(donor.ward || currentWard)}, {donor.location || "Local Area"}</p>
                                </div>
                                <span className="donor-bg-badge">{donor.blood_group}</span>
                            </div>

                            <div className="donor-card-body">
                                <div className="donor-info-row">
                                    <span>Last Donated</span>
                                    <strong>{donor.last_donated ? donor.last_donated : "Never"}</strong>
                                </div>
                                <div className="donor-info-row">
                                    <span>Total Donations</span>
                                    <strong>{donor.total_donations || 0} Times</strong>
                                </div>
                                {recentlyDonated && (
                                    <div className="recent-donation-tag">Recent Donation (&lt; 3 Months)</div>
                                )}
                            </div>

                            <div className="donor-card-footer">
                                {(isPrivileged || isOwner) && (
                                    <>
                                        <button 
                                            className="btn-edit-urgent"
                                            onClick={() => handleOpenEditModal(donor)}
                                            title="Edit Details"
                                            style={{ marginRight: "5px" }}
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button 
                                            className="btn-delete" 
                                            onClick={() => handleDeleteDonor(donor.id)}
                                            title="Remove Donor"
                                        >
                                            🗑️
                                        </button>
                                    </>
                                )}

                                {recentlyDonated ? (
                                    <button className="btn-notify-disabled" disabled>
                                        Notify when Available
                                    </button>
                                ) : (
                                    <button 
                                        className="btn-send-request" 
                                        onClick={() => handleWhatsAppRedirect(donor.phone, donor.name)}
                                    >
                                        💬 Send Request
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showRegisterModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button className="close-btn" onClick={() => setShowRegisterModal(false)}>&times;</button>
                        <h2>{isEditing ? "Update Donor Profile" : "Blood Donor Registration"}</h2>
                        <p>{isEditing ? "Update donation details." : `Register donor profile (${citizenRegistrationCount}/4 family members used).`}</p>
                        
                        <form onSubmit={handleRegisterSubmit}>
                            <div className="form-group">
                                <label>Full Name <span style={{ color: "red" }}>*</span></label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    required 
                                    placeholder="Enter donor name" 
                                />
                            </div>

                            <div className="form-group">
                                <label>Date of Birth <span style={{ color: "red" }}>* (Min. 18 Years)</span></label>
                                <input 
                                    type="date" 
                                    value={dob} 
                                    max={todayString}
                                    onChange={(e) => setDob(e.target.value)} 
                                    required 
                                />
                            </div>

                            <div className="form-group">
                                <label>Blood Group <span style={{ color: "red" }}>*</span></label>
                                <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Mobile Number (WhatsApp) <span style={{ color: "red" }}>*</span></label>
                                <input 
                                    type="text" 
                                    value={phone} 
                                    onChange={(e) => setPhone(e.target.value)} 
                                    required 
                                    placeholder="+919876543210" 
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Ward {isPrivileged ? "(Admin Mode)" : "(Locked)"}</label>
                                {isPrivileged ? (
                                    <select value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)}>
                                        {Array.from({ length: 20 }, (_, i) => {
                                            const wName = `Ward ${String(i + 1).padStart(2, '0')}`;
                                            return <option key={wName} value={wName}>{wName}</option>;
                                        })}
                                    </select>
                                ) : (
                                    <input 
                                        type="text" 
                                        value={currentWard} 
                                        disabled 
                                        style={{ backgroundColor: "#f1f1f1", cursor: "not-allowed" }} 
                                    />
                                )}
                            </div>

                            <div className="form-group">
                                <label>Last Donated Date</label>
                                <input 
                                    type="date" 
                                    value={lastDonatedDate} 
                                    onChange={(e) => setLastDonatedDate(e.target.value)} 
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowRegisterModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">{isEditing ? "Update Details" : "Apply & Register"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showUrgentModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button className="close-btn" onClick={() => setShowUrgentModal(false)}>&times;</button>
                        <h2>{editingUrgentId ? "Edit Urgent Blood Request" : "Post New Urgent Blood Request"}</h2>
                        <p>Create or update emergency banner for {currentWard}.</p>
                        
                        <form onSubmit={handleUrgentSubmit}>
                            <div className="form-group">
                                <label>Alert Title</label>
                                <input type="text" value={urgentTitle} onChange={(e) => setUrgentTitle(e.target.value)} required placeholder="e.g. Emergency Blood Needed: O Negative" />
                            </div>
                            <div className="form-group">
                                <label>Blood Group Required</label>
                                <select value={urgentBloodGroup} onChange={(e) => setUrgentBloodGroup(e.target.value)}>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Hospital / Location</label>
                                <input type="text" value={urgentHospital} onChange={(e) => setUrgentHospital(e.target.value)} required placeholder="e.g. Baby Hospital Calicut" />
                            </div>
                            <div className="form-group">
                                <label>Patient Name</label>
                                <input type="text" value={urgentPatient} onChange={(e) => setUrgentPatient(e.target.value)} required placeholder="e.g. Arun" />
                            </div>
                            <div className="form-group">
                                <label>Attendant WhatsApp Number</label>
                                <input type="text" value={urgentPhone} onChange={(e) => setUrgentPhone(e.target.value)} required placeholder="+919876543200" />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowUrgentModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">{editingUrgentId ? "Update Request" : "Post Request"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}