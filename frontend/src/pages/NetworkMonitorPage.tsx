import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { LiveMetrics, SnifferStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Radio,
  Play,
  Square,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Activity,
  Layers,
  Network,
  Info
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export const NetworkMonitorPage: React.FC = () => {
  const [interfaces, setInterfaces] = useState<any[]>([]);
  const [selectedIface, setSelectedIface] = useState<string>('');
  const [liveStats, setLiveStats] = useState<LiveMetrics | null>(null);
  const [snifferStatus, setSnifferStatus] = useState<SnifferStatus | null>(null);
  const [captureFilter, setCaptureFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchInterfaces = async () => {
    try {
      const res = await api.get('/network/interfaces');
      setInterfaces(res.data.interfaces || []);
      if (res.data.interfaces.length > 0 && !selectedIface) {
        setSelectedIface(res.data.interfaces[0].name);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRealtimeStats = async () => {
    try {
      const url = selectedIface ? `/network/statistics?interface=${encodeURIComponent(selectedIface)}` : '/network/statistics';
      const [statRes, sniffRes] = await Promise.all([
        api.get(url),
        api.get('/network/capture/status')
      ]);
      setLiveStats(statRes.data);
      setSnifferStatus(sniffRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterfaces();
  }, []);

  useEffect(() => {
    fetchRealtimeStats();
    const interval = setInterval(fetchRealtimeStats, 3000);
    return () => clearInterval(interval);
  }, [selectedIface]);

  const handleStartCapture = async () => {
    try {
      await api.post('/network/capture/start', {
        interface: selectedIface,
        filter: captureFilter || undefined
      });
      fetchRealtimeStats();
    } catch (e: any) {
      alert('Capture could not be started: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleStopCapture = async () => {
    try {
      await api.post('/network/capture/stop');
      fetchRealtimeStats();
    } catch (e: any) {
      alert('Failed to stop capture: ' + (e.response?.data?.detail || e.message));
    }
  };

  const PROTOCOL_COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  const protocolData = snifferStatus?.summary
    ? Object.entries(snifferStatus.summary).map(([name, count]) => ({
        name,
        value: Number(count)
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            Live Network Interface Monitor & Packet Sniffer
          </h2>
          <p className="text-xs text-slate-400">
            Real operating system counter differentials (Psutil) and optional raw frame inspection (Scapy).
          </p>
        </div>

        {/* Interface Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">NIC:</label>
          <select
            value={selectedIface}
            onChange={(e) => setSelectedIface(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            {interfaces.map((iface) => (
              <option key={iface.name} value={iface.name}>
                {iface.name} ({iface.is_up ? 'UP' : 'DOWN'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Real-Time Local Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Differential Throughput</span>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
            {liveStats?.throughput_mbps.toFixed(2)} Mbps
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {liveStats?.bandwidth_utilization_pct.toFixed(1)}% Capacity
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Transmission Rate</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {((liveStats?.bytes_sent_sec || 0) / 1024).toFixed(1)} KB/s
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {liveStats?.packets_sent_sec.toFixed(0)} pkts/s Out
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Reception Rate</span>
          <div className="text-xl font-bold font-mono text-blue-400 mt-1">
            {((liveStats?.bytes_recv_sec || 0) / 1024).toFixed(1)} KB/s
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {liveStats?.packets_recv_sec.toFixed(0)} pkts/s In
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Queuing State</span>
          <div className="mt-1">
            <StatusBadge status={liveStats?.congestion_level || 'LOW'} size="sm" />
          </div>
          <span className="text-[10px] text-slate-500 font-mono block mt-1">
            Latency ~{liveStats?.latency_ms.toFixed(1)}ms
          </span>
        </div>
      </div>

      {/* Packet Sniffer Controls & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sniffer Controller */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Defensive Packet Sniffer (Scapy)
              </h3>
              <p className="text-xs text-slate-400">Explicit user-controlled packet header analyzer</p>
            </div>
            <StatusBadge status={snifferStatus?.is_sniffing ? 'NEW' : 'RESOLVED'} size="sm" />
          </div>

          <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Ethical & Defensive Design Principle</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Packet capture only begins upon explicit user initiation. Payload bytes and application credentials are not stored or inspected.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Optional BPF Capture Filter
              </label>
              <input
                type="text"
                placeholder="e.g. tcp or udp or port 80"
                value={captureFilter}
                onChange={(e) => setCaptureFilter(e.target.value)}
                disabled={snifferStatus?.is_sniffing}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
            </div>

            <div className="flex gap-3">
              {!snifferStatus?.is_sniffing ? (
                <button
                  type="button"
                  onClick={handleStartCapture}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-600/20"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Packet Capture</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopCapture}
                  className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-rose-600/20"
                >
                  <Square className="w-4 h-4" />
                  <span>Halt Packet Capture</span>
                </button>
              )}
            </div>
          </div>

          {snifferStatus?.warning && (
            <div className="p-3 rounded bg-amber-950/40 border border-amber-800/50 text-[11px] text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{snifferStatus.warning}</span>
            </div>
          )}
        </div>

        {/* Captured Protocol Distribution */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Captured Protocol Distribution</h3>
            <p className="text-xs text-slate-400 mb-4">
              Packets tallied during the active or most recent capture session
            </p>

            <div className="text-center font-mono text-xl font-bold text-white mb-2">
              Total Captured: {snifferStatus?.packets_captured?.toLocaleString() || 0} pkts
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={protocolData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                  >
                    {protocolData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PROTOCOL_COLORS[index % PROTOCOL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 italic text-center">
            Note: Windows promiscuous frame capture utilizes Npcap or WinPcap driver interfaces.
          </div>
        </div>
      </div>
    </div>
  );
};
