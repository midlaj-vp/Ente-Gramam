import React, { useState, useEffect } from 'react';
import api from "../../axiosInstance";
import Navbar from './Navbar';

function Layout({ children }) {
  // 🟢 ഡീഫോൾട്ടായി false ആയിരിക്കും (പുതിയ നോട്ടിഫിക്കേഷൻ ഉണ്ടെങ്കിൽ മാത്രം true ആകും)
  const [hasNotification, setHasNotification] = useState(() => {
    return localStorage.getItem('hasUnreadNotifications') === 'true';
  });

  const [userData, setUserData] = useState({
    username: '',
    profileImage: ''
  });

  const fetchUserProfile = async () => {
    const storedUser = localStorage.getItem('user') || localStorage.getItem('loggedInUser');
    if (!storedUser) return;

    try {
      const parsedUser = JSON.parse(storedUser);
      const u = parsedUser.user || parsedUser.data || parsedUser;
      
      const username = typeof u === 'string' ? u : (u.username || u.fullName || u.full_name || u.name);
      const localImg = u.profile_image || u.profileImage || u.avatar || u.image || '';

      setUserData({
        username: u.fullName || u.full_name || u.username || username || 'User',
        profileImage: localImg
      });

      if (!username) return;

      const response = await api.get(`profile/${username}/`);
      const data = response.data;
      const apiUser = data.user || data;
      
      const liveImg = apiUser.profile_image || apiUser.profileImage || apiUser.avatar || localImg;
      const liveName = apiUser.fullName || apiUser.full_name || apiUser.username || username;

      const updatedStorage = { ...u, ...apiUser, profile_image: liveImg, profileImage: liveImg };
      localStorage.setItem('user', JSON.stringify(updatedStorage));

      setUserData({
        username: liveName,
        profileImage: liveImg
      });

      window.dispatchEvent(new Event('user-profile-updated'));
    } catch (error) {
      console.error("Layout Fetch Error:", error);
    }
  };

  useEffect(() => {
    fetchUserProfile();

    // 🟢 പുതിയ നോട്ടിഫിക്കേഷൻ വരുമ്പോൾ മാത്രം Red Dot കാണിക്കാൻ
    const handleNewNotification = () => {
      setHasNotification(true);
      localStorage.setItem('hasUnreadNotifications', 'true');
    };

    // 🟢 നോട്ടിഫിക്കേഷൻ വായിച്ചുകഴിയുമ്പോൾ Red Dot കളയാൻ
    const handleNotificationsRead = () => {
      setHasNotification(false);
      localStorage.setItem('hasUnreadNotifications', 'false');
    };

    window.addEventListener('storage', fetchUserProfile);
    window.addEventListener('user-profile-updated', fetchUserProfile);
    window.addEventListener('new-notification', handleNewNotification);
    window.addEventListener('notifications-read', handleNotificationsRead);

    return () => {
      window.removeEventListener('storage', fetchUserProfile);
      window.removeEventListener('user-profile-updated', fetchUserProfile);
      window.removeEventListener('new-notification', handleNewNotification);
      window.removeEventListener('notifications-read', handleNotificationsRead);
    };
  }, []);

  const handleNotificationRead = () => {
    setHasNotification(false);
    localStorage.setItem('hasUnreadNotifications', 'false');
  };

  return (
    <div className="layout-container">
      <Navbar 
        username={userData.username} 
        profileImage={userData.profileImage}
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