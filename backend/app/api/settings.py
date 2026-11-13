from fastapi import APIRouter
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingsUpdate(BaseModel):
    latency_threshold_medium: float = 40.0
    latency_threshold_high: float = 80.0
    latency_threshold_critical: float = 150.0
    packet_loss_threshold_medium: float = 0.5
    packet_loss_threshold_high: float = 2.0
    packet_loss_threshold_critical: float = 5.0
    bandwidth_threshold_medium: float = 50.0
    bandwidth_threshold_high: float = 75.0
    bandwidth_threshold_critical: float = 90.0

@router.get("")
def get_settings():
    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "thresholds": {
            "latency_ms": {
                "medium": settings.LATENCY_THRESHOLD_MEDIUM,
                "high": settings.LATENCY_THRESHOLD_HIGH,
                "critical": settings.LATENCY_THRESHOLD_CRITICAL
            },
            "packet_loss_pct": {
                "medium": settings.PACKET_LOSS_THRESHOLD_MEDIUM,
                "high": settings.PACKET_LOSS_THRESHOLD_HIGH,
                "critical": settings.PACKET_LOSS_THRESHOLD_CRITICAL
            },
            "bandwidth_pct": {
                "medium": settings.BANDWIDTH_THRESHOLD_MEDIUM,
                "high": settings.BANDWIDTH_THRESHOLD_HIGH,
                "critical": settings.BANDWIDTH_THRESHOLD_CRITICAL
            }
        }
    }

@router.post("")
def update_settings(update_data: SettingsUpdate):
    settings.LATENCY_THRESHOLD_MEDIUM = update_data.latency_threshold_medium
    settings.LATENCY_THRESHOLD_HIGH = update_data.latency_threshold_high
    settings.LATENCY_THRESHOLD_CRITICAL = update_data.latency_threshold_critical

    settings.PACKET_LOSS_THRESHOLD_MEDIUM = update_data.packet_loss_threshold_medium
    settings.PACKET_LOSS_THRESHOLD_HIGH = update_data.packet_loss_threshold_high
    settings.PACKET_LOSS_THRESHOLD_CRITICAL = update_data.packet_loss_threshold_critical

    settings.BANDWIDTH_THRESHOLD_MEDIUM = update_data.bandwidth_threshold_medium
    settings.BANDWIDTH_THRESHOLD_HIGH = update_data.bandwidth_threshold_high
    settings.BANDWIDTH_THRESHOLD_CRITICAL = update_data.bandwidth_threshold_critical

    return {"message": "Settings updated successfully", "status": "success"}
