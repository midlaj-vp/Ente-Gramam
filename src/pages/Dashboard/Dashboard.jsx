import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Leaf,
  Bell,
  CircleCheck,
  Siren,
  Droplet,
  Landmark,
  Phone,
  ChevronRight,
  Shield,
  Users,
  ClipboardList,
  Building2,
  PlusCircle,
  Trash2,
  Edit
} from "lucide-react";
import "./Dashboard.css";

const ROLES = {
  CITIZEN: "CITIZEN",
  WARD_OFFICER: "WARD_OFFICER",
  ADMIN: "ADMIN"
};

export default function Dashboard({ userRole = ROLES.CITIZEN, userWard = "Ward 04", userName = "" }) {
  const navigate = useNavigate();

  // വാർത്തകൾ localStorage-ൽ നിന്ന് എടുക്കുന്നു
  const [villageNews, setVillageNews] = useState(() => {
    const savedNews = localStorage.getItem("villageNews");
    if (savedNews) {
      try {
        const parsed = JSON.parse(savedNews);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing saved news", e);
      }
    }
    return [
      {
        id: 1,
        tag: "ENVIRONMENT",
        title: "New Bio-Park Project Inauguration this Sunday",
        postedAt: "2 hours ago",
        ward: "Panchayat Wide",
        image: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=500&q=80",
        createdByRole: ROLES.ADMIN
      }
    ];
  });

  const [editingId, setEditingId]  = useState(null);
  const [newTitle, setNewTitle]   = useState("");
  const [newTag, setNewTag]      = useState("ANNOUNCEMENT");
  
  const [newWard, setNewWard]     = useState(userRole === ROLES.WARD_OFFICER ? userWard : "Panchayat Wide");
  const [imageBase64, setImageBase64] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNewTitle("");
    setNewTag("ANNOUNCEMENT");
    setNewWard(userRole === ROLES.WARD_OFFICER ? userWard : "Panchayat Wide");
    setImageBase64("");
  };

  const handleAddOrUpdateNews = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const targetWard = (userRole === ROLES.WARD_OFFICER) ? userWard : newWard;

    if (editingId) {
      const updatedNewsList = villageNews.map((news) => {
        if (news.id === editingId) {
          return {
            ...news,
            title: newTitle,
            tag: newTag,
            ward: targetWard,
            image: imageBase64 || news.image
          };
        }
        return news;
      });

      setVillageNews(updatedNewsList);
      localStorage.setItem("villageNews", JSON.stringify(updatedNewsList));
    } else {
      const newItem = {
        id: Date.now(),
        tag: newTag,
        title: newTitle,
        postedAt: "Just now",
        ward: targetWard,
        image: imageBase64 || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=500&q=80",
        createdByRole: userRole
      };

      const updatedNews = [newItem, ...villageNews];
      setVillageNews(updatedNews);
      localStorage.setItem("villageNews", JSON.stringify(updatedNews));
    }

    resetForm();
  };

  const handleEditClick = (news) => {
    setEditingId(news.id);
    setNewTitle(news.title);
    setNewTag(news.tag);
    setNewWard(news.ward);
    setImageBase64(""); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteNews = (id) => {
    if(window.confirm("Are you sure you want to delete this news?")) {
      const updatedNews = villageNews.filter(news => news.id !== id);
      setVillageNews(updatedNews);
      localStorage.setItem("villageNews", JSON.stringify(updatedNews));
      if (editingId === id) resetForm();
    }
  };

  const hasPermission = (newsItem) => {
    if (userRole === ROLES.ADMIN) return true;
    if (userRole === ROLES.WARD_OFFICER) {
      if (newsItem.createdByRole === ROLES.ADMIN) return false;
      if (newsItem.ward !== userWard && newsItem.ward !== "Panchayat Wide") return false;
      return true;
    }
    return false;
  };

  // എമർജൻസി കോൺടാക്റ്റുകൾ localStorage-ൽ നിന്ന് എടുക്കുന്ന രീതിയിലേക്ക് മാറ്റിയിരിക്കുന്നു
  const [emergencyContacts, setEmergencyContacts] = useState(() => {
    const savedContacts = localStorage.getItem("emergencyContacts");
    if (savedContacts) {
      try {
        const parsed = JSON.parse(savedContacts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing saved emergency contacts", e);
      }
    }
    return [
      { id: 1, name: "Fire Station", phone: "101", ward: "Panchayat Wide" },
      { id: 2, name: "Police Station", phone: "100", ward: "Panchayat Wide" },
      { id: 3, name: "Health Center", phone: "0484-2334455", ward: "Panchayat Wide" },
      { id: 4, name: "Ward 04 Medical Help", phone: "9876543210", ward: "Ward 04" },
      { id: 5, name: "Ward 01 Help Desk", phone: "9123456789", ward: "Ward 01" },
    ];
  });

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWard, setContactWard] = useState("Panchayat Wide");

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;

    // വാർഡ് ഓഫീസർ ആണെങ്കിൽ അവരുടെ സ്വന്തം വാർഡ് ഓട്ടോമാറ്റിക് ആയി സെറ്റ് ചെയ്യും
    const targetContactWard = (userRole === ROLES.WARD_OFFICER) ? userWard : contactWard;

    const newContact = {
      id: Date.now(),
      name: contactName,
      phone: contactPhone,
      ward: targetContactWard
    };

    const updatedContacts = [...emergencyContacts, newContact];
    setEmergencyContacts(updatedContacts);
    localStorage.setItem("emergencyContacts", JSON.stringify(updatedContacts));
    
    setContactName("");
    setContactPhone("");
  };

  const handleDeleteContact = (id) => {
    if(window.confirm("Are you sure you want to delete this contact?")) {
      const updatedContacts = emergencyContacts.filter(c => c.id !== id);
      setEmergencyContacts(updatedContacts);
      localStorage.setItem("emergencyContacts", JSON.stringify(updatedContacts));
    }
  };

  // ഫിൽട്ടറിംഗ് ലോജിക്: സിറ്റിസൺ അല്ലെങ്കിൽ വാർഡ് ഓഫീസർ ആണെങ്കിൽ "Panchayat Wide" ഉം അവരുടെ സ്വന്തം വാർഡും മാത്രം കാണിക്കും.
  const filteredNews = userRole === ROLES.ADMIN
    ? villageNews
    : villageNews.filter(news => news.ward === "Panchayat Wide" || news.ward === userWard);

  const filteredEmergencyContacts = userRole === ROLES.ADMIN
    ? emergencyContacts
    : emergencyContacts.filter(contact => contact.ward === "Panchayat Wide" || contact.ward === userWard);

  const wardRepresentatives = {
    "Ward 01": { name: "Ahammed Kutty", title: "Ward Representative", ward: "Ward 01 Member", avatar: "AK" },
    "Ward 02": { name: "Fathima Beevi", title: "Ward Representative", ward: "Ward 02 Member", avatar: "FB" },
    "Ward 03": { name: "Abdul Basheer", title: "Ward Representative", ward: "Ward 03 Member", avatar: "AB" },
    "Ward 04": { name: "Adv. Sreejith R.", title: "Ward Representative", ward: "Ward 04 Member", avatar: "AS" },
  };

  const currentRepresentative = wardRepresentatives[userWard] || { 
    name: "Ward Member", 
    title: "Ward Representative", 
    ward: `${userWard} Member`, 
    avatar: "WM" 
  };

  const roleData = {
    [ROLES.CITIZEN]: {
      title: `Welcome, ${userName}! 👋`,
      subtitle: `Your contribution helps build a better village. Checking updates for ${userWard}.`,
      heroBg: "linear-gradient(135deg, #1b5e20, #2e7d32)",
      stats: [
        { key: "complaints", label: "Submitted Complaints", value: 5, icon: FileText, tone: "blue" },
        { key: "projects", label: "Active Projects", value: 3, icon: Leaf, tone: "green" },
        { key: "notifications", label: "Nearby Notifications", value: 12, icon: Bell, tone: "orange" },
      ],
      quickActions: [
        { label: "Submit Complaint", icon: FileText, tone: "green", path: "/complaints" },
        { label: "Emergency SOS", icon: Siren, tone: "red", path: "/emergency-sos" },
        { label: "Blood Donors", icon: Droplet, tone: "pink", path: "/blood-donors" },
        { label: "Govt. Schemes", icon: Landmark, tone: "purple", path: "/welfare-schemes" },
      ],
      representative: currentRepresentative
    },
    [ROLES.WARD_OFFICER]: {
      title: `Ward Member Dashboard (${userWard}) - ${userName} 👋`,
      subtitle: `Managing ${userWard} operations, reviewing pending tasks, and verifying local requests.`,
      heroBg: "linear-gradient(135deg, #0284c7, #0369a1)",
      stats: [
        { key: "wardComplaints", label: "Pending Ward Complaints", value: 8, icon: ClipboardList, tone: "orange" },
        { key: "verified", label: "Verified Schemes", value: 15, icon: CircleCheck, tone: "green" },
        { key: "alerts", label: "Ward Alerts Broadcasted", value: 4, icon: Bell, tone: "blue" },
      ],
      quickActions: [
        { label: "Verify Complaints", icon: ClipboardList, tone: "blue", path: "/complaints" },
        { label: "Broadcast Alert", icon: Siren, tone: "red", path: "/emergency-sos" },
        { label: "Add Scheme Beneficiary", icon: Users, tone: "green", path: "/welfare-schemes" },
        { label: "View Ward Map", icon: Building2, tone: "purple", path: "/" },
      ],
      representative: { name: "Panchayat Secretary", title: "Supervising Authority", ward: "Main Office", avatar: "PS" }
    },
    [ROLES.ADMIN]: {
      title: `Panchayat Main Control Dashboard - ${userName} 👋`,
      subtitle: "System-wide oversight across all panchayat wards, service departments, and master settings.",
      heroBg: "linear-gradient(135deg, #b91c1c, #991b1b)",
      stats: [
        { key: "totalComplaints", label: "Total Village Complaints", value: 42, icon: FileText, tone: "blue" },
        { key: "activeWards", label: "Managed Wards", value: 14, icon: Building2, tone: "green" },
        { key: "systemAlerts", label: "Active System Alerts", value: 2, icon: Shield, tone: "red" },
      ],
      quickActions: [
        { label: "Manage Users", icon: Users, tone: "blue", path: "/" },
        { label: "System Broadcast", icon: Siren, tone: "red", path: "/emergency-sos" },
        { label: "Audit Reports", icon: ClipboardList, tone: "purple", path: "/complaints" },
        { label: "Settings", icon: Landmark, tone: "orange", path: "/welfare-schemes" },
      ],
      representative: { name: "District Coordinator", title: "Supervisory Control", ward: "District HQ", avatar: "DC" }
    }
  };

  const currentData = roleData[userRole] || roleData[ROLES.CITIZEN];

  return (
    <div className="dash-container">
      {/* Hero Banner */}
      <section className="dash-hero" style={{ background: currentData.heroBg }}>
        <h1>{currentData.title}</h1>
        <p>{currentData.subtitle}</p>
        <span className="dash-role-badge">Role: {userRole} | Ward: {userWard}</span>
      </section>

      {/* Statistics Cards */}
      <section className="dash-stats">
        {currentData.stats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div className="dash-stat-card" key={stat.key}>
              <div className={`dash-stat-icon tone-${stat.tone}`}>
                <IconComponent size={20} />
              </div>
              <div>
                <div className="dash-stat-value">{stat.value}</div>
                <div className="dash-stat-label">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Quick Actions */}
      <section className="dash-section">
        <h2>Quick Actions</h2>
        <div className="dash-actions">
          {currentData.quickActions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <button 
                className="dash-action-card" 
                key={index} 
                onClick={() => navigate(action.path)}
              >
                <div className={`dash-action-icon tone-${action.tone}`}>
                  <ActionIcon size={22} />
                </div>
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="dash-grid">
        <div className="dash-main-column">
          
          {(userRole === ROLES.ADMIN || userRole === ROLES.WARD_OFFICER) && (
            <div className="dash-card" style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", marginBottom: "20px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: "16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                {editingId ? (
                  <><Edit size={18} color="#0284c7" /> Update Village News</>
                ) : (
                  <><PlusCircle size={18} color="#16a34a" /> Publish New Village News</>
                )}
              </h3>
              <form onSubmit={handleAddOrUpdateNews} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input 
                  type="text" 
                  placeholder="News Title / Headline..." 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                />
                
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                    {editingId ? "Select New Image (Optional):" : "Select News Image:"}
                  </label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#f8fafc" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input 
                    type="text" 
                    placeholder="Tag (e.g., ENVIRONMENT)" 
                    value={newTag} 
                    onChange={(e) => setNewTag(e.target.value)}
                    style={{ flex: 1, minWidth: "150px", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                  
                  {userRole === ROLES.ADMIN ? (
                    <select 
                      value={newWard} 
                      onChange={(e) => setNewWard(e.target.value)}
                      style={{ flex: 1, minWidth: "150px", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff" }}
                    >
                      <option value="Panchayat Wide">Panchayat Wide (All Wards)</option>
                      <option value="Ward 01">Ward 01</option>
                      <option value="Ward 02">Ward 02</option>
                      <option value="Ward 03">Ward 03</option>
                      <option value="Ward 04">Ward 04</option>
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={`Posting for: ${userWard}`} 
                      disabled 
                      style={{ flex: 1, minWidth: "150px", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#f1f5f9", color: "#334155", fontWeight: "600" }}
                    />
                  )}

                  <div style={{ display: "flex", gap: "8px" }}>
                    {editingId && (
                      <button type="button" onClick={resetForm} style={{ background: "#64748b", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
                        Cancel
                      </button>
                    )}
                    <button type="submit" style={{ background: editingId ? "#0284c7" : "#16a34a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
                      {editingId ? "Update News" : "Publish"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Latest Village News Section */}
          <section className="dash-section">
            <div className="dash-section-head">
              <h2>Latest Village News ({filteredNews.length})</h2>
            </div>
            <div className="dash-news-grid">
              {filteredNews.map((news) => (
                <div className="dash-news-card" key={news.id} style={{ position: "relative" }}>
                  <div className="dash-news-image" style={{ overflow: "hidden" }}>
                    <img 
                      src={news.image} 
                      alt={news.title} 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                    />
                  </div>
                  <div className="dash-news-body">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="dash-news-tag">{news.tag}</span>
                      
                      {hasPermission(news) && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button 
                            onClick={() => handleEditClick(news)} 
                            style={{ background: "transparent", border: "none", color: "#0284c7", cursor: "pointer" }}
                            title="Edit News"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteNews(news.id)} 
                            style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer" }}
                            title="Delete News Permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="dash-news-title">{news.title}</p>
                    <span className="dash-news-meta">
                      {news.postedAt} · {news.ward} {news.createdByRole === ROLES.ADMIN ? "(By Admin)" : news.createdByRole === ROLES.WARD_OFFICER ? "(By Ward Officer)" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {userRole === ROLES.CITIZEN && (
            <div className="dash-complaint-card">
              <div className="dash-complaint-head">
                <span>Complaint Progress: #CMP-7821</span>
              </div>
              <ol className="dash-timeline">
                <li className="done">
                  <span className="dot" />
                  <div>
                    <p className="step-label">Complaint Submitted</p>
                    <p className="step-at">Oct 12, 2025 · 10:45 AM</p>
                  </div>
                </li>
                <li className="done">
                  <span className="dot" />
                  <div>
                    <p className="step-label">Assigned to Electrician</p>
                    <p className="step-at">Oct 13, 2025 · 09:15 AM</p>
                  </div>
                </li>
                <li className="pending">
                  <span className="dot" />
                  <div>
                    <p className="step-label">In Progress</p>
                    <p className="step-note">Expected Resolution: Oct 15</p>
                  </div>
                </li>
              </ol>
            </div>
          )}
        </div>

        <aside className="dash-sidebar">
          {(userRole === ROLES.ADMIN || userRole === ROLES.WARD_OFFICER) && (
            <div className="dash-card" style={{ background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: "15px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <PlusCircle size={16} color="#dc2626" /> Add Emergency Contact
              </h3>
              <form onSubmit={handleAddContact} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input 
                  type="text" 
                  placeholder="Service Name (e.g., Ambulance)" 
                  value={contactName} 
                  onChange={(e) => setContactName(e.target.value)}
                  style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
                <input 
                  type="text" 
                  placeholder="Phone Number (e.g., 108)" 
                  value={contactPhone} 
                  onChange={(e) => setContactPhone(e.target.value)}
                  style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />

                {userRole === ROLES.ADMIN ? (
                  <select 
                    value={contactWard} 
                    onChange={(e) => setContactWard(e.target.value)}
                    style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff" }}
                  >
                    <option value="Panchayat Wide">Panchayat Wide (All Wards)</option>
                    <option value="Ward 01">Ward 01</option>
                    <option value="Ward 02">Ward 02</option>
                    <option value="Ward 03">Ward 03</option>
                    <option value="Ward 04">Ward 04</option>
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value={`Adding for: ${userWard}`} 
                    disabled 
                    style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#f1f5f9", color: "#334155", fontWeight: "600" }}
                  />
                )}

                <button type="submit" style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                  Save Contact
                </button>
              </form>
            </div>
          )}

          <section className="dash-section">
            <h2>Emergency Contacts ({filteredEmergencyContacts.length})</h2>
            <div className="dash-contacts">
              {filteredEmergencyContacts.map((contact) => (
                <div className="dash-contact-row" key={contact.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                  <div>
                    <span className="dash-contact-name" style={{ display: "block", fontWeight: "600" }}>{contact.name}</span>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>{contact.ward}</span>
                    <a className="dash-contact-phone" href={`tel:${contact.phone}`} style={{ marginTop: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Phone width="14" size={14} />
                      {contact.phone}
                    </a>
                  </div>
                  {(userRole === ROLES.ADMIN || userRole === ROLES.WARD_OFFICER) && (
                    <button 
                      onClick={() => handleDeleteContact(contact.id)} 
                      style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", padding: "4px" }}
                      title="Remove Contact"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="dash-rep-card">
            <div className="dash-rep-avatar">{currentData.representative.avatar}</div>
            <div>
              <p className="dash-rep-label">{currentData.representative.title}</p>
              <p className="dash-rep-name">{currentData.representative.name}</p>
              <p className="dash-rep-ward">{currentData.representative.ward}</p>
            </div>
            <button className="dash-rep-msg">
              Contact <ChevronRight size={14} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}