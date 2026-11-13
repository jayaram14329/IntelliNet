import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  Activity,
  Layers,
  Database,
  Cpu,
  Bell,
  Radio,
  FileText,
  Settings,
  LayoutDashboard,
  Network
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'NOC Overview', icon: LayoutDashboard },
  { path: '/traffic', label: 'Traffic Explorer', icon: Activity },
  { path: '/intrusion', label: 'Intrusion Detection', icon: ShieldAlert },
  { path: '/congestion', label: 'Congestion Prediction', icon: Layers },
  { path: '/datasets', label: 'Dataset Management', icon: Database },
  { path: '/models', label: 'Model Management', icon: Cpu },
  { path: '/alerts', label: 'Alerts Center', icon: Bell },
  { path: '/network', label: 'Network Monitor', icon: Radio },
  { path: '/reports', label: 'Reports & History', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-950/80 border-r border-slate-800/80 flex flex-col h-screen sticky top-0 backdrop-blur-md select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Network className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            IntelliNet
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
              NOC
            </span>
          </h1>
          <p className="text-[11px] text-slate-400">Intelligent NetOps & ML</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Monitoring & Analytics
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
        <div className="flex justify-between items-center text-[11px]">
          <span>Engine Status</span>
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            OPERATIONAL
          </span>
        </div>
        <div className="text-[10px] text-slate-400">
          v1.0.0 • Academic Engineering
        </div>
      </div>
    </aside>
  );
};
