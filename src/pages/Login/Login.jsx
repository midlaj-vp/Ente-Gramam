import { useState } from "react";
import {
    User,
    Lock,
    Eye,
    EyeOff,
    Users,
    Bell,
    ShieldCheck,
    Leaf,
    TreePine,
    ArrowRight,
    MapPin,
    Building2,
} from "lucide-react";
import "./Login.css";

function normalizeWard(value) {
    if (!value) return "";
    return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

export default function Login({ onLogin, onCreateAccount }) {
    const [role, setRole] = useState("citizen"); // role values: "citizen", "ward", "panchayat"
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [wardName, setWardName] = useState("");

    const [errors, setErrors] = useState({});

    // Forgot Password & OTP states
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [forgotMobile, setForgotMobile] = useState("");
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [enteredOtp, setEnteredOtp] = useState("");
    const [generatedOtp, setGeneratedOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [forgotError, setForgotError] = useState("");
    const [forgotSuccess, setForgotSuccess] = useState("");

    // Use Descriptive Ward Names exclusively
    const wardData = {
        "ward-1": "North Ward",
        "ward-2": "South Ward",
        "ward-3": "East Ward",
        "ward-4": "West Ward",
        "ward-5": "Central Ward",
        "ward-6": "Hill View",
        "ward-7": "River Side",
        "ward-8": "Market Ward",
    };



    const handleRoleChange = (newRole) => {
        setRole(newRole);
        setUsername("");
        setPassword("");
        setWardName("");
        setErrors({});
        setRememberMe(false);
        setIsForgotMode(false);
        setIsOtpSent(false);
        setForgotError("");
        setForgotSuccess("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        let newErrors = {};

        if (!rememberMe) {
            newErrors.rememberMe = "Please check 'Remember Me' to proceed.";
        }

        if (role === "ward" && !wardName) {
            newErrors.wardName = "Please select your ward name.";
        }

        if (!username) {
            newErrors.username = "Username is required.";
        }

        if (!password) {
            newErrors.password = "Password is required.";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Panchayat Login Check
        if (role === "panchayat") {
            const defaultPanchayatUser = "admin";
            const defaultPanchayatPass = "1234";

            if (username === defaultPanchayatUser && password === defaultPanchayatPass) {
                setErrors({});
                const panchayatObj = { id: "ADMIN-001", role: "panchayat", username: "admin", name: "Panchayat Office", wardName: "" };
                onLogin(panchayatObj);
                return;
            } else {
                setErrors({ general: "Invalid Panchayat username or password!" });
                return;
            }
        }

        // Citizen / Ward Member Login Check
        const usersList = JSON.parse(localStorage.getItem("usersList") || "[]");

        const foundUser = usersList.find((u) => {
            if (role === "citizen") {
                return u.username === username && u.password === password && (u.role === "citizen" || !u.role);
            } else if (role === "ward") {
                // Compatible with existing accounts that might have stored wardNumber historically, but checks against normalized names
                const userWard = normalizeWard(u.wardName || u.wardNumber || "");
                return u.username === username && u.password === password && u.role === "ward" && userWard === normalizeWard(wardName);
            }
            return false;
        });

        if (foundUser) {
            setErrors({});
            const activeUser = {
                ...foundUser,
                id: foundUser.id || foundUser.userId || foundUser.username || `CIT-${Date.now()}`,
                role: role,
                wardName: role === "ward" ? wardName : (foundUser.wardName || "")
            };
            onLogin(activeUser);
        } else {
            if (role === "ward") {
                setErrors({ general: "Invalid username, password, or the selected ward does not match!" });
            } else {
                setErrors({ general: "Invalid username or password for Citizen account!" });
            }
        }
    };

    const handleSendOtp = (e) => {
        e.preventDefault();
        setForgotError("");
        setForgotSuccess("");

        if (!forgotMobile || forgotMobile.length !== 10) {
            setForgotError("Please enter a valid 10-digit mobile number.");
            return;
        }

        let usersList = JSON.parse(localStorage.getItem("usersList") || "[]");
        const userExists = usersList.some((u) => u.mobile === forgotMobile && (u.role === role || (!u.role && role === "citizen")));

        if (!userExists) {
            setForgotError("No user found with this mobile number for the selected role.");
            return;
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        setGeneratedOtp(otp);
        setIsOtpSent(true);

        console.log("Your OTP is:", otp);
        setForgotSuccess(`OTP sent successfully! (Check Console for OTP: ${otp})`);
    };

    const handleVerifyAndUpdate = (e) => {
        e.preventDefault();
        setForgotError("");
        setForgotSuccess("");

        if (enteredOtp !== generatedOtp) {
            setForgotError("Invalid OTP. Please enter the correct OTP.");
            return;
        }

        if (!newPassword || newPassword.length < 6) {
            setForgotError("New password must be at least 6 characters.");
            return;
        }

        let usersList = JSON.parse(localStorage.getItem("usersList") || "[]");
        const userIndex = usersList.findIndex((u) => u.mobile === forgotMobile && (u.role === role || (!u.role && role === "citizen")));

        if (userIndex === -1) {
            setForgotError("User not found.");
            return;
        }

        const foundUsername = usersList[userIndex].username;

        usersList[userIndex].password = newPassword;
        localStorage.setItem("usersList", JSON.stringify(usersList));

        setForgotSuccess(`Success! Your Username is: "${foundUsername}" & Password updated!`);

        setTimeout(() => {
            setIsForgotMode(false);
            setIsOtpSent(false);
            setForgotSuccess("");
            setForgotMobile("");
            setEnteredOtp("");
            setNewPassword("");
            setGeneratedOtp("");
        }, 6000);
    };

    const handleCreateAccount = () => {
        if (onCreateAccount) onCreateAccount();
    };

    return (
        <div className={`login-container ${role === "ward" || role === "panchayat" ? "reverse" : ""}`}>
            <div className="login-left">
                <CornerLeaves />
                <div className="left-content">
                    <div className="brand-row">
                        <div className="logo-badge"><TreePine size={24} /></div>
                        <div className="brand-name">ENTE<br />GRAMAM</div>
                    </div>
                    <p className="brand-tagline">Digital Rural Governance &amp; Community Support</p>
                    <div className="leaf-divider">
                        <span className="line" /><Leaf size={12} /><span className="line" />
                    </div>
                    <div className="headline-block" key={role}>
                        <h2>
                            {role === "citizen" && "Welcome Back!"}
                            {role === "ward" && "Ward Portal Access"}
                            {role === "panchayat" && "Panchayat Office Portal"}
                        </h2>
                        <p>
                            {role === "citizen" && "Sign in to continue your journey."}
                            {role === "ward" && "Sign in to manage your ward."}
                            {role === "panchayat" && "Sign in to administer the full Gramam."}
                        </p>
                    </div>
                    <div className="features">
                        <Feature icon={<Users size={16} />} title="Easy Access" desc="All services in one place" />
                        <Feature icon={<Bell size={16} />} title="Stay Updated" desc="Get important notifications" />
                        <Feature icon={<ShieldCheck size={16} />} title="Secure & Trusted" desc="Your data is safe" />
                    </div>
                </div>
                <div className="village-illustration">
                    <img src="/cartoon-4.png" alt="Village" onError={(e) => e.currentTarget.style.display = "none"} />
                </div>
            </div>

            <div className="login-right">
                <div className="toggle-box" style={{ display: "flex", gap: "5px" }}>
                    <button type="button" onClick={() => handleRoleChange("citizen")} className={role === "citizen" ? "active" : ""}>
                        <User size={14} /> Citizen <span className="active-underline" />
                    </button>
                    <button type="button" onClick={() => handleRoleChange("ward")} className={role === "ward" ? "active" : ""}>
                        <Users size={14} /> Ward <span className="active-underline" />
                    </button>
                    <button type="button" onClick={() => handleRoleChange("panchayat")} className={role === "panchayat" ? "active" : ""}>
                        <Building2 size={14} /> Panchayat <span className="active-underline" />
                    </button>
                </div>

                <div className="form-heading">
                    <h1>{isForgotMode ? "Reset Password" : "Login"}</h1>
                </div>

                {!isForgotMode ? (
                    <form onSubmit={handleSubmit}>
                        {errors.general && <p className="form-error" style={{ marginBottom: "15px" }}>{errors.general}</p>}

                        {role === "ward" && (
                            <>
                                <label>Ward Name</label>
                                <div className="input-field">
                                    <MapPin size={16} />
                                    <select
                                        value={wardName}
                                        onChange={(e) => { setWardName(e.target.value); setErrors({ ...errors, wardName: "" }); }}
                                        style={{ width: "100%", border: "none", outline: "none", background: "transparent" }}
                                    >
                                        <option value="" disabled hidden>Select your ward</option>
                                        {Object.values(wardData).map((name) => (
                                            <option key={name} value={name}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.wardName && <p className="form-error" style={{ fontSize: "12px", color: "red", marginTop: "4px" }}>{errors.wardName}</p>}
                            </>
                        )}

                        <label>Username</label>
                        <div className="input-field">
                            <User size={16} />
                            <input
                                type="text"
                                placeholder={role === "panchayat" ? "Enter panchayat username (e.g. admin)" : "Enter your username"}
                                value={username}
                                onChange={(e) => { setUsername(e.target.value); setErrors({ ...errors, username: "" }); }}
                            />
                        </div>
                        {errors.username && <p className="form-error" style={{ fontSize: "12px", color: "red", marginTop: "4px" }}>{errors.username}</p>}

                        <label>Password</label>
                        <div className="input-field">
                            <Lock size={16} />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder={role === "panchayat" ? "Enter panchayat password" : "Enter your password"}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setErrors({ ...errors, password: "" }); }}
                            />
                            <button type="button" className="toggle-eye" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {errors.password && <p className="form-error" style={{ fontSize: "12px", color: "red", marginTop: "4px" }}>{errors.password}</p>}

                        <div className="form-row" style={{ marginTop: "15px" }}>
                            <label className="remember-me">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => { setRememberMe(e.target.checked); setErrors({ ...errors, rememberMe: "" }); }}
                                />
                                Remember Me
                            </label>
                            {role !== "panchayat" && (
                                <button type="button" className="forgot-link" onClick={() => { setIsForgotMode(true); setErrors({}); }}>Forgot Password?</button>
                            )}
                        </div>
                        {errors.rememberMe && <p className="form-error" style={{ fontSize: "12px", color: "red", marginBottom: "10px" }}>{errors.rememberMe}</p>}

                        <button className="login-btn" type="submit">Login <ArrowRight size={16} /></button>
                    </form>
                ) : (
                    <form onSubmit={!isOtpSent ? handleSendOtp : handleVerifyAndUpdate}>
                        {!isOtpSent ? (
                            <>
                                <label>Registered Mobile Number</label>
                                <div className="input-field">
                                    <User size={16} />
                                    <input
                                        type="text"
                                        maxLength={10}
                                        placeholder="Enter 10-digit mobile number"
                                        value={forgotMobile}
                                        onChange={(e) => setForgotMobile(e.target.value.replace(/\D/g, ""))}
                                        required
                                    />
                                </div>
                                <button className="login-btn" type="submit">Send OTP</button>
                            </>
                        ) : (
                            <>
                                <label>Enter OTP</label>
                                <div className="input-field">
                                    <Lock size={16} />
                                    <input
                                        type="text"
                                        maxLength={4}
                                        placeholder="Enter 4-digit OTP"
                                        value={enteredOtp}
                                        onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
                                        required
                                    />
                                </div>

                                <label>New Password</label>
                                <div className="input-field">
                                    <Lock size={16} />
                                    <input
                                        type="password"
                                        placeholder="Enter new password (min 6 chars)"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <button className="login-btn" type="submit">Verify & Update Password</button>
                            </>
                        )}

                        {forgotError && <p className="form-error" style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>{forgotError}</p>}
                        {forgotSuccess && <p className="form-success" style={{ color: "green", fontSize: "14px", margin: "10px 0" }}>{forgotSuccess}</p>}

                        <p className="signup-hint" style={{ marginTop: "15px" }}>
                            Remembered your password?
                            <button type="button" className="link" onClick={() => { setIsForgotMode(false); setIsOtpSent(false); setForgotError(""); setForgotSuccess(""); }}>Back to Login</button>
                        </p>
                    </form>
                )}

                {!isForgotMode && role !== "panchayat" && (
                    <p className="signup-hint">
                        Don't have an account?
                        <button type="button" className="link" onClick={handleCreateAccount}>Create Account</button>
                    </p>
                )}
            </div>
        </div>
    );
}

function Feature({ icon, title, desc }) {
    return (
        <div className="feat">
            <div className="feat-icon">{icon}</div>
            <div>
                <div className="feat-title">{title}</div>
                <div className="feat-desc">{desc}</div>
            </div>
        </div>
    );
}

function CornerLeaves() {
    return (
        <svg className="corner-leaves" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 8C20 4 40 10 46 26C36 20 18 18 6 26C4 20 2 14 2 8Z" fill="currentColor" opacity="0.55" />
            <path d="M6 2C22 6 34 20 34 36C26 26 12 22 0 24C0 16 2 8 6 2Z" fill="currentColor" opacity="0.8" />
            <path d="M0 0C14 0 26 8 30 20C22 14 10 12 0 16V0Z" fill="currentColor" />
        </svg>
    );
}