import React, { useState, useEffect, useMemo } from "react";
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
  Edit,
  Loader2,
  X
} from "lucide-react";
import api from "../../axiosInstance";
import "./Dashboard.css";

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

const ALL_WARDS_LIST = Object.values(WARD_MAP);

const normalizeWardKey = (str) => {
  if (!str) return "";
  const s = str.toString().trim().toLowerCase();
  if (s === "all wards" || s === "panchayat wide" || s === "all") return "panchayat wide";
  
  if (WARD_MAP[s]) return s;

  for (const [key, val] of Object.entries(WARD_MAP)) {
    if (val.toLowerCase() === s) return key;
  }

  const match = s.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return `ward-${num}`;
  }

  return s;
};

const formatWardName = (wardStr) => {
  if (!wardStr) return "";
  const key = normalizeWardKey(wardStr);
  if (key === "panchayat wide") return "Panchayat Wide";
  return WARD_MAP[key] || wardStr;
};

const normalizeRole = (role) => {
  if (!role) return "CITIZEN";
  const r = role.toString().toUpperCase().trim();
  if (r === "ADMIN" || r === "PANCHAYAT") return "ADMIN";
  if (r === "WARD_OFFICER" || r === "WARD" || r === "OFFICER") return "WARD_OFFICER";
  return "CITIZEN";
};

const getFieldValue = (obj, ...keys) => {
  if (!obj) return "";
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") {
      return String(obj[k]).trim();
    }
  }
  return "";
};

export default function Dashboard({ userRole = "CITIZEN", userWard = "North Ward", userName = "" }) {
  const navigate = useNavigate();

  const activeRole = normalizeRole(userRole);
  const formattedUserWard = formatWardName(userWard) || "North Ward";
  const userWardKey = normalizeWardKey(userWard);

  const [villageNews, setVillageNews] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [wardMembersList, setWardMembersList] = useState([]);
  const [wardRepresentatives, setWardRepresentatives] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fullscreenImage, setFullscreenImage] = useState(null);

  const [statsCounts, setStatsCounts] = useState({
    complaints: 0,
    projects: 0,
    notifications: 0,
    verifiedSchemes: 0,
    activeWards: 8
  });

  const [editingId, setEditingId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newTag, setNewTag] = useState("ANNOUNCEMENT");
  const [newWard, setNewWard] = useState(activeRole === "WARD_OFFICER" ? formattedUserWard : "Panchayat Wide");
  const [imageBase64, setImageBase64] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWard, setContactWard] = useState("Panchayat Wide");

  const extractList = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [newsRes, contactsRes, compRes, projRes, repRes, membersRes] = await Promise.allSettled([
        api.get("village-news/"),
        api.get("emergency-contacts/"),
        api.get("complaints/"),
        api.get("projects/"),
        api.get("ward-representatives/"),
        api.get("ward-members/")
      ]);

      const newsData = newsRes.status === "fulfilled" ? extractList(newsRes.value.data) : [];
      const contactsData = contactsRes.status === "fulfilled" ? extractList(contactsRes.value.data) : [];
      const compData = compRes.status === "fulfilled" ? extractList(compRes.value.data) : [];
      const projData = projRes.status === "fulfilled" ? extractList(projRes.value.data) : [];
      const repData = repRes.status === "fulfilled" ? extractList(repRes.value.data) : [];
      const membersData = membersRes.status === "fulfilled" ? extractList(membersRes.value.data) : [];

      setVillageNews(newsData);
      setEmergencyContacts(contactsData);
      setWardRepresentatives(repData);
      setWardMembersList(membersData);

      const filteredComp = compData.filter((c) => {
        if (activeRole === "ADMIN") return true;

        const compWardRaw = getFieldValue(c, "location", "locationName", "ward", "wardName", "ward_name", "wardNumber", "ward_number", "place");
        const compWardKey = normalizeWardKey(compWardRaw);
        const compUser = getFieldValue(c, "username", "userName", "submitted_by", "submittedBy", "user", "author", "created_by").toLowerCase();

        const currentUserName = (userName || "").toLowerCase().trim();

        if (activeRole === "CITIZEN") {
          const isUserComplaint = Boolean(currentUserName && compUser && compUser === currentUserName);
          const isWardComplaint = Boolean(compWardKey && userWardKey && compWardKey === userWardKey);
          
          return (
            isUserComplaint ||
            isWardComplaint ||
            (compWardRaw && compWardRaw.toLowerCase().includes(formattedUserWard.toLowerCase()))
          );
        }

        if (activeRole === "WARD_OFFICER") {
          return (
            compWardKey === userWardKey ||
            (compWardRaw && compWardRaw.toLowerCase().includes(formattedUserWard.toLowerCase())) ||
            !compWardRaw
          );
        }

        return true;
      });

      const filteredProj = projData.filter((p) => {
        if (activeRole === "ADMIN") return true;
        const projWardKey = normalizeWardKey(getFieldValue(p, "location", "ward", "wardName", "ward_name"));
        return projWardKey === userWardKey || projWardKey === "panchayat wide" || !projWardKey;
      });

      const filteredNews = newsData.filter((n) => {
        if (activeRole === "ADMIN") return true;
        const newsWardKey = normalizeWardKey(getFieldValue(n, "ward", "wardName", "ward_name"));
        return newsWardKey === "panchayat wide" || newsWardKey === userWardKey || !newsWardKey;
      });

      setStatsCounts({
        complaints: filteredComp.length,
        projects: filteredProj.length,
        notifications: filteredNews.length,
        verifiedSchemes: compData.filter(c => ["approved", "verified", "resolved"].includes((c.status || "").toLowerCase())).length,
        activeWards: 8
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userWard, activeRole]);

  const currentRepresentative = useMemo(() => {
    if (activeRole === "WARD_OFFICER") {
      const adminRep = wardRepresentatives.find((rep) => {
        const roleStr = getFieldValue(rep, "role", "title").toLowerCase();
        const wardStr = normalizeWardKey(getFieldValue(rep, "ward_name", "ward", "wardName"));
        return roleStr.includes("admin") || roleStr.includes("secretary") || wardStr === "panchayat wide";
      });

      const phone = getFieldValue(adminRep, "mobile", "phone", "phone_number");

      return {
        name: getFieldValue(adminRep, "name", "fullName", "username") || "Panchayat Secretary",
        title: getFieldValue(adminRep, "title") || "Supervising Authority",
        ward: "Main Office",
        phone: phone || "No active number",
        avatar: getFieldValue(adminRep, "avatar") || "PS"
      };
    }

    if (activeRole === "ADMIN") {
      const distRep = wardRepresentatives.find((rep) => {
        const roleStr = getFieldValue(rep, "role", "title").toLowerCase();
        return roleStr.includes("district") || roleStr.includes("coordinator");
      });

      const phone = getFieldValue(distRep, "mobile", "phone", "phone_number");

      return {
        name: getFieldValue(distRep, "name", "fullName", "username") || "District Coordinator",
        title: getFieldValue(distRep, "title") || "Supervisory Control",
        ward: "District HQ",
        phone: phone || "No active number",
        avatar: getFieldValue(distRep, "avatar") || "DC"
      };
    }

    const matchedMember = wardMembersList.find((m) => {
      const memberWardKey = normalizeWardKey(m.wardName || m.ward_name || m.ward);
      const isActive = (m.status || "active").toLowerCase() === "active";
      return memberWardKey === userWardKey && isActive;
    });

    if (matchedMember) {
      const name = matchedMember.name || matchedMember.fullName || "Ward Member";
      const mobile = matchedMember.mobile || matchedMember.phone || matchedMember.phone_number;
      return {
        name: name,
        title: "Ward Representative",
        ward: formatWardName(matchedMember.wardName || matchedMember.ward) || formattedUserWard,
        phone: mobile && String(mobile).trim() !== "" ? String(mobile).trim() : "No active number",
        avatar: name ? name.substring(0, 2).toUpperCase() : "WM"
      };
    }

    const fallbackRep = wardRepresentatives.find((rep) => {
      const repWardKey = normalizeWardKey(getFieldValue(rep, "wardName", "ward_name", "ward"));
      return repWardKey === userWardKey;
    });

    if (fallbackRep) {
      const name = getFieldValue(fallbackRep, "name", "fullName", "username");
      const phone = getFieldValue(fallbackRep, "mobile", "phone", "phone_number");
      return {
        name: name || "Ward Member",
        title: getFieldValue(fallbackRep, "title") || "Ward Representative",
        ward: formatWardName(getFieldValue(fallbackRep, "wardName", "ward_name", "ward")) || formattedUserWard,
        phone: phone || "No active number",
        avatar: name ? name.substring(0, 2).toUpperCase() : "WM"
      };
    }

    return {
      name: "Ward Member",
      title: "Ward Representative",
      ward: formattedUserWard,
      phone: "No active number",
      avatar: "WM"
    };
  }, [wardMembersList, wardRepresentatives, userWardKey, formattedUserWard, activeRole]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNewTitle("");
    setNewTag("ANNOUNCEMENT");
    setNewWard(activeRole === "WARD_OFFICER" ? formattedUserWard : "Panchayat Wide");
    setImageBase64("");
  };

  const handleAddOrUpdateNews = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const targetWard = activeRole === "WARD_OFFICER" ? formattedUserWard : newWard;
    const payload = {
      tag: newTag,
      category: newTag,
      title: newTitle,
      ward: targetWard,
      createdByRole: activeRole,
      ...(imageBase64 && { image: imageBase64, image_url: imageBase64 })
    };

    try {
      const url = editingId ? `village-news/${editingId}/` : "village-news/";
      
      if (editingId) {
        await api.patch(url, payload);
      } else {
        await api.post(url, payload);
      }

      alert(editingId ? "News updated successfully!" : "News published successfully!");
      fetchDashboardData();
      resetForm();
    } catch (error) {
      console.error("Error saving news:", error);
      alert("Error saving news item.");
    }
  };

  const handleEditClick = (news) => {
    setEditingId(news.id);
    setNewTitle(news.title || "");
    setNewTag(news.tag || news.category || "ANNOUNCEMENT");
    setNewWard(formatWardName(news.ward) || "Panchayat Wide");
    setImageBase64(news.image || news.image_url || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteNews = async (id) => {
    if (window.confirm("ഈ വാർത്ത ഡിലീറ്റ് ചെയ്യണമെന്നുറപ്പാണോ?")) {
      try {
        await api.delete(`village-news/${id}/`);
        setVillageNews(prev => prev.filter((item) => item.id !== id));
        if (editingId === id) resetForm();
        alert("വാർത്ത ഡിലീറ്റ് ചെയ്തു.");
      } catch (error) {
        console.error("Error deleting news:", error);
        alert("ഡിലീറ്റ് ചെയ്യുന്നതിൽ പിശക് സംഭവിച്ചു.");
      }
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;

    const targetContactWard = activeRole === "WARD_OFFICER" ? formattedUserWard : contactWard;

    try {
      await api.post("emergency-contacts/", {
        name: contactName,
        phone: contactPhone,
        ward: targetContactWard
      });

      fetchDashboardData();
      setContactName("");
      setContactPhone("");
    } catch (error) {
      console.error("Error adding contact:", error);
    }
  };

  const handleDeleteContact = async (id) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      try {
        await api.delete(`emergency-contacts/${id}/`);
        fetchDashboardData();
      } catch (error) {
        console.error("Error deleting contact:", error);
      }
    }
  };

  const isOnlyAdmin = activeRole === "ADMIN";

  const filteredNews = activeRole === "ADMIN"
    ? villageNews
    : villageNews.filter((news) => {
        const wKey = normalizeWardKey(news.ward);
        return wKey === "panchayat wide" || wKey === userWardKey;
      });

  const filteredEmergencyContacts = activeRole === "ADMIN"
    ? emergencyContacts
    : emergencyContacts.filter((contact) => {
        const wKey = normalizeWardKey(contact.ward);
        return wKey === "panchayat wide" || wKey === userWardKey;
      });

  const roleData = {
    CITIZEN: {
      title: `Welcome, ${userName || "Citizen"}! 👋`,
      subtitle: `Your contribution helps build a better village. Checking updates for ${formattedUserWard}.`,
      heroBg: "linear-gradient(135deg, #1b5e20, #2e7d32)",
      stats: [
        { key: "complaints", label: "Submitted Complaints", value: statsCounts.complaints, icon: FileText, tone: "blue" },
        { key: "projects", label: "Active Projects", value: statsCounts.projects, icon: Leaf, tone: "green" },
        { key: "notifications", label: "Nearby Notifications", value: statsCounts.notifications, icon: Bell, tone: "orange" }
      ],
      quickActions: [
        { label: "Submit Complaint", icon: FileText, tone: "green", path: "/complaints" },
        { label: "Emergency SOS", icon: Siren, tone: "red", path: "/emergency-sos" },
        { label: "Blood Donors", icon: Droplet, tone: "pink", path: "/blood-donors" },
        { label: "Govt. Schemes", icon: Landmark, tone: "purple", path: "/welfare-schemes" }
      ]
    },
    WARD_OFFICER: {
      title: `Ward Member Dashboard "${formattedUserWard}" - ${userName || "Member"} 👋`,
      subtitle: `Managing ${formattedUserWard} operations, reviewing pending tasks, and verifying local requests.`,
      heroBg: "linear-gradient(135deg, #0284c7, #0369a1)",
      stats: [
        { key: "wardComplaints", label: "Pending Ward Complaints", value: statsCounts.complaints, icon: ClipboardList, tone: "orange" },
        { key: "verified", label: "Verified Schemes", value: statsCounts.verifiedSchemes, icon: CircleCheck, tone: "green" },
        { key: "alerts", label: "Ward Notifications", value: statsCounts.notifications, icon: Bell, tone: "blue" }
      ],
      quickActions: [
        { label: "Verify Complaints", icon: ClipboardList, tone: "blue", path: "/complaints" },
        { label: "Broadcast Alert", icon: Siren, tone: "red", path: "/emergency-sos" },
        { label: "Add Scheme Beneficiary", icon: Users, tone: "green", path: "/welfare-schemes" },
        { label: "View Ward Map", icon: Building2, tone: "purple", path: "https://wardmap.ksmart.live/" }
      ]
    },
    ADMIN: {
      title: `Panchayat Main Control Dashboard - ${userName || "Admin"} 👋`,
      subtitle: "System-wide oversight across all panchayat wards, service departments, and master settings.",
      heroBg: "linear-gradient(135deg, #b91c1c, #991b1b)",
      stats: [
        { key: "totalComplaints", label: "Total Village Complaints", value: statsCounts.complaints, icon: FileText, tone: "blue" },
        { key: "activeWards", label: "Managed Wards", value: statsCounts.activeWards, icon: Building2, tone: "green" },
        { key: "systemAlerts", label: "System Notifications", value: statsCounts.notifications, icon: Shield, tone: "red" }
      ],
      quickActions: [
        { label: "Manage Users", icon: Users, tone: "blue", path: "/members-Authentication" },
        { label: "System Broadcast", icon: Siren, tone: "red", path: "/emergency-sos" },
        { label: "Audit Reports", icon: ClipboardList, tone: "purple", path: "/complaints" },
        { label: "Settings", icon: Landmark, tone: "orange", path: "/welfare-schemes" }
      ]
    }
  };

  const currentData = roleData[activeRole] || roleData.CITIZEN;

  return (
    <div className="dash-container">
      <section className="dash-hero" style={{ background: currentData.heroBg }}>
        <h1>{currentData.title}</h1>
        <p>{currentData.subtitle}</p>
        <span className="dash-role-badge">
          Role: {activeRole} | Ward: {formattedUserWard}
        </span>
      </section>

      <section className="dash-stats">
        {currentData.stats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div className="dash-stat-card" key={stat.key}>
              <div className={`dash-stat-icon tone-${stat.tone}`}>
                <IconComponent size={20} />
              </div>
              <div>
                <div className="dash-stat-value">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : stat.value}
                </div>
                <div className="dash-stat-label">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="dash-section">
        <h2>Quick Actions</h2>
        <div className="dash-actions">
          {currentData.quickActions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <button 
                className="dash-action-card" 
                key={index} 
                onClick={() => {
                  if (action.path.startsWith("http")) {
                    window.open(action.path, "_blank", "noopener,noreferrer");
                  } else {
                    navigate(action.path);
                  }
                }}
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
          {(activeRole === "ADMIN" || activeRole === "WARD_OFFICER") && (
            <div
              className="dash-card"
              style={{
                background: "#ffffff",
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "20px",
                border: "1px solid #e2e8f0"
              }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {editingId ? (
                  <>
                    <Edit size={18} color="#0284c7" /> Update Village News
                  </>
                ) : (
                  <>
                    <PlusCircle size={18} color="#16a34a" /> Publish New Village News
                  </>
                )}
              </h3>
              <form onSubmit={handleAddOrUpdateNews} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input
                  type="text"
                  placeholder="News Title / Headline..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px"
                  }}
                  required
                />

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                    {editingId ? "Select New Image (Optional):" : "Select News Image:"}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#f8fafc"
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder="Tag (e.g., ANNOUNCEMENT)"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: "150px",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px"
                    }}
                  />

                  {activeRole === "ADMIN" ? (
                    <select
                      value={newWard}
                      onChange={(e) => setNewWard(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: "150px",
                        padding: "8px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        background: "#fff"
                      }}
                    >
                      <option value="Panchayat Wide">Panchayat Wide (All Wards)</option>
                      {ALL_WARDS_LIST.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={`Posting for: ${formattedUserWard}`}
                      disabled
                      style={{
                        flex: 1,
                        minWidth: "150px",
                        padding: "8px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        background: "#f1f5f9",
                        color: "#334155",
                        fontWeight: "600"
                      }}
                    />
                  )}

                  <div style={{ display: "flex", gap: "8px" }}>
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        style={{
                          background: "#64748b",
                          color: "#fff",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "6px",
                          fontWeight: "600",
                          cursor: "pointer"
                        }}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      style={{
                        background: editingId ? "#0284c7" : "#16a34a",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        fontWeight: "600",
                        cursor: "pointer"
                      }}
                    >
                      {editingId ? "Update News" : "Publish"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          <section className="dash-section">
            <div className="dash-section-head">
              <h2>Latest Village News ({filteredNews.length})</h2>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Loader2 className="animate-spin" size={28} color="#16a34a" />
              </div>
            ) : (
              <div className="dash-news-grid">
                {filteredNews.length > 0 ? (
                  filteredNews.map((news) => {
                    const imageUrl = news.image || news.image_url || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=500&q=80";

                    return (
                      <div className="dash-news-card" key={news.id} style={{ position: "relative" }}>
                        
                        <div
                          className="dash-news-image"
                          style={{
                            height: "200px",
                            overflow: "hidden",
                            position: "relative",
                            cursor: "pointer",
                            background: "#000",
                            borderRadius: "12px 12px 0 0"
                          }}
                          onClick={() => setFullscreenImage(imageUrl)}
                          title="Click to view full screen"
                        >
                          <img
                            src={imageUrl}
                            alt={news.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              transition: "transform 0.3s ease"
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: "rgba(0,0,0,0.65)",
                              color: "#fff",
                              fontSize: "11px",
                              textAlign: "center",
                              padding: "4px",
                              fontWeight: "500"
                            }}
                          >
                            🔍 Click to view full image
                          </div>
                        </div>

                        <div className="dash-news-body">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span className="dash-news-tag">{news.tag || news.category || "ANNOUNCEMENT"}</span>

                            {isOnlyAdmin && (
                              <div style={{ display: "flex", gap: "10px" }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEditClick(news); }}
                                  style={{ background: "transparent", border: "none", color: "#0284c7", cursor: "pointer", padding: "2px" }}
                                  title="Edit News"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteNews(news.id); }}
                                  style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", padding: "2px" }}
                                  title="Delete News Permanently"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="dash-news-title" style={{ fontSize: "16px", fontWeight: "700", marginTop: "8px", color: "#0f172a" }}>{news.title}</p>
                          <span className="dash-news-meta" style={{ fontSize: "12px", color: "#64748b" }}>
                            {news.postedAt || news.created_at || "Sep 09, 2026"} · {formatWardName(news.ward)}{" "}
                            {news.createdByRole === "ADMIN"
                              ? "(By Admin)"
                              : news.createdByRole === "WARD_OFFICER"
                              ? "(By Ward Officer)"
                              : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color: "#64748b", padding: "10px" }}>No village news published yet.</p>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="dash-sidebar">
          {(activeRole === "ADMIN" || activeRole === "WARD_OFFICER") && (
            <div
              className="dash-card"
              style={{ background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px" }}
            >
              <h3
                style={{
                  fontSize: "15px",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <PlusCircle size={16} color="#dc2626" /> Add Emergency Contact
              </h3>
              <form onSubmit={handleAddContact} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Service Name (e.g., Fire Station)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  required
                />
                <input
                  type="text"
                  placeholder="Phone Number (e.g., 101)"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  required
                />

                {activeRole === "ADMIN" ? (
                  <select
                    value={contactWard}
                    onChange={(e) => setContactWard(e.target.value)}
                    style={{
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#fff"
                    }}
                  >
                    <option value="Panchayat Wide">Panchayat Wide (All Wards)</option>
                    {ALL_WARDS_LIST.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={`Adding for: ${formattedUserWard}`}
                    disabled
                    style={{
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#f1f5f9",
                      color: "#334155",
                      fontWeight: "600"
                    }}
                  />
                )}

                <button
                  type="submit"
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    padding: "6px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Save Contact
                </button>
              </form>
            </div>
          )}

          <section className="dash-section">
            <h2>Emergency Contacts ({filteredEmergencyContacts.length})</h2>
            <div className="dash-contacts">
              {filteredEmergencyContacts.map((contact) => {
                const phoneVal = getFieldValue(contact, "mobile", "phone", "phone_number", "phoneNumber");
                return (
                  <div
                    className="dash-contact-row"
                    key={contact.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                      borderBottom: "1px solid #f1f5f9",
                      paddingBottom: "6px"
                    }}
                  >
                    <div>
                      <span className="dash-contact-name" style={{ display: "block", fontWeight: "600" }}>
                        {getFieldValue(contact, "name", "title")}
                      </span>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>{formatWardName(contact.ward)}</span>
                      <a
                        className="dash-contact-phone"
                        href={phoneVal ? `tel:${phoneVal}` : "#"}
                        style={{ marginTop: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <Phone width="14" size={14} />
                        {phoneVal || "No active number"}
                      </a>
                    </div>
                    {isOnlyAdmin && (
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#dc2626",
                          cursor: "pointer",
                          padding: "4px"
                        }}
                        title="Remove Contact"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="dash-rep-card">
            <div className="dash-rep-avatar">{currentRepresentative.avatar}</div>
            <div style={{ flex: 1 }}>
              <p className="dash-rep-label">{currentRepresentative.title}</p>
              <p className="dash-rep-name" style={{ fontWeight: "700", fontSize: "15px" }}>{currentRepresentative.name}</p>
              <p className="dash-rep-ward" style={{ fontSize: "12px", color: "#64748b" }}>{currentRepresentative.ward}</p>
              <p style={{
                fontSize: "12px",
                color: currentRepresentative.phone === "No active number" ? "#dc2626" : "#16a34a",
                fontWeight: "600",
                marginTop: "4px"
              }}>
                📞 {currentRepresentative.phone}
              </p>
            </div>
            {currentRepresentative.phone !== "No active number" ? (
              <a
                href={`tel:${currentRepresentative.phone}`}
                className="dash-rep-msg"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "2px" }}
              >
                Contact <ChevronRight size={14} />
              </a>
            ) : (
              <span className="dash-rep-msg" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                Contact <ChevronRight size={14} />
              </span>
            )}
          </div>
        </aside>
      </div>

      {fullscreenImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.92)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999,
            backdropFilter: "blur(4px)",
            animation: "fadeIn 0.2s ease-in-out"
          }}
          onClick={() => setFullscreenImage(null)}
        >
          <button
            style={{
              position: "absolute",
              top: "20px",
              right: "25px",
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              color: "#ffffff",
              borderRadius: "50%",
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            onClick={() => setFullscreenImage(null)}
            title="Close Fullscreen View"
          >
            <X size={28} />
          </button>
          <img
            src={fullscreenImage}
            alt="Full Screen View"
            style={{
              maxWidth: "92vw",
              maxHeight: "90vh",
              borderRadius: "8px",
              objectFit: "contain",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)"
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}