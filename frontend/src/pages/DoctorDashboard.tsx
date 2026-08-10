import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSheetStore } from '../store/sheetStore';
import api from '../services/api';
import logger from '../utils/logger';
import StatCard from '../components/StatCard';
import AppointmentTable from '../components/AppointmentTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { Clock, CheckCircle, CalendarDays, Activity } from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { appointments, setAppointments } = useSheetStore();
  const [isLoading, setIsLoading] = useState(false);
  const [activeDoctor, setActiveDoctor] = useState<any>(null);

  // Completed appointments list stored persistently in localStorage
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    const list = localStorage.getItem('completed_appointments');
    return list ? JSON.parse(list) : [];
  });

  const fetchDoctorProfileAndAppointments = async () => {
    if (!user) {
      console.log('DoctorDashboard: No authenticated user found.');
      return;
    }
    console.log('DoctorDashboard: Starting fetch profile and appointments. loadingState = true');
    setIsLoading(true);
    try {
      console.log('DoctorDashboard: Authenticated User Info:', user);

      // 1. Fetch doctors list to find the doctor's database ID
      const dResp = await api.get('/doctors');
      console.log('DoctorDashboard: Doctor list response received:', dResp.data);
      const docs = dResp.data.doctors || [];
      const currentDoc = docs.find((d: any) => d.email === user.email);
      console.log('DoctorDashboard: Filtered Doctor Profile:', currentDoc);
      setActiveDoctor(currentDoc || null);

      // 2. Fetch all appointments from the admin route (since doctors have access to it)
      const aResp = await api.get('/admin/appointments');
      console.log('DoctorDashboard: Appointments list response received:', aResp.data);
      setAppointments(aResp.data.appointments || []);
    } catch (err) {
      console.error('DoctorDashboard: Error loading doctor details:', err);
      logger.error('Error loading doctor details:', String(err));
    } finally {
      console.log('DoctorDashboard: Fetch complete. setting loadingState = false');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorProfileAndAppointments();
  }, [user]);

  // Fallbacks for profile if activeDoctor is not found
  const doctorName = activeDoctor?.name || user?.name || 'Doctor';
  const doctorSpecialty = activeDoctor?.specialty || 'General Medicine';
  const doctorHours = activeDoctor?.workingHours || '10:00-18:00';

  // Filter appointments for the logged in doctor only
  const myAppointments = appointments.filter(
    (a) => activeDoctor && a.doctorId === activeDoctor.id
  );

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Categorize doctor's appointments
  const todayAppointments = myAppointments.filter(
    (a) => a.date === todayStr && a.status === 'CONFIRMED' && !completedIds.includes(a.id)
  );

  const upcomingAppointments = myAppointments.filter(
    (a) => {
      const apptDate = new Date(a.date);
      const todayDate = new Date(todayStr);
      return apptDate >= todayDate && a.status === 'CONFIRMED' && !completedIds.includes(a.id);
    }
  );

  const completedAppointments = myAppointments.filter(
    (a) => completedIds.includes(a.id) || a.paymentStatus === 'PAID' && a.status === 'CONFIRMED' && new Date(a.date) < new Date(todayStr)
  );

  const handleComplete = (id: string) => {
    const updated = [...completedIds, id];
    setCompletedIds(updated);
    localStorage.setItem('completed_appointments', JSON.stringify(updated));
    alert('Appointment marked as completed!');
  };

  if (isLoading) {
    return <LoadingSpinner label="Retrieving doctor profile..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header welcome banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
        <div className="z-10 relative">
          <h2 className="text-xl font-bold text-white font-display">Welcome Back, {doctorName}!</h2>
          <p className="text-xs text-slate-400 mt-1">
            Specialty: <span className="text-indigo-400 font-semibold">{doctorSpecialty}</span> | Hours: {doctorHours}
          </p>
        </div>
      </div>

      {/* Widgets row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Today's Bookings"
          value={todayAppointments.length}
          icon={<Clock className="h-6 w-6" />}
          trend="Immediate attention"
          trendColor="warning"
        />
        <StatCard
          title="Total Upcoming"
          value={upcomingAppointments.length}
          icon={<CalendarDays className="h-6 w-6" />}
          trend="Consultation slots"
          trendColor="info"
        />
        <StatCard
          title="Completed Visits"
          value={completedAppointments.length}
          icon={<CheckCircle className="h-6 w-6" />}
          trend="Successful checkups"
          trendColor="success"
        />
      </div>

      {/* Today's Schedule List */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Activity className="h-4.5 w-4.5 text-indigo-400" />
          Today's Outstanding Consultations
        </h4>
        
        <AppointmentTable
          appointments={todayAppointments}
          showDoctorName={false}
          showCompleteAction={true}
          onComplete={handleComplete}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default DoctorDashboard;
