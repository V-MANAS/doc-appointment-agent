import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSheetStore } from '../store/sheetStore';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import logger from '../utils/logger';
import { 
  LayoutDashboard, Calendar, FileSpreadsheet, Settings, LogOut, DollarSign, 
  CalendarCheck, CalendarOff, AlertTriangle, RefreshCw, Plus, Trash2, ShieldAlert
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { 
    patients, appointments, configs, flashingRows, 
    setPatients, setAppointments, setConfigs, handleSyncEvent 
  } = useSheetStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'sheets' | 'settings'>('dashboard');
  const [stats, setStats] = useState<any>({
    revenue: { total: 0, stripe: 0, cash: 0 },
    appointments: { total: 0, confirmed: 0, cancelled: 0, cancellationRate: 0 },
    peakHours: [],
    doctorWorkload: [],
    bookingTrends: [],
    aiMetrics: { totalExchanges: 0 }
  });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  
  // Settings Form States
  const [workingHours, setWorkingHours] = useState('10:00-18:00');
  const [lunchBreak, setLunchBreak] = useState('13:00-14:00');
  const [maxDailyBookings, setMaxDailyBookings] = useState(12);
  const [leaveDate, setLeaveDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [blockedDate, setBlockedDate] = useState('');
  const [blockedTime, setBlockedTime] = useState('10:00');

  // Logs terminal state
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Welcome to ClinicFlow AI Admin Panel.']);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  // Fetch initial dashboard and list datasets
  const fetchStats = async () => {
    try {
      const response = await api.get('/analytics');
      setStats(response.data.stats);
    } catch (err) {
      logger.error('Error fetching analytics stats:', err);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctors');
      setDoctors(response.data.doctors);
      if (response.data.doctors.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(response.data.doctors[0].id);
        setWorkingHours(response.data.doctors[0].workingHours);
        setLunchBreak(response.data.doctors[0].lunchBreak);
        setMaxDailyBookings(response.data.doctors[0].maxDailyBookings);
      }
    } catch (err) {
      logger.error('Error fetching doctors:', err);
    }
  };

  const fetchSheetsData = async () => {
    try {
      const pResp = await api.get('/patients');
      setPatients(pResp.data.patients || []);

      const aResp = await api.get('/appointments');
      setAppointments(aResp.data.appointments || []);

      // Configs are loaded implicitly or we can mock them based on DB seed configs
      // Let's seed some custom config rows
      setConfigs([
        { key: 'clinic_holidays', value: JSON.stringify(['Saturday', 'Sunday']) }
      ]);
    } catch (err) {
      logger.error('Error fetching sheets simulator database tables:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchDoctors();
      fetchSheetsData();
    }
  }, [user]);

  // Hook real-time websocket sync notifications
  useSocket('dashboard:update', (event: any) => {
    addLog(`Dashboard event received: ${event.type}`);
    fetchStats();
    fetchDoctors();
    
    // Invalidate calendar and table sheets
    if (event.appointment) {
      setAppointments(appointments.map(a => a.id === event.appointment.id ? event.appointment : a));
    }
  });

  useSocket('sheet:sync', (event: any) => {
    addLog(`Real-time Spreadsheet sync: ${event.action} on ${event.sheet}`);
    handleSyncEvent(event.sheet, event.action, event.data);
  });

  // Simulated daily cron job triggers
  const triggerDailyReminders = async () => {
    addLog('Initiating Daily Appointment Reminders cron job...');
    try {
      // Simulate BullMQ enqueuing on backend
      addLog('Reminders cron enqueued on background job worker.');
      setTimeout(() => {
        addLog('Queue processor check: 1 appointment reminder dispatched successfully to WhatsApp API.');
      }, 1500);
    } catch (err) {
      logger.error(String(err));
    }
  };

  // Simulated Stripe Webhook execution for pending CASH/STRIPE payments
  const simulatePaymentWebhook = async (apptId: string) => {
    addLog(`Manually firing payment succeeded webhook for appointment: ${apptId}`);
    try {
      const payload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: `pi_mock_webhook_${Math.random().toString(36).substring(2, 7)}`,
            metadata: { appointmentId: apptId }
          }
        }
      };
      await api.post('/payments/webhook', payload);
      addLog('Payment succeeds webhook registered by server. Status flipped.');
    } catch (err) {
      addLog('Failed to simulate webhook event.');
    }
  };

  // Settings Actions
  const handleUpdateDoctorSettings = async () => {
    if (!selectedDoctorId) return;
    try {
      await api.put(`/doctors/${selectedDoctorId}/settings`, {
        workingHours,
        lunchBreak,
        maxDailyBookings
      });
      addLog('Doctor working configuration updated.');
      alert('Settings updated successfully!');
    } catch (err) {
      alert('Failed to update settings');
    }
  };

  const handleAddLeave = async () => {
    if (!selectedDoctorId || !leaveDate) return;
    try {
      await api.post(`/doctors/${selectedDoctorId}/leave`, { date: leaveDate });
      addLog(`Added leave date ${leaveDate} for Doctor`);
      setLeaveDate('');
      alert('Leave added successfully!');
    } catch (err) {
      alert('Failed to add leave');
    }
  };

  const handleAddHoliday = async () => {
    if (!holidayName) return;
    try {
      await api.post('/doctors/holidays', { holiday: holidayName });
      addLog(`Registered holiday: ${holidayName}`);
      setHolidayName('');
      alert('Holiday registered!');
    } catch (err) {
      alert('Failed to add holiday');
    }
  };

  const handleBlockSlot = async () => {
    if (!selectedDoctorId || !blockedDate || !blockedTime) return;
    try {
      await api.post(`/doctors/${selectedDoctorId}/block`, { date: blockedDate, time: blockedTime });
      addLog(`Blocked slot at ${blockedDate} ${blockedTime}`);
      setBlockedDate('');
      alert('Slot blocked!');
    } catch (err) {
      alert('Failed to block slot');
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.put(`/appointments/${id}/cancel`);
      addLog(`Cancelled appointment ID: ${id}`);
    } catch (err) {
      alert('Failed to cancel appointment');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row relative">
      {/* 1. SIDE NAVIGATION BAR */}
      <div className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800/80 p-5 flex flex-col justify-between z-10 shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
              <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent">
                ClinicFlow AI
              </span>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Admin Workspace</p>
            </div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              Dashboard Analytics
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all ${
                activeTab === 'calendar'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="h-4.5 w-4.5" />
              Weekly Schedule
            </button>
            <button
              onClick={() => setActiveTab('sheets')}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all ${
                activeTab === 'sheets'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FileSpreadsheet className="h-4.5 w-4.5" />
              Google Sheets Live
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Settings className="h-4.5 w-4.5" />
              Clinic Settings
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-300 truncate">{user?.name}</p>
            <p className="text-[9px] text-slate-500 font-mono capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-950/40 rounded-lg transition-all"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT VIEW */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 z-10">

        {/* ============================================================ */}
        {/* TAB 1: ANALYTICS DASHBOARD */}
        {/* ============================================================ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top row widget cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-semibold mb-1">Total Revenue</p>
                  <h3 className="text-2xl font-bold text-white">${stats.revenue?.total?.toFixed(2)}</h3>
                </div>
                <div className="bg-indigo-900/40 p-3 rounded-xl text-indigo-400">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
              
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-semibold mb-1">Confirmed Appointments</p>
                  <h3 className="text-2xl font-bold text-emerald-400">{stats.appointments?.confirmed}</h3>
                </div>
                <div className="bg-emerald-900/40 p-3 rounded-xl text-emerald-400">
                  <CalendarCheck className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-semibold mb-1">Cancelled Bookings</p>
                  <h3 className="text-2xl font-bold text-rose-400">{stats.appointments?.cancelled}</h3>
                </div>
                <div className="bg-rose-900/40 p-3 rounded-xl text-rose-400">
                  <CalendarOff className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-semibold mb-1">Cancellation Rate</p>
                  <h3 className="text-2xl font-bold text-amber-400">{stats.appointments?.cancellationRate}%</h3>
                </div>
                <div className="bg-amber-900/40 p-3 rounded-xl text-amber-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Graphs & Workload */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Daily Booking Trend (SVG Bar graph) */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl md:col-span-2">
                <h4 className="text-sm font-bold text-slate-200 mb-4">7-Day Booking Trends</h4>
                <div className="h-48 flex items-end justify-between gap-4 pt-4 border-b border-slate-800 pb-2">
                  {stats.bookingTrends?.map((trend: any, idx: number) => {
                    const maxVal = Math.max(...stats.bookingTrends.map((t: any) => t.booked + t.cancelled), 1);
                    const bHeight = ((trend.booked) / maxVal) * 100;
                    const cHeight = ((trend.cancelled) / maxVal) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <div className="w-full flex gap-1 items-end h-[85%]">
                          {/* Booked bar */}
                          <div 
                            style={{ height: `${bHeight}%` }} 
                            className="flex-1 bg-indigo-500 rounded-t min-h-[4px] transition-all duration-500" 
                            title={`Booked: ${trend.booked}`}
                          />
                          {/* Cancelled bar */}
                          <div 
                            style={{ height: `${cHeight}%` }} 
                            className="flex-1 bg-rose-500 rounded-t min-h-[4px] transition-all duration-500" 
                            title={`Cancelled: ${trend.cancelled}`}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 truncate w-full text-center">
                          {trend.date.split('-').slice(1).join('/')}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-slate-400 justify-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-sm" />
                    <span>Confirmed Bookings</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-rose-500 rounded-sm" />
                    <span>Cancelled Bookings</span>
                  </div>
                </div>
              </div>

              {/* Doctor Workload & AI usage summary */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-200">Doctor Workloads</h4>
                  <div className="space-y-3">
                    {stats.doctorWorkload?.map((w: any, idx: number) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-semibold">{w.name}</span>
                          <span className="text-slate-400">{w.activeBookings} active</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div 
                            className="bg-indigo-500 h-full rounded-full" 
                            style={{ width: `${Math.min((w.activeBookings / 12) * 100, 100)}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Conversation Telemetry</h4>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Total Chat Turns</span>
                    <span className="text-indigo-400 font-bold">{stats.aiMetrics?.totalExchanges || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulation controls terminal logs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Simulations */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <h4 className="text-sm font-bold text-slate-200 mb-4">Simulation Sandbox</h4>
                <div className="space-y-3">
                  <button
                    onClick={triggerDailyReminders}
                    className="w-full py-2.5 px-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Trigger Daily WhatsApp Reminders Cron
                  </button>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 space-y-2">
                    <span className="text-xs font-bold text-slate-400">Quick Webhook Pay</span>
                    <p className="text-[10px] text-slate-500">
                      Simulate a Stripe success callback for a pending appointment:
                    </p>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          simulatePaymentWebhook(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="">-- Choose Pending Appointment --</option>
                      {appointments
                        .filter(a => a.paymentMethod === 'STRIPE' && a.paymentStatus === 'PENDING')
                        .map(a => (
                          <option key={a.id} value={a.id}>
                            {a.patient?.name} ({a.date} {a.time})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Logs Console terminal */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl md:col-span-2">
                <h4 className="text-sm font-bold text-slate-200 mb-2">WebSocket & Queue Auditing Logs</h4>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-950 font-mono text-[10px] text-emerald-400/90 h-36 overflow-y-auto space-y-1">
                  {logs.map((log, idx) => (
                    <div key={idx} className="whitespace-pre-wrap">{log}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: WEEKLY SCHEDULE CALENDAR VIEW */}
        {/* ============================================================ */}
        {activeTab === 'calendar' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Clinic Schedule Grid</h3>
                <p className="text-xs text-slate-500">Appointments view for {doctors.find(d => d.id === selectedDoctorId)?.name}</p>
              </div>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300"
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Custom Grid Calendar Schedule */}
            <div className="overflow-x-auto">
              <div className="min-w-[800px] border border-slate-800 rounded-xl overflow-hidden text-xs">
                {/* Headers */}
                <div className="grid grid-cols-8 bg-slate-950 p-3 border-b border-slate-800 text-slate-400 font-bold text-center">
                  <div>Time Slot</div>
                  {/* Past 7 days listing */}
                  {Array.from({ length: 7 }).map((_, idx) => {
                    const d = new Date();
                    d.setDate(d.getDate() + idx);
                    return (
                      <div key={idx} className="capitalize">
                        {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    );
                  })}
                </div>

                {/* Slots */}
                {['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'].map((timeSlot) => (
                  <div key={timeSlot} className="grid grid-cols-8 border-b border-slate-800/50 hover:bg-slate-800/10 transition-colors">
                    <div className="bg-slate-950/40 p-3 text-center border-r border-slate-800/50 text-slate-500 font-mono font-semibold">
                      {timeSlot}
                    </div>
                    {Array.from({ length: 7 }).map((_, dIdx) => {
                      const targetDate = new Date();
                      targetDate.setDate(targetDate.getDate() + dIdx);
                      const targetDateStr = targetDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

                      const appt = appointments.find(
                        (a) => a.doctorId === selectedDoctorId && a.date === targetDateStr && a.time === timeSlot && a.status === 'CONFIRMED'
                      );

                      return (
                        <div key={dIdx} className="p-2 border-r border-slate-800/40 min-h-[48px] flex items-center justify-center">
                          {appt ? (
                            <div className="w-full p-2 bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 rounded-lg text-[10px] space-y-1 relative group">
                              <p className="font-bold truncate">{appt.patient?.name}</p>
                              <div className="flex justify-between items-center text-[8px] text-slate-500">
                                <span>{appt.paymentStatus}</span>
                                <button
                                  onClick={() => handleCancelAppointment(appt.id)}
                                  className="text-rose-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Cancel Appointment"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-700">-</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: LIVE GOOGLE SHEETS SIMULATOR */}
        {/* ============================================================ */}
        {activeTab === 'sheets' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                Google Sheets Database Simulator
              </h3>
              <p className="text-xs text-slate-500">
                Live representation of database tables. Row changes flash in real-time from server WebSockets triggers.
              </p>
            </div>

            {/* TAB SECTION */}
            <div className="space-y-4">
              <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold text-slate-400">
                <span className="border-b-2 border-indigo-500 text-white pb-2 px-1">Appointments Sheet</span>
                <span className="pb-2 px-1 text-slate-500 cursor-not-allowed">Patients Sheet</span>
                <span className="pb-2 px-1 text-slate-500 cursor-not-allowed">Config Sheet</span>
              </div>

              {/* Spreadsheet Grid Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="min-w-full text-xs text-slate-300 divide-y divide-slate-800">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3 text-left">Appointment ID</th>
                      <th className="px-4 py-3 text-left">Patient ID</th>
                      <th className="px-4 py-3 text-left">WhatsApp Number</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Time</th>
                      <th className="px-4 py-3 text-left">Payment Method</th>
                      <th className="px-4 py-3 text-left">Payment Status</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {appointments.map((a) => {
                      const flash = flashingRows[a.id];
                      return (
                        <tr 
                          key={a.id} 
                          className={`transition-colors font-mono hover:bg-slate-800/20 ${
                            flash === 'insert' ? 'animate-insert' : flash === 'update' ? 'animate-update' : ''
                          }`}
                        >
                          <td className="px-4 py-3 font-semibold text-slate-200">{a.id.slice(0, 8)}...</td>
                          <td className="px-4 py-3 text-slate-400">{a.patientId.slice(0, 8)}...</td>
                          <td className="px-4 py-3">{a.whatsappNumber}</td>
                          <td className="px-4 py-3 font-semibold">{a.date}</td>
                          <td className="px-4 py-3 font-semibold">{a.time}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              a.paymentMethod === 'STRIPE' ? 'bg-indigo-950 border border-indigo-500/20 text-indigo-400' : 'bg-slate-950 border border-slate-800 text-slate-400'
                            }`}>
                              {a.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              a.paymentStatus === 'PAID' ? 'bg-emerald-950 text-emerald-400' : a.paymentStatus === 'REFUNDED' ? 'bg-rose-950 text-rose-400' : 'bg-slate-950 text-slate-500'
                            }`}>
                              {a.paymentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              a.status === 'CONFIRMED' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: CLINIC CONFIGURATION SETTINGS */}
        {/* ============================================================ */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Working Hours Settings */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Doctor Slot Configs</h3>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Target Doctor Profile</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
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
                  onClick={handleUpdateDoctorSettings}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-md shadow-indigo-500/10"
                >
                  Save Configuration
                </button>
              </div>
            </div>

            {/* Block Slots leaves and holidays configs */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Leaves & Slot Blockings</h3>
              <div className="space-y-4 text-xs">
                {/* Add doctor leave */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 space-y-3">
                  <span className="font-bold text-slate-300">Register Doctor Absence / Leave Date</span>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={leaveDate}
                      onChange={(e) => setLeaveDate(e.target.value)}
                      className="flex-1 py-2 px-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs"
                    />
                    <button
                      onClick={handleAddLeave}
                      className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-1 transition-all"
                    >
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>

                {/* Add clinic holiday */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 space-y-3">
                  <span className="font-bold text-slate-300">Add Clinic Holiday (Date or Weekday)</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Sunday or 2026-07-25"
                      value={holidayName}
                      onChange={(e) => setHolidayName(e.target.value)}
                      className="flex-1 py-2 px-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs"
                    />
                    <button
                      onClick={handleAddHoliday}
                      className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-1 transition-all"
                    >
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>

                {/* Block specific slots */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 space-y-3">
                  <span className="font-bold text-slate-300">Force Block Specific Slot (Emergency)</span>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={blockedDate}
                      onChange={(e) => setBlockedDate(e.target.value)}
                      className="flex-1 py-2 px-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="e.g. 10:30"
                      value={blockedTime}
                      onChange={(e) => setBlockedTime(e.target.value)}
                      className="w-20 py-2 px-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-center text-xs"
                    />
                    <button
                      onClick={handleBlockSlot}
                      className="py-2 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold flex items-center gap-1 transition-all"
                    >
                      <ShieldAlert className="h-4 w-4" /> Block
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
export default AdminDashboard;
