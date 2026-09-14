import React, { useState, useEffect } from "react";
import api from "../../axiosInstance";// 👈 1. Axios Instance ഇമ്പോർട്ട് ചെയ്തു
import "./Welfare.css";

const CATEGORY_OPTIONS = [
    "Education",
    "Livelihood",
    "Housing",
    "Agriculture",
    "Healthcare",
    "Pension",
    "Social Welfare"
];

const PREDEFINED_DOCS = [
    "Aadhaar Card",
    "Income Certificate",
    "Ration Card",
    "Land Ownership Proof",
    "Student ID",
    "Bank Passbook",
    "Passport Photo",
    "Property Tax Receipt"
];

const PREDEFINED_DETAILS = [
    "Class / Course",
    "Institution Name",
    "Annual Family Income",
    "Land Area (in cents)",
    "Crop Type",
    "Family Size",
    "Current Housing Status"
];

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
    if (app.step === stepNum) return app.status?.toLowerCase() === "rejected" ? "rejected-step" : "active";
    if (app.step > stepNum) return "completed";
    return "inactive";
}

function normalizeWard(value) {
    if (!value) return "";
    return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function buildAiLetter({ citizenName, wardName, scheme, age, extraDetails = {} }) {
    const detailLines = Object.entries(extraDetails)
        .filter(([, v]) => v && String(v).trim())
        .map(([k, v]) => `${k}: ${String(v).trim()}`);
    const detailsSentence = detailLines.length ? ` My ${detailLines.join(", ").toLowerCase()}.` : "";
    return {
        date: nowDate(),
        to: "The Secretary, Grama Panchayat Office, Ente Gramam.",
        subject: `Application for ${scheme.name} Scheme`,
        body: `Respected Sir/Madam,\n\nI, ${citizenName}, aged ${age || "N/A"}, residing at ${wardName}, respectfully submit this application for the ${scheme.name} Scheme. ${scheme.reasonLine || ""}${detailsSentence}\n\nI have attached all required documents for your kind perusal. I request you to consider my application favorably.\n\nYours faithfully,`,
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

const Timeline = ({ app }) => (
    <div className="sch-card sch-timeline-card">
        <h4>🗂️ Status Timeline</h4>
        {!app ? (
            <p className="sch-empty">Select an application to see its progress.</p>
        ) : (
            <div className="sch-timeline">
                {buildTimelineForStep(app.step).map((s) => (
                    <div key={s.step} className={`sch-time-item ${getTimelineClass(app, s.step)}`}>
                        <div className={`sch-dot ${getDotClass(app, s.step)} ${app.step === s.step && app.status?.toLowerCase() !== "rejected" ? "pulse-dot" : ""}`} />
                        <div className="sch-time-text">
                            <strong>{s.label}</strong>
                            {app.step === s.step && app.status?.toLowerCase() !== "approved" && app.status?.toLowerCase() !== "rejected" && (
                                <span>{s.waitingText}</span>
                            )}
                            {app.step === s.step && app.status?.toLowerCase() === "rejected" && (
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
                        <span className="sch-history-meta">{h.schemeName} · {h.wardName || h.ward} · {h.time ? new Date(h.time).toLocaleDateString() : ""}</span>
                    </div>
                    <span className={`sch-tag ${h.decision === "APPROVED" ? "sch-tag-green" : "sch-tag-red"}`}>
                        {h.decision}
                    </span>
                </div>
            ))}
        </div>
    </div>
);

const AiLetterCard = ({ app, footer }) => (
    <div className="sch-card sch-letter-card">
        <div className="sch-letter-head">✨ AI Generated Application</div>
        <div className="sch-letter-body">
            <p className="sch-letter-date">Date: {app.aiLetter?.date || nowDate()}</p>
            <p>To,<br />{app.aiLetter?.to}</p>
            <p className="sch-letter-subject">Subject: {app.aiLetter?.subject}</p>
            <p>Respected Sir/Madam,</p>
            {(app.aiLetter?.body || "")
                .split("\n\n")
                .filter((p) => p !== "Respected Sir/Madam,")
                .map((para, i) => (
                    <p key={i}>{para}</p>
                ))}
            <p className="sch-letter-signoff">{app.aiLetter?.signOff}</p>
            <p className="sch-letter-signoff-title">{app.aiLetter?.signOffTitle}</p>
        </div>
        <div className="sch-letter-footer">{footer}</div>
    </div>
);

export default function SchemeApplication({ userRole, wardName }) {
    const role = String(userRole || "").toLowerCase().trim();
    const isCitizen = role === "citizen";
    const isWardMember = role === "ward";
    const isPanchayath = role === "panchayat";

    const currentWard = String(wardName || "").trim();
    const normalizedCurrentWard = normalizeWard(currentWard);

    const initialUser = getLoggedInUser();
    const [currentUser] = useState({ id: initialUser.id, name: initialUser.name });
    const [panchayathName] = useState(initialUser.panchayathName);

    const [schemes, setSchemes] = useState([]);
    const [applications, setApplications] = useState([]);
    const [wardInbox, setWardInbox] = useState([]);
    const [panchayathInbox, setPanchayathInbox] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const [toast, setToast] = useState(null);
    const [showNewSchemeForm, setShowNewSchemeForm] = useState(false);

    const [newScheme, setNewScheme] = useState({
        name: "",
        category: CATEGORY_OPTIONS[0],
        description: "",
        deadline: "",
        selectedDocs: [],
        selectedDetails: [],
        eligibilityScore: 90,
        aiConfidence: 92,
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
        fetchAllData();
    }, []);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
    }, [toast]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // 👈 2. api.get ഉപയോഗിച്ച് വിവരങ്ങൾ ശേഖരിക്കുന്നു
            const [schemesRes, appsRes, wardInboxRes, panchayathInboxRes, historyRes] = await Promise.all([
                api.get("schemes/"),
                api.get("applications/"),
                api.get("ward-inbox/"),
                api.get("panchayath-inbox/"),
                api.get("history/")
            ]);

            setSchemes(schemesRes.data);
            setApplications(appsRes.data);
            setWardInbox(wardInboxRes.data);
            setPanchayathInbox(panchayathInboxRes.data);
            setHistory(historyRes.data);
        } catch (error) {
            console.error("Error connecting to backend API:", error);
            setToast("Failed to sync data with server.");
        } finally {
            setLoading(false);
        }
    };

    const myApplications = applications.filter(
        (a) => String(a.applicantId) === String(currentUser.id)
    );

    const isAlreadyApplied = (schemeId) => {
        return myApplications.some(
            (a) => String(a.schemeId) === String(schemeId) && a.status?.toLowerCase() !== "rejected"
        );
    };

    const myWardInbox = wardInbox.filter((m) => normalizeWard(m.wardName || m.ward) === normalizedCurrentWard);

    const wardQueue = applications.filter(
        (app) => normalizeWard(app.wardName || app.ward) === normalizedCurrentWard && app.status?.toLowerCase() === "submitted"
    );
    const panchayathQueue = applications.filter((a) => a.status?.toLowerCase() === "under_review");

    const filteredSchemes = schemes.filter((s) =>
        `${s.name} ${s.category} ${s.description}`.toLowerCase().includes(query.toLowerCase())
    );

    const filteredWardQueue = wardQueue.filter((a) =>
        `${a.schemeName} ${a.applicantName}`.toLowerCase().includes(query.toLowerCase())
    );

    const filteredPanchayathQueue = panchayathQueue.filter((a) =>
        `${a.schemeName} ${a.applicantName} ${a.wardName || a.ward}`.toLowerCase().includes(query.toLowerCase())
    );

    const selectedApp = applications.find((a) => a.id === selectedAppId) || null;

    const toggleDocSelection = (docName) => {
        setNewScheme((prev) => {
            const exists = prev.selectedDocs.includes(docName);
            return {
                ...prev,
                selectedDocs: exists
                    ? prev.selectedDocs.filter((d) => d !== docName)
                    : [...prev.selectedDocs, docName]
            };
        });
    };

    const toggleDetailSelection = (detailName) => {
        setNewScheme((prev) => {
            const exists = prev.selectedDetails.includes(detailName);
            return {
                ...prev,
                selectedDetails: exists
                    ? prev.selectedDetails.filter((d) => d !== detailName)
                    : [...prev.selectedDetails, detailName]
            };
        });
    };

    const handleOpenApply = (scheme) => {
        if (isAlreadyApplied(scheme.id)) {
            setToast("You have already submitted an application for this scheme.");
            return;
        }
        const extra = Object.fromEntries((scheme.requiredDetails || []).map((f) => [f, ""]));
        setApplyForm({ name: currentUser.name || "", age: "", extra });
        setApplyModalScheme(scheme);
    };

    const handleConfirmApply = async (e) => {
        e.preventDefault();
        const scheme = applyModalScheme;
        if (!scheme) return;

        if (isAlreadyApplied(scheme.id)) {
            setToast("You have already applied for this scheme.");
            setApplyModalScheme(null);
            return;
        }

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
            fileName: "",
            fileType: "",
            fileData: ""
        }));

        const payload = {
            id: `APP-${Date.now()}`,
            applicantId: String(currentUser.id),
            applicantName: nameStr.trim(),
            applicantAge: ageStr.trim(),
            applicantDetails: applyForm.extra,
            wardName: currentWard || "Ward 1",
            schemeId: String(scheme.id),
            schemeName: scheme.name,
            schemeCategory: scheme.category,
            breadcrumb: scheme.breadcrumb || [],
            deadline: scheme.deadline || "",
            description: scheme.description || "",
            matchPercent: scheme.eligibilityScore || 90,
            eligibilityScore: scheme.eligibilityScore || 90,
            aiConfidence: scheme.aiConfidence || 92,
            status: "action_required",
            step: 2,
            rejectReason: "",
            aiLetter: buildAiLetter({
                citizenName: nameStr.trim(),
                wardName: currentWard || "Ward 1",
                scheme,
                age: ageStr.trim(),
                extraDetails: applyForm.extra,
            }),
            documents
        };

        try {
            const res = await api.post("applications/", payload);
            setApplications([res.data, ...applications]);
            setSelectedAppId(res.data.id);
            setApplyModalScheme(null);
            setToast(`Applied to ${scheme.name}. Please upload required documents.`);
        } catch (err) {
            setToast("Failed to submit application.");
        }
    };

    const handleUploadDocument = (app, docId, file) => {
        if (!file) return;
        const key = `${app.id}:${docId}`;
        setUploadingDocKey(key);

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64data = reader.result;

            const updatedDocs = app.documents.map((d) =>
                d.id === docId ? { ...d, status: "uploaded", fileName: file.name, fileType: file.type, fileData: base64data } : d
            );

            try {
                const res = await api.put(`applications/${app.id}/`, { ...app, documents: updatedDocs });
                setApplications(prev => prev.map(a => a.id === app.id ? res.data : a));

                setTimeout(async () => {
                    const verifiedDocs = updatedDocs.map((d) => (d.id === docId ? { ...d, status: "verified" } : d));
                    const nowAllVerified = verifiedDocs.every((d) => d.status === "verified");
                    const nextStep = nowAllVerified && app.step < 3 ? 3 : app.step;

                    const finalRes = await api.put(`applications/${app.id}/`, {
                        ...app,
                        step: nextStep,
                        documents: verifiedDocs
                    });

                    setApplications(prev => prev.map(a => a.id === app.id ? finalRes.data : a));
                    setUploadingDocKey(null);
                    setToast(nowAllVerified ? "All documents uploaded! Ready to submit." : "Document uploaded.");
                }, 600);
            } catch (err) {
                setUploadingDocKey(null);
                setToast("Failed to upload document.");
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveDocument = async (app, docId) => {
        const updatedDocs = app.documents.map((d) =>
            d.id === docId ? { id: d.id, name: d.name, status: "missing", fileName: "", fileType: "", fileData: "" } : d
        );

        const isStillAllVerified = updatedDocs.every(d => d.status === "verified");
        const nextStep = !isStillAllVerified && app.step === 3 ? 2 : app.step;

        try {
            const res = await api.put(`applications/${app.id}/`, {
                ...app,
                step: nextStep,
                documents: updatedDocs
            });
            setApplications(prev => prev.map(a => a.id === app.id ? res.data : a));
            setToast("Document removed.");
        } catch (err) {
            setToast("Failed to remove document.");
        }
    };

    const handleDeleteApplication = async (id) => {
        if (!window.confirm("Are you sure you want to withdraw/delete this application?")) return;
        try {
            await api.delete(`applications/${id}/`);
            setApplications(prev => prev.filter(a => a.id !== id));
            setToast("Application withdrawn successfully.");
            setSelectedAppId(null);
        } catch (err) {
            setToast("Failed to delete application.");
        }
    };

    const handleDownloadLetter = (app) => {
        const deadline = new Date(Date.now() + 14 * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Approval_Letter_${app.schemeName.replace(/\s+/g, '_')}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1f2a24; line-height: 1.6; max-width: 800px; margin: 0 auto; position: relative; }
                    .watermark-seal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 320px; height: 320px; border: 12px double #10b981; border-radius: 50%; opacity: 0.08; z-index: -1; pointer-events: none; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: bold; color: #10b981; font-size: 24px; text-transform: uppercase; }
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
                    @media print { body { padding: 0; } @page { margin: 2cm; } }
                </style>
            </head>
            <body>
                <div class="watermark-seal">Verified & Approved<br/>${panchayathName}</div>
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
        setToast("Opening Printable PDF Document...");
    };

    const handleSubmitApplication = async (app) => {
        try {
            const appRes = await api.put(`applications/${app.id}/`, {
                ...app,
                status: "submitted",
                step: 4
            });

            const msgRes = await api.post("ward-inbox/", {
                applicationId: app.id,
                wardName: app.wardName || app.ward,
                to: `Ward Member — ${app.wardName || app.ward}`,
                text: `📄 New application: ${app.applicantName} submitted "${app.schemeName}". Please verify and forward.`
            });

            setApplications(prev => prev.map(a => a.id === app.id ? appRes.data : a));
            setWardInbox([msgRes.data, ...wardInbox]);
            setToast("Application submitted to Ward Member for review!");
        } catch (err) {
            setToast("Failed to submit application.");
        }
    };

    const handleWardForward = async (app) => {
        try {
            const appRes = await api.put(`applications/${app.id}/`, {
                ...app,
                status: "under_review",
                step: 5
            });

            const notifRes = await api.post("panchayath-inbox/", {
                applicationId: app.id,
                text: `${app.applicantName} (${app.wardName || app.ward}) — "${app.schemeName}" verified by Ward Member, ready for final review.`
            });

            setApplications(prev => prev.map(a => a.id === app.id ? appRes.data : a));
            setPanchayathInbox([notifRes.data, ...panchayathInbox]);
            setToast("Verified and forwarded to Panchayath.");
            setSelectedAppId(null);
        } catch (err) {
            setToast("Failed to forward application.");
        }
    };

    const handleWardReject = async (app, reason) => {
        try {
            const appRes = await api.put(`applications/${app.id}/`, {
                ...app,
                status: "rejected",
                rejectReason: reason
            });

            const historyRes = await api.post("history/", {
                applicantName: app.applicantName,
                wardName: app.wardName || app.ward,
                schemeName: app.schemeName,
                decision: "REJECTED",
                reason
            });

            setApplications(prev => prev.map(a => a.id === app.id ? appRes.data : a));
            setHistory([historyRes.data, ...history]);
            setToast("Application rejected and sent back to citizen.");
            setSelectedAppId(null);
            setRejectTarget(null);
            setRejectReason("");
        } catch (err) {
            setToast("Failed to reject application.");
        }
    };

    const handleApprove = async (app) => {
        try {
            const appRes = await api.put(`applications/${app.id}/`, {
                ...app,
                status: "approved",
                step: 6
            });

            const historyRes = await api.post("history/", {
                applicantName: app.applicantName,
                wardName: app.wardName || app.ward,
                schemeName: app.schemeName,
                decision: "APPROVED",
                reason: ""
            });

            setApplications(prev => prev.map(a => a.id === app.id ? appRes.data : a));
            setHistory([historyRes.data, ...history]);
            setToast(`${app.applicantName}'s application approved.`);
            setSelectedAppId(null);
        } catch (err) {
            setToast("Failed to approve application.");
        }
    };

    const handlePanchayathReject = async (app, reason) => {
        try {
            const appRes = await api.put(`applications/${app.id}/`, {
                ...app,
                status: "rejected",
                rejectReason: reason
            });

            const historyRes = await api.post("history/", {
                applicantName: app.applicantName,
                wardName: app.wardName || app.ward,
                schemeName: app.schemeName,
                decision: "REJECTED",
                reason
            });

            setApplications(prev => prev.map(a => a.id === app.id ? appRes.data : a));
            setHistory([historyRes.data, ...history]);
            setToast("Application rejected.");
            setSelectedAppId(null);
            setRejectTarget(null);
            setRejectReason("");
        } catch (err) {
            setToast("Failed to reject application.");
        }
    };

    const handleAddScheme = async (e) => {
        e.preventDefault();
        if (!newScheme.name.trim() || !newScheme.category.trim()) {
            setToast("Scheme name and category are required.");
            return;
        }

        if (newScheme.selectedDocs.length === 0) {
            setToast("Please select at least one required document.");
            return;
        }

        let formattedDeadline = newScheme.deadline;
        if (newScheme.deadline) {
            const dateObj = new Date(newScheme.deadline);
            if (!isNaN(dateObj)) {
                formattedDeadline = dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            }
        } else {
            formattedDeadline = "30 Dec 2026";
        }

        const payload = {
            id: `SCH-${Date.now()}`,
            name: newScheme.name.trim(),
            category: newScheme.category.trim(),
            breadcrumb: ["Welfare Schemes", newScheme.category.trim(), newScheme.name.trim()],
            deadline: formattedDeadline,
            description: newScheme.description.trim() || "No description provided.",
            eligibilityScore: Number(newScheme.eligibilityScore) || 90,
            aiConfidence: Number(newScheme.aiConfidence) || 92,
            requiredDocs: newScheme.selectedDocs,
            requiredDetails: newScheme.selectedDetails,
            reasonLine: `I meet the eligibility criteria published for the ${newScheme.name.trim()} scheme.`
        };

        try {
            const res = await api.post("schemes/", payload);
            setSchemes([res.data, ...schemes]);
            setNewScheme({
                name: "",
                category: CATEGORY_OPTIONS[0],
                description: "",
                deadline: "",
                selectedDocs: [],
                selectedDetails: [],
                eligibilityScore: 90,
                aiConfidence: 92
            });
            setShowNewSchemeForm(false);
            setToast(`"${res.data.name}" added to the scheme catalog.`);
        } catch (err) {
            setToast("Failed to create scheme.");
        }
    };

    const handleDeleteScheme = async (id, name) => {
        if (!window.confirm(`Remove "${name}" from the scheme catalog? Existing applications are unaffected.`)) return;
        try {
            await api.delete(`schemes/${id}/`);
            setSchemes(schemes.filter(s => s.id !== id));
            setToast(`"${name}" removed from the scheme catalog.`);
        } catch (err) {
            setToast("Failed to delete scheme.");
        }
    };

    const docsDone = (app) => app?.documents?.filter((d) => d.status === "verified" || d.status === "uploaded").length ?? 0;
    const docsTotal = (app) => app?.documents?.length ?? 0;
    const allVerified = (app) => docsTotal(app) > 0 && app.documents.every((d) => d.status === "verified");

    if (loading) {
        return <div className="sch-container" style={{ textAlign: "center", padding: "50px" }}>Loading scheme data from API...</div>;
    }

    return (
        <div className="sch-container">
            {toast && <div className="sch-toast" style={{ zIndex: 99999 }}>{toast}</div>}

            <div className="sch-search-wrapper" style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    className="sch-search-input"
                    placeholder="🔍 Search schemes, applicants or keyword..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
            </div>

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

            {isCitizen && (
                <>
                    <div className="sch-header-section">
                        <h2>Welfare Schemes</h2>
                        <p>Apply for government schemes, track your applications, and let AI draft your letter.</p>
                    </div>

                    <div className="sch-section-title">Available Schemes</div>
                    <div className="sch-scheme-grid">
                        {filteredSchemes.map((s) => {
                            const myApp = myApplications.find((a) => String(a.schemeId) === String(s.id));
                            const isRejected = myApp?.status?.toLowerCase() === "rejected";
                            const applied = isAlreadyApplied(s.id);

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
                                            <span className={`sch-status-pill status-${myApp.status?.toLowerCase()}`}>{myApp.status?.replace("_", " ")}</span>
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
                                            <button
                                                className="sch-apply-btn"
                                                onClick={() => handleOpenApply(s)}
                                                disabled={applied}
                                                style={applied ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                                            >
                                                {applied ? "Applied" : "Apply"}
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
                                    {selectedApp.status?.toLowerCase() === 'rejected' && (
                                        <div className="sch-card" style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171' }}>
                                            <h4 style={{ color: '#991b1b', marginTop: 0 }}>❌ Application Rejected</h4>
                                            <p style={{ color: '#991b1b', marginBottom: 0 }}>
                                                <strong>Reason:</strong> {selectedApp.rejectReason || "Not specified"}
                                            </p>
                                        </div>
                                    )}

                                    {selectedApp.status?.toLowerCase() === 'approved' && (
                                        <div className="sch-card sch-letter-card" style={{ border: '2px solid #10b981' }}>
                                            <div className="sch-letter-head" style={{ background: '#10b981', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px' }}>
                                                <span>✅ Official Approval Letter</span>
                                                <button
                                                    onClick={() => handleDownloadLetter(selectedApp)}
                                                    title="Download as PDF"
                                                    style={{ background: 'rgba(255, 255, 255, 0.25)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                                >
                                                    ⬇️ Download PDF
                                                </button>
                                            </div>
                                            <div className="sch-letter-body" style={{ padding: '20px' }}>
                                                <p className="sch-letter-date">Date: {nowDate()}</p>
                                                <p>To,<br /><strong>{selectedApp.applicantName}</strong><br />{selectedApp.wardName || selectedApp.ward}</p>
                                                <p className="sch-letter-subject">Subject: Approval for {selectedApp.schemeName}</p>
                                                <p>Dear {selectedApp.applicantName},</p>
                                                <p>We are pleased to inform you that your application for the <strong>{selectedApp.schemeName}</strong> has been successfully approved.</p>
                                                <p>Please visit the Panchayath office with this letter and original identity documents for disbursement.</p>
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

                                                            {selectedApp.status?.toLowerCase() === "action_required" && (
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

                                    {selectedApp.status?.toLowerCase() === "action_required" && !generatedAiApps[selectedApp.id] ? (
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
                                                selectedApp.status?.toLowerCase() === "approved" ? (
                                                    <span className="sch-tag sch-tag-green">Approved</span>
                                                ) : selectedApp.status?.toLowerCase() === "rejected" ? (
                                                    <span className="sch-tag sch-tag-red">Rejected</span>
                                                ) : selectedApp.status?.toLowerCase() === "action_required" ? (
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
                            {selectedApp && selectedApp.step < 4 && selectedApp.status?.toLowerCase() !== "rejected" && selectedApp.status?.toLowerCase() !== "approved" && (
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
                                                    <div className="sch-message-meta">
                                                        <span>To: {m.to}</span>
                                                        <span>{m.time ? new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}</span>
                                                    </div>
                                                    <p>{m.text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="sch-list-head"><h3>Pending Verification</h3></div>
                                <div className="sch-list">
                                    {filteredWardQueue.length === 0 && <p className="sch-empty">No applications waiting for review in {currentWard}.</p>}
                                    {filteredWardQueue.map((a) => (
                                        <button
                                            key={a.id}
                                            className={`sch-list-item ${a.id === selectedApp?.id ? "active" : ""}`}
                                            onClick={() => setSelectedAppId(selectedAppId === a.id ? null : a.id)}
                                        >
                                            <div className="sch-list-item-top">
                                                <span>{a.schemeName}</span>
                                                {a.status?.toLowerCase() !== "rejected" && (
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
                                                    <div className="sch-reject-box" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '10px' }}>
                                                        <textarea
                                                            rows={3}
                                                            placeholder="Reason for rejection..."
                                                            value={rejectReason}
                                                            onChange={(e) => setRejectReason(e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #cbd5e1',
                                                                fontSize: '14px',
                                                                fontFamily: 'inherit',
                                                                resize: 'vertical',
                                                                boxSizing: 'border-box'
                                                            }}
                                                        />
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                            <button 
                                                                type="button" 
                                                                className="sch-cancel-btn" 
                                                                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                className="sch-reject-btn" 
                                                                disabled={!rejectReason.trim()} 
                                                                onClick={() => handleWardReject(selectedApp, rejectReason.trim())}
                                                            >
                                                                Confirm Rejection
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="sch-admin-actions">
                                                        <button className="sch-reject-btn" onClick={() => setRejectTarget(selectedApp.id)}>✖ Reject</button>
                                                        <button className="sch-approve-btn" onClick={() => handleWardForward(selectedApp)}>✅ Verify & Forward</button>
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
                                        type="text"
                                        placeholder="Scheme name (e.g. Free Bicycle Distribution)"
                                        value={newScheme.name}
                                        onChange={(e) => setNewScheme((s) => ({ ...s, name: e.target.value }))}
                                        required
                                    />
                                    
                                    <select
                                        value={newScheme.category}
                                        onChange={(e) => setNewScheme((s) => ({ ...s, category: e.target.value }))}
                                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    >
                                        {CATEGORY_OPTIONS.map((cat) => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <textarea
                                    placeholder="Short description"
                                    value={newScheme.description}
                                    onChange={(e) => setNewScheme((s) => ({ ...s, description: e.target.value }))}
                                />

                                <div style={{ marginTop: '10px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                                        Required Documents (Click to Select) *
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                                        {PREDEFINED_DOCS.map((doc) => {
                                            const isSelected = newScheme.selectedDocs.includes(doc);
                                            return (
                                                <button
                                                    type="button"
                                                    key={doc}
                                                    onClick={() => toggleDocSelection(doc)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        border: isSelected ? '1px solid #10b981' : '1px solid #cbd5e1',
                                                        background: isSelected ? '#e6f4ea' : '#f8fafc',
                                                        color: isSelected ? '#047857' : '#475569',
                                                        fontWeight: isSelected ? 'bold' : 'normal'
                                                    }}
                                                >
                                                    {isSelected ? '✓ ' : '+ '} {doc}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{ marginTop: '10px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                                        Additional Required Details (Optional)
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                                        {PREDEFINED_DETAILS.map((detail) => {
                                            const isSelected = newScheme.selectedDetails.includes(detail);
                                            return (
                                                <button
                                                    type="button"
                                                    key={detail}
                                                    onClick={() => toggleDetailSelection(detail)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        border: isSelected ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                                                        background: isSelected ? '#eff6ff' : '#f8fafc',
                                                        color: isSelected ? '#1d4ed8' : '#475569',
                                                        fontWeight: isSelected ? 'bold' : 'normal'
                                                    }}
                                                >
                                                    {isSelected ? '✓ ' : '+ '} {detail}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="sch-form-row">
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Application Deadline</label>
                                        <input
                                            type="date"
                                            value={newScheme.deadline}
                                            onChange={(e) => setNewScheme((s) => ({ ...s, deadline: e.target.value }))}
                                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>

                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Eligibility Score (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            placeholder="Eligibility score %"
                                            value={newScheme.eligibilityScore}
                                            onChange={(e) => setNewScheme((s) => ({ ...s, eligibilityScore: e.target.value }))}
                                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="sch-approve-btn" style={{ marginTop: '12px' }}>Publish Scheme</button>
                            </form>
                        )}

                        <div className="sch-scheme-manage-list">
                            {schemes.map((s) => (
                                <div key={s.id} className="sch-scheme-manage-row">
                                    <div>
                                        <strong>{s.name}</strong>
                                        <span className="sch-history-meta"> · {s.category} · {s.requiredDocs?.length || 0} docs required</span>
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
                                                <span>{n.time ? new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="sch-list-head"><h3>Final Review Queue</h3></div>
                            <div className="sch-list">
                                {filteredPanchayathQueue.length === 0 && <p className="sch-empty">No applications waiting for final approval.</p>}
                                {filteredPanchayathQueue.map((a) => (
                                    <button
                                        key={a.id}
                                        className={`sch-list-item ${a.id === selectedApp?.id ? "active" : ""}`}
                                        onClick={() => setSelectedAppId(selectedAppId === a.id ? null : a.id)}
                                    >
                                        <div className="sch-list-item-top">
                                            <span>{a.schemeName}</span>
                                            {a.status?.toLowerCase() !== "rejected" && (
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
                                                <div className="sch-reject-box" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '10px' }}>
                                                    <textarea
                                                        rows={3}
                                                        placeholder="Reason for rejection..."
                                                        value={rejectReason}
                                                        onChange={(e) => setRejectReason(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #cbd5e1',
                                                            fontSize: '14px',
                                                            fontFamily: 'inherit',
                                                            resize: 'vertical',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                        <button 
                                                            type="button" 
                                                            className="sch-cancel-btn" 
                                                            onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            className="sch-reject-btn" 
                                                            disabled={!rejectReason.trim()} 
                                                            onClick={() => handlePanchayathReject(selectedApp, rejectReason.trim())}
                                                        >
                                                            Confirm Rejection
                                                        </button>
                                                    </div>
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