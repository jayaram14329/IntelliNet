export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: 'ADMIN' | 'ANALYST';
  is_active: boolean;
  created_at: string;
}

export interface LiveMetrics {
  timestamp: string;
  source: string;
  interface_name: string;
  bytes_sent_sec: number;
  bytes_recv_sec: number;
  packets_sent_sec: number;
  packets_recv_sec: number;
  throughput_mbps: number;
  bandwidth_utilization_pct: number;
  latency_ms: number;
  packet_loss_pct: number;
  jitter_ms: number;
  active_connections: number;
  congestion_level: string;
}

export interface DashboardSummary {
  timestamp: string;
  total_analyzed_flows: number;
  benign_flow_count: number;
  suspicious_flow_count: number;
  current_congestion: string;
  predicted_next_congestion: string;
  congestion_horizon: string;
  live_metrics: LiveMetrics;
  models: {
    intrusion: {
      is_trained: boolean;
      algorithm: string;
      version: string;
      features_count: number;
    };
    congestion: {
      is_trained: boolean;
      algorithm: string;
      version: string;
      horizon: string;
    };
  };
  alerts_summary: {
    total: number;
    critical: number;
    high: number;
    new: number;
  };
  recent_alerts: SecurityAlert[];
  datasets_count: number;
}

export interface SecurityAlert {
  id: number;
  timestamp: string;
  title: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source_ip: string;
  destination_ip: string;
  protocol: string;
  confidence: number;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  source_type: string;
  flow_details?: Record<string, any>;
}

export interface Dataset {
  id: number;
  name: string;
  filename: string;
  dataset_type: 'INTRUSION' | 'CONGESTION';
  source: string;
  is_synthetic: boolean;
  row_count: number;
  column_count: number;
  status: string;
  error_message?: string;
  uploaded_by?: string;
  created_at: string;
  feature_summary?: {
    columns: string[];
    missing_values_count: number;
    numeric_columns_count: number;
  };
  label_summary?: Record<string, number>;
}

export interface ModelMetrics {
  is_trained: boolean;
  algorithm: string;
  version: string;
  prediction_horizon?: string;
  training_samples?: number;
  test_samples?: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  confusion_matrix?: number[][];
  confusion_matrix_labels?: string[];
  classification_report?: Record<string, any>;
  feature_importance?: Record<string, number>;
}

export interface SnifferStatus {
  is_sniffing: boolean;
  interface?: string;
  packets_captured: number;
  capture_filter?: string;
  start_time?: string;
  summary: Record<string, number>;
  warning?: string;
}
