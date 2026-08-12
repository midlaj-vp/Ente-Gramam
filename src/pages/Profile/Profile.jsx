import React, { useState, useEffect } from 'react';
import './Profile.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// നിങ്ങൾ നൽകിയ വാർഡുകളുടെ ലിസ്റ്റ്
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
  
  // യൂസർ ഫീൽഡുകൾ
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
    // localStorage-ൽ നിന്ന് യൂസർ ഡാറ്റ ലോഡ് ചെയ്യുന്നു
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserRole(parsedUser.role || 'citizen');

        let matchedWardNumber = parsedUser.wardNumber || '';

        // യൂസറുടെ ഡാറ്റയിൽ wardNumber ഇല്ലെങ്കിൽ, wardName വെച്ച് wardNumber കണ്ടുപിടിക്കുന്നു
        if (!matchedWardNumber && parsedUser.wardName) {
          const found = WARD_LIST.find(w => w.name.toLowerCase() === parsedUser.wardName.toLowerCase());
          if (found) {
            matchedWardNumber = found.number;
          }
        }

        setFormData(prev => ({
          ...prev,
          ...parsedUser,
          wardNumber: matchedWardNumber
        }));
      } catch (error) {
        console.error("Error parsing user data", error);
      }
    }
  }, []);

  // ഇൻപുട്ട് മാറ്റങ്ങൾ ഹാൻഡിൽ ചെയ്യാൻ
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // വാർഡ് നമ്പർ സെലക്ട് ചെയ്യുമ്പോൾ വാർഡ് നെയിം ഓട്ടോമാറ്റിക് ആയി സെറ്റ് ചെയ്യാൻ
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

  // പ്രൊഫൈൽ ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യാൻ (Base64 ആയി സേവ് ചെയ്യുന്നു)
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

  // വിവരങ്ങൾ സേവ് ചെയ്യാൻ
  const handleSave = (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    // 1. നിലവിലുള്ള യൂസർ ഒബ്ജക്റ്റ് അപ്ഡേറ്റ് ചെയ്യുന്നു
    const updatedUser = { 
      ...formData, 
      role: userRole 
    };

    // 2. കറന്റ് യൂസറുടെ ഡാറ്റ ലോക്കൽ സ്റ്റോറേജിൽ സേവ് ചെയ്യുന്നു
    localStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem('currentUserWard', updatedUser.wardNumber);
    
    // 3. 'registeredUsers' അറേയിലുള്ള ഡാറ്റയും അപ്ഡേറ്റ് ചെയ്യുന്നു
    const storedUsersList = localStorage.getItem('registeredUsers');
    if (storedUsersList) {
      try {
        let usersArray = JSON.parse(storedUsersList);
        usersArray = usersArray.map(u => 
          (u.username === updatedUser.username || u.mobile === updatedUser.mobile) ? updatedUser : u
        );
        localStorage.setItem('registeredUsers', JSON.stringify(usersArray));
      } catch (err) {
        console.error("Error updating users list", err);
      }
    }
    
    setIsEditing(false);
    alert("Profile updated successfully!");
  };

  return (
    <div className="profile-container">
      <div className="profile-header-card">
        <h2>My Profile</h2>
        <span className="role-badge">{userRole.toUpperCase()}</span>
      </div>

      <form onSubmit={handleSave} className="profile-form-grid">
        {/* പ്രൊഫൈൽ ഫോട്ടോ സെക്ഷൻ */}
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

        {/* ഡീറ്റെയിൽസ് ഫീൽഡുകൾ */}
        <div className="profile-fields-grid">
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              name="fullName" 
              value={formData.fullName} 
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
              value={formData.username} 
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
              value={formData.mobile} 
              onChange={handleChange} 
              disabled={!isEditing} 
            />
          </div>

          <div className="form-group">
            <label>Blood Group</label>
            <select 
              name="bloodGroup" 
              value={formData.bloodGroup} 
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
              value={formData.gender} 
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
              value={formData.dob} 
              onChange={handleChange} 
              disabled={!isEditing} 
            />
          </div>

          <div className="form-group">
            <label>House Number</label>
            <input 
              type="text" 
              name="houseNumber" 
              value={formData.houseNumber} 
              onChange={handleChange} 
              disabled={!isEditing} 
            />
          </div>

          <div className="form-group">
            <label>House Name</label>
            <input 
              type="text" 
              name="houseName" 
              value={formData.houseName} 
              onChange={handleChange} 
              disabled={!isEditing} 
            />
          </div>

          {/* വാർഡ് നമ്പർ സെലക്ട് ചെയ്യാനുള്ള ഡ്രോപ്ഡൗൺ */}
          <div className="form-group">
            <label>Ward Number</label>
            <select 
              name="wardNumber" 
              value={formData.wardNumber} 
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

          {/* വാർഡ് നെയിം കാണിക്കുന്ന ഫീൽഡ് */}
          <div className="form-group">
            <label>Ward Name</label>
            <input 
              type="text" 
              name="wardName" 
              value={formData.wardName} 
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

        {/* എഡിറ്റ് / സേവ് ബട്ടണുകൾ */}
        <div className="profile-actions">
          {!isEditing ? (
            <button type="button" className="edit-btn" onClick={() => setIsEditing(true)}>
              <i className="bi bi-pencil-square"></i> Edit Profile
            </button>
          ) : (
            <div className="edit-btn-group">
              <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="save-btn">
                Save Changes
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default Profile;