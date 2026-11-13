import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Dataset } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Search, Filter, Download, Database, RefreshCw, FileText, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export const TrafficExplorerPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [datasetDetails, setDatasetDetails] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/datasets');
      setDatasets(res.data);
      if (res.data.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(res.data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatasetDetails = async (id: number) => {
    try {
      const res = await api.get(`/datasets/${id}`);
      setDatasetDetails(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (selectedDatasetId) {
      fetchDatasetDetails(selectedDatasetId);
    }
  }, [selectedDatasetId]);

  const COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

  const labelData = datasetDetails?.label_summary
    ? Object.entries(datasetDetails.label_summary).map(([name, count]) => ({
        name,
        value: Number(count),
      }))
    : [];

  const previewRows = datasetDetails?.preview || [];

  const filteredRows = previewRows.filter((row: any) => {
    if (!searchTerm) return true;
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Network Flow Explorer
            <span className="text-xs font-normal text-slate-400">
              (Raw packet-level & flow-level inspection)
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Inspect network traffic distributions, CIC-IDS2017 flow attributes, and protocol metrics.
          </p>
        </div>

        {/* Dataset selector dropdown */}
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400 shrink-0" />
          <select
            value={selectedDatasetId || ''}
            onChange={(e) => setSelectedDatasetId(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.row_count.toLocaleString()} rows)
              </option>
            ))}
          </select>
          <button
            onClick={fetchDatasets}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {datasetDetails && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Total Records</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {datasetDetails.row_count?.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Feature Columns</span>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
              {datasetDetails.column_count}
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Dataset Origin</span>
            <div className="text-sm font-semibold font-mono text-slate-200 mt-1 flex items-center gap-1.5">
              <span>{datasetDetails.source}</span>
              {datasetDetails.is_synthetic && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                  BENCHMARK
                </span>
              )}
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Missing Values</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {datasetDetails.feature_summary?.missing_values_count || 0}
            </div>
          </div>
        </div>
      )}

      {/* Class distribution chart */}
      {labelData.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-2">Class & Attack Category Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={labelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {labelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
            <div className="space-y-2">
              {labelData.map((item, idx) => (
                <div key={item.name} className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800/80 text-xs font-mono">
                  <span className="flex items-center gap-2 text-slate-200">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    {item.name}
                  </span>
                  <span className="text-slate-400">{item.value.toLocaleString()} flows</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table Records Preview */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search flows by port, label, protocol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing sample preview rows
          </span>
        </div>

        {filteredRows.length > 0 ? (
          <div className="overflow-x-auto border border-slate-800/80 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-mono">
                <tr>
                  {Object.keys(filteredRows[0]).slice(0, 8).map((key) => (
                    <th key={key} className="py-2.5 px-3 whitespace-nowrap">
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredRows.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                    {Object.values(row).slice(0, 8).map((val: any, j: number) => (
                      <td key={j} className="py-2 px-3 whitespace-nowrap text-slate-300">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-500">
            No dataset rows match your search criteria.
          </div>
        )}
      </div>
    </div>
  );
};
