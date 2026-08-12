import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Download,
  ClipboardList,
  FileText,
  Wrench,
  Siren,
  ChevronDown,
  MoreHorizontal,
  MessageSquare,
  Star,
  Vote,
  Calendar
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./WardReports.css";

// 1. Fallback Data for Welfare Schemes
const FALLBACK_APPLICATIONS = [
  { id: "A1", applicantName: "Mohammed Kunhi", wardName: "Ward 07", schemeName: "Widow Pension", schemeCategory: "Pension", status: "approved", date: "2026-08-12" },
  { id: "A2", applicantName: "Saraswathi T.", wardName: "Ward 01", schemeName: "LIFE Mission Housing", schemeCategory: "Housing", status: "under_review", date: "2026-08-10" },
  { id: "A3", applicantName: "Ashraf Ali J.", wardName: "Ward 07", schemeName: "Agricultural Subsidy", schemeCategory: "Agriculture", status: "verified", date: "2026-08-05" },
  { id: "A4", applicantName: "Priya Rajan", wardName: "Ward 02", schemeName: "Student Scholarship", schemeCategory: "Education", status: "approved", date: "2026-08-01" },
  { id: "A5", applicantName: "Ramesh K.", wardName: "Ward 03", schemeName: "Health Insurance", schemeCategory: "Health", status: "rejected", date: "2026-08-14" },
];

// 2. Fallback Data for Development Projects (Includes Contractor & Location details)
const FALLBACK_PROJECTS = [
  { id: "P1", projectName: "Main Road Drain Concrete", wardName: "Ward 07", budget: "₹4,50,000", status: "In Progress", completion: "75%", startDate: "2026-06-10", contractor: "VK Infrastructure", location: "Vavoor Junction Road" },
  { id: "P2", projectName: "Solar Street Light Fitting", wardName: "Ward 01", budget: "₹1,20,000", status: "Completed", completion: "100%", startDate: "2026-05-15", contractor: "Kerala Electricals", location: "Temple East Street" },
  { id: "P3", projectName: "Drinking Water Pipe Maintenance", wardName: "Ward 02", budget: "₹2,80,000", status: "Approved", completion: "10%", startDate: "2026-08-01", contractor: "Jalanidhi Tech", location: "North Canal Belt" },
  { id: "P4", projectName: "Anganwadi Renovation", wardName: "Ward 03", budget: "₹3,50,000", status: "In Progress", completion: "40%", startDate: "2026-07-20", contractor: "Gramin Builders", location: "Anganwadi #4 Site" },
];

// 3. Fallback Data for Recent Activity (Includes Voting & Poll Details)
const FALLBACK_ACTIVITIES = [
  { id: "ACT1", user: "Admin", action: "Approved Widow Pension Application #A1", wardName: "Ward 07", category: "Application Update", time: "2026-08-12 10:30 AM" },
  { id: "ACT2", user: "Ward Member", action: "Submitted inspection report for Drain project", wardName: "Ward 07", category: "Project Milestone", time: "2026-08-11 04:15 PM" },
  { id: "ACT3", user: "Citizen (Abdul R.)", action: "Cast vote 'In Favor' for Ward Road Widening Poll", wardName: "Ward 07", category: "Voting / Poll", time: "2026-08-11 02:20 PM" },
  { id: "ACT4", user: "Ward Member", action: "Published new Ward Decision Poll: Drinking Water Pipe Allocation", wardName: "Ward 02", category: "Voting / Poll", time: "2026-08-10 11:00 AM" },
  { id: "ACT5", user: "Citizen", action: "Submitted new complaint regarding water supply", wardName: "Ward 02", category: "New Complaint", time: "2026-08-10 09:00 AM" },
];

// 4. Fallback Data for Citizen Feedback
const FALLBACK_FEEDBACKS = [
  { id: "F1", citizenName: "Abdul Rahman", wardName: "Ward 07", category: "Waste Management", rating: 5, comment: "Garbage collection has been very prompt this month. Great work!", date: "2026-08-14", status: "Reviewed" },
  { id: "F2", citizenName: "Saritha V.", wardName: "Ward 01", category: "Street Lighting", rating: 2, comment: "Street light near the temple corner is flickering and off for 2 days.", date: "2026-08-12", status: "Action Required" },
  { id: "F3", citizenName: "Kishore Kumar", wardName: "Ward 03", category: "Water Supply", rating: 4, comment: "Water timing has improved. Thanks for fixing the valve.", date: "2026-08-09", status: "Resolved" },
  { id: "F4", citizenName: "Moideen C.", wardName: "Ward 07", category: "Road Maintenance", rating: 5, comment: "Drainage cleaning before monsoon was handled effectively.", date: "2026-08-07", status: "Reviewed" },
];

export default function WardReports() {
  const [userRole, setUserRole] = useState("");
  const [userWardName, setUserWardName] = useState("");

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("loggedInUser") || localStorage.getItem("user");
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser);
        const role = (parsedUser.role || "citizen").toLowerCase();
        setUserRole(role);
        setUserWardName(parsedUser.wardName || parsedUser.ward || "Ward 07");
      } else {
        setUserRole("panchayat");
      }
    } catch (e) {
      setUserRole("panchayat");
    }
  }, []);

  const [selectedMonth, setSelectedMonth] = useState("August 2026");
  const [selectedWard, setSelectedWard] = useState("All Wards");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Welfare Schemes");

  useEffect(() => {
    if (userRole === "ward") {
      setSelectedWard(userWardName);
    }
  }, [userRole, userWardName]);

  // Data States
  const [applications, setApplications] = useState(FALLBACK_APPLICATIONS);
  const [projects, setProjects] = useState(FALLBACK_PROJECTS);
  const [activities, setActivities] = useState(FALLBACK_ACTIVITIES);
  const [feedbacks, setFeedbacks] = useState(FALLBACK_FEEDBACKS);

  // Fetch & normalize dynamic data from localStorage
  useEffect(() => {
    try {
      // 1. Schemes
      const storedApps = JSON.parse(localStorage.getItem("ente_gramam_scheme_applications") || "[]");
      if (storedApps.length > 0) setApplications(storedApps);

      // 2. Projects (Normalized so added projects display all properties seamlessly)
      const storedProjects = JSON.parse(localStorage.getItem("ente_gramam_projects") || "[]");
      if (storedProjects.length > 0) {
        const normalizedProjects = storedProjects.map((p, idx) => ({
          id: p.id || `P_LOCAL_${idx}`,
          projectName: p.projectName || p.name || p.title || "Development Work",
          wardName: p.wardName || p.ward || "Ward 07",
          budget: p.budget || p.cost || p.amount || "₹0",
          status: p.status || "In Progress",
          completion: p.completion || (p.progress ? `${p.progress}%` : "0%"),
          startDate: p.startDate || p.date || p.createdDate || "2026-08-01",
          contractor: p.contractor || p.agency || "Gram Panchayat Dept",
          location: p.location || p.site || "Ward Region"
        }));
        setProjects(normalizedProjects);
      }

      // 3. Feedbacks (Normalized to display all citizen feedback submissions)
      const storedFeedbacks = JSON.parse(localStorage.getItem("ente_gramam_feedbacks") || localStorage.getItem("ente_gramam_feedback") || "[]");
      if (storedFeedbacks.length > 0) {
        const normalizedFeedbacks = storedFeedbacks.map((f, idx) => ({
          id: f.id || `F_LOCAL_${idx}`,
          citizenName: f.citizenName || f.userName || f.name || "Citizen User",
          wardName: f.wardName || f.ward || "Ward 07",
          category: f.category || f.type || "General Feedback",
          rating: f.rating || 5,
          comment: f.comment || f.message || f.feedback || f.details || "No comments provided.",
          date: f.date || f.createdAt || "2026-08-10",
          status: f.status || "Reviewed"
        }));
        setFeedbacks(normalizedFeedbacks);
      }

      // 4. Activities + Dynamic Voting Details
      const storedActivities = JSON.parse(localStorage.getItem("ente_gramam_activities") || "[]");
      const storedVotes = JSON.parse(localStorage.getItem("ente_gramam_votes") || localStorage.getItem("ente_gramam_polls") || "[]");
      
      let mergedActivities = storedActivities.length > 0 ? [...storedActivities] : [...FALLBACK_ACTIVITIES];

      // Merge dynamic votes into activities list if available
      if (storedVotes.length > 0) {
        const voteLogs = storedVotes.map((v, idx) => ({
          id: v.id || `VOTE_${idx}`,
          user: v.voterName || v.user || "Citizen Voter",
          action: v.action || `Cast vote '${v.choice || "In Favor"}' on ${v.pollTitle || "Ward Poll"}`,
          wardName: v.wardName || v.ward || "Ward 07",
          category: "Voting / Poll",
          time: v.time || v.date || "2026-08-12 12:00 PM"
        }));
        mergedActivities = [...voteLogs, ...mergedActivities];
      }

      setActivities(mergedActivities);
    } catch (e) {
      console.error("Error fetching Ward Reports data:", e);
    }
  }, []);

  // Filters based on Ward selection & Search Query
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const w = app.wardName || app.ward || "";
      const matchesWard = selectedWard === "All Wards" || w.toLowerCase() === selectedWard.toLowerCase();
      const matchesSearch = `${app.applicantName} ${app.schemeName} ${app.status}`.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesWard && matchesSearch;
    });
  }, [applications, selectedWard, searchQuery]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const w = p.wardName || p.ward || "";
      const matchesWard = selectedWard === "All Wards" || w.toLowerCase() === selectedWard.toLowerCase();
      const matchesSearch = `${p.projectName} ${p.contractor} ${p.location} ${p.status}`.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesWard && matchesSearch;
    });
  }, [projects, selectedWard, searchQuery]);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const w = act.wardName || act.ward || "";
      const matchesWard = selectedWard === "All Wards" || w.toLowerCase() === selectedWard.toLowerCase();
      const matchesSearch = `${act.user} ${act.action} ${act.category}`.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesWard && matchesSearch;
    });
  }, [activities, selectedWard, searchQuery]);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => {
      const w = f.wardName || f.ward || "";
      const matchesWard = selectedWard === "All Wards" || w.toLowerCase() === selectedWard.toLowerCase();
      const matchesSearch = `${f.citizenName} ${f.comment} ${f.category}`.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesWard && matchesSearch;
    });
  }, [feedbacks, selectedWard, searchQuery]);

  const stats = useMemo(() => {
    const total = filteredApplications.length;
    const approved = filteredApplications.filter(a => a.status === "approved" || a.status === "verified").length;
    const pending = filteredApplications.filter(a => a.status === "pending" || a.status === "under_review").length;
    const rejected = filteredApplications.filter(a => a.status === "rejected").length;

    return { total, approved, pending, rejected };
  }, [filteredApplications]);

  const isAdmin = userRole === "panchayat";

  // Export PDF depending on active tab with full details
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const reportWard = isAdmin ? selectedWard : userWardName;

    doc.setFontSize(18);
    doc.setTextColor(22, 163, 74);
    doc.text("ENTE GRAMAM - WARD REPORT", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Tab: ${activeTab} | Ward: ${reportWard} | Month: ${selectedMonth}`, 14, 28);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 34);

    doc.setDrawColor(220);
    doc.line(14, 38, 196, 38);

    let headers = [];
    let rows = [];

    if (activeTab === "Welfare Schemes") {
      headers = isAdmin ? [["Applicant", "Ward", "Scheme", "Date", "Status"]] : [["Applicant", "Scheme", "Date", "Status"]];
      rows = filteredApplications.map(a => isAdmin ? [a.applicantName, a.wardName || a.ward, a.schemeName, a.date, a.status] : [a.applicantName, a.schemeName, a.date, a.status]);
    } else if (activeTab === "Development Projects") {
      headers = [["Project Name", "Ward", "Location", "Contractor", "Budget", "Completion", "Status"]];
      rows = filteredProjects.map(p => [p.projectName, p.wardName, p.location || "N/A", p.contractor || "N/A", p.budget, p.completion, p.status]);
    } else if (activeTab === "Recent Activity") {
      headers = [["Time", "Performed By", "Ward", "Category", "Action / Voting Log"]];
      rows = filteredActivities.map(act => [act.time, act.user, act.wardName, act.category, act.action]);
    } else if (activeTab === "Feedback") {
      headers = [["Date", "Citizen", "Ward", "Category", "Rating", "Comments", "Status"]];
      rows = filteredFeedbacks.map(f => [f.date, f.citizenName, f.wardName, f.category, `${f.rating}/5 Stars`, f.comment, f.status]);
    }

    autoTable(doc, {
      startY: 44,
      head: headers,
      body: rows.length > 0 ? rows : [["No records found"]],
      theme: "grid",
      headStyles: { fillColor: [22, 163, 74] },
      margin: { left: 14, right: 14 },
    });

    doc.save(`${activeTab.replace(/\s+/g, "_")}_Report.pdf`);
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("approved") || s.includes("completed") || s.includes("verified") || s.includes("resolved") || s.includes("reviewed")) return <span className="wr-badge wr-badge-green">{status}</span>;
    if (s.includes("rejected") || s.includes("action required")) return <span className="wr-badge wr-badge-red">{status}</span>;
    if (s.includes("in progress") || s.includes("review")) return <span className="wr-badge wr-badge-blue">{status}</span>;
    return <span className="wr-badge wr-badge-orange">{status}</span>;
  };

  if (userRole !== "ward" && userRole !== "panchayat") {
    return <div className="wr-container">Access Denied. You must be a Ward Member or Panchayat Admin.</div>;
  }

  return (
    <div className="wr-container">
      {/* Header Section */}
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
              placeholder="Search reports, projects, votes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {isAdmin && (
            <div className="wr-filter-box">
              <select value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)}>
                <option value="All Wards">All Wards</option>
                <option value="Ward 01">Ward 01</option>
                <option value="Ward 02">Ward 02</option>
                <option value="Ward 03">Ward 03</option>
                <option value="Ward 04">Ward 04</option>
                <option value="Ward 05">Ward 05</option>
                <option value="Ward 06">Ward 06</option>
                <option value="Ward 07">Ward 07</option>
              </select>
              <ChevronDown size={14} className="wr-select-icon" />
            </div>
          )}

          <div className="wr-filter-box">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="August 2026">August 2026</option>
              <option value="September 2026">September 2026</option>
              <option value="October 2026">October 2026</option>
            </select>
            <ChevronDown size={14} className="wr-select-icon" />
          </div>

          <button className="wr-export-btn" onClick={handleExportPDF}>
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* TOP SUMMARY CARDS */}
      {!isAdmin ? (
        <div className="wr-summary-grid-ward">
          <div className="wr-card wr-stat-card">
            <div className="wr-stat-header">
              <div className="wr-icon-box wr-icon-green"><ClipboardList size={18} /></div>
              <span className="wr-trend wr-trend-up">+12%</span>
            </div>
            <p className="wr-stat-title">Total Complaints</p>
            <h3 className="wr-stat-value">148</h3>
            <p className="wr-stat-desc">120 Resolved this month</p>
          </div>
          
          <div className="wr-card wr-stat-card">
            <div className="wr-stat-header">
              <div className="wr-icon-box wr-icon-green"><FileText size={18} /></div>
              <span className="wr-trend wr-trend-neutral">30/04</span>
            </div>
            <p className="wr-stat-title">Welfare Applications</p>
            <h3 className="wr-stat-value">{stats.total > 0 ? stats.total : 342}</h3>
            <p className="wr-stat-desc">{stats.pending > 0 ? stats.pending : 28} Pending Review</p>
          </div>

          <div className="wr-card wr-stat-card">
            <div className="wr-stat-header">
              <div className="wr-icon-box wr-icon-gray"><Wrench size={18} /></div>
              <span className="wr-trend wr-trend-up">Active</span>
            </div>
            <p className="wr-stat-title">Development Projects</p>
            <h3 className="wr-stat-value">{filteredProjects.length}</h3>
            <p className="wr-stat-desc">All project details synced</p>
          </div>

          <div className="wr-card wr-stat-card">
            <div className="wr-stat-header">
              <div className="wr-icon-box wr-icon-red"><MessageSquare size={18} /></div>
              <span className="wr-trend wr-trend-up">New</span>
            </div>
            <p className="wr-stat-title">Citizen Feedback</p>
            <h3 className="wr-stat-value">{filteredFeedbacks.length}</h3>
            <p className="wr-stat-desc">Avg Rating: 4.2 / 5</p>
          </div>
        </div>
      ) : (
        <div className="wr-summary-grid-admin">
          <div className="wr-card wr-admin-overview-card">
            <div className="wr-admin-card-head">
              <h3>Application Overview</h3>
              <div className="wr-icon-box wr-icon-green"><FileText size={18} /></div>
            </div>
            <div className="wr-admin-stats-row">
              <div className="wr-admin-stat-item">
                <p>Total</p>
                <h2 style={{ color: '#16a34a' }}>1,248</h2>
                <span className="wr-trend wr-trend-up">+12%</span>
              </div>
              <div className="wr-admin-stat-item">
                <p>Approved</p>
                <h2 style={{ color: '#16a34a' }}>892</h2>
                <div className="wr-progress-bar"><div className="wr-progress-fill bg-green" style={{ width: '70%' }}></div></div>
              </div>
              <div className="wr-admin-stat-item">
                <p>Pending</p>
                <h2 style={{ color: '#d97706' }}>234</h2>
                <div className="wr-progress-bar"><div className="wr-progress-fill bg-orange" style={{ width: '20%' }}></div></div>
              </div>
              <div className="wr-admin-stat-item">
                <p>Rejected</p>
                <h2 style={{ color: '#dc2626' }}>122</h2>
                <div className="wr-progress-bar"><div className="wr-progress-fill bg-red" style={{ width: '10%' }}></div></div>
              </div>
            </div>
          </div>

          <div className="wr-card wr-admin-complaints-card">
            <div className="wr-admin-card-head">
              <h3>Complaints Tracker</h3>
              <div className="wr-icon-box wr-icon-red"><Siren size={18} /></div>
            </div>
            <div className="wr-admin-stats-row wr-complaint-stats">
              <div className="wr-admin-stat-item">
                <p>Total Complaints</p>
                <h2>456</h2>
              </div>
              <div className="wr-admin-stat-item">
                <p>Resolved</p>
                <h2 style={{ color: '#16a34a' }}>380 <span style={{ fontSize: '14px', color: '#9ca3af' }}>/ 456</span></h2>
                <span className="wr-resolution-rate">83% Resolution Rate</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC TABLE SECTION WITH TABS */}
      <div className="wr-card wr-table-section">
        <div className="wr-tabs">
          {["Welfare Schemes", "Development Projects", "Recent Activity", "Feedback"].map(tab => (
            <button 
              key={tab} 
              className={`wr-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
          <div className="wr-tab-spacer"></div>
          <button className="wr-export-text" onClick={handleExportPDF}>
            <Download size={14}/> Export
          </button>
        </div>

        <div className="wr-table-wrapper">
          <table className="wr-table">
            {/* 1. Welfare Schemes Table */}
            {activeTab === "Welfare Schemes" && (
              <>
                <thead>
                  <tr>
                    <th>APPLICANT NAME</th>
                    {isAdmin && <th>WARD</th>}
                    <th>SCHEME TYPE</th>
                    <th>DATE APPLIED</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.length > 0 ? filteredApplications.map(app => (
                    <tr key={app.id}>
                      <td>
                        <div className="wr-table-user">
                          <div className="wr-avatar bg-green-light">{app.applicantName.substring(0, 2).toUpperCase()}</div>
                          <span className="wr-fw-600">{app.applicantName}</span>
                        </div>
                      </td>
                      {isAdmin && <td>{app.wardName || app.ward}</td>}
                      <td>{app.schemeName}</td>
                      <td>{app.date}</td>
                      <td>{getStatusBadge(app.status)}</td>
                      <td><button className="wr-action-btn"><MoreHorizontal size={18}/></button></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="wr-empty-state">No schemes data found.</td></tr>
                  )}
                </tbody>
              </>
            )}

            {/* 2. Development Projects Table (ALL DETAILS VISIBLE) */}
            {activeTab === "Development Projects" && (
              <>
                <thead>
                  <tr>
                    <th>PROJECT NAME</th>
                    <th>WARD</th>
                    <th>LOCATION</th>
                    <th>CONTRACTOR</th>
                    <th>BUDGET</th>
                    <th>PROGRESS</th>
                    <th>START DATE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.length > 0 ? filteredProjects.map(proj => (
                    <tr key={proj.id}>
                      <td className="wr-fw-600">{proj.projectName}</td>
                      <td>{proj.wardName}</td>
                      <td>{proj.location || "N/A"}</td>
                      <td>{proj.contractor || "N/A"}</td>
                      <td style={{ fontWeight: 600, color: "#16a34a" }}>{proj.budget}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>{proj.completion}</span>
                        </div>
                      </td>
                      <td>{proj.startDate}</td>
                      <td>{getStatusBadge(proj.status)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={8} className="wr-empty-state">No project records found.</td></tr>
                  )}
                </tbody>
              </>
            )}

            {/* 3. Recent Activity Table (INCLUDES VOTING & POLL DETAILS) */}
            {activeTab === "Recent Activity" && (
              <>
                <thead>
                  <tr>
                    <th>TIME / DATE</th>
                    <th>PERFORMED BY</th>
                    <th>WARD</th>
                    <th>ACTION / VOTING LOG</th>
                    <th>CATEGORY</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivities.length > 0 ? filteredActivities.map(act => (
                    <tr key={act.id}>
                      <td style={{ fontSize: "13px", color: "#6b7280" }}>{act.time}</td>
                      <td className="wr-fw-600">{act.user}</td>
                      <td>{act.wardName}</td>
                      <td>
                        {act.category === "Voting / Poll" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Vote size={15} color="#2563eb" />
                            <span>{act.action}</span>
                          </div>
                        ) : (
                          act.action
                        )}
                      </td>
                      <td>
                        <span className={`wr-badge ${act.category === "Voting / Poll" ? "wr-badge-blue" : "wr-badge-orange"}`}>
                          {act.category}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="wr-empty-state">No activity logged.</td></tr>
                  )}
                </tbody>
              </>
            )}

            {/* 4. Feedback Table (SHOWS ALL FEEDBACK WITH DATES & COMMENTS) */}
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
                  {filteredFeedbacks.length > 0 ? filteredFeedbacks.map(fb => (
                    <tr key={fb.id}>
                      <td style={{ fontSize: "13px", color: "#6b7280", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Calendar size={13} />
                          <span>{fb.date}</span>
                        </div>
                      </td>
                      <td className="wr-fw-600">{fb.citizenName}</td>
                      <td>{fb.wardName}</td>
                      <td>{fb.category}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Star size={14} fill="#f59e0b" color="#f59e0b" />
                          <span style={{ fontWeight: "600" }}>{fb.rating}/5</span>
                        </div>
                      </td>
                      <td style={{ maxWidth: "280px", whiteSpace: "normal", fontSize: "13px", lineHeight: "1.4" }}>
                        {fb.comment}
                      </td>
                      <td>{getStatusBadge(fb.status)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} className="wr-empty-state">No feedback submissions found.</td></tr>
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}