import React, { useState, useEffect } from "react";
import api from "../../axiosInstance"; // 👈 1. നമ്മൾ ഉണ്ടാക്കിയ Axios Instance ഇമ്പോർട്ട് ചെയ്യുന്നു
import "./Projects.css";

export default function VillageProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [userRole, setUserRole] = useState("citizen");
    const [currentWard, setCurrentWard] = useState("");
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState("All Projects");
    const [searchQuery, setSearchQuery] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("Ongoing");
    const [ward, setWard] = useState("");
    const [description, setDescription] = useState("");
    const [progress, setProgress] = useState(50);
    const [budget, setBudget] = useState("");
    
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");

    const [selectedProject, setSelectedProject] = useState(null);

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

        const userWard = loggedInUser.wardName || loggedInUser.ward_name || loggedInUser.ward || localStorage.getItem("userWard") || "";
        setCurrentWard(userWard);
        setWard(userWard);

        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            // 👈 2. api.get ഉപയോഗിച്ചു (HttpOnly Cookies ഓട്ടോമാറ്റിക്കായി പോകും)
            const response = await api.get("projects/");
            const data = response.data;
            setProjects(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error("Error fetching projects:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleProjectSubmit = async (e) => {
        e.preventDefault();
        if (!title || !budget) return;

        const formData = new FormData();
        formData.append("title", title);
        formData.append("category", category);
        formData.append("ward", ward || currentWard); 
        formData.append("description", description || "");
        formData.append("progress", category === "Completed" ? 100 : Number(progress));
        formData.append("budget", budget);
        
        if (startDate) formData.append("start_date", startDate);
        if (endDate) formData.append("end_date", endDate);

        if (selectedFile) {
            formData.append("image", selectedFile);
        }

        try {
            const config = {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            };

            // 👈 3. api.put / api.post ഉപയോഗിച്ചു
            if (editingProjectId) {
                await api.put(`projects/${editingProjectId}/`, formData, config);
                alert("Project updated successfully!");
            } else {
                await api.post("projects/", formData, config);
                alert("New village project posted successfully!");
            }

            resetForm();
            setShowModal(false);
            fetchProjects();
        } catch (error) {
            console.error("Error saving project:", error);
            alert("Failed to save project details.");
        }
    };

    const handleEditClick = (project) => {
        setEditingProjectId(project.id);
        setTitle(project.title);
        setCategory(project.category);
        setWard(project.ward);
        setDescription(project.description || "");
        setProgress(project.progress);
        setBudget(project.budget);
        
        setStartDate(project.start_date || "");
        setEndDate(project.end_date || "");
        
        setImagePreview(project.image || "");
        setSelectedFile(null);
        setShowModal(true);
    };

    const handleDeleteProject = async (id) => {
        if (window.confirm("Are you sure you want to delete this project?")) {
            try {
                // 👈 4. api.delete ഉപയോഗിച്ചു
                await api.delete(`projects/${id}/`);
                alert("Project deleted successfully.");
                fetchProjects();
            } catch (error) {
                console.error("Error deleting project:", error);
                alert("Failed to delete project.");
            }
        }
    };

    const resetForm = () => {
        setEditingProjectId(null);
        setTitle("");
        setDescription("");
        setBudget("");
        setStartDate("");
        setEndDate("");
        setSelectedFile(null);
        setImagePreview("");
        setProgress(50);
        setCategory("Ongoing");
        setWard(currentWard);
    };

    const isPrivileged = userRole.includes("panchayat") || userRole.includes("admin") || userRole.includes("ward");
    const isWardUserOnly = userRole.includes("ward") && !userRole.includes("admin") && !userRole.includes("panchayat");

    const filteredProjects = projects.filter(p => {
        const matchesTab = 
            activeTab === "All Projects" || 
            (activeTab === "Ongoing" && p.category === "Ongoing") ||
            (activeTab === "Completed" && p.category === "Completed") ||
            (activeTab === "Upcoming" && (p.category === "Upcoming" || p.category === "Planning Phase"));

        const matchesSearch = 
            (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase())) || 
            (p.ward && p.ward.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesTab && matchesSearch;
    });

    const activeWorksCount = projects.filter(p => p.category === "Ongoing").length;
    const completedCount = projects.filter(p => p.category === "Completed").length;

    return (
        <div className="projects-wrapper">
            <div className="projects-top-header">
                <div>
                    <h2>Village Projects</h2>
                    <p>Monitoring development and infrastructure across the Panchayat.</p>
                </div>
                <div className="project-stats-container">
                    <div className="stat-box">
                        <span className="stat-label">ACTIVE WORKS</span>
                        <span className="stat-value text-green">{activeWorksCount}</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">COMPLETED</span>
                        <span className="stat-value">{completedCount}</span>
                    </div>
                </div>
            </div>

            <div className="projects-action-bar">
                <div className="tab-filters">
                    {["All Projects", "Ongoing", "Completed", "Upcoming"].map(tab => (
                        <button 
                            key={tab} 
                            className={`filter-tab-btn ${activeTab === tab ? "active" : ""}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="search-and-add">
                    <input 
                        type="text" 
                        placeholder="Search projects..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="project-search-input"
                    />
                    {isPrivileged && (
                        <button className="btn-add-project" onClick={() => {
                            resetForm();
                            setShowModal(true);
                        }}>
                            + Add Project
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: "40px" }}>Loading projects...</div>
            ) : (
                <div className="projects-grid">
                    {filteredProjects.length === 0 ? (
                        <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#666" }}>No projects found.</p>
                    ) : (
                        filteredProjects.map(project => (
                            <div key={project.id} className="project-card">
                                {project.image && (
                                    <div className="project-card-image">
                                        <img src={project.image} alt={project.title} />
                                    </div>
                                )}
                                <div className="project-card-header">
                                    <span className={`status-badge ${project.category?.toLowerCase().includes('ongoing') ? 'badge-ongoing' : project.category?.toLowerCase().includes('completed') ? 'badge-completed' : 'badge-upcoming'}`}>
                                        ● {project.category}
                                    </span>
                                    <span className="ward-badge">📍 {project.ward}</span>
                                </div>

                                <h3>{project.title}</h3>
                                <p className="project-desc">{project.description}</p>

                                {(project.start_date || project.created_at) && (
                                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>
                                        📅 {project.start_date ? `Start: ${project.start_date}` : `Posted: ${new Date(project.created_at).toLocaleDateString()}`}
                                        {project.end_date && ` | End: ${project.end_date}`}
                                    </div>
                                )}

                                <div className="project-progress-section">
                                    <div className="progress-info">
                                        <span>{project.category === "Completed" ? "Status" : "Progress"}</span>
                                        <strong>{project.category === "Completed" ? "100% Finalized" : `${project.progress}%`}</strong>
                                    </div>
                                    {project.category !== "Completed" && (
                                        <div className="progress-bar-bg">
                                            <div className="progress-bar-fill" style={{ width: `${project.progress}%` }}></div>
                                        </div>
                                    )}
                                </div>

                                <div className="project-card-footer">
                                    <div>
                                        <span className="budget-label">{project.category === "Completed" ? "Final Cost" : "Budget Aligned"}</span>
                                        <strong className="budget-amount">{project.budget}</strong>
                                    </div>
                                    <div className="card-btn-group">
                                        <button className="btn-details" onClick={() => setSelectedProject(project)}>
                                            Details &rarr;
                                        </button>
                                        {isPrivileged && (
                                            <>
                                                <button className="btn-edit-proj" onClick={() => handleEditClick(project)} title="Edit">
                                                    ✏️
                                                </button>
                                                <button className="btn-delete-proj" onClick={() => handleDeleteProject(project.id)} title="Delete">
                                                    🗑️
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
                        <h2>{editingProjectId ? "Edit Village Project" : "Add New Village Project"}</h2>
                        <p>Fill in development project details for the panchayat.</p>

                        <form onSubmit={handleProjectSubmit}>
                            <div className="form-group">
                                <label>Project Title</label>
                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Road Tarring & Drainage" />
                            </div>
                            <div className="form-group">
                                <label>Category / Status</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                                    <option value="Ongoing">Ongoing</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Upcoming">Upcoming / Planning Phase</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Ward Location</label>
                                <input 
                                    type="text" 
                                    value={ward} 
                                    onChange={(e) => setWard(e.target.value)} 
                                    required 
                                    readOnly={isWardUserOnly} 
                                    style={{
                                        backgroundColor: isWardUserOnly ? "#f3f4f6" : "#ffffff",
                                        cursor: isWardUserOnly ? "not-allowed" : "text",
                                        color: isWardUserOnly ? "#4b5563" : "#000000",
                                        fontWeight: isWardUserOnly ? "600" : "normal"
                                    }}
                                    placeholder="e.g. Ward 07" 
                                />
                                {isWardUserOnly && (
                                    <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "2px", display: "block" }}>
                                        🔒 Locked to your assigned ward ({currentWard})
                                    </small>
                                )}
                            </div>

                            <div style={{ display: "flex", gap: "10px" }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Start Date</label>
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Target End Date</label>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" placeholder="Brief details about the road/project..."></textarea>
                            </div>
                            {category !== "Completed" && (
                                <div className="form-group">
                                    <label>Progress Percentage ({progress}%)</label>
                                    <input type="range" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Budget / Cost</label>
                                <input type="text" value={budget} onChange={(e) => setBudget(e.target.value)} required placeholder="e.g. ₹ 15,50,000" />
                            </div>
                            <div className="form-group">
                                <label>Project Image (Road / Work Photo)</label>
                                <input type="file" accept="image/*" onChange={handleImageChange} />
                            </div>
                            {imagePreview && (
                                <div style={{ marginBottom: "15px" }}>
                                    <img src={imagePreview} alt="Preview" style={{ width: "100px", height: "70px", objectFit: "cover", borderRadius: "6px" }} />
                                </div>
                            )}
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">{editingProjectId ? "Update Project" : "Post Project"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedProject && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <button className="close-btn" onClick={() => setSelectedProject(null)}>&times;</button>
                        <h2>{selectedProject.title}</h2>
                        <p><span className="status-badge badge-ongoing">● {selectedProject.category}</span> • 📍 {selectedProject.ward}</p>

                        {selectedProject.image && (
                            <div style={{ margin: "15px 0" }}>
                                <img src={selectedProject.image} alt="Project" style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "8px" }} />
                            </div>
                        )}

                        <div style={{ margin: "15px 0" }}>
                            <h4>Timeline & Details</h4>
                            {selectedProject.created_at && (
                                <p style={{ fontSize: "14px", color: "#555" }}>
                                    <strong>Created On:</strong> {new Date(selectedProject.created_at).toLocaleString()}
                                </p>
                            )}
                            {selectedProject.start_date && (
                                <p style={{ fontSize: "14px", color: "#555" }}>
                                    <strong>Start Date:</strong> {selectedProject.start_date}
                                </p>
                            )}
                            {selectedProject.end_date && (
                                <p style={{ fontSize: "14px", color: "#555" }}>
                                    <strong>Target Completion:</strong> {selectedProject.end_date}
                                </p>
                            )}
                        </div>

                        <div style={{ margin: "15px 0" }}>
                            <h4>Description</h4>
                            <p>{selectedProject.description || "No description provided."}</p>
                        </div>

                        <div style={{ margin: "15px 0" }}>
                            <h4>Financials & Progress</h4>
                            <p><strong>Budget / Cost:</strong> {selectedProject.budget}</p>
                            <p><strong>Progress:</strong> {selectedProject.progress}% Completed</p>
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="submit-btn" onClick={() => setSelectedProject(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}