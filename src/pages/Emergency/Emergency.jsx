import React, { useState, useEffect } from "react";
import api from "../../axiosInstance";
import "./Emergency.css";

const formatDate = (dateString) => {
    if (!dateString) return "Just now";
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ", " +
            d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
        return dateString;
    }
};

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
    if (!wardKey) return "North Ward";
    const keyLower = String(wardKey).trim().toLowerCase();
    if (keyLower === "all wards") return "All Wards";

    if (WARD_MAP[keyLower]) return WARD_MAP[keyLower];

    for (const [k, v] of Object.entries(WARD_MAP)) {
        if (keyLower.includes(k)) return v;
    }

    return wardKey;
};

const getFreshUserPhone = () => {
    let u = {};
    try {
        u = JSON.parse(
            localStorage.getItem("loggedInUser") || localStorage.getItem("user") || "{}"
        );
    } catch (e) {
        u = {};
    }

    let phone =
        u.mobile ||
        u.mobileNumber ||
        u.mobile_number ||
        u.phone ||
        u.phoneNumber ||
        u.phone_number ||
        localStorage.getItem("mobile") ||
        localStorage.getItem("mobileNumber") ||
        localStorage.getItem("userPhone") ||
        "";

    if (phone && phone !== "NULL" && phone !== "null" && String(phone).trim() !== "") {
        phone = String(phone).trim();
        if (!phone.startsWith("+")) {
            phone = `+91 ${phone}`;
        }
        return phone;
    }

    return "+91 90000 00000";
};

const calculateDistanceAndMins = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return "Near You";
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    const mins = Math.max(1, Math.round((dist / 30) * 60));
    return `${dist.toFixed(1)}km • ${mins} mins`;
};

const fetchLiveNearbyServices = async (userLat, userLon) => {
    const query = `[out:json][timeout:10];(node["amenity"="hospital"](around:10000,${userLat},${userLon});node["amenity"="police"](around:10000,${userLat},${userLon});node["amenity"="fire_station"](around:10000,${userLat},${userLon}););out body 10;`;
    
    const endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
        "https://z.overpass-api.de/api/interpreter"
    ];

    for (const endpoint of endpoints) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) continue;

            const data = await res.json();
            if (!data.elements || data.elements.length === 0) return [];

            return data.elements.map((el, index) => {
                let type = "Medical";
                if (el.tags.amenity === "police") type = "Police";
                if (el.tags.amenity === "fire_station") type = "Fire";

                const realPhone = el.tags.phone || el.tags["contact:phone"] || el.tags["phone:mobile"] || "N/A";

                return {
                    id: `live-${el.id || index}`,
                    name: el.tags.name || `Local ${type} Center`,
                    type: type,
                    distance: calculateDistanceAndMins(userLat, userLon, el.lat, el.lon),
                    desc: el.tags["addr:street"] || el.tags["addr:suburb"] || "Live Map Location",
                    phone: realPhone,
                    lat: el.lat,
                    lon: el.lon,
                    isLive: true
                };
            });
        } catch (e) {
        }
    }
    return [];
};

const isValidCoords = (coords) => {
    return (
        coords &&
        typeof coords === "string" &&
        /\d/.test(coords) &&
        !coords.includes("Fetching") &&
        !coords.includes("Updating") &&
        !coords.includes("denied")
    );
};

const getGoogleMapsUrl = (coords) => {
    if (!isValidCoords(coords)) return "#";
    const cleanCoords = coords.replace(/°/g, '').replace(/N/g, 'N').replace(/E/g, 'E').trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanCoords)}`;
};

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

const TIMELINE_STEPS = [
    { step: 1, label: "SOS Activated", waitingText: "Broadcasting the alert…" },
    { step: 2, label: "Location Shared", waitingText: "Sharing GPS location…" },
    { step: 3, label: "Panchayat Notified", waitingText: "Waiting for a Ward Member to assign a team…" },
    { step: 4, label: "Team Assigned", waitingText: "Team assigned, preparing to dispatch…" },
    { step: 5, label: "Help On The Way", waitingText: "Responders are en route." },
];

function nowTime() {
    const d = new Date();
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ", " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function reverseGeocode(lat, lon) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const addr = data.address || {};

        const place = addr.suburb || addr.neighbourhood || addr.village || addr.residential || addr.road || addr.town;
        const city = addr.town || addr.city || addr.county || addr.state_district;

        if (place && city && place !== city) return `${place}, ${city}`;
        return place || city || data.display_name || null;
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

export default function EmergencyPage() {
    const [userRole, setUserRole] = useState("citizen");
    const [currentUser, setCurrentUser] = useState({ name: "", phone: "" });
    const [currentWard, setCurrentWard] = useState("ward-1");
    const [panchayathName, setPanchayathName] = useState("Pookkottumpadam Grama Panchayath");

    const [emergency, setEmergency] = useState(null);
    const [wardInbox, setWardInbox] = useState([]);
    const [panchayathInbox, setPanchayathInbox] = useState([]);
    const [history, setHistory] = useState([]);
    const [broadcasts, setBroadcasts] = useState([]);

    const [dbResources, setDbResources] = useState([]);
    const [liveMapResources, setLiveMapResources] = useState([]);

    const [newAlertTitle, setNewAlertTitle] = useState("");
    const [toast, setToast] = useState(null);

    const [resForm, setResForm] = useState({
        id: null,
        name: "",
        type: "Medical",
        distance: "",
        desc: "",
        phone: ""
    });

    const [selectedType, setSelectedType] = useState("Medical");
    const [location, setLocation] = useState({ coords: "Fetching...", name: "Fetching location...", lat: null, lon: null, time: "Just now" });
    const [filteredResources, setFilteredResources] = useState([]);

    const [locationGranted, setLocationGranted] = useState(false);
    const [showLocationPrompt, setShowLocationPrompt] = useState(false);

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

        const rawWard =
            loggedInUser.wardName ||
            loggedInUser.ward ||
            loggedInUser.wardNumber ||
            loggedInUser.ward_number ||
            localStorage.getItem("userWard") ||
            "ward-1";

        setCurrentWard(rawWard);
        const freshPhone = getFreshUserPhone();

        setCurrentUser({
            name: loggedInUser.name || loggedInUser.fullName || loggedInUser.username || "User",
            phone: freshPhone,
        });

        setPanchayathName(loggedInUser.panchayathName || "Pookkottumpadam Grama Panchayath");

        try {
            const stored = JSON.parse(localStorage.getItem("emergency_broadcasts") || "[]");
            if (Array.isArray(stored) && stored.length > 0) setBroadcasts(stored);
        } catch (e) { }

        fetchAllBackendData();
        const interval = setInterval(fetchAllBackendData, 8000);

        handleRefreshLocation();
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const combined = [...dbResources, ...liveMapResources];
        setFilteredResources(
            selectedType === "Other" ? combined : combined.filter((r) => r.type === selectedType)
        );
    }, [selectedType, dbResources, liveMapResources]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(t);
    }, [toast]);

    const fetchBroadcastsOnly = async () => {
        try {
            const res = await api.get("emergencies/broadcasts/");
            const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setBroadcasts(list);
            localStorage.setItem("emergency_broadcasts", JSON.stringify(list));
        } catch (error) {
            console.error("Error fetching broadcasts:", error);
        }
    };

    const fetchResources = async () => {
        try {
            const res = await api.get("emergencies/resources/");
            const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setDbResources(list);
        } catch (error) {
            console.error("Error fetching resources:", error);
        }
    };

    const fetchAllBackendData = async () => {
        fetchBroadcastsOnly();
        fetchResources();

        try {
            const res = await api.get("emergencies/active/");
            const activeData = res.data;
            if (activeData && activeData.id) {
                setEmergency({
                    id: activeData.id,
                    type: activeData.type,
                    icon: activeData.icon,
                    iconClass: activeData.icon_class,
                    ward: activeData.ward,
                    locationName: activeData.location_name,
                    coords: activeData.coords,
                    citizen: { name: activeData.citizen_name, phone: activeData.citizen_phone },
                    step: activeData.step,
                    createdAt: activeData.created_at
                });
            } else {
                setEmergency(null);
            }
        } catch (error) {
            setEmergency(null);
        }

        try {
            const wardRes = await api.get("emergencies/ward-inbox/");
            setWardInbox(Array.isArray(wardRes.data) ? wardRes.data : []);
        } catch (e) {}

        try {
            const panchayatRes = await api.get("emergencies/panchayat-inbox/");
            setPanchayathInbox(Array.isArray(panchayatRes.data) ? panchayatRes.data : []);
        } catch (e) {}

        try {
            const histRes = await api.get("emergencies/history/");
            setHistory(Array.isArray(histRes.data) ? histRes.data : []);
        } catch (e) {}
    };

    const isCitizen = userRole.includes("citizen");
    const isWardMember = userRole.includes("ward");
    const isPanchayath = userRole.includes("panchayat") || userRole.includes("admin");

    const myWardInbox = wardInbox.filter((m) =>
        getWardName(m.ward).toLowerCase() === getWardName(currentWard).toLowerCase() ||
        m.ward?.toLowerCase() === currentWard?.toLowerCase()
    );

    const myWardEmergency = emergency && (
        getWardName(emergency.ward).toLowerCase() === getWardName(currentWard).toLowerCase() ||
        emergency.ward?.toLowerCase() === currentWard?.toLowerCase()
    ) ? emergency : null;

    const handleRefreshLocation = (onSuccess, onError) => {
        setLocation((l) => ({ ...l, coords: "Updating...", name: "Locating..." }));
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    const coords = `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;

                    setLocationGranted(true);
                    const realName = await reverseGeocode(lat, lon);
                    const displayLocName = realName || `${getWardName(currentWard)}, Location Found`;

                    setLocation({ coords, name: displayLocName, lat, lon, time: nowTime() });

                    const mapResults = await fetchLiveNearbyServices(lat, lon);
                    setLiveMapResources(mapResults);

                    if (onSuccess) onSuccess(coords);
                },
                () => {
                    setLocation((l) => ({ ...l, coords: "Location access denied", time: "", name: `${getWardName(currentWard)}, Pookkottumpadam` }));
                    setLocationGranted(false);
                    if (onError) onError();
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        } else {
            setLocationGranted(false);
            if (onError) onError();
        }
    };

    const handleSOSActivate = async () => {
        if (emergency) return;
        const meta = typeMeta[selectedType] || typeMeta.Other;
        const activePhone = getFreshUserPhone();

        const safeLocationName =
            (!location.name || location.name.includes("Fetching") || location.name.includes("Locating"))
                ? `${getWardName(currentWard)}, Pookkottumpadam`
                : location.name;

        const mapUrl = isValidCoords(location.coords)
            ? getGoogleMapsUrl(location.coords)
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(safeLocationName)}`;

        const payload = {
            type: selectedType,
            icon: meta.icon,
            iconClass: meta.cls,
            ward: currentWard,
            locationName: safeLocationName,
            coords: location.coords,
            citizen: {
                name: currentUser.name || "User",
                phone: activePhone
            },
        };

        try {
            const res = await api.post("emergencies/active/", payload);
            const newEm = res.data;

            if (newEm) {
                api.post("send-sos/", {
                    ward_number: currentWard,
                    ward_name: getWardName(currentWard),
                    user_name: currentUser.name || "Citizen",
                    user_phone: activePhone,
                    location_link: mapUrl
                }).catch(() => {});

                setToast("🚨 SOS Activated! Emergency SMS sent to Ward Member.");
                await fetchAllBackendData();

                if (locationGranted) {
                    setTimeout(async () => {
                        try {
                            await api.patch(`emergencies/${newEm.id}/step/`, { step: 2 });
                            fetchAllBackendData();
                        } catch (e) {}
                    }, 1000);

                    setTimeout(async () => {
                        try {
                            await api.patch(`emergencies/${newEm.id}/step/`, { step: 3 });
                            fetchAllBackendData();
                        } catch (e) {}
                    }, 2200);
                } else {
                    setShowLocationPrompt(true);
                }
            }
        } catch (error) {
            setToast("Failed to activate SOS. Server error.");
        }
    };

    const proceedSOSWithLocation = async (coords, locName) => {
        if (!emergency) return;
        setShowLocationPrompt(false);

        try {
            await api.patch(`emergencies/${emergency.id}/step/`, { step: 2, coords: coords, locationName: locName });
            fetchAllBackendData();

            setTimeout(async () => {
                try {
                    await api.patch(`emergencies/${emergency.id}/step/`, { step: 3 });
                    fetchAllBackendData();
                } catch (e) {}
            }, 1200);
        } catch (e) {}
    };

    const handleEnableLocationForSOS = () => {
        handleRefreshLocation(
            async (coords) => {
                proceedSOSWithLocation(coords, location.name);
            },
            async () => {
                const fallbackLoc = `${getWardName(currentWard)}, Pookkottumpadam`;
                setToast("GPS unavailable. Using registered ward location.");
                proceedSOSWithLocation("Registered Address", fallbackLoc);
            }
        );
    };

    const handleCancelSOS = async () => {
        if (!emergency) return;
        if (!window.confirm("Cancel this SOS request? This cannot be undone.")) return;

        const cancelId = emergency.id;
        setEmergency(null);
        setShowLocationPrompt(false);

        try {
            await api.post(`emergencies/${cancelId}/cancel/`);
            setToast("SOS cancelled.");
            await fetchAllBackendData();
        } catch (e) {}
    };

    const handleAssignTeam = async () => {
        if (!emergency) return;
        try {
            await api.patch(`emergencies/${emergency.id}/step/`, { step: 4, assignedBy: currentUser.name, assignedAt: nowTime() });
            setToast("Team assigned. The citizen has been notified.");
            fetchAllBackendData();
        } catch (e) {}
    };

    const handleDispatch = async () => {
        if (!emergency) return;
        try {
            await api.patch(`emergencies/${emergency.id}/step/`, { step: 5, dispatchedAt: nowTime() });
            setToast("Team dispatched. Help is on the way.");
            fetchAllBackendData();
        } catch (e) {}
    };

    const handleResolve = async () => {
        if (!emergency) return;
        const resolveId = emergency.id;
        setEmergency(null);
        setShowLocationPrompt(false);

        try {
            await api.post(`emergencies/${resolveId}/resolve/`);
            setToast("Request marked resolved.");
            await fetchAllBackendData();
        } catch (e) {}
    };

    const handleAddBroadcast = async (e) => {
        e.preventDefault();
        if (!newAlertTitle.trim()) {
            setToast("Please enter a warning message.");
            return;
        }

        try {
            const res = await api.post("emergencies/broadcasts/", {
                title: newAlertTitle,
                level: "Urgent",
                ward: "Panchayat Wide"
            });
            const newBroadcast = res.data;
            if (newBroadcast) {
                setBroadcasts((prev) => [newBroadcast, ...prev]);
                setNewAlertTitle("");
                setToast("Warning alert broadcasted successfully!");
                fetchBroadcastsOnly();
            }
        } catch (error) {
            setToast("Failed to broadcast alert.");
        }
    };

    const handleDeleteBroadcast = async (id) => {
        if (window.confirm("Delete this emergency alert?")) {
            try {
                await api.delete(`emergencies/broadcasts/${id}/`);
                setBroadcasts((prev) => prev.filter((item) => item.id !== id));
                setToast("Alert deleted.");
                fetchBroadcastsOnly();
            } catch (e) {}
        }
    };

    const handleSaveResource = async (e) => {
        e.preventDefault();
        if (!resForm.name || !resForm.phone) {
            setToast("Please enter Name and Phone Number.");
            return;
        }

        const isEdit = !!resForm.id;
        const url = isEdit
            ? `emergencies/resources/${resForm.id}/`
            : "emergencies/resources/";

        const payload = {
            name: resForm.name,
            type: resForm.type,
            distance: resForm.distance || "0.5km • 5 mins",
            desc: resForm.desc || "Emergency Service",
            phone: resForm.phone
        };

        try {
            const res = isEdit ? await api.put(url, payload) : await api.post(url, payload);
            const savedItem = res.data;

            if (savedItem) {
                setDbResources((prev) => {
                    if (isEdit) {
                        return prev.map((item) => (item.id === savedItem.id ? savedItem : item));
                    }
                    return [savedItem, ...prev];
                });

                setToast(isEdit ? "Contact updated successfully!" : "Contact added successfully!");
                setResForm({ id: null, name: "", type: "Medical", distance: "", desc: "", phone: "" });
                fetchResources();
            }
        } catch (error) {
            setToast("Failed to save contact details.");
        }
    };

    const handleEditResourceClick = (r) => {
        setResForm({
            id: r.id,
            name: r.name,
            type: r.type || "Medical",
            distance: r.distance || "",
            desc: r.desc || "",
            phone: r.phone
        });
    };

    const handleDeleteResourceClick = async (id) => {
        if (window.confirm("Are you sure you want to delete this emergency contact?")) {
            try {
                await api.delete(`emergencies/resources/${id}/`);
                setDbResources((prev) => prev.filter((item) => item.id !== id));
                setToast("Contact deleted.");
                fetchResources();
            } catch (e) {}
        }
    };

    const Timeline = ({ data }) => (
        <div className="em-card em-timeline-card">
            <h4>⏱️ Active Response Timeline</h4>
            {!data ? (
                <p className="em-timeline-empty">No active emergency right now.</p>
            ) : (
                <div className="em-timeline">
                    {TIMELINE_STEPS.map((s) => (
                        <div key={s.step} className={`em-time-item ${getTimelineClass(data, s.step)}`}>
                            <div className={`em-dot ${getDotClass(data, s.step)} ${data.step === s.step ? "pulse-dot" : ""}`}></div>
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
                {history.length === 0 ? (
                    <p className="em-timeline-empty">No past emergency logs.</p>
                ) : (
                    history.slice(0, 10).map((req) => (
                        <div key={req.id} className="em-recent-item">
                            <div className={`em-rec-icon ${req.iconClass}`}>{req.icon}</div>
                            <div className="em-rec-info">
                                <strong>{req.title}</strong>
                                <span style={{ fontSize: "11px", color: "#64748b" }}>🗓️ {req.time}</span>
                            </div>
                            <span className={`em-tag ${req.status === 'RESOLVED' ? 'em-badge-green' : 'em-badge-yellow'}`}>
                                {req.status}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="em-container">
            {toast && <div className="em-toast">{toast}</div>}

            {broadcasts.length > 0 && (
                <div className="em-top-banner" style={{ background: "#dc2626", color: "white", padding: "12px 20px", borderRadius: "8px", marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 12px rgba(220, 38, 38, 0.25)" }}>
                    <div>
                        <span style={{ fontSize: "16px", marginRight: "8px" }}>⚠️</span>
                        <strong>Emergency Warning:</strong> {broadcasts[0].title}
                        <span style={{ marginLeft: "12px", fontSize: "11px", background: "rgba(255,255,255,0.25)", padding: "2px 8px", borderRadius: "4px" }}>
                            🗓️ {formatDate(broadcasts[0].created_at || broadcasts[0].formatted_date || broadcasts[0].time)}
                        </span>
                    </div>
                    {isPanchayath && (
                        <button onClick={() => handleDeleteBroadcast(broadcasts[0].id)} style={{ background: "white", color: "#dc2626", border: "none", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
                            ✖ Delete
                        </button>
                    )}
                </div>
            )}

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
                                <strong className="em-loc-ward">
                                    {location.name}{" "}
                                    {isValidCoords(location.coords) && (
                                        <>
                                            (
                                            <a
                                                href={getGoogleMapsUrl(location.coords)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: "#2563eb", textDecoration: "underline" }}
                                            >
                                                {location.coords}
                                            </a>
                                            )
                                        </>
                                    )}
                                </strong>
                                <span className="em-loc-coords">
                                    {location.time}
                                </span>
                            </div>
                            <div className="em-loc-refresh" onClick={() => handleRefreshLocation()} title="Refresh Location">
                                ↻
                            </div>
                        </div>
                    </div>

                    {broadcasts.length > 0 && (
                        <div className="em-card" style={{ background: "#fef2f2", border: "1px solid #fecaca", marginBottom: "20px" }}>
                            <h3 style={{ color: "#991b1b", margin: "0 0 10px 0", fontSize: "16px" }}>⚠️ Active Emergency Warnings</h3>
                            {broadcasts.map((b) => (
                                <div key={b.id} style={{ background: "white", padding: "12px 16px", borderRadius: "8px", border: "1px solid #fca5a5", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <strong style={{ color: "#991b1b", fontSize: "14px", display: "block" }}>🚨 {b.title}</strong>
                                        <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#7f1d1d" }}>
                                            📍 {b.ward || "Panchayat Wide"}
                                        </p>
                                    </div>
                                    <span style={{ fontSize: "11px", color: "#9f1239", background: "#ffe4e6", padding: "4px 8px", borderRadius: "6px", fontWeight: "600" }}>
                                        🗓️ {formatDate(b.created_at || b.formatted_date || b.time)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {showLocationPrompt && emergency && emergency.step === 1 && (
                        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px" }}>
                            <div style={{ background: "white", borderRadius: "16px", padding: "24px", maxWidth: "360px", width: "100%", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}>
                                <div style={{ fontSize: "40px", marginBottom: "10px" }}>📍</div>
                                <h3 style={{ margin: "0 0 8px 0", color: "#b91c1c", fontSize: "16px" }}>Location Not Shared</h3>
                                <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px 0" }}>
                                    Your SOS was activated, but we couldn't get your live location. Turn on location so the Ward Member can find you.
                                </p>
                                <button type="button" onClick={handleEnableLocationForSOS} style={{ background: "#dbeafe", border: "none", borderRadius: "999px", padding: "8px 14px", width: "100%", marginBottom: "6px", cursor: "pointer", fontWeight: 700, color: "#1e3a8a" }}>
                                    Allow location access ✓
                                </button>
                                <button className="em-btn-resolve" style={{ background: "#ef4444", marginTop: "10px" }} onClick={handleCancelSOS}>
                                    Cancel SOS Instead
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
                                    disabled={!!emergency || location.name.includes("Locating")}
                                >
                                    <h2>{emergency ? "SENT" : location.name.includes("Locating") ? "WAIT" : "SOS"}</h2>
                                    <span>
                                        {location.name.includes("Locating")
                                            ? "LOCATING..."
                                            : emergency
                                                ? "BROADCASTING…"
                                                : "ACTIVATE SOS"}
                                    </span>
                                </button>

                                {emergency && emergency.step < 4 && (
                                    <button className="em-btn-resolve" style={{ background: "#ef4444", marginBottom: "20px" }} onClick={handleCancelSOS}>
                                        ✖ Cancel SOS (Activated by mistake)
                                    </button>
                                )}

                                <div className="em-sos-quick-actions">
                                    <button onClick={() => window.open(`tel:${dbResources.find(r => r.type === 'Medical')?.phone || '108'}`)}>
                                        🚑 Ambulance ({dbResources.find(r => r.type === 'Medical')?.phone || '108'})
                                    </button>
                                    <button onClick={() => window.open(`tel:${dbResources.find(r => r.type === 'Police')?.phone || '112'}`)}>
                                        🛡️ Police ({dbResources.find(r => r.type === 'Police')?.phone || '112'})
                                    </button>
                                    <button onClick={() => window.open(`tel:${dbResources.find(r => r.type === 'Fire')?.phone || '101'}`)}>
                                        🚒 Fire Force ({dbResources.find(r => r.type === 'Fire')?.phone || '101'})
                                    </button>
                                    <button onClick={() => setSelectedType("Medical")}>🏥 Hospitals</button>
                                </div>
                            </div>

                            <div className="em-section-title">Select Emergency Type</div>
                            <div className="em-type-grid">
                                {emergencyTypes.map((type) => (
                                    <button key={type.name} className={`em-type-btn ${selectedType === type.name ? "em-type-btn-active" : ""}`} onClick={() => setSelectedType(type.name)} disabled={!!emergency}>
                                        <span>{type.icon}</span>
                                        {type.name}
                                    </button>
                                ))}
                            </div>

                            <div className="em-resource-grid" style={{ marginTop: "20px" }}>
                                {filteredResources.length === 0 ? (
                                    <p className="em-timeline-empty">No emergency places or contacts found.</p>
                                ) : (
                                    filteredResources.map((res) => (
                                        <div key={res.id} className="em-resource-card">
                                            <div className="em-res-header">
                                                <strong>{res.name}</strong>
                                                <span className={`em-badge ${res.type === "Medical" ? "em-badge-green" : "em-badge-yellow"}`}>
                                                    {res.distance || "Near You"}
                                                </span>
                                            </div>
                                            <p>{res.desc || "Emergency Service"}</p>
                                            <div className="em-res-actions">
                                                <button
                                                    className="em-btn-call"
                                                    onClick={() => {
                                                        if (res.phone && res.phone !== "N/A") {
                                                            window.open(`tel:${res.phone}`);
                                                        } else {
                                                            alert("This place's direct contact number is not available on OpenStreetMap. You can add its verified number using Panchayat Admin Panel.");
                                                        }
                                                    }}
                                                    style={{ opacity: res.phone === "N/A" ? 0.7 : 1 }}
                                                >
                                                    📞 Call {res.phone !== "N/A" ? `(${res.phone})` : "(No Direct Number)"}
                                                </button>

                                                <button
                                                    className="em-btn-nav"
                                                    onClick={() => {
                                                        const dest = res.lat && res.lon
                                                            ? `${res.lat},${res.lon}`
                                                            : encodeURIComponent(`${res.name} near ${location.name}`);
                                                        const navUrl = location.lat && location.lon
                                                            ? `https://www.google.com/maps/dir/?api=1&origin=${location.lat},${location.lon}&destination=${dest}`
                                                            : `https://www.google.com/maps/search/?api=1&query=${dest}`;
                                                        window.open(navUrl, "_blank");
                                                    }}
                                                >
                                                    🧭 Navigate
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="em-right-col">
                            <Timeline data={emergency} />
                            <RecentRequests title="⏱️ Past Emergency History" />
                        </div>
                    </div>
                </>
            )}

            {isWardMember && (
                <>
                    <div className="em-header-section">
                        <div className="em-header-titles">
                            <h2>Ward Response Dashboard</h2>
                            <p>{currentUser.name} — incoming SOS alerts and response coordination for <strong>{getWardName(currentWard)}</strong>.</p>
                        </div>
                    </div>

                    {broadcasts.length > 0 && (
                        <div className="em-card" style={{ background: "#fef2f2", border: "1px solid #fecaca", marginBottom: "20px" }}>
                            <h3 style={{ color: "#991b1b", margin: "0 0 10px 0", fontSize: "16px" }}>⚠️ Panchayat Warnings</h3>
                            {broadcasts.map((b) => (
                                <div key={b.id} style={{ background: "white", padding: "12px 16px", borderRadius: "8px", border: "1px solid #fca5a5", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <strong style={{ color: "#991b1b", fontSize: "14px", display: "block" }}>🚨 {b.title}</strong>
                                        <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#7f1d1d" }}>
                                            📍 {b.ward || "Panchayat Wide"}
                                        </p>
                                    </div>
                                    <span style={{ fontSize: "11px", color: "#9f1239", background: "#ffe4e6", padding: "4px 8px", borderRadius: "6px", fontWeight: "600" }}>
                                        🗓️ {formatDate(b.created_at || b.formatted_date || b.time)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="em-main-grid">
                        <div className="em-left-col">
                            <div className="em-card">
                                <h3 className="em-red-title">📩 Messages — {getWardName(currentWard)} ({getFreshUserPhone()})</h3>
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

                            {myWardEmergency ? (
                                <div className="em-card em-request-card">
                                    <div className="em-res-header">
                                        <strong>
                                            {myWardEmergency.icon} {myWardEmergency.type} Emergency — {getWardName(myWardEmergency.ward)}
                                        </strong>
                                        <span className="em-badge em-badge-yellow">Step {myWardEmergency.step}/5</span>
                                    </div>

                                    <p style={{ margin: "8px 0", fontSize: "13px", color: "#475569" }}>
                                        📍 {myWardEmergency.locationName}{" "}
                                        {isValidCoords(myWardEmergency.coords) && (
                                            <>
                                                (
                                                <a
                                                    href={getGoogleMapsUrl(myWardEmergency.coords)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: "#2563eb", textDecoration: "underline", fontWeight: "600" }}
                                                    title="Open coordinates in Google Maps"
                                                >
                                                    {myWardEmergency.coords}
                                                </a>
                                                )
                                            </>
                                        )}
                                    </p>

                                    <p style={{ margin: "0 0 15px 0", fontSize: "13px", color: "#475569" }}>
                                        👤 {myWardEmergency.citizen.name} — {myWardEmergency.citizen.phone}
                                    </p>

                                    <div className="em-res-actions">
                                        <button className="em-btn-call" onClick={() => window.open(`tel:${myWardEmergency.citizen.phone}`)}>
                                            📞 Call Citizen
                                        </button>
                                        {myWardEmergency.step === 3 && (
                                            <button className="em-btn-nav em-btn-primary" onClick={handleAssignTeam}>
                                                ✅ Assign My Team
                                            </button>
                                        )}
                                        {myWardEmergency.step === 4 && (
                                            <button className="em-btn-nav em-btn-primary" onClick={handleDispatch}>
                                                🚀 Dispatch — Help on the Way
                                            </button>
                                        )}
                                        {myWardEmergency.step === 5 && (
                                            <button className="em-btn-nav em-btn-primary" onClick={handleResolve}>
                                                ✔️ Mark Resolved
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="em-card">
                                    <p className="em-timeline-empty">No active SOS request in {getWardName(currentWard)} right now.</p>
                                </div>
                            )}
                        </div>

                        <div className="em-right-col">
                            <Timeline data={myWardEmergency} />
                            <RecentRequests title="⏱️ Past Emergency History" />
                        </div>
                    </div>
                </>
            )}

            {isPanchayath && (
                <>
                    <div className="em-header-section">
                        <div className="em-header-titles">
                            <h2>Panchayath Emergency Control</h2>
                            <p>{panchayathName} — monitor SOS activity and manage emergency directory.</p>
                        </div>
                    </div>

                    <div className="em-admin-panel" style={{ marginBottom: "20px", background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <h3 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>📞 Manage Emergency Directory</h3>
                        <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 15px 0" }}>
                            Add, update or delete custom emergency contacts (Hospitals, Police, KSEB, Fire Force, etc.).
                        </p>

                        <form onSubmit={handleSaveResource} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "15px" }}>
                            <input
                                type="text"
                                placeholder="Service Name (e.g. Taluk Hospital)"
                                value={resForm.name}
                                onChange={(e) => setResForm({ ...resForm, name: e.target.value })}
                                required
                                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                            />
                            <input
                                type="text"
                                placeholder="Phone Number"
                                value={resForm.phone}
                                onChange={(e) => setResForm({ ...resForm, phone: e.target.value })}
                                required
                                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                            />
                            <select
                                value={resForm.type}
                                onChange={(e) => setResForm({ ...resForm, type: e.target.value })}
                                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                            >
                                <option value="Medical">Medical / Hospital</option>
                                <option value="Police">Police Station</option>
                                <option value="Fire">Fire Force</option>
                                <option value="Electrical">KSEB / Electrical</option>
                                <option value="Flood">Flood Response</option>
                                <option value="Accident">Accident Helpline</option>
                                <option value="Other">Other Helpline</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Distance/Timing (e.g. 1.2km • 8 mins)"
                                value={resForm.distance}
                                onChange={(e) => setResForm({ ...resForm, distance: e.target.value })}
                                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                            />
                            <input
                                type="text"
                                placeholder="Description (e.g. 24/7 Ward)"
                                value={resForm.desc}
                                onChange={(e) => setResForm({ ...resForm, desc: e.target.value })}
                                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                            />
                            <div style={{ display: "flex", gap: "6px" }}>
                                <button type="submit" style={{ flex: 1, background: "#2563eb", color: "white", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
                                    {resForm.id ? "Update Contact" : "Add Contact"}
                                </button>
                                {resForm.id && (
                                    <button
                                        type="button"
                                        onClick={() => setResForm({ id: null, name: "", type: "Medical", distance: "", desc: "", phone: "" })}
                                        style={{ background: "#64748b", color: "white", border: "none", borderRadius: "6px", padding: "0 10px", cursor: "pointer" }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>

                        <div style={{ maxHeight: "200px", overflowY: "auto", borderTop: "1px solid #e2e8f0", paddingTop: "10px" }}>
                            <table style={{ width: "100%", fontSize: "13px", textAlign: "left", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#f1f5f9", color: "#475569" }}>
                                        <th style={{ padding: "6px 8px" }}>Name</th>
                                        <th style={{ padding: "6px 8px" }}>Type</th>
                                        <th style={{ padding: "6px 8px" }}>Phone</th>
                                        <th style={{ padding: "6px 8px" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dbResources.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" style={{ padding: "10px", textAlign: "center", color: "#94a3b8" }}>
                                                No custom contacts added yet. Overpass live map places will show automatically.
                                            </td>
                                        </tr>
                                    ) : (
                                        dbResources.map((r) => (
                                            <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "6px 8px", fontWeight: "600" }}>{r.name}</td>
                                                <td style={{ padding: "6px 8px" }}>{r.type}</td>
                                                <td style={{ padding: "6px 8px" }}>{r.phone}</td>
                                                <td style={{ padding: "6px 8px", display: "flex", gap: "8px" }}>
                                                    <button
                                                        onClick={() => handleEditResourceClick(r)}
                                                        style={{ background: "#3b82f6", color: "white", border: "none", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteResourceClick(r.id)}
                                                        style={{ background: "#ef4444", color: "white", border: "none", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="em-admin-panel" style={{ marginBottom: "20px", background: "#fef2f2", padding: "20px", borderRadius: "12px", border: "1px solid #fecaca" }}>
                        <h3 style={{ margin: "0 0 10px 0", color: "#b91c1c" }}>🛡️ Broadcast Warning Manager</h3>
                        <form onSubmit={handleAddBroadcast} style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                            <input
                                type="text"
                                placeholder="Type new emergency warning..."
                                value={newAlertTitle}
                                onChange={(e) => setNewAlertTitle(e.target.value)}
                                style={{ flex: 1, padding: "10px 14px", borderRadius: "6px", border: "1px solid #fca5a5" }}
                            />
                            <button type="submit" style={{ background: "#ef4444", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", fontWeight: "700", cursor: "pointer" }}>
                                Broadcast Alert
                            </button>
                        </form>
                        <div className="em-admin-list">
                            {broadcasts.length === 0 ? (
                                <p style={{ fontSize: "13px", color: "#991b1b" }}>No active warning alerts broadcasted.</p>
                            ) : (
                                broadcasts.map((item) => (
                                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "white", borderRadius: "6px", marginBottom: "6px", border: "1px solid #fca5a5" }}>
                                        <div>
                                            <span style={{ fontWeight: "600", color: "#991b1b", fontSize: "14px", display: "block" }}>
                                                ⚠️ {item.title}
                                            </span>
                                            <span style={{ fontSize: "11px", color: "#9f1239" }}>
                                                🗓️ {formatDate(item.created_at || item.formatted_date || item.time)}
                                            </span>
                                        </div>
                                        <button onClick={() => handleDeleteBroadcast(item.id)} style={{ background: "#dc2626", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
                                            Delete
                                        </button>
                                    </div>
                                ))
                            )}
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
                                            {emergency.icon} {emergency.type} Emergency — {getWardName(emergency.ward)}
                                        </strong>
                                        <span className="em-badge em-badge-yellow">Step {emergency.step}/5</span>
                                    </div>
                                    <p style={{ margin: "8px 0", fontSize: "13px", color: "#475569" }}>
                                        📍 {emergency.locationName}{" "}
                                        {isValidCoords(emergency.coords) && (
                                            <>
                                                (
                                                <a
                                                    href={getGoogleMapsUrl(emergency.coords)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: "#2563eb", textDecoration: "underline", fontWeight: "600" }}
                                                    title="Open coordinates in Google Maps"
                                                >
                                                    {emergency.coords}
                                                </a>
                                                )
                                            </>
                                        )}{" "}
                                        • Ward Member notified
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
                            <RecentRequests title="⏱️ Past Emergency History (Panchayat Wide)" />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}