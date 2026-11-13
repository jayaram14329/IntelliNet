from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional

from app.database.session import get_db
from app.models.monitoring import NetworkObservation
from app.network.collector import network_collector
from app.network.packet_sniffer import sniffer_manager
from app.schemas.monitoring import NetworkStatResponse, SnifferStatusResponse

router = APIRouter(prefix="/network", tags=["Network Monitoring"])

@router.get("/interfaces")
def get_interfaces():
    return {"interfaces": network_collector.get_interfaces()}

@router.get("/statistics", response_model=NetworkStatResponse)
def get_realtime_statistics(interface: Optional[str] = None, db: Session = Depends(get_db)):
    metrics = network_collector.get_realtime_metrics(interface)

    # Persist observation in SQLite for historical charting
    obs = NetworkObservation(
        source="LOCAL_OS",
        interface_name=metrics["interface_name"],
        bytes_sent_sec=metrics["bytes_sent_sec"],
        bytes_recv_sec=metrics["bytes_recv_sec"],
        packets_sent_sec=metrics["packets_sent_sec"],
        packets_recv_sec=metrics["packets_recv_sec"],
        throughput_mbps=metrics["throughput_mbps"],
        bandwidth_utilization_pct=metrics["bandwidth_utilization_pct"],
        latency_ms=metrics["latency_ms"],
        packet_loss_pct=metrics["packet_loss_pct"],
        jitter_ms=metrics["jitter_ms"],
        active_connections=metrics["active_connections"],
        congestion_level=metrics["congestion_level"]
    )
    db.add(obs)
    db.commit()

    return NetworkStatResponse(
        timestamp=datetime.now(timezone.utc),
        source="LOCAL_OS",
        interface_name=metrics["interface_name"],
        bytes_sent_sec=metrics["bytes_sent_sec"],
        bytes_recv_sec=metrics["bytes_recv_sec"],
        packets_sent_sec=metrics["packets_sent_sec"],
        packets_recv_sec=metrics["packets_recv_sec"],
        throughput_mbps=metrics["throughput_mbps"],
        bandwidth_utilization_pct=metrics["bandwidth_utilization_pct"],
        latency_ms=metrics["latency_ms"],
        packet_loss_pct=metrics["packet_loss_pct"],
        jitter_ms=metrics["jitter_ms"],
        active_connections=metrics["active_connections"],
        congestion_level=metrics["congestion_level"]
    )

@router.post("/capture/start")
def start_capture(payload: dict = Body(default={})):
    interface = payload.get("interface")
    capture_filter = payload.get("filter")
    return sniffer_manager.start_capture(interface, capture_filter)

@router.post("/capture/stop")
def stop_capture():
    return sniffer_manager.stop_capture()

@router.get("/capture/status", response_model=SnifferStatusResponse)
def get_capture_status():
    status_data = sniffer_manager.get_status()
    return SnifferStatusResponse(
        is_sniffing=status_data["is_sniffing"],
        interface=status_data["interface"],
        packets_captured=status_data["packets_captured"],
        capture_filter=status_data["capture_filter"],
        start_time=status_data["start_time"],
        summary=status_data["summary"],
        warning=status_data["warning"]
    )
