import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from "../../axiosInstance";
import './Sidebar.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState('citizen');
  const [userWard, setUserWard] = useState('');

  useEffect(() => {
    const handleOpen = () => setSidebarOpen(true);
    window.addEventListener('open-sidebar', handleOpen);

    const loadUserData = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUserRole(parsedUser.role || 'citizen');

          if (parsedUser.wardName) {
            setUserWard(
              parsedUser.wardNo
                ? `Ward ${parsedUser.wardNo} - ${parsedUser.wardName}`
                : parsedUser.wardName
            );
          } else if (parsedUser.ward) {
            setUserWard(parsedUser.ward);
          } else if (parsedUser.wardNo) {
            setUserWard(`Ward ${parsedUser.wardNo}`);
          } else {
            setUserWard('Ward Member');
          }
        } catch (error) {
          console.error('Error parsing user data', error);
        }
      } else {
        setUserRole('citizen');
        setUserWard('');
      }
    };

    loadUserData();

    return () => window.removeEventListener('open-sidebar', handleOpen);
  }, [location.pathname]);

  const citizenMenu = [
    { name: 'Dashboard', path: '/dashboard', icon: 'bi-grid' },
    { name: 'Notifications', path: '/notifications', icon: 'bi-bell' },
    { name: 'Complaints', path: '/complaints', icon: 'bi-file-earmark-text' },
    { name: 'Emergency SOS', path: '/emergency-sos', icon: 'bi-exclamation-triangle' },
    { name: 'Blood Donors', path: '/blood-donors', icon: 'bi-droplet' },
    { name: 'Welfare Schemes', path: '/welfare-schemes', icon: 'bi-heart-pulse' },
    { name: 'Projects', path: '/projects', icon: 'bi-kanban' },
    { name: 'Haritha Karma Sena', path: '/haritha-karma-sena', icon: 'bi-recycle' },
    { name: 'Feedback', path: '/feedback', icon: 'bi-chat-left-text' },
    { name: 'Profile', path: '/profile', icon: 'bi-person' },
    { name: 'Settings', path: '/settings', icon: 'bi-gear' },
  ];

  const wardMenu = [
    { name: 'Dashboard', path: '/ward-dashboard', icon: 'bi-grid' },
    { name: 'Citizen Complaints', path: '/ward-complaints', icon: 'bi-file-earmark-text' },
    { name: 'Send Notifications', path: '/send-notifications', icon: 'bi-bell' },
    { name: 'Emergency Services', path: '/emergency-services', icon: 'bi-exclamation-triangle' },
    { name: 'Blood Donor Directory', path: '/blood-donors', icon: 'bi-droplet' },
    { name: 'Welfare Schemes', path: '/welfare-schemes', icon: 'bi-heart-pulse' },
    { name: 'Development Projects', path: '/development-projects', icon: 'bi-kanban' },
    { name: 'Haritha Karma Sena', path: '/haritha-karma-sena', icon: 'bi-recycle' },
    { name: 'Citizen Feedback', path: '/feedback', icon: 'bi-chat-left-text' },
    { name: 'Ward Reports', path: '/ward-reports', icon: 'bi-file-earmark-bar-graph' },
    { name: 'Profile', path: '/profile', icon: 'bi-person' },
    { name: 'Settings', path: '/settings', icon: 'bi-gear' },
  ];

  const panchayatMenu = [
    { name: 'Dashboard', path: '/panchayat-dashboard', icon: 'bi-grid' },
    { name: 'Notifications', path: '/notifications', icon: 'bi-bell' },
    { name: 'Verify Complaints', path: '/verify-complaints', icon: 'bi-check-circle' },
    { name: 'Emergency SOS', path: '/emergency-sos', icon: 'bi-exclamation-triangle' },
    { name: 'Blood Donors', path: '/blood-donors', icon: 'bi-droplet' },
    { name: 'Welfare Schemes', path: '/welfare-schemes', icon: 'bi-heart-pulse' },
    { name: 'Projects', path: '/projects', icon: 'bi-kanban' },
    { name: 'Haritha Karma Sena', path: '/haritha-karma-sena', icon: 'bi-recycle' },
    { name: 'Feedback', path: '/feedback', icon: 'bi-chat-left-text' },
    { name: 'Ward Reports', path: '/ward-reports', icon: 'bi-file-earmark-bar-graph' },
    { name: 'Profile', path: '/profile', icon: 'bi-person' },
    { name: 'Members Authentication', path: '/members-authentication', icon: 'bi-person-check' },
    { name: 'Settings', path: '/settings', icon: 'bi-gear' },
  ];

  let currentMenu = citizenMenu;
  if (userRole === 'ward') {
    currentMenu = wardMenu;
  } else if (userRole === 'panchayat') {
    currentMenu = panchayatMenu;
  }

  // 🟢 Optimized Clean Logout using Axios Instance
  const handleLogout = async (e) => {
    if (e) e.preventDefault();

    const refreshToken = localStorage.getItem("refresh");

    try {
      await api.post("logout/", { refresh: refreshToken || "" });
    } catch (error) {
      console.error("Logout request error:", error);
    }

    // 🟢 സുരക്ഷിതമായ Clear & Redirect
    localStorage.clear();
    setUserRole("citizen");
    setUserWard("");
    setSidebarOpen(false);
    window.dispatchEvent(new Event('user-profile-updated'));
    navigate("/");
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-text">
            <h2>Ente Gramam</h2>
            <span className="sidebar-subtitle">
              {userRole === 'ward'
                ? userWard || 'Ward Member'
                : userRole === 'panchayat'
                  ? 'Panchayat Office'
                  : 'Digital Rural Governance'}
            </span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <ul className="sidebar-menu">
          {currentMenu.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <li
                key={index}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
              >
                <i className={`bi ${item.icon}`}></i>
                <span>{item.name}</span>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer">
          {userRole === 'ward' && (
            <button
              className="emergency-btn"
              onClick={() => {
                navigate('/emergency-alert');
                setSidebarOpen(false);
              }}
            >
              <i className="bi bi-exclamation-triangle-fill"></i> Emergency Alert
            </button>
          )}

          <button className="logout-btn" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;