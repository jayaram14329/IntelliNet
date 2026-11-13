import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Save, CheckCircle2, Shield, User, Info, Sliders } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const [thresholds, setThresholds] = useState({
    latency_threshold_medium: 40.0,
    latency_threshold_high: 80.0,
    latency_threshold_critical: 150.0,
    packet_loss_threshold_medium: 0.5,
    packet_loss_threshold_high: 2.0,
    packet_loss_threshold_critical: 5.0,
    bandwidth_threshold_medium: 50.0,
    bandwidth_threshold_high: 75.0,
    bandwidth_threshold_critical: 90.0,
  });

  useEffect(() => {
    api.get('/settings')
      .then((res) => {
        const t = res.data.thresholds;
        if (t) {
          setThresholds({
            latency_threshold_medium: t.latency_ms.medium,
            latency_threshold_high: t.latency_ms.high,
            latency_threshold_critical: t.latency_ms.critical,
            packet_loss_threshold_medium: t.packet_loss_pct.medium,
            packet_loss_threshold_high: t.packet_loss_pct.high,
            packet_loss_threshold_critical: t.packet_loss_pct.critical,
            bandwidth_threshold_medium: t.bandwidth_pct.medium,
            bandwidth_threshold_high: t.bandwidth_pct.high,
            bandwidth_threshold_critical: t.bandwidth_pct.critical,
          });
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/settings', thresholds);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert('Failed to update settings: ' + (e.response?.data?.detail || e.message));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-400" />
            System Preferences & Telemetry Configuration
          </h2>
          <p className="text-xs text-slate-400">
            Configure dynamic network queuing thresholds and inspect authenticated operator profile.
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Settings saved successfully! Congestion engine updated.</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-400" />
          Active Operator Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 block">Operator Username</span>
            <span className="text-white font-bold">{user?.username || 'admin'}</span>
          </div>
          <div className="p-3 rounded bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 block">Email Address</span>
            <span className="text-cyan-300 font-bold">{user?.email || 'admin@intellinet.local'}</span>
          </div>
          <div className="p-3 rounded bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 block">Role Assignment</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {user?.role || 'ADMIN'}
            </span>
          </div>
        </div>
      </div>

      {/* Congestion Thresholds Form */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Configurable Queuing Congestion Thresholds
          </h3>
          <p className="text-xs text-slate-400">
            Tune the decision boundary criteria used to assign Medium, High, and Critical congestion states.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Latency Thresholds */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">Latency Thresholds (ms)</span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500">Medium (&gt; ms)</label>
                <input
                  type="number"
                  step="0.5"
                  value={thresholds.latency_threshold_medium}
                  onChange={(e) => setThresholds({ ...thresholds, latency_threshold_medium: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500">High (&gt; ms)</label>
                <input
                  type="number"
                  step="0.5"
                  value={thresholds.latency_threshold_high}
                  onChange={(e) => setThresholds({ ...thresholds, latency_threshold_high: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500">Critical (&gt; ms)</label>
                <input
                  type="number"
                  step="0.5"
                  value={thresholds.latency_threshold_critical}
                  onChange={(e) => setThresholds({ ...thresholds, latency_threshold_critical: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Packet Loss Thresholds */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">Packet Loss Thresholds (%)</span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500">Medium (&gt; %)</label>
                <input
                  type="number"
                  step="0.1"
                  value={thresholds.packet_loss_threshold_medium}
                  onChange={(e) => setThresholds({ ...thresholds, packet_loss_threshold_medium: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500">High (&gt; %)</label>
                <input
                  type="number"
                  step="0.1"
                  value={thresholds.packet_loss_threshold_high}
                  onChange={(e) => setThresholds({ ...thresholds, packet_loss_threshold_high: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500">Critical (&gt; %)</label>
                <input
                  type="number"
                  step="0.1"
                  value={thresholds.packet_loss_threshold_critical}
                  onChange={(e) => setThresholds({ ...thresholds, packet_loss_threshold_critical: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Bandwidth Utilization Thresholds */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">Bandwidth Utilization Thresholds (%)</span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500">Medium (&gt; %)</label>
                <input
                  type="number"
                  value={thresholds.bandwidth_threshold_medium}
                  onChange={(e) => setThresholds({ ...thresholds, bandwidth_threshold_medium: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500">High (&gt; %)</label>
                <input
                  type="number"
                  value={thresholds.bandwidth_threshold_high}
                  onChange={(e) => setThresholds({ ...thresholds, bandwidth_threshold_high: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500">Critical (&gt; %)</label>
                <input
                  type="number"
                  value={thresholds.bandwidth_threshold_critical}
                  onChange={(e) => setThresholds({ ...thresholds, bandwidth_threshold_critical: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-cyan-600/20"
          >
            <Save className="w-4 h-4" />
            <span>Save Congestion Thresholds</span>
          </button>
        </form>
      </div>
    </div>
  );
};
