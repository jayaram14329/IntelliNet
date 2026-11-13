import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Dataset } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Cpu, RefreshCw, Play, CheckCircle2, AlertTriangle, Layers, ShieldAlert, Award } from 'lucide-react';

export const ModelsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [intrusionMetrics, setIntrusionMetrics] = useState<any | null>(null);
  const [congestionMetrics, setCongestionMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [trainingMessage, setTrainingMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Retrain Form State
  const [modelType, setModelType] = useState<'INTRUSION' | 'CONGESTION'>('INTRUSION');
  const [algorithm, setAlgorithm] = useState('RandomForest');
  const [datasetId, setDatasetId] = useState<number | ''>('');
  const [testSize, setTestSize] = useState(0.2);

  const fetchModelData = async () => {
    try {
      setLoading(true);
      const [intRes, congRes, dsRes] = await Promise.all([
        api.get('/intrusion/metrics'),
        api.get('/congestion/metrics'),
        api.get('/datasets')
      ]);
      setIntrusionMetrics(intRes.data);
      setCongestionMetrics(congRes.data);
      setDatasets(dsRes.data);
      if (dsRes.data.length > 0 && datasetId === '') {
        setDatasetId(dsRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelData();
  }, []);

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    setTraining(true);
    setTrainingMessage(null);
    setErrorMessage(null);

    const endpoint = modelType === 'INTRUSION' ? '/intrusion/train' : '/congestion/train';
    try {
      const res = await api.post(endpoint, {
        model_type: modelType,
        algorithm,
        dataset_id: datasetId ? Number(datasetId) : null,
        test_size: Number(testSize),
        random_state: 42,
      });
      setTrainingMessage(res.data.message);
      fetchModelData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Training failed.');
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            Machine Learning Lifecycle & Model Management
          </h2>
          <p className="text-xs text-slate-400">
            Train, evaluate, benchmark, and deploy Random Forest, Decision Tree, and Logistic Regression classifiers.
          </p>
        </div>

        <button
          onClick={fetchModelData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {trainingMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{trainingMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Two Active Models Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Intrusion Model Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Active Intrusion Detection Model
              </h3>
              <p className="text-xs text-slate-400">CIC-IDS2017 Flow Anomaly Classifier</p>
            </div>
            <StatusBadge status={intrusionMetrics?.is_trained ? 'READY' : 'FAILED'} size="sm" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Algorithm</span>
              <span className="text-slate-200 font-bold">{intrusionMetrics?.algorithm || 'None'}</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Version Tag</span>
              <span className="text-cyan-400 font-bold">{intrusionMetrics?.version || 'None'}</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Test Accuracy</span>
              <span className="text-emerald-400 font-bold">
                {intrusionMetrics?.accuracy ? `${(intrusionMetrics.accuracy * 100).toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Test Samples</span>
              <span className="text-slate-300 font-bold">{intrusionMetrics?.test_samples || 0}</span>
            </div>
          </div>
        </div>

        {/* Congestion Model Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Active Congestion Prediction Forecaster
              </h3>
              <p className="text-xs text-slate-400">Supervised Time-Series Lag Model</p>
            </div>
            <StatusBadge status={congestionMetrics?.is_trained ? 'READY' : 'FAILED'} size="sm" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Algorithm</span>
              <span className="text-slate-200 font-bold">{congestionMetrics?.algorithm || 'None'}</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Horizon</span>
              <span className="text-cyan-400 font-bold">{congestionMetrics?.prediction_horizon || 'Next Interval'}</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Forecasting Accuracy</span>
              <span className="text-emerald-400 font-bold">
                {congestionMetrics?.accuracy ? `${(congestionMetrics.accuracy * 100).toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Test Epochs</span>
              <span className="text-slate-300 font-bold">{congestionMetrics?.test_samples || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Retraining Suite Form */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Play className="w-4 h-4 text-cyan-400" />
            Model Training & Retraining Suite
          </h3>
          <p className="text-xs text-slate-400">
            Execute real training pipelines across chosen algorithms and dataset splits
          </p>
        </div>

        <form onSubmit={handleTrain} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Model Pipeline
              </label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="INTRUSION">Intrusion Detection</option>
                <option value="CONGESTION">Congestion Prediction</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Algorithm
              </label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="RandomForest">Random Forest Classifier (Ensemble)</option>
                <option value="DecisionTree">Decision Tree Classifier</option>
                <option value="LogisticRegression">Logistic Regression</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Training Dataset
              </label>
              <select
                value={datasetId}
                onChange={(e) => setDatasetId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {datasets
                  .filter((d) => d.dataset_type === modelType)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.row_count} rows)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Test Split Ratio
              </label>
              <select
                value={testSize}
                onChange={(e) => setTestSize(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={0.15}>15% Test Split</option>
                <option value={0.2}>20% Test Split (Recommended)</option>
                <option value={0.3}>30% Test Split</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={training}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Cpu className="w-4 h-4" />
            <span>{training ? 'Training Model & Computing Metrics...' : 'Start Model Training'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
