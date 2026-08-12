import React, { useState, useEffect } from "react";
import "./Projects.css";

export default function VillageProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [userRole, setUserRole] = useState("citizen");
    const [currentWard, setCurrentWard] = useState("Ward 07");
    
    // Filter states
    const [activeTab, setActiveTab] = useState("All Projects");
    const [searchQuery, setSearchQuery] = useState("");
    
    // Modal states for Add/Edit Project
    const [showModal, setShowModal] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("Ongoing"); // Ongoing, Completed, Upcoming / Planning Phase
    const [ward, setWard] = useState("Ward 07");
    const [description, setDescription] = useState("");
    const [progress, setProgress] = useState(50);
    const [budget, setBudget] = useState("");
    const [imageFile, setImageFile] = useState("");

    // Details Modal State
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

        const userWard = loggedInUser.ward || localStorage.getItem("userWard") || "Ward 07";
        setCurrentWard(userWard);
        setWard(userWard);

        // Initial Sample Projects matching the UI
        const defaultProjects = [
            {
                id: 1,
                title: "Bridge Reconstruction",
                category: "Ongoing",
                ward: "Ward 4",
                description: "Rebuilding the main concrete bridge connecting the eastern zone to the town area.",
                progress: 65,
                budget: "₹ 12,00,,000",
                image: ""
            },
            {
                id: 2,
                title: "Primary School Solar Panel Installation",
                category: "Completed",
                ward: "Ward 2",
                description: "Installation of 10kW solar power system for the Government Higher Secondary School.",
                progress: 100,
                budget: "₹ 4,50,000",
                image: ""
            },
            {
                id: 3,
                title: "Public Pond Rejuvenation",
                category: "Upcoming",
                ward: "Ward 7",
                description: "Desilting and cleaning of the central village pond, including pathway creation.",
                progress: 10,
                budget: "₹ 8,75,000",
                image: ""
            },
            {
                id: 4,
                title: "New Anganwadi Construction",
                category: "Ongoing",
                ward: "Ward 1",
                description: "Building a modern, child-friendly Anganwadi center with basic play amenities.",
                progress: 40,
                budget: "₹ 15,50,000",
                image: ""
            }
        ];

        const savedProjects = localStorage.getItem("ente_gramam_projects");
        if (savedProjects) {
            try {
                setProjects(JSON.parse(savedProjects));
            } catch (err) {
                setProjects(defaultProjects);
            }
        } else {
            setProjects(defaultProjects);
            localStorage.setItem("ente_gramam_projects", JSON.stringify(defaultProjects));
        }
    }, []);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageFile(reader.result); // Base64 string
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProjectSubmit = (e) => {
        e.preventDefault();
        if (!title || !budget) return;

        let updatedProjects;
        if (editingProjectId) {
            updatedProjects = projects.map(p => {
                if (p.id === editingProjectId) {
                    return {
                        ...p,
                        title,
                        category,
                        ward,
                        description,
                        progress: category === "Completed" ? 100 : Number(progress),
                        budget,
                        image: imageFile || p.image
                    };
                }
                return p;
            });
            alert("Project updated successfully!");
        } else {
            const newProject = {
                id: Date.now(),
                title,
                category,
                ward,
                description,
                progress: category === "Completed" ? 100 : Number(progress),
                budget,
                image: imageFile
            };
            updatedProjects = [newProject, ...projects];
            alert("New village project posted successfully!");
        }

        setProjects(updatedProjects);
        localStorage.setItem("ente_gramam_projects", JSON.stringify(updatedProjects));

        setShowModal(false);
        setEditingProjectId(null);
        setTitle("");
        setDescription("");
        setBudget("");
        setImageFile("");
        setProgress(50);
    };

    const handleEditClick = (project) => {
        setEditingProjectId(project.id);
        setTitle(project.title);
        setCategory(project.category);
        setWard(project.ward);
        setDescription(project.description);
        setProgress(project.progress);
        setBudget(project.budget);
        setImageFile(project.image || "");
        setShowModal(true);
    };

    const handleDeleteProject = (id) => {
        if (window.confirm("Are you sure you want to delete this project?")) {
            const updated = projects.filter(p => p.id !== id);
            setProjects(updated);
            localStorage.setItem("ente_gramam_projects", JSON.stringify(updated));
        }
    };

    const isPrivileged = userRole.includes("panchayat") || userRole.includes("admin") || userRole.includes("ward");

  
    const filteredProjects = projects.filter(p => {
        const matchesTab = 
            activeTab === "All Projects" || 
            (activeTab === "Ongoing" && p.category === "Ongoing") ||
            (activeTab === "Completed" && p.category === "Completed") ||
            (activeTab === "Upcoming" && (p.category === "Upcoming" || p.category === "Planning Phase"));

        const matchesSearch = 
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            p.ward.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase());

        // Ward restriction: Citizens can only see their own ward projects
        const isPanchayatAdmin = userRole.includes("panchayat") || userRole.includes("admin");
        const matchesWard = isPanchayatAdmin || p.ward.toLowerCase() === currentWard.toLowerCase();

        return matchesTab && matchesSearch && matchesWard;
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
                            setEditingProjectId(null);
                            setTitle("");
                            setDescription("");
                            setBudget("");
                            setImageFile("");
                            setProgress(50);
                            setShowModal(true);
                        }}>
                            + Add Project
                        </button>
                    )}
                </div>
            </div>

            <div className="projects-grid">
                {filteredProjects.map(project => (
                    <div key={project.id} className="project-card">
                        {project.image && (
                            <div className="project-card-image">
                                <img src={project.image} alt={project.title} />
                            </div>
                        )}
                        <div className="project-card-header">
                            <span className={`status-badge ${project.category.toLowerCase().includes('ongoing') ? 'badge-ongoing' : project.category.toLowerCase().includes('completed') ? 'badge-completed' : 'badge-upcoming'}`}>
                                ● {project.category}
                            </span>
                            <span className="ward-badge">📍 {project.ward}</span>
                        </div>

                        <h3>{project.title}</h3>
                        <p className="project-desc">{project.description}</p>

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
                ))}
            </div>

            {/* Add / Edit Project Modal */}
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
                                <input type="text" value={ward} onChange={(e) => setWard(e.target.value)} required placeholder="e.g. Ward 4" />
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
                            {imageFile && (
                                <div style={{ marginBottom: "15px" }}>
                                    <img src={imageFile} alt="Preview" style={{ width: "100px", height: "70px", objectFit: "cover", borderRadius: "6px" }} />
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

            {/* Details Modal */}
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