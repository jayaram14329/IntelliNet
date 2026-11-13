import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ModelMetrics } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Layers,
  Activity,
  Play,
  TrendingUp,
  Cpu,
  Clock,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export const CongestionPage: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any | null>(null);

  // Telemetry Input Form
  const [telemetry, setTelemetry] = useState({
    bandwidth_utilization_pct: 65,
    throughput_mbps: 650,
    packet_rate_pps: 5400,
    latency_ms: 62,
    packet_loss_pct: 1.2,
    jitter_ms: 6.5,
    active_connections: 180,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, historyRes] = await Promise.all([
        api.get('/congestion/metrics'),
        api.get('/congestion/history?limit=25')
      ]);
      setMetrics(metricsRes.data);
      setHistory(historyRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setPredicting(true);
    try {
      const res = await api.post('/congestion/predict', telemetry);
      setPredictionResult(res.data);
      // Refresh history
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Prediction failed');
    } finally {
      setPredicting(false);
    }
  };

  const applyPreset = (preset: 'nominal' | 'rising' | 'burst' | 'critical') => {
    if (preset === 'nominal') {
      setTelemetry({
        bandwidth_utilization_pct: 28,
        throughput_mbps: 280,
        packet_rate_pps: 2300,
        latency_ms: 18,
        packet_loss_pct: 0.02,
        jitter_ms: 2.1,
        active_connections: 75,
      });
    } else if (preset === 'rising') {
      setTelemetry({
        bandwidth_utilization_pct: 58,
        throughput_mbps: 580,
        packet_rate_pps: 4900,
        latency_ms: 48,
        packet_loss_pct: 0.6,
        jitter_ms: 4.8,
        active_connections: 160,
      });
    } else if (preset === 'burst') {
      setTelemetry({
        bandwidth_utilization_pct: 82,
        throughput_mbps: 820,
        packet_rate_pps: 7100,
        latency_ms: 95,
        packet_loss_pct: 2.8,
        jitter_ms: 11.2,
        active_connections: 320,
      });
    } else {
      setTelemetry({
        bandwidth_utilization_pct: 95,
        throughput_mbps: 950,
        packet_rate_pps: 8900,
        latency_ms: 185,
        packet_loss_pct: 7.4,
        jitter_ms: 24.0,
        active_connections: 580,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Network Congestion Prediction & Horizon Forecaster
          </h2>
          <p className="text-xs text-slate-400">
            Dual-mode queuing delay estimation: Mode A (Current State Classification) & Mode B (Supervised Future Interval Forecasting).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={metrics?.is_trained ? 'READY' : 'FAILED'} size="sm" />
          <span className="text-xs font-mono text-slate-400">
            Horizon: {metrics?.prediction_horizon || 'Next Measurement Interval'}
          </span>
        </div>
      </div>

      {/* Model Performance Cards */}
      {metrics?.is_trained && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Forecasting Accuracy</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {(Number(metrics.accuracy || 0) * 100).toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Temporal Split</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Weighted Precision</span>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
              {(Number(metrics.precision || 0) * 100).toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Queue Bloat Detection</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Weighted Recall</span>
            <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
              {(Number(metrics.recall || 0) * 100).toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Packet Drop Recall</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">F1-Score</span>
            <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
              {(Number(metrics.f1_score || 0) * 100).toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Next Interval (t+1)</span>
          </div>
        </div>
      )}

      {/* Dual Column: Telemetry Simulator & Forecasting Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telemetry Simulator Form */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Network Telemetry Simulator</h3>
            <p className="text-xs text-slate-400">Adjust queuing conditions and test future interval forecasts</p>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Test Scenarios:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('nominal')}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-emerald-400 border border-slate-700"
              >
                Nominal Load
              </button>
              <button
                type="button"
                onClick={() => applyPreset('rising')}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-amber-400 border border-slate-700"
              >
                Medium Queuing
              </button>
              <button
                type="button"
                onClick={() => applyPreset('burst')}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-rose-400 border border-slate-700"
              >
                Burst Congestion
              </button>
              <button
                type="button"
                onClick={() => applyPreset('critical')}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-red-400 border border-slate-700"
              >
                Critical Drops
              </button>
            </div>
          </div>

          <form onSubmit={handlePredict} className="space-y-3">
            {/* Bandwidth Utilization Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300">Bandwidth Utilization</span>
                <span className="font-mono text-cyan-400 font-bold">{telemetry.bandwidth_utilization_pct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={telemetry.bandwidth_utilization_pct}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTelemetry({
                    ...telemetry,
                    bandwidth_utilization_pct: val,
                    throughput_mbps: val * 10,
                    packet_rate_pps: val * 85,
                  });
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Latency (ms)</label>
                <input
                  type="number"
                  step="0.1"
                  value={telemetry.latency_ms}
                  onChange={(e) => setTelemetry({ ...telemetry, latency_ms: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Packet Loss (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={telemetry.packet_loss_pct}
                  onChange={(e) => setTelemetry({ ...telemetry, packet_loss_pct: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Throughput (Mbps)</label>
                <input
                  type="number"
                  value={telemetry.throughput_mbps}
                  onChange={(e) => setTelemetry({ ...telemetry, throughput_mbps: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Jitter (ms)</label>
                <input
                  type="number"
                  step="0.1"
                  value={telemetry.jitter_ms}
                  onChange={(e) => setTelemetry({ ...telemetry, jitter_ms: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={predicting}
              className="w-full mt-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{predicting ? 'Evaluating Models...' : 'Execute Mode A & Mode B Congestion Analysis'}</span>
            </button>
          </form>

          {/* Prediction Result Display */}
          {predictionResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Mode A: Current State</span>
                  <div className="mt-1">
                    <StatusBadge status={predictionResult.current_state} size="md" />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                    Deterministic Queuing Criteria
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Mode B: Next Interval</span>
                  <div className="mt-1">
                    <StatusBadge status={predictionResult.predicted_next_interval} size="md" />
                  </div>
                  <span className="text-[10px] text-cyan-400 block mt-1 font-mono">
                    Horizon: {predictionResult.prediction_horizon}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 italic flex items-center gap-1 border-t border-slate-900 pt-2">
                <Info className="w-3 h-3 shrink-0" />
                <span>{predictionResult.disclaimer}</span>
              </div>
            </div>
          )}
        </div>

        {/* Methodology & Queuing Explanation */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-2">Classification Methodology</h3>
            <p className="text-xs text-slate-400 mb-4">
              Ground truth labeling is based on defensible RFC queuing standards:
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-red-400">CRITICAL</span>
                  <span className="text-[10px] text-slate-500">Severe Buffer Drop</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Loss &gt; 5.0% OR Latency &gt; 150ms OR Bandwidth &gt; 90%
                </p>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-rose-400">HIGH</span>
                  <span className="text-[10px] text-slate-500">Queuing Buildup</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Loss &gt; 2.0% OR Latency &gt; 80ms OR Bandwidth &gt; 75%
                </p>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-amber-400">MEDIUM</span>
                  <span className="text-[10px] text-slate-500">Moderate Queuing</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Latency &gt; 40ms OR Bandwidth &gt; 50% OR Loss &gt; 0.5%
                </p>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-emerald-400">LOW</span>
                  <span className="text-[10px] text-slate-500">Nominal State</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Latency &le; 40ms, Loss &le; 0.5%, Bandwidth &le; 50%
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300">
            <strong>Mode B Temporal Splitting:</strong> The forecasting pipeline creates lag features (t-1) and rolling statistical windows (t-3 to t). Splitting is strictly chronological, preventing lookahead leakage.
          </div>
        </div>
      </div>

      {/* Historical Forecast Records Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">Historical Network Telemetry & Congestion Records</h3>
        <p className="text-xs text-slate-400 mb-4">Chronological observation of latency and bandwidth over time</p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="bandwidth_utilization"
                name="Bandwidth (%)"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
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
    </div>
  );
};
