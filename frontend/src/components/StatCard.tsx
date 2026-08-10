import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendColor?: 'success' | 'danger' | 'warning' | 'info';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendColor = 'info' }) => {
  const trendColorClasses = {
    success: 'text-emerald-400 bg-emerald-950/20 border-emerald-500/10',
    danger: 'text-rose-400 bg-rose-950/20 border-rose-500/10',
    warning: 'text-amber-400 bg-amber-950/20 border-amber-500/10',
    info: 'text-indigo-400 bg-indigo-950/20 border-indigo-500/10',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between relative overflow-hidden transition-all hover:border-slate-700/80 group">
      {/* Background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="space-y-1">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-extrabold text-white tracking-tight">{value}</h3>
        {trend && (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border mt-1.5 ${trendColorClasses[trendColor]}`}>
            {trend}
          </span>
        )}
      </div>

      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-indigo-400 group-hover:text-indigo-300 group-hover:border-slate-700 transition-all shadow-inner">
        {icon}
      </div>
    </div>
  );
};

export default StatCard;
