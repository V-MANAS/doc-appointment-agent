import React from 'react';
import { Appointment } from './Calendar';
import { CreditCard, Ban, Check } from 'lucide-react';

interface AppointmentTableProps {
  appointments: Appointment[];
  showDoctorName?: boolean;
  showCancelAction?: boolean;
  onCancel?: (id: string) => void;
  showCompleteAction?: boolean;
  onComplete?: (id: string) => void;
  isLoading?: boolean;
}

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  showDoctorName = true,
  showCancelAction = false,
  onCancel,
  showCompleteAction = false,
  onComplete,
  isLoading = false,
}) => {
  return (
    <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/40">
      <table className="min-w-full text-xs text-slate-300 divide-y divide-slate-800">
        <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
          <tr>
            <th className="px-4 py-3 text-left">Appt ID</th>
            <th className="px-4 py-3 text-left">Patient Name</th>
            {showDoctorName && <th className="px-4 py-3 text-left">Doctor</th>}
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Time</th>
            <th className="px-4 py-3 text-left">Method</th>
            <th className="px-4 py-3 text-left">Payment</th>
            <th className="px-4 py-3 text-left">Status</th>
            {(showCancelAction || showCompleteAction) && <th className="px-4 py-3 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono">
          {isLoading ? (
            <tr>
              <td colSpan={showDoctorName ? 9 : 8} className="px-4 py-8 text-center text-slate-500 font-sans">
                Loading appointments list...
              </td>
            </tr>
          ) : appointments.length === 0 ? (
            <tr>
              <td colSpan={showDoctorName ? 9 : 8} className="px-4 py-8 text-center text-slate-500 font-sans">
                No appointments found.
              </td>
            </tr>
          ) : (
            appointments.map((a) => (
              <tr key={a.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-200">{a.id.slice(0, 8)}...</td>
                <td className="px-4 py-3 font-sans text-slate-200">{a.patient?.name || 'N/A'}</td>
                {showDoctorName && <td className="px-4 py-3 font-sans text-slate-400">{a.doctor?.name || 'N/A'}</td>}
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
                {(showCancelAction || showCompleteAction) && (
                  <td className="px-4 py-3 text-center font-sans">
                    <div className="flex justify-center items-center gap-2">
                      {showCompleteAction && a.status === 'CONFIRMED' && onComplete && (
                        <button
                          onClick={() => onComplete(a.id)}
                          className="p-1 text-emerald-400 hover:bg-emerald-950/40 rounded border border-emerald-500/20 transition-all"
                          title="Mark as Completed"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {showCancelAction && a.status === 'CONFIRMED' && onCancel && (
                        <button
                          onClick={() => onCancel(a.id)}
                          className="p-1 text-rose-400 hover:bg-rose-950/40 rounded border border-rose-500/20 transition-all"
                          title="Cancel appointment"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AppointmentTable;
