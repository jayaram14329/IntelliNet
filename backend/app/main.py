import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.session import engine, SessionLocal, Base
from app.models import User, Dataset, ModelVersion, SecurityAlert, NetworkObservation, CongestionForecast, AuditLog
from app.core.security import get_password_hash

# Routers
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.datasets import router as datasets_router
from app.api.intrusion import router as intrusion_router
from app.api.congestion import router as congestion_router
from app.api.network import router as network_router
from app.api.reports import router as reports_router
from app.api.settings import router as settings_router

from app.utils.dataset_generator import generate_cic_intrusion_benchmark, generate_congestion_benchmark
from app.ml.intrusion_pipeline import intrusion_pipeline
from app.ml.congestion_pipeline import congestion_pipeline

def seed_default_data():
    """Auto-initialize database tables, default users, benchmark datasets, and baseline models."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Create Default Admin & Analyst Users
        if db.query(User).count() == 0:
            admin_user = User(
                username="admin",
                email="admin@intellinet.local",
                full_name="IntelliNet Administrator",
                hashed_password=get_password_hash("Admin@123456"),
                role="ADMIN",
                is_active=True
            )
            analyst_user = User(
                username="analyst",
                email="analyst@intellinet.local",
                full_name="Security Analyst",
                hashed_password=get_password_hash("Analyst@123456"),
                role="ANALYST",
                is_active=True
            )
            db.add_all([admin_user, analyst_user])
            db.commit()
            print("[IntelliNet] Created default Admin and Analyst accounts.")

        # 2. Seed Default Benchmark Datasets if empty
        if db.query(Dataset).count() == 0:
            # Intrusion benchmark
            intrusion_df = generate_cic_intrusion_benchmark(n_samples=1200)
            intrusion_path = settings.DATASETS_DIR / "intrusion" / "cic_ids2017_benchmark_sample.csv"
            intrusion_df.to_csv(intrusion_path, index=False)

            intrusion_label_summary = {str(k): int(v) for k, v in intrusion_df["label"].value_counts().to_dict().items()}
            intrusion_feat_summary = {
                "columns": list(intrusion_df.columns),
                "missing_values_count": 0,
                "numeric_columns_count": len(intrusion_df.select_dtypes(include=["number"]).columns)
            }

            d_intrusion = Dataset(
                name="CIC-IDS2017 Flow Benchmark (1,200 flows) [SYNTHETIC]",
                filename="cic_ids2017_benchmark_sample.csv",
                file_path=str(intrusion_path),
                dataset_type="INTRUSION",
                source="SYNTHETIC_BENCHMARK",
                is_synthetic=True,
                row_count=len(intrusion_df),
                column_count=len(intrusion_df.columns),
                feature_summary_json=json.dumps(intrusion_feat_summary),
                label_summary_json=json.dumps(intrusion_label_summary),
                status="READY",
                uploaded_by="system"
            )

            # Congestion benchmark
            congestion_df = generate_congestion_benchmark(n_samples=500)
            congestion_path = settings.DATASETS_DIR / "congestion" / "network_telemetry_benchmark_sample.csv"
            congestion_df.to_csv(congestion_path, index=False)

            congestion_label_summary = {str(k): int(v) for k, v in congestion_df["congestion_level"].value_counts().to_dict().items()}
            congestion_feat_summary = {
                "columns": list(congestion_df.columns),
                "missing_values_count": 0,
                "numeric_columns_count": len(congestion_df.select_dtypes(include=["number"]).columns)
            }

            d_congestion = Dataset(
                name="Network Telemetry & Congestion Benchmark (500 epochs) [SYNTHETIC]",
                filename="network_telemetry_benchmark_sample.csv",
                file_path=str(congestion_path),
                dataset_type="CONGESTION",
                source="SYNTHETIC_BENCHMARK",
                is_synthetic=True,
                row_count=len(congestion_df),
                column_count=len(congestion_df.columns),
                feature_summary_json=json.dumps(congestion_feat_summary),
                label_summary_json=json.dumps(congestion_label_summary),
                status="READY",
                uploaded_by="system"
            )

            db.add_all([d_intrusion, d_congestion])
            db.commit()
            print("[IntelliNet] Seeded benchmark datasets.")

        # 3. Train Initial Baseline Models if not trained
        if intrusion_pipeline.model is None:
            print("[IntelliNet] Training baseline Intrusion model...")
            intrusion_df = generate_cic_intrusion_benchmark(n_samples=1200)
            results = intrusion_pipeline.train(intrusion_df, algorithm="RandomForest", multiclass=True)
            model_ver = ModelVersion(
                name="Intrusion-RandomForest-v1.0",
                model_type="INTRUSION",
                algorithm="RandomForest",
                version=results["model_version"],
                file_path=results["file_path"],
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
                trained_by="system"
            )
            db.add(model_ver)
            db.commit()

        if congestion_pipeline.model is None:
            print("[IntelliNet] Training baseline Congestion forecaster...")
            congestion_df = generate_congestion_benchmark(n_samples=500)
            c_results = congestion_pipeline.train(congestion_df, algorithm="RandomForest")
            c_model_ver = ModelVersion(
                name="Congestion-RandomForest-v1.0",
                model_type="CONGESTION",
                algorithm="RandomForest",
                version=c_results["model_version"],
                file_path=c_results["file_path"],
                accuracy=c_results["accuracy"],
                precision=c_results["precision"],
                recall=c_results["recall"],
                f1_score=c_results["f1_score"],
                metrics_json=json.dumps({
                    "confusion_matrix": c_results["confusion_matrix"],
                    "confusion_matrix_labels": c_results["confusion_matrix_labels"],
                    "classification_report": c_results["classification_report"],
                    "prediction_horizon": c_results["prediction_horizon"]
                }),
                feature_names_json=json.dumps(congestion_pipeline.feature_names),
                feature_importance_json=json.dumps(c_results["feature_importance"]),
                is_active=True,
                trained_by="system"
            )
            db.add(c_model_ver)
            db.commit()

        # 4. Seed a few realistic demonstration security alerts
        if db.query(SecurityAlert).count() == 0:
            sample_alerts = [
                SecurityAlert(
                    title="TCP SYN Flood Detected (DDoS Signature)",
                    category="DDoS",
                    severity="CRITICAL",
                    source_ip="198.51.100.42",
                    destination_ip="10.0.0.15",
                    protocol="TCP",
                    confidence=0.985,
                    status="NEW",
                    source_type="MODEL_PREDICTION"
                ),
                SecurityAlert(
                    title="Horizontal Port Sweep on Subnet",
                    category="PortScan",
                    severity="MEDIUM",
                    source_ip="203.0.113.88",
                    destination_ip="10.0.0.0/24",
                    protocol="TCP",
                    confidence=0.942,
                    status="NEW",
                    source_type="MODEL_PREDICTION"
                ),
                SecurityAlert(
                    title="SSH Brute Force Credential Spraying",
                    category="Botnet",
                    severity="HIGH",
                    source_ip="192.0.2.14",
                    destination_ip="10.0.0.22",
                    protocol="TCP",
                    confidence=0.912,
                    status="ACKNOWLEDGED",
                    source_type="MODEL_PREDICTION"
                )
            ]
            db.add_all(sample_alerts)
            db.commit()

        # 5. Seed initial network observations for smooth chart visualization
        if db.query(NetworkObservation).count() == 0:
            sample_df = generate_congestion_benchmark(n_samples=25)
            for _, r in sample_df.iterrows():
                obs = NetworkObservation(
                    source="SYNTHETIC_BENCHMARK",
                    interface_name="eth0",
                    bytes_sent_sec=r["throughput_mbps"] * 125000 * 0.4,
                    bytes_recv_sec=r["throughput_mbps"] * 125000 * 0.6,
                    packets_sent_sec=r["packet_rate_pps"] * 0.4,
                    packets_recv_sec=r["packet_rate_pps"] * 0.6,
                    throughput_mbps=r["throughput_mbps"],
                    bandwidth_utilization_pct=r["bandwidth_utilization_pct"],
                    latency_ms=r["latency_ms"],
                    packet_loss_pct=r["packet_loss_pct"],
                    jitter_ms=r["jitter_ms"],
                    active_connections=int(r["active_connections"]),
                    congestion_level=r["congestion_level"]
                )
                db.add(obs)
            db.commit()

    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[IntelliNet] Initializing database and verifying model components...")
    seed_default_data()
    yield
    # Shutdown
    print("[IntelliNet] Shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Network Monitoring System for Intrusion Detection and Congestion Prediction — Academic Engineering Project",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(datasets_router, prefix=settings.API_V1_STR)
app.include_router(intrusion_router, prefix=settings.API_V1_STR)
app.include_router(congestion_router, prefix=settings.API_V1_STR)
app.include_router(network_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "intrusion_model_loaded": intrusion_pipeline.model is not None,
        "congestion_model_loaded": congestion_pipeline.model is not None,
        "database_connected": True
    }
