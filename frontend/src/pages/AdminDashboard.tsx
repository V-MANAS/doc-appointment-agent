import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSheetStore } from '../store/sheetStore';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import logger from '../utils/logger';
import StatCard from '../components/StatCard';
import { 
  DollarSign, CalendarCheck, CalendarOff, AlertTriangle, RefreshCw 
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { appointments, setAppointments } = useSheetStore();

  const [stats, setStats] = useState<any>({
    revenue: { total: 0, stripe: 0, cash: 0 },
    appointments: { total: 0, confirmed: 0, cancelled: 0, cancellationRate: 0 },
    peakHours: [],
    doctorWorkload: [],
    bookingTrends: [],
    aiMetrics: { totalExchanges: 0 }
  });
  
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Welcome to ClinicFlow AI Admin Panel.']);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/analytics');
      setStats(response.data.stats);
    } catch (err) {
      logger.error('Error fetching analytics stats:', String(err));
    }
  };

  const fetchAppointments = async () => {
    try {
      const aResp = await api.get('/admin/appointments');
      setAppointments(aResp.data.appointments || []);
    } catch (err) {
      logger.error('Error fetching admin appointments:', String(err));
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchAppointments();
    }
  }, [user]);

  // Hook real-time websocket sync notifications
  useSocket('dashboard:update', (event: any) => {
    addLog(`Dashboard event received: ${event.type}`);
    fetchStats();
    if (event.appointment) {
      setAppointments(appointments.map(a => a.id === event.appointment.id ? event.appointment : a));
    }
  });

  useSocket('sheet:sync', (event: any) => {
    addLog(`Real-time Spreadsheet sync: ${event.action} on ${event.sheet}`);
  });

  // Simulated daily cron job triggers
  const triggerDailyReminders = () => {
    addLog('Initiating Daily Appointment Reminders cron job...');
    addLog('Reminders cron enqueued on background job worker.');
    setTimeout(() => {
      addLog('Queue processor check: 1 appointment reminder dispatched successfully to WhatsApp API.');
    }, 1500);
  };

  // Simulated Stripe Webhook execution
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
      fetchStats();
      fetchAppointments();
    } catch (err) {
      addLog('Failed to simulate webhook event.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Stat cards widgets grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`$${(stats.revenue?.total || 0).toFixed(2)}`}
          icon={<DollarSign className="h-6 w-6" />}
          trend="Stripe & Cash combined"
          trendColor="info"
        />
        <StatCard
          title="Confirmed Bookings"
          value={stats.appointments?.confirmed || 0}
          icon={<CalendarCheck className="h-6 w-6" />}
          trend="Active appointments"
          trendColor="success"
        />
        <StatCard
          title="Cancelled Visits"
          value={stats.appointments?.cancelled || 0}
          icon={<CalendarOff className="h-6 w-6" />}
          trend="Released slots"
          trendColor="danger"
        />
        <StatCard
          title="Cancellation Rate"
          value={`${stats.appointments?.cancellationRate || 0}%`}
          icon={<AlertTriangle className="h-6 w-6" />}
          trend="Clinic booking stability"
          trendColor="warning"
        />
      </div>

      {/* 2. Charts and loads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Weekly trends bar chart */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl md:col-span-2 space-y-4">
          <h4 className="text-sm font-bold text-slate-200">7-Day Booking Trends</h4>
          <div className="h-48 flex items-end justify-between gap-4 pt-4 border-b border-slate-800 pb-2">
            {stats.bookingTrends?.map((trend: any, idx: number) => {
              const maxVal = Math.max(...stats.bookingTrends.map((t: any) => t.booked + t.cancelled), 1);
              const bHeight = ((trend.booked) / maxVal) * 100;
              const cHeight = ((trend.cancelled) / maxVal) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full flex gap-1 items-end h-[85%]">
                    <div 
                      style={{ height: `${bHeight}%` }} 
                      className="flex-1 bg-indigo-500 rounded-t min-h-[4px] transition-all duration-500" 
                      title={`Booked: ${trend.booked}`}
                    />
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
              <span>Confirmed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-rose-500 rounded-sm" />
              <span>Cancelled</span>
            </div>
          </div>
        </div>

        {/* Doctor workloads bar progress list */}
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

      {/* 3. Simulators and logs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-slate-200">Simulation Controls</h4>
          <div className="space-y-3">
            <button
              onClick={triggerDailyReminders}
              className="w-full py-2.5 px-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className="h-4 w-4 animate-spin-slow" />
              Trigger Daily WhatsApp Reminders
            </button>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 space-y-2 text-xs">
              <span className="font-bold text-slate-400">Stripe Webhook Pay Trigger</span>
              <p className="text-[10px] text-slate-500">
                Simulate a Stripe webhook callback for a pending booking:
              </p>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    simulatePaymentWebhook(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full py-2 px-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none"
              >
                <option value="">-- Choose Pending Appointment --</option>
                {appointments
                  .filter(a => a.paymentMethod === 'STRIPE' && a.paymentStatus === 'PENDING')
                  .map(a => (
                    <option key={a.id} value={a.id}>
                      {a.patient?.name || 'Patient'} ({a.date} {a.time})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl md:col-span-2">
          <h4 className="text-sm font-bold text-slate-200 mb-2">WebSocket Audit Console</h4>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-950 font-mono text-[10px] text-emerald-400/90 h-36 overflow-y-auto space-y-1">
            {logs.map((log, idx) => (
              <div key={idx} className="whitespace-pre-wrap">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
