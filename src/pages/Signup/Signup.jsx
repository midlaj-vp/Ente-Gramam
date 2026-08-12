import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Signup.css";
import {
    User,
    Users,
    Phone,
    Lock,
    Eye,
    EyeOff,
    Home,
    MapPin,
    UserPlus,
    Calendar,
    Droplet,
} from "lucide-react";

export default function CitizenSignUp() {
    const [role, setRole] = useState("citizen");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState({});
    const [agree, setAgree] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    const [form, setForm] = useState({
        fullName: "",
        mobile: "",
        username: "",
        password: "",
        confirmPassword: "",
        houseNumber: "",
        houseName: "",
        wardNumber: "",
        wardName: "",
        gender: "",
        dob: "",
        bloodGroup: "",
    });

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
        setErrors({});
        setForm({
            fullName: "",
            mobile: "",
            username: "",
            password: "",
            confirmPassword: "",
            houseNumber: "",
            houseName: "",
            wardNumber: "",
            wardName: "",
            gender: "",
            dob: "",
            bloodGroup: "",
        });
    };

    const handleWardChange = (e) => {
        const selectedKey = e.target.value;
        const fullNameOfWard = wardData[selectedKey] || "";

        setForm((prev) => ({
            ...prev,
            wardNumber: selectedKey,       // e.g. "ward-5"
            wardName: fullNameOfWard       // e.g. "Central Ward"
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        let newErrors = {};

        if (!form.fullName) newErrors.fullName = "Full Name is required";
        if (!/^\d{10}$/.test(form.mobile)) newErrors.mobile = "Mobile number must be 10 digits";

        const usernameRegex = /^[a-zA-Z0-9@_.-]+$/;
        if (!form.username) {
            newErrors.username = "Username is required";
        } else if (form.username.includes(" ")) {
            newErrors.username = "Username cannot contain spaces";
        } else if (!usernameRegex.test(form.username)) {
            newErrors.username = "Username can contain letters, numbers, and symbols like @, _, -, .";
        } else if (form.username.length < 3) {
            newErrors.username = "Username must be at least 3 characters long";
        }

        if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
        if (form.password.length < 6) newErrors.password = "Password must be at least 6 characters";
        if (!agree) newErrors.agree = "You must agree to the terms";

        const existingUsers = JSON.parse(localStorage.getItem("usersList") || "[]");
        if (existingUsers.find(u => u.username === form.username)) newErrors.username = "Username already exists";
        if (existingUsers.find(u => u.mobile === form.mobile)) newErrors.mobile = "Mobile number already registered";

        if (role === "ward") {
            const wardAlreadyTaken = existingUsers.find(
                u => u.role === "ward" && u.wardNumber === form.wardNumber
            );
            if (wardAlreadyTaken) {
                newErrors.wardNumber = "A Ward Member is already registered for this ward!";
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // വാർഡ് പേര് കൃത്യമായി മാച്ച് ആവാൻ wardName അല്ലെങ്കിൽ wardNumber സേവ് ചെയ്യുന്നു
        const newUser = { 
            ...form, 
            role,
            wardNumber: form.wardName || form.wardNumber // വാർഡിന്റെ പേര് (Central Ward) അല്ലെങ്കിൽ കീ (ward-5) സേവ് ചെയ്യുന്നു
        };
        
        existingUsers.push(newUser);
        localStorage.setItem("usersList", JSON.stringify(existingUsers));

        setShowSuccessModal(true);
    };

    const update = (field) => (e) =>
        setForm((f) => ({ ...f, [field]: e.target.value }));

    return (
        <div className="signup-page">
            <div className="signup-card">
                {/* Role toggle */}
                <div className="role-toggle-wrap">
                    <div className="role-box">
                        <div className="role-toggle">
                            <button
                                type="button"
                                onClick={() => handleRoleChange("citizen")}
                                className={`role-btn ${role === "citizen" ? "active" : ""}`}
                            >
                                <User size={16} />
                                Citizen
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRoleChange("ward")}
                                className={`role-btn ${role === "ward" ? "active" : ""}`}
                            >
                                <Users size={16} />
                                Ward Member
                            </button>
                        </div>
                    </div>
                    {role === "citizen" && <div className="role-underline" />}
                </div>

                <div className="signup-grid">
                    {/* Left panel */}
                    <div className="signup-left">
                        <div className="left-content-wrapper">
                            <div className="brand-row">
                                <br />
                                <div className="brand-name">
                                    ENTE
                                    <br />
                                    GRAMAM
                                </div>
                                <div className="logo">
                                    <img src="/logo.png" alt="Background" />
                                </div>
                            </div>
                            <p className="brand-tagline">
                                Digital Rural Governance &amp; Community Support
                            </p>

                            <h2 className="join-title">
                                {role === "citizen"
                                    ? "Join Ente Gramam"
                                    : "Join as Ward Member"}
                            </h2>
                            <div className="join-underline" />
                            <p className="join-desc">
                                Create your account and be a part of your village's digital
                                journey.
                            </p>
                        </div>

                        <div className="village-illustration">
                            <img src="/cartoon-4.png" alt="Village Background" />
                        </div>
                    </div>

                    {/* Right panel: form */}
                    <div className="signup-right">
                        <h1 className="form-title">
                            {role === "citizen" ? "Citizen Sign Up" : "Ward Member Sign Up"}
                        </h1>

                        <SectionHeader
                            icon={<UserPlus size={16} className="brand-icon-color" />}
                            label="Personal Information"
                        />
                        <div className="field-grid">
                            <div className="field-container">
                                <Field
                                    label="Full Name"
                                    icon={<User size={16} />}
                                    placeholder="Enter your full name"
                                    value={form.fullName}
                                    onChange={update("fullName")}
                                    required
                                />
                                {errors.fullName && <span className="error-msg">{errors.fullName}</span>}
                            </div>
                            <div className="field-container">
                                <Field
                                    label="Mobile Number"
                                    icon={<Phone size={16} />}
                                    value={form.mobile}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "");
                                        if (value.length <= 10) {
                                            setForm({ ...form, mobile: value });
                                        }
                                    }}
                                    placeholder="Enter mobile number"
                                    maxLength={10}
                                    required
                                />
                                {errors.mobile && <span className="error-msg">{errors.mobile}</span>}
                            </div>
                            <div className="field-container">
                                <Field
                                    label="Username"
                                    icon={<User size={16} />}
                                    placeholder="Choose a username"
                                    value={form.username}
                                    onChange={update("username")}
                                    required
                                />
                                {errors.username && <span className="error-msg">{errors.username}</span>}
                            </div>
                            <div className="field-container">
                                <Field
                                    label="Password"
                                    icon={<Lock size={16} />}
                                    placeholder="Create a password"
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={update("password")}
                                    trailing={
                                        <button
                                            type="button"
                                            className="toggle-eye"
                                            onClick={() => setShowPassword((s) => !s)}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    }
                                    required
                                />
                                {errors.password && <span className="error-msg">{errors.password}</span>}
                            </div>
                            <div className="field-container">
                                <Field
                                    label="Confirm Password"
                                    icon={<Lock size={16} />}
                                    placeholder="Confirm your password"
                                    type={showConfirm ? "text" : "password"}
                                    value={form.confirmPassword}
                                    onChange={update("confirmPassword")}
                                    trailing={
                                        <button
                                            type="button"
                                            className="toggle-eye"
                                            onClick={() => setShowConfirm((s) => !s)}
                                        >
                                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    }
                                    required
                                />
                                {errors.confirmPassword && <span className="error-msg">{errors.confirmPassword}</span>}
                            </div>
                        </div>

                        <SectionHeader
                            icon={<MapPin size={16} className="brand-icon-color" />}
                            label="Address Information"
                        />

                        {role === "citizen" ? (
                            <>
                                <Field
                                    label="House Number"
                                    icon={<Home size={16} />}
                                    placeholder="Enter house number"
                                    value={form.houseNumber}
                                    onChange={update("houseNumber")}
                                    required
                                />

                                <Field
                                    label="House Name (Optional)"
                                    icon={<Home size={16} />}
                                    placeholder="Enter house name"
                                    value={form.houseName}
                                    onChange={update("houseName")}
                                    required
                                />
                                <div className="field-container">
                                    <div className="field">
                                        <label>Ward Number</label>
                                        <div className="input-wrap">
                                            <span className="icon"><MapPin size={16} /></span>
                                            <select value={form.wardNumber} onChange={handleWardChange} required>
                                                <option value="" disabled hidden>
                                                    Select ward number
                                                </option>
                                                {Object.keys(wardData).map((key) => (
                                                    <option key={key} value={key}>
                                                        {key.toUpperCase()} - {wardData[key]}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    {errors.wardNumber && <span className="error-msg">{errors.wardNumber}</span>}
                                </div>

                                <div className="span-2">
                                    <Field
                                        label="Ward Name"
                                        icon={<MapPin size={16} />}
                                        value={form.wardName}
                                        readOnly
                                        placeholder="Ward name will appear automatically"
                                        required
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="field-container">
                                    <div className="field">
                                        <label>Ward Number</label>
                                        <div className="input-wrap">
                                            <span className="icon"><MapPin size={16} /></span>
                                            <select value={form.wardNumber} onChange={handleWardChange} required>
                                                <option value="" disabled hidden>
                                                    Select Ward Number
                                                </option>
                                                {Object.keys(wardData).map((key) => (
                                                    <option key={key} value={key}>
                                                        {key.toUpperCase()} - {wardData[key]}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    {errors.wardNumber && <span className="error-msg">{errors.wardNumber}</span>}
                                </div>
                                <Field
                                    label="Ward Name"
                                    icon={<MapPin size={16} />}
                                    value={form.wardName}
                                    readOnly
                                    placeholder="Ward Name"
                                    required
                                />
                            </>
                        )}

                        <SectionHeader
                            icon={<UserPlus size={16} className="brand-icon-color" />}
                            label="Additional Information"
                        />
                        <div className="field-grid">
                            <SelectField
                                label="Gender"
                                icon={<User size={16} />}
                                value={form.gender}
                                onChange={update("gender")}
                                placeholder="Select gender"
                                options={["Male", "Female", "Other"]}
                                required
                            />
                            <Field
                                label="Date of Birth"
                                icon={<Calendar size={16} />}
                                placeholder="Select date of birth"
                                type="date"
                                value={form.dob}
                                onChange={update("dob")}
                                required
                            />
                            <SelectField
                                label="Blood Group (Optional)"
                                icon={<Droplet size={16} />}
                                value={form.bloodGroup}
                                onChange={update("bloodGroup")}
                                placeholder="Select blood group"
                                options={["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]}
                                required
                            />
                        </div>

                        <hr className="divider" />

                        <label className="terms-row">
                            <input
                                type="checkbox"
                                checked={agree}
                                onChange={(e) => setAgree(e.target.checked)}
                            />
                            {showModal && (
                                <div className="modal-overlay">
                                    <div className="modal-card">
                                        <h2>Terms & Conditions</h2>
                                        <p>Welcome to Ente Gramam. <br /><br />
                                            By creating an account, you agree to: <br />
                                            *Provide accurate and genuine information. <br />
                                            *Use only one account per person. <br />
                                            *Keep your username and password confidential. <br />
                                            *Use the platform only for official Panchayat services. <br />
                                            *Do not submit false information or misuse the system. <br />
                                            *Your personal information will be protected and used only for service-related purposes. <br />
                                            *The Panchayat reserves the right to suspend accounts that violate these terms. <br /><br />
                                            By clicking "I Agree", you accept these Terms & Conditions.</p>
                                        <button onClick={() => setShowModal(false)}>Close</button>
                                    </div>
                                </div>
                            )}
                            <span className="link" onClick={() => setShowModal(true)}>I have read and agree to the Terms & Conditions and Privacy Policy.</span>
                        </label>

                        <button
                            className="submit-btn"
                            onClick={handleSubmit}
                            disabled={!agree}
                        >
                            <UserPlus size={18} />
                            Create Account
                        </button>

                        <p className="login-hint" style={{ marginTop: '15px', fontSize: '0.8rem', textAlign: 'center' }}>
                            Already have an account? {' '}
                            <a href="/" style={{ color: '#2c8a49', fontWeight: '700', textDecoration: 'none' }}>
                                Login
                            </a>
                        </p>
                    </div>
                </div>
            </div>
            {showSuccessModal && (
                <div className="success-modal-overlay">
                    <div className="success-modal-card">
                        <div className="success-icon-box">✓</div>
                        <h2>Success!</h2>
                        <p>Account created successfully!</p>
                        <button
                            type="button"
                            className="success-ok-btn"
                            onClick={() => {
                                setShowSuccessModal(false);
                                navigate("/", { replace: true });
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function SectionHeader({ icon, label }) {
    return (
        <div className="section-header">
            {icon}
            <span>{label}</span>
            <div className="rule" />
        </div>
    );
}

function Field({ label, icon, trailing, ...props }) {
    return (
        <div className="field">
            <label>{label}</label>
            <div className="input-wrap">
                <span className="icon">{icon}</span>
                <input {...props} />
                {trailing}
            </div>
        </div>
    );
}

function SelectField({ label, icon, options, placeholder, value, onChange }) {
    return (
        <div className="field">
            <label>{label}</label>
            <div className="input-wrap">
                <span className="icon">{icon}</span>
                <select value={value} onChange={onChange} required>
                    <option value="" disabled hidden>
                        {placeholder}
                    </option>
                    {options.map((o) => (
                        <option key={o} value={o}>
                            {o}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}