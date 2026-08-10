import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const AccessDenied: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleReturn = () => {
    if (!user) {
      navigate('/');
    } else if (user.role === 'ADMIN') {
      navigate('/admin/dashboard');
    } else if (user.role === 'DOCTOR') {
      navigate('/doctor/dashboard');
    } else {
      navigate('/chat');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-rose-900/10 blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-8 text-center space-y-6 z-10">
        <div className="flex justify-center">
          <div className="bg-rose-950/40 p-4 rounded-full border border-rose-500/20 text-rose-500">
            <ShieldAlert className="h-12 w-12 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white font-display">Access Denied</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            You do not have the required permissions to access this directory or resource. Please contact your system administrator.
          </p>
        </div>

        <button
          onClick={handleReturn}
          className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Portal
        </button>
      </div>
    </div>
  );
};

export default AccessDenied;
