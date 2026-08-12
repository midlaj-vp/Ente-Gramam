import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';

function Layout({ children }) {
  // 1. ഡിഫോൾട്ട് ആയി false ആക്കുന്നു. localStorage-ൽ വായിക്കാത്ത മെസ്സേജ് ഉണ്ടെങ്കിൽ മാത്രം true ആകുന്നു.
  const [hasNotification, setHasNotification] = useState(() => {
    return localStorage.getItem('hasUnreadNotifications') === 'true';
  });

  // യൂസർ നെയിം localStorage-ൽ നിന്ന് ഡൈനാമിക് ആയി എടുക്കുന്നു
  const [username, setUsername] = useState('Muhammed Midlaj');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.name) setUsername(parsedUser.name);
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }

    // പുതിയ മെസ്സേജ്/നോട്ടിഫിക്കേഷൻ വരുമ്പോൾ Red dot കാണിക്കാനുള്ള Event Listener
    const handleNewNotification = () => {
      setHasNotification(true);
      localStorage.setItem('hasUnreadNotifications', 'true');
    };

    window.addEventListener('new-notification', handleNewNotification);
    return () => {
      window.removeEventListener('new-notification', handleNewNotification);
    };
  }, []);

  // ബെല്ലിൽ ക്ലിക്ക് ചെയ്യുമ്പോൾ റെഡ് ഡോട്ട് ഉടൻ തന്നെ മാറ്റുന്നു
  const handleNotificationRead = () => {
    setHasNotification(false);
    localStorage.setItem('hasUnreadNotifications', 'false');
  };

  return (
    <div className="layout-container">
      <Navbar 
        username={username} 
        hasNewNotification={hasNotification} 
        onNotificationClick={handleNotificationRead} 
      />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}

export default Layout;