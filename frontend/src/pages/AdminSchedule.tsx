import React, { useState, useEffect } from 'react';
import { useSheetStore } from '../store/sheetStore';
import api from '../services/api';
import logger from '../utils/logger';
import Calendar from '../components/Calendar';
import LoadingSpinner from '../components/LoadingSpinner';

export const AdminSchedule: React.FC = () => {
  const { appointments, setAppointments } = useSheetStore();
  const [isLoading, setIsLoading] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  const fetchDoctorsAndAppointments = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all doctors
      const dResp = await api.get('/doctors');
      const docs = dResp.data.doctors || [];
      setDoctors(docs);
      if (docs.length > 0) {
        setSelectedDoctorId(docs[0].id);
      }

      // 2. Fetch all appointments
      const aResp = await api.get('/admin/appointments');
      setAppointments(aResp.data.appointments || []);
    } catch (err) {
      logger.error('Error loading admin calendar data:', String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorsAndAppointments();
  }, []);

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.put(`/appointments/${id}/cancel`);
      alert('Appointment cancelled successfully!');
      // Refetch appointments
      const aResp = await api.get('/admin/appointments');
      setAppointments(aResp.data.appointments || []);
    } catch (err) {
      alert('Failed to cancel appointment');
    }
  };

  if (isLoading || doctors.length === 0) {
    return <LoadingSpinner label="Loading schedule grid..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white font-display">Clinic Schedule</h2>
        <p className="text-xs text-slate-500 mt-1">Review, filter, and cancel scheduled appointments</p>
      </div>

      <Calendar
        appointments={appointments}
        selectedDoctorId={selectedDoctorId}
        doctors={doctors}
        onDoctorChange={setSelectedDoctorId}
        onCancelAppointment={handleCancelAppointment}
        showDoctorSelect={true}
      />
    </div>
  );
};

export default AdminSchedule;
