import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSheetStore } from '../store/sheetStore';
import api from '../services/api';
import logger from '../utils/logger';
import Calendar from '../components/Calendar';
import LoadingSpinner from '../components/LoadingSpinner';

export const DoctorSchedule: React.FC = () => {
  const { user } = useAuthStore();
  const { appointments, setAppointments } = useSheetStore();
  const [isLoading, setIsLoading] = useState(false);
  const [activeDoctor, setActiveDoctor] = useState<any>(null);

  const fetchDoctorProfileAndAppointments = async () => {
    if (!user) {
      console.log('DoctorSchedule: No session found.');
      return;
    }
    console.log('DoctorSchedule: Starting fetch. loadingState = true');
    setIsLoading(true);
    try {
      console.log('DoctorSchedule: User Auth Info:', user);

      const dResp = await api.get('/doctors');
      console.log('DoctorSchedule: Doctor list response:', dResp.data);
      const docs = dResp.data.doctors || [];
      const currentDoc = docs.find((d: any) => d.email === user.email);
      console.log('DoctorSchedule: Filtered profile:', currentDoc);
      setActiveDoctor(currentDoc || null);

      const aResp = await api.get('/admin/appointments');
      console.log('DoctorSchedule: Appointments list response:', aResp.data);
      setAppointments(aResp.data.appointments || []);
    } catch (err) {
      console.error('DoctorSchedule: Error loading details:', err);
      logger.error('Error loading doctor calendar:', String(err));
    } finally {
      console.log('DoctorSchedule: Fetch finished. setting loadingState = false');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorProfileAndAppointments();
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner label="Loading schedule calendar..." />;
  }

  const selectedDocId = activeDoctor?.id || 'no-doctor';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Schedule Calendar</h2>
        <p className="text-xs text-slate-500 mt-1">Review booked slots and availability timings</p>
      </div>

      <Calendar
        appointments={appointments}
        selectedDoctorId={selectedDocId}
        showDoctorSelect={false}
      />
    </div>
  );
};

export default DoctorSchedule;
