import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ModelMetrics } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  ShieldAlert,
  Play,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Info,
  BarChart2,
  Grid,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

export const IntrusionPage: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any | null>(null);

  // Form Inputs
  const [form, setForm] = useState({
    destination_port: 80,
    flow_duration: 120000,
    total_fwd_packets: 10,
    total_backward_packets: 8,
    total_length_of_fwd_packets: 1500,
    total_length_of_bwd_packets: 4000,
    fwd_packet_length_max: 500,
    fwd_packet_length_min: 0,
    fwd_packet_length_mean: 150,
    bwd_packet_length_mean: 500,
    flow_bytes_s: 45833,
    flow_packets_s: 150,
    flow_iat_mean: 7058,
    flow_iat_std: 1200,
    fin_flag_count: 0,
    syn_flag_count: 1,
    rst_flag_count: 0,
    psh_flag_count: 1,
    ack_flag_count: 1,
    source_ip: '192.168.1.105',
    destination_ip: '10.0.0.1',
    protocol: 'TCP'
  });

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/intrusion/metrics');
      setMetrics(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setPredicting(true);
    try {
      const res = await api.post('/intrusion/predict', form);
      setPredictionResult(res.data);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Inference error');
    } finally {
      setPredicting(false);
    }
  };

  const applyPreset = (preset: 'benign' | 'ddos' | 'portscan' | 'botnet') => {
    if (preset === 'benign') {
      setForm({
        destination_port: 443,
        flow_duration: 180000,
        total_fwd_packets: 15,
        total_backward_packets: 18,
        total_length_of_fwd_packets: 2400,
        total_length_of_bwd_packets: 8500,
        fwd_packet_length_max: 800,
        fwd_packet_length_min: 0,
        fwd_packet_length_mean: 160,
        bwd_packet_length_mean: 472,
        flow_bytes_s: 60555,
        flow_packets_s: 183,
        flow_iat_mean: 5450,
        flow_iat_std: 900,
        fin_flag_count: 1,
        syn_flag_count: 1,
        rst_flag_count: 0,
        psh_flag_count: 1,
        ack_flag_count: 1,
        source_ip: '192.168.1.55',
        destination_ip: '142.250.190.46',
        protocol: 'TCP'
      });
    } else if (preset === 'ddos') {
      setForm({
        destination_port: 80,
        flow_duration: 4500,
        total_fwd_packets: 2500,
        total_backward_packets: 0,
        total_length_of_fwd_packets: 125000,
        total_length_of_bwd_packets: 0,
        fwd_packet_length_max: 54,
        fwd_packet_length_min: 54,
        fwd_packet_length_mean: 54,
        bwd_packet_length_mean: 0,
        flow_bytes_s: 27777777,
        flow_packets_s: 555555,
        flow_iat_mean: 1.8,
        flow_iat_std: 0.4,
        fin_flag_count: 0,
        syn_flag_count: 1,
        rst_flag_count: 1,
        psh_flag_count: 0,
        ack_flag_count: 0,
        source_ip: '198.51.100.99',
        destination_ip: '10.0.0.1',
        protocol: 'TCP'
      });
    } else if (preset === 'portscan') {
      setForm({
        destination_port: 8088,
        flow_duration: 250,
        total_fwd_packets: 2,
        total_backward_packets: 0,
        total_length_of_fwd_packets: 88,
        total_length_of_bwd_packets: 0,
        fwd_packet_length_max: 44,
        fwd_packet_length_min: 44,
        fwd_packet_length_mean: 44,
        bwd_packet_length_mean: 0,
        flow_bytes_s: 35200,
        flow_packets_s: 800,
        flow_iat_mean: 125,
        flow_iat_std: 10,
        fin_flag_count: 0,
        syn_flag_count: 1,
        rst_flag_count: 1,
        psh_flag_count: 0,
        ack_flag_count: 0,
        source_ip: '203.0.113.12',
        destination_ip: '10.0.0.15',
        protocol: 'TCP'
      });
    } else {
      setForm({
        destination_port: 22,
        flow_duration: 350000,
        total_fwd_packets: 80,
        total_backward_packets: 75,
        total_length_of_fwd_packets: 4800,
        total_length_of_bwd_packets: 4500,
        fwd_packet_length_max: 120,
        fwd_packet_length_min: 40,
        fwd_packet_length_mean: 60,
        bwd_packet_length_mean: 60,
        flow_bytes_s: 26571,
        flow_packets_s: 442,
        flow_iat_mean: 2258,
        flow_iat_std: 400,
        fin_flag_count: 1,
        syn_flag_count: 1,
        rst_flag_count: 0,
        psh_flag_count: 1,
        ack_flag_count: 1,
        source_ip: '192.0.2.77',
        destination_ip: '10.0.0.22',
        protocol: 'TCP'
      });
    }
  };

  const featureImportanceData = metrics?.feature_importance
    ? Object.entries(metrics.feature_importance)
        .slice(0, 8)
        .map(([name, score]) => ({
          name: name.replace(/_/g, ' '),
          score: Number(score),
        }))
    : [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            Intrusion Detection Intelligence Pipeline
          </h2>
          <p className="text-xs text-slate-400">
            Flow-level network anomaly & signature classification trained on CIC-IDS2017 benchmark standards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={metrics?.is_trained ? 'READY' : 'FAILED'} size="sm" />
          <span className="text-xs font-mono text-slate-400">
            Algorithm: {metrics?.algorithm || 'RandomForest'} ({metrics?.version || 'v1.0'})
          </span>
        </div>
      </div>

      {/* Evaluation Metrics Cards */}
      {metrics?.is_trained && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Test Accuracy</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {(Number(metrics.accuracy || 0) * 100).toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Stratified Split</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Weighted Precision</span>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
              {(Number(metrics.precision || 0) * 100).toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Low False Positives</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Weighted Recall</span>
            <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
              {(Number(metrics.recall || 0) * 100).toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Threat Coverage</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">F1-Score</span>
            <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
              {(Number(metrics.f1_score || 0) * 100).toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Harmonic Mean</span>
          </div>
        </div>
      )}

      {/* Two Column Section: Interactive Classifier & Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Classifier Simulator */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Interactive Flow Classifier Simulator
              </h3>
              <p className="text-xs text-slate-400">Test individual flow records through the active model</p>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Load Test Flow Preset:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('benign')}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-emerald-400 border border-slate-700 text-center"
              >
                Benign HTTPS
              </button>
              <button
                type="button"
                onClick={() => applyPreset('ddos')}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-rose-400 border border-slate-700 text-center"
              >
                SYN Flood DDoS
              </button>
              <button
                type="button"
                onClick={() => applyPreset('portscan')}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-amber-400 border border-slate-700 text-center"
              >
                Nmap PortScan
              </button>
              <button
                type="button"
                onClick={() => applyPreset('botnet')}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-purple-400 border border-slate-700 text-center"
              >
                SSH BruteForce
              </button>
            </div>
          </div>

          <form onSubmit={handlePredict} className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Dest Port</label>
                <input
                  type="number"
                  value={form.destination_port}
                  onChange={(e) => setForm({ ...form, destination_port: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Duration (μs)</label>
                <input
                  type="number"
                  value={form.flow_duration}
                  onChange={(e) => setForm({ ...form, flow_duration: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Fwd Packets</label>
                <input
                  type="number"
                  value={form.total_fwd_packets}
                  onChange={(e) => setForm({ ...form, total_fwd_packets: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Bwd Packets</label>
                <input
                  type="number"
                  value={form.total_backward_packets}
                  onChange={(e) => setForm({ ...form, total_backward_packets: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Flow Bytes/s</label>
                <input
                  type="number"
                  value={form.flow_bytes_s}
                  onChange={(e) => setForm({ ...form, flow_bytes_s: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Flow Packets/s</label>
                <input
                  type="number"
                  value={form.flow_packets_s}
                  onChange={(e) => setForm({ ...form, flow_packets_s: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              <div>
                <label className="block text-[10px] text-slate-400">SYN Flag</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  value={form.syn_flag_count}
                  onChange={(e) => setForm({ ...form, syn_flag_count: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400">FIN Flag</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  value={form.fin_flag_count}
                  onChange={(e) => setForm({ ...form, fin_flag_count: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400">RST Flag</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  value={form.rst_flag_count}
                  onChange={(e) => setForm({ ...form, rst_flag_count: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400">ACK Flag</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  value={form.ack_flag_count}
                  onChange={(e) => setForm({ ...form, ack_flag_count: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={predicting}
              className="w-full mt-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{predicting ? 'Classifying Flow...' : 'Execute ML Model Inference'}</span>
            </button>
          </form>

          {/* Inference Result Box */}
          {predictionResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-mono">Prediction Result</span>
                <StatusBadge status={predictionResult.classification} size="md" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Threat Classification</span>
                  <span className={predictionResult.is_attack ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {predictionResult.is_attack ? 'MALICIOUS ATTACK' : 'BENIGN TRAFFIC'}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Model Confidence</span>
                  <span className="text-cyan-400 font-bold">
                    {(predictionResult.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {predictionResult.top_contributing_features && (
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Key Contributing Features:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(predictionResult.top_contributing_features).map(([feat, weight]: any) => (
                      <span key={feat} className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-mono border border-slate-800">
                        {feat.replace(/_/g, ' ')}: {weight}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[10px] text-slate-500 italic flex items-center gap-1 border-t border-slate-900 pt-2">
                <Info className="w-3 h-3 shrink-0" />
                <span>{predictionResult.disclaimer}</span>
              </div>
            </div>
          )}
        </div>

        {/* Feature Importance Chart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              Feature Importance Distribution
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Relative predictive weight of CIC-IDS2017 features in the trained tree ensemble
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureImportanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#cbd5e1" fontSize={10} width={120} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="score" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              Feature importance quantifies how frequently and decisively a flow attribute was utilized by split nodes in the Random Forest. It represents associative influence, not deterministic causality.
            </span>
          </div>
        </div>
      </div>

      {/* Confusion Matrix Section */}
      {metrics?.confusion_matrix && metrics.confusion_matrix.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Grid className="w-4 h-4 text-blue-400" />
                Intrusion Model Confusion Matrix (Test Split)
              </h3>
              <p className="text-xs text-slate-400">Ground truth vs predicted classifications on held-out test records</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-3 text-left">Actual \ Predicted</th>
                  {metrics.confusion_matrix_labels?.map((label) => (
                    <th key={label} className="py-2 px-3 text-cyan-400">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {metrics.confusion_matrix.map((row, rowIdx) => {
                  const actualLabel = metrics.confusion_matrix_labels?.[rowIdx] || `Class ${rowIdx}`;
                  return (
                    <tr key={rowIdx} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-left font-semibold text-slate-300">
                        {actualLabel}
                      </td>
                      {row.map((cellVal, colIdx) => {
                        const isDiagonal = rowIdx === colIdx;
                        return (
                          <td
                            key={colIdx}
                            className={`py-2.5 px-3 ${
                              isDiagonal ? 'bg-cyan-500/10 text-cyan-300 font-bold' : 'text-slate-500'
                            }`}
                          >
                            {cellVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
