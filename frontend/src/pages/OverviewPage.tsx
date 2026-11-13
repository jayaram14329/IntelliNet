import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DashboardSummary } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  ShieldAlert,
  Activity,
  Layers,
  Cpu,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Clock,
  Gauge
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export const OverviewPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [sumRes, trendRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/traffic-trend?limit=25')
      ]);
      setSummary(sumRes.data);
      setTrendData(trendRes.data.data || []);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Periodic refresh every 4 seconds for live operations
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-slate-400">Loading Network Operations Telemetry...</p>
      </div>
    );
  }

  const m = summary?.live_metrics;

  const classificationData = [
    { name: 'Benign Flows', count: summary?.benign_flow_count || 0, color: '#10b981' },
    { name: 'Suspicious / Attacks', count: summary?.suspicious_flow_count || 0, color: '#f43f5e' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl backdrop-blur-md">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            IntelliNet Security Operations Center
            <span className="text-xs font-normal text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry Polling (4s)
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Unified telemetry combining CIC-IDS2017 machine-learning intrusion detection and network queuing congestion prediction.
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Intrusion Monitoring */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-slate-400">Total Analyzed Flows</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {summary?.total_analyzed_flows?.toLocaleString() || '0'}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-emerald-400 font-medium">
              {summary?.benign_flow_count?.toLocaleString()} Benign
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-400 font-medium">
              {summary?.suspicious_flow_count?.toLocaleString()} Threats
            </span>
          </div>
        </div>

        {/* Card 2: Current & Predicted Congestion Dual Gauge */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-slate-400">Congestion Status</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Current State</div>
              <StatusBadge status={summary?.current_congestion || 'LOW'} size="sm" />
            </div>
            <div className="text-slate-600">→</div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Next Horizon</div>
              <StatusBadge status={summary?.predicted_next_congestion || 'LOW'} size="sm" />
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 font-mono">
            Horizon: {summary?.congestion_horizon}
          </div>
        </div>

        {/* Card 3: Network Throughput & Bandwidth */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-slate-400">Network Throughput</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {m?.throughput_mbps?.toFixed(2) || '0.00'} <span className="text-sm font-normal text-slate-400">Mbps</span>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
            <span>Bandwidth: {m?.bandwidth_utilization_pct?.toFixed(1) || 0}%</span>
            <span>Conns: {m?.active_connections || 0}</span>
          </div>
        </div>

        {/* Card 4: Open Security Alerts */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-slate-400">Active Security Alerts</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">
            {summary?.alerts_summary?.total || 0}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-rose-400 font-medium">
              {summary?.alerts_summary?.critical || 0} Critical
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-medium">
              {summary?.alerts_summary?.high || 0} High
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Realtime Throughput & Bandwidth Utilization Chart */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Throughput & Bandwidth Utilization Trend</h3>
              <p className="text-xs text-slate-400">Continuous telemetry counter differential (Mbps & % capacity)</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
              Interface: {m?.interface_name || 'System-Wide'}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="bandwidthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="throughput_mbps"
                  name="Throughput (Mbps)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#throughputGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="bandwidth_utilization_pct"
                  name="Bandwidth Util (%)"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#bandwidthGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic Flow Classification Distribution */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md flex flex-col">
          <h3 className="text-sm font-bold text-white tracking-tight mb-1">Traffic Flow Classification</h3>
          <p className="text-xs text-slate-400 mb-4">Benign vs Attack flows identified across active datasets</p>

          <div className="flex-1 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classificationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#cbd5e1" fontSize={11} width={90} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {classificationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
            <span>Model: {summary?.models.intrusion.algorithm}</span>
            <span className="text-emerald-400">Active</span>
          </div>
        </div>
      </div>

      {/* Latency, Packet Loss & Queuing Telemetry Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Queuing Latency & Packet Loss Telemetry</h3>
              <p className="text-xs text-slate-400">Key metrics driving the congestion prediction engine</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-0.5 bg-amber-400 rounded-full" /> Latency (ms)
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-0.5 bg-rose-400 rounded-full" /> Packet Loss (%)
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="latency_ms"
                  name="Latency (ms)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="packet_loss_pct"
                  name="Loss (%)"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Lifecycle Summary Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight mb-1 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Machine Learning Engines
            </h3>
            <p className="text-xs text-slate-400 mb-4">Operational status of trained analytical pipelines</p>

            <div className="space-y-4">
              {/* Intrusion Model */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-200">Intrusion Classifier</span>
                  <StatusBadge status={summary?.models.intrusion.is_trained ? 'READY' : 'FAILED'} size="sm" />
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                  <div>Algorithm: {summary?.models.intrusion.algorithm}</div>
                  <div>Version: {summary?.models.intrusion.version}</div>
                  <div>Features: {summary?.models.intrusion.features_count} inputs</div>
                </div>
              </div>

              {/* Congestion Model */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-200">Congestion Forecaster</span>
                  <StatusBadge status={summary?.models.congestion.is_trained ? 'READY' : 'FAILED'} size="sm" />
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                  <div>Algorithm: {summary?.models.congestion.algorithm}</div>
                  <div>Horizon: {summary?.models.congestion.horizon}</div>
                  <div>Mode: Supervised Lag Temporal</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 text-center">
            Managed under SQLite Persistent Store
          </div>
        </div>
      </div>

      {/* Recent Security Alerts Feed */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Recent Security Incidents & Threat Detections</h3>
            <p className="text-xs text-slate-400">High-confidence alerts generated by model inference and capture monitors</p>
          </div>
          <span className="text-xs text-cyan-400 font-medium">Viewing latest {summary?.recent_alerts?.length || 0} alerts</span>
        </div>

        {summary?.recent_alerts && summary.recent_alerts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Alert Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 font-mono">Source IP</th>
                  <th className="py-2.5 px-3 font-mono">Destination IP</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {summary.recent_alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <StatusBadge status={alert.severity} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">{alert.title}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{alert.category}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono">{alert.source_ip}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono">{alert.destination_ip}</td>
                    <td className="py-2.5 px-3 text-cyan-400 font-mono">
                      {(alert.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={alert.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-500">
            No security threats detected in current monitoring interval. Nominal state.
          </div>
        )}
      </div>
    </div>
  );
};
