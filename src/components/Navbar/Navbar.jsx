import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../../axiosInstance";
import './Navbar.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const Navbar = ({ username: propUsername, profileImage: propProfileImage, onNotificationClick }) => {
  const navigate = useNavigate();

  const [dateTime, setDateTime] = useState({
    dayMonthStr: '',
    yearStr: '',
    timeNumStr: '',
    timeAmPmStr: ''
  });

  const [weather, setWeather] = useState({
    temp: '--°C',
    condition: 'Loading...',
    icon: 'bi-cloud-sun'
  });

  const [currentProfileImage, setCurrentProfileImage] = useState(propProfileImage || '');
  const [currentUsername, setCurrentUsername] = useState(propUsername || '');

  // 🔴 നോട്ടിഫിക്കേഷൻ ബാഡ്ജ് സ്റ്റേറ്റ്
  const [unreadBadge, setUnreadBadge] = useState(false);

  // 🔔 നോട്ടിഫിക്കേഷൻ ചെക്ക് ചെയ്യുന്ന ഫങ്ഷൻ
  const fetchUnreadNotifications = async () => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) {
        setUnreadBadge(false);
        return;
      }

      const parsed = JSON.parse(stored);
      const u = parsed.user || parsed.data || parsed;
      const uname = typeof u === 'string' ? u : (u.username || u.fullName || u.name);

      if (!uname) {
        setUnreadBadge(false);
        return;
      }

      const res = await api.get(`notifications/?username=${uname}`);
      const data = res.data;
      const list = Array.isArray(data) ? data : (data.results || data.notifications || []);
      
      const hasUnread = list.some(item => item.is_read === false || item.read === false);

      if (hasUnread) {
        setUnreadBadge(true);
        localStorage.setItem('hasUnreadNotifications', 'true');
      } else {
        setUnreadBadge(false);
        localStorage.setItem('hasUnreadNotifications', 'false');
      }
    } catch (e) {
      const isLocalUnread = localStorage.getItem('hasUnreadNotifications') === 'true';
      setUnreadBadge(isLocalUnread);
    }
  };

  useEffect(() => {
    fetchUnreadNotifications(); // 🟢 പേജ് ലോഡ് ചെയ്യുമ്പോൾ മാത്രം പ്രവർത്തിക്കും

    const handleNewNotif = () => {
      setUnreadBadge(true);
      localStorage.setItem('hasUnreadNotifications', 'true');
    };

    const handleReadNotif = () => {
      setUnreadBadge(false);
      localStorage.setItem('hasUnreadNotifications', 'false');
    };

    window.addEventListener('storage', fetchUnreadNotifications);
    window.addEventListener('new-notification', handleNewNotif);
    window.addEventListener('notifications-read', handleReadNotif);

    return () => {
      window.removeEventListener('storage', fetchUnreadNotifications);
      window.removeEventListener('new-notification', handleNewNotif);
      window.removeEventListener('notifications-read', handleReadNotif);
    };
  }, []);

  // 🖼️ Base64 / Image Parser Helper
  const getFullImageUrl = (imgSrc) => {
    let src = imgSrc;

    if (!src || typeof src !== 'string' || src.trim() === '' || src === 'null' || src === 'undefined') {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          const u = parsed.user || parsed.data || parsed;
          src = u.profile_image || u.profileImage || u.avatar || u.image || '';
        }
      } catch (e) {
        console.error("Storage read error:", e);
      }
    }

    if (!src || typeof src !== 'string') return null;

    src = src.trim().replace(/^"|"$/g, '').replace(/[\r\n\s]/g, '');
    if (!src || src === 'null' || src === 'undefined') return null;

    if (src.includes('data:image')) {
      return src.substring(src.indexOf('data:image'));
    }
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    return `http://127.0.0.1:8000${src.startsWith('/') ? '' : '/'}${src}`;
  };

  const syncUserData = () => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const u = parsed.user || parsed.data || parsed;
        const img = u.profile_image || u.profileImage || u.avatar || u.image || propProfileImage || '';
        const name = u.fullName || u.full_name || u.username || u.name || propUsername || '';
        
        setCurrentProfileImage(img);
        setCurrentUsername(name);
      }
    } catch (e) {
      console.error("Sync error:", e);
    }
  };

  useEffect(() => {
    setCurrentProfileImage(propProfileImage);
    setCurrentUsername(propUsername);
  }, [propProfileImage, propUsername]);

  useEffect(() => {
    syncUserData();
    window.addEventListener('storage', syncUserData);
    window.addEventListener('user-profile-updated', syncUserData);

    return () => {
      window.removeEventListener('storage', syncUserData);
      window.removeEventListener('user-profile-updated', syncUserData);
    };
  }, []);

  const finalProfileImageSrc = getFullImageUrl(currentProfileImage);

  const mapWeatherIcon = (conditionStr) => {
    const cond = (conditionStr || '').toLowerCase();
    if (cond.includes('clear')) return 'bi-sun';
    if (cond.includes('cloud')) return 'bi-cloud-sun';
    if (cond.includes('rain') || cond.includes('drizzle')) return 'bi-cloud-rain';
    if (cond.includes('thunder')) return 'bi-cloud-lightning-rain';
    if (cond.includes('fog') || cond.includes('mist')) return 'bi-cloud-fog';
    return 'bi-cloud-sun';
  };

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const dayMonth = now.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' });
      const year = now.getFullYear();

      const timeParts = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).split(' ');

      setDateTime({
        dayMonthStr: dayMonth,
        yearStr: String(year),
        timeNumStr: timeParts[0] || '',
        timeAmPmStr: timeParts[1] || ''
      });
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);

    const fetchWeather = async () => {
      try {
        const res = await api.get("weather/");
        const data = res.data;
        if (data.success) {
          setWeather({
            temp: data.temp,
            condition: data.condition,
            icon: mapWeatherIcon(data.condition)
          });
        }
      } catch (error) {
        console.error("Backend Weather Error:", error);
        setWeather({ temp: '29°C', condition: 'Partly Cloudy', icon: 'bi-cloud-sun' });
      }
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 600000);

    return () => {
      clearInterval(timer);
      clearInterval(weatherTimer);
    };
  }, []);

  const handleProfileClick = () => navigate('/profile');

  const handleBellClick = () => {
    setUnreadBadge(false);
    localStorage.setItem('hasUnreadNotifications', 'false');
    window.dispatchEvent(new Event('notifications-read'));

    if (onNotificationClick) onNotificationClick();
    navigate('/Notifications');
  };

  const conditionWords = weather.condition.split(' ');

  return (
    <div className="navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="menu-toggle"
          onClick={() => window.dispatchEvent(new CustomEvent('open-sidebar'))}
          aria-label="Open sidebar"
        >
          ☰
        </button>

        <div className="nav-widget-pill">
          <i className="bi bi-calendar-event pill-icon"></i>
          <div className="pill-text-stack">
            <span>{dateTime.dayMonthStr}</span>
            <span>{dateTime.yearStr}</span>
          </div>

          <span className="pill-divider">•</span>

          <i className="bi bi-clock pill-icon"></i>
          <div className="pill-text-stack fw-bold">
            <span>{dateTime.timeNumStr}</span>
            <span>{dateTime.timeAmPmStr}</span>
          </div>
        </div>

        <div className="nav-widget-pill weather-pill">
          <i className={`bi ${weather.icon} pill-icon fs-5`}></i>
          <span className="pill-temp">{weather.temp}</span>

          <span className="pill-divider">•</span>

          <div className="pill-text-stack">
            <span>{conditionWords[0] || "Partly"}</span>
            <span>{conditionWords[1] || "Cloudy"}</span>
          </div>
        </div>
      </div>

      <div className="navbar-right">
        <div className="notification-container" onClick={handleBellClick}>
          <i className="bi bi-bell notification-icon"></i>
          {unreadBadge && <span className="notification-badge"></span>}
        </div>

        <div className="user-profile" onClick={handleProfileClick}>
          {finalProfileImageSrc ? (
            <img 
              src={finalProfileImageSrc} 
              alt="Profile" 
              className="profile-img" 
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'flex';
                }
              }}
            />
          ) : null}

          <div 
            className="profile-icon-wrapper" 
            style={{ display: finalProfileImageSrc ? 'none' : 'flex' }}
          >
            <i className="bi bi-person"></i>
          </div>

          <span className="username-text">{currentUsername || "Guest"}</span>
        </div>
      </div>
    </div>
  );
};

export default Navbar;