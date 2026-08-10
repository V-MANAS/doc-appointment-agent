import React, { useState, useEffect } from 'react';
import api from '../services/api';
import logger from '../utils/logger';
import LoadingSpinner from '../components/LoadingSpinner';
import { Settings, Plus, ShieldAlert } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  // Form states
  const [workingHours, setWorkingHours] = useState('10:00-18:00');
  const [lunchBreak, setLunchBreak] = useState('13:00-14:00');
  const [maxDailyBookings, setMaxDailyBookings] = useState(12);
  const [leaveDate, setLeaveDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [blockedDate, setBlockedDate] = useState('');
  const [blockedTime, setBlockedTime] = useState('10:00');

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/doctors');
      setDoctors(response.data.doctors || []);
      if (response.data.doctors.length > 0) {
        const firstDoc = response.data.doctors[0];
        setSelectedDoctorId(firstDoc.id);
        setWorkingHours(firstDoc.workingHours);
        setLunchBreak(firstDoc.lunchBreak);
        setMaxDailyBookings(firstDoc.maxDailyBookings);
      }
    } catch (err) {
      logger.error('Error loading doctor profiles for settings:', String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleUpdateDoctorSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) return;
    try {
      await api.put(`/doctors/${selectedDoctorId}/settings`, {
        workingHours,
        lunchBreak,
        maxDailyBookings
      });
      alert('Doctor working hours configuration updated successfully!');
    } catch (err) {
      alert('Failed to update doctor working configurations');
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !leaveDate) return;
    try {
      await api.post(`/doctors/${selectedDoctorId}/leave`, { date: leaveDate });
      alert(`Absence date ${leaveDate} registered successfully!`);
      setLeaveDate('');
    } catch (err) {
      alert('Failed to add leave date');
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName) return;
    try {
      await api.post('/doctors/holidays', { holiday: holidayName });
      alert(`Holiday registered: ${holidayName}`);
      setHolidayName('');
    } catch (err) {
      alert('Failed to register clinic holiday');
    }
  };

  const handleBlockSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !blockedDate || !blockedTime) return;
    try {
      await api.post(`/doctors/${selectedDoctorId}/block`, { date: blockedDate, time: blockedTime });
      alert(`Emergency Slot block registered at ${blockedDate} ${blockedTime}!`);
      setBlockedDate('');
    } catch (err) {
      alert('Failed to block schedule slot');
    }
  };

  if (isLoading || doctors.length === 0) {
    return <LoadingSpinner label="Loading settings workspace..." />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. Working Hours Config */}
      <form onSubmit={handleUpdateDoctorSettings} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <Settings className="h-5 w-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white font-display">Configure Doctor Profiles</h3>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1.5 font-medium">Select Doctor</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => {
                const docId = e.target.value;
                setSelectedDoctorId(docId);
                const doc = doctors.find(d => d.id === docId);
                if (doc) {
                  setWorkingHours(doc.workingHours);
                  setLunchBreak(doc.lunchBreak);
                  setMaxDailyBookings(doc.maxDailyBookings);
                }
              }}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none"
            >
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Working Hours (HH:MM-HH:MM)</label>
              <input
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Lunch Break (HH:MM-HH:MM)</label>
              <input
                type="text"
                value={lunchBreak}
                onChange={(e) => setLunchBreak(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1.5 font-medium">Maximum Daily Bookings Cap</label>
            <input
              type="number"
              value={maxDailyBookings}
              onChange={(e) => setMaxDailyBookings(parseInt(e.target.value) || 12)}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-md shadow-indigo-500/10"
          >
            Save Configuration
          </button>
        </div>
      </form>

      {/* 2. Leaves and Blockings */}
      <div className="space-y-6">
        {/* Leaves */}
        <form onSubmit={handleAddLeave} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Register Doctor Leave</h4>
          <div className="flex gap-2 text-xs">
            <input
              type="date"
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              className="flex-1 py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
              required
            />
            <button
              type="submit"
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1 shrink-0 text-xs"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </form>

        {/* Holidays */}
        <form onSubmit={handleAddHoliday} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add Clinic Holiday</h4>
          <div className="flex gap-2 text-xs">
            <input
              type="text"
              placeholder="e.g. Sunday or 2026-07-25"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              className="flex-1 py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
              required
            />
            <button
              type="submit"
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1 shrink-0 text-xs"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </form>

        {/* Emergency Slot Blocking */}
        <form onSubmit={handleBlockSlot} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            Block Emergency Slot
          </h4>
          <div className="flex gap-2 text-xs">
            <input
              type="date"
              value={blockedDate}
              onChange={(e) => setBlockedDate(e.target.value)}
              className="flex-1 py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
              required
            />
            <input
              type="text"
              placeholder="e.g. 10:30"
              value={blockedTime}
              onChange={(e) => setBlockedTime(e.target.value)}
              className="w-20 py-2 px-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-center"
              required
            />
            <button
              type="submit"
              className="py-2 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold transition-all shadow-md shadow-rose-500/10 flex items-center gap-1 shrink-0 text-xs"
            >
              Block Slot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
