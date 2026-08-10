import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSheetStore } from '../store/sheetStore';
import api from '../services/api';
import logger from '../utils/logger';
import LoadingSpinner from '../components/LoadingSpinner';
import { HeartPulse, User } from 'lucide-react';

export const DoctorPatients: React.FC = () => {
  const { user } = useAuthStore();
  const { appointments, setAppointments } = useSheetStore();
  const [isLoading, setIsLoading] = useState(false);
  const [activeDoctor, setActiveDoctor] = useState<any>(null);

  const fetchDoctorProfileAndAppointments = async () => {
    if (!user) {
      console.log('DoctorPatients: No session user found.');
      return;
    }
    console.log('DoctorPatients: Starting fetch. loadingState = true');
    setIsLoading(true);
    try {
      console.log('DoctorPatients: Auth User Info:', user);

      const dResp = await api.get('/doctors');
      console.log('DoctorPatients: Doctor list response received:', dResp.data);
      const docs = dResp.data.doctors || [];
      const currentDoc = docs.find((d: any) => d.email === user.email);
      console.log('DoctorPatients: Filtered profile:', currentDoc);
      setActiveDoctor(currentDoc || null);

      const aResp = await api.get('/admin/appointments');
      console.log('DoctorPatients: Appointments list response received:', aResp.data);
      setAppointments(aResp.data.appointments || []);
    } catch (err) {
      console.error('DoctorPatients: Error loading patient list details:', err);
      logger.error('Error loading doctor patient list:', String(err));
    } finally {
      console.log('DoctorPatients: Fetch finished. setting loadingState = false');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorProfileAndAppointments();
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner label="Loading patients list..." />;
  }

  // Filter doctor's appointments safely
  const myAppointments = appointments.filter(
    (a) => activeDoctor && a.doctorId === activeDoctor.id
  );

  // Extract unique patient objects
  const uniquePatientsMap = new Map<string, any>();
  myAppointments.forEach((a) => {
    if (a.patient && !uniquePatientsMap.has(a.patientId)) {
      uniquePatientsMap.set(a.patientId, {
        ...a.patient,
        lastAppointmentDate: a.date,
        lastAppointmentTime: a.time,
        whatsappNumber: a.whatsappNumber
      });
    }
  });

  const myPatients = Array.from(uniquePatientsMap.values());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-indigo-400" />
          My Patients Registry
        </h2>
        <p className="text-xs text-slate-500 mt-1">Directory of patients registered for your consultations</p>
      </div>

      <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/40">
        <table className="min-w-full text-xs text-slate-300 divide-y divide-slate-800">
          <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-3 text-left">Patient Name</th>
              <th className="px-4 py-3 text-left">WhatsApp Number</th>
              <th className="px-4 py-3 text-left">Age</th>
              <th className="px-4 py-3 text-left">Gender</th>
              <th className="px-4 py-3 text-left">Last Visit Date</th>
              <th className="px-4 py-3 text-left">Last Visit Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {myPatients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No patients found registered under your schedule.
                </td>
              </tr>
            ) : (
              myPatients.map((p, idx) => (
                <tr key={p.id || idx} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-200 flex items-center gap-2">
                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-slate-500">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    {p.name}
                  </td>
                  <td className="px-4 py-3 font-mono">{p.whatsappNumber}</td>
                  <td className="px-4 py-3">{p.age}</td>
                  <td className="px-4 py-3">{p.gender}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{p.lastAppointmentDate}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{p.lastAppointmentTime}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DoctorPatients;
