import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Listen for the custom event dispatched by Navbar
  useEffect(() => {
    const handleOpen = () => setSidebarOpen(true);
    window.addEventListener('open-sidebar', handleOpen);
    return () => window.removeEventListener('open-sidebar', handleOpen);
  }, []);

  // 1. localStorage-ൽ നിന്ന് യൂസർ ഡാറ്റയും അവരുടെ റോൾ, വാർഡ് വിവരങ്ങളും എടുക്കുന്നു
  const storedUser = localStorage.getItem('user');
  let userRole = "citizen"; // ഡിഫോൾട്ട് റോൾ
  let userWard = "";        // ഡൈനാമിക് വാർഡ് നെയിം / നമ്പർ

  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser);
      userRole = parsedUser.role || "citizen";
      
      // localStorage-ലെ ഫീൽഡിന് അനുസരിച്ച് Ward വിവരങ്ങൾ എക്സ്ട്രാക്റ്റ് ചെയ്യുന്നു
      if (parsedUser.wardName) {
        userWard = parsedUser.wardNo 
          ? `Ward ${parsedUser.wardNo} - ${parsedUser.wardName}` 
          : parsedUser.wardName;
      } else if (parsedUser.ward) {
        userWard = parsedUser.ward;
      } else if (parsedUser.wardNo) {
        userWard = `Ward ${parsedUser.wardNo}`;
      } else {
        userWard = "Ward Member";
      }
    } catch (error) {
      console.error("Error parsing user data", error);
    }
  }

  // 2. ഓരോ റോളിനും ആവശ്യമായ മെനു ലിസ്റ്റുകൾ
  const citizenMenu = [
    { name: 'Dashboard', path: '/Dashboard', icon: 'bi-grid' },
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
    { name: 'Members Authentication', path: '/members-Authentication', icon: 'bi-person' },
    { name: 'Settings', path: '/settings', icon: 'bi-gear' },
  ];

  // 3. റോളിന് അനുസരിച്ചുള്ള മെനു സെലക്ട് ചെയ്യുന്നു
  let currentMenu = citizenMenu;
  if (userRole === 'ward') {
    currentMenu = wardMenu;
  } else if (userRole === 'panchayat') {
    currentMenu = panchayatMenu;
  }

  // ലോഗൗട്ട് ഫങ്ഷൻ
  const handleLogout = () => {
    localStorage.removeItem('user');
    setSidebarOpen(false);
    navigate('/');
  };

  return (
    <>
      {/* Mobile Dark Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        {/* ബ്രാൻഡ് / ഹെഡിങ് */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-text">
            <h2>Ente Gramam</h2>
            <span className="sidebar-subtitle">
              {userRole === 'ward' 
                ? (userWard || 'Ward Member') 
                : userRole === 'panchayat' 
                ? 'Panchayat Office' 
                : 'Digital Rural Governance'}
            </span>
          </div>
          
          {/* Close Button Inside Sidebar */}
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* ഡൈനാമിക് മെനു ലിസ്റ്റുകൾ */}
        <ul className="sidebar-menu">
          {currentMenu.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <li
                key={index}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false); // Ensure sidebar closes on navigation
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

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;