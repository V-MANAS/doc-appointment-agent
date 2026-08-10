import React, { useState, useEffect } from 'react';
import api from '../services/api';
import logger from '../utils/logger';
import { 
  Clock, Check, Play, AlertCircle, Ban, BookOpen, FileText, History, ClipboardList, Plus, Trash2, Calendar
} from 'lucide-react';

interface Medicine {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  whatsappNumber: string;
  date: string;
  time: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  patient?: any;
}

interface ConsultationCardProps {
  appointment: Appointment;
  onStatusChange: () => void;
}

export const ConsultationCard: React.FC<ConsultationCardProps> = ({ appointment, onStatusChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'prescription' | 'history' | 'timeline'>('details');
  const [isLoading, setIsLoading] = useState(false);

  // Consultation notes state
  const [consultationId, setConsultationId] = useState<string>('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  
  // Prescription states
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [newMed, setNewMed] = useState<Medicine>({
    medicineName: '',
    dosage: '',
    frequency: '1-0-1',
    duration: '5 days',
    instructions: 'After food',
  });

  // Patient History states
  const [pastVisits, setPastVisits] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load Consultation & Prescription
  const fetchConsultation = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/consultation/${appointment.id}`);
      const data = response.data.consultation;
      if (data) {
        setConsultationId(data.id);
        setChiefComplaint(data.chiefComplaint || '');
        setDiagnosis(data.diagnosis || '');
        setDoctorNotes(data.doctorNotes || '');
        setFollowUpDate(data.followUpDate || '');
        setMedicines(data.prescriptions || []);
      }
    } catch (err) {
      logger.error('Error fetching consultation details:', String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Patient History
  const fetchPatientHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await api.get('/admin/appointments');
      const allAppts = response.data.appointments || [];
      
      // Filter completed appointments for this patient (excluding current one)
      const past = allAppts.filter(
        (a: any) => a.patientId === appointment.patientId && a.id !== appointment.id && a.status === 'COMPLETED'
      );

      // Fetch consultations for past appointments
      const enrichedPast = await Promise.all(
        past.map(async (a: any) => {
          try {
            const cResp = await api.get(`/consultation/${a.id}`);
            return {
              ...a,
              consultation: cResp.data.consultation || null
            };
          } catch {
            return { ...a, consultation: null };
          }
        })
      );

      setPastVisits(enrichedPast);
    } catch (err) {
      logger.error('Error loading patient history:', String(err));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchConsultation();
      fetchPatientHistory();
    }
  }, [isExpanded]);

  // Consultation Workflow triggers
  const handleStartConsultation = async () => {
    try {
      await api.post('/consultation/start', { appointmentId: appointment.id });
      onStatusChange();
      setIsExpanded(true);
      setActiveTab('notes');
      alert('Consultation started successfully!');
    } catch (err) {
      alert('Failed to start consultation');
    }
  };

  const handleCompleteConsultation = async () => {
    if (!diagnosis || !chiefComplaint) {
      alert('Please fill in the Chief Complaint and Diagnosis notes before completing the consultation.');
      setActiveTab('notes');
      return;
    }
    if (medicines.length === 0) {
      if (!confirm('No medicines added to the prescription. Complete anyway?')) {
        setActiveTab('prescription');
        return;
      }
    }
    try {
      await api.post('/consultation/complete', { appointmentId: appointment.id });
      onStatusChange();
      alert('Consultation marked as completed successfully!');
    } catch (err) {
      alert('Failed to complete consultation');
    }
  };

  const handleNoShow = async () => {
    if (!confirm('Mark this patient as NO_SHOW?')) return;
    try {
      await api.post('/consultation/no-show', { appointmentId: appointment.id });
      onStatusChange();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.post('/consultation/cancel', { appointmentId: appointment.id });
      onStatusChange();
    } catch (err) {
      alert('Failed to cancel appointment');
    }
  };

  const handleSaveNotes = async () => {
    try {
      await api.post('/consultation/notes', {
        appointmentId: appointment.id,
        chiefComplaint,
        diagnosis,
        doctorNotes,
        followUpDate
      });
      alert('Consultation notes saved successfully!');
      fetchConsultation();
    } catch (err) {
      alert('Failed to save consultation notes');
    }
  };

  const handleAddMedicine = () => {
    if (!newMed.medicineName || !newMed.dosage) {
      alert('Please enter a medicine name and dosage.');
      return;
    }
    setMedicines([...medicines, newMed]);
    setNewMed({
      medicineName: '',
      dosage: '',
      frequency: '1-0-1',
      duration: '5 days',
      instructions: 'After food',
    });
  };

  const handleRemoveMedicine = (idx: number) => {
    setMedicines(medicines.filter((_, i) => i !== idx));
  };

  const handleSavePrescription = async () => {
    if (!consultationId) {
      alert('Please save the consultation notes first before generating a prescription.');
      setActiveTab('notes');
      return;
    }
    try {
      await api.post('/consultation/prescription', {
        consultationId,
        medicines
      });
      alert('Prescription generated successfully!');
      fetchConsultation();
    } catch (err) {
      alert('Failed to save prescription');
    }
  };

  // Status badges color keys
  const statusColors: Record<string, string> = {
    CONFIRMED: 'bg-indigo-950 border border-indigo-500/20 text-indigo-400',
    IN_PROGRESS: 'bg-amber-950 border border-amber-500/20 text-amber-400 animate-pulse',
    COMPLETED: 'bg-emerald-950 border border-emerald-500/20 text-emerald-400',
    NO_SHOW: 'bg-slate-950 border border-slate-800 text-slate-500',
    CANCELLED: 'bg-rose-950 border border-rose-500/20 text-rose-400',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all hover:border-slate-700 shadow-md">
      {/* CARD HEADER */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-800/10 transition-colors"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${statusColors[appointment.status]}`}>
              {appointment.status.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Appt ID: {appointment.id.slice(0, 8)}...</span>
          </div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            {appointment.patient?.name || 'Registered Patient'}
            <span className="text-xs font-normal text-slate-500">
              ({appointment.patient?.gender}, {appointment.patient?.age} yrs)
            </span>
          </h3>
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            Scheduled Slot: <span className="font-semibold text-slate-200">{appointment.date}</span> at <span className="font-semibold text-slate-200">{appointment.time}</span>
          </p>
        </div>

        {/* Outer Actions (Confirmed & In Progress status gates) */}
        <div className="flex gap-2.5 self-stretch md:self-auto justify-end" onClick={(e) => e.stopPropagation()}>
          {appointment.status === 'CONFIRMED' && (
            <>
              <button
                onClick={handleStartConsultation}
                className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow shadow-indigo-500/10"
              >
                <Play className="h-3.5 w-3.5" /> Start Consultation
              </button>
              <button
                onClick={handleNoShow}
                className="py-1.5 px-3 bg-slate-950 hover:bg-slate-850 text-slate-400 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-800 transition-all"
              >
                <AlertCircle className="h-3.5 w-3.5" /> No Show
              </button>
              <button
                onClick={handleCancel}
                className="py-1.5 px-3 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-500/10 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Ban className="h-3.5 w-3.5" /> Cancel
              </button>
            </>
          )}

          {appointment.status === 'IN_PROGRESS' && (
            <button
              onClick={handleCompleteConsultation}
              className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow shadow-emerald-500/10"
            >
              <Check className="h-3.5 w-3.5" /> Complete Consultation
            </button>
          )}
        </div>
      </div>

      {/* EXPANDABLE BODY TAB CONTAINERS */}
      {isExpanded && (
        <div className="border-t border-slate-800 bg-slate-950/40 p-5 space-y-5">
          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-slate-800 gap-4 text-xs font-bold text-slate-400 pb-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-1 px-1 transition-all ${activeTab === 'details' ? 'border-b-2 border-indigo-500 text-white' : 'hover:text-slate-200'}`}
            >
              Patient Details
            </button>
            
            {appointment.status !== 'CANCELLED' && appointment.status !== 'NO_SHOW' && (
              <>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`pb-1 px-1 transition-all ${activeTab === 'notes' ? 'border-b-2 border-indigo-500 text-white' : 'hover:text-slate-200'}`}
                >
                  Consultation Notes
                </button>
                <button
                  onClick={() => setActiveTab('prescription')}
                  className={`pb-1 px-1 transition-all ${activeTab === 'prescription' ? 'border-b-2 border-indigo-500 text-white' : 'hover:text-slate-200'}`}
                >
                  Prescription
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('history')}
              className={`pb-1 px-1 transition-all ${activeTab === 'history' ? 'border-b-2 border-indigo-500 text-white' : 'hover:text-slate-200'}`}
            >
              Patient History
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`pb-1 px-1 transition-all ${activeTab === 'timeline' ? 'border-b-2 border-indigo-500 text-white' : 'hover:text-slate-200'}`}
            >
              Timeline
            </button>
          </div>

          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/60 p-4 border border-slate-800/80 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-300">Basic Demographics</h4>
                <div className="grid grid-cols-2 gap-2 text-slate-400">
                  <span>Name:</span> <span className="text-white font-semibold">{appointment.patient?.name}</span>
                  <span>Age:</span> <span className="text-white font-semibold">{appointment.patient?.age}</span>
                  <span>Gender:</span> <span className="text-white font-semibold">{appointment.patient?.gender}</span>
                </div>
              </div>
              <div className="bg-slate-900/60 p-4 border border-slate-800/80 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-300">Appointment Metadata</h4>
                <div className="grid grid-cols-2 gap-2 text-slate-400">
                  <span>WhatsApp:</span> <span className="text-white font-mono">{appointment.whatsappNumber}</span>
                  <span>Payment Method:</span> <span className="text-white font-semibold">{appointment.paymentMethod}</span>
                  <span>Payment Status:</span>
                  <span className={`font-semibold ${appointment.paymentStatus === 'PAID' ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {appointment.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONSULTATION NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-400 font-semibold">Chief Complaint</label>
                  <textarea
                    rows={2}
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Enter patient primary symptoms..."
                    disabled={appointment.status === 'COMPLETED'}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-400 font-semibold">Diagnosis</label>
                  <textarea
                    rows={2}
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Enter clinical diagnosis..."
                    disabled={appointment.status === 'COMPLETED'}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs text-slate-400 font-semibold">Practitioner Notes</label>
                <textarea
                  rows={3}
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter medical remarks or clinical details..."
                  disabled={appointment.status === 'COMPLETED'}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400" /> Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    disabled={appointment.status === 'COMPLETED'}
                  />
                </div>
                {appointment.status !== 'COMPLETED' && (
                  <button
                    onClick={handleSaveNotes}
                    className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow shadow-indigo-500/10"
                  >
                    <BookOpen className="h-4 w-4" /> Save Notes
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PRESCRIPTION */}
          {activeTab === 'prescription' && (
            <div className="space-y-5">
              {/* Medicine List */}
              <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-indigo-400" /> Prescribed Medicines List
                </h4>
                
                {medicines.length === 0 ? (
                  <p className="text-xs text-slate-600 italic py-2">No medications added yet.</p>
                ) : (
                  <div className="divide-y divide-slate-800/40">
                    {medicines.map((med, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 text-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-200">{med.medicineName} ({med.dosage})</p>
                          <p className="text-[10px] text-slate-400">
                            Freq: <span className="text-indigo-400">{med.frequency}</span> | Duration: <span className="text-indigo-400">{med.duration}</span>
                            {med.instructions && ` | Instructions: ${med.instructions}`}
                          </p>
                        </div>
                        {appointment.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleRemoveMedicine(idx)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Medicine Form (Only editable if IN_PROGRESS) */}
              {appointment.status === 'IN_PROGRESS' && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end bg-slate-900/45 p-4 border border-slate-850 rounded-xl text-xs">
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-slate-500 font-semibold">Medicine Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Paracetamol"
                      value={newMed.medicineName}
                      onChange={(e) => setNewMed({ ...newMed, medicineName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Dosage</label>
                    <input
                      type="text"
                      placeholder="e.g. 500mg"
                      value={newMed.dosage}
                      onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Frequency</label>
                    <input
                      type="text"
                      placeholder="e.g. 1-0-1"
                      value={newMed.frequency}
                      onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 5 days"
                      value={newMed.duration}
                      onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={handleAddMedicine}
                      className="w-full py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-850 rounded-lg font-bold flex items-center justify-center gap-1 text-slate-300 transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Add Item
                    </button>
                  </div>

                  <div className="col-span-2 md:col-span-4 space-y-1">
                    <label className="text-slate-500 font-semibold">Special Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. After meals"
                      value={newMed.instructions}
                      onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-xs"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <button
                      type="button"
                      onClick={handleSavePrescription}
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center justify-center gap-1 transition-colors shadow shadow-indigo-500/10"
                    >
                      <FileText className="h-4 w-4" /> Save List
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PATIENT HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <History className="h-4 w-4 text-indigo-400" /> Historical Visits Summary
              </h4>

              {isLoadingHistory ? (
                <p className="text-xs text-slate-500 italic">Retrieving past records...</p>
              ) : pastVisits.length === 0 ? (
                <p className="text-xs text-slate-600 italic">No historical visits found for this patient.</p>
              ) : (
                <div className="space-y-3">
                  {pastVisits.map((p, idx) => (
                    <div key={idx} className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl text-xs space-y-3">
                      <div className="flex justify-between border-b border-slate-800/60 pb-1.5 text-[10px]">
                        <span className="font-bold text-slate-300">Date: {p.date} ({p.time})</span>
                        <span className="text-emerald-400 font-semibold font-mono">Completed</span>
                      </div>
                      
                      {p.consultation ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-slate-500 font-bold block">Diagnosis:</span>
                            <span className="text-slate-300">{p.consultation.diagnosis || 'N/A'}</span>
                            <span className="text-slate-500 font-bold block mt-2">Notes:</span>
                            <span className="text-slate-400 block">{p.consultation.doctorNotes || 'N/A'}</span>
                          </div>

                          <div className="space-y-1 bg-slate-950/45 p-3 rounded-lg border border-slate-800/40">
                            <span className="text-slate-500 font-bold block mb-1">Prescribed Medicines:</span>
                            {p.consultation.prescriptions && p.consultation.prescriptions.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-300">
                                {p.consultation.prescriptions.map((m: any, mIdx: number) => (
                                  <li key={mIdx}>
                                    <span className="font-bold">{m.medicineName}</span> ({m.dosage}) - {m.frequency} for {m.duration}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-slate-600 italic">None</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic">No notes uploaded for this visit.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-6 pt-3 pl-4 relative text-xs">
              {/* Vertical timeline line */}
              <div className="absolute top-4 bottom-4 left-6 w-0.5 bg-slate-800" />

              {/* 1. Booked */}
              <div className="flex gap-4 relative">
                <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 flex items-center justify-center text-white z-10 shrink-0 border-4 border-slate-950">
                  <Check className="h-2 w-2" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-200">Appointment Booked</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">Visits successfully scheduled in slot grid.</p>
                </div>
              </div>

              {/* 2. Started */}
              {(appointment.status === 'IN_PROGRESS' || appointment.status === 'COMPLETED') && (
                <div className="flex gap-4 relative">
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 flex items-center justify-center text-white z-10 shrink-0 border-4 border-slate-950">
                    <Check className="h-2 w-2" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-200">Consultation Started</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">Doctor initiated live diagnosis session.</p>
                  </div>
                </div>
              )}

              {/* 3. Prescription */}
              {appointment.status === 'COMPLETED' && medicines.length > 0 && (
                <div className="flex gap-4 relative">
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 flex items-center justify-center text-white z-10 shrink-0 border-4 border-slate-950">
                    <Check className="h-2 w-2" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-200">Prescription Generated</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">Medicines catalog saved and sent to patient chat history.</p>
                  </div>
                </div>
              )}

              {/* 4. Completed */}
              {appointment.status === 'COMPLETED' && (
                <div className="flex gap-4 relative">
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 flex items-center justify-center text-white z-10 shrink-0 border-4 border-slate-950">
                    <Check className="h-2 w-2" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-200">Consultation Completed</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">Practitioner marked the booking completed.</p>
                  </div>
                </div>
              )}

              {/* 5. Payment Received */}
              {appointment.paymentStatus === 'PAID' && (
                <div className="flex gap-4 relative">
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 flex items-center justify-center text-white z-10 shrink-0 border-4 border-slate-950">
                    <Check className="h-2 w-2" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-200">Payment Received</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Invoice cleared via <span className="font-mono text-indigo-400">{appointment.paymentMethod}</span>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConsultationCard;
