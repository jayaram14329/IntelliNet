import os
import json
import uuid
import pandas as pd
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database.session import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.audit import AuditLog
from app.schemas.dataset import DatasetSummary, DatasetValidationResult
from app.ml.feature_engineering import clean_cic_dataset, clean_column_name, STANDARD_INTRUSION_FEATURES
from app.utils.dataset_generator import generate_cic_intrusion_benchmark, generate_congestion_benchmark

router = APIRouter(prefix="/datasets", tags=["Datasets"])

@router.get("", response_model=list[DatasetSummary])
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).all()
    results = []
    for d in datasets:
        feat_sum = json.loads(d.feature_summary_json) if d.feature_summary_json else None
        lbl_sum = json.loads(d.label_summary_json) if d.label_summary_json else None
        results.append(
            DatasetSummary(
                id=d.id,
                name=d.name,
                filename=d.filename,
                dataset_type=d.dataset_type,
                source=d.source,
                is_synthetic=d.is_synthetic,
                row_count=d.row_count,
                column_count=d.column_count,
                status=d.status,
                error_message=d.error_message,
                uploaded_by=d.uploaded_by,
                created_at=d.created_at,
                feature_summary=feat_sum,
                label_summary=lbl_sum
            )
        )
    return results

@router.post("/upload", response_model=DatasetSummary)
async def upload_dataset(
    file: UploadFile = File(...),
    dataset_type: str = Form("INTRUSION"), # INTRUSION or CONGESTION
    name: str = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported."
        )

    subfolder = "intrusion" if dataset_type.upper() == "INTRUSION" else "congestion"
    dest_dir = settings.DATASETS_DIR / subfolder
    dest_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = f"{uuid.uuid4().hex[:8]}_{Path(file.filename).name}"
    file_path = dest_dir / safe_filename

    # Write file safely
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    with open(file_path, "wb") as f:
        f.write(content)

    # Validate and summarize using pandas
    try:
        df = pd.read_csv(file_path, nrows=10000) # Read sample or full
        row_count = len(df)
        col_count = len(df.columns)
        
        # Normalize column names
        cleaned_cols = [clean_column_name(c) for c in df.columns]
        missing_count = int(df.isna().sum().sum())

        # Determine label distribution
        label_summary = {}
        for col_cand in ["label", "attack", "class", "congestion_level"]:
            matched = [c for c in df.columns if clean_column_name(c) == col_cand]
            if matched:
                dist = df[matched[0]].astype(str).value_counts().to_dict()
                label_summary = {str(k): int(v) for k, v in dist.items()}
                break

        feature_summary = {
            "columns": cleaned_cols,
            "missing_values_count": missing_count,
            "numeric_columns_count": len(df.select_dtypes(include=["number"]).columns)
        }

        dataset = Dataset(
            name=name or file.filename,
            filename=safe_filename,
            file_path=str(file_path),
            dataset_type=dataset_type.upper(),
            source="UPLOADED",
            is_synthetic=False,
            row_count=row_count,
            column_count=col_count,
            feature_summary_json=json.dumps(feature_summary),
            label_summary_json=json.dumps(label_summary),
            status="READY",
            uploaded_by=current_user.username
        )
        db.add(dataset)
        
        audit = AuditLog(
            username=current_user.username,
            action="DATASET_UPLOAD",
            details=f"Uploaded {dataset_type} dataset: {file.filename} ({row_count} rows)"
        )
        db.add(audit)
        db.commit()
        db.refresh(dataset)

        return DatasetSummary(
            id=dataset.id,
            name=dataset.name,
            filename=dataset.filename,
            dataset_type=dataset.dataset_type,
            source=dataset.source,
            is_synthetic=dataset.is_synthetic,
            row_count=dataset.row_count,
            column_count=dataset.column_count,
            status=dataset.status,
            error_message=dataset.error_message,
            uploaded_by=dataset.uploaded_by,
            created_at=dataset.created_at,
            feature_summary=feature_summary,
            label_summary=label_summary
        )

    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse and validate CSV file: {str(e)}"
        )

@router.get("/{dataset_id}")
def get_dataset_details(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")

    file_path = Path(dataset.file_path)
    preview_rows = []
    if file_path.exists():
        try:
            df = pd.read_csv(file_path, nrows=10)
            preview_rows = df.to_dict(orient="records")
        except Exception:
            pass

    return {
        "id": dataset.id,
        "name": dataset.name,
        "filename": dataset.filename,
        "dataset_type": dataset.dataset_type,
        "source": dataset.source,
        "is_synthetic": dataset.is_synthetic,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "feature_summary": json.loads(dataset.feature_summary_json) if dataset.feature_summary_json else {},
        "label_summary": json.loads(dataset.label_summary_json) if dataset.label_summary_json else {},
        "status": dataset.status,
        "preview": preview_rows,
        "created_at": dataset.created_at.isoformat()
    }

@router.post("/generate-benchmark")
def generate_benchmark_dataset(
    dataset_type: str = "INTRUSION", # INTRUSION or CONGESTION
    samples: int = 1000,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a documented synthetic benchmark dataset for academic testing.
    Clearly marked as synthetic benchmark data.
    """
    subfolder = "intrusion" if dataset_type.upper() == "INTRUSION" else "congestion"
    dest_dir = settings.DATASETS_DIR / subfolder
    dest_dir.mkdir(parents=True, exist_ok=True)

    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if dataset_type.upper() == "INTRUSION":
        df = generate_cic_intrusion_benchmark(n_samples=samples)
        filename = f"benchmark_cic_ids2017_{timestamp_str}.csv"
        display_name = f"CIC-IDS2017 Benchmark ({samples} flows) [SYNTHETIC]"
    else:
        df = generate_congestion_benchmark(n_samples=samples)
        filename = f"benchmark_congestion_{timestamp_str}.csv"
        display_name = f"Network Congestion Benchmark ({samples} epochs) [SYNTHETIC]"

    file_path = dest_dir / filename
    df.to_csv(file_path, index=False)

    # Summaries
    cleaned_cols = [clean_column_name(c) for c in df.columns]
    label_summary = {}
    for col in ["label", "congestion_level"]:
        if col in df.columns:
            label_summary = {str(k): int(v) for k, v in df[col].value_counts().to_dict().items()}
            break

    feature_summary = {
        "columns": cleaned_cols,
        "missing_values_count": 0,
        "numeric_columns_count": len(df.select_dtypes(include=["number"]).columns)
    }

    dataset = Dataset(
        name=display_name,
        filename=filename,
        file_path=str(file_path),
        dataset_type=dataset_type.upper(),
        source="SYNTHETIC_BENCHMARK",
        is_synthetic=True,
        row_count=len(df),
        column_count=len(df.columns),
        feature_summary_json=json.dumps(feature_summary),
        label_summary_json=json.dumps(label_summary),
        status="READY",
        uploaded_by=current_user.username
    )
    db.add(dataset)
    
    audit = AuditLog(
        username=current_user.username,
        action="BENCHMARK_GENERATED",
        details=f"Generated synthetic {dataset_type} dataset with {len(df)} rows"
    )
    db.add(audit)
    db.commit()
    db.refresh(dataset)

    return {
        "status": "success",
        "message": f"Generated benchmark {dataset_type} dataset with {len(df)} records.",
        "dataset_id": dataset.id,
        "name": dataset.name,
        "is_synthetic": True
    }
