import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

const pageTitles: Record<string, string> = {
  '/': 'Unified Network Operations Center Overview',
  '/traffic': 'Network Traffic Flow Explorer',
  '/intrusion': 'Intrusion Detection Intelligence & Flow Classification',
  '/congestion': 'Network Congestion Prediction & Queuing Telemetry',
  '/datasets': 'Dataset Management & Benchmark Verification',
  '/models': 'Machine Learning Model Lifecycle & Evaluation',
  '/alerts': 'Real-Time Security & Intrusion Alerts Center',
  '/network': 'Real-Time Interface Statistics & Packet Sniffer',
  '/reports': 'Network Audits, Evaluation Reports & CSV Exports',
  '/settings': 'Telemetry Thresholds & System Preferences',
};

export const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const currentTitle = pageTitles[location.pathname] || 'IntelliNet Console';

  return (
    <div className="flex min-h-screen bg-[#080c14] text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={currentTitle} />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
