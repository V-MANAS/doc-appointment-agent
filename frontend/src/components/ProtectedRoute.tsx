import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: ('ADMIN' | 'DOCTOR' | 'PATIENT')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  const token = localStorage.getItem('token');

  // 1. Not Authenticated -> Redirect to Login
  if (!token || !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // 2. Authenticated but role is not authorized -> Redirect to Access Denied
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/access-denied" replace />;
  }

  // 3. Authorized -> Render component
  return children;
};

export default ProtectedRoute;
