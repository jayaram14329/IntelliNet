from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime

class TrainModelRequest(BaseModel):
    model_type: str = Field(..., description="INTRUSION or CONGESTION")
    algorithm: str = Field("RandomForest", description="RandomForest, DecisionTree, or LogisticRegression")
    dataset_id: Optional[int] = None
    use_synthetic: bool = False
    test_size: float = 0.2
    random_state: int = 42
    prediction_horizon: Optional[str] = "Next Measurement Interval"

class ModelVersionResponse(BaseModel):
    id: int
    name: str
    model_type: str
    algorithm: str
    version: str
    dataset_id: Optional[int] = None
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    metrics: Optional[dict[str, Any]] = None
    feature_names: Optional[list[str]] = None
    feature_importance: Optional[dict[str, float]] = None
    is_active: bool
    trained_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Intrusion prediction schemas
class IntrusionPredictRequest(BaseModel):
    destination_port: float = 80.0
    flow_duration: float = 120000.0
    total_fwd_packets: float = 10.0
    total_backward_packets: float = 8.0
    total_length_of_fwd_packets: float = 1500.0
    total_length_of_bwd_packets: float = 4000.0
    fwd_packet_length_max: float = 500.0
    fwd_packet_length_min: float = 0.0
    fwd_packet_length_mean: float = 150.0
    bwd_packet_length_mean: float = 500.0
    flow_bytes_s: float = 45833.3
    flow_packets_s: float = 150.0
    flow_iat_mean: float = 7058.0
    flow_iat_std: float = 1200.0
    fin_flag_count: float = 0.0
    syn_flag_count: float = 1.0
    rst_flag_count: float = 0.0
    psh_flag_count: float = 1.0
    ack_flag_count: float = 1.0
    source_ip: Optional[str] = "192.168.1.105"
    destination_ip: Optional[str] = "10.0.0.1"
    protocol: Optional[str] = "TCP"

class IntrusionPredictResponse(BaseModel):
    classification: str # BENIGN or ATTACK category
    is_attack: bool
    confidence: float
    model_version: str
    algorithm: str
    timestamp: datetime
    alert_created: bool
    top_contributing_features: dict[str, float]
    disclaimer: str = "This classification is a machine-learning model estimate and should be validated by a security analyst."

# Congestion prediction schemas
class CongestionPredictRequest(BaseModel):
    bandwidth_utilization_pct: float = Field(..., ge=0.0, le=100.0)
    throughput_mbps: float = Field(..., ge=0.0)
    packet_rate_pps: float = Field(..., ge=0.0)
    latency_ms: float = Field(..., ge=0.0)
    packet_loss_pct: float = Field(..., ge=0.0, le=100.0)
    jitter_ms: Optional[float] = 2.5
    active_connections: Optional[int] = 120
    mode: str = Field("BOTH", description="CURRENT, FUTURE, or BOTH")

class CongestionPredictResponse(BaseModel):
    current_state: str # LOW, MEDIUM, HIGH, CRITICAL
    predicted_next_interval: Optional[str] = None
    prediction_horizon: str = "Next Measurement Interval"
    current_confidence: float
    future_confidence: Optional[float] = None
    model_version: str
    methodology: str
    timestamp: datetime
    disclaimer: str = "Congestion forecasts are statistical estimates based on historical queuing behavior."
