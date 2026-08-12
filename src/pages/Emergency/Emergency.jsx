import React, { useState, useEffect } from "react";
import "./Emergency.css";

// ------------------------------------------------------------------
// Reference data (kept at the top of this file, same as how
// VillageProjectsPage keeps defaultProjects inline instead of in a
// separate file).
// ------------------------------------------------------------------
const emergencyTypes = [
    { name: "Medical", icon: "⚕️", cls: "med-icon" },
    { name: "Police", icon: "🛡️", cls: "police-icon" },
    { name: "Flood", icon: "🌊", cls: "flood-icon" },
    { name: "Fire", icon: "🔥", cls: "fire-icon" },
    { name: "Accident", icon: "🚗", cls: "acc-icon" },
    { name: "Electrical", icon: "⚡", cls: "elec-icon" },
    { name: "Other", icon: "❗", cls: "other-icon" },
];

const typeMeta = Object.fromEntries(emergencyTypes.map((t) => [t.name, t]));

const mockResources = [
    { id: 1, name: "Taluk Hospital", type: "Medical", distance: "0.8km • 5 mins", desc: "Emergency Ward open 24/7", phone: "108" },
    { id: 2, name: "Punalur Police Station", type: "Police", distance: "1.2km • 8 mins", desc: "Regional HQ Station", phone: "112" },
    { id: 3, name: "Fire Rescue Station", type: "Fire", distance: "2.5km • 12 mins", desc: "Heavy Duty Engines Available", phone: "101" },
    { id: 4, name: "KSEB Section Office", type: "Electrical", distance: "1.0km • 6 mins", desc: "Quick Response Team", phone: "1912" },
];

const DEFAULT_HISTORY = [
    { id: 1, title: "Medical Emergency", time: "Today, 10:30 AM", type: "Medical", icon: "⚕️", iconClass: "med-icon", status: "RESOLVED" },
    { id: 2, title: "Short Circuit", time: "Oct 14, 08:15 PM", type: "Electrical", icon: "⚡", iconClass: "elec-icon", status: "RESOLVED" },
    { id: 3, title: "Minor Accident", time: "Oct 10, 11:45 AM", type: "Accident", icon: "🚗", iconClass: "acc-icon", status: "RESOLVED" },
];

const DEFAULT_BROADCASTS = [
    { id: 1, title: "River water levels increasing in Ward 14", level: "High", ward: "Ward 14" },
];

// step 1 Activated -> 2 Location Shared -> 3 Panchayat Notified (messages go
// out here) -> 4 Team Assigned (Ward Member action) -> 5 Help On The Way
// (Ward Member / Panchayath action)
const TIMELINE_STEPS = [
    { step: 1, label: "SOS Activated", waitingText: "Broadcasting the alert…" },
    { step: 2, label: "Location Shared", waitingText: "Sharing GPS location…" },
    { step: 3, label: "Panchayat Notified", waitingText: "Waiting for a Ward Member to assign a team…" },
    { step: 4, label: "Team Assigned", waitingText: "Team assigned, preparing to dispatch…" },
    { step: 5, label: "Help On The Way", waitingText: "Responders are en route." },
];

function nowTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Turns real GPS coordinates into a human-readable place name (e.g. a
// locality/suburb + city), so the "Current Location" card shows where the
// citizen actually is instead of just their registered ward. Uses the free
// OpenStreetMap Nominatim reverse-geocoding API. Returns null on any
// failure so the caller can fall back to the registered ward text.
async function reverseGeocode(lat, lon) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
            { headers: { Accept: "application/json" } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const addr = data.address || {};
        const locality =
            addr.suburb || addr.village || addr.town || addr.city_district || addr.neighbourhood || addr.hamlet;
        const city = addr.city || addr.town || addr.county;
        if (locality && city && locality !== city) return `${locality}, ${city}`;
        return locality || city || data.display_name || null;
    } catch (e) {
        return null;
    }
}

function getDotClass(emergency, stepNum) {
    return emergency && emergency.step >= stepNum ? "green-dot" : "empty-dot";
}

function getTimelineClass(emergency, stepNum) {
    if (!emergency) return "inactive";
    if (emergency.step === stepNum) return "active";
    if (emergency.step > stepNum) return "completed";
    return "inactive";
}

// ------------------------------------------------------------------
// Shared "backend" — persists the active SOS request, ward inbox,
// panchayath inbox, history, and broadcasts to localStorage (same
// idea as your "ente_gramam_projects" key), and lets any open tab
// of this page pick up changes instantly via subscribe(). Swap the
// bodies of these functions for real API calls once you have a
// backend; every call site below keeps working unchanged.
// ------------------------------------------------------------------
const STORAGE_KEYS = {
    EMERGENCY: "ente_gramam_active_emergency",
    WARD_INBOX: "ente_gramam_ward_inbox",
    PANCHAYATH_INBOX: "ente_gramam_panchayath_inbox",
    HISTORY: "ente_gramam_emergency_history",
    BROADCASTS: "ente_gramam_broadcasts",
};
const SYNC_EVENT = "emergency-store-sync";

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

const emergencyStore = {
    getEmergency: () => readJSON(STORAGE_KEYS.EMERGENCY, null),
    setEmergency: (value) => writeJSON(STORAGE_KEYS.EMERGENCY, value),
    clearEmergency: () => writeJSON(STORAGE_KEYS.EMERGENCY, null),

    getWardInbox: () => readJSON(STORAGE_KEYS.WARD_INBOX, []),
    addWardMessage: (msg) => writeJSON(STORAGE_KEYS.WARD_INBOX, [msg, ...readJSON(STORAGE_KEYS.WARD_INBOX, [])]),

    getPanchayathInbox: () => readJSON(STORAGE_KEYS.PANCHAYATH_INBOX, []),
    addPanchayathNotification: (note) =>
        writeJSON(STORAGE_KEYS.PANCHAYATH_INBOX, [note, ...readJSON(STORAGE_KEYS.PANCHAYATH_INBOX, [])]),

    getHistory: () => readJSON(STORAGE_KEYS.HISTORY, DEFAULT_HISTORY),
    addHistory: (entry) => writeJSON(STORAGE_KEYS.HISTORY, [entry, ...readJSON(STORAGE_KEYS.HISTORY, DEFAULT_HISTORY)]),

    getBroadcasts: () => readJSON(STORAGE_KEYS.BROADCASTS, DEFAULT_BROADCASTS),
    setBroadcasts: (value) => writeJSON(STORAGE_KEYS.BROADCASTS, value),

    // Fires the callback whenever ANY tab/window changes the shared data.
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

// One single page, same as VillageProjectsPage: role comes from the real
// logged-in user (localStorage), and the page conditionally renders the
// Citizen / Ward Member / Panchayath sections. No demo switcher, no
// separate route per role — the correct properties for each role only
// ever render inside that role's own block below.
export default function EmergencyPage() {
    const [userRole, setUserRole] = useState("citizen");
    const [currentUser, setCurrentUser] = useState({ name: "", phone: "" });
    const [currentWard, setCurrentWard] = useState("Ward 07");
    const [panchayathName, setPanchayathName] = useState("Pookkottumpadam Grama Panchayath");

    const [emergency, setEmergencyState] = useState(null);
    const [wardInbox, setWardInbox] = useState([]);
    const [panchayathInbox, setPanchayathInbox] = useState([]);
    const [history, setHistory] = useState([]);
    const [broadcasts, setBroadcastsState] = useState([]);
    const [newAlertTitle, setNewAlertTitle] = useState("");
    const [toast, setToast] = useState(null);

    const [selectedType, setSelectedType] = useState("Medical");
    const [location, setLocation] = useState({ coords: "Fetching...", name: "Fetching...", time: "Just now" });
    const [filteredResources, setFilteredResources] = useState(mockResources);

    useEffect(() => {
        let loggedInUser = {};
        try {
            loggedInUser = JSON.parse(
                localStorage.getItem("loggedInUser") || localStorage.getItem("user") || "{}"
            );
        } catch (e) {
            loggedInUser = {};
        }

        const role = (loggedInUser.role || localStorage.getItem("userRole") || "citizen").toLowerCase();
        setUserRole(role);

        const userWard = loggedInUser.ward || localStorage.getItem("userWard") || "Ward 07";
        setCurrentWard(userWard);

        setCurrentUser({
            name: loggedInUser.name || "User",
            phone: loggedInUser.phone || "+91 90000 00000",
        });

        setPanchayathName(loggedInUser.panchayathName || "Pookkottumpadam Grama Panchayath");
        setLocation((l) => ({ ...l, name: `${userWard}, Pookkottumpadam` }));

        const refresh = () => {
            setEmergencyState(emergencyStore.getEmergency());
            setWardInbox(emergencyStore.getWardInbox());
            setPanchayathInbox(emergencyStore.getPanchayathInbox());
            setHistory(emergencyStore.getHistory());
            setBroadcastsState(emergencyStore.getBroadcasts());
        };
        refresh();
        const unsubscribe = emergencyStore.subscribe(refresh);

        handleRefreshLocation();
        return unsubscribe;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setFilteredResources(
            selectedType === "Other" ? mockResources : mockResources.filter((r) => r.type === selectedType)
        );
    }, [selectedType]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(t);
    }, [toast]);

    const isCitizen = userRole.includes("citizen");
    const isWardMember = userRole.includes("ward");
    const isPanchayath = userRole.includes("panchayat") || userRole.includes("admin");

    // Ward Members should only see SOS messages addressed to their own
    // ward — never every ward's traffic. Panchayath keeps seeing everything
    // via panchayathInbox (unfiltered), since it's the panchayat-wide view.
    const myWardInbox = wardInbox.filter((m) => m.ward === currentWard);

    // Same scoping for the timeline/active-request view: a Ward Member
    // should only ever see the active emergency (and its timeline) when
    // it belongs to their own ward — never another ward's SOS.
    const myWardEmergency = emergency && emergency.ward === currentWard ? emergency : null;

    // Whether we currently have a real GPS fix. SOS activation checks this
    // before the timeline is allowed to move past "SOS Activated".
    const [locationGranted, setLocationGranted] = useState(false);
    // Shown when SOS was activated but location isn't available yet.
    const [showLocationPrompt, setShowLocationPrompt] = useState(false);

    const handleRefreshLocation = (onSuccess, onError) => {
        setLocation((l) => ({ ...l, coords: "Updating...", name: "Fetching..." }));
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    const coords = `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;
                    setLocation((l) => ({ ...l, coords, time: "Updated Just now" }));
                    setLocationGranted(true);

                    // Reverse-geocode the ACTUAL coordinates so the label
                    // matches where the citizen really is right now, instead
                    // of always showing their registered ward.
                    const realName = await reverseGeocode(lat, lon);
                    setLocation((l) => ({ ...l, name: realName || `${currentWard}, Pookkottumpadam` }));

                    if (onSuccess) onSuccess(coords);
                },
                () => {
                    setLocation((l) => ({ ...l, coords: "Location access denied", time: "", name: `${currentWard}, Pookkottumpadam` }));
                    setLocationGranted(false);
                    if (onError) onError();
                }
            );
        } else {
            setLocationGranted(false);
            if (onError) onError();
        }
    };

    // Step 3 (Panchayat Notified) — fires the Ward + Panchayath
    // notifications for a given emergency snapshot. Only ever called
    // once the location has actually been shared (step >= 2).
    const notifyWardAndPanchayath = (current) => {
        emergencyStore.setEmergency({ ...current, step: 3 });

        // Panchayath sees every ward's SOS activity — unfiltered.
        emergencyStore.addPanchayathNotification({
            id: Date.now(),
            emergencyId: current.id,
            text: `New ${current.type} SOS from ${current.ward} — ${current.locationName}`,
            time: "Just now",
        });

        // Ward message is tagged with the citizen's own ward so it only
        // ever reaches that ward's Ward Member (see myWardInbox filter).
        emergencyStore.addWardMessage({
            id: Date.now(),
            emergencyId: current.id,
            ward: current.ward,
            to: `Ward Member — ${current.ward}`,
            text: `🚨 SOS ALERT: ${current.type} emergency reported near ${current.locationName} (${current.ward}). Open the app to assign a response team.`,
            time: "Just now",
        });
    };

    // ----- CITIZEN ACTION -----
    // The timeline can only move to step 2 ("Location Shared") once we
    // actually have a GPS fix. If location isn't available, the SOS stays
    // parked on step 1 and a popup asks the citizen to turn location on —
    // the Ward/Panchayat are only notified (step 3) after location is
    // confirmed shared.
    const handleSOSActivate = () => {
        if (emergency) return; // one active SOS at a time, see emergencyStore.js note
        const meta = typeMeta[selectedType] || typeMeta.Other;
        const newEmergency = {
            id: Date.now(),
            type: selectedType,
            icon: meta.icon,
            iconClass: meta.cls,
            ward: currentWard,
            locationName: location.name,
            coords: location.coords,
            citizen: currentUser,
            step: 1,
            createdAt: nowTime(),
        };
        emergencyStore.setEmergency(newEmergency);

        if (locationGranted) {
            // Location already available — proceed automatically.
            setTimeout(() => {
                const current = emergencyStore.getEmergency();
                if (current && current.id === newEmergency.id) {
                    emergencyStore.setEmergency({ ...current, step: 2, locationName: location.name, coords: location.coords });
                }
            }, 1000);

            setTimeout(() => {
                const current = emergencyStore.getEmergency();
                if (current && current.id === newEmergency.id) {
                    notifyWardAndPanchayath(current);
                }
            }, 2200);
        } else {
            // No location fix yet — hold at step 1 and ask the citizen to
            // turn location on before we move forward.
            setShowLocationPrompt(true);
        }
    };

    // ----- CITIZEN ACTION: enable location for an already-active SOS -----
    // Called from the "Location not shared" popup's "Turn On Location"
    // button. On success this moves the timeline to step 2 and then
    // notifies the Ward/Panchayath, same as the automatic flow above.
    const handleEnableLocationForSOS = () => {
        handleRefreshLocation(
            (coords) => {
                const current = emergencyStore.getEmergency();
                if (!current) return;
                const updated = { ...current, step: 2, coords, locationName: location.name };
                emergencyStore.setEmergency(updated);
                setShowLocationPrompt(false);

                setTimeout(() => {
                    const c2 = emergencyStore.getEmergency();
                    if (c2 && c2.id === current.id) {
                        notifyWardAndPanchayath(c2);
                    }
                }, 1200);
            },
            () => {
                setToast("Location still not accessible. Please enable location permissions in your browser/phone settings.");
            }
        );
    };

    // ----- CITIZEN ACTION: cancel a mistakenly activated SOS -----
    // Only allowed before a team has been assigned (step < 4). Once a
    // team is assigned, cancellation should go through the Ward Member /
    // Panchayath resolve flow instead, since a real team may already be
    // moving.
    const handleCancelSOS = () => {
        if (!emergency) return;
        if (!window.confirm("Cancel this SOS request? This cannot be undone.")) return;
        emergencyStore.clearEmergency();
        setShowLocationPrompt(false);
        setToast("SOS cancelled.");
    };

    // ----- WARD MEMBER ACTIONS -----
    const handleAssignTeam = () => {
        if (!emergency) return;
        emergencyStore.setEmergency({ ...emergency, step: 4, assignedAt: nowTime(), assignedBy: currentUser.name });
        setToast("Team assigned. The citizen has been notified.");
    };

    // ----- WARD MEMBER / PANCHAYATH ACTION -----
    const handleDispatch = () => {
        if (!emergency) return;
        emergencyStore.setEmergency({ ...emergency, step: 5, dispatchedAt: nowTime() });
        setToast("Team dispatched. Help is on the way.");
    };

    const handleResolve = () => {
        if (!emergency) return;
        emergencyStore.addHistory({
            id: emergency.id,
            title: `${emergency.type} Emergency`,
            time: `Today, ${emergency.createdAt}`,
            type: emergency.type,
            icon: emergency.icon,
            iconClass: emergency.iconClass,
            status: "RESOLVED",
        });
        emergencyStore.clearEmergency();
        setShowLocationPrompt(false);
        setToast("Request marked resolved.");
    };

    // ----- PANCHAYATH BROADCAST ACTIONS -----
    const handleAddBroadcast = (e) => {
        e.preventDefault();
        if (!newAlertTitle.trim()) return;
        emergencyStore.setBroadcasts([
            { id: Date.now(), title: newAlertTitle, level: "Urgent", ward: "Panchayat Wide" },
            ...broadcasts,
        ]);
        setNewAlertTitle("");
    };

    const handleDeleteBroadcast = (id) => {
        if (window.confirm("Delete this emergency alert?")) {
            emergencyStore.setBroadcasts(broadcasts.filter((item) => item.id !== id));
        }
    };

    // Timeline block — takes the emergency to display as a prop so each
    // role can scope it: Citizen/Panchayath see the raw shared emergency,
    // but Ward Member only ever sees it when it belongs to their own ward
    // (passed in as null otherwise from the call site below).
    const Timeline = ({ data }) => (
        <div className="em-card em-timeline-card">
            <h4>⏱️ Active Response Timeline</h4>
            {!data ? (
                <p className="em-timeline-empty">No active emergency right now.</p>
            ) : (
                <div className="em-timeline">
                    {TIMELINE_STEPS.map((s) => (
                        <div key={s.step} className={`em-time-item ${getTimelineClass(data, s.step)}`}>
                            <div
                                className={`em-dot ${getDotClass(data, s.step)} ${
                                    data.step === s.step ? "pulse-dot" : ""
                                }`}
                            ></div>
                            <div className="em-time-text">
                                <strong>{s.label}</strong>
                                {data.step === s.step && (
                                    <span>
                                        {s.step === 1 && !locationGranted
                                            ? "Location not shared yet — turn on location to continue."
                                            : s.waitingText}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const RecentRequests = ({ title }) => (
        <div className="em-card em-recent-card">
            <div className="em-recent-header">
                <h4>{title}</h4>
            </div>
            <div className="em-recent-list">
                {history.map((req) => (
                    <div key={req.id} className="em-recent-item">
                        <div className={`em-rec-icon ${req.iconClass}`}>{req.icon}</div>
                        <div className="em-rec-info">
                            <strong>{req.title}</strong>
                            <span>{req.time}</span>
                        </div>
                        <span className="em-tag">{req.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="em-container">
            {toast && <div className="em-toast">{toast}</div>}

            {isPanchayath && broadcasts.length > 0 && (
                <div className="em-top-banner">
                    <div className="em-banner-text">
                        <span>⚠️</span> Emergency Warning: {broadcasts[0].title}
                    </div>
                    <div className="em-banner-actions">
                        <button
                            className="em-btn-close"
                            onClick={() => emergencyStore.setBroadcasts(broadcasts.slice(1))}
                        >
                            ✖
                        </button>
                    </div>
                </div>
            )}

            {/* ============== CITIZEN — only renders for citizens ============== */}
            {isCitizen && (
                <>
                    <div className="em-header-section">
                        <div className="em-header-titles">
                            <h2>Emergency SOS Center</h2>
                            <p>Instant connection to emergency services and disaster response teams.</p>
                        </div>
                        <div className="em-location-card">
                            <div className="em-loc-icon">📍</div>
                            <div className="em-loc-details">
                                <span className="em-loc-label">CURRENT LOCATION</span>
                                <strong className="em-loc-ward">{location.name}</strong>
                                <span className="em-loc-coords">
                                    {location.coords} • {location.time}
                                </span>
                            </div>
                            <div className="em-loc-refresh" onClick={() => handleRefreshLocation()} title="Refresh Location">
                                ↻
                            </div>
                        </div>
                    </div>

                    {/* Popup shown when SOS was activated but no GPS fix is
                        available yet. Timeline stays parked on step 1 until
                        the citizen taps "Turn On Location" and it succeeds. */}
                    {showLocationPrompt && emergency && emergency.step === 1 && (
                        <div
                            style={{
                                position: "fixed",
                                inset: 0,
                                background: "rgba(15, 23, 42, 0.55)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 2000,
                                padding: "20px",
                            }}
                        >
                            <div
                                style={{
                                    background: "white",
                                    borderRadius: "16px",
                                    padding: "24px",
                                    maxWidth: "360px",
                                    width: "100%",
                                    textAlign: "center",
                                    boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
                                }}
                            >
                                <div style={{ fontSize: "40px", marginBottom: "10px" }}>📍</div>
                                <h3 style={{ margin: "0 0 8px 0", color: "#b91c1c", fontSize: "16px" }}>
                                    Location Not Shared
                                </h3>
                                <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px 0" }}>
                                    Your SOS was activated, but we couldn't get your live location. Turn on
                                    location so the Ward Member can find you.
                                </p>

                                {/* Mini mockup of the browser's own permission prompt, so the
                                    citizen recognizes it and knows which option to tap. */}
                                <div
                                    style={{
                                        background: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "14px",
                                        padding: "14px",
                                        textAlign: "left",
                                        marginBottom: "20px",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                        <span style={{ fontSize: "16px" }}>📍</span>
                                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
                                            Know your location
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleEnableLocationForSOS}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "8px",
                                            background: "#dbeafe",
                                            border: "none",
                                            borderRadius: "999px",
                                            padding: "8px 14px",
                                            marginBottom: "6px",
                                            width: "100%",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e3a8a" }}>
                                            Allow while visiting the site
                                        </span>
                                        <span style={{ fontSize: "13px", color: "#16a34a", fontWeight: 900 }}>✓</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleEnableLocationForSOS}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "8px",
                                            background: "#dbeafe",
                                            border: "none",
                                            borderRadius: "999px",
                                            padding: "8px 14px",
                                            marginBottom: "6px",
                                            width: "100%",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e3a8a" }}>
                                            Allow this time
                                        </span>
                                        <span style={{ fontSize: "13px", color: "#16a34a", fontWeight: 900 }}>✓</span>
                                    </button>

                                    <button
                                        type="button"
                                        disabled
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "8px",
                                            background: "#f1f5f9",
                                            border: "none",
                                            borderRadius: "999px",
                                            padding: "8px 14px",
                                            width: "100%",
                                            opacity: 0.7,
                                            cursor: "not-allowed",
                                        }}
                                    >
                                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>
                                            Never allow
                                        </span>
                                        <span style={{ fontSize: "13px", color: "#dc2626", fontWeight: 900 }}>✕</span>
                                    </button>

                                    <p style={{ fontSize: "11px", color: "#94a3b8", margin: "10px 0 0 0" }}>
                                        Tap <strong style={{ color: "#166534" }}>Allow while visiting the site</strong> or{" "}
                                        <strong style={{ color: "#166534" }}>Allow this time</strong> above to turn
                                        location on. Your browser may also show its own permission prompt — choose
                                        "Allow" there too if it appears.
                                    </p>
                                </div>
                                <button
                                    className="em-btn-resolve"
                                    style={{ background: "#ef4444" }}
                                    onClick={() => {
                                        setShowLocationPrompt(false);
                                        handleCancelSOS();
                                    }}
                                >
                                    ✖ Cancel SOS Instead
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="em-main-grid">
                        <div className="em-left-col">
                            <div className="em-card em-sos-card">
                                <h3 className="em-red-title">Emergency Assistance</h3>
                                <p className="em-sos-desc">
                                    {emergency
                                        ? "Your SOS is active. Watch the timeline for live updates."
                                        : "Press the button to broadcast your live location to the Rapid Response Team."}
                                </p>

                                <button
                                    className={`em-sos-circle ${emergency ? "em-sos-active" : ""}`}
                                    onClick={handleSOSActivate}
                                    disabled={!!emergency}
                                >
                                    <h2>{emergency ? "SENT" : "SOS"}</h2>
                                    <span>{emergency ? "BROADCASTING…" : "ACTIVATE SOS"}</span>
                                </button>

                                {/* Cancel option: only while no team has been assigned yet
                                    (step < 4). Lets a citizen undo an accidental tap. */}
                                {emergency && emergency.step < 4 && (
                                    <button
                                        className="em-btn-resolve"
                                        style={{ background: "#ef4444", marginBottom: "20px" }}
                                        onClick={handleCancelSOS}
                                    >
                                        ✖ Cancel SOS (Activated by mistake)
                                    </button>
                                )}

                                <div className="em-sos-quick-actions">
                                    <button onClick={() => window.open("tel:108")}>🚑 Ambulance (108)</button>
                                    <button onClick={() => window.open("tel:112")}>🛡️ Police (112)</button>
                                    <button onClick={() => window.open("tel:101")}>🚒 Fire Force (101)</button>
                                    <button>🏥 Hospitals</button>
                                </div>
                            </div>

                            <div className="em-section-title">Select Emergency Type</div>
                            <div className="em-type-grid">
                                {emergencyTypes.map((type) => (
                                    <button
                                        key={type.name}
                                        className={`em-type-btn ${selectedType === type.name ? "em-type-btn-active" : ""}`}
                                        onClick={() => setSelectedType(type.name)}
                                        disabled={!!emergency}
                                    >
                                        <span>{type.icon}</span>
                                        {type.name}
                                    </button>
                                ))}
                            </div>

                            <div className="em-map-container">
                                <div className="em-map-placeholder">
                                    <span className="em-map-icon">🗺️</span>
                                </div>
                                <div className="em-map-controls">
                                    <button>+</button>
                                    <button>-</button>
                                </div>
                                <div className="em-map-label">Interactive Resource Map • Live Data</div>
                            </div>

                            <div className="em-resource-grid">
                                {filteredResources.map((res) => (
                                    <div key={res.id} className="em-resource-card">
                                        <div className="em-res-header">
                                            <strong>{res.name}</strong>
                                            <span className={`em-badge ${res.type === "Medical" ? "em-badge-green" : "em-badge-yellow"}`}>
                                                {res.distance}
                                            </span>
                                        </div>
                                        <p>{res.desc}</p>
                                        <div className="em-res-actions">
                                            <button className="em-btn-call" onClick={() => window.open(`tel:${res.phone}`)}>
                                                📞 Call
                                            </button>
                                            <button className="em-btn-nav">🧭 Navigate</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="em-right-col">
                            <div className="em-card em-weather-card">
                                <span className="em-weather-label">WEATHER WARNING</span>
                                <h3>Heavy Rain Alert</h3>
                                <div className="em-weather-bottom">
                                    <span className="em-temp">🌡️ 28°C</span>
                                    <span className="em-weather-badge">Level: Moderate</span>
                                </div>
                            </div>

                            <Timeline data={emergency} />

                            <div className="em-card em-safety-card">
                                <h4>💡 Emergency Safety Tips</h4>
                                <ul>
                                    <li><strong>Stay Calm:</strong> Panicking reduces your ability to react effectively.</li>
                                    <li><strong>Higher Ground:</strong> If flood levels rise, move to upper floors immediately.</li>
                                    <li><strong>Keep ID Ready:</strong> Keep basic identification and medication handy.</li>
                                    <li><strong>Power Off:</strong> In case of electrical hazards, switch off the main fuse.</li>
                                </ul>
                            </div>

                            <RecentRequests title="⏱️ Recent Requests" />
                        </div>
                    </div>
                </>
            )}

            {/* ============== WARD MEMBER — only renders for ward members ============== */}
            {isWardMember && (
                <>
                    <div className="em-header-section">
                        <div className="em-header-titles">
                            <h2>Ward Response Dashboard</h2>
                            <p>{currentUser.name} — incoming SOS alerts and response coordination for {currentWard}.</p>
                        </div>
                    </div>

                    <div className="em-main-grid">
                        <div className="em-left-col">
                            <div className="em-card">
                                <h3 className="em-red-title">📩 Messages — {currentWard} ({currentUser.phone})</h3>
                                <p className="em-sos-desc">SMS-style alerts sent to your registered phone when a citizen in your ward activates SOS.</p>
                                {myWardInbox.length === 0 ? (
                                    <p className="em-timeline-empty">No messages yet.</p>
                                ) : (
                                    <div className="em-message-list">
                                        {myWardInbox.map((m) => (
                                            <div key={m.id} className="em-message-bubble">
                                                <div className="em-message-meta">
                                                    <span>To: {m.to}</span>
                                                    <span>{m.time}</span>
                                                </div>
                                                <p>{m.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {emergency && emergency.ward === currentWard ? (
                                <div className="em-card em-request-card">
                                    <div className="em-res-header">
                                        <strong>
                                            {emergency.icon} {emergency.type} Emergency — {emergency.ward}
                                        </strong>
                                        <span className="em-badge em-badge-yellow">Step {emergency.step}/5</span>
                                    </div>
                                    <p style={{ margin: "8px 0", fontSize: "13px", color: "#475569" }}>
                                        📍 {emergency.locationName} ({emergency.coords}) • Reported {emergency.createdAt}
                                    </p>
                                    <p style={{ margin: "0 0 15px 0", fontSize: "13px", color: "#475569" }}>
                                        👤 {emergency.citizen.name} — {emergency.citizen.phone}
                                    </p>
                                    <div className="em-res-actions">
                                        <button className="em-btn-call" onClick={() => window.open(`tel:${emergency.citizen.phone}`)}>
                                            📞 Call Citizen
                                        </button>
                                        {emergency.step === 3 && (
                                            <button className="em-btn-nav em-btn-primary" onClick={handleAssignTeam}>
                                                ✅ Assign My Team
                                            </button>
                                        )}
                                        {emergency.step === 4 && (
                                            <button className="em-btn-nav em-btn-primary" onClick={handleDispatch}>
                                                🚀 Dispatch — Help on the Way
                                            </button>
                                        )}
                                        {emergency.step === 5 && (
                                            <button className="em-btn-nav em-btn-primary" onClick={handleResolve}>
                                                ✔️ Mark Resolved
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="em-card">
                                    <p className="em-timeline-empty">No active SOS request in {currentWard} right now.</p>
                                </div>
                            )}
                        </div>

                        <div className="em-right-col">
                            <Timeline data={myWardEmergency} />
                            <RecentRequests title="⏱️ Recent Requests" />
                        </div>
                    </div>
                </>
            )}

            {/* ============== PANCHAYATH — only renders for panchayath/admin ============== */}
            {isPanchayath && (
                <>
                    <div className="em-header-section">
                        <div className="em-header-titles">
                            <h2>Panchayath Emergency Control</h2>
                            <p>{panchayathName} — monitor SOS activity and broadcast warnings.</p>
                        </div>
                    </div>

                    <div className="em-admin-panel">
                        <h3>🛡️ Broadcast Manager</h3>
                        <form onSubmit={handleAddBroadcast} className="em-admin-form">
                            <input
                                type="text"
                                placeholder="Type new emergency warning..."
                                value={newAlertTitle}
                                onChange={(e) => setNewAlertTitle(e.target.value)}
                            />
                            <button type="submit">Broadcast</button>
                        </form>
                        <div className="em-admin-list">
                            {broadcasts.map((item) => (
                                <div key={item.id} className="em-admin-list-item">
                                    <span>{item.title}</span>
                                    <button onClick={() => handleDeleteBroadcast(item.id)} className="em-btn-delete">
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="em-main-grid">
                        <div className="em-left-col">
                            <div className="em-card">
                                <h3 className="em-red-title">🏛️ Dashboard Notifications (All Wards)</h3>
                                {panchayathInbox.length === 0 ? (
                                    <p className="em-timeline-empty">No SOS notifications yet.</p>
                                ) : (
                                    <div className="em-message-list">
                                        {panchayathInbox.map((n) => (
                                            <div key={n.id} className="em-notif-bubble">
                                                <p>{n.text}</p>
                                                <span>{n.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {emergency && (
                                <div className="em-card em-request-card">
                                    <div className="em-res-header">
                                        <strong>
                                            {emergency.icon} {emergency.type} Emergency — {emergency.ward}
                                        </strong>
                                        <span className="em-badge em-badge-yellow">Step {emergency.step}/5</span>
                                    </div>
                                    <p style={{ margin: "8px 0", fontSize: "13px", color: "#475569" }}>
                                        📍 {emergency.locationName} • Ward Member notified
                                    </p>
                                    <div className="em-res-actions">
                                        {emergency.step === 4 && (
                                            <button className="em-btn-nav em-btn-primary" onClick={handleDispatch}>
                                                🚀 Dispatch — Help on the Way
                                            </button>
                                        )}
                                        {emergency.step === 5 && (
                                            <button className="em-btn-nav em-btn-primary" onClick={handleResolve}>
                                                ✔️ Mark Resolved
                                            </button>
                                        )}
                                        {emergency.step < 4 && (
                                            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                                                Waiting on the Ward Member to assign a team…
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="em-right-col">
                            <Timeline data={emergency} />
                            <RecentRequests title="⏱️ Recent Requests (Panchayat Wide)" />
                        </div>
                    </div>
                </>
            )}

            {/* Fallback if role doesn't match any known type */}
            {!isCitizen && !isWardMember && !isPanchayath && (
                <div className="em-card">
                    <p className="em-timeline-empty">
                        Your account role ("{userRole}") isn't recognized. Please check your profile settings.
                    </p>
                </div>
            )}
        </div>
    );
}