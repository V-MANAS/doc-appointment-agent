import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSheetStore } from '../store/sheetStore';
import api from '../services/api';
import logger from '../utils/logger';
import ConsultationCard from '../components/ConsultationCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Clock } from 'lucide-react';

export const DoctorAppointments: React.FC = () => {
  const { user } = useAuthStore();
  const { appointments, setAppointments } = useSheetStore();
  const [isLoading, setIsLoading] = useState(false);
  const [activeDoctor, setActiveDoctor] = useState<any>(null);

  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    const list = localStorage.getItem('completed_appointments');
    return list ? JSON.parse(list) : [];
  });

  const fetchDoctorProfileAndAppointments = async () => {
    if (!user) {
      console.log('DoctorAppointments: No user session found.');
      return;
    }
    console.log('DoctorAppointments: Starting fetch. loadingState = true');
    setIsLoading(true);
    try {
      console.log('DoctorAppointments: Auth User Info:', user);

      const dResp = await api.get('/doctors');
      console.log('DoctorAppointments: Doctor list response:', dResp.data);
      const docs = dResp.data.doctors || [];
      const currentDoc = docs.find((d: any) => d.email === user.email);
      console.log('DoctorAppointments: Filtered profile:', currentDoc);
      setActiveDoctor(currentDoc || null);

      const aResp = await api.get('/admin/appointments');
      console.log('DoctorAppointments: Appointments response:', aResp.data);
      setAppointments(aResp.data.appointments || []);
    } catch (err) {
      console.error('DoctorAppointments: Error fetching details:', err);
      logger.error('Error loading doctor appointments:', String(err));
    } finally {
      console.log('DoctorAppointments: Fetch finished. setting loadingState = false');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorProfileAndAppointments();
  }, [user]);

  const handleComplete = (id: string) => {
    const updated = [...completedIds, id];
    setCompletedIds(updated);
    localStorage.setItem('completed_appointments', JSON.stringify(updated));
    alert('Appointment marked as completed!');
  };

  // Filter doctor's appointments
  const myAppointments = appointments.filter(
    (a) => activeDoctor && a.doctorId === activeDoctor.id
  );

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Today's queue includes Confirmed, In Progress, Completed, or No Show
  const todayAppointments = myAppointments.filter(
    (a) => a.date === todayStr && a.status !== 'CANCELLED'
  );

  // Future appointments
  const upcomingAppointments = myAppointments.filter(
    (a) => {
      const apptDate = new Date(a.date);
      const todayDate = new Date(todayStr);
      return apptDate > todayDate && a.status === 'CONFIRMED';
    }
  );

  if (isLoading) {
    return <LoadingSpinner label="Retrieving appointments list..." />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-400" />
          My Consultation Queue
        </h2>
        <p className="text-xs text-slate-500 mt-1">Review active, upcoming, and completed visits</p>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Consultation Queue</h4>
        {todayAppointments.length === 0 ? (
          <p className="text-xs text-slate-500 italic bg-slate-900/25 p-4 border border-slate-800 rounded-xl">
            No consultations scheduled for today.
          </p>
        ) : (
          <div className="space-y-4">
            {todayAppointments.map((a) => (
              <ConsultationCard 
                key={a.id} 
                appointment={a} 
                onStatusChange={fetchDoctorProfileAndAppointments} 
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Future Scheduled Appointments</h4>
        {upcomingAppointments.length === 0 ? (
          <p className="text-xs text-slate-500 italic bg-slate-900/25 p-4 border border-slate-800 rounded-xl">
            No future appointments scheduled.
          </p>
        ) : (
          <div className="space-y-4">
            {upcomingAppointments.map((a) => (
              <ConsultationCard 
                key={a.id} 
                appointment={a} 
                onStatusChange={fetchDoctorProfileAndAppointments} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorAppointments;
