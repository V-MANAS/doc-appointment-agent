import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import logger from '../utils/logger';
import LoadingSpinner from '../components/LoadingSpinner';
import { Settings, Plus, CalendarDays } from 'lucide-react';

export const DoctorSettings: React.FC = () => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [activeDoctor, setActiveDoctor] = useState<any>(null);

  // Settings states
  const [workingHours, setWorkingHours] = useState('10:00-18:00');
  const [lunchBreak, setLunchBreak] = useState('13:00-14:00');
  const [maxDailyBookings, setMaxDailyBookings] = useState(12);
  const [leaveDate, setLeaveDate] = useState('');

  const fetchDoctorProfile = async () => {
    if (!user) {
      console.log('DoctorSettings: No user session found.');
      return;
    }
    console.log('DoctorSettings: Starting fetch. loadingState = true');
    setIsLoading(true);
    try {
      console.log('DoctorSettings: Auth User Info:', user);

      const dResp = await api.get('/doctors');
      console.log('DoctorSettings: Doctor list response received:', dResp.data);
      const docs = dResp.data.doctors || [];
      const currentDoc = docs.find((d: any) => d.email === user.email);
      console.log('DoctorSettings: Filtered profile:', currentDoc);
      
      if (currentDoc) {
        setActiveDoctor(currentDoc);
        setWorkingHours(currentDoc.workingHours);
        setLunchBreak(currentDoc.lunchBreak);
        setMaxDailyBookings(currentDoc.maxDailyBookings);
      } else {
        setActiveDoctor(null);
      }
    } catch (err) {
      console.error('DoctorSettings: Error loading settings details:', err);
      logger.error('Error loading doctor settings profile:', String(err));
    } finally {
      console.log('DoctorSettings: Fetch finished. setting loadingState = false');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorProfile();
  }, [user]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoctor) {
      alert('Error: You do not have a registered doctor profile in the database. Contact the administrator to set up your profile first.');
      return;
    }
    try {
      await api.put(`/doctors/${activeDoctor.id}/settings`, {
        workingHours,
        lunchBreak,
        maxDailyBookings
      });
      alert('Availability settings updated successfully!');
    } catch (err) {
      alert('Failed to update availability settings');
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoctor) {
      alert('Error: You do not have a registered doctor profile in the database. Contact the administrator to set up your profile first.');
      return;
    }
    if (!leaveDate) return;
    try {
      await api.post(`/doctors/${activeDoctor.id}/leave`, { date: leaveDate });
      alert(`Leave date ${leaveDate} registered successfully!`);
      setLeaveDate('');
    } catch (err) {
      alert('Failed to register leave date');
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Loading settings profile..." />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Availability Settings form */}
      <form onSubmit={handleUpdateSettings} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <Settings className="h-5 w-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white font-display">Availability Settings</h3>
        </div>

        {!activeDoctor && (
          <div className="bg-amber-950/20 border border-amber-500/20 text-amber-400 text-xs p-3 rounded-xl">
            ⚠️ No active doctor profile found in database matching your email ({user?.email}). Configuration changes are disabled.
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Working Hours (HH:MM-HH:MM)</label>
              <input
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={!activeDoctor}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Lunch Break (HH:MM-HH:MM)</label>
              <input
                type="text"
                value={lunchBreak}
                onChange={(e) => setLunchBreak(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={!activeDoctor}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1.5 font-medium">Maximum Daily Bookings</label>
            <input
              type="number"
              value={maxDailyBookings}
              onChange={(e) => setMaxDailyBookings(parseInt(e.target.value) || 12)}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={!activeDoctor}
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!activeDoctor}
          >
            Save Working Hours
          </button>
        </div>
      </form>

      {/* Leaves Register form */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <CalendarDays className="h-5 w-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white font-display">Apply Leave Absence</h3>
        </div>

        <form onSubmit={handleAddLeave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1.5 font-medium">Select Absence Date</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                className="flex-1 py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                required
                disabled={!activeDoctor}
              />
              <button
                type="submit"
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!activeDoctor}
              >
                <Plus className="h-4 w-4" /> Apply Leave
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorSettings;
