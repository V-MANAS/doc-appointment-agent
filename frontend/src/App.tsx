import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { Login } from './pages/Login';
import { PatientChat } from './pages/PatientChat';
import { AdminDashboard } from './pages/AdminDashboard';
import { MockCheckout } from './pages/MockCheckout';

const queryClient = new QueryClient();

// Route wrapper enforcing authentication checks
const ProtectedRoute: React.FC<{ children: React.ReactElement; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user } = useAuthStore();
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If patient tries to enter admin dashboard, redirect to chat
    if (user.role === 'PATIENT') {
      return <Navigate to="/chat" replace />;
    }
    // If admin/doctor tries to enter chat, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const App: React.FC = () => {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication page */}
          <Route path="/" element={<Login />} />

          {/* Patient Conversation portal */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <PatientChat />
              </ProtectedRoute>
            }
          />

          {/* Administrative Oversight Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'DOCTOR']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Simulated Stripe payment portal */}
          <Route
            path="/mock-checkout"
            element={
              <ProtectedRoute>
                <MockCheckout />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
