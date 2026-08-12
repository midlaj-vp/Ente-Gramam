import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const Navbar = ({ username, profileImage, hasNewNotification, onNotificationClick }) => {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleBellClick = () => {
    // 1. ക്ലിക്ക് ചെയ്യുമ്പോൾ തന്നെ state മാറ്റാനുള്ള ഫങ്ഷൻ കോൾ ചെയ്യുന്നു
    if (onNotificationClick) {
      onNotificationClick();
    }
    // 2. തുടർന്ന് Notifications പേജിലേക്ക് നാവിഗേറ്റ് ചെയ്യുന്നു
    navigate('/Notifications');
  };

  return (
    <div className="navbar">
      <div className="navbar-left">
        {/* Hamburger Menu Button */}
        <button
          type="button"
          className="menu-toggle"
          onClick={() => window.dispatchEvent(new CustomEvent('open-sidebar'))}
          aria-label="Open sidebar"
        >
          ☰
        </button>
        
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search..." 
            className="search-input" 
          />
        </div>
      </div>
      <div className="navbar-right">
        <div className="notification-container" onClick={handleBellClick} style={{ cursor: 'pointer' }}>
          <span className="notification-icon">🔔</span>
          {/* പുതിയ മെസ്സേജ് ഉണ്ടെങ്കിൽ മാത്രം Red Dot കാണിക്കും */}
          {hasNewNotification && <span className="notification-badge"></span>}
        </div>

        <div className="user-profile" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
          {profileImage ? (
            <img src={profileImage} alt="Profile" className="profile-img" />
          ) : (
            <div className="profile-icon-wrapper">
              <i className="bi bi-person"></i>
            </div>
          )}
          <span>{username || "Guest"}</span>
        </div>
      </div>
    </div>
  );
};

export default Navbar;