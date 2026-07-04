import { create } from 'zustand';

export interface Patient {
  id: string;
  whatsappNumber: string;
  name: string;
  age: number;
  gender: string;
  createdAt: string;
}

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
  stripePaymentIntent?: string | null;
  patient?: { name: string };
  doctor?: { name: string };
}

export interface Config {
  key: string;
  value: string;
}

interface SheetState {
  patients: Patient[];
  appointments: Appointment[];
  configs: Config[];
  flashingRows: Record<string, 'insert' | 'update' | null>;
  setPatients: (list: Patient[]) => void;
  setAppointments: (list: Appointment[]) => void;
  setConfigs: (list: Config[]) => void;
  handleSyncEvent: (sheet: 'Patients' | 'Appointments' | 'Config', action: 'INSERT' | 'UPDATE', data: any) => void;
}

export const useSheetStore = create<SheetState>((set) => ({
  patients: [],
  appointments: [],
  configs: [],
  flashingRows: {},

  setPatients: (patients) => set({ patients }),
  setAppointments: (appointments) => set({ appointments }),
  setConfigs: (configs) => set({ configs }),

  handleSyncEvent: (sheet, action, data) => {
    set((state) => {
      const rowId = data.id || data.key || '';
      
      // Update flash status
      const updatedFlashing = { ...state.flashingRows, [rowId]: action.toLowerCase() as 'insert' | 'update' };

      // Set timeout to clear flash after 1.5s
      setTimeout(() => {
        set((curr) => {
          const clearedFlashing = { ...curr.flashingRows };
          delete clearedFlashing[rowId];
          return { flashingRows: clearedFlashing };
        });
      }, 1500);

      if (sheet === 'Patients') {
        let updatedList = [...state.patients];
        if (action === 'INSERT') {
          updatedList = [data, ...updatedList];
        } else {
          updatedList = updatedList.map((p) => (p.id === data.id ? data : p));
        }
        return { patients: updatedList, flashingRows: updatedFlashing };
      }

      if (sheet === 'Appointments') {
        let updatedList = [...state.appointments];
        if (action === 'INSERT') {
          updatedList = [data, ...updatedList];
        } else {
          updatedList = updatedList.map((a) => (a.id === data.id ? data : a));
        }
        return { appointments: updatedList, flashingRows: updatedFlashing };
      }

      if (sheet === 'Config') {
        let updatedList = [...state.configs];
        const keyExists = updatedList.some((c) => c.key === data.key);
        if (keyExists) {
          updatedList = updatedList.map((c) => (c.key === data.key ? data : c));
        } else {
          updatedList = [...updatedList, data];
        }
        return { configs: updatedList, flashingRows: updatedFlashing };
      }

      return {};
    });
  },
}));
export default useSheetStore;
