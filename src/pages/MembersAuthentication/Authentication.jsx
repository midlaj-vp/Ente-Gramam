import React, { useState, useEffect, useMemo } from "react";
import Authentication from './Authentication';
import {
  Users,
  CheckCircle2,
  XCircle,
  MapPin,
  Search,
  Plus,
  ChevronDown
} from "lucide-react";
import "./Authentication.css";

const WARD_OPTIONS = {
  "ward-1": "Ward 1",
  "ward-2": "South Ward",
  "ward-3": "East Ward",
  "ward-4": "West Ward",
  "ward-5": "Central Ward",
  "ward-6": "Hill View",
  "ward-7": "River Side",
  "ward-8": "Market Ward",
};

export default function MembersAuthentication() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [wardMembers, setWardMembers] = useState([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [wardFilter, setWardFilter] = useState("All Wards");
  const [statusFilter, setStatusFilter] = useState("All Status");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // New Member Form State
  const [newMember, setNewMember] = useState({
    name: "",
    username: "",
    mobile: "",
    wardName: "",
    password: ""
  });

  // --- 1. INITIALIZATION & ROLE CHECK ---
  useEffect(() => {
    // Check logged in user from localStorage
    const rawLoggedIn = localStorage.getItem("loggedInUser") || localStorage.getItem("currentUser") || "{}";
    let loggedInUser = {};
    try {
      loggedInUser = JSON.parse(rawLoggedIn);
    } catch (e) {
      loggedInUser = {};
    }

    const role = (loggedInUser.role || "").toLowerCase();

    // Panchayat Admin ആണെങ്കിൽ മാത്രം ആക്സസ് നൽകുന്നു
    if (role !== "panchayat" && role !== "admin") {
      setIsAdmin(false);
      return;
    }

    setIsAdmin(true);
    loadData();

    // Storage Changes Sync (മറ്റു ടാബുകളിൽ മാറ്റം വരുമ്പോൾ തനിയെ അപ്ഡേറ്റ് ആകും)
    const handleStorageChange = (e) => {
      if (e.key === "usersList" || e.key === "app_users") loadData();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // --- 2. DATA LOADING & DEDUPLICATION ---
  const loadData = () => {
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem("usersList") || localStorage.getItem("app_users") || "[]");
    } catch (e) {
      users = [];
    }

    setAllUsers(users);

    // Filter ward members and remove duplicates
    const membersMap = new Map();

    users.forEach(user => {
      if (user.role === "ward") {
        const normalizedUser = {
          ...user,
          status: user.status || "active",
          joinedDate: user.joinedDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        };
        
        if (normalizedUser.username) {
          if (!membersMap.has(normalizedUser.username.toLowerCase())) {
            membersMap.set(normalizedUser.username.toLowerCase(), normalizedUser);
          }
        }
      }
    });

    setWardMembers(Array.from(membersMap.values()));
  };

  // --- 3. DYNAMIC STATISTICS & FILTERING ---
  const dynamicWardsList = useMemo(() => {
    const wards = new Set(wardMembers.map(m => m.wardName).filter(Boolean));
    return Array.from(wards).sort();
  }, [wardMembers]);

  const filteredMembers = useMemo(() => {
    return wardMembers.filter(member => {
      const matchSearch =
        (member.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.username || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.mobile || "").includes(searchQuery) ||
        (member.wardName || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchWard = wardFilter === "All Wards" || member.wardName === wardFilter;
      const matchStatus = statusFilter === "All Status" || (member.status || "active").toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchWard && matchStatus;
    });
  }, [wardMembers, searchQuery, wardFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: wardMembers.length,
      active: wardMembers.filter(m => (m.status || "active") === "active").length,
      inactive: wardMembers.filter(m => m.status === "inactive").length,
      wardsCovered: dynamicWardsList.length
    };
  }, [wardMembers, dynamicWardsList]);

  // --- 4. ADMIN ACTIONS ---
  const handleAddSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    const { name, username, mobile, wardName, password } = newMember;

    if (!name.trim() || !username.trim() || !mobile.trim() || !wardName || !password) {
      setErrorMsg("All fields are required.");
      return;
    }

    if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }

    // Check for duplicate username or mobile
    const isDuplicate = allUsers.some(u =>
      (u.username && u.username.toLowerCase() === username.toLowerCase()) ||
      (u.mobile && u.mobile === mobile)
    );

    if (isDuplicate) {
      setErrorMsg("Username or Mobile number already exists in the system.");
      return;
    }

    // Check if the ward already has an assigned member
    const isWardTaken = allUsers.some(u =>
      u.role === "ward" &&
      u.wardName === wardName
    );

    if (isWardTaken) {
      setErrorMsg("This ward already has an assigned ward member.");
      return;
    }

    const newUserObj = {
      id: `WARD-${Date.now()}`,
      name: name.trim(),
      username: username.trim(),
      mobile: mobile.trim(),
      wardName: wardName,
      password: password,
      role: "ward",
      status: "active",
      joinedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    const updatedUsersList = [...allUsers, newUserObj];
    localStorage.setItem("usersList", JSON.stringify(updatedUsersList));

    setNewMember({ name: "", username: "", mobile: "", wardName: "", password: "" });
    setShowAddModal(false);
    loadData(); // Synchronize UI
  };

  const handleToggleStatusConfirm = () => {
    if (!selectedMember) return;

    const newStatus = selectedMember.status === "active" ? "inactive" : "active";

    // Update status in global usersList
    const updatedUsersList = allUsers.map(u => {
      if (u.username === selectedMember.username && u.role === "ward") {
        return { ...u, status: newStatus };
      }
      return u;
    });

    localStorage.setItem("usersList", JSON.stringify(updatedUsersList));

    // Handle immediate logout if deactivating the currently logged in ward member
    if (newStatus === "inactive") {
      let activeUser = null;
      try {
        const rawLogged = localStorage.getItem("loggedInUser") || localStorage.getItem("currentUser");
        if (rawLogged) {
          activeUser = JSON.parse(rawLogged);
        }
      } catch (e) {}

      if (activeUser && activeUser.username === selectedMember.username && activeUser.role === "ward") {
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("currentUser");
      }
    }

    window.dispatchEvent(new Event("storage"));

    setShowConfirmModal(false);
    setSelectedMember(null);
    loadData();
  };

  const openConfirmModal = (member) => {
    setSelectedMember(member);
    setShowConfirmModal(true);
  };

  // Prevent flicker while checking role
  if (isAdmin === null) {
    return null;
  }

  // Render Access Denied if not Admin/Panchayat
  if (isAdmin === false) {
    return (
      <div className="ma-access-denied">
        <div className="ma-denied-box">
          <XCircle size={48} color="#dc2626" />
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page. This portal is restricted to Panchayat Administrators only.</p>
          <button onClick={() => window.history.back()}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ma-container">

      {/* Header Section */}
      <div className="ma-header">
        <div className="ma-header-texts">
          <h1>Members Authentication</h1>
          <p>Manage ward members and their access across the Panchayat.</p>
        </div>
        <button className="ma-add-btn" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add Ward Member
        </button>
      </div>

      {/* Top Statistic Cards */}
      <div className="ma-stats-grid">
        <div className="ma-stat-card">
          <div className="ma-icon-circle bg-green-light"><Users size={20} color="#16a34a" /></div>
          <div className="ma-stat-info">
            <span className="ma-stat-label">TOTAL MEMBERS</span>
            <span className="ma-stat-val">{stats.total}</span>
          </div>
        </div>
        <div className="ma-stat-card">
          <div className="ma-icon-circle bg-green-light"><CheckCircle2 size={20} color="#16a34a" /></div>
          <div className="ma-stat-info">
            <span className="ma-stat-label">ACTIVE MEMBERS</span>
            <span className="ma-stat-val">{stats.active}</span>
          </div>
        </div>
        <div className="ma-stat-card">
          <div className="ma-icon-circle bg-red-light"><XCircle size={20} color="#dc2626" /></div>
          <div className="ma-stat-info">
            <span className="ma-stat-label">INACTIVE MEMBERS</span>
            <span className="ma-stat-val">{stats.inactive}</span>
          </div>
        </div>
        <div className="ma-stat-card">
          <div className="ma-icon-circle bg-green-light"><MapPin size={20} color="#16a34a" /></div>
          <div className="ma-stat-info">
            <span className="ma-stat-label">WARDS COVERED</span>
            <span className="ma-stat-val">{stats.wardsCovered}</span>
          </div>
        </div>
      </div>

      {/* Data Table Section */}
      <div className="ma-table-card">

        {/* Filters Row */}
        <div className="ma-filters-row">
          <div className="ma-search-box">
            <Search size={16} color="#9ca3af" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="ma-filter-selects">
            <div className="ma-select-wrapper">
              <select value={wardFilter} onChange={(e) => setWardFilter(e.target.value)}>
                <option value="All Wards">All Wards</option>
                {dynamicWardsList.map(ward => (
                  <option key={ward} value={ward}>{ward}</option>
                ))}
              </select>
              <ChevronDown size={14} className="ma-select-icon" />
            </div>
            <div className="ma-select-wrapper">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All Status">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <ChevronDown size={14} className="ma-select-icon" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="ma-table-responsive">
          <table className="ma-table">
            <thead>
              <tr>
                <th>MEMBER</th>
                <th>USERNAME</th>
                <th>MOBILE NUMBER</th>
                <th>WARD NAME</th>
                <th>STATUS</th>
                <th>JOINED DATE</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member, idx) => {
                  const isActive = member.status === "active";
                  return (
                    <tr key={member.id || idx}>
                      <td>
                        <div className="ma-user-col">
                          <div className="ma-avatar">
                            {member.name ? member.name.substring(0, 2).toUpperCase() : "WM"}
                          </div>
                          <div>
                            <div className="ma-user-name">{member.name}</div>
                            <div className="ma-user-role">Ward Member</div>
                          </div>
                        </div>
                      </td>
                      <td>{member.username}</td>
                      <td>{member.mobile}</td>
                      <td>{member.wardName}</td>
                      <td>
                        <span className={`ma-badge ${isActive ? 'ma-badge-active' : 'ma-badge-inactive'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{member.joinedDate}</td>
                      <td>
                        <button
                          className={`ma-action-btn ${isActive ? 'ma-btn-stop' : 'ma-btn-activate'}`}
                          onClick={() => openConfirmModal(member)}
                        >
                          {isActive ? 'Stop' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="7" className="ma-empty-state">No ward members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="ma-pagination">
          <span className="ma-page-info">
            Showing {filteredMembers.length > 0 ? 1 : 0} to {filteredMembers.length} of {filteredMembers.length} members
          </span>
          <div className="ma-page-buttons">
            <button disabled>Previous</button>
            <button disabled>Next</button>
          </div>
        </div>
      </div>

      {/* --- ADD MEMBER MODAL --- */}
      {showAddModal && (
        <div className="ma-modal-overlay">
          <div className="ma-modal">
            <h2>Add Ward Member</h2>
            <p className="ma-modal-sub">Register a new representative for a ward.</p>

            <form onSubmit={handleAddSubmit} className="ma-modal-form">
              <div className="ma-form-group">
                <label>Member Name</label>
                <input required type="text" placeholder="Full name" value={newMember.name} onChange={(e) => setNewMember({...newMember, name: e.target.value})} />
              </div>
              <div className="ma-form-group">
                <label>Username</label>
                <input required type="text" placeholder="Unique username" value={newMember.username} onChange={(e) => setNewMember({...newMember, username: e.target.value.replace(/\s+/g, '')})} />
              </div>
              <div className="ma-form-group">
                <label>Mobile Number</label>
                <input required type="text" maxLength={10} placeholder="10-digit mobile" value={newMember.mobile} onChange={(e) => setNewMember({...newMember, mobile: e.target.value.replace(/\D/g, '')})} />
              </div>
              <div className="ma-form-group">
                <label>Ward Name</label>
                <select required value={newMember.wardName} onChange={(e) => setNewMember({...newMember, wardName: e.target.value})}>
                  <option value="" disabled hidden>Select assigned ward</option>
                  {Object.values(WARD_OPTIONS).map(ward => (
                    <option key={ward} value={ward}>{ward}</option>
                  ))}
                </select>
              </div>
              <div className="ma-form-group">
                <label>Password</label>
                <input required type="password" placeholder="Create a password" value={newMember.password} onChange={(e) => setNewMember({...newMember, password: e.target.value})} />
              </div>

              {errorMsg && <div className="ma-form-error">{errorMsg}</div>}

              <div className="ma-modal-actions">
                <button type="button" className="ma-btn-cancel" onClick={() => {setShowAddModal(false); setErrorMsg("");}}>Cancel</button>
                <button type="submit" className="ma-btn-submit">Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL --- */}
      {showConfirmModal && selectedMember && (
        <div className="ma-modal-overlay">
          <div className="ma-modal ma-modal-sm">
            <h3>{selectedMember.status === "active" ? "Deactivate Member?" : "Activate Member?"}</h3>
            <p className="ma-modal-text">
              Are you sure you want to {selectedMember.status === "active" ? "stop" : "activate"} access for <strong>{selectedMember.name}</strong>?
              {selectedMember.status === "active" && " They will be immediately logged out of their current session."}
            </p>
            <div className="ma-modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="ma-btn-cancel" onClick={() => setShowConfirmModal(false)}>Cancel</button>
              <button
                type="button"
                className={selectedMember.status === "active" ? "ma-btn-danger" : "ma-btn-submit"}
                onClick={handleToggleStatusConfirm}
              >
                Yes, {selectedMember.status === "active" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}