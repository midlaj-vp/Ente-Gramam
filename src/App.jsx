import React, { useState, useEffect } from 'react';
import "./app.css";
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';

import Sidebar from './components/Sidebar/Sidebar';
import Navbar from './components/Navbar/Navbar';
import CitizenSignUp from './pages/Signup/Signup';
import Profile from './pages/Profile/Profile';
import Login from './pages/Login/Login';
import NotificationsPage from './pages/Notifications/Notifications';
import ComplaintsPage from './pages/Complaints/Complaints';
import BloodDonorsPage from './pages/BloodDonor/BloodDonor';
import VillageProjectsPage from './pages/Projects/Projects';
import HarithaKarmaSenaPage from './pages/HarithaKarmaSena/HarithaKarmaSena';
import FeedbackPage from './pages/Feedback/Feedback';
import SettingsPage from './pages/Settings/Settings';
import PublicVisibilityPage from './pages/Settings/PublicVisibility';
import PrivacyPolicyPage from './pages/Settings/PrivacyPolicy';
import EmergencySOSPage from './pages/Emergency/Emergency';
import Dashboard from './pages/Dashboard/Dashboard';
import SchemeApplication from './pages/Welfare/Welfare';
import Layout from './components/Navbar/Layout';
import WardReports from './pages/WardReports/WardReports';
import MembersAuthentication from './pages/MembersAuthentication/Authentication.jsx';
import EmergencyAlert from './pages/Emergency/emergency-alert.jsx';

function AppLayout({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser') || localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse user data", error);
      }
    }

    const savedTheme = localStorage.getItem("ente_gramam_theme") || "light";
    if (savedTheme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }, []);

  const username = user?.name || user?.username || "Guest";
  const profileImage = user?.profileImage || null;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ marginLeft: '250px', width: '100%' }}>
        <Navbar username={username} profileImage={profileImage} hasNewNotification={true} />
        <div style={{ width: '100%' }}>{children}</div>
      </div>
    </div>
  );
}

const getCurrentUser = () => {
    try {
        const raw = localStorage.getItem("loggedInUser") || localStorage.getItem("user");
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (parsed?.user) return { ...parsed, ...parsed.user };
        if (parsed?.data) return { ...parsed, ...parsed.data };
        return parsed;
    } catch (error) {
        console.error("Failed to load logged-in user:", error);
        return null;
    }
};

function AppRoutes() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  const handleLogin = (credentials) => {
    console.log("Logging in with:", credentials);
    
    // Normalize and securely store the logged-in user with wardName
    const loggedUser = {
        id: credentials.id || credentials.userId || credentials.email || `user-${Date.now()}`,
        name: credentials.name || credentials.fullName || credentials.username || "User",
        role: String(credentials.role || "citizen").toLowerCase().trim(),
        wardName: credentials.wardName || ""
    };

    // Make it the active login globally
    localStorage.setItem("loggedInUser", JSON.stringify(loggedUser));
    localStorage.setItem("user", JSON.stringify(loggedUser));
    
    // Update local React State to trigger a strict re-render
    setCurrentUser(loggedUser);

    if (loggedUser.role === "ward") {
      navigate('/ward-dashboard');
    } else if (loggedUser.role === "panchayat") {
      navigate('/panchayat-dashboard');
    } else {
      navigate('/Dashboard');
    }
  };

  const userRole = currentUser?.role || "citizen";
  const userWardName = currentUser?.wardName || "";

  return (
    <Routes>
      <Route path="/" element={
        <Login
          onLogin={handleLogin}
          onCreateAccount={() => navigate('/signup')}
        />
      } />

      <Route path="/signup" element={<CitizenSignUp />} />

      <Route path="/profile" element={
        <AppLayout>
          <Profile />
        </AppLayout>
      } />

      <Route path="/Notifications" element={
        <AppLayout>
          <NotificationsPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />

      <Route path="/send-notifications" element={
        <AppLayout>
          <NotificationsPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path='/Complaints' element={
        <AppLayout>
          <ComplaintsPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path='/ward-complaints' element={
        <AppLayout>
          <ComplaintsPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path='/verify-complaints' element={
        <AppLayout>
          <ComplaintsPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path='/Blood-Donors' element={
        <AppLayout>
          <BloodDonorsPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path='Blood-Donor-Directory' element={
        <AppLayout>
          <BloodDonorsPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path='projects' element={
        <AppLayout>
          <VillageProjectsPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path='Development-Projects' element={
        <AppLayout>
          <VillageProjectsPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path='Haritha-Karma-Sena' element={
        <AppLayout>
          <HarithaKarmaSenaPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path='Feedback' element={
        <AppLayout>
          <FeedbackPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path='Citizen-Feedback' element={
        <AppLayout>
          <FeedbackPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path='Settings' element={
        <AppLayout>
          <SettingsPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path="/manage-visibility" element={
        <AppLayout>
          <PublicVisibilityPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path="/privacy-policy" element={
        <AppLayout>
          <PrivacyPolicyPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path='Emergency-SOS' element={
        <AppLayout>
          <EmergencySOSPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      
      <Route path='Emergency-Services' element={
        <AppLayout>
          <EmergencySOSPage userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />
      <Route path='ward-reports' element={
        <AppLayout>
          <WardReports userRole={userRole} userRole={userWardName}/>
        </AppLayout>
      }
      />
      <Route path='members-Authentication' element={
        <AppLayout>
          <MembersAuthentication userRole={userRole} userRole={userWardName}/>
        </AppLayout>
      }/>
      <Route path='emergency-alert' element={
        <AppLayout>
          <EmergencyAlert userRole={userRole} userRole={userWardName}/>
        </AppLayout>
      }/>
      
      <Route path='Welfare-Schemes' element={
        <AppLayout>
          {/* Key ensures proper re-mounting when switching users/wards */}
          <SchemeApplication 
            key={`${currentUser?.id || "guest"}-${userWardName}`} 
            userRole={userRole} 
            wardName={userWardName} 
          />
        </AppLayout>
      } />
      
      <Route path='/Dashboard' element={
        <AppLayout>
          <Dashboard userRole={userRole} userWard={userWardName} />
        </AppLayout>
      } />

      <Route path="/panchayat-dashboard" element={
        <AppLayout>
          <Dashboard userRole="panchayat" userWard={userWardName} />
        </AppLayout>
      } />

      <Route path="/ward-dashboard" element={
        <AppLayout>
          <Dashboard userRole="ward" userWard={userWardName} />
        </AppLayout>
      } />

      <Route path="/layout-dashboard" element={
        <Layout>
          <Dashboard />
        </Layout>
      } />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;