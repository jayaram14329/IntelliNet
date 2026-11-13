from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.database.session import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    username = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False) # e.g. MODEL_TRAIN, DATASET_UPLOAD, ALERT_RESOLVE, CAPTURE_START
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
