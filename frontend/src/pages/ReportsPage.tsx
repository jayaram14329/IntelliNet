import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, Download, Printer, CheckCircle2, ShieldAlert, Cpu, Database } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/summary');
      setReportData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleDownloadCsv = () => {
    window.open('/api/reports/export-alerts', '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Actions */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Audit Reports & Historical Analysis
          </h2>
          <p className="text-xs text-slate-400">
            Export verified telemetry metrics, intrusion logs, and ML evaluation benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shadow-md shadow-cyan-600/20 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Alerts (CSV)</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Total Security Alerts</span>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
            {reportData?.security_alerts?.total || 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {reportData?.security_alerts?.resolved || 0} Resolved
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Active Incident Queue</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {reportData?.security_alerts?.active || 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Pending Analyst Review</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Trained ML Models</span>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
            {reportData?.total_models_trained || 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Ensemble & Tree Versions</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Telemetry Points Logged</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {reportData?.total_observations_recorded || 0}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Continuous Observations</span>
        </div>
      </div>

      {/* Trained Models Audit Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          Model Provenance & Evaluation Audit Trail
        </h3>

        {reportData?.models && reportData.models.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Model Tag</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Algorithm</th>
                  <th className="py-2.5 px-3">Accuracy</th>
                  <th className="py-2.5 px-3">F1-Score</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {reportData.models.map((m: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 text-slate-200 font-sans font-semibold">
                      {m.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {m.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-bold">
                      {m.algorithm}
                    </td>
                    <td className="py-3 px-3 text-emerald-400">
                      {m.accuracy ? `${(m.accuracy * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-purple-400">
                      {m.f1_score ? `${(m.f1_score * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {m.version}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-500">
            No training runs recorded in database.
          </div>
        )}
      </div>

      {/* Report Summary Metadata Footer */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
        <div><strong>IntelliNet Academic Engineering Project Report</strong></div>
        <div className="text-[11px] text-slate-500">
          Generated automatically by backend engine at: {reportData?.report_generated_at || new Date().toISOString()}
        </div>
      </div>
    </div>
  );
};
