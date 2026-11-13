from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database.session import Base

class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    title = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False) # DDoS, PortScan, Botnet, Infiltration, Brute Force, Web Attack, etc.
    severity = Column(String(20), default="HIGH", nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    source_ip = Column(String(50), default="0.0.0.0", nullable=False)
    destination_ip = Column(String(50), default="0.0.0.0", nullable=False)
    protocol = Column(String(20), default="TCP", nullable=False)
    confidence = Column(Float, default=1.0, nullable=False)
    status = Column(String(20), default="NEW", nullable=False) # NEW, ACKNOWLEDGED, RESOLVED
    source_type = Column(String(50), default="MODEL_PREDICTION", nullable=False) # MODEL_PREDICTION, LIVE_CAPTURE, DATASET_REPLAY
    flow_details_json = Column(Text, nullable=True) # Full flow metadata dictionary
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class CongestionForecast(Base):
    __tablename__ = "congestion_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    horizon = Column(String(50), default="Next Measurement Interval", nullable=False)
    current_state = Column(String(20), nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    predicted_state = Column(String(20), nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    confidence = Column(Float, default=1.0, nullable=False)
    bandwidth_utilization = Column(Float, nullable=True)
    throughput_mbps = Column(Float, nullable=True)
    latency_ms = Column(Float, nullable=True)
    packet_loss_pct = Column(Float, nullable=True)
    jitter_ms = Column(Float, nullable=True)
    metrics_snapshot_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class NetworkObservation(Base):
    __tablename__ = "network_observations"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    source = Column(String(50), default="LIVE", nullable=False) # LIVE, SIMULATED, OFFLINE, SYNTHETIC
    interface_name = Column(String(100), nullable=True)
    bytes_sent_sec = Column(Float, default=0.0, nullable=False)
    bytes_recv_sec = Column(Float, default=0.0, nullable=False)
    packets_sent_sec = Column(Float, default=0.0, nullable=False)
    packets_recv_sec = Column(Float, default=0.0, nullable=False)
    throughput_mbps = Column(Float, default=0.0, nullable=False)
    bandwidth_utilization_pct = Column(Float, default=0.0, nullable=False)
    latency_ms = Column(Float, default=0.0, nullable=False)
    packet_loss_pct = Column(Float, default=0.0, nullable=False)
    jitter_ms = Column(Float, default=0.0, nullable=False)
    active_connections = Column(Integer, default=0, nullable=False)
    congestion_level = Column(String(20), default="LOW", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
