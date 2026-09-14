import React from 'react';
import { Navigate } from 'react-router-dom';

const PublicRoute = ({ children }) => {
  // 🟢 HttpOnly Cookies ഉപയോഗിക്കുന്നതിനാൽ 'access_token' നോക്കേണ്ടതില്ല.
  // user ഡാറ്റുണ്ടോ എന്ന് മാത്രം പരിശോധിക്കുക.
  const rawUser = localStorage.getItem("user") || localStorage.getItem("loggedInUser");

  if (rawUser) {
    try {
      const parsedUser = JSON.parse(rawUser);
      const role = String(parsedUser?.role || "citizen").toLowerCase().trim();

      // റോൾ അനുസരിച്ച് അതാത് ഡാഷ്‌ബോർഡിലേക്ക് റിഡയറക്ട് ചെയ്യുന്നു
      if (role === "ward") {
        return <Navigate to="/ward-dashboard" replace />;
      } else if (role === "panchayat") {
        return <Navigate to="/panchayat-dashboard" replace />;
      } else {
        return <Navigate to="/Dashboard" replace />;
      }
    } catch (error) {
      console.error("Invalid user data in storage", error);
      localStorage.removeItem("user");
      localStorage.removeItem("loggedInUser");
    }
  }

  return children;
};

export default PublicRoute;