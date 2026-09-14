import React, { useState, useEffect } from 'react';
import './Profile.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import api from "../../axiosInstance"; // 👈 1. നമ്മൾ ഉണ്ടാക്കിയ Axios Instance ഇമ്പോർട്ട് ചെയ്യുന്നു

const WARD_LIST = [
  { number: "ward-1", name: "North Ward" },
  { number: "ward-2", name: "South Ward" },
  { number: "ward-3", name: "East Ward" },
  { number: "ward-4", name: "West Ward" },
  { number: "ward-5", name: "Central Ward" },
  { number: "ward-6", name: "Hill View" },
  { number: "ward-7", name: "River Side" },
  { number: "ward-8", name: "Market Ward" },
];

const Profile = () => {
  const [userRole, setUserRole] = useState('citizen');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    username: '',
    password: '',
    confirmPassword: '',
    houseNumber: '',
    houseName: '',
    wardNumber: '',
    wardName: '',
    gender: '',
    dob: '',
    bloodGroup: '',
    profileImage: ''
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user') || localStorage.getItem('loggedInUser');

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const username = typeof parsedUser === 'object'
          ? (parsedUser.username || parsedUser.name || parsedUser.fullName)
          : parsedUser;

        if (username) {
          setIsLoading(true);

          // 👈 2. fetch മാറ്റി api.get ആക്കി
          api.get(`profile/${username}/`)
            .then((res) => {
              const data = res.data;
              if (data.success && data.user) {
                const apiUser = data.user;
                setUserRole(apiUser.role || 'citizen');

                const fullName = apiUser.fullName || apiUser.full_name || '';
                const mobile = apiUser.mobile || '';
                const houseNumber = apiUser.houseNumber || apiUser.house_number || '';
                const houseName = apiUser.houseName || apiUser.house_name || '';
                const wardName = apiUser.wardName || apiUser.ward_name || '';
                let matchedWardNumber = apiUser.wardNumber || apiUser.ward_number || '';
                const gender = apiUser.gender || '';
                const dob = apiUser.dob || '';
                const bloodGroup = apiUser.bloodGroup || apiUser.blood_group || '';
                let profileImage = apiUser.profile_image || apiUser.profileImage || '';

                if (typeof profileImage === 'string' && (profileImage.startsWith('data:image') || profileImage.length > 500)) {
                  profileImage = '';
                }

                if (!matchedWardNumber && wardName) {
                  const found = WARD_LIST.find(w => w.name.toLowerCase() === wardName.toLowerCase());
                  if (found) matchedWardNumber = found.number;
                }

                setFormData(prev => ({
                  ...prev,
                  fullName,
                  username: apiUser.username || username,
                  mobile,
                  houseNumber,
                  houseName,
                  wardNumber: matchedWardNumber,
                  wardName,
                  gender,
                  dob,
                  bloodGroup,
                  profileImage,
                  password: '',
                  confirmPassword: ''
                }));
              } else {
                console.warn("Backend response succeeded but success flag is false:", data);
              }
            })
            .catch((err) => {
              console.error("🔴 Backend Fetch Error:", err);
              if (typeof parsedUser === 'object' && (parsedUser.fullName || parsedUser.username)) {
                loadFromLocalStorage(parsedUser);
              }
            })
            .finally(() => setIsLoading(false));
        }
      } catch (error) {
        console.error("Error parsing user data", error);
      }
    }
  }, []);

  const loadFromLocalStorage = (parsedUser) => {
    setUserRole(parsedUser.role || 'citizen');
    let matchedWardNumber = parsedUser.wardNumber || parsedUser.ward_number || '';
    if (!matchedWardNumber && (parsedUser.wardName || parsedUser.ward_name)) {
      const wardN = parsedUser.wardName || parsedUser.ward_name;
      const found = WARD_LIST.find(w => w.name.toLowerCase() === wardN.toLowerCase());
      if (found) matchedWardNumber = found.number;
    }

    let img = parsedUser.profile_image || parsedUser.profileImage || '';
    if (typeof img === 'string' && (img.startsWith('data:image') || img.length > 500)) {
      img = ''; 
    }

    setFormData(prev => ({
      ...prev,
      fullName: parsedUser.fullName || parsedUser.full_name || prev.fullName,
      username: parsedUser.username || prev.username,
      mobile: parsedUser.mobile || prev.mobile,
      houseNumber: parsedUser.houseNumber || parsedUser.house_number || prev.houseNumber,
      houseName: parsedUser.houseName || parsedUser.house_name || prev.houseName,
      wardNumber: matchedWardNumber || prev.wardNumber,
      wardName: parsedUser.wardName || parsedUser.ward_name || prev.wardName,
      gender: parsedUser.gender || prev.gender,
      dob: parsedUser.dob || prev.dob,
      bloodGroup: parsedUser.bloodGroup || parsedUser.blood_group || prev.bloodGroup,
      profileImage: img,
      password: '',
      confirmPassword: ''
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'wardNumber') {
      const selectedWard = WARD_LIST.find(w => w.number === value);
      setFormData(prev => ({
        ...prev,
        wardNumber: value,
        wardName: selectedWard ? selectedWard.name : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          profileImage: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 💾 Fully Sanitized Save Handler
  const handleSave = async (e) => {
    e.preventDefault();

    if (formData.password && formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    setIsLoading(true);

    const payload = {
      ...formData,
      role: userRole,
      profileImage: formData.profileImage, 
      profile_image: formData.profileImage
    };

    try {
      // 👈 3. fetch മാറ്റി api.put ആക്കി
      const response = await api.put("profile/update/", payload);
      const data = response.data;

      if (data.success) {
        let finalImage = data.profileImage || "";
        if (typeof finalImage === "string" && (finalImage.startsWith("data:image") || finalImage.length > 500)) {
          finalImage = "";
        }

        const cleanUserData = {
          id: formData.id,
          username: formData.username,
          fullName: formData.fullName,
          full_name: formData.fullName,
          mobile: formData.mobile,
          role: userRole,
          houseNumber: formData.houseNumber,
          houseName: formData.houseName,
          wardNumber: formData.wardNumber,
          wardName: formData.wardName,
          gender: formData.gender,
          dob: formData.dob,
          bloodGroup: formData.bloodGroup,
          profileImage: finalImage,
          profile_image: finalImage
        };

        try {
          localStorage.setItem('user', JSON.stringify(cleanUserData));
          localStorage.setItem('loggedInUser', JSON.stringify(cleanUserData));
          localStorage.setItem('currentUserWard', cleanUserData.wardNumber);
        } catch (stErr) {
          console.warn("LocalStorage set warning:", stErr);
        }

        setFormData(prev => ({ ...prev, profileImage: finalImage, password: '', confirmPassword: '' }));
        window.dispatchEvent(new Event('user-profile-updated'));
        setIsEditing(false);
        alert("Profile updated successfully!");
      } else {
        alert("Failed to update profile: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Backend connection error during save:", err);

      let safeImage = formData.profileImage || "";
      if (typeof safeImage === "string" && (safeImage.startsWith("data:image") || safeImage.length > 500)) {
        safeImage = "";
      }

      const cleanUserData = {
        username: formData.username,
        fullName: formData.fullName,
        full_name: formData.fullName,
        mobile: formData.mobile,
        role: userRole,
        houseNumber: formData.houseNumber,
        houseName: formData.houseName,
        wardNumber: formData.wardNumber,
        wardName: formData.wardName,
        gender: formData.gender,
        dob: formData.dob,
        bloodGroup: formData.bloodGroup,
        profileImage: safeImage,
        profile_image: safeImage
      };

      try {
        localStorage.setItem('user', JSON.stringify(cleanUserData));
        localStorage.setItem('loggedInUser', JSON.stringify(cleanUserData));
      } catch (e) {
        console.error("Quota exceeded fallback:", e);
      }

      window.dispatchEvent(new Event('user-profile-updated'));
      setIsEditing(false);
      alert("Profile saved locally!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header-card">
        <h2>My Profile</h2>
        <span className="role-badge">{userRole.toUpperCase()}</span>
      </div>

      <form onSubmit={handleSave} className="profile-form-grid">
        <div className="profile-img-section">
          <div className="profile-avatar-wrapper">
            {formData.profileImage ? (
              <img src={formData.profileImage} alt="Profile" className="profile-preview-img" />
            ) : (
              <div className="profile-default-icon">
                <i className="bi bi-person-fill"></i>
              </div>
            )}
          </div>

          {isEditing && (
            <div className="upload-btn-wrapper">
              <label htmlFor="file-upload" className="custom-file-upload">
                <i className="bi bi-camera"></i> Change Photo
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>

        <div className="profile-fields-grid">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName || ''}
              onChange={handleChange}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username || ''}
              onChange={handleChange}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="form-group">
            <label>Mobile Number</label>
            <input
              type="text"
              name="mobile"
              value={formData.mobile || ''}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>Blood Group</label>
            <select
              name="bloodGroup"
              value={formData.bloodGroup || ''}
              onChange={handleChange}
              disabled={!isEditing}
            >
              <option value="">Select Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>

          <div className="form-group">
            <label>Gender</label>
            <select
              name="gender"
              value={formData.gender || ''}
              onChange={handleChange}
              disabled={!isEditing}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={formData.dob || ''}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>House Number</label>
            <input
              type="text"
              name="houseNumber"
              value={formData.houseNumber || ''}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>House Name</label>
            <input
              type="text"
              name="houseName"
              value={formData.houseName || ''}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label>Ward Number</label>
            <select
              name="wardNumber"
              value={formData.wardNumber || ''}
              onChange={handleChange}
              disabled={!isEditing}
            >
              <option value="">Select Ward</option>
              {WARD_LIST.map((ward, index) => (
                <option key={index} value={ward.number}>
                  {ward.number.toUpperCase()} ({ward.name})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Ward Name</label>
            <input
              type="text"
              name="wardName"
              value={formData.wardName || ''}
              disabled={true}
            />
          </div>

          {isEditing && (
            <>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter new password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </>
          )}
        </div>

        <div className="profile-actions">
          {!isEditing ? (
            <button type="button" className="edit-btn" onClick={() => setIsEditing(true)}>
              <i className="bi bi-pencil-square"></i> Edit Profile
            </button>
          ) : (
            <div className="edit-btn-group">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setIsEditing(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button type="submit" className="save-btn" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default Profile;