import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Download,
  AlertCircle,
  FileText,
  Wrench,
  ChevronDown,
  MessageSquare,
  Loader2
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../axiosInstance";
import "./WardReports.css";

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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const formatWardName = (wardStr) => {
  if (!wardStr) return "";
  const keyLower = wardStr.toString().trim().toLowerCase();
  if (keyLower === "all wards") return "All Wards";
  return WARD_MAP[keyLower] || wardStr;
};

const parseDateObject = (dateStr) => {
  if (!dateStr || dateStr === "N/A") return null;
  
  if (typeof dateStr === "string" && dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const [p1, p2, p3] = parts;
      if (p3.length === 4) {
        const d = new Date(`${p3}-${p2}-${p1}`);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return null;
};

export default function WardReports() {
  const [userRole, setUserRole] = useState("");
  const [userWardName, setUserWardName] = useState("");

  const [selectedMonth, setSelectedMonth] = useState("All Months");
  const [selectedYear, setSelectedYear] = useState("All Years");
  const [selectedWard, setSelectedWard] = useState("All Wards");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Welfare Schemes");

  const [applications, setApplications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const isAdmin = userRole === "panchayat" || userRole === "admin";

  const extractList = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  };

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("loggedInUser") || localStorage.getItem("user");
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser);
        const role = (parsedUser.role || "ward").toLowerCase();
        const ward = parsedUser.wardName || parsedUser.ward_name || parsedUser.ward || "";
        
        setUserRole(role);
        setUserWardName(formatWardName(ward));

        if (role !== "panchayat" && role !== "admin" && ward) {
          setSelectedWard(formatWardName(ward));
        }
      } else {
        setUserRole("panchayat");
      }
    } catch (e) {
      setUserRole("panchayat");
    }
  }, []);

  useEffect(() => {
    if (!isAdmin && userWardName) {
      setSelectedWard(userWardName);
    }
  }, [isAdmin, userWardName]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const [appsRes, projRes, compRes, cbRes, genRes] = await Promise.allSettled([
          api.get("applications/"),
          api.get("projects/"),
          api.get("complaints/"),
          api.get("citizen-feedbacks/"),
          api.get("general-feedbacks/")
        ]);

        if (appsRes.status === "fulfilled") setApplications(extractList(appsRes.value.data));
        if (projRes.status === "fulfilled") setProjects(extractList(projRes.value.data));
        
        if (compRes.status === "fulfilled") {
          setComplaints(extractList(compRes.value.data));
        } else {
          try {
            const historyRes = await api.get("history/");
            setComplaints(extractList(historyRes.data));
          } catch (e) {
            console.error("History fetch error", e);
          }
        }

        let combinedFeedbacks = [];
        if (cbRes.status === "fulfilled") combinedFeedbacks = [...combinedFeedbacks, ...extractList(cbRes.value.data)];
        if (genRes.status === "fulfilled") combinedFeedbacks = [...combinedFeedbacks, ...extractList(genRes.value.data)];

        setFeedbacks(combinedFeedbacks);

      } catch (error) {
        console.error("Error fetching dynamic data from API:", error);
        setFetchError("Failed to fetch reports data from server.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const getWardName = (item) => {
    if (!item) return "";
    const rawWard = item.wardName || item.ward || item.ward_name || "";
    return formatWardName(rawWard);
  };

  const getItemDate = (item) => {
    return item.date || item.created_at || item.time || item.aiLetter?.date || "N/A";
  };

  const availableWards = useMemo(() => {
    const wardsSet = new Set(Object.values(WARD_MAP));
    const allItems = [...applications, ...projects, ...complaints, ...feedbacks];
    
    allItems.forEach((item) => {
      const w = getWardName(item);
      if (w && w.trim() && w !== "All Wards") wardsSet.add(w.trim());
    });

    return Array.from(wardsSet).sort();
  }, [applications, projects, complaints, feedbacks]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    const allItems = [...applications, ...projects, ...complaints, ...feedbacks];

    allItems.forEach((item) => {
      const parsedDate = parseDateObject(getItemDate(item));
      if (parsedDate) {
        yearsSet.add(parsedDate.getFullYear().toString());
      }
    });

    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear().toString());
    }

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [applications, projects, complaints, feedbacks]);

  const filterByWardMonthAndYear = (item) => {
    const wardVal = getWardName(item).toLowerCase().trim();
    const targetWard = (isAdmin ? selectedWard : userWardName).toLowerCase().trim();

    let matchesWard = false;
    if (isAdmin && (selectedWard === "All Wards" || !selectedWard)) {
      matchesWard = true;
    } else if (targetWard) {
      matchesWard = wardVal === targetWard || wardVal.includes(targetWard) || targetWard.includes(wardVal);
      if (!matchesWard) {
        const targetNum = parseInt(targetWard.replace(/\D/g, ""), 10);
        const itemNum = parseInt(wardVal.replace(/\D/g, ""), 10);
        if (!isNaN(targetNum) && !isNaN(itemNum)) {
          matchesWard = targetNum === itemNum;
        }
      }
    } else {
      matchesWard = true;
    }

    const parsedDate = parseDateObject(getItemDate(item));
    let matchesMonth = true;
    let matchesYear = true;

    if (selectedMonth !== "All Months") {
      if (parsedDate) {
        const itemMonthName = parsedDate.toLocaleString("default", { month: "long" });
        matchesMonth = itemMonthName.toLowerCase() === selectedMonth.toLowerCase();
      } else {
        matchesMonth = false;
      }
    }

    if (selectedYear !== "All Years") {
      if (parsedDate) {
        matchesYear = parsedDate.getFullYear().toString() === selectedYear;
      } else {
        matchesYear = false;
      }
    }

    return matchesWard && matchesMonth && matchesYear;
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const name = app.applicantName || app.applicant_name || '';
      const scheme = app.schemeName || app.scheme_name || '';
      const status = app.status || '';
      const searchTarget = `${name} ${scheme} ${status}`.toLowerCase();
      return filterByWardMonthAndYear(app) && searchTarget.includes(searchQuery.toLowerCase());
    });
  }, [applications, selectedWard, userWardName, isAdmin, selectedMonth, selectedYear, searchQuery]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const title = p.title || p.projectName || p.project_name || '';
      const desc = p.description || p.location || '';
      const ward = getWardName(p);
      const category = p.category || p.status || '';
      
      const searchTarget = `${title} ${desc} ${ward} ${category}`.toLowerCase();
      return filterByWardMonthAndYear(p) && searchTarget.includes(searchQuery.toLowerCase());
    });
  }, [projects, selectedWard, userWardName, isAdmin, selectedMonth, selectedYear, searchQuery]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const user = c.complainant_name || c.complainantName || c.user || c.applicantName || '';
      const subject = c.subject || c.title || c.action || c.decision || '';
      const category = c.category || c.schemeName || '';
      const searchTarget = `${user} ${subject} ${category}`.toLowerCase();
      return filterByWardMonthAndYear(c) && searchTarget.includes(searchQuery.toLowerCase());
    });
  }, [complaints, selectedWard, userWardName, isAdmin, selectedMonth, selectedYear, searchQuery]);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => {
      const cName = f.citizenName || f.citizen_name || f.senderName || f.sender_name || '';
      const comment = f.comment || f.message || '';
      const category = f.category || '';
      const searchTarget = `${cName} ${comment} ${category}`.toLowerCase();
      return filterByWardMonthAndYear(f) && searchTarget.includes(searchQuery.toLowerCase());
    });
  }, [feedbacks, selectedWard, userWardName, isAdmin, selectedMonth, selectedYear, searchQuery]);

  const stats = useMemo(() => {
    const total = filteredApplications.length;
    const approved = filteredApplications.filter((a) =>
      ["approved", "verified"].includes((a.status || "").toLowerCase())
    ).length;
    const pending = filteredApplications.filter((a) =>
      ["pending", "under_review", "submitted", "action_required"].includes((a.status || "").toLowerCase())
    ).length;

    const approvedPct = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { total, approved, pending, approvedPct };
  }, [filteredApplications]);

  const avgFeedbackRating = useMemo(() => {
    const ratedItems = filteredFeedbacks.filter(f => f.rating);
    if (ratedItems.length === 0) return "0.0";
    const sum = ratedItems.reduce((acc, f) => acc + (Number(f.rating) || 0), 0);
    return (sum / ratedItems.length).toFixed(1);
  }, [filteredFeedbacks]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const reportWard = isAdmin ? selectedWard : userWardName;

    doc.setFontSize(18);
    doc.setTextColor(22, 163, 74);
    doc.text("ENTE GRAMAM - CONSOLIDATED WARD REPORT", 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Ward: ${reportWard} | Month: ${selectedMonth} | Year: ${selectedYear}`, 14, 25);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 30);

    doc.setDrawColor(220);
    doc.line(14, 34, 196, 34);

    let currentY = 42;

    const renderSection = (title, headers, rows) => {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(title, 14, currentY);

      autoTable(doc, {
        startY: currentY + 4,
        head: headers,
        body: rows.length > 0 ? rows : [["No records found"]],
        theme: "grid",
        headStyles: { fillColor: [22, 163, 74] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8 }
      });

      currentY = doc.lastAutoTable.finalY + 12;
    };

    const welfareRows = filteredApplications.map((a) => [
      a.applicantName || a.applicant_name || "N/A",
      getWardName(a) || "N/A",
      a.schemeName || a.scheme_name || "N/A",
      a.schemeCategory || a.scheme_category || "Welfare",
      getItemDate(a),
      a.status || "N/A"
    ]);
    renderSection(
      "1. Welfare Schemes Applications",
      [["Applicant", "Ward", "Scheme", "Category", "Date Applied", "Status"]],
      welfareRows
    );

    const projectRows = filteredProjects.map((p) => [
      p.title || p.projectName || "N/A",
      getWardName(p) || "N/A",
      p.description || p.location || "N/A",
      p.budget || "N/A",
      p.category === "Completed" ? "100%" : `${p.progress || 0}%`,
      p.category || p.status || "N/A"
    ]);
    renderSection(
      "2. Development Projects",
      [["Project Title", "Ward", "Description", "Budget", "Progress", "Status"]],
      projectRows
    );

    const complaintRows = filteredComplaints.map((c) => [
      getItemDate(c),
      c.complainant_name || c.complainantName || c.user || "Citizen",
      getWardName(c) || "N/A",
      c.subject || c.title || c.action || "Complaint Logged",
      c.category || "General",
      c.status || "Pending"
    ]);
    renderSection(
      "3. Registered Complaints",
      [["Date", "Complainant", "Ward", "Subject / Issue", "Category", "Status"]],
      complaintRows
    );

    const feedbackRows = filteredFeedbacks.map((f) => [
      getItemDate(f),
      f.citizenName || f.citizen_name || f.senderName || f.sender_name || "N/A",
      getWardName(f) || "N/A",
      f.category || "General",
      f.rating ? `${f.rating} / 5` : "N/A",
      f.comment || f.message || "N/A",
      f.status || "N/A"
    ]);
    renderSection(
      "4. Citizen Feedbacks",
      [["Date", "Citizen Name", "Ward", "Category", "Rating", "Comments", "Status"]],
      feedbackRows
    );

    doc.save(`Ward_Report_${reportWard.replace(/\s+/g, "_")}.pdf`);
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("approved") || s.includes("completed") || s.includes("verified") || s.includes("resolved") || s.includes("action taken")) {
      return <span className="wr-badge wr-badge-green">{status}</span>;
    }
    if (s.includes("rejected") || s.includes("failed")) {
      return <span className="wr-badge wr-badge-red">{status}</span>;
    }
    if (s.includes("ongoing") || s.includes("in progress") || s.includes("under_review") || s.includes("submitted") || s.includes("acknowledged")) {
      return <span className="wr-badge wr-badge-blue">{status}</span>;
    }
    return <span className="wr-badge wr-badge-orange">{status || "Pending"}</span>;
  };

  return (
    <div className="wr-container">
      <div className="wr-header">
        <div className="wr-header-left">
          <h1>Ward Reports</h1>
          <p>{isAdmin ? "Monthly performance overview of all wards" : `Monthly performance report for ${userWardName}`}</p>
        </div>

        <div className="wr-header-right">
          <div className="wr-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search reports, projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isAdmin && (
            <div className="wr-filter-box">
              <select value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)}>
                <option value="All Wards">All Wards</option>
                {availableWards.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
              <ChevronDown size={14} className="wr-select-icon" />
            </div>
          )}

          <div className="wr-filter-box">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="All Months">All Months</option>
              {MONTH_NAMES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown size={14} className="wr-select-icon" />
          </div>

          <div className="wr-filter-box">
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              <option value="All Years">All Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={14} className="wr-select-icon" />
          </div>

          <button className="wr-export-btn" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="wr-error-banner" style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px', borderRadius: '8px', color: '#b91c1c', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{fetchError}</span>
        </div>
      )}

      <div className="wr-summary-grid-ward">
        <div className="wr-card wr-stat-card">
          <div className="wr-stat-header">
            <div className="wr-icon-box wr-icon-green"><FileText size={18} /></div>
            <span className="wr-trend wr-trend-neutral">{stats.approvedPct}% Approved</span>
          </div>
          <p className="wr-stat-title">Welfare Applications</p>
          <h3 className="wr-stat-value">{stats.total}</h3>
          <p className="wr-stat-desc">{stats.pending} Pending Review</p>
        </div>

        <div className="wr-card wr-stat-card">
          <div className="wr-stat-header">
            <div className="wr-icon-box wr-icon-gray"><Wrench size={18} /></div>
            <span className="wr-trend wr-trend-up">Active</span>
          </div>
          <p className="wr-stat-title">Development Projects</p>
          <h3 className="wr-stat-value">{filteredProjects.length}</h3>
          <p className="wr-stat-desc">Projects Listed</p>
        </div>

        <div className="wr-card wr-stat-card">
          <div className="wr-stat-header">
            <div className="wr-icon-box wr-icon-orange"><AlertCircle size={18} /></div>
          </div>
          <p className="wr-stat-title">Complaints</p>
          <h3 className="wr-stat-value">{filteredComplaints.length}</h3>
          <p className="wr-stat-desc">Registered Complaints</p>
        </div>

        <div className="wr-card wr-stat-card">
          <div className="wr-stat-header">
            <div className="wr-icon-box wr-icon-red"><MessageSquare size={18} /></div>
          </div>
          <p className="wr-stat-title">Citizen Feedback</p>
          <h3 className="wr-stat-value">{filteredFeedbacks.length}</h3>
          <p className="wr-stat-desc">Avg Rating: {avgFeedbackRating} / 5</p>
        </div>
      </div>

      <div className="wr-card wr-table-section">
        <div className="wr-tabs">
          {["Welfare Schemes", "Development Projects", "Complaints", "Feedback"].map((tab) => (
            <button
              key={tab}
              className={`wr-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="wr-table-wrapper">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Loader2 className="animate-spin" size={32} color="#16a34a" />
            </div>
          ) : (
            <table className="wr-table">
              {activeTab === "Welfare Schemes" && (
                <>
                  <thead>
                    <tr>
                      <th>APPLICANT NAME</th>
                      <th>WARD</th>
                      <th>SCHEME TYPE</th>
                      <th>CATEGORY</th>
                      <th>DATE APPLIED</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.length > 0 ? (
                      filteredApplications.map((app) => (
                        <tr key={app.id}>
                          <td className="wr-fw-600">{app.applicantName || app.applicant_name}</td>
                          <td>{getWardName(app)}</td>
                          <td>{app.schemeName || app.scheme_name}</td>
                          <td>{app.schemeCategory || app.scheme_category || "Welfare"}</td>
                          <td>{getItemDate(app)}</td>
                          <td>{getStatusBadge(app.status)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} className="wr-empty-state">No welfare records found.</td></tr>
                    )}
                  </tbody>
                </>
              )}

              {activeTab === "Development Projects" && (
                <>
                  <thead>
                    <tr>
                      <th>PROJECT TITLE</th>
                      <th>WARD</th>
                      <th>DESCRIPTION</th>
                      <th>BUDGET</th>
                      <th>PROGRESS</th>
                      <th>STATUS / CATEGORY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.length > 0 ? (
                      filteredProjects.map((p) => (
                        <tr key={p.id}>
                          <td className="wr-fw-600">{p.title || p.projectName}</td>
                          <td>{getWardName(p)}</td>
                          <td>{p.description || p.location || "N/A"}</td>
                          <td style={{ color: "#16a34a", fontWeight: 600 }}>{p.budget}</td>
                          <td>{p.category === "Completed" ? "100%" : `${p.progress || 0}%`}</td>
                          <td>{getStatusBadge(p.category || p.status)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} className="wr-empty-state">No project records found.</td></tr>
                    )}
                  </tbody>
                </>
              )}

              {activeTab === "Complaints" && (
                <>
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>COMPLAINANT</th>
                      <th>WARD</th>
                      <th>SUBJECT / ISSUE</th>
                      <th>CATEGORY</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.length > 0 ? (
                      filteredComplaints.map((comp) => (
                        <tr key={comp.id}>
                          <td>{getItemDate(comp)}</td>
                          <td className="wr-fw-600">{comp.complainant_name || comp.complainantName || comp.user || "Citizen"}</td>
                          <td>{getWardName(comp)}</td>
                          <td>{comp.subject || comp.title || comp.action || "Complaint Logged"}</td>
                          <td><span className="wr-badge wr-badge-orange">{comp.category || "General"}</span></td>
                          <td>{getStatusBadge(comp.status)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} className="wr-empty-state">No complaints found.</td></tr>
                    )}
                  </tbody>
                </>
              )}

              {activeTab === "Feedback" && (
                <>
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>CITIZEN NAME</th>
                      <th>WARD</th>
                      <th>CATEGORY</th>
                      <th>RATING</th>
                      <th>COMMENTS</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeedbacks.length > 0 ? (
                      filteredFeedbacks.map((f) => (
                        <tr key={f.id}>
                          <td>{getItemDate(f)}</td>
                          <td className="wr-fw-600">{f.citizenName || f.citizen_name || f.senderName || f.sender_name || "Anonymous"}</td>
                          <td>{getWardName(f)}</td>
                          <td>{f.category || "General"}</td>
                          <td>{f.rating ? `${f.rating} / 5` : "N/A"}</td>
                          <td>{f.comment || f.message || "N/A"}</td>
                          <td>{getStatusBadge(f.status)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={7} className="wr-empty-state">No feedback found.</td></tr>
                    )}
                  </tbody>
                </>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}