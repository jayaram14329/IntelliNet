import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { SecurityAlert } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Bell,
  Search,
  Filter,
  CheckCircle,
  Eye,
  RefreshCw,
  X,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      let url = '/intrusion/alerts?limit=100';
      if (severityFilter) url += `&severity=${severityFilter}`;
      if (statusFilter) url += `&status_filter=${statusFilter}`;
      const res = await api.get(url);
      setAlerts(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, statusFilter]);

  const handleUpdateStatus = async (alertId: number, newStatus: 'ACKNOWLEDGED' | 'RESOLVED') => {
    try {
      await api.patch(`/intrusion/alerts/${alertId}`, { status: newStatus });
      setAlerts(
        alerts.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
      );
      if (selectedAlert && selectedAlert.id === alertId) {
        setSelectedAlert({ ...selectedAlert, status: newStatus });
      }
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to update alert status');
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.title.toLowerCase().includes(term) ||
      a.category.toLowerCase().includes(term) ||
      a.source_ip.toLowerCase().includes(term) ||
      a.destination_ip.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-rose-500" />
            Security & Intrusion Incident Center
          </h2>
          <p className="text-xs text-slate-400">
            Real-time security events generated from network flows and automated ML signature detectors.
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by title, IP, or threat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        {filteredAlerts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Incident Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Source IP</th>
                  <th className="py-2.5 px-3">Destination IP</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <StatusBadge status={alert.severity} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-sans">
                      {alert.title}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {alert.category}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {alert.source_ip}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {alert.destination_ip}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-400">
                      {(alert.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={alert.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5 font-sans">
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
                        title="View details"
                      >
                        Details
                      </button>
                      {alert.status === 'NEW' && (
                        <button
                          onClick={() => handleUpdateStatus(alert.id, 'ACKNOWLEDGED')}
                          className="px-2 py-1 rounded bg-amber-950/80 hover:bg-amber-900 text-xs text-amber-300 border border-amber-800 cursor-pointer"
                        >
                          Ack
                        </button>
                      )}
                      {alert.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleUpdateStatus(alert.id, 'RESOLVED')}
                          className="px-2 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-xs text-emerald-300 border border-emerald-800 cursor-pointer"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-slate-500">
            No security alerts match the selected criteria.
          </div>
        )}
      </div>

      {/* Incident Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-bold text-white">Incident Details #{selectedAlert.id}</h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <div className="text-slate-400 font-sans font-semibold mb-1">{selectedAlert.title}</div>
                <div className="flex gap-2 items-center">
                  <StatusBadge status={selectedAlert.severity} size="sm" />
                  <StatusBadge status={selectedAlert.status} size="sm" />
                  <span className="text-slate-500 font-mono text-[11px]">
                    {new Date(selectedAlert.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Source IP</span>
                  <span className="text-slate-200">{selectedAlert.source_ip}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Destination IP</span>
                  <span className="text-slate-200">{selectedAlert.destination_ip}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Protocol</span>
                  <span className="text-slate-200">{selectedAlert.protocol}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Confidence</span>
                  <span className="text-cyan-400">{(selectedAlert.confidence * 100).toFixed(1)}%</span>
                </div>
              </div>

              {selectedAlert.flow_details && Object.keys(selectedAlert.flow_details).length > 0 && (
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Flow Feature Metadata:</span>
                  <pre className="p-2 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400 overflow-x-auto max-h-36">
                    {JSON.stringify(selectedAlert.flow_details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              {selectedAlert.status !== 'RESOLVED' && (
                <button
                  onClick={() => handleUpdateStatus(selectedAlert.id, 'RESOLVED')}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Mark Resolved
                </button>
              )}
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
