import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'md' }) => {
  const norm = (status || '').toUpperCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  if (norm === 'BENIGN' || norm === 'LOW' || norm === 'RESOLVED' || norm === 'READY') {
    colorClasses = 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30';
  } else if (norm === 'MEDIUM' || norm === 'ACKNOWLEDGED' || norm === 'PROCESSING') {
    colorClasses = 'bg-amber-950/70 text-amber-400 border-amber-500/30';
  } else if (norm === 'HIGH' || norm === 'ATTACK' || norm === 'PORTSCAN' || norm === 'BOTNET') {
    colorClasses = 'bg-rose-950/70 text-rose-400 border-rose-500/30';
  } else if (norm === 'CRITICAL' || norm === 'DDOS' || norm === 'FAILED') {
    colorClasses = 'bg-red-950/90 text-red-300 border-red-500/50 glow-rose animate-pulse';
  } else if (norm === 'NEW') {
    colorClasses = 'bg-cyan-950/70 text-cyan-400 border-cyan-500/30';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-semibold px-2.5 py-1',
    lg: 'text-sm font-semibold px-3 py-1.5'
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${colorClasses} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {norm}
    </span>
  );
};
