from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    model_type = Column(String(50), nullable=False) # INTRUSION or CONGESTION
    algorithm = Column(String(50), nullable=False) # RandomForest, DecisionTree, LogisticRegression
    version = Column(String(20), default="1.0.0", nullable=False)
    file_path = Column(String(500), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    
    # Metrics
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    
    # Serialized JSON blobs
    metadata_json = Column(Text, nullable=True) # Full hyperparameters, training samples, dates
    metrics_json = Column(Text, nullable=True) # Per-class reports, confusion matrix, ROC-AUC
    feature_names_json = Column(Text, nullable=True) # List of feature names used during training
    feature_importance_json = Column(Text, nullable=True) # Feature importance dictionary
    
    is_active = Column(Boolean, default=True, nullable=False)
    trained_by = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    training_runs = relationship("TrainingRun", back_populates="model_version")

class TrainingRun(Base):
    __tablename__ = "training_runs"

    id = Column(Integer, primary_key=True, index=True)
    model_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    model_type = Column(String(50), nullable=False)
    algorithm = Column(String(50), nullable=False)
    status = Column(String(50), default="PENDING", nullable=False) # PENDING, TRAINING, COMPLETED, FAILED
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)

    model_version = relationship("ModelVersion", back_populates="training_runs")
