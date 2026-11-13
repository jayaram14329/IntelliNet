from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from app.database.session import Base

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    dataset_type = Column(String(50), nullable=False) # INTRUSION or CONGESTION
    source = Column(String(100), default="UPLOADED", nullable=False) # UPLOADED, CIC_IDS_2017, SYNTHETIC_BENCHMARK
    is_synthetic = Column(Boolean, default=False, nullable=False)
    row_count = Column(Integer, default=0, nullable=False)
    column_count = Column(Integer, default=0, nullable=False)
    feature_summary_json = Column(Text, nullable=True) # JSON summary of columns, types, missing
    label_summary_json = Column(Text, nullable=True) # JSON distribution of classes
    status = Column(String(50), default="READY", nullable=False) # READY, PROCESSING, ERROR
    error_message = Column(Text, nullable=True)
    uploaded_by = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
