import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Dataset } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Database,
  Upload,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RefreshCw
} from 'lucide-react';

export const DatasetsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Upload Form State
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [datasetType, setDatasetType] = useState('INTRUSION');

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/datasets');
      setDatasets(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a CSV file.');
      return;
    }

    setUploadError(null);
    setSuccessMessage(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', datasetName || file.name);
    formData.append('dataset_type', datasetType);

    try {
      await api.post('/datasets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessMessage(`Successfully uploaded and validated ${file.name}`);
      setFile(null);
      setDatasetName('');
      fetchDatasets();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload dataset.');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateBenchmark = async (type: 'INTRUSION' | 'CONGESTION') => {
    setGenerating(true);
    setUploadError(null);
    setSuccessMessage(null);
    try {
      const res = await api.post(`/datasets/generate-benchmark?dataset_type=${type}&samples=${type === 'INTRUSION' ? 1200 : 500}`);
      setSuccessMessage(res.data.message);
      fetchDatasets();
    } catch (e: any) {
      setUploadError('Failed to generate benchmark dataset.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Dataset Management & Verification Console
          </h2>
          <p className="text-xs text-slate-400">
            Upload custom network traffic CSV files or generate documented benchmark data for testing.
          </p>
        </div>

        <button
          onClick={fetchDatasets}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Dataset Source Guidance Box */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
        <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-2 uppercase tracking-wider">
          <ExternalLink className="w-4 h-4" />
          Official Dataset Provenance & Standards
        </h3>
        <p className="text-xs text-slate-300">
          IntelliNet is architected to parse and train upon the official <strong>CIC-IDS2017</strong> intrusion dataset provided by the Canadian Institute for Cybersecurity (UNB).
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <a
            href="https://www.unb.ca/cic/datasets/ids-2017.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline font-mono"
          >
            <span>CIC-IDS2017 Official UNB Repository</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Action Grid: Upload & Benchmark Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-cyan-400" />
            Upload Compatible Network Dataset (CSV)
          </h3>

          {uploadError && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Dataset Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wednesday-WorkingHours.pcap_ISCX.csv"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Dataset Category
                </label>
                <select
                  value={datasetType}
                  onChange={(e) => setDatasetType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="INTRUSION">Intrusion Detection (CIC-IDS2017 Flow Records)</option>
                  <option value="CONGESTION">Congestion Prediction (Telemetry Time-Series)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-slate-800 file:text-cyan-400 file:cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Validating & Uploading...' : 'Upload & Validate CSV'}</span>
            </button>
          </form>
        </div>

        {/* Generate Benchmark Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Academic Benchmark Data
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Need immediate data to validate model training? Generate documented, labeled benchmark datasets.
            </p>

            <div className="space-y-2 mt-4">
              <button
                type="button"
                disabled={generating}
                onClick={() => handleGenerateBenchmark('INTRUSION')}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-left text-xs transition-all cursor-pointer"
              >
                <div className="font-semibold text-cyan-400">Generate CIC-IDS2017 Flow Benchmark</div>
                <div className="text-[11px] text-slate-500">1,200 labeled flows (Benign, DDoS, PortScan, Botnet)</div>
              </button>

              <button
                type="button"
                disabled={generating}
                onClick={() => handleGenerateBenchmark('CONGESTION')}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/50 text-left text-xs transition-all cursor-pointer"
              >
                <div className="font-semibold text-purple-400">Generate Congestion Telemetry Benchmark</div>
                <div className="text-[11px] text-slate-500">500 chronological epochs with queuing delay and drop events</div>
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 italic">
            Note: Benchmark datasets are clearly tagged with is_synthetic=True.
          </div>
        </div>
      </div>

      {/* Dataset List Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Registered Application Datasets</h3>

        {datasets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Dataset Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Records</th>
                  <th className="py-2.5 px-3">Columns</th>
                  <th className="py-2.5 px-3">Origin</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Uploaded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {datasets.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 text-slate-200 font-sans font-medium">
                      {d.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {d.dataset_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-bold">
                      {d.row_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {d.column_count}
                    </td>
                    <td className="py-3 px-3">
                      {d.is_synthetic ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                          BENCHMARK
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          EXTERNAL
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={d.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {d.uploaded_by || 'system'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-500">
            No datasets uploaded or registered yet. Use the controls above to upload or generate one.
          </div>
        )}
      </div>
    </div>
  );
};
