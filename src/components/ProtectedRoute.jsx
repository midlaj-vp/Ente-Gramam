import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const rawUser = localStorage.getItem("user") || localStorage.getItem("loggedInUser");

  // 1. User ഡാറ്റ ഇല്ലെങ്കിൽ മാത്രം ലോഗിൻ പേജിലേക്ക് വിടുക (token പരിശോധന ഒഴിവാക്കി)
  if (!rawUser) {
    return <Navigate to="/" replace />;
  }

  try {
    const parsedUser = JSON.parse(rawUser);
    const userRole = String(parsedUser?.role || "citizen").toLowerCase().trim();

    // 2. അനുവാദമില്ലാത്ത റോൾ ആണെങ്കിൽ ലോഗിൻ പേജിലേക്ക് വിടുക
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  } catch (error) {
    console.error("Authentication error:", error);
    localStorage.removeItem("user");
    localStorage.removeItem("loggedInUser");
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;