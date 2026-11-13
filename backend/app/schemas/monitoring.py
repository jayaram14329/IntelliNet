from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class AlertResponse(BaseModel):
    id: int
    timestamp: datetime
    title: str
    category: str
    severity: str
    source_ip: str
    destination_ip: str
    protocol: str
    confidence: float
    status: str
    source_type: str
    flow_details: Optional[dict[str, Any]] = None

    class Config:
        from_attributes = True

class AlertUpdate(BaseModel):
    status: str # ACKNOWLEDGED or RESOLVED

class NetworkStatResponse(BaseModel):
    timestamp: datetime
    source: str
    interface_name: Optional[str] = None
    bytes_sent_sec: float
    bytes_recv_sec: float
    packets_sent_sec: float
    packets_recv_sec: float
    throughput_mbps: float
    bandwidth_utilization_pct: float
    latency_ms: float
    packet_loss_pct: float
    jitter_ms: float
    active_connections: int
    congestion_level: str

class SnifferStatusResponse(BaseModel):
    is_sniffing: bool
    interface: Optional[str] = None
    packets_captured: int
    capture_filter: Optional[str] = None
    start_time: Optional[datetime] = None
    summary: dict[str, int]
    warning: Optional[str] = None
