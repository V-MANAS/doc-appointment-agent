import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', label }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-indigo-500 border-t-transparent`}
      />
      {label && <span className="text-xs text-slate-400 font-medium">{label}</span>}
    </div>
  );
};

export default LoadingSpinner;
