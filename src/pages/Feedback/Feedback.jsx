import React, { useState, useEffect } from "react";
import "./Feedback.css";

export default function FeedbackPage() {
    const [userRole, setUserRole] = useState("citizen");
    const [userName, setUserName] = useState("Anonymous Citizen");
    const [userWard, setUserWard] = useState("Ward 1"); // User's own ward
    const [polls, setPolls] = useState([]);
    const [projectFeedbacks, setProjectFeedbacks] = useState([]);
    const [allFeedbacks, setAllFeedbacks] = useState([]);
    
    const [userVotedPolls, setUserVotedPolls] = useState([]);
    const [userReviewedProjects, setUserReviewedProjects] = useState([]);
    
    const [replyTextMap, setReplyTextMap] = useState({});

    // General Feedback Form State
    const [generalCategory, setGeneralCategory] = useState("General Suggestion");
    const [generalMessage, setGeneralMessage] = useState("");

    // Modal state for Submitting Project Review/Rating
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [ratingScore, setRatingScore] = useState(5);
    const [reviewText, setReviewText] = useState("");

    // Admin Modal to Add/Edit Poll
    const [showPollModal, setShowPollModal] = useState(false);
    const [editingPollId, setEditingPollId] = useState(null);
    const [pollTitle, setPollTitle] = useState("");
    const [pollDesc, setPollDesc] = useState("");
    const [pollImage, setPollImage] = useState("");
    const [pollEnds, setPollEnds] = useState("Ends in 3 days");

    // Admin Modal to Add/Edit Project Feedback
    const [showProjModal, setShowProjModal] = useState(false);
    const [editingProjId, setEditingProjId] = useState(null);
    const [projTitle, setProjTitle] = useState("");
    const [projDesc, setProjDesc] = useState("");
    const [projWard, setProjWard] = useState("Ward 1");
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
        const ward = loggedInUser.ward || loggedInUser.wardNumber || localStorage.getItem("userWard") || "Ward 1";
        
        setUserRole(role);
        setUserName(name);
        setUserWard(ward);

        const storedVotedPolls = JSON.parse(localStorage.getItem(`voted_polls_${name}`) || "[]");
        const storedReviewedProjs = JSON.parse(localStorage.getItem(`reviewed_projs_${name}`) || "[]");
        setUserVotedPolls(storedVotedPolls);
        setUserReviewedProjects(storedReviewedProjs);

        const defaultPolls = [
            {
                id: 1,
                title: "New Community Park - Ward 4",
                description: "Proposal to convert the vacant plot near the library into a children's park with seating.",
                endsIn: "Ends in 3 days",
                supportCount: 0,
                image: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=600&q=80"
            }
        ];

        const defaultProjectFeedbacks = [
            {
                id: 101,
                title: "Primary School Solar Panel Installation",
                description: "Installation of 10kW solar power system for the Government...",
                ward: "Ward 1",
                status: "Completed",
                impactSummary: "Reduced school electricity bills by 85% and provided uninterrupted power for the computer lab.",
                rating: 0,
                reviewsCount: 0
            },
            {
                id: 102,
                title: "Community Drinking Water Tank",
                description: "Setting up a 5000L overhead water tank for clean supply.",
                ward: "Ward 2",
                status: "Completed",
                impactSummary: "Provided clean drinking water access to households.",
                rating: 0,
                reviewsCount: 0
            }
        ];

        const savedPolls = localStorage.getItem("ente_gramam_polls");
        if (savedPolls) {
            try { setPolls(JSON.parse(savedPolls)); } catch (e) { setPolls(defaultPolls); }
        } else {
            setPolls(defaultPolls);
            localStorage.setItem("ente_gramam_polls", JSON.stringify(defaultPolls));
        }

        const savedProjFeedbacks = localStorage.getItem("ente_gramam_proj_feedbacks");
        if (savedProjFeedbacks) {
            try { setProjectFeedbacks(JSON.parse(savedProjFeedbacks)); } catch (e) { setProjectFeedbacks(defaultProjectFeedbacks); }
        } else {
            setProjectFeedbacks(defaultProjectFeedbacks);
            localStorage.setItem("ente_gramam_proj_feedbacks", JSON.stringify(defaultProjectFeedbacks));
        }

        const savedAllFb = localStorage.getItem("ente_gramam_all_feedbacks");
        if (savedAllFb) {
            try { setAllFeedbacks(JSON.parse(savedAllFb)); } catch (e) { setAllFeedbacks([]); }
        }
    }, [userName]);

    const handleVoteNow = (pollId) => {
        if (userVotedPolls.includes(pollId)) {
            alert("You have already voted for this poll. Each user can vote only once!");
            return;
        }

        const updated = polls.map(p => {
            if (p.id === pollId) {
                const newSupport = p.supportCount + 1;
                return { ...p, supportCount: newSupport };
            }
            return p;
        });

        const newVotedList = [...userVotedPolls, pollId];
        setUserVotedPolls(newVotedList);
        localStorage.setItem(`voted_polls_${userName}`, JSON.stringify(newVotedList));

        setPolls(updated);
        localStorage.setItem("ente_gramam_polls", JSON.stringify(updated));
        alert("Thank you for voting! Your vote has been recorded successfully.");
    };

    const handleGeneralSubmit = (e) => {
        e.preventDefault();
        if (!generalMessage.trim()) return;

        const newFeedbackEntry = {
            id: Date.now(),
            category: generalCategory,
            message: generalMessage,
            senderName: userName,
            ward: userWard,
            date: new Date().toLocaleDateString(),
            status: "Pending",
            reply: ""
        };

        const updatedList = [newFeedbackEntry, ...allFeedbacks];
        setAllFeedbacks(updatedList);
        localStorage.setItem("ente_gramam_all_feedbacks", JSON.stringify(updatedList));

        alert("Your general feedback has been submitted successfully to the Panchayat!");
        setGeneralMessage("");
    };

    const handleOpenReviewModal = (proj) => {
        if (userReviewedProjects.includes(proj.id)) {
            alert("You have already submitted a review and rating for this project. Each user can review a project only once!");
            return;
        }
        setSelectedProject(proj);
        setShowReviewModal(true);
    };

    const handleReviewSubmit = (e) => {
        e.preventDefault();
        if (userReviewedProjects.includes(selectedProject.id)) {
            alert("You have already reviewed this project.");
            setShowReviewModal(false);
            return;
        }

        const updated = projectFeedbacks.map(pf => {
            if (pf.id === selectedProject.id) {
                const newReviewsCount = pf.reviewsCount + 1;
                const newRating = Number(((pf.rating * pf.reviewsCount + ratingScore) / newReviewsCount).toFixed(1));
                return { ...pf, rating: newRating, reviewsCount: newReviewsCount };
            }
            return pf;
        });

        setProjectFeedbacks(updated);
        localStorage.setItem("ente_gramam_proj_feedbacks", JSON.stringify(updated));

        const newReviewedList = [...userReviewedProjects, selectedProject.id];
        setUserReviewedProjects(newReviewedList);
        localStorage.setItem(`reviewed_projs_${userName}`, JSON.stringify(newReviewedList));

        const reviewEntry = {
            id: Date.now(),
            category: `Project Review: ${selectedProject.title}`,
            message: `Rating: ${ratingScore}/5 - ${reviewText}`,
            senderName: userName,
            ward: userWard,
            date: new Date().toLocaleDateString(),
            status: "Pending",
            reply: ""
        };
        const updatedList = [reviewEntry, ...allFeedbacks];
        setAllFeedbacks(updatedList);
        localStorage.setItem("ente_gramam_all_feedbacks", JSON.stringify(updatedList));

        alert(`Review submitted successfully for ${selectedProject.title}!`);
        setShowReviewModal(false);
        setReviewText("");
    };

    const handleUpdateStatus = (id, newStatus) => {
        const updated = allFeedbacks.map(fb => fb.id === id ? { ...fb, status: newStatus } : fb);
        setAllFeedbacks(updated);
        localStorage.setItem("ente_gramam_all_feedbacks", JSON.stringify(updated));
    };

    const handleSendReply = (id) => {
        const text = replyTextMap[id];
        if (!text || !text.trim()) return;

        const updated = allFeedbacks.map(fb => {
            if (fb.id === id) {
                return { 
                    ...fb, 
                    reply: text, 
                    status: fb.status === "Pending" ? "Acknowledged" : fb.status 
                };
            }
            return fb;
        });

        setAllFeedbacks(updated);
        localStorage.setItem("ente_gramam_all_feedbacks", JSON.stringify(updated));
        alert("Acknowledgement reply sent to citizen successfully!");
        setReplyTextMap({ ...replyTextMap, [id]: "" });
    };

    const handleOpenAddPoll = () => {
        setEditingPollId(null);
        setPollTitle("");
        setPollDesc("");
        setPollImage("");
        setPollEnds("Ends in 3 days");
        setShowPollModal(true);
    };

    const handleOpenEditPoll = (poll) => {
        setEditingPollId(poll.id);
        setPollTitle(poll.title);
        setPollDesc(poll.description);
        setPollImage(poll.image);
        setPollEnds(poll.endsIn);
        setShowPollModal(true);
    };

    const handlePollSubmit = (e) => {
        e.preventDefault();
        if (!pollTitle) return;

        let updated;
        if (editingPollId) {
            updated = polls.map(p => p.id === editingPollId ? { ...p, title: pollTitle, description: pollDesc, image: pollImage || p.image, endsIn: pollEnds } : p);
            alert("Poll updated successfully!");
        } else {
            const newPoll = {
                id: Date.now(),
                title: pollTitle,
                description: pollDesc,
                endsIn: pollEnds,
                supportCount: 0,
                image: pollImage || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80"
            };
            updated = [newPoll, ...polls];
            alert("New poll published successfully!");
        }

        setPolls(updated);
        localStorage.setItem("ente_gramam_polls", JSON.stringify(updated));
        setShowPollModal(false);
    };

    const handleDeletePoll = (id) => {
        if (window.confirm("Are you sure you want to delete this poll?")) {
            const updated = polls.filter(p => p.id !== id);
            setPolls(updated);
            localStorage.setItem("ente_gramam_polls", JSON.stringify(updated));
        }
    };

    const handleOpenAddProj = () => {
        setEditingProjId(null);
        setProjTitle("");
        setProjDesc("");
        setProjWard("Ward 1");
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

    const handleProjSubmit = (e) => {
        e.preventDefault();
        if (!projTitle) return;

        let updated;
        if (editingProjId) {
            updated = projectFeedbacks.map(pf => pf.id === editingProjId ? { ...pf, title: projTitle, description: projDesc, ward: projWard, impactSummary: projImpact } : pf);
            alert("Project feedback updated successfully!");
        } else {
            const newProj = {
                id: Date.now(),
                title: projTitle,
                description: projDesc,
                ward: projWard,
                status: "Completed",
                impactSummary: projImpact || "Successfully completed for public welfare.",
                rating: 0,       
                reviewsCount: 0  
            };
            updated = [newProj, ...projectFeedbacks];
            alert("Project feedback added successfully!");
        }

        setProjectFeedbacks(updated);
        localStorage.setItem("ente_gramam_proj_feedbacks", JSON.stringify(updated));
        setShowProjModal(false);
    };

    const handleDeleteProj = (id) => {
        if (window.confirm("Are you sure you want to delete this project feedback?")) {
            const updated = projectFeedbacks.filter(pf => pf.id !== id);
            setProjectFeedbacks(updated);
            localStorage.setItem("ente_gramam_proj_feedbacks", JSON.stringify(updated));
        }
    };

    const isPrivileged = userRole.includes("panchayat") || userRole.includes("admin");
    const isWardMember = userRole.includes("ward");

    // Filter project feedbacks: Panchayat sees all, Ward Members & Citizens see only their own ward projects
    const filteredProjectFeedbacks = (isPrivileged) 
        ? projectFeedbacks 
        : projectFeedbacks.filter(proj => proj.ward?.toLowerCase() === userWard?.toLowerCase());

    return (
        <div className="feedback-wrapper">
            {/* Top Header */}
            <div className="feedback-top-header">
                <div>
                    <h2>Citizen Feedback Hub</h2>
                    <p>Participate in community decisions, review completed projects for <strong>{userWard}</strong>, and share your suggestions.</p>
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

            {/* Upcoming Polls Section */}
            <div className="section-block">
                <div className="section-title-row">
                    <h3>Upcoming Polls</h3>
                    <span className="section-subtitle">Vote on proposed initiatives for our village.</span>
                </div>

                <div className="polls-grid">
                    {polls.map((poll) => {
                        const hasVoted = userVotedPolls.includes(poll.id);
                        return (
                            <div key={poll.id} className="poll-card">
                                <div className="poll-img-container">
                                    <img src={poll.image} alt={poll.title} />
                                    <div className="poll-badges-row">
                                        <span className="badge-active-poll">Active Poll</span>
                                        <span className="poll-ends-text">{poll.endsIn}</span>
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
                                                style={hasVoted ? { background: "#e2e8f0", color: "#64748b", cursor: "not-allowed" } : {}}
                                            >
                                                {hasVoted ? "✅ Already Voted" : "🗳️ Vote Now"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Project Feedback Section (Filtered by Own Ward for Citizens & Ward Members) */}
            <div className="section-block">
                <div className="section-title-row">
                    <h3>Project Feedback ({isPrivileged ? "All Wards" : userWard})</h3>
                    <span className="section-subtitle">
                        {isPrivileged ? "Review completed projects across all panchayat wards." : `Review completed projects specifically for ${userWard}.`}
                    </span>
                </div>

                {filteredProjectFeedbacks.length === 0 ? (
                    <div style={{ background: "#fff", padding: "24px", borderRadius: "8px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                        <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>No project feedback available for {userWard} at the moment.</p>
                    </div>
                ) : (
                    <div className="project-feedbacks-grid">
                        {filteredProjectFeedbacks.map((proj) => {
                            const hasReviewed = userReviewedProjects.includes(proj.id);
                            return (
                                <div key={proj.id} className="proj-fb-card">
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                            <div className="proj-fb-top-badges" style={{ margin: 0 }}>
                                                <span className="badge-completed">✅ {proj.status}</span>
                                                <span className="badge-ward">📍 {proj.ward}</span>
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

            {/* General Feedback & Acknowledgement Section */}
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
                                                Submitted by: <strong>{item.senderName || "Anonymous Citizen"}</strong> ({item.ward || "Ward 1"})
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
                        <span className="section-subtitle">Have a general suggestion or comment? Submit here and track Panchayat updates for {userWard}.</span>
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
                                    <label>Your Message (Submitting as: {userName} | {userWard})</label>
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

            {/* Review Modal */}
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

            {/* Admin Add/Edit Poll Modal */}
            {showPollModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button className="close-btn" onClick={() => setShowPollModal(false)}>&times;</button>
                        <h2>{editingPollId ? "Edit Poll" : "Create New Poll"}</h2>
                        <p>Manage community voting proposals with image.</p>
                        <form onSubmit={handlePollSubmit}>
                            <div className="form-group">
                                <label>Poll Title</label>
                                <input type="text" required value={pollTitle} onChange={(e) => setPollTitle(e.target.value)} placeholder="e.g. Street Light Extension - Ward 7" />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea rows="2" required value={pollDesc} onChange={(e) => setPollDesc(e.target.value)} placeholder="Details of the initiative..." />
                            </div>
                            <div className="form-group">
                                <label>Poll Image URL</label>
                                <input type="text" value={pollImage} onChange={(e) => setPollImage(e.target.value)} placeholder="https://images.unsplash.com/..." />
                            </div>
                            <div className="form-group">
                                <label>Duration Text</label>
                                <input type="text" value={pollEnds} onChange={(e) => setPollEnds(e.target.value)} placeholder="e.g. Ends in 4 days" />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowPollModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">{editingPollId ? "Update Poll" : "Publish Poll"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Admin Add/Edit Project Feedback Modal */}
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
                                <label>Ward Number</label>
                                <input type="text" required value={projWard} onChange={(e) => setProjWard(e.target.value)} placeholder="e.g. Ward 1" />
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