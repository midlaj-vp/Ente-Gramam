import React, { useState, useEffect } from 'react';
import "./App.css";
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut } from "lucide-react";

import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

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
import CitizenEmergencyListener from './components/CitizenEmergencyListener';

const API_BASE_URL = "http://127.0.0.1:8000/api";

function AppLayout({ children }) {
  const [user, setUser] = useState(null);

  const loadUserData = () => {
    const storedUser = localStorage.getItem('user') || localStorage.getItem('loggedInUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const u = parsed?.user || parsed?.data || parsed;
        setUser(u);
      } catch (error) {
        console.error("Failed to parse user data", error);
      }
    }
  };

  useEffect(() => {
    loadUserData();

    window.addEventListener('storage', loadUserData);
    window.addEventListener('user-profile-updated', loadUserData);

    return () => {
      window.removeEventListener('storage', loadUserData);
      window.removeEventListener('user-profile-updated', loadUserData);
    };
  }, []);

  const username = user?.fullName || user?.full_name || user?.name || user?.username || "Guest";
  const profileImage = user?.profileImage || user?.profile_image || null;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ marginLeft: '250px', width: '100%' }}>
        <Navbar username={username} profileImage={profileImage} />
        <div style={{ width: '100%' }}>{children}</div>
      </div>
    </div>
  );
}

const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("loggedInUser");
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
  const [isDeactivated, setIsDeactivated] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (savedTheme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }, []);

  useEffect(() => {
    const checkUserActiveStatus = async () => {
      const rawUser = localStorage.getItem("user") || localStorage.getItem("loggedInUser");
      if (!rawUser) return;

      try {
        const user = JSON.parse(rawUser);
        const role = (user.role || "").toLowerCase().trim();

        if (role === "ward") {
          const res = await fetch(`${API_BASE_URL}/ward-members/`);
          if (res.ok) {
            const data = await res.json();
            const members = Array.isArray(data) ? data : data.results || [];

            const currentMember = members.find(
              (m) => m.username === user.username || m.id === user.id
            );

            if (currentMember && currentMember.status === "inactive") {
              setIsDeactivated(true);
            }
          }
        }
      } catch (error) {
        console.error("Error verifying active user status:", error);
      }
    };

    checkUserActiveStatus();

    const handleStorageChange = () => {
      const activeUser = localStorage.getItem("user") || localStorage.getItem("loggedInUser");
      if (!activeUser) {
        setCurrentUser(null);
        navigate('/');
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [navigate]);

  const handleLogin = (credentials) => {
    let rawImg = credentials.profileImage || credentials.profile_image || "";

    // 🟢 Base64 സ്ട്രിംഗ് വരുന്നത് തടയാൻ Safe Check
    if (typeof rawImg === "string" && rawImg.startsWith("data:image")) {
      rawImg = "";
    }

    const loggedUser = {
      id: credentials.id || credentials.userId || credentials.email || `user-${Date.now()}`,
      name: credentials.name || credentials.fullName || credentials.username || "User",
      username: credentials.username || "",
      role: String(credentials.role || "citizen").toLowerCase().trim(),
      wardName: credentials.wardName || "",
      profileImage: rawImg,
      profile_image: rawImg
    };

    localStorage.setItem("user", JSON.stringify(loggedUser));
    localStorage.setItem("loggedInUser", JSON.stringify(loggedUser));
    
    setCurrentUser(loggedUser);
    window.dispatchEvent(new Event('user-profile-updated'));

    if (loggedUser.role === "ward") {
      navigate('/ward-dashboard');
    } else if (loggedUser.role === "panchayat") {
      navigate('/panchayat-dashboard');
    } else {
      navigate('/Dashboard');
    }
  };

  const handleDeactivateConfirm = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("loggedInUser");
    localStorage.clear();
    setCurrentUser(null);
    setIsDeactivated(false);
    navigate('/');
  };

  const userRole = currentUser?.role || "citizen";
  const userWardName = currentUser?.wardName || "";

  return (
    <>
      <CitizenEmergencyListener />

      {isDeactivated && (
        <div className="dp-overlay">
          <div className="dp-card">
            <div className="dp-icon-wrapper">
              <ShieldAlert size={32} color="#dc2626" />
            </div>
            <h2 className="dp-title">Account Deactivated</h2>
            <p className="dp-message">
              Your account has been deactivated by the Panchayat Administrator.
            </p>
            <button className="dp-btn" onClick={handleDeactivateConfirm}>
              <LogOut size={16} /> Back to Login
            </button>
          </div>
        </div>
      )}

      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={
          <PublicRoute>
            <Login
              onLogin={handleLogin}
              onCreateAccount={() => navigate('/signup')}
            />
          </PublicRoute>
        } />

        <Route path="/signup" element={
          <PublicRoute>
            <CitizenSignUp />
          </PublicRoute>
        } />

        {/* PROTECTED ROUTES */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <AppLayout>
              <Profile />
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/Notifications" element={
          <ProtectedRoute>
            <AppLayout>
              <NotificationsPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/send-notifications" element={
          <ProtectedRoute allowedRoles={['panchayat', 'ward']}>
            <AppLayout>
              <NotificationsPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/Complaints' element={
          <ProtectedRoute>
            <AppLayout>
              <ComplaintsPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/ward-complaints' element={
          <ProtectedRoute allowedRoles={['ward']}>
            <AppLayout>
              <ComplaintsPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/verify-complaints' element={
          <ProtectedRoute allowedRoles={['panchayat']}>
            <AppLayout>
              <ComplaintsPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/Blood-Donors' element={
          <ProtectedRoute>
            <AppLayout>
              <BloodDonorsPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/Blood-Donor-Directory' element={
          <ProtectedRoute>
            <AppLayout>
              <BloodDonorsPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/projects' element={
          <ProtectedRoute>
            <AppLayout>
              <VillageProjectsPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/Development-Projects' element={
          <ProtectedRoute>
            <AppLayout>
              <VillageProjectsPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/Haritha-Karma-Sena' element={
          <ProtectedRoute>
            <AppLayout>
              <HarithaKarmaSenaPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/Feedback' element={
          <ProtectedRoute>
            <AppLayout>
              <FeedbackPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/Citizen-Feedback' element={
          <ProtectedRoute>
            <AppLayout>
              <FeedbackPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/Settings' element={
          <ProtectedRoute>
            <AppLayout>
              <SettingsPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/manage-visibility" element={
          <ProtectedRoute allowedRoles={['panchayat']}>
            <AppLayout>
              <PublicVisibilityPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/privacy-policy" element={
          <ProtectedRoute>
            <AppLayout>
              <PrivacyPolicyPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/Emergency-SOS' element={
          <ProtectedRoute>
            <AppLayout>
              <EmergencySOSPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/Emergency-Services' element={
          <ProtectedRoute>
            <AppLayout>
              <EmergencySOSPage userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path='/ward-reports' element={
          <ProtectedRoute allowedRoles={['ward', 'panchayat']}>
            <AppLayout>
              <WardReports userRole={userRole} userWard={userWardName}/>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path='/members-Authentication' element={
          <ProtectedRoute allowedRoles={['panchayat']}>
            <AppLayout>
              <MembersAuthentication userRole={userRole} userWard={userWardName}/>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path='/emergency-alert' element={
          <ProtectedRoute>
            <AppLayout>
              <EmergencyAlert userRole={userRole} userWard={userWardName}/>
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/Welfare-Schemes' element={
          <ProtectedRoute>
            <AppLayout>
              <SchemeApplication 
                key={`${currentUser?.id || "guest"}-${userWardName}`} 
                userRole={userRole} 
                wardName={userWardName} 
              />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path='/Dashboard' element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <AppLayout>
              <Dashboard userRole={userRole} userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/panchayat-dashboard" element={
          <ProtectedRoute allowedRoles={['panchayat']}>
            <AppLayout>
              <Dashboard userRole="panchayat" userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/ward-dashboard" element={
          <ProtectedRoute allowedRoles={['ward']}>
            <AppLayout>
              <Dashboard userRole="ward" userWard={userWardName} />
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/layout-dashboard" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </>
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