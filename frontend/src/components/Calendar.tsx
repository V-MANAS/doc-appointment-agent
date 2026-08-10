import React from 'react';
import { Calendar as CalendarIcon, User } from 'lucide-react';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  whatsappNumber: string;
  date: string;
  time: string;
  paymentMethod: 'STRIPE' | 'CASH';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  status: 'CONFIRMED' | 'CANCELLED';
  patient?: { name: string };
  doctor?: { name: string };
}

interface CalendarProps {
  appointments: Appointment[];
  selectedDoctorId: string;
  doctors?: { id: string; name: string }[];
  onDoctorChange?: (id: string) => void;
  onCancelAppointment?: (id: string) => void;
  showDoctorSelect?: boolean;
}

export const Calendar: React.FC<CalendarProps> = ({
  appointments,
  selectedDoctorId,
  doctors = [],
  onDoctorChange,
  onCancelAppointment,
  showDoctorSelect = true,
}) => {
  const timeSlots = [
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  // Helper: Get next 7 days dates starting today
  const next7Days = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx);
    return d;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-900/40 text-indigo-400 rounded-lg">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Clinic Work Schedule</h3>
            <p className="text-xs text-slate-500">Weekly hourly booking slots mapping</p>
          </div>
        </div>

        {showDoctorSelect && doctors.length > 0 && onDoctorChange && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" />
            <select
              value={selectedDoctorId}
              onChange={(e) => onDoctorChange(e.target.value)}
              className="py-1.5 px-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px] border border-slate-800 rounded-xl overflow-hidden text-xs">
          {/* Header Row */}
          <div className="grid grid-cols-8 bg-slate-950 p-3 border-b border-slate-800 text-slate-400 font-bold text-center">
            <div className="text-left pl-2">Time Slot</div>
            {next7Days.map((date, idx) => (
              <div key={idx} className="capitalize">
                {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            ))}
          </div>

          {/* Grid Slots */}
          <div className="divide-y divide-slate-800/40">
            {timeSlots.map((timeSlot) => (
              <div key={timeSlot} className="grid grid-cols-8 hover:bg-slate-800/10 transition-colors">
                {/* Time Indicator */}
                <div className="bg-slate-950/30 p-3 text-left border-r border-slate-800/50 text-slate-500 font-mono font-semibold">
                  {timeSlot}
                </div>

                {/* Day Slot Cells */}
                {next7Days.map((date, dIdx) => {
                  const targetDateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

                  // Find appt matches for this doctor, date, and slot
                  const appt = appointments.find(
                    (a) => a.doctorId === selectedDoctorId && a.date === targetDateStr && a.time === timeSlot && a.status === 'CONFIRMED'
                  );

                  return (
                    <div key={dIdx} className="p-2 border-r border-slate-800/40 min-h-[56px] flex items-center justify-center">
                      {appt ? (
                        <div className="w-full p-2 bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 rounded-lg text-[10px] space-y-1 relative group shadow-md shadow-slate-950/40">
                          <p className="font-bold truncate text-slate-200">{appt.patient?.name || 'Registered Patient'}</p>
                          <div className="flex justify-between items-center text-[8px] text-slate-500 mt-1 font-mono">
                            <span className="capitalize">{appt.paymentStatus.toLowerCase()}</span>
                            {onCancelAppointment && (
                              <button
                                onClick={() => onCancelAppointment(appt.id)}
                                className="text-rose-400 hover:text-rose-300 font-sans font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Cancel booking"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-700 font-semibold">-</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
