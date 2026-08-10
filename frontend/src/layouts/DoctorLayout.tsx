import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { 
  LayoutDashboard, Calendar, CalendarCheck, Clock, CalendarDays, LogOut, Menu, X, HeartPulse 
} from 'lucide-react';

export const DoctorLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const clearLocalChatHistory = useChatStore((state) => state.clearLocalHistory);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: 'My Dashboard', path: '/doctor/dashboard', icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
    { name: "Today's Appointments", path: '/doctor/appointments', icon: <Clock className="h-4.5 w-4.5" /> },
    { name: 'Weekly Schedule', path: '/doctor/schedule', icon: <Calendar className="h-4.5 w-4.5" /> },
    { name: 'My Patients', path: '/doctor/patients', icon: <HeartPulse className="h-4.5 w-4.5" /> },
    { name: 'Leaves & Availability', path: '/doctor/settings', icon: <CalendarDays className="h-4.5 w-4.5" /> },
  ];

  const handleLogout = () => {
    logout();
    clearLocalChatHistory();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row relative">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <HeartPulse className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-md bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Doctor Workspace
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg transition-all"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div
        className={`${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800/80 p-5 flex flex-col justify-between z-30 transition-transform duration-300 md:duration-0 shrink-0`}
      >
        <div className="space-y-8">
          {/* Logo Header */}
          <div className="hidden md:flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-md bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent">
                ClinicFlow AI
              </span>
              <p className="text-[9px] text-slate-500 font-mono tracking-wider uppercase mt-0.5">Doctor Portal</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-3 transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {item.icon}
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Block & Sign Out */}
        <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Doctor User'}</p>
            <p className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">Medical Staff</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-950/40 rounded-lg transition-all"
            title="Sign Out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Page Content Panel */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
};

export default DoctorLayout;
