import json
import pandas as pd
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database.session import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.dataset import Dataset
from app.models.ml_models import ModelVersion, TrainingRun
from app.models.monitoring import SecurityAlert
from app.models.audit import AuditLog
from app.schemas.ml import TrainModelRequest, IntrusionPredictRequest, IntrusionPredictResponse
from app.schemas.monitoring import AlertResponse, AlertUpdate
from app.ml.intrusion_pipeline import intrusion_pipeline
from app.utils.dataset_generator import generate_cic_intrusion_benchmark

router = APIRouter(prefix="/intrusion", tags=["Intrusion Detection"])

@router.post("/train")
def train_intrusion_model(
    request: TrainModelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Train an Intrusion Detection classifier using actual data.
    Algorithm options: RandomForest, DecisionTree, LogisticRegression.
    """
    # 1. Fetch or generate dataset
    if request.dataset_id:
        dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
        if not dataset:
            raise HTTPException(status_code=404, detail="Specified dataset not found")
        file_path = Path(dataset.file_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Dataset file missing on disk")
        df = pd.read_csv(file_path)
    else:
        # Use synthetic benchmark
        df = generate_cic_intrusion_benchmark(n_samples=1200)

    # 2. Record TrainingRun in DB
    run = TrainingRun(
        model_type="INTRUSION",
        algorithm=request.algorithm,
        status="TRAINING",
        dataset_id=request.dataset_id
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        # 3. Execute training pipeline
        results = intrusion_pipeline.train(
            df=df,
            algorithm=request.algorithm,
            test_size=request.test_size,
            random_state=request.random_state,
            multiclass=True
        )

        # 4. Save ModelVersion in DB
        model_ver = ModelVersion(
            name=f"Intrusion-{results['algorithm']}",
            model_type="INTRUSION",
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
                "classification_report": results["classification_report"]
            }),
            feature_names_json=json.dumps(intrusion_pipeline.feature_names),
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
            details=f"Trained Intrusion model {results['algorithm']} with Acc: {results['accuracy']:.4f}, F1: {results['f1_score']:.4f}"
        )
        db.add(audit)
        db.commit()
        db.refresh(model_ver)

        return {
            "status": "success",
            "message": "Intrusion detection model trained successfully.",
            "metrics": results,
            "model_version_id": model_ver.id
        }

    except Exception as e:
        run.status = "FAILED"
        run.error_message = str(e)
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(e)}")

@router.post("/predict", response_model=IntrusionPredictResponse)
def predict_intrusion(
    flow: IntrusionPredictRequest,
    db: Session = Depends(get_db)
):
    if intrusion_pipeline.model is None:
        raise HTTPException(
            status_code=400,
            detail="Intrusion detection model is not trained yet. Please train a model via the Model Management tab."
        )

    flow_dict = flow.model_dump()
    result = intrusion_pipeline.predict_record(flow_dict)

    alert_created = False
    if result["is_attack"]:
        # Assign severity based on confidence and attack type
        category = result["classification"]
        severity = "HIGH"
        if "ddos" in category.lower() or "botnet" in category.lower():
            severity = "CRITICAL"
        elif "scan" in category.lower():
            severity = "MEDIUM"

        alert = SecurityAlert(
            title=f"Potential {category} Attack Detected",
            category=category,
            severity=severity,
            source_ip=flow.source_ip or "192.168.1.100",
            destination_ip=flow.destination_ip or "10.0.0.1",
            protocol=flow.protocol or "TCP",
            confidence=result["confidence"],
            status="NEW",
            source_type="MODEL_PREDICTION",
            flow_details_json=json.dumps(flow_dict)
        )
        db.add(alert)
        db.commit()
        alert_created = True

    return IntrusionPredictResponse(
        classification=result["classification"],
        is_attack=result["is_attack"],
        confidence=result["confidence"],
        model_version=result["model_version"],
        algorithm=result["algorithm"],
        timestamp=datetime.now(timezone.utc),
        alert_created=alert_created,
        top_contributing_features=result["top_contributions"]
    )

@router.get("/metrics")
def get_intrusion_metrics(db: Session = Depends(get_db)):
    if intrusion_pipeline.model is None:
        return {
            "is_trained": False,
            "message": "Model not trained yet."
        }

    latest = db.query(ModelVersion).filter(
        ModelVersion.model_type == "INTRUSION"
    ).order_by(ModelVersion.created_at.desc()).first()

    metrics = json.loads(latest.metrics_json) if latest and latest.metrics_json else {}
    feat_imp = json.loads(latest.feature_importance_json) if latest and latest.feature_importance_json else {}

    return {
        "is_trained": True,
        "algorithm": intrusion_pipeline.model_info.get("algorithm", "Unknown"),
        "version": intrusion_pipeline.model_info.get("version", "v1.0"),
        "training_samples": intrusion_pipeline.model_info.get("training_samples", 0),
        "test_samples": intrusion_pipeline.model_info.get("test_samples", 0),
        "accuracy": latest.accuracy if latest else None,
        "precision": latest.precision if latest else None,
        "recall": latest.recall if latest else None,
        "f1_score": latest.f1_score if latest else None,
        "confusion_matrix": metrics.get("confusion_matrix", []),
        "confusion_matrix_labels": metrics.get("confusion_matrix_labels", []),
        "classification_report": metrics.get("classification_report", {}),
        "feature_importance": feat_imp
    }

@router.get("/alerts")
def list_alerts(
    severity: str = None,
    category: str = None,
    status_filter: str = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(SecurityAlert)
    if severity:
        query = query.filter(SecurityAlert.severity == severity.upper())
    if category:
        query = query.filter(SecurityAlert.category == category)
    if status_filter:
        query = query.filter(SecurityAlert.status == status_filter.upper())

    alerts = query.order_by(SecurityAlert.timestamp.desc()).limit(limit).all()
    results = []
    for a in alerts:
        results.append({
            "id": a.id,
            "timestamp": a.timestamp.isoformat(),
            "title": a.title,
            "category": a.category,
            "severity": a.severity,
            "source_ip": a.source_ip,
            "destination_ip": a.destination_ip,
            "protocol": a.protocol,
            "confidence": a.confidence,
            "status": a.status,
            "source_type": a.source_type,
            "flow_details": json.loads(a.flow_details_json) if a.flow_details_json else {}
        })
    return results

@router.patch("/alerts/{alert_id}")
def update_alert(
    alert_id: int,
    update_data: AlertUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alert = db.query(SecurityAlert).filter(SecurityAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    new_status = update_data.status.upper()
    if new_status not in ["ACKNOWLEDGED", "RESOLVED", "NEW"]:
        raise HTTPException(status_code=400, detail="Invalid status value")

    alert.status = new_status
    audit = AuditLog(
        username=current_user.username,
        action="ALERT_STATUS_UPDATE",
        details=f"Alert #{alert.id} status changed to {new_status}"
    )
    db.add(audit)
    db.commit()
    db.refresh(alert)
    return {"message": f"Alert marked as {new_status}", "alert_id": alert.id, "status": alert.status}
