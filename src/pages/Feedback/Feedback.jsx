import React, { useState, useEffect } from "react";
import api from "../../axiosInstance";
import "./Feedback.css";

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

const getWardName = (wardKey) => {
    if (!wardKey) return "";
    const keyLower = wardKey.trim().toLowerCase();
    if (keyLower === "all wards") return "All Wards";
    return WARD_MAP[keyLower] || wardKey;
};

export default function FeedbackPage() {
    const [userRole, setUserRole] = useState("citizen");
    const [userName, setUserName] = useState("Anonymous Citizen");
    const [userWard, setUserWard] = useState("ward-1");
    
    const [wardList, setWardList] = useState(Object.keys(WARD_MAP));

    const [polls, setPolls] = useState([]);
    const [projectFeedbacks, setProjectFeedbacks] = useState([]);
    const [allFeedbacks, setAllFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [replyTextMap, setReplyTextMap] = useState({});

    const [alertPopup, setAlertPopup] = useState({ show: false, title: "", message: "", type: "success" });
    const [confirmPopup, setConfirmPopup] = useState({ show: false, title: "", message: "", onConfirm: null });

    const [generalCategory, setGeneralCategory] = useState("General Suggestion");
    const [generalMessage, setGeneralMessage] = useState("");

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [ratingScore, setRatingScore] = useState(5);
    const [reviewText, setReviewText] = useState("");

    const [showPollModal, setShowPollModal] = useState(false);
    const [editingPollId, setEditingPollId] = useState(null);
    const [pollTitle, setPollTitle] = useState("");
    const [pollDesc, setPollDesc] = useState("");
    const [pollWard, setPollWard] = useState("All Wards");
    const [pollEndDate, setPollEndDate] = useState("");
    const [selectedPollFile, setSelectedPollFile] = useState(null);
    const [pollImagePreview, setPollImagePreview] = useState("");

    const [showProjModal, setShowProjModal] = useState(false);
    const [editingProjId, setEditingProjId] = useState(null);
    const [projTitle, setProjTitle] = useState("");
    const [projDesc, setProjDesc] = useState("");
    const [projWard, setProjWard] = useState(Object.keys(WARD_MAP)[0]);
    const [projImpact, setProjImpact] = useState("");

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
        const name = loggedInUser.name || loggedInUser.fullName || localStorage.getItem("userName") || "Anonymous Citizen";
        const ward = loggedInUser.ward || loggedInUser.wardName || localStorage.getItem("userWard") || "ward-1";
        
        setUserRole(role);
        setUserName(name);
        setUserWard(ward);

        fetchWards();
        fetchAllData();
    }, []);

    const fetchWards = async () => {
        try {
            const res = await api.get("wards/");
            const data = res.data;
            const fetchedWards = Array.isArray(data) ? data.map(w => w.key || w.name || w) : data.results || [];
            if (fetchedWards.length > 0) {
                setWardList(fetchedWards);
            }
        } catch (error) {
            setWardList(Object.keys(WARD_MAP));
        }
    };

    const triggerAlert = (title, message, type = "success") => {
        setAlertPopup({ show: true, title, message, type });
    };

    const triggerConfirm = (title, message, onConfirmAction) => {
        setConfirmPopup({
            show: true,
            title,
            message,
            onConfirm: () => {
                onConfirmAction();
                setConfirmPopup({ show: false, title: "", message: "", onConfirm: null });
            }
        });
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [pollsRes, projRes, genRes] = await Promise.all([
                api.get("polls/"),
                api.get("project-feedbacks/"),
                api.get("general-feedbacks/")
            ]);

            setPolls(Array.isArray(pollsRes.data) ? pollsRes.data : pollsRes.data.results || []);
            setProjectFeedbacks(Array.isArray(projRes.data) ? projRes.data : projRes.data.results || []);
            setAllFeedbacks(Array.isArray(genRes.data) ? genRes.data : genRes.data.results || []);
        } catch (error) {
            console.error("Error fetching feedback data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleVoteNow = async (pollId) => {
        try {
            await api.post(`polls/${pollId}/vote/`, { userName });
            triggerAlert("Vote Recorded!", "Thank you for voting. Your vote has been recorded successfully.", "success");
            fetchAllData();
        } catch (error) {
            const errorMsg = error.response?.data?.error || "You have already voted for this poll.";
            triggerAlert("Already Voted", errorMsg, "warning");
        }
    };

    const handleGeneralSubmit = async (e) => {
        e.preventDefault();
        if (!generalMessage.trim()) return;

        try {
            await api.post("general-feedbacks/", {
                category: generalCategory,
                message: generalMessage,
                senderName: userName,
                ward: userWard
            });
            triggerAlert("Feedback Sent", "Your feedback has been submitted successfully to the Panchayat!", "success");
            setGeneralMessage("");
            fetchAllData();
        } catch (error) {
            triggerAlert("Error", "Failed to submit feedback.", "error");
        }
    };

    const handleOpenReviewModal = (proj) => {
        if (proj.reviewedUsers?.includes(userName)) {
            triggerAlert("Already Reviewed", "You have already submitted a review and rating for this project.", "warning");
            return;
        }
        setSelectedProject(proj);
        setShowReviewModal(true);
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProject) return;

        try {
            await api.post(`project-feedbacks/${selectedProject.id}/review/`, {
                userName,
                ward: userWard,
                ratingScore,
                reviewText
            });

            triggerAlert("Review Submitted", `Review submitted successfully for ${selectedProject.title}!`, "success");
            setShowReviewModal(false);
            setReviewText("");
            fetchAllData();
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Failed to submit review.";
            triggerAlert("Review Error", errorMsg, "error");
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await api.patch(`general-feedbacks/${id}/reply/`, { status: newStatus });
            fetchAllData();
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleSendReply = async (id) => {
        const text = replyTextMap[id];
        if (!text || !text.trim()) return;

        try {
            await api.patch(`general-feedbacks/${id}/reply/`, { reply: text });
            triggerAlert("Reply Sent", "Acknowledgement reply sent to citizen successfully!", "success");
            setReplyTextMap({ ...replyTextMap, [id]: "" });
            fetchAllData();
        } catch (error) {
            console.error("Error sending reply:", error);
        }
    };

    const handleOpenAddPoll = () => {
        setEditingPollId(null);
        setPollTitle("");
        setPollDesc("");
        setPollWard("All Wards");
        setPollEndDate("");
        setSelectedPollFile(null);
        setPollImagePreview("");
        setShowPollModal(true);
    };

    const handleOpenEditPoll = (poll) => {
        setEditingPollId(poll.id);
        setPollTitle(poll.title);
        setPollDesc(poll.description);
        setPollWard(poll.ward || "All Wards");
        setPollEndDate(poll.endDate || "");
        setPollImagePreview(poll.image || "");
        setSelectedPollFile(null);
        setShowPollModal(true);
    };

    const handlePollImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedPollFile(file);
            setPollImagePreview(URL.createObjectURL(file));
        }
    };

    const handlePollSubmit = async (e) => {
        e.preventDefault();
        if (!pollTitle) return;

        const formData = new FormData();
        formData.append("title", pollTitle);
        formData.append("description", pollDesc);
        formData.append("ward", pollWard);
        if (pollEndDate) formData.append("endDate", pollEndDate);
        if (selectedPollFile) formData.append("image", selectedPollFile);

        try {
            const url = editingPollId ? `polls/${editingPollId}/` : "polls/";
            const headers = { "Content-Type": "multipart/form-data" };

            if (editingPollId) {
                await api.put(url, formData, { headers });
            } else {
                await api.post(url, formData, { headers });
            }

            triggerAlert("Success", editingPollId ? "Poll updated successfully!" : "New poll published successfully!", "success");
            setShowPollModal(false);
            fetchAllData();
        } catch (error) {
            triggerAlert("Error", "Failed to save poll.", "error");
        }
    };

    const handleDeletePoll = (id) => {
        triggerConfirm(
            "Delete Poll?",
            "Are you sure you want to delete this community poll? This action cannot be undone.",
            async () => {
                try {
                    await api.delete(`polls/${id}/`);
                    triggerAlert("Deleted", "Poll deleted successfully.", "success");
                    fetchAllData();
                } catch (error) {
                    console.error("Error deleting poll:", error);
                }
            }
        );
    };

    const handleOpenAddProj = () => {
        setEditingProjId(null);
        setProjTitle("");
        setProjDesc("");
        setProjWard(wardList[0] || "ward-1");
        setProjImpact("");
        setShowProjModal(true);
    };

    const handleOpenEditProj = (proj) => {
        setEditingProjId(proj.id);
        setProjTitle(proj.title);
        setProjDesc(proj.description);
        setProjWard(proj.ward);
        setProjImpact(proj.impactSummary);
        setShowProjModal(true);
    };

    const handleProjSubmit = async (e) => {
        e.preventDefault();
        if (!projTitle) return;

        const payload = {
            title: projTitle,
            description: projDesc,
            ward: projWard,
            status: "Completed",
            impactSummary: projImpact || "Successfully completed for public welfare."
        };

        try {
            const url = editingProjId ? `project-feedbacks/${editingProjId}/` : "project-feedbacks/";
            
            if (editingProjId) {
                await api.put(url, payload);
            } else {
                await api.post(url, payload);
            }

            triggerAlert("Success", editingProjId ? "Project feedback updated successfully!" : "Project feedback added successfully!", "success");
            setShowProjModal(false);
            fetchAllData();
        } catch (error) {
            console.error("Error saving project feedback:", error);
        }
    };

    const handleDeleteProj = (id) => {
        triggerConfirm(
            "Delete Project Feedback?",
            "Are you sure you want to delete this project feedback entry?",
            async () => {
                try {
                    await api.delete(`project-feedbacks/${id}/`);
                    triggerAlert("Deleted", "Project feedback deleted successfully.", "success");
                    fetchAllData();
                } catch (error) {
                    console.error("Error deleting project feedback:", error);
                }
            }
        );
    };

    const isPrivileged = userRole.includes("panchayat") || userRole.includes("admin");
    const isWardMember = userRole.includes("ward");

    const filteredPolls = isPrivileged 
        ? polls 
        : polls.filter(p => 
            p.ward?.trim().toLowerCase() === "all wards" || 
            p.ward?.trim().toLowerCase() === userWard?.trim().toLowerCase() ||
            getWardName(p.ward).toLowerCase() === getWardName(userWard).toLowerCase()
          );

    const filteredProjectFeedbacks = isPrivileged 
        ? projectFeedbacks 
        : projectFeedbacks.filter(proj => 
            proj.ward?.trim().toLowerCase() === userWard?.trim().toLowerCase() ||
            getWardName(proj.ward).toLowerCase() === getWardName(userWard).toLowerCase()
          );

    return (
        <div className="feedback-wrapper">
            <div className="feedback-top-header">
                <div>
                    <h2>Citizen Feedback Hub</h2>
                    <p>Participate in community decisions, review completed projects for <strong>{getWardName(userWard)}</strong>, and share your suggestions.</p>
                </div>
                {isPrivileged && (
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button className="btn-add-poll" onClick={handleOpenAddPoll}>
                            + Create New Poll
                        </button>
                        <button className="btn-add-poll" onClick={handleOpenAddProj} style={{ background: "#059669" }}>
                            + Add Project Feedback
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading feedback hub data...</div>
            ) : (
                <>
                    <div className="section-block">
                        <div className="section-title-row">
                            <h3>Upcoming Polls</h3>
                            <span className="section-subtitle">Vote on proposed initiatives for our village.</span>
                        </div>

                        <div className="polls-grid">
                            {filteredPolls.length === 0 ? (
                                <p style={{ color: "#64748b", gridColumn: "1/-1" }}>No active polls available for {getWardName(userWard)}.</p>
                            ) : (
                                filteredPolls.map((poll) => {
                                    const hasVoted = poll.votedUsers?.includes(userName);
                                    return (
                                        <div key={poll.id} className="poll-card">
                                            <div className="poll-img-container">
                                                {poll.image ? (
                                                    <img src={poll.image} alt={poll.title} />
                                                ) : (
                                                    <div style={{ background: "#e2e8f0", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                        <span style={{ color: "#64748b", fontSize: "12px" }}>No Image</span>
                                                    </div>
                                                )}
                                                <div className="poll-badges-row">
                                                    <span className="badge-active-poll">📍 {getWardName(poll.ward)}</span>
                                                    {poll.endDate && (
                                                        <span className="poll-ends-text">📅 Ends: {poll.endDate}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="poll-card-body">
                                                <div>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                        <h4>{poll.title}</h4>
                                                        {isPrivileged && (
                                                            <div className="admin-action-btns">
                                                                <button onClick={() => handleOpenEditPoll(poll)} title="Edit">✏️</button>
                                                                <button onClick={() => handleDeletePoll(poll.id)} title="Delete">🗑️</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p>{poll.description}</p>
                                                </div>
                                                <div>
                                                    <div className="poll-support-info">
                                                        <span>Total Votes</span>
                                                        <span className="support-val">{poll.supportCount} Votes</span>
                                                    </div>
                                                    <div className="progress-bar-bg">
                                                        <div className="progress-bar-fill" style={{ width: `${Math.min(poll.supportCount * 10, 100)}%` }}></div>
                                                    </div>
                                                    {(!isPrivileged && !isWardMember) && (
                                                        <button 
                                                            className="btn-vote-now" 
                                                            onClick={() => handleVoteNow(poll.id)}
                                                            disabled={hasVoted}
                                                            style={hasVoted ? { background: "#e2e8f0", color: "#64748b", cursor: "not-allowed" } : {}}
                                                        >
                                                            {hasVoted ? "✅ Already Voted" : "🗳️ Vote Now"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="section-block">
                        <div className="section-title-row">
                            <h3>Project Feedback ({isPrivileged ? "All Wards" : getWardName(userWard)})</h3>
                            <span className="section-subtitle">
                                {isPrivileged ? "Review completed projects across all panchayat wards." : `Review completed projects specifically for ${getWardName(userWard)}.`}
                            </span>
                        </div>

                        {filteredProjectFeedbacks.length === 0 ? (
                            <div style={{ background: "#fff", padding: "24px", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                                <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>No project feedback available for {getWardName(userWard)} at the moment.</p>
                            </div>
                        ) : (
                            <div className="project-feedbacks-grid">
                                {filteredProjectFeedbacks.map((proj) => {
                                    const hasReviewed = proj.reviewedUsers?.includes(userName);
                                    return (
                                        <div key={proj.id} className="proj-fb-card">
                                            <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                                    <div className="proj-fb-top-badges" style={{ margin: 0 }}>
                                                        <span className="badge-completed">✅ {proj.status}</span>
                                                        <span className="badge-ward">📍 {getWardName(proj.ward)}</span>
                                                    </div>
                                                    {isPrivileged && (
                                                        <div className="admin-action-btns">
                                                            <button onClick={() => handleOpenEditProj(proj)} title="Edit">✏️</button>
                                                            <button onClick={() => handleDeleteProj(proj.id)} title="Delete">🗑️</button>
                                                        </div>
                                                    )}
                                                </div>
                                                <h4>{proj.title}</h4>
                                                <p className="proj-desc-short">{proj.description}</p>
                                                
                                                <div className="impact-summary-box">
                                                    <div className="impact-title-green">Impact Summary</div>
                                                    <p>{proj.impactSummary}</p>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="rating-row">
                                                    <span className="rating-label">Public Rating</span>
                                                    <span className="rating-score-txt">{proj.rating}/5 ({proj.reviewsCount} reviews)</span>
                                                </div>
                                                <div className="progress-bar-bg">
                                                    <div className="progress-bar-fill rating-fill" style={{ width: `${(proj.rating / 5) * 100}%` }}></div>
                                                </div>

                                                {(!isPrivileged && !isWardMember) && (
                                                    <button 
                                                        className="btn-submit-feedback-card" 
                                                        onClick={() => handleOpenReviewModal(proj)}
                                                        disabled={hasReviewed}
                                                        style={hasReviewed ? { background: "#e2e8f0", color: "#64748b", borderColor: "#cbd5e1", cursor: "not-allowed" } : {}}
                                                    >
                                                        {hasReviewed ? "✅ Already Reviewed" : "💬 Submit Feedback & Rating"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {isPrivileged ? (
                        <div className="section-block general-fb-section">
                            <div className="section-title-row">
                                <h3>📥 Citizen Feedback Inbox (Panchayat / Ward View)</h3>
                                <span className="section-subtitle">Review and send Acknowledgements/Responses to citizens.</span>
                            </div>

                            <div className="general-form-card" style={{ maxWidth: "100%" }}>
                                {allFeedbacks.length === 0 ? (
                                    <p style={{ color: "#666", fontSize: "14px" }}>No feedback messages received yet.</p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                        {allFeedbacks.map((item) => (
                                            <div key={item.id} style={{ background: "#f8fafc", border: "1px solid #cbd5e1", padding: "14px", borderRadius: "8px" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#555", marginBottom: "6px" }}>
                                                    <strong>Category: {item.category}</strong>
                                                    <span>Date: {item.date}</span>
                                                </div>
                                                
                                                <p style={{ fontSize: "14px", color: "#1e293b", margin: "6px 0", fontWeight: "500" }}>{item.message}</p>
                                                
                                                <div style={{ display: "flex", gap: "8px", alignItems: "center", margin: "8px 0", flexWrap: "wrap" }}>
                                                    <span style={{ fontSize: "11px", background: "#e0f2fe", color: "#0369a1", padding: "3px 8px", borderRadius: "4px" }}>
                                                        Submitted by: <strong>{item.senderName || "Anonymous Citizen"}</strong> ({getWardName(item.ward)})
                                                    </span>
                                                    <span style={{ 
                                                        fontSize: "11px", 
                                                        padding: "3px 8px", 
                                                        borderRadius: "4px",
                                                        fontWeight: "bold",
                                                        background: item.status === "Action Taken" ? "#dcfce7" : item.status === "Acknowledged" ? "#fef9c3" : "#fee2e2",
                                                        color: item.status === "Action Taken" ? "#15803d" : item.status === "Acknowledged" ? "#a16207" : "#b91c1c"
                                                    }}>
                                                        Status: {item.status || "Pending"}
                                                    </span>
                                                </div>

                                                {item.reply && (
                                                    <div style={{ background: "#f1f5f9", padding: "8px 12px", borderRadius: "6px", borderLeft: "3px solid #0284c7", marginTop: "8px" }}>
                                                        <small style={{ color: "#0284c7", fontWeight: "bold" }}>Panchayat Reply:</small>
                                                        <p style={{ fontSize: "12px", color: "#334155", margin: "2px 0" }}>{item.reply}</p>
                                                    </div>
                                                )}

                                                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #cbd5e1" }}>
                                                    <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                                                        <label style={{ fontSize: "12px", fontWeight: "bold" }}>Update Status:</label>
                                                        <select 
                                                            value={item.status || "Pending"} 
                                                            onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                                                            style={{ padding: "4px 8px", fontSize: "12px", borderRadius: "4px" }}
                                                        >
                                                            <option value="Pending">Pending</option>
                                                            <option value="Acknowledged">Acknowledged</option>
                                                            <option value="Action Taken">Action Taken</option>
                                                        </select>
                                                    </div>

                                                    <div style={{ display: "flex", gap: "8px" }}>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Write acknowledgement / response to citizen..." 
                                                            value={replyTextMap[item.id] || ""}
                                                            onChange={(e) => setReplyTextMap({ ...replyTextMap, [item.id]: e.target.value })}
                                                            style={{ flex: 1, padding: "6px 10px", fontSize: "12px", borderRadius: "4px", border: "1px solid #ccc" }}
                                                        />
                                                        <button 
                                                            onClick={() => handleSendReply(item.id)}
                                                            style={{ background: "#0284c7", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}
                                                        >
                                                            Send Reply
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="section-block general-fb-section">
                            <div className="section-title-row">
                                <h3>General Feedback</h3>
                                <span className="section-subtitle">Have a general suggestion or comment? Submit here and track Panchayat updates for {getWardName(userWard)}.</span>
                            </div>

                            {!isWardMember && (
                                <div className="general-form-card">
                                    <form onSubmit={handleGeneralSubmit}>
                                        <div className="form-group">
                                            <label>Feedback Category</label>
                                            <select value={generalCategory} onChange={(e) => setGeneralCategory(e.target.value)}>
                                                <option value="General Suggestion">General Suggestion</option>
                                                <option value="Infrastructure Inquiry">Infrastructure Inquiry</option>
                                                <option value="Panchayat Services">Panchayat Services</option>
                                                <option value="Appreciation / Complaint">Appreciation / Complaint</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Your Message (Submitting as: {userName} | {getWardName(userWard)})</label>
                                            <textarea rows="4" required value={generalMessage} onChange={(e) => setGeneralMessage(e.target.value)} placeholder="Describe your feedback..."></textarea>
                                        </div>
                                        <div className="modal-actions">
                                            <button type="submit" className="submit-btn">Send Feedback</button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {allFeedbacks.filter(f => f.senderName === userName).length > 0 && (
                                <div style={{ marginTop: "24px" }}>
                                    <h4>My Submitted Feedbacks & Responses</h4>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                                        {allFeedbacks.filter(f => f.senderName === userName).map(myFb => (
                                            <div key={myFb.id} style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "12px", borderRadius: "8px" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#666" }}>
                                                    <span><strong>{myFb.category}</strong> ({myFb.date})</span>
                                                    <span style={{ 
                                                        fontWeight: "bold",
                                                        color: myFb.status === "Action Taken" ? "#16a34a" : myFb.status === "Acknowledged" ? "#ca8a04" : "#dc2626"
                                                    }}>
                                                        Status: {myFb.status || "Pending"}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: "13px", margin: "6px 0", color: "#333" }}>{myFb.message}</p>
                                                
                                                {myFb.reply ? (
                                                    <div style={{ background: "#f0f9ff", padding: "8px 10px", borderRadius: "6px", borderLeft: "3px solid #0284c7", marginTop: "6px" }}>
                                                        <small style={{ color: "#0284c7", fontWeight: "bold" }}>Panchayat Acknowledgement / Reply:</small>
                                                        <p style={{ fontSize: "12px", color: "#0f172a", margin: "2px 0" }}>{myFb.reply}</p>
                                                    </div>
                                                ) : (
                                                    <p style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic", margin: 0 }}>Awaiting response from Panchayat...</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {alertPopup.show && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: "380px" }}>
                        <div className={`popup-icon-circle popup-icon-${alertPopup.type}`}>
                            {alertPopup.type === "success" && "✓"}
                            {alertPopup.type === "error" && "✕"}
                            {alertPopup.type === "warning" && "!"}
                        </div>
                        <h2 className="popup-title">{alertPopup.title}</h2>
                        <p className="popup-message">{alertPopup.message}</p>
                        <div className="popup-actions">
                            <button className="btn-popup-ok" onClick={() => setAlertPopup({ ...alertPopup, show: false })}>
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmPopup.show && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: "400px" }}>
                        <div className="popup-icon-circle popup-icon-error">🗑️</div>
                        <h2 className="popup-title">{confirmPopup.title}</h2>
                        <p className="popup-message">{confirmPopup.message}</p>
                        <div className="popup-actions">
                            <button className="btn-popup-cancel" onClick={() => setConfirmPopup({ ...confirmPopup, show: false })}>
                                Cancel
                            </button>
                            <button className="btn-popup-danger" onClick={confirmPopup.onConfirm}>
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showReviewModal && selectedProject && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button className="close-btn" onClick={() => setShowReviewModal(false)}>&times;</button>
                        <h2>Rate & Review</h2>
                        <p>{selectedProject.title}</p>
                        <form onSubmit={handleReviewSubmit}>
                            <div className="form-group">
                                <label>Rating (1 to 5 Stars)</label>
                                <select value={ratingScore} onChange={(e) => setRatingScore(Number(e.target.value))}>
                                    <option value="5">⭐⭐⭐⭐⭐ (5/5 - Excellent)</option>
                                    <option value="4">⭐⭐⭐⭐ (4/5 - Good)</option>
                                    <option value="3">⭐⭐⭐ (3/5 - Average)</option>
                                    <option value="2">⭐⭐ (2/5 - Poor)</option>
                                    <option value="1">⭐ (1/5 - Very Bad)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Your Comments / Suggestions</label>
                                <textarea rows="3" required value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Write about project quality..."></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowReviewModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">Submit Review</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showPollModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button className="close-btn" onClick={() => setShowPollModal(false)}>&times;</button>
                        <h2>{editingPollId ? "Edit Poll" : "Create New Poll"}</h2>
                        <p>Manage community voting proposals with image and target ward.</p>
                        <form onSubmit={handlePollSubmit}>
                            <div className="form-group">
                                <label>Poll Title</label>
                                <input type="text" required value={pollTitle} onChange={(e) => setPollTitle(e.target.value)} placeholder="e.g. Street Light Extension" />
                            </div>

                            <div className="form-group">
                                <label>Target Ward / Location</label>
                                <select value={pollWard} onChange={(e) => setPollWard(e.target.value)}>
                                    <option value="All Wards">All Wards</option>
                                    {wardList.map(wardKey => (
                                        <option key={wardKey} value={wardKey}>{getWardName(wardKey)}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea rows="2" required value={pollDesc} onChange={(e) => setPollDesc(e.target.value)} placeholder="Details of the initiative..." />
                            </div>

                            <div className="form-group">
                                <label>Poll Photo</label>
                                <input type="file" accept="image/*" onChange={handlePollImageChange} />
                            </div>
                            {pollImagePreview && (
                                <div style={{ marginBottom: "12px" }}>
                                    <img src={pollImagePreview} alt="Poll Preview" style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "6px" }} />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Poll End Date</label>
                                <input type="date" value={pollEndDate} onChange={(e) => setPollEndDate(e.target.value)} required />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowPollModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">{editingPollId ? "Update Poll" : "Publish Poll"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showProjModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button className="close-btn" onClick={() => setShowProjModal(false)}>&times;</button>
                        <h2>{editingProjId ? "Edit Project Feedback" : "Add Completed Project Feedback"}</h2>
                        <p>Manage published project feedback.</p>
                        <form onSubmit={handleProjSubmit}>
                            <div className="form-group">
                                <label>Project Title</label>
                                <input type="text" required value={projTitle} onChange={(e) => setProjTitle(e.target.value)} placeholder="e.g. Community Drinking Water Project" />
                            </div>

                            <div className="form-group">
                                <label>Ward Name</label>
                                <select value={projWard} onChange={(e) => setProjWard(e.target.value)} required>
                                    {wardList.map((wardKey) => (
                                        <option key={wardKey} value={wardKey}>
                                            {getWardName(wardKey)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Short Description</label>
                                <textarea rows="2" required value={projDesc} onChange={(e) => setProjDesc(e.target.value)} placeholder="Brief summary of the project..." />
                            </div>
                            <div className="form-group">
                                <label>Impact Summary</label>
                                <textarea rows="2" required value={projImpact} onChange={(e) => setProjImpact(e.target.value)} placeholder="e.g. Provided clean drinking water to 250+ households..." />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowProjModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">{editingProjId ? "Update Project" : "Publish Project"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}