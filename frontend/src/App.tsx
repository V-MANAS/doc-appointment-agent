import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { Login } from './pages/Login';
import { PatientChat } from './pages/PatientChat';
import { MockCheckout } from './pages/MockCheckout';
import { AccessDenied } from './pages/AccessDenied';

// Admin Pages
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminSchedule } from './pages/AdminSchedule';
import { AdminSheets } from './pages/AdminSheets';
import { AdminSettings } from './pages/AdminSettings';

// Doctor Pages
import { DoctorLayout } from './layouts/DoctorLayout';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { DoctorAppointments } from './pages/DoctorAppointments';
import { DoctorSchedule } from './pages/DoctorSchedule';
import { DoctorPatients } from './pages/DoctorPatients';
import { DoctorSettings } from './pages/DoctorSettings';

// Patient Layout
import { PatientLayout } from './layouts/PatientLayout';

// Shared Components
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient();

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
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="schedule" element={<AdminSchedule />} />
            <Route path="sheets" element={<AdminSheets />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Doctor Protected Routes */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={['DOCTOR']}>
                <DoctorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DoctorDashboard />} />
            <Route path="appointments" element={<DoctorAppointments />} />
            <Route path="schedule" element={<DoctorSchedule />} />
            <Route path="patients" element={<DoctorPatients />} />
            <Route path="settings" element={<DoctorSettings />} />
          </Route>

          {/* Patient Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <PatientLayout />
              </ProtectedRoute>
            }
          >
            <Route path="chat" element={<PatientChat />} />
          </Route>

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
