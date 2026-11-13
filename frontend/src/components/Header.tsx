import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, Clock, Wifi, Shield } from 'lucide-react';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'NOC Monitoring Console' }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>Local Engine Connected</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 px-3 py-1 rounded-lg bg-slate-900/60 border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{time}</span>
        </div>

        {/* User Badge */}
        {isAuthenticated && user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm">
                {user.username.slice(0, 2)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-200">{user.username}</div>
                <div className="text-[10px] text-cyan-400 font-mono tracking-wider flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5" />
                  {user.role}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
