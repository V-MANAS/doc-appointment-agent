import React, { useState, useEffect } from 'react';
import { useSheetStore } from '../store/sheetStore';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import logger from '../utils/logger';
import { FileSpreadsheet } from 'lucide-react';

export const AdminSheets: React.FC = () => {
  const { 
    patients, appointments, configs, flashingRows, 
    setPatients, setAppointments, setConfigs, handleSyncEvent 
  } = useSheetStore();

  const [activeSheet, setActiveSheet] = useState<'appointments' | 'patients' | 'config'>('appointments');
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [configsError, setConfigsError] = useState<string | null>(null);
  const [isPatientsLoading, setIsPatientsLoading] = useState(false);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(false);
  const [isConfigsLoading, setIsConfigsLoading] = useState(false);

  const fetchPatients = async () => {
    setIsPatientsLoading(true);
    setPatientsError(null);
    try {
      const response = await api.get('/admin/patients');
      setPatients(response.data.patients || []);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to fetch patients database table';
      setPatientsError(errMsg);
      logger.error('Error fetching admin patients:', String(err));
    } finally {
      setIsPatientsLoading(false);
    }
  };

  const fetchAppointments = async () => {
    setIsAppointmentsLoading(true);
    setAppointmentsError(null);
    try {
      const response = await api.get('/admin/appointments');
      setAppointments(response.data.appointments || []);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to fetch appointments database table';
      setAppointmentsError(errMsg);
      logger.error('Error fetching admin appointments:', String(err));
    } finally {
      setIsAppointmentsLoading(false);
    }
  };

  const fetchConfigs = async () => {
    setIsConfigsLoading(true);
    setConfigsError(null);
    try {
      const response = await api.get('/admin/config');
      setConfigs(response.data.configs || []);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to fetch configurations database table';
      setConfigsError(errMsg);
      logger.error('Error fetching admin configs:', String(err));
    } finally {
      setIsConfigsLoading(false);
    }
  };

  const fetchSheetsData = () => {
    fetchPatients();
    fetchAppointments();
    fetchConfigs();
  };

  useEffect(() => {
    fetchSheetsData();
  }, []);

  // Hook real-time websocket sync notifications
  useSocket('sheet:sync', (event: any) => {
    handleSyncEvent(event.sheet, event.action, event.data);
  });

  return (
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
        <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold text-slate-400 mb-4">
          <button
            onClick={() => setActiveSheet('appointments')}
            className={`pb-2 px-1 transition-all ${
              activeSheet === 'appointments' ? 'border-b-2 border-indigo-500 text-white font-bold' : 'hover:text-slate-200'
            }`}
          >
            Appointments Sheet
          </button>
          <button
            onClick={() => setActiveSheet('patients')}
            className={`pb-2 px-1 transition-all ${
              activeSheet === 'patients' ? 'border-b-2 border-indigo-500 text-white font-bold' : 'hover:text-slate-200'
            }`}
          >
            Patients Sheet
          </button>
          <button
            onClick={() => setActiveSheet('config')}
            className={`pb-2 px-1 transition-all ${
              activeSheet === 'config' ? 'border-b-2 border-indigo-500 text-white font-bold' : 'hover:text-slate-200'
            }`}
          >
            Config Sheet
          </button>
        </div>

        {/* Displaying Errors */}
        {activeSheet === 'appointments' && appointmentsError && (
          <div className="bg-red-950/30 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl">
            {appointmentsError}
          </div>
        )}
        {activeSheet === 'patients' && patientsError && (
          <div className="bg-red-950/30 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl">
            {patientsError}
          </div>
        )}
        {activeSheet === 'config' && configsError && (
          <div className="bg-red-950/30 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl">
            {configsError}
          </div>
        )}

        {/* Spreadsheet Grid Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          {activeSheet === 'appointments' && (
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
                {isAppointmentsLoading ? (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">Loading appointments...</td></tr>
                ) : appointments.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">No appointments found.</td></tr>
                ) : appointments.map((a) => {
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
          )}

          {activeSheet === 'patients' && (
            <table className="min-w-full text-xs text-slate-300 divide-y divide-slate-800">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-left">Patient ID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">WhatsApp Number</th>
                  <th className="px-4 py-3 text-left">Age</th>
                  <th className="px-4 py-3 text-left">Gender</th>
                  <th className="px-4 py-3 text-left">Registered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {isPatientsLoading ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading patients...</td></tr>
                ) : patients.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No patients found.</td></tr>
                ) : patients.map((p) => {
                  const flash = flashingRows[p.id];
                  return (
                    <tr 
                      key={p.id} 
                      className={`transition-colors font-mono hover:bg-slate-800/20 ${
                        flash === 'insert' ? 'animate-insert' : flash === 'update' ? 'animate-update' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-200">{p.id.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-slate-200 font-sans">{p.name}</td>
                      <td className="px-4 py-3">{p.whatsappNumber}</td>
                      <td className="px-4 py-3">{p.age}</td>
                      <td className="px-4 py-3">{p.gender}</td>
                      <td className="px-4 py-3 text-slate-500 font-sans">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeSheet === 'config' && (
            <table className="min-w-full text-xs text-slate-300 divide-y divide-slate-800">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-left">Config Key</th>
                  <th className="px-4 py-3 text-left">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {isConfigsLoading ? (
                  <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-500">Loading configurations...</td></tr>
                ) : configs.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-500">No configs found.</td></tr>
                ) : configs.map((c) => {
                  const flash = flashingRows[c.key];
                  return (
                    <tr 
                      key={c.key} 
                      className={`transition-colors font-mono hover:bg-slate-800/20 ${
                        flash === 'insert' ? 'animate-insert' : flash === 'update' ? 'animate-update' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-200">{c.key}</td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-[400px]" title={c.value}>{c.value}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSheets;
