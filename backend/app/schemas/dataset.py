from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class DatasetSummary(BaseModel):
    id: int
    name: str
    filename: str
    dataset_type: str
    source: str
    is_synthetic: bool
    row_count: int
    column_count: int
    status: str
    error_message: Optional[str] = None
    uploaded_by: Optional[str] = None
    created_at: datetime
    feature_summary: Optional[Any] = None
    label_summary: Optional[Any] = None

    class Config:
        from_attributes = True

class DatasetValidationResult(BaseModel):
    is_valid: bool
    dataset_type: str
    row_count: int
    detected_columns: list[str]
    missing_required_columns: list[str]
    missing_values_count: int
    label_distribution: dict[str, int]
    preview_rows: list[dict[str, Any]]
    message: str
