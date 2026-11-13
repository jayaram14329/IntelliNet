import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database.session import get_db
from app.models.monitoring import SecurityAlert, NetworkObservation, CongestionForecast
from app.models.ml_models import ModelVersion
from app.models.dataset import Dataset
from app.network.collector import network_collector
from app.ml.intrusion_pipeline import intrusion_pipeline
from app.ml.congestion_pipeline import congestion_pipeline

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    # Query real counts from database
    total_alerts = db.query(SecurityAlert).count()
    critical_alerts = db.query(SecurityAlert).filter(SecurityAlert.severity == "CRITICAL").count()
    high_alerts = db.query(SecurityAlert).filter(SecurityAlert.severity == "HIGH").count()
    new_alerts = db.query(SecurityAlert).filter(SecurityAlert.status == "NEW").count()

    # Query recent alerts
    recent_alerts_objs = db.query(SecurityAlert).order_by(SecurityAlert.timestamp.desc()).limit(5).all()
    recent_alerts = []
    for a in recent_alerts_objs:
        recent_alerts.append({
            "id": a.id,
            "timestamp": a.timestamp.isoformat(),
            "title": a.title,
            "category": a.category,
            "severity": a.severity,
            "source_ip": a.source_ip,
            "destination_ip": a.destination_ip,
            "confidence": a.confidence,
            "status": a.status
        })

    # Flow record analysis counts from dataset table
    datasets = db.query(Dataset).all()
    total_flow_records = sum([d.row_count for d in datasets])
    benign_count = 0
    attack_count = 0
    for d in datasets:
        if d.label_summary_json:
            try:
                summary = json.loads(d.label_summary_json)
                for k, v in summary.items():
                    if "benign" in str(k).lower():
                        benign_count += v
                    else:
                        attack_count += v
            except Exception:
                pass

    # Realtime system metrics
    live_metrics = network_collector.get_realtime_metrics()

    # Model statuses
    intrusion_status = {
        "is_trained": intrusion_pipeline.model is not None,
        "algorithm": intrusion_pipeline.model_info.get("algorithm", "None"),
        "version": intrusion_pipeline.model_info.get("version", "None"),
        "features_count": len(intrusion_pipeline.feature_names)
    }

    congestion_status = {
        "is_trained": congestion_pipeline.model is not None,
        "algorithm": congestion_pipeline.model_info.get("algorithm", "RuleBased-v1"),
        "version": congestion_pipeline.model_info.get("version", "v1.0"),
        "horizon": congestion_pipeline.prediction_horizon
    }

    # Congestion prediction on current metric
    congestion_pred = congestion_pipeline.predict_record({
        "bandwidth_utilization_pct": live_metrics["bandwidth_utilization_pct"],
        "throughput_mbps": live_metrics["throughput_mbps"],
        "latency_ms": live_metrics["latency_ms"],
        "packet_loss_pct": live_metrics["packet_loss_pct"],
        "jitter_ms": live_metrics["jitter_ms"],
        "active_connections": live_metrics["active_connections"]
    })

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_analyzed_flows": total_flow_records,
        "benign_flow_count": benign_count,
        "suspicious_flow_count": attack_count,
        "current_congestion": congestion_pred["current_state"],
        "predicted_next_congestion": congestion_pred["predicted_next_interval"],
        "congestion_horizon": congestion_pred["prediction_horizon"],
        "live_metrics": live_metrics,
        "models": {
            "intrusion": intrusion_status,
            "congestion": congestion_status
        },
        "alerts_summary": {
            "total": total_alerts,
            "critical": critical_alerts,
            "high": high_alerts,
            "new": new_alerts
        },
        "recent_alerts": recent_alerts,
        "datasets_count": len(datasets)
    }

@router.get("/traffic-trend")
def get_traffic_trend(limit: int = 30, db: Session = Depends(get_db)):
    """Return historical time series of network telemetry for trend charts."""
    observations = db.query(NetworkObservation).order_by(NetworkObservation.timestamp.desc()).limit(limit).all()
    observations.reverse() # chronological order
    data = []
    for obs in observations:
        data.append({
            "timestamp": obs.timestamp.strftime("%H:%M:%S"),
            "throughput_mbps": obs.throughput_mbps,
            "bandwidth_utilization_pct": obs.bandwidth_utilization_pct,
            "latency_ms": obs.latency_ms,
            "packet_loss_pct": obs.packet_loss_pct,
            "packets_sent_sec": obs.packets_sent_sec,
            "packets_recv_sec": obs.packets_recv_sec,
            "congestion_level": obs.congestion_level
        })
    return {"data": data}
