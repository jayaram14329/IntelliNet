import json
import pandas as pd
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database.session import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.ml_models import ModelVersion, TrainingRun
from app.models.monitoring import CongestionForecast
from app.models.audit import AuditLog
from app.schemas.ml import TrainModelRequest, CongestionPredictRequest, CongestionPredictResponse
from app.ml.congestion_pipeline import congestion_pipeline
from app.utils.dataset_generator import generate_congestion_benchmark

router = APIRouter(prefix="/congestion", tags=["Congestion Prediction"])

@router.post("/train")
def train_congestion_model(
    request: TrainModelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Train a network congestion forecaster using chronological time-series splitting.
    """
    if request.dataset_id:
        dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail="Specified dataset not found")
        file_path = Path(dataset.file_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Dataset file missing on disk")
        df = pd.read_csv(file_path)
    else:
        df = generate_congestion_benchmark(n_samples=500)

    run = TrainingRun(
        model_type="CONGESTION",
        algorithm=request.algorithm,
        status="TRAINING",
        dataset_id=request.dataset_id
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        results = congestion_pipeline.train(
            df=df,
            algorithm=request.algorithm,
            test_size=request.test_size,
            random_state=request.random_state,
            prediction_horizon=request.prediction_horizon or "Next Measurement Interval"
        )

        model_ver = ModelVersion(
            name=f"Congestion-{results['algorithm']}",
            model_type="CONGESTION",
            algorithm=results["algorithm"],
            version=results["model_version"],
            file_path=results["file_path"],
            dataset_id=request.dataset_id,
            accuracy=results["accuracy"],
            precision=results["precision"],
            recall=results["recall"],
            f1_score=results["f1_score"],
            metrics_json=json.dumps({
                "confusion_matrix": results["confusion_matrix"],
                "confusion_matrix_labels": results["confusion_matrix_labels"],
                "classification_report": results["classification_report"],
                "prediction_horizon": results["prediction_horizon"]
            }),
            feature_names_json=json.dumps(congestion_pipeline.feature_names),
            feature_importance_json=json.dumps(results["feature_importance"]),
            is_active=True,
            trained_by=current_user.username
        )
        db.add(model_ver)

        run.status = "COMPLETED"
        run.completed_at = datetime.now(timezone.utc)
        run.model_version_id = model_ver.id

        audit = AuditLog(
            username=current_user.username,
            action="MODEL_TRAINED",
            details=f"Trained Congestion forecaster {results['algorithm']} with Acc: {results['accuracy']:.4f}, F1: {results['f1_score']:.4f}"
        )
        db.add(audit)
        db.commit()
        db.refresh(model_ver)

        return {
            "status": "success",
            "message": "Congestion forecasting model trained successfully.",
            "metrics": results,
            "model_version_id": model_ver.id
        }

    except Exception as e:
        run.status = "FAILED"
        run.error_message = str(e)
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Congestion training failed: {str(e)}")

@router.post("/predict", response_model=CongestionPredictResponse)
def predict_congestion(
    perf: CongestionPredictRequest,
    db: Session = Depends(get_db)
):
    perf_dict = perf.model_dump()
    result = congestion_pipeline.predict_record(perf_dict)

    # Save forecast in DB
    forecast = CongestionForecast(
        current_state=result["current_state"],
        predicted_state=result["predicted_next_interval"] or result["current_state"],
        horizon=result["prediction_horizon"],
        confidence=result["future_confidence"] or 0.95,
        bandwidth_utilization=perf.bandwidth_utilization_pct,
        throughput_mbps=perf.throughput_mbps,
        latency_ms=perf.latency_ms,
        packet_loss_pct=perf.packet_loss_pct,
        jitter_ms=perf.jitter_ms,
        metrics_snapshot_json=json.dumps(perf_dict)
    )
    db.add(forecast)
    db.commit()

    return CongestionPredictResponse(
        current_state=result["current_state"],
        predicted_next_interval=result["predicted_next_interval"],
        prediction_horizon=result["prediction_horizon"],
        current_confidence=result["current_confidence"],
        future_confidence=result["future_confidence"],
        model_version=result["model_version"],
        methodology=result["methodology"],
        timestamp=datetime.now(timezone.utc)
    )

@router.get("/metrics")
def get_congestion_metrics(db: Session = Depends(get_db)):
    if congestion_pipeline.model is None:
        return {
            "is_trained": False,
            "message": "Model not trained yet."
        }

    latest = db.query(ModelVersion).filter(
        ModelVersion.model_type == "CONGESTION"
    ).order_by(ModelVersion.created_at.desc()).first()

    metrics = json.loads(latest.metrics_json) if latest and latest.metrics_json else {}
    feat_imp = json.loads(latest.feature_importance_json) if latest and latest.feature_importance_json else {}

    return {
        "is_trained": True,
        "algorithm": congestion_pipeline.model_info.get("algorithm", "Unknown"),
        "version": congestion_pipeline.model_info.get("version", "v1.0"),
        "prediction_horizon": congestion_pipeline.prediction_horizon,
        "training_samples": congestion_pipeline.model_info.get("training_samples", 0),
        "test_samples": congestion_pipeline.model_info.get("test_samples", 0),
        "accuracy": latest.accuracy if latest else None,
        "precision": latest.precision if latest else None,
        "recall": latest.recall if latest else None,
        "f1_score": latest.f1_score if latest else None,
        "confusion_matrix": metrics.get("confusion_matrix", []),
        "confusion_matrix_labels": metrics.get("confusion_matrix_labels", []),
        "classification_report": metrics.get("classification_report", {}),
        "feature_importance": feat_imp
    }

@router.get("/history")
def get_congestion_history(limit: int = 30, db: Session = Depends(get_db)):
    forecasts = db.query(CongestionForecast).order_by(CongestionForecast.timestamp.desc()).limit(limit).all()
    forecasts.reverse()
    results = []
    for f in forecasts:
        results.append({
            "id": f.id,
            "timestamp": f.timestamp.strftime("%H:%M:%S"),
            "current_state": f.current_state,
            "predicted_state": f.predicted_state,
            "confidence": f.confidence,
            "bandwidth_utilization": f.bandwidth_utilization,
            "latency_ms": f.latency_ms,
            "packet_loss_pct": f.packet_loss_pct,
            "throughput_mbps": f.throughput_mbps
        })
    return {"data": results}
