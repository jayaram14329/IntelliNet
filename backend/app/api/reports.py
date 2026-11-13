import io
import csv
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database.session import get_db
from app.models.monitoring import SecurityAlert, NetworkObservation, CongestionForecast
from app.models.ml_models import ModelVersion
from app.models.dataset import Dataset

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/summary")
def get_system_report(db: Session = Depends(get_db)):
    total_alerts = db.query(SecurityAlert).count()
    resolved_alerts = db.query(SecurityAlert).filter(SecurityAlert.status == "RESOLVED").count()
    active_alerts = total_alerts - resolved_alerts

    models = db.query(ModelVersion).order_by(ModelVersion.created_at.desc()).all()
    datasets = db.query(Dataset).all()
    observations_count = db.query(NetworkObservation).count()

    model_summaries = []
    for m in models:
        model_summaries.append({
            "name": m.name,
            "type": m.model_type,
            "algorithm": m.algorithm,
            "accuracy": m.accuracy,
            "f1_score": m.f1_score,
            "version": m.version,
            "created_at": m.created_at.isoformat()
        })

    return {
        "report_generated_at": datetime.now(timezone.utc).isoformat(),
        "total_datasets": len(datasets),
        "total_models_trained": len(models),
        "total_observations_recorded": observations_count,
        "security_alerts": {
            "total": total_alerts,
            "active": active_alerts,
            "resolved": resolved_alerts
        },
        "models": model_summaries
    }

@router.get("/export-alerts")
def export_alerts_csv(db: Session = Depends(get_db)):
    alerts = db.query(SecurityAlert).order_by(SecurityAlert.timestamp.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Timestamp", "Title", "Category", "Severity", "Source IP", "Destination IP", "Protocol", "Confidence", "Status"])

    for a in alerts:
        writer.writerow([
            a.id,
            a.timestamp.isoformat(),
            a.title,
            a.category,
            a.severity,
            a.source_ip,
            a.destination_ip,
            a.protocol,
            a.confidence,
            a.status
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=intellinet_security_alerts.csv"}
    )
