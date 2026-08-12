import React, { useState, useEffect } from "react";
import "./Welfare.css";

// ------------------------------------------------------------------
// Reference data
// ------------------------------------------------------------------
const AVAILABLE_SCHEMES = [
    {
        id: "SCH-EDU-01",
        name: "Free Laptop Distribution",
        category: "Education",
        breadcrumb: ["Welfare Schemes", "Education", "Free Laptop Distribution"],
        deadline: "15 Nov 2023",
        description:
            "High-performance laptop for educational purposes to support students from economically weaker sections.",
        eligibilityScore: 98,
        aiConfidence: 99,
        requiredDocs: ["Aadhaar Card", "Income Certificate", "Passport Photo", "Student ID", "Bonafide Certificate"],
        requiredDetails: ["Class / Course", "Institution Name", "Annual Family Income"],
        reasonLine: "I am currently a Student and my family's annual income is verified to be below the eligibility threshold.",
    },
    {
        id: "SCH-AGR-01",
        name: "Agriculture Subsidy",
        category: "Livelihood",
        breadcrumb: ["Welfare Schemes", "Livelihood", "Agriculture Subsidy"],
        deadline: "30 Nov 2023",
        description: "Financial assistance for small and marginal farmers to procure seeds, fertilizer, and equipment.",
        eligibilityScore: 94,
        aiConfidence: 96,
        requiredDocs: ["Aadhaar Card", "Land Ownership Proof", "Bank Passbook"],
        requiredDetails: ["Land Area (in cents)", "Crop Type"],
        reasonLine: "I am a small-scale farmer and my land ownership has been verified against panchayat records.",
    },
    {
        id: "SCH-HOU-01",
        name: "Housing Grant (PMAY)",
        category: "Housing",
        breadcrumb: ["Welfare Schemes", "Housing", "Housing Grant (PMAY)"],
        deadline: "20 Dec 2023",
        description: "Financial support for construction or renovation of houses for eligible economically weaker families.",
        eligibilityScore: 89,
        aiConfidence: 91,
        requiredDocs: ["Aadhaar Card", "Income Certificate", "Property Tax Receipt"],
        requiredDetails: ["Family Size", "Current Housing Status"],
        reasonLine: "My family currently lacks a pucca house and falls under the economically weaker section category.",
    },
];

const DEFAULT_HISTORY = [
    {
        id: 9001,
        applicantName: "Fathima Rasheeda",
        wardName: "Ward 2",
        schemeName: "Agriculture Subsidy",
        decision: "APPROVED",
        time: "Oct 18, 2023",
    },
    {
        id: 9002,
        applicantName: "Nirmal Joseph",
        wardName: "Ward 9",
        schemeName: "Housing Grant (PMAY)",
        decision: "REJECTED",
        time: "Oct 12, 2023",
    },
];

// ------------------------------------------------------------------
// Status Timeline
// ------------------------------------------------------------------
const TIMELINE_STEPS = [
    { step: 1, label: "Application Drafted", waitingText: "Preparing details..." },
    { step: 2, label: "Documents Uploaded", waitingText: "Upload the required documents below." },
    { step: 3, label: "Application Submitted", waitingText: "Ready to submit — press Submit Application below." },
    { step: 4, label: "Ward Verification", waitingText: "Waiting for the Ward Member to verify the applicant." },
    { step: 5, label: "Panchayat Review", waitingText: "Waiting for Panchayath's final decision." },
    { step: 6, label: "Approved / Disbursed", waitingText: "Application approved." },
];

function nowDate() {
    return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getDotClass(app, stepNum) {
    return app && app.step >= stepNum ? "green-dot" : "empty-dot";
}

function getTimelineClass(app, stepNum) {
    if (!app) return "inactive";
    if (app.step === stepNum) return app.status === "rejected" ? "rejected-step" : "active";
    if (app.step > stepNum) return "completed";
    return "inactive";
}

function normalizeWard(value) {
    if (!value) return "";
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function buildAiLetter({ citizenName, wardName, scheme, age, extraDetails = {} }) {
    const detailLines = Object.entries(extraDetails)
        .filter(([, v]) => v && String(v).trim())
        .map(([k, v]) => `${k}: ${String(v).trim()}`);
    const detailsSentence = detailLines.length
        ? ` My ${detailLines.join(", ").toLowerCase()}.`
        : "";
    return {
        date: nowDate(),
        to: "The Secretary, Grama Panchayat Office, Ente Gramam.",
        subject: `Application for ${scheme.name} Scheme`,
        body:
            `Respected Sir/Madam,\n\nI, ${citizenName}, aged ${age || "N/A"}, residing at ${wardName}, respectfully submit this application for the ${scheme.name} Scheme. ${scheme.reasonLine || ""}${detailsSentence}\n\nI have attached all required documents for your kind perusal. I request you to consider my application favorably.\n\nYours faithfully,`,
        signOff: citizenName,
        signOffTitle: "(Applicant)",
    };
}

function buildTimelineForStep(step) {
    return TIMELINE_STEPS.map((s) => {
        if (s.step < step) return { ...s, status: "done" };
        if (s.step === step) return { ...s, status: "active" };
        return { ...s, status: "pending" };
    });
}

// ------------------------------------------------------------------
// Shared "backend"
// ------------------------------------------------------------------
const STORAGE_KEYS = {
    SCHEMES: "ente_gramam_scheme_catalog",
    APPLICATIONS: "ente_gramam_scheme_applications",
    WARD_INBOX: "ente_gramam_scheme_ward_inbox",
    PANCHAYATH_INBOX: "ente_gramam_scheme_panchayath_inbox",
    HISTORY: "ente_gramam_scheme_history",
};
const SYNC_EVENT = "scheme-store-sync";

function readJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        return fallback;
    }
}

function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(SYNC_EVENT));
}

const schemeStore = {
    getSchemes: () => readJSON(STORAGE_KEYS.SCHEMES, AVAILABLE_SCHEMES),
    addScheme: (scheme) => writeJSON(STORAGE_KEYS.SCHEMES, [scheme, ...readJSON(STORAGE_KEYS.SCHEMES, AVAILABLE_SCHEMES)]),
    deleteScheme: (id) =>
        writeJSON(STORAGE_KEYS.SCHEMES, readJSON(STORAGE_KEYS.SCHEMES, AVAILABLE_SCHEMES).filter((s) => s.id !== id)),

    getApplications: () => readJSON(STORAGE_KEYS.APPLICATIONS, []),
    setApplications: (value) => writeJSON(STORAGE_KEYS.APPLICATIONS, value),
    addApplication: (app) => writeJSON(STORAGE_KEYS.APPLICATIONS, [app, ...readJSON(STORAGE_KEYS.APPLICATIONS, [])]),
    updateApplication: (id, patch) => {
        const updated = readJSON(STORAGE_KEYS.APPLICATIONS, []).map((a) =>
            a.id === id ? { ...a, ...(typeof patch === "function" ? patch(a) : patch) } : a
        );
        writeJSON(STORAGE_KEYS.APPLICATIONS, updated);
        return updated.find((a) => a.id === id);
    },
    deleteApplication: (id) => {
        const updated = readJSON(STORAGE_KEYS.APPLICATIONS, []).filter((a) => a.id !== id);
        writeJSON(STORAGE_KEYS.APPLICATIONS, updated);
    },

    getWardInbox: () => readJSON(STORAGE_KEYS.WARD_INBOX, []),
    addWardMessage: (msg) => writeJSON(STORAGE_KEYS.WARD_INBOX, [msg, ...readJSON(STORAGE_KEYS.WARD_INBOX, [])]),

    getPanchayathInbox: () => readJSON(STORAGE_KEYS.PANCHAYATH_INBOX, []),
    addPanchayathNotification: (note) =>
        writeJSON(STORAGE_KEYS.PANCHAYATH_INBOX, [note, ...readJSON(STORAGE_KEYS.PANCHAYATH_INBOX, [])]),

    getHistory: () => readJSON(STORAGE_KEYS.HISTORY, DEFAULT_HISTORY),
    addHistory: (entry) => writeJSON(STORAGE_KEYS.HISTORY, [entry, ...readJSON(STORAGE_KEYS.HISTORY, DEFAULT_HISTORY)]),

    subscribe(callback) {
        const handler = () => callback();
        window.addEventListener("storage", handler);
        window.addEventListener(SYNC_EVENT, handler);
        return () => {
            window.removeEventListener("storage", handler);
            window.removeEventListener(SYNC_EVENT, handler);
        };
    },
};

// Extracted purely to get non-role ID and Name details for applications mapping
const getLoggedInUser = () => {
    let userObj = {};
    try {
        const raw = localStorage.getItem("loggedInUser") || localStorage.getItem("user");
        if (raw) {
            const parsed = JSON.parse(raw);
            userObj = parsed?.user || parsed?.data || parsed;
        }
    } catch (e) {
        userObj = {};
    }

    return {
        id: userObj.id || userObj.userId || userObj.username || "u-local",
        name: userObj.name || userObj.fullName || userObj.username || "User",
        phone: userObj.phone || "+91 90000 00000",
        panchayathName: userObj.panchayathName || "Pookkottumpadam Grama Panchayath",
    };
};

export default function SchemeApplication({ userRole, wardName }) {
    // ------------------------------------------------------------------
    // Strict Role and Ward extraction from Props
    // ------------------------------------------------------------------
    const role = String(userRole || "").toLowerCase().trim();
    const isCitizen = role === "citizen";
    const isWardMember = role === "ward";
    const isPanchayath = role === "panchayat";

    const currentWard = String(wardName || "").trim();
    const normalizedCurrentWard = normalizeWard(currentWard);

    // ------------------------------------------------------------------
    // Local State
    // ------------------------------------------------------------------
    const initialUser = getLoggedInUser();
    const [currentUser] = useState({ id: initialUser.id, name: initialUser.name });
    const [panchayathName] = useState(initialUser.panchayathName);

    const [schemes, setSchemes] = useState([]);
    const [applications, setApplications] = useState([]);
    const [wardInbox, setWardInbox] = useState([]);
    const [panchayathInbox, setPanchayathInbox] = useState([]);
    const [history, setHistory] = useState([]);
    
    const [toast, setToast] = useState(null);
    const [showNewSchemeForm, setShowNewSchemeForm] = useState(false);
    const [newScheme, setNewScheme] = useState({
        name: "", category: "", description: "", deadline: "",
        requiredDocs: "", requiredDetails: "", eligibilityScore: 90, aiConfidence: 92,
    });

    const [selectedAppId, setSelectedAppId] = useState(null);
    const [query, setQuery] = useState("");
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [uploadingDocKey, setUploadingDocKey] = useState(null);
    const [applyModalScheme, setApplyModalScheme] = useState(null);
    const [applyForm, setApplyForm] = useState({ name: currentUser.name, age: "", extra: {} });
    const [generatedAiApps, setGeneratedAiApps] = useState({});
    const [generatingAiFor, setGeneratingAiFor] = useState(null);
    const [viewingDoc, setViewingDoc] = useState(null);

    useEffect(() => {
        const refresh = () => {
            setSchemes(schemeStore.getSchemes());
            setApplications(schemeStore.getApplications());
            setWardInbox(schemeStore.getWardInbox());
            setPanchayathInbox(schemeStore.getPanchayathInbox());
            setHistory(schemeStore.getHistory());
        };

        refresh();
        const unsubscribe = schemeStore.subscribe(refresh);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 4000); 
        return () => clearTimeout(t);
    }, [toast]);

    // ------------------------------------------------------------------
    // Filtering Logic
    // ------------------------------------------------------------------
    const myApplications = applications.filter((a) => a.applicantId === currentUser.id);
    
    // Filtering ensures backward compatibility handling `m.wardName || m.ward`
    const myWardInbox = wardInbox.filter((m) => normalizeWard(m.wardName || m.ward) === normalizedCurrentWard);

    const wardQueue = applications.filter(
        (app) =>
            normalizeWard(app.wardName || app.ward) === normalizedCurrentWard &&
            app.status === "submitted"
    );
    const panchayathQueue = applications.filter((a) => a.status === "under_review");

    const listForRole = isCitizen ? myApplications : isWardMember ? wardQueue : isPanchayath ? panchayathQueue : [];
    const filteredList = listForRole.filter((a) =>
        `${a.schemeName} ${a.applicantName}`.toLowerCase().includes(query.toLowerCase())
    );

    const selectedApp = applications.find((a) => a.id === selectedAppId) || null;

    // ------------------------------------------------------------------
    // Actions
    // ------------------------------------------------------------------
    const handleOpenApply = (scheme) => {
        if (myApplications.some((a) => a.schemeId === scheme.id)) {
            setToast("You've already applied for this scheme.");
            return;
        }
        const extra = Object.fromEntries((scheme.requiredDetails || []).map((f) => [f, ""]));
        setApplyForm({ name: currentUser.name || "", age: "", extra });
        setApplyModalScheme(scheme);
    };

    const handleConfirmApply = (e) => {
        e.preventDefault();
        const scheme = applyModalScheme;
        if (!scheme) return;

        const nameStr = String(applyForm.name || "");
        const ageStr = String(applyForm.age || "");

        if (!nameStr.trim() || !ageStr.trim()) {
            setToast("Name and age are required.");
            return;
        }

        const requiredDetails = scheme.requiredDetails || [];
        const missingRequired = requiredDetails.some((f) => !applyForm.extra[f] || !String(applyForm.extra[f]).trim());
        
        if (missingRequired) {
            setToast("Please fill in all required details.");
            return;
        }

        const requiredDocs = scheme.requiredDocs || [];
        const documents = requiredDocs.map((name, i) => ({
            id: `d${i + 1}`,
            name,
            status: "missing",
        }));
        
        const newApp = {
            id: `APP-${Date.now()}`,
            applicantId: currentUser.id,
            applicantName: nameStr.trim(),
            applicantAge: ageStr.trim(),
            applicantDetails: applyForm.extra,
            wardName: currentWard,
            schemeId: scheme.id,
            schemeName: scheme.name,
            schemeCategory: scheme.category,
            breadcrumb: scheme.breadcrumb,
            deadline: scheme.deadline,
            description: scheme.description,
            matchPercent: scheme.eligibilityScore,
            eligibilityScore: scheme.eligibilityScore,
            aiConfidence: scheme.aiConfidence,
            status: "action_required",
            step: 2,
            documents,
            aiLetter: buildAiLetter({
                citizenName: nameStr.trim(),
                wardName: currentWard,
                scheme,
                age: ageStr.trim(),
                extraDetails: applyForm.extra,
            }),
        };

        schemeStore.addApplication(newApp);
        setSelectedAppId(newApp.id);
        setApplyModalScheme(null);
        setToast(`Applied to ${scheme.name}. Please upload required documents.`);
    };

    const handleUploadDocument = (app, docId, file) => {
        if (!file) return;
        const key = `${app.id}:${docId}`;
        setUploadingDocKey(key);

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result;

            schemeStore.updateApplication(app.id, (a) => ({
                documents: a.documents.map((d) =>
                    d.id === docId ? { ...d, status: "uploaded", fileName: file.name, fileType: file.type, fileData: base64data } : d
                ),
            }));

            setTimeout(() => {
                const updated = schemeStore.updateApplication(app.id, (a) => ({
                    documents: a.documents.map((d) => (d.id === docId ? { ...d, status: "verified" } : d)),
                }));
                const nowAllVerified = updated?.documents?.every((d) => d.status === "verified");
                if (nowAllVerified && updated.step < 3) {
                    schemeStore.updateApplication(app.id, { step: 3 }); 
                }
                setUploadingDocKey(null);
                setToast(nowAllVerified ? "All documents uploaded! Ready to submit." : "Document uploaded.");
            }, 600);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveDocument = (app, docId) => {
        const updated = schemeStore.updateApplication(app.id, (a) => ({
            documents: a.documents.map((d) =>
                d.id === docId ? { id: d.id, name: d.name, status: "missing" } : d
            ),
        }));

        const isStillAllVerified = updated.documents.every(d => d.status === "verified");
        if (!isStillAllVerified && updated.step === 3) {
            schemeStore.updateApplication(app.id, { step: 2 });
        }
    };

    const handleDeleteApplication = (id) => {
        if (!window.confirm("Are you sure you want to withdraw/delete this application?")) return;
        schemeStore.deleteApplication(id);
        setToast("Application withdrawn successfully.");
        setSelectedAppId(null);
    };

    const handleDownloadLetter = (app) => {
        const deadline = new Date(Date.now() + 14 * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const sealImageUrl = "https://atxp-chat-assets.s3.us-east-2.amazonaws.com/images/6a7361059e489608e7815cb2/5d9331c5-fbc5-4416-a83c-5b80cad3c91f__Screenshot_2026-08-05_223631.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAS74TMEBZZJBJXK7G%2F20260805%2Fus-east-2%2Fs3%2Faws4_request&X-Amz-Date=20260805T170803Z&X-Amz-Expires=1800&X-Amz-Signature=91e2f5cd3938add3487ebc3646d2f237e2452a27cf4ca0329840336d85de1ec2&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject";

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Approval_Letter_${app.schemeName.replace(/\s+/g, '_')}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1f2a24; line-height: 1.6; max-width: 800px; margin: 0 auto; position: relative; }
                    .watermark-seal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 450px; opacity: 0.12; z-index: -1; pointer-events: none; }
                    .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 40px; }
                    .header h1 { color: #10b981; margin: 0 0 10px 0; font-size: 28px; }
                    .header p { margin: 0; font-size: 16px; color: #5b6b62; }
                    .date { text-align: right; margin-bottom: 30px; font-weight: bold; }
                    .recipient { margin-bottom: 30px; }
                    .subject { font-weight: bold; margin-bottom: 30px; padding: 10px; background-color: #f4faf6; border-left: 4px solid #10b981; }
                    .body-text { margin-bottom: 40px; text-align: justify; position: relative; z-index: 1; }
                    .footer { margin-top: 60px; text-align: right; }
                    .footer p { margin: 5px 0; }
                    .signature { font-weight: bold; font-size: 18px; margin-top: 40px !important; }
                    @media print { body { padding: 0; } @page { margin: 2cm; } .watermark-seal { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <img src="${sealImageUrl}" class="watermark-seal" alt="Approved Seal Watermark" />
                <div class="header">
                    <h1>Official Approval Letter</h1>
                    <p>${panchayathName}</p>
                </div>
                <div class="date">Date: ${nowDate()}</div>
                <div class="recipient">
                    <strong>To,</strong><br/>
                    ${app.applicantName}<br/>
                    ${app.wardName || app.ward}
                </div>
                <div class="subject">Subject: Approval for ${app.schemeName}</div>
                <div class="body-text">
                    <p>Dear ${app.applicantName},</p>
                    <p>We are pleased to inform you that your application for the <strong>${app.schemeName}</strong> has been successfully approved by the Panchayath committee.</p>
                    <p>Please visit the Panchayath office before <strong>${deadline}</strong> with this printed letter and your original identity documents for further processing and disbursement.</p>
                </div>
                <div class="footer">
                    <p>Yours faithfully,</p>
                    <p class="signature">Secretary</p>
                    <p>${panchayathName}</p>
                </div>
                <script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 250); };</script>
            </body>
            </html>
        `);
        printWindow.document.close();
        setToast("Opening PDF Document...");
    };

    const handleSubmitApplication = (app) => {
        schemeStore.updateApplication(app.id, {
            status: "submitted",
            step: 4,
        });

        schemeStore.addWardMessage({
            id: Date.now(),
            applicationId: app.id,
            wardName: app.wardName || app.ward,
            to: `Ward Member — ${app.wardName || app.ward}`,
            text: `📄 New application: ${app.applicantName} submitted "${app.schemeName}". Please verify and forward.`,
            time: "Just now",
        });
    }

    const handleWardForward = (app) => {
        schemeStore.updateApplication(app.id, { status: "under_review", step: 5 });
        schemeStore.addPanchayathNotification({
            id: Date.now(),
            applicationId: app.id,
            text: `${app.applicantName} (${app.wardName || app.ward}) — "${app.schemeName}" verified by Ward Member, ready for final review.`,
            time: "Just now",
        });
        setToast("Verified and forwarded to Panchayath.");
        setSelectedAppId(null);
    };

    const handleWardReject = (app, reason) => {
        schemeStore.updateApplication(app.id, { status: "rejected", rejectReason: reason });
        schemeStore.addHistory({
            id: Date.now(),
            applicantName: app.applicantName,
            wardName: app.wardName || app.ward,
            schemeName: app.schemeName,
            decision: "REJECTED",
            reason,
            time: nowDate(),
        });
        setToast("Application rejected and sent back to citizen.");
        setSelectedAppId(null);
        setRejectTarget(null);
        setRejectReason("");
    };

    const handleApprove = (app) => {
        schemeStore.updateApplication(app.id, { status: "approved", step: 6 });
        schemeStore.addHistory({
            id: Date.now(),
            applicantName: app.applicantName,
            wardName: app.wardName || app.ward,
            schemeName: app.schemeName,
            decision: "APPROVED",
            time: nowDate(),
        });
        setToast(`${app.applicantName}'s application approved.`);
        setSelectedAppId(null);
    };

    const handlePanchayathReject = (app, reason) => {
        schemeStore.updateApplication(app.id, { status: "rejected", rejectReason: reason });
        schemeStore.addHistory({
            id: Date.now(),
            applicantName: app.applicantName,
            wardName: app.wardName || app.ward,
            schemeName: app.schemeName,
            decision: "REJECTED",
            reason,
            time: nowDate(),
        });
        setToast("Application rejected.");
        setSelectedAppId(null);
        setRejectTarget(null);
        setRejectReason("");
    };

    const handleAddScheme = (e) => {
        e.preventDefault();
        if (!newScheme.name.trim() || !newScheme.category.trim() || !newScheme.requiredDocs.trim()) {
            setToast("Scheme name, category, and required documents are required.");
            return;
        }
        const docs = newScheme.requiredDocs.split(",").map((d) => d.trim()).filter(Boolean);
        const details = newScheme.requiredDetails.split(",").map((d) => d.trim()).filter(Boolean);
        const scheme = {
            id: `SCH-${Date.now()}`,
            name: newScheme.name.trim(),
            category: newScheme.category.trim(),
            breadcrumb: ["Welfare Schemes", newScheme.category.trim(), newScheme.name.trim()],
            deadline: newScheme.deadline.trim() || "Rolling",
            description: newScheme.description.trim() || "No description provided.",
            eligibilityScore: Number(newScheme.eligibilityScore) || 90,
            aiConfidence: Number(newScheme.aiConfidence) || 92,
            requiredDocs: docs,
            requiredDetails: details,
            reasonLine: `I meet the eligibility criteria published for the ${newScheme.name.trim()} scheme.`,
        };
        schemeStore.addScheme(scheme);
        setNewScheme({ name: "", category: "", description: "", deadline: "", requiredDocs: "", requiredDetails: "", eligibilityScore: 90, aiConfidence: 92 });
        setShowNewSchemeForm(false);
        setToast(`"${scheme.name}" added to the scheme catalog.`);
    };

    const handleDeleteScheme = (id, name) => {
        if (!window.confirm(`Remove "${name}" from the scheme catalog? Existing applications are unaffected.`)) return;
        schemeStore.deleteScheme(id);
        setToast(`"${name}" removed from the scheme catalog.`);
    };

    const Timeline = ({ app }) => (
        <div className="sch-card sch-timeline-card">
            <h4>🗂️ Status Timeline</h4>
            {!app ? (
                <p className="sch-empty">Select an application to see its progress.</p>
            ) : (
                <div className="sch-timeline">
                    {buildTimelineForStep(app.step).map((s) => (
                        <div key={s.step} className={`sch-time-item ${getTimelineClass(app, s.step)}`}>
                            <div className={`sch-dot ${getDotClass(app, s.step)} ${app.step === s.step && app.status !== "rejected" ? "pulse-dot" : ""}`} />
                            <div className="sch-time-text">
                                <strong>{s.label}</strong>
                                {app.step === s.step && app.status !== "approved" && app.status !== "rejected" && (
                                    <span>{s.waitingText}</span>
                                )}
                                {app.step === s.step && app.status === "rejected" && (
                                    <span style={{ color: '#d97706', fontSize: '12px' }}>Application Rejected.</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const DecisionHistory = ({ title, rows }) => (
        <div className="sch-card sch-history-card">
            <h4>{title}</h4>
            <div className="sch-history-list">
                {rows.length === 0 && <p className="sch-empty">No decisions yet.</p>}
                {rows.map((h) => (
                    <div key={h.id} className="sch-history-item">
                        <div>
                            <strong>{h.applicantName}</strong>
                            <span className="sch-history-meta">{h.schemeName} · {h.wardName || h.ward} · {h.time}</span>
                        </div>
                        <span className={`sch-tag ${h.decision === "APPROVED" ? "sch-tag-green" : "sch-tag-red"}`}>
                            {h.decision}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );

    const docsDone = (app) => app?.documents?.filter((d) => d.status === "verified" || d.status === "uploaded").length ?? 0;
    const docsTotal = (app) => app?.documents?.length ?? 0;
    const allVerified = (app) => docsTotal(app) > 0 && app.documents.every((d) => d.status === "verified");

    const AiLetterCard = ({ app, footer }) => (
        <div className="sch-card sch-letter-card">
            <div className="sch-letter-head">✨ AI Generated Application</div>
            <div className="sch-letter-body">
                <p className="sch-letter-date">Date: {app.aiLetter.date}</p>
                <p>To,<br />{app.aiLetter.to}</p>
                <p className="sch-letter-subject">Subject: {app.aiLetter.subject}</p>
                <p>Respected Sir/Madam,</p>
                {app.aiLetter.body
                    .split("\n\n")
                    .filter((p) => p !== "Respected Sir/Madam,")
                    .map((para, i) => (
                        <p key={i}>{para}</p>
                    ))}
                <p className="sch-letter-signoff">{app.aiLetter.signOff}</p>
                <p className="sch-letter-signoff-title">{app.aiLetter.signOffTitle}</p>
            </div>
            <div className="sch-letter-footer">{footer}</div>
        </div>
    );

    return (
        <div className="sch-container">
            {toast && <div className="sch-toast" style={{ zIndex: 99999 }}>{toast}</div>}

            {/* Document Preview Modal */}
            {viewingDoc && (
                <div className="sch-modal-overlay" onClick={() => setViewingDoc(null)} style={{ zIndex: 9999 }}>
                    <div className="sch-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3>Document Viewer: {viewingDoc.name}</h3>
                            <button onClick={() => setViewingDoc(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>
                        </div>
                        <p style={{ marginTop: '-10px', fontSize: '13px', color: '#5b6b62' }}>File: {viewingDoc.fileName}</p>

                        <div style={{ background: '#f9fafa', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', textAlign: 'center', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {viewingDoc.fileType?.startsWith("image/") ? (
                                <img src={viewingDoc.fileData} alt={viewingDoc.name} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
                            ) : viewingDoc.fileType === "application/pdf" ? (
                                <iframe src={viewingDoc.fileData} title={viewingDoc.name} style={{ width: '100%', height: '60vh', border: 'none' }} />
                            ) : (
                                <div>
                                    <p>Preview not available for this file format.</p>
                                    <a href={viewingDoc.fileData} download={viewingDoc.fileName} style={{ display: 'inline-block', marginTop: '10px', padding: '8px 16px', background: '#10b981', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>
                                        Download File
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Apply Modal */}
            {applyModalScheme && (
                <div className="sch-modal-overlay" onClick={() => setApplyModalScheme(null)} style={{ zIndex: 9999 }}>
                    <div className="sch-modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3>Apply — {applyModalScheme.name}</h3>
                        <p className="sch-modal-sub">Confirm your details before we generate your application.</p>
                        
                        <form className="sch-modal-form" onSubmit={handleConfirmApply} noValidate>
                            <label>
                                Full Name
                                <input
                                    value={applyForm.name}
                                    onChange={(e) => setApplyForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="Your full name"
                                    required
                                />
                            </label>
                            <label>
                                Age
                                <input
                                    type="number"
                                    min="0"
                                    max="120"
                                    value={applyForm.age}
                                    onChange={(e) => setApplyForm((f) => ({ ...f, age: e.target.value }))}
                                    placeholder="Your age"
                                    required
                                />
                            </label>
                            {(applyModalScheme.requiredDetails || []).map((field) => (
                                <label key={field}>
                                    {field}
                                    <input
                                        value={applyForm.extra[field] || ""}
                                        onChange={(e) =>
                                            setApplyForm((f) => ({ ...f, extra: { ...f.extra, [field]: e.target.value } }))
                                        }
                                        placeholder={field}
                                        required
                                    />
                                </label>
                            ))}
                            <div className="sch-modal-actions">
                                <button type="button" className="sch-cancel-btn" onClick={() => setApplyModalScheme(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="sch-approve-btn">Continue →</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============== CITIZEN ============== */}
            {isCitizen && (
                <>
                    <div className="sch-header-section">
                        <h2>Welfare Schemes</h2>
                        <p>Apply for government schemes, track your applications, and let AI draft your letter.</p>
                    </div>

                    <div className="sch-section-title">Available Schemes</div>
                    <div className="sch-scheme-grid">
                        {schemes.map((s) => {
                            const myApp = myApplications.find((a) => a.schemeId === s.id);
                            const isRejected = myApp?.status === "rejected";
                            return (
                                <div key={s.id} className={`sch-scheme-card ${myApp?.id === selectedApp?.id ? "active" : ""}`}>
                                    <div className="sch-scheme-card-top">
                                        <strong>{s.name}</strong>
                                        {!isRejected && (
                                            <span className="sch-tag sch-tag-purple">{s.eligibilityScore}% Eligible</span>
                                        )}
                                    </div>
                                    <p>{s.description}</p>
                                    <p className="sch-scheme-hint">Based on your profile — you'll still need to upload the required documents.</p>
                                    {myApp && (
                                        <div className="sch-list-item-bottom-row">
                                            <span className={`sch-status-pill status-${myApp.status}`}>{myApp.status.replace("_", " ")}</span>
                                            {myApp.documents?.length > 0 && (
                                                <span className="sch-doc-progress">
                                                    📄 {myApp.documents.filter((d) => d.status === "verified" || d.status === "uploaded").length}/{myApp.documents.length} docs
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="sch-scheme-card-bottom">
                                        <span className="sch-deadline-pill">Deadline: {s.deadline}</span>
                                        {myApp ? (
                                            <button
                                                className="sch-apply-btn sch-view-btn"
                                                onClick={() => setSelectedAppId(selectedAppId === myApp.id ? null : myApp.id)}
                                            >
                                                {selectedAppId === myApp.id ? "Hide Application" : "View Application"}
                                            </button>
                                        ) : (
                                            <button className="sch-apply-btn" onClick={() => handleOpenApply(s)}>
                                                Apply
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="sch-main-grid sch-main-grid-2col">
                        <div className="sch-mid-col">
                            {!selectedApp ? (
                                <div className="sch-card"><p className="sch-empty">Apply to a scheme or click "View Application" to see details here.</p></div>
                            ) : (
                                <>
                                    {selectedApp.status === 'rejected' && (
                                        <div className="sch-card" style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171' }}>
                                            <h4 style={{ color: '#991b1b', marginTop: 0 }}>❌ Application Rejected</h4>
                                            <p style={{ color: '#991b1b', marginBottom: 0 }}>
                                                <strong>Reason:</strong> {selectedApp.rejectReason || "Not specified"}
                                            </p>
                                        </div>
                                    )}

                                    {selectedApp.status === 'approved' && (
                                        <div className="sch-card sch-letter-card" style={{ border: '2px solid #10b981' }}>
                                            <div className="sch-letter-head" style={{ background: '#10b981', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>✅ Official Approval Letter</span>
                                                <button
                                                    onClick={() => handleDownloadLetter(selectedApp)}
                                                    title="Download as PDF"
                                                    style={{ background: 'rgba(255, 255, 255, 0.25)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                                >
                                                    ⬇️ Download PDF
                                                </button>
                                            </div>
                                            <div className="sch-letter-body">
                                                <p className="sch-letter-date">Date: {nowDate()}</p>
                                                <p>To,<br />{selectedApp.applicantName}<br />{selectedApp.wardName || selectedApp.ward}</p>
                                                <p className="sch-letter-subject">Subject: Approval for {selectedApp.schemeName}</p>
                                                <p>Dear {selectedApp.applicantName},</p>
                                                <p>We are pleased to inform you that your application for the <strong>{selectedApp.schemeName}</strong> has been successfully approved.</p>
                                                <p>Please visit the Panchayath office before <strong>{new Date(Date.now() + 14 * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong> with this letter and your original documents for further processing.</p>
                                                <br />
                                                <p className="sch-letter-signoff">Secretary</p>
                                                <p className="sch-letter-signoff-title">{panchayathName}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="sch-card sch-docs-card">
                                        <div className="sch-docs-head">
                                            <h4>Required Documents</h4>
                                            <span>{docsDone(selectedApp)}/{docsTotal(selectedApp)} Uploaded</span>
                                        </div>
                                        <div className="sch-progress-track">
                                            <div className="sch-progress-fill" style={{ width: `${(docsDone(selectedApp) / docsTotal(selectedApp)) * 100}%` }} />
                                        </div>
                                        <ul className="sch-doc-list">
                                            {selectedApp.documents.map((d) => (
                                                <li key={d.id} className="sch-doc-row">
                                                    <span>
                                                        {d.name}
                                                        {d.fileName && d.status !== "missing" && (
                                                            <span className="sch-doc-filename"> · {d.fileName}</span>
                                                        )}
                                                    </span>

                                                    {d.status === "missing" || d.status === "pending" ? (
                                                        <label className="sch-upload-pill">
                                                            {uploadingDocKey === `${selectedApp.id}:${d.id}` ? "Uploading…" : "Upload"}
                                                            <input
                                                                type="file"
                                                                hidden
                                                                disabled={uploadingDocKey === `${selectedApp.id}:${d.id}`}
                                                                onChange={(e) => handleUploadDocument(selectedApp, d.id, e.target.files?.[0])}
                                                            />
                                                        </label>
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span className={`sch-status-pill status-${d.status}`}>{d.status}</span>

                                                            {selectedApp.status === "action_required" && (
                                                                <button
                                                                    onClick={() => handleRemoveDocument(selectedApp, d.id)}
                                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}
                                                                    title="Remove Document"
                                                                >
                                                                    🗑️ Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {selectedApp.status === "action_required" && !generatedAiApps[selectedApp.id] ? (
                                        <div className="sch-card sch-letter-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                            <h4>AI Application Draft</h4>
                                            <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '13px' }}>
                                                Let AI generate a formal application letter based on your details to submit to the Panchayath.
                                            </p>
                                            <button
                                                className="sch-apply-btn"
                                                disabled={generatingAiFor === selectedApp.id}
                                                onClick={() => {
                                                    const currentId = selectedApp.id;
                                                    setGeneratingAiFor(currentId);
                                                    setTimeout(() => {
                                                        setGeneratedAiApps((prev) => ({ ...prev, [currentId]: true }));
                                                        setGeneratingAiFor(null);
                                                    }, 3000);
                                                }}
                                            >
                                                {generatingAiFor === selectedApp.id ? "⏳ Generating Application..." : "✨ Generate Application"}
                                            </button>
                                        </div>
                                    ) : (
                                        <AiLetterCard
                                            app={selectedApp}
                                            footer={
                                                selectedApp.status === "approved" ? (
                                                    <span className="sch-tag sch-tag-green">Approved</span>
                                                ) : selectedApp.status === "rejected" ? (
                                                    <span className="sch-tag sch-tag-red">Rejected</span>
                                                ) : selectedApp.status === "action_required" ? (
                                                    <button
                                                        className="sch-submit-btn"
                                                        disabled={!allVerified(selectedApp)}
                                                        onClick={() => handleSubmitApplication(selectedApp)}
                                                        title={!allVerified(selectedApp) ? "Verify all documents first" : ""}
                                                    >
                                                        Submit Application →
                                                    </button>
                                                ) : (
                                                    <span className="sch-tag sch-tag-blue">Awaiting Review</span>
                                                )
                                            }
                                        />
                                    )}
                                </>
                            )}
                        </div>

                        <div className="sch-right-col">
                            {selectedApp && selectedApp.step < 4 && selectedApp.status !== "rejected" && selectedApp.status !== "approved" && (
                                <button
                                    className="sch-reject-btn"
                                    style={{ width: '100%', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}
                                    onClick={() => handleDeleteApplication(selectedApp.id)}
                                >
                                    🗑️ Withdraw Application
                                </button>
                            )}
                            <Timeline app={selectedApp} />
                            <DecisionHistory title="⏱️ Recent Decisions" rows={history.filter((h) => h.applicantName === currentUser.name)} />
                        </div>
                    </div>
                </>
            )}

            {/* ============== WARD MEMBER ============== */}
            {isWardMember && (
                <>
                    <div className="sch-header-section">
                        <h2>Ward Scheme Verification</h2>
                        {!currentWard ? (
                            <p style={{ color: "red", fontWeight: "bold" }}>Ward information is missing for this account.</p>
                        ) : (
                            <p>{currentUser.name} — review submitted applications for {currentWard} before forwarding to Panchayath.</p>
                        )}
                    </div>

                    {currentWard && (
                        <div className="sch-main-grid">
                            <div className="sch-left-col">
                                <div className="sch-card">
                                    <h4>📩 Messages — {currentWard}</h4>
                                    {myWardInbox.length === 0 ? (
                                        <p className="sch-empty">No messages yet.</p>
                                    ) : (
                                        <div className="sch-message-list">
                                            {myWardInbox.map((m) => (
                                                <div key={m.id} className="sch-message-bubble">
                                                    <div className="sch-message-meta"><span>To: {m.to}</span><span>{m.time}</span></div>
                                                    <p>{m.text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="sch-list-head"><h3>Pending Verification</h3></div>
                                <div className="sch-list">
                                    {wardQueue.length === 0 && <p className="sch-empty">No applications waiting for review in {currentWard}.</p>}
                                    {wardQueue.map((a) => (
                                        <button
                                            key={a.id}
                                            className={`sch-list-item ${a.id === selectedApp?.id ? "active" : ""}`}
                                            onClick={() => setSelectedAppId(selectedAppId === a.id ? null : a.id)}
                                        >
                                            <div className="sch-list-item-top">
                                                <span>{a.schemeName}</span>
                                                {a.status !== "rejected" && (
                                                    <span className="sch-tag sch-tag-purple">{a.matchPercent}% Eligible</span>
                                                )}
                                            </div>
                                            <span className="sch-applicant">{a.applicantName}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="sch-mid-col">
                                {!selectedApp ? (
                                    <div className="sch-card"><p className="sch-empty">Select an application from the queue to review it.</p></div>
                                ) : (
                                    <>
                                        <div className="sch-card sch-docs-card">
                                            <h4>{selectedApp.schemeName} — {selectedApp.applicantName}</h4>
                                            <ul className="sch-doc-list">
                                                {selectedApp.documents.map((d) => (
                                                    <li key={d.id} className="sch-doc-row">
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {d.name}
                                                            {d.fileData && (
                                                                <a href="#" onClick={(e) => { e.preventDefault(); setViewingDoc(d); }} style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none', background: '#e6f0fb', padding: '3px 8px', borderRadius: '4px' }}>
                                                                    👁️ View File
                                                                </a>
                                                            )}
                                                        </span>
                                                        <span className={`sch-status-pill status-${d.status}`}>{d.status}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <AiLetterCard
                                            app={selectedApp}
                                            footer={
                                                rejectTarget === selectedApp.id ? (
                                                    <div className="sch-reject-box">
                                                        <input
                                                            placeholder="Reason for rejection..."
                                                            value={rejectReason}
                                                            onChange={(e) => setRejectReason(e.target.value)}
                                                        />
                                                        <button className="sch-reject-btn" disabled={!rejectReason.trim()} onClick={() => handleWardReject(selectedApp, rejectReason.trim())}>Confirm</button>
                                                        <button className="sch-cancel-btn" onClick={() => setRejectTarget(null)}>Cancel</button>
                                                    </div>
                                                ) : (
                                                    <div className="sch-admin-actions">
                                                        <button className="sch-reject-btn" onClick={() => setRejectTarget(selectedApp.id)}>✖ Reject</button>
                                                        <button className="sch-approve-btn" onClick={() => handleWardForward(selectedApp)}>✅ Confirm this student in this ward</button>
                                                    </div>
                                                )
                                            }
                                        />
                                    </>
                                )}
                            </div>

                            <div className="sch-right-col">
                                <Timeline app={selectedApp} />
                                <DecisionHistory title="⏱️ Recent Decisions" rows={history.filter((h) => normalizeWard(h.wardName || h.ward) === normalizedCurrentWard)} />
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ============== PANCHAYATH ============== */}
            {isPanchayath && (
                <>
                    <div className="sch-header-section">
                        <h2>Panchayath Scheme Approvals</h2>
                        <p>{panchayathName} — final review of ward-verified welfare scheme applications.</p>
                    </div>

                    <div className="sch-card sch-manage-schemes">
                        <div className="sch-docs-head">
                            <h4>📋 Manage Schemes</h4>
                            <button className="sch-apply-btn" onClick={() => setShowNewSchemeForm((v) => !v)}>
                                {showNewSchemeForm ? "Cancel" : "+ Add New Scheme"}
                            </button>
                        </div>

                        {showNewSchemeForm && (
                            <form className="sch-new-scheme-form" onSubmit={handleAddScheme}>
                                <div className="sch-form-row">
                                    <input
                                        placeholder="Scheme name (e.g. Free Bicycle Distribution)"
                                        value={newScheme.name}
                                        onChange={(e) => setNewScheme((s) => ({ ...s, name: e.target.value }))}
                                    />
                                    <input
                                        placeholder="Category (e.g. Education)"
                                        value={newScheme.category}
                                        onChange={(e) => setNewScheme((s) => ({ ...s, category: e.target.value }))}
                                    />
                                </div>
                                <textarea
                                    placeholder="Short description"
                                    value={newScheme.description}
                                    onChange={(e) => setNewScheme((s) => ({ ...s, description: e.target.value }))}
                                />
                                <input
                                    placeholder="Required documents, comma-separated"
                                    value={newScheme.requiredDocs}
                                    onChange={(e) => setNewScheme((s) => ({ ...s, requiredDocs: e.target.value }))}
                                />
                                <input
                                    placeholder="Additional required details, comma-separated — optional"
                                    value={newScheme.requiredDetails}
                                    onChange={(e) => setNewScheme((s) => ({ ...s, requiredDetails: e.target.value }))}
                                />
                                <div className="sch-form-row">
                                    <input
                                        placeholder="Deadline (e.g. 30 Dec 2023)"
                                        value={newScheme.deadline}
                                        onChange={(e) => setNewScheme((s) => ({ ...s, deadline: e.target.value }))}
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="Eligibility score %"
                                        value={newScheme.eligibilityScore}
                                        onChange={(e) => setNewScheme((s) => ({ ...s, eligibilityScore: e.target.value }))}
                                    />
                                </div>
                                <button type="submit" className="sch-approve-btn">Publish Scheme</button>
                            </form>
                        )}

                        <div className="sch-scheme-manage-list">
                            {schemes.map((s) => (
                                <div key={s.id} className="sch-scheme-manage-row">
                                    <div>
                                        <strong>{s.name}</strong>
                                        <span className="sch-history-meta"> · {s.category} · {s.requiredDocs.length} docs required</span>
                                    </div>
                                    <button className="sch-reject-btn" onClick={() => handleDeleteScheme(s.id, s.name)}>Remove</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="sch-main-grid">
                        <div className="sch-left-col">
                            <div className="sch-card">
                                <h4>🏛️ Notifications (All Wards)</h4>
                                {panchayathInbox.length === 0 ? (
                                    <p className="sch-empty">No notifications yet.</p>
                                ) : (
                                    <div className="sch-message-list">
                                        {panchayathInbox.map((n) => (
                                            <div key={n.id} className="sch-notif-bubble">
                                                <p>{n.text}</p>
                                                <span>{n.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="sch-list-head"><h3>Final Review Queue</h3></div>
                            <div className="sch-list">
                                {panchayathQueue.length === 0 && <p className="sch-empty">No applications waiting for final approval.</p>}
                                {panchayathQueue.map((a) => (
                                    <button
                                        key={a.id}
                                        className={`sch-list-item ${a.id === selectedApp?.id ? "active" : ""}`}
                                        onClick={() => setSelectedAppId(selectedAppId === a.id ? null : a.id)}
                                    >
                                        <div className="sch-list-item-top">
                                            <span>{a.schemeName}</span>
                                            {a.status !== "rejected" && (
                                                <span className="sch-tag sch-tag-purple">{a.matchPercent}% Eligible</span>
                                            )}
                                        </div>
                                        <span className="sch-applicant">{a.applicantName} · {a.wardName || a.ward}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="sch-mid-col">
                            {!selectedApp ? (
                                <div className="sch-card"><p className="sch-empty">Select an application from the queue to decide.</p></div>
                            ) : (
                                <>
                                    <div className="sch-card sch-docs-card">
                                        <h4>{selectedApp.schemeName} — {selectedApp.applicantName} ({selectedApp.wardName || selectedApp.ward})</h4>
                                        <ul className="sch-doc-list">
                                            {selectedApp.documents.map((d) => (
                                                <li key={d.id} className="sch-doc-row">
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {d.name}
                                                        {d.fileData && (
                                                            <a href="#" onClick={(e) => { e.preventDefault(); setViewingDoc(d); }} style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'none', background: '#e6f0fb', padding: '3px 8px', borderRadius: '4px' }}>
                                                                👁️ View File
                                                            </a>
                                                        )}
                                                    </span>
                                                    <span className={`sch-status-pill status-${d.status}`}>{d.status}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <AiLetterCard
                                        app={selectedApp}
                                        footer={
                                            rejectTarget === selectedApp.id ? (
                                                <div className="sch-reject-box">
                                                    <input
                                                        placeholder="Reason for rejection..."
                                                        value={rejectReason}
                                                        onChange={(e) => setRejectReason(e.target.value)}
                                                    />
                                                    <button className="sch-reject-btn" disabled={!rejectReason.trim()} onClick={() => handlePanchayathReject(selectedApp, rejectReason.trim())}>Confirm</button>
                                                    <button className="sch-cancel-btn" onClick={() => setRejectTarget(null)}>Cancel</button>
                                                </div>
                                            ) : (
                                                <div className="sch-admin-actions">
                                                    <button className="sch-reject-btn" onClick={() => setRejectTarget(selectedApp.id)}>✖ Reject</button>
                                                    <button className="sch-approve-btn" onClick={() => handleApprove(selectedApp)}>✅ Approve</button>
                                                </div>
                                            )
                                        }
                                    />
                                </>
                            )}
                        </div>

                        <div className="sch-right-col">
                            <Timeline app={selectedApp} />
                            <DecisionHistory title="⏱️ Recent Decisions (Panchayat Wide)" rows={history} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}